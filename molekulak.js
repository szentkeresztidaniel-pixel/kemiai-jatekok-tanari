"use strict";

// ==================================================
// BENZOLVÁZAS MOLEKULÁK GENERÁTORA
// ==================================================

function benzolSzarmazekKeszitese(
  adatok
) {
  const atomok =
    Array(6).fill("C");

    /*
 * Szabályos, vízszintesen elnyújtott
 * benzolgyűrű az előnézethez.
 */

const elozetPoziciok = [
  { x: -110, y: 0 },
  { x: -55, y: -95 },
  { x: 55, y: -95 },
  { x: 110, y: 0 },
  { x: 55, y: 95 },
  { x: -55, y: 95 },
];

function gyurutolKifelePozicio(
  gyuruIndex,
  tavolsag
) {
  const gyuruPozicio =
    elozetPoziciok[
      gyuruIndex
    ];

  const hossz =
    Math.max(
      1,
      Math.hypot(
        gyuruPozicio.x,
        gyuruPozicio.y
      )
    );

  return {
    x:
      gyuruPozicio.x +
      (
        gyuruPozicio.x /
        hossz
      ) * tavolsag,

    y:
      gyuruPozicio.y +
      (
        gyuruPozicio.y /
        hossz
      ) * tavolsag,
  };
}

  /*
   * A benzolgyűrű atomjai:
   *
   *       0 — 1
   *      /     \
   *     5       2
   *      \     /
   *       4 — 3
   */

  const kotesek = [
    [0, 1, 2],
    [1, 2, 1],
    [2, 3, 2],
    [3, 4, 1],
    [4, 5, 2],
    [5, 0, 1],
  ];

  const foglaltPoziciok =
    new Set();

  for (
    const helyettesito of
    adatok.helyettesitok ?? []
  ) {
    const pozicio =
      Number(
        helyettesito.pozicio
      );

    const gyuruIndex =
      pozicio - 1;

    if (
      !Number.isInteger(pozicio) ||
      pozicio < 1 ||
      pozicio > 6
    ) {
      console.error(
        "[NÉVTÁR HIBA] Érvénytelen benzolgyűrű-pozíció:",
        helyettesito
      );

      continue;
    }

    if (
      foglaltPoziciok.has(
        pozicio
      )
    ) {
      console.error(
        "[NÉVTÁR HIBA] Egy benzolgyűrű-pozíció kétszer szerepel:",
        adatok.id,
        pozicio
      );

      continue;
    }

    foglaltPoziciok.add(
      pozicio
    );

    if (
      helyettesito.tipus ===
      "metil"
    ) {
      const metilIndex =
        atomok.length;

      atomok.push("C");

elozetPoziciok.push(
  gyurutolKifelePozicio(
    gyuruIndex,
    90
  )
);

kotesek.push([
        gyuruIndex,
        metilIndex,
        1,
      ]);

      continue;
    }

    if (
      helyettesito.tipus ===
      "etil"
    ) {
      const elsoSzenIndex =
        atomok.length;

      atomok.push("C");

      const masodikSzenIndex =
        atomok.length;

      atomok.push("C");

      elozetPoziciok.push(
  gyurutolKifelePozicio(
    gyuruIndex,
    85
  ),

  gyurutolKifelePozicio(
    gyuruIndex,
    170
  )
);

      kotesek.push(
        [
          gyuruIndex,
          elsoSzenIndex,
          1,
        ],
        [
          elsoSzenIndex,
          masodikSzenIndex,
          1,
        ]
      );

      continue;
    }

    if (
      helyettesito.tipus ===
      "hidroxi"
    ) {
      const oxigenIndex =
        atomok.length;

      atomok.push("O");

      elozetPoziciok.push(
  gyurutolKifelePozicio(
    gyuruIndex,
    90
  )
);

      kotesek.push([
        gyuruIndex,
        oxigenIndex,
        1,
      ]);

      continue;
    }

    console.error(
      "[NÉVTÁR HIBA] Ismeretlen benzolhelyettesítő:",
      helyettesito.tipus,
      adatok.id
    );
  }

  return {
    id: adatok.id,

    osszegkeplet:
      adatok.osszegkeplet,

    izomerCsoportId:
      adatok.izomerCsoportId,

    alapvazId:
      adatok.alapvazId ??
      adatok.id,

    csaladok: [
      ...(adatok.csaladok ?? [
        "aromas",
      ]),
    ],

    nehezseg:
      adatok.nehezseg ?? 1,

    atomok,
    kotesek,

elozetPoziciok:
  Array.isArray(
    adatok.elozetPoziciok
  )
    ? adatok.elozetPoziciok.map(
        (pozicio) => ({
          x: Number(pozicio.x),
          y: Number(pozicio.y),
        })
      )
    : elozetPoziciok.map(
        (pozicio) => ({
          x: pozicio.x,
          y: pozicio.y,
        })
      ),

    nevek: {
      preferalt:
        adatok.iupacNev,

      alternativak: [
        ...(adatok.alternativak ??
          []),
      ],
    },

    sztereokemia: {
      statusz: "nincs",
      kiralisCentrumok: [],
      kettosKotesek: [],
      gyuruKapcsolatok: [],
      cukor: null,
    },
  };
}

// ==================================================
// EGYENES, NYÍLT SZÉNLÁNC GENERÁTORA
// ==================================================

function nyiltSzenlancKeszitese(
  adatok
) {
  const szenDarab =
    Math.round(
      Number(
        adatok.szenDarab
      )
    );

  if (
    !Number.isInteger(szenDarab) ||
    szenDarab < 1
  ) {
    console.error(
      "[NÉVTÁR HIBA] Érvénytelen szénatomszám:",
      adatok.id,
      adatok.szenDarab
    );

    return null;
  }

  const atomok =
    Array(szenDarab).fill("C");

  const kotesrendek =
    Array(
      Math.max(
        0,
        szenDarab - 1
      )
    ).fill(1);

  /*
   * A pozíció azt jelenti, hogy
   * melyik szénatom után található
   * a többszörös kötés.
   *
   * Például:
   * pozíció 1, rend 2 → C1=C2
   */

  for (
    const kotesAdat of
    adatok.tobbszorosKotesek ??
      []
  ) {
    const pozicio =
      Number(
        kotesAdat.pozicio
      );

    const rend =
      Number(
        kotesAdat.rend
      );

    const ervenyesPozicio =
      Number.isInteger(pozicio) &&
      pozicio >= 1 &&
      pozicio < szenDarab;

    const ervenyesRend =
      rend === 2 ||
      rend === 3;

    if (
      !ervenyesPozicio ||
      !ervenyesRend
    ) {
      console.error(
        "[NÉVTÁR HIBA] Érvénytelen többszörös kötés:",
        adatok.id,
        kotesAdat
      );

      continue;
    }

    kotesrendek[
      pozicio - 1
    ] = rend;
  }

  const kotesek = [];

  for (
    let index = 0;
    index < szenDarab - 1;
    index += 1
  ) {
    kotesek.push([
      index,
      index + 1,
      kotesrendek[index],
    ]);
  }

  /*
 * Egyszerű, egyenes oldalláncok
 * hozzáadása a főlánchoz.
 *
 * hossz: 1 → metilcsoport
 * hossz: 2 → etilcsoport
 * hossz: 3 → propilcsoport
 */

for (
  const elagazas of
  adatok.elagazasok ?? []
) {
  const pozicio =
    Number(
      elagazas.pozicio
    );

  const hossz =
    Number(
      elagazas.hossz
    );

  const ervenyesPozicio =
    Number.isInteger(pozicio) &&
    pozicio >= 1 &&
    pozicio <= szenDarab;

  const ervenyesHossz =
    Number.isInteger(hossz) &&
    hossz >= 1;

  if (
    !ervenyesPozicio ||
    !ervenyesHossz
  ) {
    console.error(
      "[NÉVTÁR HIBA] Érvénytelen elágazás:",
      adatok.id,
      elagazas
    );

    continue;
  }

  const foLancAtomIndex =
    pozicio - 1;

  let elozoAtomIndex =
    foLancAtomIndex;

  for (
    let oldallancIndex = 0;
    oldallancIndex < hossz;
    oldallancIndex += 1
  ) {
    const ujAtomIndex =
      atomok.length;

    atomok.push("C");

    kotesek.push([
      elozoAtomIndex,
      ujAtomIndex,
      1,
    ]);

    elozoAtomIndex =
      ujAtomIndex;
  }
}

/*
 * Összetett oldalláncok.
 *
 * lancHossz:
 *   az oldallánc saját fő láncának hossza.
 *
 * Az oldalláncon belüli pozíciószámozás
 * mindig a főlánchoz kapcsolódó szénatomtól indul.
 */

for (
  const osszetettElagazas of
  adatok.osszetettElagazasok ?? []
) {
  const foLancPozicio =
    Number(
      osszetettElagazas.pozicio
    );

  const oldallancHossz =
    Number(
      osszetettElagazas.lancHossz
    );

  const ervenyesFoLancPozicio =
    Number.isInteger(
      foLancPozicio
    ) &&
    foLancPozicio >= 1 &&
    foLancPozicio <= szenDarab;

  const ervenyesOldallancHossz =
    Number.isInteger(
      oldallancHossz
    ) &&
    oldallancHossz >= 1;

  if (
    !ervenyesFoLancPozicio ||
    !ervenyesOldallancHossz
  ) {
    console.error(
      "[NÉVTÁR HIBA] Érvénytelen összetett elágazás:",
      adatok.id,
      osszetettElagazas
    );

    continue;
  }

  const oldallancAtomIndexek = [];

  let elozoAtomIndex =
    foLancPozicio - 1;

  for (
    let index = 0;
    index < oldallancHossz;
    index += 1
  ) {
    const ujAtomIndex =
      atomok.length;

    atomok.push("C");

    kotesek.push([
      elozoAtomIndex,
      ujAtomIndex,
      1,
    ]);

    oldallancAtomIndexek.push(
      ujAtomIndex
    );

    elozoAtomIndex =
      ujAtomIndex;
  }

  for (
    const belsoElagazas of
    osszetettElagazas.elagazasok ?? []
  ) {
    const belsoPozicio =
      Number(
        belsoElagazas.pozicio
      );

    const belsoHossz =
      Number(
        belsoElagazas.hossz
      );

    const ervenyesBelsoPozicio =
      Number.isInteger(
        belsoPozicio
      ) &&
      belsoPozicio >= 1 &&
      belsoPozicio <=
        oldallancHossz;

    const ervenyesBelsoHossz =
      Number.isInteger(
        belsoHossz
      ) &&
      belsoHossz >= 1;

    if (
      !ervenyesBelsoPozicio ||
      !ervenyesBelsoHossz
    ) {
      console.error(
        "[NÉVTÁR HIBA] Érvénytelen belső elágazás:",
        adatok.id,
        belsoElagazas
      );

      continue;
    }

    let elozoBelsoAtomIndex =
      oldallancAtomIndexek[
        belsoPozicio - 1
      ];

    for (
      let index = 0;
      index < belsoHossz;
      index += 1
    ) {
      const ujAtomIndex =
        atomok.length;

      atomok.push("C");

      kotesek.push([
        elozoBelsoAtomIndex,
        ujAtomIndex,
        1,
      ]);

      elozoBelsoAtomIndex =
        ujAtomIndex;
    }
  }
}

/*
 * Oxigéntartalmú funkciós csoportok.
 *
 * hidroxi:
 *   a főlánc adott szénatomjához
 *   egy –OH-csoport kapcsolódik.
 *
 * alkoxi:
 *   a főlánchoz –O–R csoport
 *   kapcsolódik.
 */

for (
  const csoport of
  adatok.funkciosCsoportok ?? []
) {
  const pozicio =
    Number(
      csoport.pozicio
    );

  const ervenyesPozicio =
    Number.isInteger(pozicio) &&
    pozicio >= 1 &&
    pozicio <= szenDarab;

  if (!ervenyesPozicio) {
    console.error(
      "[NÉVTÁR HIBA] Érvénytelen funkcióscsoport-pozíció:",
      adatok.id,
      csoport
    );

    continue;
  }

  const foLancAtomIndex =
    pozicio - 1;

  if (
    csoport.tipus ===
    "hidroxi"
  ) {
    const oxigenIndex =
      atomok.length;

    atomok.push("O");

    kotesek.push([
      foLancAtomIndex,
      oxigenIndex,
      1,
    ]);

    continue;
  }

  if (
    csoport.tipus ===
    "alkoxi"
  ) {
    const alkilSzenDarab =
      Number(
        csoport.szenDarab
      );

    if (
      !Number.isInteger(
        alkilSzenDarab
      ) ||
      alkilSzenDarab < 1
    ) {
      console.error(
        "[NÉVTÁR HIBA] Érvénytelen alkoxicsoport:",
        adatok.id,
        csoport
      );

      continue;
    }

    const oxigenIndex =
      atomok.length;

    atomok.push("O");

    kotesek.push([
      foLancAtomIndex,
      oxigenIndex,
      1,
    ]);

    let elozoAtomIndex =
      oxigenIndex;

    for (
      let index = 0;
      index < alkilSzenDarab;
      index += 1
    ) {
      const ujSzenIndex =
        atomok.length;

      atomok.push("C");

      kotesek.push([
        elozoAtomIndex,
        ujSzenIndex,
        1,
      ]);

      elozoAtomIndex =
        ujSzenIndex;
    }

    continue;
  }

  if (
  csoport.tipus ===
  "karbonil"
) {
  const oxigenIndex =
    atomok.length;

  atomok.push("O");

  kotesek.push([
    foLancAtomIndex,
    oxigenIndex,
    2,
  ]);

  continue;
}

  console.error(
    "[NÉVTÁR HIBA] Ismeretlen funkciós csoport:",
    adatok.id,
    csoport.tipus
  );
}
  return {
    id: adatok.id,

    osszegkeplet:
      adatok.osszegkeplet,

    izomerCsoportId:
      adatok.izomerCsoportId,

    alapvazId:
      adatok.alapvazId ??
      adatok.id,

    csaladok: [
      ...(adatok.csaladok ?? [
        "nyilt-lancu",
      ]),
    ],

    nehezseg:
      adatok.nehezseg ?? 1,

    atomok,
kotesek,

elozetPoziciok:
  Array.isArray(
    adatok.elozetPoziciok
  )
    ? adatok.elozetPoziciok.map(
        (pozicio) => ({
          x: Number(pozicio.x),
          y: Number(pozicio.y),
        })
      )
    : null,

nevek: {
      preferalt:
        adatok.iupacNev,

      alternativak: [
        ...(adatok.alternativak ??
          []),
      ],
    },

    sztereokemia: {
  statusz:
  adatok.sztereoStatusz ??
  (
    (
      adatok
        .sztereoKettosKotesek
        ?.length > 0
    ) ||
    (
      adatok
        .sztereoKiralisCentrumok
        ?.length > 0
    )
      ? "meghatarozott"
      : "nincs"
  ),

kiralisCentrumok: (
  adatok
    .sztereoKiralisCentrumok ??
  []
).map((centrum) => ({
  atomIndex:
    Number(
      centrum.atomIndex
    ),

  prioritasIndexek: (
    centrum.prioritasIndexek ??
    []
  ).map(
    (index) => Number(index)
  ),

  konfiguracio:
    String(
      centrum.konfiguracio
    ).toUpperCase(),

  kiemeltAtomIndex:
    Number(
      centrum.kiemeltAtomIndex
    ),

  elozetIrany:
    centrum.elozetIrany ===
    "hatra"
      ? "hatra"
      : "elo",
})),

  kettosKotesek: (
    adatok
      .sztereoKettosKotesek ??
    []
  ).map((kotes) => ({
    atom1Index:
      Number(
        kotes.atom1Index
      ),

    atom2Index:
      Number(
        kotes.atom2Index
      ),

    elsoPrioritasIndex:
      Number(
        kotes.elsoPrioritasIndex
      ),

    masodikPrioritasIndex:
      Number(
        kotes.masodikPrioritasIndex
      ),

    konfiguracio:
      String(
        kotes.konfiguracio
      ).toUpperCase(),
  })),

  gyuruKapcsolatok: [],
  cukor: null,
},
  };
}

// ==================================================
// ELLENŐRZÖTT MOLEKULANÉVTÁR
// ==================================================

const MOLEKULA_NEVTAR = [
  {
    id: "terc-butil-metil-eter",
    osszegkeplet: "C5H12O",
    izomerCsoportId: "C5H12O",
    alapvazId: "terc-butil-metil-eter",
    
    csaladok: [
     "eter",
     "elagazo",
  ],

  nehezseg: 2,

    atomok: [
      "C", // 0: központi szén
      "C", // 1
      "C", // 2
      "C", // 3
      "O", // 4
      "C", // 5
    ],

    kotesek: [
      [0, 1, 1],
      [0, 2, 1],
      [0, 3, 1],
      [0, 4, 1],
      [4, 5, 1],
    ],

    nevek: {
  preferalt: "2-metoxi-2-metilpropán",

  alternativak: [
    {
      nev: "terc-butil-metil-éter",
      tipus: "trivialis",
    },
    {
      nev: "metil-terc-butil-éter",
      tipus: "trivialis",
    },
    {
      nev: "tert-butil-metil-éter",
      tipus: "trivialis",
    },
    {
      nev: "metil-tert-butil-éter",
      tipus: "trivialis",
    },
  ],
},
sztereokemia: {
  statusz: "nincs",

  kiralisCentrumok: [],
  kettosKotesek: [],
  gyuruKapcsolatok: [],
  cukor: null,
},
  },

  {
    id: "izobutil-metil-eter",

      osszegkeplet: "C5H12O",
  izomerCsoportId: "C5H12O",
  alapvazId: "izobutil-metil-eter",

  csaladok: [
    "eter",
    "elagazo",
  ],

  nehezseg: 2,

    atomok: [
      "C", // 0: elágazási szén
      "C", // 1
      "C", // 2
      "C", // 3: CH2
      "O", // 4
      "C", // 5
    ],

    kotesek: [
      [0, 1, 1],
      [0, 2, 1],
      [0, 3, 1],
      [3, 4, 1],
      [4, 5, 1],
    ],

    nevek: {
  preferalt: "1-metoxi-2-metilpropán",

  alternativak: [
    {
      nev: "izobutil-metil-éter",
      tipus: "trivialis",
    },
    {
      nev: "metil-izobutil-éter",
      tipus: "trivialis",
    },
  ],
},
sztereokemia: {
  statusz: "nincs",

  kiralisCentrumok: [],
  kettosKotesek: [],
  gyuruKapcsolatok: [],
  cukor: null,
},
  },
];

