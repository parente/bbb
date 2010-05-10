/*
 * Buildbot Button Chrome Extension
 *
 * Copyright 2010, Peter Parente. All rights reserved.
 * http://creativecommons.org/licenses/BSD/
 */
var baseUrl = null;
var online = false;
var buildbot = {};
var lastXHR = null;
var _token = null;
var _fetch = {};
var _sounds = {
    1: 'startSound',
    2: 'passSound',
    3: 'passSound',
    4: 'failSound',
    5: 'failSound',
    6: 'failSound',
    7: 'failSound'
};

function _setButtonTitle() {
    // set the button title
    var title = {}, key, count;
    if(online) {
        title.title = chrome.i18n.getMessage('extOnlineTitle');
    } else {
        title.title = chrome.i18n.getMessage('extOfflineTitle');
    }
    chrome.browserAction.setTitle(title);    
}

function _setBadgeText() {
    // set the badge text
    var fails = 0;
    if(buildbot.lastBuild) {
        $.each(buildbot.lastBuild, function(name, info) {
            fails += (info.builds['-1'].results) ? 1 : 0;
        });
    }
    if(fails > 0) {
        var badge = {text : String(fails)};
        chrome.browserAction.setBadgeText(badge);
    } else {
        chrome.browserAction.setBadgeText({text : ''});
    }    
}

function _setButtonIcon() {
    // show active, online, offline status
    var icon = {path : '../png/offline.png'};
    if(online) {
        // at least online
        icon.path = '../png/online.png';
        $.each(buildbot.builders, function(name, info) {
            if(info.state === 'building') {
                // actively building
                icon.path = '../png/active.png';
                return false;
            }
        });
    }
    chrome.browserAction.setIcon(icon);
}

function _sonifyDiff() {
    // abort if sounds diabled or not online
    if(!online || !localStorage['sounds']) {return;}
    var notice = 0;
    $.each(buildbot.diff, function(name, diff) {
        if(diff.number > diff.oldNumber) {
            // new build started
            if(diff.state == 'building') {
                // currently building it
                notice |= 1;
            } else if(diff.state == 'idle') {
                // it already finished
                if(!diff.results) {
                    notice |= 2;
                } else {
                    notice |= 4;
                }
            }
        } else if(diff.oldState == 'building' && diff.state != 'building') {
            // builder finished a build
            if(!diff.results) {
                notice |= 2;
            } else {
                notice |= 4;
            }
        }
        // @todo: do we have to check results too?
    });
    var id = _sounds[notice];
    if(id) {
        var node = document.getElementById(id);
        node.load();
        node.play();     
    }
}

function _notifyViews() {
    // notify other views
    var views = chrome.extension.getViews();
    $.each(views, function(i, view) {
        try {
            view.onBuildbotUpdate();
        } catch(e) {
        }
    });
}

function _updateStatus() {
    _setButtonTitle();
    _setBadgeText();
    _setButtonIcon();    
    _sonifyDiff();
    _notifyViews();
    scheduleUpdate(false);
}

function _unserialize() {
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

function _serialize() {
    var json = JSON.stringify(buildbot);
    localStorage['buildbot'] = json;
}

function _diffLastBuild() {
    var diff = {};
    $.each(_fetch.builders, function(name, info) {
        var df = {};
        // current and old builder state
        df.state = info.state;
        try {
            df.oldState = buildbot.builders[name].state;
        } catch(e) {
            df.oldState = null;
        }
        // current and old build number
        try {
            df.number = _fetch.lastBuild[name].builds['-1'].number;
        } catch(e) {
            df.number = null;
        }
        try {
            df.oldNumber = buildbot.lastBuild[name].builds['-1'].number;
        } catch(e) {
            df.oldNumber = null;
        }
        // current and old results
        try {
            df.results = _fetch.lastBuild[name].builds['-1'].results;
        } catch(e) {
            df.results = null;
        }                
        try {
            df.oldResults = buildbot.lastBuild[name].builds['-1'].results;
        } catch(e) {
            df.oldResults = null;
        }
        diff[name] = df;
    });
    // @todo: catch builders that went away too?
    return diff;
}

function _handleError(err) {
    delete localStorage['buildbot'];
    buildbot = {};
    online = false;
    _updateStatus(); 
}

function _handleBuilders(xhr) {
    try {
        _fetch.builders = JSON.parse(xhr.responseText);
    } catch(e) {
        _handleError(e);
        return;
    }
    // build request for last build of each builder
    var path = '/json/builders/?';
    for(var name in _fetch.builders) {
        var info = _fetch.builders[name];
        if(!info.cachedBuilds.length) continue;
        path += 'select='+name+'/builds/-1&';
    }
    _get(baseUrl+path, _handleLastBuild);
}

function _handleLastBuild(xhr) {
    try {
        _fetch.lastBuild = JSON.parse(xhr.responseText);
    } catch(e) {
        _handleError(e);
        return;
    }
    // diff with last status
    var diff = _diffLastBuild();
    // move fetch to latest status
    online = true;
    buildbot = _fetch;
    _fetch = {};
    buildbot.date = (new Date()).toString();
    buildbot.diff = diff;
    // save the last successful fetch
    _serialize();
    _updateStatus();
}

function _checkStatus() {
    _get(baseUrl+'/json/builders', _handleBuilders);
}

function scheduleUpdate(immediate) {
    if(_token) clearTimeout(_token);
    baseUrl = localStorage['baseUrl'];
    if(baseUrl) {
        if(immediate) {
            _checkStatus();
        } else {
            var freq = localStorage['frequency'] || 30;
            _token = setTimeout(_checkStatus, freq*1000);
        }
    } else {
        delete localStorage['buildbot'];
        buildbot = {};
        online = false;
        _updateStatus();
    }
}

function _get(url, callback) {
    var xhr = new XMLHttpRequest();
    lastXHR = xhr;
    //xhr.onerror = _handleError;
    xhr.onreadystatechange = function(state) {
        if(xhr.readyState == 4) {
            callback(xhr);
        }
    };
    xhr.open("GET", url, true);
    xhr.send({});
}

window.onload = function() {
    _unserialize();
    scheduleUpdate(true);
};
