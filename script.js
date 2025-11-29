const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const effortFill = document.getElementById('effort-fill');
const boredomFill = document.getElementById('boredom-fill');
const scoreDisplay = document.getElementById('score-display');
const coinDisplay = document.getElementById('coin-display');
const highScoreDisplay = document.getElementById('high-score-display');
const mainMenu = document.getElementById('main-menu');
const gameUi = document.getElementById('game-ui');
const gameOverScreen = document.getElementById('game-over-screen');
const deathReason = document.getElementById('death-reason');
const finalScore = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');

// Game State
let isPlaying = false;
let lastTime = 0;
let effort = 0;
let boredom = 0;
let score = 0;
let coins = 0;
let highScore = parseFloat(localStorage.getItem('dontTryHighScore')) || 0;

// Player
const player = {
    x: 0,
    y: 0,
    size: 25,
    speed: 5,
    color: '#00b894',
    targetX: null,
    targetY: null
};

// Input
const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

// Enemies & Coins
let enemies = [];
let collectibles = [];
let stalker = null;
let enemySpawnTimer = 0;
let enemySpawnRate = 2000;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (!isPlaying) {
        player.x = canvas.width / 2 - player.size / 2;
        player.y = canvas.height / 2 - player.size / 2;
    }
}
window.addEventListener('resize', resize);
resize();

// Keyboard Input
window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
});
window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
});

// Click/Touch Input
function setTarget(e) {
    if (!isPlaying) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    player.targetX = clientX - rect.left - player.size / 2;
    player.targetY = clientY - rect.top - player.size / 2;
}

canvas.addEventListener('mousedown', setTarget);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent scrolling
    setTarget(e);
}, { passive: false });

// Dragging support
canvas.addEventListener('mousemove', (e) => {
    if (e.buttons === 1) setTarget(e);
});
canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    setTarget(e);
}, { passive: false });


startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
menuBtn.addEventListener('click', showMainMenu);

highScoreDisplay.textContent = `Best: ${highScore.toFixed(1)}s`;

function showMainMenu() {
    isPlaying = false;
    mainMenu.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    gameUi.classList.add('hidden');
}

function startGame() {
    isPlaying = true;
    score = 0;
    coins = 0;
    effort = 0;
    boredom = 0;
    enemies = [];
    collectibles = [];
    stalker = null;
    enemySpawnRate = 2000;
    enemySpawnTimer = 0;

    player.x = canvas.width / 2 - player.size / 2;
    player.y = canvas.height / 2 - player.size / 2;
    player.targetX = player.x;
    player.targetY = player.y;

    mainMenu.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameUi.classList.remove('hidden');

    coinDisplay.textContent = `Coins: ${coins}`;

    spawnCollectible();

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function spawnStalker() {
    // Spawn far away
    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -50 : canvas.width + 50;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? -50 : canvas.height + 50;
    }

    stalker = {
        x, y,
        size: 25,
        speed: 0.6, // Even slower (was 1.2)
        color: '#ff0000'
    };
}

function spawnEnemy() {
    const size = 20 + Math.random() * 30;
    let x, y;

    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -size : canvas.width + size;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? -size : canvas.height + size;
    }

    const angle = Math.atan2(player.y - y, player.x - x);
    const speed = 3 + (score * 0.05);

    enemies.push({
        x, y, size,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#d63031'
    });
}

function spawnCollectible() {
    if (!isPlaying) return;
    if (collectibles.length >= 3) return;

    const size = 15;
    const x = 50 + Math.random() * (canvas.width - 100);
    const y = 50 + Math.random() * (canvas.height - 100);

    collectibles.push({
        x, y, size,
        color: '#fdcb6e'
    });
}

function gameOver(reason) {
    isPlaying = false;
    gameOverScreen.classList.remove('hidden');
    deathReason.textContent = reason;
    finalScore.textContent = `${score.toFixed(1)}s (Coins: ${coins})`;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('dontTryHighScore', highScore);
        highScoreDisplay.textContent = `Best: ${highScore.toFixed(1)}s`;
    }
}

function checkCircleCollision(circle, rect) {
    const distX = Math.abs(circle.x - rect.x - rect.size / 2);
    const distY = Math.abs(circle.y - rect.y - rect.size / 2);

    if (distX > (rect.size / 2 + circle.size / 2)) { return false; }
    if (distY > (rect.size / 2 + circle.size / 2)) { return false; }

    if (distX <= (rect.size / 2)) { return true; }
    if (distY <= (rect.size / 2)) { return true; }

    const dx = distX - rect.size / 2;
    const dy = distY - rect.size / 2;
    return (dx * dx + dy * dy <= (circle.size / 2 * circle.size / 2));
}

