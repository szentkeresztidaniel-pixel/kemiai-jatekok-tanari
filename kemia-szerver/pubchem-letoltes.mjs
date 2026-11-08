export function pubchemTulajdonsag(vegyulet, cimke, nev) {
  const tulajdonsagok = Array.isArray(vegyulet?.props)
    ? vegyulet.props : [];

  const t = tulajdonsagok.find(p =>
    p?.urn?.label === cimke &&
    (nev === undefined || p?.urn?.name === nev)
  );

  return t?.value?.sval ??
    t?.value?.ival ??
    t?.value?.fval ??
    null;
}

export async function pubchemLetoltes(pubchemCid) {
  if (!Number.isSafeInteger(pubchemCid) || pubchemCid <= 0) {
    throw new Error(
      "Érvénytelen PubChem CID: pozitív egész szám szükséges."
    );
  }

  const url =
    "https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/" +
    pubchemCid +
    "/record/JSON?record_type=2d";

  let valasz;

  try {
    valasz = await fetch(url, {
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(35000)
    });

    if (!valasz.ok) {
      await valasz.body?.cancel();

      if (valasz.status === 404) {
        throw new Error(
          "A PubChem nem talált ilyen CID-hez rekordot."
        );
      }

      if ([429, 503].includes(valasz.status)) {
        throw new Error(
          "A PubChem túlterhelt. Próbáld meg később."
        );
      }

      throw new Error(
        "A PubChem HTTP " + valasz.status + " választ adott."
      );
    }

    const darabok = [];
    let meret = 0;
    const maximum = 5 * 1024 * 1024;

    if (!valasz.body) {
      throw new Error("A PubChem válasza üres.");
    }

    for await (const darab of valasz.body) {
      meret += darab.byteLength;

      if (meret > maximum) {
        throw new Error(
          "A PubChem-rekord meghaladja az 5 MB-os importkorlátot."
        );
      }

      darabok.push(Buffer.from(darab));
    }

    let nyersAdat;

    try {
      nyersAdat = JSON.parse(
        Buffer.concat(darabok).toString("utf8")
      );
    } catch {
      throw new Error(
        "A PubChem válasza nem érvényes JSON-adat."
      );
    }

    const rekordok = nyersAdat?.PC_Compounds;

    if (!Array.isArray(rekordok) || rekordok.length !== 1) {
      throw new Error(
        "A válasz nem pontosan egy PubChem-vegyületet tartalmaz."
      );
    }

    const vegyulet = rekordok[0];

    if (vegyulet?.id?.id?.cid !== pubchemCid) {
      throw new Error(
        "A letöltött rekord CID-je eltér a kért azonosítótól."
      );
    }

    const inchiKey = pubchemTulajdonsag(
      vegyulet,
      "InChIKey"
    );

    if (
      typeof inchiKey !== "string" ||
      !/^[A-Z]{14}-[A-Z]{10}-[A-Z]$/.test(inchiKey)
    ) {
      throw new Error(
        "A PubChem-rekordból hiányzik az érvényes InChIKey."
      );
    }

    return { pubchemCid, inchiKey, nyersAdat };
  } catch (hiba) {
    if (["TimeoutError", "AbortError"].includes(hiba?.name)) {
      throw new Error(
        "A PubChem-letöltés túllépte a 35 másodperces időkorlátot."
      );
    }

    if (hiba instanceof TypeError) {
      throw new Error(
        "Nem sikerült kapcsolódni a PubChemhez. Ellenőrizd az internetkapcsolatot."
      );
    }

    throw hiba;
  }
}