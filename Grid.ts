import { shuffle } from 'lodash';
import {
  MAX_HEIGHT,
  MAX_WIDTH,
  MAX_CLASS,
  MAX_PLAYER,
  MIN,
  NEUTRAL,
  RAND,
  X_OF_IJ,
  Y_OF_IJ,
  DIRECTIONS,
  MAX,
  IN_SEGMENT, RAND_MAX
} from "./Common";

export type Position = [number, number];

export enum TileClass {
  abyss = 0,
  mountain = 1,
  mine = 2,
  grassland = 3,
  village = 4,
  town = 5,
  castle = 6,
}

export enum UnitClass {
  citizen = 0,
}

export class Tile {
  cl: TileClass;
  pl: number;
  units: number[][] = [];

  toString() {
    return this.pl;
  }
}

export enum Stencil {
  st_rhombus,
  st_rect,
  st_hex
}

export const MAX_AVLBL_LOC = 7;
export const RANDOM_INEQUALITY = -1;

export const dirs: Position[] = [[-1, 0], [1, 0], [0, -1], [0, 1], [1, -1], [-1, 1]];

export class Grid {
  width: number;
  height: number;
  tiles: Tile[][] = [];

  static isCity(t: TileClass): boolean {
    switch (t) {
      case TileClass.village:
      case TileClass.town:
      case TileClass.castle:
        return true;
      default:
        return false;
    }
  }

  static isInhabitable(t: TileClass): boolean {
    switch (t) {
      case TileClass.abyss:
      case TileClass.mountain:
      case TileClass.mine:
        return false;
      default:
        return true;
    }
  }

  static isVisible(t: TileClass): boolean {
    switch (t) {
      case TileClass.abyss:
        return false;
      default:
        return true;
    }
  }

  constructor(w: number, h: number) {
    this.width = MIN(w, MAX_WIDTH);
    this.height = MIN(h, MAX_HEIGHT);
    for (let i = 0; i < this.width; ++i) {
      this.tiles[i] = [];
      for (let j = 0; j < this.height; ++j) {
        this.tiles[i][j] = new Tile();
        this.tiles[i][j].cl = TileClass.grassland;
        let x = RAND() % 20;
        if (0 == x) {
          let y = RAND() % 6;
          switch (y) {
            case 0:
              this.tiles[i][j].cl = TileClass.castle;
              break;
            case 1:
            case 2:
              this.tiles[i][j].cl = TileClass.town;
              break;
            default:
              this.tiles[i][j].cl = TileClass.village;
          }
        }
        if (x > 0 && x < 5) {
          // mountains and mineis
          if (RAND() % 10 == 0) {
            this.tiles[i][j].cl = TileClass.mine;
          } else {
            this.tiles[i][j].cl = TileClass.mountain;
          }
          this.tiles[i][j].pl = NEUTRAL;
        } else {
          x = 1 + RAND() % (MAX_PLAYER - 1);
          if (x < MAX_PLAYER) {
            this.tiles[i][j].pl = x;
          } else {
            this.tiles[i][j].pl = NEUTRAL;
          }
        }

        for (let p = 0; p < MAX_PLAYER; ++p) {
          this.tiles[i][j].units[p] = [];
          for (let c = 0; c < MAX_CLASS; ++c) {
            this.tiles[i][j].units[p][c] = 0;
          }
        }

        if (Grid.isCity(this.tiles[i][j].cl)) {
          let owner = this.tiles[i][j].pl;
          this.tiles[i][j].units[owner][UnitClass.citizen] = 10;
        }
      }
    }
  }

  static stencil_avlbl_loc_num(st: Stencil) {
    switch (st) {
      case Stencil.st_rhombus:
        return 4;
      case Stencil.st_rect:
        return 4;
      case Stencil.st_hex:
        return 6;
    }
    return 0;
  }

  stencil_rhombus(d: number, loc: Position[]) {
    let xs = [d, this.width - 1 - d, d, this.width - 1 - d];
    let ys = [d, this.height - 1 - d, this.height - 1 - d, d];
    let loc_num = 4;
    for (let k = 0; k < loc_num; ++k) {
      loc[k] = [xs[k], ys[k]];
    }
  }

