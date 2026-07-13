/**
 * ═══════════════════════════════════════════════════════════════════
 * SOP ENGINE v4.3 - PRODUCTION READY
 *
 * MODULES:
 * 1. ConfigModule   - Settings & Path Detection
 * 2. UtilsModule    - Helpers (Logging, DOM)
 * 3. DataModule     - API Calls & Caching
 * 4. TemplateModule - Rendering Logic
 * 5. ExportModule   - Print, PDF & DOCX (UNIVERSAL)
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
      if (typeof window.renderTemplate === "function") {
        return window.renderTemplate(templateStr, data);
      }
      return templateStr;
    },

    formatProcedure(procArray) {
      if (!Array.isArray(procArray)) return "";
      return procArray
        .map(
          (step, idx) =>
            `<li contenteditable="true" data-key="procedure" data-index="${idx}" data-placeholder="[Enter step]">${step}</li>`
        )
        .join("");
    },

    formatPrecautions(precArray) {
      if (!Array.isArray(precArray)) return "";
      return precArray
        .map(
          (step, idx) =>
            `<li contenteditable="true" data-key="precautions" data-index="${idx}" data-placeholder="[Enter precaution]">${step}</li>`
        )
        .join("");
    },

    formatHistory(histArray) {
      if (!Array.isArray(histArray)) return "";
      return histArray
        .map(
          (h) =>
            `<tr><td>${h.rev}</td><td>${h.date}</td><td>${h.desc}</td></tr>`
        )
        .join("");
    }, // ✅ COMMA ADDED HERE

    // Smart Multi-line Formatter
    formatMultiline(text, type = "paragraph") {
      if (!text || typeof text !== "string") return "";

      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length === 0) return "";

      switch (type) {
        case "list":
          return lines.map((l) => `<li>${l.trim()}</li>`).join("");
        case "paragraph":
          return lines.map((l) => `<p>${l.trim()}</p>`).join("");
        default:
          return `<p>${lines.join("<br>")}</p>`;
      }
    }, // ✅ NO COMMA (last item)
  }; // ✅ ONLY ONE CLOSING BRACE

  // ════════════════════════════════════════════════════════════════
  // 5. EXPORT MODULE (Print, PDF & DOCX) - UNIVERSAL v2.1 FIXED
  // ════════════════════════════════════════════════════════════════
  const ExportModule = {
    CONFIG: {
      PRINT_MARGIN_MM: 10,
      PDF_SCALE: 2,
      PDF_FORMAT: "a4",
      WORD_FONT_FAMILY: "Calibri, Arial, sans-serif",
      WORD_FONT_SIZE: "12pt",
    },

    getPreviewElement() {
      return (
        UtilsModule.$("preview") ||
        UtilsModule.$("preview-content") ||
        document.querySelector('[role="main"]') ||
        document.body
      );
    },

    hasContent() {
      const el = this.getPreviewElement();
      return el && el.innerHTML && el.innerHTML.trim().length > 0;
    },

    // ────── 1. PRINT ──────
    print() {
      if (!this.hasContent()) {
        alert("❌ No content to print. Please generate a document first.");
        return;
      }

      try {
        UtilsModule.log("🖨️  Opening print dialog...");
        const originalBodyStyle = document.body.style.cssText;
        const originalHtmlStyle = document.documentElement.style.cssText;

        document.body.style.cssText =
          "height: auto !important; overflow: visible !important;";
        document.documentElement.style.cssText = "height: auto !important;";
        document.body.classList.add("printing-mode");

        window.print();

        setTimeout(() => {
          document.body.classList.remove("printing-mode");
          document.body.style.cssText = originalBodyStyle;
          document.documentElement.style.cssText = originalHtmlStyle;
        }, 500);
      } catch (error) {
        UtilsModule.error("❌ Print failed:", error);
        alert("Print dialog failed. Please try again.");
      }
    },

    // ────── 2. PDF EXPORT (DIRECT VECTOR RENDER - pdfmake) ──────
    async exportPDF(filename) {
      if (!this.hasContent()) {
        alert("❌ No content to export. Please generate a document first.");
        return;
      }

      if (typeof pdfMake === "undefined") {
        UtilsModule.error("❌ pdfmake library not found");
        return this.showLibraryMissingError("pdfmake");
      }

      try {
        UtilsModule.log("📄 Generating Vector PDF...");
        const previewElement = this.getPreviewElement();

        // Helper to parse formatting runs (bold/italic)
        const parseTextRunsForPdf = (element) => {
          const runs = [];
          element.childNodes.forEach((child) => {
            if (child.nodeType === Node.TEXT_NODE) {
              runs.push(child.textContent);
            } else if (child.nodeType === Node.ELEMENT_NODE) {
              const tag = child.tagName.toLowerCase();
              const run = { text: child.textContent };
              if (tag === "b" || tag === "strong") run.bold = true;
              if (tag === "i" || tag === "em") run.italic = true;
              runs.push(run);
            }
          });
          return runs.length > 0 ? runs : element.textContent.trim();
        };

        const compileHtmlToPdfMake = (rootEl) => {
          const docDefinition = {
            content: [],
            styles: {
              header: { fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 12] },
              subheader: { fontSize: 12, bold: true, margin: [0, 12, 0, 4] },
              heading3: { fontSize: 10, bold: true, margin: [0, 8, 0, 2] },
              paragraph: { fontSize: 10.5, margin: [0, 0, 0, 6], leading: 1.3, alignment: 'justify' },
              list: { fontSize: 10.5, margin: [8, 0, 0, 4], leading: 1.25 },
              tableHeader: { bold: true, fontSize: 10, fillColor: '#1e293b', color: '#ffffff', margin: [4, 4, 4, 4] },
              tableCell: { fontSize: 9.5, margin: [4, 4, 4, 4] }
            },
            defaultStyle: {
              fontSize: 10.5
            }
          };

          const parseNode = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent.trim();
              if (text.length > 0) {
                docDefinition.content.push({ text: text, style: 'paragraph' });
              }
              return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            if (node.classList.contains("doc-control-text") || 
                node.classList.contains("page-break-indicator") ||
                node.style.display === "none") {
              return;
            }
            const tag = node.tagName.toLowerCase();

            if (tag === "h1") {
              docDefinition.content.push({ text: parseTextRunsForPdf(node), style: 'header' });
            } else if (tag === "h2") {
              const isBreak = node.classList.contains("page-break-before") || node.previousElementSibling?.classList.contains("page-break-before");
              docDefinition.content.push({ 
                text: node.textContent.trim(), 
                style: 'subheader', 
                pageBreak: isBreak ? 'before' : undefined 
              });
            } else if (tag === "h3") {
              docDefinition.content.push({ text: node.textContent.trim(), style: 'heading3' });
            } else if (tag === "p") {
              docDefinition.content.push({ text: parseTextRunsForPdf(node), style: 'paragraph' });
            } else if (tag === "hr") {
              docDefinition.content.push({
                canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 0.5, strokeColor: '#cbd5e0' }]
              });
            } else if (tag === "ol" || tag === "ul") {
              const listItems = [];
              node.querySelectorAll("li").forEach(li => {
                listItems.push({ text: parseTextRunsForPdf(li) });
              });
              if (tag === "ol") {
                docDefinition.content.push({ ol: listItems, style: 'list' });
              } else {
                docDefinition.content.push({ ul: listItems, style: 'list' });
              }
            } else if (tag === "table") {
              const tableData = [];
              const rows = node.querySelectorAll("tr");
              rows.forEach((tr) => {
                const rowData = [];
                const cells = tr.querySelectorAll("th, td");
                cells.forEach((cell) => {
                  const isHeader = cell.tagName.toLowerCase() === "th";
                  const colSpan = parseInt(cell.getAttribute("colspan") || 1);
                  
                  const cellData = {
                    text: parseTextRunsForPdf(cell),
                    style: isHeader ? 'tableHeader' : 'tableCell'
                  };
                  if (colSpan > 1) cellData.colSpan = colSpan;
                  rowData.push(cellData);
                  
                  for (let i = 1; i < colSpan; i++) {
                    rowData.push({});
                  }
                });
                tableData.push(rowData);
              });

              if (tableData.length > 0) {
                const colCount = tableData[0].length;
                const widths = Array(colCount).fill('*');
                if (colCount === 2) {
                  widths[0] = 130;
                }
                docDefinition.content.push({
                  table: {
                    headerRows: node.querySelector("thead") ? 1 : 0,
                    widths: widths,
                    body: tableData
                  },
                  layout: {
                    hLineWidth: function (i, node) {
                      return 0.5;
                    },
                    vLineWidth: function (i) {
                      return 0;
                    },
                    hLineColor: function (i, node) {
                      return (i === 0 || i === 1) ? '#0f172a' : '#cbd5e0';
                    }
                  },
                  margin: [0, 4, 0, 8]
                });
              }
            } else if (tag === "div") {
              node.childNodes.forEach(child => parseNode(child));
            }
          };

          rootEl.childNodes.forEach(node => parseNode(node));
          return docDefinition;
        };

        const docDefinition = compileHtmlToPdfMake(previewElement);
        pdfMake.createPdf(docDefinition).download(filename || "SOP_Document.pdf");
        UtilsModule.log("✅ Vector PDF exported successfully");
        alert("✅ PDF saved successfully (Vector Format)!");
      } catch (error) {
        UtilsModule.error("❌ PDF export failed:", error);
        alert(`❌ PDF export failed: ${error.message}`);
      }
    },

    // ────── 3. WORD EXPORT (NATIVE DOCX BUILDER - docx.js) ──────
    async exportDOCX(filename) {
      if (!this.hasContent()) {
        alert("❌ No content to export. Please generate a document first.");
        return;
      }

      if (typeof window.docx === "undefined") {
        UtilsModule.error("❌ docx.js library not found");
        return this.showLibraryMissingError("docx");
      }

      if (typeof saveAs === "undefined") {
        UtilsModule.error("❌ FileSaver.js library not found");
        return this.showLibraryMissingError("FileSaver");
      }

      try {
        UtilsModule.log("📝 Generating Native DOCX...");
        const previewElement = this.getPreviewElement();

        const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel } = window.docx;
        const children = [];

        // Helper to parse formatting runs (bold/italic)
        const parseTextRunsForDocx = (element, isHeader = false) => {
          const runs = [];
          element.childNodes.forEach((child) => {
            if (child.nodeType === Node.TEXT_NODE) {
              runs.push(new TextRun({ 
                text: child.textContent, 
                size: 22, 
                font: "Times New Roman", 
                color: isHeader ? "FFFFFF" : undefined 
              }));
            } else if (child.nodeType === Node.ELEMENT_NODE) {
              const tag = child.tagName.toLowerCase();
              if (tag === "br") {
                runs.push(new TextRun({ text: "", break: 1 }));
                return;
              }
              const isBold = tag === "b" || tag === "strong";
              const isItalic = tag === "i" || tag === "em";
              runs.push(new TextRun({
                text: child.textContent,
                bold: isBold || isHeader,
                italics: isItalic,
                size: 22,
                font: "Times New Roman",
                color: isHeader ? "FFFFFF" : undefined
              }));
            }
          });
          return runs.length > 0 ? runs : [new TextRun({ 
            text: element.textContent.trim(), 
            size: 22, 
            font: "Times New Roman", 
            color: isHeader ? "FFFFFF" : undefined,
            bold: isHeader 
          })];
        };

        let olCounter = 0;
        let h2Counter = 0;

        const parseNode = (node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            if (text.length > 0) {
              children.push(new Paragraph({
                children: [new TextRun({ text: text, size: 22, font: "Times New Roman" })],
                spacing: { after: 120 }
              }));
            }
            return;
          }
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          if (node.classList.contains("doc-control-text") || 
              node.classList.contains("page-break-indicator") ||
              node.style.display === "none") {
            return;
          }
          const tag = node.tagName.toLowerCase();

          if (tag === "h1") {
            children.push(new Paragraph({
              children: [new TextRun({ text: node.textContent.trim(), bold: true, size: 28, font: "Times New Roman" })],
              spacing: { before: 240, after: 120 },
              alignment: "center"
            }));
          } else if (tag === "h2") {
            h2Counter++;
            const isBreak = node.classList.contains("page-break-before") || node.previousElementSibling?.classList.contains("page-break-before");
            const headingText = `${h2Counter}. ${node.textContent.trim().toUpperCase()}`;
            const paragraphOpts = {
              children: [new TextRun({ text: headingText, bold: true, size: 24, font: "Times New Roman" })],
              spacing: { before: 200, after: 100 }
            };
            if (isBreak) paragraphOpts.pageBreakBefore = true;
            children.push(new Paragraph(paragraphOpts));
          } else if (tag === "h3") {
            children.push(new Paragraph({
              children: [new TextRun({ text: node.textContent.trim(), bold: true, size: 22, font: "Times New Roman" })],
              spacing: { before: 160, after: 80 }
            }));
          } else if (tag === "p") {
            children.push(new Paragraph({
              children: parseTextRunsForDocx(node),
              spacing: { after: 120 }
            }));
          } else if (tag === "ol" || tag === "ul") {
            if (tag === "ol") olCounter++;
            node.querySelectorAll("li").forEach((li, idx) => {
              const paragraphOpts = {
                children: parseTextRunsForDocx(li),
                spacing: { after: 80 }
              };
              if (tag === "ul") {
                paragraphOpts.bullet = { level: 0 };
              } else if (tag === "ol") {
                // Use distinct numbering instances to let each list restart at 1
                paragraphOpts.numbering = { reference: `decimal-numbering-${olCounter}`, level: 0 };
              }
              children.push(new Paragraph(paragraphOpts));
            });
          } else if (tag === "table") {
            // Count total columns in the table (by finding the row with max col-span sum)
            let totalCols = 1;
            node.querySelectorAll("tr").forEach((tr) => {
              let rowCols = 0;
              tr.querySelectorAll("th, td").forEach((cell) => {
                rowCols += parseInt(cell.getAttribute("colspan") || 1);
              });
              if (rowCols > totalCols) totalCols = rowCols;
            });

            const rows = [];
            node.querySelectorAll("tr").forEach((tr) => {
              const cells = [];
              tr.querySelectorAll("th, td").forEach((cell) => {
                const isHeader = cell.tagName.toLowerCase() === "th";
                const colSpan = parseInt(cell.getAttribute("colspan") || 1);
                
                // Calculate DXA width: Standard full table body width is 9000 DXA (twentieths of a point)
                const cellWidthDxa = Math.round((9000 / totalCols) * colSpan);
                
                const cellOpts = {
                  children: [new Paragraph({
                    children: parseTextRunsForDocx(cell, isHeader),
                    spacing: { before: 80, after: 80 }
                  })],
                  width: { size: cellWidthDxa, type: WidthType.DXA }
                };
                if (colSpan > 1) cellOpts.columnSpan = colSpan;
                if (isHeader) cellOpts.shading = { fill: "1E293B" };
                
                cells.push(new TableCell(cellOpts));
              });
              rows.push(new TableRow({ children: cells }));
            });

            if (rows.length > 0) {
              children.push(new Table({
                rows: rows,
                width: { size: 9000, type: WidthType.DXA },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E0" },
                  bottom: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E0" },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE },
                  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E0" },
                  insideVertical: { style: BorderStyle.NONE }
                }
              }));
              children.push(new Paragraph({ spacing: { after: 120 } }));
            }
          } else if (tag === "div") {
            node.childNodes.forEach(child => parseNode(child));
          }
        };

        previewElement.childNodes.forEach(node => parseNode(node));

        // Create 10 distinct numbering reference instances so different lists start at 1
        const numberingConfig = [];
        for (let k = 1; k <= 10; k++) {
          numberingConfig.push({
            reference: `decimal-numbering-${k}`,
            levels: [
              {
                level: 0,
                format: "decimal",
                text: "%1.",
                alignment: "left",
                style: {
                  paragraph: {
                    indent: { left: 720, hanging: 360 }
                  }
                }
              }
            ]
          });
        }

        const doc = new Document({
          numbering: {
            config: numberingConfig
          },
          sections: [{
            properties: {},
            children: children
          }]
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, filename || "SOP_Document.docx");
        UtilsModule.log("✅ DOCX exported successfully");
        alert("✅ Word document saved successfully (Native Format)!");
      } catch (error) {
        UtilsModule.error("❌ DOCX export failed:", error);
        alert(`❌ Word export failed: ${error.message}`);
      }
    },

    showLibraryMissingError(libName) {
      const message = `❌ Missing Library: ${libName}
      
To use this feature, make sure the scripts are loaded in your index.html.`;
      alert(message);
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
        zoomToggleBtn: UtilsModule.$("zoom-toggle-btn"),
        uploader: UtilsModule.$("uploadSopJson"),
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
      // PCI
      pciCourseCode: "pciCourseCode",
      pciExperimentRef: "pciExperimentRef",
      pciLabCategory: "pciLabCategory",
      pciDocumentationClause: "pciDocumentationClause",
      // NAAC
      naacAssetPage: "naacAssetPage",
      naacLedgerId: "naacLedgerId",
      naacLogbookRef: "naacLogbookRef",
      naacAmcRef: "naacAmcRef",
      naacCalibrationCert: "naacCalibrationCert",
      naacWasteProtocol: "naacWasteProtocol",
      naacReviewClause: "naacReviewClause",
      // ISO
      isoReferenceStandard: "isoReferenceStandard",
      isoToleranceLimit: "isoToleranceLimit",
      isoCapaAction: "isoCapaAction",
      isoRecordRetentionClause: "isoRecordRetentionClause",
      // GMP
      gmpSupersedesId: "gmpSupersedesId",
      gmpLineClearance: "gmpLineClearance",
      gmpCleaningProtocol: "gmpCleaningProtocol",
      gmpOosDirective: "gmpOosDirective",
      gmpDataIntegrityStamp: "gmpDataIntegrityStamp",
    },

    toggleMap: {
      toggleDocControl: "docControl",
      toggleApplicability: "applicability",
      toggleAbbreviations: "abbreviations",
      toggleReferences: "references",
      toggleAnnexures: "annexures",
      toggleChangeHistory: "changeHistory",
      toggleSopNumber: "sopNumber",
      toggleRevisionNo: "revisionNo",
      toggleEffectiveDate: "effectiveDate",
      toggleRevisionDate: "revisionDate",
      toggleNextReviewDate: "nextReviewDate",
      toggleCopyType: "copyType",
      // PCI
      togglePciDetails: "pciDetails",
      togglePciDocumentation: "pciDocumentation",
      // NAAC
      toggleNaacDetails: "naacDetails",
      toggleNaacWaste: "naacWaste",
      toggleNaacReview: "naacReview",
      // ISO
      toggleIsoCalibration: "isoCalibration",
      toggleIsoCapa: "isoCapa",
      toggleIsoRetention: "isoRetention",
      // GMP
      toggleGmpClearance: "gmpClearance",
      toggleGmpCleaning: "gmpCleaning",
      toggleGmpOos: "gmpOos",
      toggleGmpFootnote: "gmpFootnote",
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

        // ✅ Calculate visibility ONCE (default to true if not explicitly set to false)
        const isVisible = data.sectionsEnabled?.[key] !== false;

        // Update checkbox visual state
        if (el) {
          el.checked = isVisible;
        }

        // Handle section visibility (cards like Document Control)
        if (section) {
          section.style.display = isVisible ? "block" : "none";
        }

        // Handle individual field visibility
        const fieldIds = [
          "sopNumber",
          "revisionNo",
          "effectiveDate",
          "revisionDate",
          "nextReviewDate",
          "copyType",
        ];
        if (fieldIds.includes(key)) {
          const field = UtilsModule.$(key);
          if (field) {
            const formGroup = field.closest(".form-group");
            if (formGroup) {
              formGroup.style.display = isVisible ? "block" : "none";
            }
          }
        }
      });
    },
  }; // ✅ CLOSES UIModule

  // ════════════════════════════════════════════════════════════════
  // 7. CORE MODULE (Main Logic)

  // ════════════════════════════════════════════════════════════════
  const CoreModule = {
    state: {
      sopData: null,
      templateName: "sop-a4-classic",
      debounce: null,
      isExpertMode: false,
      isFluidPreview: false,
      activeInlineKey: null,
      activeInlineIndex: null,
    },

    async init() {
      UtilsModule.log("🚀 Initializing SOP Generator...");

      if (!UIModule.init()) {
        UtilsModule.error(
          "❌ FATAL: UI Module initialization failed. Missing critical DOM elements."
        );
        return;
      }

      UtilsModule.log("🔍 Resolving data paths...");
      const pathResolved = await DataModule.resolvePaths();
      UtilsModule.log(`📂 Using data path: ${ConfigModule.PATHS.DATA}`);

      try {
        UtilsModule.log("⏳ Fetching departments.json...");
        const data = await DataModule.fetchJSON("departments.json");

        if (
          !data ||
          !data.departments ||
          !Array.isArray(data.departments) ||
          data.departments.length === 0
        ) {
          throw new Error("Invalid departments.json structure or empty array");
        }

        DataModule.cache.departments = data.departments;
        UIModule.populateDepartments(data.departments);
        UtilsModule.log(
          `✅ Loaded ${data.departments.length} departments successfully`
        );

        this.bindEvents();
        window.addEventListener("beforeunload", (e) => {
          if (this.state && this.state.sopData) {
            e.preventDefault();
            e.returnValue = "";
          }
        });
        window.addEventListener("resize", () => {
          if (window.innerWidth < 768) {
            this.refreshPreview();
          }
        });
        this.updateSidebarVisibility();
        UtilsModule.log("✅ SOP Generator initialized successfully");
      } catch (e) {
        UtilsModule.error("❌ CRITICAL ERROR loading departments:", e);
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
                                <li><strong>Expected Path:</strong> <code>${
                                  ConfigModule.PATHS.DATA
                                }departments.json</code></li>
                                <li><strong>Error:</strong> ${e.message}</li>
                            </ul>
                        </details>
                    </div>
                `;

        if (UIModule.elements.deptSelect) {
          UIModule.elements.deptSelect.innerHTML = `<option value="">❌ Error: ${e.message}</option>`;
        }
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

      // Dynamic File Upload
      if (UIModule.elements.uploader) {
        UIModule.elements.uploader.addEventListener("change", (e) => {
          const file = e.target.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const data = JSON.parse(event.target.result);
              
              // Reset Selectors
              if (UIModule.elements.deptSelect) UIModule.elements.deptSelect.value = "";
              if (UIModule.elements.sopSelect) {
                UIModule.elements.sopSelect.innerHTML = '<option value="">[Custom SOP]</option>';
                UIModule.elements.sopSelect.value = "";
                UIModule.elements.sopSelect.disabled = true;
              }

              await this.loadSOP(null, null, data);
              UtilsModule.log("✅ Custom SOP uploaded and loaded successfully");
            } catch (err) {
              UtilsModule.error("Failed to parse uploaded JSON:", err);
              alert(`Failed to load JSON file: ${err.message}`);
            }
          };
          reader.readAsText(file);
        });
      }

      // Template Selection
      if (UIModule.elements.tmplSelect) {
        UIModule.elements.tmplSelect.addEventListener("change", (e) => {
          this.state.templateName = e.target.value;
          this.updateSidebarVisibility();
          this.refreshPreview();
        });
      }

      // Expert Mode Toggle Selection
      const expertModeToggle = UtilsModule.$("expertModeToggle");
      if (expertModeToggle) {
        expertModeToggle.addEventListener("change", (e) => {
          this.state.isExpertMode = e.target.checked;
          this.updateSidebarVisibility();
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

      // Zoom Toggle Button
      if (UIModule.elements.zoomToggleBtn) {
        // Set initial label
        UIModule.elements.zoomToggleBtn.innerHTML = this.state.isFluidPreview ? "📐 Page Layout" : "📄 Fluid View";

        UIModule.elements.zoomToggleBtn.addEventListener("click", () => {
          this.state.isFluidPreview = !this.state.isFluidPreview;
          if (this.state.isFluidPreview) {
            UIModule.elements.zoomToggleBtn.innerHTML = "📐 Page Layout";
          } else {
            UIModule.elements.zoomToggleBtn.innerHTML = "📄 Fluid View";
          }
          this.refreshPreview();
        });
      }

      // PDF Button
      if (UIModule.elements.pdfBtn) {
        UIModule.elements.pdfBtn.addEventListener("click", async () => {
          const originalText = UIModule.elements.pdfBtn.innerHTML;
          UIModule.elements.pdfBtn.innerHTML = "⏳ Generating...";
          UIModule.elements.pdfBtn.disabled = true;

          const filename = `SOP_${
            this.state.sopData?.sopNumber || "Draft"
          }.pdf`;
          await ExportModule.exportPDF(filename);

          UIModule.elements.pdfBtn.innerHTML = originalText;
          UIModule.elements.pdfBtn.disabled = false;
        });
      }

      // DOCX Button
      if (UIModule.elements.docxBtn) {
        UIModule.elements.docxBtn.addEventListener("click", async () => {
          const originalText = UIModule.elements.docxBtn.innerHTML;
          UIModule.elements.docxBtn.innerHTML = "⏳ Generating...";
          UIModule.elements.docxBtn.disabled = true;

          const filename = `SOP_${
            this.state.sopData?.sopNumber || "Draft"
          }.docx`;
          await ExportModule.exportDOCX(filename);

          UIModule.elements.docxBtn.innerHTML = originalText;
          UIModule.elements.docxBtn.disabled = false;
        });
      }

      // ════════════════════════════════════════════════════════════════
      // WYSIWYG INTERACTIVE INLINE EDITOR & TWO-WAY SYNC
      // ════════════════════════════════════════════════════════════════
      
      // Create global Action Bar dynamically if it doesn't exist
      if (!document.getElementById("wysiwyg-action-bar")) {
        const bar = document.createElement("div");
        bar.id = "wysiwyg-action-bar";
        bar.innerHTML = `
          <button class="wysiwyg-action-btn btn-add" title="Add Step Below">➕</button>
          <button class="wysiwyg-action-btn btn-delete" title="Delete Step">🗑️</button>
        `;
        document.body.appendChild(bar);

        // Bind clicks on Action Bar
        bar.querySelector(".btn-add").addEventListener("mousedown", (e) => {
          e.preventDefault(); // Prevent focusout triggers
          const key = this.state.activeInlineKey;
          const idx = parseInt(this.state.activeInlineIndex);
          if (key && !isNaN(idx)) {
            const arr = this.state.sopData[key];
            if (Array.isArray(arr)) {
              arr.splice(idx + 1, 0, "New step");
              this.refreshPreview(true);
              bar.classList.remove("active");
              
              // Focus the newly added step
              setTimeout(() => {
                const newLi = document.querySelector(`#preview [data-key="${key}"][data-index="${idx + 1}"]`);
                if (newLi) {
                  newLi.focus();
                  // Move text caret to the end
                  const range = document.createRange();
                  const sel = window.getSelection();
                  range.selectNodeContents(newLi);
                  range.collapse(false);
                  sel.removeAllRanges();
                  sel.addRange(range);
                }
              }, 150);
            }
          }
        });

        bar.querySelector(".btn-delete").addEventListener("mousedown", (e) => {
          e.preventDefault(); // Prevent focusout triggers
          const key = this.state.activeInlineKey;
          const idx = parseInt(this.state.activeInlineIndex);
          if (key && !isNaN(idx)) {
            const arr = this.state.sopData[key];
            if (Array.isArray(arr)) {
              arr.splice(idx, 1);
              if (arr.length === 0) arr.push("New step");
              this.refreshPreview(true);
              bar.classList.remove("active");
            }
          }
        });
      }

      const previewElement = ExportModule.getPreviewElement();
      if (previewElement) {
        // 1. Two-way data sync on inline input
        previewElement.addEventListener("input", (e) => {
          const target = e.target;
          if (target && target.hasAttribute("contenteditable")) {
            const key = target.getAttribute("data-key");
            const index = target.getAttribute("data-index");
            
            let val = target.textContent;
            if (target.classList.contains("wysiwyg-block")) {
              val = target.innerHTML;
            }

            if (key === "procedure") {
              const idx = parseInt(index);
              if (this.state.sopData.procedure) {
                this.state.sopData.procedure[idx] = val;
              }
            } else if (key === "precautions") {
              const idx = parseInt(index);
              if (this.state.sopData.precautions) {
                this.state.sopData.precautions[idx] = val;
              }
            } else {
              this.state.sopData[key] = val;
            }

            // Sync back to sidebar inputs in real time
            const sidebarEl = UtilsModule.$(key);
            if (sidebarEl) {
              sidebarEl.value = val;
            }
          }
        });

        // 2. Full re-render on focusout (applies formatting & sanitization)
        previewElement.addEventListener("focusout", (e) => {
          const target = e.target;
          if (target && target.hasAttribute("contenteditable")) {
            setTimeout(() => {
              // Hide action bar if we clicked outside
              const active = document.activeElement;
              const isActionClick = active && (active.closest("#wysiwyg-action-bar") || active.classList.contains("wysiwyg-action-btn"));
              if (!isActionClick) {
                document.getElementById("wysiwyg-action-bar").classList.remove("active");
                this.refreshPreview();
              }
            }, 200);
          }
        });

        // 3. Focus tracking to position Touch Actions Bar (Add/Delete Steps)
        const showActionBar = (target) => {
          const key = target.getAttribute("data-key");
          const index = target.getAttribute("data-index");
          
          if ((key === "procedure" || key === "precautions") && index !== null) {
            this.state.activeInlineKey = key;
            this.state.activeInlineIndex = index;

            const bar = document.getElementById("wysiwyg-action-bar");
            const rect = target.getBoundingClientRect();
            
            // Absolute positioning (accounting for body scroll)
            const top = rect.top + window.scrollY;
            const left = rect.left + rect.width / 2 + window.scrollX;

            bar.style.top = `${top}px`;
            bar.style.left = `${left}px`;
            bar.classList.add("active");
          } else {
            document.getElementById("wysiwyg-action-bar").classList.remove("active");
          }
        };

        previewElement.addEventListener("focusin", (e) => {
          const target = e.target;
          if (target && target.hasAttribute("contenteditable")) {
            showActionBar(target);
          }
        });

        previewElement.addEventListener("click", (e) => {
          const target = e.target;
          if (target && target.hasAttribute("contenteditable")) {
            showActionBar(target);
          }
        });
      }
    },

    async loadSOP(dept, sopId, customSopObject = null) {
      try {
        let raw;
        if (customSopObject) {
          UtilsModule.log(`📄 Loading custom uploaded SOP...`);
          raw = customSopObject;
        } else {
          UtilsModule.log(`📄 Loading SOP: ${dept}/${sopId}`);
          raw = await DataModule.getSOP(dept, sopId);
        }

        // Validate JSON Structure
        if (!raw) {
          throw new Error("SOP data is empty or invalid JSON.");
        }
        const title = raw.meta?.title || raw.title || "";
        const purpose = raw.sections?.purpose || raw.purpose || "";
        const procedure = raw.sections?.procedure || raw.procedure || [];
        
        if (!title.trim()) {
          throw new Error("SOP JSON is missing 'meta.title' or 'title' field.");
        }
        if (!purpose.trim()) {
          throw new Error("SOP JSON is missing 'sections.purpose' or 'purpose' field.");
        }
        if (!Array.isArray(procedure) || procedure.length === 0) {
          throw new Error("SOP JSON is missing 'sections.procedure' or 'procedure' array, or it is empty.");
        }

        const rawSections = raw.sections || raw;

        let deptName = "General";
        const lookupKey = dept || raw.department;
        if (lookupKey) {
          const deptObj = DataModule.cache.departments?.find(
            d => d.key === lookupKey || d.name.toLowerCase() === lookupKey.toLowerCase()
          );
          if (deptObj) {
            deptName = deptObj.name;
          } else {
            deptName = lookupKey.split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          }
        }

        this.state.sopData = {
          ...raw,
          title: title,
          department: deptName,
          sopNumber: raw.sopNumber || "",
          revisionNo: raw.revisionNo || "",
          effectiveDate: raw.effectiveDate || "",
          revisionDate: raw.revisionDate || "",
          nextReviewDate: raw.nextReviewDate || "",
          copyType: raw.copyType || "CONTROLLED",
          responsibility: rawSections.responsibility || ConfigModule.DEFAULTS.RESPONSIBILITY,
          sectionsEnabled: {
            docControl: true,
            applicability: !!rawSections.applicability,
            abbreviations: !!rawSections.abbreviations,
            references: !!rawSections.references,
            annexures: !!rawSections.annexures,
            changeHistory: !!(raw.changeHistory && raw.changeHistory.length > 0),
            sopNumber: true,
            revisionNo: true,
            effectiveDate: true,
            revisionDate: true,
            nextReviewDate: true,
            copyType: true,
            
            // Professional Template Sections
            definitions: !!rawSections.definitions,
            materials: !!(rawSections.materials || rawSections.equipment || rawSections.reagents || rawSections.glassware),
            equipment: !!rawSections.equipment,
            reagents: !!rawSections.reagents,
            glassware: !!rawSections.glassware,
            safety: !!(rawSections.safety || rawSections.ppe || rawSections.precautions || rawSections.hazards),
            ppe: !!rawSections.ppe,
            hazards: !!rawSections.hazards,
            preparation: !!rawSections.preparation,
            calculations: !!rawSections.calculations,
            postOperation: !!rawSections.postOperation,
            dataRecording: !!rawSections.dataRecording,
            records: !!rawSections.records,
            acceptanceCriteria: !!rawSections.acceptanceCriteria,
            troubleshooting: !!rawSections.troubleshooting,
            maintenance: !!rawSections.maintenance,
            calibration: !!rawSections.calibration,
            qualityControl: !!rawSections.qualityControl,
            deviations: !!rawSections.deviations,
            training: !!rawSections.training,
            trainingRecords: !!rawSections.trainingRecords,
            environmental: !!rawSections.environmental,
            wasteDisposal: !!rawSections.wasteDisposal,
            distribution: !!rawSections.distribution,

            // New compliance sections (toggled ON by default if the respective template uses them)
            pciDetails: true,
            pciDocumentation: true,
            naacDetails: true,
            naacWaste: true,
            naacReview: true,
            isoCalibration: true,
            isoCapa: true,
            isoRetention: true,
            gmpClearance: true,
            gmpCleaning: true,
            gmpOos: true,
            gmpFootnote: true,
          },

          fieldsEnabled: {
            sopNumber: true,
            revisionNo: true,
            effectiveDate: true,
            revisionDate: true,
            nextReviewDate: true,
            copyType: true,
          },
          procedure: procedure,
          purpose: purpose,
          scope: rawSections.scope || "",
          precautions: rawSections.precautions || [],

          // Additional Professional fields
          location: raw.location || "",
          category: raw.category || "",
          applicableDepartments: raw.applicableDepartments || "",
          supersedes: raw.supersedes || "",
          responsibilityRows: rawSections.responsibilityRows || "",
          definitionsRows: rawSections.definitionsRows || "",
          equipmentRows: rawSections.equipmentRows || "",
          reagentsRows: rawSections.reagentsRows || "",
          glasswareList: rawSections.glasswareList || "",
          ppeList: rawSections.ppeList || "",
          hazardsRows: rawSections.hazardsRows || "",
          preparationSteps: rawSections.preparationSteps || "",
          calculationsFormula: rawSections.calculations || "",
          postOperationSteps: rawSections.postOperationSteps || "",
          recordsRows: rawSections.recordsRows || "",
          acceptanceCriteriaRows: rawSections.acceptanceCriteriaRows || "",
          troubleshootingRows: rawSections.troubleshootingRows || "",
          maintenanceRows: rawSections.maintenanceRows || "",
          calibrationInfo: rawSections.calibration || "",
          qcChecksRows: rawSections.qcChecksRows || "",
          deviationHandling: rawSections.deviationHandling || "",
          trainingRequirements: rawSections.trainingRequirements || "",
          environmentalRows: rawSections.environmentalRows || "",
          wasteDisposalInfo: rawSections.wasteDisposal || "",
          distributionRows: rawSections.distributionRows || "",
          preparedBy: raw.preparedBy || "",
          preparedDesig: raw.preparedDesig || "",
          preparedDate: raw.preparedDate || "",
          preparedDept: raw.preparedDept || "",
          checkedBy: raw.checkedBy || "",
          checkedDesig: raw.checkedDesig || "",
          checkedDate: raw.checkedDate || "",
          checkedDept: raw.checkedDept || "",
          approvedBy: raw.approvedBy || "",
          approvedDesig: raw.approvedDesig || "",
          approvedDate: raw.approvedDate || "",
          approvedDept: raw.approvedDept || "",
          reviewedBy: raw.reviewedBy || "",
          reviewedDesig: raw.reviewedDesig || "",
          reviewedDate: raw.reviewedDate || "",
          reviewedDept: raw.reviewedDept || "",
          approvedByQA: raw.approvedByQA || "",
          approvedDesigQA: raw.approvedDesigQA || "",
          approvedDateQA: raw.approvedDateQA || "",
          approvedByMgmt: raw.approvedByMgmt || "",
          approvedDesigMgmt: raw.approvedDesigMgmt || "",
          approvedDateMgmt: raw.approvedDateMgmt || "",

          // Pre-filled dynamically editable compliance content
          pciCourseCode: raw.pciCourseCode || "",
          pciExperimentRef: raw.pciExperimentRef || "",
          pciLabCategory: raw.pciLabCategory || "",
          pciDocumentationClause: raw.pciDocumentationClause || "All activities performed under this SOP shall be appropriately documented in the practical registry and retained for inspection and syllabus compliance verification by the Pharmacy Council of India.",
          
          naacAssetPage: raw.naacAssetPage || "",
          naacLedgerId: raw.naacLedgerId || "",
          naacLogbookRef: raw.naacLogbookRef || "",
          naacAmcRef: raw.naacAmcRef || "",
          naacCalibrationCert: raw.naacCalibrationCert || "",
          naacWasteProtocol: raw.naacWasteProtocol || "Disinfect microbial media by autoclaving at 121°C for 20 minutes before disposal. Chemical residues and acidic/basic solutions must be neutralized to pH 6-8 and diluted with excess water before draining. Solid waste must be segregated into color-coded NAAC waste containers.",
          naacReviewClause: raw.naacReviewClause || "This SOP shall be reviewed annually by the Academic Quality Assurance Cell (IQAC) to align with infrastructure updates, student utilization metrics, and NAAC accreditation criteria.",

          isoReferenceStandard: raw.isoReferenceStandard || "",
          isoToleranceLimit: raw.isoToleranceLimit || "",
          isoCapaAction: raw.isoCapaAction || "If instrument calibration values drift beyond the acceptable tolerance limit, immediately suspend student analysis, label the instrument 'OUT OF CALIBRATION', and initiate a CAPA (Corrective and Preventive Action) report.",
          isoRecordRetentionClause: raw.isoRecordRetentionClause || "All analytical data sheets, calibration certificates, and raw records generated during this procedure must be archived and retained for a minimum period of 5 years as per ISO 17025 record-retention policy.",

          gmpSupersedesId: raw.gmpSupersedesId || "",
          gmpLineClearance: raw.gmpLineClearance || "1. Verify that the work area is free of any previous products, raw materials, or labels.\n2. Confirm that the instrument and surrounding bench are clean and dry.\n3. Check that the calibration label is current and valid.",
          gmpCleaningProtocol: raw.gmpCleaningProtocol || "1. Switch off and disconnect the power supply.\n2. Wipe the external surfaces and parts with a lint-free cloth moistened with 70% Isopropyl Alcohol (IPA).\n3. Allow surfaces to air dry fully. Attach 'CLEANED' status tag.",
          gmpOosDirective: raw.gmpOosDirective || "In the event of a calibration failure or measurement out-of-specification (OOS), immediately halt work, apply an 'OUT OF SERVICE' label, and report the occurrence to the QA Department. Initiate an OOS investigation form.",
          gmpDataIntegrityStamp: raw.gmpDataIntegrityStamp || "This is a GMP controlled document. Any printout is considered an uncontrolled copy and is valid for reference only. Daily execution must comply with ALCOA+ data integrity rules.",
        };

        UIModule.syncInputs(this.state.sopData);
        UIModule.syncToggles(this.state.sopData);
        this.updateSidebarVisibility();
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
      
      // Update state data store
      if (key === "procedure" || key === "precautions") {
        this.state.sopData[key] = value.split("\n").filter((l) => l.trim());
      } else {
        this.state.sopData[key] = value;
      }

      // Check if we can apply fine-grained reactive DOM binding
      const complexKeys = ["procedure", "precautions", "changeHistoryRows"];
      const isComplex = complexKeys.includes(key);
      
      const preview = UtilsModule.$("preview");
      const targetElements = preview ? preview.querySelectorAll(`[data-key="${key}"]`) : [];

      if (!isComplex && targetElements.length > 0) {
        // Fast path: target exact node mutations without repainting the entire page
        targetElements.forEach((el) => {
          if (el.classList.contains("wysiwyg-block")) {
            const sanitizeFn = typeof window.sanitizeHtml === "function" ? window.sanitizeHtml : (x => x);
            el.innerHTML = sanitizeFn(value);
          } else {
            el.textContent = value;
          }
        });
      } else {
        // Slow path fallback: trigger full template parse and redraw
        this.debouncedRender();
      }
    },

    handleToggle(id, isChecked) {
      if (!this.state.sopData) return;
      const key = UIModule.toggleMap[id];
      if (!this.state.sopData.sectionsEnabled)
        this.state.sopData.sectionsEnabled = {};
      this.state.sopData.sectionsEnabled[key] = isChecked;

      // ✅ DEBUG: Log what's happening
      console.log("🔧 Toggle:", id, "→ Key:", key, "→ Checked:", isChecked);

      // Handle Field Visibility
      const fieldIds = [
        "sopNumber",
        "revisionNo",
        "effectiveDate",
        "revisionDate",
        "nextReviewDate",
        "copyType",
      ];
      if (fieldIds.includes(key)) {
        console.log("📋 This is a FIELD toggle");
        const field = UtilsModule.$(key);
        console.log("🎯 Found field element:", field);

        if (field) {
          const formGroup = field.closest(".form-group");
          console.log("📦 Found form-group:", formGroup);

          if (formGroup) {
            formGroup.style.display = isChecked ? "block" : "none";
            console.log("✅ Set display to:", isChecked ? "block" : "none");
          } else {
            console.log("❌ No .form-group parent found!");
          }
        } else {
          console.log("❌ Field element not found!");
        }
      }

      UIModule.syncToggles(this.state.sopData);
      this.refreshPreview();
    },

    debouncedRender() {
      clearTimeout(this.state.debounce);
      this.state.debounce = setTimeout(() => this.refreshPreview(), 50);
    },

    updateSidebarVisibility() {
      const templateName = this.state.templateName;
      const isExpert = this.state.isExpertMode;

      // Define compliance mappings: which group classes are visible in which template
      const templateGroups = {
        "sop-a4-classic": [],
        "sop-a4-pci": ["pci"],
        "sop-a4-naac": ["naac"],
        "sop-a4-iso": ["iso"],
        "sop-a4-master-professional": ["gmp"]
      };

      const activeGroups = templateGroups[templateName] || [];

      // Update compliance inputs section wrappers
      const sections = ["pci", "naac", "iso", "gmp"];
      let hasAnyVisible = false;

      sections.forEach(group => {
        const isVisible = isExpert || activeGroups.includes(group);
        if (isVisible) hasAnyVisible = true;

        // Toggle input section
        const inputBlocks = document.querySelectorAll(`.compliance-section.group-${group}`);
        inputBlocks.forEach(el => {
          el.style.display = isVisible ? "block" : "none";
        });

        // Toggle visibility switch item
        const toggleItems = document.querySelectorAll(`.toggle-item.group-${group}`);
        toggleItems.forEach(el => {
          el.style.display = isVisible ? "flex" : "none";
        });
      });

      // Toggle the parent card container
      const parentCard = UtilsModule.$("sectionInspection");
      if (parentCard) {
        parentCard.style.display = hasAnyVisible ? "block" : "none";
      }
    },

    async refreshPreview(force = false) {
      if (!this.state.sopData) return;

      const activeEl = document.activeElement;
      if (!force && activeEl && activeEl.hasAttribute("contenteditable")) {
        UtilsModule.log("🔍 Skipping refreshPreview: User is typing inline");
        return;
      }

      try {
        const tmpl = await DataModule.fetchTemplate(this.state.templateName);
        const viewData = { ...this.state.sopData };

        viewData.procedure = TemplateModule.formatProcedure(viewData.procedure);
        viewData.precautions = TemplateModule.formatPrecautions(viewData.precautions);
        viewData.changeHistoryRows = TemplateModule.formatHistory(
          viewData.changeHistory
        );

        // Smart format other fields if they're strings
        ["precautions", "responsibility", "gmpLineClearance", "gmpCleaningProtocol"].forEach((key) => {
          if (
            typeof viewData[key] === "string" &&
            viewData[key].includes("\n")
          ) {
            viewData[key] = TemplateModule.formatMultiline(
              viewData[key],
              "list"
            );
          }
        });

        [
          "purpose",
          "scope",
          "applicability",
          "abbreviations",
          "references",
          "annexures",
          "pciDocumentationClause",
          "naacWasteProtocol",
          "naacReviewClause",
          "isoCapaAction",
          "isoRecordRetentionClause",
          "gmpOosDirective",
          "gmpDataIntegrityStamp",
        ].forEach((key) => {
          if (
            typeof viewData[key] === "string" &&
            viewData[key].includes("\n")
          ) {
            viewData[key] = TemplateModule.formatMultiline(
              viewData[key],
              "paragraph"
            );
          }
        });

        if (viewData.sectionsEnabled) {
          Object.keys(viewData.sectionsEnabled).forEach((k) => {
            const flagName = `section${k.charAt(0).toUpperCase() + k.slice(1)}`;
            viewData[flagName] = viewData.sectionsEnabled[k];
          });
        }

        let html = TemplateModule.render(tmpl, viewData);

        /* =====================================================
          FINAL GLOBAL SANITIZATION (ALL OUTPUTS)
           ===================================================== */

        /* Remove empty {} */
        html = html.replace(/\{\s*\}/g, "");

        /* Unwrap {text} → text */
        html = html.replace(/\{\s*([^{}]+?)\s*\}/g, "$1");

        UIModule.renderPreview(html);

        // Dynamic Scale Calculation on mobile devices (< 768px width)
        const preview = UtilsModule.$("preview");
        const wrapper = UtilsModule.$("preview-wrapper");
        if (preview && wrapper) {
          // Apply fluid-preview class dynamically based on viewport and toggle state
          if (window.innerWidth < 768 && this.state.isFluidPreview) {
            preview.classList.add("fluid-preview");
          } else {
            preview.classList.remove("fluid-preview");
          }

          if (window.innerWidth < 768 && !this.state.isFluidPreview) {
            const wrapperWidth = wrapper.offsetWidth;
            const targetWidth = 794; // A4 width at 96 dpi
            const scale = Math.max(0.1, (wrapperWidth - 16) / targetWidth);

            preview.style.transform = `scale(${scale})`;
            preview.style.transformOrigin = "top center";

            // Recalculate negative margin-bottom dynamically after DOM layout is ready
            setTimeout(() => {
              const previewHeight = preview.offsetHeight;
              preview.style.marginBottom = `-${previewHeight * (1 - scale)}px`;
            }, 50);
          } else {
            // Reset for desktop view or when Fluid View is active
            preview.style.transform = "";
            preview.style.transformOrigin = "";
            preview.style.marginBottom = "";
          }
        }
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
// Call the initialization function
window.initSOPApp();
