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

        this.podiumContainer = null;
        this.guideContainer = null;
        this.helpBtn = null;
        this.hostLeaderboardDom = null;

        this.progressBarContainer = null;
        this.progressBarFill = null;
        this.progressText = null;

        this._ratioInputY = 0.45;
        this._ratioCountdownY = 0.35;
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

        // 1. Input Forms
        if (this.playerNameDom) {
            this.playerNameDom.setPosition(cx, inputY);
            this.playerNameDom.setScale(clampedScale);
        }
        if (this.hostPassDom) {
            this.hostPassDom.setPosition(cx, inputY);
            this.hostPassDom.setScale(clampedScale);
        }

        // 2. Waiting & Start
        if (this.waitingText) {
            this.waitingText.setPosition(cx, inputY);
            this.waitingText.setFontSize(Math.round(28 * clampedScale));
        }
        if (this.startButton) {
            this.startButton.setPosition(cx, inputY);
            this.startButton.setScale(clampedScale);
        }
        if (this.countdownText) {
            this.countdownText.setPosition(cx, countdownY);
            this.countdownText.setFontSize(Math.round(96 * clampedScale));
        }

        // 3. Leaderboard (DOM)
        if (this.hostLeaderboardDom) {
            this.hostLeaderboardDom.setPosition(w - 20, 20);
            this.hostLeaderboardDom.setOrigin(1, 0);
            // DOM scale CSS handles itself mostly, or we can transform scale
            this.hostLeaderboardDom.setScale(clampedScale);
        }

        // --- [NEW] Cập nhật vị trí và scale cho Podium ---
        if (this.podiumContainer) {
            this.podiumContainer.setPosition(cx, cy);
            this.podiumContainer.setScale(clampedScale * 0.7);
            // Overlay bên trong podiumContainer đã được vẽ w*2, h*2 nên không cần resize lại
        }

        // --- [NEW] Cập nhật vị trí và scale cho Guide Overlay ---
        if (this.guideContainer) {
            this.guideContainer.setPosition(cx, cy);
            this.guideContainer.setScale(clampedScale);
        }

        // --- [NEW] Cập nhật scale cho nút Help ---
        if (this.helpBtn) {
            this.helpBtn.setScale(clampedScale);
            // Vị trí cố định góc trái, chỉ cần scale
        }

        // Finish Rank Text
        if (this.finishRankText) {
            this.finishRankText.setPosition(cx, cy - 100 * clampedScale);
            this.finishRankText.setScale(clampedScale);
        }

        if (this.progressBarContainer) {
            // Đặt ở vị trí 90% chiều cao màn hình
            this.progressBarContainer.setPosition(cx, h * 0.9);
            this.progressBarContainer.setScale(clampedScale);
        }
    }

    isWinnerOpen() {
        return !!this.podiumContainer;
    }

    showPlayerNameInput(onJoin) {
        window.isInputActive = true;

        const { cx, cy } = this._getLayout();
        const textStyle = "color:#5dfc9b;font-family:monospace;font-size:32px;margin-bottom:10px; font-weight:bold; text-shadow: 2px 0 #000, -2px 0 #000, 0 2px #000, 0 -2px #000, 1px 1px #000, -1px -1px #000, 1px -1px #000, -1px 1px #000;";
        const dom = this.scene.add.dom(cx, cy).createFromHTML(`
      <div style="text-align:center">
        <div style="${textStyle}">ENTER NAME</div>
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
        window.isInputActive = false;

        if (this.playerNameDom) {
            this.playerNameDom.destroy();
            this.playerNameDom = null;
        }

        if (document.activeElement) document.activeElement.blur();
        window.focus();
    }

    showHostPasswordInput(onConfirm) {
        window.isInputActive = true;

        const { cx } = this._getLayout();
        const textStyle = "color:#ff1744;font-family:monospace;font-size:20px;margin-bottom:10px; font-weight:bold; text-shadow: 2px 0 #000, -2px 0 #000, 0 2px #000, 0 -2px #000, 1px 1px #000, -1px -1px #000, 1px -1px #000, -1px 1px #000;";
        const dom = this.scene.add.dom(cx, 300).createFromHTML(`
      <div style="text-align:center">
        <div style="${textStyle}">HOST ACCESS</div>
        <input id="hostPass" type="password" style="${PIXEL_INPUT_STYLE}" />
        <br/><br/>
        <button id="hostBtn" style="${PIXEL_BTN_STYLE}">CONFIRM</button>
        <div id="error" style="color:#ff1744;font-family:monospace;font-size:14px;margin-top:8px;display:none">INVALID PASSWORD</div>
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
        window.isInputActive = false;

        if (this.hostPassDom) {
            this.hostPassDom.destroy();
            this.hostPassDom = null;
            window.scrollTo(0, 0);
        }

        if (document.activeElement) document.activeElement.blur();
        window.focus();
    }

    showWaitingText() {
        if (this.waitingText) return;
        const { cx } = this._getLayout();
        this.waitingText = this.scene.add.text(cx, 300, 'Waiting to start...', {
            fontSize: '28px',
            fontFamily: 'monospace',
            color: '#ffffff',
            stroke: '#000000',    // Màu viền đen
            strokeThickness: 6    // Độ dày viền
        })
            .setOrigin(0.5).setDepth(DEPTH.UI);
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
            fontSize: '40px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff'
        }).setOrigin(0.5);
        this.startButton = this.scene.add.container(cx, 300, [btnBg, btnText])
            .setScrollFactor(0).setSize(200, 80).setInteractive({ useHandCursor: true }).setDepth(DEPTH.UI);
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
        this.destroyPodium();
        this.updateProgressBar(0);

        if (this.countdownTimer) {
            this.scene.time.removeEvent(this.countdownTimer);
            this.countdownTimer = null;
        }
        if (this.countdownText) {
            this.countdownText.destroy();
            this.countdownText = null;
        }

        this.destroyToast();
    }

    startCountdown() {
        this.state.isCountdownRunning = true;
        let timeLeft = GAME_SETTINGS.COUNTDOWN_TIME || 3;

        // [FIX 1] Hủy Timer cũ nếu nó đang chạy
        // Nếu không hủy, timer cũ sẽ cố update text cũ -> Lỗi glTexture
        if (this.countdownTimer) {
            this.scene.time.removeEvent(this.countdownTimer);
            this.countdownTimer = null;
        }

        // [FIX 2] Hủy Text cũ
        if (this.countdownText) {
            this.countdownText.destroy();
            this.countdownText = null;
        }

        const { cx } = this._getLayout();
        const txt = this.scene.add.text(cx, 200, timeLeft.toString(), {
            fontSize: '96px',
            fontStyle: 'bold',
            color: '#ff1744',
            stroke: '#000000',
            strokeThickness: 8
        })
            .setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.OVERLAY);

        this.countdownText = txt;
        this.layout();

        // [FIX 3] Gán Timer vào biến this.countdownTimer để quản lý
        this.countdownTimer = this.scene.time.addEvent({
            delay: 1000,
            repeat: timeLeft,
            callback: () => {
                // [FIX 4] Kiểm tra sống còn: Nếu Text đã bị destroy thì DỪNG NGAY
                if (!this.countdownText || !this.countdownText.scene) {
                    return;
                }

                timeLeft--;
                if (timeLeft > 0) {
                    txt.setText(timeLeft.toString());
                    return;
                }

                txt.setText('GO!');
                this.state.isRaceStarted = true;
                this.state.isCountdownRunning = false;

                this.scene.time.delayedCall(800, () => {
                    // Kiểm tra lại lần nữa trước khi destroy
                    if (this.countdownText && this.countdownText.scene) {
                        this.countdownText.destroy();
                        this.countdownText = null;
                    }
                });
            }
        });
    }

    showLeaderboard(role) {
        if (this.hostLeaderboardDom) return;

        // Chỉ hiển thị nút restart nếu là HOST
        const restartBtnHTML = (role === 'host')
            ? `<button id="restartBtn" style="${REFRESH_BTN_STYLE}" title="Reset Race">↻</button>`
            : '';

        this.hostLeaderboardDom = this.scene.add.dom(0, 0).createFromHTML(`
        <div id="unified-leaderboard" style="${LEADERBOARD_CONTAINER_STYLE}">
            <div style="display: flex; justify-content: center; align-items: center; border-bottom: 2px solid #ffeb3b; margin-bottom: 10px; padding-bottom: 5px;">
                <h2 style="color:#ffeb3b; margin:0; font-size:18px; font-family: 'Courier New', monospace;">LEADERBOARD</h2>
                ${restartBtnHTML} 
            </div>
            <div id="leaderboard-list"></div>
        </div>
        `).setScrollFactor(0).setDepth(DEPTH.UI); // Đảm bảo ngang hàng UI

        // Chỉ bắt sự kiện click nếu là host (vì player không có nút này)
        if (role === 'host') {
            this.hostLeaderboardDom.addListener('click');
            this.hostLeaderboardDom.on('click', (e) => {
                if (e.target.id === 'restartBtn') {
                    e.target.style.transform = 'rotate(180deg)';
                    setTimeout(() => { e.target.style.transform = 'rotate(0deg)'; }, 200);
                    this.scene.events.emit('restartRequested');
                }
            });
        }

        if (role === 'player') {
            this.showProgressBar();
        }

        this.layout();
    }

    updateLeaderboard(sortedPlayers) {
        if (!this.hostLeaderboardDom) return;

        const listContainer = this.hostLeaderboardDom.getChildByID('leaderboard-list');
        if (!listContainer) return;

        const topCount = 10;
        const topList = sortedPlayers.slice(0, topCount);

        const totalPlayers = sortedPlayers.length;
        const hiddenCount = totalPlayers - topCount;

        let htmlContent = topList.map((player, index) => {
            const timeText = player.finishTime
                ? `<span style="color:#ffeb3b; font-size:12px;">${player.finishTime}s</span>`
                : '';

            const isFirst = index === 0;
            // Highlight tên mình
            const isMe = (player.id === this.scene.network?.socket?.id);
            const nameColor = isFirst ? '#ffeb3b' : (isMe ? '#ffffff' : '#5dfc9b');
            const rowStyle = isMe ? 'font-weight:bold; background:rgba(255,255,255,0.1);' : '';

            // Rank hiển thị: Nếu đã về đích dùng rank thật, chưa về đích dùng index tạm thời
            const displayRank = (player.rank !== Infinity) ? player.rank : (index + 1);

            return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; font-size: 14px; color: ${nameColor}; ${rowStyle}">
                <span>#${displayRank} ${player.name.substring(0, 8)}</span>
                ${timeText}
            </div>
        `;
        }).join('');

        if (hiddenCount > 0) {
            htmlContent += `
                <div style="display: flex; justify-content: center; align-items: center; margin-top: 8px; padding-top: 4px; border-top: 1px dashed rgba(93, 252, 155, 0.3); font-size: 12px; color: #5dfc9b; opacity: 0.8; font-style: italic;">
                    + ${hiddenCount} others
                </div>
            `;
        }

        listContainer.innerHTML = htmlContent;
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
                color: '#5dfc9b',    // Màu xanh sáng (giống khung nhập tên)
                align: 'center',
                fontStyle: 'bold',
                stroke: '#000000',   // Viền đen
                strokeThickness: 6   // Độ dày viền
            }
        ).setOrigin(0.5).setDepth(DEPTH.UI).setScrollFactor(0);
        this.layout();
    }

    showPodium(top3Data) {
        this.clearAllDomElements();
        this.destroyWinner();
        if (this.hostLeaderboardDom) {
            this.hostLeaderboardDom.destroy();
            this.hostLeaderboardDom = null;
        }
        if (this.podiumContainer) this.podiumContainer.destroy();

        const { w, h, cx, cy } = this._getLayout();

        this.podiumContainer = this.scene.add.container(cx, cy)
            .setDepth(DEPTH.OVERLAY)
            .setScrollFactor(0);

        const overlay = this.scene.add.rectangle(0, 0, w * 4, h * 4, 0x000000, 0.85);
        overlay.setInteractive();
        this.podiumContainer.add(overlay);

        let titleY = -220;
        const titleText = this.scene.add.text(0, titleY, "VICTORY", {
            fontFamily: 'monospace', fontSize: '60px', color: '#ffeb3b', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.podiumContainer.add(titleText);

        const podiumConfig = [
            { rank: 2, dataIdx: 1, x: -200, y: 50, height: 150, color: 0xC0C0C0 },
            { rank: 1, dataIdx: 0, x: 0, y: -20, height: 220, color: 0xFFD700 },
            { rank: 3, dataIdx: 2, x: 200, y: 80, height: 100, color: 0xCD7F32 }
        ];

        podiumConfig.forEach(cfg => {
            const playerData = top3Data[cfg.dataIdx];
            if (!playerData) return;
            const box = this.scene.add.graphics();
            box.fillStyle(cfg.color, 1);
            box.lineStyle(4, 0xffffff, 1);
            box.fillRect(cfg.x - 70, cfg.y, 140, cfg.height);
            box.strokeRect(cfg.x - 70, cfg.y, 140, cfg.height);
            this.podiumContainer.add(box);
            const rankTxt = this.scene.add.text(cfg.x, cfg.y + 40, `#${cfg.rank}`, {
                fontSize: '40px', fontFamily: 'monospace', color: '#000000', fontStyle: 'bold'
            }).setOrigin(0.5);
            this.podiumContainer.add(rankTxt);
            const horseSprite = this.scene.add.sprite(cfg.x, cfg.y - 60, 'idle');
            horseSprite.setScale(0.6);
            if (playerData.horseColor) horseSprite.setTint(playerData.horseColor);
            horseSprite.play('horse_idle');
            this.podiumContainer.add(horseSprite);
            const nameTxt = this.scene.add.text(cfg.x, cfg.y - 150, playerData.name, {
                fontSize: '24px', fontFamily: 'monospace', color: '#ffffff', fontStyle: 'bold',
                backgroundColor: '#000000aa', padding: { x: 8, y: 4 }
            }).setOrigin(0.5);
            this.podiumContainer.add(nameTxt);
            const timeTxt = this.scene.add.text(cfg.x, cfg.y + cfg.height + 25, `${playerData.finishTime}s`, {
                fontSize: '20px', fontFamily: 'monospace', color: '#ffff00', fontStyle: 'bold'
            }).setOrigin(0.5);
            this.podiumContainer.add(timeTxt);
        });

        if (this.state.role === 'host') {
            const btnContainer = this.createPhaserButton(0, 270, "PLAY AGAIN", () => {
                this.scene.events.emit('restartRequested');
            });
            this.podiumContainer.add(btnContainer);
        }

        this.layout();
    }

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
        container.setScrollFactor(0);
        container.setInteractive(new Phaser.Geom.Rectangle(-80, -25, 160, 50), Phaser.Geom.Rectangle.Contains);
        container.on('pointerdown', () => { container.setScale(0.95); });
        container.on('pointerout', () => { container.setScale(1); });
        container.on('pointerup', () => { container.setScale(1); callback(); });
        return container;
    }

    destroyPodium() {
        if (this.podiumContainer) {
            this.podiumContainer.setVisible(false);
            this.podiumContainer.destroy();
            this.podiumContainer = null;
        }
    }

    showHelpButton() {
        if (this.helpBtn) return;
        const x = 40;
        const y = 40;
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.5);
        bg.lineStyle(2, 0xffffff, 0.6);
        bg.fillCircle(0, 0, 18);
        bg.strokeCircle(0, 0, 18);
        const text = this.scene.add.text(0, 0, '?', {
            fontSize: '22px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff'
        }).setOrigin(0.5);
        this.helpBtn = this.scene.add.container(x, y, [bg, text])
            .setScrollFactor(0).setDepth(DEPTH.UI)
            .setInteractive(new Phaser.Geom.Circle(0, 0, 20), Phaser.Geom.Circle.Contains);
        this.helpBtn.on('pointerdown', () => { this.helpBtn.setScale(0.9); });
        this.helpBtn.on('pointerup', () => { this.helpBtn.setScale(1); this.showGuideOverlay(); });

        // [SỬA ĐỔI] Gọi layout để scale nút help nếu cần
        this.layout();
    }

    destroyHelpButton() {
        if (this.helpBtn) {
            this.helpBtn.destroy();
            this.helpBtn = null;
        }
    }

    showGuideOverlay() {
        if (this.guideContainer) return;
        if (this.helpBtn) this.helpBtn.setVisible(false);

        const { w, h, cx, cy } = this._getLayout();

        // [SỬA ĐỔI] Tạo container mà không set scale ở đây
        this.guideContainer = this.scene.add.container(cx, cy)
            .setDepth(DEPTH.OVERLAY)
            .setScrollFactor(0);

        const overlay = this.scene.add.rectangle(0, 0, w * 4, h * 4, 0x000000, 0.85);
        overlay.setInteractive();
        this.guideContainer.add(overlay);

        const bgWidth = 500;
        const bgHeight = 350;
        const panel = this.scene.add.graphics();
        panel.fillStyle(0x111111, 1);
        panel.lineStyle(4, 0x5dfc9b, 1);
        panel.fillRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 10);
        panel.strokeRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 10);
        this.guideContainer.add(panel);

        const title = this.scene.add.text(0, -120, "HOW TO PLAY", {
            fontSize: '40px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffeb3b'
        }).setOrigin(0.5);

        const guideText = "TAP screen repeatedly\n\n" + "Run fast to win!";
        const content = this.scene.add.text(0, 0, guideText, {
            fontSize: '24px', fontFamily: 'monospace', color: '#ffffff', align: 'center', lineHeight: 40
        }).setOrigin(0.5);

        this.guideContainer.add([title, content]);

        const closeBtn = this.scene.add.container(bgWidth / 2 - 30, -bgHeight / 2 + 30);
        const closeBg = this.scene.add.graphics();
        closeBg.fillStyle(0xff1744, 1);
        closeBg.fillCircle(0, 0, 20);
        const closeTxt = this.scene.add.text(0, 0, 'X', {
            fontSize: '24px', fontFamily: 'monospace', fontStyle: 'bold'
        }).setOrigin(0.5);
        closeBtn.add([closeBg, closeTxt]);
        closeBtn.setInteractive(new Phaser.Geom.Circle(0, 0, 35), Phaser.Geom.Circle.Contains);
        closeBtn.on('pointerdown', () => { this.destroyGuideOverlay(); });
        this.guideContainer.add(closeBtn);

        // [SỬA ĐỔI] Gọi layout để áp dụng scale
        this.layout();
    }

    destroyGuideOverlay() {
        if (this.guideContainer) {
            this.guideContainer.destroy();
            this.guideContainer = null;
        }
        if (this.helpBtn) {
            this.helpBtn.setVisible(true);
        } else {
            this.showHelpButton();
        }
    }

    showProgressBar() {
        if (this.progressBarContainer) return;

        const width = 400;
        const height = 30; // --- SỬA: Tăng chiều cao lên 30 để chứa vừa chữ
        const borderColor = 0x5dfc9b;
        const bgColor = 0x003b1f;

        this.progressBarContainer = this.scene.add.container(0, 0).setDepth(DEPTH.UI).setScrollFactor(0);

        // 1. Vẽ khung nền
        const bg = this.scene.add.graphics();
        bg.fillStyle(bgColor, 1);
        bg.lineStyle(2, borderColor, 1);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, 10);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);

        // 2. Vẽ thanh fill
        this.progressBarFill = this.scene.add.graphics();
        this.progressBarFill.defaultWidth = width - 4;
        this.progressBarFill.defaultHeight = height - 4;
        this.progressBarFill.defaultX = -width / 2 + 2;
        this.progressBarFill.defaultY = -height / 2 + 2;

        // --- SỬA: Đưa text vào giữa (y=0) và chỉnh lại size ---
        this.progressText = this.scene.add.text(0, 0, '0%', {
            fontSize: '18px', // Size 18 nhìn sẽ cân đối trong thanh cao 30
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000', // Viền đen giúp chữ nổi bật trên nền vàng/xanh
            strokeThickness: 4
        }).setOrigin(0.5); // Canh giữa tâm
        // -----------------------------------------------------

        // Vẽ trạng thái ban đầu
        this.updateProgressBar(0);

        // Quan trọng: Add text vào SAU CÙNG để nó nằm đè lên trên thanh fill màu vàng
        this.progressBarContainer.add([bg, this.progressBarFill, this.progressText]);

        this.layout();
    }

    // [THÊM MỚI] Hàm cập nhật giá trị (0.0 -> 1.0)
    updateProgressBar(percent) {
        if (!this.progressBarContainer || !this.progressBarFill || !this.progressBarFill.scene) return;

        // Clamp giá trị từ 0 đến 1
        const p = Phaser.Math.Clamp(percent, 0, 1);

        this.progressBarFill.clear();
        this.progressBarFill.fillStyle(0xffeb3b, 1); // Màu vàng

        // Tính chiều rộng dựa trên %
        const currentW = this.progressBarFill.defaultWidth * p;

        // Vẽ hình chữ nhật bo góc
        if (currentW > 0) {
            this.progressBarFill.fillRoundedRect(
                this.progressBarFill.defaultX,
                this.progressBarFill.defaultY,
                currentW,
                this.progressBarFill.defaultHeight,
                4
            );
        }

        // --- THÊM MỚI: Cập nhật nội dung text ---
        if (this.progressText) {
            const displayPercent = Math.floor(p * 100);
            this.progressText.setText(`${displayPercent}%`);
        }
        // ---------------------------------------
    }

    showToast(message, isError = true) {
        // 1. Xóa toast cũ nếu đang hiện (để tránh chồng chéo)
        this.destroyToast();

        const { cx, cy, h } = this._getLayout();

        // Vị trí: Cách cạnh trên 15% (dưới thanh Progress Bar một chút)
        const yPos = h * 0.15;

        // 2. Tạo Container
        this.toastContainer = this.scene.add.container(cx, yPos)
            .setDepth(DEPTH.OVERLAY + 10) // Đảm bảo nổi lên trên cùng (hơn cả Overlay)
            .setScrollFactor(0)
            .setAlpha(0); // Bắt đầu ẩn để fade-in

        // 3. Cấu hình màu sắc
        // Lỗi/Cảnh báo: Nền Đỏ, Chữ Trắng, Viền Vàng
        // Thông báo thường: Nền Đen, Chữ Xanh, Viền Xanh
        const bgColor = isError ? 0xff1744 : 0x000000;
        const strokeColor = isError ? 0xffeb3b : 0x5dfc9b;
        const textColor = '#ffffff';

        // 4. Tạo Text trước để đo kích thước
        const textObj = this.scene.add.text(0, 0, message, {
            fontSize: '24px',
            fontFamily: 'monospace',
            fontStyle: 'bold',
            color: textColor,
            align: 'center',
            wordWrap: { width: 400 } // Tự xuống dòng nếu quá dài
        }).setOrigin(0.5);

        // 5. Vẽ khung nền dựa trên kích thước text
        const padding = 20;
        const bgW = textObj.width + padding * 2;
        const bgH = textObj.height + padding * 1.5;

        const bg = this.scene.add.graphics();
        bg.fillStyle(bgColor, 0.95);
        bg.lineStyle(3, strokeColor, 1);
        bg.fillRoundedRect(-bgW / 2, -bgH / 2, bgW, bgH, 8);
        bg.strokeRoundedRect(-bgW / 2, -bgH / 2, bgW, bgH, 8);

        // 6. Thêm icon cảnh báo (nếu là lỗi)
        if (isError) {
            const icon = this.scene.add.text(-bgW / 2 + 15, -2, "⚠️", { fontSize: '20px' }).setOrigin(0.5);
            this.toastContainer.add(icon);
        }

        // Add vào container
        this.toastContainer.add([bg, textObj]);

        // 7. Hiệu ứng xuất hiện (Tween)
        this.scene.tweens.add({
            targets: this.toastContainer,
            alpha: 1,
            y: yPos + 20, // Trượt nhẹ xuống
            scale: { from: 0.8, to: 1 }, // Phóng to nhẹ
            duration: 300,
            ease: 'Back.out'
        });

        // 8. Tự động tắt sau 3 giây (hoặc 5 giây nếu là lỗi dài)
        const duration = isError ? 4000 : 2500;
        this.toastTimer = this.scene.time.delayedCall(duration, () => {
            this.hideToast();
        });
    }

    hideToast() {
        if (!this.toastContainer) return;

        // Hiệu ứng biến mất
        this.scene.tweens.add({
            targets: this.toastContainer,
            alpha: 0,
            y: this.toastContainer.y - 20, // Bay lên
            duration: 300,
            onComplete: () => {
                this.destroyToast();
            }
        });
    }

    destroyToast() {
        if (this.toastTimer) {
            this.scene.time.removeEvent(this.toastTimer);
            this.toastTimer = null;
        }
        if (this.toastContainer) {
            this.toastContainer.destroy();
            this.toastContainer = null;
        }
    }
}