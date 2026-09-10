import bcrypt from "bcrypt";
import { ROLES } from "@demo-panel/shared/roles";
import AdminUser from "../../models/AdminUser.js";
import User from "../../models/User.js";
import LoginAttempt from "../../models/LoginAttempt.js";
import authService from "../../services/authService.js";

/**
 * Resolve a login email to either an admin user or a user.
 * Admin users are checked first.
 * @returns {{ account: Object, role: "ADMIN"|"USER" }|null}
 */
const findAccountByEmail = async (email) => {
  const admin = await AdminUser.findOne({ email, isActive: true });
  if (admin) return { account: admin, role: ROLES.ADMIN };

  const user = await User.findOne({ email, isActive: true })
    .populate("departmentId")
    .populate("roleId")
    .populate("countryId")
    .populate("stateId")
    .populate("cityId");
  if (user) return { account: user, role: ROLES.USER };

  return null;
};

/**
 * Single login endpoint for both admin users and users.
 * POST /auth/login
 */
export const login = async (req, res) => {
  try {
    const {
      email,
      password,
      locationConsent,
      ipConsent,
      clientLatitude,
      clientLongitude,
    } = req.body;

    const ipAddress =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      "unknown";

    const clientLocation = {
      latitude: clientLatitude || req.headers["x-client-latitude"] || null,
      longitude: clientLongitude || req.headers["x-client-longitude"] || null,
    };

    if (!locationConsent || !ipConsent) {
      return res.status(400).json({
        isOk: false,
        message:
          "Please accept both location and IP address tracking consent to continue",
        error: "Consent required",
        status: 400,
      });
    }

    const found = await findAccountByEmail(email);

    if (!found) {
      return res.status(404).json({
        isOk: false,
        message: "User not found",
        status: 404,
      });
    }

    const { account, role } = found;
    const userId = account._id;

    // Check lock BEFORE password verification
    if (await authService.isAccountLocked(userId, email)) {
      const status = await authService.getLoginAttemptStatus(userId, email);
      return res.status(423).json({
        isOk: false,
        message: "Account locked due to multiple failed login attempts",
        error: "Account locked",
        lockedUntil: status.lockUntil,
        remainingTimeMs: status.remainingTime,
        status: 423,
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, account.password);

    if (!isPasswordMatch) {
      const attempt = await authService.recordFailedAttempt(
        userId,
        email,
        ipAddress,
        clientLocation,
      );

      if (attempt.isLocked) {
        return res.status(423).json({
          isOk: false,
          message: "Account locked due to multiple failed login attempts",
          error: "Account locked",
          lockedUntil: attempt.lockUntil,
          remainingTimeMs: 24 * 60 * 60 * 1000,
          status: 423,
        });
      }

      return res.status(401).json({
        isOk: false,
        message: "Invalid email or password",
        error: "Invalid credentials",
        attemptsRemaining: attempt.attemptsRemaining,
        warning:
          attempt.attemptsRemaining <= 1
            ? "Warning: One more failed attempt will lock your account"
            : null,
        status: 401,
      });
    }

    await authService.recordSuccessfulLogin(
      userId,
      email,
      ipAddress,
      clientLocation,
    );

    req.session.user = {
      id: userId.toString(),
      role,
      email: account.email,
      name: account.adminName || account.userName,
    };

    // checkPermission and buildScopeFilter read these; admins bypass both.
    // roleId/departmentId are populated documents here, hence ._id.
    if (role === ROLES.USER) {
      req.session.user.roleId = String(account.roleId?._id ?? account.roleId);
      req.session.user.departmentId = account.departmentId
        ? String(account.departmentId._id ?? account.departmentId)
        : null;
    }

    const data = account.toObject();
    delete data.password;

    return res.status(200).json({
      isOk: true,
      message: "Login successful",
      data,
      role,
      status: 200,
    });
  } catch (error) {
    console.error("Error in login:", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

/**
 * Current logged-in account, resolved from the session.
 * GET /auth/me
 */
export const getCurrentUser = async (req, res) => {
  try {
    const { id, role } = req.user;

    const account =
      role === ROLES.ADMIN
        ? await AdminUser.findById(id).select("-password")
        : await User.findById(id)
            .select("-password")
            .populate("departmentId")
            .populate("roleId")
            .populate("countryId")
            .populate("stateId")
            .populate("cityId");

    if (!account) {
      return res.status(404).json({
        isOk: false,
        message: "User not found",
        status: 404,
      });
    }

    return res.status(200).json({
      isOk: true,
      data: { ...account.toObject(), role },
      role,
      status: 200,
    });
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    return res.status(500).json({
      isOk: false,
      message: error.message,
      status: 500,
    });
  }
};

/**
 * GET /auth/verify-session
 * authMiddleware has already validated the session by the time we get here.
 */
export const verifySession = async (req, res) => {
  return res.status(200).json({
    isOk: true,
    data: { role: req.user.role },
  });
};

/**
 * POST /auth/logout
 */
export const logout = async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).json({
        isOk: false,
        message: "Logout failed",
        status: 500,
      });
    }

    res.clearCookie("sessionId");
    return res.status(200).json({
      isOk: true,
      message: "Logged out successfully",
      status: 200,
    });
  });
};

/**
 * GET /auth/login-status/:userId
 */
export const getLoginStatus = async (req, res) => {
  try {
    const status = await authService.getLoginAttemptStatus(req.params.userId);
    return res.status(200).json({ isOk: true, data: status, status: 200 });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, message: error.message, status: 500 });
  }
};

/**
 * POST /auth/login-status-by-email
 */
