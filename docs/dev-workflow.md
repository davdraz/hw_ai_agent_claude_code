# Plantbase - fejlesztői workflow + automatizmus Windowson

> Kurzus-melléklet. Konkrét git-szabályok, hook-konfigurációk, dokumentációs folyamat. L1 (amivel építünk): ezt is átadjuk a Claude Code-nak. Ez a változat Windows 11 + PowerShell környezetre van igazítva.

## Alap környezet Windowson

- Terminál: PowerShell 7 ajánlott.
- Git: Git for Windows.
- Package manager: pnpm.
- Node: aktuális LTS.
- Konténer: Docker Desktop WSL2 backenddel.
- Szerkesztő: VS Code, Zed Windows build, Cursor vagy bármely TypeScript-kompatibilis editor.

Ajánlott munkamappa:

```powershell
mkdir C:\dev
cd C:\dev
git clone <repo-url> plantbase
cd .\plantbase
pnpm install
```

Ha WSL2-ben dolgozol, a repó inkább a Linux fájlrendszerben legyen, például `~/dev/plantbase`, ne a `/mnt/c/...` alatt. Natív Windows használatnál maradj PowerShellben és Windows elérési utakon.

## Git

### Branching

- `main`: mindig zöld, deploy-olható. Közvetlenül main-re NEM commitolunk.
- Feature branch: `feat/<rövid-leírás>` (pl. `feat/runsql-tool`). Egyéb prefixek: `fix/`, `refactor/`, `docs/`, `chore/`.
- A kurzus checkpointjai (`stage-N`) branchek a fallbackhez.

Windows PowerShell példa:

```powershell
git switch -c feat/runsql-tool
git status
```

### Commit (Conventional Commits)

Formátum: `<típus>: <leírás>`. Típusok: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`.

Példák:

```powershell
git add .
git commit -m "feat: add read-only runSql tool"
git commit -m "test: cover runSql SELECT-only guard"
```

### Auto-commit

Minden befejezett, koherens lépés után kicsi, fókuszált commit (egy lépés = egy commit). Lásd a `Stop` hookot, ha a kurzus adott pontján bekapcsoljuk.

## Hookok (`settings.json`)

Windows alatt kerüljük a shell-specifikus `$FILE` használatot. A legegyszerűbb stabil megoldás egy kis Node wrapper script, mert ugyanúgy fut PowerShellből, Git Bashből és WSL2-ből is.

Javasolt repo-fájl:

```text
scripts/claude-format-and-test.mjs
```

Tartalma:

```js
import { spawnSync } from "node:child_process";

const file = process.argv[2];

if (!file) {
  process.exit(0);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  return result.status ?? 1;
}

let status = run("pnpm", ["prettier", "--write", file]);

if (status === 0) {
  status = run("pnpm", ["vitest", "related", "--run", file]);
}

process.exit(status);
```

Claude Code hook konfiguráció:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node scripts/claude-format-and-test.mjs \"$FILE\"",
            "timeout": 60000,
            "async": true
          }
        ]
      }
    ]
  }
}
```

- **prettier** (PostToolUse, Edit): formázás szerkesztés után.
- **teszt** (PostToolUse, Edit): a változáshoz tartozó Vitest fut.
- A Node wrapper miatt a parancs Windows PowerShell alatt is működik.

FONTOS: a hookok a **Claude Code (L1) akcióit** fogják meg (amit Claude szerkeszt/futtat), NEM a termék futásidejű SQL-jét. A termék read-only védelme a **DB-kapcsolat (read-only role)**, nem hook, mert a `runSql` a termék kódja, nem Claude Code tool.

## /docs (a repóban)

```text
docs/
├── ddd/
│   ├── glossary.md        ubiquitous language (növény, kategória, fényigény, gondozás...)
│   └── model.md           entitások, value objectek, aggregátumok
└── tech/
    ├── infra.md           Postgres (Docker Desktop docker-compose), .env, a két DB-kapcsolat
    ├── architecture.md    core/apps, adat-elérés, read-only vs Prisma
    └── api.md             tool/CLI felület (ask, runSql)
```

## Dokumentáció-frissítés

A `/docs` frissítését a **`ddd-audit` skill** végzi (git-history -> docs), külön, igény szerint futtatva. NEM készítünk doc-freshness ellenőrző scriptet és Stop hookot az elején. A CI-alapú változat a 4. órán jön (always-on / CI/CD).

## MCP szerverek (`.mcp.json`)

A projekt-szintű `.mcp.json` a Claude Code (L1) fejlesztői eszközhöz köt MCP szervereket - ezek a plantbase agent (L2, termékkód) számára nem elérhetők és nem is szükségesek, kizárólag a fejlesztést segítik.

| Szerver | Cél | Előfeltétel |
|---|---|---|
| `context7` | Friss, verzió-specifikus library-dokumentáció (pl. Prisma) lekérdezése kódolás előtt - ezt az `architektura.md` 7. pontja ("Library-doksi munka előtt") már eddig is elvárta, csak eddig nem volt beállítva. | Nincs (npx-en fut); API kulcs nélkül alap rate limittel működik. |
| `postgres` | A lokális `products` séma és a szintetikus seed-adat közvetlen vizsgálata fejlesztés közben (pl. "milyen kategóriák vannak ténylegesen a DB-ben", migráció utáni ellenőrzés) - Claude Code (L1) oldalról, a termékkód `runSql` tooljától függetlenül. | `uv`/`uvx` telepítve (`pipx install uv` vagy lásd a `postgres-mcp` projekt doksiját); a `DATABASE_URL_READONLY` env változó beállítva (hiányában a lokális dev connection stringre esik vissza). |
| `github` | PR-ek, issue-k és review-kommentek kezelése Claude Code-ból, ugyanarra a repóra, amit eddig a `dev-workflow.md`-ben opcionálisként említett `gh` CLI fedett le - strukturált tool-hívásokkal az ad hoc CLI-parancsok helyett. | `GITHUB_PERSONAL_ACCESS_TOKEN` env változó (repo-scope PAT); a hivatalos, GitHub által hosztolt remote szervert használja (`https://api.githubcopilot.com/mcp/`), nem kell helyben futtatni. |

Fontos: a `postgres` szerver kizárólag a **read-only** kapcsolati stringet (`DATABASE_URL_READONLY`) és `--access-mode=restricted` módot használja - ugyanazt a réteges védelmi elvet követve, amit az `architektura.md` az agent `runSql` toolja kapcsán előír (prompt szabály + app-guard + DB-jogosultság + külön connection string). Az Anthropic hivatalos `@modelcontextprotocol/server-postgres` csomagja NEM lett használva: azt 2025 közepén archiválták, és a read-only védelme egy javítatlan SQL injection sebezhetőség miatt megkerülhető volt. Helyette az aktívan karbantartott `postgres-mcp` (crystaldba) csomag került beállításra, ami a védelmet adatbázis-motor / tranzakció szinten kényszeríti ki, nem szöveges szűréssel.

## Gyakori Windows parancsok

```powershell
pnpm install
pnpm nx graph
pnpm test
pnpm lint
docker compose up -d
docker compose ps
docker compose down
```

`.env` fájl létrehozása PowerShellben:

```powershell
Copy-Item .env.example .env
notepad .env
```

