#!/usr/bin/env node
/**
 * Synchronisiert Zauber-IDs zwischen Charakterprofilen und dem zentralen Lexikon.
 *
 * Verwendung:
 *   node scripts/sync-spell-lexicon.mjs        # IDs vergeben und Lexikon-Stubs anlegen
 *   node scripts/sync-spell-lexicon.mjs --check # nur prüfen, nichts verändern
 *
 * Identität: Zaubername + Wirkung. Der Name der Spruchliste ist bedeutungslos.
 * Wirkungsbeschreibungen werden niemals erfunden oder automatisch umgeschrieben.
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
function identity(name, effect) {
  return normalize(name) + "\u0000" + normalize(effect);
}

const profiles = listJsonFiles(contentDir).map((file) => ({ file, data: readJson(file), changed: false }));
const lexicon = readJson(lexiconPath);
if (lexicon.schemaVersion !== 1 || !Array.isArray(lexicon.spells)) {
  throw new Error("content/zauberlexikon.json hat nicht schemaVersion 1 mit einer spells-Liste.");
}

const byId = new Map();
const byIdentity = new Map();
for (const entry of lexicon.spells) {
  if (!entry || typeof entry.id !== "string" || !entry.id.trim() ||
      typeof entry.name !== "string" || !entry.name.trim()) {
    throw new Error("Jeder Lexikoneintrag benötigt eine nichtleere id und einen nichtleeren name.");
  }
  if (byId.has(entry.id)) throw new Error("Doppelte Lexikon-ID: " + entry.id);
  byId.set(entry.id, entry);
  if (typeof entry.effect === "string" && entry.effect.trim()) {
    const key = identity(entry.name, entry.effect);
    if (byIdentity.has(key)) throw new Error("Doppelter Lexikoneintrag für denselben Namen und dieselbe Wirkung: " + entry.name);
    byIdentity.set(key, entry);
  }
}

const pendingByName = new Map();
for (const entry of lexicon.spells) {
  if (!(typeof entry.effect === "string" && entry.effect.trim())) {
    const key = normalize(entry.name);
    const entries = pendingByName.get(key) || [];
    entries.push(entry);
    pendingByName.set(key, entries);
  }
}

let assigned = 0;
let created = 0;
let effectsAdded = 0;
for (const profile of profiles) {
  const groups = profile.data?.magic?.spellGroups;
  if (!Array.isArray(groups)) continue;
  for (const group of groups) {
    if (!Array.isArray(group.spells)) continue;
    for (const spell of group.spells) {
      if (!spell || typeof spell.name !== "string" || !spell.name.trim()) {
        throw new Error("Ein Zauber in " + path.relative(root, profile.file) + " hat keinen gültigen Namen.");
      }
      const hasEffect = typeof spell.effect === "string" && spell.effect.trim().length > 0;
      if (spell.effect != null && typeof spell.effect !== "string") {
        throw new Error("Die Wirkung muss Text sein: " + spell.name);
      }

      let entry = null;
      let id = typeof spell.lexiconId === "string" && spell.lexiconId.trim() ? spell.lexiconId : null;

      if (id) {
        entry = byId.get(id);
        if (!entry) throw new Error("Unbekannte lexiconId „" + id + "“ bei „" + spell.name + "“.");
        if (normalize(entry.name) !== normalize(spell.name)) {
          throw new Error("Name passt nicht zur lexiconId „" + id + "“: Profil „" + spell.name + "“, Lexikon „" + entry.name + "“.");
        }
        if (hasEffect) {
          if (entry.effect && normalize(entry.effect) !== normalize(spell.effect)) {
            throw new Error("Wirkung passt nicht zur lexiconId „" + id + "“ bei „" + spell.name + "“. Bitte einen eigenen Lexikoneintrag zuordnen.");
          }
          if (!entry.effect) {
            if (checkOnly) throw new Error("Wirkung fehlt im Lexikon für „" + spell.name + "“; Synchronisierung erforderlich.");
            entry.effect = spell.effect.trim();
            profile.changed = true;
            effectsAdded++;
            byIdentity.set(identity(entry.name, entry.effect), entry);
          }
        }
      } else {
        if (!hasEffect) {
          const pendingKey = normalize(spell.name);
          const pendingEntries = pendingByName.get(pendingKey) || [];
          if (pendingEntries.length > 1) {
            throw new Error("Mehrere wirkungslose Lexikoneinträge für „" + spell.name + "“; bitte vor der Synchronisierung eindeutig bereinigen.");
          }
          if (pendingEntries.length === 1) {
            entry = pendingEntries[0];
          } else {
            const pendingIdentity = pendingKey + "\\u0000__effect_pending__";
            const base = slugify(spell.name);
            let pendingId = base + "-" + hash(pendingIdentity);
            let suffix = 2;
            while (byId.has(pendingId)) pendingId = base + "-" + hash(pendingIdentity) + "-" + suffix++;
            entry = { id: pendingId, name: spell.name.trim() };
            lexicon.spells.push(entry);
            byId.set(pendingId, entry);
            pendingByName.set(pendingKey, [entry]);
            created++;
          }
          id = entry.id;
          spell.lexiconId = id;
          profile.changed = true;
          assigned++;
          continue;
        }
        const key = identity(spell.name, spell.effect);
        entry = byIdentity.get(key) || null;
        if (entry) {
          id = entry.id;
        } else {
          const base = slugify(spell.name);
          id = base + "-" + hash(key);
          let suffix = 2;
          while (byId.has(id)) id = base + "-" + hash(key) + "-" + suffix++;
          entry = { id, name: spell.name.trim(), effect: spell.effect.trim() };
          lexicon.spells.push(entry);
          byId.set(id, entry);
          byIdentity.set(key, entry);
          created++;
        }
        spell.lexiconId = id;
        profile.changed = true;
        assigned++;
      }
    }
  }
}

if (checkOnly) {
  if (assigned || created || effectsAdded) {
    throw new Error("Lexikon-Synchronisierung erforderlich: " + assigned + " fehlende IDs, " +
      created + " neue Einträge, " + effectsAdded + " ergänzte Wirkungen. Ohne --check ausführen.");
  }
  console.log("OK: Alle Zauber besitzen eine gültige lexiconId; Wirkungen können noch ergänzt werden.");
} else {
  for (const profile of profiles) if (profile.changed) writeJson(profile.file, profile.data);
  if (created || effectsAdded) {
    lexicon.spells.sort((a, b) => a.id.localeCompare(b.id, "de"));
    writeJson(lexiconPath, lexicon);
  }
  console.log("Zauberlexikon synchronisiert: " + assigned + " IDs vergeben, " + created +
    " neue Einträge angelegt, " + effectsAdded + " Wirkungen ergänzt. Listenname ignoriert.");
}

const missingEffects = lexicon.spells.filter(entry =>
  typeof entry.effect !== "string" || !entry.effect.trim()
);
if (created > 0) {
  console.warn("::warning::Achtung! Neue Zauber-ID im Lexikon eingetragen. Fülle den Eintrag mit der passenden Wirkung.");
} else if (missingEffects.length > 0) {
  console.warn("::warning::Achtung! Im Zauberlexikon fehlen noch Wirkungen für " +
    missingEffects.map(entry => entry.name + " [" + entry.id + "]").join(", ") + ".");
}
