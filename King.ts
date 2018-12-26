import { dirs, FLAG_ON, FLAG_POWER, FlagGrid, Grid, Position, TileClass, UnitClass } from "./Grid";
import { ConfigDif } from "./State";
import { DIRECTIONS, MAX, MAX_PLAYER, MAX_POP, RAND } from "./Common";

export const PRICE_VILLAGE = 160;
export const PRICE_TOWN = 240;
export const PRICE_CASTLE = 320;

export const MAX_PRIORITY = 32;
export const no_loc: Position = [-1, -1];

export enum Strategy {
  none = 0,
  aggr_greedy,
  one_greedy,
  persistent_greedy,
  opportunist,
  noble,
  midas,
}

export class Country {
  gold: number = 0;
}

export class King {

  // value: number[MAX_WIDTH][MAX_HEIGHT];
  value: number[][] = [];
  pl: number;
  strategy: Strategy;

  constructor(pl: number, strategy: Strategy, g: Grid, dif: ConfigDif) {
    this.pl = pl;
    this.strategy = strategy
  }

  static build(g: Grid, c: Country, pl: number, i: number, j: number) {
    if (i >= 0 && i < g.width && j >= 0 && j < g.height && g.tiles[i][j].pl == pl) {
      let price = 0;
      let cl = TileClass.grassland;
      switch (g.tiles[i][j].cl) {
        case TileClass.grassland:
          price = PRICE_VILLAGE;
          cl = TileClass.village;
          break;
        case TileClass.village:
          price = PRICE_TOWN;
          cl = TileClass.town;
          break;
        case TileClass.town:
          price = PRICE_CASTLE;
          cl = TileClass.castle;
          break;
        default:
          return -1;
      }
      if (c.gold >= price) {
        g.tiles[i][j].cl = cl;
        c.gold -= price;
        return 0;
      }
    }
    return -1;
  }

  static degrade(g: Grid, i: number, j: number) {
    if (i >= 0 && i < g.width && j >= 0 && j < g.height) {
      let cl = TileClass.grassland;
      switch (g.tiles[i][j].cl) {
        case TileClass.village:
          cl = TileClass.grassland;
          break;
        case TileClass.town:
          cl = TileClass.village;
          break;
        case TileClass.castle:
          cl = TileClass.town;
          break;
        default:
          return -1;
      }
      g.tiles[i][j].cl = cl;
      return 0;
    }
    return -1;
  }

  king_evaluate_map(g: Grid, dif: ConfigDif) {
    let u: number[][] = [];
    for (let i = 0; i < g.width; ++i) {
      u[i] = [];
      this.value[i] = [];
      for (let j = 0; j < g.height; ++j) {
        u[i][j] = 0;
        this.value[i][j] = 0;
      }
    }
    for (let i = 0; i < g.width; ++i) {
      for (let j = 0; j < g.height; ++j) {
        if (Grid.isInhabitable(g.tiles[i][j].cl)) this.value[i][j] += 1;
        switch (this.strategy) {
          case Strategy.persistent_greedy:
            if (Grid.isInhabitable(g.tiles[i][j].cl)) this.value[i][j] += 1;
            break;
          default:
        }

        switch (g.tiles[i][j].cl) {
          case TileClass.castle:
            if (this.strategy == Strategy.noble)
              g.spread(u, this.value, i, j, 32, 1);
            else
              g.spread(u, this.value, i, j, 16, 1);
            g.even(u, i, j, 0);
            break;
          case TileClass.town:
            g.spread(u, this.value, i, j, 8, 1);
            g.even(u, i, j, 0);
            break;
          case TileClass.village:
            if (this.strategy == Strategy.noble)
              g.spread(u, this.value, i, j, 2, 1);
            else
              g.spread(u, this.value, i, j, 4, 1);
            g.even(u, i, j, 0);
            break;
          case TileClass.mine:
            for (let d = 0; d < DIRECTIONS; ++d) {
              let ii = i + dirs[d][0];
              let jj = j + dirs[d][1];
              if (this.strategy == Strategy.midas)
                g.spread(u, this.value, ii, jj, 8, 1);
              else
                g.spread(u, this.value, ii, jj, 4, 1);
              g.even(u, ii, jj, 0);
            }
            break;
          default:
        }
      }
    }
    /* dumb down kings */
    let x;
    for (let i = 0; i < g.width; ++i) {
      for (let j = 0; j < g.height; ++j) {
        switch (dif) {
          case ConfigDif.dif_easiest:
            x = Math.floor(this.value[i][j] / 4);
            x = x + Math.floor(RAND() % 7) - 3;
            this.value[i][j] = MAX(0, x);
            break;
          case ConfigDif.dif_easy:
            x = Math.floor(this.value[i][j] / 2);
            x = x + Math.floor(RAND() % 3) - 1;
            this.value[i][j] = MAX(0, x);
            break;
          default:
        }
      }
    }
  }

