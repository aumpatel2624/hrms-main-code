import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, SearchLg, X as XClose } from "@untitledui/icons";
import { MenuContext } from "../context/MenuContext";
import { cx } from "@/utils/cx";

// Menu icons are `ri-*` strings stored in the database (picked via IconPicker),
// so they still render through the remixicon webfont rather than
// @untitledui/icons. Changing that needs a server-side data migration.
const MenuIcon = ({ icon, className }) =>
    icon ? <i className={cx(icon, "shrink-0 text-[17px] leading-none", className)} /> : null;

/** Shared shape for every row so branches and leaves line up exactly. */
const rowBase =
    "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm outline-none transition-colors duration-100 " +
    "focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-900";

/** A menu group or a parent menu — anything that expands. */
const NavBranch = ({ name, icon, isOpen, onToggle, depth, hasActiveChild, children }) => (
    <li>
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            title={name}
            className={cx(
                rowBase,
                "cursor-pointer text-left",
                hasActiveChild ? "text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
                isOpen && !hasActiveChild && "text-white/90",
            )}
        >
            <MenuIcon icon={icon} className={cx("transition-colors", hasActiveChild ? "text-white" : "text-white/60 group-hover:text-white/90")} />
            <span className="flex-1 truncate font-medium">{name}</span>
            <ChevronDown
                className={cx("size-4 shrink-0 text-white/50 transition-transform duration-200", isOpen && "rotate-180")}
            />
        </button>

        {/* The rail makes nesting readable without relying on indentation alone. */}
        <div
            className={cx(
                "grid transition-[grid-template-rows] duration-200 ease-out",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
        >
            <ul className={cx("overflow-hidden", depth === 0 && "ml-[22px] border-l border-white/15 pl-2.5")}>
                <div className="flex flex-col gap-0.5 py-0.5">{children}</div>
            </ul>
        </div>
    </li>
);

/** A navigable leaf. */
const NavLeaf = ({ to, name, icon, isActive, onClick }) => (
    <li>
        <Link
            to={to}
            onClick={onClick}
            title={name}
            aria-current={isActive ? "page" : undefined}
            className={cx(
                rowBase,
                "relative",
                isActive
                    ? "bg-white/15 font-semibold text-white before:absolute before:top-1/2 before:-left-2.5 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-white"
                    : "font-medium text-white/70 hover:bg-white/10 hover:text-white",
            )}
        >
            <MenuIcon icon={icon} className={cx("transition-colors", isActive ? "text-white" : "text-white/55 group-hover:text-white/90")} />
            <span className="truncate">{name}</span>
        </Link>
    </li>
);

/** Walks the tree to find which group/menu ids contain the current path. */
const findAncestors = (nodes, path, trail = []) => {
    for (const node of nodes ?? []) {
        const id = node.groupId ?? node.id;
        if (node.url === path) return trail;
        const kids = node.menus ?? node.children;
        if (kids?.length) {
            const found = findAncestors(kids, path, [...trail, id]);
            if (found) return found;
        }
    }
    return null;
};

/**
 * Filters the menu tree to nodes matching `term`, keeping any ancestor whose
 * subtree still has a match so the hierarchy stays intact.
 */
const filterTree = (nodes, term) => {
    if (!term) return nodes ?? [];
    const q = term.toLowerCase();

    const walk = (list, nameOf, childKey) =>
        (list ?? []).reduce((acc, node) => {
            const self = (nameOf(node) ?? "").toLowerCase().includes(q);
            const kids = node[childKey]?.length ? walk(node[childKey], (n) => n.name, "children") : [];
            if (self || kids.length) acc.push(kids.length ? { ...node, [childKey]: kids } : node);
            return acc;
        }, []);

    return (nodes ?? []).reduce((acc, group) => {
        const self = (group.groupName ?? "").toLowerCase().includes(q);
        const menus = group.menus?.length ? walk(group.menus, (n) => n.name, "children") : [];
        if (self || menus.length) acc.push(menus.length ? { ...group, menus } : group);
        return acc;
    }, []);
};

/** Every group/menu id in a tree - used to expand everything while searching. */
const allIds = (nodes) =>
    (nodes ?? []).flatMap((node) => [node.groupId ?? node.id, ...allIds(node.menus ?? node.children)]).filter(Boolean);

/** True when any descendant of this node is the current route. */
const containsPath = (node, path) => {
    if (node?.url === path) return true;
    const kids = node?.menus ?? node?.children;
    return Boolean(kids?.some((kid) => containsPath(kid, path)));
};

const SidebarNav = () => {
    const { menuData, loading, updateCurrentPagePermissions } = useContext(MenuContext);
    const { pathname } = useLocation();
    const [expanded, setExpanded] = useState({});
    const [search, setSearch] = useState("");
    const searchRef = useRef(null);

    const visibleMenu = useMemo(() => filterTree(menuData, search.trim()), [menuData, search]);

    // While searching, every branch that survived the filter is opened so the
    // matches are actually visible.
    const searchExpanded = useMemo(
        () => (search.trim() ? Object.fromEntries(allIds(visibleMenu).map((id) => [id, true])) : null),
        [search, visibleMenu],
    );
    const isOpen = (id) => (searchExpanded ? Boolean(searchExpanded[id]) : Boolean(expanded[id]));

    // Ctrl/Cmd+S focuses the box, as the old header search did.
    useEffect(() => {
        const onKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, []);

    // Open whichever branches contain the current route. Replaces the old
    // approach of querying #navbar-nav and toggling classes by hand.
    useEffect(() => {
        const trail = findAncestors(menuData, pathname);
        if (trail?.length) {
            setExpanded((prev) => ({ ...prev, ...Object.fromEntries(trail.map((id) => [id, true])) }));
        }
    }, [pathname, menuData]);

    // Accordion: opening a branch closes its siblings.
    const toggle = (id, siblingIds = []) =>
        setExpanded((prev) => {
            if (prev[id]) return { ...prev, [id]: false };
            const next = { ...prev };
            siblingIds.forEach((sibling) => sibling !== id && (next[sibling] = false));
            next[id] = true;
            return next;
        });

    const renderItem = (item, siblingIds = [], depth = 1) => {
        if (!item?.name) return null;

        if (item.isParent && item.children?.length) {
            const childSiblings = item.children.filter((c) => c.isParent && c.children?.length).map((c) => c.id);
            return (
                <NavBranch
                    key={item.id}
                    name={item.name}
                    icon={item.icon}
                    depth={depth}
                    hasActiveChild={containsPath(item, pathname)}
                    isOpen={isOpen(item.id)}
                    onToggle={() => toggle(item.id, siblingIds)}
                >
                    {item.children.map((child) => renderItem(child, childSiblings, depth + 1))}
                </NavBranch>
            );
        }

        return (
            <NavLeaf
                key={item.id}
                to={item.url}
                name={item.name}
                icon={item.icon}
                isActive={pathname === item.url}
                onClick={() => item.id && updateCurrentPagePermissions(item.id)}
            />
        );
    };

    const renderGroup = (group, siblingGroupIds = []) => {
        if (group?.isLink) {
            if (!group.groupName || !group.url) return null;
            return (
                <NavLeaf
                    key={group.groupId}
                    to={group.url}
                    name={group.groupName}
                    icon={group.icon}
                    isActive={pathname === group.url}
                    onClick={() => group.groupId && updateCurrentPagePermissions(group.groupId)}
                />
            );
        }

        if (!group?.groupName || !group.menus) return null;
        const menuSiblings = group.menus.filter((m) => m.isParent && m.children?.length).map((m) => m.id);

        return (
            <NavBranch
                key={group.groupId}
                name={group.groupName}
                icon={group.icon}
                depth={0}
                hasActiveChild={containsPath(group, pathname)}
                isOpen={isOpen(group.groupId)}
                onToggle={() => toggle(group.groupId, siblingGroupIds)}
            >
                {group.menus.map((menu) => renderItem(menu, menuSiblings))}
            </NavBranch>
        );
    };

    const groups = Array.isArray(visibleMenu) ? visibleMenu : [];
    const searching = Boolean(search.trim());
    const groupIds = groups.filter((g) => !g.isLink && g.menus?.length).map((g) => g.groupId);

    return (
        <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4">
            <div className="sticky top-0 z-10 -mx-3 bg-brand-900 px-3 pt-4 pb-3">
                <div className="group relative">
                    <SearchLg className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40 transition-colors group-focus-within:text-white/70" />
                    <input
                        ref={searchRef}
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search menu..."
                        aria-label="Search menu"
                        className="h-9 w-full rounded-lg bg-white/8 pr-16 pl-9 text-sm text-white ring-1 ring-white/10 outline-none transition placeholder:text-white/40 hover:bg-white/12 focus:bg-white/15 focus:ring-white/25"
                    />
                    {search ? (
                        <button
                            type="button"
                            aria-label="Clear search"
                            onClick={() => setSearch("")}
                            className="absolute top-1/2 right-1.5 -translate-y-1/2 cursor-pointer rounded-md p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"
                        >
                            <XClose className="size-3.5" />
                        </button>
                    ) : (
                        <kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 rounded border border-white/15 px-1.5 py-0.5 text-[10px] font-medium text-white/40">
                            ⌘S
                        </kbd>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between px-3 pt-1 pb-2">
                <p className="text-[11px] font-semibold tracking-[0.08em] text-white/45 uppercase">
                    {searching ? "Results" : "Menu"}
                </p>
                {searching && groups.length > 0 && (
                    <span className="text-[11px] font-medium text-white/35">{groups.length}</span>
                )}
            </div>

            <ul className="flex flex-col gap-0.5">
                {loading && !searching &&
                    // Skeleton rows instead of a bare "Loading..." string.
                    Array.from({ length: 5 }).map((_, i) => (
                        <li key={i} className="flex items-center gap-2.5 px-3 py-2">
                            <span className="size-[17px] shrink-0 animate-pulse rounded bg-white/15" />
                            <span
                                className="h-3 animate-pulse rounded bg-white/15"
                                style={{ width: `${55 + ((i * 13) % 30)}%` }}
                            />
                        </li>
                    ))}

                {!loading && groups.length === 0 && (
                    <li className="px-3 py-2 text-sm text-white/55">No menu items available.</li>
                )}

                {!loading && groups.map((group) => renderGroup(group, groupIds))}
            </ul>
        </nav>
    );
};

export default SidebarNav;
