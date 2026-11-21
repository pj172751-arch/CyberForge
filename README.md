# CyberForge // Frontend Console

> **Semester 5 PROJECT-I (Diploma Submission - LJ Polytechnic)**  
> **Team:** Jeet (System & DFD/ER), Pooja (Frontend & UI), Dev (Backend & DB)

CyberForge is a cybersecurity training and attack-defense platform built with React, Vite, and Tailwind CSS. The interface delivers a dark terminal/security-console aesthetic strictly aligned with the locked 8-table relational database schema and DVWA 1.10 target bridge.

---

## 🛡️ Core System Actors

1. **Admin**: Oversight only. Manages Moderator accounts (`moderator` table) and platform aggregate metrics.
2. **Moderator**: Day-to-day operations. Audits activity logs across `attempts`, `defenses`, and `alerts` tables.
3. **Attacker**: Explores active challenge vectors, enters exploit payloads, and receives simulated execution output logged to `attempts`.
4. **Defender**: Hardens DVWA challenge configurations (`Low`, `Medium`, `High`, `Impossible`). Evaluates security via automated replay of `challenges.reference_payload` logged to `defenses`.

---

## 📊 Database Schema (Strictly 8 Tables)

- `admin` (admin_id, username, email, password, created_at)
- `moderator` (moderator_id, admin_id, username, email, password, created_at)
- `attacker` (attacker_id, moderator_id, username, email, password, created_at)
- `defender` (defender_id, moderator_id, username, email, password, created_at)
- `challenges` (challenge_id, moderator_id, title, vulnerability_type, difficulty, dvwa_page_ref, reference_payload)
- `attempts` (attempt_id, attacker_id, challenge_id, payload_used, status, timestamp, score_earned)
- `defenses` (defense_id, defender_id, challenge_id, security_level_applied, verified, timestamp, score_earned)
- `alerts` (alert_id, challenge_id, alert_type, message, timestamp)

---

## 🖥️ The 8 Implemented Screens (Chapter 5)

| # | Screen | Component | Description |
|---|---|---|---|
| 1 | **Login** | `src/pages/Login.jsx` | Role tabs (Admin / Mod / Attacker / Defender), sample credential auto-fill |
| 2 | **Attacker Dashboard** | `src/pages/AttackerDashboard.jsx` | "Active Challenges" feed-stream list, category, difficulty, points |
| 3 | **Attacker Attempt** | `src/pages/AttackerAttempt.jsx` | Payload editor, live simulated DVWA response console, execution history |
| 4 | **Defender Dashboard** | `src/pages/DefenderDashboard.jsx` | Target defenses, security level elevator, reference payload replay verification |
| 5 | **Moderator Activity** | `src/pages/ModeratorActivity.jsx` | Unified audit feed across `attempts`, `defenses`, and `alerts` tables |
| 6 | **Admin Dashboard** | `src/pages/AdminDashboard.jsx` | Moderator oversight table, provision moderator modal, aggregate counters |
| 7 | **Shared Profile** | `src/pages/Profile.jsx` | Operator identity, derived performance telemetry, credential updates |
| 8 | **Shared Settings** | `src/pages/Settings.jsx` | Locked `#0A0A0B` dark theme, terminal audio toggle, timeout, DVWA bridge |

---

## 🚀 Development & Build

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Build for production
npm run build
```
