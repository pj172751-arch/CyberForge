# CyberForge Product Specification

CyberForge is a full-stack cybersecurity training, verification, and range-operations platform where students practice offensive exploitation and defensive remediation against a live, deliberately vulnerable **Damn Vulnerable Web Application (DVWA)** instance running inside isolated Docker containers.

---

## 1. System Architecture & Runtime Planes

| Plane | Service | Port / Binding | Role |
| :--- | :--- | :--- | :--- |
| **Frontend Console & 3D Hub** | React 19 + Vite + Tailwind CSS + Three.js | `http://localhost:5173` | Archival War-Room consoles, Matter.js auth stage, and Three.js + GSAP 3D Mission Hub |
| **Control Plane API** | FastAPI (Python) | `http://localhost:8000` | Auth/JWT/CSRF enforcement, DVWA proxy/replay engine, curriculum tracks, and audit telemetry |
| **Application Database** | PostgreSQL 16 (`cyberforge`) | `127.0.0.1:5432` (or `:5433` host alias) on `app_internal` | Persists the 8 frozen relational tables (`admin`, `moderator`, `attacker`, `defender`, `challenges`, `attempts`, `defenses`, `alerts`) |
| **Vulnerable Target** | DVWA (`vulnerables/web-dvwa`) + MariaDB 10.4 | `127.0.0.1:8081` (`3306` internal) on `range_isolated` | Live PHP/MySQL target evaluated across `low`, `medium`, `high`, and `impossible` security tiers |

---

## 2. Four-Persona Experience & Workflows

CyberForge separates offensive, defensive, instructional, and governance responsibilities across four distinct personas:

1. **Attacker (Red Team Learner):**
   - **3D Mission Hub (`RoleLandingPage.jsx`):** On login or registration, learners enter a live Three.js (`AttackerParticles`) + GSAP ScrollTrigger 3D mission gallery displaying all live DVWA modules with `SOLVED` / `ATTEMPTED` / `READY` states, `L / M / H` stage indicators, and a one-click **`Continue Mission ->`** launcher.
   - **Offensive Studio (`AttackerConsole.jsx`):** A zero-scroll single-frame (`100dvh`) 50/50 workbench pairing a **Warm Archival Drafting Deck** on the left (Payload Composer, 2-tier Socratic non-spoiler hints, `PacketBeam` execution trace, `VerdictStamp` reward seal, live DVWA HTTP evidence terminal, and `Escalate Tier` / `Next Target` progression) with a **Recessed Darkroom Terminal** on the right (4-tier PHP Source inspector, Live HTTP Wire, and `LiveSinkVisualizer`).

