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

export {
    downloadFile,
    getCookie,
    isJSON,
    inJSONString,
}
