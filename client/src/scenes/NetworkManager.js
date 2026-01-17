export default class NetworkManager {
    constructor(scene, state, players, ui) {
        this.scene = scene;
        this.state = state;
        this.players = players;
        this.ui = ui;

        this.socket = null;
        this.renderBuffer = [];
        this.bufferDelay = 100;

        // Mobile background thường làm rớt WebSocket => cần auto re-join khi reconnect
        this.rolePayload = null; // { role: 'player'|'host', name?, password?, token? }
        this.localPlayerId = null; // id ổn định do server trả về (không phụ thuộc socket.id)
        this.TOKEN_KEY = 'horse_race_token';
        this.NAME_KEY = 'horse_race_name';

        this.hiddenTime = 0;
        this.setupVisibilityListener();
    }

    getLocalPlayerId() {
        return this.localPlayerId || (this.state && this.state.playerId) || (this.socket ? this.socket.id : null);
    }

    tryAutoRejoin() {
        if (!this.socket || !this.socket.connected) return;
        if (!this.rolePayload || !this.rolePayload.role) return;

        // Gắn token (nếu có) để server resume đúng player cũ
        const storedToken = localStorage.getItem(this.TOKEN_KEY);
        if (storedToken) this.rolePayload.token = storedToken;

        // Re-emit selectRole sau reconnect
        this.socket.emit('selectRole', this.rolePayload);
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
        this.socket = io({
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 500,
            reconnectionDelayMax: 2000,
            timeout: 20000
        });

        // 'connect' sẽ chạy cả lần đầu và sau khi reconnect
        this.socket.on('connect', () => {
            this.tryAutoRejoin();
        });

        // Khi mất kết nối, chặn gửi input để tránh "đua local" mà server không nhận
        this.socket.on('disconnect', () => {
            // Có thể thêm UI "Reconnecting..." nếu muốn
        });

        this.bindListeners();
    }

    bindListeners() {
        this.socket.on('currentPlayers', (players) => {
            this.players.syncCurrentPlayers(players, this.getLocalPlayerId());
        });

        this.socket.on('newPlayer', (playerInfo) => {
            this.players.addOther(playerInfo, this.getLocalPlayerId());
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

            this.players.resetPositionsFromServer(players, this.getLocalPlayerId());

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

        this.socket.on('playerAccepted', (data) => {
            // Server sẽ trả token + playerId để client resume được sau reconnect
            if (data && data.token) {
                localStorage.setItem(this.TOKEN_KEY, data.token);
                if (this.rolePayload) this.rolePayload.token = data.token;
            }
            if (data && data.playerId) {
                this.localPlayerId = data.playerId;
                this.state.playerId = data.playerId;
            }

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

        this.socket.on('youFinished', (data) => {
            this.ui.showLocalFinishRank(data.rank);
        });

        this.socket.on('raceFinished', (data) => {
            this.state.isRaceStarted = false;
            this.state.isFinished = true;
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
        this.state.role = 'player';
        localStorage.setItem(this.NAME_KEY, name);

        this.rolePayload = {
            role: 'player',
            name,
            token: localStorage.getItem(this.TOKEN_KEY) || undefined
        };

        this.socket.emit('selectRole', this.rolePayload);
    }

    selectRoleHost(password) {
        this.state.role = 'host';
        this.rolePayload = {
            role: 'host',
            password
        };
        this.socket.emit('selectRole', this.rolePayload);
    }

    hostStartGame() {
        this.socket.emit('hostStartGame');
    }

    emitMovement(x) {
        // Nếu đang disconnect (mobile background), đừng cho đua local nữa
        if (!this.socket || !this.socket.connected) return;
        this.socket.emit('playerMovement', { x });
    }

    requestRestart() {
        if (this.state.role !== 'host') return;
        this.socket.emit('hostRestartGame');
    }
}
