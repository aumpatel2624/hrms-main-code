import { useState } from "react";
import { toast } from "react-toastify";
import { FormSection, FullWidth } from "@/components/ui/form";
import { ConfirmModal } from "@/components/ui/modal";

/**
 * A server-side action on an existing record that isn't a field edit
 * (ADR-020's markAsCompleted/makeEmployee/markAsPaid) — this admin has no
 * generic "action button" affordance yet, so this is the smallest reusable
 * version, same `renderExtra` hook SimpleArrayField and
 * EmailTemplateMergeFields already use. Only rendered for an existing record
 * (an action needs its id): in edit mode, or on the View page through
 * `renderViewExtra`. `confirm` ({ title, description, confirmLabel }): an
 * action that cannot be undone asks first.
 */
const SimpleActionButton = ({ label, description, onRun, onResult, confirm }) => {
    const [busy, setBusy] = useState(false);
    const [asking, setAsking] = useState(false);

    const run = async () => {
        setAsking(false);
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
                    onClick={confirm ? () => setAsking(true) : run}
                >
                    {busy ? "Working…" : label}
                </button>
            </FullWidth>
            {confirm && <ConfirmModal isOpen={asking} onClose={() => setAsking(false)} onConfirm={run} {...confirm} />}
        </FormSection>
    );
};

export default SimpleActionButton;
