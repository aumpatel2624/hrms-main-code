import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
    ArrowLeft,
    Image01,
    Link01,
    SearchLg,
    Save01,
    Share07,
    Tag01,
    UploadCloud01,
} from "@untitledui/icons";
import {
    CHANGE_FREQUENCIES,
    MAX_IMAGE_PREVIEW,
    OG_TYPES,
    SCHEMA_PRESETS,
    SCHEMA_TYPES,
    TWITTER_CARDS,
    normalizePath,
    robotsContent,
    scoreSeo,
} from "@demo-panel/shared/seo";
import { resolveSeo } from "@demo-panel/shared/seoResolve";
import { MenuContext } from "../../context/MenuContext";
import {
    createSeoPage,
    getSeoPageById,
    getSeoSettings,
    updateSeoPage,
    uploadSeoImage,
} from "../../api/seo.api";
import { Card, PageHeader } from "@/components/ui/page";
import { CheckField, Field, SelectField, TextAreaField } from "@/components/ui/field";
import JsonEditor, { validateJson } from "@/components/ui/json-editor";
import SeoHealth from "@/components/ui/seo-health";
import {
    DescriptionMeter,
    PreviewToggle,
    SERP_DEVICES,
    SOCIAL_NETWORKS,
    SerpPreview,
    SocialPreview,
    TitleMeter,
} from "@/components/ui/seo-preview";
import { Button } from "@/components/base/buttons/button";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";

/**
 * The SEO editor for one URL.
 *
 * Not a CRUD form: the value of this screen is the column on the right, where
 * a Google result, a share card and a health checklist redraw on every
 * keystroke. Nothing there costs a request — resolveSeo and scoreSeo are the
 * same pure functions the server uses, imported from the shared package, so
 * what you see here is exactly what the site will receive.
 *
 * The list, view and delete for this entity are still the standard components;
 * only the two form routes are replaced. See Routes/allRoutes.jsx.
 */

const EMPTY_FORM = {
    path: "",
    pageName: "",
    focusKeyword: "",
    title: "",
    description: "",
    canonicalUrl: "",
    robots: {
        index: true,
        follow: true,
        noarchive: false,
        nosnippet: false,
        noimageindex: false,
        maxSnippet: -1,
        maxImagePreview: "large",
    },
    og: { title: "", description: "", image: "", imageAlt: "", type: "website" },
    twitter: { card: "summary_large_image", title: "", description: "", image: "" },
    jsonLd: { schemaType: "None", body: "" },
    sitemap: { include: true, priority: 0.5, changefreq: "weekly" },
    isActive: true,
};

const asOptions = (values, labels = {}) => values.map((value) => ({ value, label: labels[value] ?? value }));

const CHANGEFREQ_LABELS = {
    always: "Always", hourly: "Hourly", daily: "Daily", weekly: "Weekly",
    monthly: "Monthly", yearly: "Yearly", never: "Never",
};
const OG_TYPE_LABELS = {
    website: "Website (default)", article: "Article or blog post", product: "Product",
    profile: "Person profile", "video.other": "Video",
};
const TWITTER_CARD_LABELS = { summary: "Small square image", summary_large_image: "Large banner image" };
const IMAGE_PREVIEW_LABELS = {
    none: "No image in results", standard: "Small image", large: "Large image (recommended)",
};

/** One titled block of the form. */
const Section = ({ icon: Icon, title, description, children }) => (
    <Card className="mt-0">
        <div className="border-b border-secondary px-5 py-4">
            <div className="flex items-center gap-2">
                <Icon className="size-4 text-fg-quaternary" />
                <h2 className="text-sm font-semibold text-primary">{title}</h2>
            </div>
            {description && <p className="mt-1 text-xs text-tertiary">{description}</p>}
        </div>
        <div className="p-5">{children}</div>
    </Card>
);

