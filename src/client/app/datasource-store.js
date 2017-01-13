import PubSub from 'pubsub-js';
import $ from 'jquery';
import {topics} from './types.js';

class DatasourceStore {
    constructor () {
        this.minConfigRequestIntervalms = 300000;
        this.minDataRequestIntervalms = 30000;
        this.minSnapshotRequestIntervalms = 300000;
        this.activeLoop = true;

        this._datasourceConfig = {};
        this._datasourceData = {};
        this._snapshotData = {};

        this._registeredRequests = [];
        this.subscriptionTokens = [];

        this._lastConfigUpdate = {};
        this._lastDataUpdate = {};
        this._lastSnapshotDataUpdate = {};

        var subscribedTopics = [
            topics.DATASOURCE_DATA_REQUEST,
            topics.DATASOURCE_CONFIG_REQUEST,
            topics.LOAD_DATASOURCE_SLIDE,
            topics.SNAPSHOT_DS_DATA_REQUEST,
            topics.DELETE_DATASOURCE
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
            case topics.DATASOURCE_DATA_REQUEST:
                processMsgDatasourceDataRequest(data);
                break;
            case topics.DATASOURCE_CONFIG_REQUEST:
                processMsgDatasourceConfigRequest(data);
                break;
            case topics.LOAD_DATASOURCE_SLIDE:
                processMsgLoadDatasourceSlide(data);
                break;
            case topics.SNAPSHOT_DS_DATA_REQUEST:
                processMsgSnapshotDsDataRequest(data);
                break;
            case topics.DELETE_DATASOURCE:
                processMsgDeleteDatasource(data);
                break;
        }
    }

    updateLastConfigUpdate (did) {
        var now=new Date().getTime();
        this._lastConfigUpdate[did] = now;
    }

    updateLastDataUpdate (did) {
        var now=new Date().getTime();
        this._lastDataUpdate[did] = now;
    }

    getLastConfigUpdate (did) {
        if (this._lastConfigUpdate.hasOwnProperty(did)) {
            return this._lastConfigUpdate[did];
        } else {
            return 0;
        }
    }

    getLastDataUpdate (did) {
        if (this._lastDataUpdate.hasOwnProperty(did)) {
            return this._lastDataUpdate[did];
        } else {
            return 0;
        }
    }

    updateLastSnapshotDataUpdate (did,seq) {
        var now=new Date().getTime();
        if (!this._lastSnapshotDataUpdate.hasOwnProperty(did)) {
            this._lastSnapshotDataUpdate[did]={};
        }
        this._lastSnapshotDataUpdate[did][seq] = now;
    }

    getLastSnapshotDataUpdate (did, seq) {
        if (this._lastSnapshotDataUpdate[did] && this._lastSnapshotDataUpdate[did][seq]) {
            return this._lastSnapshotDataUpdate[did][seq];
        } else {
            return 0;
        }
    }

    getConfig ({did, force} = {}) {
        var now=new Date().getTime();
        var elapsed = now - this.getLastConfigUpdate(did);
        if ( force == true || elapsed > this.minConfigRequestIntervalms) {
            var config;
            var promise = new Promise( (resolve, reject) => {
                $.ajax({
                    url: '/etc/ds/'+did,
                    dataType: 'json',
                })
                .done( data => {
                    var result = this.storeConfig(did, data);
                    this.updateLastConfigUpdate(did);
                    if (result.modified == true) {
                        var topic = topics.DATASOURCE_CONFIG_UPDATE(did);
                        PubSub.publish(topic,did);
                    }
                    config = data;
                    resolve(config);
                });
            });
            return promise;
        } else {
            var config = this._datasourceConfig[did];
            return Promise.resolve(config);
        }
    }

    getData ({did, force}={}) {
        var now=new Date().getTime();
        var elapsed = now - this.getLastDataUpdate(did);
        if ( force == true || elapsed > this.minDataRequestIntervalms) {
            var data;
            var promise = new Promise( (resolve, reject) => {
                $.ajax({
                    url: '/var/ds/'+did,
                    dataType: 'json',
                })
                .done( response => {
                    var result = this.storeData(did, response);
                    this.updateLastDataUpdate(did);
                    if (result.modified == true) {
                        var topic = topics.DATASOURCE_DATA_UPDATE(did);
                        PubSub.publish(topic,did);
                    }
                    data = response;
                    resolve(data);
                });
            });
            return promise;
        } else {
            var data = this._datasourceData[did];
            return Promise.resolve(data);
        }
    }

