import { negySzomszedosKonfiguracio } from "./sztereo-tergeometria.mjs";
import { sztereoForrasKovetelmenyek } from "./sztereo-adatok.mjs";

// Óvatos CIP-1a feldolgozás. Ha a rendszám szerinti összehasonlítás
// nem dönt, a program nem találgat izotóp-, pszeudoaszimmetria- vagy
// összetett gyűrűszabályokkal. A hiányzó sor ellenőrzendő marad.
const ELEMEK = "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og".split(" ");

const kovetel = (ok, s) => {
  if (!ok) throw new Error(s);
};

const par = (i, j) =>
  [Math.min(i, j), Math.max(i, j)].join(":");

const kereszt = (a, b) => a.x * b.y - a.y * b.x;

const vektor = (p, q) => ({
  x: q.x - p.x,
  y: q.y - p.y
});

function forrasGraf(a, nyers) {
  const pc = nyers?.PC_Compounds?.[0];
  const aid = pc?.atoms?.aid;
  const z = pc?.atoms?.element;

  kovetel(
    Array.isArray(aid) &&
    Array.isArray(z) &&
    aid.length === z.length &&
    aid.length > 0 &&
    aid.length <= 1000 &&
    new Set(aid).size === aid.length &&
    aid.every(i => Number.isSafeInteger(i) && i > 0) &&
    z.every(i => Number.isInteger(i) && i >= 1 && i <= 118),
    "Hiányos vagy túl nagy PubChem-atomszerkezet."
  );

  for (const k of ["isotope", "radical", "label"]) {
    kovetel(
      !pc.atoms[k]?.length,
      "Az izotóp-, gyök- vagy különleges atomjelölés kézi ellenőrzést igényel."
    );
  }

  kovetel(
    !(pc.atoms.charge ?? []).some(x => x.value !== 0),
    "A töltött atomokat tartalmazó szerkezet kézi ellenőrzést igényel."
  );

  const index = new Map(aid.map((v, i) => [v, i]));
  const nehezek = aid.map((_, i) => i).filter(i => z[i] !== 1);
  const jatekIndex = new Map(nehezek.map((v, i) => [v, i]));

  kovetel(
    nehezek.length === a.atomok?.length &&
    nehezek.every((v, i) => ELEMEK[z[v] - 1] === a.atomok[i]),
    "A forrás atomjai nem feleltethetők meg a játék atomjainak."
  );

  const b = pc.bonds ?? { aid1: [], aid2: [], order: [] };

  kovetel(
    Array.isArray(b.aid1) &&
    Array.isArray(b.aid2) &&
    Array.isArray(b.order) &&
    b.aid1.length === b.aid2.length &&
    b.aid1.length === b.order.length &&
    b.order.length <= 3000,
    "Hiányos PubChem-kötéslista."
  );

  const sz = aid.map(() => []);
  const parok = new Set();
  const nehezKotesek = [];

  b.aid1.forEach((v, k) => {
    const i = index.get(v);
    const j = index.get(b.aid2[k]);
    const r = b.order[k];

    kovetel(
      i !== undefined &&
      j !== undefined &&
      i !== j &&
      [1, 2, 3].includes(r) &&
      !parok.has(par(i, j)),
      "Hibás vagy ismétlődő PubChem-kötés."
    );

    parok.add(par(i, j));
    sz[i].push({ i: j, r });
    sz[j].push({ i, r });

    if (jatekIndex.has(i) && jatekIndex.has(j)) {
      nehezKotesek.push(
        par(jatekIndex.get(i), jatekIndex.get(j)) + ":" + r
      );
    }
  });

  const jatekKotesek = (a.kotesek ?? []).map(
    ([i, j, r = 1]) => par(i, j) + ":" + r
  );

  kovetel(
    nehezKotesek.sort().join(";") === jatekKotesek.sort().join(";"),
    "A játék kötései eltérnek a PubChem-forrástól."
  );

  kovetel(
    aid.every((_, i) =>
      z[i] !== 1 || (sz[i].length === 1 && sz[i][0].r === 1)
    ),
    "Hiányos hidrogénkötések a forrásban."
  );

  const erkezes = aid.map(() => -1);
  const also = aid.map(() => -1);
  const hidak = new Set();
  let ora = 0;

  function bejar(i, szulo) {
    erkezes[i] = also[i] = ora++;

    for (const e of sz[i]) {
      if (e.i === szulo) continue;

      if (erkezes[e.i] < 0) {
        bejar(e.i, i);
        also[i] = Math.min(also[i], also[e.i]);

        if (also[e.i] > erkezes[i]) {
          hidak.add(par(i, e.i));
        }
      } else {
        also[i] = Math.min(also[i], erkezes[e.i]);
      }
    }
  }

  aid.forEach((_, i) => {
    if (erkezes[i] < 0) bejar(i, -1);
  });

  const gyuru = new Map();
  const latott = new Set();

  for (let kezdet = 0; kezdet < aid.length; kezdet++) {
    if (latott.has(kezdet)) continue;

    const csoport = [kezdet];
    latott.add(kezdet);

    for (let k = 0; k < csoport.length; k++) {
      for (const e of sz[csoport[k]]) {
        if (
          !hidak.has(par(csoport[k], e.i)) &&
          !latott.has(e.i)
        ) {
          latott.add(e.i);
          csoport.push(e.i);
        }
      }
    }

    const tobbszoros = csoport.some(i =>
      sz[i].some(e => !hidak.has(par(i, e.i)) && e.r > 1)
    );

    if (tobbszoros) {
      for (const i of csoport) {
        gyuru.set(i, csoport.some(j => z[j] !== 6) ? 1 : 2);
      }
    }
  }

  return { pc, aid, z, index, nehezek, jatekIndex, sz, gyuru };
}

