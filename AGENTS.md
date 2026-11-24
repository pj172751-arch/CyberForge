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