  builder_default(c: Country, g: Grid, fg: FlagGrid) {
    let i_best = 0, j_best = 0;
    let v_best = 0.0;
    let v;

    for (let i = 0; i < g.width; ++i) {
      for (let j = 0; j < g.height; ++j) {

        let ok = false;
        if (g.tiles[i][j].pl == this.pl && Grid.isInhabitable(g.tiles[i][j].cl)) {
          ok = true;
          let di, dj;
          for (let n = 0; n < DIRECTIONS; ++n) {
            di = dirs[n][0];
            dj = dirs[n][1];
            if (i + di >= 0 && i + di < g.width &&
              j + dj >= 0 && j + dj < g.height &&
              Grid.isInhabitable(g.tiles[i + di][j + dj].cl)) {
              ok = ok && (g.tiles[i + di][j + dj].pl == this.pl);
            }
          }
        }

        let army = g.tiles[i][j].units[this.pl][UnitClass.citizen];
        let enemy = 0;
        for (let p = 0; p < MAX_PLAYER; ++p) {
          if (p != this.pl)
            enemy = enemy + g.tiles[i][j].units[p][UnitClass.citizen];
        }

        let base = 1.0;
        switch (g.tiles[i][j].cl) {
          case TileClass.grassland:
            base = 1.0;
            break;
          case TileClass.village:
            base = 8.0;
            break;
          case TileClass.town:
            base = 32.0;
            break;
          default:
            base = 0.0;
        }
        if (this.strategy == Strategy.midas)
          base *= (this.value[i][j] + 10);

        v = (ok ? 1 : 0) * base * (MAX_POP - army);
        if (army < Math.floor(MAX_POP / 10)) v = 0.0;

        if (v > 0.0 && v > v_best) {
          i_best = i;
          j_best = j;
          v_best = v;
        }
      }
    }
    if (v_best > 0.0)
      return King.build(g, c, this.pl, i_best, j_best);
    else
      return -1;
  }

  place_flags(g: Grid, fg: FlagGrid) {
    switch (this.strategy) {
      case Strategy.aggr_greedy:
        this.action_aggr_greedy(g, fg);
        break;
      case Strategy.one_greedy:
        this.action_one_greedy(g, fg);
        break;
      case Strategy.persistent_greedy:
        this.action_persistent_greedy(g, fg);
        break;
      case Strategy.opportunist:
        this.action_opportunist(g, fg);
        break;
      case Strategy.noble:
        this.action_noble(g, fg);
        break;
      case Strategy.midas:
        break;
      default:
        ;
    }
  }

  /* Auxiliary functions for different kings' strategies: */
  action_aggr_greedy(g: Grid, fg: FlagGrid) {
    for (let i = 0; i < g.width; ++i) {
      for (let j = 0; j < g.height; ++j) {
        if (fg.flag[i][j])
          g.remove_flag(fg, i, j, FLAG_POWER);

        // estimate the value of the grid point (i,j)
        let army = g.tiles[i][j].units[this.pl][UnitClass.citizen];
        let enemy = 0;
        for (let p = 0; p < MAX_PLAYER; ++p) {
          if (p != this.pl)
            enemy = enemy + g.tiles[i][j].units[p][UnitClass.citizen];
        }
        let v = this.value[i][j] * (2.0 * enemy - army) * Math.pow(army, 0.5);

        if (v > 5000)
          g.add_flag(fg, i, j, FLAG_POWER);
      }
    }
  }

