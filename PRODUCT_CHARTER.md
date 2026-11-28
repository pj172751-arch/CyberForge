# CyberForge Product, Craft & 4-Persona Quality Charter

This charter is CyberForge's permanent product and engineering standard. Every new feature, UI refactor, curriculum module, and AI capability must pass this gate before being considered complete. See [PRODUCT.md](PRODUCT.md) and [DESIGN.md](DESIGN.md) for full product and visual specifications.

---

## 1. Visual Identity — Archival War-Room, Darkroom Terminal & Live 3D Hub

CyberForge rejects generic dark SaaS / AI-generated dashboard tropes. Operational consoles and authentication live on a precision-calibrated **Archival War-Room** paper system with embedded **Darkroom Terminal** wells, paired with a high-contrast **Three.js 3D Mission Hub** (`RoleLandingPage.jsx`) on a `#070709` WebGL stage.

### Core Tokens
- **Typography:**
  - Display & KPI Metrics: `Big Shoulders Display` (`700`, `800`) via `.font-display` (`34px–44px` figures)
  - UI & Body: `Bricolage Grotesque` (`500`, `600`, `700`, `800`) (`15px–16px` body, `22px–30px` headers)
  - Code, Payloads, Terminal, Telemetry & Timestamps: `JetBrains Mono` (`400`, `500`, `600`, `700`) with `tabular-nums`
  - **Minimum Size Floor:** `12px` (`text-xs`) minimum across all badges, metadata, table headers, and timestamps. Never use `text-[9px]`, `text-[10px]`, or `text-[11px]`.
- **Surface Hierarchy (Archival War-Room + Darkroom):**
  - Drafting Ground: Warm Archival Vellum `#F3EFE6`
  - Elevated Folio Sheet: Crisp Paper Stock `#FAF8F3`
  - Recessed Tray / Well: Archival Buff `#EAE4D7`
  - Darkroom Terminal Well (`.cf-darkroom` for PHP source, HTTP wires, reference payloads, and Admin endpoint sheets): `#0E1014` surface with `#ECEFF4` ink
  - Structural Hairline Borders: `1px solid rgba(17, 19, 23, 0.15)` (interactive `0.25–0.30`, active `#111317`)
- **Signal Palette (Restrained & Functional Only):**
  - Offensive / Red Team / Exploit: Crimson `#C81E1E`
  - Defensive / Blue Team / Harden: Cobalt `#1D4ED8`
  - Verified / Healthy / Remediation: Emerald `#047857`
  - Ops / Governance / Alert: Ochre Brass `#B45309`
- **Typography Contrast:** Primary ink `#111317` / `#1C1F26`; secondary ink `#4B5260` (`>= 4.5:1` contrast). Never use `text-zinc-500` or dark-gray SaaS cards on light paper.
- **Single-Frame (`100dvh`) Layout & Pagination:** Desktop (`1440x900`) operational consoles use `lg:h-[100dvh] lg:overflow-hidden` inside `CommandDeckShell` with clean `8`-row `PaginationBar` pagination and zero vertical page scroll.

### Explicitly Banned UI Tropes
- No `Space Grotesk`, `Plus Jakarta Sans`, `Alex Brush`, or generic gradient text headings.
- No repeating radial dot-grid background canvases (`.cf-dot-canvas`) or soft purple/teal SaaS ambient glows.
- No spinning conic-gradient neon perimeter beams on static status panels.
- No uppercase kickers/eyebrows stacked above `<h1>`/`<h2>`/`<h3>`.
- No `>1px` thick colored left/top/right card accent stripes and no gratuitous nested ghost cards (border + heavy shadow stacked).
- No `lucide-react` (`@phosphor-icons/react` only) and zero emojis in UI copy.
- Never trap authenticated learners on a static marketing splash screen; the 3D Mission Hub provides direct one-click mission launch (`Continue Mission ->` or click any 3D module card).

---

## 2. The 4-Persona Utility Rubric

Before shipping any milestone, critique the change from the perspective of each persona:

1. **Attacker (Red Team Learner):** Does this feel like a real offensive workbench (HTTP Wire Inspector, structured OWASP track, `Low -> Medium Bypass -> High Evasion` escalation against live DVWA) rather than a text box checking a regex?
2. **Defender (Blue Team / SOC Learner):** Does this mirror real incident response and code auditing (live `alerts` triage, interactive vulnerable PHP line diagnosis, proof of *why* `Medium`/`High` fail before `Impossible` holds, no giveaway answer labels)?
3. **Moderator (Instructor / Range Operator):** Can an instructor inspect cohort OWASP mastery heatmaps, see Red-vs-Blue readiness gaps, test payloads live against DVWA while authoring challenges, and reset the DVWA range cleanly?
4. **Admin (Platform Owner):** Can an admin monitor real measured infrastructure latency (FastAPI, Postgres, DVWA), govern cohorts/moderators cleanly, and export academic gradebooks/audit CSVs?

---

## 3. Curriculum & Hybrid Socratic AI Mentor Rules

