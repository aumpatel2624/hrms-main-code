import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { MenuContext } from "../../context/MenuContext";
import { Card, PageHeader } from "@/components/ui/page";
import { FormActions, FormSection, FullWidth } from "@/components/ui/form";
import { CheckField, EmailField, Field, PasswordField, SelectField, TextAreaField } from "@/components/ui/field";
import IconPicker from "@/components/ui/icon-picker";
import JoditEditor from "jodit-react";
import { Label } from "@/components/base/input/label";
import { HintText } from "@/components/base/input/hint-text";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";

/** Renders one field from its config. */
const renderField = ({ field, values, errors, showErrors, setValues, handleChange, lookups }) => {
    // Undefined values would override the defaults baked into EmailField and
    // PasswordField (their icon and placeholder), so only pass what is set.
    const shared = Object.fromEntries(
        Object.entries({
            label: field.label,
            isRequired: field.required,
            placeholder: field.placeholder,
            hint: field.hint,
            icon: field.icon,
            error: showErrors ? errors[field.name] : undefined,
            isDisabled: field.disabled?.(values),
        }).filter(([, v]) => v !== undefined),
    );

    switch (field.type) {
        case "checkbox":
            return (
                <CheckField
                    key={field.name}
                    label={field.label}
                    name={field.name}
                    checked={values[field.name]}
                    onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.checked }))}
                />
            );
        case "select":
            return (
                <SelectField
                    key={field.name}
                    {...shared}
                    options={field.optionsFrom ? (lookups[field.optionsFrom] ?? []) : (field.options ?? [])}
                    value={values[field.name]}
                    onChange={(option) =>
                        setValues((v) => ({
                            ...v,
                            [field.name]: option ? option.value : "",
                            ...(field.clears ?? []).reduce((acc, k) => ({ ...acc, [k]: "" }), {}),
                        }))
                    }
                />
            );
        case "textarea":
            return <TextAreaField key={field.name} {...shared} name={field.name} rows={field.rows ?? 3} value={values[field.name]} onChange={handleChange} />;
        case "email":
            return <EmailField key={field.name} {...shared} name={field.name} value={values[field.name]} onChange={handleChange} />;
        case "password":
            return <PasswordField key={field.name} {...shared} isNew name={field.name} value={values[field.name]} onChange={handleChange} />;
        case "richtext":
            return (
                <div key={field.name} className="flex flex-col gap-1.5">
                    <Label isRequired={field.required}>{field.label}</Label>
                    <div className="overflow-hidden rounded-lg ring-1 ring-primary">
                        <JoditEditor
                            value={values[field.name] ?? ""}
                            config={field.editorConfig}
                            tabIndex={1}
                            name={field.name}
                            onBlur={(content) => setValues((v) => ({ ...v, [field.name]: content }))}
                        />
                    </div>
                    {showErrors && errors[field.name] && <HintText isInvalid>{errors[field.name]}</HintText>}
                </div>
            );
        case "icon":
            return (
                <IconPicker
                    key={field.name}
                    label={field.label}
                    required={field.required}
                    value={values[field.name]}
                    onChange={(icon) => setValues((v) => ({ ...v, [field.name]: icon }))}
                    error={showErrors ? errors[field.name] : undefined}
                />
            );
        default:
            return (
                <Field
                    key={field.name}
                    {...shared}
                    type={field.type ?? "text"}
                    min={field.min}
                    name={field.name}
                    value={values[field.name]}
                    onChange={handleChange}
                />
            );
    }
};

