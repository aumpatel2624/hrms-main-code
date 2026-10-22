import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ChevronLeft, ChevronRight, List } from "@untitledui/icons";
import { COMPANY_TIME_ZONE, REGISTER_CODES } from "@demo-panel/shared/attendance";
import { zonedDateKey } from "@demo-panel/shared/zonedTime";
import { MenuContext } from "../../context/MenuContext";
import { deleteEmployeeCheckin, getCheckinRegisterEmployees, getEmployeeCheckinRegister } from "../../api/shiftAttendance.api";
import { Card, PageHeader, RowActions } from "@/components/ui/page";
import { ConfirmModal, FormModal } from "@/components/ui/modal";
import { SelectField } from "@/components/ui/field";
import ReferenceErrorModal from "@/components/ui/reference-error-modal";
import DeleteBlockedModal from "@/components/ui/delete-blocked-modal";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { NativeSelect } from "@/components/base/select/select-native";
import { BadgeWithDot } from "@/components/base/badges/badges";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { cx } from "@/utils/cx";

/**
 * ADR-042. The Employee Checkin screen is a daily attendance register: one
 * employee, one month, one row per day, computed by
 * POST /employee-checkins/register. Clicking a date opens that day's punches,
 * where they can be viewed, edited and deleted; adding still goes through the
 * check-in form, and the flat list of every punch lives on at
 * /employee-checkin/all.
 */