- **Full DVWA Parity:** Utilize all `14` real DVWA modules (`sqli`, `sqli_blind`, `exec`, `xss_r`, `xss_s`, `xss_d`, `csp`, `javascript`, `brute`, `weak_id`, `csrf`, `captcha`, `fi`, `upload`) across `4` structured OWASP Learning Paths and `low`/`medium`/`high`/`impossible` tiers.
- **Zero Mock Data in Consoles:** Every table, chart, incident, source snippet, and metric must trace directly to PostgreSQL or live Docker DVWA HTTP/PHP state.
- **Socratic Non-Spoiler Pedagogy:** Hints and the Hybrid RAG AI Mentor must diagnose the learner's exact attempt + cite real DVWA PHP lines while guiding reasoning — never dumping copy-paste winning payloads or answer keys unprompted.

---

## 4. Non-Negotiable Technical & Pre-Ship Gate

- **`backend/models.py` Stays Frozen:** The 8 canonical Project-I PostgreSQL tables (`admin`, `moderator`, `attacker`, `defender`, `challenges`, `attempts`, `defenses`, `alerts`) must never be altered unless explicitly instructed.
- **Mandatory Verification Before Completion:**
  1. `git diff --name-only backend/models.py` is empty.
  2. `npm run lint` (`oxlint`) passes with `0` warnings and `0` errors.
  3. Impeccable craft check (`detect.mjs --json`) returns `[]` on changed UI components.
  4. `npm run build` exits `0`.
  5. Live backend & DVWA verification script passes end-to-end against Docker `:8081` and Postgres (`:5432` / `:5433`).
  6. Headless browser E2E verifies `0` console errors, `0` page errors, `0` horizontal overflow and zero desktop page scroll (`1440x900`) plus clean responsive collapse on mobile (`390x844`), and clean test-account teardown.

---

## 5. Persona #5 — Adversarial Hacker Self-Audit (7 Security Rings)

Every backend, frontend, and infrastructure change must survive an adversarial self-audit across all **7 Security Rings** before shipping:

1. **Ring 1 — Transport, Edge & Security Headers:** Register HTTP security middleware before `CORSMiddleware` (outermost) so 401/403/405/429 responses carry CORS headers; enforce `nosniff`, `DENY`, `strict-origin-when-cross-origin`, `Permissions-Policy`, `COOP`, `CORP`, strict `CSP`, `Cache-Control: no-store` on `/api/auth/*` and `/api/reports/*`; disable `/docs`, `/redoc`, and `/openapi.json` unless `DEBUG_OPENAPI=true`; reject HTTP method-override headers (`405`).
2. **Ring 2 — Session, JWT & Cookie Hardening:** HS256-only JWTs (`alg=HS256`, `typ=JWT` strict check blocking `alg:none`), `iss`/`aud`/`exp`/`iat`/`jti`/`pwd_fp` binding, ephemeral dev secret fallback (`>=32` chars), `HttpOnly` + `SameSite=Lax` + path-scoped access/refresh cookies, single-use refresh rotation with family reuse revocation, `pwd_fp` invalidation on password rotation, timing-safe `dummy_verify_password`, `BoundedSemaphore(8)` around 12-round bcrypt, and `10–72` byte strong password validation.
3. **Ring 3 — Triple-Layer CSRF Defense:** On non-Bearer mutations, reject `Sec-Fetch-Site: cross-site`, enforce `Origin` / `Referer` allowlist against `CORS_ORIGINS`, and verify double-submit `X-CyberForge-CSRF` header vs `cyberforge_csrf` cookie with `hmac.compare_digest`.
4. **Ring 4 — Strict RBAC, Anti-IDOR & Anti-Spoiler:** Gate every `/api/*` route with `get_current_user` or `require_roles(...)`, reject cross-user `attacker_id` / `defender_id` / `user_id` / `role` probes with `403` + security strike, and redact `reference_payload=None` for `attacker` callers on `/api/challenges` and `/api/tracks`.
5. **Ring 5 — Input Validation, Mass-Assignment & Injection Guards:** Enforce `ConfigDict(extra="forbid")` on all request schemas (striking on `extra_forbidden`), SSRF-safe `validate_dvwa_page_ref`, `4000`-char payload cap + NUL stripping, CR/LF/NUL header/cookie rejection (`422`), and `sanitize_csv_cell` DDE formula neutralization (`=`, `+`, `-`, `@`, `\t`, `\r`) on CSV exports.
6. **Ring 6 — Rate Limits, IP Jail, Canary Traps & Anti-Score-Farming:** Enforce IP + credential login/register rate limits, rolling `600s` IP strike jail (`20/40/70` thresholds -> `429` + `Retry-After`), canary recon traps (`/.env`, `/.git*`, `/wp-admin`, `/wp-login.php`, `/phpinfo.php`, `/actuator`, `/graphql`, `/api/debug`, `/admin.php`, `/server-status`) logging `RECON_BLOCKED` alerts + quiet `404`, DVWA global/per-user concurrency semaphores (`acquire_dvwa_slot`), and `score_earned=0` on repeat solves/verifications.
7. **Ring 7 — Network & Container Isolation + Error Hygiene:** Separate `app_internal` (`app_db`) and `range_isolated` (`dvwa_db` + `dvwa`) Docker networks, localhost-only port bindings, `no-new-privileges:true`, `pids_limit: 128`, `mem_limit: 512m`, `cpus: 1.0`, `init: true`, `MAX_DVWA_RESPONSE_BYTES` caps, `follow_redirects=False`, and opaque `error_id` `500` responses without leaked stack traces.
