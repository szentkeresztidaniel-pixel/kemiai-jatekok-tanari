import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync, backup } from "node:sqlite";

const csvUtvonal = new URL("./teljes-jatek-adatok.csv", import.meta.url);
const dbUtvonal = fileURLToPath(
  new URL("./adatok/kemia.sqlite", import.meta.url)
);

const jelolo = "teljes_tartalom_import_sha256";
let db, tranzakcio = false;

function ellenoriz(ok, uzenet) {
  if (!ok) throw new Error(uzenet);
}

const objektum = v =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const szoveg = v => typeof v === "string";
const id = v => szoveg(v) && v.trim().length > 0;

const uuid = v =>
  szoveg(v) &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

const jsonAdat = v =>
  v === null ||
  szoveg(v) ||
  typeof v === "boolean" ||
  (typeof v === "number" && Number.isFinite(v)) ||
  (Array.isArray(v) && v.every(jsonAdat)) ||
  (objektum(v) && Object.values(v).every(jsonAdat));

const tipusok = {
  id,
  uuid,
  text: szoveg,
  pozitiv: v => Number.isSafeInteger(v) && v > 0,
  egesz: v => Number.isSafeInteger(v) && v >= 0,
  szam: v => typeof v === "number" && Number.isFinite(v),
  szazalek: v =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100,
  nehezseg: v => [1, 2, 3].includes(v),
  logikai: v => typeof v === "boolean",
  datum: v => szoveg(v) && Number.isFinite(Date.parse(v)),
  lista: v => Array.isArray(v) && v.every(x => x === null || szoveg(x)),
  json: jsonAdat,
  objektum: v => objektum(v) && jsonAdat(v),
  ord: v => szoveg(v) && /^ord-[0-9a-f]{32}$/.test(v),
  statusz: v => [
    "kezzel-ellenorzott",
    "automatikusan-ellenorzott",
    "ellenorizendo",
    "elutasitott"
  ].includes(v)
};

const mostSQL = "(strftime('%Y-%m-%dT%H:%M:%fZ','now'))";

const definiciok = {
  molekulak: {
    kulcs: ["id"],
    mezok: {
      id: "id",
      pubchem_cid: "pozitiv?",
      inchi_key: "text?",
      kapcsolati_kulcs: "text?",
      osszegkeplet: "text",
      preferalt_nev: "text",
      csaladok: "lista",
      nehezseg: "nehezseg",
      adat: "objektum",
      forras: "text",
      ellenorzesi_statusz: "statusz",
      aktiv: "logikai",
      letrehozva: "datum",
      modositva: "datum"
    },
    alap: {
      csaladok: "'[]'",
      nehezseg: "1",
      forras: "'sajat'",
      ellenorzesi_statusz: "'kezzel-ellenorzott'",
      aktiv: "1",
      letrehozva: mostSQL,
      modositva: mostSQL
    },
    feltetelek: [
      "UNIQUE (pubchem_cid)",
      "UNIQUE (inchi_key)"
    ]
  },

  szintezis_reakciok: {
    kulcs: ["id"],
    mezok: {
      id: "uuid",
      ord_reakcio_id: "ord?",
      ord_adatbazis_id: "text?",
      kiindulasi_molekula_id: "id",
      reagensek: "lista",
      katalizatorok: "lista",
      oldoszerek: "lista",
      homerseklet_ertek: "szam?",
      homerseklet_egyseg: "text?",
      reakcioido_ertek: "szam?",
      reakcioido_egyseg: "text?",
      korulmenyek: "text?",
      ord_adat: "json",
      aktiv: "logikai",
      jovahagyta: "uuid?",
      letrehozva: "datum",
      nyomas_ertek: "szam?",
      nyomas_egyseg: "text?",
      jatek_feltetelek: "lista",
      jatek_homerseklet_min_c: "szam?",
      jatek_homerseklet_max_c: "szam?",
      jatek_ph_min: "szam?",
      jatek_ph_max: "szam?",
      jatek_feny: "text?",
      reakcio_tipus: "text?",
      komponens_szerepek: "json",
      letrehozta: "uuid?",
      jovahagyva: "datum?",
      kilepo_anyagok: "lista",
      elutasitva: "logikai",
      elutasitotta: "uuid?",
      elutasitas_ideje: "datum?"
    },
    alap: {
      reagensek: "'[]'",
      katalizatorok: "'[]'",
      oldoszerek: "'[]'",
      jatek_feltetelek: "'[]'",
      kilepo_anyagok: "'[]'",
      ord_adat: "'{}'",
      komponens_szerepek: "'{}'",
      aktiv: "0",
      elutasitva: "0",
      letrehozva: mostSQL
    },
    feltetelek: [
      "UNIQUE (ord_reakcio_id)",
      "FOREIGN KEY (kiindulasi_molekula_id) REFERENCES molekulak(id) ON UPDATE CASCADE ON DELETE RESTRICT",
      "CHECK (NOT (elutasitva AND aktiv))",
      "CHECK ((jatek_homerseklet_min_c IS NULL AND jatek_homerseklet_max_c IS NULL) OR (jatek_homerseklet_min_c IS NOT NULL AND jatek_homerseklet_max_c IS NOT NULL AND jatek_homerseklet_min_c >= -273.15 AND jatek_homerseklet_min_c <= jatek_homerseklet_max_c))",
      "CHECK ((jatek_ph_min IS NULL AND jatek_ph_max IS NULL) OR (jatek_ph_min IS NOT NULL AND jatek_ph_max IS NOT NULL AND jatek_ph_min <= jatek_ph_max))"
    ]
  },

  szintezis_reakcio_termekek: {
    kulcs: ["reakcio_id", "termek_sorszam"],
    mezok: {
      reakcio_id: "uuid",
      termek_sorszam: "egesz",
      molekula_id: "id",
      hozam_szazalek: "szazalek?",
      termekarany_szazalek: "szazalek?"
    },
    alap: {},
    feltetelek: [
      "UNIQUE (reakcio_id,molekula_id)",
      "FOREIGN KEY (reakcio_id) REFERENCES szintezis_reakciok(id) ON UPDATE CASCADE ON DELETE CASCADE",
      "FOREIGN KEY (molekula_id) REFERENCES molekulak(id) ON UPDATE CASCADE ON DELETE RESTRICT"
    ]
  }
};

