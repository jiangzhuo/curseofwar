const termkit = require('terminal-kit');
const term = termkit.terminal;
const TextBuffer = termkit.TextBuffer;
const ScreenBuffer = termkit.ScreenBuffer;


import { NEUTRAL, MAX_PLAYER, MAX_WIDTH, MAX_HEIGHT, MAX_TIMELINE_MARK, IN_SEGMENT } from "./Common";
import { ConfigSpeed, State, Timeline, UI } from "./State";
import { Tile, TileClass, UnitClass } from "./Grid";

export const CELL_STR_LEN = 3;
export const POSY = (ui, i, j) => ((j) + 1);
export const POSX = (ui, i, j) => ((i) * 4 + (j) * 2 + 1) - (ui.xskip * (CELL_STR_LEN + 1));

export const TIMELINE_HEIGHT = 14;

export class Output {
  private readonly keySBuf;
  private readonly keyTBuf;
  private readonly mapSBuf;
  private readonly mapTBuf;
  private readonly stateSBuf;
  private readonly stateTBuf;
  private readonly timelineSBuf;
  private readonly timelineTBuf;
  st: State;
  ui: UI;

  constructor(state: State, ui: UI) {
    this.st = state;
    this.ui = ui;

    this.mapSBuf = new ScreenBuffer({
      dst: term, width: MAX_WIDTH * 6, height: this.st.grid.height + 2, x: 1, y: 1
    });
    this.mapTBuf = new TextBuffer({
      dst: this.mapSBuf
    });
    this.mapTBuf.setEmptyCellAttr({
      bgColor: 'red'
    });
    this.mapTBuf.draw();
    this.mapSBuf.draw();

    this.stateSBuf = new ScreenBuffer({
      dst: term, width: MAX_WIDTH * 6, height: 5, x: 1, y: this.st.grid.height + 4
    });
    this.stateTBuf = new TextBuffer({
      dst: this.stateSBuf
    });
    this.stateTBuf.setEmptyCellAttr({
      bgColor: 'red'
    });
    this.stateTBuf.draw();
    this.stateSBuf.draw();

    this.keySBuf = new ScreenBuffer({
      dst: term, width: MAX_WIDTH * 6, height: 5, x: 1, y: this.st.grid.height + 10
    });
    this.keyTBuf = new TextBuffer({
      dst: this.keySBuf
    });
    this.keyTBuf.setEmptyCellAttr({
      bgColor: 'red'
    });
    this.keyTBuf.draw();
    this.keySBuf.draw();

    if (this.st.show_timeline) {
      this.timelineSBuf = new ScreenBuffer({
        dst: term, width: MAX_WIDTH * 6, height: 20, x: 1, y: this.st.grid.height + 16
      });
      this.timelineTBuf = new TextBuffer({
        dst: this.timelineSBuf
      });
      this.timelineTBuf.setEmptyCellAttr({
        bgColor: 'red'
      });
      this.timelineTBuf.draw();
      this.timelineSBuf.draw();
    }
  }


  static player_color(p: number) {
    switch (p) {
      case 0:
        return { color: 'white', bgColor: 'grey', bold: false }; // Neutral
      case 1:
        return { color: 'green', bgColor: 'grey', bold: false }; // Green (player)
      case 2:
        return { color: 'blue', bgColor: 'grey', bold: false }; // Blue
      case 3:
        return { color: 'red', bgColor: 'grey', bold: false }; // Red
      case 4:
        return { color: 'cyan', bgColor: 'grey', bold: false }; // Cyan
      case 5:
        return { color: 'magenta', bgColor: 'grey', bold: false }; // Magenta
      case 6:
        return { color: 'black', bgColor: 'grey', bold: false }; // Black
      case 7:
        return { color: 'yellow', bgColor: 'grey', bold: false }; // Yellow
      default:
        return {};
    }
  };

  static player_style(p: number) {
    let playerColor = Output.player_color(p);

    if (p != NEUTRAL) {
      playerColor.bold = true;
      return playerColor;
    } else {
      playerColor.bold = false;
      return playerColor;
    }
  };

