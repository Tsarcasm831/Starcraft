import { getSelectedObjects, handleSingleSelection } from './selection.js';
import { handleRightClick } from './rightClickHandler.js';
import { getPlacementMode } from './placement.js';

let keyState;
let isInitialized = false;
let rendererDomElement, renderer, camera;
let commandButton;
let tapStartTime = 0;
let tapTimeout = null;
const TAP_THRESHOLD = 200; // ms for a tap
const HOLD_THRESHOLD = 500; // ms for a hold to become a command
let lastTapTime = 0;
const DOUBLE_TAP_THRESHOLD = 300; // ms for double tap

function initJoystick() {
    const joystickZone = document.getElementById('joystick-zone');
    if (!joystickZone) return;

    const options = {
        zone: joystickZone,
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: 'white',
        size: 100,
    };
    const manager = nipplejs.create(options);

    manager.on('move', (evt, data) => {
        const angle = data.angle.radian;
        const force = data.force;
        const threshold = 0.5;

        // Reset all directions
        keyState['KeyW'] = false;
        keyState['KeyS'] = false;
        keyState['KeyA'] = false;
        keyState['KeyD'] = false;

        if (force < threshold) return;

        // Determine direction based on angle
        if (angle >= Math.PI / 4 && angle < 3 * Math.PI / 4) {
            keyState['KeyW'] = true; // Up
        } else if (angle >= 3 * Math.PI / 4 && angle < 5 * Math.PI / 4) {
            keyState['KeyA'] = true; // Left
        } else if (angle >= 5 * Math.PI / 4 && angle < 7 * Math.PI / 4) {
            keyState['KeyS'] = true; // Down
        } else {
            keyState['KeyD'] = true; // Right
        }
    });

    manager.on('end', () => {
        // Reset all directions when joystick is released
        keyState['KeyW'] = false;
        keyState['KeyS'] = false;
        keyState['KeyA'] = false;
        keyState['KeyD'] = false;
    });
}

function initActionButtons() {
    // The select button is removed in favor of tap-to-select.
    // The command button is now a general-purpose action button triggered by hold.
    const selectButton = document.getElementById('select-action-button');
    if(selectButton) selectButton.remove();

    commandButton = document.getElementById('command-action-button');
    if (commandButton) {
        commandButton.style.display = 'none'; // Initially hidden
    }
}

function handleDoubleTap(event) {
    if (getSelectedObjects().length === 0) return;

    const touch = event.changedTouches[0];
    const rect = renderer.domElement.getBoundingClientRect();
    const eventData = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
        width: rect.width,
        height: rect.height,
        isMobile: true,
    };

    handleRightClick(eventData);
}

function handleTapStart(event) {
    event.preventDefault();
    if (event.touches.length > 1) return;

    tapStartTime = Date.now();
    const touch = event.touches[0];

    // Set a timeout for a "hold" action (right-click equivalent)
    tapTimeout = setTimeout(() => {
        tapTimeout = null; // Clear the timeout ID
        // This is a hold, treat as right-click/command
        const centerCoords = getCenterAsEvent(renderer);
        const placementMode = getPlacementMode();

        if (placementMode) {
             if (window.cancelPlacementMode) window.cancelPlacementMode();
        } else if (getSelectedObjects().length > 0) {
            handleRightClick(centerCoords);
        }
    }, HOLD_THRESHOLD);

    rendererDomElement.addEventListener('touchend', handleTapEnd, { once: true });
    rendererDomElement.addEventListener('touchmove', handleTouchMove, { once: true });
}

function handleTouchMove(event) {
    // If finger moves, it's not a tap, cancel the hold timeout.
    clearTimeout(tapTimeout);
    tapTimeout = null;
    rendererDomElement.removeEventListener('touchend', handleTapEnd);
}

function handleTapEnd(event) {
    // If the hold timeout is still scheduled, it means this was a quick tap.
    if (tapTimeout) {
        clearTimeout(tapTimeout);
        tapTimeout = null;
        
        const now = Date.now();
        const touch = event.changedTouches[0];
        const eventData = {
            clientX: touch.clientX,
            clientY: touch.clientY,
            isMobile: true,
        };

        if (now - lastTapTime < DOUBLE_TAP_THRESHOLD) {
            // It's a double tap
            handleDoubleTap(event);
            lastTapTime = 0; // Reset to avoid triple-tap issues
            return; // Don't process as a single tap
        }
        
        // It's a single tap
        lastTapTime = now;

        const placementMode = getPlacementMode();
        if (placementMode) {
            if (window.attemptPlacement) {
                window.attemptPlacement(eventData);
            }
        } else {
            handleSingleSelection(eventData);
        }
    }
}

function initTapToSelect() {
    if (!rendererDomElement) return;
    rendererDomElement.addEventListener('touchstart', handleTapStart, { passive: false });
}

// Helper to get coordinates relative to the canvas for the controls.js handlers
function getCenterAsEvent(renderer) {
    const rect = renderer.domElement.getBoundingClientRect();
    return {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        isMobile: true, // Flag for our modified handlers
        x: rect.width / 2,
        y: rect.height / 2,
        width: rect.width,
        height: rect.height
    };
}

function getCenterOfCanvas(renderer) {
    const rect = renderer.domElement.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
    };
}

export function initMobileControls(deps) {
    keyState = deps.keyState;
    renderer = deps.renderer;
    camera = deps.camera;
    rendererDomElement = renderer.domElement;

    initActionButtons();

    // Expose a function to be called after the start button is clicked
    window.mobileControls = {
        initJoystick: initJoystick,
        initTapToSelect: initTapToSelect,
    };
}