// ==================================================
// BENZOLVÁZAS MOLEKULÁK
// ==================================================

MOLEKULA_NEVTAR.push(
  benzolSzarmazekKeszitese({
    id: "benzol",
    osszegkeplet: "C6H6",
    izomerCsoportId: "C6H6",

    csaladok: [
      "aromas",
      "szenhidrogen",
    ],

    nehezseg: 1,

    iupacNev: "benzol",

    alternativak: [],

    helyettesitok: [],
  }),

  benzolSzarmazekKeszitese({
    id: "metilbenzol",
    osszegkeplet: "C7H8",
    izomerCsoportId: "C7H8",

    csaladok: [
      "aromas",
      "alkilbenzol",
    ],

    nehezseg: 1,

    iupacNev:
  "toluol",

alternativak: [
  {
    nev: "metilbenzol",
    tipus: "altalanos-iupac",
  },
],

    helyettesitok: [
      {
        pozicio: 1,
        tipus: "metil",
      },
    ],
  }),

  benzolSzarmazekKeszitese({
    id: "etilbenzol",
    osszegkeplet: "C8H10",
    izomerCsoportId: "C8H10",

    csaladok: [
      "aromas",
      "alkilbenzol",
    ],

    nehezseg: 1,

    iupacNev: "etilbenzol",

    alternativak: [],

    helyettesitok: [
      {
        pozicio: 1,
        tipus: "etil",
      },
    ],
  }),

  benzolSzarmazekKeszitese({
    id: "1-2-dimetilbenzol",
    osszegkeplet: "C8H10",
    izomerCsoportId: "C8H10",

    csaladok: [
      "aromas",
      "alkilbenzol",
    ],

    nehezseg: 2,

    iupacNev:
      "1,2-dimetilbenzol",

    alternativak: [
      {
        nev: "o-xilol",
        tipus: "trivialis",
      },
      {
        nev: "orto-xilol",
        tipus: "trivialis",
      },
    ],

    helyettesitok: [
      {
        pozicio: 1,
        tipus: "metil",
      },
      {
        pozicio: 2,
        tipus: "metil",
      },
    ],
  }),

  benzolSzarmazekKeszitese({
    id: "1-3-dimetilbenzol",
    osszegkeplet: "C8H10",
    izomerCsoportId: "C8H10",

    csaladok: [
      "aromas",
      "alkilbenzol",
    ],

    nehezseg: 2,

    iupacNev:
      "1,3-dimetilbenzol",

    alternativak: [
      {
        nev: "m-xilol",
        tipus: "trivialis",
      },
      {
        nev: "meta-xilol",
        tipus: "trivialis",
      },
    ],

    helyettesitok: [
      {
        pozicio: 1,
        tipus: "metil",
      },
      {
        pozicio: 3,
        tipus: "metil",
      },
    ],
  }),

  benzolSzarmazekKeszitese({
    id: "1-4-dimetilbenzol",
    osszegkeplet: "C8H10",
    izomerCsoportId: "C8H10",

    csaladok: [
      "aromas",
      "alkilbenzol",
    ],

    nehezseg: 2,

    iupacNev:
      "1,4-dimetilbenzol",

    alternativak: [
      {
        nev: "p-xilol",
        tipus: "trivialis",
      },
      {
        nev: "para-xilol",
        tipus: "trivialis",
      },
    ],

    helyettesitok: [
      {
        pozicio: 1,
        tipus: "metil",
      },
      {
        pozicio: 4,
        tipus: "metil",
      },
    ],
  }),

  benzolSzarmazekKeszitese({
    id: "2-metilfenol",
    osszegkeplet: "C7H8O",
    izomerCsoportId: "C7H8O",

    csaladok: [
      "fenol",
      "aromas",
    ],

    nehezseg: 2,

    iupacNev:
      "2-metilfenol",

    alternativak: [
  {
    nev: "o-krezol",
    tipus: "trivialis",
  },
  {
    nev: "orto-krezol",
    tipus: "trivialis",
  },
  {
    nev: "o-metilfenol",
    tipus: "trivialis",
  },
  {
    nev: "orto-metilfenol",
    tipus: "trivialis",
  },
],

    helyettesitok: [
      {
        pozicio: 1,
        tipus: "hidroxi",
      },
      {
        pozicio: 2,
        tipus: "metil",
      },
    ],
  }),

  benzolSzarmazekKeszitese({
    id: "3-metilfenol",
    osszegkeplet: "C7H8O",
    izomerCsoportId: "C7H8O",

    csaladok: [
      "fenol",
      "aromas",
    ],

    nehezseg: 2,

    iupacNev:
      "3-metilfenol",

    alternativak: [
  {
    nev: "m-krezol",
    tipus: "trivialis",
  },
  {
    nev: "meta-krezol",
    tipus: "trivialis",
  },
  {
    nev: "m-metilfenol",
    tipus: "trivialis",
  },
  {
    nev: "meta-metilfenol",
    tipus: "trivialis",
  },
],

    helyettesitok: [
      {
        pozicio: 1,
        tipus: "hidroxi",
      },
      {
        pozicio: 3,
        tipus: "metil",
      },
    ],
  }),

  benzolSzarmazekKeszitese({
    id: "4-metilfenol",
    osszegkeplet: "C7H8O",
    izomerCsoportId: "C7H8O",

    csaladok: [
      "fenol",
      "aromas",
    ],

    nehezseg: 2,

    iupacNev:
      "4-metilfenol",

    alternativak: [
  {
    nev: "p-krezol",
    tipus: "trivialis",
  },
  {
    nev: "para-krezol",
    tipus: "trivialis",
  },
  {
    nev: "p-metilfenol",
    tipus: "trivialis",
  },
  {
    nev: "para-metilfenol",
    tipus: "trivialis",
  },
],

    helyettesitok: [
      {
        pozicio: 1,
        tipus: "hidroxi",
      },
      {
        pozicio: 4,
        tipus: "metil",
      },
    ],
  })
);

// ==================================================
// ELÁGAZÓ ALKÁNOK
// ==================================================

MOLEKULA_NEVTAR.push(
  nyiltSzenlancKeszitese({
    id: "2-metilbutan",
    osszegkeplet: "C5H12",
    izomerCsoportId: "C5H12",

    csaladok: [
      "alkan",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 2,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    iupacNev:
      "2-metilbután",

    alternativak: [
      {
        nev: "izopentán",
        tipus: "trivialis",
      },
    ],
  }),

  nyiltSzenlancKeszitese({
    id: "2-2-dimetilpropan",
    osszegkeplet: "C5H12",
    izomerCsoportId: "C5H12",

    csaladok: [
      "alkan",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 2,
    szenDarab: 3,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    iupacNev:
      "2,2-dimetilpropán",

    alternativak: [
      {
        nev: "neopentán",
        tipus: "trivialis",
      },
    ],
  }),

  nyiltSzenlancKeszitese({
    id: "2-metilpentan",
    osszegkeplet: "C6H14",
    izomerCsoportId: "C6H14",

    csaladok: [
      "alkan",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 2,
    szenDarab: 5,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    iupacNev:
      "2-metilpentán",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "3-metilpentan",
    osszegkeplet: "C6H14",
    izomerCsoportId: "C6H14",

    csaladok: [
      "alkan",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 2,
    szenDarab: 5,

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    iupacNev:
      "3-metilpentán",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "2-2-dimetilbutan",
    osszegkeplet: "C6H14",
    izomerCsoportId: "C6H14",

    csaladok: [
      "alkan",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    iupacNev:
      "2,2-dimetilbután",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "2-3-dimetilbutan",
    osszegkeplet: "C6H14",
    izomerCsoportId: "C6H14",

    csaladok: [
      "alkan",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    elozetPoziciok: [
  { x: -150, y: 30 },
  { x: -50, y: 0 },
  { x: 50, y: 0 },
  { x: 150, y: 30 },
  { x: -50, y: -90 },
  { x: 50, y: 90 },
],

    iupacNev:
      "2,3-dimetilbután",

    alternativak: [],
  })
);

// ==================================================
// ELÁGAZÓ ALKÉNEK
// ==================================================

MOLEKULA_NEVTAR.push(
  nyiltSzenlancKeszitese({
    id: "2-metilbut-1-en",
    osszegkeplet: "C5H10",
    izomerCsoportId: "C5H10",

    csaladok: [
      "alken",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 2,
    szenDarab: 4,

    tobbszorosKotesek: [
      {
        pozicio: 1,
        rend: 2,
      },
    ],

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    iupacNev:
      "2-metilbut-1-én",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "3-metilbut-1-en",
    osszegkeplet: "C5H10",
    izomerCsoportId: "C5H10",

    csaladok: [
      "alken",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 2,
    szenDarab: 4,

    tobbszorosKotesek: [
      {
        pozicio: 1,
        rend: 2,
      },
    ],

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    iupacNev:
      "3-metilbut-1-én",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "2-metilbut-2-en",
    osszegkeplet: "C5H10",
    izomerCsoportId: "C5H10",

    csaladok: [
      "alken",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 4,

    tobbszorosKotesek: [
      {
        pozicio: 2,
        rend: 2,
      },
    ],

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    iupacNev:
      "2-metilbut-2-én",

    alternativak: [],
  })
);

// ==================================================
// ELÁGAZÓ ALKINEK
// ==================================================

MOLEKULA_NEVTAR.push(
  nyiltSzenlancKeszitese({
    id: "3-metilbut-1-in",
    osszegkeplet: "C5H8",
    izomerCsoportId: "C5H8",

    csaladok: [
      "alkin",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 2,
    szenDarab: 4,

    tobbszorosKotesek: [
      {
        pozicio: 1,
        rend: 3,
      },
    ],

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    iupacNev:
      "3-metilbut-1-in",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "3-3-dimetilbut-1-in",
    osszegkeplet: "C6H10",
    izomerCsoportId: "C6H10",

    csaladok: [
      "alkin",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 4,

    tobbszorosKotesek: [
      {
        pozicio: 1,
        rend: 3,
      },
    ],

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    iupacNev:
      "3,3-dimetilbut-1-in",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "4-metilpent-1-in",
    osszegkeplet: "C6H10",
    izomerCsoportId: "C6H10",

    csaladok: [
      "alkin",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 5,

    tobbszorosKotesek: [
      {
        pozicio: 1,
        rend: 3,
      },
    ],

    elagazasok: [
      {
        pozicio: 4,
        hossz: 1,
      },
    ],

    iupacNev:
      "4-metilpent-1-in",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "4-metilpent-2-in",
    osszegkeplet: "C6H10",
    izomerCsoportId: "C6H10",

    csaladok: [
      "alkin",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 5,

    tobbszorosKotesek: [
      {
        pozicio: 2,
        rend: 3,
      },
    ],

    elagazasok: [
      {
        pozicio: 4,
        hossz: 1,
      },
    ],

    iupacNev:
      "4-metilpent-2-in",

    alternativak: [],
  })
);

// ==================================================
// ELÁGAZÓ ALKOHOLOK
// ==================================================

MOLEKULA_NEVTAR.push(
  nyiltSzenlancKeszitese({
    id: "2-metilpropan-1-ol",
    osszegkeplet: "C4H10O",
    izomerCsoportId: "C4H10O",

    csaladok: [
      "alkohol",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 2,
    szenDarab: 3,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "hidroxi",
        pozicio: 1,
      },
    ],

    iupacNev:
      "2-metilpropán-1-ol",

    alternativak: [
      {
        nev: "izobutil-alkohol",
        tipus: "trivialis",
      },
      {
        nev: "izobutanol",
        tipus: "trivialis",
      },
    ],
  }),

  nyiltSzenlancKeszitese({
    id: "2-metilpropan-2-ol",
    osszegkeplet: "C4H10O",
    izomerCsoportId: "C4H10O",

    csaladok: [
      "alkohol",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 2,
    szenDarab: 3,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "hidroxi",
        pozicio: 2,
      },
    ],

    iupacNev:
      "2-metilpropán-2-ol",

    alternativak: [
  {
    nev: "terc-butil-alkohol",
    tipus: "trivialis",
  },
  {
    nev: "terc-butanol",
    tipus: "trivialis",
  },
],
  }),

  nyiltSzenlancKeszitese({
    id: "3-metilbutan-1-ol",
    osszegkeplet: "C5H12O",
    izomerCsoportId: "C5H12O",

    csaladok: [
      "alkohol",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 2,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "hidroxi",
        pozicio: 1,
      },
    ],

    iupacNev:
      "3-metilbután-1-ol",

    alternativak: [
      {
        nev: "izoamil-alkohol",
        tipus: "trivialis",
      },
      {
        nev: "izopentil-alkohol",
        tipus: "trivialis",
      },
    ],
  }),

  nyiltSzenlancKeszitese({
    id: "2-2-dimetilpropan-1-ol",
    osszegkeplet: "C5H12O",
    izomerCsoportId: "C5H12O",

    csaladok: [
      "alkohol",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 3,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "hidroxi",
        pozicio: 1,
      },
    ],

    iupacNev:
      "2,2-dimetilpropán-1-ol",

    alternativak: [
      {
        nev: "neopentil-alkohol",
        tipus: "trivialis",
      },
    ],
  }),

  nyiltSzenlancKeszitese({
    id: "2-metilbutan-2-ol",
    osszegkeplet: "C5H12O",
    izomerCsoportId: "C5H12O",

    csaladok: [
      "alkohol",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "hidroxi",
        pozicio: 2,
      },
    ],

    iupacNev:
      "2-metilbután-2-ol",

    alternativak: [
  {
    nev: "terc-amil-alkohol",
    tipus: "trivialis",
  },
  {
    nev: "terc-pentanol",
    tipus: "trivialis",
  },
],
  })
);

// ==================================================
// ELÁGAZÓ ÉTEREK
// ==================================================

MOLEKULA_NEVTAR.push(
  nyiltSzenlancKeszitese({
    id: "1-etoxi-2-metilpropan",
    osszegkeplet: "C6H14O",
    izomerCsoportId: "C6H14O",

    csaladok: [
      "eter",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 3,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "alkoxi",
        pozicio: 1,
        szenDarab: 2,
      },
    ],

    iupacNev:
      "1-etoxi-2-metilpropán",

    alternativak: [
      {
        nev: "etil-izobutil-éter",
        tipus: "trivialis",
      },
      {
        nev: "izobutil-etil-éter",
        tipus: "trivialis",
      },
    ],
  }),

  nyiltSzenlancKeszitese({
    id: "2-etoxi-2-metilpropan",
    osszegkeplet: "C6H14O",
    izomerCsoportId: "C6H14O",

    csaladok: [
      "eter",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 3,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "alkoxi",
        pozicio: 2,
        szenDarab: 2,
      },
    ],

    iupacNev:
      "2-etoxi-2-metilpropán",

    alternativak: [
      {
        nev: "etil-terc-butil-éter",
        tipus: "trivialis",
      },
      {
        nev: "terc-butil-etil-éter",
        tipus: "trivialis",
      },
      {
        nev: "etil-tert-butil-éter",
        tipus: "trivialis",
      },
      {
        nev: "ETBE",
        tipus: "rovidites",
      },
    ],
  }),

  nyiltSzenlancKeszitese({
    id: "1-metoxi-3-metilbutan",
    osszegkeplet: "C6H14O",
    izomerCsoportId: "C6H14O",

    csaladok: [
      "eter",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "alkoxi",
        pozicio: 1,
        szenDarab: 1,
      },
    ],

    iupacNev:
      "1-metoxi-3-metilbután",

    alternativak: [
      {
        nev: "metil-izoamil-éter",
        tipus: "trivialis",
      },
      {
        nev: "izoamil-metil-éter",
        tipus: "trivialis",
      },
    ],
  }),

  nyiltSzenlancKeszitese({
    id: "2-metoxi-2-metilbutan",
    osszegkeplet: "C6H14O",
    izomerCsoportId: "C6H14O",

    csaladok: [
      "eter",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "alkoxi",
        pozicio: 2,
        szenDarab: 1,
      },
    ],

    iupacNev:
      "2-metoxi-2-metilbután",

    alternativak: [
      {
        nev: "terc-amil-metil-éter",
        tipus: "trivialis",
      },
      {
        nev: "metil-terc-amil-éter",
        tipus: "trivialis",
      },
      {
        nev: "TAME",
        tipus: "rovidites",
      },
    ],
  })
);

// ==================================================
// ELÁGAZÓ ALDEHIDEK
// ==================================================

MOLEKULA_NEVTAR.push(
  nyiltSzenlancKeszitese({
    id: "3-metilbutanal",
    osszegkeplet: "C5H10O",
    izomerCsoportId: "C5H10O",

    csaladok: [
      "aldehid",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 2,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
    ],

    iupacNev:
      "3-metilbutanal",

    alternativak: [
      {
        nev: "izovaleraldehid",
        tipus: "trivialis",
      },
    ],
  }),

  nyiltSzenlancKeszitese({
    id: "2-2-dimetilpropanal",
    osszegkeplet: "C5H10O",
    izomerCsoportId: "C5H10O",

    csaladok: [
      "aldehid",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 3,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
    ],

    iupacNev:
      "2,2-dimetilpropanal",

    alternativak: [
      {
        nev: "pivalaldehid",
        tipus: "trivialis",
      },
    ],
  }),

  nyiltSzenlancKeszitese({
    id: "4-metilpentanal",
    osszegkeplet: "C6H12O",
    izomerCsoportId: "C6H12O",

    csaladok: [
      "aldehid",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 5,

    elagazasok: [
      {
        pozicio: 4,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
    ],

    iupacNev:
      "4-metilpentanal",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "3-3-dimetilbutanal",
    osszegkeplet: "C6H12O",
    izomerCsoportId: "C6H12O",

    csaladok: [
      "aldehid",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
    ],

    iupacNev:
      "3,3-dimetilbutanal",

    alternativak: [],
  })
);

// ==================================================
// ELÁGAZÓ KETONOK
// ==================================================

MOLEKULA_NEVTAR.push(
  nyiltSzenlancKeszitese({
    id: "3-metilbutan-2-on",
    osszegkeplet: "C5H10O",
    izomerCsoportId: "C5H10O",

    csaladok: [
      "keton",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 2,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 2,
      },
    ],

    iupacNev:
      "3-metilbután-2-on",

    alternativak: [
      {
        nev: "metil-izopropil-keton",
        tipus: "trivialis",
      },
    ],
  }),

  nyiltSzenlancKeszitese({
    id: "4-metilpentan-2-on",
    osszegkeplet: "C6H12O",
    izomerCsoportId: "C6H12O",

    csaladok: [
      "keton",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 5,

    elagazasok: [
      {
        pozicio: 4,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 2,
      },
    ],

    iupacNev:
      "4-metilpentán-2-on",

    alternativak: [
      {
        nev: "metil-izobutil-keton",
        tipus: "trivialis",
      },
      {
        nev: "MIBK",
        tipus: "rovidites",
      },
    ],
  }),

  nyiltSzenlancKeszitese({
    id: "3-3-dimetilbutan-2-on",
    osszegkeplet: "C6H12O",
    izomerCsoportId: "C6H12O",

    csaladok: [
      "keton",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 2,
      },
    ],

    iupacNev:
      "3,3-dimetilbután-2-on",

    alternativak: [
      {
        nev: "pinakolon",
        tipus: "trivialis",
      },
      {
        nev: "terc-butil-metil-keton",
        tipus: "trivialis",
      },
    ],
  })
);

// ==================================================
// ELÁGAZÓ KARBONSAVAK
// ==================================================

MOLEKULA_NEVTAR.push(
  nyiltSzenlancKeszitese({
    id: "2-metilpropansav",
    osszegkeplet: "C4H8O2",
    izomerCsoportId: "C4H8O2",

    csaladok: [
      "karbonsav",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 2,
    szenDarab: 3,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "hidroxi",
        pozicio: 1,
      },
    ],

    iupacNev:
      "2-metilpropánsav",

    alternativak: [
      {
        nev: "izovajsav",
        tipus: "trivialis",
      },
    ],
  }),

  nyiltSzenlancKeszitese({
    id: "3-metilbutansav",
    osszegkeplet: "C5H10O2",
    izomerCsoportId: "C5H10O2",

    csaladok: [
      "karbonsav",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 2,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "hidroxi",
        pozicio: 1,
      },
    ],

    iupacNev:
      "3-metilbutánsav",

    alternativak: [
      {
        nev: "izovaleriánsav",
        tipus: "trivialis",
      },
    ],
  }),

  nyiltSzenlancKeszitese({
    id: "2-2-dimetilpropansav",
    osszegkeplet: "C5H10O2",
    izomerCsoportId: "C5H10O2",

    csaladok: [
      "karbonsav",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 3,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "hidroxi",
        pozicio: 1,
      },
    ],

    iupacNev:
      "2,2-dimetilpropánsav",

    alternativak: [
      {
        nev: "pivalinsav",
        tipus: "trivialis",
      },
    ],
  }),

  nyiltSzenlancKeszitese({
    id: "4-metilpentansav",
    osszegkeplet: "C6H12O2",
    izomerCsoportId: "C6H12O2",

    csaladok: [
      "karbonsav",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 5,

    elagazasok: [
      {
        pozicio: 4,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "hidroxi",
        pozicio: 1,
      },
    ],

    iupacNev:
      "4-metilpentánsav",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "2-2-dimetilbutansav",
    osszegkeplet: "C6H12O2",
    izomerCsoportId: "C6H12O2",

    csaladok: [
      "karbonsav",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "hidroxi",
        pozicio: 1,
      },
    ],

    iupacNev:
      "2,2-dimetilbutánsav",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "3-3-dimetilbutansav",
    osszegkeplet: "C6H12O2",
    izomerCsoportId: "C6H12O2",

    csaladok: [
      "karbonsav",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "hidroxi",
        pozicio: 1,
      },
    ],

    iupacNev:
      "3,3-dimetilbutánsav",

    alternativak: [],
  })
);

// ==================================================
// ELÁGAZÓ ÉSZTEREK
// ==================================================

MOLEKULA_NEVTAR.push(
  nyiltSzenlancKeszitese({
    id: "metil-2-metilpropanoat",
    osszegkeplet: "C5H10O2",
    izomerCsoportId: "C5H10O2",

    csaladok: [
      "eszter",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 3,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "alkoxi",
        pozicio: 1,
        szenDarab: 1,
      },
    ],

    iupacNev:
      "metil-2-metilpropanoát",

    alternativak: [
      {
        nev: "metil-izobutirát",
        tipus: "trivialis",
      },
    ],
  }),

  nyiltSzenlancKeszitese({
    id: "etil-2-metilpropanoat",
    osszegkeplet: "C6H12O2",
    izomerCsoportId: "C6H12O2",

    csaladok: [
      "eszter",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 3,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "alkoxi",
        pozicio: 1,
        szenDarab: 2,
      },
    ],

    iupacNev:
      "etil-2-metilpropanoát",

    alternativak: [
      {
        nev: "etil-izobutirát",
        tipus: "trivialis",
      },
    ],
  }),

  nyiltSzenlancKeszitese({
    id: "metil-3-metilbutanoat",
    osszegkeplet: "C6H12O2",
    izomerCsoportId: "C6H12O2",

    csaladok: [
      "eszter",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "alkoxi",
        pozicio: 1,
        szenDarab: 1,
      },
    ],

    iupacNev:
      "metil-3-metilbutanoát",

    alternativak: [
      {
        nev: "metil-izovalerát",
        tipus: "trivialis",
      },
    ],
  }),

  nyiltSzenlancKeszitese({
    id: "metil-2-2-dimetilpropanoat",
    osszegkeplet: "C6H12O2",
    izomerCsoportId: "C6H12O2",

    csaladok: [
      "eszter",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 3,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "alkoxi",
        pozicio: 1,
        szenDarab: 1,
      },
    ],

    iupacNev:
      "metil-2,2-dimetilpropanoát",

    alternativak: [
      {
        nev: "metil-pivalát",
        tipus: "trivialis",
      },
    ],
  }),

  nyiltSzenlancKeszitese({
    id: "etil-3-metilbutanoat",
    osszegkeplet: "C7H14O2",
    izomerCsoportId: "C7H14O2",

    csaladok: [
      "eszter",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "alkoxi",
        pozicio: 1,
        szenDarab: 2,
      },
    ],

    iupacNev:
      "etil-3-metilbutanoát",

    alternativak: [
      {
        nev: "etil-izovalerát",
        tipus: "trivialis",
      },
    ],
  }),

  nyiltSzenlancKeszitese({
    id: "metil-4-metilpentanoat",
    osszegkeplet: "C7H14O2",
    izomerCsoportId: "C7H14O2",

    csaladok: [
      "eszter",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 5,

    elagazasok: [
      {
        pozicio: 4,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "alkoxi",
        pozicio: 1,
        szenDarab: 1,
      },
    ],

    elozetPoziciok: [
  { x: -140, y: 0 },
  { x: -70, y: 35 },
  { x: 0, y: 0 },
  { x: 70, y: 35 },
  { x: 140, y: 0 },
  { x: 70, y: 120 },
  { x: -140, y: -90 },
  { x: -220, y: 35 },
  { x: -290, y: 0 },
],

    iupacNev:
      "metil-4-metilpentanoát",

    alternativak: [],
  })
);

