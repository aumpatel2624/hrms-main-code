import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";

const LoadingOverlay = ({ isLoading, message = "Loading..." }) =>
    isLoading ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-primary/70 backdrop-blur-[1px]">
            <LoadingIndicator type="dot-circle" size="md" label={message} />
        </div>
    ) : null;

export default LoadingOverlay;
