import { readFile, writeFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

try {
  const bemenet = new URL("./regi-jovahagyas.ts", import.meta.url);
  const kimenet = new URL("./molekula-azonossag.mjs", import.meta.url);
  const eredeti = (await readFile(bemenet, "utf8"))
    .replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");

  const hatar = /^export\s+default\s*\{/m.exec(eredeti);
  if (!hatar) {
    throw new Error("Nem található az export default kezdetű szerverrész.");
  }

  const segedek = eredeti.slice(0, hatar.index).replace(
    /^import\s*\{\s*withSupabase\s*\}\s*from\s*["']npm:@supabase\/server["'];?\s*$/m,
    "",
  );

  if (/\b(import|export|require|Deno|withSupabase|fetch)\b|supabase/i.test(segedek)) {
    throw new Error(
      "A segédrész további külső hivatkozást tartalmaz. Másold ide a hibaüzenetet; a forrás eltér a várttól.",
    );
  }

  const nevek = [
    "egyediNevek", "objektumVagyUres",
    "kapcsolatiKulcsKeszitese", "pontosSzerkezetEgyezik",
  ];
  const hash = createHash("sha256").update(eredeti).digest("hex");
  const kod = "// Átvéve a regi-jovahagyas.ts segédfüggvényeiből.\n"
    + "// Forrás SHA-256: " + hash + "\n"
    + stripTypeScriptTypes(segedek, { mode: "strip" })
    + "\nexport { " + nevek.join(", ") + " };\n";

  const modul = await import(
    "data:text/javascript;base64," + Buffer.from(kod).toString("base64")
  );
  for (const nev of nevek) assert.equal(typeof modul[nev], "function");

  const a = { atomok: ["C", "O", "N"], kotesek: [[0, 1, 1], [1, 2, 1]] };
  const b = { atomok: ["N", "C", "O"], kotesek: [[1, 2, 1], [2, 0, 1]] };
  const c = { atomok: ["C", "O", "N"], kotesek: [[0, 1, 1], [0, 2, 1]] };
  assert.equal(modul.pontosSzerkezetEgyezik(a, b), true);
  assert.equal(modul.pontosSzerkezetEgyezik(a, c), false);
  const kulcs = await modul.kapcsolatiKulcsKeszitese(a);
  assert.match(kulcs, /^v1-[a-f0-9]{64}$/);
  assert.equal(kulcs, await modul.kapcsolatiKulcsKeszitese(b));

  const kiralis = (konfiguracio) => ({
    atomok: ["C", "F", "Cl", "Br", "I"],
    kotesek: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]],
    sztereokemia: { kiralisCentrumok: [{ atomIndex: 0, konfiguracio }] },
  });
  assert.equal(modul.pontosSzerkezetEgyezik(kiralis("R"), kiralis("R")), true);
  assert.equal(modul.pontosSzerkezetEgyezik(kiralis("R"), kiralis("S")), false);

  const kettos = (konfiguracio) => ({
    atomok: ["F", "C", "C", "Cl"],
    kotesek: [[0, 1, 1], [1, 2, 2], [2, 3, 1]],
    sztereokemia: {
      kettosKotesek: [{ atom1Index: 1, atom2Index: 2, konfiguracio }],
    },
  });
  assert.equal(modul.pontosSzerkezetEgyezik(kettos("E"), kettos("E")), true);
  assert.equal(modul.pontosSzerkezetEgyezik(kettos("E"), kettos("Z")), false);

  try {
    await writeFile(kimenet, kod, { encoding: "utf8", flag: "wx" });
  } catch (hiba) {
    if (hiba.code !== "EEXIST") throw hiba;
    if (await readFile(kimenet, "utf8") !== kod) {
      throw new Error("A molekula-azonossag.mjs már létezik és eltér. Nem írtam felül.");
    }
  }

  console.log("Az ellenőrző függvények átvétele sikerült.");
  console.log("Szerkezeti és sztereokémiai próbák: rendben.");
  console.log("Elkészült: molekula-azonossag.mjs");
} catch (hiba) {
  console.error("Az átvétel sikertelen:", hiba.message);
  process.exitCode = 1;
}