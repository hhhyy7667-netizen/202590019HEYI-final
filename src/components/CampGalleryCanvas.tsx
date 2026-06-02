/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Sparkles, Home } from 'lucide-react';

interface CampGalleryCanvasProps {
  builtCamps: string[];
}

export default function CampGalleryCanvas({ builtCamps }: CampGalleryCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Drag interaction state
  const isDragging = useRef(false);
  const prevPointerX = useRef(0);
  const prevPointerY = useRef(0);
  const rotationX = useRef(0.25); // Default tilt
  const rotationY = useRef(0);

  // Animation ticks
  const animationFrameId = useRef<number | null>(null);
  const clock = useRef(new THREE.Clock());

  // Model references for animation
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const rotatingRadarRef = useRef<THREE.Mesh | null>(null);
  const glowingCoreRef = useRef<THREE.Mesh | null>(null);
  const solarWingsRef = useRef<THREE.Group | null>(null);
  const campfirePlumes = useRef<THREE.Mesh[]>([]);

  // Handle pointer/drag events for custom orbit rotation
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    prevPointerX.current = e.clientX;
    prevPointerY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - prevPointerX.current;
    const deltaY = e.clientY - prevPointerY.current;
    prevPointerX.current = e.clientX;
    prevPointerY.current = e.clientY;

    rotationY.current += deltaX * 0.007;
    rotationX.current = Math.max(-0.2, Math.min(1.1, rotationX.current + deltaY * 0.007));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // 1. SETUP THREE.JS SCENE Elements
    const width = containerRef.current.clientWidth || 360;
    const height = containerRef.current.clientHeight || 400;

    const scene = new THREE.Scene();
    // Deepest cosmic space black background
    scene.background = new THREE.Color(0x020408);
    scene.fog = new THREE.FogExp2(0x020408, 0.015);

    // Camera setup
    const aspect = width / height;
    const fov = aspect < 1.0 ? 55 : 45;
    const cameraDistance = aspect < 1.0 ? 15.0 : 12.0;
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100);
    camera.position.set(0, 5.5, cameraDistance);
    camera.lookAt(0, 1.2, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Gentle starry background cosmic particles (Wasteland night)
    const starCount = 450;
    const starGeom = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      const radius = 30 + Math.random() * 10;
      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = Math.abs(radius * Math.sin(phi) * Math.sin(theta));
      starPositions[i * 3 + 2] = radius * Math.cos(phi);
    }
    starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x67e8f9,
      size: 0.06,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });
    const starField = new THREE.Points(starGeom, starMat);
    scene.add(starField);

    // 2. LIGHTING SETUP
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x06b6d4, 3.0);
    dirLight.position.set(5, 12, 4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Subtle warm rim/glow pointlight in the center
    const pointLight = new THREE.PointLight(0xf59e0b, 3.5, 15);
    pointLight.position.set(0, 2.0, 0);
    scene.add(pointLight);

    // 3. MASTER GROUP FOR SITE
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);
    modelGroupRef.current = masterGroup;

    // Reset rotation refs on load
    rotationX.current = 0.25;
    rotationY.current = 0;

    // Helper to generate materials
    const getScifiMaterial = (color: number, roughness = 0.4, metalness = 0.3, emissiveHex?: number, emissiveInt = 1.0) => {
      const p: Record<string, any> = {
        color: color,
        roughness: roughness,
        metalness: metalness,
      };
      if (emissiveHex !== undefined) {
        p.emissive = new THREE.Color(emissiveHex);
        p.emissiveIntensity = emissiveInt;
      }
      return new THREE.MeshStandardMaterial(p);
    };

    // 4. PLATFORM BASE (The empty wasteland platform)
    // Dark cracked desolate platform slab
    const groundGeom = new THREE.CylinderGeometry(4.4, 4.6, 0.4, 8); // Octagon base
    const groundMat = getScifiMaterial(0x111622, 0.85, 0.15); // Rough rocky dark slate gray
    const groundMesh = new THREE.Mesh(groundGeom, groundMat);
    groundMesh.receiveShadow = true;
    masterGroup.add(groundMesh);

    // Cyan Neon Hex rim trim
    const trimGeom = new THREE.TorusGeometry(4.45, 0.06, 8, 8);
    trimGeom.rotateX(Math.PI / 2);
    const trimMat = getScifiMaterial(0x10b981, 0.3, 0.9, 0x10b981, 1.2);
    const trimMesh = new THREE.Mesh(trimGeom, trimMat);
    trimMesh.position.y = 0.16;
    masterGroup.add(trimMesh);

    // Small glowing sector coordinates dots around the ground
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const dotGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 6);
      const dotMat = getScifiMaterial(0x06b6d4, 0.1, 0.9, 0x06b6d4, 1.5);
      const dotMesh = new THREE.Mesh(dotGeom, dotMat);
      dotMesh.position.set(Math.cos(angle) * 3.9, 0.21, Math.sin(angle) * 3.9);
      masterGroup.add(dotMesh);
    }

    // -------------------------------------------------------------
    // BUILD CHOSEN MODULAR BUILDING PARTS IF UNLOCKED
    // -------------------------------------------------------------
    campfirePlumes.current = [];
    rotatingRadarRef.current = null;
    glowingCoreRef.current = null;
    solarWingsRef.current = null;

    // Safe casing check
    const isSHELTER = builtCamps.includes('SHELTER');
    const isKITCHEN = builtCamps.includes('KITCHEN');
    const isTOOLROOM = builtCamps.includes('TOOLROOM');
    const isPOWER = builtCamps.includes('POWER');
    const isWATCHTOWER = builtCamps.includes('WATCHTOWER');
    const isCLINIC = builtCamps.includes('CLINIC');
    const isWAREHOUSE = builtCamps.includes('WAREHOUSE');

    // MODULE 1: SHELTER (基础庇护所) - Placed at the very center (Core)
    if (isSHELTER) {
      const shelterGroup = new THREE.Group();
      shelterGroup.position.set(0, 0.2, 0); // perfectly centered
      masterGroup.add(shelterGroup);

      // Warm timber cedar and grey stone palette
      const stoneMat = getScifiMaterial(0x334155, 0.9, 0.1); // grey stone foundation
      const woodWallMat = getScifiMaterial(0x854d0e, 0.8, 0.2); // cedar log walls
      const darkWoodMat = getScifiMaterial(0x451a03, 0.9, 0.1); // dark framing
      const mossRoofMat = getScifiMaterial(0x0f2913, 0.7, 0.3); // deep forest green tile roof (matches image!)
      const glassGlowMat = getScifiMaterial(0xfef08a, 0.1, 0.9, 0xf59e0b, 1.8); // cozy burning amber window light

      // 1. Stone foundation slab
      const foundation = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.15, 2.0), stoneMat);
      foundation.position.y = 0.075;
      shelterGroup.add(foundation);

      // 2. Cabin main walls
      const walls = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 1.6), woodWallMat);
      walls.position.y = 0.7;
      walls.castShadow = true;
      shelterGroup.add(walls);

      // 3. Gable pitched forest green tile roof (two matching slanted panels)
      const roofL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 1.9), mossRoofMat);
      roofL.position.set(-0.48, 1.45, 0);
      roofL.rotation.z = 0.45;
      roofL.castShadow = true;
      shelterGroup.add(roofL);

      const roofR = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 1.9), mossRoofMat);
      roofR.position.set(0.48, 1.45, 0);
      roofR.rotation.z = -0.45;
      roofR.castShadow = true;
      shelterGroup.add(roofR);

      // Triangular gable filling under roof
      const gableGeo = new THREE.ConeGeometry(0.7, 0.4, 4);
      gableGeo.rotateY(Math.PI / 4);
      gableGeo.rotateZ(Math.PI / 2);
      const gableL = new THREE.Mesh(gableGeo, woodWallMat);
      gableL.position.set(0, 1.25, 0.75);
      shelterGroup.add(gableL);

      const gableR = gableL.clone();
      gableR.position.z = -0.75;
      shelterGroup.add(gableR);

      // 4. Cozy Front Door
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.75, 0.08), darkWoodMat);
      door.position.set(0, 0.45, 0.81);
      shelterGroup.add(door);

      // Small door metal handle stud
      const handle = new THREE.Mesh(new THREE.SphereGeometry(0.025, 4, 4), getScifiMaterial(0xf59e0b, 0.1, 0.9));
      handle.position.set(0.12, 0.45, 0.86);
      shelterGroup.add(handle);

      // 5. Cozy glowing side window
      const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.42), darkWoodMat);
      windowFrame.position.set(0.81, 0.75, 0);
      shelterGroup.add(windowFrame);

      const windowGlow = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.34, 0.34), glassGlowMat);
      windowGlow.position.set(0.85, 0.75, 0);
      shelterGroup.add(windowGlow);

      // 6. Brick Chimney
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.4, 0.3), stoneMat);
      chimney.position.set(-0.55, 1.0, -0.45);
      chimney.castShadow = true;
      shelterGroup.add(chimney);

      const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.36), darkWoodMat);
      chimneyCap.position.set(-0.55, 1.7, -0.45);
      shelterGroup.add(chimneyCap);

      // Small security neon caution beacon atop the roof crest (modern collapse safety touch)
      const safetyBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), getScifiMaterial(0xef4444, 0.1, 0.9, 0xef4444, 1.8));
      safetyBeacon.position.set(0, 1.62, 0);
      shelterGroup.add(safetyBeacon);

      // 7. Mini camp wooden fence surrounding the cabin yard (Voxel style)
      const fenceMat = darkWoodMat;
      const fencePostGeo = new THREE.BoxGeometry(0.08, 0.5, 0.08);
      const fenceRailGeo = new THREE.BoxGeometry(0.05, 0.05, 1.2);

      // Spawn fence items on left/right edges
      for (const edgeX of [-0.95, 0.95]) {
        for (let zVal = -0.8; zVal <= 0.8; zVal += 0.8) {
          const post = new THREE.Mesh(fencePostGeo, fenceMat);
          post.position.set(edgeX, 0.3, zVal);
          shelterGroup.add(post);
        }
        const rail = new THREE.Mesh(fenceRailGeo, fenceMat);
        rail.position.set(edgeX, 0.42, 0);
        rail.rotation.y = Math.PI / 2;
        shelterGroup.add(rail);
      }

      // Small cozy cyber-campfire right besides it
      const fireGroup = new THREE.Group();
      fireGroup.position.set(1.0, 0, 1.1);
      shelterGroup.add(fireGroup);

      const woodGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 4);
      woodGeom.rotateZ(Math.PI / 4);
      const woodMat = getScifiMaterial(0x451a03, 0.9, 0.1);
      const stick1 = new THREE.Mesh(woodGeom, woodMat);
      stick1.rotation.y = 0.5;
      fireGroup.add(stick1);

      const stick2 = new THREE.Mesh(woodGeom, woodMat);
      stick2.rotation.y = -0.5;
      fireGroup.add(stick2);

      // Fire embers
      for (let j = 0; j < 3; j++) {
        const coalGeom = new THREE.SphereGeometry(0.12 - j * 0.03, 5, 5);
        const coalMat = getScifiMaterial(0xef4444, 0.2, 0.5, 0xf97316, 2.2);
        const coalMesh = new THREE.Mesh(coalGeom, coalMat);
        coalMesh.position.set(0, 0.1 + j * 0.08, 0);
        fireGroup.add(coalMesh);
        campfirePlumes.current.push(coalMesh);
      }
    }

    // Positions for 6 surrounding radial modules (Radius 2.4 from center)
    const getModuleCoords = (idx: number) => {
      const angle = (idx * Math.PI) / 3; // 60 degrees step
      const rad = 2.4;
      return { x: Math.cos(angle) * rad, z: Math.sin(angle) * rad, angle: angle };
    };

    // MODULE 2: KITCHEN (厨房) - Radial Pos 0
    if (isKITCHEN) {
      const { x, z, angle } = getModuleCoords(0);
      const group = new THREE.Group();
      group.position.set(x, 0.2, z);
      group.rotation.y = -angle + Math.PI / 2; // face center
      masterGroup.add(group);

      // Container style cabin
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.7, 0.7),
        getScifiMaterial(0xf97316, 0.5, 0.4) // orange kitchen container
      );
      block.position.y = 0.35;
      block.castShadow = true;
      group.add(block);

      // Chimney venting clean vapour
      const chimney = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6),
        getScifiMaterial(0x334155, 0.4, 0.8)
      );
      chimney.position.set(0.24, 0.75, -0.15);
      group.add(chimney);

      // Chimney exhaust hot glow ring
      const exhaustGlow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.05, 6),
        getScifiMaterial(0xef4444, 0.1, 0.9, 0xef4444, 2.0)
      );
      exhaustGlow.position.set(0.24, 1.15, -0.15);
      group.add(exhaustGlow);

      // A small dining bench
      const bench = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.2, 0.25),
        getScifiMaterial(0x475569, 0.7, 0.3)
      );
      bench.position.set(0, 0.1, 0.45);
      group.add(bench);
    }

    // MODULE 3: TOOLROOM (工具室) - Radial Pos 1
    if (isTOOLROOM) {
      const { x, z, angle } = getModuleCoords(1);
      const group = new THREE.Group();
      group.position.set(x, 0.2, z);
      group.rotation.y = -angle + Math.PI / 2;
      masterGroup.add(group);

      // Machine house block
      const house = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.8, 0.8),
        getScifiMaterial(0x0284c7, 0.4, 0.7) // Tech-blue workshop
      );
      house.position.y = 0.4;
      house.castShadow = true;
      group.add(house);

      // Mini mechanical crane crane support post
      const cranePost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 0.6, 6),
        getScifiMaterial(0xf59e0b, 0.4, 0.9)
      );
      cranePost.position.set(-0.25, 0.8, 0.1);
      group.add(cranePost);

      // Miniature jib beam arm extending out
      const craneArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.06, 0.08),
        getScifiMaterial(0x0f172a, 0.5, 0.5)
      );
      craneArm.position.set(-0.1, 1.1, 0.1);
      group.add(craneArm);

      // Welding laser active node (bright pink glow spark)
      const laserSpark = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 6),
        getScifiMaterial(0xec4899, 0.1, 0.9, 0xec4899, 2.5)
      );
      laserSpark.position.set(0.1, 1.05, 0.1);
      group.add(laserSpark);
    }

    // MODULE 4: POWER (储能发电站) - Radial Pos 2
    if (isPOWER) {
      const { x, z, angle } = getModuleCoords(2);
      const group = new THREE.Group();
      group.position.set(x, 0.2, z);
      group.rotation.y = -angle + Math.PI / 2;
      masterGroup.add(group);

      // Power substation core column
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.32, 1.0, 8),
        getScifiMaterial(0x1e293b, 0.3, 0.8)
      );
      pillar.position.y = 0.5;
      pillar.castShadow = true;
      group.add(pillar);

      // Floating cyan plasma reactor ball
      const plasmaCore = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 8, 8),
        getScifiMaterial(0x06b6d4, 0.1, 0.9, 0x06b6d4, 2.0)
      );
      plasmaCore.position.y = 1.25;
      group.add(plasmaCore);
      glowingCoreRef.current = plasmaCore;

      // Two mini angled photovoltaic collectors flanking sides
      const solarArray = new THREE.Group();
      solarArray.position.set(0, 0.6, 0);
      group.add(solarArray);
      solarWingsRef.current = solarArray;

      const wingGeometry = new THREE.BoxGeometry(0.6, 0.32, 0.04);
      const wingMaterial = getScifiMaterial(0x0f172a, 0.2, 0.9, 0x0284c7, 0.8);

      const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
      leftWing.position.set(-0.55, 0, 0);
      leftWing.rotation.z = 0.35;
      solarArray.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
      rightWing.position.set(0.55, 0, 0);
      rightWing.rotation.z = -0.35;
      solarArray.add(rightWing);
    }

    // MODULE 5: WATCHTOWER (瞭望塔) - Radial Pos 3
    if (isWATCHTOWER) {
      const { x, z, angle } = getModuleCoords(3);
      const group = new THREE.Group();
      group.position.set(x, 0.2, z);
      group.rotation.y = -angle + Math.PI / 2;
      masterGroup.add(group);

      // Steel legs tripod framework for altitude
      const legs = new THREE.Group();
      group.add(legs);

      for (let s = 0; s < 4; s++) {
        const radAngle = (s * Math.PI) / 2 + Math.PI / 4;
        const poleIdxShip = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 2.1, 6),
          getScifiMaterial(0x334155, 0.5, 0.8)
        );
        poleIdxShip.position.set(Math.cos(radAngle) * 0.3, 1.0, Math.sin(radAngle) * 0.3);
        poleIdxShip.rotation.z = -Math.cos(radAngle) * 0.22;
        poleIdxShip.rotation.x = Math.sin(radAngle) * 0.22;
        legs.add(poleIdxShip);
      }

      // Upper tiny watch box platform
      const platform = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.22, 6),
        getScifiMaterial(0x1e293b, 0.4, 0.8)
      );
      platform.position.y = 2.0;
      group.add(platform);

      // Rotating tactical radar dish pointing to deep skies
      const dish = new THREE.Mesh(
        new THREE.ConeGeometry(0.35, 0.12, 12, 1, true),
        getScifiMaterial(0x7c3aed, 0.3, 0.8, 0x8b5cf6, 1.0)
      );
      dish.rotateX(-Math.PI / 4);
      dish.position.set(0, 2.25, 0);
      group.add(dish);
      rotatingRadarRef.current = dish;
    }

    // MODULE 6: CLINIC (医疗帐篷) - Radial Pos 4
    if (isCLINIC) {
      const { x, z, angle } = getModuleCoords(4);
      const group = new THREE.Group();
      group.position.set(x, 0.2, z);
      group.rotation.y = -angle + Math.PI / 2;
      masterGroup.add(group);

      // Smooth horizontal capsule design
      const cabin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.38, 0.9, 8),
        getScifiMaterial(0xe2e8f0, 0.4, 0.6) // Sleek sterilization white/emerald
      );
      cabin.rotation.z = Math.PI / 2; // lie horizontally
      cabin.position.y = 0.38;
      cabin.castShadow = true;
      group.add(cabin);

      // Green Cross emblem on the front door panel
      const crossVert = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.3, 0.04),
        getScifiMaterial(0x10b981, 0.2, 0.2, 0x10b981, 1.5)
      );
      crossVert.position.set(0, 0.38, 0.395);
      group.add(crossVert);

      const crossHorz = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.12, 0.04),
        getScifiMaterial(0x10b981, 0.2, 0.2, 0x10b981, 1.5)
      );
      crossHorz.position.set(0, 0.38, 0.396);
      group.add(crossHorz);

      // Green flashing beacon sphere atop the dome roof
      const clinicLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 6, 6),
        getScifiMaterial(0x10b981, 0.1, 0.9, 0x10b981, 1.8)
      );
      clinicLight.position.set(0, 0.85, 0);
      group.add(clinicLight);
    }

    // MODULE 7: WAREHOUSE (废料仓库) - Radial Pos 5
    if (isWAREHOUSE) {
      const { x, z, angle } = getModuleCoords(5);
      const group = new THREE.Group();
      group.position.set(x, 0.2, z);
      group.rotation.y = -angle + Math.PI / 2;
      masterGroup.add(group);

      // Stack of boxes
      const boxContainer1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.4, 0.5),
        getScifiMaterial(0x0f172a, 0.6, 0.6) // charcoal matte metal box
      );
      boxContainer1.position.set(-0.2, 0.2, -0.1);
      boxContainer1.rotation.y = 0.15;
      boxContainer1.castShadow = true;
      group.add(boxContainer1);

      const boxContainer2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.35, 0.42),
        getScifiMaterial(0xd97706, 0.5, 0.5) // amber metal box stacked on the right
      );
      boxContainer2.position.set(0.24, 0.175, 0.1);
      boxContainer2.rotation.y = -0.3;
      boxContainer2.castShadow = true;
      group.add(boxContainer2);

      const boxContainer3 = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.3, 0.35),
        getScifiMaterial(0x475569, 0.5, 0.4) // blue-slate box layered vertically on top
      );
      boxContainer3.position.set(-0.15, 0.55, -0.05);
      boxContainer3.rotation.y = -0.1;
      boxContainer3.castShadow = true;
      group.add(boxContainer3);

      // Small security neon line
      const lineMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.04, 0.04),
        getScifiMaterial(0xef4444, 0.1, 0.9, 0xef4444, 1.2)
      );
      lineMesh.position.set(0, 0.05, 0.32);
      group.add(lineMesh);
    }

    // 5. ANIMATION LOOP
    const tick = () => {
      const elapsedTime = clock.current.getElapsedTime();

      // Slow passive clockwise glider rotation if not dragging
      if (masterGroup) {
        if (!isDragging.current) {
          rotationY.current += 0.0035;
        }
        masterGroup.rotation.y += (rotationY.current - masterGroup.rotation.y) * 0.12;
        masterGroup.rotation.x += (rotationX.current - masterGroup.rotation.x) * 0.12;
      }

      // Campfire flicker pulse
      campfirePlumes.current.forEach((mesh, index) => {
        const pulse = 1.0 + Math.sin(elapsedTime * (7.0 + index * 2.0)) * 0.15;
        mesh.scale.set(pulse, pulse * 1.2, pulse);
      });

      // Reactor core dynamic float pulse
      if (glowingCoreRef.current) {
        const corePulse = 1.0 + Math.sin(elapsedTime * 4.5) * 0.1;
        glowingCoreRef.current.scale.set(corePulse, corePulse, corePulse);
      }

      // Solar Wings gentle orbital hover
      if (solarWingsRef.current) {
        solarWingsRef.current.position.y = 0.6 + Math.sin(elapsedTime * 2.1) * 0.08;
      }

      // Radar dish rotation
      if (rotatingRadarRef.current) {
        rotatingRadarRef.current.rotation.y += 0.022;
      }

      // Sky stars rotation
      if (starField) {
        starField.rotation.y += 0.0003;
      }

      renderer.render(scene, camera);
      animationFrameId.current = requestAnimationFrame(tick);
    };

    tick();

    // 6. ADAPTIVE CONTAINER RESIZE
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      if (newWidth > 0 && newHeight > 0) {
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      }
    };

    let resizeObserver: ResizeObserver | null = null;
    try {
      if (typeof window !== 'undefined' && 'ResizeObserver' in window && typeof window.ResizeObserver === 'function') {
        resizeObserver = new window.ResizeObserver((entries) => {
          for (const entry of entries) {
            const { width: newWidth, height: newHeight } = entry.contentRect;
            if (newWidth > 0 && newHeight > 0 && renderer && camera) {
              camera.aspect = newWidth / newHeight;
              camera.updateProjectionMatrix();
              renderer.setSize(newWidth, newHeight);
            }
          }
        });
        if (containerRef.current) {
          resizeObserver.observe(containerRef.current);
        }
      } else {
        window.addEventListener('resize', handleResize);
        handleResize();
      }
    } catch (e) {
      console.warn('ResizeObserver disabled, utilizing event fallback', e);
      window.addEventListener('resize', handleResize);
      handleResize();
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', handleResize);
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      renderer.dispose();
      scene.clear();
    };
  }, [builtCamps]); // Rebuild 3D graphics dynamically as any modules are built!

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full relative cursor-grab active:cursor-grabbing select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      id="3d_camp_canvas_container"
      title="拖拽可全角度自由旋转观察3D生存营地效果"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Touch Interaction Helper badge */}
      {builtCamps.length > 0 ? (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 py-1 px-3.5 bg-slate-900/80 border border-slate-800 rounded-full text-[9px] text-emerald-400 font-mono tracking-wider backdrop-blur-sm pointer-events-none flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
          <span>DRAG TO ROTATE 3D / 已建造 {builtCamps.length} 个废土模块 (拖拽自由观察)</span>
        </div>
      ) : (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 py-1 px-3.5 bg-slate-950/90 border border-amber-500/20 rounded-full text-[9px] text-amber-500 font-mono tracking-wider backdrop-blur-sm pointer-events-none flex items-center gap-1.5 align-middle">
          <Home className="w-2.5 h-2.5 text-amber-500" />
          <span>废土专属营地空天旷地 / 暂无已搭建设施</span>
        </div>
      )}
    </div>
  );
}
