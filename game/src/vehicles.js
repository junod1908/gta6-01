// Cars: the box-built models, the arcade driving, the traffic that loops the
// blocks, and the police pursuit. A car is a state object plus a three.js group;
// the physics is deliberately simple (heading + speed + circle collisions) so it
// stays fun at 60 fps and readable in the dossier outline.
import * as THREE from 'three';
import { BLOCK, BLOCKS, CAR, CITY, COLORS, ROAD } from './config.js';
import { onRoad, pushOutBuildings } from './city.js';

const WHEEL_GEO = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10);
const WHEEL_MAT = new THREE.MeshLambertMaterial({ color: 0x14161a });

export function carMesh(color, police) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1a2a38 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, 4.4), paint);
  body.position.y = 0.55;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 2.2), glass);
  cabin.position.set(0, 1.1, -0.25);
  group.add(cabin);
  const wheels = [];
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wheel = new THREE.Mesh(WHEEL_GEO, WHEEL_MAT);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.42, z);
    group.add(wheel);
    wheels.push(wheel);
  }
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const x of [-0.7, 0.7]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.08), headMat);
    head.position.set(x, 0.62, 2.22);
    group.add(head);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const x of [-0.7, 0.7]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.08), tailMat);
    tail.position.set(x, 0.62, -2.22);
    group.add(tail);
  }
  let lightA = null;
  let lightB = null;
  if (police) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 0.5), new THREE.MeshLambertMaterial({ color: 0x22242a }));
    bar.position.set(0, 1.45, -0.25);
    group.add(bar);
    lightA = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.5), new THREE.MeshBasicMaterial({ color: COLORS.policeLightA }));
    lightA.position.set(-0.38, 1.5, -0.25);
    group.add(lightA);
    lightB = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 0.5), new THREE.MeshBasicMaterial({ color: COLORS.policeLightB }));
    lightB.position.set(0.38, 1.5, -0.25);
    group.add(lightB);
  }
  group.userData.wheels = wheels;
  group.userData.lightA = lightA;
  group.userData.lightB = lightB;
  return group;
}

export function makeVehicle(scene, x, z, heading, kind, color) {
  const police = kind === 'police';
  const mesh = carMesh(color ?? (police ? COLORS.policePaint : 0xd8d8d8), police);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  scene.add(mesh);
  return {
    kind, x, z, heading, speed: 0, mesh,
    // Traffic waypoint loop; police use it as a fallback.
    loop: null, loopIndex: 0,
    // The parked coupe a mission asks for.
    missionCar: false,
    dead: false,
  };
}

// A rectangular loop around one block, driven on the right-hand lane.
export function blockLoop(random) {
  const half = CITY / 2;
  const pitch = BLOCK + ROAD;
  const bx = random.int(0, BLOCKS - 1);
  const bz = random.int(0, BLOCKS - 1);
  const cx = -half + ROAD / 2 + BLOCK / 2 + bx * pitch;
  const cz = -half + ROAD / 2 + BLOCK / 2 + bz * pitch;
  const lane = ROAD / 2 - 2.2;
  const hw = BLOCK / 2 + lane;
  const dir = random.next() < 0.5 ? 1 : -1;
  const corners = [
    [cx - hw, cz - hw], [cx + hw, cz - hw], [cx + hw, cz + hw], [cx - hw, cz + hw],
  ];
  if (dir < 0) corners.reverse();
  return corners;
}

export function spawnTraffic(world, count) {
  for (let i = 0; i < count; i += 1) {
    const loop = blockLoop(world.random);
    const [x, z] = loop[0];
    const car = makeVehicle(world.scene, x, z, 0, 'traffic', world.random.pick(COLORS.paints));
    car.loop = loop;
    car.loopIndex = 1;
    car.speed = CAR.trafficSpeed * world.random.range(0.8, 1.15);
    world.cars.push(car);
  }
}

