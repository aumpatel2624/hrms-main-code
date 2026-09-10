import { runListQuery } from "../../utils/listQuery.js";
import bcrypt from "bcrypt";
import AdminUser from "../../models/AdminUser.js";

export const createAdminUser = async (req, res) => {
  try {
    const { adminName, email, password, mobileNumber, isActive } = req.body;

    if (await AdminUser.findOne({ email })) {
      return res.status(400).json({
        isOk: false,
        message: "Admin user already exists",
        status: 400,
      });
    }

    await AdminUser.create({
      adminName,
      email,
      password: await bcrypt.hash(password, 10),
      mobileNumber,
      isActive,
    });

    return res.status(201).json({
      isOk: true,
      message: "Admin user created successfully",
      status: 201,
    });
  } catch (error) {
    console.error("Error in createAdminUser:", error);
    return res
      .status(500)
      .json({ isOk: false, message: error.message, status: 500 });
  }
};

export const updateAdminUser = async (req, res) => {
  try {
    const { adminUserId } = req.params;
    const { adminName, email, mobileNumber, isActive } = req.body;

    const adminUser = await AdminUser.findById(adminUserId);
    if (!adminUser) {
      return res
        .status(404)
        .json({ isOk: false, message: "Admin user not found", status: 404 });
    }

    if (await AdminUser.findOne({ email, _id: { $ne: adminUserId } })) {
      return res
        .status(400)
        .json({ isOk: false, message: "Email already exists", status: 400 });
    }

    adminUser.adminName = adminName;
    adminUser.email = email;
    adminUser.mobileNumber = mobileNumber;
    adminUser.isActive = isActive;

    await adminUser.save();

    return res.status(200).json({
      isOk: true,
      message: "Admin user updated successfully",
      status: 200,
    });
  } catch (error) {
    console.error("Error in updateAdminUser:", error);
    return res
      .status(500)
      .json({ isOk: false, message: error.message, status: 500 });
  }
};

export const deleteAdminUser = async (req, res) => {
  try {
    const { adminUserId } = req.params;

    // ponytail: last-admin guard — locking everyone out is unrecoverable without DB access
    const activeAdmins = await AdminUser.countDocuments({ isActive: true });
    const target = await AdminUser.findById(adminUserId);

    if (!target) {
      return res
        .status(404)
        .json({ isOk: false, message: "Admin user not found", status: 404 });
    }

    if (target.isActive && activeAdmins <= 1) {
      return res.status(400).json({
        isOk: false,
        message: "Cannot delete the last active admin user",
        status: 400,
      });
    }

    await AdminUser.findByIdAndUpdate(adminUserId, { isDeleted: true });

    return res.status(200).json({
      isOk: true,
      message: "Admin user deleted successfully",
      status: 200,
    });
  } catch (error) {
    console.error("Error in deleteAdminUser:", error);
    return res
      .status(500)
      .json({ isOk: false, message: error.message, status: 500 });
  }
};

export const getAdminUserById = async (req, res) => {
  try {
    const adminUser = await AdminUser.findById(req.params.adminUserId).select(
      "-password",
    );

    if (!adminUser) {
      return res
        .status(404)
        .json({ isOk: false, message: "Admin user not found", status: 404 });
    }

    return res.status(200).json({ isOk: true, data: adminUser, status: 200 });
  } catch (error) {
    console.error("Error in getAdminUserById:", error);
    return res
      .status(500)
      .json({ isOk: false, message: error.message, status: 500 });
  }
};

export const listAllAdminUsers = async (req, res) => {
  try {
    const adminUsers = await AdminUser.find({ isActive: true }).select(
      "-password",
    );
    return res.status(200).json({ isOk: true, data: adminUsers, status: 200 });
  } catch (error) {
    console.error("Error in listAllAdminUsers:", error);
    return res
      .status(500)
      .json({ isOk: false, message: error.message, status: 500 });
  }
};

export const listAdminUsersByParams = async (req, res) => {
  try {
    const list = await runListQuery(AdminUser, req.body, {
      searchFields: ["adminName", "email", "mobileNumber"],
      filterable: {
        adminName: "string",
        email: "string",
        mobileNumber: "string",
        isActive: "boolean",
        createdAt: "date",
      },
            stages: [
        { $project: { password: 0 } },
            ],
    });

    return res.status(200).json({ isOk: true, data: list, status: 200 });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, message: error.message, status: 500 });
  }
};

export const resetAdminUserPassword = async (req, res) => {
  try {
    const { adminUserId } = req.params;
    const { password } = req.body;

    const adminUser = await AdminUser.findById(adminUserId);
    if (!adminUser) {
      return res
        .status(404)
        .json({ isOk: false, message: "Admin user not found", status: 404 });
    }

    // findByIdAndUpdate semantics, not save(): save() re-validates the whole
    // document, so a record missing a later-added required field could never
    // have its password reset. A password reset must only touch the password.
    adminUser.password = await bcrypt.hash(password, 10);
    await adminUser.updateOne({ $set: { password: adminUser.password } });

    return res.status(200).json({
      isOk: true,
      message: "Password reset successfully",
      status: 200,
    });
  } catch (error) {
    console.error("Error in resetAdminUserPassword:", error);
    return res
      .status(500)
      .json({ isOk: false, message: error.message, status: 500 });
  }
};
