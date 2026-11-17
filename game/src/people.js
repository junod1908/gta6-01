// People: Rico on foot, the pedestrians who stroll the sidewalks and flee from
// gunfire, and the on-foot officers who chase a wanted man. A person is a small
// capsule mesh with a heading, a speed and a job; the world steps them all.
import * as THREE from 'three';
import { BLOCK, BLOCKS, CITY, PLAYER, ROAD } from './config.js';
import { onRoad, pushOutBuildings } from './city.js';

const SHIRT_COLORS = [0xe86a5a, 0x5a8ae8, 0x7ac25a, 0xe8c95a, 0xc25ae8, 0x5ad8d0, 0xf0f0f0, 0x333a44];
const PANTS_COLORS = [0x2a3242, 0x4a3a2a, 0x3a4a5a, 0x222222, 0x5a5a5a];

export function personMesh(shirt, pants, police) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.38, 0.9, 8),
    new THREE.MeshLambertMaterial({ color: shirt }),
  );
  body.position.y = 0.95;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xd8a077 }),
  );
  head.position.y = 1.62;
  group.add(head);
  if (police) {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.27, 0.28, 0.1, 10),
      new THREE.MeshLambertMaterial({ color: 0x1c2f57 }),
    );
    cap.position.y = 1.82;
    group.add(cap);
  } else {
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.27, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: 0x2a2018 }),
    );
    hair.position.y = 1.66;
    group.add(hair);
  }
  for (const x of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.55, 0.2),
      new THREE.MeshLambertMaterial({ color: pants }),
    );
    leg.position.set(x, 0.28, 0);
    group.add(leg);
  }
  return group;
}

export function makePerson(scene, x, z, kind, shirt, pants) {
  const police = kind === 'cop';
  const mesh = personMesh(shirt ?? 0xe86a5a, pants ?? 0x2a3242, police);
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  return {
    kind, x, z, heading: 0, speed: 0, mesh,
    health: kind === 'cop' ? 100 : 50,
    // Pedestrian wander target.
    target: null,
    // Fleeing pedestrians run from this point.
    fleeFrom: null,
    dead: false,
    walkPhase: Math.random() * Math.PI * 2,
  };
}

export function spawnPedestrians(world, count) {
  for (let i = 0; i < count; i += 1) {
    const x = world.random.range(-CITY / 2, CITY / 2);
    const z = world.random.range(-CITY / 2, CITY / 2);
    const ped = makePerson(
      world.scene, x, z, 'ped',
      world.random.pick(SHIRT_COLORS), world.random.pick(PANTS_COLORS),
    );
    ped.target = [x, z];
    world.peds.push(ped);
  }
}

// The player on foot: WASD moves relative to the camera yaw, Shift runs, Space
// jumps, and the body leans into the run. Returns nothing; mutates world.player.
export function updatePlayerOnFoot(world, dt, input, camYaw) {
  const p = world.player;
  const fx = Math.sin(camYaw);
  const fz = Math.cos(camYaw);
  const rx = Math.cos(camYaw);
  const rz = -Math.sin(camYaw);
  let mx = 0;
  let mz = 0;
  if (input.forward) { mx += fx; mz += fz; }
  if (input.back) { mx -= fx; mz -= fz; }
  if (input.right) { mx += rx; mz += rz; }
  if (input.left) { mx -= rx; mz -= rz; }
  const len = Math.hypot(mx, mz);
  const speed = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  if (len > 0.01) {
    mx /= len;
    mz /= len;
    p.x += mx * speed * dt;
    p.z += mz * speed * dt;
    const want = Math.atan2(mx, mz);
    let diff = want - p.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    p.heading += Math.max(-10 * dt, Math.min(10 * dt, diff));
    p.moving = true;
  } else {
    p.moving = false;
  }
  // Jump and gravity, kept deliberately plain.
  if (input.jump && p.y === 0) p.vy = PLAYER.jumpSpeed;
  p.vy -= 22 * dt;
  p.y = Math.max(0, p.y + p.vy * dt);
  if (p.y === 0) p.vy = 0;
  [p.x, p.z] = pushOutBuildings(p.x, p.z, PLAYER.radius, world.colliders);
  p.x = Math.max(-CITY / 2 - 20, Math.min(CITY / 2 + 20, p.x));
  p.z = Math.max(-CITY / 2 - 20, Math.min(CITY / 2 + 70, p.z));
  p.mesh.position.set(p.x, p.y, p.z);
  p.mesh.rotation.y = p.heading;
  const bob = p.moving ? Math.sin(performance.now() / 90) * 0.08 : 0;
  p.mesh.position.y = p.y + Math.abs(bob);
}

