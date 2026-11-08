import { pubchemTulajdonsag } from "./pubchem-letoltes.mjs";

function kovetel(feltetel, uzenet) {
  if (!feltetel) throw new Error(uzenet);
}

export function pubchemAtalakitas({ pubchemCid, inchiKey, nyersAdat }) {
  const pc = nyersAdat?.PC_Compounds?.[0];

  kovetel(
    Number.isSafeInteger(pubchemCid) && pubchemCid > 0 &&
    nyersAdat?.PC_Compounds?.length === 1 &&
    pc?.id?.id?.cid === pubchemCid,
    "A PubChem-azonosító nem megfelelő."
  );

  kovetel(
    typeof inchiKey === "string" &&
    /^[A-Z]{14}-[A-Z]{10}-[A-Z]$/.test(inchiKey) &&
    pubchemTulajdonsag(pc, "InChIKey") === inchiKey,
    "Az InChIKey hiányzik vagy eltér a forrástól."
  );

  const a = pc.atoms;
  const aid = a?.aid;
  const z = a?.element;

  kovetel(
    Array.isArray(aid) && Array.isArray(z) &&
    aid.length === z.length &&
    aid.length > 0 && aid.length <= 1000 &&
    aid.every(v => Number.isSafeInteger(v) && v > 0) &&
    new Set(aid).size === aid.length,
    "Hiányos vagy hibás atomlista."
  );

  for (const kulcs of ["charge", "isotope", "radical", "label"]) {
    kovetel(
      a[kulcs] === undefined ||
      (Array.isArray(a[kulcs]) && a[kulcs].length === 0),
      "Nem támogatott különleges atomjelölés: " + kulcs + "."
    );
  }

  const jelek = new Map([
    [1, "H"], [6, "C"], [7, "N"], [8, "O"], [9, "F"],
    [14, "Si"], [15, "P"], [16, "S"], [17, "Cl"],
    [35, "Br"], [53, "I"]
  ]);

  kovetel(
    z.every(v => jelek.has(v)),
    "A rekord a játékban nem támogatott elemet tartalmaz."
  );

  const forrasIndex = new Map(aid.map((v, i) => [v, i]));
  const jatekIndex = new Map();
  const atomok = [];

  aid.forEach((v, i) => {
    if (z[i] === 1) return;
    jatekIndex.set(v, atomok.length);
    atomok.push(jelek.get(z[i]));
  });

  kovetel(
    atomok.length >= 1 && atomok.length <= 30,
    "A játék jelenleg 1–30 nehéz atomot tartalmazó molekulákat importál."
  );

  const b = pc.bonds;

  kovetel(
    Array.isArray(b?.aid1) && Array.isArray(b?.aid2) &&
    Array.isArray(b?.order) &&
    b.aid1.length === b.aid2.length &&
    b.aid1.length === b.order.length &&
    b.order.length <= 3000,
    "Hiányos kötéslista."
  );

  const szomszedok = aid.map(() => []);
  const vegyertek = aid.map(() => 0);
  const parok = new Set();
  const kotesek = [];

  b.aid1.forEach((v, i) => {
    const w = b.aid2[i];
    const elso = forrasIndex.get(v);
    const masodik = forrasIndex.get(w);
    const rend = b.order[i];
    const par = [Math.min(v, w), Math.max(v, w)].join(":");

    kovetel(
      elso !== undefined && masodik !== undefined &&
      elso !== masodik &&
      [1, 2, 3].includes(rend) &&
      !parok.has(par),
      "Hibás vagy ismétlődő kötés a PubChem-forrásban."
    );

    parok.add(par);
    szomszedok[elso].push(masodik);
    szomszedok[masodik].push(elso);
    vegyertek[elso] += rend;
    vegyertek[masodik] += rend;

    if (jatekIndex.has(v) && jatekIndex.has(w)) {
      kotesek.push([jatekIndex.get(v), jatekIndex.get(w), rend]);
    }
  });

  const hatarok = new Map([
    [1, 1], [6, 4], [7, 3], [8, 2], [9, 1],
    [14, 4], [15, 5], [16, 6], [17, 1],
    [35, 1], [53, 1]
  ]);

  kovetel(
    z.every((v, i) =>
      vegyertek[i] <= hatarok.get(v) &&
      (v !== 1 || (
        vegyertek[i] === 1 &&
        szomszedok[i].length === 1 &&
        z[szomszedok[i][0]] !== 1
      ))
    ),
    "A szerkezet a játékban nem kezelhető vegyértéket tartalmaz."
  );

  const bejart = new Set([0]);
  const sor = [0];

  for (let i = 0; i < sor.length; i++) {
    for (const j of szomszedok[sor[i]]) {
      if (!bejart.has(j)) {
        bejart.add(j);
        sor.push(j);
      }
    }
  }

  kovetel(
    bejart.size === aid.length,
    "A rekord több különálló komponensből áll."
  );

  const koordinata = Array.isArray(pc.coords)
    ? pc.coords.find(c =>
        Array.isArray(c?.type) && c.type.includes(1)
      )
    : null;

  const konformer = koordinata?.conformers?.[0];

  kovetel(
    Array.isArray(koordinata?.aid) &&
    new Set(koordinata.aid).size === koordinata.aid.length &&
    koordinata.aid.every(v => forrasIndex.has(v)) &&
    Array.isArray(konformer?.x) &&
    Array.isArray(konformer?.y) &&
    konformer.x.length === koordinata.aid.length &&
    konformer.y.length === koordinata.aid.length &&
    konformer.x.every(Number.isFinite) &&
    konformer.y.every(Number.isFinite),
    "Hiányos vagy hibás kétdimenziós koordináták."
  );

  const pontTerkep = new Map(
    koordinata.aid.map((v, i) => [
      v,
      { x: konformer.x[i], y: konformer.y[i] }
    ])
  );

  const pontok = [...jatekIndex.keys()].map(v => pontTerkep.get(v));

  kovetel(
    pontok.every(Boolean),
    "Néhány atomhoz nem tartozik rajzpozíció."
  );

  const hosszok = kotesek.map(([i, j]) =>
    Math.hypot(
      pontok[i].x - pontok[j].x,
      pontok[i].y - pontok[j].y
    )
  );

  kovetel(
    hosszok.every(h => Number.isFinite(h) && h > 1e-8),
    "A rajz egyes kötéseinek hossza nulla vagy hibás."
  );

  const atlag = kulcs =>
    pontok.reduce((s, p) => s + p[kulcs], 0) / pontok.length;

  const cx = atlag("x");
  const cy = atlag("y");

  const atlagHossz = hosszok.length
    ? hosszok.reduce((s, h) => s + h, 0) / hosszok.length
    : 1;

  const skala = Math.min(140, Math.max(35, 85 / atlagHossz));

  const elozetPoziciok = pontok.map(p => ({
    x: Math.round((p.x - cx) * skala * 10) / 10 || 0,
    y: Math.round(-(p.y - cy) * skala * 10) / 10 || 0
  }));

  kovetel(
    elozetPoziciok.every(p =>
      Number.isFinite(p.x) && Number.isFinite(p.y)
    ),
    "A rajz koordinátái nem alakíthatók át."
  );

  const stilus = konformer.style ?? {
    aid1: [], aid2: [], annotation: []
  };

  kovetel(
    Array.isArray(stilus.aid1) &&
    Array.isArray(stilus.aid2) &&
    Array.isArray(stilus.annotation) &&
    stilus.aid1.length === stilus.aid2.length &&
    stilus.aid1.length === stilus.annotation.length,
    "A PubChem rajzi kötésjelölései hiányosak."
  );

  const pubchemEkKotesek = [];
  const figyelmeztetesek = [];

  stilus.aid1.forEach((v, i) => {
    const w = stilus.aid2[i];

    kovetel(
      parok.has([Math.min(v, w), Math.max(v, w)].join(":")),
      "A rajzi jelölés nem létező kötésre hivatkozik."
    );

    if (![5, 6].includes(stilus.annotation[i])) return;

    if (!jatekIndex.has(v) || !jatekIndex.has(w)) {
      figyelmeztetesek.push(
        "Egy hidrogénhez tartozó ékkötés kézi ellenőrzést igényel."
      );
      return;
    }

    pubchemEkKotesek.push({
      atomIndex: jatekIndex.get(v),
      kiemeltAtomIndex: jatekIndex.get(w),
      elozetIrany: stilus.annotation[i] === 5 ? "elo" : "hatra"
    });
  });

  kovetel(
    pc.stereo === undefined || Array.isArray(pc.stereo),
    "A PubChem sztereokémiai listája hibás."
  );

  const pubchemSztereo = structuredClone(pc.stereo ?? []);
  const osszegkeplet = pubchemTulajdonsag(pc, "Molecular Formula");

  kovetel(
    typeof osszegkeplet === "string" &&
    osszegkeplet.trim().length > 0,
    "A PubChem-rekordból hiányzik az összegképlet."
  );

  const angolIupacNev = String(
    pubchemTulajdonsag(pc, "IUPAC Name", "Preferred") ??
    pubchemTulajdonsag(pc, "IUPAC Name") ??
    ("PubChem " + pubchemCid)
  );

  const id = "pubchem-" + pubchemCid;

  return {
    id,
    pubchemCid,
    osszegkeplet,
    izomerCsoportId: osszegkeplet,
    alapvazId: id,
    csaladok: ["importalt"],
    nehezseg: atomok.length <= 6 ? 1 : atomok.length <= 12 ? 2 : 3,
    atomok,
    kotesek,
    elozetPoziciok,
    nevek: {
      preferalt: angolIupacNev,
      alternativak: []
    },
    sztereokemia: {
      statusz: "ellenorizendo",
      kiralisCentrumok: [],
      kettosKotesek: [],
      gyuruKapcsolatok: [],
      cukor: null
    },
    importAdatok: {
      pubchemCid,
      inchiKey,
      angolIupacNev,
      pubchemSztereo,
      pubchemEkKotesek,
      kotesStilusok: structuredClone(
        Array.isArray(pc.bonds?.style) ? pc.bonds.style : []
      ),
      sztereoEllenorizendo: true,
      sztereoKezilegEllenorzott: false,
      figyelmeztetesek: [...new Set(figyelmeztetesek)]
    }
  };
}