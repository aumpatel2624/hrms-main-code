import { useContext, useState } from "react";
import { toast } from "react-toastify";
import { isStrongPassword, PASSWORD } from "@demo-panel/shared/validation";
import { AuthContext } from "../../context/AuthContext";
import { changePassword } from "../../api/auth.api";
import { Card, PageHeader } from "@/components/ui/page";
import { FormSection, FullWidth } from "@/components/ui/form";
import { PasswordField } from "@/components/ui/field";
import { Avatar } from "@/components/base/avatar/avatar";
import { Button } from "@/components/base/buttons/button";

const EMPTY_PASSWORDS = { currentPassword: "", newPassword: "", confirmPassword: "" };

/**
 * Every signed-in person changes their own password here (ADR-067). The
 * server checks the current password and the rule again, and signs the
 * account out everywhere else; this session stays signed in.
 */
const ChangePasswordSection = () => {
    const [values, setValues] = useState(EMPTY_PASSWORDS);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const set = (name) => (e) => setValues((v) => ({ ...v, [name]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        if (!values.currentPassword) return setError("Enter your current password");
        if (!isStrongPassword(values.newPassword)) return setError(PASSWORD.MESSAGE);
        if (values.newPassword !== values.confirmPassword) return setError("Passwords do not match");

        setSaving(true);
        try {
            const res = await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
            if (res.data.isOk) {
                toast.success(res.data.message || "Password changed");
                setValues(EMPTY_PASSWORDS);
                setError("");
            } else {
                setError(res.data.message || "Failed to change password");
            }
        } catch (err) {
            console.error("Error changing password:", err);
            toast.error("Failed to change password");
        } finally {
            setSaving(false);
        }
    };

    return (
        <FormSection title="Change password" description="Signs you out on every other device." columns={1}>
            <PasswordField
                label="Current Password"
                name="currentPassword"
                placeholder="Enter your current password"
                value={values.currentPassword}
                onChange={set("currentPassword")}
            />
            <PasswordField
                isNew
                label="New Password"
                name="newPassword"
                placeholder="Enter new password"
                hint={PASSWORD.MESSAGE}
                value={values.newPassword}
                onChange={set("newPassword")}
            />
            <PasswordField
                isNew
                label="Confirm Password"
                name="confirmPassword"
                placeholder="Re-enter new password"
                error={error || undefined}
                value={values.confirmPassword}
                onChange={set("confirmPassword")}
            />
            <FullWidth>
                <Button onClick={submit} isLoading={saving} isDisabled={saving}>
                    {saving ? "Changing..." : "Change password"}
                </Button>
            </FullWidth>
        </FormSection>
    );
};

const UserProfile = () => {
    const { adminData } = useContext(AuthContext);
    const name = adminData?.adminName || adminData?.employeeName;

    document.title = `Profile | Apidel HRMS`;

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

            <Card className="mt-6 px-6">
                <ChangePasswordSection />
            </Card>
        </>
    );
};

export default UserProfile;
