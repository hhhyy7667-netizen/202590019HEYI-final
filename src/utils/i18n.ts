/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LanguageCode = 'zh' | 'en' | 'ko';

export interface TranslationDict {
  // Common Buttons
  confirm: string;
  cancel: string;
  close: string;
  back: string;
  btnBackToLanding: string;

  // New Launcher / Start Game Screen
  launcherTitle: string;
  launcherSubtitle: string;
  btnStartGameWeb: string;
  btnExitGame: string;
  exitAlertText: string;
  alertConfirm: string;
  alertCancel: string;

  // Login Screen
  loginTitle: string;
  loginSubtitle: string;
  labelUsername: string;
  placeholderUsername: string;
  labelPassword: string;
  placeholderPassword: string;
  btnSubmitLogin: string;
  errorPrefix: string;
  syncingDb: string;
  cloudSyncReady: string;
  securityProtocol: string;

  // Status HUD & Controls during running
  shipArmorDurability: string;
  distanceUnit: string;
  difficultyLabel: string;
  diffEasy: string;
  diffNormal: string;
  diffHard: string;
  diffEasyTab: string;
  diffNormalTab: string;
  diffHardTab: string;
  materialsCollected: string;
  woodName: string;
  metalName: string;
  solarName: string;
  speedGear: string;
  btnReset: string;
  btnMute: string;
  touchLeftRightLabel: string;

  // Pre-game Start Overlay Options (Inside Game START)
  rulesTitle: string;
  rule1: string;
  rule2: string;
  rule3: string;
  rule4: string;
  navSpeedHeader: string;
  selectPilotStarship: string;
  selectionCountHint: string;
  pilotSpecLabel: string;
  btnLaunchRunList: string;
  btnViewCampGallery: string;
  controlFooterLabel: string;

  // Pause screen overlay
  pauseTitle: string;
  pauseSubtitle: string;
  statCurrentDistance: string;
  statRemainingArmor: string;
  btnResumeRun: string;
  btnRestartGame: string;

  // Camp Intermission (Reach Safe Camp)
  safeCampReached: string;
  safeCampDesc: string;
  carArmorLabel: string;
  woodMaterialTitle: string;
  metalMaterialTitle: string;
  solarMaterialTitle: string;
  campBuildMenuInfo: string;
  btnCampBuildTrigger: string;
  btnRefitHeal: string;
  btnSkipContinueRun: string;
  blueprintModalTitle: string;
  blueprintModalDesc: string;
  inventoryTitle: string;
  moduleBioHeader: string;
  moduleCostHeader: string;
  moduleEffectHeader: string;
  btnBuildNow: string;
  badgeFuturisticModuleActive: string;
  missingMaterialsError: string;
  btnLaunchNextRun: string;

  // Victory Overlay
  victoryTitle: string;
  victorySubtitle: string;
  victoryCoreHub: string;
  victoryDesc: string;
  victoryRewardInfo: string;
  btnReturnToCampGallery: string;

  // Game over overlay
  gameOverTitle: string;
  gameOverSubtitle: string;
  gameOverCurrentDistance: string;
  gameOverHighScore: string;
  gameOverReclaimedMaterials: string;
  gameOverSuggestions: string;
  btnDeployAndLaunch: string;
  btnReturnToTerminal: string;

  // Dynamic Camp Modules names, bios, effects
  moduleShelterName: string;
  moduleShelterBio: string;
  moduleShelterEffect: string;

  moduleKitchenName: string;
  moduleKitchenBio: string;
  moduleKitchenEffect: string;

  moduleToolroomName: string;
  moduleToolroomBio: string;
  moduleToolroomEffect: string;

  modulePowerName: string;
  modulePowerBio: string;
  modulePowerEffect: string;

  moduleWatchtowerName: string;
  moduleWatchtowerBio: string;
  moduleWatchtowerEffect: string;

  moduleClinicName: string;
  moduleClinicBio: string;
  moduleClinicEffect: string;

  moduleWarehouseName: string;
  moduleWarehouseBio: string;
  moduleWarehouseEffect: string;

  // Camp gallery
  galleryTitle: string;
  galleryDesc: string;
  galleryBack: string;
  galleryHint: string;
  galleryStatusUnbuilt: string;
  galleryStatusBuilt: string;
}

