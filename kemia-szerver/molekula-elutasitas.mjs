import { createHash } from "node:crypto";

const hiba = (statusz, s) =>
  Object.assign(new Error(s), { statusz });

function valtozat(r) {
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

function nev(r) {
  for (const [szoveg, kulcs] of [
    [r.magyar_nevek, "preferaltNevJelolt"],
    [r.atalakitott_adat, "nevek"]
  ]) {
    try {
      const a = JSON.parse(szoveg ?? "null");

      const n = kulcs === "nevek"
        ? a?.nevek?.preferalt
        : a?.[kulcs];

      if (typeof n === "string" && n.trim()) {
        return n.trim();
      }
    } catch {}
  }

  return typeof r.keresesi_nev === "string" &&
    r.keresesi_nev.trim()
      ? r.keresesi_nev.trim()
      : "Névtelen import";
}

export async function molekulaElutasitasKezeles({
  keres,
  valasz,
  ut,
  db,
  belepettFelhasznalo,
  valaszKuldese,
  torzsBeolvasasa
}) {
  const m =
    /^\/api\/admin\/molekula-import\/([1-9]\d*)\/elutasitas$/
      .exec(ut);

  if (!m || !["GET", "POST"].includes(keres.method)) {
    return false;
  }

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

    if (!r) {
      throw hiba(404, "Az importrekord nem található.");
    }

    if (r.allapot !== "ellenorizendo") {
      throw hiba(
        409,
        "Az importot már feldolgozták. Frissítsd a listát."
      );
    }

    return r;
  }

  if (keres.method === "GET") {
    const r = olvasas();

    valaszKuldese(valasz, 200, {
      sikeres: true,
      id: r.id,
      pubchemCid: r.pubchem_cid,
      nev: nev(r),
      valtozat: valtozat(r)
    });

    return true;
  }

  const torzs = await torzsBeolvasasa(keres);
  admin();

  if (
    !torzs ||
    typeof torzs !== "object" ||
    Array.isArray(torzs) ||
    Object.keys(torzs).length !== 2 ||
    !Object.hasOwn(torzs, "indok") ||
    !Object.hasOwn(torzs, "valtozat") ||
    typeof torzs.indok !== "string" ||
    typeof torzs.valtozat !== "string" ||
    !/^[a-f0-9]{64}$/.test(torzs.valtozat)
  ) {
    throw hiba(
      400,
      "Az elutasításhoz indok és elmentett adatváltozat szükséges."
    );
  }

  const indok = torzs.indok.normalize("NFKC").trim();

  if (
    !indok ||
    indok.length > 1000 ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(indok)
  ) {
    throw hiba(
      400,
      "Az elutasítás indoka 1–1000 karakteres szöveg legyen."
    );
  }

  db.exec("BEGIN IMMEDIATE;");

  try {
    admin();

    const r = olvasas();

    if (valtozat(r) !== torzs.valtozat) {
      throw hiba(
        409,
        "Az import megváltozott. Frissítsd a listát és ellenőrizd újra."
      );
    }

    const korabbiHiba =
      typeof r.hiba_uzenet === "string" &&
      r.hiba_uzenet.trim()
        ? "\nKorábbi hiba:\n" + r.hiba_uzenet
        : "";

    const v = db.prepare(`
      UPDATE molekula_importok
      SET allapot='elutasitva',hiba_uzenet=?,modositva=?
      WHERE id=? AND allapot='ellenorizendo'
    `).run(
      "Adminisztrátori elutasítás: " + indok + korabbiHiba,
      new Date().toISOString(),
      id
    );

    if (v.changes !== 1) {
      throw new Error("Az import elutasítása nem sikerült.");
    }

    db.exec("COMMIT;");
  } catch (e) {
    db.exec("ROLLBACK;");
    throw e;
  }

  valaszKuldese(valasz, 200, {
    sikeres: true,
    id,
    importAllapot: "elutasitva",
    uzenet: "Az import elutasítva. A forrásadatok megmaradtak."
  });

  return true;
}