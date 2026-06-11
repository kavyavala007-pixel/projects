// ==========================================
// CONFIGURATION & SETUP
// ==========================================

// The total number of images in the construction sequence (frame range is 1 to 150)
const frameCount = 150;

// Array that will store the preloaded Image objects in memory
const images = [];

// DOM references for the canvas, contexts, loading screens, and layout containers
const canvas = document.getElementById("animation-canvas");
const ctx = canvas.getContext("2d");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingText = document.getElementById("loading-text");
const container = document.getElementById("animation-container");

// ==========================================
// ANIMATION STATE CONTROLLERS
// ==========================================

// currentFrame holds the currently rendered frame (updated gradually via interpolation)
let currentFrame = 1;

// targetFrame represents the actual target frame calculated from the current scroll position
let targetFrame = 1;

// Counts how many images have successfully loaded so far
let imagesLoaded = 0;

// Helper function to build the path for each frame: e.g. index 5 -> 'ezgif-frame-005.jpg'
const getFramePath = (index) => {
    const paddedIndex = String(index).padStart(3, '0');
    return `ezgif-frame-${paddedIndex}.jpg`;
};

// Percentage to crop from each edge to hide corner watermarks cleanly (0.06 = 6%)
const cropPercent = 0.06;

// ==========================================
// RENDERING & INTERPOLATION LOGIC
// ==========================================

/**
 * Custom draw function that behaves like 'object-fit: contain' on CSS,
 * but also applies a border crop to hide corner watermarks.
 */
function drawImageContain(ctx, img) {
    // Physical dimensions of the canvas drawing buffer
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Original dimensions of the source image
    const imgWidth = img.width;
    const imgHeight = img.height;

    // Calculate the sub-rectangle coordinates to crop out the outer borders
    const cropX = imgWidth * cropPercent;
    const cropY = imgHeight * cropPercent;
    const sWidth = imgWidth - (cropX * 2);
    const sHeight = imgHeight - (cropY * 2);

    // Compute aspect ratios for matching coordinates
    const imgRatio = sWidth / sHeight;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth, drawHeight, drawX, drawY;

    if (imgRatio > canvasRatio) {
        // Image is wider than canvas relative to height: fit to width
        drawWidth = canvasWidth;
        drawHeight = canvasWidth / imgRatio;
        drawX = 0;
        drawY = (canvasHeight - drawHeight) / 2;
    } else {
        // Image is taller than canvas relative to width: fit to height
        drawHeight = canvasHeight;
        drawWidth = canvasHeight * imgRatio;
        drawX = (canvasWidth - drawWidth) / 2;
        drawY = 0;
    }

    // Clear previous frame pixels completely
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw the cropped source image section to the calculated canvas viewport position
    ctx.drawImage(img, cropX, cropY, sWidth, sHeight, drawX, drawY, drawWidth, drawHeight);
}

/**
 * Resize handler: sets canvas drawing buffer dimensions to match viewport dimensions
 * scaled by physical screen device pixel ratio for maximum sharpness.
 */
function resizeCanvas() {
    const scale = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * scale;
    canvas.height = window.innerHeight * scale;

    // Ensure image smoothing quality is set to high for premium upscale quality on high-res displays
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Immediately draw the active frame on window resize to avoid visual flickering
    const activeFrameIndex = Math.round(currentFrame);
    if (images[activeFrameIndex]) {
        drawImageContain(ctx, images[activeFrameIndex]);
    }
}

/**
 * Loop function driven by requestAnimationFrame.
 * Linearly interpolates currentFrame towards targetFrame to make frame transition smooth on scroll.
 */
function updateAnimation() {
    // Lerp factor determines transition speed (lower = smoother/slower, higher = snappier)
    const lerpFactor = 0.15;
    const diff = targetFrame - currentFrame;

    if (Math.abs(diff) > 0.01) {
        // Increment the current frame value and request another redraw frame
        currentFrame += diff * lerpFactor;
        requestAnimationFrame(updateAnimation);
    } else {
        // Snap directly to target frame once we are close enough
        currentFrame = targetFrame;
    }

    // Render the frame represented by the rounded index
    const frameToDraw = Math.round(currentFrame);
    if (images[frameToDraw]) {
        drawImageContain(ctx, images[frameToDraw]);
    }
}

