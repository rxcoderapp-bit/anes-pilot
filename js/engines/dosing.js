/**
 * AnesPilot - Dosing Engine
 */
import { DRUG_DATABASE } from "../data/drugData.js";

export class DosingEngine {
  static calculateAll(params) {
    const { ageYears, weightKg, heightCm, isFemale } = params;

    const ibw = DRUG_DATABASE.calculateIBW(heightCm, isFemale, ageYears);
    const airway = DRUG_DATABASE.calculateAirway(ageYears, weightKg, isFemale);
    const fluids = DRUG_DATABASE.calculateFluids(weightKg);
    const blood = DRUG_DATABASE.calculateBlood(weightKg, ageYears, isFemale);
    const dosages = DRUG_DATABASE.getDosages(weightKg, ageYears, isFemale, ibw);

    // Calculate BSA (Mosteller formula)
    let bsa = null;
    if (heightCm && weightKg) {
      bsa = Math.round(Math.sqrt((heightCm * weightKg) / 3600) * 100) / 100;
    }

    // Ventilator recommendation: 6 - 8 mL/kg of IBW (or TBW if no height)
    const ventBaseWeight = (ibw && ibw > 0) ? ibw : weightKg;
    const tvLow = Math.round(ventBaseWeight * 6);
    const tvHigh = Math.round(ventBaseWeight * 8);

    return {
      weightKg,
      ageYears,
      isFemale,
      heightCm,
      ibw,
      bsa,
      airway,
      fluids,
      blood,
      dosages,
      ventilator: {
        tvLow,
        tvHigh,
        baseWeight: ventBaseWeight,
        isUsingIbw: Boolean(ibw)
      }
    };
  }
}
