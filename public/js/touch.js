/**
 * touch.js
 * --------
 * Handles touch/mouse input for mobile devices.
 * We'll interpret vertical swipes as up/down.
 */

const gameContainer = document.getElementById("game-container");
let touchStartY = null;
let touchThreshold = 20;

gameContainer.addEventListener("touchstart", (e) => {
  if (e.touches.length > 0) {
    touchStartY = e.touches[0].clientY;
  }
});

gameContainer.addEventListener("touchmove", (e) => {
  if (touchStartY === null) return;
  
  const currentY = e.touches[0].clientY;
  const diff = currentY - touchStartY;

  // If difference is significant, interpret as up/down
  if (Math.abs(diff) > touchThreshold) {
    if (diff < 0) {
      // swipe up
      socket.emit("playerMove", { up: true, down: false });
    } else {
      // swipe down
      socket.emit("playerMove", { up: false, down: true });
    }
    // Reset startY so continuous "swipe" doesn't spam
    touchStartY = currentY;
  }
});

gameContainer.addEventListener("touchend", () => {
  touchStartY = null;
});
