# Deployment and Rollback Plan

**Status:** No deployment is recommended. This plan is for the owner or operator.

## 1. Pre-deployment (before any release)
1. Rotate SEC-001/002/003 credentials (owner, hosting panel, BotFather). Record date and dependent services.
2. Remove literals from tracked files (requires approval, see `17`).
3. Make the repository private (D-1) before any history work.
4. Confirm the deployed tree: `git -C <host-checkout> rev-parse HEAD` and compare to `manifest.json`.

## 2. Live verification (operator, read-only)
Run from an external machine, and record the status line only:
```
curl -sI https://<host>/_private/db.json | head -1           # expect 403 or 404
curl -sI https://<host>/_private/system.json | head -1       # expect 403 or 404
curl -sI https://<host>/_database/woodex-database.sql | head -1  # expect 403 or 404
curl -sI https://<host>/router.php | head -1                  # expect 403 or 404 in production
curl -sI https://<host>/admin/admin-settings.js | grep -i cache-control   # check max-age
```
Any `200` on a private path = **contain immediately** (remove the file from the web root; rotate what it contains).

## 3. Rollback per change
| Change | Rollback |
|---|---|
| C-001 to C-004 | `git revert 46045f2` on the branch; redeploy the admin files. Mirror files revert with it. |
| C-005, C-006 | Evidence only; `git revert 7f3f413`, `git revert 24157f6` if needed. |
| C-007 (pack) | `git revert` of the pack commit; the scripts are read-only. |
| Credential rotation | Not reversible. Plan the new value in the password manager before rotation; update `.env` on the server only. |
| History purge | Not reversible without a fresh clone from collaborators. **Do not run without approval.** |

## 4. Database
No schema change or data change is proposed in this pack. Before any Phase 4 change: take a full export, restore it to a scratch database, and run the reconnect and write tests there.

## 5. Monitoring and owner
Owner: the Woodex site owner (role). Monitoring: none identified in the repository (**UNKNOWN**). Add error tracking before Phase 6 changes.
