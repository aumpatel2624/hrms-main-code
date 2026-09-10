import { AlertTriangle } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";

/**
 * Shown when a delete comes back with isOk: false and a list of dependent
 * records that must go first. Used by the Email Setup and Email For screens,
 * which each had their own copy of this modal before the port.
 */
const DeleteBlockedModal = ({ isOpen, toggle, title = "Unable to Delete", message, services = [] }) => (
    <ModalOverlay isOpen={Boolean(isOpen)} onOpenChange={(open) => !open && toggle?.()} isDismissable>
        <Modal className="w-full max-w-md">
            <Dialog>
                <div className="flex flex-col gap-4 p-6">
                    <FeaturedIcon color="error" theme="light" size="lg" icon={AlertTriangle} />
                    <h2 className="text-lg font-semibold text-primary">{title}</h2>
                    {message && <p className="text-sm text-error-primary">{message}</p>}

                    {services?.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <p className="text-sm text-tertiary">Please delete the following first:</p>
                            <ul className="flex flex-col gap-1 rounded-lg bg-secondary p-3">
                                {services.map((service, index) => (
                                    <li key={index} className="text-sm text-secondary">
                                        {service}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="mt-2 flex justify-end">
                        <Button color="secondary" onClick={toggle}>
                            Close
                        </Button>
                    </div>
                </div>
            </Dialog>
        </Modal>
    </ModalOverlay>
);

export default DeleteBlockedModal;
