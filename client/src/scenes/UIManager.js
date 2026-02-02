import { GAME_SETTINGS, DEPTH } from '../config/config.js';

const PIXEL_INPUT_STYLE = `
  background: #111;
  color: #5dfc9b;
  border: 4px solid #5dfc9b;
  font-family: monospace;
  font-size: 20px;
  padding: 8px;
  outline: none;
  box-shadow: 0 0 0 4px #003b1f inset;
  appearance: none;
  -webkit-appearance: none;
  width: 260px;
  text-align: center;
`;

const PIXEL_BTN_STYLE = `
  background: #003b1f;
  color: #5dfc9b;
  border: 4px solid #5dfc9b;
  font-family: monospace;
  font-size: 18px;
  padding: 8px 20px;
  cursor: pointer;
  min-width: 110px;
  margin: 10px;
  font-weight: bold;
  transition: all 0.1s;
`;

const LEADERBOARD_CONTAINER_STYLE = `
    background: rgba(0, 59, 31, 0.85);
    border: 4px solid #5dfc9b;
    padding: 15px;
    font-family: 'Courier New', monospace;
    min-width: 280px;
    pointer-events: auto;
    box-shadow: 0 0 20px rgba(0,0,0,0.5);
    max-height: 400px;
    overflow-y: auto;
`;

const REFRESH_BTN_STYLE = `
    background: none;
    border: none;
    color: #ffeb3b;
    cursor: pointer;
    font-size: 20px;
    padding: 0;
    line-height: 1;
    display: flex;
    align-items: center;
    transition: transform 0.1s;
    position: absolute;
    right: 24px;
`;

export default class UIManager {
    constructor(scene, state) {
        this.scene = scene;
        this.state = state;

        this.playerBtn = null;
        this.hostBtn = null;

        this.waitingText = null;
        this.startButton = null;

        this.playerNameDom = null;
        this.hostPassDom = null;

        this.countdownText = null;
        this.finishRankText = null;

        this.winnerOverlay = null;
        this.winnerContainer = null;

        this._ratioInputY = 0.45;
        this._ratioCountdownY = 0.35;

        this.hostLeaderboardDom = null;
    }

    _getLayout() {
        const w = this.scene.scale.width;
        const h = this.scene.scale.height;
        const cx = w / 2;
        const cy = h / 2;

        const baseW = GAME_SETTINGS.DESIGN_WIDTH;
        const baseH = GAME_SETTINGS.DESIGN_HEIGHT;
        const s = Phaser.Math.Clamp(Math.min(w / baseW, h / baseH), 0.65, 1.2);

        return { w, h, cx, cy, s };
    }

    layout() {
        const { w, h, cx, cy, s } = this._getLayout();
        const inputY = Math.round(h * this._ratioInputY);
        const countdownY = Math.round(h * this._ratioCountdownY);
        const clampedScale = Math.min(s, h / 500);

        if (this.playerNameDom) {
            this.playerNameDom.setPosition(cx, inputY);
            this.playerNameDom.setScale(clampedScale);
        }
        if (this.hostPassDom) {
            this.hostPassDom.setPosition(cx, inputY);
            this.hostPassDom.setScale(clampedScale);
        }

        if (this.waitingText) {
            this.waitingText.setPosition(cx, inputY);
            this.waitingText.setFontSize(Math.round(28 * clampedScale));
        }
        if (this.startButton) {
            this.startButton.setPosition(cx, inputY);
            // Không scale container để tránh lệch hit-area.
        }
        if (this.countdownText) {
            this.countdownText.setPosition(cx, countdownY);
            this.countdownText.setFontSize(Math.round(96 * clampedScale));
        }

        if (this.hostLeaderboardDom) {
            // Thay vì setPosition theo tâm màn hình, ta để CSS top/right lo việc này
            // Hoặc nếu muốn dùng setPosition của Phaser:
            this.hostLeaderboardDom.setPosition(w - 20, 20);
            this.hostLeaderboardDom.setOrigin(1, 0); // Gốc tọa độ tại góc trên bên phải của DOM
        }

        if (this.winnerOverlay) {
            this.winnerOverlay.setPosition(cx, cy);
            this.winnerOverlay.setSize(w, h);
        }
        if (this.winnerContainer) {
            this.winnerContainer.setPosition(cx, cy);
        }
    }

