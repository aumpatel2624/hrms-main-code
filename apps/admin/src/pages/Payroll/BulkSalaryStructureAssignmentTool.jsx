import { useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { MenuContext } from "../../context/MenuContext";
import { getAllSalaryStructures } from "../../api/payroll.api";
import { getEligibleEmployeesForBulkAssignment, bulkAssignSalaryStructure } from "../../api/payroll.api";
import { getAllCompanies, getAllEmploymentTypes, getAllEmployeeGrades } from "../../api/organizationSetup.api";
import { getAllDepartments } from "../../api/departments.api";
import { Card, PageHeader } from "@/components/ui/page";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { NativeSelect } from "@/components/base/select/select-native";
import { Input } from "@/components/base/input/input";
import { Badge } from "@/components/base/badges/badges";

/**
 * ADR-026 (Payroll — Structure & Assignment): Bulk Salary Structure
 * Assignment is a stateless bulk-action tool in source (a Frappe Single
 * with no toolbar) — no stored model, no entity-config CRUD screen, same
 * "lightweight custom admin page" shape as Leave Control Panel / Shift
 * Assignment Tool. Two steps: find eligible employees for a From Date (plus
 * optional company/department/grade/employment-type filters — the server
 * excludes anyone who already has an assignment with that exact From Date),
 * then assign a Salary Structure to the selected ones. Each employee is
 * created independently, so one failure never blocks the rest.
 */
const BulkSalaryStructureAssignmentTool = () => {
    const { currentPagePermissions } = useContext(MenuContext);

    const [structures, setStructures] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [grades, setGrades] = useState([]);
    const [employmentTypes, setEmploymentTypes] = useState([]);

    const [fromDate, setFromDate] = useState("");
    const [companyId, setCompanyId] = useState("");
    const [departmentId, setDepartmentId] = useState("");
    const [gradeId, setGradeId] = useState("");
    const [employmentTypeId, setEmploymentTypeId] = useState("");

    const [salaryStructureId, setSalaryStructureId] = useState("");
    const [base, setBase] = useState("");
    const [variable, setVariable] = useState("");

    const [eligible, setEligible] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [searching, setSearching] = useState(false);
    const [running, setRunning] = useState(false);
    const [results, setResults] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [structuresRes, companiesRes, departmentsRes, gradesRes, employmentTypesRes] = await Promise.all([
                    getAllSalaryStructures(), getAllCompanies(), getAllDepartments(), getAllEmployeeGrades(), getAllEmploymentTypes(),
                ]);
                setStructures(structuresRes.data?.data ?? []);
                setCompanies(companiesRes.data?.data ?? []);
                setDepartments(departmentsRes.data?.data ?? []);
                setGrades(gradesRes.data?.data ?? []);
                setEmploymentTypes(employmentTypesRes.data?.data ?? []);
            } catch (error) {
                console.error("Error loading Bulk Salary Structure Assignment data:", error);
                toast.error("Could not load Salary Structures/Companies/Departments/Grades");
            }
        };
        load();
    }, []);

    const findEligible = async () => {
        if (!fromDate) return toast.error("Choose a From Date first");
        setSearching(true);
        setEligible(null);
        setResults(null);
        setSelectedIds(new Set());
        try {
            const res = await getEligibleEmployeesForBulkAssignment({
                fromDate,
                companyId: companyId || undefined,
                departmentId: departmentId || undefined,
                gradeId: gradeId || undefined,
                employmentTypeId: employmentTypeId || undefined,
            });
            const rows = res.data?.data ?? [];
            setEligible(rows);
            setSelectedIds(new Set(rows.map((r) => r.employeeId)));
        } catch (error) {
            console.error("Error finding eligible employees:", error);
            toast.error(error.response?.data?.message || "Could not find eligible employees");
        } finally {
            setSearching(false);
        }
    };

    const toggleEmployee = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const run = async () => {
        if (!salaryStructureId) return toast.error("Choose a Salary Structure first");
        if (selectedIds.size === 0) return toast.error("Please select at least one employee to perform this action");

        setRunning(true);
        setResults(null);
        try {
            const res = await bulkAssignSalaryStructure({
                employeeIds: [...selectedIds],
                salaryStructureId,
                fromDate,
                base: base === "" ? undefined : Number(base),
                variable: variable === "" ? undefined : Number(variable),
            });
            const rows = res.data?.data?.results ?? [];
            setResults(rows);
            const successCount = rows.filter((r) => r.success).length;
            toast.success(`${successCount} of ${rows.length} succeeded`);
        } catch (error) {
            console.error("Error running Bulk Salary Structure Assignment:", error);
            toast.error(error.response?.data?.message || "Run failed");
        } finally {
            setRunning(false);
        }
    };

    document.title = "Bulk Salary Structure Assignment | Demo Panel";

    if (!currentPagePermissions.edit) {
        return (
            <>
                <PageHeader title="Bulk Salary Structure Assignment" pageTitle="Payroll" />
                <Card className="px-5 py-8 text-center">
                    <p className="text-sm text-tertiary">You do not have access to the Bulk Salary Structure Assignment tool.</p>
                </Card>
            </>
        );
    }

    return (
        <>
            <PageHeader
                title="Bulk Salary Structure Assignment"
                pageTitle="Payroll"
                description="Find employees eligible for a From Date, then assign the same Salary Structure to as many as you select at once. One employee's failure (e.g. an existing assignment for that exact date) never blocks the rest."
            />

            <Card className="flex flex-col gap-5 p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-secondary" htmlFor="bssa-from-date">From Date</label>
                        <Input id="bssa-from-date" type="date" value={fromDate} onChange={(v) => setFromDate(v)} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-secondary" htmlFor="bssa-company">Company (optional)</label>
                        <NativeSelect id="bssa-company" value={companyId} onChange={(e) => setCompanyId(e.target.value)}
                            options={[{ value: "", label: "Any company…" }, ...companies.map((c) => ({ value: c._id, label: c.companyName }))]} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-secondary" htmlFor="bssa-department">Department (optional)</label>
                        <NativeSelect id="bssa-department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}
                            options={[{ value: "", label: "Any department…" }, ...departments.map((d) => ({ value: d._id, label: d.departmentName }))]} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-secondary" htmlFor="bssa-grade">Grade (optional)</label>
                        <NativeSelect id="bssa-grade" value={gradeId} onChange={(e) => setGradeId(e.target.value)}
                            options={[{ value: "", label: "Any grade…" }, ...grades.map((g) => ({ value: g._id, label: g.gradeName }))]} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-secondary" htmlFor="bssa-employment-type">Employment Type (optional)</label>
                        <NativeSelect id="bssa-employment-type" value={employmentTypeId} onChange={(e) => setEmploymentTypeId(e.target.value)}
                            options={[{ value: "", label: "Any employment type…" }, ...employmentTypes.map((t) => ({ value: t._id, label: t.employmentTypeName }))]} />
                    </div>
                    <div className="flex items-end">
                        <Button size="sm" onClick={findEligible} isLoading={searching} isDisabled={searching}>Find Eligible Employees</Button>
                    </div>
                </div>

                {eligible && (
                    <>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-secondary" htmlFor="bssa-structure">Salary Structure</label>
                                <NativeSelect id="bssa-structure" value={salaryStructureId} onChange={(e) => setSalaryStructureId(e.target.value)}
                                    options={[{ value: "", label: "Select a Salary Structure…" }, ...structures.map((s) => ({ value: s._id, label: `${s.payrollFrequency} — ${s.currency}` }))]} />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-secondary" htmlFor="bssa-base">Base (optional, applied to every selected employee)</label>
                                <Input id="bssa-base" type="number" value={base} onChange={(v) => setBase(v)} />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-medium text-secondary" htmlFor="bssa-variable">Variable (optional, applied to every selected employee)</label>
                                <Input id="bssa-variable" type="number" value={variable} onChange={(v) => setVariable(v)} />
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Badge size="sm" color="brand">{selectedIds.size} of {eligible.length} selected</Badge>
                            <Button size="sm" color="secondary" onClick={() => setSelectedIds(new Set(eligible.map((e) => e.employeeId)))}>Select all</Button>
                            <Button size="sm" color="secondary" onClick={() => setSelectedIds(new Set())}>Clear selection</Button>
                        </div>

                        <div className="max-h-96 overflow-y-auto rounded-lg border border-secondary">
                            {eligible.length === 0 ? (
                                <p className="p-4 text-sm text-tertiary">No eligible employees match these filters — everyone either isn't active as of this date, or already has an assignment for it.</p>
                            ) : (
                                <ul className="divide-y divide-secondary">
                                    {eligible.map((emp) => (
                                        <li key={emp.employeeId} className="flex items-center gap-3 px-4 py-2">
                                            <Checkbox isSelected={selectedIds.has(emp.employeeId)} onChange={() => toggleEmployee(emp.employeeId)} />
                                            <span className="text-sm text-primary">{emp.employeeName}</span>
                                            <span className="text-xs text-tertiary">{emp.employeeCode}</span>
                                            <span className="text-xs text-tertiary">default base: {emp.base}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Button color="primary" onClick={run} isLoading={running} isDisabled={running || eligible.length === 0}>
                                Assign Salary Structure
                            </Button>
                        </div>
                    </>
                )}

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
                                    const employee = (eligible || []).find((e) => e.employeeId === row.employeeId);
                                    return (
                                        <tr key={`${row.employeeId}-${idx}`} className="border-b border-secondary last:border-b-0">
                                            <td className="px-4 py-2">{employee?.employeeName || row.employeeId}</td>
                                            <td className="px-4 py-2">
                                                {row.success ? <Badge size="sm" color="success">Success</Badge> : <Badge size="sm" color="error">Failed</Badge>}
                                            </td>
                                            <td className="px-4 py-2 text-tertiary">{row.error || row.salaryStructureAssignmentId || "—"}</td>
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

export default BulkSalaryStructureAssignmentTool;
