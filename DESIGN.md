# CyberForge Design System — Archival War-Room & Darkroom Terminal

CyberForge pairs a crisp **Archival War-Room** editorial drafting surface for day-to-day operational work with high-contrast **Darkroom Terminal** wells for raw code/wire telemetry and a restored dark **Three.js 3D Mission Hub** for immersive curriculum launch.

---

## 1. Visual World & Surface Hierarchy

### Archival War-Room Surfaces (Consoles, Auth Dossier & Shell)
- **Primary Drafting Ground:** Warm Archival Vellum `#F3EFE6` (`.cf-archival-canvas`)
- **Elevated Folio Sheet:** Crisp Paper Stock `#FAF8F3`
- **Recessed Tray / Interactive Well:** Archival Buff `#EAE4D7`
- **Primary Carbon Ink:** `#111317` (body `#1C1F26`, secondary `#4B5260` — strictly `>= 4.5:1` contrast; never use `text-zinc-500` on light paper)
- **Crisp Hairlines:** `1px` borders only (`border-[#111317]/15` subtle, `border-[#111317]/25` control, `border-[#111317]` active). Elevation is declared once via surface contrast + `1px` hairline—never stack borders with heavy drop shadows.

### Darkroom Terminal Contrast Rule (`.cf-darkroom`)
Embedded technical artifacts remain high-contrast dark wells inside the archival paper workspace so payloads, PHP handlers, and wire telemetry read like illuminated lab film:
- **Darkroom Background:** `#0E1014` (`#161922` / `#07080B` nested wells)
- **Darkroom Ink:** `#ECEFF4` primary, `#CBD5E1` / `#94A3B8` secondary
- **Used for:** PHP source viewers (`low.php` / `impossible.php`), `LiveSinkVisualizer`, HTTP Wire & Payload Composer terminals, Moderator Reference Vector & Telemetry Payload blocks, and the Admin Infrastructure Darkroom Endpoint Sheet & Topology diagram.

### Restored Dark Three.js 3D Hub Contrast Rule (`RoleLandingPage.jsx`)
The post-login 3D Mission Hub intentionally stays on a deep obsidian WebGL stage (`#070709`) powered by `AttackerParticles` / `DefenderParticles`, `RolePosterBackdrop`, Lenis smooth scrolling, and a GSAP ScrollTrigger sticky-zoom 3-column gallery. Clicking **`Continue Mission ->`** or any 3D module card transitions the learner directly from the dark 3D range map into the bright Archival War-Room Studio.

---

## 2. Typography Scale (Zero Squint-Text)

Loaded in `index.html` and `src/index.css`:
- **Editorial Kinetic Serif (`.font-editorial`):** `Newsreader` (`400`, `600`, italic `400`/`500`, optical sizing) — Swiss editorial contrast pairing against condensed display headers in `KineticTypeCurtain`, Track Atlas titles (*"Curriculum Atlas"*), `ArchivalShutterCard` action shutters, and Lab Studio vulnerability tags.
- **Display & KPI Metrics (`.font-display`):** `Big Shoulders Display` (`700`, `800`) — used for brand wordmark (`24px`), kinetic curtain headlines, module indices (`01`–`14`), and high-impact KPI metric figures (`34px–44px`, `leading-none`, `tabular-nums`).
- **UI & Body (`.font-sans`):** `Bricolage Grotesque` (`500`, `600`, `700`, `800`) — `16px` base body, `14px–15px` table rows and controls, `22px–30px` (`text-2xl` / `text-[26px]`–`text-[28px]`) page titles.
- **Code, Payloads, Timestamps & Counters (`.font-mono`):** `JetBrains Mono` (`400`, `500`, `600`, `700`) with `tabular-nums`.
- **Minimum Size Floor:** **`12px` (`text-xs`) minimum** across every badge, table header, metadata chip, and timestamp. Sub-`12px` classes (`text-[9px]`, `text-[10px]`, `text-[11px]`) are prohibited.

---

## 3. Semantic Role & Status Inks

