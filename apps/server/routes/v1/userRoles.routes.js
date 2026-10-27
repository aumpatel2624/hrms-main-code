import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission, resolveUserScope } from "../../middlewares/checkPermission.js";
import { ANY_ROLE, ROLES } from "@demo-panel/shared/roles";
import {
  createUserRoles,
  getUserRoles,
  updateUserRoles,
} from "../../controllers/v1/userRoles.controller.js";

const router = express.Router();

// Every signed-in user reads their own role's matrix (the menu is built from
// it); any other role's matrix needs read on the User Roles screen.
const readRoleGate = checkPermission("/user-roles", "read");
const ownRoleOrUserRolesRead = async (req, res, next) => {
  try {
    if (req.user?.role === ROLES.USER && (await resolveUserScope(req))
      && String(req.user.roleId) === String(req.params.roleId)) return next();
  } catch (error) {
    console.error("Error in ownRoleOrUserRolesRead:", error);
  }
  return readRoleGate(req, res, next);
};

/**
 * @swagger
 * /user-roles:
 *   post:
 *     summary: Assign menu permissions to a role
 *     tags: [User Roles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserRoles'
 *     responses:
 *       200:
 *         description: User roles created successfully
 *       400:
 *         description: Roles must be an array
 */
router.post("/user-roles", authMiddleware(ANY_ROLE), checkPermission("/user-roles", "write"), createUserRoles);

/**
 * @swagger
 * /user-roles/{roleId}:
 *   get:
 *     summary: Get menu permissions for a role
 *     tags: [User Roles]
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Permissions for the role (empty array if none assigned)
 */
router.get("/user-roles/:roleId", authMiddleware(ANY_ROLE), ownRoleOrUserRolesRead, getUserRoles);

/**
 * @swagger
 * /user-roles/{roleId}:
 *   put:
 *     summary: Update menu permissions for a role
 *     tags: [User Roles]
 *     parameters:
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User roles updated successfully
 *       404:
 *         description: User roles not found
 */
router.put("/user-roles/:roleId", authMiddleware(ANY_ROLE), checkPermission("/user-roles", "edit"), updateUserRoles);

export default router;
