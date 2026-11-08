import { sztereoJovahagyasEllenorzes } from "./sztereo-adatok.mjs";
import { createHash } from "node:crypto";
import {
  egyediNevek, objektumVagyUres,
  kapcsolatiKulcsKeszitese, pontosSzerkezetEgyezik
} from "./molekula-azonossag.mjs";

const hiba = (statusz, szoveg) =>
  Object.assign(new Error(szoveg), { statusz });

function valtozat(r) {
  return createHash("sha256").update(JSON.stringify([
    r.id, r.pubchem_cid, r.allapot, r.atalakitott_adat,
    r.magyar_nevek, r.hiba_uzenet, r.modositva
  ])).digest("hex");
}

const szoveg = v => typeof v === "string" ? v.trim() : "";
const lista = v => Array.isArray(v) ? v : [];

export async function molekulaJovahagyasKezeles({
  keres, valasz, ut, db, belepettFelhasznalo,
  valaszKuldese, torzsBeolvasasa
}) {
  const talalat =
    /^\/api\/admin\/molekula-import\/([1-9]\d*)\/jovahagyas$/.exec(ut);

  if (!talalat || keres.method !== "POST") return false;

  const adminEllenorzes = () => {
    if (belepettFelhasznalo(keres).szerepkor !== "admin") {
      throw hiba(403, "Adminjogosultság szükséges.");
    }
  };

  adminEllenorzes();

  const id = Number(talalat[1]);
  if (!Number.isSafeInteger(id)) {
    throw hiba(400, "Érvénytelen importazonosító.");
  }

  const torzs = await torzsBeolvasasa(keres);
  adminEllenorzes();

  if (
    Object.keys(torzs).length !== 1 ||
    typeof torzs.valtozat !== "string" ||
    !/^[a-f0-9]{64}$/.test(torzs.valtozat)
  ) {
    throw hiba(400, "A jóváhagyáshoz az elmentett adatváltozat szükséges.");
  }

  function olvasas() {
    const r = db.prepare(
      "SELECT * FROM molekula_importok WHERE id=?"
    ).get(id);

    if (!r) throw hiba(404, "Az importrekord nem található.");

    if (r.allapot !== "ellenorizendo") {
      throw hiba(409, "Az importot már feldolgozták. Frissítsd a listát.");
    }

    if (valtozat(r) !== torzs.valtozat) {
      throw hiba(
        409,
        "Az adatok megváltoztak. Frissítsd a listát és ellenőrizd újra a molekulát."
      );
    }

    return r;
  }

  function elokeszites(r) {
  const a = objektumVagyUres(
    JSON.parse(r.atalakitott_adat ?? "null")
  );

  sztereoJovahagyasEllenorzes(a);

  const n = objektumVagyUres(
    JSON.parse(r.magyar_nevek ?? "null")
  );

    if (!Array.isArray(a.minosites?.funkciosCsoportok)) {
      throw hiba(
        409,
        "A molekula automatikus minősítése még nem készült el."
      );
    }

    const k = db.prepare(`
      SELECT * FROM magyar_nev_kiegeszitesek
      WHERE pubchem_cid=? AND aktiv=1
    `).get(r.pubchem_cid);

    const preferaltNev =
      szoveg(n.preferaltNevJelolt) || szoveg(k?.preferalt_nev);

    if (!preferaltNev) {
      throw hiba(
        409,
        "Előbb adj meg és ments el egy magyar preferált nevet a szerkesztőben."
      );
    }

    const alternativak = egyediNevek([
      ...lista(k ? JSON.parse(k.alternativak) : []),
      ...lista(n.alternativaJeloltek),
      ...lista(a.nevek?.alternativak)
    ]).filter(
      x => x.toLocaleLowerCase("hu-HU") !==
        preferaltNev.toLocaleLowerCase("hu-HU")
    );

    const csaladok = egyediNevek(lista(a.csaladok));

    if (
      !Array.isArray(a.atomok) || !a.atomok.length ||
      !Array.isArray(a.kotesek) || !csaladok.length ||
      !szoveg(a.osszegkeplet) ||
      ![1, 2, 3].includes(a.nehezseg)
    ) {
      throw hiba(409, "A minősített molekula adatai hiányosak.");
    }

    if (!Number.isSafeInteger(r.pubchem_cid) || r.pubchem_cid < 1) {
      throw hiba(409, "Érvénytelen PubChem CID az importban.");
    }

    const adat = {
      ...a,
      id: "pubchem-" + r.pubchem_cid,
      nevek: {
        ...objektumVagyUres(a.nevek),
        preferalt: preferaltNev,
        alternativak
      },
      csaladok
    };

    return {
      adat,
      nevek: {
        ...n,
        preferaltNevJelolt: preferaltNev,
        alternativaJeloltek: alternativak,
        ellenorzott: true,
        automatikusanElfogadhato: false,
        elfogadottNev: preferaltNev,
        elfogadottAlternativak: alternativak
      }
    };
  }

  const elso = olvasas();
  const vegleges = elokeszites(elso);

  let kulcs;
  try {
    kulcs = await kapcsolatiKulcsKeszitese(vegleges.adat);
  } catch {
    throw hiba(
      409,
      "A molekula szerkezeti adatai hibásak; nem hagyható jóvá."
    );
  }

  adminEllenorzes();

  let eredmeny;
  db.exec("BEGIN IMMEDIATE;");

  try {
    const r = olvasas();

    if (JSON.stringify(elokeszites(r)) !== JSON.stringify(vegleges)) {
      throw hiba(409, "A névkiegészítés megváltozott. Frissítsd a listát.");
    }

    const a = vegleges.adat;
    const inchi = szoveg(r.inchi_key) || null;

    function duplikatum(m) {
      throw hiba(
        409,
        "Ez a molekula már szerepel az adatbázisban: " +
        m.preferalt_nev + " (" + m.id + ")."
      );
    }

    const azonos = db.prepare(`
      SELECT id,preferalt_nev FROM molekulak
      WHERE id=? OR pubchem_cid=?
        OR (? IS NOT NULL AND inchi_key=?)
      LIMIT 1
    `).get(a.id, r.pubchem_cid, inchi, inchi);

    if (azonos) duplikatum(azonos);

    const jeloltek = db.prepare(`
      SELECT id,preferalt_nev,adat FROM molekulak
      WHERE kapcsolati_kulcs=? OR osszegkeplet=?
    `).all(kulcs, a.osszegkeplet);

    for (const m of jeloltek) {
      if (pontosSzerkezetEgyezik(a, JSON.parse(m.adat))) {
        duplikatum(m);
      }
    }

    const most = new Date().toISOString();

    db.prepare(`
      INSERT INTO molekulak (
        id,pubchem_cid,inchi_key,kapcsolati_kulcs,
        osszegkeplet,preferalt_nev,csaladok,nehezseg,adat,
        forras,ellenorzesi_statusz,aktiv,letrehozva,modositva
      )
      VALUES (
        ?,?,?,?,?,?,?,?,?,
        'pubchem-import','kezzel-ellenorzott',1,?,?
      )
    `).run(
      a.id, r.pubchem_cid, inchi, kulcs,
      a.osszegkeplet, a.nevek.preferalt,
      JSON.stringify(a.csaladok), a.nehezseg,
      JSON.stringify(a), most, most
    );

    const frissites = db.prepare(`
      UPDATE molekula_importok
      SET atalakitott_adat=?,magyar_nevek=?,
          allapot='elfogadva',hiba_uzenet=NULL,modositva=?
      WHERE id=? AND allapot='ellenorizendo'
    `).run(
      JSON.stringify(a),
      JSON.stringify(vegleges.nevek),
      most,
      id
    );

    if (frissites.changes !== 1) {
      throw new Error("Az importállapot mentése nem sikerült.");
    }

    eredmeny = {
      sikeres: true,
      molekula: {
        id: a.id,
        preferaltNev: a.nevek.preferalt,
        aktiv: true
      },
      importAllapot: "elfogadva"
    };

    db.exec("COMMIT;");
  } catch (e) {
    db.exec("ROLLBACK;");
    throw e;
  }

  valaszKuldese(valasz, 200, eredmeny);
  return true;
}