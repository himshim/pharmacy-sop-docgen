/**
 * Simple Template Engine with XSS Protection & Performance Optimizations
 * Supports {{variable}} and {{#if variable}}...{{/if}}
 */

// ⚡ PRE-COMPILED REGEX PATTERNS (Performance Boost)
const REGEX_CONDITIONAL = /\{\{#if ([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
const REGEX_CLEANUP = /\{\{[^}]+\}\}/g;
const REGEX_HTML_CHECK = /^[ \t]*<|&[a-z]+;|&#[0-9]+;/i; // Checks if string looks like HTML

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

window.renderTemplate = function(template, data) {
    let html = template;

    // 🔥 1. HANDLE CONDITIONAL BLOCKS
    // Uses pre-compiled regex for speed
    html = html.replace(REGEX_CONDITIONAL, (match, key, content) => {
        const val = data[key];
        // Check truthiness: not null, not undefined, not false, not empty string, not empty array
        const isTruthy = val && (Array.isArray(val) ? val.length > 0 : String(val).trim() !== '');
        return isTruthy ? content : "";
    });

    // 2. REPLACE VARIABLES
    // We iterate over data keys, which is faster than scanning the huge template string for every possible {{key}}
    const keys = Object.keys(data);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        let value = data[key] ?? "";

        // Auto-escape logic:
        if (typeof value === 'string') {
            // Only escape if it doesn't look like pre-generated HTML (like the procedure list)
            const isGeneratedHTML = key === 'procedure' || key === 'changeHistoryRows' || REGEX_HTML_CHECK.test(value);
            if (!isGeneratedHTML) {
                value = escapeHtml(value);
            }
        }

        // replaceAll is highly optimized in modern browsers
        html = html.replaceAll(`{{${key}}}`, value);
    }

    // 3. CLEANUP REMAINING PLACEHOLDERS
html = html.replace(REGEX_CLEANUP, '');

// 4. FINAL SANITIZATION: REMOVE STRAY SINGLE-BRACE BLOCKS
html = html
  .replace(/\{\s*\}/g, '')
  .replace(/\{\s*([^{}]+?)\s*\}/g, '$1');

return html;
};
