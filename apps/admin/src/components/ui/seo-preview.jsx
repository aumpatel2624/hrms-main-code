import { Globe01, Image01, Monitor01, Phone01 } from "@untitledui/icons";
import { SEO_LIMITS, textWidthPx, truncateToPx } from "@demo-panel/shared/seo";
import { cx } from "@/utils/cx";

/**
 * Simulations of how a page will appear in a Google result and as a shared
 * link. These are the reason anyone fills SEO fields in properly: a length
 * counter tells you a number, a preview tells you your title is about to be
 * cut off mid-word.
 *
 * The colours come from the --seo-* variables in globals.css rather than the
 * app's semantic tokens, because these panels are meant to look like Google
 * and Facebook, not like this admin panel. See the comment there.
 */

/** "acme.test › about" — the breadcrumb trail Google shows above a result. */
const breadcrumb = (url, path) => {
    let host = "example.com";
    try {
        if (url) host = new URL(url).host;
    } catch {
        host = "example.com";
    }
    const segments = String(path ?? "/")
        .split("/")
        .filter(Boolean);
    return [host, ...segments].join(" › ");
};

/**
 * A length bar that shows where you are against the limit, in the unit that
 * actually governs the cut-off — pixels for titles, characters for
 * descriptions. Green in range, amber outside it, red when nothing is written.
 */
export const LengthMeter = ({ label, current, min, max, unit = "px" }) => {
    const state = current === 0 ? "empty" : current < min || current > max ? "out" : "in";
    const percent = Math.min(100, Math.round((current / max) * 100));

    return (
        <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-quaternary">
                <div
                    className={cx(
                        "h-full rounded-full transition-all",
                        state === "in" && "bg-success-solid",
                        state === "out" && "bg-warning-solid",
                        state === "empty" && "bg-error-solid",
                    )}
                    style={{ width: `${Math.max(percent, current > 0 ? 4 : 0)}%` }}
                />
            </div>
            <span
                className={cx(
                    "shrink-0 text-xs tabular-nums",
                    state === "in" ? "text-tertiary" : "font-medium text-warning-primary",
                )}
            >
                {current} / {max} {unit}
            </span>
            <span className="sr-only">{label}</span>
        </div>
    );
};

/** Small segmented control used to flip a preview between two renderings. */
export const PreviewToggle = ({ options, value, onChange }) => (
    <div className="flex items-center gap-0.5 rounded-lg bg-secondary p-0.5">
        {options.map((option) => {
            const Icon = option.icon;
            const selected = value === option.value;
            return (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    aria-pressed={selected}
                    className={cx(
                        "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        selected ? "bg-primary text-primary shadow-xs" : "text-tertiary hover:text-secondary",
                    )}
                >
                    {Icon && <Icon className="size-3.5" />}
                    {option.label}
                </button>
            );
        })}
    </div>
);

export const SERP_DEVICES = [
    { value: "desktop", label: "Desktop", icon: Monitor01 },
    { value: "mobile", label: "Mobile", icon: Phone01 },
];

/**
 * The Google result card.
 *
 * Titles are truncated by rendered width, which is why this cuts with
 * truncateToPx rather than a character count — a title of narrow letters fits
 * where the same number of wide ones does not.
 */
export const SerpPreview = ({ resolved, device = "desktop" }) => {
    const mobile = device === "mobile";
    const maxTitlePx = mobile ? 460 : SEO_LIMITS.titlePx.max;
    const maxDescriptionChars = mobile ? 120 : SEO_LIMITS.descriptionChars.max;

    const title = resolved.title || "Untitled page";
    const description = resolved.description || "";
    const shownTitle = truncateToPx(title, maxTitlePx, 20);
    const shownDescription =
        description.length > maxDescriptionChars ? `${description.slice(0, maxDescriptionChars).trimEnd()}…` : description;

    return (
        <div
            className={cx("rounded-lg p-4 ring-1 ring-secondary", mobile && "mx-auto max-w-sm")}
            style={{ backgroundColor: "var(--seo-serp-bg)" }}
        >
            <div className="flex items-center gap-2">
                <span
                    className="flex size-6 items-center justify-center rounded-full ring-1 ring-secondary"
                    style={{ backgroundColor: "var(--seo-card-chrome)" }}
                >
                    <Globe01 className="size-3.5" style={{ color: "var(--seo-card-meta)" }} />
                </span>
                <span className="truncate text-xs" style={{ color: "var(--seo-serp-url)" }}>
                    {resolved.siteName || "Your site"}
                    <br />
                    <span style={{ color: "var(--seo-card-meta)" }}>{breadcrumb(resolved.url, resolved.path)}</span>
                </span>
            </div>

            <p
                className={cx("mt-2 leading-snug", mobile ? "text-base" : "text-xl")}
                style={{ color: "var(--seo-serp-title)" }}
            >
                {shownTitle}
            </p>

            {shownDescription ? (
                <p className="mt-1 text-sm leading-snug" style={{ color: "var(--seo-serp-text)" }}>
                    {shownDescription}
                </p>
            ) : (
                <p className="mt-1 text-sm italic" style={{ color: "var(--seo-card-meta)" }}>
                    Google will choose a sentence from the page — usually not the one you would pick.
                </p>
            )}
        </div>
    );
};

