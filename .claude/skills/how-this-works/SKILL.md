---
name: how-this-works
description: Explain how this starter works and which skill to use when, in plain language. Use when the user asks how this works, what can you do, what are the skills, how do I use this, where do I start, or seems unsure what the workflow is. Keep the answer short.
---

# How this works

Explain the workflow to a **non-engineer**, briefly. They asked because they are unsure — a wall of
text makes that worse.

**Rules for the answer:** under ~200 words. No jargon. Do not list all twelve skills. End by asking
what they want to do, and offer to start.

## Say roughly this

> **You never need to remember any of this — just tell me what you want and I'll pick the right step.**
>
> The idea is simple: **write it down before building it, then build one piece at a time.**
>
> 1. **Tell me what you're building.** Drop the client's documents in `docs/knowledge/input/` and
>    I'll read them, then ask you questions until it's clear. That becomes the project's written
>    record.
> 2. **I build one feature at a time** — database, then the API, then the screen, then I test it.
>    One finished thing beats three half-done ones.
> 3. **I keep notes as I go**, so if we stop for a month, I pick up exactly where we left off.
>
> Useful things to say to me:
> - *"What's next?"* — where we are and what I'd do next
> - *"Can we add...?"* — I'll tell you what it'd take and what it'd break, before we commit to it
> - *"Something's broken..."* — I'll reproduce it, fix the cause, and check it stays fixed
> - *"The client sent more requirements"* — put the file in `input/`; I'll spot it and ask only about
>   what's new
> - *"Add a new app/service"* — I'll wire it into the project properly
>
> What would you like to do?

Adapt it. If they asked something narrower ("what do I do when the client sends changes?"), answer
just that part rather than reciting the whole thing.

## If they want more

Only when they ask. Offer, do not deliver unprompted:

- **The full pipeline and every skill** → `AGENTS.md`
- **Where the project stands right now** → the `whats-next` skill
- **How the codebase is built** → `docs/conventions/`

## Check the state first

Glance at `docs/knowledge/STATE.md` before answering so the closing question is concrete. "Want me
to start by reading the brief you've put in `input/`?" is better than "what would you like to do?"

## Done when

- [ ] They know the shape: write it down → build one piece at a time → notes kept
- [ ] They know the few phrases that get them what they need
- [ ] It was short
- [ ] You ended with a concrete offer, based on the actual state of the project
