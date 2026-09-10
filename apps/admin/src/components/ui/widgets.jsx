import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    PolarAngleAxis,
    PolarGrid,
    PolarRadiusAxis,
    Radar,
    RadarChart,
    RadialBar,
    RadialBarChart,
    XAxis,
    YAxis,
} from "recharts";
import { BarChart03, HelpCircle, InfoCircle } from "@untitledui/icons";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cx } from "@/utils/cx";

/**
 * Renderers for dashboard widgets (ADR-003), drawn with the vendored shadcn/ui
 * chart primitives (ADR-006) over Recharts. Data arrives as the run endpoint's
 * rows: [{ label, value }].
 *
 * Identity colors come from the --viz-series-* slots in globals.css (fixed
 * order, folded past 8). A widget may override the slot per category via
 * `seriesColors` ({ label: slot }) — set in the Dashboard Builder, keyed by label
 * so a category keeps its color when sorting moves it. Single-series bar/line
 * stay on slot 1 unless overridden: magnitude lives in the geometry, not in
 * per-bar hues. Text always wears text tokens, never the series color.
 */

const SERIES = Array.from({ length: 8 }, (_, i) => `var(--viz-series-${i + 1})`);
const OTHER_COLOR = "var(--color-fg-quaternary)";

/** A stored slot (1-8) resolved to its CSS variable. */
export const slotColor = (slot) => SERIES[(Number(slot) - 1 + SERIES.length) % SERIES.length];

const AXIS_TICK = { fill: "var(--color-text-tertiary)", fontSize: 12 };

const formatValue = (value) => {
    if (value === null || value === undefined) return "0";
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
};

const formatLabel = (label) => {
    if (label === null || label === undefined) return "—";
    if (label === true) return "Yes";
    if (label === false) return "No";
    // Line buckets arrive as ISO date strings.
    if (typeof label === "string" && /^\d{4}-\d{2}-\d{2}T/.test(label)) {
        return new Date(label).toLocaleDateString(undefined, { day: "numeric", month: "short" });
    }
    return String(label);
};

/**
 * Rows folded to the palette's width and resolved to their final colour.
 * `seriesColors` is keyed by the *rendered* label, which is what the builder
 * shows the user, so the two always agree.
 */
const prepare = (rows, seriesColors, fold = true) => {
    const folded =
        fold && rows.length > SERIES.length
            ? [
                  ...rows.slice(0, SERIES.length - 1),
                  {
                      label: "Other",
                      value: rows.slice(SERIES.length - 1).reduce((sum, row) => sum + (Number(row.value) || 0), 0),
                  },
              ]
            : rows;

    return folded.map((row, index) => {
        const name = formatLabel(row.label);
        const override = seriesColors?.[name];
        return {
            ...row,
            name,
            fill: row.label === "Other" ? OTHER_COLOR : override ? slotColor(override) : SERIES[index % SERIES.length],
        };
    });
};

/** ChartContainer wants a config keyed by series; ours is one per category. */
const configFor = (data) =>
    Object.fromEntries([["value", { label: "Value" }], ...data.map((row) => [row.name, { label: row.name, color: row.fill }])]);

// ---- renderers ----------------------------------------------------------

/**
 * A stat tile is one number and nothing else, so it takes the height its
 * number needs and no more. It used to centre itself in `h-full`, which meant
 * a tile sharing a grid row with a chart stretched to the chart's height and
 * left a very large empty card with a number floating in it — see the 1-col
 * tiles on the dashboard canvas. Top-aligned and intrinsically sized, a stat
 * card is about as tall as its header plus the number.
 */
const StatWidget = ({ rows }) => (
    <p className="text-display-sm font-semibold text-primary tabular-nums">{formatValue(rows[0]?.value ?? 0)}</p>
);

/**
 * The breakdown behind a stat tile's number, as the run endpoint returns it:
 * { label, rows: [{ label, value }], other, total, additive }.
 *
 * `additive` is false for an average — the per-group means do not add up to
 * the tile's number, so no total and no shares are shown. Rendering a share
 * there would invent a relationship the arithmetic does not support.
 */
