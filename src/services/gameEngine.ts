// src/services/gameEngine.ts

export type AlienType = 'stinger' | 'scout' | 'dreadnought';

export interface AlienDrone {
  id: string;
  name: string;
  type: AlienType;
  distance: number;
  initialDistance: number;
  speed: number;
  maxHp: number;
  currentHp: number;
  destroyed: boolean;
  x: number; // 0.0 to 1.0 (screen width ratio)
  y: number; // 0.0 to 1.0 (screen height ratio)
  shieldEnergy: number;
}

export interface PlayerAircraft {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  bankAngle: number;
  shields: number;
}

export interface LaserBlast {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number; // 0 to 1
  targetName: string;
}

export interface ParticleExplosion {
  id: string;
  x: number;
  y: number;
  color: string;
  radius: number;
  particles: Array<{ vx: number; vy: number; x: number; y: number; life: number; color: string }>;
}

export interface GameTurnFrame {
  turn: number;
  aliens: AlienDrone[];
  playerJet: PlayerAircraft;
  targetedAlienName: string | null;
  laserBlast: LaserBlast | null;
  explosions: ParticleExplosion[];
  message: string;
  isWon: boolean;
  isLost: boolean;
  radarBlips: Array<{ x: number; y: number; dist: number; isTarget: boolean }>;
}

export interface GameScenario {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  difficulty: 'Cadet' | 'Veteran' | 'Ace';
  initialAliens: Array<{ name: string; type: AlienType; distance: number; speed: number; hp: number; x: number }>;
}

export const GAME_SCENARIOS: GameScenario[] = [
  {
    id: 'mission_1',
    title: 'Mission 1: Swarm Vanguard',
    subtitle: 'Cadet Onboarding · Dual Incursion',
    description: 'Two alien scout drones are diving straight towards your starfighter. Lock onto and vaporize the closest alien threat each turn!',
    difficulty: 'Cadet',
    initialAliens: [
      { name: 'Xeno_Stinger', type: 'stinger', distance: 55, speed: 12, hp: 100, x: 0.32 },
      { name: 'Viper_Drone',  type: 'scout',   distance: 32, speed: 12, hp: 100, x: 0.68 }
    ]
  },
  {
    id: 'mission_2',
    title: 'Mission 2: Inverted Vectors',
    subtitle: 'Dynamic Intercept · Rapid Approach',
    description: 'The alien swarm has shifted vectors. Calculate dynamic proximity and shoot down the nearest target before your cockpit is breached!',
    difficulty: 'Cadet',
    initialAliens: [
      { name: 'Gorgon_Alpha', type: 'scout',   distance: 28, speed: 14, hp: 100, x: 0.22 },
      { name: 'Hydra_Beta',   type: 'stinger', distance: 75, speed: 14, hp: 100, x: 0.78 }
    ]
  },
  {
    id: 'mission_3',
    title: 'Mission 3: Dreadnought Fleet Ambush',
    subtitle: 'Triple Threat · Swarm Assault',
    description: 'Three heavy alien fighters are descending in tight formation. Prioritize targets by distance with ruthless efficiency!',
    difficulty: 'Veteran',
    initialAliens: [
      { name: 'Shadow_1',     type: 'stinger',     distance: 85, speed: 15, hp: 100, x: 0.2 },
      { name: 'Dread_Queen',  type: 'dreadnought', distance: 42, speed: 15, hp: 100, x: 0.5 },
      { name: 'Wraith_3',     type: 'scout',       distance: 68, speed: 15, hp: 100, x: 0.8 }
    ]
  }
];

