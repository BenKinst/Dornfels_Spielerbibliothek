import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const syncScript = path.join(projectRoot, "scripts", "sync-spell-lexicon.mjs");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dornfels-spell-sync-"));

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
}
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}
function run(args = []) {
  return spawnSync(process.execPath, [syncScript, ...args], {
    cwd: tempRoot, encoding: "utf8"
  });
}

try {
  const content = path.join(tempRoot, "content");
  const lexiconFile = path.join(content, "zauberlexikon.json");
  const profileFile = path.join(content, "charakter.json");

  writeJson(lexiconFile, {
    schemaVersion: 1,
    spells: [
      { id: "schutz-wind", name: "Schutz", effect: "Wirkung A aus dem Lexikon." },
      { id: "gleicher-zauber", name: "Gleicher Zauber", effect: "Zentrale Wirkung." },
      { id: "anderer-name", name: "Andere Bezeichnung", effect: "Zentrale Wirkung." }
    ]
  });
  writeJson(profileFile, {
    schemaVersion: 1,
    profile: { name: "Test" },
    magic: { spellGroups: [
      { name: "Gesetz des Windes", spells: [
        { name: "Schutz", level: 1 },
        { name: "Gleicher Zauber", lexiconId: "gleicher-zauber", level: 2 },
        { name: "Neuer Zauber", level: 3 }
      ] }
    ] }
  });

  let result = run();
  assert.equal(result.status, 0, result.stderr || result.stdout);

  let profile = readJson(profileFile);
  let lexicon = readJson(lexiconFile);
  const spells = profile.magic.spellGroups.flatMap(group => group.spells);

  assert.equal(spells[0].lexiconId, "schutz-wind",
    "Ein Zauber ohne ID wird anhand eines eindeutigen Namens zugeordnet.");
  assert.equal(spells[1].lexiconId, "gleicher-zauber",
    "Eine vorhandene ID bleibt erhalten.");
  assert.ok(spells[2].lexiconId, "Ein neuer Zauber erhält eine lexiconId.");
  assert.ok(spells.every(spell => !Object.hasOwn(spell, "effect")),
    "Charakterprofile dürfen keine Wirkungsbeschreibungen enthalten.");
  assert.equal(lexicon.spells.find(entry => entry.id === "schutz-wind").effect,
    "Wirkung A aus dem Lexikon.",
    "Eine vorhandene Lexikonwirkung bleibt unverändert.");
  const newEntry = lexicon.spells.find(entry => entry.id === spells[2].lexiconId);
  assert.equal(newEntry.name, "Neuer Zauber");
  assert.equal(Object.hasOwn(newEntry, "effect"), false,
    "Ein neuer Lexikoneintrag bleibt bis zur Regelwerksprüfung ohne erfundene Wirkung.");

  result = run(["--check"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);

  // Gleiche Namen im Lexikon sind zulässig, müssen bei einer neuen Profilzuordnung
  // ohne explizite lexiconId aber als mehrdeutig erkannt werden.
  lexicon.spells.push({ id: "schutz-feuer", name: "Schutz", effect: "Wirkung B aus dem Lexikon." });
  writeJson(lexiconFile, lexicon);
  writeJson(profileFile, {
    schemaVersion: 1,
    profile: { name: "Mehrdeutig" },
    magic: { spellGroups: [{ name: "Liste", spells: [{ name: "Schutz", level: 1 }] }] }
  });
  result = run();
  assert.notEqual(result.status, 0, "Mehrdeutige Namen müssen eine explizite lexiconId erfordern.");
  assert.match(result.stderr, /Mehrere Lexikoneinträge heißen/);

  // Ein effect-Feld im Profil wird konsequent zurückgewiesen.
  writeJson(profileFile, {
    schemaVersion: 1,
    profile: { name: "Verbotenes Wirkungsfeld" },
    magic: { spellGroups: [{ name: "Liste", spells: [
      { name: "Schutz", lexiconId: "schutz-wind", effect: "Doppelte Wirkung", level: 1 }
    ] }] }
  });
  result = run();
  assert.notEqual(result.status, 0, "Wirkungsbeschreibungen im Profil müssen abgewiesen werden.");
  assert.match(result.stderr, /Wirkungen gehören ausschließlich ins zentrale Zauberlexikon/);

  // Eine lexiconId darf nicht auf einen anders benannten Eintrag zeigen.
  writeJson(profileFile, {
    schemaVersion: 1,
    profile: { name: "Falsche Referenz" },
    magic: { spellGroups: [{ name: "Liste", spells: [
      { name: "Falscher Name", lexiconId: "schutz-wind", level: 1 }
    ] }] }
  });
  result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Name passt nicht zur lexiconId/);

  console.log("OK: zentrale Wirkungsdaten, ID-Zuordnung, wirkungsfreie Profile und Mehrdeutigkeiten geprüft.");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
