# 🧪 SOP Generator (Pharma)

A lightweight, browser-based **Standard Operating Procedure (SOP) Generator** built for **pharmacy education, laboratory documentation, and academic quality systems**.

Generate **professional, audit-ready SOP documents** from structured JSON files and export them as **print-ready PDF** or **editable Microsoft Word (DOCX)** — all **without a backend**.

> ⚠️ **Project Status:** Prototype · Active Development

---

## 🌟 Highlights

- ✔️ JSON-driven SOP creation  
- ✔️ Word-like A4 preview (desktop & mobile)  
- ✔️ Print, PDF & DOCX export  
- ✔️ Conditional sections & smart hiding  
- ✔️ No server · No database · No tracking  

---

## 🚀 Features

### 📄 JSON-Based SOPs
- Each SOP is defined using a **strict, predictable JSON structure**
- Easy to duplicate, edit, and scale
- Ideal for batch creation and AI-assisted workflows

### 🧩 Template-Driven Rendering
- SOP templates separated from data
- Supports:
  - Conditional sections
  - Toggle-based visibility
  - Dual layout handling (table vs text)

### 🖥️ A4 WYSIWYG Preview
- Fixed **A4 (210 × 297 mm)** layout
- Desktop & mobile friendly
- Matches Microsoft Word typography and spacing

### 📤 Export Options
- 🖨️ Browser Print
- 📄 PDF (A4, margin-safe)
- 📝 DOCX (editable in MS Word)

### 🧠 Smart Formatting
- Auto-numbered sections
- Numbered procedures
- No orphan headings
- Empty fields auto-hidden
- Word-safe layout for approvals & signatures

### 🔒 Fully Client-Side
- Runs entirely in the browser
- No backend, no uploads
- SOP data stays local

---

## 🎯 Intended Audience

This project is suitable for:

- Pharmacy colleges
- Laboratory instructors & faculty
- B.Pharm / D.Pharm / M.Pharm students
- Academic QA & documentation teams
- Anyone preparing SOP-style pharma documents

---

## 🧪 SOP JSON Design Philosophy

Each SOP JSON typically includes:

- Metadata (title, department, identifiers)
- Core sections:
  - Purpose
  - Scope
  - Responsibility
  - Procedure
  - Precautions
- Optional sections:
  - Applicability
  - Abbreviations
  - References
  - Annexures
- Optional change history

This approach enables:

- Reusable **generic SOPs**
- Minimal duplication
- Easy maintenance
- Clean rendering without manual formatting

---

## 🤖 AI-Assisted SOP Creation (Recommended)

You can safely use AI tools (e.g. ChatGPT) to:

1. Create **generic SOP JSON templates**
2. Reuse them for multiple instruments
3. Modify only:
   - Title
   - Instrument name
   - Procedure steps (if required)

✅ As long as the **JSON structure is preserved**, the SOP Generator will render documents correctly without any code changes.

---

## ⚠️ Known Limitations

- PDF pagination depends on browser rendering
- Very long tables may still split across pages
- DOCX export depends on `html-docx-js` limitations
- No authentication or multi-user support (by design)

---

## 🛣️ Planned Improvements

- Additional SOP templates (ISO / NAAC / PCI style)
- Improved PDF page-break handling
- SOP JSON schema validation
- Version comparison support
- Template customization UI

---

## 👨‍🏫 Author

**@himshim26**

If used in academic or institutional contexts, attribution is appreciated.

---

## 📜 License

This project is licensed under the **MIT License**.

You are free to:
- Use
- Modify
- Distribute
- Adapt

No warranty is provided.

---

## 💬 Feedback & Contributions

This is an **active prototype**.

Suggestions, improvements, and constructive feedback are welcome.  
Institutions are encouraged to fork and maintain their own SOP templates.