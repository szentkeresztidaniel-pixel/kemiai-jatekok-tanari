import { createHash } from "node:crypto";

const hiba = (statusz, szoveg) =>
  Object.assign(new Error(szoveg), { statusz });

const objektum = v =>
  v !== null && typeof v === "object" && !Array.isArray(v);

function objektumOlvasas(s) {
  const v = JSON.parse(s ?? "null");

  if (v !== null && !objektum(v)) {
    throw hiba(400, "Az import szerkeszthető adatai hibásak.");
  }

  return v ?? {};
}

function verzio(r) {
  return createHash("sha256").update(JSON.stringify([
    r.id,
    r.pubchem_cid,
    r.allapot,
    r.atalakitott_adat,
    r.magyar_nevek,
    r.hiba_uzenet,
    r.modositva
  ])).digest("hex");
}

function szerkesztheto(r) {
  const a = objektumOlvasas(r.atalakitott_adat);
  const n = objektumOlvasas(r.magyar_nevek);
  const nevek = objektum(a.nevek) ? a.nevek : {};

  return {
    id: r.id,
    pubchemCid: r.pubchem_cid,
    preferaltNev:
      n.preferaltNevJelolt ||
      nevek.preferalt ||
      r.keresesi_nev ||
      "",
    alternativak: Array.isArray(n.alternativaJeloltek)
      ? n.alternativaJeloltek
      : (Array.isArray(nevek.alternativak) ? nevek.alternativak : []),
    csaladok: Array.isArray(a.csaladok) ? a.csaladok : [],
    nehezseg: a.nehezseg ?? null,
    valtozat: verzio(r)
  };
}

function egyediLista(v, maxHossz) {
  if (
    !Array.isArray(v) ||
    v.length > 200 ||
    v.some(x => typeof x !== "string" || x.length > maxHossz)
  ) {
    throw hiba(400, "Hibás vagy túl hosszú név- vagy családlista.");
  }

  const kulcsok = new Set();
  const eredmeny = [];

  for (const elem of v) {
    const szoveg = elem.trim();
    const kulcs = szoveg.normalize("NFKC").toLocaleLowerCase("hu-HU");

    if (szoveg && !kulcsok.has(kulcs)) {
      kulcsok.add(kulcs);
      eredmeny.push(szoveg);
    }
  }

  return eredmeny;
}

function normalizalas(v) {
  if (
    typeof v.preferaltNev !== "string" ||
    !v.preferaltNev.trim() ||
    v.preferaltNev.length > 1000
  ) {
    throw hiba(
      400,
      "A preferált név nem lehet üres, és legfeljebb 1000 karakter lehet."
    );
  }

  if (![1, 2, 3].includes(v.nehezseg)) {
    throw hiba(400, "A nehézség csak 1, 2 vagy 3 lehet.");
  }

  const preferaltNev = v.preferaltNev.trim();
  const kulcs = preferaltNev.normalize("NFKC").toLocaleLowerCase("hu-HU");

  return {
    preferaltNev,
    alternativak: egyediLista(v.alternativak, 1000).filter(
      n => n.normalize("NFKC").toLocaleLowerCase("hu-HU") !== kulcs
    ),
    csaladok: egyediLista(v.csaladok, 100),
    nehezseg: v.nehezseg
  };
}

export async function molekulaMentesKezeles({
  keres,
  valasz,
  ut,
  db,
  belepettFelhasznalo,
  valaszKuldese,
  torzsBeolvasasa
}) {
  const egyezes =
    /^\/api\/admin\/molekula-import\/([1-9]\d*)$/.exec(ut);

  if (!egyezes || !["GET", "POST"].includes(keres.method)) {
    return false;
  }

  const adminEllenorzes = () => {
    const f = belepettFelhasznalo(keres);

    if (f.szerepkor !== "admin") {
      throw hiba(403, "Adminjogosultság szükséges.");
    }
  };

  adminEllenorzes();

  const id = Number(egyezes[1]);

  if (!Number.isSafeInteger(id)) {
    throw hiba(400, "Érvénytelen importazonosító.");
  }

  function rekordOlvasas() {
    const r = db.prepare(`
      SELECT * FROM molekula_importok WHERE id = ?
    `).get(id);

    if (!r) throw hiba(404, "Az importrekord nem található.");

    if (r.allapot !== "ellenorizendo") {
      throw hiba(409, "Az importot már feldolgozták. Frissítsd a listát.");
    }

    return r;
  }

  if (keres.method === "GET") {
    valaszKuldese(valasz, 200, {
      sikeres: true,
      molekula: szerkesztheto(rekordOlvasas())
    });
    return true;
  }

  const torzs = await torzsBeolvasasa(keres);
  adminEllenorzes();

  const mezok = [
    "preferaltNev",
    "alternativak",
    "csaladok",
    "nehezseg",
    "valtozat"
  ];

  if (
    Object.keys(torzs).length !== mezok.length ||
    !mezok.every(k => Object.hasOwn(torzs, k))
  ) {
    throw hiba(400, "Csak a megadott név- és besorolási mezők menthetők.");
  }

  if (
    typeof torzs.valtozat !== "string" ||
    !/^[0-9a-f]{64}$/.test(torzs.valtozat)
  ) {
    throw hiba(
      400,
      "Hiányzik a szerkesztett adatváltozat. Nyisd meg újra a szerkesztőt."
    );
  }

  const uj = normalizalas(torzs);
  let eredmeny;

  db.exec("BEGIN IMMEDIATE;");

  try {
    const r = rekordOlvasas();

    if (verzio(r) !== torzs.valtozat) {
      throw hiba(
        409,
        "Az importot közben módosították. Frissítsd a listát, majd nyisd meg újra a szerkesztőt."
      );
    }

    let jelenlegi = null;

    try {
      jelenlegi = normalizalas(szerkesztheto(r));
    } catch (e) {
      if (e.statusz !== 400) throw e;
    }

    if (jelenlegi && JSON.stringify(uj) === JSON.stringify(jelenlegi)) {
      eredmeny = {
        sikeres: true,
        valtozott: false,
        molekula: szerkesztheto(r)
      };
    } else {
      const a = objektumOlvasas(r.atalakitott_adat);
      const n = objektumOlvasas(r.magyar_nevek);

      const ujAdat = {
        ...a,
        nevek: {
          ...(objektum(a.nevek) ? a.nevek : {}),
          preferalt: uj.preferaltNev,
          alternativak: uj.alternativak
        },
        csaladok: uj.csaladok,
        nehezseg: uj.nehezseg
      };

      const ujNevek = {
        ...n,
        preferaltNevJelolt: uj.preferaltNev,
        alternativaJeloltek: uj.alternativak,
        ellenorzott: false,
        automatikusanElfogadhato: false
      };

      db.prepare(`
        UPDATE molekula_importok
        SET atalakitott_adat = ?,
            magyar_nevek = ?,
            hiba_uzenet = NULL,
            modositva = ?
        WHERE id = ? AND allapot = 'ellenorizendo'
      `).run(
        JSON.stringify(ujAdat),
        JSON.stringify(ujNevek),
        new Date().toISOString(),
        id
      );

      eredmeny = {
        sikeres: true,
        valtozott: true,
        molekula: szerkesztheto(rekordOlvasas())
      };
    }

    db.exec("COMMIT;");
  } catch (e) {
    db.exec("ROLLBACK;");
    throw e;
  }

  valaszKuldese(valasz, 200, eredmeny);
  return true;
}