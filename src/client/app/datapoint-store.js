import * as d3 from 'd3';
import PubSub from 'pubsub-js';
import $ from 'jquery';
import {topics} from './types.js';
import {getCookie} from './utils.js';

class DatapointStore {
    constructor () {
        this.minConfigRequestIntervalms = 300000;
        this.minDataRequestIntervalms = 600000;
        this.minSnapshotRequestIntervalms = 300000;
        this.activeLoop = true;

        this._datapointData = {};
        this._datapointConfig = {};

        this.subscriptionTokens = [];
        this._registeredRequests = [];

        this._lastConfigUpdate = {};
        this._intervalsRequested = {};


        var subscribedTopics = [
            topics.DATAPOINT_DATA_REQUEST,
            topics.DATAPOINT_CONFIG_REQUEST,
            topics.LOAD_DATAPOINT_SLIDE,
            topics.DELETE_DATAPOINT,
            topics.MONITOR_DATAPOINT,
            topics.MARK_POSITIVE_VAR,
            topics.MARK_NEGATIVE_VAR,
            topics.MODIFY_DATAPOINT
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
            case topics.DATAPOINT_DATA_REQUEST:
                processMsgDatapointDataRequest(data);
                break;
            case topics.DATAPOINT_CONFIG_REQUEST:
                processMsgDatapointConfigRequest(data);
                break;
            case topics.MONITOR_DATAPOINT:
                processMsgMonitorDatapoint(data);
                break;
            case topics.MARK_POSITIVE_VAR:
                processMsgMarkPositiveVar(data);
                break;
            case topics.MARK_NEGATIVE_VAR:
                processMsgMarkNegativeVar(data);
                break;
            case topics.LOAD_DATAPOINT_SLIDE:
                processMsgLoadDatapointSlide(data);
                break;
            case topics.DELETE_DATAPOINT:
                processMsgDeleteDatapoint(data);
                break;
            case topics.MODIFY_DATAPOINT:
                processMsgModifyDatapoint(data);
                break;
        }
    }

    updateLastConfigUpdate (pid) {
        var now=new Date().getTime();
        this._lastConfigUpdate[pid] = now;
    }

    getLastConfigUpdate (pid) {
        if (this._lastConfigUpdate.hasOwnProperty(pid)) {
            return this._lastConfigUpdate[pid];
        } else {
            return 0;
        }
    }

