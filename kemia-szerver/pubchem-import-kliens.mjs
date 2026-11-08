function pubchemImportPanelKeszitese({ api, frissites }) {
  const keszit = (nev, szoveg) => {
    const e = document.createElement(nev);
    if (szoveg !== undefined) e.textContent = szoveg;
    return e;
  };

  const panel = keszit("details");
  panel.className = "doboz";
  panel.open = true;
  panel.append(keszit("summary", "Új molekula importálása"));

  panel.append(keszit(
    "p",
    "Add meg a PubChem CID-azonosítót. A molekula az ellenőrzési várólistára kerül; a játékba külön jóváhagyás után jut be."
  ));

  const urlap = keszit("form");
  const cimke = keszit("label", "PubChem CID");
  const cidMezo = keszit("input");

  cidMezo.type = "text";
  cidMezo.inputMode = "numeric";
  cidMezo.pattern = "[1-9][0-9]*";
  cidMezo.maxLength = 16;
  cidMezo.required = true;
  cidMezo.autocomplete = "off";
  cimke.append(cidMezo);

  const gomb = keszit("button", "Importálás ellenőrzésre");
  gomb.type = "submit";
  urlap.append(cimke, gomb);

  const uzenet = keszit("p");
  uzenet.setAttribute("role", "status");
  uzenet.setAttribute("aria-live", "polite");
  uzenet.style.whiteSpace = "pre-wrap";

  const figyelmeztetesek = keszit("ul");
  panel.append(urlap, uzenet, figyelmeztetesek);

  let folyamatban = false;

  function cidOlvasas() {
    const s = cidMezo.value.trim();
    const cid = Number(s);

    return /^[1-9][0-9]*$/.test(s) && Number.isSafeInteger(cid)
      ? cid
      : null;
  }

  function allapot() {
    cidMezo.disabled = folyamatban;
    gomb.disabled = folyamatban || cidOlvasas() === null;
  }

  cidMezo.addEventListener("input", allapot);

  urlap.addEventListener("submit", async e => {
    e.preventDefault();
    if (folyamatban) return;

    const cid = cidOlvasas();

    if (cid === null) {
      uzenet.textContent =
        "A CID pozitív egész szám legyen, szóköz és egyéb jel nélkül.";
      return;
    }

    folyamatban = true;
    uzenet.textContent = "Letöltés és feldolgozás…";
    figyelmeztetesek.replaceChildren();
    allapot();

    try {
      const r = await api("/api/admin/pubchem-import", {
        method: "POST",
        body: JSON.stringify({ pubchemCid: cid })
      });

      cidMezo.value = "";

      uzenet.textContent =
        "Importazonosító: #" + r.id +
        " · PubChem CID: " + r.pubchemCid +
        "\n" + r.uzenet;

      for (const szoveg of r.figyelmeztetesek ?? []) {
        figyelmeztetesek.append(keszit("li", szoveg));
      }

      try {
        await frissites();
      } catch (hiba) {
        uzenet.textContent +=
          "\nAz import mentése sikerült, de a listák frissítése nem: " +
          hiba.message +
          " Használd a Listák frissítése gombot.";
      }
    } catch (hiba) {
      uzenet.textContent = hiba.message;
    } finally {
      folyamatban = false;
      allapot();
    }
  });

  allapot();
  return { elem: panel };
}

export const PUBCHEM_IMPORT_KLIENS =
  pubchemImportPanelKeszitese.toString();