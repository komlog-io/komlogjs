import PubSub from 'pubsub-js';
import $ from 'jquery';

class WidgetStore {
    constructor () {
        this._widgetConfig = {};
        this.subscriptionTokens = [];

        this.subscriptionTokens.push({token:PubSub.subscribe('widgetConfigReq', this.subscriptionHandler.bind(this)),msg:'widgetConfigReq'});
        this.subscriptionTokens.push({token:PubSub.subscribe('newWidget', this.subscriptionHandler.bind(this)),msg:'newWidget'});
        this.subscriptionTokens.push({token:PubSub.subscribe('modifyWidget', this.subscriptionHandler.bind(this)),msg:'modifyWidget'});
        this.subscriptionTokens.push({token:PubSub.subscribe('deleteWidget', this.subscriptionHandler.bind(this)),msg:'deleteWidget'});
        this.subscriptionTokens.push({token:PubSub.subscribe('newWidgetDsSnapshot', this.subscriptionHandler.bind(this)),msg:'newWidgetDsSnapshot'});
        this.subscriptionTokens.push({token:PubSub.subscribe('newWidgetDpSnapshot', this.subscriptionHandler.bind(this)),msg:'newWidgetDpSnapshot'});
        this.subscriptionTokens.push({token:PubSub.subscribe('newWidgetMpSnapshot', this.subscriptionHandler.bind(this)),msg:'newWidgetMpSnapshot'});

    }

    subscriptionHandler (msg, data) {
        switch (msg) {
            case 'widgetConfigReq':
                processMsgWidgetConfigReq(data);
                break;
            case 'newWidget':
                processMsgNewWidget(data);
                break;
            case 'modifyWidget':
                processMsgModifyWidget(data);
                break;
            case 'deleteWidget':
                processMsgDeleteWidget(data);
                break;
            case 'newWidgetDsSnapshot':
                processMsgNewWidgetDsSnapshot(data);
                break;
            case 'newWidgetDpSnapshot':
                processMsgNewWidgetDpSnapshot(data);
                break;
            case 'newWidgetMpSnapshot':
                processMsgNewWidgetMpSnapshot(data);
                break;
        }
    }

    storeConfig (wid, data) {
        var doStore=false;
        if (!this._widgetConfig.hasOwnProperty(wid)) {
            this._widgetConfig[wid]={};
            Object.keys(data).forEach(key => {
                this._widgetConfig[wid][key]=data[key];
            });
            doStore=true;
        }
        else {
            Object.keys(data).forEach( key => {
                if (!(this._widgetConfig[wid].hasOwnProperty(key) && this._widgetConfig[wid][key]==data[key])) {
                    doStore=true;
                }
            });
            if (doStore) {
                this._widgetConfig[wid]=data;
            }
        }
        return doStore;
    }
}

let widgetStore = new WidgetStore();



function processMsgNewWidget(msgData) {
    var requestData={type:msgData.type,widgetname:msgData.widgetname};
    $.ajax({
        url: '/etc/wg/',
        dataType: 'json',
        type: 'POST',
        data: JSON.stringify(requestData),
    })
    .done( data => {
        PubSub.publish('loadSlide',{wid:data.wid});
    })
    .fail( data => {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error creating graph. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()});
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
        PubSub.publish('widgetConfigReq',{wid:msgData.wid});
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
            PubSub.publish('barMessage',{message:{type:'danger',message:'Error deleting widget. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()});
        });
    }
}

function processMsgWidgetConfigReq (data) {
    if (data.hasOwnProperty('wid')) {
        requestWidgetConfig(data.wid);
    }
}

function requestWidgetConfig (wid) {
    $.ajax({
        url: '/etc/wg/'+wid,
        dataType: 'json',
    })
    .done( data => {
        widgetStore.storeConfig(wid, data);
        sendWidgetConfigUpdate(wid);
    });
}

function sendWidgetConfigUpdate (wid) {
    if (widgetStore._widgetConfig.hasOwnProperty(wid)) {
        PubSub.publish('widgetConfigUpdate-'+wid,wid);
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
        PubSub.publish('barMessage',{message:{type:'success',message:'Snapshot shared successfully'},messageTime:(new Date).getTime()});
    })
    .fail( data => {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error creating snapshot. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()});
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
        PubSub.publish('barMessage',{message:{type:'success',message:'Snapshot shared successfully'},messageTime:(new Date).getTime()});
    })
    .fail( data => {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error creating snapshot. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()});
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
        PubSub.publish('barMessage',{message:{type:'success',message:'Snapshot shared successfully'},messageTime:(new Date).getTime()});
    })
    .fail( data => {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error creating snapshot. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()});
    });
}

