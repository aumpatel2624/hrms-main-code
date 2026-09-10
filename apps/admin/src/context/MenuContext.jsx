import { createContext, useEffect, useState, useContext } from "react";
import { useLocation } from "react-router-dom";
import { ROLES } from "@demo-panel/shared/roles";
import { permissions, pickPermissions } from "@demo-panel/shared/permissions";
import { getCurrentUser } from "../api/auth.api";
import { getMenusByGroups } from "../api/menus.api";
import { getUserRolesByRoleId } from "../api/userRoles.api";
import { AuthContext } from "./AuthContext";

const MenuContext = createContext();

// Cache duration in milliseconds (30 minutes)
const CACHE_DURATION = 30 * 60 * 1000;

const MenuProvider = ({ children }) => {
    const { pathname } = useLocation();
    const [menuData, setMenuData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [userRoleId, setUserRoleId] = useState(null);
    const [isStatusFetched, setIsStatusFetched] = useState(false);
    const [userRoles, setUserRoles] = useState(null);
    const [currentPagePermissions, setCurrentPagePermissions] = useState({
        menuId: null,
        ...permissions(),
    });

    // Local cache to store menu data
    // Using useRef pattern with useState to persist between renders
    const [menuCache, setMenuCache] = useState({
        adminMenus: null,
        roleMenus: {},
        timestamp: null
    });

    // Get auth state from AuthContext
    const { role: authRole, isSessionVerified } = useContext(AuthContext);

    // Check if the current user is an admin
    const checkUserRole = async () => {
        setIsStatusFetched(false);
        try {
            // Use authRole from AuthContext
            if (!authRole) {
                return false;
            }

            const response = await getCurrentUser();

            if (response.data.isOk) {
                const userData = response.data.data;
                console.log("User data:", userData);
                setIsStatusFetched(true);
                // Set admin status, account ID and role ID
                setIsAdmin(userData.role === ROLES.ADMIN);
                setUserRoleId(userData.roleId?._id || userData.roleId);
                return userData.role === ROLES.ADMIN;
            }

            return false;
        } catch (error) {
            console.error("Error checking user role:", error);
            return false;
        }
    };

    // Fetch the permission set attached to a role
    const fetchUserRoles = async (roleId) => {
        try {
            if (!roleId) return null;

            const response = await getUserRolesByRoleId(roleId);

            if (response.data.isOk) {
                setUserRoles(response.data.data[0]);
                return response.data.data[0];
            }

            return null;
        } catch (error) {
            console.error("Error fetching user roles:", error);
            return null;
        }
    };

    // Helper to check if cache is valid
    const isCacheValid = () => {
        if (!menuCache.timestamp) return false;

        const now = Date.now();
        return (now - menuCache.timestamp) < CACHE_DURATION;
    };

    // Invalidate the menu cache (call this when roles are updated)
    const invalidateMenuCache = () => {
        setMenuCache({
            adminMenus: null,
            roleMenus: {},
            timestamp: null
        });
    };

    const fetchMenus = async (forceRefresh = false) => {
        try {
            // Use authRole from AuthContext
            if (!authRole) {
                setError("No authentication found");
                setLoading(false);
                return;
            }

            setLoading(true);

            // First check if user is admin
            const adminStatus = await checkUserRole();

            console.log("Admin status:", adminStatus);

            // Check if we have valid cached data
            if (!forceRefresh && isCacheValid()) {
                if (adminStatus && menuCache.adminMenus) {
                    console.log("Using cached admin menus");
                    setMenuData(menuCache.adminMenus);
                    setLoading(false);
                    return;
                } else if (!adminStatus && userRoleId && menuCache.roleMenus[userRoleId]) {
                    console.log(`Using cached menus for role ${userRoleId}`);
                    setMenuData(menuCache.roleMenus[userRoleId]);
                    setLoading(false);
                    return;
                }
            }

            // Get all menus
            const response = await getMenusByGroups();

            if (response.data.isOk) {
                let menuGroups = response.data.data;

                const now = Date.now();

                // If admin, store all menus
                if (adminStatus) {
                    console.log("Admin menus", menuGroups);
                    setMenuData(menuGroups);
                    setMenuCache(prev => ({
                        ...prev,
                        adminMenus: menuGroups,
                        timestamp: now
                    }));
                }
                // If not admin, filter menus based on the role's permissions
                else if (userRoleId) {
                    const roles = await fetchUserRoles(userRoleId);

                    if (roles && roles.roles) {
                        // Filter menu groups and their menus based on permissions
                        menuGroups = filterMenusByPermission(menuGroups, roles.roles);

                        // Cache the filtered menus for this role
                        setMenuData(menuGroups);
                        setMenuCache(prev => ({
                            ...prev,
                            roleMenus: {
                                ...prev.roleMenus,
                                [userRoleId]: menuGroups
                            },
                            timestamp: now
                        }));
                    }
                }

            } else {
                setError(response?.data?.message || "Failed to get menu data");
            }
        } catch (error) {
            console.error("Error fetching menus:", error);
            setError(error.message || "Failed to fetch menus");
        } finally {
            setLoading(false);
        }
    };

    // Helper function to filter menus based on user permissions
    const filterMenusByPermission = (menuGroups, roles) => {
        if (!Array.isArray(menuGroups) || !Array.isArray(roles)) {
            return [];
        }

        // Filter menu groups
        const filteredGroups = menuGroups.filter(group => {
            // Check if this is a direct link group
            if (group.isLink) {
                // Keep this group only if the user has read permission for it
                return roles.some(role =>
                    role.menuGroupId === group.groupId && role.read
                );
            }

            // For groups with menus, filter their child menus
            const filteredMenus = filterMenuItems(group.menus || [], roles);

            // If group has any visible menus, keep it
            if (filteredMenus.length > 0) {
                group.menus = filteredMenus;
                return true;
            }

            return false;
        });

        return filteredGroups;
    };

    // Recursive helper function to filter menu items at any nesting level
    const filterMenuItems = (menuItems, roles) => {
        if (!Array.isArray(menuItems) || !Array.isArray(roles)) {
            return [];
        }

        return menuItems.filter(menu => {
            // Check if user has read permission for this menu
            const hasReadPermission = roles.some(role =>
                role.menuId === menu.id && role.read
            );

            // If this item has children, recursively filter them
            if (menu.children && menu.children.length > 0) {
                menu.children = filterMenuItems(menu.children, roles);

                // If item has read permission or any visible children, keep it
                return hasReadPermission || menu.children.length > 0;
            }

            // For leaf nodes, only keep those with read permission
            return hasReadPermission;
        });
    };

    // Find permissions for a specific menu ID. Admins bypass role checks and
    // get everything; anyone else gets exactly what their role grants, or
    // nothing if the role has no entry for this menu.
    const getPermissionsForMenu = (menuId) => {
        if (isAdmin) {
            return { menuId, ...permissions(true) };
        }

        const menuPermission =
            menuId && userRoles?.roles?.find(role => role.menuId === menuId);

        return menuPermission
            ? { menuId, ...pickPermissions(menuPermission) }
            : { menuId, ...permissions() };
    };

    // Update the current page permissions based on menu ID
    const updateCurrentPagePermissions = (menuId) => {
        setCurrentPagePermissions(getPermissionsForMenu(menuId));
    };

    // Find menu ID by URL path
    const findMenuIdByUrl = (url) => {
        if (!url || !Array.isArray(menuData)) {
            return null;
        }

        // Remove trailing slash and query parameters
        const cleanUrl = url.split('?')[0].replace(/\/+$/, '');

        // Find menu with matching URL in all menu groups
        let foundMenuId = null;

        // First check direct link menu groups
        const directLinkGroup = menuData.find(group =>
            group.isLink && group.url && (group.url === cleanUrl || cleanUrl.endsWith(group.url))
        );

        if (directLinkGroup) {
            return directLinkGroup.groupId;
        }

        // Function to recursively search through menus
        const searchMenus = (menus) => {
            if (!Array.isArray(menus) || foundMenuId) return;

            for (const menu of menus) {
                if (menu.url && (menu.url === cleanUrl || cleanUrl.endsWith(menu.url))) {
                    foundMenuId = menu.id;
                    return;
                }

                // Check children menus
                if (menu.children && menu.children.length > 0) {
                    searchMenus(menu.children);
                }
            }
        };

        // Search through all menu groups
        for (const group of menuData) {
            if (group.menus && group.menus.length > 0) {
                searchMenus(group.menus);
                if (foundMenuId) break;
            }
        }

        return foundMenuId;
    };

    /**
     * Resolve permissions for a route.
     *
     * Detail routes like /country/add, /country/:id and /country/:id/edit have
     * no menu entry of their own, so walk up the path until a menu matches and
     * inherit that menu's permissions. Without this, deep links and the
     * add/edit routes fall back to all-false.
     */
    const findMenuIdForPath = (pathname) => {
        const segments = pathname.split("/").filter(Boolean);
        for (let i = segments.length; i > 0; i--) {
            const candidate = "/" + segments.slice(0, i).join("/");
            const menuId = findMenuIdByUrl(candidate);
            if (menuId) return menuId;
        }
        return null;
    };

    // Check user role when session is verified
    useEffect(() => {
        if (isSessionVerified && authRole) {
            checkUserRole();
        }
    }, [isSessionVerified, authRole]);

    // Refetch menus when role ID changes
    useEffect(() => {
        if (isSessionVerified && authRole && isStatusFetched) {
            fetchMenus();
        }
    }, [userRoleId, isSessionVerified, authRole]);

    // Re-resolve permissions on every navigation. This previously read
    // window.location once when menus loaded, so client-side navigation left
    // the previous page's permissions in place.
    useEffect(() => {
        if (loading || menuData.length === 0) return;
        const menuId = findMenuIdForPath(pathname);
        if (menuId) updateCurrentPagePermissions(menuId);
    }, [pathname, loading, menuData, userRoles, isAdmin]);

    return (
        <MenuContext.Provider value={{
            menuData,
            loading,
            error,
            fetchMenus,
            isAdmin,
            userRoles,
            invalidateMenuCache,
            currentPagePermissions,
            updateCurrentPagePermissions,
            getPermissionsForMenu,
            findMenuIdByUrl,
            findMenuIdForPath,
        }}>
            {children}
        </MenuContext.Provider>
    );
};

export { MenuContext, MenuProvider };