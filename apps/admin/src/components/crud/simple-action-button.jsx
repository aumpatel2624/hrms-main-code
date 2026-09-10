import { useState } from "react";
import { toast } from "react-toastify";
import { FormSection, FullWidth } from "@/components/ui/form";

/**
 * A server-side action on an existing record that isn't a field edit
 * (ADR-020's markAsCompleted/makeEmployee/markAsPaid) — this admin has no
 * generic "action button" affordance yet, so this is the smallest reusable
 * version, same `renderExtra` hook SimpleArrayField and
 * EmailTemplateMergeFields already use. Only rendered in edit mode (an
 * action needs an existing record id).
 */
const SimpleActionButton = ({ label, description, onRun, onResult }) => {
    const [busy, setBusy] = useState(false);

    const handleClick = async () => {
        setBusy(true);
        try {
            const res = await onRun();
            toast.success(res?.data?.message || `${label} succeeded`);
            onResult?.(res);
        } catch (err) {
            toast.error(err.response?.data?.message || `${label} failed`);
        } finally {
            setBusy(false);
        }
    };

    return (
        <FormSection title={label} description={description}>
            <FullWidth>
                <button
                    type="button"
                    disabled={busy}
                    className="w-fit rounded-md border border-primary bg-primary px-3 py-1.5 text-sm text-primary hover:bg-secondary disabled:opacity-50"
                    onClick={handleClick}
                >
                    {busy ? "Working…" : label}
                </button>
            </FullWidth>
        </FormSection>
    );
};

export default SimpleActionButton;
