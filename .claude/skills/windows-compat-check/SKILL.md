---
name: windows-compat-check
description: Use before committing new or changed scripts, package.json scripts, or file-path handling code in this repo, to catch Unix-only shell syntax or hardcoded path separators that would break the documented Windows 11 + PowerShell + Docker Desktop setup (NFR5).
---

# Windows-kompatibilitási ellenőrzés (NFR5)

## Miért ez a skill

A `brs-plantbase.md` NFR5-e és a "Windows demo-kritérium" kimondja, hogy a projektnek friss Windows 11 gépen, Git + Node LTS + pnpm + Docker Desktop mellett, PowerShellből indíthatónak kell lennie - macOS/Linux-only eszköz nélkül. Az `architektura.md` és a `konvenciok.md` ezt tovább konkretizálja: a termékkód nem hívhat közvetlenül PowerShell-, Bash- vagy Unix-only parancsot, az útvonalkezelés `node:path`/`node:url`-t használ, és a repóban lévő automatizmus lehetőleg Node-script, nem shell-script. Ez egy visszatérően, explicit módon kiemelt kockázat ezekben a dokumentumokban - jellemzően ott csúszik be hiba, ahol valaki egy gyors shell one-linert ír a fejlesztés hevében.

## Mikor fusson

Bármely commit előtt, ami az alábbiak közül újat ad hozzá vagy módosít:

- `scripts/` alatti fájl (pl. `scripts/roi.mjs`, `scripts/db/init/*`)
- `package.json` `scripts` blokkja
- bármilyen `packages/*/src` vagy `apps/*/src` fájl, ami fájlrendszer-műveletet vagy útvonal-összefűzést végez
- Claude Code hook-konfiguráció (`.claude/settings.json`), ami parancsot indít

## Ellenőrzési lista

1. **Shell-specifikus szintaxis.** Nincs `$FILE`-szerű Bash-változó, nincs `&&`/`;` láncolás feltételezve POSIX shellben, nincs backtick command substitution egy olyan script/parancs belsejében, ami PowerShellből is fut.
2. **Útvonal-kezelés.** Node kódban nincs kézzel, string-konkatenációval épített útvonal (`dir + "/" + file`); mindenhol `node:path` (`path.join`, `path.resolve`) vagy `node:url` (`fileURLToPath`) szerepel. Nincs feltételezés arra, hogy az elválasztó `/` vagy `\`.
3. **Repo-scriptek Node-alapúak.** Ha egy új fejlesztői automatizmus kerül a `scripts/` mappába, `.mjs`/`.ts` (Node), nem `.sh`/`.ps1`, hacsak a `dev-workflow.md` kifejezetten nem kér platform-specifikus példát (azok csak dokumentációs illusztrációk, nem repo-fájlok).
4. **`package.json` scriptek.** A parancsok Windows PowerShellből is lefutnak-e változtatás nélkül (pl. nincs `rm -rf`, `cp`, `export VAR=`, csak `node`, `tsx`, `nx`, `vitest`, `eslint`, `prettier`, `prisma` és hasonló, platformfüggetlen CLI-hívás).
5. **Naplózás és relatív útvonal.** Ha a változtatás logol vagy fájlba ír, a célútvonal projekt-relatív (`path.join(projectRoot, "logs", ...)`), nem fix `C:\...` vagy `/home/...` abszolút útvonal.
6. **Docker/DB kapcsolat.** Ha érint DB-kapcsolati stringet, az `localhost`-tal működik Windowsról (Docker Desktop, nem OrbStack-feltételezés).

## Mit jelents

Ha bármelyik pont sérül, jelezd a felhasználónak a konkrét sort és azt, melyik dokumentált szabályt (NFR5, `konvenciok.md` "Windows-kompatibilis útvonalkezelés" szakasza) sérti, mielőtt commitolnál.
