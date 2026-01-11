window.initSOPApp = function () {
    'use strict';

    console.log('ðŸš€ Initializing SOP App...');

    /* ========================= SAFE DOM HELPERS ========================= */
    const $ = (id) => document.getElementById(id);

    const fetchJSON = (url) =>
        fetch(`${url}?v=${Date.now()}`)
            .then((r) => {
                if (!r.ok) throw new Error(`Fetch failed: ${url}`);
                return r.json();
            });

    const fetchText = (url) =>
        fetch(`${url}?v=${Date.now()}`)
            .then((r) => {
                if (!r.ok) throw new Error(`Fetch failed: ${url}`);
                return r.text();
            });

    /* ========================= CORE ELEMENTS ========================= */
    // FIX: Try multiple selectors for preview element
    const preview = $("preview") || 
                    $("preview-content") || 
                    document.querySelector('.preview-content') ||
                    document.querySelector('[class*="preview"]');

    const departmentSelect = $("departmentSelect");
    const sopSelect = $("sopSelect");
    const templateSelect = $("templateSelect");

    if (!departmentSelect || !sopSelect || !templateSelect) {
        console.warn("âš ï¸ SOP engine aborted: UI not ready");
        return;
    }

    if (!preview) {
        console.error("âŒ Preview element not found! Check HTML for id='preview' or class='preview-content'");
        return;
    }

    console.log('âœ… Core elements found');
    console.log('ðŸ“º Preview element:', preview.id || preview.className);

    /* ========================= TOGGLES ========================= */
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

    /* ========================= INPUTS ========================= */
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

    /* ========================= STATE ========================= */
    let TEMPLATE_HTML = "";
    let SOP_DATA = null;

    /* ========================= LOAD DEPARTMENTS ========================= */
    fetchJSON("data/departments.json")
        .then((d) => {
            departmentSelect.innerHTML = `<option value="">-- Select Department --</option>`;
            d.departments.forEach((dep) => {
                departmentSelect.innerHTML += `<option value="${dep.folder}">${dep.name}</option>`;
            });
            console.log(`âœ… Loaded ${d.departments.length} departments`);
        })
        .catch((e) => {
            console.error("âŒ Failed to load departments:", e);
            departmentSelect.innerHTML = `<option value="">Error loading departments</option>`;
        });

    /* ========================= DEPARTMENT CHANGE ========================= */
    departmentSelect.addEventListener("change", async () => {
        sopSelect.innerHTML = `<option value="">-- Select SOP --</option>`;
        sopSelect.disabled = true;
        if (preview) preview.innerHTML = "";

        const dept = departmentSelect.value;
        if (!dept) return;

        console.log(`ðŸ“ Loading SOPs for department: ${dept}`);

        try {
            const index = await fetchJSON(`data/${dept}/index.json`);
            index.instruments.forEach((sop) => {
                sopSelect.innerHTML += `<option value="${sop.file}">${sop.name}</option>`;
            });
            sopSelect.disabled = false;
            console.log(`âœ… Loaded ${index.instruments.length} SOPs`);
        } catch (e) {
            console.error("âŒ Failed to load SOPs:", e);
            sopSelect.innerHTML = `<option value="">Error loading SOPs</option>`;
        }
    });

    /* ========================= SOP CHANGE ========================= */
    sopSelect.addEventListener("change", async () => {
        const dept = departmentSelect.value;
        const sop = sopSelect.value;
        if (!dept || !sop) return;

        console.log(`ðŸ“„ Loading SOP: ${sop}`);

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
                responsibility: "Laboratory In-charge, faculty members, technical staff, and authorized users are responsible for implementation and compliance of this SOP.",
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
            console.log('âœ… SOP data loaded successfully');
        } catch (e) {
            console.error("âŒ Failed to load SOP:", e);
            if (preview) {
                preview.innerHTML = `<div style="padding:20px;color:red;text-align:center;">
                    <h3>âš ï¸ Error Loading SOP</h3>
                    <p>${e.message}</p>
                    <p>Please try selecting a different SOP or refresh the page.</p>
                </div>`;
            }
        }
    });

    /* ========================= TEMPLATE ========================= */
    templateSelect.addEventListener("change", loadTemplate);

    async function loadTemplate() {
        try {
            TEMPLATE_HTML = await fetchText(`templates/${templateSelect.value}`);
            render();
            console.log(`âœ… Template loaded: ${templateSelect.value}`);
        } catch (e) {
            console.error("âŒ Failed to load template:", e);
            if (preview) {
                preview.innerHTML = `<div style="padding:20px;color:red;text-align:center;">
                    <h3>âš ï¸ Error Loading Template</h3>
                    <p>${e.message}</p>
                </div>`;
            }
        }
    }

    /* ========================= TOGGLES ========================= */
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
            if (el) el.style.display = SOP_DATA.sectionsEnabled[k] ? "block" : "none";
        });
    }

    /* ========================= INPUTS ========================= */
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

    /* ========================= SYNC INPUTS ========================= */
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

    /* ========================= RENDER ========================= */
    function render() {
        if (!TEMPLATE_HTML || !preview || !SOP_DATA) {
            console.warn('âš ï¸ Render skipped: missing template, preview, or data');
            return;
        }

        const changeHistoryHTML = SOP_DATA.changeHistory
            .map((r) => {
                const p = r.split("|");
                return `<tr><td>${p[0] || ""}</td><td>${p[1] || ""}</td><td>${p[2] || ""}</td><td>${p[3] || ""}</td></tr>`;
            })
            .join("");

        const procedureHTML = SOP_DATA.procedure
            .map((step) => `<li>${step}</li>`)
            .join("");

        let html = TEMPLATE_HTML;

        Object.keys(SOP_DATA).forEach((k) => {
            if (k === "procedure") {
                html = html.replace(/{{procedure}}/g, procedureHTML);
            } else if (k === "changeHistory") {
                html = html.replace(/{{changeHistory}}/g, changeHistoryHTML);
            } else if (typeof SOP_DATA[k] === "object") {
                // Skip objects
            } else {
                const regex = new RegExp(`{{${k}}}`, "g");
                html = html.replace(regex, SOP_DATA[k] || "");
            }
        });

        preview.innerHTML = html;
        console.log('âœ… Preview rendered successfully');
    }

    console.log('âœ… SOP App initialized successfully');
};