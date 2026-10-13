#!/usr/bin/env node
/**
 * gen-caps.mjs — generate db/migrations/001_roles.sql from the LIVE permission code.
 *
 * The plan's promise is that authorisation becomes data. The risk in that change is a silent
 * behaviour difference: a role loses a screen nobody tested. So the seed rows are not typed by hand
 * — they are extracted from frontend-v1/api/roles-lib.php, the file v2.1 actually enforces, and this
 * script re-derives them on demand. Same trick as tools/gen-aliases.mjs: the artefact that must not
 * drift is generated from the artefact that cannot lie.
 *
 * Extracted:
 *   wx_role_groups    ← wx_role_groups() switch   + EXPAND
 *   wx_action_groups  ← the $map inside wx_action_group(), order preserved (order decides overlaps)
 *   wx_action_shared  ← SHARED
 *   wx_action_roles   ← the owner/admin-only list inside wx_allowed()
 *
 * Usage:  node tools/gen-caps.mjs [--check]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "frontend-v1", "api", "roles-lib.php");
const OUT = join(ROOT, "db", "migrations", "001_roles.sql");

const php = readFileSync(SRC, "utf8");

/* ------------------------------------------------------------------ extract */

/* Scoped to the ROLE_LABELS const: the action-group map below also contains `'sales' => '~^…$~'`,
   and an unscoped match silently labels the Sales role with a regex. */
const labelBlock = php.match(/const\s+ROLE_LABELS\s*=\s*\[([\s\S]*?)\];/);
if (!labelBlock) throw new Error("could not read ROLE_LABELS from roles-lib.php");
const roleLabels = {};
for (const m of labelBlock[1].matchAll(/'(\w+)'\s*=>\s*'([^']+)'/g)) {
  roleLabels[m[1]] = m[2];
}
for (const role of ["owner", "admin", "editor", "sales", "support"]) {
  if (!roleLabels[role] || roleLabels[role].includes("~^")) {
    throw new Error(`ROLE_LABELS is missing a usable label for "${role}"`);
  }
}

/** wx_role_groups(): case 'role': return ['a','b']; */
const roleGroups = [];
for (const m of php.matchAll(/case\s+'(\w+)'\s*:\s*return\s*\[([^\]]*)\]\s*;/g)) {
  const groups = [...m[2].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
  roleGroups.push([m[1], groups]);
}
if (!roleGroups.length) throw new Error("could not read wx_role_groups() from roles-lib.php");

/** const EXPAND = ['grp' => ['role', …], …]; */
function parseMapOfLists(name) {
  const re = new RegExp(`const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`);
  const block = php.match(re);
  if (!block) throw new Error(`could not read ${name}`);
  const out = [];
  for (const m of block[1].matchAll(/'([a-z_0-9]+)'\s*=>\s*\[([^\]]*)\]/g)) {
    out.push([m[1], [...m[2].matchAll(/'([a-z_0-9]+)'/g)].map((x) => x[1])]);
  }
  return out;
}
const expand = parseMapOfLists("EXPAND");
const shared = parseMapOfLists("SHARED");

/** The $map inside wx_action_group(), in order — order decides which rule wins on an overlap. */
const mapBlock = php.match(/if \(\$map === null\) \$map = \[([\s\S]*?)\n    \];/);
if (!mapBlock) throw new Error("could not read the $map in wx_action_group()");
const actionGroups = [];
for (const m of mapBlock[1].matchAll(/'([a-z_]+)'\s*=>\s*'(~\^[\s\S]*?\$~)'/g)) {
  actionGroups.push([m[1], m[2]]);
}
if (actionGroups.length < 8) throw new Error(`only ${actionGroups.length} action groups parsed — expected the full map`);

/** wx_allowed(): the owner/admin-only list. */
const strictBlock = php.match(/in_array\(\$action,\s*\[([^\]]*)\],\s*true\)\)\s*return\s*in_array\(\$role,\s*\[([^\]]*)\]/);
if (!strictBlock) throw new Error("could not read the owner/admin-only list in wx_allowed()");
const strictActions = [...strictBlock[1].matchAll(/'([a-z_0-9]+)'/g)].map((x) => x[1]);
const strictRoles = [...strictBlock[2].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);

/* -------------------------------------------------------------------- emit */

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

const roleGroupRows = [];
for (const [role, groups] of roleGroups) {
  for (const g of groups) {
    const isExpand = expand.some(([grp, roles]) => grp === g && roles.includes(role));
    roleGroupRows.push(`(${q(role)}, ${q(g)}, ${isExpand ? 1 : 0})`);
  }
}

const actionGroupRows = actionGroups.map(([grp, pattern], i) => `(${q(pattern)}, ${q(grp)}, 1, ${i + 1})`);

const sharedRows = [];
for (const [action, groups] of shared) {
  for (const g of groups) sharedRows.push(`(${q(action)}, ${q(g)})`);
}

const roleRows = [];
for (const action of strictActions) {
  for (const role of strictRoles) roleRows.push(`(${q(action)}, ${q(role)})`);
}

