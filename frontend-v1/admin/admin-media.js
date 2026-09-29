/* Woodex Admin v2 — A7
 * Media library (upload with automatic resize + WebP, folders, alt text, where-used, optimise large images, safe trash)
 * Backups (daily / weekly automatic via cron, manual full backups, download, one-click restore with safety copy, page history)
 * Site health (SEO, alt text, broken links, missing and oversized images) + Google PageSpeed scores.
 */
(function () {
  "use strict";
  var W = window.WXA, S = W.S, api = W.api, bapi = W.bapi, esc = W.esc, ic = W.ic, $ = W.$, $$ = W.$$, toast = W.toast, modal = W.modal, closeModal = W.closeModal, head = W.head;
  var MAXW = 2000, BIG = 350 * 1024;
  var kb = function (n) { return n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; };
  var isOA = function () { return W.can("owner,admin"); };

  // ------------------------------------------------------------------ image processing in the browser (works the same on Hostinger and locally, no server image library needed)
  function blobToB64(b) { return new Promise(function (res) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(",")[1]); }; r.readAsDataURL(b); }); }
  function encode(bmp, w, h, type, q) {
    var c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d").drawImage(bmp, 0, 0, w, h);
    return new Promise(function (res) { c.toBlob(function (b) { res(b); }, type, q); });
  }
  function fit(w, h) { var s = Math.min(1, MAXW / Math.max(w, h)); return [Math.round(w * s), Math.round(h * s)]; }
  /** New upload: resize to max 2000px and convert to WebP; keep the original if it is already smaller. GIF/SVG untouched. */
  function optimiseUpload(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return Promise.resolve({ blob: file, note: "kept as is" });
    return createImageBitmap(file).then(function (bmp) {
      var d = fit(bmp.width, bmp.height);
      return encode(bmp, d[0], d[1], "image/webp", 0.82).then(function (b) {
        if (b && b.type === "image/webp" && (b.size < file.size || d[0] < bmp.width)) return { blob: b, name: file.name.replace(/\.[a-z0-9]+$/i, "") + ".webp", note: kb(file.size) + " → " + kb(b.size) + (d[0] < bmp.width ? " · resized to " + d[0] + "px" : "") };
        return { blob: file, note: "already optimised" };
      });
    });
  }
  /** Existing image: same format and file name (so no page needs changing), resized to max 2000px and recompressed. */
  function optimiseExisting(f) {
    var ext = f.name.split(".").pop().toLowerCase(), type = { jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", png: "image/png" }[ext];
    if (!type) return Promise.resolve(null);
    return fetch(f.url + "?v=" + Date.now()).then(function (r) { return r.blob(); }).then(createImageBitmap).then(function (bmp) {
      var d = fit(bmp.width, bmp.height); if (type === "image/png" && d[0] === bmp.width) return null; // PNG only shrinks by resizing
      return encode(bmp, d[0], d[1], type, 0.8).then(function (b) { return b && b.type === type && b.size < f.size * 0.9 ? { blob: b, before: f.size, after: b.size, w: d[0], h: d[1], ow: bmp.width } : null; });
    }).catch(function () { return null; });
  }

  // ------------------------------------------------------------------ media library
  W.VIEWS.media = function (el) {
    var st = { files: [], folders: [], trash: 0, folder: "all", filter: "all", q: "", sel: {} };
    el.innerHTML = head("Media library", "Media", (isOA() ? '<button class="btn" id="md-trash">' + ic("trash") + 'Trash <span id="md-tn"></span></button><button class="btn" id="md-opt">' + ic("zap") + "Optimise large images</button>" : "") + '<label class="btn pri">' + ic("upload") + 'Upload<input type="file" id="md-up" accept="image/*" multiple hidden></label>') +
      '<div class="card md-top"><div class="md-folders" id="md-f"></div><div class="md-tools"><input id="md-q" placeholder="Search file name or alt text…"><select id="md-flt"><option value="all">All images</option><option value="unused">Not used anywhere</option><option value="big">Large (over 350 KB)</option><option value="noalt">No alt text</option></select></div></div>' +
      '<div class="md-drop" id="md-drop">' + ic("upload") + ' Drop images here to upload. They are resized to 2000px and converted to WebP automatically.</div><div id="md-prog"></div>' +
      '<div class="md-bulk" id="md-bulk" hidden><b id="md-bn"></b><button class="btn sm" id="md-bclr">Clear</button>' + (isOA() ? '<button class="btn sm danger" id="md-bdel">' + ic("trash") + "Move to trash</button>" : "") + '</div><div class="md-grid" id="md-g"><p class="muted">Loading…</p></div>';
    W.fillIcons(el);
    function load() { return api("media_list").then(function (r) { if (!r.ok) return toast(r.error, true); st.files = r.files; st.folders = r.folders; st.trash = r.trash; draw(); }); }
    function list() {
      var q = st.q.toLowerCase();
      return st.files.filter(function (f) {
        if (st.folder !== "all" && f.folder !== st.folder) return false;
        if (st.filter === "unused" && f.used.length) return false; if (st.filter === "big" && f.size <= BIG) return false; if (st.filter === "noalt" && (f.alt || /\.svg$/.test(f.name))) return false;
        return !q || (f.name + " " + f.alt).toLowerCase().indexOf(q) > -1;
      });
    }
    function draw() {
      var cnt = function (k) { return st.files.filter(function (f) { return k === "all" || f.folder === k; }).length; };
      $("#md-f").innerHTML = ["all", "site", "uploads"].concat(st.folders).map(function (k) { return '<button class="' + (st.folder === k ? "on" : "") + '" data-k="' + esc(k) + '">' + ic(k === "all" ? "image" : "folder") + esc({ all: "All", site: "Site design", uploads: "Uploads" }[k] || k) + " <small>" + cnt(k) + "</small></button>"; }).join("") + '<button data-new>' + ic("plus") + "New folder</button>";
      if ($("#md-tn")) $("#md-tn").textContent = st.trash ? "(" + st.trash + ")" : "";
      var L = list();
      $("#md-g").innerHTML = L.length ? L.map(function (f) {
        return '<div class="md-card' + (st.sel[f.url] ? " sel" : "") + '" data-u="' + esc(f.url) + '"><input type="checkbox" class="md-chk"' + (st.sel[f.url] ? " checked" : "") + '><div class="md-th"><img loading="lazy" src="' + esc(f.url) + '" alt=""></div><div class="md-meta"><b title="' + esc(f.name) + '">' + esc(f.name) + '</b><span><span class="' + (f.size > BIG ? "warnc" : "") + '">' + kb(f.size) + "</span> · " + (f.used.length ? f.used.length + " use" + (f.used.length > 1 ? "s" : "") : '<span class="bad">unused</span>') + (f.alt || /\.svg$/.test(f.name) ? "" : ' · <span class="warnc">no alt</span>') + "</span></div></div>";
      }).join("") : '<p class="muted">No images match.</p>';
      W.fillIcons($("#md-f")); bulk();
    }
    function bulk() { var n = Object.keys(st.sel).length; $("#md-bulk").hidden = !n; $("#md-bn").textContent = n + " selected"; }
    $("#md-f").onclick = function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.hasAttribute("data-new")) { var n = prompt("New folder name (for example: kitchens, offices)"); if (n) api("media_folder", { name: n }).then(function (r) { if (!r.ok) return toast(r.error, true); st.folder = r.name; load(); }); return; }
      st.folder = b.dataset.k; draw();
    };
    $("#md-q").oninput = function () { st.q = this.value; draw(); };
    $("#md-flt").onchange = function () { st.filter = this.value; draw(); };
    $("#md-g").onclick = function (e) {
      var c = e.target.closest(".md-card"); if (!c) return; var u = c.dataset.u;
      if (e.target.classList.contains("md-chk")) { if (e.target.checked) st.sel[u] = 1; else delete st.sel[u]; c.classList.toggle("sel", e.target.checked); bulk(); return; }
      detail(st.files.find(function (f) { return f.url === u; }));
    };
    $("#md-bclr").onclick = function () { st.sel = {}; draw(); };
    if ($("#md-bdel")) $("#md-bdel").onclick = function () { trash(Object.keys(st.sel)); };
    function trash(urls) {
      if (!confirm("Move " + urls.length + " image(s) to the trash? You can restore them from Trash.")) return;
      api("media_trash", { urls: urls }).then(function (r) {
        if (!r.ok) return toast(r.error, true); st.sel = {};
        toast(r.moved.length + " moved to trash" + (r.blocked.length ? ", " + r.blocked.length + " skipped because they are in use" : ""), !!r.blocked.length); closeModal(); load();
      });
    }
    // upload
    function upload(files) {
      files = Array.prototype.filter.call(files, function (f) { return /^image\//.test(f.type); }); if (!files.length) return;
      var P = $("#md-prog"), folder = ["all", "site"].indexOf(st.folder) > -1 || st.folder === "uploads" ? "" : st.folder;
      P.innerHTML = '<div class="card card-b bk-prog">' + files.map(function (f, i) { return '<div data-i="' + i + '"><span class="dot"></span>' + esc(f.name) + ' <small class="muted">waiting</small></div>'; }).join("") + "</div>";
      files.reduce(function (pr, f, i) {
        return pr.then(function () {
          var row = $('[data-i="' + i + '"]', P), set = function (t, c) { row.className = c || ""; $("small", row).textContent = t; };
          set("optimising…", "run");
          return optimiseUpload(f).then(function (o) { return blobToB64(o.blob).then(function (b64) { return api("media_upload", { data: b64, name: o.name || f.name, folder: folder }); }).then(function (r) { if (!r.ok) throw new Error(r.error); set("uploaded · " + o.note, "ok"); }); }).catch(function (e) { set(e.message || "failed", "bad"); });
        });
      }, Promise.resolve()).then(function () { toast("Upload finished"); load(); setTimeout(function () { P.innerHTML = ""; }, 6000); });
    }
    $("#md-up").onchange = function () { upload(this.files); this.value = ""; };
    var D = $("#md-drop");
    ["dragenter", "dragover"].forEach(function (t) { el.addEventListener(t, function (e) { e.preventDefault(); D.classList.add("on"); }); });
    el.addEventListener("dragleave", function (e) { if (!el.contains(e.relatedTarget)) D.classList.remove("on"); });
    el.addEventListener("drop", function (e) { e.preventDefault(); D.classList.remove("on"); upload(e.dataTransfer.files); });
    // detail
    function detail(f) {
      var svg = /\.svg$/.test(f.name);
      modal('<div class="md-det"><div class="md-big"><img src="' + esc(f.url) + '?v=' + Date.now() + '" alt="" id="dt-img"></div><div><h3 style="word-break:break-all">' + esc(f.name) + '</h3><p class="muted" id="dt-dim">' + kb(f.size) + " · " + esc(f.folder) + " · " + esc(f.mtime.slice(0, 10)) + '</p><label>Address<div class="copy"><input readonly value="' + esc(f.url) + '"><button type="button" class="btn sm" id="dt-copy">Copy</button></div></label>' +
        (svg ? "" : '<label>Alt text <button type="button" class="btn sm ai" id="dt-ai" hidden>' + ic("sparkles") + 'Write</button><textarea id="dt-alt" rows="2" placeholder="Describe what the photo shows">' + esc(f.alt) + '</textarea></label><label class="check"><input type="checkbox" id="dt-apply" checked> Also add it to pages where this image has no alt text</label>') +
        '<h4 class="sub-h">Used on (' + f.used.length + ')</h4><ul class="md-used">' + (f.used.length ? f.used.slice(0, 30).map(function (r) { var page = /\.html$/.test(r); return "<li>" + (page ? '<a href="#/fields/' + encodeURIComponent(r) + '">/' + esc(r.replace(/index\.html$/, "")) + "</a>" : '<span class="muted">' + esc(r.replace(/^_private\/(.*)\.json$/, "stored content: $1")) + "</span>") + "</li>"; }).join("") : '<li class="muted">Not used anywhere. Safe to delete.</li>') + "</ul>" +
        '<div class="modal-actions">' + (isOA() ? '<button type="button" class="btn ghost danger" id="dt-del">' + ic("trash") + "Trash</button>" : "") + (isOA() && f.size > 150 * 1024 && !svg ? '<button type="button" class="btn" id="dt-opt">' + ic("zap") + "Optimise</button>" : "") + '<button type="button" class="btn" data-x>Close</button>' + (svg ? "" : '<button type="button" class="btn pri" id="dt-save">Save alt text</button>') + "</div></div></div>", "wide");
      W.fillIcons(document.querySelector("#modal-card"));
      $("[data-x]").onclick = closeModal;
      var img = $("#dt-img"); img.onload = function () { $("#dt-dim").textContent = img.naturalWidth + " × " + img.naturalHeight + " px · " + kb(f.size) + " · " + f.folder + " · " + f.mtime.slice(0, 10); };
      $("#dt-copy").onclick = function () { navigator.clipboard && navigator.clipboard.writeText(location.origin + f.url); toast("Copied"); };
      api("cms_list", { type: "faq" }).then(function (r) { if (r.aiReady && $("#dt-ai")) $("#dt-ai").hidden = false; });
      if ($("#dt-ai")) $("#dt-ai").onclick = function () { var b = this; b.disabled = true; api("ai_run", { task: "alt", input: { file: f.name, context: f.used.slice(0, 5).join(", ") } }).then(function (r) { b.disabled = false; if (!r.ok) return toast(r.error, true); $("#dt-alt").value = r.text.trim().replace(/^"|"$/g, ""); }); };
      if ($("#dt-save")) $("#dt-save").onclick = function () { var alt = $("#dt-alt").value.trim(); api("media_alt", { url: f.url, alt: alt, apply: $("#dt-apply").checked }).then(function (r) { if (!r.ok) return toast(r.error, true); f.alt = alt; toast("Alt text saved" + (r.pages ? " and added on " + r.pages + " page(s)" : "")); closeModal(); draw(); }); };
      if ($("#dt-del")) $("#dt-del").onclick = function () { if (f.used.length && !confirm("This image is used on " + f.used.length + " place(s). Those pages would show a broken image. Remove the image from the pages first. Continue anyway?")) return; if (f.used.length) api("media_trash", { urls: [f.url], force: true }).then(function (r) { if (!r.ok) return toast(r.error, true); closeModal(); load(); }); else trash([f.url]); };
      if ($("#dt-opt")) $("#dt-opt").onclick = function () { var b = this; b.disabled = true; b.textContent = "Working…"; optimiseExisting(f).then(function (o) { if (!o) { b.textContent = "Already optimised"; return; } blobToB64(o.blob).then(function (d) { return api("media_replace", { url: f.url, data: d }); }).then(function (r) { if (!r.ok) return toast(r.error, true); toast(kb(o.before) + " → " + kb(o.after)); closeModal(); load(); }); }); };
    }
    // bulk optimise
    if ($("#md-opt")) $("#md-opt").onclick = function () {
      var big = st.files.filter(function (f) { return f.size > BIG && /\.(jpe?g|webp|png)$/i.test(f.name); });
      modal('<h3>Optimise large images</h3><p class="muted">Images over 350 KB are resized to at most 2000px and recompressed. They keep the same name and format, so no page needs changing. The originals go to Trash, so you can undo.</p><div id="op-l" class="bk-prog">' + (big.length ? big.map(function (f, i) { return '<div data-i="' + i + '"><span class="dot"></span>' + esc(f.name) + ' <small class="muted">' + kb(f.size) + " · measuring…</small></div>"; }).join("") : '<p class="muted">No large images. Nice.</p>') + '</div><p id="op-sum"></p><div class="modal-actions"><button class="btn" data-x>Close</button><button class="btn pri" id="op-go" disabled>Optimise</button></div>');
      $("[data-x]").onclick = function () { closeModal(); load(); };
      var res = [], saved = 0;
      big.reduce(function (pr, f, i) { return pr.then(function () { return optimiseExisting(f).then(function (o) { var row = $('[data-i="' + i + '"] small'); res[i] = o; if (o) { saved += o.before - o.after; row.textContent = kb(o.before) + " → " + kb(o.after) + (o.w < o.ow ? " (" + o.w + "px)" : ""); } else row.textContent = kb(f.size) + " · can't shrink further" + (/\.png$/i.test(f.name) ? " (PNG: convert to WebP in an image editor)" : ""); }); }); }, Promise.resolve()).then(function () {
        var n = res.filter(Boolean).length; $("#op-sum").innerHTML = n ? "<b>" + n + " image(s)</b>, saving about <b>" + kb(saved) + "</b>." : "Nothing to optimise."; $("#op-go").disabled = !n;
      });
      $("#op-go").onclick = function () {
        var b = this; b.disabled = true;
        big.reduce(function (pr, f, i) { var o = res[i]; if (!o) return pr; return pr.then(function () { var row = $('[data-i="' + i + '"]'); row.className = "run"; return blobToB64(o.blob).then(function (d) { return api("media_replace", { url: f.url, data: d }); }).then(function (r) { row.className = r.ok ? "ok" : "bad"; if (!r.ok) $("small", row).textContent = r.error; }); }); }, Promise.resolve()).then(function () { toast("Images optimised"); $("#op-sum").innerHTML += " Done."; });
      };
    };
    if ($("#md-trash")) $("#md-trash").onclick = function () {
      api("media_trash_list").then(function (r) {
        if (!r.ok) return toast(r.error, true);
        modal('<h3>Trash</h3><p class="muted">Deleted images, and the originals of optimised images. Restore puts the file back where it was.</p><div class="tbl-wrap" style="max-height:50vh"><table class="tbl"><tbody>' + (r.trash.length ? r.trash.map(function (t) { return "<tr><td><b>" + esc(t.url.split("/").pop()) + '</b><br><small class="muted">' + esc(t.why) + " by " + esc(t.by) + " · " + esc(t.at.slice(0, 16)) + " · " + kb(t.size) + '</small></td><td class="r"><button class="btn sm" data-r="' + t.id + '">Restore</button> <button class="btn sm ghost danger" data-p="' + t.id + '">Delete forever</button></td></tr>'; }).join("") : '<tr><td class="muted">Trash is empty.</td></tr>') + '</tbody></table></div><div class="modal-actions">' + (r.trash.length ? '<button class="btn ghost danger" id="tr-all">Empty trash</button>' : "") + '<button class="btn" data-x>Close</button></div>');
        $("[data-x]").onclick = function () { closeModal(); load(); };
        document.querySelector("#modal-card").onclick = function (e) {
          var b = e.target.closest("[data-r],[data-p]"); if (!b) return;
          if (b.dataset.p && !confirm("Delete this file forever?")) return;
          api(b.dataset.r ? "media_restore" : "media_purge", { id: +(b.dataset.r || b.dataset.p) }).then(function (x) { if (!x.ok) return toast(x.error, true); b.closest("tr").remove(); toast(b.dataset.r ? "Restored" : "Deleted"); });
        };
        if ($("#tr-all")) $("#tr-all").onclick = function () { if (confirm("Delete everything in the trash forever?")) api("media_purge", { all: true }).then(function () { closeModal(); load(); }); };
      });
    };
    load();
  };

  // ------------------------------------------------------------------ backups
  var KIND = { daily: ["Daily", "Pages + data"], weekly: ["Weekly", "Full: pages, data, images"], full: ["Manual", "Full: pages, data, images"], safety: ["Safety copy", "Taken before a restore"] };
  W.VIEWS.backups = function (el) {
    el.innerHTML = head("Backups", "Backups", '<button class="btn" id="bk-d">' + ic("database") + 'Quick backup (pages + data)</button><button class="btn pri" id="bk-f">' + ic("hard-drive") + "Full backup now</button>") +
      '<div class="tabs" id="bk-tabs"><button class="on" data-t="site">Site backups</button><button data-t="page">Page history</button></div><div id="bk-body"><p class="muted">Loading…</p></div>';
    W.fillIcons(el);
    var tab = "site";
    $("#bk-tabs").onclick = function (e) { var b = e.target.closest("button"); if (!b) return; tab = b.dataset.t; $$("#bk-tabs button").forEach(function (x) { x.classList.toggle("on", x === b); }); draw(); };
    function run(kind, b) { b.disabled = true; var t = b.innerHTML; b.textContent = "Backing up…"; api("backup_run", { kind: kind }).then(function (r) { b.disabled = false; b.innerHTML = t; if (!r.ok) return toast(r.error, true); toast("Backup created (" + kb(r.backup.size) + ")"); tab = "site"; draw(); }); }
    $("#bk-d").onclick = function () { run("daily", this); }; $("#bk-f").onclick = function () { run("full", this); };
    function draw() { if (tab === "page") return pageHistory($("#bk-body")); site(); }
    function site() {
      api("backup_list").then(function (r) {
        if (!r.ok) { $("#bk-body").innerHTML = '<div class="card card-b">' + esc(r.error) + "</div>"; return; }
        var cronOk = r.lastCron && (Date.now() - new Date(r.lastCron.replace(" ", "T") + "Z").getTime()) < 2 * 864e5;
        $("#bk-body").innerHTML = '<div class="grid3 bk-stats"><div class="card card-b"><span class="muted">Automatic backups</span><b class="' + (cronOk ? "okc" : "warnc") + '">' + (cronOk ? "Running" : "Not running yet") + "</b><small>" + (r.lastCron ? "Last check " + esc(r.lastCron.slice(0, 16)) + " UTC" : "Set up the cron job (see below)") + '</small></div><div class="card card-b"><span class="muted">Backups stored</span><b>' + r.backups.length + "</b><small>" + kb(r.backups.reduce(function (a, b) { return a + b.size; }, 0)) + ' on the server</small></div><div class="card card-b"><span class="muted">Latest</span><b>' + (r.backups[0] ? esc(r.backups[0].at.slice(0, 16)) : "None") + "</b><small>" + (r.backups[0] ? esc(KIND[r.backups[0].kind][0]) : "Make your first backup now") + "</small></div></div>" +
          '<div class="card"><div class="card-h"><h3>Backups on the server</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Date</th><th>Type</th><th>Contains</th><th>Size</th><th></th></tr></thead><tbody>' +
          (r.backups.length ? r.backups.map(function (b) { return "<tr><td><b>" + esc(b.at.slice(0, 16)) + '</b></td><td><span class="badge' + (b.kind === "safety" ? " warn" : "") + '">' + KIND[b.kind][0] + '</span></td><td class="muted">' + KIND[b.kind][1] + "</td><td>" + kb(b.size) + '</td><td class="r nowrap"><button class="btn sm" data-dl="' + esc(b.name) + '">' + ic("download") + 'Download</button> <button class="btn sm" data-rs="' + esc(b.name) + '">Restore</button> <button class="btn sm ghost danger" data-del="' + esc(b.name) + '">' + ic("trash") + "</button></td></tr>"; }).join("") : '<tr><td colspan="5" class="muted">No backups yet.</td></tr>') + "</tbody></table></div></div>" +
          '<div class="card card-b bk-help"><h4 class="side-h">How backups work</h4><ul><li><b>Daily</b> (pages, enquiries, quotations, invoices, settings): kept for 7 days.</li><li><b>Weekly</b> (everything, including images): the last 4 are kept.</li><li><b>Manual</b> full backups: the last 10 are kept. <b>Restore</b> first takes a safety copy of the current site, so a restore can be undone.</li><li>Once a month, <b>download</b> a full backup and keep it on your computer or Google Drive. If the hosting account itself is lost, that copy is what saves you.</li></ul>' +
          '<h4 class="side-h">Cron job (Hostinger → Advanced → Cron Jobs)</h4><p class="muted">Run every 15 minutes. The same job publishes scheduled posts and makes the automatic backups:</p><code class="code">*/15 * * * * wget -q -O /dev/null "https://woodex.com.pk/api/admin.php?action=cron"</code></div>';
        W.fillIcons($("#bk-body"));
        $("#bk-body").onclick = function (e) {
          var b = e.target.closest("button"); if (!b) return;
          if (b.dataset.dl) { b.disabled = true; fetch("/api/admin.php?action=backup_dl&name=" + encodeURIComponent(b.dataset.dl), { headers: { "X-WX-ADM": S.token } }).then(function (x) { if (!x.ok) throw new Error("Download failed"); return x.blob(); }).then(function (bl) { var a = document.createElement("a"); a.href = URL.createObjectURL(bl); a.download = "woodex-" + b.dataset.dl; document.body.appendChild(a); a.click(); a.remove(); b.disabled = false; }).catch(function (x) { b.disabled = false; toast(x.message, true); }); }
          if (b.dataset.rs) {
            modal('<h3>Restore this backup?</h3><p>The website goes back to how it was on <b>' + esc(b.closest("tr").cells[0].textContent) + "</b>: pages" + (/^daily/.test(b.dataset.rs) ? ", enquiries, quotations and settings" : ", images, enquiries, quotations and settings") + '.</p><p class="muted">A safety copy of the current site is taken first, so you can undo this. Anything created after that date (for example, new enquiries) is only in the safety copy.</p><label>Type <b>RESTORE</b> to confirm<input id="rs-c"></label><div class="modal-actions"><button class="btn" data-x>Cancel</button><button class="btn pri danger" id="rs-go">Restore</button></div>');
            $("[data-x]").onclick = closeModal;
            $("#rs-go").onclick = function () { if ($("#rs-c").value.trim().toUpperCase() !== "RESTORE") return toast("Type RESTORE to confirm", true); var g = this; g.disabled = true; g.textContent = "Restoring…"; api("backup_restore", { name: b.dataset.rs }).then(function (x) { if (!x.ok) { g.disabled = false; g.textContent = "Restore"; return toast(x.error, true); } closeModal(); toast("Restored. Safety copy saved."); site(); }); };
          }
          if (b.dataset.del && confirm("Delete this backup?")) api("backup_delete", { name: b.dataset.del }).then(function (x) { if (!x.ok) return toast(x.error, true); site(); });
        };
      });
    }
    function pageHistory(box) {
      box.innerHTML = '<div class="card card-b"><p class="muted" style="margin-top:0">Every time a page is saved (builder, forms, business update), the previous version is kept (the last 30 per page). Pick a page to see and restore older versions.</p><div class="g2"><label>Page<select id="ph-p"><option value="">Loading…</option></select></label></div><div id="ph-l"></div></div>';
      bapi("pages").then(function (r) {
        $("#ph-p").innerHTML = '<option value="">Choose a page…</option>' + (r.pages || []).map(function (p) { return '<option value="' + esc(p.path) + '">' + esc(p.url) + " · " + esc(p.title.replace(/\s*\|.*$/, "")) + "</option>"; }).join("");
        $("#ph-p").onchange = function () {
          var rel = this.value; if (!rel) return; $("#ph-l").innerHTML = '<p class="muted">Loading…</p>';
          bapi("backups", { path: rel }).then(function (x) {
            var fmt = function (f) { var m = /^(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)(\d\d)/.exec(f); return m ? m[1] + "-" + m[2] + "-" + m[3] + " " + m[4] + ":" + m[5] : f; };
            $("#ph-l").innerHTML = (x.backups || []).length ? '<table class="tbl"><tbody>' + x.backups.map(function (b) { return "<tr><td><b>" + fmt(b.file) + '</b></td><td class="muted">' + kb(b.size) + '</td><td class="r"><button class="btn sm" data-v="' + esc(b.file) + '">' + ic("eye") + 'View</button> <button class="btn sm" data-r="' + esc(b.file) + '">Restore this version</button></td></tr>'; }).join("") + "</tbody></table>" : '<p class="muted">No older versions of this page yet.</p>';
            W.fillIcons($("#ph-l"));
            $("#ph-l").onclick = function (e) {
              var b = e.target.closest("button"); if (!b) return;
              if (b.dataset.v) bapi("backup_get", { path: rel, file: b.dataset.v }).then(function (g) { if (g.ok && W.cmsPreview) W.cmsPreview(g.html); else toast(g.error || "Preview not available", true); });
              if (b.dataset.r && confirm("Restore this version? The current version is kept in the history too.")) bapi("restore", { path: rel, file: b.dataset.r }).then(function (g) { if (!g.ok) return toast(g.error, true); toast("Page restored"); $("#ph-p").onchange.call($("#ph-p")); });
            };
          });
        };
      });
    }
    draw();
  };

  // ------------------------------------------------------------------ site health
  var TYPES = { seo: ["SEO", "search"], alt: ["Alt text", "image"], link: ["Broken links", "link"], image: ["Images", "image"] };
  function ring(score) { var c = score >= 90 ? "#12b76a" : score >= 70 ? "#f79009" : "#f04438", r = 42, L = 2 * Math.PI * r; return '<svg viewBox="0 0 100 100" class="ring"><circle cx="50" cy="50" r="' + r + '" stroke="#eaecf0" stroke-width="9" fill="none"/><circle cx="50" cy="50" r="' + r + '" stroke="' + c + '" stroke-width="9" fill="none" stroke-linecap="round" stroke-dasharray="' + (L * score / 100) + " " + L + '" transform="rotate(-90 50 50)"/><text x="50" y="57" text-anchor="middle" font-size="24" font-weight="700" fill="currentColor">' + score + "</text></svg>"; }
  function psiCls(v) { return v == null ? "" : v >= 90 ? "okc" : v >= 50 ? "warnc" : "bad"; }
  W.VIEWS.health = function (el) {
    var H, flt = "all", sev = 0;
    el.innerHTML = head("Site health", "Site health", '<button class="btn pri" id="hl-run">' + ic("refresh-cw") + "Run check</button>") + '<div id="hl-b"><p class="muted">Loading…</p></div>';
    W.fillIcons(el);
    function load() { api("health_get").then(function (r) { if (!r.ok) return toast(r.error, true); H = r; draw(); if (!r.scan) scan(); }); }
    function scan() { var b = $("#hl-run"); b.disabled = true; b.lastChild.textContent = "Checking…"; api("health_scan").then(function (r) { b.disabled = false; b.lastChild.textContent = "Run check"; if (!r.ok) return toast(r.error, true); H.scan = r.scan; draw(); }); }
    $("#hl-run").onclick = scan;
    function draw() {
      var s = H.scan;
      var top = s ? '<div class="hl-top"><div class="card card-b hl-score">' + ring(s.score) + "<div><b>Health score</b><p class=\"muted\">" + s.pages + " pages checked<br>" + esc(s.at.slice(0, 16)) + " UTC</p></div></div>" + Object.keys(TYPES).map(function (k) { return '<button class="card card-b hl-cat' + (flt === k ? " on" : "") + '" data-f="' + k + '">' + ic(TYPES[k][1]) + "<b>" + s.counts[k] + "</b><span>" + TYPES[k][0] + "</span></button>"; }).join("") + "</div>" : '<div class="card card-b muted">Running the first check…</div>';
      var rows = s ? s.issues.filter(function (i) { return (flt === "all" || i.type === flt) && i.sev >= sev; }).sort(function (a, b) { return b.sev - a.sev || a.rel.localeCompare(b.rel); }) : [];
      var issues = s ? '<div class="card"><div class="card-h"><h3>Issues' + (flt !== "all" ? ": " + TYPES[flt][0] : "") + ' <span class="badge">' + rows.length + '</span></h3><div class="seg" id="hl-sev"><button data-s="0" class="' + (sev === 0 ? "on" : "") + '">All</button><button data-s="2" class="' + (sev === 2 ? "on" : "") + '">Important</button><button data-s="3" class="' + (sev === 3 ? "on" : "") + '">Critical</button></div>' + (flt !== "all" ? '<button class="btn sm" data-f="all">Show all</button>' : "") + '</div><div class="tbl-wrap" style="max-height:520px"><table class="tbl"><tbody>' +
        (rows.length ? rows.slice(0, 400).map(function (i) { var lbl = ["", "Tip", "Important", "Critical"][i.sev]; return '<tr><td><span class="sev s' + i.sev + '">' + lbl + "</span></td><td>" + esc(i.msg) + '</td><td class="muted">/' + esc(i.rel.replace(/index\.html$/, "")) + '</td><td class="r nowrap">' + (i.type === "image" && i.size ? '<a class="btn sm" href="#/media">Media</a> ' : "") + '<a class="btn sm" href="#/fields/' + encodeURIComponent(i.rel) + '">Fix</a></td></tr>'; }).join("") : '<tr><td class="muted">No issues in this group. 🎉</td></tr>') + "</tbody></table></div></div>" : "";
      el.querySelector("#hl-b").innerHTML = top + '<div class="qe"><div class="qe-main">' + issues + '</div><div class="qe-side">' + psiCard() + "</div></div>";
      W.fillIcons(el); bind();
    }
    function psiCard() {
      var keys = Object.keys(H.psi || {}), latest = keys.map(function (k) { var p = k.split("|"); return { rel: p[0], strat: p[1], r: H.psi[k][0], prev: H.psi[k][1] }; }).sort(function (a, b) { return b.r.at.localeCompare(a.r.at); });
      return '<div class="card card-b"><div class="side-hr"><h4 class="side-h">Google PageSpeed</h4></div><div class="g2" style="gap:8px"><select id="ps-p"><option value="index.html">Home page</option></select><select id="ps-s"><option value="mobile">Mobile</option><option value="desktop">Desktop</option></select></div><button class="btn pri" id="ps-go" style="width:100%;margin:8px 0">' + ic("zap") + 'Test page</button><p class="muted" id="ps-msg" style="font-size:12px;margin:0 0 8px">Takes 20-60 seconds. Tests the live site ' + esc(H.site) + ".</p>" +
        (latest.length ? '<table class="tbl ps-t"><thead><tr><th>Page</th><th title="Performance">Perf</th><th title="Accessibility">A11y</th><th title="Best practices">BP</th><th>SEO</th></tr></thead><tbody>' + latest.slice(0, 12).map(function (x) { var d = x.prev && x.prev.perf != null && x.r.perf != null ? x.r.perf - x.prev.perf : 0; return '<tr title="' + esc((x.r.lcp ? "LCP " + x.r.lcp : "") + (x.r.cls ? " · CLS " + x.r.cls : "") + (x.r.tbt ? " · TBT " + x.r.tbt : "") + " · " + x.r.at) + '"><td>/' + esc(x.rel.replace(/index\.html$/, "")) + ' <small class="muted">' + (x.strat === "mobile" ? "📱" : "🖥") + '</small></td><td class="' + psiCls(x.r.perf) + '"><b>' + (x.r.perf ?? "–") + "</b>" + (d ? '<small class="' + (d > 0 ? "okc" : "bad") + '"> ' + (d > 0 ? "+" : "") + d + "</small>" : "") + '</td><td class="' + psiCls(x.r.a11y) + '">' + (x.r.a11y ?? "–") + '</td><td class="' + psiCls(x.r.bp) + '">' + (x.r.bp ?? "–") + '</td><td class="' + psiCls(x.r.seo) + '">' + (x.r.seo ?? "–") + "</td></tr>"; }).join("") + "</tbody></table>" : '<p class="muted">No tests yet.</p>') +
        (isOA() ? '<details class="ps-set"><summary>API key' + (H.psiKeySet ? ' <span class="badge ok">saved</span>' : ' <span class="badge">optional</span>') + '</summary><p class="muted" style="font-size:12px">Works without a key, but Google limits how many tests you can run. For a free key: <a href="https://developers.google.com/speed/docs/insights/v5/get-started#APIKey" target="_blank">Get a key</a> → pick or create a project → copy the key here.</p><input id="ps-k" placeholder="' + (H.psiKeySet ? "Key saved (enter a new one to replace)" : "AIza…") + '"><label style="margin-top:8px">Live site address<input id="ps-site" value="' + esc(H.site) + '"></label><button class="btn sm" id="ps-save" style="margin-top:8px">Save</button></details>' : "") + "</div>";
    }
    function bind() {
      $$("[data-f]", el).forEach(function (b) { b.onclick = function () { flt = flt === b.dataset.f ? "all" : b.dataset.f; draw(); }; });
      if ($("#hl-sev")) $("#hl-sev").onclick = function (e) { var b = e.target.closest("button"); if (b) { sev = +b.dataset.s; draw(); } };
      bapi("pages").then(function (r) { var s = $("#ps-p"); if (!s) return; s.innerHTML = (r.pages || []).map(function (p) { return '<option value="' + esc(p.path) + '">' + esc(p.url) + "</option>"; }).join(""); });
      $("#ps-go").onclick = function () {
        var b = this, rel = $("#ps-p").value, strat = $("#ps-s").value; b.disabled = true; $("#ps-msg").textContent = "Testing " + (rel === "index.html" ? "/" : "/" + rel.replace(/index\.html$/, "")) + "… (up to a minute)";
        api("health_psi", { rel: rel, strategy: strat }).then(function (r) { b.disabled = false; if (!r.ok) { $("#ps-msg").innerHTML = '<span class="bad">' + esc(r.error) + "</span>"; return; } var k = rel + "|" + strat; H.psi[k] = [r.result].concat(H.psi[k] || []); draw(); toast("Performance " + r.result.perf + " · SEO " + r.result.seo); });
      };
      if ($("#ps-save")) $("#ps-save").onclick = function () { api("health_settings", { psiKey: $("#ps-k").value, site: $("#ps-site").value.trim().replace(/\/$/, "") }).then(function (r) { if (!r.ok) return toast(r.error, true); H.psiKeySet = r.psiKeySet; H.site = r.site; toast("Saved"); draw(); }); };
    }
    load();
  };
})();
