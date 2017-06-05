import PubSub from 'pubsub-js';
import $ from 'jquery';
import {topics} from './types.js';
import {getCookie} from './utils.js';

class DatasourceStore {
    constructor () {
        this.minConfigRequestIntervalms = 300000;
        this.minDataRequestIntervalms = 30000;
        this.minSnapshotRequestIntervalms = 300000;
        this.activeLoop = true;

        this._datasourceConfig = {};
        this._datasourceData = {};
        this._snapshotData = {};

        this.subscriptionTokens = [];
        this._registeredRequests = [];

        this._lastConfigUpdate = {};
        this._intervalsRequested = {};

        var subscribedTopics = [
            topics.DATASOURCE_DATA_REQUEST,
            topics.DATASOURCE_CONFIG_REQUEST,
            topics.LOAD_DATASOURCE_SLIDE,
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
            case topics.DELETE_DATASOURCE:
                processMsgDeleteDatasource(data);
                break;
        }
    }

    updateLastConfigUpdate (did) {
        var now=new Date().getTime();
        this._lastConfigUpdate[did] = now;
    }

    getLastConfigUpdate (did) {
        if (this._lastConfigUpdate.hasOwnProperty(did)) {
            return this._lastConfigUpdate[did];
        } else {
            return 0;
        }
    }

    addIntervalRequested ({did, its, ets} = {}) {
        var now = new Date().getTime();
        if (!this._intervalsRequested.hasOwnProperty(did)) {
            this._intervalsRequested[did] = [];
            var data = {
                its: its,
                ets: ets,
                updated: now,
            };
            this._intervalsRequested[did].push(data);
        } else {
            var overlaps = [];
            var withoutOverlaps = this._intervalsRequested[did].filter (i => {
                if (i.ets > its && i.its <= its) {
                    overlaps.push(i);
                    return false;
                } else if (i.its < ets && i.ets >= ets) {
                    overlaps.push(i);
                    return false;
                } else if (i.its >= its && i.ets <= ets) {
                    overlaps.push(i);
                    return false;
                } else if (i.its <= its && i.ets >= ets) {
                    overlaps.push(i);
                    return false;
                } else {
                    return true;
                }
            });
            overlaps.forEach( i => {
                if (i.its == i.ets) {
                    return;
                } else if (i.its >= its && i.ets <= ets) {
                    return;
                } else if (i.its < its && i.ets >= its ) {
                    withoutOverlaps.push({its:i.its, ets:its, updated:i.updated});
                } else if (i.its <= ets && i.ets > ets) {
                    withoutOverlaps.push({its:ets, ets:i.ets, updated:i.updated});
                } else if (i.its < its && i.ets > ets) {
                    withoutOverlaps.push({its:i.its, ets:its, updated:i.updated});
                    withoutOverlaps.push({its:ets, ets:i.ets, updated:i.updated});
                }
            });
            withoutOverlaps.push({its:its, ets:ets, updated: now});
            withoutOverlaps.sort( (a,b) => a.ets - b.ets);
            this._intervalsRequested[did]=withoutOverlaps;
        }
    }