  output_units(t: Tile, i: number, j: number, style: any) {

    let num = 0;
    for (let p = 0; p < MAX_PLAYER; ++p) {
      num += t.units[p][UnitClass.citizen];
    }

    let pop_to_symbol = (num: number): number => {
      if (num > 400)
        return 8;
      else if (num > 200)
        return 7;
      else if (num > 100)
        return 6;
      else if (num > 50)
        return 5;
      else if (num > 25)
        return 4;
      else if (num > 12)
        return 3;
      else if (num > 6)
        return 2;
      else if (num > 3)
        return 1;
      else if (num > 0)
        return 0;
      return -1;
    };

    this.mapTBuf.moveTo(POSX(this.ui, i, j), POSY(this.ui, i, j));
    switch (pop_to_symbol(num)) {
      case 8:
        this.mapTBuf.delete(3);
        this.mapTBuf.insert(":::", style);
        break;
      case 7:
        this.mapTBuf.delete(3);
        this.mapTBuf.insert(".::", style);
        break;
      case 6:
        this.mapTBuf.delete(3);
        this.mapTBuf.insert(" ::", style);
        break;
      case 5:
        this.mapTBuf.delete(3);
        this.mapTBuf.insert(".:.", style);
        break;
      case 4:
        this.mapTBuf.delete(3);
        this.mapTBuf.insert(".: ", style);
        break;
      case 3:
        this.mapTBuf.delete(3);
        this.mapTBuf.insert(" : ", style);
        break;
      case 2:
        this.mapTBuf.delete(3);
        this.mapTBuf.insert("...", style);
        break;
      case 1:
        this.mapTBuf.delete(3);
        this.mapTBuf.insert(".. ", style);
        break;
      case 0:
        this.mapTBuf.delete(3);
        this.mapTBuf.insert(" . ", style);
        break;
      default:
        return;
    }
  };

  /* A function to display information about the available keys that can be used by the player */
  output_key(y: number, x: number, key: string, key_style: any, s: string, s_style: any) {
    this.keyTBuf.moveTo(x, y);
    this.keyTBuf.insert(`[${key}]`, key_style);
    this.keyTBuf.setAttrAt(s_style, x, y);
    this.keyTBuf.setAttrAt(s_style, x + key.length + 1, y);
    this.keyTBuf.insert(s, s_style);
  };

