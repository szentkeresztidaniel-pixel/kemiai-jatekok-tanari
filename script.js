"use strict";

const DEBUG = true;

function debug(esemeny, adatok = {}) {
  if (DEBUG) {
    console.log(`[DEBUG] ${esemeny}`, adatok);
  }
}

// ==================================================
// TANÓRA INDÍTÁSÁNAK MEGERŐSÍTÉSE
// ==================================================

function tanoraInditasMegerositese() {
  const ablak =
    document.getElementById(
      "tanora-inditas-megerosites"
    );

  if (!ablak) {
    console.error(
      "[HIBA] Nem található a tanóraindítás megerősítő ablaka."
    );

    return Promise.resolve(false);
  }

  if (
    typeof ablak.showModal !==
    "function"
  ) {
    console.error(
      "[HIBA] A böngésző nem támogatja az oldalon belüli megerősítő ablakot."
    );

    return Promise.resolve(false);
  }

  if (ablak.open) {
    console.warn(
      "[FIGYELMEZTETÉS] A tanóraindítás megerősítő ablaka már nyitva van."
    );

    return Promise.resolve(false);
  }

  debug(
    "Tanóraindítás megerősítő ablaka megnyitva"
  );

  /* Az Escape és a Mégsem alapértelmezetten elutasítás. */
  ablak.returnValue = "megsem";

  return new Promise(
    (resolve) => {
      ablak.addEventListener(
        "close",
        () => {
          const jovahagyva =
            ablak.returnValue ===
            "inditas";

          debug(
            "Tanóraindítás megerősítő ablaka bezárva",
            {
              valasz:
                ablak.returnValue,
              jovahagyva,
            }
          );

          resolve(jovahagyva);
        },
        {
          once: true,
        }
      );

      ablak.showModal();
    }
  );
}

// ==================================================
// TELEFONOS NÉVADÁS ÉS BILLENTYŰZET
// ==================================================

let nevadasGorgetesId = null;

function nevadasLathatoTeruletFrissitese() {
  const ablak =
    document.getElementById(
      "nevadas-ablak"
    );

  const urlap =
    document.getElementById(
      "nevadas-urlap"
    );

  if (!ablak || !urlap) {
    console.error(
      "[HIBA] A névadó ablak méretezéséhez szükséges elem hiányzik."
    );

    return null;
  }

  const lathatoMagassag =
    Math.round(
      window.visualViewport
        ?.height ??
      window.innerHeight
    );

  const hasznalhatoMagassag =
    Math.max(
      260,
      lathatoMagassag - 12
    );

  /*
   * Inline állítjuk be, ezért teljes képernyőben és
   * megnyitott telefonos billentyűzetnél is frissül.
   */
  ablak.style.maxHeight =
    `${hasznalhatoMagassag}px`;

  urlap.style.maxHeight =
    `${hasznalhatoMagassag}px`;

  return {
    lathatoMagassag,
    hasznalhatoMagassag,
  };
}

function nevadasMezoLathatovaTetele() {
  const nevMezo =
    document.getElementById(
      "molekula-nev"
    );

  if (!nevMezo) {
    return;
  }

  clearTimeout(
    nevadasGorgetesId
  );

  /*
   * Megvárjuk, amíg a telefonos billentyűzet
   * befejezi a megnyílási animációját.
   */
  nevadasGorgetesId =
    setTimeout(
      () => {
        if (
          document.activeElement !==
          nevMezo
        ) {
          return;
        }

        nevMezo.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });

        debug(
          "A névadási mező a látható területre görgetve",
          {
            teljesKepernyo:
              Boolean(
                document.fullscreenElement
              ),
            lathatoMagassag:
              Math.round(
                window.visualViewport
                  ?.height ??
                window.innerHeight
              ),
          }
        );
      },
      250
    );
}

function nevadasBillentyuzetBekotese() {
  const ablak =
    document.getElementById(
      "nevadas-ablak"
    );

  const nevMezo =
    document.getElementById(
      "molekula-nev"
    );

  if (!ablak || !nevMezo) {
    console.error(
      "[HIBA] A telefonos névadás elemei nem találhatók."
    );

    return;
  }

  if (
    nevMezo.dataset
      .billentyuzetBekotve === "1"
  ) {
    return;
  }

  nevMezo.dataset
    .billentyuzetBekotve = "1";

  /*
   * Telefonon az ablak kaphat fókuszt anélkül,
   * hogy rögtön megnyílna a billentyűzet.
   */
  ablak.tabIndex = -1;

  nevMezo.addEventListener(
    "focus",
    () => {
      ablak.classList.add(
        "billentyuzet-aktiv"
      );

      const meret =
        nevadasLathatoTeruletFrissitese();

      debug(
        "A névadási billentyűzet megnyílik",
        {
          ...meret,
          teljesKepernyo:
            Boolean(
              document.fullscreenElement
            ),
        }
      );

      nevadasMezoLathatovaTetele();
    }
  );

  nevMezo.addEventListener(
    "blur",
    () => {
      ablak.classList.remove(
        "billentyuzet-aktiv"
      );

      clearTimeout(
        nevadasGorgetesId
      );

      setTimeout(
        () => {
          const meret =
            nevadasLathatoTeruletFrissitese();

          debug(
            "A névadási billentyűzet bezárult",
            meret ?? {}
          );
        },
        150
      );
    }
  );

  window.visualViewport
    ?.addEventListener(
      "resize",
      () => {
        if (!ablak.open) {
          return;
        }

        nevadasLathatoTeruletFrissitese();

        if (
          document.activeElement ===
          nevMezo
        ) {
          nevadasMezoLathatovaTetele();
        }
      }
    );

  document.addEventListener(
    "fullscreenchange",
    () => {
      if (!ablak.open) {
        return;
      }

      setTimeout(
        () => {
          nevadasLathatoTeruletFrissitese();

          if (
            document.activeElement ===
            nevMezo
          ) {
            nevadasMezoLathatovaTetele();
          }
        },
        100
      );
    }
  );

  debug(
    "A telefonos névadási billentyűzet kezelése bekötve",
    {
      visualViewport:
        Boolean(
          window.visualViewport
        ),
    }
  );
}

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    nevadasBillentyuzetBekotese,
    {
      once: true,
    }
  );
} else {
  nevadasBillentyuzetBekotese();
}

const kepernyok = {
  fomenu:
    document.getElementById(
      "fomenu"
    ),

  molekulaepito:
    document.getElementById(
      "molekula-kepernyo"
    ),

  szintezisverseny:
    document.getElementById(
      "szintezis-kepernyo"
    ),

  admin:
    document.getElementById(
      "admin-kepernyo"
    ),
};

function kepernyoValtas(celAzonosito) {
  if (celAzonosito !== "szintezisverseny") {
    szintezisSikerIdozitoTorlese();
    szintezisIdozitoLeallitasa();
  }

  const celKepernyo = kepernyok[celAzonosito];

  if (!celKepernyo) {
    console.error("[HIBA] Nem létező képernyő:", celAzonosito);
    return;
  }

  debug("Képernyőváltás kezdete", {
    cel: celAzonosito
  });

  Object.entries(kepernyok).forEach(([nev, elem]) => {
    if (!elem) {
      console.error("[HIBA] Hiányzó képernyőelem:", nev);
      return;
    }

    elem.hidden = elem !== celKepernyo;

    debug("Képernyő állapota", {
      kepernyo: nev,
      rejtett: elem.hidden
    });
  });

  // Az új képernyő mindig felülről jelenjen meg.
  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "auto"
  });

  debug("Képernyőváltás befejezve", {
    aktivKepernyo: celAzonosito
  });
}

function gombBekotes(azonosito, akcio) {
  const gomb = document.getElementById(azonosito);
  if (!gomb) {
    console.error("[HIBA] Nem található a gomb:", azonosito);
    return;
  }

  gomb.addEventListener("click", () => {
    debug("Gombnyomás", { azonosito });
    akcio();
  });
}


// ==================================================
// TANÓRAI TANULÓI NAVIGÁCIÓ
// ==================================================

function tanoraiTanuloModAktiv() {
  const tanoraKod =
    new URLSearchParams(
      window.location.search
    )
      .get("ora")
      ?.trim();

  return Boolean(tanoraKod);
}

function tanuloiFomenuGombBeallitasa() {
  const fomenuGomb =
    document.getElementById(
      "molekula-vissza"
    );

  if (!fomenuGomb) {
    console.error(
      "[HIBA] Nem található a molekulaépítő Főmenü gombja."
    );

    return;
  }

  const tanuloiMod =
    tanoraiTanuloModAktiv();

  if (tanuloiMod) {
    fomenuGomb.hidden = true;
    fomenuGomb.disabled = true;
    fomenuGomb.tabIndex = -1;

    /*
     * Az inline display biztosítja, hogy egy másik
     * CSS-szabály se jeleníthesse meg véletlenül.
     */
    fomenuGomb.style.display =
      "none";

    fomenuGomb.setAttribute(
      "aria-hidden",
      "true"
    );

    debug(
      "A Főmenü gomb elrejtve a tanórai tanulónál",
      {
        tanuloiMod: true,
      }
    );

    return;
  }

  fomenuGomb.hidden = false;
  fomenuGomb.disabled = false;
  fomenuGomb.removeAttribute(
    "tabindex"
  );
  fomenuGomb.removeAttribute(
    "aria-hidden"
  );
  fomenuGomb.style.removeProperty(
    "display"
  );

  debug(
    "A Főmenü gomb elérhető a normál játékban",
    {
      tanuloiMod: false,
    }
  );
}

// Indítógombok
gombBekotes(
  "molekula-inditas",
  async () => {
    try {
      const szurok =
        await molekulaSzuroBeallitasokKiolvasasa("egyeni");

      await molekulaJatekMegnyitasa(szurok);
    } catch (hiba) {
      window.alert(
        hiba instanceof Error
          ? hiba.message
          : String(hiba)
      );
    }
  }
);
function szintezisReakcioMolekula(molekula, opciok = {}) {
  const doboz = document.createElement("div");
  doboz.className = opciok.termek
    ? "szintezis-termek"
    : "szintezis-vegyulet";

  if (opciok.cel) {
    doboz.classList.add("szintezis-cel");
  }

  if (opciok.felirat) {
    const cimke = document.createElement("span");
    cimke.textContent = opciok.felirat;
    doboz.append(cimke);
  }

  const abra = document.createElement("div");
  abra.className = "szintezis-molekula-abra";

  if (opciok.termek) {
    abra.classList.add("szintezis-termek-abra");
  }

  if (opciok.abraId) {
    abra.id = opciok.abraId;
  }

  const nev = document.createElement("p");

  if (opciok.termek) {
    nev.className = "szintezis-termek-nev";
  }

  if (opciok.nevId) {
    nev.id = opciok.nevId;
  }

  doboz.append(abra, nev);

  if (szintezisMolekulaRajzolhato(molekula)) {
    szintezisMolekulaKirajzolasa(abra, nev, molekula);
  } else if (molekula) {
    nev.textContent =
      molekula.preferalt_nev ??
      molekula.adat?.nevek?.preferalt ??
      "";
    szintezisVegyuletAzonositoRogzitese(doboz, molekula);
  }

  return doboz;
}

function szintezisNyilEgyseg({
  felso = "",
  also = "",
  interaktiv = false,
} = {}) {
  const egyseg = document.createElement("div");
  egyseg.className = "szintezis-nyil-egyseg";

  const felsoHely = document.createElement("div");
  felsoHely.className = "szintezis-felso-hely";
  const alsoHely = document.createElement("div");
  alsoHely.className = "szintezis-also-hely";

  if (interaktiv) {
    felsoHely.setAttribute("aria-label", "Reagens helye");
    felsoHely.textContent = szintezisHelyFelirat();
    alsoHely.setAttribute("aria-label", "Körülmény helye");
    alsoHely.textContent = szintezisHelyFelirat();
  } else {
    felsoHely.classList.add("szintezis-hely-teli");
    felsoHely.textContent = felso;
    alsoHely.classList.add("szintezis-hely-teli");
    alsoHely.textContent = also;
  }

  const nyil = document.createElement("div");
  nyil.className = "szintezis-nyil";
  nyil.setAttribute("aria-hidden", "true");

  if (interaktiv) {
    nyil.classList.add("szintezis-nyil-jatek");
    const jel = document.createElement("span");
    jel.className = "szintezis-nyil-jel";
    jel.textContent = "→";
    nyil.append(jel);
  } else {
    nyil.textContent = "→";
  }

  egyseg.append(felsoHely, nyil, alsoHely);
  return egyseg;
}

function szintezisNyilFestettIgazitas() {
  const nyilak = document.querySelectorAll(
    "#szintezis-kepernyo .szintezis-nyil-jatek"
  );
  const rajz = document.createElement("canvas").getContext("2d");

  if (!nyilak.length || !rajz) {
    return;
  }

  const forras = getComputedStyle(
    nyilak[0].querySelector(".szintezis-nyil-jel")
  );
  const minta = document.createElement("div");
  minta.style.cssText =
    "position:absolute;left:0;top:0;visibility:hidden;";
  minta.style.fontStyle = forras.fontStyle;
  minta.style.fontWeight = forras.fontWeight;
  minta.style.fontSize = forras.fontSize;
  minta.style.lineHeight = "1";
  minta.style.fontFamily = forras.fontFamily;
  const jel = document.createElement("span");
  jel.style.cssText = "display:block;font:inherit;line-height:1;";
  jel.textContent = "→";
  const bazis = document.createElement("span");
  bazis.style.cssText =
    "display:inline-block;width:0;height:0;vertical-align:baseline;";
  jel.append(bazis);
  minta.append(jel);
  document.body.append(minta);

  const jelDoboz = jel.getBoundingClientRect();
  const bazisY = bazis.getBoundingClientRect().top - jelDoboz.top;
  const stilus = getComputedStyle(jel);
  rajz.font = `${stilus.fontStyle} ${stilus.fontWeight} ${stilus.fontSize} ${stilus.fontFamily}`;
  const meret = rajz.measureText("→");
  minta.remove();

  const festett =
    meret.actualBoundingBoxAscent + meret.actualBoundingBoxDescent;

  if (!Number.isFinite(festett) || festett <= 0 || !Number.isFinite(bazisY)) {
    return;
  }

  const eltolas = -(bazisY - meret.actualBoundingBoxAscent);

  for (const nyil of nyilak) {
    const jelzes = nyil.querySelector(".szintezis-nyil-jel");
    nyil.style.setProperty("--szintezis-nyil-festett", `${festett}px`);

    if (jelzes) {
      jelzes.style.setProperty("--szintezis-nyil-eltolas", `${eltolas}px`);
    }
  }
}

function szintezisReakcioTermekMolekula(termek) {
  if (termek?.molekula) {
    return termek.molekula;
  }

  if (termek?.adat) {
    return termek;
  }

  if (termek?.molekula_id) {
    return { id: termek.molekula_id };
  }

  return null;
}

function szintezisTermekAdatSzoveg(termek) {
  const jeloles =
    Number(termek?.termek_sorszam) === 0 ? "Főtermék" : "Melléktermék";
  const nyers = termek?.termekarany_szazalek;
  const arany =
    nyers != null && String(nyers).trim() !== "" ? `${nyers}%` : "";

  return [jeloles, arany].filter(Boolean).join(" · ");
}

function szintezisReakcioTermekek(
  tartok,
  termekek,
  azonositoElotag = "",
  termekAdatok = false
) {
  const rendezett = (Array.isArray(termekek) ? termekek : [])
    .slice()
    .sort(
      (elso, masodik) =>
        Number(elso?.termek_sorszam) - Number(masodik?.termek_sorszam)
    );
  const azonositos = [];

  tartok.replaceChildren();

  rendezett.forEach((termek, index) => {
    const molekula = szintezisReakcioTermekMolekula(termek);
    const azonosito = szintezisMolekulaAzonosito(molekula);

    if (azonosito) {
      azonositos.push(azonosito);
    }

    const doboz = szintezisReakcioMolekula(molekula, {
      termek: true,
      abraId: azonositoElotag
        ? `${azonositoElotag}-abra-${index}`
        : "",
      nevId: azonositoElotag
        ? `${azonositoElotag}-nev-${index}`
        : "",
    });

    if (Number(termek?.termek_sorszam) !== 0) {
      doboz.classList.add("szintezis-mellektermek");
    }

    if (termekAdatok) {
      const adat = document.createElement("p");
      adat.className = "szintezis-termek-adat";
      adat.textContent = szintezisTermekAdatSzoveg(termek);
      doboz.append(adat);
    }

    tartok.append(doboz);
  });

  tartok.hidden = rendezett.length === 0;
  return azonositos;
}

function szintezisReakcioSor(opciok = {}) {
  const megjelenites = document.createElement("div");
  megjelenites.className = "szintezis-reakcio-megjelenites";

  if (opciok.panel) {
    megjelenites.classList.add("szintezis-reakcio-panel");
  }
  const cimSzoveg = String(opciok.cim ?? "").trim();

  if (cimSzoveg || opciok.cimId) {
    const cim = document.createElement("h4");
    cim.className = "szintezis-reakcio-cim";
    cim.textContent = cimSzoveg;

    if (opciok.cimId) {
      cim.id = opciok.cimId;
    }

    cim.hidden = !cimSzoveg;
    megjelenites.append(cim);
  }

  const utvonal = document.createElement("div");
  utvonal.className = "szintezis-utvonal";

  if (!opciok.interaktiv) {
    utvonal.dataset.szintezisOlvasas = "1";
  }

  utvonal.append(
    szintezisReakcioMolekula(opciok.kiindulasi ?? null, {
      felirat: opciok.kiindulasiFelirat ?? "",
      abraId: opciok.kezdoAbraId ?? "",
      nevId: opciok.kezdoNevId ?? "",
    })
  );

  const lepes = document.createElement("div");
  lepes.className = "szintezis-lepes";
  lepes.dataset.lepes = "1";
  lepes.append(
    szintezisNyilEgyseg({
      felso: opciok.felsoSzoveg ?? "",
      also: opciok.alsoSzoveg ?? "",
      interaktiv: Boolean(opciok.interaktiv),
    })
  );

  const termekTartok = document.createElement("div");
  termekTartok.className = "szintezis-lepes-termekek";

  if (opciok.termekTartokId) {
    termekTartok.id = opciok.termekTartokId;
  }

  szintezisReakcioTermekek(
    termekTartok,
    opciok.termekek ?? [],
    opciok.termekAzonositoElotag ?? "",
    Boolean(opciok.termekAdatok)
  );
  lepes.append(termekTartok);

  if (opciok.lepesekId) {
    const lepesek = document.createElement("div");
    lepesek.id = opciok.lepesekId;
    lepesek.append(lepes);
    utvonal.append(lepesek);
  } else {
    utvonal.append(lepes);
  }

  if (opciok.celAbraId || opciok.celFelirat || opciok.cel) {
    utvonal.append(
      szintezisReakcioMolekula(opciok.cel ?? null, {
        cel: true,
        felirat: opciok.celFelirat ?? "",
        abraId: opciok.celAbraId ?? "",
        nevId: opciok.celNevId ?? "",
      })
    );
  }

  if (opciok.gorgetes) {
    const keret = document.createElement("div");
    keret.className = "szintezis-reakciosor";
    keret.append(utvonal);
    megjelenites.append(keret);
  } else {
    megjelenites.append(utvonal);
  }

  return megjelenites;
}

function szintezisReakciosorKozepre() {
  const sor = document.querySelector(
    "#szintezis-kepernyo .szintezis-reakciosor"
  );

  if (!sor) {
    return;
  }

  sor.scrollLeft = 0;
}

function szintezisCelReferencia() {
  let referencia = document.getElementById("szintezis-cel-referencia");

  if (!referencia) {
    referencia = document.createElement("aside");
    referencia.id = "szintezis-cel-referencia";
    referencia.setAttribute("aria-label", "Elérendő célvegyület");
  }

  if (!referencia.querySelector(".szintezis-vegyulet")) {
    referencia.append(
      szintezisReakcioMolekula(null, {
        cel: true,
        felirat: "Elérendő célvegyület",
        abraId: "szintezis-cel-abra",
        nevId: "szintezis-cel-nev",
      })
    );
  }

  const sor = document.querySelector("#szintezis-kepernyo .szintezis-felso-sor");

  if (sor && referencia.parentElement !== sor) {
    sor.append(referencia);
  }

  szintezisCelNagyitasBekotese(referencia);
  return referencia;
}

function szintezisCelNagyitasBekotese(referencia) {
  const ablak = document.getElementById("szintezis-cel-nagyitas");

  if (referencia && referencia.dataset.nagyitas !== "1") {
    referencia.dataset.nagyitas = "1";
    referencia.tabIndex = 0;
    referencia.setAttribute("role", "button");
    referencia.setAttribute(
      "aria-label",
      "Elérendő célvegyület nagyított nézete"
    );
    referencia.addEventListener("click", szintezisCelNagyitasMegnyitasa);
    referencia.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      szintezisCelNagyitasMegnyitasa(event);
    });
  }

  if (!ablak || ablak.dataset.bekotve === "1") {
    return;
  }

  ablak.dataset.bekotve = "1";
  ablak.addEventListener("click", (event) => {
  event.stopPropagation();

  if (!event.target.closest("#szintezis-cel-nagyitas-abra svg")) {
    ablak.close();
  }
});
  ablak.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !ablak.open) {
      return;
    }

    event.preventDefault();
    ablak.close();
  });
}

function szintezisCelNagyitasMegnyitasa(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();

  const ablak = document.getElementById("szintezis-cel-nagyitas");
  const molekula = szintezisJatekAllapot.feladat?.celMolekula;

  if (!ablak || !molekula || ablak.open) {
    return;
  }

  szintezisMolekulaKirajzolasa(
    "szintezis-cel-nagyitas-abra",
    "szintezis-cel-nagyitas-nev",
    molekula,
    {
      rajzSzelesseg: 720,
      rajzMagassag: 480,
      meretaranyMaximum: 12,
      belsoMargo: 72,
    }
  );
  ablak.showModal();
}

function szintezisElsoLepesMegjelenitese() {
  const munkaterulet = document.getElementById("szintezis-munkaterulet");
  const nezet = szintezisNezetBiztositasa();

  if (!munkaterulet || !nezet) {
    return;
  }

  szintezisCelReferencia();
  szintezisNezetBeallitasa(0, 0, 1);

  nezet.replaceChildren(
    szintezisReakcioSor({
      interaktiv: true,
      panel: true,
      gorgetes: true,
      kiindulasiFelirat: "Kezdővegyület",
      kezdoAbraId: "szintezis-kezdo-abra",
      kezdoNevId: "szintezis-kezdo-nev",
      lepesekId: "szintezis-lepesek",
    })
  );

  const lepes = munkaterulet.querySelector(".szintezis-lepes");

  if (lepes) {
    szintezisLepesFejbe(lepes);
  }

  szintezisNyilFestettIgazitas();
  szintezisReakciosorKozepre();
  szintezisVegyuletPeldanyokJelolese(munkaterulet);

  const kezdo = munkaterulet.querySelector(
    ".szintezis-utvonal > .szintezis-vegyulet"
  );

  if (kezdo?.dataset.szintezisPeldany && lepes) {
    lepes.dataset.szintezisForras = kezdo.dataset.szintezisPeldany;
  }
}

function szintezisLepesCim() {
  const cim = document.createElement("h4");
  cim.className = "szintezis-reakcio-cim szintezis-reakcio-cim-rejtett";
  return cim;
}

function szintezisLepesFejbe(lepes) {
  if (!lepes || lepes.querySelector(".szintezis-lepes-fej")) {
    return;
  }

  const nyil = lepes.querySelector(".szintezis-nyil-egyseg");

  if (!nyil) {
    return;
  }

  const fej = document.createElement("div");
  fej.className = "szintezis-lepes-fej";
  fej.append(szintezisLepesCim(), nyil);
  lepes.prepend(fej);
}

function szintezisAktivLepes() {
  return document.querySelector("#szintezis-kepernyo .szintezis-lepes-aktiv");
}

function szintezisLepesSorszam(lepes) {
  const lepesek = [
    ...document.querySelectorAll("#szintezis-lepesek .szintezis-lepes"),
  ];
  const index = lepesek.indexOf(lepes);
  return index >= 0 ? index + 1 : lepesek.length + 1;
}

let szintezisJatekAllapot = {
  reakciok: [],
  kartyak: [],
  aktualisReakcio: null,
  kivalasztottKartya: null,
  kivalasztottFelirat: null,
  elhelyezettKartyak: {
    felso: null,
    also: null,
  },
  feladat: {
    kezdoMolekula: null,
    celMolekula: null,
  },
  celbaErt: false,
  letrejottTermekIds: [],
  ellenorizve: false,
  kivalasztottVegyuletPeldany: null,
  termekPoziciok: {},
  kartyaValasztek: {},
  lezartPont: 0,
  lejart: false,
};

async function szintezisReakciokBetoltese(oldal = 0) {
  const reakciok =
    await window.JatekAdatok.reakciokLekerdezese(oldal);

  szintezisJatekAllapot.reakciok = Array.isArray(reakciok)
    ? reakciok
    : [];

  return szintezisJatekAllapot.reakciok;
}

function szintezisKartyaFelirat(szoveg) {
  const alsoIndexek = "₀₁₂₃₄₅₆₇₈₉";

  return String(szoveg)
    .replace(/^cc\s+/i, "cc. ")
    .replace(/([A-Z][a-z]?|[)\]])(\d+)/g, (_egesz, elotte, szamok) =>
      elotte +
      [...szamok]
        .map((szam) => alsoIndexek[Number(szam)])
        .join("")
    );
}

function szintezisMezoLista(ertek) {
  if (Array.isArray(ertek)) {
    return ertek;
  }

  if (ertek == null || String(ertek).trim() === "") {
    return [];
  }

  return [ertek];
}

function szintezisReakcioBesorolas(reakcio) {
  return {
    felso: szintezisEgyediAnyagok([
      ...szintezisMezoLista(reakcio?.reagensek),
      ...szintezisMezoLista(reakcio?.katalizatorok),
    ]),
    also: szintezisEgyediAnyagok([
      ...szintezisMezoLista(reakcio?.oldoszerek),
      ...szintezisMezoLista(reakcio?.jatek_feltetelek),
      ...szintezisMezoLista(reakcio?.jatek_feny),
    ]),
  };
}

function szintezisOldalElvalaszto(oldal) {
  return oldal === "felso" ? " + " : " \u00b7 ";
}

function szintezisOldalKartya(osszetevok, oldal) {
  const lista = szintezisEgyediAnyagok(osszetevok);

  if (lista.length === 0) {
    return {
      ertek: SZINTEZIS_NINCS_KARTJA,
      kulcs: szintezisAnyagKulcs(SZINTEZIS_NINCS_KARTJA),
      felirat: SZINTEZIS_NINCS_KARTJA,
      ures: true,
    };
  }

  const elvalaszto = szintezisOldalElvalaszto(oldal);

  return {
    ertek: lista.join(elvalaszto),
    kulcs: lista
      .map((ertek) => szintezisAnyagKulcs(ertek))
      .sort()
      .join("\u001f"),
    felirat: lista.map((ertek) => szintezisKartyaFelirat(ertek)).join(elvalaszto),
    ures: false,
  };
}

function szintezisKartyaRekordja(tipusa, kartya) {
  return {
    tipusa,
    ertek: kartya.ertek,
    kulcs: kartya.kulcs,
    felirat: kartya.felirat,
  };
}

function szintezisKartyakOsszeallitasa(reakciok) {
  const kartyak = [];
  const latott = new Set();

  const hozzaad = (tipusa, oldal, osszetevok) => {
    const kartya = szintezisOldalKartya(osszetevok, oldal);
    const azonosito = `${tipusa}\0${kartya.kulcs}`;

    if (!kartya.kulcs || latott.has(azonosito)) {
      return;
    }

    latott.add(azonosito);
    kartyak.push(szintezisKartyaRekordja(tipusa, kartya));
  };

  for (const reakcio of Array.isArray(reakciok) ? reakciok : []) {
    const besorolas = szintezisReakcioBesorolas(reakcio);

    hozzaad("reagens", "felso", besorolas.felso);
    hozzaad("feltetel", "also", besorolas.also);
  }

  hozzaad("reagens", "felso", []);
  hozzaad("feltetel", "also", []);

  return kartyak;
}

function szintezisKartyakMegjelenitese(kartyak) {
  szintezisFolyamatbanLevoHuzasLezarasa();
  document.getElementById("szintezis-kartya-tartalek")?.replaceChildren();

  const listak = [
    ...document.querySelectorAll(
      "#szintezis-kepernyo .szintezis-kartya-lista"
    ),
  ];

  for (const lista of listak) {
    lista.replaceChildren();
  }

  for (const kartya of kartyak) {
    kartya.hely = "keszlet";
  }

  szintezisJatekAllapot.kartyak = kartyak;

  for (const kartya of kartyak) {
    const tartalom = listak.find(
      (lista) => lista.dataset.kartyaTipus === kartya.tipusa
    );

    if (!tartalom) {
      continue;
    }

    const gomb = document.createElement("button");
    gomb.type = "button";
    gomb.className = "szintezis-kartya";
    gomb.dataset.tipus = kartya.tipusa;
    gomb.dataset.ertek = kartya.ertek;
    gomb.dataset.szintezisKulcs = kartya.kulcs;
    gomb.draggable = false;
    gomb.textContent = kartya.felirat;
    gomb.setAttribute("aria-pressed", "false");
    gomb.setAttribute(
      "aria-label",
      szintezisKartyaAriaCimke(kartya.ertek, kartya.felirat)
    );
    tartalom.append(gomb);
  }

  const uresSzovegek = {
    reagens: "Nincs elérhető reagens.",
    feltetel: "Nincs elérhető körülmény.",
  };

  for (const lista of listak) {
    if (lista.childElementCount > 0) {
      continue;
    }

    const uzenet = document.createElement("p");
    uzenet.className = "szintezis-sav-uzenet";
    uzenet.textContent =
      uresSzovegek[lista.dataset.kartyaTipus] ??
      "Nincs megjeleníthető kártya.";
    lista.append(uzenet);
  }
}

const SZINTEZIS_HELY_FELIRAT = "Húzz ide egy kártyát";
const SZINTEZIS_KATTINTAS_FELIRAT = "Kattints ide a kártyával";
const SZINTEZIS_NINCS_KARTJA = "–";
const SZINTEZIS_NINCS_JELENTES = "Nincs";
const SZINTEZIS_HUZAS_KUSZOB = 8;
let szintezisAktivPointerId = null;
let szintezisAktivHuzas = null;
let szintezisHuzasUtaniKattintas = false;
let szintezisHuzasKattintasIdozito = 0;
let szintezisNezetX = 0;
let szintezisNezetY = 0;
let szintezisNezetMeret = 1;
const SZINTEZIS_NEZET_MIN = 0.4;
const SZINTEZIS_NEZET_MAX = 2.8;
const szintezisNezetMutatok = new Map();
let szintezisCsippentes = null;

function szintezisHelyFelirat() {
  return kattintasosAtomelhelyezes
    ? SZINTEZIS_KATTINTAS_FELIRAT
    : SZINTEZIS_HELY_FELIRAT;
}

function szintezisHelyFeliratokFrissitese() {
  const feliratok = new Set([
    SZINTEZIS_HELY_FELIRAT,
    SZINTEZIS_KATTINTAS_FELIRAT,
  ]);

  for (const hely of document.querySelectorAll(
    "#szintezis-kepernyo .szintezis-felso-hely, #szintezis-kepernyo .szintezis-also-hely"
  )) {
    if (
      hely.querySelector(".szintezis-kartya, .szintezis-lezart-felirat") ||
      !feliratok.has(hely.textContent.trim())
    ) {
      continue;
    }

    hely.textContent = szintezisHelyFelirat();
  }
}

function szintezisHuzasKattintasJeloles() {
  szintezisHuzasUtaniKattintas = true;
  window.clearTimeout(szintezisHuzasKattintasIdozito);
  szintezisHuzasKattintasIdozito = window.setTimeout(() => {
    szintezisHuzasUtaniKattintas = false;
  }, 700);
}

function szintezisHuzasKattintasTorlese() {
  szintezisHuzasUtaniKattintas = false;
  window.clearTimeout(szintezisHuzasKattintasIdozito);
}

function szintezisHuzasMegszakitasa({ kattintasElnyeles = false } = {}) {
  const huzas = szintezisAktivHuzas;
  szintezisAktivHuzas = null;
  szintezisAktivPointerId = null;
  huzas?.takaritas?.();
  document
    .querySelectorAll(".szintezis-huzas-masolat")
    .forEach((masolat) => masolat.remove());

  for (const elem of document.querySelectorAll(
    "#szintezis-kepernyo .szintezis-kartya-huzasban, #szintezis-kepernyo .szintezis-termek-huzasban"
  )) {
    elem.classList.remove(
      "szintezis-kartya-huzasban",
      "szintezis-termek-huzasban"
    );
  }

  szintezisHelyKiemelesTorlese();
  document
    .getElementById("szintezis-munkaterulet")
    ?.classList.remove("szintezis-nezet-huzasban");

  if (kattintasElnyeles && huzas?.elmozdult) {
    szintezisHuzasKattintasJeloles();
  }
}

function szintezisFolyamatbanLevoHuzasLezarasa() {
  szintezisHuzasMegszakitasa({
    kattintasElnyeles: Boolean(szintezisAktivHuzas?.elmozdult),
  });
}

function szintezisFuggoKijelolesTorlese() {
  const elmozdult = Boolean(szintezisAktivHuzas?.elmozdult);
  szintezisHuzasMegszakitasa({ kattintasElnyeles: elmozdult });

  if (!elmozdult) {
    szintezisHuzasKattintasTorlese();
  }

  for (const elem of document.querySelectorAll(
    "#szintezis-kepernyo [data-huzas-tortent]"
  )) {
    delete elem.dataset.huzasTortent;
  }

  szintezisKivalasztasTorlese();
}

function szintezisUjPointerEngedelyezett(event) {
  if (event.pointerType === "mouse" && event.button !== 0) {
    return false;
  }

  if (szintezisAktivPointerId === null) {
    return true;
  }

  if (szintezisAktivHuzas?.esemeny === event) {
    return false;
  }

  szintezisHuzasMegszakitasa();
  return true;
}

function szintezisHuzasFigyeloInditasa(elem, pointerId, kezelok) {
  function takaritas() {
    document.removeEventListener("pointermove", mozgas, true);
    document.removeEventListener("pointerup", felengedes, true);
    document.removeEventListener("pointercancel", megszakit, true);
    elem.removeEventListener("lostpointercapture", elveszett);

    try {
      if (elem.hasPointerCapture?.(pointerId)) {
        elem.releasePointerCapture(pointerId);
      }
    } catch (hiba) {
      console.warn("[SZINTÉZIS] A mutató elengedése nem sikerült.", hiba);
    }
  }

  function mozgas(e) {
    if (e.pointerId !== pointerId || szintezisAktivHuzas?.pointerId !== pointerId) {
      return;
    }

    if (!elem.isConnected) {
      szintezisFolyamatbanLevoHuzasLezarasa();
      return;
    }

    kezelok.mozgas(e);
  }

  function felengedes(e) {
    if (e.pointerId !== pointerId || szintezisAktivHuzas?.pointerId !== pointerId) {
      return;
    }

    szintezisAktivHuzas = null;
    szintezisAktivPointerId = null;
    takaritas();
    kezelok.felengedes(e);
  }

  function megszakit(e) {
    if (e.pointerId !== pointerId || szintezisAktivHuzas?.pointerId !== pointerId) {
      return;
    }

    szintezisFolyamatbanLevoHuzasLezarasa();
  }

  function elveszett(e) {
    if (e.pointerId !== pointerId || szintezisAktivHuzas?.pointerId !== pointerId) {
      return;
    }

    if (elem.isConnected) {
      return;
    }

    szintezisFolyamatbanLevoHuzasLezarasa();
  }

  document.addEventListener("pointermove", mozgas, { passive: false, capture: true });
  document.addEventListener("pointerup", felengedes, true);
  document.addEventListener("pointercancel", megszakit, true);
  elem.addEventListener("lostpointercapture", elveszett);

  try {
    elem.setPointerCapture(pointerId);
  } catch (hiba) {
    console.warn("[SZINTÉZIS] A mutató rögzítése nem sikerült.", hiba);
  }

  szintezisAktivPointerId = pointerId;
  szintezisAktivHuzas = {
    pointerId,
    elem,
    takaritas,
    elmozdult: false,
  };
}

function szintezisHuzasElmozdult(pointerId) {
  if (szintezisAktivHuzas?.pointerId === pointerId) {
    szintezisAktivHuzas.elmozdult = true;
  }
}

function szintezisKivalasztasMegjelenitese() {
  const kepernyo = document.getElementById("szintezis-kepernyo");
  const kivalasztott = szintezisJatekAllapot.kivalasztottKartya;
  const felirat = szintezisJatekAllapot.kivalasztottFelirat;

  if (felirat && !felirat.isConnected) {
    szintezisJatekAllapot.kivalasztottFelirat = null;
  }

  const aktivFelirat = szintezisJatekAllapot.kivalasztottFelirat;
  kepernyo?.classList.toggle(
    "szintezis-reagens-kivalasztva",
    kivalasztott?.tipusa === "reagens"
  );
  kepernyo?.classList.toggle(
    "szintezis-feltetel-kivalasztva",
    kivalasztott?.tipusa === "feltetel"
  );
  kepernyo?.classList.toggle(
    "szintezis-felirat-reagens",
    aktivFelirat?.dataset.tipus === "reagens"
  );
  kepernyo?.classList.toggle(
    "szintezis-felirat-feltetel",
    aktivFelirat?.dataset.tipus === "feltetel"
  );

  const kartyak = document.querySelectorAll(
    "#szintezis-kepernyo .szintezis-kartya"
  );

  for (const gomb of kartyak) {
    const aktiv = Boolean(
      kivalasztott &&
        gomb.dataset.ertek === kivalasztott.ertek &&
        gomb.dataset.tipus === kivalasztott.tipusa
    );
    gomb.classList.toggle("szintezis-kartya-kivalasztva", aktiv);
    gomb.setAttribute("aria-pressed", aktiv ? "true" : "false");
  }

  for (const elem of document.querySelectorAll(
    "#szintezis-kepernyo .szintezis-lezart-felirat"
  )) {
    const aktiv = elem === szintezisJatekAllapot.kivalasztottFelirat;
    elem.classList.toggle("szintezis-felirat-kivalasztva", aktiv);
    elem.setAttribute("aria-pressed", aktiv ? "true" : "false");
  }
}

function szintezisValasztasokAlaphelyzete() {
  szintezisFolyamatbanLevoHuzasLezarasa();
  szintezisJatekAllapot.kivalasztottKartya = null;
  szintezisJatekAllapot.kivalasztottFelirat = null;
  szintezisJatekAllapot.elhelyezettKartyak = {
    felso: null,
    also: null,
  };

  for (const kartya of szintezisJatekAllapot.kartyak) {
    kartya.hely = "keszlet";
  }

  szintezisKivalasztasMegjelenitese();
  szintezisEllenorzesEredmenyTorlese();
  szintezisVegyuletKijelolesTorlese();
  szintezisJatekAllapot.celbaErt = false;
  szintezisJatekAllapot.letrejottTermekIds = [];
  szintezisJatekAllapot.termekPoziciok = {};
  szintezisJatekAllapot.kartyaValasztek = {};
  document.getElementById("szintezis-kartya-tartalek")?.replaceChildren();
}

function szintezisUresFeladat() {
  return {
    kezdoMolekula: null,
    celMolekula: null,
  };
}

function szintezisFeladatTorlese() {
  szintezisJatekAllapot.feladat = szintezisUresFeladat();
}

function szintezisKartyaAdat(elem) {
  return {
    ertek: elem.dataset.ertek,
    tipusa: elem.dataset.tipus,
    kulcs: elem.dataset.szintezisKulcs || "",
  };
}

function szintezisKartyaKulcsa(adat) {
  if (adat?.kulcs) {
    return adat.kulcs;
  }

  const rekord = szintezisKartyaRekord(adat);

  if (rekord?.kulcs) {
    return rekord.kulcs;
  }

  if (!adat?.ertek) {
    return "";
  }

  return szintezisAnyagKulcs(adat.ertek);
}

function szintezisHelyOldala(hely) {
  if (hely.classList.contains("szintezis-felso-hely")) {
    return "felso";
  }

  if (hely.classList.contains("szintezis-also-hely")) {
    return "also";
  }

  return null;
}

function szintezisMegoldatlanNyilLathato(lepes) {
  if (
    !lepes ||
    lepes.classList.contains("szintezis-lepes-kesz") ||
    !lepes.classList.contains("szintezis-lepes-aktiv")
  ) {
    return false;
  }

  const forras = lepes.dataset.szintezisForras;

  return Boolean(
    forras && forras === szintezisJatekAllapot.kivalasztottVegyuletPeldany
  );
}

function szintezisLepesFejLathato(lepes) {
  if (!lepes) {
    return false;
  }

  if (lepes.classList.contains("szintezis-lepes-kesz")) {
    return true;
  }

  return szintezisMegoldatlanNyilLathato(lepes);
}

function szintezisDobasHelyLathato(hely) {
  if (!szintezisMegoldatlanNyilLathato(hely?.closest(".szintezis-lepes"))) {
    return false;
  }

  if (hely.hidden || hely.closest("[hidden]")) {
    return false;
  }

  const stilus = getComputedStyle(hely);

  return (
    stilus.display !== "none" &&
    stilus.visibility !== "hidden" &&
    hely.getClientRects().length > 0
  );
}

function szintezisHelyElfogadja(hely, tipusa) {
  if (
    !szintezisDobasHelyLathato(hely) ||
    hely.closest("[data-szintezis-olvasas]")
  ) {
    return false;
  }

  const oldal = szintezisHelyOldala(hely);

  if (oldal === "felso") {
    return tipusa === "reagens";
  }

  if (oldal === "also") {
    return tipusa === "feltetel";
  }

  return false;
}

function szintezisKartyaElem(adat) {
  if (!adat?.ertek || !adat.tipusa) {
    return null;
  }

  for (const gomb of document.querySelectorAll(
    "#szintezis-kepernyo .szintezis-kartya"
  )) {
    if (
      gomb.dataset.ertek === adat.ertek &&
      gomb.dataset.tipus === adat.tipusa
    ) {
      return gomb;
    }
  }

  return null;
}

function szintezisKartyaRekord(adat) {
  return szintezisJatekAllapot.kartyak.find(
    (kartya) =>
      kartya.ertek === adat?.ertek &&
      kartya.tipusa === adat?.tipusa
  ) ?? null;
}

function szintezisKartyaGomb(cel) {
  const gomb = cel?.closest?.(".szintezis-kartya");

  if (!gomb?.closest("#szintezis-kepernyo")) {
    return null;
  }

  return gomb;
}

function szintezisFeliratElem(cel) {
  const felirat = cel?.closest?.(".szintezis-lezart-felirat");

  if (!felirat?.closest("#szintezis-kepernyo")) {
    return null;
  }

  return felirat;
}

function szintezisLepesErtekKulcsok(oldal) {
  if (oldal === "felso") {
    return ["szintezisFelsoErtek", "szintezisFelsoTipus", "szintezisFelsoKulcs"];
  }

  if (oldal === "also") {
    return ["szintezisAlsoErtek", "szintezisAlsoTipus", "szintezisAlsoKulcs"];
  }

  return null;
}

function szintezisLepesTaroltErtek(lepes, oldal) {
  const kulcsok = szintezisLepesErtekKulcsok(oldal);

  if (!lepes || !kulcsok) {
    return null;
  }

  const ertek = lepes.dataset[kulcsok[0]];
  const tipusa = lepes.dataset[kulcsok[1]];
  const kulcs = lepes.dataset[kulcsok[2]] || "";

  if (!ertek || !tipusa) {
    return null;
  }

  return { ertek, tipusa, kulcs };
}

function szintezisLepesTaroltErtekBeallitasa(lepes, oldal, adat) {
  const kulcsok = szintezisLepesErtekKulcsok(oldal);

  if (!lepes || !kulcsok) {
    return;
  }

  if (!adat?.ertek || !adat.tipusa) {
    delete lepes.dataset[kulcsok[0]];
    delete lepes.dataset[kulcsok[1]];
    delete lepes.dataset[kulcsok[2]];
    return;
  }

  lepes.dataset[kulcsok[0]] = adat.ertek;
  lepes.dataset[kulcsok[1]] = adat.tipusa;
  lepes.dataset[kulcsok[2]] = szintezisKartyaKulcsa(adat);
}

function szintezisFeliratBeillesztese(hely, adat) {
  const lepes = hely.closest(".szintezis-lepes");
  const oldal = szintezisHelyOldala(hely);

  if (!lepes || !oldal || !adat?.ertek || !adat.tipusa) {
    return null;
  }

  szintezisLepesTaroltErtekBeallitasa(lepes, oldal, adat);

  const felirat = document.createElement("button");
  felirat.type = "button";
  felirat.className = "szintezis-lezart-felirat";
  const rekord = szintezisKartyaRekord(adat);

  felirat.dataset.ertek = adat.ertek;
  felirat.dataset.tipus = adat.tipusa;
  felirat.dataset.szintezisKulcs = szintezisKartyaKulcsa(adat);
  felirat.draggable = false;
  felirat.textContent = rekord?.felirat || szintezisKartyaFelirat(adat.ertek);
  felirat.setAttribute("aria-pressed", "false");
  felirat.setAttribute(
    "aria-label",
    szintezisKartyaAriaCimke(adat.ertek, felirat.textContent)
  );
  hely.replaceChildren(felirat);
  hely.classList.add("szintezis-hely-teli");
  return felirat;
}

function szintezisFeliratKivalasztasa(felirat) {
  const jelenlegi = szintezisJatekAllapot.kivalasztottFelirat;
  szintezisJatekAllapot.kivalasztottKartya = null;
  szintezisJatekAllapot.kivalasztottFelirat =
    jelenlegi === felirat ? null : felirat;
  szintezisKivalasztasMegjelenitese();
}

function szintezisFeliratEltavolitasa(felirat) {
  if (szintezisJatekLeallt()) {
    return false;
  }

  const hely = felirat?.closest(
    ".szintezis-felso-hely, .szintezis-also-hely"
  );
  const lepes = felirat?.closest(".szintezis-lepes");
  const oldal = hely ? szintezisHelyOldala(hely) : null;
  const lezart = Boolean(lepes?.classList.contains("szintezis-lepes-kesz"));

  if (!felirat || !hely || !lepes || !oldal) {
    return false;
  }

  szintezisLepesTaroltErtekBeallitasa(lepes, oldal, null);
  felirat.remove();
  hely.classList.remove("szintezis-hely-teli");
  hely.replaceChildren(document.createTextNode(szintezisHelyFelirat()));

  if (szintezisJatekAllapot.kivalasztottFelirat === felirat) {
    szintezisJatekAllapot.kivalasztottFelirat = null;
    szintezisKivalasztasMegjelenitese();
  }

  if (lezart) {
    szintezisLezartLepesMegnyitasa(lepes);
    return true;
  }

  if (lepes.classList.contains("szintezis-lepes-aktiv")) {
    szintezisReakcioFrissitese();
  }

  return true;
}

function szintezisKeszletLista(tipusa) {
  return document.querySelector(
    `#szintezis-kepernyo .szintezis-kartya-lista[data-kartya-tipus="${tipusa}"]`
  );
}

function szintezisKeszletUzenetFrissitese(tipusa) {
  const lista = szintezisKeszletLista(tipusa);

  if (!lista) {
    return;
  }

  const vanKartya = Boolean(lista.querySelector(".szintezis-kartya"));
  const letezik = szintezisJatekAllapot.kartyak.some(
    (kartya) => kartya.tipusa === tipusa
  );
  const uzenet = lista.querySelector(".szintezis-sav-uzenet");

  if (vanKartya || letezik) {
    uzenet?.remove();
    return;
  }

  if (uzenet) {
    return;
  }

  const szovegek = {
    reagens: "Nincs elérhető reagens.",
    feltetel: "Nincs elérhető körülmény.",
  };
  const elem = document.createElement("p");
  elem.className = "szintezis-sav-uzenet";
  elem.textContent =
    szovegek[tipusa] ?? "Nincs megjeleníthető kártya.";
  lista.append(elem);
}

function szintezisSlotKeretUritese(hely) {
  const oldal = szintezisHelyOldala(hely);

  if (oldal) {
    szintezisJatekAllapot.elhelyezettKartyak[oldal] = null;
  }

  hely.classList.remove("szintezis-hely-teli");

  if (!hely.querySelector(".szintezis-kartya")) {
    hely.replaceChildren(document.createTextNode(szintezisHelyFelirat()));
  }
}

function szintezisKartyaKeszletbe(gomb, frissites = true) {
  const lista = szintezisKeszletLista(gomb.dataset.tipus);

  if (!lista || gomb.parentElement === lista) {
    return false;
  }

  const forrasSlot = gomb.closest(
    ".szintezis-felso-hely, .szintezis-also-hely"
  );
  const lezartLepes =
    forrasSlot?.closest(".szintezis-lepes.szintezis-lepes-kesz") ?? null;
  const rekord = szintezisKartyaRekord(szintezisKartyaAdat(gomb));

  if (
    gomb.closest(".szintezis-felso-hely, .szintezis-also-hely") &&
    szintezisJatekLeallt()
  ) {
    return false;
  }

  lista.querySelector(".szintezis-sav-uzenet")?.remove();
  szintezisKartyaTartalek().append(gomb);

  if (rekord) {
    rekord.hely = "keszlet";
  }

  if (forrasSlot) {
    szintezisSlotKeretUritese(forrasSlot);
  }

  szintezisValasztekLathatosagFrissitese();

  if (lezartLepes) {
    szintezisLezartLepesMegnyitasa(lezartLepes);
  } else if (frissites) {
    szintezisReakcioFrissitese();
  }

  return true;
}

function szintezisKartyaAktualisValasztekban(kartya) {
  const peldany = szintezisJatekAllapot.kivalasztottVegyuletPeldany;
  const valasztek = peldany
    ? szintezisJatekAllapot.kartyaValasztek?.[peldany]
    : null;
  const ertekek =
    kartya?.tipusa === "reagens"
      ? valasztek?.reagens
      : kartya?.tipusa === "feltetel"
        ? valasztek?.feltetel
        : null;

  if (!kartya?.ertek || !ertekek) {
    return false;
  }

  const kulcs = szintezisKartyaKulcsa(kartya);

  return ertekek.some(
    (ertek) => szintezisKartyaKulcsa({ tipusa: kartya.tipusa, ertek }) === kulcs
  );
}

function szintezisKartyaElerheto(gomb) {
  const lista = szintezisKeszletLista(gomb?.dataset.tipus);

  return Boolean(lista && gomb.parentElement === lista);
}

function szintezisKartyaElhelyezese(hely, kartya) {
  if (szintezisJatekLeallt()) {
    return false;
  }

  if (!kartya?.ertek || !szintezisHelyElfogadja(hely, kartya.tipusa)) {
    return false;
  }

  const gomb = szintezisKartyaElem(kartya);
  const rekord = szintezisKartyaRekord(kartya);
  const oldal = szintezisHelyOldala(hely);

  if (!gomb || !rekord || !oldal) {
    return false;
  }

  if (gomb.parentElement === hely) {
    return true;
  }

  if (
    !szintezisKartyaAktualisValasztekban(kartya) ||
    !szintezisKartyaElerheto(gomb)
  ) {
    return false;
  }

  const bent = hely.querySelector(".szintezis-kartya");

  if (bent && bent !== gomb) {
    szintezisKartyaKeszletbe(bent, false);
  }

  const forrasSlot = gomb.closest(
    ".szintezis-felso-hely, .szintezis-also-hely"
  );
  const lezartLepes =
    forrasSlot && forrasSlot !== hely
      ? forrasSlot.closest(".szintezis-lepes.szintezis-lepes-kesz")
      : null;

  hely.replaceChildren(gomb);
  hely.classList.add("szintezis-hely-teli");

  if (forrasSlot && forrasSlot !== hely) {
    szintezisSlotKeretUritese(forrasSlot);
  }

  rekord.hely = oldal;
  szintezisJatekAllapot.elhelyezettKartyak[oldal] = {
    ertek: rekord.ertek,
    tipusa: rekord.tipusa,
  };
  szintezisLepesTaroltErtekBeallitasa(hely.closest(".szintezis-lepes"), oldal, null);
  szintezisKeszletUzenetFrissitese(rekord.tipusa);

  if (lezartLepes) {
    szintezisLezartLepesMegnyitasa(lezartLepes);
    return true;
  }

  szintezisReakcioFrissitese();
  return true;
}

const SZINTEZIS_LERAKAS_TURAS = 12;

function szintezisPontTeglalapTavolsaga(x, y, teglalap) {
  const vizszintes = Math.max(teglalap.left - x, 0, x - teglalap.right);
  const fuggoleges = Math.max(teglalap.top - y, 0, y - teglalap.bottom);
  return Math.hypot(vizszintes, fuggoleges);
}

function szintezisKozeliDobasHely(x, y) {
  let legkozelebbi = null;
  let legkisebbTav = Infinity;

  for (const hely of document.querySelectorAll(
    "#szintezis-kepernyo .szintezis-felso-hely, #szintezis-kepernyo .szintezis-also-hely"
  )) {
    if (
      !szintezisDobasHelyLathato(hely) ||
      hely.closest("[data-szintezis-olvasas]")
    ) {
      continue;
    }

    const tav = szintezisPontTeglalapTavolsaga(
      x,
      y,
      hely.getBoundingClientRect()
    );

    if (tav > SZINTEZIS_LERAKAS_TURAS || tav >= legkisebbTav) {
      continue;
    }

    legkisebbTav = tav;
    legkozelebbi = hely;
  }

  return legkozelebbi;
}

function szintezisDobasCel(x, y, tipusa) {
  const cel = document.elementFromPoint(x, y);

  if (!cel?.closest?.("#szintezis-kepernyo")) {
    return null;
  }

  const hely = szintezisKozeliDobasHely(x, y);

  if (hely) {
    return {
      fajta: "hely",
      elem: hely,
      ervenyes: szintezisHelyElfogadja(hely, tipusa),
    };
  }

  const sav = cel.closest(".szintezis-kartya-sav");
  const lista =
    cel.closest(".szintezis-kartya-lista") ??
    sav?.querySelector(".szintezis-kartya-lista");

  if (!lista) {
    return null;
  }

  return {
    fajta: "keszlet",
    elem: lista,
    ervenyes: lista.dataset.kartyaTipus === tipusa,
  };
}

function szintezisKartyaAthelyezese(adat, cel) {
  if (!cel?.ervenyes) {
    return false;
  }

  if (cel.fajta === "hely") {
    return szintezisKartyaElhelyezese(cel.elem, adat);
  }

  if (cel.fajta === "keszlet") {
    const gomb = szintezisKartyaElem(adat);
    return gomb ? szintezisKartyaKeszletbe(gomb) : false;
  }

  return false;
}

function szintezisHelyKiemelesTorlese() {
  for (const hely of document.querySelectorAll(
    "#szintezis-kepernyo .szintezis-hely-cel, #szintezis-kepernyo .szintezis-hely-ervenytelen"
  )) {
    hely.classList.remove(
      "szintezis-hely-cel",
      "szintezis-hely-ervenytelen"
    );
  }
}

function szintezisKartyaKivalasztasa(gomb) {
  const adat = szintezisKartyaAdat(gomb);
  const jelenlegi = szintezisJatekAllapot.kivalasztottKartya;
  szintezisJatekAllapot.kivalasztottFelirat = null;

  if (
    jelenlegi &&
    jelenlegi.ertek === adat.ertek &&
    jelenlegi.tipusa === adat.tipusa
  ) {
    szintezisJatekAllapot.kivalasztottKartya = null;
  } else {
    szintezisJatekAllapot.kivalasztottKartya = adat;
  }

  szintezisKivalasztasMegjelenitese();
}

function szintezisKartyaLepesenekKijelolese(gomb) {
  const kartyaLepes = gomb?.closest?.("#szintezis-kepernyo .szintezis-lepes");
  const forrasId = kartyaLepes?.dataset.szintezisForras;

  if (
    !forrasId ||
    szintezisJatekAllapot.kivalasztottVegyuletPeldany === forrasId
  ) {
    return;
  }

  const forras = szintezisPeldanyDoboz(forrasId);

  if (forras) {
    szintezisVegyuletKijelolese(forras);
  }
}

function szintezisPointerDown(event) {
  if (
    szintezisNezetKetMutato() ||
    kattintasosAtomelhelyezes ||
    !szintezisUjPointerEngedelyezett(event)
  ) {
    return;
  }

  const gomb =
    szintezisKartyaGomb(event.target) ?? szintezisFeliratElem(event.target);
  const felirat = gomb?.classList.contains("szintezis-lezart-felirat");

  if (!gomb) {
    return;
  }

  szintezisKartyaLepesenekKijelolese(gomb);

  const pointerId = event.pointerId;
  const kezdX = event.clientX;
  const kezdY = event.clientY;
  let huzva = false;
  let masolat = null;

  function masolatMozgatasa(x, y) {
    if (!masolat) {
      return;
    }

    masolat.style.left = `${x}px`;
    masolat.style.top = `${y}px`;
  }

  function huzastFrissit(e) {
    const tav = Math.hypot(e.clientX - kezdX, e.clientY - kezdY);

    if (!huzva && tav >= SZINTEZIS_HUZAS_KUSZOB) {
      huzva = true;
      szintezisHuzasElmozdult(pointerId);
      masolat = document.createElement("div");
      masolat.className = "szintezis-huzas-masolat";
      masolat.textContent = gomb.textContent;
      document.body.append(masolat);
      gomb.classList.add("szintezis-kartya-huzasban");
    }

    if (!huzva) {
      return;
    }

    if (e.cancelable) {
      e.preventDefault();
    }

    masolatMozgatasa(e.clientX, e.clientY);
    szintezisHelyKiemelesTorlese();
    const cel = szintezisDobasCel(e.clientX, e.clientY, gomb.dataset.tipus);

    if (!cel?.elem) {
      return;
    }

    cel.elem.classList.add(
      cel.ervenyes ? "szintezis-hely-cel" : "szintezis-hely-ervenytelen"
    );
  }

  function huzasTakaritasa() {
    szintezisHelyKiemelesTorlese();
    masolat?.remove();
    masolat = null;
    gomb.classList.remove("szintezis-kartya-huzasban");
  }

  szintezisHuzasFigyeloInditasa(gomb, pointerId, {
    mozgas: huzastFrissit,
    felengedes(e) {
      if (gomb.isConnected) {
        huzastFrissit(e);
      }

      const tortentHuzas = huzva;
      huzasTakaritasa();

      if (!tortentHuzas || !gomb.isConnected) {
        if (tortentHuzas) {
          szintezisHuzasKattintasJeloles();
        }

        return;
      }

      szintezisHuzasKattintasJeloles();
      gomb.dataset.huzasTortent = "1";
      const cel = szintezisDobasCel(e.clientX, e.clientY, gomb.dataset.tipus);

      if (felirat) {
        if (cel?.ervenyes && cel.fajta === "keszlet") {
          szintezisFeliratEltavolitasa(gomb);
        }

        return;
      }

      if (
        cel?.ervenyes &&
        szintezisKartyaAthelyezese(szintezisKartyaAdat(gomb), cel)
      ) {
        szintezisJatekAllapot.kivalasztottKartya = null;
        szintezisKivalasztasMegjelenitese();
      }
    },
  });

  if (szintezisAktivHuzas?.pointerId === pointerId) {
    szintezisAktivHuzas.esemeny = event;
  }
}

function szintezisKivalasztasTorlese() {
  szintezisJatekAllapot.kivalasztottKartya = null;
  szintezisJatekAllapot.kivalasztottFelirat = null;
  szintezisKivalasztasMegjelenitese();
}

function szintezisKattintas(event) {
  if (!kattintasosAtomelhelyezes) {
    return;
  }

  const felirat = szintezisFeliratElem(event.target);

  if (felirat) {
    if (felirat.dataset.huzasTortent === "1") {
      delete felirat.dataset.huzasTortent;
      return;
    }

    szintezisKartyaLepesenekKijelolese(felirat);
    szintezisFeliratKivalasztasa(felirat);
    return;
  }

  const gomb = szintezisKartyaGomb(event.target);

  if (gomb) {
    if (gomb.dataset.huzasTortent === "1") {
      delete gomb.dataset.huzasTortent;
      return;
    }

    szintezisKartyaLepesenekKijelolese(gomb);
    const kivalasztott = szintezisJatekAllapot.kivalasztottKartya;
    const adat = szintezisKartyaAdat(gomb);
    const ugyanaz = Boolean(
      kivalasztott &&
        kivalasztott.ertek === adat.ertek &&
        kivalasztott.tipusa === adat.tipusa
    );
    const slot = gomb.closest(
      ".szintezis-felso-hely, .szintezis-also-hely"
    );

    if (
      kivalasztott &&
      !ugyanaz &&
      slot &&
      szintezisKartyaElhelyezese(slot, kivalasztott)
    ) {
      szintezisKivalasztasTorlese();
      return;
    }

    szintezisKartyaKivalasztasa(gomb);
    return;
  }

  const kivalasztottFelirat = szintezisJatekAllapot.kivalasztottFelirat;

  if (kivalasztottFelirat?.isConnected) {
    const feliratSav = event.target.closest?.(".szintezis-kartya-sav");
    const feliratLista = feliratSav?.querySelector(".szintezis-kartya-lista");

    if (
      feliratLista &&
      feliratLista.dataset.kartyaTipus === kivalasztottFelirat.dataset.tipus
    ) {
      szintezisFeliratEltavolitasa(kivalasztottFelirat);
    }

    return;
  }

  const kivalasztott = szintezisJatekAllapot.kivalasztottKartya;

  if (!kivalasztott) {
    return;
  }

  const hely = event.target.closest?.(
    ".szintezis-felso-hely, .szintezis-also-hely"
  );

  if (hely?.closest("#szintezis-kepernyo")) {
    if (szintezisKartyaElhelyezese(hely, kivalasztott)) {
      szintezisKivalasztasTorlese();
    }

    return;
  }

  const sav = event.target.closest?.(".szintezis-kartya-sav");
  const lista = sav?.querySelector(".szintezis-kartya-lista");

  if (
    !lista ||
    lista.dataset.kartyaTipus !== kivalasztott.tipusa
  ) {
    return;
  }

  const kivalasztottGomb = szintezisKartyaElem(kivalasztott);

  if (
    kivalasztottGomb &&
    szintezisKartyaKeszletbe(kivalasztottGomb)
  ) {
    szintezisKivalasztasTorlese();
  }
}

function szintezisKartyaInterakcioBekotese() {
  const kepernyo = document.getElementById("szintezis-kepernyo");

  if (!kepernyo || kepernyo.dataset.kartyaInterakcio === "1") {
    return;
  }

  kepernyo.dataset.kartyaInterakcio = "1";
  kepernyo.addEventListener(
    "click",
    (event) => {
      if (!szintezisHuzasUtaniKattintas) {
        return;
      }

      const jelolt = event.target?.closest?.("[data-huzas-tortent]");

      if (jelolt) {
        delete jelolt.dataset.huzasTortent;
      }

      szintezisHuzasKattintasTorlese();
      event.preventDefault();
      event.stopPropagation();
    },
    true
  );
  kepernyo.addEventListener("pointerdown", szintezisPointerDown);
  kepernyo.addEventListener("pointerdown", szintezisTermekPointerDown);
  document
    .getElementById("szintezis-munkaterulet")
    ?.addEventListener("pointerdown", szintezisNezetMutatoLe, true);
  document
    .getElementById("szintezis-munkaterulet")
    ?.addEventListener("pointerdown", szintezisNezetMozgatasInditasa);
  document
    .getElementById("szintezis-munkaterulet")
    ?.addEventListener("wheel", szintezisNezetGorgetese, { passive: false });
  document.addEventListener("pointermove", szintezisNezetMutatoMozgas, {
    capture: true,
    passive: false,
  });
  document.addEventListener("pointerup", szintezisNezetMutatoFel, true);
  document.addEventListener("pointercancel", szintezisNezetMutatoFel, true);
  kepernyo.addEventListener("click", szintezisKattintas);
  kepernyo.addEventListener("click", szintezisVegyuletKattintas);
  kepernyo.addEventListener("contextmenu", szintezisTermekMenu);
  window.addEventListener("blur", () => {
    if (szintezisAktivPointerId !== null) {
      szintezisFolyamatbanLevoHuzasLezarasa();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (
      document.visibilityState === "hidden" &&
      szintezisAktivPointerId !== null
    ) {
      szintezisFolyamatbanLevoHuzasLezarasa();
    }
  });
}

let szintezisVegyuletPeldanySzamlalo = 0;

function szintezisVegyuletPeldanyokJelolese(gyoker) {
  if (!gyoker?.querySelectorAll) {
    return;
  }

  const dobozok = gyoker.querySelectorAll(
    ":scope .szintezis-vegyulet:not(.szintezis-cel), :scope .szintezis-termek"
  );

  for (const doboz of dobozok) {
    if (
      !doboz.closest("#szintezis-kepernyo") ||
      doboz.dataset.szintezisPeldany
    ) {
      continue;
    }

    szintezisVegyuletPeldanySzamlalo += 1;
    doboz.dataset.szintezisPeldany = String(
      szintezisVegyuletPeldanySzamlalo
    );
  }
}

function szintezisKijelolhetoVegyulet(cel) {
  const doboz = cel?.closest?.(
    "#szintezis-kepernyo .szintezis-vegyulet, #szintezis-kepernyo .szintezis-termek"
  );

  if (
    !doboz ||
    doboz.classList.contains("szintezis-cel") ||
    !doboz.dataset.szintezisPeldany
  ) {
    return null;
  }

  return doboz;
}

function szintezisUresMunkafelulet(cel) {
  if (!cel?.closest?.("#szintezis-munkaterulet")) {
    return false;
  }

  return !cel.closest(
    ".szintezis-vegyulet, .szintezis-termek, .szintezis-nyil-egyseg, .szintezis-reakcio-cim, .szintezis-kartya, button, a"
  );
}

function szintezisNezetElem() {
  return (
    document.getElementById("szintezis-nezet") ??
    document.getElementById("szintezis-munkaterulet")
  );
}

function szintezisNezetBiztositasa() {
  const munka = document.getElementById("szintezis-munkaterulet");

  if (!munka) {
    return null;
  }

  let nezet = document.getElementById("szintezis-nezet");

  if (!nezet) {
    nezet = document.createElement("div");
    nezet.id = "szintezis-nezet";
  }

  if (nezet.parentElement !== munka) {
    munka.append(nezet);
  }

  return nezet;
}

function szintezisNezetArany() {
  return szintezisNezetMeret || 1;
}

function szintezisNezetBeallitasa(x, y, meret = szintezisNezetMeret) {
  szintezisNezetX = x;
  szintezisNezetY = y;
  szintezisNezetMeret = Math.min(
    SZINTEZIS_NEZET_MAX,
    Math.max(SZINTEZIS_NEZET_MIN, meret || 1)
  );
  const nezet = document.getElementById("szintezis-nezet");
  const munka = document.getElementById("szintezis-munkaterulet");
  const racs = 32 * szintezisNezetMeret;

  if (nezet) {
    nezet.style.transformOrigin = "0 0";
    nezet.style.transform = `translate(${x}px, ${y}px) scale(${szintezisNezetMeret})`;
  }

  if (munka) {
    munka.style.backgroundPosition = `${x}px ${y}px`;
    munka.style.backgroundSize = `${racs}px ${racs}px`;
  }
}

function szintezisNezetNagyitasa(meret, clientX, clientY) {
  const munka = document.getElementById("szintezis-munkaterulet");

  if (!munka) {
    return;
  }

  const keret = munka.getBoundingClientRect();
  const regi = szintezisNezetArany();
  const uj = Math.min(
    SZINTEZIS_NEZET_MAX,
    Math.max(SZINTEZIS_NEZET_MIN, meret)
  );
  const helyiX = (clientX - keret.left - szintezisNezetX) / regi;
  const helyiY = (clientY - keret.top - szintezisNezetY) / regi;

  szintezisNezetBeallitasa(
    clientX - keret.left - helyiX * uj,
    clientY - keret.top - helyiY * uj,
    uj
  );
}

function szintezisNezetKetMutato() {
  return Boolean(szintezisCsippentes) || szintezisNezetMutatok.size > 1;
}

function szintezisNezetCsippentesEngedelyezett() {
  const huzas = szintezisAktivHuzas;
  const munka = document.getElementById("szintezis-munkaterulet");

  return !huzas || huzas.elem === munka;
}

function szintezisNezetMutatoLe(event) {
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }

  if (!event.target?.closest?.("#szintezis-munkaterulet")) {
    return;
  }

  szintezisNezetMutatok.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
  });

  if (
    szintezisNezetMutatok.size < 2 ||
    !szintezisNezetCsippentesEngedelyezett()
  ) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  szintezisNezetCsippentesInditasa();
}

function szintezisNezetCsippentesInditasa() {
  if (szintezisCsippentes || szintezisNezetMutatok.size < 2) {
    return;
  }

  const elmozdult = Boolean(szintezisAktivHuzas?.elmozdult);

  if (szintezisAktivHuzas) {
    szintezisHuzasMegszakitasa({ kattintasElnyeles: false });
  }

  const mutatok = [...szintezisNezetMutatok.values()];
  const elso = mutatok[0];
  const masodik = mutatok[1];

  szintezisCsippentes = {
    tav: Math.max(1, Math.hypot(masodik.x - elso.x, masodik.y - elso.y)),
    kozepX: (elso.x + masodik.x) / 2,
    kozepY: (elso.y + masodik.y) / 2,
    meret: szintezisNezetArany(),
    x: szintezisNezetX,
    y: szintezisNezetY,
    elmozdult,
  };
}

function szintezisNezetCsippentesFrissitese() {
  if (!szintezisCsippentes || szintezisNezetMutatok.size < 2) {
    return;
  }

  const munka = document.getElementById("szintezis-munkaterulet");

  if (!munka) {
    return;
  }

  const mutatok = [...szintezisNezetMutatok.values()];
  const elso = mutatok[0];
  const masodik = mutatok[1];
  const tav = Math.max(1, Math.hypot(masodik.x - elso.x, masodik.y - elso.y));
  const kozepX = (elso.x + masodik.x) / 2;
  const kozepY = (elso.y + masodik.y) / 2;
  const keret = munka.getBoundingClientRect();
  const regi = szintezisCsippentes.meret;
  const uj = Math.min(
    SZINTEZIS_NEZET_MAX,
    Math.max(SZINTEZIS_NEZET_MIN, regi * (tav / szintezisCsippentes.tav))
  );
  const helyiX = (szintezisCsippentes.kozepX - keret.left - szintezisCsippentes.x) / regi;
  const helyiY = (szintezisCsippentes.kozepY - keret.top - szintezisCsippentes.y) / regi;

  if (
    Math.abs(uj - regi) > 0.01 ||
    Math.hypot(kozepX - szintezisCsippentes.kozepX, kozepY - szintezisCsippentes.kozepY) >=
      SZINTEZIS_HUZAS_KUSZOB
  ) {
    szintezisCsippentes.elmozdult = true;
  }

  szintezisNezetBeallitasa(
    kozepX - keret.left - helyiX * uj,
    kozepY - keret.top - helyiY * uj,
    uj
  );
}

function szintezisNezetMutatoMozgas(event) {
  if (!szintezisNezetMutatok.has(event.pointerId)) {
    return;
  }

  szintezisNezetMutatok.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
  });

  if (!szintezisCsippentes) {
    return;
  }

  if (event.cancelable) {
    event.preventDefault();
  }

  szintezisNezetCsippentesFrissitese();
}

function szintezisNezetMutatoFel(event) {
  if (!szintezisNezetMutatok.has(event.pointerId)) {
    return;
  }

  szintezisNezetMutatok.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY,
  });

  if (szintezisCsippentes && szintezisNezetMutatok.size >= 2) {
    szintezisNezetCsippentesFrissitese();
  }

  const elmozdult = Boolean(szintezisCsippentes?.elmozdult);
  szintezisNezetMutatok.delete(event.pointerId);

  if (!szintezisCsippentes || szintezisNezetMutatok.size >= 2) {
    return;
  }

  szintezisCsippentes = null;

  if (elmozdult) {
    szintezisHuzasKattintasJeloles();
  }
}

function szintezisNezetGorgetese(event) {
  const munka = document.getElementById("szintezis-munkaterulet");

  if (!munka || szintezisCsippentes) {
    return;
  }

  event.preventDefault();

  let delta = event.deltaY;

  if (event.deltaMode === 1) {
    delta *= 16;
  } else if (event.deltaMode === 2) {
    delta *= munka.clientHeight;
  }

  if (!delta) {
    return;
  }

  szintezisNezetNagyitasa(
    szintezisNezetArany() * Math.exp(-delta * 0.0015),
    event.clientX,
    event.clientY
  );
}

function szintezisNezetHattere(cel) {
  if (!cel?.closest?.("#szintezis-munkaterulet")) {
    return false;
  }

  return !cel.closest(
    ".szintezis-vegyulet, .szintezis-termek, .szintezis-nyil-egyseg, .szintezis-lepes-fej, .szintezis-reakcio-cim, .szintezis-kartya, .szintezis-felso-hely, .szintezis-also-hely, .szintezis-lezart-felirat, button, a, input, label, select, textarea"
  );
}

function szintezisNezetMozgatasInditasa(event) {
  if (
    szintezisNezetKetMutato() ||
    !szintezisNezetHattere(event.target) ||
    !szintezisUjPointerEngedelyezett(event)
  ) {
    return;
  }

  const munka = document.getElementById("szintezis-munkaterulet");

  if (!munka) {
    return;
  }

  event.stopPropagation();

  const pointerId = event.pointerId;
  const kezdX = event.clientX;
  const kezdY = event.clientY;
  const originX = szintezisNezetX;
  const originY = szintezisNezetY;
  let elindult = false;

  szintezisHuzasFigyeloInditasa(munka, pointerId, {
    mozgas(e) {
      const dx = e.clientX - kezdX;
      const dy = e.clientY - kezdY;

      if (!elindult && Math.hypot(dx, dy) < SZINTEZIS_HUZAS_KUSZOB) {
        return;
      }

      if (!elindult) {
        elindult = true;
        szintezisHuzasElmozdult(pointerId);
        munka.classList.add("szintezis-nezet-huzasban");
      }

      if (e.cancelable) {
        e.preventDefault();
      }

      szintezisNezetBeallitasa(originX + dx, originY + dy);
    },
    felengedes() {
      munka.classList.remove("szintezis-nezet-huzasban");

      if (elindult) {
        szintezisHuzasKattintasJeloles();
      }
    },
  });

  if (szintezisAktivHuzas?.pointerId === pointerId) {
    szintezisAktivHuzas.esemeny = event;
  }
}

function szintezisTalcakFrissitese() {
  const kepernyo = document.getElementById("szintezis-kepernyo");
  const nyitva = Boolean(
    szintezisJatekAllapot.kivalasztottVegyuletPeldany
  );

  kepernyo?.classList.toggle("szintezis-talcak-nyitva", nyitva);

  for (const sav of document.querySelectorAll(
    "#szintezis-reagens-sav, #szintezis-korulmeny-sav"
  )) {
    if (nyitva) {
      sav.removeAttribute("aria-hidden");
    } else {
      sav.setAttribute("aria-hidden", "true");
    }
  }
}

function szintezisVegyuletKijelolesTorlese() {
  szintezisKivalasztasTorlese();
  szintezisJatekAllapot.kivalasztottVegyuletPeldany = null;

  for (const elem of document.querySelectorAll(
    "#szintezis-kepernyo .szintezis-vegyulet-kivalasztva"
  )) {
    elem.classList.remove("szintezis-vegyulet-kivalasztva");
    elem.removeAttribute("aria-pressed");
  }

  const uzenet = document.getElementById("szintezis-visszajelzes");

  if (uzenet?.textContent === SZINTEZIS_NINCS_REAKCIO) {
    szintezisVisszajelzes("");
  }

  szintezisAktivLepesBeallitasa(null);
  szintezisTalcakFrissitese();
  szintezisNyilakFrissitese();
}

function szintezisKeveres(lista) {
  const eredmeny = [...lista];

  for (let index = eredmeny.length - 1; index > 0; index -= 1) {
    const csere = Math.floor(Math.random() * (index + 1));
    const tartott = eredmeny[index];
    eredmeny[index] = eredmeny[csere];
    eredmeny[csere] = tartott;
  }

  return eredmeny;
}

function szintezisAnyagKulcs(ertek) {
  return adminSzintezisAnyagKulcs(ertek);
}

function szintezisEgyediAnyagok(ertekek) {
  const latott = new Set();
  const eredmeny = [];
  const nincsKulcs = szintezisAnyagKulcs(SZINTEZIS_NINCS_KARTJA);

  for (const ertek of ertekek ?? []) {
    const kulcs = szintezisAnyagKulcs(ertek);

    if (!kulcs || kulcs === nincsKulcs || latott.has(kulcs)) {
      continue;
    }

    latott.add(kulcs);
    eredmeny.push(ertek);
  }

  return eredmeny;
}

function szintezisReakcioOldalErtekei(reakcio, oldal) {
  const besorolas = szintezisReakcioBesorolas(reakcio);
  return oldal === "felso" ? besorolas.felso : besorolas.also;
}

function szintezisReakcioTermekMolekulai(reakcio) {
  const termekek = Array.isArray(reakcio?.termekek) ? reakcio.termekek : [];
  const latott = new Set();
  const molekulak = [];

  for (const termek of termekek) {
    const molekula = szintezisReakcioTermekMolekula(termek);
    const azonosito = szintezisMolekulaAzonosito(molekula);

    if (!azonosito || latott.has(azonosito)) {
      continue;
    }

    latott.add(azonosito);
    molekulak.push(molekula);
  }

  return molekulak;
}

function szintezisReakcioTermekAzonositok(reakcio) {
  return szintezisReakcioTermekMolekulai(reakcio)
    .map((molekula) => szintezisMolekulaAzonosito(molekula))
    .filter(Boolean);
}

function szintezisFotermekAzonositoja(reakcio) {
  return szintezisMolekulaAzonosito(
    szintezisReakcioTermekMolekula(szintezisFotermek(reakcio))
  );
}

function szintezisCelElerheto(kezdoId, reakciok, celId) {
  if (!kezdoId || !celId) {
    return false;
  }

  if (kezdoId === celId) {
    return true;
  }

  const latott = new Set([kezdoId]);
  const sor = [kezdoId];

  while (sor.length > 0) {
    const aktualis = sor.shift();

    for (const reakcio of szintezisVegyuletReakcioi(
      { id: aktualis },
      reakciok
    )) {
      for (const kovetkezo of szintezisReakcioTermekAzonositok(reakcio)) {
        if (!kovetkezo || latott.has(kovetkezo)) {
          continue;
        }

        if (kovetkezo === celId) {
          return true;
        }

        latott.add(kovetkezo);
        sor.push(kovetkezo);
      }
    }
  }

  return false;
}

function szintezisCelhezVivoReakciok(molekulaId, reakciok, celId) {
  if (!molekulaId || !celId || molekulaId === celId) {
    return [];
  }

  return szintezisVegyuletReakcioi({ id: molekulaId }, reakciok).filter(
    (reakcio) =>
      szintezisReakcioTermekAzonositok(reakcio).some((kovetkezo) =>
        szintezisCelElerheto(kovetkezo, reakciok, celId)
      )
  );
}

function szintezisReakcioBelefer() {
  return true;
}

function szintezisKartyaGyujtes(reakciok, oldal) {
  const latott = new Set();
  const eredmeny = [];

  for (const reakcio of reakciok) {
    const kartya = szintezisOldalKartya(
      szintezisReakcioOldalErtekei(reakcio, oldal),
      oldal
    );

    if (kartya.ures || latott.has(kartya.kulcs)) {
      continue;
    }

    latott.add(kartya.kulcs);
    eredmeny.push(kartya);
  }

  return eredmeny;
}

function szintezisBiztositottErtek(reakcio, oldal, gyujtes) {
  if (!reakcio) {
    return [];
  }

  const kartya = szintezisOldalKartya(
    szintezisReakcioOldalErtekei(reakcio, oldal),
    oldal
  );

  if (kartya.ures) {
    return [];
  }

  const meglevo = gyujtes.find((talalat) => talalat.kulcs === kartya.kulcs);

  return [meglevo?.ertek || kartya.ertek];
}

function szintezisValasztekOldal(helyes, helytelen, kotelezoErtekek) {
  const kotelezo = szintezisEgyediAnyagok(kotelezoErtekek);
  const kotelezoKulcs = new Set(kotelezo.map((ertek) => szintezisAnyagKulcs(ertek)));
  const tobbi = szintezisKeveres(
    helyes.filter((ertek) => !kotelezoKulcs.has(szintezisAnyagKulcs(ertek)))
  );
  const valasztottHelyes = [...kotelezo, ...tobbi].slice(0, 2);
  const rossz =
    helytelen.length > 0
      ? [helytelen[Math.floor(Math.random() * helytelen.length)]]
      : [];

  return szintezisKeveres([
    ...valasztottHelyes,
    ...rossz,
    SZINTEZIS_NINCS_KARTJA,
  ]);
}

function szintezisValasztekGeneralasa(molekula, reakciok) {
  const lista = Array.isArray(reakciok) ? reakciok : [];
  const sajat = szintezisVegyuletReakcioi(molekula, lista);
  const molekulaId = szintezisMolekulaAzonosito(molekula);
  const celId = szintezisMolekulaAzonosito(
    szintezisJatekAllapot.feladat?.celMolekula
  );
  const kotelezoReakciok = szintezisCelhezVivoReakciok(
    molekulaId,
    lista,
    celId
  ).filter(szintezisReakcioBelefer);
  const beleferoSajat = sajat.filter(szintezisReakcioBelefer);
  const elony = kotelezoReakciok.length > 0 ? kotelezoReakciok : beleferoSajat;
  const biztositott =
    elony.length > 0
      ? elony[Math.floor(Math.random() * elony.length)]
      : null;
  const oldalak = ["felso", "also"];
  const helyes = {};
  const idegen = {};
  const gyujtes = {};

  for (const oldal of oldalak) {
    gyujtes[oldal] = szintezisKartyaGyujtes(sajat, oldal);
    const osszes = szintezisKartyaGyujtes(lista, oldal);
    const helyesKulcs = new Set(gyujtes[oldal].map((kartya) => kartya.kulcs));

    helyes[oldal] = gyujtes[oldal].map((kartya) => kartya.ertek);
    idegen[oldal] = osszes
      .filter((kartya) => !helyesKulcs.has(kartya.kulcs))
      .map((kartya) => kartya.ertek);
  }

  return {
    reagens: szintezisValasztekOldal(
      helyes.felso,
      idegen.felso,
      szintezisBiztositottErtek(biztositott, "felso", gyujtes.felso)
    ),
    feltetel: szintezisValasztekOldal(
      helyes.also,
      idegen.also,
      szintezisBiztositottErtek(biztositott, "also", gyujtes.also)
    ),
  };
}

function szintezisKartyaTartalek() {
  let tartalek = document.getElementById("szintezis-kartya-tartalek");

  if (!tartalek) {
    tartalek = document.createElement("div");
    tartalek.id = "szintezis-kartya-tartalek";
    tartalek.hidden = true;
    document.getElementById("szintezis-kepernyo")?.append(tartalek);
  }

  return tartalek;
}

function szintezisKartyaBehelyezve(gomb) {
  return Boolean(
    gomb?.closest(".szintezis-felso-hely, .szintezis-also-hely")
  );
}

function szintezisTipusKartya(tipus, ertek) {
  const kulcs = szintezisKartyaKulcsa({ tipusa: tipus, ertek });

  for (const gomb of document.querySelectorAll(
    "#szintezis-kepernyo .szintezis-kartya"
  )) {
    if (gomb.dataset.tipus !== tipus) {
      continue;
    }

    if (
      (kulcs && gomb.dataset.szintezisKulcs === kulcs) ||
      gomb.dataset.ertek === ertek
    ) {
      return gomb;
    }
  }

  return null;
}

function szintezisValasztekBiztositasa(doboz) {
  const peldany = doboz?.dataset.szintezisPeldany;

  if (!peldany) {
    return null;
  }

  if (!szintezisJatekAllapot.kartyaValasztek) {
    szintezisJatekAllapot.kartyaValasztek = {};
  }

  if (!szintezisJatekAllapot.kartyaValasztek[peldany]) {
    szintezisJatekAllapot.kartyaValasztek[peldany] =
      szintezisValasztekGeneralasa(
        { id: doboz.dataset.szintezisMolekulaId },
        szintezisJatekAllapot.reakciok
      );
  }

  return szintezisJatekAllapot.kartyaValasztek[peldany];
}

function szintezisValasztekLathatosagFrissitese() {
  const peldany = szintezisJatekAllapot.kivalasztottVegyuletPeldany;
  const valasztek = peldany
    ? szintezisJatekAllapot.kartyaValasztek?.[peldany]
    : null;

  if (!valasztek) {
    return;
  }

  const tartalek = szintezisKartyaTartalek();

  for (const tipus of ["reagens", "feltetel"]) {
    const lista = szintezisKeszletLista(tipus);
    const ertekek = valasztek[tipus] ?? [];
    const kulcsok = new Set(
      ertekek.map((ertek) => szintezisKartyaKulcsa({ tipusa: tipus, ertek }))
    );

    if (!lista) {
      continue;
    }

    for (const gomb of [
      ...document.querySelectorAll("#szintezis-kepernyo .szintezis-kartya"),
    ]) {
      if (gomb.dataset.tipus !== tipus || szintezisKartyaBehelyezve(gomb)) {
        continue;
      }

      const gombKulcs =
        gomb.dataset.szintezisKulcs || szintezisAnyagKulcs(gomb.dataset.ertek);

      if (!kulcsok.has(gombKulcs)) {
        tartalek.append(gomb);
      }
    }

    for (const ertek of ertekek) {
      const gomb = szintezisTipusKartya(tipus, ertek);

      if (!gomb || szintezisKartyaBehelyezve(gomb)) {
        continue;
      }

      lista.append(gomb);
    }

    lista.querySelector(".szintezis-sav-uzenet")?.remove();
  }
}

function szintezisVegyuletKijelolese(doboz) {
  const azonosito = doboz?.dataset.szintezisPeldany;

  if (!azonosito) {
    return;
  }

  if (szintezisJatekAllapot.kivalasztottVegyuletPeldany === azonosito) {
    return;
  }

  szintezisVegyuletKijelolesTorlese();
  szintezisJatekAllapot.kivalasztottVegyuletPeldany = azonosito;
  doboz.classList.add("szintezis-vegyulet-kivalasztva");
  doboz.setAttribute("aria-pressed", "true");
  szintezisValasztekBiztositasa(doboz);
  szintezisValasztekLathatosagFrissitese();
  szintezisTalcakFrissitese();
  szintezisKijelolesUtan();
}

function szintezisVegyuletKattintas(event) {
  if (szintezisHuzasUtaniKattintas) {
    szintezisHuzasUtaniKattintas = false;
    return;
  }

  const doboz = szintezisKijelolhetoVegyulet(event.target);

  if (doboz) {
    szintezisVegyuletKijelolese(doboz);
    return;
  }

  if (szintezisUresMunkafelulet(event.target)) {
    szintezisVegyuletKijelolesTorlese();
  }
}

szintezisKartyaInterakcioBekotese();

const SZINTEZIS_REAKCIO_RAJZ = {
  rajzSzelesseg: 460,
  rajzMagassag: 260,
  meretaranyMaximum: 1.8,
};

function szintezisElem(cel) {
  if (!cel) {
    return null;
  }

  return typeof cel === "string"
    ? document.getElementById(cel)
    : cel;
}

function szintezisMolekulaKirajzolasa(
  kontenerCel,
  nevCel,
  molekulaRekord,
  rajzBeallitasok = SZINTEZIS_REAKCIO_RAJZ
) {
  const kontener = szintezisElem(kontenerCel);
  const nevElem = szintezisElem(nevCel);

  if (!kontener) {
    console.error(
      "[SZINTÉZIS] Hiányzó molekula-konténer:",
      kontenerCel
    );
    return;
  }

  kontener.replaceChildren();

  const nev =
    molekulaRekord?.preferalt_nev ??
    molekulaRekord?.adat?.nevek?.preferalt ??
    "";

  if (nevElem) {
    nevElem.textContent = nev;
  }

  if (!molekulaRekord) {
    return;
  }

  szintezisVegyuletAzonositoRogzitese(
    kontener.closest(".szintezis-vegyulet, .szintezis-termek"),
    molekulaRekord
  );

  const svg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  svg.setAttribute("width", "300");
  svg.setAttribute("height", "230");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    nev ? `${nev} szerkezete` : "Molekula szerkezete"
  );
  kontener.append(svg);

  const elozet = adminElozetAdatokKeszitese(molekulaRekord);

  if (!elozet) {
    console.error(
      "[SZINTÉZIS] A molekula előnézete nem készíthető el:",
      molekulaRekord?.id ?? kontenerId
    );
    return;
  }

  nevadasMolekulaKirajzolasa(
    elozet.atomok,
    elozet.kotesek,
    svg,
    elozet.polimer,
    rajzBeallitasok
  );

  svg.setAttribute("width", "300");
  svg.setAttribute("height", "230");
}

function szintezisAnyagKulcsok(ertekek) {
  const kulcsok = [];
  const latott = new Set();

  for (const ertek of ertekek ?? []) {
    const kulcs = adminSzintezisAnyagKulcs(ertek);

    if (!kulcs || latott.has(kulcs)) {
      continue;
    }

    latott.add(kulcs);
    kulcsok.push(kulcs);
  }

  return kulcsok;
}

function szintezisEgyediErtekek(lista) {
  const eredmeny = [];
  const latott = new Set();

  for (const ertek of lista ?? []) {
    if (ertek == null || ertek === "") {
      continue;
    }

    const kulcs = String(ertek);

    if (latott.has(kulcs)) {
      continue;
    }

    latott.add(kulcs);
    eredmeny.push(kulcs);
  }

  return eredmeny;
}

function szintezisHalmazEgyezik(kapott, elvart) {
  if (kapott.length !== elvart.length) {
    return false;
  }

  const keszlet = new Set(elvart);
  return kapott.every((ertek) => keszlet.has(ertek));
}

function szintezisElhelyezettErtekek(hely) {
  return szintezisEgyediErtekek(
    szintezisJatekAllapot.kartyak
      .filter((kartya) => kartya.hely === hely)
      .map((kartya) => kartya.ertek)
  );
}

function szintezisFotermek(reakcio) {
  const termekek = Array.isArray(reakcio?.termekek)
    ? reakcio.termekek
    : [];

  return (
    termekek.find(
      (termek) => Number(termek?.termek_sorszam) === 0
    ) ?? null
  );
}

function szintezisMolekulaAzonosito(molekula) {
  return molekula?.id == null ? null : String(molekula.id);
}

function szintezisVegyuletReakcioi(molekula, reakciok) {
  const azonosito = szintezisMolekulaAzonosito(molekula);

  if (!azonosito) {
    return [];
  }

  const lista = Array.isArray(reakciok) ? reakciok : [];

  return lista.filter(
    (reakcio) =>
      szintezisMolekulaAzonosito(reakcio?.kiindulasi) === azonosito
  );
}

function szintezisReakcioFolytatasai(reakcio, reakciok) {
  const termekIds = new Set(szintezisReakcioTermekAzonositok(reakcio));

  if (termekIds.size === 0) {
    return [];
  }

  const lista = Array.isArray(reakciok) ? reakciok : [];

  return lista.filter((kovetkezo) =>
    termekIds.has(szintezisMolekulaAzonosito(kovetkezo?.kiindulasi))
  );
}

function szintezisLancVege(kezdoReakcio, reakciok) {
  const latott = new Set();
  const lista = Array.isArray(reakciok) ? reakciok : [];
  let aktualis = kezdoReakcio;
  let lepes = 0;

  while (aktualis && lepes <= lista.length) {
    const azonosito =
      aktualis.id == null ? null : String(aktualis.id);

    if (latott.has(aktualis) || (azonosito && latott.has(azonosito))) {
      return { allapot: "kor" };
    }

    latott.add(aktualis);

    if (azonosito) {
      latott.add(azonosito);
    }

    lepes += 1;
    const folytatasok = szintezisReakcioFolytatasai(aktualis, lista);

    if (folytatasok.length > 1) {
      return { allapot: "tobb" };
    }

    if (folytatasok.length === 0) {
      return { allapot: "cel", reakcio: aktualis };
    }

    aktualis = folytatasok[0];
  }

  return { allapot: "kor" };
}

function szintezisFeladatLehetosegek(reakciok) {
  const lista = Array.isArray(reakciok) ? reakciok : [];
  const molekulak = new Map();
  const tovabb = new Map();

  const megjegyez = (molekula) => {
    const azonosito = szintezisMolekulaAzonosito(molekula);

    if (!azonosito) {
      return null;
    }

    if (!molekulak.has(azonosito)) {
      molekulak.set(azonosito, molekula);
    }

    return azonosito;
  };

  for (const reakcio of lista) {
    const kezdoId = megjegyez(reakcio?.kiindulasi);

    for (const termek of szintezisReakcioTermekMolekulai(reakcio)) {
      const celId = megjegyez(termek);

      if (!kezdoId || !celId || kezdoId === celId) {
        continue;
      }

      if (!tovabb.has(kezdoId)) {
        tovabb.set(kezdoId, new Set());
      }

      tovabb.get(kezdoId).add(celId);
    }
  }

  const lehetosegek = [];

  for (const [kezdoId, kezdoMolekula] of molekulak) {
    if (!tovabb.has(kezdoId)) {
      continue;
    }

    const tavolsag = new Map([[kezdoId, 0]]);
    const sor = [kezdoId];

    while (sor.length > 0) {
      const aktualisId = sor.shift();
      const kovetkezok = tovabb.get(aktualisId);

      if (!kovetkezok) {
        continue;
      }

      for (const celId of kovetkezok) {
        if (tavolsag.has(celId)) {
          continue;
        }

        const lepesek = tavolsag.get(aktualisId) + 1;
        tavolsag.set(celId, lepesek);
        sor.push(celId);
        lehetosegek.push({
          kezdoMolekula,
          celMolekula: molekulak.get(celId),
          lepesek,
        });
      }
    }
  }

  return lehetosegek;
}

function szintezisMolekulaRajzolhato(molekula) {
  return Boolean(
    molekula?.adat &&
      Array.isArray(molekula.adat.atomok) &&
      Array.isArray(molekula.adat.kotesek)
  );
}

function szintezisReszhalmaz(kapott, elvart) {
  const keszlet = new Set(elvart);
  return kapott.every((ertek) => keszlet.has(ertek));
}

const SZINTEZIS_JATEK_IDO_MS = 15 * 60 * 1000;
const SZINTEZIS_LEPES_PONT = 3;
const SZINTEZIS_SIKER_UZENET = "Vegyület előállítva!";

let szintezisIdoFrissito = null;
let szintezisVegeIdopont = null;

function szintezisIdoSzoveg(ms) {
  const teljes = Math.max(0, Math.ceil(ms / 1000));
  const perc = Math.floor(teljes / 60);
  const maradek = teljes % 60;

  return `${String(perc).padStart(2, "0")}:${String(maradek).padStart(2, "0")}`;
}

function szintezisHatralevoMs() {
  if (szintezisVegeIdopont === null) {
    return SZINTEZIS_JATEK_IDO_MS;
  }

  return Math.max(0, szintezisVegeIdopont - Date.now());
}

function szintezisIdoMegjelenitese(ms) {
  const elem = document.getElementById("szintezis-ido");

  if (!elem) {
    return;
  }

  elem.textContent = `Hátralévő idő: ${szintezisIdoSzoveg(ms)}`;
}

function szintezisAktualisFeladatPontja() {
  return (
    document.querySelectorAll(
      "#szintezis-kepernyo .szintezis-lepes[data-szintezis-pont]"
    ).length * SZINTEZIS_LEPES_PONT
  );
}

function szintezisOsszpont() {
  return (szintezisJatekAllapot.lezartPont || 0) + szintezisAktualisFeladatPontja();
}

function szintezisPontszamMegjelenitese() {
  const elem = document.getElementById("szintezis-pont");

  if (!elem) {
    return;
  }

  elem.textContent = `Pontszám: ${szintezisOsszpont()}`;
}

function szintezisIdozitoLeallitasa() {
  if (szintezisIdoFrissito !== null) {
    window.clearInterval(szintezisIdoFrissito);
    szintezisIdoFrissito = null;
  }
}

function szintezisJatekLejar() {
  if (szintezisJatekAllapot.lejart) {
    return;
  }

  szintezisJatekAllapot.lejart = true;
  szintezisIdozitoLeallitasa();
  szintezisSikerIdozitoTorlese();

  const pont = szintezisOsszpont();
  szintezisIdoMegjelenitese(0);
  szintezisPontszamMegjelenitese();

  const elem = document.getElementById("szintezis-visszajelzes");

  if (!elem) {
    return;
  }

  elem.textContent = `Lejárt a játékidő. Végső pontszám: ${pont}`;
  elem.classList.remove("sikeres-ellenorzes", "hibas-ellenorzes");
  elem.classList.add("ellenorzes-eredmeny", "szintezis-jatek-vege");
}

function szintezisJatekLeallt() {
  if (szintezisJatekAllapot.lejart) {
    return true;
  }

  if (szintezisVegeIdopont !== null && Date.now() >= szintezisVegeIdopont) {
    szintezisJatekLejar();
    return true;
  }

  return false;
}

function szintezisIdoFrissitese() {
  if (szintezisJatekAllapot.lejart) {
    return;
  }

  const hatra = szintezisHatralevoMs();

  if (szintezisVegeIdopont !== null && hatra <= 0) {
    szintezisJatekLejar();
    return;
  }

  szintezisIdoMegjelenitese(hatra);
}

function szintezisIdozitoInditasa() {
  szintezisIdozitoLeallitasa();
  szintezisJatekAllapot.lejart = false;
  szintezisVegeIdopont = Date.now() + SZINTEZIS_JATEK_IDO_MS;
  szintezisIdoFrissitese();
  szintezisIdoFrissito = window.setInterval(szintezisIdoFrissitese, 200);
}

function szintezisMunkamenetAlaphelyzet() {
  szintezisFolyamatbanLevoHuzasLezarasa();
  szintezisIdozitoLeallitasa();
  szintezisSikerIdozitoTorlese();
  szintezisVegeIdopont = null;
  szintezisJatekAllapot.lezartPont = 0;
  szintezisJatekAllapot.lejart = false;

  for (const lepes of document.querySelectorAll(
    "#szintezis-kepernyo .szintezis-lepes[data-szintezis-pont]"
  )) {
    delete lepes.dataset.szintezisPont;
  }

  szintezisIdoMegjelenitese(SZINTEZIS_JATEK_IDO_MS);
  szintezisPontszamMegjelenitese();

  const elem = document.getElementById("szintezis-visszajelzes");
  elem?.classList.remove("szintezis-jatek-vege");
}

document.addEventListener("visibilitychange", () => {
  const kepernyo = document.getElementById("szintezis-kepernyo");

  if (
    document.visibilityState !== "visible" ||
    kepernyo?.hidden ||
    szintezisVegeIdopont === null ||
    szintezisJatekAllapot.lejart
  ) {
    return;
  }

  szintezisIdoFrissitese();
});
let szintezisSikerIdozito = null;

function szintezisSikerIdozitoTorlese() {
  if (szintezisSikerIdozito === null) {
    return;
  }

  window.clearTimeout(szintezisSikerIdozito);
  szintezisSikerIdozito = null;
}

function szintezisSikerTovabblepesIdozitese() {
  if (szintezisSikerIdozito !== null) {
    return;
  }

  szintezisSikerIdozito = window.setTimeout(() => {
    szintezisSikerIdozito = null;

    const kepernyo = document.getElementById("szintezis-kepernyo");

    if (kepernyo?.hidden || !szintezisJatekAllapot.celbaErt) {
      return;
    }

    szintezisUjFeladatInditasa();
  }, ELLENORZES_SIKER_VARAKOZAS);
}

function szintezisFeladatParKizarasa(lehetosegek, kizart) {
  const kezdoId = szintezisMolekulaAzonosito(kizart?.kezdoMolekula);
  const celId = szintezisMolekulaAzonosito(kizart?.celMolekula);

  if (!kezdoId || !celId || lehetosegek.length < 2) {
    return lehetosegek;
  }

  const tobbi = lehetosegek.filter(
    (lehetoseg) =>
      szintezisMolekulaAzonosito(lehetoseg?.kezdoMolekula) !== kezdoId ||
      szintezisMolekulaAzonosito(lehetoseg?.celMolekula) !== celId
  );

  return tobbi.length > 0 ? tobbi : lehetosegek;
}

function szintezisJatekTablazatEpitese(reakciok) {
  const kartyak = szintezisKartyakOsszeallitasa(reakciok);

  szintezisKartyakMegjelenitese(kartyak);
  szintezisElsoLepesMegjelenitese();
  return szintezisFeladatInditasa(reakciok);
}

function szintezisUjFeladatInditasa() {
  szintezisSikerIdozitoTorlese();

  if (szintezisJatekLeallt()) {
    return;
  }

  if (szintezisJatekAllapot.celbaErt) {
    szintezisJatekAllapot.lezartPont += szintezisAktualisFeladatPontja();
  }

  const reakciok = szintezisJatekAllapot.reakciok;
  const regiFeladat = szintezisJatekAllapot.feladat;
  const valaszthato = szintezisFeladatParKizarasa(
    szintezisFeladatLehetosegek(reakciok),
    regiFeladat
  );

  if (valaszthato.length > 0) {
    const kivalasztott =
      valaszthato[Math.floor(Math.random() * valaszthato.length)];

    szintezisJatekAllapot.feladat = {
      kezdoMolekula: kivalasztott.kezdoMolekula,
      celMolekula: kivalasztott.celMolekula,
    };
  } else {
    szintezisFeladatTorlese();
  }

  szintezisValasztasokAlaphelyzete();

  if (!szintezisJatekTablazatEpitese(reakciok)) {
    szintezisVisszajelzes("Nincs elérhető szintézisfeladat.");
    szintezisPontszamMegjelenitese();
    return;
  }

  szintezisVisszajelzes("");
  szintezisKezdoElhelyezese();
  szintezisPontszamMegjelenitese();
}

function szintezisVisszajelzes(szoveg, sikeres = false) {
  if (szintezisJatekAllapot.lejart) {
    return;
  }

  const elem = document.getElementById("szintezis-visszajelzes");

  if (!elem) {
    return;
  }

  elem.textContent = szoveg;
  elem.classList.remove("szintezis-jatek-vege");
  elem.classList.toggle("ellenorzes-eredmeny", sikeres);
  elem.classList.toggle("sikeres-ellenorzes", sikeres);
}

function szintezisTermekElrejtese() {
  const lepes = szintezisAktivLepes();
  const termekek = lepes?.querySelector(".szintezis-lepes-termekek");

  for (const termek of lepes?.querySelectorAll(".szintezis-termek") ?? []) {
    delete szintezisJatekAllapot.termekPoziciok[
      termek.dataset.szintezisPeldany
    ];
  }

  if (termekek) {
    termekek.hidden = true;
    termekek.replaceChildren();
  }

  szintezisNyilakFrissitese();
}

function szintezisEllenorzesEredmenyTorlese() {
  const voltEllenorzes = szintezisJatekAllapot.ellenorizve;
  szintezisJatekAllapot.ellenorizve = false;
  szintezisTermekElrejtese();

  const elem = document.getElementById("szintezis-visszajelzes");

  if (voltEllenorzes && elem?.textContent !== SZINTEZIS_SIKER_UZENET) {
    szintezisVisszajelzes("");
  }
}

function szintezisAgUzenet(szoveg) {
  const elem = document.getElementById("szintezis-visszajelzes");

  if (
    szintezisJatekAllapot.celbaErt ||
    elem?.textContent === SZINTEZIS_SIKER_UZENET
  ) {
    return;
  }

  szintezisVisszajelzes(szoveg);
}

function szintezisCelbaErt(reakcio) {
  const celId = szintezisMolekulaAzonosito(
    szintezisJatekAllapot.feladat?.celMolekula
  );

  return Boolean(
    celId && szintezisReakcioTermekAzonositok(reakcio).includes(celId)
  );
}

function szintezisTermekekMegjelenitese(reakcio) {
  const lepes = szintezisAktivLepes();
  const tartok = lepes?.querySelector(".szintezis-lepes-termekek");

  if (!tartok) {
    return true;
  }

  const korabbiTermekek = szintezisJatekAllapot.letrejottTermekIds;
  szintezisJatekAllapot.letrejottTermekIds =
    szintezisReakcioTermekek(
      tartok,
      reakcio?.termekek,
      `szintezis-lepes-${szintezisLepesSorszam(lepes)}-termek`,
      true
    );
  szintezisVegyuletPeldanyokJelolese(tartok);

  if (!szintezisTermekekSzabadra(lepes)) {
    szintezisJatekAllapot.letrejottTermekIds = korabbiTermekek;
    tartok.hidden = true;
    tartok.replaceChildren();
    szintezisNyilakFrissitese();
    return false;
  }

  szintezisNyilakFrissitese();
  szintezisReakciosorKozepre();
  return true;
}

function szintezisReakcioCimFrissitese() {
  const cim = szintezisAktivLepes()?.querySelector(".szintezis-reakcio-cim");

  if (!cim) {
    return;
  }

  const mindketHelyTeli =
    szintezisElhelyezettErtekek("felso").length > 0 &&
    szintezisElhelyezettErtekek("also").length > 0;
  const szoveg = mindketHelyTeli
    ? String(
        szintezisJatekAllapot.aktualisReakcio?.reakcio_tipus ?? ""
      ).trim()
    : "";

  cim.textContent = szoveg;
  cim.hidden = false;
  cim.classList.toggle("szintezis-reakcio-cim-rejtett", !szoveg);
}

function szintezisLepesMegoldasRogzitese(lepes) {
  szintezisFolyamatbanLevoHuzasLezarasa();
  const mentett = [];

  for (const hely of lepes.querySelectorAll(
    ".szintezis-felso-hely, .szintezis-also-hely"
  )) {
    const gomb = hely.querySelector(".szintezis-kartya");

    if (!gomb) {
      continue;
    }

    mentett.push({
      hely,
      ertek: gomb.dataset.ertek,
      tipusa: gomb.dataset.tipus,
      kulcs: gomb.dataset.szintezisKulcs || "",
    });
    szintezisKartyaKeszletbe(gomb, false);
  }

  for (const adat of mentett) {
    szintezisFeliratBeillesztese(adat.hely, adat);
  }

  lepes.classList.remove("szintezis-lepes-aktiv");
  lepes.classList.add("szintezis-lepes-kesz");
  lepes.dataset.szintezisOlvasas = "1";
  szintezisJatekAllapot.elhelyezettKartyak = {
    felso: null,
    also: null,
  };
  szintezisJatekAllapot.kivalasztottKartya = null;
  szintezisJatekAllapot.kivalasztottFelirat = null;
  szintezisKivalasztasMegjelenitese();
  szintezisKilepoMegjelenitese(lepes);
}

function szintezisKilepoLista(reakcio) {
  return (Array.isArray(reakcio?.kilepo_anyagok) ? reakcio.kilepo_anyagok : [])
    .map((anyag) => String(anyag ?? "").trim())
    .filter(Boolean);
}

function szintezisLepesKilepoRogzitese(lepes, reakcio) {
  if (!lepes) {
    return;
  }

  const lista = szintezisKilepoLista(reakcio);

  if (lista.length === 0) {
    delete lepes.dataset.szintezisKilepo;
    return;
  }

  lepes.dataset.szintezisKilepo = JSON.stringify(lista);
}

function szintezisLepesKilepoAnyagai(lepes) {
  const nyers = lepes?.dataset.szintezisKilepo;

  if (!nyers) {
    return [];
  }

  try {
    const lista = JSON.parse(nyers);
    return szintezisKilepoLista({ kilepo_anyagok: lista });
  } catch (hiba) {
    return [];
  }
}

function szintezisKilepoSzoveg(anyagok) {
  return szintezisKilepoLista({ kilepo_anyagok: anyagok })
    .map((anyag) => `\u2212${szintezisKartyaFelirat(anyag)}`)
    .join(" ");
}

function szintezisKilepoMegjelenitese(lepes) {
  const hely = lepes?.querySelector(":scope .szintezis-felso-hely");
  hely?.querySelector(":scope > .szintezis-kilepo")?.remove();

  const szoveg = szintezisKilepoSzoveg(szintezisLepesKilepoAnyagai(lepes));

  if (!hely || !szoveg) {
    return;
  }

  const felirat = document.createElement("span");
  felirat.className = "szintezis-kilepo";
  felirat.textContent = szoveg;
  hely.append(felirat);
}

function szintezisKilepoTorlese(lepes) {
  if (!lepes) {
    return;
  }

  delete lepes.dataset.szintezisKilepo;
  lepes.querySelector(":scope .szintezis-kilepo")?.remove();
}

function szintezisLeszarmazottLepecek(lepes) {
  const gyerekek = [];
  const sor = [lepes];
  const latott = new Set([lepes]);

  while (sor.length > 0) {
    const aktualis = sor.pop();

    for (const termek of aktualis.querySelectorAll(
      ":scope .szintezis-lepes-termekek > .szintezis-termek"
    )) {
      const gyerek = szintezisForrasLepes(termek.dataset.szintezisPeldany);

      if (!gyerek || latott.has(gyerek)) {
        continue;
      }

      latott.add(gyerek);
      gyerekek.push(gyerek);
      sor.push(gyerek);
    }
  }

  return gyerekek;
}

function szintezisLepesTermekeinekTorlese(lepes) {
  szintezisFolyamatbanLevoHuzasLezarasa();
  for (const termek of [
    ...lepes.querySelectorAll(":scope .szintezis-lepes-termekek > .szintezis-termek"),
  ]) {
    const peldany = termek.dataset.szintezisPeldany;

    if (peldany && szintezisJatekAllapot.kivalasztottVegyuletPeldany === peldany) {
      szintezisJatekAllapot.kivalasztottVegyuletPeldany = null;
    }

    if (peldany) {
      delete szintezisJatekAllapot.termekPoziciok[peldany];
    }

    termek.remove();
  }

  const tartok = lepes.querySelector(".szintezis-lepes-termekek");

  if (tartok) {
    tartok.hidden = true;
    tartok.replaceChildren();
  }
}

function szintezisLepesKartyaitVisszaadja(lepes) {
  szintezisFolyamatbanLevoHuzasLezarasa();
  lepes.classList.remove("szintezis-lepes-kesz");
  delete lepes.dataset.szintezisOlvasas;

  for (const gomb of [...lepes.querySelectorAll(".szintezis-kartya")]) {
    szintezisKartyaKeszletbe(gomb, false);
  }
}

function szintezisSikerFrissitese() {
  if (szintezisJatekAllapot.lejart) {
    return;
  }

  const celId = szintezisMolekulaAzonosito(
    szintezisJatekAllapot.feladat?.celMolekula
  );
  let megvan = false;

  if (celId) {
    for (const keszLepes of document.querySelectorAll(
      "#szintezis-kepernyo .szintezis-lepes-kesz"
    )) {
      const termekek = keszLepes.querySelectorAll(
        ":scope .szintezis-lepes-termekek > .szintezis-termek"
      );

      for (const termek of termekek) {
        if (termek.closest("#szintezis-cel-referencia")) {
          continue;
        }

        if (termek.dataset.szintezisMolekulaId === celId) {
          megvan = true;
          break;
        }
      }

      if (megvan) {
        break;
      }
    }
  }

  szintezisJatekAllapot.celbaErt = megvan;
  szintezisJatekAllapot.letrejottTermekIds = megvan ? [celId] : [];
  const elem = document.getElementById("szintezis-visszajelzes");

  if (megvan) {
    if (!elem?.textContent || elem.textContent === SZINTEZIS_SIKER_UZENET) {
      szintezisVisszajelzes(SZINTEZIS_SIKER_UZENET, true);
      szintezisSikerTovabblepesIdozitese();
    }

    return;
  }

  szintezisSikerIdozitoTorlese();

  if (elem?.textContent === SZINTEZIS_SIKER_UZENET) {
    szintezisVisszajelzes("");
  }
}

function szintezisNyitottLepesUzenetTorlese() {
  const elem = document.getElementById("szintezis-visszajelzes");

  if (!elem?.textContent || elem.textContent === SZINTEZIS_SIKER_UZENET) {
    return;
  }

  szintezisJatekAllapot.ellenorizve = false;
  szintezisVisszajelzes("");
}

function szintezisLezartLepesMegnyitasa(lepes) {
  szintezisFolyamatbanLevoHuzasLezarasa();

  if (szintezisJatekLeallt()) {
    return;
  }

  if (!lepes?.classList.contains("szintezis-lepes-kesz")) {
    return;
  }

  szintezisKilepoTorlese(lepes);

  const leszarmazottak = szintezisLeszarmazottLepecek(lepes);
  delete lepes.dataset.szintezisPont;

  for (const gyerek of leszarmazottak) {
    delete gyerek.dataset.szintezisPont;
  }

  for (const gyerek of leszarmazottak.reverse()) {
    szintezisLepesTermekeinekTorlese(gyerek);
    szintezisLepesKartyaitVisszaadja(gyerek);
    gyerek.remove();
  }

  szintezisLepesTermekeinekTorlese(lepes);
  lepes.classList.remove("szintezis-lepes-kesz");
  delete lepes.dataset.szintezisOlvasas;
  szintezisLepesCimBeallitasa(lepes, "");

  const forrasId = lepes.dataset.szintezisForras;

  if (
    szintezisJatekAllapot.kivalasztottVegyuletPeldany &&
    !szintezisPeldanyDoboz(szintezisJatekAllapot.kivalasztottVegyuletPeldany)
  ) {
    szintezisJatekAllapot.kivalasztottVegyuletPeldany = null;
  }

  const forras = szintezisPeldanyDoboz(forrasId);

  if (forras && szintezisJatekAllapot.kivalasztottVegyuletPeldany !== forrasId) {
    szintezisVegyuletKijelolese(forras);

    if (
      !lepes.querySelector(".szintezis-kartya, .szintezis-lezart-felirat")
    ) {
      szintezisNyitottLepesUzenetTorlese();
    }
  } else if (forras) {
    szintezisAktivLepesBeallitasa(forrasId);
    szintezisTalcakFrissitese();
    szintezisNyilakFrissitese();

    if (
      lepes.querySelector(
        ".szintezis-kartya, .szintezis-lezart-felirat"
      )
    ) {
      szintezisReakcioFrissitese();
    } else {
      szintezisNyitottLepesUzenetTorlese();
    }
  } else {
    szintezisAktivLepesBeallitasa(null);
    szintezisNyilakFrissitese();
  }

  szintezisSikerFrissitese();
  szintezisPontszamMegjelenitese();
}

function szintezisKovetkezoLepesMegnyitasa(reakcio) {
  const regi = szintezisAktivLepes();
  const lepesek = document.getElementById("szintezis-lepesek");

  if (!regi || !lepesek || !reakcio) {
    return;
  }

  szintezisLepesMegoldasRogzitese(regi);
  szintezisJatekAllapot.aktualisReakcio = reakcio;
  szintezisJatekAllapot.celbaErt = false;
  szintezisJatekAllapot.ellenorizve = false;

  const lepes = document.createElement("div");
  lepes.className = "szintezis-lepes szintezis-lepes-aktiv";
  lepes.dataset.lepes = String(szintezisLepesSorszam(null));

  const fej = document.createElement("div");
  fej.className = "szintezis-lepes-fej";
  fej.append(szintezisLepesCim(), szintezisNyilEgyseg({ interaktiv: true }));

  const termekek = document.createElement("div");
  termekek.className = "szintezis-lepes-termekek";
  termekek.hidden = true;
  lepes.append(fej, termekek);
  lepesek.append(lepes);
  szintezisNyilFestettIgazitas();
  szintezisReakcioCimFrissitese();

  const sor = lepesek.closest(".szintezis-reakciosor");

  if (sor) {
    szintezisReakciosorKozepre();
  }
}

const SZINTEZIS_NINCS_REAKCIO =
  "Ehhez a vegyülethez nincs betöltött reakció.";
const SZINTEZIS_TOBB_REAKCIO =
  "Több különböző reakció is illeszkedik erre az összeállításra.";
const SZINTEZIS_NINCS_HELY =
  "Nincs elég szabad hely az új termékeknek.";

function szintezisVegyuletAzonositoRogzitese(doboz, molekula) {
  if (!doboz || doboz.classList.contains("szintezis-cel")) {
    return;
  }

  const azonosito = szintezisMolekulaAzonosito(molekula);

  if (!azonosito) {
    return;
  }

  doboz.dataset.szintezisMolekulaId = azonosito;
}

function szintezisKivalasztottVegyuletDoboz() {
  const peldany = szintezisJatekAllapot.kivalasztottVegyuletPeldany;

  if (!peldany) {
    return null;
  }

  return document.querySelector(
    `#szintezis-kepernyo [data-szintezis-peldany="${CSS.escape(peldany)}"]`
  );
}

function szintezisForrasLepes(peldany) {
  if (!peldany) {
    return null;
  }

  return document.querySelector(
    `#szintezis-lepesek [data-szintezis-forras="${CSS.escape(peldany)}"]`
  );
}

function szintezisAktivLepesBeallitasa(peldany) {
  for (const lepes of document.querySelectorAll(
    "#szintezis-kepernyo .szintezis-lepes"
  )) {
    const sajat = Boolean(peldany) && lepes.dataset.szintezisForras === peldany;
    const kesz = lepes.classList.contains("szintezis-lepes-kesz");
    lepes.classList.toggle("szintezis-lepes-aktiv", sajat && !kesz);
  }
}

function szintezisLepesLetrehozasa(peldany) {
  const lepesek = document.getElementById("szintezis-lepesek");
  const meglevo = szintezisForrasLepes(peldany);

  if (!lepesek || !peldany || meglevo) {
    return meglevo;
  }

  const lepes = document.createElement("div");
  lepes.className = "szintezis-lepes";
  lepes.dataset.szintezisForras = peldany;
  lepes.dataset.lepes = String(szintezisLepesSorszam(null));

  const fej = document.createElement("div");
  fej.className = "szintezis-lepes-fej";
  fej.append(szintezisLepesCim(), szintezisNyilEgyseg({ interaktiv: true }));

  const termekek = document.createElement("div");
  termekek.className = "szintezis-lepes-termekek";
  termekek.hidden = true;
  lepes.append(fej, termekek);
  lepesek.append(lepes);
  szintezisNyilFestettIgazitas();
  szintezisNyilakFrissitese();
  szintezisReakciosorKozepre();
  return lepes;
}

function szintezisNincsReakcioUzenetTorlese() {
  const uzenet = document.getElementById("szintezis-visszajelzes");

  if (uzenet?.textContent === SZINTEZIS_NINCS_REAKCIO) {
    szintezisVisszajelzes("");
  }
}

function szintezisKijelolesUtan() {
  const doboz = szintezisKivalasztottVegyuletDoboz();

  if (!doboz) {
    return;
  }

  const jeloltek = szintezisVegyuletReakcioi(
    { id: doboz.dataset.szintezisMolekulaId },
    szintezisJatekAllapot.reakciok
  );

  if (jeloltek.length === 0) {
    szintezisAktivLepesBeallitasa(null);
    szintezisNyilakFrissitese();
    szintezisAgUzenet(SZINTEZIS_NINCS_REAKCIO);
    return;
  }

  const meglevo = szintezisForrasLepes(doboz.dataset.szintezisPeldany);

  if (meglevo?.classList.contains("szintezis-lepes-kesz")) {
    szintezisAktivLepesBeallitasa(null);
    szintezisNyilakFrissitese();
    szintezisNincsReakcioUzenetTorlese();
    return;
  }

  szintezisLepesLetrehozasa(doboz.dataset.szintezisPeldany);
  szintezisAktivLepesBeallitasa(doboz.dataset.szintezisPeldany);
  szintezisNyilakFrissitese();
  szintezisNincsReakcioUzenetTorlese();

  const lepes = szintezisAktivLepes();

  if (
    lepes?.querySelector(
      ".szintezis-felso-hely .szintezis-kartya, .szintezis-also-hely .szintezis-kartya, .szintezis-lezart-felirat"
    )
  ) {
    szintezisReakcioFrissitese();
  }
}

function szintezisLepesCimBeallitasa(lepes, szoveg) {
  const cim = lepes?.querySelector(".szintezis-reakcio-cim");

  if (!cim) {
    return;
  }

  const felirat = String(szoveg ?? "").trim();
  cim.textContent = felirat;
  cim.hidden = false;
  cim.classList.toggle("szintezis-reakcio-cim-rejtett", !felirat);
}

function szintezisNincsKartya(ertek) {
  return ertek === SZINTEZIS_NINCS_KARTJA;
}

function szintezisKartyaAriaCimke(ertek, felirat) {
  return szintezisNincsKartya(ertek) ? SZINTEZIS_NINCS_JELENTES : felirat;
}

function szintezisLepesOldalValasztasa(lepes, oldal) {
  const osztaly =
    oldal === "felso" ? ".szintezis-felso-hely" : ".szintezis-also-hely";
  const gomb = lepes?.querySelector(`${osztaly} .szintezis-kartya`);
  const tarolt = gomb ? null : szintezisLepesTaroltErtek(lepes, oldal);
  const ertek = gomb?.dataset.ertek || tarolt?.ertek || "";

  if (!ertek) {
    return { valasztott: false, ertekek: [] };
  }

  if (szintezisNincsKartya(ertek)) {
    return { valasztott: true, ertekek: [] };
  }

  return {
    valasztott: true,
    ertekek: szintezisEgyediErtekek([ertek]),
  };
}

function szintezisOldalHianyos(kapott, elvart) {
  if (!szintezisReszhalmaz(kapott, elvart)) {
    return false;
  }

  if (kapott.length === 0 && elvart.length > 0) {
    return false;
  }

  return true;
}

function szintezisLepesOldalKulcs(lepes, oldal) {
  const osztaly =
    oldal === "felso" ? ".szintezis-felso-hely" : ".szintezis-also-hely";
  const elem = lepes?.querySelector(
    `${osztaly} .szintezis-kartya, ${osztaly} .szintezis-lezart-felirat`
  );

  if (elem?.dataset.szintezisKulcs) {
    return elem.dataset.szintezisKulcs;
  }

  return szintezisKartyaKulcsa(szintezisLepesTaroltErtek(lepes, oldal));
}

function szintezisKulonbozoReakciok(reakciok) {
  const latott = new Set();
  const eredmeny = [];

  for (const reakcio of reakciok) {
    const kulcs = reakcio?.id == null ? null : String(reakcio.id);

    if (kulcs && latott.has(kulcs)) {
      continue;
    }

    if (kulcs) {
      latott.add(kulcs);
    }

    eredmeny.push(reakcio);
  }

  return eredmeny;
}

function szintezisReakcioVegrehajtasa(reakcio) {
  const lepes = szintezisAktivLepes();

  if (szintezisJatekLeallt() || !lepes || !reakcio) {
    return;
  }

  if (!szintezisTermekekMegjelenitese(reakcio)) {
    szintezisJatekAllapot.ellenorizve = true;
    szintezisSikerFrissitese();
    szintezisAgUzenet(SZINTEZIS_NINCS_HELY);
    return;
  }

  szintezisLepesCimBeallitasa(lepes, reakcio.reakcio_tipus);
  szintezisLepesKilepoRogzitese(lepes, reakcio);
  szintezisLepesMegoldasRogzitese(lepes);
  lepes.dataset.szintezisPont = String(SZINTEZIS_LEPES_PONT);
  szintezisPontszamMegjelenitese();
  szintezisJatekAllapot.ellenorizve = true;
  szintezisVegyuletKijelolesTorlese();
  szintezisSikerFrissitese();
  szintezisNyilakFrissitese();
  szintezisReakciosorKozepre();
}

function szintezisReakcioFrissitese() {
  if (szintezisJatekLeallt()) {
    return;
  }

  const doboz = szintezisKivalasztottVegyuletDoboz();
  const lepes = szintezisAktivLepes();

  if (
    !doboz ||
    !lepes ||
    lepes.dataset.szintezisForras !== doboz.dataset.szintezisPeldany
  ) {
    return;
  }

  szintezisEllenorzesEredmenyTorlese();

  const jeloltek = szintezisVegyuletReakcioi(
    { id: doboz.dataset.szintezisMolekulaId },
    szintezisJatekAllapot.reakciok
  );

  if (jeloltek.length === 0) {
    szintezisSikerFrissitese();
    szintezisAgUzenet(SZINTEZIS_NINCS_REAKCIO);
    return;
  }

  const felsoValasztas = szintezisLepesOldalValasztasa(lepes, "felso");
  const alsoValasztas = szintezisLepesOldalValasztasa(lepes, "also");

  if (!felsoValasztas.valasztott || !alsoValasztas.valasztott) {
    szintezisSikerFrissitese();
    return;
  }

  const felsoKulcs = szintezisLepesOldalKulcs(lepes, "felso");
  const alsoKulcs = szintezisLepesOldalKulcs(lepes, "also");
  const egyezok = [];

  for (const reakcio of jeloltek) {
    const besorolas = szintezisReakcioBesorolas(reakcio);
    const elvartFelso = szintezisOldalKartya(besorolas.felso, "felso").kulcs;
    const elvartAlso = szintezisOldalKartya(besorolas.also, "also").kulcs;

    if (felsoKulcs === elvartFelso && alsoKulcs === elvartAlso) {
      egyezok.push(reakcio);
    }
  }

  const kulonbozo = szintezisKulonbozoReakciok(egyezok);

  if (kulonbozo.length > 1) {
    szintezisJatekAllapot.ellenorizve = true;
    szintezisSikerFrissitese();
    szintezisAgUzenet(SZINTEZIS_TOBB_REAKCIO);
    return;
  }

  if (kulonbozo.length === 1) {
    szintezisReakcioVegrehajtasa(kulonbozo[0]);
    szintezisSikerFrissitese();
    return;
  }

  szintezisJatekAllapot.ellenorizve = true;
  szintezisSikerFrissitese();
  szintezisAgUzenet("A megadott összeállítás nem megfelelő.");
}

function szintezisMunkaTeglalap() {
  return szintezisNezetElem()?.getBoundingClientRect() ?? null;
}

function szintezisLathatoKeret() {
  const munka = szintezisNezetElem();
  const sor = document.querySelector("#szintezis-kepernyo .szintezis-reakciosor");
  const munkaTeglalap = munka?.getBoundingClientRect();
  const sorTeglalap = sor?.getBoundingClientRect();

  if (!munka || !munkaTeglalap) {
    return null;
  }

  const arany = szintezisNezetArany();
  const bal = sorTeglalap ? (sorTeglalap.left - munkaTeglalap.left) / arany : 0;
  const felso = sorTeglalap ? (sorTeglalap.top - munkaTeglalap.top) / arany : 0;

  return {
    bal,
    felso,
    szelesseg: sor?.clientWidth ?? munka.clientWidth,
    magassag: sor?.clientHeight ?? munka.clientHeight,
  };
}

function szintezisPozicioKorlatozasa(bal, felso, szelesseg, magassag) {
  const keret = szintezisLathatoKeret();

  if (!keret) {
    return { bal, felso };
  }

  const maxBal = keret.bal + Math.max(0, keret.szelesseg - szelesseg);
  const maxFelso = keret.felso + Math.max(0, keret.magassag - magassag);

  return {
    bal: Math.min(Math.max(keret.bal, bal), maxBal),
    felso: Math.min(Math.max(keret.felso, felso), maxFelso),
  };
}

function szintezisPeldanyDoboz(peldany) {
  if (!peldany) {
    return null;
  }

  return document.querySelector(
    `#szintezis-kepernyo [data-szintezis-peldany="${CSS.escape(peldany)}"]`
  );
}

function szintezisOvalisAdat(doboz) {
  const oval = doboz?.querySelector(
    ".szintezis-molekula-abra, .szintezis-termek-abra"
  );
  const munka = szintezisMunkaTeglalap();

  if (!oval || !munka) {
    return null;
  }

  const teglalap = oval.getBoundingClientRect();
  const arany = szintezisNezetArany();

  return {
    cx: (teglalap.left + teglalap.width / 2 - munka.left) / arany,
    cy: (teglalap.top + teglalap.height / 2 - munka.top) / arany,
    rx: teglalap.width / 2 / arany,
    ry: teglalap.height / 2 / arany,
  };
}

function szintezisNyilRetege() {
  const munka = szintezisNezetBiztositasa();

  if (!munka) {
    return null;
  }

  let svg = document.getElementById("szintezis-nyil-retege");

  if (svg) {
    if (svg.parentElement !== munka) {
      munka.append(svg);
    }

    return svg;
  }

  svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = "szintezis-nyil-retege";
  svg.setAttribute("aria-hidden", "true");

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const jel = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  jel.id = "szintezis-nyilhegy";
  jel.setAttribute("markerWidth", "8");
  jel.setAttribute("markerHeight", "8");
  jel.setAttribute("refX", "7");
  jel.setAttribute("refY", "4");
  jel.setAttribute("orient", "auto");
  const hegy = document.createElementNS("http://www.w3.org/2000/svg", "path");
  hegy.setAttribute("d", "M0,0 L8,4 L0,8 Z");
  hegy.setAttribute("fill", "#bda5ff");
  jel.append(hegy);
  defs.append(jel);
  svg.append(defs);
  munka.append(svg);
  return svg;
}

function szintezisNyilVonal(svg, kezdet, veg, hegy = true) {
  if (Math.hypot(veg.x - kezdet.x, veg.y - kezdet.y) < 2) {
    return;
  }

  const vonal = document.createElementNS("http://www.w3.org/2000/svg", "line");
  vonal.setAttribute("class", "szintezis-nyil-vonal");
  vonal.setAttribute("x1", String(kezdet.x));
  vonal.setAttribute("y1", String(kezdet.y));
  vonal.setAttribute("x2", String(veg.x));
  vonal.setAttribute("y2", String(veg.y));
  vonal.setAttribute("stroke", "#bda5ff");
  vonal.setAttribute("stroke-width", "2.5");
  vonal.setAttribute("stroke-linecap", "butt");
  vonal.setAttribute("stroke-linejoin", "miter");

  if (hegy) {
    vonal.setAttribute("marker-end", "url(#szintezis-nyilhegy)");
  }

  svg.append(vonal);
}

function szintezisNyilTorzs(svg, pontok) {
  const tiszta = [];

  for (const pont of pontok) {
    const elozo = tiszta[tiszta.length - 1];

    if (elozo && Math.abs(pont.x - elozo.x) < 0.5 && Math.abs(pont.y - elozo.y) < 0.5) {
      continue;
    }

    tiszta.push(pont);
  }

  if (tiszta.length < 2) {
    return;
  }

  const vonal = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  vonal.setAttribute("class", "szintezis-nyil-vonal");
  vonal.setAttribute("fill", "none");
  vonal.setAttribute("points", tiszta.map((pont) => `${pont.x},${pont.y}`).join(" "));
  vonal.setAttribute("stroke", "#bda5ff");
  vonal.setAttribute("stroke-width", "2.5");
  vonal.setAttribute("stroke-linecap", "butt");
  vonal.setAttribute("stroke-linejoin", "miter");
  vonal.setAttribute("stroke-miterlimit", "8");
  svg.append(vonal);
}

function szintezisGerincX(forras, celok) {
  const atlagX = celok.reduce((osszeg, cel) => osszeg + cel.cx, 0) / celok.length;
  const irany = atlagX >= forras.cx ? 1 : -1;
  const forrasX = forras.cx + irany * forras.rx;
  const azonosOldalon = celok.filter((cel) => (cel.cx - forras.cx) * irany >= 0);
  const mertek = azonosOldalon.length > 0 ? azonosOldalon : celok;
  const szelek = mertek.map((cel) => cel.cx - irany * cel.rx);
  const elsoSzel = irany > 0 ? Math.min(...szelek) : Math.max(...szelek);
  const hezag = (elsoSzel - forrasX) * irany;
  let spineX = hezag >= 8 ? forrasX + irany * (hezag / 2) : forrasX + irany * 28;

  for (let lepes = 0; lepes < celok.length + 2; lepes += 1) {
    const utkozo = [forras, ...celok].find((oval) => Math.abs(spineX - oval.cx) < oval.rx);

    if (!utkozo) {
      break;
    }

    spineX = irany > 0 ? utkozo.cx + utkozo.rx + 16 : utkozo.cx - utkozo.rx - 16;
  }

  return { forrasX, spineX };
}

function szintezisTermekOldala(cel, spineX) {
  const irany = spineX <= cel.cx ? -1 : 1;

  return {
    x: cel.cx + irany * cel.rx,
    y: cel.cy,
  };
}

function szintezisDerekszoguNyil(svg, forras, celok) {
  if (celok.length === 1 && Math.abs(celok[0].cy - forras.cy) < 1) {
    const irany = celok[0].cx >= forras.cx ? 1 : -1;
    const kezdet = { x: forras.cx + irany * forras.rx, y: forras.cy };
    const veg = { x: celok[0].cx - irany * celok[0].rx, y: forras.cy };
    szintezisNyilVonal(svg, kezdet, veg, true);

    return { x: (kezdet.x + veg.x) / 2, y: forras.cy };
  }

  const { forrasX, spineX } = szintezisGerincX(forras, celok);
  const forrasY = forras.cy;
  const magassagok = celok.map((cel) => cel.cy);
  const yMin = Math.min(forrasY, ...magassagok);
  const yMax = Math.max(forrasY, ...magassagok);
  const konyok = [
    { x: forrasX, y: forrasY },
    { x: spineX, y: forrasY },
  ];

  if (yMax > forrasY + 0.01) {
    konyok.push({ x: spineX, y: yMax });
  } else if (yMin < forrasY - 0.01) {
    konyok.push({ x: spineX, y: yMin });
  }

  szintezisNyilTorzs(svg, konyok);

  if (yMin < forrasY - 0.01 && yMax > forrasY + 0.01) {
    szintezisNyilVonal(svg, { x: spineX, y: forrasY }, { x: spineX, y: yMin }, false);
  }

  for (const cel of celok) {
    szintezisNyilVonal(svg, { x: spineX, y: cel.cy }, szintezisTermekOldala(cel, spineX), true);
  }

  return { x: (forrasX + spineX) / 2, y: forrasY };
}

function szintezisMegjelenitettBlokkok(kizarandok = []) {
  const munka = szintezisMunkaTeglalap();

  if (!munka) {
    return [];
  }

  const kizar = new Set(kizarandok);
  const blokkok = [];

  for (const elem of document.querySelectorAll(
    "#szintezis-kepernyo .szintezis-utvonal > .szintezis-vegyulet, #szintezis-kepernyo .szintezis-termek.szintezis-termek-szabad"
  )) {
    if (kizar.has(elem)) {
      continue;
    }

    const teglalap = elem.getBoundingClientRect();

    if (teglalap.width < 1 || teglalap.height < 1) {
      continue;
    }

    const arany = szintezisNezetArany();
    blokkok.push({
      bal: (teglalap.left - munka.left) / arany,
      felso: (teglalap.top - munka.top) / arany,
      szelesseg: teglalap.width / arany,
      magassag: teglalap.height / arany,
    });
  }

  return blokkok;
}

function szintezisAtfedesTerulete(
  bal,
  felso,
  szelesseg,
  magassag,
  foglaltak,
  hezag
) {
  let terulet = 0;

  for (const blokk of foglaltak) {
    const metszetSzelesseg =
      Math.min(bal + szelesseg, blokk.bal + blokk.szelesseg + hezag) -
      Math.max(bal, blokk.bal - hezag);
    const metszetMagassag =
      Math.min(felso + magassag, blokk.felso + blokk.magassag + hezag) -
      Math.max(felso, blokk.felso - hezag);

    if (metszetSzelesseg > 0 && metszetMagassag > 0) {
      terulet += metszetSzelesseg * metszetMagassag;
    }
  }

  return terulet;
}

function szintezisPozicioKeresese(
  bal,
  felso,
  szelesseg,
  magassag,
  foglaltak,
  hezag
) {
  const keret = szintezisLathatoKeret();
  let legjobb = null;

  function vizsgal(x, y) {
    const korlat = szintezisPozicioKorlatozasa(x, y, szelesseg, magassag);
    const terulet = szintezisAtfedesTerulete(
      korlat.bal,
      korlat.felso,
      szelesseg,
      magassag,
      foglaltak,
      hezag
    );
    const tav = Math.hypot(korlat.bal - bal, korlat.felso - felso);

    if (
      !legjobb ||
      terulet < legjobb.terulet - 0.5 ||
      (Math.abs(terulet - legjobb.terulet) <= 0.5 && tav < legjobb.tav - 0.5)
    ) {
      legjobb = {
        bal: korlat.bal,
        felso: korlat.felso,
        terulet,
        tav,
      };
    }
  }

  vizsgal(bal, felso);

  if (legjobb.terulet <= 0.5 || !keret) {
    return legjobb;
  }

  const maxBal = keret.bal + Math.max(0, keret.szelesseg - szelesseg);
  const maxFelso = keret.felso + Math.max(0, keret.magassag - magassag);

  for (const blokk of foglaltak) {
    const jobb = blokk.bal + blokk.szelesseg + hezag;
    const alatt = blokk.felso + blokk.magassag + hezag;

    vizsgal(jobb, felso);
    vizsgal(jobb, blokk.felso);
    vizsgal(bal, alatt);
    vizsgal(blokk.bal, alatt);
    vizsgal(blokk.bal - szelesseg - hezag, blokk.felso);
    vizsgal(blokk.bal, blokk.felso - magassag - hezag);
  }

  vizsgal(maxBal, felso);
  vizsgal(bal, maxFelso);
  vizsgal(keret.bal, keret.felso);
  vizsgal(maxBal, keret.felso);
  vizsgal(keret.bal, maxFelso);
  vizsgal(maxBal, maxFelso);

  const lepes = 16;

  for (let y = keret.felso; y <= maxFelso + 0.01; y += lepes) {
    for (let x = keret.bal; x <= maxBal + 0.01; x += lepes) {
      vizsgal(x, y);
    }
  }

  return legjobb;
}

function szintezisUjTermekPozicioja(
  bal,
  felso,
  szelesseg,
  magassag,
  foglaltak
) {
  const hezaggal = szintezisPozicioKeresese(
    bal,
    felso,
    szelesseg,
    magassag,
    foglaltak,
    12
  );

  if (
    hezaggal?.terulet <= 0.5 &&
    szintezisKeretbeFer(hezaggal.bal, hezaggal.felso, szelesseg, magassag)
  ) {
    return { bal: hezaggal.bal, felso: hezaggal.felso };
  }

  const szorosan = szintezisPozicioKeresese(
    bal,
    felso,
    szelesseg,
    magassag,
    foglaltak,
    0
  );

  if (
    szorosan?.terulet <= 0.5 &&
    szintezisKeretbeFer(szorosan.bal, szorosan.felso, szelesseg, magassag)
  ) {
    return { bal: szorosan.bal, felso: szorosan.felso };
  }

  return null;
}

function szintezisKeretbeFer(bal, felso, szelesseg, magassag) {
  const keret = szintezisLathatoKeret();

  if (!keret) {
    return false;
  }

  return (
    bal >= keret.bal - 0.5 &&
    felso >= keret.felso - 0.5 &&
    bal + szelesseg <= keret.bal + keret.szelesseg + 0.5 &&
    felso + magassag <= keret.felso + keret.magassag + 0.5
  );
}

function szintezisSzabadJeloltek(szelesseg, magassag, foglaltak, hezag) {
  const keret = szintezisLathatoKeret();

  if (!keret) {
    return [];
  }

  const maxBal = keret.bal + Math.max(0, keret.szelesseg - szelesseg);
  const maxFelso = keret.felso + Math.max(0, keret.magassag - magassag);
  const nyers = [
    { bal: keret.bal, felso: keret.felso },
    { bal: maxBal, felso: keret.felso },
    { bal: keret.bal, felso: maxFelso },
    { bal: maxBal, felso: maxFelso },
  ];

  for (const blokk of foglaltak) {
    const jobb = blokk.bal + blokk.szelesseg + hezag;
    const alatt = blokk.felso + blokk.magassag + hezag;

    nyers.push(
      { bal: jobb, felso: blokk.felso },
      { bal: blokk.bal, felso: alatt },
      { bal: jobb, felso: alatt },
      { bal: blokk.bal - szelesseg - hezag, felso: blokk.felso },
      { bal: blokk.bal, felso: blokk.felso - magassag - hezag }
    );
  }

  const tavolsagX = Math.max(0, maxBal - keret.bal);
  const tavolsagY = Math.max(0, maxFelso - keret.felso);
  const lepes =
    Math.ceil(tavolsagX / 16) * Math.ceil(tavolsagY / 16) > 1400 ? 32 : 16;

  for (let y = keret.felso; y <= maxFelso + 0.01; y += lepes) {
    for (let x = keret.bal; x <= maxBal + 0.01; x += lepes) {
      nyers.push({ bal: x, felso: y });
    }
  }

  const jeloltek = [];
  const latott = new Set();

  for (const pont of nyers) {
    const korlat = szintezisPozicioKorlatozasa(
      pont.bal,
      pont.felso,
      szelesseg,
      magassag
    );

    if (
      szintezisAtfedesTerulete(
        korlat.bal,
        korlat.felso,
        szelesseg,
        magassag,
        foglaltak,
        hezag
      ) > 0.5 ||
      !szintezisKeretbeFer(korlat.bal, korlat.felso, szelesseg, magassag)
    ) {
      continue;
    }

    const kulcs = `${Math.round(korlat.bal)}:${Math.round(korlat.felso)}`;

    if (latott.has(kulcs)) {
      continue;
    }

    latott.add(kulcs);
    jeloltek.push(korlat);
  }

  return jeloltek;
}

function szintezisPozicioUtkozik(elso, elsoMeret, masodik, masodikMeret, hezag) {
  return (
    szintezisAtfedesTerulete(
      elso.bal,
      elso.felso,
      elsoMeret.szelesseg,
      elsoMeret.magassag,
      [
        {
          bal: masodik.bal,
          felso: masodik.felso,
          szelesseg: masodikMeret.szelesseg,
          magassag: masodikMeret.magassag,
        },
      ],
      hezag
    ) > 0.5
  );
}

function szintezisCsoportPoziciok(
  meretek,
  forrasJobb,
  forrasFelso,
  foglaltak,
  hezag
) {
  if (meretek.length === 0) {
    return [];
  }

  const jeloltek = meretek.map((meret) =>
    szintezisSzabadJeloltek(
      meret.szelesseg,
      meret.magassag,
      foglaltak,
      hezag
    )
  );
  const valasztott = [];

  function utkozik(index, pozicio) {
    const meret = meretek[index];

    if (
      !szintezisKeretbeFer(
        pozicio.bal,
        pozicio.felso,
        meret.szelesseg,
        meret.magassag
      ) ||
      szintezisAtfedesTerulete(
        pozicio.bal,
        pozicio.felso,
        meret.szelesseg,
        meret.magassag,
        foglaltak,
        hezag
      ) > 0.5
    ) {
      return true;
    }

    return valasztott.some((masik, masikIndex) =>
      szintezisPozicioUtkozik(
        pozicio,
        meret,
        masik,
        meretek[masikIndex],
        hezag
      )
    );
  }

  function probal(index) {
    if (index >= meretek.length) {
      return true;
    }

    const meret = meretek[index];
    const celFelso =
      index === 0
        ? forrasFelso
        : valasztott[index - 1].felso + meretek[index - 1].magassag + 12;
    const korlat = szintezisPozicioKorlatozasa(
      forrasJobb + 220,
      celFelso,
      meret.szelesseg,
      meret.magassag
    );
    const lista = [];
    const latott = new Set();

    for (const pont of [korlat, ...jeloltek[index]]) {
      const kulcs = `${Math.round(pont.bal)}:${Math.round(pont.felso)}`;

      if (latott.has(kulcs)) {
        continue;
      }

      latott.add(kulcs);
      lista.push({
        ...pont,
        tav: Math.hypot(pont.bal - (forrasJobb + 220), pont.felso - celFelso),
      });
    }

    lista.sort((elso, masodik) => elso.tav - masodik.tav);

    for (const pont of lista) {
      if (utkozik(index, pont)) {
        continue;
      }

      valasztott.push(pont);

      if (probal(index + 1)) {
        return true;
      }

      valasztott.pop();
    }

    return false;
  }

  if (!probal(0)) {
    return null;
  }

  return valasztott.map((pont) => ({ bal: pont.bal, felso: pont.felso }));
}

function szintezisUjTermekCsoport(meretek, forrasJobb, forrasFelso, foglaltak) {
  return (
    szintezisCsoportPoziciok(
      meretek,
      forrasJobb,
      forrasFelso,
      foglaltak,
      12
    ) ??
    szintezisCsoportPoziciok(
      meretek,
      forrasJobb,
      forrasFelso,
      foglaltak,
      0
    )
  );
}

function szintezisFejElhelyezese(fej, kozepX, kozepY, vonallal) {
  const egyseg = fej?.querySelector(".szintezis-nyil-egyseg");
  const nyil = fej?.querySelector(".szintezis-nyil");

  if (!fej || !egyseg) {
    return;
  }

  fej.classList.add("szintezis-nyil-szabad");
  fej.style.left = "0px";
  fej.style.top = "0px";

  const fejTeglalap = fej.getBoundingClientRect();
  const egysegTeglalap = egyseg.getBoundingClientRect();
  const arany = szintezisNezetArany();
  const eltolasX =
    (egysegTeglalap.left + egysegTeglalap.width / 2 - fejTeglalap.left) / arany;
  const eltolasY =
    (egysegTeglalap.top + egysegTeglalap.height / 2 - fejTeglalap.top) / arany;
  const korlat = szintezisPozicioKorlatozasa(
    kozepX - eltolasX,
    kozepY - eltolasY,
    fej.offsetWidth,
    fej.offsetHeight
  );

  fej.style.left = `${korlat.bal}px`;
  fej.style.top = `${korlat.felso}px`;

  if (nyil) {
    nyil.style.visibility = vonallal ? "hidden" : "";
  }
}

function szintezisEgyenkentUjPoziciok(
  termekek,
  forrasJobb,
  forrasFelso,
  foglaltak
) {
  const eredmeny = [];
  const foglalas = foglaltak.map((blokk) => ({ ...blokk }));
  let felso = forrasFelso;

  for (const termek of termekek) {
    const szelesseg = termek.offsetWidth;
    const magassag = termek.offsetHeight;
    const pozicio = szintezisUjTermekPozicioja(
      forrasJobb + 220,
      felso,
      szelesseg,
      magassag,
      foglalas
    );

    if (!pozicio) {
      return null;
    }

    eredmeny.push(pozicio);
    foglalas.push({
      bal: pozicio.bal,
      felso: pozicio.felso,
      szelesseg,
      magassag,
    });
    felso = pozicio.felso + magassag + 12;
  }

  return eredmeny;
}

function szintezisTermekekSzabadra(lepes) {
  const forras = szintezisPeldanyDoboz(lepes?.dataset.szintezisForras);
  const munka = szintezisMunkaTeglalap();
  const termekek = [
    ...(lepes?.querySelectorAll(":scope .szintezis-lepes-termekek > .szintezis-termek") ??
      []),
  ];

  if (!forras || !munka || termekek.length === 0) {
    return true;
  }

  if (!szintezisJatekAllapot.termekPoziciok) {
    szintezisJatekAllapot.termekPoziciok = {};
  }

  const ujak = [];

  for (const termek of termekek) {
    const azonosito = termek.dataset.szintezisPeldany;

    if (!azonosito || szintezisJatekAllapot.termekPoziciok[azonosito]) {
      continue;
    }

    termek.classList.add("szintezis-termek-szabad");
    termek.style.left = "-10000px";
    termek.style.top = "0px";
    ujak.push(termek);
  }

  const foglaltak = szintezisMegjelenitettBlokkok(ujak);
  const forrasTeglalap = forras.getBoundingClientRect();
  const arany = szintezisNezetArany();
  const forrasJobb = (forrasTeglalap.right - munka.left) / arany;
  let kovetkezoFelso = (forrasTeglalap.top - munka.top) / arany;
  const csoport = szintezisUjTermekCsoport(
    ujak.map((termek) => ({
      szelesseg: termek.offsetWidth,
      magassag: termek.offsetHeight,
    })),
    forrasJobb,
    kovetkezoFelso,
    foglaltak
  );
  const poziciok =
    csoport ??
    szintezisEgyenkentUjPoziciok(
      ujak,
      forrasJobb,
      kovetkezoFelso,
      foglaltak
    );

  if (ujak.length > 0 && (!poziciok || poziciok.length !== ujak.length)) {
    for (const termek of ujak) {
      termek.classList.remove("szintezis-termek-szabad");
      termek.style.left = "";
      termek.style.top = "";
    }

    return false;
  }

  let ujIndex = 0;

  for (const termek of termekek) {
    const azonosito = termek.dataset.szintezisPeldany;

    if (!azonosito) {
      continue;
    }

    const szelesseg = termek.offsetWidth;
    const magassag = termek.offsetHeight;

    if (!szintezisJatekAllapot.termekPoziciok[azonosito]) {
      szintezisJatekAllapot.termekPoziciok[azonosito] = poziciok[ujIndex];
      ujIndex += 1;
    }

    const pozicio = szintezisJatekAllapot.termekPoziciok[azonosito];
    termek.classList.add("szintezis-termek-szabad");
    termek.style.left = `${pozicio.bal}px`;
    termek.style.top = `${pozicio.felso}px`;
    foglaltak.push({
      bal: pozicio.bal,
      felso: pozicio.felso,
      szelesseg,
      magassag,
    });
    kovetkezoFelso = pozicio.felso + magassag + 12;
  }

  return true;
}

function szintezisNyilakFrissitese() {
  const svg = szintezisNyilRetege();
  const munka = szintezisNezetElem();

  if (!svg || !munka || munka.clientWidth === 0) {
    return;
  }

  svg.setAttribute("width", String(munka.clientWidth));
  svg.setAttribute("height", String(munka.clientHeight));

  for (const elem of [...svg.children]) {
    if (elem.tagName.toLowerCase() !== "defs") {
      elem.remove();
    }
  }

  const munkaTeglalap = munka.getBoundingClientRect();

  for (const lepes of document.querySelectorAll("#szintezis-kepernyo .szintezis-lepes")) {
    const forras = szintezisPeldanyDoboz(lepes.dataset.szintezisForras);
    const fej = lepes.querySelector(".szintezis-lepes-fej");
    const termekek = [
      ...lepes.querySelectorAll(":scope .szintezis-lepes-termekek > .szintezis-termek"),
    ];

    if (!forras || !fej || !szintezisLepesFejLathato(lepes)) {
      continue;
    }

    if (!fej.classList.contains("szintezis-nyil-szabad")) {
      fej.classList.add("szintezis-nyil-szabad");
      fej.style.left = "0px";
      fej.style.top = "0px";
    }

    if (termekek.length === 0) {
      const egyseg = fej.querySelector(".szintezis-nyil-egyseg");
      const forrasTeglalap = forras.getBoundingClientRect();
      const oval = szintezisOvalisAdat(forras);
      const szelesseg = egyseg?.offsetWidth ?? fej.offsetWidth;

      if (!oval) {
        continue;
      }

      szintezisFejElhelyezese(
        fej,
        (forrasTeglalap.right - munkaTeglalap.left) / szintezisNezetArany() +
          16 +
          szelesseg / 2,
        oval.cy,
        false
      );
      continue;
    }

    const forrasOval = szintezisOvalisAdat(forras);

    if (!forrasOval) {
      continue;
    }

    const celOvalok = termekek
      .map((termek) => szintezisOvalisAdat(termek))
      .filter(Boolean);

    if (celOvalok.length === 0) {
      continue;
    }

    const kozep = szintezisDerekszoguNyil(svg, forrasOval, celOvalok);
    szintezisFejElhelyezese(fej, kozep.x, kozep.y, true);
  }
}

function szintezisTermekMenu(event) {
  if (event.target.closest?.("#szintezis-kepernyo .szintezis-termek")) {
    event.preventDefault();
  }
}

function szintezisTermekPointerDown(event) {
  if (
    szintezisNezetKetMutato() ||
    kattintasosAtomelhelyezes ||
    !szintezisUjPointerEngedelyezett(event)
  ) {
    return;
  }

  const doboz = event.target.closest?.("#szintezis-kepernyo .szintezis-termek");

  if (!doboz?.dataset.szintezisPeldany || !doboz.classList.contains("szintezis-termek-szabad")) {
    return;
  }

  const pointerId = event.pointerId;
  const kezdX = event.clientX;
  const kezdY = event.clientY;
  const azonosito = doboz.dataset.szintezisPeldany;
  const kezdo = {
    ...(szintezisJatekAllapot.termekPoziciok[azonosito] ?? {
      bal: doboz.offsetLeft,
      felso: doboz.offsetTop,
    }),
  };
  let huzva = false;

  function mozgas(e) {
    if (!doboz.isConnected) {
      szintezisFolyamatbanLevoHuzasLezarasa();
      return;
    }

    const tav = Math.hypot(e.clientX - kezdX, e.clientY - kezdY);

    if (!huzva && tav < SZINTEZIS_HUZAS_KUSZOB) {
      return;
    }

    if (!huzva) {
      huzva = true;
      szintezisHuzasElmozdult(pointerId);
      doboz.classList.add("szintezis-termek-huzasban");
    }

    if (e.cancelable) {
      e.preventDefault();
    }

    const arany = szintezisNezetArany();
    const korlat = szintezisPozicioKorlatozasa(
      kezdo.bal + (e.clientX - kezdX) / arany,
      kezdo.felso + (e.clientY - kezdY) / arany,
      doboz.offsetWidth,
      doboz.offsetHeight
    );
    szintezisJatekAllapot.termekPoziciok[azonosito] = korlat;
    doboz.style.left = `${korlat.bal}px`;
    doboz.style.top = `${korlat.felso}px`;
    szintezisNyilakFrissitese();
  }

  szintezisHuzasFigyeloInditasa(doboz, pointerId, {
    mozgas,
    felengedes(e) {
      if (doboz.isConnected) {
        mozgas(e);
      }

      doboz.classList.remove("szintezis-termek-huzasban");

      if (huzva) {
        szintezisHuzasKattintasJeloles();
      }
    },
  });

  if (szintezisAktivHuzas?.pointerId === pointerId) {
    szintezisAktivHuzas.esemeny = event;
  }
}

function szintezisKezdoElhelyezese() {
  const munka = document.getElementById("szintezis-munkaterulet");
  const utvonal = document.querySelector(
    "#szintezis-kepernyo .szintezis-utvonal"
  );
  const oval = utvonal?.querySelector(
    ":scope > .szintezis-vegyulet .szintezis-molekula-abra"
  );

  if (!munka || !utvonal || !oval) {
    return;
  }

  utvonal.style.top = "";
  utvonal.style.marginTop = "0px";
  const munkaTeglalap = munka.getBoundingClientRect();
  const nezetTeglalap =
    document.getElementById("szintezis-nezet")?.getBoundingClientRect() ??
    munkaTeglalap;
  const ovalTeglalap = oval.getBoundingClientRect();
  const eltolas =
    (munkaTeglalap.top +
      munkaTeglalap.height / 2 -
      nezetTeglalap.top -
      (ovalTeglalap.top + ovalTeglalap.height / 2 - nezetTeglalap.top)) /
    szintezisNezetArany();

  utvonal.style.marginTop = `${eltolas}px`;
  szintezisNyilakFrissitese();
}

function szintezisFeladatMezoMegjelenitese() {
  const feladat = szintezisJatekAllapot.feladat ?? szintezisUresFeladat();

  szintezisMolekulaKirajzolasa(
    "szintezis-kezdo-abra",
    "szintezis-kezdo-nev",
    feladat.kezdoMolekula
  );

  szintezisMolekulaKirajzolasa(
    "szintezis-cel-abra",
    "szintezis-cel-nev",
    feladat.celMolekula
  );
}

function szintezisKivalasztottLehetoseg(lehetosegek) {
  const feladat = szintezisJatekAllapot.feladat;
  const kezdoId = szintezisMolekulaAzonosito(feladat?.kezdoMolekula);
  const celId = szintezisMolekulaAzonosito(feladat?.celMolekula);

  if (!kezdoId || !celId) {
    return null;
  }

  return (
    lehetosegek.find(
      (lehetoseg) =>
        szintezisMolekulaAzonosito(lehetoseg?.kezdoMolekula) === kezdoId &&
        szintezisMolekulaAzonosito(lehetoseg?.celMolekula) === celId
    ) ?? null
  );
}

function szintezisFeladatElsoReakcioja(
  kezdoMolekula,
  celMolekula,
  reakciok,
  lehetosegek
) {
  const kezdoId = szintezisMolekulaAzonosito(kezdoMolekula);
  const celId = szintezisMolekulaAzonosito(celMolekula);
  const tavolsag = lehetosegek.find(
    (lehetoseg) =>
      szintezisMolekulaAzonosito(lehetoseg?.kezdoMolekula) === kezdoId &&
      szintezisMolekulaAzonosito(lehetoseg?.celMolekula) === celId
  )?.lepesek;

  if (!kezdoId || !celId || !tavolsag) {
    return null;
  }

  return (
    (Array.isArray(reakciok) ? reakciok : []).find((reakcio) => {
      if (szintezisMolekulaAzonosito(reakcio?.kiindulasi) !== kezdoId) {
        return false;
      }

      return szintezisReakcioTermekAzonositok(reakcio).some((termekId) => {
        if (!termekId || termekId === kezdoId) {
          return false;
        }

        if (termekId === celId) {
          return tavolsag === 1;
        }

        const tovabbiLepesek = lehetosegek.find(
          (lehetoseg) =>
            szintezisMolekulaAzonosito(lehetoseg?.kezdoMolekula) === termekId &&
            szintezisMolekulaAzonosito(lehetoseg?.celMolekula) === celId
        )?.lepesek;

        return tovabbiLepesek === tavolsag - 1;
      });
    }) ?? null
  );
}

function szintezisFeladatInditasa(reakciok) {
  const lehetosegek = szintezisFeladatLehetosegek(reakciok);

  if (lehetosegek.length === 0) {
    szintezisJatekAllapot.aktualisReakcio = null;
    szintezisFeladatTorlese();
    szintezisFeladatMezoMegjelenitese();
    return false;
  }

  if (!szintezisKivalasztottLehetoseg(lehetosegek)) {
    const kivalasztott =
      lehetosegek[Math.floor(Math.random() * lehetosegek.length)];

    szintezisJatekAllapot.feladat = {
      kezdoMolekula: kivalasztott.kezdoMolekula,
      celMolekula: kivalasztott.celMolekula,
    };
  }

  const feladat = szintezisJatekAllapot.feladat;
  szintezisJatekAllapot.aktualisReakcio = szintezisFeladatElsoReakcioja(
    feladat.kezdoMolekula,
    feladat.celMolekula,
    reakciok,
    lehetosegek
  );
  szintezisFeladatMezoMegjelenitese();

  return Boolean(szintezisJatekAllapot.aktualisReakcio);
}

let szintezisInditasFolyamatban = false;

gombBekotes("szintezis-inditas", async () => {
  if (szintezisInditasFolyamatban) return;
  szintezisInditasFolyamatban = true;
  szintezisMunkamenetAlaphelyzet();

  betoltesKepernyoMegjelenitese();
  betoltesUzenetFrissitese("Molekulák és reakciók betöltése…");
  szintezisValasztasokAlaphelyzete();

  try {
    await molekulaNevtarBetolteseAdatbazisbol(150);
    const reakciok = await szintezisReakciokBetoltese(0);

    if (!szintezisJatekTablazatEpitese(reakciok)) {
      const uresCim = szintezisAktivLepes()?.querySelector(
        ".szintezis-reakcio-cim"
      );

      if (uresCim) {
        uresCim.textContent = "";
        uresCim.hidden = false;
        uresCim.classList.add("szintezis-reakcio-cim-rejtett");
      }

      szintezisVisszajelzes("Nincs elérhető szintézisfeladat.");
    } else {
      szintezisVisszajelzes("");
    }

    kepernyoValtas("szintezisverseny");
    szintezisKezdoElhelyezese();
    szintezisPontszamMegjelenitese();

    await jatekTenylegesInditasaraVarakozas();

    if (!document.getElementById("szintezis-kepernyo")?.hidden) {
      szintezisIdozitoInditasa();
    }
  } catch (hiba) {
    console.error("[SZINTÉZIS] Az indítás sikertelen:", hiba);
    window.alert("A szintézis játék indítása sikertelen.");
  } finally {
    betoltesKepernyoElrejtese();
    szintezisInditasFolyamatban = false;
  }
});

// Visszalépés a menübe
gombBekotes(
  "molekula-vissza",
  () => {
    if (
      tanoraiTanuloModAktiv()
    ) {
      console.warn(
        "[TANÓRA] A tanulói játékból a Főmenübe lépés letiltva."
      );

      debug(
        "Tanulói Főmenübe lépési kísérlet megakadályozva"
      );

      return;
    }

    molekulaJatekIdozitoLeallitasa();

    kepernyoValtas(
      "fomenu"
    );
  }
);

gombBekotes("szintezis-vissza", () => kepernyoValtas("fomenu"));

gombBekotes(
  "admin-vissza",
  () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("admin");

    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + url.search + url.hash
    );

    kepernyoValtas("fomenu");
  }
);

// ==================================================
// ADMINFELÜLET ÁLLAPOTA ÉS BEJELENTKEZÉS
// ==================================================

const ADMIN_MUNKAMENET_KULCS =
  "szerves-jatek-admin-munkamenet";

const adminAllapot = {
  accessToken: null,
  refreshToken: null,
  felhasznaloEmail: null,
  molekulak: [],
  polimerAlapok: [],
    aktivPolimerKulcsok: [],
kivalasztottPolimerAlapId: null,
kivalasztottMasodikPolimerAlapId: null,
kivalasztottPolimerKotesIndex: null,
polimerReakcioMod: null,
polimerSztereoKonfiguracio: null,
polimerDien14Adatok: null,
polimerElozetAdat: null,
kivalasztottMolekulaId: null,
};

function adatbazisAlapUrl() {
  return ADATBAZIS_BEALLITASOK
    .url
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/, "");
}

const MOLEKULA_CSALAD_CSOPORTOK = [
  { id: "szenhidrogen", cim: "Szénhidrogének" },
  { id: "oxigen", cim: "Oxigéntartalmú vegyületek" },
  { id: "nitrogen", cim: "Nitrogéntartalmú vegyületek" },
  { id: "ken", cim: "Kéntartalmú vegyületek" },
  { id: "halogen", cim: "Halogéntartalmú vegyületek" },
  { id: "foszfor", cim: "Foszfortartalmú vegyületek" },
  { id: "szilicium", cim: "Szilíciumtartalmú vegyületek" },
  { id: "szerkezeti", cim: "Szerkezeti címkék" },
];

const MOLEKULA_CSALAD_CSOPORT_TAGOK = {
  szenhidrogen: [
    "alkan",
    "alken",
    "alkilbenzol",
    "alkin",
    "aromas",
    "dien",
    "konjugalt-dien",
    "szenhidrogen",
  ],
  oxigen: [
    "aldehid",
    "aldoz",
    "alfa-diketon",
    "alkohol",
    "amid",
    "aminosav",
    "beta-diketon",
    "ciklikus-felacetal",
    "cukor",
    "dialdehid",
    "dikarbonsav",
    "dikarbonsav-eszter",
    "diketon",
    "diol",
    "eszter",
    "eter",
    "fenol",
    "foszfat-eszter",
    "foszfin-oxid",
    "foszfit",
    "foszfit-eszter",
    "foszfonsav",
    "furanoz",
    "geminalis-diol",
    "hidroxi-aldehid",
    "hidroxi-eszter",
    "hidroxi-karbonsav",
    "hidroxi-keton",
    "karbamid",
    "karbonsav",
    "keton",
    "ketoz",
    "oxo-eszter",
    "oxokarbonsav",
    "poliamid",
    "polieszter",
    "primer-amid",
    "savanhidrid",
    "savhalogenid",
    "szekunder-amid",
    "szilandiol",
    "szilanol",
    "szilil-eter",
    "sziloxan",
    "szulfinsav",
    "szulfon",
    "szulfonamid",
    "szulfonsav",
    "szulfoxid",
    "tercier-amid",
    "trikarbonsav",
    "triol",
  ],
  nitrogen: [
    "amid",
    "amin",
    "aminosav",
    "diamin",
    "karbamid",
    "nitril",
    "poliamid",
    "primer-amid",
    "primer-amin",
    "szekunder-amid",
    "szekunder-amin",
    "szulfonamid",
    "tercier-amid",
    "tercier-amin",
  ],
  ken: [
    "diszulfid",
    "szulfinsav",
    "szulfon",
    "szulfonamid",
    "szulfonsav",
    "szulfoxid",
    "tioeter",
    "tiokarbonil",
    "tiol",
  ],
  halogen: [
    "alkil-halogenid",
    "aril-halogenid",
    "halogenezett",
    "klorszilan",
    "savhalogenid",
  ],
  foszfor: [
    "foszfat-eszter",
    "foszfin",
    "foszfin-oxid",
    "foszfit",
    "foszfit-eszter",
    "foszfonsav",
  ],
  szilicium: [
    "klorszilan",
    "organoszilan",
    "szilandiol",
    "szilanol",
    "szilil-eter",
    "sziloxan",
  ],
};

function molekulaCsaladCsoportjai(csalad) {
  const csoportok = MOLEKULA_CSALAD_CSOPORTOK
    .map((csoport) => csoport.id)
    .filter((csoportId) =>
      MOLEKULA_CSALAD_CSOPORT_TAGOK[csoportId]?.includes(csalad)
    );

  return csoportok.length > 0
    ? csoportok
    : ["szerkezeti"];
}

function csaladCsoportAllapotFrissitese(tarolo) {
  for (const csoport of tarolo.querySelectorAll(".csalad-csoport")) {
    const mind = csoport.querySelector("[data-csoport-mind]");
    const csaladok = [
      ...csoport.querySelectorAll("input[data-csalad]"),
    ];

    if (!mind || csaladok.length === 0) {
      continue;
    }

    const bejelolt = csaladok.filter((jelolo) => jelolo.checked).length;
    mind.indeterminate =
      bejelolt > 0 && bejelolt < csaladok.length;
    mind.checked = bejelolt === csaladok.length;
  }
}

function csaladKijelolesSzinkronizalasa(tarolo, csalad, bejelolve) {
  for (const jelolo of tarolo.querySelectorAll("input[data-csalad]")) {
    if (jelolo.value === csalad) {
      jelolo.checked = bejelolve;
    }
  }
}

function csaladValasztoEsemenyek(tarolo) {
  if (tarolo.dataset.valasztoBekotve === "1") {
    return;
  }

  tarolo.dataset.valasztoBekotve = "1";

  tarolo.addEventListener("change", (event) => {
    const cel = event.target;

    if (!(cel instanceof HTMLInputElement)) {
      return;
    }

    if (cel.dataset.csoportMind) {
      const csoport = cel.closest(".csalad-csoport");
      cel.indeterminate = false;

      for (const jelolo of csoport.querySelectorAll("input[data-csalad]")) {
        csaladKijelolesSzinkronizalasa(
          tarolo,
          jelolo.value,
          cel.checked
        );
      }

      csaladCsoportAllapotFrissitese(tarolo);
      return;
    }

    if (!cel.dataset.csalad) {
      return;
    }

    csaladKijelolesSzinkronizalasa(tarolo, cel.value, cel.checked);
    csaladCsoportAllapotFrissitese(tarolo);
  });

  tarolo.addEventListener("click", (event) => {
    const gomb = event.target.closest(".csalad-csoport-nyito");

    if (!gomb || !tarolo.contains(gomb)) {
      return;
    }

    const lista = document.getElementById(
      gomb.getAttribute("aria-controls")
    );
    const nyitva = gomb.getAttribute("aria-expanded") === "true";

    gomb.setAttribute("aria-expanded", nyitva ? "false" : "true");

    if (lista) {
      lista.hidden = nyitva;
    }
  });
}

function csaladCsoportokMegjelenitese(tarolo, mod, csaladok) {
  const csoportTagok = new Map(
    MOLEKULA_CSALAD_CSOPORTOK.map((csoport) => [csoport.id, []])
  );

  for (const csalad of csaladok) {
    if (typeof csalad !== "string" || !csalad.trim()) {
      continue;
    }

    for (const csoportId of molekulaCsaladCsoportjai(csalad)) {
      csoportTagok.get(csoportId)?.push(csalad);
    }
  }

  tarolo.replaceChildren();

  for (const csoport of MOLEKULA_CSALAD_CSOPORTOK) {
    const tagok = csoportTagok.get(csoport.id) ?? [];

    if (tagok.length === 0) {
      continue;
    }

    tagok.sort((elso, masodik) => elso.localeCompare(masodik, "hu"));

    const doboz = document.createElement("div");
    doboz.className = "csalad-csoport";

    const fej = document.createElement("div");
    fej.className = "csalad-csoport-fej";

    const mind = document.createElement("input");
    mind.type = "checkbox";
    mind.className = "csalad-csoport-mind";
    mind.dataset.csoportMind = csoport.id;
    mind.checked = true;
    mind.setAttribute(
      "aria-label",
      `Az összes család ebben a csoportban: ${csoport.cim}`
    );

    const listaId = `${mod}-csalad-${csoport.id}`;
    const nyito = document.createElement("button");
    nyito.type = "button";
    nyito.className = "csalad-csoport-nyito";
    nyito.setAttribute("aria-expanded", "false");
    nyito.setAttribute("aria-controls", listaId);

    const cim = document.createElement("span");
    cim.className = "csalad-csoport-nyito-cim";
    cim.textContent = csoport.cim;
    nyito.append(cim);

    fej.append(mind, nyito);

    const lista = document.createElement("div");
    lista.id = listaId;
    lista.className = "csalad-csoport-lista";
    lista.hidden = true;

    for (const csalad of tagok) {
      const cimke = document.createElement("label");
      cimke.className = "molekula-csalad-opcio";

      const jelolo = document.createElement("input");
      jelolo.type = "checkbox";
      jelolo.value = csalad;
      jelolo.dataset.csalad = csalad;
      jelolo.checked = true;

      cimke.append(jelolo, document.createTextNode(csalad));
      lista.append(cimke);
    }

    doboz.append(fej, lista);
    tarolo.append(doboz);
  }

  csaladValasztoEsemenyek(tarolo);
}

async function molekulaSzurokBetoltese() {
  const adatok =
    await window.JatekAdatok.szurokLekerdezese();

  if (
    !Array.isArray(adatok?.csaladok) ||
    !Array.isArray(adatok?.nehezsegek)
  ) {
    throw new Error("A szűrők adatai hiányosak.");
  }

  const nehezsegFeliratok = {
    1: "Könnyű (1. szint)",
    2: "Közepes (1–2. szint)",
    3: "Nehéz (1–3. szint)"
  };

  for (const mod of ["egyeni", "tanora"]) {
    const nehezsegElem = document.getElementById(
      mod + "-nehezseg"
    );

    const csaladokElem = document.getElementById(
      mod + "-csaladok"
    );

    if (!nehezsegElem || !csaladokElem) continue;

    nehezsegElem.replaceChildren();

    for (const nehezseg of adatok.nehezsegek) {
      const felirat = nehezsegFeliratok[nehezseg];

      if (felirat) {
        nehezsegElem.add(
          new Option(felirat, String(nehezseg))
        );
      }
    }

    nehezsegElem.value = "1";

    csaladCsoportokMegjelenitese(
      csaladokElem,
      mod,
      adatok.csaladok
    );
  }

  return adatok;
}

const molekulaSzurokBetolteseIgeret =
  molekulaSzurokBetoltese().catch((hiba) => {
    console.error("[SZŰRŐK]", hiba);

    for (const id of ["egyeni-csaladok", "tanora-csaladok"]) {
      const elem = document.getElementById(id);
      if (elem) {
        elem.textContent = "A családok betöltése sikertelen.";
      }
    }

    document.getElementById("molekula-inditas")?.setAttribute("disabled", "");
    document.getElementById("tanora-letrehozas")?.setAttribute("disabled", "");

    return null;
  });

  async function molekulaSzuroBeallitasokKiolvasasa(mod) {
  const betoltottAdatok = await molekulaSzurokBetolteseIgeret;

  if (!betoltottAdatok) {
    throw new Error("A molekulacsaládok listája nem töltődött be.");
  }

  const nehezsegElem = document.getElementById(`${mod}-nehezseg`);
  const csaladokElem = document.getElementById(`${mod}-csaladok`);
  const maxNehezseg = Number(nehezsegElem?.value);

  if (
    ![1, 2, 3].includes(maxNehezseg) ||
    !csaladokElem
  ) {
    throw new Error("Érvénytelen nehézségi beállítás.");
  }

  const jelolok = [
    ...csaladokElem.querySelectorAll('input[type="checkbox"][data-csalad]'),
  ];
  const csaladok = [...new Set(jelolok.map((jelolo) => jelolo.value))];
  const bejeloltCsaladok = new Set(
    jelolok
      .filter((jelolo) => jelolo.checked)
      .map((jelolo) => jelolo.value)
  );

  if (
    csaladok.length === 0 ||
    bejeloltCsaladok.size === 0
  ) {
    throw new Error("Legalább egy molekulacsaládot jelölj be.");
  }

  return {
    maxNehezseg,
    tiltottCsaladok: csaladok.filter(
      (csalad) => !bejeloltCsaladok.has(csalad)
    ),
    /*
     * Az egyéni játék mindig az új
     * „legalább egy bejelölt család”
     * szabályt használja.
     */
    csaladSzuroVerzio: 2,
  };
}

function adminMunkamenetMentese(
  munkamenet
) {
  adminAllapot.accessToken =
    munkamenet.access_token ?? null;

  adminAllapot.refreshToken =
    munkamenet.refresh_token ?? null;

  adminAllapot.felhasznaloEmail =
    munkamenet.user?.email ?? null;

  sessionStorage.setItem(
    ADMIN_MUNKAMENET_KULCS,
    JSON.stringify({
      accessToken:
        adminAllapot.accessToken,

      refreshToken:
        adminAllapot.refreshToken,

      felhasznaloEmail:
        adminAllapot
          .felhasznaloEmail,
    })
  );
}

function adminMunkamenetBetoltese() {
  sessionStorage.removeItem(
    ADMIN_MUNKAMENET_KULCS
  );

  adminAllapot.accessToken = null;
  adminAllapot.refreshToken = null;
  adminAllapot.email = null;

  return false;
}

function adminMunkamenetTorlese() {
  adminAllapot.accessToken = null;
  adminAllapot.refreshToken = null;
  adminAllapot.felhasznaloEmail =
    null;

  adminAllapot.molekulak = [];
  adminAllapot
    .kivalasztottMolekulaId =
    null;

  sessionStorage.removeItem(
    ADMIN_MUNKAMENET_KULCS
  );
}

async function adminBejelentkezes(
  email,
  jelszo
) {
  const valasz =
    await fetch(
      `${adatbazisAlapUrl()}/auth/v1/token?grant_type=password`,
      {
        method: "POST",

        headers: {
          apikey:
            ADATBAZIS_BEALLITASOK
              .publishableKey,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          email,
          password: jelszo,
        }),

        cache: "no-store",
      }
    );

  const adat =
    await valasz.json();

  if (!valasz.ok) {
    throw new Error(
      adat.error_description ??
      adat.msg ??
      adat.message ??
      "Sikertelen bejelentkezés."
    );
  }

  if (
    typeof adat.access_token !==
      "string"
  ) {
    throw new Error(
      "A bejelentkezés nem adott hozzáférési tokent."
    );
  }

  adminMunkamenetMentese(adat);

  return adat;
}

async function adminTokenFrissitese() {
  if (
    !adminAllapot.refreshToken
  ) {
    throw new Error(
      "A munkamenet lejárt. Jelentkezz be újra!"
    );
  }

  const valasz =
    await fetch(
      `${adatbazisAlapUrl()}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",

        headers: {
          apikey:
            ADATBAZIS_BEALLITASOK
              .publishableKey,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          refresh_token:
            adminAllapot
              .refreshToken,
        }),

        cache: "no-store",
      }
    );

  const adat =
    await valasz.json();

  if (!valasz.ok) {
    adminMunkamenetTorlese();

    throw new Error(
      "A munkamenet lejárt. Jelentkezz be újra!"
    );
  }

  adminMunkamenetMentese(adat);

  return adat.access_token;
}

async function adminApiHivas(
  torzs,
  ujraproba = true
) {
  if (
    !adminAllapot.accessToken
  ) {
    throw new Error(
      "A művelethez bejelentkezés szükséges."
    );
  }

  const valasz =
    await fetch(
      `${adatbazisAlapUrl()}/functions/v1/molekula-admin`,
      {
        method: "POST",

        headers: {
          apikey:
            ADATBAZIS_BEALLITASOK
              .publishableKey,

          Authorization:
            `Bearer ${
              adminAllapot.accessToken
            }`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify(torzs),

        cache: "no-store",
      }
    );

  /*
   * Lejárt hozzáférési token esetén
   * egyszer automatikusan frissítünk.
   */

  if (
    valasz.status === 401 &&
    ujraproba &&
    adminAllapot.refreshToken
  ) {
    await adminTokenFrissitese();

    return adminApiHivas(
      torzs,
      false
    );
  }

  const valaszSzoveg =
    await valasz.text();

  let adat;

  try {
    adat = valaszSzoveg
      ? JSON.parse(valaszSzoveg)
      : {};
  } catch {
    throw new Error(
      "Az admin API érvénytelen választ adott."
    );
  }

  if (
    !valasz.ok ||
    adat.sikeres === false
  ) {
    throw new Error(
      adat.hiba ??
      `HTTP ${valasz.status}`
    );
  }

  return adat;
}

async function tanoraApiHivas(
  torzs,
  ujraproba = true
) {
  if (!adminAllapot.accessToken) {
    throw new Error(
      "A művelethez bejelentkezés szükséges."
    );
  }

  const valasz =
    await fetch(
      `${adatbazisAlapUrl()}/functions/v1/tanora-kezeles`,
      {
        method: "POST",

        headers: {
          apikey:
            ADATBAZIS_BEALLITASOK
              .publishableKey,

          Authorization:
            `Bearer ${
              adminAllapot.accessToken
            }`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(torzs),
        cache: "no-store",
      }
    );

  if (
    valasz.status === 401 &&
    ujraproba &&
    adminAllapot.refreshToken
  ) {
    await adminTokenFrissitese();

    return tanoraApiHivas(
      torzs,
      false
    );
  }

  const valaszSzoveg =
    await valasz.text();

  let adat;

  try {
    adat = valaszSzoveg
      ? JSON.parse(valaszSzoveg)
      : {};
  } catch {
    throw new Error(
      "A tanórai API érvénytelen választ adott."
    );
  }

  if (
    !valasz.ok ||
    adat.sikeres === false
  ) {
    throw new Error(
      adat.hiba ??
      `HTTP ${valasz.status}`
    );
  }

  return adat;
}

const tanoraFelugyeletAllapot = {
  tanoraId: null,
  frissitesiId: null,
  frissitesFolyamatban: false,
};


function tanoraJatekosListaMegjelenitese(
  tanora,
  jatekosok
) {
  const panel =
    document.getElementById(
      "tanora-jatekos-panel"
    );

  const darabElem =
    document.getElementById(
      "tanora-jatekos-darab"
    );

  const lista =
    document.getElementById(
      "tanora-jatekos-lista"
    );

  const inditasGomb =
    document.getElementById(
      "tanora-inditas"
    );

  if (panel) {
    panel.hidden = false;
  }

  if (darabElem) {
    darabElem.textContent =
      String(jatekosok.length);
  }

  if (lista) {
    lista.replaceChildren();

    if (jatekosok.length === 0) {
      const uresElem =
        document.createElement("p");

      uresElem.className =
        "tanora-jatekos-ures";

      uresElem.textContent =
        "Még senki sem csatlakozott.";

      lista.append(uresElem);
    } else {
      const allapotNevek = {
        csatlakozott:
          "Várakozik",

        jatszik:
          "Játékban",

        befejezte:
          "Befejezte",

        kilepett:
          "Kilépett",
      };

      for (
        const jatekos of jatekosok
      ) {
        const kartya =
          document.createElement(
            "div"
          );

        kartya.className =
          "tanora-jatekos-elem";

        const nev =
          document.createElement(
            "strong"
          );

        nev.textContent =
          jatekos.becenev;

        const allapot =
          document.createElement(
            "span"
          );

                const utolsoJelzes = Date.parse(
  jatekos.utolso_frissites ??
    jatekos.csatlakozva ??
    ""
);

const nincsKapcsolat =
  ["csatlakozott", "jatszik"].includes(
    jatekos.allapot
  ) &&
  Number.isFinite(utolsoJelzes) &&
  Date.now() - utolsoJelzes > 30000;

const allapotSzoveg =
  nincsKapcsolat
    ? "Nincs kapcsolat"
    : allapotNevek[jatekos.allapot] ??
      jatekos.allapot;

        allapot.textContent =
          `${
            jatekos.pont ?? 0
          } pont · ${
            jatekos
              .teljesitett_rendelesek ??
            0
          } rendelés · ${
            allapotSzoveg
          }`;

        kartya.append(
          nev,
          allapot
        );

        lista.append(kartya);
      }
    }
  }

  if (inditasGomb) {
    const varakozik =
      tanora?.allapot ===
        "varakozik";

    inditasGomb.disabled =
      !varakozik ||
      jatekosok.length === 0;

    if (
      tanora?.allapot ===
        "folyamatban"
    ) {
      inditasGomb.textContent =
        "Játék folyamatban";
    } else if (
      tanora?.allapot ===
        "befejezve"
    ) {
      inditasGomb.textContent =
        "Tanóra befejezve";
    } else {
      inditasGomb.textContent =
        "Játék indítása";
    }
  }
}


async function tanoraJatekosListaFrissitese() {
  if (
    !tanoraFelugyeletAllapot
      .tanoraId ||
    !adminAllapot.accessToken ||
    tanoraFelugyeletAllapot
      .frissitesFolyamatban
  ) {
    return;
  }

  tanoraFelugyeletAllapot
    .frissitesFolyamatban = true;

  try {
    const adat =
      await tanoraApiHivas({
        muvelet:
          "reszletek",

        tanoraId:
          tanoraFelugyeletAllapot
            .tanoraId,
      });

    tanoraJatekosListaMegjelenitese(
      adat.tanora,
      Array.isArray(
        adat.jatekosok
      )
        ? adat.jatekosok
        : []
    );
  } finally {
    tanoraFelugyeletAllapot
      .frissitesFolyamatban = false;
  }
}


function tanoraAutomatikusFrissitesInditasa() {
  if (
    tanoraFelugyeletAllapot
      .frissitesiId
  ) {
    window.clearInterval(
      tanoraFelugyeletAllapot
        .frissitesiId
    );
  }

  tanoraFelugyeletAllapot
    .frissitesiId =
      window.setInterval(
        () => {
          tanoraJatekosListaFrissitese()
            .catch((hiba) => {
              console.error(
                "[TANÓRA] A játékoslista frissítése sikertelen:",
                hiba
              );
            });
        },
        3000
      );
}


function tanoraJatekosGombokBekotese() {
  const frissitesGomb =
    document.getElementById(
      "tanora-jatekos-frissites"
    );

  const inditasGomb =
    document.getElementById(
      "tanora-inditas"
    );

  if (
    frissitesGomb &&
    frissitesGomb.dataset
      .bekotve !== "1"
  ) {
    frissitesGomb.dataset
      .bekotve = "1";

    frissitesGomb.addEventListener(
      "click",
      async () => {
        frissitesGomb.disabled =
          true;

        try {
          await tanoraJatekosListaFrissitese();
        } catch (hiba) {
          adminVisszajelzes(
            "tanora-visszajelzes",

            hiba instanceof Error
              ? hiba.message
              : String(hiba),

            "hiba"
          );
        } finally {
          frissitesGomb.disabled =
            false;
        }
      }
    );
  }

  if (
    inditasGomb &&
    inditasGomb.dataset
      .bekotve !== "1"
  ) {
    inditasGomb.dataset
      .bekotve = "1";

    inditasGomb.addEventListener(
      "click",
      async () => {
        if (
          !tanoraFelugyeletAllapot
            .tanoraId
        ) {
          return;
        }

        const biztos =
  await tanoraInditasMegerositese();

if (!biztos) {
  debug(
    "Tanóra indítása megszakítva a megerősítő ablakban"
  );

  return;
}

debug(
  "Tanóra indítása jóváhagyva a megerősítő ablakban"
);

        inditasGomb.disabled =
          true;

        adminVisszajelzes(
          "tanora-visszajelzes",
          "A játék indítása…"
        );

        try {
          await tanoraApiHivas({
            muvelet:
              "inditas",

            tanoraId:
              tanoraFelugyeletAllapot
                .tanoraId,
          });

          await tanoraJatekosListaFrissitese();

          adminVisszajelzes(
            "tanora-visszajelzes",
            "A játék minden csatlakozott tanulónál elindult.",
            "sikeres"
          );
        } catch (hiba) {
          adminVisszajelzes(
            "tanora-visszajelzes",

            hiba instanceof Error
              ? hiba.message
              : String(hiba),

            "hiba"
          );

          await tanoraJatekosListaFrissitese()
            .catch(() => {});
        }
      }
    );
  }
}

function tanoraVezerloBekotese() {
  const letrehozasGomb =
    document.getElementById(
      "tanora-letrehozas"
    );

  const masolasGomb =
    document.getElementById(
      "tanora-link-masolasa"
    );

  if (
    letrehozasGomb &&
    letrehozasGomb.dataset
      .bekotve !== "1"
  ) {
    letrehozasGomb.dataset
      .bekotve = "1";

    letrehozasGomb.addEventListener(
      "click",
      async () => {
        const idotartamElem =
          document.getElementById(
            "tanora-idotartam"
          );

        const idotartamMasodperc =
          Number(
            idotartamElem?.value ??
            900
          );

        letrehozasGomb.disabled =
          true;

        adminVisszajelzes(
          "tanora-visszajelzes",
          "Tanóra létrehozása…"
        );

        try {
  const szurok =
    await molekulaSzuroBeallitasokKiolvasasa("tanora");

  const adat =
    await tanoraApiHivas({
      muvelet:
        "letrehozas",

      idotartamMasodperc,

      maxNehezseg:
        szurok.maxNehezseg,

      tiltottCsaladok:
        szurok.tiltottCsaladok,
    });

          const tanora =
            adat?.tanora;

          const kod =
            tanora
              ?.csatlakozasi_kod;

          const csatlakozasiUrl =
            tanora
              ?.csatlakozasiUrl;

                    if (
            !tanora?.id ||
            !kod ||
            !csatlakozasiUrl
          ) {
            throw new Error(
              "A tanóra létrejött, de hiányos választ kaptunk."
            );
          }

          const kodElem =
            document.getElementById(
              "tanora-kod"
            );

          const linkElem =
            document.getElementById(
              "tanora-link"
            );

          const csatlakozasElem =
            document.getElementById(
              "tanora-csatlakozas"
            );

          if (kodElem) {
            kodElem.textContent =
              kod;
          }

          if (linkElem) {
            linkElem.textContent =
              csatlakozasiUrl;

            linkElem.href =
              csatlakozasiUrl;
          }

                    const qrElem =
            document.getElementById(
              "tanora-qr"
            );

          if (qrElem) {
            qrElem.replaceChildren();

            if (
              typeof QRCode ===
              "function"
            ) {
              new QRCode(
                qrElem,
                {
                  text:
                    csatlakozasiUrl,

                  width: 150,
                  height: 150,

                  colorDark:
                    "#101622",

                  colorLight:
                    "#ffffff",

                  correctLevel:
                    QRCode
                      .CorrectLevel
                      .M,
                }
              );
            } else {
              qrElem.textContent =
                "A QR-kód nem tölthető be.";
            }
          }

          if (csatlakozasElem) {
            csatlakozasElem.hidden =
              false;
          }

                    tanoraFelugyeletAllapot
            .tanoraId =
              tanora.id;

          await tanoraJatekosListaFrissitese();

          tanoraAutomatikusFrissitesInditasa();

          adminVisszajelzes(
            "tanora-visszajelzes",
            "A tanóra sikeresen létrejött.",
            "sikeres"
          );
        } catch (hiba) {
          adminVisszajelzes(
            "tanora-visszajelzes",

            hiba instanceof Error
              ? hiba.message
              : String(hiba),

            "hiba"
          );
        } finally {
          letrehozasGomb.disabled =
            false;
        }
      }
    );
  }

  if (
    masolasGomb &&
    masolasGomb.dataset
      .bekotve !== "1"
  ) {
    masolasGomb.dataset
      .bekotve = "1";

    masolasGomb.addEventListener(
      "click",
      async () => {
        const linkElem =
          document.getElementById(
            "tanora-link"
          );

        const csatlakozasiUrl =
          linkElem?.href;

        if (
          !csatlakozasiUrl ||
          csatlakozasiUrl.endsWith("#")
        ) {
          return;
        }

        try {
          await navigator.clipboard
            .writeText(
              csatlakozasiUrl
            );

          adminVisszajelzes(
            "tanora-visszajelzes",
            "A csatlakozási cím a vágólapra került.",
            "sikeres"
          );
        } catch {
          adminVisszajelzes(
            "tanora-visszajelzes",
            "A cím nem másolható automatikusan. Jelöld ki kézzel!",
            "hiba"
          );
        }
      }
    );
  }
}

function tanoraQrNagyitasBekotese() {
  const nagyitasGomb =
    document.getElementById(
      "tanora-qr-nagyitas"
    );

  if (
    !nagyitasGomb ||
    nagyitasGomb.dataset
      .bekotve === "1"
  ) {
    return;
  }

  nagyitasGomb.dataset
    .bekotve = "1";

  nagyitasGomb.addEventListener(
    "click",
    () => {
      const linkElem =
        document.getElementById(
          "tanora-link"
        );

      const kodElem =
        document.getElementById(
          "tanora-kod"
        );

      const nagyKodElem =
        document.getElementById(
          "tanora-qr-nagy-kod"
        );

      const nagyQrElem =
        document.getElementById(
          "tanora-qr-nagy"
        );

      const ablak =
        document.getElementById(
          "tanora-qr-ablak"
        );

      const csatlakozasiUrl =
        linkElem?.href ?? "";

      if (
        !csatlakozasiUrl ||
        !csatlakozasiUrl.includes(
          "?ora="
        )
      ) {
        adminVisszajelzes(
          "tanora-visszajelzes",
          "Előbb hozz létre egy tanórát!",
          "hiba"
        );

        return;
      }

      if (
        !nagyQrElem ||
        !(ablak instanceof HTMLDialogElement)
      ) {
        return;
      }

      nagyQrElem.replaceChildren();

      if (
        typeof QRCode !==
          "function"
      ) {
        nagyQrElem.textContent =
          "A QR-kód nem tölthető be.";

        return;
      }

      new QRCode(
        nagyQrElem,
        {
          text:
            csatlakozasiUrl,

          width: 300,
          height: 300,

          colorDark:
            "#101622",

          colorLight:
            "#ffffff",

          correctLevel:
            QRCode
              .CorrectLevel
              .M,
        }
      );

      if (nagyKodElem) {
        nagyKodElem.textContent =
          kodElem?.textContent ??
          "——————";
      }

      ablak.showModal();
    }
  );
}

function adminVisszajelzes(
  elemAzonosito,
  uzenet,
  tipus = ""
) {
  const elem =
    document.getElementById(
      elemAzonosito
    );

  if (!elem) return;

  elem.textContent = uzenet;
  elem.classList.remove(
    "sikeres",
    "hiba"
  );

  if (tipus) {
    elem.classList.add(tipus);
  }
}

function adminNezetBeallitasa(
  bejelentkezve
) {
  const loginPanel =
    document.getElementById(
      "admin-bejelentkezes"
    );

  const tartalom =
    document.getElementById(
      "admin-tartalom"
    );

  const felhasznaloElem =
    document.getElementById(
      "admin-felhasznalo"
    );

      const aktivalasGomb =
    document.getElementById("admin-aktivalas");

  if (aktivalasGomb) {
    aktivalasGomb.hidden = true;
  }

  if (loginPanel) {
    loginPanel.hidden =
      bejelentkezve;
  }

  if (tartalom) {
    tartalom.hidden =
      !bejelentkezve;
  }

  if (felhasznaloElem) {
    felhasznaloElem.textContent =
      bejelentkezve
        ? (
            adminAllapot
              .felhasznaloEmail ??
            "Admin"
          )
        : "";
  }
}

async function adminListaBetoltese() {
  adminVisszajelzes(
    "admin-muvelet-visszajelzes",
    "Molekulák betöltése…"
  );

  const adat =
    await adminApiHivas({
      muvelet: "lista",
    });

      const aktivalasGomb =
    document.getElementById("admin-aktivalas");

  if (aktivalasGomb) {
    aktivalasGomb.hidden =
      adat.szerepkor !== "admin";
  }

  adminAllapot.molekulak =
    Array.isArray(adat.molekulak)
      ? adat.molekulak
      : [];

  const darabElem =
    document.getElementById(
      "admin-molekula-darab"
    );

  if (darabElem) {
    darabElem.textContent =
      String(
        adminAllapot
          .molekulak.length
      );
  }

    adminListaMegjelenitese();

  adminVisszajelzes(
    "admin-muvelet-visszajelzes",
    ""
  );
}

function adminElozetAdatokKeszitese(rekord) {
  const adat = rekord?.adat;

  if (
    !adat ||
    !Array.isArray(adat.atomok) ||
    !Array.isArray(adat.kotesek)
  ) {
    return null;
  }

  const ideiglenesMolekula = {
    ...adat,

    id:
      `admin-elozet-${rekord.id}-` +
      Math.random()
        .toString(36)
        .slice(2),
  };

  MOLEKULA_NEVTAR.push(
    ideiglenesMolekula
  );

  try {
    return molekulaSablonElozetAdatok(
      ideiglenesMolekula.id
    );
  } finally {
    const index =
      MOLEKULA_NEVTAR.indexOf(
        ideiglenesMolekula
      );

    if (index !== -1) {
      MOLEKULA_NEVTAR.splice(
        index,
        1
      );
    }
  }
}

function adminMolekulaMegjelenitese(
  rekord
) {
  const uresAllapot =
    document.getElementById(
      "admin-ures-allapot"
    );

  const adatDoboz =
    document.getElementById(
      "admin-molekula-adatok"
    );

  if (!rekord) {
    if (uresAllapot) {
      uresAllapot.hidden = false;
    }

    if (adatDoboz) {
      adatDoboz.hidden = true;
    }

    return;
  }

  if (uresAllapot) {
    uresAllapot.hidden = true;
  }

  if (adatDoboz) {
    adatDoboz.hidden = false;
  }

  const adat =
    rekord.adat ?? {};

  const nevek =
    adat.nevek ?? {};

  const preferaltNev =
    rekord.preferalt_nev ??
    nevek.preferalt ??
    "";

  const alternativak =
    rekord.alternativ_nevek ??
    nevek.alternativak ??
    [];

  const csaladok =
    rekord.csaladok ??
    adat.csaladok ??
    [];

  const nehezseg =
    rekord.nehezseg ??
    adat.nehezseg ??
    1;

  const preferaltNevMezo =
    document.getElementById(
      "admin-preferalt-nev"
    );

  const alternativakMezo =
    document.getElementById(
      "admin-alternativak"
    );

  const csaladokMezo =
    document.getElementById(
      "admin-csaladok"
    );

  const nehezsegMezo =
    document.getElementById(
      "admin-nehezseg"
    );

  if (preferaltNevMezo) {
    preferaltNevMezo.value =
      preferaltNev;
  }

  if (alternativakMezo) {
    alternativakMezo.value =
      Array.isArray(alternativak)
        ? alternativak.join("\n")
        : "";
  }

  if (csaladokMezo) {
    csaladokMezo.value =
      Array.isArray(csaladok)
        ? csaladok.join(", ")
        : "";
  }

  if (nehezsegMezo) {
    nehezsegMezo.value =
      String(nehezseg);
  }

  const osszegkeplet =
    rekord.osszegkeplet ??
    adat.osszegkeplet ??
    "—";

  const pubchemCid =
    rekord.pubchem_cid ??
    adat.pubchemCid ??
    adat.importAdatok?.pubchemCid ??
    "—";

  const inchiKey =
    rekord.inchi_key ??
    adat.importAdatok?.inchiKey ??
    "—";

    const osszegkepletMezo =
    document.getElementById(
      "admin-osszegkeplet"
    );

  if (osszegkepletMezo) {
    osszegkepletMezo.value =
      osszegkeplet === "—"
        ? ""
        : osszegkeplet;

    osszegkepletMezo.disabled =
      !(
        rekord.forras === "sajat" &&
        adat.polimer?.ismetlodEgyseg === true
      );
  }

  document.getElementById(
    "admin-pubchem-cid"
  ).textContent = pubchemCid;

  document.getElementById(
    "admin-inchi-key"
  ).textContent = inchiKey;

  const svg =
    document.getElementById(
      "admin-molekula-svg"
    );

  const elozet =
    adminElozetAdatokKeszitese(
      rekord
    );

  if (svg && elozet) {
        nevadasMolekulaKirajzolasa(
      elozet.atomok,
      elozet.kotesek,
      svg,
      elozet.polimer
    );
  } else if (svg) {
    svg.replaceChildren();
  }

  adminVisszajelzes(
    "admin-muvelet-visszajelzes",
    ""
  );
}

function adminListaMegjelenitese() {
  const listaElem =
    document.getElementById(
      "admin-molekula-lista"
    );

  if (!listaElem) {
    return;
  }

  listaElem.replaceChildren();

  const molekulak =
    Array.isArray(
      adminAllapot.molekulak
    )
      ? adminAllapot.molekulak
      : [];

  if (molekulak.length === 0) {
    const uzenet =
      document.createElement("p");

    uzenet.className =
      "admin-lista-ures";

    uzenet.textContent =
      "Nincs ellenőrzésre váró molekula.";

    listaElem.appendChild(uzenet);

    adminAllapot.kivalasztottMolekulaId =
      null;

    adminMolekulaMegjelenitese(
      null
    );

    return;
  }

  const megvanAKivalasztott =
    molekulak.some(
      (rekord) =>
        rekord.id ===
        adminAllapot
          .kivalasztottMolekulaId
    );

  if (!megvanAKivalasztott) {
    adminAllapot.kivalasztottMolekulaId =
      molekulak[0].id;
  }

  for (const rekord of molekulak) {
    const gomb =
      document.createElement(
        "button"
      );

    gomb.type = "button";
    gomb.className =
      "admin-lista-elem";

    if (
      rekord.id ===
      adminAllapot
        .kivalasztottMolekulaId
    ) {
      gomb.classList.add(
        "aktiv"
      );
    }

    const nev =
      document.createElement(
        "strong"
      );

    nev.textContent =
      rekord.preferalt_nev ??
      rekord.adat?.nevek
        ?.preferalt ??
      rekord.id;

    const reszletek =
      document.createElement(
        "span"
      );

    const osszegkeplet =
      rekord.osszegkeplet ??
      rekord.adat
        ?.osszegkeplet ??
      "ismeretlen képlet";

    const statusz =
      rekord.ellenorzesi_statusz ??
      "ellenőrizendő";

    reszletek.textContent =
      `${osszegkeplet} · ${statusz}`;

    gomb.append(
      nev,
      reszletek
    );

    gomb.addEventListener(
      "click",
      () => {
        adminAllapot
          .kivalasztottMolekulaId =
          rekord.id;

        adminListaMegjelenitese();
      }
    );

    listaElem.appendChild(
      gomb
    );
  }

  const kivalasztott =
    molekulak.find(
      (rekord) =>
        rekord.id ===
        adminAllapot
          .kivalasztottMolekulaId
    );

  adminMolekulaMegjelenitese(
    kivalasztott ?? null
  );
}

function adminMezoListaOlvasasa(
  elemId
) {
  const mezo =
    document.getElementById(
      elemId
    );

  if (!mezo) {
    return [];
  }

  return mezo.value
        .split(
      elemId === "admin-alternativak"
        ? /\r?\n/
        : /[\n,]+/
    )
    .map(
      (ertek) =>
        ertek.trim()
    )
    .filter(Boolean);
}

async function adminJavitasokMentese(
  muvelet = "mentes"
) {
  const aktivalas =
    muvelet === "aktivalas";

  if (
    aktivalas &&
    !window.confirm(
      "Biztosan ellenőrizted a nevet, az alternatív neveket, a családokat és a szerkezeti ábrát?\n\nAktiválás után a molekula megjelenhet a játékban."
    )
  ) {
    return;
  }
  const molekulaId =
    adminAllapot
      .kivalasztottMolekulaId;

  if (!molekulaId) {
    adminVisszajelzes(
      "admin-muvelet-visszajelzes",
      "Nincs kiválasztott molekula."
    );

    return;
  }

  const preferaltNev =
    document
      .getElementById(
        "admin-preferalt-nev"
      )
      ?.value
      ?.trim() ?? "";

  const nehezseg =
    Number(
      document.getElementById(
        "admin-nehezseg"
      )?.value
    );

  const alternativak =
    adminMezoListaOlvasasa(
      "admin-alternativak"
    );

      const osszegkeplet =
    document
      .getElementById(
        "admin-osszegkeplet"
      )
      ?.value
      ?.trim() ?? "";

  const sajatPolimer =
    adminAllapot.molekulak.some(
      (rekord) =>
        rekord.id === molekulaId &&
        rekord.forras === "sajat" &&
        rekord.adat?.polimer
          ?.ismetlodEgyseg === true
    );

  if (
    sajatPolimer &&
    !osszegkeplet
  ) {
    adminVisszajelzes(
      "admin-muvelet-visszajelzes",
      "Add meg a polimer képletét.",
      "hiba"
    );
    return;
  }

  const csaladok =
    adminMezoListaOlvasasa(
      "admin-csaladok"
    );

  if (!preferaltNev) {
    adminVisszajelzes(
      "admin-muvelet-visszajelzes",
      "A preferált magyar név nem lehet üres."
    );

    return;
  }

  if (csaladok.length === 0) {
    adminVisszajelzes(
      "admin-muvelet-visszajelzes",
      "Legalább egy molekulacsalád szükséges."
    );

    return;
  }

  const muveletGomb =
  document.getElementById(
    aktivalas
      ? "admin-aktivalas"
      : "admin-mentes"
  );

if (muveletGomb) {
  muveletGomb.disabled = true;
}

adminVisszajelzes(
  "admin-muvelet-visszajelzes",
  aktivalas
    ? "Molekula mentése és aktiválása…"
    : "Javítások mentése…"
);

  try {
    const eredmeny =
      await adminApiHivas({
        muvelet,
        molekulaId,
        preferaltNev,
        alternativak,
        csaladok,
                nehezseg,
        osszegkeplet,
      });

    const rekordIndex =
  adminAllapot.molekulak
    .findIndex(
      (rekord) =>
        rekord.id ===
        molekulaId
    );

if (rekordIndex !== -1) {
  if (aktivalas) {
    adminAllapot.molekulak.splice(
      rekordIndex,
      1
    );

    adminAllapot
      .kivalasztottMolekulaId =
      adminAllapot
        .molekulak[0]
        ?.id ?? null;
  } else if (
    eredmeny?.molekula
  ) {
    adminAllapot.molekulak[
      rekordIndex
    ] = eredmeny.molekula;
  }
}

const darabElem =
  document.getElementById(
    "admin-molekula-darab"
  );

if (darabElem) {
  darabElem.textContent =
    String(
      adminAllapot
        .molekulak.length
    );
}

adminListaMegjelenitese();

if (
  aktivalas &&
  eredmeny?.molekula?.adat
    ?.polimer?.ismetlodEgyseg === true
) {
  adminAllapot.polimerAlapok = [];
  adminAllapot.aktivPolimerKulcsok = [];
  adminAllapot.polimerSztereoKonfiguracio = null;

  await adminPolimerAlapokBetoltese();
  adminPolimerMonomerMegjelenitese("");

  const sztereoMezo =
    document.getElementById(
      "admin-polimer-sztereo"
    );

  if (sztereoMezo) {
    sztereoMezo.value = "";
  }

  adminPolimerElozetFrissitese();
}

    adminVisszajelzes(
      "admin-muvelet-visszajelzes",
      eredmeny?.uzenet ??
        "A javítások mentése sikerült."
    );
  } catch (hiba) {
    adminVisszajelzes(
      "admin-muvelet-visszajelzes",
      hiba instanceof Error
        ? hiba.message
        : String(hiba)
    );
  } finally {
    if (muveletGomb) {
  muveletGomb.disabled = false;
}
  }
}

async function adminMolekulaElutasitasa() {
  const molekulaId =
    adminAllapot
      .kivalasztottMolekulaId;

  if (!molekulaId) {
    adminVisszajelzes(
      "admin-muvelet-visszajelzes",
      "Nincs kiválasztott molekula."
    );

    return;
  }

  const rekord =
    adminAllapot.molekulak.find(
      (molekula) =>
        molekula.id ===
        molekulaId
    );

  const molekulaNev =
    rekord?.preferalt_nev ??
    rekord?.adat?.nevek
      ?.preferalt ??
    molekulaId;

  const megerositve =
    window.confirm(
      `Biztosan elutasítod ezt a molekulát?\n\n${molekulaNev}\n\nA molekula nem törlődik, de nem kerülhet be a játékba.`
    );

  if (!megerositve) {
    return;
  }

  const elutasitasGomb =
    document.getElementById(
      "admin-elutasitas"
    );

  if (elutasitasGomb) {
    elutasitasGomb.disabled = true;
  }

  adminVisszajelzes(
    "admin-muvelet-visszajelzes",
    "Molekula elutasítása…"
  );

  try {
    const eredmeny =
      await adminApiHivas({
        muvelet: "elutasitas",
        molekulaId,
      });

    const rekordIndex =
      adminAllapot.molekulak
        .findIndex(
          (molekula) =>
            molekula.id ===
            molekulaId
        );

    if (rekordIndex !== -1) {
      adminAllapot.molekulak.splice(
        rekordIndex,
        1
      );
    }

    adminAllapot
      .kivalasztottMolekulaId =
      adminAllapot
        .molekulak[0]
        ?.id ?? null;

    const darabElem =
      document.getElementById(
        "admin-molekula-darab"
      );

    if (darabElem) {
      darabElem.textContent =
        String(
          adminAllapot
            .molekulak.length
        );
    }

    adminListaMegjelenitese();

    if (
      adminAllapot
        .molekulak.length > 0
    ) {
      adminVisszajelzes(
        "admin-muvelet-visszajelzes",
        eredmeny?.uzenet ??
          "A molekula elutasítása sikerült."
      );
    }
  } catch (hiba) {
    adminVisszajelzes(
      "admin-muvelet-visszajelzes",
      hiba instanceof Error
        ? hiba.message
        : String(hiba)
    );
  } finally {
    if (elutasitasGomb) {
      elutasitasGomb.disabled = false;
    }
  }
}

function adminPolimerSzomszedok(
  adat,
  atomIndex
) {
  const kotesek =
    Array.isArray(adat?.kotesek)
      ? adat.kotesek
      : [];

  return kotesek.flatMap((kotes) => {
    const elso = Number(kotes?.[0]);
    const masodik = Number(kotes?.[1]);
    const rend = Number(kotes?.[2]);

    if (
      !Number.isInteger(elso) ||
      !Number.isInteger(masodik) ||
      !Number.isInteger(rend)
    ) {
      return [];
    }

    if (elso === atomIndex) {
      return [{
        index: masodik,
        rend,
      }];
    }

    if (masodik === atomIndex) {
      return [{
        index: elso,
        rend,
      }];
    }

    return [];
  });
}

function adminPolimerDikarbonsavVegek(
  monomer
) {
  const adat = monomer?.adat ?? {};
  const atomok = adat.atomok;

  if (!Array.isArray(atomok)) {
    return [];
  }

  const vegek = atomok.flatMap(
    (atom, szenIndex) => {
      if (atom !== "C") {
        return [];
      }

      const szomszedok =
        adminPolimerSzomszedok(
          adat,
          szenIndex
        );

      const karbonilOxigenek =
        szomszedok.filter(
          ({ index, rend }) =>
            rend === 2 &&
            atomok[index] === "O"
        );

      const hidroxiOxigenek =
        szomszedok.filter(
          ({ index, rend }) =>
            rend === 1 &&
            atomok[index] === "O" &&
            adminPolimerSzomszedok(
              adat,
              index
            ).length === 1
        );

      if (
        karbonilOxigenek.length !== 1 ||
        hidroxiOxigenek.length !== 1
      ) {
        return [];
      }

      return [{
        szenIndex,
        tavozOIndex:
          hidroxiOxigenek[0].index,
      }];
    }
  );

  return vegek.length === 2
    ? vegek
    : [];
}

function adminPolimerKondenzaciosPartnerVegek(
  monomer
) {
  const adat = monomer?.adat ?? {};
  const atomok = adat.atomok;

  if (!Array.isArray(atomok)) {
    return null;
  }

  const vegek = atomok.flatMap(
    (atom, atomIndex) => {
      if (
        atom !== "O" &&
        atom !== "N"
      ) {
        return [];
      }

      const szomszedok =
        adminPolimerSzomszedok(
          adat,
          atomIndex
        );

      if (
        szomszedok.length !== 1 ||
        szomszedok[0].rend !== 1 ||
        atomok[
          szomszedok[0].index
        ] !== "C"
      ) {
        return [];
      }

      if (atom === "O") {
        const szenSzomszedok =
          adminPolimerSzomszedok(
            adat,
            szomszedok[0].index
          );

        const karboxilOxigen =
          szenSzomszedok.some(
            ({ index, rend }) =>
              rend === 2 &&
              atomok[index] === "O"
          );

        if (karboxilOxigen) {
          return [];
        }
      }

      return [{
        atomIndex,
        tipus:
          atom === "O"
            ? "diol"
            : "diamin",
      }];
    }
  );

  if (
    vegek.length !== 2 ||
    vegek[0].tipus !==
      vegek[1].tipus
  ) {
    return null;
  }

  return {
    tipus: vegek[0].tipus,
    atomIndexek:
      vegek.map(
        (veg) => veg.atomIndex
      ),
  };
}

function adminPolimerMonomerAlkalmas(
  rekord
) {
  const adat =
    rekord?.adat ?? {};

  const atomok =
    Array.isArray(adat.atomok)
      ? adat.atomok
      : [];

  const kotesek =
    Array.isArray(adat.kotesek)
      ? adat.kotesek
      : [];

  const csaladok =
    Array.isArray(
      rekord?.csaladok
    )
      ? rekord.csaladok
      : [];

  const monomerCsalad =
  csaladok.some(
    (csalad) =>
      String(csalad)
        .toLocaleLowerCase(
          "hu-HU"
        ) === "monomer"
  );

  const vanSzenSzenKettosKotes =
    kotesek.some(
      (kotes) => {
        if (
          !Array.isArray(kotes) ||
          kotes.length < 3
        ) {
          return false;
        }

        const elsoIndex =
          Number(kotes[0]);

        const masodikIndex =
          Number(kotes[1]);

        const kotesrend =
          Number(kotes[2]);

        return (
          kotesrend === 2 &&
          atomok[elsoIndex] ===
            "C" &&
          atomok[masodikIndex] ===
            "C"
        );
      }
    );

    return (
    monomerCsalad &&
    (
      vanSzenSzenKettosKotes ||
      csaladok.includes("szilandiol") ||
      adminPolimerDikarbonsavVegek(rekord).length === 2 ||
      adminPolimerKondenzaciosPartnerVegek(rekord) !== null
    )
  );
}

async function adminPolimerAlapokBetoltese() {
  const monomerMezo =
    document.getElementById(
      "admin-polimer-monomer"
    );

  if (!monomerMezo) {
    console.error(
      "[POLIMER IMPORT HIBA] A monomerválasztó mező nem található."
    );

    return;
  }

  monomerMezo.disabled = true;
  monomerMezo.replaceChildren();

  const betoltesOpcio =
    document.createElement(
      "option"
    );

  betoltesOpcio.value = "";
  betoltesOpcio.textContent =
    "Monomerek betöltése…";

  monomerMezo.appendChild(
    betoltesOpcio
  );

  adminVisszajelzes(
    "admin-polimer-visszajelzes",
    "Alkalmas monomerek keresése…"
  );

  try {
    const eredmeny =
      await adminApiHivas({
        muvelet:
          "polimer-alapok",
      });

    const osszesMonomer =
      Array.isArray(
        eredmeny?.monomerek
      )
        ? eredmeny.monomerek
        : [];

        adminAllapot.aktivPolimerKulcsok =
      Array.isArray(
        eredmeny?.aktivPolimerKulcsok
      )
        ? eredmeny.aktivPolimerKulcsok
            .filter(
              (kulcs) =>
                typeof kulcs === "string"
            )
        : [];

    const alkalmasMonomerek =
      osszesMonomer
                .filter(
          adminPolimerMonomerAlkalmas
        )
        .filter((monomer) => {
  if (
    monomer.csaladok?.includes(
      "szilandiol"
    )
  ) {
    const polimerAdat =
      adminPolimerSzilandiolElozetKeszitese(
        monomer
      );

    const kulcs =
      polimerAzonossagiKulcs(
        polimerAdat
      );

    return (
      kulcs !== null &&
      !adminAllapot.aktivPolimerKulcsok
        .includes(kulcs)
    );
  }

  return (
    !adminPolimerValtozatMarAktiv(
      monomer,
      "E"
    ) ||
    !adminPolimerValtozatMarAktiv(
      monomer,
      "Z"
    )
  );
})
        .sort(
          (elso, masodik) =>
            String(
              elso.preferalt_nev ??
                ""
            ).localeCompare(
              String(
                masodik
                  .preferalt_nev ??
                  ""
              ),
              "hu"
            )
        );

        adminAllapot.polimerAlapok =
      alkalmasMonomerek;

    monomerMezo.replaceChildren();

    const valasszOpcio =
      document.createElement(
        "option"
      );

    valasszOpcio.value = "";
    valasszOpcio.textContent =
      "Válassz monomert…";

    monomerMezo.appendChild(
      valasszOpcio
    );

    for (
      const monomer of
      alkalmasMonomerek
    ) {
      const opcio =
        document.createElement(
          "option"
        );

      opcio.value =
        monomer.id;

      opcio.textContent =
        `${
          monomer.preferalt_nev ??
          monomer.id
        } – ${
          monomer.osszegkeplet ??
          "ismeretlen képlet"
        }`;

      monomerMezo.appendChild(
        opcio
      );
    }

    monomerMezo.disabled =
      alkalmasMonomerek
        .length === 0;

    adminVisszajelzes(
      "admin-polimer-visszajelzes",
      alkalmasMonomerek.length > 0
        ? `${alkalmasMonomerek.length} alkalmas monomer betöltve.`
        : "Nem található alkalmas monomer.",
      alkalmasMonomerek.length > 0
        ? "sikeres"
        : "hiba"
    );

    debug(
      "Polimerkészítő monomerlistája betöltve",
      {
        apiDarab:
          osszesMonomer.length,

        alkalmasDarab:
          alkalmasMonomerek
            .length,

        monomerIdk:
          alkalmasMonomerek.map(
            (monomer) =>
              monomer.id
          ),
      }
    );
  } catch (hiba) {
    adminAllapot.polimerAlapok =
      [];
          adminAllapot.aktivPolimerKulcsok =
      [];

    monomerMezo.disabled = true;

    adminVisszajelzes(
      "admin-polimer-visszajelzes",
      hiba instanceof Error
        ? hiba.message
        : String(hiba),
      "hiba"
    );

    console.error(
      "[POLIMER IMPORT HIBA] A monomerlista betöltése sikertelen.",
      hiba
    );
  }
}

function adminPolimerKettosKotesekKeresese(
  monomer
) {
  const adat =
    monomer?.adat ?? {};

  const atomok =
    Array.isArray(adat.atomok)
      ? adat.atomok
      : [];

  const kotesek =
    Array.isArray(adat.kotesek)
      ? adat.kotesek
      : [];

  return kotesek
    .map(
      (kotes, index) => ({
        index,

        elsoIndex:
          Number(kotes?.[0]),

        masodikIndex:
          Number(kotes?.[1]),

        kotesrend:
          Number(kotes?.[2]),
      })
    )
    .filter(
      (kotes) =>
        Number.isInteger(
          kotes.elsoIndex
        ) &&
        Number.isInteger(
          kotes.masodikIndex
        ) &&
        kotes.kotesrend === 2 &&
        atomok[
          kotes.elsoIndex
        ] === "C" &&
        atomok[
          kotes.masodikIndex
        ] === "C"
    );
}

function adminPolimerDien14AdatokKeresese(
  monomer
) {
  const adat =
    monomer?.adat ?? {};

  const atomok =
    Array.isArray(adat.atomok)
      ? adat.atomok
      : [];

  const kotesek =
    Array.isArray(adat.kotesek)
      ? adat.kotesek
      : [];

  const poziciok =
    Array.isArray(
      adat.elozetPoziciok
    )
      ? adat.elozetPoziciok
      : [];

  const kettosKotesek =
    adminPolimerKettosKotesekKeresese(
      monomer
    );

  if (
    kettosKotesek.length !== 2
  ) {
    return null;
  }

  const elsoKettos =
    kettosKotesek[0];

  const masodikKettos =
    kettosKotesek[1];

  const elsoVegpontok = [
    elsoKettos.elsoIndex,
    elsoKettos.masodikIndex,
  ];

  const masodikVegpontok = [
    masodikKettos.elsoIndex,
    masodikKettos.masodikIndex,
  ];

  for (
    const elsoBelsoAtomIndex of
    elsoVegpontok
  ) {
    for (
      const masodikBelsoAtomIndex of
      masodikVegpontok
    ) {
      const osszekotoKotesIndex =
        kotesek.findIndex(
          (kotes) => {
            if (
              !Array.isArray(kotes) ||
              Number(kotes[2]) !== 1
            ) {
              return false;
            }

            const atom1 =
              Number(kotes[0]);

            const atom2 =
              Number(kotes[1]);

            return (
              (
                atom1 ===
                  elsoBelsoAtomIndex &&
                atom2 ===
                  masodikBelsoAtomIndex
              ) ||
              (
                atom2 ===
                  elsoBelsoAtomIndex &&
                atom1 ===
                  masodikBelsoAtomIndex
              )
            );
          }
        );

      if (
        osszekotoKotesIndex === -1
      ) {
        continue;
      }

      const elsoKulsoAtomIndex =
        elsoKettos.elsoIndex ===
        elsoBelsoAtomIndex
          ? elsoKettos
              .masodikIndex
          : elsoKettos
              .elsoIndex;

      const masodikKulsoAtomIndex =
        masodikKettos.elsoIndex ===
        masodikBelsoAtomIndex
          ? masodikKettos
              .masodikIndex
          : masodikKettos
              .elsoIndex;

      if (
        atomok[
          elsoKulsoAtomIndex
        ] !== "C" ||
        atomok[
          masodikKulsoAtomIndex
        ] !== "C"
      ) {
        continue;
      }

      const elsoX =
        Number(
          poziciok[
            elsoKulsoAtomIndex
          ]?.x
        );

      const masodikX =
        Number(
          poziciok[
            masodikKulsoAtomIndex
          ]?.x
        );

      const elsoVanBalra =
        Number.isFinite(elsoX) &&
        Number.isFinite(masodikX)
          ? elsoX <= masodikX
          : true;

      return {
        elsoKettosKotesIndex:
          elsoKettos.index,

        masodikKettosKotesIndex:
          masodikKettos.index,

        osszekotoKotesIndex,

        elsoBelsoAtomIndex,

        masodikBelsoAtomIndex,

        balKapcsolodasAtomIndex:
          elsoVanBalra
            ? elsoKulsoAtomIndex
            : masodikKulsoAtomIndex,

        jobbKapcsolodasAtomIndex:
          elsoVanBalra
            ? masodikKulsoAtomIndex
            : elsoKulsoAtomIndex,
      };
    }
  }

  return null;
}

function polimerAzonossagiKulcs(adat) {
  if (
    !Array.isArray(adat?.atomok) ||
    !Array.isArray(adat?.kotesek) ||
    !Array.isArray(adat?.polimer?.kapcsolodasok)
  ) {
    return null;
  }

  const kotesek = adat.kotesek
    .map((kotes) => [
      Math.min(Number(kotes[0]), Number(kotes[1])),
      Math.max(Number(kotes[0]), Number(kotes[1])),
      Number(kotes[2]),
    ])
    .sort((elso, masodik) =>
      elso[0] - masodik[0] ||
      elso[1] - masodik[1] ||
      elso[2] - masodik[2]
    );

  const kapcsolodasok = adat.polimer.kapcsolodasok
    .map((kapcsolodas) => [
      Number(kapcsolodas.atomIndex),
      Number(kapcsolodas.kotesrend ?? 1),
    ])
    .sort((elso, masodik) =>
      elso[0] - masodik[0] ||
      elso[1] - masodik[1]
    );

  const sztereo = (
    Array.isArray(adat.sztereokemia?.kettosKotesek)
      ? adat.sztereokemia.kettosKotesek
      : []
  )
    .map((kotes) => [
      Math.min(
        Number(kotes.atom1Index),
        Number(kotes.atom2Index)
      ),
      Math.max(
        Number(kotes.atom1Index),
        Number(kotes.atom2Index)
      ),
      String(kotes.konfiguracio ?? ""),
    ])
    .sort((elso, masodik) =>
      JSON.stringify(elso).localeCompare(
        JSON.stringify(masodik)
      )
    );

  return JSON.stringify({
    atomok: adat.atomok,
    kotesek,
    kapcsolodasok,
    sztereo,
  });
}

function adminPolimerDien14ElozetKeszitese(
  monomer,
  konfiguracio =
    adminAllapot.polimerSztereoKonfiguracio,
  dienAdatok =
    adminAllapot.polimerDien14Adatok
) {
  const adat =
    monomer?.adat ?? {};

if (
  konfiguracio !== "E" &&
  konfiguracio !== "Z"
) {
  return null;
}

  if (
    !dienAdatok ||
    !Array.isArray(adat.atomok) ||
    !Array.isArray(adat.kotesek)
  ) {
    return null;
  }

  const eredetiKotesek =
    adat.kotesek;

  const ujKotesek =
    eredetiKotesek.map(
      (kotes, index) => {
        const ujKotes = [
          Number(kotes[0]),
          Number(kotes[1]),
          Number(kotes[2]),
        ];

        if (
          index ===
            dienAdatok
              .elsoKettosKotesIndex ||
          index ===
            dienAdatok
              .masodikKettosKotesIndex
        ) {
          ujKotes[2] = 1;
        }

        if (
          index ===
          dienAdatok
            .osszekotoKotesIndex
        ) {
          ujKotes[2] = 2;
        }

        return ujKotes;
      }
    );

  const balKulsoAtomIndex =
    dienAdatok
      .balKapcsolodasAtomIndex;

  const jobbKulsoAtomIndex =
    dienAdatok
      .jobbKapcsolodasAtomIndex;

  const balBelsoAtomIndex =
    dienAdatok
      .elsoBelsoAtomIndex;

  const jobbBelsoAtomIndex =
    dienAdatok
      .masodikBelsoAtomIndex;

  const ujPoziciok =
    Array.isArray(
      adat.elozetPoziciok
    )
      ? adat.elozetPoziciok.map(
          (pozicio) => ({
            x:
              Number(pozicio?.x) ||
              0,

            y:
              Number(pozicio?.y) ||
              0,
          })
        )
      : adat.atomok.map(
          () => ({
            x: 0,
            y: 0,
          })
        );

  /*
   * Cisz-1,4 elrendezés:
   * a két polimerlánc-vég ugyanazon
   * az oldalon helyezkedik el.
   */

  ujPoziciok[
    balKulsoAtomIndex
  ] = {
    x: -120,
    y: 55,
  };

  ujPoziciok[
    balBelsoAtomIndex
  ] = {
    x: -40,
    y: 0,
  };

  ujPoziciok[
    jobbBelsoAtomIndex
  ] = {
    x: 40,
    y: 0,
  };

  ujPoziciok[
  jobbKulsoAtomIndex
] = {
  x: 120,

  y:
    konfiguracio === "Z"
      ? 55
      : -55,
};

  const foLancAtomok =
    new Set([
      balKulsoAtomIndex,
      balBelsoAtomIndex,
      jobbBelsoAtomIndex,
      jobbKulsoAtomIndex,
    ]);

  let oldalcsoportSorszam = 0;

  adat.atomok.forEach(
    (_atom, atomIndex) => {
      if (
        foLancAtomok.has(
          atomIndex
        )
      ) {
        return;
      }

      ujPoziciok[atomIndex] = {
        x:
          -40 +
          oldalcsoportSorszam *
            55,

        y: -90,
      };

      oldalcsoportSorszam += 1;
    }
  );

  const alapKeplet =
    monomer.osszegkeplet ??
    adat.osszegkeplet ??
    "";

  const regiSztereokemia =
    adat.sztereokemia &&
    typeof adat.sztereokemia ===
      "object"
      ? adat.sztereokemia
      : {};

  return {
    ...adat,

    osszegkeplet:
      alapKeplet
        ? `(${alapKeplet})n`
        : "",

    kotesek:
      ujKotesek,

    elozetPoziciok:
      ujPoziciok,

    sztereokemia: {
      ...regiSztereokemia,

      statusz:
        "meghatarozott",

      kettosKotesek: [
        {
          atom1Index:
            balBelsoAtomIndex,

          atom2Index:
            jobbBelsoAtomIndex,

          elsoPrioritasIndex:
            balKulsoAtomIndex,

          masodikPrioritasIndex:
            jobbKulsoAtomIndex,

          konfiguracio,
        },
      ],
    },

    polimer: {
      tipus:
        "linearis",

      ismetlodEgyseg:
        true,

      kapcsolodasok: [
        {
          id: "bal-1",
          oldal: "bal",
          hely: 0.65,
          atomIndex:
            balKulsoAtomIndex,
          kotesrend: 1,
        },

        {
          id: "jobb-1",
          oldal: "jobb",
          hely: 0.65,
          atomIndex:
            jobbKulsoAtomIndex,
          kotesrend: 1,
        },
      ],
    },
  };
}

function adminPolimerValtozatMarAktiv(
  monomer,
  konfiguracio
) {
  const dienAdatok =
    adminPolimerDien14AdatokKeresese(
      monomer
    );

  if (!dienAdatok) {
    return false;
  }

  const polimerAdat =
    adminPolimerDien14ElozetKeszitese(
      monomer,
      konfiguracio,
      dienAdatok
    );

  const kulcs =
    polimerAzonossagiKulcs(
      polimerAdat
    );

  return (
    kulcs !== null &&
    adminAllapot
      .aktivPolimerKulcsok
      .includes(kulcs)
  );
}

function adminPolimerIsmetlodoKepletKeszitese(
  atomok,
  kotesek,
  kapcsolodasok
) {
  if (
    !Array.isArray(atomok) ||
    !Array.isArray(kotesek) ||
    !Array.isArray(kapcsolodasok) ||
    atomok.length === 0 ||
    kapcsolodasok.length !== 2
  ) {
    return null;
  }

  const kotesrendOsszegek =
    atomok.map(() => 0);

  for (const kotes of kotesek) {
    const elso = Number(kotes?.[0]);
    const masodik = Number(kotes?.[1]);
    const rend = Number(kotes?.[2]);

    if (
      !Number.isInteger(elso) ||
      !Number.isInteger(masodik) ||
      elso < 0 ||
      masodik < 0 ||
      elso >= atomok.length ||
      masodik >= atomok.length ||
      elso === masodik ||
      !Number.isInteger(rend) ||
      rend < 1 ||
      rend > 3
    ) {
      return null;
    }

    kotesrendOsszegek[elso] += rend;
    kotesrendOsszegek[masodik] += rend;
  }

  for (const kapcsolodas of kapcsolodasok) {
    const index =
      Number(kapcsolodas?.atomIndex);

    const rend =
      Number(kapcsolodas?.kotesrend ?? 1);

    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= atomok.length ||
      !Number.isInteger(rend) ||
      rend < 1 ||
      rend > 3
    ) {
      return null;
    }

    kotesrendOsszegek[index] += rend;
  }

  const atomDarabok = {};
  let hidrogenDarab = 0;

  atomok.forEach((atom, index) => {
    atomDarabok[atom] =
      (atomDarabok[atom] ?? 0) + 1;

    hidrogenDarab +=
      implicitHidrogenDarab(
        atom,
        kotesrendOsszegek[index]
      );
  });

  if (
    atomok.some(
      (atom, index) =>
        !MAX_KOTESREND[atom] ||
        kotesrendOsszegek[index] >
          MAX_KOTESREND[atom]
    )
  ) {
    return null;
  }

  return `(${osszegkepletKeszitese(
    atomDarabok,
    hidrogenDarab
  )})n`;
}

function adminPolimerReszletVizszintesPoziciok(
  monomer,
  kezdoAtomIndex,
  vegAtomIndex,
  celX
) {
  const poziciok = monomer?.adat?.elozetPoziciok;
  const atomok = monomer?.adat?.atomok;

  if (
    !Array.isArray(poziciok) ||
    poziciok.length !== atomok?.length ||
    !poziciok.every(
      (pont) =>
        Number.isFinite(pont?.x) &&
        Number.isFinite(pont?.y)
    )
  ) {
    return null;
  }

  const kezdo = poziciok[kezdoAtomIndex];
  const veg = poziciok[vegAtomIndex];
  if (!kezdo || !veg) return null;

  const dx = veg.x - kezdo.x;
  const dy = veg.y - kezdo.y;
  const hossz = Math.hypot(dx, dy);
  if (hossz < 1) return null;

  const koszinusz = dx / hossz;
  const szinusz = dy / hossz;

  return poziciok.map((pont) => ({
    x: celX +
      (pont.x - kezdo.x) * koszinusz +
      (pont.y - kezdo.y) * szinusz,
    y:
      -(pont.x - kezdo.x) * szinusz +
      (pont.y - kezdo.y) * koszinusz,
  }));
}

function adminPolimerKetMonomerPoziciokKeszitese(
  monomerek,
  indexTerkepek,
  ujBelsoKotesek,
  vegpontok,
  atomDarab
) {
  if (
    monomerek.length !== 2 ||
    ujBelsoKotesek.length !== 1 ||
    ujBelsoKotesek[0]?.[0]?.[0] !== 0 ||
    ujBelsoKotesek[0]?.[1]?.[0] !== 1 ||
    vegpontok[0]?.[0] !== 0 ||
    vegpontok[1]?.[0] !== 1
  ) {
    return null;
  }

  const savKulso = vegpontok[0][1];
  const savBelso = ujBelsoKotesek[0][0][1];
  const partnerBelso = ujBelsoKotesek[0][1][1];
  const partnerKulso = vegpontok[1][1];

  const savPoziciok =
    adminPolimerReszletVizszintesPoziciok(
      monomerek[0],
      savKulso,
      savBelso,
      0
    );
  if (!savPoziciok) return null;

  const partnerPoziciok =
    adminPolimerReszletVizszintesPoziciok(
      monomerek[1],
      partnerBelso,
      partnerKulso,
      savPoziciok[savBelso].x + 85
    );
  if (!partnerPoziciok) return null;

  const eredmeny = Array(atomDarab);
  [savPoziciok, partnerPoziciok].forEach(
    (reszlet, monomerIndex) => {
      for (const [regiIndex, ujIndex] of
        indexTerkepek[monomerIndex]) {
        eredmeny[ujIndex] = reszlet[regiIndex];
      }
    }
  );

  return eredmeny.every(
    (pont) =>
      Number.isFinite(pont?.x) &&
      Number.isFinite(pont?.y)
  ) ? eredmeny : null;
}

function adminPolimerKondenzaciosEgysegKeszitese(
  monomerek,
  torlendoAtomok,
  ujBelsoKotesek,
  vegpontok
) {
  if (
    !Array.isArray(monomerek) ||
    !Array.isArray(torlendoAtomok) ||
    !Array.isArray(ujBelsoKotesek) ||
    !Array.isArray(vegpontok) ||
    vegpontok.length !== 2
  ) {
    return null;
  }

  const atomok = [];
  const kotesek = [];
  const indexTerkepek = [];

  monomerek.forEach((monomer, monomerIndex) => {
    const terkep = new Map();
    const adat = monomer?.adat ?? {};

    if (
      !Array.isArray(adat.atomok) ||
      !Array.isArray(adat.kotesek)
    ) {
      return;
    }

    adat.atomok.forEach((atom, atomIndex) => {
      const torlendo =
        torlendoAtomok.some(
          ([m, a]) =>
            m === monomerIndex &&
            a === atomIndex
        );

      if (!torlendo) {
        terkep.set(
          atomIndex,
          atomok.length
        );
        atomok.push(atom);
      }
    });

    adat.kotesek.forEach((kotes) => {
      const elso =
        terkep.get(Number(kotes[0]));
      const masodik =
        terkep.get(Number(kotes[1]));

      if (
        elso !== undefined &&
        masodik !== undefined
      ) {
        kotesek.push([
          elso,
          masodik,
          Number(kotes[2]),
        ]);
      }
    });

    indexTerkepek.push(terkep);
  });

  if (
    indexTerkepek.length !==
    monomerek.length
  ) {
    return null;
  }

  const ujIndex = ([monomerIndex, atomIndex]) =>
    indexTerkepek[monomerIndex]?.get(
      atomIndex
    );

  for (const [elso, masodik, rend] of
    ujBelsoKotesek) {
    const elsoIndex = ujIndex(elso);
    const masodikIndex = ujIndex(masodik);

    if (
      elsoIndex === undefined ||
      masodikIndex === undefined
    ) {
      return null;
    }

    kotesek.push([
      elsoIndex,
      masodikIndex,
      rend,
    ]);
  }

  const kapcsolodasok =
    vegpontok.map((vegpont, index) => ({
      id: index === 0
        ? "bal-1"
        : "jobb-1",
      oldal: index === 0
        ? "bal"
        : "jobb",
      hely: 0.65,
      atomIndex: ujIndex(vegpont),
      kotesrend: 1,
    }));

  if (
    kapcsolodasok.some(
      (kapcsolodas) =>
        kapcsolodas.atomIndex ===
        undefined
    )
  ) {
    return null;
  }

  const osszegkeplet =
    adminPolimerIsmetlodoKepletKeszitese(
      atomok,
      kotesek,
      kapcsolodasok
    );

  if (!osszegkeplet) {
    return null;
  }

  const polimerAdat = {
    atomok,
    kotesek,
    osszegkeplet,
    sztereokemia: {
      cukor: null,
      statusz: "nincs",
      kettosKotesek: [],
      gyuruKapcsolatok: [],
      kiralisCentrumok: [],
    },
    polimer: {
      tipus: "linearis",
      ismetlodEgyseg: true,
      kapcsolodasok,
    },
  };

    const osszeillesztettPoziciok =
    adminPolimerKetMonomerPoziciokKeszitese(
      monomerek,
      indexTerkepek,
      ujBelsoKotesek,
      vegpontok,
      atomok.length
    );

  if (osszeillesztettPoziciok) {
    polimerAdat.elozetPoziciok =
      osszeillesztettPoziciok;
    return polimerAdat;
  }

  const elozet =
    adminElozetAdatokKeszitese({
      id: "kondenzacios-egyseg",
      adat: polimerAdat,
    });

  if (
    !elozet ||
    elozet.atomok.length !==
      atomok.length
  ) {
    return null;
  }

  polimerAdat.elozetPoziciok =
    elozet.atomok.map(
      (atom) => ({
        x: atom.x,
        y: atom.y,
      })
    );

  return polimerAdat;
}

function adminPolimerSzilandiolElozetKeszitese(
  monomer
) {
  const atomok = monomer?.adat?.atomok;
  const kotesek = monomer?.adat?.kotesek;

  if (
    !Array.isArray(atomok) ||
    !Array.isArray(kotesek)
  ) {
    return null;
  }

  const jeloltek = atomok.flatMap(
    (atom, sziliciumIndex) => {
      if (atom !== "Si") {
        return [];
      }

      const oxigenIndexek =
        kotesek
          .map((kotes) => {
            if (
              !Array.isArray(kotes) ||
              Number(kotes[2]) !== 1
            ) {
              return -1;
            }

            const elso =
              Number(kotes[0]);
            const masodik =
              Number(kotes[1]);

            return elso === sziliciumIndex
              ? masodik
              : masodik === sziliciumIndex
                ? elso
                : -1;
          })
          .filter(
            (index) =>
              atomok[index] === "O" &&
              kotesek.filter(
                (kotes) =>
                  Number(kotes[0]) ===
                    index ||
                  Number(kotes[1]) ===
                    index
              ).length === 1
          );

      return oxigenIndexek.length === 2
        ? [{
            sziliciumIndex,
            oxigenIndexek,
          }]
        : [];
    }
  );

  if (jeloltek.length !== 1) {
    return null;
  }

  const {
    sziliciumIndex,
    oxigenIndexek,
  } = jeloltek[0];

  return adminPolimerKondenzaciosEgysegKeszitese(
    [monomer],
    [[0, oxigenIndexek[1]]],
    [],
    [
      [0, sziliciumIndex],
      [0, oxigenIndexek[0]],
    ]
  );
}

function adminPolimerKetMonomeresElozetKeszitese(
  elsoMonomer,
  masodikMonomer
) {
  const elsoSav =
    adminPolimerDikarbonsavVegek(
      elsoMonomer
    ).length === 2;

  const savMonomer =
    elsoSav
      ? elsoMonomer
      : masodikMonomer;

  const partnerMonomer =
    elsoSav
      ? masodikMonomer
      : elsoMonomer;

  const savVegek =
    adminPolimerDikarbonsavVegek(
      savMonomer
    );

  const partnerVegek =
    adminPolimerKondenzaciosPartnerVegek(
      partnerMonomer
    );

  if (
    savVegek.length !== 2 ||
    !partnerVegek
  ) {
    return null;
  }

  return adminPolimerKondenzaciosEgysegKeszitese(
    [
      savMonomer,
      partnerMonomer,
    ],
    [
      [0, savVegek[0].tavozOIndex],
      [0, savVegek[1].tavozOIndex],
    ],
    [
      [
        [0, savVegek[0].szenIndex],
        [1, partnerVegek.atomIndexek[0]],
        1,
      ],
    ],
    [
      [0, savVegek[1].szenIndex],
      [1, partnerVegek.atomIndexek[1]],
    ]
  );
}

function adminPolimerMasodikMonomerElozetFrissitese() {
  const doboz = document.getElementById(
    "admin-polimer-masodik-monomer-elozet"
  );
  const svg = document.getElementById(
    "admin-polimer-masodik-monomer-svg"
  );
  if (!doboz || !svg) return;

  const monomer =
    adminAllapot.polimerReakcioMod ===
    "ketmonomeres-kondenzacio"
      ? adminAllapot.polimerAlapok.find(
          (rekord) =>
            rekord.id ===
            adminAllapot.kivalasztottMasodikPolimerAlapId
        )
      : null;

  const elozet = monomer
    ? adminElozetAdatokKeszitese(monomer)
    : null;

  doboz.hidden = !elozet;
  if (!elozet) {
    svg.replaceChildren();
    return;
  }

  nevadasMolekulaKirajzolasa(
    elozet.atomok,
    elozet.kotesek,
    svg,
    null
  );
}

function adminPolimerElozetFrissitese() {
  const eredmenyDoboz =
    document.getElementById(
      "admin-polimer-eredmeny"
    );

  const svg =
    document.getElementById(
      "admin-polimer-elozet-svg"
    );

  if (
    !eredmenyDoboz ||
    !svg
  ) {
    console.error(
      "[POLIMER IMPORT HIBA] A polimer-előnézet elemei hiányoznak."
    );

    return;
  }

    const mentesGomb =
    document.getElementById(
      "admin-polimer-mentes"
    );

  adminAllapot.polimerElozetAdat =
    null;

  if (mentesGomb) {
    mentesGomb.disabled = true;
  }

    adminPolimerMasodikMonomerElozetFrissitese();

    if (
    adminAllapot.polimerReakcioMod !==
      "konjugalt-dien-1-4" &&
    adminAllapot.polimerReakcioMod !==
      "szilandiol-kondenzacio" &&
    adminAllapot.polimerReakcioMod !==
      "ketmonomeres-kondenzacio"
  ) {
    adminAllapot.polimerElozetAdat =
      null;

    eredmenyDoboz.hidden = true;
    svg.replaceChildren();

    return;
  }

  const monomer =
    adminAllapot
      .polimerAlapok
      .find(
        (rekord) =>
          rekord.id ===
          adminAllapot
            .kivalasztottPolimerAlapId
      );

  if (!monomer) {
    eredmenyDoboz.hidden = true;
    svg.replaceChildren();

    return;
  }

    const ketMonomer =
    adminAllapot.polimerReakcioMod ===
    "ketmonomeres-kondenzacio";

  const masodikMonomer = ketMonomer
    ? adminAllapot.polimerAlapok.find(
        (rekord) =>
          rekord.id ===
          adminAllapot.kivalasztottMasodikPolimerAlapId
      )
    : null;

  if (ketMonomer && !masodikMonomer) {
    eredmenyDoboz.hidden = true;
    svg.replaceChildren();
    return;
  }

  const polimerAdat = ketMonomer
    ? adminPolimerKetMonomeresElozetKeszitese(
        monomer,
        masodikMonomer
      )
    : adminAllapot.polimerReakcioMod ===
      "szilandiol-kondenzacio"
      ? adminPolimerSzilandiolElozetKeszitese(monomer)
      : adminPolimerDien14ElozetKeszitese(monomer);

  if (!polimerAdat) {
    adminVisszajelzes(
      "admin-polimer-elozet-visszajelzes",
      "Nem készíthető polimer-előnézet.",
      "hiba"
    );

    return;
  }

  polimerAdat.osszegkeplet =
  adminPolimerIsmetlodoKepletKeszitese(
    polimerAdat.atomok,
    polimerAdat.kotesek,
    polimerAdat.polimer?.kapcsolodasok
  );

if (!polimerAdat.osszegkeplet) {
  adminVisszajelzes(
    "admin-polimer-elozet-visszajelzes",
    "Az ismétlődő egység képlete nem számítható ki.",
    "hiba"
  );

  return;
}

  const elozet =
    adminElozetAdatokKeszitese({
      id:
        `polimer-elozet-${monomer.id}`,

      adat:
        polimerAdat,
    });

  if (!elozet) {
    adminVisszajelzes(
      "admin-polimer-elozet-visszajelzes",
      "A polimer szerkezeti ábrája nem készíthető el.",
      "hiba"
    );

    return;
  }

  adminAllapot.polimerElozetAdat =
    polimerAdat;

  nevadasMolekulaKirajzolasa(
    elozet.atomok,
    elozet.kotesek,
    svg,
    elozet.polimer
  );

  eredmenyDoboz.hidden = false;

    if (mentesGomb) {
    mentesGomb.disabled = false;
  }

  adminVisszajelzes(
    "admin-polimer-elozet-visszajelzes",
        ketMonomer
      ? "A két monomerből készült ismétlődő egység előnézete elkészült."
      : adminAllapot.polimerReakcioMod ===
        "szilandiol-kondenzacio"
        ? "A polisziloxán ismétlődő egységének előnézete elkészült."
        : `A polimer ismétlődő egységének előnézete elkészült (${adminAllapot.polimerSztereoKonfiguracio}-konfiguráció).`,
    "sikeres"
  );

  debug(
    "Polimer-előnézet elkészült",
    {
      monomerId:
        monomer.id,

      kotesek:
        polimerAdat.kotesek,

      polimer:
        polimerAdat.polimer,

      sztereokemia:
        polimerAdat
          .sztereokemia,
    }
  );
}

function adminPolimerKetMonomeresPartnerek(elsoMonomer) {
  if (!elsoMonomer) return [];

  const elsoSav =
    adminPolimerDikarbonsavVegek(elsoMonomer).length === 2;
  const elsoPartner =
    adminPolimerKondenzaciosPartnerVegek(elsoMonomer);

  if (!elsoSav && !elsoPartner) return [];

  return adminAllapot.polimerAlapok.filter((masodikMonomer) => {
    if (masodikMonomer.id === elsoMonomer.id) return false;

    const megfeleloTipus = elsoSav
      ? adminPolimerKondenzaciosPartnerVegek(masodikMonomer) !== null
      : adminPolimerDikarbonsavVegek(masodikMonomer).length === 2;

    if (!megfeleloTipus) return false;

    const polimerAdat =
      adminPolimerKetMonomeresElozetKeszitese(
        elsoMonomer,
        masodikMonomer
      );
    const kulcs = polimerAdat
      ? polimerAzonossagiKulcs(polimerAdat)
      : null;

    return kulcs !== null &&
      !adminAllapot.aktivPolimerKulcsok.includes(kulcs);
  });
}

function adminPolimerMasodikMonomerMezoFrissitese(elsoMonomer) {
  const doboz = document.getElementById(
    "admin-polimer-masodik-monomer-mezo"
  );
  const mezo = document.getElementById(
    "admin-polimer-masodik-monomer"
  );
  if (!doboz || !mezo) return;

  const ketMonomer =
    adminAllapot.polimerReakcioMod ===
    "ketmonomeres-kondenzacio";
  doboz.hidden = !ketMonomer;
  mezo.replaceChildren();

  if (!ketMonomer) {
    mezo.disabled = true;
    adminAllapot.kivalasztottMasodikPolimerAlapId = null;
    return;
  }

  mezo.add(new Option("Válassz második monomert…", ""));
  const partnerek =
    adminPolimerKetMonomeresPartnerek(elsoMonomer);

  for (const partner of partnerek) {
    mezo.add(new Option(partner.preferalt_nev, partner.id));
  }

  const kivalasztott =
    adminAllapot.kivalasztottMasodikPolimerAlapId;
  mezo.value = partnerek.some(
    (partner) => partner.id === kivalasztott
  ) ? kivalasztott : "";

  adminAllapot.kivalasztottMasodikPolimerAlapId =
    mezo.value || null;
  mezo.disabled = partnerek.length === 0;
}

function adminPolimerReakcioModBeallitasa(
  monomer,
  kertMod = null
) {
  const reakcioModMezo =
    document.getElementById(
      "admin-polimer-reakciomod"
    );

  const kotesMezoDoboz =
    document.getElementById(
      "admin-polimer-kotes-mezo"
    );

  const leiras =
    document.getElementById(
      "admin-polimer-kotes-leiras"
    );

    const sztereoMezoDoboz =
  document.getElementById(
    "admin-polimer-sztereo-mezo"
  );

const sztereoMezo =
  document.getElementById(
    "admin-polimer-sztereo"
  );

  if (
    !reakcioModMezo ||
    !kotesMezoDoboz
  ) {
    console.error(
      "[POLIMER IMPORT HIBA] A reakciómód mezői hiányoznak."
    );

    return;
  }

  const dien14Adatok =
    adminPolimerDien14AdatokKeresese(
      monomer
    );

  const csaladok =
    Array.isArray(
      monomer?.csaladok
    )
      ? monomer.csaladok
      : [];

  const konjugaltDien =
    csaladok.some(
      (csalad) =>
        String(csalad)
          .toLocaleLowerCase(
            "hu-HU"
          ) ===
          "konjugalt-dien"
    );

  const dienModHasznalhato =
    konjugaltDien &&
    dien14Adatok !== null;

    const szilandiolModHasznalhato =
  csaladok.includes("szilandiol");

  const ketMonomeresPartnerek =
  adminPolimerKetMonomeresPartnerek(monomer);

const ketMonomeresOpcio =
  reakcioModMezo.querySelector(
    'option[value="ketmonomeres-kondenzacio"]'
  );

if (ketMonomeresOpcio) {
  ketMonomeresOpcio.disabled =
    ketMonomeresPartnerek.length === 0;
}

const szilandiolOpcio =
  reakcioModMezo.querySelector(
    'option[value="szilandiol-kondenzacio"]'
  );

if (szilandiolOpcio) {
  szilandiolOpcio.disabled =
    !szilandiolModHasznalhato;
}

const egyszeruAlkenOpcio =
  reakcioModMezo.querySelector(
    'option[value="egyszeru-alken"]'
  );

if (egyszeruAlkenOpcio) {
  egyszeruAlkenOpcio.disabled =
    adminPolimerKettosKotesekKeresese(monomer).length === 0;
}
  const dienOpcio =
    reakcioModMezo.querySelector(
      'option[value="konjugalt-dien-1-4"]'
    );

  if (dienOpcio) {
    dienOpcio.disabled =
      !dienModHasznalhato;
  }

  const ketMonomeresHasznalhato =
  ketMonomeresPartnerek.length > 0;

const egyszeruAlkenHasznalhato =
  adminPolimerKettosKotesekKeresese(monomer).length > 0;

const reakcioMod =
  szilandiolModHasznalhato
    ? "szilandiol-kondenzacio"
    : kertMod === "ketmonomeres-kondenzacio" &&
      ketMonomeresHasznalhato
      ? "ketmonomeres-kondenzacio"
      : kertMod === "konjugalt-dien-1-4" &&
        dienModHasznalhato
        ? "konjugalt-dien-1-4"
        : kertMod === "egyszeru-alken" &&
          egyszeruAlkenHasznalhato
          ? "egyszeru-alken"
          : dienModHasznalhato
            ? "konjugalt-dien-1-4"
            : ketMonomeresHasznalhato
              ? "ketmonomeres-kondenzacio"
              : egyszeruAlkenHasznalhato
                ? "egyszeru-alken"
                : "";

  reakcioModMezo.value =
    reakcioMod;

  adminAllapot.polimerReakcioMod =
    reakcioMod;

  adminAllapot.polimerDien14Adatok =
    reakcioMod ===
      "konjugalt-dien-1-4"
      ? dien14Adatok
      : null;

  kotesMezoDoboz.hidden =
  reakcioMod !==
  "egyszeru-alken";

    const sztereoSzukseges =
  reakcioMod ===
  "konjugalt-dien-1-4";

if (
  sztereoMezoDoboz &&
  sztereoMezo
) {
  sztereoMezoDoboz.hidden =
    !sztereoSzukseges;

  if (!sztereoSzukseges) {
    sztereoMezo.value = "";

    adminAllapot
      .polimerSztereoKonfiguracio =
      null;
    } else {
    for (
      const konfiguracio of
      ["E", "Z"]
    ) {
      const opcio =
        sztereoMezo.querySelector(
          `option[value="${konfiguracio}"]`
        );

      if (!opcio) {
        continue;
      }

      const marAktiv =
        adminPolimerValtozatMarAktiv(
          monomer,
          konfiguracio
        );

      opcio.disabled = marAktiv;
      opcio.textContent =
        `${konfiguracio}-konfiguráció` +
        (marAktiv
          ? " – már aktív"
          : "");
    }

    const aktualisKonfiguracio =
      adminAllapot
        .polimerSztereoKonfiguracio;

    sztereoMezo.value =
      (
        aktualisKonfiguracio === "E" ||
        aktualisKonfiguracio === "Z"
      ) &&
      !adminPolimerValtozatMarAktiv(
        monomer,
        aktualisKonfiguracio
      )
        ? aktualisKonfiguracio
        : "";

    adminAllapot
      .polimerSztereoKonfiguracio =
      sztereoMezo.value || null;
  }
}

  if (
    reakcioMod ===
    "konjugalt-dien-1-4"
  ) {
    adminAllapot
      .kivalasztottPolimerKotesIndex =
      null;

    if (leiras) {
      leiras.textContent =
        "1,4-addíció: a két szélső szénatom lesz a polimer két kapcsolódási pontja, a belső két szénatom között pedig kettős kötés marad.";
    }
    } else if (
  reakcioMod ===
  "szilandiol-kondenzacio"
) {
  adminAllapot
    .kivalasztottPolimerKotesIndex =
    null;

  if (leiras) {
    leiras.textContent =
      "A szilándiolból vízkilépéssel –Si(CH₃)₂–O– ismétlődő egységű polisziloxán készül.";
  }
  } else if (leiras) {
    leiras.textContent =
      "A kiválasztott kettős kötés egyszeres kötéssé alakul, és a két szénatom lesz a polimerlánc két kapcsolódási pontja.";
  }

    adminPolimerMasodikMonomerMezoFrissitese(monomer);

  debug(
    "Polimerizációs reakciómód beállítva",
    {
      monomerId:
        monomer?.id,

      reakcioMod,

      dien14Adatok,
    }
  );
}

function adminPolimerMonomerMegjelenitese(
  monomerId
) {
  const elozetDoboz =
    document.getElementById(
      "admin-polimer-monomer-elozet"
    );

  const svg =
    document.getElementById(
      "admin-polimer-monomer-svg"
    );

  const kotesMezo =
    document.getElementById(
      "admin-polimer-kettos-kotes"
    );

  if (
    !elozetDoboz ||
    !svg ||
    !kotesMezo
  ) {
    console.error(
      "[POLIMER IMPORT HIBA] A monomer-előnézet elemei hiányoznak."
    );

    return;
  }

  const monomer =
    adminAllapot.polimerAlapok
      .find(
        (rekord) =>
          rekord.id === monomerId
      );

  if (!monomer) {
    adminAllapot
      .kivalasztottPolimerAlapId =
      null;

    adminAllapot
      .kivalasztottPolimerKotesIndex =
      null;

    elozetDoboz.hidden = true;
    svg.replaceChildren();

    kotesMezo.replaceChildren();

    const uresOpcio =
      document.createElement(
        "option"
      );

    uresOpcio.value = "";
    uresOpcio.textContent =
      "Előbb válassz monomert!";

    kotesMezo.appendChild(
      uresOpcio
    );

    kotesMezo.disabled = true;

    return;
  }

  const elozet =
    adminElozetAdatokKeszitese(
      monomer
    );

  if (!elozet) {
    console.error(
      "[POLIMER IMPORT HIBA] Nem készíthető előnézet a kiválasztott monomerből.",
      monomer
    );

    return;
  }

  nevadasMolekulaKirajzolasa(
    elozet.atomok,
    elozet.kotesek,
    svg,
    null
  );

  const kettosKotesek =
    adminPolimerKettosKotesekKeresese(
      monomer
    );

  kotesMezo.replaceChildren();

  if (kettosKotesek.length > 1) {
    const valasszOpcio =
      document.createElement(
        "option"
      );

    valasszOpcio.value = "";
    valasszOpcio.textContent =
      "Válassz kettős kötést…";

    kotesMezo.appendChild(
      valasszOpcio
    );
  }

  for (
    const kotes of
    kettosKotesek
  ) {
    const opcio =
      document.createElement(
        "option"
      );

    opcio.value =
      String(kotes.index);

    opcio.textContent =
      `C${kotes.elsoIndex + 1}` +
      ` = ` +
      `C${kotes.masodikIndex + 1}`;

    kotesMezo.appendChild(
      opcio
    );
  }

  kotesMezo.disabled =
    kettosKotesek.length === 0;

  adminAllapot
    .kivalasztottPolimerAlapId =
    monomer.id;

  if (
    kettosKotesek.length === 1
  ) {
    kotesMezo.value =
      String(
        kettosKotesek[0].index
      );

    adminAllapot
      .kivalasztottPolimerKotesIndex =
      kettosKotesek[0].index;
  } else {
    adminAllapot
      .kivalasztottPolimerKotesIndex =
      null;
  }

  adminPolimerReakcioModBeallitasa(
  monomer
);

  elozetDoboz.hidden = false;

  adminVisszajelzes(
    "admin-polimer-visszajelzes",
    adminAllapot.polimerReakcioMod ===
"szilandiol-kondenzacio"
  ? `${monomer.preferalt_nev} betöltve. Szilándiol-kondenzáció kiválasztva.`
  : `${monomer.preferalt_nev} betöltve. ` +
    `${kettosKotesek.length} szén–szén kettős kötés található.`,
    "sikeres"
  );

  debug(
    "Polimerkészítő monomer kiválasztva",
    {
      monomerId:
        monomer.id,

      nev:
        monomer.preferalt_nev,

      kettosKotesek,
    }
  );
}

const monomerMezo =
  document.getElementById(
    "admin-polimer-monomer"
  );

const kotesMezo =
  document.getElementById(
    "admin-polimer-kettos-kotes"
  );

const reakcioModMezo =
  document.getElementById(
    "admin-polimer-reakciomod"
  );

  const sztereoMezo =
  document.getElementById(
    "admin-polimer-sztereo"
  );

sztereoMezo?.addEventListener(
  "change",
  () => {
    const konfiguracio =
      sztereoMezo.value;

    adminAllapot
      .polimerSztereoKonfiguracio =
      konfiguracio === "E" ||
      konfiguracio === "Z"
        ? konfiguracio
        : null;

    debug(
      "Polimer kettős kötésének konfigurációja kiválasztva",
      {
        konfiguracio:
          adminAllapot
            .polimerSztereoKonfiguracio,
      }
    );
    adminPolimerElozetFrissitese();
  }
);

reakcioModMezo?.addEventListener(
  "change",
  () => {
    const monomer =
      adminAllapot
        .polimerAlapok
        .find(
          (rekord) =>
            rekord.id ===
            adminAllapot
              .kivalasztottPolimerAlapId
        );

    if (!monomer) {
      console.error(
        "[POLIMER IMPORT HIBA] A reakciómód módosításakor nincs kiválasztott monomer."
      );

      return;
    }

    adminPolimerReakcioModBeallitasa(
      monomer,
      reakcioModMezo.value
    );
        adminPolimerElozetFrissitese();
  }
);

document.getElementById(
  "admin-polimer-masodik-monomer"
)?.addEventListener("change", (esemeny) => {
  adminAllapot.kivalasztottMasodikPolimerAlapId =
    esemeny.currentTarget.value || null;

  adminPolimerElozetFrissitese();
});

monomerMezo?.addEventListener(
  "change",
  () => {
        adminAllapot.kivalasztottMasodikPolimerAlapId = null;
    adminPolimerMonomerMegjelenitese(
      monomerMezo.value
    );
        adminPolimerElozetFrissitese();
  }
);

kotesMezo?.addEventListener(
  "change",
  () => {
    const kotesIndex =
      Number(
        kotesMezo.value
      );

    adminAllapot
      .kivalasztottPolimerKotesIndex =
      Number.isInteger(
        kotesIndex
      )
        ? kotesIndex
        : null;

    debug(
      "Polimerizálódó kettős kötés kiválasztva",
      {
        monomerId:
          adminAllapot
            .kivalasztottPolimerAlapId,

        kotesIndex:
          adminAllapot
            .kivalasztottPolimerKotesIndex,
      }
    );
  }
);

async function adminPolimerMentese() {
  const gomb =
    document.getElementById(
      "admin-polimer-mentes"
    );

  const adat =
    adminAllapot.polimerElozetAdat;

  if (
    !gomb ||
    !adat ||
    (
    adminAllapot.polimerReakcioMod !==
    "konjugalt-dien-1-4" &&
  adminAllapot.polimerReakcioMod !==
    "szilandiol-kondenzacio" &&
  adminAllapot.polimerReakcioMod !==
    "ketmonomeres-kondenzacio"
)
  ) {
    adminVisszajelzes(
      "admin-polimer-visszajelzes",
      "Előbb készíts érvényes polimerelőnézetet.",
      "hiba"
    );
    return;
  }

  gomb.disabled = true;

  adminVisszajelzes(
    "admin-polimer-visszajelzes",
    "Polimer mentése…"
  );

  let sikeresenMentve = false;

  try {
    const eredmeny =
      await adminApiHivas({
        muvelet: "polimer-mentes",
        adat,
      });

    sikeresenMentve = true;
    adminAllapot.polimerElozetAdat =
      null;

    adminAllapot.kivalasztottMolekulaId =
      eredmeny.molekula?.id ?? null;

    adminVisszajelzes(
      "admin-polimer-visszajelzes",
      "A polimer inaktív, ellenőrzésre váró rekordként elmentve.",
      "sikeres"
    );

    await adminListaBetoltese();
  } catch (hiba) {
    adminVisszajelzes(
      "admin-polimer-visszajelzes",
      sikeresenMentve
        ? "A polimer elmentve, de az adminlista frissítése nem sikerült."
        : hiba instanceof Error
          ? hiba.message
          : String(hiba),
      "hiba"
    );
  }
}

function adminPolimerKeszitoBekotese() {
  const megnyitasGomb =
    document.getElementById(
      "admin-polimer-megnyitas"
    );

  const keszitoPanel =
    document.getElementById(
      "admin-polimer-keszito"
    );

  if (
    !megnyitasGomb ||
    !keszitoPanel
  ) {
    console.error(
      "[POLIMER IMPORT HIBA] A polimerkészítő felület elemei hiányoznak."
    );

    return;
  }

  megnyitasGomb.addEventListener(
    "click",
    async () => {
      const megnyitas =
        keszitoPanel.hidden;

      keszitoPanel.hidden =
        !megnyitas;

      megnyitasGomb.textContent =
        megnyitas
          ? "Polimerkészítő bezárása"
          : "Új polimer létrehozása";

      if (
        !megnyitas ||
        adminAllapot
          .polimerAlapok
          .length > 0
      ) {
        return;
      }

      megnyitasGomb.disabled =
        true;

      try {
        await adminPolimerAlapokBetoltese();
      } finally {
        megnyitasGomb.disabled =
          false;
      }
    }
  );
}

const adminSzintezisAllapot = {
  molekulak: [],
  molekulakBetoltve: false,
  oldal: 0,
  vanKovetkezoOldal: false,
};

function adminSzintezisSzovegLista(szoveg) {
  return [
    ...new Set(
      String(szoveg ?? "")
        .split(/[\n,;]+/)
        .map((resz) => resz.trim())
        .filter(Boolean)
    ),
  ];
}

function adminSzintezisMezo(azonosito) {
  return document.getElementById(azonosito)?.value ?? "";
}

function adminSzintezisKeresoMezok(gyoker) {
  return {
    kereso: gyoker?.querySelector(".admin-szintezis-kereso-mezo") ?? null,
    azonosito:
      gyoker?.querySelector(".admin-szintezis-kereso-azonosito") ?? null,
    lista: gyoker?.querySelector(".admin-szintezis-talalatok") ?? null,
  };
}

function adminSzintezisKeresoTalalatokElrejtese(gyoker) {
  const { kereso, lista } = adminSzintezisKeresoMezok(gyoker);
  if (lista) {
    lista.hidden = true;
    lista.replaceChildren();
  }
  if (kereso) kereso.setAttribute("aria-expanded", "false");
}

function adminSzintezisKeresoKivalasztasa(gyoker, molekula) {
  const { kereso, azonosito } = adminSzintezisKeresoMezok(gyoker);
  const felirat = molekula.preferalt_nev || molekula.id;

  if (azonosito) azonosito.value = molekula.id;
  if (kereso) {
    kereso.value = felirat;
    kereso.dataset.kivalasztottSzoveg = felirat;
  }

  adminSzintezisKeresoTalalatokElrejtese(gyoker);
  return molekula.id;
}

function adminSzintezisKeresoTalalatokFrissitese(gyoker, szoveg) {
  const { kereso, lista } = adminSzintezisKeresoMezok(gyoker);
  if (!kereso || !lista) return;

  const kulcs = adminSzintezisNevKulcs(szoveg);
  lista.replaceChildren();

  if (!kulcs) {
    adminSzintezisKeresoTalalatokElrejtese(gyoker);
    return;
  }

  const talalatok = adminSzintezisAllapot.molekulak.filter((molekula) =>
    adminSzintezisNevKulcs(molekula.preferalt_nev || molekula.id).includes(
      kulcs
    )
  );

  if (talalatok.length === 0) {
    const ures = document.createElement("p");
    ures.className = "admin-szintezis-talalat-ures";
    ures.textContent = "Nincs találat.";
    lista.append(ures);
  }

  for (const molekula of talalatok) {
    const gomb = document.createElement("button");
    gomb.type = "button";
    gomb.className = "admin-szintezis-talalat";
    gomb.setAttribute("role", "option");

    const nev = document.createElement("span");
    nev.textContent = molekula.preferalt_nev || molekula.id;
    const keplet = document.createElement("span");
    keplet.textContent = molekula.osszegkeplet || "";
    gomb.append(nev, keplet);

    gomb.addEventListener("mousedown", (esemeny) => {
      esemeny.preventDefault();
    });
    gomb.addEventListener("click", () => {
      const azonosito = adminSzintezisKeresoKivalasztasa(gyoker, molekula);
      gyoker._adminSzintezisKeresoValtozas?.(azonosito);
    });
    lista.append(gomb);
  }

  lista.hidden = false;
  kereso.setAttribute("aria-expanded", "true");
}

function adminSzintezisKeresoInput(gyoker) {
  const { kereso, azonosito } = adminSzintezisKeresoMezok(gyoker);
  if (!kereso) return "";

  const kivalasztottSzoveg = kereso.dataset.kivalasztottSzoveg ?? "";
  if (azonosito?.value && kereso.value !== kivalasztottSzoveg) {
    azonosito.value = "";
    delete kereso.dataset.kivalasztottSzoveg;
  }

  adminSzintezisKeresoTalalatokFrissitese(gyoker, kereso.value);
  return azonosito?.value ?? "";
}

function adminSzintezisKeresoBekotese(gyoker, valtozas) {
  if (!gyoker || gyoker.dataset.keresoBekotve === "igen") return;
  gyoker.dataset.keresoBekotve = "igen";
  gyoker._adminSzintezisKeresoValtozas = valtozas;

  const { kereso } = adminSzintezisKeresoMezok(gyoker);
  kereso?.addEventListener("input", () => {
    const azonosito = adminSzintezisKeresoInput(gyoker);
    valtozas?.(azonosito);
  });
  kereso?.addEventListener("focus", () => {
    if (
      kereso.value.trim() &&
      kereso.value !== kereso.dataset.kivalasztottSzoveg
    ) {
      adminSzintezisKeresoTalalatokFrissitese(gyoker, kereso.value);
    }
  });
  kereso?.addEventListener("blur", () => {
    adminSzintezisKeresoTalalatokElrejtese(gyoker);
  });
}

function adminSzintezisMolekulaKereso(valtozas) {
  const gyoker = document.createElement("div");
  gyoker.className = "admin-szintezis-kereso";

  const kereso = document.createElement("input");
  kereso.type = "search";
  kereso.autocomplete = "off";
  kereso.placeholder = "Keresés név alapján";
  kereso.className = "admin-szintezis-kereso-mezo";
  kereso.setAttribute("role", "combobox");
  kereso.setAttribute("aria-autocomplete", "list");
  kereso.setAttribute("aria-expanded", "false");

  const azonosito = document.createElement("input");
  azonosito.type = "hidden";
  azonosito.className = "admin-szintezis-kereso-azonosito";

  const lista = document.createElement("div");
  lista.className = "admin-szintezis-talalatok";
  lista.hidden = true;
  lista.setAttribute("role", "listbox");
  lista.id = `admin-szintezis-talalat-${crypto.randomUUID()}`;
  kereso.setAttribute("aria-controls", lista.id);

  gyoker.append(kereso, azonosito, lista);
  adminSzintezisKeresoBekotese(gyoker, valtozas);
  return gyoker;
}

function adminSzintezisRajzBeallitasok(atomok, kotesek, belsoMargo) {
  const hely = new Map(atomok.map((atom) => [atom.id, atom]));
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minTav = Infinity;

  for (const atom of atomok) {
    minX = Math.min(minX, atom.x);
    maxX = Math.max(maxX, atom.x);
    minY = Math.min(minY, atom.y);
    maxY = Math.max(maxY, atom.y);
  }

  for (const kotes of kotesek ?? []) {
    const elso = hely.get(kotes.atom1Id);
    const masodik = hely.get(kotes.atom2Id);
    if (!elso || !masodik) continue;
    minTav = Math.min(
      minTav,
      Math.hypot(masodik.x - elso.x, masodik.y - elso.y)
    );
  }

  if (!Number.isFinite(minTav) || minTav <= 0) minTav = 75;

  const molekulaSzelesseg = Math.max(maxX - minX, 1);
  const molekulaMagassag = Math.max(maxY - minY, 1);
  const atomSugar = 16;
  const lathatoKotes = 30;
  const szuksegesTav = 2 * (atomSugar - 2) + lathatoKotes;
  const meretarany = szuksegesTav / minTav;
  const sajatMargo = Number(belsoMargo);
  const margo =
    Number.isFinite(sajatMargo) && sajatMargo > 0
      ? sajatMargo
      : atomSugar + 28;

  return {
    rajzSzelesseg: Math.ceil(
      molekulaSzelesseg * meretarany + 2 * margo + 4
    ),
    rajzMagassag: Math.ceil(
      molekulaMagassag * meretarany + 2 * margo + 4
    ),
    meretaranyMaximum: meretarany,
    atomSugar,
    belsoMargo: margo,
  };
}

function adminSzintezisRekordElozet(svg, rekord, belsoMargo) {
  const elozet = rekord ? adminElozetAdatokKeszitese(rekord) : null;

  if (!svg || !elozet) {
    svg?.replaceChildren();
    return;
  }

  nevadasMolekulaKirajzolasa(
    elozet.atomok,
    elozet.kotesek,
    svg,
    elozet.polimer,
    adminSzintezisRajzBeallitasok(
      elozet.atomok,
      elozet.kotesek,
      belsoMargo
    )
  );
}

function adminSzintezisElozet(svg, molekulaId) {
  const molekula = adminSzintezisAllapot.molekulak.find(
    (rekord) => rekord.id === molekulaId
  );
  adminSzintezisRekordElozet(svg, molekula);
}

function adminSzintezisElozetFrissitese(elozet, svg, molekulaId) {
  if (elozet) elozet.hidden = !molekulaId;
  adminSzintezisElozet(svg, molekulaId);
}

function adminSzintezisTermekSor(sorszam = 0) {
  const sor = document.createElement("div");
  sor.className = "admin-szintezis-termek";

  const sorszamMezo = document.createElement("label");
  sorszamMezo.className = "admin-mezo";
  sorszamMezo.textContent = "Sorszám";
  const sorszamInput = document.createElement("input");
  sorszamInput.type = "number";
  sorszamInput.min = "0";
  sorszamInput.step = "1";
  sorszamInput.className = "admin-szintezis-termek-sorszam";
  sorszamInput.value = String(sorszam);
  sorszamMezo.append(sorszamInput);

  const elozet = document.createElement("div");
  elozet.className = "admin-szintezis-termek-elozet";
  elozet.hidden = true;
  const elozetSvg = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "svg"
  );
  elozetSvg.setAttribute(
    "class",
    "nevadas-molekula-elozet admin-molekula-elozet admin-szintezis-elozet-svg"
  );
  elozetSvg.setAttribute("role", "img");
  elozetSvg.setAttribute(
    "aria-label",
    "A termékmolekula szerkezeti ábrája"
  );
  elozet.append(elozetSvg);

  const molekulaMezo = document.createElement("div");
  molekulaMezo.className = "admin-mezo";
  const molekulaCimke = document.createElement("label");
  molekulaCimke.textContent = "Termékmolekula";
  const kereso = adminSzintezisMolekulaKereso((azonosito) => {
    adminSzintezisElozetFrissitese(elozet, elozetSvg, azonosito);
  });
  const keresoMezo = kereso.querySelector(".admin-szintezis-kereso-mezo");
  const keresoAzonosito = `admin-szintezis-termek-kereso-${crypto.randomUUID()}`;
  if (keresoMezo) {
    keresoMezo.id = keresoAzonosito;
    molekulaCimke.htmlFor = keresoAzonosito;
  }
  kereso
    .querySelector(".admin-szintezis-kereso-azonosito")
    ?.classList.add("admin-szintezis-termek-molekula");
  molekulaMezo.append(molekulaCimke, kereso);

  const aranyMezo = document.createElement("label");
  aranyMezo.className = "admin-mezo";
  aranyMezo.textContent = "Arány (%)";
  const aranyInput = document.createElement("input");
  aranyInput.type = "number";
  aranyInput.min = "0";
  aranyInput.max = "100";
  aranyInput.step = "any";
  aranyInput.className = "admin-szintezis-termek-arany";
  aranyMezo.append(aranyInput);

  const torles = document.createElement("button");
  torles.type = "button";
  torles.textContent = "Törlés";
  torles.addEventListener("click", () => {
    const termekek = document.getElementById("admin-szintezis-termekek");
    if (termekek?.children.length <= 1) {
      adminVisszajelzes(
        "admin-szintezis-visszajelzes",
        "Legalább egy termék szükséges.",
        "hiba"
      );
      return;
    }
    sor.remove();
  });

  const mezok = document.createElement("div");
  mezok.className = "admin-szintezis-termek-mezok";
  mezok.append(sorszamMezo, molekulaMezo, aranyMezo, torles);
  sor.append(mezok, elozet);
  return sor;
}

function adminSzintezisSzabadSorszam() {
  const foglalt = new Set();

  for (const mezo of document.querySelectorAll(
    "#admin-szintezis-termekek .admin-szintezis-termek-sorszam"
  )) {
    const sorszam = Number(mezo.value);
    if (Number.isInteger(sorszam) && sorszam >= 0) {
      foglalt.add(sorszam);
    }
  }

  let sorszam = 0;
  while (foglalt.has(sorszam)) sorszam += 1;
  return sorszam;
}

function adminSzintezisTermekekAlaphelyzete() {
  const termekek = document.getElementById("admin-szintezis-termekek");
  if (!termekek) return;
  termekek.replaceChildren(adminSzintezisTermekSor(0));
}

async function adminSzintezisMolekulakBetoltese() {
  if (adminSzintezisAllapot.molekulakBetoltve) return;

  const adat = await adminApiHivas({
    muvelet: "szintezis-molekulak",
  });
  adminSzintezisAllapot.molekulak = Array.isArray(adat.molekulak)
    ? adat.molekulak
    : [];
  adminSzintezisAllapot.molekulakBetoltve = true;

  const kereso = document.getElementById("admin-szintezis-kiindulas-kereso");
  if (kereso) {
    kereso.disabled = false;
    kereso.placeholder = "Keresés név alapján";
  }

  adminSzintezisTermekekAlaphelyzete();
}

function adminSzintezisNevKulcs(szoveg) {
  return String(szoveg ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("hu-HU")
    .trim();
}

function adminSzintezisKiindulasElonezet(molekulaId) {
  adminSzintezisElozetFrissitese(
    document.getElementById("admin-szintezis-kiindulas-elozet"),
    document.getElementById("admin-szintezis-kiindulas-svg"),
    molekulaId
  );
}

function adminSzintezisUrlapTorlese() {
  for (const azonosito of [
    "admin-szintezis-reagensek",
    "admin-szintezis-katalizatorok",
    "admin-szintezis-oldoszerek",
    "admin-szintezis-feltetelek",
    "admin-szintezis-kilepo",
    "admin-szintezis-tipus",
    "admin-szintezis-korulmenyek",
  ]) {
    const mezo = document.getElementById(azonosito);
    if (mezo) mezo.value = "";
  }

  const feny = document.getElementById("admin-szintezis-feny");
  if (feny) feny.value = "";

  const kiindulas = document.getElementById("admin-szintezis-kiindulas");
  if (kiindulas) kiindulas.value = "";

  const kereso = document.getElementById("admin-szintezis-kiindulas-kereso");
  if (kereso) {
    kereso.value = "";
    delete kereso.dataset.kivalasztottSzoveg;
  }
  adminSzintezisKeresoTalalatokElrejtese(
    document
      .getElementById("admin-szintezis-kiindulas-kereso")
      ?.closest(".admin-szintezis-kereso")
  );
  adminSzintezisKiindulasElonezet("");
  adminSzintezisTermekekAlaphelyzete();
}

function adminSzintezisMentesAdat() {
  const kiindulasiId = adminSzintezisMezo("admin-szintezis-kiindulas").trim();
  if (!kiindulasiId) {
    throw new Error("Válassz kiindulási molekulát.");
  }

  const sorok = [
    ...document.querySelectorAll("#admin-szintezis-termekek .admin-szintezis-termek"),
  ];
  if (sorok.length === 0) {
    throw new Error("Legalább egy termék szükséges.");
  }

  const termekek = [];
  const sorszamok = new Set();
  const molekulak = new Set();
  let osszArany = 0;

  for (const sor of sorok) {
    const sorszam = Number(
      sor.querySelector(".admin-szintezis-termek-sorszam")?.value
    );
    const molekulaId =
      sor.querySelector(".admin-szintezis-termek-molekula")?.value?.trim() ??
      "";
    const aranySzoveg =
      sor.querySelector(".admin-szintezis-termek-arany")?.value?.trim() ?? "";
    const arany = aranySzoveg === "" ? null : Number(aranySzoveg);

    if (!Number.isInteger(sorszam) || sorszam < 0 || !molekulaId) {
      throw new Error("Hiányos vagy érvénytelen termékadat.");
    }
    if (sorszamok.has(sorszam) || molekulak.has(molekulaId)) {
      throw new Error("Egy termék vagy terméksorszám többször szerepel.");
    }
    if (sorszam === 0 && molekulaId === kiindulasiId) {
      throw new Error("A főtermék nem lehet a kiindulási molekula.");
    }
    if (
      arany !== null &&
      (!Number.isFinite(arany) || arany < 0 || arany > 100)
    ) {
      throw new Error("A termékarány 0 és 100% közötti szám lehet.");
    }

    osszArany += arany ?? 0;
    sorszamok.add(sorszam);
    molekulak.add(molekulaId);
    termekek.push({
      termek_sorszam: sorszam,
      molekula_id: molekulaId,
      termekarany_szazalek: arany,
    });
  }

  if (!sorszamok.has(0)) {
    throw new Error("Hiányzik a 0-s sorszámú főtermék.");
  }
  if (osszArany > 100 + 1e-8) {
    throw new Error("A termékarányok összege meghaladja a 100%-ot.");
  }

  return {
    kiindulasi_molekula_id: kiindulasiId,
    reagensek: adminSzintezisSzovegLista(
      adminSzintezisMezo("admin-szintezis-reagensek")
    ),
    katalizatorok: adminSzintezisSzovegLista(
      adminSzintezisMezo("admin-szintezis-katalizatorok")
    ),
    oldoszerek: adminSzintezisSzovegLista(
      adminSzintezisMezo("admin-szintezis-oldoszerek")
    ),
    jatek_feltetelek: adminSzintezisSzovegLista(
      adminSzintezisMezo("admin-szintezis-feltetelek")
    ),
    kilepo_anyagok: adminSzintezisSzovegLista(
      adminSzintezisMezo("admin-szintezis-kilepo")
    ),
    jatek_feny: adminSzintezisMezo("admin-szintezis-feny").trim() || null,
    reakcio_tipus: adminSzintezisMezo("admin-szintezis-tipus").trim() || null,
    korulmenyek:
      adminSzintezisMezo("admin-szintezis-korulmenyek").trim() || null,
    termekek,
    komponens_szerepek: {},
  };
}

function adminSzintezisAnyagKulcs(szoveg) {
  const alsoIndexek = "₀₁₂₃₄₅₆₇₈₉";
  const sima = String(szoveg ?? "")
    .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (jel) => String(alsoIndexek.indexOf(jel)))
    .replace(/^cc\s+/i, "cc. ");
  return adminSzintezisNevKulcs(sima);
}

function szintezisReakcioFelsoAlsoSzoveg(reakcio) {
  const besorolas = szintezisReakcioBesorolas(reakcio);

  return {
    felso: szintezisOldalKartya(besorolas.felso, "felso").felirat,
    also: szintezisOldalKartya(besorolas.also, "also").felirat,
  };
}

function adminSzintezisLathatoAnyagok(ertekek, latott) {
  const eredmeny = [];

  for (const ertek of (Array.isArray(ertekek) ? ertekek : [ertekek]).flat()) {
    const szoveg = String(ertek ?? "").trim();
    const kulcs = adminSzintezisAnyagKulcs(szoveg);
    if (!kulcs || latott.has(kulcs)) continue;
    latott.add(kulcs);
    eredmeny.push(szintezisKartyaFelirat(szoveg));
  }

  return eredmeny.join(" · ");
}

function adminSzintezisKepletek(ertekek) {
  return adminSzintezisLathatoAnyagok(ertekek, new Set());
}

function adminSzintezisListaMegjelenitese(reakciok) {
  const lista = document.getElementById("admin-szintezis-lista");
  const lapozas = document.getElementById("admin-szintezis-lapozas");
  if (!lista) return;

  lista.replaceChildren();

  if (!Array.isArray(reakciok) || reakciok.length === 0) {
    const ures = document.createElement("p");
    ures.className = "admin-lista-ures";
    ures.textContent = "Nincs aktiválásra váró kézi reakció.";
    lista.append(ures);
  }

  for (const reakcio of Array.isArray(reakciok) ? reakciok : []) {
    const kartya = document.createElement("article");
    kartya.className = "admin-szintezis-reakcio szintezis-reakcio-panel";

    const feliratok = szintezisReakcioFelsoAlsoSzoveg(reakcio);
    kartya.append(
      szintezisReakcioSor({
        cim: reakcio.reakcio_tipus,
        kiindulasi: reakcio.kiindulasi_molekula,
        felsoSzoveg: feliratok.felso,
        alsoSzoveg: feliratok.also,
        termekek: reakcio.termekek ?? [],
        termekAdatok: true,
        gorgetes: true,
      })
    );

    const kilepo = adminSzintezisKepletek(reakcio.kilepo_anyagok);
    if (kilepo) {
      const kilepoFelirat = document.createElement("p");
      kilepoFelirat.className = "admin-szintezis-kilepo-felirat";
      kilepoFelirat.textContent = `Kilépő anyagok: ${kilepo}`;
      kartya.append(kilepoFelirat);
    }

    const gombok = document.createElement("div");
    gombok.className = "admin-szintezis-reakcio-gombok";

    const aktivalas = document.createElement("button");
    aktivalas.type = "button";
    aktivalas.className = "admin-szintezis-aktivalas";
    aktivalas.dataset.reakcioId = reakcio.id;
    aktivalas.dataset.muvelet = "szintezis-kezi-aktivalas";
    aktivalas.textContent = "Aktiválás";

    const elutasitas = document.createElement("button");
    elutasitas.type = "button";
    elutasitas.className = "admin-szintezis-elutasitas";
    elutasitas.dataset.reakcioId = reakcio.id;
    elutasitas.dataset.muvelet = "szintezis-kezi-elutasitas";
    elutasitas.textContent = "Elutasítás";

    gombok.append(aktivalas, elutasitas);
    kartya.append(gombok);
    lista.append(kartya);
  }

  if (lapozas) {
    const lathato =
      adminSzintezisAllapot.oldal > 0 ||
      adminSzintezisAllapot.vanKovetkezoOldal;
    lapozas.hidden = !lathato;
    const elozo = document.getElementById("admin-szintezis-elozo-oldal");
    const kovetkezo = document.getElementById(
      "admin-szintezis-kovetkezo-oldal"
    );
    if (elozo) elozo.disabled = adminSzintezisAllapot.oldal <= 0;
    if (kovetkezo) {
      kovetkezo.disabled = !adminSzintezisAllapot.vanKovetkezoOldal;
    }
  }
}

async function adminSzintezisListaBetoltese(oldal = adminSzintezisAllapot.oldal) {
  adminVisszajelzes(
    "admin-szintezis-lista-visszajelzes",
    "Ellenőrzési lista betöltése…"
  );

  const adat = await adminApiHivas({
    muvelet: "szintezis-kezi-lista",
    oldal,
  });

  adminSzintezisAllapot.oldal = adat.oldal ?? oldal;
  adminSzintezisAllapot.vanKovetkezoOldal = Boolean(adat.vanKovetkezoOldal);
  adminSzintezisListaMegjelenitese(adat.reakciok ?? []);
  adminVisszajelzes(
    "admin-szintezis-lista-visszajelzes",
    adat.darab
      ? `${adat.darab} ellenőrzésre váró reakció.`
      : ""
  );
}

async function adminSzintezisListaMuvelet(gomb) {
  const reakcioId = gomb.dataset.reakcioId;
  const muvelet = gomb.dataset.muvelet;
  if (!reakcioId || !muvelet) return;

  gomb.disabled = true;
  try {
    const eredmeny = await adminApiHivas({ muvelet, reakcioId });
    adminVisszajelzes(
      "admin-szintezis-lista-visszajelzes",
      eredmeny.uzenet ?? "A művelet sikerült.",
      "sikeres"
    );
    if (muvelet === "szintezis-kezi-elutasitas") {
      adminSzintezisAllapot.oldal = 0;
    }
    await adminSzintezisListaBetoltese(adminSzintezisAllapot.oldal);
  } catch (hiba) {
    adminVisszajelzes(
      "admin-szintezis-lista-visszajelzes",
      hiba instanceof Error ? hiba.message : String(hiba),
      "hiba"
    );
  } finally {
    gomb.disabled = false;
  }
}

function adminSzintezisKeszitoBekotese() {
  const megnyitasGomb = document.getElementById("admin-szintezis-megnyitas");
  const keszito = document.getElementById("admin-szintezis-keszito");

  megnyitasGomb?.addEventListener("click", async () => {
    if (!keszito) return;
    const megnyitas = keszito.hidden;
    keszito.hidden = !megnyitas;
    megnyitasGomb.textContent = megnyitas
      ? "Készítő bezárása"
      : "Új reakció létrehozása";
    if (!megnyitas) return;

    megnyitasGomb.disabled = true;
    adminVisszajelzes(
      "admin-szintezis-visszajelzes",
      "Molekulák betöltése…"
    );
    try {
      await adminSzintezisMolekulakBetoltese();
      adminVisszajelzes("admin-szintezis-visszajelzes", "");
    } catch (hiba) {
      adminVisszajelzes(
        "admin-szintezis-visszajelzes",
        hiba instanceof Error ? hiba.message : String(hiba),
        "hiba"
      );
    } finally {
      megnyitasGomb.disabled = false;
    }
  });

  const kiindulasGyoker = document
    .getElementById("admin-szintezis-kiindulas-kereso")
    ?.closest(".admin-szintezis-kereso");
  adminSzintezisKeresoBekotese(kiindulasGyoker, (azonosito) => {
    adminSzintezisKiindulasElonezet(azonosito);
  });

  document
    .getElementById("admin-szintezis-termek-hozzaadas")
    ?.addEventListener("click", () => {
      const termekek = document.getElementById("admin-szintezis-termekek");
      termekek?.append(
        adminSzintezisTermekSor(adminSzintezisSzabadSorszam())
      );
    });

  document
    .getElementById("admin-szintezis-mentes")
    ?.addEventListener("click", async () => {
      const gomb = document.getElementById("admin-szintezis-mentes");
      let adat;
      try {
        adat = adminSzintezisMentesAdat();
      } catch (hiba) {
        adminVisszajelzes(
          "admin-szintezis-visszajelzes",
          hiba instanceof Error ? hiba.message : String(hiba),
          "hiba"
        );
        return;
      }

      if (gomb) gomb.disabled = true;
      adminVisszajelzes(
        "admin-szintezis-visszajelzes",
        "Reakció mentése…"
      );
      try {
        const eredmeny = await adminApiHivas({
          muvelet: "szintezis-kezi-mentes",
          adat,
        });
        adminSzintezisUrlapTorlese();
        adminSzintezisAllapot.oldal = 0;
        adminVisszajelzes(
          "admin-szintezis-visszajelzes",
          eredmeny.uzenet ?? "A reakció elmentve, aktiválásra vár.",
          "sikeres"
        );
        await adminSzintezisListaBetoltese(0);
      } catch (hiba) {
        adminVisszajelzes(
          "admin-szintezis-visszajelzes",
          hiba instanceof Error ? hiba.message : String(hiba),
          "hiba"
        );
      } finally {
        if (gomb) gomb.disabled = false;
      }
    });

  document
    .getElementById("admin-szintezis-lista-frissites")
    ?.addEventListener("click", () => {
      adminSzintezisListaBetoltese(adminSzintezisAllapot.oldal).catch(
        (hiba) => {
          adminVisszajelzes(
            "admin-szintezis-lista-visszajelzes",
            hiba instanceof Error ? hiba.message : String(hiba),
            "hiba"
          );
        }
      );
    });

  document
    .getElementById("admin-szintezis-elozo-oldal")
    ?.addEventListener("click", () => {
      adminSzintezisListaBetoltese(
        Math.max(0, adminSzintezisAllapot.oldal - 1)
      ).catch((hiba) => {
        adminVisszajelzes(
          "admin-szintezis-lista-visszajelzes",
          hiba instanceof Error ? hiba.message : String(hiba),
          "hiba"
        );
      });
    });

  document
    .getElementById("admin-szintezis-kovetkezo-oldal")
    ?.addEventListener("click", () => {
      adminSzintezisListaBetoltese(adminSzintezisAllapot.oldal + 1).catch(
        (hiba) => {
          adminVisszajelzes(
            "admin-szintezis-lista-visszajelzes",
            hiba instanceof Error ? hiba.message : String(hiba),
            "hiba"
          );
        }
      );
    });

  document
    .getElementById("admin-szintezis-lista")
    ?.addEventListener("click", (esemeny) => {
      const gomb = esemeny.target.closest("button[data-muvelet]");
      if (!gomb) return;
      adminSzintezisListaMuvelet(gomb);
    });
}

function adminMuveletGombokBekotese() {
      const importMegnyitasGomb =
    document.getElementById("admin-import-megnyitas");

  const importTartalom =
    document.getElementById("admin-import-tartalom");

  importMegnyitasGomb?.addEventListener("click", () => {
    if (!importTartalom) return;

    const megnyitas = importTartalom.hidden;
    importTartalom.hidden = !megnyitas;

    importMegnyitasGomb.textContent = megnyitas
      ? "Importálás bezárása"
      : "Új molekula importálása";
  });
    document
    .getElementById("admin-import-gomb")
    ?.addEventListener("click", async () => {
      const gomb =
        document.getElementById("admin-import-gomb");

      const cidDarabok = (
  document.getElementById("admin-import-cid")?.value ?? ""
)
  .trim()
  .split(/[\s,;]+/)
  .filter(Boolean);

const cidek = [...new Set(cidDarabok.map(Number))];
const cid = cidek[0];
      const keresesiNev =
        document.getElementById("admin-import-nev")
          ?.value?.trim() ?? "";

      if (
  cidDarabok.length === 0 ||
  cidDarabok.some(
    (resz) =>
      !/^[1-9]\d*$/.test(resz) ||
      !Number.isSafeInteger(Number(resz))
  )
) {
        adminVisszajelzes(
          "admin-import-visszajelzes",
          "Adj meg egy érvényes PubChem CID-et.",
          "hiba"
        );
        return;
      }

      if (cidek.length > 1 && keresesiNev) {
  adminVisszajelzes(
    "admin-import-visszajelzes",
    "Több CID importálásakor hagyd üresen a magyar keresési név mezőt.",
    "hiba"
  );
  return;
}

      gomb.disabled = true;
      adminVisszajelzes(
        "admin-import-visszajelzes",
        "Molekula importálása…"
      );

      try {
  const sikeresCidek = [];
  const hibak = [];

  for (let sorszam = 0; sorszam < cidek.length; sorszam++) {
    const aktualisCid = cidek[sorszam];

    adminVisszajelzes(
      "admin-import-visszajelzes",
      `Importálás ${sorszam + 1}/${cidek.length}: ${aktualisCid}…`
    );

    try {
      const eredmeny = await adminApiHivas({
        muvelet: "pubchem-import",
        pubchemCid: aktualisCid,
        keresesiNev: cidek.length === 1 ? keresesiNev : "",
      });

      sikeresCidek.push({
        cid: aktualisCid,
        uzenet: eredmeny.uzenet ?? "Az import befejeződött.",
      });
    } catch (hiba) {
      hibak.push(
        `${aktualisCid}: ${
          hiba instanceof Error ? hiba.message : String(hiba)
        }`
      );
    }
  }

  await adminListaBetoltese();

  adminVisszajelzes(
    "admin-import-visszajelzes",
    cidek.length === 1 && hibak.length === 0
      ? sikeresCidek[0].uzenet
      : `${sikeresCidek.length}/${cidek.length} import sikeres.${
          hibak.length ? ` Hibák: ${hibak.join(" | ")}` : ""
        }`,
    hibak.length ? "hiba" : "sikeres"
  );
      } catch (hiba) {
        adminVisszajelzes(
          "admin-import-visszajelzes",
          hiba instanceof Error ? hiba.message : String(hiba),
          "hiba"
        );
      } finally {
        gomb.disabled = false;
      }
    });
  document
    .getElementById(
      "admin-mentes"
    )
    ?.addEventListener(
      "click",
      () =>
        adminJavitasokMentese(
          "mentes"
        )
    );

  document
    .getElementById(
      "admin-aktivalas"
    )
    ?.addEventListener(
      "click",
      () =>
        adminJavitasokMentese(
          "aktivalas"
        )
    );

      document
    .getElementById(
      "admin-elutasitas"
    )
    ?.addEventListener(
      "click",
      adminMolekulaElutasitasa
    );
}

function adminLoginBekotese() {
  const urlap =
    document.getElementById(
      "admin-login-urlap"
    );

  const frissitesGomb =
    document.getElementById(
      "admin-frissites"
    );

  const kijelentkezesGomb =
    document.getElementById(
      "admin-kijelentkezes"
    );

  urlap?.addEventListener(
    "submit",
    async (esemeny) => {
      esemeny.preventDefault();

      const email =
        document.getElementById(
          "admin-email"
        )?.value.trim();

      const jelszo =
        document.getElementById(
          "admin-jelszo"
        )?.value ?? "";

      const belepesGomb =
        document.getElementById(
          "admin-belepes"
        );

      if (
        !email ||
        !jelszo
      ) {
        adminVisszajelzes(
          "admin-login-visszajelzes",
          "Add meg az e-mail-címet és a jelszót!",
          "hiba"
        );

        return;
      }

      if (belepesGomb) {
        belepesGomb.disabled =
          true;
      }

      adminVisszajelzes(
        "admin-login-visszajelzes",
        "Bejelentkezés…"
      );

      try {
        await adminBejelentkezes(
          email,
          jelszo
        );

        adminNezetBeallitasa(
          true
        );

        adminVisszajelzes(
          "admin-login-visszajelzes",
          ""
        );

        await adminListaBetoltese();
        try {
          await adminSzintezisListaBetoltese(0);
        } catch (listaHiba) {
          adminVisszajelzes(
            "admin-szintezis-lista-visszajelzes",
            listaHiba instanceof Error
              ? listaHiba.message
              : String(listaHiba),
            "hiba"
          );
        }
      } catch (hiba) {
        adminMunkamenetTorlese();

        adminNezetBeallitasa(
          false
        );

        adminVisszajelzes(
          "admin-login-visszajelzes",
          hiba instanceof Error
            ? hiba.message
            : String(hiba),
          "hiba"
        );
      } finally {
        if (belepesGomb) {
          belepesGomb.disabled =
            false;
        }
      }
    }
  );

  frissitesGomb?.addEventListener(
    "click",
    async () => {
      try {
        await adminListaBetoltese();
      } catch (hiba) {
        adminVisszajelzes(
          "admin-muvelet-visszajelzes",
          hiba instanceof Error
            ? hiba.message
            : String(hiba),
          "hiba"
        );
      }
    }
  );

  kijelentkezesGomb
    ?.addEventListener(
      "click",
      () => {
        adminMunkamenetTorlese();
        adminNezetBeallitasa(
          false
        );

        const lista =
          document.getElementById(
            "admin-molekula-lista"
          );

        lista?.replaceChildren();

        adminVisszajelzes(
          "admin-login-visszajelzes",
          "Sikeresen kijelentkeztél.",
          "sikeres"
        );
      }
    );
}

const TANULO_MUNKAMENET_KULCS =
  "szerves-jatek-tanulo-munkamenet";


async function tanoraNyilvanosApiHivas(
  torzs
) {
  const valasz =
    await fetch(
      `${adatbazisAlapUrl()}/functions/v1/tanora-kezeles`,
      {
        method: "POST",

        headers: {
          apikey:
            ADATBAZIS_BEALLITASOK
              .publishableKey,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(torzs),
        cache: "no-store",
      }
    );

  const valaszSzoveg =
    await valasz.text();

  let adat;

  try {
    adat = valaszSzoveg
      ? JSON.parse(valaszSzoveg)
      : {};
  } catch {
    throw new Error(
      "A tanórai API érvénytelen választ adott."
    );
  }

  if (
    !valasz.ok ||
    adat.sikeres === false
  ) {
    throw new Error(
      adat.hiba ??
      `HTTP ${valasz.status}`
    );
  }

  return adat;
}


function tanuloVarakozasMegjelenitese(
  becenev
) {
  const urlapResz =
    document.getElementById(
      "tanulo-csatlakozas-urlap-resz"
    );

  const varakozas =
    document.getElementById(
      "tanulo-varakozas"
    );

  const nevElem =
    document.getElementById(
      "tanulo-bejelentkezett-nev"
    );

  if (urlapResz) {
    urlapResz.hidden = true;
  }

  if (varakozas) {
    varakozas.hidden = false;
  }

  if (nevElem) {
    nevElem.textContent =
      becenev;
  }
}


function tanuloMunkamenetBetoltese(
  csatlakozasiKod
) {
  const mentettSzoveg =
    sessionStorage.getItem(
      TANULO_MUNKAMENET_KULCS
    );

  if (!mentettSzoveg) {
    return null;
  }

  try {
    const mentett =
      JSON.parse(mentettSzoveg);

    if (
      mentett
        ?.csatlakozasiKod !==
        csatlakozasiKod ||
      !mentett?.jatekosToken ||
      !mentett?.becenev
    ) {
      return null;
    }

    return mentett;
  } catch {
    sessionStorage.removeItem(
      TANULO_MUNKAMENET_KULCS
    );

    return null;
  }
}

let tanuloJelenletId = null;

function tanuloJelenletInditasa() {
  if (tanuloJelenletId !== null) {
    return;
  }

  const jelenletKuldes = () => {
    const munkamenet =
      aktualisTanuloMunkamenetBetoltese();

    if (!munkamenet) {
      return;
    }

    tanoraNyilvanosApiHivas({
      muvelet: "jelenlet",
      jatekosId: munkamenet.jatekosId,
      jatekosToken: munkamenet.jatekosToken,
    }).catch((hiba) => {
      console.warn(
        "[TANÓRA] A jelenlétjelzés nem sikerült:",
        hiba
      );
    });
  };

  jelenletKuldes();
  tanuloJelenletId =
    window.setInterval(jelenletKuldes, 10000);
}

function tanuloJelenletLeallitasa() {
  if (tanuloJelenletId !== null) {
    window.clearInterval(tanuloJelenletId);
    tanuloJelenletId = null;
  }
}

let tanuloAllapotFigyeloId =
  null;

let tanoraiJatekVegeIdopont =
  null;

let tanoraiJatekInditasaMegkezdodott =
  false;

  function aktualisTanuloMunkamenetBetoltese() {
  const kod =
    new URLSearchParams(
      window.location.search
    )
      .get("ora")
      ?.trim()
      .toUpperCase();

  if (!kod) {
    return null;
  }

  const mentettSzoveg =
    sessionStorage.getItem(
      TANULO_MUNKAMENET_KULCS
    );

  if (!mentettSzoveg) {
    return null;
  }

  try {
    const munkamenet =
      JSON.parse(mentettSzoveg);

    if (
      munkamenet
        ?.csatlakozasiKod !== kod ||
      !munkamenet?.jatekosId ||
      !munkamenet?.jatekosToken
    ) {
      return null;
    }

    return munkamenet;
  } catch {
    return null;
  }
}


async function tanoraiEredmenyKuldes(
  allapot = "jatszik"
) {
  const munkamenet =
    aktualisTanuloMunkamenetBetoltese();

  if (!munkamenet) {
    return false;
  }

  const pont = Math.max(
    0,
    Math.round(
      Number(molekulaAllapot.pontszam) || 0
    )
  );

  const teljesitettRendelesek =
    Math.max(
      0,
      Math.round(
        Number(
          molekulaAllapot
            .teljesitettRendelesek
        ) || 0
      )
    );

  if (helyiJatekUt()) {
    /*
     * Lejáratkor a már mentett
     * állás az eredmény; újabb
     * küldés a futó tanórákra
     * korlátozott végpont miatt
     * nem kell.
     */
    if (allapot === "befejezte") {
      return true;
    }

    const valasz = await fetch(
      "/api/tanora/eredmeny-frissites",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          jatekosId:
            munkamenet.jatekosId,
          jatekosToken:
            munkamenet.jatekosToken,
          pont,
          teljesitettRendelesek,
        }),
        cache: "no-store",
      }
    );

    const adat = await valasz.json();

    if (!valasz.ok || !adat?.sikeres) {
      throw new Error(
        adat?.hiba ||
          "Az eredmény mentése sikertelen."
      );
    }

    return true;
  }

  await tanoraNyilvanosApiHivas({
    muvelet:
      "eredmeny-frissites",

    jatekosId:
      munkamenet.jatekosId,

    jatekosToken:
      munkamenet.jatekosToken,

    pont,
    teljesitettRendelesek,
    allapot,
  });

  return true;
}

async function tanuloAllapotEllenorzese(
  munkamenet
) {
  const adat =
    await tanoraNyilvanosApiHivas({
      muvelet:
        "jatekos-allapot",

      jatekosId:
        munkamenet.jatekosId,

      jatekosToken:
        munkamenet.jatekosToken,
    });

  if (
    adat?.tanora?.allapot !==
      "folyamatban" ||
    tanoraiJatekInditasaMegkezdodott
  ) {
    return;
  }

    const maxNehezseg =
    Number(adat.tanora.maxNehezseg);

  const tiltottCsaladok =
    adat.tanora.tiltottCsaladok;

  if (
    ![1, 2, 3].includes(maxNehezseg) ||
    !Array.isArray(tiltottCsaladok) ||
    tiltottCsaladok.some(
      (csalad) => typeof csalad !== "string"
    )
  ) {
    throw new Error(
      "A tanóra molekulaszűrő beállításai hiányoznak vagy hibásak."
    );
  }

  const tanoraiSzurok = {
    maxNehezseg,
    tiltottCsaladok,
    csaladSzuroVerzio:
      adat.tanora.csaladSzuroVerzio === 2 ? 2 : 1,
  };

  tanoraiJatekInditasaMegkezdodott =
    true;

  if (
    tanuloAllapotFigyeloId !==
      null
  ) {
    window.clearInterval(
      tanuloAllapotFigyeloId
    );

    tanuloAllapotFigyeloId =
      null;
  }

  const inditasiIdo =
    Date.parse(
      adat.tanora.elinditva
    );

  const idotartamMasodperc =
    Number(
      adat.tanora
        .idotartamMasodperc
    );

  if (
    Number.isFinite(inditasiIdo) &&
    Number.isFinite(
      idotartamMasodperc
    )
  ) {
    tanoraiJatekVegeIdopont =
      inditasiIdo +
      idotartamMasodperc *
        1000;
  }

  const kepernyo =
    document.getElementById(
      "tanulo-csatlakozas-kepernyo"
    );

  if (kepernyo) {
    kepernyo.hidden = true;
  }

  await molekulaJatekMegnyitasa(tanoraiSzurok);
}


function tanuloAllapotFigyelesInditasa(
  munkamenet
) {
  if (
    tanuloAllapotFigyeloId !==
      null
  ) {
    window.clearInterval(
      tanuloAllapotFigyeloId
    );
  }

  const ellenorzes = () => {
    tanuloAllapotEllenorzese(
      munkamenet
    ).catch((hiba) => {
      console.error(
        "[TANÓRA] A tanári indítás ellenőrzése sikertelen:",
        hiba
      );
    });
  };

  ellenorzes();

  tanuloAllapotFigyeloId =
    window.setInterval(
      ellenorzes,
      2000
    );
}

function helyiJatekUt() {
  const ut =
    window.location.pathname.replace(
      /\/+$/,
      ""
    ) || "/";

  return ut === "/jatek" || ut.endsWith("/jatek");
}


function helyiTanoraCsatlakozasraVissza() {
  sessionStorage.removeItem(
    TANULO_MUNKAMENET_KULCS
  );

  window.location.assign(
    "/csatlakozas"
  );
}


function helyiTanoraVegeMegjelenitese() {
  const fomenu =
    document.getElementById("fomenu");

  const kepernyo =
    document.getElementById(
      "tanulo-csatlakozas-kepernyo"
    );

  if (fomenu) {
    fomenu.hidden = true;
  }

  if (kepernyo) {
    kepernyo.hidden = true;
  }

  betoltesKepernyoMegjelenitese();

  const startGomb =
    document.getElementById(
      "jatek-tenyleges-inditasa"
    );

  if (startGomb) {
    startGomb.hidden = true;
  }

  betoltesUzenetFrissitese(
    "A játék véget ért"
  );
}


async function helyiTanoraAllapotLekerdezese(
  munkamenet
) {
  const valasz = await fetch(
    "/api/tanora/jatekos-allapot",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        jatekosId: munkamenet.jatekosId,
        jatekosToken:
          munkamenet.jatekosToken,
      }),
      cache: "no-store",
    }
  );

  const adat = await valasz.json();

  if (valasz.status === 401) {
    helyiTanoraCsatlakozasraVissza();
    return null;
  }

  if (!valasz.ok || !adat?.sikeres) {
    throw new Error(
      adat?.hiba ||
        "Az állapot lekérdezése sikertelen."
    );
  }

  return adat;
}


async function helyiTanoraiJatekInditasa(
  csatlakozasiKod
) {
  if (
    !/^[A-HJ-NP-Z2-9]{6}$/.test(
      csatlakozasiKod
    )
  ) {
    helyiTanoraCsatlakozasraVissza();
    return;
  }

  const munkamenet =
    tanuloMunkamenetBetoltese(
      csatlakozasiKod
    );

  if (!munkamenet?.jatekosId) {
    helyiTanoraCsatlakozasraVissza();
    return;
  }

  const fomenu =
    document.getElementById("fomenu");

  if (fomenu) {
    fomenu.hidden = true;
  }

  betoltesKepernyoMegjelenitese();
  betoltesUzenetFrissitese(
    "Tanóra állapotának ellenőrzése…"
  );

  try {
    const adat =
      await helyiTanoraAllapotLekerdezese(
        munkamenet
      );

    if (!adat) {
      return;
    }

    const tanora = adat.tanora;

    if (tanora?.allapot === "varakozik") {
      window.location.assign(
        "/csatlakozas"
      );
      return;
    }

    if (tanora?.allapot === "befejezve") {
      helyiTanoraVegeMegjelenitese();
      return;
    }

    if (tanora?.allapot !== "folyamatban") {
      throw new Error(
        "Ismeretlen tanóraállapot."
      );
    }

    const maxNehezseg = Number(
      tanora.maxNehezseg
    );
    const tiltottCsaladok =
      tanora.tiltottCsaladok;

    if (
      ![1, 2, 3].includes(maxNehezseg) ||
      !Array.isArray(tiltottCsaladok) ||
      tiltottCsaladok.some(
        (csalad) =>
          typeof csalad !== "string"
      )
    ) {
      throw new Error(
        "A tanóra molekulaszűrő beállításai hiányoznak vagy hibásak."
      );
    }

    const lejaratMs = Date.parse(
      tanora.lejarat
    );
    const szerverMs = Date.parse(
      tanora.szerverido
    );

    if (
      !Number.isFinite(lejaratMs) ||
      !Number.isFinite(szerverMs)
    ) {
      throw new Error(
        "Érvénytelen szerveridő érkezett."
      );
    }

    const hatralevoMs =
      lejaratMs - szerverMs;

    if (hatralevoMs <= 0) {
      helyiTanoraVegeMegjelenitese();
      return;
    }

    tanoraiJatekVegeIdopont =
      Date.now() + hatralevoMs;

    tanoraiJatekInditasaMegkezdodott =
      true;

    await molekulaJatekMegnyitasa(
      {
        maxNehezseg,
        tiltottCsaladok,
        csaladSzuroVerzio:
          tanora.csaladSzuroVerzio === 2 ? 2 : 1,
      },
      {
        azonnaliInditas: true,
      }
    );

    const mentettPont = Number(
      adat.jatekos?.pont
    );
    const mentettTeljesitett = Number(
      adat.jatekos?.teljesitettRendelesek
    );

    if (
      Number.isFinite(mentettPont) &&
      mentettPont >= 0
    ) {
      molekulaAllapot.pontszam =
        Math.floor(mentettPont);
    }

    if (
      Number.isFinite(mentettTeljesitett) &&
      mentettTeljesitett >= 0
    ) {
      molekulaAllapot.teljesitettRendelesek =
        Math.floor(mentettTeljesitett);
    }

    pontszamMegjelenitesFrissitese();
  } catch (hiba) {
    console.error(
      "[HELYI TANÓRA] A játék indítása sikertelen:",
      hiba
    );

    betoltesUzenetFrissitese(
      hiba instanceof Error
        ? hiba.message
        : "A játék indítása sikertelen."
    );
  }
}


function tanuloCsatlakozasInditasa() {
  const parameterek =
    new URLSearchParams(
      window.location.search
    );

  const kodParameter =
    parameterek.get("ora");

  if (!kodParameter) {
    return;
  }

  const csatlakozasiKod =
    kodParameter
      .trim()
      .toUpperCase();

  if (helyiJatekUt()) {
    /*
     * A /jatek/ oldal scriptje a
     * hívás után még inicializálja
     * a molekulaállapotot, ezért a
     * helyi tanórai indítást a
     * jelenlegi script futása utánra
     * halasztjuk.
     */
    void Promise.resolve().then(
      () => {
        helyiTanoraiJatekInditasa(
          csatlakozasiKod
        );
      }
    );
    return;
  }

  tanuloiFomenuGombBeallitasa();

    const tanoraKodFormatumaErvenyes =
  /^[A-HJ-NP-Z2-9]{6}$/.test(
    csatlakozasiKod
  );

debug(
  "QR-kódos tanórai csatlakozás feldolgozása",
  {
    kodParameterMegvan:
      Boolean(kodParameter),

    kodHossz:
      csatlakozasiKod.length,

    kodFormatumaErvenyes:
      tanoraKodFormatumaErvenyes,

    csatlakozasModja:
      "QR-kód vagy teljes hivatkozás",
  }
);

  const fomenu =
    document.getElementById(
      "fomenu"
    );

  const kepernyo =
    document.getElementById(
      "tanulo-csatlakozas-kepernyo"
    );

  const kodElem =
    document.getElementById(
      "tanulo-tanora-kod"
    );

  const urlap =
    document.getElementById(
      "tanulo-csatlakozas-urlap"
    );

  if (fomenu) {
    fomenu.hidden = true;
  }

  if (kepernyo) {
    kepernyo.hidden = false;
  }

  if (kodElem) {
    kodElem.textContent =
      csatlakozasiKod;
  }

  if (
  !tanoraKodFormatumaErvenyes
) {
    adminVisszajelzes(
      "tanulo-csatlakozas-visszajelzes",
      "A csatlakozási címben érvénytelen tanórai kód szerepel.",
      "hiba"
    );

    return;
  }

  const mentettMunkamenet =
    tanuloMunkamenetBetoltese(
      csatlakozasiKod
    );

    if (mentettMunkamenet) {
    tanuloVarakozasMegjelenitese(
      mentettMunkamenet.becenev
    );

    tanuloAllapotFigyelesInditasa(
      mentettMunkamenet
    );
    tanuloJelenletInditasa();

    return;
  }

  urlap?.addEventListener(
    "submit",
    async (esemeny) => {
      esemeny.preventDefault();

      const becenevElem =
        document.getElementById(
          "tanulo-becenev"
        );

      const gomb =
        document.getElementById(
          "tanulo-csatlakozas-gomb"
        );

      const becenev =
        becenevElem
          ?.value
          .trim() ?? "";

      if (!becenev) {
        adminVisszajelzes(
          "tanulo-csatlakozas-visszajelzes",
          "Add meg a neved vagy beceneved!",
          "hiba"
        );

        return;
      }

      if (gomb) {
        gomb.disabled = true;
      }

      adminVisszajelzes(
        "tanulo-csatlakozas-visszajelzes",
        "Csatlakozás…"
      );

      try {
        const adat =
          await tanoraNyilvanosApiHivas({
            muvelet:
              "csatlakozas",

            csatlakozasiKod,
            becenev,
          });

        const jatekos =
          adat?.jatekos;

        if (
          !jatekos?.id ||
          !jatekos?.jatekosToken
        ) {
          throw new Error(
            "A csatlakozás hiányos választ adott."
          );
        }

                const munkamenet = {
          csatlakozasiKod,

          jatekosId:
            jatekos.id,

          jatekosToken:
            jatekos
              .jatekosToken,

          becenev:
            jatekos.becenev,

          idotartamMasodperc:
            adat
              ?.tanora
              ?.idotartamMasodperc ??
            900,
        };

        sessionStorage.setItem(
          TANULO_MUNKAMENET_KULCS,
          JSON.stringify(
            munkamenet
          )
        );

        tanuloVarakozasMegjelenitese(
          jatekos.becenev
        );

        tanuloAllapotFigyelesInditasa(
          munkamenet
        );
        tanuloJelenletInditasa();

      } catch (hiba) {
        adminVisszajelzes(
          "tanulo-csatlakozas-visszajelzes",

          hiba instanceof Error
            ? hiba.message
            : String(hiba),

          "hiba"
        );
      } finally {
        if (gomb) {
          gomb.disabled = false;
        }
      }
    }
  );
}

async function adminFeluletenekInditasa() {
  const adminMod =
    new URLSearchParams(
      window.location.search
    ).get("admin") === "1";

  if (!adminMod) {
    return;
  }

  kepernyoValtas("admin");
  adminLoginBekotese();
  adminMuveletGombokBekotese();
  adminSzintezisKeszitoBekotese();
  adminPolimerKeszitoBekotese();

  document
    .getElementById(
      "admin-polimer-mentes"
    )
    ?.addEventListener(
      "click",
      adminPolimerMentese
    );

  tanoraVezerloBekotese();
  tanoraQrNagyitasBekotese();
  tanoraJatekosGombokBekotese();

  const vanMunkamenet =
    adminMunkamenetBetoltese();

  adminNezetBeallitasa(
    vanMunkamenet
  );

  if (!vanMunkamenet) {
    return;
  }

  try {
    await adminListaBetoltese();
    try {
      await adminSzintezisListaBetoltese(0);
    } catch (listaHiba) {
      adminVisszajelzes(
        "admin-szintezis-lista-visszajelzes",
        listaHiba instanceof Error
          ? listaHiba.message
          : String(listaHiba),
        "hiba"
      );
    }
  } catch (hiba) {
    adminMunkamenetTorlese();
    adminNezetBeallitasa(false);

    adminVisszajelzes(
      "admin-login-visszajelzes",
      hiba instanceof Error
        ? hiba.message
        : String(hiba),
      "hiba"
    );
  }
}

adminFeluletenekInditasa();
tanuloCsatlakozasInditasa();

// ==================================================
// MOLEKULAÉPÍTŐ ÁLLAPOTA
// ==================================================

const molekulaAllapot = {
kivalasztottRendelesId: null,

aktivRendelesIds: [],

kovetkezoRendelesId: null,
  rendelesZsak: [],
  legutobbiRendelesIds: [],

  kivalasztottAtomTipus: null,
  kivalasztottKotes: 1,
  kivalasztottKotesSztereo: "sik",
  lancKotes: false,
  koteshezKivalasztottAtomId: null,
  kovetkezoKotesId: 1,

  atomok: [],
  kotesek: [],

  kovetkezoAtomId: 1,

    nevadasraVaroMolekula: null,
  nevadasraVaroRendeles: null,

  aktivPolimer:
    null,

  polimerKapcsolatok: [],

  pontszam: 0,
  teljesitettRendelesek: 0,

  keszlet: {
  C: Infinity,
  O: Infinity,
  N: Infinity,
  S: Infinity,
  P: Infinity,
  F: Infinity,
  Cl: Infinity,
  Br: Infinity,
  I: Infinity,
  Si: Infinity,
},
};

// ==================================================
// ATOMELHELYEZÉSI MÓD
// ==================================================

const ATOM_ELHELYEZES_MOD_KULCS =
  "szerves-jatek-kattintasos-atomelhelyezes";

let kattintasosAtomelhelyezes = false;

function atomElhelyezesiModAlkalmazasa(
  kattintasos,
  mentes = true
) {
  kattintasosAtomelhelyezes =
    Boolean(kattintasos);

  const kapcsoloAzonositok = [
    "kattintasos-atomelhelyezes",
    "tanulo-kattintasos-atomelhelyezes",
  ];

  const kapcsolok =
    kapcsoloAzonositok
      .map(
        (azonosito) =>
          document.getElementById(
            azonosito
          )
      )
      .filter(Boolean);

  for (
    const kapcsolo of
    kapcsolok
  ) {
    kapcsolo.checked =
      kattintasosAtomelhelyezes;
  }

  document.body.classList.toggle(
    "kattintasos-atomelhelyezes",
    kattintasosAtomelhelyezes
  );

  const utmutato =
    document.getElementById(
      "atom-elhelyezes-utmutato"
    );

  if (utmutato) {
    utmutato.textContent =
      kattintasosAtomelhelyezes
        ? "Válassz atomot a táskából, majd kattints az építőfelületre!"
        : "Húzd ide az atomokat, majd kapcsold össze őket!";
  }

  const tanuloAllapot =
    document.getElementById(
      "tanulo-atom-elhelyezes-allapot"
    );

  if (tanuloAllapot) {
    tanuloAllapot.textContent =
      kattintasosAtomelhelyezes
        ? "Kattintásos mód kiválasztva"
        : "Húzásos mód kiválasztva";
  }

  const fomenuAllapot = document.getElementById(
    "atom-elhelyezes-allapot"
  );

  if (fomenuAllapot) {
    fomenuAllapot.textContent =
      kattintasosAtomelhelyezes
        ? "Kattintásos mód kiválasztva"
        : "Húzásos mód kiválasztva";
  }

  const szintezisKepernyo = document.getElementById("szintezis-kepernyo");
  szintezisKepernyo?.classList.toggle(
    "szintezis-kattintasos",
    kattintasosAtomelhelyezes
  );
  szintezisKepernyo?.classList.toggle(
    "szintezis-huzasos",
    !kattintasosAtomelhelyezes
  );

  szintezisFuggoKijelolesTorlese();
  szintezisHelyFeliratokFrissitese();

  if (mentes) {
    try {
      localStorage.setItem(
        ATOM_ELHELYEZES_MOD_KULCS,
        String(
          kattintasosAtomelhelyezes
        )
      );
    } catch (hiba) {
      console.warn(
        "[ATOMELHELYEZÉS DEBUG] A választott mód nem menthető.",
        hiba
      );
    }
  }

  debug(
    "Atomelhelyezési mód alkalmazva",
    {
      mod:
        kattintasosAtomelhelyezes
          ? "kattintas"
          : "huzas",

      mentes,

      megtalaltKapcsolok:
        kapcsolok.map(
          (kapcsolo) =>
            kapcsolo.id
        ),
    }
  );
}


function atomElhelyezesiModBekotese() {
  const kapcsoloAzonositok = [
    "kattintasos-atomelhelyezes",
    "tanulo-kattintasos-atomelhelyezes",
  ];

  const kapcsolok =
    kapcsoloAzonositok
      .map(
        (azonosito) =>
          document.getElementById(
            azonosito
          )
      )
      .filter(Boolean);

  if (kapcsolok.length === 0) {
    console.error(
      "[ATOMELHELYEZÉS DEBUG] Egyetlen atomelhelyezési kapcsoló sem található.",
      {
        keresettAzonositok:
          kapcsoloAzonositok,
      }
    );

    return;
  }

  let mentettMod = false;

  try {
    mentettMod =
      localStorage.getItem(
        ATOM_ELHELYEZES_MOD_KULCS
      ) === "true";
  } catch (hiba) {
    console.warn(
      "[ATOMELHELYEZÉS DEBUG] A mentett atomelhelyezési mód nem olvasható.",
      hiba
    );
  }

  atomElhelyezesiModAlkalmazasa(
    mentettMod,
    false
  );

  for (
    const kapcsolo of
    kapcsolok
  ) {
    if (
      kapcsolo.dataset.bekotve ===
      "1"
    ) {
      continue;
    }

    kapcsolo.dataset.bekotve =
      "1";

    kapcsolo.addEventListener(
      "change",
      () => {
        debug(
          "Atomelhelyezési kapcsoló módosult",
          {
            forras:
              kapcsolo.id,

            ujMod:
              kapcsolo.checked
                ? "kattintas"
                : "huzas",
          }
        );

        atomElhelyezesiModAlkalmazasa(
          kapcsolo.checked
        );
      }
    );
  }

  debug(
    "Atomelhelyezési kapcsolók bekötve",
    {
      kapcsolok:
        kapcsolok.map(
          (kapcsolo) =>
            kapcsolo.id
        ),

      mentettMod:
        mentettMod
          ? "kattintas"
          : "huzas",
    }
  );
}

atomElhelyezesiModBekotese();

function rendelesNehezsegKeresese(
  rendeles
) {
  const nehezseg =
    Math.round(
      Number(
        rendeles?.nehezseg
      ) || 1
    );

  return Math.min(
    3,
    Math.max(1, nehezseg)
  );
}

function nevadasIupacBonuszPontja(
  rendeles
) {
  const nehezseg =
    rendelesNehezsegKeresese(
      rendeles
    );

  return 2 * nehezseg + 1;
}

function nevadasAlternativBonuszPontja(
  rendeles
) {
  const nehezseg =
    rendelesNehezsegKeresese(
      rendeles
    );

  return 2 * nehezseg;
}

function rendelesAlappontKiszamitasa(
  rendeles
) {
  const nehezseg =
    rendelesNehezsegKeresese(
      rendeles
    );

  if (
    rendeles.feladatMod ===
    "elnevezes"
  ) {
    return 4 * nehezseg;
  }

  return 3 * nehezseg;
}

function rendelesPontokFrissitese() {
  Object.values(
    RENDELESEK
  ).forEach((rendeles) => {
    rendeles.pont =
      rendelesAlappontKiszamitasa(
        rendeles
      );
  });

  debug(
    "A rendelések pontértékei frissítve."
  );
}

function pontszamMegjelenitesFrissitese() {
  const pontElem =
    document.getElementById("molekula-pont");

  if (!pontElem) {
    console.error(
      "[HIBA] Nem található a pontszám kijelzője."
    );
    return;
  }

  pontElem.textContent =
    molekulaAllapot.pontszam;

  debug("Pontszám kijelző frissítve", {
    pontszam: molekulaAllapot.pontszam,
  });
}

function pontokHozzaadasa(pont, ok) {
  if (!Number.isFinite(pont) || pont < 0) {
    console.error(
      "[HIBA] Érvénytelen pontérték:",
      pont
    );
    return false;
  }

  const elozoPontszam =
    molekulaAllapot.pontszam;

  molekulaAllapot.pontszam += pont;
  pontszamMegjelenitesFrissitese();

  debug("Pontok hozzáadva", {
    ok,
    hozzaadottPont: pont,
    elozoPontszam,
    ujPontszam:
      molekulaAllapot.pontszam,
  });

  return true;
}

function rendelesFeladatPanelFrissitese(
  rendelesId
) {
  const rendeles =
    RENDELESEK[rendelesId];

  const epitoPanel =
    document.getElementById(
      "epito-feladat-panel"
    );

  const atomtaskaPanel =
    document.getElementById(
      "atomtaska-panel"
    );

  const elnevezesPanel =
    document.getElementById(
      "elnevezes-feladat-panel"
    );

  if (
    !rendeles ||
    !epitoPanel ||
    !atomtaskaPanel ||
    !elnevezesPanel
  ) {
    console.error(
      "[HIBA] A feladatpanel nem frissíthető.",
      {
        rendelesId,
        rendeles,
        epitoPanel,
        atomtaskaPanel,
        elnevezesPanel,
      }
    );

    return false;
  }

  const elnevezesiFeladat =
    rendeles.feladatMod ===
    "elnevezes";

      const feladatMolekula =
    rendeles.molekulaId
      ? molekulaSablonKeresese(
          rendeles.molekulaId
        )
      : null;

  molekulaAllapot
    .aktivPolimer =
      elnevezesiFeladat
        ? null
        : structuredClone(
            feladatMolekula
              ?.polimer ??
            null
          );

          molekulaAllapot
  .polimerKapcsolatok = [];

debug(
  "A tanulói polimerkapcsolatok alaphelyzetbe állítva",
  {
    rendelesId,
    kapcsolatokSzama:
      molekulaAllapot
        .polimerKapcsolatok
        .length,
  }
);

  debug(
    "A rendelés polimerállapota beállítva",
    {
      rendelesId,
      molekulaId:
        rendeles.molekulaId ??
        null,
      polimer:
        molekulaAllapot
          .aktivPolimer,
    }
  );

    requestAnimationFrame(
    () => {
      kotesekUjrarajzolasa();
    }
  );

  epitoPanel.hidden =
    elnevezesiFeladat;

  atomtaskaPanel.hidden =
    elnevezesiFeladat;

  elnevezesPanel.hidden =
    !elnevezesiFeladat;

  if (!elnevezesiFeladat) {
    const elozoFeladat =
      molekulaAllapot
        .nevadasraVaroRendeles;

    if (
      elozoFeladat?.feladatMod ===
      "elnevezes"
    ) {
      molekulaAllapot
        .nevadasraVaroRendeles =
        null;

      molekulaAllapot
        .nevadasraVaroMolekula =
        null;
    }

    debug(
      "Az építőfelület megjelenítve.",
      {
        rendelesId,
      }
    );

    return true;
  }

  const celMolekula =
    molekulaSablonElozetAdatok(
      rendeles.molekulaId
    );

  if (!celMolekula) {
    console.error(
      "[HIBA] Az elnevezési rendelés célmolekulája nem található:",
      rendeles.molekulaId
    );

    return false;
  }

  molekulaAllapot
    .nevadasraVaroRendeles =
    rendeles;

    molekulaAllapot
    .nevadasraVaroMolekula = {
      atomok:
        structuredClone(
          celMolekula.atomok
        ),

      kotesek:
        structuredClone(
          celMolekula.kotesek
        ),

      polimer:
        structuredClone(
          celMolekula.polimer ??
          null
        ),
    };

  const celSvg =
    document.getElementById(
      "feladat-molekula-svg"
    );

    nevadasMolekulaKirajzolasa(
    molekulaAllapot
      .nevadasraVaroMolekula.atomok,

    molekulaAllapot
      .nevadasraVaroMolekula.kotesek,

    celSvg,

    molekulaAllapot
      .nevadasraVaroMolekula
      .polimer
  );

  const nevMezo =
    document.getElementById(
      "feladat-molekula-nev"
    );

  const visszajelzes =
    document.getElementById(
      "feladat-nev-visszajelzes"
    );

  const ellenorzesGomb =
    document.getElementById(
      "feladat-nev-ellenorzes"
    );

  if (nevMezo) {
    nevMezo.value = "";
  }

  if (visszajelzes) {
    visszajelzes.textContent = "";
    visszajelzes.className =
      "nevadas-visszajelzes";
  }

  if (ellenorzesGomb) {
    ellenorzesGomb.textContent =
      "Név ellenőrzése";
  }

  const erintosKeszulek =
  navigator.maxTouchPoints > 0 ||
  window.matchMedia(
    "(pointer: coarse)"
  ).matches;

if (erintosKeszulek) {
  /*
   * Telefonon az elnevezési feladat megjelenik,
   * de a billentyűzet csak a mező megérintésekor nyílik meg.
   */
  nevMezo?.blur();

  debug(
    "Az elnevezési feladat telefonon automatikus billentyűzet nélkül jelent meg",
    {
      erintosKeszulek: true,
      automatikusFokusz: false,
    }
  );
} else {
  /*
   * Számítógépen megmarad a kényelmes
   * automatikus fókusz.
   */
  window.setTimeout(
    () => {
      nevMezo?.focus({
        preventScroll: true,
      });

      debug(
        "Az elnevezési feladat névmezője automatikus fókuszt kapott",
        {
          erintosKeszulek: false,
          automatikusFokusz: true,
        }
      );
    },
    0
  );
}

  debug(
    "Az elnevezési felület megjelenítve.",
    {
      rendelesId,
      molekulaId:
        rendeles.molekulaId,
    }
  );

  return true;
}

const ELLENORZES_SIKER_VARAKOZAS = 3000;
let ellenorzesEredmenyIdozito = null;

function ellenorzesEredmenyElrejtese(
  ok = "ismeretlen"
) {
  const eredmenyElem =
    document.getElementById(
      "ellenorzes-eredmeny"
    );

  if (!eredmenyElem) {
    console.error(
      "[HIBA] Nem található az elrejtendő eredménymező."
    );

    return false;
  }

  if (ellenorzesEredmenyIdozito !== null) {
    window.clearTimeout(
      ellenorzesEredmenyIdozito
    );

    ellenorzesEredmenyIdozito = null;
  }

  eredmenyElem.hidden = true;
  eredmenyElem.textContent = "";

  eredmenyElem.classList.remove(
    "sikeres-ellenorzes",
    "hibas-ellenorzes"
  );

  debug(
    "Ellenőrzési üzenet elrejtve",
    {
      ok,
    }
  );

  return true;
}

function ellenorzesEredmenyIdozitettElrejtese(
  kesleltetes = ELLENORZES_SIKER_VARAKOZAS
) {
  if (ellenorzesEredmenyIdozito !== null) {
    window.clearTimeout(
      ellenorzesEredmenyIdozito
    );
  }

  ellenorzesEredmenyIdozito =
    window.setTimeout(() => {
      ellenorzesEredmenyElrejtese(
        "automatikus"
      );
    }, kesleltetes);

  debug(
    "Ellenőrzési üzenet elrejtése időzítve",
    {
      kesleltetes,
    }
  );
}

function rendelesKivalasztas(
  rendelesId
) {
  const kartyak = Array.from(
    document.querySelectorAll(
      ".rendeles-kartya"
    )
  );

  const kivalasztottKartya =
    kartyak.find(
      (kartya) =>
        kartya.dataset.rendelesId ===
        rendelesId
    );

  if (!kivalasztottKartya) {
    console.error(
      "[HIBA] Nem található a kiválasztott rendelés:",
      rendelesId
    );

    return;
  }

  const elozoRendelesId =
    molekulaAllapot
      .kivalasztottRendelesId;

  kartyak.forEach((kartya) => {
    kartya.classList.remove(
      "kivalasztott-rendeles"
    );

    kartya.setAttribute(
      "aria-pressed",
      "false"
    );
  });

  kivalasztottKartya.classList.add(
    "kivalasztott-rendeles"
  );

  kivalasztottKartya.setAttribute(
    "aria-pressed",
    "true"
  );

  molekulaAllapot
    .kivalasztottRendelesId =
    rendelesId;

  const rendelesNev =
    kivalasztottKartya
      .querySelector("strong")
      ?.textContent.trim() ??
    "Ismeretlen rendelés";

  debug(
    "Rendelés kiválasztva",
    {
      elozoRendelesId,
      ujRendelesId: rendelesId,
      rendelesNev,
    }
  );

  rendelesFeladatPanelFrissitese(
    rendelesId
  );
}

function rendelesekBekotese() {
  const kartyak = document.querySelectorAll(
    ".rendeles-kartya"
  );

  if (kartyak.length === 0) {
    console.error(
      "[HIBA] Egyetlen rendeléskártya sem található."
    );
    return;
  }

  kartyak.forEach((kartya) => {
    const rendelesId = kartya.dataset.rendelesId;

    if (!rendelesId) {
      console.error(
        "[HIBA] A rendeléskártyának nincs azonosítója:",
        kartya
      );
      return;
    }

        kartya.addEventListener("click", () => {
      debug("Rendeléskártyára kattintás", {
        rendelesId,
      });

      ellenorzesEredmenyElrejtese(
        "új rendelés kiválasztása"
      );

      rendelesKivalasztas(
        rendelesId
      );
    });

    debug("Rendeléskártya bekötve", {
      rendelesId,
    });
  });

  rendelesKivalasztas(
    molekulaAllapot.kivalasztottRendelesId
  );
}

// ==================================================
// ATOMTÁSKA ÉS ATOMOK ELHELYEZÉSE
// ==================================================

function keszletMegjelenitesFrissitese() {
  document.querySelectorAll(
    ".atom-gomb"
  ).forEach((atomGomb) => {
    atomGomb.disabled = false;
  });

  debug(
    "A korlátlan atomválasztó frissítve"
  );
}

function atomTipusKivalasztas(atomTipus) {
  const darab = molekulaAllapot.keszlet[atomTipus];

  if (darab === undefined) {
    console.error(
      "[HIBA] Ismeretlen atomtípus:",
      atomTipus
    );
    return;
  }

  if (darab <= 0) {
    debug("Az atom nem választható, mert elfogyott", {
      atomTipus,
    });
    return;
  }

  molekulaAllapot.kivalasztottAtomTipus = atomTipus;

  document.querySelectorAll(".atom-gomb").forEach(
    (gomb) => {
      const kivalasztott =
        gomb.dataset.atom === atomTipus;

      gomb.classList.toggle(
        "kivalasztott-atom",
        kivalasztott
      );

      gomb.setAttribute(
        "aria-pressed",
        String(kivalasztott)
      );
    }
  );

  debug("Atomtípus kiválasztva", {
    atomTipus,
    maradekDarab: darab,
  });
}

function atomHozzaadas(atomTipus, x, y) {
  if (molekulaAllapot.keszlet[atomTipus] <= 0) {
    console.error(
      "[HIBA] Nincs több felhasználható atom:",
      atomTipus
    );
    return;
  }

  const epitoTerulet =
    document.getElementById("epito-terulet");

  if (!epitoTerulet) {
    console.error(
      "[HIBA] Nem található az építőfelület."
    );
    return;
  }

  const atom = {
    id: `atom-${molekulaAllapot.kovetkezoAtomId}`,
    tipus: atomTipus,
    x,
    y,
  };

  molekulaAllapot.kovetkezoAtomId += 1;
  molekulaAllapot.atomok.push(atom);
  molekulaAllapot.keszlet[atomTipus] -= 1;

  const atomElem = document.createElement("button");

  atomElem.type = "button";
  atomElem.className =
    `epitett-atom atom-${atomTipus.toLowerCase()}`;

  atomElem.dataset.atomId = atom.id;
  atomElem.textContent = atomTipus;
  atomElem.setAttribute(
    "aria-label",
    `${atomTipus} atom`
  );

  atomElem.style.left = `${x - 25}px`;
  atomElem.style.top = `${y - 25}px`;

  epitoTerulet.appendChild(atomElem);

  implicitHidrogenekFrissitese();

  const segedszoveg = document.getElementById(
    "epito-segedszoveg"
  );

  if (segedszoveg) {
    segedszoveg.hidden = true;
  }

  keszletMegjelenitesFrissitese();

  debug("Atom hozzáadva az építőfelülethez", {
    atom: { ...atom },
    atomokSzama: molekulaAllapot.atomok.length,
    maradekKeszlet:
      molekulaAllapot.keszlet[atomTipus],
  });

  if (molekulaAllapot.keszlet[atomTipus] <= 0) {
    molekulaAllapot.kivalasztottAtomTipus = null;

    document.querySelectorAll(".atom-gomb").forEach(
      (gomb) => {
        gomb.classList.remove("kivalasztott-atom");
        gomb.setAttribute("aria-pressed", "false");
      }
    );

    debug("A kiválasztott atomtípus elfogyott", {
      atomTipus,
    });
  }
}

let aktivAtomHuzas = null;

function atomHuzasInditas(
  esemeny,
  atomTipus,
  forrasGomb
) {
  if (
    esemeny.pointerType === "mouse" &&
    esemeny.button !== 0
  ) {
    return;
  }

  if (aktivAtomHuzas) {
    debug("Új atomhúzás elutasítva: már folyamatban van egy húzás");
    return;
  }

  const darab = molekulaAllapot.keszlet[atomTipus];

  if (darab === undefined) {
    console.error(
      "[HIBA] Ismeretlen atomtípus húzása:",
      atomTipus
    );
    return;
  }

  if (darab <= 0) {
    debug("Atomhúzás elutasítva: az atom elfogyott", {
      atomTipus,
    });
    return;
  }

  const epitoTerulet =
    document.getElementById("epito-terulet");

  if (!epitoTerulet) {
    console.error(
      "[HIBA] Nem található az építőfelület."
    );
    return;
  }

  esemeny.preventDefault();

  const huzottAtom = document.createElement("div");

  huzottAtom.className =
    `huzott-atom atom-${atomTipus.toLowerCase()}`;

  huzottAtom.textContent = atomTipus;
  document.body.appendChild(huzottAtom);

  forrasGomb.classList.add("atom-huzas-alatt");

  function huzottAtomMozgatasa(pointerEsemeny) {
    pointerEsemeny.preventDefault();

    huzottAtom.style.left =
      `${pointerEsemeny.clientX}px`;

    huzottAtom.style.top =
      `${pointerEsemeny.clientY}px`;

    const terulet = epitoTerulet.getBoundingClientRect();

    const epitoFelett =
      pointerEsemeny.clientX >= terulet.left &&
      pointerEsemeny.clientX <= terulet.right &&
      pointerEsemeny.clientY >= terulet.top &&
      pointerEsemeny.clientY <= terulet.bottom;

    epitoTerulet.classList.toggle(
      "huzas-celpont",
      epitoFelett
    );
  }

  function esemenyekEltavolitasa() {
    document.removeEventListener(
      "pointermove",
      huzottAtomMozgatasa
    );

    document.removeEventListener(
      "pointerup",
      atomHuzasBefejezese
    );

    document.removeEventListener(
      "pointercancel",
      atomHuzasMegszakitasa
    );
  }

  function huzasTakaritasa() {
    esemenyekEltavolitasa();

    huzottAtom.remove();
    forrasGomb.classList.remove("atom-huzas-alatt");
    epitoTerulet.classList.remove("huzas-celpont");

    aktivAtomHuzas = null;
  }

  function atomHuzasBefejezese(pointerEsemeny) {
    const terulet = epitoTerulet.getBoundingClientRect();

    const epitoFelett =
      pointerEsemeny.clientX >= terulet.left &&
      pointerEsemeny.clientX <= terulet.right &&
      pointerEsemeny.clientY >= terulet.top &&
      pointerEsemeny.clientY <= terulet.bottom;

    if (epitoFelett) {
      const x = Math.max(
        25,
        Math.min(
          pointerEsemeny.clientX - terulet.left,
          terulet.width - 25
        )
      );

      const y = Math.max(
        25,
        Math.min(
          pointerEsemeny.clientY - terulet.top,
          terulet.height - 25
        )
      );

      atomHozzaadas(atomTipus, x, y);

      debug("Atom behúzása sikeres", {
        atomTipus,
        x,
        y,
      });
    } else {
      debug("Atomhúzás megszakadt az építőfelületen kívül", {
        atomTipus,
      });
    }

    huzasTakaritasa();
  }

  function atomHuzasMegszakitasa() {
    debug("Atomhúzás megszakítva", {
      atomTipus,
    });

    huzasTakaritasa();
  }

  aktivAtomHuzas = {
    atomTipus,
    pointerId: esemeny.pointerId,
  };

  document.addEventListener(
    "pointermove",
    huzottAtomMozgatasa,
    { passive: false }
  );

  document.addEventListener(
    "pointerup",
    atomHuzasBefejezese
  );

  document.addEventListener(
    "pointercancel",
    atomHuzasMegszakitasa
  );

  huzottAtomMozgatasa(esemeny);

  debug("Atomhúzás elkezdődött", {
    atomTipus,
    pointerTipus: esemeny.pointerType,
    maradekDarab: darab,
  });
}

function atomGombokBekotese() {
  const atomGombok =
    document.querySelectorAll(".atom-gomb");

  if (atomGombok.length === 0) {
    console.error(
      "[HIBA] Nem találhatók atomgombok."
    );
    return;
  }

  atomGombok.forEach((gomb) => {
    const atomTipus = gomb.dataset.atom;

    if (!atomTipus) {
      console.error(
        "[HIBA] Egy atomgombnak nincs atomtípusa:",
        gomb
      );
      return;
    }

    gomb.addEventListener(
  "pointerdown",
  (esemeny) => {
    if (kattintasosAtomelhelyezes) {
      esemeny.preventDefault();

      atomTipusKivalasztas(
        atomTipus
      );

      return;
    }

    atomHuzasInditas(
      esemeny,
      atomTipus,
      gomb
    );
  }
);

    debug("Húzható atomgomb bekötve", {
      atomTipus,
    });
  });
}

// ==================================================
// LERAKOTT ATOMOK MOZGATÁSA
// ==================================================

let aktivAtomMozgatas = null;

function epitettAtomMozgatasInditas(
  esemeny,
  atomElem
) {
  if (
    esemeny.pointerType === "mouse" &&
    esemeny.button !== 0
  ) {
    return;
  }

  if (aktivAtomMozgatas || aktivAtomHuzas) {
    debug(
      "Atommozgatás elutasítva: másik húzás van folyamatban"
    );
    return;
  }

  const atomId = atomElem.dataset.atomId;

  const atom = molekulaAllapot.atomok.find(
    (keresettAtom) => keresettAtom.id === atomId
  );

  if (!atom) {
    console.error(
      "[HIBA] A mozgatott atom nincs az állapotban:",
      atomId
    );
    return;
  }

  const epitoTerulet =
    document.getElementById("epito-terulet");

  if (!epitoTerulet) {
    console.error(
      "[HIBA] Nem található az építőfelület."
    );
    return;
  }

  esemeny.preventDefault();

  const terulet =
    epitoTerulet.getBoundingClientRect();

  const kezdoPozicio = {
    x: atom.x,
    y: atom.y,
  };
  const pointerKezdet = {
    x: esemeny.clientX,
    y: esemeny.clientY,
  };
  let tenylegesenMozdult = false;

  const eltolodas = {
    x: esemeny.clientX - (terulet.left + atom.x),
    y: esemeny.clientY - (terulet.top + atom.y),
  };

  atomElem.classList.add("mozgatott-atom");

function atomMozgatasa(pointerEsemeny) {
    if (
      pointerEsemeny.pointerId !==
      aktivAtomMozgatas?.pointerId
    ) {
      return;
    }

    pointerEsemeny.preventDefault();
    
    const mozgasTavolsaga = Math.hypot(
    pointerEsemeny.clientX - pointerKezdet.x,
    pointerEsemeny.clientY - pointerKezdet.y
    );

    if (mozgasTavolsaga > 6) {
    tenylegesenMozdult = true;
    }

    const aktualisTerulet =
      epitoTerulet.getBoundingClientRect();

    const ujX = Math.max(
      25,
      Math.min(
        pointerEsemeny.clientX -
          aktualisTerulet.left -
          eltolodas.x,
        aktualisTerulet.width - 25
      )
    );

    const ujY = Math.max(
      25,
      Math.min(
        pointerEsemeny.clientY -
          aktualisTerulet.top -
          eltolodas.y,
        aktualisTerulet.height - 25
      )
    );

    atom.x = ujX;
    atom.y = ujY;

    atomElem.style.left = `${ujX - 25}px`;
    atomElem.style.top = `${ujY - 25}px`;

    kotesekUjrarajzolasa();
    const taska =
  document.querySelector(".atomtaska");

if (taska) {
  const taskaTerulet =
    taska.getBoundingClientRect();

  const taskaFelett =
    pointerEsemeny.clientX >= taskaTerulet.left &&
    pointerEsemeny.clientX <= taskaTerulet.right &&
    pointerEsemeny.clientY >= taskaTerulet.top &&
    pointerEsemeny.clientY <= taskaTerulet.bottom;

  taska.classList.toggle(
    "atom-visszavetel-celpont",
    taskaFelett
  );
}
  }

    function esemenyekEltavolitasa() {
    document.removeEventListener(
      "pointermove",
      atomMozgatasa
    );

    document.removeEventListener(
      "pointerup",
      atomMozgatasBefejezese
    );

    document.removeEventListener(
      "pointercancel",
      atomMozgatasMegszakitasa
    );

    document
      .querySelector(".atomtaska")
      ?.classList.remove(
        "atom-visszavetel-celpont"
      );
  }

  function atomMozgatasBefejezese(pointerEsemeny) {
  if (
    pointerEsemeny.pointerId !==
    aktivAtomMozgatas?.pointerId
  ) {
    return;
  }

  const taska =
    document.querySelector(".atomtaska");

  let taskaFelett = false;

  if (taska) {
    const taskaTerulet =
      taska.getBoundingClientRect();

    taskaFelett =
      pointerEsemeny.clientX >=
        taskaTerulet.left &&
      pointerEsemeny.clientX <=
        taskaTerulet.right &&
      pointerEsemeny.clientY >=
        taskaTerulet.top &&
      pointerEsemeny.clientY <=
        taskaTerulet.bottom;
  }

  if (tenylegesenMozdult && taskaFelett) {
    esemenyekEltavolitasa();

    atomElem.classList.remove(
      "mozgatott-atom"
    );

    const sikeres =
      atomVisszahelyezeseATaskaba(atomId);

    debug("Atom táskába húzása befejezve", {
      atomId,
      sikeres,
    });

    aktivAtomMozgatas = null;
    return;
  }

  if (!tenylegesenMozdult) {
    atomKoteshezKivalasztas(atomId);
  }

  esemenyekEltavolitasa();

  atomElem.classList.remove(
    "mozgatott-atom"
  );

  debug("Atom mozgatása befejezve", {
    atomId,
    atomTipus: atom.tipus,
    tenylegesenMozdult,
    kezdoPozicio,
    vegsoPozicio: {
      x: atom.x,
      y: atom.y,
    },
  });

  aktivAtomMozgatas = null;
}

  function atomMozgatasMegszakitasa(pointerEsemeny) {
    if (
      pointerEsemeny.pointerId !==
      aktivAtomMozgatas?.pointerId
    ) {
      return;
    }

    atom.x = kezdoPozicio.x;
    atom.y = kezdoPozicio.y;

    atomElem.style.left =
      `${kezdoPozicio.x - 25}px`;

    atomElem.style.top =
      `${kezdoPozicio.y - 25}px`;

    kotesekUjrarajzolasa();

    esemenyekEltavolitasa();
    atomElem.classList.remove("mozgatott-atom");

    debug("Atom mozgatása megszakítva", {
      atomId,
      visszaallitottPozicio: kezdoPozicio,
    });

    aktivAtomMozgatas = null;
  }

  aktivAtomMozgatas = {
    atomId,
    pointerId: esemeny.pointerId,
  };

  document.addEventListener(
    "pointermove",
    atomMozgatasa,
    { passive: false }
  );

  document.addEventListener(
    "pointerup",
    atomMozgatasBefejezese
  );

  document.addEventListener(
    "pointercancel",
    atomMozgatasMegszakitasa
  );

  debug("Atom mozgatása elkezdődött", {
    atomId,
    atomTipus: atom.tipus,
    kezdoPozicio,
  });
}

function epitettAtomokMozgatasanakBekotese() {
  const epitoTerulet =
    document.getElementById("epito-terulet");

  if (!epitoTerulet) {
    console.error(
      "[HIBA] Nem köthető be az atomok mozgatása."
    );
    return;
  }

  epitoTerulet.addEventListener(
    "pointerdown",
    (esemeny) => {
      const atomElem =
        esemeny.target.closest(".epitett-atom");

      if (!atomElem) {
        return;
      }

      epitettAtomMozgatasInditas(
        esemeny,
        atomElem
      );
    }
  );

  debug("A lerakott atomok mozgatása bekötve");
}

function epitoTeruletBekotese() {
  const epitoTerulet =
    document.getElementById("epito-terulet");

  if (!epitoTerulet) {
    console.error(
      "[HIBA] Nem köthető be az építőfelület."
    );
    return;
  }

  epitoTerulet.addEventListener("click", (esemeny) => {
  if (!kattintasosAtomelhelyezes) {
    return;
  }

  if (esemeny.target.closest(".epitett-atom")) {
    return;
  }

    const atomTipus =
      molekulaAllapot.kivalasztottAtomTipus;

    if (!atomTipus) {
      debug(
        "Kattintás az építőfelületen kiválasztott atom nélkül"
      );
      return;
    }

    const teglalap =
      epitoTerulet.getBoundingClientRect();

    const x = Math.max(
      25,
      Math.min(
        esemeny.clientX - teglalap.left,
        teglalap.width - 25
      )
    );

    const y = Math.max(
      25,
      Math.min(
        esemeny.clientY - teglalap.top,
        teglalap.height - 25
      )
    );

    atomHozzaadas(atomTipus, x, y);
  });

  debug("Építőfelület bekötve");
}
// ==================================================
// KÖTÉSTÍPUS KIVÁLASZTÁSA
// ==================================================

function kotesTipusKivalasztas(
  kotesRend,
  kotesSztereo = "sik"
) {
  if (
    ![0, 1, 2, 3].includes(
      kotesRend
    )
  ) {
    console.error(
      "[HIBA] Érvénytelen kötésrend:",
      kotesRend
    );

    return;
  }

  const ervenyesSztereoTipusok = [
    "sik",
    "elo",
    "hatra",
  ];

  if (
    !ervenyesSztereoTipusok.includes(
      kotesSztereo
    )
  ) {
    console.error(
      "[HIBA] Érvénytelen sztereokötés:",
      kotesSztereo
    );

    return;
  }

  const alkalmazottSztereo =
    kotesRend === 1
      ? kotesSztereo
      : "sik";

  const elozoKotesRend =
    molekulaAllapot
      .kivalasztottKotes;

  const elozoKotesSztereo =
    molekulaAllapot
      .kivalasztottKotesSztereo;

  molekulaAllapot.kivalasztottKotes =
    kotesRend;

  molekulaAllapot
    .kivalasztottKotesSztereo =
      alkalmazottSztereo;

  document.querySelectorAll(
    ".kotes-gomb"
  ).forEach((gomb) => {
    const gombKotesRend =
      Number(
        gomb.dataset.kotes
      );

    const gombKotesSztereo =
      gomb.dataset.sztereo ??
      "sik";

    const kivalasztott =
      gombKotesRend ===
        kotesRend &&
      gombKotesSztereo ===
        alkalmazottSztereo;

    gomb.classList.toggle(
      "kivalasztott-kotes",
      kivalasztott
    );

    gomb.setAttribute(
      "aria-pressed",
      String(kivalasztott)
    );
  });

  debug(
    "Kötéstípus kiválasztva",
    {
      elozoKotesRend,
      elozoKotesSztereo,
      ujKotesRend: kotesRend,
      ujKotesSztereo:
        alkalmazottSztereo,
    }
  );
}

function kotesGombokBekotese() {
  const kotesGombok =
    document.querySelectorAll(
      ".kotes-gomb"
    );

  if (kotesGombok.length === 0) {
    console.error(
      "[HIBA] Nem találhatók kötésgombok."
    );

    return;
  }

  kotesGombok.forEach((gomb) => {
    const kotesRend =
      Number(
        gomb.dataset.kotes
      );

    const kotesSztereo =
      gomb.dataset.sztereo ??
      "sik";

    if (
      ![0, 1, 2, 3].includes(
        kotesRend
      )
    ) {
      console.error(
        "[HIBA] Hibás kötésgomb:",
        gomb
      );

      return;
    }

    gomb.addEventListener(
      "click",
      () => {
        kotesTipusKivalasztas(
          kotesRend,
          kotesSztereo
        );
      }
    );

    debug(
      "Kötésgomb bekötve",
      {
        kotesRend,
        kotesSztereo,
      }
    );
  });

  kotesTipusKivalasztas(
    molekulaAllapot
      .kivalasztottKotes,

    molekulaAllapot
      .kivalasztottKotesSztereo
  );

  lancKotesKapcsoloBekotese();
}

// ==================================================
// ATOMOK ÖSSZEKÖTÉSE
// ==================================================

const MAX_KOTESREND = {
  C: 4,
  O: 2,
  N: 3,
  S: 6,
  P: 5,
  F: 1,
  Cl: 1,
  Br: 1,
  I: 1,
  Si: 4,
};

function implicitHidrogenDarab(atomTipus, felhasznaltKotesrend) {
  const lehetsegesKotesrendek = {
    S: [2, 4, 6],
    P: [3, 5],
  };

  const celKotesrend =
    lehetsegesKotesrendek[atomTipus]?.find(
      (ertek) => ertek >= felhasznaltKotesrend
    ) ?? MAX_KOTESREND[atomTipus];

  return Math.max(0, celKotesrend - felhasznaltKotesrend);
}

function atomKotesrendOsszeg(
  atomId,
  kihagyottKotesId = null
) {
  return molekulaAllapot.kotesek.reduce(
    (osszeg, kotes) => {
      if (kotes.id === kihagyottKotesId) {
        return osszeg;
      }

      const kapcsolodik =
        kotes.atom1Id === atomId ||
        kotes.atom2Id === atomId;

      return kapcsolodik
        ? osszeg + kotes.rend
        : osszeg;
    },
    0
  );
}

function atomHibaFelvillantasa(atomId) {
  const atomElem = document.querySelector(
    `.epitett-atom[data-atom-id="${atomId}"]`
  );

  if (!atomElem) {
    console.error(
      "[HIBA] Nem található a felvillantandó atom:",
      atomId
    );
    return;
  }

  atomElem.classList.add("atom-koteshiba");

  window.setTimeout(() => {
    atomElem.classList.remove("atom-koteshiba");
  }, 900);
}

function kotesKijelolesTorlese() {
  document.querySelectorAll(
    ".koteshez-kivalasztott-atom"
  ).forEach((atomElem) => {
    atomElem.classList.remove(
      "koteshez-kivalasztott-atom"
    );
    atomElem.setAttribute("aria-pressed", "false");
  });

  molekulaAllapot.koteshezKivalasztottAtomId =
    null;

  debug("Kötéshez kijelölt atom törölve");
}

function polimerKulsoKotesrendOsszeg(
  atomId,
  kihagyottKapcsolodasId = null
) {
  const osszeg =
    molekulaAllapot
      .polimerKapcsolatok
      .reduce(
        (
          eddigiOsszeg,
          kapcsolodas
        ) => {
          if (
            kapcsolodas
              ?.atomId !==
              atomId ||
            kapcsolodas
              ?.kapcsolodasId ===
              kihagyottKapcsolodasId
          ) {
            return eddigiOsszeg;
          }

          const kotesrend =
            Number(
              kapcsolodas.rend
            );

          return (
            eddigiOsszeg +
            (
              Number.isFinite(
                kotesrend
              ) &&
              kotesrend > 0
                ? kotesrend
                : 1
            )
          );
        },
        0
      );

  return osszeg;
}

function kotesLetrehozasVagyModositas(
  atom1Id,
  atom2Id,
  kotesRend,
  kotesSztereo = "sik"
) {
  const alkalmazottSztereo =
    kotesRend === 1
      ? kotesSztereo
      : "sik";
  const atom1 = molekulaAllapot.atomok.find(
    (atom) => atom.id === atom1Id
  );

  const atom2 = molekulaAllapot.atomok.find(
    (atom) => atom.id === atom2Id
  );

  if (!atom1 || !atom2) {
    console.error(
      "[HIBA] A kötés egyik atomja nem található:",
      { atom1Id, atom2Id }
    );
    return {
      sikeres: false,
      uzenet: "A kötés egyik atomja nem található.",
    };
  }

  if (atom1Id === atom2Id) {
    debug("Egy atom önmagával nem köthető össze", {
      atom1Id,
    });
    return {
      sikeres: false,
      uzenet: "Egy atomot önmagával nem lehet összekötni.",
    };
  }

  const meglevoKotes =
    molekulaAllapot.kotesek.find(
      (kotes) =>
        (kotes.atom1Id === atom1Id &&
          kotes.atom2Id === atom2Id) ||
        (kotes.atom1Id === atom2Id &&
          kotes.atom2Id === atom1Id)
    );
    if (kotesRend === 0) {
  if (!meglevoKotes) {
    debug("Kötéstörlés sikertelen: nincs kötés a két atom között", {
      atom1Id,
      atom2Id,
    });

    atomHibaFelvillantasa(atom1Id);
    atomHibaFelvillantasa(atom2Id);

    return {
      sikeres: false,
      uzenet: "A két atom között nincs törölhető kötés.",
    };
  }

  molekulaAllapot.kotesek =
    molekulaAllapot.kotesek.filter(
      (kotes) =>
        kotes.id !== meglevoKotes.id
    );

  kotesekUjrarajzolasa();

  implicitHidrogenekFrissitese();

  debug("Kötés törölve", {
    kotesId: meglevoKotes.id,
    atom1Id,
    atom2Id,
    toroltKotesRend: meglevoKotes.rend,
    maradekKotesek:
      molekulaAllapot.kotesek.length,
  });

  return { sikeres: true };
}

  const kihagyottKotesId =
    meglevoKotes?.id ?? null;

  const atom1UjKotesrend =
  atomKotesrendOsszeg(
    atom1Id,
    kihagyottKotesId
  ) +
  polimerKulsoKotesrendOsszeg(
    atom1Id
  ) +
  kotesRend;

  const atom2UjKotesrend =
  atomKotesrendOsszeg(
    atom2Id,
    kihagyottKotesId
  ) +
  polimerKulsoKotesrendOsszeg(
    atom2Id
  ) +
  kotesRend;

  const atom1Maximum =
    MAX_KOTESREND[atom1.tipus];

  const atom2Maximum =
    MAX_KOTESREND[atom2.tipus];

  if (atom1UjKotesrend > atom1Maximum) {
    atomHibaFelvillantasa(atom1Id);

    debug("Kötés elutasítva: az első atom túllépné a vegyértékét", {
      atomId: atom1Id,
      atomTipus: atom1.tipus,
      ujKotesrend: atom1UjKotesrend,
      maximum: atom1Maximum,
    });

    return {
      sikeres: false,
      uzenet: atomVegyertekUzenet(atom1.tipus),
    };
  }

  if (atom2UjKotesrend > atom2Maximum) {
    atomHibaFelvillantasa(atom2Id);

    debug("Kötés elutasítva: a második atom túllépné a vegyértékét", {
      atomId: atom2Id,
      atomTipus: atom2.tipus,
      ujKotesrend: atom2UjKotesrend,
      maximum: atom2Maximum,
    });

    return {
      sikeres: false,
      uzenet: atomVegyertekUzenet(atom2.tipus),
    };
  }

  if (meglevoKotes) {
  const elozoRend =
    meglevoKotes.rend;

  const elozoSztereo =
    meglevoKotes.sztereo ?? "sik";

  meglevoKotes.rend =
    kotesRend;

  meglevoKotes.sztereo =
    alkalmazottSztereo;

  debug("Meglévő kötés módosítva", {
    kotesId: meglevoKotes.id,
    atom1Id,
    atom2Id,
    elozoRend,
    ujRend: kotesRend,
    elozoSztereo,
    ujSztereo: alkalmazottSztereo,
  });
} else {
    const ujKotes = {
  id:
    `kotes-${molekulaAllapot.kovetkezoKotesId}`,
  atom1Id,
  atom2Id,
  rend: kotesRend,
  sztereo: alkalmazottSztereo,
};

    molekulaAllapot.kovetkezoKotesId += 1;
    molekulaAllapot.kotesek.push(ujKotes);

    debug("Új kötés létrehozva", {
      kotes: { ...ujKotes },
      kotesekSzama:
        molekulaAllapot.kotesek.length,
    });
  }

  kotesekUjrarajzolasa();
  implicitHidrogenekFrissitese();

  return { sikeres: true };
}

function atomVegyertekUzenet(atomTipus) {
  const nevek = {
    C: "szénatom",
    O: "oxigénatom",
    N: "nitrogénatom",
    S: "kénatom",
    P: "foszforatom",
    F: "fluoratom",
    Cl: "klóratom",
    Br: "brómatom",
    I: "jódatom",
    Si: "szilíciumatom",
  };

  const nev = nevek[atomTipus] ?? "atom";
  const nevelo = nev.startsWith("o") ? "Az" : "A";

  return `${nevelo} ${nev} vegyértéke nem engedi ezt a kötést.`;
}

function kotesVisszajelzesMegjelenitese(uzenet) {
  const elem = document.getElementById("kotes-visszajelzes");

  if (!elem) {
    return;
  }

  if (!uzenet) {
    elem.hidden = true;
    elem.textContent = "";
    return;
  }

  elem.hidden = false;
  elem.textContent = uzenet;
}

function kotesKezdopontKijelolese(atomId) {
  molekulaAllapot.koteshezKivalasztottAtomId = atomId;

  const atomElem = document.querySelector(
    `.epitett-atom[data-atom-id="${atomId}"]`
  );

  atomElem?.classList.add("koteshez-kivalasztott-atom");
  atomElem?.setAttribute("aria-pressed", "true");
}

function lancKotesAlaphelyzet() {
  molekulaAllapot.lancKotes = false;

  const jelolo = document.getElementById("lanckotes");

  if (jelolo) {
    jelolo.checked = false;
  }

  kotesKijelolesTorlese();
  kotesVisszajelzesMegjelenitese("");
}

function lancKotesKapcsoloBekotese() {
  const jelolo = document.getElementById("lanckotes");

  if (!jelolo || jelolo.dataset.bekotve === "1") {
    return;
  }

  jelolo.dataset.bekotve = "1";
  jelolo.checked = molekulaAllapot.lancKotes;

  jelolo.addEventListener("change", () => {
    molekulaAllapot.lancKotes = jelolo.checked;
    kotesKijelolesTorlese();
    kotesVisszajelzesMegjelenitese("");

    debug("Lánckötés átkapcsolva", {
      bekapcsolva: jelolo.checked,
    });
  });
}

function atomKoteshezKivalasztas(atomId) {
  const atom = molekulaAllapot.atomok.find(
    (keresettAtom) =>
      keresettAtom.id === atomId
  );

  if (!atom) {
    console.error(
      "[HIBA] Nem létező atom kijelölése:",
      atomId
    );
    return;
  }

  const elsoAtomId =
    molekulaAllapot.koteshezKivalasztottAtomId;

  if (!elsoAtomId) {
    kotesKezdopontKijelolese(atomId);
    kotesVisszajelzesMegjelenitese("");

    debug("Első atom kiválasztva a kötéshez", {
      atomId,
      atomTipus: atom.tipus,
      kotesRend:
        molekulaAllapot.kivalasztottKotes,
      lancKotes: molekulaAllapot.lancKotes,
    });

    return;
  }

  if (elsoAtomId === atomId) {
    kotesKijelolesTorlese();
    kotesVisszajelzesMegjelenitese("");

    debug("Az első atom ismételt kijelölése megszüntette a kijelölést", {
      atomId,
    });

    return;
  }

  const eredmeny = kotesLetrehozasVagyModositas(
    elsoAtomId,
    atomId,
    molekulaAllapot.kivalasztottKotes,
    molekulaAllapot.kivalasztottKotesSztereo
  );

  debug("Második atom kiválasztva", {
    elsoAtomId,
    masodikAtomId: atomId,
    kotesRend: molekulaAllapot.kivalasztottKotes,
    lancKotes: molekulaAllapot.lancKotes,
    sikeres: eredmeny.sikeres,
  });

  if (!eredmeny.sikeres) {
    kotesVisszajelzesMegjelenitese(eredmeny.uzenet);
    kotesKezdopontKijelolese(elsoAtomId);

    debug("A kötés nem jött létre, a kezdőpont megmaradt", {
      elsoAtomId,
      masodikAtomId: atomId,
      uzenet: eredmeny.uzenet,
    });

    return;
  }

  kotesVisszajelzesMegjelenitese("");
  kotesKijelolesTorlese();

  if (!molekulaAllapot.lancKotes) {
    return;
  }

  kotesKezdopontKijelolese(atomId);

  debug("Lánckötés folytatható az újonnan megérintett atomról", {
    folytatasiAtomId: atomId,
    atomTipus: atom.tipus,
  });
}

function polimerKapcsolodasKezelese(
  kapcsolodasId,
  pontElem = null
) {
  const kapcsolodasok =
    molekulaAllapot
      .aktivPolimer
      ?.kapcsolodasok;

  const celKapcsolodas =
    Array.isArray(
      kapcsolodasok
    )
      ? kapcsolodasok.find(
          (kapcsolodas) =>
            String(
              kapcsolodas?.id
            ) ===
            String(
              kapcsolodasId
            )
        )
      : null;

  if (!celKapcsolodas) {
    console.error(
      "[POLIMER HIBA] Nem található a kapcsolódási pont.",
      {
        kapcsolodasId,
        kapcsolodasok,
      }
    );

    return false;
  }

  const atomId =
    molekulaAllapot
      .koteshezKivalasztottAtomId;

  if (!atomId) {
    debug(
      "Polimerkapcsolat elutasítva: előbb egy atomot kell kiválasztani",
      {
        kapcsolodasId,
      }
    );

    if (pontElem) {
      const eredetiStroke =
        pontElem.getAttribute(
          "stroke"
        );

      pontElem.setAttribute(
        "stroke",
        "#ef4444"
      );

      window.setTimeout(
        () => {
          if (
            pontElem.isConnected
          ) {
            pontElem.setAttribute(
              "stroke",
              eredetiStroke ??
                "#67e8f9"
            );
          }
        },
        800
      );
    }

    return false;
  }

  const atom =
    molekulaAllapot
      .atomok
      .find(
        (keresettAtom) =>
          keresettAtom.id ===
          atomId
      );

  if (!atom) {
    console.error(
      "[POLIMER HIBA] A kiválasztott atom nem található.",
      {
        atomId,
        kapcsolodasId,
      }
    );

    return false;
  }

  const kotesrend =
    Number(
      molekulaAllapot
        .kivalasztottKotes
    );

  const meglevoKapcsolodas =
    molekulaAllapot
      .polimerKapcsolatok
      .find(
        (kapcsolodas) =>
          kapcsolodas
            .kapcsolodasId ===
          String(
            kapcsolodasId
          )
      );

  if (kotesrend === 0) {
    if (
      !meglevoKapcsolodas ||
      meglevoKapcsolodas
        .atomId !== atomId
    ) {
      debug(
        "Polimerkapcsolat törlése sikertelen",
        {
          kapcsolodasId,
          atomId,
          meglevoKapcsolodas:
            meglevoKapcsolodas ??
            null,
        }
      );

      atomHibaFelvillantasa(
        atomId
      );

      return false;
    }

    molekulaAllapot
      .polimerKapcsolatok =
        molekulaAllapot
          .polimerKapcsolatok
          .filter(
            (kapcsolodas) =>
              kapcsolodas
                .kapcsolodasId !==
              String(
                kapcsolodasId
              )
          );

    kotesKijelolesTorlese();
    kotesekUjrarajzolasa();
    implicitHidrogenekFrissitese();

    debug(
      "Polimerkapcsolat törölve",
      {
        kapcsolodasId,
        atomId,
      }
    );

    return true;
  }

  if (
    ![1, 2, 3].includes(
      kotesrend
    )
  ) {
    console.error(
      "[POLIMER HIBA] Érvénytelen külső kötésrend.",
      {
        kapcsolodasId,
        kotesrend,
      }
    );

    return false;
  }

  const belsoKotesrend =
    atomKotesrendOsszeg(
      atomId
    );

  const masKulsoKotesrend =
    polimerKulsoKotesrendOsszeg(
      atomId,
      String(
        kapcsolodasId
      )
    );

  const ujTeljesKotesrend =
    belsoKotesrend +
    masKulsoKotesrend +
    kotesrend;

  if (
    ujTeljesKotesrend >
    maximum
  ) {
    atomHibaFelvillantasa(
      atomId
    );

    debug(
      "Polimerkapcsolat elutasítva: az atom túllépné a vegyértékét",
      {
        kapcsolodasId,
        atomId,
        atomTipus:
          atom.tipus,
        belsoKotesrend,
        masKulsoKotesrend,
        ujKotesrend:
          kotesrend,
        ujTeljesKotesrend,
        maximum,
      }
    );

    return false;
  }

  molekulaAllapot
    .polimerKapcsolatok =
      molekulaAllapot
        .polimerKapcsolatok
        .filter(
          (kapcsolodas) =>
            kapcsolodas
              .kapcsolodasId !==
            String(
              kapcsolodasId
            )
        );

  const ujKapcsolodas = {
    kapcsolodasId:
      String(
        kapcsolodasId
      ),
    atomId,
    rend:
      kotesrend,
  };

  molekulaAllapot
    .polimerKapcsolatok
    .push(
      ujKapcsolodas
    );

  kotesKijelolesTorlese();
  kotesekUjrarajzolasa();
  implicitHidrogenekFrissitese();

  debug(
    "Polimerkapcsolat létrehozva",
    {
      celKapcsolodas,
      letrehozottKapcsolodas:
        ujKapcsolodas,
      kapcsolatok:
        molekulaAllapot
          .polimerKapcsolatok,
    }
  );

  return true;
}

function polimerZarojelekKirajzolasa(
  svg,
  {
    balX,
    jobbX,
    felsoY,
    alsoY,
    kisMeret = false,
kapcsolodasok = [],
interaktiv = false,
atomPoziciok = null,
atomSugar = 0,
  }
) {
  const koordinatak = [
    balX,
    jobbX,
    felsoY,
    alsoY,
  ];

  if (
    !svg ||
    !koordinatak.every(
      Number.isFinite
    ) ||
    jobbX <= balX ||
    alsoY <= felsoY
  ) {
    console.error(
      "[POLIMER HIBA] A zárójelek nem rajzolhatók ki.",
      {
        svg,
        balX,
        jobbX,
        felsoY,
        alsoY,
      }
    );

    return false;
  }

  const svgNevter =
    "http://www.w3.org/2000/svg";

  const kampoHossz =
    kisMeret ? 8 : 14;

  const vonalVastagsag =
    kisMeret ? 2.5 : 4;

  const zarojelAdatok = [
    [
      balX,
      balX + kampoHossz,
    ],
    [
      jobbX,
      jobbX - kampoHossz,
    ],
  ];

  for (
    const [
      kulsoX,
      belsoX,
    ] of zarojelAdatok
  ) {
    const zarojel =
      document.createElementNS(
        svgNevter,
        "path"
      );

    zarojel.setAttribute(
      "d",
      [
        `M ${belsoX} ${felsoY}`,
        `H ${kulsoX}`,
        `V ${alsoY}`,
        `H ${belsoX}`,
      ].join(" ")
    );

    zarojel.setAttribute(
      "fill",
      "none"
    );

    zarojel.setAttribute(
      "stroke",
      "#d7dde8"
    );

    zarojel.setAttribute(
      "stroke-width",
      String(vonalVastagsag)
    );

    zarojel.setAttribute(
      "stroke-linecap",
      "round"
    );

    zarojel.setAttribute(
      "stroke-linejoin",
      "round"
    );

    zarojel.setAttribute(
      "pointer-events",
      "none"
    );

    zarojel.setAttribute(
      "aria-hidden",
      "true"
    );

    svg.appendChild(
      zarojel
    );
  }

  const ervenyesKapcsolodasok =
  Array.isArray(kapcsolodasok)
    ? kapcsolodasok.filter(
        (kapcsolodas) =>
          kapcsolodas?.oldal ===
            "bal" ||
          kapcsolodas?.oldal ===
            "jobb"
      )
    : [];

for (
  const oldal of [
    "bal",
    "jobb",
  ]
) {
  const oldaliKapcsolodasok =
    ervenyesKapcsolodasok.filter(
      (kapcsolodas) =>
        kapcsolodas.oldal ===
        oldal
    );

  oldaliKapcsolodasok.forEach(
    (
      kapcsolodas,
      oldaliIndex
    ) => {
      const megadottHely =
        Number(
          kapcsolodas.hely
        );

      const hely =
        Number.isFinite(
          megadottHely
        ) &&
        megadottHely >= 0 &&
        megadottHely <= 1
          ? megadottHely
          : (
              oldaliIndex + 1
            ) /
            (
              oldaliKapcsolodasok
                .length + 1
            );

      const pontTavolsag =
        kisMeret ? 10 : 18;

      const pontX =
        oldal === "bal"
          ? balX -
            pontTavolsag
          : jobbX +
            pontTavolsag;

      let pontY =
        felsoY +
        (
          alsoY -
          felsoY
        ) *
          hely;

      const kapcsolodasId =
  String(
    kapcsolodas.id ??
      `${oldal}-${
        oldaliIndex + 1
      }`
  );

  const elozetiAtomIndex =
  Number(
    kapcsolodas
      ?.atomIndex
  );

const elozetiAtomId =
  Number.isInteger(
    elozetiAtomIndex
  )
    ? `elozet-atom-${elozetiAtomIndex}`
    : null;

const letrehozottKapcsolodas =
  interaktiv
    ? molekulaAllapot
        .polimerKapcsolatok
        .find(
          (letrehozott) =>
            letrehozott
              .kapcsolodasId ===
            kapcsolodasId
        )
    : (
        elozetiAtomId
          ? {
              kapcsolodasId,
              atomId:
                elozetiAtomId,
              rend:
                Number(
                  kapcsolodas
                    ?.kotesrend
                ) || 1,
            }
          : null
      );

const kapcsoltAtom =
  interaktiv
    ? (
        letrehozottKapcsolodas
          ? molekulaAllapot
              .atomok
              .find(
                (atom) =>
                  atom.id ===
                  letrehozottKapcsolodas
                    .atomId
              )
          : null
      )
    : (
        elozetiAtomId &&
        atomPoziciok
          instanceof Map
          ? atomPoziciok.get(
              elozetiAtomId
            ) ?? null
          : null
      );

if (
  !interaktiv &&
  kapcsoltAtom &&
  Number.isFinite(kapcsoltAtom.y)
) {
  pontY = Math.max(
    felsoY + 6,
    Math.min(
      alsoY - 6,
      kapcsoltAtom.y
    )
  );
}

if (
  !interaktiv &&
  letrehozottKapcsolodas &&
  !kapcsoltAtom
) {
  console.error(
    "[POLIMER ELŐNÉZET HIBA] A kapcsolódáshoz tartozó atompozíció hiányzik.",
    {
      kapcsolodas,
      elozetiAtomId,
      atomPoziciok,
    }
  );
}

if (
  letrehozottKapcsolodas &&
  kapcsoltAtom
) {
  const dx =
    pontX -
    kapcsoltAtom.x;

  const dy =
    pontY -
    kapcsoltAtom.y;

  const hossz =
    Math.hypot(
      dx,
      dy
    );

  if (hossz > 0) {
  const iranyX =
    dx / hossz;

  const iranyY =
    dy / hossz;

  const kezdoEltolas =
    !interaktiv
      ? Math.max(
          0,
          Number(atomSugar) + 2
        )
      : 0;

  const merolegesX =
    -dy / hossz;

    const merolegesY =
      dx / hossz;

    const kotesrend =
      Math.max(
        1,
        Math.min(
          3,
          Number(
            letrehozottKapcsolodas
              .rend
          ) || 1
        )
      );

    const eltolasiErtekek =
      kotesrend === 1
        ? [0]
        : kotesrend === 2
          ? [-4, 4]
          : [-6, 0, 6];

    eltolasiErtekek.forEach(
      (eltolas) => {
        const vonal =
          document.createElementNS(
            svgNevter,
            "line"
          );

        vonal.setAttribute(
          "x1",
          String(
            kapcsoltAtom.x +
iranyX *
  kezdoEltolas +
merolegesX *
  eltolas
          )
        );

        vonal.setAttribute(
          "y1",
          String(
            kapcsoltAtom.y +
iranyY *
  kezdoEltolas +
merolegesY *
  eltolas
          )
        );

        vonal.setAttribute(
          "x2",
          String(
            pontX +
            merolegesX *
              eltolas
          )
        );

        vonal.setAttribute(
          "y2",
          String(
            pontY +
            merolegesY *
              eltolas
          )
        );

        vonal.setAttribute(
          "stroke",
          "#d7dde8"
        );

        vonal.setAttribute(
          "stroke-width",
          kisMeret
            ? "2"
            : "4"
        );

        vonal.setAttribute(
          "stroke-linecap",
          "round"
        );

        vonal.setAttribute(
          "pointer-events",
          "none"
        );

        vonal.setAttribute(
          "data-polimer-kulso-kotes",
          kapcsolodasId
        );

        svg.appendChild(
          vonal
        );
      }
    );
  }
}

      const belsoCsonkHossz =
  kisMeret ? 6 : 10;

const csonkBelsoX =
  oldal === "bal"
    ? balX +
      belsoCsonkHossz
    : jobbX -
      belsoCsonkHossz;

const kapcsolodasJel =
  document.createElementNS(
    svgNevter,
    "line"
  );

kapcsolodasJel.setAttribute(
  "x1",
  String(
    csonkBelsoX
  )
);

kapcsolodasJel.setAttribute(
  "y1",
  String(
    pontY
  )
);

kapcsolodasJel.setAttribute(
  "x2",
  String(
    pontX
  )
);

kapcsolodasJel.setAttribute(
  "y2",
  String(
    pontY
  )
);

kapcsolodasJel.setAttribute(
  "stroke",
  letrehozottKapcsolodas
    ? "#cbd5e1"
    : "#94a3b8"
);

kapcsolodasJel.setAttribute(
  "stroke-width",
  kisMeret
    ? "2"
    : "3"
);

kapcsolodasJel.setAttribute(
  "stroke-linecap",
  "round"
);

kapcsolodasJel.setAttribute(
  "stroke-dasharray",
  letrehozottKapcsolodas
    ? "none"
    : "5 5"
);

kapcsolodasJel.setAttribute(
  "opacity",
  letrehozottKapcsolodas
    ? "1"
    : "0.75"
);

kapcsolodasJel.setAttribute(
  "pointer-events",
  "none"
);

kapcsolodasJel.setAttribute(
  "data-polimer-kapcsolodas-id",
  kapcsolodasId
);

kapcsolodasJel.setAttribute(
  "data-polimer-oldal",
  oldal
);

svg.appendChild(
  kapcsolodasJel
);

if (interaktiv) {
  const erintesiSav =
    document.createElementNS(
      svgNevter,
      "line"
    );

  erintesiSav.setAttribute(
    "x1",
    String(
      csonkBelsoX
    )
  );

  erintesiSav.setAttribute(
    "y1",
    String(
      pontY
    )
  );

  erintesiSav.setAttribute(
    "x2",
    String(
      pontX
    )
  );

  erintesiSav.setAttribute(
    "y2",
    String(
      pontY
    )
  );

  erintesiSav.setAttribute(
    "stroke",
    "rgba(0, 0, 0, 0.001)"
  );

  erintesiSav.setAttribute(
    "stroke-width",
    kisMeret
      ? "18"
      : "26"
  );

  erintesiSav.setAttribute(
    "stroke-linecap",
    "round"
  );

  erintesiSav.setAttribute(
    "pointer-events",
    "stroke"
  );

  erintesiSav.setAttribute(
    "data-polimer-erintesi-sav",
    kapcsolodasId
  );

  erintesiSav.style.cursor =
    "pointer";

  erintesiSav.addEventListener(
    "pointerenter",
    () => {
      kapcsolodasJel.setAttribute(
        "stroke",
        "#67e8f9"
      );

      kapcsolodasJel.setAttribute(
        "opacity",
        "1"
      );
    }
  );

  erintesiSav.addEventListener(
    "pointerleave",
    () => {
      kapcsolodasJel.setAttribute(
        "stroke",
        letrehozottKapcsolodas
          ? "#cbd5e1"
          : "#94a3b8"
      );

      kapcsolodasJel.setAttribute(
        "opacity",
        letrehozottKapcsolodas
          ? "1"
          : "0.75"
      );
    }
  );

  erintesiSav.addEventListener(
    "click",
    (esemeny) => {
      esemeny.stopPropagation();

      polimerKapcsolodasKezelese(
        kapcsolodasId,
        kapcsolodasJel
      );
    }
  );

  svg.appendChild(
    erintesiSav
  );
}
    }
  );
}

debug(
  "Polimer kapcsolódási helyek kirajzolva",
  {
    darab:
      ervenyesKapcsolodasok
        .length,
    kapcsolodasok:
      ervenyesKapcsolodasok,
  }
);

  const nJel =
    document.createElementNS(
      svgNevter,
      "text"
    );

  nJel.setAttribute(
    "x",
    String(
      jobbX +
      (
        kisMeret
          ? 6
          : 10
      )
    )
  );

  nJel.setAttribute(
    "y",
    String(
      alsoY +
      (
        kisMeret
          ? 12
          : 18
      )
    )
  );

  nJel.setAttribute(
    "fill",
    "#d7dde8"
  );

  nJel.setAttribute(
    "font-size",
    kisMeret
      ? "18"
      : "28"
  );

  nJel.setAttribute(
    "font-weight",
    "700"
  );

  nJel.setAttribute(
    "font-style",
    "italic"
  );

  nJel.setAttribute(
    "pointer-events",
    "none"
  );

  nJel.setAttribute(
    "aria-hidden",
    "true"
  );

  nJel.textContent = "n";

  svg.appendChild(
    nJel
  );

  debug(
    "Polimer zárójelei kirajzolva",
    {
      balX,
      jobbX,
      felsoY,
      alsoY,
      kisMeret,
    }
  );

  return true;
}

function kotesekUjrarajzolasa() {
  const svg =
    document.getElementById("kotes-reteg");

  const epitoTerulet =
    document.getElementById("epito-terulet");

  if (!svg || !epitoTerulet) {
    console.error(
      "[HIBA] Nem rajzolhatók ki a kötések."
    );
    return;
  }

  svg.replaceChildren();

    const epitoSzelesseg =
    Math.max(
      1,
      epitoTerulet.clientWidth
    );

  const epitoMagassag =
    Math.max(
      1,
      epitoTerulet.clientHeight
    );

  svg.setAttribute(
    "viewBox",
    `0 0 ${epitoSzelesseg} ${epitoMagassag}`
  );

  if (
    molekulaAllapot
      .aktivPolimer
      ?.ismetlodEgyseg ===
    true
  ) {
    const vizszintesMargo =
      Math.max(
        38,
        Math.min(
          90,
          epitoSzelesseg * 0.08
        )
      );

    const fuggolegesMargo =
      Math.max(
        30,
        Math.min(
          70,
          epitoMagassag * 0.1
        )
      );

    polimerZarojelekKirajzolasa(
      svg,
      {
        balX:
          vizszintesMargo,

        jobbX:
          epitoSzelesseg -
          vizszintesMargo -
          36,

        felsoY:
          fuggolegesMargo,

        alsoY:
          epitoMagassag -
          fuggolegesMargo,

        kisMeret:
  false,

kapcsolodasok:
  molekulaAllapot
    .aktivPolimer
    ?.kapcsolodasok,
    interaktiv:
  true,
      }
    );
  }

  molekulaAllapot.kotesek.forEach((kotes) => {
    const atom1 = molekulaAllapot.atomok.find(
      (atom) => atom.id === kotes.atom1Id
    );

    const atom2 = molekulaAllapot.atomok.find(
      (atom) => atom.id === kotes.atom2Id
    );

    if (!atom1 || !atom2) {
      console.error(
        "[HIBA] A kötéshez tartozó atom hiányzik:",
        kotes
      );
      return;
    }

    const dx = atom2.x - atom1.x;
    const dy = atom2.y - atom1.y;
    const hossz = Math.hypot(dx, dy);

    if (hossz === 0) {
      return;
    }

    const merolegesX = -dy / hossz;
    const merolegesY = dx / hossz;

    if (
  kotes.rend === 1 &&
  kotes.sztereo === "elo"
) {
  const felSzelesseg = 11;

  const ek =
    document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polygon"
    );

  ek.setAttribute(
    "points",
    [
      `${atom1.x},${atom1.y}`,
      `${
        atom2.x +
        merolegesX * felSzelesseg
      },${
        atom2.y +
        merolegesY * felSzelesseg
      }`,
      `${
        atom2.x -
        merolegesX * felSzelesseg
      },${
        atom2.y -
        merolegesY * felSzelesseg
      }`,
    ].join(" ")
  );

  ek.classList.add(
    "kotes-tomor-ek"
  );

  ek.dataset.kotesId =
    kotes.id;

  svg.appendChild(ek);
  return;
}

if (
  kotes.rend === 1 &&
  kotes.sztereo === "hatra"
) {
  const vonalakSzama = 7;

  for (
    let index = 1;
    index <= vonalakSzama;
    index += 1
  ) {
    const arany =
      index / (vonalakSzama + 1);

    const kozeppontX =
      atom1.x + dx * arany;

    const kozeppontY =
      atom1.y + dy * arany;

    const felSzelesseg =
      1.5 + arany * 10;

    const vonal =
      document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line"
      );

    vonal.setAttribute(
      "x1",
      kozeppontX -
        merolegesX * felSzelesseg
    );

    vonal.setAttribute(
      "y1",
      kozeppontY -
        merolegesY * felSzelesseg
    );

    vonal.setAttribute(
      "x2",
      kozeppontX +
        merolegesX * felSzelesseg
    );

    vonal.setAttribute(
      "y2",
      kozeppontY +
        merolegesY * felSzelesseg
    );

    vonal.classList.add(
      "kotes-szaggatott-ek-vonal"
    );

    vonal.dataset.kotesId =
      kotes.id;

    svg.appendChild(vonal);
  }

  return;
}
    const eltolasok = {
      1: [0],
      2: [-4, 4],
      3: [-7, 0, 7],
    };

    eltolasok[kotes.rend].forEach(
      (eltolas) => {
        const vonal = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line"
        );

        vonal.setAttribute(
          "x1",
          atom1.x + merolegesX * eltolas
        );

        vonal.setAttribute(
          "y1",
          atom1.y + merolegesY * eltolas
        );

        vonal.setAttribute(
          "x2",
          atom2.x + merolegesX * eltolas
        );

        vonal.setAttribute(
          "y2",
          atom2.y + merolegesY * eltolas
        );

        vonal.classList.add("kotes-vonal");
        vonal.dataset.kotesId = kotes.id;

        svg.appendChild(vonal);
      }
    );
  });
}
// ==================================================
// ATOM VISSZAHELYEZÉSE A TÁSKÁBA
// ==================================================

function atomVisszahelyezeseATaskaba(atomId) {
  const atomIndex =
    molekulaAllapot.atomok.findIndex(
      (atom) => atom.id === atomId
    );

  if (atomIndex === -1) {
    console.error(
      "[HIBA] Nem található a visszahelyezendő atom:",
      atomId
    );
    return false;
  }

  const atom =
    molekulaAllapot.atomok[atomIndex];

  if (
    molekulaAllapot.keszlet[atom.tipus] ===
    undefined
  ) {
    console.error(
      "[HIBA] Az atom típusa nem szerepel a készletben:",
      atom.tipus
    );
    return false;
  }

  const kapcsolodoKotesek =
    molekulaAllapot.kotesek.filter(
      (kotes) =>
        kotes.atom1Id === atomId ||
        kotes.atom2Id === atomId
    );

  molekulaAllapot.kotesek =
    molekulaAllapot.kotesek.filter(
      (kotes) =>
        kotes.atom1Id !== atomId &&
        kotes.atom2Id !== atomId
    );

  const toroltPolimerKapcsolatok =
  molekulaAllapot
    .polimerKapcsolatok
    .filter(
      (kapcsolodas) =>
        kapcsolodas
          .atomId === atomId
    );

molekulaAllapot
  .polimerKapcsolatok =
    molekulaAllapot
      .polimerKapcsolatok
      .filter(
        (kapcsolodas) =>
          kapcsolodas
            .atomId !== atomId
      );

if (
  toroltPolimerKapcsolatok
    .length > 0
) {
  debug(
    "Az atomhoz tartozó polimerkapcsolatok törölve",
    {
      atomId,
      toroltKapcsolatok:
        toroltPolimerKapcsolatok,
      maradekKapcsolatok:
        molekulaAllapot
          .polimerKapcsolatok,
    }
  );
}

  molekulaAllapot.atomok.splice(
    atomIndex,
    1
  );

  molekulaAllapot.keszlet[atom.tipus] += 1;

  if (
    molekulaAllapot
      .koteshezKivalasztottAtomId === atomId
  ) {
    kotesKijelolesTorlese();
  }

  const atomElem = document.querySelector(
    `.epitett-atom[data-atom-id="${atomId}"]`
  );

  atomElem?.remove();

  kotesekUjrarajzolasa();
  implicitHidrogenekFrissitese();

  keszletMegjelenitesFrissitese();

  const segedszoveg = document.getElementById(
    "epito-segedszoveg"
  );

  if (
    segedszoveg &&
    molekulaAllapot.atomok.length === 0
  ) {
    segedszoveg.hidden = false;
  }

  debug("Atom visszahelyezve a táskába", {
    atomId,
    atomTipus: atom.tipus,
    toroltKotesek: kapcsolodoKotesek.map(
      (kotes) => kotes.id
    ),
    ujKeszlet:
      molekulaAllapot.keszlet[atom.tipus],
    maradekAtomok:
      molekulaAllapot.atomok.length,
  });

  return true;
}
// ==================================================
// TELJES ÉPÍTÉS TÖRLÉSE
// ==================================================

let torlesMegerősitesId = null;

function teljesEpitesTorlese() {
  if (molekulaAllapot.atomok.length === 0) {
    debug("Teljes törlés kihagyva: az építőfelület üres");
    return;
  }

  const visszaadottAtomok = {};

  molekulaAllapot.atomok.forEach((atom) => {
    if (
      molekulaAllapot.keszlet[atom.tipus] ===
      undefined
    ) {
      console.error(
        "[HIBA] Ismeretlen atomtípus törléskor:",
        atom
      );
      return;
    }

    molekulaAllapot.keszlet[atom.tipus] += 1;

    visszaadottAtomok[atom.tipus] =
      (visszaadottAtomok[atom.tipus] ?? 0) + 1;
  });

  const toroltAtomokSzama =
    molekulaAllapot.atomok.length;

  const toroltKotesekSzama =
    molekulaAllapot.kotesek.length;

  kotesKijelolesTorlese();

  molekulaAllapot.atomok = [];
  molekulaAllapot.kotesek = [];
  molekulaAllapot.polimerKapcsolatok = [];
  molekulaAllapot.kivalasztottAtomTipus = null;
  molekulaAllapot.kovetkezoAtomId = 1;
  molekulaAllapot.kovetkezoKotesId = 1;

  document.querySelectorAll(
    ".epitett-atom"
  ).forEach((atomElem) => {
    atomElem.remove();
  });

  document.querySelectorAll(
    ".atom-gomb"
  ).forEach((gomb) => {
    gomb.classList.remove("kivalasztott-atom");
    gomb.setAttribute("aria-pressed", "false");
  });

  const segedszoveg = document.getElementById(
    "epito-segedszoveg"
  );

  if (segedszoveg) {
    segedszoveg.hidden = false;
  }

  kotesekUjrarajzolasa();
  keszletMegjelenitesFrissitese();

  debug("A teljes építés törölve", {
    toroltAtomokSzama,
    toroltKotesekSzama,
    visszaadottAtomok,
    aktualisKeszlet: {
      ...molekulaAllapot.keszlet,
    },
  });
}

function teljesitettMolekulaFelhasznalasa() {
  if (molekulaAllapot.atomok.length === 0) {
    console.error(
      "[HIBA] Nincs felhasználható molekula."
    );
    return false;
  }

  const felhasznaltAtomok = {};

  molekulaAllapot.atomok.forEach((atom) => {
    felhasznaltAtomok[atom.tipus] =
      (felhasznaltAtomok[atom.tipus] ?? 0) + 1;
  });

  const atomokSzama =
    molekulaAllapot.atomok.length;

  const kotesekSzama =
    molekulaAllapot.kotesek.length;

  kotesKijelolesTorlese();

  molekulaAllapot.atomok = [];
  molekulaAllapot.kotesek = [];
  molekulaAllapot.polimerKapcsolatok = [];
  molekulaAllapot.kivalasztottAtomTipus = null;
  molekulaAllapot.kovetkezoAtomId = 1;
  molekulaAllapot.kovetkezoKotesId = 1;

  document.querySelectorAll(
    ".epitett-atom"
  ).forEach((atomElem) => {
    atomElem.remove();
  });

  document.querySelectorAll(
    ".atom-gomb"
  ).forEach((gomb) => {
    gomb.classList.remove(
      "kivalasztott-atom"
    );

    gomb.setAttribute(
      "aria-pressed",
      "false"
    );
  });

  const segedszoveg =
    document.getElementById(
      "epito-segedszoveg"
    );

  if (segedszoveg) {
    segedszoveg.hidden = false;
  }

  kotesekUjrarajzolasa();
  keszletMegjelenitesFrissitese();

  debug("A teljesített molekula felhasználva", {
    atomokSzama,
    kotesekSzama,
    felhasznaltAtomok,
    megmaradtKeszlet: {
      ...molekulaAllapot.keszlet,
    },
  });

  return true;
}

function epitesTorlesGombAlaphelyzet() {
  const gomb =
    document.getElementById("epites-torles");

  if (!gomb) {
    return;
  }

  gomb.classList.remove(
    "torles-megerositese"
  );

  gomb.textContent = "Építés törlése";

  torlesMegerősitesId = null;

  debug("Törlésmegerősítés lejárt vagy visszaállt");
}

function epitesTorlesGombBekotese() {
  const gomb =
    document.getElementById("epites-torles");

  if (!gomb) {
    console.error(
      "[HIBA] Nem található az Építés törlése gomb."
    );
    return;
  }

  gomb.addEventListener("click", () => {
    if (molekulaAllapot.atomok.length === 0) {
      debug(
        "Törlés gomb megnyomva, de az építőfelület üres"
      );
      return;
    }

    if (
      gomb.classList.contains(
        "torles-megerositese"
      )
    ) {
      if (torlesMegerősitesId !== null) {
        window.clearTimeout(
          torlesMegerősitesId
        );
      }

      teljesEpitesTorlese();
      epitesTorlesGombAlaphelyzet();
      return;
    }

    gomb.classList.add(
      "torles-megerositese"
    );

    gomb.textContent = "Biztosan törlöd?";

    debug("Teljes törlés megerősítése szükséges", {
      megerositesiIdo: 3000,
    });

    torlesMegerősitesId =
      window.setTimeout(() => {
        epitesTorlesGombAlaphelyzet();
      }, 3000);
  });

  debug("Építés törlése gomb bekötve");
}
// ==================================================
// TELJES MOLEKULA ELLENŐRZÉSE
// ==================================================

function molekulaKapcsoltsagEllenorzese() {
  const atomok = molekulaAllapot.atomok;

  if (atomok.length === 0) {
    return false;
  }

  const meglatogatott = new Set();
  const varolista = [atomok[0].id];

  while (varolista.length > 0) {
    const aktualisAtomId = varolista.shift();

    if (meglatogatott.has(aktualisAtomId)) {
      continue;
    }

    meglatogatott.add(aktualisAtomId);

    molekulaAllapot.kotesek.forEach((kotes) => {
      if (
        kotes.atom1Id === aktualisAtomId &&
        !meglatogatott.has(kotes.atom2Id)
      ) {
        varolista.push(kotes.atom2Id);
      }

      if (
        kotes.atom2Id === aktualisAtomId &&
        !meglatogatott.has(kotes.atom1Id)
      ) {
        varolista.push(kotes.atom1Id);
      }
    });
  }

  return meglatogatott.size === atomok.length;
}

function osszegkepletKeszitese(
  atomDarabok,
  hidrogenDarab
) {
  const reszek = [];

  function elemHozzaadas(jel, darab) {
    if (!darab) {
      return;
    }

    reszek.push(
      darab === 1
        ? jel
        : `${jel}${darab}`
    );
  }

  if (atomDarabok.C) {
    elemHozzaadas("C", atomDarabok.C);
    elemHozzaadas("H", hidrogenDarab);

    Object.keys(atomDarabok)
      .filter((jel) => jel !== "C")
      .sort()
      .forEach((jel) => {
        elemHozzaadas(jel, atomDarabok[jel]);
      });
  } else {
    const mindenElem = {
      ...atomDarabok,
      H: hidrogenDarab,
    };

    Object.keys(mindenElem)
      .sort()
      .forEach((jel) => {
        elemHozzaadas(jel, mindenElem[jel]);
      });
  }

  return reszek.join("");
}

function molekulaEllenorzese() {
  const hibak = [];
  const atomonkentiHidrogenek = {};
  const atomDarabok = {};

  if (molekulaAllapot.atomok.length === 0) {
    hibak.push("Az építőfelület üres.");
  }

  const vanSzenatom =
    molekulaAllapot.atomok.some(
      (atom) => atom.tipus === "C"
    );

  if (
    molekulaAllapot.atomok.length > 0 &&
    !vanSzenatom
  ) {
    hibak.push(
      "A szerves molekulának legalább egy szénatomot kell tartalmaznia."
    );
  }

  if (
    molekulaAllapot.atomok.length > 1 &&
    !molekulaKapcsoltsagEllenorzese()
  ) {
    hibak.push(
      "Nem minden atom tartozik ugyanahhoz a molekulához."
    );
  }

  let osszesHidrogen = 0;

  molekulaAllapot.atomok.forEach((atom) => {
    const maximum =
      MAX_KOTESREND[atom.tipus];

    if (maximum === undefined) {
      hibak.push(
        `Ismeretlen atomtípus: ${atom.tipus}.`
      );
      return;
    }

    const felhasznaltKotesrend =
  atomKotesrendOsszeg(
    atom.id
  ) +
  polimerKulsoKotesrendOsszeg(
    atom.id
  );
    if (felhasznaltKotesrend > maximum) {
      hibak.push(
        `A(z) ${atom.tipus} atom túllépi a megengedett vegyértékét.`
      );

      atomHibaFelvillantasa(atom.id);
      return;
    }

    const implicitHidrogen =
  implicitHidrogenDarab(
    atom.tipus,
    felhasznaltKotesrend
  );

    atomonkentiHidrogenek[atom.id] =
      implicitHidrogen;

    osszesHidrogen += implicitHidrogen;

    atomDarabok[atom.tipus] =
      (atomDarabok[atom.tipus] ?? 0) + 1;
  });

  const osszegkeplet =
    molekulaAllapot.atomok.length > 0
      ? osszegkepletKeszitese(
          atomDarabok,
          osszesHidrogen
        )
      : "";

  const eredmeny = {
    ervenyes: hibak.length === 0,
    hibak,
    osszegkeplet,
    osszesHidrogen,
    atomonkentiHidrogenek,
    atomDarabok,
  };

  debug("Molekula ellenőrzése befejezve", {
    eredmeny,
    atomok: molekulaAllapot.atomok.map(
      (atom) => ({ ...atom })
    ),
    kotesek: molekulaAllapot.kotesek.map(
      (kotes) => ({ ...kotes })
    ),
  });

  return eredmeny;
}

function ellenorzesEredmenyMegjelenitese(
  eredmeny
) {
  const eredmenyElem =
    document.getElementById(
      "ellenorzes-eredmeny"
    );

  if (!eredmenyElem) {
    console.error(
      "[HIBA] Nem található az ellenőrzés eredményének helye."
    );
    return;
  }

  eredmenyElem.hidden = false;

  eredmenyElem.classList.toggle(
    "sikeres-ellenorzes",
    eredmeny.ervenyes
  );

  eredmenyElem.classList.toggle(
    "hibas-ellenorzes",
    !eredmeny.ervenyes
  );

  if (eredmeny.ervenyes) {
    eredmenyElem.textContent =
    "Érvényes, összefüggő molekula.";
  } else {
    eredmenyElem.textContent =
      eredmeny.hibak.join(" ");
  }
}

function molekulaEllenorzesGombBekotese() {
  const gomb = document.getElementById(
    "molekula-ellenorzes"
  );

  if (!gomb) {
    console.error(
      "[HIBA] Nem található a Molekula ellenőrzése gomb."
    );
    return;
  }

  gomb.addEventListener("click", () => {
    const eredmeny =
      molekulaEllenorzese();

    ellenorzesEredmenyMegjelenitese(
      eredmeny
    );
  });

  debug("Molekula-ellenőrző gomb bekötve");
}
// ==================================================
// IMPLICIT HIDROGÉNEK MEGJELENÍTÉSE
// ==================================================

function implicitHidrogenekFrissitese() {
  const hidrogenAdatok = {};

  molekulaAllapot.atomok.forEach((atom) => {
    const maximum =
      MAX_KOTESREND[atom.tipus];

    if (maximum === undefined) {
      console.error(
        "[HIBA] Nem számítható hidrogén az atomhoz:",
        atom
      );
      return;
    }

    const felhasznaltKotesrend =
  atomKotesrendOsszeg(
    atom.id
  ) +
  polimerKulsoKotesrendOsszeg(
    atom.id
  );

    const hidrogenDarab =
  implicitHidrogenDarab(
    atom.tipus,
    felhasznaltKotesrend
  );

    hidrogenAdatok[atom.id] = hidrogenDarab;

    const atomElem = document.querySelector(
      `.epitett-atom[data-atom-id="${atom.id}"]`
    );

    if (!atomElem) {
      console.error(
        "[HIBA] Nem található az atom megjelenítése:",
        atom.id
      );
      return;
    }

    atomElem.replaceChildren();

    const atomJel =
      document.createElement("span");

    atomJel.textContent = atom.tipus;
    atomElem.appendChild(atomJel);

    if (hidrogenDarab > 0) {
      const hidrogenJel =
        document.createElement("span");

      hidrogenJel.textContent = "H";
      atomElem.appendChild(hidrogenJel);

      if (hidrogenDarab > 1) {
        const alsoIndex =
          document.createElement("sub");

        alsoIndex.textContent =
          String(hidrogenDarab);

        atomElem.appendChild(alsoIndex);
      }
    }

    atomElem.setAttribute(
      "aria-label",
      `${atom.tipus} atom, ${hidrogenDarab} automatikus hidrogénnel`
    );
  });

  debug("Implicit hidrogének frissítve", {
    hidrogenAdatok,
  });
}

// ==================================================
// RENDELÉSEK FELTÉTELEINEK ELLENŐRZÉSE
// ==================================================

function atomTipusDarab(atomTipus) {
  return molekulaAllapot.atomok.filter(
    (atom) => atom.tipus === atomTipus
  ).length;
}

function tartalmazIdegenAtomot(megengedettAtomok) {
  return molekulaAllapot.atomok.some(
    (atom) => !megengedettAtomok.includes(atom.tipus)
  );
}

function atomKapcsolatai(atomId) {
  return molekulaAllapot.kotesek
    .filter(
      (kotes) =>
        kotes.atom1Id === atomId ||
        kotes.atom2Id === atomId
    )
    .map((kotes) => {
      const masikAtomId =
        kotes.atom1Id === atomId
          ? kotes.atom2Id
          : kotes.atom1Id;

      const masikAtom =
        molekulaAllapot.atomok.find(
          (atom) => atom.id === masikAtomId
        );

      return {
        kotes,
        masikAtom,
      };
    });
}

function elagazoEterEllenorzese() {
  const hibak = [];

  if (atomTipusDarab("C") !== 5) {
    hibak.push(
      "Pontosan 5 szénatom szükséges."
    );
  }

  if (atomTipusDarab("O") !== 1) {
    hibak.push(
      "Pontosan 1 oxigénatom szükséges."
    );
  }

  if (tartalmazIdegenAtomot(["C", "O"])) {
  hibak.push(
    "Ez a rendelés csak szén- és oxigénatomot tartalmazhat."
  );
}

  const oxigen = molekulaAllapot.atomok.find(
    (atom) => atom.tipus === "O"
  );

  if (oxigen) {
    const oxigenKapcsolatai =
      atomKapcsolatai(oxigen.id);

    const szabalyosEter =
      oxigenKapcsolatai.length === 2 &&
      oxigenKapcsolatai.every(
        ({ kotes, masikAtom }) =>
          kotes.rend === 1 &&
          masikAtom?.tipus === "C"
      );

    if (!szabalyosEter) {
      hibak.push(
        "Az oxigénnek két szénatom között, egyszeres kötésekkel kell elhelyezkednie."
      );
    }
  }

  const vanElagazas =
    molekulaAllapot.atomok
      .filter((atom) => atom.tipus === "C")
      .some((atom) => {
        const szenSzomszedok =
          atomKapcsolatai(atom.id).filter(
            ({ masikAtom }) =>
              masikAtom?.tipus === "C"
          );

        return szenSzomszedok.length >= 3;
      });

  if (!vanElagazas) {
    hibak.push(
      "A szénváznak legalább egy elágazást kell tartalmaznia."
    );
  }

  return {
    sikeres: hibak.length === 0,
    hibak,
  };
}

function telitetlenAlkoholEllenorzese() {
  const hibak = [];
  const szenDarab = atomTipusDarab("C");

  if (szenDarab < 4 || szenDarab > 6) {
    hibak.push(
      "A molekulának 4–6 szénatomot kell tartalmaznia."
    );
  }

  if (atomTipusDarab("O") !== 1) {
    hibak.push(
      "Pontosan 1 oxigénatom szükséges."
    );
  }

  if (tartalmazIdegenAtomot(["C", "O"])) {
  hibak.push(
    "Ez a rendelés csak szén- és oxigénatomot tartalmazhat."
  );
}

  const oxigen = molekulaAllapot.atomok.find(
    (atom) => atom.tipus === "O"
  );

  if (oxigen) {
    const kapcsolatok =
      atomKapcsolatai(oxigen.id);

    const alkoholCsoport =
      kapcsolatok.length === 1 &&
      kapcsolatok[0].kotes.rend === 1 &&
      kapcsolatok[0].masikAtom?.tipus === "C";

    if (!alkoholCsoport) {
      hibak.push(
        "Az oxigénnek OH-csoportként kell kapcsolódnia egy szénatomhoz."
      );
    }
  }

  const szenSzenKettosKotesek =
    molekulaAllapot.kotesek.filter(
      (kotes) => {
        if (kotes.rend !== 2) {
          return false;
        }

        const atom1 =
          molekulaAllapot.atomok.find(
            (atom) => atom.id === kotes.atom1Id
          );

        const atom2 =
          molekulaAllapot.atomok.find(
            (atom) => atom.id === kotes.atom2Id
          );

        return (
          atom1?.tipus === "C" &&
          atom2?.tipus === "C"
        );
      }
    );

  if (szenSzenKettosKotesek.length !== 1) {
    hibak.push(
      "Pontosan egy szén–szén kettős kötés szükséges."
    );
  }

  const vanHarmasKotes =
    molekulaAllapot.kotesek.some(
      (kotes) => kotes.rend === 3
    );

  if (vanHarmasKotes) {
    hibak.push(
      "A rendelés nem tartalmazhat hármas kötést."
    );
  }

  return {
    sikeres: hibak.length === 0,
    hibak,
  };
}

function aminEllenorzese() {
  const hibak = [];

  if (atomTipusDarab("C") < 3) {
    hibak.push(
      "Legalább 3 szénatom szükséges."
    );
  }

  if (atomTipusDarab("N") !== 1) {
    hibak.push(
      "Pontosan 1 nitrogénatom szükséges."
    );
  }

  if (tartalmazIdegenAtomot(["C", "N"])) {
  hibak.push(
    "Ez a rendelés csak szén- és nitrogénatomot tartalmazhat."
  );
}

  const nitrogen =
    molekulaAllapot.atomok.find(
      (atom) => atom.tipus === "N"
    );

  if (nitrogen) {
    const kapcsolatok =
      atomKapcsolatai(nitrogen.id);

    const szabalyosAmin =
      kapcsolatok.length >= 1 &&
      kapcsolatok.length <= 3 &&
      kapcsolatok.every(
        ({ kotes, masikAtom }) =>
          kotes.rend === 1 &&
          masikAtom?.tipus === "C"
      );

    if (!szabalyosAmin) {
      hibak.push(
        "A nitrogén csak egyszeres kötéssel kapcsolódhat szénatomhoz."
      );
    }
  }

  return {
    sikeres: hibak.length === 0,
    hibak,
  };
}

function karbonsavEllenorzese() {
  const hibak = [];
  const szenDarab = atomTipusDarab("C");

  if (szenDarab < 3 || szenDarab > 5) {
    hibak.push(
      "A molekulának 3–5 szénatomot kell tartalmaznia."
    );
  }

  if (atomTipusDarab("O") !== 2) {
    hibak.push(
      "Pontosan 2 oxigénatom szükséges."
    );
  }

  if (tartalmazIdegenAtomot(["C", "O"])) {
  hibak.push(
    "Ez a rendelés csak szén- és oxigénatomot tartalmazhat."
  );
}

  const szenAtomok =
    molekulaAllapot.atomok.filter(
      (atom) => atom.tipus === "C"
    );

  const karboxilSzen = szenAtomok.find(
    (szenAtom) => {
      const kapcsolatok =
        atomKapcsolatai(szenAtom.id);

      const kettosOxigenek =
        kapcsolatok.filter(
          ({ kotes, masikAtom }) =>
            kotes.rend === 2 &&
            masikAtom?.tipus === "O"
        );

      const egyszeresOxigenek =
        kapcsolatok.filter(
          ({ kotes, masikAtom }) =>
            kotes.rend === 1 &&
            masikAtom?.tipus === "O"
        );

      return (
        kettosOxigenek.length === 1 &&
        egyszeresOxigenek.length === 1
      );
    }
  );

  if (!karboxilSzen) {
    hibak.push(
      "A molekulának egy C(=O)–OH karboxilcsoportot kell tartalmaznia."
    );
  } else {
    const oxigenKapcsolatok =
      atomKapcsolatai(
        karboxilSzen.id
      ).filter(
        ({ masikAtom }) =>
          masikAtom?.tipus === "O"
      );

    const szabalyosOxigenek =
      oxigenKapcsolatok.every(
        ({ masikAtom }) =>
          atomKapcsolatai(
            masikAtom.id
          ).length === 1
      );

    if (!szabalyosOxigenek) {
      hibak.push(
        "A karboxilcsoport oxigénjei nem kapcsolódhatnak további atomokhoz."
      );
    }
  }

  return {
    sikeres: hibak.length === 0,
    hibak,
  };
}

function pontosMolekulaRendelesEllenorzese(
  rendeles
) {
  if (!rendeles?.molekulaId) {
    return {
      sikeres: false,
      hibak: [
        "A pontos molekularendeléshez nincs célmolekula megadva.",
      ],
    };
  }

    const felismertMolekula =
  molekulaKereseseANevtarban(
    molekulaAllapot.atomok,
    molekulaAllapot.kotesek,
    molekulaAllapot
      .aktivPolimer,
    molekulaAllapot
      .polimerKapcsolatok
  );

  if (!felismertMolekula) {
    return {
      sikeres: false,
      hibak: [
        "Az elkészített szerkezet nem található a molekulanévtárban.",
      ],
    };
  }

    if (
  felismertMolekula.id !==
  rendeles.molekulaId
) {
  const elvartMolekula =
    molekulaSablonKeresese(
      rendeles.molekulaId
    );

  const azonosAlapvaz =
    Boolean(
      elvartMolekula?.alapvazId
    ) &&
    elvartMolekula.alapvazId ===
      felismertMolekula.alapvazId;

  const elvartEZKonfiguracio =
  (
    elvartMolekula
      ?.sztereokemia
      ?.kettosKotesek
      ?.length ?? 0
  ) > 0;

const elvartRSKonfiguracio =
  (
    elvartMolekula
      ?.sztereokemia
      ?.kiralisCentrumok
      ?.length ?? 0
  ) > 0;

const sztereoElteres =
  azonosAlapvaz &&
  (
    elvartEZKonfiguracio ||
    elvartRSKonfiguracio
  );

let sztereoHibaUzenet =
  "A molekulaváz helyes, de a sztereokémiai konfiguráció nem egyezik.";

if (elvartRSKonfiguracio) {
  sztereoHibaUzenet =
    "A molekulaváz helyes, de az R/S-konfiguráció nem egyezik. " +
    "Ellenőrizd az ék- és vonalkázott ékkötés irányát, valamint a CIP-prioritási sorrendet.";
} else if (elvartEZKonfiguracio) {
  sztereoHibaUzenet =
    "A molekulaváz helyes, de az E/Z-konfiguráció nem egyezik. " +
    "Ellenőrizd, hogy a nagyobb prioritású csoportok a kettős kötés azonos vagy ellentétes oldalán vannak-e.";
}

  return {
    sikeres: false,

    hibak: [
  sztereoElteres
    ? sztereoHibaUzenet
    : (
        "Az elkészített szerkezet nem egyezik a rendelésben szereplő célmolekulával."
      ),
],

    felismertMolekulaId:
      felismertMolekula.id,

    elvartMolekulaId:
      rendeles.molekulaId,
  };
}

  return {
    sikeres: true,
    hibak: [],

    felismertMolekulaId:
      felismertMolekula.id,
  };
}

const RENDELESEK = {
  1: {
    id: "1",
    tipus: "szabaly",
    feladatMod: "epites",

    cim: "Elágazó éter",
    leiras:
      "5 C, 1 O, legalább egy elágazás",

    csalad: "eter",
    nehezseg: 2,
    suly: 1,

    pont: 6,
    ellenorzes: elagazoEterEllenorzese,
    aktiv: false,
  },

  2: {
    id: "2",
    tipus: "szabaly",
    feladatMod: "epites",

    cim: "Telítetlen alkohol",
    leiras:
      "4–6 C, egy kettős kötés és egy OH-csoport",

    csalad: "alkohol",
    nehezseg: 3,
    suly: 1,

    pont: 7,
    ellenorzes:
      telitetlenAlkoholEllenorzese,
    aktiv: false,
  },

  3: {
    id: "3",
    tipus: "szabaly",
    feladatMod: "epites",

    cim: "Amin",
    leiras:
      "Legalább 3 C és egy nitrogénatom",

    csalad: "amin",
    nehezseg: 1,
    suly: 1,

    pont: 5,
    ellenorzes: aminEllenorzese,
    aktiv: false,
  },
  4: {
  id: "4",
  tipus: "szabaly",
  feladatMod: "epites",

  cim: "Karbonsav",
  leiras:
    "3–5 C, pontosan egy karboxilcsoport",

  csalad: "karbonsav",
  nehezseg: 2,
  suly: 1,

  pont: 7,
  ellenorzes: karbonsavEllenorzese,
  aktiv: false,
},
};

function csaladListaKeszitese(
  csaladok
) {
  const lista =
    Array.isArray(csaladok)
      ? csaladok
      : [];

  const egyediCsaladok = [
    ...new Set(
      lista
        .filter(
          (csalad) =>
            typeof csalad ===
              "string" &&
            csalad.trim()
        )
        .map(
          (csalad) =>
            csalad.trim()
        )
    ),
  ];

  return (
    egyediCsaladok.length > 0
      ? egyediCsaladok
      : ["egyeb"]
  );
}

function rendelesCsaladjai(
  rendeles
) {
  if (
    Array.isArray(
      rendeles?.csaladok
    )
  ) {
    return csaladListaKeszitese(
      rendeles.csaladok
    );
  }

  return csaladListaKeszitese(
    [rendeles?.csalad]
  );
}

function pontosMolekulaRendelesekLetrehozasa() {
  let elnevezesiDarab = 0;
  let epitesiDarab = 0;

  for (
    const molekula of
    MOLEKULA_NEVTAR
  ) {
    const nehezseg =
      Math.max(
        1,
        Number(
          molekula.nehezseg
        ) || 1
      );

    const sztereoKovetelmeny =
      molekula.sztereokemia
        ?.statusz ===
        "meghatarozott"
          ? "pontos"
          : "nem-szamit";

    const csaladok =
  csaladListaKeszitese(
    molekula.csaladok
  );

    /* Szerkezetről elnevezés */

    const elnevezesiRendelesId =
      `molekula-${molekula.id}`;

    if (
      !RENDELESEK[
        elnevezesiRendelesId
      ]
    ) {
      RENDELESEK[
        elnevezesiRendelesId
      ] = {
        id:
          elnevezesiRendelesId,

        tipus:
          "pontos-molekula",

        feladatMod:
          "elnevezes",

        cim:
          "Szerkezetről elnevezés",

        leiras:
          `${molekula.osszegkeplet} – nevezd el a célábrán látható molekulát`,

        csaladok,

csalad:
  csaladok[0],

        nehezseg,
        suly: 1,
        pont: 5 + nehezseg,

        molekulaId:
          molekula.id,

        sztereoKovetelmeny,
        aktiv: true,
      };

      elnevezesiDarab += 1;
    }

    /* IUPAC-névből szerkezetépítés */

    const epitesiRendelesId =
      `nevbol-${molekula.id}`;

    if (
      !RENDELESEK[
        epitesiRendelesId
      ]
    ) {
      RENDELESEK[
        epitesiRendelesId
      ] = {
        id:
          epitesiRendelesId,

        tipus:
          "nevbol-epites",

        feladatMod:
          "epites",

        cim:
          "Névből szerkezetépítés",

        leiras:
          `Építsd meg: ${molekula.nevek.preferalt}`,

        csaladok,

csalad:
  csaladok[0],

        nehezseg,
        suly: 1,
        pont: 5 + nehezseg,

        molekulaId:
          molekula.id,

        megadottNev:
          molekula.nevek.preferalt,

        sztereoKovetelmeny,
        aktiv: true,
      };

      epitesiDarab += 1;
    }
  }

  debug(
    "Molekulaalapú rendelések létrehozva",
    {
      elnevezesiDarab,
      epitesiDarab,
    }
  );
}

const RENDELES_CSALAD_SULYOK = {
  eter: 1,
  alkohol: 1,
  amin: 1,
  karbonsav: 1,
};

const RENDELES_FELADATTIPUS_SULYOK = {
  szabaly: 4,
  "nevbol-epites": 3,
  elnevezes: 3,
};

function rendelesFeladattipusKeresese(
  rendeles
) {
  if (
    rendeles.tipus ===
    "szabaly"
  ) {
    return "szabaly";
  }

  if (
    rendeles.tipus ===
    "nevbol-epites"
  ) {
    return "nevbol-epites";
  }

  if (
    rendeles.feladatMod ===
    "elnevezes"
  ) {
    return "elnevezes";
  }

  return "egyeb";
}

function sulyozottValasztas(
  elemek,
  sulyKeresese
) {
  if (elemek.length === 0) {
    return null;
  }

  const teljesSuly =
    elemek.reduce(
      (osszeg, elem) => {
        const suly =
          Math.max(
            0,
            Number(
              sulyKeresese(elem)
            ) || 0
          );

        return osszeg + suly;
      },
      0
    );

  if (teljesSuly <= 0) {
    const index =
      Math.floor(
        Math.random() *
        elemek.length
      );

    return elemek[index];
  }

  let veletlen =
    Math.random() * teljesSuly;

  for (const elem of elemek) {
    const suly =
      Math.max(
        0,
        Number(
          sulyKeresese(elem)
        ) || 0
      );

    veletlen -= suly;

    if (veletlen <= 0) {
      return elem;
    }
  }

  return elemek[
    elemek.length - 1
  ];
}

let aktualisMolekulaSzuro = null;

function rendelesSzuronekMegfelel(rendeles) {
  if (!aktualisMolekulaSzuro) {
    return true;
  }

  if (
    Number(rendeles.nehezseg) >
    aktualisMolekulaSzuro.maxNehezseg
  ) {
    return false;
  }

  const tiltottCsaladok =
    aktualisMolekulaSzuro.tiltottCsaladok;

  if (tiltottCsaladok.length === 0) {
    return true;
  }

  if (rendeles.tipus === "szabaly") {
    return false;
  }

  const csaladok = rendelesCsaladjai(rendeles);
  const szuroVerzio =
    aktualisMolekulaSzuro.csaladSzuroVerzio === 1
      ? 1
      : 2;

  /*
   * 1 (régi tanórák): minden család
   *    engedélyezett legyen.
   * 2 (új): elég egy bejelölt család.
   */
  if (szuroVerzio === 1) {
    return csaladok.every(
      (csalad) => !tiltottCsaladok.includes(csalad)
    );
  }

  return csaladok.some(
    (csalad) => !tiltottCsaladok.includes(csalad)
  );
}

function rendelesKisorsolhato(rendeles) {
  /*
   * A régi szabályalapú építési feladatok
   * (adott szénatomszám, elágazás, telítetlenség)
   * nem kerülhetnek a sorsolásba. A konkrét
   * molekulát kérő rendelések igen.
   */

  return (
    Boolean(rendeles) &&
    rendeles.aktiv !== false &&
    rendeles.tipus !== "szabaly"
  );
}

function kovetkezoRendelesHuzasa() {
  const foglaltRendelesIds =
    new Set(
      molekulaAllapot
        .aktivRendelesIds
    );

  if (
    molekulaAllapot
      .kovetkezoRendelesId
  ) {
    foglaltRendelesIds.add(
      molekulaAllapot
        .kovetkezoRendelesId
    );
  }

  /*
   * Ugyanaz a molekula ne jelenhessen
   * meg egyszerre elnevezési és
   * építési feladatként.
   */

  const foglaltMolekulaIds =
    new Set(
      [...foglaltRendelesIds]
        .map(
          (rendelesId) =>
            RENDELESEK[
              rendelesId
            ]?.molekulaId
        )
        .filter(Boolean)
    );

  let jeloltek =
    Object.values(RENDELESEK)
      .filter(
        (rendeles) =>
          rendelesKisorsolhato(rendeles) &&
          rendelesSzuronekMegfelel(rendeles) &&

!foglaltRendelesIds.has(
            rendeles.id
          ) &&

          (
            !rendeles.molekulaId ||
            !foglaltMolekulaIds.has(
              rendeles.molekulaId
            )
          )
      );

  if (jeloltek.length === 0) {
    return null;
  }

  /*
   * Ha van más lehetőség, az utóbbi
   * nyolc rendelés ne ismétlődjön.
   */

  const nemRegiJeloltek =
    jeloltek.filter(
      (rendeles) =>
        !molekulaAllapot
          .legutobbiRendelesIds
          .includes(rendeles.id)
    );

  if (nemRegiJeloltek.length > 0) {
    jeloltek =
      nemRegiJeloltek;
  }

  /*
   * Először feladattípust választunk
   * a még kisorsolható rendelések közül.
   */

  const feladattipusok = [
    ...new Set(
      jeloltek.map(
        (rendeles) =>
          rendelesFeladattipusKeresese(
            rendeles
          )
      )
    ),
  ];

  const kivalasztottFeladattipus =
    sulyozottValasztas(
      feladattipusok,
      (feladattipus) =>
        RENDELES_FELADATTIPUS_SULYOK[
          feladattipus
        ] ?? 1
    );

  const feladattipusJeloltjei =
    jeloltek.filter(
      (rendeles) =>
        rendelesFeladattipusKeresese(
          rendeles
        ) ===
        kivalasztottFeladattipus
    );

  /*
   * A kiválasztott feladattípuson
   * belül választunk molekulacsaládot.
   */

  const csaladok = [
  ...new Set(
    feladattipusJeloltjei
      .flatMap(
        (rendeles) =>
          rendelesCsaladjai(
            rendeles
          )
      )
  ),
];

const utolsoRendelesId =
  molekulaAllapot
    .legutobbiRendelesIds[0];

const utolsoRendeles =
  RENDELESEK[
    utolsoRendelesId
  ] ?? null;

const utolsoCsalad =
  utolsoRendeles
    ?.utoljaraKivalasztottCsalad ??
  (
    utolsoRendeles
      ? rendelesCsaladjai(
          utolsoRendeles
        )[0]
      : null
  );

const masCsaladok =
  csaladok.filter(
    (csalad) =>
      csalad !==
      utolsoCsalad
  );

const valaszthatoCsaladok =
  masCsaladok.length > 0
    ? masCsaladok
    : csaladok;

const kivalasztottCsalad =
  sulyozottValasztas(
    valaszthatoCsaladok,
    (csalad) =>
      RENDELES_CSALAD_SULYOK[
        csalad
      ] ?? 1
  );

const csaladJeloltjei =
  feladattipusJeloltjei.filter(
    (rendeles) =>
      rendelesCsaladjai(
        rendeles
      ).includes(
        kivalasztottCsalad
      )
  );

/*
 * A több családhoz tartozó
 * rendelés súlyát elosztjuk
 * a családjai között. Így nem
 * válik gyakoribbá csak azért,
 * mert több címkéje van.
 */

const kivalasztottRendeles =
  sulyozottValasztas(
    csaladJeloltjei,
    (rendeles) => {
      const rendelesCsaladok =
        rendelesCsaladjai(
          rendeles
        );

      const csaladDarab =
        Math.max(
          1,
          rendelesCsaladok.length
        );

      return (
        (
          Number(
            rendeles.suly
          ) || 1
        ) /
        csaladDarab
      );
    }
  );

if (kivalasztottRendeles) {
  kivalasztottRendeles
    .utoljaraKivalasztottCsalad =
    kivalasztottCsalad;
}

  debug(
    "Következő rendelés kisorsolva",
    {
      feladattipus:
        kivalasztottFeladattipus,

      csalad:
        kivalasztottCsalad,

      rendelesId:
        kivalasztottRendeles?.id ??
        null,
    }
  );

  return (
    kivalasztottRendeles?.id ??
    null
  );
}

function kezdoRendelesekKisorsolasa() {
  molekulaAllapot
    .aktivRendelesIds = [];

  molekulaAllapot
    .kovetkezoRendelesId = null;

  while (
    molekulaAllapot
      .aktivRendelesIds
      .length < 3
  ) {
    const rendelesId =
      kovetkezoRendelesHuzasa();

    if (!rendelesId) {
      break;
    }

    molekulaAllapot
      .aktivRendelesIds
      .push(rendelesId);
  }

  molekulaAllapot
    .kovetkezoRendelesId =
    kovetkezoRendelesHuzasa();

  /*
   * Induláskor lehetőleg építési
   * feladat legyen kijelölve.
   */

  molekulaAllapot
    .kivalasztottRendelesId =
    molekulaAllapot
      .aktivRendelesIds
      .find(
        (rendelesId) =>
          RENDELESEK[rendelesId]
            ?.feladatMod ===
            "epites"
      ) ??
    molekulaAllapot
      .aktivRendelesIds[0] ??
    null;

  /*
   * Három aktív rendelés elég a
   * kezdéshez. A következő (várakozó)
   * feladat kis poolnál – pl. könnyű
   * aldehidek – elmaradhat; a játék
   * közben újrahúzható, ha felszabadul
   * molekula.
   */
  const sikeres =
    molekulaAllapot
      .aktivRendelesIds
      .length === 3;

  if (!sikeres) {
    console.error(
      "[HIBA] Nem sikerült a kezdő rendelési sort kisorsolni."
    );
  }

  debug(
    "Kezdő rendelések kisorsolva",
    {
      aktivRendelesIds: [
        ...molekulaAllapot
          .aktivRendelesIds,
      ],

      kovetkezoRendelesId:
        molekulaAllapot
          .kovetkezoRendelesId,

      kivalasztottRendelesId:
        molekulaAllapot
          .kivalasztottRendelesId,
    }
  );

  return sikeres;
}

function rendelesKartyaLetrehozasa(
  rendelesId
) {
  const rendeles =
    RENDELESEK[rendelesId];

  if (!rendeles) {
    console.error(
      "[HIBA] Nem létező rendeléskártya:",
      rendelesId
    );

    return null;
  }

  const kartya =
    document.createElement("button");

  kartya.type = "button";
  kartya.className = "rendeles-kartya";
  kartya.dataset.rendelesId =
    rendelesId;

  if (
    rendelesId ===
    molekulaAllapot.kivalasztottRendelesId
  ) {
    kartya.classList.add(
      "kivalasztott-rendeles"
    );

    kartya.setAttribute(
      "aria-pressed",
      "true"
    );
  } else {
    kartya.setAttribute(
      "aria-pressed",
      "false"
    );
  }

  const cim =
    document.createElement("strong");

  cim.textContent = rendeles.cim;

  const leiras =
    document.createElement("span");

  leiras.textContent =
    rendeles.leiras;

  const pont =
    document.createElement("small");

  if (
  rendeles.tipus ===
  "szabaly"
) {
  const maximumPont =
    rendeles.pont +
    nevadasIupacBonuszPontja(
      rendeles
    );

  pont.textContent =
    `${rendeles.pont}–${maximumPont} pont`;
} else if (
  rendeles.feladatMod ===
  "elnevezes"
) {
  pont.textContent =
    `${rendeles.pont - 1}–${rendeles.pont} pont`;
} else {
  pont.textContent =
    `${rendeles.pont} pont`;
}

  kartya.append(
  cim,
  leiras
);

if (
  rendeles.tipus ===
    "pontos-molekula" &&
  rendeles.feladatMod ===
    "elnevezes"
) {
  const elozetAdatok =
    molekulaSablonElozetAdatok(
      rendeles.molekulaId
    );

  const svgNevter =
    "http://www.w3.org/2000/svg";

  const celAbra =
    document.createElementNS(
      svgNevter,
      "svg"
    );

  celAbra.setAttribute(
    "viewBox",
    "0 0 360 160"
  );

  celAbra.setAttribute(
    "role",
    "img"
  );

  celAbra.setAttribute(
    "aria-label",
    "A célmolekula szerkezeti ábrája"
  );

  celAbra.classList.add(
    "rendeles-molekula-elozet"
  );

  if (elozetAdatok) {
        nevadasMolekulaKirajzolasa(
      elozetAdatok.atomok,
      elozetAdatok.kotesek,
      celAbra,
      elozetAdatok.polimer
    );
  }

  kartya.appendChild(celAbra);
}

kartya.appendChild(pont);

return kartya;
}

function rendelesekMegjelenitese() {
  const aktivTarolo =
    document.getElementById(
      "aktiv-rendelesek"
    );

  if (!aktivTarolo) {
    console.error(
      "[HIBA] Nem található az aktív rendelések tárolója."
    );
    return false;
  }

  aktivTarolo.replaceChildren();

  molekulaAllapot
    .aktivRendelesIds
    .forEach((rendelesId) => {
      const kartya =
        rendelesKartyaLetrehozasa(
          rendelesId
        );

      if (kartya) {
        aktivTarolo.appendChild(kartya);
      }
    });

  const kovetkezoRendeles =
    RENDELESEK[
      molekulaAllapot
        .kovetkezoRendelesId
    ];

  const kovetkezoNev =
    document.querySelector(
      ".kovetkezo-rendeles span"
    );

  const kovetkezoLeiras =
    document.querySelector(
      ".kovetkezo-rendeles small"
    );

  if (
    kovetkezoRendeles &&
    kovetkezoNev &&
    kovetkezoLeiras
  ) {
    kovetkezoNev.textContent =
      kovetkezoRendeles.cim;

    kovetkezoLeiras.textContent =
      "A részletek később válnak láthatóvá.";
  }

  debug(
    "Rendelési sor megjelenítve",
    {
      aktivRendelesIds:
        molekulaAllapot
          .aktivRendelesIds,

      kovetkezoRendelesId:
        molekulaAllapot
          .kovetkezoRendelesId,
    }
  );

  return true;
}

function tesztRendelesBetoltese(
  molekulaId,
  feladatMod = "elnevezes"
) {
  const rendelesId =
    feladatMod === "epites"
      ? `nevbol-${molekulaId}`
      : `molekula-${molekulaId}`;

  if (!RENDELESEK[rendelesId]) {
    console.error(
      "[TESZT HIBA] Nem található a rendelés:",
      rendelesId
    );

    return false;
  }

  const tobbiRendelesId =
    molekulaAllapot
      .aktivRendelesIds
      .filter(
        (aktivId) =>
          aktivId !== rendelesId
      );

  molekulaAllapot
    .aktivRendelesIds = [
      rendelesId,
      ...tobbiRendelesId,
    ].slice(0, 3);

  molekulaAllapot
    .kivalasztottRendelesId =
    rendelesId;

  rendelesekMegjelenitese();
  rendelesekBekotese();

  rendelesKivalasztas(
    rendelesId
  );

  debug(
    "Tesztelési rendelés betöltve",
    {
      molekulaId,
      feladatMod,
      rendelesId,
    }
  );

  return true;
}

window.tesztRendelesBetoltese =
  tesztRendelesBetoltese;

function teljesitettRendelesCsereje(
  teljesitettRendelesId
) {
  const regiAktivRendelesIds = [
    ...molekulaAllapot
      .aktivRendelesIds,
  ];

  const regiKovetkezoRendelesId =
    molekulaAllapot
      .kovetkezoRendelesId;

  const regiKivalasztottRendelesId =
    molekulaAllapot
      .kivalasztottRendelesId;

  const regiLegutobbiRendelesIds = [
    ...molekulaAllapot
      .legutobbiRendelesIds,
  ];

  if (
    !regiAktivRendelesIds.includes(
      teljesitettRendelesId
    )
  ) {
    console.error(
      "[HIBA] A teljesített rendelés nincs az aktív rendelések között:",
      teljesitettRendelesId
    );

    return false;
  }

  /*
   * A teljesített rendelés kerül előre,
   * majd a másik két lecserélt rendelés.
   */

  const lecsereltRendelesIds = [
    teljesitettRendelesId,

    ...regiAktivRendelesIds.filter(
      (rendelesId) =>
        rendelesId !==
        teljesitettRendelesId
    ),
  ];

  molekulaAllapot
    .legutobbiRendelesIds = [
      ...lecsereltRendelesIds,
      ...regiLegutobbiRendelesIds,
    ]
      .filter(
        (
          rendelesId,
          index,
          rendelesIds
        ) =>
          rendelesIds.indexOf(
            rendelesId
          ) === index
      )
      .slice(0, 8);

  /*
   * A korábban jelzett következő
   * rendelés lesz az új hármas első
   * tagja.
   */

  molekulaAllapot
    .aktivRendelesIds = [];

  molekulaAllapot
    .kovetkezoRendelesId = null;

  if (
    rendelesKisorsolhato(
      RENDELESEK[
        regiKovetkezoRendelesId
      ]
    )
  ) {
    molekulaAllapot
      .aktivRendelesIds
      .push(
        regiKovetkezoRendelesId
      );
  }

  /*
   * A maradék helyeket az új,
   * kiegyensúlyozott húás tölti ki.
   */

  while (
    molekulaAllapot
      .aktivRendelesIds
      .length < 3
  ) {
    const ujRendelesId =
      kovetkezoRendelesHuzasa();

    if (!ujRendelesId) {
      break;
    }

    molekulaAllapot
      .aktivRendelesIds
      .push(
        ujRendelesId
      );
  }

  /*
   * A három új aktív rendelés után
   * kisorsoljuk a következő kör első
   * ismert rendelését is.
   */

  const ujKovetkezoRendelesId =
    kovetkezoRendelesHuzasa();

  const teljesUjHarmas =
    molekulaAllapot
      .aktivRendelesIds
      .length === 3;

  if (
    !teljesUjHarmas ||
    !ujKovetkezoRendelesId
  ) {
    console.error(
      "[HIBA] Nem sikerült teljes új rendelési sort húzni."
    );

    /*
     * Sikertelen húzásnál visszaállítjuk
     * a korábbi, működő állapotot.
     */

    molekulaAllapot
      .aktivRendelesIds =
      regiAktivRendelesIds;

    molekulaAllapot
      .kovetkezoRendelesId =
      regiKovetkezoRendelesId;

    molekulaAllapot
      .kivalasztottRendelesId =
      regiKivalasztottRendelesId;

    molekulaAllapot
      .legutobbiRendelesIds =
      regiLegutobbiRendelesIds;

    return false;
  }

  molekulaAllapot
    .kovetkezoRendelesId =
    ujKovetkezoRendelesId;

  /*
   * Ha van építési feladat, az legyen
   * alapból kijelölve. Így a játék nem
   * nyitja meg magától az elnevezési
   * felületet.
   */

  const alapertelmezettRendelesId =
    molekulaAllapot
      .aktivRendelesIds
      .find(
        (rendelesId) =>
          RENDELESEK[rendelesId]
            ?.feladatMod ===
            "epites"
      ) ??
    molekulaAllapot
      .aktivRendelesIds[0];

  molekulaAllapot
    .kivalasztottRendelesId =
    alapertelmezettRendelesId;

  rendelesekMegjelenitese();
  rendelesekBekotese();

  debug(
    "Mindhárom rendelés lecserélve",
    {
      teljesitettRendelesId,

      regiAktivRendelesIds,

      ujAktivRendelesIds: [
        ...molekulaAllapot
          .aktivRendelesIds,
      ],

      ujKovetkezoRendelesId:
        molekulaAllapot
          .kovetkezoRendelesId,
    }
  );

    molekulaAllapot
    .teljesitettRendelesek +=
    1;

    tanoraiEredmenyKuldes(
    "jatszik"
  ).catch((hiba) => {
    console.error(
      "[TANÓRA] Az eredmény mentése sikertelen:",
      hiba
    );
  });

  ellenorzesEredmenyIdozitettElrejtese(
    3000
  );

  return true;
}

function rendelesEllenorzese(rendelesId) {
  const rendeles =
    RENDELESEK[rendelesId];

  if (!rendeles) {
    console.error(
      "[HIBA] Ismeretlen rendelés:",
      rendelesId
    );

    return {
      sikeres: false,
      hibak: ["A kiválasztott rendelés nem található."],
    };
  }

  const molekulaEredmeny =
    molekulaEllenorzese();

  if (!molekulaEredmeny.ervenyes) {
    return {
      sikeres: false,
      hibak: molekulaEredmeny.hibak,
      rendeles,
    };
  }

  let rendelesEredmeny;

if (
  rendeles.tipus ===
    "pontos-molekula" ||
  rendeles.tipus ===
    "nevbol-epites"
) {
  rendelesEredmeny =
    pontosMolekulaRendelesEllenorzese(
      rendeles
    );
} else if (
  typeof rendeles.ellenorzes ===
  "function"
) {
  rendelesEredmeny =
    rendeles.ellenorzes();
} else {
  rendelesEredmeny = {
    sikeres: false,
    hibak: [
      "Ehhez a rendeléshez nem tartozik ellenőrzési szabály.",
    ],
  };
}

  return {
    ...rendelesEredmeny,
    rendeles,
  };
}

function rendelesEredmenyMegjelenitese(
  eredmeny
) {
  const eredmenyElem =
    document.getElementById(
      "ellenorzes-eredmeny"
    );

  if (!eredmenyElem) {
    console.error(
      "[HIBA] Nem található az eredménymező."
    );
    return;
  }

  eredmenyElem.hidden = false;

  eredmenyElem.classList.toggle(
    "sikeres-ellenorzes",
    eredmeny.sikeres
  );

  eredmenyElem.classList.toggle(
    "hibas-ellenorzes",
    !eredmeny.sikeres
  );

  if (eredmeny.sikeres) {
    eredmenyElem.textContent =
      `A(z) „${eredmeny.rendeles.cim}” rendelés teljesítve.`;
  } else {
    eredmenyElem.textContent =
      eredmeny.hibak.join(" ");
  }
}

function nevbolEpitesRendelesBefejezese(
  rendeles
) {
  if (
    !rendeles ||
    rendeles.tipus !==
      "nevbol-epites"
  ) {
    console.error(
      "[HIBA] Nem érvényes névből építési rendelés."
    );

    return false;
  }

  const molekulaFelhasznalva =
    teljesitettMolekulaFelhasznalasa();

  if (!molekulaFelhasznalva) {
    console.error(
      "[HIBA] A felépített molekula nem használható fel."
    );

    return false;
  }

  pontokHozzaadasa(
    rendeles.pont,
    `${rendeles.cim}: pontos szerkezet`
  );

  const eredmenyElem =
    document.getElementById(
      "ellenorzes-eredmeny"
    );

  if (eredmenyElem) {
    eredmenyElem.hidden = false;

    eredmenyElem.classList.remove(
      "hibas-ellenorzes"
    );

    eredmenyElem.classList.add(
      "sikeres-ellenorzes"
    );

    eredmenyElem.textContent =
      `Rendelés teljesítve: +${rendeles.pont} pont. A(z) „${rendeles.megadottNev}” szerkezete helyes.`;
  }

  debug(
    "Névből építési rendelés teljesítve",
    {
      rendelesId:
        rendeles.id,

      molekulaId:
        rendeles.molekulaId,

      kapottPont:
        rendeles.pont,
    }
  );

  teljesitettRendelesCsereje(
    rendeles.id
  );

  return true;
}

function rendelesLeadasGombBekotese() {
  const gomb =
    document.getElementById(
      "rendeles-leadas"
    );

  if (!gomb) {
    console.error(
      "[HIBA] Nem található a Rendelés leadása gomb."
    );
    return;
  }

  gomb.addEventListener("click", () => {
    const rendelesId =
      molekulaAllapot.kivalasztottRendelesId;

    const eredmeny =
      rendelesEllenorzese(rendelesId);

    rendelesEredmenyMegjelenitese(
      eredmeny
    );

    if (eredmeny.sikeres) {
  if (
    eredmeny.rendeles.tipus ===
    "nevbol-epites"
  ) {
    nevbolEpitesRendelesBefejezese(
      eredmeny.rendeles
    );
  } else {
    nevadasAblakMegnyitasa(
      eredmeny.rendeles
    );
  }
}

    debug("Rendelés leadási kísérlet", {
      rendelesId,
      sikeres: eredmeny.sikeres,
      hibak: eredmeny.hibak ?? [],
    });
  });

  debug("Rendelés leadása gomb bekötve");
}

function nevadasAtomFeliratKeszitese(
  atom,
  kotesek,
  polimer = null
) {
  const maximum =
    MAX_KOTESREND[atom.tipus];

  const felhasznaltKotesrend =
    kotesek.reduce(
      (osszeg, kotes) => {
        const kapcsolodik =
          kotes.atom1Id === atom.id ||
          kotes.atom2Id === atom.id;

        return kapcsolodik
          ? osszeg + kotes.rend
          : osszeg;
      },
      0
    );

    const atomIndex =
    Number.parseInt(
      String(atom.id)
        .replace(
          "elozet-atom-",
          ""
        ),
      10
    );

  const polimerKapcsolodasok =
  Array.isArray(
    polimer?.kapcsolodasok
  )
    ? polimer.kapcsolodasok
    : [];

const kulsoKotesrend =
  polimerKapcsolodasok.reduce(
    (
      osszeg,
      kapcsolodas
    ) => {
      if (
        kapcsolodas
          ?.atomIndex !==
        atomIndex
      ) {
        return osszeg;
      }

      const kotesrend =
        Number(
          kapcsolodas
            ?.kotesrend
        );

      return (
        osszeg +
        (
          Number.isFinite(
            kotesrend
          ) &&
          kotesrend > 0
            ? kotesrend
            : 1
        )
      );
    },
    0
  );

  const hidrogenDarab =
  implicitHidrogenDarab(
    atom.tipus,
    felhasznaltKotesrend + kulsoKotesrend
  );

  if (hidrogenDarab === 0) {
    return atom.tipus;
  }

  if (hidrogenDarab === 1) {
    return `${atom.tipus}H`;
  }

  const alsoIndexek = {
    2: "₂",
    3: "₃",
    4: "₄",
  };

  return (
    `${atom.tipus}H` +
    (alsoIndexek[hidrogenDarab] ??
      String(hidrogenDarab))
  );
}

function nevadasMolekulaKirajzolasa(
  atomok,
  kotesek,
  celSvg = null,
  polimer = null,
  beallitasok = null
) {
  const svg =
    celSvg ??
    document.getElementById(
      "nevadas-molekula-svg"
    );

  if (!svg) {
  console.error(
    "[HIBA] Nem található a molekula-előnézet SVG-eleme."
  );

  return false;
}

  svg.replaceChildren();

  if (!atomok || atomok.length === 0) {
    debug(
      "A molekula-előnézet üres maradt."
    );
    return;
  }

  const atomDarab =
  atomok.length;

const nagyElozet =
  svg.id ===
    "feladat-molekula-svg" ||
  svg.id ===
    "nevadas-molekula-svg" ||
      svg.id ===
    "admin-molekula-svg" ||
  svg.id ===
    "admin-polimer-monomer-svg" ||
  svg.id ===
    "admin-polimer-elozet-svg";

const egyediSzelesseg = Number(
  beallitasok?.rajzSzelesseg
);
const egyediMagassag = Number(
  beallitasok?.rajzMagassag
);
const egyediMeretarany = Number(
  beallitasok?.meretaranyMaximum
);

const svgSzelesseg =
  Number.isFinite(egyediSzelesseg) &&
  egyediSzelesseg > 0
    ? egyediSzelesseg
    : nagyElozet
      ? Math.max(
          560,
          atomDarab * 58
        )
      : Math.max(
          360,
          atomDarab * 34
        );

const svgMagassag =
  Number.isFinite(egyediMagassag) &&
  egyediMagassag > 0
    ? egyediMagassag
    : nagyElozet
      ? Math.max(
          260,
          Math.min(
            420,
            190 + atomDarab * 20
          )
        )
      : 180;

const egyediMargo = Number(beallitasok?.belsoMargo);
const belsoMargó =
  Number.isFinite(egyediMargo) && egyediMargo > 0
    ? egyediMargo
    : nagyElozet
      ? 48
      : 32;

    const vizszintesMargó =
  polimer?.ismetlodEgyseg === true && nagyElozet
    ? 90
    : belsoMargó;

svg.setAttribute(
  "viewBox",
  `0 0 ${svgSzelesseg} ${svgMagassag}`
);

  const xErtekek =
    atomok.map((atom) => atom.x);

  const yErtekek =
    atomok.map((atom) => atom.y);

  const minimumX = Math.min(...xErtekek);
  const maximumX = Math.max(...xErtekek);
  const minimumY = Math.min(...yErtekek);
  const maximumY = Math.max(...yErtekek);

  const molekulaSzelesseg = Math.max(
    maximumX - minimumX,
    1
  );

  const molekulaMagassag = Math.max(
    maximumY - minimumY,
    1
  );

  const meretarany = Math.min(
        (svgSzelesseg - 2 * vizszintesMargó) /
      molekulaSzelesseg,

    (svgMagassag - 2 * belsoMargó) /
      molekulaMagassag,

    Number.isFinite(egyediMeretarany) &&
    egyediMeretarany > 0
      ? egyediMeretarany
      : 1.4
  );

  const kozeppontX =
    (minimumX + maximumX) / 2;

  const kozeppontY =
    (minimumY + maximumY) / 2;

  const poziciok = new Map();

  atomok.forEach((atom) => {
    poziciok.set(atom.id, {
      x:
        svgSzelesseg / 2 +
        (atom.x - kozeppontX) *
          meretarany,

      y:
        svgMagassag / 2 +
        (atom.y - kozeppontY) *
          meretarany,
    });
  });

  const svgNevter =
  "http://www.w3.org/2000/svg";

const kisKartyaElozet =
  svg.classList.contains(
    "rendeles-molekula-elozet"
  );

const egyediAtomSugar = Number(beallitasok?.atomSugar);
const atomSugar =
  Number.isFinite(egyediAtomSugar) && egyediAtomSugar > 0
    ? egyediAtomSugar
    : kisKartyaElozet
      ? 17
      : 21;

const kotesVegpontEltolas =
  atomSugar - 2;

kotesek.forEach((kotes) => {
    const elso =
      poziciok.get(kotes.atom1Id);

    const masodik =
      poziciok.get(kotes.atom2Id);

    if (!elso || !masodik) {
      console.error(
        "[HIBA] Előnézeti kötés atomja hiányzik:",
        kotes
      );
      return;
    }

    const dx = masodik.x - elso.x;
    const dy = masodik.y - elso.y;
    const hossz = Math.hypot(dx, dy);

    if (hossz === 0) {
      return;
    }

    const iranyX = dx / hossz;
const iranyY = dy / hossz;

    const merolegesX = -dy / hossz;
    const merolegesY = dx / hossz;

    if (
  kotes.rend === 1 &&
  kotes.sztereo === "elo"
) {
  const kezdoX =
    elso.x +
    iranyX * kotesVegpontEltolas;

  const kezdoY =
    elso.y +
    iranyY * kotesVegpontEltolas;

  const vegX =
    masodik.x -
    iranyX * kotesVegpontEltolas;

  const vegY =
    masodik.y -
    iranyY * kotesVegpontEltolas;

  const felSzelesseg =
    kisKartyaElozet ? 6 : 9;

  const ek =
    document.createElementNS(
      svgNevter,
      "polygon"
    );

  ek.setAttribute(
    "points",
    [
      `${kezdoX},${kezdoY}`,
      `${
        vegX +
        merolegesX * felSzelesseg
      },${
        vegY +
        merolegesY * felSzelesseg
      }`,
      `${
        vegX -
        merolegesX * felSzelesseg
      },${
        vegY -
        merolegesY * felSzelesseg
      }`,
    ].join(" ")
  );

  ek.classList.add(
    "nevadas-elozet-tomor-ek"
  );

  svg.appendChild(ek);
  return;
}

if (
  kotes.rend === 1 &&
  kotes.sztereo === "hatra"
) {
  const kezdoX =
    elso.x +
    iranyX * kotesVegpontEltolas;

  const kezdoY =
    elso.y +
    iranyY * kotesVegpontEltolas;

  const vegX =
    masodik.x -
    iranyX * kotesVegpontEltolas;

  const vegY =
    masodik.y -
    iranyY * kotesVegpontEltolas;

  const vonalakSzama = 6;

  for (
    let index = 1;
    index <= vonalakSzama;
    index += 1
  ) {
    const arany =
      index / (vonalakSzama + 1);

    const kozeppontX =
      kezdoX +
      (vegX - kezdoX) * arany;

    const kozeppontY =
      kezdoY +
      (vegY - kezdoY) * arany;

    const maximumFelSzelesseg =
      kisKartyaElozet ? 6 : 9;

    const felSzelesseg =
      1 + arany *
        maximumFelSzelesseg;

    const vonal =
      document.createElementNS(
        svgNevter,
        "line"
      );

    vonal.setAttribute(
      "x1",
      kozeppontX -
        merolegesX * felSzelesseg
    );

    vonal.setAttribute(
      "y1",
      kozeppontY -
        merolegesY * felSzelesseg
    );

    vonal.setAttribute(
      "x2",
      kozeppontX +
        merolegesX * felSzelesseg
    );

    vonal.setAttribute(
      "y2",
      kozeppontY +
        merolegesY * felSzelesseg
    );

    vonal.classList.add(
      "nevadas-elozet-szaggatott-ek"
    );

    svg.appendChild(vonal);
  }

  return;
}

    const eltolasok = {
      1: [0],
      2: [-3, 3],
      3: [-6, 0, 6],
    };

    const kotesEltolasok =
      eltolasok[kotes.rend] ?? [0];

    kotesEltolasok.forEach((eltolas) => {
      const vonal =
        document.createElementNS(
          svgNevter,
          "line"
        );

      vonal.setAttribute(
  "x1",
  elso.x +
    iranyX * kotesVegpontEltolas +
    merolegesX * eltolas
);

vonal.setAttribute(
  "y1",
  elso.y +
    iranyY * kotesVegpontEltolas +
    merolegesY * eltolas
);

vonal.setAttribute(
  "x2",
  masodik.x -
    iranyX * kotesVegpontEltolas +
    merolegesX * eltolas
);

vonal.setAttribute(
  "y2",
  masodik.y -
    iranyY * kotesVegpontEltolas +
    merolegesY * eltolas
);

      vonal.classList.add(
        "nevadas-elozet-kotes"
      );

      svg.appendChild(vonal);
    });
  });

  const atomSzinek = {
  C: "#a9b7c6",
  O: "#ff7373",
  N: "#71a7ff",
  S: "#f1c15d",
  P: "#e99b65",
  F: "#88dbae",
  Cl: "#65d58a",
  Br: "#ad6b4f",
  I: "#ae94dc",
  Si: "#84b8be",
};

  atomok.forEach((atom) => {
    const pozicio =
      poziciok.get(atom.id);

    const csoport =
      document.createElementNS(
        svgNevter,
        "g"
      );

    const kor =
      document.createElementNS(
        svgNevter,
        "circle"
      );

    kor.setAttribute("cx", pozicio.x);
    kor.setAttribute("cy", pozicio.y);
    kor.setAttribute(
  "r",
  String(atomSugar)
);

    kor.setAttribute(
      "fill",
      atomSzinek[atom.tipus] ??
        "#d7dde8"
    );

    kor.classList.add(
      "nevadas-elozet-atom-kor"
    );

    const szoveg =
      document.createElementNS(
        svgNevter,
        "text"
      );

    szoveg.setAttribute(
      "x",
      pozicio.x
    );

    szoveg.setAttribute(
      "y",
      pozicio.y
    );

    szoveg.textContent =
            nevadasAtomFeliratKeszitese(
        atom,
        kotesek,
        polimer
      );
    szoveg.classList.add(
      "nevadas-elozet-atom-szoveg"
    );

    csoport.appendChild(kor);
    csoport.appendChild(szoveg);
    svg.appendChild(csoport);
  });

    if (
    polimer
      ?.ismetlodEgyseg ===
    true
  ) {
    const kirajzoltPoziciok = [
      ...poziciok.values(),
    ];

    const kirajzoltXErtekek =
      kirajzoltPoziciok.map(
        (pozicio) =>
          pozicio.x
      );

    const kirajzoltYErtekek =
      kirajzoltPoziciok.map(
        (pozicio) =>
          pozicio.y
      );

    const zarojelTavolsag =
      kisKartyaElozet
        ? 12
        : 20;

    const jobbOldaliHely =
      kisKartyaElozet
        ? 28
        : 42;

    const alsoHely =
      kisKartyaElozet
        ? 20
        : 30;

    polimerZarojelekKirajzolasa(
      svg,
      {
        balX:
          Math.max(
            10,
            Math.min(
              ...kirajzoltXErtekek
            ) -
              atomSugar -
              zarojelTavolsag
          ),

        jobbX:
          Math.min(
            svgSzelesseg -
              jobbOldaliHely,
            Math.max(
              ...kirajzoltXErtekek
            ) +
              atomSugar +
              zarojelTavolsag
          ),

        felsoY:
          Math.max(
            10,
            Math.min(
              ...kirajzoltYErtekek
            ) -
              atomSugar -
              zarojelTavolsag
          ),

        alsoY:
          Math.min(
            svgMagassag -
              alsoHely,
            Math.max(
              ...kirajzoltYErtekek
            ) +
              atomSugar +
              zarojelTavolsag
          ),

        kisMeret:
  kisKartyaElozet,

kapcsolodasok:
  polimer
    ?.kapcsolodasok,

    atomPoziciok:
  poziciok,
  atomSugar,

interaktiv:
  false,
      }
    );
  }

  debug("A névadási molekula-előnézet elkészült", {
    atomok: atomok.length,
    kotesek: kotesek.length,
    meretarany,
  });

  return true;
}

function nevadasAblakMegnyitasa(rendeles) {
  const ablak = document.querySelector("#nevadas-ablak");
  const nevMezo = document.querySelector("#molekula-nev");
  const visszajelzes = document.querySelector("#nevadas-visszajelzes");
  const leiras =
  document.querySelector(
    "#nevadas-urlap > p"
  );

  if (!ablak || !nevMezo || !visszajelzes) {
    debug("HIBA: A névadási ablak valamelyik eleme hiányzik.");
    return;
  }

  if (!rendeles) {
  console.error(
    "[HIBA] A névadáshoz nem érkezett rendelés."
  );
  return;
}

molekulaAllapot.nevadasraVaroRendeles =
  rendeles;

if (
  rendeles.feladatMod ===
  "elnevezes"
) {
  const celMolekula =
    molekulaSablonElozetAdatok(
      rendeles.molekulaId
    );

  if (!celMolekula) {
    console.error(
      "[HIBA] Az elnevezési feladathoz nem található célmolekula."
    );

    return;
  }

    molekulaAllapot
    .nevadasraVaroMolekula = {
      atomok:
        structuredClone(
          celMolekula.atomok
        ),

      kotesek:
        structuredClone(
          celMolekula.kotesek
        ),

      polimer:
        structuredClone(
          celMolekula.polimer ??
          null
        ),
    };

  if (leiras) {
    leiras.textContent =
      "Nevezd el a képen látható molekulát! Az IUPAC-név teljes pontot, egy helyes alternatív név eggyel kevesebb pontot ér.";
  }
} else {
    molekulaAllapot
    .nevadasraVaroMolekula = {
      atomok:
        structuredClone(
          molekulaAllapot.atomok
        ),

      kotesek:
        structuredClone(
          molekulaAllapot.kotesek
        ),

      polimer:
        structuredClone(
          molekulaAllapot
            .aktivPolimer ??
          null
        ),
    };

  if (leiras) {
    leiras.textContent =
      "A rendelést teljesítetted! A bónuszpontért nevezd el az elkészített molekulát.";
  }
}

nevadasMolekulaKirajzolasa(
  molekulaAllapot
    .nevadasraVaroMolekula.atomok,

  molekulaAllapot
    .nevadasraVaroMolekula.kotesek,

  null,

  molekulaAllapot
    .nevadasraVaroMolekula
    .polimer
);

  nevMezo.value = "";
    const ellenorzesGomb =
  document.getElementById(
    "nevadas-ellenorzes"
  );

if (ellenorzesGomb) {
  ellenorzesGomb.textContent =
    "Név ellenőrzése";
}

kihagyasMegerositesAlaphelyzet();
  visszajelzes.textContent = "";
  visszajelzes.className = "nevadas-visszajelzes";

  const erintosKeszulek =
  navigator.maxTouchPoints > 0 ||
  window.matchMedia(
    "(pointer: coarse)"
  ).matches;

/*
 * Érintős eszközön a mező az ablak megnyitásának
 * pillanatában ideiglenesen írásvédett.
 * Így a böngésző nem nyithatja meg automatikusan
 * a telefonos billentyűzetet.
 */
if (erintosKeszulek) {
  nevMezo.readOnly = true;

  nevMezo.setAttribute(
    "aria-readonly",
    "true"
  );
}

if (
  rendeles.feladatMod ===
  "elnevezes"
) {
  ablak.show();
} else {
  ablak.showModal();
}

if (erintosKeszulek) {
  nevMezo.blur();

  ablak.focus({
    preventScroll: true,
  });

  requestAnimationFrame(
    () => {
      nevMezo.readOnly = false;

      nevMezo.removeAttribute(
        "aria-readonly"
      );

      debug(
        "A névadási mező érintésre használható",
        {
          automatikusBillentyuzet:
            false,
        }
      );
    }
  );
} else {
  nevMezo.focus({
    preventScroll: true,
  });
}

const nevadasMeret =
  nevadasLathatoTeruletFrissitese();

debug(
  "A névadási ablak kezdeti fókusza beállítva",
  {
    erintosKeszulek,
    automatikusBillentyuzet:
      !erintosKeszulek,
    teljesKepernyo:
      Boolean(
        document.fullscreenElement
      ),
    ...nevadasMeret,
  }
);

  debug("A névadási ablak megnyílt.", {
    rendeles: rendeles.cim,
    alappont: rendeles.pont,
    atomok: molekulaAllapot.atomok.length,
    kotesek: molekulaAllapot.kotesek.length,
});
}

function nevadasAblakBezarasa() {
  const ablak = document.querySelector("#nevadas-ablak");

  if (ablak?.open) {
    ablak.close();
  }

  molekulaAllapot.nevadasraVaroMolekula = null;
  molekulaAllapot.nevadasraVaroRendeles = null;
  kihagyasMegerositesAlaphelyzet();
  debug("A névadási ablak bezárult.");
}

function rendelesBefejezese(
  helyesElnevezes,
  nevEredmeny = null
) {
  const rendeles =
    molekulaAllapot.nevadasraVaroRendeles;

  if (!rendeles) {
    console.error(
      "[HIBA] Nincs pontozásra váró rendelés."
    );
    return false;
  }

const alappont = rendeles.pont;

const elnevezesiFeladat =
  rendeles.feladatMod ===
  "elnevezes";

const iupacNev =
  helyesElnevezes &&
  nevEredmeny?.nevTipus ===
    "preferalt";

let bonuszpont = 0;
let kapottPont = 0;

if (elnevezesiFeladat) {
  if (helyesElnevezes) {
    kapottPont =
      iupacNev
        ? alappont
        : Math.max(
            0,
            alappont - 1
          );
  }
} else {
  bonuszpont =
  helyesElnevezes
    ? (
        iupacNev
          ? nevadasIupacBonuszPontja(
              rendeles
            )
          : nevadasAlternativBonuszPontja(
              rendeles
            )
      )
    : 0;

  kapottPont =
    alappont + bonuszpont;

  const molekulaFelhasznalva =
    teljesitettMolekulaFelhasznalasa();

  if (!molekulaFelhasznalva) {
    console.error(
      "[HIBA] A rendelés molekulája nem használható fel."
    );

    return false;
  }
}

pontokHozzaadasa(
  kapottPont,

  elnevezesiFeladat
    ? (
        helyesElnevezes
          ? `${rendeles.cim}: helyes elnevezés`
          : `${rendeles.cim}: kihagyva`
      )
    : (
        helyesElnevezes
          ? `${rendeles.cim}: alap- és névbónusz`
          : `${rendeles.cim}: alappont`
      )
);

  const eredmenyElem =
    document.getElementById(
      "ellenorzes-eredmeny"
    );

  if (eredmenyElem) {
    eredmenyElem.hidden = false;

    eredmenyElem.classList.remove(
      "hibas-ellenorzes"
    );

    eredmenyElem.classList.add(
      "sikeres-ellenorzes"
    );

    if (elnevezesiFeladat) {
  if (helyesElnevezes) {
    const nevUzenet =
      iupacNev
        ? `A „${nevEredmeny.elfogadottNev}” az IUPAC-név.`
        : `A „${nevEredmeny?.elfogadottNev}” helyes alternatív név. Az IUPAC-név: „${nevEredmeny?.preferaltNev}”.`;

    eredmenyElem.textContent =
      `Elnevezési feladat teljesítve: +${kapottPont} pont. ${nevUzenet}`;
  } else {
    eredmenyElem.textContent =
      "Elnevezési feladat kihagyva: +0 pont.";
  }
} else if (helyesElnevezes) {
  const nevUzenet =
    iupacNev
      ? `A „${nevEredmeny.elfogadottNev}” az IUPAC-név.`
      : `A „${nevEredmeny?.elfogadottNev}” helyes alternatív név. Az IUPAC-név: „${nevEredmeny?.preferaltNev}”.`;

  eredmenyElem.textContent =
    `Rendelés teljesítve: +${alappont} alappont és +${bonuszpont} névbónusz. ${nevUzenet}`;
} else {
  eredmenyElem.textContent =
    `Rendelés teljesítve: +${alappont} pont. A névbónuszt kihagytad.`;
}
  }

  debug("Rendelés befejezve", {
    rendeles: rendeles.cim,
    alappont,
    bonuszpont,
    kapottPont,
    teljesPontszam:
      molekulaAllapot.pontszam,
  });

  nevadasAblakBezarasa();

teljesitettRendelesCsereje(
  rendeles.id
);

return true;
}

function nevadasEllenorzese() {
  const nevMezo = document.querySelector("#molekula-nev");
  const visszajelzes = document.querySelector("#nevadas-visszajelzes");
  const molekula = molekulaAllapot.nevadasraVaroMolekula;

  if (!nevMezo || !visszajelzes || !molekula) {
    debug("HIBA: A név ellenőrzéséhez szükséges adat hiányzik.");
    return;
  }

  const beirtNev = nevMezo.value.trim();

  if (!beirtNev) {
    visszajelzes.textContent = "Először írj be egy nevet!";
    visszajelzes.className = "nevadas-visszajelzes hibas";
    debug("A névmező üres.");
    return;
  }

    const eredmeny =
    molekulaNevEllenorzese(
      molekula.atomok,
      molekula.kotesek,
      beirtNev,
      molekula.polimer ??
        null
    );

  debug("Névadás ellenőrzésének eredménye:", eredmeny);

  if (!eredmeny.felismerve) {
    visszajelzes.textContent =
      "Ez a molekula még nincs benne az ellenőrzött névtárban.";

    visszajelzes.className = "nevadas-visszajelzes hibas";
    return;
  }

  if (eredmeny.helyes) {
     debug("Helyes molekulanév", {
        elfogadottNev:
          eredmeny.elfogadottNev,
         });

        rendelesBefejezese(
  true,
  eredmeny
);
        return;
} else {
  visszajelzes.textContent =
    "A név nem helyes. Javítsd ki, majd próbáld újra!";

  visszajelzes.className =
    "nevadas-visszajelzes hibas";

  const ellenorzesGomb =
    document.getElementById(
      "nevadas-ellenorzes"
    );

  if (ellenorzesGomb) {
    ellenorzesGomb.textContent =
      "Újrapróbálkozás";
  }

  nevMezo.focus();
  nevMezo.select();

  debug("Helytelen molekulanév, újrapróbálkozás engedélyezve", {
    beirtNev,
  });
}
}

function feladatNevEllenorzese() {
  const nevMezo =
    document.getElementById(
      "feladat-molekula-nev"
    );

  const visszajelzes =
    document.getElementById(
      "feladat-nev-visszajelzes"
    );

  const ellenorzesGomb =
    document.getElementById(
      "feladat-nev-ellenorzes"
    );

  const rendeles =
    molekulaAllapot
      .nevadasraVaroRendeles;

  const molekula =
    molekulaAllapot
      .nevadasraVaroMolekula;

  if (
    !nevMezo ||
    !visszajelzes ||
    !rendeles ||
    !molekula ||
    rendeles.feladatMod !==
      "elnevezes"
  ) {
    console.error(
      "[HIBA] Az elnevezési feladat adatai hiányoznak."
    );

    return;
  }

  const beirtNev =
    nevMezo.value.trim();

  if (!beirtNev) {
    visszajelzes.textContent =
      "Először írj be egy nevet!";

    visszajelzes.className =
      "nevadas-visszajelzes hibas";

    nevMezo.focus();
    return;
  }

    const eredmeny =
    molekulaNevEllenorzese(
      molekula.atomok,
      molekula.kotesek,
      beirtNev,
      molekula.polimer ??
        null
    );

  debug(
    "Elnevezési feladat ellenőrzése",
    eredmeny
  );

  if (!eredmeny.felismerve) {
    visszajelzes.textContent =
      "Ez a molekula még nincs benne az ellenőrzött névtárban.";

    visszajelzes.className =
      "nevadas-visszajelzes hibas";

    return;
  }

  if (eredmeny.helyes) {
    rendelesBefejezese(
      true,
      eredmeny
    );

    return;
  }

  visszajelzes.textContent =
    "A név nem helyes. Javítsd ki, majd próbáld újra!";

  visszajelzes.className =
    "nevadas-visszajelzes hibas";

  if (ellenorzesGomb) {
    ellenorzesGomb.textContent =
      "Újrapróbálkozás";
  }

  nevMezo.focus();
  nevMezo.select();
}

let feladatKihagyasMegerositesId =
  null;

function feladatNevadasBekotese() {
  const urlap =
    document.getElementById(
      "feladat-nev-urlap"
    );

  if (!urlap) {
    console.error(
      "[HIBA] Az elnevezési feladat űrlapja hiányzik."
    );

    return;
  }

  urlap.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      feladatNevEllenorzese();
    }
  );

  debug(
    "Az elnevezési feladat kezelője bekötve."
  );
}

let kihagyasMegerositesId = null;

function kihagyasMegerositesAlaphelyzet() {
  if (kihagyasMegerositesId !== null) {
    clearTimeout(kihagyasMegerositesId);
    kihagyasMegerositesId = null;
  }

  const gomb =
    document.getElementById(
      "nevadas-kihagyas"
    );

  if (!gomb) {
    return;
  }

  gomb.textContent = "Kihagyás";

  gomb.classList.remove(
    "kihagyas-megerosites"
  );
}

function nevadasBekotese() {
  const urlap =
    document.querySelector(
      "#nevadas-urlap"
    );

  const kihagyasGomb =
    document.querySelector(
      "#nevadas-kihagyas"
    );

  const ablak =
    document.querySelector(
      "#nevadas-ablak"
    );

  urlap?.addEventListener(
    "submit",
    (event) => {
      event.preventDefault();
      nevadasEllenorzese();
    }
  );

  kihagyasGomb?.addEventListener(
    "click",
    () => {
      const megerositesAktiv =
        kihagyasGomb.classList.contains(
          "kihagyas-megerosites"
        );

      if (!megerositesAktiv) {
        kihagyasGomb.textContent =
          "Biztosan kihagyod?";

        kihagyasGomb.classList.add(
          "kihagyas-megerosites"
        );

        debug(
          "A névbónusz kihagyása megerősítésre vár."
        );

        kihagyasMegerositesId =
          window.setTimeout(() => {
            kihagyasMegerositesAlaphelyzet();

            debug(
              "A kihagyás megerősítése lejárt."
            );
          }, 4000);

        return;
      }

      kihagyasMegerositesAlaphelyzet();

      debug(
        "A játékos megerősítette az elnevezési bónusz kihagyását."
      );

      rendelesBefejezese(false);
    }
  );

  ablak?.addEventListener(
    "cancel",
    (event) => {
      event.preventDefault();
      kihagyasGomb?.click();
    }
  );
}

async function jatekInditasa() {
  debug(
    "A molekula-adatbázis betöltése elindult"
  );

  const adatbazisBetoltve =
    await molekulaNevtarBetolteseAdatbazisbol();

  /*
   * A rendelések csak az adatbázis
   * betöltése után készülhetnek el.
   */

  molekulaNevtarOnellenorzes();

  pontosMolekulaRendelesekLetrehozasa();
  rendelesPontokFrissitese();

  kezdoRendelesekKisorsolasa();
  rendelesekMegjelenitese();
  rendelesekBekotese();
  atomGombokBekotese();
  epitettAtomokMozgatasanakBekotese();
  kotesGombokBekotese();
  epitesTorlesGombBekotese();
  keszletMegjelenitesFrissitese();
  molekulaEllenorzesGombBekotese();
  rendelesLeadasGombBekotese();
  nevadasBekotese();
  feladatNevadasBekotese();
  pontszamMegjelenitesFrissitese();

  debug(
    "A program elindult",
    {
      molekulak:
        MOLEKULA_NEVTAR.length,

      adatforras:
        adatbazisBetoltve
          ? "Supabase"
          : "helyi tartalék",
    }
  );
}

let betoltesElrejtesId =
  null;

let molekulaFeluleteBekotve =
  false;

let molekulaJatekInditasaFolyamatban =
  false;


function betoltesUzenetFrissitese(
  uzenet
) {
  const uzenetElem =
    document.getElementById(
      "betoltes-uzenet"
    );

  if (uzenetElem) {
    uzenetElem.textContent =
      uzenet;
  }
}


function betoltesKepernyoMegjelenitese() {
  const kepernyo =
    document.getElementById(
      "betoltes-kepernyo"
    );

  if (!kepernyo) {
    return;
  }

  kepernyo.classList.remove(
  "inditasra-kesz"
);

const startGomb =
  document.getElementById(
    "jatek-tenyleges-inditasa"
  );

if (startGomb) {
  startGomb.hidden = true;
}

  if (
    betoltesElrejtesId !==
    null
  ) {
    window.clearTimeout(
      betoltesElrejtesId
    );

    betoltesElrejtesId =
      null;
  }

  kepernyo.hidden =
    false;

  kepernyo.classList.remove(
    "elrejtve"
  );

  kepernyo.setAttribute(
    "aria-busy",
    "true"
  );
}


function betoltesKepernyoElrejtese() {
  const kepernyo =
    document.getElementById(
      "betoltes-kepernyo"
    );

  if (!kepernyo) {
    return;
  }

  kepernyo.setAttribute(
    "aria-busy",
    "false"
  );

  kepernyo.classList.add(
    "elrejtve"
  );

  betoltesElrejtesId =
    window.setTimeout(
      () => {
        kepernyo.hidden =
          true;

        betoltesElrejtesId =
          null;
      },
      300
    );
}

async function jatekTeljesKepernyoEsFekvoModKeresese() {
  try {
    if (
      !document.fullscreenElement &&
      typeof document.documentElement
        .requestFullscreen === "function"
    ) {
      await document.documentElement
        .requestFullscreen();
    }
  } catch (hiba) {
    console.warn(
      "[TELJES KÉPERNYŐ] A böngésző nem engedélyezte.",
      hiba
    );
  }

  const erintosEszkoz =
    window.matchMedia(
      "(pointer: coarse)"
    ).matches;

  if (!erintosEszkoz) {
    return;
  }

  try {
    if (
      screen.orientation &&
      typeof screen.orientation.lock ===
        "function"
    ) {
      await screen.orientation.lock(
        "landscape"
      );
    }
  } catch (hiba) {
    console.warn(
      "[FEKVŐ MÓD] A böngésző nem engedélyezte az automatikus forgatást.",
      hiba
    );
  }
}

function jatekTenylegesInditasaraVarakozas() {
  const kepernyo =
    document.getElementById(
      "betoltes-kepernyo"
    );

  const startGomb =
    document.getElementById(
      "jatek-tenyleges-inditasa"
    );

  if (
    !kepernyo ||
    !startGomb
  ) {
    return Promise.resolve();
  }

  kepernyo.classList.add(
    "inditasra-kesz"
  );

  kepernyo.setAttribute(
    "aria-busy",
    "false"
  );

  startGomb.hidden = false;

  betoltesUzenetFrissitese(
    `${MOLEKULA_NEVTAR.length} molekula betöltve. A játék készen áll.`
  );

  return new Promise(
    (kesz) => {
      startGomb.addEventListener(
  "click",
  async () => {
    startGomb.disabled =
      true;

    await jatekTeljesKepernyoEsFekvoModKeresese();

    startGomb.hidden =
      true;

    startGomb.disabled =
      false;

    kepernyo.classList.remove(
      "inditasra-kesz"
    );

    kesz();
  },
  {
    once: true,
  }
);
    }
  );
}

const MOLEKULA_JATEK_IDOTARTAM =
  15 * 60;

let molekulaJatekIdozitoId =
  null;

let molekulaJatekVegeIdopont =
  null;

let molekulaJatekFut =
  false;


function molekulaJatekIdoMegjelenitese(
  masodperc
) {
  const idoElem =
    document.getElementById(
      "molekula-ido"
    );

  if (!idoElem) {
    return;
  }

  const biztonsagosMasodperc =
    Math.max(
      0,
      Math.floor(masodperc)
    );

  const perc =
    Math.floor(
      biztonsagosMasodperc /
        60
    );

  const maradekMasodperc =
    biztonsagosMasodperc %
    60;

  idoElem.textContent =
    `${perc}:${
      String(
        maradekMasodperc
      ).padStart(2, "0")
    }`;
}


function molekulaJatekIdozitoLeallitasa() {
  if (
    molekulaJatekIdozitoId !==
    null
  ) {
    window.clearInterval(
      molekulaJatekIdozitoId
    );

    molekulaJatekIdozitoId =
      null;
  }

  molekulaJatekVegeIdopont =
    null;

  molekulaJatekFut =
    false;
}


function molekulaJatekIdejeLejart() {
  molekulaJatekIdoMegjelenitese(
    0
  );

    tanuloJelenletLeallitasa();

  const pontszam =
    molekulaAllapot
      .pontszam ?? 0;

        tanoraiEredmenyKuldes(
    "befejezte"
  ).catch((hiba) => {
    console.error(
      "[TANÓRA] A végeredmény mentése sikertelen:",
      hiba
    );
  });

    window.alert(
    `Lejárt a játékidő!\n\nElért pontszám: ${pontszam}`
  );

  kepernyoValtas(
    "fomenu"
  );
}

function molekulaJatekIdozitoInditasa() {
  molekulaJatekIdozitoLeallitasa();

  molekulaJatekFut =
    true;

  const helyiVegeIdopont =
    Date.now() +
    MOLEKULA_JATEK_IDOTARTAM *
      1000;

  molekulaJatekVegeIdopont =
    Number.isFinite(
      tanoraiJatekVegeIdopont
    )
      ? tanoraiJatekVegeIdopont
      : helyiVegeIdopont;

  tanoraiJatekVegeIdopont =
    null;

  const kezdoHatralevoMasodperc =
    Math.max(
      0,
      Math.ceil(
        (
          molekulaJatekVegeIdopont -
          Date.now()
        ) /
        1000
      )
    );

  molekulaJatekIdoMegjelenitese(
    kezdoHatralevoMasodperc
  );

  function idoFrissitese() {
    if (
      !molekulaJatekFut ||
      molekulaJatekVegeIdopont ===
        null
    ) {
      return;
    }

    const hatralevoMasodperc =
      Math.max(
        0,
        Math.ceil(
          (
            molekulaJatekVegeIdopont -
            Date.now()
          ) /
          1000
        )
      );

    molekulaJatekIdoMegjelenitese(
      hatralevoMasodperc
    );

    if (
      hatralevoMasodperc <= 0
    ) {
      molekulaJatekIdozitoLeallitasa();
      molekulaJatekIdejeLejart();
    }
  }

  molekulaJatekIdozitoId =
    window.setInterval(
      idoFrissitese,
      250
    );
}

/*
 * A dinamikusan létrehozott molekulás
 * rendelések eltávolítása. A kézzel
 * készített szabályfeladatok a katalógusban
 * maradnak, a sorsolás viszont kihagyja őket.
 */

function molekulaRendelesekTorlese() {
  for (
    const [
      rendelesId,
      rendeles,
    ] of
    Object.entries(
      RENDELESEK
    )
  ) {
    const dinamikusRendeles =
      rendeles.tipus ===
        "pontos-molekula" ||
      rendeles.tipus ===
        "nevbol-epites";

    if (dinamikusRendeles) {
      delete RENDELESEK[
        rendelesId
      ];
    }
  }
}


/*
 * Ezeket az eseménykezelőket csak
 * egyszer szabad a felülethez kötni.
 */

function molekulaFeluletenekBekotese() {
  if (
    molekulaFeluleteBekotve
  ) {
    return;
  }

  atomGombokBekotese();
  epitoTeruletBekotese();
  epitettAtomokMozgatasanakBekotese();
  kotesGombokBekotese();
  epitesTorlesGombBekotese();
  molekulaEllenorzesGombBekotese();
  rendelesLeadasGombBekotese();
  nevadasBekotese();
  feladatNevadasBekotese();

  molekulaFeluleteBekotve =
    true;

  debug(
    "A molekulaépítő felülete bekötve"
  );
}


function ujMolekulaJatekAlaphelyzetbeAllitasa() {
  const elozoRendelesIds = [
    ...molekulaAllapot
      .aktivRendelesIds,
  ];

  teljesEpitesTorlese();
  epitesTorlesGombAlaphelyzet();
  lancKotesAlaphelyzet();

  const nevadasAblak =
    document.getElementById(
      "nevadas-ablak"
    );

  if (
    nevadasAblak?.open
  ) {
    nevadasAblak.close();
  }

  molekulaAllapot
    .aktivRendelesIds =
    [];

  molekulaAllapot
    .kovetkezoRendelesId =
    null;

  molekulaAllapot
    .kivalasztottRendelesId =
    null;

  molekulaAllapot
    .rendelesZsak =
    [];

  /*
   * Az előző játék három rendelése
   * lehetőleg ne jelenjen meg azonnal
   * újra, de később visszatérhet.
   */

  molekulaAllapot
    .legutobbiRendelesIds =
    elozoRendelesIds;

  molekulaAllapot
    .nevadasraVaroMolekula =
    null;

  molekulaAllapot
    .nevadasraVaroRendeles =
    null;

    molekulaAllapot
    .pontszam =
    0;

  molekulaAllapot
    .teljesitettRendelesek =
    0;

  pontszamMegjelenitesFrissitese();
  keszletMegjelenitesFrissitese();
}


async function molekulaJatekMegnyitasa(
  szurok = null,
  beallitasok = {}
) {
  if (
    molekulaJatekInditasaFolyamatban
  ) {
    return;
  }

  molekulaJatekInditasaFolyamatban =
    true;

  betoltesKepernyoMegjelenitese();

  betoltesUzenetFrissitese(
    "Új molekulák kiválasztása…"
  );

  try {
    const adatbazisBetoltve =
      await molekulaNevtarBetolteseAdatbazisbol(
  150,
  szurok
);

aktualisMolekulaSzuro = szurok;

    betoltesUzenetFrissitese(
      legutobbiAdatbazisBetoltes
        .importaltDarab > 0
        ? `${legutobbiAdatbazisBetoltes.importaltDarab} aktív molekula betöltve`
        : "A helyi molekulakészlet előkészítése…"
    );

    molekulaNevtarOnellenorzes();

    molekulaRendelesekTorlese();

    pontosMolekulaRendelesekLetrehozasa();
    rendelesPontokFrissitese();

    ujMolekulaJatekAlaphelyzetbeAllitasa();

    if (!kezdoRendelesekKisorsolasa()) {
  throw new Error(
    "Ehhez a nehézséghez és családválasztáshoz nincs elég feladat."
  );
}

rendelesekMegjelenitese();

    /*
     * A rendeléskártyák minden új
     * játékban új DOM-elemek, ezért
     * ezeket újra be kell kötni.
     */

    rendelesekBekotese();

    /*
     * A többi kezelőt csak egyszer
     * kötjük a változatlan felülethez.
     */

    molekulaFeluletenekBekotese();

    kepernyoValtas(
      "molekulaepito"
    );

    await new Promise(
      (kesz) => {
        requestAnimationFrame(
          () => {
            requestAnimationFrame(
              kesz
            );
          }
        );
      }
    );

    if (!beallitasok.azonnaliInditas) {
      await jatekTenylegesInditasaraVarakozas();
    }

molekulaJatekIdozitoInditasa();

betoltesKepernyoElrejtese();

debug(
  "Új molekulajáték elindult",
      {
        molekulak:
          MOLEKULA_NEVTAR.length,

        helyiMolekulak:
          HELYI_MOLEKULA_NEVTAR
            .length,

        importaltMolekulak:
          legutobbiAdatbazisBetoltes
            .importaltDarab,

        adatbazisElerheto:
          adatbazisBetoltve,
      }
    );
  } catch (hiba) {
    betoltesUzenetFrissitese(
  hiba instanceof Error
    ? hiba.message
    : "A játék indítása sikertelen."
);

    console.error(
      "[INDÍTÁSI HIBA] A játék nem tudott elindulni:",
      hiba
    );

    window.setTimeout(
      () => {
        betoltesKepernyoElrejtese();
      },
      1800
    );
  } finally {
    molekulaJatekInditasaFolyamatban =
      false;
  }
}


debug(
  "A főmenü elindult"
);

function betoltesKepernyoElrejtese() {
  const kepernyo =
    document.getElementById(
      "betoltes-kepernyo"
    );

  if (!kepernyo) {
    return;
  }

  kepernyo.setAttribute(
    "aria-busy",
    "false"
  );

  kepernyo.classList.add(
    "elrejtve"
  );

  setTimeout(
    () => {
      kepernyo.hidden =
        true;
    },
    300
  );
}


async function jatekInditasa() {
  betoltesUzenetFrissitese(
    "Molekulák betöltése…"
  );

  debug(
    "A molekula-adatbázis betöltése elindult"
  );

  const adatbazisBetoltve =
    await molekulaNevtarBetolteseAdatbazisbol();

  betoltesUzenetFrissitese(
    adatbazisBetoltve
      ? `${MOLEKULA_NEVTAR.length} molekula betöltve`
      : "A helyi molekulatár használata"
  );

  /*
   * A rendelések csak az adatbázis
   * betöltése után készülhetnek el.
   */

  molekulaNevtarOnellenorzes();

  pontosMolekulaRendelesekLetrehozasa();
  rendelesPontokFrissitese();

  kezdoRendelesekKisorsolasa();
  rendelesekMegjelenitese();
  rendelesekBekotese();
  atomGombokBekotese();
  epitettAtomokMozgatasanakBekotese();
  kotesGombokBekotese();
  epitesTorlesGombBekotese();
  keszletMegjelenitesFrissitese();
  molekulaEllenorzesGombBekotese();
  rendelesLeadasGombBekotese();
  nevadasBekotese();
  feladatNevadasBekotese();
  pontszamMegjelenitesFrissitese();

  /*
   * Megvárjuk, hogy a böngésző
   * kirajzolja a kész játékfelületet.
   */

  await new Promise(
    (kesz) => {
      requestAnimationFrame(
        () => {
          requestAnimationFrame(
            kesz
          );
        }
      );
    }
  );

  betoltesKepernyoElrejtese();

  debug(
    "A program elindult",
    {
      molekulak:
        MOLEKULA_NEVTAR.length,

      adatforras:
        adatbazisBetoltve
          ? "Supabase"
          : "helyi tartalék",
    }
  );
}
