export default class NetworkManager {
    constructor(scene, state, players, ui) {
        this.scene = scene;
        this.state = state;
        this.players = players;
        this.ui = ui;
        this.socket = null;
    }

    init() {
        this.socket = io({
            transports: ['websocket']
        });

        const rejoin = () => {
            if (this.state.role === 'player' && this.playerName) {
                this.socket.emit('selectRole', { role: 'player', name: this.playerName, color: this.playerColor });
            }
            if (this.state.role === 'host' && this.ui.cachedHostPassword) {
                this.socket.emit('selectRole', { role: 'host', password: this.ui.cachedHostPassword });
            }
        };

        this.socket.on('connect', rejoin);
        this.socket.io.on('reconnect', rejoin);

        this.bindListeners();
    }

    bindListeners() {
        this.socket.on('initialState', (status) => {
            if (this.state.role !== 'host' && status !== 'LOBBY') {
                this.state.role = 'spectator';
                if (status === 'RUNNING') {
                    this.state.isRaceStarted = true;
                }
                this.ui.showSpectatorMode();
            }
        });

        this.socket.on('joinError', (msg) => {
            alert(msg);
            this.state.role = 'spectator';
            this.ui.showSpectatorMode();
        });

        // 1. CHỈ GIỮ LẠI gameUpdateFast (Xóa gameStateUpdate cũ)
        this.socket.on('gameUpdateFast', (data) => {
            this.state.progress = data.p;
            this.ui.updateProgressBar(data.p, 0);

            if (this.state.role !== 'host' && this.players) {
                if (data.s === 'RUNNING') this.state.isRaceStarted = true;
                this.players.updateSharedHorse(data.p, 0);
            }
        });

        this.socket.on('leaderboardUpdate', (data) => {
            if (this.state.role === 'host') {
                this.ui.updateHostLeaderboard(data.top, data.total);
            }
        });

        this.socket.on('raceReset', (data) => {
            this.state.progress = 0;
            this.state.speed = 0;
            this.state.isRaceStarted = false;
            this.state.isFinished = false;

            this.ui.destroyWinner();
            this.ui.destroyStartButton();
            this.ui.destroyWaitingText();
            this.ui.updateProgressBar(0, 0);
            this.ui.destroySpectatorText();

            this.players.resetSharedHorse();

            if (this.scene.env) {
                this.scene.env.stopFireworks();
            }

            // Reset âm thanh
            if (!this.scene.state.sounds.bgm.isPlaying) {
                this.scene.state.sounds.bgm.play();
            }
            this.scene.state.sounds.gallop.stop();
            this.scene.state.sounds.audience.stop();
            this.scene.state.sounds.finish.stop(); // Stop nhạc finish nếu đang chạy

            if (this.state.role === 'host') {
                this.ui.updateHostLeaderboard(data.players, data.totalPlayers);
                this.ui.showStartButton(() => this.hostStartGame());
            }

            if (this.state.role === 'player') {
                this.ui.showWaitingText();
            }

            if (this.state.role === 'spectator') {
                this.state.role = null;
                this.ui.showPlayerNameInput((name) => {
                    this.scene.handleFullScreen();
                    this.state.role = 'player';
                    this.selectRolePlayer(name);
                    this.ui.showWaitingText();
                });
            }
        });

        this.socket.on('hostRejected', () => {
            if (this.state.role === 'host') this.ui.showHostPasswordError();
        });

        this.socket.on('hostAccepted', () => {
            if (this.state.role !== 'host') return;
            this.ui.destroyHostPasswordInput();
            this.ui.showHostLeaderboard();
            this.ui.showStartButton(() => this.hostStartGame());
        });

        this.socket.on('playerAccepted', () => {
            if (this.state.role === 'player') {
                this.ui.showWaitingText();
            }
        });

        this.socket.on('startCountdown', () => {
            if (this.scene.state.sounds.bgm.isPlaying) this.scene.state.sounds.bgm.stop();
            this.scene.state.sounds.countdown.play();
            this.scene.state.sounds.audience.play();

            this.ui.clearBeforeCountdown();
            this.state.isRaceStarted = false;
            this.state.isFinished = false;

            if (this.state.role === 'player') {
                this.ui.startCountdown();
            }

            this.scene.time.delayedCall(3000, () => {
                if (!this.scene.state.sounds.gallop.isPlaying) {
                    this.scene.state.sounds.gallop.play();
                }
            });
        });

        // 2. CẬP NHẬT XỬ LÝ KẾT THÚC
        this.socket.on('raceFinished', (data) => {
            this.state.isFinished = true;
            this.state.isRaceStarted = false;
            this.players.updateSharedHorse(1, 0);

            // Dừng các âm thanh nền
            this.scene.state.sounds.audience.stop();
            this.scene.state.sounds.gallop.stop();
            this.scene.state.sounds.bgm.stop();
            this.scene.state.sounds.finish.play();

            if (this.scene.env) {
                this.scene.env.launchFireworks();
            }

            if (this.state.role === 'host') {
                this.ui.updateHostLeaderboard(data.topContributors || [], data.totalPlayers || 0);
            }
            else if (this.state.role === 'player' || this.state.role === 'spectator') {
                this.ui.showFinishText();
            }
        });

        this.socket.on('forceReload', () => {
            window.location.reload();
        });
    }

    // emits
    selectRolePlayer(name) {
        this.playerName = name;
        this.playerColor = Math.random() * 0xffffff;
        this.socket.emit('selectRole', { role: 'player', name, color: this.playerColor });
    }

    selectRoleHost(password) {
        this.socket.emit('selectRole', { role: 'host', password });
    }

    hostStartGame() {
        this.socket.emit('hostStartGame');
    }

    sendTap(count = 1) {
        this.socket.emit('playerTap', { count: count });
    }

    requestRestart() {
        if (this.state.role !== 'host') return;
        this.socket.emit('hostRestartGame');
    }
}