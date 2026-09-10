# Team

Who is on this project. **An agent reads this to work out whose agent it is** — match
`git config user.email` to a row, and act as that person.

Deliberately small and slow-changing, so it rarely conflicts. Everything that changes daily — who is
doing what right now — lives in GitHub Issues, not here.

Set up by the `team-setup` skill.

| Name | GitHub handle | git email | Focus | Notes |
|---|---|---|---|---|
| _not set up yet_ | | | | |

- **git email** — exactly what `git config user.email` returns in that person's clone. This is the
  lookup key; if it is wrong, their agent cannot identify them.
- **Focus** — the area they usually own. A hint for dividing work, not a hard boundary.
- **Notes** — anything an agent should know: timezone, "reviews all schema changes", "part-time
  Thursdays".

If your email is not in this table, **stop and ask** rather than guessing. Guessing means work gets
assigned to the wrong person and two people build the same thing.

## Working agreements

Filled in during `team-setup`. Things the team decided that no convention doc can know.

| Question | This team's answer |
|---|---|
| Who merges into `development`? | |
| Who promotes to `staging` / `production`? | |
| Does every PR need a review before merge? | |
| How are shared foundations agreed before parallel work starts? | |
| Where does the team talk (Slack, etc.)? | |
