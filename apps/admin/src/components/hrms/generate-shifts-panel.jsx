import { useState } from "react";
import { generateShiftAssignments } from "../../api/shiftAttendance.api";

export const GenerateShiftsPanel = ({ id }) => {
    const [endDate, setEndDate] = useState("");
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);
    const generate = async () => {
        setBusy(true);
        try {
            const response = await generateShiftAssignments(id, endDate ? { endDate } : {});
            setResult(response.data.data);
        } catch (error) { setResult({ message: error.response?.data?.message || "Could not generate shifts" }); }
        finally { setBusy(false); }
    };
    return <section className="rounded-xl border border-secondary p-4 text-primary">
        <h3 className="font-semibold">Generate shift assignments</h3>
        <p className="text-sm text-tertiary">Starts at the saved next generation date. Leave the end date blank to generate through 90 days later. Save edits before generating.</p>
        <label className="mt-3 block">End date <input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="rounded border border-secondary bg-primary p-2" /></label>
        <button type="button" disabled={busy} onClick={generate} className="mt-3 rounded bg-brand-solid px-4 py-2 text-white">{busy ? "Generating…" : "Generate shifts"}</button>
        {result?.message && <p role="alert">{result.message}</p>}
        {result?.results && <div role="status">
            <p>Next generation date: {result.createShiftsAfter?.slice(0, 10)}</p>
            <ul>{result.results.map((row, i) => <li key={i}>{row.startDate.slice(0, 10)} – {row.endDate.slice(0, 10)}: {row.success ? "Created" : row.message}</li>)}</ul>
        </div>}
    </section>;
};
