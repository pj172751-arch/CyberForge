/**
 * CyberForge Locked Database Model (8 Tables)
 * Strictly matches Section 4 of developer handoff.
 * 
 * 1. admin
 * 2. moderator
 * 3. attacker
 * 4. defender
 * 5. challenges
 * 6. attempts
 * 7. defenses
 * 8. alerts
 */

export const INITIAL_ADMIN = [
  {
    admin_id: 1,
    username: "sysadmin",
    email: "admin@cyberforge.local",
    password: "$2b$12$e80b...[bcrypt_hash]",
    created_at: "2026-08-01 09:00:00"
  }
];

export const INITIAL_MODERATORS = [
  {
    moderator_id: 101,
    admin_id: 1,
    username: "mod_secops",
    email: "secops@cyberforge.local",
    password: "$2b$12$f91c...[bcrypt_hash]",
    created_at: "2026-08-10 10:15:00"
  },
  {
    moderator_id: 102,
    admin_id: 1,
    username: "mod_vanguard",
    email: "vanguard@cyberforge.local",
    password: "$2b$12$g82d...[bcrypt_hash]",
    created_at: "2026-08-15 14:30:00"
  },
  {
    moderator_id: 103,
    admin_id: 1,
    username: "mod_sentinel",
    email: "sentinel@cyberforge.local",
    password: "$2b$12$h73e...[bcrypt_hash]",
    created_at: "2026-09-01 11:00:00"
  }
];

export const INITIAL_ATTACKERS = [
  {
    attacker_id: 201,
    moderator_id: 101,
    username: "red_shadow",
    email: "shadow@attacker.lab",
    password: "$2b$12$a1b2...[bcrypt_hash]",
    created_at: "2026-09-05 13:45:00"
  },
  {
    attacker_id: 202,
    moderator_id: 101,
    username: "byte_bandit",
    email: "bandit@attacker.lab",
    password: "$2b$12$b2c3...[bcrypt_hash]",
    created_at: "2026-09-12 16:20:00"
  },
  {
    attacker_id: 203,
    moderator_id: 102,
    username: "zero_day",
    email: "zeroday@attacker.lab",
    password: "$2b$12$c3d4...[bcrypt_hash]",
    created_at: "2026-09-20 08:30:00"
  }
];

export const INITIAL_DEFENDERS = [
  {
    defender_id: 301,
    moderator_id: 101,
    username: "blue_shield",
    email: "shield@defender.lab",
    password: "$2b$12$d4e5...[bcrypt_hash]",
    created_at: "2026-09-05 14:00:00"
  },
  {
    defender_id: 302,
    moderator_id: 101,
    username: "iron_wall",
    email: "ironwall@defender.lab",
    password: "$2b$12$e5f6...[bcrypt_hash]",
    created_at: "2026-09-15 11:10:00"
  },
  {
    defender_id: 303,
    moderator_id: 102,
    username: "cyber_warden",
    email: "warden@defender.lab",
    password: "$2b$12$f6g7...[bcrypt_hash]",
    created_at: "2026-09-22 17:45:00"
  }
];

/**
 * Table 5: challenges
 * Difficulty maps to point values:
 * Low = 100 pts, Medium = 250 pts, High = 500 pts, Impossible = 1000 pts
 */
export const INITIAL_CHALLENGES = [
  {
    challenge_id: 1,
    moderator_id: 101,
    title: "Broken Login",
    vulnerability_type: "Authentication Bypass",
    difficulty: "Low",
    dvwa_page_ref: "/vulnerabilities/brute/",
    reference_payload: "' OR '1'='1' --"
  },
  {
    challenge_id: 2,
    moderator_id: 101,
    title: "Reflected XSS",
    vulnerability_type: "Cross-Site Scripting",
    difficulty: "Low",
    dvwa_page_ref: "/vulnerabilities/xss_r/",
    reference_payload: "<script>alert(document.cookie)</script>"
  },
  {
    challenge_id: 3,
    moderator_id: 101,
    title: "Command Injection",
    vulnerability_type: "OS Command Execution",
    difficulty: "Medium",
    dvwa_page_ref: "/vulnerabilities/exec/",
    reference_payload: "127.0.0.1; cat /etc/passwd"
  },
  {
    challenge_id: 4,
    moderator_id: 101,
    title: "File Disclosure",
    vulnerability_type: "Local File Inclusion (LFI)",
    difficulty: "Medium",
    dvwa_page_ref: "/vulnerabilities/fi/?page=",
    reference_payload: "../../../../etc/passwd"
  },
  {
    challenge_id: 5,
    moderator_id: 102,
    title: "SQL Injection",
    vulnerability_type: "SQLi Database Extraction",
    difficulty: "Medium",
    dvwa_page_ref: "/vulnerabilities/sqli/",
    reference_payload: "1' UNION SELECT null, user, password FROM users -- "
  },
  {
    challenge_id: 6,
    moderator_id: 102,
    title: "Web Shell Upload",
    vulnerability_type: "Arbitrary File Upload",
    difficulty: "High",
    dvwa_page_ref: "/vulnerabilities/upload/",
    reference_payload: "shell.php.jpg"
  },
  {
    challenge_id: 7,
    moderator_id: 102,
    title: "CSRF Token Bypass",
    vulnerability_type: "Cross-Site Request Forgery",
    difficulty: "High",
    dvwa_page_ref: "/vulnerabilities/csrf/",
    reference_payload: "http://dvwa/vulnerabilities/csrf/?password_new=admin&password_conf=admin&Change=Change"
  },
  {
    challenge_id: 8,
    moderator_id: 103,
    title: "Insecure Deserialization",
    vulnerability_type: "Object Injection",
    difficulty: "High",
    dvwa_page_ref: "/vulnerabilities/object_injection/",
    reference_payload: "O:8:\"PHPObject\":1:{s:4:\"data\";s:10:\"system_cmd\";}"
  },
  {
    challenge_id: 9,
    moderator_id: 103,
    title: "SSRF Explorer",
    vulnerability_type: "Server-Side Request Forgery",
    difficulty: "High",
    dvwa_page_ref: "/vulnerabilities/ssrf/",
    reference_payload: "http://169.254.169.254/latest/meta-data/"
  },
  {
    challenge_id: 10,
    moderator_id: 103,
    title: "Final Breach",
    vulnerability_type: "Privilege Escalation",
    difficulty: "Impossible",
    dvwa_page_ref: "/vulnerabilities/admin_escalation/",
    reference_payload: "SUID_BINARY_OVERRIDE_0x99"
  }
];

