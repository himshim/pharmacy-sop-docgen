const preview = document.getElementById("preview");
const deptSelect = document.getElementById("departmentSelect");
const sopSelect = document.getElementById("sopSelect");

/* INPUT FIELDS */
const instituteInput = document.getElementById("instituteInput");
const departmentInput = document.getElementById("departmentInput");
const titleInput = document.getElementById("titleInput");
const sopNumberInput = document.getElementById("sopNumberInput");
const purposeInput = document.getElementById("purposeInput");
const scopeInput = document.getElementById("scopeInput");
const procedureInput = document.getElementById("procedureInput");
const precautionsInput = document.getElementById("precautionsInput");

let TEMPLATE = "";
let currentSOP = null;

/* ===============================
   LOAD TEMPLATE
================================ */
fetch("templates/sop-a4.html")
  .then(res => res.text())
  .then(html => {
    TEMPLATE = html;
    console.log("Template loaded");
  });

/* ===============================
   LOAD DEPARTMENTS
================================ */
fetch("data/departments.json")
  .then(res => res.json())
  .then(data => {
    data.departments.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.key;
      opt.textContent = d.name;
      deptSelect.appendChild(opt);
    });
  });

/* ===============================
   DEPARTMENT CHANGE
================================ */
deptSelect.addEventListener("change", async () => {
  const dept = deptSelect.value;

  sopSelect.innerHTML = '<option value="">Select SOP</option>';
  sopSelect.disabled = true;
  preview.innerHTML = "";
  clearInputs();

  if (!dept) return;

  const index = await fetch(`data/${dept}/index.json`).then(r => r.json());

  index.instruments.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item.key;
    opt.textContent = item.name;
    sopSelect.appendChild(opt);
  });

  sopSelect.disabled = false;
});

/* ===============================
   SOP CHANGE
================================ */
sopSelect.addEventListener("change", async () => {
  const sopKey = sopSelect.value;
  const dept = deptSelect.value;

  if (!sopKey || !dept) return;

  const raw = await fetch(`data/${dept}/${sopKey}.json`).then(r => r.json());

  /* BUILD STATE FROM JSON (OLD FORMAT SAFE) */
  currentSOP = {
    institute: raw.meta?.institute || "",
    department: dept,
    title: raw.meta?.title || "",
    sopNumber: raw.meta?.sopNumber || "",
    purpose: raw.sections?.purpose || "",
    scope: raw.sections?.scope || "",
    procedure: Array.isArray(raw.sections?.procedure)
      ? raw.sections.procedure
      : [],
    precautions: raw.sections?.precautions || ""
  };

  populateInputs();
  renderSOP();
});

/* ===============================
   INPUT → STATE → PREVIEW
================================ */
[
  instituteInput,
  departmentInput,
  titleInput,
  sopNumberInput,
  purposeInput,
  scopeInput,
  procedureInput,
  precautionsInput
].forEach(input => {
  input.addEventListener("input", () => {
    if (!currentSOP) return;

    currentSOP.institute = instituteInput.value;
    currentSOP.department = departmentInput.value;
    currentSOP.title = titleInput.value;
    currentSOP.sopNumber = sopNumberInput.value;
    currentSOP.purpose = purposeInput.value;
    currentSOP.scope = scopeInput.value;
    currentSOP.procedure = procedureInput.value
      .split("\n")
      .map(v => v.trim())
      .filter(Boolean);
    currentSOP.precautions = precautionsInput.value;

    renderSOP();
  });
});

/* ===============================
   POPULATE INPUTS FROM STATE
================================ */
function populateInputs() {
  instituteInput.value = currentSOP.institute;
  departmentInput.value = currentSOP.department;
  titleInput.value = currentSOP.title;
  sopNumberInput.value = currentSOP.sopNumber;
  purposeInput.value = currentSOP.purpose;
  scopeInput.value = currentSOP.scope;
  procedureInput.value = currentSOP.procedure.join("\n");
  precautionsInput.value = currentSOP.precautions;
}

/* ===============================
   CLEAR INPUTS
================================ */
function clearInputs() {
  instituteInput.value = "";
  departmentInput.value = "";
  titleInput.value = "";
  sopNumberInput.value = "";
  purposeInput.value = "";
  scopeInput.value = "";
  procedureInput.value = "";
  precautionsInput.value = "";
}

/* ===============================
   RENDER SOP
================================ */
function renderSOP() {
  if (!TEMPLATE || !currentSOP) return;

  let html = TEMPLATE;

  html = html.replace("{{institute}}", currentSOP.institute || "________________");
  html = html.replace("{{department}}", currentSOP.department || "");
  html = html.replace("{{title}}", currentSOP.title || "");
  html = html.replace("{{sopNumber}}", currentSOP.sopNumber || "");

  html = html.replace("{{purpose}}", currentSOP.purpose || "");
  html = html.replace("{{scope}}", currentSOP.scope || "");

  html = html.replace(
    "{{procedure}}",
    currentSOP.procedure.map(step => `<li>${step}</li>`).join("")
  );

  html = html.replace("{{precautions}}", currentSOP.precautions || "");

  preview.innerHTML = html;
}