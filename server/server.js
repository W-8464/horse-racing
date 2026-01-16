const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    transports: ['websocket'],
    pingTimeout: 30000,
    pingInterval: 10000
});
const path = require('path');

app.use(express.static(path.join(__dirname, '../client')));

const players = {};
const HOST_PASSWORD = 'a';
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
        const { role, name, password } = data;
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

        const randomColor = Math.random() * 0xffffff;
        const skyHeight = 110;
        const padding = 30;

        let assignedIndex;
        if (availableIndexes.length > 0) {
            // Ưu tiên lấy lại các index cũ đã thoát để mảng binary luôn gọn nhất
            assignedIndex = availableIndexes.shift();
        } else {
            // Nếu không có index trống, lấy index mới tiếp theo
            assignedIndex = nextFreeIndex++;
        }

        playerIndexMap.set(socket.id, assignedIndex);

        players[socket.id] = {
            x: 100,
            y: skyHeight + padding + ((Object.keys(players).length % 6) * 45),
            id: socket.id,
            serverIndex: assignedIndex,
            name,
            horseColor: randomColor
        };

        socket.emit('currentPlayers', players);
        socket.broadcast.emit('newPlayer', players[socket.id]);
        socket.emit('playerAccepted', { index: assignedIndex });
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

        const player = players[socket.id];
        if (!player) return;

        // Nếu người chơi đã có trong danh sách về đích, không cho di chuyển tiếp (tùy chọn)
        const alreadyFinished = finishedPlayers.find(p => p.id === socket.id);
        if (alreadyFinished) return;

        player.x = data.x;

        if (data.x >= FINISH_LINE_X) {
            const finishTime = ((Date.now() - startTime) / 1000).toFixed(2);
            finishedPlayers.push({
                id: socket.id,
                name: player.name,
                finishTime: finishTime
            });

            // Gửi thông báo riêng cho người vừa về đích (để client dừng input/hiện hiệu ứng)
            socket.emit('youFinished', { rank: finishedPlayers.length });

            const totalPlayers = Object.keys(players).length;
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
        }

        const indexToFree = playerIndexMap.get(socket.id);

        if (indexToFree !== undefined) {
            // Đưa index vào danh sách chờ cấp phát lại
            availableIndexes.push(indexToFree);
            // Sắp xếp lại để ưu tiên cấp index nhỏ trước (giúp mảng binary ngắn nhất có thể)
            availableIndexes.sort((a, b) => a - b);
        }

        playerIndexMap.delete(socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });

    // Host bấm "PLAY AGAIN" -> ép tất cả client reload trang
    socket.on('hostRestartGame', () => {
        if (socket.id !== gameState.hostId) return;

        finishedPlayers = [];
        gameState.status = 'LOBBY';

        // reset vị trí (phòng trường hợp có ai không reload kịp)
        Object.values(players).forEach(p => p.x = 100);

        io.emit('forceReload');
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
