import PubSub from 'pubsub-js';
import $ from 'jquery';
import {topics} from './types.js';

class DashboardStore {
    constructor () {
        this.minConfigRequestIntervalms = 300000;
        this.minGlobalConfigRequestIntervalms = 300000;

        this._dashboardConfig = {};
        this._lastConfigUpdate = {};
        this._lastGlobalConfigUpdate = null;

        var subscribedTopics = [
            topics.DASHBOARD_CONFIG_REQUEST,
            topics.NEW_DASHBOARD,
            topics.MODIFY_DASHBOARD,
            topics.DELETE_DASHBOARD,
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
            case topics.DASHBOARD_CONFIG_REQUEST:
                processMsgDashboardConfigRequest(data);
                break;
            case topics.NEW_DASHBOARD:
                processMsgNewDashboard(data);
                break;
            case topics.MODIFY_DASHBOARD:
                processMsgModifyDashboard(data);
                break;
            case topics.DELETE_DASHBOARD:
                processMsgDeleteDashboard(data);
                break;
        }
    }

    updateLastConfigUpdate (bid) {
        var now=new Date().getTime();
        this._lastConfigUpdate[bid] = now;
    }

    getLastConfigUpdate (bid) {
        if (this._lastConfigUpdate.hasOwnProperty(bid)) {
            return this._lastConfigUpdate[bid];
        } else {
            return 0;
        }
    }

    getConfig ({bid, force}={}) {
        var now=new Date().getTime();
        if (!bid) {
            console.log('getConfig total');
            if (!this.lastGlobalConfigUpdate) {
                var elapsed = now;
            } else {
                var elapsed = now - this.lastGlobalConfigUpdate;
            }
            if ( force == true || elapsed > this.minGlobalConfigRequestIntervalms) {
                console.log('getConfig total remota');
                var config;
                var promise = new Promise( (resolve, reject) => {
                    $.ajax({
                        url: '/etc/db/',
                        dataType: 'json',
                    })
                    .done( data => {
                        this.lastGlobalConfigUpdate = now;
                        data.forEach( db => {
                            var result = this.storeConfig(db.bid, db);
                            this.updateLastConfigUpdate(db.bid);
                        });
                        config = data;
                        resolve(config);
                    });
                });
                return promise;
            } else {
                console.log('getConfig total local');
                var config = Object.keys(this._dashboardConfig).map( key => this._dashboardConfig[key]);
                return Promise.resolve(config);
            }
        } else {
            console.log('getConfig parcial');
            var elapsed = now - this.getLastConfigUpdate(bid);
            if ( force == true || elapsed > this.minConfigRequestIntervalms) {
                console.log('getConfig parcial remota');
                var config;
                var promise = new Promise( (resolve, reject) => {
                    $.ajax({
                        url: '/etc/db/'+bid,
                        dataType: 'json',
                    })
                    .done( data => {
                        var result = this.storeConfig(bid, data);
                        this.updateLastConfigUpdate(bid);
                        if (result.modified == true) {
                            var topic = topics.DASHBOARD_CONFIG_UPDATE(bid);
                            PubSub.publish(topic,{bid:bid});
                        }
                        config = data;
                        resolve(config);
                    });
                });
                return promise;
            } else {
                console.log('getConfig parcial local');
                var config = this._dashboardConfig[bid];
                return Promise.resolve(config);
            }
        }
    }

    storeConfig (bid, data) {
        var result = {};
        if (!this._dashboardConfig.hasOwnProperty(bid)) {
            this._dashboardConfig[bid]=data;
            result.modified = true;
        }
        else {
            var differs = Object.keys(data).some( key => {
                return !(this._dashboardConfig[bid].hasOwnProperty(key) && this._dashboardConfig[bid][key]==data[key]);
            });
            if (differs) {
                this._dashboardConfig[bid]=data;
                result.modified = true;
            }
        }
        return result;
    }
}

let dashboardStore = new DashboardStore();

function getDashboardConfig (bid) {
    return dashboardStore.getConfig({bid:bid});
}

