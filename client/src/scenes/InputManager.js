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
        if (this.ui.isWinnerOpen()) return;
        if (this.state.role !== 'player') return;

        if (this.state.isCountdownRunning) return;

        if (!this.state.isRaceStarted || this.state.isFinished || !this.players.horse) return;

        this.players.moveSelfBy(15);
        this.network.emitMovement(this.players.horse.x);

        if (this.players.horse.requestRun) this.players.horse.requestRun(1);
        else if (this.players.horse.playRun) this.players.horse.playRun();
    }
}