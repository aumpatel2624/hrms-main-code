/**
 * Centralized Axios instance with interceptors
 * All API calls should use this instance
 * 
 * Uses express-session with cookie-based authentication.
 * Cookies are automatically sent with requests via withCredentials: true
 */
import axios from "axios";
import config from "../config";

// Create axios instance with base configuration
const api = axios.create({
    baseURL: config.api.API_URL,
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // Important: Send cookies with all requests
});

// Request interceptor - no need to manually add session ID, cookies handle it
api.interceptors.request.use(
    (config) => {
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handles common error responses
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Handle 401 Unauthorized - redirect to login
        if (error.response?.status === 401) {
            localStorage.removeItem("role");
            // window.location.href = "/";
        }

        // Handle 403 Forbidden
        if (error.response?.status === 403) {
            console.error("Access denied");
        }

        // Handle 500 Server Error
        if (error.response?.status >= 500) {
            console.error("Server error:", error.response?.data?.message);
        }

        return Promise.reject(error);
    }
);

/**
 * Gets the logged in user from session storage
 * @returns {Object|null} - User object or null
 */
export const getLoggedinUser = () => {
    const user = sessionStorage.getItem("authUser");
    if (!user) {
        return null;
    }
    return JSON.parse(user);
};

export default api;
