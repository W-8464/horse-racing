export default class InputManager {
    constructor(scene, state, players, network, ui) {
        this.scene = scene;
        this.state = state;
        this.players = players;
        this.network = network;
        this.ui = ui;

        // --- CẤU HÌNH CHỐNG HACK ---
        this.minClickInterval = 40; // Giới hạn vật lý tối thiểu (ms)

        // Cấu hình Rolling Window (Cửa sổ trượt)
        this.clickHistory = [];
        this.historySize = 20; // Luôn xét 20 cú click gần nhất

        // GIỚI HẠN TỬ THẦN:
        // Nếu thực hiện 20 click dưới 1400ms (tức ~14.2 click/giây) -> KHÓA
        // Người thường click nhanh (Jitter click) chỉ trụ được 1-2 giây, 
        // còn Auto Clicker duy trì tốc độ này mãi mãi.
        this.burstTimeLimit = 1400;

        this.isLocked = false;
        this.unlockTime = 0;
        this.lastClickTime = 0;
    }

    init() {
        this.scene.input.on('pointerdown', (pointer) => this.onPointerDown(pointer));
    }

    onPointerDown(pointer) {
        const now = Date.now();

        // 1. XỬ LÝ KHÓA (PHẠT NẶNG)
        // Khi bị phát hiện, khóa cứng 5 giây để Auto Click trở nên vô dụng
        if (this.isLocked) {
            if (now < this.unlockTime) {
                return; // Chặn tuyệt đối, không log gì thêm cho đỡ lag
            }
            // Hết giờ phạt
            this.isLocked = false;
            this.clickHistory = []; // Reset lịch sử để cho cơ hội làm lại
            console.log("Mở khóa. Chơi đẹp nhé!");
        }

        // 2. RATE LIMIT CƠ BẢN (Chặn click trùng/lag chuột)
        if (now - this.lastClickTime < this.minClickInterval) {
            return;
        }

        // 3. THUẬT TOÁN ROLLING WINDOW (KHẮC TINH CỦA AUTO CLICK + DI CHUỘT)
        this.clickHistory.push(now);

        // Giữ mảng luôn có tối đa historySize phần tử
        if (this.clickHistory.length > this.historySize) {
            this.clickHistory.shift(); // Bỏ phần tử cũ nhất
        }

        // Chỉ kiểm tra khi đã thu thập đủ 20 mẫu
        if (this.clickHistory.length === this.historySize) {
            // Lấy thời điểm click đầu tiên trong mảng và click hiện tại
            const firstClickInBatch = this.clickHistory[0];
            const lastClickInBatch = this.clickHistory[this.historySize - 1];

            // Tính tổng thời gian để hoàn thành 20 click này
            const timeTaken = lastClickInBatch - firstClickInBatch;

            // PHÂN TÍCH:
            // Auto Click (40ms): 20 click mất khoảng 800ms - 900ms (kể cả lag do di chuột).
            // Người tay to (10 click/s): 20 click mất khoảng 2000ms.
            // Ngưỡng phạt (1400ms): Tương đương ~14 click/giây liên tục.

            if (timeTaken < this.burstTimeLimit) {
                // Phát hiện hack! Khóa ngay lập tức.
                this.lockPlayer(5000, `Click quá gắt: 20 clicks trong ${timeTaken}ms`);

                // Quan trọng: Reset history để tránh loop khóa nếu người dùng thả tay ra ngay
                this.clickHistory = [];
                return;
            }
        }

        this.lastClickTime = now;

        // --- LOGIC GAME ---
        if (this.ui.isWinnerOpen()) return;
        if (this.state.role !== 'player') return;
        if (this.state.isCountdownRunning) return;
        if (!this.state.isRaceStarted || this.state.isFinished || !this.players.horse) return;

        this.players.moveSelfBy(15);
        this.network.emitMovement(this.players.horse.x);

        if (this.players.horse.requestRun) this.players.horse.requestRun(1);
        else if (this.players.horse.playRun) this.players.horse.playRun();
    }

    lockPlayer(duration, reason) {
        this.isLocked = true;
        this.unlockTime = Date.now() + duration;
        console.warn(`⛔ KHÓA 5 GIÂY: ${reason}`);
        // Hiển thị thông báo lên màn hình game (nếu có UI)
        if (this.ui.showToast) this.ui.showToast("Thao tác quá nhanh! Dừng 5s.");
    }
}