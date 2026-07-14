# Design System: Comic Scroller

## 1. Visual Theme & Atmosphere

Comic Scroller is a warm, reader-first product interface built around the idea of a **clear reading desk**. Parchment surfaces make the browser extension feel calm and familiar, while deep ink keeps controls trustworthy and easy to scan. The interface should become visually quiet as soon as the comic pages appear.

- **Density:** Daily App Balanced, 6/10. Popup and library views are compact enough for frequent use without becoming cockpit-dense.
- **Variance:** Predictable Symmetric, 3/10. Repeated reader and library actions stay in familiar positions; asymmetry is reserved for content-led website compositions.
- **Motion:** Static Restrained, 2/10. Motion confirms state changes and loading only; it never competes with reading.
- **Personality:** Clean, intuitive, bright, local, and dependable.
- **Source of truth:** Extension surfaces define the product language. The website may use more whitespace and larger type, but it must retain the same parchment, ink, and single-accent hierarchy.

The physical scene is a manga reader returning to a softly lit reading desk: the comic is the subject, the parchment UI is the desk, and controls remain close at hand without becoming decoration.

## 2. Color Palette & Roles

- **Parchment Canvas** (`#ECE6D6`) — Dominant brand color and primary application background. This is the visual field users should associate with Comic Scroller.
- **Soft Parchment** (`#F8F4E9`) — Loading surfaces, subdued rows, and secondary background layers.
- **Paper Surface** (`#FFFDF7`) — Panels, dialogs, cards, active tabs, and reader page frames.
- **Parchment Hover** (`#FCF8ED`) — Quiet hover state over Paper Surface.
- **Pressed Parchment** (`#EFE8D6`) — Stronger hover or pressed state when a surface change must be obvious.
- **Tab Wash** (`#E0D8C4`) — Inactive tab rails and grouped navigation backgrounds.
- **Charcoal Ink** (`#131311`) — Primary text, high-emphasis icons, and the darkest brand mark. Never substitute pure black.
- **Shadow Ink** (`#261F17`) — Brand-mark foreground and warm elevation tint.
- **Soft Ink** (`#38342D`) — Secondary headings and standard controls.
- **Muted Umber** (`#746B5C`) — Metadata and supporting text that remains comfortably legible.
- **Parchment Line** (`#CCC2AB`) — One-pixel structural borders and dividers.
- **Reader Blue** (`#1F52B1`) — The single functional accent for primary actions, current selection, follow state, and focus rings. It is not the dominant brand color and must not become a decorative background field.
- **Reader Blue Pressed** (`#143B87`) — Hover and active state within the Reader Blue accent family only.
- **Delete Red** (`#9A362F`) with **Delete Wash** (`#FDEFE9`) — Destructive text, borders, and confirmation surfaces only.
- **Success Wash** (`#EBF6E2`) — Successful completion feedback only; do not use green as a routine accent.
- **Cover Fallback** (`#DCD3BE`) — Missing cover and media placeholder blocks.

Use one warm neutral family throughout; do not mix these parchment and umber values with cool slate grays. Depth comes from the Parchment Canvas → Soft Parchment → Paper Surface stack before shadows are introduced. The brand icon uses parchment, ink, and a Paper Surface separation halo only; Reader Blue stays out of the mark.

## 3. Typography Rules

- **Display:** Avenir Next, `ui-sans-serif`, `system-ui`, sans-serif; 24px, weight 600, line-height 1.25, letter-spacing `-0.03em`. Reserve for the manage-page title.
- **Headline:** Avenir Next with the same fallbacks; 18px, weight 600, line-height 1.3, letter-spacing `-0.02em`. Use for section and reader-state headings.
- **Title:** Avenir Next with the same fallbacks; 15–17px, weight 600, line-height 1.35, letter-spacing no tighter than `-0.02em`. Use for series, dialogs, and dense panels.
- **Body:** Avenir Next with the same fallbacks; 14px, weight 400–500, line-height 1.5–1.7. Keep prose at or below 65 characters per line.
- **Label:** Avenir Next with the same fallbacks; 11–12px, weight 500–700, line-height 1.4. Use for buttons, chips, badges, and compact metadata.
- **Mono:** `ui-monospace`, SFMono-Regular, Consolas, monospace. Use only for code, versions, IDs, or diagnostic values.

Hierarchy comes from weight, ink strength, and spacing rather than oversized type. Software UI uses sans-serif only: no Inter, generic serif, editorial display face, or mono-forward styling. Labels and task-critical text must never rely on low-opacity color to communicate hierarchy.

## 4. Component Stylings

