// ============================================================
// Week 10 Side Quest — Maze with Animated Character and Coins
// ============================================================
// This sketch combines everything from Examples 1 and 2:
//   - Animated walking character (4 directions)
//   - Animated spinning coins
//   - A hardcoded maze drawn with shapes
//   - Wall collision to keep the player inside the maze
//   - Collect all coins to unlock the exit
//   - Space bar speed boost (3s duration / 5s recharge)
//   - 60 second timer — running out sends the player back to start
//   - Press Enter to restart after winning
//   - Custom background image
// ============================================================

// ------------------------------------------------------------
// SPRITE CONFIGURATION — Walking Character
// Same structure as Example 1. See that file for full notes.
// ------------------------------------------------------------
const SPRITE = {
  frameWidth: 75,
  frameHeight: 150,
  numFrames: 4,
  animSpeed: 20,
  scale: 0.5,
  rows: {
    down: 0,
    up: 1,
    right: 2,
    left: 3,
  },
  offsets: {
    down: { x: 0, y: 0 },
    up: { x: 0, y: 0 },
    right: { x: 0, y: 10 },
    left: { x: 0, y: 20 },
  },
};

// ------------------------------------------------------------
// COIN CONFIGURATION
// Same structure as Example 2. See that file for full notes.
// ------------------------------------------------------------
const COIN = {
  frameWidth: 32,
  frameHeight: 32,
  numFrames: 8,
  animSpeed: 6,
  scale: 1.5,
};

// ------------------------------------------------------------
// BOOST CONFIGURATION
// Durations are stored in frames, assuming p5's default 60fps.
// ------------------------------------------------------------
const BOOST = {
  duration: 180, // 3 seconds * 60fps
  cooldown: 300, // 5 seconds * 60fps
  speedMultiplier: 2,
};

// ------------------------------------------------------------
// TIMER CONFIGURATION
// Uses millis() (real elapsed milliseconds) rather than frame
// counts, so it stays accurate regardless of frame rate.
// ------------------------------------------------------------
const TIME_LIMIT = 60000; // 60 seconds, in milliseconds
const FAIL_MESSAGE_DURATION = 90; // frames the "Time's up!" message stays visible (~1.5s at 60fps)

// ------------------------------------------------------------
// MAZE
// A 2D array where each number represents one tile type.
// The maze is 16 tiles wide and 10 tiles tall.
// TILE_SIZE controls how large each tile is drawn in pixels.
//
// Tile values:
//   0 = floor (walkable)
//   1 = wall
//   2 = start position
//   3 = coin location
//   4 = exit (locked until all coins collected)
// ------------------------------------------------------------
const TILE_SIZE = 50;

