import { withSupabase } from "npm:@supabase/server";

function jsonValasz(adat: unknown, status = 200) {
  return new Response(JSON.stringify(adat, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function egyediNevek(nevek: unknown[]) {
  const eredmeny: string[] = [];
  const latott = new Set<string>();

  for (const ertek of nevek) {
    if (typeof ertek !== "string") continue;

    const nev = ertek.trim();

    if (!nev || nev.length > 160) continue;

    const kulcs = nev
      .normalize("NFKC")
      .toLocaleLowerCase("hu-HU");

    if (latott.has(kulcs)) continue;

    latott.add(kulcs);
    eredmeny.push(nev);
  }

  return eredmeny;
}

function objektumVagyUres(
  ertek: unknown,
): Record<string, unknown> {
  if (
    ertek &&
    typeof ertek === "object" &&
    !Array.isArray(ertek)
  ) {
    return ertek as Record<string, unknown>;
  }

  return {};
}

type Szomszed = {
  index: number;
  rend: number;
};

type GrafAdatok = {
  elemek: string[];
  szomszedok: Szomszed[][];
  kotesMatrix: number[][];
  szinek: string[];
};

function atomElemNormalizalasa(atom: unknown) {
  const ertek = String(atom ?? "")
    .normalize("NFKC")
    .trim()
    .toUpperCase();

  if (ertek.startsWith("CL")) return "Cl";
  if (ertek.startsWith("BR")) return "Br";
  if (ertek.startsWith("C")) return "C";
  if (ertek.startsWith("O")) return "O";
  if (ertek.startsWith("N")) return "N";
  if (ertek.startsWith("S")) return "S";
  if (ertek.startsWith("P")) return "P";
  if (ertek.startsWith("F")) return "F";
  if (ertek.startsWith("I")) return "I";

  return ertek || "?";
}

function indexEllenorzes(
  index: unknown,
  atomDarab: number,
) {
  const szam = Number(index);

  return Number.isInteger(szam) &&
    szam >= 0 &&
    szam < atomDarab;
}

function grafAdatokKeszitese(
  adat: any,
): GrafAdatok {
  const atomok = Array.isArray(adat?.atomok)
    ? adat.atomok
    : [];

  const kotesek = Array.isArray(adat?.kotesek)
    ? adat.kotesek
    : [];

  if (atomok.length === 0) {
    throw new Error(
      "A molekulának nincs atomlistája.",
    );
  }

  const elemek =
    atomok.map(atomElemNormalizalasa);

  const szomszedok: Szomszed[][] =
    Array.from(
      { length: atomok.length },
      () => [],
    );

  const kotesMatrix: number[][] =
    Array.from(
      { length: atomok.length },
      () => Array(atomok.length).fill(0),
    );

  for (const kotes of kotesek) {
    if (
      !Array.isArray(kotes) ||
      kotes.length < 2
    ) {
      throw new Error(
        "Érvénytelen kötésadat.",
      );
    }

    const atom1 = Number(kotes[0]);
    const atom2 = Number(kotes[1]);
    const rend = Number(kotes[2] ?? 1);

    if (
      !indexEllenorzes(
        atom1,
        atomok.length,
      ) ||
      !indexEllenorzes(
        atom2,
        atomok.length,
      ) ||
      atom1 === atom2 ||
      !Number.isFinite(rend) ||
      rend <= 0
    ) {
      throw new Error(
        `Érvénytelen kötés: ${
          JSON.stringify(kotes)
        }`,
      );
    }

    if (
      kotesMatrix[atom1][atom2] !== 0
    ) {
      throw new Error(
        `Többször megadott kötés: ${atom1}-${atom2}`,
      );
    }

    szomszedok[atom1].push({
      index: atom2,
      rend,
    });

    szomszedok[atom2].push({
      index: atom1,
      rend,
    });

    kotesMatrix[atom1][atom2] = rend;
    kotesMatrix[atom2][atom1] = rend;
  }

  let szinek = elemek.map(
    (elem, index) => {
      const kotesrendek =
        szomszedok[index]
          .map(
            (szomszed) =>
              szomszed.rend,
          )
          .sort((a, b) => a - b)
          .join(",");

      return `${elem}|${kotesrendek}`;
    },
  );

  for (
    let kor = 0;
    kor < atomok.length;
    kor += 1
  ) {
    const alairasok = szinek.map(
      (sajatSzin, atomIndex) => {
        const kornyezet =
          szomszedok[atomIndex]
            .map(
              (szomszed) =>
                `${szomszed.rend}:${
                  szinek[
                    szomszed.index
                  ]
                }`,
            )
            .sort()
            .join(";");

        return `${sajatSzin}[${kornyezet}]`;
      },
    );

    const egyediAlairasok = [
      ...new Set(alairasok),
    ].sort();

    const szinAzonosito = new Map(
      egyediAlairasok.map(
        (alairas, index) => [
          alairas,
          String(index),
        ],
      ),
    );

    szinek = alairasok.map(
      (alairas) =>
        szinAzonosito.get(alairas)!,
    );
  }

  return {
    elemek,
    szomszedok,
    kotesMatrix,
    szinek,
  };
}

function darabszamLista(
  ertekek: string[],
) {
  const darabok =
    new Map<string, number>();

  for (const ertek of ertekek) {
    darabok.set(
      ertek,
      (darabok.get(ertek) ?? 0) + 1,
    );
  }

  return [...darabok.entries()]
    .sort(
      ([a], [b]) =>
        a.localeCompare(b),
    )
    .map(
      ([ertek, darab]) =>
        `${ertek}*${darab}`,
    );
}

async function sha256(
  szoveg: string,
) {
  const kodolt =
    new TextEncoder().encode(szoveg);

  const kivonat =
    await crypto.subtle.digest(
      "SHA-256",
      kodolt,
    );

  return [
    ...new Uint8Array(kivonat),
  ]
    .map(
      (ertek) =>
        ertek
          .toString(16)
          .padStart(2, "0"),
    )
    .join("");
}

function sztereoAlairasokKeszitese(
  adat: any,
  graf: GrafAdatok,
) {
  const atomAlairasok =
    graf.elemek.map(
      (elem, index) =>
        `${elem}:${graf.szinek[index]}`,
    );

  function atomKornyezetiAlairas(
    atomIndex: number,
  ) {
    const kornyezet =
      graf.szomszedok[atomIndex]
        .map(
          (szomszed) =>
            `${szomszed.rend}:${
              atomAlairasok[
                szomszed.index
              ]
            }`,
        )
        .sort()
        .join(",");

    return `${
      atomAlairasok[atomIndex]
    }[${kornyezet}]`;
  }

  const sztereokemia =
    objektumVagyUres(
      adat?.sztereokemia,
    );

  const eredmeny: string[] = [];

  const kiralisCentrumok =
    Array.isArray(
      sztereokemia.kiralisCentrumok,
    )
      ? sztereokemia.kiralisCentrumok
      : [];

  for (
    const centrum of kiralisCentrumok
  ) {
    const atomIndex =
      Number(centrum?.atomIndex);

    const konfiguracio =
      String(
        centrum?.konfiguracio ?? "",
      ).toUpperCase();

    if (
      indexEllenorzes(
        atomIndex,
        graf.elemek.length,
      ) &&
      (
        konfiguracio === "R" ||
        konfiguracio === "S"
      )
    ) {
      eredmeny.push(
        `RS:${
          atomKornyezetiAlairas(
            atomIndex,
          )
        }:${konfiguracio}`,
      );
    }
  }

  const kettosKotesek =
    Array.isArray(
      sztereokemia.kettosKotesek,
    )
      ? sztereokemia.kettosKotesek
      : [];

  for (
    const kettosKotes of kettosKotesek
  ) {
    const atom1 =
      Number(
        kettosKotes?.atom1Index,
      );

    const atom2 =
      Number(
        kettosKotes?.atom2Index,
      );

    const konfiguracio =
      String(
        kettosKotes?.konfiguracio ?? "",
      ).toUpperCase();

    if (
      indexEllenorzes(
        atom1,
        graf.elemek.length,
      ) &&
      indexEllenorzes(
        atom2,
        graf.elemek.length,
      ) &&
      (
        konfiguracio === "E" ||
        konfiguracio === "Z"
      )
    ) {
      const vegpontok = [
        atomKornyezetiAlairas(atom1),
        atomKornyezetiAlairas(atom2),
      ].sort();

      eredmeny.push(
        `EZ:${vegpontok[0]}|${
          vegpontok[1]
        }:${konfiguracio}`,
      );
    }
  }

  return eredmeny.sort();
}

async function kapcsolatiKulcsKeszitese(
  adat: any,
) {
  const graf =
    grafAdatokKeszitese(adat);

  const atomAlairasok =
    graf.elemek.map(
      (elem, index) =>
        `${elem}:${graf.szinek[index]}`,
    );

  const kotesAlairasok: string[] = [];

  for (
    let atom1 = 0;
    atom1 < graf.elemek.length;
    atom1 += 1
  ) {
    for (
      let atom2 = atom1 + 1;
      atom2 < graf.elemek.length;
      atom2 += 1
    ) {
      const rend =
        graf.kotesMatrix[atom1][atom2];

      if (rend === 0) continue;

      const rendezett = [
        atomAlairasok[atom1],
        atomAlairasok[atom2],
      ].sort();

      kotesAlairasok.push(
        `${rendezett[0]}-${rend}-${
          rendezett[1]
        }`,
      );
    }
  }

  const teljesAlairas =
    JSON.stringify({
      verzio: 1,

      atomDarab:
        graf.elemek.length,

      kotesDarab:
        kotesAlairasok.length,

      atomok:
        darabszamLista(
          atomAlairasok,
        ),

      kotesek:
        darabszamLista(
          kotesAlairasok,
        ),

      sztereo:
        sztereoAlairasokKeszitese(
          adat,
          graf,
        ),
    });

  const kivonat =
    await sha256(teljesAlairas);

  return `v1-${kivonat}`;
}

function sztereoEgyezikLekepzessel(
  elsoAdat: any,
  masodikAdat: any,
  lekepezes: number[],
) {
  const elsoSztereo =
    objektumVagyUres(
      elsoAdat?.sztereokemia,
    );

  const masodikSztereo =
    objektumVagyUres(
      masodikAdat?.sztereokemia,
    );

  const elsoCentrumok =
    Array.isArray(
      elsoSztereo.kiralisCentrumok,
    )
      ? elsoSztereo.kiralisCentrumok
      : [];

  const masodikCentrumok =
    Array.isArray(
      masodikSztereo.kiralisCentrumok,
    )
      ? masodikSztereo.kiralisCentrumok
      : [];

  if (
    elsoCentrumok.length !==
    masodikCentrumok.length
  ) {
    return false;
  }

  const masodikCentrumKulcsok =
    new Set(
      masodikCentrumok.map(
        (centrum: any) =>
          `${Number(
            centrum?.atomIndex,
          )}:${String(
            centrum?.konfiguracio ?? "",
          ).toUpperCase()}`,
      ),
    );

  for (
    const centrum of elsoCentrumok
  ) {
    const regiIndex =
      Number(centrum?.atomIndex);

    const ujIndex =
      lekepezes[regiIndex];

    const konfiguracio =
      String(
        centrum?.konfiguracio ?? "",
      ).toUpperCase();

    if (
      !masodikCentrumKulcsok.has(
        `${ujIndex}:${konfiguracio}`,
      )
    ) {
      return false;
    }
  }

  const elsoKettosok =
    Array.isArray(
      elsoSztereo.kettosKotesek,
    )
      ? elsoSztereo.kettosKotesek
      : [];

  const masodikKettosok =
    Array.isArray(
      masodikSztereo.kettosKotesek,
    )
      ? masodikSztereo.kettosKotesek
      : [];

  if (
    elsoKettosok.length !==
    masodikKettosok.length
  ) {
    return false;
  }

  const masodikKettosKulcsok =
    new Set(
      masodikKettosok.map(
        (kotes: any) => {
          const vegpontok = [
            Number(
              kotes?.atom1Index,
            ),
            Number(
              kotes?.atom2Index,
            ),
          ].sort((a, b) => a - b);

          const konfiguracio =
            String(
              kotes?.konfiguracio ?? "",
            ).toUpperCase();

          return `${
            vegpontok[0]
          }-${vegpontok[1]}:${
            konfiguracio
          }`;
        },
      ),
    );

  for (
    const kotes of elsoKettosok
  ) {
    const regiAtom1 =
      Number(kotes?.atom1Index);

    const regiAtom2 =
      Number(kotes?.atom2Index);

    const vegpontok = [
      lekepezes[regiAtom1],
      lekepezes[regiAtom2],
    ].sort((a, b) => a - b);

    const konfiguracio =
      String(
        kotes?.konfiguracio ?? "",
      ).toUpperCase();

    const keresettKulcs =
      `${vegpontok[0]}-${
        vegpontok[1]
      }:${konfiguracio}`;

    if (
      !masodikKettosKulcsok.has(
        keresettKulcs,
      )
    ) {
      return false;
    }
  }

  return true;
}

function pontosSzerkezetEgyezik(
  elsoAdat: any,
  masodikAdat: any,
) {
  const elso =
    grafAdatokKeszitese(elsoAdat);

  const masodik =
    grafAdatokKeszitese(masodikAdat);

  if (
    elso.elemek.length !==
    masodik.elemek.length
  ) {
    return false;
  }

  const atomDarab =
    elso.elemek.length;

  const elsoKotesDarab =
    elso.szomszedok.reduce(
      (osszeg, lista) =>
        osszeg + lista.length,
      0,
    ) / 2;

  const masodikKotesDarab =
    masodik.szomszedok.reduce(
      (osszeg, lista) =>
        osszeg + lista.length,
      0,
    ) / 2;

  if (
    elsoKotesDarab !==
    masodikKotesDarab
  ) {
    return false;
  }

  const lehetsegesCelok =
    elso.elemek.map(
      (elem, elsoIndex) =>
        masodik.elemek
          .map(
            (
              masodikElem,
              masodikIndex,
            ) => ({
              masodikElem,
              masodikIndex,
            }),
          )
          .filter(
            ({
              masodikElem,
              masodikIndex,
            }) =>
              elem === masodikElem &&
              elso.szinek[
                elsoIndex
              ] ===
                masodik.szinek[
                  masodikIndex
                ] &&
              elso.szomszedok[
                elsoIndex
              ].length ===
                masodik.szomszedok[
                  masodikIndex
                ].length,
          )
          .map(
            ({ masodikIndex }) =>
              masodikIndex,
          ),
    );

  if (
    lehetsegesCelok.some(
      (lista) => lista.length === 0,
    )
  ) {
    return false;
  }

  const sorrend = Array.from(
    { length: atomDarab },
    (_, index) => index,
  ).sort((a, b) => {
    const jeloltKulonbseg =
      lehetsegesCelok[a].length -
      lehetsegesCelok[b].length;

    if (jeloltKulonbseg !== 0) {
      return jeloltKulonbseg;
    }

    return (
      elso.szomszedok[b].length -
      elso.szomszedok[a].length
    );
  });

  const lekepezes =
    Array(atomDarab).fill(-1);

  const hasznalt =
    Array(atomDarab).fill(false);

  function keres(
    pozicio: number,
  ): boolean {
    if (pozicio === atomDarab) {
      return sztereoEgyezikLekepzessel(
        elsoAdat,
        masodikAdat,
        lekepezes,
      );
    }

    const elsoIndex =
      sorrend[pozicio];

    for (
      const masodikIndex of
        lehetsegesCelok[elsoIndex]
    ) {
      if (
        hasznalt[masodikIndex]
      ) {
        continue;
      }

      let osszefer = true;

      for (
        let masikElso = 0;
        masikElso < atomDarab;
        masikElso += 1
      ) {
        const masikMasodik =
          lekepezes[masikElso];

        if (
          masikMasodik === -1
        ) {
          continue;
        }

        if (
          elso.kotesMatrix[
            elsoIndex
          ][masikElso] !==
          masodik.kotesMatrix[
            masodikIndex
          ][masikMasodik]
        ) {
          osszefer = false;
          break;
        }
      }

      if (!osszefer) continue;

      lekepezes[elsoIndex] =
        masodikIndex;

      hasznalt[masodikIndex] =
        true;

      if (
        keres(pozicio + 1)
      ) {
        return true;
      }

      lekepezes[elsoIndex] = -1;
      hasznalt[masodikIndex] =
        false;
    }

    return false;
  }

  return keres(0);
}

export default {
  fetch: withSupabase(
    { auth: "secret" },

    async (req, ctx) => {
      if (req.method !== "POST") {
        return jsonValasz(
          {
            sikeres: false,
            hiba: "Csak POST kérés engedélyezett.",
          },
          405,
        );
      }

      try {
        const torzs = await req.json();

        const pubchemCid =
          Number(torzs?.pubchemCid);

        if (
          !Number.isInteger(pubchemCid) ||
          pubchemCid <= 0
        ) {
          return jsonValasz(
            {
              sikeres: false,
              hiba: "Érvénytelen PubChem CID.",
            },
            400,
          );
        }

        const {
          data: importRekord,
          error: importHiba,
        } = await ctx.supabaseAdmin
          .from("molekula_importok")
          .select(
            [
              "id",
              "pubchem_cid",
              "inchi_key",
              "allapot",
              "atalakitott_adat",
              "magyar_nevek",
            ].join(","),
          )
          .eq("pubchem_cid", pubchemCid)
          .maybeSingle();

        if (importHiba) {
          throw new Error(
            `Importrekord-lekérdezési hiba: ${importHiba.message}`,
          );
        }

        if (!importRekord) {
          return jsonValasz(
            {
              sikeres: false,
              hiba:
                "Ehhez a PubChem CID-hez nincs importrekord.",
            },
            404,
          );
        }

        if (!importRekord.atalakitott_adat) {
          return jsonValasz(
            {
              sikeres: false,
              hiba:
                "A molekulát előbb át kell alakítani és minősíteni.",
            },
            409,
          );
        }

        const atalakitottAdat =
          objektumVagyUres(
            importRekord.atalakitott_adat,
          );

        async function importLezarasaDuplikatumkent() {
  const {
    error: importLezarasiHiba,
  } = await ctx.supabaseAdmin
    .from("molekula_importok")
    .update({
      allapot:
        "elfogadva",

      hiba_uzenet:
        null,
    })
    .eq(
      "id",
      importRekord.id,
    );

  return (
    importLezarasiHiba
      ?.message ?? null
  );
}

        const minosites =
          objektumVagyUres(
            atalakitottAdat.minosites,
          );

        if (
          !Array.isArray(
            minosites.funkciosCsoportok,
          )
        ) {
          return jsonValasz(
            {
              sikeres: false,
              hiba:
                "A molekula automatikus minősítése még nem készült el.",
            },
            409,
          );
        }

        const magyarNevek =
          objektumVagyUres(
            importRekord.magyar_nevek,
          );

        const {
          data: kiegeszites,
          error: kiegeszitesHiba,
        } = await ctx.supabaseAdmin
          .from("magyar_nev_kiegeszitesek")
          .select(
            "preferalt_nev, alternativak",
          )
          .eq("pubchem_cid", pubchemCid)
          .eq("aktiv", true)
          .maybeSingle();

        if (kiegeszitesHiba) {
          throw new Error(
            `Névkiegészítési hiba: ${kiegeszitesHiba.message}`,
          );
        }

        const atalakitottNevek =
          objektumVagyUres(
            atalakitottAdat.nevek,
          );

        const keziPreferaltNev =
          typeof torzs?.preferaltNev ===
            "string"
            ? torzs.preferaltNev.trim()
            : "";

        const kiegeszitettPreferaltNev =
          typeof kiegeszites?.preferalt_nev ===
            "string"
            ? kiegeszites.preferalt_nev.trim()
            : "";

        const wikidataPreferaltNev =
          typeof magyarNevek.preferaltNevJelolt ===
            "string"
            ? magyarNevek.preferaltNevJelolt.trim()
            : "";

        const atalakitottPreferaltNev =
          typeof atalakitottNevek.preferalt ===
            "string"
            ? atalakitottNevek.preferalt.trim()
            : "";

        const preferaltNev =
  keziPreferaltNev ||
  kiegeszitettPreferaltNev ||
  wikidataPreferaltNev ||
  atalakitottPreferaltNev;

        if (!preferaltNev) {
          return jsonValasz(
            {
              sikeres: false,
              hiba:
                "Nem található használható magyar preferált név.",
            },
            409,
          );
        }

        const keziAlternativakMegadva =
  Array.isArray(
    torzs?.alternativak,
  );

const keziAlternativak =
  keziAlternativakMegadva
    ? torzs.alternativak
    : [];

const kiegeszitettAlternativak =
  Array.isArray(
    kiegeszites?.alternativak,
  )
    ? kiegeszites.alternativak
    : [];

const wikidataAlternativak =
  Array.isArray(
    magyarNevek.alternativaJeloltek,
  )
    ? magyarNevek.alternativaJeloltek
    : [];

const atalakitottAlternativak =
  Array.isArray(
    atalakitottNevek.alternativak,
  )
    ? atalakitottNevek.alternativak
    : [];

const automatikusAlternativak = [
  ...kiegeszitettAlternativak,
  ...wikidataAlternativak,
  ...atalakitottAlternativak,
];

const alternativak =
  egyediNevek(
    keziAlternativakMegadva
      ? keziAlternativak
      : automatikusAlternativak,
  ).filter(
    (nev) =>
      nev.toLocaleLowerCase(
        "hu-HU",
      ) !==
      preferaltNev.toLocaleLowerCase(
        "hu-HU",
      ),
  );

        const atomok =
          atalakitottAdat.atomok;

        const kotesek =
          atalakitottAdat.kotesek;

        const csaladok =
          atalakitottAdat.csaladok;

        const osszegkeplet =
          atalakitottAdat.osszegkeplet;

        const nehezseg =
          Number(atalakitottAdat.nehezseg);

        if (
          !Array.isArray(atomok) ||
          atomok.length === 0 ||
          !Array.isArray(kotesek) ||
          !Array.isArray(csaladok) ||
          csaladok.length === 0 ||
          typeof osszegkeplet !== "string" ||
          ![1, 2, 3].includes(nehezseg)
        ) {
          return jsonValasz(
            {
              sikeres: false,
              hiba:
                "A minősített molekula adatai hiányosak.",
            },
            409,
          );
        }

        const inchiKey =
          typeof importRekord.inchi_key ===
            "string"
            ? importRekord.inchi_key
            : null;

        const {
          data: cidDuplikatum,
          error: cidHiba,
        } = await ctx.supabaseAdmin
          .from("molekulak")
          .select("id, preferalt_nev")
          .eq("pubchem_cid", pubchemCid)
          .maybeSingle();

        if (cidHiba) {
          throw new Error(
            `CID-ellenőrzési hiba: ${cidHiba.message}`,
          );
        }

        if (cidDuplikatum) {
  const importLezarasiHiba =
    await importLezarasaDuplikatumkent();

  return jsonValasz(
    {
      sikeres: false,

      duplikalt:
        true,

      egyezesTipusa:
        "pubchem-cid",

      hiba:
        "Ez a PubChem CID már szerepel a végleges adatbázisban.",

      letezoMolekula:
        cidDuplikatum,

      importLezarva:
        importLezarasiHiba ===
        null,

      importLezarasiHiba,
    },
    409,
  );
}

        if (inchiKey) {
          const {
            data: inchiDuplikatum,
            error: inchiHiba,
          } = await ctx.supabaseAdmin
            .from("molekulak")
            .select("id, preferalt_nev")
            .eq("inchi_key", inchiKey)
            .maybeSingle();

          if (inchiHiba) {
            throw new Error(
              `InChIKey-ellenőrzési hiba: ${inchiHiba.message}`,
            );
          }

          if (inchiDuplikatum) {
  const importLezarasiHiba =
    await importLezarasaDuplikatumkent();

  return jsonValasz(
    {
      sikeres: false,

      duplikalt:
        true,

      egyezesTipusa:
        "inchi-key",

      hiba:
        "Ez az InChIKey már szerepel a végleges adatbázisban.",

      letezoMolekula:
        inchiDuplikatum,

      importLezarva:
        importLezarasiHiba ===
        null,

      importLezarasiHiba,
    },
        409,
  );
}
}

        const veglegesId =
          `pubchem-${pubchemCid}`;

        const veglegesAdat = {
          ...atalakitottAdat,

          id: veglegesId,

          nevek: {
            preferalt: preferaltNev,
            alternativak,
          },

          csaladok:
            egyediNevek(csaladok),

          nehezseg,
        };

                const kapcsolatiKulcs =
          await kapcsolatiKulcsKeszitese(
            veglegesAdat,
          );

        const {
          data: kapcsolatiJeloltek,
          error: kapcsolatiHiba,
        } = await ctx.supabaseAdmin
          .from("molekulak")
          .select(
            [
              "id",
              "preferalt_nev",
              "pubchem_cid",
              "inchi_key",
              "adat",
            ].join(","),
          )
          .eq(
            "kapcsolati_kulcs",
            kapcsolatiKulcs,
          );

        if (kapcsolatiHiba) {
          throw new Error(
            `Kapcsolati kulcs ellenőrzési hiba: ${
              kapcsolatiHiba.message
            }`,
          );
        }

        for (
          const jelolt of
            kapcsolatiJeloltek ?? []
        ) {
          const tenylegesEgyezes =
            pontosSzerkezetEgyezik(
              veglegesAdat,
              jelolt.adat,
            );

          if (tenylegesEgyezes) {
                        const azonositoFrissites:
              Record<
                string,
                string | number
              > = {};

            if (
              jelolt.pubchem_cid == null
            ) {
              azonositoFrissites
                .pubchem_cid =
                pubchemCid;
            }

            if (
              jelolt.inchi_key == null &&
              inchiKey
            ) {
              azonositoFrissites
                .inchi_key =
                inchiKey;
            }

            let azonositoFrissitesiHiba:
              string | null = null;

            if (
              Object.keys(
                azonositoFrissites,
              ).length > 0
            ) {
              const {
                error:
                  azonositoHiba,
              } =
                await ctx.supabaseAdmin
                  .from("molekulak")
                  .update(
                    azonositoFrissites,
                  )
                  .eq(
                    "id",
                    jelolt.id,
                  );

              azonositoFrissitesiHiba =
                azonositoHiba
                  ?.message ?? null;
            }

            const importLezarasiHiba =
  azonositoFrissitesiHiba ===
  null
    ? await importLezarasaDuplikatumkent()
    : `Az azonosítók frissítése sikertelen: ${azonositoFrissitesiHiba}`;

            return jsonValasz(
              {
                sikeres: false,
                duplikalt: true,

                egyezesTipusa:
                  "kapcsolati-szerkezeti-egyezes",

                hiba:
                  "Ez a molekulaszerkezet már szerepel a végleges adatbázisban.",

                kapcsolatiKulcs,

                                azonositokHozzarendelve:
                  azonositoFrissitesiHiba ===
                  null,

                azonositoFrissites,

                azonositoFrissitesiHiba,

                importLezarva:
  importLezarasiHiba ===
  null,

importLezarasiHiba,

                letezoMolekula: {
                  id: jelolt.id,

                  preferalt_nev:
                    jelolt.preferalt_nev,

                                    pubchem_cid:
                    jelolt.pubchem_cid ??
                    pubchemCid,

                  inchi_key:
                    jelolt.inchi_key ??
                    inchiKey,
                },
              },
              409,
            );
          }
        }

        const automatikus =
          torzs?.automatikus === true;

        const aktiv =
          torzs?.aktiv !== false;

        const ellenorzesiStatusz =
          automatikus
            ? "automatikusan-ellenorzott"
            : "kezzel-ellenorzott";

        const {
          data: ujMolekula,
          error: beszurasiHiba,
        } = await ctx.supabaseAdmin
          .from("molekulak")
          .insert({
            id: veglegesId,
            pubchem_cid: pubchemCid,
            inchi_key: inchiKey,
            kapcsolati_kulcs:
              kapcsolatiKulcs,
            osszegkeplet,
            preferalt_nev: preferaltNev,
            csaladok:
              veglegesAdat.csaladok,
            nehezseg,
            adat: veglegesAdat,
            forras: "pubchem-import",
            ellenorzesi_statusz:
              ellenorzesiStatusz,
            aktiv,
          })
          .select(
            "id, preferalt_nev, aktiv, ellenorzesi_statusz",
          )
          .single();

        if (beszurasiHiba) {
          throw new Error(
            `Véglegesítési hiba: ${beszurasiHiba.message}`,
          );
        }

        const veglegesMagyarNevek = {
          ...magyarNevek,

          preferaltNevJelolt:
            preferaltNev,

          alternativaJeloltek:
            alternativak,

          ellenorzott: true,

          automatikusanElfogadhato:
            automatikus,

          elfogadottNev:
            preferaltNev,

          elfogadottAlternativak:
            alternativak,
        };

        const {
          error: importFrissitesiHiba,
        } = await ctx.supabaseAdmin
          .from("molekula_importok")
          .update({
            atalakitott_adat:
              veglegesAdat,

            magyar_nevek:
              veglegesMagyarNevek,

            allapot: "elfogadva",

            hiba_uzenet: null,
          })
          .eq("id", importRekord.id);

        return jsonValasz({
          sikeres: true,
          pubchemCid,
          molekula: ujMolekula,
          magyarNev: preferaltNev,
          alternativak,
          csaladok:
            veglegesAdat.csaladok,
          nehezseg,
          importAllapot:
            importFrissitesiHiba
              ? "A molekula bekerült, de az importrekord frissítése nem sikerült."
              : "elfogadva",
          importFrissitesiHiba:
            importFrissitesiHiba?.message ??
            null,
        });
      } catch (hiba) {
        const hibaUzenet =
          hiba instanceof Error
            ? hiba.message
            : String(hiba);

        return jsonValasz(
          {
            sikeres: false,
            hiba: hibaUzenet,
          },
          500,
        );
      }
    },
  ),
};