import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { MenuContext } from "../../context/MenuContext";
import { getAllCompanies } from "../../api/organizationSetup.api";
import { createPayrollEntry, getPayrollEntry, createPayrollSlips, submitPayrollSlips, cancelPayrollEntry } from "../../api/payrollRun.api";
import { Card, PageHeader } from "@/components/ui/page";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { Input } from "@/components/base/input/input";
import { Checkbox } from "@/components/base/checkbox/checkbox";

// The standard CRUD list links here; processing a stored batch needs its own layout.
export default function PayrollEntry() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentPagePermissions: permissions } = useContext(MenuContext);
    const [companies, setCompanies] = useState([]);
    const [entry, setEntry] = useState(null);
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState({ companyId: "", startDate: "", endDate: "", payrollFrequency: "Monthly", validateAttendance: false });
    const change = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
    useEffect(() => {
        if (!permissions.read) return;
        getAllCompanies().then(res => setCompanies(res.data.data)).catch(() => toast.error("Could not load companies"));
        if (id) getPayrollEntry(id).then(res => setEntry(res.data.data)).catch(() => toast.error("Could not load payroll entry"));
        else setEntry(null);
    }, [id, permissions.read]);
    const run = async action => {
        setBusy(true);
        try {
            const res = await action();
            if (!id) navigate(`/payroll-entry/${res.data.data._id}`);
            else {
                setEntry((await getPayrollEntry(id)).data.data);
                const result = res.data.data;
                toast.success(`${result.created || 0} created, ${result.submitted || 0} submitted, ${result.cancelled || 0} cancelled, ${result.failed || 0} failed`);
            }
        } catch (error) { toast.error(error.response?.data?.message || "Payroll action failed"); }
        finally { setBusy(false); }
    };
    document.title = "Payroll Entry | Demo Panel";
    if (!permissions.read || (!id && !permissions.write)) return <Card className="p-5">You do not have access to this payroll entry.</Card>;
    return <>
        <PageHeader title="Payroll Entry" pageTitle="Payroll" description="Select eligible employees, create their slips, then submit the batch. Each employee's result is recorded separately." />
        <Card className="flex flex-col gap-5 p-5">
            <Button color="secondary" onClick={() => navigate("/payroll-entry")}>Back to entries</Button>
            {!id && <>
                <NativeSelect label="Company" value={form.companyId} onChange={e => change("companyId", e.target.value)} options={[{ value: "", label: "Choose company" }, ...companies.map(row => ({ value: row._id, label: row.companyName }))]} />
                <NativeSelect label="Payroll frequency" value={form.payrollFrequency} onChange={e => change("payrollFrequency", e.target.value)} options={["Monthly", "Fortnightly", "Bimonthly", "Weekly", "Daily"].map(value => ({ value, label: value }))} />
                <Input label="Start date" type="date" value={form.startDate} onChange={value => change("startDate", value)} />
                <Input label="End date" type="date" value={form.endDate} onChange={value => change("endDate", value)} />
                <Checkbox label="Exclude employees with unmarked attendance" isSelected={form.validateAttendance} onChange={value => change("validateAttendance", value)} />
                <Button isLoading={busy} isDisabled={busy || !form.companyId || !form.startDate || !form.endDate} onClick={() => run(() => createPayrollEntry(form))}>Create entry and select employees</Button>
            </>}
            {entry && <>
                <p className="text-sm text-primary">{companies.find(row => row._id === entry.companyId)?.companyName} · {entry.payrollFrequency} · {entry.startDate.slice(0, 10)} to {entry.endDate.slice(0, 10)} · {entry.status}</p>
                <p className="text-sm text-tertiary">{entry.employeeDetails.length} employees. Failed rows are final for this entry; read the reason before starting another run.</p>
                {permissions.edit && <div className="flex flex-wrap gap-3">
                    {entry.status === "draft" && <>
                        <Button isDisabled={busy || !entry.employeeDetails.some(row => row.status === "pending")} onClick={() => run(() => createPayrollSlips(id))}>Create slips</Button>
                        <Button isDisabled={busy || entry.employeeDetails.some(row => row.status === "pending")} onClick={() => run(() => submitPayrollSlips(id))}>Submit slips</Button>
                    </>}
                    {entry.status !== "cancelled" && <Button color="secondary" isDisabled={busy} onClick={() => run(() => cancelPayrollEntry(id))}>Cancel entry and linked slips</Button>}
                </div>}
                <div className="overflow-x-auto"><table className="w-full text-left text-sm text-primary">
                    <thead><tr>{["Employee", "Outcome", "Salary withheld", "Detail", "Slip"].map(label => <th key={label} className="border-b border-secondary p-2">{label}</th>)}</tr></thead>
                    <tbody>{entry.employeeDetails.map(row => <tr key={row._id}>
                        <td className="p-2">{row.employeeName}</td><td className="p-2">{row.status}</td><td className="p-2">{row.isSalaryWithheld ? "Yes" : "No"}</td>
                        <td className="p-2">{row.failureReason || "—"}</td><td className="p-2">{row.salarySlipId && <a className="text-brand-secondary" href={`/salary-slip/${row.salarySlipId}`}>View slip</a>}</td>
                    </tr>)}</tbody>
                </table></div>
            </>}
        </Card>
    </>;
}