    addIntervalRequested ({pid, its, ets} = {}) {
        var now = new Date().getTime();
        if (!this._intervalsRequested.hasOwnProperty(pid)) {
            this._intervalsRequested[pid] = [];
            var data = {
                its: its,
                ets: ets,
                updated: now,
            };
            this._intervalsRequested[pid].push(data);
        } else {
            var overlaps = [];
            var withoutOverlaps = this._intervalsRequested[pid].filter (i => {
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
            this._intervalsRequested[pid]=withoutOverlaps;
        }
    }

    getIntervalsToRequest({pid, its, ets, onlyMissing} = {}) {
        var now = new Date().getTime();
        var intervals = [];
        if (!this._intervalsRequested.hasOwnProperty(pid)) {
            intervals.push({its:its, ets:ets});
            return intervals;
        } else if (!its && !ets) {
            //obtenemos el ultimo valor recuperado y lo establecemos como limite inferior
            var lastInterval = this._intervalsRequested[pid][this._intervalsRequested[pid].length-1];
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
        var overlaps = this._intervalsRequested[pid].filter( i => {
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
            this._intervalsRequested[pid].forEach( i => {
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
                    var newIntervals = this.getIntervalsToRequest({pid:pid, its:its, ets:newEts, onlyMissing:onlyMissing});
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
                    var newIntervals = this.getIntervalsToRequest({pid:pid, its:newIts, ets:ets, onlyMissing:onlyMissing});
                    newIntervals.forEach ( i => intervals.push(i));
                } else if (requestInterval) {
                    intervals.push({its:its, ets:ets});
                }
            }
            return intervals;
        }
    }

    getConfig ({pid, force} = {}) {
        var now=new Date().getTime();
        var elapsed = now - this.getLastConfigUpdate(pid);
        if ( force == true || elapsed > this.minConfigRequestIntervalms) {
            var config;
            var promise = new Promise( (resolve, reject) => {
                $.ajax({
                    url: '/etc/dp/'+pid,
                    dataType: 'json',
                })
                .done( data => {
                    var result = this.storeConfig(pid, data);
                    this.updateLastConfigUpdate(pid);
                    if (result.modified == true) {
                        var topic = topics.DATAPOINT_CONFIG_UPDATE(pid);
                        PubSub.publish(topic,pid);
                    }
                    config = data;
                    resolve(config);
                });
            });
            return promise;
        } else {
            var config = this._datapointConfig[pid];
            return Promise.resolve(config);
        }
    }

    getData ({pid, its, ets, tid, onlyMissing}={}) {
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
            return $.ajax({
                url: '/var/dp/'+pid,
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
                    if (!closedInterval || response.length == 300) {
                        intervalReceived.its = Math.min.apply(null, receivedTs);
                    }
                    if (response.length == 300 && closedInterval) {
                        var newInterval = {
                            its:subinterval.its,
                            ets:receivedInterval.its
                        }
                        requestInterval(newInterval);
                    }
                    var result = this.storeData(pid, tid, response);
                    if (!subinterval.ets) {
                        if (result.modified) {
                            console.log('voy a lanzar el speedUP');
                            this.speedUpRequest(pid,'requestDatapointData');
                        } else {
                            this.slowDownRequest(pid,'requestDatapointData');
                        }
                    }
                    this.addIntervalRequested({pid:pid, its:intervalReceived.its, ets:intervalReceived.ets});
                    if (result.modified) {
                        var topic = topics.DATAPOINT_DATA_UPDATE(pid);
                        PubSub.publish(topic, {interval:intervalReceived});
                    }
                }
            })
            .fail( data => {console.log('no data for interval',subinterval,data);});
        }
        var intervals = this.getIntervalsToRequest({pid:pid, its:its, ets:ets, onlyMissing:onlyMissing});
        console.log('intervals to request',intervals);
        if (intervals.length == 0) {
            responseData = this._getIntervalData({pid:pid, its:its, ets:ets});
            return Promise.resolve({pid:pid,data:responseData});
        } else {
            return new Promise ( (resolve, reject) => {
                var requests = intervals.map( i => requestInterval(i));
                Promise.all(requests).then( values => {
                    responseData = this._getIntervalData({pid:pid, its:its, ets:ets});
                    resolve ({pid:pid,data:responseData});
                })
                .catch( values => {
                    responseData = this._getIntervalData({pid:pid, its:its, ets:ets});
                    resolve ({pid:pid,data:responseData});
                });
            });
        }
    }

    _getIntervalData ({pid, its, ets}={}) {
        var data = [];
        if (this._datapointData.hasOwnProperty(pid)) {
            Object.keys(this._datapointData[pid]).forEach( key => {
                if (!its && !ets) {
                    data.push({ts:key,value:this._datapointData[pid][key]});
                } else if (its && ets) {
                    if (its <= key && key <= ets) {
                        data.push({ts:key,value:this._datapointData[pid][key]});
                    }
                } else if (its) {
                    if (its <= key) {
                        data.push({ts:key,value:this._datapointData[pid][key]});
                    }
                } else if (ets) {
                    if (key <= ets) {
                        data.push({ts:key,value:this._datapointData[pid][key]});
                    }
                }
            });
        }
        if (!its || !ets) {
            data.sort( (a,b) => a.ts - b.ts);
            return data.slice(Math.max(data.length - 200, 0));
        } else {
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
        this._registeredRequests.forEach( req => {
            if (this.shouldRequest(req)) {
                switch (req.requestType) {
                    case 'requestDatapointData':
                        this.getData({pid:req.pid});
                        break;
                }
            }
        });
        if (this.activeLoop) {
            setTimeout(this.requestLoop.bind(this),15000);
        }
    }

    addRegisteredRequest (id,type,interval) {
        var exists = this._registeredRequests.some(el => el.pid == id && el.requestType == type);
        if (!exists) {
            var now = new Date().getTime();
            var request = {
                requestType:type,
                pid:id,
                interval:interval,
                previousInterval: interval,
                nextRequest:now + interval
            }
            if (type == 'requestDatapointData') {
                request.intervalsRequested=[];
            }
            this._registeredRequests.push(request);
        }
    }

    deleteRegisteredRequest (id,type) {
        var newRequests = this._registeredRequests.filter(el => !(el.pid == id && el.requestType == type));
        this._registeredRequests = newRequests;
    }

    slowDownRequest (id, type) {
        var reqArray=this._registeredRequests.filter(el => el.pid == id && el.requestType == type );
        if (reqArray.length == 1 && reqArray[0].interval<2700000) {
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
        var reqArray=this._registeredRequests.filter( el => el.pid == id && el.requestType == type );
        if (reqArray.length == 1 && reqArray[0].interval>60000) {
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

    storeConfig (pid, data) {
        var result = {};
        if (!this._datapointConfig.hasOwnProperty(pid)) {
            this._datapointConfig[pid]=data;
            result.modified = true;
        }
        else {
            var differs = Object.keys(data).some( key => {
                return !(this._datapointConfig[pid].hasOwnProperty(key) && this._datapointConfig[pid][key]==data[key]);
            });
            if (differs) {
                this._datapointConfig[pid]=data;
                result.modified = true;
            }
        }
        return result;
    }

    storeData (pid, tid, data) {
        var result = {};
        if (this._datapointData.hasOwnProperty(pid)) {
            Object.keys(data).forEach( key => {
                if (!this._datapointData[pid].hasOwnProperty(data[key].ts) &&
                    this._datapointData[pid][data[key].ts] != data[key].value) {
                    this._datapointData[pid][data[key].ts]=data[key].value;
                    result.modified = true;
                }
            });
        } else {
            if (!tid) {
                this.addRegisteredRequest(pid,'requestDatapointData',60000);
            }
            this._datapointData[pid]={};
            Object.keys(data).forEach( key => {
                this._datapointData[pid][data[key].ts]=data[key].value;
            });
            result.modified = true;
        }
        return result;
    }

}


let datapointStore = new DatapointStore();
datapointStore.requestLoop();

function getDatapointConfig (pid) {
    return datapointStore.getConfig({pid:pid});
}


function processMsgDatapointConfigRequest (msgData) {
    if (msgData.pid) {
        datapointStore.getConfig({pid:msgData.pid, force:msgData.force});
    }
}

function getDatapointData ({pid, interval, tid, onlyMissing}) {
    if (interval) {
        return datapointStore.getData({pid:pid, its:interval.its, ets:interval.ets, tid:tid, onlyMissing:onlyMissing});
    } else {
        return datapointStore.getData({pid:pid, tid:tid, onlyMissing:onlyMissing});
    }
}

function processMsgDatapointDataRequest (msgData) {
    if (msgData.hasOwnProperty('pid')) {
        if (msgData.hasOwnProperty('interval')) {
            datapointStore.getData({pid:msgData.pid, its:msgData.interval.its, ets:msgData.interval.ets, tid:msgData.tid, onlyMissing:msgData.onlyMissing});
        } else {
            datapointStore.getData({pid:msgData.pid, tid:msgData.tid, onlyMissing:msgData.onlyMissing});
        }
    }
}

function processMsgLoadDatapointSlide (msgData) {
    if (msgData.hasOwnProperty('pid')) {
        var config = datapointStore.getConfig({pid:msgData.pid});
        config.then( data => {
            PubSub.publish(topics.LOAD_SLIDE,{wid:data.wid});
        });
    }
}

function processMsgMonitorDatapoint (msgData) {
    if (msgData.hasOwnProperty('did') && msgData.hasOwnProperty('seq') && msgData.hasOwnProperty('p') && msgData.hasOwnProperty('l') && msgData.hasOwnProperty('datapointname')) {
        var requestData = {
            did:msgData.did,
            seq:msgData.seq,
            p:msgData.p,
            l:msgData.l,
            datapointname:msgData.datapointname
        };
        $.ajax({
            url: '/etc/dp/',
            dataType: 'json',
            type: 'POST',
            data: JSON.stringify(requestData),
            beforeSend: function(request) {
                request.setRequestHeader("X-XSRFToken", getCookie('_xsrf'));
            },
        })
        .done( data => {
            var payload = {
                message:{type:'success', message:'New datapoint monitored'},
                messageTime:(new Date).getTime()
            };
            PubSub.publish(topics.BAR_MESSAGE(),payload);
            setTimeout(() => PubSub.publish(topics.DATASOURCE_CONFIG_REQUEST,{did:requestData.did, force:true}),5000);
            setTimeout(() => PubSub.publish(topics.DATASOURCE_DATA_REQUEST,{did:requestData.did, force:true}),5000);
        })
        .fail( data => {
            if (data.responseJSON && data.responseJSON.error) {
                var message = 'Error registering datapoint. Code: '+data.responseJSON.error;
            } else if (data.statusText) {
                var message = 'Error registering datapoint. '+data.statusText;
            } else {
                var message = 'Error registering datapoint.';
            }
            var payload = {
                message:{type:'danger',message:message},
                messageTime:(new Date).getTime()
            };
            PubSub.publish(topics.BAR_MESSAGE(),payload);
        });
    }
}

function processMsgMarkPositiveVar (msgData) {
    if (msgData.hasOwnProperty('pid') && msgData.hasOwnProperty('seq') && msgData.hasOwnProperty('p') && msgData.hasOwnProperty('l')) {
        var requestData={seq:msgData.seq,p:msgData.p,l:msgData.l};
        $.ajax({
            url: '/etc/dp/'+msgData.pid+'/positives/',
            dataType: 'json',
            type: 'POST',
            data: JSON.stringify(requestData),
            beforeSend: function(request) {
                request.setRequestHeader("X-XSRFToken", getCookie('_xsrf'));
            },
        })
        .done( data => {
            setTimeout(() => PubSub.publish(topics.DATAPOINT_CONFIG_REQUEST,{pid:msgData.pid, force:true}),5000);
            setTimeout(() => PubSub.publish(topics.DATAPOINT_DATA_REQUEST,{pid:msgData.pid}),5000);
            var dpPromise = datapointStore.getConfig({pid:msgData.pid});
            dpPromise.then( config => {
                if (config.hasOwnProperty('did')) {
                    setTimeout(() => PubSub.publish(topics.DATASOURCE_CONFIG_REQUEST,
                    {did:config.did}),5000);
                    setTimeout(() => PubSub.publish(topics.DATASOURCE_DATA_REQUEST,
                    {did:config.did}),5000);
                }
            });
        })
        .fail( data => {
            if (data.responseJSON && data.responseJSON.error) {
                var message = 'Error requesting operation. Code: '+data.responseJSON.error;
            } else if (data.statusText) {
                var message = 'Error requesting operation. '+data.statusText;
            } else {
                var message = 'Error requesting operation.';
            }
            var payload = {
                message:{type:'danger',message:message},
                messageTime:(new Date).getTime()
            };
            PubSub.publish(topics.BAR_MESSAGE(),payload);
        });
    }
}

function processMsgMarkNegativeVar (msgData) {
    if (msgData.hasOwnProperty('pid') && msgData.hasOwnProperty('seq') && msgData.hasOwnProperty('p') && msgData.hasOwnProperty('l')) {
        var requestData={seq:msgData.seq,p:msgData.p,l:msgData.l};
        $.ajax({
            url: '/etc/dp/'+msgData.pid+'/negatives/',
            dataType: 'json',
            type: 'POST',
            data: JSON.stringify(requestData),
            beforeSend: function(request) {
                request.setRequestHeader("X-XSRFToken", getCookie('_xsrf'));
            },
        })
        .done( data => {
            setTimeout(() => PubSub.publish(topics.DATAPOINT_CONFIG_REQUEST,{pid:msgData.pid, force:true}),5000);
            setTimeout(() => PubSub.publish(topics.DATAPOINT_DATA_REQUEST,{pid:msgData.pid}),5000);
            var dpPromise = datapointStore.getConfig({pid:msgData.pid});
            dpPromise.then( config => {
                if (config.hasOwnProperty('did')) {
                    setTimeout(() => PubSub.publish(topics.DATASOURCE_CONFIG_REQUEST,
                    {did:config.did}),5000);
                    setTimeout(() => PubSub.publish(topics.DATASOURCE_DATA_REQUEST,
                    {did:config.did}),5000);
                }
            });
        })
        .fail( data => {
            if (data.responseJSON && data.responseJSON.error) {
                var message = 'Error requesting operation. Code: '+data.responseJSON.error;
            } else if (data.statusText) {
                var message = 'Error requesting operation. '+data.statusText;
            } else {
                var message = 'Error requesting operation.';
            }
            var payload = {
                message:{type:'danger',message:message},
                messageTime:(new Date).getTime()
            };
            PubSub.publish(topics.BAR_MESSAGE(),payload);
        });
    }
}

function processMsgDeleteDatapoint(msgData) {
    if (msgData.hasOwnProperty('pid')) {
        $.ajax({
            url: '/etc/dp/'+msgData.pid,
            dataType: 'json',
            type: 'DELETE',
            beforeSend: function(request) {
                request.setRequestHeader("X-XSRFToken", getCookie('_xsrf'));
            },
        })
        .then( data => {
            datapointStore.deleteRegisteredRequest(msgData.pid,'requestDatapointData');
        }, data => {
            if (data.responseJSON && data.responseJSON.error) {
                var message = 'Error deleting datapoint. Code: '+data.responseJSON.error;
            } else if (data.statusText) {
                var message = 'Error deleting datapoint. '+data.statusText;
            } else {
                var message = 'Error deleting datapoint.';
            }
            var payload = {
                message:{type:'danger',message:message},
                messageTime:(new Date).getTime()
            };
            PubSub.publish(topics.BAR_MESSAGE(),payload);
        });
    }
}

function processMsgModifyDatapoint(msgData) {
    if (msgData.hasOwnProperty('color')) {
        var requestData={color:msgData.color};
        $.ajax({
            url: '/etc/dp/'+msgData.pid,
            dataType: 'json',
            type: 'PUT',
            data: JSON.stringify(requestData),
            beforeSend: function(request) {
                request.setRequestHeader("X-XSRFToken", getCookie('_xsrf'));
            },
        }).then( data => {
            PubSub.publish(topics.DATAPOINT_CONFIG_REQUEST,{pid:msgData.pid, force:true});
        }, data => {
            if (data.responseJSON && data.responseJSON.error) {
                var message = 'Error updating datapoint. Code: '+data.responseJSON.error;
            } else if (data.statusText) {
                var message = 'Error updating datapoint. '+data.statusText;
            } else {
                var message = 'Error updating datapoint.';
            }
            var payload = {
                message:{type:'danger',message:message},
                messageTime:(new Date).getTime()
            };
            PubSub.publish(topics.BAR_MESSAGE(), payload);
        });
    }
}

export {
    getDatapointConfig,
    getDatapointData,
}

