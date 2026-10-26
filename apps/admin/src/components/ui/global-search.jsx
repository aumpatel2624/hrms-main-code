import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SearchLg, X as XClose } from "@untitledui/icons";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Input } from "@/components/base/input/input";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { UNIFORM_ENTITIES } from "@/entities";
import { ADVANCED_ENTITIES, employeeCheckinConfig } from "@/entities/advanced";
import { globalSearch } from "@/api/globalSearch.api";
import { cx } from "@/utils/cx";

const MIN_TERM = 2;
const MAX_TERM = 100;
const DEBOUNCE_MS = 300;

// The server answers with each screen's menuUrl, which is its entity config's
// `path` — that config supplies the group label, the row title and the link.
// Employee Checkin's list route is the register page, but its view route is
// still the config's, so its punches open like any other record.
const CONFIG_BY_PATH = new Map([...UNIFORM_ENTITIES, ...ADVANCED_ENTITIES, employeeCheckinConfig].map((config) => [config.path, config]));

const asText = (value) => (typeof value === "string" || typeof value === "number" ? String(value).trim() : "");

/** "name or code" plus one recognisable detail, from the screen's own config. */
const describe = (config, row) => {
    const columns = (config.columns ?? []).map((column) => {
        try {
            return asText(column.selector?.(row));
        } catch {
            return "";
        }
    }).filter((value) => value && value !== "—");
    let title = "";
    try {
        title = asText(config.recordTitle?.(row));
    } catch {
        title = "";
    }
    title ||= columns[0] || config.singular;
    const detail = columns.find((value) => !title.includes(value)) ?? "";
    return { title, detail };
};

/**
 * The search box in the layout's top bar (ADR-044). Searches every screen the
 * signed-in user can read, through POST /global-search, and lists a few
 * matches per screen; picking one opens that record's view page.
 */
