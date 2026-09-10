import { AlertTriangle, CheckCircle, XCircle } from "@untitledui/icons";
import { cx } from "@/utils/cx";

/**
 * The traffic-light checklist beside the SEO editor.
 *
 * Every line says what to do, not which rule fired — "Links shared to WhatsApp
 * will show a blank card" is actionable in a way that "og:image missing" is
 * not, and the person filling this in is usually not an engineer.
 *
 * Scoring rules live in @demo-panel/shared/seo so the server and this panel
 * cannot disagree about whether a page is in good shape.
 */

const LEVELS = {
    pass: { Icon: CheckCircle, className: "text-fg-success-primary" },
    warn: { Icon: AlertTriangle, className: "text-fg-warning-primary" },
    fail: { Icon: XCircle, className: "text-fg-error-primary" },
};

const VERDICTS = {
    good: { label: "Looking good", bar: "bg-success-solid", text: "text-success-primary" },
    ok: { label: "Needs work", bar: "bg-warning-solid", text: "text-warning-primary" },
    bad: { label: "Not ready", bar: "bg-error-solid", text: "text-error-primary" },
};

const SeoHealth = ({ health }) => {
    const verdict = VERDICTS[health.level] ?? VERDICTS.bad;
    const failing = health.checks.filter((check) => check.level !== "pass").length;

    return (
        <div>
            <div className="flex items-baseline justify-between gap-3">
                <span className={cx("text-sm font-semibold", verdict.text)}>{verdict.label}</span>
                <span className="text-xs text-tertiary tabular-nums">
                    {failing === 0 ? "All checks passed" : `${failing} to look at`}
                </span>
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-quaternary">
                <div
                    className={cx("h-full rounded-full transition-all", verdict.bar)}
                    style={{ width: `${health.score}%` }}
                />
            </div>

            <ul className="mt-3 flex flex-col gap-2.5">
                {/* Problems first — nobody scrolls past six green ticks to find
                    the one thing that is wrong. */}
                {[...health.checks]
                    .sort((a, b) => {
                        const rank = { fail: 0, warn: 1, pass: 2 };
                        return rank[a.level] - rank[b.level];
                    })
                    .map((check) => {
                        const { Icon, className } = LEVELS[check.level] ?? LEVELS.fail;
                        return (
                            <li key={check.id} className="flex gap-2">
                                <Icon className={cx("mt-0.5 size-4 shrink-0", className)} />
                                <div className="min-w-0">
                                    <p
                                        className={cx(
                                            "text-sm",
                                            check.level === "pass" ? "text-tertiary" : "font-medium text-secondary",
                                        )}
                                    >
                                        {check.label}
                                    </p>
                                    {check.detail && <p className="text-xs text-tertiary">{check.detail}</p>}
                                </div>
                            </li>
                        );
                    })}
            </ul>
        </div>
    );
};

export default SeoHealth;
