const { io } = require("socket.io-client");

const URL = "http://103.82.37.188/";
const MAX_USERS = 100;
const CLICK_SPEED = 500;
const MOVE_STEP = 15;

function createPlayer(index) {
    const socket = io(URL, { transports: ['websocket'] });

    let currentX = 150; // Vị trí bắt đầu trong code server của bạn
    let isRunning = false;

    socket.on("connect", () => {
        // 1. Tham gia vào game với role 'player'
        socket.emit("selectRole", {
            role: "player",
            name: `Bot_${index}`,
            password: ""
        });
    });

    // 2. Lắng nghe tín hiệu từ Host để bắt đầu chạy
    socket.on("startCountdown", () => {
        // Chờ 4 giây (theo COUNTDOWN_TIME + 1 trong server) rồi bắt đầu chạy
        setTimeout(() => {
            isRunning = true;
            console.log(`Bot ${index} bắt đầu chạy!`);
        }, 4000);
    });

    // Vòng lặp giả lập hành động click di chuyển
    setInterval(() => {
        if (isRunning) {
            currentX += MOVE_STEP;

            // Gửi dữ liệu di chuyển giống như client thật
            socket.emit("playerMovement", { x: currentX });

            // Nếu đã về đích (FINISH_LINE_X = 2000)
            if (currentX >= 2000) {
                isRunning = false;
                console.log(`Bot ${index} đã về đích!`);
            }
        }
    }, CLICK_SPEED);

    // Reset lại khi có lệnh từ Host
    socket.on("raceReset", () => {
        currentX = 150;
        isRunning = false;
    });

    socket.on("disconnect", () => {
        isRunning = false;
    });
}

// Khởi tạo 200 bot, mỗi bot cách nhau 50ms để tránh nghẽn mạng cục bộ
console.log(`Đang khởi tạo ${MAX_USERS} bot...`);
for (let i = 0; i < MAX_USERS; i++) {
    setTimeout(() => createPlayer(i), i * 50);
}