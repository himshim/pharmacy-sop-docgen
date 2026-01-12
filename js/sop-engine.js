/**
 * SOP GENERATOR ENGINE v2.0
 * Professional SOP Document Generator with html2pdf.js Integration
 * Handles data loading, template rendering, and PDF generation
 */

window.initSOPApp = function () {
    'use strict';
    console.log('🚀 Initializing SOP App v2.0...');

    /* ==================== DOM HELPERS ==================== */
    const $ = (id) => document.getElementById(id);

    const fetchJSON = (url) => fetch(`${url}?v=${Date.now()}`)
        .then((r) => {
            if (!r.ok) throw new Error(`Failed to fetch: ${url}`);
            return r.json();
        });

    const fetchText = (url) => fetch(`${url}?v=${Date.now()}`)
        .then((r) => {
            if (!r.ok) throw new Error(`Failed to fetch: ${url}`);
            return r.text();
        });

    /* ==================== CORE ELEMENTS ==================== */
    const departmentSelect = $("departmentSelect");
    const sopSelect = $("sopSelect");
    const templateSelect = $("templateSelect");
    const preview = $("preview") || $("preview-content");

    if (!departmentSelect || !sopSelect || !templateSelect) {
        console.warn("⚠️ SOP engine: Required UI elements not found");
        return;
    }

    console.log('✅ Core UI elements initialized');

    /* ==================== TOGGLE REFERENCES ==================== */
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

    /* ==================== INPUT REFERENCES ==================== */
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

    /* ==================== STATE ==================== */
    let TEMPLATE_HTML = "";
    let SOP_DATA = null;

    /* ==================== LOAD DEPARTMENTS ==================== */
    console.log('📁 Loading departments...');
    fetchJSON("../data/departments.json")
        .then((data) => {
            departmentSelect.innerHTML = '<option value="">Choose department...</option>';
            data.departments.forEach((dept) => {
                departmentSelect.innerHTML += `<option value="${dept.id}">${dept.name}</option>`;
            });
            console.log(`✅ Loaded ${data.departments.length} departments`);
        })
        .catch((e) => {
            console.error("❌ Failed to load departments:", e);
            departmentSelect.innerHTML = '<option value="">Error loading departments</option>';
        });

    /* ==================== DEPARTMENT CHANGE HANDLER ==================== */
    departmentSelect.addEventListener("change", async () => {
        sopSelect.innerHTML = '<option value="">Choose SOP...</option>';
        sopSelect.disabled = true;
        if (preview) preview.innerHTML = "";

        const dept = departmentSelect.value;
        if (!dept) return;

        console.log(`🔍 Loading SOPs for: ${dept}`);

        try {
            const index = await fetchJSON(`../data/${dept}/index.json`);
            index.instruments.forEach((sop) => {
                sopSelect.innerHTML += `<option value="${sop.id}">${sop.name}</option>`;
            });
            sopSelect.disabled = false;
            console.log(`✅ Loaded ${index.instruments.length} SOPs for ${dept}`);
        } catch (e) {
            console.error("❌ Failed to load SOPs:", e);
            sopSelect.innerHTML = '<option value="">Error loading SOPs</option>';
        }
    });

    /* ==================== SOP CHANGE HANDLER ==================== */
    sopSelect.addEventListener("change", async () => {
        const dept = departmentSelect.value;
        const sop = sopSelect.value;
        if (!dept || !sop) return;

        console.log(`📄 Loading SOP data: ${dept}/${sop}`);

        try {
            const raw = await fetchJSON(`../data/${dept}/${sop}.json`);

            // Initialize SOP_DATA with proper structure
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

            console.log('✅ SOP data loaded:', SOP_DATA);

            syncInputs();
            updateSectionVisibility();
            await loadTemplate();

        } catch (e) {
            console.error("❌ Failed to load SOP:", e);
            if (preview) {
                preview.innerHTML = `
                    <div style="padding:40px;text-align:center;color:#721c24;background:#f8d7da;border:1px solid #f5c6cb;border-radius:8px;margin:20px;">
                        <h2>❌ Error Loading SOP</h2>
                        <p>${e.message}</p>
                        <p>Please try selecting a different SOP.</p>
                    </div>
                `;
            }
        }
    });

    /* ==================== LOAD TEMPLATE ==================== */
    async function loadTemplate() {
        const template = templateSelect.value;
        if (!template) return;

        console.log(`📋 Loading template: ${template}`);

        try {
            TEMPLATE_HTML = await fetchText(`../templates/${template}.html`);
            console.log('✅ Template loaded');
            renderPreview();
        } catch (e) {
            console.error("❌ Failed to load template:", e);
            if (preview) {
                preview.innerHTML = `<div style="padding:20px;color:red;">Error loading template: ${e.message}</div>`;
            }
        }
    }

    templateSelect.addEventListener("change", loadTemplate);

    /* ==================== RENDER PREVIEW ==================== */
    function renderPreview() {
        if (!TEMPLATE_HTML || !SOP_DATA) {
            console.warn('⚠️ Cannot render: Missing template or data');
            return;
        }

        let html = TEMPLATE_HTML;

        // Replace simple placeholders
        Object.keys(SOP_DATA).forEach((key) => {
            const value = SOP_DATA[key];
            if (typeof value === 'string') {
                html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
            }
        });

        // Handle procedure array - convert to HTML list items
        if (Array.isArray(SOP_DATA.procedure)) {
            const procedureHTML = SOP_DATA.procedure
                .map(step => `<li>${step}</li>`)
                .join('');
            html = html.replace(/{{procedure}}/g, procedureHTML);
        }

        // Remove any remaining placeholders
        html = html.replace(/{{.*?}}/g, '');

        if (preview) {
            preview.innerHTML = html;
            console.log('✅ Preview rendered');
        }
    }

    /* ==================== SYNC INPUTS ==================== */
    function syncInputs() {
        if (!SOP_DATA) return;

        Object.keys(inputs).forEach((key) => {
            const input = inputs[key];
            if (input && SOP_DATA[key] !== undefined) {
                if (Array.isArray(SOP_DATA[key])) {
                    input.value = SOP_DATA[key].join('\n');
                } else {
                    input.value = SOP_DATA[key];
                }
            }
        });

        console.log('✅ Inputs synced with SOP data');
    }

    /* ==================== UPDATE SECTION VISIBILITY ==================== */
    function updateSectionVisibility() {
        if (!SOP_DATA) return;

        Object.keys(toggles).forEach((key) => {
            const toggle = toggles[key];
            if (toggle) {
                const isEnabled = SOP_DATA.sectionsEnabled?.[key] || SOP_DATA.fieldsEnabled?.[key];
                toggle.checked = isEnabled || false;
            }
        });

        updateToggleDisplay();
    }

    /* ==================== UPDATE TOGGLE DISPLAY ==================== */
    function updateToggleDisplay() {
        const sectionMap = {
            'toggleDocControl': 'sectionDocControl',
            'toggleApplicability': 'sectionApplicability',
            'toggleAbbreviations': 'sectionAbbreviations',
            'toggleReferences': 'sectionReferences',
            'toggleAnnexures': 'sectionAnnexures',
            'toggleChangeHistory': 'sectionChangeHistory'
        };

        Object.keys(sectionMap).forEach(toggleId => {
            const toggle = $(toggleId);
            const section = $(sectionMap[toggleId]);
            if (toggle && section) {
                section.style.display = toggle.checked ? 'block' : 'none';
            }
        });
    }

    /* ==================== INPUT CHANGE LISTENERS ==================== */
    Object.keys(inputs).forEach((key) => {
        const input = inputs[key];
        if (input) {
            input.addEventListener('input', () => {
                if (SOP_DATA) {
                    if (key === 'procedure') {
                        // Split textarea lines into array
                        SOP_DATA[key] = input.value.split('\n').filter(line => line.trim());
                    } else {
                        SOP_DATA[key] = input.value;
                    }
                    renderPreview();
                }
            });
        }
    });

    /* ==================== TOGGLE CHANGE LISTENERS ==================== */
    Object.keys(toggles).forEach((key) => {
        const toggle = toggles[key];
        if (toggle) {
            toggle.addEventListener('change', () => {
                if (SOP_DATA) {
                    if (SOP_DATA.sectionsEnabled) {
                        SOP_DATA.sectionsEnabled[key] = toggle.checked;
                    }
                    if (SOP_DATA.fieldsEnabled) {
                        SOP_DATA.fieldsEnabled[key] = toggle.checked;
                    }
                    updateToggleDisplay();
                    renderPreview();
                }
            });
        }
    });

    /* ==================== PDF GENERATION WITH html2pdf.js ==================== */
    function setupPrintButton() {
        const printBtn = $("print-btn");
        if (!printBtn) {
            console.warn('⚠️ Print button not found');
            return;
        }

        printBtn.addEventListener('click', function() {
            if (!preview || !preview.innerHTML.trim()) {
                alert('Please generate a document first by selecting department and SOP.');
                return;
            }

            if (typeof html2pdf === 'undefined') {
                console.error('❌ html2pdf.js not loaded!');
                alert('PDF library not loaded. Please refresh the page.');
                return;
            }

            const originalText = printBtn.innerHTML;
            printBtn.innerHTML = '⏳ Generating...';
            printBtn.disabled = true;

            const sopNum = inputs.sopNumber?.value || '001';
            const title = inputs.title?.value || 'SOP';
            const cleanTitle = title.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
            const date = new Date().toISOString().split('T')[0];
            const filename = `SOP_${sopNum}_${cleanTitle}_${date}.pdf`;

            const opt = {
                margin: [20, 20, 20, 20],
                filename: filename,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2,
                    useCORS: true,
                    letterRendering: true,
                    logging: false
                },
                jsPDF: { 
                    unit: 'mm', 
                    format: 'a4', 
                    orientation: 'portrait',
                    compress: true
                },
                pagebreak: { 
                    mode: ['avoid-all', 'css', 'legacy']
                }
            };

            html2pdf()
                .set(opt)
                .from(preview)
                .save()
                .then(function() {
                    printBtn.innerHTML = originalText;
                    printBtn.disabled = false;
                    console.log('✅ PDF generated:', filename);
                })
                .catch(function(error) {
                    console.error('❌ PDF generation error:', error);
                    alert('Error generating PDF. Please try again.');
                    printBtn.innerHTML = originalText;
                    printBtn.disabled = false;
                });
        });

        console.log('✅ PDF button initialized');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupPrintButton);
    } else {
        setupPrintButton();
    }

    console.log('✅ SOP App fully initialized');
};

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initSOPApp);
} else {
    window.initSOPApp();
}