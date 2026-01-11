window.initSOPApp = function () {

  /* =========================
     SAFE DOM HELPERS
  ========================= */
  const $ = (id) => document.getElementById(id);
  const fetchJSON = (url) =>
    fetch(`${url}?v=${Date.now()}`).then((r) => {
      if (!r.ok) throw new Error(`Fetch failed: ${url}`);
      return r.json();
    });
  const fetchText = (url) =>
    fetch(`${url}?v=${Date.now()}`).then((r) => {
      if (!r.ok) throw new Error(`Fetch failed: ${url}`);
      return r.text();
    });

  /* =========================
     CORE ELEMENTS
  ========================= */
  const preview = $("preview");
  const departmentSelect = $("departmentSelect");
  const sopSelect = $("sopSelect");
  const templateSelect = $("templateSelect");

  if (!departmentSelect || !sopSelect || !templateSelect) {
    console.warn("SOP engine aborted: UI not ready");
    return;
  }

  /* =========================
     TOGGLES
  ========================= */
  const toggles = {
    docControl: $("toggleDocControl"),
    applicability: $("toggleApplicability"),
    abbreviations: $("toggleAbbreviations"),
    references: $("toggleReferences"),
    annexures: $("toggleAnnexures"),
    changeHistory: $("toggleChangeHistory"),

    sopNumber: $("toggleSopNumber"),
    effectiveDate: $("toggleEffectiveDate"),
    revisionDate: $("toggleRevisionDate"),
    copyType: $("toggleCopyType"),
  };

  /* =========================
     INPUTS
  ========================= */
  const inputs = {
    institute: $("institute"),
    department: $("department"),
    title: $("title"),
    sopNumber: $("sopNumber"),
    revisionNo: $("revisionNo"),
    effectiveDate: $("effectiveDate"),
    revisionDate: $("revisionDate"),
    nextReviewDate: $("nextReviewDate"),
    copyType: $("copyType"),

    purpose: $("purpose"),
    scope: $("scope"),
    responsibility: $("responsibility"),
    procedure: $("procedure"),
    precautions: $("precautions"),

    applicability: $("applicability"),
    abbreviations: $("abbreviations"),
    references: $("references"),
    annexures: $("annexures"),

    changeHistoryInput: $("changeHistoryInput"),

    preparedBy: $("preparedBy"),
    preparedDesig: $("preparedDesig"),
    preparedDate: $("preparedDate"),

    checkedBy: $("checkedBy"),
    checkedDesig: $("checkedDesig"),
    checkedDate: $("checkedDate"),

    approvedBy: $("approvedBy"),
    approvedDesig: $("approvedDesig"),
    approvedDate: $("approvedDate"),
  };

  /* =========================
     STATE
  ========================= */
  let TEMPLATE_HTML = "";
  let SOP_DATA = null;

  /* =========================
     LOAD DEPARTMENTS
  ========================= */
  fetchJSON("data/departments.json")
    .then((d) => {
      departmentSelect.innerHTML = `<option value="">Select</option>`;
      d.departments.forEach((dep) => {
        departmentSelect.innerHTML += `<option value="${dep.key}">${dep.name}</option>`;
      });
    })
    .catch(console.error);

  /* =========================
     DEPARTMENT CHANGE
  ========================= */
  departmentSelect.addEventListener("change", async () => {
    sopSelect.innerHTML = `<option value="">Select SOP</option>`;
    sopSelect.disabled = true;
    if (preview) preview.innerHTML = "";

    const dept = departmentSelect.value;
    if (!dept) return;

    try {
      const index = await fetchJSON(`data/${dept}/index.json`);
      index.instruments.forEach((sop) => {
        sopSelect.innerHTML += `<option value="${sop.key}">${sop.name}</option>`;
      });
      sopSelect.disabled = false;
    } catch (e) {
      console.error(e);
    }
  });

  /* =========================
     SOP CHANGE
  ========================= */
  sopSelect.addEventListener("change", async () => {
    const dept = departmentSelect.value;
    const sop = sopSelect.value;
    if (!dept || !sop) return;

    try {
      const raw = await fetchJSON(`data/${dept}/${sop}.json`);

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
      await loadTemplate();
    } catch (e) {
      console.error(e);
    }
  });

  /* =========================
     TEMPLATE
  ========================= */
  templateSelect.addEventListener("change", loadTemplate);

  async function loadTemplate() {
    TEMPLATE_HTML = await fetchText(`templates/${templateSelect.value}`);
    render();
  }

  /* =========================
     TOGGLES
  ========================= */
  Object.keys(toggles).forEach((k) => {
    if (!toggles[k]) return;
    toggles[k].addEventListener("change", () => {
      if (SOP_DATA?.sectionsEnabled?.[k] !== undefined) {
        SOP_DATA.sectionsEnabled[k] = toggles[k].checked;
        updateSectionVisibility();
      }
      if (SOP_DATA?.fieldsEnabled?.[k] !== undefined) {
        SOP_DATA.fieldsEnabled[k] = toggles[k].checked;
      }
      render();
    });
  });

  function updateSectionVisibility() {
    const map = {
      docControl: "sectionDocControl",
      applicability: "sectionApplicability",
      abbreviations: "sectionAbbreviations",
      references: "sectionReferences",
      annexures: "sectionAnnexures",
      changeHistory: "sectionChangeHistory",
    };

    Object.keys(map).forEach((k) => {
      const el = $(map[k]);
      if (el)
        el.style.display = SOP_DATA.sectionsEnabled[k] ? "block" : "none";
    });
  }

  /* =========================
     INPUTS
  ========================= */
  Object.keys(inputs).forEach((k) => {
    if (!inputs[k]) return;
    inputs[k].addEventListener("input", () => {
      if (!SOP_DATA) return;

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
    Object.keys(inputs).forEach((k) => {
      if (!inputs[k]) return;
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
    if (!TEMPLATE_HTML || !preview || !SOP_DATA) return;

    const changeHistoryHTML = SOP_DATA.changeHistory
      .map((r) => {
        const p = r.split("|");
        return `<tr><td>${p[0] || ""}</td><td>${p[1] || ""}</td><td>${p[2] || ""}</td></tr>`;
      })
      .join("");

    preview.innerHTML = renderTemplate(TEMPLATE_HTML, {
      ...SOP_DATA,
      sopNumber: SOP_DATA.fieldsEnabled.sopNumber ? SOP_DATA.sopNumber : "",
      effectiveDate: SOP_DATA.fieldsEnabled.effectiveDate ? SOP_DATA.effectiveDate : "",
      revisionDate: SOP_DATA.fieldsEnabled.revisionDate ? SOP_DATA.revisionDate : "",
      copyType: SOP_DATA.fieldsEnabled.copyType ? SOP_DATA.copyType : "",
      procedure: SOP_DATA.procedure.map((s) => `<li>${s}</li>`).join(""),
      changeHistory: SOP_DATA.sectionsEnabled.changeHistory ? changeHistoryHTML : "",
    });
  }
};
