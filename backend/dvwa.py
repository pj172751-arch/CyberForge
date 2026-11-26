import html
import os
import re
from contextlib import contextmanager
from dataclasses import dataclass
from functools import lru_cache
from typing import Dict, Iterator, Optional, Tuple
from urllib.parse import parse_qs, urlparse

import httpx

DVWA_BASE_URL = os.getenv("DVWA_BASE_URL", "http://127.0.0.1:8081").rstrip("/")
DVWA_USERNAME = os.getenv("DVWA_USERNAME", "admin")
DVWA_PASSWORD = os.getenv("DVWA_PASSWORD", "password")
DVWA_TIMEOUT = float(os.getenv("DVWA_TIMEOUT", "6.0"))

VALID_MODULES = frozenset(
    {
        "sqli",
        "xss_r",
        "xss_s",
        "xss_d",
        "fi",
        "exec",
        "sqli_blind",
        "upload",
        "weak_id",
        "csrf",
        "brute",
        "csp",
    }
)
VALID_LEVELS = frozenset({"low", "medium", "high", "impossible"})

_MODULE_ORDER_REGEX = re.compile(
    r"(?:^|/)(sqli_blind|sqli|xss_r|xss_s|xss_d|weak_id|upload|brute|csrf|exec|csp|fi)(?:/|$|\?)"
)
_USER_TOKEN_RE = re.compile(
    r"<input[^>]*\bname=['\"]user_token['\"][^>]*\bvalue=['\"]([^'\"]*)['\"]"
    r"|<input[^>]*\bvalue=['\"]([^'\"]*)['\"][^>]*\bname=['\"]user_token['\"]",
    re.IGNORECASE,
)
_CODE_BLOCK_RE = re.compile(
    r"<div\s+id=[\"']code[\"'][^>]*>.*?<code[^>]*>(.*?)</code>",
    re.IGNORECASE | re.DOTALL,
)
_VULN_AREA_RE = re.compile(
    r"<div\s+class=[\"']vulnerable_code_area[\"'][^>]*>(.*?)</div>\s*<br",
    re.IGNORECASE | re.DOTALL,
)
_PRE_BLOCK_RE = re.compile(r"<pre[^>]*>(.*?)</pre>", re.IGNORECASE | re.DOTALL)
_GUESTBOOK_RE = re.compile(
    r"<div\s+id=[\"']guestbook_comments[\"'][^>]*>(.*?)</div>",
    re.IGNORECASE | re.DOTALL,
)


@dataclass
class DvwaCheckResult:
    matched: bool
    verification_mode: str
    http_status: Optional[int]
    security_level: str
    evidence: str


def _get_base_url() -> str:
    return os.getenv("DVWA_BASE_URL", DVWA_BASE_URL).rstrip("/")


def _get_username() -> str:
    return os.getenv("DVWA_USERNAME", DVWA_USERNAME)


def _get_password() -> str:
    return os.getenv("DVWA_PASSWORD", DVWA_PASSWORD)


def _get_timeout() -> float:
    return float(os.getenv("DVWA_TIMEOUT", str(DVWA_TIMEOUT)))


def _normalize_security_level(security_level: Optional[str]) -> str:
    level = (security_level or "low").strip().lower()
    return level if level in VALID_LEVELS else "low"


def resolve_dvwa_module(page_ref: str) -> Optional[str]:
    """Map a challenge's dvwa_page_ref to one of the 12 canonical DVWA module keys."""
    if not page_ref:
        return None
    raw = page_ref.strip().lower()
    parsed = urlparse(raw)
    path = parsed.path or raw
    segments = [seg for seg in path.split("/") if seg]
    if "vulnerabilities" in segments:
        idx = segments.index("vulnerabilities")
        if idx + 1 < len(segments) and segments[idx + 1] in VALID_MODULES:
            return segments[idx + 1]
        return None
    if len(segments) == 1 and segments[0] in VALID_MODULES:
        return segments[0]
    match = _MODULE_ORDER_REGEX.search(path)
    if match and match.group(1) in VALID_MODULES:
        return match.group(1)
    return None


