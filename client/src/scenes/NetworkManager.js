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
                console.log('Game đang chạy, chuyển sang chế độ khán giả');

                this.state.role = 'spectator';

                // QUAN TRỌNG: Nếu game đang chạy hoặc đếm ngược, phải set state để ngựa chạy
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

        this.socket.on('raceReset', (data) => {
            // Data nhận về: { players: [], totalPlayers: 0 }

            // 1. Reset State
            this.state.progress = 0;
            this.state.speed = 0;
            this.state.isRaceStarted = false;
            this.state.isFinished = false;
            this.state.finishedPlayers = [];

            // 2. Reset UI chung
            this.ui.destroyWinner();
            this.ui.destroyStartButton();
            this.ui.destroyWaitingText();
            this.ui.updateProgressBar(0, 0);
            this.ui.destroySpectatorText();

            // Reset Ngựa
            this.players.resetSharedHorse();

            // Reset Âm thanh
            if (!this.scene.state.sounds.bgm.isPlaying) {
                this.scene.state.sounds.bgm.play();
            }
            this.scene.state.sounds.gallop.stop();
            this.scene.state.sounds.audience.stop();

            // 3. UI RIÊNG CHO TỪNG ROLE
            if (this.state.role === 'host') {
                // Cập nhật Leaderboard ngay lập tức với điểm số 0
                this.ui.updateHostLeaderboard(data.players, data.totalPlayers);

                // Hiện lại nút Start
                this.ui.showStartButton(() => this.hostStartGame());
            }

            if (this.state.role === 'player') {
                // Hiện lại chữ Waiting cho Player
                this.ui.showWaitingText();
            }

            if (this.state.role === 'spectator') {
                // Chuyển role về null hoặc player để cho phép nhập tên lại
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

        // XỬ LÝ KẾT THÚC GAME
        this.socket.on('raceFinished', (data) => {
            this.state.isFinished = true;
            this.state.isRaceStarted = false;
            this.players.updateSharedHorse(1, 0);

            this.scene.state.sounds.audience.stop();
            this.scene.state.sounds.gallop.stop();
            if (!this.scene.state.sounds.bgm.isPlaying) {
                this.scene.state.sounds.bgm.play();
            }

            if (this.state.role === 'host') {
                this.ui.updateHostLeaderboard(data.topContributors || [], data.totalPlayers || 0);
            }
        });

        this.socket.on('gameStateUpdate', (data) => {
            this.state.progress = data.progress;
            this.state.speed = data.speed; // (Lưu ý: server code mới của bạn chưa tính speed, nếu cần thì thêm logic tính speed bên server)

            // Cập nhật Leaderboard realtime cho Host (Ngay cả ở Lobby)
            if (this.state.role === 'host' && data.contributions) {
                const sortedContributors = Object.values(data.contributions)
                    .sort((a, b) => b.taps - a.taps)
                    .slice(0, 10);
                this.ui.updateHostLeaderboard(sortedContributors, data.totalPlayers || 0);
            }

            // Cập nhật Leaderboard cho Spectator (nếu muốn khán giả cũng thấy top)
            if (this.state.role === 'spectator') {
                this.ui.updateProgressBar(data.progress, data.speed);
            }

            this.ui.updateProgressBar(data.progress, data.speed);
        });

        this.socket.on('forceReload', () => {
            window.location.reload();
        });
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

    sendTap() {
        this.socket.emit('playerTap');
    }

    requestRestart() {
        if (this.state.role !== 'host') return;
        this.socket.emit('hostRestartGame');
    }
}
