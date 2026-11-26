/* Gemeinsamer Profil-Renderer für alle Charakterseiten.
   Die jeweilige Markdown-Quelldatei wird über data-profile-src angegeben. */
(async () => {
  "use strict";
  const page = document.querySelector("[data-profile-src]");
  if (!page) return;
  const source = page.dataset.profileSrc;
  try {
    const response = await fetch(source, { cache: "no-store" });
    if (!response.ok) throw new Error("Profildaten konnten nicht geladen werden: " + source);
    const markdown = await response.text();
    const dataMatch = markdown.match(/<!--\s*dornfels-data:start\s*([\s\S]*?)\s*dornfels-data:end\s*-->/i);
    const data = dataMatch ? JSON.parse(dataMatch[1]) : {};
    const title = document.querySelector("[data-profile-title]");
    const subtitle = document.querySelector("[data-profile-subtitle]");
    const image = document.querySelector("[data-profile-image]");
    if (title) title.textContent = data.title || data.name || "Charakterprofil";
    if (subtitle) subtitle.textContent = [data.people, data.profession].filter(Boolean).join(" · ");
    if (image && data.portrait) {
      image.src = new URL(data.portrait, new URL(source, window.location.href)).href;
      image.alt = data.portraitAlt || "Charakterillustration";
    } else if (image) {
      image.hidden = true;
    }
    document.title = (data.name || "Charakterprofil") + " – Die Helden von Dornfels";
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = "Charakterprofil: " + [data.people, data.profession].filter(Boolean).join(" · ");
    const target = page.querySelector("[data-markdown-target]");
    if (!target) return;
    const story = markdown
      .replace(/^\uFEFF?\s*<!--\s*dornfels-story:\s*freigegeben\s*-->\s*/i, "")
      .replace(/<!--\s*dornfels-data:start\s*[\s\S]*?dornfels-data:end\s*-->/i, "")
      .trim();
    let paragraph = [];
    const flush = () => {
      if (!paragraph.length) return;
      const p = document.createElement("p");
      p.textContent = paragraph.join(" ");
      target.appendChild(p);
      paragraph = [];
    };
    for (const line of story.split(/\r?\n/)) {
      if (line.startsWith("### ")) {
        flush();
        const h = document.createElement("h3");
        h.textContent = line.slice(4);
        target.appendChild(h);
      } else if (line.startsWith("## ") || line.startsWith("# ")) {
        flush();
        const h = document.createElement("h2");
        h.textContent = line.startsWith("## ") ? line.slice(3) : line.slice(2);
        target.appendChild(h);
      } else if (!line.trim()) flush();
      else paragraph.push(line.trim());
    }
    flush();
  } catch (error) {
    console.error(error);
    const target = page.querySelector("[data-markdown-target]");
    if (target) target.textContent = "Die Hintergrundgeschichte konnte nicht geladen werden.";
  }
})();