import PubSub from 'pubsub-js';
import $ from 'jquery';

class SnapshotStore {
    constructor () {
        this._snapshotConfig = {};
        this.subscriptionTokens = [];
        this.subscriptionTokens.push({token:PubSub.subscribe('snapshotConfigReq', this.subscriptionHandler.bind(this)),msg:'snapshotConfigReq'});
        this.subscriptionTokens.push({token:PubSub.subscribe('deleteSnapshot', this.subscriptionHandler.bind(this)),msg:'deleteSnapshot'});
    }

    subscriptionHandler (msg, data) {
        switch (msg) {
            case 'snapshotConfigReq':
                processMsgSnapshotConfigReq(data);
                break;
            case 'deleteSnapshot':
                processMsgDeleteSnapshot(data);
                break;
        }
    }

    storeSnapshotConfig (nid, data) {
        var doStore=false;
        if (!this._snapshotConfig.hasOwnProperty(nid)) {
            this._snapshotConfig[nid]={};
            Object.keys(data).forEach( key => {
                this._snapshotConfig[nid][key]=data[key];
            });
            doStore=true;
        }
        else {
            Object.keys(data).forEach(key => {
                if (!(this._snapshotConfig[nid].hasOwnProperty(key) && this._snapshotConfig[nid][key]==data[key])) {
                    doStore=true;
                }
            });
            if (doStore) {
                this._snapshotConfig[nid]=data;
            }
        }
        return doStore;
    }

}

let snapshotStore = new SnapshotStore();

function processMsgDeleteSnapshot(msgData) {
    if (msgData.hasOwnProperty('nid')) {
        $.ajax({
            url: '/etc/sn/'+msgData.nid,
            dataType: 'json',
            type: 'DELETE',
        })
        .then( data => {
            PubSub.publish('closeSlide',{lid:msgData.nid});
        }, data => {
            PubSub.publish('barMessage',{message:{type:'danger',message:'Error deleting snapshot. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()});
        });
    }
}

function processMsgSnapshotConfigReq (data) {
    if (data.hasOwnProperty('nid')) {
        if (snapshotStore._snapshotConfig.hasOwnProperty(data.nid)) {
            sendSnapshotConfigUpdate(data.nid);
        }
        requestSnapshotConfig(data.nid, data.tid);
    }
}

function requestSnapshotConfig (nid, tid) {
    var parameters = {};
    if (tid) {
        parameters={t:tid};
    }
    $.ajax({
        url: '/etc/sn/'+nid,
        dataType: 'json',
        data: parameters,
    })
    .done(data => {
        var changed=snapshotStore.storeSnapshotConfig(nid, data);
        if (changed == true) {
            sendSnapshotConfigUpdate(nid);
        }
    });
}

function sendSnapshotConfigUpdate (nid) {
    if (snapshotStore._snapshotConfig.hasOwnProperty(nid)) {
        PubSub.publish('snapshotConfigUpdate-'+nid,nid);
    }
}

export {
    snapshotStore
}


/*

function SnapshotStore () {
    this._snapshotConfig = {};
    this.subscriptionTokens = [];

    this.subscriptionTokens.push({token:PubSub.subscribe('snapshotConfigReq', this.subscriptionHandler.bind(this)),msg:'snapshotConfigReq'});
    this.subscriptionTokens.push({token:PubSub.subscribe('deleteSnapshot', this.subscriptionHandler.bind(this)),msg:'deleteSnapshot'});

}

SnapshotStore.prototype = {
    subscriptionHandler: function (msg, data) {
        switch (msg) {
            case 'snapshotConfigReq':
                processMsgSnapshotConfigReq(data)
                break;
            case 'deleteSnapshot':
                processMsgDeleteSnapshot(data)
                break;
        }
    },
};

var snapshotStore = new SnapshotStore();


function processMsgDeleteSnapshot(msgData) {
    if (msgData.hasOwnProperty('nid')) {
        $.ajax({
            url: '/etc/sn/'+msgData.nid,
            dataType: 'json',
            type: 'DELETE',
        })
        .then(function(data){
            PubSub.publish('closeSlide',{lid:msgData.nid});
        }, function(data){
            PubSub.publish('barMessage',{message:{type:'danger',message:'Error deleting snapshot. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()});
        });
    }
}

function processMsgSnapshotConfigReq (data) {
    if (data.hasOwnProperty('nid')) {
        if (snapshotStore._snapshotConfig.hasOwnProperty(data.nid)) {
            sendSnapshotConfigUpdate(data.nid)
        }
        requestSnapshotConfig(data.nid, data.tid)
    }
}

function requestSnapshotConfig (nid, tid) {
    if (tid) {
        parameters={t:tid}
    } else {
        parameters={}
    }
    $.ajax({
        url: '/etc/sn/'+nid,
        dataType: 'json',
        data: parameters,
    })
    .done(function (data) {
        changed=storeSnapshotConfig(nid, data);
        if (changed == true) {
            sendSnapshotConfigUpdate(nid);
        }
    })
}

function storeSnapshotConfig (nid, data) {
    doStore=false
    if (!snapshotStore._snapshotConfig.hasOwnProperty(nid)) {
        snapshotStore._snapshotConfig[nid]={}
        $.each(data, function (key,value) {
            snapshotStore._snapshotConfig[nid][key]=value
        });
        doStore=true
    }
    else {
        $.each(data, function (key,value) {
            if (!(snapshotStore._snapshotConfig[nid].hasOwnProperty(key) && snapshotStore._snapshotConfig[nid][key]==value)) {
                doStore=true
            }
        });
        if (doStore) {
            snapshotStore._snapshotConfig[nid]=data
        }
    }
    return doStore;
}

function sendSnapshotConfigUpdate (nid) {
    if (snapshotStore._snapshotConfig.hasOwnProperty(nid)) {
        PubSub.publish('snapshotConfigUpdate-'+nid,nid)
    }
}

*/
