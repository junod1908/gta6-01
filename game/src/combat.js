// Combat: a punch for up close and a pistol for everything else. Both are
// hitscan against people — no projectiles to simulate — with a tracer line and
// a sound so the player feels the shot land. Shooting is a crime: it draws heat.
import * as THREE from 'three';
import { PLAYER } from './config.js';
import { hitPersonAt } from './people.js';

export function createCombat(scene) {
  const tracerMat = new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 });
  const tracerGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(), new THREE.Vector3(),
  ]);
  const tracer = new THREE.Line(tracerGeo, tracerMat);
  tracer.visible = false;
  scene.add(tracer);
  return {
    cooldown: 0,
    tracer,
    tracerTime: 0,
    // The punch: whoever stands in front of the player inside arm's reach.
    punch(world) {
      const p = world.player;
      const fx = Math.sin(p.heading);
      const fz = Math.cos(p.heading);
      const hit = hitPersonAt(world, p.x + fx * 1.4, p.z + fz * 1.4, PLAYER.punchRange, PLAYER.punchDamage, false);
      world.audio.thud();
      if (hit) world.wanted.addHeat(1);
      return hit;
    },
    // The pistol: a ray from the camera through the crosshair; the nearest
    // person within a narrow cone of it takes the hit.
    shoot(world, camera) {
      if (this.cooldown > 0) return null;
      this.cooldown = PLAYER.pistolCooldown;
      const p = world.player;
      const origin = new THREE.Vector3();
      camera.getWorldPosition(origin);
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      let best = null;
      let bestAlong = PLAYER.pistolRange;
      const targets = [...world.peds, ...world.cops];
      for (const t of targets) {
        if (t.dead) continue;
        const to = new THREE.Vector3(t.x - origin.x, 1.2 - origin.y, t.z - origin.z);
        const along = to.dot(dir);
        if (along < 1 || along > PLAYER.pistolRange) continue;
        const perp = to.clone().addScaledVector(dir, -along).length();
        if (perp < 1.4 && along < bestAlong) {
          bestAlong = along;
          best = t;
        }
      }
      const end = origin.clone().addScaledVector(dir, best ? bestAlong : PLAYER.pistolRange);
      this.tracer.geometry.setFromPoints([origin, end]);
      this.tracer.visible = true;
      this.tracerTime = 0.07;
      world.audio.gunshot();
      if (best) {
        // hitPersonAt already adds the heat for the victim (cop +2, ped +1).
        return hitPersonAt(world, best.x, best.z, 0.1, PLAYER.pistolDamage, true);
      }
      // A shot fired in the air still resets the decay clock and startles the street.
      world.wanted.addHeat(0);
      world.alarm = 2;
      return null;
    },
    step(dt) {
      this.cooldown = Math.max(0, this.cooldown - dt);
      if (this.tracer.visible) {
        this.tracerTime -= dt;
        if (this.tracerTime <= 0) this.tracer.visible = false;
      }
    },
  };
}
