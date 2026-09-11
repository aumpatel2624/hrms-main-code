/**
 * The documentation manifest (ADR-011).
 *
 * One entry per screen the client's end users can reach. This is the source of
 * truth for three things at once: what gets a documentation page, what gets
 * photographed, and what the prose says.
 *
 * ## Why the prose lives here and not in the generated output
 *
 * `docs-src/` is written by people; `apps/admin/src/docs/` is generated and
 * overwritten on every run. Editing a generated page loses the edit at the
 * next `npm run docs`. So anything a human wants to say goes in the `intro`,
 * `when`, `gotchas` and `roles` fields below, and the generator merges it with
 * what it can read out of the entity config.
 *
 * ## What the generator reads for you
 *
 * Do not restate in prose what the entity config already carries. The
 * generator emits the entity's `description`, its `sections` and their
 * descriptions, every field with its label/hint/required flag, and the filter
 * list. Write the things a config cannot know: why the screen exists, what a
 * user is usually trying to do, and what will surprise them.
 *
 * ## Adding, viewing, editing and deleting
 *
 * Every config-driven screen renders the same shared CRUD components, so the
 * steps for the four operations are identical everywhere and the generator
 * writes them for you — do not repeat them per screen.
 *
 * Two flags change what it writes:
 *
 * - `listOnly: true` — the screen lists records and hands off to its own
 *   editor rather than the shared form, so only the viewing section is
 *   emitted, and only the list is photographed.
 * - `shots: [...]` — which views to capture, from `list`, `add`, `view` and
 *   `edit`. The default is all four (just `list` for a `listOnly` screen), so
 *   each operation section is illustrated by the screen its steps describe.
 *   Deleting has no shot of its own: its dialog is a small modal over the list,
 *   which the list image at the top of the page already shows.
 * - `operations: { create, read, update, delete }` — replaces the generated
 *   body of one section for screens that genuinely differ. Use it sparingly;
 *   a screen that needs all four rewritten is probably a custom page.
 *
 * ## Adding a screen
 *
 * A new module adds its screen here in the same commit. A screen missing from
 * this file gets no page and no screenshot, and nothing warns you — see the
 * `client-docs` skill.
 */

/**
 * Shared UI every CRUD screen renders through. A change to any of these moves
 * every config-driven screenshot, so they are fingerprint inputs for all of
 * them. Deliberately broad: over-capturing costs a minute, while a stale
 * screenshot is documentation that lies.
 */
export const SHARED_CRUD_SOURCES = [
    "apps/admin/src/components/crud/crud-list.jsx",
    "apps/admin/src/components/crud/crud-form.jsx",
    "apps/admin/src/components/crud/crud-view.jsx",
    "apps/admin/src/components/crud/index.jsx",
];

/** Theme tokens. A change here repaints literally everything. */
export const THEME_SOURCES = [
    "apps/admin/src/styles/globals.css",
    "apps/admin/src/styles/theme.css",
    "apps/admin/src/styles/typography.css",
];

/** The fixture data every screenshot is a picture of. */
export const FIXTURE_SOURCES = ["apps/server/seed/fixtures.js"];

/**
 * Screens driven by an entity config.
 *
 * `config` names the export in `apps/admin/src/entities/`; the generator reads
 * it for structure. `path` is where the capture script navigates.
 */
