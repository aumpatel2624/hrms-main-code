import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ChevronRight, Edit01, Eye, HomeLine, Plus, SearchLg, Trash01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { cx } from "@/utils/cx";

/** Home > Section > Current. Untitled UI gates its own Breadcrumbs behind PRO. */
const Breadcrumbs = ({ pageTitle, pageHref, title }) => (
    <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex min-w-0 items-center gap-1 text-xs">
            <li className="flex shrink-0 items-center">
                <Link
                    to="/dashboard"
                    aria-label="Dashboard"
                    className="rounded-sm p-0.5 text-fg-quaternary outline-focus-ring transition hover:text-fg-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    <HomeLine className="size-3.5" />
                </Link>
            </li>
            {pageTitle && (
                <>
                    <ChevronRight className="size-3.5 shrink-0 text-fg-quaternary" />
                    <li className="min-w-0 truncate">
                        {pageHref ? (
                            <Link
                                to={pageHref}
                                className="rounded-sm font-medium text-tertiary outline-focus-ring transition hover:text-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
                            >
                                {pageTitle}
                            </Link>
                        ) : (
                            <span className="font-medium text-tertiary">{pageTitle}</span>
                        )}
                    </li>
                </>
            )}
            <ChevronRight className="size-3.5 shrink-0 text-fg-quaternary" />
            <li aria-current="page" className="min-w-0 truncate font-semibold text-brand-secondary">
                {title}
            </li>
        </ol>
    </nav>
);

/**
 * The page header: breadcrumb and title in the layout's top bar, list controls
 * at the top of the page.
 *
 * The breadcrumb and title portal into the layout's `app-header-slot`, so a
 * screen no longer spends a full block of height restating its own name. The
 * slot is looked up in a layout effect - it is the layout's DOM, not ours, and
 * does not exist yet on the first render - which still lands before paint. A
 * screen rendered outside the layout has no slot and keeps the title inline.
 *
 * The filter/search/add props are optional - pass them and the control cluster
 * renders beneath the top bar; omit them and the page gets no header block at
 * all. `handleFilter` still receives a DOM-shaped event so page handlers didn't
 * need to change.
 */
export const PageHeader = ({
    title,
    pageTitle,
    pageHref,
    description,
    // list controls
    filter,
    handleFilter,
    setQuery,
    tog_list,
    showAddButton = false,
    addLabel = "Add",
    searchPlaceholder = "Search...",
    // escape hatch for page-specific buttons
    actions,
}) => {
    const [headerSlot, setHeaderSlot] = useState(null);
    useLayoutEffect(() => {
        setHeaderSlot(document.getElementById("app-header-slot"));
    }, []);

    const hasControls = Boolean(setQuery || handleFilter || showAddButton || actions);

    const heading = (
        <div className="flex min-w-0 flex-col justify-center">
            <Breadcrumbs pageTitle={pageTitle} pageHref={pageHref} title={title} />
            <h1 className="truncate text-lg font-semibold text-primary">{title}</h1>
        </div>
    );

    return (
        <>
            {headerSlot && createPortal(heading, headerSlot)}
            {(!headerSlot || description || hasControls) && (
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 flex-col gap-0.5">
                        {!headerSlot && heading}
                        {description && <p className="text-sm text-tertiary">{description}</p>}
                    </div>

                    {hasControls && (
                        <div className="flex flex-wrap items-center gap-3 lg:ml-auto lg:flex-nowrap lg:justify-end">
                            {handleFilter && (
                                <Checkbox
                                    label="Active"
                                    isSelected={Boolean(filter)}
                                    onChange={(checked) => handleFilter({ target: { checked, type: "checkbox" } })}
                                />
                            )}
                            {setQuery && (
                                <Input
                                    aria-label="Search"
                                    icon={SearchLg}
                                    placeholder={searchPlaceholder}
                                    onChange={(v) => setQuery(v)}
                                    wrapperClassName="w-full sm:w-64"
                                />
                            )}
                            {actions}
                            {showAddButton && (
                                <Button iconLeading={Plus} onClick={() => tog_list?.()}>
                                    {addLabel}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

/** Card wrapper every list and form screen sits in. */
export const Card = ({ children, className = "" }) => (
    <div className={cx("mt-5 rounded-xl bg-primary shadow-xs ring-1 ring-secondary", className)}>{children}</div>
);

/**
 * Row actions as icons rather than text. Tooltips carry the label, and each
 * button keeps an aria-label so the action is still announced.
 */
export const RowActions = ({ onView, onEdit, onRemove, canView = true, canEdit = true, canDelete = true }) => {
    const anything = (onView && canView) || (onEdit && canEdit) || (onRemove && canDelete);
    if (!anything) return <span className="text-sm text-quaternary">No actions</span>;

    return (
        <div className="flex items-center gap-0.5">
            {onView && canView && (
                <ButtonUtility size="xs" color="tertiary" icon={Eye} tooltip="View" aria-label="View" onClick={onView} />
            )}
            {onEdit && canEdit && (
                <ButtonUtility size="xs" color="tertiary" icon={Edit01} tooltip="Edit" aria-label="Edit" onClick={onEdit} />
            )}
            {onRemove && canDelete && (
                <ButtonUtility
                    size="xs"
                    color="tertiary"
                    icon={Trash01}
                    tooltip="Delete"
                    aria-label="Delete"
                    onClick={onRemove}
                    className="text-fg-quaternary hover:text-fg-error-primary"
                />
            )}
        </div>
    );
};
