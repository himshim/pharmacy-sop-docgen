window.initSOPApp = function () {
    'use strict';

    console.log('🚀 Initializing SOP App v2.0.2 (REAL FIX)...');

    /* ========================= CONSTANTS ========================= */
    const DEFAULT_RESPONSIBILITY = "Laboratory In-charge, faculty members, technical staff, and authorized users are responsible for implementation and compliance of this SOP.";
    const DEFAULT_REVISION = "00";
    const DEFAULT_COPY_TYPE = "CONTROLLED";

    /* ========================= SAFE DOM HELPERS ========================= */
    const $ = (id) => {
        const el = document.getElementById(id);
        if (!el) {
            console.warn(`⚠️  Element #${id} not found`);
        }
        return el;
    };

    const fetchJSON = (url) => {
        console.log(`📥 Fetching: ${url}`);
        return fetch(`${url}?v=${Date.now()}`)
            .then((r) => {
                console.log(`📡 Response for ${url}: ${r.status} ${r.statusText}`);
                if (!r.ok) throw new Error(`HTTP ${r.status}: ${url}`);
                return r.json();
            })
            .then((data) => {
                console.log(`✅ Loaded data from ${url}:`, data);
                return data;
            });
    };

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
        alert("⚠️ Preview element not found. UI may not be loaded correctly.");
        return;
    }

    console.log(`✅ Preview element found: #${preview.id || preview.className}`);

    /* ========================= CORE ELEMENTS ========================= */
    const departmentSelect = $("departmentSelect");
    const sopSelect = $("sopSelect");
    const templateSelect = $("templateSelect");

    if (!departmentSelect || !sopSelect || !templateSelect) {
        console.error("❌ CRITICAL: Core UI elements missing!");
        console.error("Found:", {
            departmentSelect: !!departmentSelect,
            sopSelect: !!sopSelect,
            templateSelect: !!templateSelect
        });

        // Retry after delay
        console.log("🔄 Retrying initialization in 500ms...");
        setTimeout(() => {
            console.log("🔄 Second attempt to initialize...");
            window.initSOPApp();
        }, 500);
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
        if (!dateString) return true;
        const date = new Date(dateString);
        return !isNaN(date.getTime());
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
    console.log('📂 Loading departments...');
    showLoading(preview, 'Loading departments...');

    fetchJSON("data/departments.json")
        .then((d) => {
            console.log('📊 Departments data received:', d);

            if (!d || !d.departments || !Array.isArray(d.departments)) {
                throw new Error('Invalid departments data format. Expected: {departments: [...]}');
            }

            departmentSelect.innerHTML = `<option value="">-- Select Department --</option>`;

            let addedCount = 0;
            d.departments.forEach((dep) => {
                // ⭐ REAL FIX: Accept both 'folder' AND 'key' properties
                const folderValue = dep.folder || dep.key;
                const nameValue = dep.name;

                if (folderValue && nameValue) {
                    const option = document.createElement('option');
                    option.value = folderValue;
                    option.textContent = nameValue;
                    departmentSelect.appendChild(option);
                    addedCount++;
                    console.log(`  ✓ Added department: ${nameValue} (${folderValue})`);
                } else {
                    console.warn(`  ⚠️  Skipped invalid department:`, dep);
                    console.warn(`     Missing: ${!folderValue ? 'folder/key' : ''} ${!nameValue ? 'name' : ''}`);
                }
            });

            if (addedCount === 0) {
                throw new Error('No valid departments found. Each department needs "folder" (or "key") and "name" properties.');
            }

            console.log(`✅ Loaded ${addedCount} departments successfully`);

            preview.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 20px;">📂</div>
                    <h3 style="margin-bottom: 12px; color: #333;">Welcome to SOP Generator</h3>
                    <p>Select a department from the dropdown to begin</p>
                    <p style="font-size: 12px; color: #999; margin-top: 16px;">${addedCount} departments available</p>
                </div>
            `;
        })
        .catch((e) => {
            console.error("❌ Failed to load departments:", e);
            console.error("Error details:", e.message);
            console.error("Check if data/departments.json exists and is valid JSON");

            departmentSelect.innerHTML = `<option value="">❌ Error loading departments</option>`;
            showError(preview, 'Failed to Load Departments', 
                `${e.message}<br><br>Check console (F12) for details`);
        });

    /* ========================= DEPARTMENT CHANGE ========================= */
    console.log('🔗 Attaching department change listener...');

    departmentSelect.addEventListener("change", async function() {
        const dept = this.value;

        console.log(`📁 Department selected: "${dept}"`);

        sopSelect.innerHTML = `<option value="">-- Select SOP --</option>`;
        sopSelect.disabled = true;
        preview.innerHTML = "";

        if (!dept) {
            console.log('  ℹ️  Empty selection, showing welcome message');
            preview.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 20px;">📂</div>
                    <p>Select a department to continue</p>
                </div>
            `;
            return;
        }

        const indexPath = `data/${dept}/index.json`;
        console.log(`📥 Loading SOPs from: ${indexPath}`);
        showLoading(preview, 'Loading SOPs...');

        try {
            const index = await fetchJSON(indexPath);
            console.log('📊 SOP index received:', index);

            // Check for different possible property names
            let sopList = null;
            if (index.instruments && Array.isArray(index.instruments)) {
                sopList = index.instruments;
                console.log('  ✓ Found SOPs in "instruments" property');
            } else if (index.sops && Array.isArray(index.sops)) {
                sopList = index.sops;
                console.log('  ✓ Found SOPs in "sops" property');
            } else if (index.items && Array.isArray(index.items)) {
                sopList = index.items;
                console.log('  ✓ Found SOPs in "items" property');
            } else if (Array.isArray(index)) {
                sopList = index;
                console.log('  ✓ Index is directly an array');
            }

            if (!sopList || sopList.length === 0) {
                throw new Error(`No SOPs found in ${indexPath}. Expected array in "instruments", "sops", "items" property or direct array.`);
            }

            let addedSopCount = 0;
            sopList.forEach((sop) => {
                if (sop.file && sop.name) {
                    const option = document.createElement('option');
                    option.value = sop.file;
                    option.textContent = sop.name;
                    sopSelect.appendChild(option);
                    addedSopCount++;
                    console.log(`  ✓ Added SOP: ${sop.name} (${sop.file})`);
                } else {
                    console.warn(`  ⚠️  Skipped invalid SOP:`, sop);
                }
            });

            if (addedSopCount === 0) {
                throw new Error('No valid SOPs found. Each SOP needs "file" and "name" properties.');
            }

            sopSelect.disabled = false;
            console.log(`✅ Loaded ${addedSopCount} SOPs successfully`);

            preview.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 20px;">📄</div>
                    <p style="font-size: 18px; margin-bottom: 8px;">Select an SOP to preview</p>
                    <p style="font-size: 12px; color: #999;">${addedSopCount} SOPs available in ${dept}</p>
                </div>
            `;
        } catch (e) {
            console.error(`❌ Failed to load SOPs from ${indexPath}:`, e);
            console.error("Error details:", e.message);

            sopSelect.innerHTML = `<option value="">❌ Error loading SOPs</option>`;
            showError(preview, 'Failed to Load SOPs', 
                `${e.message}<br><br>Department: ${dept}<br>Path: ${indexPath}<br><br>Check console (F12) for details`);
        }
    });

    console.log('✅ Department change listener attached');

    /* ========================= SOP CHANGE ========================= */
    console.log('🔗 Attaching SOP change listener...');

    sopSelect.addEventListener("change", async function() {
        const dept = departmentSelect.value;
        const sop = this.value;

        console.log(`📄 SOP selected: "${sop}" from department "${dept}"`);

        if (!dept || !sop) {
            console.log('  ℹ️  Incomplete selection');
            return;
        }

        const sopPath = `data/${dept}/${sop}.json`;
        console.log(`📥 Loading SOP data from: ${sopPath}`);
        showLoading(preview, 'Loading SOP data...');

        try {
            const raw = await fetchJSON(sopPath);
            console.log('📊 SOP data received:', raw);

            if (!raw || !raw.meta) {
                throw new Error('Invalid SOP data format - missing "meta" property');
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

            console.log('✅ SOP_DATA created:', SOP_DATA);

            syncInputs();
            updateSectionVisibility();
            await loadTemplate();

            console.log('✅ SOP loaded and rendered successfully');
        } catch (e) {
            console.error(`❌ Failed to load SOP from ${sopPath}:`, e);
            console.error("Error details:", e.message);

            showError(preview, 'Failed to Load SOP', 
                `${e.message}<br><br>SOP: ${sop}<br>Path: ${sopPath}<br><br>Check console (F12) for details`);
            SOP_DATA = null;
        }
    });

    console.log('✅ SOP change listener attached');

    /* ========================= TEMPLATE LOADING ========================= */
    console.log('🔗 Attaching template change listener...');
    templateSelect.addEventListener("change", loadTemplate);

    async function loadTemplate() {
        if (!SOP_DATA) {
            console.warn('⚠️  No SOP data available for template');
            return;
        }

        const templateFile = templateSelect.value;
        const templatePath = `templates/${templateFile}`;
        console.log(`📋 Loading template: ${templatePath}`);
        showLoading(preview, 'Loading template...');

        try {
            TEMPLATE_HTML = await fetchText(templatePath);

            if (!TEMPLATE_HTML || TEMPLATE_HTML.length < 100) {
                throw new Error('Template file appears to be empty or corrupted');
            }

            render();
            console.log(`✅ Template loaded: ${templateFile} (${TEMPLATE_HTML.length} bytes)`);
        } catch (e) {
            console.error(`❌ Failed to load template from ${templatePath}:`, e);
            console.error("Error details:", e.message);

            showError(preview, 'Failed to Load Template', 
                `${e.message}<br><br>Template: ${templateFile}<br><br>Check console (F12) for details`);
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

            if (k.includes('Date') && inputs[k].value) {
                if (!validateDate(inputs[k].value)) {
                    inputs[k].setCustomValidity('Invalid date format');
                    return;
                } else {
                    inputs[k].setCustomValidity('');
                }
            }

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
            console.warn('⚠️  Render skipped: missing template, preview, or data');
            return;
        }

        try {
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

            const procedureHTML = SOP_DATA.procedure
                .map((step) => `<li>${sanitizeHTML(step)}</li>`)
                .join("");

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

            html = html.replace(/{{[^}]+}}/g, "");

            preview.innerHTML = html;
            console.log('✅ Preview rendered successfully');
        } catch (e) {
            console.error('❌ Render error:', e);
            showError(preview, 'Rendering Error', e.message);
        }
    }

    console.log('✅ SOP App v2.0.2 initialized successfully');
    console.log('📊 Status: Waiting for user to select department...');
};

// Make sure it's available globally
console.log('📦 sop-engine.js v2.0.2 loaded successfully');
console.log('🔧 FIX APPLIED: Now accepts both "folder" and "key" properties in departments.json');