  stencil_rect(d: number, loc: Position[]) {

    let x, y;
    let epsilon = 0.1;
    let x0 = X_OF_IJ(0, this.height - 1) - epsilon;
    let y0 = Y_OF_IJ(0, 0) - epsilon;
    let x1 = X_OF_IJ(this.width - 1, 0) + epsilon;
    let y1 = Y_OF_IJ(0, this.height - 1) + epsilon;
    for (let i = 0; i < this.width; ++i)
      for (let j = 0; j < this.height; ++j) {
        x = X_OF_IJ(i, j);
        y = Y_OF_IJ(i, j);
        if (x < x0 || x > x1 || y < y0 || y > y1)
          this.tiles[i][j].cl = TileClass.abyss;
      }

    let loc_num = 4;
    let dx = Math.floor(this.height / 2);
    let temp_loc: Position[] = [
      [dx + d - 1, d],
      [this.width - dx - 1 - d + 1, this.height - 1 - d],
      [d + 1, this.height - 1 - d],
      [this.width - 1 - d - 1, d]
    ];
    for (let k = 0; k < loc_num; ++k) {
      loc[k] = temp_loc[k];
    }
  }

  stencil_hex(d: number, loc: Position[]) {
    let dx = Math.floor(this.height / 2);
    for (let i = 0; i < this.width; ++i)
      for (let j = 0; j < this.height; ++j) {
        if (i + j < dx || i + j > this.width - 1 + this.height - 1 - dx)
          this.tiles[i][j].cl = TileClass.abyss;
      }

    let loc_num = 6;
    let temp_loc: Position[] = [
      [dx + d - 2, d], // tl
      [d, this.height - 1 - d], // bl
      [this.width - 1 - d, dx], // cr
      [d, dx], // cl
      [this.width - 1 - d - 2 + 2, d], // tr
      [this.width - 1 - dx - d + 2, this.height - 1 - d] // br
    ];
    for (let k = 0; k < loc_num; ++k) {
      loc[k] = temp_loc[k];
    }
  }

  apply_stencil(st: Stencil, d: number, loc: Position[]) {
    let avlbl_loc_num = Grid.stencil_avlbl_loc_num(st);

    switch (st) {
      case Stencil.st_rhombus:
        this.stencil_rhombus(d, loc);
        break;
      case Stencil.st_rect:
        this.stencil_rect(d, loc);
        break;
      case Stencil.st_hex:
        this.stencil_hex(d, loc);
        break;
      default:
        ;
    }
    for (let i = 0; i < this.width; ++i) {
      for (let j = 0; j < this.height; ++j) {
        if (this.tiles[i][j].cl == TileClass.abyss) {
          for (let p = 0; p < MAX_PLAYER; ++p) {
            this.tiles[i][j].units[p][UnitClass.citizen] = 0;
            this.tiles[i][j].pl = NEUTRAL;
          }
        }
      }
    }
    return avlbl_loc_num
  }

  /* helper.
   * floodfill with value val, the closest distance has priority */
  floodfill_closest(u: number[][], d: number[][], x: number, y: number, val: number, dist: number) {

    if (x < 0 || x >= this.width || y < 0 || y >= this.height || Grid.isInhabitable(this.tiles[x][y].cl) === false || d[x][y] <= dist) {
      return;
    }
    u[x][y] = val;
    d[x][y] = dist;

    for (let k = 0; k < DIRECTIONS; ++k) {
      this.floodfill_closest(u, d, x + dirs[k][0], y + dirs[k][1], val, dist + 1);
    }
  }

  /* eval_locations
   *  evalueate locations loc[],
   *  the result is stored in result[]
   *   */
  eval_locations(loc: Position[], result: number[], len: number) {
    let u: number[][] = [];
    let d: number[][] = [];
    const unreachable = -1;
    const competition = -2;

    for (let i = 0; i < this.width; ++i) {
      d[i] = [];
      u[i] = [];
      for (let j = 0; j < this.height; ++j) {
        d[i][j] = MAX_WIDTH * MAX_HEIGHT + 1;
        u[i][j] = unreachable;
      }
    }
    for (let k = 0; k < len; ++k) {
      /* flood fill with values {0,... len-1} */
      this.floodfill_closest(u, d, loc[k][0], loc[k][1], k, 0);
    }

    for (let i = 0; i < this.width; ++i) {
      for (let j = 0; j < this.height; ++j) {
        if (this.tiles[i][j].cl == TileClass.mine) {
          let single_owner = unreachable;
          let max_dist = 0;
          let min_dist = MAX_WIDTH * MAX_HEIGHT + 1;
          for (let k = 0; k < DIRECTIONS; ++k) {
            let x = i + dirs[k][0];
            let y = j + dirs[k][1];
            if (x < 0 || x >= this.width || y < 0 || y >= this.height || Grid.isInhabitable(this.tiles[x][y].cl) == false) {
              continue;
            }

            if (single_owner == unreachable) {
              single_owner = u[x][y];
              max_dist = d[x][y];
              min_dist = d[x][y];
            } else {
              if (u[x][y] == single_owner) {
                max_dist = MAX(max_dist, d[x][y]);
                min_dist = MIN(min_dist, d[x][y]);
              } else if (u[x][y] != unreachable) single_owner = competition;
            }
          }
          if (single_owner != competition && single_owner != unreachable)
            result[single_owner] += Math.floor(100.0 * (MAX_WIDTH + MAX_HEIGHT) * Math.exp(-10.0 * max_dist * min_dist / (MAX_WIDTH * MAX_HEIGHT)));
        }
      }
    }
    return;
  }

