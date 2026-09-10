import { useCallback, useEffect, useState } from "react";

const KEY = (entity) => `demo-panel:table:${entity}`;

const read = (entity) => {
    try {
        return JSON.parse(localStorage.getItem(KEY(entity)) ?? "{}");
    } catch {
        return {};
    }
};

/**
 * Per-entity table preferences (column order, hidden columns, widths, last
 * used filters), persisted in localStorage.
 *
 * Reads are guarded because localStorage throws in private mode on some
 * browsers, and a corrupt entry shouldn't take the page down.
 */
export const useTablePrefs = (entity, defaults = {}) => {
    const [prefs, setPrefs] = useState(() => ({ ...defaults, ...read(entity) }));

    useEffect(() => {
        setPrefs({ ...defaults, ...read(entity) });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entity]);

    const update = useCallback(
        (patch) =>
            setPrefs((prev) => {
                const next = { ...prev, ...(typeof patch === "function" ? patch(prev) : patch) };
                try {
                    localStorage.setItem(KEY(entity), JSON.stringify(next));
                } catch {
                    /* storage unavailable - keep the in-memory value */
                }
                return next;
            }),
        [entity],
    );

    const reset = useCallback(() => {
        try {
            localStorage.removeItem(KEY(entity));
        } catch {
            /* ignore */
        }
        setPrefs({ ...defaults });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entity]);

    return [prefs, update, reset];
};
