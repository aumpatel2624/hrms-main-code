import express from "express";
import {
  login,
  logout,
  getCurrentUser,
  verifySession,
  getLoginStatus,
  getLoginStatusByEmail,
  resetLoginAttempts,
  unlockAccount,
  blockUser,
  unblockUser,
  listLoginAttempts,
} from "../../controllers/v1/auth.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { ANY_ROLE, ADMIN_ONLY } from "@demo-panel/shared/roles";
import {
  loginValidation,
  allowOnlyFields,
  allowedLoginFields,
} from "../../middlewares/inputValidator.js";

const router = express.Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in as an admin user or a user
 *     description: >
 *       Single login endpoint for both entities. Admin users are matched first,
 *       then users. Returns the role on success.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Consent missing or validation error
 *       401:
 *         description: Invalid credentials
 *       404:
 *         description: User not found
 *       423:
 *         description: Account locked
 */
router.post(
  "/auth/login",
  allowOnlyFields(allowedLoginFields),
  loginValidation,
  login,
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get the currently logged-in account
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Current account details
 *       401:
 *         description: Not logged in
 */
router.get("/auth/me", authMiddleware(ANY_ROLE), getCurrentUser);

/**
 * @swagger
 * /auth/verify-session:
 *   get:
 *     summary: Check whether the session cookie is still valid
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Session is valid, returns the role
 *       401:
 *         description: Session invalid or expired
 */
router.get("/auth/verify-session", authMiddleware(ANY_ROLE), verifySession);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Destroy the session
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/auth/logout", authMiddleware(ANY_ROLE), logout);

/**
 * @swagger
 * /auth/login-status/{userId}:
 *   get:
 *     summary: Get login attempt status for an account
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Login attempt status
 */
router.get(
  "/auth/login-status/:userId",
  authMiddleware(ANY_ROLE),
  getLoginStatus,
);

/**
 * @swagger
 * /auth/login-status-by-email:
 *   post:
 *     summary: Get login attempt status by email (used by the login form)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login attempt status
 */
router.post("/auth/login-status-by-email", getLoginStatusByEmail);

// ============ ADMIN-ONLY ACCOUNT MANAGEMENT ============

/**
 * @swagger
 * /admin/auth/login-attempts:
 *   post:
 *     summary: Admin - list login attempts with pagination
 *     tags: [Admin - Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SearchParams'
 *     responses:
 *       200:
 *         description: Paginated login attempts
 */
router.post(
  "/admin/auth/login-attempts",
  authMiddleware(ADMIN_ONLY),
  listLoginAttempts,
);

/**
 * @swagger
 * /admin/auth/reset-attempts:
 *   post:
 *     summary: Admin - reset failed login attempts for an account
 *     tags: [Admin - Auth]
 *     responses:
 *       200:
 *         description: Attempts reset successfully
 */
router.post(
  "/admin/auth/reset-attempts",
  authMiddleware(ADMIN_ONLY),
  resetLoginAttempts,
);

/**
 * @swagger
 * /admin/auth/unlock:
 *   post:
 *     summary: Admin - unlock a locked account
 *     tags: [Admin - Auth]
 *     responses:
 *       200:
 *         description: Account unlocked successfully
 */
router.post("/admin/auth/unlock", authMiddleware(ADMIN_ONLY), unlockAccount);

/**
 * @swagger
 * /admin/auth/block:
 *   post:
 *     summary: Admin - deactivate an account
 *     tags: [Admin - Auth]
 *     responses:
 *       200:
 *         description: Account blocked successfully
 */
router.post("/admin/auth/block", authMiddleware(ADMIN_ONLY), blockUser);

/**
 * @swagger
 * /admin/auth/unblock:
 *   post:
 *     summary: Admin - reactivate an account
 *     tags: [Admin - Auth]
 *     responses:
 *       200:
 *         description: Account unblocked successfully
 */
router.post("/admin/auth/unblock", authMiddleware(ADMIN_ONLY), unblockUser);

export default router;
