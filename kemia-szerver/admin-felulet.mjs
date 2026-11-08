import { PUBCHEM_IMPORT_KLIENS } from "./pubchem-import-kliens.mjs";
import { ELUTASITAS_KLIENS } from "./elutasitas-kliens.mjs";
import { SZTEREO_KLIENS } from "./sztereo-kliens.mjs";
import { randomBytes } from "node:crypto";

function objektumAdat(szoveg) {
  const v = JSON.parse(szoveg ?? "null");
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

const OLDAL = `<!doctype html>
<html lang="hu">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kémiai játék – importlisták</title>
<style>
body{font:17px system-ui,sans-serif;background:#f1f5f9;color:#172033;margin:0;padding:30px 18px}
main{max-width:920px;margin:auto}
h1{font-size:28px}
h2{font-size:22px;margin-top:30px}
form,article,.doboz{background:white;border:1px solid #dbe3ed;border-radius:12px;padding:20px;margin:14px 0}
form{max-width:460px}
label{display:block;margin:12px 0 6px}
input{box-sizing:border-box;width:100%;padding:10px;font:inherit;border:1px solid #94a3b8;border-radius:6px}
button{padding:10px 16px;font:inherit;background:#1849a9;color:white;border:0;border-radius:7px;cursor:pointer;margin:12px 10px 0 0}
button:disabled{opacity:.6}
article h3{font-size:18px;overflow-wrap:anywhere;margin-top:0}
article p{overflow-wrap:anywhere;margin:8px 0}
#uzenet{white-space:pre-wrap;min-height:1.5em}
</style>
</head>
<body>
<main>
<h1>Importok ellenőrzésre</h1>

<form id="belepes">
<label for="email">E-mail-cím</label>
<input id="email" type="email" autocomplete="username"
  required maxlength="254">

<label for="jelszo">Jelszó</label>
<input id="jelszo" type="password" autocomplete="current-password"
  required maxlength="256">

<button id="belepes-gomb" type="submit">Belépés</button>
</form>

<p id="uzenet" role="status" aria-live="polite"></p>

<section id="panel" hidden>
<div class="doboz">
<p id="fiok"></p>
<p id="osszefoglalo"></p>
<button id="frissites" type="button">Listák frissítése</button>
<button id="kilepes" type="button">Kijelentkezés</button>
</div>

<h2 id="molekula-cim">Molekulák</h2>
<div id="molekulak"></div>

<h2 id="reakcio-cim">Reakcióimportok</h2>
<div id="reakciok"></div>

<h2>Magyar névkiegészítések</h2>
<div id="nevek"></div>
</section>

<script nonce="__NONCE__">
${PUBCHEM_IMPORT_KLIENS}
${ELUTASITAS_KLIENS}
${SZTEREO_KLIENS}
const elem = id => document.getElementById(id);
let token = null;

async function api(ut, beallitas = {}) {
  const r = await fetch(ut, {
    ...beallitas,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {})
    }
  });

  const adat = await r.json();
  if (!r.ok) throw new Error(adat.hiba || "A kérés sikertelen.");
  return adat;
}

function kartya(cim, sorok) {
  const doboz = document.createElement("article");
  const fejlec = document.createElement("h3");
  fejlec.textContent = cim;
  doboz.append(fejlec);

  for (const szoveg of sorok) {
    if (!szoveg) continue;
    const p = document.createElement("p");
    p.textContent = szoveg;
    doboz.append(p);
  }

  return doboz;
}

function lista(id, elemek, keszito, uresSzoveg) {
  const hely = elem(id);
  hely.replaceChildren();

  if (!elemek.length) {
    const p = document.createElement("p");
    p.textContent = uresSzoveg;
    hely.append(p);
  } else {
    for (const adat of elemek) hely.append(keszito(adat));
  }
}

function molekulaKartya(m) {
  const doboz = kartya(m.nev, [
    "Importazonosító: " + m.id + " · PubChem CID: " + m.pubchemCid,
    "Összegképlet: " + (m.osszegkeplet || "Nincs megadva")
  ]);

  const nyitas = document.createElement("button");
  nyitas.type = "button";
  nyitas.textContent = "Szerkesztés";

  const szerkeszto = document.createElement("div");
  szerkeszto.hidden = true;

  const uzenet = document.createElement("p");
  uzenet.setAttribute("role", "status");

  doboz.append(nyitas, uzenet, szerkeszto);

  let betoltve = false;
  const sorvege = String.fromCharCode(10);

  const sorLista = s =>
    s.split(sorvege).map(x => x.trim()).filter(Boolean);

  nyitas.addEventListener("click", async () => {
    if (betoltve) {
      szerkeszto.hidden = !szerkeszto.hidden;
      nyitas.textContent = szerkeszto.hidden
        ? "Szerkesztés"
        : "Szerkesztő bezárása";
      return;
    }

    nyitas.disabled = true;
    uzenet.textContent = "Adatok betöltése…";

    try {
      const valasz = await api("/api/admin/molekula-import/" + m.id);
      let adat = valasz.molekula;

            const elozet = await api(
        "/api/admin/molekula-import/" + m.id + "/elozet"
      );

      if (elozet.valtozat !== adat.valtozat) {
        throw new Error(
          "Az import közben megváltozott. Frissítsd a listát."
        );
      }

      const rajzDok = new DOMParser().parseFromString(
        elozet.svg,
        "image/svg+xml"
      );

      if (
        rajzDok.querySelector("parsererror") ||
        rajzDok.documentElement.localName !== "svg"
      ) {
        throw new Error("A szerkezeti rajz nem tölthető be.");
      }

      const rajz = document.importNode(
        rajzDok.documentElement,
        true
      );

      rajz.style.width = "100%";
      rajz.style.height = "auto";
      rajz.style.minWidth = "680px";
      rajz.style.display = "block";

      const rajzHely = document.createElement("div");
      rajzHely.style.overflow = "auto";
      rajzHely.style.border = "1px solid #dbe3ed";
      rajzHely.append(rajz);

      const nagyitas = document.createElement("button");
      nagyitas.type = "button";
      nagyitas.textContent = "Nagyobb rajz";

      let nagyRajz = false;

      nagyitas.addEventListener("click", () => {
        nagyRajz = !nagyRajz;
        rajz.style.minWidth = nagyRajz ? "1360px" : "680px";
        nagyitas.textContent =
          nagyRajz ? "Normál méret" : "Nagyobb rajz";
      });

      const sztereoInfo = document.createElement("p");
      sztereoInfo.textContent = elozet.sztereo;

      szerkeszto.replaceChildren(
        rajzHely,
        nagyitas,
        sztereoInfo
      );

      const form = document.createElement("form");
      form.style.maxWidth = "none";

      function mezo(cim, ertek) {
        const felirat = document.createElement("label");
        felirat.textContent = cim;

        const bevitel = document.createElement("textarea");
        bevitel.rows = 3;
        bevitel.style.width = "100%";
        bevitel.style.boxSizing = "border-box";
        bevitel.style.font = "inherit";
        bevitel.value = ertek;

        felirat.append(bevitel);
        form.append(felirat);
        return bevitel;
      }

      const nev = mezo("Preferált név", adat.preferaltNev);
      nev.required = true;
      nev.maxLength = 1000;

      const alternativak = mezo(
        "Alternatív nevek – soronként egy",
        adat.alternativak.join(sorvege)
      );

      const csaladok = mezo(
        "Családok – soronként egy",
        adat.csaladok.join(sorvege)
      );

      const felirat = document.createElement("label");
      felirat.textContent = "Nehézség";

      const nehezseg = document.createElement("select");
      nehezseg.required = true;

      for (const n of ["", "1", "2", "3"]) {
        const opcio = document.createElement("option");
        opcio.value = n;
        opcio.textContent = n || "Válassz nehézséget";
        nehezseg.append(opcio);
      }

      nehezseg.value =
        adat.nehezseg == null ? "" : String(adat.nehezseg);

      felirat.append(nehezseg);
      form.append(felirat);

      const mentes = document.createElement("button");
      mentes.type = "submit";
      mentes.textContent = "Mentés";
      form.append(mentes);
      const sztereoPanel = sztereoPanelKeszitese({
  id: m.id,
  api,
  valtozat: () => adat.valtozat,
  tiltott: () => mentes.disabled,

  mentve: v => {
    adat.valtozat = v;
  },

  rajzFrissites: (svg, statusz) => {
    const doc = new DOMParser().parseFromString(
      svg,
      "image/svg+xml"
    );

    if (
      doc.querySelector("parsererror") ||
      doc.documentElement.localName !== "svg"
    ) {
      throw new Error(
        "A sztereokémiai rajz nem tölthető be."
      );
    }

    const gyoker = doc.documentElement;

    rajz.setAttribute(
      "viewBox",
      gyoker.getAttribute("viewBox")
    );

    rajz.replaceChildren(
      ...Array.from(gyoker.childNodes).map(n =>
        document.importNode(n, true)
      )
    );

    const nevek = {
      ellenorizendo: "ellenőrzésre vár",
      meghatarozott: "megadott R/S- vagy E/Z-követelmény",
      nincs: "nincs sztereogén elem",
      "nincs-eloiras": "a térszerkezet szabadon választható"
    };

    sztereoInfo.textContent =
      "Sztereokémiai állapot: " +
      (nevek[statusz] || statusz) +
      ".";
  }
});

szerkeszto.append(sztereoPanel.elem);

      form.addEventListener("submit", async e => {
        e.preventDefault();
        if (sztereoPanel.foglalt()) {
  uzenet.textContent =
    "Előbb várd meg a sztereokémiai művelet végét.";
  return;
}
        mentes.disabled = true;
        uzenet.textContent = "Mentés…";

        try {
          const eredmeny = await api(
            "/api/admin/molekula-import/" + m.id,
            {
              method: "POST",
              body: JSON.stringify({
                preferaltNev: nev.value,
                alternativak: sorLista(alternativak.value),
                csaladok: sorLista(csaladok.value),
                nehezseg: Number(nehezseg.value),
                valtozat: adat.valtozat
              })
            }
          );

          adat = eredmeny.molekula;
          nev.value = adat.preferaltNev;
          alternativak.value = adat.alternativak.join(sorvege);
          csaladok.value = adat.csaladok.join(sorvege);
          nehezseg.value = String(adat.nehezseg);

          doboz.querySelector("h3").textContent = adat.preferaltNev;

          uzenet.textContent = eredmeny.valtozott
            ? "Elmentve. Az import továbbra is ellenőrzésre vár."
            : "Nem volt változás; az adatok megmaradtak.";
        } catch (hiba) {
          uzenet.textContent = hiba.message;
        } finally {
          mentes.disabled = false;
        }
      });

            const jovahagyas = document.createElement("button");
      jovahagyas.type = "button";
      jovahagyas.textContent = "Jóváhagyás és aktiválás";
      form.append(jovahagyas);

      jovahagyas.addEventListener("click", async () => {
        if (mentes.disabled || jovahagyas.disabled) return;
        if (sztereoPanel.foglalt() || sztereoPanel.mentetlen()) {
  uzenet.textContent =
    "Előbb mentsd el a sztereokémiai adatokat, majd várd meg a mentés végét.";
  return;
}

        const aktualis = {
          preferaltNev: nev.value.trim(),
          alternativak: sorLista(alternativak.value),
          csaladok: sorLista(csaladok.value),
          nehezseg: Number(nehezseg.value)
        };

        const elmentett = {
          preferaltNev: adat.preferaltNev,
          alternativak: adat.alternativak,
          csaladok: adat.csaladok,
          nehezseg: adat.nehezseg
        };

        if (JSON.stringify(aktualis) !== JSON.stringify(elmentett)) {
          uzenet.textContent =
            "Előbb mentsd el a módosításokat a Mentés gombbal.";
          return;
        }

        mentes.disabled = true;
        jovahagyas.disabled = true;
        uzenet.textContent = "Szerkezet ellenőrzése és jóváhagyás…";

        try {
          const eredmeny = await api(
            "/api/admin/molekula-import/" + m.id + "/jovahagyas",
            {
              method: "POST",
              body: JSON.stringify({ valtozat: adat.valtozat })
            }
          );

          elem("uzenet").textContent =
            "Jóváhagyva és aktiválva a helyi adatbázisban: " +
            eredmeny.molekula.preferaltNev;

          doboz.remove();

          const darab =
            elem("molekulak").querySelectorAll("article").length;

          elem("molekula-cim").textContent =
            "Ellenőrzésre váró molekulák: " + darab;

          if (!darab) {
            const p = document.createElement("p");
            p.textContent = "Nincs ellenőrzésre váró molekulaimport.";
            elem("molekulak").replaceChildren(p);
          }
        } catch (hiba) {
          uzenet.textContent = hiba.message;
        } finally {
          mentes.disabled = false;
          jovahagyas.disabled = false;
        }
      });

      szerkeszto.append(form);
      szerkeszto.hidden = false;
      betoltve = true;
      nyitas.textContent = "Szerkesztő bezárása";
      uzenet.textContent = "";
    } catch (hiba) {
      uzenet.textContent = hiba.message;
    } finally {
      nyitas.disabled = false;
    }
  });

  return doboz;
}

async function betoltes() {
  const adat = await api("/api/admin/importok");
  const o = adat.osszefoglalo;
  elutasitasPanel.listaFrissites(adat.molekulak);

  elem("osszefoglalo").textContent =
    "Importelőzmények: " + o.molekulaImportok +
    " molekulaimport, " + o.szintezisImportok +
    " reakcióimport, " + o.nevKiegeszitesek + " névkiegészítés.";

  elem("molekula-cim").textContent =
    "Ellenőrzésre váró molekulák: " + adat.molekulak.length;

  elem("reakcio-cim").textContent =
    "Ellenőrzésre váró reakcióimportok: " + adat.reakciok.length;

  lista(
  "molekulak",
  adat.molekulak,
  molekulaKartya,
  "Nincs ellenőrzésre váró molekulaimport."
);

  lista("reakciok", adat.reakciok, r => kartya(r.ordReakcioId, [
    "Importazonosító: " + r.id,
    "Állapot: ellenőrzésre vár",
    "Létrehozva: " + new Date(r.letrehozva).toLocaleString("hu-HU")
  ]), "Nincs ellenőrzésre váró reakcióimport.");

  lista("nevek", adat.nevek, n => kartya(
    n.preferaltNev || "Névkiegészítés",
    [
      "PubChem CID: " + n.pubchemCid,
      "Alternatív nevek: " + (n.alternativak.join(", ") || "Nincs megadva"),
      n.aktiv ? "Aktív" : "Inaktív",
      n.megjegyzes || ""
    ]
  ), "Nincs magyar névkiegészítés.");
}

const pubchemImportPanel = pubchemImportPanelKeszitese({
  api,
  frissites: betoltes
});

elem("molekula-cim").before(pubchemImportPanel.elem);

const elutasitasPanel = elutasitasPanelKeszitese({
  api,
  frissites: betoltes
});

elem("molekula-cim").before(elutasitasPanel.elem);

elem("belepes").addEventListener("submit", async e => {
  e.preventDefault();
  elem("belepes-gomb").disabled = true;
  elem("uzenet").textContent = "Belépés…";

  try {
    const adat = await api("/api/belepes", {
      method: "POST",
      body: JSON.stringify({
        email: elem("email").value,
        jelszo: elem("jelszo").value
      })
    });

    token = adat.token;
    elem("jelszo").value = "";

    await betoltes();

    elem("fiok").textContent =
      "Bejelentkezve: " + adat.felhasznalo.email;

    elem("belepes").hidden = true;
    elem("panel").hidden = false;
    elem("uzenet").textContent = "Az importlisták betöltődtek.";
  } catch (hiba) {
    elem("uzenet").textContent = hiba.message;
  } finally {
    elem("belepes-gomb").disabled = false;
  }
});

elem("frissites").addEventListener("click", async () => {
  elem("frissites").disabled = true;

  try {
    await betoltes();
    elem("uzenet").textContent = "A listák frissültek.";
  } catch (hiba) {
    elem("uzenet").textContent = hiba.message;
  } finally {
    elem("frissites").disabled = false;
  }
});

elem("kilepes").addEventListener("click", async () => {
  elem("kilepes").disabled = true;

  try {
    await api("/api/kilepes", {
      method: "POST",
      body: "{}"
    });

    token = null;
    elem("panel").hidden = true;

    for (const id of ["molekulak", "reakciok", "nevek"]) {
      elem(id).replaceChildren();
    }

    elem("fiok").textContent = "";
    elem("osszefoglalo").textContent = "";
    elem("belepes").hidden = false;
    elem("uzenet").textContent = "Kijelentkeztél.";
  } catch (hiba) {
    elem("uzenet").textContent = hiba.message;
  } finally {
    elem("kilepes").disabled = false;
  }
});
</script>
</main>
</body>
</html>`;

export async function adminKezeles({
  keres,
  valasz,
  ut,
  db,
  belepettFelhasznalo,
  valaszKuldese
}) {
  if (keres.method !== "GET") return false;

  if (ut === "/admin" || ut === "/admin/") {
    const nonce = randomBytes(18).toString("base64");

    valaszKuldese(valasz, 200, OLDAL.replace("__NONCE__", nonce), {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy":
        `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
      "Referrer-Policy": "no-referrer"
    });

    return true;
  }

  if (ut !== "/api/admin/importok") return false;

  const f = belepettFelhasznalo(keres);

  if (f.szerepkor !== "admin") {
    throw Object.assign(
      new Error("Adminjogosultság szükséges."),
      { statusz: 403 }
    );
  }

  for (const tabla of [
    "molekula_importok",
    "szintezis_importok",
    "magyar_nev_kiegeszitesek"
  ]) {
    const letezik = db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name = ?
    `).get(tabla);

    if (!letezik) {
      throw Object.assign(
        new Error("Az adminadatok még nincsenek betöltve."),
        { statusz: 409 }
      );
    }
  }

  const osszefoglalo = db.prepare(`
    SELECT
      (SELECT count(*) FROM molekula_importok) AS molekulaImportok,
      (SELECT count(*) FROM szintezis_importok) AS szintezisImportok,
      (SELECT count(*) FROM magyar_nev_kiegeszitesek) AS nevKiegeszitesek
  `).get();

  const molekulak = db.prepare(`
    SELECT
      id, pubchem_cid, keresesi_nev,
      atalakitott_adat, magyar_nevek, hiba_uzenet
    FROM molekula_importok
    WHERE allapot = 'ellenorizendo'
    ORDER BY id
  `).all().map(r => {
    const a = objektumAdat(r.atalakitott_adat);
    const n = objektumAdat(r.magyar_nevek);

    return {
      id: r.id,
      pubchemCid: r.pubchem_cid,
      nev:
        n.preferaltNevJelolt ||
        a.nevek?.preferalt ||
        r.keresesi_nev ||
        "Névtelen import",
      osszegkeplet: a.osszegkeplet ?? null,
      nehezseg: a.nehezseg ?? null,
      csaladok: Array.isArray(a.csaladok) ? a.csaladok : [],
      magyarNevEllenorzott: n.ellenorzott === true,
      hiba: r.hiba_uzenet
    };
  });

  const reakciok = db.prepare(`
    SELECT id, ord_reakcio_id, letrehozva
    FROM szintezis_importok
    WHERE allapot = 'ellenorizendo'
    ORDER BY letrehozva, id
  `).all().map(r => ({
    id: r.id,
    ordReakcioId: r.ord_reakcio_id,
    letrehozva: r.letrehozva
  }));

  const nevek = db.prepare(`
    SELECT pubchem_cid, preferalt_nev, alternativak, aktiv, megjegyzes
    FROM magyar_nev_kiegeszitesek
    ORDER BY pubchem_cid
  `).all().map(r => ({
    pubchemCid: r.pubchem_cid,
    preferaltNev: r.preferalt_nev,
    alternativak: JSON.parse(r.alternativak),
    aktiv: r.aktiv === 1,
    megjegyzes: r.megjegyzes
  }));

  valaszKuldese(valasz, 200, {
    sikeres: true,
    osszefoglalo,
    molekulak,
    reakciok,
    nevek
  });

  return true;
}