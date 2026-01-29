import { GAME_SETTINGS, DEPTH } from '../config/config.js';

// Style mới cho Leaderboard HUD (Góc phải)
const HUD_LEADERBOARD_STYLE = `
    background: rgba(0, 0, 0, 0.6);
    border: 2px solid #5dfc9b;
    border-radius: 8px;
    padding: 10px;
    font-family: 'Courier New', monospace;
    width: 220px;
    pointer-events: auto;
    color: #fff;
    font-size: 14px;
`;

const PIXEL_INPUT_STYLE = `
  background: #111;
  color: #5dfc9b;
  border: 4px solid #5dfc9b;
  font-family: monospace;
  font-size: 20px;
  padding: 8px;
  outline: none;
  box-shadow: 0 0 0 4px #003b1f inset;
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
`;

// Nút Refresh nhỏ gọn cho HUD
const REFRESH_ICON_STYLE = `
    background: none;
    border: none;
    color: #ffeb3b;
    cursor: pointer;
    font-size: 20px;
    padding: 0;
    margin-left: 10px;
    transition: transform 0.3s;
`;

export default class UIManager {
    constructor(scene, state) {
        this.scene = scene;
        this.state = state;

        this.waitingText = null;
        this.startButton = null;
        this.playerNameDom = null;
        this.hostPassDom = null;
        this.countdownText = null;

        // Kết quả
        this.finishRankText = null;
        this.finishStatsText = null;

        // UI In-game
        this.progressGraphics = null;
        this.progressText = null;
        this.leaderboardDom = null; // HUD Leaderboard

        this._ratioInputY = 0.45;
    }

    _getLayout() {
        const w = this.scene.scale.width;
        const h = this.scene.scale.height;
        return { w, h, cx: w / 2, cy: h / 2, s: 1 };
    }

    layout() {
        const { w, h, cx, cy, s } = this._getLayout();
        const inputY = Math.round(h * this._ratioInputY);
        const clampedScale = Math.min(s, h / 500);

        // 1. Inputs
        if (this.playerNameDom) {
            this.playerNameDom.setPosition(cx, inputY);
            this.playerNameDom.setScale(clampedScale);
        }
        if (this.hostPassDom) {
            this.hostPassDom.setPosition(cx, inputY);
            this.hostPassDom.setScale(clampedScale);
        }

        // 2. Center Text
        if (this.waitingText) this.waitingText.setPosition(cx, inputY);
        if (this.countdownText) this.countdownText.setPosition(cx, h * 0.35);
        if (this.startButton) this.startButton.setPosition(cx, h - 80);

        // 3. Leaderboard HUD (Góc trên phải)
        if (this.leaderboardDom) {
            // Cách lề phải 10px, lề trên 10px
            this.leaderboardDom.setPosition(w - 125, 130);
            // Note: DOM origin mặc định là 0.5, 0.5 nên cần tính toán x = w - (width/2) - margin
            // Ở đây width=220 -> w - 110 - 10 = w - 120
        }

        // 4. Progress Text
        if (this.progressText) this.progressText.setPosition(cx, h - 30);

        // 5. Finish Screen
        if (this.finishRankText) this.finishRankText.setPosition(cx, cy - 60);
        if (this.finishStatsText) this.finishStatsText.setPosition(cx, cy + 20);
    }

    // --- CÁC HÀM INPUT GIỮ NGUYÊN (showPlayerNameInput, showHostPasswordInput...) ---
    // (Copy lại y nguyên phần showPlayerNameInput, showHostPasswordInput từ code cũ)

