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

        this.socket.on('gameUpdateFast', (data) => {
            this.state.progress = data.p;

            // SỬA: Cập nhật trạng thái chạy cho TẤT CẢ (bao gồm Host)
            if (data.s === 'RUNNING') {
                this.state.isRaceStarted = true;
            }

            this.ui.updateProgressBar(data.p, 0);

            // Host đã được phép update visual trong GameScene.update, 
            // nhưng để chắc chắn mượt mà, ta có thể gọi updateSharedHorse ở đây cho Player/Spectator
            if (this.state.role !== 'host' && this.players) {
                this.players.updateSharedHorse(data.p, 0);
            }
        });

        // SỬA: Cả Host và Player đều nhận Leaderboard HUD
        this.socket.on('leaderboardUpdate', (data) => {
            this.ui.updateLeaderboardHUD(data.top, data.total, this.state.role === 'host');
        });

        this.socket.on('raceReset', (data) => {
            // 1. Reset State
            this.state.progress = 0;
            this.state.speed = 0;
            this.state.isRaceStarted = false;
            this.state.isFinished = false;
            this.state.finishedPlayers = [];

            // 2. Reset UI
            this.ui.destroyWinner();
            this.ui.destroyStartButton();
            this.ui.destroyWaitingText();
            this.ui.updateProgressBar(0, 0);

            // SỬA: Reset HUD về trạng thái ban đầu (dùng slice 5 cho gọn)
            this.ui.updateLeaderboardHUD(data.players.slice(0, 10), data.totalPlayers, this.state.role === 'host');

            // Reset Ngựa
            this.players.resetSharedHorse();

            // Reset Âm thanh & Pháo hoa
            if (this.scene.env) this.scene.env.stopFireworks();

            if (!this.scene.state.sounds.bgm.isPlaying) {
                this.scene.state.sounds.bgm.play();
            }
            this.scene.state.sounds.gallop.stop();
            this.scene.state.sounds.audience.stop();
            this.scene.state.sounds.finish.stop();

            // 3. UI RIÊNG
            if (this.state.role === 'host') {
                // Host chỉ hiện nút Start (Leaderboard đã có ở góc phải)
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

            // SỬA: Khởi tạo HUD rỗng và hiện nút Start
            this.ui.updateLeaderboardHUD([], 0, true);
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

            // Host không cần countdown text to, chỉ Player cần
            if (this.state.role === 'player') {
                this.ui.startCountdown();
            }

            this.scene.time.delayedCall(3000, () => {
                if (!this.scene.state.sounds.gallop.isPlaying) {
                    this.scene.state.sounds.gallop.play();
                }
            });
        });

        // 4. XỬ LÝ KẾT THÚC GAME
        this.socket.on('raceFinished', (data) => {
            this.state.isFinished = true;
            this.state.isRaceStarted = false;
            this.players.updateSharedHorse(1, 0);

            this.scene.state.sounds.audience.stop();
            this.scene.state.sounds.gallop.stop();
            this.scene.state.sounds.bgm.stop();
            this.scene.state.sounds.finish.play();

            if (this.scene.env) {
                this.scene.env.launchFireworks();
            }

            // Cập nhật HUD lần cuối cho tất cả mọi người
            const all = data.allContributors || [];
            this.ui.updateLeaderboardHUD(all.slice(0, 10), data.totalPlayers || 0, this.state.role === 'host');

            // Hiển thị thông báo kết thúc
            if (this.state.role === 'host') {
                // Host: Happy New Year
                this.ui.showFinishText(null, null, true);
            }
            else if (this.state.role === 'player') {
                // Player: Rank & Taps
                const myId = this.socket.id;
                const myListIndex = all.findIndex(p => p.id === myId);

                let myRank = '?';
                let myTaps = 0;
                if (myListIndex !== -1) {
                    myRank = myListIndex + 1;
                    myTaps = all[myListIndex].taps;
                }
                this.ui.showFinishText(myRank, myTaps, false);
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
        this.ui.cachedHostPassword = password; // Lưu pass để reconnect nếu cần
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