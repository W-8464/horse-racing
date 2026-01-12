export default class NetworkManager {
    constructor(scene, state, players, ui) {
        this.scene = scene;
        this.state = state;
        this.players = players;
        this.ui = ui;

        this.socket = null;
    }

    init() {
        this.socket = io();
        this.bindListeners();
    }

    bindListeners() {
        this.socket.on('currentPlayers', (players) => {
            this.players.syncCurrentPlayers(players, this.socket.id);
        });

        this.socket.on('newPlayer', (playerInfo) => {
            this.players.addOther(playerInfo, this.socket.id);
        });

        this.socket.on('playerMoved', (playerInfo) => {
            this.players.updateOtherPosition(playerInfo);
        });

        this.socket.on('playerDisconnected', (playerId) => {
            this.players.removeOther(playerId);
        });

        this.socket.on('raceReset', (players) => {
            this.state.isRaceStarted = false;
            this.state.isFinished = false;

            this.players.resetPositionsFromServer(players, this.socket.id);

            // UI theo role
            this.ui.destroyWinner();
            this.ui.destroyStartButton();
            this.ui.destroyWaitingText();

            if (this.state.role === 'host') this.ui.showStartButton(() => this.hostStartGame());
            if (this.state.role === 'player') this.ui.showWaitingText();
        });

        // auth host
        this.socket.on('hostRejected', () => {
            if (this.state.role === 'host') this.ui.showHostPasswordError();
        });

        this.socket.on('hostAccepted', () => {
            if (this.state.role !== 'host') return;
            this.ui.destroyHostPasswordInput();
            this.ui.showStartButton(() => this.hostStartGame());
        });

        this.socket.on('playerAccepted', () => {
            if (this.state.role === 'player') {
                // player đã được server accept => chờ host start
                this.ui.showWaitingText();
            }
        });

        this.socket.on('startCountdown', () => {
            this.ui.clearBeforeCountdown();
            this.state.isRaceStarted = false;
            this.state.isFinished = false;

            this.ui.startCountdown();
        });

        this.socket.on('raceFinished', (data) => {
            this.state.isRaceStarted = false;
            this.state.isFinished = true;
            this.ui.showWinnerBanner(data.winnerName);
        });
    }

    // emits
    selectRolePlayer(name) {
        this.socket.emit('selectRole', { role: 'player', name });
    }

    selectRoleHost(password) {
        this.socket.emit('selectRole', { role: 'host', password });
    }

    hostStartGame() {
        this.socket.emit('hostStartGame');
    }

    emitMovement(x) {
        this.socket.emit('playerMovement', { x });
    }
}
