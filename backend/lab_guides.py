from copy import deepcopy
from typing import Dict, Optional, Tuple


LAB_GUIDES: Dict[str, dict] = {
    "sqli": {
        "owasp_category": "A03:2021 · Injection",
        "sink_pattern": "mysqli_query",
        "hints": [
            {
                "tier": 1,
                "label": "Concept",
                "text": "The user_id input is concatenated directly into a single-quoted SQL WHERE clause, letting you alter query logic.",
            },
            {
                "tier": 2,
                "label": "Syntax Clue",
                "text": "Close the string literal with a single quote and introduce a tautology (e.g. ' OR ...) so every row evaluates true.",
            },
        ],
        "debrief": {
            "root_cause": "Untrusted input from $_REQUEST['id'] is interpolated directly into the SQL string instead of bound as a parameter.",
            "impact": "Attackers can dump the entire users table, enumerate schema metadata, and extract password hashes.",
            "prevention": "Use PDO prepared statements with bound integer parameters and enforce is_numeric() validation.",
        },
        "patch_quiz": {
            "prompt": "Which code change eliminates SQL injection at the root cause in low.php?",
            "correct_option_id": "opt_b",
            "options": [
                {
                    "id": "opt_a",
                    "label": "Strip single quotes with str_replace",
                    "code_snippet": "$id = str_replace(\"'\", \"\", $_GET['id']);\n$query = \"SELECT first_name, last_name FROM users WHERE user_id = '$id';\";",
                    "explanation": "Blocklist string replacement is fragile and bypassable when numeric/unquoted contexts or encoding tricks apply.",
                },
                {
                    "id": "opt_b",
                    "label": "Bind parameters via PDO prepared statement",
                    "code_snippet": "$stmt = $db->prepare('SELECT first_name, last_name FROM users WHERE user_id = :id LIMIT 1;');\n$stmt->bindParam(':id', $id, PDO::PARAM_INT);\n$stmt->execute();",
                    "explanation": "Prepared statements separate SQL structure from user data so injected syntax is never parsed as SQL.",
                },
                {
                    "id": "opt_c",
                    "label": "Suppress mysqli error messages with @",
                    "code_snippet": "$result = @mysqli_query($conn, $query);",
                    "explanation": "Hiding SQL errors only prevents error-based leaks; the query itself remains fully injectable.",
                },
            ],
        },
    },
    "xss_r": {
        "owasp_category": "A03:2021 · Injection",
        "sink_pattern": "Hello ",
        "hints": [
            {
                "tier": 1,
                "label": "Concept",
                "text": "The 'name' query parameter is echoed raw inside an HTML <pre> block with X-XSS-Protection disabled.",
            },
            {
                "tier": 2,
                "label": "Syntax Clue",
                "text": "Inject an HTML element or inline script tag (e.g. <script>...</script> or an <img onerror=...>) into the name parameter.",
            },
        ],
        "debrief": {
            "root_cause": "$_GET['name'] is concatenated directly into HTML output without context-aware entity encoding.",
            "impact": "Crafted links execute arbitrary JavaScript in a victim's browser session, enabling cookie theft and forged actions.",
            "prevention": "Encode all reflected output with htmlspecialchars($name, ENT_QUOTES, 'UTF-8') and enforce a strict CSP.",
        },
        "patch_quiz": {
            "prompt": "Which remediation properly neutralizes reflected XSS in HTML body context?",
            "correct_option_id": "opt_a",
            "options": [
                {
                    "id": "opt_a",
                    "label": "Encode HTML special characters with htmlspecialchars",
                    "code_snippet": "$name = htmlspecialchars($_GET['name'], ENT_QUOTES, 'UTF-8');\necho \"<pre>Hello {$name}</pre>\";",
                    "explanation": "htmlspecialchars converts <, >, quotes, and & into safe HTML entities so the browser renders text, not markup.",
                },
                {
                    "id": "opt_b",
                    "label": "Strip literal '<script>' substring",
                    "code_snippet": "$name = str_replace('<script>', '', $_GET['name']);",
                    "explanation": "Case variations (<ScRiPt>) or event handlers (<img onerror=...>) trivially bypass literal <script> stripping.",
                },
                {
                    "id": "opt_c",
                    "label": "Enable X-XSS-Protection header only",
                    "code_snippet": "header('X-XSS-Protection: 1; mode=block');",
                    "explanation": "Legacy browser XSS auditors are deprecated and removed in modern browsers; output encoding is required.",
                },
            ],
        },
    },
    "xss_s": {
        "owasp_category": "A03:2021 · Injection",
        "sink_pattern": "INSERT INTO guestbook",
        "hints": [
            {
                "tier": 1,
                "label": "Concept",
                "text": "Guestbook entries are saved to MySQL and rendered unescaped to every visitor who loads the page.",
            },
            {
                "tier": 2,
                "label": "Syntax Clue",
                "text": "Submit an executable HTML/JS snippet (such as <script>...</script> or <svg onload=...>) as the guestbook message.",
            },
        ],
        "debrief": {
            "root_cause": "Both message and name fields are persisted without HTML entity encoding and rendered raw in the guestbook view.",
            "impact": "Every user viewing the guestbook executes the stored script automatically, enabling persistent session hijacking.",
            "prevention": "Apply htmlspecialchars() on all stored user fields, use prepared SQL statements, and enforce anti-CSRF tokens.",
        },
        "patch_quiz": {
            "prompt": "Which server-side fix prevents persistent XSS in the guestbook handler?",
            "correct_option_id": "opt_c",
            "options": [
                {
                    "id": "opt_a",
                    "label": "Rely on HTML maxlength='50' on the textarea",
                    "code_snippet": "<textarea name=\"mtxMessage\" maxlength=\"50\"></textarea>",
                    "explanation": "Client-side attributes are trivially bypassed with direct POST requests and do not sanitize markup.",
                },
                {
                    "id": "opt_b",
                    "label": "Filter '<script' from txtName only",
                    "code_snippet": "$name = preg_replace('/<script/i', '', $_POST['txtName']);",
                    "explanation": "Filtering only one field or one tag leaves mtxMessage and non-script event handlers vulnerable.",
                },
                {
                    "id": "opt_c",
                    "label": "Encode both message and name + bind SQL parameters",
                    "code_snippet": "$message = htmlspecialchars(trim($_POST['mtxMessage']), ENT_QUOTES, 'UTF-8');\n$name = htmlspecialchars(trim($_POST['txtName']), ENT_QUOTES, 'UTF-8');\n$stmt = $db->prepare('INSERT INTO guestbook (comment, name) VALUES (:m, :n)');",
                    "explanation": "Encoding both fields and using prepared statements prevents both stored XSS and secondary SQL injection.",
                },
            ],
        },
    },
    "xss_d": {
        "owasp_category": "A03:2021 · Injection",
        "sink_pattern": "No protections",
        "hints": [
            {
                "tier": 1,
                "label": "Concept",
                "text": "Client-side JavaScript reads the 'default' parameter from document.location.href and writes it into the DOM with document.write().",
            },
            {
                "tier": 2,
                "label": "Syntax Clue",
                "text": "Pass HTML/script markup in the 'default' parameter; decodeURI() turns encoded characters back into live markup.",
            },
        ],
        "debrief": {
            "root_cause": "Untrusted URL data flows into document.write() after decodeURI() without allowlist validation or DOM text escaping.",
            "impact": "Malicious links execute script solely on the client side, bypassing many server-side WAF inspections.",
            "prevention": "Enforce a strict server-side language allowlist and use safe DOM APIs like textContent instead of document.write().",
        },
        "patch_quiz": {
            "prompt": "Which remediation blocks DOM-based XSS in the language selector?",
            "correct_option_id": "opt_a",
            "options": [
                {
                    "id": "opt_a",
                    "label": "Allowlist valid languages + avoid decodeURI/document.write",
                    "code_snippet": "if (!in_array($_GET['default'], ['English','French','German','Spanish'], true)) {\n  header('Location: ?default=English'); exit;\n}\n// Client: option.textContent = lang;",
                    "explanation": "Combining strict server allowlisting with safe DOM textContent eliminates both injection and client decoding bypasses.",
                },
                {
                    "id": "opt_b",
                    "label": "Block literal '<script' with stripos()",
                    "code_snippet": "if (stripos($_GET['default'], '<script') !== false) { exit; }",
                    "explanation": "An attacker can still inject <img src=x onerror=alert(1)> or break out of the option attribute.",
                },
                {
                    "id": "opt_c",
                    "label": "Base64-encode the page title",
                    "code_snippet": "$page['title'] = base64_encode($page['title']);",
                    "explanation": "The DOM sink is document.location.href inside the <select> script, unrelated to the page title.",
                },
            ],
        },
    },
    "fi": {
        "owasp_category": "A01:2021 · Broken Access Control",
        "sink_pattern": "_GET",
        "hints": [
            {
                "tier": 1,
                "label": "Concept",
                "text": "The 'page' parameter is passed straight into PHP include() without path validation or an allowlist.",
            },
            {
                "tier": 2,
                "label": "Syntax Clue",
                "text": "Use dot-dot-slash (../) directory traversal segments to escape the web root and read /etc/passwd.",
            },
        ],
        "debrief": {
            "root_cause": "User-controlled path $_GET['page'] is passed directly to include($file) without allowlist verification.",
            "impact": "Attackers can disclose arbitrary server files (/etc/passwd, config secrets) or escalate to RCE via log poisoning.",
            "prevention": "Replace dynamic file paths with an explicit strict allowlist of permitted template names.",
        },
        "patch_quiz": {
            "prompt": "Which change completely prevents Local File Inclusion (LFI)?",
            "correct_option_id": "opt_b",
            "options": [
                {
                    "id": "opt_a",
                    "label": "Single-pass str_replace('../', '', $file)",
                    "code_snippet": "$file = str_replace(['../', '..\\\\'], '', $_GET['page']);",
                    "explanation": "Non-recursive stripping is bypassed with nested sequences like ....// which collapse into ../.",
                },
                {
                    "id": "opt_b",
                    "label": "Enforce strict allowlist of exact page filenames",
                    "code_snippet": "$allowed = ['include.php', 'file1.php', 'file2.php', 'file3.php'];\nif (!in_array($_GET['page'], $allowed, true)) {\n  die('ERROR: File not found!');\n}",
                    "explanation": "Strict allowlisting guarantees only known safe templates can ever be included regardless of traversal tricks.",
                },
                {
                    "id": "opt_c",
                    "label": "Check fnmatch('file*', $file)",
                    "code_snippet": "if (!fnmatch('file*', $file)) { exit; }",
                    "explanation": "Attackers can still abuse file:// URI wrappers (e.g. file:///etc/passwd) to bypass a prefix wildcard.",
                },
            ],
        },
    },
    "exec": {
        "owasp_category": "A03:2021 · Injection",
        "sink_pattern": "shell_exec",
        "hints": [
            {
                "tier": 1,
                "label": "Concept",
                "text": "Your input is appended to a system ping command executed inside shell_exec(), allowing command chaining.",
            },
            {
                "tier": 2,
                "label": "Syntax Clue",
                "text": "Provide a valid IP followed by a shell separator (; , && , or |) and a recon command like id.",
            },
        ],
        "debrief": {
            "root_cause": "User input $_REQUEST['ip'] is concatenated directly into shell_exec('ping -c 4 ' . $target).",
            "impact": "Full Remote Code Execution (RCE) as the web server user, compromising the host container and secrets.",
            "prevention": "Validate strict 4-octet IP format (filter_var FILTER_VALIDATE_IP) and avoid invoking a shell interpreter.",
        },
        "patch_quiz": {
            "prompt": "Which fix prevents OS command injection in the ping utility?",
            "correct_option_id": "opt_c",
            "options": [
                {
                    "id": "opt_a",
                    "label": "Blacklist ';' and '&&' with str_replace",
                    "code_snippet": "$target = str_replace([';', '&&'], '', $_REQUEST['ip']);",
                    "explanation": "Attackers can bypass partial blacklists using newlines, backticks, $(), or single pipe '|'.",
                },
                {
                    "id": "opt_b",
                    "label": "Log the IP before calling shell_exec",
                    "code_snippet": "error_log($_REQUEST['ip']);\n$cmd = shell_exec('ping -c 4 ' . $_REQUEST['ip']);",
                    "explanation": "Logging does not sanitize or restrict shell metacharacters.",
                },
                {
                    "id": "opt_c",
                    "label": "Validate strict IPv4 format before execution",
                    "code_snippet": "if (!filter_var($target, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {\n  die('ERROR: Invalid IP');\n}",
                    "explanation": "Strict IPv4 validation rejects every shell metacharacter and non-IP string before any command runs.",
                },
            ],
        },
    },
    "sqli_blind": {
        "owasp_category": "A03:2021 · Injection",
        "sink_pattern": "mysqli_query",
        "hints": [
            {
                "tier": 1,
                "label": "Concept",
                "text": "SQL errors and row values are hidden, but the page reveals a boolean oracle: whether a matching row exists.",
            },
            {
                "tier": 2,
                "label": "Syntax Clue",
                "text": "Inject a single quote and a boolean condition (e.g. 1' AND '1'='1) that keeps the query true without raising syntax errors.",
            },
        ],
        "debrief": {
            "root_cause": "Suppressing errors with @mysqli_num_rows does not stop SQL injection when $id is still interpolated into SQL.",
            "impact": "Attackers can infer database contents bit-by-bit via boolean or time-based blind extraction.",
            "prevention": "Use parameterized PDO queries and enforce numeric validation on user IDs.",
        },
        "patch_quiz": {
            "prompt": "Which change eliminates blind SQL injection even when errors are suppressed?",
            "correct_option_id": "opt_a",
            "options": [
                {
                    "id": "opt_a",
                    "label": "Use PDO prepared statement + is_numeric check",
                    "code_snippet": "if (is_numeric($id)) {\n  $stmt = $db->prepare('SELECT first_name, last_name FROM users WHERE user_id = :id LIMIT 1;');\n  $stmt->bindParam(':id', $id, PDO::PARAM_INT);\n  $stmt->execute();\n}",
                    "explanation": "Parameterized binding guarantees injected operators are treated purely as literal values.",
                },
                {
                    "id": "opt_b",
                    "label": "Suppress mysqli_error() output with @",
                    "code_snippet": "$num = @mysqli_num_rows(mysqli_query($conn, $getid));",
                    "explanation": "Boolean and time-based blind SQLi require zero error messages to exfiltrate data.",
                },
                {
                    "id": "opt_c",
                    "label": "Read id from $_COOKIE instead of $_GET",
                    "code_snippet": "$id = $_COOKIE['id'];\n$getid = \"SELECT first_name FROM users WHERE user_id = '$id'\";",
                    "explanation": "Cookies are attacker-controlled HTTP inputs; moving the source does not fix the SQL sink.",
                },
            ],
        },
    },
    "upload": {
        "owasp_category": "A04:2021 · Insecure Design",
        "sink_pattern": "move_uploaded_file",
        "hints": [
            {
                "tier": 1,
                "label": "Concept",
                "text": "The upload handler moves uploaded files directly into a web-accessible directory without verifying file type or magic bytes.",
            },
            {
                "tier": 2,
                "label": "Syntax Clue",
                "text": "Supply a probe filename carrying a server-executable extension such as .php (e.g. cf_probe.php).",
            },
        ],
        "debrief": {
            "root_cause": "Trusting client-supplied filenames and Content-Type headers allows arbitrary file types into hackable/uploads/.",
            "impact": "Uploading executable scripts under the web root grants attackers direct remote code execution.",
            "prevention": "Validate extension allowlists, verify image magic bytes via getimagesize()/re-encoding, and randomize stored filenames.",
        },
        "patch_quiz": {
            "prompt": "Which upload validation strategy blocks malicious file uploads reliably?",
            "correct_option_id": "opt_b",
            "options": [
                {
                    "id": "opt_a",
                    "label": "Check $_FILES['uploaded']['type'] == 'image/jpeg'",
                    "code_snippet": "if ($_FILES['uploaded']['type'] === 'image/jpeg') { move_uploaded_file(...); }",
                    "explanation": "The Content-Type header in multipart requests is trivial for an attacker to spoof.",
                },
                {
                    "id": "opt_b",
                    "label": "Allowlist extension + verify magic bytes + re-encode + random name",
                    "code_snippet": "if (in_array($ext, ['jpg','jpeg','png'], true) && getimagesize($tmp)) {\n  $img = imagecreatefromjpeg($tmp);\n  imagejpeg($img, $random_target_path, 100);\n}",
                    "explanation": "Re-encoding validated images under randomized filenames strips embedded payloads and prevents script execution.",
                },
                {
                    "id": "opt_c",
                    "label": "Restrict MAX_FILE_SIZE in the HTML form",
                    "code_snippet": "<input type=\"hidden\" name=\"MAX_FILE_SIZE\" value=\"100000\" />",
                    "explanation": "Client hidden form fields do not constrain file type or prevent server-side execution.",
                },
            ],
        },
    },
    "weak_id": {
        "owasp_category": "A07:2021 · Identification and Authentication Failures",
        "sink_pattern": "setcookie",
        "hints": [
            {
                "tier": 1,
                "label": "Concept",
                "text": "Clicking Generate issues a dvwaSession cookie derived from a predictable counter or timestamp instead of CSPRNG bytes.",
            },
            {
                "tier": 2,
                "label": "Syntax Clue",
                "text": "Probe the dvwaSession cookie value (e.g. Cookie: dvwaSession=1) to demonstrate sequential session prediction.",
            },
        ],
        "debrief": {
            "root_cause": "Session tokens are generated via an incrementing counter ($last_session_id++) without cryptographic randomness or cookie flags.",
            "impact": "An attacker can guess valid session IDs of active users and hijack their authenticated sessions.",
            "prevention": "Generate at least 128 bits of CSPRNG entropy (random_bytes) and set HttpOnly, Secure, and SameSite cookie attributes.",
        },
        "patch_quiz": {
            "prompt": "Which session cookie generation fix prevents session ID prediction?",
            "correct_option_id": "opt_c",
            "options": [
                {
                    "id": "opt_a",
                    "label": "Use Unix timestamp time() as cookie value",
                    "code_snippet": "setcookie('dvwaSession', time());",
                    "explanation": "Timestamps have tiny search spaces and are trivially guessed if an attacker knows login time.",
                },
                {
                    "id": "opt_b",
                    "label": "Hash sequential counter with md5($counter)",
                    "code_snippet": "setcookie('dvwaSession', md5($_SESSION['last_id']++));",
                    "explanation": "Hashing a predictable counter produces a predictable lookup table of MD5(1), MD5(2), MD5(3).",
                },
                {
                    "id": "opt_c",
                    "label": "Use CSPRNG random_bytes with Secure & HttpOnly flags",
                    "code_snippet": "$token = bin2hex(random_bytes(32));\nsetcookie('dvwaSession', $token, ['httponly' => true, 'secure' => true, 'samesite' => 'Strict']);",
                    "explanation": "Cryptographically random tokens with HttpOnly/Secure/SameSite flags resist brute-force prediction and XSS theft.",
                },
            ],
        },
    },
    "csrf": {
        "owasp_category": "A01:2021 · Broken Access Control",
        "sink_pattern": "UPDATE",
        "hints": [
            {
                "tier": 1,
                "label": "Concept",
                "text": "The password change endpoint processes GET parameters without verifying an unpredictable anti-CSRF token or current password.",
            },
            {
                "tier": 2,
                "label": "Syntax Clue",
                "text": "Forge the state-changing query string with password_new, password_conf, and Change=Change parameters.",
            },
        ],
        "debrief": {
            "root_cause": "State-changing password update executes over GET without validating a per-session anti-CSRF token or current password.",
            "impact": "Any malicious third-party page visited by a logged-in user can silently overwrite their account password.",
            "prevention": "Use POST requests, enforce synchronizer anti-CSRF tokens (checkToken), set SameSite cookies, and require current password.",
        },
        "patch_quiz": {
            "prompt": "Which defense stops Cross-Site Request Forgery on password changes?",
            "correct_option_id": "opt_a",
            "options": [
                {
                    "id": "opt_a",
                    "label": "Validate per-session anti-CSRF token + verify current password",
                    "code_snippet": "checkToken($_REQUEST['user_token'], $_SESSION['session_token'], 'index.php');\n// Also verify $pass_curr against stored user hash before UPDATE",
                    "explanation": "Unpredictable per-session tokens and current-password re-authentication block forged cross-origin requests.",
                },
                {
                    "id": "opt_b",
                    "label": "Check HTTP_REFERER substring only",
                    "code_snippet": "if (stripos($_SERVER['HTTP_REFERER'], $_SERVER['SERVER_NAME']) !== false) { ... }",
                    "explanation": "Referer checks can be bypassed via domain-in-path URLs, open redirects, or stripped referrer policies.",
                },
                {
                    "id": "opt_c",
                    "label": "Switch form method from GET to POST without a token",
                    "code_snippet": "<form method=\"POST\" action=\"/vulnerabilities/csrf/\">",
                    "explanation": "Auto-submitting cross-origin HTML forms or fetch requests easily forge POST requests without an anti-CSRF token.",
                },
            ],
        },
    },
    "brute": {
        "owasp_category": "A07:2021 · Identification and Authentication Failures",
        "sink_pattern": "SELECT",
        "hints": [
            {
                "tier": 1,
                "label": "Concept",
                "text": "The login handler has no rate limiting, account lockout, or anti-automation token to slow down credential stuffing.",
            },
            {
                "tier": 2,
                "label": "Syntax Clue",
                "text": "Submit a credential pair in username:password format (e.g. admin:password) to verify automated login access.",
            },
        ],
        "debrief": {
            "root_cause": "Authentication accepts unlimited automated GET requests without CSRF tokens, rate limits, or account lockout.",
            "impact": "Attackers can rapidly test password dictionaries and compromise accounts with weak credentials.",
            "prevention": "Enforce POST + anti-CSRF tokens, track failed login attempts with progressive lockout, and use strong password hashing.",
        },
        "patch_quiz": {
            "prompt": "Which control effectively mitigates automated credential brute-forcing?",
            "correct_option_id": "opt_b",
            "options": [
                {
                    "id": "opt_a",
                    "label": "Return a generic 'incorrect' message without rate limits",
                    "code_snippet": "echo '<pre>Username and/or password incorrect.</pre>';",
                    "explanation": "Generic errors avoid enumeration but still allow thousands of automated guesses per second.",
                },
                {
                    "id": "opt_b",
                    "label": "Enforce anti-CSRF token + failed-login lockout + prepared SQL",
                    "code_snippet": "checkToken($_REQUEST['user_token'], $_SESSION['session_token'], 'index.php');\nif ($failed_login >= 3 && time() < $timeout) { $account_locked = true; }",
                    "explanation": "Combining anti-CSRF tokens, progressive lockout, and parameterized queries stops automated brute force and SQLi.",
                },
                {
                    "id": "opt_c",
                    "label": "Hash passwords with single-round MD5",
                    "code_snippet": "$pass = md5($_GET['password']);",
                    "explanation": "Fast unsalted MD5 makes offline cracking trivial and does not throttle online login requests.",
                },
            ],
        },
    },
    "csp": {
        "owasp_category": "A05:2021 · Security Misconfiguration",
        "sink_pattern": "script-src",
        "hints": [
            {
                "tier": 1,
                "label": "Concept",
                "text": "The Content-Security-Policy header whitelists external script hosts (including pastebin.com) that anyone can publish code to.",
            },
            {
                "tier": 2,
                "label": "Syntax Clue",
                "text": "Include an external script URL hosted on one of the CSP-whitelisted domains (e.g. https://pastebin.com/raw/...).",
            },
        ],
        "debrief": {
            "root_cause": "Overly permissive Content-Security-Policy script-src whitelists third-party user-content hosts and reflects unvalidated script URLs.",
            "impact": "Attackers bypass CSP to load and execute arbitrary external JavaScript inside the application origin.",
            "prevention": "Restrict script-src to 'self' only, avoid 'unsafe-inline' and public hosting domains, and never reflect raw script URLs.",
        },
        "patch_quiz": {
            "prompt": "Which Content-Security-Policy configuration eliminates external script bypasses?",
            "correct_option_id": "opt_c",
            "options": [
                {
                    "id": "opt_a",
                    "label": "Keep pastebin.com in script-src and add 'unsafe-inline'",
                    "code_snippet": "header(\"Content-Security-Policy: script-src 'self' 'unsafe-inline' https://pastebin.com;\");",
                    "explanation": "Adding 'unsafe-inline' and public paste hosts weakens CSP even further.",
                },
                {
                    "id": "opt_b",
                    "label": "Use a hardcoded static CSP nonce across all requests",
                    "code_snippet": "header(\"Content-Security-Policy: script-src 'self' 'nonce-static123';\");",
                    "explanation": "A static nonce can be reused by any attacker who injects a <script nonce='static123'> tag.",
                },
                {
                    "id": "opt_c",
                    "label": "Restrict script-src to 'self' and avoid raw HTML reflection",
                    "code_snippet": "header(\"Content-Security-Policy: script-src 'self';\");\n$safe = htmlspecialchars($_POST['include'], ENT_QUOTES, 'UTF-8');",
                    "explanation": "Restricting script-src to 'self' blocks external script hosts and inline execution while encoding prevents injection.",
                },
            ],
        },
    },
    "captcha": {
        "owasp_category": "A04:2021 · Insecure Design",
        "sink_pattern": "passed_captcha",
        "hints": [
            {
                "tier": 1,
                "label": "Concept",
                "text": "DVWA breaks password change into two POST steps (step=1 verifies reCAPTCHA, step=2 changes the password) without tracking verified state server-side in $_SESSION.",
            },
            {
                "tier": 2,
                "label": "Syntax Clue",
                "text": "Send step=2 directly (and on Medium add passed_captcha=true; on High supply g-recaptcha-response=hidd3n_valu3 with User-Agent: reCAPTCHA).",
            },
        ],
        "debrief": {
            "root_cause": "Step 2 trusts client-submitted POST parameters (step=2, passed_captcha, or hardcoded User-Agent backdoors) instead of verifying CAPTCHA completion inside $_SESSION + CSRF token.",
            "impact": "Automated scripts can bypass bot protection completely and perform credential resets at scale.",
            "prevention": "Verify reCAPTCHA responses server-side inside a single request alongside a valid per-session anti-CSRF token.",
        },
        "patch_quiz": {
            "prompt": "Which architectural fix prevents 2-step workflow skipping and hidden backdoor bypasses in CAPTCHA?",
            "correct_option_id": "opt_b",
            "options": [
                {
                    "id": "opt_a",
                    "label": "Add a hidden form input passed_captcha=true on step 2",
                    "code_snippet": "if ($_POST['passed_captcha'] === 'true') { updatePassword(); }",
                    "explanation": "Hidden POST fields live on the client and can be trivially forged with curl or an intercepting proxy.",
                },
                {
                    "id": "opt_b",
                    "label": "Verify reCAPTCHA + anti-CSRF token server-side in a single atomic POST",
                    "code_snippet": "checkToken($_REQUEST['user_token'], $_SESSION['session_token'], 'index.php');\n$resp = recaptcha_check_answer($privkey, $_POST['g-recaptcha-response']);",
                    "explanation": "Atomic server-side CAPTCHA verification combined with synchronizer CSRF token validation eliminates step-skipping.",
                },
                {
                    "id": "opt_c",
                    "label": "Check $_SERVER['HTTP_USER_AGENT'] for a trusted verification agent",
                    "code_snippet": "if ($resp || $_SERVER['HTTP_USER_AGENT'] === 'reCAPTCHA') { ... }",
                    "explanation": "HTTP request headers such as User-Agent are completely attacker-controlled.",
                },
            ],
        },
    },
    "javascript": {
        "owasp_category": "A08:2021 · Software & Data Integrity Failures",
        "sink_pattern": "token",
        "hints": [
            {
                "tier": 1,
                "label": "Concept",
                "text": "The server relies on a secret-looking token generated inside browser JavaScript before submission—anyone reading the JS can compute the exact token for 'success'.",
            },
            {
                "tier": 2,
                "label": "Syntax Clue",
                "text": "Reverse the client-side algorithm in JS and submit phrase=success&token=<digest> (Low: md5(rot13('success')); Medium: reverse('XXsuccessXX'); High: nested sha256).",
            },
        ],
        "debrief": {
            "root_cause": "Security-critical token signing/obfuscation logic executes in untrusted client-side JavaScript where keys and algorithms are inspectable.",
            "impact": "Attackers inspect or deobfuscate client scripts to mint arbitrary signed tokens and spoof authorized requests.",
            "prevention": "Never perform security-sensitive signing or secret validation in client-side JS; enforce HMAC/state checks on the server.",
        },
        "patch_quiz": {
            "prompt": "Why does DVWA's Impossible tier explain there is no JS-side fix for client token validation?",
            "correct_option_id": "opt_a",
            "options": [
                {
                    "id": "opt_a",
                    "label": "Move token generation & validation exclusively to the server using HMAC/session state",
                    "code_snippet": "$expected = hash_hmac('sha256', $_SESSION['challenge'], $SERVER_SECRET);\nif (!hash_equals($expected, $_POST['token'])) { die('Invalid'); }",
                    "explanation": "Any secret or algorithm shipped to a browser is public; only server-held secrets prevent token forgery.",
                },
                {
                    "id": "opt_b",
                    "label": "Minify and Packer-obfuscate the JavaScript file on high security",
                    "code_snippet": "eval(function(p,a,c,k,e,r){...}); // obfuscated token generator",
                    "explanation": "Obfuscation only delays static reading; attackers simply execute or unpack the JS in DevTools or Node.",
                },
                {
                    "id": "opt_c",
                    "label": "Use SHA-256 instead of MD5 + ROT13 inside browser JavaScript",
                    "code_snippet": "token = sha256('XX' + reverse(phrase) + 'ZZ');",
                    "explanation": "Stronger hash functions in client JS still expose the exact inputs and salts to the attacker.",
                },
            ],
        },
    },
    "default": {
        "owasp_category": "OWASP Top 10 · Custom Target",
        "sink_pattern": None,
        "hints": [
            {
                "tier": 1,
                "label": "Concept",
                "text": "Trace how untrusted input enters the target handler and reaches a sensitive execution or rendering sink.",
            },
            {
                "tier": 2,
                "label": "Syntax Clue",
                "text": "Test boundary characters and protocol syntax appropriate for the challenge's vulnerability class.",
            },
        ],
        "debrief": {
            "root_cause": "Untrusted input flows into a sensitive sink without strict validation, parameterization, or encoding.",
            "impact": "Exploitation may compromise confidentiality, integrity, or access control boundaries.",
            "prevention": "Enforce strict server-side allowlists, parameterized APIs, and defense-in-depth controls.",
        },
        "patch_quiz": {
            "prompt": "Which remediation pattern addresses this vulnerability class?",
            "correct_option_id": "opt_a",
            "options": [
                {
                    "id": "opt_a",
                    "label": "Enforce strict server-side allowlist validation and safe APIs",
                    "code_snippet": "// Validate against explicit allowlist + encode output / parameterize queries",
                    "explanation": "Allowlist validation combined with safe parameterized APIs removes the vulnerable sink.",
                },
                {
                    "id": "opt_b",
                    "label": "Rely solely on client-side form checks",
                    "code_snippet": "// Client validation only",
                    "explanation": "Client checks are trivially bypassed by direct HTTP requests.",
                },
                {
                    "id": "opt_c",
                    "label": "Suppress error output without fixing input handling",
                    "code_snippet": "// @suppress_errors()",
                    "explanation": "Hiding errors does not prevent exploitation of the underlying flaw.",
                },
            ],
        },
    },
}


