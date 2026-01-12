window.initSOPApp = function () {
    'use strict';
    console.log('🚀 Initializing SOP App with html2pdf.js...');

    /* ========================= SAFE DOM HELPERS ========================= */
    const $ = (id) => document.getElementById(id);
    const fetchJSON = (url) => fetch(`${url}?v=${Date.now()}`)
        .then((r) => {
            if (!r.ok) throw new Error(`Fetch failed: ${url}`);
            return r.json();
        });
    const fetchText = (url) => fetch(`${url}?v=${Date.now()}`)
        .then((r) => {
            if (!r.ok) throw new Error(`Fetch failed: ${url}`);
            return r.text();
        });

    /* ========================= CORE ELEMENTS ========================= */
    const preview = $("preview") || $("preview-content") || 
                     document.querySelector('.preview-content') || 
                     document.querySelector('[class*="preview"]');
    const departmentSelect = $("departmentSelect");
    const sopSelect = $("sopSelect");
    const templateSelect = $("templateSelect");

    if (!departmentSelect || !sopSelect || !templateSelect) {
        console.warn("⚠️ SOP engine aborted: UI not ready");
        return;
    }

    if (!preview) {
        console.error("❌ Preview element not found! Check HTML for id='preview'");
        return;
    }

    console.log('✅ Core elements found');
    console.log('📺 Preview element:', preview.id || preview.className);

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
    fetchJSON("../data/departments.json")
        .then((d) => {
            departmentSelect.innerHTML = `<option value="">Select Department</option>`;
            d.departments.forEach((dep) => {
                departmentSelect.innerHTML += `<option value="${dep.id}">${dep.name}</option>`;
            });
            console.log(`✅ Loaded ${d.departments.length} departments`);
        })
        .catch((e) => {
            console.error("❌ Failed to load departments:", e);
            departmentSelect.innerHTML = `<option value="">Error loading departments</option>`;
        });

    /* ========================= DEPARTMENT CHANGE ========================= */
    departmentSelect.addEventListener("change", async () => {
        sopSelect.innerHTML = `<option value="">Select SOP</option>`;
        sopSelect.disabled = true;
        if (preview) preview.innerHTML = "";

        const dept = departmentSelect.value;
        if (!dept) return;

        console.log(`🔍 Loading SOPs for department: ${dept}`);

        try {
            const index = await fetchJSON(`../data/${dept}/index.json`);
            index.instruments.forEach((sop) => {
                sopSelect.innerHTML += `<option value="${sop.id}">${sop.name}</option>`;
            });
            sopSelect.disabled = false;
            console.log(`✅ Loaded ${index.instruments.length} SOPs`);
        } catch (e) {
            console.error("❌ Failed to load SOPs:", e);
            sopSelect.innerHTML = `<option value="">Error loading SOPs</option>`;
        }
    });

    /* ========================= SOP CHANGE ========================= */
    sopSelect.addEventListener("change", async () => {
        const dept = departmentSelect.value;
        const sop = sopSelect.value;
        if (!dept || !sop) return;

        console.log(`📄 Loading SOP: ${sop}`);

        try {
            const raw = await fetchJSON(`../data/${dept}/${sop}.json`);
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
            console.log('✅ SOP data loaded successfully');
        } catch (e) {
            console.error("❌ Failed to load SOP:", e);
            if (preview) {
                preview.innerHTML = `
                    <div style="padding: 40px; text-align: center; color: #721c24; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; margin: 20px;">
                        <h2>❌ Error Loading SOP</h2>
                        <p>${e.message}</p>
                        <p>Please try selecting a different SOP or refresh the page.</p>
                    </div>
                `;
            }
        }
    });

    /* ========================= LOAD TEMPLATE ========================= */
    async function loadTemplate() {
        const template = templateSelect.value;
        if (!template) return;

        console.log(`📋 Loading template: ${template}`);

        try {
            TEMPLATE_HTML = await fetchText(`../templates/${template}.html`);
            renderPreview();
            console.log('✅ Template loaded and rendered');
        } catch (e) {
            console.error("❌ Failed to load template:", e);
            if (preview) {
                preview.innerHTML = `<div style="padding: 20px; color: red;">Error loading template: ${e.message}</div>`;
            }
        }
    }

    templateSelect.addEventListener("change", loadTemplate);

    /* ========================= RENDER PREVIEW ========================= */
    function renderPreview() {
        if (!TEMPLATE_HTML || !SOP_DATA) return;

        let html = TEMPLATE_HTML;

        // Replace placeholders
        Object.keys(SOP_DATA).forEach((key) => {
            const value = SOP_DATA[key];
            if (typeof value === 'string') {
                html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
            } else if (Array.isArray(value) && key === 'procedure') {
                const procedureHTML = value.map(step => `<li>${step}</li>`).join('');
                html = html.replace(/{{procedure}}/g, procedureHTML);
            }
        });

        // Remove unused placeholders
        html = html.replace(/{{.*?}}/g, '');

        if (preview) {
            preview.innerHTML = html;
        }
    }

    /* ========================= SYNC INPUTS ========================= */
    function syncInputs() {
        Object.keys(inputs).forEach((key) => {
            const input = inputs[key];
            if (input && SOP_DATA && SOP_DATA[key] !== undefined) {
                input.value = Array.isArray(SOP_DATA[key]) 
                    ? SOP_DATA[key].join('\n') 
                    : SOP_DATA[key];
            }
        });
    }

    /* ========================= UPDATE SECTION VISIBILITY ========================= */
    function updateSectionVisibility() {
        if (!SOP_DATA) return;

        Object.keys(toggles).forEach((key) => {
            const toggle = toggles[key];
            if (toggle) {
                const isEnabled = SOP_DATA.sectionsEnabled?.[key] || SOP_DATA.fieldsEnabled?.[key];
                toggle.checked = isEnabled;
            }
        });

        // Update section display based on toggles
        updateToggleVisibility();
    }

    /* ========================= UPDATE TOGGLE VISIBILITY ========================= */
    function updateToggleVisibility() {
        const sections = {
            'toggleDocControl': 'sectionDocControl',
            'toggleApplicability': 'sectionApplicability',
            'toggleAbbreviations': 'sectionAbbreviations',
            'toggleReferences': 'sectionReferences',
            'toggleAnnexures': 'sectionAnnexures',
            'toggleChangeHistory': 'sectionChangeHistory'
        };

        Object.keys(sections).forEach(toggleId => {
            const toggle = $(toggleId);
            const section = $(sections[toggleId]);
            if (toggle && section) {
                section.style.display = toggle.checked ? 'block' : 'none';
            }
        });
    }

    /* ========================= INPUT CHANGE LISTENERS ========================= */
    Object.keys(inputs).forEach((key) => {
        const input = inputs[key];
        if (input) {
            input.addEventListener('input', () => {
                if (SOP_DATA) {
                    SOP_DATA[key] = input.value;
                    renderPreview();
                }
            });
        }
    });

    /* ========================= TOGGLE LISTENERS ========================= */
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
                    updateToggleVisibility();
                    renderPreview();
                }
            });
        }
    });

    /* ========================= PRINT/SAVE PDF WITH html2pdf.js ========================= */
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

            // Check if html2pdf is loaded
            if (typeof html2pdf === 'undefined') {
                console.error('❌ html2pdf.js not loaded!');
                alert('PDF library not loaded. Please refresh the page.');
                return;
            }

            // Show loading state
            const originalText = printBtn.innerHTML;
            printBtn.innerHTML = '⏳ Generating PDF...';
            printBtn.disabled = true;

            // Generate filename
            const sopNum = inputs.sopNumber?.value || '001';
            const title = inputs.title?.value || 'SOP';
            const dept = inputs.department?.value || 'Department';
            const cleanTitle = title.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
            const date = new Date().toISOString().split('T')[0];
            const filename = `SOP_${sopNum}_${cleanTitle}_${date}.pdf`;

            // Configure PDF options
            const opt = {
                margin: [20, 20, 20, 20],  // 20mm margins (top, right, bottom, left)
                filename: filename,
                image: { 
                    type: 'jpeg', 
                    quality: 0.98 
                },
                html2canvas: { 
                    scale: 2,              // Higher quality
                    useCORS: true,         // Handle external images
                    letterRendering: true, // Better text rendering
                    logging: false         // Disable console logs
                },
                jsPDF: { 
                    unit: 'mm', 
                    format: 'a4', 
                    orientation: 'portrait',
                    compress: true
                },
                pagebreak: { 
                    mode: ['avoid-all', 'css', 'legacy'],
                    before: '.page-break',
                    after: '.page-break-after'
                }
            };

            // Generate and save PDF
            html2pdf()
                .set(opt)
                .from(preview)
                .save()
                .then(function() {
                    // Reset button state
                    printBtn.innerHTML = originalText;
                    printBtn.disabled = false;
                    console.log('✅ PDF generated successfully:', filename);
                })
                .catch(function(error) {
                    // Handle errors
                    console.error('❌ PDF generation error:', error);
                    alert('Error generating PDF. Please try again or check console for details.');
                    printBtn.innerHTML = originalText;
                    printBtn.disabled = false;
                });
        });

        console.log('✅ Print button with html2pdf.js initialized');
    }

    // Initialize print button when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupPrintButton);
    } else {
        setupPrintButton();
    }

    console.log('✅ SOP App initialized successfully');
};

// Auto-initialize if DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initSOPApp);
} else {
    window.initSOPApp();
}