export const INITIAL_ATTEMPTS = [
  {
    attempt_id: 1001,
    attacker_id: 201,
    challenge_id: 1,
    payload_used: "admin' --",
    status: "SUCCESS",
    timestamp: "2026-10-18 10:24:11",
    score_earned: 100
  },
  {
    attempt_id: 1002,
    attacker_id: 201,
    challenge_id: 2,
    payload_used: "<script>alert(1)</script>",
    status: "SUCCESS",
    timestamp: "2026-10-19 14:12:05",
    score_earned: 100
  },
  {
    attempt_id: 1003,
    attacker_id: 202,
    challenge_id: 3,
    payload_used: "127.0.0.1 && whoami",
    status: "SUCCESS",
    timestamp: "2026-10-20 09:15:33",
    score_earned: 250
  },
  {
    attempt_id: 1004,
    attacker_id: 201,
    challenge_id: 4,
    payload_used: "/etc/hosts",
    status: "FAILED",
    timestamp: "2026-10-21 16:45:00",
    score_earned: 0
  },
  {
    attempt_id: 1005,
    attacker_id: 203,
    challenge_id: 5,
    payload_used: "' OR 1=1 #",
    status: "SUCCESS",
    timestamp: "2026-10-22 18:02:19",
    score_earned: 250
  }
];

export const INITIAL_DEFENSES = [
  {
    defense_id: 2001,
    defender_id: 301,
    challenge_id: 1,
    security_level_applied: "High",
    verified: true,
    timestamp: "2026-10-18 11:30:00",
    score_earned: 150
  },
  {
    defense_id: 2002,
    defender_id: 301,
    challenge_id: 2,
    security_level_applied: "Medium",
    verified: true,
    timestamp: "2026-10-19 16:00:00",
    score_earned: 150
  },
  {
    defense_id: 2003,
    defender_id: 302,
    challenge_id: 3,
    security_level_applied: "Low",
    verified: false,
    timestamp: "2026-10-20 10:45:00",
    score_earned: 0
  },
  {
    defense_id: 2004,
    defender_id: 301,
    challenge_id: 5,
    security_level_applied: "High",
    verified: true,
    timestamp: "2026-10-23 09:20:00",
    score_earned: 300
  }
];

export const INITIAL_ALERTS = [
  {
    alert_id: 501,
    challenge_id: 3,
    alert_type: "EXPLOIT_DETECTED",
    message: "High frequency OS command separator execution detected on /vulnerabilities/exec/",
    timestamp: "2026-10-20 09:16:00"
  },
  {
    alert_id: 502,
    challenge_id: 1,
    alert_type: "BRUTE_FORCE",
    message: "Multiple failed authentication requests followed by SQL syntax bypass signature",
    timestamp: "2026-10-20 12:44:18"
  },
  {
    alert_id: 503,
    challenge_id: 5,
    alert_type: "UNION_QUERY_INJECTION",
    message: "Database schema reconnaissance probe identified on SQLi endpoint",
    timestamp: "2026-10-22 18:03:00"
  },
  {
    alert_id: 504,
    challenge_id: 6,
    alert_type: "MALICIOUS_MIME_UPLOAD",
    message: "Polyglot PHP extension file upload attempted on /vulnerabilities/upload/",
    timestamp: "2026-10-23 07:11:45"
  }
];

/**
 * Derived helpers (per Section 10)
 */
export function getDifficultyPoints(difficulty) {
  switch (difficulty) {
    case 'Low': return 100;
    case 'Medium': return 250;
    case 'High': return 500;
    case 'Impossible': return 1000;
    default: return 100;
  }
}

export function getDifficultyBadgeColor(difficulty) {
  switch (difficulty) {
    case 'Low': return 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10';
    case 'Medium': return 'border-amber-500/40 text-amber-400 bg-amber-500/10';
    case 'High': return 'border-rose-500/40 text-rose-400 bg-rose-500/10';
    case 'Impossible': return 'border-purple-500/40 text-purple-400 bg-purple-500/10';
    default: return 'border-zinc-700 text-zinc-400 bg-zinc-800';
  }
}

export function getSecurityLevelBadge(level) {
  switch (level) {
    case 'Low': return 'border-rose-500/40 text-rose-400 bg-rose-500/10';
    case 'Medium': return 'border-amber-500/40 text-amber-400 bg-amber-500/10';
    case 'High': return 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10';
    case 'Impossible': return 'border-cyan-500/40 text-cyan-accent bg-cyan-500/10';
    default: return 'border-zinc-700 text-zinc-400 bg-zinc-800';
  }
}
