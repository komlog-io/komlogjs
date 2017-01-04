import PubSub from 'pubsub-js';
import $ from 'jquery';

class DashboardStore {
    constructor () {
        this._dashboardConfig = {};
        this.subscriptionTokens = [];
        this.subscriptionTokens.push({token:PubSub.subscribe('dashboardsConfigReq', this.subscriptionHandler.bind(this)),msg:'dashboardsConfigReq'});
        this.subscriptionTokens.push({token:PubSub.subscribe('dashboardConfigReq', this.subscriptionHandler.bind(this)),msg:'dashboardConfigReq'});
        this.subscriptionTokens.push({token:PubSub.subscribe('newDashboard', this.subscriptionHandler.bind(this)),msg:'newDashboard'});
        this.subscriptionTokens.push({token:PubSub.subscribe('modifyDashboard', this.subscriptionHandler.bind(this)),msg:'modifyDashboard'});
        this.subscriptionTokens.push({token:PubSub.subscribe('deleteDashboard', this.subscriptionHandler.bind(this)),msg:'deleteDashboard'});
    }

    subscriptionHandler (msg, data) {
        switch (msg) {
            case 'dashboardsConfigReq':
                processMsgDashboardsConfigReq();
                break;
            case 'dashboardConfigReq':
                processMsgDashboardConfigReq(data);
                break;
            case 'newDashboard':
                processMsgNewDashboard(data);
                break;
            case 'modifyDashboard':
                processMsgModifyDashboard(data);
                break;
            case 'deleteDashboard':
                processMsgDeleteDashboard(data);
                break;
        }
    }

    storeConfig (bid, data) {
        var doStore=false;
        if (!this._dashboardConfig.hasOwnProperty(bid)) {
            this._dashboardConfig[bid]={}
            Object.keys(data).forEach(key => {
                this._dashboardConfig[bid][key]=data[key];
            });
            doStore=true
        }
        else {
            Object.keys(data).forEach(key => {
                if (key=='dashboardname' && this._dashboardConfig[bid].dashboardname != data[key]) {
                    doStore=true;
                } else if (key == 'wids') {
                    if (data.wids.length != this._dashboardConfig[bid].wids.length) {
                        doStore = true;
                    } else {
                        for (var i=0;i<data.wids.length;i++) {
                            if (this._dashboardConfig[bid].wids.indexOf(data.wids[i])==-1) {
                                doStore = true;
                                break;
                            }
                        }
                    }
                }
            });
            if (doStore) {
                this._dashboardConfig[bid]=data
            }
        }
        return doStore;
    }
}

/*

function DashboardStore () {
    this._dashboardConfig = {};
    this.subscriptionTokens = [];

    this.subscriptionTokens.push({token:PubSub.subscribe('dashboardsConfigReq', this.subscriptionHandler.bind(this)),msg:'dashboardsConfigReq'});
    this.subscriptionTokens.push({token:PubSub.subscribe('dashboardConfigReq', this.subscriptionHandler.bind(this)),msg:'dashboardConfigReq'});
    this.subscriptionTokens.push({token:PubSub.subscribe('newDashboard', this.subscriptionHandler.bind(this)),msg:'newDashboard'});
    this.subscriptionTokens.push({token:PubSub.subscribe('modifyDashboard', this.subscriptionHandler.bind(this)),msg:'modifyDashboard'});
    this.subscriptionTokens.push({token:PubSub.subscribe('deleteDashboard', this.subscriptionHandler.bind(this)),msg:'deleteDashboard'});

}

DashboardStore.prototype = {
    subscriptionHandler: function (msg, data) {
        switch (msg) {
            case 'dashboardsConfigReq':
                processMsgDashboardsConfigReq()
                break;
            case 'dashboardConfigReq':
                processMsgDashboardConfigReq(data)
                break;
            case 'newDashboard':
                processMsgNewDashboard(data)
                break;
            case 'modifyDashboard':
                processMsgModifyDashboard(data)
                break;
            case 'deleteDashboard':
                processMsgDeleteDashboard(data)
                break;
        }
    },
    storeConfig: function (bid, data) {
        doStore=false
        if (!this._dashboardConfig.hasOwnProperty(bid)) {
            this._dashboardConfig[bid]={}
            $.each(data, function (key,value) {
                this._dashboardConfig[bid][key]=value
            }.bind(this));
            doStore=true
        }
        else {
            $.each(data, function (key,value) {
                if (key=='dashboardname' && this._dashboardConfig[bid].dashboardname != value) {
                    doStore=true
                } else if (key == 'wids') {
                    if (data.wids.length != this._dashboardConfig[bid].wids.length) {
                        doStore = true
                    } else {
                        for (var i=0;i<data.wids.length;i++) {
                            if (this._dashboardConfig[bid].wids.indexOf(data.wids[i])==-1) {
                                doStore = true;
                                break;
                            }
                        }
                    }
                }
            }.bind(this));
            if (doStore) {
                this._dashboardConfig[bid]=data
            }
        }
        return doStore;
    }
};

*/

let dashboardStore = new DashboardStore();

function processMsgNewDashboard (msgData) {
    var requestData={dashboardname:msgData.dashboardname};
    $.ajax({
        url: '/etc/db/',
        dataType: 'json',
        type: 'POST',
        data: JSON.stringify(requestData),
    })
    .done( data => {
        PubSub.publish('dashboardConfigReq',{bid:data.bid})
        PubSub.publish('barMessage',{message:{type:'success',message:'Dashboard created successfully'},messageTime:(new Date).getTime()})
    })
    .fail( data => {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error creating dashboard. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()})
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
        PubSub.publish('dashboardConfigReq',{bid:msgData.bid})
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
            PubSub.publish('dashboardConfigUpdate',{})
        }, data => {
            PubSub.publish('barMessage',{message:{type:'danger',message:'Error deleting dashboard. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()})
        });
    }
}

function processMsgDashboardsConfigReq () {
    if (Object.keys(dashboardStore._dashboardConfig).length == 0) {
        requestDashboardsConfig()
    }
}

function requestDashboardsConfig () {
    $.ajax({
        url: '/etc/db',
        dataType: 'json',
    })
    .done( data => {
        for (var i=0;i<data.length;i++) {
            if (data[i].hasOwnProperty('bid')) {
                dashboardStore.storeConfig(data[i].bid, data[i]);
            }
        }
        PubSub.publish('dashboardConfigUpdate',{})
    });
}

function processMsgDashboardConfigReq (data) {
    if (data.hasOwnProperty('bid')) {
        if (dashboardStore._dashboardConfig.hasOwnProperty(data.bid)) {
            sendDashboardConfigUpdate(data.bid)
        }
        requestDashboardConfig(data.bid)
    }
}

function requestDashboardConfig (bid) {
    $.ajax({
        url: '/etc/db/'+bid,
        dataType: 'json',
    })
    .done( data => {
        var changed = dashboardStore.storeConfig(bid, data);
        if (changed) {
            sendDashboardConfigUpdate(bid);
        }
    })
}

function sendDashboardConfigUpdate (bid) {
    if (dashboardStore._dashboardConfig.hasOwnProperty(bid)) {
        PubSub.publish('dashboardConfigUpdate.'+bid,{bid:bid})
    }
}

export {
    dashboardStore
}


