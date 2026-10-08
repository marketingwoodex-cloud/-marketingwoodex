/* ==================== TAILWIND THEMES & ADMIN MASTER CONTROL ==================== */
SCREENS.theme = async function () {
  const c = $("#content");
  c.className = "content";
  c.innerHTML =
    '<div class="ph"><div class="ph-l"><div class="crumb"><a href="#/dashboard">Home</a> / Master Control / Theme System</div><h1>Tailwind CSS Theme Engine &amp; Master Control</h1></div>' +
    '<div class="ph-r">' +
      '<button class="btn" id="th-export-btn">' + ic("download") + 'Export CSS Tokens</button>' +
      '<button class="btn pri" id="th-save-btn">' + ic("check") + 'Apply &amp; Save Config</button>' +
    '</div></div>' +

    '<!-- Theme Preset Cards Grid -->' +
    '<div class="folder-sec-title mb6">Official Preline &amp; Tailwind Themes</div>' +
    '<div class="grid mb14" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:var(--gap)">' +
      '<div class="card p10 hover-card cursor-pointer th-preset-card on" data-preset="ocean">' +
        '<div class="f aic jcb mb6"><b class="fs12">Preline Ocean</b><span class="badge sm suc">ACTIVE</span></div>' +
        '<div class="f g4 mb4"><span class="dot" style="background:#00b8db;width:18px;height:18px"></span><span class="dot" style="background:#00d3f2;width:18px;height:18px"></span><span class="dot" style="background:#171717;width:18px;height:18px"></span></div>' +
        '<small class="mut">Cyan primary, dark neutral surface</small>' +
      '</div>' +
      '<div class="card p10 hover-card cursor-pointer th-preset-card" data-preset="obsidian">' +
        '<div class="f aic jcb mb6"><b class="fs12">Obsidian Glow</b><span class="badge sm">REFERENCE</span></div>' +
        '<div class="f g4 mb4"><span class="dot" style="background:#0075ff;width:18px;height:18px"></span><span class="dot" style="background:#00d3f2;width:18px;height:18px"></span><span class="dot" style="background:#08090d;width:18px;height:18px"></span></div>' +
        '<small class="mut">Pitch-black backdrop, electric blue glow</small>' +
      '</div>' +
      '<div class="card p10 hover-card cursor-pointer th-preset-card" data-preset="indigo">' +
        '<div class="f aic jcb mb6"><b class="fs12">Corporate Indigo</b></div>' +
        '<div class="f g4 mb4"><span class="dot" style="background:#4f46e5;width:18px;height:18px"></span><span class="dot" style="background:#818cf8;width:18px;height:18px"></span><span class="dot" style="background:#0f172a;width:18px;height:18px"></span></div>' +
        '<small class="mut">Slate-900 surface, vibrant indigo</small>' +
      '</div>' +
      '<div class="card p10 hover-card cursor-pointer th-preset-card" data-preset="emerald">' +
        '<div class="f aic jcb mb6"><b class="fs12">Emerald Studio</b></div>' +
        '<div class="f g4 mb4"><span class="dot" style="background:#059669;width:18px;height:18px"></span><span class="dot" style="background:#10b981;width:18px;height:18px"></span><span class="dot" style="background:#18181b;width:18px;height:18px"></span></div>' +
        '<small class="mut">Zinc dark, fresh organic emerald</small>' +
      '</div>' +
      '<div class="card p10 hover-card cursor-pointer th-preset-card" data-preset="amber">' +
        '<div class="f aic jcb mb6"><b class="fs12">Amber Luxury</b></div>' +
        '<div class="f g4 mb4"><span class="dot" style="background:#d97706;width:18px;height:18px"></span><span class="dot" style="background:#f59e0b;width:18px;height:18px"></span><span class="dot" style="background:#171717;width:18px;height:18px"></span></div>' +
        '<small class="mut">Warm luxury gold, premium dark</small>' +
      '</div>' +
    '</div>' +

    '<!-- Token Customizer & White-Label Reuse -->' +
    '<div class="grid" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:var(--gap)">' +
      '<div class="card">' +
        '<div class="card-h"><h3>' + ic("sliders") + 'Live Token Customizer</h3></div>' +
        '<div class="card-b" style="display:grid;gap:12px">' +
          '<div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">' +
            '<div><label class="lbl">Primary Brand Hex</label><div class="f aic g6"><input type="color" id="th-col-pri" value="#00b8db" style="width:36px;height:32px;border:none;background:none;cursor:pointer"><input class="inp mono" id="th-hex-pri" value="#00b8db"></div></div>' +
            '<div><label class="lbl">Accent Highlight Hex</label><div class="f aic g6"><input type="color" id="th-col-acc" value="#00d3f2" style="width:36px;height:32px;border:none;background:none;cursor:pointer"><input class="inp mono" id="th-hex-acc" value="#00d3f2"></div></div>' +
          '</div>' +
          '<div><label class="lbl">Corner Radius Scale</label>' +
            '<select class="inp" id="th-radius">' +
              '<option value="compact">Subtle &amp; Sharp (4px / 6px)</option>' +
              '<option value="default" selected>Preline Standard (6px / 10px / 14px)</option>' +
              '<option value="rounded">Modern Rounded (8px / 14px / 20px)</option>' +
              '<option value="pill">Pill Glassmorphic (12px / 20px / 9999px)</option>' +
            '</select>' +
          '</div>' +
          '<div><label class="lbl">UI Density Scale</label>' +
            '<select class="inp" id="th-density">' +
              '<option value="dense" selected>High Density (Agency Control Room - 32px inputs)</option>' +
              '<option value="normal">Standard Density (38px inputs)</option>' +
              '<option value="spacious">Spacious (44px inputs)</option>' +
            '</select>' +
          '</div>' +
          '<div class="f aic jcb p10 b-card">' +
            '<div><b>Glassmorphism Ambient Backlight</b><small class="mut dblk">Enable subtle blue/cyan radial glow on cards</small></div>' +
            '<label class="switch"><input type="checkbox" id="th-glow" checked><span class="slider"></span></label>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="card">' +
        '<div class="card-h"><h3>' + ic("building") + 'White-Label &amp; Multi-Tenant Control</h3></div>' +
        '<div class="card-b" style="display:grid;gap:12px">' +
          '<div><label class="lbl">Tenant Studio / Agency Name</label><input class="inp" id="th-biz-name" value="Woodex Interior Design"></div>' +
          '<div><label class="lbl">Dashboard Headline</label><input class="inp" id="th-biz-tag" value="Agency Control Room &amp; Omnichannel Hub"></div>' +
          '<div class="p10 b-card">' +
            '<b class="fs12 dblk mb4">Re-use for Other Client Projects</b>' +
            '<p class="fs11 mut mb8">Export this entire theme token configuration to quickly deploy a customized admin dashboard for any client.</p>' +
            '<div class="f g6">' +
              '<button class="btn sm" id="th-btn-dl-json">' + ic("download") + 'Save Theme JSON</button>' +
              '<button class="btn sm" id="th-btn-up-json">' + ic("upload") + 'Import JSON</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  paintIcons(c);

  const PRESETS = {
    ocean: { pri: "#00b8db", acc: "#00d3f2", bg: "#171717", card: "#262626" },
    obsidian: { pri: "#0075ff", acc: "#00d3f2", bg: "#08090d", card: "#12141a" },
    indigo: { pri: "#4f46e5", acc: "#818cf8", bg: "#0f172a", card: "#1e293b" },
    emerald: { pri: "#059669", acc: "#10b981", bg: "#18181b", card: "#27272a" },
    amber: { pri: "#d97706", acc: "#f59e0b", bg: "#171717", card: "#262626" }
  };

  const applyColors = (pri, acc) => {
    document.documentElement.style.setProperty("--primary", pri);
    document.documentElement.style.setProperty("--accent", acc);
    document.documentElement.style.setProperty("--accent-soft", acc + "1a");
  };

  $$(".th-preset-card").forEach(card => {
    card.onclick = () => {
      $$(".th-preset-card").forEach(x => {
        x.classList.remove("on");
        const b = x.querySelector(".badge");
        if (b) b.remove();
      });
      card.classList.add("on");
      card.querySelector(".f").innerHTML += '<span class="badge sm suc">ACTIVE</span>';

      const pKey = card.dataset.preset;
      const cfg = PRESETS[pKey];
      if (cfg) {
        $("#th-col-pri").value = cfg.pri;
        $("#th-hex-pri").value = cfg.pri;
        $("#th-col-acc").value = cfg.acc;
        $("#th-hex-acc").value = cfg.acc;
        applyColors(cfg.pri, cfg.acc);
        toast("Switched to " + card.querySelector("b").textContent + " theme", "suc");
      }
    };
  });

  $("#th-col-pri").oninput = e => {
    $("#th-hex-pri").value = e.target.value;
    applyColors(e.target.value, $("#th-hex-acc").value);
  };
  $("#th-hex-pri").oninput = e => {
    if (/^#[0-9a-f]{6}$/i.test(e.target.value)) {
      $("#th-col-pri").value = e.target.value;
      applyColors(e.target.value, $("#th-hex-acc").value);
    }
  };

  $("#th-col-acc").oninput = e => {
    $("#th-hex-acc").value = e.target.value;
    applyColors($("#th-hex-pri").value, e.target.value);
  };
  $("#th-hex-acc").oninput = e => {
    if (/^#[0-9a-f]{6}$/i.test(e.target.value)) {
      $("#th-col-acc").value = e.target.value;
      applyColors($("#th-hex-pri").value, e.target.value);
    }
  };

  $("#th-save-btn").onclick = () => {
    const config = {
      primary: $("#th-hex-pri").value,
      accent: $("#th-hex-acc").value,
      radius: $("#th-radius").value,
      density: $("#th-density").value,
      name: $("#th-biz-name").value,
      tag: $("#th-biz-tag").value
    };
    try { localStorage.setItem("wx3ThemeConfig", JSON.stringify(config)); } catch(e){}
    toast("Master theme configuration saved successfully", "suc");
  };

  $("#th-export-btn").onclick = () => {
    const pri = $("#th-hex-pri").value;
    const acc = $("#th-hex-acc").value;
    const cssTokens = ':root {\n  --primary: ' + pri + ';\n  --accent: ' + acc + ';\n  --accent-soft: ' + acc + '1a;\n  --font-sans: "Inter", sans-serif;\n}';
    modal(
      '<div class="modal-h"><h3>' + ic("download") + 'Export CSS Tokens</h3><button class="iconbtn" data-x>' + ic("x") + '</button></div>' +
      '<div class="modal-b">' +
        '<p class="fs12 mut mb8">Copy and paste these CSS variables into your Tailwind v4 theme.css or styles.css:</p>' +
        '<textarea class="inp mono" rows="6" readonly>' + esc(cssTokens) + '</textarea>' +
      '</div>' +
      '<div class="modal-f"><button class="btn pri" onclick="navigator.clipboard.writeText(\'' + esc(cssTokens).replace(/\n/g, "\\n") + '\'); toast(\'Copied tokens to clipboard\', \'suc\')">Copy to Clipboard</button></div>'
    );
  };

  $("#th-btn-dl-json").onclick = () => {
    const config = {
      version: "3.0",
      theme: "Tailwind Preline Multi-Tenant",
      primary: $("#th-hex-pri").value,
      accent: $("#th-hex-acc").value,
      radius: $("#th-radius").value,
      density: $("#th-density").value,
      tenant: { name: $("#th-biz-name").value, tag: $("#th-biz-tag").value }
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "admin-theme-config-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    toast("Theme JSON exported", "suc");
  };

  $("#th-btn-up-json").onclick = () => {
    toast("Theme JSON importer ready", "inf");
  };
};
