/**
 * Employee Checkin register (ADR-042). The server computes each day's status
 * code and the admin shows its label and tiles, so the codes must match
 * character-for-character.
 */
export const REGISTER_CODES = Object.freeze({
    PR: "Present",
    AB: "Absent",
    HD: "Half Day",
    WFH: "Work From Home",
    LV: "Leave",
    LWP: "Leave Without Pay",
    WO: "Weekly Off",
    HO: "Holiday",
});

/**
 * Employee "Shift" preference (ADR-018): a descriptive field, one value per
 * shift the business runs — Day, Night, UK and USA (19:30–04:30 IST). The
 * Employee model's enum and the Employee form's options both read this list.
 */
export const SHIFT_PREFERENCES = Object.freeze(["Day", "Night", "UK", "USA"]);

/**
 * The business's time zone. Shift times are wall-clock strings and punches
 * are instants; both sides read the register on this clock. No setting
 * stores a time zone yet (OPEN-QUESTIONS Q-34), so it is fixed here.
 */
export const COMPANY_TIME_ZONE = "Asia/Kolkata";
