"use strict";

/* =========================
   CORE ELEMENTS
========================= */
const preview = document.getElementById("preview");

const departmentSelect = document.getElementById("departmentSelect");
const sopSelect = document.getElementById("sopSelect");
const templateSelect = document.getElementById("templateSelect");

/* =========================
   TOGGLES
========================= */
const toggles = {
  docControl: document.getElementById("toggleDocControl"),
  applicability: document.getElementById("toggleApplicability"),
  abbreviations: document.getElementById("toggleAbbreviations"),
  references: document.getElementById("toggleReferences"),
  annexures: document.getElementById("toggleAnnexures"),
  changeHistory: document.getElementById("toggleChangeHistory"),

  sopNumber: document.getElementById("toggleSopNumber"),
  effectiveDate: document.getElementById("toggleEffectiveDate"),
  revisionDate: document.getElementById("toggleRevisionDate"),
  copyType: document.getElementById("toggleCopyType"),
};

/* =========================
   SECTION CONTAINERS
========================= */
const sectionDocControl = document.getElementById("sectionDocControl");
const sectionApplicability = document.getElementById("sectionApplicability");
const sectionAbbreviations = document.getElementById("sectionAbbreviations");
const sectionReferences = document.getElementById("sectionReferences");
const sectionAnnexures = document.getElementById("sectionAnnexures");
const sectionChangeHistory = document.getElementById("sectionChangeHistory");

/* =========================
   INPUT ELEMENTS
========================= */
const inputs = {
  institute: document.getElementById("institute"),
  department: document.getElementById("department"),
  title: document.getElementById("title"),
  sopNumber: document.getElementById("sopNumber"),

  revisionNo: document.getElementById("revisionNo"),
  effectiveDate: document.getElementById("effectiveDate"),
  revisionDate: document.getElementById("revisionDate"),
  nextReviewDate: document.getElementById("nextReviewDate"),
  copyType: document.getElementById("copyType"),

  purpose: document.getElementById("purpose"),
  scope: document.getElementById("scope"),
  responsibility: document.getElementById("responsibility"),
  procedure: document.getElementById("procedure"),
  precautions: document.getElementById("precautions"),

  applicability: document.getElementById("applicability"),
  abbreviations: document.getElementById("abbreviations"),
  references: document.getElementById("references"),
  annexures: document.getElementById("annexures"),

  changeHistoryInput: document.getElementById("changeHistoryInput"),

  preparedBy: document.getElementById("preparedBy"),
  preparedDesig: document.getElementById("preparedDesig"),
  preparedDate: document.getElementById("preparedDate"),

  checkedBy: document.getElementById("checkedBy"),
  checkedDesig: document.getElementById("checkedDesig"),
  checkedDate: document.getElementById("checkedDate"),

  approvedBy: document.getElementById("approvedBy"),
  approvedDesig: document.getElementById("approvedDesig"),
  approvedDate: document.getElementById("approvedDate"),
};

/* =========================
   STATE
========================= */
let TEMPLATE_HTML = "";
let SOP_DATA = {};

/* =========================
   LOAD DEPARTMENTS
========================= */
fetch("data/departments.json")
  .then(r => r.json())
  .then(d => {
    departmentSelect.innerHTML = `<option value="">Select</option>`;
    d.departments.forEach(dep => {
      departmentSelect.innerHTML +=
        `<option value="${dep.key}">${dep.name}</option>`;
    });
  });

/* =========================
   DEPARTMENT CHANGE
========================= */
departmentSelect.addEventListener("change", async () => {
  sopSelect.disabled = true;
  sopSelect.innerHTML = `<option>Select SOP</option>`;
  preview.innerHTML = "";

  const dept = departmentSelect.value;
  if (!dept) return;

  const index = await fetch(`data/${dept}/index.json`).then(r => r.json());
  index.instruments.forEach(sop => {
    sopSelect.innerHTML +=
      `<option value="${sop.key}">${sop.name}</option>`;
  });

  sopSelect.disabled = false;
});

/* =========================
   SOP CHANGE
========================= */
sopSelect.addEventListener("change", async () => {
  const dept = departmentSelect.value;
  const sop = sopSelect.value;
  if (!dept || !sop) return;

  const raw = await fetch(`data/${dept}/${sop}.json`).then(r => r.json());

  SOP_DATA = {
    institute: "",
    department: dept,
    title: raw.meta?.title || "",
    sopNumber: "",

    revisionNo: "00",
    effectiveDate: "",
    revisionDate: "",
    nextReviewDate: "",
    copyType: "CONTROLLED",

    sectionsEnabled: {
      docControl: true,
      applicability: false,
      abbreviations: false,
      references: false,
      annexures: false,
      changeHistory: false,
    },

    fieldsEnabled: {
      sopNumber: true,
      effectiveDate: true,
      revisionDate: true,
      copyType: true,
    },

    changeHistory: [],

    purpose: raw.sections?.purpose || "",
    scope: raw.sections?.scope || "",
    responsibility:
      "Laboratory In-charge, faculty members, technical staff, and authorized users are responsible for implementation and compliance of this SOP.",

    procedure: raw.sections?.procedure || [],
    precautions: raw.sections?.precautions || "",

    applicability: "",
    abbreviations: "",
    references: "",
    annexures: "",

    preparedBy: "",
    preparedDesig: "",
    preparedDate: "",
    checkedBy: "",
    checkedDesig: "",
    checkedDate: "",
    approvedBy: "",
    approvedDesig: "",
    approvedDate: "",
  };

  syncInputs();
  updateSectionVisibility();
  loadTemplate();
});

