import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";

const LoadingScreen = () => (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-primary">
        <LoadingIndicator type="dot-circle" size="md" label="Loading..." />
    </div>
);

export default LoadingScreen;
