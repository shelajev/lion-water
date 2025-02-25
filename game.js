const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set initial canvas size to fullscreen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Define well position and size
const well = { 
    x: canvas.width - 100, 
    y: canvas.height - 125, // Move up by a quarter of its height (100 / 4)
    width: 100, // 2x larger
    height: 100 // 2x larger
};

// Load the shower sprite for the well
const wellSprite = new Image();
wellSprite.src = 'shower.png';

// Load tree sprites
const treeSprites = ['tree1.png', 'tree2.png', 'tree3.png'].map(src => {
    const img = new Image();
    img.src = src;
    return img;
});

// Adjust player dimensions to be square and 2x larger
const playerSize = 80; // New size for both width and height
const player = {
    x: 50, y: 50, width: playerSize, height: playerSize,
    vx: 0, vy: 0, gravity: 0.5, jumpForce: -10,
    hasBucket: true, waterLevel: 100,
    isSplashing: false, splashCooldown: 0,
    sprite: new Image(),
    canDoubleJump: true, // Track if double jump is available
    isOnGround: true, // Track if the player is on the ground
    hasMeat: false, // Track if the player has meat
    hasSoup: false // Track if the player has soup
};

// Load the lion sprite
player.sprite.src = 'lion.png';

// Load elephant sprite
const elephantSprite = new Image();
elephantSprite.src = 'elephant.png';

// Load power-up sprites
const soupSprite = new Image();
soupSprite.src = 'soup1.png';
const meatSprite = new Image();
meatSprite.src = 'meat1.png';

let platforms = [];
let people = [];
let trees = []; // Array to hold tree positions
let gameWon = false; // Flag to track if the game is won
let elephants = []; // New array for elephants
let powerUps = []; // New array for power-ups

// Update game stats to include power-up consumption
let gameStats = {
    gamesWon: parseInt(localStorage.getItem('gamesWon')) || 0,
    peopleSplashed: parseInt(localStorage.getItem('peopleSplashed')) || 0,
    waterRefills: parseInt(localStorage.getItem('waterRefills')) || 0,
    soupsEaten: parseInt(localStorage.getItem('soupsEaten')) || 0,
    meatsConsumed: parseInt(localStorage.getItem('meatsConsumed')) || 0
};

// Update the stats in localStorage
function updateStats(stat) {
    gameStats[stat]++;
    localStorage.setItem(stat, gameStats[stat]);
}

// Add seeded random number generator
class Random {
    constructor(seed) {
        this.seed = seed;
    }

    // Returns a random number between 0 and 1
    random() {
        const x = Math.sin(this.seed++) * 10000;
        return x - Math.floor(x);
    }

    // Returns a random integer between min (inclusive) and max (exclusive)
    randInt(min, max) {
        return Math.floor(this.random() * (max - min)) + min;
    }

    // Returns a random boolean with given probability
    chance(probability) {
        return this.random() < probability;
    }
}

// Get seed from URL parameter or generate a random one
const urlParams = new URLSearchParams(window.location.search);
const seed = parseInt(urlParams.get('seed')) || Math.floor(Math.random() * 1000000);
const rng = new Random(seed);

// Update URL with the current seed
if (!urlParams.has('seed')) {
    window.history.replaceState({}, '', `${window.location.pathname}?seed=${seed}`);
}

// Add touch controls state
let touchControls = {
    left: false,
    right: false
};

// Add splash button dimensions
const splashButton = {
    x: canvas.width / 2,
    y: canvas.height - 120,
    radius: 40
};

// Add debug logging
let debugMode = true;
function log(message) {
    if (debugMode && console) {
        console.log(`[${new Date().toISOString()}] ${message}`);
    }
}

// Add loading indicator
function showLoadingMessage() {
    ctx.fillStyle = '#E0FFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("Loading game...", canvas.width / 2, canvas.height / 2);
}

// Adjust for iOS toolbar - increase bottom padding
function detectMobileBrowser() {
    log("Detecting mobile browser");
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    
    if (isIOS) {
        log("iOS device detected, adjusting for toolbar");
        // Add bottom padding to account for toolbar - increase to 120px
        const bottomPadding = 120; // Increased from 80px
        canvas.style.height = `calc(100vh - ${bottomPadding}px)`;
        
        // Adjust game elements
        well.y = canvas.height - 125 - bottomPadding;
        splashButton.y = canvas.height - 120 - bottomPadding;
    }
    
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
}

