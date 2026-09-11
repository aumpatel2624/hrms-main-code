/**
 * ADR-026. A hand-written, safe (no `eval`/`Function`) recursive-descent
 * parser + evaluator for `SalaryDetail.condition`/`.formula` text — the
 * expression language authored on a Salary Component/Salary Detail row.
 *
 * Source's own `condition`/`formula` are live Python-expression text,
 * sandboxed via an AST denylist. Reproducing that with `eval()` would mean
 * treating stored, user-editable text as trusted-enough-to-execute — a real
 * security hole, not a shortcut worth taking (see DECISIONS.md ADR-026) — so
 * this is a small, bounded interpreter instead, exactly the same "pure,
 * tested calculation utility" shape as `leaveProration.js`/`workingHours.js`,
 * just interpreting user-authored formula text rather than computing a fixed
 * known formula.
 *
 * Grammar supported (lowest to highest precedence):
 *   orExpr     := andExpr ("or" andExpr)*
 *   andExpr    := notExpr ("and" notExpr)*
 *   notExpr    := "not" notExpr | comparison
 *   comparison := additive (("==" | "!=" | "<=" | ">=" | "<" | ">") additive)?
 *   additive   := multiplicative (("+" | "-") multiplicative)*
 *   multiplicative := unary (("*" | "/") unary)*
 *   unary      := "-" unary | primary
 *   primary    := NUMBER | IDENT | IDENT "(" (expr ("," expr)*)? ")" | "(" expr ")"
 *
 * Identifiers resolve against a supplied `context` object (case-sensitive) —
 * a component's abbreviation, or the two context keys `base`/`variable`.
 * Function calls are limited to exactly: round, min, max, ceil, floor.
 * An unknown identifier or function name raises a clear Error rather than
 * being treated as 0 or crashing the process — undefined variables in a
 * formula are a real authoring mistake to surface, not paper over.
 */

const FUNCTIONS = {
  round: (...args) => { requireArgCount("round", args, 1, 1); return Math.round(args[0]); },
  ceil: (...args) => { requireArgCount("ceil", args, 1, 1); return Math.ceil(args[0]); },
  floor: (...args) => { requireArgCount("floor", args, 1, 1); return Math.floor(args[0]); },
  min: (...args) => { requireArgCount("min", args, 1, Infinity); return Math.min(...args); },
  max: (...args) => { requireArgCount("max", args, 1, Infinity); return Math.max(...args); },
};

function requireArgCount(name, args, min, max) {
  if (args.length < min || args.length > max) {
    throw new Error(`Function "${name}" called with ${args.length} argument(s)`);
  }
}

const KEYWORDS = new Set(["and", "or", "not"]);

// ---------------------------------------------------------------- tokenizer --
function tokenize(expression) {
  const tokens = [];
  let i = 0;
  const src = String(expression ?? "");

  while (i < src.length) {
    const ch = src[i];

    if (/\s/.test(ch)) { i += 1; continue; }

    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(src[i + 1] || ""))) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j += 1;
      const raw = src.slice(i, j);
      if ((raw.match(/\./g) || []).length > 1) {
        throw new Error(`Malformed number "${raw}" in expression`);
      }
      tokens.push({ type: "NUMBER", value: Number(raw) });
      i = j;
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j += 1;
      const word = src.slice(i, j);
      if (KEYWORDS.has(word)) tokens.push({ type: "KEYWORD", value: word });
      else tokens.push({ type: "IDENT", value: word });
      i = j;
      continue;
    }

    const two = src.slice(i, i + 2);
    if (["==", "!=", "<=", ">="].includes(two)) {
      tokens.push({ type: "OP", value: two });
      i += 2;
      continue;
    }

    if ("+-*/()<>,".includes(ch)) {
      tokens.push({ type: "OP", value: ch });
      i += 1;
      continue;
    }

    throw new Error(`Unexpected character "${ch}" in expression`);
  }

  return tokens;
}

// ------------------------------------------------------------------ parser --
class Parser {
  constructor(tokens, context) {
    this.tokens = tokens;
    this.pos = 0;
    this.context = context;
  }

  peek() { return this.tokens[this.pos]; }
  next() { return this.tokens[this.pos++]; }

  expectOp(value) {
    const token = this.peek();
    if (!token || token.type !== "OP" || token.value !== value) {
      throw new Error(`Expected "${value}" in expression`);
    }
    this.pos += 1;
  }

