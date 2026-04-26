"""Lightweight Outlook email management backend."""

import asyncio
import email as email_lib
import email.header
import imaplib
import json
import logging
import os
import sys
import threading
import webbrowser
from datetime import date

# PyInstaller 打包后 static/ 在临时解压目录中
if getattr(sys, 'frozen', False):
    _BASE_DIR = sys._MEIPASS
else:
    _BASE_DIR = os.path.dirname(os.path.abspath(__file__))

STATIC_DIR = os.path.join(_BASE_DIR, "static")

import httpx
import uvicorn
from fastapi import FastAPI, File, Query, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Outlook Manager")

OAUTH2_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
GRAPH_MESSAGES_URL = "https://graph.microsoft.com/v1.0/me/mailFolders/{folder}/messages"

OUTPUT_DIR = "output"
ACCOUNTS_PATH = os.path.join(OUTPUT_DIR, "accounts.json")
GROUPS_PATH = os.path.join(OUTPUT_DIR, "groups.json")
CSV_PATH = os.path.join(OUTPUT_DIR, "accounts.csv")

_accounts_lock = asyncio.Lock()


# ---------------------------------------------------------------------------
# Data persistence helpers
# ---------------------------------------------------------------------------

def _ensure_output_dir() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)


def _read_json(path: str) -> list:
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_json(path: str, data: list) -> None:
    _ensure_output_dir()
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _write_csv(accounts: list) -> None:
    _ensure_output_dir()
    cols = ["email", "password", "clientId", "refreshToken", "group", "tokenStatus", "permissionType"]
    with open(CSV_PATH, "w", encoding="utf-8-sig") as f:
        f.write(",".join(cols) + "\n")
        for a in accounts:
            f.write(",".join(str(a.get(c, "")) for c in cols) + "\n")


async def _read_accounts() -> list:
    return await asyncio.to_thread(_read_json, ACCOUNTS_PATH)


async def _save_accounts(accounts: list) -> None:
    async with _accounts_lock:
        await asyncio.to_thread(_write_json, ACCOUNTS_PATH, accounts)
        await asyncio.to_thread(_write_csv, accounts)


async def _read_groups() -> list:
    return await asyncio.to_thread(_read_json, GROUPS_PATH)


async def _save_groups(groups: list) -> None:
    await asyncio.to_thread(_write_json, GROUPS_PATH, groups)


# ---------------------------------------------------------------------------
# Graph API helpers (unchanged)
# ---------------------------------------------------------------------------

