---
name: Comic Scroller
description: A clean, intuitive, bright product UI for focused manga reading and local library management.
colors:
  ink: "#0F172A"
  ink-muted: "#64748B"
  ink-soft: "#334155"
  paper: "#FFFFFF"
  paper-soft: "#F8FAFC"
  paper-wash: "#EEF2F7"
  tab-wash: "#D8E8EB"
  border: "#D6DEE6"
  primary: "#2563EB"
  primary-hover: "#1D4ED8"
  danger-text: "#B91C1C"
  danger-bg: "#FEF2F2"
  danger-bg-hover: "#FEE2E2"
  success-bg: "#F0FDF4"
  cover-fallback: "#E2E8F0"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  panel: "22px"
  dialog: "24px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
  button-danger:
    backgroundColor: "{colors.danger-bg}"
    textColor: "{colors.danger-text}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "8px 14px"
  icon-button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.md}"
    height: "36px"
    width: "36px"
  panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  row-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  tab-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 20px"
---

# Design System: Comic Scroller

## 1. Overview

**Creative North Star: "Clear Reading Desk"**

Comic Scroller is a product interface for staying in a manga reading flow. The system should feel like a cleared desk beside the page: bright enough for quick orientation, quiet enough to disappear once reading starts, and structured enough that local data actions feel trustworthy.

The primary extension UI is restrained by design. Cool paper surfaces, slate text, and one blue accent support the PRODUCT.md personality: "乾淨、直觀、明亮." Decoration must never compete with comic pages, chapter navigation, or library decisions. The GitHub Pages site may be more expressive, but extension surfaces are the normative design source.

This system explicitly rejects cluttered, overly promotional, visually heavy, or decorative UI that competes with the comic pages themselves.

**Key Characteristics:**
- Restrained light product surfaces with one action blue.
- Compact, readable Inter-based hierarchy.
- Rounded but familiar controls, usually 8-24px.
- Low, ambient elevation and thin slate borders.
- Explicit destructive-action language and predictable state changes.

## 2. Colors

The palette is a cool paper system: pale blue-gray surfaces, slate text, and a single saturated blue for primary actions, active states, and focus.

### Primary
- **Reader Blue** (`primary`): Used for primary buttons, active chapter state, follow state, spinner stroke, and focus rings. It should stay rare and functional.
- **Reader Blue Hover** (`primary-hover`): Used only when a primary action needs a stronger hover state.

### Secondary
- **Delete Red** (`danger-text`): Used for destructive action text.
- **Soft Delete Wash** (`danger-bg`, `danger-bg-hover`): Used behind destructive buttons and error notices so destructive state is legible without becoming aggressive.
- **Success Wash** (`success-bg`): Used for success notices only.

### Neutral
- **Slate Ink** (`ink`): Main text and high-emphasis icons.
- **Muted Slate** (`ink-muted`, `ink-soft`): Secondary text, read chapter text, and lower-emphasis UI.
- **Paper White** (`paper`): Panels, rows, dialogs, and active tabs. This is a current implementation token; new work should avoid expanding raw white outside established surface roles.
- **Soft Paper** (`paper-soft`): Hover backgrounds, row softening, and loading surfaces.
- **Washed Paper** (`paper-wash`): Page background and reader canvas gradient.
- **Tab Wash** (`tab-wash`): Default tab rail background.
- **Hairline Border** (`border`): Manage content divider and heavier structural boundaries.
- **Cover Fallback** (`cover-fallback`): Placeholder image blocks and skeleton cover surfaces.

### Named Rules

**The One Blue Rule.** Reader Blue is for action, current selection, focus, and meaningful state. It is not decoration.

**The Paper Stack Rule.** Depth comes from moving between Washed Paper, Soft Paper, and Paper White before reaching for shadows.

**The Slate Legibility Rule.** Text below `ink/60` is metadata only. Anything required to complete a task must be at least the visual strength of `ink/60`.

## 3. Typography

**Display Font:** Inter with system fallbacks.  
**Body Font:** Inter with system fallbacks.  
**Label/Mono Font:** No distinct label or mono font in the extension UI.

**Character:** The type system is product-native and compact. It uses weight and small spacing shifts rather than ornamental font choices.

### Hierarchy
- **Display** (600, 24px, 1.25, -0.03em): Manage page title only. Do not use for card headings.
- **Headline** (600, 18px, 1.3, -0.02em): Section headings and reader paywall/error titles.
- **Title** (600, 15-17px, 1.35, -0.01em to -0.02em): Popup title, dialog title, series titles, and dense panel headings.
- **Body** (400-500, 13-14px, 1.5-1.7): Descriptions, summaries, settings copy, and notices.
- **Label** (500-700, 10-12px, 1.4, 0-0.08em): Buttons, chips, count badges, compact metadata, and site labels.

### Named Rules

**The One Family Rule.** Extension UI uses one sans family. Do not introduce display fonts, serif headings, or mono-forward styling in product surfaces.

**The Compact Title Rule.** Cards, rows, dialogs, and toolbars keep headings at 15-18px. Hero-scale type belongs only to the website, never to reader, popup, or manage UI.

