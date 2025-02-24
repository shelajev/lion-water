# Water Splash Game

A fun platformer game where you play as a lion trying to splash water on running people while avoiding elephants. The goal is to get all the people wet!

## Game Description

You control a lion that can run, jump, and splash water. Your mission is to splash water on all the running people to win the level. But watch out for the elephants! If you touch an elephant, you'll lose all your water and need to refill at the shower.

## Features
- Platform-based gameplay with randomly generated levels
- Double jump ability
- Water splashing mechanics
- Running people that need to get wet
- Dangerous elephants that make you lose water
- Decorative trees in the background
- Water refill station (shower)
- Win condition when all people are wet

## Controls
- **Left Arrow**: Move left
- **Right Arrow**: Move right
- **Up Arrow** or **Space**: Jump (press again while in the air for double jump)
- **e** or **d** or **c**: Splash water
- **r**: Reset/Generate new level

## Game Mechanics
- The lion can carry water (shown by blue bar above)
- Each splash uses 20% of your water
- You can't splash when out of water
- Touching elephants makes you lose all water
- Refill water by touching the shower on the right side
- People stop running when they get wet and show an umbrella
- You win when all people are wet

## How to Run
1. Make sure you have all the required image files in your directory:
   - lion.png
   - elephant.png
   - running-left.png
   - umbrella.png
   - shower.png
   - tree1.png
   - tree2.png
   - tree3.png
   - skedaddle.mp3 (background music)

2. Open `water_game.html` in a web browser
   ```bash
   # Using Python's built-in server (Python 3)
   python -m http.server

   # Then open in your browser:
   # http://localhost:8000/water_game.html
   ```

## Technical Requirements
- A modern web browser with JavaScript enabled
- The game is designed to run in fullscreen and will adjust to window size 