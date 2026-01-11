function renderTemplate(template, data) {
  let html = template;

  // Replace normal placeholders
  Object.keys(data).forEach(key => {
    const value = data[key] ?? "";
    html = html.replaceAll(`{{${key}}}`, value);
  });

  // 🔥 CONDITIONAL BLOCK SUPPORT
  html = html.replace(
    /\{\{#if ([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (match, key, content) => data[key]?.toString().trim() ? content : ""
  );

  return html;
}
