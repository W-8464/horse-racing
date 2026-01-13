const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, '../client')));

const players = {};
const HOST_PASSWORD = 'a';
let gameState = {
    status: 'LOBBY', // LOBBY | COUNTDOWN | RUNNING
    hostId: null
};
let winnerId = null;
const FINISH_LINE_X = 2000;
const COUNTDOWN_TIME = 3;

const TICK_RATE = 20;

setInterval(() => {
    if (Object.keys(players).length > 0) {
        // Gửi dữ liệu cho TẤT CẢ mọi người cùng lúc
        io.emit('gameStateUpdate', {
            players: players,
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
        const skyHeight = 180;
        const padding = 50;

        players[socket.id] = {
            x: 150,
            y: skyHeight + padding + ((Object.keys(players).length % 6) * 70),
            id: socket.id,
            name,
            horseColor: randomColor
        };

        socket.emit('currentPlayers', players);
        socket.broadcast.emit('newPlayer', players[socket.id]);
        socket.emit('playerAccepted');
    });

    socket.on('hostStartGame', () => {
        if (socket.id !== gameState.hostId) return;

        winnerId = null;

        Object.values(players).forEach(p => p.x = 150);

        gameState.status = 'COUNTDOWN';
        io.emit('startCountdown');

        setTimeout(() => {
            gameState.status = 'RUNNING';
        }, (COUNTDOWN_TIME + 1) * 1000);
    });

    socket.on('playerMovement', (data) => {
        if (socket.role !== 'player' || gameState.status !== 'RUNNING' || winnerId) return;

        if (players[socket.id]) {
            players[socket.id].x = data.x;

            if (!winnerId && data.x >= FINISH_LINE_X) {
                winnerId = socket.id;
                io.emit('raceFinished', {
                    winnerId: socket.id,
                    winnerName: players[socket.id].name
                });
            }
        }
        // KHÔNG broadcast ở đây nữa để tiết kiệm băng thông
    });

    socket.on('disconnect', () => {
        console.log('Người chơi thoát:', socket.id);

        if (socket.id === gameState.hostId) {
            gameState.hostId = null;
            gameState.status = 'LOBBY';
            winnerId = null;
        }

        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });

    socket.on('resetRace', () => {
        winnerId = null;
        gameState.status = 'LOBBY';
        Object.values(players).forEach(p => p.x = 150);
        io.emit('raceReset', players);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server chạy tại http://localhost:${PORT}`);
});
