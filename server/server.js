const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    transports: ['websocket'],
    pingTimeout: 60000,
    pingInterval: 20000
});
const path = require('path');
const crypto = require('crypto');

app.use(express.static(path.join(__dirname, '../client')));

const players = {};
const HOST_PASSWORD = 'a';

// Mobile: khi chuyển app/tab, WebSocket hay bị drop => giữ player lại 1 thời gian để resume
const DISCONNECT_GRACE_MS = 60 * 1000;
const sessionToPlayerId = new Map(); // token -> playerId (ổn định)
const pendingRemoval = new Map(); // playerId -> timeout

function genToken() {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return crypto.randomBytes(16).toString('hex');
}

function cancelRemoval(playerId) {
    const t = pendingRemoval.get(playerId);
    if (t) clearTimeout(t);
    pendingRemoval.delete(playerId);
}

function finalizeRemoval(playerId) {
    const p = players[playerId];
    if (!p) return;

    const idx = playerIndexMap.get(playerId);
    if (idx !== undefined) {
        availableIndexes.push(idx);
        availableIndexes.sort((a, b) => a - b);
    }

    playerIndexMap.delete(playerId);
    if (p.token) sessionToPlayerId.delete(p.token);
    delete players[playerId];
    pendingRemoval.delete(playerId);

    io.emit('playerDisconnected', playerId);
}

function scheduleRemoval(playerId) {
    cancelRemoval(playerId);
    const t = setTimeout(() => finalizeRemoval(playerId), DISCONNECT_GRACE_MS);
    pendingRemoval.set(playerId, t);
}
let gameState = {
    status: 'LOBBY', // LOBBY | COUNTDOWN | RUNNING
    hostId: null
};
let startTime = 0;
let finishedPlayers = [];
const FINISH_LINE_X = 5000;
const COUNTDOWN_TIME = 3;

const TICK_RATE = 10;
const playerIndexMap = new Map();
let nextFreeIndex = 0;
const availableIndexes = [];

setInterval(() => {
    const ids = Object.keys(players);
    if (ids.length > 0) {
        // Mỗi người chơi cần 4 bytes cho tọa độ X (Float32)
        const buffer = new Float32Array(ids.length * 2);
        // Cấu trúc: [index_nguoi_choi_1, x_1, index_nguoi_choi_2, x_2, ...]

        ids.forEach((id, i) => {
            const idx = playerIndexMap.get(id);
            buffer[i * 2] = idx;
            buffer[i * 2 + 1] = players[id].x;
        });

        // Gửi Buffer thay vì JSON object
        io.emit('gameStateUpdate', {
            b: buffer,
            ts: Date.now()
        });
    }
}, 1000 / TICK_RATE);