LEARNING_TRACKS = [
    {
        "track_id": "track_1_injection",
        "track_order": 1,
        "title": "Track I · Injection Mastery",
        "subtitle": "Break string, blind boolean, and OS shell sinks across escaping and blacklist barriers.",
        "modules": ["sqli", "sqli_blind", "exec"],
    },
    {
        "track_id": "track_2_client",
        "track_order": 2,
        "title": "Track II · Client-Side & Browser Exploitation",
        "subtitle": "Exploit reflected, stored, DOM, CSP, and client-side JavaScript token trust flaws.",
        "modules": ["xss_r", "xss_s", "xss_d", "csp", "javascript"],
    },
    {
        "track_id": "track_3_auth",
        "track_order": 3,
        "title": "Track III · Auth, Session & Workflow Abuse",
        "subtitle": "Subvert weak credentials, sequential cookies, cross-site state changes, and multi-step CAPTCHAs.",
        "modules": ["brute", "weak_id", "csrf", "captcha"],
    },
    {
        "track_id": "track_4_server",
        "track_order": 4,
        "title": "Track IV · Server & File Takeover",
        "subtitle": "Traverse server include paths and defeat MIME/magic-byte file upload restrictions.",
        "modules": ["fi", "upload"],
    },
]

MODULE_TO_TRACK = {}
for _tr in LEARNING_TRACKS:
    for _mod in _tr["modules"]:
        MODULE_TO_TRACK[_mod] = _tr

