import mongoose from "mongoose";

/**
 * Shared builder for the paginated list endpoints.
 *
 * Every list controller used to hand-roll the same aggregation: an isActive
 * match, optional $lookup stages, a free-text $or over a few fields, a sort and
 * a $facet for count + page. This centralises that and adds structured
 * filtering on top.
 *
 * SECURITY: field names arrive from the client, so they are only ever used
 * after being looked up in the caller's `filterable` allowlist. An unknown
 * field is dropped, never passed through to Mongo. Regex values are escaped so
 * a filter value cannot inject a pattern.
 */

/** Operators the client may ask for, grouped by the field type they suit. */
export const OPERATORS = {
    string: ["contains", "notContains", "eq", "ne", "startsWith", "endsWith", "isEmpty", "isNotEmpty"],
    number: ["eq", "ne", "gt", "gte", "lt", "lte", "between"],
    boolean: ["eq"],
    date: ["eq", "gt", "gte", "lt", "lte", "between"],
    objectId: ["eq", "ne", "in"],
    enum: ["eq", "ne", "in"],
};

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Coerce a client-supplied value to the type the field is declared as. */
const coerce = (value, type) => {
    if (value === null || value === undefined || value === "") return value;

    switch (type) {
        case "number": {
            const n = Number(value);
            return Number.isFinite(n) ? n : undefined;
        }
        case "boolean":
            return value === true || value === "true";
        case "date": {
            const d = new Date(value);
            return Number.isNaN(d.getTime()) ? undefined : d;
        }
        case "objectId":
            return mongoose.Types.ObjectId.isValid(value) ? new mongoose.Types.ObjectId(String(value)) : undefined;
        default:
            return String(value);
    }
};

/** Turn one {field, op, value} into a Mongo expression, or null if unusable. */
const buildCondition = ({ op, value }, type) => {
    if (op === "isEmpty") return { $in: [null, ""] };
    if (op === "isNotEmpty") return { $nin: [null, ""] };

    if (op === "between") {
        const [from, to] = Array.isArray(value) ? value : [];
        const lo = coerce(from, type);
        const hi = coerce(to, type);
        if (lo === undefined && hi === undefined) return null;
        return { ...(lo !== undefined && { $gte: lo }), ...(hi !== undefined && { $lte: hi }) };
    }

    if (op === "in") {
        const list = (Array.isArray(value) ? value : [value]).map((v) => coerce(v, type)).filter((v) => v !== undefined);
        return list.length ? { $in: list } : null;
    }

    const v = coerce(value, type);
    if (v === undefined || v === "") return null;

    switch (op) {
        case "eq":
            return { $eq: v };
        case "ne":
            return { $ne: v };
        case "contains":
            return { $regex: escapeRegex(v), $options: "i" };
        case "notContains":
            return { $not: new RegExp(escapeRegex(v), "i") };
        case "startsWith":
            return { $regex: `^${escapeRegex(v)}`, $options: "i" };
        case "endsWith":
            return { $regex: `${escapeRegex(v)}$`, $options: "i" };
        case "gt":
            return { $gt: v };
        case "gte":
            return { $gte: v };
        case "lt":
            return { $lt: v };
        case "lte":
            return { $lte: v };
        default:
            return null;
    }
};

/**
 * @param filters   [{ field, op, value }] from the client
 * @param filterable { fieldName: "string" | "number" | ... } allowlist
 * @param matchType "all" (default) or "any"
 */
export const buildFilterMatch = (filters, filterable, matchType = "all") => {
    if (!Array.isArray(filters) || filters.length === 0) return null;

    const clauses = [];
    for (const filter of filters) {
        const type = filterable?.[filter?.field];
        if (!type) continue; // unknown field - drop it
        if (!OPERATORS[type]?.includes(filter.op)) continue; // operator not valid for this type

        const condition = buildCondition(filter, type);
        if (condition) clauses.push({ [filter.field]: condition });
    }

    if (!clauses.length) return null;
    return matchType === "any" ? { $or: clauses } : { $and: clauses };
};

/**
 * `{ field: 0 }` for every path the schema marks `select: false`.
 *
 * Mongoose applies that flag to find() but not to aggregate(), so a list
 * endpoint would otherwise return a field the model explicitly hides — which
 * is exactly how the SMTP appPassword reached every search response.
 */
const hiddenPaths = (model) => {
    const excluded = {};
    const paths = model?.schema?.paths ?? {};
    for (const [name, path] of Object.entries(paths)) {
        if (path?.options?.select === false) excluded[name] = 0;
    }
    return excluded;
};

/**
 * `searchRefs` entry for the usual case: the row's employee, matched by name or
 * code (ADR-044). `field` is the row's Employee ref.
 */
