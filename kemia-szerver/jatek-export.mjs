import { mkdir, writeFile, rename, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const ellenoriz = (ok, uzenet) => {
  if (!ok) throw new Error(uzenet);
};

const objektum = v =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const szoveg = v =>
  typeof v === "string" && v.trim().length > 0;

function listaOlvasas(s) {
  const v = JSON.parse(s);
  ellenoriz(
    Array.isArray(v) && v.every(szoveg),
    "Hibás név-, család- vagy reagenslista az adatbázisban."
  );
  return v;
}

const adatMezok = [
  "id", "nevek", "atomok", "kotesek", "csaladok",
  "nehezseg", "alapvazId", "osszegkeplet",
  "sztereokemia", "elozetPoziciok", "izomerCsoportId",
  "pubchemCid", "polimer"
];

let db;
let tranzakcio = false;
let ideiglenes;

try {
  db = new DatabaseSync(
    fileURLToPath(new URL("./adatok/kemia.sqlite", import.meta.url)),
    { readOnly: true }
  );

  db.exec("PRAGMA busy_timeout=5000; BEGIN;");
  tranzakcio = true;

  const molekulak = db.prepare(`
    SELECT id,preferalt_nev,osszegkeplet,csaladok,nehezseg,adat
    FROM molekulak
    WHERE aktiv=1
    ORDER BY id
  `).all().map(r => {
    const a = JSON.parse(r.adat);

    ellenoriz(
      objektum(a) &&
      a.id === r.id &&
      szoveg(r.preferalt_nev) &&
      szoveg(r.osszegkeplet) &&
      objektum(a.nevek) &&
      szoveg(a.nevek.preferalt) &&
      Array.isArray(a.nevek.alternativak) &&
      Array.isArray(a.atomok) &&
      a.atomok.length > 0 &&
      a.atomok.every(szoveg) &&
      Array.isArray(a.kotesek) &&
      [1, 2, 3].includes(r.nehezseg),
      "Hiányos molekula: " + r.id
    );

    const index = i =>
      Number.isInteger(i) && i >= 0 && i < a.atomok.length;

    ellenoriz(
      a.kotesek.every(k =>
        Array.isArray(k) &&
        index(k[0]) &&
        index(k[1]) &&
        k[0] !== k[1] &&
        [1, 2, 3].includes(k[2] ?? 1)
      ),
      "Hibás kötésadat: " + r.id
    );

    ellenoriz(
      ["nincs", "nincs-eloiras", "meghatarozott"].includes(
        a.sztereokemia?.statusz
      ),
      "A molekula sztereokémiája még ellenőrzésre vár: " + r.id
    );

    const adat = Object.fromEntries(
      adatMezok
        .filter(k => Object.hasOwn(a, k))
        .map(k => [k, a[k]])
    );

    const csaladok = listaOlvasas(r.csaladok);
    const ekek = a.importAdatok?.pubchemEkKotesek;

    if (Array.isArray(ekek) && ekek.length) {
      ellenoriz(
        ekek.every(e =>
          objektum(e) &&
          index(e.atomIndex) &&
          index(e.kiemeltAtomIndex) &&
          ["elo", "hatra"].includes(e.elozetIrany) &&
          a.kotesek.some(k =>
            (k[2] ?? 1) === 1 &&
            (
              (k[0] === e.atomIndex && k[1] === e.kiemeltAtomIndex) ||
              (k[1] === e.atomIndex && k[0] === e.kiemeltAtomIndex)
            )
          )
        ),
        "Hibás ékkötésadat: " + r.id
      );

      adat.importAdatok = {
        pubchemEkKotesek: ekek.map(e => ({
          atomIndex: e.atomIndex,
          kiemeltAtomIndex: e.kiemeltAtomIndex,
          elozetIrany: e.elozetIrany
        }))
      };
    }

    return {
      id: r.id,
      preferalt_nev: r.preferalt_nev,
      osszegkeplet: r.osszegkeplet,
      csaladok,
      nehezseg: r.nehezseg,
      adat
    };
  });

  ellenoriz(
    molekulak.length > 0,
    "Nincs exportálható aktív molekula."
  );

  const molekulaIdk = new Set(molekulak.map(m => m.id));

  const reakciok = db.prepare(`
    SELECT
      r.id,r.kiindulasi_molekula_id,
      r.reagensek,r.katalizatorok,r.oldoszerek,
      r.jatek_feltetelek,r.jatek_feny,
      r.reakcio_tipus,r.kilepo_anyagok
    FROM szintezis_reakciok r
    JOIN molekulak ki ON ki.id=r.kiindulasi_molekula_id
    WHERE r.aktiv=1
      AND r.elutasitva=0
      AND r.ord_reakcio_id IS NULL
      AND ki.aktiv=1
      AND (
        SELECT count(*)
        FROM szintezis_reakcio_termekek t
        WHERE t.reakcio_id=r.id AND t.termek_sorszam=0
      )=1
      AND NOT EXISTS (
        SELECT 1
        FROM szintezis_reakcio_termekek t
        LEFT JOIN molekulak m ON m.id=t.molekula_id
        WHERE t.reakcio_id=r.id
          AND (m.id IS NULL OR m.aktiv<>1)
      )
    ORDER BY r.id
  `).all().map(r => {
    const termekek = db.prepare(`
      SELECT
        termek_sorszam,molekula_id,
        termekarany_szazalek,hozam_szazalek
      FROM szintezis_reakcio_termekek
      WHERE reakcio_id=?
      ORDER BY termek_sorszam
    `).all(r.id);

    ellenoriz(
      molekulaIdk.has(r.kiindulasi_molekula_id) &&
      termekek.length > 0 &&
      termekek.every(t => molekulaIdk.has(t.molekula_id)),
      "Hiányzó reakciómolekula: " + r.id
    );

    return {
      ...r,
      reagensek: listaOlvasas(r.reagensek),
      katalizatorok: listaOlvasas(r.katalizatorok),
      oldoszerek: listaOlvasas(r.oldoszerek),
      jatek_feltetelek: listaOlvasas(r.jatek_feltetelek),
      kilepo_anyagok: listaOlvasas(r.kilepo_anyagok),
      termekek
    };
  });

  const szurok = {
    csaladok: [...new Set(
      molekulak
        .flatMap(m => m.csaladok)
        .map(s => s.trim())
        .filter(Boolean)
    )].sort(),

    nehezsegek: [...new Set(
      molekulak.map(m => m.nehezseg)
    )].sort((a, b) => a - b)
  };

  const csomag = {
    schemaVerzio: 1,
    exportIdeje: new Date().toISOString(),
    molekulak,
    reakciok,
    szurok
  };

  db.exec("COMMIT;");
  tranzakcio = false;
  db.close();
  db = null;

  const mappa = new URL("./export/", import.meta.url);
  await mkdir(mappa, { recursive: true });

  const kimenet = new URL("jatek-adatok-v1.json", mappa);
  ideiglenes = new URL(
    "ideiglenes-" + randomUUID() + ".json",
    mappa
  );

  await writeFile(
    ideiglenes,
    JSON.stringify(csomag),
    { encoding: "utf8", flag: "wx" }
  );

  await rename(ideiglenes, kimenet);
  ideiglenes = null;

  console.log("A játékadatok exportálása sikerült.");
  console.log("Molekulák:", molekulak.length);
  console.log("Reakciók:", reakciok.length);
  console.log(
    "Reakció–termék kapcsolatok:",
    reakciok.reduce((n, r) => n + r.termekek.length, 0)
  );
  console.log("Elkészült:", fileURLToPath(kimenet));
} catch (e) {
  if (tranzakcio) db.exec("ROLLBACK;");
  console.error("Az exportálás nem sikerült:", e.message);
  process.exitCode = 1;
} finally {
  if (db) db.close();
  if (ideiglenes) await rm(ideiglenes, { force: true });
}