// Solmar Bay — boot and the one loop. The world is built once from a seed:
// the city, the traffic, the crowds, Rico, the wanted system and the story.
// The game moves between title, play, paused and busted; ?shot=<name>&seed=N
// stages one scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import * as THREE from 'three';
import { BEACH_START, CAR, CITY, COLORS, MISSIONS, PLAYER, SAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { buildCity } from './city.js';
import {
  makeVehicle, nearestCar, separateCars, spawnTraffic, updatePlayerCar, updateTraffic,
} from './vehicles.js';
import {
  makePerson, spawnPedestrians, updateCops, updatePedestrians, updatePlayerOnFoot,
} from './people.js';
import { balancePolice, createWanted, updatePoliceCars } from './police.js';
import { createMissions, updateMissions } from './missions.js';
import { createCombat } from './combat.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { clearSave, loadSave, writeSave } from './save.js';
import {
  ACTION_CONFIRM, ACTION_ENTER, ACTION_MUTE, ACTION_PAUSE, ACTION_PUNCH, createInput,
} from './input.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const AUTOSAVE_SECONDS = 30;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.skyBottom);
scene.fog = new THREE.Fog(0xbfd9ee, 120, 420);
const sun = new THREE.DirectionalLight(COLORS.sun, 2.2);
sun.position.set(120, 180, 60);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xbfd9ee, 0x5d8a4a, 1.1));
const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 900);

const random = createRandom(seed);
const { colliders, landmarks } = buildCity(scene, random);

const world = {
  scene, random, colliders, landmarks,
  cars: [], peds: [], cops: [],
  alarm: 0,
  time: 0,
  events: { busted: false, wantedChanged: false },
  audio: createAudio(),
  hud: null,
  wanted: null,
  missions: null,
  combat: null,
  player: null,
};

// Rico Vega, the driver for hire: blue shirt, dark jeans, on foot by the plaza.
const rico = makePerson(scene, 0, -6, 'player', 0x2e6fc2, 0x2a3242);
world.player = {
  mesh: rico.mesh, x: 0, z: -6, y: 0, vy: 0, heading: 0,
  health: PLAYER.health, cash: 0, bestCash: 0,
  car: null, moving: false,
};
// The mint coupe the second job steals, parked by the marina from the start.
const coupe = makeVehicle(scene, landmarks.marina.x + 4, landmarks.marina.z, 0.6, 'parked', 0x3fae6a);
coupe.missionCar = true;
world.cars.push(coupe);

world.wanted = createWanted(world);
world.missions = createMissions(world);
world.missions.coupe = coupe;
world.combat = createCombat(scene);
world.hud = createHud(document);
world.missions.placeBeacon(world);
spawnTraffic(world, 12);
spawnPedestrians(world, 28);

const input = createInput(canvas);
const cam = { yaw: 0, pitch: 0.32, dist: 11 };
let screen = 'title';
let saveData = loadSave();
let autosaveTimer = 0;

function announce(message) {
  status.textContent = message;
}

function showScreen(name) {
  for (const id of ['screen-title', 'screen-paused', 'screen-busted']) {
    document.getElementById(id).classList.toggle('hidden', id !== `screen-${name}`);
  }
}

function applySave() {
  if (!saveData) return;
  world.player.cash = saveData.cash;
  world.player.bestCash = saveData.bestCash;
  world.missions.index = Math.min(saveData.missionIndex, MISSIONS.length);
  world.missions.done = saveData.storyDone;
  world.missions.step = 0;
  world.missions.placeBeacon(world);
}

function startGame(fresh) {
  if (fresh) {
    clearSave();
    saveData = null;
    world.player.cash = 0;
    world.player.bestCash = 0;
    world.missions.index = 0;
    world.missions.step = 0;
    world.missions.done = false;
    world.missions.placeBeacon(world);
  } else {
    applySave();
  }
  world.audio.unlock();
  screen = 'play';
  showScreen('play');
  world.hud.setObjective(world.missions.objectiveText);
  announce(`Playing. ${world.missions.objectiveText}`);
}

