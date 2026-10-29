import express from "express";
import {
  createOtp,
  verifyOtp,
  resetPassword,
} from "../../controllers/v1/otp.controller.js";
import {
  emailValidator,
  handleValidationErrors,
  otpValidation,
  passwordResetValidation,
} from "../../middlewares/inputValidator.js";
import { otpCheckLimiter, otpSendLimiter } from "../../utils/authThrottle.js";

const router = express.Router();

/**
 * @swagger
 * /otp/send:
 *   post:
 *     summary: Send OTP to email for password reset
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: The same reply for every email, whether or not it has an account (a real account gets the code unless it is inside the resend cooldown)
 *       429:
 *         description: Too many code requests for this email or from this address (ADR-067)
 *       500:
 *         description: Server error
 */
router.post("/send", emailValidator, handleValidationErrors, otpSendLimiter, createOtp);

/**
 * @swagger
 * /otp/verify:
 *   post:
 *     summary: Verify OTP
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP, or the code's wrong tries are used up
 *       429:
 *         description: Too many wrong codes for this email or from this address (ADR-067)
 *       500:
 *         description: Server error
 */
router.post("/verify", otpValidation, otpCheckLimiter, verifyOtp);

/**
 * @swagger
 * /otp/reset-password:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid OTP or user not found
 *       429:
 *         description: Too many wrong codes for this email or from this address (ADR-067)
 *       500:
 *         description: Server error
 */
router.post("/reset-password", passwordResetValidation, otpCheckLimiter, resetPassword);

export default router;
