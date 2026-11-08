// A pontok sorrendje: 1., 2., 3., 4. CIP-prioritás.
// A képernyő y tengelye lefelé nő.
export function negySzomszedosKonfiguracio(
  pontok,
  kiemelt,
  irany
) {
  if (
    !Array.isArray(pontok) ||
    pontok.length !== 4 ||
    !Number.isInteger(kiemelt) ||
    kiemelt < 0 ||
    kiemelt > 3 ||
    !["elo", "hatra"].includes(irany) ||
    pontok.some(p =>
      !Number.isFinite(p?.x) ||
      !Number.isFinite(p?.y)
    )
  ) {
    return null;
  }

  const alap = pontok[3];

  const elteresek = pontok.map(p => [
    p.x - alap.x,
    p.y - alap.y
  ]);

  const meret = Math.max(
    ...elteresek.flatMap(v => v.map(Math.abs))
  );

  if (!Number.isFinite(meret) || meret <= 0) {
    return null;
  }

  const magassag = i =>
    i === kiemelt
      ? (irany === "elo" ? 1 : -1)
      : 0;

  const negyedikZ = magassag(3);

  const v = elteresek.slice(0, 3).map((p, i) => [
    p[0] / meret,
    p[1] / meret,
    magassag(i) - negyedikZ
  ]);

  const [a, b, c] = v;

  const determinans =
    a[0] * (b[1] * c[2] - b[2] * c[1]) -
    a[1] * (b[0] * c[2] - b[2] * c[0]) +
    a[2] * (b[0] * c[1] - b[1] * c[0]);

  if (
    !Number.isFinite(determinans) ||
    Math.abs(determinans) < 1e-7
  ) {
    return null;
  }

  return determinans > 0 ? "R" : "S";
}