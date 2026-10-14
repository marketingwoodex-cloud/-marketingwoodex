#!/usr/bin/env python3
"""
tools/verify-dashboard.py — check every figure GET /dashboard returns against the database behind it.

The dashboard is the first screen a person sees, and each number on it is a claim about the studio. This
script makes that claim checkable without trusting the PHP that produced it: it reads the SQLite file directly,
computes each figure with its own SQL, signs in to the running API, and compares the two.

  python3 tools/verify-dashboard.py                 # against http://127.0.0.1:8080/api/v2
  python3 tools/verify-dashboard.py --stale-check   # also backdates one lead, checks the stale rule, restores it

Exit status 0 when every figure agrees, 1 when one does not, 2 when the setup is wrong.

Notes on what is and is not checked:
  · `quotes.value` is returned as 0 by design ("values inside the documents, not summed here"). It is reported
    as information next to the figure the database would give, and it is not counted as a failure.
  · The attention list is compared for the rule it implements (stale leads and the unread-enquiries line). The
    settings also name an expiring-quote rule and an overdue-invoice rule; the API does not list those yet, and
    the script says so rather than pretending they pass.
  · The API and this script both use UTC for "today" and for the stale cut-off (the health probe reports +00:00).
"""
import argparse
import datetime as dt
import http.cookiejar
import json
import os
import re
import sqlite3
import sys
import urllib.error
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OPEN_STAGES = ["new", "contacted", "visit", "quote", "hold"]
# The screen's rule names -> the settings keys migration 005 seeds, and the same seeded fallbacks.
RULES = {
    "stale_lead_days": ("attention.lead_stale_days", 3),
    "quote_expiry_days": ("attention.quote_expiring_days", 2),
    "unpaid_days": ("attention.invoice_overdue_days", 1),
}


class Check:
    def __init__(self):
        self.rows = []
        self.failed = 0

    def add(self, name, api, db, note=""):
        ok = api == db
        if not ok:
            self.failed += 1
        self.rows.append((("ok  " if ok else "FAIL"), name, json.dumps(api), json.dumps(db), note))
        return ok

    def info(self, name, api, db, note):
        self.rows.append(("info", name, json.dumps(api), json.dumps(db), note))

    def gap(self, name, note):
        self.rows.append(("gap ", name, "-", "-", note))

    def print(self):
        w = max(len(r[1]) for r in self.rows) if self.rows else 10
        print(f"{'':4}  {'figure'.ljust(w)}  {'api':>14}  {'database':>14}  note")
        for tag, name, api, db, note in self.rows:
            print(f"{tag}  {name.ljust(w)}  {api:>14}  {db:>14}  {note}")


def read_owner():
    """The local owner's sign-in, from the file the setup wrote. The password is never printed."""
    path = os.path.join(ROOT, "_private", "dev-owner.txt")
    if not os.path.exists(path):
        sys.exit("no _private/dev-owner.txt — run `npm run db:init` and `npm run db:owner` first")
    txt = open(path, encoding="utf8").read()
    email = re.search(r"name:\s*(\S+)", txt)
    pw = re.search(r"password:\s*(\S+)", txt)
    if not email or not pw:
        sys.exit("_private/dev-owner.txt has no sign-in in it")
    return email.group(1), pw.group(1)


def database_path():
    cfg = json.load(open(os.path.join(ROOT, "_private", "db.json"), encoding="utf8"))
    if cfg.get("driver") != "sqlite":
        sys.exit("this check reads the SQLite development database; _private/db.json says " + str(cfg.get("driver")))
    return os.path.join(ROOT, "_private", cfg["file"])


class Api:
    def __init__(self, base):
        self.base = base.rstrip("/")
        self.jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.csrf = ""

    def call(self, method, path, body=None):
        headers = {"Accept": "application/json"}
        data = None
        if body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        if method != "GET" and self.csrf:
            headers["X-WX-CSRF"] = self.csrf
        req = urllib.request.Request(self.base + path, data=data, headers=headers, method=method)
        try:
            res = self.opener.open(req)
            text = res.read().decode()
        except urllib.error.HTTPError as e:
            text = e.read().decode()
        out = json.loads(text)
        if not out.get("ok"):
            raise RuntimeError(f"{method} {path}: {out.get('error', {}).get('message', text[:200])}")
        return out["data"]

    def sign_in(self):
        email, pw = read_owner()
        data = self.call("POST", "/auth/login", {"email": email, "password": pw})
        self.csrf = data["csrf"]


