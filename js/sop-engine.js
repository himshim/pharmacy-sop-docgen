/**
 * ═══════════════════════════════════════════════════════════════════
 * SOP ENGINE v4.2 - MODULAR ARCHITECTURE (FIXED)
 *
 * MODULES:
 * 1. ConfigModule   - Settings & Path Detection
 * 2. UtilsModule    - Helpers (Logging, DOM)
 * 3. DataModule     - API Calls & Caching
 * 4. TemplateModule - Rendering Logic
 * 5. ExportModule   - Print, PDF & DOCX
 * 6. UIModule       - DOM Elements & Event Listeners
 * 7. CoreModule     - Main Application Logic
 * ═══════════════════════════════════════════════════════════════════
 */

window.initSOPApp = function () {
  "use strict";

  // ════════════════════════════════════════════════════════════════
  // 1. CONFIG MODULE (Settings)
  // ════════════════════════════════════════════════════════════════
  const ConfigModule = {
    DEBUG: true,
    PATHS: {
      DATA: null, // Auto-detected
      TEMPLATES: null, // Auto-detected
    },
    DEFAULTS: {
      RESPONSIBILITY:
        "Laboratory In-charge, faculty members, technical staff, and authorized users are responsible for implementation and compliance of this SOP.",
      SOP_NUMBER: "001",
    },
  };

  // ════════════════════════════════════════════════════════════════
  // 2. UTILS MODULE (Helpers)
  // ════════════════════════════════════════════════════════════════
  const UtilsModule = {
    log: (...args) => ConfigModule.DEBUG && console.log(...args),
    error: (...args) => console.error(...args),
    $: (id) => document.getElementById(id),

    escapeHtml: (str) => {
      if (typeof str !== "string") return str;
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },
  };

  // ════════════════════════════════════════════════════════════════
  // 3. DATA MODULE (Fetching & Caching)
  // ════════════════════════════════════════════════════════════════
  const DataModule = {
    cache: {
      templates: {},
      sops: {},
      departments: null,
    },

    async resolvePaths() {
      const candidates = ["../", "./"];
      for (const prefix of candidates) {
        try {
          const res = await fetch(
            `${prefix}data/departments.json?v=${Date.now()}`
          );
          if (res.ok) {
            ConfigModule.PATHS.DATA = `${prefix}data/`;
            ConfigModule.PATHS.TEMPLATES = `${prefix}templates/`;
            UtilsModule.log(`✅ Paths Resolved: ${ConfigModule.PATHS.DATA}`);
            return true;
          }
        } catch (e) {
          /* continue */
        }
      }
      // Fallback
      ConfigModule.PATHS.DATA = "../data/";
      ConfigModule.PATHS.TEMPLATES = "../templates/";
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
    },
  };

  // ════════════════════════════════════════════════════════════════
  // 4. TEMPLATE MODULE (Rendering Engine)
  // ════════════════════════════════════════════════════════════════
  const TemplateModule = {
    render(templateStr, data) {
      if (!templateStr) return "";
      let html = templateStr;

      // Conditional Blocks: {{#if key}}...{{/if}}
      html = html.replace(
        /\{\{#if ([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
        (match, key, content) => {
          const val = data[key];
          const isTruthy =
            val &&
            (Array.isArray(val) ? val.length > 0 : String(val).trim() !== "");
          return isTruthy ? content : "";
        }
      );

      // Variable Replacement: {{key}}
      Object.keys(data).forEach((key) => {
        let value = data[key];
        if (value === undefined || value === null) value = "";

        if (typeof value === "string") {
          const isRichText = ["procedure", "changeHistoryRows"].includes(key);
          if (!isRichText && /[<>]/.test(value)) {
            value = UtilsModule.escapeHtml(value);
          }
        }

        const regex = new RegExp(`{{${key}}}`, "g");
        html = html.replace(regex, value);
      });

      return html.replace(/\{\{[^}]+\}\}/g, "");
    },

    formatProcedure(procArray) {
      if (!Array.isArray(procArray)) return "";
      return procArray.map((step) => `<li>${step}</li>`).join("");
    },

    formatHistory(histArray) {
      if (!Array.isArray(histArray)) return "";
      return histArray
        .map(
          (h) =>
            `<tr><td>${h.rev}</td><td>${h.date}</td><td>${h.desc}</td></tr>`
        )
        .join("");
    },
  };

  // ════════════════════════════════════════════════════════════════
  // 5. EXPORT MODULE (Print, PDF & DOCX)
  // ════════════════════════════════════════════════════════════════
  const ExportModule = {
    // [FIXED] LAYOUT UNLOCK PRINT METHOD
    print() {
      const preview =
        UtilsModule.$("preview") || UtilsModule.$("preview-content");
      if (!preview || !preview.innerHTML.trim()) {
        alert("Please generate a document first.");
        return;
      }

      // 1. SAVE STATE
      const originalBodyStyle = document.body.style.cssText;
      const originalWrapperStyle =
        UtilsModule.$("preview-wrapper").style.cssText;

      // 2. UNLOCK LAYOUT (Force browser to see full document flow)
      document.body.style.cssText =
        "height: auto !important; overflow: visible !important; position: static !important; display: block !important;";
      document.body.classList.add("printing-mode");

      // 3. PRINT
      window.print();

      // 4. RESTORE STATE
      setTimeout(() => {
        document.body.classList.remove("printing-mode");
        document.body.style.cssText = originalBodyStyle;
        UtilsModule.$("preview-wrapper").style.cssText = originalWrapperStyle;
      }, 500);
    },

    async generatePDF(filename) {
      if (
        confirm(
          'For best quality and editable text, please choose "Save as PDF" in the print dialog.\n\nClick OK to open Print Dialog, or Cancel to use the image-based generator.'
        )
      ) {
        this.print();
        return;
      }

      if (typeof html2pdf === "undefined") {
        alert("PDF library not loaded.");
        return;
      }

      const element =
        UtilsModule.$("preview") || UtilsModule.$("preview-content");
      if (!element) return;

      const clone = element.cloneNode(true);
      clone
        .querySelectorAll(".page-break-indicator")
        .forEach((el) => el.remove());

      const opt = {
        margin: [10, 10, 10, 10],
        filename: filename || "document.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      };

      await html2pdf().set(opt).from(clone).save();
    },

    // [NEW] SAVE AS DOCX
    async saveDOCX(filename) {
      const preview =
        UtilsModule.$("preview") || UtilsModule.$("preview-content");
      if (!preview || !preview.innerHTML.trim()) {
        alert("Please generate a document first.");
        return;
      }

      if (typeof htmlDocx === "undefined") {
        alert(
          "DOCX library (html-docx-js) not found. Add the script tag to index.html."
        );
        return;
      }

      const content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
                body { font-family: 'Times New Roman', serif; font-size: 12pt; }
                table { width: 100%; border-collapse: collapse; border: 1px solid #000; }
                td, th { border: 1px solid #000; padding: 5px; }
            </style></head><body>${preview.innerHTML}</body></html>`;

      try {
        const converted = htmlDocx.asBlob(content, { orientation: "portrait" });
        saveAs(converted, filename || "document.docx");
      } catch (e) {
        console.error(e);
        alert("Error generating DOCX.");
      }
    },
  };

  // ════════════════════════════════════════════════════════════════
  // 6. UI MODULE (DOM & Events)
  // ════════════════════════════════════════════════════════════════
  const UIModule = {
    elements: {},

    init() {
      this.elements = {
        preview: UtilsModule.$("preview") || UtilsModule.$("preview-content"),
        deptSelect: UtilsModule.$("departmentSelect"),
        sopSelect: UtilsModule.$("sopSelect"),
        tmplSelect: UtilsModule.$("templateSelect"),
        printBtn: UtilsModule.$("browser-print-btn"),
        pdfBtn: UtilsModule.$("print-btn"),
      };

      // DYNAMIC BUTTON: DOCX Export
      const toolbar =
        document.querySelector(".toolbar-buttons") ||
        document.querySelector(".bottom-action-bar");
      if (toolbar && !document.getElementById("docx-btn")) {
        const btn = document.createElement("button");
        btn.id = "docx-btn";
        btn.className = this.elements.pdfBtn
          ? this.elements.pdfBtn.className
          : "action-btn";
        btn.style.marginLeft = "10px";
        btn.style.backgroundColor = "#2b5797";
        btn.style.color = "white";
        btn.innerHTML = "💾 Word";
        if (this.elements.pdfBtn)
          toolbar.insertBefore(btn, this.elements.pdfBtn);
        else toolbar.appendChild(btn);
        this.elements.docxBtn = btn;
      }

      return !!this.elements.deptSelect;
    },

    inputMap: {
      institute: "institute",
      department: "department",
      title: "title",
      sopNumber: "sopNumber",
      revisionNo: "revisionNo",
      effectiveDate: "effectiveDate",
      revisionDate: "revisionDate",
      nextReviewDate: "nextReviewDate",
      copyType: "copyType",
      purpose: "purpose",
      scope: "scope",
      responsibility: "responsibility",
      procedure: "procedure",
      precautions: "precautions",
      applicability: "applicability",
      abbreviations: "abbreviations",
      references: "references",
      annexures: "annexures",
      preparedBy: "preparedBy",
      preparedDesig: "preparedDesig",
      preparedDate: "preparedDate",
      checkedBy: "checkedBy",
      checkedDesig: "checkedDesig",
      checkedDate: "checkedDate",
      approvedBy: "approvedBy",
      approvedDesig: "approvedDesig",
      approvedDate: "approvedDate",
    },

    toggleMap: {
      toggleDocControl: "docControl",
      toggleApplicability: "applicability",
      toggleAbbreviations: "abbreviations",
      toggleReferences: "references",
      toggleAnnexures: "annexures",
      toggleChangeHistory: "changeHistory",
      toggleSopNumber: "sopNumber",
      toggleEffectiveDate: "effectiveDate",
      toggleRevisionDate: "revisionDate",
      toggleCopyType: "copyType",
    },

    populateDepartments(list) {
      const html =
        `<option value="">Choose department...</option>` +
        list
          .map((d) => `<option value="${d.id || d.key}">${d.name}</option>`)
          .join("");
      this.elements.deptSelect.innerHTML = html;
    },

    populateSOPs(list) {
      const html =
        `<option value="">Choose SOP...</option>` +
        list
          .map((s) => `<option value="${s.id || s.key}">${s.name}</option>`)
          .join("");
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
          el.value = Array.isArray(data[key])
            ? data[key].join("\n")
            : data[key];
        }
      });
    },

    syncToggles(data) {
      Object.entries(this.toggleMap).forEach(([id, key]) => {
        const el = UtilsModule.$(id);
        const section = UtilsModule.$(
          `section${key.charAt(0).toUpperCase() + key.slice(1)}`
        );
        if (el) {
          const isVisible =
            data.sectionsEnabled?.[key] || data.fieldsEnabled?.[key] || false;
          el.checked = isVisible;
        }
        if (section) {
          section.style.display = data.sectionsEnabled?.[key]
            ? "block"
            : "none";
        }
      });
    },
  };

  // ════════════════════════════════════════════════════════════════
  // 7. CORE MODULE (Main Logic)
  // ════════════════════════════════════════════════════════════════
  const CoreModule = {
    state: {
      sopData: null,
      templateName: "sop-a4-classic",
      debounce: null,
    },

    async init() {
      UtilsModule.log("🚀 Initializing SOP Generator...");

      // 1. Check UI Elements First
      if (!UIModule.init()) {
        UtilsModule.error(
          "❌ FATAL: UI Module initialization failed. Missing critical DOM elements."
        );
        return;
      }

      // 2. Resolve Data Paths
      UtilsModule.log("🔍 Resolving data paths...");
      const pathResolved = await DataModule.resolvePaths();
      UtilsModule.log(`📂 Using data path: ${ConfigModule.PATHS.DATA}`);

      // 3. Load Departments with Full Error Handling
      try {
        UtilsModule.log("⏳ Fetching departments.json...");
        const data = await DataModule.fetchJSON("departments.json");

        // Validate structure
        if (!data) {
          throw new Error("departments.json returned empty data");
        }
        if (!data.departments) {
          throw new Error('departments.json missing "departments" property');
        }
        if (!Array.isArray(data.departments)) {
          throw new Error('"departments" is not an array');
        }
        if (data.departments.length === 0) {
          throw new Error("departments array is empty");
        }

        // Cache & Populate
        DataModule.cache.departments = data.departments;
        UIModule.populateDepartments(data.departments);
        UtilsModule.log(
          `✅ Loaded ${data.departments.length} departments successfully`
        );

        // 4. Bind Events AFTER successful load
        this.bindEvents();
        UtilsModule.log("✅ SOP Generator initialized successfully");
      } catch (e) {
        UtilsModule.error("❌ CRITICAL ERROR loading departments:", e);

        // User-Friendly Error Display
        const errorHTML = `
                    <div style="max-width: 600px; margin: 40px auto; padding: 30px; background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; font-family: system-ui, sans-serif;">
                        <h2 style="color: #856404; margin-top: 0;">⚠️ Initialization Failed</h2>
                        <p style="font-size: 16px; color: #333;"><strong>Unable to load department data</strong></p>
                        <p style="background: white; padding: 15px; border-left: 4px solid #dc3545; font-family: monospace; font-size: 13px; overflow-wrap: break-word;">
                            ${e.message || "Unknown error"}
                        </p>
                        <details style="margin-top: 20px; font-size: 14px;">
                            <summary style="cursor: pointer; font-weight: bold; color: #856404;">🔍 Debug Information</summary>
                            <ul style="margin-top: 10px; line-height: 2; color: #555;">
                                <li><strong>Current URL:</strong> <code>${
                                  window.location.href
                                }</code></li>
                                <li><strong>Expected Path:</strong> <code>${
                                  ConfigModule.PATHS.DATA
                                }departments.json</code></li>
                                <li><strong>Path Auto-Detect:</strong> ${
                                  pathResolved
                                    ? "✅ Success"
                                    : "❌ Failed (using fallback)"
                                }</li>
                                <li><strong>Error Type:</strong> ${e.name}</li>
                                <li><strong>Stack:</strong> <pre style="background: #f8f9fa; padding: 10px; overflow: auto; font-size: 11px;">${
                                  e.stack || "N/A"
                                }</pre></li>
                            </ul>
                        </details>
                        <div style="margin-top: 20px; padding: 15px; background: white; border-radius: 4px;">
                            <strong>💡 Possible Solutions:</strong>
                            <ol style="margin: 10px 0 0 0; padding-left: 20px; line-height: 1.8;">
                                <li>Check that <code>/data/departments.json</code> exists in your deployment</li>
                                <li>Verify file structure: <code>/data/</code>, <code>/templates/</code>, <code>/js/</code></li>
                                <li>Check browser console (F12) for network errors (404, CORS)</li>
                                <li>Clear cache and reload (Ctrl+Shift+R)</li>
                            </ol>
                        </div>
                    </div>
                `;

        // Show error in dropdown
        if (UIModule.elements.deptSelect) {
          UIModule.elements.deptSelect.innerHTML = `<option value="">❌ Error: ${e.message}</option>`;
        }

        // Show error in preview
        if (UIModule.elements.preview) {
          UIModule.elements.preview.innerHTML = errorHTML;
        }
      }
    },

    bindEvents() {
      // Department Selection
      if (UIModule.elements.deptSelect) {
        UIModule.elements.deptSelect.addEventListener("change", async (e) => {
          const dept = e.target.value;
          if (!dept) {
            UIModule.elements.sopSelect.innerHTML =
              '<option value="">Choose SOP...</option>';
            UIModule.elements.sopSelect.disabled = true;
            return;
          }

          try {
            UtilsModule.log(`📂 Loading SOPs for department: ${dept}`);
            const index = await DataModule.fetchJSON(`${dept}/index.json`);

            if (!index.instruments || !Array.isArray(index.instruments)) {
              throw new Error("Invalid index.json structure");
            }

            UIModule.populateSOPs(index.instruments);
            UtilsModule.log(`✅ Loaded ${index.instruments.length} SOPs`);
          } catch (e) {
            UtilsModule.error(`Failed to load SOPs for ${dept}:`, e);
            UIModule.elements.sopSelect.innerHTML = `<option value="">Error: ${e.message}</option>`;
          }
        });
      }

      // SOP Selection
      if (UIModule.elements.sopSelect) {
        UIModule.elements.sopSelect.addEventListener("change", async (e) => {
          const dept = UIModule.elements.deptSelect.value;
          const sopId = e.target.value;
          if (dept && sopId) await this.loadSOP(dept, sopId);
        });
      }

      // Template Selection
      if (UIModule.elements.tmplSelect) {
        UIModule.elements.tmplSelect.addEventListener("change", (e) => {
          this.state.templateName = e.target.value;
          this.refreshPreview();
        });
      }

      // Input Fields
      Object.keys(UIModule.inputMap).forEach((id) => {
        const el = UtilsModule.$(id);
        if (el)
          el.addEventListener("input", () => this.handleInput(id, el.value));
      });

      // Toggle Switches
      Object.keys(UIModule.toggleMap).forEach((id) => {
        const el = UtilsModule.$(id);
        if (el)
          el.addEventListener("change", () =>
            this.handleToggle(id, el.checked)
          );
      });

      // Print Button
      if (UIModule.elements.printBtn) {
        UIModule.elements.printBtn.addEventListener("click", () =>
          ExportModule.print()
        );
      }

      // PDF Button
      if (UIModule.elements.pdfBtn) {
        UIModule.elements.pdfBtn.addEventListener("click", async () => {
          const originalText = UIModule.elements.pdfBtn.innerHTML;
          UIModule.elements.pdfBtn.innerHTML = "Generating...";
          UIModule.elements.pdfBtn.disabled = true;

          const filename = `SOP_${
            this.state.sopData?.sopNumber || "Draft"
          }.pdf`;
          await ExportModule.generatePDF(filename);

          UIModule.elements.pdfBtn.innerHTML = originalText;
          UIModule.elements.pdfBtn.disabled = false;
        });
      }

      // DOCX Button
      if (UIModule.elements.docxBtn) {
        UIModule.elements.docxBtn.addEventListener("click", () => {
          const filename = `SOP_${
            this.state.sopData?.sopNumber || "Draft"
          }.docx`;
          ExportModule.saveDOCX(filename);
        });
      }
    },

    async loadSOP(dept, sopId) {
      try {
        UtilsModule.log(`📄 Loading SOP: ${dept}/${sopId}`);
        const raw = await DataModule.getSOP(dept, sopId);

        this.state.sopData = {
          ...raw,
          title: raw.meta?.title || raw.title || "",
          department: dept,
          sopNumber: "",
          revisionNo: "00",
          effectiveDate: "",
          revisionDate: "",
          nextReviewDate: "",
          copyType: "CONTROLLED",
          responsibility: ConfigModule.DEFAULTS.RESPONSIBILITY,
          sectionsEnabled: {
            docControl: true,
            sopNumber: true,
            effectiveDate: true,
            copyType: true,
          },
          fieldsEnabled: {
            sopNumber: true,
            effectiveDate: true,
            revisionDate: true,
            copyType: true,
          },
          procedure: raw.sections?.procedure || raw.procedure || [],
          purpose: raw.sections?.purpose || raw.purpose || "",
          scope: raw.sections?.scope || raw.scope || "",
          precautions: raw.sections?.precautions || raw.precautions || "",
        };

        UIModule.syncInputs(this.state.sopData);
        UIModule.syncToggles(this.state.sopData);
        await this.refreshPreview();

        UtilsModule.log("✅ SOP loaded successfully");
      } catch (e) {
        UtilsModule.error("Failed to load SOP:", e);
        alert(`Error loading SOP: ${e.message}`);
      }
    },

    handleInput(id, value) {
      if (!this.state.sopData) return;
      const key = UIModule.inputMap[id];
      if (key === "procedure") {
        this.state.sopData[key] = value.split("\n").filter((l) => l.trim());
      } else {
        this.state.sopData[key] = value;
      }
      this.debouncedRender();
    },

    handleToggle(id, isChecked) {
      if (!this.state.sopData) return;
      const key = UIModule.toggleMap[id];
      if (!this.state.sopData.sectionsEnabled)
        this.state.sopData.sectionsEnabled = {};
      this.state.sopData.sectionsEnabled[key] = isChecked;
      UIModule.syncToggles(this.state.sopData);
      this.refreshPreview();
    },

    debouncedRender() {
      clearTimeout(this.state.debounce);
      this.state.debounce = setTimeout(() => this.refreshPreview(), 50);
    },

    async refreshPreview() {
      if (!this.state.sopData) return;

      try {
        const tmpl = await DataModule.fetchTemplate(this.state.templateName);
        const viewData = { ...this.state.sopData };

        viewData.procedure = TemplateModule.formatProcedure(viewData.procedure);
        viewData.changeHistoryRows = TemplateModule.formatHistory(
          viewData.changeHistory
        );

        if (viewData.sectionsEnabled) {
          Object.keys(viewData.sectionsEnabled).forEach((k) => {
            const flagName = `section${k.charAt(0).toUpperCase() + k.slice(1)}`;
            viewData[flagName] = viewData.sectionsEnabled[k];
          });
        }

        const html = TemplateModule.render(tmpl, viewData);
        UIModule.renderPreview(html);
      } catch (e) {
        UtilsModule.error("Failed to refresh preview:", e);
      }
    },
  };

  // Bootstrap
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => CoreModule.init());
  } else {
    CoreModule.init();
  }
};

// ★★★ ADD THIS LINE ★★★
window.initSOPApp();
