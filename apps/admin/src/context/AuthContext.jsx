import { createContext, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, verifySession } from "../api/auth.api";

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
    const [adminData, setAdminData] = useState(null);
    const [loading, setLoading] = useState(true); // Start with loading true for session verification
    const [role, setRole] = useState(localStorage.getItem("role") || null);
    const [isSessionVerified, setIsSessionVerified] = useState(false);

    const navigate = useNavigate();

    // Fetch the logged-in account using the session cookie (no ID needed)
    const getAdmin = useCallback(() => {
        setLoading(true);
        getCurrentUser()
            .then((res) => {
                setAdminData(res.data.data);
            })
            .catch((error) => {
                console.log("error", error);
                // Only navigate to login if we get an auth error
                if (error.response?.status === 401 || error.response?.status === 403) {
                    localStorage.removeItem("role");
                    setAdminData(null);
                    setRole(null);
                    navigate("/");
                }
            })
            .finally(() => {
                setLoading(false);
            });
    }, [navigate]);

    // Verify session on page load/refresh
    const verifyUserSession = useCallback(async () => {
        try {
            const res = await verifySession();
            if (res.data.isOk) {
                // Session is valid, update role from server
                setRole(res.data.data.role);
                localStorage.setItem("role", res.data.data.role);
                setIsSessionVerified(true);
                // Fetch full account data
                getAdmin();
            }
        } catch (error) {
            console.log("Session verification failed:", error);
            // Session is invalid, clear localStorage and redirect
            localStorage.removeItem("role");
            setAdminData(null);
            setRole(null);
            setIsSessionVerified(true);
            setLoading(false);
            navigate("/");
        }
    }, [navigate, getAdmin]);

    // Verify session on mount
    useEffect(() => {
        verifyUserSession();
    }, [verifyUserSession]);

    return (
        <AuthContext.Provider value={{ adminData, setAdminData, getAdmin, role, setRole, loading, setLoading, isSessionVerified }}>
            {children}
        </AuthContext.Provider>
    );
};

export { AuthContext, AuthProvider };
