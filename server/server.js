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
    });

    socket.on('playerMovement', (data) => {
        if (!players[socket.id]) return;

        players[socket.id].x = data.x;

        // 🏁 CHECK WIN
        if (!winnerId && data.x >= FINISH_LINE_X) {
            winnerId = socket.id;

            io.emit('raceFinished', {
                winnerId: socket.id,
                winnerName: players[socket.id].name
            });
        }

        socket.broadcast.emit('playerMoved', players[socket.id]);
    });

    socket.on('disconnect', () => {
        console.log('Người chơi thoát:', socket.id);
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
