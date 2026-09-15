/**
 * AnesPilot - Crisis Engine
 * Checklist workflows, calculations (MH, LAST, CICO, Anaphylaxis, ACLS),
 * Audio-driven CPR metronome (110 bpm) and step timers using Web Audio API.
 */

class AudioService {
  constructor() {
    this.ctx = null;
    this.metronomeInterval = null;
    this.isMetronomeRunning = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  beep(freq = 800, duration = 0.08, type = "sine") {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio play blocked:", e);
    }
  }

  startMetronome(bpm = 110, onTick) {
    this.init();
    this.stopMetronome();
    this.isMetronomeRunning = true;
    const intervalMs = (60 / bpm) * 1000;
    let count = 0;

    this.metronomeInterval = setInterval(() => {
      count++;
      const isHigh = count % 2 === 1;
      this.beep(isHigh ? 950 : 750, 0.06, "square");
      if (onTick) onTick(count);
    }, intervalMs);
  }

  stopMetronome() {
    if (this.metronomeInterval) {
      clearInterval(this.metronomeInterval);
      this.metronomeInterval = null;
    }
    this.isMetronomeRunning = false;
  }

  alarm() {
    this.init();
    this.beep(880, 0.15, "triangle");
    setTimeout(() => this.beep(1100, 0.2, "triangle"), 160);
    setTimeout(() => this.beep(1320, 0.3, "triangle"), 380);
  }
}

export const audioService = new AudioService();

