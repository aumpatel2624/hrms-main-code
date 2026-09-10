import { Fragment, useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, Check, File02, FolderCheck, Save01, User01, X as XClose } from "@untitledui/icons";
import { permissions, onlyPermission } from "@demo-panel/shared/permissions";
import { SCOPES } from "@demo-panel/shared/scopes";
import { MenuContext } from "../../context/MenuContext";
import { getAllRoles } from "../../api/roles.api";
import { getMenusByGroups } from "../../api/menus.api";
import { getUserRolesByRoleId, createUserRoles, updateUserRoles } from "../../api/userRoles.api";
import { Card, PageHeader } from "@/components/ui/page";
import { SelectField } from "@/components/ui/field";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { cx } from "@/utils/cx";

const PERMISSION_COLUMNS = ["read", "write", "delete", "edit", "print", "mail"];

/** Friendly labels for UserRoles.dataScope — enforced server-side (ADR-002). */
const SCOPE_OPTIONS = [
  { value: SCOPES.ALL, label: "All records" },
  { value: SCOPES.DEPARTMENT, label: "Own department" },
  { value: SCOPES.OWN, label: "Own records only" },
];

/**
 * One matrix row. Groups and menus share it - only the label differs.
 * Defined outside UserRoles so its identity is stable across renders -
 * redefining a component inline makes React remount the whole table on
 * every checkbox click, which drops focus and jumps the page to the top.
 */
const PermissionRow = ({ id, isGroup, name, depth = 0, isParent = false, hasPermission, hasAllForRow, hasAnyForRow, onPermissionChange, onToggleAll }) => {
    const all = hasAllForRow(id, isGroup);
    return (
        <tr
            className={cx(
                "border-b border-secondary last:border-b-0 hover:bg-secondary_hover",
                hasAnyForRow(id, isGroup) && "bg-success-primary/40",
            )}
        >
            <td className="max-w-0 px-4 py-2.5" style={{ paddingLeft: `${16 + depth * 24}px` }}>
                <div className="flex items-center gap-2">
                    {isGroup ? (
                        <FolderCheck className="size-4 shrink-0 text-brand-secondary" />
                    ) : isParent ? (
                        <FolderCheck className="size-4 shrink-0 text-fg-quaternary" />
                    ) : (
                        <File02 className="size-4 shrink-0 text-fg-quaternary" />
                    )}
                    <span className={cx("truncate text-sm text-primary", (isGroup || (depth === 0 && isParent)) && "font-semibold")}>{name}</span>
                    {all && (
                        <Badge color="success" size="sm">
                            All
                        </Badge>
                    )}
                    <Button
                        size="sm"
                        color="tertiary"
                        className="shrink-0"
                        iconLeading={all ? XClose : Check}
                        onClick={() => onToggleAll(id, isGroup, !all)}
                        aria-label={all ? "Revoke all permissions" : "Grant all permissions"}
                    />
                </div>
            </td>
            {PERMISSION_COLUMNS.map((permission) => (
                <td key={permission} className="w-20 px-3 py-2.5 text-center">
                    <div className="flex justify-center">
                        <Checkbox
                            aria-label={`${permission} permission for ${name}`}
                            isSelected={hasPermission(id, isGroup, permission)}
                            onChange={(checked) => onPermissionChange(id, isGroup, permission, checked)}
                        />
                    </div>
                </td>
            ))}
        </tr>
    );
};

