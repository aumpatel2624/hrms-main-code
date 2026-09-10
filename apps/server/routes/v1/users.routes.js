import express from "express";
import {
  createUser,
  updateUser,
  deleteUser,
  getUserById,
  listAllUsers,
  listUsersByParams,
  listUsersByDepartment,
  resetUserPassword,
} from "../../controllers/v1/user.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { checkPermission } from "../../middlewares/checkPermission.js";
import { ANY_ROLE, ADMIN_ONLY } from "@demo-panel/shared/roles";
import {
  createUserValidation,
  searchValidation,
  allowOnlyFields,
  allowedUserFields,
  allowedSearchFields,
} from "../../middlewares/inputValidator.js";

const router = express.Router();

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUser'
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error or user already exists
 */
router.post(
  "/users",
  authMiddleware(ANY_ROLE),
  checkPermission("/user", "write"),
  allowOnlyFields(allowedUserFields),
  createUserValidation,
  createUser,
);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: List all active users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 */
router.get("/users", authMiddleware(ANY_ROLE), checkPermission("/user", "read"), listAllUsers);

/**
 * @swagger
 * /users/search:
 *   post:
 *     summary: List users with pagination, sorting and search
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchParams'
 *     responses:
 *       200:
 *         description: Paginated users
 */
router.post(
  "/users/search",
  authMiddleware(ANY_ROLE),
  checkPermission("/user", "read"),
  allowOnlyFields(allowedSearchFields),
  searchValidation,
  listUsersByParams,
);

/**
 * @swagger
 * /users/department/{departmentId}:
 *   get:
 *     summary: List active users in a department
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: departmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users in the department
 */
router.get(
  "/users/department/:departmentId",
  authMiddleware(ANY_ROLE),
  checkPermission("/user", "read"),
  listUsersByDepartment,
);

/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     summary: Get a user by id
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get("/users/:userId", authMiddleware(ANY_ROLE), checkPermission("/user", "read"), getUserById);

/**
 * @swagger
 * /users/{userId}:
 *   put:
 *     summary: Update a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 */
router.put("/users/:userId", authMiddleware(ANY_ROLE), checkPermission("/user", "edit"), updateUser);

/**
 * @swagger
 * /users/{userId}:
 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */
router.delete("/users/:userId", authMiddleware(ANY_ROLE), checkPermission("/user", "delete"), deleteUser);

/**
 * @swagger
 * /users/{userId}/reset-password:
 *   post:
 *     summary: Reset a user's password
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       404:
 *         description: User not found
 */
router.post(
  "/users/:userId/reset-password",
  authMiddleware(ADMIN_ONLY),
  resetUserPassword,
);

export default router;
