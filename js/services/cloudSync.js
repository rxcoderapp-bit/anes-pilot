/**
 * AnesPilot - Cloud Sync & Google Auth Service
 * Powered by Google Firebase (v10 Modular SDK)
 * Supports Offline-First data synchronization across phones, tablets, and PCs.
 */

// Default Firebase Template Config (Can be customized by user via UI)
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDemo-AnesPilot-KeyPlaceholder",
  authDomain: "anes-pilot-demo.firebaseapp.com",
  projectId: "anes-pilot-demo",
  storageBucket: "anes-pilot-demo.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

class CloudSyncService {
  constructor() {
    this.app = null;
    this.auth = null;
    this.db = null;
    this.currentUser = null;
    this.syncStatus = "offline"; // 'offline', 'connected', 'syncing', 'error'
    this.authListeners = [];
    this.syncListeners = [];
    this.lastSyncTime = localStorage.getItem("anes_last_sync_time") || null;
  }

  getConfig() {
    try {
      const custom = localStorage.getItem("anes_firebase_config");
      if (custom) return JSON.parse(custom);
    } catch (e) {}
    return DEFAULT_FIREBASE_CONFIG;
  }

  saveConfig(config) {
    localStorage.setItem("anes_firebase_config", JSON.stringify(config));
    // Re-initialize
    this.app = null;
    this.auth = null;
    this.db = null;
    return this.init();
  }

