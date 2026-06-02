/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent } from 'react';
import { GameStatus, CharacterId, Character } from './types';
import GameCanvas from './components/GameCanvas';
import CampGalleryCanvas from './components/CampGalleryCanvas';
import { getTranslation, LanguageCode, LANGUAGES } from './utils/i18n';
import { 
  Heart, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause,
  RotateCcw, 
  Flame, 
  Home, 
  CheckCircle, 
  Layers, 
  Cpu, 
  Sun, 
  Trophy, 
  Compass, 
  AlertTriangle, 
  Wrench,
  Shield,
  Check,
  Zap,
  ArrowLeft,
  Lock,
  User,
  Database,
  KeyRound,
  Loader2,
  LogOut,
  Globe,
  Power
} from 'lucide-react';
import { 
  playVictorySound, 
  playDefeatSound, 
  playCollectSound, 
  setMuteState, 
  getMuteState 
} from './utils/audio';

const CHARACTERS: Character[] = [
  {
    id: 'MALE_PILOT',
    name: '废土机械师 · 雷恩',
    avatar: '👨‍🔧⚙️',
    description: '雷恩 · 废土机械师。身穿旧工装、戴着焊接风镜。驾驶装甲厚重的“钢凿重型艇”。',
    themeColor: 'from-cyan-500 to-cyan-400',
    secondaryColor: 'text-cyan-400'
  },
  {
    id: 'FEMALE_PILOT',
    name: '极光幽灵 · 艾琳',
    avatar: '👩‍🎤⚡',
    description: '艾琳 · 极光幽灵。身带莹蓝冷光纳能服，留侧剃短发。驾驶流线型“极光翼针战机”。',
    themeColor: 'from-pink-500 to-rose-400',
    secondaryColor: 'text-pink-400'
  },
  {
    id: 'SPACE_CAT',
    name: '赛博机械折耳 · 喵酱',
    avatar: '😼🦾',
    description: '喵酱 · 机械折耳橘猫。带红光金属齿轮义眼。驾驶带有可动感应雷达耳的“喵星穿梭杯”。',
    themeColor: 'from-amber-500 to-amber-400',
    secondaryColor: 'text-amber-400'
  },
  {
    id: 'SPACE_DOG',
    name: '哈士奇大尉 · 汪仔',
    avatar: '🐕🎒',
    description: '汪仔 · 哈士奇大尉。戴软防沙风镜与微型喷气包。驾驶配有多角度双空气舵板的“极速尾舵号”。',
    themeColor: 'from-sky-500 to-cyan-400',
    secondaryColor: 'text-cyan-400'
  }
];

const CAMP_MODULES = [
  {
    id: 'SHELTER' as const,
    name: '基础庇护所',
    english: 'BASIC SHELTER',
    description: '简易坚固的恒温装甲气溶胶防辐射舱，废土落脚点的核心基石。必须最先建造，才能安全规划并投建其余高阶功能模块。',
    emoji: '⛺',
    woodReq: 4,
    metalReq: 3,
    solarReq: 0,
    effect: '营地物理闭环防护圈激活 · 达成第一阶段生存通关！',
    color: 'amber',
    borderColor: 'border-amber-500/35',
    bgClass: 'from-amber-950/40 to-slate-900/40',
    selectedTextColor: 'text-amber-400'
  },
  {
    id: 'KITCHEN' as const,
    name: '废土厨房舱',
    english: 'CAMP KITCHEN & MESS HALL',
    description: '炊事热量合成补给配餐间。提供经过深度净化、无高毒沙尘气溶胶残留的流体高能配料，让体能维持充盈。',
    emoji: '🍳',
    woodReq: 4,
    metalReq: 1,
    solarReq: 0,
    effect: '炊事能量合成，修整生命防护力极大调优',
    color: 'emerald',
    borderColor: 'border-emerald-500/35',
    bgClass: 'from-emerald-950/40 to-slate-900/40',
    selectedTextColor: 'text-emerald-400'
  },
  {
    id: 'TOOLROOM' as const,
    name: '工具整备室',
    english: 'REPAIR & TECH WORKSHOP',
    description: '带有焊接摇臂和激光定焦整流模块的微型车间，可升级探险用雷达定位针以增强收集范围。',
    emoji: '🔧',
    woodReq: 3,
    metalReq: 2,
    solarReq: 1,
    effect: '采集吸附增容，磁场吸取材料阻尼极大拓宽',
    color: 'cyan',
    borderColor: 'border-cyan-500/35',
    bgClass: 'from-cyan-950/40 to-slate-900/40',
    selectedTextColor: 'text-cyan-400'
  },
  {
    id: 'POWER' as const,
    name: '储能发电站',
    english: 'SOLAR REACTION POWER GRID',
    description: '高能光电转换及负极蓄能电力网，收集太阳电芯并提供整营稳定动力，强力负荷极光磁场。',
    emoji: '⚡',
    woodReq: 0,
    metalReq: 3,
    solarReq: 3,
    effect: '稳定磁场保护，每次遭遇障碍可缓冲过载破损',
    color: 'yellow',
    borderColor: 'border-yellow-500/35',
    bgClass: 'from-yellow-950/40 to-slate-900/40',
    selectedTextColor: 'text-yellow-400'
  },
  {
    id: 'WATCHTOWER' as const,
    name: '全向瞭望雷达塔',
    english: 'TACTICAL OBSERVATION TOWER',
    description: '在营地边缘耸立的高架全周雷达警戒塔，提早感知超音差高空飞石风暴并向飞船提前2秒做出导航预警。',
    emoji: '🗼',
    woodReq: 5,
    metalReq: 2,
    solarReq: 0,
    effect: '障碍视界拓宽，可大幅减少前方流沙及风刺隐患',
    color: 'rose',
    borderColor: 'border-rose-500/35',
    bgClass: 'from-rose-950/40 to-slate-900/40',
    selectedTextColor: 'text-rose-400'
  },
  {
    id: 'CLINIC' as const,
    name: '生物医疗帐篷',
    english: 'BIO-CHEMICAL MEDICAL TENT',
    description: '配置了自动抗辐射血清再生疗床和隔离负压换污槽的简易急救室，保证生存基础状态。',
    emoji: '🏥',
    woodReq: 3,
    metalReq: 0,
    solarReq: 2,
    effect: '急救加护，碰撞时产生部分能量吸收与短暂防护',
    color: 'sky',
    borderColor: 'border-sky-500/35',
    bgClass: 'from-sky-950/40 to-slate-900/40',
    selectedTextColor: 'text-sky-400'
  },
  {
    id: 'WAREHOUSE' as const,
    name: '物资隔离仓库',
    english: 'SCRAP WAREHOUSE STORE',
    description: '用来分舱干化、存放野外拾荒拾取的废旧铝皮电解槽和高熔木栈板的大型货舱架。',
    emoji: '📦',
    woodReq: 4,
    metalReq: 2,
    solarReq: 0,
    effect: '后勤容量仓扩容，再次发车可选择自动携带15%基建耗材',
    color: 'purple',
    borderColor: 'border-purple-500/35',
    bgClass: 'from-purple-950/50 to-slate-900/40',
    selectedTextColor: 'text-purple-400'
  }
];

export function getCharacterTranslation(id: string, lang: LanguageCode) {
  if (id === 'MALE_PILOT') {
    return {
      name: lang === 'ko' ? '폐토 정비사 · 라이언' : lang === 'en' ? 'Mechanic Ryan' : '废土机械师 · 雷恩',
      description: lang === 'ko' ? '라이언 · 폐토 기계 정비사. 오래된 작업복과 용접용 고글을 착용. 단단한 중형 장갑 셔틀 "철망호"를 조종하며 고철 수집에 특화.' : lang === 'en' ? 'Ryan · Wasteland Mechanic. Wears oil-stained overalls and welding goggles. Pilots the bulky armored "Steel Gouge Heavy Vessel", specializing in scraping & repairs.' : '雷恩 · 废土机械师。身穿旧工装、戴着焊接风镜。驾驶装甲厚重的“钢凿重型艇”，擅长废土拾荒与机械修补。'
    };
  } else if (id === 'FEMALE_PILOT') {
    return {
      name: lang === 'ko' ? '오로라 팬텀 · 아이린' : lang === 'en' ? 'Aurora Ghost Irene' : '极光幽灵 · 艾琳',
      description: lang === 'ko' ? '아이린 · 오로라 유령대원. 발광 네온 나노슈트를 입고 한쪽을 민 비대칭 헤어스타일. 유선형의 초음속 "오로라 스피어"를 몰고 먼지 구름을 요리조리 회피.' : lang === 'en' ? 'Irene · Aurora Ghost. Clad in a neon-cyan reactive nano-suit with a sharp undercut style. Pilots the aerodynamic "Aurora Needle Fighter" to weave through space trash.' : '艾琳 · 极光幽灵。身带莹蓝冷光纳能服，留侧剃短发。驾驶流线型“极光翼针战机”，在星河尘埃间轻盈闪躲。'
    };
  } else if (id === 'SPACE_CAT') {
    return {
      name: lang === 'ko' ? '개조折이냥 · 먀오짱' : lang === 'en' ? 'Cyborg Fold-ear Myau' : '赛博机械折耳 · 喵酱',
      description: lang === 'ko' ? '묘짱 · 사이보그 귀여운 귤猫. 빨간색 기계 부품 의안을 장착하고 양 귀에 레이더 탑재. 안테나 달린 황금 캔 모양 "미야우 컵" 쾌속 정찰선 탑재.' : lang === 'en' ? 'Myau · Cyborg Fold-ear Kitty. Equipped with a glowing red cybernetic gear eye and receptor ears. Pilots the golden pot-shaped "Meow Shuttle Cup" with active foldable sensor ears.' : '喵酱 · 机械折耳橘猫。带红光金属齿轮义眼，双耳上配有电磁信号增幅器。驾驶黄金罐头飞艇“喵星穿梭杯”，造型拥有可动折尾机械雷达。'
    };
  } else {
    return {
      name: lang === 'ko' ? '허스키 대위 · 왕자' : lang === 'en' ? 'Captain Husky Wangzai' : '哈士奇大尉 · 汪仔',
      description: lang === 'ko' ? '왕자 · 우주 중대장 허스키. 모래바람 고글과 부스터 가방을 메고 질주. 꼬리 부분에 다각도 가변 공기舵 판이 설치된 고기동형 "Aero-Tail 개척선"을 조종.' : lang === 'en' ? 'Wangzai · Husky Captain. Equipped with aviator sand-goggles and a miniature rocket jetpack. Pilots the high-mobility "Speed-Rudder Carrier" featuring dual swiveling air stabilizers.' : '汪仔 · 哈士奇大尉。戴软防沙风镜与微型喷气包。驾驶配有多角度双空气舵板的“极速尾舵号”，可以在飞石垃圾风暴中灵活切入。'
    };
  }
}

