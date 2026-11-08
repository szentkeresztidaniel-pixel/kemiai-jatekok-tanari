"use strict";

(() => {
  const adatUrl = new URL(
    "jatek-adatok-v1.json",
    document.currentScript.src
  ).href;

  let betoltesIgeret = null;

  function masolat(adat) {
    return JSON.parse(JSON.stringify(adat));
  }

  function csomagEllenorzese(adat) {
    if (
      adat?.schemaVerzio !== 1 ||
      !Array.isArray(adat.molekulak) ||
      adat.molekulak.length === 0 ||
      !Array.isArray(adat.reakciok)
    ) {
      throw new Error(
        "Hiányos vagy nem támogatott játék-adatcsomag."
      );
    }

    const index = new Map();

    for (const m of adat.molekulak) {
      if (
        !m ||
        typeof m.id !== "string" ||
        index.has(m.id) ||
        m.adat?.id !== m.id ||
        !Array.isArray(m.adat.atomok) ||
        !Array.isArray(m.adat.kotesek) ||
        typeof m.adat.nevek?.preferalt !== "string" ||
        !Array.isArray(m.csaladok) ||
        m.csaladok.some(csalad => typeof csalad !== "string") ||
        ![1, 2, 3].includes(m.nehezseg)
      ) {
        throw new Error(
          "Hibás molekularekord a játék-adatcsomagban."
        );
      }

      index.set(m.id, m);
    }

    const reakcioIdk = new Set();

    for (const r of adat.reakciok) {
      if (
        !r ||
        typeof r.id !== "string" ||
        reakcioIdk.has(r.id) ||
        !index.has(r.kiindulasi_molekula_id) ||
        !Array.isArray(r.termekek) ||
        r.termekek.length === 0
      ) {
        throw new Error(
          "Hibás szintézisreakció a játék-adatcsomagban."
        );
      }

      reakcioIdk.add(r.id);

      const sorszamok = new Set();

      for (const t of r.termekek) {
        if (
          !t ||
          !index.has(t.molekula_id) ||
          !Number.isInteger(t.termek_sorszam) ||
          t.termek_sorszam < 0 ||
          sorszamok.has(t.termek_sorszam)
        ) {
          throw new Error(
            "Hibás reakciótermék a játék-adatcsomagban."
          );
        }

        sorszamok.add(t.termek_sorszam);
      }

      if (!sorszamok.has(0)) {
        throw new Error("Hiányzik egy reakció főterméke.");
      }
    }

    const szurok = {
      csaladok: [...new Set(
        adat.molekulak
          .flatMap(m => m.csaladok)
          .map(csalad => csalad.trim())
          .filter(Boolean)
      )].sort(),

      nehezsegek: [...new Set(
        adat.molekulak.map(m => m.nehezseg)
      )].sort((a, b) => a - b)
    };

    return { adat, index, szurok };
  }

  function adatcsomagBetoltese() {
    if (!betoltesIgeret) {
      betoltesIgeret = (async () => {
        const valasz = await fetch(adatUrl, {
          signal: AbortSignal.timeout(15000)
        });

        if (!valasz.ok) {
          throw new Error(
            "A játék-adatcsomag nem tölthető be: HTTP " +
            valasz.status
          );
        }

        return csomagEllenorzese(await valasz.json());
      })().catch(hiba => {
        betoltesIgeret = null;
        throw hiba;
      });
    }

    return betoltesIgeret;
  }

  async function ellenorzes() {
    const { adat, szurok } = await adatcsomagBetoltese();

    return {
      molekulak: adat.molekulak.length,
      reakciok: adat.reakciok.length,
      csaladok: szurok.csaladok.length
    };
  }

  async function szurokLekerdezese() {
    const { szurok } = await adatcsomagBetoltese();
    return masolat(szurok);
  }

  async function molekulakLekerdezese({
    darab = 150,
    kizarandoIdk = [],
    maxNehezseg = null,
    tiltottCsaladok = [],
    csaladSzuroVerzio = 2
  } = {}) {
    const szuroVerzio = csaladSzuroVerzio === 1 ? 1 : 2;

    if (
      !Array.isArray(kizarandoIdk) ||
      !Array.isArray(tiltottCsaladok) ||
      (
        maxNehezseg !== null &&
        ![1, 2, 3].includes(maxNehezseg)
      )
    ) {
      throw new Error("Érvénytelen molekulaszűrő-beállítás.");
    }

    const { adat } = await adatcsomagBetoltese();
    const kizartak = new Set(kizarandoIdk);
    const tiltottak = new Set(tiltottCsaladok);

    const kert = Number(darab ?? 150);
    const limit = Number.isFinite(kert)
      ? Math.min(150, Math.max(1, Math.floor(kert)))
      : 150;

    /*
     * 1 (régi): egyik család se legyen tiltott.
     * 2 (új): elég egy nem tiltott (bejelölt) család.
     */
    const csaladSzuronekMegfelel = (csaladok) => {
      if (tiltottak.size === 0) return true;
      if (szuroVerzio === 1) {
        return !csaladok.some((csalad) => tiltottak.has(csalad));
      }
      return csaladok.some((csalad) => !tiltottak.has(csalad));
    };

    const valasztek = adat.molekulak.filter(m =>
      !kizartak.has(m.id) &&
      (maxNehezseg === null || m.nehezseg <= maxNehezseg) &&
      csaladSzuronekMegfelel(m.csaladok)
    );

    for (let i = valasztek.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [valasztek[i], valasztek[j]] =
        [valasztek[j], valasztek[i]];
    }

    return masolat(valasztek.slice(0, limit));
  }

  async function reakciokLekerdezese(oldal = 0) {
    const { adat, index } = await adatcsomagBetoltese();
    const szam = Number(oldal ?? 0);

    const kezdet = (
      Number.isFinite(szam)
        ? Math.max(0, Math.floor(szam))
        : 0
    ) * 50;

    const reakciok = adat.reakciok
      .slice()
      .sort((a, b) =>
        a.id < b.id ? -1 : a.id > b.id ? 1 : 0
      )
      .slice(kezdet, kezdet + 50)
      .map(r => ({
        id: r.id,
        kiindulasi: index.get(r.kiindulasi_molekula_id),
        reagensek: r.reagensek,
        katalizatorok: r.katalizatorok,
        oldoszerek: r.oldoszerek,
        jatek_feltetelek: r.jatek_feltetelek,
        jatek_feny: r.jatek_feny,
        reakcio_tipus: r.reakcio_tipus,
        kilepo_anyagok: r.kilepo_anyagok,

        termekek: r.termekek
          .slice()
          .sort((a, b) =>
            a.termek_sorszam - b.termek_sorszam
          )
          .map(t => ({
            ...t,
            molekula: index.get(t.molekula_id)
          }))
      }));

    return masolat(reakciok);
  }

  window.JatekAdatok = Object.freeze({
    ellenorzes,
    szurokLekerdezese,
    molekulakLekerdezese,
    reakciokLekerdezese
  });
})();
