import {
  pubchemLetoltes,
  pubchemTulajdonsag
} from "./pubchem-letoltes.mjs";

import { pubchemAtalakitas } from "./pubchem-atalakitas.mjs";
import { molekulaMinositese } from "./molekula-minosites.mjs";

const hiba = (statusz, uzenet) =>
  Object.assign(new Error(uzenet), { statusz });

let importFolyamatban = false;
let utolsoLetoltes = 0;

export async function pubchemImportKezeles({
  keres,
  valasz,
  ut,
  db,
  belepettFelhasznalo,
  valaszKuldese,
  torzsBeolvasasa
}) {
  if (
    ut !== "/api/admin/pubchem-import" ||
    keres.method !== "POST"
  ) {
    return false;
  }

  const admin = () => {
    if (belepettFelhasznalo(keres).szerepkor !== "admin") {
      throw hiba(403, "Adminjogosultság szükséges.");
    }
  };

  admin();

  const torzs = await torzsBeolvasasa(keres);

  admin();

  if (
    !torzs ||
    typeof torzs !== "object" ||
    Array.isArray(torzs) ||
    Object.keys(torzs).length !== 1 ||
    !Object.hasOwn(torzs, "pubchemCid") ||
    !Number.isSafeInteger(torzs.pubchemCid) ||
    torzs.pubchemCid <= 0
  ) {
    throw hiba(
      400,
      "A pubchemCid mezőben pozitív egész számot adj meg."
    );
  }

  const cid = torzs.pubchemCid;

  function duplikatumEllenorzes(inchiKey = null) {
    const m = db.prepare(`
      SELECT id,preferalt_nev FROM molekulak
      WHERE id=? OR pubchem_cid=?
        OR (? IS NOT NULL AND inchi_key=?)
      LIMIT 1
    `).get("pubchem-" + cid, cid, inchiKey, inchiKey);

    if (m) {
      throw hiba(
        409,
        "Ez a molekula már szerepel az adatbázisban: " +
        m.preferalt_nev + " (" + m.id + ")."
      );
    }

    const r = db.prepare(`
      SELECT id,allapot FROM molekula_importok
      WHERE pubchem_cid=?
        OR (? IS NOT NULL AND inchi_key=?)
      LIMIT 1
    `).get(cid, inchiKey, inchiKey);

    if (r) {
      throw hiba(
        409,
        "Ehhez a molekulához már létezik import: #" +
        r.id + ", állapot: " + r.allapot +
        ". A mentett adatokat nem írtam felül."
      );
    }
  }

  duplikatumEllenorzes();

  if (importFolyamatban) {
    throw hiba(
      429,
      "Egy import már folyamatban van. Várd meg a végét."
    );
  }

  if (Date.now() - utolsoLetoltes < 1000) {
    throw hiba(
      429,
      "Két letöltés között várj legalább egy másodpercet."
    );
  }

  importFolyamatban = true;

  try {
    utolsoLetoltes = Date.now();

    let letoltott;

    try {
      letoltott = await pubchemLetoltes(cid);
    } catch (e) {
      throw hiba(
        502,
        "A letöltés sikertelen: " + e.message
      );
    }

    admin();
    duplikatumEllenorzes(letoltott.inchiKey);

    let adat = null;
    let feldolgozasiHiba = null;

    try {
      const a = pubchemAtalakitas(letoltott);
      const minosites = molekulaMinositese(a);

      adat = {
        ...a,
        csaladok: minosites.csaladok,
        nehezseg: minosites.nehezseg,
        minosites
      };
    } catch (e) {
      feldolgozasiHiba =
        "Az automatikus feldolgozás nem sikerült: " +
        e.message;
    }

    const pc = letoltott.nyersAdat.PC_Compounds[0];

    const munkanev = String(
      pubchemTulajdonsag(pc, "IUPAC Name", "Preferred") ??
      pubchemTulajdonsag(pc, "IUPAC Name") ??
      ("PubChem " + cid)
    );

    let id;

    db.exec("BEGIN IMMEDIATE;");

    try {
      admin();
      duplikatumEllenorzes(letoltott.inchiKey);

      const k = db.prepare(`
        SELECT preferalt_nev,alternativak
        FROM magyar_nev_kiegeszitesek
        WHERE pubchem_cid=? AND aktiv=1
      `).get(cid);

      const preferalt =
        typeof k?.preferalt_nev === "string"
          ? k.preferalt_nev.trim()
          : "";

      const alternativak = k
        ? JSON.parse(k.alternativak)
        : [];

      if (
        !Array.isArray(alternativak) ||
        alternativak.some(v => typeof v !== "string")
      ) {
        throw hiba(
          409,
          "A helyi magyar névkiegészítés adatai hibásak."
        );
      }

      const nevek = {
        preferaltNevJelolt: preferalt || null,
        alternativaJeloltek: alternativak,
        ellenorzott: false,
        automatikusanElfogadhato: false
      };

      if (adat) {
        adat.minosites.magyarNevTalalhato = Boolean(preferalt);

        if (preferalt) {
          adat.nevek = { preferalt, alternativak };
        }
      }

      const most = new Date().toISOString();

      const r = db.prepare(`
        INSERT INTO molekula_importok
          (
            pubchem_cid,
            keresesi_nev,
            inchi_key,
            nyers_pubchem_adat,
            atalakitott_adat,
            magyar_nevek,
            allapot,
            hiba_uzenet,
            probalkozasok,
            letrehozva,
            modositva
          )
        VALUES (?,?,?,?,?,?,'ellenorizendo',?,1,?,?)
      `).run(
        cid,
        preferalt || munkanev,
        letoltott.inchiKey,
        JSON.stringify(letoltott.nyersAdat),
        adat ? JSON.stringify(adat) : null,
        JSON.stringify(nevek),
        feldolgozasiHiba,
        most,
        most
      );

      id = Number(r.lastInsertRowid);

      if (!Number.isSafeInteger(id) || id < 1) {
        throw new Error(
          "Az új import azonosítója nem kezelhető."
        );
      }

      db.exec("COMMIT;");
    } catch (e) {
      db.exec("ROLLBACK;");
      throw e;
    }

    valaszKuldese(valasz, 201, {
      sikeres: true,
      id,
      pubchemCid: cid,
      allapot: "ellenorizendo",
      feldolgozasSikeres: adat !== null,

      figyelmeztetesek: adat
        ? [
            ...(adat.importAdatok.figyelmeztetesek ?? []),
            ...adat.minosites.figyelmeztetesek
          ]
        : [feldolgozasiHiba],

      uzenet: adat
        ? "A molekula bekerült az ellenőrzési várólistába. Ellenőrizd a magyar nevet, a családokat és a sztereokémiát."
        : "A forrásadatokat elmentettem, de az automatikus feldolgozás nem sikerült. Az import a várólistán elutasítható; jelen állapotában nem hagyható jóvá."
    });

    return true;
  } finally {
    importFolyamatban = false;
  }
}