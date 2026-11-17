// Solmar Bay — tuning constants. One place for every number the systems share,
// so a balance pass touches this file and nothing else.
export const STEP = 1 / 60;
export const SAVE_KEY = 'solmarbay-save-v1';

// The city is a grid of blocks split by roads. BLOCK is the block side, ROAD the road
// width; BLOCKS counts blocks across, so the built city spans BLOCKS * (BLOCK + ROAD).
export const BLOCK = 34;
export const ROAD = 12;
export const BLOCKS = 7;
export const CITY = BLOCKS * (BLOCK + ROAD);
// South of the city (positive z past CITY / 2) the beach and the sea begin.
export const BEACH_START = CITY / 2 + 8;
export const SEA_START = BEACH_START + 26;

export const PLAYER = {
  walkSpeed: 7,
  runSpeed: 11,
  radius: 0.7,
  health: 100,
  jumpSpeed: 8,
  punchRange: 2.2,
  punchDamage: 25,
  pistolDamage: 34,
  pistolRange: 90,
  pistolCooldown: 0.28,
};

export const CAR = {
  accel: 26,
  brake: 42,
  reverseAccel: 14,
  maxSpeed: 38,
  maxReverse: 12,
  steer: 1.9,
  radius: 2.2,
  trafficSpeed: 11,
  policeSpeed: 44,
};

export const WANTED = {
  maxStars: 5,
  stealHeat: 1,
  hitPedHeat: 1,
  shootHeat: 1,
  killCopHeat: 2,
  // Seconds without a crime before one star fades.
  decaySeconds: 22,
  // Police cars on the street at each star count.
  policeCars: [0, 1, 2, 3, 4, 6],
  // On-foot officers at each star count.
  policeFoot: [0, 0, 1, 2, 3, 4],
};

export const MISSIONS = [
  {
    id: 'fare',
    name: 'First Fare',
    giver: 'Mara Solis',
    brief: 'Mara needs a driver she can trust. Pick up the client at the gold marker, then drop them at the hotel.',
    reward: 250,
  },
  {
    id: 'pickup',
    name: 'The Pickup',
    giver: 'Mara Solis',
    brief: 'A rival crew left a mint coupe parked by the marina. Take it — quietly — and bring it to the garage.',
    reward: 600,
  },
  {
    id: 'heat',
    name: 'Heat Wave',
    giver: 'Mara Solis',
    brief: 'The pickup put the whole bay PD on you. Lose the heat, then get to the safehouse without being seen.',
    reward: 800,
  },
  {
    id: 'harbor',
    name: 'Harbor Run',
    giver: 'Mara Solis',
    brief: 'One last job: a package for the harbor freighter. The cops know the route. Drive fast, stay alive.',
    reward: 1500,
  },
];

export const COLORS = {
  skyTop: 0x2f7fc9,
  skyBottom: 0xbfd9ee,
  sun: 0xfff2cf,
  road: 0x2b2e33,
  sidewalk: 0x8f8a80,
  sand: 0xd9c08a,
  sea: 0x1e6f8e,
  grass: 0x5d8a4a,
  // Paint jobs for traffic and the player's cars.
  paints: [0xc23b2e, 0x2e6fc2, 0xe0a52e, 0x3fae6a, 0x8a5fc2, 0xd8d8d8, 0x22242a, 0xe86a1e],
  policePaint: 0x1c2f57,
  policeLightA: 0xff2a2a,
  policeLightB: 0x2a6bff,
  buildingGlass: [0x9fc4d8, 0x7fa8c4, 0xc4b49a, 0x8fb8a8],
  buildingWall: [0xe8dcc8, 0xd8c8b8, 0xc8b8a8, 0xb8c8d8, 0xd8d8d8, 0xe8e0d0],
};
