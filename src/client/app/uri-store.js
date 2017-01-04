import PubSub from 'pubsub-js';
import $ from 'jquery';

class UriStore {
    constructor () {
        this._localIndex={uriIndex:{},idIndex:{}}
        this._remoteIndices={}
        this._sharedUrisWithMe={}
        this.subscriptionTokens = [];
        this.subscriptionTokens.push({token:PubSub.subscribe('uriReq', this.subscriptionHandler.bind(this)),msg:'UriReq'});
        this.subscriptionTokens.push({token:PubSub.subscribe('uriActionReq', this.subscriptionHandler.bind(this)),msg:'UriActionReq'});
        this.subscriptionTokens.push({token:PubSub.subscribe('sharedUrisWithMeReq', this.subscriptionHandler.bind(this)),msg:'SharedUrisWithMeReq'});
    }

    subscriptionHandler (msg, data) {
        switch (msg) {
            case 'uriReq':
                processMsgUriReq(data);
                break;
            case 'uriActionReq':
                processMsgUriActionReq(data);
                break;
            case 'sharedUrisWithMeReq':
                processMsgSharedUrisWithMeReq(data);
                break;
        }
    }

    getSharedUris () {
        return this._sharedUrisWithMe;
    }

    setSharedUris (data) {
        return this._sharedUrisWithMe=data;
    }

    getNodeInfoByUri (uri, owner) {
        if (owner == undefined) {
            if (uri == '') {
                return this._localIndex.uriIndex['.'];
            } else {
                return this._localIndex.uriIndex[uri];
            }
        } else {
            if (this._remoteIndices.hasOwnProperty(owner)) {
                return this._remoteIndices[owner].uriIndex[uri];
            } else {
                return null;
            }
        }
    }

    getNodeInfoById (id, owner) {
        if (owner == undefined) {
            return this._localIndex.idIndex[id];
        } else {
            if (this._remoteIndices.hasOwnProperty(owner)) {
                return this._remoteIndices[owner].idIndex[id];
            } else {
                return null;
            }
        }
    }

    deleteNodeInfoByUri (uri, owner) {
        if (owner == undefined) {
            var uriIndex = this._localIndex.uriIndex;
            var idIndex = this._localIndex.idIndex;
            if (uri == '') {
                var uriKey = '.';
                var parentKey = null;
            } else {
                var uriKey = uri;
                var split = uri.split('.');
                var parentKey = split.slice(0,split.length-1).join('.');
                if (parentKey == '') {
                    parentKey = '.';
                }
            }
        } else {
            if (this._remoteIndices.hasOwnProperty(owner)) {
                var uriIndex = this._remoteIndices[owner].uriIndex;
                var idIndex = this._remoteIndices[owner].idIndex;
                var uriKey = uri;
                var split = uri.split('.');
                var parentKey = split.slice(0,split.length-1).join('.');
                if (parentKey == '') {
                    parentKey = '.';
                }
            } else {
                var uriIndex = null;
            }
        }
        if (uriIndex != null) {
            if (uriIndex.hasOwnProperty(uriKey)) {
                var info = uriIndex[uriKey];
                if (info.hasOwnProperty('id') && idIndex.hasOwnProperty(info.id)) {
                    delete idIndex[info.id];
                }
                delete uriIndex[uriKey];
            }
            if (parentKey != null && uriIndex.hasOwnProperty(parentKey)) {
                var parentInfo = uriIndex[parentKey];
                var parentWithoutNode = uriIndex[parentKey].children.filter(value => value != uri );
                uriIndex[parentKey].children = parentWithoutNode;
                if (parentInfo.hasOwnProperty('id') && idIndex.hasOwnProperty(parentInfo.id)) {
                    idIndex[parentInfo.id].children = parentWithoutNode;
                }
            }
        }
    }

    storeData (data, owner) {
        if (data.hasOwnProperty('name') && data.hasOwnProperty('id')) {
            if (data.name == '') {
                var uriKey='.';
            } else {
                var uriKey = data.name;
            }
            if (owner == undefined) {
                var uriIndex = this._localIndex.uriIndex;
                var idIndex = this._localIndex.idIndex;
            } else {
                if (!this._remoteIndices.hasOwnProperty(owner)) {
                    this._remoteIndices[owner]={'uriIndex':{},'idIndex':{}};
                }
                var uriIndex = this._remoteIndices[owner].uriIndex;
                var idIndex = this._remoteIndices[owner].idIndex;
            }
            uriIndex[uriKey]={uri:data.name,type:data.type,id:data.id,children:[]};
            idIndex[data.id]={uri:data.name,type:data.type,id:data.id,children:[]};
            if (data.hasOwnProperty('children')) {
                for (var i=0;i<data.children.length;i++) {
                    uriIndex[uriKey].children.push(data.children[i].name);
                    idIndex[data.id].children.push(data.children[i].id);
                }
                for (var i=0;i<data.children.length;i++) {
                    this.storeData(data.children[i], owner);
                }
            }
        }
    }
}

