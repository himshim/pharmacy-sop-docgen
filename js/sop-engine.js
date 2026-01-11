const preview = document.getElementById("preview");
const deptSelect = document.getElementById("departmentSelect");
const sopSelect = document.getElementById("sopSelect");

/* INPUTS */
const instituteInput = document.getElementById("instituteInput");
const departmentInput = document.getElementById("departmentInput");
const titleInput = document.getElementById("titleInput");
const sopNumberInput = document.getElementById("sopNumberInput");
const purposeInput = document.getElementById("purposeInput");
const scopeInput = document.getElementById("scopeInput");
const procedureInput = document.getElementById("procedureInput");
const precautionsInput = document.getElementById("precautionsInput");

let TEMPLATE = "";
let currentSOP = {};

/* ===============================
   LOAD TEMPLATE
================================ */
fetch("templates/sop-a4.html")
  .then(res => res.text())
  .then(html => TEMPLATE = html);

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

  currentSOP = {
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
  renderSOP();
});

/* ===============================
   INPUT → STATE → PREVIEW
================================ */
function syncInputs() {
  instituteInput.value = currentSOP.institute;
  departmentInput.value = currentSOP.department;
  titleInput.value = currentSOP.title;
  sopNumberInput.value = currentSOP.sopNumber;
  purposeInput.value = currentSOP.purpose;
  scopeInput.value = currentSOP.scope;
  procedureInput.value = currentSOP.procedure.join("\n");
  precautionsInput.value = currentSOP.precautions;
}

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
    currentSOP = {
      ...currentSOP,
      institute: instituteInput.value,
      department: departmentInput.value,
      title: titleInput.value,
      sopNumber: sopNumberInput.value,
      purpose: purposeInput.value,
      scope: scopeInput.value,
      procedure: procedureInput.value.split("\n").filter(Boolean),
      precautions: precautionsInput.value
    };
    renderSOP();
  });
});

/* ===============================
   RENDER SOP
================================ */
function renderSOP() {
  if (!TEMPLATE) return;

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