def expected(db):
    """Every dashboard figure, computed straight from the tables with plain SQL."""
    q = lambda sql, args=(): db.execute(sql, args).fetchall()
    now = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None)
    today = now.strftime("%Y-%m-%d")
    e = {}
    e["byStage"] = {s: {"count": c, "value": int(v or 0)} for s, c, v in q(
        "SELECT stage, COUNT(*), COALESCE(SUM(value),0) FROM wx_leads GROUP BY stage")}
    e["open"] = sum(e["byStage"].get(s, {}).get("count", 0) for s in OPEN_STAGES)
    e["openValue"] = sum(e["byStage"].get(s, {}).get("value", 0) for s in OPEN_STAGES)
    e["unread"] = q("SELECT COUNT(*) FROM wx_leads WHERE is_read = 0")[0][0]
    e["quotes"] = {
        "total": q("SELECT COUNT(*) FROM wx_quotes")[0][0],
        "open": q("SELECT COUNT(*) FROM wx_quotes WHERE status IN ('draft','sent','viewed')")[0][0],
        "value_db": int(q("SELECT COALESCE(SUM(total),0) FROM wx_quotes WHERE status IN ('draft','sent','viewed')")[0][0] or 0),
    }
    e["chats"] = {
        "open": q("SELECT COUNT(*) FROM wx_chats WHERE status = 'open'")[0][0],
        "unread": int(q("SELECT COALESCE(SUM(unread),0) FROM wx_chats")[0][0] or 0),
        "needs": q("SELECT COUNT(*) FROM wx_chats WHERE needs = 1")[0][0],
    }
    e["bookings"] = {
        "pending": q("SELECT COUNT(*) FROM wx_bookings WHERE status = 'pending'")[0][0],
        "today": q("SELECT COUNT(*) FROM wx_bookings WHERE d = ?", (today,))[0][0],
    }
    settings = dict(q("SELECT k, v FROM wx_settings WHERE k LIKE 'attention.%'"))
    rules = {}
    for name, (key, default) in RULES.items():
        rules[name] = int(settings[key]) if key in settings and str(settings[key]).isdigit() else default
    e["rules"] = rules
    cut = (now - dt.timedelta(days=rules["stale_lead_days"])).strftime("%Y-%m-%d %H:%M:%S")
    stale = q(
        "SELECT id FROM wx_leads WHERE stage NOT IN ('won','lost') "
        "AND COALESCE(last_contact, created_at) < ? ORDER BY COALESCE(last_contact, created_at) ASC LIMIT 8",
        (cut,))
    e["stale_ids"] = [r[0] for r in stale]
    e["stale_total"] = q(
        "SELECT COUNT(*) FROM wx_leads WHERE stage NOT IN ('won','lost') AND COALESCE(last_contact, created_at) < ?",
        (cut,))[0][0]
    return e


