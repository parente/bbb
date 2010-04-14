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
    var parent = $('#links');
    $.each(links, function(key, value) {
        var a = $(document.createElement('a'))
            .attr({
                href : bg.baseUrl + key,
                target : '_blank'
            })
            .text(chrome.i18n.getMessage(value));
        parent.append(a);
        parent.append(' | ');
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
            buildNum : -1
        };
        // name of the builder
        args.name = key;
        // status as css class
        args.className = info.state;
        if(lastBuild && lastBuild.text) {
            if(lastBuild.text[0] == 'warnings') {
                args.className += ' warnings';
            } else if(lastBuild.text[0] == 'failed') {
                args.className += ' failure';
            } else if(lastBuild.results == 0) {
                args.className += ' success';
            }
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
        }
        var html = template(args);
        buildersNode.append(html);
        /*
        var div = document.createElement('div');
        div.className = 'builder';
        var name = document.createElement('a');
        name.className = 'builderName';
        name.href = bg.baseUrl + '/builders/'+key;
        name.target = '_blank';
        name.textContent = key;
        div.appendChild(name);
        div.appendChild(document.createElement('br'));
        if(lastBuild) {
            var status = document.createElement('a');
            status.className = 'builderStatus';
            status.href = bg.baseUrl + '/builders/'+key+'/builds/'+lastBuild.number;
            status.target = '_blank';
            // look for fetched rev
            var rev = '?';
            for(var i=0; i < lastBuild.properties.length; i++) {
                var prop = lastBuild.properties[i];
                if(prop[0] == 'got_revision') {
                    rev = prop[1];
                    break;
                }
            }
            status.textContent = 'r' + rev + ': ';
            if(lastBuild.currentStep) {
                status.textContent += lastBuild.currentStep.text.join(' ');
            } else {
                status.textContent += lastBuild.text.join(' ');
            }
            div.appendChild(status);
            if(lastBuild.eta !== null) {
                div.appendChild(document.createElement('br'));
                var eta = document.createElement('span');
                var min = lastBuild.eta / 60.0;
                eta.textContent = 'ETA: '
                eta.textContent += (min < 1) ? '< 1 min' : Math.round(min) + ' min';
                div.appendChild(eta);
            }
        }
        var className = info.state;
        if(lastBuild && lastBuild.text) {
            if(lastBuild.text[0] == 'warnings') {
                className += ' warnings';
            } else if(lastBuild.text[0] == 'failed') {
                className += ' failure';
            } else if(lastBuild.results == 0) {
                className += ' success';
            }
        } 
        div.className = className;
        buildersNode.appendChild(div);*/
    }
}

window.onload = function() {
    _.templateSettings = {
        start       : '{{',
        end         : '}}',
        interpolate : /\{\{(.+?)\}\}/g
    };
    var bg = chrome.extension.getBackgroundPage();
    document.body.className = bg.online ? 'online' : 'offline';
    if(bg.baseUrl) {
        buildLinks(bg);
        $.get('../templates/builder.html', function(html) {
            buildBuilders(bg, _.template(html));
        });
        buildDate(bg);
    } else {
        var msg = document.getElementById('date');
        msg.innerHTML = chrome.i18n.getMessage('extEmptyLabel');
    }
};