STAGE_GUIDES: Dict[str, Dict[str, dict]] = {
    "sqli": {
        "low": {"label": "Low · GET String Breakout", "objective": "Break out of single quotes in GET ?id=.", "hint": "Try ' OR '1'='1"},
        "medium": {"label": "Medium · POST Unquoted SQLi", "objective": "mysqli_real_escape_string blocks quotes; SQL uses unquoted integer $id.", "hint": "Try 1 OR 1=1 (quotes stripped automatically by numeric syntax)"},
        "high": {"label": "High · Session Storage + LIMIT 1", "objective": "Input moves via POST session-input.php before SELECT ... LIMIT 1.", "hint": "Inject after session storage with ' OR 1=1# or UNION SELECT"},
    },
    "sqli_blind": {
        "low": {"label": "Low · GET Boolean Oracle", "objective": "Trigger 'User ID exists' with injected boolean condition.", "hint": "Try 1' AND '1'='1"},
        "medium": {"label": "Medium · POST Unquoted Boolean", "objective": "Switch to unquoted boolean condition without single quotes.", "hint": "Try 1 OR 1=1"},
        "high": {"label": "High · Cookie Injection", "objective": "ID moves into Cookie header before SQL lookup + random sleep traps.", "hint": "Send Cookie-context payload 1' AND '1'='1"},
    },
    "exec": {
        "low": {"label": "Low · Raw Shell Concat", "objective": "Chain a command after 127.0.0.1 using ; or &&.", "hint": "Try 127.0.0.1; id"},
        "medium": {"label": "Medium · Partial Operator Filter", "objective": "&& and ; are stripped; exploit unblocked || or single |.", "hint": "Try 127.0.0.1 | id"},
        "high": {"label": "High · Whitespace Trap Filter", "objective": "Extra blacklist removes '; ' (with space); bypass without space after separator.", "hint": "Try 127.0.0.1|id"},
    },
    "xss_r": {
        "low": {"label": "Low · Raw <script> Reflect", "objective": "Inject executable HTML/JS directly into ?name=.", "hint": "Try <script>alert(1)</script>"},
        "medium": {"label": "Medium · str_replace('<script>')", "objective": "Exact lowercase '<script>' is stripped; bypass with case mutation or event handler.", "hint": "Try <sCrIpT>alert(1)</sCrIpT> or <img src=x onerror=alert(1)>"},
        "high": {"label": "High · Regex Script Strip", "objective": "<script tags are stripped case-insensitively; pivot to inline SVG/img events.", "hint": "Try <img src=x onerror=alert(1)>"},
    },
    "xss_s": {
        "low": {"label": "Low · Guestbook Script Persist", "objective": "Persist active markup inside DVWA guestbook comment.", "hint": "Try <script>alert(1)</script>"},
        "medium": {"label": "Medium · txtName Attribute Vector", "objective": "Message is sanitized while txtName strips <script> non-recursively.", "hint": "Use <svg onload=alert(1)> or case-bypassed markup"},
        "high": {"label": "High · preg_replace Script Filter", "objective": "Regex blocks <script variants in mtxMessage.", "hint": "Pivot to <img src=x onerror=alert(1)>"},
    },
    "xss_d": {
        "low": {"label": "Low · Unvalidated ?default=", "objective": "Inject script/event vector accepted into decodeURI DOM sink.", "hint": "Try <script>alert(1)</script>"},
        "medium": {"label": "Medium · <script Check Bypass", "objective": "stripos blocks '<script'; escape option tag with event handler.", "hint": "Try English</option><img src=x onerror=alert(1)>"},
        "high": {"label": "High · Fragment Whitelist Bypass", "objective": "Server whitelists French/English/etc., but fragment/SVG injection executes client-side.", "hint": "Supply #<script>alert(1)</script>"},
    },
    "fi": {
        "low": {"label": "Low · Raw Dot-Dot Traversal", "objective": "Traverse 5 dirs to disclose /etc/passwd.", "hint": "Try ../../../../../etc/passwd"},
        "medium": {"label": "Medium · Non-Recursive ../ Strip", "objective": "Single-pass str_replace('../') removes naive traversal.", "hint": "Double-nest sequences: ....//....//....//....//....//etc/passwd"},
        "high": {"label": "High · fnmatch file* Constraint", "objective": "Requires file* prefix or file:// scheme.", "hint": "Try file:///etc/passwd"},
    },
    "upload": {
        "low": {"label": "Low · Unrestricted PHP Upload", "objective": "Upload cf_probe.php directly.", "hint": "Try cf_probe.php"},
        "medium": {"label": "Medium · Content-Type Spoof", "objective": "Server only checks $_FILES['type']; spoof image/jpeg header.", "hint": "Try cf_probe.php MIME: image/jpeg"},
        "high": {"label": "High · Extension + Magic Bytes", "objective": "Server inspects extension and getimagesize() header.", "hint": "Include gif89 + .jpg or check PHP image polyglot behavior"},
    },
    "csrf": {
        "low": {"label": "Low · Missing Token & Referer", "objective": "Trigger forged GET password update with no tokens.", "hint": "password_new=password&password_conf=password&Change=Change"},
        "medium": {"label": "Medium · Weak Referer Substring Check", "objective": "Forge request carrying matching host Referer header.", "hint": "Include Referer: localhost alongside password_new/password_conf"},
        "high": {"label": "High · Anti-CSRF Token Enforced", "objective": "High tier validates session user_token unless chained with XSS.", "hint": "Demonstrates synchronizer token resistance against forged cross-origin GET"},
    },
    "brute": {
        "low": {"label": "Low · Unlimited Login Guessing", "objective": "Submit admin:password directly without rate limit.", "hint": "admin:password"},
        "medium": {"label": "Medium · 2-Second Delay Only", "objective": "Adds sleep(2) on failure without lockout or CSRF tokens.", "hint": "admin:password"},
        "high": {"label": "High · Synchronizer Token Gate", "objective": "Requires extracting per-request anti-CSRF token before spraying.", "hint": "Unauthenticated requests without token fail verification"},
    },
    "weak_id": {
        "low": {"label": "Low · Auto-Increment Counter", "objective": "Observe predictable 1, 2, 3 dvwaSession cookies.", "hint": "Cookie: dvwaSession=1"},
        "medium": {"label": "Medium · Unix Timestamp Cookie", "objective": "dvwaSession equals predictable time() seconds.", "hint": "Cookie: dvwaSession=predict"},
        "high": {"label": "High · Unsalted MD5(counter)", "objective": "Weak hash over sequential integer still short/enumerable.", "hint": "Submit weak_id probe"},
    },
    "csp": {
        "low": {"label": "Low · Whitelisted Pastebin Origin", "objective": "Load script from CSP-allowlisted third-party host.", "hint": "https://pastebin.com/raw/R570EE00"},
        "medium": {"label": "Medium · Fixed Predictable Nonce", "objective": "Bypass CSP using exposed static nonce value.", "hint": "<script nonce=\"TmV2ZXIgZ29pbmcgdG8gZ2l2ZSB5b3UgdXA=\">alert(1)</script>"},
        "high": {"label": "High · Callback Endpoint Abuse", "objective": "Exploit self-hosted JSONP/source callback inside allowed origin.", "hint": "Probe source/jsonp.php?callback=alert"},
    },
    "captcha": {
        "low": {"label": "Low · Direct step=2 Bypass", "objective": "Skip step=1 CAPTCHA check by submitting step=2 directly.", "hint": "step=2&password_new=password&password_conf=password&Change=Change"},
        "medium": {"label": "Medium · Hidden passed_captcha Tamper", "objective": "Spoof step=2 along with passed_captcha=true.", "hint": "step=2&passed_captcha=true&password_new=password&password_conf=password"},
        "high": {"label": "High · Backdoor User-Agent + Token", "objective": "Supply hardcoded g-recaptcha-response=hidd3n_valu3 + User-Agent: reCAPTCHA.", "hint": "g-recaptcha-response=hidd3n_valu3&User-Agent=reCAPTCHA&password_new=password"},
    },
    "javascript": {
        "low": {"label": "Low · MD5(ROT13('success')) Forge", "objective": "Inspect low.php JS and forge md5(rot13('success')).", "hint": "phrase=success&token=38581812b435834ebf84ebcc2c6424d6"},
        "medium": {"label": "Medium · String Reversal Forge", "objective": "Reverse 'XXsuccessXX' per medium.js logic.", "hint": "phrase=success&token=XXsseccusXX"},
        "high": {"label": "High · Nested SHA-256 Deobfuscation", "objective": "Unpack packed high.js and compute nested sha256 digest.", "hint": "phrase=success&token=ec7ef8687050b6fe803867ea696734c67b541dfafb286a0b1239f42ac5b0aa84"},
    },
}


