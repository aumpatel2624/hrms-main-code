/**
 * The email trigger registry (ADR-015) — the trust boundary for "which email
 * fires for which event". Mirrors config/widgetSources.js (ADR-003): a
 * trigger key is picked from here in the admin UI, never typed, and an
 * EmailTemplate's merge fields are validated against the list declared here.
 * A trigger nobody has registered here cannot be assigned to an EmailFor, and
 * cannot fire.
 *
 * Per trigger:
 * - label        shown in the trigger picker on the EmailFor form
 * - description  shown alongside it — what fires this trigger
 * - mergeFields  `{ TOKEN: description }` — the {{TOKENS}} a template for
 *                this trigger may use in its subject or body. Declared here
 *                because the call site (sendTriggeredEmail) already has to
 *                change in code to add a trigger; a merge field the call
 *                site never sends can never be filled, so the two stay in
 *                sync by construction rather than by someone remembering.
 */
export const EMAIL_TRIGGERS = Object.freeze({
  "password.forgot": {
    label: "Forgot password",
    description: "A user requests a one-time code to reset their password.",
    mergeFields: {
      USERNAME: "The user's display name",
      OTP_CODE: "The one-time code to enter",
    },
  },
  "password.reset": {
    label: "Password reset",
    description: "A user successfully resets their password.",
    mergeFields: {
      USERNAME: "The user's display name",
    },
  },
});