function forrasRajz(a, g) {
  const c = g.pc.coords?.find(v => v.type?.includes(1));
  const p = c?.conformers?.[0];

  kovetel(
    Array.isArray(c?.aid) &&
    new Set(c.aid).size === c.aid.length &&
    Array.isArray(p?.x) &&
    Array.isArray(p?.y) &&
    p.x.length === c.aid.length &&
    p.y.length === c.aid.length,
    "A forrásból hiányzik az egyértelmű kétdimenziós rajz."
  );

  const pont = new Map(
    c.aid.map((v, i) => [v, { x: p.x[i], y: -p.y[i] }])
  );

  const eredeti = g.nehezek.map(i => pont.get(g.aid[i]));
  const aktualis = a.elozetPoziciok;

  kovetel(
    Array.isArray(aktualis) &&
    aktualis.length === eredeti.length &&
    [...eredeti, ...aktualis].every(v =>
      Number.isFinite(v?.x) && Number.isFinite(v?.y)
    ),
    "Hiányzó atompozíciók."
  );

  const atlag = (lista, k) =>
    lista.reduce((s, v) => s + v[k], 0) / lista.length;

  const ex = atlag(eredeti, "x");
  const ey = atlag(eredeti, "y");
  const ax = atlag(aktualis, "x");
  const ay = atlag(aktualis, "y");

  let fent = 0;
  let lent = 0;

  eredeti.forEach((v, i) => {
    fent +=
      (v.x - ex) * (aktualis[i].x - ax) +
      (v.y - ey) * (aktualis[i].y - ay);

    lent += (v.x - ex) ** 2 + (v.y - ey) ** 2;
  });

  const skala = fent / lent;

  kovetel(
    Number.isFinite(skala) &&
    skala > 0 &&
    eredeti.every((v, i) =>
      Math.abs((v.x - ex) * skala + ax - aktualis[i].x) < 0.2 &&
      Math.abs((v.y - ey) * skala + ay - aktualis[i].y) < 0.2
    ),
    "A rajz koordinátái megváltoztak a PubChem-forráshoz képest."
  );

  const stilus = p.style ?? {
    aid1: [],
    aid2: [],
    annotation: []
  };

  kovetel(
    Array.isArray(stilus.aid1) &&
    Array.isArray(stilus.aid2) &&
    Array.isArray(stilus.annotation) &&
    stilus.aid1.length === stilus.aid2.length &&
    stilus.aid1.length === stilus.annotation.length,
    "Hibás forrás-ékkötéslista."
  );

  return stilus.aid1.flatMap((v, i) => {
    if (![5, 6].includes(stilus.annotation[i])) return [];

    const atomIndex = g.jatekIndex.get(g.index.get(v));
    const kiemeltAtomIndex = g.jatekIndex.get(
      g.index.get(stilus.aid2[i])
    );

    kovetel(
      atomIndex !== undefined && kiemeltAtomIndex !== undefined,
      "A forrás egyik ékkötése nem jeleníthető meg a játékban."
    );

    return [{
      atomIndex,
      kiemeltAtomIndex,
      elozetIrany: stilus.annotation[i] === 5 ? "elo" : "hatra"
    }];
  });
}

