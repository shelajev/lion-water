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
    isOnGround: true // Track if the player is on the ground
};

// Load the lion sprite
player.sprite.src = 'lion.png';

// Load elephant sprite
const elephantSprite = new Image();
elephantSprite.src = 'elephant.png';

let platforms = [];
let people = [];
let trees = []; // Array to hold tree positions
let gameWon = false; // Flag to track if the game is won
let elephants = []; // New array for elephants

// Play background music
const backgroundMusic = document.getElementById('backgroundMusic');
// backgroundMusic.play(); // Remove this line

// Add music start to first interaction
let musicStarted = false;

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

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    well.x = canvas.width - 100;
    well.y = canvas.height - 125; // Adjust position on resize
}

window.addEventListener('resize', resizeCanvas);

function generateLevel() {
    platforms = [{ x: 0, y: canvas.height - 50, width: canvas.width, height: 50 }];
    people = [];
    trees = [];
    gameWon = false;
    elephants = [];

    const numPlatforms = rng.randInt(9, 15); // Previously: Math.floor(Math.random() * 5 * 1.5) + 9
    const groundZones = 8;
    const zoneWidth = canvas.width / groundZones;
    const personSize = 60;
    const elephantSize = 80;
    const minPlatformY = 100;

    // Generate 2-3 elephants on the ground
    const numElephants = rng.randInt(2, 4);
    for (let i = 0; i < numElephants; i++) {
        const elephantX = rng.randInt(0, canvas.width - elephantSize);
        const elephantY = canvas.height - 50 - elephantSize * 0.7;
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
        let width = Math.max(rng.randInt(50, 200), personSize * 2);
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
        const numTrees = rng.randInt(1, 3);
        for (let j = 0; j < numTrees; j++) {
            const treeX = rng.random() * (width - 50) + x;
            const treeY = y - 65;
            const treeSprite = treeSprites[rng.randInt(0, treeSprites.length)];
            trees.push({ x: treeX, y: treeY, sprite: treeSprite });
        }
    }

    // Place trees on the ground
    const numGroundTrees = rng.randInt(2, 5);
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
        personY = platform.y - personSize * 0.7;
        occupiedPlatforms.add(platform);

        const velocity = rng.chance(0.5) ? 0.5 : -0.5;
        const spriteLeft = new Image();
        spriteLeft.src = 'running-left.png';
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
}

generateLevel();

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

    player.vx = 0;
    if (keys['ArrowLeft']) player.vx = -6; // Faster lion movement (was -5)
    if (keys['ArrowRight']) player.vx = 6; // Faster lion movement (was 5)

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
        player.waterLevel = 100;
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
                player.y + player.height > person.y) {
                person.isWet = true;
                person.vx = 0; // Stop movement when splashed
                player.waterLevel -= 20;
                if (player.waterLevel < 0) player.waterLevel = 0;
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

    // Check if all people (excluding elephants) are wet
    gameWon = people.every(person => person.isWet);
}

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

    // Display win message if the game is won
    if (gameWon) {
        ctx.fillStyle = 'gold';
        ctx.font = '60px Comic Sans MS';
        ctx.textAlign = 'center';
        ctx.fillText("Congratulations, you won!", canvas.width / 2, canvas.height / 2);
    }
}

const keys = {};
document.addEventListener('keydown', (event) => {
    // Start music on first interaction if not already started
    if (!musicStarted) {
        backgroundMusic.play().catch(e => console.log("Music play failed:", e));
        musicStarted = true;
    }

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
    }
});
document.addEventListener('keyup', (event) => {
    keys[event.key] = false;
});

gameLoop();