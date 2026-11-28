# CyberForge Product Specification

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

CyberForge serves four distinct cybersecurity training and governance personas, strictly separated across authentication and authorization boundaries:

1. **Attacker (Red Team Learner):** Students and security trainees practicing offensive exploitation (`SQLi`, `XSS`, `RCE`, `CSRF`, `LFI`, `CSP Bypass`, `File Upload`, `Weak Sessions`, `Brute Force`, `CAPTCHA`, `Client-Side Trust`) directly against a sandboxed live target, escalating across DVWA security tiers (`low` -> `medium` -> `high`).
2. **Defender (Blue Team / SOC Learner):** Trainees learning root-cause PHP remediation by analyzing vulnerable vs. hardened source code, answering mandatory conceptual patch quizzes, applying DVWA security levels (`low` / `medium` / `high` / `impossible`), and verifying live exploit replay blocks.
3. **Moderator (Instructor / Range Operator):** Lab instructors deploying and curating live DVWA challenges, monitoring Red vs. Blue completion ratios, triaging security alerts, managing Attacker and Defender cohorts, and exporting DDE-safe CSV audit logs.
4. **Admin (Platform Owner):** Root operators managing Moderator accounts, monitoring PostgreSQL / FastAPI / DVWA infrastructure health, and overseeing identity distribution across the cyber range.

## Product Purpose

CyberForge bridges conceptual OWASP study and real-world vulnerability verification. Every student submission executes (or replays) against a containerized **Damn Vulnerable Web Application (DVWA)** instance (`127.0.0.1:8081`), inspects real HTTP wire traces and server-side PHP sinks, and enforces non-spoiler learning with server-graded remediation checks and anti-farming scoring.

## Positioning

Unlike static CTF platforms with mocked flag strings or unsafe exposed target containers, CyberForge pairs an **anti-AI-hardened 7-ring control plane** (blocking CSRF, IDOR, mass assignment, brute force, spoiler leakage, and recon probing against the platform itself) with **live dual-role Red vs. Blue verification** against real DVWA PHP handlers inside isolated Docker networks.

## Operating Context

- **Runtime Planes:** React 19 + Vite + Tailwind CSS + Three.js frontend (`http://localhost:5173`), FastAPI Python control plane (`http://localhost:8000`), PostgreSQL 16 (`cyberforge` on `127.0.0.1:5432` / host `:5433` via `app_internal`), and isolated DVWA + MariaDB 10.4 (`127.0.0.1:8081` on `range_isolated`).
- **Curriculum Structure:** 14 canonical DVWA modules organized into **4 OWASP Learning Tracks**:
  - **Track I · Injection Mastery:** `sqli`, `sqli_blind`, `exec`
  - **Track II · Client-Side & Browser Exploitation:** `xss_r`, `xss_s`, `xss_d`, `csp`, `javascript`
  - **Track III · Auth, Session & Workflow Abuse:** `brute`, `weak_id`, `csrf`, `captcha`
  - **Track IV · Server & File Takeover:** `fi`, `upload`
- **Scoring & Verification Model:** Base points (`Easy = 50`, `Medium = 100`, `Hard = 250`) scaled by DVWA tier (`low = 1.0x`, `medium = 1.5x`, `high = 2.0x`), with transactional `.with_for_update()` locking (`score_earned = 0` on repeat solves/verifications).

## Capabilities and Constraints

- **Frozen 8-Table Schema (`backend/models.py`):** All relationships point upward (`admin` -> `moderator` -> `attacker` / `defender` / `challenges` -> `attempts` / `defenses` / `alerts`). `backend/models.py` must remain unmodified unless explicitly approved.
- **Anti-Spoiler Enforcement:** Attacker `/api/challenges` and `/api/tracks` responses redact `reference_payload=None`; Defender `patch_quiz` questions strip `correct_option_id` before server grading (`grade_patch_choice`).
- **Seven Defense-in-Depth Security Rings:**
  1. Edge headers (`CSP`, `X-Frame-Options: DENY`, `nosniff`, `no-store` on auth/exports), `DEBUG_OPENAPI=false`, `405` on method overrides.
  2. HS256-only JWTs (`pwd_fp` binding), `HttpOnly` + `SameSite=Lax` path-scoped cookies, single-use refresh rotation with family reuse revocation, 12-round bcrypt (`BoundedSemaphore(8)`), `10–72` byte password validation.
  3. Triple-layer CSRF (`Sec-Fetch-Site`, `Origin`/`Referer` allowlist, `hmac.compare_digest` double-submit token).
  4. Strict RBAC (`get_current_user` / `require_roles`) + cross-user IDOR strike enforcement (`403`).
  5. Strict Pydantic schemas (`ConfigDict(extra="forbid")`), SSRF-safe `validate_dvwa_page_ref`, `4000`-char payload cap, DDE-safe CSV cell sanitization.
  6. Rate limiting, rolling `600s` IP strike jail (`429`), canary `RECON_BLOCKED` traps (`404`), DVWA concurrency slots (`acquire_dvwa_slot`), and anti-farming locks.
  7. Isolated Docker networks, localhost-only bindings, `no-new-privileges:true`, resource caps (`pids_limit: 128`, `mem_limit: 512m`, `cpus: 1.0`), response size caps, and opaque `error_id` `500` responses.
- **Confirmed Undecided / Future Scope:** Automated LLM/RAG Socratic mentor (Pillar 3) and cohort analytics expansions (Pillar 4) are not yet built and must not be fabricated.

## Brand Commitments

- **Product Name & Identity:** **CyberForge** — authoritative cyber-range training platform balancing tactile physical engagement (`FallingPhysics` auth cards, Three.js 3D mission hub, kinetic typography) with disciplined single-frame study and telemetry consoles.
- **Rules of Engagement:** Strictly local sandboxed target execution (`127.0.0.1:8081`); clear scope & ethics notice at authentication.

## Evidence on Hand

- Verified working FastAPI + PostgreSQL + DVWA backend endpoints (`backend/main.py`, `backend/dvwa.py`, `backend/lab_guides.py`, `backend/security.py`, `backend/auth.py`, `backend/schemas.py`).
- Seeded live 14-module curriculum and real PHP source (`low`, `medium`, `high`, `impossible`) extracted directly from the running DVWA container.
- Automated `oxlint`, Vite production build, Pillar 1 pentest suite, and Playwright E2E screenshots across `1440×900` desktop and `390×844` mobile viewports. No synthetic customer quotes, traffic claims, or external benchmarks exist; do not invent them.

## Product Principles

1. **Real Target Depth Over Mock Flag Checking:** Every payload and hardening check validates against actual containerized DVWA behavior and real PHP source sinks.
2. **Guided Understanding Over Brute-Force Trial:** Enforce progressive hints, sink highlighting, and mandatory pre-replay patch quizzes so learners grasp root causes.
3. **Platform Invulnerability Alongside Vulnerable Labs:** Never weaken authentication, CSRF, RBAC, or host isolation while running deliberately vulnerable student targets.
4. **Zero Cognitive Clutter:** Favor single-frame desktop focus, explicit actions over hidden chrome, and honest feedback over decorative widgets.

## Accessibility & Inclusion

- Desktop `1440×900` single-frame layout with keyboard-accessible focus rings, `Ctrl+K` command navigation, `Escape`-dismissible drawers/modals, and `>=4.5:1` foreground contrast; responsive `<lg` (`390×844`) stacking with zero horizontal overflow.
- Minimum `12px` text floor (`text-xs` or larger everywhere) and full `prefers-reduced-motion: reduce` support across motion and kinetic typography primitives.
