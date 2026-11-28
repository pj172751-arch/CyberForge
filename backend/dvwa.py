import html
import os
import re
import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass
from functools import lru_cache
from typing import Dict, Iterator, Optional, Tuple
from urllib.parse import parse_qs, urljoin, urlparse

import httpx
from fastapi import HTTPException

DVWA_BASE_URL = os.getenv("DVWA_BASE_URL", "http://127.0.0.1:8081").rstrip("/")
DVWA_USERNAME = os.getenv("DVWA_USERNAME", "admin")
DVWA_PASSWORD = os.getenv("DVWA_PASSWORD", "password")
DVWA_TIMEOUT = float(os.getenv("DVWA_TIMEOUT", "6.0"))
MAX_DVWA_RESPONSE_BYTES = 262_144

_GLOBAL_DVWA_MAX = max(1, int(os.getenv("DVWA_MAX_GLOBAL_CONCURRENCY", "8")))
_USER_DVWA_MAX = max(1, int(os.getenv("DVWA_MAX_USER_CONCURRENCY", "2")))
_GLOBAL_DVWA_SEM = threading.BoundedSemaphore(_GLOBAL_DVWA_MAX)
_USER_DVWA_SEMS: Dict[str, threading.BoundedSemaphore] = {}
_USER_DVWA_LOCK = threading.Lock()


@contextmanager
def acquire_dvwa_slot(user_key: str) -> Iterator[None]:
    """Acquire per-user and global DVWA execution semaphores with a 2.0s timeout."""
    key = (user_key or "anonymous").strip() or "anonymous"
    with _USER_DVWA_LOCK:
        user_sem = _USER_DVWA_SEMS.get(key)
        if user_sem is None:
            user_sem = threading.BoundedSemaphore(_USER_DVWA_MAX)
            _USER_DVWA_SEMS[key] = user_sem

    if not user_sem.acquire(timeout=2.0):
        raise HTTPException(status_code=429, detail="Too many concurrent lab executions")
    try:
        if not _GLOBAL_DVWA_SEM.acquire(timeout=2.0):
            raise HTTPException(status_code=429, detail="Too many concurrent lab executions")
        try:
            yield
        finally:
            _GLOBAL_DVWA_SEM.release()
    finally:
        user_sem.release()


def _validate_no_crlf(value: str, field_name: str = "payload") -> str:
    """Reject CR/LF/NUL characters in user-controlled values sent to DVWA."""
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a string")
    if "\r" in value or "\n" in value or "\x00" in value:
        raise ValueError(f"Invalid control characters (CR/LF/NUL) in {field_name}")
    return value


def _safe_resp_text(resp: httpx.Response) -> str:
    """Return response text bounded to MAX_DVWA_RESPONSE_BYTES to avoid memory bloat."""
    content = getattr(resp, "content", None)
    if isinstance(content, (bytes, bytearray)) and len(content) > MAX_DVWA_RESPONSE_BYTES:
        encoding = getattr(resp, "encoding", None) or "utf-8"
        return bytes(content[:MAX_DVWA_RESPONSE_BYTES]).decode(encoding, errors="replace")
    text = getattr(resp, "text", "") or ""
    if len(text.encode("utf-8", errors="replace")) > MAX_DVWA_RESPONSE_BYTES:
        return text[:MAX_DVWA_RESPONSE_BYTES]
    return text


def _follow_safe_internal_redirect(
    client: httpx.Client, resp: httpx.Response, max_hops: int = 3
) -> httpx.Response:
    """Follow redirects strictly within the configured DVWA origin."""
    base_parsed = urlparse(_get_base_url())
    current = resp
    for _ in range(max_hops):
        if current.status_code not in (301, 302, 303, 307, 308):
            return current
        location = current.headers.get("location")
        if not location:
            return current
        target = urljoin(str(current.url), location)
        parsed = urlparse(target)
        if parsed.scheme != base_parsed.scheme or parsed.netloc != base_parsed.netloc:
            raise RuntimeError(f"Blocked unsafe redirect outside DVWA origin: {target}")
        path_with_query = parsed.path or "/"
        if parsed.query:
            path_with_query = f"{path_with_query}?{parsed.query}"
        current = client.get(path_with_query, follow_redirects=False)
    return current

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
        "captcha",
        "javascript",
    }
)
VALID_LEVELS = frozenset({"low", "medium", "high", "impossible"})

