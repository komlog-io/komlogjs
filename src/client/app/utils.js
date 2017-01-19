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

export {
    downloadFile,
    getCookie
}
