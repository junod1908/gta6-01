// Solmar Bay itself: the road grid, the buildings with lit windows, the palms,
// the beach and the sea. Everything is built once from a seed, so the same seed
// always grows the same city. Returns the colliders (building AABBs) the rest of
// the game pushes against, plus the landmarks the missions point at.
import * as THREE from 'three';
import { BLOCK, BLOCKS, BEACH_START, CITY, COLORS, ROAD, SEA_START } from './config.js';

function windowTexture(random, glass, wall) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, 128, 256);
  const cols = 4;
  const rows = 10;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const lit = random.next() < 0.42;
      ctx.fillStyle = lit ? '#ffd98a' : glass;
      ctx.fillRect(8 + x * 30, 10 + y * 24, 20, 14);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePalm() {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a44 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 5.5, 6), trunkMat);
  trunk.position.y = 2.75;
  trunk.rotation.z = 0.08;
  group.add(trunk);
  // Six drooping fronds fanning out of the crown.
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f8a3a, side: THREE.DoubleSide });
  const leafGeo = new THREE.BoxGeometry(3.4, 0.07, 0.85);
  for (let i = 0; i < 6; i += 1) {
    const arm = new THREE.Group();
    arm.position.y = 5.5;
    arm.rotation.y = (i / 6) * Math.PI * 2;
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.x = 1.55;
    leaf.rotation.z = -0.55;
    arm.add(leaf);
    group.add(arm);
  }
  return group;
}

