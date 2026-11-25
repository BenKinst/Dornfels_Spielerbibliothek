(() => {
  const explanations = {
    w6: "Schadenswurf: Wirf einen sechsseitigen Würfel (W6). Das Ergebnis bestimmt den Würfelanteil des Schadens; ein angegebener Schadensbonus wird anschließend addiert.",
    w10: "Fertigkeitswurf (Prozentwurf): Wirf beide zehnseitigen Würfel. Der Zehnerwürfel bestimmt die Zehnerstelle, der Einerwürfel die Einerstelle. Zusammen ergeben sie den Prozentwurf. Der Wurf gelingt, wenn das Ergebnis kleiner oder gleich dem angegebenen Prozentwert ist (z. B. Fertigkeits- oder Angriffswert).",
    w20: "Eigenschaftsprobe: Wirf einen zwanzigseitigen Würfel (W20). Der Wurf gelingt, wenn das Ergebnis kleiner oder gleich deinem Eigenschaftswert ist."
  };
  document.querySelectorAll(".dice-pair").forEach((pair) => {
    pair.dataset.diceTip = explanations.w10;
    pair.title = explanations.w10;
    pair.tabIndex = 0;
    pair.setAttribute("aria-label", explanations.w10);
  });
  document.querySelectorAll("img.dice-icon.w6, img.dice-icon.w20").forEach((die) => {
    const kind = die.classList.contains("w6") ? "w6" : "w20";
    const wrapper = document.createElement("span");
    wrapper.className = "dice-tooltip";
    wrapper.dataset.diceTip = explanations[kind];
    wrapper.title = explanations[kind];
    wrapper.tabIndex = 0;
    wrapper.setAttribute("role", "img");
    wrapper.setAttribute("aria-label", explanations[kind]);
    die.replaceWith(wrapper);
    wrapper.appendChild(die);
  });
})();
