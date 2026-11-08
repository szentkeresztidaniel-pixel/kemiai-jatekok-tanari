import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync, backup } from "node:sqlite";

const csvUtvonal = new URL("./admin-adatok.csv", import.meta.url);
const dbUtvonal = fileURLToPath(
  new URL("./adatok/kemia.sqlite", import.meta.url)
);

let db;
let tranzakcio = false;

function ellenoriz(feltetel, uzenet) {
  if (!feltetel) throw new Error(uzenet);
}

function csvOlvasas(szoveg) {
  const s = szoveg.replace(/^\uFEFF/, "");
  const sorok = [];
  let sor = [], mezo = "", idezet = false, lezart = false;

  const mezoVege = () => {
    sor.push(mezo);
    mezo = "";
    lezart = false;
  };

  const sorVege = () => {
    mezoVege();
    if (sor.some(v => v !== "")) sorok.push(sor);
    sor = [];
  };

  for (let i = 0; i < s.length; i++) {
    const c = s[i];

    if (idezet) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          mezo += '"';
          i++;
        } else {
          idezet = false;
          lezart = true;
        }
      } else mezo += c;
    } else if (c === ",") {
      mezoVege();
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      sorVege();
    } else {
      ellenoriz(!lezart, "Hibás CSV: szöveg az idézőjel után.");

      if (c === '"') {
        ellenoriz(mezo === "", "Hibás CSV-idézőjelezés.");
        idezet = true;
      } else mezo += c;
    }
  }

  ellenoriz(
    !idezet,
    "A CSV vége hiányzik vagy hibás az idézőjelezés."
  );

  if (sor.length || mezo !== "" || lezart) sorVege();

  ellenoriz(
    sorok.length === 4 &&
    sorok[0].join(",") === "tabla,darab,adatok",
    "A három táblát tartalmazó tabla,darab,adatok export szükséges."
  );

  return sorok.slice(1);
}

const objektum = v =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const szoveg = v => typeof v === "string";
const nemures = v => szoveg(v) && v.trim().length > 0;
const egesz = v => Number.isSafeInteger(v) && v >= 0;
const pozitiv = v => egesz(v) && v > 0;
const datum = v => nemures(v) && Number.isFinite(Date.parse(v));

const uuid = v =>
  szoveg(v) &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const nullVagy = f => v => v === null || f(v);

const tipusok = {
  egesz,
  pozitiv,
  datum,
  uuid,
  szoveg: nullVagy(szoveg),
  json: nullVagy(() => true),
  objektum,
  ord: v => szoveg(v) && /^ord-[0-9a-f]{32}$/.test(v),
  lista: v => Array.isArray(v) && v.every(szoveg),
  logikai: v => typeof v === "boolean",
  molekulaAllapot: v => [
    "uj", "letoltve", "atalakitva", "ellenorizendo",
    "elfogadva", "elutasitva", "hiba"
  ].includes(v),
  reakcioAllapot: v => [
    "ellenorizendo", "elfogadva", "elutasitva"
  ].includes(v)
};

