import { pickPermissions } from "@demo-panel/shared/permissions";
import { SCOPE_VALUES } from "@demo-panel/shared/scopes";
import UserRoles from "../../models/UserRoles.js";
import { invalidateRoleCache } from "../../middlewares/checkPermission.js";

/**
 * Normalise an incoming permission row - either menuId or menuGroupId is set.
 */
const processRoles = (roles) =>
  roles.map((role) => ({
    menuId: role.menuId || null,
    menuGroupId: role.menuGroupId || null,
    ...pickPermissions(role),
  }));

/** Accept dataScope only when it is a known value; undefined leaves it alone. */
const pickDataScope = (dataScope) =>
  SCOPE_VALUES.includes(dataScope) ? dataScope : undefined;

export const createUserRoles = async (req, res) => {
  try {
    const { roleId, roles, dataScope } = req.body;

    if (!Array.isArray(roles)) {
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "Roles must be an array",
      });
    }

    // Upsert: `{ roleId: 1 }` is unique — one matrix document per role, and a
    // second save from the UI must not turn into a duplicate-key 500.
    const scope = pickDataScope(dataScope);
    const userRoles = await UserRoles.findOneAndUpdate(
      { roleId },
      {
        roleId,
        roles: processRoles(roles),
        ...(scope !== undefined && { dataScope: scope }),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    invalidateRoleCache(roleId);

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "User roles created successfully",
      data: userRoles,
    });
  } catch (error) {
    console.error("Error in createUserRoles:", error);
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const getUserRoles = async (req, res) => {
  try {
    const { roleId } = req.params;
    const userRoles = await UserRoles.find({ roleId });

    if (!userRoles || userRoles.length === 0) {
      return res.status(200).json({
        isOk: true,
        status: 200,
        message: "No roles assigned yet",
        data: [],
      });
    }

    return res.status(200).json({ isOk: true, status: 200, data: userRoles });
  } catch (error) {
    console.error("Error in getUserRoles:", error);
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: "Internal server error" });
  }
};

export const updateUserRoles = async (req, res) => {
  try {
    // The id can be either the UserRoles document id or the roleId it belongs to
    const id = req.params.roleId || req.body.roleId;
    const { roles, dataScope } = req.body;

    if (!Array.isArray(roles)) {
      return res.status(400).json({
        isOk: false,
        status: 400,
        message: "Roles must be an array",
      });
    }

    const scope = pickDataScope(dataScope);
    const update = {
      roles: processRoles(roles),
      ...(scope !== undefined && { dataScope: scope }),
    };

    let userRoles = await UserRoles.findByIdAndUpdate(id, update, {
      new: true,
    });

    if (!userRoles) {
      userRoles = await UserRoles.findOneAndUpdate({ roleId: id }, update, {
        new: true,
      });
    }

    if (!userRoles) {
      return res
        .status(404)
        .json({ isOk: false, status: 404, message: "User roles not found" });
    }

    invalidateRoleCache(userRoles.roleId);

    return res.status(200).json({
      isOk: true,
      status: 200,
      message: "User roles updated successfully",
      data: userRoles,
    });
  } catch (error) {
    console.error("Error in updateUserRoles:", error);
    return res
      .status(500)
      .json({ isOk: false, status: 500, message: "Internal server error" });
  }
};
