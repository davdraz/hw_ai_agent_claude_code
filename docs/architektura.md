# Plantbase - architektúra Windowson (fájlstruktúra + főbb döntések)

> Kurzus-melléklet. A "mivel" (verziók, eszközlista, séma) a `stack.md`-ben; itt a STRUKTÚRA és a kulcsdöntések. Ez a változat Windows 11 + PowerShell + Docker Desktop környezetet feltételez.

## Fájlstruktúra (Nx monorepo)

```text
plantbase/
├── packages/core   agent-logika (LLM-hívás, runSql tool, séma-kontextus, naplózás)
├── packages/db     Prisma lib (séma, migráció, kliens, seed) - NEM a gyökérben
├── apps/cli        CLI (ask parancs + interaktív mód)
├── docs            dokumentáció (lásd dev-workflow.md)
└── konfig          nx, package.json, .env, docker-compose

Később (NEM most): apps/api (4. óra), apps/web (5. óra)
```

Windows alatt a repó ajánlott helye natív fejlesztésnél:

```text
C:\dev\plantbase
```

WSL2 használat esetén:

```text
~/dev/plantbase
```

WSL2-ben ne a `/mnt/c/...` alá tedd a repót, mert lassabb lehet a fájlfigyelés és a Node tooling.

(Csak nagy vonalakban; a fájl-szintű bontást Claude generálja a konvenciók szerint.)

## Főbb technológiai döntések

1. **Framework-agnostic core.** A `packages/core` nem ismeri a belépési pontokat (CLI/API/web). Új felület = új app, nem újraírás. (Mastra majd az 5. órán a core köré.)
2. **Két DB-kapcsolat, két jog.** Az agent `runSql`-je READ-ONLY kapcsolaton fut (`DATABASE_URL_READONLY`), csak SELECT. A Prisma READ-WRITE kapcsolaton (`DATABASE_URL`) viszi a sémát, migrációt, seedet. Az agent NEM Prismán kérdez.
3. **Saját agent-loop.** Az `askAgent` az Anthropic SDK-ra (hivatalos kliens, nem nyers HTTP) épülő, kézzel írt tool-use loop, agent-framework nélkül, hogy a mechanika látható maradjon ("az alapoktól").
4. **Átláthatóság beépítve.** Minden interakció JSONL-be naplózva; `--show-prompt` a teljes prompt megjelenítéséhez.
5. **Lokális DB Docker Desktoppal.** `docker compose` Postgres, Docker Desktop futtatja WSL2 backenddel. Helyben dolgozunk, nincs felhő-DB.
6. **Prisma külön Nx lib.** A Prisma (séma, migráció, kliens, seed) a `packages/db` libben él, NEM a repo gyökerében: a séma az Nx graph része, a core és a seed onnan importál.
7. **Library-doksi munka előtt.** Új vagy ritkán használt API-nál (pl. Prisma) ELŐBB beolvassuk a doksit Context7-tel, csak utána kódolunk, mert így kevesebb a hiba a tesztek alatt.
8. **Platformfüggetlen fájlműveletek.** A core és a CLI nem feltételez Unix útvonalakat vagy shell parancsokat. Útvonalhoz `node:path`, folyamatindításhoz Node API vagy package script.

## Windows-specifikus architekturális elvek

- A termékkód nem hív közvetlenül PowerShell-, Bash- vagy Unix-only parancsot.
- A fejlesztői automatizmusok lehetnek PowerShell példák, de a repóban lévő script lehetőleg Node-alapú legyen.
- A CLI parancsok működjenek PowerShellből:

  ```powershell
  pnpm plantbase ask "Milyen alacsony fényigényű, háziállat-barát növény van készleten?"
  pnpm plantbase
  ```

- A logolás relatív projektútvonalra dolgozzon, ne fix `C:\...` útvonalra.
- A Docker kapcsolat `localhost` hosttal működjön Windowsról.

## Adat-elérés

- `packages/db`: Prisma schema, migráció, seed, Prisma kliens.
- `packages/core`: `runSql` tool közvetlen read-only PostgreSQL kapcsolaton.
- `apps/cli`: csak a core publikus API-ját hívja.

Az agent SQL-védelme több rétegű:

- prompt szabály: csak SELECT;
- alkalmazásoldali guard: csak SELECT engedélyezett;
- adatbázis-jogosultság: read-only user;
- külön connection string: `DATABASE_URL_READONLY`.

## Konfiguráció

`.env` példa:

```env
DATABASE_URL="postgresql://plantbase_app:plantbase_app@localhost:5432/plantbase?schema=public"
DATABASE_URL_READONLY="postgresql://plantbase_readonly:plantbase_readonly@localhost:5432/plantbase?schema=public"
ANTHROPIC_API_KEY="..."
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
notepad .env
docker compose up -d
pnpm prisma migrate dev
pnpm seed
```

Konvenciók: `konvenciok.md`. Git/hook/automatizmus: `dev-workflow.md`.

