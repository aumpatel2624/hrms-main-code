import { createContext, useContext, useId, useMemo } from "react";
import * as RechartsPrimitive from "recharts";
import { cx } from "@/utils/cx";

/**
 * shadcn/ui's chart primitives (ChartContainer / ChartTooltip / ChartLegend),
 * ported to this app's conventions (ADR-006).
 *
 * Why a port and not the dependency: shadcn is a copy-in component library,
 * not a package — its chart component is ~200 lines over Recharts, which this
 * app already had. Vendoring it here adds no dependency and lets it speak this
 * app's palette (`--viz-series-N` from globals.css) and `cx` helper instead of
 * shipping a second theming system beside the vendored Untitled UI.
 *
 * Deviation recorded in docs/knowledge/DECISIONS.md (ADR-006).
 *
 * A chart `config` maps each series key to its label and colour:
 *   { sales: { label: "Sales", color: "var(--viz-series-1)" } }
 * ChartContainer emits the CSS variables (--color-sales) that the Recharts
 * children reference, so colours live in one place per chart.
 */

const THEMES = { light: "", dark: ".dark-mode" };

const ChartContext = createContext(null);

const useChart = () => {
    const context = useContext(ChartContext);
    if (!context) throw new Error("useChart must be used within a <ChartContainer />");
    return context;
};

export const ChartContainer = ({ id, className, children, config, ...props }) => {
    const uniqueId = useId();
    const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

    return (
        <ChartContext.Provider value={{ config }}>
            <div
                data-chart={chartId}
                className={cx(
                    "flex aspect-video justify-center text-xs",
                    // Recharts paints its own strokes; tame the ones that clash
                    // with the app's tokens rather than restyling every child.
                    "[&_.recharts-cartesian-axis-tick_text]:fill-[var(--color-text-tertiary)]",
                    "[&_.recharts-cartesian-grid_line]:stroke-[var(--color-border-secondary)]",
                    "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-[var(--color-border-secondary)]",
                    "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-[var(--color-border-secondary)]",
                    "[&_.recharts-radial-bar-background-sector]:fill-[var(--color-bg-secondary)]",
                    "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-[var(--color-bg-secondary)]",
                    "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-[var(--color-border-secondary)]",
                    "[&_.recharts-sector]:outline-hidden [&_.recharts-surface]:outline-hidden",
                    "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
                    className,
                )}
                {...props}
            >
                <ChartStyle id={chartId} config={config} />
                <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
            </div>
        </ChartContext.Provider>
    );
};

/** Emits `--color-<key>` per series so children can use var(--color-sales). */
const ChartStyle = ({ id, config }) => {
    const colorConfig = Object.entries(config ?? {}).filter(([, item]) => item.theme || item.color);
    if (!colorConfig.length) return null;

    return (
        <style
            dangerouslySetInnerHTML={{
                __html: Object.entries(THEMES)
                    .map(
                        ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
    .map(([key, item]) => {
        const color = item.theme?.[theme] || item.color;
        return color ? `  --color-${key}: ${color};` : null;
    })
    .filter(Boolean)
    .join("\n")}
}
`,
                    )
                    .join("\n"),
            }}
        />
    );
};

export const ChartTooltip = RechartsPrimitive.Tooltip;

export const ChartTooltipContent = ({
    active,
    payload,
    className,
    indicator = "dot",
    hideLabel = false,
    hideIndicator = false,
    label,
    labelFormatter,
    labelClassName,
    formatter,
    color,
    nameKey,
    labelKey,
}) => {
    const { config } = useChart();

    const tooltipLabel = useMemo(() => {
        if (hideLabel || !payload?.length) return null;
        const [item] = payload;
        const key = `${labelKey || item?.dataKey || item?.name || "value"}`;
        const itemConfig = getPayloadConfig(config, item, key);
        const value = !labelKey && typeof label === "string" ? (config[label]?.label ?? label) : itemConfig?.label;

        if (labelFormatter) {
            return <div className={cx("font-medium text-primary", labelClassName)}>{labelFormatter(value, payload)}</div>;
        }
        if (!value) return null;
        return <div className={cx("font-medium text-primary", labelClassName)}>{value}</div>;
    }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

    if (!active || !payload?.length) return null;

    const nestLabel = payload.length === 1 && indicator !== "dot";

    return (
        <div className={cx("grid min-w-32 items-start gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs shadow-lg ring-1 ring-secondary", className)}>
            {!nestLabel ? tooltipLabel : null}
            <div className="grid gap-1.5">
                {payload.map((item, index) => {
                    const key = `${nameKey || item.name || item.dataKey || "value"}`;
                    const itemConfig = getPayloadConfig(config, item, key);
                    const indicatorColor = color || item.payload?.fill || item.color;

                    return (
                        <div
                            key={item.dataKey ?? index}
                            className={cx(
                                "flex w-full flex-wrap items-stretch gap-2",
                                indicator === "dot" && "items-center",
                            )}
                        >
                            {formatter && item?.value !== undefined && item.name ? (
                                formatter(item.value, item.name, item, index, item.payload)
                            ) : (
                                <>
                                    {!hideIndicator && (
                                        <div
                                            className={cx("shrink-0 rounded-[2px]", {
                                                "size-2.5": indicator === "dot",
                                                "w-1": indicator === "line",
                                                "w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed",
                                                "my-0.5": nestLabel && indicator === "dashed",
                                            })}
                                            style={{ backgroundColor: indicatorColor, borderColor: indicatorColor }}
                                        />
                                    )}
                                    <div className={cx("flex flex-1 justify-between leading-none", nestLabel ? "items-end" : "items-center")}>
                                        <div className="grid gap-1.5">
                                            {nestLabel ? tooltipLabel : null}
                                            <span className="text-tertiary">{itemConfig?.label || item.name}</span>
                                        </div>
                                        {item.value !== undefined && (
                                            <span className="font-mono font-medium tabular-nums text-primary">
                                                {item.value.toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const ChartLegend = RechartsPrimitive.Legend;

export const ChartLegendContent = ({ className, hideIcon = false, payload, verticalAlign = "bottom", nameKey }) => {
    const { config } = useChart();
    if (!payload?.length) return null;

    return (
        <div className={cx("flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5", verticalAlign === "top" ? "pb-3" : "pt-3", className)}>
            {payload.map((item) => {
                const key = `${nameKey || item.dataKey || "value"}`;
                const itemConfig = getPayloadConfig(config, item, key);

                return (
                    <div key={item.value} className="flex items-center gap-1.5">
                        {!hideIcon && <div className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />}
                        <span className="text-xs text-tertiary">{itemConfig?.label || item.value}</span>
                    </div>
                );
            })}
        </div>
    );
};

/** Resolve a payload entry back to its config entry, tolerating Recharts' shapes. */
const getPayloadConfig = (config, payload, key) => {
    if (typeof payload !== "object" || payload === null) return undefined;
    const inner = payload.payload && typeof payload.payload === "object" ? payload.payload : undefined;

    let configLabelKey = key;
    if (typeof payload[key] === "string") {
        configLabelKey = payload[key];
    } else if (inner && typeof inner[key] === "string") {
        configLabelKey = inner[key];
    }
    return config[configLabelKey] ?? config[key];
};
