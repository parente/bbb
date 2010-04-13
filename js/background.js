var baseUrl = null;
var online = false;
var buildbot = {};
var _token = null;
var _fetch = {};

function unserialize() {
    try {
        var json = localStorage['buildbot'];
        buildbot = JSON.parse(json);
    } catch(e) {
        // no previous builder info
        buildbot.builders = {};
        buildbot.lastBuild = {};
        buildbot.date = (new Date()).toString();
    }
}

function serialize() {
    var json = JSON.stringify(buildbot);
    localStorage['buildbot'] = json;
}

function updateStatus() {
    // set the button title
    var title = {}, key, count;
    if(online) {
        title.title = chrome.i18n.getMessage('extOnlineTitle');
    } else {
        title.title = chrome.i18n.getMessage('extOfflineTitle');
    }
    chrome.browserAction.setTitle(title);
    // set the badge text
    var fails = 0;
    for(key in buildbot.lastBuild) {
        fails += (buildbot.lastBuild[key].builds['-1'].results) ? 1 : 0;
    }
    if(fails > 0) {
        var badge = {text : String(fails)};
        chrome.browserAction.setBadgeText(badge);
    } else {
        chrome.browserAction.setBadgeText({text : ''});
    }
    // show active, online, offline status
    var icon = {path : '../png/offline.png'};
    if(online) {
        // at least online
        icon.path = '../png/online.png';
        for(key in buildbot.builders) {
            if(buildbot.builders[key].state === 'building') {
                // actively building
                icon.path = '../png/active.png';
                break;
            }
        }
    }
    chrome.browserAction.setIcon(icon);
    // schedule next update
    scheduleUpdate(false);
}

function handleError(err) {
    console.error(err);
    online = false;
    updateStatus();
}

function parseBuilders(xhr) {
    try {
        _fetch.builders = JSON.parse(xhr.responseText);
    } catch(e) {
        online = false;
        updateStatus();
        return;
    }
    // build request for last build of each builder
    var path = '/json/builders/?';
    for(var name in _fetch.builders) {
        var info = _fetch.builders[name];
        if(!info.cachedBuilds.length) continue;
        path += 'select='+name+'/builds/-1&';
    }
    _get(baseUrl+path, parseLastBuild);
}

function parseLastBuild(xhr) {
    try {
        _fetch.lastBuild = JSON.parse(xhr.responseText);
    } catch(e) {
        online = false;
        updateStatus();
        return;
    }
    // move fetch to latest status
    online = true;
    buildbot = _fetch;
    _fetch = {};
    buildbot.date = (new Date()).toString();
    console.log(buildbot);
    // save the last successful fetch
    serialize();
    updateStatus();
}

function checkStatus() {
    _get(baseUrl+'/json/builders', parseBuilders);
}

function scheduleUpdate(immediate) {
    if(_token) clearTimeout(_token);
    baseUrl = localStorage['baseUrl'];
    if(baseUrl) {
        if(immediate) {
            checkStatus();
        } else {
            var freq = localStorage['frequency'] || 30;
            _token = setTimeout(checkStatus, freq*1000);
        }
    } else {
        delete localStorage['buildbot'];
        buildbot = {};
    }
}

function _get(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onerror = handleError;
    xhr.onreadystatechange = function(state) {
        if(xhr.readyState == 4) {
            callback(xhr);
        }
    };
    xhr.open("GET", url, true);
    xhr.send({});
}

window.onload = function() {
    unserialize();
    scheduleUpdate(true);
};
