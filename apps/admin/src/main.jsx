import "./styles/globals.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
    <React.Fragment>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
                <App />
            </BrowserRouter>
        </QueryClientProvider>
    </React.Fragment>
);
