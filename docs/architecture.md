# CyberForge System Architecture

## 1. High-Level Component Architecture

```
+-----------------------------------------------------------+
|                   Client Browser                          |
|         React + Vite (localhost:5173)                     |
+-----------------------------+-----------------------------+
                              | HTTP (REST)
                              v
+-----------------------------------------------------------+
|                   FastAPI Backend                         |
|         Uvicorn ASGI Server (localhost:8000)              |
|                                                           |
|  [/health]  [/health/db]  [/api/auth/login]               |
|  [/api/challenges]  [/api/attempts]  [/api/defenses]      |
|  [/api/alerts]  [/api/admin/stats]                        |
+--------------+------------------------------+-------------+
               |                              |
               | SQLAlchemy ORM               | HTTP Requests
               v                              v
+-------------------------------+  +------------------------+
|      PostgreSQL 16            |  |      DVWA Container    |
|      Service: app_db          |  |      (localhost:8081)  |
|      Port: 5432               |  +-----------+------------+
|      DB: cyberforge           |              |
|                               |              v
|  8 Tables:                    |  +------------------------+
|  - admin, moderator           |  |      MariaDB 10.4      |
|  - attacker, defender         |  |      Service: dvwa_db  |
|  - challenges, attempts       |  |      Internal: 3306    |
|  - defenses, alerts           |  +------------------------+
+-------------------------------+
```

## 2. Infrastructure Services (Docker Compose)
1. **app_db**:
   - Image: `postgres:16`
   - Ports: `5432:5432`
   - Purpose: Persistent storage for platform accounts, challenges, telemetry attempts, defenses, and alerts.
2. **dvwa_db**:
   - Image: `mariadb:10.4`
   - Purpose: Database backend for the deliberately vulnerable web application.
3. **dvwa**:
   - Image: `vulnerables/web-dvwa`
   - Ports: `8081:80`
   - Purpose: Sandbox vulnerability target for attacker exploitation and defender hardening practice.

## 3. Account Roles & Security
- **Admin**: Manages Moderator accounts and monitors platform totals.
- **Moderator**: Curates challenges, supervises student cohorts, and audits activity.
- **Attacker**: Explores vulnerabilities, crafts payloads, and executes exploits against target exercises.
- **Defender**: Analyzes vulnerable configurations, raises DVWA security levels, and verifies remediation against reference vectors.
