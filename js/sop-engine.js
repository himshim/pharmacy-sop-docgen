const preview = document.getElementById("preview");

const departmentSelect = document.getElementById("departmentSelect");
const sopSelect = document.getElementById("sopSelect");
const templateSelect = document.getElementById("templateSelect");

const inputs = {
  institute: document.getElementById("institute"),
  department: document.getElementById("department"),
  title: document.getElementById("title"),
  sopNumber: document.getElementById("sopNumber"),
  purpose: document.getElementById("purpose"),
  scope: document.getElementById("scope"),
  procedure: document.getElementById("procedure"),
  precautions: document.getElementById("precautions")
};

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

  const index = await fetch(`data/${dept}/index.json`).then(r => r.json());

  index.instruments.forEach(sop => {
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

  const raw = await fetch(`data/${dept}/${sop}.json`).then(r => r.json());

  SOP_DATA = {
    institute: "",
    department: dept,
    title: raw.meta?.title || "",
    sopNumber: "",
    purpose: raw.sections?.purpose || "",
    scope: raw.sections?.scope || "",
    procedure: raw.sections?.procedure || [],
    precautions: raw.sections?.precautions || ""
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
  TEMPLATE_HTML = await fetch(`templates/${name}`).then(r => r.text());
  render();
}

/* =========================
   INPUT → STATE
========================= */
Object.keys(inputs).forEach(key => {
  inputs[key].addEventListener("input", () => {
    SOP_DATA[key] =
      key === "procedure"
        ? inputs[key].value.split("\n").filter(Boolean)
        : inputs[key].value;

    render();
  });
});

/* =========================
   SYNC INPUTS
========================= */
function syncInputs() {
  inputs.institute.value = SOP_DATA.institute;
  inputs.department.value = SOP_DATA.department;
  inputs.title.value = SOP_DATA.title;
  inputs.sopNumber.value = SOP_DATA.sopNumber;
  inputs.purpose.value = SOP_DATA.purpose;
  inputs.scope.value = SOP_DATA.scope;
  inputs.procedure.value = SOP_DATA.procedure.join("\n");
  inputs.precautions.value = SOP_DATA.precautions;
}

/* =========================
   RENDER
========================= */
function render() {
  if (!TEMPLATE_HTML) return;

  const viewData = {
    ...SOP_DATA,
    procedure: SOP_DATA.procedure.map(s => `<li>${s}</li>`).join("")
  };

  preview.innerHTML = renderTemplate(TEMPLATE_HTML, viewData);
}