def _extract_user_token(html_text: str) -> Optional[str]:
    match = _USER_TOKEN_RE.search(html_text or "")
    if not match:
        return None
    return match.group(1) if match.group(1) is not None else match.group(2)


def _clean_html_text(raw_html: str, max_len: int = 320) -> str:
    text = re.sub(r"<br\s*/?>", "\n", raw_html or "", flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text).replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{2,}", "\n", text).strip()
    if len(text) > max_len:
        return text[: max_len - 3] + "..."
    return text


def _extract_pre_evidence(html_text: str, fallback: str = "") -> str:
    blocks = _PRE_BLOCK_RE.findall(html_text or "")
    if blocks:
        cleaned = " | ".join(_clean_html_text(b, max_len=160) for b in blocks[:3] if b.strip())
        if cleaned:
            return cleaned[:320]
    return fallback


def _set_security_cookie(client: httpx.Client, security_level: str) -> None:
    level = _normalize_security_level(security_level)
    found = False
    for cookie in list(client.cookies.jar):
        if cookie.name == "security":
            cookie.value = level
            found = True
    if not found:
        host = urlparse(_get_base_url()).hostname or ""
        client.cookies.set("security", level, domain=host, path="/")


def _is_setup_page(resp: httpx.Response) -> bool:
    return "/setup.php" in str(resp.url) or "Create / Reset Database" in resp.text


def _initialize_dvwa_db(client: httpx.Client, setup_resp: httpx.Response) -> httpx.Response:
    """Submit DVWA's /setup.php database creation form and return a fresh GET /login.php response."""
    setup_token = _extract_user_token(setup_resp.text)
    setup_data = {"create_db": "Create / Reset Database"}
    if setup_token:
        setup_data["user_token"] = setup_token
    client.post("/setup.php", data=setup_data)
    return client.get("/login.php")


def _submit_dvwa_login(client: httpx.Client, login_page: httpx.Response) -> httpx.Response:
    login_token = _extract_user_token(login_page.text)
    login_data = {
        "username": _get_username(),
        "password": _get_password(),
        "Login": "Login",
    }
    if login_token:
        login_data["user_token"] = login_token
    return client.post("/login.php", data=login_data)


@contextmanager
def _create_dvwa_session(
    security_level: str = "low", timeout: Optional[float] = None
) -> Iterator[httpx.Client]:
    """Yield an isolated authenticated DVWA httpx.Client at the requested security tier."""
    level = _normalize_security_level(security_level)
    with httpx.Client(
        base_url=_get_base_url(),
        follow_redirects=True,
        timeout=timeout if timeout is not None else _get_timeout(),
    ) as client:
        resp = client.get("/login.php")
        if _is_setup_page(resp):
            resp = _initialize_dvwa_db(client, resp)

        final_resp = _submit_dvwa_login(client, resp)
        if _is_setup_page(final_resp):
            login_page = _initialize_dvwa_db(client, final_resp)
            final_resp = _submit_dvwa_login(client, login_page)

        if "/login.php" in str(final_resp.url) or "logout.php" not in final_resp.text:
            raise RuntimeError(f"DVWA authentication did not complete (final_url={final_resp.url})")

        _set_security_cookie(client, level)
        yield client


def check_dvwa_health() -> Dict[str, object]:
    """Probe DVWA reachability and database initialization status."""
    base_url = _get_base_url()
    timeout = min(_get_timeout(), 3.0)
    try:
        with httpx.Client(base_url=base_url, follow_redirects=True, timeout=timeout) as client:
            resp = client.get("/login.php")
            if resp.status_code >= 500:
                return {
                    "status": "offline",
                    "reachable": False,
                    "initialized": False,
                    "base_url": base_url,
                }
            final_url = str(resp.url)
            if "/setup.php" in final_url or "Create / Reset Database" in resp.text:
                return {
                    "status": "setup_required",
                    "reachable": True,
                    "initialized": False,
                    "base_url": base_url,
                }
            if resp.status_code == 200 and (
                "login.php" in final_url or 'name="username"' in resp.text or "DVWA" in resp.text
            ):
                return {
                    "status": "ok",
                    "reachable": True,
                    "initialized": True,
                    "base_url": base_url,
                }
            return {
                "status": "offline",
                "reachable": False,
                "initialized": False,
                "base_url": base_url,
            }
    except Exception:
        return {
            "status": "offline",
            "reachable": False,
            "initialized": False,
            "base_url": base_url,
        }


