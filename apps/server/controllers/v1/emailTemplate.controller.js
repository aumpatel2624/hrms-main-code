import { runListQuery } from "../../utils/listQuery.js";
import EmailTemplateModels from "../../models/EmailTemplate.js";
import EmailForModels from "../../models/EmailFor.js";
import { EMAIL_TRIGGERS } from "../../config/emailTriggers.js";
import { validateMergeTokens } from "../../utils/sendTriggeredEmail.js";

/**
 * Every {{TOKEN}} in `emailSubject`/`emailSignature` must be declared for the
 * trigger the given EmailFor carries (INV-6, ADR-015). Returns an error
 * string, or null when the template is valid.
 */
const validateAgainstTrigger = async (emailForId, emailSubject, emailSignature) => {
  const emailFor = await EmailForModels.findById(emailForId);
  if (!emailFor) return "Email For not found";

  const mergeFields = EMAIL_TRIGGERS[emailFor.triggerKey]?.mergeFields || {};
  const undeclared = validateMergeTokens({ emailSubject, emailSignature }, mergeFields);
  if (undeclared.length) {
    return `Undeclared merge field(s) for this trigger: ${undeclared.map((t) => `{{${t}}}`).join(", ")}`;
  }
  return null;
};

/** At most one active template per EmailFor (INV-5, ADR-015) — the friendly check backing the partial unique index. */
const findConflictingActiveTemplate = (emailFor, excludeEmailTemplateId) =>
  EmailTemplateModels.findOne({
    emailFor,
    isActive: true,
    ...(excludeEmailTemplateId ? { _id: { $ne: excludeEmailTemplateId } } : {}),
  });

export const createEmailTemplate = async (req, res) => {
  try {
    const {
      templateName,
      emailFrom,
      emailFor,
      mailerName,
      emailCC,
      emailBCC,
      emailSubject,
      emailSignature,
      isActive,
    } = req.body;

    const tokenError = await validateAgainstTrigger(emailFor, emailSubject, emailSignature);
    if (tokenError) {
      return res.status(400).json({ isOk: false, status: 400, message: tokenError });
    }

    // isActive defaults to true on the model when omitted — mirror that here
    // so a create with no isActive in the body still gets the duplicate check.
    const willBeActive = isActive !== undefined ? Boolean(isActive) : true;
    if (willBeActive) {
      const conflict = await findConflictingActiveTemplate(emailFor);
      if (conflict) {
        return res.status(409).json({
          isOk: false,
          status: 409,
          message:
            "Another active template already exists for this Email For. Deactivate it first, or save this one as inactive.",
        });
      }
    }

    const emailTemplate = new EmailTemplateModels({
      templateName,
      emailFrom,
      emailFor,
      mailerName,
      emailCC,
      emailBCC,
      emailSubject,
      emailSignature,
      isActive,
    });

    await emailTemplate.save();

    return res.status(201).json({
      isOk: true,
      status: 201,
      message: "Email Template created successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
};

export const updateEmailTemplate = async (req, res) => {
  try {
    const { emailTemplateId } = req.params;

    const {
      templateName,
      emailFrom,
      emailFor,
      mailerName,
      emailCC,
      emailBCC,
      emailSubject,
      emailSignature,
      isActive,
    } = req.body;

    const emailTemplate = await EmailTemplateModels.findById(emailTemplateId);

    if (!emailTemplate) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Email Template not found",
      });
    }

    // Fields omitted from the body leave the existing document unchanged
    // (Mongoose's own update behaviour) — validate against what the record
    // will actually read as afterwards, not just what was sent.
    const resultingEmailFor = emailFor ?? emailTemplate.emailFor;
    const resultingSubject = emailSubject ?? emailTemplate.emailSubject;
    const resultingSignature = emailSignature ?? emailTemplate.emailSignature;
    const resultingActive = isActive !== undefined ? Boolean(isActive) : emailTemplate.isActive;

    const tokenError = await validateAgainstTrigger(resultingEmailFor, resultingSubject, resultingSignature);
    if (tokenError) {
      return res.status(400).json({ isOk: false, status: 400, message: tokenError });
    }

    if (resultingActive) {
      const conflict = await findConflictingActiveTemplate(resultingEmailFor, emailTemplateId);
      if (conflict) {
        return res.status(409).json({
          isOk: false,
          status: 409,
          message:
            "Another active template already exists for this Email For. Deactivate it first, or save this one as inactive.",
        });
      }
    }

    await EmailTemplateModels.findByIdAndUpdate(
      emailTemplateId,
      {
        templateName,
        emailFrom,
        emailFor,
        mailerName,
        emailCC,
        emailBCC,
        emailSubject,
        emailSignature,
        isActive,
      },
      { new: true },
    );

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Email Template updated successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
};

export const getEmailTemplateById = async (req, res) => {
  try {
    const { emailTemplateId } = req.params;

    const emailTemplate = await EmailTemplateModels.findById(emailTemplateId)
      .populate("emailFrom")
      .populate("emailFor");

    if (!emailTemplate) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Email Template not found",
      });
    }

    return res.status(200).json({
      isOk: true,
      status: 200,
      data: emailTemplate,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
};

export const deleteEmailTemplate = async (req, res) => {
  try {
    const { emailTemplateId } = req.params;

    const emailTemplate = await EmailTemplateModels.findById(emailTemplateId);

    if (!emailTemplate) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Email Template not found",
      });
    }

    await EmailTemplateModels.findByIdAndUpdate(emailTemplateId, { isDeleted: true });

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Email Template deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
};

export const listEmailTemplateByParams = async (req, res) => {
  try {
    const list = await runListQuery(EmailTemplateModels, req.body, {
      searchFields: ["templateName", "mailerName", "emailSubject"],
      filterable: {
        templateName: "string",
        mailerName: "string",
        emailSubject: "string",
        emailCC: "string",
        emailBCC: "string",
        isActive: "boolean",
        createdAt: "date",
      },
            stages: [
        { $lookup: { from: "emailsetups", localField: "emailFrom", foreignField: "_id", as: "emailFrom" } },
        { $unwind: { path: "$emailFrom", preserveNullAndEmptyArrays: true } },
        { $lookup: { from: "emailfors", localField: "emailFor", foreignField: "_id", as: "emailFor" } },
        { $unwind: { path: "$emailFor", preserveNullAndEmptyArrays: true } },
            ],
    });

    return res.status(200).json({ isOk: true, data: list, status: 200 });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, message: error.message, status: 500 });
  }
};

export const listAllEmailTemplates = async (req, res) => {
  try {
    const emailTemplates = await EmailTemplateModels.find({
      isActive: true,
    }).select("_id templateName");
    return res.status(200).json({
      isOk: true,
      data: emailTemplates,
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};
