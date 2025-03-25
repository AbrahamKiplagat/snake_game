// Game Constants
const FRUIT_TYPES = [
    { color: '#FF4444', points: 1, name: 'Apple' }, 
    { color: '#FFA500', points: 2, name: 'Orange' },
    { color: '#FFFF00', points: 3, name: 'Banana' },
    { color: '#00FF00', points: 0, name: 'Speed Boost', isPowerUp: true, duration: 5000 },
    { color: '#FF00FF', points: 5, name: 'Special Fruit' }
];

const LEVELS = [
    { score: 0, speed: 150, fruits: 3, obstacles: 3 },
    { score: 10, speed: 130, fruits: 4, obstacles: 5 },
    { score: 25, speed: 110, fruits: 5, obstacles: 7 },
    { score: 50, speed: 90, fruits: 6, obstacles: 10 },
    { score: 100, speed: 70, fruits: 7, obstacles: 12 }
];

// Game Variables
let canvas, ctx;
let box, gridSize;
let snake, fruits, obstacles, particles;
let score, level, comboCount, multiplier;
let direction, nextDirection;
let gameRunning, lastUpdateTime, accumulatedTime;
let speed, baseSpeed;
let powerUpActive, powerUpEndTime;
let animationFrameId;

// DOM Elements
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const multiplierElement = document.getElementById('multiplier');
const finalScoreElement = document.getElementById('finalScore');
const finalLevelElement = document.getElementById('finalLevel');
const gameOverElement = document.getElementById('gameOver');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const playAgainBtn = document.getElementById('playAgainBtn');

// Initialize Game
function initGame() {
    console.log("Initializing game...");
    canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }
    
    ctx = canvas.getContext('2d');
    
    const size = Math.min(window.innerWidth - 40, 600);
    canvas.width = size;
    canvas.height = size;
    
    box = 20;
    gridSize = Math.floor(canvas.width / box);
    
    // Initialize arrays
    snake = [];
    fruits = [];
    obstacles = [];
    particles = [];
    
    // Create initial snake
    snake = [
        {x: 10, y: 10},
        {x: 10, y: 11},
        {x: 10, y: 12}
    ];
    
    // Reset game state
    score = 0;
    level = 0;
    comboCount = 0;
    multiplier = 1;
    direction = null;
    nextDirection = 'RIGHT'; // Default starting direction
    gameRunning = false;
    baseSpeed = LEVELS[level].speed;
    speed = baseSpeed;
    powerUpActive = false;
    
    // Generate game elements
    generateObstacles();
    generateFruits();
    
    // Draw initial state
    drawGame();
    
    updateUI();
    gameOverElement.style.display = 'none';
    console.log("Game initialized successfully");
}

function drawGame() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw game elements
    drawGrid();
    drawObstacles();
    drawFruits();
    drawSnake();
    drawParticles();
    drawHUD();
}

function startGame() {
    if (gameRunning) return;
    console.log("Starting game...");
    gameRunning = true;
    lastUpdateTime = performance.now();
    accumulatedTime = 0;
    
    // Set initial direction if none is set
    if (!direction) direction = 'RIGHT';
    
    gameLoop();
}

function resetGame() {
    console.log("Resetting game...");
    cancelAnimationFrame(animationFrameId);
    initGame();
}

// Game Loop
function gameLoop(timestamp = 0) {
    if (!gameRunning) return;
    
    animationFrameId = requestAnimationFrame(gameLoop);
    
    const deltaTime = timestamp - lastUpdateTime;
    lastUpdateTime = timestamp;
    accumulatedTime += deltaTime;
    
    // Update game state
    updateParticles();
    
    // Draw game
    drawGame();
    
    // Check power-up expiration
    if (powerUpActive && timestamp > powerUpEndTime) {
        powerUpActive = false;
        speed = baseSpeed;
        console.log("Speed boost ended");
    }
    
    // Move snake at intervals
    if (accumulatedTime >= speed) {
        moveSnake();
        accumulatedTime = 0;
    }
}

