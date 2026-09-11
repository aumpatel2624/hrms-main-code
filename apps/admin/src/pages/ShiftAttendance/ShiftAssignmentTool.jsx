import { useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { MenuContext } from "../../context/MenuContext";
import { getAllEmployees } from "../../api/employees.api";
import {
    getAllShiftTypes, getAllShiftLocations, getAllShiftSchedules, searchShiftRequests,
    bulkAssignShifts, bulkAssignShiftSchedules, bulkProcessShiftRequests,
} from "../../api/shiftAttendance.api";
import { Card, PageHeader } from "@/components/ui/page";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { Input } from "@/components/base/input/input";
import { Badge } from "@/components/base/badges/badges";
import { Checkbox } from "@/components/base/checkbox/checkbox";

/**
 * ADR-025 (module complete — second/transactional fork). Shift Assignment
 * Tool is a stateless bulk-action form in source (a Frappe Single with
 * hide_toolbar) — no stored model, three bulk-action endpoints, same
 * "lightweight custom admin page" shape as Leave Control Panel.
 *
 * Judgment call (task brief): the request shape here is an explicit
 * employee-id (or shift-request-id) list per item, built from a multi-select
 * over the FULL employee/request list — the real tool's Branch/Department/
 * Designation/Grade/Employment-Type quick filters are a nice-to-have not
 * built here, to keep this endpoint's surface controlled.
 */
const ACTIONS = [
    { value: "assign-shift", label: "Assign Shift" },
    { value: "assign-schedule", label: "Assign Shift Schedule" },
    { value: "process-requests", label: "Process Shift Requests" },
];

const ShiftAssignmentTool = () => {
    const { currentPagePermissions } = useContext(MenuContext);

    const [action, setAction] = useState("assign-shift");
    const [employees, setEmployees] = useState([]);
    const [shiftTypes, setShiftTypes] = useState([]);
    const [shiftLocations, setShiftLocations] = useState([]);
    const [shiftSchedules, setShiftSchedules] = useState([]);
    const [openRequests, setOpenRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [shiftTypeId, setShiftTypeId] = useState("");
    const [shiftScheduleId, setShiftScheduleId] = useState("");
    const [shiftLocationId, setShiftLocationId] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [selectedRequestIds, setSelectedRequestIds] = useState(new Set());
    const [decision, setDecision] = useState("approve");

    const [running, setRunning] = useState(false);
    const [results, setResults] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [employeesRes, shiftTypesRes, shiftLocationsRes, shiftSchedulesRes, requestsRes] = await Promise.all([
                    getAllEmployees(), getAllShiftTypes(), getAllShiftLocations(), getAllShiftSchedules(),
                    searchShiftRequests({ filters: [{ field: "status", op: "eq", value: "open" }], per_page: 500 }),
                ]);
                setEmployees(employeesRes.data?.data ?? []);
                setShiftTypes(shiftTypesRes.data?.data ?? []);
                setShiftLocations(shiftLocationsRes.data?.data ?? []);
                setShiftSchedules(shiftSchedulesRes.data?.data ?? []);
                setOpenRequests(requestsRes.data?.data?.data ?? []);
            } catch (error) {
                console.error("Error loading Shift Assignment Tool data:", error);
                toast.error("Could not load employees/shifts/requests");
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

    const toggleEmployee = (id) => setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const selectAllFiltered = () => setSelectedIds(new Set(filteredEmployees.map((e) => e._id)));
    const clearSelection = () => setSelectedIds(new Set());

    const toggleRequest = (id) => setSelectedRequestIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const runAssign = async () => {
        if (!shiftTypeId) return toast.error("Choose a Shift Type first");
        if (!startDate) return toast.error("Start Date is required");
        if (selectedIds.size === 0) return toast.error("Please select at least one employee to perform this action");

        setRunning(true);
        setResults(null);
        try {
            const items = [...selectedIds].map((employeeId) => ({
                employeeId, shiftTypeId, shiftLocationId: shiftLocationId || undefined, startDate, endDate: endDate || undefined,
            }));
            const res = await bulkAssignShifts(items);
            const rows = res.data?.data?.results ?? [];
            setResults(rows);
            toast.success(`${rows.filter((r) => r.success).length} of ${rows.length} succeeded`);
        } catch (error) {
            console.error("Error running bulk shift assignment:", error);
            toast.error(error.response?.data?.message || "Run failed");
        } finally {
            setRunning(false);
        }
    };

    const runAssignSchedule = async () => {
        if (!shiftScheduleId) return toast.error("Choose a Shift Schedule first");
        if (selectedIds.size === 0) return toast.error("Please select at least one employee to perform this action");

        setRunning(true);
        setResults(null);
        try {
            const items = [...selectedIds].map((employeeId) => ({
                employeeId, shiftScheduleId, shiftLocationId: shiftLocationId || undefined, startDate: startDate || undefined, endDate: endDate || undefined,
            }));
            const res = await bulkAssignShiftSchedules(items);
            const rows = res.data?.data?.results ?? [];
            setResults(rows);
            toast.success(`${rows.filter((r) => r.success).length} of ${rows.length} succeeded`);
        } catch (error) {
            console.error("Error running bulk shift schedule assignment:", error);
            toast.error(error.response?.data?.message || "Run failed");
        } finally {
            setRunning(false);
        }
    };

    const runProcessRequests = async () => {
        if (selectedRequestIds.size === 0) return toast.error("Please select at least one Shift Request to perform this action");

        setRunning(true);
        setResults(null);
        try {
            const items = [...selectedRequestIds].map((shiftRequestId) => ({ shiftRequestId, decision }));
            const res = await bulkProcessShiftRequests(items);
            const rows = res.data?.data?.results ?? [];
            setResults(rows);
            toast.success(`${rows.filter((r) => r.success).length} of ${rows.length} succeeded`);
            setOpenRequests((prev) => prev.filter((r) => !selectedRequestIds.has(r._id)));
            setSelectedRequestIds(new Set());
        } catch (error) {
            console.error("Error running bulk shift request processing:", error);
            toast.error(error.response?.data?.message || "Run failed");
        } finally {
            setRunning(false);
        }
    };

    document.title = "Shift Assignment Tool | Demo Panel";

    if (!currentPagePermissions.edit) {
        return (
            <>
                <PageHeader title="Shift Assignment Tool" pageTitle="Shift & Attendance" />
                <Card className="px-5 py-8 text-center">
                    <p className="text-sm text-tertiary">You do not have access to the Shift Assignment Tool.</p>
                </Card>
            </>
        );
    }

    return (
        <>
            <PageHeader
                title="Shift Assignment Tool"
                pageTitle="Shift & Attendance"
                description="Bulk-assign a shift or a shift schedule to many employees at once, or bulk-approve/reject Shift Requests. One employee's or request's failure never blocks the rest."
            />

            <Card className="flex flex-col gap-5 p-5">
                <div className="max-w-xs">
                    <label className="text-sm font-medium text-secondary" htmlFor="sat-action">Action</label>
                    <NativeSelect id="sat-action" value={action} onChange={(e) => { setAction(e.target.value); setResults(null); }} options={ACTIONS} />
                </div>

                {action !== "process-requests" && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                        {action === "assign-shift" && (
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-secondary" htmlFor="sat-shift-type">Shift Type</label>
                                <NativeSelect id="sat-shift-type" value={shiftTypeId} onChange={(e) => setShiftTypeId(e.target.value)}
                                    options={[{ value: "", label: "Select a Shift Type…" }, ...shiftTypes.map((s) => ({ value: s._id, label: s.shiftTypeName }))]} />
                            </div>
                        )}
                        {action === "assign-schedule" && (
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-secondary" htmlFor="sat-shift-schedule">Shift Schedule</label>
                                <NativeSelect id="sat-shift-schedule" value={shiftScheduleId} onChange={(e) => setShiftScheduleId(e.target.value)}
                                    options={[{ value: "", label: "Select a Shift Schedule…" }, ...shiftSchedules.map((s) => ({ value: s._id, label: s.frequency }))]} />
                            </div>
                        )}
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-secondary" htmlFor="sat-shift-location">Shift Location (optional)</label>
                            <NativeSelect id="sat-shift-location" value={shiftLocationId} onChange={(e) => setShiftLocationId(e.target.value)}
                                options={[{ value: "", label: "No location" }, ...shiftLocations.map((s) => ({ value: s._id, label: s.locationName }))]} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-secondary" htmlFor="sat-start-date">Start Date</label>
                            <Input id="sat-start-date" type="date" value={startDate} onChange={(v) => setStartDate(v)} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium text-secondary" htmlFor="sat-end-date">End Date (optional)</label>
                            <Input id="sat-end-date" type="date" value={endDate} onChange={(v) => setEndDate(v)} />
                        </div>
                    </div>
                )}

                {action !== "process-requests" ? (
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-3">
                            <Input className="max-w-xs" placeholder="Search employees by name or code…" value={search} onChange={(v) => setSearch(v)} />
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
                                            <Checkbox isSelected={selectedIds.has(emp._id)} onChange={() => toggleEmployee(emp._id)} />
                                            <span className="text-sm text-primary">{emp.employeeName}</span>
                                            <span className="text-xs text-tertiary">{emp.employeeCode}</span>
                                        </li>
                                    ))}
                                    {filteredEmployees.length === 0 && <li className="p-4 text-sm text-tertiary">No employees match this search.</li>}
                                </ul>
                            )}
                        </div>
                        <div>
                            <Button color="primary" onClick={action === "assign-shift" ? runAssign : runAssignSchedule} isLoading={running} isDisabled={running}>
                                Run
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="text-sm font-medium text-secondary" htmlFor="sat-decision">Decision</label>
                            <NativeSelect id="sat-decision" value={decision} onChange={(e) => setDecision(e.target.value)}
                                options={[{ value: "approve", label: "Approve" }, { value: "reject", label: "Reject" }]} />
                            <Badge size="sm" color="brand">{selectedRequestIds.size} selected</Badge>
                        </div>
                        <div className="max-h-96 overflow-y-auto rounded-lg border border-secondary">
                            {loading ? (
                                <p className="p-4 text-sm text-tertiary">Loading open Shift Requests…</p>
                            ) : (
                                <ul className="divide-y divide-secondary">
                                    {openRequests.map((req) => (
                                        <li key={req._id} className="flex items-center gap-3 px-4 py-2">
                                            <Checkbox isSelected={selectedRequestIds.has(req._id)} onChange={() => toggleRequest(req._id)} />
                                            <span className="text-sm text-primary">{req.employeeIdLabel || req.employeeId}</span>
                                            <span className="text-xs text-tertiary">{req.shiftTypeIdLabel || req.shiftTypeId} — {req.fromDate?.slice?.(0, 10)} to {req.toDate ? req.toDate.slice(0, 10) : "open-ended"}</span>
                                        </li>
                                    ))}
                                    {openRequests.length === 0 && <li className="p-4 text-sm text-tertiary">No open Shift Requests.</li>}
                                </ul>
                            )}
                        </div>
                        <div>
                            <Button color="primary" onClick={runProcessRequests} isLoading={running} isDisabled={running}>Run</Button>
                        </div>
                    </div>
                )}

                {results && (
                    <div className="rounded-lg border border-secondary">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-secondary text-left text-tertiary">
                                    <th className="px-4 py-2">Item</th>
                                    <th className="px-4 py-2">Result</th>
                                    <th className="px-4 py-2">Detail</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((row, idx) => {
                                    const employee = employees.find((e) => e._id === row.employeeId);
                                    return (
                                        <tr key={idx} className="border-b border-secondary last:border-b-0">
                                            <td className="px-4 py-2">{employee?.employeeName || row.employeeId || row.shiftRequestId}</td>
                                            <td className="px-4 py-2">{row.success ? <Badge size="sm" color="success">Success</Badge> : <Badge size="sm" color="error">Failed</Badge>}</td>
                                            <td className="px-4 py-2 text-tertiary">{row.error || row.shiftAssignmentId || row.shiftScheduleAssignmentId || row.status || "—"}</td>
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

export default ShiftAssignmentTool;