const MAZE = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 2, 0, 0, 1, 0, 3, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 3, 1, 1],
  [1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 3, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 4, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// Colours for each tile type — stored as RGB arrays
const TILE_COLORS = {
  0: [40, 40, 50, 0], // floor — semi-transparent so background shows through
  1: [255, 255, 255, 200], // wall  — fully opaque
  2: [40, 40, 50, 0],
  3: [40, 40, 50, 0],
  4: [60, 100, 80, 255],
};

// ------------------------------------------------------------
// PLAYER
// x and y track the centre position on the canvas.
// hw and hh are the half-dimensions of the collision box —
// smaller than the sprite for a tighter feel.
// ------------------------------------------------------------
let player = {
  x: 0,
  y: 0,
  baseSpeed: 2,
  boostSpeed: 2 * BOOST.speedMultiplier,
  speed: 2, // current effective speed, updated by updateBoost()

  // Animation state
  currentFrame: 0,
  frameTimer: 0,
  direction: "down",
  isMoving: false,

  // Boost state
  boosting: false,
  boostTimer: 0, // frames remaining while boost is active
  boostCooldown: 0, // frames remaining until boost can be used again

  // Collision box half-dimensions
  // Smaller than the sprite so the player can navigate tight corridors
  hw: 12, // half width
  hh: 12, // half height
};

// Start tile position, saved in setup() — used to respawn the
// player if the timer runs out or the game restarts
let startPos = { x: 0, y: 0 };

// ------------------------------------------------------------
// COINS
// Built from the maze data in setup() — any tile marked 3
// becomes a coin object with its own position and frame counter.
// ------------------------------------------------------------
let coins = [];
let coinsCollected = 0;

// ------------------------------------------------------------
// GAME STATE
// ------------------------------------------------------------
let gameWon = false;

// Timer state
let timerStart; // millis() timestamp when the current run began
let failMessageTimer = 0; // counts down while "Time's up!" is showing

// Images
let characterSheet;
let coinSheet;
let backgroundImg;

let bgMusic;
let musicStarted = false;

// ============================================================
// preload()
// Runs once before setup(). Loads all image assets so they
// are ready before the sketch tries to use them.
// ============================================================
function preload() {
  characterSheet = loadImage("assets/images/walking.png");
  coinSheet = loadImage("assets/images/coin_gold.png");
  backgroundImg = loadImage("assets/images/background.png");
  bgMusic = loadSound("assets/sounds/bgmusic.mp3");
}

// ============================================================
// setup()
// Runs once at the very start of the sketch.
// Canvas size is calculated from the maze dimensions so it
// always fits exactly. Loops through the maze to find the
// start tile and all coin tiles.
// ============================================================
function setup() {
  // Size the canvas to fit the maze exactly
  createCanvas(TILE_SIZE * MAZE[0].length, TILE_SIZE * MAZE.length);
  imageMode(CENTER);

  // Scan the maze array to find the start position and coin locations
  for (let row = 0; row < MAZE.length; row++) {
    for (let col = 0; col < MAZE[row].length; col++) {
      let tile = MAZE[row][col];

      if (tile === 2) {
        // Place the player in the centre of the start tile
        player.x = col * TILE_SIZE + TILE_SIZE / 2;
        player.y = row * TILE_SIZE + TILE_SIZE / 2;

        // Remember this position so we can respawn here later
        startPos.x = player.x;
        startPos.y = player.y;
      }

      if (tile === 3) {
        // Create a coin object for each coin tile
        // Random start frame so coins don't all spin in sync
        coins.push({
          x: col * TILE_SIZE + TILE_SIZE / 2,
          y: row * TILE_SIZE + TILE_SIZE / 2,
          frame: floor(random(COIN.numFrames)),
          frameTimer: 0,
          collected: false,
        });
      }
    }
  }

  // Start the 60 second countdown
  timerStart = millis();
}

// ============================================================
// draw()
// Runs repeatedly in a loop after setup() finishes.
// Order matters — background/maze are drawn first so
// everything else appears on top of them.
// ============================================================
function draw() {
  // Draw the background image stretched to fill the whole canvas.
  // imageMode(CENTER) is set in setup(), so this draws it centred
  // at width/2, height/2 scaled to the full canvas size.
  image(backgroundImg, width / 2, height / 2, width, height);

  drawMaze();
  updateCoins();
  drawCoins();
  updateBoost();
  updateTimer();
  handleInput();
  resolveWallCollisions();
  checkCoinCollection();
  checkExit();
  animateSprite();
  drawCharacter();
  drawHUD();

  // Fail message draws on top of gameplay but win screen (if any) draws over it
  if (failMessageTimer > 0) {
    drawFailMessage();
    failMessageTimer--;
  }

  // Win screen is drawn last so it appears on top of everything
  if (gameWon) {
    drawWinScreen();
  }
}

// ------------------------------------------------------------
// keyPressed()
// p5 built-in callback — fires exactly once per key press,
// unlike keyIsDown() which fires every frame the key is held.
// Space triggers the boost; Enter restarts the game once won.
// ------------------------------------------------------------
function keyPressed() {
  if (!musicStarted) {
    bgMusic.setVolume(0.4);
    bgMusic.loop();
    musicStarted = true;
  }

  if (keyCode === 32) {
    // Space bar
    activateBoost();
  }

  if (keyCode === 13) {
    // Enter — only does anything once the game has been won
    if (gameWon) {
      restartGame();
    }
  }
}

// ------------------------------------------------------------
// activateBoost()
// Starts the boost if it isn't already active and isn't on
// cooldown. Ignored otherwise (e.g. mashing space does nothing
// until the cooldown finishes).
// ------------------------------------------------------------
function activateBoost() {
  if (gameWon) return;
  if (player.boosting) return;
  if (player.boostCooldown > 0) return;

  player.boosting = true;
  player.boostTimer = BOOST.duration;
}

// ------------------------------------------------------------
// updateBoost()
// Ticks the boost and cooldown timers down each frame and
// keeps player.speed in sync with the current state.
// ------------------------------------------------------------
function updateBoost() {
  if (player.boosting) {
    player.boostTimer--;
    player.speed = player.boostSpeed;

    if (player.boostTimer <= 0) {
      player.boosting = false;
      player.boostCooldown = BOOST.cooldown;
      player.speed = player.baseSpeed;
    }
  } else if (player.boostCooldown > 0) {
    player.boostCooldown--;
    player.speed = player.baseSpeed;
  } else {
    player.speed = player.baseSpeed;
  }
}

// ------------------------------------------------------------
// updateTimer()
// Checks how much time has elapsed since timerStart. Once the
// player has run out of time, sends them back to the start
// tile and resets the clock for another attempt.
// Stops counting once the game is won.
// ------------------------------------------------------------
function updateTimer() {
  if (gameWon) return;

  let elapsed = millis() - timerStart;
  if (elapsed >= TIME_LIMIT) {
    failRun();
  }
}

// ------------------------------------------------------------
// getTimeRemaining()
// Returns the seconds left on the clock, clamped to 0 so the
// HUD never displays a negative number.
// ------------------------------------------------------------
function getTimeRemaining() {
  let elapsed = millis() - timerStart;
  let remainingMs = max(0, TIME_LIMIT - elapsed);
  return remainingMs / 1000;
}

// ------------------------------------------------------------
// failRun()
// Called when the countdown reaches zero. Sends the player
// back to the starting tile, resets movement/animation state
// so they don't spawn mid-stride, and restarts the timer.
// Note: collected coins stay collected — only position and
// time reset, so the player doesn't lose prior progress.
// ------------------------------------------------------------
function failRun() {
  player.x = startPos.x;
  player.y = startPos.y;
  player.direction = "down";
  player.isMoving = false;
  player.currentFrame = 0;
  player.frameTimer = 0;

  timerStart = millis();
  failMessageTimer = FAIL_MESSAGE_DURATION;
}

// ------------------------------------------------------------
// restartGame()
// Called after a win, when the player presses Enter.
// Fully resets the run: player position/state, boost state,
// every coin back to uncollected, the timer, and gameWon.
// ------------------------------------------------------------
function restartGame() {
  // Reset player position and movement/animation state
  player.x = startPos.x;
  player.y = startPos.y;
  player.direction = "down";
  player.isMoving = false;
  player.currentFrame = 0;
  player.frameTimer = 0;

  // Reset boost state completely — fresh boost available immediately
  player.speed = player.baseSpeed;
  player.boosting = false;
  player.boostTimer = 0;
  player.boostCooldown = 0;

  // Reset every coin back to uncollected
  for (let i = 0; i < coins.length; i++) {
    coins[i].collected = false;
    coins[i].frame = floor(random(COIN.numFrames));
    coins[i].frameTimer = 0;
  }
  coinsCollected = 0;

  // Reset game state and timers
  gameWon = false;
  failMessageTimer = 0;
  timerStart = millis();
}

// ------------------------------------------------------------
// drawMaze()
// Loops through every tile in the maze array and draws a
// rectangle for it. rectMode(CORNER) means x, y is the
// top-left of each tile.
// The exit tile changes colour when all coins are collected.
// ------------------------------------------------------------
function drawMaze() {
  rectMode(CORNER);
  noStroke();

  for (let row = 0; row < MAZE.length; row++) {
    for (let col = 0; col < MAZE[row].length; col++) {
      let tile = MAZE[row][col];

      // Exit tile changes colour when all coins are collected
      if (tile === 4) {
        if (coinsCollected === coins.length) {
          fill(30, 200, 120); // bright green — exit is open
        } else {
          fill(60, 100, 80); // dim green — exit is locked
        }
      } else {
        let c = TILE_COLORS[tile];
        fill(c[0], c[1], c[2], c[3]);
      }

      rect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
}

// ------------------------------------------------------------
// updateCoins()
// Loops through every coin and advances its animation frame.
// Skips coins that have already been collected.
// Each coin has its own frameTimer so they animate independently.
// ------------------------------------------------------------
function updateCoins() {
  for (let i = 0; i < coins.length; i++) {
    if (coins[i].collected) continue; // skip collected coins

    coins[i].frameTimer++;
    if (coins[i].frameTimer >= COIN.animSpeed) {
      coins[i].frameTimer = 0;
      coins[i].frame = (coins[i].frame + 1) % COIN.numFrames;
    }
  }
}

// ------------------------------------------------------------
// drawCoins()
// Loops through every coin and draws it at its current frame.
// Skips coins that have already been collected.
// ------------------------------------------------------------
function drawCoins() {
  for (let i = 0; i < coins.length; i++) {
    if (coins[i].collected) continue; // skip collected coins

    let coin = coins[i];

    // Source x position on the sprite sheet
    // Coins have only one row so sy is always 0
    let sx = coin.frame * COIN.frameWidth;
    let dw = COIN.frameWidth * COIN.scale;
    let dh = COIN.frameHeight * COIN.scale;

    image(
      coinSheet,
      coin.x,
      coin.y,
      dw,
      dh,
      sx,
      0,
      COIN.frameWidth,
      COIN.frameHeight,
    );
  }
}

// ------------------------------------------------------------
// handleInput()
// Moves the player and sets the correct facing direction.
// Each direction is checked independently so diagonal
// movement works naturally — holding W and D moves up-right.
// Uses player.speed, which updateBoost() adjusts each frame.
// Returns early if the game is already won.
// ------------------------------------------------------------
function handleInput() {
  if (gameWon) return;

  player.isMoving = false;

  if (keyIsDown(87)) {
    // W — up
    player.y -= player.speed;
    player.direction = "up";
    player.isMoving = true;
  }
  if (keyIsDown(83)) {
    // S — down
    player.y += player.speed;
    player.direction = "down";
    player.isMoving = true;
  }
  if (keyIsDown(65)) {
    // A — left
    player.x -= player.speed;
    player.direction = "left";
    player.isMoving = true;
  }
  if (keyIsDown(68)) {
    // D — right
    player.x += player.speed;
    player.direction = "right";
    player.isMoving = true;
  }
}

// ------------------------------------------------------------
// resolveWallCollisions()
// Checks all four corners of the player's collision box
// against the maze tile at each corner's position.
// If a corner is inside a wall tile, the player is pushed
// out from the smallest overlapping direction.
//
// This approach handles diagonal wall contacts correctly
// and prevents the player from getting stuck on corners.
// ------------------------------------------------------------
function resolveWallCollisions() {
  // The four corners of the player's collision box
  let corners = [
    { x: player.x - player.hw, y: player.y - player.hh }, // top left
    { x: player.x + player.hw, y: player.y - player.hh }, // top right
    { x: player.x - player.hw, y: player.y + player.hh }, // bottom left
    { x: player.x + player.hw, y: player.y + player.hh }, // bottom right
  ];

  for (let i = 0; i < corners.length; i++) {
    let c = corners[i];

    // Convert pixel position to tile coordinates
    let col = floor(c.x / TILE_SIZE);
    let row = floor(c.y / TILE_SIZE);

    // Skip if outside the maze array bounds
    if (row < 0 || row >= MAZE.length || col < 0 || col >= MAZE[0].length)
      continue;

    if (MAZE[row][col] === 1) {
      // Calculate how far the player is overlapping each side of the wall tile
      let tileLeft = col * TILE_SIZE;
      let tileRight = tileLeft + TILE_SIZE;
      let tileTop = row * TILE_SIZE;
      let tileBottom = tileTop + TILE_SIZE;

      let overlapLeft = player.x + player.hw - tileLeft;
      let overlapRight = tileRight - (player.x - player.hw);
      let overlapTop = player.y + player.hh - tileTop;
      let overlapBottom = tileBottom - (player.y - player.hh);

      // Push the player out from the side with the smallest overlap
      let minOverlap = min(
        overlapLeft,
        overlapRight,
        overlapTop,
        overlapBottom,
      );

      if (minOverlap === overlapLeft) player.x -= overlapLeft;
      else if (minOverlap === overlapRight) player.x += overlapRight;
      else if (minOverlap === overlapTop) player.y -= overlapTop;
      else if (minOverlap === overlapBottom) player.y += overlapBottom;
    }
  }
}

// ------------------------------------------------------------
// checkCoinCollection()
// Uses dist() to check if the player is close enough to
// collect each coin. A threshold of 60% of TILE_SIZE feels
// natural — not too generous, not too strict.
// ------------------------------------------------------------
function checkCoinCollection() {
  for (let i = 0; i < coins.length; i++) {
    if (coins[i].collected) continue;

    // dist() returns the distance between two points
    let d = dist(player.x, player.y, coins[i].x, coins[i].y);
    if (d < TILE_SIZE * 0.6) {
      coins[i].collected = true;
      coinsCollected++;
    }
  }
}

// ------------------------------------------------------------
// checkExit()
// Only active once all coins are collected.
// Scans the maze for the exit tile (4) and checks whether
// the player is close enough to trigger a win.
// ------------------------------------------------------------
function checkExit() {
  if (coinsCollected < coins.length) return; // exit is still locked

  for (let row = 0; row < MAZE.length; row++) {
    for (let col = 0; col < MAZE[row].length; col++) {
      if (MAZE[row][col] === 4) {
        let exitX = col * TILE_SIZE + TILE_SIZE / 2;
        let exitY = row * TILE_SIZE + TILE_SIZE / 2;
        if (dist(player.x, player.y, exitX, exitY) < TILE_SIZE * 0.6) {
          gameWon = true;
        }
      }
    }
  }
}

// ------------------------------------------------------------
// animateSprite()
// Advances the animation frame at a controlled speed.
// frameTimer counts up every draw() call.
// When it reaches animSpeed, the frame advances.
// Only animates when the player is moving — stays on frame 0
// when idle so the character stands still.
// ------------------------------------------------------------
function animateSprite() {
  if (player.isMoving) {
    player.frameTimer++;

    // When the timer reaches animSpeed, advance to the next frame
    // % numFrames wraps back to 0 after the last frame
    if (player.frameTimer >= SPRITE.animSpeed) {
      player.frameTimer = 0;
      player.currentFrame = (player.currentFrame + 1) % SPRITE.numFrames;
    }
  } else {
    // Reset to standing frame when not moving
    player.currentFrame = 0;
    player.frameTimer = 0;
  }
}

// ------------------------------------------------------------
// drawCharacter()
// Draws one frame from the sprite sheet using image() with
// source rectangle parameters.
//
// image(img, dx, dy, dw, dh, sx, sy, sw, sh)
//   dx, dy — where to draw on the canvas (destination centre)
//   dw, dh — how large to draw it (destination size)
//   sx, sy — where to start reading from the sprite sheet
//   sw, sh — how many pixels to read from the sheet
//
// sx slides along the row by multiplying frame number by
// frameWidth. sy selects the row by multiplying the row
// index by frameHeight.
// ------------------------------------------------------------
function drawCharacter() {
  // Get the correct row and offset for the current direction
  let row = SPRITE.rows[player.direction];
  let offset = SPRITE.offsets[player.direction];

  // Source position on the sprite sheet (with offset applied)
  let sx = player.currentFrame * SPRITE.frameWidth + offset.x;
  let sy = row * SPRITE.frameHeight + offset.y;

  // Draw size (original frame size multiplied by scale)
  let dw = SPRITE.frameWidth * SPRITE.scale;
  let dh = SPRITE.frameHeight * SPRITE.scale;

  image(
    characterSheet,
    player.x,
    player.y,
    dw,
    dh,
    sx,
    sy,
    SPRITE.frameWidth,
    SPRITE.frameHeight,
  );
}

// ------------------------------------------------------------
// drawHUD()
// HUD = Heads Up Display.
// Shows coin count, exit status, boost availability, and the
// countdown timer at the top of the screen.
// ------------------------------------------------------------
function drawHUD() {
  noStroke();
  fill(0);
  textSize(14);
  textAlign(LEFT);
  textFont("monospace");
  text("Coins: " + coinsCollected + " / " + coins.length, 10, 20);

  // Show exit hint once all coins are collected
  if (coinsCollected === coins.length) {
    fill(30, 200, 120);
    text("Exit is open! Find the green tile.", 10, 40);
  }

  drawBoostBar();
  drawTimer();
}

// ------------------------------------------------------------
// drawBoostBar()
// Small status bar showing boost state:
//   - Full green bar: boost ready (tap space)
//   - Shrinking grey bar: boost active, draining
//   - Filling red-to-green bar: on cooldown, recharging
// ------------------------------------------------------------
function drawBoostBar() {
  let barX = 10;
  let barY = 50;
  let barW = 100;
  let barH = 10;

  // Background track
  noStroke();
  fill(60);
  rect(barX, barY, barW, barH);

  let fillRatio = 1;
  let barColor = [30, 200, 120]; // ready — green
  let label = "Boost: READY (space)";

  if (player.boosting) {
    fillRatio = player.boostTimer / BOOST.duration;
    barColor = [220, 220, 100]; // active — yellow
    label = "Boost: ACTIVE";
  } else if (player.boostCooldown > 0) {
    fillRatio = 1 - player.boostCooldown / BOOST.cooldown;
    barColor = [200, 80, 80]; // recharging — red
    label = "Boost: recharging";
  }

  fill(barColor[0], barColor[1], barColor[2]);
  rect(barX, barY, barW * fillRatio, barH);

  fill(0);
  textSize(12);
  text(label, barX, barY + 24);
}

// ------------------------------------------------------------
// drawTimer()
// Displays the countdown in the top right corner as M:SS.
// Turns red in the last 10 seconds as a warning.
// ------------------------------------------------------------
function drawTimer() {
  let secondsLeft = getTimeRemaining();
  let minutes = floor(secondsLeft / 60);
  let seconds = floor(secondsLeft % 60);
  let display = minutes + ":" + (seconds < 10 ? "0" + seconds : seconds);

  noStroke();
  if (secondsLeft <= 10 && !gameWon) {
    fill(220, 60, 60); // warning red
  } else {
    fill(0); // changed from fill(255) to black
  }
  textSize(18);
  textAlign(RIGHT);
  textFont("monospace");
  text("Time: " + display, width - 10, 24);
  textAlign(LEFT); // reset alignment for other HUD text
}

// ------------------------------------------------------------
// drawFailMessage()
// Briefly shown after the timer runs out, letting the player
// know why they were sent back to the start.
// ------------------------------------------------------------
function drawFailMessage() {
  fill(0, 0, 0, 140);
  rectMode(CORNER);
  rect(0, 0, width, height);

  fill(220, 60, 60);
  textAlign(CENTER);
  textSize(36);
  text("Time's Up!", width / 2, height / 2 - 10);

  textSize(16);
  fill(230);
  text("Back to the start — try again", width / 2, height / 2 + 20);

  textAlign(LEFT); // reset alignment for other HUD text
}

// ------------------------------------------------------------
// drawWinScreen()
// Draws a semi-transparent overlay and win message on top
// of everything else. Called last in draw() so it appears
// in front of the maze, character, and HUD.
// ------------------------------------------------------------
function drawWinScreen() {
  fill(0, 0, 0, 160);
  rectMode(CORNER);
  rect(0, 0, width, height);

  fill(255);
  textAlign(CENTER);
  textSize(48);
  text("You Escaped!", width / 2, height / 2 - 20);

  textSize(16);
  fill(180);
  text("All coins collected", width / 2, height / 2 + 20);

  fill(220, 220, 100);
  textSize(18);
  text("Press ENTER to play again", width / 2, height / 2 + 50);
}
