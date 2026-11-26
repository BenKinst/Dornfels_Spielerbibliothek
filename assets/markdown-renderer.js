(() => {
  document.querySelectorAll("[data-markdown-src]").forEach(async (section) => {
    const target = section.querySelector("[data-markdown-target]") ||
      section.querySelector("#background-story-content");
    if (!target) return;
    const source = section.dataset.markdownSrc;
    try {
      const response = await fetch(source, { cache: "no-store" });
      if (!response.ok) return;
      const lines = (await response.text()).split(/\r?\n/);
      let paragraph = [];
      const flushParagraph = () => {
        if (!paragraph.length) return;
        const p = document.createElement("p");
        p.textContent = paragraph.join(" ");
        target.appendChild(p);
        paragraph = [];
      };
      for (const line of lines) {
        if (line.startsWith("## ") || line.startsWith("# ")) {
          flushParagraph();
          const heading = document.createElement("h2");
          heading.textContent = line.startsWith("## ") ? line.slice(3) : line.slice(2);
          target.appendChild(heading);
        } else if (!line.trim()) {
          flushParagraph();
        } else {
          paragraph.push(line.trim());
        }
      }
      flushParagraph();
      if (target.childElementCount && section.hasAttribute("hidden")) section.hidden = false;
    } catch (error) {
      console.error(`Die Markdown-Datei konnte nicht geladen werden: ${source}`, error);
    }
  });
})();