function respawnAfterBusted() {
  const p = world.player;
  p.health = PLAYER.health;
  p.cash = Math.floor(p.cash * 0.9);
  p.car = null;
  p.x = world.landmarks.safehouse.x;
  p.z = world.landmarks.safehouse.z;
  p.heading = 0;
  world.wanted.stars = 0;
  world.wanted.cleanFor = 0;
  for (const car of world.cars) {
    if (car.kind === 'police') {
      car.dead = true;
      car.mesh.visible = false;
    }
  }
  world.cars = world.cars.filter((c) => c.kind !== 'police' || !c.dead);
  for (const cop of world.cops) {
    cop.dead = true;
    cop.mesh.visible = false;
  }
  world.cops = [];
  writeSave(world);
  screen = 'play';
  showScreen('play');
  world.hud.banner('Released with a warning. Mara is waiting.');
  announce('Playing.');
}

function enterOrExitCar() {
  const p = world.player;
  if (p.car) {
    // Step out beside the car; it stays yours, parked where you left it.
    const car = p.car;
    p.car = null;
    p.x = car.x + Math.sin(car.heading + Math.PI / 2) * 2.5;
    p.z = car.z + Math.cos(car.heading + Math.PI / 2) * 2.5;
    p.heading = car.heading;
    world.audio.engine(0);
    return;
  }
  const car = nearestCar(world, p.x, p.z, 4);
  if (!car) return;
  if (car.kind === 'player' || car.kind === 'parked' && car.missionCar) {
    p.car = car;
    car.kind = 'player';
    return;
  }
  // Taking a stranger's car is a crime: one star, and the street notices.
  p.car = car;
  car.kind = 'player';
  world.wanted.addHeat(1);
  world.audio.blip();
  world.hud.banner('Car stolen — the bay PD is watching.');
}

function stepWorld(dt, rawInput) {
  world.time += dt;
  world.alarm = Math.max(0, world.alarm - dt);
  world.wanted.step(dt);
  balancePolice(world);
  if (world.player.car) updatePlayerCar(world, dt, rawInput);
  else updatePlayerOnFoot(world, dt, rawInput, cam.yaw);
  updateTraffic(world, dt);
  updatePedestrians(world, dt);
  updateCops(world, dt);
  updatePoliceCars(world, dt);
  separateCars(world);
  updateMissions(world, dt);
  world.combat.step(dt);
  world.hud.step(dt);
  world.audio.siren(world.wanted.stars > 0, dt);
  autosaveTimer += dt;
  if (autosaveTimer >= AUTOSAVE_SECONDS) {
    autosaveTimer = 0;
    writeSave(world);
  }
  if (world.events.busted) {
    world.events.busted = false;
    screen = 'busted';
    showScreen('busted');
    world.audio.engine(0);
    writeSave(world);
    announce('Busted. The bay PD took you in.');
  }
}

world.stepWorld = stepWorld;

// Back to the spawn state, for the screenshot scenes.
world.resetWorld = () => {
  const p = world.player;
  p.health = PLAYER.health;
  p.cash = 500;
  p.car = null;
  p.x = 0;
  p.z = -6;
  p.y = 0;
  p.vy = 0;
  p.heading = 0;
  world.wanted.stars = 0;
  world.wanted.cleanFor = 0;
  world.missions.index = 0;
  world.missions.step = 0;
  world.missions.done = false;
  for (const car of world.cars) {
    if (car.kind === 'police') {
      car.dead = true;
      car.mesh.visible = false;
    }
  }
  world.cars = world.cars.filter((c) => c.kind !== 'police' || !c.dead);
  for (const cop of world.cops) {
    cop.dead = true;
    cop.mesh.visible = false;
  }
  world.cops = [];
  coupe.x = landmarks.marina.x + 4;
  coupe.z = landmarks.marina.z;
  coupe.kind = 'parked';
  coupe.speed = 0;
  coupe.mesh.position.set(coupe.x, 0, coupe.z);
  coupe.mesh.rotation.y = 0.6;
  world.missions.coupe = coupe;
  world.missions.placeBeacon(world);
};

