/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameStatus, Player, Obstacle, MaterialItem, Camp, Particle, LanePosition, CharacterId } from '../types';
import { playCollectSound, playHitSound, playCampSound, playJumpSound } from '../utils/audio';

interface GameCanvasProps {
  status: GameStatus;
  selectedCharacterId: CharacterId;
  onHpChange: (hp: number) => void;
  onMaterialsChange: (wood: number, metal: number, solar: number) => void;
  onScoreChange: (score: number) => void;
  onCampArrived: () => void;
  requiredWood: number;
  requiredMetal: number;
  requiredSolar: number;
  currentWood: number;
  currentMetal: number;
  currentSolar: number;
  gameSpeedMultiplier: number;
  isPaused?: boolean;
  language?: 'zh' | 'en' | 'ko';
}

interface Particle3D {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  alpha: number;
  decay: number;
}

const createCrackedRoadTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Ground base color: post-apocalyptic dark obsidian brick base
    ctx.fillStyle = '#111013';
    ctx.fillRect(0, 0, 512, 1024);

    // Number of tile bricks: 12 columns, 32 rows
    const cols = 12;
    const rows = 32;
    const tileW = Math.ceil(512 / cols);
    const tileH = Math.ceil(1024 / rows);

    const colors = [
      '#1c1a20', '#252229', '#1d1b22', '#211e25',
      '#19171d', '#292631', '#1e1c20', '#232029',
      '#2d2936', '#1b191e'
    ];

    for (let r = 0; r < rows; r++) {
      // Offset alternate rows to look like actual paved brick layer
      const xOffset = (r % 2) * (tileW / 2);
      for (let c = -1; c <= cols; c++) {
        const x = c * tileW + xOffset;
        const y = r * tileH;

        // Choose a randomized dirty brick color
        let colorStr = colors[Math.floor(Math.random() * colors.length)];
        
        // Add occasional post-apocalyptic overgrown Moss ruin brick block
        if (Math.random() < 0.08) {
          colorStr = '#233226'; // Dull post-collapse forest moss green
        }

        ctx.fillStyle = colorStr;
        // Border margins for voxel gap
        ctx.fillRect(x + 1, y + 1, tileW - 2, tileH - 2);

        // Sub-pixel brick detailing (Voxel noise studs)
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(x + 3, y + 3, 6, 6);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(x + tileW - 9, y + tileH - 9, 6, 6);

        // Beautiful magma radioactive seepages along brick joint paths
        if (Math.random() < 0.05) {
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 1, y + 1);
          ctx.lineTo(x + tileW - 1, y + 1);
          ctx.lineTo(x + tileW - 1, y + tileH - 1);
          ctx.stroke();
        }
      }
    }

    // Side safety stripes painted with brick yellow pattern
    ctx.fillStyle = '#ca8a04';
    for (let y = 0; y < 1024; y += 48) {
      ctx.fillRect(4, y + 6, 10, 20);
      ctx.fillRect(498, y + 6, 10, 20);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 4); // Repeat to cover the long stretch
  return texture;
};

