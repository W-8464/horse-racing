import { DEPTH } from '../config/config.js';

export default class Horse extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, id, color, name = '') {
        super(scene, x, y, texture);
        this.textureKey = texture;
        this.playerId = id;
        this.baseColor = color;
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setScale(0.25);
        this.setCollideWorldBounds(true);
        this.setTint(this.baseColor);
        this.setDepth(DEPTH.HORSE);

        this.nameText = scene.add.text(
            x,
            y - 40,
            name,
            {
                fontFamily: 'monospace',
                fontSize: '14px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 3
            }
        )
            .setOrigin(0.5)
            .setDepth(DEPTH.UI);
    }

    preUpdate(time, delta) {
        super.preUpdate(time, delta);
        if (this.nameText) {
            this.nameText.setPosition(this.x, this.y - 40);
        }
    }

    destroy(fromScene) {
        if (this.nameText) {
            this.nameText.destroy();
            this.nameText = null;
        }
        super.destroy(fromScene);
    }

    playRun() {
        this.play(`${this.textureKey}_run`, true);

        if (this.idleTimer) this.idleTimer.remove();
        // this.idleTimer = this.scene.time.delayedCall(500, () => {
        //     if (this.active) this.play(`idle_${this.textureKey}`, true);
        // });
    }

    resetColor() {
        this.setTint(this.baseColor);
    }
}