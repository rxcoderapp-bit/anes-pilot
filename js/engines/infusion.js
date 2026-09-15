/**
 * AnesPilot - Infusion & Dilution Calculator Engine
 * References: Morgan & Mikhail's Clinical Anesthesiology (7e) & Goodman & Gilman's (14e)
 * Supports custom drug addition, deletion, and local storage persistence.
 */

export const BASE_INFUSION_DRUGS = {
  norepinephrine: {
    name: "Norepinephrine (Levophed 去甲腎上腺素)",
    unit: "mcg/kg/min",
    isWeightBased: true,
    doseMin: 0.02,
    doseMax: 1.0,
    reference: "Morgan & Mikhail 7e Ch. 14 / Goodman & Gilman 14e Ch. 13",
    pearls: "強效 alpha-1 血管收縮劑，微弱 beta-1 正性肌力；感染性休克及麻醉性血管擴張首選升壓藥",
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
    reference: "Morgan & Mikhail 7e Ch. 14 / Goodman & Gilman 14e Ch. 13",
    pearls: "強效 alpha 與 beta 促效劑；過敏性休克、心臟手術離機、低心輸出量症候群首選",
    presets: [
      { label: "1 mg in 100 mL (10 mcg/mL)", totalDrugMg: 1, totalVolMl: 100, concMcgMl: 10 },
      { label: "4 mg in 250 mL (16 mcg/mL)", totalDrugMg: 4, totalVolMl: 250, concMcgMl: 16 }
    ]
  },
  nicardipine: {
    name: "Nicardipine (Cardene 降壓二氫吡啶類 CCB)",
    unit: "mg/hr",
    isWeightBased: false,
    doseMin: 2.5,
    doseMax: 15.0,
    reference: "Morgan & Mikhail 7e Ch. 14 / Goodman & Gilman 14e Ch. 29",
    pearls: "高度血管選擇性 L-type 鈣通道阻斷劑；精準降壓不抑制心肌收縮力，不引起反射性心跳過速",
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
    reference: "Morgan & Mikhail 7e Ch. 14 / Goodman & Gilman 14e Ch. 13",
    pearls: "低劑量(1-3mcg/kg/min)活化多巴胺受體；中劑量(3-10)興奮beta-1；高劑量(>10)興奮alpha-1收縮血管",
    presets: [
      { label: "200 mg in 250 mL (800 mcg/mL)", totalDrugMg: 200, totalVolMl: 250, concMcgMl: 800 },
      { label: "400 mg in 250 mL (1600 mcg/mL)", totalDrugMg: 400, totalVolMl: 250, concMcgMl: 1600 }
    ]
  },
  propofol: {
    name: "Propofol (二異丙酚 - 靜脈維持 TIVA / 鎮靜)",
    unit: "mg/kg/hr",
    isWeightBased: true,
    doseMin: 1.0,
    doseMax: 12.0,
    reference: "Morgan & Mikhail 7e Ch. 8 / Goodman & Gilman 14e Ch. 21",
    pearls: "全靜脈麻醉維持 (4-10 mg/kg/hr)；加護病房或檢查鎮靜 (0.5-2.0 mg/kg/hr)；止吐與快速復甦",
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
    reference: "Morgan & Mikhail 7e Ch. 9 / Goodman & Gilman 14e Ch. 23",
    pearls: "經非特異性組織及紅血球酯酶水解，無蓄積性，停藥 5-10 分鐘內完全清醒；術後需預先建立長效止痛",
    presets: [
      { label: "1 mg in 50 mL (20 mcg/mL)", totalDrugMg: 1, totalVolMl: 50, concMcgMl: 20 },
      { label: "2 mg in 50 mL (40 mcg/mL)", totalDrugMg: 2, totalVolMl: 50, concMcgMl: 40 }
    ]
  },
  dexmedetomidine: {
    name: "Dexmedetomidine (Precedex 高選擇性 alpha-2 促效劑)",
    unit: "mcg/kg/hr",
    isWeightBased: true,
    doseMin: 0.2,
    doseMax: 1.0,
    reference: "Morgan & Mikhail 7e Ch. 8 / Goodman & Gilman 14e Ch. 13",
    pearls: "Alpha-2:Alpha-1 選擇性比達 1620:1；誘導類似生理睡眠之可喚醒鎮靜，無呼吸抑制，具抗交感與鎮痛輔助作用",
    presets: [
      { label: "200 mcg in 50 mL (4 mcg/mL)", totalDrugMg: 0.2, totalVolMl: 50, concMcgMl: 4 },
      { label: "400 mcg in 100 mL (4 mcg/mL)", totalDrugMg: 0.4, totalVolMl: 100, concMcgMl: 4 }
    ]
  },
  vasopressin: {
    name: "Vasopressin (血管加壓素 / Pitressin)",
    unit: "Units/min",
    isWeightBased: false,
    doseMin: 0.01,
    doseMax: 0.04,
    reference: "Morgan & Mikhail 7e Ch. 14 / Goodman & Gilman 14e Ch. 43",
    pearls: "活化血管平滑肌 V1 受體；在頑固性低血壓、酸中毒及 ACEI 引發之血管麻痺 (Vasoplegia) 具強效升壓作用",
    presets: [
      { label: "20 Units in 100 mL (0.2 U/mL)", totalDrugMg: 20, totalVolMl: 100, concMcgMl: 200 }
    ]
  }
};

