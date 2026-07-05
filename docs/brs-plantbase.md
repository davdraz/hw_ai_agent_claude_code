# Plantbase - Üzleti követelmény-leírás (BRS), Windows-kompatibilis változat

> Kurzus-melléklet. Egyben a build brief, amelyet 1:1 átadunk a Claude Code-nak a projekt elején. A technikai részleteket külön dokumentumok tartalmazzák: `stack.md`, `architektura.md`, `konvenciok.md`, `dev-workflow.md`. Ez a változat kimondja, hogy a v1 Windows 11 + PowerShell + Docker Desktop környezetben is futtatható.

## 1. Üzleti igény / probléma

A lakberendező (a persona) sok időt tölt azzal, hogy a szobák adottságai (fény, méret, szín), az ügyfél igényei és a növény-adatbázis alapján összeállítsa a megfelelő növénycsomagot.

Hol megy el az idő (a kézi munka java):

- webshop-nézegetés, keresgélés;
- méricskélés: belefér-e a térbe (aktuális és kifejlett magasság, cserépméret);
- raktárkészlet-ellenőrzés;
- akciók figyelése;
- belefér-e a büdzsébe.

Az adat megvan, de a kinyerése aprómunka, és SQL-tudást vagy elemzőt igényelne. Ez lassítja az ügyfél-ajánlat összeállítását.

### ROI / mérőszámok

(Az 1. óra Hard/Soft ROI kerete szerint.)

**Hard (forintosítható):**

- Időmegtakarítás: 1 ügyfél átlagosan 3 szoba, jelenleg 10-15 perc/szoba kézzel; havi 5 ügyfél (~15 szoba/hó, ~2,5-3,75 óra/hó). **KPI: 1 szoba < 5 perc** az agenttel.
- Olcsóbb kosár: az agent megtalálja ugyanazt olcsóbban vagy jobb ár-érték alternatívát, és figyeli az akciókat -> alacsonyabb beszerzési költség.

**Soft (valós, de nehezen forintosítható):**

- Magasabb ügyfélélmény (gyorsabb, pontosabb ajánlat).
- Jobb minőségű munka (jobb illeszkedés a tér és az ügyfél igényeihez).

**Bővítési képesség (későbbi):** a lakberendező korábbi döntéseinek elemzése -> jobb javaslat (ugyanaz olcsóbban, jobb alternatíva). Ehhez az ajánlás-történet tárolása kell; a v1 csak a katalógus felett dolgozik.

## 2. Megoldás

`plantbase`: parancssori (CLI) AI agent, amely a természetes nyelvű kérdést SQL-re fordítja a növény-katalógus (`products`) felett, read-only lefuttatja, és természetes nyelvű választ ad. Önkiszolgáló analitika SQL-tudás nélkül.

A v1 lokálisan futtatható Windows 11-en is:

- PowerShellből indítható CLI;
- Docker Desktopban futó PostgreSQL;
- Node LTS + pnpm alapú TypeScript monorepo;
- `.env` alapú lokális konfiguráció;
- nincs szükség felhő-adatbázisra.

Skálázódási irány a kurzus során: otthoni segéd -> ecommerce -> ügyfélszolgálat -> logisztika. Ugyanaz a minta (LLM + tool + adat) skálázódik.

## 3. Hatókör (scope, v1)

Benne (v1):

- A `products` katalógus feletti természetes nyelvű kérdés-válasz.
- Read-only adat-elérés.
- CLI felület: `ask` parancs + interaktív mód.
- Windows-kompatibilis lokális futtatás PowerShellből.
- PostgreSQL indítása Docker Desktoppal.

Kívül (későbbi órák):

- Rendelés/bevétel adat, írás vagy módosítás.
- Web és voice felület.
- Több felhasználó, jogosultságkezelés.
- Windows installer vagy külön desktop app.

## 4. Követelmények

### Funkcionális (FR)

- **FR1, Kérdezés:** `plantbase ask "<kérdés>"` egyszeri lekérdezés, és interaktív readline mód (amíg `exit`).
- **FR2, NL -> SQL:** az agent az LLM-mel SQL-t generál, és a `runSql` toolon keresztül futtatja; több lépéses (multistep) loop a végleges válaszig.
- **FR3, Válasz:** a lekérdezés eredményéből természetes nyelvű választ ad.
- **FR4, Naplózás:** minden interakciót logol (`logs/<timestamp>.jsonl`): system prompt, üzenetek, generált SQL, eredmény, válasz, token-felhasználás.
- **FR5, Átláthatóság:** `--show-prompt` mód, amely kiírja a teljes üzenet-tömböt.
- **FR6, Windows futtatás:** a lokális fejlesztői és demo futtatás működik Windows 11 + PowerShell + Docker Desktop környezetben.

### Nem-funkcionális (NFR)

- **NFR1, Biztonság:** az agent read-only adatbázis-kapcsolaton fut, csak SELECT.
- **NFR2, Átláthatóság:** a működés naplóból és `--show-prompt`-ból követhető.
- **NFR3, Karbantarthatóság:** a `konvenciok.md` és `architektura.md` betartása.
- **NFR4, Reprodukálhatóság:** a projekt a `stack.md` szerinti, legfrissebb stabil eszközökkel felépíthető.
- **NFR5, Windows-kompatibilitás:** a dokumentált setup nem igényel macOS- vagy Linux-only eszközt; OrbStack helyett Docker Desktopot használ.

## 5. Sikerkritériumok

- A felhasználó természetes nyelven kérdez a katalógusról, és helyes, érthető választ kap SQL-tudás nélkül.
- Demo-kritérium: élő kérdés -> helyes SQL -> helyes válasz.
- Az agent soha nem módosítja az adatot (csak SELECT, read-only kapcsolat).
- Minden interakció naplózva; a működés `--show-prompt`-tal átlátható.
- **Hatékonyság (KPI):** egy szoba növénycsomagja 5 perc alatt összeállítható (a korábbi 10-15 perc helyett).
- **Windows demo-kritérium:** friss Windows 11 gépen, telepített Git + Node LTS + pnpm + Docker Desktop mellett a projekt PowerShellből indítható.

## 6. Adat

A `products` (növény-katalógus) tábla a domain. A pontos séma a `stack.md`-ben. Szintetikus, kb. 30 növényes seed, valós fajnevekkel és reális attribútumokkal.

## 7. Windows futtatási elvárás

A v1 dokumentált minimum futtatási útja:

```powershell
git clone <repo-url> plantbase
cd .\plantbase
corepack enable
pnpm install
Copy-Item .env.example .env
docker compose up -d
pnpm prisma migrate dev
pnpm seed
pnpm plantbase ask "Milyen kezdőbarát, háziállat-barát szobanövény van készleten?"
```

A tényleges scriptnevek a projekt `package.json` fájljában legyenek rögzítve, de a felhasználói élmény célja ez: Windows alatt ne kelljen Bash-specifikus parancsokat ismerni.