export {
    widgetStore
}

/*
function WidgetStore () {
    this._widgetConfig = {};
    this.subscriptionTokens = [];

    this.subscriptionTokens.push({token:PubSub.subscribe('widgetConfigReq', this.subscriptionHandler.bind(this)),msg:'widgetConfigReq'});
    this.subscriptionTokens.push({token:PubSub.subscribe('newWidget', this.subscriptionHandler.bind(this)),msg:'newWidget'});
    this.subscriptionTokens.push({token:PubSub.subscribe('modifyWidget', this.subscriptionHandler.bind(this)),msg:'modifyWidget'});
    this.subscriptionTokens.push({token:PubSub.subscribe('deleteWidget', this.subscriptionHandler.bind(this)),msg:'deleteWidget'});
    this.subscriptionTokens.push({token:PubSub.subscribe('newWidgetDsSnapshot', this.subscriptionHandler.bind(this)),msg:'newWidgetDsSnapshot'});
    this.subscriptionTokens.push({token:PubSub.subscribe('newWidgetDpSnapshot', this.subscriptionHandler.bind(this)),msg:'newWidgetDpSnapshot'});
    this.subscriptionTokens.push({token:PubSub.subscribe('newWidgetMpSnapshot', this.subscriptionHandler.bind(this)),msg:'newWidgetMpSnapshot'});

}

WidgetStore.prototype = {
    subscriptionHandler: function (msg, data) {
        switch (msg) {
            case 'widgetConfigReq':
                processMsgWidgetConfigReq(data)
                break;
            case 'newWidget':
                processMsgNewWidget(data)
                break;
            case 'modifyWidget':
                processMsgModifyWidget(data)
                break;
            case 'deleteWidget':
                processMsgDeleteWidget(data)
                break;
            case 'newWidgetDsSnapshot':
                processMsgNewWidgetDsSnapshot(data)
                break;
            case 'newWidgetDpSnapshot':
                processMsgNewWidgetDpSnapshot(data)
                break;
            case 'newWidgetMpSnapshot':
                processMsgNewWidgetMpSnapshot(data)
                break;
        }
    },
    storeConfig: function (wid, data) {
        doStore=false
        if (!this._widgetConfig.hasOwnProperty(wid)) {
            this._widgetConfig[wid]={}
            $.each(data, function (key,value) {
                this._widgetConfig[wid][key]=value
            }.bind(this));
            doStore=true
        }
        else {
            $.each(data, function (key,value) {
                if (!(this._widgetConfig[wid].hasOwnProperty(key) && this._widgetConfig[wid][key]==value)) {
                    doStore=true
                }
            }.bind(this));
            if (doStore) {
                this._widgetConfig[wid]=data
            }
        }
        return doStore;
    }
};

var widgetStore = new WidgetStore();


function processMsgNewWidget(msgData) {
    requestData={type:msgData.type,widgetname:msgData.widgetname}
    $.ajax({
        url: '/etc/wg/',
        dataType: 'json',
        type: 'POST',
        data: JSON.stringify(requestData),
    })
    .done(function (data) {
        PubSub.publish('loadSlide',{wid:data.wid})
    })
    .fail(function (data) {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error creating graph. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()})
    })
}

function processMsgModifyWidget(msgData) {
    var modifyWidgetname = function (widgetname) {
        requestData={widgetname:widgetname}
        return $.ajax({
            url: '/etc/wg/'+msgData.wid,
            dataType: 'json',
            type: 'PUT',
            data: JSON.stringify(requestData),
        })
    }
    var addDatapoint = function (pid) {
        return $.ajax({
            url: '/etc/wg/'+msgData.wid+'/dp/'+pid,
            dataType: 'json',
            type: 'POST',
        })
    }
    var deleteDatapoint = function (pid) {
        return $.ajax({
            url: '/etc/wg/'+msgData.wid+'/dp/'+pid,
            dataType: 'json',
            type: 'DELETE',
        })
    }
    var endModify = function () {
        PubSub.publish('widgetConfigReq',{wid:msgData.wid})
    }
    requests=[]
    if (msgData.hasOwnProperty('new_widgetname')) {
        requests.push({method:'widgetname',widgetname:msgData.new_widgetname})
    }
    if (msgData.hasOwnProperty('new_datapoints')) {
        for (var i=0;i<msgData.new_datapoints.length;i++) {
            requests.push({method:'add',pid:msgData.new_datapoints[i]})
        }
    }
    if (msgData.hasOwnProperty('delete_datapoints')) {
        for (var i=0;i<msgData.delete_datapoints.length;i++) {
            requests.push({method:'delete',pid:msgData.delete_datapoints[i]})
        }
    }
    chainRequests=[]
    for (var i=0;i<requests.length;i++) {
        if (i==0) {
            if (requests[i].method=='widgetname') {
                chainRequests.push(modifyWidgetname(requests[i].widgetname))
            } else if (requests[i].method=='add') {
                chainRequests.push(addDatapoint(requests[i].pid))
            } else if (requests[i].method=='delete') {
                chainRequests.push(deleteDatapoint(requests[i].pid))
            }
        } else {
            if (requests[i].method=='widgetname') {
                chainRequests.push(chainRequests[i-1].then(modifyWidgetname(requests[i].widgetname)))
            } else if (requests[i].method=='add') {
                chainRequests.push(chainRequests[i-1].then(addDatapoint(requests[i].pid)))
            } else if (requests[i].method=='delete') {
                chainRequests.push(chainRequests[i-1].then(deleteDatapoint(requests[i].pid)))
            }
        }
    }
    if (chainRequests.length>0) {
        chainRequests[chainRequests.length-1].then(endModify())
    }
}

function processMsgDeleteWidget(msgData) {
    if (msgData.hasOwnProperty('wid')) {
        $.ajax({
            url: '/etc/wg/'+msgData.wid,
            dataType: 'json',
            type: 'DELETE',
        })
        .then(function(data){
        }, function(data){
            PubSub.publish('barMessage',{message:{type:'danger',message:'Error deleting widget. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()})
        });
    }
}

function processMsgWidgetConfigReq (data) {
    if (data.hasOwnProperty('wid')) {
        requestWidgetConfig(data.wid)
    }
}

function requestWidgetConfig (wid) {
    $.ajax({
        url: '/etc/wg/'+wid,
        dataType: 'json',
    })
    .done(function (data) {
        widgetStore.storeConfig(wid, data);
        sendWidgetConfigUpdate(wid);
    })
}

function sendWidgetConfigUpdate (wid) {
    if (widgetStore._widgetConfig.hasOwnProperty(wid)) {
        console.log('envio la conf del puto widget')
        PubSub.publish('widgetConfigUpdate-'+wid,wid)
    }
}

function processMsgNewWidgetDsSnapshot(msgData) {
    requestData={seq:msgData.seq,ul:msgData.user_list}
    $.ajax({
        url: '/etc/wg/'+msgData.wid+'/sn/',
        dataType: 'json',
        type: 'POST',
        data: JSON.stringify(requestData),
    })
    .done(function (data) {
        PubSub.publish('barMessage',{message:{type:'success',message:'Snapshot shared successfully'},messageTime:(new Date).getTime()})
    })
    .fail(function (data) {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error creating snapshot. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()})
    })
}

function processMsgNewWidgetDpSnapshot(msgData) {
    requestData={its:msgData.interval.its, ets:msgData.interval.ets, ul:msgData.user_list}
    $.ajax({
        url: '/etc/wg/'+msgData.wid+'/sn/',
        dataType: 'json',
        type: 'POST',
        data: JSON.stringify(requestData),
    })
    .done(function (data) {
        PubSub.publish('barMessage',{message:{type:'success',message:'Snapshot shared successfully'},messageTime:(new Date).getTime()})
    })
    .fail(function (data) {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error creating snapshot. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()})
    })
}

function processMsgNewWidgetMpSnapshot(msgData) {
    requestData={its:msgData.interval.its, ets:msgData.interval.ets, ul:msgData.user_list}
    $.ajax({
        url: '/etc/wg/'+msgData.wid+'/sn/',
        dataType: 'json',
        type: 'POST',
        data: JSON.stringify(requestData),
    })
    .done(function (data) {
        PubSub.publish('barMessage',{message:{type:'success',message:'Snapshot shared successfully'},messageTime:(new Date).getTime()})
    })
    .fail(function (data) {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error creating snapshot. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()})
    })
}

*/
