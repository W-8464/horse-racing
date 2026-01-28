// InputManager.js
export default class InputManager {
    constructor(scene, state, players, network, flashSkill, ui) {
        this.scene = scene;
        this.state = state;
        this.network = network;
        this.ui = ui;

        this.pendingTaps = 0;
        this.lastSendTime = 0;
    }

    init() {
        this.scene.input.on('pointerdown', (pointer) => this.onPointerDown(pointer));
        this.scene.time.addEvent({
            delay: 100, // 100ms
            loop: true,
            callback: () => this.flushTaps()
        });
    }

    onPointerDown(pointer) {
        if (this.state.role !== 'player') return;
        if (!this.state.isRaceStarted || this.state.isFinished) return;

        this.pendingTaps++;

        // Hiệu ứng Visual (Optional): Tạo bụi hoặc hiệu ứng click tại chỗ chuột
        // this.ui.showClickEffect(pointer.x, pointer.y);
    }

    flushTaps() {
        if (this.pendingTaps > 0) {
            this.network.sendTap(this.pendingTaps);
            this.pendingTaps = 0;
        }
    }
}