async def obtain_access_token(client_id: str, refresh_token: str) -> str | None:
    """Exchange refresh_token for a short-lived access_token (1h). Does NOT consume the refresh_token."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(OAUTH2_URL, data={
            "client_id": client_id,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        })
        if resp.status_code == 200:
            return resp.json().get("access_token")
        logger.warning("OAuth2 failed [%s]: %s", resp.status_code, resp.text[:300])
        return None


FOLDER_MAP = {
    "INBOX": "Inbox",
    "Junk": "JunkEmail",
    "JunkEmail": "JunkEmail",
    "Drafts": "Drafts",
    "SentItems": "SentItems",
    "Sent": "SentItems",
}


async def fetch_mails_graph(access_token: str, mailbox: str, count: int = 20) -> list[dict]:
    """Fetch emails via Microsoft Graph API."""
    folder = FOLDER_MAP.get(mailbox, mailbox)
    url = GRAPH_MESSAGES_URL.format(folder=folder)
    params = {
        "$top": str(count),
        "$orderby": "receivedDateTime desc",
        "$select": "subject,from,receivedDateTime,body,bodyPreview",
    }
    headers = {"Authorization": f"Bearer {access_token}"}

    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(url, params=params, headers=headers)
        if resp.status_code == 401:
            raise PermissionError("Graph API 401")
        resp.raise_for_status()
        data = resp.json()

    results = []
    for msg in data.get("value", []):
        sender = ""
        from_info = msg.get("from", {}).get("emailAddress", {})
        if from_info:
            name = from_info.get("name", "")
            addr = from_info.get("address", "")
            sender = f"{name} <{addr}>" if name else addr

        body_obj = msg.get("body", {})
        body_content = body_obj.get("content", "")
        body_type = body_obj.get("contentType", "text")

        results.append({
            "send": sender,
            "subject": msg.get("subject", ""),
            "date": msg.get("receivedDateTime", ""),
            "text": body_content if body_type == "text" else "",
            "html": body_content if body_type == "html" else "",
        })
    return results


# ---------------------------------------------------------------------------
# IMAP fallback (for tokens with IMAP scope instead of Graph scope)
# ---------------------------------------------------------------------------

IMAP_HOST = "outlook.office365.com"
IMAP_PORT = 993


def _decode_header(raw: str | None) -> str:
    if not raw:
        return ""
    parts = email_lib.header.decode_header(raw)
    decoded = []
    for data, charset in parts:
        if isinstance(data, bytes):
            decoded.append(data.decode(charset or "utf-8", errors="replace"))
        else:
            decoded.append(data)
    return "".join(decoded)


def _get_body(msg) -> tuple[str, str]:
    text_body, html_body = "", ""
    if msg.is_multipart():
        for part in msg.walk():
            ct = part.get_content_type()
            if part.get("Content-Disposition", "").startswith("attachment"):
                continue
            payload = part.get_payload(decode=True)
            if payload is None:
                continue
            charset = part.get_content_charset() or "utf-8"
            content = payload.decode(charset, errors="replace")
            if ct == "text/plain" and not text_body:
                text_body = content
            elif ct == "text/html" and not html_body:
                html_body = content
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            content = payload.decode(charset, errors="replace")
            if msg.get_content_type() == "text/html":
                html_body = content
            else:
                text_body = content
    return text_body, html_body


def _fetch_mails_imap(email_addr: str, access_token: str, mailbox: str, count: int = 20) -> list[dict]:
    auth_string = f"user={email_addr}\x01auth=Bearer {access_token}\x01\x01"
    conn = imaplib.IMAP4_SSL(IMAP_HOST, IMAP_PORT, timeout=20)
    try:
        conn.authenticate("XOAUTH2", lambda _: auth_string.encode())
        conn.select(mailbox, readonly=True)
        _, data = conn.search(None, "ALL")
        msg_ids = data[0].split()
        if not msg_ids:
            return []
        latest = msg_ids[-count:]
        latest.reverse()
        results = []
        for mid in latest:
            _, msg_data = conn.fetch(mid, "(RFC822)")
            if not msg_data or not msg_data[0]:
                continue
            raw = msg_data[0][1]
            msg = email_lib.message_from_bytes(raw)
            sender = _decode_header(msg.get("From", ""))
            subject = _decode_header(msg.get("Subject"))
            date_str = msg.get("Date", "")
            text_body, html_body = _get_body(msg)
            results.append({
                "send": sender,
                "subject": subject,
                "date": date_str,
                "text": text_body,
                "html": html_body,
            })
        return results
    finally:
        try:
            conn.logout()
        except Exception:
            pass


IMAP_FOLDER_MAP = {
    "INBOX": "INBOX",
    "Inbox": "INBOX",
    "Junk": "Junk",
    "JunkEmail": "Junk",
}


# ---------------------------------------------------------------------------
# API — mail (with IMAP fallback)
# ---------------------------------------------------------------------------

@app.get("/api/mail-all")
async def mail_all(
    email: str = Query(...),
    client_id: str = Query(...),
    refresh_token: str = Query(...),
    mailbox: str = Query("INBOX"),
    response_type: str = Query("json"),
    password: str = Query(""),
):
    """
    Unified endpoint for both token checking and mail reading.

    Front-end logic (same as reference site):
    - 200 → token valid, mails returned
    - 401 → token invalid
    - 500 → server error (token may still be valid)
    """
    # 1. OAuth2 token exchange
    try:
        access_token = await obtain_access_token(client_id, refresh_token)
    except Exception as exc:
        logger.error("OAuth2 request error: %s", exc)
        return JSONResponse(status_code=500, content={"error": str(exc)})

    if not access_token:
        return JSONResponse(status_code=401, content={"error": "OAuth2 token exchange failed"})

    # 2. Try Graph API first
    try:
        mails = await fetch_mails_graph(access_token, mailbox)
        return JSONResponse(content=mails)
    except (PermissionError, httpx.HTTPStatusError) as graph_err:
        logger.info("Graph API failed for %s, trying IMAP fallback: %s", email, graph_err)
    except Exception as graph_err:
        logger.info("Graph API error for %s, trying IMAP fallback: %s", email, graph_err)

    # 3. IMAP fallback (for tokens with IMAP scope)
    try:
        imap_folder = IMAP_FOLDER_MAP.get(mailbox, mailbox)
        mails = await asyncio.to_thread(_fetch_mails_imap, email, access_token, imap_folder)
        return JSONResponse(content=mails)
    except imaplib.IMAP4.error as imap_err:
        err_str = str(imap_err).upper()
        if "AUTHENTICATE" in err_str or "AUTH" in err_str:
            return JSONResponse(status_code=401, content={"error": "Auth failed (both Graph and IMAP)"})
        return JSONResponse(status_code=500, content={"error": str(imap_err)})
    except Exception as exc:
        logger.error("Both Graph and IMAP failed for %s: %s", email, exc)
        return JSONResponse(status_code=500, content={"error": str(exc)})


# ---------------------------------------------------------------------------
# API — accounts CRUD
# ---------------------------------------------------------------------------
# API — manual token renewal (user-triggered only)
# ---------------------------------------------------------------------------

@app.post("/api/renew-token")
async def renew_token(request: Request):
    """
    User-triggered token renewal. Exchanges current refresh_token for a new one.
    Returns the new refresh_token + updated tokenRenewedAt timestamp.
    The OLD refresh_token is invalidated by Microsoft after this call.
    """
    body = await request.json()
    email_addr = body.get("email", "")
    client_id = body.get("clientId", "")
    old_refresh_token = body.get("refreshToken", "")

    if not email_addr or not client_id or not old_refresh_token:
        return JSONResponse(status_code=400, content={"error": "Missing required fields"})

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(OAUTH2_URL, data={
                "client_id": client_id,
                "refresh_token": old_refresh_token,
                "grant_type": "refresh_token",
            })
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": f"Network error: {exc}"})

    if resp.status_code != 200:
        return JSONResponse(status_code=401, content={
            "error": "Token renewal failed — token may be expired or revoked",
            "detail": resp.text[:200],
        })

    data = resp.json()
    new_rt = data.get("refresh_token", "")
    new_at = data.get("access_token", "")

    if not new_rt:
        return JSONResponse(status_code=500, content={"error": "No new refresh_token returned"})

    # Verify the new token actually works (read 1 mail)
    try:
        test_resp = await httpx.AsyncClient(timeout=15).get(
            "https://graph.microsoft.com/v1.0/me/mailFolders/Inbox/messages",
            params={"$top": "1", "$select": "subject"},
            headers={"Authorization": f"Bearer {new_at}"},
        )
        mail_ok = test_resp.status_code == 200
    except Exception:
        mail_ok = False

    # Update accounts.json
    from datetime import datetime
    now_iso = datetime.utcnow().isoformat() + "Z"

    async with _accounts_lock:
        accounts = await asyncio.to_thread(_read_json, ACCOUNTS_PATH)
        for a in accounts:
            if a.get("email") == email_addr:
                a["refreshToken"] = new_rt
                a["tokenRenewedAt"] = now_iso
                break
        await asyncio.to_thread(_write_json, ACCOUNTS_PATH, accounts)
        await asyncio.to_thread(_write_csv, accounts)

    logger.info("Token manually renewed for %s (mail_ok=%s)", email_addr, mail_ok)

    return JSONResponse(content={
        "success": True,
        "newRefreshToken": new_rt,
        "tokenRenewedAt": now_iso,
        "mailAccessOk": mail_ok,
    })


# ---------------------------------------------------------------------------
# API — accounts CRUD
# ---------------------------------------------------------------------------

@app.get("/api/accounts")
async def get_accounts():
    return JSONResponse(content=await _read_accounts())


@app.post("/api/accounts")
async def post_accounts(request: Request):
    accounts = await request.json()
    await _save_accounts(accounts)
    return JSONResponse(content={"ok": True})


# ---------------------------------------------------------------------------
# API — groups CRUD
# ---------------------------------------------------------------------------

@app.get("/api/groups")
async def get_groups():
    return JSONResponse(content=await _read_groups())


@app.post("/api/groups")
async def post_groups(request: Request):
    groups = await request.json()
    await _save_groups(groups)
    return JSONResponse(content={"ok": True})


# ---------------------------------------------------------------------------
# API — export / import
# ---------------------------------------------------------------------------

@app.get("/api/export")
async def export_accounts():
    accounts = await _read_accounts()
    lines = []
    for a in accounts:
        line = "----".join([
            a.get("email", ""),
            a.get("password", ""),
            a.get("clientId", ""),
            a.get("refreshToken", ""),
        ])
        lines.append(line)
    content = "\n".join(lines)
    from urllib.parse import quote
    filename = f"邮箱列表_{date.today().isoformat()}.txt"
    return Response(
        content=content.encode("utf-8"),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"},
    )


@app.post("/api/import")
async def import_accounts(file: UploadFile = File(...)):
    try:
        raw = await file.read()
        text = raw.decode("utf-8-sig")  # handles BOM
    except Exception as exc:
        logger.error("Import read error: %s", exc)
        return JSONResponse(status_code=400, content={"error": f"File read failed: {exc}"})

    existing = await _read_accounts()
    existing_emails = {a["email"] for a in existing}

    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split("----")
        if len(parts) >= 4:
            email, password, client_id, refresh_token = parts[0], parts[1], parts[2], parts[3]
        elif len(parts) >= 2:
            email, password = parts[0], parts[1]
            client_id, refresh_token = "", ""
        else:
            continue
        if email in existing_emails:
            continue
        existing_emails.add(email)
        existing.append({
            "email": email,
            "password": password,
            "clientId": client_id,
            "refreshToken": refresh_token,
            "group": "未分组",
            "tokenStatus": "",
            "permissionType": "",
        })

    await _save_accounts(existing)
    return JSONResponse(content=existing)


# ---------------------------------------------------------------------------
# Static files & index
# ---------------------------------------------------------------------------

@app.get("/")
async def index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


# ---------------------------------------------------------------------------
# Include public API router (MUST be before static mount)
# ---------------------------------------------------------------------------

from api import router as api_router
app.include_router(api_router, prefix="/api")

app.mount("/", StaticFiles(directory=STATIC_DIR), name="static")


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup():
    _ensure_output_dir()
    logger.info("Output directory ready: %s", os.path.abspath(OUTPUT_DIR))


if __name__ == "__main__":
    threading.Timer(1.5, lambda: webbrowser.open("http://127.0.0.1:1375")).start()
    uvicorn.run(app, host="0.0.0.0", port=1375, log_level="info")
