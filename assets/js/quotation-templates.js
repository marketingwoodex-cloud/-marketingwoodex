/* Woodex quotation templates — default line items + terms per work type.
   Seeded from nabeel's old quotations (Platinum Ventures 2024, Pnc Solutions 2022,
   Ashifa Food 2022, H.A Steel Chains 2025, furniture BOQ 2017).
   Editable in the dashboard under Templates; every quotation built from a
   template stays fully customizable per client. */
(function () {
  var EXEC_TERMS = [
    "50% advance payment with work order.",
    "Payment will be charged on the actual dimension / size of area.",
    "Rates are valid for 15 days as per market rates.",
  ].join("\n");
  var DESIGN_TERMS = [
    "75% advance payment with work order.",
    "25% on approval of project.",
    "Above quote is exclusive of all applicable taxes.",
    "Advance is nonrefundable.",
  ].join("\n");

  window.WX_QUOT_TEMPLATES = [
    {
      name: "Civil Work",
      items: [
        { desc: "Dismantling / removal of existing windows, doors, walls, debris clearing", qty: 1, unit: "job", rate: 70000 },
        { desc: '4" brick wall, complete in all respects', qty: 1, unit: "sft", rate: 380 },
        { desc: "Plaster works", qty: 1, unit: "sft", rate: 70 },
        { desc: "Repairing of plaster works", qty: 1, unit: "job", rate: 18000 },
        { desc: "Floor tiles laying labour, complete in all respects", qty: 1, unit: "sft", rate: 80 },
        { desc: "Washroom tiles on walls and floor, labour as per discussion", qty: 1, unit: "sft", rate: 80 },
        { desc: "Repairing of complete plumbing works", qty: 1, unit: "job", rate: 18000 },
        { desc: "Sanitary fixtures installation labour (commod, vanity), best quality", qty: 1, unit: "job", rate: 24000 },
      ],
      terms: EXEC_TERMS,
    },
    {
      name: "Interior",
      items: [
        { desc: "POP false ceiling, providing and fixing complete in all respects", qty: 1, unit: "sft", rate: 130 },
        { desc: "Paint works, approved brand and color (ICI / Brighto)", qty: 1, unit: "sft", rate: 55 },
        { desc: "Glass partition with door", qty: 1, unit: "sft", rate: 950 },
        { desc: "Glass frosted", qty: 1, unit: "sft", rate: 120 },
        { desc: "Wooden partition 5ft height", qty: 1, unit: "sft", rate: 725 },
        { desc: "Wooden hanging beam for glass partition", qty: 1, unit: "sft", rate: 650 },
        { desc: "Branding vinyl", qty: 1, unit: "sft", rate: 150 },
      ],
      terms: EXEC_TERMS,
    },
    {
      name: "Fit-out",
      items: [
        { desc: "Electrical labour: complete electrical points, switches and COB lights", qty: 1, unit: "job", rate: 55000 },
        { desc: "HVAC pipe fixing with drain, as per instructions", qty: 1, unit: "rft", rate: 850 },
        { desc: "Split unit installation with M.S. bracket stand", qty: 1, unit: "nos", rate: 7500 },
        { desc: "Glass partition: fix panel door including sliding panel", qty: 1, unit: "job", rate: 35000 },
        { desc: "Flash door (3.5x7) including chokat with complete hardware", qty: 1, unit: "nos", rate: 30000 },
        { desc: "Aluminium window with 8mm glass", qty: 1, unit: "sft", rate: 1200 },
        { desc: "Workstation repairing with top change and powder coating paint", qty: 1, unit: "nos", rate: 9500 },
        { desc: "Meeting table 8 to 10 person", qty: 1, unit: "job", rate: 55000 },
      ],
      terms: EXEC_TERMS,
    },
    {
      name: "Renovation",
      items: [
        { desc: "Dismantling / removal works", qty: 1, unit: "job", rate: 70000 },
        { desc: "POP false ceiling, providing and fixing", qty: 1, unit: "sft", rate: 130 },
        { desc: "Paint works, approved brand and color", qty: 1, unit: "sft", rate: 55 },
        { desc: "Repairing of plaster works", qty: 1, unit: "job", rate: 18000 },
        { desc: "Floor tiles laying labour", qty: 1, unit: "sft", rate: 80 },
        { desc: "Electrical labour for complete points and lights", qty: 1, unit: "job", rate: 55000 },
      ],
      terms: EXEC_TERMS,
    },
    {
      name: "Architecture",
      items: [
        { desc: "Architectural design consultancy", qty: 1, unit: "sft", rate: 350 },
        { desc: "2D layouts and space planning", qty: 1, unit: "job", rate: 0 },
        { desc: "3D exterior and interior views", qty: 1, unit: "nos", rate: 25000 },
        { desc: "Complete working drawings set", qty: 1, unit: "job", rate: 0 },
      ],
      terms: DESIGN_TERMS,
    },
    {
      name: "3D Visualization",
      items: [
        { desc: "3D interior views (4K delivery), 2 revision rounds included", qty: 1, unit: "nos", rate: 25000 },
      ],
      terms: DESIGN_TERMS,
    },
    {
      name: "Furniture",
      items: [
        { desc: "Dining table", qty: 1, unit: "nos", rate: 10500 },
        { desc: "Dining chair", qty: 1, unit: "nos", rate: 10500 },
        { desc: "Sofa seat", qty: 1, unit: "nos", rate: 15500 },
        { desc: "Bar stool", qty: 1, unit: "nos", rate: 4500 },
        { desc: "Running table", qty: 1, unit: "rft", rate: 6500 },
      ],
      terms: [
        "50% advance payment with work order.",
        "Rates are exclusive of GST / PST.",
        "Delivery time as mutually agreed.",
      ].join("\n"),
    },
    {
      name: "Design Consultancy",
      items: [
        { desc: "Complete interior design consultancy: 2D layouts, 3D design, mood boards and detail drawings", qty: 1, unit: "sft", rate: 100 },
      ],
      terms: DESIGN_TERMS + "\nSite visits: 3 included; additional visits Rs 3,500 per visit.",
    },
  ];
})();
