// The story: Rico Vega, a driver for hire in Solmar Bay, works four jobs for
// Mara Solis. Each mission is a chain of objectives; an objective is a place to
// reach (sometimes in a car, sometimes on foot) with a beacon the player can see
// from across the city. Finishing all four ends the story and opens free roam.
import * as THREE from 'three';
import { MISSIONS } from './config.js';

function beaconMesh() {
  const group = new THREE.Group();
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.4, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffd23e, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  column.position.y = 30;
  group.add(column);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.18, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.3;
  group.add(ring);
  return group;
}

// The objective chains. Each step names a landmark (or a car) and what reaching
// it means; the last step of a mission pays the reward.
export function missionSteps(world) {
  const L = world.landmarks;
  return [
    [
      { kind: 'goto', at: L.pickup, text: 'Pick up the client at the marina district' },
      { kind: 'goto', at: L.hotel, text: 'Drop the client at the Solmar Hotel' },
    ],
    [
      { kind: 'steal', at: L.marina, text: 'Take the mint coupe parked by the marina' },
      { kind: 'deliver', at: L.garage, text: 'Deliver the coupe to the garage — in the car' },
    ],
    [
      { kind: 'evade', text: 'Lose the heat — stay clean until the stars fade' },
      { kind: 'goto', at: L.safehouse, text: 'Reach the safehouse on the north side' },
    ],
    [
      { kind: 'goto', at: L.harbor, text: 'Deliver the package to the harbor freighter' },
    ],
  ];
}

export function createMissions(world) {
  const steps = missionSteps(world);
  const beacon = beaconMesh();
  beacon.visible = false;
  world.scene.add(beacon);
  const state = {
    index: 0, // Which mission is active; MISSIONS.length means the story is done.
    step: 0,
    beacon,
    // The coupe the second mission steals; parked by the marina from the start.
    coupe: null,
    startTime: 0,
    done: false,
    get current() {
      return this.index < MISSIONS.length ? MISSIONS[this.index] : null;
    },
    get stepDef() {
      if (this.index >= steps.length) return null;
      return steps[this.index][this.step] ?? null;
    },
    get objectiveText() {
      if (this.done) return 'Story complete — Solmar Bay is yours. Free roam.';
      const def = this.stepDef;
      if (!def) return '';
      return `${this.current.name}: ${def.text}`;
    },
    targetPos() {
      const def = this.stepDef;
      if (!def || !def.at) return null;
      return def.at;
    },
    // Called when the player reaches the current objective.
    advance(world) {
      const def = this.stepDef;
      if (!def) return;
      this.step += 1;
      if (this.step >= steps[this.index].length) {
        const reward = this.current.reward;
        world.player.cash += reward;
        world.hud.banner(`Job done: ${this.current.name}  +$${reward}`);
        world.audio.jingle();
        this.index += 1;
        this.step = 0;
        if (this.index >= MISSIONS.length) {
          this.done = true;
          world.hud.banner('Story complete — Rico Vega owns Solmar Bay.');
        }
      } else {
        world.audio.blip();
      }
      this.placeBeacon(world);
    },
    placeBeacon(world) {
      const def = this.stepDef;
      if (!def || !def.at) {
        this.beacon.visible = false;
        return;
      }
      this.beacon.position.set(def.at.x, 0, def.at.z);
      this.beacon.visible = true;
    },
    // The second mission starts with two stars the moment the coupe is taken.
    startHeat(world) {
      world.wanted.addHeat(2);
    },
  };
  return state;
}

// Step the active mission: check arrivals, the evade step, and the steal step.
export function updateMissions(world, dt) {
  const m = world.missions;
  if (m.done) return;
  const def = m.stepDef;
  if (!def) return;
  const p = world.player;
  const px = p.car ? p.car.x : p.x;
  const pz = p.car ? p.car.z : p.z;
  if (def.kind === 'goto' || def.kind === 'deliver') {
    const dx = def.at.x - px;
    const dz = def.at.z - pz;
    if (dx * dx + dz * dz < 49) {
      if (def.kind === 'deliver' && !p.car) return; // Must arrive in the car.
      m.advance(world);
    }
  } else if (def.kind === 'steal') {
    const coupe = m.coupe;
    // Already sitting in the coupe (took it early): the job is the taking.
    if (p.car === coupe) {
      m.startHeat(world);
      world.hud.banner('Stolen! The bay PD is on you — get to the garage.');
      m.advance(world);
      return;
    }
    if (coupe && !p.car) {
      const dx = coupe.x - px;
      const dz = coupe.z - pz;
      if (dx * dx + dz * dz < 16) {
        p.car = coupe;
        coupe.kind = 'player';
        m.startHeat(world);
        world.hud.banner('Stolen! The bay PD is on you — get to the garage.');
        m.advance(world);
      }
    }
  } else if (def.kind === 'evade') {
    if (world.wanted.stars === 0) m.advance(world);
  }
  // The beacon pulses so the player can find it from a distance.
  if (m.beacon.visible) {
    const s = 1 + Math.sin(performance.now() / 300) * 0.12;
    m.beacon.scale.set(s, 1, s);
  }
}
