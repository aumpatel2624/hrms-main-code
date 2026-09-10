import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut01, User01 } from "@untitledui/icons";
import { Button as AriaButton } from "react-aria-components";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { Avatar } from "@/components/base/avatar/avatar";
import { AuthContext } from "../context/AuthContext";
import { logout } from "../api/auth.api";

const ProfileMenu = () => {
    const navigate = useNavigate();
    const { adminData, setAdminData, role } = useContext(AuthContext);
    const name = adminData?.adminName || adminData?.userName;

    const handleAction = async (key) => {
        if (key === "profile") return navigate("/profile");
        if (key === "logout") {
            setAdminData(null);
            await logout(); // clears storage and redirects to "/"
        }
    };

    return (
        <Dropdown.Root>
            <AriaButton
                aria-label="Account menu"
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 outline-focus-ring transition hover:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-2"
            >
                <Avatar size="sm" alt={name || "Account"} initials={(name || role || "A").slice(0, 1).toUpperCase()} />
                <span className="hidden text-sm font-medium text-secondary xl:inline">{role}</span>
                <ChevronDown className="size-4 text-fg-quaternary" />
            </AriaButton>

            <Dropdown.Popover>
                {/* React Aria builds menu children into a collection, not the DOM,
                    so arbitrary markup has to sit outside Dropdown.Menu. */}
                {name && (
                    <div className="border-b border-secondary px-3 py-2.5">
                        <p className="text-sm font-semibold text-primary">{name}</p>
                        {adminData?.email && <p className="truncate text-xs text-tertiary">{adminData.email}</p>}
                    </div>
                )}
                <Dropdown.Menu onAction={handleAction}>
                    <Dropdown.Item id="profile" icon={User01}>
                        Profile
                    </Dropdown.Item>
                    <Dropdown.Item id="logout" icon={LogOut01}>
                        Logout
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown.Popover>
        </Dropdown.Root>
    );
};

export default ProfileMenu;
