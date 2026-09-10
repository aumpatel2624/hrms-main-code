import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

/**
 * A titled block of related fields. Long forms read far better broken into
 * sections than as one flat column of inputs.
 */
export const FormSection = ({ title, description, children, columns = 2, className }) => (
    <section className={cx("grid gap-x-8 gap-y-5 border-b border-secondary py-6 last:border-b-0 lg:grid-cols-3", className)}>
        <div className="flex flex-col gap-1 lg:col-span-1">
            <h2 className="text-sm font-semibold text-primary">{title}</h2>
            {description && <p className="text-sm text-tertiary">{description}</p>}
        </div>

        <div
            className={cx(
                "grid content-start gap-x-6 gap-y-5 lg:col-span-2",
                columns === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2",
            )}
        >
            {children}
        </div>
    </section>
);

/** Makes a field span the full width of its section grid. */
export const FullWidth = ({ children, className }) => (
    <div className={cx("sm:col-span-2", className)}>{children}</div>
);

/**
 * Sticky footer so the primary action stays reachable on long forms.
 * Cancel navigates through the router - Untitled UI's Button renders a plain
 * anchor when given `href`, which would reload the whole app.
 */
export const FormActions = ({ onSubmit, cancelTo, onCancel, isLoading, submitLabel = "Save", loadingLabel = "Saving..." }) => {
    const navigate = useNavigate();
    return (
    <div className="sticky bottom-0 -mx-5 flex items-center justify-end gap-3 rounded-b-xl border-t border-secondary bg-primary px-5 py-4 md:-mx-6 md:px-6">
        <Button
            color="secondary"
            isDisabled={isLoading}
            onClick={() => (cancelTo ? navigate(cancelTo) : onCancel?.())}
        >
            Cancel
        </Button>
        <Button type="submit" onClick={onSubmit} isLoading={isLoading} isDisabled={isLoading}>
            {isLoading ? loadingLabel : submitLabel}
        </Button>
    </div>
    );
};

/** Back link shown above a form or detail page. */
export const BackLink = ({ to, children = "Back to list" }) => (
    <Link
        to={to}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-tertiary outline-focus-ring transition hover:text-secondary focus-visible:outline-2 focus-visible:outline-offset-2"
    >
        <ArrowLeft className="size-4" />
        {children}
    </Link>
);