  conflict(loc_arr: Position[], available_loc_num: number, players: number[], players_num: number, locations_num: number,
           ui_players: number[], ui_players_num: number, conditions: number, ineq: number) {

    /* first, remove all cities */
    for (let i = 0; i < this.width; ++i) {
      for (let j = 0; j < this.height; ++j) {
        for (let p = 0; p < MAX_PLAYER; ++p) {
          for (let c = 0; c < MAX_CLASS; ++c) {
            this.tiles[i][j].units[p][c] = 0;
            this.tiles[i][j].pl = NEUTRAL;
            if (Grid.isCity(this.tiles[i][j].cl))
              this.tiles[i][j].cl = TileClass.grassland;
            //this.tiles[i][j].pl = NEUTRAL;
          }
        }
      }
    }

    locations_num = IN_SEGMENT(locations_num, 2, available_loc_num);

    let num = MIN(locations_num, players_num + ui_players_num);

    /* shift in the positions arrays */
    let di = RAND() % available_loc_num;

    let chosen_loc: Position[] = [];

    let i = 0;
    while (i < num) {
      let ii = (i + di + available_loc_num) % available_loc_num;
      let x = loc_arr[ii][0];
      let y = loc_arr[ii][1];

      chosen_loc[i] = [x, y];

      this.tiles[x][y].cl = TileClass.castle;

      /* place mines nearby */
      let dir = RAND() % DIRECTIONS;
      let ri = dirs[dir][0];
      let rj = dirs[dir][1];

      let m = 1;
      let mine_i = x + m * ri;
      let mine_j = y + m * rj;
      this.tiles[mine_i][mine_j].cl = TileClass.mine;
      this.tiles[mine_i][mine_j].pl = NEUTRAL;
      mine_i = x - 2 * m * ri;
      mine_j = y - 2 * m * rj;
      this.tiles[mine_i][mine_j].cl = TileClass.mine;
      this.tiles[mine_i][mine_j].pl = NEUTRAL;
      mine_i = x - m * ri;
      mine_j = y - m * rj;
      this.tiles[mine_i][mine_j].cl = TileClass.grassland;
      this.tiles[mine_i][mine_j].pl = NEUTRAL;

      i++;
    }

    /* eval locations */
    let eval_result: number[] = [0, 0, 0, 0, 0, 0, 0];
    let loc_index: number[] = [0, 1, 2, 3, 4, 5, 6];
    this.eval_locations(chosen_loc, eval_result, num);
    /* sort in increasing order */
    eval_result.sort((a, b) => a - b);

    /* Compute inequality */
    if (ineq != RANDOM_INEQUALITY) {
      let avg = 0;
      for (i = 0; i < num; ++i) avg += eval_result[i];
      avg = avg / num;
      let varA = 0;
      for (i = 0; i < num; ++i) {
        varA += Math.pow(eval_result[i] - avg, 2);
      }
      varA = varA / num; // population variance

      let diff = Math.sqrt(varA);
      let x = diff * 1000.0 / avg;
      switch (ineq) {
        case 0:
          if (x > 50) return -1;
          break;
        case 1:
          if (x <= 50 || x > 100) return -1;
          break;
        case 2:
          if (x <= 100 || x > 250) return -1;
          break;
        case 3:
          if (x <= 250 || x > 500) return -1;
          break;
        case 4:
          if (x <= 500) return -1;
          break;
      }
    }

    /* suffled computer players */
    let sh_players_comp = new Array(players_num)
    for (i = 0; i < players_num; ++i) {
      sh_players_comp[i] = players[i];
    }
    shuffle(sh_players_comp)

    /* a shuffled copy of the players array */
    let sh_players = new Array(num)
    for (let i = 0; i < ui_players_num; ++i)
      sh_players[i] = ui_players[i];
    let dplayer = RAND() % players_num;
    for (let i = ui_players_num; i < num; ++i)
      sh_players[i] = sh_players_comp[(i - ui_players_num + dplayer) % players_num];
    shuffle(sh_players, num);

    /* human player index */
    let ihuman = RAND() % num;
    /* choose specific conditions {1,... N}, 1==best, N==worst */
    if (conditions > 0) {
      let select = IN_SEGMENT(num - conditions, 0, num - 1);
      ihuman = loc_index[select];
    }

    i = 0;
    while (i < num) {
      let ii = loc_index[i];
      let x = chosen_loc[ii][0];
      let y = chosen_loc[ii][1];
      /*
      if (human_player != NEUTRAL && ihuman == ii)
        this.tiles[x][y].pl = human_player;
      else
        this.tiles[x][y].pl = sh_players[i];
      */
      if (ui_players_num > 1) {
        this.tiles[x][y].pl = sh_players[i];
      } else {
        if (ii == ihuman)
          this.tiles[x][y].pl = ui_players[0];
        else
          this.tiles[x][y].pl = sh_players_comp[i];
      }
      this.tiles[x][y].units[this.tiles[x][y].pl][UnitClass.citizen] = 10;

      i++;
    }

    return 0;
  }