export default function GameCanvas({
  status,
  selectedCharacterId,
  onHpChange,
  onMaterialsChange,
  onScoreChange,
  onCampArrived,
  requiredWood,
  requiredMetal,
  requiredSolar,
  currentWood,
  currentMetal,
  currentSolar,
  gameSpeedMultiplier,
  isPaused = false,
  language = 'zh'
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync isPaused prop to ref for physics inside gameLoop without retriggering the main layout
  const isPausedRef = useRef(isPaused);
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Keyboard controls state
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Core Game State Variables in Refs for 60 FPS performance
  const pX = useRef<number>(50); // Player X position (12 to 88 on road)
  const pHp = useRef<number>(100);
  const pInvulnerableTime = useRef<number>(0); // countdown in ms
  const pJumpY = useRef<number>(0); // vertical jump height in meters/units
  const pJumpVelocity = useRef<number>(0); // jump vertical velocity

  // Items and entities in 2D coordinate layers
  const obstacles = useRef<Obstacle[]>([]);
  const materials = useRef<MaterialItem[]>([]);
  const activeCamp = useRef<Camp | null>(null);

  const materialsCollected = useRef({
    wood: currentWood,
    metal: currentMetal,
    solar: currentSolar
  });

  const distanceRan = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lastSpawnTime = useRef<number>(0);
  const lastCampSpawnDistance = useRef<number>(0);

  // Screen shake effect level
  const screenShake = useRef<number>(0);
  const canvasSize = useRef({ width: 400, height: 600 });

  // -------------------------------------------------------------
  // THREE.JS CORE REFS
  // -------------------------------------------------------------
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Groups and tracking dictionaries
  const playerGroupRef = useRef<THREE.Group | null>(null);
  const thrusterFlameRef = useRef<THREE.Mesh | null>(null);
  const nameSpriteRef = useRef<THREE.Sprite | null>(null);
  const emojiSpriteRef = useRef<THREE.Sprite | null>(null);

  const obstacleMeshes = useRef<Map<string, THREE.Group>>(new Map());
  const materialMeshes = useRef<Map<string, THREE.Group>>(new Map());
  const campMeshRef = useRef<THREE.Group | null>(null);
  const particles3D = useRef<Particle3D[]>([]);

  // Road elements scrolling animation array
  const roadDashLines = useRef<THREE.Mesh[]>([]);
  const roadPillars = useRef<THREE.Group[]>([]);
  const starfieldPoints = useRef<THREE.Points | null>(null);
  const apocalypticWreckage = useRef<THREE.Group[]>([]);

  // Sync React props to mutable refs when they change from above (e.g. healing in camp)
  useEffect(() => {
    pHp.current = 100; // Reset or sync
    materialsCollected.current = {
      wood: currentWood,
      metal: currentMetal,
      solar: currentSolar
    };
  }, [status, currentWood, currentMetal, currentSolar]);

  // Coordinate Conversion utilities
  const mapXToX3d = (x: number) => {
    // Maps x=0..100 to 3D X=-5.5..5.5 (Left lane center is ~ -3.6, Center is 0, Right is 3.6)
    return (x - 50) * 0.12;
  };

  const mapYToZ = (y: number) => {
    // Maps 2D y=-50..650 to 3D Depth Z=-75..15 (Player is at y = height - 90 approx 510, mapped to Z = 10)
    const player2DY = 510;
    const percentage = (y - (-50)) / (player2DY - (-50)); // ranges from 0 to 1 at player plane
    return -75 + percentage * 85; 
  };

  // Helper to create high-quality canvas emoji text sprites for high contrast HUD labels
  const createEmojiTexture = (emoji: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fillRect(0, 0, 128, 128);
      ctx.font = '96px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 64, 64);
    }
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  const createTextTexture = (text: string, color: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fillRect(0, 0, 256, 64);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)'; // Slate 900 background
      ctx.roundRect?.(4, 4, 248, 56, 12);
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 32);
    }
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  // -------------------------------------------------------------
  // INITIALIZE THREE.JS WEBGL RENDER SYSTEM
  // -------------------------------------------------------------
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Create Scene with space coordinates
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#140f11'); // Dark ash/pollution twilight grey-brown
    // Fog to fade out items appearing from far distance smoothly
    scene.fog = new THREE.FogExp2('#140f11', 0.016);
    sceneRef.current = scene;

    // Camera (Third person inclined 45 deg viewing downwards)
    const rect = containerRef.current.getBoundingClientRect();
    const camera = new THREE.PerspectiveCamera(55, rect.width / rect.height, 0.1, 1000);
    camera.position.set(0, 7.5, 18.5); // Fixed angle view
    cameraRef.current = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(rect.width, rect.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x2d1810, 0.95); // Deep post-collapse warm copper ambient
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfb923c, 1.2); // Faint sunset red-orange solar flares
    dirLight.position.set(5, 15, 10);
    scene.add(dirLight);

    // Cosmic neon lane point light (微弱红光污染)
    const trackLight = new THREE.PointLight(0xef4444, 2.2, 60);
    trackLight.position.set(0, 4, -15);
    scene.add(trackLight);

    // -------------------------------------------------------------
    // BUILD SCENIC 3D WORLD HIGHWAY Elements
    // -------------------------------------------------------------
    // Procedural cracked road base plate
    const roadGeo = new THREE.PlaneGeometry(12, 120);
    const roadTexture = createCrackedRoadTexture();
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTexture,
      roughness: 0.85,
      metalness: 0.35
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0, -35); // centers spanning from Z=-95 to Z=25
    scene.add(road);

    // Staggered Voxel Concrete Barriers along left/right limits
    const barrierMatLeft = new THREE.MeshStandardMaterial({
      color: 0x475569, // weathered dark grey stone
      roughness: 0.9,
    });
    const barrierMatRight = new THREE.MeshStandardMaterial({
      color: 0x334155, // alternating stone tone
      roughness: 0.9,
    });

    const blockGeo = new THREE.BoxGeometry(0.4, 0.45, 4.0);

    // Populate brick barriers along the limits (spanning Z = -95 to Z = 25)
    for (let z = -93; z <= 25; z += 6.5) {
      const isAlt = Math.floor(z / 6.5) % 2 === 0;

      // Left modular barrier block
      const bL = new THREE.Mesh(blockGeo, isAlt ? barrierMatLeft : barrierMatRight);
      bL.position.set(-6, 0.225, z);
      scene.add(bL);

      // Add a small neon warning cap (voxel-styled blinking red/orange caution marker atop barriers)
      const capGeo = new THREE.BoxGeometry(0.12, 0.08, 0.25);
      const capMat = new THREE.MeshBasicMaterial({ color: isAlt ? 0xef4444 : 0xea580c });
      const capL = new THREE.Mesh(capGeo, capMat);
      capL.position.set(-6, 0.475, z + (Math.random() - 0.5));
      scene.add(capL);

      // Right modular barrier block
      const bR = new THREE.Mesh(blockGeo, !isAlt ? barrierMatLeft : barrierMatRight);
      bR.position.set(6, 0.225, z);
      scene.add(bR);

      const capR = new THREE.Mesh(capGeo, capMat);
      capR.position.set(6, 0.475, z + (Math.random() - 0.5));
      scene.add(capR);
    }

    // Dashboard line markers inside lane (bright amber-yellow marks matching user image!)
    const linesArr: THREE.Mesh[] = [];
    const lineGeo = new THREE.BoxGeometry(0.15, 0.02, 3.5);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xca8a04 });

    // Place dashed lines on Z = -85 to Z = 25
    for (let z = -85; z <= 25; z += 18) {
      // Left lane divider line
      const lineL = new THREE.Mesh(lineGeo, lineMat);
      lineL.position.set(-2, 0.01, z);
      scene.add(lineL);
      linesArr.push(lineL);

      // Right lane divider line
      const lineR = new THREE.Mesh(lineGeo, lineMat);
      lineR.position.set(2, 0.01, z);
      scene.add(lineR);
      linesArr.push(lineR);
    }
    roadDashLines.current = linesArr;

    // Glowing energy/amber safety broken streetlights beside the road
    const pillarsArr: THREE.Group[] = [];
    const createDystopianStreetlight = (xSide: number, zVal: number) => {
      const parentGrp = new THREE.Group();
      
      // Post pole - thin cylinder
      const poleGeo = new THREE.CylinderGeometry(0.06, 0.09, 1.9, 5);
      const postMat = new THREE.MeshStandardMaterial({
        color: 0x3f3f46, // ruined iron
        metalness: 0.8,
        roughness: 0.6
      });
      const pole = new THREE.Mesh(poleGeo, postMat);
      pole.position.set(0, 0.95, 0);
      parentGrp.add(pole);
      
      // Horizontal lantern bracket
      const bracketGeo = new THREE.BoxGeometry(0.5, 0.06, 0.06);
      const bracket = new THREE.Mesh(bracketGeo, postMat);
      bracket.position.set(xSide > 0 ? -0.2 : 0.2, 1.8, 0);
      parentGrp.add(bracket);
      
      // Dilapidated bent angle
      parentGrp.rotation.z = xSide > 0 ? (0.05 + Math.random() * 0.1) : (-0.05 - Math.random() * 0.1);
      
      // Burning/flickering hazardous beacon bulb
      const bulbGeo = new THREE.SphereGeometry(0.14, 5, 5);
      const bulbMat = new THREE.MeshStandardMaterial({
        color: 0xea580c,
        emissive: 0xea580c,
        emissiveIntensity: 1.5,
        roughness: 0.1
      });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(xSide > 0 ? -0.4 : 0.4, 1.7, 0);
      parentGrp.add(bulb);
      
      // Save deep reference of bulb on userData to flicker it inside render Loop
      parentGrp.userData.bulb = bulb;
      
      parentGrp.position.set(xSide, 0, zVal);
      scene.add(parentGrp);
      pillarsArr.push(parentGrp);
    };

    for (let z = -90; z <= 20; z += 15) {
      createDystopianStreetlight(-6.2, z);
      createDystopianStreetlight(6.2, z);
    }
    roadPillars.current = pillarsArr;

    // Distribute apocalyptic wreckage and collapsed highrise scenery along both margins (Z=-95 to 25)
    const wreckageArr: THREE.Group[] = [];
    const createDystopianScenery = (xPos: number, zPos: number, isLeft: boolean) => {
      const group = new THREE.Group();
      group.position.set(xPos, 0, zPos);
      
      // Deterministic random index based on Z position to keep it consistent
      const seed = Math.abs(Math.sin(zPos)) * 100;
      const type = Math.floor(seed) % 4; // 4 categories of ruined objects
      
      if (type === 0) {
        // Skyscraper Ruin: Blocky concrete office blocks with exposed reinforcement rods
        const floors = 3 + Math.floor(seed * 0.1) % 3; // 3 to 5 floors
        const width = 3 + (seed % 2) * 1.2;
        const depth = width;
        const floorHeight = 2.5 + (seed % 3) * 0.5;
        
        const concreteMat = new THREE.MeshStandardMaterial({
          color: 0x334155, // slate-grey concrete
          roughness: 0.9,
          metalness: 0.1
        });
        
        for (let f = 0; f < floors; f++) {
          const sizeY = floorHeight * (1 - f * 0.1);
          const floorGeo = new THREE.BoxGeometry(width * (1 - f * 0.12), sizeY, depth * (1 - f * 0.12));
          const floorMesh = new THREE.Mesh(floorGeo, concreteMat);
          const xOffset = f > 0 ? (Math.sin(f * seed) * 0.25) : 0;
          const zOffset = f > 0 ? (Math.cos(f * seed) * 0.25) : 0;
          floorMesh.position.set(xOffset, sizeY/2 + f * floorHeight - 0.2 * f, zOffset);
          group.add(floorMesh);
          
          // Visual windows with faint red or orange glow
          if (f < floors - 1) {
            const windowGeo = new THREE.BoxGeometry(0.1, 0.4, 0.4);
            const glowMat = new THREE.MeshBasicMaterial({
              color: (f % 2 === 0) ? 0xef4444 : 0xeab308,
            });
            
            for (let side = -1; side <= 1; side += 2) {
              const wMeshFace = new THREE.Mesh(windowGeo, glowMat);
              wMeshFace.position.set(Math.sign(xPos) * (width * 0.45), sizeY / 2 + f * floorHeight + 0.3, zOffset + side * (width * 0.25));
              group.add(wMeshFace);
            }
          }
        }
        
        // Exposed support iron girders at the top of building
        const girderMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          metalness: 0.95,
          roughness: 0.2
        });
        const beamGeo = new THREE.BoxGeometry(0.12, 2.5, 0.12);
        for (let g = 0; g < 3; g++) {
          const beam = new THREE.Mesh(beamGeo, girderMat);
          beam.position.set((Math.random() - 0.5) * width * 0.6, floors * floorHeight + 0.5, (Math.random() - 0.5) * depth * 0.6);
          beam.rotation.set((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6);
          group.add(beam);
        }
        
        group.rotation.z = isLeft ? 0.08 : -0.08;
        group.rotation.y = seed * 0.05;
        
      } else if (type === 1) {
        // Slanted wedge pillar/tower
        const towerHeight = 12 + (seed % 6);
        const wGeo = new THREE.CylinderGeometry(0.5, 1.8, towerHeight, 4);
        const steelMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          metalness: 0.8,
          roughness: 0.4
        });
        const tower = new THREE.Mesh(wGeo, steelMat);
        tower.position.set(0, towerHeight / 2, 0);
        group.add(tower);
        
        const shellGeo = new THREE.BoxGeometry(1.8, towerHeight * 0.6, 1.8);
        const rustMat = new THREE.MeshStandardMaterial({
          color: 0x47454f,
          roughness: 0.85
        });
        const shell = new THREE.Mesh(shellGeo, rustMat);
        shell.position.set(0.1, towerHeight * 0.4, -0.1);
        group.add(shell);
        
        const glassGeo = new THREE.SphereGeometry(0.35, 5, 5);
        const redGlowMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
        const beacon = new THREE.Mesh(glassGeo, redGlowMat);
        beacon.position.set(0, towerHeight + 0.3, 0);
        group.add(beacon);
        
        group.rotation.x = (seed % 2 === 0 ? -0.14 : 0.14);
        group.rotation.z = isLeft ? 0.15 : -0.15;
        
      } else if (type === 2) {
        // Rusted neon billboard frame setup
        const poleGeo = new THREE.CylinderGeometry(0.15, 0.2, 5.5, 5);
        const rustSteel = new THREE.MeshStandardMaterial({
          color: 0x334155,
          metalness: 0.9,
          roughness: 0.7
        });
        const pole = new THREE.Mesh(poleGeo, rustSteel);
        pole.position.set(0, 2.75, 0);
        group.add(pole);
        
        const frameGeo = new THREE.BoxGeometry(4.2, 2.2, 0.4);
        const frameMat = new THREE.MeshStandardMaterial({
          color: 0x111827,
          metalness: 0.7,
          roughness: 0.5
        });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(0, 5.5, 0);
        group.add(frame);
        
        const txtStr = (seed % 3 === 0) ? '☠️ S.O.S' : (seed % 3 === 1) ? '⚠ DANGER' : '☣ HAZARD';
        const screenTex = createTextTexture(txtStr, '#ef4444');
        const screenMat = new THREE.MeshBasicMaterial({
          map: screenTex,
          transparent: true
        });
        const screenGeo = new THREE.PlaneGeometry(3.8, 1.8);
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 5.5, 0.21);
        screen.rotation.y = isLeft ? 0.35 : -0.35;
        frame.rotation.y = isLeft ? 0.35 : -0.35;
        group.add(screen);
        
        frame.rotation.z = -0.18;
        screen.rotation.z = -0.18;
        
      } else {
        // Broken highway overpass slabs and support columns
        const archGeo = new THREE.BoxGeometry(4.5, 0.5, 6.5);
        const concreteMat = new THREE.MeshStandardMaterial({
          color: 0x3f3f46,
          roughness: 0.9
        });
        const slab = new THREE.Mesh(archGeo, concreteMat);
        slab.position.set(isLeft ? 1.5 : -1.5, 4.0, 0);
        slab.rotation.z = isLeft ? -0.22 : 0.22;
        group.add(slab);
        
        const pillarGeo = new THREE.BoxGeometry(0.7, 4.0, 0.7);
        const pillar = new THREE.Mesh(pillarGeo, concreteMat);
        pillar.position.set(isLeft ? 2.5 : -2.5, 2.0, -1.5);
        group.add(pillar);
      }
      
      scene.add(group);
      wreckageArr.push(group);
    };

    // Spawn 14 unique scenery segments symmetrically in deep screen coordinates X=[-22..-9], [9..22]
    for (let z = -95; z <= 25; z += 20) {
      createDystopianScenery(-13.5 + (Math.sin(z) * 1.5), z, true);
      createDystopianScenery(13.5 + (Math.cos(z) * 1.5), z, false);
    }
    apocalypticWreckage.current = wreckageArr;

    // Red-orange ash particle system floating downward through polluted sky background
    const starsCount = 420;
    const starsGeo = new THREE.BufferGeometry();
    const starsPos = new Float32Array(starsCount * 3);
    for (let i = 0; i < starsCount * 3; i += 3) {
      starsPos[i] = (Math.random() - 0.5) * 130; // spread wide
      starsPos[i + 1] = 1 + Math.random() * 45; // height offset
      starsPos[i + 2] = -95 + Math.random() * 120; // depth cover
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPos, 3));
    const starsMat = new THREE.PointsMaterial({
      color: 0xf59e0b, // amber radioactive cinders / ash
      size: 0.36,
      transparent: true,
      opacity: 0.85,
      fog: true
    });
    const starfield = new THREE.Points(starsGeo, starsMat);
    scene.add(starfield);
    starfieldPoints.current = starfield;

    // -------------------------------------------------------------
    // BUILD PLAYER SHIP HOVER BASE (Construct dynamically on mount)
    // -------------------------------------------------------------
    const pGroup = new THREE.Group();
    scene.add(pGroup);
    playerGroupRef.current = pGroup;

    // Resize logic
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current || !rendererRef.current || !cameraRef.current) return;
      const rectRes = containerRef.current.getBoundingClientRect();
      canvasSize.current = { width: rectRes.width, height: rectRes.height };

      cameraRef.current.aspect = rectRes.width / rectRes.height;
      cameraRef.current.updateProjectionMatrix();

      rendererRef.current.setSize(rectRes.width, rectRes.height);
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // Clean up
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      
      // Clear geometries
      roadGeo.dispose();
      roadTexture.dispose();
      roadMat.dispose();
      blockGeo.dispose();
      barrierMatLeft.dispose();
      barrierMatRight.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      starsGeo.dispose();
      starsMat.dispose();

      // Dispose all custom streetlights
      roadPillars.current.forEach((g) => {
        scene.remove(g);
        g.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            node.geometry.dispose();
            if (Array.isArray(node.material)) {
              node.material.forEach(m => m.dispose());
            } else {
              node.material.dispose();
            }
          }
        });
      });
      roadPillars.current = [];

      // Dispose all roadside building wreckage objects
      apocalypticWreckage.current.forEach((g) => {
        scene.remove(g);
        g.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            node.geometry.dispose();
            if (Array.isArray(node.material)) {
              node.material.forEach(m => m.dispose());
            } else {
              node.material.dispose();
            }
          }
        });
      });
      apocalypticWreckage.current = [];

      // Dispose dynamic items
      obstacleMeshes.current.forEach((g) => {
        g.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            node.geometry.dispose();
            if (Array.isArray(node.material)) {
              node.material.forEach(m => m.dispose());
            } else {
              node.material.dispose();
            }
          }
        });
      });
      materialMeshes.current.forEach((g) => {
        g.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            node.geometry.dispose();
            if (Array.isArray(node.material)) {
              node.material.forEach(m => m.dispose());
            } else {
              node.material.dispose();
            }
          }
        });
      });
    };
  }, []);

  // Keyboard Event helper bindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Soft Reset helper
  const resetGameEntities = () => {
    pX.current = 50;
    pHp.current = 100;
    pJumpY.current = 0;
    pJumpVelocity.current = 0;
    obstacles.current = [];
    materials.current = [];
    activeCamp.current = null;
    distanceRan.current = 0;
    lastSpawnTime.current = 0;
    lastCampSpawnDistance.current = 0;
    materialsCollected.current = {
      wood: currentWood,
      metal: currentMetal,
      solar: currentSolar
    };
    
    // Clear all dynamic Three meshes
    const scene = sceneRef.current;
    if (scene) {
      obstacleMeshes.current.forEach((group) => scene.remove(group));
      obstacleMeshes.current.clear();

      materialMeshes.current.forEach((group) => scene.remove(group));
      materialMeshes.current.clear();

      if (campMeshRef.current) {
        scene.remove(campMeshRef.current);
        campMeshRef.current = null;
      }

      particles3D.current.forEach((p) => scene.remove(p.mesh));
      particles3D.current = [];
    }
  };

  // Virtual buttons Left/Right trigger
  const handleVirtualLeft = (start: boolean) => {
    keysPressed.current['a'] = start;
    keysPressed.current['arrowleft'] = start;
  };

  const handleVirtualRight = (start: boolean) => {
    keysPressed.current['d'] = start;
    keysPressed.current['arrowright'] = start;
  };

  // -------------------------------------------------------------
  // PRIMARY 3D COMPLIANT GAME ENGINE LOOP
  // -------------------------------------------------------------
  useEffect(() => {
    let animationId: number;

    const gameLoop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = Math.min(timestamp - lastTimeRef.current, 100); // capped at 100ms
      lastTimeRef.current = timestamp;

      // 1. Physics update only when running and not paused
      if (status === 'RUNNING' && !isPausedRef.current) {
        updatePhysics(deltaTime);
      }

      // 2. Continuous Three.js Graphic Refresh
      renderThreeScene(timestamp);

      animationId = requestAnimationFrame(gameLoop);
    };

    // Item generation mechanics
    const spawnItems = (time: number) => {
      const spawnerThreshold = 1800 / gameSpeedMultiplier; // Spawn frequently at high speed parameters
      if (time - lastSpawnTime.current > spawnerThreshold) {
        lastSpawnTime.current = time;

        const isObstacle = Math.random() < 0.55; 
        const laneSelected = ['LEFT', 'CENTER', 'RIGHT'][Math.floor(Math.random() * 3)] as LanePosition;
        let xPos = 50;
        if (laneSelected === 'LEFT') xPos = 20;
        if (laneSelected === 'RIGHT') xPos = 80;

        // Devation to keep patterns alive
        xPos += (Math.random() * 10 - 5);

        if (isObstacle) {
          const types: ('PLASTIC' | 'TOXIC_BARREL' | 'SPIKES' | 'E_WASTE')[] = [
            'PLASTIC', 'TOXIC_BARREL', 'SPIKES', 'E_WASTE'
          ];
          const type = types[Math.floor(Math.random() * types.length)];
          obstacles.current.push({
            id: Math.random().toString(),
            x: xPos,
            y: -50,
            speed: 3 + Math.random() * 2,
            width: 38,
            height: 38,
            type,
            damage: type === 'TOXIC_BARREL' ? 30 : type === 'SPIKES' ? 25 : 15,
            lane: laneSelected,
            passed: false
          });
        } else {
          const woodNeeded = materialsCollected.current.wood < requiredWood;
          const metalNeeded = materialsCollected.current.metal < requiredMetal;
          const solarNeeded = materialsCollected.current.solar < requiredSolar;

          const possibleTypes: ('WOOD' | 'METAL' | 'SOLAR')[] = [];
          if (woodNeeded) possibleTypes.push('WOOD');
          if (metalNeeded) possibleTypes.push('METAL');
          if (solarNeeded) possibleTypes.push('SOLAR');

          if (possibleTypes.length === 0) {
            possibleTypes.push('WOOD', 'METAL', 'SOLAR');
          }

          const type = possibleTypes[Math.floor(Math.random() * possibleTypes.length)];

          materials.current.push({
            id: Math.random().toString(),
            x: xPos,
            y: -40,
            speed: 3 + Math.random() * 1.5,
            width: 32,
            height: 32,
            type,
            lane: laneSelected,
            collected: false
          });
        }
      }

      // Shelter checkpoint campers triggering
      const finishedAllNeeded = 
        materialsCollected.current.wood >= requiredWood &&
        materialsCollected.current.metal >= requiredMetal &&
        materialsCollected.current.solar >= requiredSolar;

      const currentDistance = distanceRan.current;
      const distSinceLastCamp = currentDistance - lastCampSpawnDistance.current;

      if (!activeCamp.current) {
        let shouldSpawnCamp = false;
        
        if (finishedAllNeeded && distSinceLastCamp > 50) {
          shouldSpawnCamp = true;
        } else if (distSinceLastCamp > 350) {
          shouldSpawnCamp = true;
        }

        if (shouldSpawnCamp) {
          activeCamp.current = {
            id: Math.random().toString(),
            y: -120,
            speed: 3.5,
            height: 100,
            appeared: false
          };
          lastCampSpawnDistance.current = currentDistance;
          playCampSound();
        }
      }
    };

    // Update coordinates in original engine
    const updatePhysics = (dt: number) => {
      const slideSpeed = 1.35;
      const dtFactor = (dt / 16.66);
      
      let moveDirection = 0;
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) moveDirection = -1;
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) moveDirection = 1;

      if (moveDirection !== 0) {
        pX.current += moveDirection * slideSpeed * dtFactor;
        pX.current = Math.max(12, Math.min(88, pX.current));
      }

      // Handle Spacebar / W / ArrowUp Jump Triggering
      const isPressingJump = keysPressed.current[' '] || keysPressed.current['w'] || keysPressed.current['arrowup'];
      if (isPressingJump && pJumpY.current === 0 && pJumpVelocity.current === 0) {
        pJumpVelocity.current = 0.165; // initial upward velocity
        playJumpSound();
      }

      // Physics update for Jump
      if (pJumpY.current > 0 || pJumpVelocity.current > 0) {
        pJumpY.current += pJumpVelocity.current * dtFactor;
        pJumpVelocity.current -= 0.009 * dtFactor; // gravity deceleration
        if (pJumpY.current <= 0) {
          pJumpY.current = 0;
          pJumpVelocity.current = 0;
        }
      }

      // Generation spawner
      spawnItems(performance.now());

      if (pInvulnerableTime.current > 0) {
        pInvulnerableTime.current -= dt;
      }

      // Moves and collision calculations
      obstacles.current.forEach(ob => {
        ob.y += (ob.speed * gameSpeedMultiplier) * dtFactor;
        
        const obPxX = (ob.x / 100) * canvasSize.current.width;
        const playerPxX = (pX.current / 100) * canvasSize.current.width;
        
        const playerY = canvasSize.current.height - 90;
        
        const distY = Math.abs(ob.y - playerY);
        const distX = Math.abs(obPxX - playerPxX);

        // If the player is jumping high enough, they bypass ground barriers!
        const canCollide = pJumpY.current < 0.45;

        if (canCollide && distY < 32 && distX < 28 && pInvulnerableTime.current <= 0) {
          pHp.current = Math.max(0, pHp.current - ob.damage);
          onHpChange(pHp.current);
          pInvulnerableTime.current = 1200;
          screenShake.current = 15;
          playHitSound();

          // Spawn gorgeous 3D explosion splash particles
          create3DSparksEx(ob.x, ob.y, '#f43f5e', 18);

          ob.passed = true;
        }
      });

      // Filter out elements
      obstacles.current = obstacles.current.filter(ob => {
        if (ob.y > canvasSize.current.height + 40) return false;
        return !ob.passed;
      });

      materials.current.forEach(item => {
        item.y += (item.speed * gameSpeedMultiplier) * dtFactor;

        const itemPxX = (item.x / 100) * canvasSize.current.width;
        const playerPxX = (pX.current / 100) * canvasSize.current.width;
        const playerY = canvasSize.current.height - 90;

        const distY = Math.abs(item.y - playerY);
        const distX = Math.abs(itemPxX - playerPxX);

        if (distY < 30 && distX < 26 && !item.collected) {
          item.collected = true;
          
          let color = '#10b981';
          if (item.type === 'METAL') {
            color = '#38bdf8';
            materialsCollected.current.metal += 1;
          } else if (item.type === 'SOLAR') {
            color = '#f59e0b';
            materialsCollected.current.solar += 1;
          } else {
            materialsCollected.current.wood += 1;
          }

          onMaterialsChange(
            materialsCollected.current.wood,
            materialsCollected.current.metal,
            materialsCollected.current.solar
          );
          
          playCollectSound();

          // Spawn glowing 3D resource sparks
          create3DSparksEx(item.x, item.y, color, 14);
        }
      });

      materials.current = materials.current.filter(item => {
        if (item.y > canvasSize.current.height + 40) return false;
        return !item.collected;
      });

      // Camp threshold checks
      if (activeCamp.current) {
        const scrollRate = 3.5 * gameSpeedMultiplier * dtFactor;
        activeCamp.current.y += scrollRate;

        if (activeCamp.current.y > -50 && !activeCamp.current.appeared) {
          activeCamp.current.appeared = true;
        }

        const playerY = canvasSize.current.height - 90;
        if (activeCamp.current.y + activeCamp.current.height > playerY && activeCamp.current.y < playerY + 20) {
          onCampArrived();
          activeCamp.current = null;
        }
      }

      // Score increment
      distanceRan.current += (0.15 * gameSpeedMultiplier) * dtFactor;
      onScoreChange(Math.floor(distanceRan.current));
    };

    // Helper to request 3D particles generator
    const create3DSparksEx = (x2d: number, y2d: number, colorCode: string, count: number) => {
      const scene = sceneRef.current;
      if (!scene) return;

      const sx = mapXToX3d(x2d);
      const sz = mapYToZ(y2d);
      const sy = 0.6; // slightly floating off-road

      const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
      const col = new THREE.Color(colorCode);

      for (let i = 0; i < count; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: col,
          transparent: true,
          opacity: 1.0
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(sx, sy, sz);

        particles3D.current.push({
          mesh,
          vx: (Math.random() - 0.5) * 0.42,
          vy: Math.random() * 0.35 + 0.1, // float up of road
          vz: (Math.random() - 0.5) * 0.42,
          alpha: 1.0,
          decay: 0.02 + Math.random() * 0.03
        });

        scene.add(mesh);
      }
    };

    // Helper to build 3D low-poly character model
    const buildWastelandRunner = (charId: string): { group: THREE.Group; thrusterFlame: THREE.Mesh | null } => {
      const g = new THREE.Group();
      g.name = "charGroup";
      
      let thrusterFlame: THREE.Mesh | null = null;

      // Helper to add jointed voxel limb (swings cleanly from joint)
      const createJointedVoxelLimb = (name: string, geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], meshYOffset: number, shoeGeo?: THREE.BufferGeometry, shoeMat?: THREE.Material): THREE.Group => {
        const joint = new THREE.Group();
        joint.name = name;
        joint.position.set(...pos);
        
        const m = new THREE.Mesh(geo, mat);
        m.position.set(0, meshYOffset, 0);
        joint.add(m);

        if (shoeGeo && shoeMat) {
          const shoe = new THREE.Mesh(shoeGeo, shoeMat);
          shoe.position.set(0, meshYOffset * 2, 0.03);
          joint.add(shoe);
        }
        return joint;
      };

      if (charId === 'MALE_PILOT') {
        const pSkinMat = new THREE.MeshStandardMaterial({ color: 0xfed7aa, roughness: 0.6 }); // skin tone peach
        const pHairMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.95 }); // voxel brown hair
        const pJacketMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.8 }); // teal survival jacket
        const pShirtMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 }); // dark shirt
        const pLegMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 }); // blue-grey jeans
        const pShoeMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.9 }); // robust boots

        // Torso box
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.50, 0.24), pJacketMat);
        torso.position.set(0, 0.1, 0);
        g.add(torso);

        // inner grey shirt band
        const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.52, 0.25), pShirtMat);
        shirt.position.set(0, 0.1, 0);
        g.add(shirt);

        // Square Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.30, 0.30), pSkinMat);
        head.position.set(0, 0.46, 0);
        g.add(head);

        // Blocky Hair Cap
        const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.10, 0.32), pHairMat);
        hairTop.position.set(0, 0.58, -0.01);
        g.add(hairTop);

        const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.10), pHairMat);
        hairBack.position.set(0, 0.48, -0.11);
        g.add(hairBack);

        const hairFringe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.06), pHairMat);
        hairFringe.position.set(0, 0.55, 0.12);
        g.add(hairFringe);

        // Pixelated Eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), eyeMat);
        eyeL.position.set(-0.07, 0.48, 0.145);
        g.add(eyeL);

        const eyeR = eyeL.clone();
        eyeR.position.x = 0.07;
        g.add(eyeR);

        // Back-pack survival supply kit with miniature radio antenna (Voxel style)
        const pack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.35, 0.16), new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.9 }));
        pack.position.set(0, 0.10, -0.18);
        g.add(pack);

        const antenna = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.30, 0.03), new THREE.MeshStandardMaterial({ color: 0x475569 }));
        antenna.position.set(0.08, 0.35, -0.18);
        g.add(antenna);

        const antennaTip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0xea580c }));
        antennaTip.position.set(0.08, 0.50, -0.18);
        g.add(antennaTip);

        // Join Voxel limbs using BoxGeometry
        g.add(createJointedVoxelLimb("leftArm", new THREE.BoxGeometry(0.11, 0.35, 0.11), pJacketMat, [-0.25, 0.22, 0], -0.15));
        g.add(createJointedVoxelLimb("rightArm", new THREE.BoxGeometry(0.11, 0.35, 0.11), pJacketMat, [0.25, 0.22, 0], -0.15));
        g.add(createJointedVoxelLimb("leftLeg", new THREE.BoxGeometry(0.12, 0.36, 0.12), pLegMat, [-0.11, -0.18, 0], -0.16, new THREE.BoxGeometry(0.14, 0.07, 0.16), pShoeMat));
        g.add(createJointedVoxelLimb("rightLeg", new THREE.BoxGeometry(0.12, 0.36, 0.12), pLegMat, [0.11, -0.18, 0], -0.16, new THREE.BoxGeometry(0.14, 0.07, 0.16), pShoeMat));

      } else if (charId === 'FEMALE_PILOT') {
        const pSkinMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.6 }); // pale skin peach
        const pHairMat = new THREE.MeshStandardMaterial({ color: 0x2e1065, roughness: 0.95 }); // dark purple ponytail hair (matches Irene)
        const pJacketMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.8 }); // vibrant coral jacket
        const pShirtMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 }); // dark shirt
        const pLegMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.9 }); // teal trousers
        const pShoeMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.9 }); // coral shoes

        // Torso box
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.48, 0.22), pJacketMat);
        torso.position.set(0, 0.1, 0);
        g.add(torso);

        // inner dark shirt band
        const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.50, 0.23), pShirtMat);
        shirt.position.set(0, 0.1, 0);
        g.add(shirt);

        // Square Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.28), pSkinMat);
        head.position.set(0, 0.44, 0);
        g.add(head);

        // High blocky purple ponytail on back of head
        const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.10, 0.30), pHairMat);
        hairTop.position.set(0, 0.55, -0.01);
        g.add(hairTop);

        const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.20, 0.10), pHairMat);
        hairBack.position.set(0, 0.46, -0.10);
        g.add(hairBack);

        const ponytail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.08), pHairMat);
        ponytail.position.set(0, 0.38, -0.16);
        g.add(ponytail);

        const hairFringe = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.06, 0.05), pHairMat);
        hairFringe.position.set(0, 0.52, 0.11);
        g.add(hairFringe);

        // Pixelated Eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.02), eyeMat);
        eyeL.position.set(-0.06, 0.46, 0.135);
        g.add(eyeL);

        const eyeR = eyeL.clone();
        eyeR.position.x = 0.06;
        g.add(eyeR);

        // Cyber backpack kit
        const pack = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.32, 0.14), new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.8 }));
        pack.position.set(0, 0.10, -0.16);
        g.add(pack);

        // Joined Voxel limbs using BoxGeometry
        g.add(createJointedVoxelLimb("leftArm", new THREE.BoxGeometry(0.10, 0.32, 0.10), pJacketMat, [-0.22, 0.22, 0], -0.14));
        g.add(createJointedVoxelLimb("rightArm", new THREE.BoxGeometry(0.10, 0.32, 0.10), pJacketMat, [0.22, 0.22, 0], -0.14));
        g.add(createJointedVoxelLimb("leftLeg", new THREE.BoxGeometry(0.11, 0.34, 0.11), pLegMat, [-0.10, -0.16, 0], -0.15, new THREE.BoxGeometry(0.13, 0.06, 0.15), pShoeMat));
        g.add(createJointedVoxelLimb("rightLeg", new THREE.BoxGeometry(0.11, 0.34, 0.11), pLegMat, [0.10, -0.16, 0], -0.15, new THREE.BoxGeometry(0.13, 0.06, 0.15), pShoeMat));

      } else if (charId === 'SPACE_CAT') {
        const catGreyMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.6 }); // Charcoal gray skin
        const catWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }); // White highlights
        const catPinkMat = new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.8 }); // Cute pink nose/ears
        const catStripeMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 }); // Black stripes

        // Horizontal Quadruped voxel torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.52), catGreyMat);
        torso.position.set(0, 0, 0);
        g.add(torso);

        // White chest fluff band
        const chest = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.14, 0.16), catWhiteMat);
        chest.position.set(0, -0.03, -0.19);
        g.add(chest);

        // Side black voxel stripes
        const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.12, 0.06), catStripeMat);
        stripeL.position.set(-0.125, 0, 0);
        g.add(stripeL);

        const stripeR = stripeL.clone();
        stripeR.position.x = 0.125;
        g.add(stripeR);

        // Blocky Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), catGreyMat);
        head.position.set(0, 0.18, -0.28);
        g.add(head);

        // Pointy Block Ears
        const earL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.06), catGreyMat);
        earL.position.set(-0.08, 0.31, -0.28);
        g.add(earL);

        const earInnerL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.02), catPinkMat);
        earInnerL.position.set(-0.08, 0.31, -0.25);
        g.add(earInnerL);

        const earR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.06), catGreyMat);
        earR.position.set(0.08, 0.31, -0.28);
        g.add(earR);

        const earInnerR = earInnerL.clone();
        earInnerR.position.x = 0.08;
        g.add(earInnerR);

        // Voxel muzzle snout & nose
        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.04), catWhiteMat);
        snout.position.set(0, 0.12, -0.395);
        g.add(snout);

        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.02), catPinkMat);
        nose.position.set(0, 0.14, -0.41);
        g.add(nose);

        // Cute glowing eyes (Voxel style)
        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.01), new THREE.MeshBasicMaterial({ color: 0x22c55e })); // Green cyber eyes
        eyeL.position.set(-0.05, 0.18, -0.392);
        g.add(eyeL);

        const eyeR = eyeL.clone();
        eyeR.position.x = 0.05;
        g.add(eyeR);

        // Voxel Tail with nice white tip
        const tailJoint = new THREE.Group();
        tailJoint.name = "tail";
        tailJoint.position.set(0, 0.06, 0.25);
        
        const tMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.28), catGreyMat);
        tMesh.position.set(0, 0.10, 0.12);
        tMesh.rotation.x = Math.PI / 4;
        tailJoint.add(tMesh);

        const tTip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), catWhiteMat);
        tTip.position.set(0, 0.20, 0.22);
        tailJoint.add(tTip);
        g.add(tailJoint);

        // Leg boxes
        g.add(createJointedVoxelLimb("legFL", new THREE.BoxGeometry(0.06, 0.16, 0.06), catGreyMat, [-0.09, -0.1, -0.18], -0.07, new THREE.BoxGeometry(0.08, 0.03, 0.08), catWhiteMat));
        g.add(createJointedVoxelLimb("legFR", new THREE.BoxGeometry(0.06, 0.16, 0.06), catGreyMat, [0.09, -0.1, -0.18], -0.07, new THREE.BoxGeometry(0.08, 0.03, 0.08), catWhiteMat));
        g.add(createJointedVoxelLimb("legBL", new THREE.BoxGeometry(0.06, 0.16, 0.06), catGreyMat, [-0.09, -0.1, 0.18], -0.07, new THREE.BoxGeometry(0.08, 0.03, 0.08), catWhiteMat));
        g.add(createJointedVoxelLimb("legBR", new THREE.BoxGeometry(0.06, 0.16, 0.06), catGreyMat, [0.09, -0.1, 0.18], -0.07, new THREE.BoxGeometry(0.08, 0.03, 0.08), catWhiteMat));

      } else if (charId === 'SPACE_DOG') {
        const dogGoldMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 }); // Golden-brown dog (Shiba/Loyal matches user image)
        const dogCreamMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.7 }); // Creamy markings
        const dogBlackMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 }); // Black nose

        // Horizontal Quadruped voxel torso
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.56), dogGoldMat);
        torso.position.set(0, 0, 0);
        g.add(torso);

        // Cream belly band
        const belly = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.12, 0.44), dogCreamMat);
        belly.position.set(0, -0.06, -0.05);
        g.add(belly);

        // Blocky Head
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), dogGoldMat);
        head.position.set(0, 0.20, -0.30);
        g.add(head);

        // Erect triangular ears
        const earL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.10, 0.06), dogGoldMat);
        earL.position.set(-0.08, 0.32, -0.28);
        g.add(earL);

        const earInnerL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.02), dogCreamMat);
        earInnerL.position.set(-0.08, 0.32, -0.25);
        g.add(earInnerL);

        const earR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.10, 0.06), dogGoldMat);
        earR.position.set(0.08, 0.32, -0.28);
        g.add(earR);

        const earInnerR = earInnerL.clone();
        earInnerR.position.x = 0.08;
        g.add(earInnerR);

        // Voxel snout muzzle and snout
        const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), dogCreamMat);
        muzzle.position.set(0, 0.14, -0.40);
        g.add(muzzle);

        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.03), dogBlackMat);
        nose.position.set(0, 0.17, -0.45);
        g.add(nose);

        // Pixelated Eyes
        const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.01), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
        eyeL.position.set(-0.06, 0.20, -0.412);
        g.add(eyeL);

        const eyeR = eyeL.clone();
        eyeR.position.x = 0.06;
        g.add(eyeR);

        // Shiba fluffy tail with white tip
        const tailJoint = new THREE.Group();
        tailJoint.name = "tail";
        tailJoint.position.set(0, 0.08, 0.26);

        const tMesh = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.26), dogGoldMat);
        tMesh.position.set(0, 0.08, 0.12);
        tMesh.rotation.x = Math.PI / 4;
        tailJoint.add(tMesh);

        const tTip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), dogCreamMat);
        tTip.position.set(0, 0.16, 0.20);
        tailJoint.add(tTip);
        g.add(tailJoint);

        // Leg boxes
        g.add(createJointedVoxelLimb("legFL", new THREE.BoxGeometry(0.07, 0.18, 0.07), dogGoldMat, [-0.10, -0.11, -0.20], -0.08, new THREE.BoxGeometry(0.09, 0.03, 0.09), dogCreamMat));
        g.add(createJointedVoxelLimb("legFR", new THREE.BoxGeometry(0.07, 0.18, 0.07), dogGoldMat, [0.10, -0.11, -0.20], -0.08, new THREE.BoxGeometry(0.09, 0.03, 0.09), dogCreamMat));
        g.add(createJointedVoxelLimb("legBL", new THREE.BoxGeometry(0.07, 0.18, 0.07), dogGoldMat, [-0.10, -0.11, 0.20], -0.08, new THREE.BoxGeometry(0.09, 0.03, 0.09), dogCreamMat));
        g.add(createJointedVoxelLimb("legBR", new THREE.BoxGeometry(0.07, 0.18, 0.07), dogGoldMat, [0.10, -0.11, 0.20], -0.08, new THREE.BoxGeometry(0.09, 0.03, 0.09), dogCreamMat));
      }

      return { group: g, thrusterFlame };
    };

    // -------------------------------------------------------------
    // THREE.JS GRAPHIC SYNCHRONISATION LAYOUT
    // -------------------------------------------------------------
    const renderThreeScene = (timestamp: number) => {
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      if (!scene || !camera || !renderer) return;

      const time = timestamp * 0.001;
      const dtFactor = 1.0;

      // Ensure camera reacts to shake levels
      if (screenShake.current > 0) {
        camera.position.x = (Math.random() - 0.5) * screenShake.current * 0.08;
        camera.position.y = 7.5 + (Math.random() - 0.5) * screenShake.current * 0.08;
        screenShake.current *= 0.88;
        if (screenShake.current < 0.2) screenShake.current = 0;
      } else {
        camera.position.y = 7.5;
      }

      // Smooth camera follow on active steering movement
      const pX3dCur = mapXToX3d(pX.current);
      camera.position.x += (pX3dCur * 0.55 - camera.position.x) * 0.1;
      camera.lookAt(new THREE.Vector3(pX3dCur * 0.28, 0.6, 2.0));

      // -------------------------------------------------------------
      // 1. SCENE ANTECEDENT DETAILS ANIMATION (Starfield & Road Line scrolling)
      // -------------------------------------------------------------
      // Animate road lines indicators based on running level
      const scrollSpeed = (status === 'RUNNING' && !isPausedRef.current ? 0.35 : (status === 'RUNNING' && isPausedRef.current ? 0.0 : 0.04)) * gameSpeedMultiplier;
      roadDashLines.current.forEach((line) => {
        line.position.z += scrollSpeed;
        if (line.position.z > 25) {
          line.position.z -= 110; // Wraps far deep
        }
      });

      roadPillars.current.forEach((pillar) => {
        pillar.position.z += scrollSpeed;
        if (pillar.position.z > 25) {
          pillar.position.z -= 110;
        }
        // Pulse warning emissive green glowing index
        if (pillar.material instanceof THREE.MeshStandardMaterial) {
          pillar.material.emissiveIntensity = 0.4 + Math.sin(time * 3 + pillar.position.z) * 0.25;
        }
      });

      if (starfieldPoints.current) {
        const positions = starfieldPoints.current.geometry.attributes.position.array as Float32Array;
        for (let i = 2; i < positions.length; i += 3) {
          positions[i] += scrollSpeed * 0.12; // slow parallax scroll
          if (positions[i] > 25) {
            positions[i] = -95;
          }
        }
        starfieldPoints.current.geometry.attributes.position.needsUpdate = true;
      }

      // -------------------------------------------------------------
      // 2. RENDERING THE PLAYER 3D EMBLEMS (Runner and Animations)
      // -------------------------------------------------------------
      const pGroup = playerGroupRef.current;
      if (pGroup) {
        const charSpecs = {
          MALE_PILOT: { scale: 2.3, baseHeight: 1.15, nameSpriteY: 2.9 },
          FEMALE_PILOT: { scale: 2.3, baseHeight: 1.15, nameSpriteY: 2.9 },
          SPACE_CAT: { scale: 2.3, baseHeight: 0.67, nameSpriteY: 2.4 },
          SPACE_DOG: { scale: 2.3, baseHeight: 0.67, nameSpriteY: 2.4 },
        }[selectedCharacterId] || { scale: 2.3, baseHeight: 1.15, nameSpriteY: 2.9 };

        // Compute standard position Y with a nice bouncy running hop
        const isRunnerMoving = status === 'RUNNING' && !isPausedRef.current;
        const runCycleSpeed = 16.0 * (isRunnerMoving ? gameSpeedMultiplier : 0.2);
        const runHop = isRunnerMoving ? Math.abs(Math.sin(time * runCycleSpeed)) * 0.07 : 0;
        
        // Ground runner Y positioning with vertical jumping height shift!
        pGroup.position.set(pX3dCur, charSpecs.baseHeight + runHop + pJumpY.current, 11.0);

        // Soft visual tilt on steering direction inputs
        const isPressingLeft = !isPausedRef.current && (keysPressed.current['a'] || keysPressed.current['arrowleft']);
        const isPressingRight = !isPausedRef.current && (keysPressed.current['d'] || keysPressed.current['arrowright']);
        const tiltTargetRot = isPressingLeft ? 0.22 : isPressingRight ? -0.22 : 0;
        pGroup.rotation.z += (tiltTargetRot - pGroup.rotation.z) * 0.14;

        // Flash ship visibility on player invulnerable period
        const isFlickerVisible = pInvulnerableTime.current <= 0 || Math.floor(timestamp / 70) % 2 === 0;
        pGroup.visible = isFlickerVisible;

        // If pilot model elements are empty or character changed, regenerate them
        const existingCharId = pGroup.userData.charId;
        if (existingCharId !== selectedCharacterId) {
          pGroup.userData.charId = selectedCharacterId;
          
          // Clear current ship parts
          while (pGroup.children.length > 0) {
            const child = pGroup.children[0];
            pGroup.remove(child);
          }

          // Build beautifully crafted character runner
          const { group: runnerGroup, thrusterFlame } = buildWastelandRunner(selectedCharacterId);
          runnerGroup.scale.set(charSpecs.scale, charSpecs.scale, charSpecs.scale);
          pGroup.add(runnerGroup);
          thrusterFlameRef.current = thrusterFlame;

          // Float name label above head beautifully
          let pilotChineseName = '雷恩';
          if (selectedCharacterId === 'MALE_PILOT') {
            pilotChineseName = language === 'ko' ? '라이언' : language === 'en' ? 'Ryan' : '雷恩';
          } else if (selectedCharacterId === 'FEMALE_PILOT') {
            pilotChineseName = language === 'ko' ? '아이린' : language === 'en' ? 'Irene' : '艾琳';
          } else if (selectedCharacterId === 'SPACE_CAT') {
            pilotChineseName = language === 'ko' ? '먀오짱' : language === 'en' ? 'Myau' : '喵酱';
          } else if (selectedCharacterId === 'SPACE_DOG') {
            pilotChineseName = language === 'ko' ? '왕자' : language === 'en' ? 'Wangzai' : '汪仔';
          }

          const nameTex = createTextTexture(pilotChineseName, '#ffffff');
          const nameMat = new THREE.SpriteMaterial({ map: nameTex, transparent: true });
          const nameSprite = new THREE.Sprite(nameMat);
          nameSprite.scale.set(1.6, 0.4, 1.0);
          nameSprite.position.set(0, charSpecs.nameSpriteY, 0); // floats high safely above head
          pGroup.add(nameSprite);
          nameSpriteRef.current = nameSprite;
        }

        // Animate running limbs cycles dynamically
        const charGroup = pGroup.getObjectByName("charGroup");
        if (charGroup) {
          const isActuallyMoving = status === 'RUNNING' && !isPausedRef.current;
          const swingAngle = isActuallyMoving ? 0.65 : 0.04;
          const breathing = isActuallyMoving ? 0 : Math.sin(time * 4) * 0.04;

          const leftArm = charGroup.getObjectByName('leftArm');
          const rightArm = charGroup.getObjectByName('rightArm');
          const leftLeg = charGroup.getObjectByName('leftLeg');
          const rightLeg = charGroup.getObjectByName('rightLeg');

          const isJumping = pJumpY.current > 0.01;

          if (leftLeg && rightLeg) {
            leftLeg.rotation.x = isJumping ? -0.4 : (isActuallyMoving ? Math.sin(time * runCycleSpeed) * swingAngle : 0);
            rightLeg.rotation.x = isJumping ? -0.4 : (isActuallyMoving ? -Math.sin(time * runCycleSpeed) * swingAngle : 0);
          }
          if (leftArm && rightArm) {
            leftArm.rotation.x = isJumping ? 0.35 : (isActuallyMoving ? -Math.sin(time * runCycleSpeed) * swingAngle : breathing);
            rightArm.rotation.x = isJumping ? 0.35 : (isActuallyMoving ? Math.sin(time * runCycleSpeed) * swingAngle : -breathing);
          }

          const leftWing = charGroup.getObjectByName('leftWing');
          const rightWing = charGroup.getObjectByName('rightWing');
          if (leftWing && rightWing) {
            leftWing.rotation.y = 0.4 + Math.sin(time * 12) * 0.18;
            rightWing.rotation.y = -0.4 - Math.sin(time * 12) * 0.18;
          }

          const legFL = charGroup.getObjectByName('legFL');
          const legFR = charGroup.getObjectByName('legFR');
          const legBL = charGroup.getObjectByName('legBL');
          const legBR = charGroup.getObjectByName('legBR');
          const tail = charGroup.getObjectByName('tail');

          if (legFL && legFR && legBL && legBR) {
            if (isJumping) {
              legFL.rotation.x = 0.4;
              legFR.rotation.x = 0.4;
              legBL.rotation.x = -0.4;
              legBR.rotation.x = -0.4;
            } else if (isActuallyMoving) {
              legFL.rotation.x = Math.sin(time * runCycleSpeed) * swingAngle;
              legBR.rotation.x = Math.sin(time * runCycleSpeed) * swingAngle;
              legFR.rotation.x = -Math.sin(time * runCycleSpeed) * swingAngle;
              legBL.rotation.x = -Math.sin(time * runCycleSpeed) * swingAngle;
            } else {
              legFL.rotation.x = 0;
              legFR.rotation.x = 0;
              legBL.rotation.x = 0;
              legBR.rotation.x = 0;
            }
          }
          if (tail) {
            if (isJumping) {
              tail.rotation.z = Math.sin(time * 6) * 0.15 + 0.3;
              tail.rotation.y = 0;
            } else {
              const tailSpeed = isActuallyMoving ? 14.0 : 4.0;
              const tailWag = isActuallyMoving ? 0.35 : 0.12;
              tail.rotation.z = Math.sin(time * tailSpeed) * tailWag;
              tail.rotation.y = Math.cos(time * tailSpeed * 0.8) * (tailWag * 0.6);
            }
          }
        }

        // Pulse thruster jets flame size
        if (thrusterFlameRef.current) {
          const sizeScale = 1.0 + Math.sin(time * 35) * 0.18;
          thrusterFlameRef.current.scale.set(sizeScale, sizeScale, sizeScale);
        }
      }

      // -------------------------------------------------------------
      // 3. SYNCHRONISING THE 3D TRASH OBSTACLES MESHES
      // -------------------------------------------------------------
      const obstaclesList2D = obstacles.current;
      obstaclesList2D.forEach((ob) => {
        let obGroup = obstacleMeshes.current.get(ob.id);
        
        // Build 3D Obstacle geometries dynamically if they are new to scene
        if (!obGroup) {
          obGroup = new THREE.Group();
          scene.add(obGroup);
          obstacleMeshes.current.set(ob.id, obGroup);

          if (ob.type === 'TOXIC_BARREL') {
            // High radioactive cylindrical chemical barrel
            const cylinderGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.35, 8);
            const cylinderMat = new THREE.MeshStandardMaterial({
              color: 0xef4444, // Blood hazards alert red
              metalness: 0.75,
              roughness: 0.25,
              emissive: 0x7f1d1d
            });
            const barrel = new THREE.Mesh(cylinderGeo, cylinderMat);
            obGroup.add(barrel);

            // Adding neon chemical straps
            const torusGeo = new THREE.TorusGeometry(0.58, 0.08, 5, 8);
            const torusMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
            
            const strapT = new THREE.Mesh(torusGeo, torusMat);
            strapT.position.y = 0.35;
            strapT.rotation.x = Math.PI / 2;
            obGroup.add(strapT);

            const strapB = new THREE.Mesh(torusGeo, torusMat);
            strapB.position.y = -0.35;
            strapB.rotation.x = Math.PI / 2;
            obGroup.add(strapB);

            // Custom face plate
            const headTex = createEmojiTexture('☣️');
            const headSpriteMat = new THREE.SpriteMaterial({ map: headTex, transparent: true });
            const headSprite = new THREE.Sprite(headSpriteMat);
            headSprite.scale.set(1.4, 1.4, 1.0);
            headSprite.position.set(0, 0, 0.65);
            obGroup.add(headSprite);

          } else if (ob.type === 'SPIKES') {
            // Dangerous metallic floor bar elements
            const baseGeo = new THREE.BoxGeometry(1.9, 0.1, 0.6);
            const baseMat = new THREE.MeshStandardMaterial({
              color: 0x334155,
              metalness: 0.9,
              roughness: 0.1
            });
            const base = new THREE.Mesh(baseGeo, baseMat);
            obGroup.add(base);

            // Three sharp piercing cone spikes
            const spikeGeo = new THREE.ConeGeometry(0.25, 0.9, 5);
            const spikeMat = new THREE.MeshStandardMaterial({
              color: 0xea580c, // Safety alert orange-red
              emissive: 0x9a3412,
              metalness: 0.8
            });

            [-0.6, 0, 0.6].forEach((xOffset) => {
              const sp = new THREE.Mesh(spikeGeo, spikeMat);
              sp.position.set(xOffset, 0.45, 0);
              obGroup.add(sp);
            });

          } else if (ob.type === 'PLASTIC') {
            // Ugly clusters of floating synthetic garbage capsules
            const junkGroup = new THREE.Group();
            const chunkGeo = new THREE.SphereGeometry(0.38, 5, 5);
            const chunkMat = new THREE.MeshStandardMaterial({
              color: 0x6b7280,
              roughness: 0.95
            });

            // Random composite pile structure
            for (let i = 0; i < 5; i++) {
              const chunk = new THREE.Mesh(chunkGeo, chunkMat);
              chunk.position.set(
                (Math.random() - 0.5) * 0.7,
                (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.7
              );
              chunk.scale.setScalar(0.72 + Math.random() * 0.5);
              junkGroup.add(chunk);
            }
            obGroup.add(junkGroup);

          } else if (ob.type === 'E_WASTE') {
            // Active sparking electronic circuit mainframe
            const coreGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);
            const coreMat = new THREE.MeshStandardMaterial({
              color: 0x1e293b,
              metalness: 0.9,
              roughness: 0.3
            });
            const core = new THREE.Mesh(coreGeo, coreMat);
            obGroup.add(core);

            // Glowing hazardous grids wrapped around the block
            const gridGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
            const wireMat = new THREE.MeshBasicMaterial({
              color: 0xef4444, // Spark glowing red
              wireframe: true
            });
            const wrapper = new THREE.Mesh(gridGeo, wireMat);
            obGroup.add(wrapper);
          }
        }

        // Synchronize dynamic coordinates from original physics
        const t3dX = mapXToX3d(ob.x);
        const t3dZ = mapYToZ(ob.y);
        obGroup.position.set(t3dX, ob.type === 'SPIKES' ? 0.05 : 0.65, t3dZ);

        // Spin trash elements on track for chaotic dynamic visual impact (paused check)
        if (!isPausedRef.current) {
          if (ob.type === 'TOXIC_BARREL') {
            obGroup.rotation.y += 0.045;
            obGroup.rotation.x += 0.015;
          } else if (ob.type === 'PLASTIC') {
            obGroup.rotation.x += 0.012;
            obGroup.rotation.z += 0.015;
          } else if (ob.type === 'E_WASTE') {
            obGroup.rotation.y += 0.07;
            obGroup.rotation.z += 0.035;
          }
        }
      });

      // Clear away deleted meshes
      obstacleMeshes.current.forEach((meshGroup, id) => {
        const stillExists = obstaclesList2D.some(ob => ob.id === id);
        if (!stillExists) {
          scene.remove(meshGroup);
          obstacleMeshes.current.delete(id);
          // Recursively clean geometry buffers
          meshGroup.traverse((node) => {
            if (node instanceof THREE.Mesh) {
              node.geometry.dispose();
              if (Array.isArray(node.material)) {
                node.material.forEach(m => m.dispose());
              } else {
                node.material.dispose();
              }
            }
          });
        }
      });

      // -------------------------------------------------------------
      // 4. SYNCHRONISING THE 3D SPACIAL Eco-MATERIALS MESHES
      // -------------------------------------------------------------
      const materialsList2D = materials.current;
      materialsList2D.forEach((item) => {
        let itemGroup = materialMeshes.current.get(item.id);

        if (!itemGroup) {
          itemGroup = new THREE.Group();
          scene.add(itemGroup);
          materialMeshes.current.set(item.id, itemGroup);

          if (item.type === 'WOOD') {
            // Elegant ecological multi-segment timber log cylinders
            const logGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.25, 6);
            logGeo.rotateZ(Math.PI / 2); // Aligned transverse
            const logMat = new THREE.MeshStandardMaterial({
              color: 0x854d0e, // Wood bark golden brown
              roughness: 0.95,
              metalness: 0.1
            });
            const log = new THREE.Mesh(logGeo, logMat);
            itemGroup.add(log);

            // Tiny sprouting solar leaf cells at wing borders
            const leafGeo = new THREE.SphereGeometry(0.18, 4, 4);
            const leafMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
            
            const leafL = new THREE.Mesh(leafGeo, leafMat);
            leafL.position.set(-0.6, 0.1, 0);
            itemGroup.add(leafL);

            const leafR = new THREE.Mesh(leafGeo, leafMat);
            leafR.position.set(0.6, 0.1, 0);
            itemGroup.add(leafR);

          } else if (item.type === 'METAL') {
            // Shimmering octahedron alloy core block
            const octGeo = new THREE.OctahedronGeometry(0.55);
            const octMat = new THREE.MeshStandardMaterial({
              color: 0x38bdf8, // Sky silver alloy
              roughness: 0.05,
              metalness: 0.95,
              emissive: 0x0369a1
            });
            const core = new THREE.Mesh(octGeo, octMat);
            itemGroup.add(core);

            // Spinning outer hyper compass orbital rings
            const ringGeo = new THREE.TorusGeometry(0.85, 0.05, 4, 12);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 3;
            itemGroup.add(ring);
            itemGroup.userData.ring = ring;

          } else if (item.type === 'SOLAR') {
            // Solar tracking photostatic grid batteries
            const panelGeo = new THREE.BoxGeometry(1.15, 0.06, 0.85);
            const frameMat = new THREE.MeshStandardMaterial({
              color: 0xf5a623, // Orange frame
              roughness: 0.2
            });
            const panel = new THREE.Mesh(panelGeo, frameMat);
            panel.rotation.x = -Math.PI / 6; // Angled facing camera
            itemGroup.add(panel);

            // Shivering photosector cell inserts
            const cellGeo = new THREE.BoxGeometry(0.95, 0.07, 0.65);
            const cellMat = new THREE.MeshStandardMaterial({
              color: 0x1e3a8a, // Solar deep blue cells
               roughness: 0.01,
              metalness: 1.0,
              emissive: 0x172554
            });
            const cell = new THREE.Mesh(cellGeo, cellMat);
            cell.position.y = 0.01;
            cell.rotation.x = -Math.PI / 6;
            itemGroup.add(cell);
          }
        }

        const t3dX = mapXToX3d(item.x);
        const t3dZ = mapYToZ(item.y);
        const floatDelta = Math.sin(time * 6.5 + t3dX) * 0.16;
        itemGroup.position.set(t3dX, 0.65 + floatDelta, t3dZ);

        // Spin resources to make them invite player collection
        if (!isPausedRef.current) {
          itemGroup.rotation.y += 0.04;
          if (item.type === 'METAL' && itemGroup.userData.ring) {
            itemGroup.userData.ring.rotation.y += 0.09;
          }
        }
      });

      // Clear dynamic deleted material bodies
      materialMeshes.current.forEach((meshGroup, id) => {
        const stillExists = materialsList2D.some(item => item.id === id);
        if (!stillExists) {
          scene.remove(meshGroup);
          materialMeshes.current.delete(id);
          meshGroup.traverse((node) => {
            if (node instanceof THREE.Mesh) {
              node.geometry.dispose();
              if (Array.isArray(node.material)) {
                node.material.forEach(m => m.dispose());
              } else {
                node.material.dispose();
              }
            }
          });
        }
      });

      // -------------------------------------------------------------
      // 5. SYNCHRONISING THE 3D CHECKPOINT SAFETY CAMP GATES
      // -------------------------------------------------------------
      const campData = activeCamp.current;
      if (campData) {
        let campObj = campMeshRef.current;
        
        // Build cozy glowing laser dome arch structure if missing
        if (!campObj) {
          campObj = new THREE.Group();
          scene.add(campObj);
          campMeshRef.current = campObj;

          // Rich rustic voxel wood log structures
          const woodMat = new THREE.MeshStandardMaterial({
            color: 0x7c2d12, // beautiful cedar log brown
            roughness: 0.9,
          });

          // Blocky Wooden Arch Pillars
          const pillarGeo = new THREE.BoxGeometry(0.5, 5.0, 0.5);

          const pLeft = new THREE.Mesh(pillarGeo, woodMat);
          pLeft.position.set(-6, 2.5, 0);
          campObj.add(pLeft);

          const pRight = new THREE.Mesh(pillarGeo, woodMat);
          pRight.position.set(6, 2.5, 0);
          campObj.add(pRight);

          // Top thick roofing horizontal support beam
          const beamGeo = new THREE.BoxGeometry(13.2, 0.6, 0.6);
          const beam = new THREE.Mesh(beamGeo, woodMat);
          beam.position.set(0, 5.0, 0);
          campObj.add(beam);

          // Diagonal brace supports (gorgeous voxel touch)
          const braceGeo = new THREE.BoxGeometry(1.2, 0.25, 0.25);
          
          const braceL = new THREE.Mesh(braceGeo, woodMat);
          braceL.position.set(-5.3, 4.4, 0);
          braceL.rotation.z = -Math.PI / 4;
          campObj.add(braceL);

          const braceR = new THREE.Mesh(braceGeo, woodMat);
          braceR.position.set(5.3, 4.4, 0);
          braceR.rotation.z = Math.PI / 4;
          campObj.add(braceR);

          // Cozy hanging paper lantern boxes with orange survival glow
          const lanternGeo = new THREE.BoxGeometry(0.3, 0.45, 0.3);
          const lanternMat = new THREE.MeshStandardMaterial({
            color: 0xea580c,
            emissive: 0xf97316,
            emissiveIntensity: 1.5,
          });

          const lanternL = new THREE.Mesh(lanternGeo, lanternMat);
          lanternL.position.set(-5.6, 4.2, 0);
          campObj.add(lanternL);

          const lanternR = new THREE.Mesh(lanternGeo, lanternMat);
          lanternR.position.set(5.6, 4.2, 0);
          campObj.add(lanternR);

          // Mini checkpoint camp log cabin house on the side of the road
          const cabinGroup = new THREE.Group();
          cabinGroup.position.set(-8.2, 0, -1.0); // side grass clearing
          campObj.add(cabinGroup);

          const floorGeo = new THREE.BoxGeometry(2.2, 0.15, 2.2);
          const floorMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
          const floor = new THREE.Mesh(floorGeo, floorMat);
          floor.position.set(0, 0.075, 0);
          cabinGroup.add(floor);

          const wallMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
          const cabinWall = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 1.8), wallMat);
          cabinWall.position.set(0, 0.775, 0);
          cabinGroup.add(cabinWall);

          // Forest green tiled roof slates (matching image exactly!)
          const roofMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 });
          const roofL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 2.1), roofMat);
          roofL.position.set(-0.5, 1.6, 0);
          roofL.rotation.z = 0.45;
          cabinGroup.add(roofL);

          const roofR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 2.1), roofMat);
          roofR.position.set(0.5, 1.6, 0);
          roofR.rotation.z = -0.45;
          cabinGroup.add(roofR);

          // Glowing cozy window box
          const windowGeo = new THREE.BoxGeometry(0.12, 0.4, 0.4);
          const windowMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xeab308, emissiveIntensity: 1.5 });
          const cabWindow = new THREE.Mesh(windowGeo, windowMat);
          cabWindow.position.set(0.9, 0.8, 0);
          cabinGroup.add(cabWindow);

          // Side Cozy camp bonfire (roaring amber fireplace)
          const campfireGroup = new THREE.Group();
          campfireGroup.position.set(7.8, 0, 0); // right side grass clearing
          campObj.add(campfireGroup);

          const logGeo = new THREE.BoxGeometry(0.12, 0.12, 0.8);
          const log1 = new THREE.Mesh(logGeo, woodMat);
          log1.rotation.y = Math.PI / 4;
          campfireGroup.add(log1);

          const log2 = new THREE.Mesh(logGeo, woodMat);
          log2.rotation.y = -Math.PI / 4;
          campfireGroup.add(log2);

          const fireGeo = new THREE.BoxGeometry(0.4, 0.6, 0.4);
          const fireMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
          const fireElem = new THREE.Mesh(fireGeo, fireMat);
          fireElem.position.y = 0.3;
          campfireGroup.add(fireElem);

          // Giant overhead neon floating HUD sign label "SHELTER CHECKPOINT CAMP"
          const marqueeText = language === 'ko' ? '⚡ 안전 대피소 ⚡' : language === 'en' ? '⚡ SAFE CAMP ⚡' : '⚡ 安全避难所 ⚡';
          const txtTex = createTextTexture(marqueeText, '#fde047');
          const txtMat = new THREE.SpriteMaterial({ map: txtTex, transparent: true });
          const txtSpr = new THREE.Sprite(txtMat);
          txtSpr.scale.set(4.5, 1.1, 1.0);
          txtSpr.position.set(0, 6.25, 0); // Spans center high top
          campObj.add(txtSpr);
        }

        // Apply updated scroll coordinates
        const campZ = mapYToZ(campData.y);
        campObj.position.set(0, 0, campZ);

      } else {
        if (campMeshRef.current) {
          scene.remove(campMeshRef.current);
          campMeshRef.current = null;
        }
      }

      // -------------------------------------------------------------
      // 6. ANIMATE AND FLUSH 3D ACTIVE SPARKS PARTICLES
      // -------------------------------------------------------------
      const activeSp3d = particles3D.current;
      for (let i = activeSp3d.length - 1; i >= 0; i--) {
        const p = activeSp3d[i];
        p.mesh.position.x += p.vx;
        p.mesh.position.y += p.vy;
        p.mesh.position.z += p.vz;
        
        // gravity pull downward
        p.vy -= 0.008;

        p.alpha -= p.decay;

        if (p.mesh.material instanceof THREE.MeshBasicMaterial) {
          p.mesh.material.opacity = p.alpha;
        }

        if (p.alpha <= 0) {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          if (p.mesh.material instanceof THREE.Material) p.mesh.material.dispose();
          activeSp3d.splice(i, 1);
        }
      }

      // Render Three frame pipeline
      renderer.render(scene, camera);
    };

    resetGameEntities();
    lastTimeRef.current = 0;
    animationId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [status, gameSpeedMultiplier, selectedCharacterId]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[450px] overflow-hidden bg-slate-950 flex flex-col rounded-2xl select-none" id="game_canvas_wrapper">
      {/* 3D WebGL Canvas pipeline */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" id="runner_canvas" />

      {/* Touch-Screen Steering columns for ergonomic accessibility */}
      {status === 'RUNNING' && (
        <div className="absolute inset-x-0 bottom-4 z-10 px-4 flex justify-between pointer-events-auto select-none gap-4">
          <button
            onMouseDown={() => handleVirtualLeft(true)}
            onMouseUp={() => handleVirtualLeft(false)}
            onMouseLeave={() => handleVirtualLeft(false)}
            onTouchStart={(e) => { e.preventDefault(); handleVirtualLeft(true); }}
            onTouchEnd={(e) => { e.preventDefault(); handleVirtualLeft(false); }}
            className="flex-1 max-w-[150px] h-15 rounded-xl bg-slate-900/80 border border-emerald-500/30 active:scale-95 active:bg-emerald-500/25 text-emerald-400 font-extrabold flex items-center justify-center text-md transition-all duration-75 backdrop-blur-md select-none touch-none cursor-pointer"
            title="L-Key A"
            id="btn_touch_left"
          >
            ◀ A 键
          </button>
          <button
            onMouseDown={() => {
              if (pJumpY.current === 0 && pJumpVelocity.current === 0) {
                pJumpVelocity.current = 0.165;
                playJumpSound();
              }
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              if (pJumpY.current === 0 && pJumpVelocity.current === 0) {
                pJumpVelocity.current = 0.165;
                playJumpSound();
              }
            }}
            className="flex-1 max-w-[150px] h-15 rounded-xl bg-slate-900/80 border border-emerald-500/30 active:scale-95 active:bg-emerald-500/25 text-emerald-400 font-extrabold flex items-center justify-center text-md transition-all duration-75 backdrop-blur-md select-none touch-none cursor-pointer"
            title="Jump Spacebar"
            id="btn_touch_jump"
          >
            {language === 'ko' ? '▲ 점프' : language === 'en' ? '▲ JUMP' : '▲ 跳跃'}
          </button>
          <button
            onMouseDown={() => handleVirtualRight(true)}
            onMouseUp={() => handleVirtualRight(false)}
            onMouseLeave={() => handleVirtualRight(false)}
            onTouchStart={(e) => { e.preventDefault(); handleVirtualRight(true); }}
            onTouchEnd={(e) => { e.preventDefault(); handleVirtualRight(false); }}
            className="flex-1 max-w-[150px] h-15 rounded-xl bg-slate-900/80 border border-emerald-500/30 active:scale-95 active:bg-emerald-500/25 text-emerald-400 font-extrabold flex items-center justify-center text-md transition-all duration-75 backdrop-blur-md select-none touch-none cursor-pointer"
            title="R-Key D"
            id="btn_touch_right"
          >
            D 键 ▶
          </button>
        </div>
      )}
    </div>
  );
}
