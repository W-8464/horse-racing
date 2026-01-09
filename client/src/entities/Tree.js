import { DEPTH } from "../config/config.js";

export default class Tree extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, texture) {
        super(scene, x, y, texture);

        scene.add.existing(this);

        this.setOrigin(0.5, 1);
        this.setScale(0.36);
        this.setDepth(DEPTH.TREE);
    }

    playSway() {
        this.play('tree_sway');
    }
}
