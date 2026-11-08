import { access, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { DatabaseSync, backup } from "node:sqlite";
import {
  sztereoJovahagyasEllenorzes,
  sztereoLenyomat,
  sztereoForrasKovetelmenyek
} from "./sztereo-adatok.mjs";

const ellenoriz = (ok, s) => {
  if (!ok) throw new Error(s);
};

let db;
let tranzakcio = false;

try {
  const ut = fileURLToPath(
    new URL("./adatok/kemia.sqlite", import.meta.url)
  );

  await access(ut);
  db = new DatabaseSync(ut);
  db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");

  const r = db.prepare(
    "SELECT * FROM molekula_importok WHERE pubchem_cid=115158"
  ).get();

  ellenoriz(
    r?.allapot === "ellenorizendo",
    "Az ellenőrzésre váró szalikortinimport nem található."
  );

  ellenoriz(
    !db.prepare(
      "SELECT id FROM molekulak WHERE pubchem_cid=115158"
    ).get(),
    "A molekulát már jóváhagyták; ez a segéd csak a függő importot kezeli."
  );

  const a = JSON.parse(r.atalakitott_adat);
  const nyers = JSON.parse(r.nyers_pubchem_adat);
  const pc = nyers?.PC_Compounds?.[0];

  ellenoriz(
    pc?.id?.id?.cid === 115158 &&
    a.pubchemCid === 115158,
    "Eltérő forrásazonosítók."
  );

  const forras = sztereoForrasKovetelmenyek(a, nyers);

  ellenoriz(
    forras.nemKezelt.length === 0 &&
    forras.ismeretlen === 1 &&
    JSON.stringify(forras.rs) ===
      JSON.stringify([10, 11, 12, 13, 14]) &&
    forras.ez.length === 0,
    "A forrásszerkezet eltér a korábban ellenőrzött szalikortintól."
  );

  sztereoJovahagyasEllenorzes(a);

  const centrumok = a.sztereokemia.kiralisCentrumok;

  const elvart = [
    [10, "S"],
    [11, "S"],
    [12, "R"],
    [13, "R"],
    [14, "S"],
    [18, "S"]
  ];

  ellenoriz(
    centrumok.length === 6 &&
    elvart.every(([i, k]) =>
      centrumok.filter(c =>
        c.atomIndex === i && c.konfiguracio === k
      ).length === 1
    ),
    "A hat elmentett R/S-centrum nem egyezik a várt szerkezettel."
  );

  ellenoriz(
    JSON.stringify(
      centrumok.find(c => c.atomIndex === 18).prioritasIndexek
    ) === JSON.stringify([7, 25, 22, 24]),
    "Eltérő prioritási sorrend a 19-es atomnál."
  );

  const nevek = JSON.parse(r.magyar_nevek ?? "null");

  ellenoriz(
    a.nevek?.preferalt?.includes("(1S)") &&
    nevek?.preferaltNevJelolt === a.nevek.preferalt,
    "Előbb mentsd el az (1S)-jelölést tartalmazó preferált nevet."
  );

  const regiKulcs = pc.props?.find(
    p => p.urn?.label === "InChIKey"
  )?.value?.sval;

  ellenoriz(
    typeof regiKulcs === "string" &&
    /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/.test(regiKulcs),
    "Nem található az eredeti PubChem InChIKey."
  );

  ellenoriz(
    (r.inchi_key === null || r.inchi_key === regiKulcs) &&
    (
      a.importAdatok?.inchiKey == null ||
      a.importAdatok.inchiKey === regiKulcs
    ),
    "Eltérő InChIKey szerepel az importban; a program nem írja felül."
  );

  const uj = {
    ...a,
    importAdatok: {
      ...a.importAdatok,
      inchiKey: null,
      pubchemAzonositoSzerepe: "forras",

      pubchemForrasAzonositoi: {
        cid: 115158,
        inchiKey: regiKulcs
      },

      sztereoSzakirodalmiKiegeszites: {
        doi: "10.3390/molecules20045566",
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6272461/",
        atomIndex: 18,
        konfiguracio: "S",
        forrasbeliJeloles: "C-9",
        szerkezetLenyomat: sztereoLenyomat(a)
      }
    }
  };

  sztereoJovahagyasEllenorzes(uj);

  if (
    r.inchi_key === null &&
    JSON.stringify(a) === JSON.stringify(uj)
  ) {
    console.log(
      "A szalikortin szakirodalmi forrásadatai már el vannak mentve."
    );
  } else {
    const mappa = new URL(
      "./biztonsagi-mentesek/",
      import.meta.url
    );

    await mkdir(mappa, { recursive: true });

    const mentes = fileURLToPath(
      new URL(
        "kemia-szalikortin-forras-elott-" +
          randomUUID() + ".sqlite",
        mappa
      )
    );

    await backup(db, mentes);

    db.exec("BEGIN IMMEDIATE;");
    tranzakcio = true;

    ellenoriz(
      JSON.stringify(
        db.prepare(
          "SELECT * FROM molekula_importok WHERE id=?"
        ).get(r.id)
      ) === JSON.stringify(r),
      "Az import közben megváltozott. Futtasd újra."
    );

    ellenoriz(
      !db.prepare(
        "SELECT id FROM molekulak WHERE pubchem_cid=115158"
      ).get(),
      "A molekulát közben jóváhagyták."
    );

    const v = db.prepare(`
      UPDATE molekula_importok
      SET atalakitott_adat=?,inchi_key=NULL,modositva=?
      WHERE id=? AND allapot='ellenorizendo'
    `).run(
      JSON.stringify(uj),
      new Date().toISOString(),
      r.id
    );

    ellenoriz(
      v.changes === 1,
      "A forrásadatok mentése nem sikerült."
    );

    db.exec("COMMIT;");
    tranzakcio = false;

    console.log(
      "A szalikortin szakirodalmi forrásának rögzítése sikerült."
    );

    console.log(
      "A PubChem CID és az eredeti InChIKey forrásadatként megmaradt."
    );

    console.log(
      "A kiegészített szerkezethez nincs ellenőrzött új InChIKey rendelve."
    );

    console.log(
      "A molekula továbbra is ellenőrzésre vár."
    );

    console.log("Biztonsági mentés:", mentes);
  }
} catch (e) {
  if (tranzakcio) db.exec("ROLLBACK;");

  console.error(
    "A forrásrögzítés nem fejeződött be:",
    e.message
  );

  process.exitCode = 1;
} finally {
  if (db) db.close();
}