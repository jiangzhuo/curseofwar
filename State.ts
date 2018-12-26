import { FlagGrid, Grid, Position, Stencil, TileClass, UnitClass, dirs } from "./Grid";
import { Country, King, Strategy } from "./King";
import {
  DIRECTIONS,
  MAX_PLAYER,
  MAX_TIMELINE_MARK,
  MAX_WIDTH,
  NEUTRAL,
  RAND,
  RAND_ROUND,
  SRAND,
  MAX,
  MAX_POP,
  MIN,
  MAX_HEIGHT,
  IN_SEGMENT
} from "./Common";

export const GROWTH_1 = 1.10;
export const GROWTH_2 = 1.20;
export const GROWTH_3 = 1.30;

export const ATTACK = 0.1;
export const MOVE = 0.05;
export const CALL_MOVE = 0.10;

export enum ConfigSpeed {
  sp_pause,
  sp_slowest,
  sp_slower,
  sp_slow,
  sp_normal,
  sp_fast,
  sp_faster,
  sp_fastest
}

export const faster = (sp: ConfigSpeed): ConfigSpeed => {
  switch (sp) {
    case ConfigSpeed.sp_pause:
      return ConfigSpeed.sp_slowest;
    case ConfigSpeed.sp_slowest:
      return ConfigSpeed.sp_slower;
    case ConfigSpeed.sp_slower:
      return ConfigSpeed.sp_slow;
    case ConfigSpeed.sp_slow:
      return ConfigSpeed.sp_normal;
    case ConfigSpeed.sp_normal:
      return ConfigSpeed.sp_fast;
    case ConfigSpeed.sp_fast:
      return ConfigSpeed.sp_faster;
    default:
      return ConfigSpeed.sp_fastest;
  }
};

export const slower = (sp: ConfigSpeed): ConfigSpeed => {
  switch (sp) {
    case ConfigSpeed.sp_fastest:
      return ConfigSpeed.sp_faster;
    case ConfigSpeed.sp_faster:
      return ConfigSpeed.sp_fast;
    case ConfigSpeed.sp_fast:
      return ConfigSpeed.sp_normal;
    case ConfigSpeed.sp_normal:
      return ConfigSpeed.sp_slow;
    case ConfigSpeed.sp_slow:
      return ConfigSpeed.sp_slower;
    case ConfigSpeed.sp_slower:
      return ConfigSpeed.sp_slowest;
    default:
      return ConfigSpeed.sp_pause;
  }
};

export enum ConfigDif {
  dif_easiest,
  dif_easy,
  dif_normal,
  dif_hard,
  dif_hardest
}

export class UI {
  cursor: Position;
  xskip: number; /* number of tiles to skip in the beginning of every line */
  xlength: number; /* total max number of tiles in horizontal direction */

  constructor(s: State) {

    /* cursor location */
    this.cursor = [Math.floor(s.grid.width / 2), Math.floor(s.grid.height / 2)];
    for (let i = 0; i < s.grid.width; ++i) {
      for (let j = 0; j < s.grid.height; ++j) {
        if (s.grid.tiles[i][j].units[s.controlled][UnitClass.citizen] >
          s.grid.tiles[this.cursor[0]][this.cursor[1]].units[s.controlled][UnitClass.citizen]) {
          this.cursor[0] = i;
          this.cursor[1] = j;
        }
      }
    }
    /* find the leftmost visible tile */
    let xskip_x2 = MAX_WIDTH * 2 + 1;
    let xrightmost_x2 = 0;
    for (let i = 0; i < s.grid.width; ++i)
      for (let j = 0; j < s.grid.height; ++j)
        if (Grid.isVisible(s.grid.tiles[i][j].cl)) {
          let x = i * 2 + j;
          if (xskip_x2 > x)
            xskip_x2 = x;
          if (xrightmost_x2 < x)
            xrightmost_x2 = x;
        }
    this.xskip = Math.floor(xskip_x2 / 2);
    this.xlength = Math.floor((xrightmost_x2 + 1) / 2) - Math.floor(xskip_x2 / 2);
  }
}

/* struct timeline */
export class Timeline {
  data: number[][] = [];  /* stored data */
  time: number[] = [];  /* time when data was recorded */
  mark: number = -1; /* the most recently updated time mark.
               It can be used as index in two other fields, i.e.
               0 <= mark < MAX_TIMELINE_MARK */
}

export class BasicOptions {
  keep_random_flag: number;
  dif: ConfigDif;
  speed: ConfigSpeed;
  w: number;
  h: number;
  loc_num: number;  // the number of starting locations
  map_seed: number;
  conditions: number;
  timeline_flag: number;

  inequality: number;
  shape: Stencil;
}