## 4. Elevation

Comic Scroller uses a hybrid of tonal layering and soft ambient shadows. Most structure is established with border hairlines and background shifts; shadows appear on panels, dialogs, popup shells, and reader page surfaces. Elevation should feel like paper sitting above a pale desk, not like floating glass.

### Shadow Vocabulary
- **Panel Ambient** (`0 1px 2px rgba(15, 23, 42, 0.04), 0 16px 40px rgba(15, 23, 42, 0.04)`): Default panel and dialog lift.
- **Popup Ambient** (`0 1px 2px rgba(15, 23, 42, 0.03), 0 10px 24px rgba(15, 23, 42, 0.03)`): Lower shadow for the browser-action popup.
- **Reader Page Ambient** (`0 1px 2px rgba(15, 23, 42, 0.04), 0 18px 40px rgba(15, 23, 42, 0.05)`): Image page frame lift.
- **Tab Lift** (`0 -1px 0 rgba(255,255,255,0.8), 0 10px 24px rgba(15,23,42,0.06)`): Active default tab treatment.

### Named Rules

**The Border-First Rule.** Use a 1px slate hairline and a surface shift before adding a shadow.

**The No Heavy Shadow Rule.** Extension surfaces must not use dark material-style shadows from the legacy Tailwind `paper-*` scale unless the whole component vocabulary is being redesigned.

## 5. Components

### Buttons

Buttons are compact, direct, and textual. Icons may appear inside row actions when they reinforce the command, but the text label remains visible.

- **Shape:** Small rounded rectangle (8px radius).
- **Primary:** Reader Blue background, white text, 12px medium label, `8px 14px` padding.
- **Hover / Focus:** Hover shifts to Reader Blue Hover. Focus uses a 2px Reader Blue ring with a pale paper offset.
- **Secondary:** White background, slate text, 1px slate hairline, Soft Paper hover.
- **Danger:** Soft Delete Wash background, Delete Red text, subtle red border, deeper wash hover.
- **Quiet / Link:** Transparent text actions are small and underlined only when they behave as links.

### Chips

Chips are informational, not decorative. Site labels use uppercase 10-11px labels with modest tracking and muted slate color. Count badges use Soft Paper fill, hairline border, and 12px medium text.

### Cards / Containers

- **Corner Style:** Rows use 12-16px radius. Panels use 18-22px. Dialogs and large reader chapter panels use 24px.
- **Background:** Paper White over Washed Paper or Soft Paper.
- **Shadow Strategy:** Use Panel Ambient only on outer panels, dialogs, and reader page surfaces.
- **Border:** 1px `rgba(15, 23, 42, 0.08)` for normal surfaces. Increase opacity only for hover or active states.
- **Internal Padding:** Rows use 12-16px. Dialogs use 20px. Empty states use 24px horizontal and 40px vertical.

### Inputs / Fields

The extension currently has only file inputs hidden behind explicit buttons and a checkbox inside a confirmation dialog. Any new visible field should match the button vocabulary: Paper White background, 1px slate hairline, 8-12px radius, Reader Blue focus ring, and clear disabled/error states.

### Navigation

Reader navigation is a fixed 48px top bar with compact icon buttons, truncated title/chapter text, and a soft translucent paper background. Manage navigation uses tabs with 44px height, active Paper White surface, and count badges. Popup navigation is action-first: a compact header plus a secondary Manage button.

### Series Row

Series rows are the signature library component. They combine a small site chip, 40-44px cover, clamped title, summary/detail copy, and right-aligned row actions. Popup rows are denser and softer; manage rows are roomier and more durable.

### Reader Page Surface

Reader pages use centered white rounded frames over Washed Paper. The comic image is the content. Loading, retry, paywall, and end markers reuse the same surface language so the reading flow does not visually jump between states.

## 6. Do's and Don'ts

### Do:

- **Do** treat extension UI as the source of truth for the product design system.
- **Do** use Reader Blue only for primary actions, active/current state, focus, and meaningful status.
- **Do** preserve the UI flow from PRODUCT.md: "Reader first: page images and chapter flow take priority over interface decoration."
- **Do** make destructive data actions explicit, including what is preserved and what is removed.
- **Do** keep component vocabulary consistent across reader, popup, and manage surfaces.
- **Do** favor thin borders, tonal shifts, and compact type before adding more shadow or color.
- **Do** maintain visible focus states and WCAG AA contrast for task-critical text.

### Don't:

- **Don't** create cluttered, overly promotional, visually heavy, or decorative UI that competes with comic pages.
- **Don't** introduce display fonts, editorial typography, or marketing-page scale into extension surfaces.
- **Don't** use side-stripe borders as a colored accent on cards, list items, callouts, or alerts.
- **Don't** use gradient text, decorative glassmorphism, hero metrics, or identical card grids in product UI.
- **Don't** add new color families for routine states when existing slate, paper, blue, red, and green roles cover the job.
- **Don't** make modals the first answer for non-destructive flows; inline or progressive controls should be exhausted first.
- **Don't** rely on low-opacity slate text for required actions, errors, or labels users must read to complete a task.
