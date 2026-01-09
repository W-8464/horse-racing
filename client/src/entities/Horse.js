export default class Horse extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, id, color) {
        super(scene, x, y, texture);
        this.textureKey = texture;
        this.playerId = id;
        this.baseColor = color;
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setScale(0.25);
        this.setCollideWorldBounds(true);

        this.setTint(this.baseColor);
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