    getIntervalsToRequest({did, its, ets, onlyMissing} = {}) {
        var now = new Date().getTime();
        var intervals = [];
        if (!this._intervalsRequested.hasOwnProperty(did)) {
            intervals.push({its:its, ets:ets});
            return intervals;
        } else if (!its && !ets) {
            //obtenemos el ultimo valor recuperado y lo establecemos como limite inferior
            var lastInterval = this._intervalsRequested[did][this._intervalsRequested[did].length-1];
            intervals.push({its:lastInterval.ets, ets:ets});
            return intervals;
        } else if (!ets) {
            var slidingIndex = its;
            var fixedIndex = null;
            var direction = 1;
        } else {
            var slidingIndex = ets;
            var fixedIndex = its;
            var direction = -1;
        }
        var overlaps = this._intervalsRequested[did].filter( i => {
            if (direction == -1) {
                if (i.ets >= slidingIndex && i.its < slidingIndex) {
                    return true;
                } else {
                    return false;
                }
            } else {
                if (i.its <= slidingIndex && i.ets > slidingIndex) {
                    return true;
                } else {
                    return false;
                }
            }
        });
        if (overlaps.length == 0) {
            var closestLeft = null;
            var closestRight = null;
            var requestInterval = true;
            this._intervalsRequested[did].forEach( i => {
                if (i.ets < slidingIndex) {
                    if (!closestLeft || closestLeft < i.ets) {
                        closestLeft = i.ets;
                    }
                } else if (i.its > slidingIndex) {
                    if (!closestRight || closestRight > i.its) {
                        closestRight = i.its;
                    }
                }
            });
        } else if (overlaps.length == 1) {
            var closestLeft = overlaps[0].its;
            var closestRight = overlaps[0].ets;
            if (now > overlaps[0].updated + this.minDataRequestIntervalms && !onlyMissing) {
                console.log('requestInterval true',closestLeft, ets);
                var requestInterval = true;
            } else {
                console.log('requestInterval false',closestLeft, ets);
                var requestInterval = false;
            }
        }
        if (!its) {
            if (requestInterval) {
                intervals.push({its:closestLeft, ets:slidingIndex});
            }
            return intervals;
        } else if (!ets) {
            if (requestInterval) {
                intervals.push({its:slidingIndex, ets:closestRight});
            }
            return intervals;
        } else {
            if (direction == -1) {
                if (closestLeft > its) {
                    if (requestInterval) {
                        intervals.push({its:closestLeft, ets:ets});
                    }
                    var newEts = closestLeft;
                    var newIntervals = this.getIntervalsToRequest({did:did, its:its, ets:newEts, onlyMissing:onlyMissing});
                    newIntervals.forEach( i => intervals.push(i));
                } else if (requestInterval) {
                    intervals.push({its:its, ets:ets});
                }
            } else {
                if (closestRight < ets) {
                    if (requestInterval) {
                        intervals.push({its:its, ets:closestRight});
                    }
                    var newIts = closestRight;
                    var newIntervals = this.getIntervalsToRequest({did:did, its:newIts, ets:ets, onlyMissing:onlyMissing});
                    newIntervals.forEach ( i => intervals.push(i));
                } else if (requestInterval) {
                    intervals.push({its:its, ets:ets});
                }
            }
            return intervals;
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

    getData ({did, its, ets, tid, onlyMissing}={}) {
        var responseData;
        var requestInterval = (subinterval) => {
            var parameters = {};
            if (subinterval.its) {
                parameters.its=subinterval.its;
            }
            if (subinterval.ets) {
                parameters.ets=subinterval.ets;
            }
            if (tid) {
                parameters.t = tid;
            }
            console.log('dentro requestInterval',subinterval);
            return $.ajax({
                url: '/var/ds/'+did,
                dataType: 'json',
                data: parameters,
            })
            .done(response => {
                if (response.length > 0) {
                    var closedInterval = false;
                    var receivedTs=response.map(e => e.ts);
                    var intervalReceived = {
                        ets:Math.max.apply(null, receivedTs),
                    }
                    if (subinterval.its && subinterval.ets) {
                        closedInterval = true;
                        intervalReceived.its = subinterval.its;
                    }
                    if (!closedInterval || response.length == 10) {
                        intervalReceived.its = Math.min.apply(null, receivedTs);
                    }
                    if (response.length == 10 && closedInterval) {
                        var newInterval = {
                            its:subinterval.its,
                            ets:intervalReceived.its
                        }
                        console.log('requestInterval',newInterval);
                        requestInterval(newInterval);
                    }
                    var result = this.storeData(did, tid, response);
                    if (!subinterval.ets) {
                        if (result.modified) {
                            console.log('voy a lanzar el speedUP');
                            this.speedUpRequest(did,'requestDatasourceData');
                        } else {
                            console.log('voy a lanzar el slowDown');
                            this.slowDownRequest(did,'requestDatasourceData');
                        }
                    }
                    this.addIntervalRequested({did:did, its:intervalReceived.its, ets:intervalReceived.ets});
                    if (result.modified) {
                        var topic = topics.DATASOURCE_DATA_UPDATE(did);
                        PubSub.publish(topic, {interval:intervalReceived});
                    }
                }
            })
            .fail( data => {console.log('no data for interval',subinterval,data);});
        }
        var intervals = this.getIntervalsToRequest({did:did, its:its, ets:ets, onlyMissing:onlyMissing});
        console.log('intervals to request',intervals);
        if (intervals.length == 0) {
            responseData = this._getIntervalData({did:did, its:its, ets:ets});
            return Promise.resolve({did:did,data:responseData});
        } else {
            return new Promise ( (resolve, reject) => {
                var requests = intervals.map( i => requestInterval(i));
                Promise.all(requests).then( values => {
                    responseData = this._getIntervalData({did:did, its:its, ets:ets});
                    resolve ({did:did,data:responseData});
                })
                .catch( values => {
                    responseData = this._getIntervalData({did:did, its:its, ets:ets});
                    resolve ({did:did,data:responseData});
                });
            });
        }
    }

    _getIntervalData ({did, its, ets}={}) {
        var data = [];
        if (this._datasourceData.hasOwnProperty(did)) {
            Object.keys(this._datasourceData[did]).forEach( key => {
                if (!its && !ets) {
                    data.push(this._datasourceData[did][key]);
                } else if (its && ets) {
                    if (its <= key && key <= ets) {
                        data.push(this._datasourceData[did][key]);
                    }
                } else if (its) {
                    if (its <= key) {
                        data.push(this._datasourceData[did][key]);
                    }
                } else if (ets) {
                    if (key <= ets) {
                        data.push(this._datasourceData[did][key]);
                    }
                }
            });
        }
        console.log('datos',did,its,ets,data);
        //We sort in descending order (when getting datapoint data is in ascending order)
        if (!its || !ets) {
            data.sort( (a,b) => b.ts - a.ts);
            return data.slice(0,Math.min(data.length, 2));
        } else {
            data.sort( (a,b) => b.ts - a.ts);
            return data;
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
            var request = {
                requestType:type,
                did:id,
                interval:interval,
                previousInterval: interval,
                nextRequest:now + interval
            }
            if (type == 'requestDatasourceData') {
                request.intervalsRequested=[];
            }
            this._registeredRequests.push(request);
        }
    }

    deleteRegisteredRequest (id,type) {
        var newRequests = this._registeredRequests.filter(el => !(el.did == id && el.requestType == type));
        this._registeredRequests = newRequests;
    }

    slowDownRequest (id, type) {
        var reqArray=this._registeredRequests.filter(el => el.did == id && el.requestType == type );
        console.log('slowDown reqArray',id, type, reqArray,this._registeredRequests)
        if (reqArray.length == 1 && reqArray[0].interval<1800000) {
            var now = new Date().getTime();
            if (reqArray[0].previousInterval > reqArray[0].interval) {
                var interval = parseInt(reqArray[0].interval+(reqArray[0].previousInterval-reqArray[0].interval)/2);
            } else {
                var interval = parseInt(reqArray[0].interval*1.2);
            }
            reqArray[0].previousInterval = reqArray[0].interval;
            reqArray[0].interval=interval;
            reqArray[0].nextRequest=now + interval;
            console.log('slowDownRequest',id,type,interval);
        }
    }

    speedUpRequest (id, type) {
        var reqArray=this._registeredRequests.filter( el => el.did == id && el.requestType == type );
        console.log('speedUp reqArray',id, type, reqArray,this._registeredRequests)
        if (reqArray.length == 1 && reqArray[0].interval>30000) {
            var now = new Date().getTime();
            if (reqArray[0].previousInterval < reqArray[0].interval) {
                var interval = parseInt(reqArray[0].interval-(reqArray[0].interval-reqArray[0].previousInterval)/2);
            } else {
                var interval = parseInt(reqArray[0].interval*0.8);
            }
            reqArray[0].previousInterval = reqArray[0].interval;
            reqArray[0].interval=interval;
            reqArray[0].nextRequest=now + interval;
            console.log('speedUpRequest',id,type,interval);
        }
    }

    storeData (did, tid, data) {
        console.log('storeData',data)
        var result = {};
        if (this._datasourceData.hasOwnProperty(did)) {
            Object.keys(data).forEach( key => {
                if (!this._datasourceData[did].hasOwnProperty(data[key].ts) ||
                    this._datasourceData[did][data[key].ts].content != data[key].content ||
                    this._datasourceData[did][data[key].ts].variables.length != data[key].variables.length ||
                    this._datasourceData[did][data[key].ts].datapoints.length != data[key].datapoints.length) {
                    this._datasourceData[did][data[key].ts]=data[key];
                    result.modified = true;
                }
            });
        } else {
            if (!tid) {
                this.addRegisteredRequest(did,'requestDatasourceData',60000);
            }
            this._datasourceData[did]={};
            data.sort( (a,b) => a.ts - b.ts);
            Object.keys(data).forEach( key => {
                this._datasourceData[did][data[key].ts]=data[key];
            });
            result.modified = true;
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

    deleteDatasource (did) {
        var response;
        var promise = new Promise( (resolve, reject) => {
            if (did) {
                $.ajax({
                    url: '/etc/ds/'+did,
                    dataType: 'json',
                    type: 'DELETE',
                    beforeSend: function(request) {
                        request.setRequestHeader("X-XSRFToken", getCookie('_xsrf'));
                    },
                })
                .then( data => {
                    this.deleteRegisteredRequest(msgData.did,'requestDatasourceData');
                    if (this._lastConfigUpdate.hasOwnProperty(did)) {
                        delete this._lastConfigUpdate[did];
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
                    if (data.responseJSON && data.responseJSON.error) {
                        var message = 'Error deleting datasource. Code: '+data.responseJSON.error;
                    } else if (data.statusText) {
                        var message = 'Error deleting datasource. '+data.statusText;
                    } else {
                        var message = 'Error deleting datasource.';
                    }
                    response = {success:false, message: message};
                    resolve(response);
                });
            } else {
                response = {success:false, message:'did invalid'};
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

function getDatasourceData ({did, interval, tid, onlyMissing}) {
    if (interval) {
        return datasourceStore.getData({did:did, its:interval.its, ets:interval.ets, tid:tid, onlyMissing:onlyMissing});
    } else {
        return datasourceStore.getData({did:did, tid:tid, onlyMissing:onlyMissing});
    }
}

function processMsgDatasourceDataRequest (msgData) {
    if (msgData.hasOwnProperty('did')) {
        if (msgData.hasOwnProperty('interval')) {
            datasourceStore.getData({did:msgData.did, its:msgData.interval.its, ets:msgData.interval.ets, tid:msgData.tid, onlyMissing:msgData.onlyMissing});
        } else {
            datasourceStore.getData({did:msgData.did, tid:msgData.tid, onlyMissing:msgData.onlyMissing});
        }
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
                    message:{type:'danger',message:response.message},
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
}

