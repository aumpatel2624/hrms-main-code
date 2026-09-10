import express from "express";
import {
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  getAdminUserById,
  listAllAdminUsers,
  listAdminUsersByParams,
  resetAdminUserPassword,
} from "../../controllers/v1/adminUser.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { ADMIN_ONLY } from "@demo-panel/shared/roles";
import {
  createAdminUserValidation,
  searchValidation,
  allowOnlyFields,
  allowedAdminUserFields,
  allowedSearchFields,
} from "../../middlewares/inputValidator.js";

const router = express.Router();

/**
 * @swagger
 * /admin-users:
 *   post:
 *     summary: Create an admin user
 *     tags: [Admin Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAdminUser'
 *     responses:
 *       201:
 *         description: Admin user created successfully
 *       400:
 *         description: Validation error or email already exists
 */
router.post(
  "/admin-users",
  authMiddleware(ADMIN_ONLY),
  allowOnlyFields(allowedAdminUserFields),
  createAdminUserValidation,
  createAdminUser,
);

/**
 * @swagger
 * /admin-users:
 *   get:
 *     summary: List all active admin users
 *     tags: [Admin Users]
 *     responses:
 *       200:
 *         description: List of admin users
 */
router.get("/admin-users", authMiddleware(ADMIN_ONLY), listAllAdminUsers);

/**
 * @swagger
 * /admin-users/search:
 *   post:
 *     summary: List admin users with pagination, sorting and search
 *     tags: [Admin Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchParams'
 *     responses:
 *       200:
 *         description: Paginated admin users
 */
router.post(
  "/admin-users/search",
  authMiddleware(ADMIN_ONLY),
  allowOnlyFields(allowedSearchFields),
  searchValidation,
  listAdminUsersByParams,
);

/**
 * @swagger
 * /admin-users/{adminUserId}:
 *   get:
 *     summary: Get an admin user by id
 *     tags: [Admin Users]
 *     parameters:
 *       - in: path
 *         name: adminUserId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Admin user details
 *       404:
 *         description: Admin user not found
 */
router.get(
  "/admin-users/:adminUserId",
  authMiddleware(ADMIN_ONLY),
  getAdminUserById,
);

/**
 * @swagger
 * /admin-users/{adminUserId}:
 *   put:
 *     summary: Update an admin user
 *     tags: [Admin Users]
 *     parameters:
 *       - in: path
 *         name: adminUserId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Admin user updated successfully
 *       404:
 *         description: Admin user not found
 */
router.put(
  "/admin-users/:adminUserId",
  authMiddleware(ADMIN_ONLY),
  updateAdminUser,
);

/**
 * @swagger
 * /admin-users/{adminUserId}:
 *   delete:
 *     summary: Delete an admin user
 *     tags: [Admin Users]
 *     parameters:
 *       - in: path
 *         name: adminUserId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Admin user deleted successfully
 *       400:
 *         description: Cannot delete the last active admin user
 *       404:
 *         description: Admin user not found
 */
router.delete(
  "/admin-users/:adminUserId",
  authMiddleware(ADMIN_ONLY),
  deleteAdminUser,
);

/**
 * @swagger
 * /admin-users/{adminUserId}/reset-password:
 *   post:
 *     summary: Reset an admin user's password
 *     tags: [Admin Users]
 *     parameters:
 *       - in: path
 *         name: adminUserId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       404:
 *         description: Admin user not found
 */
router.post(
  "/admin-users/:adminUserId/reset-password",
  authMiddleware(ADMIN_ONLY),
  resetAdminUserPassword,
);

export default router;
