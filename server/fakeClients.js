/**
 * fakeClients.js
 * -------------------------------------------------------
 * Tạo 100 (mặc định) fake "player" connect vào server Socket.IO
 * và spam thao tác "click" để ngựa chạy (bỏ qua flash skill).
 *
 * Cách chạy:
 *   1) npm i socket.io-client
 *   2) node fakeClients.js
 *
 * Tuỳ chỉnh bằng ENV:
 *   SERVER_URL=http://localhost:3000
 *   CLIENT_COUNT=100
 *   COUNTDOWN_SEC=3
 *   CLICK_INTERVAL_MS=120
 *   CLICK_STEP=500
 *   START_X=150
 *   FINISH_LINE_X=2000
 */

const { io } = require("socket.io-client");

const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";
const CLIENT_COUNT = parseInt(process.env.CLIENT_COUNT || "100", 10);

const COUNTDOWN_SEC = parseFloat(process.env.COUNTDOWN_SEC || "3"); // fallback nếu chưa biết config bên client
const CLICK_INTERVAL_MS = parseInt(process.env.CLICK_INTERVAL_MS || "120", 10);
const CLICK_STEP = parseInt(process.env.CLICK_STEP || "20", 10);

const START_X = parseInt(process.env.START_X || "150", 10);
const FINISH_LINE_X = parseInt(process.env.FINISH_LINE_X || "2000", 10);

const NAME_PREFIX = process.env.NAME_PREFIX || "BOT";

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

class BotClient {
    constructor(index) {
        this.index = index;
        this.name = `${NAME_PREFIX}_${String(index).padStart(3, "0")}`;
        this.socket = null;

        this.x = START_X;
        this.ready = false;
        this.running = false;
        this.timer = null;
        this.connectedAt = null;
    }

    connect() {
        this.socket = io(SERVER_URL, {
            transports: ["websocket"], // giảm overhead polling
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 250,
            reconnectionDelayMax: 2000,
            timeout: 10000,
        });

        this.socket.on("connect", () => {
            this.connectedAt = Date.now();
            this.ready = false;
            this.running = false;
            this.x = START_X;

            // join như 1 player thật
            this.socket.emit("selectRole", { role: "player", name: this.name });
        });

        this.socket.on("disconnect", () => {
            this.stopClicking();
        });

        // server xác nhận đã tạo player
        this.socket.on("playerAccepted", () => {
            this.ready = true;
        });

        // host bấm start -> tất cả clients nhận startCountdown
        this.socket.on("startCountdown", async () => {
            // đảm bảo bot đã join xong
            if (!this.ready) {
                // đợi tối đa 2s để join xong
                const until = Date.now() + 2000;
                while (!this.ready && Date.now() < until) await sleep(50);
            }

            this.stopClicking();
            this.x = START_X;

            // Mô phỏng client: countdown rồi GO! mới cho click.
            // Bên GameScene có delay destroy text 800ms, nhưng flag isRaceStarted set ngay khi "GO!".
            // -> ta đợi COUNTDOWN_SEC + chút random để tránh đồng bộ hoàn toàn.
            const jitter = Math.floor(Math.random() * 350); // 0..349ms
            await sleep(Math.max(0, COUNTDOWN_SEC * 1000 + jitter));

            this.startClicking();
        });

        // Khi có winner, client thật sẽ stop; bot cũng stop để giảm spam
        this.socket.on("raceFinished", () => {
            this.stopClicking();
        });

        // Nếu bạn có nút resetRace, server emit raceReset
        this.socket.on("raceReset", () => {
            this.stopClicking();
            this.x = START_X;
        });
    }

    startClicking() {
        if (!this.socket || !this.socket.connected) return;
        if (this.running) return;
        if (!this.ready) return;

        this.running = true;

        // click loop
        this.timer = setInterval(() => {
            if (!this.socket || !this.socket.connected) return;

            // mô phỏng click: mỗi click +500 như trong GameScene
            this.x += CLICK_STEP;

            this.socket.emit("playerMovement", { x: this.x });

            // đủ về đích thì dừng (server sẽ tự detect winner theo FINISH_LINE_X)
            if (this.x >= FINISH_LINE_X) {
                this.stopClicking();
            }
        }, CLICK_INTERVAL_MS);
    }

    stopClicking() {
        this.running = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
}

async function main() {
    console.log(
        `[fakeClients] server=${SERVER_URL} clients=${CLIENT_COUNT} countdown=${COUNTDOWN_SEC}s step=${CLICK_STEP} interval=${CLICK_INTERVAL_MS}ms`
    );

    const bots = [];
    for (let i = 1; i <= CLIENT_COUNT; i++) {
        const bot = new BotClient(i);
        bots.push(bot);
    }

    // connect dàn trải để giảm spike
    for (const bot of bots) {
        bot.connect();
        await sleep(15); // 100 clients ~ 1.5s
    }

    // thống kê nhẹ
    setInterval(() => {
        const connected = bots.filter((b) => b.socket && b.socket.connected).length;
        const running = bots.filter((b) => b.running).length;
        console.log(`[fakeClients] connected=${connected}/${CLIENT_COUNT} running=${running}`);
    }, 2000);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
