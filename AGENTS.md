# CyberForge Agent Context & Architecture Guide

## 1. Project Overview
CyberForge is a cybersecurity training and verification platform where students practice offensive and defensive security workflows against a deliberately vulnerable target application (DVWA) running inside Docker.

## 2. Infrastructure Architecture
- **Target Application**: DVWA (Damn Vulnerable Web Application) on port `8081` (`http://localhost:8081`).
- **Target Database**: MariaDB 10.4 on internal port `3306` (dedicated to DVWA).
- **Application Database**: PostgreSQL 16 on port `5432` (`cyberforge`, user: `postgres`).
- **Backend**: FastAPI on port `8000` (`http://localhost:8000`).
- **Frontend**: React (Vite) on port `5173` (`http://localhost:5173`).

## 3. Account Hierarchy & Database Model
All relationships are one-to-many, pointing up the management chain. Attacker and Defender accounts are strictly decoupled and only share the `challenges` table.

```
       [Admin]
          | (1:N)
    [Moderator]
     /    |    \
 (1:N)  (1:N)  (1:N)
   /      |      \
[Attacker] |   [Defender]
   |   [Challenges]  |
 (1:N)    |    |   (1:N)
   |    (1:N)(1:N)   |
[Attempts]  \  /   [Defenses]
             \/
          [Alerts]
```

### The 8 Core Tables
1. **admin**: `admin_id` (PK), `username`, `email`, `password` (hashed), `created_at`
2. **moderator**: `moderator_id` (PK), `admin_id` (FK), `username`, `email`, `password`, `created_at`
3. **attacker**: `attacker_id` (PK), `moderator_id` (FK), `username`, `email`, `password`, `created_at`
4. **defender**: `defender_id` (PK), `moderator_id` (FK), `username`, `email`, `password`, `created_at`
5. **challenges**: `challenge_id` (PK), `moderator_id` (FK), `title`, `vulnerability_type`, `difficulty`, `dvwa_page_ref`, `reference_payload`
6. **attempts**: `attempt_id` (PK), `attacker_id` (FK), `challenge_id` (FK), `payload_used`, `status`, `timestamp`, `score_earned`
7. **defenses**: `defense_id` (PK), `defender_id` (FK), `challenge_id` (FK), `security_level_applied`, `verified`, `timestamp`, `score_earned`
8. **alerts**: `alert_id` (PK), `challenge_id` (FK), `alert_type`, `message`, `timestamp`

## 4. Verification Workflow
- **Attacker Flow**: Attacker selects a challenge, submits an exploit payload. System evaluates the vector against `reference_payload` or the active target and logs an `attempt` and `alert`.
- **Defender Flow**: Defender raises DVWA's security level (`low`, `medium`, `high`, `impossible`) to remediate the vulnerability. The system verifies the fix by replaying the challenge's `reference_payload` and records the verified `defense` and `alert`.

## 5. Development Guidelines
- Always verify Python models and endpoints without staging or committing (`git add`/`git commit` are prohibited).
- Passwords must always be hashed with bcrypt before storing.

