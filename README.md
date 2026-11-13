# Kémiai játék – tanári útmutató

## Gyors kezdés Windowsban

1. Csomagold ki a projektet.
2. Kattints duplán a **`Tanora-inditasa.cmd`** fájlra.

Az első indítás automatikusan letölti a szükséges **Node.js**-t és **cloudflared**-et (ha kell), létrehozza a helyi adatbázist a csomag játékadataiból, és készít egy **egyedi jelszavú** tanári fiókot. A belépési adatokat az indítóablak írja ki; a böngészőben csak ezeket kell begépelni.

A következő indítások ugyanazt az adatbázist és fiókot használják.

## Tanóra menete

1. Várd meg, amíg megnyílik a tanári oldal (`http://127.0.0.1:3000/`).
2. Lépj be a konzolablakban megjelenő e-mail-címmel és jelszóval.
3. Hozz létre tanórát, és vesd ki a **QR-kódot**.
4. Várd meg a diákok csatlakozását, majd indítsd el a játékot.
5. A diákok a QR-kód beolvasásával csatlakoznak (mobilinternettel is működik).

**Az óra végéig hagyd nyitva** az indítóablakot. Az ablak bezárása leállítja a helyi szervert és a Cloudflare Tunnelt.

Ha valami hiányzik vagy az indítás elakad, az ablak magyarul kiírja a hibát (például nincs internet a letöltéshez, vagy foglalt a 3000 / 3001-es port).

## Fejlesztői / admin telepítés

Ha admin fiókra van szükséged (nem a tanári csomag egykattintásos módja):

```text
cd kemia-szerver
node telepites.mjs
```
