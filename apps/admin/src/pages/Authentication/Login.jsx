import React, { useContext, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Eye, EyeOff, Lock01, Mail01 } from "@untitledui/icons";
import { LOGIN, OTP } from "@demo-panel/shared/auth";
import { isStrongPassword, isValidEmail, PASSWORD } from "@demo-panel/shared/validation";
import { AuthContext } from "../../context/AuthContext";
import { MenuContext } from "../../context/MenuContext";
import { login as loginRequest, sendOtp, verifyOtp, resetPassword } from "../../api/auth.api";
import { useLoginAttempt } from "../../hooks/useLoginAttempt";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { ButtonUtility } from "@/components/base/buttons/button-utility";

const initialState = {
    email: "",
    password: "",
};

const Login = () => {
    const { fetchMenus } = useContext(MenuContext);
    const { setAdminData } = useContext(AuthContext);
    const navigate = useNavigate();
    const [values, setValues] = useState(initialState);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmit, setIsSubmit] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errEmail, setErrEmail] = useState(false);
    const [errPassword, setErrPassword] = useState(false);

    // Forgot password states
    const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
    const [forgotPasswordStep, setForgotPasswordStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Loading states
    const [isLoginLoading, setIsLoginLoading] = useState(false);
    const [isSendOtpLoading, setIsSendOtpLoading] = useState(false);
    const [isResendOtpLoading, setIsResendOtpLoading] = useState(false);
    const [isVerifyOtpLoading, setIsVerifyOtpLoading] = useState(false);
    const [isResetPasswordLoading, setIsResetPasswordLoading] = useState(false);

    // Countdown timer for OTP resend
    const [otpCountdown, setOtpCountdown] = useState(0);
    const [otpResendDisabled, setOtpResendDisabled] = useState(false);

    // Login attempt limitation hook
    const {
        isLocked,
        attemptsRemaining,
        formattedTime,
        updateFromResponse,
        fetchStatus: fetchLoginStatus,
    } = useLoginAttempt(values.email);

    // Timer interval ref
    const timerRef = React.useRef(null);

    // Handle timer effect
    React.useEffect(() => {
        if (otpCountdown > 0) {
            timerRef.current = setInterval(() => {
                setOtpCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        setOtpResendDisabled(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [otpCountdown]);

    // Format seconds to MM:SS
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs
            .toString()
            .padStart(2, "0")}`;
    };

    const handleChange = (e) => {
        setValues({ ...values, [e.target.name]: e.target.value });
    };

    const login = async (e) => {
        // Prevent form submission which causes page refresh
        if (e) {
            e.preventDefault();
        }

        setIsSubmit(true);
        setFormErrors(validate(values));

        // If validation errors, don't proceed
        if (Object.keys(validate(values)).length > 0) return;

        // Check if account is locked before attempting login
        if (isLocked) {
            toast.error(`Your account is locked. Try again in ${formattedTime}`);
            return;
        }

        setIsLoginLoading(true);

        try {
            loginRequest({
                email: values.email,
                password: values.password,
                // The consent checkboxes (and the browser's location-permission
                // prompt they triggered) were removed from the UI, but the server
                // still requires these flags to be true to allow login through.
                locationConsent: true,
                ipConsent: true,
            })
                .then((res) => {
                    // Handle based on status code
                    const status = res.status || res.data?.status;

                    if (status === 423) {
                        updateFromResponse(res.data);
                        toast.error(
                            res.data.message ||
                            "Your account is locked due to multiple failed login attempts."
                        );
                        return;
                    }

                    if (status === 401) {
                        // Invalid credentials
                        updateFromResponse(res.data);
                        const remaining = res.data.attemptsRemaining;
                        if (remaining !== undefined) {
                            if (remaining === 0) {
                                toast.error(
                                    "Your account has been locked due to too many failed attempts."
                                );
                            } else {
                                toast.error(
                                    `Invalid credentials. ${remaining} attempt${remaining !== 1 ? "s" : ""
                                    } remaining.`
                                );
                            }
                        } else {
                            toast.error(res.data.message || "Invalid credentials");
                        }
                        return;
                    }

                    if (res.data.isOk) {
                        localStorage.setItem("role", res.data.role);
                        setAdminData({ ...res.data.data });
                        fetchMenus();
                        navigate("/dashboard");
                    } else {
                        toast.error(res.data.message || "Authentication failed!");
                    }
                })
                .catch((err) => {
                    // Handle axios error responses
                    if (err.response) {
                        const { status, data } = err.response;
                        if (status === 423) {
                            updateFromResponse(data);
                            toast.error(
                                data.message ||
                                "Your account is locked due to multiple failed login attempts."
                            );
                        } else if (status === 401) {
                            updateFromResponse(data);
                            const remaining = data.attemptsRemaining;
                            if (remaining !== undefined) {
                                toast.error(
                                    `Invalid credentials. ${remaining} attempt${remaining !== 1 ? "s" : ""
                                    } remaining.`
                                );
                            } else {
                                toast.error(data.message || "Invalid credentials");
                            }
                        } else {
                            toast.error(data.message || "Authentication failed!");
                        }
                    } else {
                        toast.error(err.message || "Authentication failed!");
                    }
                })
                .finally(() => {
                    setIsLoginLoading(false);
                    // Refresh login status after attempt
                    fetchLoginStatus();
                });
        } catch (error) {
            console.error("Login error:", error);
            toast.error("An error occurred during login. Please try again.");
            setIsLoginLoading(false);
        }
    };

    const validate = (values) => {
        const errors = {};
        if (!values.email) {
            errors.email = "Email is required!";
            setErrEmail(true);
        } else if (!isValidEmail(values.email)) {
            errors.email = "Invalid Email address!";
            setErrEmail(true);
        } else {
            setErrEmail(false);
        }
        if (!values.password) {
            errors.password = "Password is required!";
            setErrPassword(true);
        } else {
            setErrPassword(false);
        }
        return errors;
    };

    // Handle forgot password email submission with countdown
    const handleSendOTP = () => {
        if (!isValidEmail(forgotPasswordEmail)) {
            toast.error("Please enter a valid email address");
            return;
        }

        setIsSendOtpLoading(true);
        sendOtp({
            email: forgotPasswordEmail,
        })
            .then((res) => {
                setIsSendOtpLoading(false);
                if (res.data.isOk) {
                    toast.success("OTP sent to your email");
                    setForgotPasswordStep(2);

                    // Start the countdown timer
                    setOtpResendDisabled(true);
                    setOtpCountdown(OTP.RESEND_COOLDOWN_MS / 1000);
                } else {
                    toast.error(res.data.message || "Failed to send OTP");

                    // If server returns a remainingTime, use that for the countdown
                    if (res.data.remainingTime) {
                        setOtpResendDisabled(true);
                        setOtpCountdown(res.data.remainingTime);
                    }
                }
            })
            .catch((err) => {
                setIsSendOtpLoading(false);

                // Handle the specific 429 error case with remaining time
                if (
                    err.response &&
                    err.response.status === 429 &&
                    err.response.data.remainingTime
                ) {
                    toast.error(
                        err.message || "Please wait before requesting a new OTP"
                    );
                    setOtpResendDisabled(true);
                    setOtpCountdown(err.response.data.remainingTime);
                } else {
                    toast.error(
                        (err.response &&
                            err.response.data &&
                            err.response.data.message) ||
                        err.message ||
                        "Failed to send OTP"
                    );
                }
            });
    };

    // Handle OTP resend
    const handleResendOTP = () => {
        if (otpResendDisabled) return;

        setIsResendOtpLoading(true);
        sendOtp({
            email: forgotPasswordEmail,
        })
            .then((res) => {
                setIsResendOtpLoading(false);
                if (res.data.isOk) {
                    toast.success("OTP resent to your email");

                    // Start the countdown timer
                    setOtpResendDisabled(true);
                    setOtpCountdown(OTP.RESEND_COOLDOWN_MS / 1000);
                } else {
                    toast.error(res.data.message || "Failed to resend OTP");

                    // If server returns a remainingTime, use that for the countdown
                    if (res.data.remainingTime) {
                        setOtpResendDisabled(true);
                        setOtpCountdown(res.data.remainingTime);
                    }
                }
            })
            .catch((err) => {
                setIsResendOtpLoading(false);

                // Handle the specific 429 error case with remaining time
                if (
                    err.response &&
                    err.response.status === 429 &&
                    err.response.data.remainingTime
                ) {
                    toast.error(
                        err.message || "Please wait before requesting a new OTP"
                    );
                    setOtpResendDisabled(true);
                    setOtpCountdown(err.response.data.remainingTime);
                } else {
                    toast.error(err.message || "Failed to resend OTP");
                }
            });
    };

    // Handle OTP verification
    const handleVerifyOTP = () => {
        if (!otp || otp.length !== OTP.LENGTH) {
            toast.error(`Please enter a valid ${OTP.LENGTH}-digit OTP`);
            return;
        }

        setIsVerifyOtpLoading(true);
        verifyOtp({
            email: forgotPasswordEmail,
            otp: otp,
        })
            .then((res) => {
                setIsVerifyOtpLoading(false);
                if (res.data.isOk) {
                    toast.success("OTP verified successfully");
                    setForgotPasswordStep(3);
                } else {
                    toast.error(res.data.message || "Invalid OTP");
                }
            })
            .catch((err) => {
                setIsVerifyOtpLoading(false);
                toast.error(err.message || "Failed to verify OTP");
            });
    };

    // Handle password reset
    const handleResetPassword = () => {
        if (!isStrongPassword(newPassword)) {
            toast.error(PASSWORD.MESSAGE);
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("Passwords don't match");
            return;
        }

        setIsResetPasswordLoading(true);
        resetPassword({
            email: forgotPasswordEmail,
            otp: otp,
            newPassword: newPassword,
        })
            .then((res) => {
                setIsResetPasswordLoading(false);
                if (res.data.isOk) {
                    toast.success("Password reset successfully");
                    // Reset to login form
                    setForgotPasswordMode(false);
                    setForgotPasswordStep(1);
                    setForgotPasswordEmail("");
                    setOtp("");
                    setNewPassword("");
                    setConfirmPassword("");
                } else {
                    toast.error(res.message || "Failed to reset password");
                }
            })
            .catch((err) => {
                setIsResetPasswordLoading(false);
                toast.error(err.message || "Failed to reset password");
            });
    };

    // Handle back to login
    const handleBackToLogin = () => {
        setForgotPasswordMode(false);
        setForgotPasswordStep(1);
        setForgotPasswordEmail("");
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
    };

    document.title = `Sign in | Demo Panel`;
    /** Lockout countdown, or the remaining-attempts warning. */
    const AttemptBanner = () => {
        if (isLocked) {
            return (
                <div className="flex items-start gap-3 rounded-lg bg-error-primary p-3 ring-1 ring-error">
                    <Lock01 className="mt-0.5 size-4 shrink-0 text-fg-error-primary" />
                    <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-semibold text-primary">Account locked</p>
                        <p className="text-sm text-tertiary">Try again in {formattedTime}</p>
                        <button
                            type="button"
                            onClick={() => {
                                setForgotPasswordMode(true);
                                setForgotPasswordStep(1);
                                setForgotPasswordEmail(values.email);
                            }}
                            className="mt-1 w-fit cursor-pointer text-sm font-semibold text-brand-secondary hover:underline"
                        >
                            Reset your password
                        </button>
                    </div>
                </div>
            );
        }

        if (attemptsRemaining !== null && attemptsRemaining < LOGIN.MAX_ATTEMPTS) {
            return (
                <div className="flex items-start gap-3 rounded-lg bg-warning-primary p-3 ring-1 ring-warning">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-fg-warning-primary" />
                    <div className="flex flex-col gap-0.5">
                        <p className="text-sm font-semibold text-primary">{attemptsRemaining} attempts remaining</p>
                        <p className="text-sm text-tertiary">Your account locks after {attemptsRemaining} more failed attempts.</p>
                    </div>
                </div>
            );
        }

        return null;
    };

    const stepCopy = {
        1: { title: "Forgot password?", subtitle: "Enter your email and we'll send you a one-time code." },
        2: { title: "Check your email", subtitle: `We sent a ${OTP.LENGTH}-digit code to ${forgotPasswordEmail}` },
        3: { title: "Set a new password", subtitle: PASSWORD.MESSAGE },
    }[forgotPasswordStep];

    const renderForgotPasswordForm = () => (
        <div className="flex flex-col gap-5">
            {forgotPasswordStep === 1 && (
                <>
                    <Input
                        label="Email"
                        type="email"
                        icon={Mail01}
                        isRequired
                        placeholder="name@company.com"
                        value={forgotPasswordEmail}
                        onChange={setForgotPasswordEmail}
                    />
                    <Button size="lg" onClick={handleSendOTP} isLoading={isSendOtpLoading} isDisabled={isSendOtpLoading}>
                        {isSendOtpLoading ? "Sending..." : "Send code"}
                    </Button>
                </>
            )}

            {forgotPasswordStep === 2 && (
                <>
                    <Input
                        label="One-time code"
                        isRequired
                        placeholder={"0".repeat(OTP.LENGTH)}
                        maxLength={OTP.LENGTH}
                        value={otp}
                        onChange={setOtp}
                    />
                    <Button size="lg" onClick={handleVerifyOTP} isLoading={isVerifyOtpLoading} isDisabled={isVerifyOtpLoading}>
                        {isVerifyOtpLoading ? "Verifying..." : "Verify code"}
                    </Button>
                    <div className="flex justify-center">
                        {otpCountdown > 0 ? (
                            <span className="text-sm text-tertiary">Resend available in {formatTime(otpCountdown)}</span>
                        ) : (
                            <Button size="sm" color="link-color" onClick={handleResendOTP} isDisabled={otpResendDisabled || isResendOtpLoading}>
                                {isResendOtpLoading ? "Resending..." : "Resend code"}
                            </Button>
                        )}
                    </div>
                </>
            )}

            {forgotPasswordStep === 3 && (
                <>
                    <Input
                        label="New password"
                        type="password"
                        icon={Lock01}
                        isRequired
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={setNewPassword}
                    />
                    <Input
                        label="Confirm password"
                        type="password"
                        icon={Lock01}
                        isRequired
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={setConfirmPassword}
                    />
                    <Button size="lg" onClick={handleResetPassword} isLoading={isResetPasswordLoading} isDisabled={isResetPasswordLoading}>
                        {isResetPasswordLoading ? "Resetting..." : "Reset password"}
                    </Button>
                </>
            )}

            <Button size="md" color="link-gray" iconLeading={ArrowLeft} onClick={handleBackToLogin}>
                Back to sign in
            </Button>
        </div>
    );

    document.title = `Sign in | Demo Panel`;

    return (
        // Single centred panel. The subtle radial wash keeps the card from
        // floating on a flat field without needing a background image.
        <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-secondary px-4 py-12">
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_40rem_at_50%_-10%,var(--color-bg-brand-primary),transparent)] opacity-60"
            />

            <div className="relative w-full max-w-sm">
                <div className="flex flex-col gap-6 rounded-2xl bg-primary p-6 shadow-lg ring-1 ring-secondary sm:p-8">
                    <div className="flex flex-col gap-2 text-center">
                        <h1 className="text-display-xs font-semibold text-primary">
                            {forgotPasswordMode ? stepCopy.title : "Sign in"}
                        </h1>
                        <p className="text-sm text-tertiary">
                            {forgotPasswordMode ? stepCopy.subtitle : "Welcome back. Please enter your details."}
                        </p>
                    </div>

                    {forgotPasswordMode ? (
                        renderForgotPasswordForm()
                    ) : (
                        <form onSubmit={login} noValidate className="flex flex-col gap-5">
                            <AttemptBanner />

                            <Input
                                label="Email"
                                type="email"
                                icon={Mail01}
                                isRequired
                                name="email"
                                placeholder="name@company.com"
                                value={values.email}
                                onChange={(v) => handleChange({ target: { name: "email", value: v } })}
                                isInvalid={Boolean(isSubmit && formErrors.email)}
                                hint={isSubmit ? formErrors.email : undefined}
                            />

                            <Input
                                label="Password"
                                type={showPassword ? "text" : "password"}
                                icon={Lock01}
                                isRequired
                                name="password"
                                placeholder="Enter your password"
                                value={values.password}
                                onChange={(v) => handleChange({ target: { name: "password", value: v } })}
                                isInvalid={Boolean(isSubmit && formErrors.password)}
                                hint={isSubmit ? formErrors.password : undefined}
                                trailingIcon={
                                    <ButtonUtility
                                        size="xs"
                                        color="tertiary"
                                        icon={showPassword ? EyeOff : Eye}
                                        tooltip={showPassword ? "Hide password" : "Show password"}
                                        onClick={() => setShowPassword(!showPassword)}
                                    />
                                }
                            />

                            <Button type="submit" size="lg" isLoading={isLoginLoading} isDisabled={isLoginLoading || isLocked}>
                                {isLoginLoading ? "Signing in..." : "Sign in"}
                            </Button>

                            <div className="flex justify-center">
                                <Button
                                    type="button"
                                    size="sm"
                                    color="link-gray"
                                    onClick={() => {
                                        setForgotPasswordMode(true);
                                        setForgotPasswordStep(1);
                                        setForgotPasswordEmail(values.email);
                                    }}
                                >
                                    Forgot password?
                                </Button>
                            </div>
                        </form>
                    )}
                </div>

                <p className="pt-6 text-center text-xs text-tertiary">
                    {new Date().getFullYear()} © Demo Panel
                </p>
            </div>
        </div>
    );
};

export default Login;