    showPlayerNameInput(onJoin) { /* ... code cũ ... */
        const { cx, cy } = this._getLayout();
        this.playerNameDom = this.scene.add.dom(cx, cy).createFromHTML(`
          <div style="text-align:center">
            <div style="color:#5dfc9b;font-family:monospace;font-size:32px;margin-bottom:10px">ENTER NAME</div>
            <input id="playerName" type="text" style="${PIXEL_INPUT_STYLE}" /><br/><br/>
            <button id="joinBtn" style="${PIXEL_BTN_STYLE}">JOIN</button>
          </div>
        `).setDepth(DEPTH.UI).setScrollFactor(0);
        this.playerNameDom.addListener('click');
        this.playerNameDom.on('click', (e) => {
            if (e.target.id === 'joinBtn') {
                const name = this.playerNameDom.getChildByID('playerName').value.trim();
                if (name) { this.destroyPlayerNameInput(); onJoin?.(name); }
            }
        });
        this.layout();
    }
    destroyPlayerNameInput() { if (this.playerNameDom) { this.playerNameDom.destroy(); this.playerNameDom = null; } }

    showHostPasswordInput(onConfirm) { /* ... code cũ ... */
        const { cx } = this._getLayout();
        this.hostPassDom = this.scene.add.dom(cx, 300).createFromHTML(`
          <div style="text-align:center">
            <div style="color:#ff1744;font-family:monospace;font-size:20px;margin-bottom:10px">HOST ACCESS</div>
            <input id="hostPass" type="password" style="${PIXEL_INPUT_STYLE}" /><br/><br/>
            <button id="hostBtn" style="${PIXEL_BTN_STYLE}">CONFIRM</button>
            <div id="error" style="color:#ff1744;font-family:monospace;font-size:14px;margin-top:8px;display:none">INVALID PASSWORD</div>
          </div>
        `).setDepth(DEPTH.UI).setScrollFactor(0);
        this.hostPassDom.addListener('click');
        this.hostPassDom.on('click', (e) => {
            if (e.target.id === 'hostBtn') {
                const pass = this.hostPassDom.getChildByID('hostPass').value.trim();
                if (pass) onConfirm?.(pass);
            }
        });
        this.layout();
    }
    destroyHostPasswordInput() { if (this.hostPassDom) { this.hostPassDom.destroy(); this.hostPassDom = null; } }
    showHostPasswordError() { if (this.hostPassDom) this.hostPassDom.getChildByID('error').style.display = 'block'; }

    // --- LEADERBOARD DẠNG HUD (CHUNG CHO CẢ HOST & PLAYER) ---
    showHostLeaderboard() {
        // Hàm này giờ chỉ để gọi lần đầu (nếu cần), logic chính nằm ở updateLeaderboardHUD
        this.updateLeaderboardHUD([], 0, true);
    }

    updateLeaderboardHUD(contributors, totalPlayers, isHost) {
        if (!this.leaderboardDom) {
            const { w } = this._getLayout();
            this.leaderboardDom = this.scene.add.dom(w - 120, 130).createFromHTML(`
                <div style="${HUD_LEADERBOARD_STYLE}">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #5dfc9b; padding-bottom: 5px; margin-bottom: 5px;">
                        <span style="color:#ffeb3b; font-weight:bold;">TOP RACERS</span>
                        <div id="host-controls"></div>
                    </div>
                    <div id="lb-list"></div>
                    <div id="lb-footer" style="text-align:center; color:#aaa; font-size:12px; margin-top:5px;"></div>
                </div>
            `).setScrollFactor(0).setDepth(DEPTH.UI);

            this.leaderboardDom.addListener('click');
            this.leaderboardDom.on('click', (e) => {
                const btn = e.target.closest('#restartBtn');
                if (btn) {
                    btn.style.transform = 'rotate(180deg)';
                    setTimeout(() => { btn.style.transform = 'rotate(0deg)'; }, 300);
                    this.scene.events.emit('restartRequested');
                }
            });
        }

        const controlsDiv = this.leaderboardDom.getChildByID('host-controls');
        const listDiv = this.leaderboardDom.getChildByID('lb-list');
        const footerDiv = this.leaderboardDom.getChildByID('lb-footer');

        // 1. Xử lý nút Refresh (Chỉ hiện cho Host)
        if (isHost) {
            if (!controlsDiv.innerHTML.includes('restartBtn')) {
                controlsDiv.innerHTML = `<button id="restartBtn" style="${REFRESH_ICON_STYLE}" title="Restart">↻</button>`;
            }
        } else {
            controlsDiv.innerHTML = ''; // Player không có nút này
        }

        // 2. Render List
        if (!contributors || contributors.length === 0) {
            listDiv.innerHTML = '<div style="text-align:center; color:#888;">Waiting...</div>';
            footerDiv.style.display = 'none';
        } else {
            listDiv.innerHTML = contributors.map((p, i) => {
                let color = i === 0 ? '#ffeb3b' : (i === 1 ? '#c0c0c0' : (i === 2 ? '#cd7f32' : '#fff'));
                return `
                    <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:2px;">
                        <span><span style="color:${color}">${i + 1}.</span> ${p.name}</span>
                        <span style="color:#5dfc9b">${p.taps}</span>
                    </div>
                `;
            }).join('');

            if (totalPlayers > contributors.length) {
                footerDiv.style.display = 'block';
                footerDiv.innerText = `+ ${totalPlayers - contributors.length} others`;
            } else {
                footerDiv.style.display = 'none';
            }
        }

        // Cập nhật vị trí
        this.layout();
    }