// ==================================================
// TÖBBFUNKCIÓS ALKOHOLOK ÉS KETONOK
// ==================================================

MOLEKULA_NEVTAR.push(
  nyiltSzenlancKeszitese({
    id: "2-metilpropan-1-2-diol",
    osszegkeplet: "C4H10O2",
    izomerCsoportId: "C4H10O2",

    csaladok: [
      "diol",
      "alkohol",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 3,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "hidroxi",
        pozicio: 1,
      },
      {
        tipus: "hidroxi",
        pozicio: 2,
      },
    ],

    elozetPoziciok: [
  { x: -90, y: 0 },   // 0: CH2
  { x: 0, y: 0 },     // 1: központi C
  { x: 90, y: 55 },   // 2: láncvégi metil
  { x: 90, y: -55 },  // 3: metil-oldallánc
  { x: -175, y: 0 },  // 4: OH az 1. szénen
  { x: 0, y: -95 },   // 5: OH a 2. szénen
],

    iupacNev:
      "2-metilpropán-1,2-diol",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "2-2-dimetilpropan-1-3-diol",
    osszegkeplet: "C5H12O2",
    izomerCsoportId: "C5H12O2",

    csaladok: [
      "diol",
      "alkohol",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 3,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "hidroxi",
        pozicio: 1,
      },
      {
        tipus: "hidroxi",
        pozicio: 3,
      },
    ],

    elozetPoziciok: [
  { x: -100, y: 0 },  // 0: CH2OH
  { x: 0, y: 0 },     // 1: központi C
  { x: 100, y: 0 },   // 2: CH2OH
  { x: 0, y: -90 },   // 3: metilcsoport
  { x: 0, y: 90 },    // 4: metilcsoport
  { x: -180, y: 0 },  // 5: bal oldali OH
  { x: 180, y: 0 },   // 6: jobb oldali OH
],

    iupacNev:
      "2,2-dimetilpropán-1,3-diol",

    alternativak: [
      {
        nev: "neopentil-glikol",
        tipus: "trivialis",
      },
    ],
  }),

  nyiltSzenlancKeszitese({
    id: "3-hidroxi-3-metilbutan-2-on",
    osszegkeplet: "C5H10O2",
    izomerCsoportId: "C5H10O2",

    csaladok: [
      "hidroxi-keton",
      "keton",
      "alkohol",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 2,
      },
      {
        tipus: "hidroxi",
        pozicio: 3,
      },
    ],

    elozetPoziciok: [
  { x: -160, y: 0 },  // 0: láncvégi metil
  { x: -60, y: 0 },   // 1: karbonil-szén
  { x: 50, y: 0 },    // 2: hidroxilt hordozó C
  { x: 140, y: 55 },  // 3: láncvégi metil
  { x: 140, y: -55 }, // 4: metil-oldallánc
  { x: -60, y: -95 }, // 5: karbonil-oxigén
  { x: 50, y: 95 },   // 6: hidroxilcsoport
],

    iupacNev:
      "3-hidroxi-3-metilbután-2-on",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "4-hidroxi-4-metilpentan-2-on",
    osszegkeplet: "C6H12O2",
    izomerCsoportId: "C6H12O2",

    csaladok: [
      "hidroxi-keton",
      "keton",
      "alkohol",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 5,

    elagazasok: [
      {
        pozicio: 4,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 2,
      },
      {
        tipus: "hidroxi",
        pozicio: 4,
      },
    ],

    elozetPoziciok: [
  { x: -220, y: 0 },  // 0: láncvégi metil
  { x: -120, y: 0 },  // 1: karbonil-szén
  { x: -20, y: 0 },   // 2: C3
  { x: 80, y: 0 },    // 3: hidroxilt hordozó C
  { x: 170, y: 55 },  // 4: láncvégi metil
  { x: 170, y: -55 }, // 5: metil-oldallánc
  { x: -120, y: -95 },// 6: karbonil-oxigén
  { x: 80, y: 95 },   // 7: hidroxilcsoport
],

    iupacNev:
      "4-hidroxi-4-metilpentán-2-on",

    alternativak: [
      {
        nev: "diaceton-alkohol",
        tipus: "trivialis",
      },
    ],
  })
);

// ==================================================
// HIDROXI-ALDEHIDEK ÉS HIDROXI-KARBONSAVAK
// ==================================================

MOLEKULA_NEVTAR.push(
  nyiltSzenlancKeszitese({
    id: "3-hidroxi-3-metilbutanal",
    osszegkeplet: "C5H10O2",
    izomerCsoportId: "C5H10O2",

    csaladok: [
      "hidroxi-aldehid",
      "aldehid",
      "alkohol",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "hidroxi",
        pozicio: 3,
      },
    ],

    iupacNev:
      "3-hidroxi-3-metilbutanal",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "4-hidroxi-4-metilpentanal",
    osszegkeplet: "C6H12O2",
    izomerCsoportId: "C6H12O2",

    csaladok: [
      "hidroxi-aldehid",
      "aldehid",
      "alkohol",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 5,

    elagazasok: [
      {
        pozicio: 4,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "hidroxi",
        pozicio: 4,
      },
    ],

    iupacNev:
      "4-hidroxi-4-metilpentanal",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "3-hidroxi-3-metilbutansav",
    osszegkeplet: "C5H10O3",
    izomerCsoportId: "C5H10O3",

    csaladok: [
      "hidroxi-karbonsav",
      "karbonsav",
      "alkohol",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "hidroxi",
        pozicio: 1,
      },
      {
        tipus: "hidroxi",
        pozicio: 3,
      },
    ],

    elozetPoziciok: [
  { x: -140, y: 0 },   // 0: karboxil-szén
  { x: -40, y: 0 },    // 1: C2
  { x: 60, y: 0 },     // 2: hidroxilt hordozó C
  { x: 150, y: 55 },   // 3: láncvégi metil
  { x: 150, y: -55 },  // 4: metil-oldallánc
  { x: -140, y: -95 }, // 5: karbonil-oxigén
  { x: -230, y: 55 },  // 6: karboxilcsoport OH-ja
  { x: 60, y: 95 },    // 7: alkoholos OH
],

    iupacNev:
      "3-hidroxi-3-metilbutánsav",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "4-hidroxi-4-metilpentansav",
    osszegkeplet: "C6H12O3",
    izomerCsoportId: "C6H12O3",

    csaladok: [
      "hidroxi-karbonsav",
      "karbonsav",
      "alkohol",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 5,

    elagazasok: [
      {
        pozicio: 4,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "hidroxi",
        pozicio: 1,
      },
      {
        tipus: "hidroxi",
        pozicio: 4,
      },
    ],

    iupacNev:
      "4-hidroxi-4-metilpentánsav",

    alternativak: [],
  })
);

// ==================================================
// OXOKARBONSAVAK
// ==================================================

MOLEKULA_NEVTAR.push(
  nyiltSzenlancKeszitese({
    id: "2-2-dimetil-3-oxobutansav",
    osszegkeplet: "C6H10O3",
    izomerCsoportId: "C6H10O3",

    csaladok: [
      "oxokarbonsav",
      "karbonsav",
      "keton",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "hidroxi",
        pozicio: 1,
      },
      {
        tipus: "karbonil",
        pozicio: 3,
      },
    ],

    iupacNev:
      "2,2-dimetil-3-oxobutánsav",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "4-metil-3-oxopentansav",
    osszegkeplet: "C6H10O3",
    izomerCsoportId: "C6H10O3",

    csaladok: [
      "oxokarbonsav",
      "karbonsav",
      "keton",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 5,

    elagazasok: [
      {
        pozicio: 4,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "hidroxi",
        pozicio: 1,
      },
      {
        tipus: "karbonil",
        pozicio: 3,
      },
    ],

    iupacNev:
      "4-metil-3-oxopentánsav",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "2-2-dimetil-4-oxopentansav",
    osszegkeplet: "C7H12O3",
    izomerCsoportId: "C7H12O3",

    csaladok: [
      "oxokarbonsav",
      "karbonsav",
      "keton",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 5,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "hidroxi",
        pozicio: 1,
      },
      {
        tipus: "karbonil",
        pozicio: 4,
      },
    ],

    elozetPoziciok: [
  { x: -220, y: 0 },   // 0: karboxil-szén
  { x: -120, y: 0 },   // 1: két metilt hordozó C
  { x: -20, y: 0 },    // 2: C3
  { x: 80, y: 0 },     // 3: ketocsoport szénje
  { x: 180, y: 0 },    // 4: láncvégi metil

  { x: -120, y: -95 }, // 5: első metilág
  { x: -120, y: 95 },  // 6: második metilág

  { x: -220, y: -95 }, // 7: karboxil karbonil-O
  { x: -310, y: 55 },  // 8: karboxil OH
  { x: 80, y: -95 },   // 9: ketocsoport oxigénje
],

    iupacNev:
      "2,2-dimetil-4-oxopentánsav",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "4-4-dimetil-3-oxopentansav",
    osszegkeplet: "C7H12O3",
    izomerCsoportId: "C7H12O3",

    csaladok: [
      "oxokarbonsav",
      "karbonsav",
      "keton",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 5,

    elagazasok: [
      {
        pozicio: 4,
        hossz: 1,
      },
      {
        pozicio: 4,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "hidroxi",
        pozicio: 1,
      },
      {
        tipus: "karbonil",
        pozicio: 3,
      },
    ],

    iupacNev:
      "4,4-dimetil-3-oxopentánsav",

    alternativak: [],
  })
);

// ==================================================
// HIDROXIÉSZTEREK ÉS OXOÉSZTEREK
// ==================================================

