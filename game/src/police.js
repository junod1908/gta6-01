// The wanted system: heat rises with every crime, fades when the player stays
// clean, and the Bay PD answers with cars and officers in proportion to the stars.
// Police cars ram the player; the heat only clears when the player is out of sight.
import { CAR, CITY, WANTED } from './config.js';
import { makeVehicle, roadPoint } from './vehicles.js';
import { makePerson } from './people.js';

export function createWanted(world) {
  return {
    stars: 0,
    // Seconds since the last crime; the decay clock.
    cleanFor: 0,
    addHeat(n) {
      this.stars = Math.min(WANTED.maxStars, this.stars + n);
      this.cleanFor = 0;
      world.events.wantedChanged = true;
    },
    step(dt) {
      if (this.stars === 0) return;
      this.cleanFor += dt;
      if (this.cleanFor >= WANTED.decaySeconds) {
        this.stars -= 1;
        this.cleanFor = 0;
        world.events.wantedChanged = true;
      }
    },
  };
}

// Spawn and retire police so the street always holds what the stars demand.
export function balancePolice(world) {
  const wantCars = WANTED.policeCars[world.wanted.stars];
  const wantFoot = WANTED.policeFoot[world.wanted.stars];
  const cars = world.cars.filter((c) => c.kind === 'police' && !c.dead).length;
  const foot = world.cops.filter((c) => !c.dead).length;
  for (let i = cars; i < wantCars; i += 1) {
    const [x, z] = roadPoint(world);
    const car = makeVehicle(world.scene, x, z, 0, 'police', 0x1c2f57);
    car.speed = CAR.policeSpeed;
    world.cars.push(car);
  }
  for (let i = foot; i < wantFoot; i += 1) {
    const angle = world.random.next() * Math.PI * 2;
    const cop = makePerson(
      world.scene,
      world.player.x + Math.sin(angle) * 24,
      world.player.z + Math.cos(angle) * 24,
      'cop', 0x1c2f57, 0x1c2f57,
    );
    world.cops.push(cop);
  }
  // Heat gone: the cruisers peel off and drive away.
  if (world.wanted.stars === 0) {
    for (const car of world.cars) {
      if (car.kind === 'police' && !car.dead) {
        car.dead = true;
        car.mesh.visible = false;
      }
    }
    for (const cop of world.cops) {
      if (!cop.dead) {
        cop.dead = true;
        cop.mesh.visible = false;
      }
    }
    world.cars = world.cars.filter((c) => c.kind !== 'police' || !c.dead);
    world.cops = world.cops.filter((c) => !c.dead);
  }
}

// A cruiser steers at the player and rams; a glancing hit slows it, a hard hit
// shoves the player's car and costs the player health.
export function updatePoliceCars(world, dt) {
  const p = world.player;
  const px = p.car ? p.car.x : p.x;
  const pz = p.car ? p.car.z : p.z;
  for (const car of world.cars) {
    if (car.kind !== 'police' || car.dead) continue;
    const dx = px - car.x;
    const dz = pz - car.z;
    const d = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz);
    let diff = want - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += Math.max(-3.2 * dt, Math.min(3.2 * dt, diff));
    car.speed = d > 60 ? CAR.policeSpeed : CAR.policeSpeed * 0.85;
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    // Ram: within a car length, shove the player and hurt him.
    if (d < 4.5) {
      if (p.car) {
        p.car.speed *= 0.55;
        p.car.x += (dx / d) * 2 * dt * 60 * 0.016;
        p.car.z += (dz / d) * 2 * dt * 60 * 0.016;
        p.health -= 6 * dt;
      } else {
        p.health -= 18 * dt;
      }
      world.audio.thud();
      if (p.health <= 0) world.events.busted = true;
    }
    // A cruiser that fell far behind respawns nearer, so the chase never dies.
    if (d > 220) {
      const [nx, nz] = roadPoint(world);
      car.x = nx;
      car.z = nz;
    }
    car.x = Math.max(-CITY / 2 - 20, Math.min(CITY / 2 + 20, car.x));
    car.z = Math.max(-CITY / 2 - 20, Math.min(CITY / 2 + 60, car.z));
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
    const spin = (car.speed * dt) / 0.42;
    for (const wheel of car.mesh.userData.wheels) wheel.rotation.x += spin;
    const phase = Math.floor(performance.now() / 180) % 2 === 0;
    car.mesh.userData.lightA.material.color.setHex(phase ? 0xff2a2a : 0x551111);
    car.mesh.userData.lightB.material.color.setHex(phase ? 0x111155 : 0x2a6bff);
  }
}
