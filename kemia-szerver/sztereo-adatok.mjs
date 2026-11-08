import { negySzomszedosKonfiguracio } from "./sztereo-tergeometria.mjs";
import { createHash } from "node:crypto";

const hiba = (statusz, szoveg) =>
  Object.assign(new Error(szoveg), { statusz });

const kovetel = (ok, s) => {
  if (!ok) throw hiba(400, s);
};

const objektum = v =>
  v !== null && typeof v === "object" && !Array.isArray(v);

export const SZTEREO_STATUSZOK = [
  "ellenorizendo", "meghatarozott", "nincs", "nincs-eloiras"
];

export function sztereoLenyomat(a) {
  return createHash("sha256").update(JSON.stringify([
    a.atomok, a.kotesek, a.elozetPoziciok, a.sztereokemia
  ])).digest("hex");
}

export function sztereoForrasKovetelmenyek(a, nyers) {
  const pc = nyers?.PC_Compounds?.[0];

  const jel = "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og".split(" ");

  const aid = pc?.atoms?.aid;
  const elemek = pc?.atoms?.element;

  const nehezek =
    Array.isArray(aid) &&
    Array.isArray(elemek) &&
    aid.length === elemek.length
      ? aid.map((v, i) => ({
          aid: v,
          elem: jel[elemek[i] - 1]
        })).filter(x => x.elem !== "H")
      : [];

  let ervenyes =
    nehezek.length === a.atomok.length &&
    new Set(nehezek.map(x => x.aid)).size === nehezek.length &&
    nehezek.every((x, i) =>
      Number.isInteger(x.aid) &&
      x.aid > 0 &&
      x.elem === a.atomok[i]
    );

  const terkep = new Map(
    nehezek.map((x, i) => [x.aid, i])
  );

  if (ervenyes) {
    const b = pc.bonds ?? { aid1: [], aid2: [], order: [] };

    ervenyes =
      Array.isArray(b.aid1) &&
      Array.isArray(b.aid2) &&
      Array.isArray(b.order) &&
      b.aid1.length === b.aid2.length &&
      b.aid1.length === b.order.length;

    if (ervenyes) {
      const rendez = k => k.map(([i, j, r = 1]) =>
        [Math.min(i, j), Math.max(i, j), r].join(":")
      ).sort().join(";");

      const nyersKotesek = b.aid1.map((v, i) => [
        terkep.get(v),
        terkep.get(b.aid2[i]),
        b.order[i]
      ]).filter(k =>
        k[0] !== undefined && k[1] !== undefined
      );

      ervenyes =
        Array.isArray(a.kotesek) &&
        rendez(nyersKotesek) === rendez(a.kotesek);
    }
  }

  const forras = Array.isArray(pc?.stereo)
    ? pc.stereo
    : (a.importAdatok?.pubchemSztereo ?? []);

  const rs = new Set();
  const ez = new Set();
  const nemKezelt = [];
  let ismeretlen = 0;

  for (const v of forras) {
    const t = v.tetrahedral;
    const p = v.planar;

    if (t && [1, 2].includes(t.parity)) {
      if (
        (t.type ?? 1) !== 1 ||
        !ervenyes ||
        !terkep.has(t.center)
      ) {
        nemKezelt.push("R/S-centrum");
      } else {
        rs.add(terkep.get(t.center));
      }
    } else if (p && [1, 2].includes(p.parity)) {
      if (
        (p.type ?? 1) !== 1 ||
        !ervenyes ||
        !terkep.has(p.left) ||
        !terkep.has(p.right)
      ) {
        nemKezelt.push("E/Z-kötés");
      } else {
        ez.add([
          terkep.get(p.left),
          terkep.get(p.right)
        ].sort((x, y) => x - y).join(":"));
      }
    } else if (t || p) {
      ismeretlen++;
    } else {
      nemKezelt.push("egyéb sztereogén elem");
    }
  }

  const ekek =
    a.importAdatok?.eredetiPubchemEkKotesek ??
    a.importAdatok?.pubchemEkKotesek ??
    [];

  for (const e of ekek) {
    if (
      Number.isInteger(e.atomIndex) &&
      ["elo", "hatra"].includes(e.elozetIrany)
    ) {
      rs.add(e.atomIndex);
    }
  }

  return {
    rs: [...rs].sort((x, y) => x - y),
    ez: [...ez].sort(),
    ismeretlen,
    nemKezelt
  };
}

