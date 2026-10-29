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
  changePassword,
} from "../../controllers/v1/auth.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { ANY_ROLE, ADMIN_ONLY } from "@demo-panel/shared/roles";
import {
  loginValidation,
  changePasswordValidation,
  allowOnlyFields,
  allowedLoginFields,
  allowedChangePasswordFields,
} from "../../middlewares/inputValidator.js";
import { loginLimiter, passwordChangeLimiter } from "../../utils/authThrottle.js";

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
 *         description: Invalid credentials (unknown email or wrong password alike)
 *       423:
 *         description: Account locked
 *       429:
 *         description: Too many failed sign-ins from this address (ADR-067)
 */
router.post(
  "/auth/login",
  allowOnlyFields(allowedLoginFields),
  loginValidation,
  loginLimiter,
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
 * /auth/change-password:
 *   post:
 *     summary: Change the signed-in person's own password
 *     description: >
 *       Needs the current password; the new one must follow the password
 *       rule. Ends every other session of the account (ADR-067).
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed
 *       400:
 *         description: Current password wrong, or the new one breaks the rule
 *       429:
 *         description: Too many wrong current passwords
 */
router.post(
  "/auth/change-password",
  authMiddleware(ANY_ROLE),
  allowOnlyFields(allowedChangePasswordFields),
  changePasswordValidation,
  passwordChangeLimiter,
  changePassword,
);

/**
 * @swagger
 * /auth/login-status/{userId}:
 *   get:
 *     summary: Admin - get login attempt status for an account
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
  authMiddleware(ADMIN_ONLY),
  getLoginStatus,
);

/**
 * @swagger
 * /auth/login-status-by-email:
 *   post:
 *     summary: Admin - get login attempt status by email
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
router.post("/auth/login-status-by-email", authMiddleware(ADMIN_ONLY), getLoginStatusByEmail);

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
