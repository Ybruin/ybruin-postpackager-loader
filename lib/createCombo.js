/*生成并替换链接*/
'use strict';

var path = require('path');
var fs = require('fs');
var log = require('./log.js');
var compConfPath = path.resolve('components.json');
var compConf = fs.readFileSync(compConfPath, 'utf-8');
var compConfJson = JSON.parse(compConf);
var slice = Array.prototype.slice;
var rStyle = /<!--([\s]*)STYLE_COMP_PLACEHOLDER([\s]*)-->/ig;
var rScript = /<!--([\s]*)SCRIPT_COMP_PLACEHOLDER([\s]*)-->/ig;
var rEntry = /<!--([\s]*)SCRIPT_ENTRY_PLACEHOLDER([\s]*)-->/ig;
var argv = fis.get('options');

var settings = {
    ret: {},
    file: {},
    alias: {},
    deps: {},
    maxUrlLength: 1000,
    staticDomain: '',
    compDomain: '',
    mod: '',
    entry: []
};

var ycombo = function(ret, fileId, deps, config) {
    settings.ret = ret || {};
    settings.deps = deps || {};
    settings.file = fis.project.lookup(fileId).file;
    settings.staticDomain = config.domain;
    settings.compDomain = config.compDomain && config.compDomain + '/components/??';
    settings.mod = config.useModule && config.useModule.toLowerCase();
    settings.entry = [];
    settings.entry.push('js/' + settings.file.filename + '.js');
    var reactor = new Reactor();
};

ycombo.getHash = function(ids) {
    var content = '';
    if (typeof ids == 'string') {
        ids = ids.split(' ');
    }
    each(ids, function(value, key) {
        var filePath = path.resolve(value);
        if (fis.util.isFile(filePath)) {
            content += fs.readFileSync(filePath, 'utf-8');
        }
    })
    return fis.util.md5(content);
};

ycombo.getScript = function(url, hash) {
    var hash = hash == undefined ? '' : '?' + hash;
    var scriptArrs = [
        '<script',
        'src="' + url + hash + '"',
        'type="text/javascript"',
        '></script>'
    ];
    return url ? scriptArrs.join(' ') : '';
};

ycombo.getLink = function(url, hash) {
    var hash = hash == undefined ? '' : '?' + hash;
    var linkArrs = [
        '<link',
        'rel="stylesheet"',
        'type="text/css"',
        'href="' + url + hash + '"',
        '/>'
    ];
    return url ? linkArrs.join(' ') : '';
};
//组件js替换
ycombo.replaceCompJs = function(context) {
        var file = settings.ret.src['/' + settings.file.id];
        var content = file.getContent();
        //替换文件内容
        content = content.replace(rScript, context);
        file.setContent(content);
    }
    //组件css替换
ycombo.replaceCompCss = function(context) {
        var file = settings.ret.src['/' + settings.file.id];
        var content = file.getContent();
        //替换文件内容
        content = content.replace(rStyle, context);
        file.setContent(content);
    }
    //非组件替换
ycombo.replaceJs = function(context) {
    var replaceContext = context;
    var file = settings.ret.src['/' + settings.file.id];
    var content = file.getContent();
    //替换文件内容
    if (replaceContext) {
        switch (settings.mod) {
            case 'amd':
                replaceContext += '<script>requirejs(["' + 'js/' + settings.file.filename + '"])</script>';
                break;
            case 'cmd':
                replaceContext += '<script>seajs.use("' + 'js/' + settings.file.filename + '")</script>';
                break;
            case 'commonjs':
                replaceContext += '<script>require.async(["' + 'js/' + settings.file.filename + '"])</script>';
                break;
        }
    }

    content = content.replace(rEntry, replaceContext);
    file.setContent(content);
}

var Reactor = function(names, callback) {
    this.length = 0;
    this.depends = {};
    if (fs.existsSync(path.resolve(settings.entry[0]))) {
        this.push.apply(this, settings.entry);
        this.run();
    } else {
        log.error('缺少入口文件');
    }
};

Reactor.prototype = {
    constructor: Reactor,
    //把依赖的组件和非组件分别加入数组
    push: function() {
        var that = this;
        var args = slice.call(arguments);

        each(args, function(arg) {
            var id = that.alias(arg);
            var type = fileType(id);
            var isComp = fileComponents(id);
            var res = {
                id: id
            };
            type = type === 'css' && isComp ? 'compcss' : (type === 'js' && isComp ? 'compjs' : type);

            that.push.apply(that, settings.deps[id]);

            if ((type === 'css') || (type === 'js') || (type === 'compcss') || (type === 'compjs')) {
                (that.depends[type] || (that.depends[type] = [])).push(res);
                ++that.length;
            }
        });
    },
    run: function() {
        var that = this,
            depends = this.depends;
        if (this.length === 0) return;
        //把组件数组的文件拼接
        function resourceCombo(resdeps, type) {
            var urlLength = 0;
            var idsHash = {};
            var ids = [];
            var url = [];
            if (resdeps.length == 0) {
                if (type == 'css') {
                    ycombo.replaceCompCss('');
                } else if (type == 'js') {
                    ycombo.replaceCompJs('');
                }
            }
            each(resdeps, function(res, i) {
                if (urlLength + res.id.length < settings.maxUrlLength || true) {
                    urlLength += res.id.length;
                    if (!idsHash[res.id]) {
                        idsHash[res.id] = true;
                        ids.push(res.id);
                    }
                } else {
                    if (type == 'css') {
                        ycombo.replaceCompCss(genUrl(ids));
                    } else if (type == 'js') {
                        ycombo.replaceCompJs(genUrl(ids));
                    }
                    urlLength = res.id.length;
                    ids = [res.id];
                }
                if (i === resdeps.length - 1) {
                    if (type == 'css') {
                        ycombo.replaceCompCss(genUrl(ids));
                    } else if (type == 'js') {
                        ycombo.replaceCompJs(genUrl(ids));
                    }
                }
            });
        }
        //把非组件数组的文件拼接
        function resourceLoad(resdeps) {
            var ids = [];
            each(resdeps, function(res, i) {
                ids.push(res.id);
            })
            ycombo.replaceJs(genJsUrl(ids));
        }

        resourceLoad(depends.js || []);
        resourceCombo(depends.compcss || [], 'css');
        resourceCombo(depends.compjs || [], 'js');
    },
    alias: function(name, alias) {
        var aliasMap = settings.alias;

        if (arguments.length > 1) {
            aliasMap[name] = alias;
            return settings.alias(name);
        }

        while (aliasMap[name] && name !== aliasMap[name]) {
            switch (type(aliasMap[name])) {
                case 'function':
                    name = aliasMap[name](name);
                    break;
                case 'string':
                    name = aliasMap[name];
                    break;
            }
        }
        return name;
    }
};

