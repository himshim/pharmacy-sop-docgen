const deptSelect = document.getElementById("departmentSelect");
const sopSelect = document.getElementById("sopSelect");
const preview = document.getElementById("preview");

let SOP_TEMPLATE = "";

// Load SOP HTML template
fetch("templates/sop-a4.html")
  .then(r => r.text())
  .then(html => SOP_TEMPLATE = html);

// Load departments
fetch("data/pharmaceutics/index.json")
  .then(r => r.json())
  .then(data => {
    data.instruments.forEach(i => {
      const opt = document.createElement("option");
      opt.value = i.key;
      opt.textContent = i.name;
      deptSelect.appendChild(opt);
    });
  });

// Department change
deptSelect.addEventListener("change", async () => {
  sopSelect.innerHTML = '<option value="">Select SOP</option>';
  sopSelect.disabled = true;

  const dept = deptSelect.value;
  if (!dept) return;

  const index = await fetch(`data/${dept}/index.json`).then(r => r.json());

  index.instruments.forEach(sop => {
    const opt = document.createElement("option");
    opt.value = sop.key;
    opt.textContent = sop.name;
    sopSelect.appendChild(opt);
  });

  sopSelect.disabled = false;
});

// SOP change
sopSelect.addEventListener("change", async () => {
  const sopKey = sopSelect.value;
  if (!sopKey) return;

  const data = await fetch(`data/pharmaceutics/${sopKey}.json`).then(r => r.json());
  renderSOP(data);
});

function renderSOP(data) {
  let html = SOP_TEMPLATE;

  html = html.replace("{{title}}", data.title);
  html = html.replace("{{purpose}}", data.purpose);
  html = html.replace("{{scope}}", data.scope);
  html = html.replace(
    "{{procedure}}",
    data.procedure.map(p => `<li>${p}</li>`).join("")
  );
  html = html.replace("{{precautions}}", data.precautions);
  html = html.replace("{{department}}", data.department);
  html = html.replace("{{sopNumber}}", data.sopNumber);

  preview.innerHTML = html;
}

function printSOP() {
  window.print();
}