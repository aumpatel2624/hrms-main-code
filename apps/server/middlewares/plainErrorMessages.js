import { fieldLabel } from "../models/validationMessages.js";

/**
 * Production only: no raw database wording in an error reply.
 *
 * Most controllers answer a Mongoose ValidationError or CastError with its
 * own message, which names models, paths and values — `Cast to ObjectId
 * failed for value "x" (type string) at path "_id" for model
 * "LeaveApplication"` (29 Oct security test, low). This rewrites such a
 * message into a plain sentence and logs the original, so the detail stays
 * findable without being shown. A controller's own message passes untouched.
 */

/** Wording only the database layer produces. */
const RAW = /Cast to \w+ failed|for model "|E11000|validation failed|Path `|for path `|BSONError|ObjectId/;

const castMessage = (message) => {
  const path = message.match(/at path "([^"]+)"/)?.[1];
  if (!path || path === "_id") return "That record could not be found";
  return `${fieldLabel(path)} is not valid`;
};

/** The plain version of an error message, or the message itself when it is already plain. */
export const plainErrorMessage = (message) => {
  if (typeof message !== "string" || !RAW.test(message)) return message;
  if (/E11000/.test(message)) return "A record with these unique values already exists";
  // "LeaveApplication validation failed: description: Description can be at
  // most 2000 characters, fromDate: Cast to date failed …"
  const validation = message.match(/validation failed: ([\s\S]*)$/);
  if (validation) {
    return validation[1]
      .split(/, (?=[\w.]+: )/)
      .map((part) => {
        const [, path, text] = part.match(/^([\w.]+): ([\s\S]*)$/) ?? [null, null, part];
        if (!RAW.test(text)) return text;
        return path ? `${fieldLabel(path)} is not valid` : "One of the values sent is not valid";
      })
      .join(", ");
  }
  if (/Cast to \w+ failed/.test(message)) return castMessage(message);
  return "One of the values sent is not valid";
};

export const plainErrorMessages = (req, res, next) => {
  const json = res.json.bind(res);
  res.json = (body) => {
    if (body && body.isOk === false && typeof body.message === "string") {
      const plain = plainErrorMessage(body.message);
      if (plain !== body.message) {
        console.error(`${req.method} ${req.originalUrl} answered: ${body.message}`);
        return json({ ...body, message: plain });
      }
    }
    return json(body);
  };
  next();
};