  floodfill(u: number[][], x: number, y: number, val: number) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || Grid.isInhabitable(this.tiles[x][y].cl) == false || u[x][y] == val) {
      return;
    }
    u[x][y] = val;
    for (let k = 0; k < DIRECTIONS; ++k)
      this.floodfill(u, x + dirs[k][0], y + dirs[k][1], val);
  }

  isConnected(): boolean {
    let m: number[][] = [];
    for (let i = 0; i < this.width; ++i) {
      m[i] = [];
      for (let j = 0; j < this.height; ++j) {
        m[i][j] = 0;
      }
    }

    let colored = 0;
    for (let i = 0; i < this.width; ++i) {
      for (let j = 0; j < this.height; ++j) {
        if (this.tiles[i][j].pl != NEUTRAL) {
          if (colored && m[i][j] == 0) return false;
          colored = 1;
          this.floodfill(m, i, j, 1);
        }
      }
    }
    return true;
  }

  spread(u: number[][], v: number[][], x: number, y: number, val: number, factor: number) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || Grid.isInhabitable(this.tiles[x][y].cl) == false) {
      return;
    }
    let d = val - u[x][y];
    if (d > 0) {
      v[x][y] = MAX(0, v[x][y] + d * factor);
      u[x][y] += d;

      for (let k = 0; k < DIRECTIONS; ++k)
        this.spread(u, v, x + dirs[k][0], y + dirs[k][1], Math.floor(val / 2), factor);
    }
  }

  even(v: number[][], x: number, y: number, val: number) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || v[x][y] == val) {
      return;
    }
    v[x][y] = val;

    for (let k = 0; k < DIRECTIONS; ++k)
      this.even(v, x + dirs[k][0], y + dirs[k][1], val);
  }

  add_flag(fg: FlagGrid, x: number, y: number, val: number) {
    // exit if
    if (x < 0 || x >= this.width || y < 0 || y >= this.height ||
      Grid.isInhabitable(this.tiles[x][y].cl) == false || fg.flag[x][y] == FLAG_ON) {
      return;
    }

    let u: number[][] = [];
    for (let i = 0; i < MAX_WIDTH; ++i) {
      u[i] = [];
      for (let j = 0; j < MAX_HEIGHT; ++j) {
        u[i][j] = 0;
      }
    }

    fg.flag[x][y] = FLAG_ON;
    this.spread(u, fg.call, x, y, val, 1);
  }

  remove_flag(fg: FlagGrid, x: number, y: number, val: number) {
    // exit if
    if (x < 0 || x >= this.width || y < 0 || y >= this.height ||
      Grid.isInhabitable(this.tiles[x][y].cl) == false || fg.flag[x][y] == FLAG_OFF) {
      return;
    }

    let u: number[][] = [];
    for (let i = 0; i < MAX_WIDTH; ++i) {
      u[i] = [];
      for (let j = 0; j < MAX_HEIGHT; ++j) {
        u[i][j] = 0;
      }
    }

    fg.flag[x][y] = FLAG_OFF;
    this.spread(u, fg.call, x, y, val, -1);
  }

  remove_flags_with_prob(fg: FlagGrid, prob: number) {
    for (let i = 0; i < this.width; ++i) {
      for (let j = 0; j < this.height; ++j) {
        if (fg.flag[i][j] && RAND() / RAND_MAX <= prob) {
          this.remove_flag(fg, i, j, FLAG_POWER);
        }
      }
    }
  }
}

export const FLAG_ON = 1;
export const FLAG_OFF = 0;
export const FLAG_POWER = 8;

export class FlagGrid {
  width: number;
  height: number;
  flag: number[][] = [];
  call: number[][] = [];

  constructor(w: number, h: number) {
    this.width = MIN(w, MAX_WIDTH);
    this.height = MIN(h, MAX_HEIGHT);
    for (let i = 0; i < this.width; ++i) {
      this.flag[i] = [];
      this.call[i] = [];
      for (let j = 0; j < this.height; ++j) {
        this.flag[i][j] = FLAG_OFF;
        this.call[i][j] = 0;
      }
    }
  }
}
