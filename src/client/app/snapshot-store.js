import PubSub from 'pubsub-js';
import $ from 'jquery';
import {topics} from './types.js';
import {getCookie} from './utils.js';

class SnapshotStore {
    constructor () {
        this.minConfigRequestIntervalms = 300000;

        this._snapshotConfig = {};
        this._lastConfigUpdate = {};
        this.subscriptionTokens = [];

        var subscribedTopics = [
            topics.SNAPSHOT_CONFIG_REQUEST,
            topics.DELETE_SNAPSHOT,
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
            case topics.SNAPSHOT_CONFIG_REQUEST:
                processMsgSnapshotConfigRequest(data);
                break;
            case topics.DELETE_SNAPSHOT:
                processMsgDeleteSnapshot(data);
                break;
        }
    }

    updateLastConfigUpdate (nid) {
        var now=new Date().getTime();
        this._lastConfigUpdate[nid] = now;
    }

    getLastConfigUpdate (nid) {
        if (this._lastConfigUpdate.hasOwnProperty(nid)) {
            return this._lastConfigUpdate[nid];
        } else {
            return 0;
        }
    }

    getConfig (nid, tid) {
        var now=new Date().getTime();
        var elapsed = now - this.getLastConfigUpdate(nid);
        if ( elapsed > this.minConfigRequestIntervalms) {
            var config;
            var parameters = {};
            if (tid) {
                parameters={t:tid};
            }
            var promise = new Promise( (resolve, reject) => {
                $.ajax({
                    url: '/etc/sn/'+nid,
                    dataType: 'json',
                    data: parameters,
                })
                .done( data => {
                    var result = this.storeConfig(nid, data);
                    this.updateLastConfigUpdate(nid);
                    if (result.modified == true) {
                        var topic = topics.SNAPSHOT_CONFIG_UPDATE(nid);
                        PubSub.publish(topic,nid);
                    }
                    config = data;
                    resolve(config);
                });
            });
            return promise;
        } else {
            var config = this._snapshotConfig[nid];
            return Promise.resolve(config);
        }
    }

    storeConfig (nid, data) {
        var result = {};
        if (!this._snapshotConfig.hasOwnProperty(nid)) {
            this._snapshotConfig[nid]=data;
            result.modified = true;
        }
        else {
            var differs = Object.keys(data).some( key => {
                return !(this._snapshotConfig[nid].hasOwnProperty(key) && this._snapshotConfig[nid][key] == data[key]);
            });
            if (differs) {
                this._snapshotConfig[nid] = data;
                result.modified = true;
            }
        }
        return result;
    }

    deleteSnapshot (nid) {
        var response;
        return new Promise ( (resolve,reject) => {
            if (nid) {
                $.ajax({
                    url: '/etc/ds/'+did,
                    dataType: 'json',
                    type: 'DELETE',
                    beforeSend: function(request) {
                        request.setRequestHeader("X-XSRFToken", getCookie('_xsrf'));
                    },
                })
                .done( data => {
                    if (this._lastConfigUpdate.hasOwnProperty(nid)) {
                        delete this._lastConfigUpdate[nid];
                    }
                    if (this._snapshotConfig.hasOwnProperty(nid)) {
                        delete this._snapshotConfig[nid];
                    }
                    response = data;
                    resolve(response);
                });
            }
        });
    }

}

let snapshotStore = new SnapshotStore();

function getSnapshotConfig (nid, tid) {
    return snapshotStore.getConfig(nid, tid);
}

function processMsgSnapshotConfigRequest (msgData) {
    if (msgData.nid) {
        snapshotStore.getConfig(msgData.nid, msgData.tid);
    }
}

function processMsgDeleteSnapshot(msgData) {
    snapshotStore.deleteSnapshot(msgData.nid)
    .then( data => {
        PubSub.publish(topics.CLOSE_SLIDE,{lid:msgData.nid});
    })
    .catch( data => {
        payload = {
            message:{type:'danger',message:'Error deleting datasource. Code: '+data.responseJSON.error},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE(),payload);
    });
}

export {
    getSnapshotConfig
}
