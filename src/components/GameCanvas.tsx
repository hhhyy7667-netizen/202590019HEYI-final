/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameStatus, Player, Obstacle, MaterialItem, Camp, Particle, LanePosition, CharacterId } from '../types';
import { playCollectSound, playHitSound, playCampSound } from '../utils/audio';

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
    // Ground color - cracked apocalyptic grey-brown asphalt
    ctx.fillStyle = '#1c1a21';
    ctx.fillRect(0, 0, 512, 1024);

    // Draw cracked lines all over
    ctx.strokeStyle = '#0a080d';
    ctx.lineWidth = 3;
    for (let i = 0; i < 50; i++) {
      ctx.beginPath();
      let curX = Math.random() * 512;
      let curY = Math.random() * 1024;
      ctx.moveTo(curX, curY);
      for (let j = 0; j < 4; j++) {
        curX += (Math.random() - 0.5) * 120;
        curY += (Math.random() - 0.5) * 120;
        ctx.lineTo(curX, curY);
      }
      ctx.stroke();
    }

    // Faded eroded side lanes
    ctx.fillStyle = '#2f2321';
    for (let y = 0; y < 1024; y += 4) {
      if (Math.random() > 0.3) {
        ctx.fillRect(0, y, 15 + Math.random() * 20, 3);
        ctx.fillRect(477 - Math.random() * 20, y, 40, 3);
      }
    }

    // Cracks in progress highlighted with orange/red radioactive seepages
    ctx.strokeStyle = '#ea580c'; // magma orange seepage
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      let curX = Math.random() * 512;
      let curY = Math.random() * 1024;
      ctx.moveTo(curX, curY);
      ctx.globalAlpha = 0.65;
      for (let j = 0; j < 3; j++) {
        curX += (Math.random() - 0.5) * 70;
        curY += (Math.random() - 0.5) * 70;
        ctx.lineTo(curX, curY);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;
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

    // Glowing Rusted Amber Guardrails (Boundaries)
    const railGeo = new THREE.BoxGeometry(0.3, 0.6, 120);
    const railMatLeft = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      emissive: 0x9a3412,
      roughness: 0.7
    });
    const railLeft = new THREE.Mesh(railGeo, railMatLeft);
    railLeft.position.set(-6, 0.3, -35);
    scene.add(railLeft);

    const railMatRight = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      emissive: 0x9a3412,
      roughness: 0.7
    });
    const railRight = new THREE.Mesh(railGeo, railMatRight);
    railRight.position.set(6, 0.3, -35);
    scene.add(railRight);

    // Dashboard line markers inside lane (faded warning amber/brown to simulate speed rushing)
    const linesArr: THREE.Mesh[] = [];
    const lineGeo = new THREE.BoxGeometry(0.15, 0.02, 3.5);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x78350f });

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
      railGeo.dispose();
      railMatLeft.dispose();
      railMatRight.dispose();
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

        if (distY < 32 && distX < 28 && pInvulnerableTime.current <= 0) {
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
      // 2. RENDERING THE PLAYER 3D EMBLEMS (Ships & Pilot Emojis)
      // -------------------------------------------------------------
      const pGroup = playerGroupRef.current;
      if (pGroup) {
        pGroup.position.set(pX3dCur, 0.6 + Math.sin(time * 5.5) * 0.06, 11.0); // Gentle floating animation

        // Soft visual tilt on steering direction inputs
        const isPressingLeft = !isPausedRef.current && (keysPressed.current['a'] || keysPressed.current['arrowleft']);
        const isPressingRight = !isPausedRef.current && (keysPressed.current['d'] || keysPressed.current['arrowright']);
        const tiltTargetRot = isPressingLeft ? 0.26 : isPressingRight ? -0.26 : 0;
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

          // Build beautiful tech-forward themed cruiser parts
          let mainColor = 0x38bdf8;
          let wingColor = 0xf97316;
          let avatarEmoji = '👨‍🚀';
          let pilotChineseName = '雷恩';
          let isMiniShip = false;
          if (selectedCharacterId === 'MALE_PILOT') {
            mainColor = 0x0284c7; // Deep tech blue
            wingColor = 0xf97316; // Neon solar orange core
            avatarEmoji = '👨‍🔧';
            pilotChineseName = language === 'ko' ? '라이언' : language === 'en' ? 'Ryan' : '雷恩';
            isMiniShip = false;
          } else if (selectedCharacterId === 'FEMALE_PILOT') {
            mainColor = 0xec4899; // Aerodynamic pink
            wingColor = 0x8b5cf6; // Purple hyper flight rings
            avatarEmoji = '👩‍🎤';
            pilotChineseName = language === 'ko' ? '아이린' : language === 'en' ? 'Irene' : '艾琳';
            isMiniShip = false;
          } else if (selectedCharacterId === 'SPACE_CAT') {
            mainColor = 0xf59e0b; // Gold core
            wingColor = 0x10b981; // Green leaf matrix
            avatarEmoji = '😼';
            pilotChineseName = language === 'ko' ? '喵酱(묘짱)' : language === 'en' ? 'Myau' : '喵酱';
            isMiniShip = true;
          } else if (selectedCharacterId === 'SPACE_DOG') {
            mainColor = 0x06b6d4; // Cyan plates
            wingColor = 0x3b82f6; // High frequency blue fins
            avatarEmoji = '🐕';
            pilotChineseName = language === 'ko' ? '汪仔(왕자)' : language === 'en' ? 'Wangzai' : '汪仔';
            isMiniShip = true;
          }

          // Create a dedicated ship sub-group which can be scaled cleanly
          const shipSubGroup = new THREE.Group();
          pGroup.add(shipSubGroup);

          // Apply scale: Humans get standard scale, Cat/Dog get smaller mini scale (smaller by a full margin)
          const shipScale = isMiniShip ? 0.68 : 1.0;
          shipSubGroup.scale.set(shipScale, shipScale, shipScale);

          // A: FUSELAGE BASE DECORATION (Main cabin & aerodynamic body)
          const bodyGeo = new THREE.ConeGeometry(0.55, 2.2, 8);
          bodyGeo.rotateX(Math.PI / 2); // Aligned pointing forward
          const bodyMat = new THREE.MeshStandardMaterial({
            color: mainColor,
            metalness: 0.9,
            roughness: 0.15
          });
          const body = new THREE.Mesh(bodyGeo, bodyMat);
          body.position.set(0, 0, -0.2);
          shipSubGroup.add(body);

          // B: AERODYNAMIC TECH WINGS (Adjust shape per spacecraft)
          const wingGeo = new THREE.BoxGeometry(2.4, 0.08, 0.6);
          const wingMat = new THREE.MeshStandardMaterial({
            color: wingColor,
            metalness: 0.8,
            roughness: 0.25
          });
          const wings = new THREE.Mesh(wingGeo, wingMat);
          wings.position.set(0, -0.1, 0.2);
          shipSubGroup.add(wings);

          // Extra Wing / Tail details based on pilot style!
          if (selectedCharacterId === 'SPACE_CAT') {
            // Cute robotic kitty space-ears molded on the spaceship hull tips
            const earGeo = new THREE.ConeGeometry(0.18, 0.42, 4);
            earGeo.rotateX(Math.PI / 10);
            const earMat = new THREE.MeshStandardMaterial({
              color: mainColor,
              metalness: 0.8,
              roughness: 0.2
            });

            const earL = new THREE.Mesh(earGeo, earMat);
            earL.position.set(-0.35, 0.45, -0.4);
            shipSubGroup.add(earL);

            const earR = new THREE.Mesh(earGeo, earMat);
            earR.position.set(0.35, 0.45, -0.4);
            shipSubGroup.add(earR);
          } else if (selectedCharacterId === 'SPACE_DOG') {
            // Floppy twin canine vertical tail stabilizers
            const stabilizerGeo = new THREE.BoxGeometry(0.08, 0.55, 0.42);
            const stabMat = new THREE.MeshStandardMaterial({
              color: wingColor,
              metalness: 0.8
            });

            const stabilizerLeft = new THREE.Mesh(stabilizerGeo, stabMat);
            stabilizerLeft.position.set(-0.7, 0.15, 0.3);
            stabilizerLeft.rotation.z = -0.32;
            shipSubGroup.add(stabilizerLeft);

            const stabilizerRight = new THREE.Mesh(stabilizerGeo, stabMat);
            stabilizerRight.position.set(0.7, 0.15, 0.3);
            stabilizerRight.rotation.z = 0.32;
            shipSubGroup.add(stabilizerRight);
          } else if (selectedCharacterId === 'FEMALE_PILOT') {
            // Extra supersonic needle winglets
            const needleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 4);
            needleGeo.rotateX(Math.PI / 2);
            const needleMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9 });
            const needleL = new THREE.Mesh(needleGeo, needleMat);
            needleL.position.set(-1.25, -0.1, 0.2);
            shipSubGroup.add(needleL);
            const needleR = new THREE.Mesh(needleGeo, needleMat);
            needleR.position.set(1.25, -0.1, 0.2);
            shipSubGroup.add(needleR);
          }

          // C: REAR CYLINDER ENGINES
          const engineGeo = new THREE.CylinderGeometry(0.24, 0.16, 0.8, 8);
          engineGeo.rotateX(Math.PI / 2);
          const engineMat = new THREE.MeshStandardMaterial({
            color: 0x334155,
            metalness: 0.9,
            roughness: 0.1
          });
          
          const engineLeft = new THREE.Mesh(engineGeo, engineMat);
          engineLeft.position.set(-0.35, -0.12, 0.65);
          shipSubGroup.add(engineLeft);

          const engineRight = new THREE.Mesh(engineGeo, engineMat);
          engineRight.position.set(0.35, -0.12, 0.65);
          shipSubGroup.add(engineRight);

          // D: COCKPIT GLASS CANOPY (Translucent, carrying the visible pilot inside!)
          const cockpitGeo = new THREE.SphereGeometry(0.38, 16, 16);
          const cockpitMat = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.35, // Clear glass transparency so the passenger inside is clearly visible!
            roughness: 0.05,
            metalness: 0.9
          });
          const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
          cockpit.position.set(0, 0.15, -0.15);
          shipSubGroup.add(cockpit);

          // E: ANIMATED THRUSTER LIGHT CONE
          const thrGeo = new THREE.ConeGeometry(0.35, 1.3, 8);
          thrGeo.rotateX(-Math.PI / 2); // pointing out the engines
          const thrMat = new THREE.MeshBasicMaterial({
            color: wingColor,
            transparent: true,
            opacity: 0.75
          });
          const flame = new THREE.Mesh(thrGeo, thrMat);
          flame.position.set(0, -0.12, 1.4);
          shipSubGroup.add(flame);
          thrusterFlameRef.current = flame;

          // F: PILOT HUD TEXTURE CANVAS FLOATING OVER COCKPIT (Stays at top relative to pGroup)
          const nameTex = createTextTexture(pilotChineseName, '#ffffff');
          const nameMat = new THREE.SpriteMaterial({ map: nameTex, transparent: true });
          const nameSprite = new THREE.Sprite(nameMat);
          nameSprite.scale.set(1.8, 0.45, 1.0);
          nameSprite.position.set(0, 1.45, 0); // floats high safely
          pGroup.add(nameSprite);
          nameSpriteRef.current = nameSprite;

          // G: PILOT CARTOON EMOJI (Beautifully sits cozy inside/at cockpit coordinates)
          const emojiTex = createEmojiTexture(avatarEmoji);
          const emojiMat = new THREE.SpriteMaterial({ map: emojiTex, transparent: true });
          const emojiSprite = new THREE.Sprite(emojiMat);
          
          // Style size and placement snug inside the standard or mini cockpit
          if (isMiniShip) {
            emojiSprite.scale.set(0.65, 0.65, 0.65);
            emojiSprite.position.set(0, 0.12, -0.1);
          } else {
            emojiSprite.scale.set(0.9, 0.9, 0.9);
            emojiSprite.position.set(0, 0.16, -0.15);
          }
          pGroup.add(emojiSprite);
          emojiSpriteRef.current = emojiSprite;
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

          // Huge warning safety yellow archways bridging key road lanes
          const basePillarGeo = new THREE.CylinderGeometry(0.24, 0.24, 5.0, 7);
          const pillarMat = new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            emissive: 0xeab308, // glowing caution gold
            roughness: 0.3
          });

          const pLeft = new THREE.Mesh(basePillarGeo, pillarMat);
          pLeft.position.set(-6, 2.5, 0);
          campObj.add(pLeft);

          const pRight = new THREE.Mesh(basePillarGeo, pillarMat);
          pRight.position.set(6, 2.5, 0);
          campObj.add(pRight);

          const beamGeo = new THREE.BoxGeometry(12.5, 0.45, 0.45);
          const beam = new THREE.Mesh(beamGeo, pillarMat);
          beam.position.set(0, 5.0, 0);
          campObj.add(beam);

          // Cozy safety glowing forcefield dome dome backing strip representation
          const domeGeo = new THREE.CylinderGeometry(5.8, 5.8, 0.05, 24, 1, true, 0, Math.PI);
          domeGeo.rotateZ(-Math.PI / 2); // Makes arch dome cap
          const domeMat = new THREE.MeshBasicMaterial({
            color: 0xeab308,
            transparent: true,
            opacity: 0.16,
            side: THREE.DoubleSide
          });
          const dome = new THREE.Mesh(domeGeo, domeMat);
          dome.position.set(0, 0, 0);
          campObj.add(dome);

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