function cipOsszehasonlito(g) {
  let lepes = 0;

  const osszevet = (a, b) => {
    for (let d = 0; d < a.length; d++) {
      for (let k = 0; k < a[d].length; k++) {
        if (a[d][k] !== b[d][k]) {
          return Math.sign(a[d][k] - b[d][k]);
        }
      }
    }

    return 0;
  };

  function fa(i, elozo, ut, melyseg, masolat = false) {
    kovetel(
      ++lepes <= 200000,
      "A CIP-összehasonlítás túl összetett; kézi ellenőrzés szükséges."
    );

    const szintek = [[g.z[i]]];
    if (!melyseg) return szintek;

    kovetel(
      masolat ||
      !g.gyuru.has(i) ||
      melyseg < g.gyuru.get(i),
      "Az összetett telítetlen gyűrű prioritási sorrendje kézi ellenőrzést igényel."
    );

    const gyerekek = [];

    if (!masolat && g.z[i] !== 1) {
      for (const e of g.sz[i]) {
        if (e.i !== elozo) {
          gyerekek.push(
            fa(e.i, i, [...ut, i], melyseg - 1, ut.includes(e.i))
          );
        }

        for (let k = 1; k < e.r; k++) {
          gyerekek.push(
            fa(e.i, i, [], melyseg - 1, true)
          );
        }
      }
    }

    kovetel(
      gyerekek.length <= 3,
      "A különleges vegyértékű atom kézi ellenőrzést igényel."
    );

    const ures = Array.from(
      { length: melyseg },
      (_, d) => Array(3 ** d).fill(0)
    );

    while (gyerekek.length < 3) {
      gyerekek.push(ures);
    }

    gyerekek.sort((a, b) => -osszevet(a, b));

    for (let d = 0; d < melyseg; d++) {
      szintek.push(gyerekek.flatMap(v => v[d]));
    }

    return szintek;
  }

  return (centrum, i, j) => {
    for (let d = 0; d <= 6; d++) {
      const kulonbseg = osszevet(
        fa(i, centrum, [centrum], d),
        fa(j, centrum, [centrum], d)
      );

      if (kulonbseg) return kulonbseg;
    }

    throw new Error(
      "A CIP-prioritások nem különíthetők el biztonságosan; kézi ellenőrzés szükséges."
    );
  };
}