@lru_cache(maxsize=64)
def _fetch_dvwa_source_cached(module_key: str, security_level: str) -> str:
    with _create_dvwa_session("low") as client:
        resp = client.get(
            "/vulnerabilities/view_source.php",
            params={"id": module_key, "security": security_level},
        )
        resp.raise_for_status()
        match = _CODE_BLOCK_RE.search(resp.text)
        if not match:
            raise ValueError(f"No source code block returned for {module_key}/{security_level}")
        raw_code = match.group(1)
        cleaned = re.sub(r"<br\s*/?>", "\n", raw_code, flags=re.IGNORECASE)
        cleaned = re.sub(r"<[^>]+>", "", cleaned)
        cleaned = html.unescape(cleaned).replace("\xa0", " ").replace("\r\n", "\n").strip()
        if not cleaned:
            raise ValueError(f"Empty source code block returned for {module_key}/{security_level}")
        return cleaned


def fetch_dvwa_source(module_key: str, security_level: str) -> Optional[str]:
    """Fetch and parse clean PHP handler source from DVWA's view_source.php."""
    mod = (module_key or "").strip().lower()
    level = _normalize_security_level(security_level)
    if mod not in VALID_MODULES or level not in VALID_LEVELS:
        return None
    try:
        return _fetch_dvwa_source_cached(mod, level)
    except Exception:
        return None


def _run_sqli(client: httpx.Client, payload: str, level: str) -> DvwaCheckResult:
    page = client.get("/vulnerabilities/sqli/")
    params = {"id": payload, "Submit": "Submit"}
    token = _extract_user_token(page.text)
    if token:
        params["user_token"] = token
    resp = client.get("/vulnerabilities/sqli/", params=params)
    hits = resp.text.count("First name:")
    matched = hits >= 2
    evidence = _extract_pre_evidence(
        resp.text,
        fallback=f"Returned {hits} user row(s) on DVWA sqli ({level}).",
    )
    if matched:
        evidence = f"Returned {hits} database rows: {evidence}"
    elif hits == 0 and "error in your SQL syntax" in resp.text:
        evidence = _extract_pre_evidence(resp.text, fallback="SQL syntax error returned without multi-row dump.")
    elif not evidence:
        evidence = f"Query returned {hits} row(s) under '{level}' security."
    return DvwaCheckResult(matched, "dvwa_live", resp.status_code, level, evidence)


def _run_xss_r(client: httpx.Client, payload: str, level: str) -> DvwaCheckResult:
    page = client.get("/vulnerabilities/xss_r/")
    params = {"name": payload}
    token = _extract_user_token(page.text)
    if token:
        params["user_token"] = token
    resp = client.get("/vulnerabilities/xss_r/", params=params)
    hello_match = re.search(r"<pre>\s*Hello\s*(.*?)</pre>", resp.text, re.IGNORECASE | re.DOTALL)
    rendered = hello_match.group(1) if hello_match else ""
    lowered = rendered.lower()
    xss_markers = ("<script", "onerror=", "onload=", "onfocus=", "<svg", "javascript:")
    matched = bool(rendered) and any(marker in lowered for marker in xss_markers)
    evidence = (
        f"Reflected output: Hello {_clean_html_text(rendered, 180)} (raw markers present={matched})"
        if hello_match
        else f"No reflected <pre>Hello ...</pre> sink rendered under '{level}' security."
    )
    return DvwaCheckResult(matched, "dvwa_live", resp.status_code, level, evidence)


