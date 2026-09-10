import { useMemo, useState } from "react";
import { SearchLg } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Input } from "@/components/base/input/input";
import { Label } from "@/components/base/input/label";
import { HintText } from "@/components/base/input/hint-text";
import { cx } from "@/utils/cx";

// These are remixicon class strings, not components: the chosen value is stored
// in Mongo and rendered by the sidebar as <i className={icon}>. Keep them as-is.
const ICON_LIST = [
    // Common/Popular Icons
    { name: "No Icon", class: "" },
    { name: "Home", class: "ri-home-line" },
    { name: "Dashboard", class: "ri-dashboard-line" },
    { name: "Settings", class: "ri-settings-line" },
    { name: "User", class: "ri-user-line" },
    { name: "Users", class: "ri-team-line" },
    { name: "File", class: "ri-file-line" },
    { name: "Folder", class: "ri-folder-line" },
    { name: "Mail", class: "ri-mail-line" },
    { name: "Calendar", class: "ri-calendar-line" },
    { name: "Clock", class: "ri-time-line" },
    { name: "Bell", class: "ri-notification-line" },
    { name: "Chart", class: "ri-bar-chart-line" },
    { name: "Grid", class: "ri-grid-line" },
    { name: "List", class: "ri-list-check" },
    { name: "Menu", class: "ri-menu-line" },
    { name: "Search", class: "ri-search-line" },
    { name: "Filter", class: "ri-filter-line" },
    { name: "Edit", class: "ri-edit-line" },
    { name: "Delete", class: "ri-delete-bin-line" },
    { name: "Add", class: "ri-add-line" },
    { name: "Close", class: "ri-close-line" },
    { name: "Check", class: "ri-check-line" },
    { name: "Info", class: "ri-information-line" },
    { name: "Warning", class: "ri-error-warning-line" },
    { name: "Star", class: "ri-star-line" },
    { name: "Heart", class: "ri-heart-line" },
    { name: "Lock", class: "ri-lock-line" },
    { name: "Unlock", class: "ri-lock-unlock-line" },
    { name: "Eye", class: "ri-eye-line" },
    { name: "Download", class: "ri-download-line" },
    { name: "Upload", class: "ri-upload-line" },
    { name: "Share", class: "ri-share-line" },
    { name: "Link", class: "ri-link" },
    { name: "External Link", class: "ri-external-link-line" },
    { name: "Phone", class: "ri-phone-line" },
    { name: "Map Pin", class: "ri-map-pin-line" },
    { name: "Building", class: "ri-building-line" },
    { name: "Bank", class: "ri-bank-line" },
    { name: "Store", class: "ri-store-line" },
    { name: "Shopping Cart", class: "ri-shopping-cart-line" },
    { name: "Money", class: "ri-money-dollar-circle-line" },
    { name: "Wallet", class: "ri-wallet-line" },
    { name: "Credit Card", class: "ri-bank-card-line" },
    { name: "Book", class: "ri-book-line" },
    { name: "Bookmark", class: "ri-bookmark-line" },
    { name: "Award", class: "ri-award-line" },
    { name: "Trophy", class: "ri-trophy-line" },
    { name: "Gift", class: "ri-gift-line" },
    { name: "Image", class: "ri-image-line" },
    { name: "Camera", class: "ri-camera-line" },
    { name: "Video", class: "ri-video-line" },
    { name: "Music", class: "ri-music-line" },
    { name: "Language", class: "ri-global-line" },

    // Boxicons alternatives
    { name: "Home (Box)", class: "bx bx-home" },
    { name: "User (Box)", class: "bx bx-user" },
    { name: "Users (Box)", class: "bx bx-group" },
    { name: "Settings (Box)", class: "bx bx-cog" },
    { name: "File (Box)", class: "bx bx-file" },
    { name: "Folder (Box)", class: "bx bx-folder" },
    { name: "Menu (Box)", class: "bx bx-menu" },
    { name: "Grid (Box)", class: "bx bx-grid-alt" },
    { name: "Chart (Box)", class: "bx bx-bar-chart" },
    { name: "Calendar (Box)", class: "bx bx-calendar" },
    { name: "Mail (Box)", class: "bx bx-envelope" },
    { name: "Bell (Box)", class: "bx bx-bell" },
    { name: "Search (Box)", class: "bx bx-search" },
    { name: "Shopping Cart (Box)", class: "bx bx-cart" },
    { name: "Money (Box)", class: "bx bx-dollar" },
    { name: "Award (Box)", class: "bx bx-award" },
    { name: "Star (Box)", class: "bx bx-star" },
];

const IconPicker = ({ label = "Icon", value, onChange, required = false, error }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return ICON_LIST;
        return ICON_LIST.filter((i) => i.name.toLowerCase().includes(q) || i.class.toLowerCase().includes(q));
    }, [search]);

    const selected = ICON_LIST.find((i) => i.class === value);

    const pick = (iconClass) => {
        onChange(iconClass);
        setOpen(false);
        setSearch("");
    };

    return (
        <div className="flex flex-col gap-1.5">
            <Label isRequired={required}>{label}</Label>

            <button
                type="button"
                onClick={() => setOpen(true)}
                className={cx(
                    "flex w-full cursor-pointer items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-left shadow-xs ring-1 transition ring-inset",
                    error ? "ring-error_subtle" : "ring-primary hover:ring-brand",
                )}
            >
                {value ? <i className={cx(value, "text-lg text-fg-secondary")} /> : null}
                <span className={cx("flex-1 text-md", selected ? "text-primary" : "text-placeholder")}>
                    {selected ? selected.name : "Select Icon"}
                </span>
            </button>

            <HintText isInvalid={Boolean(error)}>{error || "Icon will be displayed in the sidebar menu"}</HintText>

            <ModalOverlay isOpen={open} onOpenChange={setOpen} isDismissable>
                <Modal className="w-full max-w-2xl">
                    <Dialog>
                        <div className="flex items-center justify-between gap-4 border-b border-secondary px-6 py-4">
                            <h2 className="text-lg font-semibold text-primary">Select an icon</h2>
                            <CloseButton onClick={() => setOpen(false)} size="sm" label="Close" />
                        </div>

                        <div className="border-b border-secondary px-6 py-3">
                            <Input
                                aria-label="Search icons"
                                icon={SearchLg}
                                placeholder="Search icons..."
                                value={search}
                                onChange={setSearch}
                            />
                        </div>

                        <div className="max-h-96 overflow-y-auto p-4">
                            {filtered.length === 0 ? (
                                <p className="py-8 text-center text-sm text-tertiary">No icons found</p>
                            ) : (
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2">
                                    {filtered.map((icon) => (
                                        <button
                                            key={icon.class || "none"}
                                            type="button"
                                            onClick={() => pick(icon.class)}
                                            className={cx(
                                                "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg px-2 py-3 ring-1 transition",
                                                value === icon.class
                                                    ? "bg-brand-primary ring-brand"
                                                    : "ring-transparent hover:bg-primary_hover hover:ring-secondary",
                                            )}
                                        >
                                            {icon.class ? (
                                                <i className={cx(icon.class, "text-2xl text-fg-secondary")} />
                                            ) : (
                                                <span className="flex h-6 items-center text-xs text-quaternary">None</span>
                                            )}
                                            <span className="text-center text-xs break-words text-tertiary">{icon.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end border-t border-secondary px-6 py-4">
                            <Button color="secondary" onClick={() => setOpen(false)}>
                                Close
                            </Button>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </div>
    );
};

export default IconPicker;