export const CRISIS_MODULES = {
  // 1. Malignant Hyperthermia
  mh: {
    title: "惡性高熱 (Malignant Hyperthermia - MH)",
    badge: "極危急",
    subtitle: "吸入性麻醉劑或 Suxamethonium 引發骨骼肌高代謝危機",
    calculateDoses(weightKg) {
      const initialMg = Math.round(weightKg * 2.5 * 10) / 10;
      const maxMg = Math.round(weightKg * 10.0 * 10) / 10;
      const stdVials20mg = Math.ceil(initialMg / 20);
      const ryanodexVials250mg = Math.ceil(initialMg / 250);
      const waterPerVialStd = "60 mL 無菌注射用水 (Sterile water without preservative)";
      const waterPerRyanodex = "5 mL 無菌注射用水 / 瓶";

      return {
        initialMg,
        maxMg,
        stdVials20mg,
        ryanodexVials250mg,
        waterPerVialStd,
        waterPerRyanodex
      };
    },
    actionSteps: [
      { id: "mh1", title: "立刻停用所有揮發性氣體與 Succinylcholine", desc: "換上新呼吸迴路或加裝 Activated Charcoal 碳吸附過濾器，改全靜脈麻醉 (TIVA)。" },
      { id: "mh2", title: "以 100% 高流速氧氣 (>10 L/min) 進行過度通氣 (Hyperventilate)", desc: "將潮氣量及呼吸次數提高 2-3 倍，以排除激增之二氧化碳。" },
      { id: "mh3", title: "呼叫全力支援，推來 MH 急救車與 Dantrolene", desc: "一人調度，至少指派 2-3 人協助專職泡藥 (每瓶 20mg 需劇烈搖晃加 60mL 水溶解)。" },
      { id: "mh4", title: "靜脈推注 Dantrolene 首劑 2.5 mg/kg", desc: "快速 IV push 直至症狀（心搏過速、高體溫、高碳酸血症、肌肉僵直）緩解，必要時每 5-10 分鐘重複追加至最高 10 mg/kg。" },
      { id: "mh5", title: "積極降溫措施", desc: "靜脈滴注冷生理食鹽水 (4°C, 10-20 mL/kg)、體表冰敷、體腔灌洗。當體溫降至 38.5°C 即停止積極降溫防低體溫反彈。" },
      { id: "mh6", title: "監測與處置高血鉀 (Hyperkalemia) 及酸中毒", desc: "抽取動脈血氣分析 (ABG)、鉀離子、CK、肌紅素尿。嚴重高鉀給予 10% Calcium gluconate 10-20mL、Regular Insulin 10U + 50% Glucose 50mL。" },
      { id: "mh7", title: "維持尿量 > 1 - 2 mL/kg/hr", desc: "放置導尿管，必要時給予 Mannitol 或 Furosemide，防急性腎衰竭。" }
    ]
  },

  // 2. LAST (Local Anesthetic Systemic Toxicity)
  last: {
    title: "局部麻醉藥全身毒性 (LAST)",
    badge: "立即停止注射",
    subtitle: "神經或心臟毒性反應（耳鳴、金屬味、痙攣、心律不整、心跳驟停）",
    calculateDoses(weightKg) {
      const bolusMl = Math.round(weightKg * 1.5 * 10) / 10;
      const infusionMlMin = Math.round(weightKg * 0.25 * 10) / 10;
      const maxMl = Math.round(weightKg * 12.0);

      return {
        bolusMl,
        infusionMlMin,
        maxMl,
        infusionDurationMin: 10
      };
    },
    actionSteps: [
      { id: "l1", title: "立即停止施打所有局部麻醉藥物", desc: "呼叫急救支援並請護理師推來 20% 脂肪乳劑 (Lipid Emulsion) 與急救推車。" },
      { id: "l2", title: "維持呼吸道通暢，給予 100% 氧氣", desc: "預防並即時矯正低血氧及酸中毒（酸中毒會加劇局麻藥對心肌毒性）。" },
      { id: "l3", title: "控制痙攣抽搐", desc: "首選 Benzodiazepine (Midazolam 1-2 mg IV)；避免使用高劑量 Propofol（避免加重心血管衰竭）。" },
      { id: "l4", title: "靜脈推注 20% Lipid Emulsion 首劑 (1.5 mL/kg)", desc: "於 2-3 分鐘內推注完成。" },
      { id: "l5", title: "立即啟動 20% Lipid Emulsion 持續滴注 (0.25 mL/kg/min)", desc: "持續滴注至少 10-15 分鐘直至心血管功能穩定。" },
      { id: "l6", title: "若血行動態持續不穩或心跳驟停", desc: "可於 5 分鐘後重複給予 1-2 次 Bolus (1.5 mL/kg)，並可將輸注速率提高至 0.5 mL/kg/min。總上限 12 mL/kg。" },
      { id: "l7", title: "ACLS 心肺復甦調整注意事項", desc: "避免使用 Vasopressin、鈣離子阻斷劑、Beta 阻斷劑；Epinephrine 劑量應減小（小劑量滴定 ≤ 1 mcg/kg IV），避免誘發心律不整。" }
    ]
  },

  // 3. Difficult Airway (DAS CICO Algorithm)
  cico: {
    title: "困難呼吸道 / CICO (無法插管且無法通氣)",
    badge: "黃金決策",
    subtitle: "遵循 DAS Guidelines 四階梯挽救流程",
    calculateDoses(weightKg) {
      return {
        sugammadexRsiRescue: Math.round(weightKg * 16)
      };
    },
    actionSteps: [
      { id: "c1", title: "Plan A：面罩通氣與氣管插管 (優化環境)", desc: "使用影像喉頭鏡 (Video Laryngoscope)、Bougie 探針、調整病人姿勢 (Sniffing position/Ramping)、限制插管嘗試不超過 3 次。" },
      { id: "c2", title: "Plan B：維持氧合 - 放置聲門上呼吸道 (SAD / LMA)", desc: "選用適當尺寸二代 LMA (含胃管減壓管道)，最多嘗試 2 次。若通氣成功，評估喚醒病人、經 LMA 導管插管或繼續手術。" },
      { id: "c3", title: "Plan C：宣布失敗，最終嘗試面罩通氣 (Wake up the patient)", desc: "雙人雙手面罩加壓 (2-person technique)、置入咽後導氣管 (OPA)、確保肌鬆已充分 (若使用 Rocuronium 可立即給予 Sugammadex 16 mg/kg)。" },
      { id: "c4", title: "Plan D：【宣布 CICO】立即執行緊急外科氣道 (eFONA)", desc: "伸展頸部，確認環甲膜位置。使用「手術刀-Bougie-氣管內管」(Scalpel-Bougie-Tube, ID 5.0-6.0) 執行環甲膜切開術。" }
    ]
  },

  // 4. Anaphylaxis in OR
  anaphylaxis: {
    title: "手術室過敏性休克 (Anaphylaxis)",
    badge: "休克搶救",
    subtitle: "肌鬆劑、抗生素、乳膠 (Latex)、消毒液 (Chlorhexidine) 引發",
    calculateDoses(weightKg) {
      const epiIvBolusUg = Math.round(weightKg * 1.0);
      const epiImMg = Math.min(0.5, Math.round(weightKg * 0.01 * 100) / 100);
      const fluidBolusMl = Math.round(weightKg * 20);

      return {
        epiIvBolusUg,
        epiImMg,
        fluidBolusMl
      };
    },
    actionSteps: [
      { id: "a1", title: "立即停止疑似過敏原藥物與輸液", desc: "如剛給予之抗生素、肌鬆劑、人工血漿，通知外科更換乳膠手套。" },
      { id: "a2", title: "給予 100% 氧氣，並採頭低腳高姿位 (Trendelenburg)", desc: "防低血壓致心腦灌流不足，必要時立即插管保護呼吸道。" },
      { id: "a3", title: "給予 Epinephrine (首選救命藥物)", desc: "依嚴重度：輕中度(Grade 2) IV 10-50 mcg 滴定；重度(Grade 3/4) IV 100-200 mcg 推注，或 IM 0.01 mg/kg。必要時啟動持續點滴。" },
      { id: "a4", title: "大量晶體輸液衝注 (Fluid Challenge)", desc: "成人快速加壓輸注 1-2 公升 Normal Saline 或 Balanced Crystalloid (小兒 20 mL/kg)。" },
      { id: "a5", title: "二線輔助藥物 (於血行動態穩定後給予)", desc: "Diphenhydramine 50mg IV (抗組織胺)；Hydrocortisone 100-200mg 或 Dexamethasone 8mg IV (預防雙相反應)；氣管痙攣可給予 Salbutamol 噴劑或 Aminophylline。" }
    ]
  },

  // 5. Intraoperative ACLS
  acls: {
    title: "手術中心跳驟停 (Intraoperative ACLS)",
    badge: "心肺復甦",
    subtitle: "高品質 CPR、110 bpm 節拍器、2分鐘循環評估",
    calculateDoses(weightKg) {
      const isPed = weightKg < 40;
      const defibInitial = isPed ? Math.round(weightKg * 2) : 200;
      const defibNext = isPed ? Math.round(weightKg * 4) : 200;
      const epiDose = isPed ? `${Math.round(weightKg * 10)} mcg` : "1 mg";
      const amiodaroneInitial = isPed ? `${Math.round(weightKg * 5)} mg` : "300 mg";
      const amiodaroneNext = isPed ? `${Math.round(weightKg * 2.5)} mg` : "150 mg";

      return {
        defibInitial,
        defibNext,
        epiDose,
        amiodaroneInitial,
        amiodaroneNext
      };
    },
    actionSteps: [
      { id: "ac1", title: "呼叫支援，立即啟動高品質 CPR (壓胸頻率 100-120 bpm)", desc: "深度 5-6 公分，完全回彈，盡量避免中斷。啟動節拍器輔助。" },
      { id: "ac2", title: "停用所有麻醉氣體，給予 100% 氧氣", desc: "確保氣道通暢，換氣頻率每 6 秒一次 (10 次/分)，避免過度通氣。" },
      { id: "ac3", title: "評估心律：可電擊 (VF/pVT) vs 不可電擊 (PEA/Asystole)", desc: "可電擊：立即電擊 (200J Biphasic) 隨即恢復 CPR 2 分鐘；不可電擊：立即給予 Epinephrine 1mg 並持續 CPR。" },
      { id: "ac4", title: "每 2 分鐘換手壓胸，評估脈搏與心律", desc: "Epinephrine 1mg (小兒 10mcg/kg) 每 3-5 分鐘一次。頑固性心室震顫在第 3 次電擊後給予 Amiodarone 300mg (小兒 5mg/kg)。" },
      { id: "ac5", title: "尋找並排除可逆病因 (4H 4T)", desc: "Hypovolemia (失血), Hypoxia (缺氧), Hydrogen ion (酸中毒), Hypo/Hyperkalemia (電解質); Tension pneumothorax (張力性氣胸), Tamponade (心包填塞), Toxins (局麻毒性/藥物過量), Thrombosis (肺栓塞/心梗)。" }
    ]
  }
};
