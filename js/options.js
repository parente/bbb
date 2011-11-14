/*
 * Buildbot Button Chrome Extension
 *
 * Copyright 2010, Peter Parente. All rights reserved.
 * http://creativecommons.org/licenses/BSD/
 */
var token = null;

function onSave() {
    var url = document.getElementById('baseUrl').value;
    if(url.charAt(url.length-1) == '/') {
        // strip trailing /
        url = url.substr(0, url.length-1)
    }
    localStorage['baseUrl'] = url;
    localStorage['builders'] = document.getElementById('builders').value;
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
    document.getElementById('builders').value = localStorage['builders'] || '';
    document.getElementById('frequency').value = localStorage['frequency'] || '30';
    if(localStorage['sounds'] == 'true') {
        document.getElementById('sounds').checked = true;
    }
}
