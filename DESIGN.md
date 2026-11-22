# phao.dev v2

This document governs `/v2` only. The v1 site and CMS keep their own design.

## Work and writing, 31 October 2026

Keep the user-selected direct, spare, real-screen direction. The second live review found repeated summaries, unreadable full-screen thumbnails, a padded case-study template, and an oversized conceptual walkthrough. Correct content and composition instead of changing the palette again.

Projects are enduring bodies of work; articles are dated writing. They share a searchable library, grouped by kind rather than placed in a fabricated chronology. Homepage writing is a quiet title/date list beside selected project notes. Only evidence-backed relationships appear on project/article pages; the SDC lab article relates to SDC Cloud, not to institutional ownership or deployment proof for Uma/UAR. Standalone writing stays independent.

Published content comes through a read-only adapter around the existing editorial reader. No copied demo posts, authoring UI, draft exposure, new schema, or v1 CMS changes. V2 owns article presentation and public API DTOs. Empty published content and an unavailable source are distinct states.

Use truthful CSS viewport framing to make the actual screenshot's controls legible, with an ordinary full-image link. Pair UAR's request screen with account matching and Uma's cluster view with administration. Case headings describe concrete behavior with pinned source references. Thin experiments get short notes. The console explanation is four source-backed stages, selected content first and no fixed empty panel.

Typography, palette, spacing, edges, and motion tokens below remain unchanged. Articles use a 70ch reading measure, native heading anchors, accessible contents navigation, and the same restrained type family. Project and article navigation stays under v2; existing published media storage is reused.

## Context

