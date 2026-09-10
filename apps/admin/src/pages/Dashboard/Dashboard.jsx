import { useContext, useEffect, useState } from "react";
import { Home01 } from "@untitledui/icons";
import { AuthContext } from "../../context/AuthContext";
import { getMyDashboard, runWidget } from "../../api/dashboards.api";
import { Card, PageHeader } from "@/components/ui/page";
import { WidgetCard } from "@/components/ui/widgets";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";

/**
 * The dynamic dashboard (ADR-003): renders whatever the caller's role has
 * pinned, each widget run server-side under the role's data scope. No pins
 * (or no dashboard document at all) falls back to the greeting.
 */
const Dashboard = () => {
    const { adminData } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [pins, setPins] = useState([]);
    // widgetId -> { result } | { error }
    const [results, setResults] = useState({});

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const response = await getMyDashboard();
                const dashboard = response.data?.data;
                const pinned = dashboard?.widgets ?? [];
                if (cancelled) return;
                setPins(pinned);
                setLoading(false);

                // Each widget runs independently — one slow or stale widget
                // must not blank the rest of the dashboard.
                pinned.forEach(async (pin) => {
                    const id = pin.widgetId._id;
                    try {
                        const run = await runWidget(id);
                        if (!cancelled) setResults((prev) => ({ ...prev, [id]: { result: run.data?.data } }));
                    } catch (error) {
                        const message =
                            error.response?.status === 409
                                ? "This widget no longer matches its data source"
                                : "Could not load this widget";
                        if (!cancelled) setResults((prev) => ({ ...prev, [id]: { error: message } }));
                    }
                });
            } catch {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

    document.title = `Dashboard | Demo Panel`;

    return (
        <>
            <PageHeader title="Dashboard" pageTitle="Dashboard" />

            {loading ? (
                <div className="flex justify-center py-16">
                    <LoadingIndicator type="dot-circle" size="md" label="Loading dashboard..." />
                </div>
            ) : pins.length === 0 ? (
                <div className="mx-auto max-w-3xl">
                    <Card className="flex flex-col items-center gap-4 px-6 py-14 text-center">
                        <FeaturedIcon color="brand" theme="light" size="xl" icon={Home01} />
                        <h2 className="text-display-sm font-semibold text-brand-secondary">{greeting}!</h2>
                        <p className="text-lg text-secondary">{adminData?.adminName || adminData?.userName}</p>
                    </Card>
                </div>
            ) : (
                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                    {pins.map((pin) => (
                        <WidgetCard
                            key={pin.widgetId._id}
                            title={pin.widgetId.title}
                            size={pin.size}
                            result={results[pin.widgetId._id]?.result ?? null}
                            error={results[pin.widgetId._id]?.error ?? null}
                        />
                    ))}
                </div>
            )}
        </>
    );
};

export default Dashboard;
