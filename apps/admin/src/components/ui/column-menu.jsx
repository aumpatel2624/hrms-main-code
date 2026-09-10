import { useState } from "react";
import { ArrowDown, ArrowUp, Columns03, RefreshCw01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { ButtonUtility } from "@/components/base/buttons/button-utility";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { CloseButton } from "@/components/base/buttons/close-button";

/**
 * Column visibility and order.
 *
 * Reordering uses explicit up/down buttons rather than drag-and-drop: it needs
 * no extra dependency, works on touch, and is reachable from the keyboard.
 * Widths are set by dragging the column edge in the table itself.
 */
const ColumnMenu = ({ columns = [], hidden = [], order = [], onChange, onReset }) => {
    const [open, setOpen] = useState(false);

    const ordered = order.length
        ? [...columns].sort((a, b) => {
              const ai = order.indexOf(a.name);
              const bi = order.indexOf(b.name);
              return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
          })
        : columns;

    const visibleCount = ordered.filter((c) => !hidden.includes(c.name)).length;

    const move = (name, delta) => {
        const names = ordered.map((c) => c.name);
        const from = names.indexOf(name);
        const to = from + delta;
        if (to < 0 || to >= names.length) return;
        names.splice(to, 0, names.splice(from, 1)[0]);
        onChange({ order: names });
    };

    const toggle = (name, isVisible) =>
        onChange({ hidden: isVisible ? hidden.filter((n) => n !== name) : [...hidden, name] });

    return (
        <>
            <Button size="md" color="secondary" iconLeading={Columns03} onClick={() => setOpen(true)}>
                {`Columns (${visibleCount}/${ordered.length})`}
            </Button>

            <ModalOverlay isOpen={open} onOpenChange={setOpen} isDismissable>
                <Modal className="w-full max-w-md">
                    <Dialog>
                        <div className="flex items-center justify-between gap-4 border-b border-secondary px-5 py-4">
                            <h2 className="text-lg font-semibold text-primary">Columns</h2>
                            <CloseButton onClick={() => setOpen(false)} size="sm" label="Close" />
                        </div>

                        <ul className="flex max-h-96 flex-col overflow-y-auto p-2">
                            {ordered.map((column, index) => {
                                const isVisible = !hidden.includes(column.name);
                                return (
                                    <li
                                        key={column.name}
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-primary_hover"
                                    >
                                        <Checkbox
                                            label={column.name}
                                            isSelected={isVisible}
                                            // Never let the last visible column be hidden.
                                            isDisabled={isVisible && visibleCount === 1}
                                            onChange={(checked) => toggle(column.name, checked)}
                                        />
                                        <div className="ml-auto flex items-center gap-0.5">
                                            <ButtonUtility
                                                size="xs"
                                                color="tertiary"
                                                icon={ArrowUp}
                                                tooltip="Move up"
                                                aria-label={`Move ${column.name} up`}
                                                isDisabled={index === 0}
                                                onClick={() => move(column.name, -1)}
                                            />
                                            <ButtonUtility
                                                size="xs"
                                                color="tertiary"
                                                icon={ArrowDown}
                                                tooltip="Move down"
                                                aria-label={`Move ${column.name} down`}
                                                isDisabled={index === ordered.length - 1}
                                                onClick={() => move(column.name, 1)}
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                        <div className="flex items-center justify-between border-t border-secondary px-5 py-4">
                            <Button size="sm" color="tertiary" iconLeading={RefreshCw01} onClick={onReset}>
                                Reset to default
                            </Button>
                            <Button size="sm" onClick={() => setOpen(false)}>
                                Done
                            </Button>
                        </div>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </>
    );
};

export default ColumnMenu;