  async init() {
    try {
      if (!navigator.onLine) {
        this.setSyncStatus("offline");
        return false;
      }

      // Dynamically load Firebase modules to preserve 100% offline capability
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
      const { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
      const { getFirestore, doc, getDoc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");

      this.firebaseModules = {
        GoogleAuthProvider,
        signInWithPopup,
        signOut,
        doc,
        getDoc,
        setDoc,
        serverTimestamp
      };

      const config = this.getConfig();
      this.app = initializeApp(config);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);

      onAuthStateChanged(this.auth, async (user) => {
        this.currentUser = user;
        if (user) {
          this.setSyncStatus("connected");
          this.notifyAuthListeners(user);
          // Auto sync on login
          await this.pullAndMerge();
        } else {
          this.setSyncStatus("offline");
          this.notifyAuthListeners(null);
        }
      });

      return true;
    } catch (err) {
      console.warn("[CloudSync] Firebase initialization in local mode:", err);
      this.setSyncStatus("offline");
      return false;
    }
  }

  async loginWithGoogle() {
    if (!this.auth) {
      const initialized = await this.init();
      if (!initialized || !this.auth) {
        throw new Error("請先設定您的 Firebase 金鑰（或確認網路已連線）。");
      }
    }

    const { GoogleAuthProvider, signInWithPopup } = this.firebaseModules;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    try {
      this.setSyncStatus("syncing");
      const result = await signInWithPopup(this.auth, provider);
      this.currentUser = result.user;
      this.setSyncStatus("connected");
      this.notifyAuthListeners(this.currentUser);
      await this.pullAndMerge();
      return result.user;
    } catch (error) {
      this.setSyncStatus("error");
      console.error("Google Login Error:", error);
      throw error;
    }
  }

  async logout() {
    if (this.auth && this.firebaseModules?.signOut) {
      await this.firebaseModules.signOut(this.auth);
    }
    this.currentUser = null;
    this.setSyncStatus("offline");
    this.notifyAuthListeners(null);
  }

  async pullAndMerge() {
    if (!this.currentUser || !this.db) return null;

    try {
      this.setSyncStatus("syncing");
      const { doc, getDoc, setDoc } = this.firebaseModules;
      const userRef = doc(this.db, "users", this.currentUser.uid);
      const snapshot = await getDoc(userRef);

      let localCases = JSON.parse(localStorage.getItem("anes_cases") || "[]");
      let localDrugs = JSON.parse(localStorage.getItem("anes_custom_infusion_drugs") || "{}");

      if (snapshot.exists()) {
        const cloudData = snapshot.data();
        const cloudCases = cloudData.cases || [];
        const cloudDrugs = cloudData.customDrugs || {};

        // Smart merge cases by ID
        const caseMap = new Map();
        cloudCases.forEach(c => caseMap.set(c.id, c));
        localCases.forEach(c => caseMap.set(c.id, c)); // Local overrides/merges
        const mergedCases = Array.from(caseMap.values()).sort((a, b) => (b.id || 0) - (a.id || 0));

        // Smart merge custom drugs
        const mergedDrugs = { ...cloudDrugs, ...localDrugs };

        localStorage.setItem("anes_cases", JSON.stringify(mergedCases));
        localStorage.setItem("anes_custom_infusion_drugs", JSON.stringify(mergedDrugs));

        // Push unified state back to cloud
        await setDoc(userRef, {
          email: this.currentUser.email,
          displayName: this.currentUser.displayName,
          photoURL: this.currentUser.photoURL,
          cases: mergedCases,
          customDrugs: mergedDrugs,
          lastSyncAt: new Date().toISOString()
        }, { merge: true });

        this.lastSyncTime = new Date().toLocaleTimeString();
        localStorage.setItem("anes_last_sync_time", this.lastSyncTime);
        this.setSyncStatus("connected");

        return { cases: mergedCases, customDrugs: mergedDrugs };
      } else {
        // First time cloud sync: push all local data to cloud
        await setDoc(userRef, {
          email: this.currentUser.email,
          displayName: this.currentUser.displayName,
          photoURL: this.currentUser.photoURL,
          cases: localCases,
          customDrugs: localDrugs,
          lastSyncAt: new Date().toISOString()
        });

        this.lastSyncTime = new Date().toLocaleTimeString();
        localStorage.setItem("anes_last_sync_time", this.lastSyncTime);
        this.setSyncStatus("connected");
        return { cases: localCases, customDrugs: localDrugs };
      }
    } catch (e) {
      console.error("[CloudSync] Pull and merge error:", e);
      this.setSyncStatus("error");
      return null;
    }
  }

  async pushCases(cases) {
    if (!this.currentUser || !this.db) return;
    try {
      this.setSyncStatus("syncing");
      const { doc, setDoc } = this.firebaseModules;
      const userRef = doc(this.db, "users", this.currentUser.uid);
      await setDoc(userRef, {
        cases: cases,
        lastSyncAt: new Date().toISOString()
      }, { merge: true });

      this.lastSyncTime = new Date().toLocaleTimeString();
      localStorage.setItem("anes_last_sync_time", this.lastSyncTime);
      this.setSyncStatus("connected");
    } catch (e) {
      console.warn("[CloudSync] pushCases error:", e);
      this.setSyncStatus("error");
    }
  }

  async pushCustomDrugs(drugs) {
    if (!this.currentUser || !this.db) return;
    try {
      this.setSyncStatus("syncing");
      const { doc, setDoc } = this.firebaseModules;
      const userRef = doc(this.db, "users", this.currentUser.uid);
      await setDoc(userRef, {
        customDrugs: drugs,
        lastSyncAt: new Date().toISOString()
      }, { merge: true });

      this.lastSyncTime = new Date().toLocaleTimeString();
      localStorage.setItem("anes_last_sync_time", this.lastSyncTime);
      this.setSyncStatus("connected");
    } catch (e) {
      console.warn("[CloudSync] pushCustomDrugs error:", e);
      this.setSyncStatus("error");
    }
  }

  setSyncStatus(status) {
    this.syncStatus = status;
    this.syncListeners.forEach(fn => fn(status, this.lastSyncTime));
  }

  onAuthChange(callback) {
    this.authListeners.push(callback);
    if (this.currentUser) callback(this.currentUser);
  }

  onSyncChange(callback) {
    this.syncListeners.push(callback);
    callback(this.syncStatus, this.lastSyncTime);
  }

  notifyAuthListeners(user) {
    this.authListeners.forEach(fn => fn(user));
  }
}

export const cloudSync = new CloudSyncService();