    isWinnerOpen() {
        return !!(this.winnerOverlay || this.winnerContainer);
    }

    showPlayerNameInput(onJoin) {
        const { cx, cy } = this._getLayout();

        const dom = this.scene.add.dom(cx, cy).createFromHTML(`
      <div style="text-align:center">
        <div style="color:#5dfc9b;font-family:monospace;font-size:32px;margin-bottom:10px">
          ENTER NAME
        </div>
        <input id="playerName" type="text" style="${PIXEL_INPUT_STYLE}" />
        <br/><br/>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="joinBtn" style="${PIXEL_BTN_STYLE}">JOIN</button>
        </div>
      </div>
    `).setDepth(DEPTH.UI).setScrollFactor(0);

        this.playerNameDom = dom;

        dom.addListener('click');
        dom.on('click', (e) => {
            if (e.target.id === 'joinBtn') {
                const name = dom.getChildByID('playerName').value.trim();
                if (!name) return;
                this.destroyPlayerNameInput();
                window.scrollTo(0, 0);
                onJoin?.(name);
            }
        });

        this.layout();
    }

    destroyPlayerNameInput() {
        if (this.playerNameDom) {
            this.playerNameDom.destroy();
            this.playerNameDom = null;
        }
    }

    showHostPasswordInput(onConfirm) {
        const { cx } = this._getLayout();

        const dom = this.scene.add.dom(cx, 300).createFromHTML(`
      <div style="text-align:center">
        <div style="color:#ff1744;font-family:monospace;font-size:20px;margin-bottom:10px">
          HOST ACCESS
        </div>
        <input id="hostPass" type="password" style="${PIXEL_INPUT_STYLE}" />
        <br/><br/>
        <button id="hostBtn" style="${PIXEL_BTN_STYLE}">CONFIRM</button>
        <div id="error"
          style="color:#ff1744;font-family:monospace;font-size:14px;margin-top:8px;display:none">
          INVALID PASSWORD
        </div>
      </div>
    `).setDepth(DEPTH.UI).setScrollFactor(0);

        this.hostPassDom = dom;

        dom.addListener('click');
        dom.on('click', (e) => {
            if (e.target.id === 'hostBtn') {
                const pass = dom.getChildByID('hostPass').value.trim();
                if (!pass) return;
                onConfirm?.(pass);
            }
        });

        this.layout();
    }

    showHostPasswordError() {
        if (!this.hostPassDom) return;
        this.hostPassDom.getChildByID('error').style.display = 'block';
    }

    destroyHostPasswordInput() {
        if (this.hostPassDom) {
            this.hostPassDom.destroy();
            this.hostPassDom = null;
            window.scrollTo(0, 0);
        }
    }

    showWaitingText() {
        if (this.waitingText) return;

        const { cx } = this._getLayout();

        this.waitingText = this.scene.add.text(
            cx,
            300,
            'Waiting to start...',
            { fontSize: '28px', fontFamily: 'monospace', color: '#ffffff' }
        ).setOrigin(0.5).setDepth(DEPTH.UI);

        this.layout();
    }

    destroyWaitingText() {
        if (this.waitingText) {
            this.waitingText.destroy();
            this.waitingText = null;
        }
    }

