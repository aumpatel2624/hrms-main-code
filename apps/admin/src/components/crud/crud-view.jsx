import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, Edit01 } from "@untitledui/icons";
import { MenuContext } from "../../context/MenuContext";
import { Card, PageHeader } from "@/components/ui/page";
import { FormSection, FullWidth } from "@/components/ui/form";
import { Button } from "@/components/base/buttons/button";
import { Badge } from "@/components/base/badges/badges";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { cx } from "@/utils/cx";

const formatDate = (raw) => {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? raw : d.toLocaleString();
};

/**
 * A relation arrives one of two ways: the list endpoints return the raw
 * ObjectId string, while the single-record endpoints `populate()` it into the
 * whole referenced document. Reduce both to the id so option matching works
 * either way — without this a populated ref stringifies to "[object Object]".
 */
const refId = (raw) => (raw && typeof raw === "object" && !Array.isArray(raw) ? (raw._id ?? raw.id ?? raw) : raw);

/**
 * The referenced document's own display name, used when the lookup list has
 * not loaded (or no longer contains the row — a soft-deleted department still
 * has a name worth showing). Picks the first string field that is not an id or
 * a timestamp, which matches how every model here names its label column:
 * departmentName, roleName, countryName.
 */
const refLabel = (raw) => {
    if (!raw || typeof raw !== "object") return null;
    const skip = new Set(["_id", "id", "__v", "createdAt", "updatedAt", "isActive", "isDeleted"]);
    const usable = Object.entries(raw).filter(
        // A nested `countryId` on a state is a 24-char id string, not a label.
        ([key, value]) => !skip.has(key) && typeof value === "string" && value.trim() !== "" && !/Id$/.test(key),
    );
    // Prefer an explicit name field — a State has stateCode before stateName,
    // and the code is not what a reader wants to see.
    const named = usable.find(([key]) => /name$/i.test(key));
    return (named ?? usable[0])?.[1] ?? null;
};

/**
 * Turns one stored value into something readable.
 *
 * `select` is the reason this screen loads `config.lookups` at all: without it
 * a relation renders as the raw ObjectId.
 */
const renderValue = (field, raw, lookups) => {
    if (raw === null || raw === undefined || raw === "") return null;

    switch (field.type) {
        case "checkbox":
            return <Badge color={raw ? "success" : "gray"}>{raw ? "Yes" : "No"}</Badge>;
        case "select":
        case "objectId": {
            const options = field.optionsFrom ? (lookups[field.optionsFrom] ?? []) : (field.options ?? []);
            const id = refId(raw);
            const match = options.find((o) => String(o.value) === String(id))?.label;
            // Lookup first (it is the canonical label), then the populated
            // document's own name, then the bare id — never "[object Object]".
            return match ?? refLabel(raw) ?? String(id);
        }
        case "date":
            return formatDate(raw);
        case "icon":
            return (
                <span className="flex items-center gap-2">
                    <i className={cx(raw, "text-[18px] leading-none text-fg-secondary")} />
                    <span className="text-tertiary">{raw}</span>
                </span>
            );
        case "richtext":
            // Admin-authored HTML (Jodit), same content the editor already renders.
            return <div className="text-sm leading-relaxed [&_a]:underline" dangerouslySetInnerHTML={{ __html: raw }} />;
        case "textarea":
            return <span className="whitespace-pre-line">{raw}</span>;
        default:
            // A populated relation on a field nobody declared as a select still
            // has a name; fall back to JSON only for genuinely structured data.
            if (typeof raw === "object") return refLabel(raw) ?? JSON.stringify(raw);
            return String(raw);
    }
};

/** One label/value pair. */
const Detail = ({ label, value }) => (
    <div className="flex flex-col gap-1">
        <span className="text-sm text-tertiary">{label}</span>
        <div className="text-sm font-medium break-words text-primary">
            {value ?? <span className="text-quaternary">&mdash;</span>}
        </div>
    </div>
);

