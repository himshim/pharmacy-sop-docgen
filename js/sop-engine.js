/**
 * ═══════════════════════════════════════════════════════════════════
 * SOP ENGINE v4.0 - MODULAR ARCHITECTURE
 * 
 * MODULES:
 * 1. ConfigModule   - Settings & Path Detection
 * 2. UtilsModule    - Helpers (Logging, DOM)
 * 3. DataModule     - API Calls & Caching
 * 4. TemplateModule - Rendering Logic
 * 5. ExportModule   - PDF & Printing
 * 6. UIModule       - DOM Elements & Event Listeners
 * 7. CoreModule     - Main Application Logic
 * ═══════════════════════════════════════════════════════════════════
 */

window.initSOPApp = function () {
    'use strict';

    // ════════════════════════════════════════════════════════════════
    // 1. CONFIG MODULE (Settings)
    // ════════════════════════════════════════════════════════════════
    const ConfigModule = {
        DEBUG: true,
        PATHS: {
            DATA: null,      // Auto-detected later
            TEMPLATES: null  // Auto-detected later
        },
        DEFAULTS: {
            RESPONSIBILITY: 'Laboratory In-charge, faculty members, technical staff, and authorized users are responsible for implementation and compliance of this SOP.',
            SOP_NUMBER: '001'
        }
    };

    // ════════════════════════════════════════════════════════════════
    // 2. UTILS MODULE (Helpers)
    // ════════════════════════════════════════════════════════════════
    const UtilsModule = {
        log: (...args) => ConfigModule.DEBUG && console.log(...args),
        error: (...args) => console.error(...args),
        
        $: (id) => document.getElementById(id),
        
        // Safe string escape for HTML
        escapeHtml: (str) => {
            if (typeof str !== 'string') return str;
            return str.replace(/&/g, "&amp;")
                      .replace(/</g, "&lt;")
                      .replace(/>/g, "&gt;")
                      .replace(/"/g, "&quot;")
                      .replace(/'/g, "&#039;");
        }
    };

    // ════════════════════════════════════════════════════════════════
    // 3. DATA MODULE (Fetching & Caching)
    // ════════════════════════════════════════════════════════════════
    const DataModule = {
        cache: {
            templates: {},
            sops: {},
            departments: null
        },

        async resolvePaths() {
            const candidates = ['../', './']; // Try parent (partials) then current (root)
            
            for (const prefix of candidates) {
                try {
                    const testUrl = `${prefix}data/departments.json?v=${Date.now()}`;
                    const res = await fetch(testUrl);
                    if (res.ok) {
                        ConfigModule.PATHS.DATA = `${prefix}data/`;
                        ConfigModule.PATHS.TEMPLATES = `${prefix}templates/`;
                        UtilsModule.log(`✅ Paths Resolved: ${ConfigModule.PATHS.DATA}`);
                        return true;
                    }
                } catch (e) { /* continue */ }
            }
            
            // Fallback
            ConfigModule.PATHS.DATA = '../data/';
            ConfigModule.PATHS.TEMPLATES = '../templates/';
            UtilsModule.log('⚠️ Path detection failed. Using default: ../data/');
            return false;
        },

        async fetchJSON(endpoint) {
            const url = `${ConfigModule.PATHS.DATA}${endpoint}`;
            const res = await fetch(`${url}?v=${Date.now()}`);
            if (!res.ok) throw new Error(`Failed to load ${endpoint}`);
            return res.json();
        },

        async fetchTemplate(filename) {
            if (this.cache.templates[filename]) return this.cache.templates[filename];
            
            const url = `${ConfigModule.PATHS.TEMPLATES}${filename}.html`;
            const res = await fetch(`${url}?v=${Date.now()}`);
            if (!res.ok) throw new Error(`Failed to load template: ${filename}`);
            
            const text = await res.text();
            this.cache.templates[filename] = text;
            return text;
        },

        async getSOP(dept, sopId) {
            const key = `${dept}/${sopId}`;
            if (this.cache.sops[key]) return this.cache.sops[key];

            const data = await this.fetchJSON(`${dept}/${sopId}.json`);
            this.cache.sops[key] = data;
            return data;
        }
    };

    // ════════════════════════════════════════════════════════════════
    // 4. TEMPLATE MODULE (Rendering Engine)
    // ════════════════════════════════════════════════════════════════
    const TemplateModule = {
        render(templateStr, data) {
            if (!templateStr) return '';
            let html = templateStr;

            // 1. Conditional Blocks: {{#if key}}...{{/if}}
            html = html.replace(/\{\{#if ([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
                const val = data[key];
                const isTruthy = val && (Array.isArray(val) ? val.length > 0 : String(val).trim() !== '');
                return isTruthy ? content : '';
            });

            // 2. Variable Replacement: {{key}}
            Object.keys(data).forEach(key => {
                let value = data[key];
                if (value === undefined || value === null) value = '';

                // Auto-escape unless it's a known rich-text field
                if (typeof value === 'string') {
                    const isRichText = ['procedure', 'changeHistoryRows'].includes(key);
                    if (!isRichText && /[<>]/.test(value)) {
                        value = UtilsModule.escapeHtml(value);
                    }
                }

                const regex = new RegExp(`{{${key}}}`, 'g');
                html = html.replace(regex, value);
            });

            // 3. Cleanup empty tags
            return html.replace(/\{\{[^}]+\}\}/g, '');
        },

        formatProcedure(procArray) {
            if (!Array.isArray(procArray)) return '';
            return procArray.map(step => `<li>${step}</li>`).join('');
        },

        formatHistory(histArray) {
            if (!Array.isArray(histArray)) return '';
            return histArray.map(h => 
                `<tr><td>${h.rev}</td><td>${h.date}</td><td>${h.desc}</td></tr>`
            ).join('');
        }
    };

        // ════════════════════════════════════════════════════════════════
    // 5. EXPORT MODULE (Print & PDF) - IFRAME METHOD (Guaranteed Fix)
    // ════════════════════════════════════════════════════════════════
    const ExportModule = {
        print() {
            const preview = UtilsModule.$('preview') || UtilsModule.$('preview-content');
            if (!preview || !preview.innerHTML.trim()) {
                alert('Please generate a document first.');
                return;
            }

            // Create a hidden iframe
            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.width = '0px';
            iframe.style.height = '0px';
            iframe.style.border = 'none';
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow.document;
            
            // Write the clean document structure
            // We inline the CSS to ensure it renders exactly as intended without external interference
            doc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>SOP Print</title>
                    <style>
                        @page { size: A4; margin: 15mm; }
                        body { margin: 0; padding: 0; font-family: "Times New Roman", serif; }
                        #print-content { width: 100%; max-width: 210mm; margin: 0 auto; }
                        
                        /* Core Word-like Styles */
                        h1 { font-size: 16pt; font-weight: bold; text-align: center; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 20px; }
                        h2 { font-size: 14pt; font-weight: bold; background: #f0f0f0; padding: 2px 5px; border-left: 4px solid #000; margin-top: 20px; }
                        h3 { font-size: 12pt; font-weight: bold; text-decoration: underline; margin-top: 15px; }
                        p, li, td { font-size: 12pt; line-height: 1.5; text-align: justify; }
                        table { width: 100%; border-collapse: collapse; margin: 15px 0; border: 1px solid #000; }
                        th, td { border: 1px solid #000; padding: 5px; vertical-align: top; }
                        th { background: #e0e0e0; font-weight: bold; text-align: center; }
                        
                        /* Page Breaks */
                        .page-break-before { page-break-before: always; height: 0; display: block; }
                        
                        /* Hide Screen Indicators */
                        .page-break-indicator { display: none; }
                    </style>
                </head>
                <body>
                    <div id="print-content">
                        ${preview.innerHTML}
                    </div>
                </body>
                </html>
            `);
            doc.close();

            // Print after slight delay to allow rendering
            iframe.contentWindow.focus();
            setTimeout(() => {
                iframe.contentWindow.print();
                // cleanup
                setTimeout(() => document.body.removeChild(iframe), 1000);
            }, 500);
        },

        async generatePDF(filename) {
           // ... (Keep your existing PDF logic, it works fine) ...
           if (typeof html2pdf === 'undefined') {
                alert('PDF library not loaded.');
                return;
            }
            const element = UtilsModule.$('preview');
            // Clone and clean
            const clone = element.cloneNode(true);
            clone.querySelectorAll('.page-break-indicator').forEach(el => el.remove());

            const opt = {
                margin: [10, 10, 10, 10],
                filename: filename || 'document.pdf',
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            await html2pdf().set(opt).from(clone).save();
        }
    };

    // ════════════════════════════════════════════════════════════════
    // 6. UI MODULE (DOM & Events)
    // ════════════════════════════════════════════════════════════════
    const UIModule = {
        elements: {},
        
        init() {
            // Cache essential elements
            this.elements = {
                preview: UtilsModule.$('preview') || UtilsModule.$('preview-content'),
                deptSelect: UtilsModule.$('departmentSelect'),
                sopSelect: UtilsModule.$('sopSelect'),
                tmplSelect: UtilsModule.$('templateSelect'),
                printBtn: UtilsModule.$('browser-print-btn'),
                pdfBtn: UtilsModule.$('print-btn')
            };

            if (!this.elements.deptSelect) {
                UtilsModule.error('Critical UI elements missing');
                return false;
            }
            return true;
        },

        // Map of UI Input IDs to Data Keys
        inputMap: {
            'institute': 'institute', 'department': 'department', 'title': 'title',
            'sopNumber': 'sopNumber', 'revisionNo': 'revisionNo', 'effectiveDate': 'effectiveDate',
            'revisionDate': 'revisionDate', 'nextReviewDate': 'nextReviewDate', 'copyType': 'copyType',
            'purpose': 'purpose', 'scope': 'scope', 'responsibility': 'responsibility',
            'procedure': 'procedure', 'precautions': 'precautions', 'applicability': 'applicability',
            'abbreviations': 'abbreviations', 'references': 'references', 'annexures': 'annexures',
            'preparedBy': 'preparedBy', 'preparedDesig': 'preparedDesig', 'preparedDate': 'preparedDate',
            'checkedBy': 'checkedBy', 'checkedDesig': 'checkedDesig', 'checkedDate': 'checkedDate',
            'approvedBy': 'approvedBy', 'approvedDesig': 'approvedDesig', 'approvedDate': 'approvedDate'
        },

        // Map of Toggle IDs to Visibility Keys
        toggleMap: {
            'toggleDocControl': 'docControl', 'toggleApplicability': 'applicability',
            'toggleAbbreviations': 'abbreviations', 'toggleReferences': 'references',
            'toggleAnnexures': 'annexures', 'toggleChangeHistory': 'changeHistory',
            'toggleSopNumber': 'sopNumber', 'toggleEffectiveDate': 'effectiveDate',
            'toggleRevisionDate': 'revisionDate', 'toggleCopyType': 'copyType'
        },

        populateDepartments(list) {
            const html = `<option value="">Choose department...</option>` + 
                list.map(d => `<option value="${d.id || d.key}">${d.name}</option>`).join('');
            this.elements.deptSelect.innerHTML = html;
        },

        populateSOPs(list) {
            const html = `<option value="">Choose SOP...</option>` + 
                list.map(s => `<option value="${s.id || s.key}">${s.name}</option>`).join('');
            this.elements.sopSelect.innerHTML = html;
            this.elements.sopSelect.disabled = false;
        },

        renderPreview(html) {
            if (this.elements.preview) this.elements.preview.innerHTML = html;
        },

        syncInputs(data) {
            Object.entries(this.inputMap).forEach(([id, key]) => {
                const el = UtilsModule.$(id);
                if (el && data[key] !== undefined) {
                    el.value = Array.isArray(data[key]) ? data[key].join('\n') : data[key];
                }
            });
        },

        syncToggles(data) {
            Object.entries(this.toggleMap).forEach(([id, key]) => {
                const el = UtilsModule.$(id);
                const section = UtilsModule.$(`section${key.charAt(0).toUpperCase() + key.slice(1)}`);
                
                if (el) {
                    const isVisible = data.sectionsEnabled?.[key] || data.fieldsEnabled?.[key] || false;
                    el.checked = isVisible;
                }
                if (section) {
                    const isVisible = data.sectionsEnabled?.[key];
                    section.style.display = isVisible ? 'block' : 'none';
                }
            });
        }
    };

    // ════════════════════════════════════════════════════════════════
    // 7. CORE MODULE (Main Logic)
    // ════════════════════════════════════════════════════════════════
    const CoreModule = {
        state: {
            sopData: null,
            templateName: 'sop-a4-classic',
            debounce: null
        },

        async init() {
            if (!UIModule.init()) return;

            await DataModule.resolvePaths();

            try {
                const data = await DataModule.fetchJSON('departments.json');
                DataModule.cache.departments = data.departments;
                UIModule.populateDepartments(data.departments);
                this.bindEvents();
            } catch (e) {
                UtilsModule.error('Init failed', e);
                UIModule.elements.preview.innerHTML = `<p style="color:red">Error loading departments: ${e.message}</p>`;
            }
        },

        bindEvents() {
            // Department Change
            UIModule.elements.deptSelect.addEventListener('change', async (e) => {
                const dept = e.target.value;
                if (!dept) return;
                
                try {
                    const index = await DataModule.fetchJSON(`${dept}/index.json`);
                    UIModule.populateSOPs(index.instruments);
                } catch (e) { console.error(e); }
            });

            // SOP Change
            UIModule.elements.sopSelect.addEventListener('change', async (e) => {
                const dept = UIModule.elements.deptSelect.value;
                const sopId = e.target.value;
                if (dept && sopId) await this.loadSOP(dept, sopId);
            });

            // Template Change
            UIModule.elements.tmplSelect.addEventListener('change', (e) => {
                this.state.templateName = e.target.value;
                this.refreshPreview();
            });

            // Input Changes
            Object.keys(UIModule.inputMap).forEach(id => {
                const el = UtilsModule.$(id);
                if (el) el.addEventListener('input', () => this.handleInput(id, el.value));
            });

            // Toggle Changes
            Object.keys(UIModule.toggleMap).forEach(id => {
                const el = UtilsModule.$(id);
                if (el) el.addEventListener('change', () => this.handleToggle(id, el.checked));
            });

            // Buttons
            if (UIModule.elements.printBtn) {
                UIModule.elements.printBtn.addEventListener('click', () => ExportModule.print());
            }
            if (UIModule.elements.pdfBtn) {
                UIModule.elements.pdfBtn.addEventListener('click', async () => {
                    const originalText = UIModule.elements.pdfBtn.innerHTML;
                    UIModule.elements.pdfBtn.innerHTML = 'Generating...';
                    UIModule.elements.pdfBtn.disabled = true;
                    
                    const filename = `SOP_${this.state.sopData?.sopNumber || 'Draft'}.pdf`;
                    await ExportModule.generatePDF(filename);
                    
                    UIModule.elements.pdfBtn.innerHTML = originalText;
                    UIModule.elements.pdfBtn.disabled = false;
                });
            }
        },

        async loadSOP(dept, sopId) {
            try {
                const raw = await DataModule.getSOP(dept, sopId);
                
                // Initialize clean state
                this.state.sopData = {
                    ...raw,
                    // Standardize keys
                    title: raw.meta?.title || raw.title || '',
                    department: dept,
                    sopNumber: '', revisionNo: '00',
                    effectiveDate: '', revisionDate: '', nextReviewDate: '',
                    copyType: 'CONTROLLED',
                    responsibility: ConfigModule.DEFAULTS.RESPONSIBILITY,
                    // Visibility Defaults
                    sectionsEnabled: { docControl: true, sopNumber: true, effectiveDate: true, copyType: true },
                    fieldsEnabled: { sopNumber: true, effectiveDate: true, revisionDate: true, copyType: true },
                    // Content Defaults
                    procedure: raw.sections?.procedure || raw.procedure || [],
                    purpose: raw.sections?.purpose || raw.purpose || '',
                    scope: raw.sections?.scope || raw.scope || '',
                    precautions: raw.sections?.precautions || raw.precautions || '',
                };

                UIModule.syncInputs(this.state.sopData);
                UIModule.syncToggles(this.state.sopData);
                await this.refreshPreview();
            } catch (e) {
                UtilsModule.error(e);
            }
        },

        handleInput(id, value) {
            if (!this.state.sopData) return;
            const key = UIModule.inputMap[id];
            
            if (key === 'procedure') {
                this.state.sopData[key] = value.split('\n').filter(l => l.trim());
            } else {
                this.state.sopData[key] = value;
            }
            this.debouncedRender();
        },

        handleToggle(id, isChecked) {
            if (!this.state.sopData) return;
            const key = UIModule.toggleMap[id];
            
            // Update both objects to be safe
            if (!this.state.sopData.sectionsEnabled) this.state.sopData.sectionsEnabled = {};
            if (!this.state.sopData.fieldsEnabled) this.state.sopData.fieldsEnabled = {};
            
            this.state.sopData.sectionsEnabled[key] = isChecked;
            this.state.sopData.fieldsEnabled[key] = isChecked;
            
            UIModule.syncToggles(this.state.sopData); // Update UI blocks
            this.refreshPreview();
        },

        debouncedRender() {
            clearTimeout(this.state.debounce);
            this.state.debounce = setTimeout(() => this.refreshPreview(), 50);
        },

        async refreshPreview() {
            if (!this.state.sopData) return;
            
            const tmpl = await DataModule.fetchTemplate(this.state.templateName);
            
            // Prepare view data
            const viewData = { ...this.state.sopData };
            
            // Add formatted fields
            viewData.procedure = TemplateModule.formatProcedure(viewData.procedure);
            viewData.changeHistoryRows = TemplateModule.formatHistory(viewData.changeHistory);
            
            // Add Section flags (e.g., sectionDocControl)
            if (viewData.sectionsEnabled) {
                Object.keys(viewData.sectionsEnabled).forEach(k => {
                    const flagName = `section${k.charAt(0).toUpperCase() + k.slice(1)}`;
                    viewData[flagName] = viewData.sectionsEnabled[k];
                });
            }

            const html = TemplateModule.render(tmpl, viewData);
            UIModule.renderPreview(html);
        }
    };

    // 🚀 BOOTSTRAP
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => CoreModule.init());
    } else {
        CoreModule.init();
    }
};

// Auto-start if not called manually
if (typeof window.initSOPApp === 'function') {
    window.initSOPApp();
}
