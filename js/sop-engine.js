window.initSOPApp = function () {
    'use strict';

    console.log('🚀 Initializing SOP App v2.0...');

    /* ========================= CONSTANTS ========================= */
    const DEFAULT_RESPONSIBILITY = "Laboratory In-charge, faculty members, technical staff, and authorized users are responsible for implementation and compliance of this SOP.";
    const DEFAULT_REVISION = "00";
    const DEFAULT_COPY_TYPE = "CONTROLLED";

    /* ========================= SAFE DOM HELPERS ========================= */
    const $ = (id) => document.getElementById(id);

    const fetchJSON = (url) =>
        fetch(`${url}?v=${Date.now()}`)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
                return r.json();
            });

    const fetchText = (url) =>
        fetch(`${url}?v=${Date.now()}`)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
                return r.text();
            });

    /* ========================= FIND PREVIEW ELEMENT ========================= */
    const preview = $("preview") || 
                    $("preview-content") || 
                    document.querySelector('.preview-content') ||
                    document.querySelector('[id*="preview"]');

    if (!preview) {
        console.error("❌ CRITICAL: Preview element not found!");
        console.error("Expected: <div id='preview'> or class='preview-content'");
        return;
    }

    console.log(`✅ Preview element found: ${preview.id || preview.className}`);

    /* ========================= CORE ELEMENTS ========================= */
    const departmentSelect = $("departmentSelect");
    const sopSelect = $("sopSelect");
    const templateSelect = $("templateSelect");

    if (!departmentSelect || !sopSelect || !templateSelect) {
        console.warn("⚠️ SOP engine aborted: Core UI elements not ready");
        console.warn("Missing:", {
            departmentSelect: !!departmentSelect,
            sopSelect: !!sopSelect,
            templateSelect: !!templateSelect
        });
        return;
    }

    console.log('✅ Core form elements found');

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

    /* ========================= INPUT VALIDATION ========================= */
    function validateDate(dateString) {
        if (!dateString) return true; // Optional field
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    }

    function validateNumber(numString) {
        if (!numString) return true; // Optional field
        return !isNaN(parseFloat(numString));
    }

    function sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /* ========================= LOADING STATE ========================= */
    function showLoading(element, message = 'Loading...') {
        if (element) {
            element.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <div style="font-size: 24px; margin-bottom: 12px;">⏳</div>
                    <div>${message}</div>
                </div>
            `;
        }
    }

    function showError(element, message, details = '') {
        if (element) {
            element.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc3545;">
                    <div style="font-size: 32px; margin-bottom: 16px;">⚠️</div>
                    <h3 style="margin-bottom: 12px;">${message}</h3>
                    ${details ? `<p style="color: #666; font-size: 14px;">${details}</p>` : ''}
                </div>
            `;
        }
    }

    /* ========================= LOAD DEPARTMENTS ========================= */
    showLoading(preview, 'Loading departments...');

    fetchJSON("data/departments.json")
        .then((d) => {
            if (!d || !d.departments || !Array.isArray(d.departments)) {
                throw new Error('Invalid departments data format');
            }

            departmentSelect.innerHTML = `<option value="">-- Select Department --</option>`;

            d.departments.forEach((dep) => {
                if (dep.folder && dep.name) {
                    departmentSelect.innerHTML += `<option value="${dep.folder}">${dep.name}</option>`;
                }
            });

            console.log(`✅ Loaded ${d.departments.length} departments`);

            preview.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 20px;">📂</div>
                    <h3 style="margin-bottom: 12px; color: #333;">Welcome to SOP Generator</h3>
                    <p>Select a department and SOP to begin creating your document</p>
                </div>
            `;
        })
        .catch((e) => {
            console.error("❌ Failed to load departments:", e);
            departmentSelect.innerHTML = `<option value="">Error loading departments</option>`;
            showError(preview, 'Failed to Load Departments', e.message);
        });

    /* ========================= DEPARTMENT CHANGE ========================= */
    departmentSelect.addEventListener("change", async () => {
        sopSelect.innerHTML = `<option value="">-- Select SOP --</option>`;
        sopSelect.disabled = true;
        preview.innerHTML = "";

        const dept = departmentSelect.value;
        if (!dept) {
            preview.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 20px;">📂</div>
                    <p>Select a department to continue</p>
                </div>
            `;
            return;
        }

        console.log(`📁 Loading SOPs for department: ${dept}`);
        showLoading(preview, 'Loading SOPs...');

        try {
            const index = await fetchJSON(`data/${dept}/index.json`);

            if (!index || !index.instruments || !Array.isArray(index.instruments)) {
                throw new Error('Invalid SOP index format');
            }

            if (index.instruments.length === 0) {
                throw new Error('No SOPs found in this department');
            }

            index.instruments.forEach((sop) => {
                if (sop.file && sop.name) {
                    sopSelect.innerHTML += `<option value="${sop.file}">${sop.name}</option>`;
                }
            });

            sopSelect.disabled = false;
            console.log(`✅ Loaded ${index.instruments.length} SOPs`);

            preview.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 20px;">📄</div>
                    <p>Select an SOP to preview</p>
                </div>
            `;
        } catch (e) {
            console.error("❌ Failed to load SOPs:", e);
            sopSelect.innerHTML = `<option value="">Error loading SOPs</option>`;
            showError(preview, 'Failed to Load SOPs', e.message);
        }
    });

    /* ========================= SOP CHANGE ========================= */
    sopSelect.addEventListener("change", async () => {
        const dept = departmentSelect.value;
        const sop = sopSelect.value;

        if (!dept || !sop) return;

        console.log(`📄 Loading SOP: ${sop}`);
        showLoading(preview, 'Loading SOP data...');

        try {
            const raw = await fetchJSON(`data/${dept}/${sop}.json`);

            if (!raw || !raw.meta) {
                throw new Error('Invalid SOP data format - missing meta information');
            }

            SOP_DATA = {
                institute: "",
                department: dept,
                title: raw.meta?.title || "",
                sopNumber: "",
                revisionNo: DEFAULT_REVISION,
                effectiveDate: "",
                revisionDate: "",
                nextReviewDate: "",
                copyType: DEFAULT_COPY_TYPE,
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
                responsibility: DEFAULT_RESPONSIBILITY,
                procedure: Array.isArray(raw.sections?.procedure) ? raw.sections.procedure : [],
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

            console.log('✅ SOP data loaded and rendered successfully');
        } catch (e) {
            console.error("❌ Failed to load SOP:", e);
            showError(preview, 'Failed to Load SOP', e.message);
            SOP_DATA = null;
        }
    });

    /* ========================= TEMPLATE LOADING ========================= */
    templateSelect.addEventListener("change", loadTemplate);

    async function loadTemplate() {
        if (!SOP_DATA) {
            console.warn('⚠️ No SOP data available');
            return;
        }

        const templateFile = templateSelect.value;
        console.log(`📋 Loading template: ${templateFile}`);
        showLoading(preview, 'Loading template...');

        try {
            TEMPLATE_HTML = await fetchText(`templates/${templateFile}`);

            if (!TEMPLATE_HTML || TEMPLATE_HTML.length < 100) {
                throw new Error('Template file appears to be empty or corrupted');
            }

            render();
            console.log(`✅ Template loaded: ${templateFile} (${TEMPLATE_HTML.length} bytes)`);
        } catch (e) {
            console.error("❌ Failed to load template:", e);
            showError(preview, 'Failed to Load Template', e.message);
        }
    }

    /* ========================= TOGGLES HANDLING ========================= */
    Object.keys(toggles).forEach((k) => {
        if (!toggles[k]) return;

        toggles[k].addEventListener("change", () => {
            if (!SOP_DATA) return;

            if (SOP_DATA.sectionsEnabled?.[k] !== undefined) {
                SOP_DATA.sectionsEnabled[k] = toggles[k].checked;
                updateSectionVisibility();
                console.log(`🔘 Section toggle: ${k} = ${toggles[k].checked}`);
            }

            if (SOP_DATA.fieldsEnabled?.[k] !== undefined) {
                SOP_DATA.fieldsEnabled[k] = toggles[k].checked;
                console.log(`🔘 Field toggle: ${k} = ${toggles[k].checked}`);
            }

            render();
        });
    });

    function updateSectionVisibility() {
        const sectionMap = {
            docControl: "sectionDocControl",
            applicability: "sectionApplicability",
            abbreviations: "sectionAbbreviations",
            references: "sectionReferences",
            annexures: "sectionAnnexures",
            changeHistory: "sectionChangeHistory",
        };

        Object.keys(sectionMap).forEach((key) => {
            const element = $(sectionMap[key]);
            if (element && SOP_DATA) {
                element.style.display = SOP_DATA.sectionsEnabled[key] ? "block" : "none";
            }
        });
    }

    /* ========================= INPUTS HANDLING ========================= */
    Object.keys(inputs).forEach((k) => {
        if (!inputs[k]) return;

        inputs[k].addEventListener("input", () => {
            if (!SOP_DATA) return;

            // Validate date inputs
            if (k.includes('Date') && inputs[k].value) {
                if (!validateDate(inputs[k].value)) {
                    inputs[k].setCustomValidity('Invalid date format');
                    return;
                } else {
                    inputs[k].setCustomValidity('');
                }
            }

            // Handle special fields
            if (k === "procedure") {
                SOP_DATA.procedure = inputs[k].value
                    .split("\n")
                    .map(line => line.trim())
                    .filter(Boolean);
            } else if (k === "changeHistoryInput") {
                SOP_DATA.changeHistory = inputs[k].value
                    .split("\n")
                    .map(line => line.trim())
                    .filter(Boolean);
            } else {
                SOP_DATA[k] = inputs[k].value;
            }

            render();
        });
    });

    /* ========================= SYNC INPUTS ========================= */
    function syncInputs() {
        if (!SOP_DATA) return;

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
            console.warn('⚠️ Render skipped: missing template, preview, or data');
            return;
        }

        try {
            // Build change history table
            const changeHistoryHTML = SOP_DATA.changeHistory
                .map((row) => {
                    const parts = row.split("|").map(p => sanitizeHTML(p.trim()));
                    return `<tr>
                        <td>${parts[0] || ""}</td>
                        <td>${parts[1] || ""}</td>
                        <td>${parts[2] || ""}</td>
                        <td>${parts[3] || ""}</td>
                    </tr>`;
                })
                .join("");

            // Build procedure list
            const procedureHTML = SOP_DATA.procedure
                .map((step) => `<li>${sanitizeHTML(step)}</li>`)
                .join("");

            // Replace template variables
            let html = TEMPLATE_HTML;

            Object.keys(SOP_DATA).forEach((key) => {
                const value = SOP_DATA[key];

                if (key === "procedure") {
                    html = html.replace(/{{procedure}}/g, procedureHTML);
                } else if (key === "changeHistory") {
                    html = html.replace(/{{changeHistory}}/g, changeHistoryHTML);
                } else if (typeof value === "string") {
                    const regex = new RegExp(`{{${key}}}`, "g");
                    html = html.replace(regex, sanitizeHTML(value));
                } else if (typeof value === "number") {
                    const regex = new RegExp(`{{${key}}}`, "g");
                    html = html.replace(regex, value);
                }
            });

            // Clean up any remaining template variables
            html = html.replace(/{{[^}]+}}/g, "");

            preview.innerHTML = html;
            console.log('✅ Preview rendered successfully');
        } catch (e) {
            console.error('❌ Render error:', e);
            showError(preview, 'Rendering Error', e.message);
        }
    }

    console.log('✅ SOP App initialized successfully');
};