    // --- FINISH SCREEN (XỬ LÝ HAPPY NEW YEAR) ---
    showFinishText(rank, taps, isHost) {
        const { cx, cy } = this._getLayout();
        this.destroyWinner();

        // Host: HAPPY NEW YEAR
        if (isHost) {
            this.finishRankText = this.scene.add.text(cx, cy, "HAPPY NEW YEAR\n2026", {
                fontSize: '54px',
                fontFamily: 'monospace',
                color: '#ffeb3b', // Vàng
                align: 'center',
                stroke: '#ff0000', // Viền đỏ cho ra dáng tết
                strokeThickness: 8,
                shadow: { offsetX: 4, offsetY: 4, color: '#000', blur: 4, stroke: true, fill: true }
            }).setOrigin(0.5).setDepth(DEPTH.UI).setScrollFactor(0);
        }
        // Player: Rank & Stats
        else {
            this.finishRankText = this.scene.add.text(cx, cy - 80, "FINISHED!", {
                fontSize: '48px', fontFamily: 'monospace', color: '#5dfc9b', align: 'center', stroke: '#000', strokeThickness: 6
            }).setOrigin(0.5).setDepth(DEPTH.UI).setScrollFactor(0);

            const rankStr = (rank === 1) ? "1st 🏆" : (rank === 2) ? "2nd 🥈" : (rank === 3) ? "3rd 🥉" : `#${rank}`;
            this.finishStatsText = this.scene.add.text(cx, cy, `RANK: ${rankStr}\nTAPS: ${taps}`, {
                fontSize: '32px', fontFamily: 'monospace', color: '#ffeb3b', align: 'center', stroke: '#000', strokeThickness: 4, lineSpacing: 10
            }).setOrigin(0.5, 0).setDepth(DEPTH.UI).setScrollFactor(0);
        }

        if (this.scene.env && this.scene.env.launchFireworks) {
            this.scene.env.launchFireworks();
        }
    }

    // --- CÁC HÀM KHÁC GIỮ NGUYÊN ---
    showWaitingText() { /* ... code cũ ... */
        if (this.waitingText) return;
        const { cx } = this._getLayout();
        this.waitingText = this.scene.add.text(cx, 300, 'Waiting to start...', { fontSize: '28px', fontFamily: 'monospace', color: '#ffffff' }).setOrigin(0.5).setDepth(DEPTH.UI);
        this.layout();
    }
    destroyWaitingText() { if (this.waitingText) { this.waitingText.destroy(); this.waitingText = null; } }