export const CONFIG_SCREENS = [
    {
    "key": "shift-type",
    "config": "shiftTypeConfig",
    "source": "apps/admin/src/entities/advanced.jsx",
    "path": "/shift-type",
    "intro": "Define shift hours and how punches become worked hours.",
    "when": "Use this screen when setting up shifts or recording attendance.",
    "gotchas": [
        "Records referenced elsewhere cannot be deleted."
    ],
    "roles": "HR User and HR Manager manage records within their company. Employees can read shift types and their own assignments, and create/read their own checkins."
},
    {
    "key": "shift-location",
    "config": "shiftLocationConfig",
    "source": "apps/admin/src/entities/advanced.jsx",
    "path": "/shift-location",
    "intro": "Set where employees may check in when they supply their location.",
    "when": "Use this screen when setting up shifts or recording attendance.",
    "gotchas": [
        "Records referenced elsewhere cannot be deleted."
    ],
    "roles": "HR User and HR Manager manage records within their company. Employees can read shift types and their own assignments, and create/read their own checkins."
},
    {
    "key": "shift-assignment",
    "config": "shiftAssignmentConfig",
    "source": "apps/admin/src/entities/advanced.jsx",
    "path": "/shift-assignment",
    "intro": "Give an employee one shift for a date range.",
    "when": "Use this screen when setting up shifts or recording attendance.",
    "gotchas": [
        "Dates and times use UTC.",
        "Active assignments cannot overlap. A location radius of zero disables location enforcement."
    ],
    "roles": "HR User and HR Manager manage records within their company. Employees can read shift types and their own assignments, and create/read their own checkins."
},
    {
    "key": "shift-schedule",
    "config": "shiftScheduleConfig",
    "source": "apps/admin/src/entities/advanced.jsx",
    "path": "/shift-schedule",
    "intro": "Define the weekdays in a repeating shift pattern.",
    "when": "Use this screen when setting up shifts or recording attendance.",
    "gotchas": [
        "Records referenced elsewhere cannot be deleted."
    ],
    "roles": "HR User and HR Manager manage records within their company. Employees can read shift types and their own assignments, and create/read their own checkins."
},
    {
    "key": "shift-schedule-assignment",
    "config": "shiftScheduleAssignmentConfig",
    "source": "apps/admin/src/entities/advanced.jsx",
    "path": "/shift-schedule-assignment",
    "intro": "Generate dated assignments from a repeating schedule.",
    "when": "Use this screen when setting up shifts or recording attendance.",
    "gotchas": [
        "Records referenced elsewhere cannot be deleted."
    ],
    "roles": "HR User and HR Manager manage records within their company. Employees can read shift types and their own assignments, and create/read their own checkins."
},
    {
    "key": "employee-checkin",
    "config": "employeeCheckinConfig",
    "source": "apps/admin/src/entities/advanced.jsx",
    "path": "/employee-checkin",
    "intro": "Record check-in and check-out times for your assigned shift.",
    "when": "Use this screen when setting up shifts or recording attendance.",
    "gotchas": [
        "Records referenced elsewhere cannot be deleted."
    ],
    "roles": "HR User and HR Manager manage records within their company. Employees can read shift types and their own assignments, and create/read their own checkins."
},
    {
    "key": "shift-request",
    "config": "shiftRequestConfig",
    "source": "apps/admin/src/entities/advanced.jsx",
    "path": "/shift-request",
    "intro": "Request a shift change for yourself over a date range.",
    "when": "Use this screen when you need a different shift than the one you already have, for a period you specify.",
    "gotchas": [
        "The Shift Approver is resolved automatically — your own Shift Approver if you have one, otherwise your Department's — unless you set one yourself.",
        "Approving creates the real Shift Assignment. Rejecting has no further effect.",
    ],
    "roles": "Employees can create and read their own Shift Requests. HR User and HR Manager can read, edit, approve and reject every request.",
},
    {
    "key": "attendance-request",
    "config": "attendanceRequestConfig",
    "source": "apps/admin/src/entities/advanced.jsx",
    "path": "/attendance-request",
    "intro": "Ask for Attendance to be recorded for a date range — for working from home, being on duty elsewhere, or another reason attendance was not captured automatically.",
    "when": "Use this screen instead of Employee Checkin when you were not able to check in/out for a shift but still worked.",
    "gotchas": [
        "Saving is the action — it immediately creates or updates one Attendance record per day in the range.",
        "A day that is a holiday is skipped unless Include Holidays is checked. A day already covered by an approved leave is always skipped.",
        "Cancel reverses exactly the Attendance rows this request created — it does not touch any other Attendance record.",
    ],
    "roles": "Employees can create and read their own Attendance Requests and cancel them. HR User and HR Manager can read, edit and cancel every request.",
},
    {
        key: "department",
        config: "departmentConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro:
            "Departments are the teams people belong to — Sales, Finance, Warehouse. Every user is " +
            "assigned to exactly one, and that assignment does more than label them: it decides who " +
            "can see their records. Every department now also belongs to a company — see Company below.",
        when:
            "Add a department when a new team is formed. Mark one inactive when a team is wound down — " +
            "that keeps its history intact while removing it from the dropdowns on other screens.",
        gotchas: [
            "You cannot delete a department while users are still assigned to it. The panel will tell " +
                "you how many, so move those people first.",
            "Department codes are optional and short — used in reports and exports where you have " +
                "one. Keep them stable once set; changing one changes how older reports read.",
            "Department names only have to be unique within the same company — two companies can each " +
                "have their own \"Finance\" department.",
        ],
        roles:
            "If your role is limited to your own department, this screen shows only your department " +
            "rather than the full list.",
    },
    {
        key: "company",
        config: "companyConfig",
        source: "apps/admin/src/entities/index.js",
        intro:
            "A company is a legal entity within Apidel. Every branch, department and designation " +
            "belongs to exactly one company, so this is the first thing to set up in a new deployment.",
        when:
            "Add a company before adding anything else under it. Mark one inactive rather than " +
            "deleting it if it stops being used — its history (branches, departments, records) stays " +
            "intact and out of the dropdowns.",
        gotchas: [
            "You cannot delete a company while anything still belongs to it — branches, departments, " +
                "designations. The panel tells you what and how many.",
            "The company code is optional. If you use one, it must be unique across every company.",
        ],
        roles: "Only HR User and HR Manager can add or edit companies.",
    },
    {
        key: "branch",
        config: "branchConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro:
            "A branch is a site or location under a company — a city, a region, a work-from-home " +
            "pool. It is a simple named label, not a full address.",
        when:
            "Add a branch for each location the company operates from or hires into.",
        gotchas: [
            "You cannot delete a branch while records still reference it.",
            "A branch name only has to be unique within its own company.",
        ],
        roles: "Only HR User and HR Manager can add or edit branches.",
    },
    {
        key: "designation",
        config: "designationConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro:
            "A designation is a job title — Manager, Executive, Vice President. Every employee will " +
            "eventually be assigned one.",
        when: "Add a designation for each job title the company uses.",
        gotchas: [
            "You cannot delete a designation while records still reference it.",
            "A designation name only has to be unique within its own company.",
        ],
        roles: "Only HR User and HR Manager can add or edit designations.",
    },
    {
        key: "employment-type",
        config: "employmentTypeConfig",
        source: "apps/admin/src/entities/index.js",
        intro:
            "An employment type classifies how someone works for the company — Full-time, Part-time, " +
            "Contract, Intern. Unlike branches and designations, employment types are shared across " +
            "every company, not scoped to one.",
        when: "Add an employment type if the ones already here don't cover a category you hire under.",
        gotchas: ["You cannot delete an employment type while records still reference it."],
        roles: "Only HR User and HR Manager can add or edit employment types.",
    },
    {
        key: "employee-grade",
        config: "employeeGradeConfig",
        source: "apps/admin/src/entities/index.js",
        intro:
            "An employee grade is a pay-band label — L1, L2, Senior, and so on. Like employment " +
            "types, grades are shared across every company.",
        when: "Add a grade before assigning employees to it.",
        gotchas: ["You cannot delete a grade while records still reference it."],
        roles: "Only HR User and HR Manager can add or edit employee grades.",
    },
    {
        key: "employee",
        config: "employeeConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro:
            "An employee is the hub every other HR record links to — leave, payroll, performance and " +
            "everything else eventually refers back to this record. Real employee codes and reporting " +
            "lines carry over from the org chart, so most employees are already here.",
        when: "Add an employee when someone new joins, before creating any other record about them.",
        gotchas: [
            "Company, Department, Designation, Branch and Date of Joining are all required — an " +
                "employee cannot be saved without them.",
            "You cannot delete an employee while other records still reference them.",
            "Employment Type, Grade and the three approver fields are optional and are not " +
                "pre-filled — set them here if you use them.",
            "This screen does not create a login for the employee. Self-service login is separate, " +
                "future work — most employees here have no login yet.",
        ],
        roles: "Only HR User and HR Manager can add or edit employees.",
    },
    {
        key: "employee-health-insurance",
        config: "employeeHealthInsuranceConfig",
        source: "apps/admin/src/entities/index.js",
        intro:
            "A health insurance provider is a lookup list — Aetna, Cigna, and so on — an employee's " +
            "insurance can be set against.",
        when: "Add a provider before assigning an employee's health insurance to it.",
        gotchas: ["You cannot delete a provider while records still reference it."],
        roles: "HR Manager can add, edit and delete providers; HR User can view them but not change them.",
    },
    {
        key: "job-requisition",
        config: "jobRequisitionConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro:
            "A Job Requisition is a headcount request — who's asking, for which role, and why. It's " +
            "the first stage of the hiring funnel, before a vacancy is posted.",
        when: "Add one when a department needs to ask for a new hire.",
        gotchas: [
            "Completed On is required once Status is set to Filled.",
            "\"Create Job Opening\" builds a draft posting from this requisition — review and save it " +
                "on the Job Opening screen, it isn't created automatically.",
        ],
        roles: "Only HR User and HR Manager can add or edit job requisitions.",
    },
    {
        key: "job-opening",
        config: "jobOpeningConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro:
            "A Job Opening is a vacancy posting. Publish it to list it on the public job board; closing " +
            "it removes it from that listing.",
        when: "Add one to start collecting applicants for a role — either from a Job Requisition or directly.",
        gotchas: [
            "Publishing generates a public web address from the company and job title automatically.",
            "An expired posting (past its Closes On date) stops appearing on the public board even if " +
                "its Status still reads Open here.",
            "Closing an opening linked to a Job Requisition marks that requisition Filled automatically.",
        ],
        roles: "Only HR User and HR Manager can add or edit job openings.",
    },
    {
        key: "job-applicant",
        config: "jobApplicantConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro:
            "A Job Applicant is a candidate's application against a Job Opening.",
        when: "Add one when a candidate applies — by email, referral, or however they reached you.",
        gotchas: [
            "You cannot add an applicant against a closed Job Opening.",
            "If the opening has duplicate-application prevention on, the same email can't apply twice " +
                "for it.",
            "Applicant Name is filled in from the email address automatically if left blank.",
        ],
        roles: "Only HR User and HR Manager can add or edit job applicants.",
    },
    {
        key: "job-applicant-source",
        config: "jobApplicantSourceConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A lookup list of where candidates come from — referral, job board, and so on.",
        when: "Add a source before assigning an applicant's source to it.",
        gotchas: ["You cannot delete a source while records still reference it."],
        roles: "Only HR User and HR Manager can add or edit sources.",
    },
    {
        key: "interview-type",
        config: "interviewTypeConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A reusable interview round definition — technical round, HR round, and so on.",
        when: "Add one before scheduling an interview of that kind.",
        gotchas: ["You cannot delete an interview type while records still reference it."],
        roles: "Only HR User and HR Manager can add or edit interview types.",
    },
    {
        key: "interview",
        config: "interviewConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A scheduled interview round for a candidate against an Interview Type.",
        when: "Add one to schedule a candidate's next interview round.",
        gotchas: [
            "A candidate cannot be scheduled twice for the same Interview Type while an earlier one " +
                "for it is still active.",
            "If the Interview Type is tied to a designation, it must match the applicant's own — a " +
                "mismatch is rejected.",
        ],
        roles: "HR User, HR Manager and Interviewer can all add or edit interviews.",
    },
    {
        key: "interview-feedback",
        config: "interviewFeedbackConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A single interviewer's scorecard for one Interview — a result plus free-text feedback.",
        when: "Add one after conducting an interview round.",
        gotchas: [
            "Only an interviewer assigned to the Interview can submit feedback for it.",
            "Feedback cannot be submitted before the Interview's scheduled date.",
            "Only one feedback per interviewer per interview is allowed.",
        ],
        roles: "Only the Interviewer role can add or edit feedback here — HR User and HR Manager can view it but not change it.",
    },
    {
        key: "job-offer",
        config: "jobOfferConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A compensation and terms offer extended to a candidate.",
        when: "Add one once a candidate is selected to hire.",
        gotchas: [
            "Only one active offer per applicant is allowed — cancel the earlier one to issue a new one.",
            "Setting Status to Accepted or Rejected updates the linked Job Applicant's status to match.",
            "\"Create Employee\" (once Accepted) builds a draft employee record from the offer — review " +
                "and save it on the Employee screen, it isn't created automatically. Creating that " +
                "Employee record is what actually marks the offer and applicant Accepted for good.",
        ],
        roles: "Only HR User and HR Manager can add or edit job offers.",
    },
    {
        key: "job-offer-term-template",
        config: "jobOfferTermTemplateConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A reusable set of terms an offer can copy from, instead of retyping them each time.",
        when: "Add one when you have a standard set of offer terms worth reusing.",
        gotchas: ["You cannot delete a template while records still reference it."],
        roles: "Only HR User and HR Manager can add or edit templates.",
    },
    {
        key: "user",
        config: "userConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro:
            "Everyone who signs in to the panel has a user record here. It holds who they are, how to " +
            "reach them, which department they work in, and which role decides what they can do.",
        when:
            "Create a user when someone joins. When they leave, mark them inactive rather than " +
                "deleting them — an inactive user cannot sign in, but everything they did stays " +
                "attributable to a name.",
        gotchas: [
            "Email addresses must be unique, and they are what people sign in with.",
            "The password field only appears when adding someone. To change an existing user's " +
                "password, use the reset option on their record instead.",
            "Changing someone's role changes what they can see and do the next time they sign in.",
        ],
        roles:
            "Whether you can add, edit or delete users depends on your role's permissions. If a button " +
            "is missing, your role has not been granted that action.",
    },
    {
        key: "role",
        config: "roleConfig",
        source: "apps/admin/src/entities/index.js",
        intro:
            "A role is a named job — Manager, Support Agent, Warehouse Staff. Creating one here gives " +
            "you the name; what it can actually do is set on the User Roles screen.",
        when:
            "Add a role when a group of people need a different level of access from everyone else.",
        gotchas: [
            "A new role starts with no permissions at all. Until you grant some on User Roles, anyone " +
                "with that role signs in and sees almost nothing.",
            "You cannot delete a role while users are assigned to it.",
        ],
    },
    {
        key: "country",
        config: "countryConfig",
        source: "apps/admin/src/entities/index.js",
        intro:
            "The list of countries used wherever an address is entered. States belong to countries, " +
            "and cities belong to states, so this is the top of that chain.",
        when: "Add a country before you can add its states and cities.",
        gotchas: [
            "A country cannot be deleted while it still has states, or while anyone's address uses it.",
        ],
    },
    {
        key: "state",
        config: "stateConfig",
        source: "apps/admin/src/entities/index.js",
        intro:
            "States and provinces, each belonging to a country. Choosing a country first narrows the " +
            "state list everywhere an address is entered.",
        when: "Add a state after its country exists and before adding its cities.",
        gotchas: ["A state cannot be deleted while it still has cities, or while an address uses it."],
    },
    {
        key: "city",
        config: "cityConfig",
        source: "apps/admin/src/entities/index.js",
        intro: "Cities, each belonging to a state and through it a country.",
        when: "Add a city when someone needs an address the existing list does not cover.",
        gotchas: [
            "Pick the country first — the state list only fills in once a country is chosen.",
            "A city cannot be deleted while an address uses it.",
        ],
    },
    {
        key: "currency",
        config: "currencyConfig",
        source: "apps/admin/src/entities/index.js",
        intro:
            "Currencies available for prices and reporting, each with the symbol shown to users.",
        when: "Add a currency when you start trading in one you do not already have.",
    },
    {
        key: "admin-user",
        config: "adminUserConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro:
            "Administrator accounts. These are separate from ordinary users and are not limited by the " +
            "permission matrix — an administrator sees everything.",
        when: "Add one only for people who genuinely need unrestricted access.",
        gotchas: [
            "Administrators bypass role permissions and data scoping entirely. Keep this list short.",
            "As with users, the password is set when adding and changed through a reset afterwards.",
        ],
    },
    {
        key: "menu-group",
        config: "menuGroupConfig",
        source: "apps/admin/src/entities/index.js",
        intro:
            "The top-level headings in the sidebar. A group either holds a set of screens or, if it is " +
            "marked a direct link, navigates straight somewhere on its own.",
        when: "Add a group when a new area of the panel needs its own heading.",
        gotchas: [
            "Sequence controls the order groups appear in the sidebar, lowest first.",
            "A direct-link group needs a URL and has no screens under it.",
        ],
    },
    {
        key: "menu-master",
        config: "menuMasterConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro:
            "The individual screens inside each sidebar group. Every screen in the panel has a row " +
            "here, and that row is what permissions are granted against.",
        when: "You will rarely add rows by hand — new screens arrive with their own.",
        gotchas: [
            "A screen with no row here is invisible to everyone except administrators.",
            "Removing a row removes the screen from the sidebar for every role at once.",
        ],
    },
    {
        key: "email-setup",
        config: "emailSetupConfig",
        source: "apps/admin/src/entities/index.js",
        intro:
            "The mailboxes outgoing email is sent from — the address, and the mail server details it " +
            "connects through.",
        when: "Set one up before any email template can send.",
        gotchas: [
            "The app password is not the mailbox's normal password. Most providers require you to " +
                "generate a separate one for applications.",
            "The password is stored securely and never shown back to you after saving.",
        ],
    },
    {
        key: "email-for",
        config: "emailForConfig",
        source: "apps/admin/src/entities/index.js",
        intro:
            "The list of occasions an email can be sent for — a welcome message, a password reset, an " +
            "order confirmation. Each template attaches to one of these.",
        when: "Add one when there is a new moment in the system that should trigger an email.",
        gotchas: [
            "The Trigger dropdown only offers events that don't already have one of these set up, " +
                "so it can go empty. If the event you want isn't listed, either someone has already " +
                "set it up (check the list below, or reuse that row instead of creating a new one), " +
                "or it genuinely doesn't exist yet — new events have to be added by a developer " +
                "before they show up here.",
            "If a row's Trigger column shows something starting with \"unassigned.\", it was created " +
                "before it had a proper event attached. Editing one of these is not safe right now — " +
                "the Trigger field will appear empty, and saving will either be blocked or, worse, " +
                "attach it to a different real event than the one it was already quietly doing. Leave " +
                "these rows alone and ask your development team to sort them out.",
        ],
    },
    {
        key: "email-template",
        config: "emailTemplateConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro:
            "The actual wording of each automated email — the subject, the signature, and who it comes " +
            "from.",
        when: "Edit a template when the wording of an automated email needs to change.",
        gotchas: [
            "A template needs both a mailbox to send from and an occasion to send for; create those " +
                "first.",
            "Once you pick the occasion, the form shows which {{PLACEHOLDER}} tokens that occasion " +
                "allows — for example {{USERNAME}} or {{OTP_CODE}} — and what each one fills in with. " +
                "Only those tokens work in the subject and signature; typing anything else in curly " +
                "braces will be rejected when you save.",
            "Only one template can be active for a given occasion at a time. Saving a second active " +
                "one for the same occasion is blocked — either deactivate the existing one first, or " +
                "save the new one as inactive until you're ready to switch over.",
        ],
    },
    {
        key: "seo-redirect",
        config: "seoRedirectConfig",
        source: "apps/admin/src/entities/index.js",
        intro:
            "When a page on your website moves or disappears, a redirect sends anyone asking for the " +
            "old address to the new one. Without it they see an error, and search engines eventually " +
            "drop the page.",
        when:
            "Add a redirect whenever you change or remove a page's URL — before the change goes live, " +
            "ideally.",
        gotchas: [
            "Use 301 unless the page is genuinely coming back. It tells search engines the move is " +
                "permanent and passes the old page's standing to the new one.",
            "410 means gone for good and needs no destination.",
            "The Times Used column tells you whether a redirect is still earning its place.",
        ],
    },
    {
        key: "seo-page",
        config: "seoPageConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        listOnly: true,
        intro:
            "How each fixed page of your website appears in a search result and when someone shares " +
            "the link. This screen lists them; opening one takes you to the editor, which previews " +
            "both as you type.",
        when: "Review a page's entry whenever its content changes enough that the summary is now wrong.",
        gotchas: [
            "Only pages with fixed addresses live here — the home page, About, Contact. Content with " +
                "its own record carries its own settings.",
            "A page left blank falls back to the site-wide defaults on the SEO Settings screen.",
        ],
    },
    {
        key: "employee-onboarding-template",
        config: "employeeOnboardingTemplateConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A reusable checklist of onboarding activities — laptop setup, ID card, orientation — for a role, department or grade.",
        when: "Build one before you have your first new hire in that role, then reuse it every time.",
        gotchas: [
            "Selecting a template on an Employee Onboarding copies its activities in at that moment — " +
                "editing the template afterward does not change onboardings already created from it.",
        ],
        roles: "HR User and HR Manager can add and edit templates; only HR Manager can delete one.",
    },
    {
        key: "employee-onboarding",
        config: "employeeOnboardingConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "The checklist that brings one new hire from accepted offer to Active employee.",
        when: "Create one as soon as a Job Offer is accepted.",
        gotchas: [
            "Status (Pending / In Process / Completed) is derived automatically from the activities " +
                "below it — tick activities off rather than trying to set the status directly.",
            "\"Create Employee\" only works once every activity marked \"Required for hire\" is Completed.",
            "\"Create Employee\" builds a draft — review and save it on the Employee screen, it isn't " +
                "created automatically.",
            "Only one onboarding is allowed per Job Applicant.",
        ],
        roles: "HR User and HR Manager can add and edit onboardings, but neither can delete one — only a System Manager can.",
    },
    {
        key: "employee-separation-template",
        config: "employeeSeparationTemplateConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A reusable checklist of offboarding activities — asset return, access revocation, exit paperwork.",
        when: "Build one before your first departure, then reuse it every time.",
        gotchas: [
            "Selecting a template copies its activities in at that moment, same as the onboarding template.",
        ],
        roles: "Only HR Manager can add, edit or delete separation templates — HR User has read-only access here.",
    },
    {
        key: "employee-separation",
        config: "employeeSeparationConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "The checklist that relieves one employee — access revocation, asset return, exit paperwork.",
        when: "Create one as soon as an employee's departure is confirmed.",
        gotchas: [
            "Status is derived from the activities below it, same as Employee Onboarding.",
            "Only one separation is allowed per employee at a time.",
            "The Exit Interview Summary field here is free-text notes only — it is not linked to that " +
                "employee's actual Exit Interview record.",
        ],
        roles: "HR User and HR Manager can add and edit separations, but neither can delete one.",
    },
    {
        key: "exit-interview",
        config: "exitInterviewConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A standalone record of an employee's exit interview and final decision.",
        when: "Schedule one once the employee's Relieving Date is confirmed.",
        gotchas: [
            "The linked employee must already have a Relieving Date set, or this cannot be created.",
            "Date and interviewers are required once Status is set to Scheduled; Final Decision is " +
                "required once Status is set to Completed.",
            "Only one exit interview is allowed per employee at a time.",
        ],
        roles: "HR Manager can add and edit exit interviews; HR User has read-only access here.",
    },
    {
        key: "full-and-final-statement",
        config: "fullAndFinalStatementConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A final-settlement worksheet for a departing employee — what the company owes them, what they owe the company, and any company assets to recover.",
        when: "Create one once the employee's Relieving Date is confirmed, and fill in payables, receivables and any allocated assets by hand.",
        gotchas: [
            "The linked employee must already have a Relieving Date set, or this cannot be created.",
            "Totals are calculated automatically from the rows below — don't try to type them in directly.",
            "\"Mark as Paid\" is blocked until every payable and receivable row is Settled and every " +
                "returned asset is marked Returned.",
            "This is a worksheet, not an accounting entry — it does not post to any ledger.",
        ],
        roles: "HR User and HR Manager can both fully manage statements, including delete — the one " +
            "screen in this group where HR User isn't more restricted than HR Manager.",
    },
    {
        key: "grievance-type",
        config: "grievanceTypeConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A classification master for employee grievances (e.g. Harassment, Workplace Safety).",
        when: "Set these up once, before staff start filing grievances, so every grievance can be categorized.",
        roles: "HR User and HR Manager can fully manage grievance types.",
    },
    {
        key: "employee-grievance",
        config: "employeeGrievanceConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A filed workplace grievance and its investigation/resolution.",
        when: "Log a grievance as soon as it's raised, then update its Status as it's investigated and resolved.",
        gotchas: [
            "Cause of Grievance becomes required once Status is Investigated or Resolved.",
            "Resolved By, Resolution Date and Resolution Detail all become required once Status is Resolved.",
            "\"Grievance Against\" can name a specific employee or just be typed as free text — use whichever fits.",
        ],
        roles: "HR User, HR Manager and the Employee role can all fully manage grievances, including delete.",
    },
    {
        key: "employee-transfer",
        config: "employeeTransferConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "Records a department, designation or branch change for an employee, and updates their record immediately.",
        when: "Create one when an employee moves department, designation or branch within the same company.",
        gotchas: [
            "Only Active employees can be transferred.",
            "Inter-company transfers aren't supported — this only changes department/designation/branch within the same company.",
            "Applying the change happens immediately on creation and is logged — this record can't be edited afterward, only deleted.",
        ],
        roles: "HR Manager can add and delete transfers; HR User can create and view but not edit or delete.",
    },
    {
        key: "employee-promotion",
        config: "employeePromotionConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "Records a department, designation, grade or CTC change for an employee, and updates their record immediately.",
        when: "Create one when an employee is promoted or given a compensation change.",
        gotchas: [
            "Blocked for employees whose status is Inactive.",
            "Current CTC is fetched automatically from the employee's record if left blank, and is never overwritten once entered.",
            "Applying the change happens immediately on creation and is logged — this record can't be edited afterward, only deleted.",
        ],
        roles: "HR Manager can add and delete promotions; HR User can create and view but not edit or delete.",
    },
    {
        key: "employee-referral",
        config: "employeeReferralConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "An employee-submitted candidate referral, which can be converted into a real Job Applicant.",
        when: "Log a referral as soon as an employee submits one.",
        gotchas: [
            "Only one referral is allowed per email address at a time.",
            "\"Create Job Applicant\" turns this referral into a real candidate in the Recruitment pipeline and sets this record to In Process.",
        ],
        roles: "HR User and HR Manager can both manage referrals; only HR Manager can delete one.",
    },
    {
        key: "staffing-plan",
        config: "staffingPlanConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "Plans headcount and budget by designation for a company over a date range, and caps how many job openings/offers can be created for that designation while the plan is active.",
        when: "Set one up before a hiring push, so Recruitment can't accidentally over-hire past what's budgeted.",
        gotchas: [
            "Blocks a second active plan for the same company and designation in an overlapping date range.",
            "Current count, current openings, number of positions and estimated cost are all calculated automatically from real Employee and Job Opening data — don't try to type them in.",
            "Designation rows are entered by the Designation's id — there's no picker for this field yet.",
        ],
        roles: "HR Manager can fully manage staffing plans; HR User can create and edit but not delete.",
    },
    {
        key: "training-program",
        config: "trainingProgramConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A training curriculum, e.g. a recurring course or workshop series.",
        when: "Set one up before scheduling individual Training Events under it.",
        roles: "HR Manager can fully manage training programs; HR User can edit existing ones but not create or delete.",
    },
    {
        key: "training-event",
        config: "trainingEventConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A single scheduled training session, with its attendee list and per-attendee scoring.",
        when: "Create one to schedule a session; add attendees, then mark it Completed once it's happened.",
        gotchas: [
            "End Time must be strictly after Start Time.",
            "\"Mark as Completed\" moves every Present, not-yet-feedback-submitted attendee to Completed and moves the event to Completed — it doesn't touch Absent attendees.",
            "\"Reopen as Scheduled\" resets every attendee row back to Open.",
            "Attendee rows are entered by the Employee's id — there's no picker for this field yet.",
        ],
        roles: "HR Manager can fully manage training events; HR User can edit existing ones but not create or delete.",
    },
    {
        key: "training-feedback",
        config: "trainingFeedbackConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "An employee's feedback on a training session they attended.",
        when: "Collect this after a Training Event is marked Completed.",
        gotchas: [
            "Only allowed once the Training Event is Completed, the employee is one of its attendees, and they weren't marked Absent.",
            "Submitting feedback marks that attendee's row \"Feedback Submitted\" on the Training Event.",
        ],
        roles: "HR Manager can fully manage training feedback; HR User can edit existing entries but not create or delete; Employees can create, read and edit (not delete) their own.",
    },
    {
        key: "skill",
        config: "skillConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A named skill (e.g. Communication, MS Excel) used across Employee Skill Maps and Recruitment's interview screens.",
        when: "Set these up once, before mapping employee skills or scoring interviews against them.",
        roles: "HR Manager can fully manage skills; HR User can only view them.",
    },
    {
        key: "employee-skill-map",
        config: "employeeSkillMapConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "One employee's skill profile — a list of skills and a 1-5 proficiency rating for each.",
        when: "Create one per employee, then use \"Populate from Designation\" to pull in the skills expected for their Designation.",
        gotchas: [
            "\"Populate from Designation\" clears and replaces the skill list — any manually added rows are lost.",
            "Skill rows are entered by the Skill's id — there's no picker for this field yet.",
        ],
        roles: "HR Manager can fully manage skill maps; HR User can create and edit but not delete.",
    },
    {
        key: "purpose-of-travel",
        config: "purposeOfTravelConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A named reason for travel (e.g. Client Meeting, Conference), used as a dropdown on Travel Request.",
        when: "Set these up once, before employees start submitting travel requests.",
        roles: "Admin only — no HR or Employee role has access to this screen.",
    },
    {
        key: "identification-document-type",
        config: "identificationDocumentTypeConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A named type of personal ID (e.g. Passport, Aadhaar Card), used as a dropdown on Travel Request.",
        when: "Set these up once, before employees start submitting travel requests.",
        roles: "Admin only — no HR or Employee role has access to this screen.",
    },
    {
        key: "travel-request",
        config: "travelRequestConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "An employee's request to travel, with an itinerary (one row per leg) and costings (sponsored/funded amounts).",
        when: "Create one whenever an employee needs to travel for work.",
        gotchas: [
            "Can't be created or edited for an Inactive employee.",
            "Total Amount on a costing row is entered manually, not calculated from Sponsored/Funded amounts.",
            "Itinerary dates (departure/arrival, check-in/check-out) aren't validated against each other.",
        ],
        roles: "HR User and HR Manager have full access; Employees can create, read and edit (not delete) their own requests.",
    },
    {
        key: "leave-type",
        config: "leaveTypeConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A category of leave (Casual, Sick, Earned, ...) and the rules that govern it — paid/unpaid, carry-forward, encashment, earned-leave accrual.",
        when: "Set these up once, before building Leave Policies on top of them.",
        gotchas: [
            "The starter set (Casual/Sick/Earned/Compensatory Off/Leave Without Pay) is a generic placeholder, not confirmed against any client document — review and adjust before relying on it.",
        ],
        roles: "HR User and HR Manager can fully manage leave types; Employees can only view them.",
    },
    {
        key: "leave-period",
        config: "leavePeriodConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A named date range (e.g. a fiscal year) that Leave Policy Assignments and Leave Allocations scope to.",
        when: "Create one per company per year before assigning leave policies for that year.",
        gotchas: ["No two periods for the same company may overlap."],
        roles: "HR User and HR Manager can fully manage leave periods; Employees can only view them.",
    },
    {
        key: "holiday-list",
        config: "holidayListConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A calendar of holidays for a company and date range.",
        when: "Set one up per company before assigning it via Holiday List Assignment.",
        gotchas: ["Total Holidays is computed automatically from the holiday rows — it can't be typed in directly."],
        roles: "HR User and HR Manager can fully manage holiday lists; Employees can only view them.",
    },
    {
        key: "holiday-list-assignment",
        config: "holidayListAssignmentConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "Assigns a Holiday List to an Employee or a Company, from a given date onward.",
        when: "Use this to say which holiday calendar applies to whom.",
        gotchas: [
            "The From Date must fall within the assigned Holiday List's own date range.",
            "Only one of Employee/Company may be set, matching Applicable For.",
        ],
        roles: "HR User and HR Manager only — no Employee access.",
    },
    {
        key: "leave-policy",
        config: "leavePolicyConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A named bundle of (Leave Type, annual allocation) pairs.",
        when: "Build one per employee group/grade, then assign it via Leave Policy Assignment.",
        gotchas: [
            "Each row's annual allocation is capped at that Leave Type's own Maximum Leave Allocation Allowed, when set.",
            "Leave Type rows are entered by id — there's no picker for this field yet.",
        ],
        roles: "HR User and HR Manager only — no Employee access.",
    },
    {
        key: "leave-policy-assignment",
        config: "leavePolicyAssignmentConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "Assigns a Leave Policy to an Employee for a period, and is the trigger for actually creating Leave Allocations.",
        when: "Create one per employee per period, then click Grant Allocations to create the real Leave Allocation records.",
        gotchas: [
            "Grant Allocations is idempotent — it can be clicked again safely, but it only ever allocates once per assignment.",
            "Leave Without Pay leave types are never allocated through this flow, by design.",
            "A zero computed allocation for a plain (non-earned, non-negative-allowed) leave type is skipped entirely rather than creating an empty allocation.",
        ],
        roles: "HR User and HR Manager only — no Employee access yet (own-scoping is a second-fork follow-up, once Leave Application exists).",
    },
    {
        key: "leave-allocation",
        config: "leaveAllocationConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "The actual per-employee, per-leave-type grant of N days.",
        when: "Usually created automatically by a Leave Policy Assignment's Grant Allocations action — create one by hand only for a one-off manual grant.",
        gotchas: [
            "Total Leaves Allocated is a cached snapshot for display only — the real balance is always the sum of the Leave Ledger.",
            "Once active, the allocated amount can only be changed via the Adjust panel on the edit screen, never by editing the field directly — it writes a signed entry to the ledger instead of silently overwriting a number.",
        ],
        roles: "HR User and HR Manager only — no Employee access yet (own-scoping is a second-fork follow-up).",
    },
    {
        key: "attendance",
        config: "attendanceConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "One row per employee per day, recording whether they were present, absent, on leave, etc.",
        when: "Minimal for now — module 9 (Shift & Attendance) will extend this with shift assignment, check-in/out and geolocation.",
        gotchas: ["Only one Attendance row is allowed per employee per day."],
        roles: "HR User and HR Manager only.",
    },
    {
        key: "leave-adjustment",
        config: "leaveAdjustmentConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A one-off manual correction to an employee's leave balance.",
        when: "Use this for a one-off correction the normal allocation/application flow doesn't cover — saving is the action, there is nothing to approve afterward.",
        gotchas: [
            "Create is the action — saving writes one signed entry to the Leave Ledger immediately. There is no edit or delete afterward.",
            "Does not change the Leave Allocation's own cached total — the real balance is always the Leave Ledger.",
        ],
        roles: "HR User and HR Manager only — no Employee access.",
    },
    {
        key: "compensatory-leave-request",
        config: "compensatoryLeaveRequestConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A request for comp-off leave for a day (or range) worked on a holiday.",
        when: "An employee raises one for themselves after working a holiday or weekend; HR or a manager approves it.",
        gotchas: [
            "Approving checks that every day in the range is actually a holiday on the employee's Holiday List, and that matching Attendance records exist for the whole range — both are hard blocks, not warnings.",
            "The Leave Type must have Is Compensatory set.",
        ],
        roles: "HR User and HR Manager have full access; Employees can create, read and edit (not delete once approved) their own requests, but cannot approve or reject.",
    },
    {
        key: "leave-application",
        config: "leaveApplicationConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "The centerpiece of Leaves — an employee's request for time off.",
        when: "An employee (or someone on their behalf) creates one for a date range; their Leave Approver — or HR — approves or rejects it.",
        gotchas: [
            "Total Leave Days and the Leave Approver (when left blank) are always computed/resolved on save — a typed value is never trusted.",
            "Approving creates Attendance records for the range and posts to the Leave Ledger; Cancelling an approved application reverses both.",
            "An Employee sees only their own applications here; a Leave Approver sees their own plus everyone they're the resolved approver for.",
        ],
        roles: "Employee: own applications only (create/read/edit, no delete). Leave Approver: read/approve/reject/cancel on their own plus everyone they approve for. HR User and HR Manager: everyone's.",
    },
    {
        key: "leave-encashment",
        config: "leaveEncashmentConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "Cashes out unused leave for a Leave Type that allows it.",
        when: "Use this to pay an employee for leave they won't use, instead of letting it expire or carry forward.",
        gotchas: [
            "Create is the action — saving computes the eligible days and debits the Leave Ledger immediately.",
            "Per Day Encashment Amount is optional (ADR-026): leave it blank to use the employee's current Salary Structure Assignment rate, or type one in to override it.",
            "Mark as Paid records the payment manually (amount, date, reference) — there is no GL posting or Payment Entry.",
        ],
        roles: "HR User and HR Manager only — no Employee access.",
    },
    {
        key: "leave-block-list",
        config: "leaveBlockListConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "Dates on which Leave Applications are blocked, for a company and optionally one department and/or one Leave Type.",
        when: "Set one up before a blackout period (year-end close, a busy season) so leave can't be applied for on those dates.",
        gotchas: [
            "Users on the Allow list bypass the block entirely for that list.",
            "At least one Block Date row is required.",
        ],
        roles: "HR User and HR Manager only — no Employee access.",
    },
    // ADR-026 (Payroll — Structure & Assignment). HR-configuration screens
    // only — no self-service, unlike Leaves/Shift & Attendance.
    {
        key: "salary-component",
        config: "salaryComponentConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A reusable pay line item — Basic Salary, HRA, PF, TDS — addable to any Salary Structure.",
        when: "Set these up before building a Salary Structure; every earning, deduction and employer contribution row references one of these.",
        gotchas: [
            "Leave Abbreviation blank to auto-derive it from the name's initials; it's de-duplicated within the company if it collides.",
            "Arrear Component and Variable Based On Taxable Salary cannot both be set. Accrual Component only applies when Type is Earning.",
            "Records referenced elsewhere cannot be deleted.",
        ],
        roles: "HR User and HR Manager manage records within their company.",
    },
    {
        key: "salary-structure",
        config: "salaryStructureConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A pay template — earnings, deductions and employer contributions — assignable to employees.",
        when: "Use this to define what a payroll frequency's pay actually consists of, before assigning it to anyone.",
        gotchas: [
            "Total Earning, Total Deduction and Net Pay are computed by the server from the rows below — they cannot be typed in directly.",
            "A row's formula can reference an earlier row's Salary Component by its abbreviation (e.g. \"BASIC * 0.4\").",
            "A row's Condition, when it evaluates false, is skipped entirely for that computation — it contributes nothing.",
            "Records referenced elsewhere cannot be deleted.",
        ],
        roles: "HR User and HR Manager manage records within their company.",
    },
    {
        key: "salary-structure-assignment",
        config: "salaryStructureAssignmentConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "Assigns a Salary Structure to one employee starting from a given date.",
        when: "Use this to give (or change) an individual employee's pay structure. For many employees at once, use the Bulk Salary Structure Assignment tool instead.",
        gotchas: [
            "Annual Gross Earning and CTC are computed by the server from the Salary Structure's rows plus this assignment's Base/Variable.",
            "There is no end date. A later From Date simply supersedes an earlier one for that employee — it does not need to avoid overlapping it.",
            "Only one assignment per employee may share the exact same From Date.",
        ],
        roles: "HR User and HR Manager manage records within their company.",
    },
    // ADR-027 (Payroll — Run, foundation half). Still HR-configuration/
    // transactional screens only — no Employee self-service.
    {
        key: "payroll-period",
        config: "payrollPeriodConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "A company-scoped date range payroll runs against — also used to work out which dates are holidays for a Salary Slip.",
        when: "Set one up for each payroll run's date range before creating Salary Slips against it.",
        gotchas: [
            "Start Date cannot be after End Date.",
            "Two periods for the SAME company cannot overlap. Different companies may freely overlap — a period is company-specific.",
        ],
        roles: "HR User and HR Manager manage records within their company.",
    },
    {
        key: "salary-slip",
        config: "salarySlipConfig",
        source: "apps/admin/src/entities/advanced.jsx",
        intro: "One payslip for one employee for one period — computed from their current Salary Structure Assignment plus their actual attendance/leave for that period.",
        when: "Create one once a period's attendance and leave are finalized. Everything on it — payment days, every earning/deduction row, the totals — is computed once at that moment and does not change afterward, even if attendance is corrected later.",
        gotchas: [
            "Payment Days can be less than the period's Working Days — an unpaid leave day, an unmarked day (depending on Payroll Settings), a half day, or joining/leaving mid-period all reduce it.",
            "A Draft slip may show a negative Net Pay — that's a warning sign to check the Salary Structure, not a blocked state. Submitting is what enforces Net Pay >= 0.",
            "Submit and Cancel are the two actions — there is no edit-in-place; get the period/structure right before creating it, since a slip is a point-in-time snapshot.",
            "Only one Salary Slip per employee per exact (Start Date, End Date) pair is allowed.",
        ],
        roles: "HR User and HR Manager manage records within their company.",
    },
];

