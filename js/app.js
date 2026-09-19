/**
 * AnesPilot - Main Application Controller
 * References: Morgan & Mikhail's (7e), Goodman & Gilman's (14e), NYSORA, ASRA
 */

import { DosingEngine } from "./engines/dosing.js";
import { CRISIS_MODULES, audioService } from "./engines/crisis.js";
import { ToxicityEngine, LA_AGENTS } from "./engines/toxicity.js";
import { ASRA_DATABASE } from "./data/asraData.js";
import { InfusionEngine } from "./engines/infusion.js";
import { ScoresEngine } from "./engines/scores.js";
import { cloudSync } from "./services/cloudSync.js";

// Global Application State
export const state = {
  // Patient Profile
  patient: {
    ageYears: 35,
    weightKg: 70,
    heightCm: 170,
    isFemale: false,
    isPediatric: false
  },
  // Theme
  theme: "dark", // "dark" or "light"
  // Active Navigation Tab
  activeTab: "dosing", // dosing, crisis, toxicity, asra, infusion, scores, logbook
  // Crisis Sub-tab
  activeCrisisId: "mh",
  // Expanded drug details in Dosing
  expandedDrugIds: {},
  // Toxicity administered records
  toxicityAdministered: [
    { id: 1, agentId: "lidocaine_plain", concPercent: 1.0, volumeMl: 10, mg: 100 }
  ],
  toxicityHighRisk: false,
  // ASRA state
  asraSelectedDrugId: "apixaban",
  asraHoursSinceLastDose: 36,
  asraCrCl: 60,
  // Infusion state
  infusionDrugId: "norepinephrine",
  infusionPresetIdx: 0,
  infusionTargetDose: 0.1,
  infusionRateMlHr: 0,
  infusionCustomConc: null,
  // Scores state
  stopBangAnswers: [false, false, false, false, false, false, false, false],
  apfelFemale: true,
  apfelNonSmoker: true,
  apfelHistory: false,
  apfelOpioids: true,
  rcriCriteria: [false, false, false, false, false, false],
  // Logbook cases
  cases: JSON.parse(localStorage.getItem("anes_cases") || "[]")
};

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  initEventListeners();
  applyTheme(state.theme);
  renderAll();

  // Initialize Cloud Sync Service
  initCloudSyncListeners();
});

function initCloudSyncListeners() {
  cloudSync.onAuthChange((user) => {
    const btnLogin = document.getElementById("btn-google-login");
    const userProfile = document.getElementById("google-user-profile");
    const avatar = document.getElementById("user-avatar");
    const nameEl = document.getElementById("user-display-name");

    if (user) {
      if (btnLogin) btnLogin.classList.add("hidden");
      if (userProfile) userProfile.classList.remove("hidden");
      if (avatar) avatar.src = user.photoURL || "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2310b981'><circle cx='12' cy='8' r='4'/><path d='M4 20c0-4 4-6 8-6s8 2 8 6'/></svg>";
      if (nameEl) nameEl.textContent = user.displayName || user.email.split("@")[0];

      // Refresh cases from merged local storage
      state.cases = JSON.parse(localStorage.getItem("anes_cases") || "[]");
      if (state.activeTab === "logbook") renderLogbookTab();
    } else {
      if (btnLogin) btnLogin.classList.remove("hidden");
      if (userProfile) userProfile.classList.add("hidden");
      if (state.activeTab === "logbook") renderLogbookTab();
    }
  });

  cloudSync.onSyncChange((status, time) => {
    const syncStatusEl = document.getElementById("cloud-sync-status-badge");
    if (syncStatusEl) {
      if (status === "connected") {
        syncStatusEl.innerHTML = `<span class="text-emerald-400 font-bold">🟢 雲端已同步 (${time || '剛剛'})</span>`;
      } else if (status === "syncing") {
        syncStatusEl.innerHTML = `<span class="text-cyan-400 font-bold animate-pulse">🔄 同步傳輸中...</span>`;
      } else if (status === "error") {
        syncStatusEl.innerHTML = `<span class="text-amber-400 font-bold">⚠️ 同步待重試 (離線模式)</span>`;
      } else {
        syncStatusEl.innerHTML = `<span class="text-slate-400 font-bold">⚪ 本機離線模式 (LocalStorage)</span>`;
      }
    }
  });

  // Attempt non-blocking initialization
  cloudSync.init().catch(e => console.log("Offline mode active"));
}

function initEventListeners() {
  // Navigation Tabs
  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const target = tab.dataset.tab;
      setActiveTab(target);
    });
  });

  // Emergency Red Button (Direct to Crisis)
  const btnEmergency = document.getElementById("btn-quick-crisis");
  if (btnEmergency) {
    btnEmergency.addEventListener("click", () => setActiveTab("crisis"));
  }

  // Theme Toggle
  const btnTheme = document.getElementById("btn-theme-toggle");
  if (btnTheme) {
    btnTheme.addEventListener("click", toggleTheme);
  }

  // Patient Parameter Controls
  const weightInput = document.getElementById("input-weight");
  const weightSlider = document.getElementById("slider-weight");
  const ageInput = document.getElementById("input-age");
  const heightInput = document.getElementById("input-height");
  const genderToggle = document.getElementById("btn-gender-toggle");

  if (weightInput && weightSlider) {
    const syncWeight = (val) => {
      const num = parseFloat(val) || 1;
      state.patient.weightKg = Math.max(1, Math.min(200, num));
      weightInput.value = state.patient.weightKg;
      weightSlider.value = state.patient.weightKg;
      renderAll();
    };
    weightInput.addEventListener("input", (e) => syncWeight(e.target.value));
    weightSlider.addEventListener("input", (e) => syncWeight(e.target.value));
  }

  if (ageInput) {
    ageInput.addEventListener("input", (e) => {
      const num = parseFloat(e.target.value) || 0;
      state.patient.ageYears = Math.max(0, Math.min(110, num));
      state.patient.isPediatric = state.patient.ageYears < 12;
      renderAll();
    });
  }

  if (heightInput) {
    heightInput.addEventListener("input", (e) => {
      const num = parseFloat(e.target.value) || 0;
      state.patient.heightCm = num;
      renderAll();
    });
  }

  if (genderToggle) {
    genderToggle.addEventListener("click", () => {
      state.patient.isFemale = !state.patient.isFemale;
      genderToggle.textContent = state.patient.isFemale ? "女性 ♀" : "男性 ♂";
      genderToggle.className = state.patient.isFemale 
        ? "glove-btn bg-pink-950/60 text-pink-300 border border-pink-700/50"
        : "glove-btn bg-sky-950/60 text-sky-300 border border-sky-700/50";
      renderAll();
    });
  }

  // IBW Badge Click Info (Pediatric Traub-Johnson vs Adult Devine & BMI)
  const ibwBadge = document.getElementById("profile-ibw-badge");
  if (ibwBadge) {
    ibwBadge.addEventListener("click", () => {
      const p = state.patient;
      const dosing = DosingEngine.calculateAll(p);
      if (!dosing.ibw) return;
      const hM = p.heightCm / 100;
      const bmi22 = (Math.round(22 * hM * hM * 10) / 10).toFixed(1);
      const isPed = p.ageYears < 18 || (p.heightCm / 2.54) < 60;

      if (isPed) {
        alert(
          `【小兒理想體重 (Pediatric IBW) 計算說明】\n\n` +
          `目前病患設定：${p.ageYears < 1 ? Math.round(p.ageYears * 12) + ' 個月大' : p.ageYears + ' 歲'}小兒，身高 ${p.heightCm} cm (${p.isFemale ? '女性' : '男性'})\n\n` +
          `★ Traub-Johnson 兒科權威公式【本系統採用】：${dosing.ibw} kg\n` +
          `   • 計算公式：(身高吋)² × 1.65 / 1000\n` +
          `   • 醫學依據：專為 1~17 歲或身高 < 152cm 之小兒設計，精準匹配 CDC/WHO 生長曲線第 50 百分位數標準體重。\n` +
          `   • 臨床重要性：小兒肥胖時之保護性通氣潮氣量 (6-8 mL/kg) 與親水性藥物劑量安全基準（修正了成人 Devine 公式 45.5kg 導致嚴重氣壓傷之致命風險）。\n\n` +
          `註：年滿 18 歲且身高 ≥ 152.4cm 則切換為成人 Devine 麻醉金標準公式。`
        );
      } else {
        const bmiGender = p.isFemale 
          ? (Math.round(21 * hM * hM * 10) / 10).toFixed(1)
          : (Math.round(22 * hM * hM * 10) / 10).toFixed(1);
        alert(
          `【成人理想體重 (IBW) 計算公式說明】\n\n` +
          `目前病患設定：成人 ${p.ageYears} 歲，身高 ${p.heightCm} cm (${p.isFemale ? '女性' : '男性'})\n\n` +
          `1. Devine 公式 (1974) 【本系統採用】：${dosing.ibw} kg\n` +
          `   • 醫學地位：國際麻醉醫學界唯一金標準（《Morgan & Mikhail》、《Miller》、ARDSNet）\n` +
          `   • 臨床用途：肌鬆劑 (Rocuronium/Cisatracurium) 與保護性潮氣量 (6-8 mL/kg) 唯一指定標準。\n\n` +
          `2. 衛福部/國健署 BMI 理想體重法：${bmi22} kg (男女分計: ${bmiGender} kg)\n` +
          `   • 計算公式：22 × 身高(m)²\n` +
          `   • 臨床用途：大眾健康管理、體態評估與營養代謝門診。\n\n` +
          `★ 麻醉藥物動力學與機械通氣設定，強烈建議依 Devine 公式以確保給藥安全！`
        );
      }
    });
  }

  // Quick Patient Presets
  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const w = parseFloat(btn.dataset.w);
      const a = parseFloat(btn.dataset.a);
      const h = parseFloat(btn.dataset.h);
      const f = btn.dataset.f === "true";

      state.patient.weightKg = w;
      state.patient.ageYears = a;
      state.patient.heightCm = h;
      state.patient.isFemale = f;
      state.patient.isPediatric = a < 12;

      // Sync inputs
      if (weightInput) weightInput.value = w;
      if (weightSlider) weightSlider.value = w;
      if (ageInput) ageInput.value = a;
      if (heightInput) heightInput.value = h;
      if (genderToggle) {
        genderToggle.textContent = f ? "女性 ♀" : "男性 ♂";
        genderToggle.className = f 
          ? "glove-btn bg-pink-950/60 text-pink-300 border border-pink-700/50"
          : "glove-btn bg-sky-950/60 text-sky-300 border border-sky-700/50";
      }

      renderAll();
    });
  });
}

