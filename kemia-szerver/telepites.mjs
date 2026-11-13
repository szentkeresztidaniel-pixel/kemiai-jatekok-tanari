import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createHash, randomBytes, randomUUID, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { createInterface } from "node:readline/promises";
import { DatabaseSync } from "node:sqlite";

const csomagUtvonal = new URL("./jatek-adatok-v1.json", import.meta.url);
const adatokMappa = new URL("./adatok/", import.meta.url);
const dbUtvonal = fileURLToPath(new URL("kemia.sqlite", adatokMappa));
const tanariBelepesUtvonal = fileURLToPath(
  new URL("../tanari-belepes.helyi", import.meta.url)
);
const scryptAszinkron = promisify(scrypt);
const automatikusTanar =
  process.env.KEMIA_TELEPITES_MOD?.trim() === "tanar";

let db;
let beolvaso;
let tranzakcio = false;

function ellenoriz(feltetel, uzenet) {
  if (!feltetel) throw new Error(uzenet);
}

const objektum = (v) =>
  v !== null && typeof v === "object" && !Array.isArray(v);

const szoveg = (v) =>
  typeof v === "string" && v.trim().length > 0;

const lista = (v) =>
  Array.isArray(v) && v.every(szoveg);

const szazalek = (v) =>
  v === null ||
  (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 100);