export const getLoginStatusByEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        isOk: false,
        message: "Email is required",
        status: 400,
      });
    }
    const status = await authService.getLoginAttemptStatus(null, email);
    return res.status(200).json({ isOk: true, data: status, status: 200 });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, message: error.message, status: 500 });
  }
};

// ============ ADMIN-ONLY ACCOUNT MANAGEMENT ============

/**
 * POST /admin/auth/reset-attempts
 */
export const resetLoginAttempts = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res
        .status(400)
        .json({ isOk: false, message: "userId is required", status: 400 });
    }

    await authService.resetLoginAttempts(userId);
    const status = await authService.getLoginAttemptStatus(userId);

    return res.status(200).json({
      isOk: true,
      message: "Login attempts reset successfully",
      data: status,
      status: 200,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, message: error.message, status: 500 });
  }
};

/**
 * POST /admin/auth/unlock
 */
export const unlockAccount = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res
        .status(400)
        .json({ isOk: false, message: "userId is required", status: 400 });
    }

    await authService.unlockAccount(userId);
    const status = await authService.getLoginAttemptStatus(userId);

    return res.status(200).json({
      isOk: true,
      message: "Account unlocked successfully",
      data: status,
      status: 200,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ isOk: false, message: error.message, status: 500 });
  }
};

/**
 * Flip isActive on whichever collection owns this id.
 * @returns {{ userType: string }|null}
 */
const setAccountActive = async (userId, isActive) => {
  const user = await User.findByIdAndUpdate(userId, { isActive });
  if (user) return { userType: "User" };

  const admin = await AdminUser.findByIdAndUpdate(userId, { isActive });
  if (admin) return { userType: "Admin user" };

  return null;
};

/**
 * POST /admin/auth/block
 */
export const blockUser = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res
        .status(400)
        .json({ isOk: false, message: "userId is required", status: 400 });
    }

    const result = await setAccountActive(userId, false);
    if (!result) {
      return res
        .status(404)
        .json({ isOk: false, message: "User not found", status: 404 });
    }

    return res.status(200).json({
      isOk: true,
      message: `${result.userType} account blocked successfully`,
      status: 200,
    });
  } catch (error) {
    console.error("Error blocking account:", error);
    return res
      .status(500)
      .json({ isOk: false, message: error.message, status: 500 });
  }
};

/**
 * POST /admin/auth/unblock
 */
export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res
        .status(400)
        .json({ isOk: false, message: "userId is required", status: 400 });
    }

    const result = await setAccountActive(userId, true);
    if (!result) {
      return res
        .status(404)
        .json({ isOk: false, message: "User not found", status: 404 });
    }

    return res.status(200).json({
      isOk: true,
      message: `${result.userType} account unblocked successfully`,
      status: 200,
    });
  } catch (error) {
    console.error("Error unblocking account:", error);
    return res
      .status(500)
      .json({ isOk: false, message: error.message, status: 500 });
  }
};

/**
 * POST /admin/auth/login-attempts
 * Paginated login attempt log, with the owning account's name resolved.
 */
export const listLoginAttempts = async (req, res) => {
  try {
    const { skip = 0, per_page = 10, match, sorton, sortdir } = req.body;

    let matchQuery = {};
    if (match) {
      matchQuery = {
        $or: [
          { userEmail: { $regex: match, $options: "i" } },
          { ipAddress: { $regex: match, $options: "i" } },
          { "locationCoordinates.city": { $regex: match, $options: "i" } },
          { "locationCoordinates.country": { $regex: match, $options: "i" } },
        ],
      };
    }

    const sortQuery =
      sorton && sortdir
        ? { [sorton]: sortdir === "desc" ? -1 : 1 }
        : { lastLoginAttempt: -1 };

    const totalCount = await LoginAttempt.countDocuments(matchQuery);

    const attempts = await LoginAttempt.find(matchQuery)
      .sort(sortQuery)
      .skip(skip)
      .limit(per_page)
      .lean();

    const formattedAttempts = await Promise.all(
      attempts.map(async (attempt) => {
        let userName = "Unknown";
        let isActive = true;

        if (attempt.userId) {
          const user = await User.findById(attempt.userId)
            .select("userName isActive")
            .lean();

          if (user) {
            userName = user.userName || "Unknown";
            isActive = user.isActive;
          } else {
            const admin = await AdminUser.findById(attempt.userId)
              .select("adminName email isActive")
              .lean();
            if (admin) {
              userName = admin.adminName || admin.email || "Admin";
              isActive = admin.isActive;
            }
          }
        }

        return {
          _id: attempt._id,
          userId: attempt.userId,
          userName,
          userEmail: attempt.userEmail,
          attemptCount: attempt.attemptCount,
          isLocked: attempt.isLocked,
          lockUntil: attempt.lockUntil,
          lastLoginAttempt: attempt.lastLoginAttempt,
          lastLoggedIn: attempt.lastLoggedIn,
          ipAddress: attempt.ipAddress,
          city: attempt.locationCoordinates?.city || "-",
          country: attempt.locationCoordinates?.country || "-",
          latitude: attempt.locationCoordinates?.latitude || null,
          longitude: attempt.locationCoordinates?.longitude || null,
          isActive,
          createdAt: attempt.createdAt,
          updatedAt: attempt.updatedAt,
        };
      }),
    );

    return res.status(200).json({
      isOk: true,
      data: [{ count: totalCount, data: formattedAttempts }],
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching login attempts:", error);
    return res
      .status(500)
      .json({ isOk: false, message: error.message, status: 500 });
  }
};
