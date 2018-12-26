const seedrandom = require('seedrandom');
let rng = seedrandom();
export const MAX_PLAYER = 8;/* number of players (countries) */
export const NEUTRAL = 0;/* neutral player */
export const MAX_CLASS = 1;/* classes of units. only one exists. */
export const MAX_WIDTH = 40;/* max map width */
export const MAX_HEIGHT = 29;/* max map height */
export const DIRECTIONS = 6;/* number of neighbors on the grid */

export const MAX_POP = 499;/* maximum polulation at a tile (for each player) */

export const MAX_TIMELINE_MARK = 82;

export const MIN = (x, y) => (x < y) ? (x) : (y);
export const MAX = (x, y) => (x < y) ? (y) : (x);
export const IN_SEGMENT = (x, l, r) => (((x) < (l)) ? (l) : (((x) > (r)) ? (r) : (x)));

// export const ESCAPE      = '\033';
export const ESCAPE = ' ';
export const K_UP = 65;
export const K_DOWN = 66;
export const K_RIGHT = 67;
export const K_LEFT = 68;
export type Tuple<TItem, TLength extends number> = [TItem, ...TItem[]] & { length: TLength };
export const RAND_MAX = 2147483647;
export const RAND = () => Math.floor(rng() * RAND_MAX);
export const SRAND = (seed) => rng = seedrandom(seed);
export const RAND_ROUND = (x) => {
  let i = Math.floor(x);
  if ((RAND() / RAND_MAX) < (x - i)) i++;
  return i;
};
export const X_OF_IJ = (i, j) => 0.5 * (j) + (i)
export const Y_OF_IJ = (i, j) => (j)
