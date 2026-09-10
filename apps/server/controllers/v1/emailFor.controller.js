import { runListQuery } from "../../utils/listQuery.js";
import EmailForModels from "../../models/EmailFor.js";
import EmailTemplateModels from "../../models/EmailTemplate.js";
import { EMAIL_TRIGGERS } from "../../config/emailTriggers.js";

/** Registered trigger, not already claimed by another live EmailFor. Shared by create/update. */
const validateTriggerKey = async (triggerKey, excludeEmailForId) => {
  if (!triggerKey || !EMAIL_TRIGGERS[triggerKey]) {
    return "Trigger is required and must be one of the registered triggers";
  }

  const claim = await EmailForModels.findOne({
    triggerKey,
    ...(excludeEmailForId ? { _id: { $ne: excludeEmailForId } } : {}),
  });
  if (claim) {
    return "This trigger is already assigned to another Email For";
  }

  return null;
};

export const createEmailFor = async (req, res) => {
  try {
    const { emailFor, triggerKey, isActive } = req.body;

    const triggerError = await validateTriggerKey(triggerKey);
    if (triggerError) {
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: triggerError,
      });
    }

    const existingEmailFor = await EmailForModels.findOne({ emailFor });

    if (existingEmailFor) {
      return res.status(409).json({
        isOk: false,
        status: 409,
        message: "Email For already exists",
      });
    }

    const emailForData = new EmailForModels({
      emailFor,
      triggerKey,
      isActive,
    });

    await emailForData.save();

    return res.status(201).json({
      status: 201,
      isOk: true,
      message: "Email For created successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
};

export const updateEmailFor = async (req, res) => {
  try {
    const { emailForId } = req.params;

    const { emailFor, triggerKey, isActive } = req.body;

    const emailForData = await EmailForModels.findById(emailForId);

    if (!emailForData) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Email For not found",
      });
    }

    const triggerError = await validateTriggerKey(triggerKey, emailForId);
    if (triggerError) {
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: triggerError,
      });
    }

    const existingEmailFor = await EmailForModels.findOne({
      emailFor,
      _id: { $ne: emailForId },
    });

    if (existingEmailFor) {
      return res.status(409).json({
        isOk: false,
        status: 409,
        message: "Email For already exists",
      });
    }

    emailForData.emailFor = emailFor;
    emailForData.triggerKey = triggerKey;
    emailForData.isActive = isActive;

    await emailForData.save();

    return res.status(200).json({
      status: 200,
      isOk: true,
      message: "Email For updated successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
};

export const getEmailForById = async (req, res) => {
  try {
    const { emailForId } = req.params;

    const emailForData = await EmailForModels.findById(emailForId);

    if (!emailForData) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Email For not found",
      });
    }

    return res.status(200).json({
      status: 200,
      isOk: true,
      data: emailForData,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
};

export const listAllEmailFor = async (req, res) => {
  try {
    const emailForData = await EmailForModels.find({ isActive: true });

    return res.status(200).json({
      status: 200,
      isOk: true,
      data: emailForData,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
};

export const deleteEmailFor = async (req, res) => {
  try {
    const { emailForId } = req.params;
    console.log(emailForId);

    const emailForData = await EmailForModels.findById(emailForId);

    if (!emailForData) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Email For not found",
      });
    }

    const dependantTemplate = await EmailTemplateModels.find({
      emailFor: emailForData._id,
    });

    if (dependantTemplate.length > 0) {
      return res.status(400).json({
        isOk: false,
        status: 400,
        message:
          "Email for is being used in Email Template. Either Delete or change the Email For Field in the Template.",
      });
    }

    await EmailForModels.findByIdAndUpdate(emailForId, { isDeleted: true });

    return res.status(200).json({
      status: 200,
      isOk: true,
      message: "Email For deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
};

export const listEmailForByParams = async (req, res) => {
  try {
    const list = await runListQuery(EmailForModels, req.body, {
      searchFields: ["emailFor", "triggerKey"],
      filterable: {
        emailFor: "string",
        triggerKey: "string",
        isActive: "boolean",
        createdAt: "date",
      },
    });

    return res.status(200).json({ isOk: true, data: list, status: 200 });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, message: error.message, status: 500 });
  }
};

/**
 * The trigger registry (ADR-015), for the trigger picker on EmailFor's form
 * and the merge-field hint on EmailTemplate's form — one payload, two UI
 * spots. Mirrors listWidgetSources in dashboard.controller.js.
 */
export const listEmailTriggers = async (req, res) => {
  try {
    const claims = await EmailForModels.find({}, "triggerKey");
    const claimedBy = new Map(claims.map((row) => [row.triggerKey, String(row._id)]));

    const triggers = Object.entries(EMAIL_TRIGGERS).map(([key, trigger]) => ({
      key,
      label: trigger.label,
      description: trigger.description,
      mergeFields: trigger.mergeFields,
      claimedByEmailForId: claimedBy.get(key) ?? null,
    }));

    return res.status(200).json({ status: 200, isOk: true, data: { triggers } });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      isOk: false,
      status: 500,
      message: "Internal server error",
      error: error,
    });
  }
};
