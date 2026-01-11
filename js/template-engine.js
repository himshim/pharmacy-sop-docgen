window.renderTemplate = function (templateHTML, data) {
  return templateHTML.replace(/{{(.*?)}}/g, (_, key) => {
    return data[key.trim()] ?? "";
  });
};