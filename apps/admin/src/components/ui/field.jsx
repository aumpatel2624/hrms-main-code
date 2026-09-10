import { useState } from "react";
import { Eye, EyeOff, Lock01, Mail01 } from "@untitledui/icons";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { ComboBox } from "@/components/base/select/combobox";
import { SelectItem } from "@/components/base/select/select-item";
import { ButtonUtility } from "@/components/base/buttons/button-utility";

// Untitled UI's inputs are React Aria, so they hand you the value directly
// rather than a DOM event. Every page in this app has a
// `handleChange = (e) => setValues({ ...values, [e.target.name]: e.target.value })`,
// so these wrappers synthesise that event shape instead of rewriting handlers.

const asEvent = (name, value, type) => ({ target: { name, value, type } });

export const Field = ({ name, value, onChange, error, type = "text", hint, ...rest }) => (
    <Input
        name={name}
        type={type}
        value={value ?? ""}
        onChange={(v) => onChange?.(asEvent(name, v, type))}
        isInvalid={Boolean(error)}
        hint={error || hint}
        {...rest}
    />
);

/** type="email" so mobile keyboards and browser autofill do the right thing. */
export const EmailField = (props) => (
    <Field type="email" icon={Mail01} autoComplete="email" inputMode="email" placeholder="name@company.com" {...props} />
);

/** Password with a reveal toggle. autoComplete matters for password managers. */
export const PasswordField = ({ isNew = false, ...props }) => {
    const [visible, setVisible] = useState(false);
    return (
        <Field
            icon={Lock01}
            {...props}
            type={visible ? "text" : "password"}
            autoComplete={isNew ? "new-password" : "current-password"}
            trailingIcon={
                <ButtonUtility
                    size="xs"
                    color="tertiary"
                    icon={visible ? EyeOff : Eye}
                    tooltip={visible ? "Hide password" : "Show password"}
                    onClick={() => setVisible((v) => !v)}
                />
            }
        />
    );
};

export const TextAreaField = ({ name, value, onChange, error, hint, ...rest }) => (
    <TextArea
        name={name}
        value={value ?? ""}
        onChange={(v) => onChange?.(asEvent(name, v, "textarea"))}
        isInvalid={Boolean(error)}
        hint={error || hint}
        {...rest}
    />
);

export const CheckField = ({ name, checked, onChange, label, ...rest }) => (
    <Checkbox
        name={name}
        isSelected={Boolean(checked)}
        onChange={(v) => onChange?.({ target: { name, value: v, checked: v, type: "checkbox" } })}
        label={label}
        {...rest}
    />
);

/**
 * Searchable dropdown. Takes the react-select shape the pages already use
 * (options: [{ value, label }], onChange(option)) and renders Untitled UI's
 * ComboBox, which filters as you type - a plain Select does not.
 */
export const SelectField = ({
    options = [],
    value,
    onChange,
    error,
    hint,
    placeholder = "Select",
    isDisabled,
    ...rest
}) => {
    const items = options.map((o) => ({ id: String(o.value), label: o.label }));
    const selectedKey = value === null || value === undefined || value === "" ? null : String(value);

    return (
        <ComboBox
            items={items}
            selectedKey={selectedKey}
            onSelectionChange={(key) => {
                const picked = options.find((o) => String(o.value) === String(key));
                onChange?.(picked ?? null);
            }}
            placeholder={placeholder}
            isDisabled={isDisabled}
            isInvalid={Boolean(error)}
            hint={error || hint}
            shortcut={false}
            {...rest}
        >
            {(item) => (
                <SelectItem key={item.id} id={item.id}>
                    {item.label}
                </SelectItem>
            )}
        </ComboBox>
    );
};