try {
  ellenoriz(
    existsSync(csomagUtvonal),
    "Hiányzik a jatek-adatok-v1.json a telepites.mjs mellől."
  );

  const forras = readFileSync(csomagUtvonal, "utf8")
    .replace(/^\uFEFF/, "");

  const csomag = JSON.parse(forras);

  ellenoriz(
    objektum(csomag) && csomag.schemaVerzio === 1,
    "Hibás adatcsomag-verzió."
  );

  ellenoriz(
    Array.isArray(csomag.molekulak) && csomag.molekulak.length > 0,
    "Hiányzó molekulalista."
  );

  ellenoriz(Array.isArray(csomag.reakciok), "Hiányzó reakciólista.");

  const molekulaIdk = new Set();

  for (const m of csomag.molekulak) {
    ellenoriz(
      objektum(m) && szoveg(m.id) && !molekulaIdk.has(m.id),
      "Hibás vagy ismétlődő molekulaazonosító."
    );

    ellenoriz(
      szoveg(m.preferalt_nev) && szoveg(m.osszegkeplet),
      `Hiányzó név vagy képlet: ${m.id}`
    );

    ellenoriz(
      lista(m.csaladok) && [1, 2, 3].includes(m.nehezseg),
      `Hibás család vagy nehézség: ${m.id}`
    );

    ellenoriz(
      objektum(m.adat) &&
      m.adat.id === m.id &&
      Array.isArray(m.adat.atomok) &&
      Array.isArray(m.adat.kotesek),
      `Hiányos szerkezet: ${m.id}`
    );

    molekulaIdk.add(m.id);
  }

  const reakcioIdk = new Set();
  let termekDarab = 0;

  for (const r of csomag.reakciok) {
    ellenoriz(
      objektum(r) && szoveg(r.id) && !reakcioIdk.has(r.id),
      "Hibás vagy ismétlődő reakcióazonosító."
    );

    ellenoriz(
      molekulaIdk.has(r.kiindulasi_molekula_id),
      `Hiányzó kiindulási molekula: ${r.id}`
    );

    for (const mezo of [
      "reagensek",
      "katalizatorok",
      "oldoszerek",
      "jatek_feltetelek",
      "kilepo_anyagok"
    ]) {
      ellenoriz(lista(r[mezo]), `Hibás ${mezo}: ${r.id}`);
    }

    for (const mezo of ["jatek_feny", "reakcio_tipus"]) {
      ellenoriz(
        r[mezo] === null || typeof r[mezo] === "string",
        `Hibás ${mezo}: ${r.id}`
      );
    }

    ellenoriz(
      Array.isArray(r.termekek) && r.termekek.length > 0,
      `Hiányzó terméklista: ${r.id}`
    );

    const sorszamok = new Set();
    const termekIdk = new Set();
    let osszArany = 0;

    for (const t of r.termekek) {
      ellenoriz(
        objektum(t) &&
        Number.isInteger(t.termek_sorszam) &&
        t.termek_sorszam >= 0 &&
        !sorszamok.has(t.termek_sorszam),
        `Hibás terméksorszám: ${r.id}`
      );

      ellenoriz(
        molekulaIdk.has(t.molekula_id) &&
        !termekIdk.has(t.molekula_id),
        `Hiányzó vagy ismétlődő termék: ${r.id}`
      );

      ellenoriz(
        szazalek(t.termekarany_szazalek) &&
        szazalek(t.hozam_szazalek),
        `Hibás százalékérték: ${r.id}`
      );

      if (t.termek_sorszam === 0) {
        ellenoriz(
          t.molekula_id !== r.kiindulasi_molekula_id,
          `A főtermék azonos a kiindulási molekulával: ${r.id}`
        );
      }

      sorszamok.add(t.termek_sorszam);
      termekIdk.add(t.molekula_id);
      osszArany += t.termekarany_szazalek ?? 0;
      termekDarab++;
    }

    ellenoriz(
      sorszamok.has(0) && osszArany <= 100.00000001,
      `Hibás főtermék vagy termékarány: ${r.id}`
    );

    reakcioIdk.add(r.id);
  }

  mkdirSync(adatokMappa, { recursive: true });

  db = new DatabaseSync(dbUtvonal);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");

  const vanTabla = () => db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    LIMIT 1
  `).get();

  ellenoriz(
    !vanTabla(),
    "Az adatbázis már tartalmaz adatokat. A telepítő nem írja felül őket."
  );

  let email;
  let szerepkor;

  if (automatikusTanar) {
    console.log("Új helyi adatbázis és tanári fiók létrehozása…");
    email = "tanar@helyi.local";
    szerepkor = "tanar";
  } else {
    beolvaso = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const megszakitas = new AbortController();
    beolvaso.once("SIGINT", () => megszakitas.abort());

    console.log("Új helyi adatbázis és adminisztrátori fiók létrehozása.");
    console.log("Az e-mail-cím belépési azonosító; a program nem küld levelet.");

    email = (
      await beolvaso.question("Belépési e-mail-cím: ", {
        signal: megszakitas.signal
      })
    ).trim().toLowerCase();

    beolvaso.close();
    beolvaso = undefined;

    ellenoriz(
      email.length <= 254 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      "Érvénytelen e-mail-cím. Futtasd újra a telepítőt."
    );

    szerepkor = "admin";
  }

  const jelszo = randomBytes(24).toString("base64url");
  const so = randomBytes(32);

  const hash = await scryptAszinkron(jelszo, so, 64, {
    N: 131072,
    r: 8,
    p: 1,
    maxmem: 256 * 1024 * 1024
  });

  const jelszoHash = [
    "scrypt",
    131072,
    8,
    1,
    so.toString("hex"),
    hash.toString("hex")
  ].join("$");

  db.exec("BEGIN IMMEDIATE;");
  tranzakcio = true;

  ellenoriz(
    !vanTabla(),
    "Időközben már létrejött az adatbázis. Nem írtam felül."
  );

  db.exec(`
    CREATE TABLE rendszer (
      kulcs TEXT PRIMARY KEY,
      ertek TEXT NOT NULL
    );

    CREATE TABLE felhasznalok (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT COLLATE NOCASE NOT NULL UNIQUE,
      jelszo_hash TEXT NOT NULL,
      szerepkor TEXT NOT NULL
        CHECK (szerepkor IN ('admin','tanar')),
      aktiv INTEGER NOT NULL DEFAULT 1 CHECK (aktiv IN (0,1)),
      letrehozva TEXT NOT NULL
    ) STRICT;

    CREATE TABLE molekulak (
      id TEXT PRIMARY KEY NOT NULL,
      preferalt_nev TEXT NOT NULL,
      osszegkeplet TEXT NOT NULL,
      csaladok TEXT NOT NULL CHECK (json_valid(csaladok)),
      nehezseg INTEGER NOT NULL CHECK (nehezseg BETWEEN 1 AND 3),
      adat TEXT NOT NULL CHECK (json_valid(adat)),
      aktiv INTEGER NOT NULL DEFAULT 1 CHECK (aktiv IN (0,1))
    );

    CREATE TABLE szintezis_reakciok (
      id TEXT PRIMARY KEY NOT NULL,
      kiindulasi_molekula_id TEXT NOT NULL REFERENCES molekulak(id),
      reagensek TEXT NOT NULL CHECK (json_valid(reagensek)),
      katalizatorok TEXT NOT NULL CHECK (json_valid(katalizatorok)),
      oldoszerek TEXT NOT NULL CHECK (json_valid(oldoszerek)),
      jatek_feltetelek TEXT NOT NULL CHECK (json_valid(jatek_feltetelek)),
      jatek_feny TEXT,
      reakcio_tipus TEXT,
      kilepo_anyagok TEXT NOT NULL CHECK (json_valid(kilepo_anyagok)),
      aktiv INTEGER NOT NULL DEFAULT 1 CHECK (aktiv IN (0,1)),
      elutasitva INTEGER NOT NULL DEFAULT 0 CHECK (elutasitva IN (0,1)),
      ord_reakcio_id TEXT
    );

    CREATE TABLE szintezis_reakcio_termekek (
      reakcio_id TEXT NOT NULL
        REFERENCES szintezis_reakciok(id) ON DELETE CASCADE,
      termek_sorszam INTEGER NOT NULL CHECK (termek_sorszam >= 0),
      molekula_id TEXT NOT NULL REFERENCES molekulak(id),
      termekarany_szazalek REAL
        CHECK (termekarany_szazalek BETWEEN 0 AND 100),
      hozam_szazalek REAL CHECK (hozam_szazalek BETWEEN 0 AND 100),
      PRIMARY KEY (reakcio_id,termek_sorszam),
      UNIQUE (reakcio_id,molekula_id)
    );

    CREATE INDEX szintezis_kiindulasi_idx
      ON szintezis_reakciok(kiindulasi_molekula_id);

    CREATE INDEX szintezis_termek_molekula_idx
      ON szintezis_reakcio_termekek(molekula_id);
  `);

  const molekulaMentes = db.prepare(`
    INSERT INTO molekulak
      (id,preferalt_nev,osszegkeplet,csaladok,nehezseg,adat)
    VALUES (?,?,?,?,?,?)
  `);

  for (const m of csomag.molekulak) {
    molekulaMentes.run(
      m.id,
      m.preferalt_nev,
      m.osszegkeplet,
      JSON.stringify(m.csaladok),
      m.nehezseg,
      JSON.stringify(m.adat)
    );
  }

  const reakcioMentes = db.prepare(`
    INSERT INTO szintezis_reakciok
      (id,kiindulasi_molekula_id,reagensek,katalizatorok,oldoszerek,
       jatek_feltetelek,jatek_feny,reakcio_tipus,kilepo_anyagok)
    VALUES (?,?,?,?,?,?,?,?,?)
  `);

  const termekMentes = db.prepare(`
    INSERT INTO szintezis_reakcio_termekek
      (reakcio_id,termek_sorszam,molekula_id,
       termekarany_szazalek,hozam_szazalek)
    VALUES (?,?,?,?,?)
  `);

  for (const r of csomag.reakciok) {
    reakcioMentes.run(
      r.id,
      r.kiindulasi_molekula_id,
      JSON.stringify(r.reagensek),
      JSON.stringify(r.katalizatorok),
      JSON.stringify(r.oldoszerek),
      JSON.stringify(r.jatek_feltetelek),
      r.jatek_feny,
      r.reakcio_tipus,
      JSON.stringify(r.kilepo_anyagok)
    );

    for (const t of r.termekek) {
      termekMentes.run(
        r.id,
        t.termek_sorszam,
        t.molekula_id,
        t.termekarany_szazalek,
        t.hozam_szazalek
      );
    }
  }

  const rendszerMentes = db.prepare(`
    INSERT INTO rendszer (kulcs,ertek) VALUES (?,?)
  `);

  const most = new Date().toISOString();

  rendszerMentes.run("letrehozva", most);
  rendszerMentes.run(
    "jatek_adatcsomag_sha256",
    createHash("sha256").update(forras).digest("hex")
  );

  db.prepare(`
    INSERT INTO felhasznalok
      (id,email,jelszo_hash,szerepkor,aktiv,letrehozva)
    VALUES (?,?,?,?,1,?)
  `).run(randomUUID(), email, jelszoHash, szerepkor, most);

  ellenoriz(
    db.prepare("PRAGMA foreign_key_check").all().length === 0,
    "Hibás adatbázis-kapcsolat."
  );

  db.exec("COMMIT;");
  tranzakcio = false;

  if (automatikusTanar) {
    const tartalom = [
      "# Helyi tanari belepes - ezt a fajlt az indito hozza letre.",
      "# Egyedi jelszo ehhez a telepiteshez; ne torold.",
      "EMAIL=" + email,
      "JELSZO=" + jelszo,
      ""
    ].join("\r\n");

    writeFileSync(tanariBelepesUtvonal, tartalom, {
      encoding: "utf8",
      flag: "w"
    });
  }

  console.log("\nA telepítés sikerült.");
  console.log(`Molekulák: ${csomag.molekulak.length}`);
  console.log(`Reakciók: ${csomag.reakciok.length}`);
  console.log(`Reakció–termék kapcsolatok: ${termekDarab}`);
  console.log(`E-mail-cím: ${email}`);
  console.log(`Jelszó: ${jelszo}`);
  console.log(
    automatikusTanar
      ? "A belépési adatok a tanari-belepes.helyi fájlba kerültek."
      : "Mentsd el a jelszót; az adatbázis csak a hashét tárolja."
  );
  console.log("Az adatbázis: adatok/kemia.sqlite. A szerver indítása külön lépés.");
} catch (hiba) {
  if (tranzakcio) {
    try {
      db.exec("ROLLBACK;");
    } catch {}
  }

  if (hiba.name === "AbortError") {
    console.log("\nA telepítés megszakítva.");
  } else {
    console.error("A telepítés nem történt meg:", hiba.message);
    process.exitCode = 1;
  }
} finally {
  beolvaso?.close();
  db?.close();
}