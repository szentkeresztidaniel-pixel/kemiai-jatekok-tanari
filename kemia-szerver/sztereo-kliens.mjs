function sztereoPanelKeszitese({
  id,
  api,
  valtozat,
  tiltott,
  rajzFrissites,
  mentve
}) {
  const elem = document.createElement("details");
  elem.style.margin = "16px 0";

  const cim = document.createElement("summary");
  cim.textContent = "R/S- és E/Z-adatok";
  cim.style.cursor = "pointer";
  cim.style.fontWeight = "bold";

  const hely = document.createElement("div");
  const uzenet = document.createElement("p");
  uzenet.setAttribute("role", "status");
  elem.append(cim, hely, uzenet);

  let betoltve = false;
  let foglalt = false;
  let eredeti = "";
  let nezet = "";
  let statusz;
  let rs = [];
  let ez = [];
  let vezerlok = [];

  const ut = "/api/admin/molekula-import/" + id + "/sztereo";

  const urlap = () => ({
    statusz: statusz.value,
    kiralisCentrumok: rs.map(r => r.olvas()),
    kettosKotesek: ez.map(r => r.olvas())
  });

  const mentetlen = () =>
    betoltve &&
    (JSON.stringify(urlap()) !== eredeti || nezet !== eredeti);

  function kapcsol(ok) {
    for (const v of vezerlok) {
      v.disabled = !ok;
    }
  }

  function hiba(e) {
    uzenet.textContent = e.message;
  }

  function szamMezo(gyoker, cim, ertek, max) {
    const label = document.createElement("label");
    label.textContent = cim;

    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = String(max);
    input.step = "1";
    input.value = Number.isInteger(ertek)
      ? String(ertek + 1)
      : "";
    input.style.width = "100%";

    label.append(input);
    gyoker.append(label);
    vezerlok.push(input);

    return {
      olvas: () => input.value === ""
        ? null
        : Number(input.value) - 1
    };
  }

  function valaszto(gyoker, cim, ertek, opciok) {
    const label = document.createElement("label");
    label.textContent = cim;

    const select = document.createElement("select");
    select.style.font = "inherit";
    select.style.padding = "8px";

    for (const [v, s] of opciok) {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = s;
      select.append(o);
    }

    select.value = ertek ?? "";
    label.append(select);
    gyoker.append(label);
    vezerlok.push(select);

    return select;
  }

  function gomb(cim, hely, fn) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = cim;
    b.addEventListener("click", fn);
    hely.append(b);
    vezerlok.push(b);
    return b;
  }

  function sorDoboz(gyoker) {
    const d = document.createElement("div");
    d.style.padding = "12px";
    d.style.border = "1px solid #cbd5e1";
    d.style.margin = "10px 0";

    const mezok = document.createElement("div");
    mezok.style.display = "grid";
    mezok.style.gridTemplateColumns =
      "repeat(auto-fit,minmax(130px,1fr))";
    mezok.style.gap = "8px";

    d.append(mezok);
    gyoker.append(d);

    return { d, mezok };
  }

  let rsHely;
  let ezHely;
  let atomDarab = 0;

  function rsSor(c = {}) {
  const { d, mezok } = sorDoboz(rsHely);

  const atom = szamMezo(
    mezok,
    "Központi atom",
    c.atomIndex,
    atomDarab
  );

  const konfiguracio = valaszto(
    mezok,
    "Konfiguráció",
    c.konfiguracio,
    [["", "Válassz"], ["R", "R"], ["S", "S"]]
  );

  const p = [0, 1, 2, 3].map(i =>
    szamMezo(
      mezok,
      (i + 1) + ". CIP-prioritású szomszéd" +
        (i === 3 ? " (négy nehéz szomszédnál)" : ""),
      c.prioritasIndexek?.[i],
      atomDarab
    )
  );

  const kiemelt = szamMezo(
    mezok,
    "Ékkötés végpontja",
    c.kiemeltAtomIndex,
    atomDarab
  );

  const row = {
    olvas: () => ({
      atomIndex: atom.olvas(),
      konfiguracio: konfiguracio.value,

      prioritasIndexek: p
        .map(x => x.olvas())
        .filter((v, i) => i < 3 || v !== null),

      kiemeltAtomIndex: kiemelt.olvas()
    })
  };

  gomb("R/S-sor törlése", d, () => {
    if (foglalt) return;
    rs = rs.filter(x => x !== row);
    d.remove();
  });

  rs.push(row);
}

  function ezSor(k = {}) {
    const { d, mezok } = sorDoboz(ezHely);

    const a = szamMezo(
      mezok,
      "Kettős kötés első atomja",
      k.atom1Index,
      atomDarab
    );

    const b = szamMezo(
      mezok,
      "Kettős kötés második atomja",
      k.atom2Index,
      atomDarab
    );

    const konfiguracio = valaszto(
      mezok,
      "Konfiguráció",
      k.konfiguracio,
      [["", "Válassz"], ["E", "E"], ["Z", "Z"]]
    );

    const p = szamMezo(
      mezok,
      "Első vég nagyobb prioritású szomszédja",
      k.elsoPrioritasIndex,
      atomDarab
    );

    const q = szamMezo(
      mezok,
      "Második vég nagyobb prioritású szomszédja",
      k.masodikPrioritasIndex,
      atomDarab
    );

    const row = {
      olvas: () => ({
        atom1Index: a.olvas(),
        atom2Index: b.olvas(),
        konfiguracio: konfiguracio.value,
        elsoPrioritasIndex: p.olvas(),
        masodikPrioritasIndex: q.olvas()
      })
    };

    gomb("E/Z-sor törlése", d, () => {
      if (foglalt) return;
      ez = ez.filter(x => x !== row);
      d.remove();
    });

    ez.push(row);
  }

  function beallitas(s) {
    rs = [];
    ez = [];
    rsHely.replaceChildren();
    ezHely.replaceChildren();
    statusz.value = s.statusz;

    for (const c of s.kiralisCentrumok) {
      rsSor(c);
    }

    for (const k of s.kettosKotesek) {
      ezSor(k);
    }

    eredeti = JSON.stringify(urlap());
    nezet = eredeti;
  }

  async function kuldes(mentes) {
    if (foglalt || tiltott()) return;

    foglalt = true;
    kapcsol(false);
    uzenet.textContent = mentes
      ? "Sztereokémiai mentés…"
      : "Előnézet készítése…";

    try {
      const r = await api(
        ut + (mentes ? "" : "/elozet"),
        {
          method: "POST",
          body: JSON.stringify({
            valtozat: valtozat(),
            sztereokemia: urlap()
          })
        }
      );

      rajzFrissites(r.svg, r.sztereokemia.statusz);
      nezet = JSON.stringify(r.sztereokemia);

      if (mentes) {
        beallitas(r.sztereokemia);
        mentve(r.valtozat);

        uzenet.textContent = r.valtozott
          ? "A sztereokémiai adatok elmentve. A molekula továbbra is ellenőrzésre vár."
          : "A sztereokémiai adatok már így szerepelnek.";
      } else {
        uzenet.textContent =
          "Az előnézet frissült. A mentéshez kattints a Sztereokémia mentése gombra.";
      }
    } catch (e) {
      hiba(e);
    } finally {
      foglalt = false;
      kapcsol(true);
    }
  }

  elem.addEventListener("toggle", async () => {
    if (!elem.open || betoltve || foglalt || tiltott()) {
      return;
    }

    foglalt = true;
    uzenet.textContent = "Sztereokémiai adatok betöltése…";

    try {
      const r = await api(ut);

      if (r.valtozat !== valtozat()) {
        throw new Error(
          "Az import megváltozott. Frissítsd a listát."
        );
      }

      atomDarab = r.atomok.length;

      const help = document.createElement("p");
      help.textContent =
  "A forrás egyértelmű térszerkezeti adatait a program automatikusan kitölti. " +
  "Ellenőrzés után mentsd el az adatokat. " +
  "A kézi mezők javításra használhatók; az atomszámokat a számozott rajzról olvasd le. " +
  "Az R/S-szerkesztő három vagy négy nehézatom-szomszéddal rendelkező tetraéderes széncentrumot kezel. " +
  "A negyedik prioritási mezőt csak négy nehéz szomszéd esetén töltsd ki. " +
  "Az ékkötés irányát a választott R/S-hez állítja be. " +
  "Az E/Z-jelölést összeveti a rajzzal.";

      const forras = document.createElement("p");
      forras.textContent =
        "A forrás által jelölt R/S-centrumok: " +
        (r.forras.rs.map(i => i + 1).join(", ") || "nincs") +
        ". Meghatározott E/Z-kötések: " +
        (
          r.forras.ez
            .map(k =>
              k.split(":")
                .map(i => Number(i) + 1)
                .join("–")
            )
            .join(", ") || "nincs"
        ) +
        ". Nem meghatározott forrásjelölések: " +
        r.forras.ismeretlen +
        ". A CIP-prioritások kézi ellenőrzést igényelnek.";

      hely.replaceChildren(help, forras);

      statusz = valaszto(
        hely,
        "Sztereokémiai állapot",
        r.sztereokemia.statusz,
        [
          ["ellenorizendo", "Ellenőrzésre vár – vázlat"],
          ["meghatarozott", "Megadott R/S- vagy E/Z-követelmény"],
          ["nincs", "Nincs sztereogén elem"],
          ["nincs-eloiras", "A térszerkezet szabadon választható"]
        ]
      );

      const rsCim = document.createElement("h4");
      rsCim.textContent = "R/S-centrumok";
      rsHely = document.createElement("div");
      hely.append(rsCim, rsHely);

      gomb("R/S-sor hozzáadása", hely, () => {
        if (!foglalt) rsSor();
      });

      const ezCim = document.createElement("h4");
      ezCim.textContent = "E/Z-kötések";
      ezHely = document.createElement("div");
      hely.append(ezCim, ezHely);

      gomb("E/Z-sor hozzáadása", hely, () => {
        if (!foglalt) ezSor();
      });

      gomb(
        "Sztereokémiai előnézet",
        hely,
        () => kuldes(false)
      );

      gomb(
        "Sztereokémia mentése",
        hely,
        () => kuldes(true)
      );

      beallitas(r.sztereokemia);

if (r.automatikusanKitoltve) {
  eredeti = JSON.stringify(r.mentettSztereokemia);
}

rajzFrissites(r.svg, r.sztereokemia.statusz);
betoltve = true;

uzenet.textContent = r.automatikusanKitoltve
  ? "A forrásból automatikusan kitöltött adatok még nincsenek elmentve. Ellenőrizd, majd kattints a Sztereokémia mentése gombra."
  : "";

if (r.figyelmeztetesek?.length) {
  uzenet.textContent +=
    " " + r.figyelmeztetesek.join(" ");
}
    } catch (e) {
      hiba(e);
    } finally {
      foglalt = false;
      kapcsol(true);
    }
  });

  return {
    elem,
    mentetlen,
    foglalt: () => foglalt
  };
}

export const SZTEREO_KLIENS =
  sztereoPanelKeszitese.toString();