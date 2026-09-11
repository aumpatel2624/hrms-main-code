import { cx } from "@/utils/cx";

/**
 * A compact tab row for switching between related pieces of content.
 * The parent owns the active tab so it can decide what content to render.
 */
const Tabs = ({ tabs = [], activeId, onChange, ariaLabel = "Sections", className }) => {
    if (!tabs.length) return null;

    return (
        <div
            role="tablist"
            aria-label={ariaLabel}
            className={cx("flex gap-1 overflow-x-auto border-b border-secondary", className)}
        >
            {tabs.map((tab) => {
                const isActive = tab.id === activeId;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        className={cx(
                            "shrink-0 border-b-2 px-3 py-3 text-sm font-semibold outline-focus-ring transition focus-visible:outline-2 focus-visible:outline-offset-2",
                            isActive
                                ? "border-brand-solid text-brand-secondary"
                                : "border-transparent text-tertiary hover:text-secondary",
                        )}
                        onClick={() => onChange?.(tab.id)}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
};

export default Tabs;
