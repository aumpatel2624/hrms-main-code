# Deployment conventions

How code gets from a laptop onto a server. Read this before you SSH anywhere.

## The one rule

**Never edit code on a production server.** Not a one-line fix, not a config tweak, not "just to test
whether this is the problem". Every change is made locally, tested locally, committed, merged, and
only then pulled onto the server.

This is not bureaucracy. A file edited over SSH exists in exactly one place, is in nobody's git
history, survives until the next `git pull` silently reverts it, and cannot be reviewed. The next
person to deploy — or the next agent — has no way to know it happened. A server running code that
is not in the repository is a server nobody can reason about.

The same rule covers anything that changes behaviour: `server.js`, a model, a controller, a built
asset. Editing files under `apps/server/out/` is doubly wrong — the next build overwrites them.

**The only exception is an explicit instruction from the user for that specific change.** "Patch it
on the server so I can see it now" is a decision they are allowed to make. If they do, say plainly
that the server is now ahead of the repository, and reconcile it as soon as the fix is merged.

## The deployment pipeline

Local change → test → `git-flow` → merge → pull on the server → rebuild → restart.

```bash
# --- locally -------------------------------------------------------------
npm test                  # and npm run build if the admin app changed
# run the `git-flow` skill: branch, commit, push, PR, merge

# --- on the server -------------------------------------------------------
ssh <user>@<host>
cd <app directory>
git pull --ff-only origin main    # never a merge commit on a server
npm ci                            # only if package-lock.json changed
npm run build                     # only if apps/admin or shared changed
pm2 restart <app> --update-env    # --update-env or .env changes are ignored
```

Then **verify from outside**, not just `curl localhost` — the proxy, the certificate and the
same-origin assumptions are all part of what you changed.

## Continuous deployment (GitHub Actions)

`.github/workflows/deploy.yml` automates the pipeline above — it does not replace it. The `deploy`
job runs the identical `git pull --ff-only` → `npm ci` → `npm run build` → `pm2 restart --update-env`
sequence over SSH, so the manual runbook above is still exactly correct if the pipeline is ever down
or an agent needs to deploy something by hand.

**What triggers what:**

- Every push and every PR into `main` runs the `test` job: `npm ci`, `npm test`, `npm run build`.
  This is the CI gate — it never touches the server.
- The `deploy` job runs only after `test` passes, and only on a push to `main` — which in practice
  means a human merged a PR. Nothing an agent does triggers a deploy by itself; merging is still a
  human decision, per `AGENTS.md`.
- `workflow_dispatch` lets a human re-run a deploy with no new commit (e.g. after fixing a secret).

**One-time setup, VPS side** — generate a dedicated keypair for CI (never reuse a person's own SSH
key): `ssh-keygen -t ed25519 -C "github-actions-deploy" -f ./ci-deploy-key -N ""`. Append
`ci-deploy-key.pub` to the deploy user's `~/.ssh/authorized_keys` on the VPS. That user must already
be able to `git pull` the repo and run `pm2 restart` without `sudo` — the same access the manual
runbook already assumes.

**One-time setup, GitHub side** — add these as repository secrets (Settings → Secrets and
variables → Actions), and create a `production` environment (Settings → Environments) so the
`deploy` job can optionally require a reviewer before it runs:

| Secret | Value |
|---|---|
| `SSH_HOST` | the VPS hostname or IP |
| `SSH_PORT` | usually `22`, unless the VPS uses a non-default port |
| `SSH_USER` | the deploy user, e.g. `deployer` |
| `SSH_PRIVATE_KEY` | the private half of the CI keypair generated above |
| `APP_DIR` | absolute path of this app's checkout on the VPS |
| `PM2_APP_NAME` | the exact `pm2` process name for this app |

**Namespacing still applies.** On a host running more than one app, each app's repository gets its
own copy of this workflow and its own secrets, pointed at its own directory and its own PM2 process
name — never share a deploy key or an `APP_DIR` between two projects.

**Rollback.** The workflow does not roll back automatically. If a bad deploy reaches the server:
`git log` on the server to find the last good commit, `git checkout <sha> -- .` is wrong (detaches
the tree); instead revert the bad commit locally, push, merge, and let the pipeline redeploy — or, for
an emergency, SSH in and run the manual steps against a specific known-good commit. Never patch the
bad state in place; that is exactly what `70-deployment.md`'s one rule exists to prevent.

### What each step is for

- **`--ff-only`** — a server should never author a merge commit. If it refuses, the checkout has
  drifted; find out why rather than forcing it.
- **`npm ci`, not `npm install`** — installs exactly the lockfile. `npm install` can quietly resolve
  a different tree on the server than the one you tested.
- **`npm run build`** — the admin SPA is compiled into `apps/server/out/admin` and served by the
  Node process. A pull that changes frontend code and skips the build changes nothing the user sees.
- **`--update-env`** — PM2 caches the environment from when the process started. Without this flag a
  changed `.env` has no effect, which is a genuinely confusing hour to lose.

## Things this starter needs in production

Both were found the hard way; both are silent failures with no error to search for.

| Setting | Why | Symptom when missing |
|---|---|---|
| `app.set("trust proxy", 1)` | Behind nginx, Express sees plain HTTP, so `req.secure` is false and express-session refuses to send a `secure` cookie | Login returns 200, no `Set-Cookie`, user bounces back to the login page |
| `ALLOWED_ORIGINS=https://<host>` | Browsers send an `Origin` header on stylesheet requests; the allowlist defaults to localhost only | Blank white page — the JS loads, the CSS is blocked by CORS |

`trust proxy` is set to `1`, never `true`: `true` trusts any `X-Forwarded-For` the client sends,
which lets the rate limiter and the audit trail be fed a spoofed IP.

## More than one app on a host

Namespace everything, or two deployments will fight over the same resources:

- its own directory — **never clone into a directory that already holds other projects**
- its own port
- its own database
- its own PM2 process name
- its own nginx site file

Before deploying, check what is already there: `ls` the target path, `pm2 list`, `ss -ltn`, and the
database list. A directory that already has contents is a signal to stop and ask, not to proceed.

## nginx and certificates

Install an **HTTP-only config first**, then let certbot add the TLS block. A config that references
a certificate which does not exist yet fails `nginx -t`, and on a host serving several sites a
failed reload is everyone's outage, not just yours.

Match the nginx version's syntax: `http2 on;` is 1.25+; older versions want `listen 443 ssl http2;`.
Check with `nginx -v` rather than assuming.

Always `sudo nginx -t` before `systemctl reload nginx`, and read the result. If the test fails,
nothing is reloaded and the running config is still good — that is the guardrail working.

## Secrets

Generate them **on the server**, never in a conversation or a commit:

```bash
openssl rand -hex 32          # session secret
```

`.env` is gitignored and belongs only on the machine that uses it. New variables go into
`.env.example` with a comment explaining what breaks without them — that file is the only place a
new deployment learns what it needs.

If the user asks you to generate a login credential for a demo, say once that it will appear in the
conversation and should be rotated. Never do it silently, and never for anything holding real data.

## Seed data

`npm run seed` is idempotent and safe on any environment: it creates the menu tree and the first
admin user, and never overwrites an existing admin's password.

Demo or sample data is a different thing and must never be wired into `npm run seed`. Keep it a
separate script, make it idempotent, and give it a way to remove exactly what it created. Nothing
that writes fictional records should ever run as a side effect of a normal deploy.
