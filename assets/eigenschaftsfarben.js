(() => {
  // Gemeinsame 13-stufige Rot-Gelb-Grün-Skala für Eigenschaften und Fertigkeiten.
  // Die Spannweite wird für jeden Charakter separat aus dessen effektiven Werten ermittelt.
  const colors = [
    "#c7473d", "#d45a3e", "#df7040", "#e58a43", "#e9a64b",
    "#e9c45a", "#d9cf62", "#c1c96a", "#a6bf69", "#89b56a",
    "#70a96a", "#5e9d65", "#4b8e5c"
  ];

  const applyScale = (entries, variable, className, datasetName) => {
    const values = entries
      .map((element) => ({
        element,
        value: Number(element.textContent.trim().replace(",", "."))
      }))
      .filter((entry) => Number.isFinite(entry.value));
    if (!values.length) return;

    const min = Math.min(...values.map((entry) => entry.value));
    const max = Math.max(...values.map((entry) => entry.value));
    values.forEach(({ element, value }) => {
      const position = max === min ? 6 : Math.round(((value - min) / (max - min)) * 12);
      element.style.setProperty(variable, colors[position]);
      element.classList.add(className);
      element.dataset[datasetName] = String(position + 1);
    });
  };

  // Grundeigenschaften: weiterhin nur Werte mit zugehörigem Würfelbild einfärben.
  const attributes = [...document.querySelectorAll("[data-attribute-scale]")]
    .filter((element) => element.closest(".sheet-field")?.querySelector(".dice-icon"));
  applyScale(attributes, "--attribute-value-color", "attribute-scale-applied", "attributeScalePosition");

  // Fertigkeiten: ausschließlich numerische Endwerte in den Fertigkeitskarten einfärben.
  // Waffen-, Rüstungs-, Lebens- und sonstige berechnete Werte bleiben unverändert.
  const skills = [...document.querySelectorAll(".skill-card .calculated-value")];
  skills.forEach((element) => element.classList.add("skill-scale-value"));
  applyScale(skills, "--skill-value-color", "skill-scale-applied", "skillScalePosition");
})();