function gameLoop(timestamp) {
    if (!isPlaying) return;

    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    score += dt;
    scoreDisplay.textContent = `Time Wasted: ${score.toFixed(1)}s`;

    // Difficulty Ramp
    enemySpawnTimer += dt * 1000;
    // Spawn rate decreases slower: 2000ms start, -5ms per second. Min 500ms.
    const currentSpawnRate = Math.max(500, 2000 - (score * 10));

    if (enemySpawnTimer > currentSpawnRate) {
        if (enemies.length < 50) { // Cap max enemies to prevent lag/chaos
            spawnEnemy();
        }
        enemySpawnTimer = 0;
    }

    if (collectibles.length < 3 && Math.random() < 0.01) {
        spawnCollectible();
    }

    // Player Movement (Hybrid: Keys override Click)
    let moving = false;
    let keyMove = false;

    if (keys.ArrowUp) { player.y -= player.speed; keyMove = true; }
    if (keys.ArrowDown) { player.y += player.speed; keyMove = true; }
    if (keys.ArrowLeft) { player.x -= player.speed; keyMove = true; }
    if (keys.ArrowRight) { player.x += player.speed; keyMove = true; }

    if (keyMove) {
        moving = true;
        // Reset target so it doesn't snap back when keys are released
        player.targetX = player.x;
        player.targetY = player.y;
    } else {
        // Click-to-move logic
        const dx = player.targetX - player.x;
        const dy = player.targetY - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
            moving = true;
            const moveX = (dx / dist) * player.speed;
            const moveY = (dy / dist) * player.speed;

            player.x += moveX;
            player.y += moveY;
        }
    }

    player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));

    // Meters Logic
    if (moving) {
        effort += 15 * dt; // Was 30
        boredom -= 25 * dt; // Was 50
    } else {
        effort -= 5 * dt; // Was 10
        boredom += 8 * dt; // Was 15
    }

    effort = Math.max(0, Math.min(100, effort));
    boredom = Math.max(0, Math.min(100, boredom));

    effortFill.style.width = `${effort}%`;
    boredomFill.style.width = `${boredom}%`;

    if (effort >= 100) return gameOver("TRIED TOO HARD");
    if (boredom >= 100) return gameOver("DIED OF BOREDOM");

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Target Marker (Optional, for feedback)
    if (moving) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(player.targetX + player.size / 2, player.targetY + player.size / 2, 10, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.size, player.size);

    collectibles.forEach((c, index) => {
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.fill();

        if (checkCircleCollision(c, player)) {
            collectibles.splice(index, 1);
            coins++;
            coinDisplay.textContent = `Coins: ${coins}`;
            boredom = Math.max(0, boredom - 10);
        }
    });

    enemies.forEach((enemy) => {
        enemy.x += enemy.vx;
        enemy.y += enemy.vy;

        if (enemy.x < 0 || enemy.x > canvas.width) enemy.vx *= -1;
        if (enemy.y < 0 || enemy.y > canvas.height) enemy.vy *= -1;

        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = enemy.color;
        ctx.fill();

        if (checkCircleCollision(enemy, player)) {
            return gameOver("HIT BY RESPONSIBILITY");
        }
    });

    // Stalker Logic
    if (stalker) {
        // Move towards player
        const dx = player.x - stalker.x;
        const dy = player.y - stalker.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            stalker.x += (dx / dist) * stalker.speed;
            stalker.y += (dy / dist) * stalker.speed;
        }

        // Grow Stalker
        stalker.size += 5 * dt;

        // Draw Stalker
        ctx.beginPath();
        ctx.arc(stalker.x, stalker.y, stalker.size / 2, 0, Math.PI * 2);
        ctx.fillStyle = stalker.color;
        ctx.fill();

        // Draw Text
        ctx.fillStyle = '#fff';
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText("RESPONSIBILITY", stalker.x, stalker.y - 20);

        if (checkCircleCollision(stalker, player)) {
            return gameOver("CAUGHT BY RESPONSIBILITY");
        }
    } else if (score > 5 && !stalker) { // Spawn after 5 seconds
        spawnStalker();
    }

    requestAnimationFrame(gameLoop);
}