/**
 * Screens with no entity config. There is nothing to generate structure from,
 * so `body` is the whole page.
 *
 * These are the screens users most need explained, which is exactly why a
 * generator can say nothing useful about them.
 */
export const CUSTOM_SCREENS = [
    {
        key: "dashboard",
        title: "Dashboard",
        path: "/dashboard",
        source: "apps/admin/src/pages/Dashboard/Dashboard.jsx",
        intro:
            "The first screen after signing in. It shows the charts and figures chosen for your role.",
        body: [
            {
                heading: "What you are looking at",
                text:
                    "Each card is one measure — a total, a breakdown by category, or a trend over time. " +
                    "Which cards appear depends on your role, so two people signing in may see different " +
                    "dashboards.",
            },
            {
                heading: "The numbers only cover what you can see",
                text:
                    "If your role is limited to your own department, every figure here counts only your " +
                    "department's records. Two people looking at the same card can legitimately see " +
                    "different totals.",
            },
            {
                heading: "Finding out what a figure means",
                text:
                    "A card with an information icon has an explanation behind it, written by whoever " +
                    "built it, plus a breakdown of how the total splits up. If a number surprises you, " +
                    "check there first.",
            },
        ],
    },
    {
        key: "user-roles",
        title: "User Roles",
        path: "/user-roles",
        source: "apps/admin/src/pages/Setup/UserRoles.jsx",
        intro:
            "Where you decide what each role can do. Pick a role, then tick what it may see and change.",
        body: [
            {
                heading: "How the grid works",
                text:
                    "Every screen in the panel is a row. The columns are the things you can permit: " +
                    "viewing the screen at all, adding records, editing them, deleting them, and so on. " +
                    "A role sees a screen in its sidebar only if the view permission is ticked.",
            },
            {
                heading: "Data scope — the setting people miss",
                text:
                    "Above the grid is a data scope setting, and it is the most powerful control here. " +
                    "'All records' lets the role see everything. 'Their department' limits them to " +
                    "records belonging to their own department. 'Only their own' narrows it further, to " +
                    "records they created. This applies everywhere at once — lists, searches, reports " +
                    "and dashboard figures.",
            },
            {
                heading: "Changes take effect on next sign-in",
                text:
                    "Someone already signed in keeps their current permissions for up to a minute. Ask " +
                    "them to sign out and back in if you need a change to apply immediately.",
            },
            {
                heading: "Administrators are not affected",
                text:
                    "Administrator accounts bypass this screen entirely. Nothing you set here limits " +
                    "them.",
            },
        ],
    },
    {
        key: "dashboard-builder",
        title: "Dashboard Builder",
        path: "/dashboard-builder",
        source: "apps/admin/src/pages/Setup/DashboardBuilder.jsx",
        intro:
            "Build the cards that appear on dashboards, then choose which roles see which ones.",
        body: [
            {
                heading: "Building a card",
                text:
                    "Pick what you are measuring, then how to show it. A single figure is a stat tile; " +
                    "a split by category is a bar or pie chart; a change over time is a line chart. " +
                    "A preview updates as you go, so you can see what you are making before saving it.",
            },
            {
                heading: "Grouping and filtering",
                text:
                    "Grouping splits one figure into several — users by department, for instance. " +
                    "Filters narrow which records count at all, using the same conditions as the filter " +
                    "panel on any list screen.",
            },
            {
                heading: "Write the explanation",
                text:
                    "A stat tile has a description field. It is worth filling in: 'average failed " +
                    "attempts' could mean per user, per day or per session, and only you know which. " +
                    "What you write appears behind the information icon on the finished card.",
            },
            {
                heading: "Putting cards on a dashboard",
                text:
                    "A saved card does nothing until it is pinned to a role's dashboard. Cards can be " +
                    "dragged into position and resized, and each role gets its own arrangement.",
            },
        ],
    },
    {
        key: "audit-log",
        title: "Audit Log",
        path: "/audit-log",
        source: "apps/admin/src/pages/Master/AuditLog.jsx",
        intro:
            "A record of every change made in the panel — who changed what, when, and what the value " +
            "was before.",
        body: [
            {
                heading: "What is recorded",
                text:
                    "Creating, editing and deleting a record are all logged, along with the person who " +
                    "did it. Opening a screen or running a search is not — this is a record of changes, " +
                    "not of activity.",
            },
            {
                heading: "Seeing what actually changed",
                text:
                    "Opening an entry shows a field-by-field comparison: what each value was before and " +
                    "what it became. Only fields that actually changed are listed.",
            },
            {
                heading: "Passwords are never shown",
                text:
                    "Sensitive fields appear as 'hidden'. The log records that a password changed, never " +
                    "what it changed to.",
            },
            {
                heading: "Nothing here can be edited or removed",
                text:
                    "The log is read-only by design, for everyone including administrators. There is no " +
                    "delete button because a deletable audit trail is not an audit trail.",
            },
        ],
    },
    {
        key: "login-attempt-logs",
        title: "Login Attempt Logs",
        path: "/login-attempt-logs",
        source: "apps/admin/src/pages/Master/LoginAttemptLogs.jsx",
        intro:
            "Failed and successful sign-in attempts, and which accounts are currently locked.",
        body: [
            {
                heading: "Why an account locks",
                text:
                    "Repeated failed sign-ins lock an account temporarily. This is what stops someone " +
                    "guessing passwords, and it clears on its own after a short wait.",
            },
            {
                heading: "Helping someone locked out",
                text:
                    "Find their email in this list to confirm the lock, and check the attempt count. A " +
                    "handful of failures is usually a forgotten password; a large number from an " +
                    "unfamiliar address is worth investigating.",
            },
        ],
    },
    {
        key: "seo-settings",
        title: "SEO Settings",
        path: "/seo-settings",
        source: "apps/admin/src/pages/Setup/SeoSettings.jsx",
        intro:
            "Site-wide defaults for how your website appears in search results — used by any page that " +
            "does not set its own.",
        body: [
            {
                heading: "Defaults, not overrides",
                text:
                    "Anything set on an individual page wins. What you put here fills the gaps, so a " +
                    "page nobody has written a description for still has a sensible one.",
            },
            {
                heading: "Templates",
                text:
                    "The title template controls how page titles are assembled — typically the page name " +
                    "followed by your site name. Set it once here rather than repeating the site name on " +
                    "every page.",
            },
        ],
    },
    {
        key: "payroll-settings",
        title: "Payroll Settings",
        path: "/payroll-settings",
        source: "apps/admin/src/pages/Payroll/PayrollSettings.jsx",
        intro:
            "One shared set of rules every Salary Slip's payment-days calculation reads — how attendance is " +
            "sourced, how an unmarked day counts, and how a half day is weighted.",
        body: [
            {
                heading: "One row for the whole company",
                text:
                    "There is only one Payroll Settings record — it applies to every Salary Slip created " +
                    "afterward, not per-company. The first time this page is opened it is created automatically " +
                    "with sensible defaults.",
            },
            {
                heading: "Payroll Based On",
                text:
                    "Choose whether unpaid leave is read from Attendance records or from Leave Applications " +
                    "directly. Attendance is the more complete signal (it also knows about unmarked days and half " +
                    "days); Leave Application is simpler if attendance isn't tracked day-by-day.",
            },
            {
                heading: "Changes only affect new Salary Slips",
                text:
                    "A Salary Slip is a snapshot taken at creation time — changing a setting here never rewrites " +
                    "one already created.",
            },
        ],
    },
    {
        key: "seo-404",
        title: "404 Log",
        path: "/seo-404",
        source: "apps/admin/src/pages/Setup/SeoNotFoundLog.jsx",
        intro:
            "Addresses visitors asked for on your website that do not exist, and how often.",
        body: [
            {
                heading: "What to do with it",
                text:
                    "A frequently requested missing address usually means a page moved and something " +
                    "still links to the old location. Turn it into a redirect straight from this screen.",
            },
            {
                heading: "Not everything needs fixing",
                text:
                    "Some entries are automated scanning or mistyped addresses nobody will ever visit " +
                    "again. Sort by how often each was requested and work down from the top.",
            },
        ],
    },
    {
        key: "leave-ledger-entry",
        title: "Leave Ledger",
        path: "/leave-ledger-entry",
        source: "apps/admin/src/pages/Leaves/LeaveLedgerEntries.jsx",
        intro:
            "Every leave balance movement — allocation, adjustment, and (once built) leave " +
            "application and encashment — as a single append-only list.",
        body: [
            {
                heading: "The balance is always the sum of this table",
                text:
                    "An employee's real leave balance for a leave type is never stored as one number " +
                    "anywhere — it is always the sum of every row here for that employee and leave " +
                    "type. A cached total shown on a Leave Allocation is a snapshot for display, not " +
                    "the source of truth.",
            },
            {
                heading: "What creates a row",
                text:
                    "Granting a Leave Policy Assignment's allocations writes one row per leave type " +
                    "(plus a second, carry-forward row when there are unused leaves brought forward). " +
                    "Adjusting a Leave Allocation writes one signed delta row. Every future " +
                    "balance-affecting action in this module writes here the same way.",
            },
            {
                heading: "Nothing here can be edited or removed",
                text:
                    "Like the Audit Log, this is read-only for everyone, including administrators — " +
                    "there is no add, edit or delete button, because an editable ledger is not a ledger.",
            },
        ],
    },
    {
        key: "leave-control-panel",
        title: "Leave Control Panel",
        path: "/leave-control-panel",
        source: "apps/admin/src/pages/Leaves/LeaveControlPanel.jsx",
        intro:
            "Assign a Leave Policy to many employees at once, and optionally grant the resulting " +
            "leave allocations in the same step.",
        body: [
            {
                heading: "Two buttons, two outcomes",
                text:
                    "\"Assign Policy Only\" creates the Leave Policy Assignment records and stops there — " +
                    "nobody has any leave yet. \"Assign + Grant Allocations\" does that and immediately " +
                    "runs the allocation step too, the same as opening each assignment afterward and " +
                    "clicking Grant Allocations by hand.",
            },
            {
                heading: "One failure doesn't stop the rest",
                text:
                    "Each selected employee is processed on its own. If one already has an overlapping " +
                    "assignment, or something else about them is wrong, only that row shows Failed — " +
                    "everyone else still goes through. The results table after a run shows exactly who " +
                    "succeeded and who didn't, and why.",
            },
            {
                heading: "Nothing is saved here",
                text:
                    "This page holds no records of its own — it is a form that dispatches individual " +
                    "Leave Policy Assignment (and, on the fuller path, Leave Allocation) records per " +
                    "employee. Refreshing the page clears your selection.",
            },
        ],
    },
    {
        key: "shift-assignment-tool",
        title: "Shift Assignment Tool",
        path: "/shift-assignment-tool",
        source: "apps/admin/src/pages/ShiftAttendance/ShiftAssignmentTool.jsx",
        intro:
            "Assign a shift, or a repeating shift schedule, to many employees at once — or bulk-approve/reject " +
            "open Shift Requests.",
        body: [
            {
                heading: "Three actions, one page",
                text:
                    "Pick an action at the top: \"Assign Shift\" gives every selected employee the same Shift Type " +
                    "over the same date range. \"Assign Shift Schedule\" does the same for a repeating Shift " +
                    "Schedule, and immediately generates the first batch of Shift Assignments from it — the same " +
                    "generation a Shift Schedule Assignment's own Generate button runs. \"Process Shift Requests\" " +
                    "applies one decision (Approve or Reject) to every open request you select.",
            },
            {
                heading: "One failure doesn't stop the rest",
                text:
                    "Each employee (or request) is processed on its own. If one already has an overlapping shift, " +
                    "or something else about them is wrong, only that row shows Failed — everyone else still goes " +
                    "through. The results table after a run shows exactly who succeeded and who didn't, and why.",
            },
            {
                heading: "Nothing is saved here",
                text:
                    "This page holds no records of its own — it dispatches individual Shift Assignment, Shift " +
                    "Schedule Assignment, or Shift Request approve/reject actions per employee or request. " +
                    "Refreshing the page clears your selection.",
            },
        ],
    },
    {
        key: "employee-attendance-tool",
        title: "Employee Attendance Tool",
        path: "/employee-attendance-tool",
        source: "apps/admin/src/pages/ShiftAttendance/EmployeeAttendanceTool.jsx",
        intro:
            "Bulk-mark Attendance for many employees on one date, and resolve a pending Half Day record's status " +
            "for the other half of the day.",
        body: [
            {
                heading: "Mark Attendance",
                text:
                    "Choose a date, a status, and the employees to mark — each gets its own Attendance record for " +
                    "that date. One employee's failure never blocks the rest.",
            },
            {
                heading: "Resolve Half Day",
                text:
                    "Pick a date to see every Half Day Attendance record still pending a decision for its other " +
                    "half, choose one, and set whether that half counts as Present or Absent. This updates the " +
                    "record directly rather than going through Attendance's own save — the same shortcut this " +
                    "screen's real-world counterpart uses.",
            },
            {
                heading: "HR Manager only",
                text: "Unlike most Shift & Attendance screens, this one is restricted to the HR Manager role.",
            },
        ],
    },
    {
        key: "bulk-salary-structure-assignment",
        title: "Bulk Salary Structure Assignment",
        path: "/bulk-salary-structure-assignment",
        source: "apps/admin/src/pages/Payroll/BulkSalaryStructureAssignmentTool.jsx",
        intro:
            "Find employees eligible for a From Date, then assign the same Salary Structure to as many as you " +
            "select at once.",
        body: [
            {
                heading: "Two steps: find, then assign",
                text:
                    "Choose a From Date (and optionally narrow by Company, Department, Grade or Employment Type) and " +
                    "click \"Find Eligible Employees\". The list only shows active employees who don't already have " +
                    "an assignment for that exact date — everyone else is silently excluded, not shown as an error. " +
                    "Pick a Salary Structure and an optional Base/Variable, then assign.",
            },
            {
                heading: "One failure doesn't stop the rest",
                text:
                    "Each selected employee is processed on its own. If one turns out to already have a conflicting " +
                    "assignment (a race between the search and the assign step), only that row shows Failed — " +
                    "everyone else still goes through. The results table after a run shows exactly who succeeded and " +
                    "who didn't, and why.",
            },
            {
                heading: "Nothing is saved here",
                text:
                    "This page holds no records of its own — it dispatches individual Salary Structure Assignment " +
                    "creations per employee. Refreshing the page clears your search and selection.",
            },
        ],
    },
];

export const ALL_SCREENS = [...CONFIG_SCREENS, ...CUSTOM_SCREENS];