    showStartButton(onStart) { /* ... code cũ ... */
        if (this.startButton) return;
        const { cx, h } = this._getLayout();
        const btnBg = this.scene.add.graphics().fillStyle(0x00c853, 1).lineStyle(4, 0x008a39, 1).fillRoundedRect(-100, -40, 200, 80, 5).strokeRoundedRect(-100, -40, 200, 80, 5).lineStyle(2, 0x5dfc9b, 1).strokeRoundedRect(-94, -34, 188, 68, 3);
        const btnText = this.scene.add.text(0, 0, 'START', { fontSize: '40px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
        this.startButton = this.scene.add.container(cx, h - 80, [btnBg, btnText]).setScrollFactor(0).setSize(200, 80).setInteractive({ useHandCursor: true }).setDepth(DEPTH.UI);
        this.startButton.on('pointerdown', () => onStart?.());
        this.scene.children.bringToTop(this.startButton);
    }
    destroyStartButton() { if (this.startButton) { this.startButton.destroy(true); this.startButton = null; } }

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

        // Không xóa Leaderboard HUD, chỉ ẩn nút Start

        if (this.progressGraphics) this.progressGraphics.clear();
        if (this.progressText) { this.progressText.destroy(); this.progressText = null; }
    }

    startCountdown() { /* ... code cũ ... */
        this.state.isCountdownRunning = true;
        let timeLeft = GAME_SETTINGS.COUNTDOWN_TIME;
        if (this.countdownText) { this.countdownText.destroy(); this.countdownText = null; }
        const { cx } = this._getLayout();
        const txt = this.scene.add.text(cx, 200, timeLeft.toString(), { fontSize: '96px', fontStyle: 'bold', color: '#ff1744' }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI);
        this.countdownText = txt;
        this.layout();
        this.scene.time.addEvent({
            delay: 1000, repeat: timeLeft,
            callback: () => {
                timeLeft--;
                if (timeLeft > 0) { txt.setText(timeLeft.toString()); return; }
                txt.setText('GO!');
                this.state.isRaceStarted = true;
                this.state.isCountdownRunning = false;
                this.scene.time.delayedCall(800, () => { if (this.countdownText) { this.countdownText.destroy(); this.countdownText = null; } });
            }
        });
    }

    updateProgressBar(progress, speed) { /* ... code cũ đã sửa layout % ... */
        if (!this.state.isRaceStarted && !this.state.isFinished) {
            if (this.progressGraphics) {
                this.progressGraphics.clear();
                if (this.progressText) { this.progressText.destroy(); this.progressText = null; }
            }
            return;
        }
        if (!this.progressGraphics) { this.progressGraphics = this.scene.add.graphics().setScrollFactor(0).setDepth(100); }
        this.progressGraphics.clear();
        const { cx, h } = this._getLayout();
        const yPos = h - 30;
        const width = 400; const height = 24; const radius = 12;
        this.progressGraphics.fillStyle(0x3e2723, 1);
        this.progressGraphics.fillRoundedRect(cx - width / 2, yPos - height / 2, width, height, radius);
        this.progressGraphics.lineStyle(2, 0xffeb3b, 0.5);
        this.progressGraphics.strokeRoundedRect(cx - width / 2, yPos - height / 2, width, height, radius);
        if (progress > 0) {
            const fillWidth = Math.max(radius * 2, width * progress);
            if (fillWidth > 0) {
                this.progressGraphics.fillStyle(0xe55031, 1);
                this.progressGraphics.fillRoundedRect(cx - width / 2, yPos - height / 2, fillWidth, height, radius);
            }
        }
        if (!this.progressText) {
            this.progressText = this.scene.add.text(cx, yPos, '', { fontSize: '15px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5, 0.5).setDepth(101).setScrollFactor(0);
        }
        this.progressText.setPosition(cx, yPos);
        const percentage = Math.floor(progress * 100);
        this.progressText.setText(`${percentage}%`);
    }

    destroyWinner() {
        if (this.finishRankText) { this.finishRankText.destroy(); this.finishRankText = null; }
        if (this.finishStatsText) { this.finishStatsText.destroy(); this.finishStatsText = null; }
    }
}