def _resolve_guide(module_key: Optional[str]) -> dict:
    key = (module_key or "").strip().lower()
    return LAB_GUIDES.get(key, LAB_GUIDES["default"])


def get_public_guide(module_key: Optional[str]) -> dict:
    """Return guide data safe for frontend delivery (never exposes correct_option_id or explanations)."""
    key = (module_key or "").strip().lower()
    guide = deepcopy(_resolve_guide(key))
    quiz = guide.get("patch_quiz", {})
    public_options = [
        {
            "id": opt["id"],
            "label": opt["label"],
            "code_snippet": opt["code_snippet"],
        }
        for opt in quiz.get("options", [])
    ]
    track = MODULE_TO_TRACK.get(key) or {"track_id": "track_custom", "title": "Custom Labs", "track_order": 99}
    return {
        "owasp_category": guide["owasp_category"],
        "sink_pattern": guide.get("sink_pattern"),
        "track_id": track["track_id"],
        "track_title": track["title"],
        "track_order": track["track_order"],
        "stage_guides": STAGE_GUIDES.get(key, {}),
        "hints": guide.get("hints", []),
        "debrief": guide.get("debrief", {}),
        "patch_quiz": {
            "prompt": quiz.get("prompt", ""),
            "options": public_options,
        },
    }


def grade_patch_choice(module_key: Optional[str], patch_option_id: Optional[str]) -> Tuple[bool, str]:
    """Grade a defender's selected patch quiz option and return (is_correct, educational_feedback)."""
    guide = _resolve_guide(module_key)
    quiz = guide.get("patch_quiz", {})
    correct_id = quiz.get("correct_option_id")
    options = {opt["id"]: opt for opt in quiz.get("options", [])}
    chosen = (patch_option_id or "").strip()

    if chosen == correct_id and chosen in options:
        return True, options[chosen]["explanation"]

    correct_opt = options.get(correct_id)
    correct_label = correct_opt["label"] if correct_opt else "the parameterized/allowlist remediation"
    if chosen in options:
        return (
            False,
            f"{options[chosen]['explanation']} Better approach: {correct_label}.",
        )
    return (
        False,
        f"Unrecognized patch selection. Recommended fix: {correct_label}.",
    )