export function sztereoUrlap(a) {
  const s = a.sztereokemia ?? {};

  return {
    statusz: SZTEREO_STATUSZOK.includes(s.statusz)
      ? s.statusz
      : "ellenorizendo",

    kiralisCentrumok: Array.isArray(s.kiralisCentrumok)
      ? s.kiralisCentrumok.map(c => ({
          atomIndex: c.atomIndex,
          konfiguracio: c.konfiguracio,
          prioritasIndexek: c.prioritasIndexek,
          kiemeltAtomIndex: c.kiemeltAtomIndex
        }))
      : [],

    kettosKotesek: Array.isArray(s.kettosKotesek)
      ? s.kettosKotesek.map(k => ({
          atom1Index: k.atom1Index,
          atom2Index: k.atom2Index,
          konfiguracio: k.konfiguracio,
          elsoPrioritasIndex: k.elsoPrioritasIndex,
          masodikPrioritasIndex: k.masodikPrioritasIndex
        }))
      : []
  };
}

function mezok(v, nevek) {
  kovetel(
    objektum(v) &&
    Object.keys(v).length === nevek.length &&
    nevek.every(k => Object.hasOwn(v, k)),
    "Hiányzó vagy ismeretlen sztereokémiai mező."
  );
}

function graf(a) {
  kovetel(
    Array.isArray(a.atomok) &&
    a.atomok.length > 0 &&
    a.atomok.length <= 1000 &&
    Array.isArray(a.kotesek),
    "Hiányos molekulaszerkezet."
  );

  const index = i =>
    Number.isInteger(i) && i >= 0 && i < a.atomok.length;

  const szomszedok = a.atomok.map(() => []);
  const parok = new Map();

  for (const k of a.kotesek) {
    kovetel(
      Array.isArray(k) &&
      index(k[0]) &&
      index(k[1]) &&
      k[0] !== k[1] &&
      [1, 2, 3].includes(k[2] ?? 1),
      "Hibás kötésadat."
    );

    const [i, j, r = 1] = k;
    const kulcs = [Math.min(i, j), Math.max(i, j)].join(":");

    kovetel(!parok.has(kulcs), "Ismétlődő kötésadat.");

    parok.set(kulcs, r);
    szomszedok[i].push({ i: j, r });
    szomszedok[j].push({ i, r });
  }

  return {
    index,
    szomszedok,
    rend: (i, j) =>
      parok.get([Math.min(i, j), Math.max(i, j)].join(":")) ?? 0
  };
}

function pontok(a, idk) {
  kovetel(
    Array.isArray(a.elozetPoziciok),
    "A rajz koordinátái hiányoznak."
  );

  return idk.map(i => {
    const p = a.elozetPoziciok[i];

    kovetel(
      Number.isFinite(p?.x) && Number.isFinite(p?.y),
      "Hiányzó atompozíció: " + (i + 1)
    );

    return p;
  });
}

