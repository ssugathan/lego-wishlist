# Dev Environment Portability — Context for Later
> Parked May 2026. Resume when ready to move off laptop.

---

## The Goal

A persistent dev environment accessible from any device (iPad, phone, any browser) so Claude Code sessions aren't blocked by laptop availability. App hosting that's always-on independent of local machine.

---

## Recommended Stack

| Concern | Solution | Notes |
|---|---|---|
| App hosting | Vercel | Free, HTTPS, auto-deploy from GitHub. PWA works. Unblocks voice search (requires HTTPS). |
| Dev environment (now) | GitHub Codespaces | Browser-based VS Code + terminal. Claude Code runs in terminal. 60 free hrs/month. Opens from any device. |
| Dev environment (later) | Fly.io persistent container | Always-on dev box, SSH from anywhere, ~$3-5/mo. Use if Codespaces hourly billing becomes annoying. |
| Custom subdomain | `lego.sid-pm.com` → Vercel | Optional but clean for iPad home screen bookmark. |

---

## How Claude Code Context Travels

Claude Code is entirely file-based. Parity between laptop and Codespaces = right files in GitHub.

**Files that carry context:**
- `CLAUDE.md` in repo root — primary project context
- `SPEC.md` — app spec
- `.devcontainer/devcontainer.json` — environment definition
- `.env.example` — variable names only, no values

**Secrets never go in GitHub.** Set under:
`Repo Settings → Secrets and variables → Codespaces`
They inject as env vars on container start, same as local `.env`.

---

## Context Strategy: Per-Repo vs Global

**Now (Option A — simplest):**
Each repo has its own focused `CLAUDE.md`. `lego-wishlist/CLAUDE.md` has app context only. Already doing this correctly with pm-os.

**Later (Option B — scales better):**
Set up a dotfiles repo with `~/CLAUDE.md` containing global context (vibe coding defaults, professional background, preferences). Codespaces auto-clones dotfiles repos on container start. One edit propagates to all projects.

Dotfiles repo setup: `github.com/{username}/dotfiles` → Codespaces Settings → Dotfiles → point at repo.

---

## Files to Create When Ready

### `.devcontainer/devcontainer.json` (per repo)
```json
{
  "name": "lego-wishlist",
  "image": "mcr.microsoft.com/devcontainers/node:20",
  "postCreateCommand": "npm install",
  "forwardPorts": [5173],
  "secrets": [
    "VITE_NOTION_API_KEY",
    "VITE_NOTION_WISHLIST_DB_ID",
    "VITE_NOTION_INVENTORY_SETS_DB_ID",
    "VITE_NOTION_INVENTORY_MINIFIGS_DB_ID",
    "VITE_REBRICKABLE_API_KEY"
  ]
}
```

### `~/CLAUDE.md` (global dotfiles — Option B)
Contents: vibe coding defaults from `ai-pm-prep/CLAUDE.md` section 9a + professional snapshot. Keep it short — project-specific CLAUDE.md handles the rest.

---

## Action Items When Resuming

- [ ] Enable Codespaces on the `lego-wishlist` repo
- [ ] Add `.devcontainer/devcontainer.json` to repo
- [ ] Set Codespaces secrets in repo settings
- [ ] Deploy to Vercel, connect GitHub repo
- [ ] Optional: point `lego.sid-pm.com` subdomain at Vercel
- [ ] Optional: set up dotfiles repo for global Claude Code context

---

*Parked: May 2026. No action needed until ready to move off laptop.*
