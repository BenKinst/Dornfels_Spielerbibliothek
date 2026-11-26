/* Test-Renderer: liest strukturierte Profildaten und Hintergrundgeschichte
   aus content/heiler-komponenten-test.md. Bestehende Renderer bleiben unverändert. */
(async () => {
  const source = "../content/heiler-komponenten-test.md";
  const response = await fetch(source, { cache: "no-store" });
  if (!response.ok) throw new Error("Heiler-Testdaten konnten nicht geladen werden.");
  const markdown = await response.text();

  const dataMatch = markdown.match(/<!--\s*dornfels-data:start\s*([\s\S]*?)\s*dornfels-data:end\s*-->/i);
  if (!dataMatch) throw new Error("Strukturierter Datenblock fehlt in heiler-komponenten-test.md.");
  const data = JSON.parse(dataMatch[1]);

  const title = document.querySelector("[data-profile-title]");
  const subtitle = document.querySelector("[data-profile-subtitle]");
  const image = document.querySelector("[data-profile-image]");
  if (title) title.textContent = data.title || data.name || "Charakterprofil";
  if (subtitle) subtitle.textContent = [data.people, data.profession].filter(Boolean).join(" · ");
  if (image && data.portrait) {
    image.src = data.portrait;
    image.alt = data.portraitAlt || "Charakterillustration";
  }
  document.title = (data.name || "Charakterprofil") + " – Die Helden von Dornfels";
  const description = document.querySelector('meta[name="description"]');
  if (description) description.content = "Charakterprofil: " + [data.people, data.profession].filter(Boolean).join(" · ");

  const section = document.querySelector('[data-markdown-src]');
  const target = section && section.querySelector("[data-markdown-target]");
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
    if (line.startsWith("## ") || line.startsWith("# ")) {
      flush();
      const h = document.createElement("h2");
      h.textContent = line.startsWith("## ") ? line.slice(3) : line.slice(2);
      target.appendChild(h);
    } else if (!line.trim()) flush();
    else paragraph.push(line.trim());
  }
  flush();
})();
