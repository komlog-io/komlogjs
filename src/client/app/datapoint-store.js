import * as d3 from 'd3';
import PubSub from 'pubsub-js';
import $ from 'jquery';
import {topics} from './types.js';

class DatapointStore {
    constructor () {
        this.minConfigRequestIntervalms = 300000;
        this.minDataRequestIntervalms = 30000;
        this.minSnapshotRequestIntervalms = 300000;
        this.activeLoop = true;

        this._datapointData = {};
        this._datapointConfig = {};

        this.subscriptionTokens = [];
        this._registeredRequests = [];

        this._lastConfigUpdate = {};


        var subscribedTopics = [
            topics.DATAPOINT_DATA_REQUEST,
            topics.DATAPOINT_CONFIG_REQUEST,
            topics.LOAD_DATAPOINT_SLIDE,
            topics.DELETE_DATAPOINT,
            topics.MONITOR_DATAPOINT,
            topics.MARK_POSITIVE_VAR,
            topics.MODIFY_DATAPOINT
        ];

        subscribedTopics.forEach( topic => {
            this.subscriptionTokens.push({
                token:PubSub.subscribe(topic,this.subscriptionHandler.bind(this)),
                msg:topic
            });
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

    getData (pid, interval, tid) {
        var responseData;
        var requestInterval = (subinterval) => {
            console.log('requestInterval',subinterval);
            var parameters = {};
            if (subinterval) {
                parameters.its=subinterval.its;
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
                console.log('requestInterval response',subinterval);
                if (response.length > 0) {
                    var receivedTs=response.map(e => e.ts);
                    var receivedInterval={
                        ets:Math.max.apply(null, receivedTs),
                        its:Math.min.apply(null, receivedTs)
                    }
                    if (response.length == 300 && subinterval) {
                        var newInterval = {
                            its:subinterval.its,
                            ets:receivedInterval.its
                        }
                        requestInterval(newInterval);
                    }
                    console.log('requestInterval almacenamos datos',subinterval);
                    var result = this.storeData(pid, tid, response);
                    if (result.modified) {
                        console.log('requestInterval notificamos',subinterval);
                        var topic = topics.DATAPOINT_DATA_UPDATE(pid);
                        PubSub.publish(topic, {interval:receivedInterval});
                    }
                }
            })
            .fail( data => {console.log('no data for interval',subinterval,data);});
        }
        console.log('vamos a obtener datos',pid,interval,tid);
        var intervals = [interval];
        if (intervals.length > 0) {
            return new Promise ( (resolve, reject) => {
                var requests = intervals.map( i => requestInterval(i));
                Promise.all(requests).then( values => {
                    console.log('Requests resueltas',values);
                    console.log('Requests resueltas llamo a getIntervalData');
                    responseData = this._getIntervalData(pid,interval);
                    resolve ({pid:pid,data:responseData});
                })
                .catch( values => {
                    console.log('(catch) Requests resueltas llamo a getIntervalData');
                    responseData = this._getIntervalData(pid,interval);
                    resolve ({pid:pid,data:responseData});
                });
            });
        } else {
            console.log('(length 0) llamo a getIntervalData');
            responseData = this._getIntervalData(pid,interval);
            return Promise.resolve({pid:pid,data:responseData});
        }
    }

    _getIntervalData (pid, interval) {
        console.log('_getIntervalData',pid,interval);
        var data = [];
        if (this._datapointData.hasOwnProperty(pid)) {
            console.log('_getIntervalData',this._datapointData[pid]);
            Object.keys(this._datapointData[pid]).forEach( key => {
                if (!interval || (interval.its <= key && key <= interval.ets)) {
                    data.push({ts:key,value:this._datapointData[pid][key]});
                }
            });
        }
        if (!interval) {
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
        for (var i=0, j=this._registeredRequests.length; i<j;i++) {
            var request=this._registeredRequests[i]
            if (this.shouldRequest(request)) {
                switch (request.requestType) {
                    case 'requestDatapointData':
                        this.getData(request.pid);
                        break;
                }
            }
        }
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
        if (reqArray.length == 1 && reqArray[0].interval<1800000) {
            var now = new Date().getTime();
            var interval = parseInt(reqArray[0].interval*1.2);
            reqArray[0].interval=interval;
            reqArray[0].nextRequest=now + interval;
        }
    }

    speedUpRequest (id, type) {
        var reqArray=this._registeredRequests.filter( el => el.pid == id && el.requestType == type );
        if (reqArray.length == 1 && reqArray[0].interval>300000) {
            var now = new Date().getTime();
            var interval = parseInt(reqArray[0].interval*0.8);
            reqArray[0].interval=interval;
            reqArray[0].lastRequest=now + interval;
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
        if (result.modified) {
            this.speedUpRequest(pid,'requestDatapointData');
        } else {
            this.slowDownRequest(pid,'requestDatapointData');
        }
        return result;
    }

    _updateIntervalsRequested (pid, interval) {
        var reqArray=this._registeredRequests.filter( el => el.pid == pid && el.requestType == 'requestDatapointData');
        if (reqArray.length==1) {
            reqArray[0].lastRequest=new Date();
            reqArray[0].intervalsRequested.push($.extend({},interval));
            var intervals=reqArray[0].intervalsRequested;
            for (var i=0; i<intervals.length; i++) {
                for (var j=0; j<intervals.length; j++) {
                    if (i!=j && intervals[i].ets == intervals[j].its) {
                        intervals.push({its:intervals[i].its,ets:intervals[j].ets});
                        if (j>i) {
                            intervals.splice(j,1);
                            intervals.splice(i,1);
                        } else {
                            intervals.splice(i,1);
                            intervals.splice(j,1);
                        }
                        j--;
                        i--;
                    } else if (i!=j && intervals[i].its <= intervals[j].its && intervals[i].ets > intervals[j].its && intervals[i].ets <= intervals[j].ets) {
                        intervals.push({its:intervals[i].its,ets:intervals[j].ets});
                        if (j>i) {
                            intervals.splice(j,1);
                            intervals.splice(i,1);
                        } else {
                            intervals.splice(i,1);
                            intervals.splice(j,1);
                        }
                        j--;
                        i--;
                    } else if (i!=j && intervals[i].its <= intervals[j].its && intervals[i].ets >= intervals[j].ets) {
                        if (j>i) {
                            intervals.splice(j,1);
                            j--;
                        } else {
                            intervals.splice(i,1);
                            i--;
                        }
                    }
                }
            }
            reqArray[0].intervalsRequested=intervals;
        }
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

function getDatapointData (pid, interval, tid) {
    return datapointStore.getData(pid, interval, tid);
}

function processMsgDatapointDataRequest (msgData) {
    if (msgData.hasOwnProperty('pid')) {
        datapointStore.getData(msgData.pid, msgData.interval, msgData.tid);
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

function processMsgMonitorDatapoint (data) {
    if (data.hasOwnProperty('did') && data.hasOwnProperty('seq') && data.hasOwnProperty('p') && data.hasOwnProperty('l') && data.hasOwnProperty('datapointname')) {
        var requestData = {did:data.did,seq:data.seq,p:data.p,l:data.l,datapointname:data.datapointname};
        $.ajax({
            url: '/etc/dp/',
            dataType: 'json',
            type: 'POST',
            data: JSON.stringify(requestData),
        })
        .done( responseData=> {
            var payload = {
                message:{type:'success', message:'New datapoint monitored'},
                messageTime:(new Date).getTime()
            };
            PubSub.publish(topics.BAR_MESSAGE,payload);
            setTimeout(PubSub.publish(topics.DATAPOINT_CONFIG_REQUEST,{pid:responseData.pid, force:true}),5000);
            setTimeout(PubSub.publish(topics.DATASOURCE_CONFIG_REQUEST,{did:requestData.did, force:true}),5000);
            setTimeout(PubSub.publish(topics.DATASOURCE_DATA_REQUEST,{did:requestData.did, force:true}),5000);
        })
        .fail( responseData=> {
            var payload = {
                message:{type:'danger', message:'Error monitoring new datapoint. Code: '+responseData.responseJSON.error},
                messageTime:(new Date).getTime()
            };
            PubSub.publish(topics.BAR_MESSAGE,payload);
        });
    }
}

function processMsgMarkPositiveVar (data) {
    if (data.hasOwnProperty('pid') && data.hasOwnProperty('seq') && data.hasOwnProperty('p') && data.hasOwnProperty('l')) {
        var requestData={seq:data.seq,p:data.p,l:data.l};
        $.ajax({
            url: '/etc/dp/'+data.pid+'/positives/',
            dataType: 'json',
            type: 'POST',
            data: JSON.stringify(requestData),
        })
        .done( responseData => {
            setTimeout(PubSub.publish(topics.DATAPOINT_CONFIG_REQUEST,{pid:data.pid, force:true}),5000);
            setTimeout(PubSub.publish(topics.DATAPOINT_DATA_REQUEST,{pid:data.pid}),5000);
            var dpPromise = datapointStore.getConfig({pid:pid});
            dpPromise.then( data => {
                if (data.hasOwnProperty('did')) {
                    setTimeout(PubSub.publish(topics.DATASOURCE_CONFIG_REQUEST,
                    {did:datapointConfig.did, force:true}),5000);
                    setTimeout(PubSub.publish(topics.DATASOURCE_DATA_REQUEST,
                    {did:datapointConfig.did, force:true}),5000);
                }
            });
        });
    }
}

function processMsgDeleteDatapoint(msgData) {
    if (msgData.hasOwnProperty('pid')) {
        $.ajax({
                url: '/etc/dp/'+msgData.pid,
                dataType: 'json',
                type: 'DELETE',
            })
            .then( data => {
                datapointStore.deleteRegisteredRequest(msgData.pid,'requestDatapointData');
            }, data => {
                var payload = {
                    message:{type:'danger', message:'Error deleting datapoint. Code: '+data.responseJSON.error},
                    messageTime:(new Date).getTime()
                };
                PubSub.publish(topics.BAR_MESSAGE,payload);
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
        }).then( data => {
            PubSub.publish(topics.DATAPOINT_CONFIG_REQUEST,{pid:msgData.pid, force:true});
        }, data => {
            var payload = {
                message:{type:'danger', message:'Error updating datapoint. Code: '+data.responseJSON.error},
                messageTime:(new Date).getTime()
            };
            PubSub.publish(topics.BAR_MESSAGE, payload);
        });
    }
}

export {
    getDatapointConfig,
    getDatapointData,
}

