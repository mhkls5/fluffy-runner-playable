/**
 * ふわふわランナー — YouTube Playables 対応ミニランナー
 * 中毒性ループ: コンボ / フィーバー / アイテム / スキン / 永久アップグレード
 * 依存なし / 外部アセットなし
 */
(function () {
  "use strict";

  // ---------- 保存データ ----------
  const Playables = {
    ready: false,
    audioEnabled: true,
    paused: false,
    bestScore: 0,
    totalCoins: 0,
    runs: 0,
    skin: 0,
    upJump: 0, // 0-3 追加ジャンプ力
    upCoin: 0, // 0-3 コイン価値
    upStart: 0, // 0-3 開始ブースト
    owned: [true, false, false, false, false],
    missionDate: "",
    missionProgress: { coins: 0, bestRunScore: 0, maxCombo: 0, near: 0, runs: 0, fever: 0, smash: 0 },
    missionClaimed: [false, false, false],
    lang: "ja", // ja | en
    mutedLocal: false, // 画面ミュート（SDK と AND）
    loginDate: "",
    loginStreak: 0,
    loginDay: 0, // 1-7 今日の連続日数（未受取なら0）
    loginPending: false, // 今日のログインボーナス未受取
    todayBestDate: "",
    todayBest: 0,
    yesterdayBest: 0,
    topScores: [], // 最大5件
    badges: {}, // id -> true
    ownedEquip: { hat: [true, false, false, false], trail: [true, false, false], charm: [true, false, false, false] },
    equipHat: 0,
    equipTrail: 0,
    equipCharm: 0,
    lifetimeCoins: 0,
    ghost: null, // { score, samples: [{d,y}] }
    savedLoaded: false,

    _lsKey: "fluffy-runner-save-v1",

    snapshot() {
      return {
        bestScore: this.bestScore,
        totalCoins: this.totalCoins,
        runs: this.runs,
        skin: this.skin,
        upJump: this.upJump,
        upCoin: this.upCoin,
        upStart: this.upStart,
        owned: this.owned,
        missionDate: this.missionDate,
        missionProgress: this.missionProgress,
        missionClaimed: this.missionClaimed,
        lang: this.lang,
        mutedLocal: this.mutedLocal,
        loginDate: this.loginDate,
        loginStreak: this.loginStreak,
        todayBestDate: this.todayBestDate,
        todayBest: this.todayBest,
        yesterdayBest: this.yesterdayBest,
        topScores: this.topScores,
        badges: this.badges,
        ownedEquip: this.ownedEquip,
        equipHat: this.equipHat,
        equipTrail: this.equipTrail,
        equipCharm: this.equipCharm,
        lifetimeCoins: this.lifetimeCoins,
        ghost: this.ghost,
      };
    },

    applySave(d) {
      if (!d) return;
      if (typeof d.bestScore === "number") this.bestScore = d.bestScore;
      if (typeof d.totalCoins === "number") this.totalCoins = d.totalCoins;
      if (typeof d.runs === "number") this.runs = d.runs;
      if (typeof d.skin === "number") this.skin = d.skin;
      if (typeof d.upJump === "number") this.upJump = d.upJump;
      if (typeof d.upCoin === "number") this.upCoin = d.upCoin;
      if (typeof d.upStart === "number") this.upStart = d.upStart;
      if (Array.isArray(d.owned) && d.owned.length) this.owned = d.owned;
      if (typeof d.missionDate === "string") this.missionDate = d.missionDate;
      if (d.missionProgress) this.missionProgress = Object.assign(this.missionProgress, d.missionProgress);
      if (Array.isArray(d.missionClaimed)) this.missionClaimed = d.missionClaimed;
      if (d.lang === "ja" || d.lang === "en") {
        this.lang = d.lang;
        this._langSaved = true;
      }
      if (typeof d.mutedLocal === "boolean") this.mutedLocal = d.mutedLocal;
      if (typeof d.loginDate === "string") this.loginDate = d.loginDate;
      if (typeof d.loginStreak === "number") this.loginStreak = d.loginStreak;
      if (typeof d.todayBestDate === "string") this.todayBestDate = d.todayBestDate;
      if (typeof d.todayBest === "number") this.todayBest = d.todayBest;
      if (typeof d.yesterdayBest === "number") this.yesterdayBest = d.yesterdayBest;
      if (Array.isArray(d.topScores)) this.topScores = d.topScores;
      if (d.badges) this.badges = d.badges;
      if (d.ownedEquip) {
        this.ownedEquip = {
          hat: (d.ownedEquip.hat || [true, false, false, false]).slice(),
          trail: (d.ownedEquip.trail || [true, false, false]).slice(),
          charm: (d.ownedEquip.charm || [true, false, false, false]).slice(),
        };
        this.ownedEquip.hat[0] = true;
        this.ownedEquip.trail[0] = true;
        this.ownedEquip.charm[0] = true;
      }
      if (typeof d.equipHat === "number") this.equipHat = d.equipHat;
      if (typeof d.equipTrail === "number") this.equipTrail = d.equipTrail;
      if (typeof d.equipCharm === "number") this.equipCharm = d.equipCharm;
      if (typeof d.lifetimeCoins === "number") this.lifetimeCoins = d.lifetimeCoins;
      if (d.ghost && Array.isArray(d.ghost.samples)) this.ghost = d.ghost;
    },

    loadLocal() {
      try {
        const raw = localStorage.getItem(this._lsKey);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (_) {
        return null;
      }
    },

    saveLocal(data) {
      try {
        localStorage.setItem(this._lsKey, JSON.stringify(data));
      } catch (_) {}
    },

    async init() {
      const api = window.YoutubePlayables;
      // まずローカル（GitHub Pages 等の SDK なし環境用）
      this.applySave(this.loadLocal());
      if (!api) {
        this.ready = true;
        this.savedLoaded = true;
        return;
      }
      try {
        await api.initialize({
          onFirstFrameReady: () => api.firstFrameReady(),
          onGameReady: () => api.gameReady(),
          onPause: () => {
            this.paused = true;
            Game.setPaused(true);
          },
          onResume: () => {
            this.paused = false;
            Game.setPaused(false);
          },
          onAudioEnabledChange: (enabled) => {
            this.audioEnabled = !!enabled;
            Game.setAudioEnabled(this.audioEnabled);
          },
        });
        this.audioEnabled = api.isAudioEnabled !== false;
        Game.setAudioEnabled(this.audioEnabled);
        try {
          const d = await api.loadData();
          // YouTube クラウドがあればそちらを正とする
          if (d) this.applySave(d);
        } catch (_) {}
        this.savedLoaded = true;
        this.ready = true;
      } catch (e) {
        console.warn("Playables SDK fallback", e);
        this.ready = true;
        this.savedLoaded = true;
      }
    },

    async persist() {
      const data = this.snapshot();
      // SDK なし環境（GitHub Pages 等）では localStorage に保存
      const api = window.YoutubePlayables;
      if (!api || typeof api.saveData !== "function") {
        this.saveLocal(data);
        return;
      }
      // Playables 本番はクラウドセーブのみ（認定要件）
      try {
        await api.saveData(data);
      } catch (_) {}
    },

    async addCoins(n) {
      this.totalCoins += n;
      if (n > 0) this.lifetimeCoins = (this.lifetimeCoins || 0) + n;
      await this.persist();
    },

    async showInterstitial() {
      const api = window.YoutubePlayables;
      if (!api || typeof api.showInterstitialAd !== "function") return true;
      try {
        await api.showInterstitialAd();
        return true;
      } catch (_) {
        return true;
      }
    },

    async showRewarded() {
      const api = window.YoutubePlayables;
      // ローカル/SDK なし環境では開発用に成功扱い（本番は必ず SDK 経由）
      if (!api || typeof api.showRewardedAd !== "function") return true;
      try {
        const r = await api.showRewardedAd();
        return !!(r && (r.rewarded === true || r === true));
      } catch (_) {
        return false;
      }
    },
  };

  // ---------- 多言語（i18n） ----------
  const STR = {
    ja: {
      title: "ふわふわランナー",
      tagline: "コイン・コンボ・ダッシュでハイスコア",
      how: "空中でもう一押しでダッシュ / ニアミスはスロー",
      play: "あそぶ",
      shop: "ショップ",
      back: "もどる",
      best: "ベスト",
      plays: "プレイ",
      times: "回",
      missions: "本日のミッション",
      fever: "★ フィーバー！ ×2 ★",
      feverWord: "FEVER",
      combo: "コンボ",
      nearMiss: "ニアミス",
      dash: "ダッシュ！",
      smash: "ぶっこわし",
      land: "着地衝撃！",
      ojisan: "あっ、おじさんだ！！",
      ojisanBonus: "おじさんボーナス！",
      gameOver: "おつかれさま！",
      newBest: "★ ベスト更新！",
      again: "もう一度",
      continueAd: "つづけるAD",
      continueHint: "つづけるAD は広告を見ると復活（シールド付き）",
      doubleCoins: "コイン2倍 AD",
      doubleHint: "広告を見ると今回のコインがもう1倍",
      doubleDone: "2倍したよ！",
      shopGo: "ショップへ",
      almost: "あと少しでベスト更新！ もう一回！",
      coinsLabel: "コイン",
      maxCombo: "最大コンボ",
      nearLabel: "ニアミス",
      owned: "もちもの",
      wearing: "つかってる",
      equip: "つかう",
      buy: "かいとる",
      ability: "とくせい",
      focusHint: "スキンをタップで選択 / 買うときは「かいとる」",
      levelUp: "レベルアップ！",
      maxLv: "MAX",
      needCoins: "コインが足りない…",
      missionDone: "ミッション達成！",
      pause: "一時停止中…",
      muteOn: "音 OFF",
      muteOff: "音 ON",
      langBtn: "EN",
      howTo: "あそびかた",
      howL1: "タップ / クリック / スペースでジャンプ",
      howL2: "空中でもう一度押すとダッシュ",
      howL3: "コインを集めてショップで解放",
      upgrade: "アップグレード（永久）",
      skins: "スキン",
      jumpPow: "ジャンプ力",
      coinVal: "コイン価値",
      startSpd: "開始スピード",
      jumpEff: "ジャンプが高く",
      coinEff: "スコア＆所持コインUP",
      startEff: "開始が速い（高得点向け）",
    },
    en: {
      title: "Fluffy Runner",
      tagline: "Jump, combo & dash for a high score",
      how: "Tap again mid-air to dash · Near-miss = slow-mo",
      play: "Play",
      shop: "Shop",
      back: "Back",
      best: "Best",
      plays: "Runs",
      times: "",
      missions: "Daily Missions",
      fever: "★ FEVER! ×2 ★",
      feverWord: "FEVER",
      combo: "combo",
      nearMiss: "NEAR MISS",
      dash: "DASH!",
      smash: "SMASH",
      land: "LANDING!",
      ojisan: "It's the bald uncle!!",
      ojisanBonus: "Uncle Bonus!",
      gameOver: "Nice run!",
      newBest: "★ New Best!",
      again: "Retry",
      continueAd: "Continue AD",
      continueHint: "Watch an ad to revive (with shield)",
      doubleCoins: "2x Coins AD",
      doubleHint: "Watch an ad to double this run's coins",
      doubleDone: "Doubled!",
      shopGo: "To Shop",
      almost: "Almost your best! One more?",
      coinsLabel: "Coins",
      maxCombo: "Max combo",
      nearLabel: "Near-miss",
      owned: "Owned",
      wearing: "Equipped",
      equip: "Use",
      buy: "Buy",
      ability: "Ability",
      focusHint: "Tap a skin to select · Buy with the button",
      levelUp: "Level up!",
      maxLv: "MAX",
      needCoins: "Not enough coins…",
      missionDone: "Mission clear!",
      pause: "Paused…",
      muteOn: "Sound OFF",
      muteOff: "Sound ON",
      langBtn: "日本語",
      howTo: "How to play",
      howL1: "Tap / click / Space to jump",
      howL2: "Tap again in air to dash",
      howL3: "Collect coins · unlock in Shop",
      upgrade: "Upgrades (permanent)",
      skins: "Skins",
      jumpPow: "Jump power",
      coinVal: "Coin value",
      startSpd: "Start speed",
      jumpEff: "Jump higher",
      coinEff: "Score & wallet coins UP",
      startEff: "Faster start (for score)",
    },
  };

  function t(key) {
    const lang = Playables.lang === "en" ? "en" : "ja";
    return (STR[lang] && STR[lang][key]) || STR.ja[key] || key;
  }

  function soundOn() {
    return Playables.audioEnabled && !Playables.mutedLocal;
  }

  // ---------- 日替わりミッション ----------
  function todayKey() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const MISSION_DEFS = [
    {
      type: "coins",
      base: 20,
      step: 12,
      label: (n) => (Playables.lang === "en" ? "Collect " + n + " coins" : "コインを " + n + " 個集める"),
    },
    {
      type: "bestRunScore",
      base: 250,
      step: 150,
      label: (n) => (Playables.lang === "en" ? "Score " + n + " in one run" : "1回で " + n + " 点とる"),
    },
    {
      type: "maxCombo",
      base: 7,
      step: 3,
      label: (n) => (Playables.lang === "en" ? "Reach " + n + " combo" : "コンボ " + n + " つなげる"),
    },
    {
      type: "near",
      base: 3,
      step: 2,
      label: (n) => (Playables.lang === "en" ? n + " near-misses" : "ニアミス " + n + " 回する"),
    },
    {
      type: "runs",
      base: 3,
      step: 1,
      label: (n) => (Playables.lang === "en" ? "Play " + n + " runs" : n + " 回プレイする"),
    },
    {
      type: "fever",
      base: 2,
      step: 1,
      label: (n) => (Playables.lang === "en" ? "Trigger fever " + n + " times" : "フィーバー " + n + " 回なろう"),
    },
    {
      type: "smash",
      base: 3,
      step: 2,
      label: (n) => (Playables.lang === "en" ? "Dash-smash " + n + " obstacles" : "ダッシュ破壊 " + n + " 回"),
    },
  ];

  let dailyMissions = [];

  function ensureDailyMissions() {
    const key = todayKey();
    if (Playables.missionDate !== key || !dailyMissions.length) {
      if (Playables.missionDate !== key) {
        Playables.missionDate = key;
        Playables.missionProgress = {
          coins: 0,
          bestRunScore: 0,
          maxCombo: 0,
          near: 0,
          runs: 0,
          fever: 0,
          smash: 0,
        };
        Playables.missionClaimed = [false, false, false];
        Playables.persist();
      }
      const rnd = mulberry32(hashStr("fluffy-" + key));
      const pool = MISSION_DEFS.slice();
      dailyMissions = [];
      for (let i = 0; i < 3 && pool.length; i++) {
        const idx = Math.floor(rnd() * pool.length);
        const def = pool.splice(idx, 1)[0];
        const tier = Math.floor(rnd() * 3);
        const target = def.base + def.step * tier + Math.floor(rnd() * (def.step + 1));
        const reward = 20 + tier * 15 + Math.floor(target * 0.08);
        dailyMissions.push({
          type: def.type,
          target,
          reward,
          label: def.label(target),
        });
      }
    }
    return dailyMissions;
  }

  function missionProgressOf(type) {
    const p = Playables.missionProgress;
    return p[type] || 0;
  }

  /** ミッション進捗を加算。達成したら自動で報酬付与 */
  function bumpMission(type, amount, isMax) {
    ensureDailyMissions();
    const p = Playables.missionProgress;
    if (isMax) {
      p[type] = Math.max(p[type] || 0, amount);
    } else {
      p[type] = (p[type] || 0) + amount;
    }
    for (let i = 0; i < dailyMissions.length; i++) {
      const m = dailyMissions[i];
      if (m.type !== type) continue;
      if (Playables.missionClaimed[i]) continue;
      if (p[type] >= m.target) {
        Playables.missionClaimed[i] = true;
        Playables.totalCoins += m.reward;
        Playables.persist();
        Game.notice = t("missionDone") + " +" + m.reward + "C";
        Game.noticeT = 2.2;
        beep(784, 0.08, "triangle", 0.05);
        setTimeout(() => beep(988, 0.08, "triangle", 0.05), 90);
        setTimeout(() => beep(1318, 0.14, "triangle", 0.045), 180);
      }
    }
  }

  function remainingDaysHint() {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const sec = Math.max(0, Math.floor((end - now) / 1000));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return "あと " + h + "時間" + String(m).padStart(2, "0") + "分で更新";
  }

  // ---------- 連続ログインボーナス ----------
  const LOGIN_REWARDS = [10, 15, 30, 25, 45, 60, 120];

  function checkLoginBonus() {
    const key = todayKey();
    if (Playables.loginDate === key) {
      Playables.loginPending = false;
      Playables.loginDay = 0;
      return;
    }
    // 昨日から連続か？
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yKey =
      y.getFullYear() +
      "-" +
      String(y.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(y.getDate()).padStart(2, "0");
    if (Playables.loginDate === yKey) {
      Playables.loginStreak = Math.min(7, (Playables.loginStreak || 0) + 1);
    } else {
      Playables.loginStreak = 1;
    }
    Playables.loginDay = Playables.loginStreak;
    Playables.loginPending = true;
    Playables.loginDate = key;
    Playables.persist();
  }

  function claimLoginBonus() {
    if (!Playables.loginPending) return 0;
    const day = Playables.loginDay || 1;
    const reward = LOGIN_REWARDS[Math.min(6, day - 1)] || 10;
    Playables.totalCoins += reward;
    Playables.loginPending = false;
    Playables.persist();
    beep(660, 0.08, "triangle", 0.045);
    setTimeout(() => beep(880, 0.1, "triangle", 0.04), 90);
    if (day === 7) {
      setTimeout(() => beep(1175, 0.16, "triangle", 0.04), 180);
    }
    return reward;
  }

  // ---------- 今日のベスト / TOP5 / 実績 ----------
  function syncTodayBest() {
    const key = todayKey();
    if (Playables.todayBestDate !== key) {
      // 日付が変わったら昨日ベストへ移す
      if (Playables.todayBestDate) {
        Playables.yesterdayBest = Playables.todayBest || 0;
      }
      Playables.todayBestDate = key;
      Playables.todayBest = 0;
      Playables.persist();
    }
  }

  function recordScore(score) {
    syncTodayBest();
    const s = Math.floor(score);
    let todayNew = false;
    if (s > (Playables.todayBest || 0)) {
      Playables.todayBest = s;
      todayNew = true;
    }
    // TOP5
    const list = (Playables.topScores || []).slice();
    list.push(s);
    list.sort((a, b) => b - a);
    Playables.topScores = list.slice(0, 5);
    Playables.persist();
    return { todayNew, rank: Playables.topScores.indexOf(s) + 1 };
  }

  const BADGES = [
    { id: "first", ja: "はじめの一歩", en: "First Run", descJa: "1回プレイ", descEn: "Play once", check: (G) => Playables.runs >= 1 },
    { id: "score500", ja: "500点", en: "500 pts", descJa: "500点とる", descEn: "Score 500", check: () => Playables.bestScore >= 500 },
    { id: "score1500", ja: "1500点", en: "1500 pts", descJa: "1500点とる", descEn: "Score 1500", check: () => Playables.bestScore >= 1500 },
    { id: "combo15", ja: "コンボ15", en: "Combo 15", descJa: "コンボ15", descEn: "Combo x15", check: (G) => G.comboMax >= 15 },
    { id: "coins100", ja: "コイン100", en: "100 Coins", descJa: "コイン累計100", descEn: "100 coins total", check: () => Playables.totalCoins >= 100 },
    { id: "coins500", ja: "コイン500", en: "500 Coins", descJa: "コイン累計500", descEn: "500 coins total", check: () => Playables.totalCoins >= 500 },
    { id: "login3", ja: "3日連続", en: "3-Day Streak", descJa: "3日連続ログイン", descEn: "Login 3 days", check: () => Playables.loginStreak >= 3 },
    { id: "skinBuy", ja: "コレクター", en: "Collector", descJa: "スキンを1つ買う", descEn: "Buy a skin", check: () => Playables.owned.some((o, i) => i > 0 && o) },
    { id: "near10", ja: "ニアミス10", en: "10 Near-miss", descJa: "1ランでニアミス10", descEn: "10 near-misses in a run", check: (G) => G.nearMisses >= 10 },
    { id: "uncle", ja: "おじさんと友達", en: "Uncle Friend", descJa: "おじさんボーナス", descEn: "Uncle bonus", check: (G) => G._sawUncle },
  ];

  function checkBadges(G) {
    if (!Playables.badges) Playables.badges = {};
    for (const b of BADGES) {
      if (Playables.badges[b.id]) continue;
      try {
        if (b.check(G)) {
          Playables.badges[b.id] = true;
          Playables.persist();
          Game.notice = (Playables.lang === "en" ? "Badge: " : "実績GET！ ") + (Playables.lang === "en" ? b.en : b.ja);
          Game.noticeT = 2.2;
          beep(880, 0.08, "triangle", 0.045);
          setTimeout(() => beep(1175, 0.12, "triangle", 0.04), 90);
          Playables.totalCoins += 25;
        }
      } catch (_) {}
    }
  }

  // スキン定義
  const SKINS = [
    {
      name: "ももちゃん",
      nameEn: "Momo",
      cost: 0,
      body: ["#fff5f8", "#ffc2d8", "#ff8fb8"],
      cheek: "rgba(255,150,180,0.45)",
      // コンボが切れにくい
      abil: { comboT: 1.25, jump: 1, coin: 1, near: 1, fever: 1, startShield: 0 },
      descJa: "コンボが長持ち",
      descEn: "Combo lasts longer",
    },
    {
      name: "そらまめ",
      nameEn: "Sky Bean",
      cost: 50,
      body: ["#f0fbff", "#a8e0ff", "#6bb6ff"],
      cheek: "rgba(100,180,255,0.4)",
      // ジャンプが高い
      abil: { comboT: 1, jump: 1.14, coin: 1, near: 1, fever: 1, startShield: 0 },
      descJa: "ジャンプ力アップ",
      descEn: "Higher jump",
    },
    {
      name: "レモンちゃん",
      nameEn: "Lemon",
      cost: 120,
      body: ["#fffde8", "#ffe066", "#f0c020"],
      cheek: "rgba(240,180,40,0.4)",
      // コイン価値が高い
      abil: { comboT: 1, jump: 1, coin: 1.35, near: 1, fever: 1, startShield: 0 },
      descJa: "コインが高く売れる",
      descEn: "Coins worth more",
    },
    {
      name: "ぶどうむらさき",
      nameEn: "Grape",
      cost: 250,
      body: ["#f8f0ff", "#d4a8ff", "#a060e0"],
      cheek: "rgba(160,100,220,0.35)",
      // ニアミスが取りやすい＆フィーバー貯めやすい
      abil: { comboT: 1, jump: 1, coin: 1, near: 1.45, fever: 1.4, startShield: 0 },
      descJa: "ニアミス判定がゆるい",
      descEn: "Easier near-misses",
    },
    {
      name: "ゴールド★",
      nameEn: "Gold★",
      cost: 500,
      body: ["#fff8e0", "#ffd76a", "#e8a020"],
      cheek: "rgba(232,160,32,0.4)",
      // シールド持ち帰り＋少しどれも強め
      abil: { comboT: 1.1, jump: 1.05, coin: 1.15, near: 1.15, fever: 1.25, startShield: 1 },
      descJa: "開始時シールド＋万能",
      descEn: "Start shield + all-round",
    },
  ];

  function skinAbil() {
    return (SKINS[Playables.skin] || SKINS[0]).abil;
  }

  // 装備（見た目＋一部効果）
  const EQUIP_HAT = [
    { id: "none", ja: "なし", en: "None", cost: 0, color: null },
    { id: "ribbon", ja: "リボン", en: "Ribbon", cost: 40, color: "#ff6b8a" },
    { id: "cap", ja: "ぼうし", en: "Cap", cost: 90, color: "#6bb6ff" },
    { id: "crown", ja: "王冠", en: "Crown", cost: 200, color: "#ffd56a" },
  ];
  const EQUIP_TRAIL = [
    { id: "none", ja: "なし", en: "None", cost: 0 },
    { id: "star", ja: "キラキラ", en: "Sparkle", cost: 70, color: "#ffe066" },
    { id: "heart", ja: "ハート", en: "Hearts", cost: 120, color: "#ff8fb8" },
  ];
  const EQUIP_CHARM = [
    { id: "none", ja: "なし", en: "None", cost: 0, jaEff: "", enEff: "" },
    {
      id: "coin",
      ja: "こばん",
      en: "Coin Charm",
      cost: 180,
      jaEff: "コイン+10%",
      enEff: "+10% coins",
      coin: 1.1,
    },
    {
      id: "magnet",
      ja: "じしゃく",
      en: "Magnet",
      cost: 220,
      jaEff: "開始時マグネット3秒",
      enEff: "Start magnet 3s",
      startMagnet: 3,
    },
    {
      id: "lucky",
      ja: "おまもり",
      en: "Lucky",
      cost: 280,
      jaEff: "フィーバー貯めやすい",
      enEff: "Easier fever",
      fever: 1.2,
    },
  ];

  function equipAbil() {
    const c = EQUIP_CHARM[Playables.equipCharm] || EQUIP_CHARM[0];
    return {
      coin: c.coin || 1,
      startMagnet: c.startMagnet || 0,
      fever: c.fever || 1,
    };
  }

  /** スキン進化段階 0-3（累計コイン） */
  function skinStage(skinIdx) {
    const lc = Playables.lifetimeCoins || 0;
    // 進化の閾値はスキンの価格帯で少し変える
    const base = [80, 150, 250, 400, 600];
    const b = base[skinIdx] || 80;
    if (lc >= b * 6) return 3;
    if (lc >= b * 3) return 2;
    if (lc >= b) return 1;
    return 0;
  }

  function skinStageLabel(stage) {
    if (stage >= 3) return "Ω";
    if (stage === 2) return "★★";
    if (stage === 1) return "★";
    return "";
  }

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  let W = 0,
    H = 0,
    dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Game.layout();
  }

  let audioCtx = null;
  function beep(freq, dur, type, vol) {
    if (!soundOn()) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type || "sine";
      o.frequency.value = freq;
      g.gain.value = vol || 0.04;
      o.connect(g);
      g.connect(audioCtx.destination);
      const t = audioCtx.currentTime;
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t);
      o.stop(t + dur);
    } catch (_) {}
  }

  function comboJingle(n) {
    const base = 520 + Math.min(n, 12) * 40;
    beep(base, 0.05, "square", 0.03);
    if (n >= 5) setTimeout(() => beep(base * 1.25, 0.06, "square", 0.03), 50);
    if (n >= 10) setTimeout(() => beep(base * 1.5, 0.08, "triangle", 0.035), 100);
  }

  // ---------- BGM（WebAudio 手続き生成・外部ファイルなし） ----------
  const Music = {
    started: false,
    timer: null,
    step: 0,
    mode: "menu", // menu | play | fever | over
    master: null,

    // ペンタトニック（明るいパステル調）
    // C D E G A
    scale: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0],
    // ベース進行（C - Am - F - G 相当のシンプル）
    bass: [130.81, 110.0, 87.31, 98.0],

    ensureCtx() {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      if (!this.master) {
        this.master = audioCtx.createGain();
        this.master.gain.value = 0.85;
        this.master.connect(audioCtx.destination);
      }
      return audioCtx;
    },

    tone(freq, dur, type, vol, when, dest) {
      if (!soundOn()) return;
      try {
        const c = this.ensureCtx();
        const t = when != null ? when : c.currentTime;
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = type || "triangle";
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g);
        g.connect(dest || this.master);
        o.start(t);
        o.stop(t + dur + 0.05);
      } catch (_) {}
    },

    noise(dur, vol, when) {
      if (!soundOn()) return;
      try {
        const c = this.ensureCtx();
        const t = when != null ? when : c.currentTime;
        const len = Math.floor(c.sampleRate * dur);
        const buf = c.createBuffer(1, len, c.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = c.createBufferSource();
        src.buffer = buf;
        const g = c.createGain();
        g.gain.value = vol || 0.03;
        const f = c.createBiquadFilter();
        f.type = "highpass";
        f.frequency.value = 2000;
        src.connect(f);
        f.connect(g);
        g.connect(this.master);
        src.start(t);
      } catch (_) {}
    },

    setMode(m) {
      if (this.mode !== m) {
        this.mode = m;
        if (m === "over") {
          // 少し間を空けて menu BGM へ
          this.step = 0;
        }
      }
    },

    schedule() {
      if (!this.started || !soundOn()) return;
      const c = this.ensureCtx();
      if (c.state === "suspended") {
        // 自動再生制限が解けるまで待つ（ユーザー操作後に resume）
        return;
      }
      const now = c.currentTime;
      // タブ復帰などで大きく遅れた場合は巻き戻して詰めない
      if (!this._next || this._next < now - 0.4) this._next = now + 0.02;

      // 先読みスケジュール（間隔ズレに強い）
      while (this._next < now + 0.12) {
        this.scheduleStep(this._next);
        const fever = this.mode === "fever";
        const play = this.mode === "play" || fever;
        const bpm = fever ? 148 : play ? 128 : 96;
        const stepDur = 60 / bpm / 2;
        this._next += stepDur;
      }
    },

    scheduleStep(t0) {
      const fever = this.mode === "fever";
      const play = this.mode === "play" || fever;
      const bpm = fever ? 148 : play ? 128 : 96;
      const stepDur = 60 / bpm / 2;

      const s = this.step;
      const bar = Math.floor(s / 8) % 4;
      const beat = s % 8;

      if (beat === 0) {
        this.tone(this.bass[bar] * (fever ? 1.0 : 1), stepDur * 3.2, "triangle", fever ? 0.16 : 0.12, t0);
      }
      if (beat === 4 && play) {
        this.tone(this.bass[bar] * 1.5, stepDur * 1.5, "triangle", 0.08, t0);
      }

      if (play) {
        const patterns = [
          [0, 2, 4, 5, 4, 2, 4, 7],
          [2, 4, 5, 7, 5, 4, 2, 0],
          [4, 5, 7, 9, 7, 5, 4, 2],
          [5, 4, 2, 0, 2, 4, 5, 7],
        ];
        const idx = patterns[bar][beat];
        if (beat % 2 === 0 || fever) {
          const f = this.scale[idx] * (fever ? 1.0 : 0.55);
          this.tone(f, stepDur * 0.9, fever ? "square" : "triangle", fever ? 0.12 : 0.1, t0);
        }
        if (fever && beat % 2 === 1) {
          this.tone(this.scale[(idx + 4) % this.scale.length], stepDur * 0.4, "square", 0.06, t0 + stepDur * 0.5);
        }
      } else {
        // メニューもはっきり聞こえるアルペジオ
        const menuPat = [0, 2, 4, 5, 4, 2, 4, 2];
        const idx = menuPat[beat];
        if (beat % 2 === 0) {
          this.tone(this.scale[idx], stepDur * 1.6, "sine", 0.09, t0);
          this.tone(this.scale[idx + 2], stepDur * 1.6, "triangle", 0.05, t0 + 0.01);
        }
      }

      if (play && (beat === 2 || beat === 6)) {
        this.noise(0.04, fever ? 0.035 : 0.02, t0);
      }
      if (play && (beat === 0 || beat === 4)) {
        this.tone(60, 0.1, "sine", 0.06, t0);
      }

      this.step = (this.step + 1) % 32;
    },

    start() {
      // ユーザー操作後に必ず呼ばれる想定
      try {
        this.ensureCtx();
        if (audioCtx.state === "suspended") audioCtx.resume();
      } catch (_) {}
      if (!this.started) {
        this.started = true;
        this.step = 0;
        this._next = audioCtx ? audioCtx.currentTime + 0.05 : 0;
        this.timer = setInterval(() => {
          if (this.started) this.schedule();
        }, 50);
        // 開始の合図音（聞こえた確認になる）
        try {
          this.tone(523.25, 0.1, "sine", 0.12, this._next);
          this.tone(659.25, 0.12, "sine", 0.1, this._next + 0.1);
          this.tone(783.99, 0.16, "sine", 0.1, this._next + 0.22);
        } catch (_) {}
      } else {
        // 既に動いていれば時刻だけ同期（真ん中から再開しない）
        if (audioCtx && this._next < audioCtx.currentTime - 0.2) {
          this._next = audioCtx.currentTime + 0.02;
        }
      }
    },

    stop() {
      this.started = false;
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },

    setEnabled(on) {
      if (this.master) this.master.gain.value = on && !Playables.mutedLocal ? 0.85 : 0;
      if (on && !Playables.mutedLocal) {
        try {
          this.ensureCtx();
          if (audioCtx.state === "suspended") audioCtx.resume();
          if (audioCtx && this._next < audioCtx.currentTime - 0.2) {
            this._next = audioCtx.currentTime + 0.02;
          }
        } catch (_) {}
      }
    },

    toggleMute() {
      Playables.mutedLocal = !Playables.mutedLocal;
      Playables.persist();
      this.setEnabled(Playables.audioEnabled);
      Game.notice = Playables.mutedLocal ? t("muteOn") : t("muteOff");
      Game.noticeT = 1.2;
    },
  };

  // ---------- ゲーム ----------
  const Game = {
    state: "loading", // loading | menu | shop | playing | over
    score: 0,
    displayScore: 0,
    time: 0,
    speed: 0,
    baseSpeed: 0,
    groundY: 0,
    worldOffset: 0,
    shake: 0,
    coinCount: 0,
    coinFlash: 0,
    combo: 0,
    comboTimer: 0,
    comboMax: 0,
    fever: 0, // 0..1
    feverActive: false,
    nearMisses: 0,
    shield: 0,
    magnet: 0,
    doublePts: 0,
    powerups: [],
    hitFlash: 0,
    milestone: 0,
    milestoneMsg: "",
    milestoneT: 0,
    shopScroll: 0,
    shopFocus: -1,
    showLogin: false,
    notice: "",
    noticeT: 0,
    _forcePause: false,
    _overCount: 0,
    timeScale: 1,
    slowmo: 0,
    dash: 0, // ダッシュ残り時間
    dashCd: 0,
    speedLines: 0,
    afterimages: [],
    birds: [],

    player: {
      x: 0,
      y: 0,
      vy: 0,
      w: 44,
      h: 44,
      onGround: true,
      jumps: 0,
      maxJumps: 2,
      squash: 0,
      blink: 0,
      invuln: 0,
      diving: false,
    },

    obstacles: [],
    coins: [],
    powerups: [],
    cameos: [],
    clouds: [],
    hills: [],
    particles: [],
    floatTexts: [],

    spawnTimer: 0,
    cameoTimer: 4,
    powerTimer: 8,
    birdTimer: 7,

    layout() {
      this.groundY = H * 0.78;
      this.player.x = Math.max(64, W * 0.18);
      if (this.state === "menu" || this.state === "loading" || this.state === "shop") {
        this.player.y = this.groundY - this.player.h;
        this.player.vy = 0;
        this.player.onGround = true;
      }
      if (this.clouds.length === 0) {
        for (let i = 0; i < 6; i++) {
          this.clouds.push({
            x: Math.random() * W,
            y: H * 0.12 + Math.random() * H * 0.28,
            s: 0.6 + Math.random() * 0.9,
            v: 12 + Math.random() * 18,
          });
        }
      }
      if (this.hills.length === 0) {
        for (let i = 0; i < 5; i++) {
          this.hills.push({
            x: i * (W / 3),
            w: W * 0.4 + Math.random() * W * 0.2,
            h: 40 + Math.random() * 50,
            layer: i % 2,
          });
        }
      }
    },

    reset() {
      this.score = 0;
      this.displayScore = 0;
      this.time = 0;
      this.speed = this.baseSpeed;
      this.obstacles = [];
      this.coins = [];
      this.powerups = [];
      this.cameos = [];
      this.particles = [];
      this.floatTexts = [];
      this.spawnTimer = 1.0;
      this.shake = 0;
      this.coinCount = 0;
      this.coinFlash = 0;
      this.combo = 0;
      this.comboTimer = 0;
      this.comboMax = 0;
      this.fever = 0;
      this.feverActive = false;
      this.nearMisses = 0;
      this.shield = 0;
      this.magnet = 0;
      this.doublePts = 0;
      this.powerups = [];
      this.hitFlash = 0;
      this.milestone = 0;
      this.cameoTimer = 3 + Math.random() * 3;
      this.powerTimer = 6 + Math.random() * 4;
      this.notice = "";
      this.noticeT = 0;
      this.timeScale = 1;
      this.slowmo = 0;
      this.dash = 0;
      this.dashCd = 0;
      this.speedLines = 0;
      this.afterimages = [];
      this.birds = [];
      this.birdTimer = 5 + Math.random() * 4;
      this._runCoinGain = 0;
      this._doubleUsed = false;
      this._todayNew = false;
      this._rank = 0;
      this._riskActive = 0;
      this._sawUncle = false;
      this._ghostRec = [];
      this._ghostAcc = 0;
      this._runTime = 0;
      const p = this.player;
      p.y = this.groundY - p.h;
      p.vy = 0;
      p.onGround = true;
      p.jumps = 0;
      p.squash = 0;
      p.invuln = 0;
      p.diving = false;
      this.shield = Math.max(0, skinAbil().startShield || 0);
      const sm = equipAbil().startMagnet;
      if (sm > 0) this.magnet = sm;
    },

    start() {
      this.baseSpeed = Math.max(280, W * 0.45) * (1 + Playables.upStart * 0.08);
      this.reset();
      this.state = "playing";
      Music.start();
      Music.setMode("play");
      Playables.runs++;
      bumpMission("runs", 1);
      Playables.persist();
      beep(660, 0.08, "triangle", 0.05);
      setTimeout(() => beep(880, 0.1, "triangle", 0.05), 80);
    },

    jump() {
      if (this.state !== "playing") return;
      const p = this.player;
      // 空中でもう一度押す & ダッシュ可能なら急降下ダッシュ
      // （ジャンプ直後の誤タップで即ダッシュしないよう短い猶予）
      const sinceJump = this.time - (this._lastJumpAt || -9);
      if (!p.onGround && p.jumps >= 1 && this.dashCd <= 0 && !p.diving && sinceJump > 0.12) {
        this.doDash();
        return;
      }
      if (p.jumps >= p.maxJumps) return;
      const boost = 1 + Playables.upJump * 0.1;
      const jumpForce = -Math.min(780, H * 1.15) * boost * skinAbil().jump;
      p.vy = p.jumps === 0 ? jumpForce : jumpForce * 0.82;
      p.onGround = false;
      p.jumps++;
      p.squash = 1;
      p.diving = false;
      this._lastJumpAt = this.time;
      beep(p.jumps === 1 ? 520 : 720, 0.07, "square", 0.035);
      for (let i = 0; i < 6; i++) {
        this.particles.push({
          x: p.x + p.w / 2,
          y: p.y + p.h,
          vx: (Math.random() - 0.5) * 80,
          vy: Math.random() * 40,
          life: 0.35,
          max: 0.35,
          c: "#ffd0e0",
          r: 3 + Math.random() * 3,
        });
      }
    },

    doDash() {
      const p = this.player;
      p.diving = true;
      p.vy = Math.min(1400, H * 2.2);
      this.dash = 0.35;
      this.dashCd = 0.7;
      this.shake = Math.max(this.shake, 6);
      this.speedLines = 1;
      this.addScore(15, p.x + 20, p.y, t("dash"), "#7dffa8");
      beep(180, 0.08, "sawtooth", 0.04);
      setTimeout(() => beep(120, 0.1, "sawtooth", 0.03), 60);
      // 残像
      for (let i = 0; i < 4; i++) {
        this.afterimages.push({
          x: p.x,
          y: p.y,
          life: 0.25 - i * 0.04,
          max: 0.25,
        });
      }
    },

    triggerSlowmo() {
      this.slowmo = 0.38;
      this.timeScale = 0.35;
      this.speedLines = 1;
      this.shake = Math.max(this.shake, 4);
      beep(1400, 0.06, "sine", 0.04);
    },

    addScore(n, x, y, label, color) {
      const mult = (this.feverActive ? 2 : 1) * (this.doublePts > 0 ? 2 : 1);
      const v = Math.floor(n * mult);
      this.score += v;
      if (x != null) {
        this.floatTexts.push({
          x,
          y,
          text: label || ("+" + v),
          life: 0.8,
          max: 0.8,
          c: color || "#fff",
        });
      }
      return v;
    },

    collectCoin(c) {
      const ab = skinAbil();
      const eq = equipAbil();
      const base = (10 + Playables.upCoin * 5) * ab.coin * eq.coin;
      this.coinCount++;
      this.combo++;
      this.comboTimer = 2.2 * ab.comboT;
      this.comboMax = Math.max(this.comboMax, this.combo);
      bumpMission("coins", 1);
      bumpMission("maxCombo", this.combo, true);
      // フィーバーチャージ
      if (!this.feverActive) {
        this.fever = Math.min(1, this.fever + (0.08 + this.combo * 0.01) * ab.fever * equipAbil().fever);
        if (this.fever >= 1) {
          this.feverActive = true;
          this.fever = 1;
          bumpMission("fever", 1);
          Music.setMode("fever");
          this.notice = t("fever");
          this.noticeT = 2;
          beep(784, 0.1, "triangle", 0.05);
          setTimeout(() => beep(988, 0.1, "triangle", 0.05), 80);
          setTimeout(() => beep(1175, 0.15, "triangle", 0.05), 160);
        }
      }
      this.addScore(base, c.x, c.y - 20, "+" + base, this.feverActive ? "#ffe066" : "#ffd56a");
      this.coinFlash = 1;
      comboJingle(this.combo);
      for (let k = 0; k < 8; k++) {
        const a = (Math.PI * 2 * k) / 8;
        this.particles.push({
          x: c.x,
          y: c.y,
          vx: Math.cos(a) * 120,
          vy: Math.sin(a) * 120 - 40,
          life: 0.4,
          max: 0.4,
          c: this.feverActive ? "#ffe066" : "#ffd56a",
          r: 3 + Math.random() * 2,
        });
      }
    },

    applyPowerup(kind) {
      if (kind === "magnet") {
        this.magnet = 8;
        this.notice = "マグネット！";
      } else if (kind === "shield") {
        this.shield = 1;
        this.notice = "シールド！";
      } else if (kind === "double") {
        this.doublePts = 8;
        this.notice = "スコア2倍！";
      }
      this.noticeT = 1.4;
      beep(880, 0.1, "triangle", 0.045);
      setTimeout(() => beep(1320, 0.12, "triangle", 0.04), 70);
    },

    breakCombo() {
      if (this.combo >= 8) {
        this.floatTexts.push({
          x: this.player.x + 20,
          y: this.player.y - 10,
          text: "コンボ " + this.combo + " きずつ…",
          life: 1,
          max: 1,
          c: "#ff8fb8",
        });
      }
      this.combo = 0;
      this.comboTimer = 0;
      if (this.feverActive) {
        this.feverActive = false;
        this.fever = 0;
      } else {
        this.fever = Math.max(0, this.fever - 0.35);
      }
    },

    async gameOver() {
      if (this.state !== "playing") return;
      this.state = "over";
      this.shake = 14;
      this.hitFlash = 1;
      this.breakCombo();
      Music.setMode("over");
      setTimeout(() => {
        if (this.state === "over") Music.setMode("menu");
      }, 900);
      beep(220, 0.15, "sawtooth", 0.04);
      setTimeout(() => beep(160, 0.25, "sawtooth", 0.03), 120);

      const final = Math.floor(this.score);
      bumpMission("bestRunScore", final, true);
      const rec = recordScore(final);
      this._todayNew = rec.todayNew;
      this._rank = rec.rank;
      const gained = Math.floor(this.coinCount * (1 + Playables.upCoin * 0.15) * equipAbil().coin);
      this._runCoinGain = gained;
      this._doubleUsed = false;
      await Playables.addCoins(gained);
      if (final > Playables.bestScore) {
        Playables.bestScore = final;
        // ベスト更新時にゴーストを保存
        if (this._ghostRec && this._ghostRec.length > 10) {
          Playables.ghost = { score: final, ys: this._ghostRec.slice(0, 250) };
        }
        await Playables.persist();
      }
      checkBadges(this);
      this._overCount++;
      if (this._overCount % 3 === 0) {
        await Playables.showInterstitial();
      }
    },

    async doubleCoinsWithAd() {
      if (this.state !== "over") return;
      if (this._doubleUsed || !this._runCoinGain) return;
      const ok = await Playables.showRewarded();
      if (!ok) {
        this.notice = t("needCoins");
        this.noticeT = 1;
        return;
      }
      this._doubleUsed = true;
      await Playables.addCoins(this._runCoinGain);
      this.notice = t("doubleDone") + " +" + this._runCoinGain + "C";
      this.noticeT = 1.8;
      beep(880, 0.08, "triangle", 0.045);
      setTimeout(() => beep(1175, 0.12, "triangle", 0.04), 90);
    },

    async continueWithAd() {
      const ok = await Playables.showRewarded();
      if (!ok) return;
      this.state = "playing";
      const p = this.player;
      p.y = this.groundY - p.h - 20;
      p.vy = 0;
      p.onGround = true;
      p.jumps = 0;
      p.invuln = 2.5;
      Music.setMode("play");
      this.obstacles = this.obstacles.filter((o) => o.x > this.player.x + 220);
      this.speed = this.baseSpeed * 0.8;
      this.shield = Math.max(this.shield, 1);
      this.notice = "がんばれ！";
      this.noticeT = 1.2;
      beep(880, 0.12, "triangle", 0.05);
    },

    /** 所持済みは装備、未所持は詳細フォーカス（即購入しない） */
    focusSkin(i) {
      this.shopFocus = i;
      const s = SKINS[i];
      if (!s) return;
      if (Playables.owned[i]) {
        if (Playables.skin !== i) {
          Playables.skin = i;
          Playables.persist();
          this.notice = s.name + " にきめた！";
          this.noticeT = 1.2;
          beep(660, 0.08, "triangle", 0.04);
          setTimeout(() => beep(880, 0.1, "triangle", 0.04), 80);
        }
      }
      // 未所持はフォーカスのみ（下の「かいとる」で確定）
    },

    confirmBuySkin() {
      const i = this.shopFocus;
      const s = SKINS[i];
      if (!s || Playables.owned[i]) return;
      if (Playables.totalCoins < s.cost) {
        this.notice = t("needCoins");
        this.noticeT = 1.2;
        beep(200, 0.1, "sine", 0.03);
        return;
      }
      Playables.totalCoins -= s.cost;
      Playables.owned[i] = true;
      Playables.skin = i;
      Playables.persist();
      this.notice = s.name + (Playables.lang === "en" ? " unlocked!" : " をかいとった！");
      this.noticeT = 1.5;
      beep(660, 0.08, "triangle", 0.04);
      setTimeout(() => beep(880, 0.1, "triangle", 0.04), 80);
      setTimeout(() => beep(1175, 0.12, "triangle", 0.035), 160);
    },

    buyEquip(slot, idx) {
      const list =
        slot === "hat" ? EQUIP_HAT : slot === "trail" ? EQUIP_TRAIL : EQUIP_CHARM;
      const item = list[idx];
      if (!item) return;
      const ownedKey = slot === "hat" ? "hat" : slot === "trail" ? "trail" : "charm";
      if (!Playables.ownedEquip[ownedKey]) Playables.ownedEquip[ownedKey] = [true, false, false, false];
      Playables.ownedEquip[ownedKey][0] = true;
      if (!Playables.ownedEquip[ownedKey][idx]) {
        if (Playables.totalCoins < item.cost) {
          this.notice = t("needCoins");
          this.noticeT = 1.2;
          beep(200, 0.1, "sine", 0.03);
          return;
        }
        Playables.totalCoins -= item.cost;
        Playables.ownedEquip[ownedKey][idx] = true;
        this.notice =
          (Playables.lang === "en" ? item.en : item.ja) +
          (Playables.lang === "en" ? " unlocked!" : " をかいとった！");
        this.noticeT = 1.4;
        beep(660, 0.08, "triangle", 0.04);
        setTimeout(() => beep(880, 0.1, "triangle", 0.04), 80);
      }
      if (slot === "hat") Playables.equipHat = idx;
      else if (slot === "trail") Playables.equipTrail = idx;
      else Playables.equipCharm = idx;
      Playables.persist();
    },

    buyUpgrade(kind) {
      const costs = [30, 80, 160, 300];
      const key = kind === "jump" ? "upJump" : kind === "coin" ? "upCoin" : "upStart";
      const lv = Playables[key];
      if (lv >= 3) {
        this.notice = "MAX だよ";
        this.noticeT = 1;
        return;
      }
      const cost = costs[lv];
      if (Playables.totalCoins < cost) {
        this.notice = "コイン " + cost + " ひつよう";
        this.noticeT = 1.2;
        beep(200, 0.1, "sine", 0.03);
        return;
      }
      Playables.totalCoins -= cost;
      Playables[key] = lv + 1;
      Playables.persist();
      this.notice = "レベルアップ！";
      this.noticeT = 1.2;
      beep(784, 0.08, "triangle", 0.04);
      setTimeout(() => beep(1046, 0.12, "triangle", 0.04), 80);
    },

    claimLogin() {
      if (!Playables.loginPending) {
        this.showLogin = false;
        return;
      }
      const got = claimLoginBonus();
      const day = Playables.loginDay || 1;
      this.showLogin = false;
      if (got) {
        this.notice =
          (Playables.lang === "en" ? "Day " + day + " +" : day + " 日目 +") + got + "C";
        this.noticeT = 1.8;
      }
    },

    setPaused(v) {
      this._forcePause = v;
    },
    setAudioEnabled(v) {
      Playables.audioEnabled = v;
      Music.setEnabled(v);
    },

    setLang(lang) {
      if (lang !== "ja" && lang !== "en") return;
      if (Playables.lang === lang) return;
      Playables.lang = lang;
      Playables._langSaved = true;
      Playables.persist();
      ensureDailyMissions();
      for (const m of dailyMissions) {
        const def = MISSION_DEFS.find((d) => d.type === m.type);
        if (def) m.label = def.label(m.target);
      }
      Game.notice = lang === "en" ? "Language: English" : "ことば: 日本語";
      Game.noticeT = 1.3;
      beep(660, 0.06, "sine", 0.03);
    },

    toggleLang() {
      this.setLang(Playables.lang === "ja" ? "en" : "ja");
    },

    toggleMute() {
      Music.toggleMute();
    },

    spawnCameo(forcedType) {
      const roll = Math.random();
      let type = forcedType || "cat";
      if (!forcedType) {
        if (roll < 0.12) type = "ojisan";
        else if (roll < 0.3) type = "grandma";
        else if (roll < 0.48) type = "frog";
        else if (roll < 0.66) type = "chicken";
        else if (roll < 0.82) type = "robot";
        else if (roll < 0.92) type = "salaryman";
        else type = "cat";
      }
      const fromLeft = Math.random() < 0.5;
      const scale = type === "ojisan" ? 1.15 : 0.85 + Math.random() * 0.25;
      this.cameos.push({
        type,
        x: fromLeft ? -80 : W + 80,
        y: this.groundY - 8,
        vx: (fromLeft ? 1 : -1) * (this.speed * 0.55 + 40 + Math.random() * 50),
        scale,
        bob: Math.random() * 6,
        bobSpeed: 6 + Math.random() * 4,
        frame: 0,
        dropsCoins: type === "ojisan" || type === "grandma",
      });
      if (type === "ojisan") {
        // ★イベント化：おじさんボーナス
        this._sawUncle = true;
        this.notice = t("ojisanBonus");
        this.noticeT = 2.4;
        this.magnet = Math.max(this.magnet, 6);
        this.shield = Math.max(this.shield, 1);
        this.shake = Math.max(this.shake, 5);
        this.speedLines = 1;
        this.addScore(50, W / 2, H * 0.3, "+50 " + t("ojisanBonus"), "#ffd56a");
        // コインの雨
        for (let i = 0; i < 12; i++) {
          this.coins.push({
            x: W + 20 + Math.random() * 120 + i * 22,
            y: this.groundY - 40 - Math.random() * 140,
            r: 12,
            spin: Math.random() * 6,
            got: false,
          });
        }
        beep(392, 0.08, "triangle", 0.05);
        setTimeout(() => beep(523, 0.1, "triangle", 0.05), 90);
        setTimeout(() => beep(659, 0.12, "triangle", 0.045), 180);
        setTimeout(() => beep(784, 0.16, "triangle", 0.04), 280);
      } else if (Math.random() < 0.35) {
        const lines = {
          cat: "にゃーん",
          grandma: "がんばって〜",
          frog: "けろっ",
          chicken: "コケッ！",
          robot: "ブーッ",
          salaryman: "おつかれ…",
        };
        this.notice = lines[type] || "";
        this.noticeT = 1.3;
      }
    },

    // ---------- update ----------
    update(dt) {
      this.time += dt;
      this.shake = Math.max(0, this.shake - dt * 30);
      this.hitFlash = Math.max(0, this.hitFlash - dt * 2);
      if (this.noticeT > 0) this.noticeT -= dt;
      if (this.milestoneT > 0) this.milestoneT -= dt;
      this.speedLines = Math.max(0, this.speedLines - dt * 2.5);

      // スローモーション
      if (this.slowmo > 0) {
        this.slowmo -= dt;
        if (this.slowmo <= 0) this.timeScale = 1;
        else this.timeScale = 0.35 + (1 - this.slowmo / 0.38) * 0.2;
      }

      for (const c of this.clouds) {
        c.x -= c.v * dt * (this.state === "playing" ? this.speed / this.baseSpeed : 0.4);
        if (c.x < -120 * c.s) {
          c.x = W + 40;
          c.y = H * 0.12 + Math.random() * H * 0.28;
          c.s = 0.6 + Math.random() * 0.9;
        }
      }

      if (this.state !== "playing" || this._forcePause) {
        if (this.state === "menu" || this.state === "shop") {
          this.player.y = this.groundY - this.player.h + Math.sin(this.time * 3) * 6;
        }
        return;
      }

      // プレイ中だけ timeScale 適用
      const gdt = dt * this.timeScale;
      this._runTime = (this._runTime || 0) + gdt;

      const p = this.player;
      p.invuln = Math.max(0, p.invuln - dt);
      this.dash = Math.max(0, this.dash - dt);
      this.dashCd = Math.max(0, this.dashCd - dt);

      // ゴースト記録（0.12s間隔・最大250サンプル ≈ 30秒）
      this._ghostAcc += gdt;
      if (this._ghostAcc >= 0.12) {
        this._ghostAcc = 0;
        if (this._ghostRec.length < 250) {
          this._ghostRec.push(Math.round(p.y));
        }
      }

      // 残像（ダッシュ中だけ・上限あり）
      if (this.dash > 0 || p.diving) {
        if (this.afterimages.length < 12 && Math.random() < 0.7) {
          this.afterimages.push({ x: p.x, y: p.y, life: 0.18, max: 0.18 });
        }
      }
      for (let i = this.afterimages.length - 1; i >= 0; i--) {
        this.afterimages[i].life -= dt;
        if (this.afterimages[i].life <= 0) this.afterimages.splice(i, 1);
      }

      // スコア距離
      this.score += gdt * (10 + this.speed * 0.01) * (this.feverActive ? 2 : 1) * (this.doublePts > 0 ? 2 : 1);
      this.displayScore += (this.score - this.displayScore) * Math.min(1, dt * 8);
      bumpMission("bestRunScore", Math.floor(this.score), true);
      this.speed = this.baseSpeed + this.score * 1.55;
      this.speed = Math.min(this.speed, this.baseSpeed * (this.feverActive ? 2.9 : 2.35));
      if (this.dash > 0) this.speed *= 1.35;
      this.worldOffset += this.speed * gdt;

      // マイルストーン
      const ms = Math.floor(this.score / 250);
      if (ms > this.milestone && ms > 0) {
        this.milestone = ms;
        this.milestoneMsg =
          Playables.lang === "en" ? ms * 250 + " points!" : ms * 250 + " 点きた！";
        this.milestoneT = 1.5;
        this.addScore(50, W / 2, H * 0.3, "+50 ボーナス", "#7dffa8");
        beep(1046, 0.08, "triangle", 0.04);
      }

      // コンボタイマー（残り少ないと赤く）
      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0 && this.combo > 0) {
          this.breakCombo();
        }
      }
      // フィーバー時間
      if (this.feverActive) {
        this.fever -= dt * 0.2;
        if (this.fever <= 0) {
          this.feverActive = false;
          this.fever = 0;
          if (this.state === "playing") Music.setMode("play");
        }
      }
      if (this.magnet > 0) this.magnet -= dt;
      if (this.doublePts > 0) this.doublePts -= dt;
      checkBadges(this);

      // 物理
      const gravity = Math.min(2200, H * 3.2);
      p.vy += gravity * gdt * (p.diving ? 1.6 : 1);
      p.y += p.vy * gdt;
      const floor = this.groundY - p.h;
      if (p.y >= floor) {
        if (!p.onGround && p.vy > 200) {
          p.squash = 1;
          // ダッシュ着地は衝撃波
          if (p.diving) {
            this.shake = 10;
            this.addScore(10, p.x, p.y - 20, t("land"), "#ffd56a");
            beep(90, 0.12, "square", 0.045);
            for (let i = 0; i < 14; i++) {
              const a = Math.PI + (Math.random() * Math.PI);
              this.particles.push({
                x: p.x + p.w / 2,
                y: this.groundY,
                vx: Math.cos(a) * 160,
                vy: Math.sin(a) * 80,
                life: 0.4,
                max: 0.4,
                c: "#ffe0a0",
                r: 3 + Math.random() * 3,
              });
            }
            // 近くの水たまりは破壊
            for (let i = this.obstacles.length - 1; i >= 0; i--) {
              const o = this.obstacles[i];
              if (o.kind === "puddle" && Math.abs(o.x - p.x) < 70) {
                this.obstacles.splice(i, 1);
                this.addScore(30, o.x, o.y, "ぶっこわし +30", "#7dffa8");
              }
            }
          } else {
            for (let i = 0; i < 5; i++) {
              this.particles.push({
                x: p.x + p.w / 2 + (Math.random() - 0.5) * 20,
                y: this.groundY,
                vx: (Math.random() - 0.5) * 60,
                vy: -Math.random() * 50,
                life: 0.3,
                max: 0.3,
                c: "#ffe0ec",
                r: 2 + Math.random() * 3,
              });
            }
          }
        }
        p.y = floor;
        p.vy = 0;
        p.onGround = true;
        p.jumps = 0;
        p.diving = false;
      }
      p.squash = Math.max(0, p.squash - dt * 4);
      p.blink += dt;

      // ハイリスク帯（スコア 200 以降に稀に出現）
      if (this.score > 200 && !this._riskActive && Math.random() < dt * 0.08) {
        this._riskActive = 2.5;
        this.notice = Playables.lang === "en" ? "RISK ZONE! High coins" : "ハイリスク帯！ コインが多い";
        this.noticeT = 1.6;
        beep(330, 0.1, "sawtooth", 0.04);
        for (let i = 0; i < 10; i++) {
          this.coins.push({
            x: W + 40 + i * 30,
            y: this.groundY - 50 - (i % 3) * 36,
            r: 13,
            spin: Math.random() * 6,
            got: false,
          });
        }
        // 障害物も多め
        for (let i = 0; i < 2; i++) {
          this.obstacles.push({
            kind: i === 0 ? "rock" : "bush",
            x: W + 80 + i * 120,
            y: this.groundY - (i === 0 ? 42 : 36),
            w: i === 0 ? 34 : 40,
            h: i === 0 ? 42 : 36,
            passed: false,
            nearDone: false,
          });
        }
      }
      if (this._riskActive > 0) this._riskActive -= dt;

      // 障害物
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        const gap = 0.95 + Math.random() * 0.55 - Math.min(0.4, this.score / 1800);
        this.spawnTimer = Math.max(0.55, gap);
        const kinds = ["bush", "rock", "puddle"];
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        let w = 40,
          h = 36;
        if (kind === "rock") {
          w = 34;
          h = 42;
        }
        if (kind === "puddle") {
          w = 70;
          h = 18;
        }
        this.obstacles.push({
          kind,
          x: W + 30,
          y: this.groundY - h,
          w,
          h,
          passed: false,
          nearDone: false,
        });
        if (Math.random() < 0.75) {
          const n = 3 + Math.floor(Math.random() * 4);
          const arc = Math.random() < 0.5;
          const baseY = this.groundY - (arc ? 95 : 55) - Math.random() * 40;
          for (let i = 0; i < n; i++) {
            const t = n === 1 ? 0.5 : i / (n - 1);
            const lift = arc ? Math.sin(t * Math.PI) * 40 : 0;
            this.coins.push({
              x: W + 40 + i * 34,
              y: baseY - lift,
              r: 12,
              spin: Math.random() * Math.PI * 2,
              got: false,
            });
          }
        }
      }

      const hitPad = 8;
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const o = this.obstacles[i];
        o.x -= this.speed * gdt;

        // ニアミス判定（すれ違い）→ スローモーション
        if (!o.nearDone && o.x + o.w < p.x) {
          o.nearDone = true;
          const py = p.y + p.h / 2;
          const oy = o.y + o.h / 2;
          const distY = Math.abs(py - oy);
          const gapX = p.x - (o.x + o.w);
          const nearWin = (o.h + 24) * skinAbil().near;
          if (gapX < 20 * skinAbil().near && distY < nearWin) {
            this.nearMisses++;
            this.addScore(35, p.x + 30, p.y - 10, t("nearMiss") + " +35", "#7dffa8");
            this.fever = Math.min(1, this.fever + 0.15);
            bumpMission("near", 1);
            this.triggerSlowmo();
          }
        }

        // ダッシュ中は茂み・水たまりを破壊
        if (p.diving && o.kind !== "rock") {
          if (
            p.x + hitPad < o.x + o.w &&
            p.x + p.w - hitPad > o.x &&
            p.y + hitPad < o.y + o.h + 10 &&
            p.y + p.h > o.y - 10
          ) {
            this.obstacles.splice(i, 1);
            this.addScore(25, o.x, o.y, t("smash") + " +25", "#ffd56a");
            bumpMission("smash", 1);
            this.shake = Math.max(this.shake, 6);
            beep(200, 0.08, "square", 0.04);
            continue;
          }
        }

        if (
          p.invuln <= 0 &&
          p.x + hitPad < o.x + o.w - 4 &&
          p.x + p.w - hitPad > o.x + 4 &&
          p.y + hitPad < o.y + o.h &&
          p.y + p.h - hitPad > o.y + 2
        ) {
          if (this.shield > 0) {
            this.shield = 0;
            p.invuln = 1.2;
            this.shake = 8;
            this.breakCombo();
            this.obstacles.splice(i, 1);
            this.notice = "シールドでしのいだ！";
            this.noticeT = 1.2;
            beep(300, 0.12, "square", 0.04);
            continue;
          }
          this.gameOver();
          return;
        }

        if (!o.passed && o.x + o.w < p.x) {
          o.passed = true;
          this.addScore(5, null, null);
        }
        if (o.x + o.w < -40) this.obstacles.splice(i, 1);
      }

      // 飛ぶ鳥（上空の障害物）
      this.birdTimer -= gdt;
      if (this.birdTimer <= 0 && this.score > 80) {
        this.birdTimer = 7 + Math.random() * 6 - Math.min(3, this.score / 400);
        const high = Math.random() < 0.5;
        this.birds.push({
          x: W + 40,
          y: this.groundY - (high ? 120 : 70) - Math.random() * 30,
          w: 36,
          h: 24,
          phase: Math.random() * 6,
          flap: 0,
        });
      }
      for (let i = this.birds.length - 1; i >= 0; i--) {
        const b = this.birds[i];
        b.x -= this.speed * 0.95 * gdt;
        b.phase += gdt * 8;
        b.y += Math.sin(b.phase) * 28 * gdt;
        b.flap = Math.sin(b.phase * 2);

        if (
          p.invuln <= 0 &&
          p.x + hitPad < b.x + b.w - 4 &&
          p.x + p.w - hitPad > b.x + 4 &&
          p.y + hitPad < b.y + b.h &&
          p.y + p.h - hitPad > b.y + 2
        ) {
          if (p.diving) {
            // ダッシュで鳥を追い払える
            this.birds.splice(i, 1);
            this.addScore(40, b.x, b.y, "とりをよけた +40", "#7dffa8");
            this.shake = 6;
            beep(900, 0.06, "square", 0.035);
            continue;
          }
          if (this.shield > 0) {
            this.shield = 0;
            p.invuln = 1.2;
            this.shake = 8;
            this.breakCombo();
            this.birds.splice(i, 1);
            this.notice = "シールドでしのいだ！";
            this.noticeT = 1.2;
            continue;
          }
          this.gameOver();
          return;
        }
        if (b.x < -50) this.birds.splice(i, 1);
      }

      // アイテムスポーン
      this.powerTimer -= dt;
      if (this.powerTimer <= 0) {
        this.powerTimer = 10 + Math.random() * 8;
        const kinds = ["magnet", "shield", "double"];
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        this.powerups.push({
          kind,
          x: W + 30,
          y: this.groundY - 70 - Math.random() * 50,
          r: 16,
          spin: 0,
        });
      }
      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const u = this.powerups[i];
        u.x -= this.speed * gdt;
        u.spin += dt * 4;
        const px = p.x + p.w / 2;
        const py = p.y + p.h / 2;
        const dx = px - u.x;
        const dy = py - u.y;
        if (dx * dx + dy * dy < (u.r + 22) * (u.r + 22)) {
          this.applyPowerup(u.kind);
          this.powerups.splice(i, 1);
          continue;
        }
        if (u.x < -40) this.powerups.splice(i, 1);
      }

      // コイン
      this.coinFlash = Math.max(0, this.coinFlash - dt * 3);
      for (let i = this.coins.length - 1; i >= 0; i--) {
        const c = this.coins[i];
        c.x -= this.speed * gdt;
        c.spin += dt * 6;

        // マグネット
        if (this.magnet > 0) {
          const px = p.x + p.w / 2;
          const py = p.y + p.h / 2;
          const dx = px - c.x;
          const dy = py - c.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          if (d < 180) {
            c.x += (dx / d) * 420 * dt;
            c.y += (dy / d) * 420 * dt;
          }
        }

        const px = p.x + p.w / 2;
        const py = p.y + p.h / 2;
        const dx = px - c.x;
        const dy = py - c.y;
        const hitR = c.r + p.w * 0.36;
        if (!c.got && dx * dx + dy * dy < hitR * hitR) {
          c.got = true;
          this.collectCoin(c);
          this.coins.splice(i, 1);
          continue;
        }
        if (c.x < -30) this.coins.splice(i, 1);
      }

      // ゲスト
      this.cameoTimer -= dt;
      if (this.cameoTimer <= 0 && this.cameos.length < 2) {
        this.spawnCameo();
        this.cameoTimer = 6 + Math.random() * 8;
      }
      for (let i = this.cameos.length - 1; i >= 0; i--) {
        const g = this.cameos[i];
        g.x += g.vx * gdt;
        g.bob += dt * g.bobSpeed;
        g.frame += dt * 10;
        if (g.dropsCoins && Math.random() < dt * 2.2) {
          this.coins.push({
            x: g.x + (g.vx > 0 ? -10 : 10),
            y: g.y - 20 - Math.random() * 30,
            r: 11,
            spin: Math.random() * 6,
            got: false,
          });
        }
        if (g.x < -120 || g.x > W + 120) this.cameos.splice(i, 1);
      }

      // パーティクル / テキスト
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.life -= dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vy += 400 * dt;
        if (pt.life <= 0) this.particles.splice(i, 1);
      }
      for (let i = this.floatTexts.length - 1; i >= 0; i--) {
        const f = this.floatTexts[i];
        f.life -= dt;
        f.y -= 40 * dt;
        if (f.life <= 0) this.floatTexts.splice(i, 1);
      }

      // トレイル演出
      const trailId = EQUIP_TRAIL[Playables.equipTrail] || EQUIP_TRAIL[0];
      if (trailId.id === "star" || trailId.id === "heart") {
        if (Math.random() < 0.55) {
          this.particles.push({
            x: p.x + 10,
            y: p.y + p.h * 0.5,
            vx: -30 - Math.random() * 40,
            vy: (Math.random() - 0.5) * 30,
            life: 0.45,
            max: 0.45,
            c: trailId.color || "#ffe066",
            r: 3 + Math.random() * 3,
          });
        }
      }

      if (p.onGround && Math.random() < 0.3) {
        this.particles.push({
          x: p.x + 8,
          y: this.groundY - 2,
          vx: -40 - Math.random() * 40,
          vy: -10 - Math.random() * 20,
          life: 0.25,
          max: 0.25,
          c: this.feverActive ? "#ffe066" : "#ffd8e8",
          r: 2 + Math.random() * 2,
        });
      }
    },

    // ---------- draw ----------
    draw() {
      ctx.save();
      if (this.shake > 0) {
        ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
      }

      const sky = ctx.createLinearGradient(0, 0, 0, H);
      if (this.feverActive) {
        sky.addColorStop(0, "#ffd0f0");
        sky.addColorStop(0.5, "#ffe0a0");
        sky.addColorStop(1, "#ffb8d0");
      } else {
        sky.addColorStop(0, "#b8e0ff");
        sky.addColorStop(0.45, "#ffd6ec");
        sky.addColorStop(1, "#ffe8c8");
      }
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "rgba(255,240,180,0.9)";
      ctx.beginPath();
      ctx.arc(W * 0.82, H * 0.18, Math.min(W, H) * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.arc(W * 0.82, H * 0.18, Math.min(W, H) * 0.1, 0, Math.PI * 2);
      ctx.fill();

      for (const c of this.clouds) this.drawCloud(c.x, c.y, c.s);
      this.drawHills(true);
      this.drawHills(false);
      for (const g of this.cameos) this.drawCameo(g);

      // 地面
      const gy = this.groundY;
      ctx.fillStyle = this.feverActive ? "#b8f0c8" : "#a8e6c8";
      ctx.fillRect(0, gy, W, H - gy);
      ctx.fillStyle = "#7dcfad";
      ctx.fillRect(0, gy, W, 8);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      const stripe = 48;
      const off = this.worldOffset % stripe;
      for (let x = -stripe; x < W + stripe; x += stripe) {
        ctx.fillRect(x - off, gy + 18, stripe * 0.45, 6);
      }

      for (const u of this.powerups) this.drawPowerup(u);
      for (const c of this.coins) this.drawCoin(c);
      for (const o of this.obstacles) this.drawObstacle(o);
      for (const b of this.birds) this.drawBird(b);

      if (this.state === "playing") this.drawGhost();

      // 残像
      for (const a of this.afterimages) {
        const t = a.life / a.max;
        ctx.globalAlpha = t * 0.35;
        const skin = SKINS[Playables.skin] || SKINS[0];
        ctx.fillStyle = skin.body[2];
        ctx.beginPath();
        ctx.arc(a.x + 22, a.y + 22, 18 * (0.6 + t * 0.4), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (this.state !== "over" || this.time % 0.2 < 0.12) {
        this.drawPlayer();
      }

      // スピードライン
      if (this.speedLines > 0.05 || this.feverActive || this.speed > this.baseSpeed * 1.6) {
        const intensity = this.feverActive ? 1 : this.speedLines;
        ctx.strokeStyle = `rgba(255,255,255,${0.15 + intensity * 0.35})`;
        ctx.lineWidth = 2;
        const n = this.feverActive ? 14 : 8;
        for (let i = 0; i < n; i++) {
          const y = (H * (i + 0.5)) / n + Math.sin(this.time * 10 + i) * 8;
          const len = 40 + Math.random() * 80 * intensity;
          const x = W - ((this.worldOffset * (1.2 + i * 0.1)) % (W + len));
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - len, y);
          ctx.stroke();
        }
      }

      // スローモ・フィーバーの枠
      if (this.slowmo > 0) {
        ctx.fillStyle = `rgba(125,255,168,${this.slowmo * 0.25})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (this.feverActive) {
        const pulse = 0.35 + Math.sin(this.time * 8) * 0.15;
        ctx.strokeStyle = `rgba(255,200,60,${pulse})`;
        ctx.lineWidth = 8;
        ctx.strokeRect(4, 4, W - 8, H - 8);
      }

      for (const pt of this.particles) {
        const a = pt.life / pt.max;
        ctx.globalAlpha = a;
        ctx.fillStyle = pt.c;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.r * (0.5 + a * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      for (const f of this.floatTexts) {
        const a = f.life / f.max;
        ctx.globalAlpha = a;
        ctx.fillStyle = f.c;
        ctx.font = `bold ${Math.min(16, W * 0.038)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(f.text, f.x, f.y);
        ctx.globalAlpha = 1;
      }

      this.drawUI();
      if (this.showLogin && this.state === "menu") this.drawLoginBonus();
      ctx.restore();
    },

    drawCloud(x, y, s) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      const r = 22 * s;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.arc(x + r * 0.9, y + 4 * s, r * 0.75, 0, Math.PI * 2);
      ctx.arc(x - r * 0.9, y + 6 * s, r * 0.7, 0, Math.PI * 2);
      ctx.arc(x + r * 0.2, y - r * 0.55, r * 0.65, 0, Math.PI * 2);
      ctx.fill();
    },

    drawHills(far) {
      const layer = far ? 0 : 1;
      ctx.fillStyle = far ? "#c8f0e0" : "#9adfc0";
      for (const h of this.hills) {
        if (h.layer !== layer) continue;
        const speed = far ? 0.15 : 0.35;
        let x = h.x - ((this.worldOffset * speed) % (W * 1.2));
        while (x < -h.w) x += W * 1.2;
        while (x > W) x -= W * 1.2;
        ctx.beginPath();
        ctx.ellipse(x + h.w / 2, this.groundY + 10, h.w / 2, h.h, 0, Math.PI, 0);
        ctx.fill();
      }
    },

    drawPowerup(u) {
      ctx.save();
      ctx.translate(u.x, u.y + Math.sin(u.spin) * 6);
      const pulse = 1 + Math.sin(u.spin * 2) * 0.08;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      if (u.kind === "magnet") {
        ctx.fillStyle = "#ff6b8a";
        ctx.beginPath();
        ctx.arc(0, 0, 14, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillRect(-14, 0, 6, 8);
        ctx.fillRect(8, 0, 6, 8);
        ctx.fillStyle = "#6bb6ff";
        ctx.fillRect(-14, 8, 6, 5);
        ctx.fillRect(8, 8, 6, 5);
      } else if (u.kind === "shield") {
        ctx.fillStyle = "#6bb6ff";
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(14, -8);
        ctx.lineTo(14, 6);
        ctx.lineTo(0, 16);
        ctx.lineTo(-14, 6);
        ctx.lineTo(-14, -8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(8, -5);
        ctx.lineTo(0, 8);
        ctx.lineTo(-8, -5);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = "#ffd56a";
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#c48a1a";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("2", 0, 1);
        ctx.textBaseline = "alphabetic";
      }
      ctx.restore();
    },

    drawCoin(c) {
      const squash = Math.abs(Math.cos(c.spin));
      const rx = c.r * (0.35 + squash * 0.65);
      const ry = c.r;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.fillStyle = this.feverActive ? "rgba(255,230,80,0.3)" : "rgba(255,220,120,0.25)";
      ctx.beginPath();
      ctx.arc(0, 0, c.r * 1.35, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createLinearGradient(-rx, -ry, rx, ry);
      g.addColorStop(0, "#ffe9a0");
      g.addColorStop(0.45, "#ffd56a");
      g.addColorStop(1, "#f0a93a");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#e09520";
      ctx.lineWidth = 2;
      ctx.stroke();
      if (squash > 0.45) {
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -ry * 0.45);
        ctx.lineTo(0, ry * 0.45);
        ctx.stroke();
      }
      ctx.restore();
    },

    drawObstacle(o) {
      ctx.save();
      if (o.kind === "bush") {
        const g = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.h);
        g.addColorStop(0, "#7dcea0");
        g.addColorStop(1, "#52b788");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(o.x + o.w * 0.3, o.y + o.h * 0.55, o.w * 0.32, 0, Math.PI * 2);
        ctx.arc(o.x + o.w * 0.7, o.y + o.h * 0.55, o.w * 0.32, 0, Math.PI * 2);
        ctx.arc(o.x + o.w * 0.5, o.y + o.h * 0.35, o.w * 0.36, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffb7c5";
        ctx.beginPath();
        ctx.arc(o.x + o.w * 0.35, o.y + o.h * 0.25, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (o.kind === "rock") {
        ctx.fillStyle = "#b8a9d4";
        ctx.beginPath();
        ctx.moveTo(o.x + o.w * 0.5, o.y);
        ctx.lineTo(o.x + o.w, o.y + o.h);
        ctx.lineTo(o.x, o.y + o.h);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.beginPath();
        ctx.moveTo(o.x + o.w * 0.5, o.y + 4);
        ctx.lineTo(o.x + o.w * 0.7, o.y + o.h * 0.45);
        ctx.lineTo(o.x + o.w * 0.4, o.y + o.h * 0.4);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = "#7ec8e8";
        ctx.beginPath();
        ctx.ellipse(o.x + o.w / 2, o.y + o.h * 0.6, o.w / 2, o.h * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.beginPath();
        ctx.ellipse(o.x + o.w * 0.35, o.y + o.h * 0.45, o.w * 0.15, o.h * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },

    drawBird(b) {
      ctx.save();
      ctx.translate(b.x + b.w / 2, b.y + b.h / 2);
      // 体
      ctx.fillStyle = "#8a7aaa";
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      // 翼
      ctx.fillStyle = "#b8a9d4";
      const wing = b.flap * 10;
      ctx.beginPath();
      ctx.ellipse(-2, -4 - wing * 0.3, 12, 5 + Math.abs(wing) * 0.3, -0.4, 0, Math.PI * 2);
      ctx.ellipse(4, 2 + wing * 0.2, 10, 4, 0.3, 0, Math.PI * 2);
      ctx.fill();
      // 目
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(8, -2, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2a2a2a";
      ctx.beginPath();
      ctx.arc(9, -2, 1.8, 0, Math.PI * 2);
      ctx.fill();
      // くちばし
      ctx.fillStyle = "#f0a93a";
      ctx.beginPath();
      ctx.moveTo(14, -1);
      ctx.lineTo(22, 1);
      ctx.lineTo(14, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },

    drawPlayer() {
      const p = this.player;
      const skin = SKINS[Playables.skin] || SKINS[0];
      const sq = p.squash;
      const sx = 1 + sq * 0.25;
      const sy = 1 - sq * 0.2;
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      const flash = p.invuln > 0 && Math.floor(p.invuln * 10) % 2 === 0;

      ctx.save();
      if (flash) ctx.globalAlpha = 0.45;
      ctx.translate(cx, cy);
      ctx.scale(sx, sy);
      ctx.translate(-cx, -cy);

      this.drawEvoFx(cx, cy, p.w * 0.5, skinStage(Playables.skin));

      // フィーバー光
      if (this.feverActive) {
        ctx.fillStyle = "rgba(255,220,80,0.25)";
        ctx.beginPath();
        ctx.arc(cx, cy, p.w * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      // 影
      ctx.fillStyle = "rgba(80,60,100,0.15)";
      ctx.beginPath();
      const shY = this.groundY + 4;
      const shScale = Math.max(0.4, 1 - (this.groundY - (p.y + p.h)) / 160);
      ctx.ellipse(cx, shY, p.w * 0.45 * shScale, 6 * shScale, 0, 0, Math.PI * 2);
      ctx.fill();

      // 体
      const body = ctx.createRadialGradient(cx - 8, cy - 10, 4, cx, cy, p.w * 0.55);
      body.addColorStop(0, skin.body[0]);
      body.addColorStop(0.5, skin.body[1]);
      body.addColorStop(1, skin.body[2]);
      ctx.fillStyle = body;
      if (p.diving) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(0.55);
        ctx.translate(-cx, -cy);
        ctx.beginPath();
        ctx.arc(cx, cy, p.w * 0.48, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(cx, cy, p.w * 0.48, 0, Math.PI * 2);
        ctx.fill();
      }

      // シールド
      if (this.shield > 0) {
        ctx.strokeStyle = "rgba(107,182,255,0.85)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, p.w * 0.58, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(107,182,255,0.12)";
        ctx.fill();
      }

      ctx.fillStyle = skin.cheek;
      ctx.beginPath();
      ctx.ellipse(cx - 12, cy + 6, 5, 3, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 12, cy + 6, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      const blink = Math.sin(p.blink * 2) > 0.98;
      ctx.fillStyle = "#4a3a5a";
      if (blink) {
        ctx.fillRect(cx - 12, cy - 4, 8, 2);
        ctx.fillRect(cx + 4, cy - 4, 8, 2);
      } else {
        ctx.beginPath();
        ctx.arc(cx - 8, cy - 2, 4, 0, Math.PI * 2);
        ctx.arc(cx + 8, cy - 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(cx - 6.5, cy - 3.5, 1.5, 0, Math.PI * 2);
        ctx.arc(cx + 9.5, cy - 3.5, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = "#4a3a5a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (this.state === "over") {
        ctx.arc(cx, cy + 12, 4, Math.PI * 0.15, Math.PI * 0.85, true);
      } else {
        ctx.arc(cx, cy + 6, 5, 0.15, Math.PI - 0.15);
      }
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(cx - 4, cy - p.w * 0.42, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffb703";
      ctx.beginPath();
      ctx.arc(cx - 4, cy - p.w * 0.42, 2.5, 0, Math.PI * 2);
      ctx.fill();

      if (p.onGround && this.state === "playing") {
        const run = Math.sin(this.time * 18);
        ctx.fillStyle = skin.body[2];
        ctx.beginPath();
        ctx.ellipse(cx - 10 + run * 3, p.y + p.h - 2, 7, 5, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 10 - run * 3, p.y + p.h - 2, 7, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = skin.body[2];
        ctx.beginPath();
        ctx.ellipse(cx - 10, p.y + p.h - 4, 7, 5, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + 10, p.y + p.h - 4, 7, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 装備：ぼうし
      const hat = EQUIP_HAT[Playables.equipHat] || EQUIP_HAT[0];
      if (hat.id === "ribbon") {
        ctx.fillStyle = hat.color;
        ctx.beginPath();
        ctx.moveTo(cx - 14, cy - p.w * 0.42);
        ctx.lineTo(cx - 22, cy - p.w * 0.55);
        ctx.lineTo(cx - 18, cy - p.w * 0.35);
        ctx.moveTo(cx + 14, cy - p.w * 0.42);
        ctx.lineTo(cx + 22, cy - p.w * 0.55);
        ctx.lineTo(cx + 18, cy - p.w * 0.35);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy - p.w * 0.45, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (hat.id === "cap") {
        ctx.fillStyle = hat.color;
        ctx.beginPath();
        ctx.arc(cx, cy - p.w * 0.38, p.w * 0.32, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(cx - 2, cy - p.w * 0.38, 18, 5);
      } else if (hat.id === "crown") {
        ctx.fillStyle = hat.color;
        ctx.beginPath();
        ctx.moveTo(cx - 14, cy - p.w * 0.42);
        ctx.lineTo(cx - 12, cy - p.w * 0.62);
        ctx.lineTo(cx - 4, cy - p.w * 0.48);
        ctx.lineTo(cx, cy - p.w * 0.68);
        ctx.lineTo(cx + 4, cy - p.w * 0.48);
        ctx.lineTo(cx + 12, cy - p.w * 0.62);
        ctx.lineTo(cx + 14, cy - p.w * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ff8fb8";
        ctx.beginPath();
        ctx.arc(cx, cy - p.w * 0.5, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    },

    /** ベスト走行のゴースト（後ろに薄く表示・残像と区別） */
    drawGhost() {
      const g = Playables.ghost;
      if (!g || !g.ys || !g.ys.length) return;
      const rt = this._runTime || 0;
      // 開始直後は出さない（残像と混ざるため）
      if (rt < 0.8) return;
      const idx = Math.floor(rt / 0.12);
      if (idx >= g.ys.length) return;
      const y = g.ys[idx];
      const p = this.player;
      // 本体より少し後ろ・半透明の輪郭だけ
      const x = p.x - 36;
      const fade = idx > g.ys.length - 8 ? (g.ys.length - idx) / 8 : 1;
      ctx.save();
      ctx.globalAlpha = 0.22 * fade;
      ctx.strokeStyle = "rgba(120,160,220,0.95)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(x + p.w / 2, y + p.h / 2, p.w * 0.44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(120,160,220,0.35)";
      ctx.beginPath();
      ctx.arc(x + p.w / 2, y + p.h / 2, p.w * 0.42, 0, Math.PI * 2);
      ctx.fill();
      // 目だけ薄く
      ctx.fillStyle = "rgba(70,90,130,0.5)";
      ctx.beginPath();
      ctx.arc(x + p.w / 2 - 6, y + p.h / 2 - 2, 2, 0, Math.PI * 2);
      ctx.arc(x + p.w / 2 + 6, y + p.h / 2 - 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },

    /** スキン進化のオーラ（preview / player 共用） */
    drawEvoFx(cx, cy, r, stage) {
      if (stage <= 0) return;
      ctx.save();
      if (stage >= 1) {
        ctx.strokeStyle = `rgba(255,200,80,${0.25 + stage * 0.1})`;
        ctx.lineWidth = 2 + stage;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 6 + stage * 3 + Math.sin(this.time * 4) * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (stage >= 2) {
        const n = 6 + stage * 3;
        for (let i = 0; i < n; i++) {
          const a = this.time * 1.5 + (i * Math.PI * 2) / n;
          const rr = r + 12 + stage * 4;
          const px = cx + Math.cos(a) * rr;
          const py = cy + Math.sin(a) * rr;
          ctx.fillStyle = i % 2 ? "#ffe066" : "#fff";
          ctx.beginPath();
          ctx.arc(px, py, 2 + (stage >= 3 ? 1 : 0), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (stage >= 3) {
        const grd = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r + 22);
        grd.addColorStop(0, "rgba(255,220,100,0.15)");
        grd.addColorStop(1, "rgba(255,180,60,0)");
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 22, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },

    /** ショップ中央の大きなキャラ */
    drawPreviewBlob(cx, cy, scale) {
      const skinIdx = this.shopFocus >= 0 ? this.shopFocus : Playables.skin;
      const skin = SKINS[skinIdx] || SKINS[0];
      const stage = skinStage(skinIdx);
      const bob = Math.sin(this.time * 3) * 6;
      this.drawEvoFx(cx, cy + bob, 36 * scale, stage);
      ctx.save();
      ctx.translate(cx, cy + bob);
      ctx.scale(scale, scale);
      // 影
      ctx.fillStyle = "rgba(80,60,100,0.12)";
      ctx.beginPath();
      ctx.ellipse(0, 36 - bob, 28, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // 体
      const g = ctx.createRadialGradient(-10, -14, 6, 0, 0, 40);
      g.addColorStop(0, skin.body[0]);
      g.addColorStop(0.5, skin.body[1]);
      g.addColorStop(1, skin.body[2]);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = skin.cheek;
      ctx.beginPath();
      ctx.ellipse(-16, 10, 7, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(16, 10, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4a3a5a";
      ctx.beginPath();
      ctx.arc(-10, -2, 5, 0, Math.PI * 2);
      ctx.arc(10, -2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-8, -4, 2, 0, Math.PI * 2);
      ctx.arc(12, -4, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#4a3a5a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 8, 6, 0.2, Math.PI - 0.2);
      ctx.stroke();
      // ぼうし
      const hat = EQUIP_HAT[Playables.equipHat] || EQUIP_HAT[0];
      if (hat.id === "ribbon") {
        ctx.fillStyle = hat.color;
        ctx.beginPath();
        ctx.moveTo(-18, -22);
        ctx.lineTo(-30, -34);
        ctx.lineTo(-24, -16);
        ctx.moveTo(18, -22);
        ctx.lineTo(30, -34);
        ctx.lineTo(24, -16);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -26, 7, 0, Math.PI * 2);
        ctx.fill();
      } else if (hat.id === "cap") {
        ctx.fillStyle = hat.color;
        ctx.beginPath();
        ctx.arc(0, -22, 24, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(-2, -22, 26, 7);
      } else if (hat.id === "crown") {
        ctx.fillStyle = hat.color;
        ctx.beginPath();
        ctx.moveTo(-20, -24);
        ctx.lineTo(-17, -46);
        ctx.lineTo(-6, -30);
        ctx.lineTo(0, -50);
        ctx.lineTo(6, -30);
        ctx.lineTo(17, -46);
        ctx.lineTo(20, -24);
        ctx.closePath();
        ctx.fill();
      }
      // チャーム表示
      const ch = EQUIP_CHARM[Playables.equipCharm] || EQUIP_CHARM[0];
      if (ch.id !== "none") {
        ctx.fillStyle = "#ffd56a";
        ctx.beginPath();
        ctx.arc(28, 18, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#8a6a20";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("★", 28, 19);
        ctx.textBaseline = "alphabetic";
      }
      ctx.restore();
    },

    // --- ゲスト描画（簡易・既存ロジック流用） ---
    drawCameo(g) {
      const s = g.scale;
      const hop = Math.sin(g.bob) * 3;
      const x = g.x;
      const y = g.y + hop;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(s, s);
      ctx.fillStyle = "rgba(80,60,100,0.12)";
      ctx.beginPath();
      ctx.ellipse(0, 2, 18, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      if (g.type === "ojisan") this.drawOjisan(g);
      else if (g.type === "grandma") this.drawGrandma(g);
      else if (g.type === "frog") this.drawFrog(g);
      else if (g.type === "chicken") this.drawChicken(g);
      else if (g.type === "robot") this.drawRobot(g);
      else if (g.type === "salaryman") this.drawSalaryman(g);
      else this.drawCat(g);
      ctx.restore();
      if (this.noticeT > 0 && (this.notice === t("ojisan") || this.notice === t("ojisanBonus") || this.notice === "あっ、おじさんだ！！") && g.type === "ojisan") {
        this.drawBubble(x, y - 70 * s, t("ojisan"));
      }
    },

    drawBubble(x, y, text) {
      ctx.save();
      ctx.font = `bold ${Math.min(16, W * 0.038)}px sans-serif`;
      const w = ctx.measureText(text).width + 22;
      const h = 28;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.strokeStyle = "#ffb7c8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - w / 2, y - h, w, h, 12);
      else ctx.rect(x - w / 2, y - h, w, h);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#5a4a6a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x, y - h / 2);
      ctx.restore();
    },

    drawOjisan(g) {
      const run = Math.sin(g.frame) * 4;
      ctx.fillStyle = "#f3f0e8";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-14, -36, 28, 28, 8);
      else ctx.rect(-14, -36, 28, 28);
      ctx.fill();
      ctx.fillStyle = "#c45c6a";
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(-4, -18);
      ctx.lineTo(0, -12);
      ctx.lineTo(4, -18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#5c5470";
      ctx.fillRect(-10, -10, 8, 12 + run);
      ctx.fillRect(2, -10, 8, 12 - run);
      ctx.fillStyle = "#f0c8a0";
      ctx.beginPath();
      ctx.arc(0, -48, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.ellipse(-4, -54, 6, 4, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4a3a32";
      ctx.beginPath();
      ctx.arc(-11, -48, 4.5, 0, Math.PI * 2);
      ctx.arc(11, -48, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a2a22";
      ctx.beginPath();
      ctx.ellipse(-5, -50, 4, 2, -0.2, 0, Math.PI * 2);
      ctx.ellipse(5, -50, 4, 2, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#3a2a22";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(-5, -46, 2.5, Math.PI, 0);
      ctx.arc(5, -46, 2.5, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,140,150,0.35)";
      ctx.beginPath();
      ctx.arc(-9, -42, 3, 0, Math.PI * 2);
      ctx.arc(9, -42, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -41, 3.5, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.fillStyle = "#f0c8a0";
      ctx.beginPath();
      ctx.arc(-16, -28 + run, 5, 0, Math.PI * 2);
      ctx.arc(16, -28 - run, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8b5a3c";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-24, -20 + run, 12, 10, 2);
      else ctx.rect(-24, -20 + run, 12, 10);
      ctx.fill();
    },

    drawGrandma(g) {
      const run = Math.sin(g.frame) * 3;
      ctx.fillStyle = "#c9b1e0";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-12, -34, 24, 26, 8);
      else ctx.rect(-12, -34, 24, 26);
      ctx.fill();
      ctx.fillStyle = "#a88bc8";
      ctx.beginPath();
      ctx.moveTo(-14, -10);
      ctx.lineTo(14, -10);
      ctx.lineTo(10, 4);
      ctx.lineTo(-10, 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f0c8a0";
      ctx.beginPath();
      ctx.arc(0, -46, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f5f0f5";
      ctx.beginPath();
      ctx.arc(-10, -52, 6, 0, Math.PI * 2);
      ctx.arc(0, -56, 7, 0, Math.PI * 2);
      ctx.arc(10, -52, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#7a6a8a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-5, -46, 4, 0, Math.PI * 2);
      ctx.arc(5, -46, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#4a3a5a";
      ctx.beginPath();
      ctx.arc(-5, -46, 1.5, 0, Math.PI * 2);
      ctx.arc(5, -46, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#a08060";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(16, -30);
      ctx.lineTo(18, 6);
      ctx.stroke();
      ctx.fillStyle = "#8a7aaa";
      ctx.fillRect(-8, 2, 7, 6 + run);
      ctx.fillRect(1, 2, 7, 6 - run);
    },

    drawCat(g) {
      const run = Math.sin(g.frame * 1.3) * 3;
      ctx.fillStyle = "#f5c26b";
      ctx.beginPath();
      ctx.ellipse(0, -18, 16, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -36, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-10, -42);
      ctx.lineTo(-8, -52);
      ctx.lineTo(-2, -44);
      ctx.moveTo(10, -42);
      ctx.lineTo(8, -52);
      ctx.lineTo(2, -44);
      ctx.fill();
      ctx.fillStyle = "#3a2a1a";
      ctx.beginPath();
      ctx.arc(-4, -37, 2, 0, Math.PI * 2);
      ctx.arc(4, -37, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#f5c26b";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(14, -16);
      ctx.quadraticCurveTo(28, -30, 22, -40);
      ctx.stroke();
      ctx.fillStyle = "#e0a84a";
      ctx.beginPath();
      ctx.ellipse(-8, -4 + run, 5, 4, 0, 0, Math.PI * 2);
      ctx.ellipse(8, -4 - run, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7ec8e8";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-18, 0, 36, 5, 3);
      else ctx.rect(-18, 0, 36, 5);
      ctx.fill();
      ctx.fillStyle = "#5a4a6a";
      ctx.beginPath();
      ctx.arc(-12, 7, 3, 0, Math.PI * 2);
      ctx.arc(12, 7, 3, 0, Math.PI * 2);
      ctx.fill();
    },

    drawFrog(g) {
      const hop = Math.abs(Math.sin(g.bob * 1.5)) * 10;
      ctx.translate(0, -hop);
      ctx.fillStyle = "#7dcea0";
      ctx.beginPath();
      ctx.ellipse(0, -16, 18, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-8, -30, 7, 0, Math.PI * 2);
      ctx.arc(8, -30, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-8, -30, 4, 0, Math.PI * 2);
      ctx.arc(8, -30, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2a2a2a";
      ctx.beginPath();
      ctx.arc(-8, -30, 2, 0, Math.PI * 2);
      ctx.arc(8, -30, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#3a8a5a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -12, 8, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.fillStyle = "#52b788";
      ctx.beginPath();
      ctx.ellipse(-12, 0, 8, 4, -0.3, 0, Math.PI * 2);
      ctx.ellipse(12, 0, 8, 4, 0.3, 0, Math.PI * 2);
      ctx.fill();
    },

    drawChicken(g) {
      const run = Math.sin(g.frame * 1.6) * 3;
      ctx.fillStyle = "#fff6e0";
      ctx.beginPath();
      ctx.ellipse(0, -18, 14, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -38, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e85d5d";
      ctx.beginPath();
      ctx.arc(-4, -46, 3, 0, Math.PI * 2);
      ctx.arc(0, -48, 3.5, 0, Math.PI * 2);
      ctx.arc(4, -46, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2a2a2a";
      ctx.beginPath();
      ctx.arc(-3, -39, 2, 0, Math.PI * 2);
      ctx.arc(4, -39, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f0a93a";
      ctx.beginPath();
      ctx.moveTo(0, -36);
      ctx.lineTo(8, -34);
      ctx.lineTo(0, -31);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#f0a93a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-5, -2);
      ctx.lineTo(-7, 8 + run);
      ctx.moveTo(5, -2);
      ctx.lineTo(7, 8 - run);
      ctx.stroke();
      ctx.fillStyle = "#ffe8c0";
      ctx.beginPath();
      ctx.ellipse(-12, -18, 6, 10, -0.4, 0, Math.PI * 2);
      ctx.fill();
    },

    drawRobot(g) {
      const run = Math.sin(g.frame) * 2;
      ctx.fillStyle = "#9bb7d4";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-14, -36, 28, 28, 6);
      else ctx.rect(-14, -36, 28, 28);
      ctx.fill();
      ctx.strokeStyle = "#6a8aaa";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -36);
      ctx.lineTo(0, -48);
      ctx.stroke();
      ctx.fillStyle = "#ff8fb8";
      ctx.beginPath();
      ctx.arc(0, -50, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7a9bb8";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-16, -62, 32, 20, 5);
      else ctx.rect(-16, -62, 32, 20);
      ctx.fill();
      ctx.fillStyle = "#7dffa8";
      ctx.beginPath();
      ctx.arc(-7, -52, 4, 0, Math.PI * 2);
      ctx.arc(7, -52, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5a7a94";
      ctx.fillRect(-8, -46, 16, 3);
      ctx.fillStyle = "#8aa8c4";
      ctx.fillRect(-20, -28, 6, 16);
      ctx.fillRect(14, -28, 6, 16);
      ctx.fillStyle = "#6a88a4";
      ctx.fillRect(-10, -8, 7, 10 + run);
      ctx.fillRect(3, -8, 7, 10 - run);
      ctx.fillStyle = "#ff8fb8";
      ctx.beginPath();
      ctx.arc(-3, -22, 3, 0, Math.PI * 2);
      ctx.arc(3, -22, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-6, -20);
      ctx.lineTo(0, -14);
      ctx.lineTo(6, -20);
      ctx.closePath();
      ctx.fill();
    },

    drawSalaryman(g) {
      const run = Math.sin(g.frame) * 4;
      ctx.fillStyle = "#6a7a9a";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-13, -36, 26, 26, 7);
      else ctx.rect(-13, -36, 26, 26);
      ctx.fill();
      ctx.fillStyle = "#f3f0e8";
      ctx.fillRect(-4, -34, 8, 16);
      ctx.fillStyle = "#f0c8a0";
      ctx.beginPath();
      ctx.arc(0, -48, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a2a22";
      ctx.beginPath();
      ctx.arc(0, -54, 11, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = "#3a2a22";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-8, -48);
      ctx.lineTo(-2, -48);
      ctx.moveTo(2, -48);
      ctx.lineTo(8, -48);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -42, 2.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#5a4030";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(12, -10, 12, 8, 2);
      else ctx.rect(12, -10, 12, 8);
      ctx.fill();
      ctx.fillStyle = "#4a5568";
      ctx.fillRect(-9, -10, 7, 12 + run);
      ctx.fillRect(2, -10, 7, 12 - run);
    },

    drawPanel(cx, cy, w, h) {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 20);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,180,210,0.8)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 20);
        ctx.stroke();
      } else {
        ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
      }
    },

    drawButton(cx, cy, w, h, label, color, small) {
      ctx.fillStyle = color;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 14);
        ctx.fill();
      } else {
        ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
      }
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${small ? Math.min(13, w * 0.14) : Math.min(16, w * 0.12)}px sans-serif`;
      ctx.fillText(label, cx, cy);
      ctx.textBaseline = "alphabetic";
    },

    drawLoginBonus() {
      const day = Playables.loginDay || 1;
      ctx.fillStyle = "rgba(40,20,50,0.55)";
      ctx.fillRect(0, 0, W, H);
      const pw = Math.min(W * 0.92, 360);
      const ph = Math.min(H * 0.72, 420);
      const px = W / 2;
      const py = H / 2;
      this.drawPanel(px, py, pw, ph);
      ctx.fillStyle = "#3a2a4a";
      ctx.textAlign = "center";
      ctx.font = `bold ${Math.min(22, W * 0.05)}px sans-serif`;
      ctx.fillText(Playables.lang === "en" ? "Daily Login Bonus" : "連続ログインボーナス", px, py - ph / 2 + 36);
      ctx.font = `${Math.min(13, W * 0.032)}px sans-serif`;
      ctx.fillStyle = "#5a4a5a";
      ctx.fillText(
        Playables.lang === "en"
          ? "Streak: " + Playables.loginStreak + " day(s)"
          : "連続 " + Playables.loginStreak + " 日目",
        px,
        py - ph / 2 + 58
      );

      const cols = 4;
      const cellW = Math.min(70, (pw - 40) / cols);
      const cellH = 52;
      const startY = py - ph / 2 + 78;
      for (let i = 0; i < 7; i++) {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const cx = px - (cols * cellW) / 2 + c * cellW + cellW / 2;
        const cy = startY + r * (cellH + 10) + cellH / 2;
        const d = i + 1;
        const done = d < day || (d === day && !Playables.loginPending);
        const today = d === day && Playables.loginPending;
        ctx.fillStyle = today ? "#ffd0e0" : done ? "rgba(180,230,200,0.7)" : "rgba(230,220,230,0.6)";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(cx - cellW / 2 + 4, cy - cellH / 2, cellW - 8, cellH, 10);
        else ctx.fillRect(cx - cellW / 2 + 4, cy - cellH / 2, cellW - 8, cellH);
        ctx.fill();
        if (today) {
          ctx.strokeStyle = "#ff8fb8";
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        ctx.fillStyle = "#3a2a4a";
        ctx.font = `bold ${Math.min(12, cellW * 0.18)}px sans-serif`;
        ctx.fillText(
          Playables.lang === "en" ? "Day " + d : d + "日",
          cx,
          cy - 8
        );
        ctx.fillStyle = d === 7 ? "#c07000" : "#5a4a5a";
        ctx.font = `bold ${Math.min(13, cellW * 0.2)}px sans-serif`;
        ctx.fillText("+" + LOGIN_REWARDS[i] + "C", cx, cy + 12);
      }

      const btnY = py + ph / 2 - 48;
      this.drawButton(px, btnY, 180, 48, Playables.lang === "en" ? "Receive" : "うけとる", "#ff8fb8");
      if (day === 7) {
        ctx.fillStyle = "#c07000";
        ctx.font = `bold ${Math.min(13, W * 0.03)}px sans-serif`;
        ctx.fillText(Playables.lang === "en" ? "7-day special!" : "7日目ボーナス！", px, btnY - 36);
      }
    },

    drawUI() {
      const pad = Math.min(20, W * 0.04);

      // ミュート（全画面） / 言語（メニュー・ショップで明示）
      if (this.state !== "loading") {
        const btnR = Math.min(22, W * 0.05);
        const muteX = W - pad - btnR;
        const btnY = pad + btnR + 4;
        // ミュート
        ctx.fillStyle = Playables.mutedLocal ? "rgba(200,120,140,0.9)" : "rgba(255,255,255,0.88)";
        ctx.beginPath();
        ctx.arc(muteX, btnY, btnR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = Playables.mutedLocal ? "#fff" : "#3a2a4a";
        ctx.font = `bold ${Math.min(14, btnR)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(Playables.mutedLocal ? "🔇" : "🔊", muteX, btnY + 1);
        ctx.textBaseline = "alphabetic";
        ctx.textAlign = "left";
      }

      // 言語セグメント（メニュー / ショップのみ・押しやすい）
      if (this.state === "menu" || this.state === "shop") {
        const segH = 32;
        const segW = Math.min(88, W * 0.2);
        const totalW = segW * 2 + 6;
        const sx = W / 2 - totalW / 2;
        const sy = this.state === "menu" ? H * 0.12 : 78;
        const isJa = Playables.lang !== "en";
        // 日本語
        ctx.fillStyle = isJa ? "#ff8fb8" : "rgba(255,255,255,0.85)";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(sx, sy, segW, segH, 10);
        else ctx.fillRect(sx, sy, segW, segH);
        ctx.fill();
        ctx.fillStyle = isJa ? "#fff" : "#5a4a5a";
        ctx.font = `bold ${Math.min(13, segW * 0.16)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("日本語", sx + segW / 2, sy + segH / 2 + 1);
        // English
        const ex = sx + segW + 6;
        ctx.fillStyle = !isJa ? "#6bb6ff" : "rgba(255,255,255,0.85)";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(ex, sy, segW, segH, 10);
        else ctx.fillRect(ex, sy, segW, segH);
        ctx.fill();
        ctx.fillStyle = !isJa ? "#fff" : "#5a4a5a";
        ctx.fillText("English", ex + segW / 2, sy + segH / 2 + 1);
        ctx.textBaseline = "alphabetic";
        ctx.textAlign = "left";
      }

      // 所持コイン
      if (this.state !== "loading") {
        ctx.save();
        ctx.translate(W - pad - 70, pad + 10 + Math.min(40, W * 0.09));
        this.drawCoin({ x: 0, y: 0, r: 9, spin: this.time * 4 });
        ctx.fillStyle = "#6a4a10";
        ctx.font = `bold ${Math.min(16, W * 0.036)}px sans-serif`;
        ctx.textAlign = "left";
        ctx.fillText(String(Playables.totalCoins), 14, 5);
        ctx.restore();
      }

      if (this.state === "menu") {
        ensureDailyMissions();
        syncTodayBest();
        const panelW = Math.min(W * 0.92, 380);
        this.drawPanel(W / 2, H * 0.28, panelW, 170);
        ctx.fillStyle = "#3a2a4a";
        ctx.textAlign = "center";
        ctx.font = `bold ${Math.min(28, W * 0.06)}px sans-serif`;
        ctx.fillText(t("title"), W / 2, H * 0.2);
        ctx.font = `${Math.min(13, W * 0.032)}px sans-serif`;
        ctx.fillStyle = "#4a3a5a";
        ctx.fillText(t("tagline"), W / 2, H * 0.25);
        ctx.fillText(t("how"), W / 2, H * 0.25 + 20);

        this.drawButton(W / 2 - 70, H * 0.36, 120, 46, t("play"), "#ff8fb8");
        this.drawButton(W / 2 + 70, H * 0.36, 120, 46, t("shop"), "#7ec8e8");

        // 今日のチャレンジ
        const tb = Playables.todayBest || 0;
        const yb = Playables.yesterdayBest || 0;
        ctx.fillStyle = "#4a3a5a";
        ctx.font = `bold ${Math.min(13, W * 0.03)}px sans-serif`;
        if (yb > 0 && tb < yb) {
          ctx.fillStyle = "#c07000";
          ctx.fillText(
            Playables.lang === "en"
              ? "Today: " + tb + " · Beat yesterday " + yb + "!"
              : "今日 " + tb + " / 昨日 " + yb + " を越えよう！",
            W / 2,
            H * 0.42
          );
        } else {
          ctx.fillText(
            Playables.lang === "en"
              ? "Today best " + tb + " · All-time " + Playables.bestScore
              : "今日のベスト " + tb + "　通算 " + Playables.bestScore,
            W / 2,
            H * 0.42
          );
        }
        ctx.font = `${Math.min(11, W * 0.026)}px sans-serif`;
        ctx.fillStyle = "#7a6a8a";
        const badgeN = Object.keys(Playables.badges || {}).length;
        ctx.fillText(
          Playables.lang === "en"
            ? "Badges " + badgeN + "/" + BADGES.length + " · Runs " + Playables.runs
            : "実績 " + badgeN + "/" + BADGES.length + "　プレイ " + Playables.runs + " 回",
          W / 2,
          H * 0.445
        );

        this.drawMissionPanel();
        this.drawTopScores();
      }

      if (this.state === "shop") {
        this.drawShop();
      }

      if (this.state === "playing") {
        ctx.textAlign = "left";
        ctx.fillStyle = "#2a1a3a";
        ctx.font = `bold ${Math.min(30, W * 0.065)}px sans-serif`;
        ctx.fillText(Math.floor(this.displayScore).toString(), pad, pad + 28);

        const coinScale = 1 + this.coinFlash * 0.25;
        ctx.save();
        ctx.translate(pad, pad + 52);
        ctx.scale(coinScale, coinScale);
        this.drawCoin({ x: 0, y: 0, r: 9, spin: this.time * 5 });
        ctx.fillStyle = "#8a5a10";
        ctx.font = `bold ${Math.min(16, W * 0.036)}px sans-serif`;
        ctx.fillText("× " + this.coinCount, 14, 5);
        ctx.restore();

        if (this.combo >= 2) {
          const comboT = Math.min(1, this.comboTimer / 2.2);
          const urgent = this.comboTimer < 0.7 && this.comboTimer > 0;
          ctx.fillStyle = this.feverActive ? "#c07000" : urgent ? "#c03040" : "#d04070";
          ctx.font = `bold ${Math.min(22, W * 0.05)}px sans-serif`;
          ctx.fillText(this.combo + " " + t("combo"), pad, pad + 82);
          ctx.fillStyle = "rgba(0,0,0,0.15)";
          ctx.fillRect(pad, pad + 88, 80, 6);
          ctx.fillStyle = this.feverActive ? "#e8a020" : urgent ? "#e85d5d" : "#ff8fb8";
          ctx.fillRect(pad, pad + 88, 80 * comboT, 6);
        }

        // フィーバーバー
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.fillRect(pad, H - pad - 14, 100, 8);
        ctx.fillStyle = this.feverActive ? "#ffd56a" : "#ffb7c8";
        ctx.fillRect(pad, H - pad - 14, 100 * this.fever, 8);
        ctx.fillStyle = "#3a2a4a";
        ctx.font = `${Math.min(11, W * 0.026)}px sans-serif`;
        ctx.fillText(t("feverWord"), pad, H - pad - 18);

        // アイテム状態
        let ix = W - pad - 10;
        ctx.font = `${Math.min(12, W * 0.03)}px sans-serif`;
        ctx.textAlign = "right";
        if (this.shield > 0) {
          ctx.fillStyle = "#6bb6ff";
          ctx.fillText("🛡", ix, pad + 24);
          ix -= 22;
        }
        if (this.magnet > 0) {
          ctx.fillStyle = "#ff6b8a";
          ctx.fillText("磁 " + Math.ceil(this.magnet), ix, pad + 24);
          ix -= 40;
        }
        if (this.doublePts > 0) {
          ctx.fillStyle = "#e8a020";
          ctx.fillText("2倍 " + Math.ceil(this.doublePts), ix, pad + 24);
        }

        if (this.noticeT > 0 && this.notice && this.notice !== "あっ、おじさんだ！！") {
          const a = Math.min(1, this.noticeT / 0.35);
          ctx.globalAlpha = a;
          ctx.font = `bold ${Math.min(18, W * 0.042)}px sans-serif`;
          const tw = ctx.measureText(this.notice).width + 28;
          ctx.fillStyle = "rgba(255,255,255,0.93)";
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(W / 2 - tw / 2, H * 0.12, tw, 34, 12);
          else ctx.fillRect(W / 2 - tw / 2, H * 0.12, tw, 34);
          ctx.fill();
          ctx.fillStyle = "#5a4a6a";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(this.notice, W / 2, H * 0.12 + 17);
          ctx.textBaseline = "alphabetic";
          ctx.globalAlpha = 1;
        }

        if (this.milestoneT > 0 && this.milestoneMsg) {
          ctx.globalAlpha = Math.min(1, this.milestoneT / 0.4);
          ctx.fillStyle = "#7dcea0";
          ctx.font = `bold ${Math.min(22, W * 0.05)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(this.milestoneMsg, W / 2, H * 0.28);
          ctx.globalAlpha = 1;
        }

        // ハイリスク帯の縁
        if (this._riskActive > 0) {
          const a = 0.25 + Math.sin(this.time * 10) * 0.1;
          ctx.strokeStyle = `rgba(255,80,80,${a})`;
          ctx.lineWidth = 6;
          ctx.strokeRect(3, 3, W - 6, H - 6);
        }

        if (this._forcePause) {
          ctx.fillStyle = "rgba(60,40,80,0.45)";
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.font = `bold ${Math.min(24, W * 0.055)}px sans-serif`;
          ctx.fillText("一時停止中…", W / 2, H / 2);
        }
      }

      if (this.state === "over") {
        const score = Math.floor(this.score);
        const isBest = score >= Playables.bestScore && score > 0;
        const almost =
          !isBest &&
          Playables.bestScore > 0 &&
          score >= Playables.bestScore * 0.85;

        this.drawPanel(W / 2, H * 0.44, Math.min(W * 0.92, 360), 280);
        ctx.fillStyle = "#3a2a4a";
        ctx.textAlign = "center";
        ctx.font = `bold ${Math.min(24, W * 0.05)}px sans-serif`;
        ctx.fillText(isBest ? t("newBest") : t("gameOver"), W / 2, H * 0.28);

        ctx.font = `bold ${Math.min(40, W * 0.09)}px sans-serif`;
        ctx.fillStyle = "#e05080";
        ctx.fillText(score.toString(), W / 2, H * 0.36);

        ctx.font = `${Math.min(13, W * 0.03)}px sans-serif`;
        ctx.fillStyle = "#4a3a5a";
        ctx.fillText(
          t("coinsLabel") + " " + this.coinCount + "　" + t("maxCombo") + " " + this.comboMax + "　" + t("nearLabel") + " " + this.nearMisses,
          W / 2,
          H * 0.42
        );
        if (almost) {
          ctx.fillStyle = "#c07000";
          ctx.fillText(t("almost"), W / 2, H * 0.46);
        } else if (this._todayNew) {
          ctx.fillStyle = "#c07000";
          ctx.fillText(
            Playables.lang === "en" ? "New today's best!" : "今日のベスト更新！",
            W / 2,
            H * 0.46
          );
        } else if (!isBest) {
          ctx.fillText(t("best") + ": " + Playables.bestScore, W / 2, H * 0.46);
        }
        if (Playables.ghost && Playables.ghost.ys) {
          ctx.fillStyle = "#5a4a5a";
          ctx.font = `${Math.min(11, W * 0.026)}px sans-serif`;
          ctx.fillText(
            Playables.lang === "en" ? "Ghost ready for next run" : "次のランでゴーストと競走",
            W / 2,
            H * 0.485
          );
        }
        if (this._rank > 0 && this._rank <= 5) {
          ctx.fillStyle = "#5a4a5a";
          ctx.font = `${Math.min(12, W * 0.028)}px sans-serif`;
          ctx.fillText(
            Playables.lang === "en" ? "Rank #" + this._rank : "ランキング " + this._rank + " 位",
            W / 2,
            H * 0.5
          );
        }

        this.drawButton(W / 2 - 72, H * 0.56, 128, 48, t("again"), "#ff8fb8");
        this.drawButton(W / 2 + 72, H * 0.56, 128, 48, t("continueAd"), "#7ec8e8", true);

        // コイン2倍
        if (this._runCoinGain > 0 && !this._doubleUsed) {
          this.drawButton(W / 2, H * 0.66, 200, 44, t("doubleCoins") + " +" + this._runCoinGain, "#e8a020", true);
        } else if (this._doubleUsed) {
          ctx.fillStyle = "#3d8a5a";
          ctx.font = `bold ${Math.min(13, W * 0.03)}px sans-serif`;
          ctx.fillText(t("doubleDone"), W / 2, H * 0.66 + 5);
        }

        ctx.fillStyle = "rgba(60,40,70,0.75)";
        ctx.font = `${Math.min(11, W * 0.026)}px sans-serif`;
        ctx.fillText(t("continueHint"), W / 2, H * 0.72);
        this.drawButton(W / 2, H * 0.77, 140, 38, t("shopGo"), "#b8a9d4", true);
      }
    },

    drawTopScores() {
      const scores = Playables.topScores || [];
      if (!scores.length) return;
      const pad = Math.min(16, W * 0.04);
      const top = Math.min(H * 0.82, H - 110);
      const w = Math.min(W * 0.92, 360);
      const h = 28 + scores.length * 20;
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(W / 2 - w / 2, top, w, h, 12);
      else ctx.fillRect(W / 2 - w / 2, top, w, h);
      ctx.fill();
      ctx.fillStyle = "#5a4a5a";
      ctx.textAlign = "left";
      ctx.font = `bold ${Math.min(12, W * 0.028)}px sans-serif`;
      ctx.fillText(Playables.lang === "en" ? "TOP SCORES" : "ランキング", W / 2 - w / 2 + 12, top + 18);
      ctx.textAlign = "right";
      ctx.font = `${Math.min(12, W * 0.028)}px sans-serif`;
      for (let i = 0; i < scores.length; i++) {
        const y = top + 36 + i * 18;
        ctx.textAlign = "left";
        ctx.fillStyle = i === 0 ? "#c07000" : "#5a4a5a";
        ctx.fillText((i + 1) + ".  " + scores[i], W / 2 - w / 2 + 16, y);
      }
    },

    drawMissionPanel() {
      ensureDailyMissions();
      const pad = Math.min(16, W * 0.04);
      const top = H * 0.46;
      const panelW = Math.min(W * 0.92, 380);
      const rowH = Math.min(64, (H - top - 70) / 3);
      const panelH = 48 + rowH * 3 + 8;

      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(W / 2 - panelW / 2, top, panelW, panelH, 16);
      else ctx.fillRect(W / 2 - panelW / 2, top, panelW, panelH);
      ctx.fill();
      ctx.strokeStyle = "rgba(180,210,255,0.9)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#3a2a4a";
      ctx.textAlign = "center";
      ctx.font = `bold ${Math.min(14, W * 0.034)}px sans-serif`;
      ctx.fillText(t("missions"), W / 2 - panelW / 2 + 14 + ctx.measureText(t("missions")).width / 2, top + 24);
      ctx.textAlign = "right";
      ctx.fillStyle = "#8a9ab0";
      ctx.font = `${Math.min(10, W * 0.024)}px sans-serif`;
      ctx.fillText(remainingDaysHint(), W / 2 + panelW / 2 - 14, top + 24);

      for (let i = 0; i < dailyMissions.length; i++) {
        const m = dailyMissions[i];
        const y = top + 40 + i * rowH;
        const prog = Math.min(m.target, missionProgressOf(m.type));
        const done = Playables.missionClaimed[i];
        const ratio = m.target > 0 ? Math.min(1, prog / m.target) : 0;

        ctx.fillStyle = done ? "rgba(200,240,210,0.55)" : "rgba(255,235,245,0.7)";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(W / 2 - panelW / 2 + 10, y, panelW - 20, rowH - 8, 10);
        else ctx.fillRect(W / 2 - panelW / 2 + 10, y, panelW - 20, rowH - 8);
        ctx.fill();

        ctx.fillStyle = done ? "#4a8a5a" : "#5a4a6a";
        ctx.textAlign = "left";
        ctx.font = `${Math.min(12, W * 0.03)}px sans-serif`;
        ctx.fillText((done ? "✓ " : "") + m.label, W / 2 - panelW / 2 + 18, y + 20);

        // バー
        const barW = panelW - 36 - 70;
        ctx.fillStyle = "rgba(0,0,0,0.08)";
        ctx.fillRect(W / 2 - panelW / 2 + 18, y + 30, barW, 8);
        ctx.fillStyle = done ? "#7dcea0" : "#ff8fb8";
        ctx.fillRect(W / 2 - panelW / 2 + 18, y + 30, barW * ratio, 8);

        ctx.fillStyle = "#8a6a20";
        ctx.textAlign = "right";
        ctx.font = `bold ${Math.min(11, W * 0.026)}px sans-serif`;
        ctx.fillText(
          done ? "達成 " + m.reward + "C" : prog + "/" + m.target + "  " + m.reward + "C",
          W / 2 + panelW / 2 - 18,
          y + 22
        );
      }
    },

    drawShop() {
      const pad = 16;
      ctx.fillStyle = "rgba(255,255,255,0.94)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#5a4a6a";
      ctx.textAlign = "center";
      ctx.font = `bold ${Math.min(24, W * 0.055)}px sans-serif`;
      ctx.fillText(t("shop"), W / 2, 40);
      this.drawCoin({ x: W / 2 - 30, y: 56, r: 9, spin: this.time * 4 });
      ctx.fillStyle = "#8a6a20";
      ctx.font = `bold ${Math.min(16, W * 0.036)}px sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(String(Playables.totalCoins), W / 2 - 16, 61);

      // スキン
      ctx.textAlign = "center";
      ctx.fillStyle = "#7a6a8a";
      ctx.font = `bold ${Math.min(15, W * 0.035)}px sans-serif`;
      ctx.fillText(t("skins"), W / 2, 96);

      const skinY = 120;
      const skinW = Math.min(70, (W - pad * 2) / 5);
      for (let i = 0; i < SKINS.length; i++) {
        const s = SKINS[i];
        const x = pad + skinW * i + skinW / 2;
        const owned = Playables.owned[i];
        const selected = Playables.skin === i;
        ctx.fillStyle = selected ? "#ffe0ec" : "rgba(255,220,230,0.5)";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x - skinW / 2 + 4, skinY, skinW - 8, 78, 12);
        else ctx.fillRect(x - skinW / 2 + 4, skinY, skinW - 8, 78);
        ctx.fill();
        if (selected) {
          ctx.strokeStyle = "#ff8fb8";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.save();
        ctx.translate(x, skinY + 32);
        const g = ctx.createRadialGradient(-4, -6, 2, 0, 0, 18);
        g.addColorStop(0, s.body[0]);
        g.addColorStop(0.5, s.body[1]);
        g.addColorStop(1, s.body[2]);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#4a3a5a";
        ctx.beginPath();
        ctx.arc(-5, -2, 2, 0, Math.PI * 2);
        ctx.arc(5, -2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = "#5a4a6a";
        ctx.font = `${Math.min(10, skinW * 0.14)}px sans-serif`;
        ctx.fillText(s.name, x, skinY + 60);
        if (owned) {
          ctx.fillStyle = selected ? "#e05080" : "#5a4a5a";
          ctx.fillText(selected ? t("wearing") : t("owned"), x, skinY + 74);
        } else {
          ctx.fillStyle = Playables.totalCoins >= s.cost ? "#c07000" : "#999";
          ctx.fillText(s.cost + "C", x, skinY + 74);
        }
      }

      // --- 中央プレビュー ---
      const focusIdx = this.shopFocus >= 0 ? this.shopFocus : Playables.skin;
      const fs0 = SKINS[focusIdx] || SKINS[0];
      const prevY = 230;
      ctx.fillStyle = "rgba(255,230,240,0.45)";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(W / 2 - Math.min(W * 0.42, 150), prevY - 70, Math.min(W * 0.84, 300), 140, 20);
      else ctx.fillRect(W / 2 - 150, prevY - 70, 300, 140);
      ctx.fill();
      this.drawPreviewBlob(W / 2, prevY, 1.15);
      ctx.fillStyle = "#3a2a4a";
      ctx.textAlign = "center";
      ctx.font = `bold ${Math.min(16, W * 0.038)}px sans-serif`;
      const stg = skinStage(focusIdx);
      const stLab = skinStageLabel(stg);
      ctx.fillText(
        (Playables.lang === "en" ? fs0.nameEn : fs0.name) + (stLab ? " " + stLab : ""),
        W / 2,
        prevY + 78
      );
      ctx.font = `${Math.min(12, W * 0.028)}px sans-serif`;
      ctx.fillStyle = "#5a4a5a";
      ctx.fillText(
        t("ability") + ": " + (Playables.lang === "en" ? fs0.descEn : fs0.descJa),
        W / 2,
        prevY + 96
      );

      // フォーカス操作ボタン
      if (this.shopFocus >= 0) {
        const fi = this.shopFocus;
        const sFi = SKINS[fi];
        const ownedF = Playables.owned[fi];
        const equipped = Playables.skin === fi;
        if (ownedF) {
          if (!equipped) this.drawButton(W / 2, prevY + 118, 120, 34, t("equip"), "#ff8fb8", true);
        } else {
          const can = Playables.totalCoins >= sFi.cost;
          this.drawButton(W / 2, prevY + 118, 160, 34, t("buy") + " " + sFi.cost + "C", can ? "#ff8fb8" : "#ccc", true);
        }
      } else {
        ctx.fillStyle = "rgba(70,50,80,0.65)";
        ctx.font = `${Math.min(11, W * 0.026)}px sans-serif`;
        ctx.fillText(t("focusHint"), W / 2, prevY + 118);
      }

      // --- 装備 ---
      const eqY = prevY + 140;
      ctx.fillStyle = "#3a2a4a";
      ctx.font = `bold ${Math.min(14, W * 0.034)}px sans-serif`;
      ctx.fillText(Playables.lang === "en" ? "Equipment" : "そうび", W / 2, eqY);

      const slots = [
        { key: "hat", label: Playables.lang === "en" ? "Hat" : "ぼうし", list: EQUIP_HAT, idx: Playables.equipHat },
        { key: "trail", label: Playables.lang === "en" ? "Trail" : "エフェクト", list: EQUIP_TRAIL, idx: Playables.equipTrail },
        { key: "charm", label: Playables.lang === "en" ? "Charm" : "おまもり", list: EQUIP_CHARM, idx: Playables.equipCharm },
      ];
      const chipW = Math.min(100, (W - pad * 2 - 16) / 3);
      for (let i = 0; i < 3; i++) {
        const sl = slots[i];
        const x = pad + i * (chipW + 8) + chipW / 2;
        const y = eqY + 16;
        const item = sl.list[sl.idx] || sl.list[0];
        ctx.fillStyle = "rgba(255,230,240,0.85)";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x - chipW / 2, y, chipW, 54, 10);
        else ctx.fillRect(x - chipW / 2, y, chipW, 54);
        ctx.fill();
        ctx.fillStyle = "#3a2a4a";
        ctx.font = `bold ${Math.min(11, chipW * 0.12)}px sans-serif`;
        ctx.fillText(sl.label, x, y + 16);
        ctx.font = `${Math.min(12, chipW * 0.13)}px sans-serif`;
        ctx.fillText(Playables.lang === "en" ? item.en : item.ja, x, y + 34);
        if (item.jaEff || item.enEff) {
          ctx.fillStyle = "#7a6a8a";
          ctx.font = `${Math.min(9, chipW * 0.1)}px sans-serif`;
          ctx.fillText(Playables.lang === "en" ? item.enEff || "" : item.jaEff || "", x, y + 48);
        }
      }

      // 装備選択リスト（小さく横スクロール不要の次候補表示）
      // タップで次の装備へサイクル（所有済みのみ装備、未所有は購入確認）

      const upTop = eqY + 84;
      // アップグレード
      ctx.fillStyle = "#3a2a4a";
      ctx.font = `bold ${Math.min(14, W * 0.032)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(t("upgrade"), W / 2, upTop);

      const ups = [
        { key: "jump", label: t("jumpPow"), eff: t("jumpEff"), lv: Playables.upJump },
        { key: "coin", label: t("coinVal"), eff: t("coinEff"), lv: Playables.upCoin },
        { key: "start", label: t("startSpd"), eff: t("startEff"), lv: Playables.upStart },
      ];
      const costs = [30, 80, 160, 300];
      for (let i = 0; i < ups.length; i++) {
        const u = ups[i];
        const y = upTop + 18 + i * 48;
        ctx.fillStyle = "rgba(255,230,240,0.7)";
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(pad, y, W - pad * 2, 48, 12);
        else ctx.fillRect(pad, y, W - pad * 2, 48);
        ctx.fill();
        ctx.fillStyle = "#3a2a4a";
        ctx.textAlign = "left";
        ctx.font = `bold ${Math.min(14, W * 0.034)}px sans-serif`;
        ctx.fillText(u.label, pad + 14, y + 18);
        ctx.font = `${Math.min(10, W * 0.024)}px sans-serif`;
        ctx.fillStyle = "#5a4a5a";
        const stars = "★".repeat(u.lv) + "☆".repeat(3 - u.lv);
        ctx.fillText(stars + "  " + u.eff, pad + 14, y + 36);
        ctx.textAlign = "center";
        if (u.lv >= 3) {
          ctx.fillStyle = "#7dcea0";
          ctx.fillText("MAX", W - pad - 40, y + 28);
        } else {
          const cost = costs[u.lv];
          const can = Playables.totalCoins >= cost;
          this.drawButton(W - pad - 50, y + 24, 80, 32, cost + "C", can ? "#ff8fb8" : "#ccc", true);
        }
      }

      this.drawButton(W / 2, H - 50, 160, 44, t("back"), "#b8a9d4");
      if (this.noticeT > 0 && this.notice) {
        ctx.globalAlpha = Math.min(1, this.noticeT / 0.35);
        ctx.fillStyle = "#5a4a6a";
        ctx.font = `bold ${Math.min(14, W * 0.034)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(this.notice, W / 2, H - 90);
        ctx.globalAlpha = 1;
      }
    },
  };

  // ---------- 入力 ----------
  // スマホでは pointerdown と touchstart の二重発火で
  // 「ジャンプ直後にダッシュ」等の不具合が出るため pointer のみ使う
  let lastInputAt = 0;

  function pointFromEvent(e) {
    if (e.clientX != null && e.clientX !== 0) {
      return { x: e.clientX, y: e.clientY };
    }
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches[0])
      return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX || 0, y: e.clientY || 0 };
  }

  function unlockAudio() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (_) {}
    Music.start();
  }

  function pointerDown(e) {
    // 多重発火ガード（80ms）
    const now = performance.now();
    if (now - lastInputAt < 80) {
      if (e.cancelable) e.preventDefault();
      return;
    }
    lastInputAt = now;

    if (e.cancelable) e.preventDefault();
    // マルチタッチは最初の指のみ
    if (e.isPrimary === false) return;

    unlockAudio();
    if (Game.state === "menu") Music.setMode("menu");
    const pt = pointFromEvent(e);

    // ログインボーナス優先
    if (Game.showLogin && Game.state === "menu") {
      const ph = Math.min(H * 0.72, 420);
      const btnY = H / 2 + ph / 2 - 48;
      if (Math.abs(pt.x - W / 2) < 100 && Math.abs(pt.y - btnY) < 36) {
        Game.claimLogin();
        return;
      }
      // パネル外タップでも閉じる（受取はボタンのみ→誤タップ防止のためボタンのみ）
      return;
    }

    // ミュート（全画面）
    if (Game.state !== "loading") {
      const btnR = Math.min(22, W * 0.05);
      const pad = Math.min(20, W * 0.04);
      const muteX = W - pad - btnR;
      const btnY = pad + btnR + 4;
      if (Math.hypot(pt.x - muteX, pt.y - btnY) < btnR + 8) {
        Game.toggleMute();
        return;
      }
    }

    // 言語セグメント
    if (Game.state === "menu" || Game.state === "shop") {
      const segH = 32;
      const segW = Math.min(88, W * 0.2);
      const totalW = segW * 2 + 6;
      const sx = W / 2 - totalW / 2;
      const sy = Game.state === "menu" ? H * 0.12 : 78;
      if (pt.y >= sy - 4 && pt.y <= sy + segH + 4) {
        if (pt.x >= sx - 4 && pt.x <= sx + segW + 4) {
          Game.setLang("ja");
          return;
        }
        if (pt.x >= sx + segW + 2 && pt.x <= sx + totalW + 4) {
          Game.setLang("en");
          return;
        }
      }
    }

    if (Game.state === "menu") {
      // あそぶ / ショップ
      if (Math.abs(pt.x - (W / 2 - 70)) < 70 && Math.abs(pt.y - H * 0.36) < 36) {
        Game.start();
        return;
      }
      if (Math.abs(pt.x - (W / 2 + 70)) < 70 && Math.abs(pt.y - H * 0.36) < 36) {
        Game.state = "shop";
        Music.setMode("menu");
        return;
      }
      Game.start();
      return;
    }

    if (Game.state === "shop") {
      const pad = 16;
      const skinW = Math.min(70, (W - pad * 2) / 5);
      // スキン行
      if (pt.y > 120 && pt.y < 200) {
        for (let i = 0; i < SKINS.length; i++) {
          const x = pad + skinW * i + skinW / 2;
          if (Math.abs(pt.x - x) < skinW / 2) {
            Game.focusSkin(i);
            return;
          }
        }
      }
      // 中央の装備/購入ボタン
      if (Game.shopFocus >= 0) {
        if (Math.abs(pt.x - W / 2) < 90 && Math.abs(pt.y - 348) < 24) {
          const fi = Game.shopFocus;
          if (Playables.owned[fi]) Game.focusSkin(fi);
          else Game.confirmBuySkin();
          return;
        }
      }
      // 装備チップ（タップで次へ）
      const eqY = 230 + 140;
      const slots = [
        { key: "hat", list: EQUIP_HAT, get: () => Playables.equipHat },
        { key: "trail", list: EQUIP_TRAIL, get: () => Playables.equipTrail },
        { key: "charm", list: EQUIP_CHARM, get: () => Playables.equipCharm },
      ];
      const chipW = Math.min(100, (W - pad * 2 - 16) / 3);
      if (pt.y > eqY + 16 && pt.y < eqY + 70) {
        for (let i = 0; i < 3; i++) {
          const x = pad + i * (chipW + 8) + chipW / 2;
          if (Math.abs(pt.x - x) < chipW / 2) {
            const sl = slots[i];
            const next = (sl.get() + 1) % sl.list.length;
            Game.buyEquip(sl.key, next);
            return;
          }
        }
      }
      // アップグレード行
      const costs = [30, 80, 160, 300];
      const ups = [
        { key: "jump", lv: Playables.upJump },
        { key: "coin", lv: Playables.upCoin },
        { key: "start", lv: Playables.upStart },
      ];
      const upTop = eqY + 84;
      for (let i = 0; i < ups.length; i++) {
        const y = upTop + 18 + i * 48;
        if (pt.y > y && pt.y < y + 48 && pt.x > W - pad - 100) {
          Game.buyUpgrade(ups[i].key);
          return;
        }
      }
      // もどる
      if (Math.abs(pt.x - W / 2) < 90 && Math.abs(pt.y - (H - 50)) < 30) {
        Game.state = "menu";
        Game.shopFocus = -1;
        Music.setMode("menu");
        return;
      }
      return;
    }

    if (Game.state === "over") {
      const cy = H * 0.56;
      if (Math.abs(pt.x - (W / 2 - 72)) < 80 && Math.abs(pt.y - cy) < 36) {
        Game.start();
        return;
      }
      if (Math.abs(pt.x - (W / 2 + 72)) < 80 && Math.abs(pt.y - cy) < 36) {
        Game.continueWithAd();
        return;
      }
      // コイン2倍
      if (Game._runCoinGain > 0 && !Game._doubleUsed) {
        if (Math.abs(pt.x - W / 2) < 110 && Math.abs(pt.y - H * 0.66) < 28) {
          Game.doubleCoinsWithAd();
          return;
        }
      }
      if (Math.abs(pt.x - W / 2) < 80 && Math.abs(pt.y - H * 0.77) < 28) {
        Game.state = "shop";
        Music.setMode("menu");
        return;
      }
      return;
    }

    if (Game.state === "playing") Game.jump();
  }

  // pointer events を優先（スマホ二重発火を防ぐ）
  if (window.PointerEvent) {
    window.addEventListener("pointerdown", pointerDown, { passive: false });
  } else {
    window.addEventListener("mousedown", pointerDown, { passive: false });
    window.addEventListener("touchstart", pointerDown, { passive: false });
  }
  // スクロール・ピンチ・長押しメニューを抑止
  window.addEventListener(
    "touchmove",
    (e) => {
      if (e.cancelable) e.preventDefault();
    },
    { passive: false }
  );
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  document.addEventListener("contextmenu", (e) => {
    if (Game.state === "playing") e.preventDefault();
  });
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        try {
          if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          if (audioCtx.state === "suspended") audioCtx.resume();
        } catch (_) {}
        Music.start();
        if (Game.state === "menu") Game.start();
        else if (Game.state === "over") Game.start();
        else if (Game.state === "playing") Game.jump();
      }
      if (e.code === "KeyS" && Game.state === "menu") {
        Game.state = "shop";
        Music.setMode("menu");
      }
      if (e.code === "Escape" && Game.state === "shop") {
        Game.state = "menu";
        Music.setMode("menu");
      }
    },
    { passive: false }
  );

  window.addEventListener("resize", resize);

  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;
    Game.update(dt);
    Game.draw();
    requestAnimationFrame(frame);
  }

  async function boot() {
    resize();
    Game.baseSpeed = Math.max(280, W * 0.45);
    Game.layout();
    Game.state = "menu";
    // 初回はブラウザ言語から自動判定（保存済みならそれを優先）
    try {
      const n = (navigator.language || "ja").toLowerCase();
      if (!Playables._langSaved && n.indexOf("ja") !== 0) Playables.lang = "en";
    } catch (_) {}
    ensureDailyMissions();
    checkLoginBonus();
    syncTodayBest();
    if (Playables.loginPending) Game.showLogin = true;
    Game.draw();
    await Playables.init();
    const api = window.YoutubePlayables;
    if (api && typeof api.firstFrameReady === "function") {
      try {
        api.firstFrameReady();
      } catch (_) {}
    }
    if (api && typeof api.gameReady === "function") {
      try {
        api.gameReady();
      } catch (_) {}
    }
    document.getElementById("loading").classList.add("hidden");
    requestAnimationFrame(frame);
  }

  window.__FluffyRunner = {
    Game,
    Playables,
    Music,
    spawnCameo: (t) => Game.spawnCameo(t),
    addCoins: (n) => {
      Playables.totalCoins += n;
    },
  };

  boot();
})();