// Movement and Game Logic
function moveSnake() {
    if (!direction) return;
    
    // Apply next direction if valid
    if (nextDirection) {
        const oppositeDirections = {
            'UP': 'DOWN', 'DOWN': 'UP',
            'LEFT': 'RIGHT', 'RIGHT': 'LEFT'
        };
        if (nextDirection !== oppositeDirections[direction]) {
            direction = nextDirection;
        }
        nextDirection = null;
    }
    
    const head = {...snake[0]};
    
    // Move head
    switch (direction) {
        case 'UP': head.y--; break;
        case 'DOWN': head.y++; break;
        case 'LEFT': head.x--; break;
        case 'RIGHT': head.x++; break;
    }
    
    // Check collisions
    if (checkCollision(head)) {
        console.log("Collision detected - game over");
        endGame();
        return;
    }
    
    // Check fruit consumption
    const fruitIndex = fruits.findIndex(f => f.x === head.x && f.y === head.y);
    let growSnake = false;
    
    if (fruitIndex >= 0) {
        const fruit = fruits[fruitIndex];
        console.log(`Ate ${fruit.type.name}`);
        
        // Handle power-ups
        if (fruit.type.isPowerUp) {
            powerUpActive = true;
            powerUpEndTime = performance.now() + fruit.type.duration;
            speed = Math.max(50, baseSpeed - 40); // Speed boost
            createParticles(head.x, head.y, fruit.type.color, 15);
            console.log("Speed boost activated");
        } else {
            // Normal fruit - update score and combo
            comboCount++;
            if (comboCount >= 3) {
                multiplier = Math.min(5, multiplier + 1);
                comboCount = 0;
                console.log(`Multiplier increased to x${multiplier}`);
            }
            score += fruit.type.points * multiplier;
            createParticles(head.x, head.y, fruit.type.color, 10);
            
            // Check level progression
            checkLevelUp();
        }
        
        fruits.splice(fruitIndex, 1);
        growSnake = true;
        generateFruits();
    } else {
        comboCount = 0;
        if (multiplier > 1) {
            console.log("Combo broken - resetting multiplier");
            multiplier = 1;
        }
    }
    
    // Move snake body
    if (!growSnake) snake.pop();
    snake.unshift(head);
    
    updateUI();
}

// Collision Detection
function checkCollision(head) {
    // Wall collision
    if (head.x < 0 || head.y < 0 || head.x >= gridSize || head.y >= gridSize) {
        console.log("Wall collision");
        return true;
    }
    
    // Obstacle collision
    if (obstacles.some(obs => obs.x === head.x && obs.y === head.y)) {
        console.log("Obstacle collision");
        return true;
    }
    
    // Self collision (skip head)
    const selfCollision = snake.slice(1).some(segment => segment.x === head.x && segment.y === head.y);
    if (selfCollision) console.log("Self collision");
    return selfCollision;
}

// Game Elements Generation
function generateObstacles() {
    obstacles = [];
    const obstacleCount = LEVELS[level].obstacles;
    console.log(`Generating ${obstacleCount} obstacles for level ${level + 1}`);
    
    for (let i = 0; i < obstacleCount; i++) {
        let newObstacle;
        let validPosition = false;
        let attempts = 0;
        const maxAttempts = 100;
        
        while (!validPosition && attempts < maxAttempts) {
            attempts++;
            newObstacle = {
                x: Math.floor(Math.random() * gridSize),
                y: Math.floor(Math.random() * gridSize)
            };
            
            // Check not on snake or existing obstacles
            validPosition = !snake.some(segment => 
                segment.x === newObstacle.x && segment.y === newObstacle.y
            ) && !obstacles.some(obs => 
                obs.x === newObstacle.x && obs.y === newObstacle.y
            );
            
            // Leave center area clear
            const centerX = gridSize / 2;
            const centerY = gridSize / 2;
            if (Math.abs(newObstacle.x - centerX) < 3 && Math.abs(newObstacle.y - centerY) < 3) {
                validPosition = false;
            }
        }
        
        if (validPosition) {
            obstacles.push(newObstacle);
        } else {
            console.warn(`Failed to find valid position for obstacle after ${maxAttempts} attempts`);
        }
    }
}

