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
        if (this.horse.playIdle) this.horse.playIdle();
        else this.horse.play('horse_idle');
        this.scene.cameras.main.startFollow(this.horse, true, 0.1, 0.1);
    }

    addOther(playerInfo, myId) {
        if (!playerInfo) return;
        if (playerInfo.id === myId) return;

        const existing = this.otherPlayers.getChildren().find(p => p.playerId === playerInfo.id);
        if (existing) {
            existing.serverIndex = playerInfo.serverIndex;
            return;
        }

        const other = new Horse(
            this.scene,
            playerInfo.x,
            playerInfo.y,
            'horse',
            playerInfo.id,
            playerInfo.horseColor,
            playerInfo.name
        );

        other.serverIndex = playerInfo.serverIndex;
        other.setDepth(DEPTH.HORSE);
        if (other.playIdle) other.playIdle();
        else other.play('horse_idle');
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
        const total = b1.ts - b0.ts;
        if (total <= 0) return;

        const interpolationFactor = (renderTime - b0.ts) / total;

        this.otherPlayers.getChildren().forEach(horse => {
            const idx = horse.serverIndex;
            const x0 = b0.p[idx];
            const x1 = b1.p[idx];

            if (x0 !== undefined && x1 !== undefined) {
                const newX = x0 + (x1 - x0) * interpolationFactor;
                if (Math.abs(horse.x - newX) > 0.1) {
                    horse.x = newX;
                    if (horse.requestRun) horse.requestRun(1);
                    else if (horse.playRun) horse.playRun();
                }
            }
        });
        if (this.state.role === 'host' && this.horse) {
            const idx = this.horse.serverIndex;
            const x0 = b0.p[idx];
            const x1 = b1.p[idx];
            if (x0 !== undefined && x1 !== undefined) {
                this.horse.x = x0 + (x1 - x0) * interpolationFactor;
            }
        }
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
        if (this.horse.requestRun) this.horse.requestRun(1);
        else if (this.horse.playRun) this.horse.playRun();
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