/* multiplayer arguments */
export class MultiOptions {
  multiplayer_flag: number;
  server_flag: number;

  val_client_port: string;
  val_server_addr: string;
  val_server_port: string;
  clients_num: number;
}

/*
  struct state

    Game state

    Members:
      grid in sthe map grid
      flag_grid[] is the array of flag grids (different for each player)
      country[] is the array of countries

      king is the array of AI opponents
      kings_num is the number of AI opponents

      controlled is the player id of the human controlled player

      condiitions is the initial conditions quality (0==random, 1==best, 4==worst)

      inequality (from 0 to 4) is the level of countries' inequality

      speed and dif are the game speed and the difficulty level
 */
export class State {

  grid: Grid;
  fg: FlagGrid[] = [];
  king: King[] = [];
  kings_num: number;

  timeline: Timeline;
  show_timeline: number;

  country: Country[] = [];

  time: number;

  map_seed: number;

  controlled: number;

  conditions: number;
  inequality: number;

  speed: ConfigSpeed;
  prev_speed: ConfigSpeed;
  dif: ConfigDif;

  constructor(op: BasicOptions, mop: MultiOptions) {

    this.speed = op.speed;
    this.prev_speed = this.speed;
    this.dif = op.dif;
    this.map_seed = op.map_seed;
    this.conditions = op.conditions;
    this.inequality = op.inequality;
    this.time = (RAND() % 30) * 360 + RAND() % 360;

    /* player controlled from the keyboard */
    this.controlled = 1;
    /* int players[] = {7, 2, 3, 5}; */
    /* int players[] = {2, 3, 4, 5, 6, 7}; */

    let all_players: number[] = [1, 2, 3, 4, 5, 6, 7];
    let comp_players: number[] = [];
    let comp_players_num = 7 - mop.clients_num;

    this.kings_num = comp_players_num;
    let ui_players: number[] = [];
    let ui_players_num = mop.clients_num;
    for (let i = 0; i < 7; ++i) {
      if (i < mop.clients_num) {
        ui_players[i] = all_players[i];
      } else {
        let j = i - mop.clients_num; /* computer player index / king's index */
        comp_players[j] = all_players[i];
        switch (i) {
          case 1:
            this.king[j] = new King(i + 1, Strategy.opportunist, this.grid, this.dif);
            break;
          case 2:
            this.king[j] = new King(i + 1, Strategy.one_greedy, this.grid, this.dif);
            break;
          case 3:
            this.king[j] = new King(i + 1, Strategy.none, this.grid, this.dif);
            break;
          case 4:
            this.king[j] = new King(i + 1, Strategy.aggr_greedy, this.grid, this.dif);
            break;
          case 5:
            this.king[j] = new King(i + 1, Strategy.noble, this.grid, this.dif);
            break;
          case 6:
            this.king[j] = new King(i + 1, Strategy.persistent_greedy, this.grid, this.dif);
            break;
        }
      }
    }

    /* Initialize map generation with the map_seed */
    SRAND(this.map_seed);

    /* Map generation starts */
    let conflict_code = 0;
    do {
      this.grid = new Grid(op.w, op.h);

      /* starting locations arrays */
      let loc_arr: Position[] = [];
      let available_loc_num = 0;
      let d = 2;
      available_loc_num = this.grid.apply_stencil(op.shape, d, loc_arr);

      /* conflict mode */
      conflict_code = 0;
      if (!op.keep_random_flag)
        conflict_code = this.grid.conflict(loc_arr, available_loc_num,
          comp_players, comp_players_num, op.loc_num, ui_players, ui_players_num, this.conditions, this.inequality);
    } while (conflict_code != 0 || !this.grid.isConnected());
    /* Map is ready */

    for (let p = 0; p < MAX_PLAYER; ++p) {
      this.fg[p] = new FlagGrid(op.w, op.h);
      this.country[p] = new Country();
    }

    /* kings evaluate the map */
    for (let p = 0; p < this.kings_num; ++p) {
      this.king[p].king_evaluate_map(this.grid, this.dif);
    }

    /* Zero timeline */
    this.show_timeline = op.timeline_flag;
    this.timeline = new Timeline();
    for (let i = 0; i < MAX_TIMELINE_MARK; ++i) {
      this.timeline.time[i] = this.time;
      for (let p = 0; p < MAX_PLAYER; ++p) {
        if (!this.timeline.data[p]) {
          this.timeline.data[p] = [];
        }
        this.timeline.data[p][i] = 0.0;
      }
    }
  }

