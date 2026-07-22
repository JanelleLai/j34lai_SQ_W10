# Week 5 Example 3 — Maze with Animated Character and Coins

## What This Example Demonstrates

> **Note for students:** This section is included in example files only to help you study. Do not include it in your Side Quest submissions.

This example combines sprite sheet animation, coin objects, and a tile-based maze into a complete mini-game with wall collision, coin collection, and a locked exit.

- **2D array as a map** — the maze is stored as a grid of numbers; each number represents a tile type (floor, wall, coin, exit); the array drives both the visual layout and the game logic
- **Canvas sized to the maze** — `createCanvas(TILE_SIZE * MAZE[0].length, TILE_SIZE * MAZE.length)` sizes the canvas to fit the maze exactly rather than using fixed numbers
- **Building objects from map data** — `setup()` scans the maze array to find coin tiles and start position; coins are created as objects at runtime rather than hardcoded
- **`rectMode(CORNER)`** — switches `rect()` back to top-left positioning for drawing tiles; used here because tile coordinates come from the array index, not a centre point
- **Corner-based wall collision** — checks all four corners of the player's collision box against the maze tile at each corner; pushes the player out from the direction with the smallest overlap
- **Collision box smaller than sprite** — `hw` and `hh` are set smaller than the visible sprite so the player can navigate tight corridors without getting caught on corners
- **`dist()`** — returns the distance between two points; used for both coin collection and exit detection with a threshold based on `TILE_SIZE`
- **Locked exit** — the exit tile changes colour and only activates when `coinsCollected === coins.length`; a single boolean condition controls both the visual and the logic
- **`animateSprite()` and `drawCharacter()`** — same as Example 1; see that file for full notes on sprite sheet animation
- **`updateCoins()` and `drawCoins()` separation** — same pattern as Example 2; update logic and drawing are kept in separate functions

## Setup and Interaction Instructions

To run the sketch locally, open `index.html` in Google Chrome using Live Server.

**Controls:** WASD to move.

Collect all 3 coins then reach the green exit tile to win.

**Opening the Chrome Console**

- **Windows:** Press `F12` or `Ctrl + Shift + J`, then click the **Console** tab
- **Mac:** Press `Cmd + Option + J`

The console will show any errors in your sketch.

## Assets

| File                          | Source                                            |
| ----------------------------- | ------------------------------------------------- |
| `assets/images/walking.png`   | Slynyrd, Pixelblog 22: Top Down Character Sprites |
| `assets/images/coin_gold.png` | Bellanger, C., Animated Coins — OpenGameArt.org   |

## References

Bellanger, C. n.d. _Animated Coins_. OpenGameArt.org. Retrieved May 1, 2026, from https://opengameart.org/content/animated-coins-0

Slynyrd. 2019. _Pixelblog 22: Top Down Character Sprites_. Slynyrd Blog. Retrieved May 1, 2026, from https://www.slynyrd.com/blog/2019/10/21/pixelblog-22-top-down-character-sprites
