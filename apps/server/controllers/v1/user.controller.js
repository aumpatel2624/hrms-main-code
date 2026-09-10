import { runListQuery } from "../../utils/listQuery.js";
import { buildScopeFilter } from "../../utils/scope.js";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../../models/User.js";

export const createUser = async (req, res) => {
  try {
    const {
      userName,
      departmentId,
      roleId,
      email,
      mobileNumber,
      countryId,
      stateId,
      cityId,
      address,
      password,
      isActive,
    } = req.body;

    if (await User.findOne({ email })) {
      return res
        .status(400)
        .json({ isOk: false, message: "User already exists", status: 400 });
    }

    await User.create({
      userName,
      departmentId,
      roleId,
      email,
      mobileNumber,
      countryId,
      stateId,
      cityId,
      address,
      password: await bcrypt.hash(password, 10),
      isActive,
    });

    return res.status(201).json({
      isOk: true,
      message: "User created successfully",
      status: 201,
    });
  } catch (error) {
    console.error("Error in createUser:", error);
    return res
      .status(500)
      .json({ isOk: false, message: "Internal server error", status: 500 });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      userName,
      departmentId,
      roleId,
      email,
      mobileNumber,
      countryId,
      stateId,
      cityId,
      address,
      isActive,
    } = req.body;

    const user = await User.findOne({
      _id: userId,
      ...(buildScopeFilter(req.user, { department: "departmentId", owner: "_id" }) ?? {}),
    });
    if (!user) {
      return res
        .status(404)
        .json({ isOk: false, message: "User not found", status: 404 });
    }

    if (await User.findOne({ email, _id: { $ne: userId } })) {
      return res
        .status(400)
        .json({ isOk: false, message: "Email already exists", status: 400 });
    }

    Object.assign(user, {
      userName,
      departmentId,
      roleId,
      email,
      mobileNumber,
      countryId,
      stateId,
      cityId,
      address,
      isActive,
    });

    await user.save();

    return res.status(200).json({
      isOk: true,
      message: "User updated successfully",
      status: 200,
    });
  } catch (error) {
    console.error("Error in updateUser:", error);
    return res
      .status(500)
      .json({ isOk: false, message: "Internal server error", status: 500 });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      {
        _id: req.params.userId,
        ...(buildScopeFilter(req.user, { department: "departmentId", owner: "_id" }) ?? {}),
      },
      { isDeleted: true },
    );

    if (!user) {
      return res
        .status(404)
        .json({ isOk: false, message: "User not found", status: 404 });
    }

    return res.status(200).json({
      isOk: true,
      message: "User deleted successfully",
      status: 200,
    });
  } catch (error) {
    console.error("Error in deleteUser:", error);
    return res
      .status(500)
      .json({ isOk: false, message: "Internal server error", status: 500 });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.params.userId,
      ...(buildScopeFilter(req.user, { department: "departmentId", owner: "_id" }) ?? {}),
    })
      .select("-password")
      .populate("departmentId")
      .populate("countryId")
      .populate("stateId")
      .populate("cityId")
      .populate("roleId");

    if (!user) {
      return res
        .status(404)
        .json({ isOk: false, message: "User not found", status: 404 });
    }

    return res.status(200).json({ isOk: true, data: user, status: 200 });
  } catch (error) {
    console.error("Error in getUserById:", error);
    return res
      .status(500)
      .json({ isOk: false, message: "Internal server error", status: 500 });
  }
};

export const listAllUsers = async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select("-password")
      .populate("departmentId")
      .populate("countryId")
      .populate("stateId")
      .populate("cityId")
      .populate("roleId");

    return res.status(200).json({ isOk: true, data: users, status: 200 });
  } catch (error) {
    console.error("Error in listAllUsers:", error);
    return res
      .status(500)
      .json({ isOk: false, message: "Internal server error", status: 500 });
  }
};

export const listUsersByParams = async (req, res) => {
  try {
    const list = await runListQuery(User, req.body, {
      searchFields: ["userName", "email", "mobileNumber", "department.departmentName"],
      filterable: {
        userName: "string",
        email: "string",
        mobileNumber: "string",
        address: "string",
        departmentId: "objectId",
        roleId: "objectId",
        countryId: "objectId",
        stateId: "objectId",
        cityId: "objectId",
        isActive: "boolean",
        createdAt: "date",
      },
      stages: [
        // `pipeline` rather than a bare $lookup: the default pulls the whole
        // joined document, and the list only ever renders the name. The joined
        // _id stays because the department filter matches on it.
        {
          $lookup: {
            from: "departments",
            localField: "departmentId",
            foreignField: "_id",
            as: "department",
            pipeline: [{ $project: { departmentName: 1 } }],
          },
        },
        { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "rolemasters",
            localField: "roleId",
            foreignField: "_id",
            as: "role",
            pipeline: [{ $project: { roleName: 1 } }],
          },
        },
        { $unwind: { path: "$role", preserveNullAndEmptyArrays: true } },
        { $project: { password: 0 } },
      ],
      // The list renders name, department, email and phone. The location ids
      // and updatedAt are only read on the detail screen, which fetches the
      // record by id — no consumer reads them from a list row.
      project: { countryId: 0, stateId: 0, cityId: 0, updatedAt: 0, address: 0 },
      // Role-based row scope (ADR-002): department-scoped roles see their
      // department's users, own-scoped roles see themselves.
      scopeFilter: buildScopeFilter(req.user, { department: "departmentId", owner: "_id" }),
    });

    return res.status(200).json({ isOk: true, data: list, status: 200 });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ isOk: false, message: "Internal server error", status: 500 });
  }
};

export const listUsersByDepartment = async (req, res) => {
  try {
    const users = await User.find({
      departmentId: req.params.departmentId,
      isActive: true,
    }).select("-password");

    return res.status(200).json({ isOk: true, data: users, status: 200 });
  } catch (error) {
    console.error("Error in listUsersByDepartment:", error);
    return res
      .status(500)
      .json({ isOk: false, message: "Internal server error", status: 500 });
  }
};

export const resetUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ isOk: false, message: "User not found", status: 404 });
    }

    // findByIdAndUpdate, not save(): save() re-validates the whole document, so
    // a record that predates a later-added required field (or was imported
    // without one) could never have its password reset — the request failed with
    // an unrelated "address is required". A password reset must only touch the
    // password.
    user.password = await bcrypt.hash(password, 10);
    await user.updateOne({ $set: { password: user.password } });

    return res.status(200).json({
      isOk: true,
      message: "Password reset successfully",
      status: 200,
    });
  } catch (error) {
    console.error("Error in resetUserPassword:", error);
    return res
      .status(500)
      .json({ isOk: false, message: "Internal server error", status: 500 });
  }
};
