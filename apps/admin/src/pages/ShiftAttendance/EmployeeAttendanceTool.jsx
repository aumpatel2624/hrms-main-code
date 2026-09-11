import { useContext, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { MenuContext } from "../../context/MenuContext";
import { getAllEmployees } from "../../api/employees.api";
import { getAllShiftTypes, bulkMarkAttendance, resolveHalfDayAttendance } from "../../api/shiftAttendance.api";
import { searchAttendances } from "../../api/attendance.api";
import { Card, PageHeader } from "@/components/ui/page";
import { Button } from "@/components/base/buttons/button";
import { NativeSelect } from "@/components/base/select/select-native";
import { Input } from "@/components/base/input/input";
import { Badge } from "@/components/base/badges/badges";
import { Checkbox } from "@/components/base/checkbox/checkbox";

/**
 * ADR-025 (module complete — second/transactional fork). Employee
 * Attendance Tool is a virtual, stateless bulk-action form in source — no
 * stored model, HR-Manager-only. Same "explicit employee-id list" judgment
 * call as the Shift Assignment Tool page.
 */
const todayIso = () => new Date().toISOString().slice(0, 10);

const EmployeeAttendanceTool = () => {
    const { currentPagePermissions } = useContext(MenuContext);

    const [employees, setEmployees] = useState([]);
    const [shiftTypes, setShiftTypes] = useState([]);
    const [loading, setLoading] = useState(true);

    // Mark Attendance
    const [date, setDate] = useState(todayIso());
    const [status, setStatus] = useState("Present");
    const [shiftId, setShiftId] = useState("");
    const [lateEntry, setLateEntry] = useState(false);
    const [earlyExit, setEarlyExit] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [marking, setMarking] = useState(false);
    const [markResults, setMarkResults] = useState(null);

    // Resolve Half Day
    const [halfDayDate, setHalfDayDate] = useState(todayIso());
    const [halfDayRows, setHalfDayRows] = useState([]);
    const [loadingHalfDay, setLoadingHalfDay] = useState(false);
    const [selectedHalfDayId, setSelectedHalfDayId] = useState("");
    const [halfDayStatus, setHalfDayStatus] = useState("Present");
    const [resolving, setResolving] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [employeesRes, shiftTypesRes] = await Promise.all([getAllEmployees(), getAllShiftTypes()]);
                setEmployees(employeesRes.data?.data ?? []);
                setShiftTypes(shiftTypesRes.data?.data ?? []);
            } catch (error) {
                console.error("Error loading Employee Attendance Tool data:", error);
                toast.error("Could not load employees/shift types");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const loadHalfDayRows = async (forDate) => {
        setLoadingHalfDay(true);
        try {
            const res = await searchAttendances({
                filters: [
                    { field: "attendanceDate", op: "eq", value: forDate },
                    { field: "status", op: "eq", value: "Half Day" },
                    { field: "halfDayStatus", op: "eq", value: "Absent" },
                ],
                per_page: 200,
            });
            setHalfDayRows(res.data?.data?.data ?? []);
        } catch (error) {
            console.error("Error loading pending Half Day attendance:", error);
            toast.error("Could not load pending Half Day attendance");
        } finally {
            setLoadingHalfDay(false);
        }
    };

    useEffect(() => { loadHalfDayRows(halfDayDate); }, [halfDayDate]); // eslint-disable-line react-hooks/exhaustive-deps

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

    const runMark = async () => {
        if (!date || !status) return toast.error("Date and Status are required");
        if (selectedIds.size === 0) return toast.error("Please select at least one employee to perform this action");

        setMarking(true);
        setMarkResults(null);
        try {
            const res = await bulkMarkAttendance({
                date, status, employeeIds: [...selectedIds],
                lateEntry, earlyExit, shift: shiftId || undefined,
            });
            const rows = res.data?.data?.results ?? [];
            setMarkResults(rows);
            toast.success(`${rows.filter((r) => r.success).length} of ${rows.length} succeeded`);
        } catch (error) {
            console.error("Error running bulk attendance marking:", error);
            toast.error(error.response?.data?.message || "Run failed");
        } finally {
            setMarking(false);
        }
    };

    const runResolveHalfDay = async () => {
        if (!selectedHalfDayId) return toast.error("Select a pending Half Day record first");
        setResolving(true);
        try {
            await resolveHalfDayAttendance({ attendanceId: selectedHalfDayId, halfDayStatus });
            toast.success("Half day status resolved");
            setSelectedHalfDayId("");
            await loadHalfDayRows(halfDayDate);
        } catch (error) {
            console.error("Error resolving half day status:", error);
            toast.error(error.response?.data?.message || "Run failed");
        } finally {
            setResolving(false);
        }
    };

    document.title = "Employee Attendance Tool | Demo Panel";

    if (!currentPagePermissions.edit) {
        return (
            <>
                <PageHeader title="Employee Attendance Tool" pageTitle="Shift & Attendance" />
                <Card className="px-5 py-8 text-center">
                    <p className="text-sm text-tertiary">You do not have access to the Employee Attendance Tool.</p>
                </Card>
            </>
        );
    }

    return (
        <>
            <PageHeader
                title="Employee Attendance Tool"
                pageTitle="Shift & Attendance"
                description="Bulk-mark Attendance for many employees on one date, or resolve a pending Half Day record's status for the other half. Half day resolution updates the record directly, bypassing Attendance's own validation — matches source's own behavior."
            />

            <Card className="flex flex-col gap-5 p-5">
                <h3 className="font-semibold text-primary">Mark Attendance</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-secondary" htmlFor="eat-date">Date</label>
                        <Input id="eat-date" type="date" value={date} onChange={(v) => setDate(v)} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-secondary" htmlFor="eat-status">Status</label>
                        <NativeSelect id="eat-status" value={status} onChange={(e) => setStatus(e.target.value)}
                            options={["Present", "Absent", "Half Day", "Work From Home"].map((s) => ({ value: s, label: s }))} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-secondary" htmlFor="eat-shift">Shift (optional)</label>
                        <NativeSelect id="eat-shift" value={shiftId} onChange={(e) => setShiftId(e.target.value)}
                            options={[{ value: "", label: "No shift" }, ...shiftTypes.map((s) => ({ value: s._id, label: s.shiftTypeName }))]} />
                    </div>
                    <div className="flex items-end gap-4 pb-2">
                        <Checkbox label="Late entry" isSelected={lateEntry} onChange={setLateEntry} />
                        <Checkbox label="Early exit" isSelected={earlyExit} onChange={setEarlyExit} />
                    </div>
                </div>

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
                        <Button color="primary" onClick={runMark} isLoading={marking} isDisabled={marking}>Mark Attendance</Button>
                    </div>
                </div>

                {markResults && (
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
                                {markResults.map((row, idx) => {
                                    const employee = employees.find((e) => e._id === row.employeeId);
                                    return (
                                        <tr key={idx} className="border-b border-secondary last:border-b-0">
                                            <td className="px-4 py-2">{employee?.employeeName || row.employeeId}</td>
                                            <td className="px-4 py-2">{row.success ? <Badge size="sm" color="success">Success</Badge> : <Badge size="sm" color="error">Failed</Badge>}</td>
                                            <td className="px-4 py-2 text-tertiary">{row.error || row.attendanceId || "—"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Card className="mt-5 flex flex-col gap-4 p-5">
                <h3 className="font-semibold text-primary">Resolve Half Day</h3>
                <div className="flex flex-wrap items-end gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-secondary" htmlFor="eat-hd-date">Date</label>
                        <Input id="eat-hd-date" type="date" value={halfDayDate} onChange={(v) => setHalfDayDate(v)} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-secondary" htmlFor="eat-hd-status">Status for other half</label>
                        <NativeSelect id="eat-hd-status" value={halfDayStatus} onChange={(e) => setHalfDayStatus(e.target.value)}
                            options={[{ value: "Present", label: "Present" }, { value: "Absent", label: "Absent" }]} />
                    </div>
                </div>

                <div className="max-h-72 overflow-y-auto rounded-lg border border-secondary">
                    {loadingHalfDay ? (
                        <p className="p-4 text-sm text-tertiary">Loading pending Half Day records…</p>
                    ) : (
                        <ul className="divide-y divide-secondary">
                            {halfDayRows.map((row) => (
                                <li key={row._id} className="flex items-center gap-3 px-4 py-2">
                                    <input type="radio" name="half-day-row" checked={selectedHalfDayId === row._id} onChange={() => setSelectedHalfDayId(row._id)} />
                                    <span className="text-sm text-primary">{row.employeeName || row.employeeIdLabel || row.employeeId}</span>
                                </li>
                            ))}
                            {halfDayRows.length === 0 && <li className="p-4 text-sm text-tertiary">No pending Half Day records for this date.</li>}
                        </ul>
                    )}
                </div>
                <div>
                    <Button color="primary" onClick={runResolveHalfDay} isLoading={resolving} isDisabled={resolving}>Resolve</Button>
                </div>
            </Card>
        </>
    );
};

export default EmployeeAttendanceTool;
