/**
 * AnesPilot - Pre-op Risk Scores Engine
 * STOP-Bang (OSA), Apfel (PONV), RCRI (Cardiac Risk)
 */

export class ScoresEngine {
  // STOP-Bang for OSA
  static calculateStopBang(answers) {
    // answers is array of boolean [S, T, O, P, B, A, N, G]
    const score = answers.filter(Boolean).length;
    let riskLevel = "低度風險 (Low Risk)";
    let badgeClass = "text-emerald-400 border-emerald-500/30 bg-emerald-950/30";
    let recommendation = "常規呼吸道處置，術後依照標準監測。";

    if (score >= 5 || (score >= 3 && (answers[4] || answers[6] || answers[7]))) {
      riskLevel = "高度風險 (High Risk for OSA)";
      badgeClass = "text-rose-400 border-rose-500/50 bg-rose-950/40";
      recommendation = "🚨 術中易發生難以面罩通氣/插管！拔管需清醒且完全肌鬆逆轉，術後慎用高劑量類鴉片類藥物，強烈建議持續血氧監測或 CPAP。";
    } else if (score >= 3) {
      riskLevel = "中度風險 (Intermediate Risk)";
      badgeClass = "text-amber-400 border-amber-500/40 bg-amber-950/30";
      recommendation = "⚠️ 警惕睡眠呼吸中止症，備妥合適口咽導氣管與影像喉頭鏡。";
    }

    return { score, total: 8, riskLevel, badgeClass, recommendation };
  }

  // Apfel Score for Postoperative Nausea & Vomiting (PONV)
  static calculateApfel(female, nonSmoker, historyPonvOrMotion, postopOpioids) {
    const factors = [female, nonSmoker, historyPonvOrMotion, postopOpioids];
    const score = factors.filter(Boolean).length;

    const riskPercentages = [10, 21, 39, 61, 79];
    const riskPercent = riskPercentages[score];

    let strategy = "";
    let badgeClass = "text-emerald-400 border-emerald-500/30 bg-emerald-950/30";

    if (score === 0 || score === 1) {
      strategy = "低風險（~10-21%）：一般常規處置，無需預防性併用多種止吐劑，可視情況給予單一藥物 (如 Dexamethasone 4-8 mg)。";
    } else if (score === 2) {
      badgeClass = "text-amber-400 border-amber-500/40 bg-amber-950/30";
      strategy = "中度風險（~39%）：建議給予 2 種不同機轉之止吐藥（如誘導時 Dexamethasone 4-8 mg + 關傷口時 Ondansetron 4 mg 或 Granisetron 1 mg）。";
    } else {
      badgeClass = "text-rose-400 border-rose-500/50 bg-rose-950/40";
      strategy = "高度風險（~61-79%）：強烈建議採用多模式 PONV 預防組合：\n1. 優先考慮全靜脈麻醉 (TIVA with Propofol)，避免使用吸入性氣體與 N2O。\n2. 給予 2-3 種止吐劑 (Dexamethasone + 5-HT3 antagonist + Droperidol 0.625mg)。\n3. 考慮局部神經阻滯減少術後鴉片類藥物用量，充分給予靜脈輸液。";
    }

    return { score, riskPercent, strategy, badgeClass };
  }

  // Revised Cardiac Risk Index (RCRI / Lee's Criteria)
  static calculateRcri(criteria) {
    // 6 criteria:
    // 1. High-risk surgery (intraperitoneal, intrathoracic, suprainguinal vascular)
    // 2. History of ischemic heart disease (MI, angina, CABG/PCI)
    // 3. History of congestive heart failure
    // 4. History of cerebrovascular disease (TIA, stroke)
    // 5. Preoperative insulin therapy for diabetes
    // 6. Preoperative serum creatinine > 2.0 mg/dL (177 umol/L)
    const score = criteria.filter(Boolean).length;

    let cardiacEventRisk = "3.9% (Class I)";
    let badgeClass = "text-emerald-400 border-emerald-500/30 bg-emerald-950/30";
    let recommendation = "心血管併發症風險低，常規監測。";

    if (score === 1) {
      cardiacEventRisk = "6.0% (Class II)";
      badgeClass = "text-emerald-300 border-emerald-500/30 bg-emerald-950/30";
      recommendation = "輕度心血管風險，維持術中血壓平穩，避免心搏過速與低血壓。";
    } else if (score === 2) {
      cardiacEventRisk = "10.1% (Class III)";
      badgeClass = "text-amber-400 border-amber-500/40 bg-amber-950/30";
      recommendation = "⚠️ 中度心血管風險，術中建議建立動脈導管 (A-line) 即時血壓監測，備好升壓劑。";
    } else if (score >= 3) {
      cardiacEventRisk = "15.0% 以上 (Class IV)";
      badgeClass = "text-rose-400 border-rose-500/50 bg-rose-950/40";
      recommendation = "🚨 高度心血管風險！應詳細評估心臟功能（心電圖、心臟超音波 Echo），考慮進階血行動態監測 (A-line, FloTrac, TEE)，術後安排加護病房 (ICU) 照護。";
    }

    return { score, cardiacEventRisk, recommendation, badgeClass };
  }
}
