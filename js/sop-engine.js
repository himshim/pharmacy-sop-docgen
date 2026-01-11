const preview = document.getElementById("preview");

const departmentSelect = document.getElementById("departmentSelect");
const sopSelect = document.getElementById("sopSelect");
const templateSelect = document.getElementById("templateSelect");

const inputs = {
  effectiveDate: document.getElementById("effectiveDate"),
  revisionDate: document.getElementById("revisionDate"),

  changeHistoryInput: document.getElementById("changeHistoryInput"),

  institute: document.getElementById("institute"),
  department: document.getElementById("department"),
  title: document.getElementById("title"),
  sopNumber: document.getElementById("sopNumber"),
  purpose: document.getElementById("purpose"),
  scope: document.getElementById("scope"),
  responsibility: document.getElementById("responsibility"),
  procedure: document.getElementById("procedure"),
  precautions: document.getElementById("precautions"),

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

let TEMPLATE_HTML = "";
let SOP_DATA = {};

/* =========================
   LOAD DEPARTMENTS
========================= */
fetch("data/departments.json")
  .then((r) => r.json())
  .then((d) => {
    departmentSelect.innerHTML = `<option value="">Select</option>`;
    d.departments.forEach((dep) => {
      departmentSelect.innerHTML += `<option value="${dep.key}">${dep.name}</option>`;
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

  const index = await fetch(`data/${dept}/index.json`).then((r) => r.json());

  index.instruments.forEach((sop) => {
    sopSelect.innerHTML += `<option value="${sop.key}">${sop.name}</option>`;
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

  const raw = await fetch(`data/${dept}/${sop}.json`).then((r) => r.json());

  SOP_DATA = {
    institute: "",
    department: dept,
    title: raw.meta?.title || "",
    sopNumber: "",

    changeHistory: [],

    revisionNo: "00",
    effectiveDate: "",
    revisionDate: "",
    nextReviewDate: "",

    changeHistory: [],

    purpose: raw.sections?.purpose || "",
    scope: raw.sections?.scope || "",
    responsibility:
      "Laboratory In-charge, faculty members, technical staff, and authorized users are responsible for implementation and compliance of this SOP.",

    procedure: raw.sections?.procedure || [],
    precautions: raw.sections?.precautions || "",

    preparedBy: "",
    preparedDesig: "",
    preparedDate: "",

    checkedBy: "",
    checkedDesig: "",
    checkedDate: "",

    approvedBy: "",
    approvedDesig: "",
    approvedDate: "",

    copyType: "CONTROLLED",
  };

  syncInputs();
  loadTemplate();
});

/* =========================
   TEMPLATE CHANGE
========================= */
templateSelect.addEventListener("change", loadTemplate);

async function loadTemplate() {
  const name = templateSelect.value;
  TEMPLATE_HTML = await fetch(`templates/${name}`).then((r) => r.text());
  render();
}

/* =========================
   INPUT → STATE
========================= */
Object.keys(inputs).forEach((key) => {
  inputs[key].addEventListener("input", () => {
    if (key === "procedure") {
      SOP_DATA.procedure = inputs[key].value
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean);
    } else if (key === "changeHistoryInput") {
      SOP_DATA.changeHistory = inputs[key].value
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean);
    } else {
      SOP_DATA[key] = inputs[key].value;
    }

    render();
  });
});

/* =========================
   SYNC INPUTS
========================= */
function syncInputs() {
  Object.keys(inputs).forEach((key) => {
    if (key === "procedure") {
      inputs[key].value = SOP_DATA[key].join("\n");
    } else {
      inputs[key].value = SOP_DATA[key] || "";
    }
    inputs.changeHistoryInput.value = SOP_DATA.changeHistory.join("\n");
  });
  inputs.responsibility.value = SOP_DATA.responsibility;
}

/* =========================
   RENDER
========================= */
function render() {
  if (!TEMPLATE_HTML) return;

  const changeHistoryHTML = SOP_DATA.changeHistory
    .map((row) => {
      const parts = row.split("|");
      return `<tr>
        <td>${parts[0]?.trim() || ""}</td>
        <td>${parts[1]?.trim() || ""}</td>
        <td>${parts[2]?.trim() || ""}</td>
      </tr>`;
    })
    .join("");

  const viewData = {
    institute: SOP_DATA.institute,
    department: SOP_DATA.department,
    title: SOP_DATA.title,
    sopNumber: SOP_DATA.sopNumber,

    revisionNo: SOP_DATA.revisionNo,
    effectiveDate: SOP_DATA.effectiveDate,
    revisionDate: SOP_DATA.revisionDate,
    nextReviewDate: SOP_DATA.nextReviewDate,

    purpose: SOP_DATA.purpose,
    scope: SOP_DATA.scope,
    precautions: SOP_DATA.precautions,

    responsibility: SOP_DATA.responsibility,

    procedure: SOP_DATA.procedure.map((s) => `<li>${s}</li>`).join(""),

    preparedBy: SOP_DATA.preparedBy,
    preparedDesig: SOP_DATA.preparedDesig,
    preparedDate: SOP_DATA.preparedDate,

    checkedBy: SOP_DATA.checkedBy,
    checkedDesig: SOP_DATA.checkedDesig,
    checkedDate: SOP_DATA.checkedDate,

    approvedBy: SOP_DATA.approvedBy,
    approvedDesig: SOP_DATA.approvedDesig,
    approvedDate: SOP_DATA.approvedDate,

    copyType: SOP_DATA.copyType, // ✅ EXPLICITLY PASSED
    changeHistory: changeHistoryHTML,
  };

  preview.innerHTML = renderTemplate(TEMPLATE_HTML, viewData);
}