    showStartButton(onStart) {
        if (this.startButton) return;

        const { cx } = this._getLayout();

        const btnBg = this.scene.add.graphics()
            .fillStyle(0x00c853, 1).lineStyle(4, 0x008a39, 1)
            .fillRoundedRect(-100, -40, 200, 80, 5)
            .strokeRoundedRect(-100, -40, 200, 80, 5)
            .lineStyle(2, 0x5dfc9b, 1)
            .strokeRoundedRect(-94, -34, 188, 68, 3);

        const btnText = this.scene.add.text(0, 0, 'START', {
            fontSize: '40px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.startButton = this.scene.add.container(cx, 300, [btnBg, btnText])
            .setScrollFactor(0)
            .setSize(200, 80)
            .setInteractive({ useHandCursor: true })
            .setDepth(DEPTH.UI);

        this.startButton.on('pointerdown', () => onStart?.());

        this.layout();
    }

    destroyStartButton() {
        if (this.startButton) {
            this.startButton.destroy(true);
            this.startButton = null;
        }
    }

    clearAllDomElements() {
        const gameCanvas = this.scene.game.canvas;
        const parent = gameCanvas.parentElement;
        if (!parent) return;

        parent.querySelectorAll('.phaser-dom-element').forEach(el => el.remove());
    }

    clearBeforeCountdown() {
        this.clearAllDomElements();

        this.destroyPlayerNameInput();
        this.destroyHostPasswordInput();
        this.destroyWaitingText();
        this.destroyStartButton();
        this.destroyWinner();

        this.destroyGuideOverlay();
        this.destroyHelpButton();
    }

    startCountdown() {
        this.state.isCountdownRunning = true;
        let timeLeft = GAME_SETTINGS.COUNTDOWN_TIME;

        if (this.countdownText) {
            this.countdownText.destroy();
            this.countdownText = null;
        }

        const { cx } = this._getLayout();

        const txt = this.scene.add.text(
            cx,
            200,
            timeLeft.toString(),
            { fontSize: '96px', fontStyle: 'bold', color: '#ff1744' }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI);

        this.countdownText = txt;

        this.layout();

        this.scene.time.addEvent({
            delay: 1000,
            repeat: timeLeft,
            callback: () => {
                timeLeft--;
                if (timeLeft > 0) {
                    txt.setText(timeLeft.toString());
                    return;
                }

                txt.setText('GO!');
                this.state.isRaceStarted = true;
                this.state.isCountdownRunning = false;

                this.scene.time.delayedCall(800, () => {
                    if (this.countdownText) {
                        this.countdownText.destroy();
                        this.countdownText = null;
                    }
                });
            }
        });
    }

    showHostLeaderboard() {
        if (this.hostLeaderboardDom) return;

        this.hostLeaderboardDom = this.scene.add.dom(0, 0).createFromHTML(`
    <div id="unified-leaderboard" style="${LEADERBOARD_CONTAINER_STYLE}">
        <div style="display: flex; justify-content: center; align-items: center; border-bottom: 2px solid #ffeb3b; margin-bottom: 10px; padding-bottom: 5px;">
            <h2 style="color:#ffeb3b; margin:0; font-size:18px; font-family: 'Courier New', monospace;">
                LEADERBOARD
            </h2>
            <button id="restartBtn" style="${REFRESH_BTN_STYLE}" title="Reset Race">
                ↻
            </button>
        </div>
        <div id="leaderboard-list"></div>
    </div>
    `).setScrollFactor(0).setDepth(DEPTH.UI + 10);

        this.hostLeaderboardDom.addListener('click');
        this.hostLeaderboardDom.on('click', (e) => {
            if (e.target.id === 'restartBtn') {
                e.target.style.transform = 'rotate(180deg)';
                setTimeout(() => { e.target.style.transform = 'rotate(0deg)'; }, 200);

                this.scene.events.emit('restartRequested');
            }
        });

        this.layout();
    }

    updateHostLeaderboard(sortedPlayers) {
        if (!this.hostLeaderboardDom) return;

        const listContainer = this.hostLeaderboardDom.getChildByID('leaderboard-list');
        if (!listContainer) return;

        const finishedData = this.state.finishedPlayers || [];
        const top10 = sortedPlayers.slice(0, 10);

        listContainer.innerHTML = top10.map((player, index) => {
            const finishEntry = finishedData.find(f => f.id === player.id);
            const timeText = finishEntry ? `<span style="color:#ffeb3b; font-size:12px;">${finishEntry.finishTime}s</span>` : '';
            const isFirst = index === 0;

            return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; font-size: 14px; color: ${isFirst ? '#ffeb3b' : '#5dfc9b'}">
                <span>#${index + 1} ${player.name.substring(0, 8)}</span>
                ${timeText}
            </div>
        `;
        }).join('');
    }

    destroyWinner() {
        if (this.finishRankText) {
            this.finishRankText.destroy();
            this.finishRankText = null;
        }
    }

    showLocalFinishRank(rank) {
        const { cx, cy } = this._getLayout();

        if (this.finishRankText) this.finishRankText.destroy();

        this.finishRankText = this.scene.add.text(
            cx, cy - 100,
            `YOU FINISHED!\nRANK: ${rank}`,
            {
                fontSize: '32px',
                fontFamily: 'monospace',
                color: '#003b1f',
                align: 'center',
            }
        ).setOrigin(0.5).setDepth(DEPTH.UI).setScrollFactor(0);
    }

    /**
     * Hiển thị bục vinh quang Top 3
     * @param {Array} top3Data - Mảng chứa { name, horseColor, finishTime } của top 3
     * @param {Function} onRestart - Callback khi host bấm nút Restart
     */

    showPodium(top3Data) {
        this.clearAllDomElements();

        if (this.hostLeaderboardDom) {
            this.hostLeaderboardDom.destroy();
            this.hostLeaderboardDom = null;
        }

        if (this.podiumContainer) this.podiumContainer.destroy();

        const { w, h, cx, cy } = this._getLayout();

        // [SỬA ĐỔI 1]: Logic Scale "mạnh tay" hơn cho màn hình thấp
        let contentScale = 1;
        if (h < 800) contentScale = 0.75;
        if (h < 500) contentScale = 0.6; // Màn hình iPhone xoay ngang (cao ~400px) cần scale này

        this.podiumContainer = this.scene.add.container(cx, cy)
            .setDepth(DEPTH.UI + 20)
            .setScrollFactor(0)
            .setScale(contentScale);

        // Nền mờ
        const overlay = this.scene.add.rectangle(0, 0, w * 2, h * 2, 0x000000, 0.85);
        overlay.setInteractive();
        this.podiumContainer.add(overlay);

        // [SỬA ĐỔI 2]: Tiêu đề VICTORY
        // Mặc định -220, nếu màn hình thấp thì kéo xuống -180 cho đỡ bị khuất lên trên
        let titleY = -220;
        if (h < 500) titleY = -210;

        const titleText = this.scene.add.text(0, titleY, "VICTORY", {
            fontFamily: 'monospace', fontSize: '60px', color: '#ffeb3b', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Thu nhỏ chữ chút nữa nếu màn hình quá bé
        if (h < 500) titleText.setScale(0.8);

        this.podiumContainer.add(titleText);

        const podiumConfig = [
            { rank: 2, dataIdx: 1, x: -200, y: 50, height: 150, color: 0xC0C0C0 },
            { rank: 1, dataIdx: 0, x: 0, y: -20, height: 220, color: 0xFFD700 },
            { rank: 3, dataIdx: 2, x: 200, y: 80, height: 100, color: 0xCD7F32 }
        ];

        podiumConfig.forEach(cfg => {
            const playerData = top3Data[cfg.dataIdx];
            if (!playerData) return;

            // Bục
            const box = this.scene.add.graphics();
            box.fillStyle(cfg.color, 1);
            box.lineStyle(4, 0xffffff, 1);
            box.fillRect(cfg.x - 70, cfg.y, 140, cfg.height);
            box.strokeRect(cfg.x - 70, cfg.y, 140, cfg.height);
            this.podiumContainer.add(box);

            // Số hạng
            const rankTxt = this.scene.add.text(cfg.x, cfg.y + 40, `#${cfg.rank}`, {
                fontSize: '40px', fontFamily: 'monospace', color: '#000000', fontStyle: 'bold'
            }).setOrigin(0.5);
            this.podiumContainer.add(rankTxt);

            // Ngựa
            const horseSprite = this.scene.add.sprite(cfg.x, cfg.y - 60, 'idle');
            horseSprite.setScale(0.6);
            if (playerData.horseColor) {
                horseSprite.setTint(playerData.horseColor);
            }
            horseSprite.play('horse_idle');
            this.podiumContainer.add(horseSprite);

            // Tên
            const nameTxt = this.scene.add.text(cfg.x, cfg.y - 150, playerData.name, {
                fontSize: '24px',
                fontFamily: 'monospace',
                color: '#ffffff',
                fontStyle: 'bold',
                backgroundColor: '#000000aa',
                padding: { x: 8, y: 4 }
            }).setOrigin(0.5);
            this.podiumContainer.add(nameTxt);

            // Thời gian
            const timeTxt = this.scene.add.text(cfg.x, cfg.y + cfg.height + 25, `${playerData.finishTime}s`, {
                fontSize: '20px', fontFamily: 'monospace', color: '#ffff00', fontStyle: 'bold'
            }).setOrigin(0.5);
            this.podiumContainer.add(timeTxt);
        });

        // [SỬA ĐỔI 3]: Nút Play Again
        // Kéo lên toạ độ 240 (gần sát chân bục Rank 1) để đảm bảo không bị lọt khỏi màn hình
        if (this.state.role === 'host') {
            const btnContainer = this.createPhaserButton(0, 240, "PLAY AGAIN", () => {
                this.scene.events.emit('restartRequested');
            });
            this.podiumContainer.add(btnContainer);
        }
    }

