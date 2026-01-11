const preview = document.getElementById("preview");

let TEMPLATE = "";

// Load template once
fetch("templates/sop-a4.html")
  .then(res => res.text())
  .then(html => {
    TEMPLATE = html;
    console.log("SOP template loaded");
  })
  .catch(err => console.error("Template load failed", err));

// TEST DATA
function renderTestSOP() {
  const data = {
    institute: "K C Institute of Pharmaceutical Sciences",
    department: "Pharmaceutics",
    title: "Operation of HPLC System",
    sopNumber: "SOP/PH/001",
    purpose: "To describe the procedure for operating the HPLC system.",
    scope: "Applicable to all trained laboratory personnel.",
    procedure: [
      "Switch ON the main power supply.",
      "Allow the system to equilibrate.",
      "Set method parameters as per protocol.",
      "Inject sample and record chromatogram."
    ],
    precautions: "Ensure proper grounding. Do not touch electrical parts with wet hands."
  };

  renderSOP(data);
}

function renderSOP(data) {
  let html = TEMPLATE;

  html = html.replace("{{institute}}", data.institute);
  html = html.replace("{{department}}", data.department);
  html = html.replace("{{title}}", data.title);
  html = html.replace("{{sopNumber}}", data.sopNumber);
  html = html.replace("{{purpose}}", data.purpose);
  html = html.replace("{{scope}}", data.scope);
  html = html.replace(
    "{{procedure}}",
    data.procedure.map(step => `<li>${step}</li>`).join("")
  );
  html = html.replace("{{precautions}}", data.precautions);

  preview.innerHTML = html;
}