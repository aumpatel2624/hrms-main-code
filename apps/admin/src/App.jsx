import React, { useEffect } from "react";
import "react-toastify/dist/ReactToastify.css";
import Route from "./Routes";
import axios from "axios";

import { AuthProvider } from "./context/AuthContext";
import { MenuProvider } from "./context/MenuContext";
import { ToastContainer } from "react-toastify";
import config from "./config";

function App() {
    axios.defaults.baseURL = config.api.API_URL;

    // Theme applies here, not in Layout, so it also covers the login page
    // (rendered outside Layout, before Layout's own effect ever runs).
    useEffect(() => {
        const dark = localStorage.getItem("theme") === "dark";
        document.documentElement.classList.toggle("dark-mode", dark);
    }, []);

    return (
        <React.Fragment>
            <AuthProvider>
                <MenuProvider>
                    <ToastContainer />
                    <Route />
                </MenuProvider>
            </AuthProvider>
        </React.Fragment>
    );
}

export default App;