export const STARTER_CODE_TEMPLATES: Record<string, string> = {
  python: `# 🚀 Space Aircraft Interceptor AI
# Main combat loop runs each turn
while True:
    enemy_1 = input()        # Name of Alien 1
    dist_1 = int(input())    # Distance to Alien 1 (meters)
    enemy_2 = input()        # Name of Alien 2
    dist_2 = int(input())    # Distance to Alien 2 (meters)

    # 🎯 TARGETING LOGIC:
    # Print the name of the closest alien drone to lock on and fire!
    if dist_1 < dist_2:
        print(enemy_1)
    else:
        print(enemy_2)
`,
  cpp: `// 🚀 Space Aircraft Interceptor AI (C++)
#include <iostream>
#include <string>
using namespace std;

int main() {
    // Combat loop
    while (1) {
        string enemy_1, enemy_2;
        int dist_1, dist_2;
        cin >> enemy_1 >> dist_1;
        cin >> enemy_2 >> dist_2;

        // Target and fire at the closest alien drone!
        if (dist_1 < dist_2) {
            cout << enemy_1 << endl;
        } else {
            cout << enemy_2 << endl;
        }
    }
    return 0;
}
`,
  c: `/* 🚀 Space Aircraft Interceptor AI (C) */
#include <stdio.h>
#include <string.h>

int main() {
    while (1) {
        char enemy_1[50], enemy_2[50];
        int dist_1, dist_2;
        scanf("%s %d", enemy_1, &dist_1);
        scanf("%s %d", enemy_2, &dist_2);

        if (dist_1 < dist_2) {
            printf("%s\\n", enemy_1);
        } else {
            printf("%s\\n", enemy_2);
        }
    }
    return 0;
}
`,
  java: `// 🚀 Space Aircraft Interceptor AI (Java)
import java.util.*;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        while (true) {
            String enemy1 = sc.next();
            int dist1 = sc.nextInt();
            String enemy2 = sc.next();
            int dist2 = sc.nextInt();

            // Shoot closest alien drone
            if (dist1 < dist2) {
                System.out.println(enemy1);
            } else {
                System.out.println(enemy2);
            }
        }
    }
}
`,
  javascript: `// 🚀 Space Aircraft Interceptor AI (JavaScript)
while (true) {
    const enemy1 = readline();
    const dist1 = parseInt(readline());
    const enemy2 = readline();
    const dist2 = parseInt(readline());

    // Print closest alien name
    if (dist1 < dist2) {
        console.log(enemy1);
    } else {
        console.log(enemy2);
    }
}
`
};

/**
 * Runs turn-by-turn combat simulation between player's aircraft and the alien swarm
 */
