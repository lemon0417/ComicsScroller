---
name: comic-scroller-site-adapter
description: Guide Comic Scroller site adapter, parser, reader epic, metadata, manifest host permission, DNR rule, and background redirect changes. Use when adding a new supported comic site, changing DM5/ComicBus/SF parsing, fixing chapter image loading, changing site metadata fetches, updating site registries, adding host permissions, or adjusting site-specific redirect/header behavior.
---

# Comic Scroller Site Adapter

## Overview

Use this skill for site-specific work in the Comic Scroller MV3 extension. The goal is to keep parser, metadata, reader orchestration, manifest permissions, redirect behavior, DNR headers, and tests aligned.

## Grounding Pass

1. Read `AGENTS.md` for project rules.
2. Read `docs/04-sites/README.md` for the current site-change checklist.
3. For DM5 work, also read `docs/04-sites/dm5.md`.
4. Inspect the current site implementation before planning or editing:
   - `src/sites/<site>/adapter.ts`
   - `src/sites/<site>/meta.ts`
   - `src/sites/<site>/`
   - `src/sites/registry.ts`
   - `src/epics/sites/<site>.ts`
   - `src/epics/sites/registry.ts`

## Change Routing

- Metadata changes belong in `src/sites/<site>/meta.ts` and `src/sites/registry.ts`.
- Chapter page parsing, image URL resolving, paywall detection, and no-DOM fallbacks belong in `src/sites/<site>/`.
- Reader ajax/action orchestration belongs in `src/epics/sites/<site>.ts`; shared orchestration belongs in `src/epics/sites/readerFlow.ts`.
- Supported reader epic registration belongs in `src/epics/sites/registry.ts`.
- New or changed hosts belong in both `src/manifest/manifest.json` and `src/manifest/manifest.dev.json`.
- Redirect behavior belongs in `src/infra/services/background.ts`; keep `src/background.ts` as listener wiring.
- Referer, Cookie, or header rewrites should use `public/rules.json` through DNR rather than content scripts or `webRequest`.

## Guardrails

- Do not introduce a backend service or remote hosted code.
- Do not edit `dist/` manually.
- Keep `src/sites/**` independent from `src/epics/**`.
- Site parsers must work in MV3 background/service-worker constraints; provide string/no-DOM fallbacks where DOM parsing is involved.
- Do not let paywall, timeout, parser failure, or image load failure leave the reader permanently loading.
- Keep parser vocabulary explicit. For DM5, keep chapter identity (`m...`) distinct from series slug (`manhua-...`).

## Validation

Choose the smallest relevant tests first, then broaden only when the change crosses boundaries.

- Metadata: `yarn test src/sites/__tests__/<site>.meta.test.ts`
- Site parser / reader epic: `yarn test src/epics/sites/<site>*.test.ts`
- Shared reader orchestration: `yarn test src/epics/sites/readerFlow.test.ts`
- Background redirect or notification behavior: `yarn test src/infra/services/background.test.ts`
- Manifest, DNR, or cross-site changes: add `yarn typecheck` and `yarn build`
- Final confidence for broad site changes: `yarn verify`

## Documentation

Update `docs/04-sites/<site>.md` when the parser contract, metadata source, redirect rule, header rule, paywall behavior, or retry/failure behavior changes. Keep docs as current-state references, not an implementation diary.
