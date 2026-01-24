import { DEPTH } from '../config/config.js';

export default class FlashSkillManager {
    constructor(scene, state, players, network) {
        this.scene = scene;
        this.state = state;
        this.players = players;
        this.network = network;

        this.clickCount = 0;
        //this.flashButton = null;
    }

    reset() {
        this.clickCount = 0;
        // if (this.flashButton) {
        //     this.flashButton.destroy(true);
        //     this.flashButton = null;
        // }
    }

    registerNormalClick() {
        this.clickCount++;
        // if (this.clickCount >= 10 && !this.flashButton) {
        //     this.createFlashButton();
        // }
        if (this.clickCount >= 20) {
            this.useFlashSkill();
        }
    }

    isPointerOnButton(pointer) {
        // return !!(this.flashButton && this.flashButton.getBounds().contains(pointer.x, pointer.y));
        return false;
    }

    // createFlashButton() {
    //     const x = this.scene.cameras.main.width - 80;
    //     const y = this.scene.cameras.main.height - 80;
    //     const radius = 40;

    //     const btnIcon = this.scene.add.image(0, 0, 'flash_icon');
    //     btnIcon.setDisplaySize(radius * 2, radius * 2);

    //     const btnBorder = this.scene.add.graphics();
    //     btnBorder.lineStyle(4, 0xffffff, 1);
    //     btnBorder.strokeCircle(0, 0, radius);

    //     this.flashButton = this.scene.add.container(x, y, [btnIcon, btnBorder])
    //         .setScrollFactor(0)
    //         .setSize(radius * 2, radius * 2)
    //         .setInteractive({ useHandCursor: true })
    //         .setDepth(DEPTH.UI);

    //     this.flashButton.on('pointerdown', () => {
    //         this.flashButton.setScale(0.9);
    //         this.useFlashSkill();
    //     });

    //     this.flashButton.on('pointerup', () => {
    //         if (this.flashButton) this.flashButton.setScale(1);
    //     });
    // }

    useFlashSkill() {
        const horse = this.players.horse;
        if (!horse) return;

        horse.x += 50;
        this.network.emitMovement(horse.x);

        this.scene.time.delayedCall(500, () => {
            if (horse.resetColor) horse.resetColor();
        });

        this.reset();
    }
}