// Modify resizeCanvas to update splash button position
function resizeCanvas() {
    log("Resizing canvas");
    const oldHeight = canvas.height;
    canvas.width = window.innerWidth;
    
    // Check if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const bottomPadding = isIOS ? 120 : 0; // Increased from 80px
    
    canvas.height = window.innerHeight - bottomPadding;
    log(`Canvas resized to ${canvas.width}x${canvas.height}`);
    
    // Adjust game elements
    well.x = canvas.width - 100;
    well.y = canvas.height - 125;
    
    // Update splash button to center of screen
    splashButton.x = canvas.width / 2;
    splashButton.y = canvas.height - 120;
    
    // If height changed significantly, regenerate level to fit new dimensions
    if (Math.abs(oldHeight - canvas.height) > 100) {
        log("Height changed significantly, regenerating level");
        generateLevel();
    }
}

function generateLevel() {
    log("Starting level generation");
    const startTime = performance.now();
    
    // Reset game state
    platforms = [{ x: 0, y: canvas.height - 50, width: canvas.width, height: 50 }];
    people = [];
    trees = [];
    gameWon = false;
    elephants = [];
    powerUps = [];
    player.vx = 0;
    player.jumpForce = -10;
    
    // Detect if we're on mobile and reduce complexity
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent);
    
    // Adjust complexity based on device
    const numPlatforms = isMobile ? rng.randInt(5, 10) : rng.randInt(9, 15);
    const numTrees = isMobile ? 1 : rng.randInt(1, 3);
    const numGroundTrees = isMobile ? rng.randInt(1, 3) : rng.randInt(2, 5);
    
    log(`Generating ${numPlatforms} platforms (mobile: ${isMobile})`);
    
    const groundZones = 8;
    const zoneWidth = canvas.width / groundZones;
    const personSize = 60;
    const elephantSize = 80;
    const minPlatformY = 100;

    // Generate 2-3 elephants on the ground
    const numElephants = rng.randInt(2, 4);
    for (let i = 0; i < numElephants; i++) {
        const elephantX = rng.randInt(0, canvas.width - elephantSize);
        const elephantY = canvas.height - 50 - elephantSize * 0.9;
        const velocity = rng.chance(0.5) ? 0.4 : -0.4; // Slower elephants (was 0.5)
        
        elephants.push({
            x: elephantX,
            y: elephantY,
            width: elephantSize,
            height: elephantSize,
            vx: velocity,
            platform: platforms[0]
        });
    }

    for (let i = 0; i < numPlatforms; i++) {
        let width = Math.max(rng.randInt(100, 300), personSize * 2);
        let height = 20;
        let x, y;
        let validPosition = false;

        while (!validPosition) {
            let basePlatform;
            if (platforms.length === 1) {
                const zone = rng.randInt(0, groundZones / 2) * 2;
                x = zone * zoneWidth + rng.random() * zoneWidth;
                y = platforms[0].y - rng.randInt(player.height * 1.5, player.height * 1.5 + 100);
                basePlatform = platforms[0];
            } else {
                basePlatform = platforms[rng.randInt(0, platforms.length)];
                const direction = rng.chance(0.5) ? -1 : 1;
                x = basePlatform.x + direction * (rng.random() * 100 + 50);
                y = basePlatform.y - rng.randInt(player.height * 1.5, player.height * 1.5 + 100);
            }

            if (x < 0) x = 0;
            if (x + width > canvas.width) x = canvas.width - width;
            if (y < minPlatformY) y = minPlatformY;

            validPosition = true;
            for (const platform of platforms) {
                if (
                    x < platform.x + platform.width &&
                    x + width > platform.x &&
                    Math.abs(y - platform.y) < personSize * 1.5
                ) {
                    validPosition = false;
                    break;
                }
            }
        }

        platforms.push({ x, y, width, height });

        // Randomly place trees on the platform
        for (let j = 0; j < numTrees; j++) {
            const treeX = rng.random() * (width - 50) + x;
            const treeY = y - 65;
            const treeSprite = treeSprites[rng.randInt(0, treeSprites.length)];
            trees.push({ x: treeX, y: treeY, sprite: treeSprite });
        }
    }

    // Place trees on the ground
    for (let i = 0; i < numGroundTrees; i++) {
        const treeX = rng.random() * (canvas.width - 50);
        const treeY = canvas.height - 120;
        const treeSprite = treeSprites[rng.randInt(0, treeSprites.length)];
        trees.push({ x: treeX, y: treeY, sprite: treeSprite });
    }

    const numPeople = rng.randInt(5, 10);
    const occupiedPlatforms = new Set();

    for (let i = 0; i < numPeople; i++) {
        let platform;
        let personX, personY;
        let foundPlatform = false;

        for (let p of platforms) {
            if (p !== platforms[0] && !occupiedPlatforms.has(p)) {
                platform = p;
                foundPlatform = true;
                break;
            }
        }

        if (!foundPlatform) break;

        personX = rng.randInt(0, platform.width - personSize) + platform.x;
        personY = platform.y - personSize * 0.9;
        occupiedPlatforms.add(platform);

        const velocity = rng.chance(0.5) ? 0.5 : -0.5;
        const spriteLeft = new Image();
        spriteLeft.src = 'running.png';
        const spriteWet = new Image();
        spriteWet.src = 'umbrella.png';

        people.push({
            x: personX,
            y: personY,
            width: personSize,
            height: personSize,
            isWet: false,
            vx: velocity,
            platform,
            spriteLeft,
            spriteWet
        });
    }

    // After generating platforms, add power-ups with 66% chance
    // Add soup
    if (rng.chance(0.66)) {
        let platform = platforms[rng.randInt(1, platforms.length)];
        powerUps.push({
            x: platform.x + rng.random() * (platform.width - 90),
            y: platform.y - 60, // Lower the icon (was -90)
            width: 90,
            height: 90,
            type: 'soup',
            sprite: soupSprite,
            active: true
        });
    }

    // Add meat
    if (rng.chance(0.66)) {
        let platform = platforms[rng.randInt(1, platforms.length)];
        powerUps.push({
            x: platform.x + rng.random() * (platform.width - 90),
            y: platform.y - 60, // Lower the icon (was -90)
            width: 90,
            height: 90,
            type: 'meat',
            sprite: meatSprite,
            active: true
        });
    }

    const endTime = performance.now();
    log(`Level generation completed in ${endTime - startTime}ms`);
}

