// Solmar Bay's hand-in program (Node 22, standard library only): it copies the
// playable game and the screenshots from beside this file into /output, then
// writes /output/dossier.json — the summary the judge reads — with the kit's
// vendored make.fun library. The game itself is static files under game/; the
// screenshots are real renders of it under screenshots/.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The dossier library caps the text it keeps; the scorer caps the rest. These
// are the same numbers the kit's gate.json publishes, so a hand-in that passes
// here is one the sealed scorer accepts.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function handIn() {
  // Fail loudly on a missing piece instead of handing in a broken entry: the
  // scorer refuses an entry with no game or no screenshots, and a loud failure
  // here is cheaper than a rejected submission.
  if (!existsSync(join(repoRoot, 'game', 'index.html'))) {
    throw new Error('game/index.html is missing — the entry has no game to hand in');
  }
  if (!existsSync(join(repoRoot, 'screenshots'))) {
    throw new Error('screenshots/ is missing — the entry needs 3 or 4 screenshots');
  }
  mkdirSync(outDir, { recursive: true });
  cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  if (existsSync(join(repoRoot, 'screenshots'))) {
    cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
  }
  writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, DOSSIER_LIMITS));
}

handIn();