export const SOCIAL_NETWORKS = [
    { value: "facebook", label: "Facebook" },
    { value: "x", label: "X" },
    { value: "linkedin", label: "LinkedIn" },
];

/**
 * The share card.
 *
 * The blank-image state is deliberately loud: a missing og:image is the single
 * most common reason a shared link looks broken, and it is invisible until
 * someone posts it somewhere public.
 */
export const SocialPreview = ({ resolved, network = "facebook" }) => {
    const isX = network === "x";
    const title = isX ? resolved.twitterTitle : resolved.ogTitle;
    const description = isX ? resolved.twitterDescription : resolved.ogDescription;
    const image = isX ? resolved.twitterImage : resolved.ogImage;

    let host = "example.com";
    try {
        if (resolved.url) host = new URL(resolved.url).host;
    } catch {
        host = "example.com";
    }

    const small = isX && resolved.twitterCard === "summary";

    return (
        <div
            className={cx("overflow-hidden ring-1", isX ? "rounded-2xl" : "rounded-lg")}
            style={{ backgroundColor: "var(--seo-card-bg)", "--tw-ring-color": "var(--seo-card-border)" }}
        >
            <div className={cx(small ? "flex items-stretch" : "block")}>
                <div
                    className={cx(
                        "flex shrink-0 items-center justify-center overflow-hidden",
                        small ? "size-28" : "aspect-[1.91/1] w-full",
                    )}
                    style={{ backgroundColor: "var(--seo-card-chrome)" }}
                >
                    {image ? (
                        <img src={image} alt={resolved.ogImageAlt || ""} className="size-full object-cover" />
                    ) : (
                        <div className="flex flex-col items-center gap-1 px-4 text-center">
                            <Image01 className="size-6" style={{ color: "var(--seo-card-meta)" }} />
                            <span className="text-xs" style={{ color: "var(--seo-card-meta)" }}>
                                No image — shared links will look like this
                            </span>
                        </div>
                    )}
                </div>

                <div className={cx("min-w-0 px-3 py-2.5", small && "flex flex-col justify-center")}>
                    {!isX && (
                        <p className="truncate text-[11px] uppercase tracking-wide" style={{ color: "var(--seo-card-meta)" }}>
                            {host}
                        </p>
                    )}
                    <p
                        className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug"
                        style={{ color: "var(--seo-serp-url)" }}
                    >
                        {title || "Untitled page"}
                    </p>
                    {description && (
                        <p className="mt-0.5 line-clamp-1 text-xs" style={{ color: "var(--seo-card-meta)" }}>
                            {description}
                        </p>
                    )}
                    {isX && (
                        <p className="mt-1 truncate text-xs" style={{ color: "var(--seo-card-meta)" }}>
                            {host}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

/** Both meters, shown under the title and description inputs. */
export const TitleMeter = ({ value }) => (
    <LengthMeter
        label="Title length"
        current={textWidthPx(value ?? "", 20)}
        min={SEO_LIMITS.titlePx.min}
        max={SEO_LIMITS.titlePx.max}
        unit="px"
    />
);

export const DescriptionMeter = ({ value }) => (
    <LengthMeter
        label="Description length"
        current={(value ?? "").length}
        min={SEO_LIMITS.descriptionChars.min}
        max={SEO_LIMITS.descriptionChars.max}
        unit="chars"
    />
);