let lastFrameTime = 0;

function gameLoop(currentTime) {
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    update(deltaTime / 1000);
    draw();

    requestAnimationFrame(gameLoop);
}

function update(dt) {
    if (gameWon) return;

    // Update movement speed based on meat power-up
    const currentSpeed = 6 * (player.hasMeat ? 2 : 1);
    player.vx = 0;
    if (keys['ArrowLeft'] || touchControls.left) player.vx = -currentSpeed;
    if (keys['ArrowRight'] || touchControls.right) player.vx = currentSpeed;

    // Update jump force based on soup power-up
    player.jumpForce = -10 * (player.hasSoup ? 2 : 1);

    player.vy += player.gravity;
    player.x += player.vx;
    player.y += player.vy;

    player.isOnGround = false; // Assume the player is in the air unless proven otherwise

    for (const platform of platforms) {
        if (player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y + player.height > platform.y &&
            player.y < platform.y + platform.height) {
            player.y = platform.y - player.height;
            player.vy = 0;
            player.isOnGround = true;
            player.canDoubleJump = true; // Reset double jump when on the ground
        }
    }

    if (player.x < well.x + well.width &&
        player.x + player.width > well.x &&
        player.y < well.y + well.height &&
        player.y + player.height > well.y) {
        if (player.waterLevel < 100) { // Only count as refill if water wasn't full
            player.waterLevel = 100;
            updateStats('waterRefills');
        }
        player.hasBucket = true;
    }

    if (player.splashCooldown > 0) {
        player.splashCooldown -= dt;
    }

    if (player.isSplashing && player.splashCooldown <= 0 && player.waterLevel > 0) {
        for (const person of people) {
            if (player.x < person.x + person.width + 50 &&
                player.x + player.width + 50 > person.x &&
                player.y < person.y + person.height &&
                player.y + player.height > person.y &&
                !person.isWet) { // Only count if person wasn't already wet
                person.isWet = true;
                person.vx = 0;
                player.waterLevel -= 20;
                if (player.waterLevel < 0) player.waterLevel = 0;
                updateStats('peopleSplashed');
            }
        }
        player.isSplashing = false;
        player.splashCooldown = 1;
    }

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    if (player.y + player.height > canvas.height) {
        player.y = canvas.height - player.height;
        player.vy = 0;
        player.isOnGround = true;
        player.canDoubleJump = true; // Reset double jump when hitting the ground
    }

    // Update people movement
    for (const person of people) {
        if (!person.isWet) {
            person.x += person.vx;

            // Check platform boundaries
            if (person.x < person.platform.x || person.x + person.width > person.platform.x + person.platform.width) {
                person.vx *= -1; // Reverse direction
            }
        }
    }

    // Update elephants movement
    for (const elephant of elephants) {
        elephant.x += elephant.vx;

        // Check platform boundaries for elephants
        if (elephant.x < elephant.platform.x || 
            elephant.x + elephant.width > elephant.platform.x + elephant.platform.width) {
            elephant.vx *= -1;
        }

        // Check collision with player
        if (player.x < elephant.x + elephant.width &&
            player.x + player.width > elephant.x &&
            player.y < elephant.y + elephant.height &&
            player.y + player.height > elephant.y) {
            player.waterLevel = 0; // Lion loses all water
        }
    }

    // Check for power-up collisions
    for (const powerUp of powerUps) {
        if (powerUp.active && 
            player.x < powerUp.x + powerUp.width &&
            player.x + player.width > powerUp.x &&
            player.y < powerUp.y + powerUp.height &&
            player.y + player.height > powerUp.y) {
            
            powerUp.active = false;
            if (powerUp.type === 'soup') {
                player.hasSoup = true;
                updateStats('soupsEaten');
            } else if (powerUp.type === 'meat') {
                player.hasMeat = true;
                updateStats('meatsConsumed');
            }
        }
    }

    // Check if all people are wet and game wasn't won before
    if (!gameWon && people.every(person => person.isWet)) {
        gameWon = true;
        updateStats('gamesWon');
    }
}

