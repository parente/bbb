/*
 * Buildbot Button Chrome Extension
 *
 * Copyright 2010, Peter Parente. All rights reserved.
 * http://creativecommons.org/licenses/BSD/
 */
function buildDate(bg) {
    var label = document.getElementById('date-label');
    label.textContent = chrome.i18n.getMessage('extDateLabel');
    var stamp = document.getElementById('date-stamp');
    stamp.textContent = new Date(Date.parse(bg.buildbot.date)).toLocaleString();    
}

function buildLinks(bg) {
    var links = {
        '/builders' : 'extBuildersLabel',
        '/waterfall' : 'extWaterfallLabel',
        '/console' : 'extConsoleLabel'
    };
    var i = 3;
    var parent = $('#links').html('');
    $.each(links, function(key, value) {
        var a = $(document.createElement('a'))
            .attr({
                href : bg.baseUrl + key,
                target : '_blank'
            })
            .text(chrome.i18n.getMessage(value));
        parent.append(a);
        --i;
        if(i) parent.append(' | ');
    });
}

function buildBuilders(bg, template) {
    // reset builders
    var lastBuild;
    var buildersNode = $('#builders').html('');
    var model = bg.buildbot;
    // show builder status
    for(var key in model.builders) {
        var info = model.builders[key];
        try {
            lastBuild = model.lastBuild[key].builds['-1'];
        } catch(e) {
            lastBuild = null;
        }
        var args = {
            revision : '',
            eta : '',
            result : '',
            baseUrl : bg.baseUrl,
            buildNum : -1,
            steps: []
        };
        // name of the builder
        args.name = key;
        // status as css class
        args.className = info.state;
        if(lastBuild && lastBuild.text) {
            var outcomes = ['success', 'warnings', 'failure', null, 'exception'];
            args.className += ' ' + outcomes[lastBuild.results];
        } 

        if(lastBuild) {
            // build number
            args.buildNum = lastBuild.number;
            // look for fetched rev
            var rev = '?';
            $.each(lastBuild.properties, function(i, value) {
                if(value[0] == 'got_revision') {
                    rev = value[1];
                    return false;
                }
            });
            // revision number
            args.revision = 'r'+rev;
            // result of last build
            if(lastBuild.currentStep) {
                args.result = lastBuild.currentStep.text.join(' ');
            } else {
                args.result = lastBuild.text.join(' ');
            }
            // eta of current build
            if(lastBuild.eta !== null) {
                var min = lastBuild.eta / 60.0;
                args.eta = (min < 1 && min > 0) ? '< 1 min' : Math.round(min) + ' min';
            }
            // steps
            args.steps = lastBuild.steps;
        }
        // render the template
        var html = template(args);
        buildersNode.append(html);
    }
}

function onBuildbotUpdate(delay) {
    if(delay === undefined) { delay = 500; }
    $('body').fadeOut(delay, function() {
        var bg = chrome.extension.getBackgroundPage();
        document.body.className = bg.online ? 'online' : 'offline';
        if(bg.online) {
            buildLinks(bg);
            $.get('../templates/builder.html', function(html) {
                buildBuilders(bg, _.template(html));
                $('body').fadeIn(delay);
            });
            buildDate(bg);
        } else {
            $('links').html('');
            $('builders').html('');
            var msg = document.getElementById('date');
            if(!bg.lastXHR || !bg.lastXHR.status) {
                msg.innerHTML = chrome.i18n.getMessage('extEmptyLabel');
            } else {
                msg.innerHTML = bg.lastXHR.status + ': ' + bg.lastXHR.statusText;
            }
            $('body').fadeIn(delay);
        }
    });
}

function onClickStep(builderName, buildNum, stepName) {
    var bg = chrome.extension.getBackgroundPage();
    var url = bg.baseUrl + encodeURI('/builders/'+builderName+'/builds/'+buildNum+'/steps/'+stepName);
    var args = {url : url, selected : true};
    chrome.tabs.create(args);
}

window.onload = function() {
    onBuildbotUpdate(0);
};