function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const ms = Math.floor(now.getMilliseconds() / 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    const displayHours = hours % 12 || 12;
    
    const hourNode = document.getElementById('hour-node');
    const minNode = document.getElementById('min-node');
    const secNode = document.getElementById('sec-node');
    const msNode = document.getElementById('ms-node');
    const ampmNode = document.getElementById('ampm-node');
    const dayNode = document.getElementById('live-day');
    
    if (hourNode) hourNode.textContent = displayHours.toString().padStart(2, '0');
    if (minNode) minNode.textContent = minutes.toString().padStart(2, '0');
    if (secNode) secNode.textContent = seconds.toString().padStart(2, '0');
    if (msNode) msNode.textContent = '.' + ms.toString().padStart(2, '0');
    if (ampmNode) ampmNode.textContent = ampm;
    
    if (dayNode) {
        const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
        dayNode.textContent = days[now.getDay()];
    }
    
    requestAnimationFrame(updateClock);
}

// --- AUTOSAVE ENGINE ---
function initAutosave() {
    // Disabled here to avoid duplication with base.html central engine
    console.log('AUTOSAVE: Peripheral engine initialized (standby).');
}

// Clear local storage if the user changes or logs out to prevent data leakage
function checkUserSession() {
    const currentUsername = document.body.dataset.username;
    const storedUsername = localStorage.getItem('nexus_active_user');
    
    if (currentUsername && storedUsername && currentUsername !== storedUsername) {
        console.warn('USER SESSION MISMATCH: Purging local cache to prevent data leakage.');
        localStorage.clear();
        localStorage.setItem('nexus_active_user', currentUsername);
        window.location.reload();
        return true;
    }
    
    if (currentUsername && !storedUsername) {
        localStorage.setItem('nexus_active_user', currentUsername);
    }
    return false;
}

document.addEventListener('DOMContentLoaded', () => {
    if (checkUserSession()) return;
    updateClock();
    initAutosave();
});
