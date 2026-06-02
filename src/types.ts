/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameStatus = 'START' | 'RUNNING' | 'CAMP_INTERMISSION' | 'GAME_OVER' | 'VICTORY';

export type LanePosition = 'LEFT' | 'CENTER' | 'RIGHT';

export type CharacterId = 'MALE_PILOT' | 'FEMALE_PILOT' | 'SPACE_CAT' | 'SPACE_DOG';

export interface Character {
  id: CharacterId;
  name: string;
  avatar: string; // Emoji representing the character
  description: string;
  themeColor: string; // Theme color for ship rendering elements
  secondaryColor: string;
}


export interface Player {
  x: number; // 0 to 100 representing position percentage on road
  targetX: number; // For smooth sliding interpolation
  y: number; // Fixed at bottom
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  materialsCollected: {
    wood: number;
    metal: number;
    solar: number;
  };
}

export type ObstacleType = 'PLASTIC' | 'TOXIC_BARREL' | 'SPIKES' | 'E_WASTE';

export interface Obstacle {
  id: string;
  x: number; // 0 to 100 percentage
  y: number; // distance in pixels from top
  speed: number;
  width: number;
  height: number;
  type: ObstacleType;
  damage: number;
  lane: LanePosition;
  passed: boolean;
}

export type MaterialType = 'WOOD' | 'METAL' | 'SOLAR';

export interface MaterialItem {
  id: string;
  x: number; // 0 to 100
  y: number;
  speed: number;
  width: number;
  height: number;
  type: MaterialType;
  lane: LanePosition;
  collected: boolean;
}

export interface Camp {
  id: string;
  y: number; // drops down similar to obstacles
  speed: number;
  height: number;
  appeared: boolean;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}

export interface GameStats {
  score: number; // Distance in meters
  highScore: number;
  requiredMaterials: number; // total needed to win (e.g. 15)
}
