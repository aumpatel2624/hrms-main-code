import { useEffect, useState } from "react";
import { getAllEmailFor, getEmailTriggers } from "@/api/emails.api";
import { FormSection, FullWidth } from "@/components/ui/form";

/**
 * Read-only hint on the Email Template form: which {{TOKENS}} the selected
 * Email For's trigger declares (ADR-015). Sourced from the same registry the
 * server validates a save against, so what this shows and what the server
 * accepts can never drift apart.
 *
 * Built from `GET /email-for` (the same un-gated list the Email For dropdown
 * on this form already uses) plus the trigger registry, rather than
 * `GET /email-for/:id` — that single-record route is read-permission gated,
 * and a role with access to this screen but not to Email For would otherwise
 * see the hint silently break.
 */
const EmailTemplateMergeFields = ({ values }) => {
    const [registry, setRegistry] = useState(null); // { [emailForId]: trigger } once loaded

    useEffect(() => {
        let cancelled = false;
        Promise.all([getAllEmailFor(), getEmailTriggers()])
            .then(([emailForRes, triggersRes]) => {
                if (cancelled) return;
                const byKey = Object.fromEntries(
                    (triggersRes.data?.data?.triggers ?? []).map((t) => [t.key, t]),
                );
                const byEmailForId = Object.fromEntries(
                    (emailForRes.data?.data ?? [])
                        .filter((ef) => byKey[ef.triggerKey])
                        .map((ef) => [ef._id, byKey[ef.triggerKey]]),
                );
                setRegistry(byEmailForId);
            })
            .catch((err) => {
                console.log(err);
                if (!cancelled) setRegistry({});
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (!registry) return null;

    const trigger = values.emailFor ? registry[values.emailFor] : null;
    const tokens = Object.entries(trigger?.mergeFields ?? {});

    return (
        <FormSection
            title="Merge fields"
            description={
                !values.emailFor
                    ? "Select an Email For above to see which merge fields it allows."
                    : tokens.length
                      ? `Tokens the subject and signature can use for "${trigger.label}". Anything else is rejected on save.`
                      : `"${trigger?.label ?? "This event"}" has no merge fields declared — the subject and signature cannot use any {{TOKENS}}.`
            }
        >
            {tokens.length > 0 && (
                <FullWidth>
                    <ul className="flex flex-col gap-1 text-sm text-secondary">
                        {tokens.map(([token, description]) => (
                            <li key={token}>
                                <code className="rounded bg-secondary px-1 py-0.5 text-xs text-tertiary">{`{{${token}}}`}</code>
                                {" — "}
                                {description}
                            </li>
                        ))}
                    </ul>
                </FullWidth>
            )}
        </FormSection>
    );
};

export default EmailTemplateMergeFields;
