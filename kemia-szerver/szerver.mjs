import { pubchemImportKezeles } from "./pubchem-import-kezeles.mjs";
import { molekulaElutasitasKezeles } from "./molekula-elutasitas.mjs";
import { sztereoKezeles } from "./sztereo-kezeles.mjs";
import { molekulaElozetKezeles } from "./molekula-elozet.mjs";
import { molekulaJovahagyasKezeles } from "./molekula-jovahagyas.mjs";
import { molekulaMentesKezeles } from "./molekula-mentes.mjs";
import { adminKezeles } from "./admin-felulet.mjs";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { join, normalize, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import {
  randomBytes,
  randomUUID,
  createHash,
  scrypt,
  timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";
import { DatabaseSync } from "node:sqlite";

const CIM = "127.0.0.1";
const TANAR_PORT = 3000;
const DIAK_PORT = 3001;

const DIAK_NYILVANOS_ORIGIN = (() => {
  const nyers = process.env.KEMIA_DIAK_ORIGIN?.trim();
  if (!nyers) return null;

  try {
    return new URL(nyers).origin;
  } catch {
    throw new Error(
      "A KEMIA_DIAK_ORIGIN érvénytelen URL. Példa: https://pelda.trycloudflare.com"
    );
  }
})();

const DIAK_MEGHIVO_ORIGIN =
  DIAK_NYILVANOS_ORIGIN ?? `http://127.0.0.1:${DIAK_PORT}`;
const DIAK_MEGHIVO_HELYI_PROBA = DIAK_NYILVANOS_ORIGIN == null;

const JATEK_GYOKER = normalize(
  fileURLToPath(new URL("..", import.meta.url))
);

const JATEK_FAJLOK = new Map([
  ["/jatek/", { fajl: "index.html", tipus: "text/html; charset=utf-8" }],
  ["/jatek", { fajl: "index.html", tipus: "text/html; charset=utf-8" }],
  ["/jatek/style.css", { fajl: "style.css", tipus: "text/css; charset=utf-8" }],
  [
    "/jatek/molekulak.js",
    { fajl: "molekulak.js", tipus: "text/javascript; charset=utf-8" }
  ],
  [
    "/jatek/adatkezelo.js",
    { fajl: "adatkezelo.js", tipus: "text/javascript; charset=utf-8" }
  ],
  [
    "/jatek/script.js",
    { fajl: "script.js", tipus: "text/javascript; charset=utf-8" }
  ],
  [
    "/jatek/jatek-adatok-v1.json",
    { fajl: "jatek-adatok-v1.json", tipus: "application/json; charset=utf-8" }
  ]
]);

function jatekFajlKiszolgalasa(ut, valasz) {
  const bejegyzes = JATEK_FAJLOK.get(ut);
  if (!bejegyzes) return false;

  const teljesUtvonal = normalize(join(JATEK_GYOKER, bejegyzes.fajl));
  const relativ = relative(JATEK_GYOKER, teljesUtvonal);

  if (
    !relativ ||
    isAbsolute(relativ) ||
    relativ.startsWith("..")
  ) {
    throw hiba(403, "Érvénytelen játékfájl-útvonal.");
  }

  if (!existsSync(teljesUtvonal)) {
    throw hiba(404, "A kért játékfájl nem található.");
  }

  valaszKuldese(
    valasz,
    200,
    readFileSync(teljesUtvonal, "utf8"),
    {
      "Content-Type": bejegyzes.tipus,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  );

  return true;
}

function eredetekPorttal(port, extraOrigin = null) {
  const eredetek = new Set([
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`
  ]);

  if (extraOrigin) {
    eredetek.add(extraOrigin);
  }

  return eredetek;
}

const TANAR_EREDETEK = eredetekPorttal(TANAR_PORT);
const DIAK_EREDETEK = eredetekPorttal(
  DIAK_PORT,
  DIAK_NYILVANOS_ORIGIN
);

function kerestEredet(keres, engedelyezett) {
  const host = String(keres.headers.host ?? "").trim().toLowerCase();

  if (!host) {
    return null;
  }

  for (const proba of [`http://${host}`, `https://${host}`]) {
    if (engedelyezett.has(proba)) {
      return proba;
    }
  }

  for (const engedelyezettEredet of engedelyezett) {
    try {
      if (new URL(engedelyezettEredet).host.toLowerCase() === host) {
        return engedelyezettEredet;
      }
    } catch {
      // kihagy
    }
  }

  return null;
}

function diakUtEngedelyezett(mod, method, ut) {
  if (mod !== "diak") {
    return true;
  }

  if (
    method === "GET" &&
    (ut === "/csatlakozas" || ut === "/csatlakozas/")
  ) {
    return true;
  }

  if (method === "GET" && JATEK_FAJLOK.has(ut)) {
    return true;
  }

  if (
    method === "POST" &&
    (
      ut === "/api/tanora/csatlakozas" ||
      ut === "/api/tanora/jatekos-allapot" ||
      ut === "/api/tanora/eredmeny-frissites"
    )
  ) {
    return true;
  }

  return false;
}

const dbUtvonal = fileURLToPath(
  new URL("./adatok/kemia.sqlite", import.meta.url)
);

if (!existsSync(dbUtvonal)) {
  throw new Error("Hiányzik az adatok/kemia.sqlite adatbázis.");
}

const db = new DatabaseSync(dbUtvonal);
db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");

for (const nev of [
  "rendszer",
  "felhasznalok",
  "molekulak",
  "szintezis_reakciok",
  "szintezis_reakcio_termekek"
]) {
  const tabla = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name = ?
  `).get(nev);

  if (!tabla) {
    db.close();
    throw new Error(`Hiányzó tábla: ${nev}. Előbb a telepítést kell elvégezni.`);
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS belepesi_munkamenetek (
    token_hash TEXT PRIMARY KEY NOT NULL,
    felhasznalo_id TEXT NOT NULL
      REFERENCES felhasznalok(id) ON DELETE CASCADE,
    letrehozva INTEGER NOT NULL,
    lejarat INTEGER NOT NULL
  ) STRICT;

  CREATE INDEX IF NOT EXISTS belepesi_lejarat_idx
    ON belepesi_munkamenetek(lejarat);

  CREATE TABLE IF NOT EXISTS tanorak (
    id TEXT PRIMARY KEY NOT NULL,
    letrehozo_id TEXT NOT NULL
      REFERENCES felhasznalok(id),
    csatlakozasi_kod TEXT NOT NULL UNIQUE,
    meghivo_token_hash TEXT UNIQUE,
    idotartam_masodperc INTEGER NOT NULL
      CHECK (idotartam_masodperc BETWEEN 600 AND 1200),
    max_nehezseg INTEGER NOT NULL
      CHECK (max_nehezseg BETWEEN 1 AND 3),
    tiltott_csaladok TEXT NOT NULL
      CHECK (json_valid(tiltott_csaladok)),
    csalad_szuro_verzio INTEGER NOT NULL DEFAULT 2
      CHECK (csalad_szuro_verzio IN (1, 2)),
    letrehozva INTEGER NOT NULL,
    elinditva INTEGER
  ) STRICT;

  CREATE INDEX IF NOT EXISTS tanorak_letrehozo_idx
    ON tanorak(letrehozo_id);

  CREATE TABLE IF NOT EXISTS tanora_jatekosok (
    id TEXT PRIMARY KEY NOT NULL,
    tanora_id TEXT NOT NULL
      REFERENCES tanorak(id) ON DELETE CASCADE,
    becenev TEXT NOT NULL,
    csatlakozva INTEGER NOT NULL,
    jatekos_token_hash TEXT NOT NULL UNIQUE,
    pont INTEGER NOT NULL DEFAULT 0
      CHECK (pont >= 0),
    teljesitett_rendelesek INTEGER NOT NULL DEFAULT 0
      CHECK (teljesitett_rendelesek >= 0)
  ) STRICT;

  CREATE INDEX IF NOT EXISTS tanora_jatekosok_tanora_idx
    ON tanora_jatekosok(tanora_id);
`);

if (
  !db.prepare(`
    SELECT 1 AS ok
    FROM pragma_table_info('tanorak')
    WHERE name = 'elinditva'
  `).get()
) {
  db.exec(`ALTER TABLE tanorak ADD COLUMN elinditva INTEGER`);
}

if (
  !db.prepare(`
    SELECT 1 AS ok
    FROM pragma_table_info('tanorak')
    WHERE name = 'meghivo_token_hash'
  `).get()
) {
  db.exec(`
    ALTER TABLE tanorak
    ADD COLUMN meghivo_token_hash TEXT
  `);
}

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS tanorak_meghivo_token_hash_idx
    ON tanorak(meghivo_token_hash)
    WHERE meghivo_token_hash IS NOT NULL
`);

/*
 * 1 = régi szűrés: a molekula minden
 *     családja engedélyezett legyen.
 * 2 = új szűrés: elég egy bejelölt család.
 * A meglévő tanórák NULL/1 értéke a
 * régi szabályt őrzi.
 */
if (
  !db.prepare(`
    SELECT 1 AS ok
    FROM pragma_table_info('tanorak')
    WHERE name = 'csalad_szuro_verzio'
  `).get()
) {
  db.exec(`
    ALTER TABLE tanorak
    ADD COLUMN csalad_szuro_verzio INTEGER
  `);
}

if (
  !db.prepare(`
    SELECT 1 AS ok
    FROM pragma_table_info('tanora_jatekosok')
    WHERE name = 'pont'
  `).get()
) {
  db.exec(`
    ALTER TABLE tanora_jatekosok
    ADD COLUMN pont INTEGER NOT NULL DEFAULT 0
  `);
}

if (
  !db.prepare(`
    SELECT 1 AS ok
    FROM pragma_table_info('tanora_jatekosok')
    WHERE name = 'teljesitett_rendelesek'
  `).get()
) {
  db.exec(`
    ALTER TABLE tanora_jatekosok
    ADD COLUMN teljesitett_rendelesek INTEGER NOT NULL DEFAULT 0
  `);
}

const scryptAszinkron = promisify(scrypt);
const tokenHash = (token) =>
  createHash("sha256").update(token).digest("hex");

const TANORA_KOD_ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TANORA_KOD_MINTA = /^[A-HJ-NP-Z2-9]{6}$/;
const TANORA_ID_MINTA =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function tanoraCsatlakozasiKod() {
  const bajtok = randomBytes(6);
  let kod = "";

  for (let i = 0; i < 6; i++) {
    kod += TANORA_KOD_ABC[bajtok[i] % TANORA_KOD_ABC.length];
  }

  return kod;
}

function tanoraAzonositoAzUtbol(ut, minta) {
  const talalat = minta.exec(ut);
  if (!talalat) return null;

  const tanoraId = decodeURIComponent(talalat[1]);
  if (!TANORA_ID_MINTA.test(tanoraId)) {
    throw hiba(400, "Érvénytelen tanóraazonosító.");
  }

  return tanoraId;
}

let belepesFolyamatban = false;
let probak = 0;
let probaAblakVege = 0;

function hiba(statusz, uzenet) {
  return Object.assign(new Error(uzenet), { statusz });
}

function valaszKuldese(valasz, statusz, adat, fejlecek = {}) {
  valasz.writeHead(statusz, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...fejlecek
  });

  valasz.end(
    typeof adat === "string" ? adat : JSON.stringify(adat, null, 2)
  );
}

async function torzsBeolvasasa(keres) {
  if (!/^application\/json(?:\s*;|$)/i.test(
    keres.headers["content-type"] ?? ""
  )) {
    throw hiba(415, "JSON formátumú kérés szükséges.");
  }

  const reszek = [];
  let meret = 0;

  for await (const resz of keres) {
    meret += resz.length;
    if (meret > 8192) throw hiba(413, "Túl nagy kérés.");
    reszek.push(resz);
  }

  try {
    const adat = JSON.parse(Buffer.concat(reszek).toString("utf8"));

    if (!adat || typeof adat !== "object" || Array.isArray(adat)) {
      throw new Error();
    }

    return adat;
  } catch {
    throw hiba(400, "Érvénytelen JSON-adat.");
  }
}

function belepettFelhasznalo(keres) {
  const token = /^Bearer ([A-Za-z0-9_-]{43})$/
    .exec(keres.headers.authorization ?? "")?.[1];

  if (!token) throw hiba(401, "Bejelentkezés szükséges.");

  const felhasznalo = db.prepare(`
    SELECT f.id, f.email, f.szerepkor, m.token_hash
    FROM belepesi_munkamenetek m
    JOIN felhasznalok f ON f.id = m.felhasznalo_id
    WHERE m.token_hash = ?
      AND m.lejarat > ?
      AND f.aktiv = 1
  `).get(tokenHash(token), Date.now());

  if (!felhasznalo) {
    throw hiba(401, "A bejelentkezés érvénytelen vagy lejárt.");
  }

  return felhasznalo;
}

async function jelszoEllenorzese(jelszo, kodolt) {
  const reszek = String(kodolt ?? "").split("$");

  const ervenyes =
    reszek.length === 6 &&
    reszek[0] === "scrypt" &&
    reszek[1] === "131072" &&
    reszek[2] === "8" &&
    reszek[3] === "1" &&
    /^[0-9a-f]{64}$/.test(reszek[4]) &&
    /^[0-9a-f]{128}$/.test(reszek[5]);

  const so = ervenyes
    ? Buffer.from(reszek[4], "hex")
    : Buffer.alloc(32);

  const elvart = ervenyes
    ? Buffer.from(reszek[5], "hex")
    : Buffer.alloc(64);

  const kapott = await scryptAszinkron(jelszo, so, 64, {
    N: 131072,
    r: 8,
    p: 1,
    maxmem: 256 * 1024 * 1024
  });

  const egyezik = timingSafeEqual(elvart, kapott);
  return ervenyes && egyezik;
}

const OLDAL = `<!doctype html>
<html lang="hu">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kémiai játék – saját szerver</title>
<style>
body{font:17px system-ui,sans-serif;background:#f1f5f9;color:#172033;margin:0;padding:40px 20px}
main{max-width:520px;margin:auto;background:white;padding:28px;border-radius:16px}
h1{font-size:25px;margin-top:0}
label{display:block;margin:18px 0 6px}
input,select{box-sizing:border-box;width:100%;padding:11px;font:inherit;border:1px solid #94a3b8;border-radius:7px;background:white}
button{margin-top:20px;padding:11px 20px;font:inherit;background:#1849a9;color:white;border:0;border-radius:7px;cursor:pointer}
button:disabled{opacity:.6}
#uzenet,#tanora-eredmeny,#jatekoslista-uzenet{white-space:pre-wrap;min-height:1.5em}
li{margin:10px 0}
#fiok h2{font-size:20px;margin:28px 0 0}
#tanora-meghivo{margin-top:16px}
#tanora-qr{display:inline-block;padding:12px;background:white;border:1px solid #cbd5e1;border-radius:8px}
#tanora-meghivo-link{word-break:break-all;font-size:14px;color:#334155}
#tanora-helyi-proba{color:#9a3412;font-weight:600}
#jatekosok{padding-left:1.2em}
fieldset{margin:18px 0 0;padding:12px;border:1px solid #cbd5e1;border-radius:8px}
legend{padding:0 6px;font-weight:600}
#tanora-csaladok{display:flex;flex-direction:column;gap:4px;max-height:22rem;overflow-y:auto;margin-top:8px}
.csalad-csoport{border-bottom:1px solid #e2e8f0;padding:2px 0 6px}
.csalad-csoport:last-child{border-bottom:0;padding-bottom:0}
.csalad-csoport-fej{display:flex;align-items:center;gap:8px}
.csalad-csoport-mind{flex:0 0 auto;width:1.05rem;height:1.05rem}
.csalad-csoport-nyito{display:flex;flex:1;align-items:center;justify-content:space-between;gap:8px;width:auto;min-width:0;margin:0;padding:6px 4px;border:0;border-radius:8px;background:transparent;color:inherit;font:inherit;font-weight:700;text-align:left;cursor:pointer}
.csalad-csoport-nyito-cim{flex:1;min-width:0}
.csalad-csoport-nyito::after{content:"▸";flex:0 0 auto;color:#64748b}
.csalad-csoport-nyito[aria-expanded="true"]::after{content:"▾"}
.csalad-csoport-lista{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:6px 12px;padding:4px 4px 8px 28px}
.csalad-csoport-lista[hidden]{display:none}
.molekula-csalad-opcio{display:flex;align-items:center;gap:8px;cursor:pointer;margin:0}
.molekula-csalad-opcio input{width:auto;margin:0}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
</head>
<body>
<main>
<h1>Kémiai játék – saját szerver</h1>

<form id="belepes">
<label for="email">E-mail-cím</label>
<input id="email" name="email" type="email"
  autocomplete="username" required maxlength="254">

<label for="jelszo">Jelszó</label>
<input id="jelszo" name="jelszo" type="password"
  autocomplete="current-password" required maxlength="256">

<button id="belepes-gomb" type="submit">Belépés</button>
</form>

<section id="fiok" hidden>
<p id="azonosito"></p>
<ul id="osszefoglalo" hidden>
<li>Molekulák: <strong id="molekulak"></strong></li>
<li>Reakciók: <strong id="reakciok"></strong></li>
<li>Reakció–termék kapcsolatok: <strong id="termekek"></strong></li>
</ul>

<form id="tanora-urlap">
<h2>Tanóra létrehozása</h2>

<label for="tanora-idotartam">Játékidő</label>
<select id="tanora-idotartam" required>
<option value="600">10 perc</option>
<option value="900" selected>15 perc</option>
<option value="1200">20 perc</option>
</select>

<label for="tanora-nehezseg">Legmagasabb nehézség</label>
<select id="tanora-nehezseg" required>
<option value="1" selected>Könnyű (1. szint)</option>
<option value="2">Közepes (1–2. szint)</option>
<option value="3">Nehéz (1–3. szint)</option>
</select>

<fieldset>
<legend>Molekulacsaládok</legend>
<div id="tanora-csaladok">Családok betöltése…</div>
</fieldset>

<button id="tanora-gomb" type="submit">Tanóra létrehozása</button>
</form>

<p id="tanora-eredmeny" role="status" aria-live="polite"></p>
<section id="tanora-meghivo" hidden>
<p id="tanora-helyi-proba" hidden>Helyi próba</p>
<p id="tanora-meghivo-cimke"></p>
<div id="tanora-qr"></div>
<p id="tanora-meghivo-link"></p>
</section>

<section id="jatekoslista" hidden>
<h2>Csatlakozott diákok</h2>
<p id="jatekos-szam">0 csatlakozott diák</p>
<ul id="jatekosok"></ul>
<button id="jatekoslista-frissites" type="button">Játékoslista frissítése</button>
<button id="tanora-inditas" type="button" disabled>Játék indítása</button>
<p id="tanora-inditas-ido" hidden></p>
<p id="jatekoslista-uzenet" role="status" aria-live="polite"></p>
</section>

<button id="kilepes" type="button">Kijelentkezés</button>
</section>

<p id="uzenet" role="status" aria-live="polite"></p>

<script nonce="__NONCE__">
const elem = (id) => document.getElementById(id);
const DIAK_MEGHIVO_ORIGIN = "__DIAK_MEGHIVO_ORIGIN__";
const DIAK_MEGHIVO_HELYI_PROBA = __DIAK_MEGHIVO_HELYI__;
let token = null;
let aktualisTanoraId = null;
let tanoraElinditva = null;
let jatekosDarab = 0;
let osszesCsalad = [];

const MOLEKULA_CSALAD_CSOPORTOK = [
  { id: "szenhidrogen", cim: "Szénhidrogének" },
  { id: "oxigen", cim: "Oxigéntartalmú vegyületek" },
  { id: "nitrogen", cim: "Nitrogéntartalmú vegyületek" },
  { id: "ken", cim: "Kéntartalmú vegyületek" },
  { id: "halogen", cim: "Halogéntartalmú vegyületek" },
  { id: "foszfor", cim: "Foszfortartalmú vegyületek" },
  { id: "szilicium", cim: "Szilíciumtartalmú vegyületek" },
  { id: "szerkezeti", cim: "Szerkezeti címkék" }
];

const MOLEKULA_CSALAD_CSOPORT_TAGOK = {
  szenhidrogen: ["alkan","alken","alkilbenzol","alkin","aromas","dien","konjugalt-dien","szenhidrogen"],
  oxigen: ["aldehid","aldoz","alfa-diketon","alkohol","amid","aminosav","beta-diketon","ciklikus-felacetal","cukor","dialdehid","dikarbonsav","dikarbonsav-eszter","diketon","diol","eszter","eter","fenol","foszfat-eszter","foszfin-oxid","foszfit","foszfit-eszter","foszfonsav","furanoz","geminalis-diol","hidroxi-aldehid","hidroxi-eszter","hidroxi-karbonsav","hidroxi-keton","karbamid","karbonsav","keton","ketoz","oxo-eszter","oxokarbonsav","poliamid","polieszter","primer-amid","savanhidrid","savhalogenid","szekunder-amid","szilandiol","szilanol","szilil-eter","sziloxan","szulfinsav","szulfon","szulfonamid","szulfonsav","szulfoxid","tercier-amid","trikarbonsav","triol"],
  nitrogen: ["amid","amin","aminosav","diamin","karbamid","nitril","poliamid","primer-amid","primer-amin","szekunder-amid","szekunder-amin","szulfonamid","tercier-amid","tercier-amin"],
  ken: ["diszulfid","szulfinsav","szulfon","szulfonamid","szulfonsav","szulfoxid","tioeter","tiokarbonil","tiol"],
  halogen: ["alkil-halogenid","aril-halogenid","halogenezett","klorszilan","savhalogenid"],
  foszfor: ["foszfat-eszter","foszfin","foszfin-oxid","foszfit","foszfit-eszter","foszfonsav"],
  szilicium: ["klorszilan","organoszilan","szilandiol","szilanol","szilil-eter","sziloxan"]
};

function molekulaCsaladCsoportjai(csalad) {
  const csoportok = MOLEKULA_CSALAD_CSOPORTOK
    .map((csoport) => csoport.id)
    .filter((csoportId) =>
      MOLEKULA_CSALAD_CSOPORT_TAGOK[csoportId]?.includes(csalad)
    );
  return csoportok.length > 0 ? csoportok : ["szerkezeti"];
}

function csaladCsoportAllapotFrissitese(tarolo) {
  for (const csoport of tarolo.querySelectorAll(".csalad-csoport")) {
    const mind = csoport.querySelector("[data-csoport-mind]");
    const csaladok = [...csoport.querySelectorAll("input[data-csalad]")];
    if (!mind || csaladok.length === 0) continue;
    const bejelolt = csaladok.filter((jelolo) => jelolo.checked).length;
    mind.indeterminate = bejelolt > 0 && bejelolt < csaladok.length;
    mind.checked = bejelolt === csaladok.length;
  }
}

function csaladKijelolesSzinkronizalasa(tarolo, csalad, bejelolve) {
  for (const jelolo of tarolo.querySelectorAll("input[data-csalad]")) {
    if (jelolo.value === csalad) jelolo.checked = bejelolve;
  }
}

function csaladValasztoEsemenyek(tarolo) {
  if (tarolo.dataset.valasztoBekotve === "1") return;
  tarolo.dataset.valasztoBekotve = "1";

  tarolo.addEventListener("change", (event) => {
    const cel = event.target;
    if (!(cel instanceof HTMLInputElement)) return;

    if (cel.dataset.csoportMind) {
      const csoport = cel.closest(".csalad-csoport");
      cel.indeterminate = false;
      for (const jelolo of csoport.querySelectorAll("input[data-csalad]")) {
        csaladKijelolesSzinkronizalasa(tarolo, jelolo.value, cel.checked);
      }
      csaladCsoportAllapotFrissitese(tarolo);
      return;
    }

    if (!cel.dataset.csalad) return;
    csaladKijelolesSzinkronizalasa(tarolo, cel.value, cel.checked);
    csaladCsoportAllapotFrissitese(tarolo);
  });

  tarolo.addEventListener("click", (event) => {
    const gomb = event.target.closest(".csalad-csoport-nyito");
    if (!gomb || !tarolo.contains(gomb)) return;
    const lista = document.getElementById(gomb.getAttribute("aria-controls"));
    const nyitva = gomb.getAttribute("aria-expanded") === "true";
    gomb.setAttribute("aria-expanded", nyitva ? "false" : "true");
    if (lista) lista.hidden = nyitva;
  });
}

function csaladCsoportokMegjelenitese(tarolo, csaladok) {
  const csoportTagok = new Map(
    MOLEKULA_CSALAD_CSOPORTOK.map((csoport) => [csoport.id, []])
  );

  for (const csalad of csaladok) {
    if (typeof csalad !== "string" || !csalad.trim()) continue;
    for (const csoportId of molekulaCsaladCsoportjai(csalad)) {
      csoportTagok.get(csoportId)?.push(csalad);
    }
  }

  tarolo.replaceChildren();

  for (const csoport of MOLEKULA_CSALAD_CSOPORTOK) {
    const tagok = csoportTagok.get(csoport.id) ?? [];
    if (tagok.length === 0) continue;
    tagok.sort((a, b) => a.localeCompare(b, "hu"));

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
      "Az összes család ebben a csoportban: " + csoport.cim
    );

    const listaId = "tanora-csalad-" + csoport.id;
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
  csaladCsoportAllapotFrissitese(tarolo);
}

function tiltottCsaladokKiolvasasa() {
  const tarolo = elem("tanora-csaladok");
  const jelolok = [
    ...tarolo.querySelectorAll('input[type="checkbox"][data-csalad]')
  ];
  const bejelolt = new Set(
    jelolok.filter((j) => j.checked).map((j) => j.value)
  );

  if (osszesCsalad.length === 0 || bejelolt.size === 0) {
    throw new Error("Legalább egy molekulacsaládot jelölj be.");
  }

  return osszesCsalad.filter((csalad) => !bejelolt.has(csalad));
}

async function csaladSzurokBetoltese() {
  const tarolo = elem("tanora-csaladok");
  try {
    const valasz = await fetch("/jatek/jatek-adatok-v1.json", {
      cache: "no-store"
    });
    if (!valasz.ok) throw new Error("Nem sikerült betölteni a játékadatokat.");
    const csomag = await valasz.json();
    const csaladok = [
      ...new Set(
        (csomag.molekulak || [])
          .flatMap((m) => Array.isArray(m.csaladok) ? m.csaladok : [])
          .filter((c) => typeof c === "string" && c.trim())
          .map((c) => c.trim())
      )
    ].sort((a, b) => a.localeCompare(b, "hu"));

    if (csaladok.length === 0) {
      throw new Error("A játékadatcsomagban nincsenek családok.");
    }

    osszesCsalad = csaladok;
    csaladCsoportokMegjelenitese(tarolo, csaladok);
  } catch (hiba) {
    tarolo.textContent = "A családok betöltése sikertelen.";
    elem("tanora-gomb").disabled = true;
    throw hiba;
  }
}

async function api(ut, beallitas = {}) {
  const valasz = await fetch(ut, {
    ...beallitas,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {})
    }
  });

  const adat = await valasz.json();
  if (!valasz.ok) throw new Error(adat.hiba || "A kérés sikertelen.");
  return adat;
}

function inditasGombFrissitese() {
  elem("tanora-inditas").disabled =
    !aktualisTanoraId ||
    jatekosDarab < 1 ||
    tanoraElinditva !== null;
}

function inditasIdoMegjelenitese(elinditva) {
  if (!elinditva) {
    elem("tanora-inditas-ido").hidden = true;
    elem("tanora-inditas-ido").textContent = "";
    return;
  }

  elem("tanora-inditas-ido").textContent =
    "Kezdés időpontja: " + elinditva;
  elem("tanora-inditas-ido").hidden = false;
}

function jatekoslistaMegjelenitese(jatekosok) {
  const lista = Array.isArray(jatekosok) ? jatekosok : [];
  const hely = elem("jatekosok");
  hely.replaceChildren();

  for (const jatekos of lista) {
    const sor = document.createElement("li");
    const becenev = String(jatekos?.becenev ?? "");
    const pont = Number(jatekos?.pont);
    const teljesitett = Number(jatekos?.teljesitettRendelesek);
    const pontSzoveg = Number.isFinite(pont) ? Math.max(0, Math.floor(pont)) : 0;
    const feladatSzoveg = Number.isFinite(teljesitett)
      ? Math.max(0, Math.floor(teljesitett))
      : 0;

    sor.textContent =
      becenev +
      " — " +
      pontSzoveg +
      " pont, " +
      feladatSzoveg +
      " kész feladat";
    hely.append(sor);
  }

  jatekosDarab = lista.length;
  elem("jatekos-szam").textContent =
    jatekosDarab + " csatlakozott diák";
  inditasGombFrissitese();
}

function jatekoslistaTorlese() {
  aktualisTanoraId = null;
  tanoraElinditva = null;
  jatekosDarab = 0;
  elem("jatekoslista").hidden = true;
  elem("jatekoslista-uzenet").textContent = "";
  inditasIdoMegjelenitese(null);
  jatekoslistaMegjelenitese([]);
}

function tanoraMeghivoTorlese() {
  elem("tanora-meghivo").hidden = true;
  elem("tanora-helyi-proba").hidden = true;
  elem("tanora-meghivo-cimke").textContent = "";
  elem("tanora-meghivo-link").textContent = "";
  elem("tanora-qr").replaceChildren();
  elem("tanora-eredmeny").textContent = "";
  jatekoslistaTorlese();
}

function tanoraMeghivoMegjelenitese(meghivoToken) {
  const alap = String(DIAK_MEGHIVO_ORIGIN).replace(/\\/+$/, "");
  const url =
    alap +
    "/csatlakozas#meghivo=" +
    encodeURIComponent(meghivoToken);

  elem("tanora-meghivo").hidden = false;
  elem("tanora-helyi-proba").hidden = !DIAK_MEGHIVO_HELYI_PROBA;
  elem("tanora-meghivo-cimke").textContent = DIAK_MEGHIVO_HELYI_PROBA
    ? "Olvasd be a QR-kódot, vagy nyisd meg a helyi próbalinket:"
    : "Olvasd be a QR-kódot a csatlakozáshoz:";
  elem("tanora-meghivo-link").textContent = url;

  const qrHely = elem("tanora-qr");
  qrHely.replaceChildren();

  if (typeof QRCode !== "function") {
    qrHely.textContent = "A QR-kód könyvtár nem töltődött be.";
    return;
  }

  new QRCode(qrHely, {
    text: url,
    width: 192,
    height: 192
  });
}

async function jatekoslistaFrissitese() {
  if (!aktualisTanoraId) {
    throw new Error("Nincs aktív tanóra.");
  }

  const adat = await api(
    "/api/tanora/" + encodeURIComponent(aktualisTanoraId) + "/jatekosok"
  );

  if (!adat?.sikeres || !Array.isArray(adat.jatekosok)) {
    throw new Error("A játékoslista hiányos választ adott.");
  }

  jatekoslistaMegjelenitese(adat.jatekosok);
}

elem("belepes").addEventListener("submit", async (esemeny) => {
  esemeny.preventDefault();
  elem("belepes-gomb").disabled = true;
  elem("uzenet").textContent = "Belépés…";

  try {
    const adat = await api("/api/belepes", {
      method: "POST",
      body: JSON.stringify({
        email: elem("email").value,
        jelszo: elem("jelszo").value
      })
    });

    token = adat.token;
    elem("jelszo").value = "";
    tanoraMeghivoTorlese();

    elem("azonosito").textContent =
      "Bejelentkezve: " + adat.felhasznalo.email;

    const admin = adat.felhasznalo.szerepkor === "admin";
    elem("osszefoglalo").hidden = !admin;

    if (admin) {
      const osszeg = await api("/api/admin/osszefoglalo");

      for (const id of ["molekulak", "reakciok", "termekek"]) {
        elem(id).textContent = osszeg[id];
      }
    } else {
      for (const id of ["molekulak", "reakciok", "termekek"]) {
        elem(id).textContent = "";
      }
    }

    elem("belepes").hidden = true;
    elem("fiok").hidden = false;
    elem("uzenet").textContent = "Sikeres belépés a saját szerverre.";
  } catch (hiba) {
    elem("uzenet").textContent = hiba.message;
  } finally {
    elem("belepes-gomb").disabled = false;
  }
});

elem("tanora-urlap").addEventListener("submit", async (esemeny) => {
  esemeny.preventDefault();
  elem("tanora-gomb").disabled = true;
  elem("tanora-eredmeny").textContent = "Tanóra létrehozása…";
  tanoraMeghivoTorlese();

  try {
    const adat = await api("/api/tanora/letrehozas", {
      method: "POST",
      body: JSON.stringify({
        idotartamMasodperc: Number(elem("tanora-idotartam").value),
        maxNehezseg: Number(elem("tanora-nehezseg").value),
        tiltottCsaladok: tiltottCsaladokKiolvasasa()
      })
    });

    const meghivoToken = adat?.tanora?.meghivoToken;
    const tanoraId = adat?.tanora?.id;

    if (
      !adat?.sikeres ||
      typeof meghivoToken !== "string" ||
      !meghivoToken ||
      typeof tanoraId !== "string" ||
      !tanoraId
    ) {
      throw new Error("A tanóra létrejött, de hiányos választ kaptunk.");
    }

    aktualisTanoraId = tanoraId;
    tanoraElinditva = null;
    elem("tanora-eredmeny").textContent = "A tanóra meghívója kész.";
    tanoraMeghivoMegjelenitese(meghivoToken);
    elem("jatekoslista").hidden = false;
    inditasIdoMegjelenitese(null);
    jatekoslistaMegjelenitese([]);
    elem("jatekoslista-uzenet").textContent = "";
  } catch (hiba) {
    elem("tanora-eredmeny").textContent = hiba.message;
  } finally {
    elem("tanora-gomb").disabled = false;
  }
});

elem("jatekoslista-frissites").addEventListener("click", async () => {
  elem("jatekoslista-frissites").disabled = true;
  elem("jatekoslista-uzenet").textContent = "Lista frissítése…";

  try {
    await jatekoslistaFrissitese();
    elem("jatekoslista-uzenet").textContent = "";
  } catch (hiba) {
    elem("jatekoslista-uzenet").textContent = hiba.message;
  } finally {
    elem("jatekoslista-frissites").disabled = false;
  }
});

elem("tanora-inditas").addEventListener("click", async () => {
  if (!aktualisTanoraId || jatekosDarab < 1 || tanoraElinditva !== null) {
    return;
  }

  elem("tanora-inditas").disabled = true;
  elem("jatekoslista-uzenet").textContent = "Játék indítása…";

  try {
    const adat = await api(
      "/api/tanora/" + encodeURIComponent(aktualisTanoraId) + "/inditas",
      { method: "POST", body: "{}" }
    );

    const elinditva = adat?.tanora?.elinditva;

    if (!adat?.sikeres || typeof elinditva !== "string" || !elinditva) {
      throw new Error("A játék indítása hiányos választ adott.");
    }

    tanoraElinditva = elinditva;
    inditasIdoMegjelenitese(elinditva);
    inditasGombFrissitese();
    elem("jatekoslista-uzenet").textContent = "";
  } catch (hiba) {
    elem("jatekoslista-uzenet").textContent = hiba.message;
    inditasGombFrissitese();
  }
});

csaladSzurokBetoltese().catch((hiba) => {
  console.error(hiba);
  elem("uzenet").textContent =
    hiba.message || "A molekulacsaládok betöltése sikertelen.";
});

elem("kilepes").addEventListener("click", async () => {
  elem("kilepes").disabled = true;

  try {
    await api("/api/kilepes", {
      method: "POST",
      body: "{}"
    });

    token = null;
    tanoraMeghivoTorlese();
    elem("osszefoglalo").hidden = true;
    elem("fiok").hidden = true;
    elem("belepes").hidden = false;
    elem("uzenet").textContent = "Kijelentkeztél.";
  } catch (hiba) {
    elem("uzenet").textContent = hiba.message;
  } finally {
    elem("kilepes").disabled = false;
  }
});
</script>
</main>
</body>
</html>`;

const CSATLAKOZAS_OLDAL = `<!doctype html>
<html lang="hu">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Csatlakozás a tanórához</title>
<style>
body{font:17px system-ui,sans-serif;background:#f1f5f9;color:#172033;margin:0;padding:40px 20px}
main{max-width:520px;margin:auto;background:white;padding:28px;border-radius:16px}
h1{font-size:25px;margin-top:0}
label{display:block;margin:18px 0 6px}
input{box-sizing:border-box;width:100%;padding:11px;font:inherit;border:1px solid #94a3b8;border-radius:7px;background:white}
button{margin-top:20px;padding:11px 20px;font:inherit;background:#1849a9;color:white;border:0;border-radius:7px;cursor:pointer}
button:disabled{opacity:.6}
#uzenet{white-space:pre-wrap;min-height:1.5em}
#varakozas p{margin:10px 0}
#becenev-megjelenites{font-size:22px;font-weight:700}
#visszaszamlalo{font-size:36px;font-weight:700;letter-spacing:.04em}
</style>
</head>
<body>
<main>
<h1>Csatlakozás a tanórához</h1>

<form id="csatlakozas" hidden>
<label for="becenev">Becenév</label>
<input id="becenev" name="becenev" type="text"
  autocomplete="nickname" required maxlength="30">

<button id="csatlakozas-gomb" type="submit">Csatlakozás</button>
</form>

<section id="varakozas" hidden>
<p>Csatlakozva mint:</p>
<p id="becenev-megjelenites"></p>
<p id="varakozas-szoveg">Várakozás a tanár indítására</p>
<p id="visszaszamlalo" hidden></p>
</section>

<p id="uzenet" role="status" aria-live="polite"></p>

<script nonce="__NONCE__">
const elem = (id) => document.getElementById(id);
const TANULO_MUNKAMENET_KULCS = "szerves-jatek-tanulo-munkamenet";
const MEGHIVO_TOKEN_MINTA = /^[A-Za-z0-9_-]{43}$/;

let allapotFigyelo = null;
let allapotFolyamatban = false;
let helyiIdozito = null;
let orajel = null;
let aktivMeghivoToken = null;

function idoFormazas(masodperc) {
  const mp = Math.max(0, Math.floor(masodperc));
  const perc = Math.floor(mp / 60);
  const maradek = mp % 60;
  return String(perc).padStart(2, "0") + ":" +
    String(maradek).padStart(2, "0");
}

function munkamenetBetoltese() {
  const szoveg = sessionStorage.getItem(TANULO_MUNKAMENET_KULCS);
  if (!szoveg) return null;

  try {
    const mentett = JSON.parse(szoveg);
    if (
      typeof mentett?.jatekosId !== "string" ||
      typeof mentett?.jatekosToken !== "string" ||
      typeof mentett?.becenev !== "string"
    ) {
      return null;
    }
    return mentett;
  } catch {
    sessionStorage.removeItem(TANULO_MUNKAMENET_KULCS);
    return null;
  }
}

function munkamenetTorlese() {
  sessionStorage.removeItem(TANULO_MUNKAMENET_KULCS);
}

function figyelesLeallitasa() {
  if (allapotFigyelo !== null) {
    clearInterval(allapotFigyelo);
    allapotFigyelo = null;
  }
  if (helyiIdozito !== null) {
    clearInterval(helyiIdozito);
    helyiIdozito = null;
  }
  orajel = null;
}

function urlapVisszaallitasa(uzenet) {
  figyelesLeallitasa();
  munkamenetTorlese();
  elem("varakozas").hidden = true;
  elem("visszaszamlalo").hidden = true;
  elem("visszaszamlalo").textContent = "";
  elem("varakozas-szoveg").textContent =
    "Várakozás a tanár indítására";
  elem("csatlakozas").hidden = false;
  elem("uzenet").textContent = uzenet || "";
}

function visszaszamlaloFrissitese() {
  if (!orajel) return;

  const eltelthelyi = Date.now() - orajel.helyiMs;
  const becsultSzerver = orajel.szerverMs + eltelthelyi;
  const hatralevo = Math.ceil((orajel.lejaratMs - becsultSzerver) / 1000);

  if (hatralevo <= 0) {
    elem("varakozas-szoveg").textContent = "A játék véget ért";
    elem("visszaszamlalo").textContent = "00:00";
    elem("visszaszamlalo").hidden = false;
    figyelesLeallitasa();
    return;
  }

  elem("varakozas-szoveg").textContent = "Hátralévő idő";
  elem("visszaszamlalo").textContent = idoFormazas(hatralevo);
  elem("visszaszamlalo").hidden = false;
}

function allapotMegjelenitese(tanora) {
  if (tanora.allapot === "varakozik") {
    orajel = null;
    if (helyiIdozito !== null) {
      clearInterval(helyiIdozito);
      helyiIdozito = null;
    }
    elem("varakozas-szoveg").textContent =
      "Várakozás a tanár indítására";
    elem("visszaszamlalo").hidden = true;
    elem("visszaszamlalo").textContent = "";
    return;
  }

  if (
    tanora.allapot === "folyamatban" &&
    typeof tanora.lejarat === "string" &&
    typeof tanora.szerverido === "string"
  ) {
    const munkamenet = munkamenetBetoltese();
    const kod = munkamenet?.csatlakozasiKod;

    if (typeof kod === "string" && kod) {
      figyelesLeallitasa();
      location.assign(
        "/jatek/?ora=" + encodeURIComponent(kod)
      );
      return;
    }

    throw new Error("Hiányzó tanórakód a munkamenetben.");
  }

  elem("varakozas-szoveg").textContent = "A játék véget ért";
  elem("visszaszamlalo").textContent = "00:00";
  elem("visszaszamlalo").hidden = false;
  figyelesLeallitasa();
}

async function allapotLekerdezese() {
  if (allapotFolyamatban) return;

  const munkamenet = munkamenetBetoltese();
  if (!munkamenet) {
    figyelesLeallitasa();
    return;
  }

  allapotFolyamatban = true;

  try {
    const valasz = await fetch("/api/tanora/jatekos-allapot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jatekosId: munkamenet.jatekosId,
        jatekosToken: munkamenet.jatekosToken
      })
    });

    const adat = await valasz.json();

    if (valasz.status === 401) {
      urlapVisszaallitasa(
        adat.hiba || "A csatlakozás érvénytelen vagy lejárt."
      );
      return;
    }

    if (!valasz.ok) {
      throw new Error(adat.hiba || "Az állapot lekérdezése sikertelen.");
    }

    if (!adat?.sikeres || !adat?.tanora?.allapot) {
      throw new Error("Az állapot hiányos választ adott.");
    }

    allapotMegjelenitese(adat.tanora);
  } catch (hiba) {
    elem("uzenet").textContent = hiba.message;
  } finally {
    allapotFolyamatban = false;
  }
}

function allapotFigyelesInditasa() {
  if (allapotFigyelo !== null) return;
  allapotLekerdezese();
  allapotFigyelo = setInterval(allapotLekerdezese, 2000);
}

function varakozasMegjelenitese(becenev) {
  elem("csatlakozas").hidden = true;
  elem("becenev-megjelenites").textContent = becenev;
  elem("varakozas").hidden = false;
  elem("uzenet").textContent = "";
  allapotFigyelesInditasa();
}

function meghivoTokenAzUrlbol() {
  const nyers = String(location.hash || "").replace(/^#/, "");
  if (!nyers) return null;

  const parameterek = new URLSearchParams(nyers);
  const token = parameterek.get("meghivo");
  if (typeof token !== "string") return null;

  const tisztitott = token.trim();
  return MEGHIVO_TOKEN_MINTA.test(tisztitott) ? tisztitott : null;
}

function meghivoTorleseACimsorbol() {
  history.replaceState(
    null,
    "",
    location.pathname + location.search
  );
}

elem("csatlakozas").addEventListener("submit", async (esemeny) => {
  esemeny.preventDefault();

  if (!aktivMeghivoToken) {
    elem("uzenet").textContent =
      "Hibás vagy lejárt meghívó.";
    return;
  }

  elem("csatlakozas-gomb").disabled = true;
  elem("uzenet").textContent = "Csatlakozás…";

  try {
    const valasz = await fetch("/api/tanora/csatlakozas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meghivoToken: aktivMeghivoToken,
        becenev: elem("becenev").value
      })
    });

    const adat = await valasz.json();
    if (!valasz.ok) {
      throw new Error(
        adat.hiba || "Hibás vagy lejárt meghívó."
      );
    }

    const jatekos = adat?.jatekos;
    const kod = adat?.tanora?.csatlakozasiKod;

    if (
      !adat?.sikeres ||
      !jatekos?.id ||
      typeof jatekos.jatekosToken !== "string" ||
      typeof jatekos.becenev !== "string" ||
      typeof kod !== "string" ||
      !kod
    ) {
      throw new Error("A csatlakozás hiányos választ adott.");
    }

    sessionStorage.setItem(
      TANULO_MUNKAMENET_KULCS,
      JSON.stringify({
        csatlakozasiKod: kod,
        jatekosId: jatekos.id,
        jatekosToken: jatekos.jatekosToken,
        becenev: jatekos.becenev,
        idotartamMasodperc:
          adat?.tanora?.idotartamMasodperc ?? 900
      })
    );

    meghivoTorleseACimsorbol();
    aktivMeghivoToken = null;
    varakozasMegjelenitese(jatekos.becenev);
  } catch (hiba) {
    elem("uzenet").textContent = hiba.message;
  } finally {
    elem("csatlakozas-gomb").disabled = false;
  }
});

aktivMeghivoToken = meghivoTokenAzUrlbol();

if (aktivMeghivoToken) {
  figyelesLeallitasa();
  munkamenetTorlese();
  elem("varakozas").hidden = true;
  elem("csatlakozas").hidden = false;
  elem("uzenet").textContent = "";
} else {
  const mentett = munkamenetBetoltese();
  if (mentett) {
    varakozasMegjelenitese(mentett.becenev);
  } else {
    elem("csatlakozas").hidden = true;
    elem("uzenet").textContent =
      "Hibás vagy lejárt meghívó.";
  }
}
</script>
</main>
</body>
</html>`;

function httpKezelo(mod, engedelyezettEredetek) {
  return async (keres, valasz) => {
  try {
    const eredet = kerestEredet(keres, engedelyezettEredetek);

    if (!eredet) {
      throw hiba(403, "Nem engedélyezett kiszolgálócím.");
    }

    if (
      keres.headers.origin &&
      !engedelyezettEredetek.has(keres.headers.origin)
    ) {
      throw hiba(403, "Nem engedélyezett oldal.");
    }

    if (
      keres.method === "POST" &&
      !engedelyezettEredetek.has(keres.headers.origin)
    ) {
      throw hiba(403, "Hiányzó vagy érvénytelen kérési eredet.");
    }

    const ut = new URL(keres.url, eredet).pathname;

    if (!diakUtEngedelyezett(mod, keres.method, ut)) {
      throw hiba(404, "Nincs ilyen végpont.");
    }

    if (keres.method === "GET" && jatekFajlKiszolgalasa(ut, valasz)) {
      return;
    }

    if (await pubchemImportKezeles({
  keres,
  valasz,
  ut,
  db,
  belepettFelhasznalo,
  valaszKuldese,
  torzsBeolvasasa
})) return;
    if (await molekulaElutasitasKezeles({
  keres,
  valasz,
  ut,
  db,
  belepettFelhasznalo,
  valaszKuldese,
  torzsBeolvasasa
})) return;
    if (await sztereoKezeles({
  keres,
  valasz,
  ut,
  db,
  belepettFelhasznalo,
  valaszKuldese,
  torzsBeolvasasa
})) return;
    if (await molekulaElozetKezeles({
  keres, valasz, ut, db,
  belepettFelhasznalo, valaszKuldese
})) return;
    if (await molekulaJovahagyasKezeles({
  keres, valasz, ut, db,
  belepettFelhasznalo, valaszKuldese, torzsBeolvasasa
})) return;
    if (await molekulaMentesKezeles({
  keres,
  valasz,
  ut,
  db,
  belepettFelhasznalo,
  valaszKuldese,
  torzsBeolvasasa
})) return;
    if (await adminKezeles({
  keres,
  valasz,
  ut,
  db,
  belepettFelhasznalo,
  valaszKuldese
})) return;

    if (keres.method === "GET" && ut === "/") {
      const nonce = randomBytes(18).toString("base64");

      return valaszKuldese(
        valasz,
        200,
        OLDAL
          .replaceAll("__NONCE__", nonce)
          .replaceAll("__DIAK_MEGHIVO_ORIGIN__", DIAK_MEGHIVO_ORIGIN)
          .replaceAll(
            "__DIAK_MEGHIVO_HELYI__",
            DIAK_MEGHIVO_HELYI_PROBA ? "true" : "false"
          ),
        {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Security-Policy":
            `default-src 'none'; script-src 'nonce-${nonce}' https://cdnjs.cloudflare.com; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
          "Referrer-Policy": "no-referrer"
        }
      );
    }

    if (
      keres.method === "GET" &&
      (ut === "/csatlakozas" || ut === "/csatlakozas/")
    ) {
      const nonce = randomBytes(18).toString("base64");

      return valaszKuldese(
        valasz,
        200,
        CSATLAKOZAS_OLDAL.replace("__NONCE__", nonce),
        {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Security-Policy":
            `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
          "Referrer-Policy": "no-referrer"
        }
      );
    }

    if (keres.method === "GET" && ut === "/api/allapot") {
      const rekord = db.prepare(`
        SELECT ertek FROM rendszer WHERE kulcs = 'letrehozva'
      `).get();

      if (!rekord) throw new Error("Hiányzó rendszeradat.");

      return valaszKuldese(valasz, 200, {
        sikeres: true,
        szerver: "kemia-szerver",
        adatbazis: "SQLite",
        letrehozva: rekord.ertek
      });
    }

    if (keres.method === "POST" && ut === "/api/belepes") {
      if (Date.now() >= probaAblakVege) {
        probak = 0;
        probaAblakVege = Date.now() + 10 * 60 * 1000;
      }

      if (probak >= 5) {
        throw hiba(
          429,
          "Túl sok sikertelen belépés. Tíz perc elteltével próbáld újra."
        );
      }

      if (belepesFolyamatban) {
        throw hiba(
          429,
          "Egy belépés ellenőrzése folyamatban van. Próbáld újra pár másodperc múlva."
        );
      }

      belepesFolyamatban = true;

      try {
        const adat = await torzsBeolvasasa(keres);

        if (
          typeof adat.email !== "string" ||
          adat.email.length > 254 ||
          typeof adat.jelszo !== "string" ||
          adat.jelszo.length < 1 ||
          adat.jelszo.length > 256
        ) {
          throw hiba(400, "Hiányzó vagy érvénytelen belépési adatok.");
        }

        const email = adat.email.trim().toLowerCase();

        const fiok = db.prepare(`
          SELECT id, email, jelszo_hash, szerepkor, aktiv
          FROM felhasznalok
          WHERE email = ?
        `).get(email);

        const egyezik = await jelszoEllenorzese(
          adat.jelszo,
          fiok?.jelszo_hash
        );

        if (!fiok || fiok.aktiv !== 1 || !egyezik) {
          probak++;
          throw hiba(401, "Hibás e-mail-cím vagy jelszó.");
        }

        const token = randomBytes(32).toString("base64url");
        const most = Date.now();
        const lejarat = most + 8 * 60 * 60 * 1000;

        db.exec("BEGIN IMMEDIATE;");

        try {
          db.prepare(`
            DELETE FROM belepesi_munkamenetek WHERE lejarat <= ?
          `).run(most);

          db.prepare(`
            INSERT INTO belepesi_munkamenetek
            VALUES (?, ?, ?, ?)
          `).run(tokenHash(token), fiok.id, most, lejarat);

          db.exec("COMMIT;");
        } catch (mentesiHiba) {
          db.exec("ROLLBACK;");
          throw mentesiHiba;
        }

        probak = 0;

        return valaszKuldese(valasz, 200, {
          sikeres: true,
          token,
          lejarat: new Date(lejarat).toISOString(),
          felhasznalo: {
            id: fiok.id,
            email: fiok.email,
            szerepkor: fiok.szerepkor
          }
        });
      } finally {
        belepesFolyamatban = false;
      }
    }

    if (keres.method === "GET" && ut === "/api/fiok") {
      const f = belepettFelhasznalo(keres);

      return valaszKuldese(valasz, 200, {
        sikeres: true,
        felhasznalo: {
          id: f.id,
          email: f.email,
          szerepkor: f.szerepkor
        }
      });
    }

    if (
      keres.method === "GET" &&
      ut === "/api/admin/osszefoglalo"
    ) {
      const f = belepettFelhasznalo(keres);

      if (f.szerepkor !== "admin") {
        throw hiba(403, "Adminjogosultság szükséges.");
      }

      const adatok = db.prepare(`
        SELECT
          (SELECT count(*) FROM molekulak) AS molekulak,
          (SELECT count(*) FROM szintezis_reakciok) AS reakciok,
          (SELECT count(*) FROM szintezis_reakcio_termekek) AS termekek
      `).get();

      return valaszKuldese(valasz, 200, {
        sikeres: true,
        ...adatok
      });
    }

    if (keres.method === "POST" && ut === "/api/kilepes") {
      const f = belepettFelhasznalo(keres);

      db.prepare(`
        DELETE FROM belepesi_munkamenetek WHERE token_hash = ?
      `).run(f.token_hash);

      return valaszKuldese(valasz, 200, {
        sikeres: true
      });
    }

    if (
      keres.method === "POST" &&
      ut === "/api/tanora/letrehozas"
    ) {
      const f = belepettFelhasznalo(keres);

      if (
        f.szerepkor !== "admin" &&
        f.szerepkor !== "tanar"
      ) {
        throw hiba(
          403,
          "Tanóra létrehozásához admin vagy tanár jogosultság szükséges."
        );
      }

      const adat = await torzsBeolvasasa(keres);
      const idotartamMasodperc = adat.idotartamMasodperc;
      const maxNehezseg = adat.maxNehezseg;
      const tiltottCsaladok = adat.tiltottCsaladok;

      if (
        !Number.isInteger(idotartamMasodperc) ||
        idotartamMasodperc < 600 ||
        idotartamMasodperc > 1200
      ) {
        throw hiba(
          400,
          "Az időtartam 600 és 1200 másodperc közötti egész szám legyen."
        );
      }

      if (
        !Number.isInteger(maxNehezseg) ||
        maxNehezseg < 1 ||
        maxNehezseg > 3
      ) {
        throw hiba(
          400,
          "A nehézség 1 és 3 közötti egész szám legyen."
        );
      }

      if (
        !Array.isArray(tiltottCsaladok) ||
        tiltottCsaladok.some(
          (csalad) => typeof csalad !== "string"
        )
      ) {
        throw hiba(
          400,
          "A tiltott családok szövegek tömbje legyen."
        );
      }

      const id = randomUUID();
      const letrehozva = Date.now();
      const tiltottJson = JSON.stringify(tiltottCsaladok);
      const meghivoToken = randomBytes(32).toString("base64url");
      const meghivoTokenHash = tokenHash(meghivoToken);

      const mentes = db.prepare(`
        INSERT INTO tanorak (
          id,
          letrehozo_id,
          csatlakozasi_kod,
          meghivo_token_hash,
          idotartam_masodperc,
          max_nehezseg,
          tiltott_csaladok,
          csalad_szuro_verzio,
          letrehozva
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 2, ?)
      `);

      let csatlakozasiKod = null;

      for (let proba = 0; proba < 16; proba++) {
        const kod = tanoraCsatlakozasiKod();

        try {
          mentes.run(
            id,
            f.id,
            kod,
            meghivoTokenHash,
            idotartamMasodperc,
            maxNehezseg,
            tiltottJson,
            letrehozva
          );
          csatlakozasiKod = kod;
          break;
        } catch (mentesiHiba) {
          if (
            mentesiHiba?.code === "ERR_SQLITE_ERROR" &&
            /UNIQUE/i.test(mentesiHiba.message ?? "")
          ) {
            continue;
          }

          throw mentesiHiba;
        }
      }

      if (!csatlakozasiKod) {
        throw hiba(
          500,
          "Nem sikerült egyedi csatlakozási kódot létrehozni."
        );
      }

      return valaszKuldese(valasz, 201, {
        sikeres: true,
        tanora: {
          id,
          csatlakozasi_kod: csatlakozasiKod,
          meghivoToken
        }
      });
    }

    {
      const jatekosListaUt = tanoraAzonositoAzUtbol(
        ut,
        /^\/api\/tanora\/([^/]+)\/jatekosok$/
      );

      if (keres.method === "GET" && jatekosListaUt) {
        const f = belepettFelhasznalo(keres);
        const tanoraId = jatekosListaUt;

        const tanora = db.prepare(`
          SELECT id, letrehozo_id
          FROM tanorak
          WHERE id = ?
        `).get(tanoraId);

        if (!tanora) {
          throw hiba(404, "A tanóra nem található.");
        }

        if (tanora.letrehozo_id !== f.id) {
          throw hiba(
            403,
            "Csak a tanóra létrehozója kérheti le a játékoslistát."
          );
        }

        const jatekosok = db.prepare(`
          SELECT
            id,
            becenev,
            csatlakozva,
            pont,
            teljesitett_rendelesek
          FROM tanora_jatekosok
          WHERE tanora_id = ?
          ORDER BY csatlakozva ASC, id ASC
        `).all(tanoraId).map((sor) => ({
          id: sor.id,
          becenev: sor.becenev,
          csatlakozva: sor.csatlakozva,
          pont: sor.pont,
          teljesitettRendelesek: sor.teljesitett_rendelesek
        }));

        return valaszKuldese(valasz, 200, {
          sikeres: true,
          jatekosok
        });
      }
    }

    {
      const inditasUt = tanoraAzonositoAzUtbol(
        ut,
        /^\/api\/tanora\/([^/]+)\/inditas$/
      );

      if (keres.method === "POST" && inditasUt) {
        const f = belepettFelhasznalo(keres);
        const tanoraId = inditasUt;

        db.exec("BEGIN IMMEDIATE;");

        try {
          const tanora = db.prepare(`
            SELECT id, letrehozo_id, idotartam_masodperc, elinditva
            FROM tanorak
            WHERE id = ?
          `).get(tanoraId);

          if (!tanora) {
            throw hiba(404, "A tanóra nem található.");
          }

          if (tanora.letrehozo_id !== f.id) {
            throw hiba(
              403,
              "Csak a tanóra létrehozója indíthatja a játékot."
            );
          }

          const diakk = db.prepare(`
            SELECT COUNT(*) AS darab
            FROM tanora_jatekosok
            WHERE tanora_id = ?
          `).get(tanoraId);

          if ((diakk?.darab ?? 0) < 1) {
            throw hiba(
              400,
              "A játék indításához legalább egy csatlakozott diák kell."
            );
          }

          let elinditva = tanora.elinditva;

          if (elinditva == null) {
            elinditva = Date.now();
            db.prepare(`
              UPDATE tanorak
              SET elinditva = ?
              WHERE id = ? AND elinditva IS NULL
            `).run(elinditva, tanoraId);

            const friss = db.prepare(`
              SELECT elinditva
              FROM tanorak
              WHERE id = ?
            `).get(tanoraId);

            elinditva = friss.elinditva;
          }

          db.exec("COMMIT;");

          return valaszKuldese(valasz, 200, {
            sikeres: true,
            tanora: {
              id: tanora.id,
              elinditva: new Date(elinditva).toISOString(),
              idotartamMasodperc: tanora.idotartam_masodperc
            }
          });
        } catch (inditasHiba) {
          db.exec("ROLLBACK;");
          throw inditasHiba;
        }
      }
    }

    if (
      keres.method === "POST" &&
      ut === "/api/tanora/csatlakozas"
    ) {
      const adat = await torzsBeolvasasa(keres);

      if (
        typeof adat.meghivoToken !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/.test(adat.meghivoToken)
      ) {
        throw hiba(400, "Hibás vagy lejárt meghívó.");
      }

      if (typeof adat.becenev !== "string") {
        throw hiba(400, "Hiányzó vagy érvénytelen becenév.");
      }

      const becenev = adat.becenev.trim();

      if (becenev.length < 1 || becenev.length > 30) {
        throw hiba(
          400,
          "A becenév 1 és 30 karakter közötti legyen."
        );
      }

      const tanora = db.prepare(`
        SELECT
          id,
          csatlakozasi_kod,
          idotartam_masodperc,
          elinditva
        FROM tanorak
        WHERE meghivo_token_hash = ?
      `).get(tokenHash(adat.meghivoToken));

      if (!tanora) {
        throw hiba(404, "Hibás vagy lejárt meghívó.");
      }

      if (tanora.elinditva != null) {
        const lejaratMs =
          tanora.elinditva +
          tanora.idotartam_masodperc * 1000;

        if (Date.now() >= lejaratMs) {
          throw hiba(404, "Hibás vagy lejárt meghívó.");
        }
      }

      const id = randomUUID();
      const jatekosToken = randomBytes(32).toString("base64url");
      const csatlakozva = Date.now();

      db.prepare(`
        INSERT INTO tanora_jatekosok (
          id,
          tanora_id,
          becenev,
          csatlakozva,
          jatekos_token_hash
        ) VALUES (?, ?, ?, ?, ?)
      `).run(
        id,
        tanora.id,
        becenev,
        csatlakozva,
        tokenHash(jatekosToken)
      );

      return valaszKuldese(valasz, 201, {
        sikeres: true,
        jatekos: {
          id,
          becenev,
          jatekosToken
        },
        tanora: {
          csatlakozasiKod: tanora.csatlakozasi_kod,
          idotartamMasodperc: tanora.idotartam_masodperc
        }
      });
    }

    if (
      keres.method === "POST" &&
      ut === "/api/tanora/jatekos-allapot"
    ) {
      const adat = await torzsBeolvasasa(keres);

      if (
        typeof adat.jatekosId !== "string" ||
        !TANORA_ID_MINTA.test(adat.jatekosId)
      ) {
        throw hiba(400, "Hiányzó vagy érvénytelen játékosazonosító.");
      }

      if (
        typeof adat.jatekosToken !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/.test(adat.jatekosToken)
      ) {
        throw hiba(400, "Hiányzó vagy érvénytelen játékostoken.");
      }

      const jatekos = db.prepare(`
        SELECT
          j.id,
          j.becenev,
          j.jatekos_token_hash,
          j.pont,
          j.teljesitett_rendelesek,
          t.idotartam_masodperc,
          t.elinditva,
          t.max_nehezseg,
          t.tiltott_csaladok,
          t.csalad_szuro_verzio
        FROM tanora_jatekosok j
        JOIN tanorak t ON t.id = j.tanora_id
        WHERE j.id = ?
      `).get(adat.jatekosId);

      if (
        !jatekos ||
        jatekos.jatekos_token_hash !== tokenHash(adat.jatekosToken)
      ) {
        throw hiba(401, "A csatlakozás érvénytelen vagy lejárt.");
      }

      let tiltottCsaladok;

      try {
        tiltottCsaladok = JSON.parse(jatekos.tiltott_csaladok);
      } catch {
        throw hiba(500, "A tanóra családbeállítása sérült.");
      }

      if (!Array.isArray(tiltottCsaladok)) {
        throw hiba(500, "A tanóra családbeállítása érvénytelen.");
      }

      const csaladSzuroVerzio =
        jatekos.csalad_szuro_verzio === 2 ? 2 : 1;

      const most = Date.now();
      let allapot = "varakozik";
      let lejarat = null;

      if (jatekos.elinditva != null) {
        const lejaratMs =
          jatekos.elinditva +
          jatekos.idotartam_masodperc * 1000;
        lejarat = new Date(lejaratMs).toISOString();
        allapot = most < lejaratMs ? "folyamatban" : "befejezve";
      }

      return valaszKuldese(valasz, 200, {
        sikeres: true,
        jatekos: {
          id: jatekos.id,
          becenev: jatekos.becenev,
          pont: jatekos.pont,
          teljesitettRendelesek: jatekos.teljesitett_rendelesek
        },
        tanora: {
          allapot,
          elinditva:
            jatekos.elinditva == null
              ? null
              : new Date(jatekos.elinditva).toISOString(),
          idotartamMasodperc: jatekos.idotartam_masodperc,
          maxNehezseg: jatekos.max_nehezseg,
          tiltottCsaladok,
          csaladSzuroVerzio,
          lejarat,
          szerverido: new Date(most).toISOString()
        }
      });
    }

    if (
      keres.method === "POST" &&
      ut === "/api/tanora/eredmeny-frissites"
    ) {
      const adat = await torzsBeolvasasa(keres);

      if (
        typeof adat.jatekosId !== "string" ||
        !TANORA_ID_MINTA.test(adat.jatekosId)
      ) {
        throw hiba(400, "Hiányzó vagy érvénytelen játékosazonosító.");
      }

      if (
        typeof adat.jatekosToken !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/.test(adat.jatekosToken)
      ) {
        throw hiba(400, "Hiányzó vagy érvénytelen játékostoken.");
      }

      const pont = adat.pont;
      const teljesitettRendelesek = adat.teljesitettRendelesek;

      if (!Number.isInteger(pont) || pont < 0) {
        throw hiba(400, "A pontszámnak nemnegatív egésznek kell lennie.");
      }

      if (
        !Number.isInteger(teljesitettRendelesek) ||
        teljesitettRendelesek < 0
      ) {
        throw hiba(
          400,
          "A teljesített feladatok számának nemnegatív egésznek kell lennie."
        );
      }

      const jatekos = db.prepare(`
        SELECT
          j.id,
          j.jatekos_token_hash,
          j.pont,
          j.teljesitett_rendelesek,
          t.elinditva,
          t.idotartam_masodperc
        FROM tanora_jatekosok j
        JOIN tanorak t ON t.id = j.tanora_id
        WHERE j.id = ?
      `).get(adat.jatekosId);

      if (
        !jatekos ||
        jatekos.jatekos_token_hash !== tokenHash(adat.jatekosToken)
      ) {
        throw hiba(401, "A csatlakozás érvénytelen vagy lejárt.");
      }

      if (jatekos.elinditva == null) {
        throw hiba(409, "A tanóra még nem indult el.");
      }

      const lejaratMs =
        jatekos.elinditva +
        jatekos.idotartam_masodperc * 1000;

      if (Date.now() >= lejaratMs) {
        throw hiba(409, "A tanóra már véget ért.");
      }

      db.prepare(`
        UPDATE tanora_jatekosok
        SET
          pont = MAX(pont, ?),
          teljesitett_rendelesek = MAX(teljesitett_rendelesek, ?)
        WHERE id = ?
      `).run(pont, teljesitettRendelesek, jatekos.id);

      const friss = db.prepare(`
        SELECT pont, teljesitett_rendelesek
        FROM tanora_jatekosok
        WHERE id = ?
      `).get(jatekos.id);

      return valaszKuldese(valasz, 200, {
        sikeres: true,
        jatekos: {
          id: jatekos.id,
          pont: friss.pont,
          teljesitettRendelesek: friss.teljesitett_rendelesek
        }
      });
    }

    return valaszKuldese(valasz, 404, {
      sikeres: false,
      hiba: "Nincs ilyen végpont."
    });
  } catch (esemeny) {
    const statusz = esemeny.statusz ?? 500;

    if (statusz === 500) {
      console.error("Szerverhiba:", esemeny.message);
    }

    if (!valasz.headersSent && !valasz.destroyed) {
      valaszKuldese(valasz, statusz, {
        sikeres: false,
        hiba: statusz === 500
          ? "Belső szerverhiba."
          : esemeny.message
      });
    }
  }
  };
}

const tanarSzerver = createServer(
  httpKezelo("tanar", TANAR_EREDETEK)
);
const diakSzerver = createServer(
  httpKezelo("diak", DIAK_EREDETEK)
);

for (const szerver of [tanarSzerver, diakSzerver]) {
  szerver.requestTimeout = 15000;
  szerver.headersTimeout = 10000;
  szerver.on("error", (esemeny) => {
    console.error("A szerver nem indult el:", esemeny.message);
    db.close();
    process.exitCode = 1;
  });
}

let lealloSzerverek = 0;

function szerverLeallitva() {
  lealloSzerverek += 1;
  if (lealloSzerverek >= 2) {
    db.close();
    console.log("A szerverek leálltak.");
  }
}

tanarSzerver.listen(TANAR_PORT, CIM, () => {
  console.log(`Tanári szerver: http://${CIM}:${TANAR_PORT}/`);
});

diakSzerver.listen(DIAK_PORT, CIM, () => {
  console.log(`Diák szerver: http://${CIM}:${DIAK_PORT}/csatlakozas`);
  if (DIAK_NYILVANOS_ORIGIN) {
    console.log(`Diák nyilvános origin: ${DIAK_NYILVANOS_ORIGIN}`);
  }
  console.log("Leállítás: Ctrl+C");
});

process.once("SIGINT", () => {
  tanarSzerver.close(szerverLeallitva);
  diakSzerver.close(szerverLeallitva);
});