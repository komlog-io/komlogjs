import PubSub from 'pubsub-js';
import $ from 'jquery';
import {topics} from './types.js';

class WidgetStore {
    constructor () {
        this.minConfigRequestIntervalms = 300000;

        this._widgetConfig = {};
        this._lastConfigUpdate = {};

        var subscribedTopics = [
            topics.WIDGET_CONFIG_REQUEST,
            topics.NEW_WIDGET,
            topics.MODIFY_WIDGET,
            topics.DELETE_WIDGET,
            topics.NEW_WIDGET_DS_SNAPSHOT,
            topics.NEW_WIDGET_DP_SNAPSHOT,
            topics.NEW_WIDGET_MP_SNAPSHOT,
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
            case topics.WIDGET_CONFIG_REQUEST:
                processMsgWidgetConfigRequest(data);
                break;
            case topics.NEW_WIDGET:
                processMsgNewWidget(data);
                break;
            case topics.MODIFY_WIDGET:
                processMsgModifyWidget(data);
                break;
            case topics.DELETE_WIDGET:
                processMsgDeleteWidget(data);
                break;
            case topics.NEW_WIDGET_DS_SNAPSHOT:
                processMsgNewWidgetDsSnapshot(data);
                break;
            case topics.NEW_WIDGET_DP_SNAPSHOT:
                processMsgNewWidgetDpSnapshot(data);
                break;
            case topics.NEW_WIDGET_MP_SNAPSHOT:
                console.log('mensaje recibido',msg,data);
                processMsgNewWidgetMpSnapshot(data);
                break;
        }
    }

    updateLastConfigUpdate (wid) {
        var now=new Date().getTime();
        this._lastConfigUpdate[wid] = now;
    }

    getLastConfigUpdate (wid) {
        if (this._lastConfigUpdate.hasOwnProperty(wid)) {
            return this._lastConfigUpdate[wid];
        } else {
            return 0;
        }
    }

    getConfig ({wid, force}={}) {
        var now=new Date().getTime();
        var elapsed = now - this.getLastConfigUpdate(wid);
        if ( force == true || elapsed > this.minConfigRequestIntervalms) {
            var config;
            var promise = new Promise( (resolve, reject) => {
                $.ajax({
                    url: '/etc/wg/'+wid,
                    dataType: 'json',
                })
                .done( data => {
                    var result = this.storeConfig(wid, data);
                    this.updateLastConfigUpdate(wid);
                    if (result.modified == true) {
                        console.log('mandando actualizacion de widget',wid);
                        var topic = topics.WIDGET_CONFIG_UPDATE(wid);
                        PubSub.publish(topic,wid);
                    }
                    config = data;
                    resolve(config);
                });
            });
            return promise;
        } else {
            var config = this._widgetConfig[wid];
            return Promise.resolve(config);
        }
    }

    storeConfig (wid, data) {
        var result = {};
        if (!this._widgetConfig.hasOwnProperty(wid)) {
            this._widgetConfig[wid]=data;
            result.modified = true;
        }
        else {
            var differs = Object.keys(data).some( key => {
                return !(this._widgetConfig[wid].hasOwnProperty(key) && this._widgetConfig[wid][key]==data[key]);
            });
            if (differs) {
                this._widgetConfig[wid]=data;
                result.modified = true;
            }
        }
        return result;
    }
}

let widgetStore = new WidgetStore();


function getWidgetConfig (wid) {
    return widgetStore.getConfig({wid:wid});
}


function processMsgWidgetConfigRequest(msgData) {
    if (msgData.wid) {
        widgetStore.getConfig({wid:msgData.wid,force:msgData.force});
    }
}

function processMsgNewWidget(msgData) {
    var requestData={type:msgData.type,widgetname:msgData.widgetname};
    $.ajax({
        url: '/etc/wg/',
        dataType: 'json',
        type: 'POST',
        data: JSON.stringify(requestData),
    })
    .done( data => {
        PubSub.publish(topics.LOAD_SLIDE,{wid:data.wid});
    })
    .fail( data => {
        var payload = {
            message:{type:'danger',message:'Error creating graph. Code: '+data.responseJSON.error},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE(),payload);
    });
}

