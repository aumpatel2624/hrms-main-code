import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { getMyLeaveBalance } from "../../api/leaves.api";
import { Card, PageHeader } from "@/components/ui/page";
import { SelectField } from "@/components/ui/field";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";

/**
 * ADR-043. How much leave someone has left: one row per leave type they hold
 * a current allocation for, with the balance from GET /my-leave-balance (the
 * same number a leave application is checked against). Read-only,
 * so a page rather than an entity config. Opens on the signed-in person's own
 * balance; a manager or HR also gets a picker for the people they may see,
 * which the server decides.
 */

const COLUMNS = ["Leave type", "Balance"];

const MyLeaveBalance = () => {
    const [people, setPeople] = useState([]);
    const [employeeId, setEmployeeId] = useState(null);
    const [balances, setBalances] = useState([]);
    const [loading, setLoading] = useState(true);

    // Only the latest request may fill the table: an earlier, slower one is for someone no longer selected.
    const latestRequest = useRef(0);
    const fetchBalance = async (id) => {
        const request = ++latestRequest.current;
        setLoading(true);
        try {
            const res = await getMyLeaveBalance(id);
            if (request !== latestRequest.current) return;
            const data = res.data?.data ?? {};
            setPeople(data.people ?? []);
            setEmployeeId(data.employeeId ?? null);
            setBalances(data.balances ?? []);
        } catch (err) {
            if (request !== latestRequest.current) return;
            console.log(err);
            toast.error(err.response?.data?.message || "Could not load the leave balance");
            setBalances([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchBalance();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const employeeName = people.find((row) => row._id === employeeId)?.employeeName;

    document.title = "My Leave Balance | Apidel HRMS";

    return (
        <>
            <PageHeader
                title="My Leave Balance"
                pageTitle="Leaves"
                description="How much leave is left, per leave type."
            />

            <Card className="p-5">
                {people.length > 1 ? (
                    <SelectField
                        label="Employee"
                        className="w-full sm:w-72"
                        options={people.map((row) => ({ value: row._id, label: row.employeeCode ? `${row.employeeName} (${row.employeeCode})` : row.employeeName }))}
                        value={employeeId}
                        onChange={(option) => option && fetchBalance(option.value)}
                    />
                ) : (
                    <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-medium text-secondary">Employee</span>
                        <span className="text-md font-semibold text-primary">
                            {employeeName || (loading ? "" : "No employee record linked to this login")}
                        </span>
                    </div>
                )}
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-secondary">
                            <tr className="border-b border-secondary text-left text-xs font-semibold text-tertiary">
                                {COLUMNS.map((name, index) => (
                                    <th key={name} className={index === 0 ? "px-5 py-3" : "px-5 py-3 text-right"}>{name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={COLUMNS.length} className="py-10">
                                        <LoadingIndicator type="line-simple" size="sm" label="Loading" />
                                    </td>
                                </tr>
                            ) : balances.length === 0 ? (
                                <tr>
                                    <td colSpan={COLUMNS.length} className="px-5 py-10 text-center text-tertiary">
                                        No leave is allocated for the current period.
                                    </td>
                                </tr>
                            ) : (
                                balances.map((row) => (
                                    <tr key={row.leaveTypeId} className="border-b border-secondary last:border-b-0">
                                        <td className="px-5 py-3 font-medium text-primary">{row.leaveTypeName || "—"}</td>
                                        <td className="px-5 py-3 text-right font-semibold text-primary tabular-nums">{row.balance}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </>
    );
};

export default MyLeaveBalance;
