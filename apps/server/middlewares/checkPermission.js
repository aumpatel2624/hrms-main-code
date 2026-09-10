import { ROLES } from "@demo-panel/shared/roles";
import { PERMISSION_KEYS } from "@demo-panel/shared/permissions";
import { SCOPES } from "@demo-panel/shared/scopes";
import UserRoles from "../models/UserRoles.js";
import MenuMaster from "../models/MenuMaster.js";
import User from "../models/User.js";

/**
 * Server-side enforcement of the UserRoles permission matrix (ADR-002).
 *
 * Chain after authMiddleware on every matrix-governed route:
 *
 *   router.post("/departments",
 *     authMiddleware(ANY_ROLE),
 *     checkPermission("/department", "write"),
 *     createDepartment);
 *
 * `menuUrl` is the seeded MenuMaster.menuUrl for the screen the route belongs
 * to, and `action` one of the matrix flags. Declared explicitly per route —
 * inferring from path and method lies (`POST /search` is a read).
 *
 * ADMIN bypasses, matching the menu UI. A USER whose role has no matrix row
 * for the menu — or whose menuUrl has no MenuMaster row at all — is denied,
 * the same fail-closed default MenuContext applies when hiding screens.
 *
 * Both lookups are cached in-memory for TTL_MS so the hot path costs no
 * queries; the userRoles and menu controllers invalidate on write. Fine for
 * the single-process deployment this starter ships; a multi-process deploy
 * accepts up to TTL_MS of staleness after a matrix edit.
 */

const TTL_MS = 60 * 1000;

/** roleId -> { at, doc } — doc is the lean UserRoles document, or null. */
const roleCache = new Map();
/** menuUrl -> menuId, rebuilt whole (the menu tree is ~20 rows). */
let menuCache = { at: 0, byUrl: null };

export const invalidateRoleCache = (roleId) => {
  if (roleId) roleCache.delete(String(roleId));
  else roleCache.clear();
};

export const invalidateMenuCache = () => {
  menuCache = { at: 0, byUrl: null };
};

const getMenuIdByUrl = async (menuUrl) => {
  if (!menuCache.byUrl || Date.now() - menuCache.at > TTL_MS) {
    const menus = await MenuMaster.find({}, { menuUrl: 1 }).lean();
    menuCache = {
      at: Date.now(),
      byUrl: new Map(menus.map((menu) => [menu.menuUrl, String(menu._id)])),
    };
  }
  return menuCache.byUrl.get(menuUrl) || null;
};

const getRoleDoc = async (roleId) => {
  const key = String(roleId);
  const hit = roleCache.get(key);
  if (hit && Date.now() - hit.at <= TTL_MS) return hit.doc;

  const doc = await UserRoles.findOne({ roleId, isActive: true }).lean();
  roleCache.set(key, { at: Date.now(), doc });
  return doc;
};

/**
 * Ensure req.user carries roleId, departmentId and dataScope for a USER.
 * Shared by checkPermission and the endpoints that scope without a matrix
 * gate (the dashboard run path). For ADMIN it sets dataScope "all".
 * Returns false when the session's user no longer exists.
 */
export const resolveUserScope = async (req) => {
  if (req.user.role === ROLES.ADMIN) {
    req.user.dataScope = SCOPES.ALL;
    return true;
  }

  // Sessions created before ADR-002 carry no roleId — resolve once from
  // the database and write it back into the session.
  if (!req.session.user.roleId) {
    const dbUser = await User.findById(req.user.id, {
      roleId: 1,
      departmentId: 1,
    }).lean();
    if (!dbUser) return false;
    req.session.user.roleId = String(dbUser.roleId);
    req.session.user.departmentId = dbUser.departmentId
      ? String(dbUser.departmentId)
      : null;
  }
  req.user.roleId = req.session.user.roleId;
  req.user.departmentId = req.session.user.departmentId;

  const roleDoc = await getRoleDoc(req.user.roleId);
  req.user.dataScope = roleDoc?.dataScope || SCOPES.ALL;
  return true;
};

export const checkPermission = (menuUrl, action) => {
  // Wrong action name is a coding error — fail on boot, not per request.
  if (!PERMISSION_KEYS.includes(action)) {
    throw new Error(`checkPermission: unknown action "${action}" for ${menuUrl}`);
  }

  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          isOk: false,
          status: 401,
          message: "Not logged in",
        });
      }

      if (req.user.role === ROLES.ADMIN) return next();

      if (!(await resolveUserScope(req))) {
        res.clearCookie("sessionId");
        return res.status(401).json({
          isOk: false,
          status: 401,
          message: "Session invalid or expired",
        });
      }

      const [roleDoc, menuId] = await Promise.all([
        getRoleDoc(req.user.roleId),
        getMenuIdByUrl(menuUrl),
      ]);

      const row =
        menuId &&
        roleDoc?.roles?.find((role) => String(role.menuId) === menuId);

      if (!row || row[action] !== true) {
        return res.status(403).json({
          isOk: false,
          status: 403,
          message: "You do not have permission to perform this action",
        });
      }

      // Downstream scope filters read this — see utils/scope.js.
      req.user.dataScope = roleDoc.dataScope || SCOPES.ALL;
      return next();
    } catch (error) {
      console.error("Error in checkPermission:", error);
      return res.status(500).json({
        isOk: false,
        status: 500,
        message: "Internal server error",
      });
    }
  };
};
