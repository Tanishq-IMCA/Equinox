let serverStartTime = null;
function checkServerStatus() {
    fetch('/server_status').then(res => res.json()).then(data => {
        if (serverStartTime === null) serverStartTime = data.server_start_time;
        else if (serverStartTime !== data.server_start_time) location.reload();

    }).catch(() => setTimeout(() => location.reload(), 5000));
}
setInterval(checkServerStatus, 3000);