MOLEKULA_NEVTAR.push(
  nyiltSzenlancKeszitese({
    id: "metil-3-hidroxi-3-metilbutanoat",
    osszegkeplet: "C6H12O3",
    izomerCsoportId: "C6H12O3",

    csaladok: [
      "hidroxi-eszter",
      "eszter",
      "alkohol",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "alkoxi",
        pozicio: 1,
        szenDarab: 1,
      },
      {
        tipus: "hidroxi",
        pozicio: 3,
      },
    ],

    elozetPoziciok: [
  { x: -160, y: 0 },   // 0: észter karbonil-szén
  { x: -60, y: 0 },    // 1: C2
  { x: 50, y: 0 },     // 2: hidroxilt hordozó C
  { x: 140, y: 55 },   // 3: láncvégi metil
  { x: 140, y: -55 },  // 4: metil-oldallánc
  { x: -160, y: -95 }, // 5: karbonil-oxigén
  { x: -250, y: 55 },  // 6: észter egyszeres O
  { x: -340, y: 55 },  // 7: észter metilcsoportja
  { x: 50, y: 95 },    // 8: hidroxilcsoport
],

    iupacNev:
      "metil-3-hidroxi-3-metilbutanoát",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "etil-3-hidroxi-3-metilbutanoat",
    osszegkeplet: "C7H14O3",
    izomerCsoportId: "C7H14O3",

    csaladok: [
      "hidroxi-eszter",
      "eszter",
      "alkohol",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "alkoxi",
        pozicio: 1,
        szenDarab: 2,
      },
      {
        tipus: "hidroxi",
        pozicio: 3,
      },
    ],

    elozetPoziciok: [
  { x: -120, y: 0 },   // 0: észter karbonil-szén
  { x: -20, y: 0 },    // 1: C2
  { x: 90, y: 0 },     // 2: hidroxilt hordozó C
  { x: 180, y: 55 },   // 3: láncvégi metil
  { x: 180, y: -55 },  // 4: metil-oldallánc
  { x: -120, y: -95 }, // 5: karbonil-oxigén
  { x: -210, y: 55 },  // 6: észter egyszeres O
  { x: -300, y: 55 },  // 7: etilcsoport első C-je
  { x: -390, y: 55 },  // 8: etilcsoport végi C-je
  { x: 90, y: 95 },    // 9: hidroxilcsoport
],

    iupacNev:
      "etil-3-hidroxi-3-metilbutanoát",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "metil-4-hidroxi-4-metilpentanoat",
    osszegkeplet: "C7H14O3",
    izomerCsoportId: "C7H14O3",

    csaladok: [
      "hidroxi-eszter",
      "eszter",
      "alkohol",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 5,

    elagazasok: [
      {
        pozicio: 4,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "alkoxi",
        pozicio: 1,
        szenDarab: 1,
      },
      {
        tipus: "hidroxi",
        pozicio: 4,
      },
    ],

      elozetPoziciok: [
  { x: -180, y: 0 },   // 0: észter karbonil-szén
  { x: -80, y: 0 },    // 1: C2
  { x: 20, y: 0 },     // 2: C3
  { x: 120, y: 0 },    // 3: C4
  { x: 210, y: 55 },   // 4: láncvégi metil
  { x: 210, y: -55 },  // 5: metil-oldallánc
  { x: -180, y: -90 }, // 6: karbonil-oxigén
  { x: -270, y: 60 },  // 7: észter egyszeres O
  { x: -360, y: 60 },  // 8: észter metilcsoportja
  { x: 120, y: -95 },  // 9: hidroxilcsoport
],

    iupacNev:
      "metil-4-hidroxi-4-metilpentanoát",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "metil-2-2-dimetil-3-oxobutanoat",
    osszegkeplet: "C7H12O3",
    izomerCsoportId: "C7H12O3",

    csaladok: [
      "oxo-eszter",
      "eszter",
      "keton",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "alkoxi",
        pozicio: 1,
        szenDarab: 1,
      },
      {
        tipus: "karbonil",
        pozicio: 3,
      },
    ],

    iupacNev:
      "metil-2,2-dimetil-3-oxobutanoát",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "etil-2-2-dimetil-3-oxobutanoat",
    osszegkeplet: "C8H14O3",
    izomerCsoportId: "C8H14O3",

    csaladok: [
      "oxo-eszter",
      "eszter",
      "keton",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 4,

    elagazasok: [
      {
        pozicio: 2,
        hossz: 1,
      },
      {
        pozicio: 2,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "alkoxi",
        pozicio: 1,
        szenDarab: 2,
      },
      {
        tipus: "karbonil",
        pozicio: 3,
      },
    ],

    iupacNev:
      "etil-2,2-dimetil-3-oxobutanoát",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "metil-4-metil-3-oxopentanoat",
    osszegkeplet: "C7H12O3",
    izomerCsoportId: "C7H12O3",

    csaladok: [
      "oxo-eszter",
      "eszter",
      "keton",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 5,

    elagazasok: [
      {
        pozicio: 4,
        hossz: 1,
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "alkoxi",
        pozicio: 1,
        szenDarab: 1,
      },
      {
        tipus: "karbonil",
        pozicio: 3,
      },
    ],

    elozetPoziciok: [
      { x: -140, y: 0 },
      { x: -70, y: 35 },
      { x: 0, y: 0 },
      { x: 70, y: 35 },
      { x: 140, y: 0 },
      { x: 70, y: 120 },
      { x: -140, y: -90 },
      { x: -220, y: 35 },
      { x: -290, y: 0 },
      { x: 0, y: -90 },
    ],

    iupacNev:
      "metil-4-metil-3-oxopentanoát",

    alternativak: [],
  })
);

// ==================================================
// ÖSSZETETT SZUBSZTITUENSEK
// ==================================================

function kiralisOsszetettHeptanParKeszitese(
  adatok
) {
  return ["R", "S"].map(
    (konfiguracio) => {
      const iupacNev =
        typeof adatok
          .sztereoIupacNevKeszito ===
        "function"
          ? adatok
              .sztereoIupacNevKeszito(
                konfiguracio
              )
          : `(4${konfiguracio})-${adatok.iupacNev}`;

      const alternativak =
        typeof adatok
          .sztereoAlternativakKeszito ===
        "function"
          ? adatok
              .sztereoAlternativakKeszito(
                konfiguracio
              )
          : (
              adatok.alternativak ?? []
            ).map(
              (alternativa) => ({
                ...alternativa,
                nev:
                  `(4${konfiguracio})-` +
                  alternativa.nev,
              })
            );

      return nyiltSzenlancKeszitese({
        ...adatok,

        id:
          `4${konfiguracio}-` +
          adatok.id,

        izomerCsoportId:
          `${adatok.id}-R-S`,

        alapvazId:
          adatok.id,

        csaladok: [
          ...(adatok.csaladok ?? []),
          "sztereoizomer",
          "enantiomer",
          "R-S",
        ],

        sztereoKiralisCentrumok: [
          {
            atomIndex: 3,

            /*
             * CIP-sorrend:
             * 1,1-dimetiletil >
             * funkciós csoport felőli lánc >
             * propil > H
             */
            prioritasIndexek: [
              7,
              2,
              4,
            ],

            konfiguracio,

            kiemeltAtomIndex: 7,

            elozetIrany:
              konfiguracio === "R"
                ? "elo"
                : "hatra",
          },
        ],

        iupacNev,
        alternativak,
      });
    }
  );
}

