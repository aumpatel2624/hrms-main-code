import { OTP } from "@demo-panel/shared/auth";
import Otp from "../../models/Otp.js";
import Employee from "../../models/Employee.js";
import AdminUser from "../../models/AdminUser.js";
import bcrypt from "bcrypt";
import { sendTriggeredEmail } from "../../utils/sendTriggeredEmail.js";

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

    // Generate OTP
    const otp = String(Math.floor(Math.random() * 10 ** OTP.LENGTH)).padStart(
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

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpRecord = await Otp.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({
        isOk: false,
        message: "OTP not found or expired. Please request a new OTP.",
      });
    }

    // Check if OTP is expired (older than 10 minutes)
    const otpAge = Date.now() - otpRecord.createdAt.getTime();
    if (otpAge > OTP.TTL_MS) {
      // 10 minutes in milliseconds
      // Delete expired OTP
      await Otp.deleteOne({ email });

      return res.status(400).json({
        isOk: false,
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({
        isOk: false,
        message: "Invalid OTP",
      });
    }

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
    const otpRecord = await Otp.findOne({ email });

    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(400).json({
        isOk: false,
        message: "Invalid OTP",
      });
    }

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

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

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