const STATUS_COLOR = {
    PR: "success",
    AB: "error",
    HD: "orange",
    WFH: "blue",
    LV: "indigo",
    LWP: "pink",
    WO: "warning",
    HO: "purple",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const shiftMonth = (key, by) => {
    const [year, month] = key.split("-").map(Number);
    return monthKey(new Date(year, month - 1 + by, 1));
};
const monthLabel = (key) => {
    const [year, month] = key.split("-").map(Number);
    return `${MONTHS[month - 1]} ${year}`;
};
// "2026-09-21" → "21-Sep-26"
const dateLabel = (key) => `${key.slice(8, 10)}-${MONTHS[Number(key.slice(5, 7)) - 1]}-${key.slice(2, 4)}`;
// The register is read on the company's clock, the same one the server computes it on (ADR-042).
const timeLabel = (value) =>
    value ? new Date(value).toLocaleTimeString("en-US", { timeZone: COMPANY_TIME_ZONE, hour: "numeric", minute: "2-digit" }) : "";
const dateTimeLabel = (value) => (value ? `${dateLabel(zonedDateKey(value, COMPANY_TIME_ZONE))} ${timeLabel(value)}` : "");
// Shift Type times are wall-clock "HH:mm" strings.
const clockLabel = (time) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":").map(Number);
    return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
};
const hoursLabel = (minutes) => (minutes == null ? "" : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`);

const StatusCode = ({ code }) =>
    code ? (
        <BadgeWithDot size="sm" type="modern" color={STATUS_COLOR[code] ?? "gray"}>
            {code}
        </BadgeWithDot>
    ) : (
        <span className="text-quaternary">—</span>
    );

const COLUMNS = [
    "Date", "Day", "Shift", "Shift in", "Shift out", "In time", "Out time", "First half", "Second half",
    "Portion", "Late in", "Gross hrs", "Net punch hrs", "Break hrs",
];

const EmployeeCheckinRegister = () => {
    const { currentPagePermissions } = useContext(MenuContext);
    const navigate = useNavigate();

    const [employees, setEmployees] = useState([]);
    const [employeeId, setEmployeeId] = useState("");
    const [month, setMonth] = useState(() => zonedDateKey(new Date(), COMPANY_TIME_ZONE).slice(0, 7));
    const [register, setRegister] = useState(null);
    const [loading, setLoading] = useState(true);
    const [openDate, setOpenDate] = useState(null);

    const [removeId, setRemoveId] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [referenceData, setReferenceData] = useState(null);
    const [blocked, setBlocked] = useState(null);

    useEffect(() => {
        getCheckinRegisterEmployees()
            .then((res) => {
                const data = res.data?.data ?? {};
                setEmployees(data.employees ?? []);
                setEmployeeId(data.selfId ?? data.employees?.[0]?._id ?? "");
                if (!data.selfId && !data.employees?.length) setLoading(false);
            })
            .catch((err) => {
                console.log(err);
                setLoading(false);
            });
    }, []);

    // Only the latest request may fill the table: an earlier, slower one is for a month or employee no longer selected.
    const latestRequest = useRef(0);
    const fetchRegister = async () => {
        if (!employeeId) return;
        const request = ++latestRequest.current;
        setLoading(true);
        let data = null;
        try {
            const res = await getEmployeeCheckinRegister({ employeeId, month });
            data = res.data?.data ?? null;
        } catch (err) {
            if (request !== latestRequest.current) return;
            console.log(err);
            toast.error(err.response?.data?.message || "Could not load the register");
        }
        if (request !== latestRequest.current) return;
        setRegister(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchRegister();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employeeId, month]);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await deleteEmployeeCheckin(removeId);
            if (res?.data && res.data.isOk === false) {
                setBlocked({ message: res.data.message, services: res.data.data });
                return;
            }
            toast.success("Employee Checkin removed successfully");
            fetchRegister();
        } catch (err) {
            console.log(err);
            if (err.response?.status === 409) setReferenceData(err.response.data);
            else toast.error("Failed to delete employee checkin. Please try again.");
        } finally {
            setRemoveId("");
            setIsDeleting(false);
        }
    };

    const monthOptions = useMemo(() => {
        const current = zonedDateKey(new Date(), COMPANY_TIME_ZONE).slice(0, 7);
        return Array.from({ length: 27 }, (_, i) => shiftMonth(current, 2 - i)).map((key) => ({ value: key, label: monthLabel(key) }));
    }, []);
    const today = zonedDateKey(new Date(), COMPANY_TIME_ZONE);
    const days = register?.days ?? [];
    const openDay = days.find((day) => day.date === openDate);
    const counts = Object.keys(REGISTER_CODES).filter((code) => register?.summary?.[code]);
    const employeeName = employees.find((row) => row._id === employeeId)?.employeeName ?? register?.employee?.employeeName;

    document.title = "Employee Checkin | Apidel HRMS";

    return (
        <>
            <PageHeader
                title="Employee Checkin"
                pageTitle="Shift & Attendance"
                description="One employee's attendance for a month, day by day. Click a date to see, edit or delete that day's punches."
                tog_list={() => navigate("/employee-checkin/add")}
                showAddButton={currentPagePermissions.write}
                addLabel="Add Employee Checkin"
                actions={
                    <Button color="secondary" iconLeading={List} onClick={() => navigate("/employee-checkin/all")}>
                        All punches
                    </Button>
                }
            />

            <Card className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    {employees.length > 1 ? (
                        <SelectField
                            label="Employee"
                            className="w-full sm:w-72"
                            options={employees.map((row) => ({ value: row._id, label: row.employeeCode ? `${row.employeeName} (${row.employeeCode})` : row.employeeName }))}
                            value={employeeId}
                            onChange={(option) => option && setEmployeeId(option.value)}
                        />
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            <span className="text-sm font-medium text-secondary">Employee</span>
                            <span className="text-md font-semibold text-primary">{employeeName || "No employee record linked to this login"}</span>
                        </div>
                    )}
                    <div className="flex items-end gap-1">
                        <ButtonUtility size="sm" color="secondary" icon={ChevronLeft} tooltip="Previous month" aria-label="Previous month" onClick={() => setMonth((key) => shiftMonth(key, -1))} />
                        <NativeSelect
                            label="Month"
                            selectClassName="min-w-36"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            options={monthOptions.some((option) => option.value === month) ? monthOptions : [{ value: month, label: monthLabel(month) }, ...monthOptions]}
                        />
                        <ButtonUtility size="sm" color="secondary" icon={ChevronRight} tooltip="Next month" aria-label="Next month" onClick={() => setMonth((key) => shiftMonth(key, 1))} />
                    </div>
                </div>

                {counts.length > 0 && (
                    <ul aria-label="Days by status" className="flex flex-wrap gap-2">
                        {counts.map((code) => (
                            <li key={code} className="flex min-w-18 flex-col gap-1 rounded-lg px-3 py-2 ring-1 ring-secondary" title={REGISTER_CODES[code]}>
                                <StatusCode code={code} />
                                <span className="text-lg font-semibold text-primary">{register.summary[code]}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <Card className="overflow-hidden">
                <div className="max-h-[70vh] overflow-auto">
                    <table className="w-full min-w-[1100px] text-sm">
                        <thead className="sticky top-0 z-10 bg-secondary">
                            <tr className="border-b border-secondary text-left text-xs font-semibold text-tertiary">
                                {COLUMNS.map((name, index) => (
                                    <th key={name} scope="col" className={cx("whitespace-nowrap px-3 py-3", index >= 9 && "text-right")}>
                                        {name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={COLUMNS.length} className="py-10">
                                        <LoadingIndicator type="line-simple" size="sm" label="Loading register" />
                                    </td>
                                </tr>
                            )}
                            {!loading && days.length === 0 && (
                                <tr>
                                    <td colSpan={COLUMNS.length} className="px-3 py-10 text-center text-tertiary">
                                        {employeeId ? "The register could not be loaded." : "There is no employee whose register you can view."}
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                days.map((day) => (
                                    <tr
                                        key={day.date}
                                        className={cx(
                                            "border-b border-secondary last:border-b-0",
                                            (day.firstHalf === "WO" || day.firstHalf === "HO") && "bg-secondary/60",
                                            day.date === today && "bg-brand-primary_alt",
                                        )}
                                    >
                                        <td className="whitespace-nowrap px-3 py-2.5">
                                            <button
                                                type="button"
                                                onClick={() => setOpenDate(day.date)}
                                                className="rounded-sm font-medium text-brand-secondary underline-offset-2 outline-focus-ring hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                                            >
                                                {dateLabel(day.date)}
                                            </button>
                                            {day.date === today && <span className="ml-2 text-xs font-semibold text-brand-secondary">Today</span>}
                                        </td>
                                        <td className="px-3 py-2.5 text-tertiary">{day.weekday}</td>
                                        <td className="whitespace-nowrap px-3 py-2.5 text-secondary">{day.shift?.name ?? ""}</td>
                                        <td className="whitespace-nowrap px-3 py-2.5 text-tertiary">{clockLabel(day.shift?.startTime)}</td>
                                        <td className="whitespace-nowrap px-3 py-2.5 text-tertiary">{clockLabel(day.shift?.endTime)}</td>
                                        <td className="whitespace-nowrap px-3 py-2.5 text-primary">{timeLabel(day.inTime)}</td>
                                        <td className="whitespace-nowrap px-3 py-2.5 text-primary">{timeLabel(day.outTime)}</td>
                                        <td className="px-3 py-2.5" title={day.note ?? REGISTER_CODES[day.firstHalf]}>
                                            <StatusCode code={day.firstHalf} />
                                        </td>
                                        <td className="px-3 py-2.5" title={REGISTER_CODES[day.secondHalf]}>
                                            <StatusCode code={day.secondHalf} />
                                        </td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-secondary">{day.portion == null ? "" : day.portion.toFixed(2)}</td>
                                        <td className={cx("px-3 py-2.5 text-right tabular-nums", day.lateInMinutes > 0 ? "font-medium text-error-primary" : "text-secondary")}>
                                            {hoursLabel(day.lateInMinutes)}
                                        </td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-secondary">{hoursLabel(day.grossMinutes)}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-secondary">{hoursLabel(day.netPunchMinutes)}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums text-secondary">{hoursLabel(day.breakMinutes)}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-tertiary">
                {Object.entries(REGISTER_CODES).map(([code, label]) => (
                    <span key={code}>
                        <span className="font-semibold text-secondary">{code}</span> {label}
                    </span>
                ))}
                <span>Times are {COMPANY_TIME_ZONE} time; hours are shown as hours:minutes.</span>
            </p>

            <FormModal
                isOpen={Boolean(openDay)}
                onClose={() => setOpenDate(null)}
                size="xl"
                title={
                    openDay?.shift
                        ? `Shift [${openDay.shift.name}] Time: ${dateTimeLabel(openDay.cutOffStart)} – ${dateTimeLabel(openDay.cutOffEnd)} [As per cut-off time]`
                        : `No shift · ${openDay ? dateLabel(openDay.date) : ""}`
                }
            >
                {openDay && (
                    <>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className="text-md font-semibold text-primary">Daily in/out punches</h3>
                            <div className="flex items-center gap-2 text-sm text-tertiary">
                                <StatusCode code={openDay.firstHalf} />
                                {openDay.secondHalf && <StatusCode code={openDay.secondHalf} />}
                                {openDay.note && <span>{openDay.note}</span>}
                            </div>
                        </div>
                        <div className="overflow-x-auto rounded-lg ring-1 ring-secondary">
                            <table className="w-full min-w-[640px] text-sm">
                                <thead className="bg-secondary">
                                    <tr className="border-b border-secondary text-left text-xs font-semibold text-tertiary">
                                        <th scope="col" className="px-3 py-2.5">Date</th>
                                        <th scope="col" className="px-3 py-2.5">Entry time</th>
                                        <th scope="col" className="px-3 py-2.5">In/Out</th>
                                        <th scope="col" className="px-3 py-2.5">Device</th>
                                        <th scope="col" className="px-3 py-2.5">Location</th>
                                        <th scope="col" className="px-3 py-2.5">Recorded at</th>
                                        <th scope="col" className="px-3 py-2.5">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {openDay.punches.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="px-3 py-6 text-center text-tertiary">
                                                No punches recorded for this day.
                                            </td>
                                        </tr>
                                    )}
                                    {openDay.punches.map((punch) => (
                                        <tr key={punch._id} className="border-b border-secondary last:border-b-0">
                                            <td className="whitespace-nowrap px-3 py-2 text-secondary">{dateLabel(zonedDateKey(punch.time, COMPANY_TIME_ZONE))}</td>
                                            <td className="whitespace-nowrap px-3 py-2 font-medium text-primary">{timeLabel(punch.time)}</td>
                                            <td className="px-3 py-2 text-secondary">{punch.logType === "IN" ? "In" : punch.logType === "OUT" ? "Out" : "—"}</td>
                                            <td className="whitespace-nowrap px-3 py-2 text-secondary">{punch.deviceId || "—"}</td>
                                            <td className="whitespace-nowrap px-3 py-2 tabular-nums text-secondary">
                                                {punch.latitude != null && punch.longitude != null ? `${punch.latitude}, ${punch.longitude}` : "—"}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2 text-tertiary">{dateTimeLabel(punch.createdAt)}</td>
                                            <td className="px-3 py-2">
                                                <RowActions
                                                    canEdit={currentPagePermissions.edit}
                                                    canDelete={currentPagePermissions.delete}
                                                    onView={() => navigate(`/employee-checkin/${punch._id}`)}
                                                    onEdit={() => navigate(`/employee-checkin/${punch._id}/edit`)}
                                                    onRemove={() => setRemoveId(punch._id)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-tertiary">
                            In {timeLabel(openDay.inTime) || "—"} · Out {timeLabel(openDay.outTime) || "—"} · Net punch {hoursLabel(openDay.netPunchMinutes) || "—"} · Break{" "}
                            {hoursLabel(openDay.breakMinutes) || "—"}
                        </p>
                    </>
                )}
            </FormModal>

            <ConfirmModal
                isOpen={Boolean(removeId)}
                onClose={() => setRemoveId("")}
                onConfirm={handleDelete}
                isLoading={isDeleting}
                description="Are you sure you want to remove this employee checkin?"
            />

            <ReferenceErrorModal
                isOpen={Boolean(referenceData)}
                toggle={() => setReferenceData(null)}
                title="Cannot Delete Employee Checkin"
                referenceData={referenceData}
            />

            <DeleteBlockedModal
                isOpen={Boolean(blocked)}
                toggle={() => setBlocked(null)}
                title="Unable to Delete Employee Checkin"
                message={blocked?.message}
                services={blocked?.services}
            />
        </>
    );
};

export default EmployeeCheckinRegister;
