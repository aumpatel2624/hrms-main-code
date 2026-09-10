import { AlertTriangle } from "@untitledui/icons";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Button } from "@/components/base/buttons/button";
import { CloseButton } from "@/components/base/buttons/close-button";
import { Badge } from "@/components/base/badges/badges";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";

/** Shown when the API rejects a delete with 409 because the record is referenced elsewhere. */
const ReferenceErrorModal = ({ isOpen, toggle, title = "Cannot Delete Record", referenceData }) => {
    const { message, totalReferences = 0, references = [] } = referenceData || {};

    return (
        <ModalOverlay isOpen={Boolean(isOpen)} onOpenChange={(open) => !open && toggle?.()} isDismissable>
            <Modal className="w-full max-w-2xl">
                <Dialog>
                    <div className="flex items-start justify-between gap-4 border-b border-secondary px-6 py-4">
                        <div className="flex items-center gap-3">
                            <FeaturedIcon color="error" theme="light" size="md" icon={AlertTriangle} />
                            <h2 className="text-lg font-semibold text-primary">{title}</h2>
                        </div>
                        <CloseButton onClick={toggle} size="sm" label="Close" />
                    </div>

                    <div className="flex flex-col gap-5 px-6 py-5">
                        <div className="rounded-lg bg-warning-primary p-4 ring-1 ring-warning">
                            <p className="text-sm font-semibold text-primary">Record is currently in use</p>
                            {message && <p className="mt-1 text-sm text-tertiary">{message}</p>}
                        </div>

                        {totalReferences > 0 && (
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-semibold text-secondary">Reference details</h3>
                                    <Badge color="error" size="sm">
                                        {totalReferences} reference{totalReferences > 1 ? "s" : ""}
                                    </Badge>
                                </div>

                                <ul className="flex flex-col gap-2">
                                    {references.map((ref, index) => (
                                        <li
                                            key={index}
                                            className="flex items-center justify-between gap-4 rounded-lg border-l-4 border-error-solid bg-secondary px-4 py-3"
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <p className="text-sm font-medium text-primary">{ref.collection || ref.model || ref.name}</p>
                                                {ref.field && <p className="text-xs text-tertiary">Field: {ref.field}</p>}
                                            </div>
                                            {ref.count !== undefined && (
                                                <Badge color="gray" size="sm">
                                                    {ref.count}
                                                </Badge>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end border-t border-secondary px-6 py-4">
                        <Button color="secondary" onClick={toggle}>
                            Close
                        </Button>
                    </div>
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
};

export default ReferenceErrorModal;