    // Helper tạo nút bấm bằng Phaser Graphic (thay thế DOM button)
    createPhaserButton(x, y, text, callback) {
        const container = this.scene.add.container(x, y);

        const bg = this.scene.add.graphics();
        bg.fillStyle(0x00c853, 1);
        bg.fillRoundedRect(-80, -25, 160, 50, 10);
        bg.lineStyle(2, 0xffffff, 1);
        bg.strokeRoundedRect(-80, -25, 160, 50, 10);

        const txt = this.scene.add.text(0, 0, text, {
            fontSize: '20px', fontFamily: 'monospace', fontStyle: 'bold'
        }).setOrigin(0.5);

        container.add([bg, txt]);

        // Tương tác
        bg.setInteractive(new Phaser.Geom.Rectangle(-80, -25, 160, 50), Phaser.Geom.Rectangle.Contains);
        bg.on('pointerdown', () => {
            container.setScale(0.95);
        });
        bg.on('pointerup', () => {
            container.setScale(1);
            callback();
        });

        return container;
    }

    destroyPodium() {
        if (this.podiumContainer) {
            this.podiumContainer.destroy();
            this.podiumContainer = null;
        }
    }

    showHelpButton() {
        if (this.helpBtn) return;

        // Vị trí: Cách lề trái 40px, lề trên 40px
        const x = 40;
        const y = 40;

        const bg = this.scene.add.graphics();

        // --- SỬA ĐỔI: Màu dịu hơn ---
        // Nền đen mờ (Alpha 0.5), không dùng màu xanh neon nữa
        bg.fillStyle(0x000000, 0.5);
        // Viền trắng mờ
        bg.lineStyle(2, 0xffffff, 0.6);

        // --- SỬA ĐỔI: Kích thước nhỏ hơn ---
        // Bán kính giảm từ 25 -> 18
        bg.fillCircle(0, 0, 18);
        bg.strokeCircle(0, 0, 18);

        const text = this.scene.add.text(0, 0, '?', {
            fontSize: '22px', // Giảm font từ 30 -> 22
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: '#ffffff' // Chữ màu trắng
        }).setOrigin(0.5);

        this.helpBtn = this.scene.add.container(x, y, [bg, text])
            .setScrollFactor(0)
            .setDepth(DEPTH.UI + 50)
            // Cập nhật vùng bấm theo kích thước mới
            .setInteractive(new Phaser.Geom.Circle(0, 0, 20), Phaser.Geom.Circle.Contains);

        this.helpBtn.on('pointerdown', () => {
            this.helpBtn.setScale(0.9);
        });

        this.helpBtn.on('pointerup', () => {
            this.helpBtn.setScale(1);
            this.showGuideOverlay();
        });
    }