## 6. Product Craft, Anti-AI-Slop & 4-Persona Self-Audit Charter
Every feature plan, UI change, and verification pass must actively satisfy [PRODUCT_CHARTER.md](PRODUCT_CHARTER.md), [PRODUCT.md](PRODUCT.md), and [DESIGN.md](DESIGN.md):
1. **Archival War-Room, Darkroom Terminal & Live 3D Hub Visual System:** Operational consoles and auth use Warm Archival Vellum (`#F3EFE6`), Crisp Paper (`#FAF8F3`), Archival Buff (`#EAE4D7`), Carbon Ink (`#111317` / `#4B5260`), `1px` crisp hairlines, `Big Shoulders Display` + `Bricolage Grotesque` + `JetBrains Mono` (minimum `12px`, zero `text-[9px]`–`text-[11px]` squint-text), restrained Crimson (`#C81E1E`) / Cobalt (`#1D4ED8`) / Emerald (`#047857`) / Ochre (`#B45309`) accents, and `.cf-darkroom` (`#0E1014` / `#ECEFF4`) wells for PHP source, payloads, and endpoint sheets, while preserving the dark `#070709` Three.js 3D Mission Hub (`RoleLandingPage.jsx`). Enforce single-frame `lg:h-[100dvh] lg:overflow-hidden` zero-scroll layouts via `8`-row `PaginationBar` pagination on desktop. Never introduce dot-grid backgrounds, spinning conic neon beams, gradient display text, kickers above headings, `>1px` card border stripes, `lucide-react`, or emojis.
2. **4-Persona Utility Check:** Before finishing any task, audit whether the change delivers genuine utility (zero mock data, zero busywork, real DVWA depth) for **Attacker**, **Defender**, **Moderator**, and **Admin**.
3. **Full DVWA Curriculum & Non-Spoiler AI:** Leverage all 14 DVWA modules, multi-tier escalation (`low` / `medium` / `high` / `impossible`), structured OWASP Learning Paths, and Socratic source-grounded hints without leaking answers.
4. **Schema & Verification Discipline:** Keep `backend/models.py` untouched unless explicitly approved, and verify every milestone with `oxlint`, Impeccable `detect.mjs`, `npm run build`, live DVWA/backend checks, and responsive headless browser E2E (`1440x900` & `390x844`).

## 7. Persona #5 — Adversarial Hacker Self-Audit (7 Security Rings)
Every security-critical change must uphold all 7 defense-in-depth rings documented in [PRODUCT_CHARTER.md](PRODUCT_CHARTER.md):
1. **Ring 1 — Transport, Edge & Headers:** Security middleware registered before outermost `CORSMiddleware`, strict security headers (`CSP`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `COOP`, `CORP`, `no-store` on `/api/auth/*` and `/api/reports/*`), `DEBUG_OPENAPI=false` disabling `/docs`/`/redoc`/`/openapi.json`, and `405` on HTTP method-override headers.
2. **Ring 2 — Session, JWT & Cookies:** HS256-only JWTs (`alg=HS256`/`typ=JWT`), `pwd_fp` password-hash binding, ephemeral dev secret fallback, `HttpOnly`/`SameSite=Lax`/path-scoped cookies, single-use refresh rotation with family reuse revocation, `dummy_verify_password`, `BoundedSemaphore(8)` bcrypt throttling, and 10–72 byte password complexity.
3. **Ring 3 — Triple-Layer CSRF:** `Sec-Fetch-Site: cross-site` rejection, `Origin`/`Referer` allowlist against `CORS_ORIGINS`, and `X-CyberForge-CSRF` / `cyberforge_csrf` `hmac.compare_digest` verification on cookie-authenticated mutations.
4. **Ring 4 — RBAC, Anti-IDOR & Anti-Spoiler:** `get_current_user` / `require_roles` on every `/api/*` endpoint, `403` + strike on cross-user IDOR parameters/payloads, and `reference_payload=None` redaction for attackers.
5. **Ring 5 — Input & Injection Hygiene:** `ConfigDict(extra="forbid")` mass-assignment guard (`422` + strike), SSRF-safe `validate_dvwa_page_ref`, `4000`-char payload cap + NUL stripping, CR/LF/NUL header/cookie rejection (`422`), and `sanitize_csv_cell` DDE formula neutralization.
6. **Ring 6 — Rate Limits, IP Jail, Canary & Anti-Farming:** Login/register/submission rate limits, rolling `600s` IP strike jail (`429` + `Retry-After`), canary recon traps logging `RECON_BLOCKED` alerts with quiet `404`, `acquire_dvwa_slot` concurrency semaphores, and `score_earned=0` on repeat solves.
7. **Ring 7 — Container Isolation & Error Hygiene:** Split Docker networks (`app_internal` vs `range_isolated`), localhost bindings, `no-new-privileges:true` + resource caps, `MAX_DVWA_RESPONSE_BYTES` / `follow_redirects=False`, and `error_id`-only `500` responses.