| Meaning | Ink Hex | Surface Tint |
| :--- | :--- | :--- |
| **Attacker / Red Team / Exploit** | Risograph Vermilion `#D92D20` (`#B42318` deep / `#C81E1E` solid) | `bg-[#D92D20]/10 border-[#D92D20]/30` |
| **Defender / Blue Team / Harden** | Klein Cobalt `#1E40AF` (`#1E3A8A` deep / `#1D4ED8` solid) | `bg-[#1E40AF]/10 border-[#1E40AF]/30` |
| **Verified / Healthy / Remediated** | Emerald `#047857` | `bg-[#047857]/10 border-[#047857]/30` |
| **Moderator / Admin / Governance / Alert** | Ochre Brass `#B45309` (`#92400E` text) | `bg-[#B45309]/10 border-[#B45309]/35` |

---

## 4. Single-Frame (`100dvh`) Layout Grammar & Pagination

- **Shell (`CommandDeckShell.jsx`):** Enforces `min-h-[100dvh] lg:h-[100dvh] lg:overflow-hidden` on desktop (`1440x900`) with a unified `60px` top instrument bar (brand mark, role stamp, center `border-b-2` tab strip, anchored Filter popover, `Ctrl+K` command palette trigger, `/health/db` + `/health/dvwa` telemetry popover, profile avatar, and Sign Out).
- **Mobile Adaptation (`<lg` / `390x844`):** Asymmetric 50/50 and 12-column desktop splits collapse cleanly to single-column vertical flow with a sticky bottom mobile navigation bar and zero horizontal overflow.
- **8-Row Pagination Discipline:** All operational catalogs, operator rosters, challenge matrices, and activity streams paginate at **`8` items per page** via `PaginationBar` so desktop views fit cleanly inside the `~808px` main viewport without vertical page scrolling.

---

## 5. Signature Design Spells & Kinetic System (`src/components/ui/spells.jsx`, `src/components/ui/kinetic.jsx`)

- **`KineticTypeCurtain`:** Cancellable `~550ms` Warm Archival Vellum (`#F3EFE6`) rotated `-90°` upward letter curtain (`Big Shoulders Display` + italic `Newsreader` in Risograph Vermilion / Klein Cobalt) bridging 3D Hub ↔ Console and Track Atlas → Lab Studio.
- **`KineticTitleRoll`:** Non-blocking `~260ms` GSAP character-slot roll on Lab Studio `h1` titles when switching challenges or escalating tiers.
- **`ArchivalShutterCard`:** Light `#FAF8F3` module cards in Track Atlas with 4 GSAP mechanical corner shutters gliding inward on hover/focus (`#01..#14`, live status, `dvwa_page_ref`, `Launch Lab ->`).
- **`VerdictStamp`:** Spring-snapping (`.cf-stamp-snap`) tilted (`-rotate-3`) octagonal SVG seal (`EXPLOIT VERIFIED`, `PATCH VERIFIED`, `BLOCKED`, `FAILED`).
- **`PacketBeam`:** Hardware pulse trace (`.cf-packet-sweep`) animated across a track from `Payload` to `DVWA :8081` during live execution.
- **`SpotlightSurface`:** Crisp `#FAF8F3` paper folio with subtle pointer-tracked hairline edge illumination.
- **`SlideOverInspector` & `CommandPaletteModal`:** Archival paper drawers/dialogs with `Escape` dismissal, keyboard navigation, and `100%` contrast ink.
- **`PaginationBar`, `AnimatedTicker`, `CopyChip`, `TactileToast`:** Tactile micro-feedback with `active:scale-[0.98]` and `prefers-reduced-motion` fallbacks.

---

## 6. Anti-AI-Slop & Impeccable Craft Floor

- Use `@phosphor-icons/react` exclusively (zero `lucide-react`, zero emojis).
- Zero dot-grid canvases, spinning conic neon beams, gradient display text, or stacked uppercase kickers/eyebrows above headings.
- Zero `>1px` colored left/top/right border accent stripes on cards or list rows.
- Zero `h-screen` viewport lock bugs (`100dvh` / `min-h-[100dvh]` only).
