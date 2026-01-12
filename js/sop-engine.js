/**
 * ═══════════════════════════════════════════════════════════════════
 * SOP GENERATOR ENGINE v2.2 - PRODUCTION + MS WORD PREVIEW
 * ═══════════════════════════════════════════════════════════════════
 * Now with automatic page break indicators for better preview
 */

(function() {
    'use strict';

    console.log('🚀 Initializing SOP App v2.2 (MS Word Preview)...');

    /* ==================== CONFIGURATION ==================== */
    const CONFIG = {
        DATA_PATH: '../data/',
        TEMPLATE_PATH: '../templates/',
        CACHE_ENABLED: true,
        DEBUG_MODE: true,
        DEFAULT_RESPONSIBILITY: 'Laboratory In-charge, faculty members, technical staff, and authorized users are responsible for implementation and compliance of this SOP.',
        PAGE_HEIGHT_MM: 257, // A4 height (297mm) - margins (40mm)
        APPROX_MM_PER_SECTION: 35 // Approximate height per section
    };

    /* ==================== CACHE SYSTEM ==================== */
    const CACHE = {
        departments: null,
        templates: {},
        sopData: {}
    };

    /* ==================== UTILITIES ==================== */
    const Utils = {
        $: (id) => document.getElementById(id),

        getValue: (obj, primaryField = 'id', fallbackField = 'key') => {
            return obj[primaryField] || obj[fallbackField] || null;
        },

        fetchJSON: async (url, cacheKey = null) => {
            if (CONFIG.CACHE_ENABLED && cacheKey && CACHE.sopData[cacheKey]) {
                if (CONFIG.DEBUG_MODE) console.log(`📦 Using cached: ${cacheKey}`);
                return CACHE.sopData[cacheKey];
            }

            const response = await fetch(`${url}?v=${Date.now()}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);

            const data = await response.json();

            if (CONFIG.CACHE_ENABLED && cacheKey) {
                CACHE.sopData[cacheKey] = data;
            }

            return data;
        },

        fetchText: async (url, cacheKey = null) => {
            if (CONFIG.CACHE_ENABLED && cacheKey && CACHE.templates[cacheKey]) {
                if (CONFIG.DEBUG_MODE) console.log(`📦 Using cached template: ${cacheKey}`);
                return CACHE.templates[cacheKey];
            }

            const response = await fetch(`${url}?v=${Date.now()}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);

            const text = await response.text();

            if (CONFIG.CACHE_ENABLED && cacheKey) {
                CACHE.templates[cacheKey] = text;
            }

            return text;
        },

        toTextarea: (value) => {
            if (Array.isArray(value)) return value.join('\n');
            return value || '';
        },

        fromTextarea: (text) => {
            return text.split('\n').filter(line => line.trim());
        },

        cacheKey: (...parts) => parts.join('_'),

        log: (icon, message, data = null) => {
            if (CONFIG.DEBUG_MODE) {
                const time = new Date().toLocaleTimeString();
                console.log(`${icon} [${time}] ${message}`, data || '');
            }
        },

        handleError: (context, error) => {
            console.error(`❌ ${context}:`, error);
            return {
                success: false,
                error: error.message,
                context
            };
        }
    };

    /* ==================== STATE MANAGER ==================== */
    const State = {
        currentDept: null,
        currentSOP: null,
        currentTemplate: null,
        sopData: null,
        templateHTML: null,

        reset: function() {
            this.currentDept = null;
            this.currentSOP = null;
            this.sopData = null;
        },

        update: function(key, value) {
            this[key] = value;
            Utils.log('📊', `State updated: ${key}`, value);
        }
    };

    /* ==================== DOM REFERENCES ==================== */
    const DOM = {
        departmentSelect: Utils.$("departmentSelect"),
        sopSelect: Utils.$("sopSelect"),
        templateSelect: Utils.$("templateSelect"),
        preview: Utils.$("preview") || Utils.$("preview-content"),

        toggles: {
            docControl: Utils.$("toggleDocControl"),
            applicability: Utils.$("toggleApplicability"),
            abbreviations: Utils.$("toggleAbbreviations"),
            references: Utils.$("toggleReferences"),
            annexures: Utils.$("toggleAnnexures"),
            changeHistory: Utils.$("toggleChangeHistory"),
            sopNumber: Utils.$("toggleSopNumber"),
            effectiveDate: Utils.$("toggleEffectiveDate"),
            revisionDate: Utils.$("toggleRevisionDate"),
            copyType: Utils.$("toggleCopyType")
        },

        inputs: {
            institute: Utils.$("institute"),
            department: Utils.$("department"),
            title: Utils.$("title"),
            sopNumber: Utils.$("sopNumber"),
            revisionNo: Utils.$("revisionNo"),
            effectiveDate: Utils.$("effectiveDate"),
            revisionDate: Utils.$("revisionDate"),
            nextReviewDate: Utils.$("nextReviewDate"),
            copyType: Utils.$("copyType"),
            purpose: Utils.$("purpose"),
            scope: Utils.$("scope"),
            responsibility: Utils.$("responsibility"),
            procedure: Utils.$("procedure"),
            precautions: Utils.$("precautions"),
            applicability: Utils.$("applicability"),
            abbreviations: Utils.$("abbreviations"),
            references: Utils.$("references"),
            annexures: Utils.$("annexures"),
            changeHistoryInput: Utils.$("changeHistoryInput"),
            preparedBy: Utils.$("preparedBy"),
            preparedDesig: Utils.$("preparedDesig"),
            preparedDate: Utils.$("preparedDate"),
            checkedBy: Utils.$("checkedBy"),
            checkedDesig: Utils.$("checkedDesig"),
            checkedDate: Utils.$("checkedDate"),
            approvedBy: Utils.$("approvedBy"),
            approvedDesig: Utils.$("approvedDesig"),
            approvedDate: Utils.$("approvedDate")
        },

        sections: {
            docControl: Utils.$("sectionDocControl"),
            applicability: Utils.$("sectionApplicability"),
            abbreviations: Utils.$("sectionAbbreviations"),
            references: Utils.$("sectionReferences"),
            annexures: Utils.$("sectionAnnexures"),
            changeHistory: Utils.$("sectionChangeHistory")
        }
    };

    /* ==================== VALIDATOR ==================== */
    function validateDOMElements() {
        const required = ['departmentSelect', 'sopSelect', 'templateSelect'];
        const missing = required.filter(el => !DOM[el]);

        if (missing.length > 0) {
            console.warn('⚠️ Missing required DOM elements:', missing);
            return false;
        }

        if (!DOM.preview) {
            console.warn('⚠️ Preview element not found');
            return false;
        }

        Utils.log('✅', 'All required DOM elements validated');
        return true;
    }

    /* ==================== DEPARTMENT LOADER ==================== */
    async function loadDepartments() {
        try {
            Utils.log('📁', 'Loading departments...');

            const data = await Utils.fetchJSON(`${CONFIG.DATA_PATH}departments.json`);
            CACHE.departments = data.departments;

            DOM.departmentSelect.innerHTML = '<option value="">Choose department...</option>';

            data.departments.forEach((dept) => {
                const deptId = Utils.getValue(dept, 'id', 'key');
                const deptName = dept.name || dept.title || deptId;

                DOM.departmentSelect.innerHTML += `<option value="${deptId}">${deptName}</option>`;
            });

            Utils.log('✅', `Loaded ${data.departments.length} departments`);
            return { success: true, count: data.departments.length };

        } catch (error) {
            DOM.departmentSelect.innerHTML = '<option value="">Error loading departments</option>';
            return Utils.handleError('loadDepartments', error);
        }
    }

    /* ==================== SOP INDEX LOADER ==================== */
    async function loadSOPIndex(deptId) {
        try {
            Utils.log('🔍', `Loading SOP index for: ${deptId}`);

            const cacheKey = Utils.cacheKey('index', deptId);
            const data = await Utils.fetchJSON(
                `${CONFIG.DATA_PATH}${deptId}/index.json`,
                cacheKey
            );

            DOM.sopSelect.innerHTML = '<option value="">Choose SOP...</option>';

            if (!data.instruments || !Array.isArray(data.instruments)) {
                throw new Error('Invalid index.json structure: missing "instruments" array');
            }

            data.instruments.forEach((sop) => {
                const sopId = Utils.getValue(sop, 'id', 'key');
                const sopName = sop.name || sop.title || sopId;

                DOM.sopSelect.innerHTML += `<option value="${sopId}">${sopName}</option>`;
            });

            DOM.sopSelect.disabled = false;

            Utils.log('✅', `Loaded ${data.instruments.length} SOPs for ${deptId}`);
            return { success: true, count: data.instruments.length };

        } catch (error) {
            DOM.sopSelect.innerHTML = '<option value="">Error loading SOPs</option>';
            DOM.sopSelect.disabled = true;
            return Utils.handleError('loadSOPIndex', error);
        }
    }

    /* ==================== SOP DATA LOADER ==================== */
    async function loadSOPData(deptId, sopId) {
        try {
            Utils.log('📄', `Loading SOP: ${deptId}/${sopId}`);

            const cacheKey = Utils.cacheKey('sop', deptId, sopId);
            const raw = await Utils.fetchJSON(
                `${CONFIG.DATA_PATH}${deptId}/${sopId}.json`,
                cacheKey
            );

            if (!raw.meta || !raw.sections) {
                throw new Error('Invalid SOP JSON: missing "meta" or "sections"');
            }

            const sopData = {
                institute: '',
                department: deptId,
                title: raw.meta.title || raw.meta.name || '',
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

                purpose: raw.sections.purpose || '',
                scope: raw.sections.scope || '',
                responsibility: raw.sections.responsibility || CONFIG.DEFAULT_RESPONSIBILITY,
                procedure: raw.sections.procedure || [],
                precautions: raw.sections.precautions || '',
                applicability: raw.sections.applicability || '',
                abbreviations: raw.sections.abbreviations || '',
                references: raw.sections.references || '',
                annexures: raw.sections.annexures || '',

                preparedBy: '',
                preparedDesig: '',
                preparedDate: '',
                checkedBy: '',
                checkedDesig: '',
                checkedDate: '',
                approvedBy: '',
                approvedDesig: '',
                approvedDate: '',

                changeHistory: []
            };

            State.update('sopData', sopData);
            Utils.log('✅', 'SOP data loaded and normalized', sopData);

            return { success: true, data: sopData };

        } catch (error) {
            return Utils.handleError('loadSOPData', error);
        }
    }

    /* ==================== TEMPLATE LOADER ==================== */
    async function loadTemplate(templateId) {
        try {
            Utils.log('📋', `Loading template: ${templateId}`);

            const html = await Utils.fetchText(
                `${CONFIG.TEMPLATE_PATH}${templateId}.html`,
                templateId
            );

            State.update('templateHTML', html);
            Utils.log('✅', 'Template loaded');

            return { success: true };

        } catch (error) {
            return Utils.handleError('loadTemplate', error);
        }
    }

    /* ==================== PAGE BREAK INSERTION ==================== */
    function insertPageBreaks(html) {
        // Add page break indicators after signature block
        // This helps users see where pages will split

        // Find signature block
        const signatureIndex = html.indexOf('class="signature-block"');

        if (signatureIndex > -1) {
            // Insert page break before signature if content is long
            const sections = (html.match(/<div class="section/g) || []).length;

            if (sections > 6) {
                const insertPoint = html.lastIndexOf('<div class="signature-block"');
                if (insertPoint > -1) {
                    const pageBreak = '<div class="page-break-indicator"></div>\n';
                    html = html.slice(0, insertPoint) + pageBreak + html.slice(insertPoint);
                }
            }
        }

        return html;
    }

    /* ==================== RENDERER ==================== */
    function renderPreview() {
        if (!State.templateHTML || !State.sopData) {
            Utils.log('⚠️', 'Cannot render: Missing template or data');
            return;
        }

        try {
            let html = State.templateHTML;

            // Replace simple string placeholders
            Object.keys(State.sopData).forEach((key) => {
                const value = State.sopData[key];
                if (typeof value === 'string') {
                    const regex = new RegExp(`{{${key}}}`, 'g');
                    html = html.replace(regex, value);
                }
            });

            // Handle procedure array
            if (Array.isArray(State.sopData.procedure)) {
                const procedureHTML = State.sopData.procedure
                    .map(step => `<li>${step}</li>`)
                    .join('');
                html = html.replace(/{{procedure}}/g, procedureHTML);
            }

            // Clean up remaining placeholders
            html = html.replace(/{{.*?}}/g, '');

            // Add page break indicators
            html = insertPageBreaks(html);

            DOM.preview.innerHTML = html;
            Utils.log('✅', 'Preview rendered with page breaks');

        } catch (error) {
            Utils.handleError('renderPreview', error);
            DOM.preview.innerHTML = `<div style="padding:40px;text-align:center;color:#e53e3e;background:#fff5f5;border-radius:8px;margin:20px;"><h3>Rendering Error</h3><p>${error.message}</p></div>`;
        }
    }

    /* ==================== SYNC INPUTS ==================== */
    function syncInputs() {
        if (!State.sopData) return;

        Object.keys(DOM.inputs).forEach((key) => {
            const input = DOM.inputs[key];
            if (input && State.sopData[key] !== undefined) {
                input.value = Utils.toTextarea(State.sopData[key]);
            }
        });

        Utils.log('✅', 'Inputs synced with SOP data');
    }

    /* ==================== TOGGLE VISIBILITY ==================== */
    function updateSectionVisibility() {
        if (!State.sopData) return;

        Object.keys(DOM.toggles).forEach((key) => {
            const toggle = DOM.toggles[key];
            if (toggle) {
                const enabled = State.sopData.sectionsEnabled?.[key] || 
                               State.sopData.fieldsEnabled?.[key] || 
                               false;
                toggle.checked = enabled;
            }
        });

        Object.keys(DOM.sections).forEach((key) => {
            const section = DOM.sections[key];
            const toggle = DOM.toggles[key];
            if (section && toggle) {
                section.style.display = toggle.checked ? 'block' : 'none';
            }
        });

        Utils.log('✅', 'Section visibility updated');
    }

    /* ==================== EVENT HANDLERS ==================== */
    function setupEventHandlers() {
        DOM.departmentSelect?.addEventListener('change', async (e) => {
            const deptId = e.target.value;

            DOM.sopSelect.innerHTML = '<option value="">Choose SOP...</option>';
            DOM.sopSelect.disabled = true;
            DOM.preview.innerHTML = '';
            State.reset();

            if (!deptId) return;

            State.update('currentDept', deptId);
            await loadSOPIndex(deptId);
        });

        DOM.sopSelect?.addEventListener('change', async (e) => {
            const sopId = e.target.value;
            if (!sopId || !State.currentDept) return;

            State.update('currentSOP', sopId);

            const result = await loadSOPData(State.currentDept, sopId);
            if (result.success) {
                syncInputs();
                updateSectionVisibility();

                if (State.templateHTML) {
                    renderPreview();
                } else {
                    await loadTemplate(DOM.templateSelect.value || 'sop-a4-classic');
                    renderPreview();
                }
            } else {
                DOM.preview.innerHTML = `<div style="padding:40px;text-align:center;color:#e53e3e;background:#fff5f5;border-radius:8px;margin:20px;"><h3>❌ Error Loading SOP</h3><p>${result.error}</p><p style="font-size:14px;margin-top:12px;">Context: ${result.context}</p></div>`;
            }
        });

        DOM.templateSelect?.addEventListener('change', async (e) => {
            const templateId = e.target.value;
            if (!templateId) return;

            State.update('currentTemplate', templateId);
            await loadTemplate(templateId);
            renderPreview();
        });

        Object.keys(DOM.inputs).forEach((key) => {
            const input = DOM.inputs[key];
            if (!input) return;

            input.addEventListener('input', () => {
                if (!State.sopData) return;

                if (key === 'procedure') {
                    State.sopData[key] = Utils.fromTextarea(input.value);
                } else {
                    State.sopData[key] = input.value;
                }

                renderPreview();
            });
        });

        Object.keys(DOM.toggles).forEach((key) => {
            const toggle = DOM.toggles[key];
            if (!toggle) return;

            toggle.addEventListener('change', () => {
                if (!State.sopData) return;

                if (State.sopData.sectionsEnabled) {
                    State.sopData.sectionsEnabled[key] = toggle.checked;
                }
                if (State.sopData.fieldsEnabled) {
                    State.sopData.fieldsEnabled[key] = toggle.checked;
                }

                updateSectionVisibility();
                renderPreview();
            });
        });

        Utils.log('✅', 'Event handlers configured');
    }

    /* ==================== PDF GENERATION ==================== */
    function setupPDFButton() {
        const printBtn = Utils.$("print-btn");
        if (!printBtn) return;

        printBtn.addEventListener('click', async function() {
            if (!DOM.preview || !DOM.preview.innerHTML.trim()) {
                alert('Please generate a document first by selecting department and SOP.');
                return;
            }

            if (typeof html2pdf === 'undefined') {
                alert('PDF library not loaded. Please refresh the page.');
                return;
            }

            const originalText = printBtn.innerHTML;
            printBtn.innerHTML = '⏳ Generating PDF...';
            printBtn.disabled = true;

            try {
                // Clone preview and remove page break indicators
                const clonedPreview = DOM.preview.cloneNode(true);
                const pageBreaks = clonedPreview.querySelectorAll('.page-break-indicator');
                pageBreaks.forEach(pb => pb.remove());

                const sopNum = DOM.inputs.sopNumber?.value || '001';
                const title = DOM.inputs.title?.value || 'SOP';
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

                // Mark as PDF rendering to hide page breaks
                document.body.classList.add('pdf-rendering');

                await html2pdf().set(options).from(clonedPreview).save();

                document.body.classList.remove('pdf-rendering');

                Utils.log('✅', `PDF generated: ${filename}`);

            } catch (error) {
                document.body.classList.remove('pdf-rendering');
                Utils.handleError('PDF Generation', error);
                alert('Error generating PDF. Please try again.');
            } finally {
                printBtn.innerHTML = originalText;
                printBtn.disabled = false;
            }
        });

        Utils.log('✅', 'PDF button initialized');
    }

    /* ==================== INITIALIZATION ==================== */
    async function initialize() {
        Utils.log('🔧', 'Starting initialization...');

        if (!validateDOMElements()) {
            console.error('❌ Critical DOM elements missing. App cannot start.');
            return;
        }

        setupEventHandlers();
        setupPDFButton();

        await loadDepartments();

        Utils.log('🎉', 'SOP App v2.2 fully initialized with MS Word preview!');

        window.SOPApp = {
            state: State,
            cache: CACHE,
            utils: Utils,
            config: CONFIG,
            reload: initialize
        };
    }

    /* ==================== AUTO-START ==================== */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();