/** Add and edit share this screen; `mode` decides which API call runs. */
const CrudForm = ({ config, mode = "add" }) => {
    const isEdit = mode === "edit";
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentPagePermissions } = useContext(MenuContext);

    const initialState = useMemo(
        () => Object.fromEntries(config.fields.map((f) => [f.name, f.type === "checkbox" ? Boolean(f.default) : (f.default ?? "")])),
        [config.fields],
    );

    const [values, setValues] = useState(initialState);
    const [errors, setErrors] = useState({});
    const [showErrors, setShowErrors] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isFetching, setIsFetching] = useState(isEdit);
    const [lookups, setLookups] = useState({});

    // Lookup lists that feed the select fields.
    useEffect(() => {
        let cancelled = false;
        Object.entries(config.lookups ?? {}).forEach(([key, loader]) => {
            loader(values, { id, mode })
                .then((options) => !cancelled && setLookups((prev) => ({ ...prev, [key]: options })))
                .catch((err) => console.log(err));
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...(config.lookupDeps ?? []).map((k) => values[k])]);

    useEffect(() => {
        if (!isEdit || !id) return;
        setIsFetching(true);
        config.api
            .getById(id)
            .then((res) => {
                const data = res.data?.data;
                if (!data) return;
                // The single-record endpoints `populate()` relations, so a ref
                // arrives as the whole referenced document. A select matches on
                // the id, and the save payload must send the id — so flatten
                // any populated ref back to its _id as it enters the form.
                setValues(
                    config.toForm
                        ? config.toForm(data)
                        : Object.fromEntries(
                              config.fields.map((f) => {
                                  const raw = data[f.name];
                                  const value =
                                      raw && typeof raw === "object" && !Array.isArray(raw) && raw._id ? raw._id : raw;
                                  return [f.name, value ?? initialState[f.name]];
                              }),
                          ),
                );
            })
            .catch((err) => {
                console.log(err);
                toast.error(`Failed to fetch ${config.singular.toLowerCase()} details`);
            })
            .finally(() => setIsFetching(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, isEdit]);

    const handleChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

    const validate = () => {
        const found = {};
        config.fields.forEach((field) => {
            if (field.hideIn?.includes(mode)) return;
            const value = values[field.name];
            if (field.required && (value === "" || value === null || value === undefined)) {
                found[field.name] = field.error ?? `${field.label} is required!`;
                return;
            }
            const custom = field.validate?.(value, values, mode);
            if (custom) found[field.name] = custom;
        });
        return found;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const found = validate();
        setErrors(found);
        setShowErrors(true);
        if (Object.keys(found).length) return;

        setIsSaving(true);
        const payload = config.toPayload ? config.toPayload(values, mode) : values;
        try {
            const res = isEdit ? await config.api.update(id, payload) : await config.api.create(payload);
            if (res?.data && res.data.isOk === false) {
                toast.error(res.data.message || `Cannot save ${config.singular.toLowerCase()}`);
                return;
            }
            toast.success(`${config.singular} ${isEdit ? "updated" : "added"} successfully!`);
            navigate(config.path);
        } catch (err) {
            console.log(err);
            toast.error(err.response?.data?.message || `Failed to ${isEdit ? "update" : "add"} ${config.singular.toLowerCase()}.`);
        } finally {
            setIsSaving(false);
        }
    };

    // A config's own `sections` (when present) is trusted as-is, in order.
    // But a field can name a `section` id that isn't declared there (or no
    // `sections` array exists at all while fields still set `section:
    // "details"`/`"status"`/etc) — without this, that field silently has
    // nowhere to render: `(f.section ?? "default") === section.id` never
    // matches, `if (!fields.length) return null` drops the whole section,
    // and the form/view shows nothing at all (issue #27). Any field-section
    // id not already covered gets its own auto-titled section appended, so
    // every field always has somewhere to land.
    const declaredSections = config.sections ?? [];
    const declaredSectionIds = new Set(declaredSections.map((s) => s.id));
    const usedSectionIds = [...new Set(config.fields.map((f) => f.section ?? "default"))];
    const autoSections = usedSectionIds
        .filter((id) => !declaredSectionIds.has(id))
        .map((id) => ({
            id,
            title: id === "default" ? `${config.singular} details` : id.charAt(0).toUpperCase() + id.slice(1),
        }));
    const sections = [...declaredSections, ...autoSections];
    const visible = config.fields.filter((f) => !f.hideIn?.includes(mode));

    document.title = `${isEdit ? "Edit" : "Add"} ${config.singular} | Demo Panel`;

    if (!isEdit && !currentPagePermissions.write) {
        return <PageHeader title={`Add ${config.singular}`} pageTitle={config.plural} description="You do not have permission to create records here." />;
    }
    // Issue #11: nothing previously stopped a direct URL visit to the edit
    // route regardless of the edit permission (only the "Edit" button on
    // CrudView was permission-gated) — matching the add-mode guard above.
    if (isEdit && !currentPagePermissions.edit) {
        return <PageHeader title={`Edit ${config.singular}`} pageTitle={config.plural} description="You do not have permission to edit records here." />;
    }

    return (
        <>
            <PageHeader
                title={`${isEdit ? "Edit" : "Add"} ${config.singular}`}
                pageTitle={config.plural}
                pageHref={config.path}
                description={config.formDescription}
            />

            <Card className="px-5 pt-2 md:px-6">
                {isFetching ? (
                    <div className="flex justify-center py-16">
                        <LoadingIndicator type="dot-circle" size="md" label={`Loading ${config.singular.toLowerCase()}...`} />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} noValidate>
                        {sections.map((section) => {
                            const fields = visible.filter((f) => (f.section ?? "default") === section.id);
                            if (!fields.length) return null;
                            return (
                                <FormSection key={section.id} title={section.title} description={section.description} columns={section.columns}>
                                    {fields.map((field) => {
                                        const node = renderField({ field, values, errors, showErrors, setValues, handleChange, lookups });
                                        const spans = field.full || ["checkbox", "textarea", "icon", "richtext"].includes(field.type);
                                        return spans ? <FullWidth key={field.name}>{node}</FullWidth> : node;
                                    })}
                                </FormSection>
                            );
                        })}

                        {config.renderExtra?.({ mode, id, values, setValues })}

                        <FormActions
                            onSubmit={handleSubmit}
                            cancelTo={config.path}
                            isLoading={isSaving}
                            submitLabel={isEdit ? "Save changes" : `Create ${config.singular.toLowerCase()}`}
                            loadingLabel={isEdit ? "Saving..." : "Creating..."}
                        />
                    </form>
                )}
            </Card>
        </>
    );
};

export default CrudForm;
