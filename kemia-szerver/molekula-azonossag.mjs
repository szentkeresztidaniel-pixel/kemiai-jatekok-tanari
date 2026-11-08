// Átvéve a regi-jovahagyas.ts segédfüggvényeiből.
// Forrás SHA-256: 511d10daa8a5686b8a8dbc96d9d58424f8edd4ddbc490caf1eda8071570b0335

function jsonValasz(adat         , status = 200) {
  return new Response(JSON.stringify(adat, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function egyediNevek(nevek           ) {
  const eredmeny           = [];
  const latott = new Set        ();

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
  ertek         ,
)                          {
  if (
    ertek &&
    typeof ertek === "object" &&
    !Array.isArray(ertek)
  ) {
    return ertek                           ;
  }

  return {};
}

                 
                
               
  

                   
                   
                           
                          
                   
  

function atomElemNormalizalasa(atom         ) {
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
  index         ,
  atomDarab        ,
) {
  const szam = Number(index);

  return Number.isInteger(szam) &&
    szam >= 0 &&
    szam < atomDarab;
}

function grafAdatokKeszitese(
  adat     ,
)             {
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

  const szomszedok               =
    Array.from(
      { length: atomok.length },
      () => [],
    );

  const kotesMatrix             =
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
        szinAzonosito.get(alairas) ,
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
  ertekek          ,
) {
  const darabok =
    new Map                ();

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
  szoveg        ,
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
  adat     ,
  graf            ,
) {
  const atomAlairasok =
    graf.elemek.map(
      (elem, index) =>
        `${elem}:${graf.szinek[index]}`,
    );

  function atomKornyezetiAlairas(
    atomIndex        ,
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

  const eredmeny           = [];

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
  adat     ,
) {
  const graf =
    grafAdatokKeszitese(adat);

  const atomAlairasok =
    graf.elemek.map(
      (elem, index) =>
        `${elem}:${graf.szinek[index]}`,
    );

  const kotesAlairasok           = [];

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
  elsoAdat     ,
  masodikAdat     ,
  lekepezes          ,
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
        (centrum     ) =>
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
        (kotes     ) => {
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
  elsoAdat     ,
  masodikAdat     ,
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
    pozicio        ,
  )          {
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


export { egyediNevek, objektumVagyUres, kapcsolatiKulcsKeszitese, pontosSzerkezetEgyezik };
