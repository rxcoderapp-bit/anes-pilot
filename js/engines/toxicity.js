/**
 * AnesPilot - Local Anesthetic Toxicity Index Tracker
 * Accurately tracks additive cardiotoxicity & neurotoxicity across multiple agents.
 */

export const LA_AGENTS = {
  lidocaine_plain: {
    name: "Lidocaine (單方 / 無血管收縮劑)",
    defaultConcPercent: 1.0, // 1% = 10 mg/mL
    maxMgPerKg: 4.5,
    maxCeilingMg: 300,
    unitMgPerMl: 10
  },
  lidocaine_epi: {
    name: "Lidocaine + Epinephrine (加腎上腺素)",
    defaultConcPercent: 1.0, // 1% = 10 mg/mL
    maxMgPerKg: 7.0,
    maxCeilingMg: 500,
    unitMgPerMl: 10
  },
  ropivacaine: {
    name: "Ropivacaine (羅哌卡因)",
    defaultConcPercent: 0.2, // 0.2% = 2 mg/mL, or 0.5% = 5 mg/mL
    maxMgPerKg: 3.0,
    maxCeilingMg: 225,
    unitMgPerMl: 2
  },
  bupivacaine_plain: {
    name: "Bupivacaine (麻佳因 / 單方)",
    defaultConcPercent: 0.5, // 0.5% = 5 mg/mL
    maxMgPerKg: 2.0,
    maxCeilingMg: 175,
    unitMgPerMl: 5
  },
  bupivacaine_epi: {
    name: "Bupivacaine + Epinephrine",
    defaultConcPercent: 0.5,
    maxMgPerKg: 2.5,
    maxCeilingMg: 225,
    unitMgPerMl: 5
  },
  levobupivacaine: {
    name: "Levobupivacaine (左旋麻佳因)",
    defaultConcPercent: 0.5,
    maxMgPerKg: 2.5,
    maxCeilingMg: 150,
    unitMgPerMl: 5
  }
};

export class ToxicityEngine {
  static calculateToxicity(weightKg, administeredList, hasHighRiskFactors = false) {
    const riskFactor = hasHighRiskFactors ? 0.8 : 1.0; // 20% safety margin reduction for high-risk patients
    let totalFraction = 0;
    const breakdown = [];

    administeredList.forEach(item => {
      const agent = LA_AGENTS[item.agentId];
      if (!agent) return;

      const safeMaxMg = Math.min(agent.maxCeilingMg, agent.maxMgPerKg * weightKg) * riskFactor;
      // Calculate mg given:
      // item can have volumeMl and concPercent, or directly mg
      let mgGiven = item.mg;
      if (mgGiven == null || isNaN(mgGiven)) {
        const conc = item.concPercent || agent.defaultConcPercent;
        const mgPerMl = conc * 10;
        mgGiven = (item.volumeMl || 0) * mgPerMl;
      }

      const fraction = safeMaxMg > 0 ? (mgGiven / safeMaxMg) : 0;
      totalFraction += fraction;

      breakdown.push({
        agentId: item.agentId,
        name: agent.name,
        mgGiven: Math.round(mgGiven * 10) / 10,
        safeMaxMg: Math.round(safeMaxMg * 10) / 10,
        fractionPercent: Math.round(fraction * 1000) / 10,
        volumeMl: item.volumeMl
      });
    });

    const totalPercent = Math.round(totalFraction * 1000) / 10;
    const remainingFraction = Math.max(0, 1.0 - totalFraction);

    // Remaining capacity in commonly used agents:
    // 1) 1% Lidocaine plain (10 mg/mL)
    const lidoSafeMax = Math.min(LA_AGENTS.lidocaine_plain.maxCeilingMg, LA_AGENTS.lidocaine_plain.maxMgPerKg * weightKg) * riskFactor;
    const remainingLido1PercentMl = Math.max(0, Math.round((lidoSafeMax * remainingFraction) / 10 * 10) / 10);

    // 2) 0.2% Ropivacaine (2 mg/mL)
    const ropiSafeMax = Math.min(LA_AGENTS.ropivacaine.maxCeilingMg, LA_AGENTS.ropivacaine.maxMgPerKg * weightKg) * riskFactor;
    const remainingRopi02PercentMl = Math.max(0, Math.round((ropiSafeMax * remainingFraction) / 2 * 10) / 10);

    // 3) 0.5% Bupivacaine (5 mg/mL)
    const bupiSafeMax = Math.min(LA_AGENTS.bupivacaine_plain.maxCeilingMg, LA_AGENTS.bupivacaine_plain.maxMgPerKg * weightKg) * riskFactor;
    const remainingBupi05PercentMl = Math.max(0, Math.round((bupiSafeMax * remainingFraction) / 5 * 10) / 10);

    let status = "SAFE"; // SAFE (<70%), CAUTION (70-99%), TOXIC (>=100%)
    let statusClass = "text-emerald-400 border-emerald-500/30 bg-emerald-950/20";
    let statusText = "安全性良好 (劑量在安全許可範圍內)";

    if (totalPercent >= 100) {
      status = "TOXIC";
      statusClass = "text-rose-400 border-rose-500/50 bg-rose-950/30 animate-pulse";
      statusText = "🚨 毒性超標警戒！立即停止給藥，嚴密監測 LAST 症候！";
    } else if (totalPercent >= 70) {
      status = "CAUTION";
      statusClass = "text-amber-400 border-amber-500/40 bg-amber-950/30";
      statusText = "⚠️ 接近中毒上限警戒區 (≥ 70%)，建議減少或停止追加！";
    }

    return {
      totalPercent,
      remainingFraction,
      status,
      statusClass,
      statusText,
      breakdown,
      remainingCapacity: {
        lido1PercentMl: remainingLido1PercentMl,
        ropi02PercentMl: remainingRopi02PercentMl,
        bupi05PercentMl: remainingBupi05PercentMl
      }
    };
  }
}
