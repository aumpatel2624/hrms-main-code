import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import { Card, PageHeader } from "@/components/ui/page";
import { Avatar } from "@/components/base/avatar/avatar";

const UserProfile = () => {
    const { adminData } = useContext(AuthContext);
    const name = adminData?.adminName || adminData?.userName;

    document.title = `Profile | Demo Panel`;

    return (
        <>
            <PageHeader title="Profile" pageTitle="Account" />

            <Card className="p-6">
                <div className="flex items-center gap-4">
                    <Avatar
                        size="xl"
                        src={adminData?.logo ? `/${adminData.logo}` : undefined}
                        alt={name || "Profile"}
                        initials={(name || "A").slice(0, 1).toUpperCase()}
                    />
                    <div className="flex flex-col gap-1">
                        {name && <p className="text-lg font-semibold text-primary">{name}</p>}
                        <p className="text-sm text-tertiary">Email Id : {adminData?.email}</p>
                    </div>
                </div>
            </Card>
        </>
    );
};

export default UserProfile;
