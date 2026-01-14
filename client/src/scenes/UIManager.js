import { GAME_SETTINGS, DEPTH } from '../config/config.js';

const PIXEL_INPUT_STYLE = `
  background: #111;
  color: #5dfc9b;
  border: 3px solid #5dfc9b;
  font-family: monospace;
  font-size: 18px;
  padding: 8px;
  outline: none;
  box-shadow: 0 0 0 3px #003b1f inset;
  appearance: none;
  -webkit-appearance: none;
`;

const PIXEL_BTN_STYLE = `
  background: #003b1f;
  color: #5dfc9b;
  border: 3px solid #5dfc9b;
  font-family: monospace;
  font-size: 18px;
  padding: 8px 20px;
  cursor: pointer;
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

        this.winnerOverlay = null;
        this.winnerContainer = null;
    }

    isWinnerOpen() {
        return !!(this.winnerOverlay || this.winnerContainer);
    }

    showModeSelection({ onPlayer, onHost }) {
        const cx = this.scene.cameras.main.centerX;

        this.playerBtn = this.scene.add.text(cx, 260, 'PLAYER', { fontSize: '32px' })
            .setOrigin(0.5).setDepth(DEPTH.UI).setInteractive();

        this.hostBtn = this.scene.add.text(cx, 320, 'HOST', { fontSize: '32px' })
            .setOrigin(0.5).setDepth(DEPTH.UI).setInteractive();

        this.playerBtn.on('pointerdown', () => {
            this.destroyModeSelection();
            onPlayer?.();
        });

        this.hostBtn.on('pointerdown', () => {
            this.destroyModeSelection();
            onHost?.();
        });
    }

    destroyModeSelection() {
        if (this.playerBtn) { this.playerBtn.destroy(); this.playerBtn = null; }
        if (this.hostBtn) { this.hostBtn.destroy(); this.hostBtn = null; }
    }

    showPlayerNameInput(onJoin) {
        const cx = this.scene.cameras.main.centerX;

        const dom = this.scene.add.dom(cx, 300).createFromHTML(`
      <div style="text-align:center">
        <div style="color:#5dfc9b;font-family:monospace;font-size:20px;margin-bottom:10px">
          ENTER NAME
        </div>
        <input id="playerName" type="text" style="${PIXEL_INPUT_STYLE}" />
        <br/><br/>
        <button id="joinBtn" style="${PIXEL_BTN_STYLE}">JOIN</button>
      </div>
    `).setDepth(DEPTH.UI).setScrollFactor(0);

        this.playerNameDom = dom;

        dom.addListener('click');
        dom.on('click', (e) => {
            if (e.target.id !== 'joinBtn') return;

            const name = dom.getChildByID('playerName').value.trim();
            if (!name) return;

            this.destroyPlayerNameInput();
            window.scrollTo(0, 0);
            onJoin?.(name);
        });
    }

    destroyPlayerNameInput() {
        if (this.playerNameDom) {
            this.playerNameDom.destroy();
            this.playerNameDom = null;
        }
    }

    showHostPasswordInput(onConfirm) {
        const cx = this.scene.cameras.main.centerX;

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

        this.waitingText = this.scene.add.text(
            this.scene.cameras.main.centerX,
            300,
            'Waiting to start...',
            { fontSize: '28px', fontFamily: 'monospace', color: '#ffffff' }
        ).setOrigin(0.5).setDepth(DEPTH.UI);
    }

    destroyWaitingText() {
        if (this.waitingText) {
            this.waitingText.destroy();
            this.waitingText = null;
        }
    }

    showStartButton(onStart) {
        if (this.startButton) return;

        const { centerX } = this.scene.cameras.main;

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

        this.startButton = this.scene.add.container(centerX, 300, [btnBg, btnText])
            .setScrollFactor(0)
            .setSize(200, 80)
            .setInteractive({ useHandCursor: true })
            .setDepth(DEPTH.UI);

        this.startButton.on('pointerdown', () => onStart?.());
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
        // dọn sạch UI “trước khi đếm ngược”
        this.clearAllDomElements();

        this.destroyModeSelection();
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

        const txt = this.scene.add.text(
            this.scene.cameras.main.centerX,
            200,
            timeLeft.toString(),
            { fontSize: '96px', fontStyle: 'bold', color: '#ff1744' }
        ).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.UI);

        this.countdownText = txt;

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
        if (this.winnerContainer) {
            this.winnerContainer.destroy();
            this.winnerContainer = null;
        }
        if (this.winnerOverlay) {
            this.winnerOverlay.destroy();
            this.winnerOverlay = null;
        }
    }

    showWinnerBanner(data) {
        const { winnerName, top10 } = data; // Nhận dữ liệu từ server
        const cx = this.scene.cameras.main.centerX;
        const cy = this.scene.cameras.main.centerY;

        this.destroyWinner();

        // Tạo lớp phủ nền tối
        this.winnerOverlay = this.scene.add.rectangle(
            cx, cy,
            this.scene.cameras.main.width,
            this.scene.cameras.main.height,
            0x000000, 0.8
        ).setScrollFactor(0).setDepth(DEPTH.UI);

        // Tạo nội dung danh sách Top 10
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
            <span>#${p.rank} ${p.name.toUpperCase()}</span>
            <span>${p.x}m</span>
        </div>
    `).join('');

        // Hiển thị Popup kết quả
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

        <button id="restartBtn" style="
          background:#5dfc9b; color:#003b1f; border:none;
          padding:12px 30px; font-family:monospace; font-weight:bold;
          font-size:18px; cursor:pointer; width: 100%;
        ">PLAY AGAIN</button>
      </div>
    `).setDepth(DEPTH.UI + 1).setScrollFactor(0);

        // Lắng nghe sự kiện click nút chơi lại
        dom.addListener('click');
        dom.on('click', (e) => {
            if (e.target.id === 'restartBtn') window.location.reload();
        });

        this.winnerContainer = dom;

        // Hiệu ứng hiện ra (Pop-in)
        dom.setScale(0);
        this.scene.tweens.add({
            targets: dom,
            scale: 1,
            duration: 400,
            ease: 'Back.Out'
        });
    }
}