MOLEKULA_NEVTAR.push(
  ...kiralisOsszetettHeptanParKeszitese({
    id: "4-1-1-dimetiletil-heptan-1-ol",
    osszegkeplet: "C11H24O",
    izomerCsoportId: "C11H24O",

    csaladok: [
      "alkohol",
      "osszetett-szubsztituens",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 7,

    osszetettElagazasok: [
      {
        pozicio: 4,
        lancHossz: 2,

        elagazasok: [
          {
            pozicio: 1,
            hossz: 1,
          },
          {
            pozicio: 1,
            hossz: 1,
          },
        ],
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "hidroxi",
        pozicio: 1,
      },
    ],

    iupacNev:
      "4-(1,1-dimetiletil)heptán-1-ol",

    alternativak: [
      {
        nev: "4-terc-butilheptán-1-ol",
        tipus: "trivialis",
      },
    ],
  }),

  ...kiralisOsszetettHeptanParKeszitese({
    id: "4-1-1-dimetiletil-heptan-2-on",
    osszegkeplet: "C11H22O",
    izomerCsoportId: "C11H22O",

    csaladok: [
      "keton",
      "osszetett-szubsztituens",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 7,

    osszetettElagazasok: [
      {
        pozicio: 4,
        lancHossz: 2,

        elagazasok: [
          {
            pozicio: 1,
            hossz: 1,
          },
          {
            pozicio: 1,
            hossz: 1,
          },
        ],
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 2,
      },
    ],

    iupacNev:
      "4-(1,1-dimetiletil)heptán-2-on",

    alternativak: [
      {
        nev: "4-terc-butilheptán-2-on",
        tipus: "trivialis",
      },
    ],
  }),

  ...kiralisOsszetettHeptanParKeszitese({
    id: "4-1-1-dimetiletil-heptansav",
    osszegkeplet: "C11H22O2",
    izomerCsoportId: "C11H22O2",

    csaladok: [
      "karbonsav",
      "osszetett-szubsztituens",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 7,

    osszetettElagazasok: [
      {
        pozicio: 4,
        lancHossz: 2,

        elagazasok: [
          {
            pozicio: 1,
            hossz: 1,
          },
          {
            pozicio: 1,
            hossz: 1,
          },
        ],
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "hidroxi",
        pozicio: 1,
      },
    ],

    iupacNev:
      "4-(1,1-dimetiletil)heptánsav",

    alternativak: [
      {
        nev: "4-terc-butilheptánsav",
        tipus: "trivialis",
      },
    ],
  }),

  ...kiralisOsszetettHeptanParKeszitese({
    id: "metil-4-1-1-dimetiletil-heptanoat",
    osszegkeplet: "C12H24O2",
    izomerCsoportId: "C12H24O2",

    csaladok: [
      "eszter",
      "osszetett-szubsztituens",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 7,

    osszetettElagazasok: [
      {
        pozicio: 4,
        lancHossz: 2,

        elagazasok: [
          {
            pozicio: 1,
            hossz: 1,
          },
          {
            pozicio: 1,
            hossz: 1,
          },
        ],
      },
    ],

    funkciosCsoportok: [
      {
        tipus: "karbonil",
        pozicio: 1,
      },
      {
        tipus: "alkoxi",
        pozicio: 1,
        szenDarab: 1,
      },
    ],

    elozetPoziciok: [
  { x: -240, y: 0 },
  { x: -160, y: 35 },
  { x: -80, y: 0 },
  { x: 0, y: 35 },
  { x: 80, y: 0 },
  { x: 160, y: 35 },
  { x: 240, y: 0 },

  { x: 0, y: 140 },
{ x: 0, y: 225 },
{ x: -75, y: 180 },
{ x: 75, y: 180 },

  { x: -240, y: -90 },
  { x: -320, y: 35 },
  { x: -400, y: 0 },
],

    sztereoIupacNevKeszito:
  (konfiguracio) =>
    `metil-(4${konfiguracio})-4-(1,1-dimetiletil)heptanoát`,

sztereoAlternativakKeszito:
  (konfiguracio) => [
    {
      nev:
        `metil-(4${konfiguracio})-4-terc-butilheptanoát`,
      tipus: "trivialis",
    },
  ],

    iupacNev:
      "metil-4-(1,1-dimetiletil)heptanoát",

    alternativak: [
      {
        nev: "metil-4-terc-butilheptanoát",
        tipus: "trivialis",
      },
    ],
  })
);

MOLEKULA_NEVTAR.push(
  nyiltSzenlancKeszitese({
    id: "6-1-2-dimetilpropil-4-etil-3-8-dimetilundekan",
    osszegkeplet: "C20H42",
    izomerCsoportId: "C20H42",

    csaladok: [
      "alkan",
      "osszetett-szubsztituens",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 11,

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
      {
        pozicio: 4,
        hossz: 2,
      },
      {
        pozicio: 8,
        hossz: 1,
      },
    ],

    osszetettElagazasok: [
      {
        pozicio: 6,
        lancHossz: 3,

        elagazasok: [
          {
            pozicio: 1,
            hossz: 1,
          },
          {
            pozicio: 2,
            hossz: 1,
          },
        ],
      },
    ],

    elozetPoziciok: [
  // 0–10: az undekán főlánca
  { x: -350, y: 0 },
  { x: -280, y: 25 },
  { x: -210, y: 0 },
  { x: -140, y: 25 },
  { x: -70, y: 0 },
  { x: 0, y: 25 },
  { x: 70, y: 0 },
  { x: 140, y: 25 },
  { x: 210, y: 0 },
  { x: 280, y: 25 },
  { x: 350, y: 0 },

  // 11: metilcsoport a 3. szénen
  { x: -210, y: -85 },

  // 12–13: etilcsoport a 4. szénen
  { x: -140, y: 110 },
  { x: -140, y: 195 },

  // 14: metilcsoport a 8. szénen
  { x: 140, y: -85 },

  // 15–17: az összetett oldallánc
  { x: 0, y: -75 },
  { x: 0, y: -155 },
  { x: 0, y: -235 },

  // 18–19: az oldallánc két metilága
  { x: -90, y: -75 },
  { x: 90, y: -155 },
],

    iupacNev:
      "6-(1,2-dimetilpropil)-4-etil-3,8-dimetilundekán",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "6-1-1-2-trimetilpropil-4-etil-3-8-dimetilundekan",
    osszegkeplet: "C21H44",
    izomerCsoportId: "C21H44",

    csaladok: [
      "alkan",
      "osszetett-szubsztituens",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 11,

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
      {
        pozicio: 4,
        hossz: 2,
      },
      {
        pozicio: 8,
        hossz: 1,
      },
    ],

    osszetettElagazasok: [
      {
        pozicio: 6,
        lancHossz: 3,

        elagazasok: [
          {
            pozicio: 1,
            hossz: 1,
          },
          {
            pozicio: 1,
            hossz: 1,
          },
          {
            pozicio: 2,
            hossz: 1,
          },
        ],
      },
    ],

    elozetPoziciok: [
  // 0–10: undekán főlánc
  { x: -350, y: 0 },
  { x: -280, y: 25 },
  { x: -210, y: 0 },
  { x: -140, y: 25 },
  { x: -70, y: 0 },
  { x: 0, y: 25 },
  { x: 70, y: 0 },
  { x: 140, y: 25 },
  { x: 210, y: 0 },
  { x: 280, y: 25 },
  { x: 350, y: 0 },

  // 11: metilcsoport a 3. szénen
  { x: -210, y: -85 },

  // 12–13: etilcsoport a 4. szénen
  { x: -140, y: 110 },
  { x: -140, y: 195 },

  // 14: metilcsoport a 8. szénen
  { x: 140, y: -85 },

  // 15–17: összetett oldallánc váza
  { x: 0, y: -75 },
  { x: 0, y: -165 },
  { x: 0, y: -255 },

  // 18–19: két metilág az első oldallánci C-n
  { x: -95, y: -75 },
  { x: 95, y: -75 },

  // 20: metilág a második oldallánci C-n
  { x: 95, y: -165 },
],

    // ID: 6-1-1-2-trimetilpropil-4-etil-3-8-dimetilundekan
iupacNev:
  "4-etil-3,8-dimetil-6-(1,1,2-trimetilpropil)undekán",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "6-1-etil-1-metilpropil-3-8-dimetilundekan",
    osszegkeplet: "C19H40",
    izomerCsoportId: "C19H40",

    csaladok: [
      "alkan",
      "osszetett-szubsztituens",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 11,

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
      {
        pozicio: 8,
        hossz: 1,
      },
    ],

    osszetettElagazasok: [
      {
        pozicio: 6,
        lancHossz: 3,

        elagazasok: [
          {
            pozicio: 1,
            hossz: 2,
          },
          {
            pozicio: 1,
            hossz: 1,
          },
        ],
      },
    ],

    elozetPoziciok: [
  // 0–10: undekán főlánc
  { x: -350, y: 0 },
  { x: -280, y: 25 },
  { x: -210, y: 0 },
  { x: -140, y: 25 },
  { x: -70, y: 0 },
  { x: 0, y: 25 },
  { x: 70, y: 0 },
  { x: 140, y: 25 },
  { x: 210, y: 0 },
  { x: 280, y: 25 },
  { x: 350, y: 0 },

  // 11: metilcsoport a 3. szénen
  { x: -210, y: -85 },

  // 12: metilcsoport a 8. szénen
  { x: 140, y: -85 },

  // 13–15: összetett oldallánc váza
  { x: 0, y: -75 },
  { x: 0, y: -165 },
  { x: 0, y: -255 },

  // 16–17: etilág
  { x: -95, y: -75 },
  { x: -95, y: -165 },

  // 18: metilág
  { x: 95, y: -75 },
],

    iupacNev:
  "6-(1-etil-1-metilpropil)-3,8-dimetilundekán",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "5-1-1-dimetiletil-3-9-dietil-7-1-1-2-trimetilpropil-undekan",
    osszegkeplet: "C25H52",
    izomerCsoportId: "C25H52",

    csaladok: [
      "alkan",
      "tobb-osszetett-szubsztituens",
      "osszetett-szubsztituens",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 11,

    elagazasok: [
      {
        pozicio: 3,
        hossz: 2,
      },
      {
        pozicio: 9,
        hossz: 2,
      },
    ],

    osszetettElagazasok: [
      {
        pozicio: 5,
        lancHossz: 2,

        elagazasok: [
          {
            pozicio: 1,
            hossz: 1,
          },
          {
            pozicio: 1,
            hossz: 1,
          },
        ],
      },
      {
        pozicio: 7,
        lancHossz: 3,

        elagazasok: [
          {
            pozicio: 1,
            hossz: 1,
          },
          {
            pozicio: 1,
            hossz: 1,
          },
          {
            pozicio: 2,
            hossz: 1,
          },
        ],
      },
    ],

    elozetPoziciok: [
  // 0–10: az undekán főlánca
  { x: -350, y: 0 },
  { x: -280, y: 25 },
  { x: -210, y: 0 },
  { x: -140, y: 25 },
  { x: -70, y: 0 },
  { x: 0, y: 25 },
  { x: 70, y: 0 },
  { x: 140, y: 25 },
  { x: 210, y: 0 },
  { x: 280, y: 25 },
  { x: 350, y: 0 },

  // 11–12: etilcsoport a 3. szénen
  { x: -210, y: 90 },
  { x: -210, y: 175 },

  // 13–14: etilcsoport a 9. szénen
  { x: 210, y: -90 },
  { x: 210, y: -175 },

  // 15–18: 1,1-dimetiletil-csoport
  { x: -70, y: -90 },
  { x: -70, y: -175 },
  { x: -155, y: -90 },
  { x: 15, y: -90 },

  // 19–24: 1,1,2-trimetilpropil-csoport
  { x: 70, y: 90 },
  { x: 70, y: 175 },
  { x: 70, y: 260 },
  { x: -15, y: 90 },
  { x: 155, y: 90 },
  { x: 155, y: 175 },
],

    iupacNev:
      "5-(1,1-dimetiletil)-3,9-dietil-7-(1,1,2-trimetilpropil)undekán",

    alternativak: [],
  })
);

// ==================================================
// E/Z-SZTEREOIZOMEREK
// ==================================================

MOLEKULA_NEVTAR.push(
  nyiltSzenlancKeszitese({
    id: "E-3-metilpent-2-en",
    osszegkeplet: "C6H12",

    izomerCsoportId:
      "3-metilpent-2-en-E-Z",

    alapvazId:
      "3-metilpent-2-en",

    csaladok: [
      "alken",
      "sztereoizomer",
      "E-Z",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 5,

    tobbszorosKotesek: [
      {
        pozicio: 2,
        rend: 2,
      },
    ],

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    sztereoKettosKotesek: [
      {
        atom1Index: 1,
        atom2Index: 2,
        elsoPrioritasIndex: 0,
        masodikPrioritasIndex: 3,
        konfiguracio: "E",
      },
    ],

    elozetPoziciok: [
      { x: -90, y: -55 },
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 190, y: 55 },
      { x: 275, y: 10 },
      { x: 190, y: -55 },
    ],

    // E-3-metilpent-2-en
iupacNev:
  "(2E)-3-metilpent-2-én",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "Z-3-metilpent-2-en",
    osszegkeplet: "C6H12",

    izomerCsoportId:
      "3-metilpent-2-en-E-Z",

    alapvazId:
      "3-metilpent-2-en",

    csaladok: [
      "alken",
      "sztereoizomer",
      "E-Z",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 5,

    tobbszorosKotesek: [
      {
        pozicio: 2,
        rend: 2,
      },
    ],

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
    ],

    sztereoKettosKotesek: [
      {
        atom1Index: 1,
        atom2Index: 2,
        elsoPrioritasIndex: 0,
        masodikPrioritasIndex: 3,
        konfiguracio: "Z",
      },
    ],

    elozetPoziciok: [
      { x: -90, y: -55 },
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 190, y: -55 },
      { x: 275, y: -10 },
      { x: 190, y: 55 },
    ],

    // Z-3-metilpent-2-en
iupacNev:
  "(2Z)-3-metilpent-2-én",

    alternativak: [],
  })
);

MOLEKULA_NEVTAR.push(
  nyiltSzenlancKeszitese({
    id: "E-3-4-dimetilhept-3-en",
    osszegkeplet: "C9H18",

    izomerCsoportId:
      "3-4-dimetilhept-3-en-E-Z",

    alapvazId:
      "3-4-dimetilhept-3-en",

    csaladok: [
      "alken",
      "sztereoizomer",
      "E-Z",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 7,

    tobbszorosKotesek: [
      {
        pozicio: 3,
        rend: 2,
      },
    ],

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
      {
        pozicio: 4,
        hossz: 1,
      },
    ],

    sztereoKettosKotesek: [
      {
        atom1Index: 2,
        atom2Index: 3,
        elsoPrioritasIndex: 1,
        masodikPrioritasIndex: 4,
        konfiguracio: "E",
      },
    ],

    elozetPoziciok: [
      { x: -160, y: -20 },
      { x: -80, y: -60 },
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 180, y: 60 },
      { x: 260, y: 10 },
      { x: 340, y: 50 },
      { x: -70, y: 70 },
      { x: 170, y: -70 },
    ],

    // E-3-4-dimetilhept-3-en
iupacNev:
  "(3E)-3,4-dimetilhept-3-én",

    alternativak: [],
  }),

  nyiltSzenlancKeszitese({
    id: "Z-3-4-dimetilhept-3-en",
    osszegkeplet: "C9H18",

    izomerCsoportId:
      "3-4-dimetilhept-3-en-E-Z",

    alapvazId:
      "3-4-dimetilhept-3-en",

    csaladok: [
      "alken",
      "sztereoizomer",
      "E-Z",
      "elagazo",
      "nyilt-lancu",
    ],

    nehezseg: 3,
    szenDarab: 7,

    tobbszorosKotesek: [
      {
        pozicio: 3,
        rend: 2,
      },
    ],

    elagazasok: [
      {
        pozicio: 3,
        hossz: 1,
      },
      {
        pozicio: 4,
        hossz: 1,
      },
    ],

    sztereoKettosKotesek: [
      {
        atom1Index: 2,
        atom2Index: 3,
        elsoPrioritasIndex: 1,
        masodikPrioritasIndex: 4,
        konfiguracio: "Z",
      },
    ],

    elozetPoziciok: [
      { x: -160, y: -20 },
      { x: -80, y: -60 },
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 180, y: -60 },
      { x: 260, y: -10 },
      { x: 340, y: -50 },
      { x: -70, y: 70 },
      { x: 170, y: 70 },
    ],

    // Z-3-4-dimetilhept-3-en
iupacNev:
  "(3Z)-3,4-dimetilhept-3-én",

    alternativak: [],
  })
);

function metilNonaDienSztereoizomerKeszitese(
  elsoKonfiguracio,
  masodikKonfiguracio,
  kiralisKonfiguracio = "R"
) {
  const elso =
    String(
      elsoKonfiguracio
    ).toUpperCase();

  const masodik =
    String(
      masodikKonfiguracio
    ).toUpperCase();

  const kiralis =
  String(
    kiralisKonfiguracio
  ).toUpperCase();

const rElozetIrany =
  elso === "E"
    ? "elo"
    : "hatra";

const kiralisElozetIrany =
  kiralis === "R"
    ? rElozetIrany
    : (
        rElozetIrany === "elo"
          ? "hatra"
          : "elo"
      );

  const elsoJobbOldalY =
    elso === "E"
      ? 70
      : -70;

  const masodikJobbOldalY =
    masodik === "E"
      ? 70
      : -70;

  const elagazasY =
    elsoJobbOldalY > 0
      ? 150
      : -150;

  return nyiltSzenlancKeszitese({
    id:
  `2${elso}-4${kiralis}-6${masodik}-4-metilnona-2-6-dien`,

    osszegkeplet: "C10H18",

    izomerCsoportId:
  "4-metilnona-2-6-dien-E-Z-R-S",

    alapvazId:
      "4-metilnona-2-6-dien",

    csaladok: [
  "dien",
  "sztereoizomer",
  "tobb-E-Z",
  "R-S",
  "enantiomer",
  "elagazo",
  "nyilt-lancu",
],

    nehezseg: 3,
    szenDarab: 9,

    tobbszorosKotesek: [
      {
        pozicio: 2,
        rend: 2,
      },
      {
        pozicio: 6,
        rend: 2,
      },
    ],

    elagazasok: [
      {
        pozicio: 4,
        hossz: 1,
      },
    ],

    sztereoKettosKotesek: [
      {
        atom1Index: 1,
        atom2Index: 2,
        elsoPrioritasIndex: 0,
        masodikPrioritasIndex: 3,
        konfiguracio: elso,
      },
      {
        atom1Index: 5,
        atom2Index: 6,
        elsoPrioritasIndex: 4,
        masodikPrioritasIndex: 7,
        konfiguracio: masodik,
      },
    ],

    sztereoKiralisCentrumok: [
  {
    atomIndex: 3,

    /*
     * CIP-sorrend a 4-es szénen:
     *
     * 1. C3 felőli alkenilcsoport
     * 2. C5 felőli láncrész
     * 3. metilcsoport
     * 4. implicit hidrogén
     */
    prioritasIndexek: [
      2,
      4,
      9,
    ],

    konfiguracio:
      kiralis,

    kiemeltAtomIndex: 9,

    elozetIrany:
      kiralisElozetIrany,
  },
],

    elozetPoziciok: [
      { x: -300, y: -70 },
      { x: -230, y: 0 },
      { x: -130, y: 0 },

      {
        x: -60,
        y: elsoJobbOldalY,
      },

      { x: 20, y: -70 },
      { x: 90, y: 0 },
      { x: 190, y: 0 },

      {
        x: 260,
        y: masodikJobbOldalY,
      },

      {
        x: 335,
        y:
          masodikJobbOldalY > 0
            ? 20
            : -20,
      },

      {
        x: -60,
        y: elagazasY,
      },
    ],

    iupacNev:
  `(2${elso},4${kiralis},6${masodik})-4-metilnona-2,6-dién`,

    alternativak: [],
  });
}

MOLEKULA_NEVTAR.push(
  // (2E,6E) geometria
  metilNonaDienSztereoizomerKeszitese(
    "E",
    "E",
    "R"
  ),

  metilNonaDienSztereoizomerKeszitese(
    "E",
    "E",
    "S"
  ),

  // (2E,6Z) geometria
  metilNonaDienSztereoizomerKeszitese(
    "E",
    "Z",
    "R"
  ),

  metilNonaDienSztereoizomerKeszitese(
    "E",
    "Z",
    "S"
  ),

  // (2Z,6E) geometria
  metilNonaDienSztereoizomerKeszitese(
    "Z",
    "E",
    "R"
  ),

  metilNonaDienSztereoizomerKeszitese(
    "Z",
    "E",
    "S"
  ),

  // (2Z,6Z) geometria
  metilNonaDienSztereoizomerKeszitese(
    "Z",
    "Z",
    "R"
  ),

  metilNonaDienSztereoizomerKeszitese(
    "Z",
    "Z",
    "S"
  )
);

// ==================================================
// R/S-SZTEREOIZOMEREK
// ==================================================

MOLEKULA_NEVTAR.push(
  nyiltSzenlancKeszitese({
    id: "2R-butan-2-ol",

    osszegkeplet: "C4H10O",

    izomerCsoportId:
      "butan-2-ol-R-S",

    alapvazId:
      "butan-2-ol",

    csaladok: [
      "alkohol",
      "nyilt-lancu",
      "sztereoizomer",
      "enantiomer",
    ],

    nehezseg: 3,

    szenDarab: 4,

    funkciosCsoportok: [
      {
        tipus: "hidroxi",
        pozicio: 2,
      },
    ],

    sztereoKiralisCentrumok: [
      {
        atomIndex: 1,

        /*
         * CIP-sorrend:
         * OH > etil > metil > H
         */
        prioritasIndexek: [
          4,
          2,
          0,
        ],

        konfiguracio: "R",

        kiemeltAtomIndex: 4,
        elozetIrany: "elo",
      },
    ],

    elozetPoziciok: [
      { x: -90, y: 55 },
      { x: 0, y: 0 },
      { x: 90, y: 55 },
      { x: 175, y: 55 },
      { x: 0, y: -90 },
    ],

    iupacNev:
      "(2R)-bután-2-ol",

    alternativak: [
      {
        nev: "(R)-bután-2-ol",
        tipus: "iupac",
      },
    ],
  })
);

MOLEKULA_NEVTAR.push(
  nyiltSzenlancKeszitese({
    id: "2S-butan-2-ol",

    osszegkeplet: "C4H10O",

    izomerCsoportId:
      "butan-2-ol-R-S",

    alapvazId:
      "butan-2-ol",

    csaladok: [
      "alkohol",
      "nyilt-lancu",
      "sztereoizomer",
      "enantiomer",
    ],

    nehezseg: 3,

    szenDarab: 4,

    funkciosCsoportok: [
      {
        tipus: "hidroxi",
        pozicio: 2,
      },
    ],

    sztereoKiralisCentrumok: [
      {
        atomIndex: 1,

        /*
         * CIP-sorrend:
         * OH > etil > metil > H
         */
        prioritasIndexek: [
          4,
          2,
          0,
        ],

        konfiguracio: "S",

        kiemeltAtomIndex: 4,
        elozetIrany: "hatra",
      },
    ],

    elozetPoziciok: [
      { x: -90, y: 55 },
      { x: 0, y: 0 },
      { x: 90, y: 55 },
      { x: 175, y: 55 },
      { x: 0, y: -90 },
    ],

    iupacNev:
      "(2S)-bután-2-ol",

    alternativak: [
      {
        nev: "(S)-bután-2-ol",
        tipus: "iupac",
      },
    ],
  })
);

const ERVENYES_SZTEREO_STATUSZOK = new Set([
  "nincs",
  "nincs-megadva",
  "nincs-eloiras",
  "meghatarozott",
  "keverek",
]);

// ==================================================
// NÉV NORMALIZÁLÁSA
// ==================================================

function molekulaNevNormalizalasa(nev) {
  return nev
    .trim()
    .toLocaleLowerCase("hu-HU")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[–—−]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[.]$/, "");
}

function molekulaNevBejegyzesek(bejegyzes) {
  // A régi, egyszerű névlista kezelése.
  if (Array.isArray(bejegyzes.nevek)) {
    return bejegyzes.nevek.map(
      (nev, index) => ({
        nev,
        tipus:
          index === 0
            ? "preferalt"
            : "elfogadott",
      })
    );
  }

  // Az új névrendszer kezelése.
  const preferaltNev =
    bejegyzes.nevek?.preferalt;

  const nyersAlternativak =
  Array.isArray(
    bejegyzes.nevek
      ?.alternativak
  )
    ? bejegyzes.nevek
        .alternativak
    : [];

const alternativak =
  nyersAlternativak
    .map(
      (alternativa) => {
        if (
          typeof alternativa ===
            "string"
        ) {
          const nev =
            alternativa.trim();

          if (!nev) {
            return null;
          }

          return {
            nev,
            tipus:
              "elfogadott",
          };
        }

        if (
          alternativa &&
          typeof alternativa ===
            "object" &&
          typeof alternativa.nev ===
            "string"
        ) {
          const nev =
            alternativa.nev.trim();

          if (!nev) {
            return null;
          }

          return {
            ...alternativa,
            nev,

            tipus:
              typeof alternativa
                .tipus === "string"
                ? alternativa.tipus
                : "elfogadott",
          };
        }

        return null;
      }
    )
    .filter(Boolean);

if (!preferaltNev) {
  return [];
}

return [
  {
    nev: preferaltNev,
    tipus: "preferalt",
  },
  ...alternativak,
];
}

function molekulaPreferaltNeve(bejegyzes) {
  return molekulaNevBejegyzesek(
    bejegyzes
  )[0]?.nev ?? null;
}

function molekulaSablonKeresese(
  molekulaId
) {
  return (
    MOLEKULA_NEVTAR.find(
      (bejegyzes) =>
        bejegyzes.id === molekulaId
    ) ?? null
  );
}

function molekulaSablonElozetAdatok(
  molekulaId
) {
  const molekula =
    molekulaSablonKeresese(
      molekulaId
    );

  if (!molekula) {
    console.error(
      "[NÉVTÁR HIBA] Nem található az előnézeti molekula:",
      molekulaId
    );

    return null;
  }

  const atomDarab =
    molekula.atomok.length;

  if (atomDarab === 0) {
    return {
      atomok: [],
      kotesek: [],
    };
  }

  const sugar =
    Math.max(
      70,
      atomDarab * 12
    );

  const poziciok =
    molekula.atomok.map(
      (_, index) => {
        const szog =
          atomDarab === 1
            ? 0
            : (
                2 *
                Math.PI *
                index
              ) / atomDarab;

        return {
          x:
            Math.cos(szog) *
            sugar,

          y:
            Math.sin(szog) *
            sugar,
        };
      }
    );

  // Egyszerű erőalapú elrendezés:
  // a nem kapcsolódó atomok taszítják,
  // a kötések összetartják egymást.
  for (
    let lepes = 0;
    lepes < 180;
    lepes += 1
  ) {
    const erok =
      poziciok.map(() => ({
        x: 0,
        y: 0,
      }));

    for (
      let elso = 0;
      elso < atomDarab;
      elso += 1
    ) {
      for (
        let masodik = elso + 1;
        masodik < atomDarab;
        masodik += 1
      ) {
        let dx =
          poziciok[elso].x -
          poziciok[masodik].x;

        let dy =
          poziciok[elso].y -
          poziciok[masodik].y;

        let tavolsag =
          Math.hypot(dx, dy);

        if (tavolsag < 1) {
          dx = 1;
          dy = 0;
          tavolsag = 1;
        }

        const taszitas =
          2400 /
          (tavolsag * tavolsag);

        const eroX =
          (dx / tavolsag) *
          taszitas;

        const eroY =
          (dy / tavolsag) *
          taszitas;

        erok[elso].x += eroX;
        erok[elso].y += eroY;

        erok[masodik].x -= eroX;
        erok[masodik].y -= eroY;
      }
    }

    for (
      const [
        elsoIndex,
        masodikIndex,
      ] of molekula.kotesek
    ) {
      const dx =
        poziciok[masodikIndex].x -
        poziciok[elsoIndex].x;

      const dy =
        poziciok[masodikIndex].y -
        poziciok[elsoIndex].y;

      const tavolsag =
        Math.max(
          1,
          Math.hypot(dx, dy)
        );

      const idealisTavolsag = 75;

      const rugoEro =
        (
          tavolsag -
          idealisTavolsag
        ) * 0.08;

      const eroX =
        (dx / tavolsag) *
        rugoEro;

      const eroY =
        (dy / tavolsag) *
        rugoEro;

      erok[elsoIndex].x += eroX;
      erok[elsoIndex].y += eroY;

      erok[masodikIndex].x -= eroX;
      erok[masodikIndex].y -= eroY;
    }

    const maximalisMozgas =
      4 *
      (
        1 -
        lepes / 180
      ) +
      0.25;

    poziciok.forEach(
      (pozicio, index) => {
        // Enyhe középre húzás.
        erok[index].x -=
          pozicio.x * 0.01;

        erok[index].y -=
          pozicio.y * 0.01;

        const eroHossz =
          Math.max(
            1,
            Math.hypot(
              erok[index].x,
              erok[index].y
            )
          );

        const arany =
          Math.min(
            1,
            maximalisMozgas /
            eroHossz
          );

        pozicio.x +=
          erok[index].x * arany;

        pozicio.y +=
          erok[index].y * arany;
      }
    );
  }

  /*
 * A gyűrűt nem tartalmazó, automatikusan
 * elrendezett molekulákat vízszintesen
 * széthúzzuk, hogy ne torlódjanak egymásra.
 */

const vanKezilegMegadottElozet =
  Array.isArray(
    molekula.elozetPoziciok
  ) &&
  molekula.elozetPoziciok.length ===
    atomDarab &&
  molekula.elozetPoziciok.every(
    (pozicio) =>
      Number.isFinite(
        pozicio?.x
      ) &&
      Number.isFinite(
        pozicio?.y
      )
  );

const aciklikusSzerkezet =
  molekula.kotesek.length ===
  atomDarab - 1;

if (
  !vanKezilegMegadottElozet &&
  aciklikusSzerkezet
) {
  const aktualisXErtekek =
    poziciok.map(
      (pozicio) => pozicio.x
    );

  const aktualisYErtekek =
    poziciok.map(
      (pozicio) => pozicio.y
    );

  const aktualisSzelesseg =
    Math.max(
      ...aktualisXErtekek
    ) -
    Math.min(
      ...aktualisXErtekek
    );

  const aktualisMagassag =
    Math.max(
      ...aktualisYErtekek
    ) -
    Math.min(
      ...aktualisYErtekek
    );

  /*
   * Ha a rajz magasabb, mint széles,
   * elforgatjuk 90 fokkal.
   */

  if (
    aktualisMagassag >
    aktualisSzelesseg
  ) {
    poziciok.forEach(
      (pozicio) => {
        const regiX =
          pozicio.x;

        pozicio.x =
          pozicio.y;

        pozicio.y =
          -regiX;
      }
    );
  }

  const kozeppontX =
    poziciok.reduce(
      (osszeg, pozicio) =>
        osszeg + pozicio.x,
      0
    ) / atomDarab;

  const kozeppontY =
    poziciok.reduce(
      (osszeg, pozicio) =>
        osszeg + pozicio.y,
      0
    ) / atomDarab;

  poziciok.forEach(
    (pozicio) => {
      pozicio.x =
        kozeppontX +
        (
          pozicio.x -
          kozeppontX
        ) * 2;

      pozicio.y =
        kozeppontY +
        (
          pozicio.y -
          kozeppontY
        ) * 0.55;
    }
  );
}

  /*
 * Ha a molekulához kézzel megadott
 * előnézeti pozíciók tartoznak,
 * azok felülírják az automatikus
 * erőalapú elrendezést.
 */

const megadottPoziciok =
  molekula.elozetPoziciok;

const ervenyesMegadottPoziciok =
  Array.isArray(
    megadottPoziciok
  ) &&
  megadottPoziciok.length ===
    atomDarab &&
  megadottPoziciok.every(
    (pozicio) =>
      Number.isFinite(
        pozicio?.x
      ) &&
      Number.isFinite(
        pozicio?.y
      )
  );

if (ervenyesMegadottPoziciok) {
  megadottPoziciok.forEach(
    (pozicio, index) => {
      poziciok[index] = {
        x: pozicio.x,
        y: pozicio.y,
      };
    }
  );
}

  const atomok =
    molekula.atomok.map(
      (tipus, index) => ({
        id:
          `elozet-atom-${index}`,

        tipus,

        x: poziciok[index].x,
        y: poziciok[index].y,
      })
    );

  function elozetiKotesSztereoKeresese(
  elsoIndex,
  masodikIndex
) {
  const kiralisCentrumok =
    molekula.sztereokemia
      ?.kiralisCentrumok ?? [];

  for (
    const centrum of
    kiralisCentrumok
  ) {
    const normalIrany =
      elsoIndex ===
        centrum.atomIndex &&
      masodikIndex ===
        centrum.kiemeltAtomIndex;

    if (normalIrany) {
      return centrum.elozetIrany;
    }

    const forditottIrany =
      masodikIndex ===
        centrum.atomIndex &&
      elsoIndex ===
        centrum.kiemeltAtomIndex;

    if (forditottIrany) {
      return (
        centrum.elozetIrany ===
        "elo"
          ? "hatra"
          : "elo"
      );
    }
  }

  const pubchemEkKotesek =
  molekula.importAdatok
    ?.pubchemEkKotesek ?? [];

for (const ekKotes of pubchemEkKotesek) {
  if (
    elsoIndex === ekKotes.atomIndex &&
    masodikIndex ===
      ekKotes.kiemeltAtomIndex
  ) {
    return ekKotes.elozetIrany;
  }

  if (
    masodikIndex === ekKotes.atomIndex &&
    elsoIndex ===
      ekKotes.kiemeltAtomIndex
  ) {
    return ekKotes.elozetIrany === "elo"
      ? "hatra"
      : "elo";
  }
}

  return "sik";
}

  const pubchemEkKotesek =
  Array.isArray(
    molekula.importAdatok
      ?.pubchemEkKotesek
  )
    ? molekula.importAdatok
        .pubchemEkKotesek
    : [];

const kotesek =
  molekula.kotesek.map(
    (
      [elsoIndex, masodikIndex, rend],
      index
    ) => {
      const pubchemEk =
        pubchemEkKotesek.find(
          (ek) =>
            (
              ek.atomIndex === elsoIndex &&
              ek.kiemeltAtomIndex ===
                masodikIndex
            ) ||
            (
              ek.atomIndex === masodikIndex &&
              ek.kiemeltAtomIndex ===
                elsoIndex
            )
        );

      return {
        id: `elozet-kotes-${index}`,

        atom1Id:
          `elozet-atom-${
            pubchemEk?.atomIndex ??
            elsoIndex
          }`,

        atom2Id:
          `elozet-atom-${
            pubchemEk?.kiemeltAtomIndex ??
            masodikIndex
          }`,

        rend,

        sztereo:
          pubchemEk?.elozetIrany ??
          elozetiKotesSztereoKeresese(
            elsoIndex,
            masodikIndex
          ),
      };
    }
  );

    return {
    atomok,
    kotesek,

    polimer:
      molekula.polimer ??
      null,
  };
}

// ==================================================
// GRÁF ELŐÁLLÍTÁSA
// ==================================================

function jatekGrafKeszitese(
  atomok,
  kotesek,
  polimerKapcsolatok = []
) {
  const indexek =
    new Map();

  atomok.forEach(
    (atom, index) => {
      indexek.set(
        atom.id,
        index
      );
    }
  );

  const tipusok =
    atomok.map(
      (atom) =>
        atom.tipus
    );

  const matrix =
    Array.from(
      {
        length:
          atomok.length,
      },
      () =>
        Array(
          atomok.length
        ).fill(0)
    );

  for (
    const kotes of
    kotesek
  ) {
    const elsoIndex =
      indexek.get(
        kotes.atom1Id
      );

    const masodikIndex =
      indexek.get(
        kotes.atom2Id
      );

    if (
      elsoIndex ===
        undefined ||
      masodikIndex ===
        undefined
    ) {
      console.error(
        "[NÉVTÁR HIBA] A kötés atomja nem található:",
        kotes
      );

      return null;
    }

    matrix[
      elsoIndex
    ][
      masodikIndex
    ] =
      kotes.rend;

    matrix[
      masodikIndex
    ][
      elsoIndex
    ] =
      kotes.rend;
  }

  const kapcsolatok =
    Array.isArray(
      polimerKapcsolatok
    )
      ? polimerKapcsolatok
      : [];

  const hasznaltAzonositok =
    new Set();

  for (
    const kapcsolat of
    kapcsolatok
  ) {
    const kapcsolodasId =
      String(
        kapcsolat
          ?.kapcsolodasId ??
        ""
      );

    const atomIndex =
      indexek.get(
        kapcsolat?.atomId
      );

    const kotesrend =
      Number(
        kapcsolat?.rend
      );

    if (
      !kapcsolodasId ||
      atomIndex ===
        undefined ||
      ![1, 2, 3].includes(
        kotesrend
      )
    ) {
      console.error(
        "[POLIMER GRÁF HIBA] Érvénytelen külső kapcsolat.",
        {
          kapcsolat,
          kapcsolodasId,
          atomIndex:
            atomIndex ??
            null,
          kotesrend,
        }
      );

      return null;
    }

    if (
      hasznaltAzonositok
        .has(
          kapcsolodasId
        )
    ) {
      console.error(
        "[POLIMER GRÁF HIBA] Többször szereplő kapcsolatazonosító.",
        {
          kapcsolodasId,
          kapcsolatok,
        }
      );

      return null;
    }

    hasznaltAzonositok.add(
      kapcsolodasId
    );

    const virtualisIndex =
      tipusok.length;

    tipusok.push(
      `POLIMER_KAPCSOLAT:${kapcsolodasId}`
    );

    matrix.forEach(
      (sor) => {
        sor.push(0);
      }
    );

    matrix.push(
      Array(
        tipusok.length
      ).fill(0)
    );

    matrix[
      atomIndex
    ][
      virtualisIndex
    ] =
      kotesrend;

    matrix[
      virtualisIndex
    ][
      atomIndex
    ] =
      kotesrend;
  }

  return {
    tipusok,
    matrix,
  };
}

function sablonGrafKeszitese(
  sablon
) {
  const tipusok = [
    ...sablon.atomok,
  ];

  const matrix =
    Array.from(
      {
        length:
          sablon.atomok.length,
      },
      () =>
        Array(
          sablon.atomok.length
        ).fill(0)
    );

  sablon.kotesek.forEach(
    (
      [
        elsoIndex,
        masodikIndex,
        rend,
      ]
    ) => {
      matrix[
        elsoIndex
      ][
        masodikIndex
      ] =
        rend;

      matrix[
        masodikIndex
      ][
        elsoIndex
      ] =
        rend;
    }
  );

  const polimerKapcsolatok =
    sablon
      ?.polimer
      ?.ismetlodEgyseg ===
        true &&
    Array.isArray(
      sablon
        ?.polimer
        ?.kapcsolodasok
    )
      ? sablon
          .polimer
          .kapcsolodasok
      : [];

  const hasznaltAzonositok =
    new Set();

  for (
    const kapcsolat of
    polimerKapcsolatok
  ) {
    const kapcsolodasId =
      String(
        kapcsolat?.id ??
        ""
      );

    const atomIndex =
      Number(
        kapcsolat
          ?.atomIndex
      );

    const kotesrend =
      Number(
        kapcsolat
          ?.kotesrend ??
        1
      );

    if (
      !kapcsolodasId ||
      !Number.isInteger(
        atomIndex
      ) ||
      atomIndex < 0 ||
      atomIndex >=
        sablon.atomok.length ||
      ![1, 2, 3].includes(
        kotesrend
      )
    ) {
      console.error(
        "[POLIMER SABLON HIBA] Érvénytelen kapcsolódási adat.",
        {
          sablonId:
            sablon.id ??
            null,
          kapcsolat,
          kapcsolodasId,
          atomIndex,
          kotesrend,
        }
      );

      return null;
    }

    if (
      hasznaltAzonositok
        .has(
          kapcsolodasId
        )
    ) {
      console.error(
        "[POLIMER SABLON HIBA] Többször szereplő kapcsolatazonosító.",
        {
          sablonId:
            sablon.id ??
            null,
          kapcsolodasId,
        }
      );

      return null;
    }

    hasznaltAzonositok.add(
      kapcsolodasId
    );

    const virtualisIndex =
      tipusok.length;

    tipusok.push(
      `POLIMER_KAPCSOLAT:${kapcsolodasId}`
    );

    matrix.forEach(
      (sor) => {
        sor.push(0);
      }
    );

    matrix.push(
      Array(
        tipusok.length
      ).fill(0)
    );

    matrix[
      atomIndex
    ][
      virtualisIndex
    ] =
      kotesrend;

    matrix[
      virtualisIndex
    ][
      atomIndex
    ] =
      kotesrend;
  }

  return {
    tipusok,
    matrix,
  };
}

// ==================================================
// AROMÁS HATOS GYŰRŰK NORMALIZÁLÁSA
// ==================================================

function aromasHatosGyurukKeresese(
  graf
) {
  const megtalaltGyuruk = [];
  const feldolgozottGyuruk =
    new Set();

  function ervenyesAromasGyuru(
    utvonal
  ) {
    if (
      utvonal.length !== 6 ||
      !utvonal.every(
        (index) =>
          graf.tipusok[index] ===
          "C"
      )
    ) {
      return false;
    }

    const gyuruKotesrendek =
      utvonal.map(
        (atomIndex, index) => {
          const kovetkezoIndex =
            utvonal[
              (index + 1) %
              utvonal.length
            ];

          return graf.matrix
            [atomIndex]
            [kovetkezoIndex];
        }
      );

    const csakEgyesEsKettes =
      gyuruKotesrendek.every(
        (rend) =>
          rend === 1 ||
          rend === 2
      );

    if (!csakEgyesEsKettes) {
      return false;
    }

    const kettosKotesekSzama =
      gyuruKotesrendek.filter(
        (rend) => rend === 2
      ).length;

    if (kettosKotesekSzama !== 3) {
      return false;
    }

    const valtakozoKotesek =
      gyuruKotesrendek.every(
        (rend, index) =>
          rend !==
          gyuruKotesrendek[
            (index + 1) %
            gyuruKotesrendek.length
          ]
      );

    if (!valtakozoKotesek) {
      return false;
    }

    /*
     * A hat atom között pontosan hat
     * belső kötés legyen. Így egy
     * átlós kötéssel rendelkező alakzat
     * nem számít benzolgyűrűnek.
     */

    let belsoKotesekSzama = 0;

    for (
      let elso = 0;
      elso < utvonal.length;
      elso += 1
    ) {
      for (
        let masodik = elso + 1;
        masodik < utvonal.length;
        masodik += 1
      ) {
        if (
          graf.matrix
            [utvonal[elso]]
            [utvonal[masodik]] > 0
        ) {
          belsoKotesekSzama += 1;
        }
      }
    }

    return belsoKotesekSzama === 6;
  }

  function ciklusKeresese(
    kezdoIndex,
    aktualisIndex,
    utvonal,
    latogatott
  ) {
    if (utvonal.length === 6) {
      const bezaroKotes =
        graf.matrix
          [aktualisIndex]
          [kezdoIndex];

      if (bezaroKotes === 0) {
        return;
      }

      const gyuruKulcs = [
        ...utvonal,
      ]
        .sort(
          (elso, masodik) =>
            elso - masodik
        )
        .join("-");

      if (
        !feldolgozottGyuruk.has(
          gyuruKulcs
        ) &&
        ervenyesAromasGyuru(
          utvonal
        )
      ) {
        feldolgozottGyuruk.add(
          gyuruKulcs
        );

        megtalaltGyuruk.push([
          ...utvonal,
        ]);
      }

      return;
    }

    for (
      let kovetkezoIndex = 0;
      kovetkezoIndex <
        graf.tipusok.length;
      kovetkezoIndex += 1
    ) {
      if (
        graf.tipusok[
          kovetkezoIndex
        ] !== "C" ||

        latogatott.has(
          kovetkezoIndex
        ) ||

        graf.matrix
          [aktualisIndex]
          [kovetkezoIndex] === 0 ||

        kovetkezoIndex <
          kezdoIndex
      ) {
        continue;
      }

      latogatott.add(
        kovetkezoIndex
      );

      utvonal.push(
        kovetkezoIndex
      );

      ciklusKeresese(
        kezdoIndex,
        kovetkezoIndex,
        utvonal,
        latogatott
      );

      utvonal.pop();

      latogatott.delete(
        kovetkezoIndex
      );
    }
  }

  for (
    let kezdoIndex = 0;
    kezdoIndex <
      graf.tipusok.length;
    kezdoIndex += 1
  ) {
    if (
      graf.tipusok[
        kezdoIndex
      ] !== "C"
    ) {
      continue;
    }

    ciklusKeresese(
      kezdoIndex,
      kezdoIndex,
      [kezdoIndex],
      new Set([kezdoIndex])
    );
  }

  return megtalaltGyuruk;
}

function aromasGrafNormalizalasa(
  graf
) {
  const normalizaltGraf = {
    tipusok: [
      ...graf.tipusok,
    ],

    matrix:
      graf.matrix.map(
        (sor) => [...sor]
      ),
  };

  const aromasGyuruk =
    aromasHatosGyurukKeresese(
      graf
    );

  aromasGyuruk.forEach(
    (gyuru) => {
      gyuru.forEach(
        (atomIndex, index) => {
          const kovetkezoIndex =
            gyuru[
              (index + 1) %
              gyuru.length
            ];

          /*
           * Az 1,5 csak belső
           * összehasonlítási jelölés.
           * A játékos továbbra is
           * egyszeres és kettős
           * kötéseket rajzol.
           */

          normalizaltGraf.matrix
            [atomIndex]
            [kovetkezoIndex] =
            1.5;

          normalizaltGraf.matrix
            [kovetkezoIndex]
            [atomIndex] =
            1.5;
        }
      );
    }
  );

  return normalizaltGraf;
}

// ==================================================
// GRÁFJELLEMZŐK
// ==================================================

function grafCsucsJellemzok(graf, index) {
  const szomszedok = [];

  graf.matrix[index].forEach(
    (kotesRend, masikIndex) => {
      if (kotesRend > 0) {
        szomszedok.push(
          `${graf.tipusok[masikIndex]}:${kotesRend}`
        );
      }
    }
  );

  szomszedok.sort();

  return {
    tipus: graf.tipusok[index],
    fokszam: szomszedok.length,
    kotesrendOsszeg:
      graf.matrix[index].reduce(
        (osszeg, rend) => osszeg + rend,
        0
      ),
    szomszedAlairas: szomszedok.join("|"),
  };
}

// ==================================================
// PONTOS GRÁFIZOMORFIA
// ==================================================

function grafokAzonosak(
  jatekGraf,
  sablonGraf,
  megfeleltetesKimenet = null
) {
  if (!jatekGraf || !sablonGraf) {
    return false;
  }
  jatekGraf =
  aromasGrafNormalizalasa(
    jatekGraf
  );

sablonGraf =
  aromasGrafNormalizalasa(
    sablonGraf
  );

  const meret = jatekGraf.tipusok.length;

  if (meret !== sablonGraf.tipusok.length) {
    return false;
  }

  const jatekJellemzok = Array.from(
    { length: meret },
    (_, index) =>
      grafCsucsJellemzok(jatekGraf, index)
  );

  const sablonJellemzok = Array.from(
    { length: meret },
    (_, index) =>
      grafCsucsJellemzok(sablonGraf, index)
  );

  const lehetsegesParok =
    jatekJellemzok.map((jatekCsucs) =>
      sablonJellemzok
        .map((sablonCsucs, index) => ({
          sablonCsucs,
          index,
        }))
        .filter(
          ({ sablonCsucs }) =>
            sablonCsucs.tipus ===
              jatekCsucs.tipus &&
            sablonCsucs.fokszam ===
              jatekCsucs.fokszam &&
            sablonCsucs.kotesrendOsszeg ===
              jatekCsucs.kotesrendOsszeg &&
            sablonCsucs.szomszedAlairas ===
              jatekCsucs.szomszedAlairas
        )
        .map(({ index }) => index)
    );

  if (
    lehetsegesParok.some(
      (parok) => parok.length === 0
    )
  ) {
    return false;
  }

  const feldolgozasiSorrend =
    Array.from(
      { length: meret },
      (_, index) => index
    ).sort((elso, masodik) => {
      const lehetosegKulonbseg =
        lehetsegesParok[elso].length -
        lehetsegesParok[masodik].length;

      if (lehetosegKulonbseg !== 0) {
        return lehetosegKulonbseg;
      }

      return (
        jatekJellemzok[masodik].fokszam -
        jatekJellemzok[elso].fokszam
      );
    });

  const megfeleltetes =
    Array(meret).fill(-1);

  const felhasznaltSablonCsucsok =
    new Set();

  function visszalepeses(szint) {
    if (szint === meret) {
  if (
    Array.isArray(
      megfeleltetesKimenet
    )
  ) {
    megfeleltetesKimenet.splice(
      0,
      megfeleltetesKimenet.length,
      ...megfeleltetes
    );
  }

  return true;
}

    const jatekIndex =
      feldolgozasiSorrend[szint];

    for (
      const sablonIndex of
      lehetsegesParok[jatekIndex]
    ) {
      if (
        felhasznaltSablonCsucsok.has(
          sablonIndex
        )
      ) {
        continue;
      }

      let osszefer = true;

      for (
        let masikJatekIndex = 0;
        masikJatekIndex < meret;
        masikJatekIndex += 1
      ) {
        const masikSablonIndex =
          megfeleltetes[masikJatekIndex];

        if (masikSablonIndex === -1) {
          continue;
        }

        if (
          jatekGraf.matrix
            [jatekIndex][masikJatekIndex] !==
          sablonGraf.matrix
            [sablonIndex][masikSablonIndex]
        ) {
          osszefer = false;
          break;
        }
      }

      if (!osszefer) {
        continue;
      }

      megfeleltetes[jatekIndex] =
        sablonIndex;

      felhasznaltSablonCsucsok.add(
        sablonIndex
      );

      if (visszalepeses(szint + 1)) {
        return true;
      }

      megfeleltetes[jatekIndex] = -1;

      felhasznaltSablonCsucsok.delete(
        sablonIndex
      );
    }

    return false;
  }

  return visszalepeses(0);
}

// ==================================================
// E/Z-SZTEREOKÉMIA FELISMERÉSE
// ==================================================

function sablonIndexhezJatekIndex(
  megfeleltetes,
  sablonIndex
) {
  return megfeleltetes.findIndex(
    (aktualisSablonIndex) =>
      aktualisSablonIndex ===
      sablonIndex
  );
}

function kettosKotesKonfiguracioKeresese(
  atomok,
  sztereoKotes,
  megfeleltetes
) {
  const atom1JatekIndex =
    sablonIndexhezJatekIndex(
      megfeleltetes,
      sztereoKotes.atom1Index
    );

  const atom2JatekIndex =
    sablonIndexhezJatekIndex(
      megfeleltetes,
      sztereoKotes.atom2Index
    );

  const elsoPrioritasJatekIndex =
    sablonIndexhezJatekIndex(
      megfeleltetes,
      sztereoKotes
        .elsoPrioritasIndex
    );

  const masodikPrioritasJatekIndex =
    sablonIndexhezJatekIndex(
      megfeleltetes,
      sztereoKotes
        .masodikPrioritasIndex
    );

  const jatekIndexek = [
    atom1JatekIndex,
    atom2JatekIndex,
    elsoPrioritasJatekIndex,
    masodikPrioritasJatekIndex,
  ];

  if (
    jatekIndexek.some(
      (index) => index < 0
    )
  ) {
    return null;
  }

  const atom1 =
    atomok[atom1JatekIndex];

  const atom2 =
    atomok[atom2JatekIndex];

  const elsoPrioritas =
    atomok[
      elsoPrioritasJatekIndex
    ];

  const masodikPrioritas =
    atomok[
      masodikPrioritasJatekIndex
    ];

  const vizsgaltAtomok = [
    atom1,
    atom2,
    elsoPrioritas,
    masodikPrioritas,
  ];

  const mindenPozicioErvenyes =
    vizsgaltAtomok.every(
      (atom) =>
        Number.isFinite(atom?.x) &&
        Number.isFinite(atom?.y)
    );

  if (!mindenPozicioErvenyes) {
    return null;
  }

  const kotesX =
    atom2.x - atom1.x;

  const kotesY =
    atom2.y - atom1.y;

  const elsoOldal =
    kotesX *
      (
        elsoPrioritas.y -
        atom1.y
      ) -
    kotesY *
      (
        elsoPrioritas.x -
        atom1.x
      );

  const masodikOldal =
    kotesX *
      (
        masodikPrioritas.y -
        atom2.y
      ) -
    kotesY *
      (
        masodikPrioritas.x -
        atom2.x
      );

  /*
   * Ha valamelyik kiemelt
   * szubsztituens közel egy vonalba
   * esik a kettős kötéssel, az E/Z
   * helyzet nem olvasható le biztosan.
   */

  if (
    Math.abs(elsoOldal) < 1 ||
    Math.abs(masodikOldal) < 1
  ) {
    return null;
  }

  return (
    elsoOldal * masodikOldal > 0
      ? "Z"
      : "E"
  );
}

function negySzomszedosKonfiguracio(pontok, kiemelt, irany) {
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
  ) return null;

  const alap = pontok[3];

  const elteresek = pontok.map(p => [
    p.x - alap.x,
    p.y - alap.y
  ]);

  const meret = Math.max(
    ...elteresek.flatMap(v => v.map(Math.abs))
  );

  if (!Number.isFinite(meret) || meret <= 0) return null;

  const magassag = i =>
    i === kiemelt ? (irany === "elo" ? 1 : -1) : 0;

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
  ) return null;

  return determinans > 0 ? "R" : "S";
}