const BreakdownTable = ({ breakdown }) => {
    const { label, rows, other, total, additive } = breakdown;
    const share = (value) => (additive && total > 0 ? `${Math.round((Number(value) / total) * 100)}%` : null);

    // The tooltip renders `title` inside a `text-white font-semibold` span, so
    // everything here would otherwise inherit bold white. Secondary text uses
    // the theme's tooltip token rather than an opacity — opacity on white over
    // the solid tooltip background washes out to unreadable in dark mode.
    return (
        <div className="min-w-56 font-medium">
            <p className="mb-2 text-xs font-semibold text-white">Breakdown by {label}</p>
            {rows.length === 0 ? (
                <p className="text-xs text-tooltip-supporting-text">No data to break down.</p>
            ) : (
                <table className="w-full border-collapse">
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={index}>
                                <td className="py-0.5 pr-3 text-xs text-white">{formatLabel(row.label)}</td>
                                <td className="py-0.5 pr-2 text-right text-xs tabular-nums text-white">{formatValue(row.value)}</td>
                                <td className="py-0.5 text-right text-xs tabular-nums text-tooltip-supporting-text">
                                    {share(row.value) ?? ""}
                                </td>
                            </tr>
                        ))}
                        {other > 0 && (
                            <tr>
                                <td className="py-0.5 pr-3 text-xs text-tooltip-supporting-text">Other</td>
                                <td className="py-0.5 pr-2 text-right text-xs tabular-nums text-tooltip-supporting-text">
                                    {formatValue(other)}
                                </td>
                                <td className="py-0.5 text-right text-xs tabular-nums text-tooltip-supporting-text">
                                    {share(other) ?? ""}
                                </td>
                            </tr>
                        )}
                        {additive && (
                            <tr className="border-t border-white/20">
                                <td className="pt-1 pr-3 text-xs font-semibold text-white">Total</td>
                                <td className="pt-1 pr-2 text-right text-xs font-semibold tabular-nums text-white">{formatValue(total)}</td>
                                <td />
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
            {!additive && (
                <p className="mt-2 text-xs text-tooltip-supporting-text">
                    Averages per group — these do not add up to the headline number.
                </p>
            )}
        </div>
    );
};

/** The ⓘ / ? affordances, on every widget. Both always render so the card
 *  header has a predictable shape; each tooltip says when it has nothing. */
/**
 * Both hint icons share one resting colour and one hover colour. The "?" used
 * to dim when no description was written, which read as a broken icon rather
 * than a missing explanation — the tooltip already says which it is.
 * text-tertiary over text-fg-quaternary: quaternary is near-invisible against
 * a dark card at 16px.
 */
const HINT_ICON_CLASS = "text-tertiary transition-colors hover:text-primary";

const WidgetHints = ({ breakdown, description }) => (
    <div className="flex items-center gap-1">
        <Tooltip
            title={
                breakdown ? (
                    <BreakdownTable breakdown={breakdown} />
                ) : (
                    "There is nothing to break this down by — its data source has no category to group by."
                )
            }
            placement="bottom end"
        >
            <TooltipTrigger aria-label="Show the breakdown behind this number" className={HINT_ICON_CLASS}>
                <InfoCircle className="size-4" />
            </TooltipTrigger>
        </Tooltip>
        <Tooltip
            title={
                description || (
                    // Both icons are always present on a stat tile, so the shape
                    // is predictable. With nothing written, say so plainly and
                    // point at where it is filled in — better than a blank
                    // tooltip, and better than inventing a meaning.
                    <span>
                        No explanation has been written for this widget yet. Add one in Dashboard Builder under
                        &ldquo;What this shows&rdquo;.
                    </span>
                )
            }
            placement="bottom end"
        >
            <TooltipTrigger aria-label="What this number represents" className={HINT_ICON_CLASS}>
                <HelpCircle className="size-4" />
            </TooltipTrigger>
        </Tooltip>
    </div>
);

const BarWidget = ({ rows, seriesColors }) => {
    const data = prepare(rows, seriesColors);
    return (
        <ChartContainer config={configFor(data)} className="aspect-auto h-60 w-full">
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} cursor={{ fill: "var(--color-bg-secondary)" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {data.map((row) => (
                        <Cell key={row.name} fill={row.fill} />
                    ))}
                </Bar>
            </BarChart>
        </ChartContainer>
    );
};

/** Categories with long names read far better on a horizontal axis. */
const BarHorizontalWidget = ({ rows, seriesColors }) => {
    const data = prepare(rows, seriesColors);
    return (
        <ChartContainer config={configFor(data)} className="aspect-auto h-60 w-full">
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} width={110} />
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} cursor={{ fill: "var(--color-bg-secondary)" }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {data.map((row) => (
                        <Cell key={row.name} fill={row.fill} />
                    ))}
                </Bar>
            </BarChart>
        </ChartContainer>
    );
};

/** Time series: one colour for the whole line — slot 1 unless overridden. */
const timeSeriesColor = (seriesColors) => (seriesColors?.value ? slotColor(seriesColors.value) : SERIES[0]);

const LineWidget = ({ rows, seriesColors }) => {
    const data = rows.map((row) => ({ ...row, name: formatLabel(row.label) }));
    const color = timeSeriesColor(seriesColors);
    return (
        <ChartContainer config={{ value: { label: "Value", color } }} className="aspect-auto h-60 w-full">
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
                <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
        </ChartContainer>
    );
};

const AreaWidget = ({ rows, seriesColors }) => {
    const data = rows.map((row) => ({ ...row, name: formatLabel(row.label) }));
    const color = timeSeriesColor(seriesColors);
    return (
        <ChartContainer config={{ value: { label: "Value", color } }} className="aspect-auto h-60 w-full">
            <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <defs>
                    <linearGradient id="widget-area-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={color} stopOpacity={0.04} />
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent hideIndicator />} />
                <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#widget-area-fill)" />
            </AreaChart>
        </ChartContainer>
    );
};