    getSnapshotData (did, seq, tid) {
        var now=new Date().getTime();
        var elapsed = now - this.getLastSnapshotDataUpdate(did, seq);
        if ( elapsed > this.minSnapshotRequestIntervalms) {
            var data;
            var promise = new Promise( (resolve, reject) => {
                var requestParams={t:tid,seq:seq};
                $.ajax({
                    url: '/var/ds/'+did,
                    dataType: 'json',
                    data: requestParams,
                })
                .done( response => {
                    var result = this.storeSnapshotData(did, response);
                    this.updateLastSnapshotDataUpdate(did, seq);
                    if (result.modified == true) {
                        var topic = topics.SNAPSHOT_DS_DATA_UPDATE(did);
                        PubSub.publish(topic,{seq:seq});
                    }
                    data = response;
                    resolve(data);
                });
            });
            return promise;
        } else {
            var data = this._snapshotData[did][seq];
            return Promise.resolve(data);
        }
    }

    shouldRequest (request) {
        var now = new Date().getTime();
        if (request.nextRequest < now ) {
            return true;
        } else {
            return false;
        }
    }

    requestLoop () {
        for (var i=0, j=this._registeredRequests.length; i<j;i++) {
            var request=this._registeredRequests[i]
            if (this.shouldRequest(request)) {
                switch (request.requestType) {
                    case 'requestDatasourceData':
                        this.getData({did:request.did});
                        break;
                }
            }
        }
        if (this.activeLoop === true ) {
            setTimeout(this.requestLoop.bind(this),15000);
        }
    }

    addRegisteredRequest (id,type,interval) {
        var exists = this._registeredRequests.some(el => el.did == id && el.requestType == type);
        if (!exists) {
            var now = new Date().getTime();
            this._registeredRequests.push({
                requestType:type,
                did:id,
                interval:interval,
                nextRequest:now + interval
            });
        }
    }

    deleteRegisteredRequest (id,type) {
        var newRequests = this._registeredRequests.filter(el => !(el.did == id && el.requestType == type));
        this._registeredRequests = newRequests;
    }

    slowDownRequest (id, type) {
        var reqArray=this._registeredRequests.filter(el => el.did == id && el.requestType == type );
        if (reqArray.length == 1 && reqArray[0].interval<1800000) {
            var now = new Date().getTime();
            var interval = parseInt(reqArray[0].interval*1.2);
            reqArray[0].interval=interval;
            reqArray[0].nextRequest=now + interval;
        }
    }

    speedUpRequest (id, type) {
        var reqArray=this._registeredRequests.filter( el => el.did == id && el.requestType == type );
        if (reqArray.length == 1 && reqArray[0].interval>300000) {
            var now = new Date().getTime();
            var interval = parseInt(reqArray[0].interval*0.8);
            reqArray[0].interval=interval;
            reqArray[0].lastRequest=now + interval;
        }
    }

    storeData (did, data) {
        var result = {};
        if (!this._datasourceData.hasOwnProperty(did)) {
            this.addRegisteredRequest(did,'requestDatasourceData',60000);
            this._datasourceData[did]=data;
            result.modified = true;
        } else if (data.ts && data.ts>this._datasourceData[did].ts) {
            this._datasourceData[did]=data;
            result.modified = true;
        }
        if (result.modified) {
            this.speedUpRequest(did,'requestDatasourceData');
        } else {
            this.slowDownRequest(did,'requestDatasourceData');
        }
        return result;
    }

    storeConfig (did, data) {
        var result = {};
        if (!this._datasourceConfig.hasOwnProperty(did)) {
            this._datasourceConfig[did]=data;
            result.modified = true;
        }
        else {
            var differs = Object.keys(data).some( key => {
                return !(this._datasourceConfig[did].hasOwnProperty(key) && this._datasourceConfig[did][key]==data[key]);
            });
            if (differs) {
                this._datasourceConfig[did]=data;
                result.modified = true;
            }
        }
        return result;
    }