export function buildCity(scene, random) {
  const colliders = [];
  const half = CITY / 2;
  const pitch = BLOCK + ROAD;

  // Ground: one big slab, grass green under the city, sand past the beach line.
  const groundMat = new THREE.MeshLambertMaterial({ color: COLORS.grass });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(CITY + 120, CITY + 120), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = 10;
  scene.add(ground);

  // Roads: dark strips along every grid line, plus a beachfront avenue.
  const roadMat = new THREE.MeshLambertMaterial({ color: COLORS.road });
  const roadGeo = new THREE.PlaneGeometry(CITY + 24, ROAD);
  for (let i = 0; i <= BLOCKS; i += 1) {
    const at = -half + i * pitch - ROAD / 2;
    const h = new THREE.Mesh(roadGeo, roadMat);
    h.rotation.x = -Math.PI / 2;
    h.position.set(0, 0.02, at);
    scene.add(h);
    const v = new THREE.Mesh(roadGeo, roadMat);
    v.rotation.x = -Math.PI / 2;
    v.rotation.z = Math.PI / 2;
    v.position.set(at, 0.02, 0);
    scene.add(v);
  }
  // Sidewalks: pale frames around every block.
  const walkMat = new THREE.MeshLambertMaterial({ color: COLORS.sidewalk });
  const walkGeo = new THREE.PlaneGeometry(BLOCK + 4, BLOCK + 4);
  for (let bx = 0; bx < BLOCKS; bx += 1) {
    for (let bz = 0; bz < BLOCKS; bz += 1) {
      const cx = -half + ROAD / 2 + BLOCK / 2 + bx * pitch;
      const cz = -half + ROAD / 2 + BLOCK / 2 + bz * pitch;
      const walk = new THREE.Mesh(walkGeo, walkMat);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(cx, 0.01, cz);
      scene.add(walk);
    }
  }
  // Centre lines: dashed white paint down each road.
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xe8e4d8 });
  const dashGeo = new THREE.PlaneGeometry(0.35, 2.2);
  for (let i = 0; i <= BLOCKS; i += 1) {
    const at = -half + i * pitch - ROAD / 2;
    for (let d = -half; d < half; d += 6) {
      const h = new THREE.Mesh(dashGeo, lineMat);
      h.rotation.x = -Math.PI / 2;
      h.position.set(d, 0.03, at);
      scene.add(h);
      const v = new THREE.Mesh(dashGeo, lineMat);
      v.rotation.x = -Math.PI / 2;
      v.rotation.z = Math.PI / 2;
      v.position.set(at, 0.03, d);
      scene.add(v);
    }
  }

  // Buildings: one or two boxes per block, windows by canvas texture.
  const wallMats = COLORS.buildingWall.map((c) => new THREE.MeshLambertMaterial({ color: c }));
  const glassTex = COLORS.buildingGlass.map((g, i) => windowTexture(random, '#' + g.toString(16).padStart(6, '0'), '#' + COLORS.buildingWall[i % COLORS.buildingWall.length].toString(16).padStart(6, '0')));
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x5a5148 });
  for (let bx = 0; bx < BLOCKS; bx += 1) {
    for (let bz = 0; bz < BLOCKS; bz += 1) {
      const cx = -half + ROAD / 2 + BLOCK / 2 + bx * pitch;
      const cz = -half + ROAD / 2 + BLOCK / 2 + bz * pitch;
      // The marina block stays open (water-side plaza), the hotel block holds the tower.
      if (bx === BLOCKS - 1 && bz === BLOCKS - 1) continue;
      const tall = bx === 3 && bz === 2;
      const count = tall ? 1 : random.int(1, 2);
      for (let k = 0; k < count; k += 1) {
        const w = tall ? 20 : random.range(10, 16);
        const d = tall ? 20 : random.range(10, 16);
        const h = tall ? 64 : random.range(8, 30);
        const ox = count === 1 ? 0 : (k === 0 ? -7 : 7);
        const oz = count === 1 ? 0 : (k === 0 ? -6 : 6);
        const tex = random.pick(glassTex);
        const windowMat = new THREE.MeshLambertMaterial({ map: tex });
        // Windows on all four walls; the roof stays plain.
        const mats = [windowMat, windowMat, roofMat, roofMat, windowMat, windowMat];
        const mesh = new THREE.Mesh(boxGeo, mats);
        mesh.scale.set(w, h, d);
        mesh.position.set(cx + ox, h / 2, cz + oz);
        scene.add(mesh);
        colliders.push({ minX: cx + ox - w / 2, maxX: cx + ox + w / 2, minZ: cz + oz - d / 2, maxZ: cz + oz + d / 2 });
      }
    }
  }

  // Palms along the beachfront avenue and scattered on sidewalks.
  const palmSpots = [];
  for (let x = -half; x <= half; x += 18) palmSpots.push([x, BEACH_START - 6]);
  for (let i = 0; i < 40; i += 1) {
    const bx = random.int(0, BLOCKS - 1);
    const bz = random.int(0, BLOCKS - 1);
    palmSpots.push([
      -half + ROAD / 2 + BLOCK / 2 + bx * pitch + random.range(-15, 15),
      -half + ROAD / 2 + BLOCK / 2 + bz * pitch + random.range(-15, 15),
    ]);
  }
  for (const [x, z] of palmSpots) {
    const palm = makePalm();
    palm.position.set(x, 0, z);
    palm.rotation.y = random.next() * Math.PI * 2;
    scene.add(palm);
  }

  // Beach sand and the sea, south of the city.
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY + 120, SEA_START - BEACH_START + 30),
    new THREE.MeshLambertMaterial({ color: COLORS.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.015, (BEACH_START + SEA_START) / 2 + 6);
  scene.add(sand);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY + 400, 400),
    new THREE.MeshLambertMaterial({ color: COLORS.sea }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.01, SEA_START + 200);
  scene.add(sea);

  // Landmarks the missions point at: hotel, garage, safehouse, harbor, marina.
  const landmark = (x, z) => ({ x, z });
  const roadX = (i) => -half + i * pitch - ROAD / 2;
  const landmarks = {
    hotel: landmark(roadX(3), -half + 2 * pitch - ROAD / 2),
    garage: landmark(roadX(5), -half + 5 * pitch - ROAD / 2),
    safehouse: landmark(roadX(1), -half + 1 * pitch - ROAD / 2),
    harbor: landmark(roadX(6), BEACH_START - 4),
    marina: landmark(roadX(6), -half + 6 * pitch - ROAD / 2),
    pickup: landmark(roadX(2), -half + 4 * pitch - ROAD / 2),
  };
  return { colliders, landmarks };
}

// True when the point (x, z) sits on a road (not on a block or the beach).
export function onRoad(x, z) {
  const half = CITY / 2;
  const pitch = BLOCK + ROAD;
  if (x < -half - ROAD || x > half + ROAD || z < -half - ROAD || z > half + ROAD) return false;
  const rx = ((x + half + ROAD / 2) % pitch + pitch) % pitch;
  const rz = ((z + half + ROAD / 2) % pitch + pitch) % pitch;
  return rx < ROAD || rz < ROAD;
}

// Clamp a circle (x, z, radius) out of every building AABB; returns the fixed point.
export function pushOutBuildings(x, z, radius, colliders) {
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - nx;
    const dz = z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        x = nx + (dx / d) * radius;
        z = nz + (dz / d) * radius;
      } else {
        x = c.maxX + radius;
      }
    }
  }
  return [x, z];
}