export const LANGUAGES: { code: LanguageCode; name: string }[] = [
  { code: 'zh', name: '简体中文' },
  { code: 'en', name: 'English' },
  { code: 'ko', name: '한국어' }
];

export const DICTIONARY: Record<LanguageCode, TranslationDict> = {
  zh: {
    confirm: '确定',
    cancel: '取消',
    close: '关闭',
    back: '返回',
    btnBackToLanding: '返回起点',

    launcherTitle: '荒野生存跑酷',
    launcherSubtitle: 'SURVIVAL INTEGRATION TERMINAL',
    btnStartGameWeb: '开始游戏',
    btnExitGame: '退出游戏',
    exitAlertText: '终端已离线。您现在可以安全关闭浏览器标签页了。',
    alertConfirm: '我知道了',
    alertCancel: '留在终端',

    loginTitle: '荒野生存跑酷',
    loginSubtitle: 'Google Sheets 验证登陆系统',
    labelUsername: '用户名 (USERNAME)',
    placeholderUsername: '请输入用户名...',
    labelPassword: '密码 (PASSWORD)',
    placeholderPassword: '请输入密码...',
    btnSubmitLogin: '立即授权登录',
    errorPrefix: '登录失败: ',
    syncingDb: '正在从表格同步数据库...',
    cloudSyncReady: '云端同步就绪 (已载入 {count} 组账密)',
    securityProtocol: 'SECURITY DIRECT INTERFACE VIA PROTOCOL G-S-A',

    shipArmorDurability: '飞船装甲完整度',
    distanceUnit: '米',
    difficultyLabel: '难度',
    diffEasy: '低速',
    diffNormal: '常规',
    diffHard: '极速',
    diffEasyTab: '低速 (0.8x)',
    diffNormalTab: '常规 (1.1x)',
    diffHardTab: '飞速 (1.4x)',
    materialsCollected: '已收集材料',
    woodName: '木材',
    metalName: '金属',
    solarName: '限时电芯',
    speedGear: '当前转速',
    btnReset: '重置',
    btnMute: '静音/音效',
    touchLeftRightLabel: '左右机动',

    rulesTitle: '核心生存法则',
    rule1: '使用键盘 A / D 键（或下方虚拟按键）控制角色左右移动避障。',
    rule2: '随机遭遇材料 (木材, 金属, 电电芯) 获得收集进度。',
    rule3: '撞到核废料/尖刺垃圾障碍物会扣除生命，降低到0即任务失败。',
    rule4: '最终通关：成功备满所有所需材料后，驶入任何下一个生成的安全营地，解锁并搭建防辐射护罩通关！',
    navSpeedHeader: '微调巡航速度机能',
    selectPilotStarship: '选择首航角色科幻飞船 (必选)',
    selectionCountHint: '4选1',
    pilotSpecLabel: '特色及外观样式:',
    btnLaunchRunList: '开启荒野奔袭',
    btnViewCampGallery: '查看营地',
    controlFooterLabel: '支持键盘按键与移动端双侧灵敏触控',

    pauseTitle: '战机推进已挂起',
    pauseSubtitle: 'NAVIGATION FLIGHT SUSPENDED',
    statCurrentDistance: '当前里程',
    statRemainingArmor: '装甲剩余',
    btnResumeRun: '继续跑酷',
    btnRestartGame: '重新开始',

    safeCampReached: '已抵达「哨卡营地」',
    safeCampDesc: '你现在处于电磁防辐射安全区，可以暂时停下休息。',
    carArmorLabel: '车辆装甲:',
    woodMaterialTitle: '木材建筑架 (Wood)',
    metalMaterialTitle: '特种合金片 (Metal)',
    solarMaterialTitle: '光电复合电池 (Solar)',
    campBuildMenuInfo: '根据收集到的木材、合金和电池材料，在此可以逐步规划并建造你的自循环废土营地！必须优先投建【基础庇护所】解锁其余全部功能性高科技舱室。',
    btnCampBuildTrigger: '规划与建造营地设施 (建造菜单)',
    btnRefitHeal: '进行修整 (+35HP)',
    btnSkipContinueRun: '继续荒野跑酷',
    blueprintModalTitle: '基地模块化规划与投建蓝图',
    blueprintModalDesc: '收集材料并解锁高科技模块！必须先成立并建造「基础庇护所」，才能解锁其它六大生态功能子模块进行全面升级！',
    inventoryTitle: '当前持有建材袋:',
    moduleBioHeader: '模块说明:',
    moduleCostHeader: '建造耗材需求:',
    moduleEffectHeader: '建成常驻属性:',
    btnBuildNow: '立即投产建造',
    badgeFuturisticModuleActive: '⭐ 该太空模块已圆满投产',
    missingMaterialsError: '❌ 材料不足，无法投建该舱室',
    btnLaunchNextRun: '全功率点火 重新启动发车',

    victoryTitle: '核心基础庇护所建成胜利！',
    victorySubtitle: 'BASIC SHELTER ESTABLISHED - VICTORY',
    victoryCoreHub: '核心枢纽模块',
    victoryDesc: '生存奇迹！你在前路坎坷、风沙侵袭的大地之上，凭借非凡的意志，终于建成了支撑废土求生所有后续科技基石的「核心基础庇护所」！这标志着你在这片荒野上稳稳扎下了根。现在你已经可以规划并在图鉴中欣赏其余全生态子舱室了！',
    victoryRewardInfo: '解锁成果：解锁厨房、医疗舱、雷达等功能模块！',
    btnReturnToCampGallery: '返回基地图鉴桌面',

    gameOverTitle: '发车探索被迫悬停',
    gameOverSubtitle: 'STARSHIP SHELL RE-ENTRY COLLAPSED',
    gameOverCurrentDistance: '本次奔袭深度',
    gameOverHighScore: '历史终极纪录',
    gameOverReclaimedMaterials: '抢收回送的碎弃物资',
    gameOverSuggestions: '废土前路沙尘风暴瞬息变幻，遇到碎裂石和核废料桶务必提前左右滑行机动避险，不要贪多噢！加油，下一趟一定能满物资入驻营地！',
    btnDeployAndLaunch: '极低空投送 重新发车',
    btnReturnToTerminal: '返回桌面',

    moduleShelterName: '基础庇护所',
    moduleShelterBio: '简易坚固的恒温装甲气溶胶防辐射舱，废土落脚点的核心基石。必须最先建造，才能安全规划并投建其余高阶功能模块。',
    moduleShelterEffect: '营地物理闭环防护圈激活 · 达成第一阶段生存通关！',

    moduleKitchenName: '废土厨房舱',
    moduleKitchenBio: '炊事热量合成补给配餐间。提供经过深度净化、无高毒沙尘气溶胶残留的流体高能配料，让体能维持充盈。',
    moduleKitchenEffect: '炊事能量合成，修整生命防护力极大调优',

    moduleToolroomName: '工具整备室',
    moduleToolroomBio: '带有焊接摇臂和激光定焦整流模块的微型车间，可升级探险用雷达定位针以增强收集范围。',
    moduleToolroomEffect: '采集吸附增容，磁场吸取材料阻尼极大拓宽',

    modulePowerName: '储能发电站',
    modulePowerBio: '高能光电转换及负极蓄能电力网，收集太阳电芯并提供整营稳定动力，强力负荷极光磁场。',
    modulePowerEffect: '稳定磁场保护，每次遭遇障碍可缓冲过载破损',

    moduleWatchtowerName: '全向瞭望雷达塔',
    moduleWatchtowerBio: '在营地边缘耸立的高架全周雷达警戒塔，提早感知超音差高空飞石风暴并向飞船提前2秒做出导航预警。',
    moduleWatchtowerEffect: '障碍视界拓宽，可大幅减少前方流沙及风刺隐患',

    moduleClinicName: '生物医疗帐篷',
    moduleClinicBio: '配置了自动抗辐射血清再生疗床和隔离负压换污槽的简易急救室，保证生存基础状态。',
    moduleClinicEffect: '急救加护，碰撞时产生部分能量吸收与短暂防护',

    moduleWarehouseName: '物资隔离仓库',
    moduleWarehouseBio: '用来分舱干化、存放野外拾荒拾取的废旧铝皮电解槽和高熔木栈板的大型货舱架。',
    moduleWarehouseEffect: '后勤容量仓扩容，再次发车可选择自动携带15%基建耗材',

    galleryTitle: '废土重建营地图鉴列表',
    galleryDesc: '根据你在废土长途跑酷中回收的材料，解锁并全天候投影这些尖端模块。打造能够让人类幸存者繁衍生息的超级基地。',
    galleryBack: '返回主舱',
    galleryHint: '切换模块观察3D全息投影效果',
    galleryStatusUnbuilt: '🔒 未建造 (缺建筑核心)',
    galleryStatusBuilt: '✅ 已在图鉴完成投产'
  },
  en: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    close: 'Close',
    back: 'Back',
    btnBackToLanding: 'Main Menu',

    launcherTitle: 'Wasteland Runner',
    launcherSubtitle: 'SURVIVAL INTEGRATION TERMINAL',
    btnStartGameWeb: 'Start Game',
    btnExitGame: 'Exit Terminal',
    exitAlertText: 'Terminal is offline now. You can safely close this browser or container tab.',
    alertConfirm: 'Understood',
    alertCancel: 'Stay in Terminal',

    loginTitle: 'Wasteland Runner',
    loginSubtitle: 'Google Sheets Auth Integration',
    labelUsername: 'Username (USERNAME)',
    placeholderUsername: 'Enter your account...',
    labelPassword: 'Password (PASSWORD)',
    placeholderPassword: 'Enter your credentials...',
    btnSubmitLogin: 'Authorize & Enter',
    errorPrefix: 'Auth Error: ',
    syncingDb: 'Syncing cached directory from database...',
    cloudSyncReady: 'Cloud Sync Active ({count} profiles loaded)',
    securityProtocol: 'SECURITY DIRECT INTERFACE VIA PROTOCOL G-S-A',

    shipArmorDurability: 'Hull Armor Integrity',
    distanceUnit: 'm',
    difficultyLabel: 'Speed',
    diffEasy: 'Slow',
    diffNormal: 'Cruise',
    diffHard: 'Hyper',
    diffEasyTab: 'Slow (0.8x)',
    diffNormalTab: 'Normal (1.1x)',
    diffHardTab: 'Speedy (1.4x)',
    materialsCollected: 'Materials Harvested',
    woodName: 'Wood scaffolding',
    metalName: 'Special alloys',
    solarName: 'Solar battery cells',
    speedGear: 'Engine Torque',
    btnReset: 'Abort',
    btnMute: 'Mute/Audio',
    touchLeftRightLabel: 'Maneuver Left/Right',

    rulesTitle: 'Survival Protocols',
    rule1: 'Navigate using Key A / D (or bottom arrows) to bank the vessel left / right and dodge hazardous waste.',
    rule2: 'Run across wreckage resources (Wood, Metal, Solar batteries) to store construction components.',
    rule3: 'Colliding with hazardous storage drums or spikes severely fractures armor plating. Defeat is absolute when HP reduces to zero.',
    rule4: 'Vessel Victory: Assemble necessary components and pilot into the active base camp to spawn defensive anti-radiation domes!',
    navSpeedHeader: 'Calibrate Flight Velocity',
    selectPilotStarship: 'Choose Vessel Expedition Pilot',
    selectionCountHint: 'Select 1 of 4',
    pilotSpecLabel: 'Pilot Ship Specifications:',
    btnLaunchRunList: 'Launch Starship Venture',
    btnViewCampGallery: 'View Camp Gallery',
    controlFooterLabel: 'Supports keyboard layout as well as mobile-responsive split tactile touch bars',

    pauseTitle: 'Thrusters Suspended',
    pauseSubtitle: 'NAVIGATION FLIGHT SUSPENDED',
    statCurrentDistance: 'Distance Run',
    statRemainingArmor: 'Plating Integrity',
    btnResumeRun: 'Resume Exploration',
    btnRestartGame: 'Restart Simulation',

    safeCampReached: 'Beacon Camp Station Located',
    safeCampDesc: 'You are safe inside the electromagnetic shielding grid. Repair and upgrade.',
    carArmorLabel: 'Plating Status:',
    woodMaterialTitle: 'Fiber Wood Stacks (Wood)',
    metalMaterialTitle: 'Refinement Alloy Plating (Metal)',
    solarMaterialTitle: 'Composite Recharge Cells (Solar)',
    campBuildMenuInfo: 'Consume wood, allow materials, and batteries to draft automated base modules! Build the [Basic Shelter] first to deploy remaining functional sectors.',
    btnCampBuildTrigger: 'Configure & Launch Blueprint constructions',
    btnRefitHeal: 'Perform Ship Repairs (+35HP)',
    btnSkipContinueRun: 'Thrust engines into wasteland',
    blueprintModalTitle: 'Expedition Construct Blueprints',
    blueprintModalDesc: 'Spend scavenged material to authorize modules. [Basic Shelter] is mandatory prior to erecting specialized compartments.',
    inventoryTitle: 'Carried Scraps Inventory:',
    moduleBioHeader: 'Compartment Description:',
    moduleCostHeader: 'Resource materials required:',
    moduleEffectHeader: 'Erected Permanent Buff:',
    btnBuildNow: 'Erect Module Now',
    badgeFuturisticModuleActive: '⭐ Compartment Active & Standardized',
    missingMaterialsError: '❌ Insufficient cargo materials to construct',
    btnLaunchNextRun: 'Ignite thrusters & Launch',

    victoryTitle: 'Survival Shelter Operational!',
    victorySubtitle: 'BASIC SHELTER ESTABLISHED - VICTORY',
    victoryCoreHub: 'Core Hub Module',
    victoryDesc: 'Absolute Miracle! Battling through radioactive dust and extreme crosswind storms, you built the [Primary Base Shelter]! Humanity is anchored on this desolate celestial body. You can now configure remaining specialized modules from the holographic desk.',
    victoryRewardInfo: 'Milestone: Kitchen, clinics, and radar 어레이 are fully active!',
    btnReturnToCampGallery: 'Return to Camp Gallery Hub',

    gameOverTitle: 'Vessel Exploration Intercepted',
    gameOverSubtitle: 'STARSHIP SHELL RE-ENTRY COLLAPSED',
    gameOverCurrentDistance: 'Expedition Flight Distance',
    gameOverHighScore: 'Historic Max Record',
    gameOverReclaimedMaterials: 'Secured Material Cargo',
    gameOverSuggestions: 'Wasteland sandstorms are unpredictable. Prioritize steering well beforehand to slide outside hazardous barriers and waste, do not greed collector packs! Try again, traveler!',
    btnDeployAndLaunch: 'Sortie: Relaunch and Drop Into Wasteland',
    btnReturnToTerminal: 'Back to Desk',

    moduleShelterName: 'Basic Shelter',
    moduleShelterBio: 'A reinforced hermetic armor shell vault. Shielding vital metrics of survivors from aerosol fallout. Must be built first to initialize auxiliary stations.',
    moduleShelterEffect: 'Physical seal ring active · Phase I Survival Victory Achieved!',

    moduleKitchenName: 'Wasteland Kitchen & Mess',
    moduleKitchenBio: 'Caloric synthesizer lab. Filter dangerous particles from sandstorms of native planet, rendering nutrient meals to fuel physical stamina.',
    moduleKitchenEffect: 'Nutrient synthesizer: heal potency dramatically intensified during rest',

    moduleToolroomName: 'Scrap & Mechanic Workshop',
    moduleToolroomBio: 'Equipped with heavy laser tools and calibration rigs. Optimizes vessel magnets to attract materials from further distances.',
    moduleToolroomEffect: 'Attraction Magnetism extended; material drag ranges significantly widened',

    modulePowerName: 'Solar Dynamo Power Grid',
    modulePowerBio: 'A network converts space solar rays into high frequency storage vaults. Powers full camp grids, reinforcing structural armor deflectors.',
    modulePowerEffect: 'Static shielding: buffers server collision penalty upon striking barriers',

    moduleWatchtowerName: 'Long-Range Radar Arrays',
    moduleWatchtowerBio: 'Tower projecting radar surveillance over camp boundaries. Forecasts solar flares and high-velocity firestorms in advance.',
    moduleWatchtowerEffect: 'Spikes and landslide hazards highlighted sooner on your layout',

    moduleClinicName: 'Bio-Chemical Medical Tent',
    moduleClinicBio: 'Sterile chemical room with anti-rad sleeping units and automatic syringe dispensers. Preserves life indicators.',
    moduleClinicEffect: 'Life support: grants short transient damage immunity when armor fails',

    moduleWarehouseName: 'Sealed Scrap Warehouse',
    moduleWarehouseBio: 'Dehumidified containers storing heavy aluminum pieces, high-melt boards, and general debris bags.',
    moduleWarehouseEffect: 'Supply buffer: start the run with an automatic 15% cargo resources',

    galleryTitle: 'Wasteland Sanctuary Registry',
    galleryDesc: 'Holographic logs showing authorized colony compartments. Construct these base segments using space junk to guarantee the revival of community structures.',
    galleryBack: 'Back to Terminal',
    galleryHint: 'Toggle units below to display full 3D interactive holographic models',
    galleryStatusUnbuilt: '🔒 Unbuilt (Requires core shelter)',
    galleryStatusBuilt: '✅ Authorized and Active'
  },
  ko: {
    confirm: '확인',
    cancel: '취소',
    close: '닫기',
    back: '돌아가기',
    btnBackToLanding: '시작 화면',

    launcherTitle: '황야 생존 러너',
    launcherSubtitle: 'SURVIVAL INTEGRATION TERMINAL',
    btnStartGameWeb: '게임 시작',
    btnExitGame: '종료',
    exitAlertText: '터미널이 현재 오프라인 상태입니다. 이제 안심하고 브라우저 탭을 닫으셔도 됩니다.',
    alertConfirm: '확인',
    alertCancel: '터미널 유지',

    loginTitle: '황야 생존 러너',
    loginSubtitle: '구글 시트 연동 검증 로그인',
    labelUsername: '사용자 이름 (USERNAME)',
    placeholderUsername: '사용자 이름을 입력하세요...',
    labelPassword: '비밀번호 (PASSWORD)',
    placeholderPassword: '비밀번호를 입력하세요...',
    btnSubmitLogin: '액세스 수락 및 로그인',
    errorPrefix: '로그인 실패: ',
    syncingDb: '구글 스프레드시트에서 데이터를 가져오는 중...',
    cloudSyncReady: '클라우드 동기화 완료 ({count}개 계정 로드됨)',
    securityProtocol: 'SECURITY DIRECT INTERFACE VIA PROTOCOL G-S-A',

    shipArmorDurability: '보호 장갑 내구도',
    distanceUnit: 'm',
    difficultyLabel: '이동 속도',
    diffEasy: '저속',
    diffNormal: '일반 크루즈',
    diffHard: '초고속',
    diffEasyTab: '저속 (0.8x)',
    diffNormalTab: '일반 (1.1x)',
    diffHardTab: '초고속 (1.4x)',
    materialsCollected: '수집된 자재 리포트',
    woodName: '목재 조각',
    metalName: '금속 부품',
    solarName: '태양열 배터리',
    speedGear: '핵심 기어 속도',
    btnReset: '재구성',
    btnMute: '사운드 토글',
    touchLeftRightLabel: '좌우 기동 제어',

    rulesTitle: '생존 수칙 통제',
    rule1: 'A / D 키 (혹은 하부 타일 화살표)를 사용해 우주선을 조향하고 장애물을 회피하십시오.',
    rule2: '길에 널린 목재, 금속, 전지 부품을 습득하여 건설 자원을 비축하십시오.',
    rule3: '독성 타르 방사능 드럼통이나 가시 철사에 충돌 시 큰 내구도 차감을 겪으며, 0에 도달하면 탐사가 영구 중단됩니다.',
    rule4: '최종 기지 수용: 전 자재 보급을 완수하고 전방의 안전 캠프 포드로 돌입하면 보호 방사능 캐노피를 생성해 임무에 승리합니다!',
    navSpeedHeader: '순항 추진 엔진 제어',
    selectPilotStarship: '항행 지원 탐사 드라이버 캐릭터 결정 (필수)',
    selectionCountHint: '4개 중 1개 선택',
    pilotSpecLabel: '특징 및 파일럿 선체 디자인:',
    btnLaunchRunList: '황야 기동 개시',
    btnViewCampGallery: '대피 캠프 감상',
    controlFooterLabel: '키보드 매핑 제어 및 모바일 전용 양방향 터치 인터페이스 완벽 대응',

    pauseTitle: '추진 엔진 일시 대기',
    pauseSubtitle: 'NAVIGATION FLIGHT SUSPENDED',
    statCurrentDistance: '질주 거리',
    statRemainingArmor: '남은 선체 내구도',
    btnResumeRun: '임무 재개',
    btnRestartGame: '시뮬레이션 재출발',

    safeCampReached: '안전 신호 구역 캠프 입항',
    safeCampDesc: '전자기적 방사 보호 영역에 안착했습니다. 정비와 정리를 진행하십시오.',
    carArmorLabel: '장갑 상태:',
    woodMaterialTitle: '압착 원목 판재 (Wood)',
    metalMaterialTitle: '강화 합금 슬레이트 (Metal)',
    solarMaterialTitle: '고효율 축전식 전지 (Solar)',
    campBuildMenuInfo: '회수 완료한 목재와 금속, 배터리를 결합하여 첨단 생존 구역을 완공하십시오! 다른 보조동을 활성화하려면 반드시 야외 [기초 대피소]를 선행 건설하셔야만 합니다.',
    btnCampBuildTrigger: '기지 업그레이드 전술 배치도 (건설 메뉴)',
    btnRefitHeal: '선체 긴급 외판 땜질 (+35HP)',
    btnSkipContinueRun: '황야 돌파 속행',
    blueprintModalTitle: '구획 기지 모듈 엔지니어 도면',
    blueprintModalDesc: '재활용 원자재로 첨단 캐빈들을 등록하세요. [기초 대피소]를 설치한 후 비로소 다운스트림 특수 격실 구조물이 건설됩니다.',
    inventoryTitle: '누적 잔고 수납함:',
    moduleBioHeader: '소형 모듈 설명:',
    moduleCostHeader: '소요 설계 리소스:',
    moduleEffectHeader: '정착 상주 메리트:',
    btnBuildNow: '모듈 수동 기안 건설',
    badgeFuturisticModuleActive: '⭐ 비활성 영역 투영 완료 및 작동 중',
    missingMaterialsError: '❌ 물자 화물 잔고가 충분하지 않습니다',
    btnLaunchNextRun: '추진 풀 점화 세대 다음 기지 발진',

    victoryTitle: '기초 보호 대피소 완공 및 생존 성공!',
    victorySubtitle: 'BASIC SHELTER ESTABLISHED - VICTORY',
    victoryCoreHub: '통제 센터 코어',
    victoryDesc: '대단한 생존 신화! 방사능 폭사 사막 풍파를 극복하고 인류 거점의 핵심 주춧돌인 [기초 대피소 허브] 건설에 성공하셨습니다! 이제 더 고도화된 하위 포드 시스템들을 도감 테이블에서 둘러보고 수용을 진행해 보세요!',
    victoryRewardInfo: '달성 결과: 황야 급식동, 응급 의료 텐트, 레이더 관측 타워 해제 완료!',
    btnReturnToCampGallery: '기지 도감 관제창 복귀',

    gameOverTitle: '개동 탐사선 비행 통신 불능',
    gameOverSubtitle: 'STARSHIP SHELL RE-ENTRY COLLAPSED',
    gameOverCurrentDistance: '탐문 전진 심도',
    gameOverHighScore: '통합 역사 기록',
    gameOverReclaimedMaterials: '회수한 유용한 고철 더미',
    gameOverSuggestions: '황야 지평선의 고농도 오염 구름은 대단히 위험합니다. 돌더미나 방사성 바렐이 가까워지면 지체하지 말고 좌우 슬라이드 기동하여 피해 장기 내구도를 지키십시오! 다음 질주엔 완공을 앞당겨 봅시다!',
    btnDeployAndLaunch: '저고도 전개 및 시뮬레이터 가동',
    btnReturnToTerminal: '메인 데스크 백',

    moduleShelterName: '기초 대피소',
    moduleShelterBio: '심플하고 내구성 높은 일체형 여과 단열 볼트실. 위협적인 기체 낙진을 완벽 봉쇄하며 보조 모듈을 연동할 때 필수적인 허브 중심입니다.',
    moduleShelterEffect: '밀폐 세이프링 가동 · 제 I단계 황성 생존 승리 달성!',

    moduleKitchenName: '황야 조리 배식동',
    moduleKitchenBio: '오염 식생을 가공하는 조리 급수 격실. 정제 수분 공급으로 생포 안전성을 제공하여 생존 정비율 폭을 증가시킵니다.',
    moduleKitchenEffect: '에너지 부스팅: 휴식 복구 수행 시 자가 회복 가중치가 뚜렷한 증폭 효과를 냅니다.',

    moduleToolroomName: '공구 및 기술 공방室',
    moduleToolroomBio: '레이저 용접 프레임 완비. 전자기 자성을 강화하여 우주선 질주 중 자원을 끌어모으는 수납 자력을 연장하고 반경을 넓힙니다.',
    moduleToolroomEffect: '흡장 자성 강화: 주행 중 비축 재료의 흡착 유효 폭이 대폭 확대됩니다.',

    modulePowerName: '태양열 발전 그리드',
    modulePowerBio: '우주 자외선을 완충 충전하는 중추 시설. 전 영역 전력 분배망을 구축하여 비상 왜곡 배리어를 생성합니다.',
    modulePowerEffect: '실장 파워 보정: 장벽에 노출될 때 입는 차감 대미지 패널티를 상쇄 완충합니다.',

    moduleWatchtowerName: '주변 경고 레이더 안테나',
    moduleWatchtowerBio: '기지 초소를 웅장하게 올린 고성능 레이다 타워. 산란 우주 먼지나 낙석의 항법 궤도를 감지하여 우현 조타 경보를 보냅니다.',
    moduleWatchtowerEffect: '입체 시야 연장: 전방의 바리케이드와 가시덩굴 위협을 인지하기 쉽도록 지원합니다.',

    moduleClinicName: '응급 생물 의료 수용동',
    moduleClinicBio: '무균 방사능 해독 침대 및 자동 진통제 인젝터 구비. 파일럿의 신체 바이탈 지표 저하를 케어합니다.',
    moduleClinicEffect: '의료 장비 보강: 파손 임계 지점에서 임시 방어 실드를 활성하여 사망을 보호합니다.',

    moduleWarehouseName: '청결 밀폐 화물 저장실',
    moduleWarehouseBio: '폐자재, 절개 알루미늄 배관판, 고순도 압축 패키지들을 저장하는 넉넉한 보관 창고.',
    moduleWarehouseEffect: '물자 유도: 출정 시작 시 임의의 건축자재 기본량을 15% 기결 증정 세팅합니다.',

    galleryTitle: '황야 기지 완공 기록소',
    galleryDesc: '폐품들로 쌓아 올린 영광스러운 생존자 개단지들을 가상 홀로그램 실린더로 재현합니다. 전 구획을 세우고 인류의 새로운 대지를 비추세요.',
    galleryBack: '관제창 탈출',
    galleryHint: '아래 탭을 눌러 3차원 투시 와이어프레임 구조를 전환할 수 있습니다.',
    galleryStatusUnbuilt: '🔒 미정비 (기초 대피 허브 부재)',
    galleryStatusBuilt: '✅ 투영 승인 및 운전 개시'
  }
};

/**
 * Text renderer dynamic helper taking simple template parameters
 */
export function getTranslation(lang: LanguageCode, key: keyof TranslationDict, count?: number): string {
  const t = DICTIONARY[lang] || DICTIONARY.zh;
  let text = t[key] || DICTIONARY.zh[key] || '';
  if (count !== undefined) {
    text = text.replace('{count}', count.toString());
  }
  return text;
}

/**
 * Custom canvas text rendering helper for textured billboards
 */
export function createTextTexture(text: string, color = '#ef4444'): any {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 248, 120);

    // Grid details
    ctx.strokeStyle = `${color}22`;
    ctx.lineWidth = 1;
    for (let x = 10; x < 250; x += 15) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 128);
      ctx.stroke();
    }

    ctx.fillStyle = color;
    ctx.font = 'bold 28px "JetBrains Mono", Courier, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillText(text, 128, 64);
  }
  return canvas;
}
