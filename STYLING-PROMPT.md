# Styling prompt: S6 Migration Console look and feel

Use this document as a **full prompt** for an AI (or developer) to reproduce the exact look and feel of this app. Copy the entire "Prompt to give to an AI" section and paste it when asking for UI work, new pages, or styling consistency.

---

## Prompt to give to an AI

```
You are styling a web app to match the "S6 Migration Console" design system. Apply the following exactly so the result has the same look and feel.

---

### 1. Tech stack and UI foundation

- **Framework**: Next.js (App Router), React.
- **Styling**: Tailwind CSS v4. Use `@import "tailwindcss"` and `@import "tw-animate-css"` in global CSS.
- **Component library**: shadcn/ui, **New York** style, **neutral** base color, **CSS variables** (no hardcoded grays). Use the CLI with: `npx shadcn@latest add <component>`.
- **Theme switching**: `next-themes` with `attribute="class"`, `defaultTheme="dark"`, `enableSystem={false}`, `disableTransitionOnChange`. The effective theme is toggled by adding/removing the class `dark` on the root (e.g. `<html>`).
- **Icons**: Lucide React only. Use consistent sizes: `h-4 w-4` for buttons and nav, `h-3 w-3` inside badges and small UI.
- **Custom variant for dark mode**: In CSS, define `@custom-variant dark (&:is(.dark *));` so dark styles apply under `.dark` ancestors.

---

### 2. CSS variables and theme (exact values)

All semantic colors are CSS variables. Use **OKLCH** for light and dark. Map them into Tailwind via `@theme inline { ... }` so that `bg-background`, `text-foreground`, `border-border`, `bg-card`, etc. work.

**Base (used by components):**
- `--radius: 0.5rem` (base radius).
- Radius scale: `--radius-sm: calc(var(--radius) - 4px)`, `--radius-md: calc(var(--radius) - 2px)`, `--radius-lg: var(--radius)`, then +4px, +8px, +12px, +16px for xl, 2xl, 3xl, 4xl.
- Fonts: `--font-geist-sans: ui-sans-serif, system-ui, "Segoe UI", Roboto, sans-serif`; `--font-geist-mono: ui-monospace, "Cascadia Code", "Source Code Pro", monospace`.

**Light mode (`:root`):**
- Background: `--background: oklch(0.97 0 0)`; foreground: `--foreground: oklch(0.12 0 0)`.
- Card: `--card: oklch(1 0 0)`; `--card-foreground: oklch(0.12 0 0)`.
- Popover: same as card for fill and text.
- Primary: `--primary: oklch(0.12 0 0)`; `--primary-foreground: oklch(0.99 0 0)`.
- Secondary: `--secondary: oklch(0.96 0 0)`; `--secondary-foreground: oklch(0.2 0 0)`.
- Muted: `--muted: oklch(0.96 0 0)`; `--muted-foreground: oklch(0.45 0 0)`.
- Accent: `--accent: oklch(0.94 0 0)`; `--accent-foreground: oklch(0.12 0 0)`.
- Destructive: `--destructive: oklch(0.35 0 0)`.
- Border/input/ring: `--border: oklch(0.9 0 0)`; `--input: oklch(0.9 0 0)`; `--ring: oklch(0.4 0 0)`.
- Sidebar: `--sidebar: oklch(0.985 0 0)`; `--sidebar-foreground: oklch(0.145 0 0)`; `--sidebar-primary: oklch(0.205 0 0)`; `--sidebar-primary-foreground: oklch(0.985 0 0)`; `--sidebar-accent: oklch(0.97 0 0)`; `--sidebar-accent-foreground: oklch(0.205 0 0)`; `--sidebar-border: oklch(0.922 0 0)`; `--sidebar-ring: oklch(0.708 0 0)`.
- Chart colors: use 5 distinct oklch values for data viz (optional; only if charts exist).

**Dark mode (`.dark`):**
- Background: `--background: oklch(0.11 0 0)`; foreground: `--foreground: oklch(0.97 0 0)`.
- Card: `--card: oklch(0.14 0 0)`; `--card-foreground: oklch(0.97 0 0)`.
- Primary: `--primary: oklch(0.97 0 0)`; `--primary-foreground: oklch(0.11 0 0)`.
- Secondary: `--secondary: oklch(0.2 0 0)`; `--secondary-foreground: oklch(0.97 0 0)`.
- Muted: `--muted: oklch(0.2 0 0)`; `--muted-foreground: oklch(0.65 0 0)`.
- Accent: `--accent: oklch(0.22 0 0)`; `--accent-foreground: oklch(0.97 0 0)`.
- Destructive: `--destructive: oklch(0.55 0 0)`.
- Border/input/ring: `--border: oklch(0.28 0 0)`; `--input: oklch(0.28 0 0)`; `--ring: oklch(0.5 0 0)`.
- Sidebar: `--sidebar: oklch(0.205 0 0)`; `--sidebar-foreground: oklch(0.985 0 0)`; `--sidebar-primary: oklch(0.488 0.243 264.376)`; `--sidebar-primary-foreground: oklch(0.985 0 0)`; `--sidebar-accent: oklch(0.269 0 0)`; `--sidebar-accent-foreground: oklch(0.985 0 0)`; `--sidebar-border: oklch(1 0 0 / 10%)`; `--sidebar-ring: oklch(0.556 0 0)`.

**Base layer:** Apply to all elements: `border-border`, `outline-ring/50`. Body: `bg-background text-foreground`. Root layout body: also `antialiased font-sans`.

---

### 3. Layout structure

- **Root**: Flex row, full height. `<aside>` (sidebar) + `<main className="flex-1 overflow-auto">` (content).
- **Sidebar**: Fixed width `w-56` (14rem), flex column, `border-r border-border`, `bg-card`. Top bar: `h-14`, `border-b border-border`, `px-4`, flex with `items-center gap-2`. Logo and theme toggle live here. Nav: `flex-1 flex-col gap-0.5 p-2`. Footer: separator then small text in `p-2 text-xs text-muted-foreground`.
- **Main content**: No fixed header. Content area only. Use `p-6 md:p-8` for page padding.

---

### 4. Typography and page headings

- **Page title**: `text-2xl font-semibold tracking-tight text-foreground`. One per page.
- **Page description**: Directly under title, `mt-1 text-muted-foreground`. Can be `text-sm` where it’s secondary.
- **Card titles**: Use CardTitle (semibold); when used as a label above content, pair with `CardDescription` (`text-muted-foreground text-sm`).
- **Small labels / captions**: `text-xs` with `text-muted-foreground` or `uppercase tracking-wide text-muted-foreground` for section labels.
- **Monospace**: Policy numbers, IDs, code: `font-mono text-sm`.
- **Body**: Default is `font-sans` from the theme.

---

### 5. Components and patterns

**Cards**
- Always: `border border-border bg-card`. Use shadcn Card: `rounded-xl`, `shadow-sm`, `py-6`, gap-6 between header and content. CardHeader: `px-6`, gap-2. CardTitle: semibold. CardDescription: `text-muted-foreground text-sm`. CardContent: `px-6`.
- Explicitly add `className="border-border bg-card"` on Card when using in this app so borders and background respect theme.

**Buttons**
- Use shadcn Button with variants: `default` (primary), `secondary`, `outline`, `ghost`, `destructive`, `link`. Sizes: `default`, `sm`, `lg`, `icon`, `icon-sm`, `icon-xs`, `icon-lg`.
- Primary actions: `variant="default"`. Secondary actions: `variant="outline"`. Nav items and low emphasis: `variant="ghost"`. Destructive actions: `variant="destructive"`.
- In sidebar nav: active = `variant="secondary"` (or ghost with `bg-muted text-foreground`), inactive = `variant="ghost"`. `justify-start`, icon `mr-2 h-4 w-4`.
- Theme toggle: ghost icon button, `size="icon-sm"`, Sun/Moon icons that swap with scale on theme change.

**Badges**
- Status: use `variant="default"` for in-progress/primary, `secondary` for completed/migrated, `destructive` for failed/errors, `outline` for pending/neutral. Add `className="gap-1 font-normal"` and optional small icon (e.g. `h-3 w-3`) inside. For “Verified” success state use `variant="secondary"` with `text-green-600 border-green-600/30`.

**Tables**
- Use shadcn Table. TableRow: `border-border`. Header row: `hover:bg-transparent`. Header cells: `text-muted-foreground`. Body rows: `border-border`; optional `hover:bg-muted/50` for clickable rows. Expandable rows: expanded content row can use `bg-muted/20` or `bg-muted/5`.

**Forms**
- Input: use shadcn Input; add `bg-background` when inside a card so it doesn’t look flat. Label: shadcn Label, often with `space-y-2` wrapper. Select: shadcn Select (trigger, content, item). Use `border-border` and theme-aware backgrounds.
- Search input with icon: wrap in relative div, icon `absolute left-2 top-2.5 h-4 w-4 text-muted-foreground`, input `pl-8`.

**Tabs (custom pills)**
- Not the shadcn Tabs component: a row of buttons, `rounded-md px-2.5 py-1 text-xs font-medium`. Active: `bg-primary text-primary-foreground`. Inactive: `bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground`. Gap between pills: `gap-1` or `flex-wrap gap-1`.

**Step indicator**
- Horizontal steps: buttons or divs, `rounded-md px-2 py-1 text-sm font-medium`. Current: `bg-primary text-primary-foreground`. Past: `bg-muted text-muted-foreground hover:bg-muted/80`. Future: `text-muted-foreground hover:text-foreground`. Optional chevron between steps: `h-4 w-4 text-muted-foreground`.

**Collapsible**
- Use shadcn Collapsible. Trigger row: `flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/50 rounded-t-lg`, chevron `h-4 w-4 shrink-0 text-muted-foreground`. Content: `border-t border-border px-4 py-3`.

**Logo**
- SVG logo in sidebar: wrap in a span with `text-foreground` so `currentColor` in the SVG follows theme. SVG: `h-4 w-auto shrink-0`, all paths `fill="currentColor"` so it inverts correctly in dark mode.

---

### 6. Spacing and grid

- Page padding: `p-6 md:p-8`.
- Between page title block and content: `mb-6` or `mb-8`.
- Dashboard stat cards: `grid gap-4 sm:grid-cols-2 lg:grid-cols-4`.
- Two-column content (e.g. controls + quick actions): `grid gap-4 lg:grid-cols-[2fr,1.5fr]`.
- Card internal spacing: use CardHeader/CardContent padding; between form fields `space-y-4` or `gap-4`; between buttons in a group `gap-2` or `gap-3`.

---

### 7. Semantic and state colors

- **Success / connected**: `text-green-500` or `text-green-600` (and for badges, `border-green-600/30`).
- **Error / disconnected**: `text-red-400` or `text-red-500`; error messages: `text-xs text-red-400`.
- **Muted text**: always `text-muted-foreground`, never raw gray classes for body or descriptions.
- **Borders**: always `border-border` so they adapt to theme.
- **Backgrounds**: Prefer `bg-background`, `bg-card`, `bg-muted`, `bg-muted/20`, `bg-muted/50`; avoid arbitrary grays.

---

### 8. Motion and focus

- Prefer minimal motion. Theme toggle can use `transition-transform duration-150` for icon swap (scale-0/scale-100).
- Focus: use `focus-visible:ring-ring/50` and `focus-visible:ring-[3px]` (or equivalent) so focus rings use the theme ring color. Outline: `outline-ring/50`.

---

### 9. What to avoid

- Do not use raw Tailwind grays (e.g. gray-500) for UI; use semantic tokens (muted-foreground, border, etc.).
- Do not enable system theme detection; theme is manual light/dark only.
- Do not add transition on theme change (disableTransitionOnChange).
- Do not use a different radius system; keep base 0.5rem and the defined scale.
- Keep sidebar width at 14rem (w-56); do not make it collapsible unless explicitly requested.
- Keep New York + neutral + CSS variables for shadcn; do not switch to another style or base color.

---

When you add or change pages, components, or styles, follow the above so the app keeps a single, consistent look and feel in both light and dark mode.
```

---

## Quick reference (for humans)

| Element            | Classes / token usage |
|--------------------|------------------------|
| Page container     | `p-6 md:p-8` |
| Page title         | `text-2xl font-semibold tracking-tight text-foreground` |
| Page description   | `mt-1 text-muted-foreground` |
| Card               | `border-border bg-card` + shadcn Card (rounded-xl, shadow-sm) |
| Sidebar            | `w-56 border-r border-border bg-card` |
| Nav button active  | `variant="secondary"` or ghost + `bg-muted text-foreground` |
| Nav button default | `variant="ghost"`, icon `mr-2 h-4 w-4` |
| Table header       | `TableRow` with `border-border hover:bg-transparent`, `TableHead` with `text-muted-foreground` |
| Pill tab active    | `bg-primary text-primary-foreground` |
| Pill tab inactive  | `bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground` |
| Logo               | SVG with `fill="currentColor"` inside `text-foreground` wrapper |
| Error text         | `text-xs text-red-400` |
| Success / live     | `text-green-500` or badge `text-green-600 border-green-600/30` |

---

*Last updated from the codebase to match the current S6 Migration Console styling.*
