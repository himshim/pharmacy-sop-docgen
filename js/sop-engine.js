const preview = document.getElementById("preview");
const deptSelect = document.getElementById("departmentSelect");
const sopSelect = document.getElementById("sopSelect");

let TEMPLATE = "";

// Load SOP template once
fetch("templates/sop-a4.html")
  .then(res => res.text())
  .then(html => TEMPLATE = html);

// Department change → load SOP index
deptSelect.addEventListener("change", async () => {
  const dept = deptSelect.value;
  sopSelect.innerHTML = '<option value="">Select SOP</option>';
  sopSelect.disabled = true;

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

// SOP change → load SOP JSON
sopSelect.addEventListener("change", async () => {
  const sopKey = sopSelect.value;
  const dept = deptSelect.value;
  if (!sopKey || !dept) return;

  try {
    const data = await fetch(`data/${dept}/${sopKey}.json`).then(r => r.json());
    renderSOP(data);
  } catch (e) {
    console.error(e);
    alert("Failed to load SOP");
  }
});

// Render SOP
function renderSOP(data) {
  let html = TEMPLATE;

  html = html.replace("{{institute}}", data.institute || "");
  html = html.replace("{{department}}", data.department || "");
  html = html.replace("{{title}}", data.title || "");
  html = html.replace("{{sopNumber}}", data.sopNumber || "");
  html = html.replace("{{purpose}}", data.purpose || "");
  html = html.replace("{{scope}}", data.scope || "");
  html = html.replace(
    "{{procedure}}",
    (data.procedure || []).map(step => `<li>${step}</li>`).join("")
  );
  html = html.replace("{{precautions}}", data.precautions || "");

  preview.innerHTML = html;
}