let uriStore = new UriStore();

function processMsgUriReq (data) {
    var uri=data.uri;
    var owner = data.owner;
    requestUri(uri, owner);
}

function requestUri (uri, owner) {
    if (owner != undefined) {
        var p_uri = owner+":"+uri;
    } else {
        var p_uri = uri;
    }
    var parameters={'uri':p_uri};
    $.ajax({
        url: '/var/uri/',
        dataType: 'json',
        data: parameters,
    })
    .done( data => {
        uriStore.storeData(data, owner);
        sendUriUpdate(uri, owner);
    }).fail( (jqXHR, textStatus) => {
        uriStore.deleteNodeInfoByUri(uri, owner);
        sendUriUpdate(uri, owner);
    });
}

function sendUriUpdate (uri, owner) {
    if (owner != undefined) {
        var msg = 'remoteUriUpdate'+'.'+owner;
    } else {
        var msg = 'localUriUpdate';
    }
    var data={'uri':uri};
    PubSub.publish(msg,data);
}

function getUriGraph (rootUri, numVertices) {
    return uriStore._data;
}


function processMsgUriActionReq (data) {
    var node=uriStore.getNodeInfoById(data.id, data.owner);
    if (node.hasOwnProperty('type')) {
        if (node.type=='p') {
            PubSub.publish('loadSlide',{pid:node.id});
        } else if (node.type=='d') {
            PubSub.publish('loadSlide',{did:node.id});
        } else if (node.type=='w') {
            PubSub.publish('loadSlide',{wid:node.id});
        } else if (node.type=='v') {
            PubSub.publish('uriReq',{uri:node.uri,owner:node.owner});
        }
    }
}

function processMsgSharedUrisWithMeReq (data) {
    requestSharedUrisWithMe();
}

function requestSharedUrisWithMe () {
    $.ajax({
        url: '/var/uri/sharedwithme',
        dataType: 'json',
    })
    .done( data => {
        uriStore.setSharedUris(data);
        sendSharedUrisWithMeUpdate();
    });
}

function sendSharedUrisWithMeUpdate () {
    var msg = 'sharedUrisWithMeUpdate';
    var data={};
    PubSub.publish(msg,data);
}

function getSharedUrisWithMe () {
    return uriStore.getSharedUris();
}

export {
    uriStore,
    getSharedUrisWithMe
}

