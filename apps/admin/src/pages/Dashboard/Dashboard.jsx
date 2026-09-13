import { useContext } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Home01 } from "@untitledui/icons";
import { AuthContext } from "../../context/AuthContext";
import { getMyDashboard, runWidget } from "../../api/dashboards.api";
import { Card, PageHeader } from "@/components/ui/page";
import { WidgetCard } from "@/components/ui/widgets";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";

/** The role dashboard and each saved-widget result share the app query cache. */
const Dashboard = () => {
    const { adminData, isSessionVerified } = useContext(AuthContext);
    const dashboardQuery = useQuery({ queryKey: ["dashboards", "me"], queryFn: getMyDashboard, enabled: isSessionVerified });
    const pins = dashboardQuery.data?.data?.data?.widgets ?? [];
    const widgetQueries = useQueries({
        queries: pins.map((pin) => ({
            queryKey: ["dashboards", "widget", pin.widgetId._id],
            queryFn: () => runWidget(pin.widgetId._id),
        })),
    });
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
    document.title = "Dashboard | Apidel HRMS";

    return <>
        <PageHeader title="Dashboard" pageTitle="Dashboard" />
        {dashboardQuery.isLoading ? <div className="flex justify-center py-16"><LoadingIndicator type="dot-circle" size="md" label="Loading dashboard..." /></div>
            : pins.length === 0 ? <div className="mx-auto max-w-3xl"><Card className="flex flex-col items-center gap-4 px-6 py-14 text-center"><FeaturedIcon color="brand" theme="light" size="xl" icon={Home01} /><h2 className="text-display-sm font-semibold text-brand-secondary">{greeting}!</h2><p className="text-lg text-secondary">{adminData?.adminName || adminData?.userName}</p></Card></div>
                : <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">{pins.map((pin, index) => {
                    const query = widgetQueries[index];
                    const error = query.error?.response?.status === 409 ? "This widget no longer matches its data source" : query.isError ? "Could not load this widget" : null;
                    return <WidgetCard key={pin.widgetId._id} title={pin.widgetId.title} size={pin.size} result={query.data?.data?.data ?? null} error={error} />;
                })}</div>}
    </>;
};

export default Dashboard;