function negySzomszedosCentrumKeresese(
  atomok,
  kotesek,
  centrum,
  megfeleltetes
) {
  const kozpontIndex = sablonIndexhezJatekIndex(
    megfeleltetes,
    centrum.atomIndex
  );

  const sablonIndexek = centrum.prioritasIndexek;

  if (
    kozpontIndex < 0 ||
    !Array.isArray(sablonIndexek) ||
    sablonIndexek.length !== 4 ||
    new Set(sablonIndexek).size !== 4
  ) return null;

  const indexek = sablonIndexek.map(i =>
    sablonIndexhezJatekIndex(megfeleltetes, i)
  );

  if (
    indexek.some(i => i < 0 || i === kozpontIndex)
  ) return null;

  const kozpont = atomok[kozpontIndex];
  const szomszedok = indexek.map(i => atomok[i]);

  if (
    !kozpont ||
    szomszedok.some(a => !a) ||
    new Set([
      kozpont.id,
      ...szomszedok.map(a => a.id)
    ]).size !== 5
  ) return null;

  const kapcsolatok = kotesek.filter(k =>
    k.atom1Id === kozpont.id ||
    k.atom2Id === kozpont.id
  );

  if (
    kapcsolatok.length !== 4 ||
    kapcsolatok.some(k => k.rend !== 1)
  ) return null;

  const masikId = k =>
    k.atom1Id === kozpont.id ? k.atom2Id : k.atom1Id;

  if (
    szomszedok.some(a =>
      kapcsolatok.filter(k => masikId(k) === a.id).length !== 1
    )
  ) return null;

  const ekek = kapcsolatok.filter(k =>
    k.sztereo === "elo" || k.sztereo === "hatra"
  );

  if (ekek.length !== 1) return null;

  const ek = ekek[0];

  const kiemelt = szomszedok.findIndex(
    a => a.id === masikId(ek)
  );

  const kifele = ek.atom1Id === kozpont.id;
  const elore = kifele
    ? ek.sztereo === "elo"
    : ek.sztereo === "hatra";

  return negySzomszedosKonfiguracio(
    szomszedok,
    kiemelt,
    elore ? "elo" : "hatra"
  );
}

