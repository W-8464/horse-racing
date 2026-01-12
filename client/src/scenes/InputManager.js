export default class InputManager {
    constructor(scene, state, players, network, flashSkill, ui) {
        this.scene = scene;
        this.state = state;
        this.players = players;
        this.network = network;
        this.flashSkill = flashSkill;
        this.ui = ui;
    }

    init() {
        this.scene.input.on('pointerdown', (pointer) => this.onPointerDown(pointer));
    }

    onPointerDown(pointer) {
        // chặn khi winner overlay đang mở
        if (this.ui.isWinnerOpen()) return;

        // chỉ player mới được click để chạy
        if (this.state.role !== 'player') return;

        // chỉ chạy khi race started
        if (!this.state.isRaceStarted || this.state.isFinished || !this.players.horse) return;

        // click vào flash button thì bỏ qua click chạy
        if (this.flashSkill.isPointerOnButton(pointer)) return;

        this.players.moveSelfBy(20);
        this.network.emitMovement(this.players.horse.x);

        this.flashSkill.registerNormalClick();
    }
}
