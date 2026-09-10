import nodemailer from "nodemailer";
import EmailFor from "../models/EmailFor.js";
import EmailTemplate from "../models/EmailTemplate.js";

/**
 * Every {{TOKEN}} occurrence in a string. Pure, no I/O — used by both
 * validation (does the template only use declared tokens?) and filling
 * (replace them with real values).
 */
export const extractTokens = (text) => {
  const matches = (text || "").match(/{{\s*([A-Z0-9_]+)\s*}}/g) || [];
  return matches.map((m) => m.replace(/[{}\s]/g, ""));
};

/**
 * Which tokens in `emailSubject`/`emailSignature` are not in `mergeFields`
 * (the trigger's declared `{ TOKEN: description }` map). Empty array means
 * the template is valid for its trigger. Pure — unit-tested without a
 * database or a trigger actually existing.
 */
export const validateMergeTokens = ({ emailSubject, emailSignature }, mergeFields) => {
  const allowed = new Set(Object.keys(mergeFields || {}));
  const used = new Set([...extractTokens(emailSubject), ...extractTokens(emailSignature)]);
  return [...used].filter((token) => !allowed.has(token));
};

/**
 * Replace every {{TOKEN}} in `text` with `values[TOKEN]`. Unlike the
 * single-shot `.replace()` this replaced in otp.controller.js, a token used
 * twice in one template is filled every time it appears.
 */
export const fillMergeFields = (text, values = {}) => {
  let result = text || "";
  for (const [token, value] of Object.entries(values)) {
    result = result.replaceAll(`{{${token}}}`, value ?? "");
  }
  return result;
};

const buildTransporter = (emailSetup) => {
  if (emailSetup.host.toLowerCase().includes("gmail")) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: emailSetup.email, pass: emailSetup.appPassword },
    });
  }
  return nodemailer.createTransport({
    host: emailSetup.host,
    port: emailSetup.port,
    secure: emailSetup.SSL,
    auth: { user: emailSetup.email, pass: emailSetup.appPassword },
  });
};

/**
 * Resolve a trigger key to its active EmailFor -> active EmailTemplate, fill
 * merge fields, send. Never throws: a missing/inactive trigger or template,
 * or a transporter failure, all come back as `{ sent: false, reason }`
 * instead of stopping the caller's request. The caller decides what that
 * means for it — see otp.controller.js, which still 404s on a miss to keep
 * its existing behaviour, and a future public form that would not.
 *
 * `reason` is one of: "no_trigger" | "no_template" | "send_failed".
 */
export const sendTriggeredEmail = async (triggerKey, { toEmail, mergeFields = {} }) => {
  const emailFor = await EmailFor.findOne({ triggerKey, isActive: true });
  if (!emailFor) {
    console.error(`sendTriggeredEmail: no active EmailFor for trigger "${triggerKey}"`);
    return { sent: false, reason: "no_trigger" };
  }

  const emailTemplate = await EmailTemplate.findOne({
    emailFor: emailFor._id,
    isActive: true,
  }).populate({ path: "emailFrom", select: "+appPassword" });

  if (!emailTemplate) {
    console.error(`sendTriggeredEmail: no active EmailTemplate for trigger "${triggerKey}"`);
    return { sent: false, reason: "no_template" };
  }

  try {
    const transporter = buildTransporter(emailTemplate.emailFrom);
    await transporter.sendMail({
      from: `"${emailTemplate.mailerName}" <${emailTemplate.emailFrom.email}>`,
      to: toEmail,
      cc: emailTemplate.emailCC || "",
      bcc: emailTemplate.emailBCC || "",
      subject: fillMergeFields(emailTemplate.emailSubject, mergeFields),
      html: fillMergeFields(emailTemplate.emailSignature, mergeFields),
    });
    return { sent: true };
  } catch (error) {
    console.error(`sendTriggeredEmail: send failed for trigger "${triggerKey}"`, error);
    return { sent: false, reason: "send_failed" };
  }
};