const UserRoles = () => {
  // States
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [menuData, setMenuData] = useState([]);
  const [userRoles, setUserRoles] = useState(null);
  const [dataScope, setDataScope] = useState(SCOPES.ALL);
  const [rolesChanged, setRolesChanged] = useState(false);

  const {menuData: contextMenuData, loading: menuLoading} = useContext(MenuContext);

  // Fetch all roles and menu data
  useEffect(() => {
    fetchRoles();
    fetchAllMenuData();
  }, []);
  
  // Fetch the role's permissions when a role is selected
  useEffect(() => {
    if (selectedRole) {
      fetchUserRoles(selectedRole.value);
    } else {
      setUserRoles(null);
    }
  }, [selectedRole]);

  // API Calls
  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await getAllRoles();
      
      if (response.data.isOk) {
        // Format for react-select
        const formattedRoles = response.data.data.map(role => ({
          value: role._id,
          label: role.roleName,
        }));
        setRoles(formattedRoles);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  // Fetch all menu data using the same API as MenuContext
  const fetchAllMenuData = async () => {
    setLoading(true);
    try {
      console.log("Fetching menus from MenuContext API...");
      const response = await getMenusByGroups();

      if (response.data.isOk) {
        const menuGroupsData = response.data.data;
        console.log("Menu groups data:", menuGroupsData);
        
        if (Array.isArray(menuGroupsData)) {
          setMenuData(menuGroupsData);
        } else {
          console.error("Menu data is not an array");
          toast.error("Menu data is in an unexpected format");
        }
      } else {
        console.error("No data in API response or isOk is false");
        toast.error("Failed to load menu data");
        
        // If context data is available, use it as a fallback
        if (contextMenuData && contextMenuData.length > 0) {
          console.log("Using MenuContext data as fallback");
          setMenuData(contextMenuData);
        }
      }
    } catch (error) {
      console.error("Error fetching menu data:", error);
      toast.error("Failed to load menus and menu groups");
      
      // If context data is available, use it as a fallback
      if (contextMenuData && contextMenuData.length > 0) {
        console.log("Using MenuContext data as fallback");
        setMenuData(contextMenuData);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const fetchUserRoles = async (roleId) => {
    setLoading(true);
    try {
      const response = await getUserRolesByRoleId(roleId);

      if (response.data.data && response.data.data.length > 0) {
        console.log("User roles:", response.data.data[0]);
        setUserRoles(response.data.data[0]);
        setDataScope(response.data.data[0].dataScope || SCOPES.ALL);
      } else {
        // If no roles found, set to null
        setUserRoles(null);
        setDataScope(SCOPES.ALL);
        toast.info(response.message)
      }
    } catch (error) {
      if (error.response && error.response.status === 404) {
        // No roles assigned yet, that's fine
        setUserRoles(null);
      } else {
        toast.error("Failed to load user roles");
      }
    } finally {
      setLoading(false);
      setRolesChanged(false);
    }
  };
  
  // Collect every menu id (including nested children) under a menu group, so
  // checking a permission on the group row can cascade down to its submenus.
  const collectGroupMenuIds = (groupId) => {
    const group = menuData.find(g => g.groupId === groupId);
    if (!group || group.isLink || !group.menus) return [];

    const ids = [];
    const walk = (menus) => {
      menus.forEach(menu => {
        ids.push(menu.id);
        if (menu.children && menu.children.length > 0) {
          walk(menu.children);
        }
      });
    };
    walk(group.menus);
    return ids;
  };

  // Handle permission checkboxes
  const handlePermissionChange = (id, isGroup, permission, isChecked) => {
    setRolesChanged(true);

    const menuField = isGroup ? "menuGroupId" : "menuId";
    // Selecting a permission on a menu group cascades that same permission to
    // every menu under it, so submenus stay in sync with the group.
    const childMenuIds = isGroup ? collectGroupMenuIds(id) : [];

    if (!userRoles) {
      // Create new roles structure if none exists
      const newRoles = {
        roleId: selectedRole.value,
        roles: [
          {
            [menuField]: id,
            ...onlyPermission(permission, isChecked),
          },
          ...childMenuIds.map(menuId => ({
            menuId,
            ...onlyPermission(permission, isChecked),
          })),
        ]
      };
      setUserRoles(newRoles);
    } else {
      // Update existing roles
      const updatedRoles = { ...userRoles, roles: [...userRoles.roles] };

      const applyPermission = (targetId, targetIsGroup) => {
        const field = targetIsGroup ? "menuGroupId" : "menuId";
        const roleIndex = updatedRoles.roles.findIndex(r =>
          (targetIsGroup ? r.menuGroupId === targetId : r.menuId === targetId)
        );

        if (roleIndex === -1) {
          // Add new menu permission
          updatedRoles.roles.push({
            [field]: targetId,
            ...onlyPermission(permission, isChecked),
          });
        } else {
          // Update existing menu permission
          updatedRoles.roles[roleIndex] = {
            ...updatedRoles.roles[roleIndex],
            [permission]: isChecked,
          };
        }
      };

      applyPermission(id, isGroup);
      childMenuIds.forEach(menuId => applyPermission(menuId, false));

      setUserRoles(updatedRoles);
    }
  };
  
  // Handle all permissions for a menu
  const handleAllPermissions = (id, isGroup, isChecked) => {
    setRolesChanged(true);
    
    const menuField = isGroup ? "menuGroupId" : "menuId";
    
    if (!userRoles) {
      // Create new roles structure with all permissions
      const newRoles = {
        roleId: selectedRole.value,
        roles: [
          {
            [menuField]: id,
            ...permissions(isChecked),
          }
        ]
      };
      setUserRoles(newRoles);
    } else {
      // Update existing roles
      const updatedRoles = { ...userRoles };
      
      // Find existing role by menuId or menuGroupId
      const roleIndex = updatedRoles.roles.findIndex(r => 
        (isGroup ? r.menuGroupId === id : r.menuId === id)
      );
      
      if (roleIndex === -1) {
        // Add new menu permission with all permissions set
        updatedRoles.roles.push({
          [menuField]: id,
          ...permissions(isChecked),
        });
      } else {
        // Update all permissions
        Object.assign(updatedRoles.roles[roleIndex], permissions(isChecked));
      }
      
      setUserRoles(updatedRoles);
    }
  };

  // Handle column-wide permission changes
  const handleColumnPermissionChange = (permission, isChecked) => {
    setRolesChanged(true);
    
    if (!userRoles) {
      // Create new roles structure with all menus having the specified permission
      const allMenuIds = [];
      const allGroupIds = [];
      
      // Collect all menu IDs and group IDs
      menuData.forEach(group => {
        if (group.isLink) {
          allGroupIds.push(group.groupId);
        } else if (group.menus) {
          const collectMenuIds = (menus) => {
            menus.forEach(menu => {
              allMenuIds.push(menu.id);
              if (menu.children && menu.children.length > 0) {
                collectMenuIds(menu.children);
              }
            });
          };
          collectMenuIds(group.menus);
        }
      });
      
      const newRoles = {
        roleId: selectedRole.value,
        roles: [
          ...allMenuIds.map(menuId => ({
            menuId,
            ...onlyPermission(permission, isChecked),
          })),
          ...allGroupIds.map(groupId => ({
            menuGroupId: groupId,
            ...onlyPermission(permission, isChecked),
          }))
        ]
      };
      setUserRoles(newRoles);
    } else {
      // Update existing roles
      const updatedRoles = { ...userRoles };
      
      // Update all existing roles with the specified permission
      updatedRoles.roles.forEach(role => {
        role[permission] = isChecked;
      });
      
      // Add permissions for menus/groups that don't exist yet
      const existingMenuIds = new Set(updatedRoles.roles.map(r => r.menuId).filter(Boolean));
      const existingGroupIds = new Set(updatedRoles.roles.map(r => r.menuGroupId).filter(Boolean));
      
      menuData.forEach(group => {
        if (group.isLink && !existingGroupIds.has(group.groupId)) {
          updatedRoles.roles.push({
            menuGroupId: group.groupId,
            ...onlyPermission(permission, isChecked),
          });
        } else if (group.menus) {
          const addMissingMenus = (menus) => {
            menus.forEach(menu => {
              if (!existingMenuIds.has(menu.id)) {
                updatedRoles.roles.push({
                  menuId: menu.id,
                  ...onlyPermission(permission, isChecked),
                });
              }
              if (menu.children && menu.children.length > 0) {
                addMissingMenus(menu.children);
              }
            });
          };
          addMissingMenus(group.menus);
        }
      });
      
      setUserRoles(updatedRoles);
    }
  };

  // Handle all permissions for a group
  const handleAllGroupPermissions = (groupId, isChecked) => {
    setRolesChanged(true);
    
    if (!userRoles) {
      // Create new roles structure for this group
      const group = menuData.find(g => g.groupId === groupId);
      if (!group) return;
      
      const newRoles = {
        roleId: selectedRole.value,
        roles: []
      };
      
      if (group.isLink) {
        newRoles.roles.push({
          menuGroupId: groupId,
          ...permissions(isChecked),
        });
      } else if (group.menus) {
        // Keep the group's own entry in sync too, so its per-column
        // checkboxes match the "All" state this same action just set.
        newRoles.roles.push({
          menuGroupId: groupId,
          ...permissions(isChecked),
        });

        const addMenuPermissions = (menus) => {
          menus.forEach(menu => {
            newRoles.roles.push({
              menuId: menu.id,
              ...permissions(isChecked),
            });
            if (menu.children && menu.children.length > 0) {
              addMenuPermissions(menu.children);
            }
          });
        };
        addMenuPermissions(group.menus);
      }

      setUserRoles(newRoles);
    } else {
      // Update existing roles
      const updatedRoles = { ...userRoles };
      const group = menuData.find(g => g.groupId === groupId);
      if (!group) return;
      
      if (group.isLink) {
        // Update group permissions
        const roleIndex = updatedRoles.roles.findIndex(r => r.menuGroupId === groupId);
        if (roleIndex === -1) {
          updatedRoles.roles.push({
            menuGroupId: groupId,
            ...permissions(isChecked),
          });
        } else {
          Object.assign(updatedRoles.roles[roleIndex], permissions(isChecked));
        }
      } else if (group.menus) {
        // Keep the group's own entry in sync too, so its per-column
        // checkboxes match the "All" state this same action just set.
        const groupRoleIndex = updatedRoles.roles.findIndex(r => r.menuGroupId === groupId);
        if (groupRoleIndex === -1) {
          updatedRoles.roles.push({
            menuGroupId: groupId,
            ...permissions(isChecked),
          });
        } else {
          Object.assign(updatedRoles.roles[groupRoleIndex], permissions(isChecked));
        }

        // Update all menu permissions in this group
        const updateMenuPermissions = (menus) => {
          menus.forEach(menu => {
            const roleIndex = updatedRoles.roles.findIndex(r => r.menuId === menu.id);
            if (roleIndex === -1) {
              updatedRoles.roles.push({
                menuId: menu.id,
                ...permissions(isChecked),
              });
            } else {
              Object.assign(updatedRoles.roles[roleIndex], permissions(isChecked));
            }
            if (menu.children && menu.children.length > 0) {
              updateMenuPermissions(menu.children);
            }
          });
        };
        updateMenuPermissions(group.menus);
      }

      setUserRoles(updatedRoles);
    }
  };

  // Check if a menu has a particular permission
  const hasPermission = (id, isGroup, permission) => {
    if (!userRoles || !userRoles.roles) return false;
    
    const role = userRoles.roles.find(r => 
      isGroup ? r.menuGroupId === id : r.menuId === id
    );
    
    return role ? role[permission] : false;
  };
  
  // Check if all permissions are granted
  const hasAllPermissions = (id, isGroup) => {
    if (!userRoles || !userRoles.roles) return false;
    
    const role = userRoles.roles.find(r => 
      isGroup ? r.menuGroupId === id : r.menuId === id
    );
    
    if (!role) return false;
    
    return (
      role.read &&
      role.write &&
      role.delete &&
      role.edit &&
      role.print &&
      role.mail
    );
  };
  
  // Check if any permissions are granted
  const hasAnyPermissions = (id, isGroup) => {
    if (!userRoles || !userRoles.roles) return false;
    
    const role = userRoles.roles.find(r => 
      isGroup ? r.menuGroupId === id : r.menuId === id
    );
    
    if (!role) return false;
    
    return (
      role.read ||
      role.write ||
      role.delete ||
      role.edit ||
      role.print ||
      role.mail
    );
  };

  // Check if a column has all permissions
  const hasColumnAllPermissions = (permission) => {
    if (!userRoles || !userRoles.roles) return false;
    
    // Get all menu and group IDs from menuData
    const allIds = [];
    menuData.forEach(group => {
      if (group.isLink) {
        allIds.push({ id: group.groupId, isGroup: true });
      } else if (group.menus) {
        const collectIds = (menus) => {
          menus.forEach(menu => {
            allIds.push({ id: menu.id, isGroup: false });
            if (menu.children && menu.children.length > 0) {
              collectIds(menu.children);
            }
          });
        };
        collectIds(group.menus);
      }
    });
    
    // Check if all IDs have the specified permission
    return allIds.every(({ id, isGroup }) => {
      const role = userRoles.roles.find(r => 
        isGroup ? r.menuGroupId === id : r.menuId === id
      );
      return role && role[permission];
    });
  };

  // Check if a group has all permissions
  const hasGroupAllPermissions = (groupId) => {
    if (!userRoles || !userRoles.roles) return false;
    
    const group = menuData.find(g => g.groupId === groupId);
    if (!group) return false;
    
    if (group.isLink) {
      const role = userRoles.roles.find(r => r.menuGroupId === groupId);
      return role && role.read && role.write && role.delete && role.edit && role.print && role.mail;
    } else if (group.menus) {
      const checkAllMenus = (menus) => {
        return menus.every(menu => {
          const role = userRoles.roles.find(r => r.menuId === menu.id);
          const hasAll = role && role.read && role.write && role.delete && role.edit && role.print && role.mail;
          if (menu.children && menu.children.length > 0) {
            return hasAll && checkAllMenus(menu.children);
          }
          return hasAll;
        });
      };
      return checkAllMenus(group.menus);
    }
    
    return false;
  };

  // Check if a group has any permissions
  const hasGroupAnyPermissions = (groupId) => {
    if (!userRoles || !userRoles.roles) return false;
    
    const group = menuData.find(g => g.groupId === groupId);
    if (!group) return false;
    
    if (group.isLink) {
      const role = userRoles.roles.find(r => r.menuGroupId === groupId);
      return role && (role.read || role.write || role.delete || role.edit || role.print || role.mail);
    } else if (group.menus) {
      const checkAnyMenus = (menus) => {
        return menus.some(menu => {
          const role = userRoles.roles.find(r => r.menuId === menu.id);
          const hasAny = role && (role.read || role.write || role.delete || role.edit || role.print || role.mail);
          if (menu.children && menu.children.length > 0) {
            return hasAny || checkAnyMenus(menu.children);
          }
          return hasAny;
        });
      };
      return checkAnyMenus(group.menus);
    }
    
    return false;
  };
  
  // Save the role's permissions
  const saveUserRoles = async () => {
    // A scope-only change is savable before any checkbox is ticked, so
    // userRoles may still be null here — send an empty matrix with the scope.
    if (!selectedRole) return;

    setSaveLoading(true);
    try {
      if (userRoles?._id) {
        // Update existing roles
        await updateUserRoles(selectedRole.value, {
          roleId: selectedRole.value,
          roles: userRoles.roles,
          dataScope,
        });
        toast.success("User roles updated successfully");
      } else {
        // Create new roles
        await createUserRoles({
          roleId: selectedRole.value,
          roles: userRoles?.roles ?? [],
          dataScope,
        });
        toast.success("User roles created successfully");
      }
      
      // Refresh the role's permissions
      fetchUserRoles(selectedRole.value);
      // Update the roles list to reflect that this role now has permissions
      setRoles(roles.map(role => 
        role.value === selectedRole.value ? { ...role } : role
      ));
    } catch (error) {
      console.error("Error saving user roles:", error);
      toast.error("Failed to save user roles");
    } finally {
      setSaveLoading(false);
    }
  };
  // Grant/revoke-all toggle for a row - groups cascade to their submenus,
  // menus only affect themselves.
  const handleToggleAll = (id, isGroup, isChecked) => {
    if (isGroup) {
      handleAllGroupPermissions(id, isChecked);
    } else {
      handleAllPermissions(id, isGroup, isChecked);
    }
  };

  // A group's "all"/"any" state reflects its submenus (handleAllGroupPermissions
  // only ever writes menu-level entries), not a menuGroupId entry that may not exist -
  // otherwise the group row could never show "fully selected" and offer a deselect.
  const hasAllForRow = (id, isGroup) => (isGroup ? hasGroupAllPermissions(id) : hasAllPermissions(id, isGroup));
  const hasAnyForRow = (id, isGroup) => (isGroup ? hasGroupAnyPermissions(id) : hasAnyPermissions(id, isGroup));

    const renderMenuItems = (menuItems, depth = 1) =>
        (menuItems ?? []).map((menu) => (
            <Fragment key={menu.id}>
                <PermissionRow
                    id={menu.id}
                    isGroup={false}
                    name={menu.name}
                    depth={depth}
                    isParent={menu.isParent}
                    hasPermission={hasPermission}
                    hasAllForRow={hasAllForRow}
                    hasAnyForRow={hasAnyForRow}
                    onPermissionChange={handlePermissionChange}
                    onToggleAll={handleToggleAll}
                />
                {menu.children?.length > 0 && renderMenuItems(menu.children, depth + 1)}
            </Fragment>
        ));

    document.title = `User Roles | Demo Panel`;

    return (
        <>
            <PageHeader title="User Roles" pageTitle="Setup" />

            <Card>
                <div className="flex flex-col gap-4 border-b border-secondary px-5 py-4 md:flex-row md:items-end md:justify-between">
                    <div className="flex w-full flex-col gap-4 md:flex-row">
                        <div className="w-full md:max-w-xs">
                            <SelectField
                                label="Select Role"
                                placeholder="Select a role..."
                                options={roles}
                                value={selectedRole ? selectedRole.value : ""}
                                onChange={setSelectedRole}
                            />
                        </div>
                        <div className="w-full md:max-w-xs">
                            <SelectField
                                label="Data Scope"
                                hint="How much data this role sees on scoped screens."
                                options={SCOPE_OPTIONS}
                                value={dataScope}
                                isDisabled={!selectedRole}
                                onChange={(option) => {
                                    if (!option) return;
                                    setDataScope(option.value);
                                    setRolesChanged(true);
                                }}
                            />
                        </div>
                    </div>
                    <Button iconLeading={Save01} onClick={saveUserRoles} isLoading={saveLoading} isDisabled={!selectedRole || saveLoading}>
                        {saveLoading ? "Saving..." : "Save Permissions"}
                    </Button>
                </div>

                {rolesChanged && (
                    <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg bg-warning-primary px-4 py-3 ring-1 ring-warning">
                        <AlertTriangle className="size-4 shrink-0 text-warning-primary" />
                        <p className="text-sm text-primary">You have unsaved changes. Remember to save your permissions.</p>
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center px-6 py-16">
                        <LoadingIndicator type="dot-circle" size="md" label="Loading permissions..." />
                    </div>
                ) : !selectedRole ? (
                    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                        <User01 className="size-6 text-fg-quaternary" />
                        <p className="text-sm text-tertiary">Select a role to manage its permissions.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-lg border-collapse">
                            <thead>
                                <tr className="border-b border-secondary bg-secondary">
                                    <th className="w-full px-4 py-3 text-left text-xs font-semibold text-tertiary">Menu</th>
                                    {PERMISSION_COLUMNS.map((permission) => (
                                        <th key={permission} className="w-20 px-3 py-3 text-xs font-semibold text-tertiary">
                                            <div className="flex flex-col items-center gap-1.5">
                                                <span className="capitalize">{permission}</span>
                                                <Checkbox
                                                    aria-label={`Toggle ${permission} for all menus`}
                                                    isSelected={hasColumnAllPermissions(permission)}
                                                    onChange={(checked) => handleColumnPermissionChange(permission, checked)}
                                                />
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {menuData.map((group) => (
                                    <Fragment key={group.groupId}>
                                        <PermissionRow
                                            id={group.groupId}
                                            isGroup
                                            name={group.groupName}
                                            depth={0}
                                            hasPermission={hasPermission}
                                            hasAllForRow={hasAllForRow}
                                            hasAnyForRow={hasAnyForRow}
                                            onPermissionChange={handlePermissionChange}
                                            onToggleAll={handleToggleAll}
                                        />
                                        {!group.isLink && renderMenuItems(group.menus)}
                                    </Fragment>
                                ))}
                                {menuData.length === 0 && (
                                    <tr>
                                        <td colSpan={PERMISSION_COLUMNS.length + 1} className="px-6 py-10 text-center text-sm text-tertiary">
                                            No menus available.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </>
    );
};

export default UserRoles;
