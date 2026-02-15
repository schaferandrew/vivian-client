# AGENTS.md

## UI Theme Rule (Required)

All new or updated UI must support both light and dark mode.

### Implementation requirements

- Prefer semantic Tailwind tokens:
  - `bg-background`, `text-foreground`, `border-border`, `bg-card`, `text-muted-foreground`, etc.
- When using palette tokens (`--primary-*`, `--success-*`, `--warning-*`, `--error-*`, `--brand-*`, `--neutral-*`), include dark equivalents where needed with `dark:` classes.
- Do not introduce hardcoded light-only colors (for example `bg-white`, `text-gray-800`, hex-only gradients without dark variants).
- Interactive states (hover, selected, active, disabled, alert/success banners, badges) must be dark-aware.

### Theme behavior in this repo

- Dark mode is class-based (`darkMode: ["class"]` in `tailwind.config.js`).
- Theme is activated by toggling `.dark` on `document.documentElement`.
- User preference values are `light | dark | system` and currently persist in local storage (`vivian-theme-preference`).

### PR checklist for UI changes

- Verify page/component in light mode.
- Verify page/component in dark mode.
- Verify contrast/readability for text, badges, alerts, cards, borders, and focus/hover states.
- If new color usage is added, ensure dark variant is provided.

## Branch Sync Rule (Required)

- Before closing work, ensure local branch changes are committed and pushed to `origin`.
- If a PR exists for the branch, push updates so the PR reflects the latest state.

## Git Workflow Rule (Required)

- NEVER force push to main (`git push --force` or `git push -f` to main/master).
- Always create a feature branch for changes (e.g., `fix/...`, `feat/...`).
- Use proper workflow: `git checkout -b <branch>`, make changes, `git add`, `git commit`, `git push -u origin <branch>`, then create a PR via `gh pr create`.
- Only push directly to `main` if explicitly requested by the user.
