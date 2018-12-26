import { Output } from "./Output";
import { game_slowdown, get_options, win_or_lose } from "./main-common";
import { BasicOptions, ConfigSpeed, faster, MultiOptions, slower, State, UI } from "./State";
import { FLAG_POWER } from "./Grid";
import { King } from "./King";


let op = new BasicOptions();
let mop = new MultiOptions();

if (!get_options(op, mop)) {
  process.exit(1)
}
const term = require( 'terminal-kit' ).terminal ;
term.fullscreen();
term.hideCursor();
term.grabInput();

function terminate() {
  clearInterval(outputInterval);
  setTimeout(() => {
    //term.brightBlack( 'About to exit...\n' ) ;
    term.hideCursor(false);
    term.grabInput(false);
    term.fullscreen(false);
    term.applicationKeypad(false);
    term.beep();

    // Add a 100ms delay, so the terminal will be ready when the process effectively exit, preventing bad escape sequences drop
    setTimeout(() => {
      console.log(`Random seed was ${st.map_seed}\n`);
      process.exit();
    }, 100);
  }, 100);
}
term.on('key', function (name, matches, data) {
  // console.log("'key' event:", name);

  // Detect CTRL-C and exit 'manually'
  if (name === 'CTRL_C') {
    terminate();
  }
  if (name === 'Q' || name === 'q') {
    //todo dialog_quit_confirm
  }


  let cursi = ui.cursor[0];
  let cursj = ui.cursor[1];
  switch (name) {
    case 'q': case 'Q':
      return 1;
    case 'f':
      st.prev_speed = st.speed;
      st.speed = faster(st.speed);
      break;
    case 's':
      st.prev_speed = st.speed;
      st.speed = slower(st.speed);
      break;
    case 'p':
      if (st.speed == ConfigSpeed.sp_pause)
        st.speed = st.prev_speed;
      else {
        st.prev_speed = st.speed;
        st.speed = ConfigSpeed.sp_pause;
      }
      break;
    case 'h': case 'LEFT':
      cursi--;
      break;
    case 'l': case 'RIGHT':
      cursi++;
      break;
    case 'k': case 'UP':
      cursj--;
      if (cursj % 2 == 1)
        cursi++;
      break;
    case 'j': case 'DOWN':
      cursj++;
      if (cursj % 2 == 0)
        cursi--;
      break;
    case ' ':
      if (st.fg[st.controlled].flag[ui.cursor[0]][ui.cursor[1]] == 0)
        st.grid.add_flag (st.fg[st.controlled], ui.cursor[0], ui.cursor[1], FLAG_POWER);
    else
        st.grid.remove_flag ( st.fg[st.controlled], ui.cursor[0], ui.cursor[1], FLAG_POWER);
      break;
    case 'x':
      st.grid.remove_flags_with_prob (st.fg[st.controlled], 1.0);
      break;
    case 'c':
      st.grid.remove_flags_with_prob (st.fg[st.controlled], 0.5);
      break;
    case 'r':
    case 'v':
      King.build(st.grid, st.country[st.controlled], st.controlled, ui.cursor[0], ui.cursor[1]);
      break;
  }

  st.adjust_cursor(ui, cursi, cursj);
});

const win_or_lose_message = (st: State, k: number) => {
  if (k%100 == 0) {
    switch(win_or_lose(st)) {
      case 1:
        // attrset(A_BOLD | COLOR_PAIR(4));
        // mvaddstr(2 + st.grid.height, 31, "You are victorious!");
        break;
      case -1:
        // attrset(A_BOLD | COLOR_PAIR(2));
        // mvaddstr(2 + st.grid.height, 31, "You are defeated!");
        break;
      default:
        ;
    }
  }
};

let outputInterval;
/* Run the game */
const run = (st: State, ui: UI) => {
  let k = 0;
  let finished = 0;
  outputInterval = setInterval(()=>{
    k++;
    if (k >= 1600) k = 0;

    // output.output_grid(k);
    let slowdown = game_slowdown(st.speed);
    if (k % slowdown == 0 && st.speed != ConfigSpeed.sp_pause) {
      st.kings_move();
      st.simulate();
      if (st.show_timeline) {
        if (st.time%10 == 0)
          st.update_timeline();
      }
    }
    output.output_grid(k);
    if (st.show_timeline) {
      if (st.time%10 == 0)
        output.output_timeline();
    }
    time_to_redraw = 0;
    win_or_lose_message(st, k);
  },16);
};
let time_to_redraw = 0;
let st = new State(op,mop);
let ui = new UI(st);

let output = new Output(st, ui);

time_to_redraw = 1;
if(!mop.multiplayer_flag){
  run(st,ui)
}else{

  // if (mop.server_flag){
  //   run_server(&st, mop.clients_num, mop.val_server_port);
  // } else{
  //   run_client(&st, &ui, mop.val_server_addr, mop.val_server_port, mop.val_client_port);
  // }
}
// process.exit(0);