def compare(api, e, check):
    d = api
    for stage in sorted(set(e["byStage"]) | set(d["leads"]["byStage"])):
        a = d["leads"]["byStage"].get(stage, {"count": 0, "value": 0})
        b = e["byStage"].get(stage, {"count": 0, "value": 0})
        check.add(f"leads.byStage.{stage}.count", a["count"], b["count"])
        check.add(f"leads.byStage.{stage}.value", a["value"], b["value"])
    check.add("leads.open", d["leads"]["open"], e["open"])
    check.add("leads.openValue", d["leads"]["openValue"], e["openValue"])
    check.add("leads.unread", d["leads"]["unread"], e["unread"])
    check.add("quotes.total", d["quotes"]["total"], e["quotes"]["total"])
    check.add("quotes.open", d["quotes"]["open"], e["quotes"]["open"])
    check.info("quotes.value (API)", d["quotes"]["value"], e["quotes"]["value_db"],
               "returned as 0 by design; the database sum of open quotes is shown for reference")
    check.add("chats.open", d["chats"]["open"], e["chats"]["open"])
    check.add("chats.unread", d["chats"]["unread"], e["chats"]["unread"])
    check.add("chats.needs", d["chats"]["needs"], e["chats"]["needs"])
    check.add("bookings.pending", d["bookings"]["pending"], e["bookings"]["pending"])
    check.add("bookings.today", d["bookings"]["today"], e["bookings"]["today"])
    for name in RULES:
        check.add(f"rules.{name}", d["rules"][name], e["rules"][name], "from wx_settings (migration 005)")
    # The attention list: stale leads, then the unread-enquiries line, then chats that need a person.
    api_stale = [a["id"] for a in d["attention"] if a["kind"] == "stale_lead"]
    check.add("attention.stale_leads", api_stale, e["stale_ids"], f"{e['stale_total']} stale in total, list capped at 8")
    unread_items = [a for a in d["attention"] if a["kind"] == "unread_leads"]
    if e["unread"] > 0:
        check.add("attention.unread line", [a["title"] for a in unread_items], [f"{e['unread']} new enquiries"])
    else:
        check.add("attention.unread line", len(unread_items), 0)
    chat_items = [a for a in d["attention"] if a["kind"] == "chat_help"]
    check.add("attention.chat line", len(chat_items), 1 if e["chats"]["needs"] > 0 else 0)
    # The headline the screen builds from these (LiveDashboard): chats that need a person + unread + pending.
    needs = e["chats"]["needs"] + e["unread"] + e["bookings"]["pending"]
    check.info("headline: things needing a person", needs, needs, "computed by the screen from the figures above")
    check.gap("attention: expiring quotes", "rule `quote_expiring_days` is configured but not listed by the API")
    check.gap("attention: overdue invoices", "rule `invoice_overdue_days` is configured but not listed by the API")


def stale_check(api, db_path):
    """Backdate one open lead, expect exactly one more stale lead, then put the row back exactly as it was."""
    con = sqlite3.connect(db_path)
    row = con.execute("SELECT id, created_at, last_contact FROM wx_leads WHERE stage = 'new' ORDER BY id LIMIT 1").fetchone()
    if row is None:
        con.close()
        return None, "no open lead to backdate"
    lid, created, contacted = row
    old = (dt.datetime.now(dt.timezone.utc).replace(tzinfo=None) - dt.timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")
    try:
        con.execute("UPDATE wx_leads SET created_at = ?, last_contact = NULL WHERE id = ?", (old, lid))
        con.commit()
        after = api.call("GET", "/dashboard")["attention"]
        ids = [a["id"] for a in after if a["kind"] == "stale_lead"]
        return {"lead": lid, "found": lid in ids, "count": len(ids)}, None
    finally:
        con.execute("UPDATE wx_leads SET created_at = ?, last_contact = ? WHERE id = ?", (created, contacted, lid))
        con.commit()
        con.close()


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--base", default="http://127.0.0.1:8080/api/v2")
    p.add_argument("--stale-check", action="store_true")
    args = p.parse_args()

    db_path = database_path()
    if not os.path.exists(db_path):
        print(f"no database at {db_path} — run `npm run db:init` and the seeder first")
        return 2
    api = Api(args.base)
    try:
        api.sign_in()
    except Exception as err:  # noqa: BLE001 - report and stop
        print(f"could not sign in to {args.base}: {err}")
        return 2

    con = sqlite3.connect(db_path)
    try:
        before = api.call("GET", "/dashboard")
        e = expected(con)
    finally:
        con.close()

    check = Check()
    compare(before, e, check)
    print(f"dashboard figures against {db_path}\n")
    check.print()

    status = 0 if check.failed == 0 else 1
    if args.stale_check:
        print("\nstale-lead rule: backdating one open lead for the check, then restoring it")
        result, err = stale_check(api, db_path)
        if err:
            print("  skipped:", err)
        else:
            print(f"  lead {result['lead']} is listed as stale: {'ok' if result['found'] else 'FAIL'}"
                  f" (stale count now {result['count']})")
            if not result["found"]:
                status = 1
    print(f"\n{'all figures agree' if check.failed == 0 else str(check.failed) + ' figure(s) disagree'}")
    return status


if __name__ == "__main__":
    sys.exit(main())
