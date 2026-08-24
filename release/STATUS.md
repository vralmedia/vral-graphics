# Release portal — 2026-08-24 wave 3

Authenticated Lovable project `0c4c6418-ebcd-4d69-a801-e39aaaccb18a` was opened in Ego Lite.

## Tried

1. Opened the project. Preview still served old copy (`Printing for Less.`, WhatsApp `591 1017`, Lovable SHA `1e8f1636`). Proof: `checkpoint-proofs/release-portal/01-project-open.png`
2. GitHub settings showed this project linked to the **wrong** repo: `vralmedia/vral-glimpse` (Connected, branch main). Proof: `15-github-settings.png`
3. Disconnected `vral-glimpse` after typing the confirm name. Proof: `19-disconnected.png` / dialog `17-after-disconnect-click.png`
4. Connect GitHub for `vralmedia/vral-graphics`: UI is `/settings/git/github/create`. Exact text: **Available installations — No installations available**. Proof: `22-install-github-app.png` and `30-refresh-installs.png` after Refresh.
5. Add account opened GitHub OAuth. The lovable.dev GitHub App is already installed on the `vralmedia` personal account with **All repositories**. Save was disabled (no change). Proof: `27-github-app-install-scroll.png`
6. Lovable Refresh still shows **No installations available**. OAuth callback without the original state returned **Error — Invalid request. Please try again.** Proof: `25-github-oauth.png`
7. Chat sync of `c365d2b` was misread as a visual edit: **No changes made: the old and new display text are identical.** Proof: `12-lovable-working.png`
8. Production URL after attempts still old. Not published.

Direction GitHub → Lovable was respected: GitHub `main` / `c365d2b` was not overwritten with Lovable files.

Lovable↔`vralmedia/vral-graphics`: **BLOCKED** (wrong repo was disconnected; GitHub App install does not appear inside this Lovable workspace).
