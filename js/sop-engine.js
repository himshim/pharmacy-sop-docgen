/**
 * ═══════════════════════════════════════════════════════════════════
 * SOP GENERATOR ENGINE v3.1 - PRODUCTION (ALL BUGS FIXED)
 * Fixed: Form visibility, PDF generation, Print, Dynamic preview height
 * ═══════════════════════════════════════════════════════════════════
 */

window.initSOPApp = function() {
    'use strict';

    console.log('🚀 Initializing SOP App v3.1 (Complete Fix)...');

    /* ==================== CONFIGURATION ==================== */
    const CONFIG = {
        DATA_PATH: '../data/',
        TEMPLATE_PATH: '../templates/',
        DEFAULT_RESPONSIBILITY: 'Laboratory In-charge, faculty members, technical staff, and authorized users are responsible for implementation and compliance of this SOP.',
        DEBUG_MODE: true
    };

    /* ==================== DOM HELPERS ==================== */
    const $ = (id) => document.getElementById(id);

    const fetchJSON = (url) => 
        fetch(`${url}?v=${Date.now()}`)
            .then(r => {
                if (!r.ok) throw new Error(`Fetch failed: ${url}`);
                return r.json();
            });

    const fetchText = (url) => 
        fetch(`${url}?v=${Date.now()}`)
            .then(r => {
                if (!r.ok) throw new Error(`Fetch failed: ${url}`);
                return r.text();
            });

    /* ==================== CORE ELEMENTS ==================== */
    const preview = $('preview') || $('preview-content');
    const departmentSelect = $('departmentSelect');
    const sopSelect = $('sopSelect');
    const templateSelect = $('templateSelect');
    const printBtn = $('print-btn');
    const browserPrintBtn = $('browser-print-btn');

    if (!departmentSelect || !sopSelect || !templateSelect) {
        console.warn('⚠️ SOP engine aborted: UI not ready');
        return;
    }

    if (!preview) {
        console.error('❌ Preview element not found! Check HTML for id="preview"');
        return;
    }

    console.log('✅ Core elements found');
    console.log('📺 Preview element:', preview.id || preview.className);

    /* ==================== SECTIONS (Hidden by default) ==================== */
    const sections = {
        docControl: $('sectionDocControl'),
        applicability: $('sectionApplicability'),
        abbreviations: $('sectionAbbreviations'),
        references: $('sectionReferences'),
        annexures: $('sectionAnnexures'),
        changeHistory: $('sectionChangeHistory')
    };

    /* ==================== TOGGLES ==================== */
    const toggles = {
        docControl: $('toggleDocControl'),
        applicability: $('toggleApplicability'),
        abbreviations: $('toggleAbbreviations'),
        references: $('toggleReferences'),
        annexures: $('toggleAnnexures'),
        changeHistory: $('toggleChangeHistory'),
        sopNumber: $('toggleSopNumber'),
        effectiveDate: $('toggleEffectiveDate'),
        revisionDate: $('toggleRevisionDate'),
        copyType: $('toggleCopyType')
    };

    /* ==================== INPUTS ==================== */
    const inputs = {
        institute: $('institute'),
        department: $('department'),
        title: $('title'),
        sopNumber: $('sopNumber'),
        revisionNo: $('revisionNo'),
        effectiveDate: $('effectiveDate'),
        revisionDate: $('revisionDate'),
        nextReviewDate: $('nextReviewDate'),
        copyType: $('copyType'),
        purpose: $('purpose'),
        scope: $('scope'),
        responsibility: $('responsibility'),
        procedure: $('procedure'),
        precautions: $('precautions'),
        applicability: $('applicability'),
        abbreviations: $('abbreviations'),
        references: $('references'),
        annexures: $('annexures'),
        changeHistoryInput: $('changeHistoryInput'),
        preparedBy: $('preparedBy'),
        preparedDesig: $('preparedDesig'),
        preparedDate: $('preparedDate'),
        checkedBy: $('checkedBy'),
        checkedDesig: $('checkedDesig'),
        checkedDate: $('checkedDate'),
        approvedBy: $('approvedBy'),
        approvedDesig: $('approvedDesig'),
        approvedDate: $('approvedDate')
    };

    /* ==================== STATE ==================== */
    let TEMPLATE_HTML = '';
    let SOP_DATA = null;

    /* ==================== LOAD DEPARTMENTS ==================== */
    fetchJSON(`${CONFIG.DATA_PATH}departments.json`)
        .then(d => {
            departmentSelect.innerHTML = `<option value="">Choose department...</option>`;
            d.departments.forEach(dep => {
                departmentSelect.innerHTML += `<option value="${dep.id || dep.key}">${dep.name}</option>`;
            });
            console.log(`✅ Loaded ${d.departments.length} departments`);
        })
        .catch(e => {
            console.error('❌ Failed to load departments:', e);
            departmentSelect.innerHTML = `<option value="">Error loading departments</option>`;
        });

    /* ==================== DEPARTMENT CHANGE ==================== */
    departmentSelect.addEventListener('change', async () => {
        sopSelect.innerHTML = `<option value="">Choose SOP...</option>`;
        sopSelect.disabled = true;
        if (preview) preview.innerHTML = '';

        // Hide form sections when department changes
        hideAllSections();

        const dept = departmentSelect.value;
        if (!dept) return;

        console.log(`🔍 Loading SOPs for department: ${dept}`);

        try {
            const index = await fetchJSON(`${CONFIG.DATA_PATH}${dept}/index.json`);
            index.instruments.forEach(sop => {
                sopSelect.innerHTML += `<option value="${sop.id || sop.key}">${sop.name}</option>`;
            });
            sopSelect.disabled = false;
            console.log(`✅ Loaded ${index.instruments.length} SOPs`);
        } catch (e) {
            console.error('❌ Failed to load SOPs:', e);
            sopSelect.innerHTML = `<option value="">Error loading SOPs</option>`;
        }
    });

    /* ==================== SOP CHANGE ==================== */
    sopSelect.addEventListener('change', async () => {
        const dept = departmentSelect.value;
        const sop = sopSelect.value;
        if (!dept || !sop) return;

        console.log(`📄 Loading SOP: ${sop}`);

        try {
            const raw = await fetchJSON(`${CONFIG.DATA_PATH}${dept}/${sop}.json`);

            SOP_DATA = {
                institute: '',
                department: dept,
                title: raw.meta?.title || '',
                sopNumber: '',
                revisionNo: '00',
                effectiveDate: '',
                revisionDate: '',
                nextReviewDate: '',
                copyType: 'CONTROLLED',

                sectionsEnabled: {
                    docControl: true,
                    applicability: false,
                    abbreviations: false,
                    references: false,
                    annexures: false,
                    changeHistory: false
                },

                fieldsEnabled: {
                    sopNumber: true,
                    effectiveDate: true,
                    revisionDate: true,
                    copyType: true
                },

                changeHistory: [],
                purpose: raw.sections?.purpose || '',
                scope: raw.sections?.scope || '',
                responsibility: CONFIG.DEFAULT_RESPONSIBILITY,
                procedure: raw.sections?.procedure || [],
                precautions: raw.sections?.precautions || '',
                applicability: '',
                abbreviations: '',
                references: '',
                annexures: '',

                preparedBy: '',
                preparedDesig: '',
                preparedDate: '',
                checkedBy: '',
                checkedDesig: '',
                checkedDate: '',
                approvedBy: '',
                approvedDesig: '',
                approvedDate: ''
            };

            syncInputs();
            updateSectionVisibility(); // THIS SHOWS THE FORM SECTIONS!
            await loadTemplate();

            console.log('✅ SOP data loaded successfully');

        } catch (e) {
            console.error('❌ Failed to load SOP:', e);
            if (preview) {
                preview.innerHTML = `
                    <div style="padding: 40px; text-align: center; color: #e53e3e; background: #fff5f5; border-radius: 8px; margin: 20px;">
                        <h3>❌ Error Loading SOP</h3>
                        <p>${e.message}</p>
                        <p style="font-size: 14px; margin-top: 12px;">Please try selecting a different SOP or refresh the page.</p>
                    </div>
                `;
            }
        }
    });

    /* ==================== TEMPLATE CHANGE ==================== */
    templateSelect.addEventListener('change', async () => {
        if (!SOP_DATA) return;
        await loadTemplate();
    });

    /* ==================== LOAD TEMPLATE ==================== */
    async function loadTemplate() {
        const template = templateSelect.value || 'sop-a4-classic';
        console.log(`📋 Loading template: ${template}`);

        try {
            TEMPLATE_HTML = await fetchText(`${CONFIG.TEMPLATE_PATH}${template}.html`);
            renderPreview();
            console.log('✅ Template loaded and rendered');
        } catch (e) {
            console.error('❌ Template load failed:', e);
            if (preview) {
                preview.innerHTML = `
                    <div style="padding: 40px; text-align: center; color: #e53e3e;">
                        <h3>❌ Template Error</h3>
                        <p>${e.message}</p>
                    </div>
                `;
            }
        }
    }

    /* ==================== RENDER PREVIEW ==================== */
    function renderPreview() {
        if (!TEMPLATE_HTML || !SOP_DATA) return;

        let html = TEMPLATE_HTML;

        // Replace simple placeholders
        Object.keys(SOP_DATA).forEach(key => {
            const value = SOP_DATA[key];
            if (typeof value === 'string') {
                const regex = new RegExp(`{{${key}}}`, 'g');
                html = html.replace(regex, value);
            }
        });

        // Handle procedure array
        if (Array.isArray(SOP_DATA.procedure)) {
            const procedureHTML = SOP_DATA.procedure
                .map(step => `<li>${step}</li>`)
                .join('');
            html = html.replace(/{{procedure}}/g, procedureHTML);
        }

        // Clean up remaining placeholders
        html = html.replace(/{{.*?}}/g, '');

        // Render to preview
        preview.innerHTML = html;

        console.log('✅ Preview rendered');
    }

    /* ==================== SYNC INPUTS ==================== */
    function syncInputs() {
        if (!SOP_DATA) return;

        Object.keys(inputs).forEach(key => {
            const input = inputs[key];
            if (input && SOP_DATA[key] !== undefined) {
                if (Array.isArray(SOP_DATA[key])) {
                    input.value = SOP_DATA[key].join('\n');
                } else {
                    input.value = SOP_DATA[key];
                }
            }
        });

        console.log('✅ Inputs synced');
    }

    /* ==================== HIDE ALL SECTIONS ==================== */
    function hideAllSections() {
        Object.keys(sections).forEach(key => {
            const section = sections[key];
            if (section) {
                section.style.display = 'none';
            }
        });
    }

    /* ==================== UPDATE VISIBILITY (FIXED!) ==================== */
    function updateSectionVisibility() {
        if (!SOP_DATA) return;

        // Update toggle states
        Object.keys(toggles).forEach(key => {
            const toggle = toggles[key];
            if (toggle) {
                const enabled = SOP_DATA.sectionsEnabled?.[key] || 
                               SOP_DATA.fieldsEnabled?.[key] || 
                               false;
                toggle.checked = enabled;
            }
        });

        // Show/hide sections based on SOP data
        Object.keys(sections).forEach(key => {
            const section = sections[key];
            const toggle = toggles[key];

            if (section) {
                // Show section if enabled in SOP data
                if (SOP_DATA.sectionsEnabled?.[key]) {
                    section.style.display = 'block';
                    console.log(`✅ Showing section: ${key}`);
                } else {
                    section.style.display = 'none';
                }
            }
        });

        console.log('✅ Section visibility updated');
    }

    /* ==================== INPUT LISTENERS ==================== */
    Object.keys(inputs).forEach(key => {
        const input = inputs[key];
        if (!input) return;

        input.addEventListener('input', () => {
            if (!SOP_DATA) return;

            if (key === 'procedure') {
                SOP_DATA[key] = input.value.split('\n').filter(line => line.trim());
            } else {
                SOP_DATA[key] = input.value;
            }

            renderPreview();
        });
    });

    /* ==================== TOGGLE LISTENERS ==================== */
    Object.keys(toggles).forEach(key => {
        const toggle = toggles[key];
        if (!toggle) return;

        toggle.addEventListener('change', () => {
            if (!SOP_DATA) return;

            // Update SOP data
            if (SOP_DATA.sectionsEnabled) {
                SOP_DATA.sectionsEnabled[key] = toggle.checked;
            }
            if (SOP_DATA.fieldsEnabled) {
                SOP_DATA.fieldsEnabled[key] = toggle.checked;
            }

            // Update section visibility
            const section = sections[key];
            if (section) {
                section.style.display = toggle.checked ? 'block' : 'none';
            }

            renderPreview();
        });
    });

    /* ==================== BROWSER PRINT HANDLER ==================== */
    if (browserPrintBtn) {
        browserPrintBtn.addEventListener('click', function() {
            if (!preview || !preview.innerHTML.trim()) {
                alert('Please generate a document first by selecting department and SOP.');
                return;
            }

            console.log('🖨️ Initiating browser print...');
            window.print();
            console.log('✅ Print dialog opened');
        });
    }

    /* ==================== PDF GENERATION HANDLER ==================== */
    if (printBtn) {
        printBtn.addEventListener('click', async function() {
            if (!preview || !preview.innerHTML.trim()) {
                alert('Please generate a document first by selecting department and SOP.');
                return;
            }

            if (typeof html2pdf === 'undefined') {
                alert('PDF library not loaded. Please refresh the page and try again.');
                console.error('❌ html2pdf.js not loaded');
                return;
            }

            const originalText = printBtn.innerHTML;
            printBtn.innerHTML = '⏳ Generating PDF...';
            printBtn.disabled = true;

            try {
                console.log('📄 Starting PDF generation...');

                const clonedPreview = preview.cloneNode(true);
                const pageBreaks = clonedPreview.querySelectorAll('.page-break-indicator');
                pageBreaks.forEach(pb => pb.remove());

                const sopNum = inputs.sopNumber?.value || '001';
                const title = inputs.title?.value || 'SOP';
                const cleanTitle = title.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
                const date = new Date().toISOString().split('T')[0];
                const filename = `SOP_${sopNum}_${cleanTitle}_${date}.pdf`;

                const options = {
                    margin: [20, 20, 20, 20],
                    filename: filename,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { 
                        scale: 2,
                        useCORS: true,
                        letterRendering: true,
                        logging: false,
                        windowWidth: 794,
                        windowHeight: 1123
                    },
                    jsPDF: { 
                        unit: 'mm', 
                        format: 'a4', 
                        orientation: 'portrait',
                        compress: true
                    },
                    pagebreak: { 
                        mode: ['avoid-all', 'css', 'legacy'],
                        before: '.page-break-before',
                        after: '.page-break-after',
                        avoid: ['.avoid-break', 'h1', 'h2', 'h3', 'table']
                    }
                };

                document.body.classList.add('pdf-rendering');
                await html2pdf().set(options).from(clonedPreview).save();
                document.body.classList.remove('pdf-rendering');

                console.log(`✅ PDF generated successfully: ${filename}`);

            } catch (error) {
                document.body.classList.remove('pdf-rendering');
                console.error('❌ PDF generation error:', error);
                alert(`Error generating PDF: ${error.message}\n\nPlease try again or use browser print instead.`);
            } finally {
                printBtn.innerHTML = originalText;
                printBtn.disabled = false;
            }
        });
    }

    console.log('🎉 SOP App v3.1 initialized successfully!');
};

/* ==================== AUTO-INITIALIZE ==================== */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof window.initSOPApp === 'function') {
            window.initSOPApp();
        }
    });
} else {
    if (typeof window.initSOPApp === 'function') {
        window.initSOPApp();
    }
}
// Add this at the END of sop-engine.js

/* ==================== FORCE WHITE BACKGROUND EXPANSION ==================== */
function forcePreviewHeight() {
    const preview = document.getElementById('preview') || document.getElementById('preview-content');

    if (preview) {
        // Remove all height constraints
        preview.style.height = 'auto';
        preview.style.minHeight = '0';
        preview.style.maxHeight = 'none';
        preview.style.display = 'block';

        console.log('✅ Forced preview height to auto');
        console.log('Preview actual height:', preview.offsetHeight + 'px');
    }
}

// Run after preview renders
const originalRenderPreview = renderPreview;
renderPreview = function() {
    originalRenderPreview();

    // Force height after render
    setTimeout(() => {
        forcePreviewHeight();
    }, 100);
};

// Also run on window resize
window.addEventListener('resize', forcePreviewHeight);

// Run immediately
setTimeout(forcePreviewHeight, 500);

console.log('🔧 Height force-fix loaded');