function updateCamera(dt) {
  const p = world.player;
  const target = p.car
    ? { x: p.car.x, z: p.car.z, y: 2.2 }
    : { x: p.x, z: p.z, y: 1.8 };
  // Behind the car when driving; free orbit on foot.
  if (p.car) {
    let diff = p.car.heading - cam.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cam.yaw += diff * Math.min(1, dt * 2.2);
    cam.pitch += (0.3 - cam.pitch) * Math.min(1, dt * 2);
    cam.dist += (13 - cam.dist) * Math.min(1, dt * 2);
  } else {
    cam.dist += (10 - cam.dist) * Math.min(1, dt * 2);
  }
  const cx = target.x - Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.dist;
  const cz = target.z - Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.dist;
  const cy = target.y + Math.sin(cam.pitch) * cam.dist;
  camera.position.set(cx, Math.max(1.2, cy), cz);
  camera.lookAt(target.x, target.y, target.z);
}

function updateHud() {
  const p = world.player;
  world.hud.setHealth(p.health);
  world.hud.setCash(p.cash);
  world.hud.setStars(world.wanted.stars);
  world.hud.setObjective(world.missions.objectiveText);
  world.hud.setSpeed(p.car ? Math.abs(p.car.speed) * 3.6 : 0);
  world.hud.drawMinimap(world);
}

function runShot(name) {
  stageShot(name, world);
  screen = 'play';
  showScreen('play');
  // Settle the camera behind the player at once: the shot paints once, so the
  // follow easing has no frames to converge over. A staged scene may ask for a
  // higher, wider camera than the default follow.
  const p = world.player;
  cam.yaw = p.car ? p.car.heading : p.heading;
  cam.pitch = world.shotCam?.pitch ?? 0.3;
  cam.dist = world.shotCam?.dist ?? (p.car ? 13 : 10);
  document.getElementById('crosshair').style.display = 'none';
  updateCamera(0); // dt 0 keeps the staged pitch, distance and yaw exactly.
  updateHud();
  let painted = 0;
  function paint() {
    renderer.render(scene, camera);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let last = performance.now();
  let accumulator = 0;
  const continueBtn = document.getElementById('continue-btn');
  const startBtn = document.getElementById('start-btn');
  if (saveData && (saveData.cash > 0 || saveData.missionIndex > 0)) {
    continueBtn.classList.remove('hidden');
    continueBtn.textContent = `Continue — $${saveData.cash}, job ${Math.min(saveData.missionIndex + 1, MISSIONS.length)} of ${MISSIONS.length}`;
  }
  startBtn.addEventListener('click', () => startGame(true));
  continueBtn.addEventListener('click', () => startGame(false));
  document.getElementById('respawn-btn').addEventListener('click', respawnAfterBusted);
  document.getElementById('resume-btn').addEventListener('click', () => {
    screen = 'play';
    showScreen('play');
  });
  showScreen('title');
  announce('Solmar Bay. Press Enter or click Start.');

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const look = input.takeLook();
    cam.yaw -= look.yaw;
    cam.pitch = Math.max(0.08, Math.min(1.1, cam.pitch + look.pitch));
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = world.audio.toggleMute();
      world.hud.banner(muted ? 'Sound off.' : 'Sound on.');
    }
    if (screen === 'title' && actions & ACTION_CONFIRM) startGame(!saveData);
    else if (screen === 'busted' && actions & ACTION_CONFIRM) respawnAfterBusted();
    else if (actions & ACTION_PAUSE) {
      if (screen === 'play') {
        screen = 'paused';
        showScreen('paused');
      } else if (screen === 'paused') {
        screen = 'play';
        showScreen('play');
      }
    }
    if (screen === 'play') {
      if (actions & ACTION_ENTER) enterOrExitCar();
      if (actions & ACTION_PUNCH && !world.player.car) world.combat.punch(world);
      if (input.takeClick() && !world.player.car) world.combat.shoot(world, camera);
      while (accumulator >= STEP) {
        stepWorld(STEP, input);
        accumulator -= STEP;
      }
      updateCamera(STEP);
      updateHud();
    } else {
      accumulator = 0;
      updateCamera(STEP);
    }
    renderer.render(scene, camera);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'play') {
      screen = 'paused';
      showScreen('paused');
    }
  });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  window.addEventListener('beforeunload', () => writeSave(world));
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