function kiralisCentrumKonfiguracioKeresese(
  atomok,
  kotesek,
  centrum,
  megfeleltetes
) {
  const kozpontJatekIndex =
    sablonIndexhezJatekIndex(
      megfeleltetes,
      centrum.atomIndex
    );

  const prioritasSablonIndexek =
    centrum.prioritasIndexek ?? [];

    if (prioritasSablonIndexek.length === 4) {
  return negySzomszedosCentrumKeresese(
    atomok,
    kotesek,
    centrum,
    megfeleltetes
  );
}

  if (
    kozpontJatekIndex < 0 ||
    prioritasSablonIndexek.length !== 3
  ) {
    return null;
  }

  const prioritasJatekIndexek =
    prioritasSablonIndexek.map(
      (sablonIndex) =>
        sablonIndexhezJatekIndex(
          megfeleltetes,
          sablonIndex
        )
    );

  if (
    prioritasJatekIndexek.some(
      (index) => index < 0
    )
  ) {
    return null;
  }

  const kozpontAtom =
    atomok[kozpontJatekIndex];

  const prioritasAtomok =
    prioritasJatekIndexek.map(
      (index) => atomok[index]
    );

  const mindenPozicioErvenyes = [
    kozpontAtom,
    ...prioritasAtomok,
  ].every(
    (atom) =>
      Number.isFinite(atom?.x) &&
      Number.isFinite(atom?.y)
  );

  if (!mindenPozicioErvenyes) {
    return null;
  }

  const prioritasAtomIdk =
    new Set(
      prioritasAtomok.map(
        (atom) => atom.id
      )
    );

  const sztereoKotesek =
    kotesek.filter((kotes) => {
      if (
        kotes.rend !== 1 ||
        (
          kotes.sztereo !== "elo" &&
          kotes.sztereo !== "hatra"
        )
      ) {
        return false;
      }

      const kozpontAzElso =
        kotes.atom1Id ===
        kozpontAtom.id;

      const kozpontAMasodik =
        kotes.atom2Id ===
        kozpontAtom.id;

      if (
        !kozpontAzElso &&
        !kozpontAMasodik
      ) {
        return false;
      }

      const masikAtomId =
        kozpontAzElso
          ? kotes.atom2Id
          : kotes.atom1Id;

      return prioritasAtomIdk.has(
        masikAtomId
      );
    });

  if (sztereoKotesek.length !== 1) {
    return null;
  }

  const sztereoKotes =
    sztereoKotesek[0];

  /*
   * A sztereoérték az atom1 felől
   * az atom2 helyzetét adja meg.
   */
  const kiemeltAtomEloreMutat =
    sztereoKotes.atom1Id ===
    kozpontAtom.id
      ? sztereoKotes.sztereo ===
        "elo"
      : sztereoKotes.sztereo ===
        "hatra";

  const [
    elsoPrioritas,
    masodikPrioritas,
    harmadikPrioritas,
  ] = prioritasAtomok;

  /*
   * A képernyőn az y koordináta
   * lefelé növekszik, ezért a pozitív
   * előjel óramutató járásával
   * megegyező sorrendet jelent.
   */
  const forgasiElojel =
    (
      masodikPrioritas.x -
      elsoPrioritas.x
    ) *
    (
      harmadikPrioritas.y -
      elsoPrioritas.y
    ) -
    (
      masodikPrioritas.y -
      elsoPrioritas.y
    ) *
    (
      harmadikPrioritas.x -
      elsoPrioritas.x
    );

  if (
    Math.abs(forgasiElojel) < 1
  ) {
    return null;
  }

  let konfiguracio =
    forgasiElojel > 0
      ? "R"
      : "S";

  /*
   * Ha a kiemelt csoport hátrafelé
   * mutat, az implicit hidrogén van
   * elöl, ezért meg kell fordítani
   * az eredményt.
   */
  if (!kiemeltAtomEloreMutat) {
    konfiguracio =
      konfiguracio === "R"
        ? "S"
        : "R";
  }

  return konfiguracio;
}

function molekulaSztereokemiaEgyezik(
  atomok,
  kotesek,
  sablon,
  megfeleltetes
) {
  const sztereoKotesek =
    sablon.sztereokemia
      ?.kettosKotesek ?? [];

  const kiralisCentrumok =
    sablon.sztereokemia
      ?.kiralisCentrumok ?? [];

  const kettosKotesekEgyeznek =
    sztereoKotesek.every(
      (sztereoKotes) => {
        const felismertKonfiguracio =
          kettosKotesKonfiguracioKeresese(
            atomok,
            sztereoKotes,
            megfeleltetes
          );

        return (
          felismertKonfiguracio ===
          sztereoKotes.konfiguracio
        );
      }
    );

  if (!kettosKotesekEgyeznek) {
    return false;
  }

  return kiralisCentrumok.every(
    (centrum) => {
      const felismertKonfiguracio =
        kiralisCentrumKonfiguracioKeresese(
          atomok,
          kotesek,
          centrum,
          megfeleltetes
        );

      return (
        felismertKonfiguracio ===
        centrum.konfiguracio
      );
    }
  );
}

// ==================================================
// NÉVTÁRI KERESÉS
// ==================================================

function molekulaKereseseANevtarban(
  atomok,
  kotesek,
  polimer = null,
  polimerKapcsolatok = null
) {
  const polimerKereses =
    polimer
      ?.ismetlodEgyseg ===
    true;

  /*
   * Építéskor a tanuló által
   * elkészített kapcsolatokat kapjuk.
   *
   * Elnevezési feladatnál nincs külön
   * tanulói kapcsolattömb, ezért ott
   * a sablon adataiból állítjuk elő.
   */
  const alkalmazottKapcsolatok =
    Array.isArray(
      polimerKapcsolatok
    )
      ? polimerKapcsolatok
      : (
          polimerKereses &&
          Array.isArray(
            polimer
              ?.kapcsolodasok
          )
            ? polimer
                .kapcsolodasok
                .map(
                  (
                    kapcsolat
                  ) => {
                    const atomIndex =
                      Number(
                        kapcsolat
                          ?.atomIndex
                      );

                    const atom =
                      atomok[
                        atomIndex
                      ];

                    return {
                      kapcsolodasId:
                        String(
                          kapcsolat
                            ?.id ??
                          ""
                        ),

                      atomId:
                        atom?.id ??
                        null,

                      rend:
                        Number(
                          kapcsolat
                            ?.kotesrend ??
                          1
                        ),
                    };
                  }
                )
            : []
        );

  const jatekGraf =
    jatekGrafKeszitese(
      atomok,
      kotesek,
      alkalmazottKapcsolatok
    );

  if (!jatekGraf) {
    console.error(
      "[NÉVTÁR HIBA] A játékos gráfja nem hozható létre.",
      {
        atomok,
        kotesek,
        polimer,
        alkalmazottKapcsolatok,
      }
    );

    return null;
  }

  for (
  const bejegyzes of
  MOLEKULA_NEVTAR
) {

    const bejegyzesPolimer =
    bejegyzes
      ?.polimer
      ?.ismetlodEgyseg ===
    true;

  if (
    bejegyzesPolimer !==
    polimerKereses
  ) {
    continue;
  }

  const sablonGraf =
    sablonGrafKeszitese(
      bejegyzes
    );

  const megfeleltetes = [];

  const grafEgyezik =
    grafokAzonosak(
      jatekGraf,
      sablonGraf,
      megfeleltetes
    );

  if (!grafEgyezik) {
    continue;
  }

  const sztereoEgyezik =
  molekulaSztereokemiaEgyezik(
    atomok,
    kotesek,
    bejegyzes,
    megfeleltetes
  );

  if (!sztereoEgyezik) {
    continue;
  }

  return bejegyzes;
}

  return null;
}

function molekulaNevEllenorzese(
  atomok,
  kotesek,
  beirtNev,
  polimer = null
) {
  const bejegyzes =
        molekulaKereseseANevtarban(
      atomok,
      kotesek,
      polimer
    );

  if (!bejegyzes) {
    return {
      felismerve: false,
      helyes: false,
      elfogadottNev: null,
      bejegyzesId: null,
    };
  }

  const normalizaltNev =
    molekulaNevNormalizalasa(beirtNev);

  const nevBejegyzesek =
  molekulaNevBejegyzesek(bejegyzes);

const egyezoNev = nevBejegyzesek.find(
  ({ nev }) =>
    molekulaNevNormalizalasa(nev) ===
    normalizaltNev
);

return {
  felismerve: true,
  helyes: Boolean(egyezoNev),

  elfogadottNev:
    egyezoNev?.nev ?? null,

  nevTipus:
    egyezoNev?.tipus ?? null,

  preferaltNev:
    molekulaPreferaltNeve(bejegyzes),

  bejegyzesId: bejegyzes.id,
  alapvazId: bejegyzes.alapvazId,

  izomerCsoportId:
    bejegyzes.izomerCsoportId,

  sztereoStatusz:
    bejegyzes.sztereokemia?.statusz ??
    "nincs-megadva",
};
}

// ==================================================
// NÉVTÁR ÖNELLENŐRZÉSE
// ==================================================

