/** The permission flags stored on every UserRoles.roles[] row. */
export const PERMISSION_KEYS = Object.freeze([
    "read",
    "write",
    "delete",
    "edit",
    "print",
    "mail",
]);

/** Every flag set to `value`: permissions() -> all false, permissions(true) -> all true. */
export const permissions = (value = false) =>
    Object.fromEntries(PERMISSION_KEYS.map((key) => [key, value]));

/** Every flag false except `key`. */
export const onlyPermission = (key, value = true) => ({
    ...permissions(false),
    [key]: value,
});

/** Copy just the permission flags off an arbitrary object, coerced to booleans. */
export const pickPermissions = (source) =>
    Object.fromEntries(PERMISSION_KEYS.map((key) => [key, Boolean(source?.[key])]));