def _run_xss_s(client: httpx.Client, payload: str, level: str) -> DvwaCheckResult:
    try:
        page = client.get("/vulnerabilities/xss_s/")
        data = {
            "txtName": "cf_probe",
            "mtxMessage": payload,
            "btnSign": "Sign Guestbook",
        }
        token = _extract_user_token(page.text)
        if token:
            data["user_token"] = token
        resp = client.post("/vulnerabilities/xss_s/", data=data)
        gb_blocks = _GUESTBOOK_RE.findall(resp.text)
        comments_html = "\n".join(gb_blocks)
        lowered = comments_html.lower()
        xss_markers = ("<script", "onerror=", "onload=", "onfocus=", "<svg", "javascript:")
        matched = bool(comments_html) and any(marker in lowered for marker in xss_markers)
        evidence = (
            f"Guestbook sink rendered: {_clean_html_text(comments_html, 220)}"
            if comments_html
            else f"Guestbook submission did not persist raw markup under '{level}' security."
        )
        return DvwaCheckResult(matched, "dvwa_live", resp.status_code, level, evidence)
    finally:
        try:
            clear_page = client.get("/vulnerabilities/xss_s/")
            clear_data = {"btnClear": "Clear Guestbook"}
            clear_token = _extract_user_token(clear_page.text)
            if clear_token:
                clear_data["user_token"] = clear_token
            client.post("/vulnerabilities/xss_s/", data=clear_data)
        except Exception:
            pass


def _run_xss_d(client: httpx.Client, payload: str, level: str) -> DvwaCheckResult:
    resp = client.get(
        "/vulnerabilities/xss_d/",
        params={"default": payload},
        follow_redirects=False,
    )
    lowered = payload.lower()
    dangerous = any(
        marker in lowered
        for marker in ("<script", "javascript:", "onerror", "onload", "onfocus", "<svg", "<img")
    )
    decodes_uri = "decodeuri(lang)" in resp.text.lower()
    not_redirected = resp.status_code == 200
    matched = dangerous and not_redirected and decodes_uri
    if resp.status_code in (301, 302, 303, 307, 308):
        location = resp.headers.get("location", "")
        evidence = f"Server blocked unwhitelisted input with HTTP {resp.status_code} redirect to '{location}'."
    elif not decodes_uri:
        evidence = "Client-side decodeURI(lang) disabled on impossible tier; URI payload stays encoded."
    elif not dangerous:
        evidence = f"HTTP {resp.status_code} returned, but payload contains no active DOM XSS vector."
    else:
        evidence = f"HTTP {resp.status_code} accepted payload into DOM sink with active decodeURI(lang)."
    return DvwaCheckResult(matched, "dvwa_live", resp.status_code, level, evidence)


def _run_fi(client: httpx.Client, payload: str, level: str) -> DvwaCheckResult:
    resp = client.get("/vulnerabilities/fi/", params={"page": payload})
    text = resp.text
    blocked = "ERROR: File not found!" in text
    disclosed = any(
        sig in text for sig in ("root:x:0:0:", "daemon:x:", "/bin/bash", "/usr/sbin/nologin", "<?php")
    )
    matched = disclosed and not blocked
    if blocked:
        evidence = f"LFI blocked under '{level}' security: ERROR: File not found!"
    elif matched:
        snippet = next(
            (line.strip() for line in text.splitlines() if "root:x:0:0:" in line or "daemon:x:" in line),
            "Target file contents disclosed in response.",
        )
        evidence = f"Disclosed file content: {snippet[:200]}"
    else:
        evidence = f"No sensitive local file contents disclosed (HTTP {resp.status_code})."
    return DvwaCheckResult(matched, "dvwa_live", resp.status_code, level, evidence)


def _run_exec(client: httpx.Client, payload: str, level: str) -> DvwaCheckResult:
    page = client.get("/vulnerabilities/exec/")
    data = {"ip": payload, "Submit": "Submit"}
    token = _extract_user_token(page.text)
    if token:
        data["user_token"] = token
    # ping -c 4 (and DNS lookup when metacharacters are stripped on high) can exceed 10s in Docker
    resp = client.post("/vulnerabilities/exec/", data=data, timeout=max(_get_timeout(), 20.0))
    blocks = _PRE_BLOCK_RE.findall(resp.text or "")
    full_pre = "\n".join(_clean_html_text(b, max_len=4000) for b in blocks if b.strip()).strip()
    cmd_markers = ("uid=", "gid=", "www-data", "linux", "root:x:", "groups=")
    matched_lines = [
        line.strip()
        for line in full_pre.splitlines()
        if any(marker in line.lower() for marker in cmd_markers)
    ]
    matched = bool(matched_lines)
    if matched:
        evidence = " | ".join(matched_lines)[:320]
    elif full_pre:
        evidence = full_pre[-320:] if len(full_pre) > 320 else full_pre
    else:
        evidence = f"No command output returned under '{level}' security (HTTP {resp.status_code})."
    return DvwaCheckResult(matched, "dvwa_live", resp.status_code, level, evidence)


