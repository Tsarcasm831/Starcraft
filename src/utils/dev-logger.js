const logs = [];
const MAX_LOGS = 200;
let devLoggerActive = false;

function updateDevLogModal() {
    const devLogOutput = document.getElementById('dev-log-output');
    if (devLogOutput && !devLogOutput.closest('#dev-log-modal').classList.contains('hidden')) {
        devLogOutput.textContent = devLogger.getLogs().join('\n');
    }
}

export const devLogger = {
    get isActive() {
        return devLoggerActive;
    },
    
    activate() {
        devLoggerActive = true;
        this.log('DevLogger', 'Developer Mode Activated.');
    },
    
    log(source, message) {
        if (!devLoggerActive) return;
        
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
        logs.push(`[${timestamp}] [${source}] ${message}`);
        
        if (logs.length > MAX_LOGS) {
            logs.shift();
        }
        
        updateDevLogModal();
    },

    getLogs() {
        return logs.slice().reverse();
    },

    clearLogs() {
        logs.length = 0;
        updateDevLogModal();
    }
};