  parse() {
    const result = this.parseOr();
    if (this.pos < this.tokens.length) {
      throw new Error(`Unexpected token "${this.peek().value}" in expression`);
    }
    return result;
  }

  parseOr() {
    let left = this.parseAnd();
    while (this.peek() && this.peek().type === "KEYWORD" && this.peek().value === "or") {
      this.next();
      const right = this.parseAnd();
      left = Boolean(left) || Boolean(right);
    }
    return left;
  }

  parseAnd() {
    let left = this.parseNot();
    while (this.peek() && this.peek().type === "KEYWORD" && this.peek().value === "and") {
      this.next();
      const right = this.parseNot();
      left = Boolean(left) && Boolean(right);
    }
    return left;
  }

  parseNot() {
    if (this.peek() && this.peek().type === "KEYWORD" && this.peek().value === "not") {
      this.next();
      return !Boolean(this.parseNot());
    }
    return this.parseComparison();
  }

  parseComparison() {
    const left = this.parseAdditive();
    const token = this.peek();
    if (token && token.type === "OP" && ["==", "!=", "<", ">", "<=", ">="].includes(token.value)) {
      this.next();
      const right = this.parseAdditive();
      switch (token.value) {
        case "==": return left === right;
        case "!=": return left !== right;
        case "<": return left < right;
        case ">": return left > right;
        case "<=": return left <= right;
        case ">=": return left >= right;
        default: throw new Error(`Unknown comparison operator "${token.value}"`);
      }
    }
    return left;
  }

  parseAdditive() {
    let left = this.parseMultiplicative();
    while (this.peek() && this.peek().type === "OP" && (this.peek().value === "+" || this.peek().value === "-")) {
      const op = this.next().value;
      const right = this.parseMultiplicative();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  parseMultiplicative() {
    let left = this.parseUnary();
    while (this.peek() && this.peek().type === "OP" && (this.peek().value === "*" || this.peek().value === "/")) {
      const op = this.next().value;
      const right = this.parseUnary();
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }

  parseUnary() {
    if (this.peek() && this.peek().type === "OP" && this.peek().value === "-") {
      this.next();
      return -this.parseUnary();
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    const token = this.peek();
    if (!token) throw new Error("Unexpected end of expression");

    if (token.type === "NUMBER") { this.next(); return token.value; }

    if (token.type === "OP" && token.value === "(") {
      this.next();
      const value = this.parseOr();
      this.expectOp(")");
      return value;
    }

    if (token.type === "IDENT") {
      this.next();
      const name = token.value;
      if (this.peek() && this.peek().type === "OP" && this.peek().value === "(") {
        this.next();
        const args = [];
        if (!(this.peek() && this.peek().type === "OP" && this.peek().value === ")")) {
          args.push(this.parseOr());
          while (this.peek() && this.peek().type === "OP" && this.peek().value === ",") {
            this.next();
            args.push(this.parseOr());
          }
        }
        this.expectOp(")");
        const fn = FUNCTIONS[name];
        if (!fn) throw new Error(`Unknown function "${name}" in expression`);
        return fn(...args);
      }
      if (!Object.prototype.hasOwnProperty.call(this.context, name)) {
        throw new Error(`Undefined variable "${name}" in expression`);
      }
      return this.context[name];
    }

    throw new Error(`Unexpected token "${token.value}" in expression`);
  }
}

const evaluate = (expression, context) => {
  const tokens = tokenize(expression);
  if (tokens.length === 0) throw new Error("Empty expression");
  return new Parser(tokens, context).parse();
};

/** Evaluates `expression` against `context`, returning a number. Throws a clear Error on any parse/eval failure or a non-numeric result. */
export const evaluateFormula = (expression, context) => {
  const result = evaluate(expression, context);
  if (typeof result !== "number" || Number.isNaN(result)) {
    throw new Error(`Formula "${expression}" evaluated to a non-numeric value`);
  }
  return result;
};

/** Evaluates `expression` against `context`, returning a boolean — same grammar, expects a boolean-valued or comparison expression at the top level. */
export const evaluateCondition = (expression, context) => {
  const result = evaluate(expression, context);
  if (typeof result === "boolean") return result;
  if (typeof result === "number") return result !== 0;
  throw new Error(`Condition "${expression}" did not evaluate to a boolean`);
};