def _run_sqli_blind(client: httpx.Client, payload: str, level: str) -> DvwaCheckResult:
    page = client.get("/vulnerabilities/sqli_blind/")
    params = {"id": payload, "Submit": "Submit"}
    token = _extract_user_token(page.text)
    if token:
        params["user_token"] = token
    resp = client.get("/vulnerabilities/sqli_blind/", params=params)
    exists = "User ID exists in the database." in resp.text
    lowered = payload.lower()
    has_sqli_syntax = any(
        tok in lowered for tok in ("'", '"', " union ", " or ", " and ", "--", "#", "sleep(", "benchmark(")
    )
    matched = exists and has_sqli_syntax
    evidence = _extract_pre_evidence(
        resp.text,
        fallback=f"HTTP {resp.status_code} response from sqli_blind under '{level}' security.",
    )
    if exists and not has_sqli_syntax:
        evidence = f"{evidence} (Benign non-injection lookup; SQLi operator required)."
    return DvwaCheckResult(matched, "dvwa_live", resp.status_code, level, evidence)


def _extract_upload_filename_and_mime(payload: str) -> Tuple[Optional[str], str]:
    lowered = payload.lower()
    mime = "image/jpeg" if ("image/jpeg" in lowered or "mime" in lowered or "polyglot" in lowered) else "application/octet-stream"
    if "image/png" in lowered:
        mime = "image/png"
    match = re.search(r"([A-Za-z0-9_.\-]+\.(?:php[0-9]?|phtml|phar|sh|html|txt|jpg|jpeg|png|gif|exe))", payload, re.IGNORECASE)
    if match:
        return match.group(1), mime
    if any(tok in lowered for tok in (".php", "webshell", "shell")):
        return "cf_probe.php", mime
    return None, mime


def _run_upload(client: httpx.Client, payload: str, level: str) -> DvwaCheckResult:
    filename, mime_type = _extract_upload_filename_and_mime(payload)
    if not filename:
        return DvwaCheckResult(
            False,
            "dvwa_live",
            200,
            level,
            "Payload did not specify an executable or bypass upload filename (e.g. cf_probe.php).",
        )
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    is_risky_target = ext in {"php", "php5", "phtml", "phar", "sh", "html", "exe"} or ".php." in filename.lower()
    page = client.get("/vulnerabilities/upload/")
    data = {"Upload": "Upload", "MAX_FILE_SIZE": "100000"}
    token = _extract_user_token(page.text)
    if token:
        data["user_token"] = token
    files = {"uploaded": (filename, b"CYBERFORGE_UPLOAD_PROBE_OK", mime_type)}
    resp = client.post("/vulnerabilities/upload/", data=data, files=files)
    uploaded_ok = "succesfully uploaded!" in resp.text.lower() or "successfully uploaded!" in resp.text.lower()
    matched = uploaded_ok and is_risky_target
    evidence = _extract_pre_evidence(
        resp.text,
        fallback=f"Upload attempt for '{filename}' ({mime_type}) returned HTTP {resp.status_code}.",
    )
    return DvwaCheckResult(matched, "dvwa_live", resp.status_code, level, evidence)


def _extract_dvwa_session_cookie(resp: httpx.Response) -> Optional[str]:
    for header_val in resp.headers.get_list("set-cookie"):
        match = re.search(r"\bdvwaSession=([^;]+)", header_val)
        if match:
            return match.group(1)
    return resp.cookies.get("dvwaSession")