const definiciok = {
  molekula_importok: {
    kulcs: "id",
    mezok: {
      id: "pozitiv",
      pubchem_cid: "pozitiv",
      keresesi_nev: "szoveg",
      inchi_key: "szoveg",
      nyers_pubchem_adat: "json",
      atalakitott_adat: "json",
      magyar_nevek: "json",
      allapot: "molekulaAllapot",
      hiba_uzenet: "szoveg",
      probalkozasok: "egesz",
      letrehozva: "datum",
      modositva: "datum"
    },
    sql: `CREATE TABLE IF NOT EXISTS molekula_importok (
      id INTEGER PRIMARY KEY CHECK (id > 0),
      pubchem_cid INTEGER NOT NULL UNIQUE CHECK (pubchem_cid > 0),
      keresesi_nev TEXT,
      inchi_key TEXT UNIQUE,
      nyers_pubchem_adat TEXT
        CHECK (nyers_pubchem_adat IS NULL OR json_valid(nyers_pubchem_adat)),
      atalakitott_adat TEXT
        CHECK (atalakitott_adat IS NULL OR json_valid(atalakitott_adat)),
      magyar_nevek TEXT
        CHECK (magyar_nevek IS NULL OR json_valid(magyar_nevek)),
      allapot TEXT NOT NULL CHECK (
        allapot IN (
          'uj','letoltve','atalakitva','ellenorizendo',
          'elfogadva','elutasitva','hiba'
        )
      ),
      hiba_uzenet TEXT,
      probalkozasok INTEGER NOT NULL DEFAULT 0
        CHECK (probalkozasok >= 0),
      letrehozva TEXT NOT NULL,
      modositva TEXT NOT NULL
    ) STRICT;`
  },

  szintezis_importok: {
    kulcs: "id",
    mezok: {
      id: "uuid",
      ord_reakcio_id: "ord",
      ord_adat: "objektum",
      allapot: "reakcioAllapot",
      letrehozva: "datum"
    },
    sql: `CREATE TABLE IF NOT EXISTS szintezis_importok (
      id TEXT PRIMARY KEY NOT NULL,
      ord_reakcio_id TEXT NOT NULL UNIQUE,
      ord_adat TEXT NOT NULL CHECK (
        json_valid(ord_adat) AND json_type(ord_adat) = 'object'
      ),
      allapot TEXT NOT NULL CHECK (
        allapot IN ('ellenorizendo','elfogadva','elutasitva')
      ),
      letrehozva TEXT NOT NULL
    ) STRICT;`
  },

  magyar_nev_kiegeszitesek: {
    kulcs: "pubchem_cid",
    mezok: {
      pubchem_cid: "pozitiv",
      preferalt_nev: "szoveg",
      alternativak: "lista",
      megjegyzes: "szoveg",
      aktiv: "logikai",
      letrehozva: "datum"
    },
    sql: `CREATE TABLE IF NOT EXISTS magyar_nev_kiegeszitesek (
      pubchem_cid INTEGER PRIMARY KEY CHECK (pubchem_cid > 0),
      preferalt_nev TEXT,
      alternativak TEXT NOT NULL CHECK (
        json_valid(alternativak) AND json_type(alternativak) = 'array'
      ),
      megjegyzes TEXT,
      aktiv INTEGER NOT NULL CHECK (aktiv IN (0,1)),
      letrehozva TEXT NOT NULL
    ) STRICT;`
  }
};

