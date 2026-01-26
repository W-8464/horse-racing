import { DEPTH } from '../config/config.js';

export default class Horse extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, id, color, name = '', isLocal = false) {
        super(scene, x, y, texture);
        this.textureKey = texture;
        this.playerId = id;
        this.baseColor = color;
        this.playerName = name;
        this.isLocal = isLocal;

        this._runAnimKey = `${this.textureKey}_run`;
        this._idleAnimKey = `${this.textureKey}_idle`;
        this._runQueue = 0;
        this._isRunPlaying = false;

        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setScale(0.25);
        this.setCollideWorldBounds(true);
        this.setTint(this.baseColor);
        this.setDepth(DEPTH.HORSE);

        const nameColor = isLocal ? '#ff0000' : '#ffffff';
        const displayName = isLocal ? `⭐ ${name}` : name;
        this.nameText = scene.add.text(
            x,
            y - 40,
            displayName,
            {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: nameColor,
                stroke: '#000000',
                strokeThickness: 3
            }
        )
            .setOrigin(0.5)
            .setDepth(DEPTH.UI);

        this._onAnimComplete = (anim) => {
            const key = anim?.key;
            if (key !== this._runAnimKey && key !== 'horse_run') return;

            this._isRunPlaying = false;

            if (this._runQueue > 0) this._playNextRun();
            else this.playIdle();
        };

        this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this._onAnimComplete);
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (this.nameText) {
            this.nameText.setPosition(this.x, this.y - 40);
        }
    }

    destroy(fromScene) {
        this.off(Phaser.Animations.Events.ANIMATION_COMPLETE, this._onAnimComplete);
        this._onAnimComplete = null;

        if (this.nameText) {
            this.nameText.destroy();
            this.nameText = null;
        }
        super.destroy(fromScene);
    }

    requestRun(cap = 1) {
        const safeCap = Math.max(0, cap | 0);
        if (safeCap === 0) return;

        this._runQueue = Math.min(this._runQueue + 1, safeCap);
        if (!this._isRunPlaying) this._playNextRun();
    }

    _playNextRun() {
        if (this._runQueue <= 0) {
            this._isRunPlaying = false;
            this.playIdle();
            return;
        }

        this._runQueue--;
        this._isRunPlaying = true;

        const key = this.scene?.anims?.exists(this._runAnimKey)
            ? this._runAnimKey
            : this.scene?.anims?.exists('horse_run')
                ? 'horse_run'
                : null;

        if (!key) return;

        this.play(key, true);
    }

    playIdle() {
        const key = this.scene?.anims?.exists(this._idleAnimKey)
            ? this._idleAnimKey
            : this.scene?.anims?.exists('horse_idle')
                ? 'horse_idle'
                : null;

        if (!key) return;

        this._isRunPlaying = false;
        this._runQueue = 0;
        this.play(key, true);
    }

    playRun() {
        this.requestRun(1);
    }

    resetColor() {
        this.setTint(this.baseColor);
    }
}