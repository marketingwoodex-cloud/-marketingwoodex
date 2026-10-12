/* reset-throttle.mjs — clear the local preview's login throttle table.
   QA-only: the preview database is a throwaway sqlite file inside .qa-run, never the
   shipped app. The production throttle (api/admin.php wx_throttle) is untouched — it
   is a security feature and stays exactly as it is. */
import fs from 'node:fs'; import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
const f = path.resolve('.qa-run/preview/_private/woodex.sqlite');
if (!fs.existsSync(f)) { console.log('no preview database at', f); process.exit(1); }
const db = new DatabaseSync(f);
const before = db.prepare('SELECT ip,n,t FROM wx_throttle').all();
db.exec('DELETE FROM wx_throttle');
console.log('cleared', before.length, 'throttle row(s):', JSON.stringify(before).slice(0, 200));
db.close();
