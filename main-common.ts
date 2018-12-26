import { BasicOptions, ConfigDif, ConfigSpeed, MultiOptions, State, UI } from "./State";
import { MAX, RAND, MIN, MAX_WIDTH, MAX_PLAYER } from "./Common";
import { Grid, RANDOM_INEQUALITY, Stencil, UnitClass } from "./Grid";
import * as minimist from 'minimist';


export const DEF_SERVER_ADDR = "127.0.0.1";
export const DEF_SERVER_PORT = "19140";
export const DEF_CLIENT_PORT = "19150";

export const get_options = (op: BasicOptions, mop: MultiOptions) => {
  op.keep_random_flag = 0; // random
  op.dif = ConfigDif.dif_normal; // diffiulty
  op.speed = ConfigSpeed.sp_normal; // speed
  op.w = 21; // width
  op.h = 21; // height
  op.loc_num = 0;  // the number of starting locations
  op.map_seed = RAND();
  op.conditions = 0;
  op.timeline_flag = 0;

  op.inequality = RANDOM_INEQUALITY;
  op.shape = Stencil.st_rect;

  /* multiplayer option */
  mop.clients_num = 1;
  mop.multiplayer_flag = 0;
  mop.server_flag = 1;

  mop.val_client_port = DEF_CLIENT_PORT;
  mop.val_server_addr = DEF_SERVER_ADDR;
  mop.val_server_port = DEF_SERVER_PORT;

  let conditions_were_set = 0;
  const argv = minimist(process.argv)

  if (argv['r']) {
    op.keep_random_flag = 1
  }
  if (argv['T']) {
    op.timeline_flag = 1
  }
  if (argv['W']) {
    op.w = MAX(14, argv['W'])
  }
  if (argv['H']) {
    op.h = MAX(14, argv['H'])
  }
  if (argv['i']) {
    op.inequality = argv['i']
  }
  if (argv['l']) {
    op.loc_num = argv['l']
  }
  if (argv['q']) {
    op.conditions = argv['q']
    conditions_were_set = 1;
  }
  if (argv['R']) {
    op.map_seed = Math.abs(argv['R'])
  }
  if (argv['d']) {
    switch (argv['d']) {
      case 'e':
      case 'e1':
        op.dif = ConfigDif.dif_easy;
        break;
      case 'ee':
      case 'e2':
        op.dif = ConfigDif.dif_easiest;
        break;
      case 'h':
      case 'h1':
        op.dif = ConfigDif.dif_hard;
        break;
      case 'hh':
      case 'h2':
        op.dif = ConfigDif.dif_hardest;
        break;
      default:
        print_help();
        return false;
    }
  } else {
    op.dif = ConfigDif.dif_normal
  }
  if (argv['s']) {
    switch (argv['s']) {
      case 'n':
        op.speed = ConfigSpeed.sp_normal;
        break;
      case 's':
      case 's1':
        op.speed = ConfigSpeed.sp_slow;
        break;
      case 'ss':
      case 's2':
        op.speed = ConfigSpeed.sp_slower;
        break;
      case 'sss':
      case 's3':
        op.speed = ConfigSpeed.sp_slowest;
        break;
      case 'f':
      case 'f1':
        op.speed = ConfigSpeed.sp_fast;
        break;
      case 'ff':
      case 'f2':
        op.speed = ConfigSpeed.sp_faster;
        break;
      case 'fff':
      case 'f3':
        op.speed = ConfigSpeed.sp_fastest;
        break;
      case 'p':
        op.speed = ConfigSpeed.sp_pause;
        break;
      default:
        print_help();
        return false;
    }
  } else {
    op.speed = ConfigSpeed.sp_normal
  }

  if (argv['S']) {
    switch (argv['S']) {
      case 'rhombus':
        op.shape = Stencil.st_rhombus;
        break;
      case 'rect':
        op.shape = Stencil.st_rect;
        break;
      case 'hex':
        op.shape = Stencil.st_hex;
        break;
      default:
        print_help();
        return false;
    }
  } else {
    op.shape = Stencil.st_rect
  }

  /* multiplayer-related options */
  if (argv['E']) {
    mop.clients_num = argv['E'];
    mop.multiplayer_flag = 1;
    mop.server_flag = 1;
  }
  if (argv['e']) {
    mop.val_server_port = argv['e']
  }
  if (argv['C']) {
    mop.multiplayer_flag = 1;
    mop.server_flag = 0;
    mop.val_server_addr = argv['C'];
  }
  if (argv['c']) {
    mop.val_client_port = argv['c'];
  }
  if (argv['v']) {
    console.log(require('./package').version)
    return false;
  }
  if (argv['?'] || argv['h']) {
    print_help();
    return false;
  }


  /* Adjust l_val and conditions_val */
  let avlbl_loc_num = Grid.stencil_avlbl_loc_num (op.shape);
  if(op.loc_num == 0) op.loc_num = avlbl_loc_num;

  if (op.loc_num < 2 || op.loc_num > avlbl_loc_num) {
    print_help();
    return false;
  }
  if (conditions_were_set && (op.conditions<1 || op.conditions>op.loc_num)) {
    print_help();
    return false;
  }

  if (mop.clients_num < 1 || mop.clients_num > op.loc_num) {
    print_help();
    return false;
  }

  if (op.shape == Stencil.st_rect) {
    op.w = MIN(MAX_WIDTH - 1, op.w + Math.floor((op.h + 1) / 2));
  }
  return true;
};

