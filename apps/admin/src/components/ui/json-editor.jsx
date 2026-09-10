import { useMemo } from "react";
import { AlertTriangle, CheckCircle, Code01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

/**
 * A textarea that knows it holds JSON: it validates on every keystroke, says
 * where the syntax broke, and can reformat.
 *
 * ponytail: a plain textarea, not a code editor. CodeMirror or Monaco would
 * add roughly a megabyte of dependency for one field, and the thing that
 * actually matters — telling you the JSON is broken before you save it — is a
 * try/catch. Swap in a real editor if this grows past structured data.
 *
 * {{tokens}} are blanked before parsing, because `{{title}}` is not valid JSON
 * on its own but is perfectly valid in a stored template. The server applies
 * exactly the same rule.
 */

export const validateJson = (value) => {
    const text = String(value ?? "").trim();
    if (!text) return null;
    try {
        JSON.parse(text.replace(/\{\{\s*[\w.]+\s*\}\}/g, "x"));
        return null;
    } catch (error) {
        return error.message.replace(/^JSON\.parse:\s*/i, "");
    }
};

const JsonEditor = ({ value, onChange, rows = 12, isDisabled = false, label, hint }) => {
    const error = useMemo(() => validateJson(value), [value]);
    const isEmpty = !String(value ?? "").trim();

    const format = () => {
        try {
            // Tokens are placeheld through the round trip so formatting a
            // template does not destroy it.
            const tokens = [];
            const masked = String(value).replace(/\{\{\s*[\w.]+\s*\}\}/g, (match) => {
                tokens.push(match);
                return `__TOKEN_${tokens.length - 1}__`;
            });
            const pretty = JSON.stringify(JSON.parse(masked), null, 2);
            onChange(pretty.replace(/__TOKEN_(\d+)__/g, (_match, index) => tokens[Number(index)]));
        } catch {
            // The status line below already says it is invalid.
        }
    };

    return (
        <div>
            {label && (
                <div className="mb-1.5 flex items-center justify-between gap-3">
                    <label htmlFor="json-editor" className="text-sm font-medium text-secondary">
                        {label}
                    </label>
                    {!isDisabled && !isEmpty && !error && (
                        <Button size="sm" color="link-gray" iconLeading={Code01} onClick={format}>
                            Format
                        </Button>
                    )}
                </div>
            )}

            <textarea
                id="json-editor"
                value={value ?? ""}
                onChange={(event) => onChange(event.target.value)}
                rows={rows}
                spellCheck={false}
                disabled={isDisabled}
                placeholder='{ "@context": "https://schema.org", "@type": "WebPage" }'
                className={cx(
                    "w-full rounded-lg bg-primary px-3 py-2.5 font-mono text-xs leading-relaxed text-primary shadow-xs ring-1 outline-hidden transition",
                    "placeholder:text-placeholder focus:ring-2 focus:ring-brand disabled:cursor-not-allowed disabled:opacity-50",
                    error ? "ring-error_subtle" : "ring-secondary",
                )}
            />

            {error ? (
                <p className="mt-1.5 flex items-start gap-1.5 text-xs text-error-primary">
                    <AlertTriangle className="mt-px size-3.5 shrink-0" />
                    <span>Not valid JSON — Google will ignore this until it is fixed. {error}</span>
                </p>
            ) : isEmpty ? (
                hint && <p className="mt-1.5 text-xs text-tertiary">{hint}</p>
            ) : (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-success-primary">
                    <CheckCircle className="size-3.5 shrink-0" />
                    Valid structured data
                </p>
            )}
        </div>
    );
};

export default JsonEditor;
