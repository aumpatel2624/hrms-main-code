import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
    Copy01,
    Eye,
    Globe01,
    Image01,
    Link01,
    Plus,
    RefreshCw01,
    Save01,
    Share07,
    Shield01,
    Trash01,
    UploadCloud01,
} from "@untitledui/icons";
import {
    MAX_IMAGE_PREVIEW,
    TITLE_SEPARATORS,
    TWITTER_CARDS,
    renderTemplate,
    robotsContent,
} from "@demo-panel/shared/seo";
import { MenuContext } from "../../context/MenuContext";
import {
    getSeoSettings,
    getSiteKey,
    rotateSiteKey,
    updateSeoSettings,
    uploadSeoImage,
} from "../../api/seo.api";
import { Card, PageHeader } from "@/components/ui/page";
import { CheckField, Field, SelectField, TextAreaField } from "@/components/ui/field";
import { ConfirmModal } from "@/components/ui/modal";
import { Button } from "@/components/base/buttons/button";
import { LoadingIndicator } from "@/components/application/loading-indicator/loading-indicator";
import { cx } from "@/utils/cx";

/**
 * Site-wide SEO defaults.
 *
 * Every field here is a fallback used wherever a page left the matching field
 * blank, which is what stops someone typing the site name into a hundred page
 * titles by hand. Grouped into tabs because the five concerns — naming,
 * sharing, indexing, ownership proof and the website connection — are edited at
 * completely different times.
 */

const TABS = [
    { id: "general", label: "General", icon: Globe01 },
    { id: "social", label: "Social", icon: Share07 },
    { id: "indexing", label: "Indexing", icon: Link01 },
    { id: "verification", label: "Verification", icon: Shield01 },
    { id: "connection", label: "Website connection", icon: RefreshCw01 },
];

const EMPTY = {
    siteName: "",
    baseUrl: "",
    titleSeparator: "|",
    defaultTitleTemplate: "{{title}} {{sep}} {{siteName}}",
    defaultDescription: "",
    defaultOgImage: "",
    defaultTwitterCard: "summary_large_image",
    organization: { type: "Organization", name: "", logo: "", sameAs: [] },
    verification: { google: "", bing: "", yandex: "", pinterest: "", facebookDomain: "" },
    robots: {
        index: true, follow: true, noarchive: false, nosnippet: false,
        noimageindex: false, maxSnippet: -1, maxImagePreview: "large",
    },
    globalNoindex: false,
    robotsTxt: "User-agent: *\nAllow: /\n",
    isActive: true,
};

const asOptions = (values, labels = {}) => values.map((value) => ({ value, label: labels[value] ?? value }));
const SEPARATOR_LABELS = {
    "|": "|  (pipe)", "-": "-  (hyphen)", "–": "–  (en dash)", "—": "—  (em dash)",
    "•": "•  (bullet)", "·": "·  (middle dot)", "»": "»  (arrow)", "~": "~  (tilde)",
};
const TWITTER_CARD_LABELS = { summary: "Small square image", summary_large_image: "Large banner image" };
const IMAGE_PREVIEW_LABELS = { none: "No image in results", standard: "Small image", large: "Large image (recommended)" };
const ORG_TYPE_LABELS = { Organization: "A company or organisation", Person: "A person" };

const Group = ({ title, description, children }) => (
    <div className="border-b border-secondary p-5 last:border-b-0">
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
        {description && <p className="mt-1 text-xs text-tertiary">{description}</p>}
        <div className="mt-4">{children}</div>
    </div>
);