def _run_weak_id(client: httpx.Client, payload: str, level: str) -> DvwaCheckResult:
    lowered = payload.lower()
    probes_session = any(
        tok in lowered for tok in ("dvwasession", "session", "cookie", "weak_id", "sequential", "predict")
    )
    page = client.get("/vulnerabilities/weak_id/")
    data = {}
    token = _extract_user_token(page.text)
    if token:
        data["user_token"] = token
    r1 = client.post("/vulnerabilities/weak_id/", data=data)
    r2 = client.post("/vulnerabilities/weak_id/", data=data)
    v1 = _extract_dvwa_session_cookie(r1) or ""
    v2 = _extract_dvwa_session_cookie(r2) or ""
    weak_token = bool(v1 and v2) and (len(v1) < 20 or (v1.isdigit() and v2.isdigit()))
    matched = probes_session and weak_token
    if not probes_session:
        evidence = f"Payload did not probe session cookie generation (observed dvwaSession samples: '{v1}', '{v2}')."
    elif weak_token:
        evidence = f"Predictable sequential/short dvwaSession cookies issued: '{v1}' -> '{v2}' (len={len(v1)})."
    else:
        evidence = f"High-entropy dvwaSession cookies issued under '{level}': '{v1[:16]}...' (len={len(v1)})."
    return DvwaCheckResult(matched, "dvwa_live", r2.status_code, level, evidence)


def _run_csrf(client: httpx.Client, payload: str, level: str) -> DvwaCheckResult:
    lowered = payload.lower()
    is_csrf_vector = any(
        tok in lowered
        for tok in ("password_new", "password_conf", "change=", "csrf", "<form", "<img", "vulnerabilities/csrf", "fetch(")
    )
    if not is_csrf_vector:
        return DvwaCheckResult(
            False,
            "dvwa_live",
            200,
            level,
            "Payload does not forge a password_new/password_conf CSRF state-change request.",
        )

    # Always keep DVWA_PASSWORD intact so admin authentication never breaks
    pwd = _get_password()
    params = {
        "password_new": pwd,
        "password_conf": pwd,
        "Change": "Change",
    }
    if "password_conf=" in lowered and "password_new=" in lowered:
        parsed_qs = parse_qs(payload.lstrip("?"))
        if parsed_qs.get("password_new") and parsed_qs.get("password_conf"):
            if parsed_qs["password_new"][0] != parsed_qs["password_conf"][0]:
                params["password_conf"] = parsed_qs["password_conf"][0] + "_mismatch"

    # Intentionally omit user_token and Referer to test CSRF protection
    resp = client.get("/vulnerabilities/csrf/", params=params, follow_redirects=False)
    matched = resp.status_code == 200 and "Password Changed." in resp.text
    if resp.status_code in (301, 302, 303, 307, 308):
        evidence = f"CSRF request rejected with HTTP {resp.status_code} redirect (missing anti-CSRF token)."
    else:
        evidence = _extract_pre_evidence(
            resp.text,
            fallback=f"CSRF forge request returned HTTP {resp.status_code} under '{level}' security.",
        )
    return DvwaCheckResult(matched, "dvwa_live", resp.status_code, level, evidence)


def _parse_brute_credentials(payload: str) -> Optional[Tuple[str, str]]:
    text = payload.strip()
    if ":" in text and " " not in text.split(":", 1)[0]:
        user, pwd = text.split(":", 1)
        if user and pwd:
            return user.strip(), pwd.strip()
    qs = parse_qs(text.lstrip("?"))
    if qs.get("username") and qs.get("password"):
        return qs["username"][0], qs["password"][0]
    return None


def _run_brute(client: httpx.Client, payload: str, level: str) -> DvwaCheckResult:
    creds = _parse_brute_credentials(payload)
    if not creds:
        return DvwaCheckResult(
            False,
            "dvwa_live",
            200,
            level,
            "Provide credentials in 'username:password' format (e.g. admin:password) to probe brute-force endpoint.",
        )
    username, password = creds
    # Intentionally omit user_token to test unauthenticated/automated brute-force resistance
    resp = client.get(
        "/vulnerabilities/brute/",
        params={"username": username, "password": password, "Login": "Login"},
        follow_redirects=False,
    )
    matched = resp.status_code == 200 and "Welcome to the password protected area" in resp.text
    if resp.status_code in (301, 302, 303, 307, 308):
        evidence = f"Automated login rejected with HTTP {resp.status_code} redirect (anti-CSRF token required)."
    elif matched:
        evidence = f"Welcome to the password protected area {username} (no rate limit or token check on '{level}')."
    else:
        evidence = _extract_pre_evidence(
            resp.text,
            fallback=f"Login probe rejected under '{level}' security (HTTP {resp.status_code}).",
        )
    return DvwaCheckResult(matched, "dvwa_live", resp.status_code, level, evidence)