/** Pie and donut differ only by the hole in the middle. */
const makePieWidget = (innerRadius) => {
    const Component = ({ rows, seriesColors }) => {
        const data = prepare(rows, seriesColors);
        return (
            <ChartContainer config={configFor(data)} className="aspect-auto h-60 w-full">
                <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={innerRadius}
                        outerRadius="85%"
                        stroke="var(--color-bg-primary)"
                        strokeWidth={2}
                    >
                        {data.map((row) => (
                            <Cell key={row.name} fill={row.fill} />
                        ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
            </ChartContainer>
        );
    };
    return Component;
};

const PieWidget = makePieWidget(0);
const DonutWidget = makePieWidget("55%");

const RadarWidget = ({ rows, seriesColors }) => {
    const data = prepare(rows, seriesColors);
    // One shape across all categories, so the radar takes a single colour —
    // the first override wins, otherwise slot 1.
    const color = data.find((row) => seriesColors?.[row.name])?.fill ?? SERIES[0];
    return (
        <ChartContainer config={configFor(data)} className="aspect-auto h-60 w-full">
            <RadarChart data={data} outerRadius="70%">
                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                <PolarGrid />
                <PolarAngleAxis dataKey="name" tick={AXIS_TICK} />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.35} />
            </RadarChart>
        </ChartContainer>
    );
};

const RadialWidget = ({ rows, seriesColors }) => {
    const data = prepare(rows, seriesColors);
    return (
        <ChartContainer config={configFor(data)} className="aspect-auto h-60 w-full">
            <RadialBarChart data={data} innerRadius="30%" outerRadius="100%" startAngle={90} endAngle={-270}>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                <RadialBar dataKey="value" background cornerRadius={4}>
                    {data.map((row) => (
                        <Cell key={row.name} fill={row.fill} />
                    ))}
                </RadialBar>
                <ChartLegend content={<ChartLegendContent nameKey="name" />} />
            </RadialBarChart>
        </ChartContainer>
    );
};

const TableWidget = ({ rows }) => (
    <div className="max-h-60 overflow-y-auto">
        <table className="w-full border-collapse">
            <tbody>
                {rows.map((row, index) => (
                    <tr key={index} className="border-b border-secondary last:border-b-0">
                        <td className="py-2 pr-4 text-sm text-secondary">{formatLabel(row.label)}</td>
                        <td className="py-2 text-right text-sm font-medium text-primary">{formatValue(row.value)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const CHART_RENDERERS = {
    stat: StatWidget,
    bar: BarWidget,
    barHorizontal: BarHorizontalWidget,
    line: LineWidget,
    area: AreaWidget,
    pie: PieWidget,
    donut: DonutWidget,
    radar: RadarWidget,
    radial: RadialWidget,
    table: TableWidget,
};

/** Grid footprint per pinned size, on the dashboard's 4-column grid. */
export const SIZE_CLASSES = {
    sm: "xl:col-span-1",
    md: "xl:col-span-2",
    lg: "xl:col-span-3",
    full: "xl:col-span-4",
};

/**
 * One dashboard card: title + chart, with loading/error/empty states.
 * `result` is the run endpoint's data ({ title, chartType, rows }) or null
 * while loading; `error` is a message string. `seriesColors` is the widget's
 * stored `{ label: slot }` map, if it has one.
 */
export const WidgetCard = ({ title, size = "md", result, error, seriesColors, description }) => {
    const Renderer = result ? CHART_RENDERERS[result.chartType] : null;
    const empty = result && (!result.rows || result.rows.length === 0) && result.chartType !== "stat";
    const colors = seriesColors ?? result?.seriesColors;

    const isStat = result?.chartType === "stat";
    const help = description ?? result?.description;

    return (
        <div
            className={cx(
                "rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary",
                SIZE_CLASSES[size] ?? SIZE_CLASSES.md,
                // A stat card is its own height rather than the row's. Grid
                // items stretch by default, so without this a one-number tile
                // sitting beside a chart grows to the chart's height.
                isStat && "self-start",
            )}
        >
            <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="truncate text-sm font-semibold text-primary">{title}</h3>
                {result && <WidgetHints breakdown={result.breakdown} description={help} />}
            </div>
            {error ? (
                <p className="py-8 text-center text-sm text-tertiary">{error}</p>
            ) : !result ? (
                <div className="flex justify-center py-8">
                    <LoadingIndicator type="dot-circle" size="sm" />
                </div>
            ) : empty ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <BarChart03 className="size-5 text-fg-quaternary" />
                    <p className="text-sm text-tertiary">No data yet</p>
                </div>
            ) : !Renderer ? (
                <p className="py-8 text-center text-sm text-tertiary">Unknown chart type &ldquo;{result.chartType}&rdquo;</p>
            ) : (
                <Renderer rows={result.rows ?? []} seriesColors={colors} />
            )}
        </div>
    );
};
