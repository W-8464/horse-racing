export default class NetworkManager {
    constructor(scene, state, players, ui) {
        this.scene = scene;
        this.state = state;
        this.players = players;
        this.ui = ui;

        this.playerName = null;

        this.socket = null;
        this.renderBuffer = [];
        this.bufferDelay = 100;

        this.hiddenTime = 0;
        this.setupVisibilityListener();
    }

    setupVisibilityListener() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.hiddenTime = Date.now();
                return;
            }

            const timeAway = (Date.now() - this.hiddenTime) / 1000;

            if (this.socket?.disconnected) {
                this.socket.connect();
            }

            if (timeAway > 60) window.location.reload();
        });
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
            if (!this.scene.state.sounds.bgm.isPlaying) {
                this.scene.state.sounds.bgm.play();
            }
            this.scene.state.sounds.gallop.stop();
            this.scene.state.sounds.audience.stop();

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
            this.ui.showHostLeaderboard();
            this.ui.showStartButton(() => this.hostStartGame());
        });

        this.socket.on('playerAccepted', () => {
            if (this.state.role === 'player') {
                // player đã được server accept => chờ host start
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

            this.ui.startCountdown();

            this.scene.time.delayedCall(3000, () => {
                if (!this.scene.state.sounds.gallop.isPlaying) {
                    this.scene.state.sounds.gallop.play();
                }
            });
        });

        this.socket.on('youFinished', (data) => {
            this.ui.showLocalFinishRank(data.rank);
            this.scene.state.sounds.finish.play();
            this.scene.state.sounds.gallop.stop();
        });

        this.socket.on('raceFinished', (data) => {
            this.state.isRaceStarted = false;
            this.state.isFinished = true;

            this.scene.state.sounds.audience.stop();
            this.scene.state.sounds.gallop.stop();
            if (!this.scene.state.sounds.bgm.isPlaying) {
                this.scene.state.sounds.bgm.play();
            }

            if (this.state.role === 'host') {
                this.ui.showWinnerBanner(data);
            }
        });

        this.socket.on('gameStateUpdate', (data) => {
            let rawBuffer = data.b;

            if (!(rawBuffer instanceof ArrayBuffer) && rawBuffer.buffer) {
                rawBuffer = rawBuffer.buffer;
            }

            const positions = new Float32Array(rawBuffer);
            const playerSnapshot = {};

            for (let i = 0; i < positions.length; i += 2) {
                const playerIdx = positions[i];
                const x = positions[i + 1];
                playerSnapshot[playerIdx] = x;
            }

            this.renderBuffer.push({
                p: playerSnapshot,
                ts: data.ts
            });

            if (this.renderBuffer.length > 30) this.renderBuffer.shift();
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

    emitMovement(x) {
        this.socket.emit('playerMovement', { x });
    }

    requestRestart() {
        if (this.state.role !== 'host') return;
        this.socket.emit('hostRestartGame');
    }
}
