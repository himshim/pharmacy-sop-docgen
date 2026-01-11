const preview = document.getElementById("preview");
const deptSelect = document.getElementById("departmentSelect");
const sopSelect = document.getElementById("sopSelect");

let TEMPLATE = "";

/* ==================================
   LOAD SOP TEMPLATE (ONCE)
================================== */
fetch("templates/sop-a4.html")
  .then(res => res.text())
  .then(html => {
    TEMPLATE = html;
    console.log("SOP template loaded");
  })
  .catch(err => console.error("Template load error", err));

/* ==================================
   LOAD DEPARTMENTS LIST
================================== */
fetch("data/departments.json")
  .then(res => res.json())
  .then(data => {
    data.departments.forEach(dept => {
      const opt = document.createElement("option");
      opt.value = dept.key;
      opt.textContent = dept.name;
      deptSelect.appendChild(opt);
    });
  })
  .catch(err => {
    console.error(err);
    alert("Failed to load departments");
  });

/* ==================================
   DEPARTMENT CHANGE → LOAD SOP INDEX
================================== */
deptSelect.addEventListener("change", async () => {
  const dept = deptSelect.value;

  sopSelect.innerHTML = '<option value="">Select SOP</option>';
  sopSelect.disabled = true;
  preview.innerHTML = "";

  if (!dept) return;

  try {
    const index = await fetch(`data/${dept}/index.json`).then(r => r.json());

    index.instruments.forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.key;
      opt.textContent = item.name;
      sopSelect.appendChild(opt);
    });

    sopSelect.disabled = false;
  } catch (e) {
    console.error(e);
    alert("Failed to load SOP list");
  }
});

/* ==================================
   SOP CHANGE → LOAD SOP JSON
================================== */
sopSelect.addEventListener("change", async () => {
  const sopKey = sopSelect.value;
  const dept = deptSelect.value;

  if (!sopKey || !dept) return;

  try {
    const raw = await fetch(`data/${dept}/${sopKey}.json`).then(r => r.json());
    renderSOP(raw, dept);
  } catch (e) {
    console.error(e);
    alert("Failed to load SOP");
  }
});

/* ==================================
   RENDER SOP (OLD JSON FORMAT)
================================== */
function renderSOP(raw, deptName) {
  if (!TEMPLATE) return;

  let html = TEMPLATE;

  const title = raw.meta?.title || "";
  const sections = raw.sections || {};

  html = html.replace("{{institute}}", "____________________________");
  html = html.replace("{{department}}", deptName);
  html = html.replace("{{title}}", title);
  html = html.replace("{{sopNumber}}", "________________");

  html = html.replace("{{purpose}}", sections.purpose || "");
  html = html.replace("{{scope}}", sections.scope || "");

  html = html.replace(
    "{{procedure}}",
    Array.isArray(sections.procedure)
      ? sections.procedure.map(step => `<li>${step}</li>`).join("")
      : ""
  );

  html = html.replace("{{precautions}}", sections.precautions || "");

  preview.innerHTML = html;
}