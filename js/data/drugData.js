/**
 * AnesPilot - Clinical Drug Data & Formulas
 * Standardized across international and Taiwan anesthesia practices.
 */

export const DRUG_DATABASE = {
  // Airway Calculations
  calculateAirway(ageYears, weightKg, isFemale = false) {
    let ettCuffed, ettUncuffed, ettDepth, lmaSize, bladeType, suctionFr;

    if (ageYears < 0.08) {
      // Premature / Neonate (< 1 month)
      if (weightKg < 1.0) {
        ettUncuffed = 2.5; ettCuffed = 2.5; ettDepth = 6.0; bladeType = "Miller 00"; suctionFr = "5 - 6 Fr"; lmaSize = "N/A (<2kg)";
      } else if (weightKg < 2.5) {
        ettUncuffed = 3.0; ettCuffed = 2.5; ettDepth = 7.0; bladeType = "Miller 0"; suctionFr = "6 Fr"; lmaSize = "N/A (<2kg)";
      } else {
        ettUncuffed = 3.5; ettCuffed = 3.0; ettDepth = 8.5 - 9.0; bladeType = "Miller 0 - 1"; suctionFr = "6 - 8 Fr"; lmaSize = "1 (<5kg)";
      }
    } else if (ageYears < 1.0) {
      // Infant (1 - 12 months)
      ettUncuffed = 3.5;
      ettCuffed = 3.0;
      ettDepth = Math.min(11, Math.round(((weightKg / 2) + 6) * 10) / 10);
      bladeType = "Miller 1";
      suctionFr = "8 Fr";
      lmaSize = weightKg < 5 ? "1 (<5kg)" : "1.5 (5-10kg)";
    } else if (ageYears < 2.0) {
      // 1 - 2 years
      ettUncuffed = 4.0;
      ettCuffed = 3.5;
      ettDepth = 11.5;
      bladeType = "Miller 1 - 1.5 / Mac 2";
      suctionFr = "8 - 10 Fr";
      lmaSize = "1.5 - 2 (10-20kg)";
    } else if (ageYears < 14.0) {
      // Pediatric 2 - 14 years
      // Motoyama & Khine formula:
      const cuffedCalc = (ageYears / 4) + 3.5;
      const uncuffedCalc = (ageYears / 4) + 4.0;
      ettCuffed = Math.round(cuffedCalc * 2) / 2;
      ettUncuffed = Math.round(uncuffedCalc * 2) / 2;
      ettDepth = Math.round(((ageYears / 2) + 12) * 10) / 10;
      
      if (ageYears < 4) {
        bladeType = "Mac 2 / Miller 1.5";
      } else if (ageYears < 9) {
        bladeType = "Mac 2 - 3";
      } else {
        bladeType = "Mac 3";
      }
      suctionFr = "10 - 12 Fr";
      
      if (weightKg < 10) lmaSize = "1.5";
      else if (weightKg < 20) lmaSize = "2";
      else if (weightKg < 30) lmaSize = "2.5";
      else if (weightKg < 50) lmaSize = "3";
      else lmaSize = "4";
    } else {
      // Adult (>= 14 years)
      if (isFemale) {
        ettCuffed = 7.0;
        ettUncuffed = 7.0;
        ettDepth = 20.5;
        bladeType = "Mac 3";
        lmaSize = weightKg < 50 ? "3" : (weightKg < 70 ? "4" : "5");
      } else {
        ettCuffed = 7.5;
        ettUncuffed = 7.5;
        ettDepth = 22.5;
        bladeType = "Mac 3 - 4";
        lmaSize = weightKg < 70 ? "4" : "5";
      }
      suctionFr = "12 - 14 Fr";
    }

    return {
      ettCuffed,
      ettUncuffed,
      ettDepth,
      lmaSize,
      bladeType,
      suctionFr
    };
  },

  // Calculate Ideal Body Weight (Devine Formula)
  calculateIBW(heightCm, isFemale) {
    if (!heightCm || heightCm < 60) return null;
    const heightInches = heightCm / 2.54;
    if (heightInches <= 60) {
      return isFemale ? 45.5 : 50.0;
    }
    const inchesOver5ft = heightInches - 60;
    const ibw = isFemale ? 45.5 + 2.3 * inchesOver5ft : 50.0 + 2.3 * inchesOver5ft;
    return Math.round(ibw * 10) / 10;
  },

  // Calculate Maintenance Fluids (4-2-1 Rule)
  calculateFluids(weightKg) {
    let hourlyRate = 0;
    if (weightKg <= 10) {
      hourlyRate = weightKg * 4;
    } else if (weightKg <= 20) {
      hourlyRate = 40 + (weightKg - 10) * 2;
    } else {
      hourlyRate = 60 + (weightKg - 20) * 1;
    }
    return {
      hourlyRate: Math.round(hourlyRate),
      npo8hr: Math.round(hourlyRate * 8),
      bolus20ml: Math.round(weightKg * 20)
    };
  },

  // Calculate Estimated Blood Volume (EBV) & MABL
  calculateBlood(weightKg, ageYears, isFemale, startHct = 36, targetHct = 24) {
    let ebvFactor = 70; // mL/kg
    if (ageYears < 0.08) {
      ebvFactor = 85; // Neonate
    } else if (ageYears < 1) {
      ebvFactor = 80; // Infant
    } else if (ageYears < 12) {
      ebvFactor = 75; // Child
    } else {
      ebvFactor = isFemale ? 65 : 70; // Adult
    }

    const ebv = Math.round(weightKg * ebvFactor);
    const avgHct = (startHct + targetHct) / 2;
    const mabl = Math.max(0, Math.round(ebv * ((startHct - targetHct) / avgHct)));

    return { ebv, mabl, ebvFactor };
  },

  // Detailed drug dosages
  getDosages(weightKg, ageYears, isFemale = false, ibw = null) {
    const w = weightKg;
    const activeIbw = (ibw && ibw > 0) ? ibw : w;
    const isPed = ageYears < 12;
    const isInfant = ageYears < 1;

    return {
      // 1. Induction & Muscle Relaxants
      induction: [
        {
          name: "Propofol (二異丙酚)",
          badge: "TBW",
          perKg: isPed ? "2.5 - 3.5 mg/kg" : "1.5 - 2.5 mg/kg",
          dose: isPed
            ? `${Math.round(w * 2.5)} - ${Math.round(w * 3.5)} mg`
            : `${Math.round(w * 1.5)} - ${Math.round(w * 2.5)} mg`,
          note: isPed ? "小兒分佈體積大，誘導劑量偏高" : "年長衰弱者建議降至 1.0 - 1.5 mg/kg"
        },
        {
          name: "Ketamine (氯胺酮)",
          badge: "TBW",
          perKg: "1.0 - 2.0 mg/kg IV (4-6 mg/kg IM)",
          dose: `${Math.round(w * 1.0)} - ${Math.round(w * 2.0)} mg IV`,
          note: "血行動態不穩、氣喘患者首選"
        },
        {
          name: "Etomidate (依托咪酯)",
          badge: "TBW",
          perKg: "0.2 - 0.3 mg/kg IV",
          dose: `${(w * 0.2).toFixed(1)} - ${(w * 0.3).toFixed(1)} mg`,
          note: "心血管極穩定，可能短暫抑制腎上腺"
        },
        {
          name: "Rocuronium (羅庫溴銨) - 常規誘導",
          badge: "IBW",
          perKg: "0.6 mg/kg",
          dose: `${(activeIbw * 0.6).toFixed(1)} mg`,
          note: "起效約 60-90 秒，依理想體重給藥"
        },
        {
          name: "Rocuronium (RSI 快速插管)",
          badge: "IBW",
          perKg: "1.0 - 1.2 mg/kg",
          dose: `${(activeIbw * 1.0).toFixed(1)} - ${(activeIbw * 1.2).toFixed(1)} mg`,
          note: "起效約 45-60 秒，若遇難插管需 Sugammadex 16mg/kg 救援"
        },
        {
          name: "Cisatracurium (順式阿曲庫銨)",
          badge: "IBW",
          perKg: "0.15 - 0.2 mg/kg",
          dose: `${(activeIbw * 0.15).toFixed(1)} - ${(activeIbw * 0.2).toFixed(1)} mg`,
          note: "Hofmann 消除，肝腎功能不全首選"
        },
        {
          name: "Succinylcholine (去極化肌鬆)",
          badge: "TBW",
          perKg: isInfant ? "2.0 - 3.0 mg/kg" : (isPed ? "1.5 - 2.0 mg/kg" : "1.0 - 1.5 mg/kg"),
          dose: isInfant ? `${(w * 2.5).toFixed(1)} mg` : `${(w * 1.2).toFixed(1)} mg`,
          note: "嬰兒需較高劑量；小兒建議先給 Atropine 預防心搏過緩"
        },
        {
          name: "Sugammadex (中度阻滯恢復 TOF ≥2)",
          badge: "TBW",
          perKg: "2.0 mg/kg",
          dose: `${Math.round(w * 2.0)} mg (${(w * 2.0 / 100).toFixed(1)} 瓶 100mg/mL)`,
          note: "依實際體重給予，約 2-3 分鐘完全恢復"
        },
        {
          name: "Sugammadex (深度阻滯恢復 PTC 1-2)",
          badge: "TBW",
          perKg: "4.0 mg/kg",
          dose: `${Math.round(w * 4.0)} mg (${(w * 4.0 / 100).toFixed(1)} 瓶 100mg/mL)`,
          note: "深度阻滯無 TOF 反應時使用"
        },
        {
          name: "Sugammadex (RSI 術後即刻緊急逆轉)",
          badge: "TBW",
          perKg: "16.0 mg/kg",
          dose: `${Math.round(w * 16.0)} mg`,
          note: "剛給予 Rocuronium 1.2mg/kg 後 CICO 緊急救援"
        }
      ],

      // 2. Analgesia & Sedation
      analgesia: [
        {
          name: "Fentanyl (芬太尼)",
          badge: "TBW",
          perKg: "1 - 2 mcg/kg",
          dose: `${Math.round(w * 1.0)} - ${Math.round(w * 2.0)} mcg`,
          note: "常用濃度 50 mcg/mL；插管前 2-3 分鐘給予"
        },
        {
          name: "Alfentanil (阿芬太尼)",
          badge: "TBW",
          perKg: "10 - 20 mcg/kg",
          dose: `${Math.round(w * 10)} - ${Math.round(w * 20)} mcg`,
          note: "超快速起效（1分鐘），短效操作適用"
        },
        {
          name: "Morphine (嗎啡)",
          badge: "TBW",
          perKg: "0.05 - 0.15 mg/kg",
          dose: `${(w * 0.05).toFixed(1)} - ${(w * 0.15).toFixed(1)} mg`,
          note: "起效約 15-20 分鐘，長效術後止痛"
        },
        {
          name: "Neostigmine 逆轉劑",
          badge: "TBW",
          perKg: "0.04 - 0.05 mg/kg (Max 5 mg)",
          dose: `${Math.min(5, Math.round(w * 0.045 * 10) / 10)} mg`,
          note: "需併用 Glycopyrrolate 或 Atropine 拮抗副交感反應"
        },
        {
          name: "Glycopyrrolate (胃長寧)",
          badge: "TBW",
          perKg: "0.01 mg/kg (搭配 Neostigmine 每 1mg 配 0.2mg)",
          dose: `${(w * 0.01).toFixed(2)} mg`,
          note: "不通過 BBB，不引起中樞抗膽鹼症候群"
        },
        {
          name: "Naloxone (納洛酮 - 類鴉片逆轉)",
          badge: "TBW",
          perKg: "1 - 4 mcg/kg (成人間隔 40-100 mcg 滴定)",
          dose: `${Math.round(w * 2)} mcg`,
          note: "慢速滴定至呼吸改善，防急性戒斷及嚴重劇痛"
        },
        {
          name: "Flumazenil (安易醒 - BZD 逆轉)",
          badge: "TBW",
          perKg: "0.01 mg/kg (成人初始 0.2 mg IV)",
          dose: isPed ? `${(w * 0.01).toFixed(2)} mg` : "0.2 mg (每 60 秒可加 0.1 mg，至多 1 mg)",
          note: "半衰期約 1 小時，需注意 BZD 再鎮靜 (resedation)"
        }
      ],

      // 3. Emergency & Resuscitation
      emergency: [
        {
          name: "Epinephrine (急救心跳驟停 Cardiac Arrest)",
          badge: "急救紅標",
          perKg: isPed ? "10 mcg/kg IV (0.01 mg/kg)" : "1 mg IV q3-5min",
          dose: isPed
            ? `${Math.round(w * 10)} mcg (1:10,000 稀釋液 ${(w * 0.1).toFixed(1)} mL)`
            : "1 mg (1 支 1:1,000 原液或 10 mL 1:10,000)",
          note: "每 3 - 5 分鐘一次，推藥後沖 10-20 mL 生理食鹽水"
        },
        {
          name: "Epinephrine (術中休克/嚴重過敏 Bolus 滴定)",
          badge: "滴定劑量",
          perKg: "0.5 - 1 mcg/kg IV",
          dose: isPed ? `${(w * 0.5).toFixed(1)} - ${(w * 1.0).toFixed(1)} mcg` : "10 - 50 mcg IV 滴定",
          note: "建議備好 10 mcg/mL (Epi stick: 1mg 抽入 100mL 或 0.1mg 入 10mL)"
        },
        {
          name: "Atropine (阿托品 - 緩脈急救)",
          badge: "急救",
          perKg: "0.02 mg/kg (小兒最低劑量 0.1 mg，單次上限 0.5 mg)",
          dose: isPed
            ? `${Math.max(0.1, Math.min(0.5, Math.round(w * 0.02 * 100) / 100)).toFixed(2)} mg`
            : "0.5 - 1.0 mg IV (成人上限 3 mg)",
          note: "劑量過低 (<0.1mg) 反而可能引發中樞性心動過緩"
        },
        {
          name: "去顫電擊 (Defibrillation - VF/pVT)",
          badge: "電擊",
          perKg: isPed ? "首劑 2 J/kg，後續 4 J/kg (Max 10 J/kg 或成人量)" : "120 - 200 J 雙相波 (Biphasic)",
          dose: isPed ? `首劑 ${Math.round(w * 2)} J → 後續 ${Math.round(w * 4)} J` : "200 J (Biphasic)",
          note: "電擊後立即恢復 CPR 2 分鐘，不可中斷"
        },
        {
          name: "同步心臟電擊 (Synchronized Cardioversion)",
          badge: "心律不整",
          perKg: isPed ? "0.5 - 1.0 J/kg，後續 2.0 J/kg" : "50 - 100 J (狹心室波 / 房撲) 或 120-200J",
          dose: isPed ? `${Math.round(w * 0.5)} - ${Math.round(w * 1.0)} J` : "100 J",
          note: "必須確認儀器已開啟 Sync 旗標並對準 R 波"
        },
        {
          name: "10% Calcium Gluconate (葡萄糖酸鈣)",
          badge: "高血鉀/低血鈣",
          perKg: "0.5 mL/kg (50 mg/kg) 慢推 5-10 分鐘",
          dose: `${(w * 0.5).toFixed(1)} mL (約 ${(w * 50).toFixed(0)} mg)`,
          note: "保護心肌細胞膜，惡性高熱或大量輸血低鈣血症必備"
        },
        {
          name: "8.4% Sodium Bicarbonate (碳酸氫鈉)",
          badge: "代謝性酸中毒",
          perKg: "1 mEq/kg (1 mL/kg)",
          dose: `${Math.round(w * 1.0)} mL (mEq)`,
          note: "嚴重心跳驟停長時急救或高血鉀酸中毒"
        },
        {
          name: "10% Dextrose (小兒低血糖救援)",
          badge: "小兒血糖",
          perKg: "2.0 - 5.0 mL/kg IV Bolus",
          dose: `${Math.round(w * 2.0)} - ${Math.round(w * 5.0)} mL (D10W)`,
          note: "等於 0.2 - 0.5 g/kg 葡萄糖；避免使用高濃度 D50W 刺激血管"
        }
      ]
    };
  }
};