try {
  ellenoriz(
    existsSync(csvUtvonal),
    "Hiányzik az admin-adatok.csv a program mellől."
  );

  ellenoriz(
    existsSync(dbUtvonal),
    "Hiányzik az adatok/kemia.sqlite adatbázis."
  );

  const forras = readFileSync(csvUtvonal, "utf8");
  const adatok = new Map();

  for (const sor of csvOlvasas(forras)) {
    ellenoriz(sor.length === 3, "Hibás CSV-oszlopszám.");

    const [tabla, darab, json] = sor;

    ellenoriz(
      Object.hasOwn(definiciok, tabla) && !adatok.has(tabla),
      "Ismeretlen vagy ismétlődő tábla az exportban."
    );

    ellenoriz(/^\d+$/.test(darab), `Hibás darabszám: ${tabla}`);

    const rekordok = JSON.parse(json);

    ellenoriz(
      Array.isArray(rekordok) && rekordok.length === Number(darab),
      `Eltérő darabszám: ${tabla}`
    );

    const d = definiciok[tabla];
    const azonositoLista = new Set();
    const mezok = Object.keys(d.mezok);

    for (const rekord of rekordok) {
      ellenoriz(
        objektum(rekord) &&
        Object.keys(rekord).length === mezok.length,
        `Hiányzó vagy új oszlop az exportban: ${tabla}`
      );

      for (const [mezo, tipus] of Object.entries(d.mezok)) {
        ellenoriz(
          Object.hasOwn(rekord, mezo) &&
          tipusok[tipus](rekord[mezo]),
          `Hibás mező: ${tabla}.${mezo}`
        );
      }

      ellenoriz(
        !azonositoLista.has(rekord[d.kulcs]),
        `Ismétlődő azonosító: ${tabla}`
      );

      azonositoLista.add(rekord[d.kulcs]);
    }

    adatok.set(tabla, rekordok);
  }

  ellenoriz(adatok.size === 3, "Hiányzó tábla az exportban.");

  db = new DatabaseSync(dbUtvonal);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");

  ellenoriz(
    db.prepare(`
      SELECT ertek FROM rendszer WHERE kulcs = 'letrehozva'
    `).get(),
    "Nem a játék adatbázisa található ebben a mappában."
  );

  function uresImportTablak() {
    for (const tabla of Object.keys(definiciok)) {
      const letezik = db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type = 'table' AND name = ?
      `).get(tabla);

      if (letezik) {
        ellenoriz(
          db.prepare(`SELECT count(*) AS darab FROM ${tabla}`)
            .get().darab === 0,
          `A(z) ${tabla} már tartalmaz adatokat. Nem írom felül.`
        );
      }
    }

    ellenoriz(
      !db.prepare(`
        SELECT ertek FROM rendszer WHERE kulcs = 'admin_import_sha256'
      `).get(),
      "Az adminexport már be lett töltve."
    );
  }

  uresImportTablak();

  const mappa = new URL("./biztonsagi-mentesek/", import.meta.url);
  mkdirSync(mappa, { recursive: true });

  const nev =
    `kemia-admin-import-elott-${Date.now()}-${randomUUID()}.sqlite`;

  const mentesUtvonal = fileURLToPath(new URL(nev, mappa));

  await backup(db, mentesUtvonal);

  console.log(
    `Biztonsági mentés elkészült: biztonsagi-mentesek/${nev}`
  );

  db.exec("BEGIN IMMEDIATE;");
  tranzakcio = true;

  uresImportTablak();

  for (const [tabla, d] of Object.entries(definiciok)) {
    db.exec(d.sql);

    const mezok = Object.keys(d.mezok);

    const mentes = db.prepare(
      `INSERT INTO ${tabla} (${mezok.join(",")})
       VALUES (${mezok.map(() => "?").join(",")})`
    );

    for (const rekord of adatok.get(tabla)) {
      const ertekek = mezok.map(mezo => {
        const v = rekord[mezo];
        const tipus = d.mezok[mezo];

        if (v === null) return null;

        if (["json", "objektum", "lista"].includes(tipus)) {
          return JSON.stringify(v);
        }

        if (tipus === "logikai") return v ? 1 : 0;

        return v;
      });

      mentes.run(...ertekek);
    }

    ellenoriz(
      db.prepare(`SELECT count(*) AS darab FROM ${tabla}`)
        .get().darab === adatok.get(tabla).length,
      `Sikertelen darabszám-ellenőrzés: ${tabla}`
    );
  }

  db.prepare(`
    INSERT INTO rendszer (kulcs,ertek)
    VALUES ('admin_import_sha256',?)
  `).run(createHash("sha256").update(forras).digest("hex"));

  ellenoriz(
    db.prepare("PRAGMA foreign_key_check").all().length === 0,
    "Hibás adatbázis-kapcsolat."
  );

  db.exec("COMMIT;");
  tranzakcio = false;

  console.log("Az adminadatok importálása sikerült.");

  for (const [tabla, rekordok] of adatok) {
    console.log(`${tabla}: ${rekordok.length}`);
  }

  console.log("A játékadatok és az adminfiók megmaradtak.");
} catch (hiba) {
  if (tranzakcio) {
    try {
      db.exec("ROLLBACK;");
    } catch {}
  }

  console.error("Az adminimport nem történt meg:", hiba.message);
  process.exitCode = 1;
} finally {
  db?.close();
}