  kings_move() {
    let ev = false;
    for (let i = 0; i < this.kings_num; ++i) {
      let pl = this.king[i].pl;
      this.king[i].place_flags(this.grid, this.fg[pl]);
      let code = this.king[i].builder_default(this.country[pl], this.grid, this.fg[pl]);
      ev = ev || (code == 0);
    }
    if (ev) {
      for (let i = 0; i < this.kings_num; ++i) {
        this.king[i].king_evaluate_map(this.grid, this.dif);
      }
    }
  }

  static growth(t: TileClass) {
    switch (t) {
      case TileClass.village:
        return GROWTH_1;
      case TileClass.town:
        return GROWTH_2;
      case TileClass.castle:
        return GROWTH_3;
      default:
        return 0;
    }
  }

  simulate() {
    // console.log('simulate')
    let t = this.grid.tiles;
    // struct tile (* t) [MAX_HEIGHT] = s.grid.tiles;
    let enemy_pop: number[] = [];
    let my_pop: number[] = [];

    let need_to_reeval = 0;

    /* increment time */
    this.time++;

    /* per tile events */
    for (let i = 0; i < this.grid.width; ++i) {
      for (let j = 0; j < this.grid.height; ++j) {
        /* mines ownership */
        if (t[i][j].cl == TileClass.mine) {
          let owner = NEUTRAL;
          for (let k = 0; k < DIRECTIONS; ++k) {
            let di = dirs[k][0];
            let dj = dirs[k][1];
            if (i + di >= 0 && i + di < this.grid.width &&
              j + dj >= 0 && j + dj < this.grid.height &&
              Grid.isInhabitable(t[i + di][j + dj].cl)) {
              let pl = t[i + di][j + dj].pl;
              if (owner == NEUTRAL)
                owner = pl;
              else if (owner != pl && pl != NEUTRAL)
                owner = -1;
            }
          }
          if (owner != -1)
            t[i][j].pl = owner;
          else
            t[i][j].pl = NEUTRAL;

          if (t[i][j].pl != NEUTRAL)
            this.country[owner].gold += 1;
        }

        /* fight */
        let total_pop = 0;
        for (let p = 0; p < MAX_PLAYER; ++p) {
          my_pop[p] = t[i][j].units[p][UnitClass.citizen];
          total_pop += my_pop[p];
        }
        let defender_dmg = 0;
        for (let p = 0; p < MAX_PLAYER; ++p) {
          enemy_pop[p] = total_pop - my_pop[p];
          // console.log(p,enemy_pop[p] , my_pop[p] , total_pop)
          let dmg = RAND_ROUND(enemy_pop[p] * my_pop[p] / total_pop) || 0;
          t[i][j].units[p][UnitClass.citizen] = MAX(my_pop[p] - dmg, 0);

          if (t[i][j].pl == p)
            defender_dmg = dmg;
        }

        /* burning cities */
        if (defender_dmg > 2.0 * MAX_POP * ATTACK && Grid.isCity(t[i][j].cl)) {
          if (RAND() % 1 == 0) {
            need_to_reeval = 1;
            King.degrade(this.grid, i, j);
          }
        }

        /* determine ownership */
        if (Grid.isInhabitable(t[i][j].cl)) {
          t[i][j].pl = NEUTRAL;
          for (let p = 0; p < MAX_PLAYER; ++p) {
            if (t[i][j].units[p][UnitClass.citizen] > t[i][j].units[t[i][j].pl][UnitClass.citizen]) {
              t[i][j].pl = p;
            }
          }
        }

        if (Grid.isCity(t[i][j].cl)) {
          /* population growth */
          let owner = t[i][j].pl;
          let pop = t[i][j].units[owner][UnitClass.citizen];
          let fnpop = pop * State.growth(t[i][j].cl);
          let npop = RAND_ROUND(fnpop);
          npop = MIN(npop, MAX_POP);
          /* death */
          //npop = npop - rnd_round(0.01*pow(pop,1.5));
          //npop = npop - rnd_round(1.0e-20 * pow(2.0,pop));
          //npop = MAX(npop, 0);
          t[i][j].units[owner][UnitClass.citizen] = npop;
        }
      }
    }
    /* migration */
    let di, dj;

    let i_start, i_end, i_inc;
    let j_start, j_end, j_inc;

    if (RAND() % 2 == 0) {
      i_start = 0;
      i_end = this.grid.width;
      i_inc = 1;
    } else {
      i_start = this.grid.width - 1;
      i_end = -1;
      i_inc = -1;
    }

    if (RAND() % 2 == 0) {
      j_start = 0;
      j_end = this.grid.height;
      j_inc = 1;
    } else {
      j_start = this.grid.height - 1;
      j_end = -1;
      j_inc = -1;
    }

    for (let i = i_start; i != i_end; i += i_inc) {
      for (let j = j_start; j != j_end; j += j_inc) {
        for (let p = 0; p < MAX_PLAYER; ++p) {
          let initial_pop = t[i][j].units[p][UnitClass.citizen];

          let k_shift = RAND() % DIRECTIONS;
          for (let k = 0; k < DIRECTIONS; ++k) {
            di = dirs[(k + k_shift) % DIRECTIONS][0];
            dj = dirs[(k + k_shift) % DIRECTIONS][1];
            if (i + di >= 0 && i + di < this.grid.width &&
              j + dj >= 0 && j + dj < this.grid.height &&
              Grid.isInhabitable(t[i + di][j + dj].cl)) {
              let pop = t[i][j].units[p][UnitClass.citizen];
              let dcall = MAX(0, this.fg[p].call[i + di][j + dj] - this.fg[p].call[i][j]);
              if (pop > 0) {
                let dpop = RAND_ROUND(MOVE * initial_pop + CALL_MOVE * dcall * initial_pop);
                dpop = MIN(dpop, pop);
                dpop = MIN(dpop, MAX_POP - t[i + di][j + dj].units[p][UnitClass.citizen]);
                t[i + di][j + dj].units[p][UnitClass.citizen] += dpop;
                t[i][j].units[p][UnitClass.citizen] -= dpop;
              }
            }
          }
        }
      }
    }

    /* determine ownership again */
    for (let i = 0; i < this.grid.width; ++i) {
      for (let j = 0; j < this.grid.height; ++j) {
        if (Grid.isInhabitable(t[i][j].cl)) {
          t[i][j].pl = NEUTRAL;
          for (let p = 0; p < MAX_PLAYER; ++p) {
            if (t[i][j].units[p][UnitClass.citizen] > t[i][j].units[t[i][j].pl][UnitClass.citizen]) {
              t[i][j].pl = p;
            }
          }
        }
      }
    }
    /* Kings reevaluate the map */
    if (need_to_reeval) {
      for (let i = 0; i < this.kings_num; ++i) {
        this.king[i].king_evaluate_map(this.grid, this.dif);
      }
    }

    /* give gold to AI on hard difficulties */
    let add_gold = 0;
    switch (this.dif) {
      case ConfigDif.dif_hard:
        add_gold = 1;
        break;
      case ConfigDif.dif_hardest:
        add_gold = 2;
        break;
      default:
        ;
    }
    for (let i = 0; i < MAX_PLAYER; ++i) {
      if (i != NEUTRAL && i != this.controlled && this.country[i].gold > 0)
        this.country[i].gold += add_gold;
    }
  }

