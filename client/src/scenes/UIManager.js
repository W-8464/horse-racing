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

    showPlayerNameInput(onJoin, onHostClick) {
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
            <button id="hostBtn" style="${PIXEL_BTN_STYLE}; background: #444;">HOST</button>
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

            if (e.target.id === 'hostBtn') {
                this.destroyPlayerNameInput();
                onHostClick?.();
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

    showHostPasswordInput(onConfirm, onBackToPlayer) {
        const { cx } = this._getLayout();

        const dom = this.scene.add.dom(cx, 300).createFromHTML(`
      <div style="text-align:center">
        <div style="color:#ff1744;font-family:monospace;font-size:20px;margin-bottom:10px">
          HOST ACCESS
        </div>
        <input id="hostPass" type="password" style="${PIXEL_INPUT_STYLE}" />
        <br/><br/>
        <button id="hostBtn" style="${PIXEL_BTN_STYLE}">CONFIRM</button>
        <button id="backBtn" style="${PIXEL_BTN_STYLE}; background: #444;">PLAYER</button>
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

            if (e.target.id === 'backBtn') {
                this.destroyHostPasswordInput();
                onBackToPlayer?.();
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
}
