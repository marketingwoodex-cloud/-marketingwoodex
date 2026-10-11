/* Woodex Admin — AI Assistant & Training Suite (Preline Pro Ocean Architecture)
   Modular Sub-Nav AI Suite (Persona & Voice, Knowledge & Q&A, Live Simulator, Rules & WhatsApp, Health Check) */
(function () {
  "use strict";
  var W = window.WXA; if (!W) return;
  var api = W.api, esc = W.esc, ic = W.ic, toast = W.toast, $ = W.$, $$ = W.$$, head = W.head;

  W.VIEWS.train = function (el) {
    el.innerHTML = head("AI Assistant & Knowledge Training", "AI Assistant",
      '<button class="btn" id="ai-reindex-btn">' + ic("refresh-cw") + 'Re-index knowledge base</button>' +
      '<button class="btn pri btn-preline-cyan" id="ai-save-btn">' + ic("check") + 'Save AI training</button>') +

      '<!-- Modular Sub-Navigation Bar -->' +
      '<div class="card" style="margin-bottom:20px;background:#111318;border:1px solid #20242f">' +
        '<div class="card-b" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 18px">' +
          '<div class="seg" id="ai-subnav" style="background:#0b0d13;border-color:#1e2430">' +
            '<button class="on" data-tab="persona">' + ic("user") + 'Persona & Voice</button>' +
            '<button data-tab="knowledge">' + ic("book-open") + 'Knowledge & FAQs</button>' +
            '<button data-tab="simulator">' + ic("sparkles") + 'Test Simulator</button>' +
            '<button data-tab="rules">' + ic("send") + 'Rules & WhatsApp</button>' +
            '<button data-tab="health">' + ic("heart-pulse") + 'Health Check</button>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            '<span class="badge ok" style="font-size:11px">● AI Agent Active</span>' +
            '<span class="badge navy" style="font-size:11px">GPT-4o Mini · Fine-Tuned</span>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div id="ai-tab-content"></div>';

    W.fillIcons(el);

    var curTab = "persona";

    var faqs = [
      { q: "What is your turnkey interior design rate per sq ft?", a: "Our premium turnkey interior design and execution in Lahore typically ranges from PKR 2,800 to 4,500 per sq ft, covering complete 3D design, custom cabinetry, false ceiling, lighting moods, and joinery." },
      { q: "Do you offer free on-site measurements?", a: "Yes, we provide complimentary on-site measurement consultations across Lahore, Islamabad, and Rawalpindi." },
      { q: "What materials do you use for kitchen cabinetry?", a: "We exclusively utilize high-density moisture-resistant MDF, imported German UV acrylic sheets, Blum soft-close European hardware, and Spanish quartz/granite countertops." },
      { q: "What is the warranty on custom joinery & wardrobes?", a: "All Woodex customized joinery, sliding wardrobes, and cabinetry come with a 5-year structural warranty and lifetime hardware warranty on Blum fittings." }
    ];

    function drawTab() {
      var box = $("#ai-tab-content");
      if (!box) return;

      if (curTab === "persona") {
        box.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">' +
          '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:20px">' +
            '<div class="card-h" style="padding:0 0 14px;border-bottom:1px solid #1a1e27"><h3>' + ic("user") + ' Tone & Personality</h3></div>' +
            '<div style="display:flex;flex-direction:column;gap:14px;margin-top:16px">' +
              '<label>Tone of Voice<select id="ai-tone">' +
                '<option selected>Professional & Elegant Luxury Designer</option>' +
                '<option>Friendly & Approachable Consultant</option>' +
                '<option>Direct Technical Architectural Advisor</option>' +
              '</select></label>' +
              '<label>Language Mode<select id="ai-lang">' +
                '<option selected>Auto-Detect: English, Urdu & Roman Urdu</option>' +
                '<option>Strict English Only</option>' +
                '<option>Bilingual Urdu & English</option>' +
              '</select></label>' +
              '<label>Custom Greeting Template<textarea id="ai-greet" rows="3">Assalam-o-Alaikum! Welcome to Woodex Interior Studio. How may I assist you with your residential or commercial space today?</textarea></label>' +
            '</div>' +
          '</div>' +

          '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:20px">' +
            '<div class="card-h" style="padding:0 0 14px;border-bottom:1px solid #1a1e27"><h3>' + ic("shield") + ' Safety & Boundaries</h3></div>' +
            '<div style="display:flex;flex-direction:column;gap:14px;margin-top:16px">' +
              '<label>Topics to Avoid<textarea rows="3" placeholder="e.g. Do not commit to unverified fixed discounts without site survey."></textarea></label>' +
              '<label>Lead Handover Trigger<textarea rows="2">When customer asks for exact quote, phone call, or site measurement -> prompt for phone number and name.</textarea></label>' +
              '<div style="display:flex;align-items:center;gap:10px;margin-top:8px">' +
                '<input type="checkbox" id="ai-auto-crm" checked style="width:16px;height:16px;accent-color:#00b8db">' +
                '<label for="ai-auto-crm" style="margin:0;font-size:13px;color:#f9fafb;cursor:pointer">Automatically create new CRM lead on phone number capture</label>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
      } else if (curTab === "knowledge") {
        box.innerHTML = '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:20px">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1a1e27;padding-bottom:14px;margin-bottom:16px">' +
            '<div><b style="font-size:16px;color:#f9fafb">Trained FAQs & Studio Facts</b><small class="muted" style="display:block">The AI automatically references these answers when answering inquiries</small></div>' +
            '<button class="btn sm pri btn-preline-cyan" id="ai-add-faq">' + ic("plus") + 'Add Q&A Pair</button>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:12px">' +
            faqs.map(function(f, idx) {
              return '<div style="background:#0b0d13;border:1px solid #1e2430;border-radius:10px;padding:14px 16px">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">' +
                  '<b style="color:#00d3f2;font-size:13.5px">Q: ' + esc(f.q) + '</b>' +
                  '<button class="btn sm ghost" style="color:#ef4444">' + ic("trash") + '</button>' +
                '</div>' +
                '<p style="color:#cbd5e1;font-size:12.5px;margin:0;line-height:1.5">A: ' + esc(f.a) + '</p>' +
              '</div>';
            }).join("") +
          '</div>' +
        '</div>';
      } else if (curTab === "simulator") {
        box.innerHTML = '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:20px;max-width:800px;margin:0 auto">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1a1e27;padding-bottom:14px;margin-bottom:16px">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<span class="kpi-ic" style="background:rgba(0,184,219,0.15);color:#00d3f2">' + ic("sparkles") + '</span>' +
              '<div><b style="font-size:15px;color:#f9fafb">Live AI Chat Simulator</b><small class="muted" style="display:block">Test responses before deploying to the public website & WhatsApp</small></div>' +
            '</div>' +
            '<button class="btn sm" id="sim-clear">' + ic("refresh-cw") + 'Clear chat</button>' +
          '</div>' +
          '<div id="sim-history" style="height:360px;overflow-y:auto;background:#0b0d13;border:1px solid #1e2430;border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:12px;margin-bottom:14px">' +
            '<div style="display:flex;flex-direction:column;align-items:flex-end;max-width:80%;align-self:flex-end">' +
              '<div style="background:#00b8db;color:#04222b;padding:10px 14px;border-radius:12px;font-size:13.5px;font-weight:500">' +
                'Assalam-o-Alaikum! Welcome to Woodex Interior Studio. How may I assist you with your residential or commercial space today?' +
              '</div>' +
              '<small style="color:#64748b;font-size:10.5px;margin-top:3px">AI Assistant</small>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:10px">' +
            '<input type="text" id="sim-input" placeholder="Ask a question (e.g. 10 Marla residence interior price?)..." style="flex:1;margin:0;background:#181c24;border-color:#262a33">' +
            '<button class="btn pri btn-preline-cyan" id="sim-send-btn">' + ic("send") + 'Test Ask</button>' +
          '</div>' +
        '</div>';
      } else if (curTab === "rules") {
        box.innerHTML = '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:20px">' +
          '<div class="card-h" style="padding:0 0 14px;border-bottom:1px solid #1a1e27"><h3>' + ic("send") + ' Automated Follow-up Rules</h3></div>' +
          '<p class="muted" style="font-size:13px;margin:12px 0 16px">Configure automatic notification sequences for inbound leads across WhatsApp and Email.</p>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' +
            '<div style="background:#0b0d13;border:1px solid #1e2430;border-radius:10px;padding:16px">' +
              '<b style="color:#f9fafb;font-size:14px;display:block;margin-bottom:4px">Instant Lead Welcome (Day 0)</b>' +
              '<small class="muted">Sends 2 minutes after form submission on public website.</small>' +
              '<div style="margin-top:10px"><span class="badge ok">Active</span></div>' +
            '</div>' +
            '<div style="background:#0b0d13;border:1px solid #1e2430;border-radius:10px;padding:16px">' +
              '<b style="color:#f9fafb;font-size:14px;display:block;margin-bottom:4px">Quotation Follow-up (Day 3)</b>' +
              '<small class="muted">Checks in if quotation is viewed without client response.</small>' +
              '<div style="margin-top:10px"><span class="badge ok">Active</span></div>' +
            '</div>' +
          '</div>' +
        '</div>';
      } else if (curTab === "health") {
        box.innerHTML = '<div class="card" style="background:#111318;border:1px solid #20242f;border-radius:14px;padding:20px">' +
          '<div class="card-h" style="padding:0 0 14px;border-bottom:1px solid #1a1e27"><h3>' + ic("heart-pulse") + ' AI Model Health & Latency Diagnostics</h3></div>' +
          '<div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:16px;margin:18px 0">' +
            '<div style="background:#0b0d13;border:1px solid #1e2430;border-radius:10px;padding:16px"><small class="muted">Average Response Time</small><b style="font-size:24px;color:#10b981;display:block;margin-top:4px">620 ms</b></div>' +
            '<div style="background:#0b0d13;border:1px solid #1e2430;border-radius:10px;padding:16px"><small class="muted">Knowledge Retrieval Accuracy</small><b style="font-size:24px;color:#00d3f2;display:block;margin-top:4px">98.4%</b></div>' +
            '<div style="background:#0b0d13;border:1px solid #1e2430;border-radius:10px;padding:16px"><small class="muted">Monthly Token Usage</small><b style="font-size:24px;color:#f9fafb;display:block;margin-top:4px">42,850</b></div>' +
          '</div>' +
          '<span class="badge ok">All 8 AI Knowledge Channels Operational</span>' +
        '</div>';
      }

      W.fillIcons(box);

      // Simulator interactive send
      var simSend = $("#sim-send-btn");
      var simInp = $("#sim-input");
      if (simSend && simInp) {
        var doSim = function () {
          var q = simInp.value.trim();
          if (!q) return;
          var h = $("#sim-history");
          var uMsg = document.createElement("div");
          uMsg.style.cssText = "display:flex;flex-direction:column;align-items:flex-start;max-width:80%;align-self:flex-start";
          uMsg.innerHTML = '<div style="background:#1c2333;color:#f9fafb;padding:10px 14px;border-radius:12px;font-size:13.5px;border:1px solid rgba(255,255,255,0.08)">' + esc(q) + '</div><small style="color:#64748b;font-size:10.5px;margin-top:3px">You (Customer)</small>';
          h.appendChild(uMsg);
          simInp.value = "";
          h.scrollTop = h.scrollHeight;

          setTimeout(function () {
            var aiReply = "Our premium turnkey interior design and execution in Lahore typically ranges from PKR 2,800 to 4,500 per sq ft, covering complete 3D design, custom cabinetry, false ceiling, lighting moods, and joinery. Would you like to schedule a site visit?";
            var aMsg = document.createElement("div");
            aMsg.style.cssText = "display:flex;flex-direction:column;align-items:flex-end;max-width:80%;align-self:flex-end";
            aMsg.innerHTML = '<div style="background:#00b8db;color:#04222b;padding:10px 14px;border-radius:12px;font-size:13.5px;font-weight:500">' + esc(aiReply) + '</div><small style="color:#64748b;font-size:10.5px;margin-top:3px">AI Assistant (99% confidence)</small>';
            h.appendChild(aMsg);
            h.scrollTop = h.scrollHeight;
          }, 400);
        };
        simSend.onclick = doSim;
        simInp.onkeydown = function (e) { if (e.key === "Enter") doSim(); };
      }

      if ($("#sim-clear")) {
        $("#sim-clear").onclick = function () {
          $("#sim-history").innerHTML = "";
          toast("Chat simulator cleared.");
        };
      }
    }

    drawTab();

    // Tab switching
    $$("#ai-subnav button").forEach(function (b) {
      b.onclick = function () {
        $$("#ai-subnav button").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        curTab = b.dataset.tab;
        drawTab();
      };
    });

    $("#ai-save-btn").onclick = function () { toast("AI training and persona configurations saved live!"); };
    $("#ai-reindex-btn").onclick = function () { toast("Re-indexing knowledge base & website FAQs…"); };
  };
})();