export function sztereoAdatokKeszitese(a, v) {
  mezok(v, ["statusz", "kiralisCentrumok", "kettosKotesek"]);

  kovetel(
    SZTEREO_STATUSZOK.includes(v.statusz),
    "Ismeretlen sztereokémiai állapot."
  );

  kovetel(
    Array.isArray(v.kiralisCentrumok) &&
    Array.isArray(v.kettosKotesek) &&
    v.kiralisCentrumok.length + v.kettosKotesek.length <= 50,
    "Legfeljebb 50 teljes sztereokémiai sor adható meg."
  );

  const g = graf(a);
  const latottCentrum = new Set();
  const latottKotes = new Set();

  const centrumok = v.kiralisCentrumok.map(c => {
  mezok(c, [
    "atomIndex",
    "konfiguracio",
    "prioritasIndexek",
    "kiemeltAtomIndex"
  ]);

  kovetel(
    g.index(c.atomIndex) &&
    ["R", "S"].includes(c.konfiguracio),
    "Hiányzó vagy hibás R/S-centrum."
  );

  kovetel(
    !latottCentrum.has(c.atomIndex),
    "Egy atomhoz csak egy R/S-sor adható meg."
  );

  latottCentrum.add(c.atomIndex);

  const sz = g.szomszedok[c.atomIndex];

  kovetel(
    a.atomok[c.atomIndex] === "C" &&
    [3, 4].includes(sz.length) &&
    sz.every(x => x.r === 1),
    "Három vagy négy egyszeres kötésű nehézszomszédot tartalmazó széncentrum szükséges: " +
      (c.atomIndex + 1)
  );

  kovetel(
    Array.isArray(c.prioritasIndexek) &&
    c.prioritasIndexek.length === sz.length &&
    new Set(c.prioritasIndexek).size === sz.length &&
    c.prioritasIndexek.every(i =>
      g.index(i) &&
      g.rend(c.atomIndex, i) === 1
    ),
    "A centrum minden nehézatom-szomszédját add meg CIP-prioritási sorrendben."
  );

  kovetel(
    c.prioritasIndexek.includes(c.kiemeltAtomIndex),
    "Az ékkötés végpontja legyen a prioritási atomok egyike."
  );

  let alap;

  if (sz.length === 4) {
    alap = negySzomszedosKonfiguracio(
      pontok(a, c.prioritasIndexek),
      c.prioritasIndexek.indexOf(c.kiemeltAtomIndex),
      "elo"
    );

    kovetel(
      alap !== null,
      "A négy szomszéd térbeli helyzete nem olvasható le egyértelműen a rajzból."
    );
  } else {
    const [p1, p2, p3] = pontok(a, c.prioritasIndexek);

    const forg =
      (p2.x - p1.x) * (p3.y - p1.y) -
      (p2.y - p1.y) * (p3.x - p1.x);

    kovetel(
      Number.isFinite(forg) && Math.abs(forg) >= 1,
      "A centrum prioritási atomjai közel egy vonalba esnek."
    );

    alap = forg > 0 ? "R" : "S";
  }

  return {
    ...c,
    prioritasIndexek: [...c.prioritasIndexek],
    elozetIrany: alap === c.konfiguracio ? "elo" : "hatra"
  };
}).sort((x, y) => x.atomIndex - y.atomIndex);

  for (const c of centrumok) {
    const csatlakozoEkek = centrumok.filter(e =>
      (
        e.atomIndex === c.atomIndex &&
        c.prioritasIndexek.includes(e.kiemeltAtomIndex)
      ) ||
      (
        e.kiemeltAtomIndex === c.atomIndex &&
        c.prioritasIndexek.includes(e.atomIndex)
      )
    );

    kovetel(
      csatlakozoEkek.length === 1,
      "Egy centrumot több megadott ékkötés is érint. Válassz másik ékkötés-végpontot."
    );
  }

  const kettosok = v.kettosKotesek.map(k => {
    mezok(k, [
      "atom1Index", "atom2Index", "konfiguracio",
      "elsoPrioritasIndex", "masodikPrioritasIndex"
    ]);

    const i = k.atom1Index;
    const j = k.atom2Index;
    const u = k.elsoPrioritasIndex;
    const w = k.masodikPrioritasIndex;

    kovetel(
      [i, j, u, w].every(g.index) &&
      new Set([i, j, u, w]).size === 4 &&
      g.rend(i, j) === 2 &&
      a.atomok[i] === "C" &&
      a.atomok[j] === "C" &&
      g.rend(i, u) === 1 &&
      g.rend(j, w) === 1 &&
      ["E", "Z"].includes(k.konfiguracio),
      "Az E/Z-sorhoz C=C-kötést és a két végpont megfelelő szomszédját add meg."
    );

    kovetel(
      g.szomszedok[i].reduce((n, x) => n + x.r, 0) <= 4 &&
      g.szomszedok[j].reduce((n, x) => n + x.r, 0) <= 4,
      "Hibás vegyérték az E/Z-kötésnél."
    );

    const par = [Math.min(i, j), Math.max(i, j)].join(":");

    kovetel(
      !latottKotes.has(par),
      "Egy kettős kötéshez csak egy E/Z-sor adható meg."
    );

    latottKotes.add(par);

    const [p, q, s, t] = pontok(a, [i, j, u, w]);
    const dx = q.x - p.x;
    const dy = q.y - p.y;

    const elso = dx * (s.y - p.y) - dy * (s.x - p.x);
    const masodik = dx * (t.y - q.y) - dy * (t.x - q.x);

    kovetel(
      Number.isFinite(elso) &&
      Number.isFinite(masodik) &&
      Math.abs(elso) >= 1 &&
      Math.abs(masodik) >= 1,
      "Az E/Z-helyzet nem olvasható le egyértelműen a rajzból."
    );

    const tenyleges =
      Math.sign(elso) === Math.sign(masodik) ? "Z" : "E";

    kovetel(
      tenyleges === k.konfiguracio,
      "A rajz a megadott prioritások mellett " +
        tenyleges + " helyzetet mutat, nem " +
        k.konfiguracio + "-t."
    );

    return i < j
      ? { ...k }
      : {
          atom1Index: j,
          atom2Index: i,
          konfiguracio: k.konfiguracio,
          elsoPrioritasIndex: w,
          masodikPrioritasIndex: u
        };
  }).sort((x, y) =>
    x.atom1Index - y.atom1Index || x.atom2Index - y.atom2Index
  );

  const darab = centrumok.length + kettosok.length;

  kovetel(
    v.statusz !== "meghatarozott" || darab > 0,
    "A meghatározott állapothoz legalább egy teljes R/S- vagy E/Z-sor szükséges."
  );

  kovetel(
    !["nincs", "nincs-eloiras"].includes(v.statusz) || darab === 0,
    "Ehhez az állapothoz üres R/S- és E/Z-lista szükséges."
  );

  const regiMeta = objektum(a.importAdatok) ? a.importAdatok : {};

  const forras =
    regiMeta.sztereoForrasKovetelmenyek ??
    sztereoForrasKovetelmenyek(a, null);

  if (v.statusz === "meghatarozott") {
    kovetel(
      forras.nemKezelt.length === 0,
      "A forrásban jelenleg nem kezelhető sztereogén elem vagy atomleképzés található."
    );

    kovetel(
      forras.rs.every(i => latottCentrum.has(i)),
      "A forrás minden jelölt R/S-centrumát add meg. Szükséges atomszámok: " +
        forras.rs.map(i => i + 1).join(", ")
    );

    kovetel(
      forras.ez.every(k => latottKotes.has(k)),
      "A forrás minden meghatározott E/Z-kötését add meg."
    );
  }

  kovetel(
    v.statusz !== "nincs" ||
    (
      !regiMeta.pubchemSztereo?.length &&
      !regiMeta.eredetiPubchemEkKotesek?.length &&
      !regiMeta.pubchemEkKotesek?.length
    ),
    "A forrás sztereokémiai jelölést tartalmaz. Add meg a követelményeket, vagy válaszd a szabadon választható térszerkezetet."
  );

  const uj = {
    ...a,
    sztereokemia: {
      ...(a.sztereokemia ?? {}),
      statusz: v.statusz,
      kiralisCentrumok: centrumok,
      kettosKotesek: kettosok
    },
    importAdatok: {
      ...regiMeta,
      eredetiPubchemEkKotesek:
        regiMeta.eredetiPubchemEkKotesek ??
        regiMeta.pubchemEkKotesek ??
        [],
      pubchemEkKotesek: centrumok.map(c => ({
        atomIndex: c.atomIndex,
        kiemeltAtomIndex: c.kiemeltAtomIndex,
        elozetIrany: c.elozetIrany
      })),
      sztereoEllenorizendo: v.statusz === "ellenorizendo",
      sztereoKezilegEllenorzott: v.statusz !== "ellenorizendo"
    }
  };

  uj.importAdatok.sztereoEllenorzesLenyomat = sztereoLenyomat(uj);
  return uj;
}

export function sztereoJovahagyasEllenorzes(a) {
  if (
    !SZTEREO_STATUSZOK.includes(a.sztereokemia?.statusz) ||
    a.sztereokemia.statusz === "ellenorizendo"
  ) {
    throw hiba(
      409,
      "Előbb ellenőrizd és mentsd el az R/S- és E/Z-adatokat."
    );
  }

  if (
    a.importAdatok?.sztereoKezilegEllenorzott !== true ||
    a.importAdatok.sztereoEllenorzesLenyomat !== sztereoLenyomat(a)
  ) {
    throw hiba(
      409,
      "A sztereokémiai ellenőrzés nincs elmentve ehhez a szerkezethez."
    );
  }

  try {
    sztereoAdatokKeszitese(a, sztereoUrlap(a));
  } catch (e) {
    throw hiba(409, e.message);
  }
}