function generateFruits() {
    // Ensure fruits array exists
    if (!fruits) fruits = [];
    
    // Get current level configuration
    const currentLevel = LEVELS[Math.min(level, LEVELS.length - 1)];
    const targetFruitCount = currentLevel.fruits || 3;
    const neededFruits = targetFruitCount - fruits.length;
    
    if (neededFruits <= 0) return;
    
    console.log(`Generating ${neededFruits} new fruits`);
    
    for (let i = 0; i < neededFruits; i++) {
        let newFruit;
        let validPosition = false;
        let attempts = 0;
        const maxAttempts = 100;
        
        while (!validPosition && attempts < maxAttempts) {
            attempts++;
            newFruit = {
                x: Math.floor(Math.random() * gridSize),
                y: Math.floor(Math.random() * gridSize),
                type: FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)]
            };
            
            // Check position validity
            validPosition = true;
            
            // Check snake collision
            if (snake.some(segment => 
                segment.x === newFruit.x && segment.y === newFruit.y)) {
                validPosition = false;
                continue;
            }
            
            // Check obstacle collision
            if (obstacles.some(obs => 
                obs.x === newFruit.x && obs.y === newFruit.y)) {
                validPosition = false;
                continue;
            }
            
            // Check other fruits collision
            if (fruits.some(fruit => 
                fruit.x === newFruit.x && fruit.y === newFruit.y)) {
                validPosition = false;
            }
        }
        
        if (validPosition) {
            fruits.push(newFruit);
        } else {
            console.warn(`Failed to find valid position for fruit after ${maxAttempts} attempts`);
        }
    }
}

// Level System
function checkLevelUp() {
    if (level < LEVELS.length - 1 && score >= LEVELS[level + 1].score) {
        level++;
        baseSpeed = LEVELS[level].speed;
        speed = powerUpActive ? baseSpeed - 40 : baseSpeed;
        
        console.log(`Level up! Now level ${level + 1}`);
        
        // Clear existing obstacles and generate new ones
        obstacles = [];
        generateObstacles();
        
        // Generate new fruits for the new level
        fruits = [];
        generateFruits();
        
        createParticles(gridSize/2, gridSize/2, '#FFFFFF', 20);
    }
}

// Visual Effects
function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x * box + box/2,
            y: y * box + box/2,
            color: color,
            radius: Math.random() * 4 + 2,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: Math.random() * 30 + 20
        });
    }
    console.log(`Created ${count} particles`);
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Drawing Functions
function drawGrid() {
    ctx.strokeStyle = '#2A2A2A';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < canvas.width; i += box) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
}

function drawObstacles() {
    ctx.fillStyle = '#777777';
    obstacles.forEach(obs => {
        ctx.fillRect(obs.x * box, obs.y * box, box, box);
    });
}

function drawFruits() {
    fruits.forEach(fruit => {
        const size = box * 0.8;
        const offset = (box - size) / 2;
        const x = fruit.x * box + offset;
        const y = fruit.y * box + offset;
        
        // Fruit body
        ctx.fillStyle = fruit.type.color;
        ctx.beginPath();
        ctx.arc(x + size/2, y + size/2, size/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Fruit details based on type
        if (fruit.type.name === 'Apple') {
            // Apple stem
            ctx.strokeStyle = '#8D6E63';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + size/2, y);
            ctx.lineTo(x + size/2 + size/4, y - size/4);
            ctx.stroke();
            
            // Apple leaf
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.moveTo(x + size/2 + size/4, y - size/4);
            ctx.quadraticCurveTo(
                x + size/2 + size/2, y - size/2,
                x + size/2 + size/3, y - size/6
            );
            ctx.fill();
        } else if (fruit.type.name === 'Orange') {
            // Orange segments
            ctx.strokeStyle = 'rgba(255, 165, 0, 0.5)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x + size/2, y);
            ctx.lineTo(x + size/2, y + size);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(x, y + size/2);
            ctx.lineTo(x + size, y + size/2);
            ctx.stroke();
        } else if (fruit.type.name === 'Special Fruit') {
            // Special fruit sparkle
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.moveTo(x + size/2, y);
            ctx.lineTo(x + size, y + size/2);
            ctx.lineTo(x + size/2, y + size);
            ctx.lineTo(x, y + size/2);
            ctx.closePath();
            ctx.fill();
        }
    });
}