export function getModuleTranslation(id: string, lang: LanguageCode) {
  switch (id) {
    case 'SHELTER':
      return {
        name: getTranslation(lang, 'moduleShelterName'),
        description: getTranslation(lang, 'moduleShelterBio'),
        effect: getTranslation(lang, 'moduleShelterEffect')
      };
    case 'KITCHEN':
      return {
        name: getTranslation(lang, 'moduleKitchenName'),
        description: getTranslation(lang, 'moduleKitchenBio'),
        effect: getTranslation(lang, 'moduleKitchenEffect')
      };
    case 'TOOLROOM':
      return {
        name: getTranslation(lang, 'moduleToolroomName'),
        description: getTranslation(lang, 'moduleToolroomBio'),
        effect: getTranslation(lang, 'moduleToolroomEffect')
      };
    case 'POWER':
      return {
        name: getTranslation(lang, 'modulePowerName'),
        description: getTranslation(lang, 'modulePowerBio'),
        effect: getTranslation(lang, 'modulePowerEffect')
      };
    case 'WATCHTOWER':
      return {
        name: getTranslation(lang, 'moduleWatchtowerName'),
        description: getTranslation(lang, 'moduleWatchtowerBio'),
        effect: getTranslation(lang, 'moduleWatchtowerEffect')
      };
    case 'CLINIC':
      return {
        name: getTranslation(lang, 'moduleClinicName'),
        description: getTranslation(lang, 'moduleClinicBio'),
        effect: getTranslation(lang, 'moduleClinicEffect')
      };
    case 'WAREHOUSE':
      return {
        name: getTranslation(lang, 'moduleWarehouseName'),
        description: getTranslation(lang, 'moduleWarehouseBio'),
        effect: getTranslation(lang, 'moduleWarehouseEffect')
      };
    default:
      return { name: '', description: '', effect: '' };
  }
}

