const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    transports: ['websocket'],
    pingTimeout: 60000,
    pingInterval: 10000
});
const path = require('path');
const RateLimiter = require('./RateLimiter');

// Initialize rate limiter with relaxed thresholds (server-side safety net only)
const rateLimiter = new RateLimiter({
    maxClicksPerSecond: 50,      // Very high - only catch extreme cases
    maxClicksPerWindow: 200,     // 200 clicks in 5 seconds
    windowSize: 5000,
    uniformityThreshold: 15,     // Stricter bot detection
    warningThreshold: 0.9        // Warn at 90% of limit
});

app.use(express.static(path.join(__dirname, '../client')));

app.get('/host', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

const players = {};
const HOST_PASSWORD = 'a';
let gameState = {
    status: 'LOBBY', // LOBBY | COUNTDOWN | RUNNING
    hostId: null
};
let startTime = 0;
let finishedPlayers = [];
const FINISH_LINE_X = 5400;
const COUNTDOWN_TIME = 3;

const TICK_RATE = 10;
const playerIndexMap = new Map();
let nextFreeIndex = 0;
const availableIndexes = [];

setInterval(() => {
    const ids = Object.keys(players);
    if (ids.length > 0) {
        const buffer = new Float32Array(ids.length * 2);

        ids.forEach((id, i) => {
            const idx = playerIndexMap.get(id);
            buffer[i * 2] = idx;
            buffer[i * 2 + 1] = players[id].x;
        });

        io.emit('gameStateUpdate', {
            b: buffer,
            ts: Date.now()
        });
    }
}, 1000 / TICK_RATE);

io.on('connection', (socket) => {
    socket.on('selectRole', (data) => {
        const { role, name, password, color } = data;
        socket.role = role;

        if (role === 'host') {
            if (password !== HOST_PASSWORD) {
                socket.emit('hostRejected', 'INVALID_PASSWORD');
                return;
            }

            gameState.hostId = socket.id;

            socket.emit('currentPlayers', players);
            socket.emit('hostAccepted');
            return;
        }

        const horseColor = color || (Math.random() * 0xffffff);
        const SKY_HEIGHT = 110;
        const TOP_MARGIN = 20;
        const LANE_HEIGHT = 40;
        const MAX_LANES = 8;

        let assignedIndex;
        if (availableIndexes.length > 0) {
            assignedIndex = availableIndexes.shift();
        } else {
            assignedIndex = nextFreeIndex++;
        }

        playerIndexMap.set(socket.id, assignedIndex);
        const laneIndex = assignedIndex % MAX_LANES;
        const overlapOffset = (assignedIndex >= MAX_LANES) ? (Math.random() * 10 - 5) : 0;

        players[socket.id] = {
            x: 100,
            y: SKY_HEIGHT + TOP_MARGIN + (laneIndex * LANE_HEIGHT) + overlapOffset,
            id: socket.id,
            serverIndex: assignedIndex,
            name,
            horseColor: horseColor
        };

        socket.emit('currentPlayers', players);
        socket.broadcast.emit('newPlayer', players[socket.id]);
        socket.emit('playerAccepted', { index: assignedIndex });
    });

    socket.on('hostStartGame', () => {
        if (socket.id !== gameState.hostId) return;

        finishedPlayers = [];

        Object.values(players).forEach(p => p.x = 100);

        // Reset rate limiter for all players at game start
        Object.keys(players).forEach(playerId => {
            rateLimiter.resetPlayer(playerId);
        });

        gameState.status = 'COUNTDOWN';
        io.emit('startCountdown');

        setTimeout(() => {
            gameState.status = 'RUNNING';
            startTime = Date.now();
        }, (COUNTDOWN_TIME + 1) * 1000);
    });

    socket.on('playerMovement', (data) => {
        if (socket.role !== 'player' || gameState.status !== 'RUNNING') return;
        const player = players[socket.id];
        if (!player) return;
        const alreadyFinished = finishedPlayers.find(p => p.id === socket.id);
        if (alreadyFinished) return;

        // Anti-auto-click protection
        const rateCheck = rateLimiter.recordClick(socket.id);

        if (!rateCheck.allowed) {
            // Send warning or block message to client
            socket.emit('rateLimitWarning', {
                reason: rateCheck.reason,
                blocked: rateCheck.reason.includes('BLOCKED') || rateCheck.reason.includes('BOT'),
                warningCount: rateCheck.warningCount || 0
            });

            // If blocked permanently, disconnect
            if (rateCheck.reason.includes('BLOCKED') || rateCheck.reason.includes('BOT')) {
                console.log(`[ANTI-CHEAT] Player ${socket.id} blocked: ${rateCheck.reason}`);
                socket.disconnect(true);
            }
            return;
        }

        // Send soft warning if approaching limit
        if (rateCheck.warning) {
            socket.emit('rateLimitWarning', {
                reason: rateCheck.reason,
                blocked: false,
                warningCount: rateCheck.warningCount || 0
            });
        }

        // Validate movement data
        if (typeof data.x !== 'number' || isNaN(data.x)) {
            console.warn(`[VALIDATION] Invalid x position from ${socket.id}`);
            return;
        }

        // Prevent teleporting (max movement per click is 15 pixels)
        const maxMovement = 20; // Allow some buffer for network latency
        if (data.x - player.x > maxMovement) {
            console.warn(`[VALIDATION] Suspicious movement from ${socket.id}: ${data.x - player.x}px`);
            data.x = player.x + maxMovement; // Cap the movement
        }

        player.x = data.x;

        if (data.x >= FINISH_LINE_X) {
            const finishTime = ((Date.now() - startTime) / 1000).toFixed(2);
            const result = {
                id: socket.id,
                name: player.name,
                finishTime: finishTime,
                horseColor: player.horseColor,
                rank: finishedPlayers.length + 1 // Rank hiện tại = số người đã về + 1
            };

            finishedPlayers.push(result);

            socket.emit('youFinished', { rank: result.rank });

            io.emit('updateFinishedList', finishedPlayers);

            if (finishedPlayers.length === 1) {
                io.emit('firstFinished');
            }

            const totalPlayers = Object.keys(players).length;
            const limit = Math.min(3, totalPlayers);

            if (finishedPlayers.length >= limit) {
                gameState.status = 'FINISHED';
                const top10 = finishedPlayers.map((p, index) => ({
                    id: p.id,
                    rank: index + 1,
                    name: p.name,
                    finishTime: p.finishTime,
                    horseColor: p.horseColor
                }));

                io.emit('raceFinished', {
                    top10: top10
                });
            }
        }
    });

    socket.on('disconnect', () => {
        if (socket.id === gameState.hostId) {
            gameState.hostId = null;
            gameState.status = 'LOBBY';
            finishedPlayers = [];
        }

        const indexToFree = playerIndexMap.get(socket.id);

        if (indexToFree !== undefined) {
            availableIndexes.push(indexToFree);
            availableIndexes.sort((a, b) => a - b);
        }

        // Clean up rate limiter tracking
        rateLimiter.removePlayer(socket.id);

        playerIndexMap.delete(socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });

    socket.on('hostRestartGame', () => {
        if (socket.id !== gameState.hostId) return;

        finishedPlayers = [];
        gameState.status = 'LOBBY';
        Object.values(players).forEach(p => p.x = 100);

        // Reset rate limiter for all players
        Object.keys(players).forEach(playerId => {
            rateLimiter.resetPlayer(playerId);
        });

        io.emit('raceReset', players);
    });

    // socket.on('resetRace', () => {
    //     finishedPlayers = [];
    //     gameState.status = 'LOBBY';
    //     Object.values(players).forEach(p => p.x = 150);
    //     io.emit('raceReset', players);
    // });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server chạy tại http://localhost:${PORT}`);
});