function type(obj) {
    var t;
    if (obj == null) {
        t = String(obj);
    } else {
        t = Object.prototype.toString.call(obj).toLowerCase();
        t = t.substring(8, t.length - 1);
    }
    return t;
};

var TYPE_RE = /\.(js|css)(?=[?&,]|$)/i;

function fileType(str) {
    var ext = 'js';
    str.replace(TYPE_RE, function(m, $1) {
        ext = $1;
    });
    if (ext !== 'js' && ext !== 'css') ext = 'unknown';
    return ext;
}

var TYPE_COMP = /(components)\/.+\.(js|css)/i;

function fileComponents(str) {
    var ext = false;
    str.replace(TYPE_COMP, function(m, $1) {
        if ($1 == 'components') {
            ext = true;
        }
    });
    return ext;
}
//拼接组件方法
function genUrl(ids) {
    var url = settings.compDomain;
    var comboIds = [];
    var replaceContext = '';

    if (type(ids) === 'string') ids = ids.split(' ');

    if (settings.compDomain === void 0) {
        var file = fis.project.lookup(ids[0]).file;
        var release = file.release.split(file.id)[0];

        each(ids, function(id, i) {
            var url = release + id;
            var hash = ycombo.getHash(id);
            var t = fileType(url),
                isScript = t === 'js',
                isCss = t === 'css';
            if (isScript) {
                replaceContext += ycombo.getScript(url, hash) + '\n\t';
            } else if (isCss) {
                replaceContext += ycombo.getLink(url, hash) + '\n\t';
            }
        })
    } else {
        each(ids, function(value, key) {
            var compName = value.split(path.sep)[1];
            if (compConfJson[compName] != undefined) {
                ids[key] = value.replace(/components\/(\S+)\/(.+)/, '$1/' + compConfJson[compName] + '/$2');
            } else {
                ids[key] = value.replace(/components\/(\S+)\/(.+)/, '$1/$2');
            }

        })

        switch (type(url)) {
            case 'string':
                url = url + ids.join(',');
                break;
            case 'function':
                url = url(ids);
                break;
            default:
                url = ids.join(',');
        }

        var t = fileType(url),
            isScript = t === 'js',
            isCss = t === 'css';
        if (isScript) {
            replaceContext = ycombo.getScript(url);
        } else if (isCss) {
            replaceContext = ycombo.getLink(url);
        }

    }

    return replaceContext;
}
//拼接非组件JS方法
function genJsUrl(ids) {
    if (type(ids) === 'string') ids = ids.split(' ');

    var file = fis.project.lookup(ids[0]).file;
    var release = path.dirname(file.release) || '';
    var comboIds = [];
    var replaceContext = '';

    each(ids, function(id, i) {
        var file = fis.project.lookup(id).file;
        comboIds.push(file.basename);
    })

    if (comboIds.length > 0) {
        if (settings.staticDomain === void 0) {
            each(comboIds, function(id, i) {
                var url = release + id;
                var hash = ycombo.getHash(id);
                var t = fileType(url);
                var isScript = t === 'js';
                if (isScript) {
                    replaceContext += ycombo.getScript(url, hash) + '\n\t';
                }
            })
        } else {
            var url = settings.staticDomain;
            var hash = ycombo.getHash(comboIds);
            var t = fileType(url);
            var isScript = t === 'js';
            if (isScript) {
                switch (type(url)) {
                    case 'string':
                        url = url + release + comboIds.join(',') + '?' + hash;
                        break;
                    case 'function':
                        url = url(comboIds);
                        break;
                    default:
                        url = comboIds.join(',');
                }
                replaceContext = ycombo.getScript(url, hash) + '\n\t';
            }
        }
    }
    return replaceContext;
}

function each(obj, iterator, context) {
    if (typeof obj !== 'object') return;

    var i, l, t = type(obj);
    context = context || obj;
    if (t === 'array' || t === 'arguments' || t === 'nodelist') {
        for (i = 0, l = obj.length; i < l; i++) {
            if (iterator.call(context, obj[i], i, obj) === false) return;
        }
    } else {
        for (i in obj) {
            if (obj.hasOwnProperty(i)) {
                if (iterator.call(context, obj[i], i, obj) === false) return;
            }
        }
    }
};

module.exports = ycombo