const tablak = Object.keys(definiciok);
const alapTipus = t => t.replace(/\?$/, "");
const jsonTipus = t =>
  ["lista", "json", "objektum"].includes(alapTipus(t));

const sqlErtek = (v, t) =>
  jsonTipus(t) ? JSON.stringify(v) :
  alapTipus(t) === "logikai" ? (v ? 1 : 0) : v;

const helyiErtek = (v, t) =>
  v === null ? null :
  jsonTipus(t) ? JSON.parse(v) :
  alapTipus(t) === "logikai" ? v === 1 : v;

const kulcs = (r, d) =>
  JSON.stringify(d.kulcs.map(k => r[k]));

const rendez = v =>
  Array.isArray(v) ? v.map(rendez) :
  objektum(v)
    ? Object.fromEntries(
        Object.keys(v).sort().map(k => [k, rendez(v[k])])
      )
    : v;

const egyezik = (a, b) =>
  JSON.stringify(rendez(a)) === JSON.stringify(rendez(b));

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

  ellenoriz(!idezet, "Hiányos CSV-fájl.");
  if (sor.length || mezo !== "" || lezart) sorVege();

  ellenoriz(
    sorok.length === 4 &&
    sorok[0].join(",") === "tabla,darab,adatok",
    "A három táblás tabla,darab,adatok export szükséges."
  );

  return sorok.slice(1);
}

function tablaSQL(nev, d) {
  const oszlopok = Object.entries(d.mezok).map(([k, t]) => {
    const b = alapTipus(t);

    const szamTipus =
      ["pozitiv", "egesz", "nehezseg", "logikai"].includes(b)
        ? "INTEGER"
        : ["szam", "szazalek"].includes(b) ? "REAL" : "TEXT";

    const reszek = [k, szamTipus];

    if (!t.endsWith("?")) reszek.push("NOT NULL");
    if (Object.hasOwn(d.alap, k)) {
      reszek.push("DEFAULT " + d.alap[k]);
    }

    const feltetel =
      b === "pozitiv" ? `${k}>0` :
      b === "egesz" ? `${k}>=0` :
      b === "nehezseg" ? `${k} BETWEEN 1 AND 3` :
      b === "logikai" ? `${k} IN (0,1)` :
      b === "szazalek" ? `${k} BETWEEN 0 AND 100` :
      b === "statusz"
        ? `${k} IN ('kezzel-ellenorzott','automatikusan-ellenorzott','ellenorizendo','elutasitott')`
        : jsonTipus(t)
          ? `json_valid(${k})` +
            (b === "lista"
              ? ` AND json_type(${k})='array'`
              : b === "objektum"
                ? ` AND json_type(${k})='object'`
                : "")
          : null;

    if (feltetel) {
      reszek.push(`CHECK (${k} IS NULL OR (${feltetel}))`);
    }

    return reszek.join(" ");
  });

  const feltetelek = [
    ...oszlopok,
    `PRIMARY KEY (${d.kulcs.join(",")})`,
    ...d.feltetelek
  ];

  return `CREATE TABLE ${nev} (${feltetelek.join(",")}) STRICT;`;
}