function molekulaNevtarOnellenorzes() {
  let mindenRendben = true;

  MOLEKULA_NEVTAR.forEach((bejegyzes) => {
    const elozetAdatok =
  molekulaSablonElozetAdatok(
    bejegyzes.id
  );

if (!elozetAdatok) {
  mindenRendben = false;

  console.error(
    "[NÉVTÁR HIBA] Nem készíthető előnézet:",
    bejegyzes.id
  );

  return;
}

const atomok =
  elozetAdatok.atomok;

const kotesek =
  elozetAdatok.kotesek;

    const nevBejegyzesek =
  molekulaNevBejegyzesek(bejegyzes);

for (const { nev } of nevBejegyzesek) {
  const eredmeny =
        molekulaNevEllenorzese(
      atomok,
      kotesek,
      nev,
      bejegyzes.polimer ??
        null
    );

  if (
    !eredmeny.felismerve ||
    !eredmeny.helyes
  ) {
    mindenRendben = false;

    console.error(
      "[NÉVTÁR HIBA] Sikertelen névellenőrzés:",
      bejegyzes.id,
      nev,
      eredmeny
    );
  }
}

if (
  !ERVENYES_SZTEREO_STATUSZOK.has(
    bejegyzes.sztereokemia?.statusz
  )
) {
  mindenRendben = false;

  console.error(
    "[NÉVTÁR HIBA] Érvénytelen sztereokémiai státusz:",
    bejegyzes.id,
    bejegyzes.sztereokemia?.statusz
  );
}
  });

  if (mindenRendben) {
    console.log(
      `[DEBUG] A molekulanévtár önellenőrzése sikeres. Bejegyzések: ${MOLEKULA_NEVTAR.length}`
    );
  }

  return mindenRendben;
}

// ==================================================
// MOLEKULAÁBRÁK AUTOMATIKUS ELLENŐRZÉSE
// ==================================================

function molekulaAbraAudit() {
  const eredmenyek = [];

  const ATOM_ATFEDES_HATAR = 30;
  const ATOM_KOZEL_HATAR = 40;
  const KOTES_ATOM_HATAR = 16;

  function tavolsag(
    elso,
    masodik
  ) {
    return Math.hypot(
      elso.x - masodik.x,
      elso.y - masodik.y
    );
  }

  function pontSzakaszTavolsag(
    pont,
    szakaszEleje,
    szakaszVege
  ) {
    const dx =
      szakaszVege.x -
      szakaszEleje.x;

    const dy =
      szakaszVege.y -
      szakaszEleje.y;

    const hosszNegyzet =
      dx * dx + dy * dy;

    if (hosszNegyzet === 0) {
      return tavolsag(
        pont,
        szakaszEleje
      );
    }

    const arany = Math.max(
      0,
      Math.min(
        1,
        (
          (
            pont.x -
            szakaszEleje.x
          ) * dx +
          (
            pont.y -
            szakaszEleje.y
          ) * dy
        ) / hosszNegyzet
      )
    );

    return Math.hypot(
      pont.x -
        (
          szakaszEleje.x +
          arany * dx
        ),

      pont.y -
        (
          szakaszEleje.y +
          arany * dy
        )
    );
  }

  function irany(
    elso,
    masodik,
    harmadik
  ) {
    return (
      (
        masodik.x -
        elso.x
      ) *
        (
          harmadik.y -
          elso.y
        ) -
      (
        masodik.y -
        elso.y
      ) *
        (
          harmadik.x -
          elso.x
        )
    );
  }

  function szakaszokMetszik(
    elsoA,
    elsoB,
    masodikA,
    masodikB
  ) {
    const elsoIrany =
      irany(
        elsoA,
        elsoB,
        masodikA
      );

    const masodikIrany =
      irany(
        elsoA,
        elsoB,
        masodikB
      );

    const harmadikIrany =
      irany(
        masodikA,
        masodikB,
        elsoA
      );

    const negyedikIrany =
      irany(
        masodikA,
        masodikB,
        elsoB
      );

    return (
      elsoIrany *
        masodikIrany <
        0 &&
      harmadikIrany *
        negyedikIrany <
        0
    );
  }

  for (
    const molekula of
    MOLEKULA_NEVTAR
  ) {
    const problemak = [];
    let vanHiba = false;

    const elozet =
      molekulaSablonElozetAdatok(
        molekula.id
      );

    if (!elozet) {
      eredmenyek.push({
        molekula:
          molekula.id,

        allapot:
          "HIBA",

        problema:
          "Az előnézeti adatok nem készíthetők el.",
      });

      continue;
    }

    const atomok =
      elozet.atomok;

    const kotesek =
      elozet.kotesek;

    const atomTerkep =
      new Map(
        atomok.map(
          (atom) => [
            atom.id,
            atom,
          ]
        )
      );

    /*
     * Hiányzó vagy hibás
     * koordináták keresése.
     */

    for (
      const atom of atomok
    ) {
      if (
        !Number.isFinite(
          atom.x
        ) ||
        !Number.isFinite(
          atom.y
        )
      ) {
        vanHiba = true;

        problemak.push(
          `Hiányzó koordináta: ${atom.id}`
        );
      }
    }

    /*
     * Atomátfedések és nagyon
     * közeli atomok keresése.
     */

    for (
      let elsoIndex = 0;
      elsoIndex <
      atomok.length;
      elsoIndex += 1
    ) {
      for (
        let masodikIndex =
          elsoIndex + 1;

        masodikIndex <
        atomok.length;

        masodikIndex += 1
      ) {
        const elsoAtom =
          atomok[
            elsoIndex
          ];

        const masodikAtom =
          atomok[
            masodikIndex
          ];

        const atomTavolsag =
          tavolsag(
            elsoAtom,
            masodikAtom
          );

        if (
          atomTavolsag <
          ATOM_ATFEDES_HATAR
        ) {
          vanHiba = true;

          problemak.push(
            `Atomátfedés: ${elsoAtom.id} és ${masodikAtom.id} (${atomTavolsag.toFixed(1)})`
          );
        } else if (
          atomTavolsag <
          ATOM_KOZEL_HATAR
        ) {
          problemak.push(
            `Nagyon közeli atomok: ${elsoAtom.id} és ${masodikAtom.id} (${atomTavolsag.toFixed(1)})`
          );
        }
      }
    }

    /*
     * Atomhoz túl közel
     * haladó kötések keresése.
     */

    for (
      const kotes of kotesek
    ) {
      const elsoAtom =
        atomTerkep.get(
          kotes.atom1Id
        );

      const masodikAtom =
        atomTerkep.get(
          kotes.atom2Id
        );

      if (
        !elsoAtom ||
        !masodikAtom
      ) {
        vanHiba = true;

        problemak.push(
          `Hiányzó kötésvégpont: ${kotes.id}`
        );

        continue;
      }

      for (
        const atom of atomok
      ) {
        if (
          atom.id ===
            kotes.atom1Id ||
          atom.id ===
            kotes.atom2Id
        ) {
          continue;
        }

        const kotesTavolsag =
          pontSzakaszTavolsag(
            atom,
            elsoAtom,
            masodikAtom
          );

        if (
          kotesTavolsag <
          KOTES_ATOM_HATAR
        ) {
          problemak.push(
            `${kotes.id} túl közel halad ${atom.id} atomhoz (${kotesTavolsag.toFixed(1)})`
          );
        }
      }
    }

    /*
     * Egymást keresztező,
     * nem kapcsolódó kötések.
     */

    for (
      let elsoIndex = 0;
      elsoIndex <
      kotesek.length;
      elsoIndex += 1
    ) {
      for (
        let masodikIndex =
          elsoIndex + 1;

        masodikIndex <
        kotesek.length;

        masodikIndex += 1
      ) {
        const elsoKotes =
          kotesek[
            elsoIndex
          ];

        const masodikKotes =
          kotesek[
            masodikIndex
          ];

        const kozosAtom = [
          elsoKotes.atom1Id,
          elsoKotes.atom2Id,
        ].some(
          (atomId) =>
            atomId ===
              masodikKotes.atom1Id ||
            atomId ===
              masodikKotes.atom2Id
        );

        if (kozosAtom) {
          continue;
        }

        const elsoA =
          atomTerkep.get(
            elsoKotes.atom1Id
          );

        const elsoB =
          atomTerkep.get(
            elsoKotes.atom2Id
          );

        const masodikA =
          atomTerkep.get(
            masodikKotes.atom1Id
          );

        const masodikB =
          atomTerkep.get(
            masodikKotes.atom2Id
          );

        if (
          elsoA &&
          elsoB &&
          masodikA &&
          masodikB &&
          szakaszokMetszik(
            elsoA,
            elsoB,
            masodikA,
            masodikB
          )
        ) {
          vanHiba = true;

          problemak.push(
            `Kötéskereszteződés: ${elsoKotes.id} és ${masodikKotes.id}`
          );
        }
      }
    }

    /*
     * A királis centrumoknál
     * megvan-e az ékkötés.
     */

    const kiralisCentrumok =
      molekula
        .sztereokemia
        ?.kiralisCentrumok ??
      [];

    for (
      const centrum of
      kiralisCentrumok
    ) {
      const centrumAtomId =
        `elozet-atom-${centrum.atomIndex}`;

      const kiemeltAtomId =
        `elozet-atom-${centrum.kiemeltAtomIndex}`;

      const sztereoKotes =
        kotesek.find(
          (kotes) =>
            (
              kotes.atom1Id ===
                centrumAtomId &&
              kotes.atom2Id ===
                kiemeltAtomId
            ) ||
            (
              kotes.atom2Id ===
                centrumAtomId &&
              kotes.atom1Id ===
                kiemeltAtomId
            )
        );

      if (!sztereoKotes) {
        vanHiba = true;

        problemak.push(
          `Hiányzó királis kötés: ${centrumAtomId}–${kiemeltAtomId}`
        );
      } else if (
        sztereoKotes.sztereo !==
          "elo" &&
        sztereoKotes.sztereo !==
          "hatra"
      ) {
        vanHiba = true;

        problemak.push(
          `A királis kötés nem ékkötés: ${sztereoKotes.id}`
        );
      }
    }

    if (
      problemak.length > 0
    ) {
      eredmenyek.push({
        molekula:
          molekula.id,

        allapot:
          vanHiba
            ? "HIBA"
            : "ELLENŐRIZENDŐ",

        problema:
          problemak.join(
            " | "
          ),
      });
    }
  }

  if (
    eredmenyek.length === 0
  ) {
    console.log(
      `[ÁBRA AUDIT] Mind a ${MOLEKULA_NEVTAR.length} molekula előnézete rendben van.`
    );
  } else {
    console.table(
      eredmenyek
    );

    console.warn(
      `[ÁBRA AUDIT] ${eredmenyek.length} molekula igényel ellenőrzést.`
    );
  }

  return eredmenyek;
}

// ==================================================
// ADATBÁZIS-SEED EXPORTÁLÁSA
// ==================================================

function molekulaNevtarJsonLetoltese() {
  const idDarabszamok =
    new Map();

  for (
    const molekula of
    MOLEKULA_NEVTAR
  ) {
    const jelenlegiDarabszam =
      idDarabszamok.get(
        molekula.id
      ) ?? 0;

    idDarabszamok.set(
      molekula.id,
      jelenlegiDarabszam + 1
    );
  }

  const duplikaltIdk =
    [...idDarabszamok.entries()]
      .filter(
        ([, darabszam]) =>
          darabszam > 1
      )
      .map(
        ([id]) => id
      );

  if (
    duplikaltIdk.length > 0
  ) {
    console.error(
      "[EXPORT HIBA] Duplikált molekulaazonosítók:",
      duplikaltIdk
    );

    return false;
  }

  const adatcsomag = {
    schemaVerzio: 1,

    exportIdeje:
      new Date().toISOString(),

    forras:
      "szerves-kemiai-jatek",

    molekulaDarab:
      MOLEKULA_NEVTAR.length,

    molekulak:
      MOLEKULA_NEVTAR,
  };

  const json =
    JSON.stringify(
      adatcsomag,
      null,
      2
    );

  const fajl =
    new Blob(
      [json],
      {
        type:
          "application/json;charset=utf-8",
      }
    );

  const url =
    URL.createObjectURL(
      fajl
    );

  const letoltes =
    document.createElement(
      "a"
    );

  letoltes.href =
    url;

  letoltes.download =
    "molekulak-seed-v1.json";

  document.body.appendChild(
    letoltes
  );

  letoltes.click();
  letoltes.remove();

  URL.revokeObjectURL(
    url
  );

  console.log(
    `[EXPORT] ${MOLEKULA_NEVTAR.length} molekula sikeresen exportálva.`
  );

  return true;
}

// ==================================================
// SUPABASE CSV-EXPORT
// ==================================================

function molekulaNevtarCsvLetoltese() {
  function csvMezoErteke(
    ertek
  ) {
    if (
      ertek === null ||
      ertek === undefined
    ) {
      return "";
    }

    const szoveg =
      String(ertek)
        .replaceAll(
          '"',
          '""'
        );

    return `"${szoveg}"`;
  }

  function postgresTombKeszitese(
    elemek
  ) {
    return (
      "{" +
      (elemek ?? [])
        .map(
          (elem) =>
            `"${String(elem)
              .replaceAll(
                "\\",
                "\\\\"
              )
              .replaceAll(
                '"',
                '\\"'
              )}"`
        )
        .join(",") +
      "}"
    );
  }

  const oszlopok = [
    "id",
    "pubchem_cid",
    "inchi_key",
    "kapcsolati_kulcs",
    "osszegkeplet",
    "preferalt_nev",
    "csaladok",
    "nehezseg",
    "adat",
    "forras",
    "ellenorzesi_statusz",
    "aktiv",
  ];

  const sorok =
    MOLEKULA_NEVTAR.map(
      (molekula) => {
        const adatSor = [
          molekula.id,
          null,
          null,
          null,
          molekula.osszegkeplet,
          molekula.nevek.preferalt,

          postgresTombKeszitese(
            molekula.csaladok
          ),

          molekula.nehezseg,

          JSON.stringify(
            molekula
          ),

          "sajat",
          "kezzel-ellenorzott",
          true,
        ];

        return adatSor
          .map(
            csvMezoErteke
          )
          .join(",");
      }
    );

  const csv =
    [
      oszlopok.join(","),
      ...sorok,
    ].join("\n");

  const fajl =
    new Blob(
      [
        "\uFEFF",
        csv,
      ],
      {
        type:
          "text/csv;charset=utf-8",
      }
    );

  const url =
    URL.createObjectURL(
      fajl
    );

  const letoltes =
    document.createElement(
      "a"
    );

  letoltes.href =
    url;

  letoltes.download =
    "molekulak-supabase-v1.csv";

  document.body.appendChild(
    letoltes
  );

  letoltes.click();
  letoltes.remove();

  setTimeout(
    () =>
      URL.revokeObjectURL(
        url
      ),
    1000
  );

  console.log(
    `[CSV EXPORT] ${MOLEKULA_NEVTAR.length} molekula előkészítve a Supabase számára.`
  );

  return true;
}

// ==================================================
// SUPABASE MOLEKULA-BETÖLTÉS
// ==================================================

const ADATBAZIS_BEALLITASOK =
  Object.freeze({
    url:
      "https://zkxgjglnpyjpunaakzmk.supabase.co",

    publishableKey:
      "sb_publishable_vB9n_Lcdk9YKYV-glEMsGQ_EGdrXZrO",
  });


/*
 * A fájlban szereplő, kézzel ellenőrzött
 * molekulák változatlan alapmásolata.
 */

const HELYI_MOLEKULA_NEVTAR =
  JSON.parse(
    JSON.stringify(
      MOLEKULA_NEVTAR
    )
  );


let legutobbiImportaltMolekulaIdk =
  [];


let legutobbiAdatbazisBetoltes = {
  sikeres: false,
  importaltDarab: 0,
};


async function molekulaNevtarBetolteseAdatbazisbol(
  kertDarab = 150,
  szurok = null
) {
  try {
    if (!window.JatekAdatok) {
      throw new Error("Az adatkezelo.js nincs betöltve.");
    }

    const kert = Number(kertDarab ?? 150);

    const darab = Number.isFinite(kert)
      ? Math.min(150, Math.max(1, Math.floor(kert)))
      : 150;

    const csomagLekerdezese = kizarandoIdk =>
      window.JatekAdatok.molekulakLekerdezese({
        darab,
        kizarandoIdk,
        maxNehezseg: szurok?.maxNehezseg ?? null,
        tiltottCsaladok: szurok?.tiltottCsaladok ?? [],
        csaladSzuroVerzio: szurok?.csaladSzuroVerzio ?? 2
      });

    let rekordok = await csomagLekerdezese(
      legutobbiImportaltMolekulaIdk
    );

    if (
      rekordok.length < darab &&
      legutobbiImportaltMolekulaIdk.length > 0
    ) {
      const potlas = await csomagLekerdezese([]);
      const latottIdk = new Set(rekordok.map(r => r.id));

      for (const rekord of potlas) {
        if (rekordok.length >= darab) break;
        if (latottIdk.has(rekord.id)) continue;

        rekordok.push(rekord);
        latottIdk.add(rekord.id);
      }
    }

    const molekulak = rekordok.map(rekord => rekord.adat);

    if (molekulak.length === 0) {
      throw new Error(
        "A megadott szűréssel nincs elérhető molekula."
      );
    }

    MOLEKULA_NEVTAR.splice(
      0,
      MOLEKULA_NEVTAR.length,
      ...molekulak
    );

    legutobbiImportaltMolekulaIdk =
      molekulak.map(molekula => molekula.id);

    legutobbiAdatbazisBetoltes = {
      sikeres: true,
      importaltDarab: molekulak.length
    };

    console.log(
      "[JÁTÉKADATOK] " + molekulak.length +
      " aktív molekula betöltve a JSON-adatcsomagból."
    );

    return true;
  } catch (hiba) {
    legutobbiImportaltMolekulaIdk = [];

    legutobbiAdatbazisBetoltes = {
      sikeres: false,
      importaltDarab: 0
    };

    if (szurok !== null) {
      MOLEKULA_NEVTAR.splice(0, MOLEKULA_NEVTAR.length);
      throw hiba;
    }

    MOLEKULA_NEVTAR.splice(
      0,
      MOLEKULA_NEVTAR.length,
      ...JSON.parse(JSON.stringify(HELYI_MOLEKULA_NEVTAR))
    );

    console.warn(
      "[JÁTÉKADATOK] A JSON-adatcsomag betöltése sikertelen. " +
      "A helyi tartalék molekulatár marad használatban.",
      hiba
    );

    return false;
  }
}
