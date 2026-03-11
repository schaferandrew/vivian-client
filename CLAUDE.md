# Vivian Client

Next.js PWA for the Vivian household assistant.

## Development

```bash
npm run dev      # dev server
npm run build    # production build
npm run test     # run tests
npm run lint     # eslint
```

## Permissions

```json
{
  "permissions": {
    "allow": [
      "Bash(gh issue create:*)",
      "Bash(gh issue list:*)",
      "Bash(gh pr create:*)"
    ]
  }
}
```

---

## Shared Rules

### GitHub Issue Feature Workflow

When implementing a new feature, especially work that originates from a GitHub issue:

- Create and use a dedicated branch before making changes.
- Name the branch so it is clearly tied to the issue and feature.
- Prefer branch format: `<agent-or-developer-name>-<issue-number>-<short-feature-slug>` (example: `codex-123-google-integration`)
- Do not implement feature work directly on long-lived branches (`main`, `master`).
- After implementation, **always ask the user for approval before committing and opening a PR**.
- In the PR description, include a closing keyword with the issue number so GitHub auto-closes it on merge:
  - `Closes #<issue-number>` or `Fixes #<issue-number>`.
- If no issue exists yet, create/link one before merge when the work is feature-sized.

### GitHub Issue Management

When creating GitHub issues, use the `gh` CLI:

```bash
gh issue create --title "Issue Title" --body-file /path/to/body.md --label "enhancement"
# Or inline:
gh issue create --title "Issue Title" --body "Issue description here"
```

Issue body structure for features: **Problem**, **Proposed Solution**, **Implementation Considerations**, **Benefits**.
Issue body structure for bugs: **Describe the bug**, **To Reproduce**, **Expected behavior**, **Additional context**.

Check available labels with: `gh label list`

### UI Component-First Rule

When implementing or editing frontend UI:

- Prefer existing shared components in `components/ui` and feature-level reusable components before adding new one-off JSX.
- Use design-system semantic tokens (`bg-background`, `text-foreground`, `border-border`, etc.) instead of direct color values.
- Keep components accessible by default: native semantics, labels/`aria-label` for icon-only controls, keyboard and focus-visible behavior.
- Support both light and dark mode — use semantic Tailwind tokens; do not hardcode light-only colors.

### Debugging: Check Logs First

When investigating errors, always check logs across the full stack first.

```bash
# Backend API (Docker)
docker logs vivian-backend-api-1 --since 5m
docker logs vivian-backend-api-1 2>&1 | grep -B5 -A10 "Error\|Traceback\|500\|exception"

# PostgreSQL
docker logs vivian-backend-postgres-1 --since 5m
```

For Next.js frontend: check the browser developer console (client-side errors) and the terminal where `next dev` is running (server-side/proxy errors).

Common pitfalls: Next.js caching (use `cache: "no-store"` for dynamic data), stale containers after code changes.

---

## Settings Routing

Settings pages use **path-based routing**:

| Section | Path |
|---------|------|
| Profile | `/settings/profile` |
| Home | `/settings/home` |
| Account Connections | `/settings/connections` |
| MCP | `/settings/mcp` |
| API Keys | `/settings/api-keys` |
| Connected Apps | `/settings/connected-apps` |

Do not use query-string routing (`/settings?section=...`) for settings navigation.

---

## Code Review Policy

**Always ask the user for approval before committing or opening a PR.** Do not commit or push without explicit approval.

Before committing, check the current branch:
- If on `main` (or `master`): pull latest (`git pull`) then create a new feature branch. Never commit directly to main.
- If on a feature branch whose name doesn't match the current task: ask the user which branch to use before proceeding.
- Do not reuse an existing feature branch for unrelated work.