try {
  ellenoriz(
    existsSync(csvUtvonal),
    "Hiányzik a teljes-jatek-adatok.csv a program mellől."
  );

  ellenoriz(
    existsSync(dbUtvonal),
    "Hiányzik az adatok/kemia.sqlite adatbázis."
  );

  const forras = readFileSync(csvUtvonal, "utf8");
  const adatok = new Map();
  const indexek = new Map();

  for (const sor of csvOlvasas(forras)) {
    ellenoriz(sor.length === 3, "Hibás CSV-oszlopszám.");

    const [tabla, darab, json] = sor;

    ellenoriz(
      Object.hasOwn(definiciok, tabla) && !adatok.has(tabla),
      "Ismeretlen vagy ismétlődő tábla."
    );

    const rekordok = JSON.parse(json);
    const d = definiciok[tabla];
    const index = new Map();

    ellenoriz(
      /^\d+$/.test(darab) &&
      Array.isArray(rekordok) &&
      rekordok.length === Number(darab),
      `Hibás darabszám: ${tabla}`
    );

    for (const r of rekordok) {
      ellenoriz(
        objektum(r) &&
        Object.keys(r).length === Object.keys(d.mezok).length,
        `Hiányzó vagy új oszlop: ${tabla}`
      );

      for (const [k, t] of Object.entries(d.mezok)) {
        ellenoriz(
          Object.hasOwn(r, k) &&
          (
            (r[k] === null && t.endsWith("?")) ||
            tipusok[alapTipus(t)](r[k])
          ),
          `Hibás mező: ${tabla}.${k}`
        );
      }

      const azon = kulcs(r, d);

      ellenoriz(
        !index.has(azon),
        `Ismétlődő azonosító: ${tabla}`
      );

      index.set(azon, r);
    }

    adatok.set(tabla, rekordok);
    indexek.set(tabla, index);
  }

  ellenoriz(
    adatok.size === 3 && adatok.get("molekulak").length > 0,
    "Hiányzó tábla vagy üres molekulalista."
  );

  const molIdk = new Set(
    adatok.get("molekulak").map(r => r.id)
  );

  const reakcioIdk = new Set(
    adatok.get("szintezis_reakciok").map(r => r.id)
  );

  for (const r of adatok.get("molekulak")) {
    ellenoriz(
      r.adat.id === r.id,
      `Eltérő molekulaazonosító: ${r.id}`
    );
  }

  for (const r of adatok.get("szintezis_reakciok")) {
    ellenoriz(
      molIdk.has(r.kiindulasi_molekula_id),
      `Hiányzó kiindulási molekula: ${r.id}`
    );
  }

  for (const r of adatok.get("szintezis_reakcio_termekek")) {
    ellenoriz(
      molIdk.has(r.molekula_id) && reakcioIdk.has(r.reakcio_id),
      "Hiányzó reakció vagy termékmolekula."
    );
  }

  db = new DatabaseSync(dbUtvonal);
  db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");

  const idezo = s => '"' + s.replaceAll('"', '""') + '"';

  function helyiEllenorzes() {
    ellenoriz(
      db.prepare(`
        SELECT ertek FROM rendszer WHERE kulcs='letrehozva'
      `).get(),
      "Nem a játék adatbázisa található itt."
    );

    ellenoriz(
      !db.prepare(`
        SELECT ertek FROM rendszer WHERE kulcs=?
      `).get(jelolo),
      "A teljes export már be lett töltve. Nem írom felül a helyi adatokat."
    );

    for (const tabla of tablak) {
      const d = definiciok[tabla];

      for (const r of db.prepare(`SELECT * FROM ${tabla}`).all()) {
        const eredeti = indexek.get(tabla).get(kulcs(r, d));

        ellenoriz(
          eredeti,
          `A helyi rekord hiányzik az exportból: ${tabla} ${kulcs(r, d)}`
        );

        for (const [k, v] of Object.entries(r)) {
          ellenoriz(
            Object.hasOwn(d.mezok, k),
            `Ismeretlen helyi oszlop: ${tabla}.${k}`
          );

          const helyi = helyiErtek(v, d.mezok[k]);

          const azonos =
            tabla === "molekulak" && k === "adat"
              ? objektum(helyi) &&
                Object.keys(helyi).every(p =>
                  Object.hasOwn(eredeti.adat, p) &&
                  egyezik(helyi[p], eredeti.adat[p])
                )
              : egyezik(helyi, eredeti[k]);

          ellenoriz(
            azonos,
            `Eltérő helyi adat: ${tabla}.${k}, azonosító: ${kulcs(r, d)}. Nem írtam felül.`
          );
        }
      }
    }

    const sajatIndexek = new Set([
      "szintezis_kiindulasi_idx",
      "szintezis_termek_molekula_idx"
    ]);

    const elemek = db.prepare(`
      SELECT type,name,tbl_name FROM sqlite_master
      WHERE type IN ('trigger','index') AND sql IS NOT NULL
    `).all();

    for (const r of elemek) {
      if (tablak.includes(r.tbl_name.toLowerCase())) {
        ellenoriz(
          r.type === "index" && sajatIndexek.has(r.name),
          `Egyedi helyi adatbáziselem található: ${r.name}. Külön migráció szükséges.`
        );
      }
    }

    const helyiTablak = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table'
    `).all();

    for (const r of helyiTablak) {
      if (tablak.includes(r.name.toLowerCase())) continue;

      const kapcsolatok = db.prepare(
        `PRAGMA foreign_key_list(${idezo(r.name)})`
      ).all();

      for (const fk of kapcsolatok) {
        ellenoriz(
          !tablak.includes(fk.table.toLowerCase()),
          `Kapcsolódó helyi tábla található: ${r.name}. Külön migráció szükséges.`
        );
      }
    }
  }

  helyiEllenorzes();

  const mappa = new URL("./biztonsagi-mentesek/", import.meta.url);
  mkdirSync(mappa, { recursive: true });

  const nev =
    `kemia-teljes-import-elott-${Date.now()}-${randomUUID()}.sqlite`;

  await backup(db, fileURLToPath(new URL(nev, mappa)));

  console.log(`Biztonsági mentés: biztonsagi-mentesek/${nev}`);

  db.exec("BEGIN IMMEDIATE;");
  tranzakcio = true;

  helyiEllenorzes();

  for (const tabla of [...tablak].reverse()) {
    db.exec(`DROP TABLE ${tabla};`);
  }

  for (const [tabla, d] of Object.entries(definiciok)) {
    db.exec(tablaSQL(tabla, d));

    const mezok = Object.keys(d.mezok);

    const mentes = db.prepare(
      `INSERT INTO ${tabla} (${mezok.join(",")})
       VALUES (${mezok.map(() => "?").join(",")})`
    );

    for (const r of adatok.get(tabla)) {
      mentes.run(...mezok.map(k => sqlErtek(r[k], d.mezok[k])));
    }

    ellenoriz(
      db.prepare(`SELECT count(*) AS n FROM ${tabla}`)
        .get().n === adatok.get(tabla).length,
      `Eltérő mentett darabszám: ${tabla}`
    );
  }

  db.exec(`
    CREATE INDEX szintezis_kiindulasi_idx
      ON szintezis_reakciok(kiindulasi_molekula_id);

    CREATE INDEX szintezis_termek_molekula_idx
      ON szintezis_reakcio_termekek(molekula_id);

    CREATE INDEX molekula_kapcsolati_idx
      ON molekulak(kapcsolati_kulcs);
  `);

  ellenoriz(
    db.prepare("PRAGMA foreign_key_check").all().length === 0,
    "Hibás adatbázis-kapcsolat."
  );

  ellenoriz(
    db.prepare("PRAGMA integrity_check").get().integrity_check === "ok",
    "Sikertelen adatbázis-ellenőrzés."
  );

  db.prepare(`
    INSERT INTO rendszer (kulcs,ertek) VALUES (?,?)
  `).run(
    jelolo,
    createHash("sha256").update(forras).digest("hex")
  );

  db.exec("COMMIT;");
  tranzakcio = false;

  console.log("A teljes adatok importálása sikerült.");

  for (const [tabla, rekordok] of adatok) {
    console.log(`${tabla}: ${rekordok.length}`);
  }

  console.log(
    `Aktív molekulák: ${adatok.get("molekulak").filter(r => r.aktiv).length}`
  );

  console.log(
    `Aktív reakciók: ${adatok.get("szintezis_reakciok").filter(r => r.aktiv).length}`
  );

  console.log(
    "A helyi felhasználók, munkamenetek és importjavítások megmaradtak."
  );
} catch (e) {
  if (tranzakcio) {
    try {
      db.exec("ROLLBACK;");
    } catch {}
  }

  console.error("A teljes import nem történt meg:", e.message);
  process.exitCode = 1;
} finally {
  db?.close();
}