const SeoSettings = () => {
    const { currentPagePermissions } = useContext(MenuContext);
    const canEdit = Boolean(currentPagePermissions?.edit);
    const canRead = Boolean(currentPagePermissions?.read);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [tab, setTab] = useState("general");
    const [form, setForm] = useState(EMPTY);
    const [siteKey, setSiteKey] = useState(null);
    const [hasSiteKey, setHasSiteKey] = useState(false);
    const [rotating, setRotating] = useState(false);
    const [confirmRotate, setConfirmRotate] = useState(false);
    const fileInput = useRef(null);

    useEffect(() => {
        const load = async () => {
            try {
                const response = await getSeoSettings();
                const data = response.data.data ?? {};
                setHasSiteKey(Boolean(data.hasSiteKey));
                setForm({
                    ...EMPTY,
                    ...data,
                    organization: { ...EMPTY.organization, ...(data.organization ?? {}) },
                    verification: { ...EMPTY.verification, ...(data.verification ?? {}) },
                    robots: { ...EMPTY.robots, ...(data.robots ?? {}) },
                });
            } catch (error) {
                console.error("Error loading SEO settings:", error);
                toast.error("Failed to load SEO settings");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const set = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
    const setGroup = (group, name, value) =>
        setForm((prev) => ({ ...prev, [group]: { ...prev[group], [name]: value } }));

    /** What the template produces for a typical page — abstract until you see it. */
    const templateExample = useMemo(
        () =>
            renderTemplate(form.defaultTitleTemplate, {
                title: "About us",
                sep: form.titleSeparator,
                siteName: form.siteName || "Your site",
            }),
        [form.defaultTitleTemplate, form.titleSeparator, form.siteName],
    );

    const handleUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const response = await uploadSeoImage(file);
            set("defaultOgImage", response.data.data.url);
            toast.success("Image uploaded");
        } catch (error) {
            toast.error(error.response?.data?.message || "Upload failed");
        } finally {
            setUploading(false);
            if (fileInput.current) fileInput.current.value = "";
        }
    };

    const save = async () => {
        setSaving(true);
        try {
            await updateSeoSettings({
                siteName: form.siteName,
                baseUrl: form.baseUrl,
                titleSeparator: form.titleSeparator,
                defaultTitleTemplate: form.defaultTitleTemplate,
                defaultDescription: form.defaultDescription,
                defaultOgImage: form.defaultOgImage,
                defaultTwitterCard: form.defaultTwitterCard,
                organization: form.organization,
                verification: form.verification,
                robots: form.robots,
                globalNoindex: form.globalNoindex,
                robotsTxt: form.robotsTxt,
                isActive: form.isActive,
            });
            toast.success("SEO settings saved");
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

    const revealKey = async () => {
        try {
            const response = await getSiteKey();
            setSiteKey(response.data.data.siteKey || "");
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not read the site key");
        }
    };

    const doRotate = async () => {
        setConfirmRotate(false);
        setRotating(true);
        try {
            const response = await rotateSiteKey();
            setSiteKey(response.data.data.siteKey);
            setHasSiteKey(true);
            toast.success("New site key generated");
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not generate a key");
        } finally {
            setRotating(false);
        }
    };

    const copyKey = async () => {
        try {
            await navigator.clipboard.writeText(siteKey ?? "");
            toast.success("Copied");
        } catch {
            toast.error("Could not copy — select the text and copy it manually");
        }
    };

    document.title = "SEO Settings | Demo Panel";

    if (loading) {
        return (
            <div className="flex min-h-64 items-center justify-center">
                <LoadingIndicator />
            </div>
        );
    }

    return (
        <>
            <PageHeader
                title="SEO Settings"
                pageTitle="Setup"
                description="Defaults every page falls back to, and how your website connects to this panel."
                actions={
                    canEdit && (
                        <Button iconLeading={Save01} onClick={save} isLoading={saving} isDisabled={saving}>
                            Save settings
                        </Button>
                    )
                }
            />

            {form.globalNoindex && (
                <Card className="flex items-stretch overflow-hidden">
                    <span className="w-1 shrink-0 bg-error-solid" aria-hidden="true" />
                    <div className="px-5 py-3">
                        <p className="text-sm font-medium text-error-primary">
                            Your whole site is currently hidden from search engines.
                        </p>
                        <p className="mt-0.5 text-sm text-secondary">
                            Right for a staging site. If this is your live site, turn it off under Indexing.
                        </p>
                    </div>
                </Card>
            )}

            <Card className="overflow-hidden">
                <div className="flex gap-1 overflow-x-auto border-b border-secondary px-3">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setTab(id)}
                            aria-current={tab === id ? "page" : undefined}
                            className={cx(
                                "flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                                tab === id
                                    ? "border-brand text-brand-secondary"
                                    : "border-transparent text-tertiary hover:text-secondary",
                            )}
                        >
                            <Icon className="size-4" />
                            {label}
                        </button>
                    ))}
                </div>

                {tab === "general" && (
                    <>
                        <Group title="Your site" description="Used across every page's title and structured data.">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field
                                    label="Site name"
                                    name="siteName"
                                    isDisabled={!canEdit}
                                    placeholder="Acme Corp"
                                    value={form.siteName}
                                    onChange={(event) => set("siteName", event.target.value)}
                                />
                                <Field
                                    label="Site address"
                                    name="baseUrl"
                                    icon={Globe01}
                                    isDisabled={!canEdit}
                                    placeholder="https://acme.com"
                                    hint="No trailing slash. Every canonical URL and sitemap entry is built from this."
                                    value={form.baseUrl}
                                    onChange={(event) => set("baseUrl", event.target.value)}
                                />
                            </div>
                        </Group>

                        <Group
                            title="Title template"
                            description="The pattern every page title follows unless it says otherwise."
                        >
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Field
                                    label="Template"
                                    name="defaultTitleTemplate"
                                    isDisabled={!canEdit}
                                    hint="Available: {{title}}, {{sep}}, {{siteName}}"
                                    value={form.defaultTitleTemplate}
                                    onChange={(event) => set("defaultTitleTemplate", event.target.value)}
                                />
                                <SelectField
                                    label="Separator"
                                    isDisabled={!canEdit}
                                    options={asOptions(TITLE_SEPARATORS, SEPARATOR_LABELS)}
                                    value={form.titleSeparator}
                                    onChange={(option) => option && set("titleSeparator", option.value)}
                                />
                            </div>
                            <div className="mt-3 rounded-lg bg-secondary px-4 py-3">
                                <p className="text-xs text-tertiary">A page called "About us" would be titled</p>
                                <p className="mt-0.5 text-sm font-medium text-primary">{templateExample}</p>
                            </div>
                        </Group>

                        <Group
                            title="Fallback description"
                            description="Used on any page that has not written its own. Keep it generic."
                        >
                            <TextAreaField
                                name="defaultDescription"
                                rows={3}
                                isDisabled={!canEdit}
                                placeholder="What your organisation does, in a sentence."
                                value={form.defaultDescription}
                                onChange={(event) => set("defaultDescription", event.target.value)}
                            />
                        </Group>
                    </>
                )}

                {tab === "social" && (
                    <>
                        <Group
                            title="Default share image"
                            description="Shown when a page has no image of its own. 1200 × 630 works everywhere."
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                <div className="flex-1">
                                    <Field
                                        name="defaultOgImage"
                                        icon={Image01}
                                        isDisabled={!canEdit}
                                        placeholder="https://... or upload"
                                        value={form.defaultOgImage}
                                        onChange={(event) => set("defaultOgImage", event.target.value)}
                                    />
                                </div>
                                {canEdit && (
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
                            <div className="mt-4 max-w-sm">
                                <SelectField
                                    label="Default X card style"
                                    isDisabled={!canEdit}
                                    options={asOptions(TWITTER_CARDS, TWITTER_CARD_LABELS)}
                                    value={form.defaultTwitterCard}
                                    onChange={(option) => option && set("defaultTwitterCard", option.value)}
                                />
                            </div>
                        </Group>

                        <Group
                            title="Who owns this site"
                            description="Published on your home page as structured data. Google uses it for the panel that appears beside branded searches."
                        >
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <SelectField
                                    label="This site belongs to"
                                    isDisabled={!canEdit}
                                    options={asOptions(["Organization", "Person"], ORG_TYPE_LABELS)}
                                    value={form.organization.type}
                                    onChange={(option) => option && setGroup("organization", "type", option.value)}
                                />
                                <Field
                                    label="Name"
                                    name="orgName"
                                    isDisabled={!canEdit}
                                    placeholder={form.siteName || "Acme Corp"}
                                    value={form.organization.name}
                                    onChange={(event) => setGroup("organization", "name", event.target.value)}
                                />
                                <Field
                                    label="Logo URL"
                                    name="orgLogo"
                                    icon={Image01}
                                    isDisabled={!canEdit}
                                    placeholder="https://acme.com/logo.png"
                                    value={form.organization.logo}
                                    onChange={(event) => setGroup("organization", "logo", event.target.value)}
                                />
                            </div>

                            <div className="mt-5">
                                <p className="text-sm font-medium text-secondary">Social profiles</p>
                                <p className="mt-0.5 text-xs text-tertiary">
                                    Full URLs to your accounts. Helps search engines connect them to your brand.
                                </p>
                                <div className="mt-3 flex flex-col gap-2">
                                    {(form.organization.sameAs ?? []).map((profile, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <div className="flex-1">
                                                <Field
                                                    aria-label={`Social profile ${index + 1}`}
                                                    name={`sameAs-${index}`}
                                                    isDisabled={!canEdit}
                                                    placeholder="https://linkedin.com/company/acme"
                                                    value={profile}
                                                    onChange={(event) =>
                                                        setGroup(
                                                            "organization",
                                                            "sameAs",
                                                            form.organization.sameAs.map((entry, i) =>
                                                                i === index ? event.target.value : entry,
                                                            ),
                                                        )
                                                    }
                                                />
                                            </div>
                                            {canEdit && (
                                                <Button
                                                    size="sm"
                                                    color="tertiary"
                                                    iconLeading={Trash01}
                                                    aria-label="Remove profile"
                                                    onClick={() =>
                                                        setGroup(
                                                            "organization",
                                                            "sameAs",
                                                            form.organization.sameAs.filter((_entry, i) => i !== index),
                                                        )
                                                    }
                                                />
                                            )}
                                        </div>
                                    ))}
                                    {canEdit && (form.organization.sameAs?.length ?? 0) < 20 && (
                                        <div>
                                            <Button
                                                size="sm"
                                                color="secondary"
                                                iconLeading={Plus}
                                                onClick={() =>
                                                    setGroup("organization", "sameAs", [
                                                        ...(form.organization.sameAs ?? []),
                                                        "",
                                                    ])
                                                }
                                            >
                                                Add profile
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Group>
                    </>
                )}

                {tab === "indexing" && (
                    <>
                        <Group
                            title="Hide the whole site"
                            description="Overrides every page, whatever it says individually."
                        >
                            <CheckField
                                name="globalNoindex"
                                isDisabled={!canEdit}
                                label="Ask search engines to ignore this entire site"
                                checked={form.globalNoindex}
                                onChange={(event) => set("globalNoindex", event.target.checked)}
                            />
                            <p className="mt-2 text-xs text-tertiary">
                                Turn this on for a staging or preview deployment. On a live site it removes you from
                                search results entirely, and recovery takes weeks.
                            </p>
                        </Group>

                        <Group
                            title="Default rules"
                            description="What a page allows when it has not decided for itself."
                        >
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                <CheckField
                                    name="defaultIndex"
                                    isDisabled={!canEdit}
                                    label="Show pages in search results"
                                    checked={form.robots.index}
                                    onChange={(event) => setGroup("robots", "index", event.target.checked)}
                                />
                                <CheckField
                                    name="defaultFollow"
                                    isDisabled={!canEdit}
                                    label="Follow links on pages"
                                    checked={form.robots.follow}
                                    onChange={(event) => setGroup("robots", "follow", event.target.checked)}
                                />
                            </div>
                            <div className="mt-3 max-w-sm">
                                <SelectField
                                    label="Image size in results"
                                    isDisabled={!canEdit}
                                    options={asOptions(MAX_IMAGE_PREVIEW, IMAGE_PREVIEW_LABELS)}
                                    value={form.robots.maxImagePreview}
                                    onChange={(option) => option && setGroup("robots", "maxImagePreview", option.value)}
                                />
                            </div>
                            <p className="mt-3 rounded-md bg-secondary px-3 py-2 font-mono text-xs text-tertiary">
                                robots: {robotsContent(form.robots)}
                            </p>
                        </Group>

                        <Group
                            title="robots.txt"
                            description="Served to crawlers at /robots.txt. The Sitemap line is added automatically — you do not need to write it."
                        >
                            <TextAreaField
                                name="robotsTxt"
                                rows={8}
                                isDisabled={!canEdit}
                                value={form.robotsTxt}
                                onChange={(event) => set("robotsTxt", event.target.value)}
                                textAreaClassName="font-mono text-xs"
                            />
                        </Group>
                    </>
                )}

                {tab === "verification" && (
                    <Group
                        title="Prove you own this site"
                        description="Each service gives you a code when you add your site. Paste it here and it is published on your home page."
                    >
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <Field
                                label="Google Search Console"
                                name="google"
                                isDisabled={!canEdit}
                                placeholder="The content value from the meta tag Google gives you"
                                value={form.verification.google}
                                onChange={(event) => setGroup("verification", "google", event.target.value)}
                            />
                            <Field
                                label="Bing Webmaster Tools"
                                name="bing"
                                isDisabled={!canEdit}
                                value={form.verification.bing}
                                onChange={(event) => setGroup("verification", "bing", event.target.value)}
                            />
                            <Field
                                label="Yandex"
                                name="yandex"
                                isDisabled={!canEdit}
                                value={form.verification.yandex}
                                onChange={(event) => setGroup("verification", "yandex", event.target.value)}
                            />
                            <Field
                                label="Pinterest"
                                name="pinterest"
                                isDisabled={!canEdit}
                                value={form.verification.pinterest}
                                onChange={(event) => setGroup("verification", "pinterest", event.target.value)}
                            />
                            <Field
                                label="Facebook domain"
                                name="facebookDomain"
                                isDisabled={!canEdit}
                                value={form.verification.facebookDomain}
                                onChange={(event) => setGroup("verification", "facebookDomain", event.target.value)}
                            />
                        </div>
                    </Group>
                )}

                {tab === "connection" && (
                    <>
                        <Group
                            title="Site key"
                            description="Your website sends this key when it reports its URL list and its 404s. Reading SEO data needs no key."
                        >
                            {!hasSiteKey && !siteKey ? (
                                <div className="rounded-lg bg-secondary px-4 py-3">
                                    <p className="text-sm text-secondary">
                                        No key has been generated yet, so the two reporting endpoints are closed.
                                    </p>
                                    {canEdit && (
                                        <Button
                                            className="mt-3"
                                            size="sm"
                                            iconLeading={RefreshCw01}
                                            isLoading={rotating}
                                            onClick={doRotate}
                                        >
                                            Generate a site key
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                    <code className="min-w-0 flex-1 truncate rounded-lg bg-secondary px-3 py-2.5 font-mono text-sm text-primary">
                                        {siteKey ?? "•".repeat(38)}
                                    </code>
                                    {siteKey === null && canRead && (
                                        <Button size="sm" color="secondary" iconLeading={Eye} onClick={revealKey}>
                                            Reveal
                                        </Button>
                                    )}
                                    {siteKey !== null && (
                                        <Button size="sm" color="secondary" iconLeading={Copy01} onClick={copyKey}>
                                            Copy
                                        </Button>
                                    )}
                                    {canEdit && (
                                        <Button
                                            size="sm"
                                            color="secondary-destructive"
                                            iconLeading={RefreshCw01}
                                            isLoading={rotating}
                                            onClick={() => setConfirmRotate(true)}
                                        >
                                            Regenerate
                                        </Button>
                                    )}
                                </div>
                            )}
                        </Group>

                        <Group
                            title="How your website uses this"
                            description="Hand these three calls to whoever builds the public site."
                        >
                            <pre className="overflow-x-auto rounded-lg bg-secondary px-4 py-3 font-mono text-xs leading-relaxed text-secondary">
{`// 1. Every page render — tags plus any redirect that applies
POST ${form.baseUrl || "https://your-panel"}/api/v1/public/seo/resolve
     { "path": "/about" }
  -> { redirect: { to, status } | null,
       tags: { title, meta[], link[], script[] } }

// 2. On publish — the URLs your site has, for the sitemap
POST /api/v1/public/seo/urls          header: x-api-key: <site key>
     { "urls": [{ "path": "/blog/hello", "lastmod": "2026-08-21" }],
       "replace": true }

// 3. On a 404 — so broken links show up in the log
POST /api/v1/public/seo/404           header: x-api-key: <site key>
     { "path": "/old-page", "referrer": document.referrer }

// Served for you:  /api/v1/public/seo/sitemap.xml
//                  /api/v1/public/seo/robots.txt`}
                            </pre>
                            <p className="mt-3 text-xs text-tertiary">
                                Meta tags have to be in the HTML your server sends. Facebook, LinkedIn, X and WhatsApp
                                do not run JavaScript, so a share image added only in the browser never appears.
                            </p>
                        </Group>
                    </>
                )}
            </Card>

            <ConfirmModal
                isOpen={confirmRotate}
                onClose={() => setConfirmRotate(false)}
                onConfirm={doRotate}
                title="Generate a new site key?"
                description="The current key stops working immediately. Your website will not be able to report URLs or 404s until the new key is deployed to it."
                confirmLabel="Regenerate"
            />
        </>
    );
};

export default SeoSettings;
