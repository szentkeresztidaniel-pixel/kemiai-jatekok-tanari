# Kémiai játék – tanári útmutató

**Letöltés:** [Tanári csomag ZIP](https://github.com/szentkeresztidaniel-pixel/kemiai-jatekok-tanari/archive/refs/heads/main.zip)

Csomagold ki a ZIP-et, majd kövesd az alábbi lépéseket.

---
## Első beállítás Windowsban

Ezeket csak egyszer kell elvégezni az adott gépen.

1. Telepítsd a **Node.js**-t a [nodejs.org](https://nodejs.org/) oldalról (LTS változat), majd indítsd újra a gépet, ha a telepítő kéri.
2. Csomagold ki a projektet egy olyan mappába, ahol később megtalálod (például a Dokumentumokba).
3. Töltsd le a **cloudflared** Windows-os fájlt (`cloudflared-windows-amd64.exe`), és másold:
   - ebbe a projektmappába, **vagy**
   - a Letöltések mappába.
4. Nyiss **Parancssort** vagy **PowerShellt**, lépj be a projekt **`kemia-szerver`** mappájába, majd futtasd:

   ```text
   node telepites.mjs
   ```

5. Add meg a belépési e-mail-címedet. A telepítő létrehozza a saját helyi adatbázisodat, és kiír egy **jelszót** – ezt mentsd el biztonságos helyre. A program nem küld e-mailt.

Ha a telepítés sikerült, a gép készen áll a tanórákra.

## Tanóra indítása

1. A projektmappában kattints duplán a **`Tanora-inditasa.cmd`** fájlra.
2. Várd meg, amíg megnyílik a tanári oldal a böngészőben (`http://127.0.0.1:3000/`).
3. Lépj be az e-mail-címeddel és a telepítéskor kapott jelszóval.
4. Hozz létre tanórát, és vesd ki a **QR-kódot**.
5. Várd meg, amíg a diákok csatlakoznak, majd frissítsd a **Játékoslistát**.
6. Ha mindenki megjelent a listán, indítsd el a játékot.
7. A diákok a QR-kód beolvasásával csatlakoznak (mobilinternettel is működik).

**Az óra végéig hagyd nyitva** a Cloudflare Tunnel ablakot és a helyi szerver ablakot. Ha ezeket bezárod, a diákok elveszítik a kapcsolatot.

Ha a 3000-es vagy 3001-es port foglalt, vagy hiányzik a Node.js / cloudflared, az indító magyarul kiírja, mit kell tenni.