export function sztereoAutomatikusJavaslat(a, nyers) {
  const sztereokemia = {
    statusz: "ellenorizendo",
    kiralisCentrumok: [],
    kettosKotesek: []
  };

  const figyelmeztetesek = [];

  try {
    const g = forrasGraf(a, nyers);
    const forras = sztereoForrasKovetelmenyek(a, nyers);
    const ekek = forrasRajz(a, g);
    const cip = cipOsszehasonlito(g);
    const sztereo = g.pc.stereo ?? [];

    for (const v of sztereo) {
      const t = v.tetrahedral;
      const p = v.planar;

      if (
        t &&
        (t.type ?? 1) === 1 &&
        [1, 2].includes(t.parity)
      ) {
        const i = g.index.get(t.center);
        const atomIndex = g.jatekIndex.get(i);

        try {
          kovetel(
  atomIndex !== undefined &&
  g.z[i] === 6 &&
  g.sz[i].length === 4 &&
  g.sz[i].every(e => e.r === 1) &&
  [0, 1].includes(
    g.sz[i].filter(e => g.z[e.i] === 1).length
  ),
  "Három vagy négy nehéz szomszédot tartalmazó tetraéderes széncentrum szükséges."
);

          const szomszedok = g.sz[i]
            .filter(e => g.z[e.i] !== 1)
            .map(e => e.i);

          szomszedok.sort((u, w) => -cip(i, u, w));

          const prioritasIndexek = szomszedok.map(
            u => g.jatekIndex.get(u)
          );

          const erintett = ekek.filter(e =>
            e.atomIndex === atomIndex ||
            e.kiemeltAtomIndex === atomIndex
          );

          kovetel(
            erintett.length === 1 &&
            erintett[0].atomIndex === atomIndex &&
            prioritasIndexek.includes(erintett[0].kiemeltAtomIndex),
            "Nem található egyetlen, egyértelmű, kifelé induló forrás-ékkötés."
          );

          let konfiguracio;

if (prioritasIndexek.length === 4) {
  konfiguracio = negySzomszedosKonfiguracio(
    prioritasIndexek.map(j => a.elozetPoziciok[j]),
    prioritasIndexek.indexOf(erintett[0].kiemeltAtomIndex),
    erintett[0].elozetIrany
  );

  kovetel(
    konfiguracio !== null,
    "A négy szomszéd térbeli helyzete nem olvasható le egyértelműen."
  );
} else {
  const pont = a.elozetPoziciok[atomIndex];

  const [u, w, q] = prioritasIndexek.map(
    j => vektor(pont, a.elozetPoziciok[j])
  );

  const teruletek = [
    kereszt(u, w),
    kereszt(w, q),
    kereszt(q, u)
  ];

  kovetel(
    teruletek.every(n =>
      Number.isFinite(n) && Math.abs(n) >= 1
    ) &&
    teruletek.every(n =>
      Math.sign(n) === Math.sign(teruletek[0])
    ),
    "A rajz térbeli helyzete nem olvasható le egyértelműen."
  );

  const elo = erintett[0].elozetIrany === "elo";
  konfiguracio = (teruletek[0] > 0) === elo ? "R" : "S";
}

          sztereokemia.kiralisCentrumok.push({
            atomIndex,
            konfiguracio,
            prioritasIndexek,
            kiemeltAtomIndex: erintett[0].kiemeltAtomIndex
          });
        } catch (e) {
          figyelmeztetesek.push(
            "R/S, " +
            (
              atomIndex === undefined
                ? "ismeretlen atom"
                : (atomIndex + 1) + ". atom"
            ) +
            ": " + e.message
          );
        }
      } else if (
        p &&
        (p.type ?? 1) === 1 &&
        [1, 2].includes(p.parity)
      ) {
        try {
          const i = g.index.get(p.left);
          const j = g.index.get(p.right);

          kovetel(
            i !== undefined &&
            j !== undefined &&
            g.z[i] === 6 &&
            g.z[j] === 6 &&
            g.sz[i].some(e => e.i === j && e.r === 2),
            "Nem kezelhető kettős kötés."
          );

          function nagyobb(c, masik) {
            const sz = g.sz[c].filter(e => e.i !== masik);

            kovetel(
              sz.length === 2 && sz.every(e => e.r === 1),
              "Hiányos C=C-szomszédság."
            );

            return cip(c, sz[0].i, sz[1].i) > 0
              ? sz[0].i
              : sz[1].i;
          }

          const atom1Index = g.jatekIndex.get(i);
          const atom2Index = g.jatekIndex.get(j);

          const elsoPrioritasIndex = g.jatekIndex.get(
            nagyobb(i, j)
          );

          const masodikPrioritasIndex = g.jatekIndex.get(
            nagyobb(j, i)
          );

          kovetel(
            [
              atom1Index,
              atom2Index,
              elsoPrioritasIndex,
              masodikPrioritasIndex
            ].every(Number.isInteger),
            "A prioritásos szomszéd nem jeleníthető meg."
          );

          const [u, w, s, t] = [
            atom1Index,
            atom2Index,
            elsoPrioritasIndex,
            masodikPrioritasIndex
          ].map(k => a.elozetPoziciok[k]);

          const tengely = vektor(u, w);
          const x = kereszt(tengely, vektor(u, s));
          const y = kereszt(tengely, vektor(w, t));

          kovetel(
            Math.abs(x) >= 1 && Math.abs(y) >= 1,
            "Nem egyértelmű E/Z-rajz."
          );

          sztereokemia.kettosKotesek.push({
            atom1Index,
            atom2Index,
            konfiguracio: Math.sign(x) === Math.sign(y) ? "Z" : "E",
            elsoPrioritasIndex,
            masodikPrioritasIndex
          });
        } catch (e) {
          figyelmeztetesek.push("E/Z: " + e.message);
        }
      } else if (t || p) {
        const n = t
          ? g.jatekIndex.get(g.index.get(t.center))
          : undefined;

        figyelmeztetesek.push(
          "A forrás " +
          (n === undefined ? "egy" : (n + 1) + ". atomhoz tartozó") +
          " térszerkezeti jelölése nem meghatározott vagy jelenleg nem kezelhető. Nem rendeltem hozzá konfigurációt."
        );
      } else {
        figyelmeztetesek.push(
          "A forrásban különleges sztereogén elem található."
        );
      }
    }

    const rs = new Set(
      sztereokemia.kiralisCentrumok.map(c => c.atomIndex)
    );

    const ez = new Set(
      sztereokemia.kettosKotesek.map(
        k => par(k.atom1Index, k.atom2Index)
      )
    );

    if (
      forras.nemKezelt.length ||
      forras.rs.some(i => !rs.has(i)) ||
      forras.ez.some(k => !ez.has(k))
    ) {
      figyelmeztetesek.push(
        "A forrás egyes meghatározott térszerkezeti adatai további ellenőrzést igényelnek."
      );
    }

    if (!figyelmeztetesek.length) {
      sztereokemia.statusz =
        rs.size + ez.size ? "meghatarozott" : "nincs";
    }
  } catch (e) {
    figyelmeztetesek.push(e.message);
  }

  return {
    sztereokemia,
    figyelmeztetesek: [...new Set(figyelmeztetesek)]
  };
}