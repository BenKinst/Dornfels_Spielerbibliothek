#!/usr/bin/env node
/**
 * Ordnet Zauber aus Charakterprofilen dem zentralen Zauberlexikon zu.
 *
 * Verwendung:
 *   node scripts/sync-spell-lexicon.mjs         # fehlende IDs vergeben, Lexikon-Stubs anlegen
 *   node scripts/sync-spell-lexicon.mjs --check  # nur prüfen, nichts verändern
 *
 * Datenhoheit:
 *   Charakterprofile enthalten Zaubername, Stufe und lexiconId.
 *   Wirkungsbeschreibungen werden ausschließlich in zauberlexikon.json gepflegt.
 *   Dieses Skript liest oder schreibt niemals Wirkungsbeschreibungen.
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
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listJsonFiles(fullPath);
    if (!entry.isFile() || !entry.name.endsWith(".json")) return [];
    if (path.resolve(fullPath) === path.resolve(lexiconPath)) return [];
    return [fullPath];
  }).sort();
}
function normalize(value) {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("de");
}
function slugify(name) {
  const transliterated = name.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/æ/gi, "ae")
    .replace(/œ/gi, "oe")
    .replace(/ø/gi, "o")
    .toLowerCase();
  return transliterated.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "zauber";
}
function hash(value) {
  return createHash("sha256").update(value, "utf8").digest("hex").slice(0, 12);
}

const profiles = listJsonFiles(contentDir).map(file => ({
  file, data: readJson(file), changed: false
}));
const lexicon = readJson(lexiconPath);
if (lexicon.schemaVersion !== 1 || !Array.isArray(lexicon.spells)) {
  throw new Error("content/zauberlexikon.json hat nicht schemaVersion 1 mit einer spells-Liste.");
}

const byId = new Map();
const byName = new Map();
for (const entry of lexicon.spells) {
  if (!entry || typeof entry.id !== "string" || !entry.id.trim() ||
      typeof entry.name !== "string" || !entry.name.trim()) {
    throw new Error("Jeder Lexikoneintrag benötigt eine nichtleere id und einen nichtleeren name.");
  }
  if (byId.has(entry.id)) throw new Error("Doppelte Lexikon-ID: " + entry.id);
  byId.set(entry.id, entry);
  const key = normalize(entry.name);
  const matches = byName.get(key) || [];
  matches.push(entry);
  byName.set(key, matches);
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
      if (Object.hasOwn(spell, "effect")) {
        throw new Error("Wirkungen gehören ausschließlich ins zentrale Zauberlexikon; effect-Feld im Profil bei „" + spell.name + "“ entfernen.");
      }

      let entry = null;
      const id = typeof spell.lexiconId === "string" && spell.lexiconId.trim()
        ? spell.lexiconId : null;

      if (id) {
        entry = byId.get(id);
        if (!entry) throw new Error("Unbekannte lexiconId „" + id + "“ bei „" + spell.name + "“.");
        if (normalize(entry.name) !== normalize(spell.name)) {
          throw new Error("Name passt nicht zur lexiconId „" + id + "“: Profil „" + spell.name + "“, Lexikon „" + entry.name + "“.");
        }
        continue;
      }

      const matches = byName.get(normalize(spell.name)) || [];
      if (matches.length > 1) {
        throw new Error("Mehrere Lexikoneinträge heißen „" + spell.name + "“. Bitte die passende lexiconId im Profil ausdrücklich zuordnen.");
      }
      if (matches.length === 1) {
        entry = matches[0];
      } else {
        const base = slugify(spell.name);
        const identity = normalize(spell.name);
        let newId = base + "-" + hash(identity);
        let suffix = 2;
        while (byId.has(newId)) newId = base + "-" + hash(identity) + "-" + suffix++;
        entry = { id: newId, name: spell.name.trim() };
        lexicon.spells.push(entry);
        byId.set(newId, entry);
        byName.set(identity, [entry]);
        created++;
      }

      spell.lexiconId = entry.id;
      profile.changed = true;
      assigned++;
    }
  }
}

if (checkOnly) {
  if (assigned || created) {
    throw new Error("Lexikon-Zuordnung erforderlich: " + assigned +
      " fehlende IDs, " + created + " neue Lexikoneinträge. Ohne --check ausführen.");
  }
  console.log("OK: Alle Zauber besitzen eine gültige lexiconId; Wirkungen werden ausschließlich im Lexikon gepflegt.");
} else {
  for (const profile of profiles) {
    if (profile.changed) writeJson(profile.file, profile.data);
  }
  if (created) {
    lexicon.spells.sort((a, b) => a.id.localeCompare(b.id, "de"));
    writeJson(lexiconPath, lexicon);
  }
  console.log("Zauberzuordnung abgeschlossen: " + assigned +
    " IDs vergeben, " + created + " wirkungsfreie Lexikon-Stubs angelegt.");
}

const missingEffects = lexicon.spells.filter(entry =>
  typeof entry.effect !== "string" || !entry.effect.trim()
);
if (created > 0) {
  console.warn("::warning::Neue Zaubereinträge im Lexikon angelegt. Ergänze ihre Wirkung dort anhand der Regelwerksquelle.");
}
if (missingEffects.length > 0) {
  console.warn("::warning::Im Zauberlexikon fehlen noch Wirkungen für " +
    missingEffects.map(entry => entry.name + " [" + entry.id + "]").join(", ") + ".");
}
