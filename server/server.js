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
const TARGET_TAPS = 100;
let currentTotalTaps = 0;
let playerContributions = {}; // Lưu danh sách người chơi

const HOST_PASSWORD = 'a';
let gameState = {
    status: 'LOBBY', // LOBBY, COUNTDOWN, RUNNING, FINISHED
    hostId: null
};

let startTime = 0;
const GAME_TICK_RATE = 20;
const LEADERBOARD_TICK_RATE = 2;

setInterval(() => {
    // Nếu game chưa chạy hoặc không có người thì bỏ qua để tiết kiệm CPU
    if (gameState.status === 'LOBBY' && Object.keys(playerContributions).length === 0) return;

    // Tính toán tiến độ chung
    const progress = Math.min((currentTotalTaps / TARGET_TAPS), 1);

    // Tổng số người chơi (để hiện "+199 others")
    const totalPlayers = Object.keys(playerContributions).length;

    // Gói tin siêu nhẹ: Chỉ chứa 3 thông số cơ bản
    // Broadcast cho TẤT CẢ (Host + 200 Players)
    io.emit('gameUpdateFast', {
        p: Number(progress.toFixed(4)), // Làm tròn 4 số thập phân (vd: 0.5123)
        s: gameState.status,            // Trạng thái game (LOBBY/RUNNING...)
        t: totalPlayers                 // Tổng số người
    });

}, 1000 / GAME_TICK_RATE);


// --- VÒNG LẶP 2: XỬ LÝ LEADERBOARD (Chỉ gửi cho HOST) ---
// Mục tiêu: Giảm tải việc sắp xếp mảng 200 phần tử và giảm băng thông
setInterval(() => {
    // Chỉ chạy khi có Host kết nối và có người chơi
    if (!gameState.hostId || Object.keys(playerContributions).length === 0) return;

    // Lấy danh sách tất cả người chơi
    const allPlayers = Object.values(playerContributions);

    // Sort Top 10 (Việc này tốn CPU nên chỉ làm ở vòng lặp chậm)
    const top10 = allPlayers
        .sort((a, b) => b.taps - a.taps)
        .slice(0, 10);

    // CHỈ GỬI CHO HOST (Tiết kiệm băng thông cực lớn)
    // Player không cần nhận dữ liệu này
    io.to(gameState.hostId).emit('leaderboardUpdate', {
        top: top10,
        total: allPlayers.length
    });

}, 1000 / LEADERBOARD_TICK_RATE);

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

    socket.on('playerTap', (data) => {
        if (gameState.status !== 'RUNNING') return;
        if (!playerContributions[socket.id]) return;

        const tapCount = (data && data.count) ? data.count : 1;
        if (tapCount > 50) return;
        currentTotalTaps += tapCount;
        playerContributions[socket.id].taps += tapCount;

        if (currentTotalTaps >= TARGET_TAPS) {
            gameState.status = 'FINISHED';
            const finishTime = ((Date.now() - startTime) / 1000).toFixed(2);
            const leaderboard = Object.values(playerContributions)
                .sort((a, b) => b.taps - a.taps)
                .slice(0, 10);

            io.emit('raceFinished', {
                topContributors: leaderboard,
                totalPlayers: Object.keys(playerContributions).length,
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