export default class InputManager {
    constructor(scene, state, players, network, ui) {
        this.scene = scene;
        this.state = state;
        this.players = players;
        this.network = network;
        this.ui = ui;
    }

    init() {
        this.scene.input.on('pointerdown', (pointer) => this.onPointerDown(pointer));
    }

    onPointerDown(pointer) {
        // [LOGIC MỚI] 
        // Cho phép ngón 1 và ngón 2 (để người chơi tap luân phiên 2 ngón cái)
        // Chỉ chặn từ ngón thứ 3 trở đi để tránh gesture của iOS.
        // Trong Phaser, các pointer thường được tái sử dụng, nhưng ta có thể check số lượng active.

        const activePointers = this.scene.input.manager.pointersTotal;
        // Hoặc đơn giản hơn: kiểm tra index của pointer hiện tại (0 là primary, 1 là ngón 2)
        if (pointer.index > 1) return;

        // [Lưu ý] Dòng cũ của bạn là: if (pointer.isPrimary === false) return; 
        // Dòng đó sẽ chặn luôn pointer.index === 1 (ngón thứ 2), làm mất khả năng đua tốc độ cao.

        if (this.ui.isWinnerOpen()) return;
        if (this.state.role !== 'player') return;

        // Thêm check này để tránh tap lúc đang đếm ngược 3-2-1
        if (this.state.isCountdownRunning) return;

        if (!this.state.isRaceStarted || this.state.isFinished || !this.players.horse) return;

        this.players.moveSelfBy(10);
        this.network.emitMovement(this.players.horse.x);

        if (this.players.horse.requestRun) this.players.horse.requestRun(1);
        else if (this.players.horse.playRun) this.players.horse.playRun();
    }
}