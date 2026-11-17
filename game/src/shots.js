// The screenshot scenes behind ?shot=chase|street|drive|mission. Each one sets
// the real world to a staged state — a chase, a busy street, a beach drive, a
// mission under fire — then plays it forward a fixed number of steps with a
// scripted driver, so the frame is what the game really looks like and the same
// seed always gives the same frame.
import { CITY, ROAD, STEP } from './config.js';
import { makeVehicle } from './vehicles.js';
import { makePerson } from './people.js';

const SAMPLE_STEPS = 60;

function scriptedDrive(world, steps, steer) {
  const input = { forward: true, back: false, left: false, right: false, handbrake: false };
  for (let i = 0; i < steps; i += 1) {
    if (steer) {
      input.left = steer < 0;
      input.right = steer > 0;
    }
    world.stepWorld(STEP, input);
  }
}

function scriptedWalk(world, steps) {
  const input = { forward: true, back: false, left: false, right: false, run: false, jump: false };
  for (let i = 0; i < steps; i += 1) world.stepWorld(STEP, input);
}

// Put the player in a car on the beachfront avenue (the southernmost road,
// z = CITY/2 - ROAD/2). Heading east along the sea by default; westbound shows
// the skyline ahead on the right and the sea on the left.
function placeOnBeachRoad(world, heading) {
  const z = CITY / 2 - ROAD / 2;
  const x = heading < 0 ? 120 : 40;
  const car = makeVehicle(world.scene, x, z, heading, 'player', 0xc23b2e);
  car.speed = 30;
  world.cars.push(car);
  world.player.car = car;
  world.player.x = car.x;
  world.player.z = car.z;
  return car;
}

// Chasers in frame: one pulling alongside, one coming head-on down the avenue.
function addChasers(world) {
  const car = world.player.car;
  const side = makeVehicle(world.scene, car.x + 10, car.z - 5, car.heading, 'police', 0x1c2f57);
  side.speed = 38;
  world.cars.push(side);
  const headOn = makeVehicle(world.scene, car.x + 42, car.z + 4, car.heading + Math.PI, 'police', 0x1c2f57);
  headOn.speed = 30;
  world.cars.push(headOn);
  const behind = makeVehicle(world.scene, car.x - 30, car.z + 3, car.heading, 'police', 0x1c2f57);
  behind.speed = 40;
  world.cars.push(behind);
}

export function stageShot(name, world) {
  world.resetWorld();
  world.shotCam = null;
  if (name === 'chase') {
    // The cover: a three-star chase on the beach road, the harbor job on the HUD,
    // cruisers visible alongside and head-on, camera high and wide.
    world.missions.index = 3;
    world.missions.step = 0;
    world.missions.placeBeacon(world);
    world.wanted.stars = 3;
    world.shotCam = { pitch: 0.42, dist: 15 };
    placeOnBeachRoad(world, Math.PI / 2);
    addChasers(world);
    scriptedDrive(world, 40, 0);
    return;
  }
  if (name === 'drive') {
    // Westbound cruise down the beachfront: skyline on the right, sea on the left.
    world.missions.index = 0;
    world.missions.step = 0;
    world.missions.placeBeacon(world);
    placeOnBeachRoad(world, -Math.PI / 2);
    scriptedDrive(world, SAMPLE_STEPS * 2, 0);
    return;
  }
  if (name === 'mission') {
    // On foot at the harbor beacon, facing the sea, with officers closing in
    // from both sides. The world steps with no input so the cops advance.
    world.missions.index = 3;
    world.missions.step = 0;
    world.missions.placeBeacon(world);
    world.wanted.stars = 2;
    const L = world.landmarks.harbor;
    world.player.x = L.x;
    world.player.z = L.z - 10;
    world.player.heading = 0;
    const idle = { forward: false, back: false, left: false, right: false, run: false, jump: false };
    for (const [ox, oz] of [[-11, -2], [12, -4]]) {
      const cop = makePerson(world.scene, L.x + ox, L.z + oz, 'cop', 0x1c2f57, 0x1c2f57);
      world.cops.push(cop);
    }
    for (let i = 0; i < 45; i += 1) world.stepWorld(STEP, idle);
    return;
  }
  // Default: street — Rico on foot walking north up a road, traffic and crowds
  // around him, the city on both sides.
  world.missions.index = 0;
  world.missions.step = 0;
  world.missions.placeBeacon(world);
  world.player.x = -29;
  world.player.z = -40;
  world.player.heading = 0;
  scriptedWalk(world, SAMPLE_STEPS);
}