  output_grid(ktime: number) {
    this.mapTBuf.setText('');
    for (let j = 0; j < this.st.grid.height; ++j) {
      for (let i = 0; i < this.st.grid.width; ++i) {
        this.mapTBuf.moveTo(POSX(this.ui, i, j) - 1, POSY(this.ui, i, j));
        switch (this.st.grid.tiles[i][j].cl) {
          case TileClass.mountain:
            this.mapTBuf.delete(5);
            this.mapTBuf.insert(" /\\^ ", { color: 'green', bgColor: 'grey' });
            break;
          case TileClass.mine:
            this.mapTBuf.delete(5);
            this.mapTBuf.insert(" /$\\ ", { color: 'green', bgColor: 'grey' });
            this.mapTBuf.setAttrAt(Output.player_style(this.st.grid.tiles[i][j].pl), POSX(this.ui, i, j) + 1, POSY(this.ui, i, j));
            // if (this.st.grid.tiles[i][j].pl != NEUTRAL) {
            //   // this.mapTBuf.setAttrAt({ color: 'yellow', bold: true }, POSX(this.ui, i, j) + 1, POSY(this.ui, i, j));
            //   this.mapTBuf.setAttrAt(Output.player_style(this.st.grid.tiles[i][j].pl), POSX(this.ui, i, j) + 1, POSY(this.ui, i, j));
            // } else {
            //   this.mapTBuf.setAttrAt({ color: 'white' }, POSX(this.ui, i, j) + 1, POSY(this.ui, i, j));
            // }
            break;
          /*
          case abyss:
            attrset(A_NORMAL | COLOR_PAIR(6));
            addstr("  %  ");
            break;
           */
          case TileClass.grassland:
            this.mapTBuf.delete(5);
            this.mapTBuf.insert("  -  ", { color: 'green', bgColor: 'grey' });
            break;
          case TileClass.village:
            this.mapTBuf.delete(5);
            this.mapTBuf.insert("  n  ", Output.player_style(this.st.grid.tiles[i][j].pl));
            break;
          case TileClass.town:
            this.mapTBuf.delete(5);
            this.mapTBuf.insert(" i=i ", Output.player_style(this.st.grid.tiles[i][j].pl));
            break;
          case TileClass.castle:
            this.mapTBuf.delete(5);
            this.mapTBuf.insert(" W#W ", Output.player_style(this.st.grid.tiles[i][j].pl));
            break;
          default:
            ;
        }

        if (this.st.grid.tiles[i][j].cl == TileClass.grassland) {
          this.output_units(this.st.grid.tiles[i][j], i, j, Output.player_style(this.st.grid.tiles[i][j].pl));
        }

        for (let p = 0; p < MAX_PLAYER; ++p) {
          if (p != this.st.controlled) {
            if (this.st.fg[p].flag[i][j] != 0 && ((ktime + p) / 5) % 10 < 10) {
              this.mapTBuf.moveTo(POSX(this.ui, i, j), POSY(this.ui, i, j));
              this.mapTBuf.delete();
              this.mapTBuf.insert('x', Output.player_style(p))
            }
          }
        }

        /* for of war */
        // for(let k=0; k<DIRECTIONS; ++k) {
        //   int di = dirs[k].i;
        //   int dj = dirs[k].j;
        //   if( i+di >= 0 && i+di < st->grid.width &&
        //   j+dj >= 0 && j+dj < st->grid.height &&
        //   (st->grid.tiles[i+di][j+dj].units[st->controlled][citizen] > 0) ) {
        //     b = 1;
        //     break;
        //   }
        // }
        // if (0 && !b){
        //   move(POSY(ui,i,j), POSX(ui,i,j)-1);
        //   addstr("     ");
        // }

        // player 1 flags
        if (this.st.fg[this.st.controlled].flag[i][j] != 0 && (ktime / 5) % 10 < 10) {
          // attrset(A_BOLD | COLOR_PAIR(1));
          // mvaddch(POSY(ui,i,j), POSX(ui,i,j)+2, 'P');
          // attrset(A_NORMAL | COLOR_PAIR(1));
          this.mapTBuf.moveTo(POSX(this.ui, i, j) + 2, POSY(this.ui, i, j));
          this.mapTBuf.delete();
          this.mapTBuf.insert('P', { color: 'white', bgColor: 'grey', bold: true });
        }
      }
    }

    // 玩家指针位置
    let i = this.ui.cursor[0];
    let j = this.ui.cursor[1];
    this.mapTBuf.moveTo(POSX(this.ui, i, j) - 1, POSY(this.ui, i, j));
    this.mapTBuf.delete();
    this.mapTBuf.insert('(', Output.player_style(this.st.controlled));
    this.mapTBuf.moveTo(POSX(this.ui, i + 1, j) - 1, POSY(this.ui, i + 1, j));
    this.mapTBuf.delete();
    this.mapTBuf.insert(')', Output.player_style(this.st.controlled));
    // // attrset(A_BOLD | COLOR_PAIR(1));
    // // mvaddch(POSY(ui,i,j), POSX(ui,i,j)-1, '(');
    // // mvaddch(POSY(ui,i+1,j), POSX(ui,i+1,j)-1, ')');
    // // attrset(A_NORMAL | COLOR_PAIR(1));


    this.mapTBuf.draw();
    this.mapSBuf.draw();

    /* print populations at the cursor */
    this.stateTBuf.setText('');
    // let y = POSY(ui, 0, this.st.grid.height) + 1;
    // mvaddstr(y, 0, " Gold:");
    this.stateTBuf.moveTo(1, 1);
    this.stateTBuf.insert("Gold:    ", { color: 'white', bgColor: 'grey' });
    this.stateTBuf.insert(`${this.st.country[this.st.controlled].gold}`, { color: 'yellow', bgColor: 'grey' });
    this.stateTBuf.moveTo(1, 2);
    this.stateTBuf.insert("Prices:  160, 240, 320.", { color: 'white', bgColor: 'grey' });
    this.stateTBuf.moveTo(1, 3);
    this.stateTBuf.insert("Speed: ", { color: 'white', bgColor: 'grey' });
    switch (this.st.speed) {
      case ConfigSpeed.sp_fastest:
        this.stateTBuf.insert("Fastest", Output.player_style(this.st.controlled));
        break;
      case ConfigSpeed.sp_faster:
        this.stateTBuf.insert("Faster ", Output.player_style(this.st.controlled));
        break;
      case ConfigSpeed.sp_fast:
        this.stateTBuf.insert("Fast   ", Output.player_style(this.st.controlled));
        break;
      case ConfigSpeed.sp_normal:
        this.stateTBuf.insert("Normal ", Output.player_style(this.st.controlled));
        break;
      case ConfigSpeed.sp_slow:
        this.stateTBuf.insert("Slow   ", Output.player_style(this.st.controlled));
        break;
      case ConfigSpeed.sp_slower:
        this.stateTBuf.insert("Slower ", Output.player_style(this.st.controlled));
        break;
      case ConfigSpeed.sp_slowest:
        this.stateTBuf.insert("Slowest", Output.player_style(this.st.controlled));
        break;
      case ConfigSpeed.sp_pause:
        this.stateTBuf.insert("Pause  ", Output.player_style(this.st.controlled));
        break;
    }

    this.stateTBuf.moveTo(30, 2);
    this.stateTBuf.insert("Population at the cursor:", { color: 'white', bgColor: 'grey' });
    for (let p = 0; p < MAX_PLAYER; ++p) {
      if (p == NEUTRAL) continue;
      this.stateTBuf.moveTo(30 + p * 5, 3);
      this.stateTBuf.insert(this.st.grid.tiles[i][j].units[p][UnitClass.citizen].toString(), Output.player_style(p));
    }

    this.stateTBuf.moveTo(63, 1);
    this.stateTBuf.insert("Date:", { color: 'white', bgColor: 'grey' });
    let date = new Date(this.st.time * 3600 * 24 * 1000);
    this.stateTBuf.insert(`${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`, Output.player_style(this.st.controlled));

    this.stateTBuf.draw();
    this.stateSBuf.draw();


    let text_style = { color: 'white' };
    let key_style = Output.player_style(this.st.controlled);

    this.keyTBuf.setText('');
    this.output_key(1, 1, "Space", key_style, "add/remove a flag", text_style);
    this.output_key(2, 1, "R or V", key_style, "build", text_style);

    this.output_key(1, 30, "X", key_style, "remove all flags", text_style);
    this.output_key(2, 30, "C", key_style, "remove 50\% of flags", text_style);

    this.output_key(2, 57, "S", key_style, "slow down", text_style);
    this.output_key(1, 57, "F", key_style, "speed up", text_style);
    this.output_key(3, 57, "P", key_style, "pause", text_style);
    this.keyTBuf.draw();
    this.keySBuf.draw();
  };

