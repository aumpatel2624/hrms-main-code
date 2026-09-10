import { useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { MenuContext } from "../../context/MenuContext";
import { getAllEmployees } from "../../api/employees.api";
import { getAllLeavePolicies, getAllLeavePeriods, bulkCreatePolicyAssignments, bulkAllocateLeaves } from "../../api/leaves.api";
import { Card, PageHeader } from "@/components/ui/page";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { NativeSelect } from "@/components/base/select/select-native";
import { Input } from "@/components/base/input/input";
import { Badge } from "@/components/base/badges/badges";

/**
 * ADR-024 (module complete): Leave Control Panel is a stateless bulk-action
 * form in source (a Frappe Single with disable_save) — no stored model, no
 * entity-config CRUD screen. This is the "lightweight custom admin page"
 * the design brief called for: employee multi-select + policy/period picker
 * + Run, with per-item results shown after the run so one employee's
 * failure is visible without aborting the rest of the batch.
 */
const LeaveControlPanel = () => {
    const { currentPagePermissions } = useContext(MenuContext);

    const [employees, setEmployees] = useState([]);
    const [policies, setPolicies] = useState([]);
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [leavePolicyId, setLeavePolicyId] = useState("");
    const [leavePeriodId, setLeavePeriodId] = useState("");
    const [carryForward, setCarryForward] = useState(true);

    const [running, setRunning] = useState(false);
    const [results, setResults] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [employeesRes, policiesRes, periodsRes] = await Promise.all([
                    getAllEmployees(), getAllLeavePolicies(), getAllLeavePeriods(),
                ]);
                setEmployees(employeesRes.data?.data ?? []);
                setPolicies(policiesRes.data?.data ?? []);
                setPeriods(periodsRes.data?.data ?? []);
            } catch (error) {
                console.error("Error loading Leave Control Panel data:", error);
                toast.error("Could not load employees/policies/periods");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filteredEmployees = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return employees;
        return employees.filter((emp) =>
            emp.employeeName?.toLowerCase().includes(q) || emp.employeeCode?.toLowerCase().includes(q));
    }, [employees, search]);

    const toggleEmployee = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const selectAllFiltered = () => setSelectedIds(new Set(filteredEmployees.map((e) => e._id)));
    const clearSelection = () => setSelectedIds(new Set());

    const run = async (mode) => {
        if (!leavePolicyId) return toast.error("Choose a Leave Policy first");
        if (selectedIds.size === 0) return toast.error("Please select at least one employee to perform this action");

        setRunning(true);
        setResults(null);
        try {
            const items = [...selectedIds].map((employeeId) => ({
                employeeId,
                leavePolicyId,
                leavePeriodId: leavePeriodId || undefined,
                assignmentBasedOn: leavePeriodId ? "Leave Period" : undefined,
                carryForward,
            }));
            const runner = mode === "allocate" ? bulkAllocateLeaves : bulkCreatePolicyAssignments;
            const res = await runner(items);
            const rows = res.data?.data?.results ?? [];
            setResults(rows);
            const successCount = rows.filter((r) => r.success).length;
            toast.success(`${successCount} of ${rows.length} succeeded`);
        } catch (error) {
            console.error("Error running Leave Control Panel action:", error);
            toast.error(error.response?.data?.message || "Run failed");
        } finally {
            setRunning(false);
        }
    };

    document.title = "Leave Control Panel | Demo Panel";

    if (!currentPagePermissions.edit) {
        return (
            <>
                <PageHeader title="Leave Control Panel" pageTitle="Leaves" />
                <Card className="px-5 py-8 text-center">
                    <p className="text-sm text-tertiary">You do not have access to the Leave Control Panel.</p>
                </Card>
            </>
        );
    }

    return (
        <>
            <PageHeader
                title="Leave Control Panel"
                pageTitle="Leaves"
                description="Bulk-assign a Leave Policy to many employees at once, optionally granting the allocations immediately. One employee's failure (e.g. an existing overlapping assignment) never blocks the rest."
            />

            <Card className="flex flex-col gap-5 p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-secondary" htmlFor="lcp-policy">Leave Policy</label>
                        <NativeSelect
                            id="lcp-policy"
                            value={leavePolicyId}
                            onChange={(e) => setLeavePolicyId(e.target.value)}
                            options={[
                                { value: "", label: "Select a Leave Policy…" },
                                ...policies.map((p) => ({ value: p._id, label: p.title })),
                            ]}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-secondary" htmlFor="lcp-period">Leave Period (optional)</label>
                        <NativeSelect
                            id="lcp-period"
                            value={leavePeriodId}
                            onChange={(e) => setLeavePeriodId(e.target.value)}
                            options={[
                                { value: "", label: "Use effective dates instead…" },
                                ...periods.map((p) => ({ value: p._id, label: `${p.fromDate?.slice?.(0, 10)} – ${p.toDate?.slice?.(0, 10)}` })),
                            ]}
                        />
                    </div>
                    <div className="flex items-end pb-2">
                        <Checkbox
                            label="Carry forward unused leaves"
                            isSelected={carryForward}
                            onChange={setCarryForward}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <Input
                            className="max-w-xs"
                            placeholder="Search employees by name or code…"
                            value={search}
                            onChange={(v) => setSearch(v)}
                        />
                        <Button size="sm" color="secondary" onClick={selectAllFiltered}>Select all shown</Button>
                        <Button size="sm" color="secondary" onClick={clearSelection}>Clear selection</Button>
                        <Badge size="sm" color="brand">{selectedIds.size} selected</Badge>
                    </div>

                    <div className="max-h-96 overflow-y-auto rounded-lg border border-secondary">
                        {loading ? (
                            <p className="p-4 text-sm text-tertiary">Loading employees…</p>
                        ) : (
                            <ul className="divide-y divide-secondary">
                                {filteredEmployees.map((emp) => (
                                    <li key={emp._id} className="flex items-center gap-3 px-4 py-2">
                                        <Checkbox
                                            isSelected={selectedIds.has(emp._id)}
                                            onChange={() => toggleEmployee(emp._id)}
                                        />
                                        <span className="text-sm text-primary">{emp.employeeName}</span>
                                        <span className="text-xs text-tertiary">{emp.employeeCode}</span>
                                    </li>
                                ))}
                                {filteredEmployees.length === 0 && (
                                    <li className="p-4 text-sm text-tertiary">No employees match this search.</li>
                                )}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <Button onClick={() => run("assign")} isLoading={running} isDisabled={running}>
                        Assign Policy Only
                    </Button>
                    <Button color="primary" onClick={() => run("allocate")} isLoading={running} isDisabled={running}>
                        Assign + Grant Allocations
                    </Button>
                </div>

                {results && (
                    <div className="rounded-lg border border-secondary">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-secondary text-left text-tertiary">
                                    <th className="px-4 py-2">Employee</th>
                                    <th className="px-4 py-2">Result</th>
                                    <th className="px-4 py-2">Detail</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((row, idx) => {
                                    const employee = employees.find((e) => e._id === row.employeeId);
                                    return (
                                        <tr key={`${row.employeeId}-${idx}`} className="border-b border-secondary last:border-b-0">
                                            <td className="px-4 py-2">{employee?.employeeName || row.employeeId}</td>
                                            <td className="px-4 py-2">
                                                {row.success
                                                    ? <Badge size="sm" color="success">Success</Badge>
                                                    : <Badge size="sm" color="error">Failed</Badge>}
                                            </td>
                                            <td className="px-4 py-2 text-tertiary">{row.error || row.leavePolicyAssignmentId || "—"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </>
    );
};

export default LeaveControlPanel;
