import React, { useContext } from "react";
import { Navigate, Route } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const AuthProtected = (props) => {
    const { role, isSessionVerified, loading } = useContext(AuthContext);
    console.log(role);
    // Show  loading while session is being verified
    // if (!isSessionVerified || loading) {
    //     return (
    //         <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
    //             <div className="spinner-border text-primary" role="status">
    //                 <span className="visually-hidden">Loading...</span>
    //             </div>
    //         </div>
    //     );
    // }

    // If session verified but no role, redirect to login
    if (!role) {
        console.log("nevigating to /");
        return <Navigate to="/" />;
    }

    return <>{props.children}</>;
};

const AccessRoute = ({ component: Component, ...rest }) => {
    return (
        <Route
            {...rest}
            render={(props) => {
                return (
                    <>
                        {" "}
                        <Component {...props} />{" "}
                    </>
                );
            }}
        />
    );
};

export { AuthProtected, AccessRoute };

