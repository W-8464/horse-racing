// InputManager.js
export default class InputManager {
    constructor(scene, state, players, network, flashSkill, ui) {
        this.scene = scene;
        this.state = state;
        this.network = network;
        this.ui = ui;
    }

    init() {
        // Dùng pointerdown cho nhạy
        this.scene.input.on('pointerdown', (pointer) => this.onPointerDown(pointer));
    }

    onPointerDown(pointer) {
        // Chỉ Player mới được tap
        if (this.state.role !== 'player') return;

        // Game chưa chạy hoặc đã xong thì nghỉ
        if (!this.state.isRaceStarted || this.state.isFinished) return;

        // Gửi tap lên server
        this.network.sendTap();

        // Hiệu ứng Visual (Optional): Tạo bụi hoặc hiệu ứng click tại chỗ chuột
        // this.ui.showClickEffect(pointer.x, pointer.y);
    }
}