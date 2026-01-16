import { DEPTH } from '../config/config.js';

export default class Horse extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, id, color, name = '') {
        super(scene, x, y, texture);
        this.textureKey = texture;
        this.playerId = id;
        this.baseColor = color;
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setScale(0.2);
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
        const key = `${this.textureKey}_run`;
        if (this.scene.anims.exists(key)) this.play(key, true);
        else if (this.scene.anims.exists('horse_run')) this.play('horse_run', true);
    }

    resetColor() {
        this.setTint(this.baseColor);
    }
}