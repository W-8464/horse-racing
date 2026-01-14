export default class NetworkManager {
    constructor(scene, state, players, ui) {
        this.scene = scene;
        this.state = state;
        this.players = players;
        this.ui = ui;

        this.socket = null;
        this.renderBuffer = [];
        this.bufferDelay = 100;

        this.hiddenTime = 0;
        this.setupVisibilityListener();
    }

    setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // Lưu thời điểm bắt đầu rời tab
                this.hiddenTime = Date.now();
            } else if (document.visibilityState === 'visible') {
                // Khi quay lại, tính toán thời gian đã trôi qua
                const timeAway = (Date.now() - this.hiddenTime) / 1000;

                if (timeAway > 30) {
                    // Nếu quá 30 giây, tải lại trang để làm sạch trạng thái
                    window.location.reload();
                } else {
                    // Nếu dưới 30 giây, kiểm tra xem socket còn sống không
                    // Nếu mất kết nối thì cũng nên reload hoặc kết nối lại
                    if (this.socket && !this.socket.connected) {
                        this.socket.connect();
                    }
                }
            }
        });
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
            this.ui.showWinnerBanner(data);
        });

        this.socket.on('gameStateUpdate', (data) => {
            this.renderBuffer.push(data);
            if (this.renderBuffer.length > 60) this.renderBuffer.shift();
        });

        this.socket.on('forceReload', () => {
            window.location.reload();
        });

        this.socket.off('playerMoved');
    }

    getInterpolatedState() {
        const renderTime = Date.now() - this.bufferDelay;

        // Cần ít nhất 2 gói tin để nội suy
        if (this.renderBuffer.length < 2) return null;

        // Tìm 2 gói tin bao quanh renderTime
        for (let i = 0; i < this.renderBuffer.length - 1; i++) {
            const b0 = this.renderBuffer[i];
            const b1 = this.renderBuffer[i + 1];

            if (renderTime >= b0.ts && renderTime <= b1.ts) {
                return { b0, b1, renderTime };
            }
        }
        return null;
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

    requestRestart() {
        if (this.state.role !== 'host') return;
        this.socket.emit('hostRestartGame');
    }
}
