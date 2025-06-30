export class MenuManager {
    constructor() {
        this.isPaused = false;
        this.isGameRunning = false;

        this.startScreen = null;
        this.mainMenu = null;
        this.optionsMenu = null;
        this.ingameOptionsOverlay = null;

        this.audioManager = null;
        this.getGridHelper = null;
        this.onStartGame = null;
    }

    init(deps) {
        this.onStartGame = deps.onStartGame;
        this.audioManager = deps.audioManager;
        this.getGridHelper = deps.getGridHelper;

        this._findAllElements();
        this._attachEventListeners();
    }

    _findAllElements() {
        this.startScreen = document.getElementById('start-screen');
        this.mainMenu = document.getElementById('main-menu');
        this.optionsMenu = document.getElementById('options-menu');
        this.ingameOptionsOverlay = document.getElementById('ingame-options-overlay');
    }

    _attachEventListeners() {
        const startButton = this.startScreen?.querySelector('#start-button');
        if (startButton) {
            startButton.addEventListener('click', this.onStartGame, { once: true });
        }
        window.addEventListener('keydown', (e) => {
            if (this.startScreen && !this.startScreen.classList.contains('hidden')) {
                this.onStartGame();
            }
        }, { once: true });

        document.getElementById('options-button')?.addEventListener('click', () => {
            this.mainMenu?.classList.add('hidden');
            this.optionsMenu?.classList.remove('hidden');
        });

        document.getElementById('back-button')?.addEventListener('click', () => {
            this.optionsMenu?.classList.add('hidden');
            this.mainMenu?.classList.remove('hidden');
        });

        const bgmSlider = document.getElementById('bgm-volume-slider');
        const sfxSlider = document.getElementById('sfx-volume-slider');
        const ingameBgmSlider = document.getElementById('ingame-bgm-volume-slider');
        const ingameSfxSlider = document.getElementById('ingame-sfx-volume-slider');

        bgmSlider?.addEventListener('input', (e) => this.audioManager.setBgmVolume(e.target.value));
        sfxSlider?.addEventListener('input', (e) => this.audioManager.setSfxVolume(e.target.value));
        
        document.getElementById('resume-button')?.addEventListener('click', () => this.togglePause());
        document.getElementById('quit-button')?.addEventListener('click', () => window.location.reload());
        document.getElementById('toggle-grid-button')?.addEventListener('click', () => this.toggleGrid());
        
        ingameBgmSlider?.addEventListener('input', (e) => {
            this.audioManager.setBgmVolume(e.target.value);
            if(bgmSlider) bgmSlider.value = e.target.value;
        });
        ingameSfxSlider?.addEventListener('input', (e) => {
            this.audioManager.setSfxVolume(e.target.value);
            if(sfxSlider) sfxSlider.value = e.target.value;
        });

        window.addEventListener('keyup', (e) => {
            if (!this.isGameRunning) return;
            if (e.code === 'Backquote') {
                this.togglePause();
            }
        });
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const tooltip = document.getElementById('tooltip');
        if (tooltip) tooltip.style.display = 'none';

        if (this.isPaused) {
            this.ingameOptionsOverlay?.classList.remove('hidden');
            const ingameBgmSlider = document.getElementById('ingame-bgm-volume-slider');
            const ingameSfxSlider = document.getElementById('ingame-sfx-volume-slider');
            if (ingameBgmSlider) ingameBgmSlider.value = this.audioManager.bgmVolume;
            if (ingameSfxSlider) ingameSfxSlider.value = this.audioManager.sfxVolume;
        } else {
            this.ingameOptionsOverlay?.classList.add('hidden');
        }
    }

    toggleGrid() {
        const gridHelper = this.getGridHelper ? this.getGridHelper() : null;
        if (gridHelper) {
            gridHelper.visible = !gridHelper.visible;
        }
    }

    hideStartScreen() {
        if (this.startScreen) this.startScreen.classList.add('hidden');
    }

    setGameRunning(running) {
        this.isGameRunning = running;
    }
}

