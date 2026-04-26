"""MailPilot Public API — batch operations and automation endpoints."""

import asyncio
import re

import httpx
from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse

router = APIRouter(tags=["public-api"])


def _get_app_deps():
    """Lazy import to avoid circular dependency."""
    from app import (
        _read_accounts, _save_accounts, obtain_access_token,
        fetch_mails_graph, _fetch_mails_imap, OAUTH2_URL
    )
    return {
        "read": _read_accounts,
        "save": _save_accounts,
        "token": obtain_access_token,
        "graph": fetch_mails_graph,
        "imap": _fetch_mails_imap,
        "oauth_url": OAUTH2_URL,
    }


@router.post("/batch-check")
async def batch_check(request: Request):
    """Batch check token status. Body: {"emails": [...]} or {"all": true}"""
    deps = _get_app_deps()
    body = await request.json()
    accounts = await deps["read"]()

    if body.get("all"):
        targets = accounts
    else:
        emails = set(body.get("emails", []))
        targets = [a for a in accounts if a["email"] in emails]

    results = []
    for a in targets:
        if not a.get("refreshToken") or not a.get("clientId"):
            results.append({"email": a["email"], "status": "invalid", "error": "missing credentials"})
            continue
        try:
            access_token = await deps["token"](a["clientId"], a["refreshToken"])
            if access_token:
                results.append({"email": a["email"], "status": "valid"})
            else:
                results.append({"email": a["email"], "status": "invalid", "error": "oauth failed"})
        except Exception as e:
            results.append({"email": a["email"], "status": "invalid", "error": str(e)})

    status_map = {r["email"]: r["status"] for r in results}
    for a in accounts:
        if a["email"] in status_map:
            a["tokenStatus"] = status_map[a["email"]]
            a["permissionType"] = "O2" if status_map[a["email"]] == "valid" else ""
    await deps["save"](accounts)

    return JSONResponse(content={"checked": len(results), "results": results})


@router.post("/batch-renew")
async def batch_renew(request: Request):
    """Batch renew tokens. Body: {"emails": [...]} or {"all": true}"""
    deps = _get_app_deps()
    body = await request.json()
    accounts = await deps["read"]()

    if body.get("all"):
        targets = [a for a in accounts if a.get("refreshToken") and a.get("clientId")]
    else:
        emails = set(body.get("emails", []))
        targets = [a for a in accounts if a["email"] in emails and a.get("refreshToken")]

    from datetime import datetime
    results = []

    for a in targets:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(deps["oauth_url"], data={
                    "client_id": a["clientId"],
                    "refresh_token": a["refreshToken"],
                    "grant_type": "refresh_token",
                })
            if resp.status_code == 200:
                data = resp.json()
                new_rt = data.get("refresh_token", "")
                if new_rt:
                    now_iso = datetime.utcnow().isoformat() + "Z"
                    for acc in accounts:
                        if acc["email"] == a["email"]:
                            acc["refreshToken"] = new_rt
                            acc["tokenRenewedAt"] = now_iso
                            break
                    results.append({"email": a["email"], "success": True})
                else:
                    results.append({"email": a["email"], "success": False, "error": "no new token"})
            else:
                results.append({"email": a["email"], "success": False, "error": f"HTTP {resp.status_code}"})
        except Exception as e:
            results.append({"email": a["email"], "success": False, "error": str(e)})

    await deps["save"](accounts)
    success_count = sum(1 for r in results if r.get("success"))
    return JSONResponse(content={"renewed": success_count, "failed": len(results) - success_count, "results": results})


@router.post("/batch-delete")
async def batch_delete(request: Request):
    """Batch delete accounts. Body: {"emails": [...]}"""
    deps = _get_app_deps()
    body = await request.json()
    emails = set(body.get("emails", []))
    accounts = await deps["read"]()
    before = len(accounts)
    accounts = [a for a in accounts if a["email"] not in emails]
    await deps["save"](accounts)
    return JSONResponse(content={"deleted": before - len(accounts), "remaining": len(accounts)})


@router.get("/copy-emails")
async def copy_emails(
    type: str = Query("email"),
    emails: str = Query(""),
):
    """Get email/password/both for specified or all accounts."""
    deps = _get_app_deps()
    accounts = await deps["read"]()
    if emails:
        email_set = set(e.strip() for e in emails.split(","))
        accounts = [a for a in accounts if a["email"] in email_set]

    if type == "email":
        lines = [a["email"] for a in accounts]
    elif type == "password":
        lines = [a.get("password", "") for a in accounts]
    elif type == "both":
        lines = [a["email"] + "----" + a.get("password", "") for a in accounts]
    else:
        lines = [a["email"] + "----" + a.get("password", "") + "----" + a.get("clientId", "") + "----" + a.get("refreshToken", "") for a in accounts]

    return JSONResponse(content={"count": len(lines), "data": "\n".join(lines)})


@router.get("/extract-code")
async def extract_code(
    email: str = Query(...),
    client_id: str = Query(...),
    refresh_token: str = Query(...),
    keyword: str = Query(""),
    pattern: str = Query(r"\b\d{4,8}\b"),
):
    """Extract verification code from latest emails."""
    deps = _get_app_deps()

    access_token = await deps["token"](client_id, refresh_token)
    if not access_token:
        return JSONResponse(status_code=401, content={"error": "OAuth failed"})

    mails = []
    try:
        mails = await deps["graph"](access_token, "Inbox")
    except Exception:
        try:
            mails = await asyncio.to_thread(deps["imap"], email, access_token, "INBOX", 10)
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    results = []
    for mail in mails[:10]:
        subject = mail.get("subject", "")
        sender = mail.get("send", "")
        body = mail.get("html", "") or mail.get("text", "")
        date_str = mail.get("date", "")

        if keyword:
            kw_lower = keyword.lower()
            if kw_lower not in subject.lower() and kw_lower not in sender.lower() and kw_lower not in body.lower():
                continue

        clean_body = re.sub(r'<[^>]+>', ' ', body)
        codes = re.findall(pattern, clean_body)

        if codes:
            results.append({
                "email": email, "subject": subject, "sender": sender,
                "date": date_str, "codes": list(set(codes)),
            })

    if results:
        return JSONResponse(content={
            "found": True, "email": email,
            "results": results, "latest_code": results[0]["codes"][0],
        })
    return JSONResponse(content={
        "found": False, "email": email,
        "message": "No verification code found" + (f" for '{keyword}'" if keyword else ""),
    })