  update_timeline() {
    /* shortcut notation */
    let t: Timeline = this.timeline;

    /* prepare to update */
    if (t.mark + 1 < MAX_TIMELINE_MARK)
      t.mark += 1;
    else {
      /* shift all recorded data to empty space */
      for (let i = 0; i < MAX_TIMELINE_MARK - 1; ++i) {
        t.time[i] = t.time[i + 1];
        for (let p = 0; p < MAX_PLAYER; ++p) {
          t.data[p][i] = t.data[p][i + 1];
        }
      }
    }

    /* insert a new datapoint at position t.mark */
    t.time[t.mark] = this.time;
    /* we compute total population here */
    for (let p = 0; p < MAX_PLAYER; ++p) {
      let count = 0;
      for (let i = 0; i < MAX_WIDTH; ++i) {
        for (let j = 0; j < MAX_HEIGHT; ++j) {
          if (this.grid.tiles[i] && this.grid.tiles[i][j]) {
            count += this.grid.tiles[i][j].units[p][UnitClass.citizen];
          }
        }
      }
      t.data[p][t.mark] = count;
    }
    /* call output_timeline to print it out */
  }

  adjust_cursor(ui: UI, cursi: number, cursj: number) {
    cursi = IN_SEGMENT(cursi, 0, this.grid.width - 1);
    cursj = IN_SEGMENT(cursj, 0, this.grid.height - 1);
    if (Grid.isVisible(this.grid.tiles[cursi][cursj].cl)) {
      ui.cursor[0] = cursi;
      ui.cursor[1] = cursj;
    } else if (Grid.isVisible(this.grid.tiles[ui.cursor[0]][cursj].cl)) {
      ui.cursor[1] = cursj;
    } else {
      let i = cursi - 1;
      i = IN_SEGMENT(i, 0, this.grid.width - 1);
      if (Grid.isVisible(this.grid.tiles[i][cursj].cl)) {
        ui.cursor[0] = i;
        ui.cursor[1] = cursj;
      } else {
        i = cursi + 1;
        i = IN_SEGMENT(i, 0, this.grid.width - 1);
        if (Grid.isVisible(this.grid.tiles[i][cursj].cl)) {
          ui.cursor[0] = i;
          ui.cursor[1] = cursj;
        }
      }
    }
  }
}