const sql = `-- db/migrations/001_roles.sql — GENERATED FILE, DO NOT EDIT BY HAND.
--
--   regenerate:  node tools/gen-caps.mjs
--   verify:      node tools/gen-caps.mjs --check
--
-- Authorisation stops being code. v2.1's matrix lived in frontend-v1/api/roles-lib.php as a switch, a
-- list of regexes and two consts — unreadable outside a deploy, unauditable, and (as the analysis
-- report found) mistaken for database tables by the first read of the codebase. These tables hold the
-- same rules, extracted from that file so the behaviour cannot differ, and seeded in the same order
-- because rule order decides which group wins when an action matches two patterns.
--
-- The five role codes are unchanged so existing users keep working: owner, admin, editor, sales, support.
--
-- Applied by db/migrate.php. Idempotent: CREATE TABLE IF NOT EXISTS, and the seed inserts use
-- INSERT ... ON DUPLICATE KEY UPDATE so a re-run converges instead of duplicating.

/* ---------------------------------------------------------------- roles */
CREATE TABLE IF NOT EXISTS wx_roles (
  code VARCHAR(20) NOT NULL PRIMARY KEY,
  label VARCHAR(40) NOT NULL,
  rank_ INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO wx_roles (code, label, rank_) VALUES
${roleGroups.map(([role], i) => `  (${q(role)}, ${q(roleLabels[role] ?? role)}, ${i + 1})`).join(",\n")}
ON DUPLICATE KEY UPDATE label = VALUES(label), rank_ = VALUES(rank_);

/* ---------------------------------------------- role => permission group
   expand = 1 marks the groups EXPAND opened to a role on purpose, even where an older action-level
   role list was narrower. Keeping the flag means the decision stays identical to v2.1's. */
CREATE TABLE IF NOT EXISTS wx_role_groups (
  role VARCHAR(20) NOT NULL,
  grp VARCHAR(30) NOT NULL,
  expand TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (role, grp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO wx_role_groups (role, grp, expand) VALUES
${roleGroupRows.map((r) => "  " + r).join(",\n")}
ON DUPLICATE KEY UPDATE expand = VALUES(expand);

/* ------------------------------------------------- action => group rules
   ord preserves the evaluation order of the v2.1 $map: the first matching pattern wins, and
   several actions match more than one pattern, so order is behaviour, not cosmetics. */
CREATE TABLE IF NOT EXISTS wx_action_groups (
  pattern VARCHAR(190) NOT NULL PRIMARY KEY,
  grp VARCHAR(30) NOT NULL,
  is_regex TINYINT(1) NOT NULL DEFAULT 1,
  ord INT NOT NULL DEFAULT 0,
  INDEX (ord)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO wx_action_groups (pattern, grp, is_regex, ord) VALUES
${actionGroupRows.map((r) => "  " + r).join(",\n")}
ON DUPLICATE KEY UPDATE grp = VALUES(grp), is_regex = VALUES(is_regex), ord = VALUES(ord);

/* ------------------------------------------- actions shared across groups
   A screen used by two teams: allowed when the user holds ANY of the listed groups. */
CREATE TABLE IF NOT EXISTS wx_action_shared (
  action VARCHAR(60) NOT NULL,
  grp VARCHAR(30) NOT NULL,
  PRIMARY KEY (action, grp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO wx_action_shared (action, grp) VALUES
${sharedRows.map((r) => "  " + r).join(",\n")}
ON DUPLICATE KEY UPDATE grp = VALUES(grp);

/* --------------------------------------------- action => explicit role list
   The screens that stay owner+admin even though a broader group would otherwise match them. */
CREATE TABLE IF NOT EXISTS wx_action_roles (
  action VARCHAR(60) NOT NULL,
  role VARCHAR(20) NOT NULL,
  PRIMARY KEY (action, role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO wx_action_roles (action, role) VALUES
${roleRows.map((r) => "  " + r).join(",\n")}
ON DUPLICATE KEY UPDATE role = VALUES(role);

/* ------------------------------------------------ per-user extra grants
   Replaces the "perms" array that v2.1 kept in _private/security.json, which needed a lock file and
   could not be queried. A row here grants one group to one user, on top of their role. */
CREATE TABLE IF NOT EXISTS wx_user_perms (
  user_id INT NOT NULL,
  grp VARCHAR(30) NOT NULL,
  granted_at DATETIME NULL,
  granted_by INT NULL,
  PRIMARY KEY (user_id, grp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const summary = {
  roles: roleGroups.length,
  roleGroupRows: roleGroupRows.length,
  actionGroups: actionGroups.length,
  sharedRows: sharedRows.length,
  roleRows: roleRows.length,
};

if (process.argv.includes("--check")) {
  const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  if (current !== sql) {
    console.error("✗ db/migrations/001_roles.sql is stale — run: node tools/gen-caps.mjs");
    process.exit(1);
  }
  console.log(`✓ 001_roles.sql up to date (${summary.roles} roles, ${summary.actionGroups} action groups, ${summary.sharedRows} shared rows)`);
  process.exit(0);
}

writeFileSync(OUT, sql);
console.log("✓ db/migrations/001_roles.sql written");
console.log(`  ${summary.roles} roles · ${summary.roleGroupRows} role-group rows · ${summary.actionGroups} action groups · ${summary.sharedRows} shared rows · ${summary.roleRows} role-restricted actions`);
