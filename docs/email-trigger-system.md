# Dynamic email triggers: which template fires for which form

> **Concept write-up — nothing here is built.** This documents a conversation about making
> "which email template fires for which form submission" data-driven instead of hardcoded. No
> `system-design` session has happened, no ADR exists, no schema has changed. Written 2026-09-05.
> See [Status](#status) at the bottom before assuming any of this exists.

## The problem in one sentence

Right now, "which email goes out when this form is submitted" is a question only the code can
answer, one form at a time. This document proposes making it a question the *data* answers, so a
new form doesn't need new mailer code — only a new row.

## What already exists in this repo

More than a blank slate. Three collections already model half of this:

| Model | File | What it holds |
|---|---|---|
| `EmailSetup` | `apps/server/models/EmailSetup.js` | One SMTP sending account — host, port, SSL, the login email, an `appPassword` that is `select: false` so it never rides along in an API response. |
| `EmailFor` | `apps/server/models/EmailFor.js` | A label for *why* an email is sent — just a string (`emailFor`) and `isActive`. Meant to answer "what purpose is this?". |
| `EmailTemplate` | `apps/server/models/EmailTemplate.js` | The actual content: `templateName`, `emailSubject`, `emailSignature` (this is the **HTML body**, not a signature block — see [Naming gotcha](#naming-gotcha-emailsignature-is-the-body) below), CC/BCC, a `mailerName` display name, a ref to one `EmailSetup` (`emailFrom`) and a ref to one `EmailFor` (`emailFor`). |

So the *content* of an email is already editable data — an admin can change the wording of an email
without touching code. What's missing is the *routing*: deciding which `EmailFor` applies to a given
event.

### The one real example: forgot-password OTP

`apps/server/controllers/v1/otp.controller.js` (`createOtp`, lines 59–91) is the only place this is
wired end to end today, and it does the whole thing inline:

1. Hardcodes the literal string `"Forget Password"` and does `EmailFor.findOne({ emailFor: "Forget Password" })`.
2. Looks up `EmailTemplate.findOne({ emailFor: <that id>, isActive: true })` — **no sort**, just the
   first match.
3. Fills placeholders by hand: `emailBody.replace("{{USERNAME}}", username)` and
   `.replace("{{OTP_CODE}}", otp)` — two token names, hardcoded here and nowhere else.
4. Builds a `nodemailer` transporter inline (branches on `host.includes("gmail")` vs generic SMTP)
   and sends.

This works for exactly one trigger. Adding a second form today means copy-pasting all four steps
into a new controller with a different hardcoded string and different `.replace()` calls — the
"second version of something already solved" pattern `AGENTS.md` calls out directly.

### A concrete gap this creates right now

`apps/server/controllers/v1/emailTemplate.controller.js` never checks whether another active
template already points at the same `EmailFor` (contrast with `emailFor.controller.js`, which does
reject a duplicate *name*). So two active `EmailTemplate` rows can legally share one `EmailFor`, and
`otp.controller.js`'s unsorted `findOne` will pick whichever one Mongo happens to return first —
undefined in practice. In other words, **"which template fires" is already ambiguous** the moment a
second template is added for the same purpose, even for the one trigger that exists today.

### Naming gotcha: `emailSignature` is the body

`EmailTemplate.emailSignature` is used in `otp.controller.js` as the entire HTML body
(`emailBody = emailTemplate.emailSignature`, then `html: emailTemplate.emailSignature` on send) —
not a signature appended to a body. Worth knowing before building an editor UI around it that implies
otherwise.

## The proposed model

Three additions, layered on top of what exists rather than replacing it:

**1. A stable trigger key per form**, instead of a hardcoded purpose string per controller. Every
form (or other event — see [Open questions](#open-questions-to-settle-before-building)) gets one
identifier, e.g. `contact-us.submitted`, `job-application.submitted`, `password.forgot`. The form's
submit code needs to know only its own key — nothing about templates, SMTP, or placeholders.

**2. One shared "fire a trigger" function**, called identically from every form, e.g.
(illustrative — not real code, no such function exists yet):

```js
await sendTriggeredEmail("contact-us.submitted", {
  toEmail: visitor.email,
  mergeFields: { NAME: visitor.name, MESSAGE: visitor.message },
});
```

Internally it does what `createOtp` does today — look up the active template(s) for the key, fill
placeholders, send — but written **once**. A new form means one call like the one above, not a new
copy of steps 1–4 above.

**3. Declared merge fields per trigger**, so "which `{{TOKENS}}` can this template use" is data an
admin screen can show while editing a template, instead of two `.replace()` calls someone has to
remember to keep in sync with whatever fields the form actually collects.

## Worked example

| Trigger key | Fired by | Template |
|---|---|---|
| `password.forgot` | Forgot-password OTP request (exists today, hardcoded) | "Password Reset OTP" — uses `{{USERNAME}}`, `{{OTP_CODE}}` |
| `contact-us.submitted` | Public Contact Us form | "We got your message" — uses `{{NAME}}` |
| `job-application.submitted` | Careers page application form | "Application received" — uses `{{NAME}}`, `{{ROLE}}` |

Adding the third row to a running system, end to end:

1. Admin creates an `EmailFor` (or a future "trigger" record — see below) for `job-application.submitted`.
2. Admin creates an `EmailTemplate` pointed at it, subject "Application received", body using `{{NAME}}` and `{{ROLE}}`.
3. Someone submits the careers form.
4. The careers controller calls `sendTriggeredEmail("job-application.submitted", { toEmail: applicant.email, mergeFields: { NAME: applicant.name, ROLE: role.title } })`.
5. The shared function resolves the active template(s) for that key, fills the tokens, sends via the template's `EmailSetup` account.

No mailer code was touched to add this row — only data, plus the one call in step 4.

## Open questions to settle before building

None of these are decided. They matter because they change the schema, so they're `system-design`
questions, not implementation details to improvise mid-build:

- **One template per trigger, or many?** A real Contact Us often needs two emails from one
  submission — a thank-you to the visitor *and* a notification to the internal team. Today's shape
  (`EmailTemplate.emailFor` = a single id) assumes one-to-one. Fanning out to many means either
  `EmailTemplate` gaining a list of triggers it responds to, or a trigger resolving to a list of
  templates.
- **What happens when zero templates match?** `createOtp` currently hard-fails the whole request
  with a 404 if none exists. That's almost certainly wrong for a public-facing form — the visitor's
  submission should probably still succeed even if the "thank you" email can't be found, with the
  failure logged for an admin rather than shown to the visitor.
- **Where are merge fields declared and validated?** So a person editing a template sees "you can
  use NAME, MESSAGE here" instead of guessing, and a typo'd token doesn't silently render as literal
  `{{TEXT}}` in a sent email.
- **Does "form" deserve to be its own concept**, separate from `EmailFor`, or does every form just
  get one `EmailFor` row the way `"Forget Password"` does today? Matters only if two different forms
  should ever legitimately share one template.
- **Does the duplicate-`emailFor`-across-templates gap (above) get closed as part of this**, or is
  it superseded once triggers can resolve to more than one template on purpose?

## Where this fits the pipeline

Per `AGENTS.md`, this spans a schema change (trigger key, possibly template-per-trigger being a
list), an API change (the shared send function plus every form's submit handler), and touches
whichever admin screens manage `EmailFor`/`EmailTemplate`. That means, when this moves forward:

| Phase | Skill | What it would need to decide |
|---|---|---|
| Design | `system-design` | The open questions above, and whether `EmailFor` is extended or a new `FormTrigger`-style collection is introduced |
| Data | `schema-design` | The trigger key field/index, and the one-to-one vs one-to-many shape |
| API | `api-endpoint` | The shared `sendTriggeredEmail`-equivalent function, and refactoring `otp.controller.js` onto it |
| UI | `new-page` | Any change to the `EmailFor`/`EmailTemplate` admin screens (e.g. showing declared merge fields) |

## Status

Explored only, 2026-09-05. Nothing built, no ADR filed. Tracked as a not-started row in
`docs/knowledge/STATE.md` so a future session doesn't have to rediscover this conversation. Start
with `system-design` when ready to build, using the open questions above as the input.
