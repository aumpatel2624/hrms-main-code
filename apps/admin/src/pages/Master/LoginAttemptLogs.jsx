import { useState, useEffect, useContext } from "react";
import { toast } from "react-toastify";
import { RefreshCw01, Lock01, ShieldTick, Users01, XCircle } from "@untitledui/icons";

import { getLoginAttempts, resetLoginAttempts, unlockAccount, blockUser, unblockUser } from "../../api/admin.api";
import { AuthContext } from "../../context/AuthContext";
import DataTable from "@/components/ui/data-table";
import { ConfirmModal } from "@/components/ui/modal";
import { Card, PageHeader } from "@/components/ui/page";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";

const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const getRemainingTime = (lockUntil) => {
    if (!lockUntil) return null;
    const diff = new Date(lockUntil) - new Date();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
};

const StatTile = ({ icon, color, label, value }) => (
    <Card className="flex items-center gap-4 p-4">
        <FeaturedIcon color={color} theme="light" size="lg" icon={icon} />
        <div className="flex flex-col">
            <span className="text-sm text-tertiary">{label}</span>
            <span className="text-display-xs font-semibold text-primary">{value}</span>
        </div>
    </Card>
);

const LoginAttemptLogs = () => {
    const { adminData } = useContext(AuthContext);
    const [loginAttempts, setLoginAttempts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalRows, setTotalRows] = useState(0);
    const [perPage, setPerPage] = useState(10);
    const [pageNo, setPageNo] = useState(1);
    const [column, setColumn] = useState("lastLoginAttempt");
    const [sortDirection, setSortDirection] = useState("desc");
    const [query, setQuery] = useState("");

    const [confirmModal, setConfirmModal] = useState(false);
    const [modalAction, setModalAction] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchLoginAttempts = async () => {
        setLoading(true);
        let skip = (pageNo - 1) * perPage;
        if (skip < 0) skip = 0;

        try {
            const response = await getLoginAttempts({
                skip,
                per_page: perPage,
                sorton: column,
                sortdir: sortDirection,
                match: query,
            });

            if (response.data?.data?.length > 0) {
                const res = response.data.data[0];
                setLoginAttempts(res.data || []);
                setTotalRows(res.count || 0);
            } else {
                setLoginAttempts([]);
                setTotalRows(0);
            }
        } catch (error) {
            console.error("Error fetching login attempts:", error);
            toast.error("Failed to fetch login attempts");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLoginAttempts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageNo, perPage, column, sortDirection, query]);

    const openAction = (row, action) => {
        setSelectedUser(row);
        setModalAction(action);
        setConfirmModal(true);
    };

    const handleConfirm = async () => {
        if (!selectedUser) return;
        setActionLoading(true);
        try {
            if (modalAction === "unlock") {
                await unlockAccount(selectedUser.userId);
                toast.success(`Account unlocked for ${selectedUser.userEmail}`);
            } else if (modalAction === "reset") {
                await resetLoginAttempts(selectedUser.userId);
                toast.success(`Login attempts reset for ${selectedUser.userEmail}`);
            } else if (modalAction === "block") {
                await blockUser(selectedUser.userId);
                toast.success(`Account blocked for ${selectedUser.userEmail}`);
            } else if (modalAction === "unblock") {
                await unblockUser(selectedUser.userId);
                toast.success(`Account unblocked for ${selectedUser.userEmail}`);
            }
            fetchLoginAttempts();
        } catch (error) {
            console.error(error);
            toast.error("Action failed. Please try again.");
        } finally {
            setActionLoading(false);
            setConfirmModal(false);
            setSelectedUser(null);
            setModalAction(null);
        }
    };

    const handleSort = (col, dir) => {
        setColumn(col.sortField);
        setSortDirection(dir);
    };

    const stats = {
        total: loginAttempts.length,
        withAttempts: loginAttempts.filter((r) => r.attemptCount > 0).length,
        locked: loginAttempts.filter((r) => r.isLocked).length,
        clean: loginAttempts.filter((r) => !r.attemptCount && !r.isLocked).length,
    };

    const columns = [
        { name: "#", selector: (row, index) => (pageNo - 1) * perPage + index + 1, maxWidth: "70px" },
        {
            name: "User",
            sortable: true,
            sortField: "userName",
            minWidth: "220px",
            cell: (row) => (
                <div className="flex flex-col">
                    <span className="font-medium text-primary">{row.userName || "-"}</span>
                    <span className="text-xs text-tertiary">{row.userEmail}</span>
                </div>
            ),
        },
        {
            name: "Status",
            minWidth: "150px",
            cell: (row) => {
                if (row.isBlocked) return <Badge color="error">Blocked</Badge>;
                if (row.isLocked) {
                    const remaining = getRemainingTime(row.lockUntil);
                    return <Badge color="warning">{remaining ? `Locked (${remaining})` : "Locked"}</Badge>;
                }
                return <Badge color="success">Active</Badge>;
            },
        },
        {
            name: "Failed Attempts",
            sortable: true,
            sortField: "attemptCount",
            minWidth: "140px",
            cell: (row) => <Badge color={row.attemptCount > 0 ? "warning" : "gray"}>{row.attemptCount || 0}</Badge>,
        },
        {
            name: "Last Attempt",
            sortable: true,
            sortField: "lastLoginAttempt",
            minWidth: "170px",
            cell: (row) => formatDate(row.lastLoginAttempt),
        },
        {
            name: "Last Login",
            sortable: true,
            sortField: "lastLoggedIn",
            minWidth: "170px",
            cell: (row) => formatDate(row.lastLoggedIn),
        },
        {
            name: "Action",
            minWidth: "260px",
            cell: (row) => {
                const isSelf = row.userId === adminData?._id;
                return (
                    <div className="flex flex-wrap items-center gap-2">
                        {row.attemptCount > 0 && (
                            <Button size="sm" color="link-color" onClick={() => openAction(row, "reset")}>
                                Reset
                            </Button>
                        )}
                        {row.isLocked && (
                            <Button size="sm" color="link-color" onClick={() => openAction(row, "unlock")}>
                                Unlock
                            </Button>
                        )}
                        {!isSelf &&
                            (row.isBlocked ? (
                                <Button size="sm" color="link-color" onClick={() => openAction(row, "unblock")}>
                                    Unblock
                                </Button>
                            ) : (
                                <Button size="sm" color="link-destructive" onClick={() => openAction(row, "block")}>
                                    Block
                                </Button>
                            ))}
                    </div>
                );
            },
        },
    ];

    const actionCopy = {
        unlock: { title: "Unlock account?", description: `This will unlock ${selectedUser?.userEmail}.`, confirm: "Unlock" },
        reset: { title: "Reset login attempts?", description: `This will clear failed attempts for ${selectedUser?.userEmail}.`, confirm: "Reset" },
        block: { title: "Block account?", description: `This will block ${selectedUser?.userEmail} from signing in.`, confirm: "Block" },
        unblock: { title: "Unblock account?", description: `This will restore access for ${selectedUser?.userEmail}.`, confirm: "Unblock" },
    }[modalAction] || {};

    document.title = `Login Attempt Logs | Demo Panel`;

    return (
        <>
            <PageHeader
                title="Login Attempt Logs"
                pageTitle="Master"
                description="Failed sign-in attempts, lockouts and blocked accounts."
                setQuery={(v) => {
                    setQuery(v);
                    setPageNo(1);
                }}
                actions={
                    <Button color="secondary" iconLeading={RefreshCw01} onClick={fetchLoginAttempts}>
                        Refresh
                    </Button>
                }
            />

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatTile icon={Users01} color="brand" label="Total Users" value={stats.total} />
                <StatTile icon={XCircle} color="warning" label="With Attempts" value={stats.withAttempts} />
                <StatTile icon={Lock01} color="error" label="Locked" value={stats.locked} />
                <StatTile icon={ShieldTick} color="success" label="Clean" value={stats.clean} />
            </div>

            <Card>

                <DataTable
                    ariaLabel="Login attempts"
                    columns={columns}
                    data={loginAttempts}
                    progressPending={loading}
                    onSort={handleSort}
                    paginationTotalRows={totalRows}
                    paginationPerPage={10}
                    paginationRowsPerPageOptions={[10, 25, 50, 100]}
                    onChangeRowsPerPage={setPerPage}
                    onChangePage={setPageNo}
                />
            </Card>

            <ConfirmModal
                isOpen={confirmModal}
                onClose={() => setConfirmModal(false)}
                onConfirm={handleConfirm}
                isLoading={actionLoading}
                title={actionCopy.title}
                description={actionCopy.description}
                confirmLabel={actionCopy.confirm}
                loadingLabel="Working..."
            />
        </>
    );
};

export default LoginAttemptLogs;