const SeoPageEditor = ({ mode = "add" }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentPagePermissions } = useContext(MenuContext);

    const readOnly =
        mode === "view" || (mode === "add" ? !currentPagePermissions?.write : !currentPagePermissions?.edit);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [settings, setSettings] = useState({});
    const [device, setDevice] = useState("desktop");
    const [network, setNetwork] = useState("facebook");
    const fileInput = useRef(null);

    // ---- loading ----------------------------------------------------------

    useEffect(() => {
        const load = async () => {
            try {
                const [settingsRes, pageRes] = await Promise.all([
                    getSeoSettings(),
                    mode === "add" ? Promise.resolve(null) : getSeoPageById(id),
                ]);
                setSettings(settingsRes.data.data ?? {});
                if (pageRes) {
                    const page = pageRes.data.data;
                    setForm({
                        ...EMPTY_FORM,
                        ...page,
                        robots: { ...EMPTY_FORM.robots, ...(page.robots ?? {}) },
                        og: { ...EMPTY_FORM.og, ...(page.og ?? {}) },
                        twitter: { ...EMPTY_FORM.twitter, ...(page.twitter ?? {}) },
                        jsonLd: { ...EMPTY_FORM.jsonLd, ...(page.jsonLd ?? {}) },
                        sitemap: { ...EMPTY_FORM.sitemap, ...(page.sitemap ?? {}) },
                    });
                }
            } catch (error) {
                console.error("Error loading SEO page:", error);
                toast.error("Failed to load this SEO page");
                navigate("/seo-pages");
            } finally {
                setLoading(false);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, mode]);

    // ---- derived ----------------------------------------------------------

    const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
    const setGroup = (group, name, value) =>
        setForm((prev) => ({ ...prev, [group]: { ...prev[group], [name]: value } }));

    // The whole right-hand column, recomputed locally on every keystroke.
    const resolved = useMemo(() => resolveSeo(form, settings, form.path || "/"), [form, settings]);
    const health = useMemo(() => scoreSeo(form, resolved), [form, resolved]);

    const normalisedPath = normalizePath(form.path || "/");
    const pathWillChange = Boolean(form.path) && normalisedPath !== form.path;

    // ---- actions ----------------------------------------------------------

    const applySchemaPreset = (schemaType) => {
        const preset = SCHEMA_PRESETS[schemaType];
        setForm((prev) => ({
            ...prev,
            jsonLd: {
                schemaType,
                // Never overwrite something already written — swapping the
                // dropdown by accident should not destroy a hand-edited block.
                body: preset && !prev.jsonLd.body.trim() ? JSON.stringify(preset, null, 2) : prev.jsonLd.body,
            },
        }));
    };

    const handleUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const response = await uploadSeoImage(file);
            setGroup("og", "image", response.data.data.url);
            toast.success("Image uploaded");
        } catch (error) {
            toast.error(error.response?.data?.message || "Upload failed");
        } finally {
            setUploading(false);
            if (fileInput.current) fileInput.current.value = "";
        }
    };

    const save = async () => {
        if (!form.path.trim()) return toast.error("A path is required — for example /about");
        if (!form.pageName.trim()) return toast.error("Give this page a name so you can find it later");
        if (validateJson(form.jsonLd.body)) return toast.error("Fix the structured data before saving");

        const payload = {
            path: normalisedPath,
            pageName: form.pageName,
            focusKeyword: form.focusKeyword,
            title: form.title,
            description: form.description,
            canonicalUrl: form.canonicalUrl,
            robots: form.robots,
            og: form.og,
            twitter: form.twitter,
            jsonLd: form.jsonLd,
            sitemap: { ...form.sitemap, priority: Number(form.sitemap.priority) },
            isActive: form.isActive,
        };

        setSaving(true);
        try {
            if (mode === "edit") {
                await updateSeoPage(id, payload);
                toast.success("SEO page updated");
            } else {
                await createSeoPage(payload);
                toast.success("SEO page created");
            }
            navigate("/seo-pages");
        } catch (error) {
            const details = error.response?.data?.details;
            toast.error(
                Array.isArray(details)
                    ? details.map((detail) => detail.message).join(" · ")
                    : error.response?.data?.message || "Save failed",
            );
        } finally {
            setSaving(false);
        }
    };

    document.title = `${mode === "add" ? "New SEO page" : form.pageName || "SEO page"} | Demo Panel`;

    if (loading) {
        return (
            <div className="flex min-h-64 items-center justify-center">
                <LoadingIndicator />
            </div>
        );
    }

    const title = mode === "add" ? "New SEO page" : readOnly ? form.pageName : `Edit ${form.pageName}`;

    return (
        <>
            <PageHeader
                title={title}
                pageTitle="SEO Pages"
                pageHref="/seo-pages"
                description="How this URL appears in search results and when someone shares it."
                actions={
                    <>
                        <Button color="secondary" iconLeading={ArrowLeft} onClick={() => navigate("/seo-pages")}>
                            Back
                        </Button>
                        {readOnly && mode === "view" && currentPagePermissions?.edit && (
                            <Button onClick={() => navigate(`/seo-pages/${id}/edit`)}>Edit</Button>
                        )}
                        {!readOnly && (
                            <Button iconLeading={Save01} onClick={save} isLoading={saving} isDisabled={saving}>
                                {mode === "edit" ? "Save changes" : "Create page"}
                            </Button>
                        )}
                    </>
                }
            />

            {!settings.baseUrl && (
                <Card className="flex items-stretch overflow-hidden">
                    <span className="w-1 shrink-0 bg-warning-solid" aria-hidden="true" />
                    <p className="px-5 py-3 text-sm text-secondary">
                        No site address is set yet, so previews show a placeholder domain and pages cannot point at
                        their own canonical URL.{" "}
                        <button
                            type="button"
                            className="font-semibold text-brand-secondary underline"
                            onClick={() => navigate("/seo-settings")}
                        >
                            Add it in SEO Settings
                        </button>
                        .
                    </p>
                </Card>
            )}

            <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-5">
                {/* ---- the fields ---- */}
                <div className="flex flex-col gap-5 xl:col-span-3">
                    <Section
                        icon={SearchLg}
                        title="Search appearance"
                        description="What Google shows. Everything left blank falls back to your site-wide defaults."
                    >
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field
                                label="Page URL"
                                name="path"
                                icon={Link01}
                                isDisabled={readOnly}
                                placeholder="/about"
                                hint={
                                    pathWillChange
                                        ? `Will be saved as ${normalisedPath}`
                                        : "The path on your website, starting with a slash."
                                }
                                value={form.path}
                                onChange={(event) => set("path", event.target.value)}
                            />
                            <Field
                                label="Page name"
                                name="pageName"
                                isDisabled={readOnly}
                                placeholder="About us"
                                hint="How you'll find this row. Also the fallback title."
                                value={form.pageName}
                                onChange={(event) => set("pageName", event.target.value)}
                            />
                        </div>

                        <div className="mt-4">
                            <Field
                                label="Search engine title"
                                name="title"
                                isDisabled={readOnly}
                                placeholder={form.pageName || "About us"}
                                hint="Plain text gets your site name added automatically. Use {{title}} to take full control."
                                value={form.title}
                                onChange={(event) => set("title", event.target.value)}
                            />
                            <TitleMeter value={resolved.title} />
                        </div>

                        <div className="mt-4">
                            <TextAreaField
                                label="Search engine description"
                                name="description"
                                rows={3}
                                isDisabled={readOnly}
                                placeholder="One or two sentences that make someone want to click."
                                value={form.description}
                                onChange={(event) => set("description", event.target.value)}
                            />
                            <DescriptionMeter value={resolved.description} />
                        </div>

                        <div className="mt-4">
                            <Field
                                label="Focus keyword"
                                name="focusKeyword"
                                icon={Tag01}
                                isDisabled={readOnly}
                                placeholder="what people would search for"
                                hint="Optional. Adds keyword checks to the health panel."
                                value={form.focusKeyword}
                                onChange={(event) => set("focusKeyword", event.target.value)}
                            />
                        </div>
                    </Section>

                    <Section
                        icon={Share07}
                        title="Social sharing"
                        description="What appears when this link is posted to WhatsApp, LinkedIn, Facebook or X."
                    >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="flex-1">
                                <Field
                                    label="Share image"
                                    name="ogImage"
                                    icon={Image01}
                                    isDisabled={readOnly}
                                    placeholder={settings.defaultOgImage || "https://... or upload"}
                                    hint="1200 × 630 works everywhere. Blank uses your site-wide default."
                                    value={form.og.image}
                                    onChange={(event) => setGroup("og", "image", event.target.value)}
                                />
                            </div>
                            {!readOnly && (
                                <>
                                    <input
                                        ref={fileInput}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="hidden"
                                        onChange={handleUpload}
                                    />
                                    <Button
                                        color="secondary"
                                        iconLeading={UploadCloud01}
                                        isLoading={uploading}
                                        isDisabled={uploading}
                                        onClick={() => fileInput.current?.click()}
                                    >
                                        Upload
                                    </Button>
                                </>
                            )}
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field
                                label="Image description"
                                name="ogImageAlt"
                                isDisabled={readOnly}
                                placeholder="What the image shows"
                                hint="Read aloud by screen readers."
                                value={form.og.imageAlt}
                                onChange={(event) => setGroup("og", "imageAlt", event.target.value)}
                            />
                            <SelectField
                                label="Content type"
                                isDisabled={readOnly}
                                options={asOptions(OG_TYPES, OG_TYPE_LABELS)}
                                value={form.og.type}
                                onChange={(option) => option && setGroup("og", "type", option.value)}
                            />
                            <Field
                                label="Share title"
                                name="ogTitle"
                                isDisabled={readOnly}
                                placeholder={resolved.title}
                                hint="Blank uses the search title above."
                                value={form.og.title}
                                onChange={(event) => setGroup("og", "title", event.target.value)}
                            />
                            <Field
                                label="Share description"
                                name="ogDescription"
                                isDisabled={readOnly}
                                placeholder={resolved.description}
                                hint="Blank uses the search description above."
                                value={form.og.description}
                                onChange={(event) => setGroup("og", "description", event.target.value)}
                            />
                            <SelectField
                                label="X card style"
                                isDisabled={readOnly}
                                options={asOptions(TWITTER_CARDS, TWITTER_CARD_LABELS)}
                                value={form.twitter.card}
                                onChange={(option) => option && setGroup("twitter", "card", option.value)}
                            />
                            <Field
                                label="X image"
                                name="twitterImage"
                                isDisabled={readOnly}
                                placeholder={resolved.ogImage || "Uses the share image"}
                                hint="Blank uses the share image."
                                value={form.twitter.image}
                                onChange={(event) => setGroup("twitter", "image", event.target.value)}
                            />
                        </div>
                    </Section>

                    <Section
                        icon={Link01}
                        title="Indexing and sitemap"
                        description="Whether search engines may list this page, and how it appears in your sitemap."
                    >
                        <Field
                            label="Canonical URL"
                            name="canonicalUrl"
                            isDisabled={readOnly}
                            placeholder={resolved.url}
                            hint="Leave blank unless this page duplicates another one."
                            value={form.canonicalUrl}
                            onChange={(event) => set("canonicalUrl", event.target.value)}
                        />

                        <div className="mt-5">
                            <p className="text-sm font-medium text-secondary">What search engines may do</p>
                            <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                <CheckField
                                    name="index"
                                    isDisabled={readOnly}
                                    label="Show this page in search results"
                                    checked={form.robots.index}
                                    onChange={(event) => setGroup("robots", "index", event.target.checked)}
                                />
                                <CheckField
                                    name="follow"
                                    isDisabled={readOnly}
                                    label="Follow the links on this page"
                                    checked={form.robots.follow}
                                    onChange={(event) => setGroup("robots", "follow", event.target.checked)}
                                />
                                <CheckField
                                    name="noarchive"
                                    isDisabled={readOnly}
                                    label="Hide the cached copy"
                                    checked={form.robots.noarchive}
                                    onChange={(event) => setGroup("robots", "noarchive", event.target.checked)}
                                />
                                <CheckField
                                    name="noimageindex"
                                    isDisabled={readOnly}
                                    label="Keep images out of image search"
                                    checked={form.robots.noimageindex}
                                    onChange={(event) => setGroup("robots", "noimageindex", event.target.checked)}
                                />
                            </div>
                            <div className="mt-3 max-w-sm">
                                <SelectField
                                    label="Image size in results"
                                    isDisabled={readOnly}
                                    options={asOptions(MAX_IMAGE_PREVIEW, IMAGE_PREVIEW_LABELS)}
                                    value={form.robots.maxImagePreview}
                                    onChange={(option) => option && setGroup("robots", "maxImagePreview", option.value)}
                                />
                            </div>
                            {/* Show the directive these toggles produce — otherwise
                                nobody can tell what they actually did. */}
                            <p className="mt-3 rounded-md bg-secondary px-3 py-2 font-mono text-xs text-tertiary">
                                robots: {robotsContent(form.robots)}
                            </p>
                        </div>

                        <div className="mt-5 border-t border-secondary pt-5">
                            <CheckField
                                name="sitemapInclude"
                                isDisabled={readOnly}
                                label="List this page in sitemap.xml"
                                checked={form.sitemap.include}
                                onChange={(event) => setGroup("sitemap", "include", event.target.checked)}
                            />
                            {form.sitemap.include && (
                                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <Field
                                        label="Priority"
                                        name="priority"
                                        type="number"
                                        min={0}
                                        max={1}
                                        step="0.1"
                                        isDisabled={readOnly}
                                        hint="0 to 1, relative to your other pages."
                                        value={form.sitemap.priority}
                                        onChange={(event) => setGroup("sitemap", "priority", event.target.value)}
                                    />
                                    <SelectField
                                        label="How often it changes"
                                        isDisabled={readOnly}
                                        options={asOptions(CHANGE_FREQUENCIES, CHANGEFREQ_LABELS)}
                                        value={form.sitemap.changefreq}
                                        onChange={(option) => option && setGroup("sitemap", "changefreq", option.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="mt-5 border-t border-secondary pt-5">
                            <CheckField
                                name="isActive"
                                isDisabled={readOnly}
                                label="Active"
                                checked={form.isActive}
                                onChange={(event) => set("isActive", event.target.checked)}
                            />
                            <p className="mt-1 text-xs text-tertiary">
                                Inactive pages stop being served to the website and drop out of the sitemap.
                            </p>
                        </div>
                    </Section>

                    <Section
                        icon={Tag01}
                        title="Structured data"
                        description="Extra machine-readable detail that can earn rich results — star ratings, FAQ dropdowns, breadcrumbs."
                    >
                        <div className="max-w-sm">
                            <SelectField
                                label="Start from a template"
                                isDisabled={readOnly}
                                options={SCHEMA_TYPES.map((type) => ({
                                    value: type,
                                    label: type === "None" ? "None" : type,
                                }))}
                                value={form.jsonLd.schemaType}
                                onChange={(option) => option && applySchemaPreset(option.value)}
                            />
                        </div>
                        <div className="mt-4">
                            <JsonEditor
                                label="JSON-LD"
                                isDisabled={readOnly}
                                value={form.jsonLd.body}
                                onChange={(value) => setGroup("jsonLd", "body", value)}
                                hint="Optional. Pick a template above to start, then fill in the blanks. {{title}}, {{description}}, {{url}} and {{ogImage}} are filled in automatically."
                            />
                        </div>
                    </Section>
                </div>

                {/* ---- live preview, sticky ---- */}
                <div className="flex flex-col gap-5 xl:sticky xl:top-5 xl:col-span-2">
                    <Card className="mt-0">
                        <div className="flex items-center justify-between gap-3 border-b border-secondary px-5 py-3">
                            <h2 className="text-sm font-semibold text-primary">Google result</h2>
                            <PreviewToggle options={SERP_DEVICES} value={device} onChange={setDevice} />
                        </div>
                        <div className="p-4">
                            <SerpPreview resolved={resolved} device={device} />
                        </div>
                    </Card>

                    <Card className="mt-0">
                        <div className="flex items-center justify-between gap-3 border-b border-secondary px-5 py-3">
                            <h2 className="text-sm font-semibold text-primary">Shared link</h2>
                            <PreviewToggle options={SOCIAL_NETWORKS} value={network} onChange={setNetwork} />
                        </div>
                        <div className="p-4">
                            <SocialPreview resolved={resolved} network={network} />
                        </div>
                    </Card>

                    <Card className="mt-0 px-5 py-4">
                        <h2 className="text-sm font-semibold text-primary">SEO health</h2>
                        <div className="mt-3">
                            <SeoHealth health={health} />
                        </div>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default SeoPageEditor;