  output_timeline() {
    this.timelineTBuf.setText('');

    let t: Timeline = this.st.timeline;
    let non_zero = []

    for (let p = 0; p < MAX_PLAYER; ++p) {
      non_zero[p] = 0;
      for (let i = 0; i <= t.mark; ++i) {
        let v = t.data[p][i];
        if (v >= 0.1) non_zero[p] = 1;
      }
    }

    let max = Number.MIN_VALUE;
    let min = Number.MAX_VALUE;

    for (let p = 0; p < MAX_PLAYER; ++p) {
      if (non_zero[p]) {
        for (let i = 0; i <= t.mark; ++i) {
          let v = t.data[p][i];
          if (v > max) max = v;
          if (v < min) min = v;
        }
      }
    }

    /* adjust when min is close to max */
    // console.log(max, min)
    if (max - min < 0.1) max = min + 0.1;
    let one_over_delta = 1.0 / (max - min);
    // let one_over_delta = 1.0;

    let y0 = 1;
    let x0 = 1;

    /* clean plotting area */
    for (let j = 0; j < TIMELINE_HEIGHT + 1; ++j) {
      this.timelineTBuf.moveTo(x0, y0 + j);
      for (let i = 0; i < MAX_TIMELINE_MARK + 2; ++i) {
        if (j == TIMELINE_HEIGHT) {
          this.timelineTBuf.insert(' ', { color: 'white', bgColor: 'black' });
        } else {
          this.timelineTBuf.insert(' ', { color: 'white', bgColor: 'grey' });
        }
      }
    }

    let x_shift_year = -1;
    for (let i = 1 - x_shift_year; i <= t.mark; ++i) {
      let date1 = new Date(t.time[i - 1] * 3600 * 24 * 1000);
      let date2 = new Date(t.time[i] * 3600 * 24 * 1000);
      if (date1.getUTCFullYear() < date2.getUTCFullYear()) {
        this.timelineTBuf.moveTo(x0 + i + x_shift_year, y0 + TIMELINE_HEIGHT - 1 + 1);
        this.timelineTBuf.delete(4);
        this.timelineTBuf.insert(date2.getUTCFullYear().toString(), { color: 'white', bgColor: 'black' });
        for (let j = 0; j < TIMELINE_HEIGHT - 1; ++j) {
          this.timelineTBuf.moveTo(x0 + i, y0 + j);
          this.timelineTBuf.delete();
          this.timelineTBuf.insert('.');
        }
      }
    }


    let store_pl_row = [];
    for (let i = 0; i <= t.mark; ++i) {
      let c = '-';
      // let c = t.mark.toString();
      for (let pp = 0; pp <= MAX_PLAYER; ++pp) {
        let p = (pp + i) % MAX_PLAYER;
        if (pp == MAX_PLAYER) {
          p = this.st.controlled;
          c = '*';
        }
        if (non_zero[p]) {
          let dx = i;
          let v = Math.round((TIMELINE_HEIGHT - 1) * (t.data[p][i] - min) * one_over_delta);
          let dy = TIMELINE_HEIGHT - 1 - v;
          dy = IN_SEGMENT(dy, 0, TIMELINE_HEIGHT - 1);
          /* save the row for later use */
          if (i == t.mark) {
            store_pl_row[p] = { p: p, dy, val: t.data[p][t.mark] }; /* 0 = maximum, TIMELINE_HEIGHT-1 = minimum */
            // this.timelineTBuf.moveTo(x0 + 100, y0 + dy);
            // this.timelineTBuf.delete(t.data[p][t.mark].toString());
            // this.timelineTBuf.insert(t.data[p][t.mark].toString(), Output.player_style(p));
          }
          this.timelineTBuf.moveTo(x0 + dx, y0 + dy);
          this.timelineTBuf.delete();
          this.timelineTBuf.insert(c, Output.player_style(p));
        }
      }
    }

    for (let j = 0; j < TIMELINE_HEIGHT + 1; ++j) {
      this.timelineTBuf.moveTo(x0, y0 + j);
      for (let i = 0; i < 7; ++i) {
        this.timelineTBuf.insert(' ', { color: 'white', bgColor: 'black' });
      }
      this.timelineTBuf.moveTo(MAX_TIMELINE_MARK + 10, y0 + j);
      for (let i = 0; i < 36; ++i) {
        this.timelineTBuf.insert(' ', { color: 'white', bgColor: 'black' });
      }
    }

    // console.log(store_pl_row)
    let lastDy = -100;
    for (let row of store_pl_row) {
      if (row) {
        if (lastDy != row.dy) {
          this.timelineTBuf.moveTo(MAX_TIMELINE_MARK + 10, y0 + row.dy);
        }
        this.timelineTBuf.delete(row.val.toString().length);
        this.timelineTBuf.insert(row.val.toString(), Output.player_style(row.p));
        lastDy = row.dy
      }
    }

    this.timelineTBuf.moveTo(x0, y0);
    this.timelineTBuf.delete(max.toString().length);
    this.timelineTBuf.insert(max.toString(), { color: 'white', bgColor: 'black' });
    this.timelineTBuf.moveTo(x0, y0 + TIMELINE_HEIGHT);
    this.timelineTBuf.delete(min.toString().length);
    this.timelineTBuf.insert(min.toString(), { color: 'white', bgColor: 'black' });


    /* add values */
    // let pl_arr=[];
    // let val_arr=[];
    // for (let i = 0; i < TIMELINE_HEIGHT; ++i) {
    //   pl_arr[i] = 0;
    //   val_arr[i] = 0.0;
    // }
    // for (let p=1; p<MAX_PLAYER; ++p) {
    //   if (non_zero[p])
    //     insert_position(pl_arr, val_arr, store_pl_row[p], p, t.data[p][t.mark]);
    // }
    // for (let i = 0; i < TIMELINE_HEIGHT; ++i) {
    //   if (pl_arr[i] != 0) {
    //     let dx = t.mark + 3;
    //     let dy = i;
    //     this.timelineTBuf.move(x0 + dx, y0 + dy);
    //     this.timelineTBuf.insert(val_arr[i].toString(), Output.player_style(pl_arr[i]))
    //   }
    // }


    this.timelineTBuf.draw();
    this.timelineSBuf.draw();
  }
}