def _run_csp(client: httpx.Client, payload: str, level: str) -> DvwaCheckResult:
    page = client.get("/vulnerabilities/csp/")
    data = {"include": payload.strip()}
    token = _extract_user_token(page.text)
    if token:
        data["user_token"] = token
    resp = client.post("/vulnerabilities/csp/", data=data)
    csp_header = resp.headers.get("content-security-policy", "")
    lowered_csp = csp_header.lower()
    stripped = payload.strip()
    lowered_payload = stripped.lower()

    matched = False
    if lowered_payload.startswith(("http://", "https://")):
        host = urlparse(stripped).netloc.lower()
        host_allowed = bool(host) and (host in lowered_csp)
        script_tag_injected = f"<script src='{stripped}'" in resp.text or f'<script src="{stripped}"' in resp.text
        matched = host_allowed and script_tag_injected
    elif "<script" in lowered_payload:
        nonce_match = re.search(r"nonce=['\"]([^'\"]+)['\"]", stripped, re.IGNORECASE)
        if nonce_match and f"'nonce-{nonce_match.group(1).lower()}'" in lowered_csp:
            matched = stripped in resp.text
        elif "'unsafe-inline'" in lowered_csp and "'nonce-" not in lowered_csp:
            matched = stripped in resp.text

    evidence = (
        f"CSP header: [{csp_header or 'none'}] | "
        f"{'Allowed script inclusion/execution.' if matched else 'Blocked by policy.'}"
    )
    return DvwaCheckResult(matched, "dvwa_live", resp.status_code, level, evidence)


_MODULE_RUNNERS = {
    "sqli": _run_sqli,
    "xss_r": _run_xss_r,
    "xss_s": _run_xss_s,
    "xss_d": _run_xss_d,
    "fi": _run_fi,
    "exec": _run_exec,
    "sqli_blind": _run_sqli_blind,
    "upload": _run_upload,
    "weak_id": _run_weak_id,
    "csrf": _run_csrf,
    "brute": _run_brute,
    "csp": _run_csp,
}


def _execute_module(module_key: str, payload: str, security_level: str) -> Optional[DvwaCheckResult]:
    runner = _MODULE_RUNNERS.get(module_key)
    if runner is None:
        return None
    level = _normalize_security_level(security_level)
    try:
        with _create_dvwa_session(level) as client:
            return runner(client, payload, level)
    except Exception:
        return None


def verify_attack(challenge, payload_used: str) -> Optional[DvwaCheckResult]:
    """Verify an exploit payload live against DVWA at security='low'. Returns None to trigger fallback."""
    module_key = resolve_dvwa_module(getattr(challenge, "dvwa_page_ref", ""))
    if not module_key:
        return None
    return _execute_module(module_key, payload_used, "low")


def verify_defense(challenge, security_level_applied: str) -> Tuple[Optional[DvwaCheckResult], Optional[dict]]:
    """Replay challenge.reference_payload at low (before) and security_level_applied (after)."""
    module_key = resolve_dvwa_module(getattr(challenge, "dvwa_page_ref", ""))
    if not module_key:
        return None, None
    ref_payload = getattr(challenge, "reference_payload", "") or ""
    level = _normalize_security_level(security_level_applied)

    before_res = _execute_module(module_key, ref_payload, "low")
    after_res = _execute_module(module_key, ref_payload, level)
    if before_res is None or after_res is None:
        return None, None

    baseline_before = {
        "exploited": before_res.matched,
        "http_status": before_res.http_status,
        "evidence": before_res.evidence,
    }
    return after_res, baseline_before
