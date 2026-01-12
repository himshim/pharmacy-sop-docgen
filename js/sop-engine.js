/**
 * ═══════════════════════════════════════════════════════════════════
 * SOP GENERATOR ENGINE v3.3 - HIGH PERFORMANCE
 * Features: Caching (Templates/Data), Smart Debouncing, optimized DOM
 * ═══════════════════════════════════════════════════════════════════
 */

window.initSOPApp = function() {
    'use strict';

    console.log('🚀 Initializing SOP App v3.3 (High Performance)...');

    /* ==================== CONFIGURATION ==================== */
    const CONFIG = {
        DATA_PATH: './data/', 
        TEMPLATE_PATH: './templates/',
        DEFAULT_RESPONSIBILITY: 'Laboratory In-charge, faculty members, technical staff, and authorized users are responsible for implementation and compliance of this SOP.',
        DEBUG_MODE: true
    };

    /* ==================== CACHE STORAGE ==================== */
    // ⚡ PERFORMANCE: Store loaded files here to avoid re-fetching
    const CACHE = {
        TEMPLATES: {}, // Stores HTML strings: { 'sop-a4-classic': '<html>...' }
        SOPS: {},      // Stores JSON objects: { 'pharmaceutics/uv': { ... } }
        DEPARTMENTS: null // Stores departments list
    };

    /* ==================== DOM HELPERS ==================== */
    const $ = (id) => document.getElementById(id);

    const fetchJSON = async (url) => {
        const response = await fetch(`${url}?v=${Date.now()}`); // Cache-busting for fresh init, but we rely on internal cache after
        if (!response.ok) throw new Error(`Fetch failed: ${url}`);
        return response.json();
    };

    const fetchText = async (url) => {
        const response = await fetch(`${url}?v=${Date.now()}`);
        if (!response.ok) throw new Error(`Fetch failed: ${url}`);
        return response.text();
    };

    /* ==================== CORE ELEMENTS ==================== */
    const preview = $('preview') || $('preview-content');
    const departmentSelect = $('departmentSelect');
    const sopSelect = $('sopSelect');
    const templateSelect = $('templateSelect');
    const printBtn = $('print-btn');
    const browserPrintBtn = $('browser-print-btn');

    if (!departmentSelect || !sopSelect || !templateSelect || !preview) {
        console.warn('⚠️ SOP engine aborted: UI elements missing');
        return;
    }

    /* ==================== SECTIONS & TOGGLES ==================== */
    const sections = {
        docControl: $('sectionDocControl'),
        applicability: $('sectionApplicability'),
        abbreviations: $('sectionAbbreviations'),
        references: $('sectionReferences'),
        annexures: $('sectionAnnexures'),
        changeHistory: $('sectionChangeHistory')
    };

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
    let CURRENT_TEMPLATE_NAME = '';
    let SOP_DATA = null;

    /* ==================== INIT ==================== */
    (async function init() {
        try {
            // 1. Load Departments
            if (!CACHE.DEPARTMENTS) {
                const data = await fetchJSON(`${CONFIG.DATA_PATH}departments.json`);
                CACHE.DEPARTMENTS = data.departments;
            }

            departmentSelect.innerHTML = `<option value="">Choose department...</option>`;
            CACHE.DEPARTMENTS.forEach(dep => {
                departmentSelect.innerHTML += `<option value="${dep.id || dep.key}">${dep.name}</option>`;
            });

        } catch (e) {
            console.error('❌ Failed to load departments:', e);
            departmentSelect.innerHTML = `<option value="">Error loading departments</option>`;
        }
    })();

    /* ==================== EVENT: DEPARTMENT CHANGE ==================== */
    departmentSelect.addEventListener('change', async () => {
        sopSelect.innerHTML = `<option value="">Choose SOP...</option>`;
        sopSelect.disabled = true;
        if (preview) preview.innerHTML = '';
        hideAllSections();

        const dept = departmentSelect.value;
        if (!dept) return;

        try {
            // We don't strictly cache the index list as it's small and might change, 
            // but we could if needed. For now, fetch is fine.
            const index = await fetchJSON(`${CONFIG.DATA_PATH}${dept}/index.json`);
            
            index.instruments.forEach(sop => {
                sopSelect.innerHTML += `<option value="${sop.id || sop.key}">${sop.name}</option>`;
            });
            sopSelect.disabled = false;
        } catch (e) {
            console.error('❌ Failed to load SOP list:', e);
        }
    });

    /* ==================== EVENT: SOP CHANGE ==================== */
    sopSelect.addEventListener('change', async () => {
        const dept = departmentSelect.value;
        const sop = sopSelect.value;
        if (!dept || !sop) return;

        const cacheKey = `${dept}/${sop}`;
        let raw;

        try {
            // ⚡ CHECK CACHE FIRST
            if (CACHE.SOPS[cacheKey]) {
                console.log(`⚡ Cache hit for SOP: ${cacheKey}`);
                raw = CACHE.SOPS[cacheKey];
            } else {
                console.log(`📥 Fetching SOP: ${cacheKey}`);
                raw = await fetchJSON(`${CONFIG.DATA_PATH}${dept}/${sop}.json`);
                CACHE.SOPS[cacheKey] = raw; // Store in cache
            }

            // Normalize Data
            SOP_DATA = {
                institute: '',
                department: dept,
                title: raw.meta?.title || raw.title || '',
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
                    sopNumber: true, effectiveDate: true, revisionDate: true, copyType: true
                },

                changeHistory: [],
                purpose: raw.sections?.purpose || raw.purpose || '',
                scope: raw.sections?.scope || raw.scope || '',
                responsibility: CONFIG.DEFAULT_RESPONSIBILITY,
                procedure: raw.sections?.procedure || raw.procedure || [],
                precautions: raw.sections?.precautions || raw.precautions || '',
                applicability: '', abbreviations: '', references: '', annexures: '',

                preparedBy: '', preparedDesig: '', preparedDate: '',
                checkedBy: '', checkedDesig: '', checkedDate: '',
                approvedBy: '', approvedDesig: '', approvedDate: ''
            };

            syncInputs();
            updateSectionVisibility();
            await loadTemplate();

        } catch (e) {
            console.error('❌ Failed to load SOP:', e);
            if (preview) preview.innerHTML = `<p style="color:red; padding:20px;">Error: ${e.message}</p>`;
        }
    });

    /* ==================== EVENT: TEMPLATE CHANGE ==================== */
    templateSelect.addEventListener('change', async () => {
        if (!SOP_DATA) return;
        await loadTemplate();
    });

    /* ==================== LOAD TEMPLATE (CACHED) ==================== */
    async function loadTemplate() {
        const templateName = templateSelect.value || 'sop-a4-classic';
        CURRENT_TEMPLATE_NAME = templateName;

        try {
            // ⚡ CHECK CACHE FIRST
            if (!CACHE.TEMPLATES[templateName]) {
                console.log(`📥 Fetching template: ${templateName}`);
                const html = await fetchText(`${CONFIG.TEMPLATE_PATH}${templateName}.html`);
                CACHE.TEMPLATES[templateName] = html;
            } else {
                console.log(`⚡ Cache hit for template: ${templateName}`);
            }

            renderPreview();
        } catch (e) {
            console.error('❌ Template load failed:', e);
        }
    }

    /* ==================== RENDER PREVIEW (DEBOUNCED) ==================== */
    let debounceTimer;
    function renderPreview() {
        if (!SOP_DATA || !CACHE.TEMPLATES[CURRENT_TEMPLATE_NAME]) return;
        
        // ⚡ DEBOUNCE: Delay rendering until user stops typing for 50ms
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            requestAnimationFrame(_performRender); // ⚡ VISUAL SYNC: Render on next frame
        }, 50);
    }

    function _performRender() {
        const templateHtml = CACHE.TEMPLATES[CURRENT_TEMPLATE_NAME];
        if (!templateHtml) return;

        // 1. Prepare Data Copy
        const viewData = { ...SOP_DATA };

        // 2. Format Lists
        if (Array.isArray(viewData.procedure)) {
            viewData.procedure = viewData.procedure.map(step => `<li>${step}</li>`).join('');
        }

        if (Array.isArray(viewData.changeHistory) && viewData.changeHistory.length > 0) {
            viewData.changeHistoryRows = viewData.changeHistory
                .map(item => `<tr><td>${item.rev}</td><td>${item.date}</td><td>${item.desc}</td></tr>`)
                .join('');
        }

        // 3. Section Flags
        if (viewData.sectionsEnabled) {
            Object.keys(viewData.sectionsEnabled).forEach(key => {
                viewData[`section${key.charAt(0).toUpperCase() + key.slice(1)}`] = viewData.sectionsEnabled[key];
            });
        }
        
        // 4. Render
        if (typeof window.renderTemplate === 'function') {
            preview.innerHTML = window.renderTemplate(templateHtml, viewData);
        }
    }

    /* ==================== HELPERS ==================== */
    function syncInputs() {
        if (!SOP_DATA) return;
        Object.keys(inputs).forEach(key => {
            const input = inputs[key];
            if (input && SOP_DATA[key] !== undefined) {
                input.value = Array.isArray(SOP_DATA[key]) ? SOP_DATA[key].join('\n') : SOP_DATA[key];
            }
        });
    }

    function hideAllSections() {
        Object.keys(sections).forEach(key => {
            if (sections[key]) sections[key].style.display = 'none';
        });
    }

    function updateSectionVisibility() {
        if (!SOP_DATA) return;

        Object.keys(toggles).forEach(key => {
            const toggle = toggles[key];
            if (toggle) {
                const enabled = SOP_DATA.sectionsEnabled?.[key] || SOP_DATA.fieldsEnabled?.[key] || false;
                toggle.checked = enabled;
            }
        });

        Object.keys(sections).forEach(key => {
            if (sections[key]) {
                sections[key].style.display = SOP_DATA.sectionsEnabled?.[key] ? 'block' : 'none';
            }
        });
    }

    /* ==================== INPUT LISTENERS (Delegated for perf) ==================== */
    // Instead of attaching 30 listeners, we could use one on a container, 
    // but individual listeners are fine here given the low count (approx 30).
    // The main perf gain is the debounce in renderPreview.
    
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

    Object.keys(toggles).forEach(key => {
        const toggle = toggles[key];
        if (!toggle) return;

        toggle.addEventListener('change', () => {
            if (!SOP_DATA) return;
            if (SOP_DATA.sectionsEnabled && key in SOP_DATA.sectionsEnabled) {
                SOP_DATA.sectionsEnabled[key] = toggle.checked;
            }
            if (SOP_DATA.fieldsEnabled && key in SOP_DATA.fieldsEnabled) {
                SOP_DATA.fieldsEnabled[key] = toggle.checked;
            }
            if (sections[key]) {
                sections[key].style.display = toggle.checked ? 'block' : 'none';
            }
            renderPreview();
        });
    });

    /* ==================== PRINT ==================== */
    if (browserPrintBtn) {
        browserPrintBtn.addEventListener('click', () => {
            if (!preview || !preview.innerHTML.trim()) {
                alert('Please generate a document first.');
                return;
            }
            window.print();
        });
    }

    // PDF generation (printBtn) logic remains same as original/v3.2
    if (printBtn) {
        printBtn.addEventListener('click', async function() {
            if (!preview || !preview.innerHTML.trim()) {
                alert('Please generate a document first.');
                return;
            }
            if (typeof html2pdf === 'undefined') return;

            const originalText = printBtn.innerHTML;
            printBtn.innerHTML = '⏳ Generating PDF...';
            printBtn.disabled = true;

            try {
                const clonedPreview = preview.cloneNode(true);
                // ... (PDF config from v3.2) ...
                const sopNum = inputs.sopNumber?.value || '001';
                const title = inputs.title?.value || 'SOP';
                const cleanTitle = title.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
                const filename = `SOP_${sopNum}_${cleanTitle}.pdf`;

                const options = {
                    margin: 10,
                    filename: filename,
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                };

                await html2pdf().set(options).from(clonedPreview).save();
            } catch (error) {
                console.error('PDF Error:', error);
                alert('PDF Generation failed. Try browser print.');
            } finally {
                printBtn.innerHTML = originalText;
                printBtn.disabled = false;
            }
        });
    }

    console.log('🎉 SOP App v3.3 initialized!');
};

/* ==================== BOOTSTRAP ==================== */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.initSOPApp && window.initSOPApp());
} else {
    window.initSOPApp && window.initSOPApp();
}
