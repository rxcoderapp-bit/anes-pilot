/**
 * AnesPilot - Clinical Drug Data & Formulas
 * Standardized across international and Taiwan anesthesia practices.
 * 
 * References & Evidentiary Base:
 * 1. Morgan & Mikhail's Clinical Anesthesiology, 7th Edition (McGraw-Hill AccessAnesthesiology)
 * 2. Goodman & Gilman’s The Pharmacological Basis of Therapeutics, 14th Edition (McGraw-Hill)
 * 3. NYSORA Textbook of Regional Anesthesia and Acute Pain Management
 * 4. ASA / DAS 2015/2025 Difficult Airway Guidelines
 * 5. ASRA Coagulation Guidelines & LAST Checklist
 */

export const DRUG_DATABASE = {
  // AccessAnesthesiology Reference Badges
  references: {
    mm: "Morgan & Mikhail's Clinical Anesthesiology (7th Ed.)",
    gg: "Goodman & Gilman's Pharmacological Basis of Therapeutics (14th Ed.)",
    nysora: "NYSORA Textbook of Regional Anesthesia & Acute Pain Management",
    asra: "ASRA Pain Medicine Coagulation & LAST Advisory"
  },

  // Airway Calculations (Morgan & Mikhail's Ch. 19 & Motoyama/Khine Pediatric Airway Formulas)
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
      // Motoyama & Khine formulas:
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
      suctionFr,
      reference: "Morgan & Mikhail's Clinical Anesthesiology (7e, Ch. 19 Airway Management)"
    };
  },

  // Calculate Ideal Body Weight (Pediatric: Traub & Kichen 1983 / Adult >=5ft: Devine / Adult <5ft: Devine deduction)
  calculateIBW(heightCm, isFemale, ageYears = null) {
    if (!heightCm || heightCm < 40) return null;
    const heightInches = heightCm / 2.54;
    const isChild = ageYears !== null ? ageYears < 18 : heightInches < 55;

    // Pediatric (< 18 years): Traub & Kichen (1983) validated pediatric formula
    // Matches CDC/WHO 50th percentile weight-for-height: IBW = 2.396 * e^(0.01863 * heightCm)
    if (isChild) {
      const ibwPed = 2.396 * Math.exp(0.01863 * heightCm);
      return Math.round(ibwPed * 10) / 10;
    }

    // Short stature adult (< 5ft / 152.4 cm): Devine linear back-projection (2.3 kg per inch below 60")
    if (heightInches < 60) {
      const inchesUnder5ft = 60 - heightInches;
      const base = isFemale ? 45.5 : 50.0;
      const ibwShort = base - (2.3 * inchesUnder5ft);
      return Math.round(Math.max(25, ibwShort) * 10) / 10;
    }

    // Adult (>= 5ft): Standard Devine Formula (Morgan & Mikhail's Appendix / ARDSNet)
    const inchesOver5ft = heightInches - 60;
    const ibw = isFemale ? 45.5 + 2.3 * inchesOver5ft : 50.0 + 2.3 * inchesOver5ft;
    return Math.round(ibw * 10) / 10;
  },

  // Calculate Maintenance Fluids (4-2-1 Rule / Holliday-Segar Method)
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
      bolus20ml: Math.round(weightKg * 20),
      reference: "Morgan & Mikhail's Ch. 49 (Fluid Management & Transfusion)"
    };
  },

  // Calculate Estimated Blood Volume (EBV) & MABL (Furman Formula)
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

    return { ebv, mabl, ebvFactor, reference: "Morgan & Mikhail's Ch. 49 & Goodman & Gilman Ch. 37" };
  },

  // Detailed drug dosages with AccessAnesthesiology Citations
  getDosages(weightKg, ageYears, isFemale = false, ibw = null) {
    const w = weightKg;
    const activeIbw = (ibw && ibw > 0) ? ibw : w;
    const isPed = ageYears < 12;
    const isInfant = ageYears < 1;

    return {
      // 1. Induction & Muscle Relaxants
      induction: [
        {
          id: "propofol",
          name: "Propofol (二異丙酚 / 靜脈誘導)",
          badge: "TBW",
          perKg: isPed ? "2.5 - 3.5 mg/kg" : "1.5 - 2.5 mg/kg",
          dose: isPed
            ? `${Math.round(w * 2.5)} - ${Math.round(w * 3.5)} mg`
            : `${Math.round(w * 1.5)} - ${Math.round(w * 2.5)} mg`,
          note: isPed ? "小兒分佈體積大且代謝快，劑量偏高" : "年長衰弱或心血管高危者降至 1.0 - 1.5 mg/kg",
          source: "Morgan & Mikhail's 7e Ch. 8 / Goodman & Gilman 14e Ch. 21",
          mechanism: "增強 GABA_A 受體抑制性氯離子通道開放，輕度阻斷 NMDA 受體",
          pearls: "引發全身血管阻力 (SVR) 下降致低血壓；具止吐效果；無止痛作用；長時輸注需警惕 PRIS (二異丙酚輸注症候群)"
        },
        {
          id: "ketamine",
          name: "Ketamine (氯胺酮 / 解離性麻醉)",
          badge: "TBW",
          perKg: "1.0 - 2.0 mg/kg IV (4-6 mg/kg IM)",
          dose: `${Math.round(w * 1.0)} - ${Math.round(w * 2.0)} mg IV`,
          note: "血行動態不穩、氣喘及血容積不足患者首選",
          source: "Morgan & Mikhail's 7e Ch. 8 / Goodman & Gilman 14e Ch. 21",
          mechanism: "非競爭性 NMDA 受體拮抗劑，抑制脊髓丘腦側束痛覺傳導",
          pearls: "中樞興奮刺激交感神經，維持血壓心率並擴張支氣管；保留自體呼吸反應；可預防性給予 Midazolam 減輕術後譫妄惡夢"
        },
        {
          id: "etomidate",
          name: "Etomidate (依托咪酯 / 心血管穩定)",
          badge: "TBW",
          perKg: "0.2 - 0.3 mg/kg IV",
          dose: `${(w * 0.2).toFixed(1)} - ${(w * 0.3).toFixed(1)} mg`,
          note: "極佳心血管穩定度，對心輸出量及 MAP 影響極微",
          source: "Morgan & Mikhail's 7e Ch. 8 / Goodman & Gilman 14e Ch. 21",
          mechanism: "選擇性 GABA_A 受體促效劑",
          pearls: "可抑制 11-beta-hydroxylase，短暫抑制腎上腺皮質醇生成達 4-8 小時；常引起肌陣攣 (Myoclonus)"
        },
        {
          id: "rocuronium_std",
          name: "Rocuronium (羅庫溴銨) - 常規氣管插管",
          badge: "IBW",
          perKg: "0.6 mg/kg",
          dose: `${(activeIbw * 0.6).toFixed(1)} mg`,
          note: "起效約 60-90 秒，依理想體重 (IBW) 給藥以防作用延長",
          source: "Morgan & Mikhail's 7e Ch. 11 / Goodman & Gilman 14e Ch. 12",
          mechanism: "競爭性拮抗運動終板菸鹼型乙醯膽鹼受體 (nAChR)",
          pearls: "中效類固醇型非去極化肌鬆劑，無組織胺釋放；主要經膽汁及肝臟消除 (70%)"
        },
        {
          id: "rocuronium_rsi",
          name: "Rocuronium (RSI 快速循序誘導插管)",
          badge: "IBW",
          perKg: "1.0 - 1.2 mg/kg",
          dose: `${(activeIbw * 1.0).toFixed(1)} - ${(activeIbw * 1.2).toFixed(1)} mg`,
          note: "45-60 秒起效（速度媲美 Suxamethonium）；遇 CICO 可用 Sugammadex 16mg/kg 立即救援",
          source: "Morgan & Mikhail's 7e Ch. 11 & DAS Guidelines 2025",
          mechanism: "大劑量快速飽和受體",
          pearls: "臨床作用持續時間延長至 60-90 分鐘，必須備妥 Sugammadex 作為急救逆轉劑"
        },
        {
          id: "cisatracurium",
          name: "Cisatracurium (順式阿曲庫銨)",
          badge: "IBW",
          perKg: "0.15 - 0.2 mg/kg",
          dose: `${(activeIbw * 0.15).toFixed(1)} - ${(activeIbw * 0.2).toFixed(1)} mg`,
          note: "Hofmann 生理消除，肝腎功能衰竭及重大器官衰竭首選",
          source: "Morgan & Mikhail's 7e Ch. 11 / Goodman & Gilman 14e Ch. 12",
          mechanism: "苄基異喹啉類非去極化肌鬆劑",
          pearls: "體溫及 pH 介導的 Hofmann 降解與非特異性酯酶水解，不倚賴肝腎代謝；無顯著心血管自主神經阻斷作用"
        },
        {
          id: "succinylcholine",
          name: "Succinylcholine (去極化肌鬆劑 / Suxamethonium)",
          badge: "TBW",
          perKg: isInfant ? "2.0 - 3.0 mg/kg" : (isPed ? "1.5 - 2.0 mg/kg" : "1.0 - 1.5 mg/kg"),
          dose: isInfant ? `${(w * 2.5).toFixed(1)} mg` : `${(w * 1.2).toFixed(1)} mg`,
          note: "極快速起效 (30-60秒) 及短效 (5-10分)；嬰兒細胞外液大需較高劑量",
          source: "Morgan & Mikhail's 7e Ch. 11 / Goodman & Gilman 14e Ch. 12",
          mechanism: "持續刺激乙醯膽鹼受體導致肌纖維去極化失敏 (Phase I block)",
          pearls: "禁忌：高血鉀、大面積燒傷/創傷 (>24-48小時)、惡性高熱 (MH) 病史、脫神經肌肉病變、假性膽鹼酯酶缺乏"
        },
        {
          id: "sugammadex_mod",
          name: "Sugammadex (中度阻滯逆轉 - TOF ≥ 2)",
          badge: "TBW",
          perKg: "2.0 mg/kg",
          dose: `${Math.round(w * 2.0)} mg (${(w * 2.0 / 100).toFixed(1)} 瓶 100mg/mL)`,
          note: "依實際體重 (TBW) 給予，約 2-3 分鐘完全恢復 TOF ratio > 0.9",
          source: "Morgan & Mikhail's 7e Ch. 11 / Goodman & Gilman 14e Ch. 12",
          mechanism: "修飾型 gamma-環糊精，於血漿中與 Rocuronium 形成超高親和力 1:1 螯合複合物",
          pearls: "不具抗膽鹼酶副作用（不需加 Atropine）；可能螯合口服避孕藥，需叮嚀女性患者 7 天內採取額外避孕措施"
        },
        {
          id: "sugammadex_deep",
          name: "Sugammadex (深度阻滯逆轉 - PTC 1-2)",
          badge: "TBW",
          perKg: "4.0 mg/kg",
          dose: `${Math.round(w * 4.0)} mg (${(w * 4.0 / 100).toFixed(1)} 瓶 100mg/mL)`,
          note: "深度神經肌肉阻滯無 TOF 反應、僅有 Post-tetanic count 1-2 時使用",
          source: "Morgan & Mikhail's 7e Ch. 11",
          mechanism: "強效快速抓取組織及受體解離之肌鬆分子",
          pearls: "經腎臟原型排泄，嚴重腎功能不全 (CrCl < 30) 建議避免常規使用"
        },
        {
          id: "sugammadex_rsi_rescue",
          name: "Sugammadex (RSI 即刻緊急逆轉救命劑量)",
          badge: "TBW",
          perKg: "16.0 mg/kg",
          dose: `${Math.round(w * 16.0)} mg`,
          note: "剛給予 Rocuronium 1.2 mg/kg 發生 CICO (無法插管無法通氣) 時立即給藥",
          source: "Morgan & Mikhail's 7e Ch. 11 & DAS CICO Protocol",
          mechanism: "超飽和血漿濃度即刻拉取終板受體上之 Rocuronium",
          pearls: "約 3 分鐘內恢復自體自主呼吸，為開刀房 CICO 急救黃金用藥"
        }
      ],

      // 2. Analgesia & Sedation
      analgesia: [
        {
          id: "fentanyl",
          name: "Fentanyl (芬太尼 / 強效短效鴉片類)",
          badge: "TBW",
          perKg: "1 - 2 mcg/kg (插管前誘導) / 2-5 mcg/kg (重大手術)",
          dose: `${Math.round(w * 1.0)} - ${Math.round(w * 2.0)} mcg`,
          note: "常用規格 50 mcg/mL；高脂溶性，起效約 2-3 分鐘，單劑作用約 30-45 分鐘",
          source: "Morgan & Mikhail's 7e Ch. 9 / Goodman & Gilman 14e Ch. 23",
          mechanism: "純 mu-opioid 受體促效劑，效價約為 Morphine 的 100 倍",
          pearls: "無組織胺釋放；快速大劑量注射可能引發胸壁僵直 (Wooden chest syndrome)"
        },
        {
          id: "alfentanil",
          name: "Alfentanil (阿芬太尼)",
          badge: "TBW",
          perKg: "10 - 20 mcg/kg",
          dose: `${Math.round(w * 10)} - ${Math.round(w * 20)} mcg`,
          note: "超快速起效 (1-1.5分鐘)，短效操作 (如喉鏡檢、短程骨科復位) 首選",
          source: "Morgan & Mikhail's 7e Ch. 9 / Goodman & Gilman 14e Ch. 23",
          mechanism: "低 pKa (6.5) 使高達 90% 呈非游離態，極迅速穿透 BBB",
          pearls: "排泄半衰期短，但重複給藥可能在脂肪組織累積"
        },
        {
          id: "morphine",
          name: "Morphine (嗎啡 / 長效止痛)",
          badge: "TBW",
          perKg: "0.05 - 0.15 mg/kg",
          dose: `${(w * 0.05).toFixed(1)} - ${(w * 0.15).toFixed(1)} mg`,
          note: "起效約 15-20 分鐘，高峰在 45-60 分鐘，維持 4-5 小時",
          source: "Morgan & Mikhail's 7e Ch. 9 / Goodman & Gilman 14e Ch. 23",
          mechanism: "中樞神經系統 mu-opioid 受體促效劑",
          pearls: "代謝物 Morphine-6-glucuronide 具高活性；腎功能不全者易累積導致呼吸抑制；可能促進組織胺釋放致低血壓"
        },
        {
          id: "neostigmine",
          name: "Neostigmine (膽鹼酯酶抑制劑 / 傳統肌鬆逆轉)",
          badge: "TBW",
          perKg: "0.04 - 0.05 mg/kg (Max 5 mg)",
          dose: `${Math.min(5, Math.round(w * 0.045 * 10) / 10)} mg`,
          note: "需併用抗膽鹼藥物 (Glycopyrrolate 或 Atropine) 預防嚴重心搏過緩",
          source: "Morgan & Mikhail's 7e Ch. 11 / Goodman & Gilman 14e Ch. 11",
          mechanism: "可逆性抑制乙醯膽鹼水解酶 (AChE)，增加突觸間隙乙醯膽鹼濃度",
          pearls: "給藥前確認 TOF 至少出現 2-4 次跳動；完全阻滯時不可單用 Neostigmine"
        },
        {
          id: "glycopyrrolate",
          name: "Glycopyrrolate (胃長寧 / 季銨鹽抗膽鹼藥)",
          badge: "TBW",
          perKg: "0.01 mg/kg (配搭 Neostigmine 每 1mg 配 0.2mg)",
          dose: `${(w * 0.01).toFixed(2)} mg`,
          note: "不通過血腦屏障 (BBB)，不引起中樞抗膽鹼症候群 (譫妄、鎮靜)",
          source: "Morgan & Mikhail's 7e Ch. 11 / Goodman & Gilman 14e Ch. 11",
          mechanism: "周邊毒蕈鹼型乙醯膽鹼受體 (M2/M3) 競爭性阻斷劑",
          pearls: "抗唾液分泌效果強於 Atropine，心搏過速副作用相對溫和"
        },
        {
          id: "naloxone",
          name: "Naloxone (納洛酮 / 鴉片類受體拮抗劑)",
          badge: "TBW",
          perKg: "1 - 4 mcg/kg (成人間隔 40-100 mcg 慢速滴定)",
          dose: `${Math.round(w * 2)} mcg`,
          note: "慢速滴定至呼吸改善，防止急性劇烈疼痛、肺水腫及心血管暴衝",
          source: "Morgan & Mikhail's 7e Ch. 9 / Goodman & Gilman 14e Ch. 23",
          mechanism: "純鴉片類受體競爭性拮抗劑 (mu, kappa, delta)",
          pearls: "作用持續時間僅約 30-45 分鐘，短於多數鴉片類藥物，需嚴密監控再鎮靜與呼吸抑制復發"
        },
        {
          id: "flumazenil",
          name: "Flumazenil (安易醒 / BZD 拮抗劑)",
          badge: "TBW",
          perKg: "0.01 mg/kg (成人初始 0.2 mg IV 於 15 秒推注)",
          dose: isPed ? `${(w * 0.01).toFixed(2)} mg` : "0.2 mg (每 60 秒可加 0.1 mg，至多 1 mg)",
          note: "半衰期約 1 小時，易有再鎮靜 (resedation) 現象",
          source: "Morgan & Mikhail's 7e Ch. 8 / Goodman & Gilman 14e Ch. 21",
          mechanism: "選擇性阻斷 GABA_A 受體複合物上的苯二氮平結合位點",
          pearls: "長期使用 BZD 或三環抗憂鬱劑過量者禁用，恐誘發頑固性癲癇"
        }
      ],

      // 3. Emergency & Resuscitation (AHA ACLS & M&M Guidelines)
      emergency: [
        {
          id: "epinephrine_arrest",
          name: "Epinephrine (急救心跳驟停 Cardiac Arrest)",
          badge: "急救紅標",
          perKg: isPed ? "10 mcg/kg IV (0.01 mg/kg)" : "1 mg IV q3-5min",
          dose: isPed
            ? `${Math.round(w * 10)} mcg (1:10,000 稀釋液 ${(w * 0.1).toFixed(1)} mL)`
            : "1 mg (1 支 1:1,000 原液或 10 mL 1:10,000)",
          note: "每 3 - 5 分鐘一次，推藥後沖 10-20 mL 生理食鹽水加強回流",
          source: "AHA 2025 ACLS Guidelines / Morgan & Mikhail's Ch. 55",
          mechanism: "強效 alpha-1 (周邊血管收縮提升冠狀動脈灌注壓 CPP) 及 beta-1 (正性肌力與心率)",
          pearls: "不可電擊心律 (PEA/Asystole) 應儘早給予；可電擊心律 (VF/pVT) 於第 2 次電擊後給予"
        },
        {
          id: "epinephrine_bolus",
          name: "Epinephrine (術中休克/嚴重過敏 Bolus 滴定)",
          badge: "滴定劑量",
          perKg: "0.5 - 1 mcg/kg IV",
          dose: isPed ? `${(w * 0.5).toFixed(1)} - ${(w * 1.0).toFixed(1)} mcg` : "10 - 50 mcg IV 滴定",
          note: "常用濃度 10 mcg/mL (Epi Stick：1mg 稀釋至 100mL 或 0.1mg 稀釋至 10mL)",
          source: "Morgan & Mikhail's 7e Ch. 14 / Goodman & Gilman 14e Ch. 13",
          mechanism: "低劑量主要活化 beta-2 (支氣管擴張) 與 beta-1 (心肌收縮)",
          pearls: "過敏性休克 (Anaphylaxis) 一線救命藥物；術中嚴重頑固性低血壓快速回升"
        },
        {
          id: "atropine",
          name: "Atropine (阿托品 - 緩脈急救)",
          badge: "急救",
          perKg: "0.02 mg/kg (小兒最低劑量 0.1 mg，單次上限 0.5 mg)",
          dose: isPed
            ? `${Math.max(0.1, Math.min(0.5, Math.round(w * 0.02 * 100) / 100)).toFixed(2)} mg`
            : "0.5 - 1.0 mg IV (成人上限 3 mg)",
          note: "劑量過低 (<0.1mg) 反而可能引發中樞副交感興奮致矛盾性心動過緩",
          source: "Morgan & Mikhail's 7e Ch. 12 / Goodman & Gilman 14e Ch. 11",
          mechanism: "競合性拮抗竇房結與房室結 M2 毒蕈鹼型乙醯膽鹼受體",
          pearls: "迷走神經張力過高 (如牽拉腹膜、眼心反射、喉鏡刺激) 引發緩脈首選"
        },
        {
          id: "defib",
          name: "去顫電擊 (Defibrillation - VF/pVT 心室震顫)",
          badge: "電擊",
          perKg: isPed ? "首劑 2 J/kg，後續 4 J/kg (至多 10 J/kg 或成人量)" : "120 - 200 J 雙相波 (Biphasic)",
          dose: isPed ? `首劑 ${Math.round(w * 2)} J → 後續 ${Math.round(w * 4)} J` : "200 J (Biphasic)",
          note: "電擊後立即恢復 CPR 壓胸 2 分鐘，切勿停頓檢查脈搏",
          source: "AHA ACLS 2025 / Morgan & Mikhail's Ch. 55",
          mechanism: "瞬間同步使全部心肌細胞去極化，阻斷微折返迴路",
          pearls: "確保開刀房易燃氣體 (高濃度氧氣/揮發氣體) 移開電極板周圍防起火"
        },
        {
          id: "calcium",
          name: "10% Calcium Gluconate (葡萄糖酸鈣)",
          badge: "高血鉀/低血鈣",
          perKg: "0.5 mL/kg (50 mg/kg) 慢推 5-10 分鐘",
          dose: `${(w * 0.5).toFixed(1)} mL (約 ${(w * 50).toFixed(0)} mg)`,
          note: "穩定心肌細胞膜電位，惡性高熱 (MH)、大量輸血檸檬酸中毒及高血鉀必備",
          source: "Goodman & Gilman 14e Ch. 48 / Morgan & Mikhail's Ch. 49",
          mechanism: "拮抗高血鉀引起的心肌膜電位去極化，恢復正常閾電位差",
          pearls: "比 Calcium Chloride 對周邊血管刺激性低很多；推藥過快可能引發嚴重心動過緩"
        },
        {
          id: "bicarb",
          name: "8.4% Sodium Bicarbonate (重碳酸鈉)",
          badge: "代謝性酸中毒",
          perKg: "1 mEq/kg (1 mL/kg)",
          dose: `${Math.round(w * 1.0)} mL (mEq)`,
          note: "嚴重心跳驟停長時急救、高血鉀酸中毒或三環抗憂鬱劑過量",
          source: "Morgan & Mikhail's Ch. 55 / Goodman & Gilman Ch. 37",
          mechanism: "解離出碳酸氫根離子結合 H+ 生成 CO2 與水",
          pearls: "給藥時需確認通氣良好以排除生成之 CO2；嚴禁與 Calcium 製劑自同一路徑同時推注防沈澱"
        },
        {
          id: "dextrose",
          name: "10% Dextrose (小兒低血糖救援)",
          badge: "小兒血糖",
          perKg: "2.0 - 5.0 mL/kg IV Bolus",
          dose: `${Math.round(w * 2.0)} - ${Math.round(w * 5.0)} mL (D10W)`,
          note: "等於 0.2 - 0.5 g/kg 葡萄糖；小兒避免使用高濃度 D50W 刺激血管及高滲透損傷",
          source: "Morgan & Mikhail's Ch. 44 (Pediatric Anesthesia)",
          mechanism: "快速恢復中樞神經系統葡萄糖供應",
          pearls: "推藥後每 15-30 分鐘複查血糖，維持血糖在 80-150 mg/dL"
        }
      ]
    };
  }
};
