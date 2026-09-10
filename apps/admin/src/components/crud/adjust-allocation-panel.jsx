import { useState } from "react";
import { toast } from "react-toastify";
import { FormSection, FullWidth } from "@/components/ui/form";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/base/buttons/button";

/**
 * ADR-024: `LeaveAllocation.newLeavesAllocated` can only change through the
 * `/adjust` action once the allocation is `active` — the generic PATCH
 * rejects a direct change (source's `on_update_after_submit` fold, same
 * "explicit action, not raw field PATCH" pattern as Training Event's
 * markCompleted). Same shape as PasswordResetSection: a small local form,
 * not a plain-value SimpleActionButton, because this action needs an input.
 */
const AdjustAllocationPanel = ({ currentValue, onAdjust, onResult }) => {
    const [value, setValue] = useState(currentValue ?? 0);
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        setBusy(true);
        try {
            const res = await onAdjust(Number(value));
            toast.success(res?.data?.message || "Allocation adjusted");
            onResult?.(res);
        } catch (err) {
            toast.error(err.response?.data?.message || "Adjustment failed");
        } finally {
            setBusy(false);
        }
    };

    return (
        <FormSection
            title="Adjust Allocation"
            description={`Current: ${currentValue ?? 0} leaves allocated. Writes a signed delta to the ledger — this is the only way to change the allocated amount once active.`}
        >
            <Field
                name="adjustNewLeavesAllocated"
                type="number"
                label="New Leaves Allocated"
                value={value}
                onChange={(e) => setValue(e.target.value)}
            />
            <FullWidth>
                <Button onClick={submit} isLoading={busy} isDisabled={busy}>
                    {busy ? "Adjusting…" : "Adjust"}
                </Button>
            </FullWidth>
        </FormSection>
    );
};

export default AdjustAllocationPanel;
