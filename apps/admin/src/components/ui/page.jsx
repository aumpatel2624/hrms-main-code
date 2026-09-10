import { Link } from "react-router-dom";
import { ChevronRight, Edit01, Eye, HomeLine, Plus, SearchLg, Trash01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { cx } from "@/utils/cx";

/** Home > Section > Current. Untitled UI gates its own Breadcrumbs behind PRO. */
const Breadcrumbs = ({ pageTitle, pageHref, title }) => (
    <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-sm">
            <li className="flex items-center">
                <Link
                    to="/dashboard"
                    aria-label="Dashboard"
                    className="rounded-sm p-0.5 text-fg-quaternary outline-focus-ring transition hover:text-fg-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    <HomeLine className="size-4" />
                </Link>
            </li>
            {pageTitle && (
                <>
                    <ChevronRight className="size-4 shrink-0 text-fg-quaternary" />
                    <li>
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
            <ChevronRight className="size-4 shrink-0 text-fg-quaternary" />
            <li aria-current="page" className="font-semibold text-brand-secondary">
                {title}
            </li>
        </ol>
    </nav>
);

/**
 * The page header and the old list toolbar merged into one block.
 *
 * They used to be separate, which meant the screen name appeared three times
 * ("City" as the page title, again in the breadcrumb, then again as the card
 * header). Now the breadcrumb, the title and the list controls share one row
 * and the card below holds only the table.
 *
 * The filter/search/add props are optional - pass them and the control cluster
 * renders; omit them and you get a plain header. `handleFilter` still receives
 * a DOM-shaped event so page handlers didn't need to change.
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
    const hasControls = Boolean(setQuery || handleFilter || showAddButton || actions);

    return (
        <div className="flex flex-col gap-4 border-b border-secondary pb-5">
            <Breadcrumbs pageTitle={pageTitle} pageHref={pageHref} title={title} />

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 flex-col gap-0.5">
                    <h1 className="truncate text-display-xs font-semibold text-primary">{title}</h1>
                    {description && <p className="text-sm text-tertiary">{description}</p>}
                </div>

                {hasControls && (
                    <div className="flex flex-wrap items-center gap-3 lg:flex-nowrap lg:justify-end">
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
        </div>
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