function processMsgModifyWidget(msgData) {
    var modifyWidgetname = (widgetname) => {
        var requestData={widgetname:widgetname};
        return $.ajax({
            url: '/etc/wg/'+msgData.wid,
            dataType: 'json',
            type: 'PUT',
            data: JSON.stringify(requestData),
        });
    }
    var addDatapoint = (pid) => {
        return $.ajax({
            url: '/etc/wg/'+msgData.wid+'/dp/'+pid,
            dataType: 'json',
            type: 'POST',
        });
    }
    var deleteDatapoint = (pid) => {
        return $.ajax({
            url: '/etc/wg/'+msgData.wid+'/dp/'+pid,
            dataType: 'json',
            type: 'DELETE',
        });
    }
    var endModify = () => {
        PubSub.publish(topics.WIDGET_CONFIG_REQUEST,{wid:msgData.wid,force:true});
    }
    var requests=[];
    if (msgData.hasOwnProperty('new_widgetname')) {
        requests.push({method:'widgetname',widgetname:msgData.new_widgetname});
    }
    if (msgData.hasOwnProperty('new_datapoints')) {
        for (var i=0;i<msgData.new_datapoints.length;i++) {
            requests.push({method:'add',pid:msgData.new_datapoints[i]});
        }
    }
    if (msgData.hasOwnProperty('delete_datapoints')) {
        for (var i=0;i<msgData.delete_datapoints.length;i++) {
            requests.push({method:'delete',pid:msgData.delete_datapoints[i]});
        }
    }
    var chainRequests=[];
    for (var i=0;i<requests.length;i++) {
        if (i==0) {
            if (requests[i].method=='widgetname') {
                chainRequests.push(modifyWidgetname(requests[i].widgetname));
            } else if (requests[i].method=='add') {
                chainRequests.push(addDatapoint(requests[i].pid));
            } else if (requests[i].method=='delete') {
                chainRequests.push(deleteDatapoint(requests[i].pid));
            }
        } else {
            if (requests[i].method=='widgetname') {
                chainRequests.push(chainRequests[i-1].then(modifyWidgetname(requests[i].widgetname)));
            } else if (requests[i].method=='add') {
                chainRequests.push(chainRequests[i-1].then(addDatapoint(requests[i].pid)));
            } else if (requests[i].method=='delete') {
                chainRequests.push(chainRequests[i-1].then(deleteDatapoint(requests[i].pid)));
            }
        }
    }
    if (chainRequests.length>0) {
        chainRequests[chainRequests.length-1].then(endModify());
    }
}

function processMsgDeleteWidget(msgData) {
    if (msgData.hasOwnProperty('wid')) {
        $.ajax({
            url: '/etc/wg/'+msgData.wid,
            dataType: 'json',
            type: 'DELETE',
        })
        .then( data => {
        }, data => {
            var payload = {
                message:{type:'danger',message:'Error deleting widget. Code: '+data.responseJSON.error},
                messageTime:(new Date).getTime()
            };
            PubSub.publish(topics.BAR_MESSAGE(),payload);
        });
    }
}

function processMsgNewWidgetDsSnapshot(msgData) {
    var requestData={seq:msgData.seq,ul:msgData.user_list};
    $.ajax({
        url: '/etc/wg/'+msgData.wid+'/sn/',
        dataType: 'json',
        type: 'POST',
        data: JSON.stringify(requestData),
    })
    .done( data => {
        var payload = {
            message:{type:'success',message:'Snapshot shared successfully'},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE(),payload);
    })
    .fail( data => {
        var payload = {
            message:{type:'danger',message:'Error creating snapshot. Code: '+data.responseJSON.error},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE(),payload);
    });
}

function processMsgNewWidgetDpSnapshot(msgData) {
    var requestData={its:msgData.interval.its, ets:msgData.interval.ets, ul:msgData.user_list};
    $.ajax({
        url: '/etc/wg/'+msgData.wid+'/sn/',
        dataType: 'json',
        type: 'POST',
        data: JSON.stringify(requestData),
    })
    .done( data => {
        var payload = {
            message:{type:'success',message:'Snapshot shared successfully'},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE(),payload);
    })
    .fail( data => {
        var payload = {
            message:{type:'danger',message:'Error creating snapshot. Code: '+data.responseJSON.error},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE(),payload);
    });
}

function processMsgNewWidgetMpSnapshot(msgData) {
    var requestData={its:msgData.interval.its, ets:msgData.interval.ets, ul:msgData.user_list};
    $.ajax({
        url: '/etc/wg/'+msgData.wid+'/sn/',
        dataType: 'json',
        type: 'POST',
        data: JSON.stringify(requestData),
    })
    .done( data => {
        var payload = {
            message:{type:'success',message:'Snapshot shared successfully'},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE(),payload);
    })
    .fail( data => {
        var payload = {
            message:{type:'danger',message:'Error creating snapshot. Code: '+data.responseJSON.error},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE(),payload);
    });
}

export {
    getWidgetConfig
}

