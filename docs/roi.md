# Plantbase - ROI számítás

> Ez a dokumentum a `brs-plantbase.md` "ROI / mérőszámok" szakaszának Hard/Soft ROI keretét bontja le konkrét, forintosított számításra. A levezetés minden feltételezése itt explicit; a `scripts/roi.mjs` ugyanezt a modellt számolja ki, paraméterezhetően.

## Futtatás

```powershell
pnpm roi
pnpm roi --hourlyRateHuf=15000 --customersPerMonth=8
```

Minden bemenet felülírható CLI flaggel; alapértékek lásd `scripts/roi.mjs` `DEFAULTS` objektuma.

## 1. Alapadatok (a BRS-ből, nem feltételezés)

- 5 ügyfél/hó, ügyfelenként 3 szoba -> **15 szoba/hó**.
- Kézi munka jelenleg: 10-15 perc/szoba.
- KPI cél az agenttel: **< 5 perc/szoba**.

## 2. Feltételezések (nem a BRS-ből, itt rögzítve és indokolva)

Ezeket a számokat a projekt nem rögzíti pontosan; a lenti értékek ésszerű, piaci közelítések, és `scripts/roi.mjs` flaggel felülírhatók, ha pontosabb adat áll rendelkezésre.

| Paraméter | Érték | Indoklás |
|---|---|---|
| Lakberendezői óradíj | 10 000 Ft/óra | Hazai freelance belsőépítész/lakberendezői óradíj durva piaci sávja (8-15 ezer Ft/óra); a sáv közepe. |
| Átlagos kosárérték/szoba | 32 000 Ft | A `products` szintetikus katalógus (`stack.md`) ár-tartománya alapján becsült, kb. 3-4 növény/szoba átlagos csomag. |
| Agent által talált ár-előny (akció/olcsóbb alternatíva) | 5-8% a kosárértékből | A BRS "Olcsóbb kosár" pontja (agent figyeli az akciókat, olcsóbb alternatívát talál) alapján, konzervatív sáv. |
| Lekérdezés/szoba | 4 | Egy szoba ajánlatához jellemzően több `ask` kérdés (fényigény, méret, ár, háziállat-barát stb.), nem egyetlen lekérdezés. |
| Claude Sonnet 5 ár | $2,00 / $10,00 per millió token (be/ki) | Az `ANTHROPIC_MODEL` alapértéke `claude-sonnet-5` (`config.ts`); ez a 2026-08-31-ig érvényes bevezető ár, utána $3,00/$15,00. |
| Token/lekérdezés | ~1500 be / ~400 ki | System prompt + séma-kontextus + üzenet-előzmény (be), generált SQL + rövid válasz (ki), az `askAgent` max. 6 lépéses tool-use loopjában tipikusan 1-3 lépéssel. |
| USD/HUF árfolyam | 380 | Kerekített, 2026 közepi piaci közelítés. |

## 3. Hard ROI - időmegtakarítás

```
megtakarított idő/szoba = kézi idő - agent idő (KPI: 5 perc)
  alacsony eset: 10 - 5 = 5 perc/szoba
  magas eset:    15 - 5 = 10 perc/szoba
  átlag:         12,5 - 5 = 7,5 perc/szoba

megtakarított idő/hó = 15 szoba × megtakarított idő/szoba / 60
  alacsony: 1,25 óra/hó   magas: 2,50 óra/hó   átlag: 1,875 óra/hó

forintosítva/hó = megtakarított idő/hó × 10 000 Ft/óra
  alacsony: 12 500 Ft   magas: 25 000 Ft   átlag: ~18 750 Ft
```

## 4. Hard ROI - olcsóbb kosár

```
kosárérték/hó = 15 szoba × 32 000 Ft/szoba = 480 000 Ft/hó
megtakarítás/hó = kosárérték/hó × 5-8% = 24 000 - 38 400 Ft/hó (átlag ~31 200 Ft)
```

## 5. Hard ROI összesen

```
megtakarítás/hó = időmegtakarítás + kosármegtakarítás
  alacsony: 12 500 + 24 000 = 36 500 Ft/hó
  magas:    25 000 + 38 400 = 63 400 Ft/hó
  átlag:    ~49 950 Ft/hó -> ~599 400 Ft/év
```

## 6. Üzemeltetési költség (Claude API)

```
lekérdezés/hó = 15 szoba × 4 lekérdezés/szoba = 60 lekérdezés/hó
ár/lekérdezés = (1500/1e6 × $2,00) + (400/1e6 × $10,00) = $0,007 ≈ 2,66 Ft (380 HUF/USD árfolyamon)
költség/hó ≈ 60 × 2,66 Ft ≈ 160 Ft/hó
```

A futtatási költség (Claude API hívások) a havi megtakarításhoz (~36 500-63 400 Ft) képest elhanyagolható (~0,2-0,4%-a) - a v1 hard ROI-ját gyakorlatilag nem rontja.

## 7. Nettó eredmény

```
nettó megtakarítás/hó (átlag) = 49 950 - 160 ≈ 49 790 Ft
nettó megtakarítás/év (átlag) ≈ 597 500 Ft
```

A megtérülés (payback) lényegében azonnali: nincs számottevő havi üzemeltetési költség, ami ellensúlyozná a megtakarítást. Az egyszeri fejlesztési ráfordítás (ez a kurzus-projekt) ebből a modellből szándékosan kimarad, mert az egy oktatási költség, nem ismétlődő üzemeltetési tétel.

## 8. Soft ROI (nem forintosítva, a BRS szerint)

- Magasabb ügyfélélmény: gyorsabb, pontosabb ajánlat (a KPI < 5 perc/szoba közvetlen következménye).
- Jobb minőségű munka: pontosabb tér- és igény-illeszkedés, mert az agent következetesen figyelembe veszi a `current_height_cm`/`max_height_cm`/`current_pot_cm` adatokat (lásd a system prompt idevágó szabályát, `system-prompt-review.md` #2).

## 9. Érzékenység

A `scripts/roi.mjs` minden feltételezés-paramétert flag-ként elfogad, így a fenti levezetés gyorsan újraszámolható eltérő óradíjjal, kosárértékkel vagy ügyfélszámmal, anélkül hogy a képleteket kézzel újra kellene írni.
