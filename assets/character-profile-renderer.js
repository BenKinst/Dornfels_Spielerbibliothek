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
  function valueCard(v) {
    const card = el("div", "sheet-field");
    card.append(el("span", "", v.label || v.name || v.key || ""));
    const value = el("strong", v.tooltip ? "calculated-value" : "", v.value);
    if (v.tooltip) { value.dataset.tip = v.tooltip; value.tabIndex = 0; }
    card.append(value);
    if (v.description) card.append(el("small", "attribute-help", v.description));
    if (v.status === "provisional") card.append(el("small", "profile-status provisional", "Vorläufig"));
    return card;
  }
  function valueGroup(title, values, gridClass = "sheet-grid sheet-grid-3") {
    if (!Array.isArray(values) || !values.length) return null;
    const group = el("section", "profile-data-group");
    group.append(el("h3", "", title));
    const grid = el("div", gridClass);
    values.forEach(v => grid.append(valueCard(v)));
    group.append(grid);
    return group;
  }
  function table(title, rows, columns) {
    if (!Array.isArray(rows) || !rows.length) return null;
    const card = el("div", "sheet-card");
    if (title) card.append(el("h3", "", title));
    const wrap = el("div", "table-scroll"), table = el("table", "sheet-table");
    const head = document.createElement("thead"), hr = document.createElement("tr");
    columns.forEach(c => { const th=el("th","",c.label); th.scope="col"; hr.append(th); });
    head.append(hr); table.append(head);
    const body = document.createElement("tbody");
    rows.forEach(row => {
      const tr = document.createElement("tr");
      columns.forEach((c,index) => {
        const td = document.createElement("td"), v = row[c.key];
        if (v && typeof v === "object" && "value" in v) {
          const span = el("span", v.tooltip ? "calculated-value" : "", v.value);
          if (v.tooltip) { span.dataset.tip = v.tooltip; span.tabIndex = 0; }
          if (v.status === "provisional") span.classList.add("provisional");
          td.append(span);
          if (v.status === "provisional") td.append(el("small","profile-status provisional","Vorläufig"));
        } else td.textContent = v == null ? "" : String(v);
        if (index===0 && row.status==="provisional") td.append(el("small","profile-status provisional","Vorläufig"));
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
      if (h) { flush(); target.append(el("h3", "background-heading", h[2])); }
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
    const root = el("div", "profile-section-content");
    [["Charakterdaten",a.characterData],["Eigenschaften & abgeleitete Werte",a.values],["Lebenswerte",a.lifeValues],["Talente und Fehler",a.specialFeatures]]
      .forEach(([t,v]) => { const g=valueGroup(t,v); if(g) root.append(g); });
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
      const t=table(null,g.skills,[{key:"name",label:"Fertigkeit"},{key:"value",label:"Endwert"}]);
      if(t) {
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
    const g=valueGroup("Magische Fertigkeiten",m.skills,"sheet-grid sheet-grid-2"); if(g) root.append(g);
    const details=valueGroup("Berufliche Magiemerkmale",m.details,"sheet-grid sheet-grid-2"); if(details) root.append(details);
    (m.spellGroups || []).forEach(x=>{ const t=table(x.name,x.spells,[{key:"name",label:"Zauber / Wirkung"},{key:"level",label:"Stufe"}]); if(t) root.append(t); });
    return root;
  }
  function equipment(e) {
    const root=el("div","profile-section-content");
    [
      ["Waffen",e.weapons,[["name","Waffe"],["attack","Attacke"],["parry","Parade"],["damage","Schaden"],["breakFactor","BF"],["burden","Belastung"]]],
      ["Rüstung und Schutz",e.armor,[["name","Rüstungsteil"],["protection","RS"],["burden","Belastung"],["impairment","Behinderung"],["breakFactor","BF"]]],
      ["Besitz",e.possessions,[["name","Gegenstand"],["quantity","Anzahl / Mitführung"],["burden","Belastung"]]]
    ].forEach(([title,rows,cols])=>{ const t=table(title,rows,cols.map(([key,label])=>({key,label}))); if(t) root.append(t); });
    const wealth=valueGroup("Vermögen",e.wealth); if(wealth) root.append(wealth);
    const load=valueGroup("Belastung",e.load,"sheet-grid sheet-grid-2"); if(load) root.append(load);
    return root;
  }
  async function run() {
    const r=await fetch(page.dataset.profileSrc,{cache:"no-store"});
    if(!r.ok) throw Error("JSON-Profildaten konnten nicht geladen werden.");
    const d=validate(await r.json()); header(d.profile);
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
    document.querySelectorAll("[data-expand-all]").forEach(b=>b.addEventListener("click",()=>target.querySelectorAll(".profile-accordion-item,.profile-subaccordion-item").forEach(i=>{const button=i.querySelector("button");const panel=i.querySelector(".accordion-panel,.subaccordion-panel");if(button&&panel){button.setAttribute("aria-expanded","true");panel.hidden=false;}})));
    document.querySelectorAll("[data-collapse-all]").forEach(b=>b.addEventListener("click",()=>target.querySelectorAll(".profile-accordion-item,.profile-subaccordion-item").forEach(i=>{const button=i.querySelector("button");const panel=i.querySelector(".accordion-panel,.subaccordion-panel");if(button&&panel){button.setAttribute("aria-expanded","false");panel.hidden=true;}})));
    target.querySelectorAll("table.sheet-table").forEach(t=>t.querySelectorAll("thead th").forEach(th=>th.scope="col"));
    const popup=document.createElement("div"); popup.className="tooltip-portal"; popup.id="profile-tooltip-portal"; popup.setAttribute("role","tooltip"); popup.hidden=true; document.body.append(popup);
    let active=null;
    const hide=()=>{if(active)active.removeAttribute("aria-describedby");active=null;popup.hidden=true;};
    const show=node=>{if(!node.dataset.tip)return;active=node;popup.textContent=node.dataset.tip;popup.hidden=false;node.setAttribute("aria-describedby",popup.id);const r=node.getBoundingClientRect();const left=Math.max(8,Math.min(r.left+r.width/2-popup.offsetWidth/2,window.innerWidth-popup.offsetWidth-8));let top=r.top-popup.offsetHeight-9;if(top<8)top=Math.min(window.innerHeight-popup.offsetHeight-8,r.bottom+9);popup.style.left=left+"px";popup.style.top=Math.max(8,top)+"px";};
    target.querySelectorAll(".calculated-value[data-tip]").forEach(node=>{if(!node.hasAttribute("tabindex"))node.tabIndex=0;node.addEventListener("mouseenter",()=>show(node));node.addEventListener("mouseleave",hide);node.addEventListener("focus",()=>show(node));node.addEventListener("blur",hide);});
  }
  run().catch(error=>{ console.error(error); const t=page.querySelector("[data-profile-content]"); if(t) t.textContent="Das Charakterprofil konnte nicht geladen werden: "+error.message; });
})();