const GlobalSearch = () => {
    const [query, setQuery] = useState("");
    const [state, setState] = useState({ status: "idle", groups: [], failed: 0 });
    const [open, setOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const rootRef = useRef(null);
    const inputRef = useRef(null);

    const term = query.trim();

    useEffect(() => {
        if (term.length < MIN_TERM) {
            setState({ status: "idle", groups: [], failed: 0 });
            return undefined;
        }
        const controller = new AbortController();
        setState((prev) => ({ ...prev, status: "loading" }));
        const timer = setTimeout(async () => {
            try {
                const res = await globalSearch(term, { signal: controller.signal });
                const groups = (res.data?.data ?? []).filter((group) => CONFIG_BY_PATH.has(group.screen));
                setState({ status: "done", groups, failed: res.data?.failed ?? 0 });
            } catch (err) {
                if (controller.signal.aborted) return;
                console.log(err);
                setState({ status: "error", groups: [], failed: 0 });
            }
        }, DEBOUNCE_MS);
        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [term]);

    // The phone-width row is always mounted (only hidden), so focus it by hand.
    useEffect(() => {
        if (mobileOpen) inputRef.current?.focus();
    }, [mobileOpen]);

    // Close on a click outside or Escape.
    useEffect(() => {
        if (!open && !mobileOpen) return undefined;
        const onPointer = (event) => {
            if (!rootRef.current?.contains(event.target)) {
                setOpen(false);
                setMobileOpen(false);
            }
        };
        const onKey = (event) => {
            if (event.key === "Escape") {
                setOpen(false);
                setMobileOpen(false);
            }
        };
        document.addEventListener("mousedown", onPointer);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onPointer);
            document.removeEventListener("keydown", onKey);
        };
    }, [open, mobileOpen]);

    const close = () => {
        setOpen(false);
        setMobileOpen(false);
        setQuery("");
    };

    const showPanel = open && term.length > 0;

    return (
        <>
            <ButtonUtility
                size="sm"
                color="tertiary"
                icon={SearchLg}
                tooltip="Search"
                onClick={() => {
                    setMobileOpen(true);
                    setOpen(true);
                }}
                className="sm:hidden"
            />
            <div
                ref={rootRef}
                className={cx(
                    "sm:relative sm:flex sm:w-64 sm:items-center lg:w-80",
                    mobileOpen
                        ? "absolute inset-x-0 top-0 z-40 flex h-16 items-center gap-2 border-b border-secondary bg-primary px-4 sm:h-auto sm:border-0 sm:px-0"
                        : "hidden",
                )}
            >
                <Input
                    aria-label="Search records"
                    icon={SearchLg}
                    size="sm"
                    placeholder="Search records..."
                    maxLength={MAX_TERM}
                    value={query}
                    onChange={(value) => {
                        setQuery(value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    ref={inputRef}
                    wrapperClassName="w-full"
                    className="min-w-0 flex-1"
                />
                {mobileOpen && (
                    <ButtonUtility size="sm" color="tertiary" icon={XClose} tooltip="Close search" onClick={close} className="sm:hidden" />
                )}

                {showPanel && (
                    <div
                        role="region"
                        aria-label="Search results"
                        aria-live="polite"
                        className="absolute inset-x-4 top-full z-50 mt-1 max-h-[70vh] overflow-y-auto rounded-xl bg-primary py-2 shadow-lg ring-1 ring-secondary sm:inset-x-auto sm:right-0 sm:mt-2 sm:w-[26rem] sm:max-w-[calc(100vw-2rem)]"
                    >
                        {term.length < MIN_TERM && (
                            <p className="px-4 py-3 text-sm text-tertiary">Type at least {MIN_TERM} characters to search.</p>
                        )}
                        {term.length >= MIN_TERM && state.status === "loading" && (
                            <div className="flex items-center gap-3 px-4 py-3 text-sm text-tertiary">
                                <LoadingIndicator type="line-spinner" size="sm" />
                                Searching…
                            </div>
                        )}
                        {term.length >= MIN_TERM && state.status === "error" && (
                            <p className="px-4 py-3 text-sm text-error-primary">Search failed. Please try again.</p>
                        )}
                        {term.length >= MIN_TERM && state.status === "done" && state.groups.length === 0 && (
                            <p className="px-4 py-3 text-sm text-tertiary">
                                No records match “{term}”.
                            </p>
                        )}
                        {term.length >= MIN_TERM && state.status === "done" &&
                            state.groups.map((group) => {
                                const config = CONFIG_BY_PATH.get(group.screen);
                                return (
                                    <section key={group.screen} className="py-1">
                                        <h3 className="flex items-baseline justify-between gap-2 px-4 pb-1 pt-2 text-xs font-semibold text-tertiary">
                                            <span className="truncate">{config.plural}</span>
                                            {group.count > group.rows.length && (
                                                <span className="shrink-0 font-normal text-quaternary">
                                                    {group.rows.length} of {group.count}
                                                </span>
                                            )}
                                        </h3>
                                        <ul>
                                            {group.rows.map((row) => {
                                                const { title, detail } = describe(config, row);
                                                return (
                                                    <li key={row._id}>
                                                        <Link
                                                            to={`${config.path}/${row._id}`}
                                                            onClick={close}
                                                            className="block px-4 py-2 outline-focus-ring transition hover:bg-primary_hover focus-visible:bg-primary_hover focus-visible:outline-2 focus-visible:-outline-offset-2"
                                                        >
                                                            <span className="block truncate text-sm font-medium text-primary">{title}</span>
                                                            {detail && <span className="block truncate text-xs text-tertiary">{detail}</span>}
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </section>
                                );
                            })}
                        {term.length >= MIN_TERM && state.status === "done" && state.failed > 0 && (
                            <p className="border-t border-secondary px-4 pt-2 text-xs text-tertiary">
                                Some screens could not be searched just now.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default GlobalSearch;
