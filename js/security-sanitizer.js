/**
 * Safe client-side HTML Sanitizer for SOP rich-text rendering
 * Prevents DOM XSS by whitelisting formatting tags and attributes
 */
(function() {
  "use strict";

  const ALLOWED_TAGS = new Set([
    "li", "ol", "ul", "br", "p", "b", "strong", "em", "i", 
    "table", "tr", "td", "th", "thead", "tbody", 
    "h1", "h2", "h3", "h4", "span", "div", "hr"
  ]);

  const ALLOWED_ATTRS = new Set([
    "style", "class", "colspan", "rowspan", "width", "align", "cellspacing", "id",
    "contenteditable", "data-key", "data-index", "data-placeholder"
  ]);

  window.sanitizeHtml = function(html) {
    if (typeof html !== "string") return html;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      function sanitizeNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.cloneNode(true);
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
          const tagName = node.tagName.toLowerCase();
          if (ALLOWED_TAGS.has(tagName)) {
            const el = document.createElement(tagName);

            // Filter attributes
            for (let i = 0; i < node.attributes.length; i++) {
              const attr = node.attributes[i];
              const attrName = attr.name.toLowerCase();

              if (ALLOWED_ATTRS.has(attrName)) {
                // Prevent javascript URL scheme
                if (attrName === "href" && attr.value.trim().toLowerCase().startsWith("javascript:")) {
                  continue;
                }
                el.setAttribute(attr.name, attr.value);
              }
            }

            // Recurse children
            node.childNodes.forEach(child => {
              const cleanChild = sanitizeNode(child);
              if (cleanChild) el.appendChild(cleanChild);
            });

            return el;
          }
        }

        // If not allowed, extract allowed descendants
        const fragment = document.createDocumentFragment();
        node.childNodes.forEach(child => {
          const cleanChild = sanitizeNode(child);
          if (cleanChild) fragment.appendChild(cleanChild);
        });
        return fragment;
      }

      const cleanFragment = document.createDocumentFragment();
      doc.body.childNodes.forEach(child => {
        const cleanChild = sanitizeNode(child);
        if (cleanChild) cleanFragment.appendChild(cleanChild);
      });

      const temp = document.createElement("div");
      temp.appendChild(cleanFragment);
      return temp.innerHTML;
    } catch (e) {
      console.error("HTML Sanitization failed, returning empty", e);
      return "";
    }
  };
})();
