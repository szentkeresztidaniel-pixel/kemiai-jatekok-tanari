export function molekulaMinositese(adat) {
  const atomok = adat?.atomok;
  const kotesek = adat?.kotesek;

  const elemek = new Set([
    "C", "N", "O", "F", "Si", "P", "S", "Cl", "Br", "I"
  ]);

  const kovetel = (ok, uzenet) => {
    if (!ok) throw new Error(uzenet);
  };

  kovetel(
    Array.isArray(atomok) &&
    atomok.length >= 1 && atomok.length <= 30 &&
    atomok.every(a => elemek.has(a)) &&
    Array.isArray(kotesek),
    "Hiányos vagy nem támogatott molekulaszerkezet."
  );

  const sz = atomok.map(() => []);
  const parok = new Set();

  const index = i =>
    Number.isInteger(i) && i >= 0 && i < atomok.length;

  for (const k of kotesek) {
    kovetel(
      Array.isArray(k) && k.length === 3 &&
      index(k[0]) && index(k[1]) &&
      k[0] !== k[1] &&
      [1, 2, 3].includes(k[2]),
      "Hibás kötésadat."
    );

    const [i, j, r] = k;
    const kulcs = [Math.min(i, j), Math.max(i, j)].join(":");

    kovetel(!parok.has(kulcs), "Ismétlődő kötésadat.");

    parok.add(kulcs);
    sz[i].push({ i: j, r });
    sz[j].push({ i, r });
  }

  const rend = i => sz[i].reduce((s, e) => s + e.r, 0);

  const maximum = {
    C: 4, N: 3, O: 2, F: 1, Si: 4,
    P: 5, S: 6, Cl: 1, Br: 1, I: 1
  };

  kovetel(
    atomok.every((a, i) => rend(i) <= maximum[a]),
    "Nem kezelhető vegyérték."
  );

  const bejart = new Set([0]);
  const sor = [0];

  for (let k = 0; k < sor.length; k++) {
    for (const e of sz[sor[k]]) {
      if (!bejart.has(e.i)) {
        bejart.add(e.i);
        sor.push(e.i);
      }
    }
  }

  kovetel(
    bejart.size === atomok.length,
    "A molekula nem összefüggő."
  );

  const gyurukSzama = kotesek.length - atomok.length + 1;
  const gyurus = gyurukSzama > 0;
  const aromasAtomok = new Set();

  function gyuruKereses(ut) {
    const elso = ut[0];
    const utolso = ut.at(-1);

    if (ut.length === 6) {
      const rendek = ut.map((i, k) =>
        sz[i].find(e => e.i === ut[(k + 1) % 6])?.r
      );

      if (rendek.every((r, k) =>
        [1, 2].includes(r) && r !== rendek[(k + 1) % 6]
      )) {
        ut.forEach(i => aromasAtomok.add(i));
      }

      return;
    }

    for (const e of sz[utolso]) {
      if (
        atomok[e.i] === "C" &&
        e.i > elso &&
        !ut.includes(e.i)
      ) {
        gyuruKereses([...ut, e.i]);
      }
    }
  }

  atomok.forEach((a, i) => {
    if (a === "C") gyuruKereses([i]);
  });

  const csaladok = new Set();
  const csoportok = [];
  const figyelmeztetesek = [];

  const hozzaad = (csalad, csoport) => {
    csaladok.add(csalad);
    if (csoport) csoportok.push(csoport);
  };

  const karbonil = new Set();

  atomok.forEach((a, i) => {
    if (
      a === "C" &&
      sz[i].some(e => atomok[e.i] === "O" && e.r === 2)
    ) {
      karbonil.add(i);
    }
  });

  const savOxigen = new Set();
  const eszterOxigen = new Set();
  const amidNitrogen = new Set();

  for (const i of karbonil) {
    const oxigenek = sz[i].filter(e =>
      atomok[e.i] === "O" && e.r === 1
    );

    const nitrogenek = sz[i].filter(e =>
      atomok[e.i] === "N" && e.r === 1
    );

    const sav = oxigenek.filter(e => sz[e.i].length === 1);

    const eszter = oxigenek.filter(e =>
      sz[e.i].length === 2 &&
      sz[e.i].every(v => atomok[v.i] === "C" && v.r === 1)
    );

    if (sav.length) {
      hozzaad("karbonsav", "karboxilcsoport");
      sav.forEach(e => savOxigen.add(e.i));
    }

    if (eszter.length) {
      hozzaad("eszter", "észtercsoport");
      eszter.forEach(e => eszterOxigen.add(e.i));
    }

    if (nitrogenek.length) {
      hozzaad("amid", "amidcsoport");
      nitrogenek.forEach(e => amidNitrogen.add(e.i));
    }

    if (oxigenek.length || nitrogenek.length) {
      if (oxigenek.length + nitrogenek.length > 1) {
        figyelmeztetesek.push(
          "Összetett karbonsavszármazék: ellenőrizd a családokat."
        );
      }

      continue;
    }

    const csakSzenEsOxigen = sz[i].every(e =>
      atomok[e.i] === "C" ||
      (atomok[e.i] === "O" && e.r === 2)
    );

    const szenek = sz[i].filter(e =>
      atomok[e.i] === "C" && e.r === 1
    ).length;

    if (csakSzenEsOxigen && szenek === 2) {
      hozzaad("keton", "ketocsoport");
    } else if (csakSzenEsOxigen && rend(i) < 4) {
      hozzaad("aldehid", "aldehidcsoport");
    } else {
      figyelmeztetesek.push(
        "Különleges karbonilcsoport: kézi besorolás szükséges."
      );
    }
  }

  let alkoholOH = 0;

  atomok.forEach((a, i) => {
    if (a !== "O" || !sz[i].every(e => e.r === 1)) return;

    if (
      sz[i].length === 1 &&
      atomok[sz[i][0].i] === "C" &&
      !savOxigen.has(i)
    ) {
      const c = sz[i][0].i;

      if (karbonil.has(c)) return;

      if (aromasAtomok.has(c)) {
        hozzaad("fenol", "fenolos hidroxilcsoport");
      } else if (sz[c].every(e => e.r === 1)) {
        hozzaad("alkohol", "hidroxilcsoport");
        alkoholOH++;
      } else {
        figyelmeztetesek.push(
          "Telítetlen szénhez kapcsolódó OH-csoport: kézi besorolás szükséges."
        );
      }
    }

    if (
      sz[i].length === 2 &&
      sz[i].every(e => atomok[e.i] === "C") &&
      !eszterOxigen.has(i) &&
      !sz[i].some(e => karbonil.has(e.i))
    ) {
      hozzaad("eter", "étercsoport");
    }
  });

  let kettos = 0;

  for (const [i, j, r] of kotesek) {
    if (atomok[i] === "C" && atomok[j] === "C") {
      if (
        r === 2 &&
        !(aromasAtomok.has(i) && aromasAtomok.has(j))
      ) {
        hozzaad("alken", "szén-szén kettős kötés");
        kettos++;
      }

      if (r === 3) {
        hozzaad("alkin", "szén-szén hármas kötés");
      }
    }

    if (
      r === 3 &&
      [atomok[i], atomok[j]].sort().join("") === "CN"
    ) {
      hozzaad("nitril", "nitrilcsoport");
    }
  }

  const halogen = {
    F: "fluor", Cl: "klór", Br: "bróm", I: "jód"
  };

  function gyurubenVan(i) {
    if (sz[i].length < 2) return false;

    const celok = new Set(sz[i].slice(1).map(e => e.i));
    const sor = [sz[i][0].i];
    const latott = new Set([i, sor[0]]);

    for (let k = 0; k < sor.length; k++) {
      for (const e of sz[sor[k]]) {
        if (celok.has(e.i)) return true;

        if (!latott.has(e.i)) {
          latott.add(e.i);
          sor.push(e.i);
        }
      }
    }

    return false;
  }

  atomok.forEach((a, i) => {
    if (
      a === "N" &&
      sz[i].length > 0 &&
      !amidNitrogen.has(i) &&
      sz[i].every(e => e.r === 1 && atomok[e.i] === "C") &&
      !(
        gyurubenVan(i) &&
        sz[i].some(e => sz[e.i].some(v => v.r > 1))
      )
    ) {
      hozzaad("amin", "aminocsoport");
    }

    if (
      halogen[a] &&
      sz[i].some(e => atomok[e.i] === "C")
    ) {
      hozzaad("halogenezett", halogen[a] + "szubsztituens");
    }
  });

  if (aromasAtomok.size) hozzaad("aromas");

  if (gyurus) {
    hozzaad("gyurus");
  } else {
    hozzaad("nyilt-lancu");
  }

  if (atomok.every(a => a === "C")) {
    if (!gyurus && !kotesek.some(k => k[2] > 1)) {
      hozzaad("alkan");
    }

    if (
      aromasAtomok.size &&
      atomok.length > aromasAtomok.size
    ) {
      hozzaad("alkilbenzol");
    }
  }

  const elagazasok = atomok.filter((a, i) =>
    a === "C" &&
    !aromasAtomok.has(i) &&
    sz[i].filter(e => atomok[e.i] === "C").length >= 3
  ).length;

  if (elagazasok) hozzaad("elagazo");

  for (const [alap, osszetett] of [
    ["aldehid", "hidroxi-aldehid"],
    ["keton", "hidroxi-keton"],
    ["karbonsav", "hidroxi-karbonsav"],
    ["eszter", "hidroxi-eszter"]
  ]) {
    if (csaladok.has("alkohol") && csaladok.has(alap)) {
      hozzaad(osszetett);
    }
  }

  if (csaladok.has("keton") || csaladok.has("aldehid")) {
    if (csaladok.has("eszter")) hozzaad("oxo-eszter");
    if (csaladok.has("karbonsav")) hozzaad("oxokarbonsav");
  }

  if (alkoholOH === 2) hozzaad("diol");
  if (alkoholOH === 3) hozzaad("triol");
  if (alkoholOH > 3) hozzaad("poliol");
  if (kettos === 2) hozzaad("dien");

  if (atomok.some(a => ["S", "P", "Si"].includes(a))) {
    figyelmeztetesek.push(
      "A kén-, foszfor- és szilíciumtartalmú csoportokat kézzel kell besorolni."
    );
  }

  if (atomok.includes("N") || gyurukSzama > 1) {
    figyelmeztetesek.push(
      "A nitrogéntartalmú és a többgyűrűs rendszerek családjavaslatai külön ellenőrzést igényelnek."
    );
  }

  const centrumok = adat.sztereokemia?.kiralisCentrumok ?? [];
  const ez = adat.sztereokemia?.kettosKotesek ?? [];

  kovetel(
    Array.isArray(centrumok) && Array.isArray(ez),
    "Hibás sztereokémiai lista."
  );

  const kiralisCentrumDarab = centrumok.length;
  const sztereoKettosKotesDarab = ez.length;

  if (kiralisCentrumDarab) {
    hozzaad("R-S");
    hozzaad("enantiomer");
    hozzaad("sztereoizomer");
  }

  if (sztereoKettosKotesDarab) {
    hozzaad("E-Z");
    hozzaad("sztereoizomer");
  }

  if (sztereoKettosKotesDarab >= 2) hozzaad("tobb-E-Z");

  const funkciosCsoportok = [...new Set(csoportok)];

  const vanSztereo =
    kiralisCentrumDarab ||
    sztereoKettosKotesDarab ||
    adat.importAdatok?.pubchemSztereo?.length;

  const nehezsegiPont =
    Number(atomok.length >= 6) +
    Number(atomok.length >= 10) +
    Number(elagazasok >= 1) +
    Number(elagazasok >= 2) +
    Number(funkciosCsoportok.length >= 2) +
    Number(gyurus) +
    (vanSztereo ? 2 : 0);

  return {
    csaladok: [...csaladok],
    funkciosCsoportok,
    nehezseg: nehezsegiPont <= 1 ? 1 : nehezsegiPont <= 4 ? 2 : 3,
    nehezsegiPont,
    nehezatomDarab: atomok.length,
    elagazasok,
    gyurus,
    kiralisCentrumDarab,
    sztereoKettosKotesDarab,
    figyelmeztetesek: [...new Set(figyelmeztetesek)],
    automatikusanJovahagyhato: false,
    indok:
      "A családok és a nehézség gépi javaslatok; a név, a szerkezet és a sztereokémia kézi ellenőrzést igényel."
  };
}