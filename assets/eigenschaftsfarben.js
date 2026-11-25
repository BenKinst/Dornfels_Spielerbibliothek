(() => {
  // Einheitliche 13-stufige Rot-Gelb-Grün-Skala für gewürfelte Grundeigenschaften.
  // Berücksichtigt werden ausschließlich Eigenschaftswerte, deren Feld ein Würfelbild enthält.
  // Die Spannweite wird für jeden Charakter separat aus dessen effektiven Werten ermittelt.
  const colors = [
    "#c7473d", "#d45a3e", "#df7040", "#e58a43", "#e9a64b",
    "#e9c45a", "#d9cf62", "#c1c96a", "#a6bf69", "#89b56a",
    "#70a96a", "#5e9d65", "#4b8e5c"
  ];
  const values = [...document.querySelectorAll("[data-attribute-scale]")]
    .filter((element) => element.closest(".sheet-field")?.querySelector(".dice-icon"))
    .map((element) => ({ element, value: Number(element.textContent.trim().replace(",", ".")) }))
    .filter((entry) => Number.isFinite(entry.value));
  if (!values.length) return;
  const min = Math.min(...values.map((entry) => entry.value));
  const max = Math.max(...values.map((entry) => entry.value));
  values.forEach(({ element, value }) => {
    const position = max === min ? 6 : Math.round(((value - min) / (max - min)) * 12);
    element.style.setProperty("--attribute-value-color", colors[position]);
    element.classList.add("attribute-scale-applied");
    element.dataset.attributeScalePosition = String(position + 1);
  });
})();
