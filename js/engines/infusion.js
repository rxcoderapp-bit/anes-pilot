/**
 * AnesPilot - Infusion & Dilution Calculator Engine
 */

export const INFUSION_DRUGS = {
  norepinephrine: {
    name: "Norepinephrine (Levophed 去甲腎上腺素)",
    unit: "mcg/kg/min",
    isWeightBased: true,
    doseMin: 0.02,
    doseMax: 1.0,
    presets: [
      { label: "4 mg in 50 mL (80 mcg/mL)", totalDrugMg: 4, totalVolMl: 50, concMcgMl: 80 },
      { label: "4 mg in 250 mL (16 mcg/mL)", totalDrugMg: 4, totalVolMl: 250, concMcgMl: 16 }
    ]
  },
  epinephrine: {
    name: "Epinephrine (Adrenaline 腎上腺素)",
    unit: "mcg/kg/min",
    isWeightBased: true,
    doseMin: 0.01,
    doseMax: 0.5,
    presets: [
      { label: "1 mg in 100 mL (10 mcg/mL)", totalDrugMg: 1, totalVolMl: 100, concMcgMl: 10 },
      { label: "4 mg in 250 mL (16 mcg/mL)", totalDrugMg: 4, totalVolMl: 250, concMcgMl: 16 }
    ]
  },
  nicardipine: {
    name: "Nicardipine (Cardene 降壓藥)",
    unit: "mg/hr",
    isWeightBased: false,
    doseMin: 2.5,
    doseMax: 15.0,
    presets: [
      { label: "10 mg in 100 mL (0.1 mg/mL)", totalDrugMg: 10, totalVolMl: 100, concMcgMl: 100 },
      { label: "25 mg in 250 mL (0.1 mg/mL)", totalDrugMg: 25, totalVolMl: 250, concMcgMl: 100 }
    ]
  },
  dopamine: {
    name: "Dopamine (多巴胺)",
    unit: "mcg/kg/min",
    isWeightBased: true,
    doseMin: 2.0,
    doseMax: 20.0,
    presets: [
      { label: "200 mg in 250 mL (800 mcg/mL)", totalDrugMg: 200, totalVolMl: 250, concMcgMl: 800 },
      { label: "400 mg in 250 mL (1600 mcg/mL)", totalDrugMg: 400, totalVolMl: 250, concMcgMl: 1600 }
    ]
  },
  propofol: {
    name: "Propofol (二異丙酚 - 靜脈維持/鎮靜)",
    unit: "mg/kg/hr",
    isWeightBased: true,
    doseMin: 1.0,
    doseMax: 12.0,
    presets: [
      { label: "1% 原液 (10 mg/mL = 10,000 mcg/mL)", totalDrugMg: 500, totalVolMl: 50, concMcgMl: 10000 },
      { label: "2% 原液 (20 mg/mL = 20,000 mcg/mL)", totalDrugMg: 1000, totalVolMl: 50, concMcgMl: 20000 }
    ]
  },
  remifentanil: {
    name: "Remifentanil (Ultiva 超短效類鴉片)",
    unit: "mcg/kg/min",
    isWeightBased: true,
    doseMin: 0.05,
    doseMax: 0.5,
    presets: [
      { label: "1 mg in 50 mL (20 mcg/mL)", totalDrugMg: 1, totalVolMl: 50, concMcgMl: 20 },
      { label: "2 mg in 50 mL (40 mcg/mL)", totalDrugMg: 2, totalVolMl: 50, concMcgMl: 40 }
    ]
  },
  dexmedetomidine: {
    name: "Dexmedetomidine (Precedex 鎮靜)",
    unit: "mcg/kg/hr",
    isWeightBased: true,
    doseMin: 0.2,
    doseMax: 1.0,
    presets: [
      { label: "200 mcg in 50 mL (4 mcg/mL)", totalDrugMg: 0.2, totalVolMl: 50, concMcgMl: 4 },
      { label: "400 mcg in 100 mL (4 mcg/mL)", totalDrugMg: 0.4, totalVolMl: 100, concMcgMl: 4 }
    ]
  }
};

export class InfusionEngine {
  static doseToRate(drugId, presetIndex, targetDose, weightKg, customConcMcgMl = null) {
    const drug = INFUSION_DRUGS[drugId];
    if (!drug) return 0;
    const conc = customConcMcgMl || drug.presets[presetIndex]?.concMcgMl || 1;

    let rateMlHr = 0;
    if (drug.unit === "mcg/kg/min") {
      // Dose (mcg/kg/min) * weight (kg) * 60 min/hr / conc (mcg/mL)
      rateMlHr = (targetDose * weightKg * 60) / conc;
    } else if (drug.unit === "mcg/kg/hr") {
      // Dose (mcg/kg/hr) * weight (kg) / conc (mcg/mL)
      rateMlHr = (targetDose * weightKg) / conc;
    } else if (drug.unit === "mg/kg/hr") {
      // targetDose is mg/kg/hr -> conc is in mcg/mL (10,000 mcg/mL = 10 mg/mL)
      const concMgMl = conc / 1000;
      rateMlHr = (targetDose * weightKg) / concMgMl;
    } else if (drug.unit === "mg/hr") {
      // conc in mcg/mL -> conc in mg/mL is conc/1000
      const concMgMl = conc / 1000;
      rateMlHr = targetDose / concMgMl;
    }

    return Math.round(rateMlHr * 100) / 100;
  }

  static rateToDose(drugId, presetIndex, rateMlHr, weightKg, customConcMcgMl = null) {
    const drug = INFUSION_DRUGS[drugId];
    if (!drug) return 0;
    const conc = customConcMcgMl || drug.presets[presetIndex]?.concMcgMl || 1;

    let dose = 0;
    if (drug.unit === "mcg/kg/min") {
      // rate (mL/hr) * conc (mcg/mL) / (weight * 60)
      dose = (rateMlHr * conc) / (weightKg * 60);
    } else if (drug.unit === "mcg/kg/hr") {
      dose = (rateMlHr * conc) / weightKg;
    } else if (drug.unit === "mg/kg/hr") {
      const concMgMl = conc / 1000;
      dose = (rateMlHr * concMgMl) / weightKg;
    } else if (drug.unit === "mg/hr") {
      const concMgMl = conc / 1000;
      dose = rateMlHr * concMgMl;
    }

    return Math.round(dose * 1000) / 1000;
  }
}
