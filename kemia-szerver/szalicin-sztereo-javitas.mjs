import { mkdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { DatabaseSync, backup } from "node:sqlite";
import {
  kapcsolatiKulcsKeszitese,
  pontosSzerkezetEgyezik
} from "./molekula-azonossag.mjs";

const ellenoriz = (ok, szoveg) => {
  if (!ok) throw new Error(szoveg);
};

const inchi = "NGFMICBWJRZIBI-UJPOAAIJSA-N";

const atomok = [
  ...Array(7).fill("O"),
  ...Array(13).fill("C")
];

const kotesek = [
  [0,10,1],[0,11,1],[1,11,1],[1,13,1],
  [2,7,1],[3,8,1],[4,9,1],[5,12,1],[6,17,1],
  [7,8,1],[7,9,1],[8,10,1],[9,11,1],[10,12,1],
  [13,14,1],[13,15,2],[14,16,2],[14,17,1],
  [15,18,1],[16,19,1],[18,19,2]
];

// Oxángyűrű: 2R,3S,4S,5R,6S.
// Az atomIndex a tárolt atomlista indexe.
const centrumok = [
  {
    atomIndex: 10,
    konfiguracio: "R",
    prioritasIndexek: [0,8,12],
    kiemeltAtomIndex: 12,
    elozetIrany: "elo"
  },
  {
    atomIndex: 8,
    konfiguracio: "S",
    prioritasIndexek: [3,10,7],
    kiemeltAtomIndex: 3,
    elozetIrany: "hatra"
  },
  {
    atomIndex: 7,
    konfiguracio: "S",
    prioritasIndexek: [2,9,8],
    kiemeltAtomIndex: 2,
    elozetIrany: "elo"
  },
  {
    atomIndex: 9,
    konfiguracio: "R",
    prioritasIndexek: [4,11,7],
    kiemeltAtomIndex: 4,
    elozetIrany: "hatra"
  },
  {
    atomIndex: 11,
    konfiguracio: "S",
    prioritasIndexek: [1,0,9],
    kiemeltAtomIndex: 1,
    elozetIrany: "elo"
  }
];

const kotesset = v => JSON.stringify(
  v.map(([i,j,r=1]) => [
    Math.min(i,j), Math.max(i,j), r
  ]).sort((a,b) => a[0]-b[0] || a[1]-b[1])
);

function javitas(adat) {
  ellenoriz(
    adat?.importAdatok?.pubchemCid === 439503 &&
    adat.importAdatok.inchiKey === inchi,
    "Eltérő PubChem-azonosítók; a javítást leállítottam."
  );

  ellenoriz(
    JSON.stringify(adat.atomok) === JSON.stringify(atomok) &&
    Array.isArray(adat.kotesek) &&
    kotesset(adat.kotesek) === kotesset(kotesek),
    "Eltérő atomsorrend vagy szerkezet; a javítást leállítottam."
  );

  const regi = adat.sztereokemia;

  ellenoriz(
    regi &&
    Array.isArray(regi.kiralisCentrumok) &&
    Array.isArray(regi.kettosKotesek) &&
    regi.kettosKotesek.length === 0,
    "Váratlan sztereokémiai adatok; a javítást leállítottam."
  );

  ellenoriz(
    regi.kiralisCentrumok.length === 0 ||
    JSON.stringify(regi.kiralisCentrumok) ===
      JSON.stringify(centrumok),
    "Már vannak eltérő centrumadatok. Nem írom felül őket."
  );

  const ekek = adat.importAdatok.pubchemEkKotesek;

  ellenoriz(
    Array.isArray(ekek) &&
    ekek.length === 5 &&
    centrumok.every(c => ekek.some(e =>
      e.atomIndex === c.atomIndex &&
      e.kiemeltAtomIndex === c.kiemeltAtomIndex &&
      e.elozetIrany === c.elozetIrany
    )),
    "Az ékkötések eltérnek a szalicin ellenőrzött rajzától."
  );

  return {
    ...adat,
    sztereokemia: {
      ...regi,
      statusz: "meghatarozott",
      kiralisCentrumok: centrumok
    },
    importAdatok: {
      ...adat.importAdatok,
      sztereoEllenorizendo: false
    }
  };
}

let db;
let tranzakcio = false;

try {
  const ut = fileURLToPath(
    new URL("./adatok/kemia.sqlite", import.meta.url)
  );

  await access(ut);
  db = new DatabaseSync(ut);
  db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");

  const mol = db.prepare(
    "SELECT * FROM molekulak WHERE pubchem_cid=439503"
  ).get();

  ellenoriz(
    mol?.id === "pubchem-439503" &&
    mol.inchi_key === inchi &&
    mol.aktiv === 1,
    "Az aktivált szalicin nem található a várt azonosítókkal."
  );

  const imp = db.prepare(
    "SELECT * FROM molekula_importok WHERE pubchem_cid=439503"
  ).get();

  ellenoriz(
    imp?.allapot === "elfogadva",
    "Az elfogadott szalicinimport nem található."
  );

  const a = JSON.parse(mol.adat);
  const b = JSON.parse(imp.atalakitott_adat);
  const uj = javitas(a);
  const ujImport = javitas(b);

  ellenoriz(
    pontosSzerkezetEgyezik(uj, ujImport),
    "Eltér a végleges és az importált szerkezet."
  );

  const kulcs = await kapcsolatiKulcsKeszitese(uj);

  if (
    JSON.stringify(a) === JSON.stringify(uj) &&
    JSON.stringify(b) === JSON.stringify(ujImport) &&
    mol.kapcsolati_kulcs === kulcs
  ) {
    console.log("A szalicin öt R/S-centrumadata már rendben van.");
  } else {
    const mappa = new URL(
      "./biztonsagi-mentesek/",
      import.meta.url
    );

    await mkdir(mappa, { recursive: true });

    const mentes = fileURLToPath(new URL(
      "kemia-szalicin-elott-" + randomUUID() + ".sqlite",
      mappa
    ));

    await backup(db, mentes);

    db.exec("BEGIN IMMEDIATE;");
    tranzakcio = true;

    const mostaniMol = db.prepare(
      "SELECT * FROM molekulak WHERE id=?"
    ).get(mol.id);

    const mostaniImport = db.prepare(
      "SELECT * FROM molekula_importok WHERE id=?"
    ).get(imp.id);

    ellenoriz(
      JSON.stringify(mostaniMol) === JSON.stringify(mol) &&
      JSON.stringify(mostaniImport) === JSON.stringify(imp),
      "Az adatokat közben módosították. Futtasd újra a javítást."
    );

    const jeloltek = db.prepare(`
      SELECT id,adat FROM molekulak
      WHERE id<>?
        AND (kapcsolati_kulcs=? OR osszegkeplet=?)
    `).all(mol.id, kulcs, mol.osszegkeplet);

    for (const m of jeloltek) {
      ellenoriz(
        !pontosSzerkezetEgyezik(uj, JSON.parse(m.adat)),
        "Azonos térszerkezetű másik molekula található: " + m.id
      );
    }

    const most = new Date().toISOString();

    const molMentes = db.prepare(`
      UPDATE molekulak
      SET adat=?,kapcsolati_kulcs=?,modositva=?
      WHERE id=?
    `).run(JSON.stringify(uj), kulcs, most, mol.id);

    ellenoriz(
      molMentes.changes === 1,
      "A molekula frissítése nem sikerült."
    );

    const importMentes = db.prepare(`
      UPDATE molekula_importok
      SET atalakitott_adat=?,modositva=?
      WHERE id=?
    `).run(JSON.stringify(ujImport), most, imp.id);

    ellenoriz(
      importMentes.changes === 1,
      "Az import frissítése nem sikerült."
    );

    db.exec("COMMIT;");
    tranzakcio = false;

    console.log(
      "A szalicin sztereokémiai adatainak javítása sikerült."
    );
    console.log("R/S-centrumok: 5. A molekula aktív.");
    console.log("Biztonsági mentés:", mentes);
  }
} catch (e) {
  if (tranzakcio) db.exec("ROLLBACK;");
  console.error("A javítás nem fejeződött be:", e.message);
  process.exitCode = 1;
} finally {
  if (db) db.close();
}