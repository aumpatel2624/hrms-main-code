import { useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Save01 } from "@untitledui/icons";
import { MenuContext } from "../../context/MenuContext";
import { getPayrollSettings, updatePayrollSettings } from "../../api/payrollRun.api";
import { Card, PageHeader } from "@/components/ui/page";
import { CheckField, Field, SelectField } from "@/components/ui/field";
import { Button } from "@/components/base/buttons/button";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";

/**
 * ADR-027 (Payroll — Run, foundation half). A true global singleton — one
 * shared set of rules every Salary Slip's payment-days calculation reads.
 * Same "genuinely not CRUD" shape as SeoSettings.jsx (docs/conventions/
 * 40-frontend.md's decision-tree step 4), drastically simpler since there's
 * no upload/tabs/site-key surface here — just seven flat fields.
 */
const EMPTY = {
    payrollBasedOn: "Attendance",
    considerUnmarkedAttendanceAs: "Absent",
    includeHolidaysInTotalWorkingDays: false,
    considerMarkedAttendanceOnHolidays: false,
    dailyWagesFractionForHalfDay: 0.5,
    disableRoundedTotal: false,
    showLeaveBalancesInSalarySlip: true,
};

const PAYROLL_BASED_ON_OPTIONS = [
    { value: "Attendance", label: "Attendance" },
    { value: "Leave Application", label: "Leave Application" },
];
const CONSIDER_UNMARKED_OPTIONS = [
    { value: "Present", label: "Present" },
    { value: "Absent", label: "Absent" },
];

const Group = ({ title, description, children }) => (
    <div className="border-b border-secondary p-5 last:border-b-0">
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
        {description && <p className="mt-1 text-xs text-tertiary">{description}</p>}
        <div className="mt-4 space-y-4">{children}</div>
    </div>
);

const PayrollSettings = () => {
    const { currentPagePermissions } = useContext(MenuContext);
    const canEdit = Boolean(currentPagePermissions?.edit);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(EMPTY);

    useEffect(() => {
        const load = async () => {
            try {
                const response = await getPayrollSettings();
                setForm({ ...EMPTY, ...(response.data.data ?? {}) });
            } catch (error) {
                console.error("Error loading Payroll Settings:", error);
                toast.error("Failed to load Payroll Settings");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

    const save = async () => {
        setSaving(true);
        try {
            await updatePayrollSettings({
                payrollBasedOn: form.payrollBasedOn,
                considerUnmarkedAttendanceAs: form.considerUnmarkedAttendanceAs,
                includeHolidaysInTotalWorkingDays: form.includeHolidaysInTotalWorkingDays,
                considerMarkedAttendanceOnHolidays: form.considerMarkedAttendanceOnHolidays,
                dailyWagesFractionForHalfDay: form.dailyWagesFractionForHalfDay,
                disableRoundedTotal: form.disableRoundedTotal,
                showLeaveBalancesInSalarySlip: form.showLeaveBalancesInSalarySlip,
            });
            toast.success("Payroll Settings saved");
        } catch (error) {
            toast.error(error.response?.data?.message || "Save failed");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-64 items-center justify-center">
                <LoadingIndicator />
            </div>
        );
    }

    return (
        <>
            <PageHeader
                title="Payroll Settings"
                pageTitle="Payroll"
                description="One shared set of rules every Salary Slip's payment-days calculation reads. Changing these only affects Salary Slips created afterward."
                actions={
                    canEdit && (
                        <Button iconLeading={Save01} onClick={save} isLoading={saving} isDisabled={saving}>
                            Save settings
                        </Button>
                    )
                }
            />

            <Card className="overflow-hidden">
                <Group
                    title="Payroll basis"
                    description="Which records unpaid leave and absence are read from when a Salary Slip is created."
                >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <SelectField
                            label="Payroll based on"
                            options={PAYROLL_BASED_ON_OPTIONS}
                            value={form.payrollBasedOn}
                            onChange={(option) => option && set("payrollBasedOn", option.value)}
                            isDisabled={!canEdit}
                        />
                        <SelectField
                            label="Consider unmarked attendance as"
                            options={CONSIDER_UNMARKED_OPTIONS}
                            value={form.considerUnmarkedAttendanceAs}
                            onChange={(option) => option && set("considerUnmarkedAttendanceAs", option.value)}
                            isDisabled={!canEdit}
                            hint="Only used when Payroll based on is Attendance. A day in the period with no Attendance record at all is treated this way."
                        />
                    </div>
                </Group>

                <Group title="Holidays" description="How holidays count toward the total working days a period is prorated against.">
                    <CheckField
                        name="includeHolidaysInTotalWorkingDays"
                        label="Include holidays in total working days"
                        checked={form.includeHolidaysInTotalWorkingDays}
                        onChange={(e) => set("includeHolidaysInTotalWorkingDays", e.target.checked)}
                        isDisabled={!canEdit}
                    />
                    <CheckField
                        name="considerMarkedAttendanceOnHolidays"
                        label="Consider marked attendance on holidays"
                        checked={form.considerMarkedAttendanceOnHolidays}
                        onChange={(e) => set("considerMarkedAttendanceOnHolidays", e.target.checked)}
                        isDisabled={!canEdit}
                    />
                </Group>

                <Group title="Half days and rounding">
                    <Field
                        label="Daily wages fraction for half day"
                        name="dailyWagesFractionForHalfDay"
                        type="number"
                        value={form.dailyWagesFractionForHalfDay}
                        onChange={(e) => set("dailyWagesFractionForHalfDay", Number(e.target.value))}
                        hint="How much of a full day's pay a half day is worth (0.5 = half pay for a half day)."
                        disabled={!canEdit}
                    />
                    <CheckField
                        name="disableRoundedTotal"
                        label="Disable rounded total"
                        checked={form.disableRoundedTotal}
                        onChange={(e) => set("disableRoundedTotal", e.target.checked)}
                        isDisabled={!canEdit}
                    />
                </Group>

                <Group title="Leave balances">
                    <CheckField
                        name="showLeaveBalancesInSalarySlip"
                        label="Show leave balances in Salary Slip"
                        checked={form.showLeaveBalancesInSalarySlip}
                        onChange={(e) => set("showLeaveBalancesInSalarySlip", e.target.checked)}
                        isDisabled={!canEdit}
                    />
                </Group>
            </Card>
        </>
    );
};

export default PayrollSettings;
