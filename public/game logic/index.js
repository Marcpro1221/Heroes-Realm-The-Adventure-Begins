const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const idleFrames = [];
let currentFrame = 0;
let frameCount = 0;
const frameSpeed = 5;
const totalFrames = 10;

// Preload images
for (let i = 1; i <= totalFrames; i++) {
    const img = new Image();
    img.src = `./Resources/Assets/Images/Idle (${i}).png`;
    idleFrames.push(img);
}

function animate() {
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    frameCount++;
    if (frameCount >= frameSpeed) {
        frameCount = 0;
        currentFrame = (currentFrame + 1) % totalFrames;
    }

    const currentImg = idleFrames[currentFrame];
    if (currentImg.complete) { // Only draw if image is fully loaded
        ctx.drawImage(currentImg, 150, 400, 150, 170);
    }
}

animate();
