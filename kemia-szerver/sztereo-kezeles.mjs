import { sztereoAutomatikusJavaslat } from "./sztereo-automatikus.mjs";
import { createHash } from "node:crypto";
import { molekulaSvg } from "./molekula-elozet.mjs";
import {
  sztereoUrlap,
  sztereoAdatokKeszitese,
  sztereoForrasKovetelmenyek
} from "./sztereo-adatok.mjs";

const hiba = (statusz, s) =>
  Object.assign(new Error(s), { statusz });

function valtozat(r) {
  return createHash("sha256").update(JSON.stringify([
    r.id, r.pubchem_cid, r.allapot, r.atalakitott_adat,
    r.magyar_nevek, r.hiba_uzenet, r.modositva
  ])).digest("hex");
}

function szamozottSvg(a) {
  let svg = molekulaSvg(a).replace(
    /<text\b[^>]*>[\s\S]*?<\/text>/g,
    tag => tag
      .replace(/\by="([^"]+)"/, (_, y) =>
        'y="' + (Number(y) + 5) + '"'
      )
      .replace(/font-size="18"/, 'font-size="16"')
  );

  const szamok = a.elozetPoziciok.map((p, i) =>
    `<text x="${p.x}" y="${p.y - 7}"
      text-anchor="middle" font-family="Arial,sans-serif"
      font-size="10" fill="#475569">${i + 1}</text>`
  ).join("");

  return svg.replace("</svg>", szamok + "</svg>");
}

function forrasHozzaadas(a, r) {
  return {
    ...a,
    importAdatok: {
      ...(a.importAdatok ?? {}),
      sztereoForrasKovetelmenyek: sztereoForrasKovetelmenyek(
        a,
        JSON.parse(r.nyers_pubchem_adat ?? "null")
      )
    }
  };
}

function eredmeny(r, automatikus = false) {
  let a = JSON.parse(r.atalakitott_adat);

  const mentettSztereokemia = sztereoUrlap(a);
  let automatikusanKitoltve = false;
  let figyelmeztetesek = [];

  if (
    automatikus &&
    mentettSztereokemia.statusz === "ellenorizendo" &&
    !mentettSztereokemia.kiralisCentrumok.length &&
    !mentettSztereokemia.kettosKotesek.length
  ) {
    try {
      const j = sztereoAutomatikusJavaslat(
        a,
        JSON.parse(r.nyers_pubchem_adat ?? "null")
      );

      figyelmeztetesek = j.figyelmeztetesek;

      if (
        j.sztereokemia.kiralisCentrumok.length ||
        j.sztereokemia.kettosKotesek.length ||
        j.sztereokemia.statusz !== "ellenorizendo"
      ) {
        a = sztereoAdatokKeszitese(
          forrasHozzaadas(a, r),
          j.sztereokemia
        );

        automatikusanKitoltve = true;
      }
    } catch (e) {
      figyelmeztetesek.push(e.message);
    }
  }

  return {
    sikeres: true,
    valtozat: valtozat(r),
    automatikusanKitoltve,
    mentettSztereokemia,
    figyelmeztetesek,
    sztereokemia: sztereoUrlap(a),
    svg: szamozottSvg(a),
    atomok: a.atomok,
    kotesek: a.kotesek,

    forras: forrasHozzaadas(a, r)
      .importAdatok.sztereoForrasKovetelmenyek,

    forrasEkek:
      a.importAdatok?.eredetiPubchemEkKotesek ??
      a.importAdatok?.pubchemEkKotesek ??
      []
  };
}

export async function sztereoKezeles({
  keres, valasz, ut, db,
  belepettFelhasznalo, valaszKuldese, torzsBeolvasasa
}) {
  const m =
    /^\/api\/admin\/molekula-import\/([1-9]\d*)\/sztereo(?:\/(elozet))?$/.exec(ut);

  if (
    !m ||
    !["GET", "POST"].includes(keres.method) ||
    (m[2] && keres.method !== "POST")
  ) return false;

  function admin() {
    if (belepettFelhasznalo(keres).szerepkor !== "admin") {
      throw hiba(403, "Adminjogosultság szükséges.");
    }
  }

  admin();

  const id = Number(m[1]);

  if (!Number.isSafeInteger(id)) {
    throw hiba(400, "Érvénytelen importazonosító.");
  }

  function olvasas() {
    const r = db.prepare(
      "SELECT * FROM molekula_importok WHERE id=?"
    ).get(id);

    if (!r) throw hiba(404, "Az importrekord nem található.");

    if (r.allapot !== "ellenorizendo") {
      throw hiba(
        409,
        "Az importot már feldolgozták. Frissítsd a listát."
      );
    }

    return r;
  }

  if (keres.method === "GET") {
  valaszKuldese(
    valasz,
    200,
    eredmeny(olvasas(), true)
  );

  return true;
}

  const body = await torzsBeolvasasa(keres);
  admin();

  if (
    Object.keys(body).length !== 2 ||
    !Object.hasOwn(body, "sztereokemia") ||
    typeof body.valtozat !== "string" ||
    !/^[a-f0-9]{64}$/.test(body.valtozat)
  ) {
    throw hiba(
      400,
      "A sztereokémiai mezők és az elmentett adatváltozat szükségesek."
    );
  }

  function atalakitas() {
    const r = olvasas();

    if (body.valtozat !== valtozat(r)) {
      throw hiba(
        409,
        "Az import megváltozott. Frissítsd a listát és ellenőrizd újra."
      );
    }

    const a = JSON.parse(r.atalakitott_adat);

    const uj = sztereoAdatokKeszitese(
      forrasHozzaadas(a, r),
      body.sztereokemia
    );

    return { r, a, uj };
  }

  if (m[2]) {
    const { r, a, uj } = atalakitas();

    const azonosVazlat =
      uj.sztereokemia.statusz === "ellenorizendo" &&
      JSON.stringify(sztereoUrlap(a)) ===
        JSON.stringify(sztereoUrlap(uj));

    const elozetiRekord = azonosVazlat
      ? r
      : { ...r, atalakitott_adat: JSON.stringify(uj) };

    valaszKuldese(valasz, 200, {
      ...eredmeny(elozetiRekord),
      valtozat: valtozat(r),
      mentve: false
    });

    return true;
  }

  let result;
  db.exec("BEGIN IMMEDIATE;");

  try {
    const { r, a, uj } = atalakitas();

    const valtozott = !(
      JSON.stringify(a) === JSON.stringify(uj) ||
      (
        uj.sztereokemia.statusz === "ellenorizendo" &&
        JSON.stringify(sztereoUrlap(a)) ===
          JSON.stringify(sztereoUrlap(uj))
      )
    );

    if (valtozott) {
      const v = db.prepare(`
        UPDATE molekula_importok
        SET atalakitott_adat=?,hiba_uzenet=NULL,modositva=?
        WHERE id=? AND allapot='ellenorizendo'
      `).run(
        JSON.stringify(uj),
        new Date().toISOString(),
        id
      );

      if (v.changes !== 1) {
        throw new Error("A sztereokémiai mentés nem sikerült.");
      }
    }

    result = { ...eredmeny(olvasas()), valtozott };
    db.exec("COMMIT;");
  } catch (e) {
    db.exec("ROLLBACK;");
    throw e;
  }

  valaszKuldese(valasz, 200, result);
  return true;
}0