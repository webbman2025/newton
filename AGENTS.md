<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## UX / look and feel

For UI changes in `src/**/*.tsx` and `src/**/*.css`, follow the Cursor rule **UX designer agent** (`.cursor/rules/ux-design-agent.mdc`): hierarchy, accessibility, bilingual copy via `translations.ts`, MUI tokens, and mobile-safe layouts.

### Agentic UI on your command

You **do not need to open files first.** Run **`/ux-fix`** (optional scope: `/ux-fix footer`, `/ux-fix all`). Default behavior is a **UX audit** that suggests whether pages need fixes — see `.cursor/skills/ux-fix/SKILL.md` and `.cursor/commands/ux-fix.md`. Add **`apply`** or ask explicitly to implement changes (e.g. `/ux-fix footer apply`).
