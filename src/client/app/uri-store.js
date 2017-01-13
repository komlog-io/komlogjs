import PubSub from 'pubsub-js';
import $ from 'jquery';
import {topics, nodes} from './types.js';

class UriStore {
    constructor () {
        this.minUriRequestIntervalms = 0;
        this.minSharedWithMeRequestIntervalms = 60000;
        this._localIndex={uriIndex:{},idIndex:{}}
        this._remoteIndices={}
        this._sharedUrisWithMe={}
        this._lastUriRequestms = 0;
        this._lastSharedWithMeRequestms = 0;

        var subscribedTopics = [
            topics.URI_ACTION_REQUEST,
            topics.URI_REQUEST,
            topics.SHARED_URIS_WITH_ME_REQUEST,
        ];

        this.subscriptionTokens = subscribedTopics.map( topic => {
            return {
                token:PubSub.subscribe(topic,this.subscriptionHandler),
                msg:topic
            }
        });

    }

    subscriptionHandler (msg, data) {
        switch (msg) {
            case topics.URI_REQUEST:
                processMsgUriReq(data);
                break;
            case topics.URI_ACTION_REQUEST:
                processMsgUriActionReq(data);
                break;
            case topics.SHARED_URIS_WITH_ME_REQUEST:
                processMsgSharedUrisWithMeReq(data);
                break;
        }
    }

    getSharedUrisWithMe ({force} = {}) {
        var now = new Date().getTime();
        var elapsed = now - this._lastSharedWithMeRequestms;
        if (force || elapsed > this.minSharedWithMeRequestIntervalms) {
            var promise = new Promise ( (resolve, reject) => {
                $.ajax({
                    url: '/var/uri/sharedwithme',
                    dataType: 'json',
                })
                .done( data => {
                    this._lastSharedWithMeRequestms = now;
                    var result = this.storeSharedUrisWithMe(data);
                    if (result.modified) {
                        var topic = topics.SHARED_URIS_WITH_ME_UPDATE;
                        PubSub.publish(topic,{});
                    }
                    resolve(this._sharedUrisWithMe);
                }).
                fail( data => {
                    reject(data);
                });
            });
            return promise;
        } else {
            return Promise.resolve(this._sharedUrisWithMe);
        }
    }

    requestUri ({uri, owner}={}) {
        if (owner != undefined) {
            var p_uri = owner+":"+uri;
        } else {
            var p_uri = uri;
        }
        var parameters={'uri':p_uri};
        return $.ajax({
            url: '/var/uri/',
            dataType: 'json',
            data: parameters,
        });
    }

    getNodeInfoByUri ({uri, owner}={}) {
        var now = new Date().getTime();
        var elapsed = now - this._lastUriRequestms;
        var index, indexKey;
        if (owner == undefined) {
            index = this._localIndex;
        } else {
            index = this._remoteIndices[owner];
        }
        if (uri == '' && owner == undefined) {
            indexKey = '.';
        } else {
            indexKey=uri;
        }
        if (!(index && index.hasOwnProperty('uriIndex') && index.uriIndex.hasOwnProperty(indexKey)) || elapsed > this.minUriRequestIntervalms){
            var promise = new Promise ( (resolve,reject) => {
                var req = this.requestUri({uri:uri, owner:owner});
                req.done( data => {
                    this._lastUriRequestms = new Date().getTime();
                    this.storeData({data:data, owner:owner});
                    if (!index) {
                        index = this._remoteIndices[owner];
                    }
                    resolve(index.uriIndex[indexKey]);
                }).fail( (jqXHR, textStatus) => {
                    this.deleteNodeInfoByUri({uri:uri, owner:owner});
                    resolve(null);
                });
            });
            return promise;
        } else {
            return index.uriIndex[indexKey];
        }
    }

    getNodeInfoById ({id, owner}={}) {
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

    deleteNodeInfoByUri ({uri, owner}={}) {
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

    storeData ({data, owner}={}) {
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
                    this._remoteIndices[owner]={uriIndex:{},idIndex:{}};
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
                    this.storeData({data:data.children[i], owner:owner});
                }
            }
        }
    }

    storeSharedUrisWithMe (data) {
        var result = {};
        var actualUsers = Object.keys(this._sharedUrisWithMe);
        var newUsers = Object.keys(data);
        var addedSome = newUsers.some( user => actualUsers.indexOf(user) < 0);
        if (addedSome) {
            result.modified = true;
        }
        if (!result.modified) {
            var removedSome = actualUsers.some( user => newUsers.indexOf(user) < 0);
            if (removedSome) {
                result.modified = true;
            }
        }
        if (!result.modified) {
            var addedSomeUri = newUsers.some ( user => {
                return data[user].some( uri => this._sharedUrisWithMe[user].indexOf(uri) < 0);
            });
            if (addedSomeUri) {
                result.modified = true;
            }
        }
        if (!result.modified) {
            var removedSomeUri = newUsers.some ( user => {
                return this._sharedUrisWithMe[user].some ( uri => data[user].indexOf(uri) < 0);
            });
            if (removedSomeUri) {
                result.modified = true;
            }
        }
        if (result.modified) {
            this._sharedUrisWithMe = data;
        }
        return result;
    }

}

let uriStore = new UriStore();

function getNodeInfoByUri(uri,owner) {
    return uriStore.getNodeInfoByUri({uri:uri, owner:owner});
}

function getNodeInfoById(id,owner) {
    return uriStore.getNodeInfoById({id:id, owner:owner});
}


function processMsgUriReq (data) {
    uriStore.getNodeInfoByUri({uri:data.uri, owner:data.owner});
}

function processMsgUriActionReq (data) {
    var info = uriStore.getNodeInfoById({id:data.id, owner:data.owner});
    if (info.hasOwnProperty('type')) {
        switch (info.type) {
            case nodes.DATAPOINT:
                PubSub.publish(topics.LOAD_SLIDE,{pid:info.id});
                break;
            case nodes.DATASOURCE:
                PubSub.publish(topics.LOAD_SLIDE,{did:info.id});
                break;
            case nodes.WIDGET:
                PubSub.publish(topics.LOAD_SLIDE,{wid:info.id});
                break;
            case nodes.VOID:
                PubSub.publish(topics.URI_REQUEST,{uri:info.uri,owner:info.owner});
                break;
            default:
                console.log('Invalid node type');
        }
    }
}

function processMsgSharedUrisWithMeReq (data) {
    uriStore.getSharedUrisWithMe();
}

function getSharedUrisWithMe () {
    return uriStore.getSharedUrisWithMe();
}

export {
    getNodeInfoByUri,
    getSharedUrisWithMe
}
