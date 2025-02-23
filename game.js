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
const playerSize = 60; // New size for both width and height
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

let platforms = [];
let people = [];
let trees = []; // Array to hold tree positions
let gameWon = false; // Flag to track if the game is won

// Play background music
const backgroundMusic = document.getElementById('backgroundMusic');
backgroundMusic.play();

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    well.x = canvas.width - 100;
    well.y = canvas.height - 125; // Adjust position on resize
}

window.addEventListener('resize', resizeCanvas);

function generateLevel() {
    platforms = [{ x: 0, y: canvas.height - 50, width: canvas.width, height: 50 }]; // Ground
    people = [];
    trees = []; // Reset trees
    gameWon = false; // Reset game state

    // Increase the number of platforms
    const numPlatforms = Math.floor(Math.random() * 5) + 6; // At least twice as many platforms
    const groundZones = 8;
    const zoneWidth = canvas.width / groundZones;
    const personSize = 60; // 1.5x larger

    for (let i = 0; i < numPlatforms; i++) {
        let width = Math.max(Math.floor(Math.random() * 150) + 50, personSize * 2); // Ensure at least 2x person width
        let height = 20;
        let x, y;

        // Select a base platform to build from
        let basePlatform;
        if (platforms.length === 1) {
            // For the first platform, choose an even-numbered zone on the ground
            const zone = Math.floor(Math.random() * (groundZones / 2)) * 2;
            x = zone * zoneWidth + Math.random() * zoneWidth;
            y = platforms[0].y - Math.floor(Math.random() * 100 + player.height * 1.5);
            basePlatform = platforms[0];
        } else {
            // For subsequent platforms, choose an existing platform
            basePlatform = platforms[Math.floor(Math.random() * platforms.length)];
            const direction = Math.random() < 0.5 ? -1 : 1; // Left or right
            x = basePlatform.x + direction * (Math.random() * 100 + 50);
            y = basePlatform.y - Math.floor(Math.random() * 100 + player.height * 1.5);
        }

        // Ensure the new platform is within the canvas bounds
        if (x < 0) x = 0;
        if (x + width > canvas.width) x = canvas.width - width;
        if (y < 0) y = 0;

        platforms.push({ x, y, width, height });

        // Randomly place trees on the platform
        const numTrees = Math.floor(Math.random() * 2) + 1; // 1 to 2 trees per platform
        for (let j = 0; j < numTrees; j++) {
            const treeX = Math.random() * (width - 50) + x; // Ensure tree doesn't overlap platform edges
            const treeY = y - 65; // Place tree on top of the platform
            const treeSprite = treeSprites[Math.floor(Math.random() * treeSprites.length)];
            trees.push({ x: treeX, y: treeY, sprite: treeSprite });
        }
    }

    // Place trees on the ground
    const numGroundTrees = Math.floor(Math.random() * 3) + 2; // 2 to 4 trees on the ground
    for (let i = 0; i < numGroundTrees; i++) {
        const treeX = Math.random() * (canvas.width - 50);
        const treeY = canvas.height - 100; // Place tree on the ground
        const treeSprite = treeSprites[Math.floor(Math.random() * treeSprites.length)];
        trees.push({ x: treeX, y: treeY, sprite: treeSprite });
    }

    const numPeople = Math.floor(Math.random() * 3) + 3;
    const occupiedPlatforms = new Set();
    let groundPeopleCount = 0;

    for (let i = 0; i < numPeople; i++) {
        let platform;
        let personX, personY;

        if (groundPeopleCount < 2 && Math.random() < 0.5) {
            // Place on ground if less than 2 people are there
            personX = Math.floor(Math.random() * (canvas.width - personSize));
            personY = platforms[0].y - personSize;
            platform = platforms[0];
            groundPeopleCount++;
        } else {
            // Find a platform that is not occupied and is at least 3x person width
            // Try to find an available platform
            let foundPlatform = false;
            for (let p of platforms) {
                if (p !== platforms[0] && !occupiedPlatforms.has(p)) {
                    platform = p;
                    foundPlatform = true;
                    break;
                }
            }

            // If no platform found, stop generating more people
            if (!foundPlatform) {
                break;
            }

            personX = Math.floor(Math.random() * (platform.width - personSize)) + platform.x;
            personY = platform.y - personSize;
            occupiedPlatforms.add(platform);
        }

        // Add velocity to people
        const velocity = Math.random() < 0.5 ? 0.5 : -0.5; // Random initial direction
        const spriteRight = new Image();
        spriteRight.src = 'running-right.png';
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
            spriteRight,
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
    if (gameWon) return; // Stop updating if the game is won

    player.vx = 0;
    if (keys['ArrowLeft']) player.vx = -5;
    if (keys['ArrowRight']) player.vx = 5;

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

    if (player.isSplashing && player.splashCooldown <= 0) {
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

    // Check if all people are wet
    gameWon = people.every(person => person.isWet);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw trees
    for (const tree of trees) {
        ctx.drawImage(tree.sprite, tree.x, tree.y, 50, 100); // Draw tree with fixed size
    }

    // Draw platforms
    for (const platform of platforms) {
        ctx.fillStyle = 'green';
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    }

    // Draw the ground
    ctx.fillStyle = '#CD7F32'; // Set ground color to bronze
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

    // Draw the shower sprite for the well
    ctx.drawImage(wellSprite, well.x, well.y, well.width, well.height);

    for (const person of people) {
        let sprite = person.isWet ? person.spriteWet : (person.vx > 0 ? person.spriteRight : person.spriteLeft);
        ctx.drawImage(sprite, person.x, person.y, person.width, person.height);
    }

    // Draw the lion sprite
    ctx.drawImage(player.sprite, player.x, player.y, player.width, player.height);

    ctx.fillStyle = 'blue';
    ctx.fillRect(player.x, player.y - 10, (player.waterLevel / 100) * player.width, 5);

    // Display win message if the game is won
    if (gameWon) {
        ctx.fillStyle = 'gold';
        ctx.font = '48px Comic Sans MS';
        ctx.textAlign = 'center';
        ctx.fillText("Congratulations, you won!", canvas.width / 2, canvas.height / 2);
    }
}

const keys = {};
document.addEventListener('keydown', (event) => {
    keys[event.key] = true;
    if (event.key === ' ') {
        if (player.isOnGround || player.canDoubleJump) {
            player.vy = player.jumpForce;
            if (!player.isOnGround) {
                player.canDoubleJump = false; // Use double jump
            }
        }
    }
    if (event.key === 'e'){
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