    destroyHelpButton() {
        if (this.helpBtn) {
            this.helpBtn.destroy();
            this.helpBtn = null;
        }
    }

    // 2. Hàm hiển thị Bảng Hướng Dẫn (Overlay)
    showGuideOverlay() {
        // Nếu đang hiện rồi thì không tạo thêm
        if (this.guideContainer) return;

        // Ẩn nút ? tạm thời khi đang xem hướng dẫn
        if (this.helpBtn) this.helpBtn.setVisible(false);

        const { w, h, cx, cy } = this._getLayout();

        this.guideContainer = this.scene.add.container(cx, cy)
            .setDepth(DEPTH.UI + 100) // Luôn nằm trên cùng
            .setScrollFactor(0);

        // Nền đen mờ che game
        const overlay = this.scene.add.rectangle(0, 0, w * 2, h * 2, 0x000000, 0.85);
        overlay.setInteractive(); // Chặn click xuống dưới
        this.guideContainer.add(overlay);

        // Khung bảng hướng dẫn
        const bgWidth = 500;
        const bgHeight = 350;

        const panel = this.scene.add.graphics();
        panel.fillStyle(0x111111, 1);
        panel.lineStyle(4, 0x5dfc9b, 1);
        panel.fillRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 10);
        panel.strokeRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 10);
        this.guideContainer.add(panel);

        // Nội dung hướng dẫn
        const title = this.scene.add.text(0, -120, "HOW TO PLAY", {
            fontSize: '40px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffeb3b'
        }).setOrigin(0.5);

        const guideText =
            "TAP screen repeatedly\n\n" +
            "Run fast to win!";

        const content = this.scene.add.text(0, 0, guideText, {
            fontSize: '24px', fontFamily: 'monospace', color: '#ffffff', align: 'center', lineHeight: 40
        }).setOrigin(0.5);

        this.guideContainer.add([title, content]);

        // Nút X (Đóng)
        const closeBtn = this.scene.add.container(bgWidth / 2 - 30, -bgHeight / 2 + 30);

        const closeBg = this.scene.add.graphics();
        closeBg.fillStyle(0xff1744, 1);
        closeBg.fillCircle(0, 0, 20);

        const closeTxt = this.scene.add.text(0, 0, 'X', {
            fontSize: '24px', fontFamily: 'monospace', fontStyle: 'bold'
        }).setOrigin(0.5);

        closeBtn.add([closeBg, closeTxt]);
        closeBtn.setInteractive(new Phaser.Geom.Circle(0, 0, 20), Phaser.Geom.Circle.Contains);

        closeBtn.on('pointerdown', () => {
            this.destroyGuideOverlay();
        });

        this.guideContainer.add(closeBtn);
    }

    destroyGuideOverlay() {
        if (this.guideContainer) {
            this.guideContainer.destroy();
            this.guideContainer = null;
        }
        // Hiện lại nút ? nếu đang ở trạng thái chờ
        if (this.helpBtn) {
            this.helpBtn.setVisible(true);
        } else {
            // Nếu chưa có nút ? thì tạo mới (trường hợp lần đầu đóng guide)
            this.showHelpButton();
        }
    }
}
