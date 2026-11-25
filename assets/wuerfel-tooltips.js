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

  const tooltipTargets = document.querySelectorAll(
    ".calculated-value[data-tip], .dice-pair[data-dice-tip], .dice-tooltip[data-dice-tip]"
  );
  let activeTooltip = null;
  let tooltipElement = null;

  const positionTooltip = () => {
    if (!activeTooltip || !tooltipElement) return;
    const rect = activeTooltip.getBoundingClientRect();
    const tipRect = tooltipElement.getBoundingClientRect();
    const margin = 12;
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - tipRect.width - margin));
    let top = rect.top - tipRect.height - 9;
    if (top < margin) top = rect.bottom + 9;
    top = Math.max(margin, Math.min(top, window.innerHeight - tipRect.height - margin));
    tooltipElement.style.left = `${left}px`;
    tooltipElement.style.top = `${top}px`;
  };

  const hideTooltip = (target) => {
    if (activeTooltip !== target) return;
    target.classList.remove("has-portal-tooltip");
    target.removeAttribute("aria-describedby");
    tooltipElement?.remove();
    tooltipElement = null;
    activeTooltip = null;
  };

  const showTooltip = (target) => {
    const text = target.dataset.tip || target.dataset.diceTip;
    if (!text) return;
    if (activeTooltip) hideTooltip(activeTooltip);
    activeTooltip = target;
    target.classList.add("has-portal-tooltip");
    tooltipElement = document.createElement("div");
    tooltipElement.className = "portal-tooltip";
    tooltipElement.id = "portal-tooltip";
    tooltipElement.setAttribute("role", "tooltip");
    tooltipElement.textContent = text;
    document.body.appendChild(tooltipElement);
    target.setAttribute("aria-describedby", tooltipElement.id);
    positionTooltip();
  };

  tooltipTargets.forEach((target) => {
    target.addEventListener("mouseenter", () => showTooltip(target));
    target.addEventListener("mouseleave", () => hideTooltip(target));
    target.addEventListener("focus", () => showTooltip(target));
    target.addEventListener("blur", () => hideTooltip(target));
  });
  window.addEventListener("scroll", positionTooltip, true);
  window.addEventListener("resize", positionTooltip);
})();