function steerToward(car, tx, tz, dt, maxTurn) {
  const want = Math.atan2(tx - car.x, tz - car.z);
  let diff = want - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const turn = Math.max(-maxTurn * dt, Math.min(maxTurn * dt, diff));
  car.heading += turn;
  return Math.abs(diff);
}

export function updateTraffic(world, dt) {
  for (const car of world.cars) {
    if (car.kind !== 'traffic' || car.dead) continue;
    const [tx, tz] = car.loop[car.loopIndex];
    const dx = tx - car.x;
    const dz = tz - car.z;
    if (dx * dx + dz * dz < 9) {
      car.loopIndex = (car.loopIndex + 1) % car.loop.length;
      continue;
    }
    steerToward(car, tx, tz, dt, 2.4);
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    [car.x, car.z] = pushOutBuildings(car.x, car.z, CAR.radius, world.colliders);
    syncMesh(car, dt);
  }
}

// The player's car: W/S accelerate and brake, A/D steer, Space handbrake.
export function updatePlayerCar(world, dt, input) {
  const car = world.player.car;
  if (!car) return;
  const forward = input.forward ? 1 : 0;
  const back = input.back ? 1 : 0;
  if (forward) car.speed += CAR.accel * dt;
  else if (back) car.speed -= (car.speed > 0.5 ? CAR.brake : CAR.reverseAccel) * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 8 * dt);
  if (input.handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 40 * dt);
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  car.heading += steer * CAR.steer * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 6 + 0.25);
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  const before = [car.x, car.z];
  [car.x, car.z] = pushOutBuildings(car.x, car.z, CAR.radius, world.colliders);
  if (before[0] !== car.x || before[1] !== car.z) car.speed *= 0.4;
  // Soft city bounds: the beach road is the edge of the world.
  car.x = Math.max(-CITY / 2 - 20, Math.min(CITY / 2 + 20, car.x));
  car.z = Math.max(-CITY / 2 - 20, Math.min(CITY / 2 + 60, car.z));
  syncMesh(car, dt);
  world.audio.engine(Math.abs(car.speed) / CAR.maxSpeed);
}

export function syncMesh(car, dt) {
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  const spin = (car.speed * dt) / 0.42;
  for (const wheel of car.mesh.userData.wheels) wheel.rotation.x += spin;
  if (car.kind === 'police') {
    const phase = Math.floor(performance.now() / 180) % 2 === 0;
    car.mesh.userData.lightA.material.color.setHex(phase ? COLORS.policeLightA : 0x551111);
    car.mesh.userData.lightB.material.color.setHex(phase ? 0x111155 : COLORS.policeLightB);
  }
}

// Circle push between cars so traffic and police do not pile through each other.
export function separateCars(world) {
  const list = world.cars;
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const a = list[i];
      const b = list[j];
      if (a.dead || b.dead) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d2 = dx * dx + dz * dz;
      const min = CAR.radius * 2;
      if (d2 < min * min && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const push = (min - d) / 2;
        const nx = dx / d;
        const nz = dz / d;
        a.x -= nx * push;
        a.z -= nz * push;
        b.x += nx * push;
        b.z += nz * push;
        if (a.kind === 'player' || b.kind === 'player') {
          const pc = a.kind === 'player' ? a : b;
          pc.speed *= 0.5;
        }
      }
    }
  }
}

// The nearest drivable car to (x, z) within range, for the E key.
export function nearestCar(world, x, z, range) {
  let best = null;
  let bestD = range * range;
  for (const car of world.cars) {
    if (car.dead) continue;
    const dx = car.x - x;
    const dz = car.z - z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestD) {
      bestD = d2;
      best = car;
    }
  }
  return best;
}

// True when the point is on a road — cars only spawn and drive there.
export function roadPoint(world) {
  for (let tries = 0; tries < 40; tries += 1) {
    const x = world.random.range(-CITY / 2, CITY / 2);
    const z = world.random.range(-CITY / 2, CITY / 2);
    if (onRoad(x, z)) return [x, z];
  }
  return [0, -CITY / 2 + ROAD / 2];
}