- **Primary buttons:** Reader Blue fill, Paper Surface text, 8px corner radius, 12px semibold label, and `8px 14px` padding. Hover uses Reader Blue Pressed; active feedback translates the button down by 1px. Focus uses a visible 2px Reader Blue ring with a parchment offset.
- **Secondary buttons:** Paper Surface fill, Soft Ink text, 1px Parchment Line border, and Parchment Hover feedback. They share the same height, radius, and typography as primary buttons.
- **Danger buttons:** Delete Wash fill with Delete Red text and border. Copy must state exactly what will be removed and what will remain.
- **Icon buttons:** Familiar line icons inside 36–44px square targets with 8–12px radius. Always provide an accessible label and visible focus state.
- **Panels and dialogs:** Paper Surface over Parchment Canvas, 16–24px radius, and a warm shadow no darker than `rgba(38, 31, 23, 0.12)`. Use elevation only for an outer panel, modal, or reader page frame.
- **Series rows:** Compact horizontal compositions with a 40–44px cover, site label, clamped title, concise status, and right-aligned action. Prefer dividers and whitespace over nested cards.
- **Tabs:** Tab Wash rail with a Paper Surface active tab. Current state is communicated by surface, ink, and semantics rather than blue decoration.
- **Inputs:** Label above, optional helper text below, error below the field. Paper Surface fill, 1px Parchment Line border, 8–12px radius, and Reader Blue focus ring. Never use floating labels.
- **Loading:** Skeletons match the exact cover, row, or content dimensions. A looping spinner is permitted only for a compact isolated action, never as decorative ambient motion.
- **Empty states:** Explain what belongs in the space and provide the single most useful next action. Do not stop at “No data.”
- **Errors:** Keep errors inline when recovery is local; show a clearly labeled retry action and preserve already loaded reading content.
- **Brand mark:** A vertical parchment manga volume on a transparent canvas, with an ink outline, spine, and cover panel. An ink downward arrow overlaps the lower-right cover in the foreground; a Paper Surface halo separates the layers. The volume must fill the available toolbar frame and remain recognizable at 16px.

Every interactive component defines default, hover, focus, active, disabled, loading, and error behavior where applicable. Use the same component vocabulary in reader, popup, and manage views.

## 5. Layout Principles

- Reader content owns the visual hierarchy. Comic pages remain centered and uninterrupted; navigation occupies a compact 48px toolbar.
- Popup and manage views use one primary reading path: resume or inspect updates first, then manage secondary data.
- Use Flexbox for toolbars and rows, and CSS Grid for true two-dimensional arrangements. Do not simulate grids with percentage calculations.
- Contain long-form website content with a readable max-width. Product lists may run wider when their data requires it.
- Keep elements in separate spatial zones. Menus, dialogs, and popovers must not overlap or clip task-critical content unexpectedly.
- Avoid equal three-card marketing rows. Prefer a single focused panel, an asymmetric two-column composition, or a dense list according to the content.
- Below 768px, multi-column website layouts collapse to one column, touch targets reach at least 44px, and horizontal overflow is forbidden.
- Use `min-height: 100dvh` for full-viewport web surfaces. Do not use fixed `100vh` when mobile browser chrome can resize the viewport.
- The documentation website may use a left-aligned content-led hero with one primary action. The extension itself never uses hero layouts.

## 6. Motion & Interaction

- Standard state transitions last 150–220ms and use an ease-out-quart or ease-out-quint curve. Never use linear, bounce, or elastic easing.
- Animate only `transform`, `opacity`, or a restrained color transition. Do not animate layout dimensions or positions such as `top`, `left`, `width`, or `height`.
- Active feedback may translate a button by 1px. Dialogs may use a short opacity and scale entrance when it improves orientation.
- Loading indicators may loop while work is actually pending. Idle controls, navigation, cards, and brand elements never pulse, float, shimmer, or type indefinitely.
- Lists render immediately. Do not delay reading data with waterfall reveals or decorative page-load choreography.
- Preserve scroll position and reading continuity across updates. Motion must never move the comic away from the reader’s current place.
- Every animation has a `prefers-reduced-motion: reduce` alternative using an instant state change or short crossfade.

## 7. Anti-Patterns (Banned)

- No pure black, cool slate palette, purple/neon accent, gradient text, outer glow, or decorative glassmorphism.
- No blue-dominant brand surfaces. Reader Blue is a functional state color only.
- No Inter, generic serif, decorative display font, or custom cursor.
- No overlapping text and imagery, clipped controls, or absolute-positioned decoration that competes with comic pages.
- No identical three-column card grid, nested cards, hero metrics, numbered section scaffolding, or repeated uppercase eyebrows.
- No decorative perpetual motion, bouncing chevrons, “Scroll to explore,” “Swipe down,” or staggered list reveals.
- No emojis as interface icons, generic placeholder identities, fake round statistics, broken stock-image links, or AI copywriting clichés such as “Elevate,” “Seamless,” “Unleash,” and “Next-Gen.”
- No unexplained destructive action, inaccessible icon-only control, invisible focus state, or required text below WCAG AA contrast.
- No visual embellishment that competes with manga pages or makes local data actions feel unpredictable.
