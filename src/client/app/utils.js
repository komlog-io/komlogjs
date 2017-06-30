function downloadFile (filename, content, type) {
    var a = document.createElement('a');
    a.href = window.URL.createObjectURL(new Blob([content], {type: type}));
    a.download = filename;
    a.style = "display: none";
    document.body.appendChild(a)
    a.click();
    window.URL.revokeObjectURL(a.href);
}

function getCookie(name) {
    var r = document.cookie.match("\\b" + name + "=([^;]*)\\b");
    return r ? r[1] : undefined;
}

function isJSON(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function inJSONString(str, pos) {
    var count = 0;
    var p = 0;
    while (true) {
        p = str.indexOf('"', p)
        if (p >= pos || p == -1) {
            break;
        } else {
            var p0=str[p]
            var p1=str[p-1]
            var p2=str[p-2]
            if (!(p >1 && str[p-1] == "\\")) {
                count++;
            }
        }
        ++p;
    }
    return (count % 2? true : false);
}

function literalShortener(literals) {
    var objType = Object.prototype.toString.apply(literals)
    if (objType != '[object Array]' || literals.length < 2) {
        return null;
    }
    var splited = {}
    literals.forEach ( literal => {
        splited[literal] = literal.split('.');
    });
    for (var i=0,j=splited[literals[0]].length;i<j;i++) {
        var field = splited[literals[0]][i];
        var remove = Object.keys(splited).every(literal => {
            if (splited[literal].length > i+1 && splited[literal][i] == field) {
                return true;
            } else {
                return false;
            }
        });
        if (remove) {
            Object.keys(splited).forEach( literal => splited[literal].splice(i,1));
            i--;
        } else {
            break;
        }
    }
    for (var i=splited[literals[0]].length-1,j=0;i>=j;i--) {
        var field = splited[literals[0]][i];
        var remove = Object.keys(splited).every(literal => {
            if (splited[literal].length > 1 && splited[literal][i] == field) {
                return true;
            } else {
                return false;
            }
        });
        if (remove) {
            Object.keys(splited).forEach( literal => splited[literal].splice(i,1));
        } else {
            break;
        }
    }
    Object.keys(splited).forEach ( literal => {
        splited[literal]=splited[literal].join('.');
    });
    return splited;
}

export {
    downloadFile,
    getCookie,
    isJSON,
    inJSONString,
    literalShortener,
}