/* =========================
   TEMPLATE
========================= */
templateSelect.addEventListener("change", loadTemplate);

async function loadTemplate() {
  TEMPLATE_HTML = await fetch(`templates/${templateSelect.value}`).then(r => r.text());
  render();
}

/* =========================
   SECTION TOGGLES
========================= */
["docControl", "applicability", "abbreviations", "references", "annexures", "changeHistory"]
  .forEach(k => {
    toggles[k].addEventListener("change", () => {
      SOP_DATA.sectionsEnabled[k] = toggles[k].checked;
      updateSectionVisibility();
      render();
    });
  });

/* =========================
   FIELD TOGGLES
========================= */
toggles.sopNumber.addEventListener("change", () => {
  SOP_DATA.fieldsEnabled.sopNumber = toggles.sopNumber.checked;
  render();
});

toggles.effectiveDate.addEventListener("change", () => {
  SOP_DATA.fieldsEnabled.effectiveDate = toggles.effectiveDate.checked;
  render();
});

toggles.revisionDate.addEventListener("change", () => {
  SOP_DATA.fieldsEnabled.revisionDate = toggles.revisionDate.checked;
  render();
});

toggles.copyType.addEventListener("change", () => {
  SOP_DATA.fieldsEnabled.copyType = toggles.copyType.checked;
  render();
});

/* =========================
   SECTION VISIBILITY
========================= */
function updateSectionVisibility() {
  sectionDocControl.style.display = SOP_DATA.sectionsEnabled.docControl ? "block" : "none";
  sectionApplicability.style.display = SOP_DATA.sectionsEnabled.applicability ? "block" : "none";
  sectionAbbreviations.style.display = SOP_DATA.sectionsEnabled.abbreviations ? "block" : "none";
  sectionReferences.style.display = SOP_DATA.sectionsEnabled.references ? "block" : "none";
  sectionAnnexures.style.display = SOP_DATA.sectionsEnabled.annexures ? "block" : "none";
  sectionChangeHistory.style.display = SOP_DATA.sectionsEnabled.changeHistory ? "block" : "none";
}

/* =========================
   INPUT HANDLING
========================= */
Object.keys(inputs).forEach(k => {
  inputs[k].addEventListener("input", () => {
    if (k === "procedure") {
      SOP_DATA.procedure = inputs[k].value.split("\n").filter(Boolean);
    } else if (k === "changeHistoryInput") {
      SOP_DATA.changeHistory = inputs[k].value.split("\n").filter(Boolean);
    } else {
      SOP_DATA[k] = inputs[k].value;
    }
    render();
  });
});

/* =========================
   SYNC INPUTS
========================= */
function syncInputs() {
  Object.keys(inputs).forEach(k => {
    if (k === "procedure") {
      inputs[k].value = SOP_DATA.procedure.join("\n");
    } else if (k === "changeHistoryInput") {
      inputs[k].value = SOP_DATA.changeHistory.join("\n");
    } else {
      inputs[k].value = SOP_DATA[k] || "";
    }
  });
}

/* =========================
   RENDER
========================= */
function render() {
  if (!TEMPLATE_HTML) return;

  const changeHistoryHTML = SOP_DATA.changeHistory
    .map(row => {
      const p = row.split("|");
      return `<tr><td>${p[0] || ""}</td><td>${p[1] || ""}</td><td>${p[2] || ""}</td></tr>`;
    })
    .join("");

  const viewData = {
    institute: SOP_DATA.institute,
    department: SOP_DATA.department,
    title: SOP_DATA.title,

    sopNumber: SOP_DATA.fieldsEnabled.sopNumber ? SOP_DATA.sopNumber : "",
    effectiveDate: SOP_DATA.fieldsEnabled.effectiveDate ? SOP_DATA.effectiveDate : "",
    revisionDate: SOP_DATA.fieldsEnabled.revisionDate ? SOP_DATA.revisionDate : "",
    copyType: SOP_DATA.fieldsEnabled.copyType ? SOP_DATA.copyType : "",

    responsibility: SOP_DATA.responsibility,
    purpose: SOP_DATA.purpose,
    scope: SOP_DATA.scope,
    precautions: SOP_DATA.precautions,

    procedure: SOP_DATA.procedure.map(s => `<li>${s}</li>`).join(""),

    applicability: SOP_DATA.sectionsEnabled.applicability ? SOP_DATA.applicability : "",
    abbreviations: SOP_DATA.sectionsEnabled.abbreviations ? SOP_DATA.abbreviations.replace(/\n/g, "<br>") : "",
    references: SOP_DATA.sectionsEnabled.references ? SOP_DATA.references.replace(/\n/g, "<br>") : "",
    annexures: SOP_DATA.sectionsEnabled.annexures ? SOP_DATA.annexures.replace(/\n/g, "<br>") : "",

    changeHistory: SOP_DATA.sectionsEnabled.changeHistory ? changeHistoryHTML : "",

    preparedBy: SOP_DATA.preparedBy,
    preparedDesig: SOP_DATA.preparedDesig,
    preparedDate: SOP_DATA.preparedDate,

    checkedBy: SOP_DATA.checkedBy,
    checkedDesig: SOP_DATA.checkedDesig,
    checkedDate: SOP_DATA.checkedDate,

    approvedBy: SOP_DATA.approvedBy,
    approvedDesig: SOP_DATA.approvedDesig,
    approvedDate: SOP_DATA.approvedDate,
  };

  preview.innerHTML = renderTemplate(TEMPLATE_HTML, viewData);
}
