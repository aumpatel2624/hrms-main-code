import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { ANY_ROLE } from "@demo-panel/shared/roles";
import {
  createUserRoles,
  getUserRoles,
  updateUserRoles,
} from "../../controllers/v1/userRoles.controller.js";

const router = express.Router();

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
router.get("/user-roles/:roleId", authMiddleware(ANY_ROLE), getUserRoles);

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
