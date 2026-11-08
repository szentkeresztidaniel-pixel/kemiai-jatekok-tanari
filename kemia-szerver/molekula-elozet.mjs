import { createHash } from "node:crypto";

const hiba = (statusz, szoveg) =>
  Object.assign(new Error(szoveg), { statusz });

const lista = v => Array.isArray(v) ? v : [];

const xml = v => String(v).replace(/[&<>"']/g, c => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;"
})[c]);

const szam = n => Number(n.toFixed(3));

function valtozat(r) {
  return createHash("sha256").update(JSON.stringify([
    r.id, r.pubchem_cid, r.allapot, r.atalakitott_adat,
    r.magyar_nevek, r.hiba_uzenet, r.modositva
  ])).digest("hex");
}

export function molekulaSvg(a) {
  const atomok = lista(a?.atomok);
  const p = lista(a?.elozetPoziciok);
  const kotesek = lista(a?.kotesek);

  if (
    !atomok.length || atomok.length > 1000 ||
    p.length !== atomok.length ||
    atomok.some(t => typeof t !== "string") ||
    p.some(v => !Number.isFinite(v?.x) || !Number.isFinite(v?.y))
  ) {
    throw hiba(
      409,
      "A molekulához nem találhatók teljes, érvényes rajzolási koordináták."
    );
  }

  const index = i =>
    Number.isInteger(i) && i >= 0 && i < atomok.length;

  const rendek = atomok.map(() => 0);
  const latott = new Set();

  for (const k of kotesek) {
    if (
      !Array.isArray(k) || !index(k[0]) || !index(k[1]) ||
      k[0] === k[1] || ![1, 2, 3].includes(k[2] ?? 1)
    ) {
      throw hiba(409, "Hibás kötésadat miatt a rajz nem készíthető el.");
    }

    const par = [k[0], k[1]].sort((x, y) => x - y).join(":");

    if (latott.has(par)) {
      throw hiba(409, "Ismétlődő kötésadat.");
    }

    latott.add(par);
    rendek[k[0]] += k[2] ?? 1;
    rendek[k[1]] += k[2] ?? 1;
  }

  const x = p.map(v => v.x);
  const y = p.map(v => v.y);
  const bal = Math.min(...x) - 55;
  const fent = Math.min(...y) - 55;
  const w = Math.max(110, Math.max(...x) - bal + 55);
  const h = Math.max(110, Math.max(...y) - fent + 55);

  if (![bal, fent, w, h].every(Number.isFinite)) {
    throw hiba(409, "A rajz mérete érvénytelen.");
  }

  const vonal = (x1, y1, x2, y2, vastag = 2.5) =>
    `<line x1="${szam(x1)}" y1="${szam(y1)}"
      x2="${szam(x2)}" y2="${szam(y2)}"
      stroke="#172033" stroke-width="${vastag}"/>`;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg"
    viewBox="${szam(bal)} ${szam(fent)} ${szam(w)} ${szam(h)}"
    role="img" aria-label="A tárolt molekula szerkezeti rajza">`;

  svg += `<rect x="${szam(bal)}" y="${szam(fent)}"
    width="${szam(w)}" height="${szam(h)}" fill="white"/>`;

  const ekek = [
    ...lista(a.importAdatok?.pubchemEkKotesek),
    ...lista(a.sztereokemia?.kiralisCentrumok)
  ];

  for (const [elso, masodik, rend = 1] of kotesek) {
    const ek = rend === 1 ? ekek.find(e =>
      e &&
      ["elo", "hatra"].includes(e.elozetIrany) &&
      (
        (e.atomIndex === elso && e.kiemeltAtomIndex === masodik) ||
        (e.atomIndex === masodik && e.kiemeltAtomIndex === elso)
      )
    ) : null;

    const i = ek ? ek.atomIndex : elso;
    const j = ek ? ek.kiemeltAtomIndex : masodik;

    const dx = p[j].x - p[i].x;
    const dy = p[j].y - p[i].y;
    const hossz = Math.hypot(dx, dy);

    if (hossz < 1) {
      throw hiba(
        409,
        "Összeeső atompozíciók miatt a rajz nem ellenőrizhető."
      );
    }

    const ux = dx / hossz;
    const uy = dy / hossz;
    const nx = -uy;
    const ny = ux;
    const eltol = Math.min(21, hossz * 0.25);

    const ax = p[i].x + ux * eltol;
    const ay = p[i].y + uy * eltol;
    const bx = p[j].x - ux * eltol;
    const by = p[j].y - uy * eltol;

    if (ek?.elozetIrany === "elo") {
      const pontok = [
        [ax, ay],
        [bx + nx * 8, by + ny * 8],
        [bx - nx * 8, by - ny * 8]
      ];

      svg += `<polygon
        points="${pontok.map(q => q.map(szam).join(",")).join(" ")}"
        fill="#172033"/>`;
    } else if (ek?.elozetIrany === "hatra") {
      for (let n = 1; n <= 7; n++) {
        const t = n / 8;
        const cx = ax + (bx - ax) * t;
        const cy = ay + (by - ay) * t;

        svg += vonal(
          cx - nx * 8 * t,
          cy - ny * 8 * t,
          cx + nx * 8 * t,
          cy + ny * 8 * t,
          2
        );
      }
    } else {
      const eltolasok = {
        1: [0],
        2: [-3, 3],
        3: [-6, 0, 6]
      };

      for (const d of eltolasok[rend]) {
        svg += vonal(
          ax + nx * d, ay + ny * d,
          bx + nx * d, by + ny * d
        );
      }
    }
  }

  const maximum = {
    C: 4, O: 2, N: 3, S: 6, P: 5,
    F: 1, Cl: 1, Br: 1, I: 1, Si: 4
  };

  const szinek = {
    O: "#ffe0e0",
    N: "#dce9ff",
    S: "#fff0bb",
    Cl: "#d6f4df",
    Br: "#edd4c8"
  };

  atomok.forEach((elem, i) => {
    const cel =
      ({ S: [2, 4, 6], P: [3, 5] })[elem]?.find(
        n => n >= rendek[i]
      ) ?? maximum[elem];

    const hidrogen = Number.isFinite(cel)
      ? Math.max(0, cel - rendek[i])
      : 0;

    const hDarab = hidrogen > 1
      ? String(hidrogen).replace(/\d/g, n => "₀₁₂₃₄₅₆₇₈₉"[n])
      : "";

    const felirat = elem + (hidrogen ? "H" + hDarab : "");

    svg += `<circle
      cx="${szam(p[i].x)}" cy="${szam(p[i].y)}" r="21"
      fill="${szinek[elem] ?? "#e8edf3"}" stroke="#94a3b8"/>`;

    svg += `<text
      x="${szam(p[i].x)}" y="${szam(p[i].y + 6)}"
      text-anchor="middle" font-family="Arial,sans-serif"
      font-size="18" fill="#172033">${xml(felirat)}</text>`;
  });

  return svg + "</svg>";
}

