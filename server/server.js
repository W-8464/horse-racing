const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    transports: ['websocket'],
    pingTimeout: 60000,
    pingInterval: 10000
});
const path = require('path');

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

        playerIndexMap.delete(socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });

    socket.on('hostRestartGame', () => {
        if (socket.id !== gameState.hostId) return;

        finishedPlayers = [];
        gameState.status = 'LOBBY';
        Object.values(players).forEach(p => p.x = 100);

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

// const express = require('express');
// const app = express();
// const http = require('http').createServer(app);
// const io = require('socket.io')(http, {
//     transports: ['websocket'],
//     pingTimeout: 60000,
//     pingInterval: 10000
// });
// const path = require('path');

// app.use(express.static(path.join(__dirname, '../client')));

// app.get('/host', (req, res) => {
//     res.sendFile(path.join(__dirname, '../client/index.html'));
// });

// // --- CẤU HÌNH ---
// const players = {};
// const botOwners = {}; // Map: realSocketId -> [botId1, botId2]
// const BOTS_PER_PLAYER = 2; // Mỗi người chơi kèm 2 bot
// const HOST_PASSWORD = 'a';

// let gameState = {
//     status: 'LOBBY',
//     hostId: null
// };
// let startTime = 0;
// let finishedPlayers = [];
// const FINISH_LINE_X = 5400;
// const COUNTDOWN_TIME = 3;

// const TICK_RATE = 10;
// const playerIndexMap = new Map();
// let nextFreeIndex = 0;
// const availableIndexes = [];

// // --- LOOP GỬI DATA VỀ CLIENT (Chỉ gửi, không tính toán bot ở đây) ---
// setInterval(() => {
//     const ids = Object.keys(players);
//     if (ids.length > 0) {
//         const buffer = new Float32Array(ids.length * 2);
//         ids.forEach((id, i) => {
//             const idx = playerIndexMap.get(id);
//             if (idx === undefined) return;
//             buffer[i * 2] = idx;
//             buffer[i * 2 + 1] = players[id].x;
//         });
//         io.emit('gameStateUpdate', { b: buffer, ts: Date.now() });
//     }
// }, 1000 / TICK_RATE);

// // --- HÀM HELPER ---
// function createEntity(id, name, color, isBot = false) {
//     const SKY_HEIGHT = 110;
//     const TOP_MARGIN = 20;
//     const LANE_HEIGHT = 40;
//     const MAX_LANES = 8;

//     let assignedIndex;
//     if (availableIndexes.length > 0) {
//         assignedIndex = availableIndexes.shift();
//     } else {
//         assignedIndex = nextFreeIndex++;
//     }

//     playerIndexMap.set(id, assignedIndex);
//     const laneIndex = assignedIndex % MAX_LANES;
//     const overlapOffset = (assignedIndex >= MAX_LANES) ? (Math.random() * 10 - 5) : 0;

//     players[id] = {
//         x: 100, // Vị trí xuất phát
//         y: SKY_HEIGHT + TOP_MARGIN + (laneIndex * LANE_HEIGHT) + overlapOffset,
//         id: id,
//         serverIndex: assignedIndex,
//         name: name,
//         horseColor: color,
//         isBot: isBot
//     };
//     return assignedIndex;
// }

// function handleFinish(id, player) {
//     const alreadyFinished = finishedPlayers.find(p => p.id === id);
//     if (alreadyFinished) return;

//     const finishTime = ((Date.now() - startTime) / 1000).toFixed(2);
//     const rank = finishedPlayers.length + 1;

//     const result = {
//         id: id,
//         name: player.name,
//         finishTime: finishTime,
//         horseColor: player.horseColor,
//         rank: rank
//     };

//     finishedPlayers.push(result);
//     io.emit('updateFinishedList', finishedPlayers);

//     if (finishedPlayers.length === 1) {
//         io.emit('firstFinished');
//     }

//     const totalPlayers = Object.keys(players).length;
//     // Lấy top 10 để bao gồm cả bot
//     const limit = Math.min(10, totalPlayers);

//     if (finishedPlayers.length >= limit) {
//         gameState.status = 'FINISHED';
//         const top10 = finishedPlayers.slice(0, 10).map((p, index) => ({
//             id: p.id,
//             rank: index + 1,
//             name: p.name,
//             finishTime: p.finishTime,
//             horseColor: p.horseColor
//         }));
//         io.emit('raceFinished', { top10: top10 });
//     }
//     return rank;
// }

// // --- SOCKET LOGIC ---
// io.on('connection', (socket) => {
//     socket.on('selectRole', (data) => {
//         const { role, name, password, color } = data;
//         socket.role = role;

//         if (role === 'host') {
//             if (password !== HOST_PASSWORD) {
//                 socket.emit('hostRejected', 'INVALID_PASSWORD');
//                 return;
//             }
//             gameState.hostId = socket.id;
//             socket.emit('currentPlayers', players);
//             socket.emit('hostAccepted');
//             return;
//         }

//         // Tạo Player thật
//         const realPlayerColor = color || (Math.random() * 0xffffff);
//         const realIndex = createEntity(socket.id, name, realPlayerColor, false);
//         socket.emit('playerAccepted', { index: realIndex });

//         // Tạo Bot đi kèm
//         botOwners[socket.id] = [];
//         for (let i = 1; i <= BOTS_PER_PLAYER; i++) {
//             const botId = `${socket.id}_bot_${i}`;
//             const botName = `${name}_Bot${i}`;
//             const botColor = Math.random() * 0xffffff;
//             createEntity(botId, botName, botColor, true);
//             botOwners[socket.id].push(botId);
//         }

//         socket.emit('currentPlayers', players);
//         socket.broadcast.emit('newPlayer', players[socket.id]);
//         botOwners[socket.id].forEach(botId => {
//             socket.broadcast.emit('newPlayer', players[botId]);
//         });
//     });

//     socket.on('hostStartGame', () => {
//         if (socket.id !== gameState.hostId) return;

//         finishedPlayers = [];
//         // Reset vị trí
//         Object.values(players).forEach(p => p.x = 100);

//         gameState.status = 'COUNTDOWN';
//         io.emit('startCountdown');

//         setTimeout(() => {
//             gameState.status = 'RUNNING';
//             startTime = Date.now();
//         }, (COUNTDOWN_TIME + 1) * 1000);
//     });

//     socket.on('playerMovement', (data) => {
//         if (socket.role !== 'player' || gameState.status !== 'RUNNING') return;

//         const player = players[socket.id];
//         if (!player) return;

//         // 1. Tính quãng đường Player vừa di chuyển (Tap distance)
//         // data.x là vị trí mới client gửi lên
//         const currentX = player.x;
//         const newX = data.x;
//         const delta = newX - currentX; // Đây là quãng đường của 1 cú tap (hoặc 1 tick move)

//         // Cập nhật cho Player thật
//         if (!finishedPlayers.find(p => p.id === socket.id)) {
//             player.x = newX;
//             if (player.x >= FINISH_LINE_X) {
//                 const rank = handleFinish(socket.id, player);
//                 socket.emit('youFinished', { rank: rank });
//             }
//         }

//         // 2. Cập nhật cho Bot (nếu Player có di chuyển về phía trước)
//         if (delta > 0) {
//             const myBots = botOwners[socket.id];
//             if (myBots) {
//                 myBots.forEach(botId => {
//                     const bot = players[botId];
//                     // Chỉ di chuyển nếu bot chưa về đích
//                     if (bot && !finishedPlayers.find(p => p.id === botId)) {

//                         // Bot tap một khoảng tương đương Player nhưng có chút ngẫu nhiên
//                         // Ví dụ: Player chạy 100, Bot chạy từ 90 đến 110
//                         const randomness = 0.9 + Math.random() * 0.2;
//                         const botStep = delta * randomness;

//                         bot.x += botStep;

//                         // Kiểm tra Bot về đích
//                         if (bot.x >= FINISH_LINE_X) {
//                             handleFinish(botId, bot);
//                         }
//                     }
//                 });
//             }
//         }
//     });

//     socket.on('disconnect', () => {
//         if (socket.id === gameState.hostId) {
//             gameState.hostId = null;
//             gameState.status = 'LOBBY';
//             finishedPlayers = [];
//         }

//         const removeEntity = (id) => {
//             const indexToFree = playerIndexMap.get(id);
//             if (indexToFree !== undefined) {
//                 availableIndexes.push(indexToFree);
//                 availableIndexes.sort((a, b) => a - b);
//             }
//             playerIndexMap.delete(id);
//             delete players[id];
//             io.emit('playerDisconnected', id);
//         };

//         // Xóa player thật
//         removeEntity(socket.id);

//         // Xóa bot đi kèm
//         const myBots = botOwners[socket.id];
//         if (myBots) {
//             myBots.forEach(botId => removeEntity(botId));
//             delete botOwners[socket.id];
//         }
//     });

//     socket.on('hostRestartGame', () => {
//         if (socket.id !== gameState.hostId) return;
//         finishedPlayers = [];
//         gameState.status = 'LOBBY';
//         Object.values(players).forEach(p => p.x = 100);
//         io.emit('raceReset', players);
//     });
// });

// const PORT = process.env.PORT || 3000;
// http.listen(PORT, () => {
//     console.log(`Server chạy tại http://localhost:${PORT}`);
// });