function drawSnake() {
    snake.forEach((segment, index) => {
        const isHead = index === 0;
        ctx.fillStyle = isHead ? '#4CAF50' : '#81C784';
        ctx.fillRect(segment.x * box, segment.y * box, box, box);
        
        // Border
        ctx.strokeStyle = powerUpActive ? '#00FF00' : '#1E1E1E';
        ctx.lineWidth = 2;
        ctx.strokeRect(segment.x * box, segment.y * box, box, box);
        
        // Draw eyes on head
        if (isHead && direction) {
            const eyeSize = box / 5;
            const leftEye = { x: segment.x * box + box/3, y: segment.y * box + box/3 };
            const rightEye = { x: segment.x * box + box*2/3, y: segment.y * box + box/3 };
            
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(leftEye.x, leftEye.y, eyeSize, 0, Math.PI * 2);
            ctx.arc(rightEye.x, rightEye.y, eyeSize, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(leftEye.x, leftEye.y, eyeSize/2, 0, Math.PI * 2);
            ctx.arc(rightEye.x, rightEye.y, eyeSize/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw tongue when moving
            if (direction === 'LEFT' || direction === 'RIGHT') {
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(
                    direction === 'RIGHT' ? segment.x * box + box : segment.x * box,
                    segment.y * box + box/2
                );
                ctx.lineTo(
                    direction === 'RIGHT' ? segment.x * box + box + 5 : segment.x * box - 5,
                    segment.y * box + box/2
                );
                ctx.stroke();
            }
        }
    });
}

function drawParticles() {
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 50;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
}

function drawHUD() {
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 20);
    ctx.fillText(`Level: ${level + 1}`, 10, 40);
    
    if (multiplier > 1) {
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`x${multiplier}`, 10, 60);
    }
    
    if (powerUpActive) {
        const remaining = ((powerUpEndTime - performance.now()) / 1000).toFixed(1);
        ctx.fillStyle = '#00FF00';
        ctx.fillText(`Speed Boost: ${remaining}s`, canvas.width - 150, 20);
    }
}

// UI Updates
function updateUI() {
    scoreElement.textContent = score;
    levelElement.textContent = level + 1;
    multiplierElement.textContent = `x${multiplier}`;
}

function endGame() {
    console.log("Game over");
    gameRunning = false;
    finalScoreElement.textContent = score;
    finalLevelElement.textContent = level + 1;
    gameOverElement.style.display = 'block';
    cancelAnimationFrame(animationFrameId);
}

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded");
    initGame();
    
    // Set up event listeners
    startBtn.addEventListener('click', startGame);
    resetBtn.addEventListener('click', resetGame);
    playAgainBtn.addEventListener('click', () => {
        gameOverElement.style.display = 'none';
        initGame();
        startGame();
    });

    // Keyboard controls
    document.addEventListener('keydown', e => {
        if (!gameRunning) return;
        
        switch (e.key) {
            case 'ArrowUp': nextDirection = 'UP'; break;
            case 'ArrowDown': nextDirection = 'DOWN'; break;
            case 'ArrowLeft': nextDirection = 'LEFT'; break;
            case 'ArrowRight': nextDirection = 'RIGHT'; break;
        }
    });

    // Mobile touch controls
    document.querySelectorAll('.mobile-controls button').forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const dir = btn.classList.contains('up') ? 'UP' :
                       btn.classList.contains('down') ? 'DOWN' :
                       btn.classList.contains('left') ? 'LEFT' : 'RIGHT';
            nextDirection = dir;
        });
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (!gameRunning) initGame();
    });
});