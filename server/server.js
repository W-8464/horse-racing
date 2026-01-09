const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static(path.join(__dirname, '../client')));

const players = {};
let gameState = {
    status: 'LOBBY', // LOBBY | COUNTDOWN | RUNNING
    hostId: null
};

io.on('connection', (socket) => {
    console.log('Người chơi mới:', socket.id);

    socket.on('selectRole', (role) => {
        socket.role = role;

        if (role === 'host') {
            gameState.hostId = socket.id;
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
            horseColor: randomColor
        };

        socket.emit('currentPlayers', players);
        socket.broadcast.emit('newPlayer', players[socket.id]);
        socket.emit('playerAccepted');
    });

    socket.on('hostStartGame', () => {
        if (socket.id !== gameState.hostId) return;

        gameState.status = 'COUNTDOWN';
        io.emit('startCountdown');
    });

    socket.on('playerMovement', (data) => {
        if (!players[socket.id]) return;

        players[socket.id].x = data.x;
        socket.broadcast.emit('playerMoved', players[socket.id]);
    });

    socket.on('disconnect', () => {
        console.log('Người chơi thoát:', socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });

    socket.on('resetRace', () => {
        isRaceStarted = false;
        Object.values(players).forEach(p => p.x = 150);
        io.emit('raceReset', players);
    });
});

const PORT = 3000;
http.listen(PORT, () => {
    console.log(`Server chạy tại http://localhost:${PORT}`);
});