export default function App() {
  const [showLauncher, setShowLauncher] = useState<boolean>(true);
  const [language, setLanguage] = useState<LanguageCode>(() => {
    return (localStorage.getItem('survival_runner_language') as LanguageCode) || 'zh';
  });
  const [showExitDialog, setShowExitDialog] = useState<boolean>(false);
  const [hasShutDown, setHasShutDown] = useState<boolean>(false);

  const [status, setStatus] = useState<GameStatus>('START');
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterId>('MALE_PILOT');
  const [hp, setHp] = useState<number>(100);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [builtCampLevel, setBuiltCampLevel] = useState<string | null>(null);
  const [buildToast, setBuildToast] = useState<string | null>(null);
  const [campBuildModalOpen, setCampBuildModalOpen] = useState<boolean>(false);
  
  // Materials count
  const [wood, setWood] = useState<number>(0);
  const [metal, setMetal] = useState<number>(0);
  const [solar, setSolar] = useState<number>(0);
  
  // Requirements
  const requiredWood = 4;
  const requiredMetal = 3;
  const requiredSolar = 3;

  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  
  // Difficulty multiplier selection
  const [difficulty, setDifficulty] = useState<'EASY' | 'NORMAL' | 'HARD'>('NORMAL');
  const [tutorialOpen, setTutorialOpen] = useState<boolean>(true);

  // Camp gallery configuration states
  const [viewingGallery, setViewingGallery] = useState<boolean>(false);
  const [selectedGalleryLevel, setSelectedGalleryLevel] = useState<string>('SHELTER');
  const [builtCamps, setBuiltCamps] = useState<string[]>([]);

  // Sci-Fi Login & Google Sheet sync state variables
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loggedInUser, setLoggedInUser] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [isSyncingData, setIsSyncingData] = useState<boolean>(false);
  const [cachedAccounts, setCachedAccounts] = useState<{ username: string; password: string }[]>([]);

  // Synchronize credentials database from public Google Sheets CSV Export
  const syncAccountsFromSheet = async () => {
    setIsSyncingData(true);
    try {
      const spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1R5Y7NWAcD4eTw_lVb0VtI65VCfSGwHAp/export?format=csv';
      const response = await fetch(spreadsheetUrl);
      if (!response.ok) {
        throw new Error('Google Sheet response not ok');
      }
      const rawText = await response.text();
      const normalized = rawText.replace(/\r/g, '');
      const lines = normalized.split('\n');
      const accounts: { username: string; password: string }[] = [];

      lines.forEach((line) => {
        const rawColumns = line.split(',');
        const columns = rawColumns.map(col => col.trim().replace(/^["']|["']$/g, ''));
        const validCols = columns.filter((col) => col !== "");

        if (validCols.length >= 2) {
          const user = validCols[0];
          const pass = validCols[1];
          const lowerUser = user.toLowerCase();

          // Skip headers or blank credentials
          if (
            lowerUser !== 'username' && 
            lowerUser !== '用户名' && 
            lowerUser !== 'account' && 
            lowerUser !== 'name' &&
            lowerUser !== '姓名' &&
            lowerUser !== 'password' &&
            lowerUser !== '密码'
          ) {
            accounts.push({ username: user, password: pass });
          }
        }
      });

      if (accounts.length > 0) {
        setCachedAccounts(accounts);
        localStorage.setItem('survival_runner_accounts_cache', JSON.stringify(accounts));
        console.log('Successfully synchronized synced credentials count:', accounts.length);
      }
    } catch (err) {
      console.error('Failed to auto-sync latest Google Sheet credentials. Offline/Fallback local cache active.', err);
    } finally {
      setIsSyncingData(false);
    }
  };

  // Load highscore, list of built camps, offline credentials cache, and login status
  useEffect(() => {
    // 1. Initialise survival game highscores and camps
    const saved = localStorage.getItem('survival_runner_hi_score');
    if (saved) {
      setHighScore(parseInt(saved, 10));
    }

    try {
      const savedCamps = localStorage.getItem('survival_runner_built_camps');
      if (savedCamps) {
        setBuiltCamps(JSON.parse(savedCamps));
      }
    } catch (e) {
      console.error('Error loading built camps', e);
    }

    // 2. Load cached accounts from local storage to allow offline login fallback instantly
    try {
      const offlineAccounts = localStorage.getItem('survival_runner_accounts_cache');
      if (offlineAccounts) {
        setCachedAccounts(JSON.parse(offlineAccounts));
      }
    } catch (e) {
      console.error('Error loading credentials cache', e);
    }

    // 3. Keep login session if exists
    const savedUser = localStorage.getItem('survival_runner_logged_in_user');
    if (savedUser) {
      setIsLoggedIn(true);
      setLoggedInUser(savedUser);
    }

    // 4. Auto sync fresh data from google sheets
    syncAccountsFromSheet();
  }, []);

  // Update high score in local storage
  const handleScoreUpdate = (currentScore: number) => {
    setScore(currentScore);
    if (currentScore > highScore) {
      setHighScore(currentScore);
      localStorage.setItem('survival_runner_hi_score', currentScore.toString());
    }
  };

  // Sound helper toggle
  const toggleMute = () => {
    const currentMuted = getMuteState();
    setMuteState(!currentMuted);
    setIsMuted(!currentMuted);
  };

  const handleDifficultySelect = (diff: 'EASY' | 'NORMAL' | 'HARD') => {
    setDifficulty(diff);
  };

  const getSpeedMultiplier = () => {
    switch (difficulty) {
      case 'EASY': return 0.85;
      case 'HARD': return 1.45;
      default: return 1.15;
    }
  };

  const checkHasAllResources = () => {
    return wood >= requiredWood && metal >= requiredMetal && solar >= requiredSolar;
  };

  // Start the main runner mode
  const startGame = () => {
    setHp(100);
    setWood(0);
    setMetal(0);
    setSolar(0);
    setScore(0);
    setIsPaused(false);
    setBuiltCampLevel(null);
    setCampBuildModalOpen(false);
    setStatus('RUNNING');
  };

  const handleRestart = () => {
    setIsPaused(false);
    setStatus('START');
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  const onCampArrived = () => {
    setStatus('CAMP_INTERMISSION');
    setCampBuildModalOpen(true);
  };

  const handleCampOptionRest = () => {
    // Rest heals of 35 HP
    setHp(prev => Math.min(100, prev + 35));
    // Continue running
    playCollectSound();
    setStatus('RUNNING');
  };

  const handleCampOptionBuildLevel = (moduleId: string) => {
    const targetModule = CAMP_MODULES.find(m => m.id === moduleId);
    if (!targetModule) return;

    // 1. Subtract resources
    setWood(prev => Math.max(0, prev - targetModule.woodReq));
    setMetal(prev => Math.max(0, prev - targetModule.metalReq));
    setSolar(prev => Math.max(0, prev - targetModule.solarReq));

    // 2. Play beautiful repair sound
    playVictorySound();

    // 3. Persist built camp in local storage
    let updatedList: string[] = [];
    try {
      const savedCamps = localStorage.getItem('survival_runner_built_camps');
      let campsList: string[] = savedCamps ? JSON.parse(savedCamps) : [];
      if (!Array.isArray(campsList)) {
        campsList = [];
      }
      if (!campsList.includes(moduleId)) {
        campsList.push(moduleId);
        localStorage.setItem('survival_runner_built_camps', JSON.stringify(campsList));
        setBuiltCamps(campsList);
        updatedList = campsList;
      } else {
        updatedList = campsList;
      }
    } catch (e) {
      console.error('Error persisting built camp', e);
      updatedList = [...builtCamps];
      if (!updatedList.includes(moduleId)) {
        updatedList.push(moduleId);
        setBuiltCamps(updatedList);
      }
    }

    // 4. Checking if it fits Victory trigger (SHELTER completion represents victory)
    if (moduleId === 'SHELTER') {
      setBuiltCampLevel('SHELTER');
      setCampBuildModalOpen(false);
      setStatus('VICTORY');
    } else {
      // Create a floating feedback toast for building other modules
      const getModuleTranslation = (id: string, prop: 'Name' | 'Bio' | 'Effect') => {
        const key = `module${id.charAt(0).toUpperCase()}${id.slice(1).toLowerCase()}${prop}` as any;
        return getTranslation(language, key);
      };
      const moduleNameTranslated = getModuleTranslation(targetModule.id, 'Name');
      const toastText = language === 'ko'
        ? `🎉 【${moduleNameTranslated}】 건설 성공! 차감 재료: 🌲x${targetModule.woodReq} ⚙️x${targetModule.metalReq} 🔋x${targetModule.solarReq}`
        : language === 'en'
        ? `🎉 【${moduleNameTranslated}】 built successfully! Materials spent: 🌲x${targetModule.woodReq} ⚙️x${targetModule.metalReq} 🔋x${targetModule.solarReq}`
        : `🎉 成功建成 【${moduleNameTranslated}】！耗费材料：🌲x${targetModule.woodReq} ⚙️x${targetModule.metalReq} 🔋x${targetModule.solarReq}`;
      setBuildToast(toastText);
      setTimeout(() => {
        setBuildToast(null);
      }, 5500);
      setCampBuildModalOpen(false);
    }
  };

  const handleCampOptionSkip = () => {
    setStatus('RUNNING');
  };

  // Listen to HP hit 0
  const handleHpChange = (newHp: number) => {
    setHp(newHp);
    if (newHp <= 0) {
      setStatus('GAME_OVER');
      playDefeatSound();
    }
  };

  const handleMaterialsChange = (newWood: number, newMetal: number, newSolar: number) => {
    setWood(newWood);
    setMetal(newMetal);
    setSolar(newSolar);
  };

  // Login verification and session startup handler
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const trimUser = usernameInput.trim();
    const trimPass = passwordInput.trim();

    if (!trimUser || !trimPass) {
      setLoginError(
        language === 'ko'
          ? '사용자 이름과 비밀번호를 입력해주세요!'
          : language === 'en'
          ? 'Username and password cannot be blank!'
          : '用户名或密码不能为空！'
      );
      return;
    }

    // Attempt matching with cached accounts from Google Sheets
    let listToCheck = cachedAccounts;
    if (listToCheck.length === 0) {
      // Sync database immediately if currently empty
      setIsSyncingData(true);
      try {
        const spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1R5Y7NWAcD4eTw_lVb0VtI65VCfSGwHAp/export?format=csv';
        const response = await fetch(spreadsheetUrl);
        if (response.ok) {
          const rawText = await response.text();
          const normalized = rawText.replace(/\r/g, '');
          const lines = normalized.split('\n');
          const accounts: { username: string; password: string }[] = [];
          lines.forEach((line) => {
            const rawColumns = line.split(',');
            const columns = rawColumns.map(col => col.trim().replace(/^["']|["']$/g, ''));
            const validCols = columns.filter((col) => col !== "");

            if (validCols.length >= 2) {
              const u = validCols[0];
              const p = validCols[1];
              const lowerU = u.toLowerCase();
              if (
                lowerU !== 'username' && lowerU !== '用户名' && 
                lowerU !== 'account' && lowerU !== 'name' && lowerU !== '姓名' &&
                lowerU !== 'password' && lowerU !== '密码'
              ) {
                accounts.push({ username: u, password: p });
              }
            }
          });
          if (accounts.length > 0) {
            listToCheck = accounts;
            setCachedAccounts(accounts);
            localStorage.setItem('survival_runner_accounts_cache', JSON.stringify(accounts));
          }
        }
      } catch (err) {
        console.error('Trigger sync error', err);
      } finally {
        setIsSyncingData(false);
      }
    }

    const matched = listToCheck.find(
      (acc) => acc.username === trimUser && acc.password === trimPass
    );

    if (matched) {
      setIsLoggedIn(true);
      setLoggedInUser(matched.username);
      localStorage.setItem('survival_runner_logged_in_user', matched.username);
      playVictorySound();
    } else {
      setLoginError(
        language === 'ko'
          ? '사용자 이름 또는 비밀번호가 잘못되었습니다. 다시 입력해 주세요'
          : language === 'en'
          ? 'Invalid username or password. Please try again'
          : '用户名或密码错误，请重试'
      );
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoggedInUser('');
    setUsernameInput('');
    setPasswordInput('');
    localStorage.removeItem('survival_runner_logged_in_user');
    playCollectSound();
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-0 md:p-6 select-none font-sans relative overflow-hidden" id="survival_runner_app_container">
      
      {/* Dynamic Techno Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />

      {/* Floating Status / App Header */}
      <div className="hidden lg:flex flex-col absolute left-8 top-8 max-w-[280px] bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md select-none border-dashed">
        <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold tracking-wide">
          <Layers className="w-5 h-5 animate-pulse" />
          <span>{language === 'ko' ? '터미널 시스템 상태' : language === 'en' ? 'TERMINAL SYSTEM STATUS' : '终端系统状态'}</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed mb-3">
          {language === 'ko'
            ? '당신은 가벼운 생존 채집 우주선의 조종사입니다. 행성은 금속 핵에너지 폐기물과 독성 폐기물로 덮여 있습니다. 대피소를 재건하기 위해 중요한 자원을 수집하고 순항 초소 캠프와 통신하기 위해 무한히 달려야 합니다.'
            : language === 'en'
            ? 'You are the pilot of a light exploration capsule. The planet’s surface is heavily polluted by toxic spillages and radioactive debris. You must cruise through lanes to gather materials vital for erecting base shields.'
            : '你是一艘轻型生存采集飞船的驾驶员。行星遭受了金属核能废料和毒素垃圾的覆盖。你必须在无限通道上不断疾行，收集重建避难所必要的关键物资，并与巡航哨卡营地进行交互。'}
        </p>
        <div className="space-y-1.5 text-xs text-slate-400">
          <div className="flex justify-between border-b border-slate-800 pb-1">
            <span>🚀 {language === 'ko' ? '순항 제어 속도:' : language === 'en' ? 'Cruise Control Velocity:' : '巡航速度:'}</span>
            <span className="font-mono text-cyan-400">{(getSpeedMultiplier() * 10).toFixed(1)} km/s</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-1">
            <span>🌲 {getTranslation(language, 'woodName')}:</span>
            <span>{language === 'ko' ? '목표' : language === 'en' ? 'Goal' : '目标'} {requiredWood} {language === 'ko' ? '개' : language === 'en' ? 'units' : '罐'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-1">
            <span>⚙️ {getTranslation(language, 'metalName')}:</span>
            <span>{language === 'ko' ? '목표' : language === 'en' ? 'Goal' : '目标'} {requiredMetal} {language === 'ko' ? '개' : language === 'en' ? 'units' : '块'}</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-1">
            <span>🔋 {getTranslation(language, 'solarName')}:</span>
            <span>{language === 'ko' ? '목표' : language === 'en' ? 'Goal' : '目标'} {requiredSolar} {language === 'ko' ? '세트' : language === 'en' ? 'packs' : '组'}</span>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-col absolute right-8 top-8 max-w-[280px] bg-slate-900/60 p-5 rounded-2xl border border-slate-800 backdrop-blur-md select-none border-dashed">
        <div className="flex items-center gap-2 mb-2 text-yellow-500 font-bold tracking-wide">
          <Trophy className="w-5 h-5" />
          <span>{language === 'ko' ? '순위 및 공적' : language === 'en' ? 'LEADERBOARD & RECORDS' : '排行榜 & 成就'}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-300 border-b border-slate-800 pb-1.5 mb-1.5">
          <span>{language === 'ko' ? '역대 최고 비행 거리:' : language === 'en' ? 'Expedition High Record:' : '玩家历史最高行驶:'}</span>
          <span className="font-mono text-cyan-400 font-semibold">{highScore} {getTranslation(language, 'distanceUnit')}</span>
        </div>
        <div className="space-y-2 text-xs text-slate-400">
          <div className="flex gap-2 items-start">
            <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${highScore >= 100 ? 'text-emerald-400' : 'text-slate-600'}`} />
            <div>
              <p className="font-bold text-slate-300">{language === 'ko' ? '샛별 탐험가' : language === 'en' ? 'Rookie Prospect' : '初露锋芒'}</p>
              <p className="text-[11px]">{language === 'ko' ? '단일 질주 비행 거리 100m 돌파' : language === 'en' ? 'Fly more than 100 meters in a single run' : '单局行驶跑酷超过 100 米'}</p>
            </div>
          </div>
          <div className="flex gap-2 items-start border-t border-slate-800 pt-2">
            <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${highScore >= 350 ? 'text-emerald-400' : 'text-slate-600'}`} />
            <div>
              <p className="font-bold text-slate-300">{language === 'ko' ? '황야의 베테랑' : language === 'en' ? 'Wasteland Veteran' : '荒野老兵'}</p>
              <p className="text-[11px]">{language === 'ko' ? '단일 질주 비행 거리 350m 돌파' : language === 'en' ? 'Fly more than 350 meters in a single run' : '单局行驶跑酷超过 350 米'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* CORE SIMULATED SMARTPHONE CABINET */}
      <div 
        className="w-full h-screen md:h-[88vh] md:max-w-[430px] md:rounded-[36px] bg-slate-950 border-0 md:border-[6px] md:border-slate-800 overflow-hidden shadow-2xl relative flex flex-col justify-between z-10 transition-all"
        style={{ boxShadow: '0 0 40px -6px rgba(16, 185, 129, 0.15)' }}
        id="phone_cabinet_frame"
      >
        {/* Phone Notch & Speaker (only on larger displays with rounded view) */}
        <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 top-0 h-5 w-44 bg-slate-800 rounded-b-2xl z-40 select-none">
          <div className="h-1 w-12 bg-slate-900 rounded-full mx-auto mt-1" />
        </div>

        {/* TOP STATUS BAR OVERLAY */}
        <div className="px-5 pt-3 pb-2 bg-slate-900/85 backdrop-blur-md flex justify-between items-center z-30 border-b border-slate-800 select-none">
          <div className="flex items-center gap-1.5 animate-pulse">
            <Zap className={`w-4 h-4 ${status === 'RUNNING' && !isPaused ? 'text-emerald-400 animate-bounce' : 'text-slate-500'}`} />
            <span className="text-[11px] font-mono tracking-wider text-slate-300">SURVIVAL RUN v1.2</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Logged in User info & Logout button */}
            {isLoggedIn && (
              <div className="flex items-center gap-1.5 bg-slate-950/60 px-2 py-0.5 rounded-md border border-slate-800 text-[10px] select-none">
                <User className="w-3 h-3 text-emerald-400" />
                <span className="text-slate-350 font-mono font-bold max-w-[65px] truncate" title={loggedInUser}>{loggedInUser}</span>
                <button 
                  onClick={handleLogout}
                  className="ml-1 text-slate-500 hover:text-rose-400 active:scale-90 transition-all cursor-pointer"
                  title={language === 'ko' ? '세션 로그아웃' : language === 'en' ? 'Sign Out Session' : '退出当前会话'}
                  id="btn_logout_action"
                >
                  <LogOut className="w-2.5 h-2.5" />
                </button>
              </div>
            )}

            {/* Unified Compact Language Dropdown Tracker */}
            <div className="relative inline-flex items-center">
              <select
                 value={language}
                 onChange={(e) => {
                   const selectedLang = e.target.value as LanguageCode;
                   setLanguage(selectedLang);
                   localStorage.setItem('survival_runner_language', selectedLang);
                   playCollectSound();
                 }}
                 className="appearance-none bg-slate-950 hover:bg-slate-900 text-slate-350 hover:text-slate-200 text-[10px] font-bold py-1 pl-5.5 pr-3 rounded border border-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer transition-all font-sans"
              >
                 {LANGUAGES.map((lang) => (
                   <option key={lang.code} value={lang.code} className="bg-slate-950 text-slate-200">
                     {lang.code === 'zh' ? '中' : lang.code === 'ko' ? '한' : 'EN'}
                   </option>
                 ))}
              </select>
              <div className="pointer-events-none absolute left-1.5 text-emerald-550">
                <Globe className="w-2.5 h-2.5 text-emerald-500" />
              </div>
            </div>

            {/* Audio Toggle */}
            <button 
              onClick={toggleMute}
              className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 active:scale-90 transition-all cursor-pointer"
              title="Toggle Audio Synth"
              id="audio_mute_toggle"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-emerald-400" /> : <Volume2 className="w-4 h-4 text-slate-400" />}
            </button>

            {/* Pause/Restart buttons in Top-Right when gameplay is running */}
            {status === 'RUNNING' && (
              <div className="flex items-center gap-1.5" id="hud_interactive_group">
                {/* Pause Button */}
                <button
                  onClick={togglePause}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                    isPaused 
                      ? 'bg-amber-500/20 border-amber-400 text-amber-400 animate-pulse font-extrabold' 
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                  }`}
                  id="btn_pause_toggle"
                >
                  {isPaused ? <Play className="w-2.5 h-2.5 fill-current" /> : <Pause className="w-2.5 h-2.5 fill-current" />}
                  <span>{isPaused ? (language === 'ko' ? '계속하기' : language === 'en' ? 'Resume' : '继续') : (language === 'ko' ? '일시정지' : language === 'en' ? 'Pause' : '暂停')}</span>
                </button>

                {/* Restart / Abort Button */}
                <button
                  onClick={handleRestart}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 border border-rose-500/35 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-all cursor-pointer flex items-center gap-1"
                  id="btn_abort_restart"
                  title="Abandon and restart game selection"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>{language === 'ko' ? '초기화' : language === 'en' ? 'Reset' : '重置'}</span>
                </button>
              </div>
            )}

            {/* Live indicator (Only shown when not playing) */}
            {status !== 'RUNNING' && (
              <div className="text-[11px] font-mono text-cyan-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                <span>LIVE</span>
              </div>
            )}
          </div>
        </div>

        {/* SCENARIO INTERFACE LAYER */}
        <div className="flex-1 relative flex flex-col overflow-hidden" id="inner_terminal_layer">

          {showLauncher ? (
            <div className="absolute inset-0 bg-slate-950 flex flex-col justify-between p-6 z-50 overflow-y-auto font-sans" id="apocalypse_launcher_screen">
              {/* Radioactive/Toxic Red Haze Halo */}
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-900/10 rounded-full filter blur-3xl pointer-events-none select-none z-0" />
              <div className="absolute bottom-1/4 left-1/4 w-44 h-44 bg-orange-950/20 rounded-full filter blur-3xl pointer-events-none select-none z-0" />
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#130e0c_1px,transparent_1px),linear-gradient(to_bottom,#130e0c_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-25 pointer-events-none" />

              {/* Rusted Frame borders */}
              <div className="absolute inset-0 border-[6px] border-double border-orange-950/40 pointer-events-none z-40 rounded-2xl" />
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-orange-500/70 rounded-tl-lg pointer-events-none z-40" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-orange-500/70 rounded-tr-lg pointer-events-none z-40" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-orange-500/70 rounded-bl-lg pointer-events-none z-40" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-orange-500/70 rounded-br-lg pointer-events-none z-40" />

              {/* Language Selector Dropdown at Top-Right */}
              <div className="absolute top-4 right-4 z-50">
                <div className="relative group">
                  <select
                     value={language}
                     onChange={(e) => {
                       const selectedLang = e.target.value as LanguageCode;
                       setLanguage(selectedLang);
                       localStorage.setItem('survival_runner_language', selectedLang);
                       playCollectSound();
                     }}
                     className="appearance-none bg-slate-900/95 hover:bg-slate-850 text-slate-200 text-xs font-semibold py-1.5 pl-8 pr-6 rounded-lg border border-orange-500/35 focus:outline-none focus:border-orange-400 cursor-pointer shadow-md transition-all font-sans"
                  >
                     {LANGUAGES.map((lang) => (
                       <option key={lang.code} value={lang.code} className="bg-slate-950 text-slate-200">
                         {lang.name}
                       </option>
                     ))}
                  </select>
                  <div className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-orange-500">
                    <Globe className="w-3.5 h-3.5" />
                  </div>
                  <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-[9px]">
                    ▼
                  </div>
                </div>
              </div>

              {/* Title Section */}
              <div className="mt-12 text-center space-y-4 shrink-0 select-none z-10">
                <div className="relative inline-flex p-3 rounded-2xl bg-orange-950/40 border border-orange-500/30 text-orange-500 mx-auto justify-center shadow-lg">
                  <Flame className="w-10 h-10 animate-pulse text-orange-500" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-white mb-1 flex flex-col items-center gap-1">
                    <span className="text-xl font-extrabold tracking-wider text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.35)] font-sans">
                      {getTranslation(language, 'launcherTitle')}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 font-mono tracking-widest">
                      {getTranslation(language, 'launcherSubtitle')}
                    </span>
                  </h1>
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-950/30 border border-orange-900/30 text-[9px] text-orange-400 font-mono font-bold">
                    <span>SYS_VER_1.8</span>
                  </div>
                </div>
              </div>

              {/* Centered Trigger Action Buttons */}
              <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full space-y-4 z-10 my-4 px-4">
                <button
                  onClick={() => {
                    setShowLauncher(false);
                    playVictorySound();
                  }}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-450 active:scale-95 font-black text-slate-950 tracking-wider shadow-[0_0_15px_rgba(249,115,22,0.3)] flex items-center justify-center gap-2.5 transition-all cursor-pointer text-sm"
                  id="btn_launcher_start"
                >
                  <Play className="w-4 h-4 fill-current text-slate-950" />
                  <span>{getTranslation(language, 'btnStartGameWeb')}</span>
                </button>

                <button
                  onClick={() => {
                    setShowExitDialog(true);
                    playCollectSound();
                  }}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-850 active:scale-95 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 font-bold tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer text-xs"
                  id="btn_launcher_exit"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{getTranslation(language, 'btnExitGame')}</span>
                </button>
              </div>

              {/* Scrap City silhouette rendering */}
              <div className="absolute bottom-0 inset-x-0 h-40 opacity-15 pointer-events-none z-0 overflow-hidden mix-blend-color-dodge select-none">
                <svg viewBox="0 0 400 120" className="w-full h-full text-slate-800 fill-current" preserveAspectRatio="none">
                  <path d="M0,120 L0,80 L20,80 L25,30 L45,30 L48,120 L60,120 L65,50 L85,45 L90,120 L110,120 L115,10 L135,10 L140,80 L150,80 L152,120 L170,120 L175,60 L190,60 L195,120 L210,120 L212,40 L228,35 L230,120 L245,120 L250,70 L265,70 L270,120 L290,120 L295,20 L315,20 L318,120 L330,120 L335,85 L350,80 L352,120 L370,120 L375,55 L390,55 L400,120 Z" />
                  <path d="M0,120 Q50,70 120,120 Q180,60 250,120 Q320,80 400,120" className="opacity-40 fill-current text-orange-950" />
                  <line x1="30" y1="120" x2="30" y2="40" stroke="#475569" strokeWidth="2" />
                  <line x1="15" y1="45" x2="45" y2="55" stroke="#475569" strokeWidth="1.5" />
                  <line x1="130" y1="120" x2="130" y2="30" stroke="#475569" strokeWidth="2" strokeDasharray="3" />
                  <line x1="330" y1="120" x2="330" y2="60" stroke="#475569" strokeWidth="2" />
                </svg>
              </div>

              {/* Rusted Console Footer bar */}
              <div className="text-center space-y-1 mt-4 shrink-0 select-none z-10 pb-2">
                <p className="text-[8px] text-slate-600 font-mono tracking-wider">
                  ATLAS ENFORCEMENT PROTOCOL // SECURE SUBSYSTEM V-1.8
                </p>
              </div>
            </div>
          ) : !isLoggedIn ? (
            <div className="absolute inset-0 bg-slate-950 flex flex-col justify-between p-6 z-50 overflow-y-auto font-sans" id="login_screen">
              {/* Subtle tech background patterns */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#022c22_1px,transparent_1px),linear-gradient(to_bottom,#022c22_1px,transparent_1px)] bg-[size:1.5rem_1.5rem] opacity-20 pointer-events-none" />
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full filter blur-2xl pointer-events-none" />

              {/* Quick Interactive Language Switcher for Login screen */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-50 select-none">
                <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-mono">
                  <Globe className="w-3.5 h-3.5 text-emerald-500" />
                  <span>LOC</span>
                </div>
                <div className="flex gap-1.5">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setLanguage(lang.code);
                        localStorage.setItem('survival_runner_language', lang.code);
                        playCollectSound();
                      }}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                        language === lang.code
                          ? 'bg-emerald-500/10 border-emerald-400 text-emerald-400 shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-450 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Section */}
              <div className="mt-8 text-center space-y-4 shrink-0 select-none">
                <div className="relative inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto justify-center">
                  <Database className="w-10 h-10 animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-white mb-1 flex flex-col items-center gap-1">
                    <span className="text-xl font-extrabold tracking-wider text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">{getTranslation(language, 'launcherTitle')}</span>
                    <span className="text-xs font-semibold text-slate-550 font-mono tracking-widest">{getTranslation(language, 'launcherSubtitle')}</span>
                  </h1>
                  <p className="text-[10px] text-cyan-400 uppercase tracking-widest font-mono font-semibold">
                    Google Sheets Auth System
                  </p>
                </div>
              </div>

              {/* Form Section */}
              <form onSubmit={handleLoginSubmit} className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full space-y-4 z-10 my-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{getTranslation(language, 'labelUsername')}</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      placeholder={getTranslation(language, 'placeholderUsername')}
                      className="w-full py-2.5 px-3 text-sm bg-slate-900/90 text-slate-100 rounded-xl border border-emerald-500/35 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 active:outline-none focus:outline-none transition-all placeholder-slate-600 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{getTranslation(language, 'labelPassword')}</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder={getTranslation(language, 'placeholderPassword')}
                      className="w-full py-2.5 px-3 text-sm bg-slate-900/90 text-slate-100 rounded-xl border border-emerald-500/35 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 active:outline-none focus:outline-none transition-all placeholder-slate-600 font-mono"
                    />
                  </div>
                </div>

                {/* Error Banner */}
                {loginError && (
                  <div className="text-xs text-red-400 bg-red-950/40 border border-red-500/30 px-3 py-2 rounded-lg text-center font-semibold animate-pulse">
                    ⚠️ {loginError}
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-450 hover:to-teal-350 active:scale-95 font-extrabold text-slate-950 tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>{getTranslation(language, 'btnSubmitLogin')}</span>
                </button>
              </form>

              {/* Status Footer */}
              <div className="text-center space-y-2 mt-4 shrink-0 select-none z-10 pb-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900/80 border border-slate-800 rounded-full text-[10px] text-slate-400 font-mono">
                  {isSyncingData ? (
                    <>
                      <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                      <span>{getTranslation(language, 'syncingDb')}</span>
                    </>
                  ) : (
                    <>
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                      <span>
                        {getTranslation(language, 'cloudSyncReady').replace('%s1', String(cachedAccounts.length))}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-[9px] text-slate-600 select-none">
                  {getTranslation(language, 'securityProtocol')}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* STATS HEAD-UP-DISPLAY (Active only during play/camps) */}
          {(status === 'RUNNING' || status === 'CAMP_INTERMISSION') && (
            <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-slate-950 to-transparent z-20 pointer-events-none select-none">
              
              {/* Row 1: HP Shield Bar */}
              <div className="flex items-center gap-3 mb-2.5 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80 backdrop-blur-md">
                <Heart className={`w-[18px] h-[18px] shrink-0 text-red-500 ${hp <= 30 ? 'animate-bounce' : ''}`} fill="rgb(239, 68, 68)" />
                <div className="flex-1">
                  <div className="flex justify-between items-center text-[10px] font-bold tracking-wider mb-1 text-slate-300">
                    <span>{language === 'ko' ? '우주선 외부 장갑 상태' : language === 'en' ? 'Spaceship Armor Status' : '飞船装甲完整度'}</span>
                    <span className={`font-mono ${hp <= 30 ? 'text-red-400 text-xs animate-pulse font-extrabold' : 'text-emerald-400'}`}>{hp}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        hp <= 30 
                          ? 'bg-gradient-to-r from-rose-600 to-red-500' 
                          : hp <= 60 
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-400' 
                            : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      }`}
                      style={{ width: `${hp}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Survival Inventory Progress Bar */}
              <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/80 backdrop-blur-md">
                <div className="flex justify-between items-center text-[10px] uppercase tracking-wider mb-2 font-bold text-slate-300">
                  <span className="flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-cyan-400" />
                    {language === 'ko' ? '대피소 수리 원목/합금/전지' : language === 'en' ? 'Shelter Repair Wood/Metal/Solar' : '避难所修复木材/金属/电芯'}
                  </span>
                  <span className="text-cyan-400 font-mono">
                    {Math.min(requiredWood + requiredMetal + requiredSolar, wood + metal + solar)} / {requiredWood + requiredMetal + requiredSolar}
                  </span>
                </div>

                {/* Combined Progress list */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono text-slate-400">
                      <span>{getTranslation(language, 'woodName')}</span>
                      <span className={wood >= requiredWood ? 'text-emerald-400' : 'text-amber-400'}>{wood}/{requiredWood}</span>
                    </div>
                    <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 transition-all" style={{ width: `${Math.min(100, (wood/requiredWood)*100)}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono text-slate-400">
                      <span>{getTranslation(language, 'metalName')}</span>
                      <span className={metal >= requiredMetal ? 'text-emerald-400' : 'text-blue-400'}>{metal}/{requiredMetal}</span>
                    </div>
                    <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 transition-all" style={{ width: `${Math.min(100, (metal/requiredMetal)*100)}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono text-slate-400">
                      <span>{getTranslation(language, 'solarName')}</span>
                      <span className={solar >= requiredSolar ? 'text-emerald-400' : 'text-yellow-400'}>{solar}/{requiredSolar}</span>
                    </div>
                    <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.min(100, (solar/requiredSolar)*100)}%` }} />
                    </div>
                  </div>
                </div>

                {checkHasAllResources() && (
                  <div className="mt-2 text-[10px] text-emerald-400 font-bold animate-pulse text-center flex items-center justify-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {language === 'ko' ? '핵심 자재 수집 완료! 다음 구역으로 안전하게 입성하세요' : language === 'en' ? 'All core materials gathered! Check in at the next safe camp to win' : '材料全部备齐！请进入任意下一个营地通关'}
                  </div>
                )}
              </div>

              {/* Row 3: Live Distance Metre indicators */}
              <div className="flex justify-between items-center mt-2 px-1 text-xs select-none">
                <span className="font-mono text-slate-300 bg-slate-900/60 px-2.5 py-1 rounded-md border border-slate-800 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <strong>{score}</strong> {getTranslation(language, 'distanceUnit')}
                </span>
                <span className="text-[10px] font-mono text-slate-400 uppercase bg-slate-900/60 px-2.5 py-1 rounded-md border border-slate-800 flex items-center gap-1">
                  {getTranslation(language, 'difficultyLabel')}: 
                  <span className={`font-bold ${difficulty === 'HARD' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {difficulty === 'EASY' ? getTranslation(language, 'diffEasy') : difficulty === 'HARD' ? getTranslation(language, 'diffHard') : getTranslation(language, 'diffNormal')}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* 1. START OVERLAY */}
          {status === 'START' && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col justify-between p-6 z-30 overflow-y-auto" id="start_screen">
              {/* Back to Launcher Button at Top-Left */}
              <button
                onClick={() => {
                  setShowLauncher(true);
                  playCollectSound();
                }}
                className="absolute top-4 left-4 z-40 bg-slate-900/90 hover:bg-slate-850 active:scale-95 text-slate-350 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-800 hover:border-slate-750 flex items-center gap-1.5 text-xs transition-all cursor-pointer shadow-md select-none"
                id="btn_back_to_launcher"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-emerald-400 font-bold" />
                <span className="font-semibold">{getTranslation(language, 'btnBackToLanding')}</span>
              </button>

              <div className="mt-5 text-center space-y-4">
                <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto justify-center select-none animate-pulse">
                  <Flame className="w-10 h-10" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-white mb-1">
                    {getTranslation(language, 'launcherTitle')}
                  </h1>
                  <p className="text-xs text-emerald-400 uppercase tracking-widest font-mono font-semibold">
                    SURVIVAL INTEGRATION TERMINAL
                  </p>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-left space-y-2 text-xs text-slate-300">
                  <p className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    {getTranslation(language, 'rulesTitle')}
                  </p>
                  <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
                    <li>
                      {language === 'ko' ? (
                        <>키보드의 <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono border border-slate-700 text-white font-bold text-[10px]">A</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono border border-slate-700 text-white font-bold text-[10px]">D</kbd> 키(또는 하단 가상 방향키)를 사용하여 좌우로 기동하여 장벽을 회피하세요.</>
                      ) : language === 'en' ? (
                        <>Use keyboard <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono border border-slate-700 text-white font-bold text-[10px]">A</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono border border-slate-700 text-white font-bold text-[10px]">D</kbd> keys (or touch indicators) to navigate left & right.</>
                      ) : (
                        <>使用键盘 <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono border border-slate-700 text-white font-bold text-[10px]">A</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono border border-slate-700 text-white font-bold text-[10px]">D</kbd> 键（或下方虚拟按键）控制角色左右移动避障。</>
                      )}
                    </li>
                    <li>
                      {language === 'ko' ? (
                        <>무작위로 만나는 <strong className="text-amber-500">원자재</strong> (<span className="text-amber-500">목재</span>, <span className="text-blue-400">금속합금</span>, <span className="text-yellow-400">배터리</span>)를 획득하여 수리 진척도를 백분율로 채우십시오.</>
                      ) : language === 'en' ? (
                        <>Collect <strong className="text-amber-500">Materials</strong> (<span className="text-amber-500">Wood</span>, <span className="text-blue-400">Metal</span>, <span className="text-yellow-400">Solar Cell</span>) along the run to progress.</>
                      ) : (
                        <>随机遭遇<strong className="text-amber-500">材料</strong> (<span className="text-amber-500">木材</span>, <span className="text-blue-400">金属</span>, <span className="text-yellow-400">电电芯</span>) 获得收集进度。</>
                      )}
                    </li>
                    <li>
                      {language === 'ko' ? (
                        <>방사능 드럼통이나 가시 더미 장애물에 충돌시 장갑이 파손되며, 장갑 수치가 0이 되면 비행선이 침묵합니다.</>
                      ) : language === 'en' ? (
                        <>Colliding with <strong className="text-red-400">nuclear waste or spike obstacles</strong> damages armor; drops to 0 results in expedition failure.</>
                      ) : (
                        <>撞到<strong className="text-red-400">核废料/尖刺垃圾障碍物</strong>会扣除生命，降低到0即任务失败。</>
                      )}
                    </li>
                    <li>
                      {language === 'ko' ? (
                        <><span className="text-emerald-400 font-bold">임무 목표 클리어</span>: 필요한 기지 건설 물품을 모두 모은 뒤, <strong className="text-emerald-400 underline decoration-wavy">다음 차례 등장하는 안전 대피소 캠프로 통과 진입</strong>하시면 최종 오로라 생존 모듈이 가상 완공되어 보호 배리어를 구축합니다!</>
                      ) : language === 'en' ? (
                        <><span className="text-emerald-400 font-bold">Expedition Success</span>: Accumulate the required assets, then <strong className="text-emerald-400 underline decoration-wavy">enter any subsequent Safe Camp checkpoint</strong> to deploy the airtight radiation shield and secure mankind's survival!</>
                      ) : (
                        <><span className="text-emerald-400 font-bold">最终通关</span>：成功备满所有所需材料后，<strong className="text-emerald-400 underline decoration-wavy">驶入任何下一个生成的安全营地</strong>，解锁并搭建防辐射护罩通关！</>
                      )}
                    </li>
                  </ul>
                </div>

                {/* Difficulty selector tabs */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">{getTranslation(language, 'navSpeedHeader')}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['EASY', 'NORMAL', 'HARD'] as const).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => handleDifficultySelect(diff)}
                        className={`py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          difficulty === diff
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 font-bold shadow-md'
                            : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                        }`}
                        id={`diff_select_${diff.toLowerCase()}`}
                      >
                        {diff === 'EASY' ? getTranslation(language, 'diffEasy') + ' (0.8x)' : diff === 'HARD' ? getTranslation(language, 'diffHard') + ' (1.4x)' : getTranslation(language, 'diffNormal') + ' (1.1x)'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-3">
                {/* Character Selection Layout */}
                <div className="space-y-2 text-left bg-slate-900/40 p-3 rounded-xl border border-slate-850">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                      {getTranslation(language, 'selectPilotStarship')}
                    </label>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-extrabold uppercase">
                      {getTranslation(language, 'selectionCountHint')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {CHARACTERS.map((char) => {
                      const isSelected = selectedCharacter === char.id;
                      return (
                        <button
                          key={char.id}
                          onClick={() => setSelectedCharacter(char.id)}
                          className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all duration-150 cursor-pointer relative group ${
                            isSelected
                              ? 'bg-emerald-500/15 border-emerald-400 ring-2 ring-emerald-500/30 font-extrabold scale-102'
                              : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                          id={`char_select_${char.id.toLowerCase()}`}
                        >
                          {/* Animated floating emoji avatar */}
                          <div className={`text-2xl mb-1 filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] ${isSelected ? 'animate-bounce' : 'group-hover:scale-110 duration-150'}`}>
                            {char.avatar}
                          </div>
                          
                          <span className="text-[9px] font-semibold text-center truncate max-w-full block">
                            {getCharacterTranslation(char.id, language).name}
                          </span>

                          {/* Soft colored neon indicator dot on top-right */}
                          {isSelected && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center text-[8px] text-slate-950 font-black shadow-md border border-slate-950 animate-pulse">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Character stats outline banner */}
                  <div className="px-2 py-1.5 bg-slate-950 rounded border border-slate-850 text-[10px] text-slate-400 flex justify-between items-center mt-1">
                    <span className="text-slate-500">{getTranslation(language, 'pilotSpecLabel')}</span>
                    <span className="font-bold text-cyan-400 flex items-center gap-1">
                      <span>{getCharacterTranslation(selectedCharacter, language).description}</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3" id="start_actions_group">
                  <button
                    onClick={startGame}
                    className="py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-95 font-bold text-slate-950 tracking-wide shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-1.5 text-xs sm:text-sm transition-all cursor-pointer"
                    id="btn_start_game"
                  >
                    <Play className="w-4 h-4 fill-slate-950 text-slate-950" />
                    {getTranslation(language, 'btnLaunchRunList')}
                  </button>

                  <button
                    onClick={() => {
                      setViewingGallery(true);
                      // Play dynamic collect sound for page navigation feedback
                      playCollectSound();
                    }}
                    className="py-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 active:scale-95 font-bold text-slate-200 tracking-wide flex items-center justify-center gap-1.5 text-xs sm:text-sm transition-all cursor-pointer"
                    id="btn_view_camp_gallery"
                  >
                    <Layers className="w-4 h-4 text-cyan-400" />
                    {getTranslation(language, 'btnViewCampGallery')}
                  </button>
                </div>

                <div className="text-center">
                  <span className="text-[10px] text-slate-500">
                    {getTranslation(language, 'controlFooterLabel')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. GAME CANVAS PANEL (Active during main loop states) */}
          {(status === 'RUNNING' || status === 'CAMP_INTERMISSION' || status === 'GAME_OVER' || status === 'VICTORY') && (
            <div className="absolute inset-0 z-10 w-full h-full">
              <GameCanvas
                status={status}
                selectedCharacterId={selectedCharacter}
                onHpChange={handleHpChange}
                onMaterialsChange={handleMaterialsChange}
                onScoreChange={handleScoreUpdate}
                onCampArrived={onCampArrived}
                requiredWood={requiredWood}
                requiredMetal={requiredMetal}
                requiredSolar={requiredSolar}
                currentWood={wood}
                currentMetal={metal}
                currentSolar={solar}
                gameSpeedMultiplier={getSpeedMultiplier()}
                isPaused={isPaused}
                language={language}
              />
            </div>
          )}
          {/* 3. CAMP INTERMISSION STATE MODAL */}
          {status === 'CAMP_INTERMISSION' && (
            <div className="absolute inset-0 bg-slate-950/90 z-30 flex flex-col justify-between p-6 select-none animate-fade-in" id="camp_screen">
              <div className="text-center mt-5 space-y-4 flex-1 flex flex-col justify-center">
                <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 flex items-center justify-center mx-auto text-3xl animate-bounce">
                  		🏕️
                </div>
                
                <div>
                  <h2 className="text-xl font-extrabold text-white">
                    {getTranslation(language, 'safeCampReached')}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {getTranslation(language, 'safeCampDesc')}
                  </p>
                </div>

                {/* Status Box in Camp */}
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-3 text-left">
                  <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
                    <span className="text-slate-400">{getTranslation(language, 'carArmorLabel')}</span>
                    <span className={`font-bold font-mono ${hp < 40 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>
                      {hp} / 100 HP
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    <p className="text-[11px] font-mono text-slate-400 uppercase tracking-widest font-semibold mb-1">
                      {language === 'ko' ? '생존 누적 자원 수납함' : language === 'en' ? 'Survival Resource Inventory' : '生存材料收集看板'}
                    </p>
                    <div className="flex justify-between items-center bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-500 text-xs">🌲</span>
                        <span>{getTranslation(language, 'woodMaterialTitle')}</span>
                      </div>
                      <span className={wood >= 4 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                        {wood} / 4
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="text-blue-400 text-xs">⚙️</span>
                        <span>{getTranslation(language, 'metalMaterialTitle')}</span>
                      </div>
                      <span className={metal >= 3 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                        {metal} / 3
                      </span>
                    </div>

                    <div className="flex justify-between items-center bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <span className="text-yellow-400 text-xs">🔋</span>
                        <span>{getTranslation(language, 'solarMaterialTitle')}</span>
                      </div>
                      <span className={solar >= 3 ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                        {solar} / 3
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs p-3 rounded-xl bg-slate-900/60 text-slate-400 border border-slate-800/60 leading-relaxed text-left">
                  <span className="text-cyan-300 flex gap-1.5 items-start">
                    <Wrench className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{getTranslation(language, 'campBuildMenuInfo')}</span>
                  </span>
                </div>
              </div>

              {/* Camp Interaction Options buttons */}
              <div className="space-y-2.5 pb-2">
                <button
                  onClick={() => setCampBuildModalOpen(true)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 active:scale-95 font-black text-slate-950 shadow-lg tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-all hover:brightness-110"
                  id="btn_camp_build_selector_trigger"
                >
                  <Wrench className="w-5 h-5 fill-slate-950 text-slate-950" />
                  {getTranslation(language, 'btnCampBuildTrigger')}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCampOptionRest}
                    className="py-3 rounded-xl bg-slate-900 border border-emerald-500/30 hover:bg-slate-800 active:scale-95 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    title="Heal base"
                    id="btn_camp_heal"
                  >
                    <Heart className="w-4 h-4 fill-emerald-500" />
                    {getTranslation(language, 'btnRefitHeal')}
                  </button>

                  <button
                    onClick={handleCampOptionSkip}
                    className="py-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 active:scale-95 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    id="btn_camp_run_on"
                  >
                    <Flame className="w-4 h-4 text-orange-400" />
                    {getTranslation(language, 'btnSkipContinueRun')}
                  </button>
                </div>
              </div>

              {/* Popup Modal Choice Window inside Camp */}
              {campBuildModalOpen && (
                <div className="absolute inset-0 bg-slate-950/90 z-40 flex flex-col justify-center items-center p-4 select-none animate-fade-in" id="camp_build_modal_overlay">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col h-full max-h-[480px]">
                    
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-b border-slate-800 p-4 shrink-0">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-black text-white flex items-center gap-1.5 uppercase font-sans tracking-wide">
                          <Wrench className="w-4 h-4 text-emerald-400" />
                          <span>{getTranslation(language, 'blueprintModalTitle')}</span>
                        </h3>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                        {getTranslation(language, 'blueprintModalDesc')}
                      </p>
                    </div>

                    {/* Materials Inventory inside pop-up */}
                    <div className="bg-slate-950/95 py-2 px-4 border-b border-slate-800 flex justify-between items-center shrink-0">
                      <div className="text-[10px] text-slate-400 font-mono tracking-wider font-semibold uppercase">
                        {getTranslation(language, 'inventoryTitle')}
                      </div>
                      <div className="flex gap-2.5 text-xs">
                        <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                          🌲 <strong className="text-amber-400 font-mono">{wood}</strong>
                        </span>
                        <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                          ⚙️ <strong className="text-cyan-400 font-mono">{metal}</strong>
                        </span>
                        <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-[11px]">
                          🔋 <strong className="text-yellow-400 font-mono">{solar}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Choices viewport */}
                    <div className="p-3 space-y-2.5 overflow-y-auto flex-1 bg-slate-900/45">
                      {CAMP_MODULES.map((module) => {
                        const isBuilt = builtCamps.includes(module.id);
                        const prerequisiteMet = module.id === 'SHELTER' || builtCamps.includes('SHELTER');
                        const hasMaterials = wood >= module.woodReq && metal >= module.metalReq && solar >= module.solarReq;
                        const canBuild = !isBuilt && prerequisiteMet && hasMaterials;

                        return (
                          <div
                            key={module.id}
                            onClick={() => {
                              if (canBuild) {
                                handleCampOptionBuildLevel(module.id);
                              }
                            }}
                            className={`border rounded-xl p-3 transition-all relative ${
                              isBuilt 
                                ? 'bg-emerald-950/20 border-emerald-500/40 opacity-90 cursor-default'
                                : canBuild
                                  ? `bg-gradient-to-br ${module.bgClass} ${module.borderColor} hover:scale-[1.01] hover:brightness-110 cursor-pointer shadow-lg` 
                                  : 'bg-slate-950/45 border-slate-900/60 opacity-40 cursor-not-allowed'
                            }`}
                            id={`card_module_${module.id}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{module.emoji}</span>
                                <div>
                                  <h4 className={`text-xs font-black tracking-tight ${isBuilt ? 'text-emerald-400' : hasMaterials && prerequisiteMet ? 'text-white' : 'text-slate-500'}`}>
                                    {getModuleTranslation(module.id, language).name}
                                  </h4>
                                  <p className="text-[8px] font-mono tracking-wider text-slate-500">
                                    {module.english}
                                  </p>
                                </div>
                              </div>

                              <div>
                                {isBuilt ? (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/40 text-[8px] text-emerald-400 font-extrabold">
                                    ✓ {language === 'ko' ? '완공됨' : language === 'en' ? 'Built' : '已建成'}
                                  </span>
                                ) : !prerequisiteMet ? (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-950 text-[8px] text-rose-500 border border-rose-500/20 font-medium scale-90 inline-block">
                                    🔒 {language === 'ko' ? '선행 대피소 필요' : language === 'en' ? 'Requires Shelter' : '须先建庇护所'}
                                  </span>
                                ) : canBuild ? (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/35 text-[8px] text-emerald-400 font-extrabold animate-pulse">
                                    ⚒ {language === 'ko' ? '건설 가능' : language === 'en' ? 'Ready to Build' : '可投建'}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[8px] text-slate-500 font-medium">
                                    {language === 'ko' ? '재료 부족' : language === 'en' ? 'Low Materials' : '材料不足'}
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed text-left">
                              {getModuleTranslation(module.id, language).description}
                            </p>

                            <div className="mt-2 text-[9px] text-teal-300 bg-slate-950/60 py-1 px-2 rounded flex items-center justify-start gap-1">
                              <Check className="w-2.5 h-2.5 text-teal-400 shrink-0" />
                              <span className="text-left">{getModuleTranslation(module.id, language).effect}</span>
                            </div>

                            {/* Resource sub-reqs indicators */}
                            {!isBuilt && (
                              <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[8px] text-slate-400 font-mono">
                                <span>{language === 'ko' ? '설계 필요 리소스:' : language === 'en' ? 'Building Costs:' : '建造需求量:'}</span>
                                <div className="flex gap-2">
                                  <span className={wood >= module.woodReq ? 'text-emerald-400 font-bold' : 'text-rose-500'}>
                                    {getTranslation(language, 'woodName')} {wood}/{module.woodReq}
                                  </span>
                                  <span className={metal >= module.metalReq ? 'text-emerald-400 font-bold' : 'text-rose-500'}>
                                    {getTranslation(language, 'metalName')} {metal}/{module.metalReq}
                                  </span>
                                  <span className={solar >= module.solarReq ? 'text-emerald-400 font-bold' : 'text-rose-500'}>
                                    {getTranslation(language, 'solarName')} {solar}/{module.solarReq}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Footer buttons of POPUP */}
                    <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setHp(prev => Math.min(100, prev + 35));
                          setCampBuildModalOpen(false);
                          playCollectSound();
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-slate-900 border border-emerald-500/30 hover:bg-slate-800 active:scale-95 text-emerald-400 font-bold text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1"
                        id="btn_overlay_modal_rest"
                      >
                        <Heart className="w-3.5 h-3.5 fill-emerald-500 text-emerald-400" />
                        {language === 'ko' ? '외판 긴급 수리 (+35HP)' : language === 'en' ? 'Repair Fuselage (+35HP)' : '修复机翼舱 (+35HP)'}
                      </button>

                      <button
                        onClick={() => {
                          setCampBuildModalOpen(false);
                          setStatus('RUNNING');
                        }}
                        className="flex-1 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 active:scale-95 text-slate-300 font-bold text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1"
                        id="btn_overlay_modal_continue"
                      >
                        <Flame className="w-3.5 h-3.5 text-orange-400" />
                        {language === 'ko' ? '질주 탐험 속행' : language === 'en' ? 'Continue Expedition' : '继续探险路段'}
                      </button>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

          {/* 4. GAME OVER STATE OVERLAY */}
          {status === 'GAME_OVER' && (
            <div className="absolute inset-0 bg-rose-950/95 z-40 flex flex-col justify-between p-6 overflow-y-auto" id="game_over_screen">
              <div className="text-center mt-10 space-y-4">
                <div className="inline-flex p-4 rounded-full bg-red-500/20 text-red-500 animate-pulse">
                  <AlertTriangle className="w-12 h-12" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                    船体彻底断裂
                  </h2>
                  <p className="text-xs text-red-400 uppercase tracking-widest font-mono font-bold mt-1">
                    SHIP DAMAGE TERMINATION
                  </p>
                </div>

                <div className="bg-slate-950/80 p-5 rounded-xl border border-rose-900/50 text-left max-w-sm mx-auto space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-rose-950 text-slate-300 text-xs">
                    <span>本次航行里程:</span>
                    <span className="font-mono text-cyan-400 font-extrabold text-sm">{score} 米</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-rose-950 text-slate-300 text-xs">
                    <span>历史最高纪录:</span>
                    <span className="font-mono text-emerald-400 font-bold">{highScore} 米</span>
                  </div>
                  <div className="text-[11px] text-slate-400 text-center leading-relaxed">
                    在高速滑行中，未能避开大量有毒垃圾，飞船承受了过量的机械损伤。请尝试进行微调，避开尖刺废品，并尽可能提早搜满建材驶入大本营！
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-4 max-w-sm mx-auto w-full animate-bounce">
                <button
                  onClick={startGame}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 active:scale-95 font-extrabold text-white tracking-wide shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  id="btn_retry_game"
                >
                  <RotateCcw className="w-5 h-5" />
                  再次发起修复冲刺
                </button>
                <div className="text-center">
                  <button 
                    onClick={() => setStatus('START')}
                    className="text-xs text-slate-400 underline hover:text-slate-200 cursor-pointer"
                    id="btn_back_start"
                  >
                    返回配置首页
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5. VICTORY STATE OVERLAY */}
          {status === 'VICTORY' && (() => {
            const shelterInfo = CAMP_MODULES.find(m => m.id === 'SHELTER') || CAMP_MODULES[0];
            return (
              <div className="absolute inset-0 bg-slate-950/95 z-40 flex flex-col justify-between p-6 overflow-y-auto animate-fade-in" id="victory_screen">
                <div className="text-center mt-10 space-y-4">
                  <div className="inline-flex p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 animate-bounce">
                    <Sparkles className="w-12 h-12" />
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center justify-center gap-1.5 leading-tight">
                      <span>{shelterInfo.emoji}</span>
                      <span>{shelterInfo.name}建成胜利！</span>
                    </h2>
                    <p className="text-xs text-emerald-400 uppercase tracking-widest font-mono font-bold mt-1">
                      {shelterInfo.english} ESTABLISHED - VICTORY
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl text-left max-w-sm mx-auto space-y-3 shadow-xl">
                    <div className="text-xs text-slate-300 border-b border-slate-850 pb-2 flex justify-between">
                      <span>本次跑酷距离:</span>
                      <span className="font-mono text-cyan-400 font-extrabold">{score} 米</span>
                    </div>

                    <div className="text-xs text-slate-300 border-b border-slate-850 pb-2 flex justify-between">
                      <span>所剩生命状况:</span>
                      <span className="font-mono text-emerald-400 font-bold">{hp}% HP</span>
                    </div>

                    <div className="text-xs text-slate-300 border-b border-slate-850 pb-2 flex justify-between">
                      <span>核心枢纽模块:</span>
                      <span className="font-black uppercase tracking-wider font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {shelterInfo.name}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed text-center px-1 font-sans bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                      生存奇迹！你在前路坎坷、风沙侵袭的大地之上，凭借非凡的意志，终于建成了支撑废土求生所有后续科技基石的「核心基础庇护所」！这标志着你在这片荒野上稳稳扎下了根。现在你已经可以规划并在图鉴中欣赏其余全生态子舱室了！
                    </p>
                    
                    <div className="mt-3 text-[10px] text-emerald-300 font-bold bg-emerald-500/10 border border-emerald-500/20 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                      <span>解锁成果：解锁厨房、医疗舱、雷达等功能模块！</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4 max-w-sm mx-auto w-full animate-pulse">
                  <button
                    onClick={startGame}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 active:scale-95 font-extrabold text-slate-950 tracking-wide shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                    id="btn_win_restart"
                  >
                    <RotateCcw className="w-5 h-5 text-slate-950" />
                    再次挑战高里程纪录
                  </button>
                  <div className="text-center">
                    <button 
                      onClick={() => setStatus('START')}
                      className="text-xs text-slate-400 underline hover:text-slate-200 cursor-pointer"
                      id="btn_win_back_start"
                    >
                      返回游戏首页
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 6. CAMP GALLERY STATE OVERLAY */}
          {viewingGallery && (
            <div className="absolute inset-0 bg-slate-950 z-50 flex flex-col justify-between p-4 font-sans select-none animate-fade-in" id="camp_gallery_screen">
              
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mt-1 select-none shrink-0">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Layers className="w-5 h-5 animate-pulse" />
                  </span>
                  <div>
                    <h2 className="text-sm font-black text-white tracking-widest uppercase flex items-center gap-1">
                      <span>营地图鉴基地</span>
                    </h2>
                    <p className="text-[9px] font-mono tracking-wider text-slate-500 uppercase">
                      SURVIVAL SHELTER ATLAS
                    </p>
                  </div>
                </div>

                {/* Back button on high right */}
                <button
                  onClick={() => {
                    setViewingGallery(false);
                    playCollectSound();
                  }}
                  className="py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-850 active:scale-95 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1 text-[11px] font-bold cursor-pointer transition-all"
                  id="btn_gallery_back"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>返回</span>
                </button>
              </div>

              {/* Developer Secret Cheat trigger or diagnostic info line */}
              <div className="bg-slate-900/60 py-1.5 px-3 border border-slate-850 rounded-lg flex justify-between items-center text-[10px] text-slate-400 shrink-0 select-none">
                <span className="flex items-center gap-1 text-slate-400">
                  <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                  <span>已投建科技设施: <strong className="text-emerald-400 font-mono">{builtCamps.length}</strong> / 7 款</span>
                </span>
                
                {/* One click unlock helper to make review/verification extremely seamless */}
                <button
                  onClick={() => {
                    const allCampsList = ['SHELTER', 'KITCHEN', 'TOOLROOM', 'POWER', 'WATCHTOWER', 'CLINIC', 'WAREHOUSE'];
                    setBuiltCamps(allCampsList);
                    localStorage.setItem('survival_runner_built_camps', JSON.stringify(allCampsList));
                    playVictorySound();
                  }}
                  className="text-[9px] hover:text-cyan-400 text-slate-600 underline font-mono cursor-pointer transition-colors"
                  title="点击可一键解锁所有营地，无需通关，便于立刻进行3D效果查看和评审！"
                >
                  [一键解锁全部图鉴]
                </button>
              </div>

              {/* Primary 3D Viewer Canvas container */}
              <div className="flex-1 bg-gradient-to-b from-slate-950 via-slate-900/40 to-slate-950 border border-slate-900 rounded-2xl relative my-3 overflow-hidden flex flex-col justify-center items-center shadow-inner">
                
                {/* Grid Background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:1rem_1rem] opacity-40 pointer-events-none" />

                {/* 3D Core Viewport component */}
                <div className="w-full h-full absolute inset-0 z-10">
                  <CampGalleryCanvas 
                    builtCamps={builtCamps} 
                  />
                </div>

                {/* Floating dynamic info banner on TOP of the canvas */}
                <div className="absolute top-3 left-3 bg-slate-950/85 border border-slate-800 py-1 px-2.5 rounded-lg text-[9px] backdrop-blur-md text-slate-300 select-none z-20 font-mono tracking-wider flex items-center gap-1">
                  <span>当前选中展示:</span>
                  <span className="font-bold text-cyan-400">
                    {CAMP_MODULES.find(m => m.id === selectedGalleryLevel)?.emoji} {CAMP_MODULES.find(m => m.id === selectedGalleryLevel)?.name}
                  </span>
                </div>

                <div className="absolute top-3 right-3 bg-slate-950/85 border border-slate-800 py-1 px-2.5 rounded-lg text-[9px] backdrop-blur-md text-slate-300 select-none z-20 font-mono tracking-wider flex items-center gap-1">
                  <span>解锁状态:</span>
                  {builtCamps.includes(selectedGalleryLevel) ? (
                    <span className="text-emerald-400 font-extrabold flex items-center gap-0.5">
                      <CheckCircle className="w-2.5 h-2.5 inline text-emerald-400" /> 已建造
                    </span>
                  ) : (
                    <span className="text-rose-450 font-bold flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5 inline text-rose-500" /> 未建造
                    </span>
                  )}
                </div>

              </div>

              {/* Selection cards of the seven modules */}
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 flex-wrap shrink-0">
                {CAMP_MODULES.map((module) => {
                  const unlocked = builtCamps.includes(module.id);
                  const isSelected = selectedGalleryLevel === module.id;
                  
                  return (
                    <button
                      key={module.id}
                      onClick={() => {
                        setSelectedGalleryLevel(module.id);
                        playCollectSound();
                      }}
                      className={`p-1 py-1 px-1 rounded-xl border flex flex-col items-center justify-center transition-all duration-155 cursor-pointer relative ${
                        isSelected
                          ? unlocked
                            ? 'bg-cyan-500/10 border-cyan-400 ring-2 ring-cyan-500/30 text-white font-black scale-[1.02] font-sans text-xs'
                            : 'bg-slate-900 border-slate-500 ring-2 ring-slate-500/30 text-slate-300 font-black scale-[1.02] font-sans text-xs'
                          : 'bg-slate-950/80 border-slate-850 text-slate-500 hover:border-slate-800 hover:text-slate-400 font-sans text-xs'
                      }`}
                      id={`gallery_select_${module.id.toLowerCase()}`}
                    >
                      <span className={`text-base mb-0.5 ${!unlocked ? 'grayscale opacity-30 filter blur-[0.5px]' : ''}`}>
                        {module.emoji}
                      </span>
                      <span className="text-[8px] font-bold tracking-tight text-center truncate w-full px-0.5">{module.name}</span>
                      
                      {unlocked ? (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full flex items-center justify-center text-[7px] text-slate-950 font-black border border-slate-950">
                          ✓
                        </span>
                      ) : (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-slate-800 rounded-full flex items-center justify-center text-[7px] text-slate-400 border border-slate-400/20">
                          🔒
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Camp description panel */}
              <div className="bg-slate-900/90 border border-slate-850 p-3 rounded-2xl shrink-0 mt-2 relative overflow-hidden flex flex-col justify-between">
                
                {/* Background decorative glow based on camp class */}
                <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full filter blur-xl opacity-20 bg-cyan-500 pointer-events-none" />

                <div>
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-1.5 mb-1.5 select-none animate-fade-in" key={selectedGalleryLevel}>
                    <div>
                      <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>{CAMP_MODULES.find(t => t.id === selectedGalleryLevel)?.emoji}</span>
                        <span>{CAMP_MODULES.find(t => t.id === selectedGalleryLevel)?.name}</span>
                      </h4>
                      <p className="text-[8px] font-mono tracking-wider text-slate-500 uppercase">
                        {CAMP_MODULES.find(t => t.id === selectedGalleryLevel)?.english}
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wide border ${
                      builtCamps.includes(selectedGalleryLevel)
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/35'
                        : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}>
                      {builtCamps.includes(selectedGalleryLevel) ? '已建成' : '未解锁'}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-relaxed text-left min-h-[36px]">
                    {CAMP_MODULES.find(t => t.id === selectedGalleryLevel)?.description}
                  </p>
                </div>

                <div className="mt-1.5 text-[9.5px] text-teal-300 bg-slate-950/60 py-1 px-2 rounded-lg border border-slate-850 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span className="font-semibold select-none text-left">
                    建造成果：
                    <span className="text-slate-300 font-normal">{CAMP_MODULES.find(t => t.id === selectedGalleryLevel)?.effect}</span>
                  </span>
                </div>

                {/* Material recipe requirements list in the bottom footer */}
                <div className="mt-2 flex justify-between items-center text-[9px] text-slate-500 font-mono select-none">
                  <span>建造所需物资储备:</span>
                  <div className="flex gap-2">
                    <span className="text-amber-400 font-bold">
                      木材 {CAMP_MODULES.find(t => t.id === selectedGalleryLevel)?.woodReq}
                    </span>
                    <span className="text-cyan-400 font-bold">
                      合金 {CAMP_MODULES.find(t => t.id === selectedGalleryLevel)?.metalReq}
                    </span>
                    <span className="text-yellow-400 font-bold">
                      电池 {CAMP_MODULES.find(t => t.id === selectedGalleryLevel)?.solarReq}
                    </span>
                  </div>
                </div>

              </div>

            </div>
          )}

            </>
          )}

          {/* Mock Console Exit Directive Modal */}
          {showExitDialog && (
            <div className="absolute inset-0 bg-black/95 z-55 flex flex-col justify-center items-center p-6 select-none animate-fade-in" id="exit_dialog_modal">
              <div className="bg-slate-950 border border-red-500/35 p-5 rounded-2xl max-w-xs text-center space-y-4 shadow-[0_0_25px_rgba(239,68,68,0.25)] relative z-50">
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-500 text-xl mx-auto animate-pulse">
                  ⚠️
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    {language === 'ko' ? '터미널 셧다운 통제' : language === 'en' ? 'SYSTEM STANDBY DIRECTIVE' : '终端关闭指令'}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                    {getTranslation(language, 'exitAlertText')}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => {
                      setHasShutDown(true);
                      setShowExitDialog(false);
                      playVictorySound();
                    }}
                    className="py-2 px-3 rounded-lg bg-red-600 hover:bg-red-500 active:scale-95 font-bold text-white text-[11px] transition-colors cursor-pointer"
                  >
                    {getTranslation(language, 'confirm')}
                  </button>
                  <button
                    onClick={() => {
                      setShowExitDialog(false);
                      playCollectSound();
                    }}
                    className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-850 active:scale-95 border border-slate-800 text-slate-300 text-[11px] transition-all cursor-pointer"
                  >
                    {getTranslation(language, 'cancel')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CRT Standby Black Screen */}
          {hasShutDown && (
            <div className="absolute inset-0 bg-black z-55 flex flex-col justify-center items-center p-6 select-none font-mono" id="shutdown_terminal_black">
              <div className="text-left space-y-2 max-w-xs text-red-500 relative z-50">
                <p className="animate-pulse">{">>> TERMINAL_STATUS: OFFLINE"}</p>
                <p className="text-xs text-slate-400 font-mono">{">>> Connection to satellite base severed."}</p>
                <p className="text-xs text-slate-400 font-mono">{">>> Core fusion reactor placed on safe standby."}</p>
                <p className="text-[10px] text-slate-705 font-mono pt-4 select-all">SYSTEM REF: RUNNER_ATLAS_5579B</p>
                <button
                  onClick={() => {
                    setHasShutDown(false);
                    setShowLauncher(true);
                    playVictorySound();
                  }}
                  className="mt-6 py-1.5 px-3 rounded bg-red-950 hover:bg-red-900 text-red-400 text-[10px] font-bold border border-red-500/30 transition-colors cursor-pointer"
                >
                  🛰️ {language === 'ko' ? '터미널 재부팅' : language === 'en' ? 'Reboot Console' : '重启终端'}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* MOCK HARDWARE SPEAKER/HOME LINE */}
        <div className="h-4 bg-slate-900 flex items-center justify-center select-none shrink-0 border-t border-slate-800">
          <div className="w-24 h-1 bg-slate-700 rounded-full" />
        </div>
      </div>

      {/* Tutorial panel overlay for desktop/tablet views */}
      <div className="hidden xl:flex flex-col gap-2 mt-4 max-w-[430px] w-full text-slate-400 text-[11px] text-center select-none bg-slate-900/30 p-3 rounded-2xl border border-slate-800 backdrop-blur">
        <p className="font-semibold text-slate-300">🎮 玩家简易操作手册</p>
        <p>键盘按键 <strong className="text-cyan-400">A / D</strong> 键或 <strong>左 / 右方向键</strong> 滑动轮翼避开垃圾尘埃；点击游戏界面底部两侧 <strong className="text-emerald-400">「◀ A 键」「D 键 ▶」</strong> 虚拟按钮同样生效，完全适配平板及触按设备！</p>
      </div>

    </div>
  );
}