- Artifact: personal engineering portfolio with a project index and an interactive explanation.
- Audience: hiring teams, engineering peers, and people exploring personal projects. Primary action: inspect a real project.
- User direction: "A personal engineer’s site: direct, spare, real project screens."
- Adjectives: direct, specific, readable, personal.
- Translation: plain descriptions; actual interface evidence; comfortable reading sizes; Thomas's name rather than an agency identity.
- Essence: person, work, evidence.
- Proposition: understand what Thomas builds by looking at it.
- Light mode, balanced density. Next.js App Router. Server-rendered discovery and independent `/v2/api` contracts remain intact.
- References: [Brian Lovin](https://brianlovin.com/) for personal authorship and compact project descriptions; [Paco Coursey](https://paco.me/) for clear project naming; [Julia Evans](https://jvns.ca/) for specific technical subjects rather than claims of expertise. Transpose their content discipline, not their styling.

## Direction

Three candidates were considered: interface atlas (actual screens and concise explanations), engineering field notes (long-form decisions), and a navigable system map. The user selected the personal, spare direction. Use the interface atlas because substantial Uma and UAR artifacts already exist; use project notes for work with less published evidence.

The opening composition is a personal introduction in a narrow column beside a substantial Uma interface. UAR follows as a different proportioned spread. Other projects form a compact index. This replaces the slogan, fabricated diagram, repeated cards, about block, and promotional footer structure.

Signature: an actual interface paired with a narrow explanation of the workflow or boundary it demonstrates.

## Typography and tokens

IBM Plex Sans (Google Fonts, OFL) for titles and body; IBM Plex Mono (OFL) for short technical metadata. No italic display type. Body measure at most 70ch. Weights 400, 500, 600. Display tracking -0.02em maximum.

Six-step scale, 16px base and 1.25 ratio: 16, 20, 25, 31.25, 39.0625, 48.828px. Captions 14px, never below 14px. Body line height 1.6, headings 1.15.

| Role | OKLCH | sRGB fallback |
| --- | --- | --- |
| Background | `oklch(0.99 0 0)` | `#fcfcfc` |
| Surface | `oklch(0.965 0.002 250)` | `#f3f4f5` |
| Foreground | `oklch(0.235 0.005 250)` | `#1d1e20` |
| Muted | `oklch(0.46 0.008 250)` | `#56595d` |
| Separator | `oklch(0.86 0.004 250)` | `#cfd1d3` |
| Control edge | `oklch(0.57 0.008 250)` | `#74787c` |
| Accent | `oklch(0.47 0.18 355)` | `#a21858` |
| Accent text | `oklch(0.99 0 0)` | `#fcfcfc` |
| Success | `oklch(0.40 0.08 155)` | `#235638` |
| Warning | `oklch(0.44 0.09 65)` | `#775120` |
| Error | `oklch(0.43 0.16 25)` | `#952a28` |

CSS custom properties live on `.v2` in `src/app/v2/v2.css`, with sRGB fallbacks followed by OKLCH. Images carry their authentic colors. Accent is reserved for interaction, not decorative shapes. Dark mode is outside this slice; v2 sets its own color scheme.

## Layout and craft

4px spacing base: 4, 8, 12, 16, 24, 32, 48, 64, 96. Content max width 1280px, fluid side gutters. Opening columns roughly 1:2. At 800px, stack introduction then real project. At narrow widths all indexes become text rows and controls stack. Use document flow, not sticky overlays.

Two radius values: 0 and 2px. Defined edges only, no elevation shadows. Pictures keep their aspect ratio; full-size screenshot links let readers inspect dense interfaces. No invented product visuals or implied live telemetry.

Links are underlined or explicitly descriptive. Buttons have visible boundaries, hover, active, focus, disabled states. Controls use 16px text and 44px minimum height. One primary action per region. Search uses labelled native inputs and GET URLs; valid input survives validation errors. Empty states offer a clear way back.

Project pages vary with available material. Uma and UAR have evidence-led studies; thinner entries have short project notes. Metadata must use that project's evidence, never another project's screenshot. Historical screenshots do not imply current service health.

Uma's request model remains clearly illustrative. The default trace is server-rendered; scenario controls are disabled until hydration. Selection is communicated by text and state, with keyboard navigation and a polite live region.

No entrance animations, parallax, decorative pulse, grids, or auto-scrolling elements. Interaction feedback is immediate. Respect reduced motion. Lucide icons are limited to small navigation controls with a consistent 1.5px stroke; text labels carry meaning.

Accessibility: semantic heading order, skip link, visible focus, independent text labels for states, 44px controls, AA contrast verified with rendered axe checks. Screenshots get descriptive alternatives and captions. Automated checks do not replace owner/device/screen-reader acceptance.

No component catalog is needed for this composition. If extending it, use native components first; any catalog references must be adapted to this system and their licenses checked.

## Review and audit

2026-10-31: A fresh live review found repeated summaries, thin projects stretched into cases, screenshots too small to read, and excessive space in the conceptual trace. The revised production preview passed the visual recheck after restoring complete interface headings and UAR's full request/submit region at original resolution. Source review checked the actual account-linking, email-state, console permission/ticket/proxy, and nested-lab boundaries. Published writing now shares a grouped library with projects and has native v2 reading pages; only supported relationships receive cross-links. No new visual theme or fabricated post content was added.

2026-10-30: Three independent reviewers assessed visual direction, authenticity/content, and interaction/accessibility. All identified decorative framing ahead of actual evidence. An independent rendered review of the rebuild accepted the person-and-interface opening, distinct UAR spread, compact index, restrained type, and actual evidence. It caught a hidden mobile introduction and tight walkthrough status spacing; both were corrected and rechecked. Lazy screenshots are decoded after scrolling before capture.

The bare structure is now personal introduction plus real project, a differently proportioned second project, and a factual index. It no longer depends on a slogan or decorative illustrations. Automated axe/overflow checks passed at 320, 390, and 1440 pixels on homepage, index, Uma, and UAR; the no-JavaScript and complete interaction checks passed on a local production build. Owner visual acceptance and real-device/screen-reader review remain separate.

## Changelog

- 2026-10-31: Revised evidence framing and project-specific chapters, shortened the console explanation, and integrated existing published writing through a read-only adapter.
- 2026-10-30: Replaced the generic studio direction with a user-selected personal engineering portfolio direction, scoped to v2.