/*
function UriStore () {
    this._localIndex={uriIndex:{},idIndex:{}}
    this._remoteIndices={}
    this._sharedUrisWithMe={}
    this.subscriptionTokens = [];
    this.subscriptionTokens.push({token:PubSub.subscribe('uriReq', this.subscriptionHandler.bind(this)),msg:'UriReq'});
    this.subscriptionTokens.push({token:PubSub.subscribe('uriActionReq', this.subscriptionHandler.bind(this)),msg:'UriActionReq'});
    this.subscriptionTokens.push({token:PubSub.subscribe('sharedUrisWithMeReq', this.subscriptionHandler.bind(this)),msg:'SharedUrisWithMeReq'});
}

uriStore.prototype = {
    subscriptionHandler: function (msg, data) {
        switch (msg) {
            case 'uriReq':
                processMsgUriReq(data)
                break;
            case 'uriActionReq':
                processMsgUriActionReq(data)
                break;
            case 'sharedUrisWithMeReq':
                processMsgSharedUrisWithMeReq(data)
                break;
        }
    },
    getSharedUris: function () {
        return this._sharedUrisWithMe;
    },
    setSharedUris: function (data) {
        return this._sharedUrisWithMe=data;
    },
    getNodeInfoByUri: function (uri, owner) {
        if (owner == undefined) {
            if (uri == '') {
                return this._localIndex.uriIndex['.']
            } else {
                return this._localIndex.uriIndex[uri]
            }
        } else {
            if (this._remoteIndices.hasOwnProperty(owner)) {
                return this._remoteIndices[owner].uriIndex[uri]
            } else {
                return null
            }
        }
    },
    getNodeInfoById: function (id, owner) {
        if (owner == undefined) {
            return this._localIndex.idIndex[id]
        } else {
            if (this._remoteIndices.hasOwnProperty(owner)) {
                return this._remoteIndices[owner].idIndex[id]
            } else {
                return null
            }
        }
    },
    deleteNodeInfoByUri: function (uri, owner) {
        if (owner == undefined) {
            var uriIndex = this._localIndex.uriIndex;
            var idIndex = this._localIndex.idIndex;
            if (uri == '') {
                var uriKey = '.';
                var parentKey = null
            } else {
                var uriKey = uri;
                var split = uri.split('.');
                var parentKey = split.slice(0,split.length-1).join('.')
                if (parentKey == '') {
                    parentKey = '.';
                }
            }
        } else {
            if (this._remoteIndices.hasOwnProperty(owner)) {
                var uriIndex = this._remoteIndices[owner].uriIndex;
                var idIndex = this._remoteIndices[owner].idIndex;
                var uriKey = uri
                var split = uri.split('.');
                var parentKey = split.slice(0,split.length-1).join('.')
                if (parentKey == '') {
                    parentKey = '.';
                }
            } else {
                var uriIndex = null;
            }
        }
        if (uriIndex != null) {
            if (uriIndex.hasOwnProperty(uriKey)) {
                var info = uriIndex[uriKey];
                if (info.hasOwnProperty('id') && idIndex.hasOwnProperty(info.id)) {
                    delete idIndex[info.id];
                }
                delete uriIndex[uriKey];
            }
            if (parentKey != null && uriIndex.hasOwnProperty(parentKey)) {
                var parentInfo = uriIndex[parentKey];
                var parentWithoutNode = uriIndex[parentKey].children.filter(function(value) { return value != uri });
                uriIndex[parentKey].children = parentWithoutNode;
                if (parentInfo.hasOwnProperty('id') && idIndex.hasOwnProperty(parentInfo.id)) {
                    idIndex[parentInfo.id].children = parentWithoutNode;
                }
            }
        }
    },
    storeData: function (data, owner) {
        if (data.hasOwnProperty('name') && data.hasOwnProperty('id')) {
            if (data.name == '') {
                var uriKey='.';
            } else {
                var uriKey = data.name
            }
            if (owner == undefined) {
                var uriIndex = this._localIndex.uriIndex
                var idIndex = this._localIndex.idIndex
            } else {
                if (!this._remoteIndices.hasOwnProperty(owner)) {
                    this._remoteIndices[owner]={'uriIndex':{},'idIndex':{}}
                }
                var uriIndex = this._remoteIndices[owner].uriIndex
                var idIndex = this._remoteIndices[owner].idIndex
            }
            uriIndex[uriKey]={uri:data.name,type:data.type,id:data.id,children:[]}
            idIndex[data.id]={uri:data.name,type:data.type,id:data.id,children:[]}
            if (data.hasOwnProperty('children')) {
                for (var i=0;i<data.children.length;i++) {
                    uriIndex[uriKey].children.push(data.children[i].name)
                    idIndex[data.id].children.push(data.children[i].id)
                }
                for (var i=0;i<data.children.length;i++) {
                    this.storeData(data.children[i], owner)
                }
            }
        }
    }
};

var uriStore = new UriStore();

function processMsgUriReq (data) {
    uri=data.uri
    owner = data.owner
    requestUri(uri, owner)
}

function requestUri (uri, owner) {
    if (owner != undefined) {
        var p_uri = owner+":"+uri
    } else {
        var p_uri = uri
    }
    parameters={'uri':p_uri}
    $.ajax({
        url: '/var/uri/',
        dataType: 'json',
        data: parameters,
    })
    .done(function (data) {
        uriStore.storeData(data, owner)
        sendUriUpdate(uri, owner)
    }).fail(function (jqXHR, textStatus) {
        uriStore.deleteNodeInfoByUri(uri, owner)
        sendUriUpdate(uri, owner)
    });
}

function sendUriUpdate (uri, owner) {
    if (owner != undefined) {
        msg = 'remoteUriUpdate'+'.'+owner
    } else {
        msg = 'localUriUpdate'
    }
    data={'uri':uri}
    PubSub.publish(msg,data)
}

function getUriGraph (rootUri, numVertices) {
    return uriStore._data
}


function processMsgUriActionReq (data) {
    node=uriStore.getNodeInfoById(data.id, data.owner)
    if (node.hasOwnProperty('type')) {
        if (node.type=='p') {
            PubSub.publish('loadSlide',{pid:node.id})
        } else if (node.type=='d') {
            PubSub.publish('loadSlide',{did:node.id})
        } else if (node.type=='w') {
            PubSub.publish('loadSlide',{wid:node.id})
        } else if (node.type=='v') {
            PubSub.publish('uriReq',{uri:node.uri,owner:node.owner})
        }
    }
}

function processMsgSharedUrisWithMeReq (data) {
    requestSharedUrisWithMe();
}

function requestSharedUrisWithMe () {
    $.ajax({
        url: '/var/uri/sharedwithme',
        dataType: 'json',
    })
    .done(function (data) {
        uriStore.setSharedUris(data)
        sendSharedUrisWithMeUpdate()
    });
}

function sendSharedUrisWithMeUpdate () {
    msg = 'sharedUrisWithMeUpdate'
    data={}
    PubSub.publish(msg,data)
}

function getSharedUrisWithMe () {
    return uriStore.getSharedUris();
}

*/
