import { runListQuery } from "../../utils/listQuery.js";
import EmailSetupModels from "../../models/EmailSetup.js";
import EmailTemplateModels from "../../models/EmailTemplate.js";

export const createEmailSetup = async (req, res) => {
  try {
    const { email, appPassword, SSL, port, host, isActive } = req.body;

    const existingEmailSetup = await EmailSetupModels.findOne({ email });

    if (existingEmailSetup) {
      return res.status(409).json({
        isOk: false,
        status: 409,
        message: "Email Setup already exists",
      });
    }

    const newEmailSetup = new EmailSetupModels({
      email,
      appPassword,
      SSL,
      port,
      host,
      isActive,
    });

    await newEmailSetup.save();

    res.status(201).json({
      status: 201,
      isOk: true,
      message: "Email Setup created successfully",
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

export const updateEmailSetup = async (req, res) => {
  try {
    const { emailSetupId } = req.params;

    const { email, appPassword, SSL, port, host, isActive } = req.body;

    const emailSetup = await EmailSetupModels.findById(emailSetupId);

    if (!emailSetup) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Email Setup not found",
      });
    }

    const existingEmailSetup = await EmailSetupModels.findOne({
      email,
      _id: { $ne: emailSetupId },
    });

    if (existingEmailSetup) {
      return res.status(409).json({
        isOk: false,
        status: 409,
        message: "Email Setup already exists",
      });
    }

    emailSetup.email = email;
    emailSetup.appPassword = appPassword;
    emailSetup.SSL = SSL;
    emailSetup.port = port;
    emailSetup.host = host;
    emailSetup.isActive = isActive;

    await emailSetup.save();

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Email Setup updated successfully",
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

export const getEmailSetupById = async (req, res) => {
  try {
    const { emailSetupId } = req.params;

    const emailSetup = await EmailSetupModels.findById(emailSetupId);

    if (!emailSetup) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Email Setup not found",
      });
    }

    return res.status(200).json({
      isOk: true,
      status: 200,
      data: emailSetup,
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

export const listAllEmailSetup = async (req, res) => {
  try {
    const emailSetup = await EmailSetupModels.find({ isActive: true });

    return res.status(200).json({
      isOk: true,
      status: 200,
      data: emailSetup,
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

export const deleteEmailSetup = async (req, res) => {
  try {
    const { emailSetupId } = req.params;

    const emailSetup = await EmailSetupModels.findById(emailSetupId);

    if (!emailSetup) {
      return res.status(404).json({
        isOk: false,
        status: 404,
        message: "Email Setup not found",
      });
    }

    const dependantTemplate = await EmailTemplateModels.find({
      emailFrom: emailSetup._id,
    });

    if (dependantTemplate.length > 0) {
      return res.status(400).json({
        isOk: false,
        status: 400,
        message:
          "Email Setup is being used in Email Template. Either Delete or change the Email Field in the Template.",
      });
    }

    await EmailSetupModels.findByIdAndUpdate(emailSetupId, { isDeleted: true });

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "Email Setup deleted successfully",
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

export const listEmailSetupByParams = async (req, res) => {
  try {
    const list = await runListQuery(EmailSetupModels, req.body, {
      searchFields: ["email", "host"],
      filterable: {
        email: "string",
        host: "string",
        port: "string",
        SSL: "boolean",
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