export const game_slowdown = (speed:number)=>{
  let slowdown = 20;
  switch (speed) {
    case ConfigSpeed.sp_pause: slowdown = 1; break;
    case ConfigSpeed.sp_slowest: slowdown = 160; break;
    case ConfigSpeed.sp_slower: slowdown = 80; break;
    case ConfigSpeed.sp_slow: slowdown = 40; break;
    case ConfigSpeed.sp_normal: slowdown = 20; break;
    case ConfigSpeed.sp_fast: slowdown = 10; break;
    case ConfigSpeed.sp_faster: slowdown = 5; break;
    case ConfigSpeed.sp_fastest: slowdown = 2; break;
  }
  return slowdown;
};

export const win_or_lose = (st: State) => {
  let pop: number[] = [];
  for (let p = 0; p < MAX_PLAYER; ++p) pop[p] = 0;

  for (let i = 0; i < st.grid.width; ++i) {
    for (let j = 0; j < st.grid.height; ++j) {
      if (Grid.isInhabitable(st.grid.tiles[i][j].cl)) {
        for (let p = 0; p < MAX_PLAYER; ++p) {
          pop[p] += st.grid.tiles[i][j].units[p][UnitClass.citizen];
        }
      }
    }
  }

  let win = 1;
  let lose = 0;
  let best = 0;
  for (let p = 0; p < MAX_PLAYER; ++p) {
    if (pop[best] < pop[p]) best = p;
    if (p != st.controlled && pop[p] > 0) win = 0;
  }
  if (pop[st.controlled] == 0) lose = 1;

  if (win) return 1;
  else if (lose) return -1;
  else return 0;
};


export const print_help = () => {
  console.log(
    "                                 __                      \n",
  "    ____                        /  ]                     \n",
  "   / __ \\_ _ ___ ___ ___    __ _| |_  /\\      /\\___ ___  \n",
  " _/ /  \\/ | |X _/ __/ __\\  /   \\   /  \\ \\ /\\ / /__ \\X _/ \n",
  " \\ X    | | | | |__ | __X  | X || |    \\ V  V // _ | |   \n",
  "  \\ \\__/\\ __X_| \\___/___/  \\___/| |     \\ /\\ / \\___X_|   \n",
  "   \\____/                       |/       V  V            \n",
  "\n",
  "  Written by Alexey Nikolaev in 2013.\n",
  "\n");

  console.log("  Command line arguments:\n\n");
  console.log(
    "-W width\n",
  "\tMap width (default is 21)\n\n",
  "-H height\n",
  "\tMap height (default is 21)\n\n",
  "-S [rhombus|rect|hex]\n",
  "\tMap shape (rectangle is default). Max number of countries N=4 for rhombus and rectangle, and N=6 for the hexagon.\n\n",
  "-l [2|3| ... N]\n",
  "\tSets L, the number of countries (default is N).\n\n",
  "-i [0|1|2|3|4]\n",
  "\tInequality between the countries (0 is the lowest, 4 in the highest).\n\n",
  "-q [1|2| ... L]\n",
  "\tChoose player's location by its quality (1 = the best available on the map, L = the worst). Only in the singleplayer mode.\n\n",
  "-r\n",
  "\tAbsolutely random initial conditions, overrides options -l, -i, and -q.\n\n",
  "-d [ee|e|n|h|hh]\n",
  "\tDifficulty level (AI) from the easiest to the hardest (default is normal).\n\n",
  "-s [p|sss|ss|s|n|f|ff|fff]\n",
  "\tGame speed from the slowest to the fastest (default is normal).\n\n",
  "-R seed\n",
  "\tSpecify a random seed (unsigned integer) for map generation.\n\n",
  "-T\n",
  "\tShow the timeline.\n\n",
  "-E [1|2| ... L]\n",
  "\tStart a server for not more than L clients.\n\n",
  "-e port\n",
  "\tServer's port (19140 is default).\n\n",
  "-C IP\n",
  "\tStart a client and connect to the provided server's IP-address.\n\n",
  "-c port\n",
  "\tClients's port (19150 is default).\n\n",
  "-v\n",
  "\tDisplay the version number\n\n",
  "-h\n",
  "\tDisplay this help \n\n"
);
}