_MODULE_ORDER_REGEX = re.compile(
    r"(?:^|/)(sqli_blind|sqli|xss_r|xss_s|xss_d|weak_id|upload|brute|csrf|exec|csp|javascript|captcha|fi)(?:/|$|\?)"
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
    wire_trace: Optional[dict] = None


def _mask_cookie_header(raw_cookie: str) -> str:
    return re.sub(r"(PHPSESSID=)[^;\s]+", r"\1[redacted]", raw_cookie, flags=re.IGNORECASE)


def _build_wire_trace(
    resp: httpx.Response,
    request_body_preview: str = "",
    latency_ms: float = 0.0,
) -> dict:
    req = getattr(resp, "request", None)
    req_headers: Dict[str, str] = {}
    if req is not None:
        for k, v in req.headers.items():
            kl = k.lower()
            if kl in {"cookie", "authorization"}:
                req_headers[k] = _mask_cookie_header(v) if kl == "cookie" else "[redacted]"
            elif kl in {"host", "user-agent", "content-type", "referer", "accept"}:
                req_headers[k] = v[:180]
    resp_headers: Dict[str, str] = {}
    for key in ("content-type", "content-security-policy", "x-xss-protection", "location", "server", "cache-control"):
        val = resp.headers.get(key)
        if val:
            resp_headers[key] = val[:240]
    set_cookies = resp.headers.get_list("set-cookie")
    body_text = ""
    safe_text = _safe_resp_text(resp)
    if safe_text:
        vuln_match = _VULN_AREA_RE.search(safe_text)
        source_html = vuln_match.group(1) if vuln_match else safe_text
        body_text = _clean_html_text(source_html, max_len=600)
    return {
        "request_method": req.method if req is not None else "GET",
        "request_url": str(req.url) if req is not None else "",
        "request_headers": req_headers,
        "request_body_preview": (request_body_preview or "")[:240],
        "response_status": resp.status_code,
        "response_headers": resp_headers,
        "set_cookies": [sc[:160] for sc in set_cookies[:5]],
        "body_snippet": body_text,
        "latency_ms": round(latency_ms, 1),
    }


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
    level = _validate_no_crlf(_normalize_security_level(security_level), "security_level")
    found = False
    for cookie in list(client.cookies.jar):
        if cookie.name == "security":
            cookie.value = level
            found = True
    if not found:
        host = urlparse(_get_base_url()).hostname or ""
        client.cookies.set("security", level, domain=host, path="/")


def _is_setup_page(resp: httpx.Response) -> bool:
    return "/setup.php" in str(resp.url) or "Create / Reset Database" in _safe_resp_text(resp)


def _initialize_dvwa_db(client: httpx.Client, setup_resp: httpx.Response) -> httpx.Response:
    """Submit DVWA's /setup.php database creation form and return a fresh GET /login.php response."""
    setup_token = _extract_user_token(_safe_resp_text(setup_resp))
    setup_data = {"create_db": "Create / Reset Database"}
    if setup_token:
        setup_data["user_token"] = setup_token
    setup_post = client.post("/setup.php", data=setup_data, follow_redirects=False)
    _follow_safe_internal_redirect(client, setup_post)
    login_resp = client.get("/login.php", follow_redirects=False)
    return _follow_safe_internal_redirect(client, login_resp)


def _submit_dvwa_login(client: httpx.Client, login_page: httpx.Response) -> httpx.Response:
    login_token = _extract_user_token(_safe_resp_text(login_page))
    login_data = {
        "username": _get_username(),
        "password": _get_password(),
        "Login": "Login",
    }
    if login_token:
        login_data["user_token"] = login_token
    post_resp = client.post("/login.php", data=login_data, follow_redirects=False)
    return _follow_safe_internal_redirect(client, post_resp)


@contextmanager
def _create_dvwa_session(
    security_level: str = "low", timeout: Optional[float] = None
) -> Iterator[httpx.Client]:
    """Yield an isolated authenticated DVWA httpx.Client at the requested security tier."""
    level = _normalize_security_level(security_level)
    with httpx.Client(
        base_url=_get_base_url(),
        follow_redirects=False,
        timeout=timeout if timeout is not None else _get_timeout(),
    ) as client:
        resp = _follow_safe_internal_redirect(client, client.get("/login.php", follow_redirects=False))
        if _is_setup_page(resp):
            resp = _initialize_dvwa_db(client, resp)

        final_resp = _submit_dvwa_login(client, resp)
        if _is_setup_page(final_resp):
            login_page = _initialize_dvwa_db(client, final_resp)
            final_resp = _submit_dvwa_login(client, login_page)

        if "/login.php" in str(final_resp.url) or "logout.php" not in _safe_resp_text(final_resp):
            raise RuntimeError(f"DVWA authentication did not complete (final_url={final_resp.url})")

        _set_security_cookie(client, level)
        yield client


def check_dvwa_health() -> Dict[str, object]:
    """Probe DVWA reachability and database initialization status."""
    base_url = _get_base_url()
    timeout = min(_get_timeout(), 3.0)
    try:
        with httpx.Client(base_url=base_url, follow_redirects=False, timeout=timeout) as client:
            resp = _follow_safe_internal_redirect(client, client.get("/login.php", follow_redirects=False))
            if resp.status_code >= 500:
                return {
                    "status": "offline",
                    "reachable": False,
                    "initialized": False,
                    "base_url": base_url,
                }
            final_url = str(resp.url)
            safe_text = _safe_resp_text(resp)
            if "/setup.php" in final_url or "Create / Reset Database" in safe_text:
                return {
                    "status": "setup_required",
                    "reachable": True,
                    "initialized": False,
                    "base_url": base_url,
                }
            if resp.status_code == 200 and (
                "login.php" in final_url or 'name="username"' in safe_text or "DVWA" in safe_text
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


@lru_cache(maxsize=32)
def _fetch_all_dvwa_sources_cached(module_key: str) -> Tuple[Tuple[str, str], ...]:
    items = []
    with _create_dvwa_session("low") as client:
        for tier in ("low", "medium", "high", "impossible"):
            try:
                resp = client.get(
                    "/vulnerabilities/view_source.php",
                    params={"id": module_key, "security": tier},
                )
                resp.raise_for_status()
                match = _CODE_BLOCK_RE.search(resp.text)
                if match:
                    raw_code = match.group(1)
                    cleaned = re.sub(r"<br\s*/?>", "\n", raw_code, flags=re.IGNORECASE)
                    cleaned = re.sub(r"<[^>]+>", "", cleaned)
                    cleaned = html.unescape(cleaned).replace("\xa0", " ").replace("\r\n", "\n").strip()
                    if cleaned:
                        items.append((tier, cleaned))
                        continue
                if module_key == "javascript" and tier == "impossible":
                    items.append(
                        (
                            tier,
                            "// DVWA Impossible: You can never trust client-side JavaScript.\n"
                            "// Generate and verify HMAC/session tokens strictly on the server.",
                        )
                    )
            except Exception:
                continue
    return tuple(items)


def fetch_all_dvwa_sources(module_key: str) -> Dict[str, str]:
    """Fetch low, medium, high, and impossible source handlers in a single cached DVWA session."""
    mod = (module_key or "").strip().lower()
    if mod not in VALID_MODULES:
        return {}
    try:
        return dict(_fetch_all_dvwa_sources_cached(mod))
    except Exception:
        return {}


def _run_sqli(client: httpx.Client, payload: str, level: str) -> DvwaCheckResult:
    page = client.get("/vulnerabilities/sqli/")
    data = {"id": payload, "Submit": "Submit"}
    token = _extract_user_token(page.text)
    if token:
        data["user_token"] = token
    if level == "medium":
        resp = client.post("/vulnerabilities/sqli/", data=data)
        req_preview = f"id={payload}&Submit=Submit"
    elif level == "high":
        client.post("/vulnerabilities/sqli/session-input.php", data=data)
        resp = client.get("/vulnerabilities/sqli/")
        req_preview = f"session-input id={payload}"
    else:
        resp = client.get("/vulnerabilities/sqli/", params=data)
        req_preview = ""
    hits = resp.text.count("First name:")
    lowered = payload.lower()
    has_sqli_syntax = any(
        tok in lowered for tok in ("'", '"', " or ", "union", "--", "#", "1=1")
    )
    matched = hits >= 2 or (level == "high" and hits >= 1 and has_sqli_syntax)
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
    return DvwaCheckResult(
        matched,
        "dvwa_live",
        resp.status_code,
        level,
        evidence,
        wire_trace=_build_wire_trace(resp, request_body_preview=req_preview),
    )


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
    return DvwaCheckResult(
        matched,
        "dvwa_live",
        resp.status_code,
        level,
        evidence,
        wire_trace=_build_wire_trace(resp),
    )


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
        return DvwaCheckResult(
            matched,
            "dvwa_live",
            resp.status_code,
            level,
            evidence,
            wire_trace=_build_wire_trace(resp, request_body_preview=f"txtName=cf_probe&mtxMessage={payload}"),
        )
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
    return DvwaCheckResult(
        matched,
        "dvwa_live",
        resp.status_code,
        level,
        evidence,
        wire_trace=_build_wire_trace(resp),
    )


def _run_fi(client: httpx.Client, payload: str, level: str) -> DvwaCheckResult:
    resp = client.get("/vulnerabilities/fi/", params={"page": payload})
    text = _safe_resp_text(resp)
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
    return DvwaCheckResult(
        matched,
        "dvwa_live",
        resp.status_code,
        level,
        evidence,
        wire_trace=_build_wire_trace(resp),
    )


def _run_exec(client: httpx.Client, payload: str, level: str) -> DvwaCheckResult:
    page = client.get("/vulnerabilities/exec/")
    data = {"ip": payload, "Submit": "Submit"}
    token = _extract_user_token(page.text)
    if token:
        data["user_token"] = token
    resp = client.post("/vulnerabilities/exec/", data=data, timeout=max(_get_timeout(), 20.0))
    blocks = _PRE_BLOCK_RE.findall(_safe_resp_text(resp))
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
    return DvwaCheckResult(
        matched,
        "dvwa_live",
        resp.status_code,
        level,
        evidence,
        wire_trace=_build_wire_trace(resp, request_body_preview=f"ip={payload}&Submit=Submit"),
    )


def _run_sqli_blind(client: httpx.Client, payload: str, level: str) -> DvwaCheckResult:
    page = client.get("/vulnerabilities/sqli_blind/")
    data = {"id": payload, "Submit": "Submit"}
    token = _extract_user_token(page.text)
    if token:
        data["user_token"] = token
    if level == "medium":
        resp = client.post("/vulnerabilities/sqli_blind/", data=data)
        req_preview = f"id={payload}&Submit=Submit"
    elif level == "high":
        _validate_no_crlf(payload, "cookie:id")
        host = urlparse(_get_base_url()).hostname or ""
        client.cookies.set("id", payload, domain=host, path="/")
        resp = client.get("/vulnerabilities/sqli_blind/")
        req_preview = f"Cookie: id={payload}"
    else:
        resp = client.get("/vulnerabilities/sqli_blind/", params=data)
        req_preview = ""
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
    return DvwaCheckResult(
        matched,
        "dvwa_live",
        resp.status_code,
        level,
        evidence,
        wire_trace=_build_wire_trace(resp, request_body_preview=req_preview),
    )


def _extract_upload_filename_and_mime(payload: str) -> Tuple[Optional[str], str]:
    lowered = payload.lower()
    mime = "image/jpeg" if ("image/jpeg" in lowered or "mime" in lowered or "polyglot" in lowered or ".jpg" in lowered or "gif89" in lowered) else "application/octet-stream"
    if "image/png" in lowered or ".png" in lowered:
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
    file_bytes = (
        b"GIF89a;CYBERFORGE_UPLOAD_PROBE_OK"
        if ("gif89" in payload.lower() or mime_type in {"image/jpeg", "image/png"} or ".php." in filename.lower())
        else b"CYBERFORGE_UPLOAD_PROBE_OK"
    )
    files = {"uploaded": (filename, file_bytes, mime_type)}
    resp = client.post("/vulnerabilities/upload/", data=data, files=files)
    uploaded_ok = "succesfully uploaded!" in resp.text.lower() or "successfully uploaded!" in resp.text.lower()
    matched = uploaded_ok and is_risky_target
    evidence = _extract_pre_evidence(
        resp.text,
        fallback=f"Upload attempt for '{filename}' ({mime_type}) returned HTTP {resp.status_code}.",
    )
    return DvwaCheckResult(
        matched,
        "dvwa_live",
        resp.status_code,
        level,
        evidence,
        wire_trace=_build_wire_trace(resp, request_body_preview=f"multipart filename={filename}; Content-Type={mime_type}"),
    )


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
    return DvwaCheckResult(
        matched,
        "dvwa_live",
        r2.status_code,
        level,
        evidence,
        wire_trace=_build_wire_trace(r2, request_body_preview="POST /vulnerabilities/weak_id/"),
    )


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

    headers = {}
    if "referer:" in lowered or "referer=" in lowered or "127.0.0.1" in lowered or "localhost" in lowered:
        headers["Referer"] = f"{_get_base_url()}/vulnerabilities/csrf/"

    resp = client.get("/vulnerabilities/csrf/", params=params, headers=headers, follow_redirects=False)
    matched = resp.status_code == 200 and "Password Changed." in resp.text
    if resp.status_code in (301, 302, 303, 307, 308):
        evidence = f"CSRF request rejected with HTTP {resp.status_code} redirect (missing anti-CSRF token)."
    else:
        evidence = _extract_pre_evidence(
            resp.text,
            fallback=f"CSRF forge request returned HTTP {resp.status_code} under '{level}' security.",
        )
    return DvwaCheckResult(
        matched,
        "dvwa_live",
        resp.status_code,
        level,
        evidence,
        wire_trace=_build_wire_trace(resp),
    )


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
    return DvwaCheckResult(
        matched,
        "dvwa_live",
        resp.status_code,
        level,
        evidence,
        wire_trace=_build_wire_trace(resp),
    )


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
    return DvwaCheckResult(
        matched,
        "dvwa_live",
        resp.status_code,
        level,
        evidence,
        wire_trace=_build_wire_trace(resp, request_body_preview=f"include={stripped}"),
    )


def _run_captcha(client: httpx.Client, payload: str, level: str) -> DvwaCheckResult:
    lowered = payload.lower()
    is_probe = any(
        tok in lowered
        for tok in ("step", "passed_captcha", "hidd3n_valu3", "g-recaptcha-response", "captcha")
    )
    if not is_probe:
        return DvwaCheckResult(
            False,
            "dvwa_live",
            200,
            level,
            "Payload does not attempt a 2-step workflow skip, hidden flag tamper, or header bypass on /vulnerabilities/captcha/.",
        )

    pwd = _get_password()
    qs = parse_qs(payload.lstrip("?")) if ("=" in payload) else {}
    step_val = (qs.get("step", [""])[0] or ("2" if ("step=2" in lowered or "step:2" in lowered or "step 2" in lowered) else "1"))
    if "passed_captcha" in lowered and "step" not in qs:
        step_val = "2"

    data = {
        "step": step_val,
        "password_new": pwd,
        "password_conf": pwd,
        "Change": "Change",
    }
    if qs.get("passed_captcha"):
        data["passed_captcha"] = qs["passed_captcha"][0]
    elif "passed_captcha" in lowered:
        data["passed_captcha"] = "true"

    if qs.get("g-recaptcha-response"):
        data["g-recaptcha-response"] = qs["g-recaptcha-response"][0]
    elif "hidd3n_valu3" in lowered:
        data["g-recaptcha-response"] = "hidd3n_valu3"
    else:
        data["g-recaptcha-response"] = ""

    headers = {}
    if "user-agent" in lowered or "recaptcha" in lowered:
        if qs.get("User-Agent"):
            headers["User-Agent"] = _validate_no_crlf(qs["User-Agent"][0], "header:User-Agent")
        elif qs.get("user-agent"):
            headers["User-Agent"] = _validate_no_crlf(qs["user-agent"][0], "header:User-Agent")
        elif "reCAPTCHA" in payload or "user-agent" in lowered or "ua=" in lowered:
            headers["User-Agent"] = "reCAPTCHA"

    resp = client.post("/vulnerabilities/captcha/", data=data, headers=headers)
    if "Password Changed." in resp.text and level != "impossible":
        matched = True
        evidence = "Password Changed. (DVWA /vulnerabilities/captcha/ bypassed)."
    elif "reCAPTCHA API key missing" in resp.text and resp.status_code == 200:
        # Stock DVWA executes source/{low,medium,high}.php server-side, then overwrites $html when key=''.
        # Validate exact DVWA tier gate against the live POST response:
        if level == "low" and data.get("step") == "2":
            matched = True
            evidence = f"Password Changed on DVWA low handler (HTTP 200; step=2 skipped CAPTCHA gate)."
        elif level == "medium" and data.get("step") == "2" and str(data.get("passed_captcha", "")).lower() in {"true", "1", "yes"}:
            matched = True
            evidence = "Password Changed on DVWA medium handler (HTTP 200; step=2 & passed_captcha=true spoofed)."
        elif level == "high" and data.get("g-recaptcha-response") == "hidd3n_valu3" and headers.get("User-Agent") == "reCAPTCHA":
            matched = True
            evidence = "Password Changed on DVWA high handler (HTTP 200; hidd3n_valu3 + User-Agent: reCAPTCHA backdoor matched)."
        else:
            matched = False
            evidence = f"CAPTCHA gate rejected payload under '{level}' security (HTTP {resp.status_code})."
    else:
        matched = False
        evidence = _extract_pre_evidence(
            resp.text,
            fallback=f"CAPTCHA workflow returned HTTP {resp.status_code} under '{level}' security.",
        )
    return DvwaCheckResult(
        matched,
        "dvwa_live",
        resp.status_code,
        level,
        evidence,
        wire_trace=_build_wire_trace(resp, request_body_preview=f"step={data['step']}&passed_captcha={data.get('passed_captcha', '')}"),
    )


def _run_javascript(client: httpx.Client, payload: str, level: str) -> DvwaCheckResult:
    stripped = payload.strip()
    phrase = ""
    token = ""
    if "phrase=" in stripped or "token=" in stripped:
        qs = parse_qs(stripped.lstrip("?"))
        phrase = (qs.get("phrase", [""])[0] or "").strip()
        token = (qs.get("token", [""])[0] or "").strip()
    elif ":" in stripped and " " not in stripped.split(":", 1)[0]:
        phrase, token = [part.strip() for part in stripped.split(":", 1)]

    if not phrase or not token:
        return DvwaCheckResult(
            False,
            "dvwa_live",
            200,
            level,
            "Provide both phrase and forged token (e.g. phrase=success&token=<computed_digest>).",
        )

    resp = client.post(
        "/vulnerabilities/javascript/",
        data={"phrase": phrase, "token": token, "send": "Submit"},
    )
    matched = "Well done!" in resp.text and level != "impossible"
    vuln_match = _VULN_AREA_RE.search(resp.text or "")
    evidence = (
        _clean_html_text(vuln_match.group(1), 200)
        if vuln_match
        else f"JavaScript challenge returned HTTP {resp.status_code} under '{level}' security."
    )
    return DvwaCheckResult(
        matched,
        "dvwa_live",
        resp.status_code,
        level,
        evidence,
        wire_trace=_build_wire_trace(resp, request_body_preview=f"phrase={phrase}&token={token[:48]}"),
    )


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
    "captcha": _run_captcha,
    "javascript": _run_javascript,
}


def _execute_module(module_key: str, payload: str, security_level: str) -> Optional[DvwaCheckResult]:
    _validate_no_crlf(payload, "payload")
    _validate_no_crlf(security_level or "low", "security_level")
    runner = _MODULE_RUNNERS.get(module_key)
    if runner is None:
        return None
    level = _normalize_security_level(security_level)
    t0 = time.perf_counter()
    try:
        with _create_dvwa_session(level) as client:
            res = runner(client, payload, level)
            if res is not None and res.wire_trace is not None and not res.wire_trace.get("latency_ms"):
                res.wire_trace["latency_ms"] = round((time.perf_counter() - t0) * 1000, 1)
            return res
    except ValueError:
        raise
    except Exception:
        return None


def verify_attack(
    challenge,
    payload_used: str,
    target_security_level: str = "low",
) -> Optional[DvwaCheckResult]:
    """Verify an exploit payload live against DVWA at the requested offensive tier (low/medium/high)."""
    _validate_no_crlf(payload_used, "payload_used")
    _validate_no_crlf(target_security_level or "low", "target_security_level")
    module_key = resolve_dvwa_module(getattr(challenge, "dvwa_page_ref", ""))
    if not module_key:
        return None
    level = _normalize_security_level(target_security_level)
    if level == "impossible":
        level = "high"
    return _execute_module(module_key, payload_used, level)


def verify_defense(challenge, security_level_applied: str) -> Tuple[Optional[DvwaCheckResult], Optional[dict]]:
    """Replay challenge.reference_payload at low (before) and security_level_applied (after)."""
    _validate_no_crlf(security_level_applied or "low", "security_level_applied")
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
