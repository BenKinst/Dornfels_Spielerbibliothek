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
function run(args = []) {
  return spawnSync(process.execPath, [syncScript, ...args], {
    cwd: tempRoot, encoding: "utf8"
  });
}

try {
  const content = path.join(tempRoot, "content");
  writeJson(path.join(content, "zauberlexikon.json"), { schemaVersion: 1, spells: [] });
  writeJson(path.join(content, "charakter.json"), {
    schemaVersion: 1,
    profile: { name: "Test" },
    magic: { spellGroups: [
      { name: "Gesetz des Windes", spells: [
        { name: "Schutz", effect: "Erzeugt einen schützenden Windschirm.", level: 1 },
        { name: "Gleicher Zauber", effect: "Eine identische Wirkung.", level: 2 }
      ] },
      { name: "Gesetz des Feuers", spells: [
        { name: "Schutz", effect: "Erzeugt eine schützende Feuerbarriere.", level: 1 },
        { name: "Gleicher Zauber", effect: "Eine identische Wirkung.", level: 2 },
        { name: "Andere Bezeichnung", effect: "Eine identische Wirkung.", level: 3 }
      ] }
    ] }
  });

  let result = run();
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const profile = JSON.parse(fs.readFileSync(path.join(content, "charakter.json"), "utf8"));
  const lexicon = JSON.parse(fs.readFileSync(path.join(content, "zauberlexikon.json"), "utf8"));
  const spells = profile.magic.spellGroups.flatMap(group => group.spells);

  assert.notEqual(spells[0].lexiconId, spells[2].lexiconId,
    "Gleicher Name mit unterschiedlicher Wirkung muss getrennte IDs erhalten.");
  assert.equal(spells[1].lexiconId, spells[3].lexiconId,
    "Gleicher Name und gleiche Wirkung müssen listenübergreifend dieselbe ID erhalten.");
  assert.notEqual(spells[1].lexiconId, spells[4].lexiconId,
    "Unterschiedliche Namen dürfen trotz gleicher Wirkung nicht zusammengeführt werden.");
  assert.equal(lexicon.spells.length, 4, "Es müssen vier eindeutige Name-Wirkung-Paare entstehen; unterschiedliche Namen werden nicht zusammengeführt.");

  result = run(["--check"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);

  writeJson(path.join(content, "ohne-wirkung.json"), {
    schemaVersion: 1,
    profile: { name: "Unvollständig" },
    magic: { spellGroups: [{ name: "Beliebige Liste", spells: [{ name: "Unklar", level: 1 }] }] }
  });
  result = run();
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stderr, /Achtung! Neue Zauber-ID im Lexikon eingetragen/);
  const pendingProfile = JSON.parse(fs.readFileSync(path.join(content, "ohne-wirkung.json"), "utf8"));
  const pendingLexicon = JSON.parse(fs.readFileSync(path.join(content, "zauberlexikon.json"), "utf8"));
  const pendingSpell = pendingProfile.magic.spellGroups[0].spells[0];
  const pendingEntry = pendingLexicon.spells.find(entry => entry.id === pendingSpell.lexiconId);
  assert.ok(pendingSpell.lexiconId, "Auch ohne Wirkung muss eine lexiconId vergeben werden.");
  assert.equal(pendingEntry.name, "Unklar");
  assert.equal(Object.hasOwn(pendingEntry, "effect"), false,
    "Ein neuer Lexikoneintrag bleibt bis zur Regelwerksprüfung ohne erfundene Wirkung.");

  result = run(["--check"]);
  assert.equal(result.status, 0, result.stderr || result.stdout);

  console.log("OK: Namens-/Wirkungsabgleich, listenunabhängige Zuordnung und offene Wirkungen geprüft.");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