// Update draw function to hide splash button when game is won
function draw() {
    // Set the background color to a pale light blue
    ctx.fillStyle = '#E0FFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw trees
    for (const tree of trees) {
        ctx.drawImage(tree.sprite, tree.x, tree.y, 50, 100);
    }

    // Draw platforms
    for (const platform of platforms) {
        ctx.fillStyle = 'green';
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    }

    // Draw the ground
    ctx.fillStyle = '#CD7F32';
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

    // Draw elephants
    for (const elephant of elephants) {
        ctx.save();
        if (elephant.vx > 0) {
            ctx.scale(-1, 1);
            ctx.drawImage(elephantSprite, -elephant.x - elephant.width, elephant.y, elephant.width, elephant.height);
        } else {
            ctx.drawImage(elephantSprite, elephant.x, elephant.y, elephant.width, elephant.height);
        }
        ctx.restore();
    }

    // Draw the shower sprite for the well
    ctx.drawImage(wellSprite, well.x, well.y, well.width, well.height);

    // Draw people
    for (const person of people) {
        ctx.save();
        if (person.isWet) {
            ctx.drawImage(person.spriteWet, person.x, person.y, person.width, person.height);
        } else {
            if (person.vx > 0) {
                ctx.scale(-1, 1);
                ctx.drawImage(person.spriteLeft, -person.x - person.width, person.y, person.width, person.height);
            } else {
                ctx.drawImage(person.spriteLeft, person.x, person.y, person.width, person.height);
            }
        }
        ctx.restore();
    }

    // Draw the lion sprite
    ctx.drawImage(player.sprite, player.x, player.y, player.width, player.height);

    ctx.fillStyle = 'blue';
    ctx.fillRect(player.x, player.y - 10, (player.waterLevel / 100) * player.width, 5);

    // Draw stats table in top right corner
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(canvas.width - 200, 10, 190, 120); // Shorter table (was 140)
    
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Games Won: ' + gameStats.gamesWon, canvas.width - 190, 35);
    ctx.fillText('People Splashed: ' + gameStats.peopleSplashed, canvas.width - 190, 55);
    ctx.fillText('Water Refills: ' + gameStats.waterRefills, canvas.width - 190, 75);
    ctx.fillText('Soups Eaten: ' + gameStats.soupsEaten, canvas.width - 190, 95);
    ctx.fillText('Meats Consumed: ' + gameStats.meatsConsumed, canvas.width - 190, 115);

    // Draw power-ups
    for (const powerUp of powerUps) {
        if (powerUp.active) {
            ctx.drawImage(powerUp.sprite, powerUp.x, powerUp.y, powerUp.width, powerUp.height);
        }
    }

    // Display win message and play again button if the game is won
    if (gameWon) {
        // Draw congratulations message
        ctx.fillStyle = 'gold';
        ctx.font = '60px Comic Sans MS';
        ctx.textAlign = 'center';
        ctx.fillText("Congratulations, you won!", canvas.width / 2, canvas.height / 2);

        // Draw play more button
        ctx.fillStyle = '#444444'; // Dark gray color
        ctx.font = '40px Arial';
        ctx.fillText("Play More", canvas.width / 2, canvas.height / 2 + 60);

        // Add invisible button hitbox for mouse/touch
        const buttonWidth = 200;
        const buttonHeight = 50;
        const buttonX = canvas.width / 2 - buttonWidth / 2;
        const buttonY = canvas.height / 2 + 30;

        // Store button position for click detection
        playAgainButton = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
    } else {
        playAgainButton = null;
    }

    // Draw mobile controls if on touch device and game is not won
    if ('ontouchstart' in window && !gameWon) {
        // Draw splash button with less transparency (more visible)
        ctx.beginPath();
        ctx.arc(splashButton.x, splashButton.y, splashButton.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        // Add slight fill for better visibility
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fill();

        // Draw water drop shape
        ctx.beginPath();
        ctx.moveTo(splashButton.x, splashButton.y - 20);
        ctx.bezierCurveTo(
            splashButton.x - 20, splashButton.y + 10,
            splashButton.x - 20, splashButton.y + 20,
            splashButton.x, splashButton.y + 20
        );
        ctx.bezierCurveTo(
            splashButton.x + 20, splashButton.y + 20,
            splashButton.x + 20, splashButton.y + 10,
            splashButton.x, splashButton.y - 20
        );
        ctx.strokeStyle = 'rgba(0, 120, 255, 0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}

const keys = {};
document.addEventListener('keydown', (event) => {
    keys[event.key] = true;
    if (event.key === ' ' || event.key === 'ArrowUp') {
        if (player.isOnGround || player.canDoubleJump) {
            player.vy = player.jumpForce;
            if (!player.isOnGround) {
                player.canDoubleJump = false; // Use double jump
            }
        }
    }
    if (event.key === 'e' || event.key === 'd' || event.key === 'c'){
        player.isSplashing = true;
    }
    if (event.key === 'r'){
        generateLevel();
        player.x = 50;
        player.y = 50;
        player.waterLevel = 100;
        player.hasMeat = false;
        player.hasSoup = false;
    }
});
document.addEventListener('keyup', (event) => {
    keys[event.key] = false;
});

// Add touch event handlers
canvas.addEventListener('touchstart', (event) => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touches = event.touches;

    for (let touch of touches) {
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        // Check for play again button first
        if (handleClick(x, y)) {
            return;
        }

        // Check splash button
        const dx = x - splashButton.x;
        const dy = y - splashButton.y;
        if (dx * dx + dy * dy < splashButton.radius * splashButton.radius) {
            player.isSplashing = true;
            continue;
        }

        // Check left/right controls - only use 25% of screen on each side
        if (x < canvas.width * 0.25) {
            touchControls.left = true;
        } else if (x > canvas.width * 0.75) {
            touchControls.right = true;
        }
    }
});

canvas.addEventListener('touchend', (event) => {
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    
    // Reset controls that are no longer being touched
    const touches = event.touches;
    touchControls.left = false;
    touchControls.right = false;

    for (let touch of touches) {
        const x = touch.clientX - rect.left;
        if (x < canvas.width * 0.25) {
            touchControls.left = true;
        } else if (x > canvas.width * 0.75) {
            touchControls.right = true;
        }
    }
});

// Add swipe detection for jumping
let touchStartY = 0;
canvas.addEventListener('touchstart', (event) => {
    touchStartY = event.touches[0].clientY;
});

canvas.addEventListener('touchmove', (event) => {
    event.preventDefault();
    const touchY = event.touches[0].clientY;
    const swipeDistance = touchStartY - touchY;

    if (swipeDistance > 50) { // Minimum swipe distance
        if (player.isOnGround || player.canDoubleJump) {
            player.vy = player.jumpForce;
            if (!player.isOnGround) {
                player.canDoubleJump = false;
            }
        }
        touchStartY = touchY; // Reset to prevent multiple jumps
    }
});

// Modify click handler to generate new level
function handleClick(x, y) {
    if (gameWon && playAgainButton) {
        if (x >= playAgainButton.x && 
            x <= playAgainButton.x + playAgainButton.width &&
            y >= playAgainButton.y && 
            y <= playAgainButton.y + playAgainButton.height) {
            
            // Generate new random seed
            rng.seed = Math.floor(Math.random() * 1000000);
            // Update URL with new seed
            window.history.replaceState({}, '', `${window.location.pathname}?seed=${rng.seed}`);
            
            generateLevel();
            player.x = 50;
            player.y = 50;
            player.waterLevel = 100;
            player.hasMeat = false;
            player.hasSoup = false;
            return true;
        }
    }
    return false;
}

// Add variable to track button position
let playAgainButton = null;

// Add mouse click handler
canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    handleClick(x, y);
});

// Initialize game with loading indicator
window.onload = function() {
    log("Window loaded");
    showLoadingMessage();
    detectMobileBrowser();
    
    // Delay level generation to allow loading message to render
    setTimeout(() => {
        log("Starting game initialization");
        resizeCanvas();
        generateLevel();
        gameLoop(0);
        log("Game initialized");
    }, 100);
};