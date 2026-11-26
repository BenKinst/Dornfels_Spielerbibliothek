/* Gemeinsamer Komponenten-Controller für Charakterseiten.
   Tabellen, Tooltips und Akkordeons werden hier zentral initialisiert. */
(() => {
  "use strict";

  const diceHelp = {
    w6: "Schadenswurf: Wirf einen sechsseitigen Würfel (W6). Das Ergebnis bestimmt den Würfelanteil des Schadens; ein angegebener Schadensbonus wird anschließend addiert.",
    w10: "Fertigkeitswurf (Prozentwurf): Wirf beide zehnseitigen Würfel. Der Zehnerwürfel bestimmt die Zehnerstelle, der Einerwürfel die Einerstelle. Zusammen ergeben sie den Prozentwurf. Der Wurf gelingt, wenn das Ergebnis kleiner oder gleich dem angegebenen Prozentwert ist.",
    w20: "Eigenschaftsprobe: Wirf einen zwanzigseitigen Würfel (W20). Der Wurf gelingt, wenn das Ergebnis kleiner oder gleich deinem Eigenschaftswert ist."
  };

  // TABLES: ein gemeinsames Markup, mit wenigen expliziten Varianten.
  document.querySelectorAll("table.sheet-table").forEach((table) => {
    table.dataset.uiComponent = "table";
    if (!table.dataset.tableVariant) table.dataset.tableVariant = "standard";
    table.querySelectorAll("thead th").forEach((cell) => cell.setAttribute("scope", "col"));
    const parent = table.parentElement;
    if (!parent || !parent.classList.contains("table-scroll")) {
      const wrapper = document.createElement("div");
      wrapper.className = "table-scroll";
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  });

  // VALUE TOOLTIP: Rechenwege und Würfelerklärungen nutzen denselben Portalmechanismus.
  document.querySelectorAll(".dice-pair").forEach((pair) => {
    pair.dataset.diceTip = diceHelp.w10;
    pair.setAttribute("aria-label", diceHelp.w10);
    if (!pair.hasAttribute("tabindex")) pair.tabIndex = 0;
  });

  document.querySelectorAll("img.dice-icon.w6, img.dice-icon.w20").forEach((die) => {
    if (die.parentElement && die.parentElement.classList.contains("dice-tooltip")) return;
    const kind = die.classList.contains("w6") ? "w6" : "w20";
    const wrapper = document.createElement("span");
    wrapper.className = "dice-tooltip";
    wrapper.dataset.diceTip = diceHelp[kind];
    wrapper.tabIndex = 0;
    wrapper.setAttribute("role", "img");
    wrapper.setAttribute("aria-label", diceHelp[kind]);
    die.replaceWith(wrapper);
    wrapper.appendChild(die);
  });

  document.querySelectorAll(".sheet-field:has(> .attribute-scale-value)").forEach((field) => {
    const value = field.querySelector(":scope > .attribute-scale-value");
    const die = field.querySelector(":scope > .dice-tooltip");
    if (!value || !die || value.parentElement.classList.contains("attribute-value-group")) return;
    const group = document.createElement("span");
    group.className = "attribute-value-group";
    field.insertBefore(group, value);
    group.append(value, die);
  });

  const popup = document.createElement("div");
  popup.className = "tooltip-portal";
  popup.id = "character-tooltip-portal";
  popup.setAttribute("role", "tooltip");
  popup.hidden = true;
  document.body.appendChild(popup);

  let activeTarget = null;
  const placePopup = () => {
    if (!activeTarget || popup.hidden) return;
    const rect = activeTarget.getBoundingClientRect();
    const margin = 8;
    const left = Math.max(margin, Math.min(rect.left + rect.width / 2 - popup.offsetWidth / 2,
      window.innerWidth - popup.offsetWidth - margin));
    let top = rect.top - popup.offsetHeight - 9;
    if (top < margin) top = Math.min(window.innerHeight - popup.offsetHeight - margin, rect.bottom + 9);
    popup.style.left = left + "px";
    popup.style.top = Math.max(margin, top) + "px";
  };
  const show = (target) => {
    const message = target.dataset.tip || target.dataset.diceTip;
    if (!message) return;
    activeTarget = target;
    popup.textContent = message;
    popup.hidden = false;
    target.setAttribute("aria-describedby", popup.id);
    placePopup();
  };
  const hide = (target) => {
    if (target && activeTarget !== target) return;
    if (activeTarget) activeTarget.removeAttribute("aria-describedby");
    activeTarget = null;
    popup.hidden = true;
  };
  document.querySelectorAll(".calculated-value[data-tip], .dice-tooltip[data-dice-tip], .dice-pair[data-dice-tip]").forEach((target) => {
    if (target.classList.contains("calculated-value") && !target.hasAttribute("tabindex")) target.tabIndex = 0;
    target.addEventListener("mouseenter", () => show(target));
    target.addEventListener("mouseleave", () => hide(target));
    target.addEventListener("focus", () => show(target));
    target.addEventListener("blur", () => hide(target));
  });
  window.addEventListener("scroll", placePopup, true);
  window.addEventListener("resize", placePopup);

  // ACCORDIONS: Haupt- und Unterbereiche folgen demselben Zustandsmodell.
  const groups = [
    { items: [...document.querySelectorAll("[data-accordion-item]")], button: ".accordion-trigger", panel: ".accordion-panel" },
    { items: [...document.querySelectorAll("[data-subaccordion-item]")], button: ".subaccordion-trigger", panel: ".subaccordion-panel" }
  ];
  const setOpen = (item, open, group) => {
    const button = item.querySelector(group.button);
    if (!button) return;
    const panel = document.getElementById(button.getAttribute("aria-controls"));
    if (!panel) return;
    button.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
  };
  groups.forEach((group) => group.items.forEach((item) => {
    const button = item.querySelector(group.button);
    if (button) button.addEventListener("click", () =>
      setOpen(item, button.getAttribute("aria-expanded") !== "true", group));
  }));
  document.querySelectorAll("[data-expand-all]").forEach((button) => button.addEventListener("click", () =>
    groups.forEach((group) => group.items.forEach((item) => setOpen(item, true, group)))));
  document.querySelectorAll("[data-collapse-all]").forEach((button) => button.addEventListener("click", () =>
    [...groups].reverse().forEach((group) => group.items.forEach((item) => setOpen(item, false, group)))));
})();
