/**
 * Simple Token-Based Template Engine with XSS Protection & Nested Conditionals Support
 * Supports {{variable}}, {{{rawVariable}}}, and nested {{#if variable}}...{{/if}}
 */

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

function tokenize(template) {
    let index = 0;
    const tokens = [];
    while (index < template.length) {
        let openIndex = template.indexOf("{{", index);
        if (openIndex === -1) {
            tokens.push({ type: "text", value: template.substring(index) });
            break;
        }
        if (openIndex > index) {
            tokens.push({ type: "text", value: template.substring(index, openIndex) });
        }
        
        let closeIndex = template.indexOf("}}", openIndex + 2);
        if (closeIndex === -1) {
            tokens.push({ type: "text", value: template.substring(openIndex) });
            break;
        }

        let isTriple = false;
        let contentStart = openIndex + 2;
        let contentEnd = closeIndex;
        if (template.charAt(openIndex + 2) === '{' && template.charAt(closeIndex + 2) === '}') {
            isTriple = true;
            contentStart = openIndex + 3;
            index = closeIndex + 3;
        } else {
            index = closeIndex + 2;
        }

        let expression = template.substring(contentStart, contentEnd).trim();
        if (expression.startsWith("#if ")) {
            tokens.push({ type: "if", key: expression.substring(4).trim() });
        } else if (expression === "/if") {
            tokens.push({ type: "endif" });
        } else {
            tokens.push({ type: "var", key: expression, isRaw: isTriple });
        }
    }
    return tokens;
}

function parse(tokens) {
    let tokenIndex = 0;
    function parseNested() {
        const nodes = [];
        while (tokenIndex < tokens.length) {
            const token = tokens[tokenIndex++];
            if (token.type === "endif") {
                return nodes;
            } else if (token.type === "if") {
                const children = parseNested();
                nodes.push({ type: "if", key: token.key, children });
            } else {
                nodes.push(token);
            }
        }
        return nodes;
    }
    return parseNested();
}

function evaluate(nodes, data, escapeFn, sanitizeFn) {
    let result = "";
    for (const node of nodes) {
        if (node.type === "text") {
            result += node.value;
        } else if (node.type === "var") {
            let val = data[node.key];
            if (val === undefined || val === null) {
                val = "";
            }
            val = String(val);
            
            // Treat as raw HTML if explicitly declared as triple brace, or is a known rich key, or contains HTML markup
            const isHTML = node.isRaw || 
                           node.key === 'procedure' || 
                           node.key === 'precautions' || 
                           node.key === 'changeHistoryRows' || 
                           REGEX_HTML_CHECK.test(val);
            
            // Skip wrapping control lists or structural rows (handled separately)
            const skipKeys = ["changeHistoryRows", "procedure", "precautions"];
            const shouldWrap = !skipKeys.includes(node.key);

            if (shouldWrap) {
                const placeholder = node.key
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase());
                
                if (isHTML) {
                    result += `<div contenteditable="true" data-key="${node.key}" data-placeholder="[Enter ${placeholder}]" class="wysiwyg-block">${sanitizeFn(val)}</div>`;
                } else {
                    result += `<span contenteditable="true" data-key="${node.key}" data-placeholder="[${placeholder}]" class="wysiwyg-inline">${escapeFn(val)}</span>`;
                }
            } else {
                if (isHTML) {
                    result += sanitizeFn(val);
                } else {
                    result += escapeFn(val);
                }
            }
        } else if (node.type === "if") {
            const val = data[node.key];
            const isTruthy = val && (Array.isArray(val) ? val.length > 0 : String(val).trim() !== "");
            if (isTruthy) {
                result += evaluate(node.children, data, escapeFn, sanitizeFn);
            }
        }
    }
    return result;
}

const templateCache = new Map();

window.renderTemplate = function(template, data) {
    if (!template) return "";
    const sanitizeFn = typeof window.sanitizeHtml === "function" ? window.sanitizeHtml : (x => x);
    
    let nodes = templateCache.get(template);
    if (!nodes) {
        const tokens = tokenize(template);
        nodes = parse(tokens);
        templateCache.set(template, nodes);
    }
    
    return evaluate(nodes, data, escapeHtml, sanitizeFn);
};
