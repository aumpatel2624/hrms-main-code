import { useState } from "react";
import { toast } from "react-toastify";
import { isStrongPassword, PASSWORD } from "@demo-panel/shared/validation";
import { FormSection, FullWidth } from "@/components/ui/form";
import { PasswordField } from "@/components/ui/field";
import { Button } from "@/components/base/buttons/button";

/**
 * Shown only when editing a user. Resetting a password is a separate endpoint
 * from the profile update, so it gets its own action rather than riding along
 * with the form's Save.
 */
const PasswordResetSection = ({ id, resetApi }) => {
    const [open, setOpen] = useState(false);
    const [values, setValues] = useState({ newPassword: "", confirmPassword: "" });
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (values.newPassword !== values.confirmPassword) return setError("Passwords do not match");
        if (!isStrongPassword(values.newPassword)) return setError(PASSWORD.MESSAGE);

        setSaving(true);
        try {
            const res = await resetApi(id, { password: values.newPassword });
            if (res.data.isOk) {
                toast.success("Password reset successfully");
                setOpen(false);
                setValues({ newPassword: "", confirmPassword: "" });
                setError("");
            } else {
                toast.error("Failed to reset password");
            }
        } catch (err) {
            console.error("Error resetting password:", err);
            toast.error("Failed to reset password");
        } finally {
            setSaving(false);
        }
    };

    return (
        <FormSection title="Password" description="Set a new password for this account.">
            {!open ? (
                <FullWidth>
                    <Button
                        color="secondary"
                        onClick={(e) => {
                            e.preventDefault();
                            setOpen(true);
                            setError("");
                        }}
                    >
                        Change password
                    </Button>
                </FullWidth>
            ) : (
                <>
                    <PasswordField
                        isNew
                        label="New Password"
                        name="newPassword"
                        placeholder="Enter new password"
                        hint={PASSWORD.MESSAGE}
                        value={values.newPassword}
                        onChange={(e) => setValues((v) => ({ ...v, newPassword: e.target.value }))}
                    />
                    <PasswordField
                        isNew
                        label="Confirm Password"
                        name="confirmPassword"
                        placeholder="Re-enter new password"
                        error={error || undefined}
                        value={values.confirmPassword}
                        onChange={(e) => setValues((v) => ({ ...v, confirmPassword: e.target.value }))}
                    />
                    <FullWidth>
                        <div className="flex gap-3">
                            <Button onClick={submit} isLoading={saving} isDisabled={saving}>
                                {saving ? "Resetting..." : "Reset password"}
                            </Button>
                            <Button
                                color="secondary"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setOpen(false);
                                    setError("");
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </FullWidth>
                </>
            )}
        </FormSection>
    );
};

export default PasswordResetSection;