export function simulateGameScenario(
  scenario: GameScenario,
  userCode: string,
  _language: string
): { frames: GameTurnFrame[]; success: boolean; log: string } {
  const frames: GameTurnFrame[] = [];
  let log = `=== ⚡ BATTLE COMMENCED: ${scenario.title} ===\n`;

  let currentAliens: AlienDrone[] = scenario.initialAliens.map((a, idx) => ({
    id: `alien_${idx}`,
    name: a.name,
    type: a.type,
    distance: a.distance,
    initialDistance: a.distance,
    speed: a.speed,
    maxHp: a.hp,
    currentHp: a.hp,
    destroyed: false,
    x: a.x,
    y: 0.12 + (1 - a.distance / 100) * 0.58,
    shieldEnergy: 100
  }));

  const maxTurns = 12;
  let turn = 1;
  let isWon = false;
  let isLost = false;

  let playerJet: PlayerAircraft = {
    x: 0.5,
    y: 0.86,
    targetX: 0.5,
    targetY: 0.86,
    bankAngle: 0,
    shields: 100
  };

  // Evaluate participant code logic
  const isCorrectLogic = userCode.includes('dist_1 < dist_2') || 
                         userCode.includes('dist1 < dist2') || 
                         userCode.includes('dist_1 <= dist_2') ||
                         userCode.includes('dist1 <= dist2') ||
                         userCode.includes('min(') ||
                         userCode.includes('sort(') ||
                         userCode.includes('if');

  while (turn <= maxTurns && !isWon && !isLost) {
    const activeAliens = currentAliens.filter(a => !a.destroyed);

    if (activeAliens.length === 0) {
      isWon = true;
      break;
    }

    // Determine targeted alien
    let chosenTargetName: string | null = null;
    let chosenAlien: AlienDrone | null = null;

    if (activeAliens.length === 1) {
      chosenTargetName = activeAliens[0].name;
      chosenAlien = activeAliens[0];
    } else if (isCorrectLogic) {
      const closest = [...activeAliens].sort((a, b) => a.distance - b.distance)[0];
      chosenTargetName = closest ? closest.name : null;
      chosenAlien = closest || null;
    } else {
      chosenTargetName = activeAliens[0].name;
      chosenAlien = activeAliens[0];
    }

    log += `[Turn ${turn}] Radar locked: ${activeAliens.map(a => `${a.name} [${a.distance}m]`).join(' | ')}\n`;
    log += `[Turn ${turn}] 🚀 Interceptor Weapon Fired -> 🎯 ${chosenTargetName}\n`;

    // Move player aircraft towards the target x-position with banking
    if (chosenAlien) {
      playerJet = {
        ...playerJet,
        targetX: chosenAlien.x,
        bankAngle: (chosenAlien.x - playerJet.x) * 0.8
      };
    }

    const explosions: ParticleExplosion[] = [];
    let laserBlast: LaserBlast | null = null;

    // Apply plasma cannon hit
    currentAliens = currentAliens.map(alien => {
      if (alien.name === chosenTargetName && !alien.destroyed) {
        laserBlast = {
          id: `laser_${turn}`,
          startX: playerJet.targetX,
          startY: playerJet.y - 0.04,
          targetX: alien.x,
          targetY: alien.y,
          progress: 1.0,
          targetName: alien.name
        };

        const newHp = alien.currentHp - 100;
        if (newHp <= 0) {
          // Generate particle explosion
          const particles = Array.from({ length: 24 }).map((_, i) => {
            const angle = (i / 24) * Math.PI * 2;
            const spd = 2 + Math.random() * 4;
            return {
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              x: 0,
              y: 0,
              life: 1.0,
              color: i % 2 === 0 ? '#38bdf8' : '#a855f7'
            };
          });

          explosions.push({
            id: `exp_${turn}_${alien.id}`,
            x: alien.x,
            y: alien.y,
            color: '#38bdf8',
            radius: 45,
            particles
          });

          log += `💥 [Turn ${turn}] ALIEN VAPORIZED: ${alien.name} destroyed by twin plasma blast!\n`;
          return { ...alien, currentHp: 0, destroyed: true };
        }
        return { ...alien, currentHp: newHp };
      }
      return alien;
    });

    // Advance surviving alien drones
    currentAliens = currentAliens.map(alien => {
      if (!alien.destroyed) {
        const newDist = Math.max(0, alien.distance - alien.speed);
        const newY = 0.12 + (1 - newDist / 100) * 0.68;
        if (newDist <= 0) {
          isLost = true;
          playerJet.shields = 0;
          log += `🚨 [Turn ${turn}] CRITICAL HULL COLLISION: ${alien.name} rammed into Starfighter! Aircraft Destroyed.\n`;
        }
        return { ...alien, distance: newDist, y: newY };
      }
      return alien;
    });

    const remaining = currentAliens.filter(a => !a.destroyed);
    if (remaining.length === 0) {
      isWon = true;
      log += `🏆 [Turn ${turn}] SECTOR SECURED! All alien drones obliterated.\n`;
    }

    const radarBlips = currentAliens.filter(a => !a.destroyed).map(a => ({
      x: a.x,
      y: a.y,
      dist: a.distance,
      isTarget: a.name === chosenTargetName
    }));

    frames.push({
      turn,
      aliens: JSON.parse(JSON.stringify(currentAliens)),
      playerJet: { ...playerJet, x: playerJet.targetX },
      targetedAlienName: chosenTargetName,
      laserBlast,
      explosions,
      message: isWon ? 'SECTOR SECURED · ALL ALIEN SWARMS OBLITERATED' : isLost ? 'HULL BREACH · INTERCEPTOR DESTROYED' : `Turn ${turn}: Plasma Torpedo -> ${chosenTargetName}`,
      isWon,
      isLost,
      radarBlips
    });

    turn++;
  }

  return {
    frames,
    success: isWon,
    log
  };
}
