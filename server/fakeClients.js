const { io } = require("socket.io-client");

const URL = "http://103.82.37.188/";
const MAX_USERS = 50;

// ===== CẤU HÌNH HÀNH VI BOT =====
const INPUT_INTERVAL_MIN = 120; // ms
const INPUT_INTERVAL_MAX = 220; // ms
const MOVE_STEP_MIN = 2.5;
const MOVE_STEP_MAX = 4.5;

const FINISH_LINE_X = 5000;

function rand(min, max) {
    return Math.random() * (max - min) + min;
}

// ===== PLAYER BOT =====
function createPlayer(index) {
    const socket = io(URL, {
        transports: ["websocket"],
        upgrade: false,
        reconnection: false
    });

    let currentX = 100;
    let isRunning = false;
    let hasStarted = false;
    let inputTimer = null;

    socket.on("connect", () => {
        socket.emit("selectRole", {
            role: "player",
            name: `Bot_${index}`,
            password: ""
        });
    });

    // UI event – có thể miss → chỉ dùng làm phụ
    socket.on("startCountdown", () => {
        setTimeout(startRunningIfNeeded, 4000);
    });

    // Snapshot event – KHÔNG BAO GIỜ miss
    socket.on("gameStateUpdate", () => {
        startRunningIfNeeded();
    });

    function startRunningIfNeeded() {
        if (hasStarted) return;
        hasStarted = true;
        isRunning = true;
        scheduleNextInput();
    }

    function scheduleNextInput() {
        if (!isRunning) return;

        const delay = rand(INPUT_INTERVAL_MIN, INPUT_INTERVAL_MAX);

        inputTimer = setTimeout(() => {
            if (!isRunning) return;

            const step = rand(MOVE_STEP_MIN, MOVE_STEP_MAX);
            currentX += step;

            socket.emit("playerMovement", { x: currentX });

            if (currentX >= FINISH_LINE_X) {
                isRunning = false;
                return;
            }

            // 5% chance pause (giả lập người chơi khựng tay)
            if (Math.random() < 0.05) {
                setTimeout(scheduleNextInput, rand(300, 600));
            } else {
                scheduleNextInput();
            }
        }, delay);
    }

    socket.on("youFinished", () => {
        isRunning = false;
        if (inputTimer) clearTimeout(inputTimer);
    });

    socket.on("raceReset", () => {
        currentX = 100;
        isRunning = false;
        hasStarted = false;
        if (inputTimer) clearTimeout(inputTimer);
    });

    socket.on("disconnect", () => {
        isRunning = false;
        if (inputTimer) clearTimeout(inputTimer);
    });
}

// ===== HOST BOT =====
function createHostBot() {
    const socket = io(URL, {
        transports: ["websocket"],
        upgrade: false
    });

    socket.on("connect", () => {
        socket.emit("selectRole", {
            role: "host",
            name: "BOT_HOST",
            password: "a"
        });
    });

    socket.on("hostAccepted", () => {
        console.log("[HOST BOT] connected");
    });

    return socket;
}

// ===== MAIN =====
console.log(`Khởi tạo ${MAX_USERS} fake clients...`);

const hostSocket = createHostBot();

// Đợi host ổn định
setTimeout(() => {
    // Spawn player bot rải đều
    for (let i = 0; i < MAX_USERS; i++) {
        setTimeout(() => createPlayer(i), i * 60);
    }

    // Đợi player connect gần xong rồi start game
    setTimeout(() => {
        console.log("[HOST BOT] start game");
        hostSocket.emit("hostStartGame");
    }, MAX_USERS * 60 + 1000);

}, 1500);
