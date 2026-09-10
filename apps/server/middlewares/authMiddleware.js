/**
 * Authentication Middleware using Express Session
 * Uses in-memory session storage via express-session
 */

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