export class InfusionEngine {
  static getDrugs() {
    let custom = {};
    try {
      custom = JSON.parse(localStorage.getItem("anes_custom_infusion_drugs") || "{}");
    } catch (e) {
      console.warn("Failed to parse custom drugs:", e);
    }
    return { ...BASE_INFUSION_DRUGS, ...custom };
  }

  static saveCustomDrug(id, drugObj) {
    let custom = {};
    try {
      custom = JSON.parse(localStorage.getItem("anes_custom_infusion_drugs") || "{}");
    } catch (e) {}
    custom[id] = { ...drugObj, isCustom: true };
    localStorage.setItem("anes_custom_infusion_drugs", JSON.stringify(custom));
  }

  static deleteCustomDrug(id) {
    let custom = {};
    try {
      custom = JSON.parse(localStorage.getItem("anes_custom_infusion_drugs") || "{}");
      delete custom[id];
      localStorage.setItem("anes_custom_infusion_drugs", JSON.stringify(custom));
    } catch (e) {}
  }

  static doseToRate(drugId, presetIndex, targetDose, weightKg, customConcMcgMl = null) {
    const drugs = this.getDrugs();
    const drug = drugs[drugId] || BASE_INFUSION_DRUGS.norepinephrine;
    const conc = customConcMcgMl || drug.presets[presetIndex]?.concMcgMl || 1;

    let rateMlHr = 0;
    if (drug.unit === "mcg/kg/min") {
      rateMlHr = (targetDose * weightKg * 60) / conc;
    } else if (drug.unit === "mcg/kg/hr") {
      rateMlHr = (targetDose * weightKg) / conc;
    } else if (drug.unit === "mg/kg/hr") {
      const concMgMl = conc / 1000;
      rateMlHr = (targetDose * weightKg) / concMgMl;
    } else if (drug.unit === "mg/hr") {
      const concMgMl = conc / 1000;
      rateMlHr = targetDose / concMgMl;
    } else if (drug.unit === "Units/min") {
      // conc in Units/mL is concMcgMl / 1000
      const concUMl = conc / 1000;
      rateMlHr = (targetDose * 60) / concUMl;
    }

    return Math.round(rateMlHr * 100) / 100;
  }

  static rateToDose(drugId, presetIndex, rateMlHr, weightKg, customConcMcgMl = null) {
    const drugs = this.getDrugs();
    const drug = drugs[drugId] || BASE_INFUSION_DRUGS.norepinephrine;
    const conc = customConcMcgMl || drug.presets[presetIndex]?.concMcgMl || 1;

    let dose = 0;
    if (drug.unit === "mcg/kg/min") {
      dose = (rateMlHr * conc) / (weightKg * 60);
    } else if (drug.unit === "mcg/kg/hr") {
      dose = (rateMlHr * conc) / weightKg;
    } else if (drug.unit === "mg/kg/hr") {
      const concMgMl = conc / 1000;
      dose = (rateMlHr * concMgMl) / weightKg;
    } else if (drug.unit === "mg/hr") {
      const concMgMl = conc / 1000;
      dose = rateMlHr * concMgMl;
    } else if (drug.unit === "Units/min") {
      const concUMl = conc / 1000;
      dose = (rateMlHr * concUMl) / 60;
    }

    return Math.round(dose * 1000) / 1000;
  }
}
