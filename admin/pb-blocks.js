// pb-blocks.js — shared typed-block engine for the Woodex block builder.
// UMD-ish: browser gets window.PB, Node gets module.exports (tools/blocks-upgrade.js).
//
// Model: block = { id, type, hidden?, html, fields? }
//   * html is the SOURCE OF TRUTH for publish (byte-identical roundtrip).
//   * fields is the structured editing layer for typed blocks.
//   * PB.regen(block) splices field values back into block.html surgically —
//     page-specific classes, wrappers and scripts are never rebuilt.
//   * PB.extract(html) -> { type, fields } | null  (null = keep raw).
//   * Identity guarantee checked by tools/blocks-upgrade.js:
//     regen(extract(html).fields) === html for every upgraded block.
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PB = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VOID = { area:1, base:1, br:1, col:1, embed:1, hr:1, img:1, input:1,
               link:1, meta:1, param:1, source:1, track:1, wbr:1 };
  var TAG_RE = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g;

  // ------------------------------------------------------------- walking
  // Find the element starting at/after `from` whose open tag matches re
  // (re must match from "<"), and return its full + inner ranges.
  function findElement(html, re, from) {
    re.lastIndex = from || 0;
    var m = re.exec(html);
    if (!m) return null;
    return rangeOf(html, m.index);
  }

  // Given index of "<" of an open tag, walk to its matching close.
  function rangeOf(html, start) {
    if (html[start] !== "<") return null;
    var depth = 0, openEnd = null, m;
    TAG_RE.lastIndex = start;
    while ((m = TAG_RE.exec(html))) {
      if (m[0].indexOf("<!--") === 0) continue;
      var tag = m[2].toLowerCase();
      var close = m[1] === "/";
      var selfClose = m[3] === "/" || VOID[tag];
      if (close) {
        depth -= 1;
        if (depth === 0) return { start: start, openEnd: openEnd, closeStart: m.index, end: m.index + m[0].length };
      } else if (selfClose) {
        if (depth === 0) return { start: start, openEnd: m.index + m[0].length, closeStart: m.index + m[0].length, end: m.index + m[0].length };
      } else {
        depth += 1;
        if (openEnd === null) openEnd = m.index + m[0].length;
      }
      if (depth < 0) return null;
    }
    return null;
  }

  // Direct children of an element range (as sub-ranges of html).
  function childrenOf(html, range) {
    var inner = { s: range.openEnd, e: range.closeStart };
    var out = [], depth = 0, cur = null, nextStart = inner.s, m;
    TAG_RE.lastIndex = inner.s;
    while ((m = TAG_RE.exec(html)) && m.index < inner.e) {
      if (m[0].indexOf("<!--") === 0) continue;
      var tag = m[2].toLowerCase();
      var close = m[1] === "/";
      var selfClose = m[3] === "/" || VOID[tag];
      if (close) {
        depth -= 1;
        if (depth === 0 && cur !== null) {
          out.push({ start: cur, end: m.index + m[0].length });
          nextStart = m.index + m[0].length;
          cur = null;
        }
      } else if (selfClose) {
        if (depth === 0) { out.push({ start: nextStart, end: m.index + m[0].length }); nextStart = m.index + m[0].length; }
      } else {
        if (depth === 0 && cur === null) cur = nextStart;
        depth += 1;
      }
    }
    return out;
  }

  // First element with `tag` whose class attr matches classRx (RegExp or string substring).
  function firstByClass(html, tag, classRx, from) {
    var re = new RegExp("<" + tag + "\\b[^>]*>", "gi");
    re.lastIndex = from || 0;
    var m;
    while ((m = re.exec(html))) {
      var cls = (m[0].match(/class="([^"]*)"/) || [])[1] || "";
      if (matchClass(cls, classRx)) {
        var r = rangeOf(html, m.index);
        if (r) return r;
      }
    }
    return null;
  }

  function matchClass(cls, rx) {
    var words = String(cls || "").toLowerCase().split(/\s+/);
    if (typeof rx === "string") return words.some(function (w) { return w.indexOf(rx) !== -1; });
    return words.some(function (w) { return rx.test(w); });
  }

  function hasClassWord(html, rx) {
    var cls = (html.match(/<[a-z][^>]*\bclass="([^"]*)"/i) || [])[1] || "";
    var id = (html.match(/<[a-z][^>]*\bid="([^"]*)"/i) || [])[1] || "";
    var hay = (cls + " " + id).toLowerCase();
    return hay.split(/[^a-z0-9]+/).some(function (w) { return w && rx.test(w); });
  }

  // ------------------------------------------------------------- scalars
  function getInner(html, range) {
    return range ? html.slice(range.openEnd, range.closeStart) : null;
  }

  // Replace inner of first element matching finder; if finder returns null, html unchanged.
  function setInner(html, findFn, value) {
    var r = findFn(html);
    if (!r) return html;
    return html.slice(0, r.openEnd) + value + html.slice(r.closeStart);
  }

  function findH1(html) { return findElement(html, /<h1\b[^>]*>/i); }
  function findH2(html) { return findElement(html, /<h2\b[^>]*>/i); }
  function findLabel(html) {
    var re = /<(p|span|small)\b[^>]*class="[^"]*label[^"]*"[^>]*>/gi;
    var m = re.exec(html);
    return m ? rangeOf(html, m.index) : null;
  }
  function findCopy(html) {
    var re = /<p\b[^>]*class="[^"]*(?:copy|lede|intro)[^"]*"[^>]*>/gi;
    var m;
    while ((m = re.exec(html))) {
      var r = rangeOf(html, m.index);
      if (r) return r;
    }
    return null;
  }
  function findBtncA(html) {
    var re = /<a\b[^>]*class="[^"]*\bbtn\b[^"]*"[^>]*>/i;
    var m = re.exec(html);
    return m ? rangeOf(html, m.index) : null;
  }
  function findFirstImg(html) {
    var m = /<img\b[^>]*>/i.exec(html);
    if (!m) return null;
    var open = m[0];
    return {
      start: m.index, openEnd: m.index + open.length,
      closeStart: m.index + open.length, end: m.index + open.length,
      open: open,
    };
  }
  function attrOf(openTag, name) {
    var m = new RegExp('\\b' + name + '="([^"]*)"', "i").exec(openTag);
    return m ? m[1] : null;
  }
  function setAttr(openTag, name, value) {
    if (new RegExp('\\b' + name + '="[^"]*"', "i").test(openTag)) {
      return openTag.replace(new RegExp('\\b' + name + '="[^"]*"', "i"), name + '="' + value + '"');
    }
    return openTag.replace(/>$/, " " + name + '="' + value + '">');
  }

  // ---------------------------------------------------------- extraction
  function extractHero(html) {
    if (!hasClassWord(html, /hero/)) return null;
    var h1 = findH1(html);
    if (!h1) return null;
    var fields = { heading: getInner(html, h1) };
    var label = findLabel(html);
    if (label) fields.label = getInner(html, label);
    var copy = findCopy(html);
    if (copy) fields.copy = getInner(html, copy);
    var btn = findBtncA(html);
    if (btn) {
      fields.cta_text = getInner(html, btn);
      fields.cta_href = attrOf(html.slice(btn.start, btn.openEnd), "href") || "";
    }
    var img = findFirstImg(html);
    if (img) {
      fields.img_src = attrOf(img.open, "src") || "";
      fields.img_alt = attrOf(img.open, "alt") || "";
    }
    return { type: "hero", fields: fields };
  }

  function extractPullquote(html) {
    if (!hasClassWord(html, /quote/)) return null;
    var bq = findElement(html, /<blockquote\b[^>]*>/i);
    if (!bq) return null;
    return { type: "pullquote", fields: { text: getInner(html, bq) } };
  }

  function faqParts(html) {
    var list = firstByClass(html, "div", "faq-list") || firstByClass(html, "section", "faq-list");
    if (!list) return null;
    var kids = childrenOf(html, list).filter(function (k) {
      var open = html.slice(k.start, k.start + Math.min(300, k.end - k.start));
      var cls = (open.match(/class="([^"]*)"/) || [])[1] || "";
      return matchClass(cls, "faq-item");
    });
    if (!kids.length) return null;
    // item0 anatomy: q inner + answer inner (wrapper-div inside .faq-a)
    var item0 = html.slice(kids[0].start, kids[0].end);
    var qSpan = /<span\b[^>]*>/.exec(item0);
    if (!qSpan) return null;
    var qRange = rangeOf(item0, qSpan.index);
    if (!qRange) return null;
    var aEl = firstByClass(item0, "div", "faq-a");
    if (!aEl) return null;
    // answer = inner of first child element inside faq-a
    var kidsA = childrenOf(item0, aEl);
    if (!kidsA.length) return null;
    var wrap = kidsA[0];
    var aInnerStart = item0.slice(aEl.openEnd, wrap.start); // whitespace before wrapper
    var answerRange = rangeOf(item0, wrap.start);
    if (!answerRange) return null;
    var items = kids.map(function (k) {
      var s = html.slice(k.start, k.end);
      return { s: s, start: k.start, end: k.end };
    });
    // For each item extract q + answer using item0-relative pattern only when
    // structure matches; otherwise fail (fallback: raw).
    var parsed = items.map(function (it) {
      var qs = /<span\b[^>]*>/.exec(it.s);
      if (!qs) return null;
      var qr = rangeOf(it.s, qs.index);
      if (!qr) return null;
      var ae = firstByClass(it.s, "div", "faq-a");
      if (!ae) return null;
      var ka = childrenOf(it.s, ae);
      if (!ka.length) return null;
      var ar = rangeOf(it.s, ka[0].start);
      if (!ar) return null;
      return {
        q: it.s.slice(qr.openEnd, qr.closeStart),
        a: it.s.slice(ar.openEnd, ar.closeStart),
        qStart: qr.openEnd, qEnd: qr.closeStart,
        aStart: ar.openEnd, aEnd: ar.closeStart,
      };
    });
    if (parsed.some(function (p) { return !p; })) return null;
    var sep = kids.length > 1 ? html.slice(kids[0].end, kids[1].start) : "";
    var listInnerStart = list.openEnd;
    var prefix = html.slice(listInnerStart, kids[0].start);
    var suffixStart = kids[kids.length - 1].end;
    var suffix = html.slice(suffixStart, list.closeStart);
    return { list: list, kids: kids, parsed: parsed, sep: sep, prefix: prefix, suffix: suffix };
  }

  function extractFaq(html) {
    if (!faqParts(html)) return null;
    var fields = {};
    var label = findLabel(html); if (label) fields.label = getInner(html, label);
    var h2 = findH2(html); if (h2) fields.heading = getInner(html, h2);
    var copy = findCopy(html); if (copy) fields.copy = getInner(html, copy);
    fields.items = faqParts(html).parsed.map(function (p) { return { q: p.q, a: p.a }; });
    if (!fields.items.length) return null;
    if (!fields.heading) return null;
    return { type: "faq", fields: fields };
  }

  function processParts(html) {
    var list = firstByClass(html, "div", "process-list");
    if (!list) return null;
    var kids = childrenOf(html, list).filter(function (k) {
      var open = html.slice(k.start, k.start + Math.min(300, k.end - k.start));
      var cls = (open.match(/class="([^"]*)"/) || [])[1] || "";
      return matchClass(cls, "step") || /^\s*<article\b/i.test(open);
    });
    if (!kids.length) return null;
    var parsed = kids.map(function (k) {
      var s = html.slice(k.start, k.end);
      var h3 = /<h3\b[^>]*>/.exec(s);
      if (!h3) return null;
      var hr = rangeOf(s, h3.index);
      if (!hr) return null;
      var p = /<p\b[^>]*>/.exec(s.slice(hr.closeStart));
      if (!p) return null;
      var pAbs = hr.closeStart + p.index;
      var pr = rangeOf(s, pAbs);
      if (!pr) return null;
      var bM = /<b>([^<]*)<\/b>/.exec(s);
      return {
        num: bM ? bM[1] : null,
        numStart: bM ? bM.index + 3 : null,
        title: s.slice(hr.openEnd, hr.closeStart),
        copy: s.slice(pr.openEnd, pr.closeStart),
        tStart: hr.openEnd, tEnd: hr.closeStart,
        cStart: pr.openEnd, cEnd: pr.closeStart,
        s: s,
      };
    });
    if (parsed.some(function (p) { return !p; })) return null;
    // numeric numbering consistency for identity (pad(width) === original)
    var width = parsed[0].num && /^\d+$/.test(parsed[0].num) ? parsed[0].num.length : 0;
    if (width) {
      for (var i = 0; i < parsed.length; i++) {
        var expect = String(i + 1);
        while (expect.length < width) expect = "0" + expect;
        if (parsed[i].num !== expect) return null;
      }
    }
    var sep = kids.length > 1 ? html.slice(kids[0].end, kids[1].start) : "";
    return {
      list: list, kids: kids, parsed: parsed, sep: sep, width: width,
      prefix: html.slice(list.openEnd, kids[0].start),
      suffix: html.slice(kids[kids.length - 1].end, list.closeStart),
    };
  }

  function extractProcess(html) {
    var pp = processParts(html);
    if (!pp) return null;
    var fields = { steps: pp.parsed.map(function (p) { return { title: p.title, copy: p.copy }; }) };
    var label = findLabel(html); if (label) fields.label = getInner(html, label);
    var h2 = findH2(html); if (h2) fields.heading = getInner(html, h2);
    var copy = findCopy(html); if (copy) fields.copy = getInner(html, copy);
    if (!fields.heading || !fields.steps.length) return null;
    return { type: "process", fields: fields };
  }

  function btnMatches(html) {
    var re = /(<a\b[^>]*class="[^"]*\bbtn\b[^"]*"[^>]*>)([\s\S]*?)(<\/a>)/gi;
    var out = [], m;
    while ((m = re.exec(html))) {
      out.push({ index: m.index, len: m[0].length, open: m[1], inner: m[2], close: m[3], full: m[0] });
    }
    return out;
  }

  function extractCta(html) {
    if (!hasClassWord(html, /contact/) && !hasClassWord(html, /cta/)) return null;
    var h2 = findH2(html);
    if (!h2) return null;
    var btns = btnMatches(html);
    if (!btns.length) return null;
    var fields = { heading: getInner(html, h2) };
    var label = findLabel(html); if (label) fields.label = getInner(html, label);
    var copy = findCopy(html); if (copy) fields.copy = getInner(html, copy);
    fields.actions = btns.map(function (b) {
      return { text: b.inner, href: attrOf(b.open, "href") || "" };
    });
    return { type: "cta", fields: fields };
  }

  function extract(html) {
    if (typeof html !== "string") return null;
    try {
      return extractHero(html) || extractPullquote(html) || extractFaq(html) ||
             extractProcess(html) || extractCta(html) || null;
    } catch (e) {
      return null;
    }
  }

  function classify(html) {
    var got = extract(html);
    return got ? got.type : "raw";
  }

  // ------------------------------------------------------------ regen
  function rebuildItems(prefix, suffix, sep, newInner) {
    return prefix + newInner + suffix;
  }

  function regenFaq(html, f) {
    var parts = faqParts(html);
    if (!parts || !Array.isArray(f.items)) return html;
    var out = html;
    if (typeof f.label === "string") out = setInner(out, findLabel, f.label);
    if (typeof f.heading === "string") out = setInner(out, findH2, f.heading);
    if (typeof f.copy === "string") out = setInner(out, findCopy, f.copy);
    // rebuild list region (recompute against ORIGINAL parts positions: apply
    // scalar edits first may shift offsets — so rebuild list from `html` positions
    // BEFORE scalar edits. Order: list first on original html, then scalars.)
    var p = parts;
    var itemHtml = p.parsed.map(function (it, i) {
      var src = html.slice(p.kids[i].start, p.kids[i].end);
      var q = typeof f.items[i] === "object" && f.items[i] ? String(f.items[i].q == null ? "" : f.items[i].q) : it.q;
      var a = typeof f.items[i] === "object" && f.items[i] ? String(f.items[i].a == null ? "" : f.items[i].a) : it.a;
      // item anatomy relative splices
      var qSlice = { start: it.qStart, end: it.qEnd };
      var aSlice = { start: it.aStart, end: it.aEnd };
      return src.slice(0, qSlice.start) + q + src.slice(qSlice.end, aSlice.start) + a + src.slice(aSlice.end);
    });
    // extra items cloned from template item0 pattern
    for (var i = p.parsed.length; i < f.items.length; i++) {
      var tpl = p.parsed[0];
      var src0 = html.slice(p.kids[0].start, p.kids[0].end);
      var qq = String((f.items[i] && f.items[i].q) || "");
      var aa = String((f.items[i] && f.items[i].a) || "");
      itemHtml.push(src0.slice(0, tpl.qStart) + qq + src0.slice(tpl.qEnd, tpl.aStart) + aa + src0.slice(tpl.aEnd));
    }
    var newInner = itemHtml.join(p.sep);
    var rebuilt = out.slice(0, p.list.openEnd) + p.prefix + newInner + p.suffix + out.slice(p.list.closeStart);
    // ^ positions of list are from original html; scalar edits AFTER list region
    // would break offsets. Guard: only apply scalars that don't sit before list...
    // Simpler + safe: do list rebuild on original html first, then scalars.
    rebuilt = html.slice(0, p.list.openEnd) + p.prefix + newInner + p.suffix + html.slice(p.list.closeStart);
    if (typeof f.label === "string") rebuilt = setInner(rebuilt, findLabel, f.label);
    if (typeof f.heading === "string") rebuilt = setInner(rebuilt, findH2, f.heading);
    if (typeof f.copy === "string") rebuilt = setInner(rebuilt, findCopy, f.copy);
    return rebuilt;
  }

  function regenProcess(html, f) {
    var p = processParts(html);
    if (!p || !Array.isArray(f.steps)) return html;
    var width = p.width;
    var itemHtml = p.parsed.map(function (it, i) {
      var src = html.slice(p.kids[i].start, p.kids[i].end);
      var st = f.steps[i] || it;
      var title = String(st.title == null ? it.title : st.title);
      var copy = String(st.copy == null ? it.copy : st.copy);
      var out = src.slice(0, it.tStart) + title + src.slice(it.tEnd, it.cStart) + copy + src.slice(it.cEnd);
      if (width && it.num != null) {
        var num = String(i + 1);
        while (num.length < width) num = "0" + num;
        out = out.replace(/<b>[^<]*<\/b>/, "<b>" + num + "</b>");
      }
      return out;
    });
    for (var i = p.parsed.length; i < f.steps.length; i++) {
      var it0 = p.parsed[0];
      var src0 = html.slice(p.kids[0].start, p.kids[0].end);
      var st = f.steps[i] || {};
      var num = String(i + 1);
      while (width && num.length < width) num = "0" + num;
      var out = src0.slice(0, it0.tStart) + String(st.title || "") + src0.slice(it0.tEnd, it0.cStart) + String(st.copy || "") + src0.slice(it0.cEnd);
      if (width) out = out.replace(/<b>[^<]*<\/b>/, "<b>" + num + "</b>");
      itemHtml.push(out);
    }
    var rebuilt = html.slice(0, p.list.openEnd) + p.prefix + itemHtml.join(p.sep) + p.suffix + html.slice(p.list.closeStart);
    if (typeof f.label === "string") rebuilt = setInner(rebuilt, findLabel, f.label);
    if (typeof f.heading === "string") rebuilt = setInner(rebuilt, findH2, f.heading);
    if (typeof f.copy === "string") rebuilt = setInner(rebuilt, findCopy, f.copy);
    return rebuilt;
  }

  function regenCta(html, f) {
    var out = html;
    if (typeof f.label === "string") out = setInner(out, findLabel, f.label);
    if (typeof f.heading === "string") out = setInner(out, findH2, f.heading);
    if (typeof f.copy === "string") out = setInner(out, findCopy, f.copy);
    var btns = btnMatches(out);
    if (Array.isArray(f.actions) && btns.length) {
      var parts = [];
      var pos = 0;
      for (var i = 0; i < btns.length; i++) {
        var b = btns[i];
        parts.push(out.slice(pos, b.index));
        var act = f.actions[i];
        if (act) {
          var open = b.open;
          if (typeof act.href === "string" && attrOf(open, "href") !== null) open = setAttr(open, "href", act.href);
          parts.push(open + (act.text == null ? b.inner : act.text) + b.close);
        } else {
          // fewer actions than original: drop this button entirely
        }
        pos = b.index + b.len;
      }
      parts.push(out.slice(pos));
      var joined = parts.join("");
      // extra actions beyond original count: clone last button
      if (f.actions.length > btns.length && btns.length) {
        var last = btns[btns.length - 1];
        var extra = "";
        for (var j = btns.length; j < f.actions.length; j++) {
          var a2 = f.actions[j] || {};
          var open2 = last.open;
          if (a2.href != null && attrOf(open2, "href") !== null) open2 = setAttr(open2, "href", String(a2.href));
          extra += open2 + String(a2.text == null ? "" : a2.text) + last.close;
        }
        // insert before the end of the last element's parent — approximate:
        // append right after the final button
        var lastIdx = joined.lastIndexOf(last.open);
        if (lastIdx !== -1) {
          var lr = rangeOf(joined, lastIdx);
          if (lr) joined = joined.slice(0, lr.end) + extra + joined.slice(lr.end);
        }
      }
      out = joined;
    }
    return out;
  }

  function regen(block) {
    var html = String(block && block.html || "");
    var f = block && block.fields;
    if (!f) return html;
    try {
      switch (block.type) {
        case "hero": {
          var out = html;
          if (typeof f.heading === "string") out = setInner(out, findH1, f.heading);
          if (typeof f.label === "string") out = setInner(out, findLabel, f.label);
          if (typeof f.copy === "string") out = setInner(out, findCopy, f.copy);
          var btn = findBtncA(out);
          if (btn && (typeof f.cta_text === "string" || typeof f.cta_href === "string")) {
            var open = out.slice(btn.start, btn.openEnd);
            if (typeof f.cta_href === "string" && attrOf(open, "href") !== null) open = setAttr(open, "href", f.cta_href);
            var text = typeof f.cta_text === "string" ? f.cta_text : getInner(out, btn);
            out = out.slice(0, btn.start) + open + text + out.slice(btn.closeStart);
          }
          var img = findFirstImg(out);
          if (img && (typeof f.img_src === "string" || typeof f.img_alt === "string")) {
            var o = img.open;
            if (typeof f.img_src === "string" && attrOf(o, "src") !== null) o = setAttr(o, "src", f.img_src);
            if (typeof f.img_alt === "string" && attrOf(o, "alt") !== null) o = setAttr(o, "alt", f.img_alt);
            out = out.slice(0, img.start) + o + out.slice(img.openEnd);
          }
          return out;
        }
        case "pullquote": {
          if (typeof f.text !== "string") return html;
          return setInner(html, function (h) { return findElement(h, /<blockquote\b[^>]*>/i); }, f.text);
        }
        case "faq": return regenFaq(html, f);
        case "process": return regenProcess(html, f);
        case "cta": return regenCta(html, f);
        default: return html;
      }
    } catch (e) {
      return html;
    }
  }

  return {
    extract: extract,
    classify: classify,
    regen: regen,
    _internals: { rangeOf: rangeOf, childrenOf: childrenOf, findElement: findElement, firstByClass: firstByClass },
  };
});
