import { createContext, useEffect, useState, useContext, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ROLES } from "@demo-panel/shared/roles";
import { permissions, pickPermissions } from "@demo-panel/shared/permissions";
import { getCurrentUser } from "../api/auth.api";
import { fetchMenusByGroups } from "../api/menus.api";
import { getUserRolesByRoleId } from "../api/userRoles.api";
import { AuthContext } from "./AuthContext";

const MenuContext = createContext();

const filterMenuItems = (menuItems, roles) =>
    (menuItems ?? []).flatMap((menu) => {
        const children = filterMenuItems(menu.children, roles);
        const canRead = roles.some((role) => role.menuId === menu.id && role.read);
        return canRead || children.length ? [{ ...menu, ...(menu.children && { children }) }] : [];
    });

const filterMenusByPermission = (menuGroups, roles) =>
    (menuGroups ?? []).flatMap((group) => {
        if (group.isLink) return roles.some((role) => role.menuGroupId === group.groupId && role.read) ? [group] : [];
        const menus = filterMenuItems(group.menus, roles);
        return menus.length ? [{ ...group, menus }] : [];
    });

const MenuProvider = ({ children }) => {
    const { pathname } = useLocation();
    const queryClient = useQueryClient();
    const { role: authRole, isSessionVerified } = useContext(AuthContext);
    const [currentPagePermissions, setCurrentPagePermissions] = useState({ menuId: null, ...permissions() });

    const currentUserQuery = useQuery({
        queryKey: ["current-user"], queryFn: getCurrentUser,
        enabled: isSessionVerified && Boolean(authRole),
    });
    const user = currentUserQuery.data?.data?.data;
    const isAdmin = user?.role === ROLES.ADMIN;
    const userRoleId = user?.roleId?._id || user?.roleId || null;
    const menusQuery = useQuery({
        queryKey: ["menus", "tree"], queryFn: fetchMenusByGroups,
        enabled: isSessionVerified && Boolean(authRole),
    });
    const userRolesQuery = useQuery({
        queryKey: ["user-roles", userRoleId], queryFn: () => getUserRolesByRoleId(userRoleId),
        enabled: Boolean(userRoleId) && !isAdmin,
    });
    const userRoles = userRolesQuery.data?.data?.data?.[0] ?? null;
    const rawMenus = menusQuery.data?.data?.data ?? [];
    const menuData = useMemo(
        () => (isAdmin ? rawMenus : filterMenusByPermission(rawMenus, userRoles?.roles ?? [])),
        [isAdmin, rawMenus, userRoles],
    );
    const loading = currentUserQuery.isLoading || menusQuery.isLoading || (!isAdmin && userRolesQuery.isLoading);
    const error = currentUserQuery.error || menusQuery.error || userRolesQuery.error;

    const fetchMenus = () => queryClient.invalidateQueries({ queryKey: ["menus", "tree"] });
    const invalidateMenuCache = () => {
        queryClient.removeQueries({ queryKey: ["menus", "tree"] });
        queryClient.removeQueries({ queryKey: ["user-roles"] });
    };
    const getPermissionsForMenu = (menuId) => {
        if (isAdmin) return { menuId, ...permissions(true) };
        const role = menuId && userRoles?.roles?.find((entry) => entry.menuId === menuId);
        return role ? { menuId, ...pickPermissions(role) } : { menuId, ...permissions() };
    };
    const updateCurrentPagePermissions = (menuId) => setCurrentPagePermissions(getPermissionsForMenu(menuId));
    const findMenuIdByUrl = (url) => {
        if (!url) return null;
        const cleanUrl = url.split("?")[0].replace(/\/+$/, "");
        const direct = menuData.find((group) => group.isLink && (group.url === cleanUrl || cleanUrl.endsWith(group.url)));
        if (direct) return direct.groupId;
        let found = null;
        const search = (menus) => (menus ?? []).some((menu) => {
            if (menu.url && (menu.url === cleanUrl || cleanUrl.endsWith(menu.url))) { found = menu.id; return true; }
            return search(menu.children);
        });
        menuData.some((group) => search(group.menus));
        return found;
    };
    const findMenuIdForPath = (routePath) => {
        const segments = routePath.split("/").filter(Boolean);
        for (let i = segments.length; i > 0; i--) {
            const menuId = findMenuIdByUrl(`/${segments.slice(0, i).join("/")}`);
            if (menuId) return menuId;
        }
        return null;
    };

    useEffect(() => {
        if (loading || !menuData.length) return;
        const menuId = findMenuIdForPath(pathname);
        if (menuId) updateCurrentPagePermissions(menuId);
    }, [pathname, loading, menuData, userRoles, isAdmin]);

    return <MenuContext.Provider value={{ menuData, loading, error: error?.message ?? null, fetchMenus, isAdmin, userRoles, invalidateMenuCache, currentPagePermissions, updateCurrentPagePermissions, getPermissionsForMenu, findMenuIdByUrl, findMenuIdForPath }}>{children}</MenuContext.Provider>;
};

export { MenuContext, MenuProvider };