// --- Navigation Management ---
export function setActiveTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-content").forEach(panel => {
    panel.classList.toggle("hidden", panel.id !== `panel-${tabId}`);
  });
  renderActiveTab();
}

// --- Theme Management ---
function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme(state.theme);
}

function applyTheme(theme) {
  const body = document.body;
  const icon = document.getElementById("theme-icon");
  if (theme === "light") {
    body.classList.add("theme-light");
    if (icon) icon.textContent = "☀️ 日照模式";
  } else {
    body.classList.remove("theme-light");
    if (icon) icon.textContent = "🌙 刀房暗室";
  }
}

// --- Master Render Coordinator ---
export function renderAll() {
  renderProfilePill();
  renderActiveTab();
}

function renderProfilePill() {
  const p = state.patient;
  const dosing = DosingEngine.calculateAll(p);
  const pillWeight = document.getElementById("profile-display-weight");
  const pillAge = document.getElementById("profile-display-age");
  const pillIbw = document.getElementById("profile-display-ibw");

  if (pillWeight) pillWeight.textContent = `${p.weightKg} kg`;
  if (pillAge) {
    if (p.ageYears < 1) {
      const months = Math.round(p.ageYears * 12);
      pillAge.textContent = `${months > 0 ? months : 1} 個月大 (嬰幼兒)`;
    } else {
      pillAge.textContent = `${p.ageYears} 歲 ${p.isPediatric ? '(小兒)' : '(成人)'}`;
    }
  }
  const ibwBadge = document.getElementById("profile-ibw-badge");
  if (pillIbw) {
    if (dosing.ibw) {
      const label = ibwBadge ? ibwBadge.querySelector("span:first-child") : null;
      if (label) label.textContent = "IBW:";
      pillIbw.textContent = `${dosing.ibw} kg`;
      if (ibwBadge) {
        ibwBadge.style.display = "flex";
        const isPed = p.ageYears < 18 || (p.heightCm / 2.54) < 60;
        if (isPed) {
          ibwBadge.title = `【小兒理想體重】\n• Traub-Johnson 兒科權威公式: ${dosing.ibw} kg (匹配 CDC/WHO 50th%)\n(點擊查看詳細公式說明)`;
        } else {
          const hM = p.heightCm / 100;
          const bmi22 = (Math.round(22 * hM * hM * 10) / 10).toFixed(1);
          ibwBadge.title = `【成人理想體重 IBW】\n• Devine 麻醉金標準: ${dosing.ibw} kg\n• 國健署 BMI(22)法: ${bmi22} kg\n(點擊查看詳細公式比較)`;
        }
      }
    } else {
      const label = ibwBadge ? ibwBadge.querySelector("span:first-child") : null;
      if (label) label.textContent = "BSA:";
      pillIbw.textContent = dosing.bsa ? `${dosing.bsa} m²` : '--';
      if (ibwBadge) {
        ibwBadge.title = "體表面積 BSA (Mosteller 公式)";
      }
    }
  }
}

function renderActiveTab() {
  switch (state.activeTab) {
    case "dosing":
      renderDosingTab();
      break;
    case "crisis":
      renderCrisisTab();
      break;
    case "toxicity":
      renderToxicityTab();
      break;
    case "asra":
      renderAsraTab();
      break;
    case "infusion":
      renderInfusionTab();
      break;
    case "scores":
      renderScoresTab();
      break;
    case "logbook":
      renderLogbookTab();
      break;
  }
}

// ==========================================
// 1. DOSING TAB RENDERER (AccessAnesthesiology)
// ==========================================
function renderDosingTab() {
  const container = document.getElementById("dosing-results-container");
  if (!container) return;

  const data = DosingEngine.calculateAll(state.patient);
  const { airway, fluids, blood, dosages, ventilator } = data;

  container.innerHTML = `
    <!-- Textbook Authority Banner -->
    <div class="mb-3 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/80 flex items-center justify-between text-xs">
      <div class="flex items-center gap-2">
        <span class="text-base">📚</span>
        <div>
          <span class="font-bold text-cyan-400">McGraw-Hill AccessAnesthesiology 核心文獻標準</span>
          <span class="text-slate-400 ml-1.5 hidden sm:inline">參照 Morgan & Mikhail (7e) & Goodman & Gilman (14e) 藥典</span>
        </div>
      </div>
      <span class="drug-badge bg-cyan-950 text-cyan-300 border border-cyan-800/50">醫師國考 / 專科考指引</span>
    </div>

    <!-- Airway & Equipment Header Card -->
    <div class="anes-card mb-4 border-l-4 border-l-cyan-500">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-lg text-cyan-400 flex items-center gap-2">
          <span>🫁</span> 呼吸道與插管管件推薦 (Airway & Equipment)
        </h3>
        <span class="drug-badge bg-cyan-950 text-cyan-300 border border-cyan-700/50">
          ${state.patient.ageYears < 12 ? '小兒計算' : '成人體型'}
        </span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
          <div class="text-xs text-slate-400">氣管內管 Cuffed ID</div>
          <div class="text-xl font-extrabold text-white mt-0.5">${airway.ettCuffed} mm</div>
          <div class="text-[11px] text-slate-500">有氣囊管 (Motoyama式)</div>
        </div>

        <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
          <div class="text-xs text-slate-400">氣管內管 Uncuffed ID</div>
          <div class="text-xl font-extrabold text-white mt-0.5">${airway.ettUncuffed} mm</div>
          <div class="text-[11px] text-slate-500">無氣囊管 (小兒備用)</div>
        </div>

        <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
          <div class="text-xs text-slate-400">插管深度 (門齒刻度)</div>
          <div class="text-xl font-extrabold text-amber-300 mt-0.5">${airway.ettDepth} cm</div>
          <div class="text-[11px] text-slate-500">Lip-to-tip 深度估算</div>
        </div>

        <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
          <div class="text-xs text-slate-400">喉頭罩 LMA 尺寸</div>
          <div class="text-xl font-extrabold text-emerald-400 mt-0.5">Size ${airway.lmaSize}</div>
          <div class="text-[11px] text-slate-500">依體重級距配搭</div>
        </div>

        <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
          <div class="text-xs text-slate-400">喉頭鏡葉片 (Blade)</div>
          <div class="text-base font-bold text-white mt-1">${airway.bladeType}</div>
          <div class="text-[11px] text-slate-500">直葉(Miller) / 彎葉(Mac)</div>
        </div>

        <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
          <div class="text-xs text-slate-400">抽吸管 / 保護性潮氣量</div>
          <div class="text-base font-bold text-sky-300 mt-1">${ventilator.tvLow} - ${ventilator.tvHigh} mL</div>
          <div class="text-[11px] text-slate-500">6-8 mL/kg (${ventilator.isUsingIbw ? 'IBW' : 'TBW'}) | 吸引管: ${airway.suctionFr}</div>
        </div>
      </div>
      <div class="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
        <span>📖 出處依據：</span>
        <span>${airway.reference}</span>
      </div>
    </div>

    <!-- Induction & Muscle Relaxants -->
    <div class="anes-card mb-4 border-l-4 border-l-blue-500">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-lg text-blue-400 flex items-center gap-2">
          <span>💉</span> 誘導與肌鬆劑 (Induction & Neuromuscular)
        </h3>
        <span class="text-xs text-slate-400">點擊項目展開 AccessAnesthesiology 藥理考點</span>
      </div>
      <div class="space-y-2">
        ${dosages.induction.map(d => renderDrugRow(d)).join("")}
      </div>
    </div>

    <!-- Analgesia & Reversal -->
    <div class="anes-card mb-4 border-l-4 border-l-purple-500">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-lg text-purple-400 flex items-center gap-2">
          <span>💊</span> 止痛、鎮靜與拮抗逆轉 (Analgesia & Reversals)
        </h3>
        <span class="text-xs text-slate-400">Goodman & Gilman 14e 藥物代謝</span>
      </div>
      <div class="space-y-2">
        ${dosages.analgesia.map(d => renderDrugRow(d)).join("")}
      </div>
    </div>

    <!-- Emergency & Resuscitation -->
    <div class="anes-card mb-4 border-l-4 border-l-rose-500">
      <h3 class="font-bold text-lg text-rose-400 mb-3 flex items-center gap-2">
        <span>⚡</span> 急救與心肺復甦 (Emergency Resuscitation)
      </h3>
      <div class="space-y-2">
        ${dosages.emergency.map(d => renderDrugRow(d, true)).join("")}
      </div>
    </div>

    <!-- Fluid & Blood Management -->
    <div class="anes-card border-l-4 border-l-amber-500">
      <h3 class="font-bold text-lg text-amber-400 mb-3 flex items-center gap-2">
        <span>💧</span> 輸液與最大容許失血量 (Fluid & Blood)
      </h3>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
          <div class="text-xs text-slate-400">4-2-1 維持輸液速率</div>
          <div class="text-xl font-bold text-amber-300 mt-0.5">${fluids.hourlyRate} mL/hr</div>
          <div class="text-[11px] text-slate-500">常規維持量</div>
        </div>
        <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
          <div class="text-xs text-slate-400">禁食 NPO 8 小時水分赤字</div>
          <div class="text-xl font-bold text-white mt-0.5">${fluids.npo8hr} mL</div>
          <div class="text-[11px] text-slate-500">建議手術前 3 小時補足</div>
        </div>
        <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
          <div class="text-xs text-slate-400">預估總血容量 (EBV)</div>
          <div class="text-xl font-bold text-rose-400 mt-0.5">${blood.ebv} mL</div>
          <div class="text-[11px] text-slate-500">係數: ${blood.ebvFactor} mL/kg</div>
        </div>
        <div class="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
          <div class="text-xs text-slate-400">容許失血量 (MABL)</div>
          <div class="text-xl font-bold text-rose-300 mt-0.5">${blood.mabl} mL</div>
          <div class="text-[11px] text-slate-500">Hct 36%降至24%容許值</div>
        </div>
      </div>
      <div class="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
        <span>📖 出處依據：</span>
        <span>${fluids.reference} &bull; ${blood.reference}</span>
      </div>
    </div>
  `;
}

