const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const effortFill = document.getElementById('effort-fill');
const boredomFill = document.getElementById('boredom-fill');
const scoreDisplay = document.getElementById('score-display');
const coinDisplay = document.getElementById('coin-display');
const highScoreDisplay = document.getElementById('high-score-display');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const deathReason = document.getElementById('death-reason');
const finalScore = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Mobile Buttons
const btnUp = document.getElementById('btn-up');
const btnDown = document.getElementById('btn-down');
const btnLeft = document.getElementById('btn-left');
const btnRight = document.getElementById('btn-right');
const mobileControls = document.getElementById('mobile-controls');

// Mobile Detection
function isMobileDevice() {
    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1) || ('ontouchstart' in window);
}

if (isMobileDevice()) {
    mobileControls.style.display = 'flex';
}

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
    color: '#00b894'
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

// Touch Input Helper
function addTouchListener(btn, key) {
    const handleStart = (e) => { e.preventDefault(); keys[key] = true; };
    const handleEnd = (e) => { e.preventDefault(); keys[key] = false; };

    btn.addEventListener('mousedown', handleStart);
    btn.addEventListener('mouseup', handleEnd);
    btn.addEventListener('mouseleave', handleEnd);
    btn.addEventListener('touchstart', handleStart);
    btn.addEventListener('touchend', handleEnd);
    btn.addEventListener('touchcancel', handleEnd); // Handle interruptions
}

addTouchListener(btnUp, 'ArrowUp');
addTouchListener(btnDown, 'ArrowDown');
addTouchListener(btnLeft, 'ArrowLeft');
addTouchListener(btnRight, 'ArrowRight');

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

highScoreDisplay.textContent = `Best: ${highScore.toFixed(1)}s`;

function startGame() {
    isPlaying = true;
    score = 0;
    coins = 0;
    effort = 0;
    boredom = 0;
    enemies = [];
    collectibles = [];
    enemySpawnRate = 2000;
    enemySpawnTimer = 0;

    player.x = canvas.width / 2 - player.size / 2;
    player.y = canvas.height / 2 - player.size / 2;

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    coinDisplay.textContent = `Coins: ${coins}`;

    spawnCollectible();

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
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

    let moving = false;
    if (keys.ArrowUp) { player.y -= player.speed; moving = true; }
    if (keys.ArrowDown) { player.y += player.speed; moving = true; }
    if (keys.ArrowLeft) { player.x -= player.speed; moving = true; }
    if (keys.ArrowRight) { player.x += player.speed; moving = true; }

    player.x = Math.max(0, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.size, player.y));

    if (moving) {
        effort += 30 * dt;
        boredom -= 50 * dt;
    } else {
        effort -= 10 * dt;
        boredom += 15 * dt;
    }

    effort = Math.max(0, Math.min(100, effort));
    boredom = Math.max(0, Math.min(100, boredom));

    effortFill.style.width = `${effort}%`;
    boredomFill.style.width = `${boredom}%`;

    if (effort >= 100) return gameOver("TRIED TOO HARD");
    if (boredom >= 100) return gameOver("DIED OF BOREDOM");

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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

    requestAnimationFrame(gameLoop);
}
