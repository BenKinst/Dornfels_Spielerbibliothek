(() => {
  const explanations = {
    w6: "Schadenswurf: Wirf einen sechsseitigen Würfel (W6). Das Ergebnis bestimmt den Würfelanteil des Schadens; ein angegebener Schadensbonus wird anschließend addiert.",
    w10: "Fertigkeitswurf (Prozentwurf): Wirf beide zehnseitigen Würfel. Der Zehnerwürfel bestimmt die Zehnerstelle, der Einerwürfel die Einerstelle. Zusammen ergeben sie den Prozentwurf. Der Wurf gelingt, wenn das Ergebnis kleiner oder gleich dem angegebenen Prozentwert ist (z. B. Fertigkeits- oder Angriffswert).",
    w20: "Eigenschaftsprobe: Wirf einen zwanzigseitigen Würfel (W20). Der Wurf gelingt, wenn das Ergebnis kleiner oder gleich deinem Eigenschaftswert ist."
  };

  // Vorhandene Würfelgrafiken und ihre bisherigen Tooltip-Klassen beibehalten.
  document.querySelectorAll(".dice-pair").forEach((pair) => {
    pair.dataset.diceTip = explanations.w10;
    pair.setAttribute("aria-label", explanations.w10);
    pair.tabIndex = 0;
  });

  document.querySelectorAll("img.dice-icon.w6, img.dice-icon.w20").forEach((die) => {
    const kind = die.classList.contains("w6") ? "w6" : "w20";
    const wrapper = document.createElement("span");
    wrapper.className = "dice-tooltip";
    wrapper.dataset.diceTip = explanations[kind];
    wrapper.tabIndex = 0;
    wrapper.setAttribute("role", "img");
    wrapper.setAttribute("aria-label", explanations[kind]);
    die.replaceWith(wrapper);
    wrapper.appendChild(die);
  });

  // Ein einziges Tooltip-Element direkt unter body verhindert das Abschneiden
  // durch Tabellen-, Karten- oder Scroll-Container.
  const popup = document.createElement("div");
  popup.className = "tooltip-portal";
  popup.id = "tooltip-portal";
  popup.setAttribute("role", "tooltip");
  popup.hidden = true;
  document.body.appendChild(popup);

  let activeTarget = null;

  const positionPopup = () => {
    if (!activeTarget || popup.hidden) return;
    const rect = activeTarget.getBoundingClientRect();
    const margin = 8;
    const width = popup.offsetWidth;
    const height = popup.offsetHeight;
    const left = Math.max(margin, Math.min(
      rect.left + rect.width / 2 - width / 2,
      window.innerWidth - width - margin
    ));
    let top = rect.top - height - 9;
    if (top < margin) top = Math.min(window.innerHeight - height - margin, rect.bottom + 9);
    popup.style.left = left + "px";
    popup.style.top = Math.max(margin, top) + "px";
  };

  const showTooltip = (target) => {
    const content = target.dataset.tip || target.dataset.diceTip;
    if (!content) return;
    activeTarget = target;
    popup.textContent = content;
    popup.hidden = false;
    target.setAttribute("aria-describedby", popup.id);
    positionPopup();
  };

  const hideTooltip = (target) => {
    if (target && activeTarget !== target) return;
    if (activeTarget) activeTarget.removeAttribute("aria-describedby");
    activeTarget = null;
    popup.hidden = true;
  };

  const tooltipTargets = document.querySelectorAll(
    ".calculated-value[data-tip], .dice-tooltip[data-dice-tip], .dice-pair[data-dice-tip]"
  );
  tooltipTargets.forEach((target) => {
    target.addEventListener("mouseenter", () => showTooltip(target));
    target.addEventListener("mouseleave", () => hideTooltip(target));
    target.addEventListener("focus", () => showTooltip(target));
    target.addEventListener("blur", () => hideTooltip(target));
  });

  window.addEventListener("scroll", positionPopup, true);
  window.addEventListener("resize", positionPopup);
})();