io.on('connection', (socket) => {
    console.log('Người chơi mới:', socket.id);

    socket.on('selectRole', (data) => {
        const { role, name, password, token } = data || {};
        socket.role = role;

        if (role === 'host') {
            if (password !== HOST_PASSWORD) {
                socket.emit('hostRejected', 'INVALID_PASSWORD');
                return;
            }

            gameState.hostId = socket.id;
            socket.playerId = socket.id;

            socket.emit('currentPlayers', players);
            socket.emit('hostAccepted');
            return;
        }

        // ===== PLAYER (new / resume) =====
        let playerId;
        let sessionToken = token;

        // Nếu có token hợp lệ thì resume đúng player cũ (giữ nguyên x, serverIndex, id)
        if (sessionToken && sessionToPlayerId.has(sessionToken)) {
            playerId = sessionToPlayerId.get(sessionToken);
        } else {
            // New player
            playerId = socket.id; // id ổn định cho player (khác với socket.id về sau khi reconnect)
            sessionToken = genToken();
            sessionToPlayerId.set(sessionToken, playerId);
        }

        socket.playerId = playerId;
        socket.token = sessionToken;

        // Resume case
        if (players[playerId]) {
            cancelRemoval(playerId);
            players[playerId].connected = true;
            players[playerId].socketId = socket.id;
            if (typeof name === 'string' && name.trim()) players[playerId].name = name;

            socket.emit('currentPlayers', players);
            socket.emit('playerAccepted', {
                index: playerIndexMap.get(playerId),
                token: sessionToken,
                playerId,
                resumed: true
            });
            return;
        }

        // New join
        const randomColor = Math.random() * 0xffffff;
        const skyHeight = 110;
        const padding = 30;

        let assignedIndex;
        if (availableIndexes.length > 0) {
            assignedIndex = availableIndexes.shift();
        } else {
            assignedIndex = nextFreeIndex++;
        }

        playerIndexMap.set(playerId, assignedIndex);

        players[playerId] = {
            x: 100,
            y: skyHeight + padding + ((Object.keys(players).length % 6) * 45),
            id: playerId,
            serverIndex: assignedIndex,
            name,
            horseColor: randomColor,
            token: sessionToken,
            connected: true,
            socketId: socket.id
        };

        socket.emit('currentPlayers', players);
        socket.broadcast.emit('newPlayer', players[playerId]);
        socket.emit('playerAccepted', {
            index: assignedIndex,
            token: sessionToken,
            playerId,
            resumed: false
        });
    });

    socket.on('hostStartGame', () => {
        if (socket.id !== gameState.hostId) return;

        finishedPlayers = [];

        Object.values(players).forEach(p => p.x = 100);

        gameState.status = 'COUNTDOWN';
        io.emit('startCountdown');

        setTimeout(() => {
            gameState.status = 'RUNNING';
            startTime = Date.now();
        }, (COUNTDOWN_TIME + 1) * 1000);
    });

    socket.on('playerMovement', (data) => {
        if (socket.role !== 'player' || gameState.status !== 'RUNNING') return;

        const playerId = socket.playerId || socket.id;
        const player = players[playerId];
        if (!player) return;

        // Nếu người chơi đã có trong danh sách về đích, không cho di chuyển tiếp (tùy chọn)
        const alreadyFinished = finishedPlayers.find(p => p.id === playerId);
        if (alreadyFinished) return;

        player.x = data.x;

        if (data.x >= FINISH_LINE_X) {
            const finishTime = ((Date.now() - startTime) / 1000).toFixed(2);
            finishedPlayers.push({
                id: playerId,
                name: player.name,
                finishTime: finishTime
            });

            // Gửi thông báo riêng cho người vừa về đích (để client dừng input/hiện hiệu ứng)
            socket.emit('youFinished', { rank: finishedPlayers.length });

            // Chỉ tính người đang online để tránh case mobile rớt mạng làm race không bao giờ FINISHED
            const totalPlayers = Object.values(players).filter(p => p && p.connected).length;
            const limit = Math.min(10, totalPlayers);

            if (finishedPlayers.length >= limit) {
                gameState.status = 'FINISHED';
                const top10 = finishedPlayers.map((p, index) => ({
                    rank: index + 1,
                    name: p.name,
                    finishTime: p.finishTime
                }));

                io.emit('raceFinished', {
                    top10: top10
                });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Người chơi thoát:', socket.id);

        if (socket.id === gameState.hostId) {
            gameState.hostId = null;
            gameState.status = 'LOBBY';
            finishedPlayers = [];
            return;
        }

        // Player: không xoá ngay, cho phép reconnect trong DISCONNECT_GRACE_MS
        const playerId = socket.playerId;
        if (!playerId || !players[playerId]) return;

        players[playerId].connected = false;
        players[playerId].lastDisconnectAt = Date.now();
        scheduleRemoval(playerId);
    });

    // Host bấm "PLAY AGAIN" -> ép tất cả client reload trang
    socket.on('hostRestartGame', () => {
        if (socket.id !== gameState.hostId) return;

        finishedPlayers = [];
        gameState.status = 'LOBBY';

        // reset vị trí (phòng trường hợp có ai không reload kịp)
        Object.values(players).forEach(p => p.x = 100);

        io.emit('raceReset', players);
    });


    socket.on('resetRace', () => {
        finishedPlayers = [];
        gameState.status = 'LOBBY';
        Object.values(players).forEach(p => p.x = 150);
        io.emit('raceReset', players);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server chạy tại http://localhost:${PORT}`);
});
