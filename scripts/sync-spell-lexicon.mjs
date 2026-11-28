#!/usr/bin/env node
/**
 * Synchronisiert Zauber-IDs zwischen Charakterprofilen und dem zentralen Lexikon.
 *
 * Verwendung:
 *   node scripts/sync-spell-lexicon.mjs        # IDs vergeben und Lexikon-Stubs anlegen
 *   node scripts/sync-spell-lexicon.mjs --check # nur prüfen, nichts verändern
 *
 * Wirkungsbeschreibungen werden absichtlich niemals erzeugt oder verändert.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const contentDir = path.join(root, "content");
const lexiconPath = path.join(contentDir, "zauberlexikon.json");
const checkOnly = process.argv.includes("--check");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

function listJsonFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listJsonFiles(fullPath);
    if (!entry.isFile() || !entry.name.endsWith(".json")) return [];
    if (path.resolve(fullPath) === path.resolve(lexiconPath)) return [];
    return [fullPath];
  }).sort();
}

function slugify(name) {
  const transliterated = name.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/æ/gi, "ae")
    .replace(/œ/gi, "oe")
    .replace(/ø/gi, "o")
    .toLowerCase();
  const slug = transliterated.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "zauber";
}

function shortHash(value) {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 8);
}

const profiles = listJsonFiles(contentDir).map((file) => ({ file, data: readJson(file), changed: false }));
const lexicon = readJson(lexiconPath);
if (lexicon.schemaVersion !== 1 || !Array.isArray(lexicon.spells)) {
  throw new Error("content/zauberlexikon.json hat nicht schemaVersion 1 mit einer spells-Liste.");
}

const byId = new Map();
const byName = new Map();
for (const entry of lexicon.spells) {
  if (!entry || typeof entry.id !== "string" || !entry.id.trim() || typeof entry.name !== "string" || !entry.name.trim()) {
    throw new Error("Jeder Lexikoneintrag benötigt eine nichtleere id und einen nichtleeren name.");
  }
  if (byId.has(entry.id)) throw new Error("Doppelte Lexikon-ID: " + entry.id);
  byId.set(entry.id, entry);
  const matches = byName.get(entry.name) || [];
  matches.push(entry);
  byName.set(entry.name, matches);
}
for (const [name, matches] of byName) {
  if (matches.length > 1) throw new Error("Der Zaubername steht mehrfach im Lexikon und ist nicht eindeutig: " + name);
}

let assigned = 0;
let created = 0;
for (const profile of profiles) {
  const groups = profile.data?.magic?.spellGroups;
  if (!Array.isArray(groups)) continue;
  for (const group of groups) {
    if (!Array.isArray(group.spells)) continue;
    for (const spell of group.spells) {
      if (!spell || typeof spell.name !== "string" || !spell.name.trim()) {
        throw new Error("Ein Zauber in " + path.relative(root, profile.file) + " hat keinen gültigen Namen.");
      }

      let id = typeof spell.lexiconId === "string" && spell.lexiconId.trim() ? spell.lexiconId : null;
      if (!id) {
        const sameName = byName.get(spell.name);
        if (sameName?.length === 1) {
          id = sameName[0].id;
        } else {
          const base = slugify(spell.name);
          id = base;
          const occupied = byId.get(id);
          if (occupied && occupied.name !== spell.name) id = base + "-" + shortHash(spell.name);
          let suffix = 2;
          while (byId.has(id) && byId.get(id).name !== spell.name) {
            id = base + "-" + shortHash(spell.name) + "-" + suffix++;
          }
        }
        spell.lexiconId = id;
        profile.changed = true;
        assigned++;
      }

      const existing = byId.get(id);
      if (existing && existing.name !== spell.name) {
        throw new Error("ID-Konflikt in " + path.relative(root, profile.file) + ": " + id +
          " gehört im Lexikon zu „" + existing.name + "“, im Profil aber zu „" + spell.name + "“.");
      }
      if (!existing) {
        const entry = { id, name: spell.name };
        lexicon.spells.push(entry);
        byId.set(id, entry);
        const matches = byName.get(spell.name) || [];
        matches.push(entry);
        byName.set(spell.name, matches);
        created++;
      }
    }
  }
}

if (checkOnly) {
  if (assigned || created) {
    throw new Error("Lexikon-Synchronisierung erforderlich: " + assigned +
      " fehlende IDs, " + created + " fehlende Lexikoneinträge. Ohne --check ausführen.");
  }
  console.log("OK: Alle Zauber besitzen stabile IDs und passende Lexikoneinträge.");
} else {
  for (const profile of profiles) {
    if (profile.changed) writeJson(profile.file, profile.data);
  }
  if (created) {
    lexicon.spells.sort((a, b) => a.id.localeCompare(b.id, "de"));
    writeJson(lexiconPath, lexicon);
  }
  console.log("Zauberlexikon synchronisiert: " + assigned + " IDs vergeben, " +
    created + " Lexikoneinträge angelegt. Wirkungsbeschreibungen blieben unverändert.");
}
