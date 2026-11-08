function elutasitasPanelKeszitese({ api, frissites }) {
  const keszit = (nev, szoveg) => {
    const e = document.createElement(nev);
    if (szoveg !== undefined) e.textContent = szoveg;
    return e;
  };

  const panel = keszit("details");
  panel.className = "doboz";
  panel.append(keszit("summary", "Molekulaimport elutasítása"));
  panel.append(keszit(
    "p",
    "Válaszd ki az importot, töltsd be az adatait, és írd le az elutasítás okát. A forrásadatok megmaradnak."
  ));

  const valasztoCim = keszit("label", "Ellenőrzésre váró import");
  const valaszto = keszit("select");
  valaszto.style.cssText = "width:100%;padding:10px;font:inherit";
  valasztoCim.append(valaszto);

  const betoltes = keszit("button", "Import adatainak betöltése");
  betoltes.type = "button";

  const cel = keszit("p");
  const urlap = keszit("form");
  const indokCim = keszit("label", "Elutasítás indoklása");
  const indok = keszit("textarea");
  indok.required = true;
  indok.maxLength = 1000;
  indok.rows = 4;
  indok.style.cssText =
    "box-sizing:border-box;width:100%;padding:10px;font:inherit";
  indokCim.append(indok);

  const kuldes = keszit("button", "Kiválasztott import elutasítása");
  kuldes.type = "submit";
  kuldes.style.background = "#a12424";
  urlap.append(indokCim, kuldes);

  const uzenet = keszit("p");
  uzenet.setAttribute("role", "status");
  uzenet.setAttribute("aria-live", "polite");
  panel.append(valasztoCim, betoltes, cel, urlap, uzenet);

  let adat = null;
  let valtozas = 0;
  let betolt = false;
  let ment = false;

  function allapot() {
    valaszto.disabled =
      betolt || ment || valaszto.options.length < 2;
    betoltes.disabled = betolt || ment || !valaszto.value;
    indok.disabled = betolt || ment || !adat;
    kuldes.disabled =
      betolt || ment || !adat || !indok.value.trim();
  }

  function torles() {
    valtozas++;
    adat = null;
    betolt = false;
    cel.textContent = "";
    indok.value = "";
  }

  function listaFrissites(importok) {
    torles();
    valaszto.replaceChildren();

    const ures = keszit(
      "option",
      importok.length
        ? "Válassz egy importot…"
        : "Nincs ellenőrzésre váró molekulaimport."
    );
    ures.value = "";
    valaszto.append(ures);

    for (const m of importok) {
      const opcio = keszit(
        "option",
        "#" + m.id + " · CID " + m.pubchemCid + " · " + m.nev
      );
      opcio.value = String(m.id);
      valaszto.append(opcio);
    }

    uzenet.textContent = "";
    allapot();
  }

  valaszto.addEventListener("change", () => {
    torles();
    uzenet.textContent = "";
    allapot();
  });

  indok.addEventListener("input", allapot);

  betoltes.addEventListener("click", async () => {
    if (betolt || ment || !valaszto.value) return;

    const id = valaszto.value;
    torles();
    const sajatValtozas = valtozas;
    betolt = true;
    uzenet.textContent = "Importadatok betöltése…";
    allapot();

    try {
      const r = await api(
        "/api/admin/molekula-import/" + id + "/elutasitas"
      );

      if (sajatValtozas !== valtozas) return;

      if (
        String(r.id) !== id ||
        !/^[a-f0-9]{64}$/.test(r.valtozat)
      ) {
        throw new Error(
          "Az import válasza nem megfelelő. Frissítsd a listákat."
        );
      }

      adat = r;
      cel.textContent =
        "Elutasítandó: #" + r.id +
        " · PubChem CID: " + r.pubchemCid +
        " · " + r.nev;

      uzenet.textContent =
        "Ellenőrizd az import azonosítóját és nevét, majd add meg az indoklást.";
    } catch (hiba) {
      if (sajatValtozas === valtozas) {
        uzenet.textContent = hiba.message;
      }
    } finally {
      if (sajatValtozas === valtozas) {
        betolt = false;
        allapot();
      }
    }
  });

  urlap.addEventListener("submit", async e => {
    e.preventDefault();
    if (ment || betolt || !adat) return;

    const szoveg = indok.value.normalize("NFKC").trim();

    if (!szoveg || szoveg.length > 1000) {
      uzenet.textContent =
        "Az indoklás 1–1000 karakter hosszú lehet.";
      return;
    }

    const aktualis = adat;
    ment = true;
    uzenet.textContent = "Elutasítás mentése…";
    allapot();

    try {
      const r = await api(
        "/api/admin/molekula-import/" + aktualis.id + "/elutasitas",
        {
          method: "POST",
          body: JSON.stringify({
            valtozat: aktualis.valtozat,
            indok: szoveg
          })
        }
      );

      torles();

      try {
        await frissites();
        uzenet.textContent = r.uzenet;
      } catch (hiba) {
        uzenet.textContent =
          "Az elutasítás sikerült, de a listák frissítése nem: " +
          hiba.message;
      }
    } catch (hiba) {
      uzenet.textContent =
        hiba.message +
        " Ha közben módosult az import, töltsd be újra az adatait.";
    } finally {
      ment = false;
      allapot();
    }
  });

  listaFrissites([]);
  return { elem: panel, listaFrissites };
}

export const ELUTASITAS_KLIENS =
  elutasitasPanelKeszitese.toString();