export default {
    api: {
        // Production is served same-origin by the Express server, so there is no
        // host to point at - every path in api/endpoints.jsx is already an
        // absolute /api/v1 path. Dev stays cross-origin against the API port.
        API_URL:
            import.meta.env.MODE === "production"
                ? ""
                : import.meta.env.VITE_API_URL_DEV,
    },
};