export async function molekulaElozetKezeles({
  keres, valasz, ut, db,
  belepettFelhasznalo, valaszKuldese
}) {
  const talalat =
    /^\/api\/admin\/molekula-import\/([1-9]\d*)\/elozet$/.exec(ut);

  if (!talalat || keres.method !== "GET") return false;

  if (belepettFelhasznalo(keres).szerepkor !== "admin") {
    throw hiba(403, "Adminjogosultság szükséges.");
  }

  const id = Number(talalat[1]);

  if (!Number.isSafeInteger(id)) {
    throw hiba(400, "Érvénytelen importazonosító.");
  }

  const r = db.prepare(
    "SELECT * FROM molekula_importok WHERE id=?"
  ).get(id);

  if (!r) throw hiba(404, "Az importrekord nem található.");

  if (r.allapot !== "ellenorizendo") {
    throw hiba(409, "Az importot már feldolgozták. Frissítsd a listát.");
  }

  const a = JSON.parse(r.atalakitott_adat ?? "null");
  const svg = molekulaSvg(a);

  const statusz = typeof a.sztereokemia?.statusz === "string"
    ? a.sztereokemia.statusz
    : "nincs megadva";

  const megjelenitettStatusz = statusz === "ellenorizendo"
    ? "ellenőrizendő"
    : statusz;

  const ellenorizendo =
    statusz === "ellenorizendo" ||
    a.importAdatok?.sztereoEllenorizendo === true;

  valaszKuldese(valasz, 200, {
    sikeres: true,
    valtozat: valtozat(r),
    svg,
    sztereo:
      "Sztereokémiai állapot: " + megjelenitettStatusz + "." +
      (ellenorizendo
        ? " A térszerkezet ellenőrzésre vár; a rajz a tárolt ékkötéseket mutatja."
        : "")
  });

  return true;
}