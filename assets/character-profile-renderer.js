/* JSON/Markdown-Profilrenderer. Keine Regelwerte berechnen oder ergänzen. */
(() => {
  "use strict";
  const page = document.querySelector("[data-profile-src]");
  if (!page || !page.querySelector("[data-profile-content]")) return;
  const el = (tag, cls, value) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (value !== undefined && value !== null) n.textContent = String(value);
    return n;
  };
  const validate = (d) => {
    if (!d || typeof d !== "object" || Array.isArray(d)) throw Error("Profildaten sind kein JSON-Objekt.");
    if (d.schemaVersion !== 1) throw Error("Nicht unterstützte schemaVersion.");
    if (!d.profile || typeof d.profile !== "object") throw Error("Profilkopf fehlt.");
    return d;
  };
  function diceImage(file, cls, alt, tooltip) {
    const img = el("img", "dice-icon " + cls);
    img.src = "../assets/wuerfel/" + file;
    img.alt = alt;
    if (tooltip) { img.dataset.tip = tooltip; img.tabIndex = 0; }
    return img;
  }
  function appendW10Pair(parent, tooltip) {
    const pair = el("span", "dice-pair");
    pair.setAttribute("aria-label", "W10-Zehnerwürfel und W10-Einerwürfel");
    if (tooltip) { pair.dataset.tip = tooltip; pair.tabIndex = 0; }
    pair.append(diceImage("w10_90.png", "w10", "Zehnerwürfel"), diceImage("w10_9.png", "w10", "Einerwürfel"));
    parent.append(pair);
  }
  function valueCard(v) {
    const card = el("div", "sheet-field");
    const propertyName = v.label || v.name || v.key || "";
    const isPrimaryAttribute = ["Stärke","Ausdauer","Gewandtheit","Intelligenz","Intuition"].includes(propertyName);
    const label = el("span", "", propertyName);
    if (Array.isArray(v.value) && v.tooltip) { label.dataset.tip = v.tooltip; label.tabIndex = 0; }
    card.append(label);
    if (Array.isArray(v.value)) {
      const languageList = el("ul", "profile-language-list");
      v.value.forEach(language => {
        const item = el("li", "", "");
        const name = el("strong", "", language.name);
        const level = el("span", "calculated-value", String(language.value));
        item.append(name, document.createTextNode(" – "), level);
        if (language.status === "provisional") item.append(el("small","profile-status provisional","Vorläufig"));
        if (language.source) sourceDetails(item,language.source);
        languageList.append(item);
      });
      card.append(languageList);
    } else {
      const value = el("strong", [v.tooltip ? "calculated-value" : "", isPrimaryAttribute ? "attribute-scale-value" : ""].filter(Boolean).join(" "), v.value);
      if (isPrimaryAttribute) value.dataset.attributeScale = "";
      if (v.tooltip && !isPrimaryAttribute && !Array.isArray(v.value)) { value.dataset.tip = v.tooltip; value.tabIndex = 0; }
      card.append(value);
    }
    if (isPrimaryAttribute) card.append(diceImage("w20.png", "w20", "W20", "Für eine Eigenschaftsprobe würfelst du mit einem W20. Das Ergebnis muss kleiner oder gleich deinem Eigenschaftswert sein, damit die Probe gelingt."));
    if (v.description) card.append(el("small", "attribute-help", v.description));
    if (v.status === "provisional") card.append(el("small", "profile-status provisional", "Vorläufig"));
    if (v.conditionalTooltip) {
      const race = (window.__profileData?.attributes?.characterData || []).find(x => x.label === v.conditionalTooltip.field)?.value;
      if (Array.isArray(v.conditionalTooltip.equals) ? v.conditionalTooltip.equals.includes(race) : race === v.conditionalTooltip.equals) {
        const target = card.querySelector("strong");
        if (target) target.dataset.tip = (v.tooltip || "") + v.conditionalTooltip.text;
      }
    }
    return card;
  }
  function valueGroup(title, values, gridClass = "sheet-grid sheet-grid-3", hiddenLabels = []) {
    if (!Array.isArray(values) || !values.length) return null;
    const visibleValues = values.filter(v => !hiddenLabels.includes(v.label || v.name || v.key));
    if (!visibleValues.length) return null;
    const group = el("section", "profile-data-group");
    group.append(el("h3", "", title));
    const grid = el("div", gridClass);
    visibleValues.forEach(v => grid.append(valueCard(v)));
    group.append(grid);
    return group;
  }
  // Quellen bleiben für Prüfung und Pflege in den Daten, werden Spielern aber nicht angezeigt.
  function sourceDetails() {}
  function table(title, rows, columns, options = {}) {
    if (!Array.isArray(rows) || !rows.length) return null;
    const card = el("div", "sheet-card");
    if (title) card.append(el("h3", "", title));
    const wrap = el("div", "table-scroll"), table = el("table", "sheet-table");
    const head = document.createElement("thead"), hr = document.createElement("tr");
    columns.forEach(c => { const th=el("th","",c.label); th.scope="col"; if(c.tooltip){th.dataset.tip=c.tooltip;th.tabIndex=0;} hr.append(th); });
    head.append(hr); table.append(head);
    const body = document.createElement("tbody");
    rows.forEach(row => {
      const tr = document.createElement("tr");
      columns.forEach((c,index) => {
        const td = document.createElement("td"), v = row[c.key];
        if (v && typeof v === "object" && "value" in v) {
          const isNumericSkill = options.scaleValues && typeof v.value === "number" && Number.isFinite(v.value);
          const span = el("span", [v.tooltip ? "calculated-value" : "", isNumericSkill ? "skill-scale-candidate" : ""].filter(Boolean).join(" "), v.value);
          if (v.tooltip) { span.dataset.tip = v.tooltip; span.tabIndex = 0; }
          if (v.status === "provisional") span.classList.add("provisional");
          td.append(span);
          if (options.dicePairOnValue && c.key === "value") appendW10Pair(td, options.dicePairTooltip);
          if (v.status === "provisional") td.append(el("small","profile-status provisional","Vorläufig"));
          sourceDetails(td,v.source);
        } else {
          const cellValue = el("span", "", v == null ? "" : v);
          if (c.key === "level" && row.tooltip) { cellValue.dataset.tip = row.tooltip; cellValue.tabIndex = 0; }
          td.append(cellValue);
        }
        if (c.key === "damage") {
          const damageValue = v && typeof v === "object" && "value" in v ? String(v.value) : (v == null ? "" : String(v));
          const match = /^(\d+)W(?:6)?([+-]\s*\d+)?$/i.exec(damageValue.trim());
          if (match) {
            const valueNode = td.querySelector("span") || td.firstChild;
            if (valueNode && valueNode.nodeType === Node.ELEMENT_NODE) valueNode.textContent = match[1];
            else if (valueNode) valueNode.textContent = match[1];
            else td.append(document.createTextNode(match[1]));
            const dice = diceImage("w6.png", "w6", "W6");
            if (valueNode && valueNode.nodeType === Node.ELEMENT_NODE) valueNode.after(dice);
            else td.append(dice);
            if (match[2]) td.append(document.createTextNode(" " + match[2].replace(/\s+/g," ")));
          }
        }
        if (index===0 && row.status==="provisional") td.append(el("small","profile-status provisional","Vorläufig"));
        if (index===0 && row.source) sourceDetails(td,row.source);
        tr.append(td);
      });
      body.append(tr);
    });
    table.append(body); wrap.append(table); card.append(wrap); return card;
  }
  function accordion(title, content, id, initiallyOpen = false) {
    if (!content || !content.childNodes.length) return null;
    const section = el("section", "accordion-item profile-accordion-item");
    const heading = el("h2", "accordion-heading");
    const button = el("button", "accordion-trigger", title);
    button.type = "button"; button.setAttribute("aria-expanded", String(initiallyOpen)); button.setAttribute("aria-controls", id);
    const panel = el("div", "accordion-panel"); panel.id = id; panel.hidden = !initiallyOpen; panel.append(content);
    button.addEventListener("click", () => {
      const open = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(open)); panel.hidden = !open;
    });
    heading.append(button); section.append(heading, panel); return section;
  }
  function markdown(source, target) {
    let p = [];
    const flush = () => { if (p.length) { target.append(el("p", "", p.join(" "))); p = []; } };
    source.replace(/^\uFEFF/, "").split(/\r?\n/).forEach(line => {
      const h = /^(#{1,3})\s+(.+)$/.exec(line);
      if (h) { flush(); target.append(el(h[1].length <= 2 ? "h2" : "h3", "story-heading", h[2])); }
      else if (!line.trim() || /^<!--/.test(line.trim())) flush();
      else p.push(line.trim());
    });
    flush();
  }
  function header(profile) {
    const title = document.querySelector("[data-profile-title]");
    const subtitle = document.querySelector("[data-profile-subtitle]");
    const image = document.querySelector("[data-profile-image]");
    if (title) title.textContent = profile.title || profile.name || "Charakterprofil";
    if (subtitle) subtitle.textContent = [profile.people, profile.profession].filter(Boolean).join(" · ");
    if (image) {
      if (profile.portrait) {
        image.src = new URL(profile.portrait, new URL(page.dataset.profileSrc, location.href)).href;
        image.alt = profile.portraitAlt || ""; image.hidden = false;
      } else { image.hidden = true; image.removeAttribute("src"); image.alt = ""; }
    }
    document.title = (profile.name || profile.title || "Charakterprofil") + " – Die Helden von Dornfels";
  }
  function attributes(a) {
    window.__profileData = window.__profileData || {};
    window.__profileData.attributes = a;
    const root = el("div", "profile-section-content");
    const hiddenCharacterData = ["Erfahrung","Stufe","Ehre","Abenteuerpunkte","Reichweite (belastet)","AP noch"];
    const hiddenAttributes = ["Reaktion (belastet)","Initiative (belastet)","Ausweichen (belastet)","Gewandtheit (belastet)","Beweglichkeit (belastet)","Bewegungsreichweite (unbelastet)","Bewegungsreichweite (belastet)"];
    [["Charakterdaten",a.characterData,hiddenCharacterData],["Eigenschaften",a.values,hiddenAttributes],["Lebenswerte",a.lifeValues,[]]]
      .forEach(([t,v,hidden]) => { const g=valueGroup(t,v,"sheet-grid sheet-grid-3",hidden); if(g) root.append(g); });
    return root;
  }
  function subAccordion(title, content, id) {
    if (!content || !content.childNodes.length) return null;
    const section=el("section","subaccordion-item profile-subaccordion-item");
    const button=el("button","subaccordion-trigger",title);
    button.type="button"; button.setAttribute("aria-expanded","false"); button.setAttribute("aria-controls",id);
    const panel=el("div","subaccordion-panel"); panel.id=id; panel.hidden=true; panel.append(content);
    button.addEventListener("click",()=>{const open=button.getAttribute("aria-expanded")!=="true";button.setAttribute("aria-expanded",String(open));panel.hidden=!open;});
    section.append(button,panel); return section;
  }
  function skills(s) {
    const root=el("div","profile-section-content");
    const nested=el("div","nested-accordion skill-tabs");
    (s.groups || []).forEach((g,i) => {
      const t=table(null,g.skills,[{key:"name",label:"Fertigkeit"},{key:"value",label:"Endwert"}],{dicePairOnValue:true,scaleValues:true,dicePairTooltip:"Für eine Fertigkeitsprobe bildest du mit zwei W10 einen Prozentwurf: Der Zehnerwürfel bestimmt die Zehnerstelle, der Einerwürfel die Einerstelle. Der zusammengesetzte Wert ist dein Wurf. Die Probe gelingt, wenn der Prozentwurf höchstens deinem Fertigkeitswert entspricht."});
      if(t) {
        t.classList.add("skill-card");
        const content=el("div","profile-skill-group");
        content.append(t);
        const a=subAccordion(g.name+(g.bonus?" · "+g.bonus:""),content,"profile-skill-"+i);
        if(a) nested.append(a);
      }
    });
    root.append(nested); return root;
  }
  function magic(m) {
    const root=el("div","profile-section-content");
    if(Array.isArray(m.lists) && m.lists.length) {
      const card=el("div","sheet-card"); card.append(el("h3","","Spruchlisten"));
      const ul=document.createElement("ul"); m.lists.forEach(x=>ul.append(el("li","",x))); card.append(ul); root.append(card);
    }
    const g=valueGroup("Magische Fertigkeiten",m.skills,"sheet-grid sheet-grid-2"); if(g) {
      g.querySelectorAll(".sheet-field").forEach(card => {
        const value = card.querySelector("strong");
        if (value) {
          const pair = el("span", "dice-pair");
          pair.setAttribute("aria-label", "W10-Zehnerwürfel und W10-Einerwürfel");
          pair.append(diceImage("w10_90.png", "w10", "Zehnerwürfel"), diceImage("w10_9.png", "w10", "Einerwürfel"));
          value.after(pair);
        }
      });
      root.append(g);
    }
    const details=valueGroup("Berufliche Magiemerkmale",m.details,"sheet-grid sheet-grid-2",["Verfügbare Elemente","Zauberfokus","Maximale AP","Rüstungsbeschränkung","Waffenbeschränkung"]); if(details) root.append(details);
    (m.spellGroups || []).forEach(x=>{ const t=table(x.name,x.spells,[{key:"name",label:"Zauber / Wirkung"},{key:"level",label:"Stufe"}]); if(t) root.append(t); });
    return root;
  }
  function equipment(e) {
    const root=el("div","profile-section-content");
    [
      ["Waffen",e.weapons,[["name","Waffe"],["attack","Attacke","Angriffswert der Waffe in Prozent."],["parry","Parade","Wert der Waffe zur Abwehr eines Angriffs in Prozent."],["damage","Schaden","Schadenswurf mit W6; ein angegebener Zuschlag wird addiert."],["breakFactor","BF","Bruchfaktor: Bei einer Erhöhung W20 über den neuen Wert würfeln, sonst zerbricht die Waffe."],["burden","Belastung","Belastungspunkte des Gegenstands; zählen zur Gesamtbelastung, wenn mitgeführt."]]],
      ["Rüstung und Schutz",e.armor,[["name","Rüstungsteil"],["protection","RS","Rüstungsschutz des jeweiligen Körperteils."],["burden","Belastung","Belastungspunkte des Rüstungsteils; zählen zur Gesamtbelastung, wenn mitgeführt."],["impairment","Behinderung","Abzüge der Rüstung auf Beweglichkeit und/oder Gewandtheit."],["breakFactor","BF","Bruchfaktor: Bei einer Erhöhung W20 über den neuen Wert würfeln, sonst zerbricht das Rüstungsteil."]]],
      ["Besitz",(e.possessions || []).map(item => ({...item, quantity: typeof item.quantity === "string" ? item.quantity.split(" · ")[0] : item.quantity})),[["name","Gegenstand"],["quantity","Anzahl"],["burden","Belastung","Belastungspunkte des jeweiligen Gegenstands."]]]
    ].forEach(([title,rows,cols])=>{ const t=table(title,rows,cols.map(([key,label,tooltip])=>({key,label,tooltip}))); if(t) root.append(t); });
    const wealth=valueGroup("Vermögen",e.wealth,"sheet-grid sheet-grid-4"); if(wealth) root.append(wealth);
    return root;
  }
  async function run() {
    const r=await fetch(page.dataset.profileSrc,{cache:"no-store"});
    if(!r.ok) throw Error("JSON-Profildaten konnten nicht geladen werden.");
    const d=validate(await r.json()); window.__profileData = d; header(d.profile);
    const target=page.querySelector("[data-profile-content]"); target.replaceChildren();
    if(page.dataset.backgroundSrc) {
      const sr=await fetch(page.dataset.backgroundSrc,{cache:"no-store"});
      if(!sr.ok) throw Error("Hintergrund-Markdown konnte nicht geladen werden.");
      const story=el("div","profile-section-content"); markdown(await sr.text(),story);
      const a=accordion("Hintergrundgeschichte",story,"profile-background",true); if(a) target.append(a);
    }
    [
      ["Eigenschaften",d.attributes && attributes(d.attributes),"profile-attributes"],
      ["Fertigkeiten",d.skills && skills(d.skills),"profile-skills"],
      ["Magie",d.magic && magic(d.magic),"profile-magic"],
      ["Ausrüstung",d.equipment && equipment(d.equipment),"profile-equipment"]
    ].forEach(([t,c,id])=>{ const a=accordion(t,c,id); if(a) target.append(a); });
    if (typeof window.applyCharacterValueColors === "function") {
      window.applyCharacterValueColors(target);
    }
    document.querySelectorAll("[data-expand-all]").forEach(b=>b.addEventListener("click",()=>target.querySelectorAll(".profile-accordion-item,.profile-subaccordion-item").forEach(i=>{const button=i.querySelector("button");const panel=i.querySelector(".accordion-panel,.subaccordion-panel");if(button&&panel){button.setAttribute("aria-expanded","true");panel.hidden=false;}})));
    document.querySelectorAll("[data-collapse-all]").forEach(b=>b.addEventListener("click",()=>target.querySelectorAll(".profile-accordion-item,.profile-subaccordion-item").forEach(i=>{const button=i.querySelector("button");const panel=i.querySelector(".accordion-panel,.subaccordion-panel");if(button&&panel){button.setAttribute("aria-expanded","false");panel.hidden=true;}})));
    target.querySelectorAll("table.sheet-table").forEach(t=>t.querySelectorAll("thead th").forEach(th=>th.scope="col"));
    const popup=document.createElement("div"); popup.className="tooltip-portal"; popup.id="profile-tooltip-portal"; popup.setAttribute("role","tooltip"); popup.hidden=true; document.body.append(popup);
    let active=null;
    const hide=()=>{if(active)active.removeAttribute("aria-describedby");active=null;popup.hidden=true;};
    const show=node=>{if(!node.dataset.tip)return;active=node;popup.textContent=node.dataset.tip;popup.hidden=false;node.setAttribute("aria-describedby",popup.id);const r=node.getBoundingClientRect();const left=Math.max(8,Math.min(r.left+r.width/2-popup.offsetWidth/2,window.innerWidth-popup.offsetWidth-8));let top=r.top-popup.offsetHeight-9;if(top<8)top=Math.min(window.innerHeight-popup.offsetHeight-8,r.bottom+9);popup.style.left=left+"px";popup.style.top=Math.max(8,top)+"px";};
    target.querySelectorAll("[data-tip]").forEach(node=>{if(!node.hasAttribute("tabindex"))node.tabIndex=0;node.addEventListener("mouseenter",()=>show(node));node.addEventListener("mouseleave",hide);node.addEventListener("focus",()=>show(node));node.addEventListener("blur",hide);});
  }
  run().catch(error=>{ console.error(error); const t=page.querySelector("[data-profile-content]"); if(t) t.textContent="Das Charakterprofil konnte nicht geladen werden: "+error.message; });
})();