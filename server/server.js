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
const sendIndex = (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
};
app.get('/player', sendIndex);
app.get('/host', sendIndex);

// --- CẤU HÌNH ---
const TARGET_TAPS = 1000;
let currentTotalTaps = 0;
let playerContributions = {}; // Lưu danh sách người chơi

const HOST_PASSWORD = 'a';
let gameState = {
    status: 'LOBBY', // LOBBY, COUNTDOWN, RUNNING, FINISHED
    hostId: null
};

let startTime = 0;
const TICK_RATE = 10;

// 1. SỬA VÒNG LẶP: Gửi update LIÊN TỤC kể cả khi đang ở LOBBY
setInterval(() => {
    // Không check if (gameState.status !== 'LOBBY') nữa
    // Để Host cập nhật được danh sách người chơi ra/vào realtime

    const progress = Math.min((currentTotalTaps / TARGET_TAPS), 1);
    const totalPlayers = Object.keys(playerContributions).length;

    io.emit('gameStateUpdate', {
        progress: progress,
        currentTaps: currentTotalTaps,
        targetTaps: TARGET_TAPS,
        contributions: playerContributions,
        totalPlayers: totalPlayers,
        status: gameState.status,
        ts: Date.now()
    });
}, 1000 / TICK_RATE);

io.on('connection', (socket) => {
    // 2. THÊM: Ngay khi kết nối, báo cho Client biết trạng thái game hiện tại
    // Để nếu game đang chạy, Client tự chuyển sang chế độ xem (Spectator)
    socket.emit('initialState', gameState.status);

    socket.on('selectRole', (data) => {
        const { role, name, password, color } = data;

        if (role === 'host') {
            if (password !== HOST_PASSWORD) {
                socket.emit('hostRejected', 'INVALID_PASSWORD');
                return;
            }
            gameState.hostId = socket.id;
            socket.role = 'host';
            socket.emit('hostAccepted');
            return;
        }

        // 3. SỬA: Chặn người chơi mới nếu Game KHÔNG CÒN Ở LOBBY
        if (gameState.status !== 'LOBBY') {
            socket.emit('joinError', 'Game đã bắt đầu! Bạn chỉ có thể theo dõi.');
            return;
        }

        socket.role = 'player';
        playerContributions[socket.id] = {
            id: socket.id,
            name: name || 'Người chơi',
            taps: 0,
            color: color || (Math.random() * 0xffffff)
        };

        socket.emit('playerAccepted');
    });

    socket.on('playerTap', () => {
        // Chỉ nhận tap khi game đang RUNNING
        if (gameState.status !== 'RUNNING') return;

        // Nếu người chơi này không có trong danh sách (do vào sau hoặc lỗi), bỏ qua
        if (!playerContributions[socket.id]) return;

        currentTotalTaps++;
        playerContributions[socket.id].taps++;

        if (currentTotalTaps >= TARGET_TAPS) {
            gameState.status = 'FINISHED';
            const finishTime = ((Date.now() - startTime) / 1000).toFixed(2);
            const leaderboard = Object.values(playerContributions)
                .sort((a, b) => b.taps - a.taps)
                .slice(0, 10);
            const totalPlayers = Object.keys(playerContributions).length;

            io.emit('raceFinished', {
                topContributors: leaderboard,
                totalPlayers: totalPlayers,
                totalTime: finishTime
            });
        }
    });

    socket.on('hostStartGame', () => {
        if (socket.id !== gameState.hostId) return;

        currentTotalTaps = 0;
        // Reset điểm nhưng GIỮ NGUYÊN danh sách người chơi
        Object.keys(playerContributions).forEach(id => {
            playerContributions[id].taps = 0;
        });

        gameState.status = 'COUNTDOWN';
        io.emit('startCountdown');

        setTimeout(() => {
            gameState.status = 'RUNNING';
            startTime = Date.now();
        }, 4000);
    });

    socket.on('hostRestartGame', () => {
        if (socket.id !== gameState.hostId) return;

        gameState.status = 'LOBBY';
        currentTotalTaps = 0;

        // FIX: KHÔNG XÓA người chơi cũ (playerContributions = {} -> BỎ)
        // Chỉ reset điểm số của họ về 0
        Object.keys(playerContributions).forEach(id => {
            playerContributions[id].taps = 0;
        });

        // Gửi danh sách đã reset về Client để cập nhật UI ngay lập tức
        // Chuyển object thành array để gửi đi
        const resetPlayers = Object.values(playerContributions);
        const totalPlayers = resetPlayers.length;

        io.emit('raceReset', {
            players: resetPlayers,
            totalPlayers: totalPlayers
        });
    });

    socket.on('disconnect', () => {
        if (socket.id === gameState.hostId) {
            gameState.hostId = null;
            gameState.status = 'LOBBY';
            playerContributions = {}; // Host out thì reset phòng
        } else {
            // Player out thì xóa khỏi danh sách
            delete playerContributions[socket.id];
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server chạy tại http://localhost:${PORT}`);
});