// ==========================================
// INPUT & SCROLL EVENT LISTENERS
// ==========================================

/**
 * Maps the global window scroll progress directly to frame indices.
 */
function handleScroll() {
    const scrollTop = window.scrollY;
    // Total scroll track distance of the container
    const maxScroll = container.scrollHeight - window.innerHeight;

    if (maxScroll <= 0) return;

    // Calculate the percentage of scroll completed (0.0 to 1.0)
    const scrollFraction = Math.min(1, Math.max(0, scrollTop / maxScroll));

    // Convert scroll fraction to frame index bounds (1 to 150)
    const nextTarget = Math.max(1, Math.min(frameCount, Math.ceil(scrollFraction * frameCount)));

    // Trigger animation loop only if target frame has changed
    if (nextTarget !== targetFrame) {
        const shouldStartLoop = targetFrame === currentFrame;
        targetFrame = nextTarget;
        if (shouldStartLoop) {
            requestAnimationFrame(updateAnimation);
        }
    }
}

// ==========================================
// PRELOADING & INITIALIZATION
// ==========================================

/**
 * Preloads all 150 frames to ensure zero lag or flicker during scroll.
 */
function preloadImages() {
    for (let i = 1; i <= frameCount; i++) {
        const img = new Image();
        img.src = getFramePath(i);

        img.onload = () => {
            imagesLoaded++;
            // Update the loading progress overlay
            const progress = Math.round((imagesLoaded / frameCount) * 100);
            loadingText.textContent = `Loading construction sequence... ${progress}%`;

            // Once all frames are cached in browser memory, show the canvas
            if (imagesLoaded === frameCount) {
                // Initialize canvas dimensions
                resizeCanvas();

                // Draw initial frame (frame 1)
                drawImageContain(ctx, images[1]);

                // Hide loading overlay transition
                loadingOverlay.classList.add("fade-out");

                // Set up event listeners for resize and scroll interaction
                window.addEventListener("scroll", handleScroll, { passive: true });
                window.addEventListener("resize", resizeCanvas);
            }
        };
        img.onerror = () => {
            console.error(`Failed to load frame: ${getFramePath(i)}`);
        };
        images[i] = img;
    }
}

// Start preloading if not on mobile
const isMobile = window.innerWidth <= 768;

if (!isMobile) {
    preloadImages();
} else {
    // Hide loading screen immediately on mobile
    if (loadingOverlay) {
        loadingOverlay.style.display = "none";
    }
}

// ==========================================
// MOBILE MENU
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    const hamburgerBtn = document.getElementById("hamburger-btn");
    const navMenu = document.getElementById("nav-menu");
    const overlay = document.getElementById("menu-overlay");

    if (!hamburgerBtn || !navMenu || !overlay) {
        console.log("Menu elements missing");
        return;
    }

    hamburgerBtn.addEventListener("click", () => {

        hamburgerBtn.classList.toggle("active");
        navMenu.classList.toggle("active");
        overlay.classList.toggle("active");

    });

    function closeMenu() {

        hamburgerBtn.classList.remove("active");
        navMenu.classList.remove("active");
        overlay.classList.remove("active");

    }

    overlay.addEventListener("click", closeMenu);

    document.querySelectorAll("#nav-menu a").forEach(link => {
        link.addEventListener("click", closeMenu);
    });

});
// ==========================================
// NAVBAR SCROLL EFFECT
// ==========================================

const navbar = document.getElementById("navbar");

window.addEventListener("scroll", () => {

    const scrollThreshold = isMobile ? 30 : 2410;

    if (window.scrollY > scrollThreshold) {

        navbar.classList.add("scrolled");

    } else {

        navbar.classList.remove("scrolled");

    }

});