export function updatePedestrians(world, dt) {
  const px = world.player.x;
  const pz = world.player.z;
  for (const ped of world.peds) {
    if (ped.dead) continue;
    let speed = 1.6;
    let tx = ped.target[0];
    let tz = ped.target[1];
    const dxp = px - ped.x;
    const dzp = pz - ped.z;
    const dPlayer = Math.hypot(dxp, dzp);
    // A gunshot or a near miss sends the crowd running.
    if (world.alarm > 0 && dPlayer < 26) {
      const away = Math.atan2(ped.x - px, ped.z - pz);
      tx = ped.x + Math.sin(away) * 20;
      tz = ped.z + Math.cos(away) * 20;
      speed = 5.5;
    } else if (Math.hypot(tx - ped.x, tz - ped.z) < 2) {
      // Pick a new stroll target on a nearby sidewalk.
      const nx = ped.x + world.random.range(-40, 40);
      const nz = ped.z + world.random.range(-40, 40);
      ped.target = [
        Math.max(-CITY / 2, Math.min(CITY / 2, nx)),
        Math.max(-CITY / 2, Math.min(CITY / 2, nz)),
      ];
      tx = ped.target[0];
      tz = ped.target[1];
    }
    const dx = tx - ped.x;
    const dz = tz - ped.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.1) {
      ped.heading = Math.atan2(dx, dz);
      ped.x += (dx / d) * speed * dt;
      ped.z += (dz / d) * speed * dt;
      [ped.x, ped.z] = pushOutBuildings(ped.x, ped.z, 0.5, world.colliders);
      ped.mesh.position.set(ped.x, 0, ped.z);
      ped.mesh.rotation.y = ped.heading;
      ped.walkPhase += dt * speed * 3;
      ped.mesh.position.y = Math.abs(Math.sin(ped.walkPhase)) * 0.05;
    }
  }
}

// On-foot officers run the player down and shove him; close enough, they bust him.
export function updateCops(world, dt) {
  const p = world.player;
  for (const cop of world.cops) {
    if (cop.dead) continue;
    const dx = p.x - cop.x;
    const dz = p.z - cop.z;
    const d = Math.hypot(dx, dz);
    if (d < 1.2 && !p.car) {
      p.health -= 30 * dt;
      world.hud.flash('busted');
      if (p.health <= 0) world.events.busted = true;
      continue;
    }
    if (d > 0.1) {
      const speed = 6.5;
      cop.heading = Math.atan2(dx, dz);
      cop.x += (dx / d) * speed * dt;
      cop.z += (dz / d) * speed * dt;
      [cop.x, cop.z] = pushOutBuildings(cop.x, cop.z, 0.5, world.colliders);
      cop.mesh.position.set(cop.x, 0, cop.z);
      cop.mesh.rotation.y = cop.heading;
      cop.walkPhase += dt * speed * 3;
      cop.mesh.position.y = Math.abs(Math.sin(cop.walkPhase)) * 0.05;
    }
  }
}

// A punch or a bullet at (x, z): the nearest person inside range takes the hit.
export function hitPersonAt(world, x, z, range, damage, isShot) {
  const targets = [...world.peds, ...world.cops];
  let best = null;
  let bestD = range * range;
  for (const t of targets) {
    if (t.dead) continue;
    const dx = t.x - x;
    const dz = t.z - z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestD) {
      bestD = d2;
      best = t;
    }
  }
  if (!best) return null;
  best.health -= damage;
  if (isShot) world.alarm = 2;
  if (best.health <= 0) {
    best.dead = true;
    best.mesh.visible = false;
    if (best.kind === 'cop') world.wanted.addHeat(2);
    else world.wanted.addHeat(1);
    return best;
  }
  // The survivor runs from the player.
  best.fleeFrom = [x, z];
  best.target = [best.x + (best.x - x) * 4, best.z + (best.z - z) * 4];
  return best;
}
