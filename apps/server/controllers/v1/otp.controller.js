import crypto from "node:crypto";
import { OTP } from "@demo-panel/shared/auth";
import Otp from "../../models/Otp.js";
import Employee from "../../models/Employee.js";
import AdminUser from "../../models/AdminUser.js";
import { sendTriggeredEmail } from "../../utils/sendTriggeredEmail.js";
import { setPassword } from "../../utils/passwords.js";

// One reply for every email (re-check N1): an unknown address, a real one, a
// real one still inside the resend cooldown and a real one whose email failed
// to send all answer alike, so the form cannot be used to find out who has an
// account. Why a real account's code did not go out is only logged.
const OTP_REQUESTED = {
  isOk: true,
  message: "If an account exists for this email, a code has been sent to it",
};

export const createOtp = async (req, res) => {
  try {
    const { email } = req.body;

    let user = await AdminUser.findOne({ email });

    if (!user) {
      user = await Employee.findOne({ email });
    }

    if (!user) {
      return res.status(200).json(OTP_REQUESTED);
    }

    // Check if an OTP was recently sent (within the last minute)
    const existingOtp = await Otp.findOne({ email });
    if (existingOtp) {
      const timeDiff = Date.now() - existingOtp.createdAt.getTime();

      if (timeDiff < OTP.RESEND_COOLDOWN_MS) {
        return res.status(200).json(OTP_REQUESTED);
      }

      // Delete the previous OTP if it exists and cooldown has passed
      await Otp.deleteOne({ email });
    }

    // Generate OTP — from the cryptographic generator, never Math.random,
    // whose output can be predicted from earlier output.
    const otp = String(crypto.randomInt(10 ** OTP.LENGTH)).padStart(
      OTP.LENGTH,
      "0",
    );

    // Create new OTP
    await Otp.create({
      email,
      otp,
      createdAt: new Date(),
    });

    // Fire the forgot-password trigger (ADR-015) — see sendTriggeredEmail.js.
    // Not awaited, so a real account does not answer
    // noticeably slower than an unknown one while the mail goes out.
    const username = user.adminName || user.employeeName || "Admin";
    sendTriggeredEmail("password.forgot", {
      toEmail: email,
      mergeFields: { USERNAME: username, OTP_CODE: otp },
    }).then(({ sent, reason }) => {
      if (!sent) console.error(`createOtp: password.forgot email not sent (${reason})`);
    }).catch((error) => console.error("createOtp: password.forgot email failed", error));

    return res.status(200).json(OTP_REQUESTED);
  } catch (error) {
    console.error("Error in createOtp:", error);
    return res.status(500).json({
      isOk: false,
      message: "Failed to send OTP",
      error: error.message,
    });
  }
};

const NO_CODE = {
  isOk: false,
  message: "OTP not found or expired. Please request a new OTP.",
};
const WRONG_CODE = { isOk: false, message: "Invalid OTP" };
const CODE_USED_UP = {
  isOk: false,
  message: "Too many wrong codes. Please request a new OTP.",
};

/**
 * Check a code against the email's pending one (ADR-067). Every check claims
 * one of the code's tries in a single atomic update, so guesses sent together
 * cannot share a try; once OTP.MAX_WRONG_TRIES are wrong the code is deleted
 * and a new one must be requested. A right code gives its try back, so
 * verifying and then resetting with it costs nothing.
 * @returns {Object|null} the reply to refuse with, or null for a right code
 */
const checkCode = async (email, otp) => {
  const record = await Otp.findOneAndUpdate(
    { email, attempts: { $lt: OTP.MAX_WRONG_TRIES } },
    { $inc: { attempts: 1 } },
    { new: true },
  );
  if (!record || Date.now() - record.createdAt.getTime() > OTP.TTL_MS) {
    await Otp.deleteOne({ email });
    return NO_CODE;
  }
  if (record.otp === otp) {
    await Otp.updateOne({ _id: record._id }, { $inc: { attempts: -1 } });
    return null;
  }
  if (record.attempts >= OTP.MAX_WRONG_TRIES) {
    await Otp.deleteOne({ email });
    return CODE_USED_UP;
  }
  return WRONG_CODE;
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const refused = await checkCode(email, otp);
    if (refused) return res.status(400).json(refused);

    // OTP is valid
    return res.status(200).json({
      isOk: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("Error in verifyOtp:", error);
    return res.status(500).json({
      isOk: false,
      message: "Failed to verify OTP",
      error: error.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Verify OTP again for security
    const refused = await checkCode(email, otp);
    if (refused) return res.status(400).json(refused);

    // Admin users first, then users
    let user = await AdminUser.findOne({ email });

    if (!user) {
      user = await Employee.findOne({ email });
    }

    if (!user) {
      return res.status(400).json({
        isOk: false,
        message: "User not found",
      });
    }

    // Also ends every session signed in with the old password.
    await setPassword(user, newPassword);

    // Delete OTP after successful password reset
    await Otp.deleteOne({ email });

    // Fire the password-reset trigger (ADR-015). Best-effort: a missing
    // template shouldn't fail a reset that already succeeded, so the result
    // is only logged, not surfaced to the caller — unlike password.forgot,
    // where the email *is* the point of the request.
    const username = user.adminName || user.employeeName || "Admin";
    const { sent, reason } = await sendTriggeredEmail("password.reset", {
      toEmail: email,
      mergeFields: { USERNAME: username },
    });
    if (!sent) {
      console.error(`resetPassword: password.reset email not sent (${reason})`);
    }

    return res.status(200).json({
      isOk: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    return res.status(500).json({
      isOk: false,
      message: "Failed to reset password",
      error: error.message,
    });
  }
};