  action_one_greedy(g: Grid, fg: FlagGrid) {
    let i_best = 0, j_best = 0;
    let v_best = -1.0;
    for (let i = 0; i < g.width; ++i) {
      for (let j = 0; j < g.height; ++j) {
        if (fg.flag[i][j])
          g.remove_flag(fg, i, j, FLAG_POWER);

        // estimate the value of the grid point (i,j)
        let army = g.tiles[i][j].units[this.pl][UnitClass.citizen];
        let enemy = 0;
        for (let p = 0; p < MAX_PLAYER; ++p) {
          if (p != this.pl)
            enemy = enemy + g.tiles[i][j].units[p][UnitClass.citizen];
        }
        let v = this.value[i][j] * (5.0 * enemy - army) * Math.pow(army, 0.5);

        if (v > v_best && v > 5000) {
          v_best = v;
          i_best = i;
          j_best = j;
        }
      }
    }
    if (v_best > 0)
      g.add_flag(fg, i_best, j_best, FLAG_POWER);
  }

  action_persistent_greedy(g: Grid, fg: FlagGrid) {
    for (let i = 0; i < g.width; ++i) {
      for (let j = 0; j < g.height; ++j) {
        // estimate the value of the grid point (i,j)
        let army = g.tiles[i][j].units[this.pl][UnitClass.citizen];
        let enemy = 0;
        for (let p = 0; p < MAX_PLAYER; ++p) {
          if (p != this.pl)
            enemy = enemy + g.tiles[i][j].units[p][UnitClass.citizen];
        }
        let v1 = this.value[i][j] * (2.5 * enemy - army) * Math.pow(army, 0.7);
        // weak opportunist
        let v2 = this.value[i][j] * (MAX_POP - (enemy - army)) * Math.pow(army, 0.7) * 0.5;
        if (enemy <= army) v2 = -10000;
        let v = MAX(v1, v2);

        if (fg.flag[i][j] == FLAG_ON) {
          if (v < 1000)
            g.remove_flag(fg, i, j, FLAG_POWER);
        } else {
          if (v > 9000)
            g.add_flag(fg, i, j, FLAG_POWER);
        }
      }
    }
  }

  action_opportunist(g: Grid, fg: FlagGrid) {
    for (let i = 0; i < g.width; ++i) {
      for (let j = 0; j < g.height; ++j) {
        if (fg.flag[i][j])
          g.remove_flag(fg, i, j, FLAG_POWER);

        // estimate the value of the grid point (i,j)
        let army = g.tiles[i][j].units[this.pl][UnitClass.citizen];
        let enemy = 0;
        for (let p = 0; p < MAX_PLAYER; ++p) {
          if (p != this.pl)
            enemy = enemy + g.tiles[i][j].units[p][UnitClass.citizen];
        }
        let v = this.value[i][j] * (MAX_POP - (enemy - army)) * Math.pow(army, 0.5);

        if (enemy > army && v > 7000)
          g.add_flag(fg, i, j, FLAG_POWER);
      }
    }
  }

  action_noble(g: Grid, fg: FlagGrid) {
    /* number of flags */
    let locval_len = 5;
    let loc: Position[] = [];
    let val: number[] = [];
    for(let i=0; i<locval_len; ++i) {
      loc[i] = no_loc;
      val[i] = -1;
    }

    for (let i = 0; i < g.width; ++i) {
      for (let j = 0; j < g.height; ++j) {
        if (fg.flag[i][j])
          g.remove_flag(fg, i, j, FLAG_POWER);

        // estimate the value of the grid point (i,j)
        let army = g.tiles[i][j].units[this.pl][UnitClass.citizen];
        let enemy = 0;
        for (let p = 0; p < MAX_PLAYER; ++p) {
          if (p != this.pl)
            enemy = enemy + g.tiles[i][j].units[p][UnitClass.citizen];
        }
        let v = this.value[i][j] * (MAX_POP - (enemy - army)) * Math.pow(army, 0.5);

        if (enemy > army && v > 7000) {
          //add_flag(g, fg, i, j, FLAG_POWER);
          let lx: Position = [i, j];
          // this.insert_locval(loc, val, locval_len, lx, v);
          let max = 0;
          for (max = 0; i < locval_len && max < MAX_PRIORITY && val[max] >= v; ++max) ;
          if (max < locval_len && max < MAX_PRIORITY) {
            for (let k = locval_len - 1; k > i; --k) {
              loc[k] = loc[k - 1];
              val[k] = val[k - 1];
            }
            loc[max] = lx;
            val[max] = v;
          }
        }
      }
    }
    for (let i = 0; i < locval_len && val[i] > 0; ++i) {
      g.add_flag(fg, loc[i][0], loc[i][1], FLAG_POWER);
    }
  }
}
