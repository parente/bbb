var token = null;

function onSave() {
    localStorage['baseUrl'] = document.getElementById('baseUrl').value;
    localStorage['frequency'] = document.getElementById('frequency').value;
    localStorage['sounds'] = document.getElementById('sounds').checked;
    _showStatus();
}

function _showStatus() {
    var node = document.getElementById('status');
    node.style.visibility = '';
    if(token) clearTimeout(token);
    token = setTimeout(function() {
        node.style.visibility = 'hidden';
        token = null;
    }, 3000);
    var bg = chrome.extension.getBackgroundPage();
    bg.scheduleUpdate(true);
}

window.onload = function() {
    document.getElementById('baseUrl').value = localStorage['baseUrl'] || '';
    document.getElementById('frequency').value = localStorage['frequency'] || '30';
}