/**
 * Read-only detail screen at /:id.
 *
 * It mirrors the form: same `sections`, same field order, same two-column
 * rhythm — so moving between view and edit does not move anything on screen.
 */
const CrudView = ({ config }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentPagePermissions } = useContext(MenuContext);
    const [record, setRecord] = useState(null);
    const [lookups, setLookups] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        setLoading(true);
        config.api
            .getById(id)
            .then((res) => setRecord(res.data?.data ?? null))
            .catch((err) => {
                console.log(err);
                toast.error(`Failed to fetch ${config.singular.toLowerCase()} details`);
            })
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Same loaders the form uses, so `select` fields show their label.
    useEffect(() => {
        if (!record) return;
        let cancelled = false;
        Object.entries(config.lookups ?? {}).forEach(([key, loader]) => {
            loader(record, { id, mode: "view" })
                .then((options) => !cancelled && setLookups((prev) => ({ ...prev, [key]: options })))
                .catch((err) => console.log(err));
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [record]);

    const values = record ? (config.toView ? config.toView(record) : record) : {};
    const fields = (config.viewFields ?? config.fields).filter(
        (f) => f.type !== "password" && !f.hideIn?.includes("view"),
    );
    const sections = config.sections ?? [{ id: "default", title: `${config.singular} details` }];

    const title = record ? (config.recordTitle?.(record) ?? config.singular) : config.singular;
    const status = record && "isActive" in record ? record.isActive : undefined;

    document.title = `${title} | Demo Panel`;

    return (
        <>
            <PageHeader
                title={title}
                pageTitle={config.plural}
                pageHref={config.path}
                actions={
                    record ? (
                        <>
                            {status !== undefined && (
                                <Badge color={status ? "success" : "gray"} size="md">
                                    {status ? "Active" : "Inactive"}
                                </Badge>
                        )}
                            <Button color="secondary" iconLeading={ArrowLeft} onClick={() => navigate(config.path)}>
                                Back
                            </Button>
                            {currentPagePermissions.edit && (
                                <Button iconLeading={Edit01} onClick={() => navigate(`${config.path}/${id}/edit`)}>
                                    Edit
                                </Button>
                        )}
                        </>
                    ) : null
                }
            />

            <Card className="px-5 pt-2 md:px-6">
                {loading ? (
                    <div className="flex justify-center py-16">
                        <LoadingIndicator type="dot-circle" size="md" label={`Loading ${config.singular.toLowerCase()}...`} />
                    </div>
                ) : !record ? (
                    <p className="py-16 text-center text-sm text-tertiary">
                        This {config.singular.toLowerCase()} could not be found.
                    </p>
                ) : (
                    <>
                        {sections.map((section) => {
                            const inSection = fields.filter((f) => (f.section ?? "default") === section.id);
                            if (!inSection.length) return null;
                            return (
                                <FormSection
                                    key={section.id}
                                    title={section.title}
                                    description={section.description}
                                    columns={section.columns}
                                >
                                    {inSection.map((field) => {
                                        const node = (
                                            <Detail
                                                key={field.name}
                                                label={field.label}
                                                value={renderValue(field, values[field.name], lookups)}
                                            />
                                        );
                                        const spans = field.full || ["textarea", "richtext", "icon"].includes(field.type);
                                        return spans ? <FullWidth key={field.name}>{node}</FullWidth> : node;
                                    })}
                                </FormSection>
                            );
                        })}

                        {(record.createdAt || record.updatedAt) && (
                            <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-secondary py-4 text-xs text-tertiary">
                                {record.createdAt && <span>Created {formatDate(record.createdAt)}</span>}
                                {record.updatedAt && <span>Last updated {formatDate(record.updatedAt)}</span>}
                            </div>
                        )}
                    </>
                )}
            </Card>
        </>
    );
};

export default CrudView;