2. **Defender (Blue Team / SOC Learner):**
   - **3D Mission Hub (`RoleLandingPage.jsx`):** Mirrors the 3D WebGL mission hub (`DefenderParticles`) with `BLOCKED` / `EXPOSED` / `PENDING` readiness indicators.
   - **Defensive Hardening Studio (`DefenderConsole.jsx`):** Pairs a **Warm Archival Drafting Deck** on the left (4-tier DVWA hardening selector `low` / `medium` / `high` / `impossible`, mandatory pre-replay **Patch Quiz** via `grade_patch_choice`, live replay of the challenge's `reference_payload`, before-and-after verdict, OWASP root-cause debrief, and **Incident Alerts** triage) with a **Recessed Darkroom Terminal** on the right (`low.php` vs hardened `impossible.php` PHP source inspection, Live HTTP Wire, and `LiveSinkVisualizer`).

3. **Moderator (Instructor / Range Operator):**
   - **Range Operations Command (`ModeratorConsole.jsx`):** Single-frame executive overview with 4 KPI counters, an interactive Red vs Blue Challenge Balance Matrix (`8` rows/page), live signal telemetry bar + latest 6 range events, paginated Challenge Arsenal CRUD (`Deploy Challenge`, edit, retire with `.cf-darkroom` reference vectors), paginated Red Team & Blue Team operator management, SOC Activity Log triage with payload inspection, and DDE-safe authenticated CSV audit export (`/api/reports/export`).

4. **Admin (Platform Owner):**
   - **Root Governance Control Plane (`AdminConsole.jsx`):** Single-frame platform overview with an interactive Cohort Distribution Bar (Moderators / Attackers / Defenders), Moderator Workload Oversight cards, live Infrastructure Topology diagram, paginated Moderator Directory (provision, inspect, rotate credentials, remove), and an Infrastructure & Schema Ledger view covering PostgreSQL `:5433`, FastAPI `:8000`, DVWA `:8081`, all 8 PostgreSQL tables, and an embedded Darkroom Endpoint Sheet.

---

## 3. Full 14-Module DVWA Curriculum & 4-Tier Escalation

CyberForge seeds and synchronizes all **14 canonical DVWA vulnerability modules** organized across **4 OWASP Learning Tracks**:

| Track | Focus | DVWA Modules |
| :--- | :--- | :--- |
| **Track I · Injection Mastery** | String, blind boolean, and OS shell sinks | `sqli`, `sqli_blind`, `exec` |
| **Track II · Client-Side & Browser Exploitation** | Reflected, stored, DOM, CSP, and JS token trust | `xss_r`, `xss_s`, `xss_d`, `csp`, `javascript` |
| **Track III · Auth, Session & Workflow Abuse** | Weak credentials, predictable IDs, CSRF, CAPTCHA | `brute`, `weak_id`, `csrf`, `captcha` |
| **Track IV · Server & File Takeover** | Path traversal and file upload filter bypasses | `fi`, `upload` |

- **Scoring Model:** Difficulty base points (`Easy = 50`, `Medium = 100`, `Hard = 250`) multiplied by DVWA tier (`low = 1.0x`, `medium = 1.5x`, `high = 2.0x`), with server-side anti-farming locking (`score_earned = 0` on repeat solves/verifications).
- **Non-Spoiler Pedagogy:** Attackers never receive `reference_payload` from `/api/challenges` or `/api/tracks` (`reference_payload=None` redaction), and Defender `patch_quiz` choices never expose `correct_option_id` before submission.

---

## 4. Frozen 8-Table Relational Model (`backend/models.py`)

All relationships point up the governance hierarchy; Attacker and Defender accounts are strictly decoupled and intersect only at `challenges`:

1. `admin` (`admin_id`, `username`, `email`, `password`, `created_at`)
2. `moderator` (`moderator_id`, `admin_id`, `username`, `email`, `password`, `created_at`)
3. `attacker` (`attacker_id`, `moderator_id`, `username`, `email`, `password`, `created_at`)
4. `defender` (`defender_id`, `moderator_id`, `username`, `email`, `password`, `created_at`)
5. `challenges` (`challenge_id`, `moderator_id`, `title`, `vulnerability_type`, `difficulty`, `dvwa_page_ref`, `reference_payload`)
6. `attempts` (`attempt_id`, `attacker_id`, `challenge_id`, `payload_used`, `status`, `timestamp`, `score_earned`)
7. `defenses` (`defense_id`, `defender_id`, `challenge_id`, `security_level_applied`, `verified`, `timestamp`, `score_earned`)
8. `alerts` (`alert_id`, `challenge_id`, `alert_type`, `message`, `timestamp`)

---

## 5. Seven Defense-in-Depth Security Rings

Every endpoint and console action upholds all 7 security rings:

1. **Ring 1 — Transport, Edge & Headers:** Security middleware wrapped inside outermost `CORSMiddleware` (including 500 error fallback), strict `CSP`, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `COOP`, `CORP`, `no-store` on `/api/auth/*` and `/api/reports/*`, disabled OpenAPI docs by default, and `405` on method-override headers.
2. **Ring 2 — Session, JWT & Cookies:** HS256-only JWTs (`alg=HS256`, `typ=JWT`) with `pwd_fp` hash binding, ephemeral `>=32`-char dev secret fallback, `HttpOnly` + `SameSite=Lax` path-scoped cookies, single-use refresh rotation with family reuse revocation, timing-safe `dummy_verify_password`, `BoundedSemaphore(8)` around 12-round bcrypt, and `10–72` UTF-8 byte strong password validation.
3. **Ring 3 — Triple-Layer CSRF:** `Sec-Fetch-Site: cross-site` rejection, `Origin`/`Referer` allowlist against `CORS_ORIGINS`, and `hmac.compare_digest` double-submit `X-CyberForge-CSRF` header vs `cyberforge_csrf` cookie validation.
4. **Ring 4 — Strict RBAC, Anti-IDOR & Anti-Spoiler:** `get_current_user` / `require_roles` on every `/api/*` route, `403` + security strike on cross-user IDOR probes, and `reference_payload=None` redaction for attackers.
5. **Ring 5 — Input & Injection Hygiene:** `ConfigDict(extra="forbid")` mass-assignment guard (`422` + strike), SSRF-safe `validate_dvwa_page_ref`, `4000`-char payload cap + NUL/CRLF guards, and `sanitize_csv_cell` DDE formula neutralization (`=`, `+`, `-`, `@`, `\t`, `\r`, `\n`) on CSV exports.
6. **Ring 6 — Rate Limits, IP Jail, Canary & Anti-Farming:** Login/register/submission rate limits, rolling `600s` IP strike jail (`429` + `Retry-After`), canary recon traps (`RECON_BLOCKED` + quiet `404`), DVWA concurrency semaphores (`acquire_dvwa_slot`), and transactional `.with_for_update()` anti-farming locks.
7. **Ring 7 — Container Isolation & Error Hygiene:** Split `app_internal` and `range_isolated` Docker networks, `127.0.0.1` port bindings, `no-new-privileges:true`, resource caps (`pids_limit: 128`, `mem_limit: 512m`, `cpus: 1.0`), `MAX_DVWA_RESPONSE_BYTES`, `follow_redirects=False`, and opaque `error_id` `500` responses.
