/**
 * AnesPilot - ASRA Guidelines Coagulation Database
 * Based on ASRA Coagulation Guidelines (4th/5th Editions)
 * for Neuraxial (Spinal/Epidural) and Deep Regional Nerve Blocks.
 */

export const ASRA_DATABASE = [
  // DOACs
  {
    id: "apixaban",
    name: "Apixaban (Eliquis 艾必克凝)",
    category: "DOAC (Factor Xa 抑制劑)",
    standardWaitHours: 72,
    renalWarningWaitHours: 96,
    crClThreshold: 30,
    catheterRemovalWaitHours: 30,
    restartAfterRemovalHours: 6,
    recommendation: "常規建議停藥 72 小時（低風險至少 48 小時；若 CrCl < 30 mL/min 需延長至 96 小時）。",
    notes: "置入或拔除硬脊膜外導管後，至少隔 6 小時方可重新給藥。"
  },
  {
    id: "rivaroxaban",
    name: "Rivaroxaban (Xarelto 拜瑞妥)",
    category: "DOAC (Factor Xa 抑制劑)",
    standardWaitHours: 72,
    renalWarningWaitHours: 96,
    crClThreshold: 30,
    catheterRemovalWaitHours: 26,
    restartAfterRemovalHours: 6,
    recommendation: "常規建議停藥 72 小時（最低安全極限 48 小時）。",
    notes: "拔管需距上次給藥至少 26 小時，拔管後隔 6 小時可重新服藥。"
  },
  {
    id: "dabigatran",
    name: "Dabigatran (Pradaxa 普達妥)",
    category: "DOAC (直接凝血酶抑制劑)",
    standardWaitHours: 72,
    renalWarningWaitHours: 120, // 5 days if renal impaired
    crClThreshold: 50,
    catheterRemovalWaitHours: 36,
    restartAfterRemovalHours: 6,
    recommendation: "CrCl ≥ 80: 72小時 (3天)；CrCl 50-79: 96小時 (4天)；CrCl 30-49: 120小時 (5天)。",
    notes: "主要經腎臟排泄(80%)，腎功能不全半衰期顯著延長。"
  },
  {
    id: "edoxaban",
    name: "Edoxaban (Lixiana 里心得)",
    category: "DOAC (Factor Xa 抑制劑)",
    standardWaitHours: 72,
    renalWarningWaitHours: 96,
    crClThreshold: 30,
    catheterRemovalWaitHours: 28,
    restartAfterRemovalHours: 6,
    recommendation: "常規建議停藥 72 小時（3天）。",
    notes: "拔管後至少間隔 6 小時才可重新給藥。"
  },

  // Antiplatelets
  {
    id: "clopidogrel",
    name: "Clopidogrel (Plavix 保栓通)",
    category: "抗血小板 (P2Y12 抑制劑)",
    standardWaitHours: 120, // 5 days
    renalWarningWaitHours: 120,
    crClThreshold: null,
    catheterRemovalWaitHours: 120,
    restartAfterRemovalHours: 0,
    recommendation: "建議停藥 5 - 7 天（最低 5 天 / 120 小時）。",
    notes: "若置放硬脊膜外導管期間不可重新給予 Loading dose。拔管後可直接重啟常規維持劑量。"
  },
  {
    id: "ticagrelor",
    name: "Ticagrelor (Brilinta 百無寧)",
    category: "抗血小板 (可逆性 P2Y12 抑制劑)",
    standardWaitHours: 72, // 3 - 5 days (72 - 120 hrs)
    renalWarningWaitHours: 72,
    crClThreshold: null,
    catheterRemovalWaitHours: 72,
    restartAfterRemovalHours: 6,
    recommendation: "建議停藥 3 - 5 天（最低 72 小時，ASRA 最新指引建議 3-5 天）。",
    notes: "拔管後 6 小時可重啟。"
  },
  {
    id: "prasugrel",
    name: "Prasugrel (Effient 抑凝安)",
    category: "抗血小板 (強效 P2Y12 抑制劑)",
    standardWaitHours: 168, // 7 days
    renalWarningWaitHours: 168,
    crClThreshold: null,
    catheterRemovalWaitHours: 168,
    restartAfterRemovalHours: 6,
    recommendation: "強烈建議停藥 7 - 10 天（至少 168 小時）。",
    notes: "不可逆血小板抑制作用最強，必須嚴格遵守停藥時間。"
  },
  {
    id: "aspirin",
    name: "Aspirin (阿斯匹靈)",
    category: "抗血小板 (COX-1 抑制劑)",
    standardWaitHours: 0, // Alone is safe
    renalWarningWaitHours: 0,
    crClThreshold: null,
    catheterRemovalWaitHours: 0,
    restartAfterRemovalHours: 0,
    recommendation: "單一低劑量 Aspirin (75-100 mg) 並非神經軸阻滯的絕對禁忌，可正常施打。",
    notes: "注意：若合併 NSAIDs、其他抗血小板或抗凝血劑時，脊椎血腫風險加乘！"
  },
  {
    id: "cilostazol",
    name: "Cilostazol (Pletal 培達)",
    category: "抗血小板 (PDE3 抑制劑)",
    standardWaitHours: 42,
    renalWarningWaitHours: 42,
    crClThreshold: null,
    catheterRemovalWaitHours: 42,
    restartAfterRemovalHours: 6,
    recommendation: "建議停藥 42 小時。",
    notes: "拔管後 6 小時可恢復用藥。"
  },

  // Heparins
  {
    id: "lmwh_prophylactic",
    name: "LMWH 預防劑量 (如 Clexane 40mg QD)",
    category: "低分子量肝素 (預防劑量)",
    standardWaitHours: 12,
    renalWarningWaitHours: 24,
    crClThreshold: 30,
    catheterRemovalWaitHours: 12,
    restartAfterRemovalHours: 4,
    recommendation: "最後一劑需間隔至少 12 小時方可穿刺施打。",
    notes: "穿刺或拔管後至少間隔 4 小時方可施打下一劑 LMWH。"
  },
  {
    id: "lmwh_therapeutic",
    name: "LMWH 治療劑量 (如 Clexane 1mg/kg Q12H / 1.5mg/kg QD)",
    category: "低分子量肝素 (治療/全劑量)",
    standardWaitHours: 24,
    renalWarningWaitHours: 36,
    crClThreshold: 30,
    catheterRemovalWaitHours: 24,
    restartAfterRemovalHours: 4,
    recommendation: "最後一劑需間隔至少 24 小時方可穿刺施打。",
    notes: "硬脊膜外導管留置期間嚴禁給予治療劑量 LMWH！拔管後 4 小時方可重啟。"
  },
  {
    id: "ufh_iv",
    name: "UFH 靜脈持續點滴 (治療性 Heparin IV Infusion)",
    category: "傳統未分餾肝素 (靜脈治療量)",
    standardWaitHours: 6,
    renalWarningWaitHours: 6,
    crClThreshold: null,
    catheterRemovalWaitHours: 6,
    restartAfterRemovalHours: 1,
    recommendation: "停藥至少 4 - 6 小時，且必須檢驗 aPTT 確認恢復正常範圍後方可穿刺。",
    notes: "穿刺後若需重啟肝素點滴，建議至少等待 1 小時。"
  },
  {
    id: "ufh_sc",
    name: "UFH 皮下預防劑量 (5000 IU SC BID/TID)",
    category: "傳統未分餾肝素 (皮下預防量)",
    standardWaitHours: 6,
    renalWarningWaitHours: 6,
    crClThreshold: null,
    catheterRemovalWaitHours: 6,
    restartAfterRemovalHours: 1,
    recommendation: "建議停藥 4 - 6 小時後再進行神經軸阻滯穿刺。",
    notes: "每日總劑量 > 10,000 IU 時建議先抽檢 aPTT。"
  },

  // Warfarin
  {
    id: "warfarin",
    name: "Warfarin (Coumadin 可邁丁)",
    category: "維生素 K 拮抗劑 (VKA)",
    standardWaitHours: 120, // 5 days
    renalWarningWaitHours: 120,
    crClThreshold: null,
    catheterRemovalWaitHours: 120,
    restartAfterRemovalHours: 0,
    recommendation: "建議停藥 5 天，且術前抽血檢驗確認 INR ≤ 1.4 方可施打神經軸阻滯。",
    notes: "若有硬脊膜外導管，拔管時之 INR 亦必須 < 1.5。"
  }
];
