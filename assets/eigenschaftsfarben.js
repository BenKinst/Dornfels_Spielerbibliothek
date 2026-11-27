/* Gemeinsame 13-stufige Rot-Gelb-Grün-Skala für Eigenschaften und Fertigkeiten. */
(() => {
  "use strict";
  const colors = [
    "#c7473d", "#d45a3e", "#df7040", "#e58a43", "#e9a64b",
    "#e9c45a", "#d9cf62", "#c1c96a", "#a6bf69", "#89b56a",
    "#70a96a", "#5e9d65", "#4b8e5c"
  ];

  function applyScale(root, selector, variable, className, datasetName) {
    const entries = [...root.querySelectorAll(selector)]
      .map(element => ({
        element,
        value: Number(element.textContent.trim().replace(",", "."))
      }))
      .filter(entry => Number.isFinite(entry.value));
    if (!entries.length) return;

    const min = Math.min(...entries.map(entry => entry.value));
    const max = Math.max(...entries.map(entry => entry.value));
    entries.forEach(({ element, value }) => {
      const position = max === min ? 6 : Math.round(((value - min) / (max - min)) * 12);
      element.style.setProperty(variable, colors[position]);
      element.classList.add(...className.split(" "));
      element.dataset[datasetName] = String(position + 1);
    });
  }

  // Nach dem Rendern aufrufen: Eigenschaften und Fertigkeiten werden separat skaliert.
  window.applyCharacterValueColors = function(root) {
    if (!root) return;
    const attributes = [...root.querySelectorAll("[data-attribute-scale]")]
      .filter(element => element.closest(".sheet-field")?.querySelector(".dice-icon"));
    applyScale(root, "[data-attribute-scale]", "--attribute-value-color",
      "attribute-scale-applied", "attributeScalePosition");

    // Nur ausdrücklich markierte numerische Fertigkeitsendwerte einfärben.
    applyScale(root, ".skill-scale-candidate", "--skill-value-color",
      "skill-scale-value skill-scale-applied", "skillScalePosition");
  };
})();