function processMsgDashboardConfigRequest(msgData) {
    if (msgData.bid) {
        dashboardStore.getConfig({bid:msgData.bid,force:msgData.force});
    }
}

function processMsgNewDashboard (msgData) {
    var requestData={dashboardname:msgData.dashboardname};
    $.ajax({
        url: '/etc/db/',
        dataType: 'json',
        type: 'POST',
        data: JSON.stringify(requestData),
    })
    .done( data => {
        PubSub.publish(topics.DASHBOARD_CONFIG_REQUEST,{bid:data.bid})
        var payload = {
            message:{type:'success',message:'Dashboard created successfully'},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE(), payload);
    })
    .fail( data => {
        var payload = {
            message:{type:'danger',message:'Error creating dashboard. Code: '+data.responseJSON.error},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE(), payload);
    });
}

function processMsgModifyDashboard (msgData) {
    var modifyDashboardname = dashboardname => {
        var requestData={dashboardname:dashboardname};
        return $.ajax({
            url: '/etc/db/'+msgData.bid,
            dataType: 'json',
            type: 'PUT',
            data: JSON.stringify(requestData),
        });
    }
    var addWidget = wid => {
        return $.ajax({
            url: '/etc/db/'+msgData.bid+'/wg/'+wid,
            dataType: 'json',
            type: 'POST',
        });
    }
    var deleteWidget = wid => {
        return $.ajax({
            url: '/etc/db/'+msgData.bid+'/wg/'+wid,
            dataType: 'json',
            type: 'DELETE',
        });
    }
    var endModify = () => {
        PubSub.publish(topics.DASHBOARD_CONFIG_REQUEST,{bid:msgData.bid, force:true});
    }
    var requests=[];
    if (msgData.hasOwnProperty('new_dashboardname')) {
        requests.push({method:'dashboardname',dashboardname:msgData.new_dashboardname})
    }
    if (msgData.hasOwnProperty('new_widgets')) {
        for (var i=0;i<msgData.new_widgets.length;i++) {
            requests.push({method:'add',wid:msgData.new_widgets[i]})
        }
    }
    if (msgData.hasOwnProperty('delete_widgets')) {
        for (var i=0;i<msgData.delete_widgets.length;i++) {
            requests.push({method:'delete',wid:msgData.delete_widgets[i]})
        }
    }
    var chainRequests=[];
    for (var i=0;i<requests.length;i++) {
        if (i==0) {
            if (requests[i].method=='dashboardname') {
                chainRequests.push(modifyDashboardname(requests[i].dashboardname))
            } else if (requests[i].method=='add') {
                chainRequests.push(addWidget(requests[i].wid))
            } else if (requests[i].method=='delete') {
                chainRequests.push(deleteWidget(requests[i].wid))
            }
        } else {
            if (requests[i].method=='dashboardname') {
                chainRequests.push(chainRequests[i-1].then(modifyDashboardname(requests[i].dashboardname)))
            } else if (requests[i].method=='add') {
                chainRequests.push(chainRequests[i-1].then(addWidget(requests[i].wid)))
            } else if (requests[i].method=='delete') {
                chainRequests.push(chainRequests[i-1].then(deleteWidget(requests[i].wid)))
            }
        }
    }
    if (chainRequests.length>0) {
        chainRequests[chainRequests.length-1].then(endModify())
    }
}

function processMsgDeleteDashboard (msgData) {
    if (msgData.hasOwnProperty('bid')) {
        $.ajax({
            url: '/etc/db/'+msgData.bid,
            dataType: 'json',
            type: 'DELETE',
        })
        .then( data => {
            PubSub.publish(topics.DASHBOARD_CONFIG_UPDATE(msgData.bid),{bid:msgData.bid});
        }, data => {
            var payload = {
                message:{type:'danger',message:'Error deleting dashboard. Code: '+data.responseJSON.error},
                messageTime:(new Date).getTime()
            };
            PubSub.publish(topics.BAR_MESSAGE(),payload);
        });
    }
}

export {
    getDashboardConfig
}


