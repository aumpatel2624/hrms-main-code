import { useState } from "react";
import { toast } from "react-toastify";
import { FormSection, FullWidth } from "@/components/ui/form";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/base/buttons/button";

/**
 * ADR-024 (module complete): Leave Encashment's `/mark-paid` action — amount/
 * date/reference, no GL, no Payment Entry (the same manual substitute Full &
 * Final Statement established, ADR-016/Q-3). Same shape as
 * AdjustAllocationPanel, but with three inputs instead of one.
 */
const MarkEncashmentPaidPanel = ({ defaultAmount, onMarkPaid, onResult }) => {
    const [paidAmount, setPaidAmount] = useState(defaultAmount ?? 0);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
    const [paymentReference, setPaymentReference] = useState("");
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        setBusy(true);
        try {
            const res = await onMarkPaid({ paidAmount: Number(paidAmount), paymentDate, paymentReference });
            toast.success(res?.data?.message || "Marked as paid");
            onResult?.(res);
        } catch (err) {
            toast.error(err.response?.data?.message || "Mark as paid failed");
        } finally {
            setBusy(false);
        }
    };

    return (
        <FormSection title="Mark as Paid" description="No GL posting, no Payment Entry — this project has no Payroll/Accounting module yet. Records the payment manually.">
            <Field name="paidAmount" type="number" label="Paid Amount" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
            <Field name="paymentDate" type="date" label="Payment Date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
            <FullWidth>
                <Field name="paymentReference" label="Payment Reference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} />
            </FullWidth>
            <FullWidth>
                <Button onClick={submit} isLoading={busy} isDisabled={busy}>
                    {busy ? "Marking…" : "Mark as Paid"}
                </Button>
            </FullWidth>
        </FormSection>
    );
};

export default MarkEncashmentPaidPanel;
