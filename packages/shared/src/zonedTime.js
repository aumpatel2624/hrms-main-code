/**
 * ADR-042. Wall-clock <-> instant conversion for an IANA time zone, on the
 * built-in Intl data — no time zone library. Shift times are wall-clock
 * strings ("09:30") and punches are instants, so comparing them needs the
 * zone the register is read in; the check-in form enters punches on that
 * same wall clock.
 */
const formatters = new Map();
const formatterFor = (timeZone) => {
    if (!formatters.has(timeZone)) {
        formatters.set(timeZone, new Intl.DateTimeFormat("en-US", {
            timeZone, hourCycle: "h23",
            year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
        }));
    }
    return formatters.get(timeZone);
};

/** Milliseconds `timeZone` is ahead of UTC at `instant`. */
export const zoneOffsetMs = (instant, timeZone) => {
    const time = Math.floor(+new Date(instant) / 1000) * 1000;
    const parts = Object.fromEntries(formatterFor(timeZone).formatToParts(new Date(time)).map((part) => [part.type, part.value]));
    return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second) - time;
};

/** The wall clock in `timeZone` at `instant`, as "YYYY-MM-DDTHH:mm" — a datetime-local input's value. */
export const zonedDateTimeKey = (instant, timeZone) =>
    new Date(+new Date(instant) + zoneOffsetMs(instant, timeZone)).toISOString().slice(0, 16);

/** The calendar date ("YYYY-MM-DD") the wall clock in `timeZone` shows at `instant`. */
export const zonedDateKey = (instant, timeZone) => zonedDateTimeKey(instant, timeZone).slice(0, 10);

/**
 * The instant at which the wall clock in `timeZone` reads `minutes` past
 * midnight on `dateKey`. `minutes` may be negative or past 1440 (a buffer
 * before midnight, a shift ending the next day). The second pass corrects
 * for a daylight-saving change between the guess and the answer.
 */
export const zonedWallTime = (dateKey, minutes, timeZone) => {
    const wall = Date.parse(`${dateKey}T00:00:00Z`) + minutes * 60000;
    const first = wall - zoneOffsetMs(wall, timeZone);
    return new Date(wall - zoneOffsetMs(first, timeZone));
};

/** The instant a "YYYY-MM-DDTHH:mm" wall-clock value in `timeZone` names — zonedDateTimeKey's inverse. */
export const fromZonedDateTimeKey = (value, timeZone) =>
    zonedWallTime(value.slice(0, 10), Number(value.slice(11, 13)) * 60 + Number(value.slice(14, 16)), timeZone);
