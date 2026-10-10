/* ============================================================================
   WOODEX ADMIN V2.1 + ARC.STUDIO — Kit manifest
   Single source of truth for the catalogue: modules, block mapping and the
   Preline engine each screen is derived from. Consumed by index.html only.
   ========================================================================== */
window.ARC_MANIFEST = {
  brand: { name: "WOODEX ADMIN", version: "V2.1", studio: "ARC.STUDIO", build: "2026-10-11" },

  foundations: [
    { id: "palette",   title: "Palette Matrix",        note: "stone/neutral range only — concrete, steel, walnut" },
    { id: "spacing",   title: "8px Spacing Matrix",    note: "gap-2 · p-4 · p-6 · mb-8 — no arbitrary floats" },
    { id: "type",      title: "Typography Scale",      note: "brand · system label · body · KPI readout" },
    { id: "frame",     title: "Fixed Frame Shell",     note: "w-64 rail + floating content viewport" },
    { id: "status",    title: "Monochrome Status Law", note: "fill, edge and dot weight replace colour coding" }
  ],

  groups: [
    { key: "I",   name: "Overview & Central Operations",     modules: ["m01", "m02", "m03", "m04"] },
    { key: "II",  name: "Architectural Plans & Schematics",  modules: ["m05", "m06", "m07", "m08"] },
    { key: "III", name: "Sales & Pipeline Tracking",         modules: ["m09", "m10", "m11", "m12"] },
    { key: "IV",  name: "Billing, Documents & Finance",      modules: ["m13", "m14", "m15", "m16", "m17"] },
    { key: "V",   name: "Automation & Communication Nodes",  modules: ["m18", "m19", "m20", "m21"] },
    { key: "VI",  name: "Client Experience & Portal",        modules: ["m22", "m23"] },
    { key: "VII", name: "Security, Logs & Utilities",        modules: ["m24", "m25", "m26"] }
  ],

  modules: {
    m01: { n: 1, title: "Dashboard Portal", file: "modules/m01-dashboard-portal.html",
      block1: "Title Bars — system title, date selector dropdown, refresh toggle",
      block2: "KPI Cards + Spark Charts — gross sales, live projects, lead conversions, collection",
      block3: "Chart Compositions + Activity Feeds — monthly revenue curves, structural update history",
      engines: ["KPI Cards", "Spark Charts", "Line Chart", "List Group"], canvas: "Split canvas 8 / 4" },

    m02: { n: 2, title: "System Approvals Gate", file: "modules/m02-approvals-gate.html",
      block1: "Segmented filters — Financial Requests / Blueprint Modifications",
      block2: "KPI Cards — pending invoices, unsigned quotes, field approvals, SLA breaches",
      block3: "List Groups + Action Button Groups — cross-comparison rows with Reject / Approve",
      engines: ["KPI Cards", "List Group", "Button Group", "Badge"], canvas: "Ledger rows + decision rail" },

    m03: { n: 3, title: "Unified Team Feed", file: "modules/m03-team-feed.html",
      block1: "Workspace Headers — member tracking strip, thread filter settings",
      block2: "Status Badges + Progress Indicators — fabricators online, open RFIs, submittal rate",
      block3: "Chat Workspace Layouts — channels, team tag systems, attachment shortcuts",
      engines: ["Chat Workspace", "Message Bubbles", "Avatar Stack", "Progress"], canvas: "Channels / thread / attachments" },

    m04: { n: 4, title: "Activity & Timelines", file: "modules/m04-activity-timelines.html",
      block1: "Title Bars — project selector, timeline view modifiers",
      block2: "Progress Cards — variance, milestones, resource usage, idle time",
      block3: "Timelines — shop cycles and site preparation phases on one roadmap",
      engines: ["Progress Cards", "Timeline", "Gantt Rail"], canvas: "Chronological roadmap" },

    m05: { n: 5, title: "Site Layout & Zoning", file: "modules/m05-site-zoning.html",
      block1: "Title Bars — coordinate reference inputs, legal zone selectors",
      block2: "Description Lists — boundary, allowable F.A.R., setbacks, coverage",
      block3: "Data Maps + File Views — plot map with land registry and verification scans",
      engines: ["Data Map", "File Views", "Description List"], canvas: "Map viewport + registry rail" },

    m06: { n: 6, title: "Floor Plan Shells", file: "modules/m06-floor-plan-shells.html",
      block1: "Title Bars — blueprint version picker, export parameters",
      block2: "Label & Feedback Groups — interior area, millwork runs, clearances",
      block3: "Multi-Panel Layouts — layer tree, schematic viewport, spec panel",
      engines: ["Multi-Panel", "Layer Tree", "Blueprint Viewport"], canvas: "3-panel schematic" },

    m07: { n: 7, title: "3D Elevation Wireframes", file: "modules/m07-elevation-wireframes.html",
      block1: "Title Bars — render options (orthographic / perspective), mesh settings",
      block2: "Utility Links — envelope area, interface nodes, material codes, render time",
      block3: "Gallery Grids + Detail Drawers — render matrix with millwork trim specs",
      engines: ["Gallery Grid", "Drawer", "Spec List"], canvas: "Render matrix + asset drawer" },

    m08: { n: 8, title: "Structural Engineering", file: "modules/m08-structural-engineering.html",
      block1: "Title Bars — load category filters (dead / live / wind)",
      block2: "Badge Styles — span capacity, deflection rate, moisture target, safety factor",
      block3: "Admin Utility Tables — numeric stress grid for load-bearing beams and joints",
      engines: ["Admin Utility Table", "Badge Styles", "Meter Column"], canvas: "Numeric stress grid" },

    m09: { n: 9, title: "Leads & Pipeline", file: "modules/m09-leads-pipeline.html",
      block1: "Filter Bars — user routing toggles, deal stage filters",
      block2: "Ranking Cards — conversion channel, pipeline value, intake speed, win rate",
      block3: "Kanban Board Layouts — swimlanes from initial contact to deposit verification",
      engines: ["Kanban Board", "Kanban Group Heading", "Kanban Card"], canvas: "5-lane pipeline board" },

    m10: { n: 10, title: "Bookings & Calendar", file: "modules/m10-bookings-calendar.html",
      block1: "Title Bars — view style switches (day / week / month / team grid)",
      block2: "Status Badges — consultations today, surveys booked, installs due, no-shows",
      block3: "Calendar Views — multi-disciplinary scheduling grid",
      engines: ["Calendar View", "Status Badge", "Event Chip"], canvas: "Week grid + agenda rail" },

    m11: { n: 11, title: "Clients & CRM Accounts", file: "modules/m11-clients-crm.html",
      block1: "Filter Bars — master directory search, account type filters",
      block2: "KPI Cards — active clients, lifetime value, retention, referral index",
      block3: "User & Contact Tables — accounts linked to materials, signatures, projects",
      engines: ["Contact Table", "Avatar Stack", "Badge"], canvas: "Directory matrix" },

    m12: { n: 12, title: "Product Catalog & Stock", file: "modules/m12-product-catalog.html",
      block1: "Title Bars — inventory classification (hardwoods / softwoods / finishes / fasteners)",
      block2: "Progress Cards — board-foot volume, reorder alerts, warehouse usage, SKU count",
      block3: "Product Tables — dimensions, timber source, cost model, location identifiers",
      engines: ["Product Table", "Progress Card", "Meter Column"], canvas: "Stock ledger + bin rail" },

    m13: { n: 13, title: "Smart Document Builder", file: "modules/m13-document-builder.html",
      block1: "Title Bars — template processing, bulk item generation switches",
      block2: "Utility Links — queued drafts, blueprint verification, tax formulas, token budget",
      block3: "Advanced Forms + Composer — blueprint variables into commercial worksheets",
      engines: ["Advanced Form", "Option Picker", "Switch", "Composer"], canvas: "12-column form + live sheet" },

    m14: { n: 14, title: "Material & Finish Schedules", file: "modules/m14-material-schedules.html",
      block1: "Title Bars — workshop cutting list and timber preparation export parameters",
      block2: "List Groups — net lumber, waste allowance, finishing time, schedule value",
      block3: "Content Tables — panel lengths, surface processing styles, delivery codes",
      engines: ["Content Table", "List Group", "Export Bar"], canvas: "Quantified schedule" },

    m15: { n: 15, title: "Financial Accounts & Income", file: "modules/m15-financial-accounts.html",
      block1: "Filter Bars — fiscal month dropdown, account balancing tools",
      block2: "Progress Cards — revenue realization, overdue balances, collection rate, margin",
      block3: "Order & Billing Tables — ledger of statuses, due schedules, incoming balances",
      engines: ["Billing Table", "Progress Card", "Bar Chart"], canvas: "Accounting ledger" },

    m16: { n: 16, title: "Purchase Orders", file: "modules/m16-purchase-orders.html",
      block1: "Title Bars — supplier tracking, authorisation statuses",
      block2: "KPI Cards — capital committed, supplier lead time, open material requests",
      block3: "Order & Billing Tables — vendor contracts tied to blueprint requirements",
      engines: ["Order Table", "KPI Cards", "Stepper"], canvas: "PO register" },

    m17: { n: 17, title: "Regulatory & Compliance Docs", file: "modules/m17-regulatory-docs.html",
      block1: "Title Bars — regulatory portal search (zoning boards, municipal offices)",
      block2: "Status Badges — permits issued, environmental rating, safety clearances",
      block3: "File Views — documents grouped by authority, expiry, operational criteria",
      engines: ["File Views", "List Group", "Status Badge"], canvas: "Authority file cabinet" },

    m18: { n: 18, title: "Inbox & Messaging Hub", file: "modules/m18-inbox-hub.html",
      block1: "Workspace Headers — channel filters (email, in-app, feedback)",
      block2: "Status Badges — unread, average wait, resolution velocity, CSAT",
      block3: "Inbox Layouts + Threads — queries linked to their design files",
      engines: ["Inbox Layout", "Thread List", "File Chip"], canvas: "Thread list / reader / files" },

    m19: { n: 19, title: "WhatsApp & Telegram Integrations", file: "modules/m19-messaging-integrations.html",
      block1: "Title Bars — API route toggles, delivery status trackers",
      block2: "Progress Cards — request volume, auto-response rate, delivery rate, templates",
      block3: "Chat Workspace Layouts — mobile message strings with quick template buttons",
      engines: ["Chat Workspace", "Message Bubbles", "Template Buttons"], canvas: "Channel columns + console" },

    m20: { n: 20, title: "AI Architectural Assistant", file: "modules/m20-ai-assistant.html",
      block1: "Title Bars — prompt selector, analysis model configuration",
      block2: "Utility Links — code scans, deviation alerts, token usage, latency",
      block3: "AI Chat Layouts + Bubbles — timber code compliance and structural queries",
      engines: ["AI Chat Layout", "AI Bubbles", "Citation Chips"], canvas: "Prompt dock + transcript" },

    m21: { n: 21, title: "Knowledge Base Vault", file: "modules/m21-knowledge-base.html",
      block1: "Title Bars — global search for wood properties and installation manuals",
      block2: "Description Lists — material profiles, hardware data, article counts",
      block3: "List Groups — species profiles, load tables, installation instructions",
      engines: ["List Group", "Search Bar", "Reading Pane"], canvas: "Index + article reader" },

    m22: { n: 22, title: "Client Portal Engine", file: "modules/m22-client-portal.html",
      block1: "Workspace Headers — customer view options, account level flags",
      block2: "Progress Cards — funding ratio, drawing approvals, milestone progress",
      block3: "Form Pages & Settings — review renderings, sign off quotes, submit payments",
      engines: ["Form Pages", "Progress Card", "Option Picker"], canvas: "Portal dashboard + sign-off" },

    m23: { n: 23, title: "Portal Content & Media", file: "modules/m23-portal-media.html",
      block1: "Title Bars — compression options, gallery display parameters",
      block2: "Utility Links — storage capacity, shared links, asset count, variants",
      block3: "Gallery Sliders + Upload Forms — workshop progress shots and renderings",
      engines: ["Gallery Grid", "Upload Form", "Utility Links"], canvas: "Media grid + upload" },

    m24: { n: 24, title: "System Configurations", file: "modules/m24-system-configurations.html",
      block1: "Title Bars — global application variables, regional location parameters",
      block2: "Badge Styles — plugins, unit system, base currency, region",
      block3: "Option Pickers + Switches — tax rules, structural margins, API links",
      engines: ["Option Picker", "Switch", "Settings Grid"], canvas: "Configuration matrix" },

    m25: { n: 25, title: "Users & Access Roles", file: "modules/m25-users-roles.html",
      block1: "Title Bars — role filters (architect / accountant / fabricator)",
      block2: "KPI Cards — seat allocation, online operators, permission alerts",
      block3: "User & Contact Tables — access ledger from rights to named roles",
      engines: ["Contact Table", "Role Matrix", "KPI Cards"], canvas: "Access ledger" },

    m26: { n: 26, title: "Database & System Logs", file: "modules/m26-database-logs.html",
      block1: "Title Bars — lookup indices, server transaction filters",
      block2: "Progress Cards — cluster load, uptime, query profile, error rate",
      block3: "Admin Utility Tables — chronological ledger of modifications and traces",
      engines: ["Admin Utility Table", "Trace Drawer", "Progress Card"], canvas: "Transaction ledger" }
  }
};
