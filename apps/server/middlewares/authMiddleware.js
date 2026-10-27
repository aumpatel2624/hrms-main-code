/**
 * Authentication Middleware using Express Session
 * Uses in-memory session storage via express-session
 */
import { ROLES } from '@demo-panel/shared/roles';
import AdminUser from '../models/AdminUser.js';
import Employee, { NO_ACCESS_STATUSES } from '../models/Employee.js';

/**
 * The session's account as it stands now: one lookup by id per request, so
 * unticking Is Active, an employee leaving or being suspended, and a role or
 * department change all reach sessions that are already open, not just the
 * next sign-in. Null when the account is gone.
 */
const currentAccount = (sessionUser) => (sessionUser.role === ROLES.ADMIN
  ? AdminUser.findById(sessionUser.id, { isActive: 1 }).lean()
  : Employee.findById(sessionUser.id, { isActive: 1, status: 1, roleId: 1, departmentId: 1 }).lean());

export const authMiddleware = (roles) => {
  return async (req, res, next) => {
    // Check if user has an active session
    if (!req.session || !req.session.user) {
      // Clear the session cookie since it's invalid
      res.clearCookie('sessionId');
      return res.status(401).json({
        success: false,
        error: "Not logged in",
        status: 401,
        message: "Not logged in",
      });
    }

    const sessionUser = req.session.user;

    // Check if session has required data
    if (!sessionUser.id || !sessionUser.role) {
      // Clear the session cookie since it's invalid
      res.clearCookie('sessionId');
      return res.status(401).json({
        success: false,
        message: "Session invalid or expired",
        error: "Session invalid or expired",
        status: 401,
      });
    }

    // Once per request: the global search replays other routes on a child of
    // this request, and those inherit the flag instead of looking again.
    if (!req.accountChecked) {
      let account;
      try {
        account = await currentAccount(sessionUser);
      } catch (error) {
        console.error('Error in authMiddleware:', error);
        return res.status(500).json({ success: false, message: "Internal server error", status: 500 });
      }
      if (!account || !account.isActive || NO_ACCESS_STATUSES.includes(account.status)) {
        req.session.destroy?.(() => {});
        res.clearCookie('sessionId');
        return res.status(401).json({
          success: false,
          message: "Your account is no longer active. Please contact HR.",
          error: "Account inactive",
          status: 401,
        });
      }
      // checkPermission and buildScopeFilter read these from the session.
      if (sessionUser.role !== ROLES.ADMIN) {
        sessionUser.roleId = String(account.roleId);
        sessionUser.departmentId = account.departmentId ? String(account.departmentId) : null;
      }
      req.accountChecked = true;
    }

    // Check if user role is allowed
    if (roles && roles.length > 0 && !roles.includes(sessionUser.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
        error: "You do not have permission to access this resource",
        status: 403,
      });
    }

    // Attach user data to request (compatible with existing code)
    req.user = {
      id: sessionUser.id,
      role: sessionUser.role,
      email: sessionUser.email,
      name: sessionUser.name,
    };

    next();
  };
};
