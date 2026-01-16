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
    }

    _getLayout() {
        const w = this.scene.scale.width;
        const h = this.scene.scale.height;
        const cx = w / 2;
        const cy = h / 2;

        const baseW = GAME_SETTINGS.DESIGN_WIDTH;
        const baseH = GAME_SETTINGS.DESIGN_HEIGHT;

        // scale UI nhẹ theo viewport (để màn nhỏ không bị tràn)
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
            if (e.target.id !== 'hostBtn') return;

            const pass = dom.getChildByID('hostPass').value.trim();
            if (!pass) return;

            onConfirm?.(pass);
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

    destroyWinner() {
        if (this.finishRankText) {
            this.finishRankText.destroy();
            this.finishRankText = null;
        }
        if (this.winnerContainer) {
            this.winnerContainer.destroy();
            this.winnerContainer = null;
        }
        if (this.winnerOverlay) {
            this.winnerOverlay.destroy();
            this.winnerOverlay = null;
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

    showWinnerBanner(data) {
        const { top10 } = data;
        const { w, h, cx, cy } = this._getLayout();

        const isHost = this.state.role === 'host';

        this.destroyWinner();

        this.winnerOverlay = this.scene.add.rectangle(
            cx, cy,
            w, h,
            0x000000, 0.8
        ).setScrollFactor(0).setDepth(DEPTH.UI);

        const top10Html = top10.map(p => `
        <div style="
            display: flex; 
            justify-content: space-between; 
            border-bottom: 1px solid #2e7d32; 
            padding: 8px 0; 
            font-size: 16px;
            color: ${p.rank === 1 ? '#ffeb3b' : '#5dfc9b'};
            ${p.rank === 1 ? 'font-weight: bold; text-shadow: 0 0 5px #ffeb3b;' : ''}
        ">
            <span>#${p.rank} ${p.name}</span>
            <span>${p.finishTime}s</span>
        </div>
    `).join('');
        const restartHtml = isHost ? `
        <button id="restartBtn" style="
          background:#5dfc9b; color:#003b1f; border:none;
          padding:12px 30px; font-family:monospace; font-weight:bold;
          font-size:18px; cursor:pointer; width: 100%;
        ">PLAY AGAIN</button>
        ` : `
        <div style="
          color:#5dfc9b;
          font-family:monospace;
          font-size:14px;
          opacity:0.85;
          margin-top:10px;
          text-align:center;
        ">
          Waiting for host to restart...
        </div>
        `;
        const dom = this.scene.add.dom(cx, cy).createFromHTML(`
      <div style="
        background: #003b1f;
        border: 4px solid #5dfc9b;
        padding: 20px 30px;
        text-align: center;
        font-family: 'Courier New', monospace;
        min-width: 320px;
        box-shadow: 0 0 30px rgba(0,0,0,0.8);
      ">
        <h1 style="color:#ffeb3b; margin:0 0 15px 0; font-size:24px; border-bottom: 2px solid #ffeb3b;">
            LEADERBOARD
        </h1>
        
        <div style="max-height: 350px; overflow-y: auto; margin-bottom: 20px; text-align: left; padding-right: 5px;">
            ${top10Html}
        </div>

        ${restartHtml}
      </div>
    `).setDepth(DEPTH.UI + 1).setScrollFactor(0);

        dom.addListener('click');
        dom.on('click', (e) => {
            if (!isHost) return;
            if (e.target && e.target.id === 'restartBtn') this.scene.events.emit('restartRequested');
        });

        this.winnerContainer = dom;

        dom.setScale(0);
        this.scene.tweens.add({
            targets: dom,
            scale: 1,
            duration: 400,
            ease: 'Back.Out'
        });

        this.layout();
    }
}
