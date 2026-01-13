import Horse from '../entities/Horse.js';
import { DEPTH } from '../config/config.js';

export default class PlayerManager {
    constructor(scene, state) {
        this.scene = scene;
        this.state = state;

        this.horse = null;
        this.otherPlayers = null;
    }

    init() {
        this.otherPlayers = this.scene.physics.add.group();
    }

    syncCurrentPlayers(players, myId) {
        Object.keys(players).forEach((id) => {
            if (id === myId) this.addSelf(players[id]);
            else this.addOther(players[id], myId);
        });
    }

    addSelf(playerInfo) {
        if (this.horse) return;
        if (!playerInfo) return;

        this.horse = new Horse(
            this.scene,
            playerInfo.x,
            playerInfo.y,
            'horse',
            playerInfo.id,
            playerInfo.horseColor,
            playerInfo.name
        );

        this.horse.setDepth(DEPTH.HORSE);
        this.horse.play('horse_run');
        this.scene.cameras.main.startFollow(this.horse, true, 0.1, 0.1);
    }

    addOther(playerInfo, myId) {
        if (!playerInfo) return;
        if (playerInfo.id === myId) return;

        const existing = this.otherPlayers.getChildren().find(p => p.playerId === playerInfo.id);
        if (existing) return;

        const other = new Horse(
            this.scene,
            playerInfo.x,
            playerInfo.y,
            'horse',
            playerInfo.id,
            playerInfo.horseColor,
            playerInfo.name
        );

        other.setDepth(DEPTH.HORSE);
        other.play('horse_run');
        this.otherPlayers.add(other);
    }

    // updateOtherPosition(playerInfo) {
    //     const other = this.otherPlayers.getChildren().find(p => p.playerId === playerInfo.id);
    //     if (!other) return;

    //     other.setPosition(playerInfo.x, playerInfo.y);
    //     if (other.playRun) other.playRun();
    // }

    updateAllPositions(networkManager) {
        const state = networkManager.getInterpolatedState();
        if (!state) return;

        const { b0, b1, renderTime } = state;

        // Tính toán tỷ lệ thời gian (0 đến 1)
        const interpolationFactor = (renderTime - b0.ts) / (b1.ts - b0.ts);

        Object.keys(b1.players).forEach(id => {
            // Không nội suy chính mình (vì mình di chuyển local)
            if (id === this.scene.network.socket.id) return;

            const p0 = b0.players[id];
            const p1 = b1.players[id];

            if (p0 && p1) {
                const other = this.otherPlayers.getChildren().find(p => p.playerId === id);
                if (other) {
                    // Nội suy tuyến tính: x = x0 + (x1 - x0) * factor
                    const newX = p0.x + (p1.x - p0.x) * interpolationFactor;
                    other.x = newX;
                    if (other.playRun) other.playRun();
                }
            }
        });
    }

    removeOther(playerId) {
        const p = this.otherPlayers.getChildren().find(x => x.playerId === playerId);
        if (p) p.destroy();
    }

    resetPositionsFromServer(players, myId) {
        // host có thể không có entry trong players => check kỹ
        if (this.horse && players[myId]) {
            this.horse.x = players[myId].x;
            if (this.horse.resetColor) this.horse.resetColor();
        }

        this.otherPlayers.getChildren().forEach(p => {
            const info = players[p.playerId];
            if (info) p.setPosition(info.x, info.y);
        });
    }

    moveSelfBy(dx) {
        if (!this.horse) return;
        this.horse.x += dx;
        if (this.horse.playRun) this.horse.playRun();
    }

    getLeaderFromOthers() {
        let leader = null;
        let maxX = -Infinity;

        this.otherPlayers.getChildren().forEach(h => {
            if (h.x > maxX) {
                maxX = h.x;
                leader = h;
            }
        });

        return leader;
    }

    updateHostCameraFollow() {
        if (this.state.role !== 'host') return;
        if (!this.state.isRaceStarted) return;

        const leader = this.getLeaderFromOthers();
        if (leader && this.scene.cameras.main._follow !== leader) {
            this.scene.cameras.main.startFollow(leader, true, 0.08, 0.08);
        }
    }
}
