import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeftDouble, ChevronRightDouble, Menu02, Moon01, Sun, X as XClose } from "@untitledui/icons";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { cx } from "@/utils/cx";
import SidebarNav from "./SidebarNav";
import ProfileMenu from "./ProfileMenu";
import Footer from "./Footer";

const Layout = ({ children }) => {
    // Replaces the old data-sidebar-size / data-layout / data-layout-mode
    // attributes that were written straight onto document.documentElement.
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem("sidebar-collapsed") === "1");
    const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");

    useEffect(() => {
        localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
    }, [collapsed]);

    useEffect(() => {
        document.documentElement.classList.toggle("dark-mode", dark);
        localStorage.setItem("theme", dark ? "dark" : "light");
    }, [dark]);

    const toggleTheme = () => setDark((prev) => !prev);

    return (
        <div className="flex min-h-dvh bg-secondary">
            {sidebarOpen && (
                <button
                    type="button"
                    aria-label="Close navigation"
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 z-40 bg-overlay/70 lg:hidden"
                />
            )}

            <aside
                className={cx(
                    "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-brand-900 shadow-xl ring-1 ring-black/10 transition-[transform,width] duration-200 ease-out lg:sticky lg:top-0 lg:bottom-auto lg:h-dvh lg:translate-x-0 lg:shadow-none",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full",
                    collapsed ? "lg:w-[76px]" : "lg:w-64",
                )}
            >
                <div className={cx("flex h-16 shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4", collapsed && "lg:justify-center lg:px-2")}>
                    <Link
                        to="/dashboard"
                        className={cx("flex min-w-0 items-center rounded-lg px-2 py-1 outline-focus-ring transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2", collapsed && "lg:hidden")}
                    >
                        <img src="/brand/apidel-logo.png" alt="Apidel Technologies" className="h-7 w-auto brightness-0 invert" />
                    </Link>
                    <button
                        type="button"
                        aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
                        title={collapsed ? "Expand navigation" : "Collapse navigation"}
                        onClick={() => setCollapsed((value) => !value)}
                        className="hidden rounded-lg p-2 text-white/75 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white lg:inline-flex"
                    >
                        {collapsed ? <ChevronRightDouble className="size-5" /> : <ChevronLeftDouble className="size-5" />}
                    </button>
                    <button
                        type="button"
                        aria-label="Close navigation"
                        onClick={() => setSidebarOpen(false)}
                        className="text-white lg:hidden"
                    >
                        <XClose className="size-6" />
                    </button>
                </div>

                <SidebarNav collapsed={collapsed} />
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-secondary bg-primary px-4">
                    <ButtonUtility
                        size="sm"
                        color="tertiary"
                        icon={Menu02}
                        tooltip="Menu"
                        onClick={() => setSidebarOpen((open) => !open)}
                        className="lg:hidden"
                    />
                    {/* Slot a screen can portal its own header controls into, so
                        a section with its own toolbar (the documentation) adds to
                        this bar rather than stacking a second one beneath it. */}
                    <div id="app-header-slot" className="flex min-w-0 flex-1 items-center gap-3" />
                    <ButtonUtility
                        size="sm"
                        color="tertiary"
                        icon={dark ? Sun : Moon01}
                        tooltip={dark ? "Light mode" : "Dark mode"}
                        onClick={toggleTheme}
                    />
                    <ProfileMenu />
                </header>

                <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
                <Footer />
            </div>
        </div>
    );
};

export default Layout;