function renderDrugRow(drug, isEmergency = false) {
  const bgClass = isEmergency ? "bg-rose-950/20 border-rose-900/30" : "bg-slate-900/40 border-slate-800";
  const badgeClass = drug.badge === "IBW" 
    ? "drug-badge-ibw bg-amber-950 text-amber-300 border-amber-800" 
    : (isEmergency ? "drug-badge-emergency bg-rose-950 text-rose-300 border-rose-800" : "drug-badge-std bg-slate-800 text-slate-300 border-slate-700");

  const isExpanded = state.expandedDrugIds[drug.id] || false;

  return `
    <div class="p-3 rounded-lg border ${bgClass} transition cursor-pointer select-text" onclick="window.toggleDrugExpand('${drug.id}')">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-text">
        <div class="select-text">
          <div class="flex items-center gap-2 select-text">
            <span class="font-bold text-slate-100 select-text">${drug.name}</span>
            <span class="drug-badge border ${badgeClass}">${drug.badge}</span>
            <span class="text-[10px] text-cyan-400 underline decoration-dotted">📖 藥典指引</span>
          </div>
          <div class="text-xs text-slate-400 mt-0.5 select-text">${drug.perKg} &bull; <span class="text-slate-500 select-text">${drug.note}</span></div>
        </div>
        <div class="text-right sm:self-center select-text">
          <div class="text-lg font-black text-emerald-400 select-text">${drug.dose}</div>
        </div>
      </div>

      <!-- Expandable Textbook Pharmacology & Pearls -->
      ${isExpanded ? `
        <div class="mt-2.5 pt-2.5 border-t border-slate-800/80 text-xs leading-relaxed space-y-1 bg-slate-950/40 p-2.5 rounded select-text">
          <div class="flex items-center gap-1.5 text-cyan-400 font-bold select-text">
            <span>📚 權威出處：</span>
            <span class="select-text">${drug.source || 'Morgan & Mikhail Clinical Anesthesiology, 7e'}</span>
          </div>
          ${drug.mechanism ? `<div class="text-slate-200 select-text"><span class="text-slate-400 font-semibold">作用機轉 (Pharmacodynamics)：</span>${drug.mechanism}</div>` : ''}
          ${drug.pearls ? `<div class="text-amber-300 select-text"><span class="text-amber-400 font-semibold">臨床考點/注意事項 (Clinical Pearls)：</span>${drug.pearls}</div>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

window.toggleDrugExpand = (drugId) => {
  const sel = window.getSelection();
  if (sel && sel.toString().trim().length > 0) {
    return;
  }
  state.expandedDrugIds[drugId] = !state.expandedDrugIds[drugId];
  renderDosingTab();
};

// ==========================================
// 2. CRISIS ENGINE RENDERER (ASRA / MHAUS / DAS)
// ==========================================
function renderCrisisTab() {
  const container = document.getElementById("crisis-container");
  if (!container) return;

  const crisisKeys = Object.keys(CRISIS_MODULES);
  const currentMod = CRISIS_MODULES[state.activeCrisisId] || CRISIS_MODULES.mh;
  const doses = currentMod.calculateDoses(state.patient.weightKg);

  container.innerHTML = `
    <!-- Top Crisis Selector Tabs -->
    <div class="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
      ${crisisKeys.map(k => {
        const mod = CRISIS_MODULES[k];
        const isActive = k === state.activeCrisisId;
        return `
          <button class="glove-btn text-xs py-2 px-1 text-center font-bold rounded-lg border transition-all ${
            isActive 
              ? 'bg-rose-700 text-white border-rose-500 shadow-lg shadow-rose-950/80'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
          }" onclick="window.switchCrisis('${k}')">
            ${mod.title.split(' ')[0]}
          </button>
        `;
      }).join("")}
    </div>

    <!-- Active Crisis Header Banner -->
    <div class="anes-card crisis-active-mode mb-4 border-2 border-rose-600 bg-rose-950/30">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-2xl">🚨</span>
            <h2 class="text-xl font-black text-rose-400 tracking-wide">${currentMod.title}</h2>
            <span class="drug-badge bg-rose-900 text-rose-200 border border-rose-700 font-black">${currentMod.badge}</span>
          </div>
          <p class="text-sm text-slate-300 mt-1">${currentMod.subtitle}</p>
        </div>

        <div class="flex items-center gap-2">
          ${state.activeCrisisId === 'acls' ? `
            <button id="btn-metronome" class="glove-btn bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm px-4 shadow-md" onclick="window.toggleMetronome()">
              <span id="metro-heart" class="text-lg">❤️</span>
              <span id="metro-text">開啟 CPR 110bpm 節拍器</span>
            </button>
          ` : `
            <button class="glove-btn bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs py-2" onclick="window.startCrisisTimer('${state.activeCrisisId}')">
              ⏱️ 啟動 5 分鐘再評估計時
            </button>
          `}
        </div>
      </div>

      <!-- Live Calculation Card for Current Crisis -->
      <div class="mt-4 pt-3 border-t border-rose-900/40">
        ${renderCrisisDosePanel(state.activeCrisisId, doses, state.patient.weightKg)}
      </div>
    </div>

    <!-- Action Checklists -->
    <div class="anes-card border-slate-800">
      <h3 class="font-bold text-slate-200 mb-3 flex items-center justify-between">
        <span>📋 標準處置檢核單 (Action Checklist & Guidelines)</span>
        <button class="text-xs text-slate-400 hover:text-white" onclick="window.resetChecklist()">重置勾選</button>
      </h3>
      <div class="space-y-2">
        ${currentMod.actionSteps.map((step, idx) => `
          <label class="flex items-start gap-3 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800/80 cursor-pointer transition">
            <input type="checkbox" id="check-${step.id}" class="mt-1 w-5 h-5 rounded accent-rose-500 bg-slate-950 cursor-pointer">
            <div>
              <div class="font-bold text-slate-100 text-sm">${idx + 1}. ${step.title}</div>
              <div class="text-xs text-slate-400 mt-0.5 leading-relaxed">${step.desc}</div>
            </div>
          </label>
        `).join("")}
      </div>
    </div>
  `;
}

function renderCrisisDosePanel(crisisId, doses, weightKg) {
  if (crisisId === "mh") {
    return `
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="bg-rose-950/60 p-3 rounded-lg border border-rose-800/50">
          <div class="text-xs text-rose-300 font-bold">Dantrolene 首劑劑量 (2.5 mg/kg - MHAUS指引)</div>
          <div class="text-2xl font-black text-rose-300 mt-0.5">${doses.initialMg} mg</div>
          <div class="text-[11px] text-slate-400">至多追加至 10 mg/kg (${doses.maxMg} mg)</div>
        </div>
        <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <div class="text-xs text-amber-400 font-bold">傳統標準瓶 (20 mg/瓶)</div>
          <div class="text-2xl font-black text-amber-400 mt-0.5">${doses.stdVials20mg} 瓶</div>
          <div class="text-[11px] text-slate-400">${doses.waterPerVialStd}</div>
        </div>
        <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <div class="text-xs text-emerald-400 font-bold">Ryanodex 新型懸浮劑 (250 mg/瓶)</div>
          <div class="text-2xl font-black text-emerald-400 mt-0.5">${doses.ryanodexVials250mg} 瓶</div>
          <div class="text-[11px] text-slate-400">${doses.waterPerRyanodex}</div>
        </div>
      </div>
    `;
  } else if (crisisId === "last") {
    return `
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="bg-rose-950/60 p-3 rounded-lg border border-rose-800/50">
          <div class="text-xs text-rose-300 font-bold">20% 脂肪乳劑 首劑 Bolus (1.5 mL/kg - ASRA指引)</div>
          <div class="text-2xl font-black text-rose-300 mt-0.5">${doses.bolusMl} mL</div>
          <div class="text-[11px] text-slate-400">2-3 分鐘內推注完成</div>
        </div>
        <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <div class="text-xs text-cyan-400 font-bold">持續滴注速率 (0.25 mL/kg/min)</div>
          <div class="text-2xl font-black text-cyan-400 mt-0.5">${doses.infusionMlMin} mL/min</div>
          <div class="text-[11px] text-slate-400">換算幫浦: ${(doses.infusionMlMin * 60).toFixed(0)} mL/hr</div>
        </div>
        <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <div class="text-xs text-amber-400 font-bold">累積最大容許總量 (12 mL/kg)</div>
          <div class="text-2xl font-black text-amber-400 mt-0.5">${doses.maxMl} mL</div>
          <div class="text-[11px] text-slate-400">初次 5 分鐘後若不穩可再 Bolus 1-2 次</div>
        </div>
      </div>
    `;
  } else if (crisisId === "cico") {
    return `
      <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
        <div>
          <div class="text-xs text-amber-400 font-bold">Rocuronium RSI 插管失敗即刻逆轉救命劑量 (DAS指引)</div>
          <div class="text-xl font-black text-white mt-0.5">Sugammadex 16 mg/kg = <span class="text-rose-400">${doses.sugammadexRsiRescue} mg</span></div>
          <div class="text-xs text-slate-400">約需 ${Math.ceil(doses.sugammadexRsiRescue / 100)} 支 100mg/mL 瓶</div>
        </div>
        <div class="text-right">
          <span class="drug-badge bg-rose-950 text-rose-300 border border-rose-700">準備 Scalpel-Bougie-Tube eFONA</span>
        </div>
      </div>
    `;
  } else if (crisisId === "anaphylaxis") {
    return `
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="bg-rose-950/60 p-3 rounded-lg border border-rose-800/50">
          <div class="text-xs text-rose-300 font-bold">Epinephrine IV 滴定推注 (1 mcg/kg)</div>
          <div class="text-2xl font-black text-rose-300 mt-0.5">${doses.epiIvBolusUg} mcg</div>
          <div class="text-[11px] text-slate-400">1:100,000 稀釋液 (10mcg/mL)</div>
        </div>
        <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <div class="text-xs text-cyan-400 font-bold">Epinephrine IM 肌肉注射 (0.01 mg/kg)</div>
          <div class="text-2xl font-black text-cyan-400 mt-0.5">${doses.epiImMg} mg</div>
          <div class="text-[11px] text-slate-400">大腿前外側肌注 (上限 0.5 mg)</div>
        </div>
        <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <div class="text-xs text-amber-400 font-bold">加壓晶體輸液衝注 (20 mL/kg)</div>
          <div class="text-2xl font-black text-amber-400 mt-0.5">${doses.fluidBolusMl} mL</div>
          <div class="text-[11px] text-slate-400">Normal Saline / Balanced Salt</div>
        </div>
      </div>
    `;
  } else if (crisisId === "acls") {
    return `
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-rose-950/60 p-3 rounded-lg border border-rose-800/50">
          <div class="text-xs text-rose-300 font-bold">去顫電擊 首劑能量</div>
          <div class="text-2xl font-black text-rose-300 mt-0.5">${doses.defibInitial} J</div>
          <div class="text-[11px] text-slate-400">後續 ${doses.defibNext} J (雙相波)</div>
        </div>
        <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <div class="text-xs text-amber-400 font-bold">Epinephrine (每3-5分)</div>
          <div class="text-2xl font-black text-amber-400 mt-0.5">${doses.epiDose}</div>
          <div class="text-[11px] text-slate-400">給藥後以 20mL NS 沖洗管路</div>
        </div>
        <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <div class="text-xs text-cyan-400 font-bold">Amiodarone 首劑 (VF/pVT)</div>
          <div class="text-2xl font-black text-cyan-400 mt-0.5">${doses.amiodaroneInitial}</div>
          <div class="text-[11px] text-slate-400">第 3 次電擊後給予</div>
        </div>
        <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
          <div class="text-xs text-cyan-400 font-bold">Amiodarone 第二劑</div>
          <div class="text-2xl font-black text-cyan-400 mt-0.5">${doses.amiodaroneNext}</div>
          <div class="text-[11px] text-slate-400">第 5 次電擊後給予</div>
        </div>
      </div>
    `;
  }
  return "";
}

window.switchCrisis = (id) => {
  state.activeCrisisId = id;
  renderCrisisTab();
};

window.resetChecklist = () => {
  document.querySelectorAll('#crisis-container input[type="checkbox"]').forEach(c => c.checked = false);
};

window.toggleMetronome = () => {
  const heart = document.getElementById("metro-heart");
  const text = document.getElementById("metro-text");
  const btn = document.getElementById("btn-metronome");

  if (audioService.isMetronomeRunning) {
    audioService.stopMetronome();
    if (heart) heart.classList.remove("metronome-pulse");
    if (text) text.textContent = "開啟 CPR 110bpm 節拍器";
    if (btn) btn.className = "glove-btn bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm px-4 shadow-md";
  } else {
    audioService.startMetronome(110);
    if (heart) heart.classList.add("metronome-pulse");
    if (text) text.textContent = "🔊 節拍器運作中 (點此關閉)";
    if (btn) btn.className = "glove-btn bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-4 shadow-md";
  }
};

window.startCrisisTimer = (id) => {
  audioService.alarm();
  alert("計時器已啟動！5 分鐘後將提醒您重新評估處置效果。");
};

// ==========================================
// 3. TOXICITY TRACKER RENDERER (NYSORA / ASRA)
// ==========================================
function renderToxicityTab() {
  const container = document.getElementById("toxicity-container");
  if (!container) return;

  const result = ToxicityEngine.calculateToxicity(
    state.patient.weightKg,
    state.toxicityAdministered,
    state.toxicityHighRisk
  );

  const gaugeWidth = Math.min(100, result.totalPercent);
  const barColor = result.totalPercent >= 100 ? 'bg-rose-500' : (result.totalPercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500');

  container.innerHTML = `
    <!-- NYSORA Evidence Citation Header -->
    <div class="mb-3 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/80 flex items-center justify-between text-xs">
      <div class="flex items-center gap-2">
        <span class="text-base">🔬</span>
        <div>
          <span class="font-bold text-emerald-400">NYSORA & ASRA 局部麻醉藥毒性監控標準</span>
          <span class="text-slate-400 ml-1.5 hidden sm:inline">參照 NYSORA Regional Anesthesia Textbook & ASRA LAST 指引</span>
        </div>
      </div>
      <span class="drug-badge bg-emerald-950 text-emerald-300 border border-emerald-800/50">局麻安全性標準</span>
    </div>

    <!-- Top Visual Gauge Card -->
    <div class="anes-card mb-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-bold text-lg text-slate-100 flex items-center gap-2">
          <span>🧪</span> 局部麻醉藥綜合毒性儀表板 (Toxicity Index)
        </h3>
        <div class="flex items-center gap-2">
          <label class="text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
            <input type="checkbox" id="check-tox-risk" ${state.toxicityHighRisk ? 'checked' : ''} onchange="window.toggleToxRisk(this.checked)" class="w-4 h-4 accent-amber-500">
            <span>高風險體質 (年長衰弱/心肝腎衰竭，上限降20%)</span>
          </label>
        </div>
      </div>

      <!-- Meter Progress Bar -->
      <div class="mt-4">
        <div class="flex items-end justify-between mb-1.5">
          <span class="text-xs text-slate-400 font-semibold">安全毒性加總指數 (Total Fraction)</span>
          <span class="text-2xl font-black ${result.totalPercent >= 100 ? 'text-rose-400' : (result.totalPercent >= 70 ? 'text-amber-400' : 'text-emerald-400')}">
            ${result.totalPercent}%
          </span>
        </div>
        <div class="w-full h-4 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
          <div class="h-full rounded-full transition-all duration-300 ${barColor}" style="width: ${gaugeWidth}%"></div>
        </div>
        <div class="flex justify-between text-[11px] text-slate-500 mt-1 font-mono">
          <span>0%</span>
          <span class="text-amber-500">70% 警戒線</span>
          <span class="text-rose-500">100% 中毒上限</span>
        </div>
      </div>

      <!-- Status Banner -->
      <div class="mt-3 p-3 rounded-lg border text-sm font-bold flex items-center justify-between ${result.statusClass}">
        <div>${result.statusText}</div>
        ${result.totalPercent >= 100 ? `
          <button class="glove-btn bg-rose-600 text-white text-xs py-1.5 px-3 rounded font-black shadow" onclick="window.switchCrisis('last'); setActiveTab('crisis');">
            進入 LAST 搶救流程 ➔
          </button>
        ` : ''}
      </div>

      <!-- Remaining Safe Capacity -->
      ${result.totalPercent < 100 ? `
        <div class="mt-3 grid grid-cols-3 gap-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-center">
          <div>
            <div class="text-[11px] text-slate-400">尚可注射 1% Lidocaine</div>
            <div class="text-base font-extrabold text-emerald-400 mt-0.5">${result.remainingCapacity.lido1PercentMl} mL</div>
          </div>
          <div>
            <div class="text-[11px] text-slate-400">尚可注射 0.2% Ropivacaine</div>
            <div class="text-base font-extrabold text-cyan-400 mt-0.5">${result.remainingCapacity.ropi02PercentMl} mL</div>
          </div>
          <div>
            <div class="text-[11px] text-slate-400">尚可注射 0.5% Bupivacaine</div>
            <div class="text-base font-extrabold text-sky-400 mt-0.5">${result.remainingCapacity.bupi05PercentMl} mL</div>
          </div>
        </div>
      ` : ''}
    </div>

    <!-- Administered Drug List -->
    <div class="anes-card mb-4">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-bold text-slate-200">已給予之局麻藥物清單 (外科浸潤 + 神經阻滯)</h4>
        <button class="glove-btn bg-cyan-600 hover:bg-cyan-500 text-white text-xs py-1.5 px-3" onclick="window.showAddToxModal()">
          + 新增施打藥物
        </button>
      </div>

      <div class="space-y-2">
        ${result.breakdown.length === 0 ? `
          <div class="text-center py-6 text-slate-500 text-sm">目前尚未加入任何局部麻醉藥紀錄。</div>
        ` : result.breakdown.map((item, idx) => `
          <div class="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
            <div>
              <div class="font-bold text-slate-200 text-sm">${item.name}</div>
              <div class="text-xs text-slate-400">
                已給 ${item.volumeMl ? `${item.volumeMl} mL = ` : ''}${item.mgGiven} mg / 安全上限 ${item.safeMaxMg} mg
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="font-bold text-sm ${item.fractionPercent > 50 ? 'text-amber-400' : 'text-slate-300'}">
                佔上限 ${item.fractionPercent}%
              </span>
              <button class="text-rose-400 hover:text-rose-300 text-xs px-2 py-1 rounded bg-rose-950/40 border border-rose-800/40" onclick="window.removeToxItem(${idx})">
                刪除
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

window.toggleToxRisk = (checked) => {
  state.toxicityHighRisk = checked;
  renderToxicityTab();
};

window.removeToxItem = (idx) => {
  state.toxicityAdministered.splice(idx, 1);
  renderToxicityTab();
};

window.showAddToxModal = () => {
  const vol = prompt("請輸入施打劑量體積 (mL)，例如: 20", "20");
  if (!vol) return;
  const volNum = parseFloat(vol);
  if (isNaN(volNum) || volNum <= 0) return;

  const agentId = prompt("請選擇藥物序號 (1: 1% Lidocaine, 2: 1% Lido+Epi, 3: 0.2% Ropivacaine, 4: 0.5% Bupivacaine)", "3");
  let selectedAgent = "ropivacaine";
  let conc = 0.2;
  if (agentId === "1") { selectedAgent = "lidocaine_plain"; conc = 1.0; }
  else if (agentId === "2") { selectedAgent = "lidocaine_epi"; conc = 1.0; }
  else if (agentId === "4") { selectedAgent = "bupivacaine_plain"; conc = 0.5; }

  state.toxicityAdministered.push({
    id: Date.now(),
    agentId: selectedAgent,
    concPercent: conc,
    volumeMl: volNum,
    mg: volNum * conc * 10
  });

  renderToxicityTab();
};

// ==========================================
// 4. ASRA COAGULATION GUIDE RENDERER
// ==========================================
function renderAsraTab() {
  const container = document.getElementById("asra-container");
  if (!container) return;

  const drug = ASRA_DATABASE.find(d => d.id === state.asraSelectedDrugId) || ASRA_DATABASE[0];
  const isRenalImpaired = drug.crClThreshold && state.asraCrCl < drug.crClThreshold;
  const requiredWaitHours = isRenalImpaired ? drug.renalWarningWaitHours : drug.standardWaitHours;
  const hoursPassed = state.asraHoursSinceLastDose;
  const hoursRemaining = Math.max(0, requiredWaitHours - hoursPassed);

  let verdict = "SAFE";
  let verdictClass = "text-emerald-400 border-emerald-500/50 bg-emerald-950/40";
  let verdictText = "✅ 可安全進行神經軸阻滯穿刺 (Spinal / Epidural Safe)";

  if (requiredWaitHours === 0) {
    verdict = "SAFE";
  } else if (hoursRemaining > 0) {
    verdict = "UNSAFE";
    verdictClass = "text-rose-400 border-rose-500/50 bg-rose-950/50";
    verdictText = `❌ 距安全間隔尚差 ${hoursRemaining} 小時！嚴禁施打神經軸阻滯 (脊椎硬腦膜外血腫高危)`;
  }

  container.innerHTML = `
    <!-- ASRA & NYSORA Citation Header -->
    <div class="mb-3 p-2.5 rounded-lg bg-slate-900/40 border border-slate-800/80 flex items-center justify-between text-xs">
      <div class="flex items-center gap-2">
        <span class="text-base">🩸</span>
        <div>
          <span class="font-bold text-emerald-400">ASRA Pain Medicine 第五版抗凝血臨床指引</span>
          <span class="text-slate-400 ml-1.5 hidden sm:inline">參照 Regional Anesthesia in the Patient Receiving Antithrombotic Therapy</span>
        </div>
      </div>
      <span class="drug-badge bg-emerald-950 text-emerald-300 border border-emerald-800/50">ASRA 指引標準</span>
    </div>

    <!-- Top Selector Card -->
    <div class="anes-card mb-4 border-l-4 border-l-emerald-500">
      <h3 class="font-bold text-lg text-emerald-400 mb-3 flex items-center gap-2">
        <span>🩸</span> ASRA 抗凝血藥物與神經軸阻滯決策樹
      </h3>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label class="block text-xs text-slate-400 mb-1 font-semibold">選擇病患正在使用的抗凝/抗血小板藥</label>
          <select id="select-asra-drug" class="w-full glove-input text-sm" onchange="window.onAsraDrugChange(this.value)">
            ${ASRA_DATABASE.map(d => `
              <option value="${d.id}" ${d.id === state.asraSelectedDrugId ? 'selected' : ''}>
                ${d.name} (${d.category.split(' ')[0]})
              </option>
            `).join("")}
          </select>
        </div>

        <div>
          <label class="block text-xs text-slate-400 mb-1 font-semibold">最後一次服藥距今 (小時)</label>
          <input type="number" min="0" max="300" value="${state.asraHoursSinceLastDose}" class="w-full glove-input text-sm" oninput="window.onAsraHoursChange(this.value)">
          <div class="text-[11px] text-slate-500 mt-1 font-mono">約 ${(state.asraHoursSinceLastDose / 24).toFixed(1)} 天前</div>
        </div>

        <div>
          <label class="block text-xs text-slate-400 mb-1 font-semibold">腎功能 eGFR / CrCl (mL/min)</label>
          <input type="number" min="10" max="150" value="${state.asraCrCl}" class="w-full glove-input text-sm" oninput="window.onAsraCrClChange(this.value)">
          <div class="text-[11px] ${isRenalImpaired ? 'text-amber-400 font-bold' : 'text-slate-500'} mt-1">
            ${isRenalImpaired ? '⚠️ 腎功能不全，延長停藥等待時間' : '正常腎功能範圍'}
          </div>
        </div>
      </div>

      <!-- Verdict Banner -->
      <div class="p-4 rounded-xl border text-base font-black flex items-center justify-between ${verdictClass}">
        <div>${verdictText}</div>
        <div class="text-xs font-bold font-mono px-3 py-1 bg-slate-900/80 rounded border border-slate-700">
          指引建議停藥: ${requiredWaitHours} 小時
        </div>
      </div>
    </div>

    <!-- Detailed Guidelines & Catheter Recommendations -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="anes-card">
        <h4 class="font-bold text-slate-200 text-sm mb-2 flex items-center gap-1.5">
          <span>📌</span> ASRA 穿刺前停藥建議 (Pre-op Guidance)
        </h4>
        <p class="text-sm text-slate-300 leading-relaxed">${drug.recommendation}</p>
        <div class="mt-3 text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded border border-slate-800">
          <span class="text-slate-300 font-bold">備註說明：</span>${drug.notes}
        </div>
      </div>

      <div class="anes-card">
        <h4 class="font-bold text-slate-200 text-sm mb-2 flex items-center gap-1.5">
          <span>🩺</span> 硬脊膜外導管拔管與術後恢復 (Catheter & Resumption)
        </h4>
        <ul class="text-xs text-slate-300 space-y-2">
          <li class="p-2 rounded bg-slate-900/60 border border-slate-800">
            <span class="font-bold text-amber-300">導管拔除前需停藥：</span>
            ${drug.catheterRemovalWaitHours > 0 ? `距離上次給藥至少 ${drug.catheterRemovalWaitHours} 小時` : '無需特殊停藥'}
          </li>
          <li class="p-2 rounded bg-slate-900/60 border border-slate-800">
            <span class="font-bold text-cyan-300">拔管後重啟藥物等待：</span>
            ${drug.restartAfterRemovalHours > 0 ? `拔除導管後至少間隔 ${drug.restartAfterRemovalHours} 小時方可服藥` : '可直接重啟'}
          </li>
          <li class="p-2 rounded bg-slate-900/60 border border-slate-800 text-slate-400">
            <span class="font-bold text-rose-300">血腫警示：</span>若術後出現下肢進行性無力或麻木，需立即安排 MRI 並照會神經外科行減壓手術（黃金 8 小時）。
          </li>
        </ul>
      </div>
    </div>
  `;
}

window.onAsraDrugChange = (id) => {
  state.asraSelectedDrugId = id;
  renderAsraTab();
};

window.onAsraHoursChange = (val) => {
  state.asraHoursSinceLastDose = parseFloat(val) || 0;
  renderAsraTab();
};

window.onAsraCrClChange = (val) => {
  state.asraCrCl = parseFloat(val) || 60;
  renderAsraTab();
};

// ==========================================
// 5. INFUSION CALCULATOR & CUSTOM DRUG MANAGER
// ==========================================
function renderInfusionTab() {
  const container = document.getElementById("infusion-container");
  if (!container) return;

  const drugs = InfusionEngine.getDrugs();
  const drugKeys = Object.keys(drugs);
  if (!drugs[state.infusionDrugId]) {
    state.infusionDrugId = drugKeys[0] || "norepinephrine";
  }

  const drug = drugs[state.infusionDrugId];
  const preset = drug.presets[state.infusionPresetIdx] || drug.presets[0];
  const rateMlHr = InfusionEngine.doseToRate(
    state.infusionDrugId,
    state.infusionPresetIdx,
    state.infusionTargetDose,
    state.patient.weightKg
  );

  container.innerHTML = `
    <!-- Top Action Bar for Custom Drugs -->
    <div class="flex items-center justify-between mb-3">
      <div class="text-xs text-slate-400 flex items-center gap-1.5">
        <span>📖</span>
        <span>參照 Morgan & Mikhail 7e Ch. 14 / Goodman & Gilman 14e Ch. 13</span>
      </div>
      <div class="flex items-center gap-2">
        <button class="glove-btn bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-1.5 px-3" onclick="window.showAddCustomDrugModal()">
          + 自訂新增輸注藥物 / 泡法
        </button>
        ${drug.isCustom ? `
          <button class="glove-btn bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/60 text-xs py-1.5 px-2.5" onclick="window.deleteCurrentCustomDrug('${state.infusionDrugId}')">
            刪除此自訂藥
          </button>
        ` : ''}
      </div>
    </div>

    <div class="anes-card mb-4 border-l-4 border-l-sky-500">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-lg text-sky-400 flex items-center gap-2">
          <span>⏱️</span> 血管活性與鎮靜輸注幫浦調速器 (Infusion Calculator)
        </h3>
        ${drug.isCustom ? '<span class="drug-badge bg-emerald-950 text-emerald-300 border border-emerald-700">使用者自訂藥品</span>' : ''}
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label class="block text-xs text-slate-400 mb-1 font-semibold">選擇藥物</label>
          <select class="w-full glove-input text-sm" onchange="window.onInfusionDrugChange(this.value)">
            ${drugKeys.map(k => `
              <option value="${k}" ${k === state.infusionDrugId ? 'selected' : ''}>
                ${drugs[k].name} ${drugs[k].isCustom ? '(自訂)' : ''}
              </option>
            `).join("")}
          </select>
        </div>

        <div>
          <label class="block text-xs text-slate-400 mb-1 font-semibold">常用醫院稀釋泡法 (Concentration Preset)</label>
          <select class="w-full glove-input text-sm" onchange="window.onInfusionPresetChange(this.value)">
            ${drug.presets.map((p, idx) => `
              <option value="${idx}" ${idx === state.infusionPresetIdx ? 'selected' : ''}>
                ${p.label}
              </option>
            `).join("")}
          </select>
        </div>
      </div>

      ${drug.pearls ? `
        <div class="mb-3 p-2.5 rounded bg-slate-900/60 border border-slate-800 text-xs text-amber-300/90 leading-relaxed">
          <span class="font-bold text-amber-400">臨床重點 (M&M / G&G)：</span>${drug.pearls}
        </div>
      ` : ''}

      <!-- Target Dose Adjuster -->
      <div class="bg-slate-900/80 p-4 rounded-xl border border-slate-800 mb-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-bold text-slate-200">期望給藥劑量 (${drug.unit})</span>
          <div class="flex items-center gap-2">
            <input type="number" step="0.01" min="${drug.doseMin}" max="${drug.doseMax}" value="${state.infusionTargetDose}" class="glove-input text-center w-24 py-1 text-sky-300 font-black text-lg" oninput="window.onInfusionDoseChange(this.value)">
            <span class="text-xs text-slate-400 font-mono">${drug.unit}</span>
          </div>
        </div>
        <input type="range" min="${drug.doseMin}" max="${drug.doseMax}" step="0.01" value="${state.infusionTargetDose}" class="w-full glove-slider cursor-pointer" oninput="window.onInfusionDoseChange(this.value)">
        <div class="flex justify-between text-[11px] text-slate-500 mt-1 font-mono">
          <span>最低: ${drug.doseMin}</span>
          <span>常用範圍</span>
          <span>最高: ${drug.doseMax}</span>
        </div>
      </div>

      <!-- Output Pump Rate -->
      <div class="p-4 rounded-xl bg-gradient-to-r from-sky-950/60 to-blue-950/60 border border-sky-800/60 flex items-center justify-between">
        <div>
          <div class="text-xs font-bold text-sky-300 uppercase tracking-wide">注射幫浦設定流速 (Syringe Pump Rate)</div>
          <div class="text-4xl font-black text-white mt-1">
            ${rateMlHr} <span class="text-xl text-sky-400 font-normal">mL/hr</span>
          </div>
          <div class="text-xs text-slate-400 mt-1">
            基準體重: ${state.patient.weightKg} kg &bull; 濃度: ${preset.concMcgMl} mcg/mL
          </div>
        </div>

        <div class="text-right">
          <span class="drug-badge bg-sky-900/80 text-sky-200 border border-sky-600">
            精確雙向算式
          </span>
        </div>
      </div>
    </div>
  `;
}

window.onInfusionDrugChange = (id) => {
  state.infusionDrugId = id;
  state.infusionPresetIdx = 0;
  const drugs = InfusionEngine.getDrugs();
  const drug = drugs[id] || drugs.norepinephrine;
  state.infusionTargetDose = (drug.doseMin + drug.doseMax) / 4;
  renderInfusionTab();
};

window.onInfusionPresetChange = (idx) => {
  state.infusionPresetIdx = parseInt(idx, 10);
  renderInfusionTab();
};

window.onInfusionDoseChange = (val) => {
  state.infusionTargetDose = parseFloat(val) || 0.01;
  renderInfusionTab();
};

window.showAddCustomDrugModal = () => {
  const name = prompt("請輸入自訂藥物名稱 (例如: Vasopressin 升壓 / precedex 稀釋液):");
  if (!name) return;

  const unit = prompt("給藥單位 (mcg/kg/min / mcg/kg/hr / mg/kg/hr / mg/hr / Units/min)", "mcg/kg/min");
  if (!unit) return;

  const concStr = prompt("稀釋後濃度 (mcg/mL，例如 4mg in 50mL 請輸入 80):", "80");
  const conc = parseFloat(concStr) || 80;

  const doseMinStr = prompt("最低建議劑量 (例如 0.01):", "0.01");
  const doseMaxStr = prompt("最高建議劑量 (例如 1.0):", "1.0");

  const customId = "custom_" + Date.now();
  const newDrug = {
    name: name,
    unit: unit,
    isWeightBased: unit.includes("/kg"),
    doseMin: parseFloat(doseMinStr) || 0.01,
    doseMax: parseFloat(doseMaxStr) || 1.0,
    reference: "使用者自訂醫院常規配置 (Hospital Custom Recipe)",
    pearls: "院內自訂輸注品項，儲存於手機/電腦本地瀏覽器",
    presets: [
      { label: `自訂配方 (${conc} mcg/mL)`, totalDrugMg: 1, totalVolMl: 50, concMcgMl: conc }
    ]
  };

  InfusionEngine.saveCustomDrug(customId, newDrug);
  cloudSync.pushCustomDrugs(InfusionEngine.getDrugs());
  state.infusionDrugId = customId;
  state.infusionPresetIdx = 0;
  state.infusionTargetDose = newDrug.doseMin;
  renderInfusionTab();
  alert("自訂藥物儲存成功！已同步至雲端與本機。");
};

window.deleteCurrentCustomDrug = (id) => {
  if (confirm("確定要刪除此自訂藥物品項嗎？")) {
    InfusionEngine.deleteCustomDrug(id);
    cloudSync.pushCustomDrugs(InfusionEngine.getDrugs());
    state.infusionDrugId = "norepinephrine";
    state.infusionPresetIdx = 0;
    renderInfusionTab();
  }
};

// ==========================================
// 6. PRE-OP SCORES RENDERER
// ==========================================
function renderScoresTab() {
  const container = document.getElementById("scores-container");
  if (!container) return;

  const stopBang = ScoresEngine.calculateStopBang(state.stopBangAnswers);
  const apfel = ScoresEngine.calculateApfel(state.apfelFemale, state.apfelNonSmoker, state.apfelHistory, state.apfelOpioids);
  const rcri = ScoresEngine.calculateRcri(state.rcriCriteria);

  const stopBangLabels = [
    "S - Snoring (大聲打鼾，隔著房門可聽到)",
    "T - Tired (白天容易疲累、瞌睡或嗜睡)",
    "O - Observed (睡眠中曾被目睹呼吸停止)",
    "P - Pressure (患有高血壓或服用降壓藥)",
    "B - BMI > 35 kg/m²",
    "A - Age > 50 歲",
    "N - Neck 頸圍 > 40 cm (16吋)",
    "G - Gender 男性 (Male)"
  ];

  const rcriLabels = [
    "1. 執行高風險手術 (開胸、開腹、主動脈或重大周邊血管)",
    "2. 缺血性心臟病史 (心肌梗塞、心絞痛、CABG / PCI 支架)",
    "3. 充血性心臟衰竭病史 (CHF / 肺水腫)",
    "4. 腦血管疾病病史 (中風 Stroke 或短暫性腦缺血 TIA)",
    "5. 術前正接受胰島素治療之糖尿病",
    "6. 術前抽血肌酸酐 Serum Creatinine > 2.0 mg/dL"
  ];

  container.innerHTML = `
    <!-- Apfel PONV Score -->
    <div class="anes-card mb-4 border-l-4 border-l-purple-500">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-lg text-purple-400 flex items-center gap-2">
          <span>🤢</span> Apfel 術後噁心嘔吐量表 (PONV Risk Score)
        </h3>
        <span class="text-xl font-black text-purple-300">得分: ${apfel.score} / 4</span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        <label class="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-2 cursor-pointer">
          <input type="checkbox" ${state.apfelFemale ? 'checked' : ''} onchange="window.toggleApfel('female', this.checked)" class="w-4 h-4 accent-purple-500">
          <span class="text-xs text-slate-200">女性 (Female)</span>
        </label>
        <label class="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-2 cursor-pointer">
          <input type="checkbox" ${state.apfelNonSmoker ? 'checked' : ''} onchange="window.toggleApfel('nonSmoker', this.checked)" class="w-4 h-4 accent-purple-500">
          <span class="text-xs text-slate-200">不吸菸者 (Non-smoker)</span>
        </label>
        <label class="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-2 cursor-pointer">
          <input type="checkbox" ${state.apfelHistory ? 'checked' : ''} onchange="window.toggleApfel('history', this.checked)" class="w-4 h-4 accent-purple-500">
          <span class="text-xs text-slate-200">PONV 或暈車病史</span>
        </label>
        <label class="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-2 cursor-pointer">
          <input type="checkbox" ${state.apfelOpioids ? 'checked' : ''} onchange="window.toggleApfel('opioids', this.checked)" class="w-4 h-4 accent-purple-500">
          <span class="text-xs text-slate-200">預期術後使用鴉片類</span>
        </label>
      </div>

      <div class="p-3 rounded-lg border ${apfel.badgeClass}">
        <div class="flex items-center justify-between mb-1">
          <span class="font-bold text-sm">術後噁心嘔吐預估發生率：約 ${apfel.riskPercent}%</span>
          <span class="text-xs font-mono font-bold uppercase">指引處置</span>
        </div>
        <div class="text-xs leading-relaxed whitespace-pre-line">${apfel.strategy}</div>
      </div>
    </div>

    <!-- STOP-Bang OSA Score -->
    <div class="anes-card mb-4 border-l-4 border-l-amber-500">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-lg text-amber-400 flex items-center gap-2">
          <span>😴</span> STOP-Bang 睡眠呼吸中止症快速篩檢
        </h3>
        <span class="text-xl font-black text-amber-300">得分: ${stopBang.score} / 8</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        ${stopBangLabels.map((lbl, idx) => `
          <label class="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-2 cursor-pointer">
            <input type="checkbox" ${state.stopBangAnswers[idx] ? 'checked' : ''} onchange="window.toggleStopBang(${idx}, this.checked)" class="w-4 h-4 accent-amber-500">
            <span class="text-xs text-slate-200">${lbl}</span>
          </label>
        `).join("")}
      </div>

      <div class="p-3 rounded-lg border ${stopBang.badgeClass}">
        <div class="font-bold text-sm mb-1">${stopBang.riskLevel}</div>
        <div class="text-xs leading-relaxed">${stopBang.recommendation}</div>
      </div>
    </div>

    <!-- RCRI Cardiac Risk -->
    <div class="anes-card border-l-4 border-l-rose-500">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-lg text-rose-400 flex items-center gap-2">
          <span>🫀</span> RCRI (Lee's Index) 心血管風險評估
        </h3>
        <span class="text-xl font-black text-rose-300">得分: ${rcri.score} / 6</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        ${rcriLabels.map((lbl, idx) => `
          <label class="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-2 cursor-pointer">
            <input type="checkbox" ${state.rcriCriteria[idx] ? 'checked' : ''} onchange="window.toggleRcri(${idx}, this.checked)" class="w-4 h-4 accent-rose-500">
            <span class="text-xs text-slate-200">${lbl}</span>
          </label>
        `).join("")}
      </div>

      <div class="p-3 rounded-lg border ${rcri.badgeClass}">
        <div class="font-bold text-sm mb-1">主要心臟不良事件 (MACE) 發生率：${rcri.cardiacEventRisk}</div>
        <div class="text-xs leading-relaxed">${rcri.recommendation}</div>
      </div>
    </div>
  `;
}

window.toggleApfel = (key, checked) => {
  if (key === 'female') state.apfelFemale = checked;
  if (key === 'nonSmoker') state.apfelNonSmoker = checked;
  if (key === 'history') state.apfelHistory = checked;
  if (key === 'opioids') state.apfelOpioids = checked;
  renderScoresTab();
};

window.toggleStopBang = (idx, checked) => {
  state.stopBangAnswers[idx] = checked;
  renderScoresTab();
};

window.toggleRcri = (idx, checked) => {
  state.rcriCriteria[idx] = checked;
  renderScoresTab();
};

// ==========================================
// 7. ANES LOGBOOK, SBAR & DATA BACKUP CENTER
// ==========================================
function renderLogbookTab() {
  const container = document.getElementById("logbook-container");
  if (!container) return;

  container.innerHTML = `
    <!-- Data Persistence & Cloud Sync Center -->
    <div class="anes-card mb-4 border-l-4 border-l-emerald-500">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <div>
          <h3 class="font-bold text-lg text-emerald-400 flex items-center gap-2">
            <span>💾</span> 資料儲存、備份與雲端同步中心
          </h3>
          <div class="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
            <span id="cloud-sync-status-badge">
              ${cloudSync.currentUser ? `<span class="text-emerald-400 font-bold">🟢 Google 雲端同步 (${cloudSync.lastSyncTime || '已同步'})</span>` : '<span class="text-slate-400 font-bold">⚪ 本機離線模式 (LocalStorage)</span>'}
            </span>
            <span>&bull; 關閉瀏覽器資料自動保留</span>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <button class="glove-btn bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs py-1 px-2.5" onclick="window.exportJsonBackup()">
            📥 匯出 JSON 備份檔
          </button>
          <button class="glove-btn bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs py-1 px-2.5" onclick="document.getElementById('file-import-json').click()">
            📤 匯入還原
          </button>
          <input type="file" id="file-import-json" accept=".json" class="hidden" onchange="window.importJsonBackup(event)">
          <button class="glove-btn bg-emerald-700 hover:bg-emerald-600 text-white text-xs py-1 px-2.5" onclick="window.exportCsvBackup()">
            📊 匯出 Excel (CSV)
          </button>
        </div>
      </div>

      <!-- Cloud Sync Explanation & Action Controls -->
      <div class="mt-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="text-xs text-slate-300">
          <div class="flex items-center gap-1.5 font-bold text-cyan-300 mb-0.5">
            <span>☁️ Google 帳號跨裝置即時同步：</span>
            ${cloudSync.currentUser ? `<span class="text-emerald-400">已連結 ${cloudSync.currentUser.email}</span>` : '<span class="text-slate-400">未登入</span>'}
          </div>
          <div class="text-slate-400">
            登入同一個 Google 帳號，手機、平板、開刀房電腦 0 秒雙向同步；無訊號時本機暫存，聯網自動背景補傳。
          </div>
        </div>
        <div class="flex items-center gap-2 self-end sm:self-center">
          ${cloudSync.currentUser ? `
            <button class="glove-btn bg-cyan-700/80 hover:bg-cyan-600 text-white text-xs py-1 px-2.5 whitespace-nowrap" onclick="window.syncNowManual()">
              🔄 立即同步
            </button>
            <button class="glove-btn bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-1 px-2" onclick="window.handleGoogleLogout()">
              登出
            </button>
          ` : `
            <button class="glove-btn bg-white text-slate-800 hover:bg-slate-100 text-xs py-1 px-2.5 font-bold shadow-sm flex items-center gap-1.5 whitespace-nowrap" onclick="window.handleGoogleLogin()">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
              <span>立即登入 Google</span>
            </button>
          `}
          <button class="glove-btn bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs py-1 px-2" title="設定 Firebase 專屬金鑰" onclick="window.showFirebaseConfigModal()">
            ⚙️ 設定
          </button>
        </div>
      </div>
    </div>

    <!-- SBAR Handover Quick Generator -->
    <div class="anes-card mb-4 border-l-4 border-l-cyan-500">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-bold text-lg text-cyan-400 flex items-center gap-2">
          <span>🤝</span> SBAR 手術中麻醉交接班快查 (Relief Handover)
        </h3>
        <button class="glove-btn bg-cyan-600 text-white text-xs py-1.5 px-3" onclick="window.copySbarTemplate()">
          📋 複製 SBAR 交班文本
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mt-3">
        <div class="bg-slate-900/70 p-3 rounded-lg border border-slate-800">
          <div class="font-bold text-cyan-300 mb-1">S - Situation (情境)</div>
          <div class="text-slate-400">目前術式進度、主刀醫師、預計剩餘時間、緊急狀況摘要。</div>
        </div>
        <div class="bg-slate-900/70 p-3 rounded-lg border border-slate-800">
          <div class="font-bold text-cyan-300 mb-1">B - Background (背景)</div>
          <div class="text-slate-400">年齡體重、ASA分級、過敏史、抗凝劑停藥、困難呼吸道史。</div>
        </div>
        <div class="bg-slate-900/70 p-3 rounded-lg border border-slate-800">
          <div class="font-bold text-cyan-300 mb-1">A - Assessment (評估)</div>
          <div class="text-slate-400">A-line/CVC、目前血壓心律、升壓劑劑量、失血量(EBL)、給水及尿量。</div>
        </div>
        <div class="bg-slate-900/70 p-3 rounded-lg border border-slate-800">
          <div class="font-bold text-cyan-300 mb-1">R - Recommendation (交班建議)</div>
          <div class="text-slate-400">肌鬆劑追加時間、預計拔管計畫或送 ICU、術後止痛 (PCA/Block)。</div>
        </div>
      </div>
    </div>

    <!-- Anonymous Case Logger -->
    <div class="anes-card">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-lg text-slate-200 flex items-center gap-2">
          <span>📓</span> 匿名化手術麻醉快速日誌 (Personal AnesLog)
        </h3>
        <div class="flex items-center gap-2">
          <button class="glove-btn bg-emerald-600 text-white text-xs py-1.5 px-3" onclick="window.addCaseModal()">
            + 記錄新病例
          </button>
          ${state.cases.length > 0 ? `
            <button class="text-slate-500 hover:text-rose-400 text-xs px-2 py-1" onclick="window.clearAllCases()">
              清空全部
            </button>
          ` : ''}
        </div>
      </div>

      <div class="space-y-2">
        ${state.cases.length === 0 ? `
          <div class="text-center py-8 text-slate-500 text-sm">尚未有任何記錄。點擊右上角新增您的第一筆麻醉病例！</div>
        ` : state.cases.map((c, idx) => `
          <div class="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-bold text-slate-100 text-sm">${c.procedure}</span>
                <span class="drug-badge bg-slate-800 text-cyan-300 border border-slate-700">${c.anesType}</span>
                ${c.isDifficultAirway ? '<span class="drug-badge bg-rose-950 text-rose-300 border border-rose-800">難插管</span>' : ''}
              </div>
              <div class="text-xs text-slate-400 mt-1">
                ${c.date} &bull; ${c.weight}kg &bull; 插管管徑 ${c.ettSize} &bull; 特殊處置: ${c.lines || '無'}
              </div>
              ${c.note ? `<div class="text-xs text-slate-500 mt-0.5">備註: ${c.note}</div>` : ''}
            </div>
            <button class="text-slate-500 hover:text-rose-400 text-xs p-1" onclick="window.deleteCase(${idx})">✕</button>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

window.copySbarTemplate = () => {
  const p = state.patient;
  const sbarText = `【手術室麻醉交班紀錄 SBAR】\n` +
    `S: 術式執行中，目前生命徵象穩定。\n` +
    `B: 病患 ${p.ageYears}歲, ${p.weightKg}kg, ${p.isFemale ? '女' : '男'}.\n` +
    `A: ETT管徑/深度正常，氣道通暢；已建立周邊或動脈導管監測。\n` +
    `R: 注意肌鬆維持劑量，術後評估拔管或送恢復室/加護病房。`;

  navigator.clipboard.writeText(sbarText).then(() => {
    alert("SBAR 交班文字已成功複製至剪貼簿！");
  }).catch(() => {
    prompt("請複製以下交班內容：", sbarText);
  });
};

window.addCaseModal = () => {
  const proc = prompt("請輸入手術術式名稱 (例如: Laparoscopic Cholecystectomy)", "腹腔鏡膽囊切除術");
  if (!proc) return;

  const anesType = prompt("麻醉方式 (GA-ETT / GA-LMA / Spinal / Epidural / Nerve Block)", "GA-ETT");
  const lines = prompt("管路或特殊處置 (A-line, CVC, Ultrasound block)", "A-line, PNB");
  const note = prompt("備註 (非必填)", "順利");

  const newCase = {
    id: Date.now(),
    date: new Date().toLocaleDateString(),
    procedure: proc,
    anesType: anesType || "GA-ETT",
    weight: state.patient.weightKg,
    ettSize: state.patient.isPediatric ? "4.0" : (state.patient.isFemale ? "7.0" : "7.5"),
    lines: lines || "",
    isDifficultAirway: false,
    note: note || ""
  };

  state.cases.unshift(newCase);
  localStorage.setItem("anes_cases", JSON.stringify(state.cases));
  cloudSync.pushCases(state.cases);
  renderLogbookTab();
};

window.deleteCase = (idx) => {
  if (confirm("確定刪除此筆病例記錄？")) {
    state.cases.splice(idx, 1);
    localStorage.setItem("anes_cases", JSON.stringify(state.cases));
    cloudSync.pushCases(state.cases);
    renderLogbookTab();
  }
};

window.clearAllCases = () => {
  if (confirm("⚠️ 警告：這將會清除全部的病例紀錄！確定清空嗎？")) {
    state.cases = [];
    localStorage.removeItem("anes_cases");
    cloudSync.pushCases([]);
    renderLogbookTab();
  }
};

// Backup: Export JSON
window.exportJsonBackup = () => {
  const data = {
    appName: "AnesPilot",
    exportDate: new Date().toISOString(),
    cases: state.cases,
    customDrugs: JSON.parse(localStorage.getItem("anes_custom_infusion_drugs") || "{}")
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `anes_pilot_backup_${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// Backup: Import JSON
window.importJsonBackup = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported.cases && Array.isArray(imported.cases)) {
        state.cases = imported.cases;
        localStorage.setItem("anes_cases", JSON.stringify(state.cases));
        cloudSync.pushCases(state.cases);
      }
      if (imported.customDrugs) {
        localStorage.setItem("anes_custom_infusion_drugs", JSON.stringify(imported.customDrugs));
        cloudSync.pushCustomDrugs(imported.customDrugs);
      }
      alert("✅ 備份檔匯入還原成功！");
      renderLogbookTab();
    } catch (err) {
      alert("❌ 備份檔解析失敗，請確認是否為正確的 JSON 備份檔。");
    }
  };
  reader.readAsText(file);
};

// Backup: Export CSV
window.exportCsvBackup = () => {
  if (state.cases.length === 0) {
    alert("目前尚無病例紀錄可供匯出。");
    return;
  }

  // BOM for Excel UTF-8
  let csv = "\uFEFF日期,術式名稱,麻醉方式,病患體重(kg),管徑(ETT),特殊處置,備註\n";
  state.cases.forEach(c => {
    const row = [
      `"${c.date}"`,
      `"${c.procedure}"`,
      `"${c.anesType}"`,
      `"${c.weight}"`,
      `"${c.ettSize}"`,
      `"${c.lines}"`,
      `"${c.note}"`
    ];
    csv += row.join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `anes_cases_${dateStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// Cloud Sync Explanation Modal
window.showCloudSyncInfo = () => {
  alert(
    "【AnesPilot 雲端同步串接說明】\n\n" +
    "1. 目前模式：本地安全儲存（LocalStorage），紀錄完全保存在您自己的手機或電腦內，不用擔心病患個資或醫療紀錄上傳公網。\n\n" +
    "2. Google 帳號同步方案：透過 Google Firebase 免費提供 Google OAuth 與 Firestore 即時同步。換手機、平板或用開刀房電腦登入同一 Google 帳號，即可 0 秒自動抓回全部病例與自訂藥物！\n\n" +
    "3. 離線無網路防護：開刀房無訊號時，完全於本機正常操作；一旦偵測到連線，將自動背景補傳。"
  );
};

// --- Google Auth & Cloud Sync Handlers ---
window.handleGoogleLogin = async () => {
  try {
    const user = await cloudSync.loginWithGoogle();
    if (user) {
      alert(`✅ 登入成功！已連結至 ${user.displayName || user.email}，雲端資料已自動雙向同步。`);
    }
  } catch (err) {
    console.error("Google login attempt error:", err);
    if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
      return;
    }
    const shouldConfig = confirm(
      `Google 登入連線提示：\n${err.message || err}\n\n是否開啟 Firebase 金鑰設定視窗以貼入您的專案配置？`
    );
    if (shouldConfig) {
      window.showFirebaseConfigModal();
    }
  }
};

window.handleGoogleLogout = async () => {
  if (confirm("確定要登出 Google 帳號嗎？\n登出後資料仍會完整保留在本機，但將暫停跨裝置雲端同步。")) {
    await cloudSync.logout();
    alert("已登出 Google 帳號，系統已切換回本機安全模式。");
    renderLogbookTab();
  }
};

window.syncNowManual = async () => {
  if (!cloudSync.currentUser) {
    alert("請先登入 Google 帳號才能進行雲端同步。");
    return;
  }
  const res = await cloudSync.pullAndMerge();
  if (res) {
    state.cases = JSON.parse(localStorage.getItem("anes_cases") || "[]");
    renderLogbookTab();
    alert(`✅ 雲端同步完成！已雙向同步至最新狀態（目前共有 ${state.cases.length} 筆病例）。`);
  } else {
    alert("⚠️ 同步未成功，請確認網路連線或稍後再試。");
  }
};

window.showUserMenu = () => {
  if (!cloudSync.currentUser) {
    window.handleGoogleLogin();
    return;
  }
  const email = cloudSync.currentUser.email || "";
  const name = cloudSync.currentUser.displayName || "醫師";
  const syncTime = cloudSync.lastSyncTime || "剛剛";

  const action = prompt(
    `【Google 帳號中心】\n使用者：${name} (${email})\n最後同步時間：${syncTime}\n\n請輸入欲執行的操作編號：\n1. 立即手動同步 (Sync Now)\n2. 設定 Firebase 專屬金鑰\n3. 登出 Google 帳號\n(輸入其他或取消以關閉)`,
    "1"
  );

  if (action === "1") {
    window.syncNowManual();
  } else if (action === "2") {
    window.showFirebaseConfigModal();
  } else if (action === "3") {
    window.handleGoogleLogout();
  }
};

function extractFirebaseConfig(input) {
  const text = input.trim();
  try {
    return JSON.parse(text);
  } catch (e) {}

  const fields = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"];
  const result = {};
  for (const field of fields) {
    const regex = new RegExp("['\"]?" + field + "['\"]?\\s*:\\s*['\"]([^'\"]+)['\"]");
    const match = text.match(regex);
    if (match) {
      result[field] = match[1];
    }
  }

  if (result.apiKey && result.projectId) {
    return result;
  }
  throw new Error("無法從內容中解析出 apiKey 與 projectId，請確認是否有複製完整的配置內容。");
}

window.showFirebaseConfigModal = () => {
  const currentConfig = cloudSync.getConfig();
  const currentStr = JSON.stringify(currentConfig, null, 2);
  const input = prompt(
    "【Firebase 專屬雲端金鑰設定】\n" +
    "請貼入您在 Firebase Console 建立的 Web 應用程式配置：\n" +
    "(支援直接貼入 const firebaseConfig = { ... } 或標準 JSON 格式；若清空送出則恢復為預設範本)",
    currentStr
  );
  if (input === null) return;
  try {
    if (!input.trim()) {
      localStorage.removeItem("anes_firebase_config");
      alert("已重設為系統預設 Firebase 範本設定。");
      cloudSync.init();
      renderLogbookTab();
      return;
    }
    const configObj = extractFirebaseConfig(input);
    cloudSync.saveConfig(configObj);
    alert(`✅ Firebase 專案 [${configObj.projectId}] 設定已儲存成功！正在連線...`);
    renderLogbookTab();
  } catch (e) {
    alert("❌ 設定解析失敗：\n" + e.message);
  }
};
