const { io } = require("socket.io-client");

const PORT = 3000;
const MAX_FAKE_PLAYERS = 100;

for (let i = 0; i < MAX_FAKE_PLAYERS; i++) {
    setTimeout(() => {
        const socket = io(`http://localhost:${PORT}`);
        let x = 150;
        let canRun = false;
        let clickCount = 0;

        socket.on('raceStarted', () => canRun = true);

        setInterval(() => {
            if (!canRun) return;

            x += 20;
            clickCount++;

            if (clickCount >= 10) {
                x += 150;
                clickCount = 0;
            }

            socket.emit('playerMovement', { x });
        }, 200);
    }, i * 50);
}
