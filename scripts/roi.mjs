#!/usr/bin/env node
// ROI kalkulátor a Plantbase agentre. Levezetést és a feltételezések indoklását
// lásd: docs/roi.md. Minden paraméter felülírható CLI flaggel, pl.:
//   node scripts/roi.mjs --hourlyRateHuf=12000 --avgCartHufPerRoom=25000
import { parseArgs } from "node:util";

const DEFAULTS = {
  customersPerMonth: 5,
  roomsPerCustomer: 3,
  minutesBeforeLow: 10,
  minutesBeforeHigh: 15,
  minutesAfter: 5,
  hourlyRateHuf: 10000,
  avgCartHufPerRoom: 32000,
  cartSavingsPctLow: 0.05,
  cartSavingsPctHigh: 0.08,
  queriesPerRoom: 4,
  inputTokensPerQuery: 1500,
  outputTokensPerQuery: 400,
  usdToHuf: 380,
  sonnetInputUsdPerMTok: 2.0,
  sonnetOutputUsdPerMTok: 10.0,
};

function parseCliArgs() {
  const options = Object.fromEntries(Object.keys(DEFAULTS).map((key) => [key, { type: "string" }]));
  const { values } = parseArgs({ options, strict: true });

  const parsed = { ...DEFAULTS };
  for (const [key, raw] of Object.entries(values)) {
    if (raw !== undefined) {
      parsed[key] = Number(raw);
    }
  }
  return parsed;
}

function formatHuf(amount) {
  return `${Math.round(amount).toLocaleString("hu-HU")} Ft`;
}

function calculateRoi(params) {
  const roomsPerMonth = params.customersPerMonth * params.roomsPerCustomer;

  const minutesSaved = {
    low: params.minutesBeforeLow - params.minutesAfter,
    high: params.minutesBeforeHigh - params.minutesAfter,
  };
  minutesSaved.avg = (minutesSaved.low + minutesSaved.high) / 2;

  const hoursSavedPerMonth = {
    low: (roomsPerMonth * minutesSaved.low) / 60,
    avg: (roomsPerMonth * minutesSaved.avg) / 60,
    high: (roomsPerMonth * minutesSaved.high) / 60,
  };

  const timeSavingHufPerMonth = {
    low: hoursSavedPerMonth.low * params.hourlyRateHuf,
    avg: hoursSavedPerMonth.avg * params.hourlyRateHuf,
    high: hoursSavedPerMonth.high * params.hourlyRateHuf,
  };

  const cartHufPerMonth = roomsPerMonth * params.avgCartHufPerRoom;
  const cartSavingHufPerMonth = {
    low: cartHufPerMonth * params.cartSavingsPctLow,
    high: cartHufPerMonth * params.cartSavingsPctHigh,
  };
  cartSavingHufPerMonth.avg = (cartSavingHufPerMonth.low + cartSavingHufPerMonth.high) / 2;

  const hardRoiHufPerMonth = {
    low: timeSavingHufPerMonth.low + cartSavingHufPerMonth.low,
    avg: timeSavingHufPerMonth.avg + cartSavingHufPerMonth.avg,
    high: timeSavingHufPerMonth.high + cartSavingHufPerMonth.high,
  };

  const queriesPerMonth = roomsPerMonth * params.queriesPerRoom;
  const costPerQueryUsd =
    (params.inputTokensPerQuery / 1_000_000) * params.sonnetInputUsdPerMTok +
    (params.outputTokensPerQuery / 1_000_000) * params.sonnetOutputUsdPerMTok;
  const costPerQueryHuf = costPerQueryUsd * params.usdToHuf;
  const runningCostHufPerMonth = queriesPerMonth * costPerQueryHuf;

  const netMonthlyHufAvg = hardRoiHufPerMonth.avg - runningCostHufPerMonth;

  return {
    roomsPerMonth,
    queriesPerMonth,
    hoursSavedPerMonth,
    timeSavingHufPerMonth,
    cartHufPerMonth,
    cartSavingHufPerMonth,
    hardRoiHufPerMonth,
    costPerQueryHuf,
    runningCostHufPerMonth,
    netMonthlyHufAvg,
  };
}

function report(params, result) {
  const lines = [
    "=== Plantbase ROI kalkuláció ===",
    "",
    "Feltételezések (--flaggel felülírhatók, lásd docs/roi.md):",
    `  ügyfél/hó: ${params.customersPerMonth}, szoba/ügyfél: ${params.roomsPerCustomer} -> ${result.roomsPerMonth} szoba/hó`,
    `  kézi idő/szoba: ${params.minutesBeforeLow}-${params.minutesBeforeHigh} perc, agenttel: ${params.minutesAfter} perc (KPI)`,
    `  lakberendezői óradíj: ${formatHuf(params.hourlyRateHuf)}/óra`,
    `  átlagos kosárérték/szoba: ${formatHuf(params.avgCartHufPerRoom)}, agent-talált megtakarítás: ${(params.cartSavingsPctLow * 100).toFixed(0)}-${(params.cartSavingsPctHigh * 100).toFixed(0)}%`,
    `  Claude Sonnet 5 ár (intro, 2026-08-31-ig): $${params.sonnetInputUsdPerMTok}/${params.sonnetOutputUsdPerMTok} per MTok (be/ki), ${params.usdToHuf} HUF/USD`,
    "",
    "--- Hard ROI: időmegtakarítás ---",
    `  megtakarított idő/hó: ${result.hoursSavedPerMonth.low.toFixed(2)}-${result.hoursSavedPerMonth.high.toFixed(2)} óra (átlag ${result.hoursSavedPerMonth.avg.toFixed(2)} óra)`,
    `  forintosítva/hó: ${formatHuf(result.timeSavingHufPerMonth.low)} - ${formatHuf(result.timeSavingHufPerMonth.high)} (átlag ${formatHuf(result.timeSavingHufPerMonth.avg)})`,
    "",
    "--- Hard ROI: olcsóbb kosár ---",
    `  kosárérték/hó: ${formatHuf(result.cartHufPerMonth)}`,
    `  megtakarítás/hó: ${formatHuf(result.cartSavingHufPerMonth.low)} - ${formatHuf(result.cartSavingHufPerMonth.high)} (átlag ${formatHuf(result.cartSavingHufPerMonth.avg)})`,
    "",
    "--- Hard ROI összesen ---",
    `  megtakarítás/hó: ${formatHuf(result.hardRoiHufPerMonth.low)} - ${formatHuf(result.hardRoiHufPerMonth.high)} (átlag ${formatHuf(result.hardRoiHufPerMonth.avg)})`,
    `  megtakarítás/év (átlag): ${formatHuf(result.hardRoiHufPerMonth.avg * 12)}`,
    "",
    "--- Üzemeltetési költség (Claude API) ---",
    `  becsült lekérdezés/hó: ${result.queriesPerMonth} (${params.queriesPerRoom} lekérdezés/szoba)`,
    `  ár/lekérdezés: ${formatHuf(result.costPerQueryHuf)}`,
    `  költség/hó: ${formatHuf(result.runningCostHufPerMonth)}`,
    "",
    "--- Nettó eredmény (átlag eset) ---",
    `  nettó megtakarítás/hó: ${formatHuf(result.netMonthlyHufAvg)}`,
    `  nettó megtakarítás/év: ${formatHuf(result.netMonthlyHufAvg * 12)}`,
  ];

  console.log(lines.join("\n"));
}

const params = parseCliArgs();
const result = calculateRoi(params);
report(params, result);
