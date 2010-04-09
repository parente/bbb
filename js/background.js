var baseUrl = null;
var buildbot = {};
var online = false;
var token = null;

function unserialize() {
    try {
        var json = localStorage['buildbot'];
        buildbot = JSON.parse(json);
    } catch(e) {
        // no previous builder info
        buildbot.builders = [];
        buildbot.date = (new Date()).toString();
    }
}

function serialize() {
    var json = JSON.stringify(buildbot);
    localStorage['buildbot'] = json;
}

function updateStatus() {
    // set the button title
    var title = {};
    if(online) {
        title.title = chrome.i18n.getMessage('extOnlineTitle');
    } else {
        title.title = chrome.i18n.getMessage('extOfflineTitle');
    }
    chrome.browserAction.setTitle(title);
    // set the badge text
    var fails = buildbot.builders.filter(function(item) {
       return item.last.className.search('failure') > -1;
    });
    if(fails.length) {
        var badge = {text : String(fails.length)};
        chrome.browserAction.setBadgeText(badge);
    } else {
        chrome.browserAction.setBadgeText({text : ''});
    }
    // show active, online, offline status
    var icon = {path : 'png/offline.png'};
    if(online) {
        // at least online
        icon.path = 'png/online.png';
        var active = buildbot.builders.filter(function(item) {
            return item.current.className.search('building') > -1;
        });
        if(active.length) {
            // actively building
            icon.path = 'png/active.png';
        }
    }
    chrome.browserAction.setIcon(icon);
}

function handleError(err) {
    console.error(err);
    online = false;
    updateStatus();
}

function parseBuilders(xhr) {
    document.getElementById('eval').innerHTML = xhr.responseText;
    var tds = document.getElementsByTagName('td');
    if(tds.length == 0) {
        // no response
        online = false;
        updateStatus();
        return;
    }
    var builders = [];
    for(var i=0; i < tds.length; i+=3) {    
        var nameNode = tds[i];
        var name = nameNode.textContent;
        var a = nameNode.getElementsByTagName('a')[0];
        var pathname = a.pathname;
        var lastNode = tds[i+1];
        var last = {};
        last.className = lastNode.className;
        last.label = lastNode.textContent;
        a = lastNode.getElementsByTagName('a')[0];
        if(a) {
            last.pathname = a.pathname;
        } else {
            last.pathname = null;
        }
        var currNode = tds[i+2];
        var curr = {};
        curr.className = currNode.className;
        curr.label = currNode.textContent;
        builders.push({name: name, pathname : pathname, current : curr, last : last});
    }
    online = true;
    buildbot.date = (new Date()).toString();
    buildbot.builders = builders;
    serialize();
    updateStatus();
}

function checkStatus() {
    _get(baseUrl+'/builders/', parseBuilders);
}

function scheduleUpdate() {
    if(token) clearInterval(token);
    baseUrl = localStorage['baseUrl'];
    if(baseUrl) {
        checkStatus();
        var freq = localStorage['frequency'];
        token = setInterval(checkStatus, freq*1000);
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
    scheduleUpdate();
};
