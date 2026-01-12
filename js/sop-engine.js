/**
 * ═══════════════════════════════════════════════════════════════════
 * SOP GENERATOR ENGINE v3.5 - DEPLOYMENT-SAFE PATHS + PERFORMANCE
 * - Auto-detects correct base paths (works from /partials/ and /)
 * - Keeps caching + debounced preview rendering
 * - Includes internal renderTemplate fallback if template-engine.js not loaded
 * ═══════════════════════════════════════════════════════════════════
 */

window.initSOPApp = function () {
  'use strict';

  /* ==================== CONFIGURATION (will be finalized at runtime) ==================== */
  const CONFIG = {
    DATA_PATH: null,
    TEMPLATE_PATH: null,
    DEFAULT_RESPONSIBILITY:
      'Laboratory In-charge, faculty members, technical staff, and authorized users are responsible for implementation and compliance of this SOP.',
    DEBUG_MODE: true
  };

  const log = (...args) => CONFIG.DEBUG_MODE && console.log(...args);

  log('🚀 Initializing SOP App v3.5 (Deployment-safe paths)...');

  /* ==================== DOM HELPERS ==================== */
  const $ = (id) => document.getElementById(id);

  const fetchJSON = async (url) => {
    const response = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Fetch failed: ${url} (${response.status})`);
    return response.json();
  };

  const fetchText = async (url) => {
    const response = await fetch(`${url}?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Fetch failed: ${url} (${response.status})`);
    return response.text();
  };

  /* ==================== TEMPLATE ENGINE FALLBACK ==================== */
  // If template-engine.js isn't included in partials (current file structure),
  // this fallback ensures nothing breaks.
  if (typeof window.renderTemplate !== 'function') {
    const REGEX_CONDITIONAL = /\{\{#if ([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    const REGEX_CLEANUP = /\{\{[^}]+\}\}/g;
    const REGEX_HTML_CHECK = /^[ \t]*<|&[a-z]+;|&#[0-9]+;/i;

    function escapeHtml(unsafe) {
      if (typeof unsafe !== 'string') return unsafe;
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    window.renderTemplate = function (template, data) {
      let html = template;

      html = html.replace(REGEX_CONDITIONAL, (match, key, content) => {
        const val = data[key];
        const isTruthy = val && (Array.isArray(val) ? val.length > 0 : String(val).trim() !== '');
        return isTruthy ? content : '';
      });

      const keys = Object.keys(data);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        let value = data[key] ?? '';

        if (typeof value === 'string') {
          const isGeneratedHTML =
            key === 'procedure' ||
            key === 'changeHistoryRows' ||
            REGEX_HTML_CHECK.test(value);
          if (!isGeneratedHTML) value = escapeHtml(value);
        }

        html = html.replaceAll(`{{${key}}}`, value);
      }

      html = html.replace(REGEX_CLEANUP, '');
      return html;
    };

    log('ℹ️ Using internal renderTemplate fallback (template-engine.js not detected).');
  }

  /* ==================== CORE ELEMENTS ==================== */
  const preview = $('preview') || $('preview-content');
  const departmentSelect = $('departmentSelect');
  const sopSelect = $('sopSelect');
  const templateSelect = $('templateSelect');
  const printBtn = $('print-btn');
  const browserPrintBtn = $('browser-print-btn');

  if (!departmentSelect || !sopSelect || !templateSelect) {
    console.warn('⚠️ SOP engine aborted: UI not ready (missing selects).');
    return;
  }
  if (!preview) {
    console.error('❌ Preview element not found! Check HTML for id="preview" or "preview-content".');
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

  /* ==================== CACHE ==================== */
  const CACHE = {
    TEMPLATES: {},
    SOPS: {},
    DEPARTMENTS: null
  };

  /* ==================== STATE ==================== */
  let CURRENT_TEMPLATE_NAME = '';
  let SOP_DATA = null;

  /* ==================== PATH AUTO-DETECTION ==================== */
  async function resolveBasePaths() {
    // Candidate paths that match your repo structure:
    // - When running from /partials/*.html => ../data, ../templates
    // - When running from /index.html (future) => ./data, ./templates
    const candidates = [
      { data: '../data/', templates: '../templates/' },
      { data: './data/', templates: './templates/' }
    ];

    for (const c of candidates) {
      try {
        await fetchJSON(`${c.data}departments.json`);
        CONFIG.DATA_PATH = c.data;
        CONFIG.TEMPLATE_PATH = c.templates;
        log('✅ Paths resolved:', CONFIG.DATA_PATH, CONFIG.TEMPLATE_PATH);
        return;
      } catch (e) {
        // try next candidate
      }
    }

    // If all fail, keep first as default and show helpful message
    CONFIG.DATA_PATH = '../data/';
    CONFIG.TEMPLATE_PATH = '../templates/';
    throw new Error(
      `Unable to resolve DATA/TEMPLATE paths. Tried ../ and ./ from ${window.location.pathname}`
    );
  }

  /* ==================== INIT ==================== */
  (async function init() {
    try {
      await resolveBasePaths();

      if (!CACHE.DEPARTMENTS) {
        const data = await fetchJSON(`${CONFIG.DATA_PATH}departments.json`);
        CACHE.DEPARTMENTS = data.departments;
      }

      departmentSelect.innerHTML = `<option value="">Choose department...</option>`;
      CACHE.DEPARTMENTS.forEach(dep => {
        departmentSelect.innerHTML += `<option value="${dep.id || dep.key}">${dep.name}</option>`;
      });

      log(`✅ Loaded ${CACHE.DEPARTMENTS.length} departments`);
    } catch (e) {
      console.error('❌ Failed to load departments:', e);
      departmentSelect.innerHTML = `<option value="">Error loading departments</option>`;
      preview.innerHTML = `
        <div style="padding:16px; border:1px solid #f5c2c7; background:#f8d7da; color:#842029; border-radius:8px;">
          <b>Error loading departments</b><br>
          ${e.message}<br><br>
          <div style="font-size:12px; opacity:0.9;">
            Current page: ${window.location.pathname}<br>
            Expected data like: ../data/departments.json (when running from /partials/)
          </div>
        </div>
      `;
    }
  })();

  /* ==================== DEPARTMENT CHANGE ==================== */
  departmentSelect.addEventListener('change', async () => {
    sopSelect.innerHTML = `<option value="">Choose SOP...</option>`;
    sopSelect.disabled = true;
    preview.innerHTML = '';
    hideAllSections();

    const dept = departmentSelect.value;
    if (!dept) return;

    try {
      const index = await fetchJSON(`${CONFIG.DATA_PATH}${dept}/index.json`);
      index.instruments.forEach(sop => {
        sopSelect.innerHTML += `<option value="${sop.id || sop.key}">${sop.name}</option>`;
      });
      sopSelect.disabled = false;
      log(`✅ Loaded ${index.instruments.length} SOPs`);
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

    const cacheKey = `${dept}/${sop}`;
    let raw;

    try {
      if (CACHE.SOPS[cacheKey]) {
        raw = CACHE.SOPS[cacheKey];
        log(`⚡ SOP cache hit: ${cacheKey}`);
      } else {
        raw = await fetchJSON(`${CONFIG.DATA_PATH}${dept}/${sop}.json`);
        CACHE.SOPS[cacheKey] = raw;
        log(`📥 SOP fetched: ${cacheKey}`);
      }

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
          sopNumber: true,
          effectiveDate: true,
          revisionDate: true,
          copyType: true
        },

        changeHistory: [],
        purpose: raw.sections?.purpose || raw.purpose || '',
        scope: raw.sections?.scope || raw.scope || '',
        responsibility: CONFIG.DEFAULT_RESPONSIBILITY,
        procedure: raw.sections?.procedure || raw.procedure || [],
        precautions: raw.sections?.precautions || raw.precautions || '',
        applicability: '',
        abbreviations: '',
        references: '',
        annexures: '',

        preparedBy: '', preparedDesig: '', preparedDate: '',
        checkedBy: '', checkedDesig: '', checkedDate: '',
        approvedBy: '', approvedDesig: '', approvedDate: ''
      };

      syncInputs();
      updateSectionVisibility();
      await loadTemplate();
    } catch (e) {
      console.error('❌ Failed to load SOP:', e);
      preview.innerHTML = `<p style="color:#b00020; padding:16px;">Error: ${e.message}</p>`;
    }
  });

  /* ==================== TEMPLATE CHANGE ==================== */
  templateSelect.addEventListener('change', async () => {
    if (!SOP_DATA) return;
    await loadTemplate();
  });

  /* ==================== LOAD TEMPLATE (CACHED) ==================== */
  async function loadTemplate() {
    const templateName = templateSelect.value || 'sop-a4-classic';
    CURRENT_TEMPLATE_NAME = templateName;

    try {
      if (!CACHE.TEMPLATES[templateName]) {
        CACHE.TEMPLATES[templateName] = await fetchText(`${CONFIG.TEMPLATE_PATH}${templateName}.html`);
        log(`📥 Template fetched: ${templateName}`);
      } else {
        log(`⚡ Template cache hit: ${templateName}`);
      }

      renderPreview();
    } catch (e) {
      console.error('❌ Template load failed:', e);
      preview.innerHTML = `<p style="color:#b00020; padding:16px;">Template error: ${e.message}</p>`;
    }
  }

  /* ==================== RENDER PREVIEW (DEBOUNCED) ==================== */
  let debounceTimer = null;
  function renderPreview() {
    if (!SOP_DATA || !CACHE.TEMPLATES[CURRENT_TEMPLATE_NAME]) return;

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      requestAnimationFrame(_performRender);
    }, 50);
  }

  function _performRender() {
    const templateHtml = CACHE.TEMPLATES[CURRENT_TEMPLATE_NAME];
    if (!templateHtml) return;

    const viewData = { ...SOP_DATA };

    // procedure array -> HTML list
    if (Array.isArray(viewData.procedure)) {
      viewData.procedure = viewData.procedure.map(step => `<li>${step}</li>`).join('');
    }

    // change history rows if used by templates
    if (Array.isArray(viewData.changeHistory) && viewData.changeHistory.length > 0) {
      viewData.changeHistoryRows = viewData.changeHistory
        .map(item => `<tr><td>${item.rev}</td><td>${item.date}</td><td>${item.desc}</td></tr>`)
        .join('');
    }

    // section flags for {{#if sectionDocControl}} etc.
    if (viewData.sectionsEnabled) {
      Object.keys(viewData.sectionsEnabled).forEach(key => {
        viewData[`section${key.charAt(0).toUpperCase() + key.slice(1)}`] = viewData.sectionsEnabled[key];
      });
    }

    preview.innerHTML = window.renderTemplate(templateHtml, viewData);
  }

  /* ==================== HELPERS ==================== */
  function syncInputs() {
    if (!SOP_DATA) return;
    Object.keys(inputs).forEach(key => {
      const input = inputs[key];
      if (!input || SOP_DATA[key] === undefined) return;

      input.value = Array.isArray(SOP_DATA[key]) ? SOP_DATA[key].join('\n') : SOP_DATA[key];
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
      if (!toggle) return;
      const enabled = SOP_DATA.sectionsEnabled?.[key] || SOP_DATA.fieldsEnabled?.[key] || false;
      toggle.checked = enabled;
    });

    Object.keys(sections).forEach(key => {
      if (sections[key]) {
        sections[key].style.display = SOP_DATA.sectionsEnabled?.[key] ? 'block' : 'none';
      }
    });
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

      if (sections[key]) sections[key].style.display = toggle.checked ? 'block' : 'none';
      renderPreview();
    });
  });

  /* ==================== PRINT ==================== */
  if (browserPrintBtn) {
    browserPrintBtn.addEventListener('click', () => {
      if (!preview.innerHTML.trim()) {
        alert('Please generate a document first.');
        return;
      }
      window.print();
    });
  }

  // Keep your existing PDF generation logic (this version keeps the hook; it won’t break)
  if (printBtn) {
    printBtn.addEventListener('click', async function () {
      if (!preview.innerHTML.trim()) {
        alert('Please generate a document first.');
        return;
      }
      if (typeof html2pdf === 'undefined') {
        alert('PDF library not loaded. Use Browser Print.');
        return;
      }

      const originalText = printBtn.innerHTML;
      printBtn.innerHTML = '⏳ Generating PDF...';
      printBtn.disabled = true;

      try {
        const clonedPreview = preview.cloneNode(true);
        const sopNum = inputs.sopNumber?.value || '001';
        const title = inputs.title?.value || 'SOP';
        const cleanTitle = title.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        const filename = `SOP_${sopNum}_${cleanTitle}.pdf`;

        const options = {
          margin: [10, 10, 10, 10],
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        await html2pdf().set(options).from(clonedPreview).save();
      } catch (error) {
        console.error('❌ PDF generation error:', error);
        alert(`Error generating PDF: ${error.message}`);
      } finally {
        printBtn.innerHTML = originalText;
        printBtn.disabled = false;
      }
    });
  }

  log('🎉 SOP App v3.5 initialized');
};

/* ==================== BOOTSTRAP ==================== */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.initSOPApp && window.initSOPApp());
} else {
  window.initSOPApp && window.initSOPApp();
}