export const employeeSearch = (field = "employeeId") => ({ field, model: "Employee", fields: ["employeeName", "employeeCode"] });

const REF_CACHE_MS = 5000;
const REF_CACHE_MAX = 200;
const refCache = new Map();

/**
 * Ids of `model` documents whose `fields` contain `match`. Memoised for a few
 * seconds: one global search replays dozens of lists with the same term, and
 * they would otherwise each look up the same employees.
 */
const matchingRefIds = (model, fields, match) => {
    const key = `${model}|${fields.join(",")}|${String(match).toLowerCase()}`;
    const hit = refCache.get(key);
    if (hit && Date.now() - hit.at <= REF_CACHE_MS) return hit.ids;
    if (refCache.size >= REF_CACHE_MAX) refCache.clear();
    const ids = mongoose.model(model)
        .find({ $or: fields.map((field) => ({ [field]: { $regex: escapeRegex(match), $options: "i" } })) }, { _id: 1 })
        .lean()
        .then((docs) => docs.map((doc) => doc._id));
    ids.catch(() => refCache.delete(key));
    refCache.set(key, { at: Date.now(), ids });
    return ids;
};

/**
 * Runs the standard list aggregation.
 *
 * @param model    mongoose model
 * @param body     req.body
 * @param options.searchFields fields the free-text `match` searches
 * @param options.searchRefs   [{ field, model, fields }] — `match` also finds rows whose
 *                             `field` references a `model` document with `match` in one of
 *                             its `fields` (e.g. employeeSearch(): the employee's name or code)
 * @param options.filterable   allowlist of filterable fields -> type
 * @param options.stages       $lookup/$addFields to run before filtering
 * @param options.scopeFilter  match from buildScopeFilter() — server-set, never client input
 * @param options.project      extra `{ field: 0 }` exclusions on top of the schema's own
 * @returns the same [{ count, data }] shape the endpoints already returned
 */
export const runListQuery = async (model, body = {}, { searchFields = [], searchRefs = [], filterable = {}, stages = [], scopeFilter = null, project = null } = {}) => {
    const { skip = 0, per_page = 100, sorton, sortdir, match, isActive, filters, matchType } = body;

    const pipeline = [];

    const base = {};
    if (isActive !== undefined && isActive !== null && isActive !== "" && model.schema.path("isActive")) base.isActive = isActive;
    // Row-level scope goes into the first $match so it rides the indexes and
    // no later stage can widen it.
    if (scopeFilter) Object.assign(base, scopeFilter);
    pipeline.push({ $match: base });

    // Joins and derived fields have to happen before filtering, so filters can
    // target the derived names too (e.g. countryName on the state list).
    pipeline.push(...stages);

    if (match && (searchFields.length || searchRefs.length)) {
        // The scope $match above has already narrowed the rows; a ref lookup
        // only adds ids to match against, it never widens what is visible.
        const refClauses = await Promise.all(searchRefs.map(async ({ field, model: refModel, fields }) =>
            ({ [field]: { $in: await matchingRefIds(refModel, fields, match) } })));
        pipeline.push({
            $match: {
                $or: [...searchFields.map((field) => ({ [field]: { $regex: escapeRegex(match), $options: "i" } })), ...refClauses],
            },
        });
    }

    const filterMatch = buildFilterMatch(filters, filterable, matchType);
    if (filterMatch) pipeline.push({ $match: filterMatch });

    const sort = {};
    if (sorton && sortdir && filterable[sorton] !== undefined) {
        sort[sorton] = sortdir === "desc" ? -1 : 1;
    } else {
        sort.createdAt = -1;
    }
    pipeline.push({ $sort: sort });

    // `select: false` is a Mongoose *schema* feature and aggregation does not
    // honour it — a credential marked unselectable still came back from every
    // search endpoint. Rebuild that exclusion as a real $project stage, and let
    // a caller exclude more on top. Applied inside the paged branch only, so the
    // count stage stays a cheap $group.
    // __v is Mongoose bookkeeping and isDeleted is always false in a list (the
    // soft-delete plugin filters deleted rows out before this runs) — neither
    // has a single consumer in the admin app, and both ship on every row.
    const alwaysHidden = { __v: 0, isDeleted: 0 };
    const hidden = hiddenPaths(model);
    const exclusions = { ...alwaysHidden, ...hidden, ...(project ?? {}) };
    const pageStages = [{ $skip: Number(skip) || 0 }, { $limit: Number(per_page) || 100 }];
    if (Object.keys(exclusions).length) pageStages.push({ $project: exclusions });

    pipeline.push({
        $facet: {
            stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
            stage2: pageStages,
        },
    });
    pipeline.push({ $unwind: { path: "$stage1" } });
    pipeline.push({ $project: { count: "$stage1.count", data: "$stage2" } });

    return model.aggregate(pipeline);
};