    storeSnapshotData (did, data) {
        var result = {};
        if (data.seq) {
            if (!this._snapshotData.hasOwnProperty(did)) {
                this._snapshotData[did]={};
                result.modified = true;
            }
            if (!this._snapshotData[did].hasOwnProperty(data.seq)) {
                this._snapshotData[did][data.seq]=data;
                result.modified = true;
            } else {
                var differs = Object.keys(data).some (key => {
                    return !(this._snapshotData[did][data.seq].hasOwnProperty(key) && this._snapshotData[did][data.seq][key] == data[key]);
                });
                if (differs) {
                    this._snapshotData[did][data.seq] = data;
                    result.modified = true;
                }
            }
        }
        return result
    }

    deleteDatasource (did) {
        var response;
        var promise = new Promise( (resolve, reject) => {
            if (did) {
                $.ajax({
                    url: '/etc/ds/'+did,
                    dataType: 'json',
                    type: 'DELETE',
                })
                .then( data => {
                    this.deleteRegisteredRequest(msgData.did,'requestDatasourceData');
                    if (this._lastConfigUpdate.hasOwnProperty(did)) {
                        delete this._lastConfigUpdate[did];
                    }
                    if (this._lastDataUpdate.hasOwnProperty(did)) {
                        delete this._lastDataUpdate[did];
                    }
                    if (this._datasourceConfig.hasOwnProperty(did)) {
                        delete this._datasourceConfig[did];
                    }
                    if (this._datasourceData.hasOwnProperty(did)) {
                        delete this._datasourceData[did];
                    }
                    response = {success:true};
                    resolve(response);
                }, data => {
                    response = {success:false, code: data.responseJSON.error};
                    resolve(response);
                });
            } else {
                response = {success:false, code:'did invalid'};
                reject(response);
            }
        });
        return promise;
    }

}

let datasourceStore = new DatasourceStore();
datasourceStore.requestLoop()

function getDatasourceConfig (did) {
    return datasourceStore.getConfig({did:did});
}

function processMsgDatasourceConfigRequest (msgData) {
    if (msgData.did) {
        datasourceStore.getConfig({did:msgData.did, force: msgData.force});
    }
}

function getDatasourceData (did) {
    return datasourceStore.getData({did:did});
}

function processMsgDatasourceDataRequest (msgData) {
    if (msgData.did) {
        datasourceStore.getData({did:msgData.did, force:msgData.force});
    }
}

function processMsgLoadDatasourceSlide (msgData) {
    if (msgData.hasOwnProperty('did')) {
        var config = datasourceStore.getConfig({did:msgData.did});
        config.then( data => {
            PubSub.publish(topics.LOAD_SLIDE,{wid:data.wid});
        });
    }
}

function getDatasourceSnapshotData(did, seq, tid) {
    return datasourceStore.getSnapshotData(did, seq, tid);
}

function processMsgSnapshotDsDataRequest (msgData) {
    if (data.hasOwnProperty('did') && data.hasOwnProperty('tid') && data.hasOwnProperty('seq')) {
        datasourceStore.getSnapshotData(msgData.did, msgData.seq, msgData.tid);
    }
}

function processMsgDeleteDatasource(msgData) {
    if (msgData.hasOwnProperty('did')) {
        request = datasourceStore.deleteDatasource(msgData.did);
        request.then ( response => {
            if (response.success) {
                var payload = {
                    message: {type:'success', message:'Datasource deleted'},
                    messageTime:(new Date).getTime()
                };
            } else {
                var payload = {
                    message:{type:'danger',message:'Error deleting datasource. Code: '+data.responseJSON.error},
                    messageTime:(new Date).getTime()
                };
            }
            PubSub.publish(topics.BAR_MESSAGE(),payload);
        });
    }
}

export {
    getDatasourceConfig,
    getDatasourceData,
    getDatasourceSnapshotData,
}

