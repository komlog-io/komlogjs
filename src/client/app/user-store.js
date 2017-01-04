import PubSub from 'pubsub-js';
import $ from 'jquery';

class UserStore {
    constructor () {
        this._userConfig = {};
        this._agentsConfig = {};
        this._plansConfig = {};
        this._sharedUrisConfig = {};
        this.subscriptionTokens = [];

        this.subscriptionTokens.push({token:PubSub.subscribe('myUserConfigReq', this.subscriptionHandler.bind(this)),msg:'myUserConfigReq'});
        this.subscriptionTokens.push({token:PubSub.subscribe('sharedUrisConfigReq', this.subscriptionHandler.bind(this)),msg:'sharedUrisConfigReq'});
    }

    subscriptionHandler (msg, data) {
        switch (msg) {
            case 'myUserConfigReq':
                processMsgMyUserConfigReq(data);
                break;
            case 'sharedUrisConfigReq':
                processMsgSharedUrisConfigReq(data);
                break;
        }
    }

    storeUserConfig (data) {
        var storeNew=false;
        var uid=data.uid;
        if (!this._userConfig.hasOwnProperty(uid)) {
            this._userConfig[uid]={};
            Object.keys(data).forEach( key => {
                this._userConfig[uid][key]=data[key];
            });
            storeNew=true;
        }
        else {
            Object.keys(data).forEach( key => {
                if (!(this._userConfig[uid].hasOwnProperty(key) && this._userConfig[uid][key]==data[key])) {
                    storeNew=true;
                }
            });
            if (storeNew) {
                this._userConfig[uid]=data;
            }
        }
        return storeNew;
    }

    storeAgentsConfig (data) {
        this._agentsConfig = {};
        for (var i= 0; i<data.length; i++) {
            var item = data[i];
            this._agentsConfig[item.aid] = {
                agentname:item.agentname,
                state:item.state,
                pubkey:item.pubkey
            };
        }
    }

    storePlansConfig (data) {
        this._plansConfig = data;
    }

    storeSharedUrisConfig (data) {
        this._sharedUrisConfig = data;
    }
}

let userStore = new UserStore();
console.log('userstore vale',userStore);

function processMsgMyUserConfigReq (data) {
    requestMyUserConfig();
    requestMyAgentsConfig();
    requestMyPlansConfig();
}

function processMsgSharedUrisConfigReq (data) {
    requestSharedUrisConfig();
}

function requestMyUserConfig () {
    var url='/etc/usr/';
    $.ajax({
        url: url,
        dataType: 'json',
    })
    .done( data => {
        var changed=userStore.storeUserConfig(data);
        if (changed == true ) {
            sendMyUserConfigUpdate(data.uid);
        }
    });
}

function requestMyAgentsConfig () {
    var url='/etc/ag/';
    $.ajax({
        url: url,
        dataType: 'json',
    })
    .done( data => {
        userStore.storeAgentsConfig(data);
        sendMyUserConfigUpdate();
    });
}

function requestMyPlansConfig () {
    var url='/etc/usr/upgrade/';
    $.ajax({
        url: url,
        dataType: 'json',
    })
    .done( data => {
        userStore.storePlansConfig(data);
        sendMyUserConfigUpdate();
    });
}

function requestSharedUrisConfig () {
    var url='/var/uri/shared/';
    $.ajax({
        url: url,
        dataType: 'json',
    })
    .done( data => {
        userStore.storeSharedUrisConfig(data);
        sendSharedUrisConfigUpdate();
    });
}

function sendMyUserConfigUpdate (uid) {
    if (uid == undefined) {
        PubSub.publish('myUserConfigUpdate',{});
    } else if (userStore._userConfig.hasOwnProperty(uid)) {
        PubSub.publish('myUserConfigUpdate',uid);
    }
}

function sendSharedUrisConfigUpdate () {
    PubSub.publish('sharedUrisConfigUpdate',{});
}

function updateUserPassword (old_password, new_password, new_password2, callback) {
    if (old_password != null && new_password != null && new_password == new_password2 && old_password != new_password) {
        var url='/config/';
        var requestData = {
            'new_password':new_password,
            'old_password':old_password
        };
        $.ajax({
            url: url,
            dataType: 'json',
            type: 'PUT',
            data: JSON.stringify(requestData),
        })
        .done( data => {
            PubSub.publish('barMessage',{message:{type:'success',message:'Password updated successfully'},messageTime:(new Date).getTime()});
            callback();
        })
        .fail( data => {
            PubSub.publish('barMessage',{message:{type:'danger',message:'Error updating password. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()});
        });
    } else {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error updating password. Invalid form data'},messageTime:(new Date).getTime()});
        return false;
    }
}

function deleteUser () {
    var url='/config/';
    $.ajax({
        url: url,
        dataType: 'json',
        type: 'DELETE',
    })
    .done( data => {
        PubSub.publish('barMessage',{message:{type:'success',message:'Bye, bye'},messageTime:(new Date).getTime()});
        window.location.href = "/";
    })
    .fail( data => {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error deleting user. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()});
    });
}

function getAuthorizedKeys () {
    var keys = [];
    for ( var key in userStore._agentsConfig) {
        var item = userStore._agentsConfig[key];
        keys.push({title:item.agentname, state:item.state, aid:key, pubkey:item.pubkey});
    }
    return keys;
}

function getSharedUris () {
    var data = [];
    for ( var uri in userStore._sharedUrisConfig) {
        var users = userStore._sharedUrisConfig[uri];
        data.push({uri:uri, users:users});
    }
    return data;
}

function deleteKey (key) {
    var url='/etc/ag/'+key;
    $.ajax({
        url: url,
        dataType: 'json',
        type: 'DELETE',
    })
    .done( data => {
        requestMyAgentsConfig();
        PubSub.publish('barMessage',{message:{type:'success',message:'Key deleted'},messageTime:(new Date).getTime()});
    })
    .fail( data => {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error deleting key. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()});
    });
}

function suspendKey (key) {
    var url='/etc/ag/'+key+'/suspend/';
    $.ajax({
        url: url,
        dataType: 'json',
        type: 'POST',
    })
    .done( data => {
        requestMyAgentsConfig();
        PubSub.publish('barMessage',{message:{type:'success',message:'Key suspended'},messageTime:(new Date).getTime()});
    })
    .fail( data => {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error suspending key. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()});
    });
}

function activateKey (key) {
    var url='/etc/ag/'+key+'/activate/';
    $.ajax({
        url: url,
        dataType: 'json',
        type: 'POST',
    })
    .done( data => {
        requestMyAgentsConfig();
        PubSub.publish('barMessage',{message:{type:'success',message:'Key activated'},messageTime:(new Date).getTime()});
    })
    .fail( data => {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error activating key. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()});
    });
}

function newKey (title, pubkey) {
    var requestData={agentname:title,pubkey:btoa(unescape(encodeURIComponent(pubkey))),version:'web'};
    var url='/etc/ag/';
    $.ajax({
        url: url,
        dataType: 'json',
        type: 'POST',
        data: JSON.stringify(requestData),
    })
    .done( data => {
        requestMyAgentsConfig();
        PubSub.publish('barMessage',{message:{type:'success',message:'New key added'},messageTime:(new Date).getTime()});
    })
    .fail( data => {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error adding key. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()});
    });
}

function upgradePlan(data, callback) {
    if (data.needsCard === false) {
        var requestData={s:data.newPlan};
        var url='/etc/usr/upgrade';
        $.ajax({
            url: url,
            dataType: 'json',
            type: 'PUT',
            data: JSON.stringify(requestData),
        })
        .done( response => {
            requestMyPlansConfig();
            callback();
            PubSub.publish('barMessage',{message:{type:'success',message:'User plan modified successfully'},messageTime:(new Date).getTime()});
        })
        .fail( response => {
            PubSub.publish('barMessage',{message:{type:'danger',message:'Error modifying user plan. Code: '+response.responseJSON.error},messageTime:(new Date).getTime()});
        });
    } else {
        Stripe.card.createToken({
            number: data.cardNumber,
            cvc: data.cardVerifyCode,
            exp_month: data.cardMonth,
            exp_year: data.cardYear
        }, (status, response) => {
            if (response.error) {
                PubSub.publish('barMessage',{message:{type:'danger',message:'Error in credit card. Code: '+response.error.message},messageTime:(new Date).getTime()});
            } else {
                var token = response.id;
                var requestData={s:data.newPlan,t:token};
                var url='/etc/usr/upgrade';
                $.ajax({
                    url: url,
                    dataType: 'json',
                    type: 'PUT',
                    data: JSON.stringify(requestData),
                })
                .done( response => {
                    requestMyPlansConfig();
                    callback();
                    PubSub.publish('barMessage',{message:{type:'success',message:'User plan modified successfully'},messageTime:(new Date).getTime()});
                })
                .fail( response => {
                    PubSub.publish('barMessage',{message:{type:'danger',message:'Error modifying user plan. Code: '+response.responseJSON.error},messageTime:(new Date).getTime()});
                });
            }
        });
    }
}

function getMyPlanInfo() {
    var info = {};
    if (userStore._plansConfig.hasOwnProperty('current_plan')) {
        info.description = userStore._plansConfig.current_plan.description;
        info.id = userStore._plansConfig.current_plan.id;
        info.price = userStore._plansConfig.current_plan.price;
    }
    if (userStore._plansConfig.hasOwnProperty('payment_info')) {
        info.payment_info = {
            'last4':userStore._plansConfig.payment_info.last4,
            'exp_month':userStore._plansConfig.payment_info.exp_month,
            'exp_year':userStore._plansConfig.payment_info.exp_year,
        };
    }
    return info;
}

function getAllowedPlans() {
    var plans = [];
    if (userStore._plansConfig.hasOwnProperty('allowed_plans')) {
        for (var i=0;i<userStore._plansConfig.allowed_plans.length;i++) {
            plans.push({
            'description':userStore._plansConfig.allowed_plans[i].description,
            'id':userStore._plansConfig.allowed_plans[i].id,
            'price':userStore._plansConfig.allowed_plans[i].price,
            });
        }
    }
    return plans;
}

function deleteSharedUri(uri,user) {
    if (user == null) {
        var users=[];
    } else {
        var users=[user];
    }
    var requestData={uri:uri,users:users};
    var url='/var/uri/shared';
    $.ajax({
        url: url,
        dataType: 'json',
        type: 'DELETE',
        data: JSON.stringify(requestData),
    })
    .done( data => {
        requestSharedUrisConfig();
        if (users.length>0) {
            var message = 'Stop sharing '+uri+' to '+users.join()+' done.';
        } else {
            var message = 'Stop sharing '+uri+' done.';
        }
        PubSub.publish('barMessage',{message:{type:'success',message:message},messageTime:(new Date).getTime()});
    })
    .fail( data => {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error unsharing uri. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()});
    });
}

function shareNewUri(uri,users) {
    var requestData={uri:uri,users:users};
    var url='/var/uri/shared';
    $.ajax({
        url: url,
        dataType: 'json',
        type: 'POST',
        data: JSON.stringify(requestData),
    })
    .done( data => {
        requestSharedUrisConfig();
        var message = uri+' shared with '+users.join()+' successfully.';
        PubSub.publish('barMessage',{message:{type:'success',message:message},messageTime:(new Date).getTime()});
    })
    .fail( data => {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error sharing uri. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()});
    });
}

export {
    userStore,
    getAuthorizedKeys,
    newKey,
    deleteKey,
    suspendKey,
    activateKey,
    updateUserPassword,
    deleteUser,
    getMyPlanInfo,
    getAllowedPlans,
    upgradePlan,
    getSharedUris,
    deleteSharedUri,
    shareNewUri



}

/*
function UserStore () {
    this._userConfig = {};
    this._agentsConfig = {};
    this._plansConfig = {};
    this._sharedUrisConfig = {};
    this.subscriptionTokens = [];

    this.subscriptionTokens.push({token:PubSub.subscribe('myUserConfigReq', this.subscriptionHandler.bind(this)),msg:'myUserConfigReq'});
    this.subscriptionTokens.push({token:PubSub.subscribe('sharedUrisConfigReq', this.subscriptionHandler.bind(this)),msg:'sharedUrisConfigReq'});

}

UserStore.prototype = {
    subscriptionHandler: function (msg, data) {
        switch (msg) {
            case 'myUserConfigReq':
                processMsgMyUserConfigReq(data);
                break;
            case 'sharedUrisConfigReq':
                processMsgSharedUrisConfigReq(data);
                break;
        }
    },
    storeUserConfig: function (data) {
        storeNew=false
        uid=data.uid
        if (!this._userConfig.hasOwnProperty(uid)) {
            this._userConfig[uid]={}
            $.each(data, function (key,value) {
                this._userConfig[uid][key]=value
            }.bind(this));
            storeNew=true
        }
        else {
            $.each(data, function (key,value) {
                if (!(this._userConfig[uid].hasOwnProperty(key) && this._userConfig[uid][key]==value)) {
                    storeNew=true
                }
            }.bind(this));
            if (storeNew) {
                this._userConfig[uid]=data
            }
        }
        return storeNew;
    },
    storeAgentsConfig: function (data) {
        this._agentsConfig = {}
        for (var i= 0; i<data.length; i++) {
            var item = data[i];
            this._agentsConfig[item.aid] = {
                agentname:item.agentname,
                state:item.state,
                pubkey:item.pubkey
            };
        }
    },
    storePlansConfig: function (data) {
        this._plansConfig = data
    },
    storeSharedUrisConfig: function (data) {
        this._sharedUrisConfig = data
    }
};

var userStore = new UserStore();

function processMsgMyUserConfigReq (data) {
    requestMyUserConfig();
    requestMyAgentsConfig();
    requestMyPlansConfig();
}

function processMsgSharedUrisConfigReq (data) {
    requestSharedUrisConfig();
}

function requestMyUserConfig () {
    url='/etc/usr/'
    $.ajax({
        url: url,
        dataType: 'json',
    })
    .done(function (data) {
        changed=userStore.storeUserConfig(data);
        if (changed == true ) {
            sendMyUserConfigUpdate(data.uid);
        }
    })
}

function requestMyAgentsConfig () {
    url='/etc/ag/'
    $.ajax({
        url: url,
        dataType: 'json',
    })
    .done(function (data) {
        userStore.storeAgentsConfig(data);
        sendMyUserConfigUpdate();
    })
}

function requestMyPlansConfig () {
    url='/etc/usr/upgrade/'
    $.ajax({
        url: url,
        dataType: 'json',
    })
    .done(function (data) {
        userStore.storePlansConfig(data);
        sendMyUserConfigUpdate();
    })
}

function requestSharedUrisConfig () {
    url='/var/uri/shared/'
    $.ajax({
        url: url,
        dataType: 'json',
    })
    .done(function (data) {
        userStore.storeSharedUrisConfig(data);
        sendSharedUrisConfigUpdate();
    })
}

function sendMyUserConfigUpdate (uid) {
    if (uid == undefined) {
        PubSub.publish('myUserConfigUpdate',{})
    } else if (userStore._userConfig.hasOwnProperty(uid)) {
        PubSub.publish('myUserConfigUpdate',uid)
    }
}

function sendSharedUrisConfigUpdate () {
    PubSub.publish('sharedUrisConfigUpdate',{})
}

function updateUserPassword (old_password, new_password, new_password2, callback) {
    if (old_password != null && new_password != null && new_password == new_password2 && old_password != new_password) {
        url='/config/'
        requestData={
            'new_password':new_password,
            'old_password':old_password
        }
        $.ajax({
            url: url,
            dataType: 'json',
            type: 'PUT',
            data: JSON.stringify(requestData),
        })
        .done(function (data) {
            PubSub.publish('barMessage',{message:{type:'success',message:'Password updated successfully'},messageTime:(new Date).getTime()})
            callback()
        })
        .fail(function (data) {
            PubSub.publish('barMessage',{message:{type:'danger',message:'Error updating password. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()})
        })
    } else {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error updating password. Invalid form data'},messageTime:(new Date).getTime()})
        return false
    }
}

function deleteUser () {
    url='/config/'
    $.ajax({
        url: url,
        dataType: 'json',
        type: 'DELETE',
    })
    .done(function (data) {
        PubSub.publish('barMessage',{message:{type:'success',message:'Bye, bye'},messageTime:(new Date).getTime()})
        window.location.href = "/";
    })
    .fail(function (data) {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error deleting user. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()})
    })
}

function getAuthorizedKeys () {
    var keys = []
    for ( var key in userStore._agentsConfig) {
        var item = userStore._agentsConfig[key];
        keys.push({title:item.agentname, state:item.state, aid:key, pubkey:item.pubkey});
    }
    return keys
}

function getSharedUris () {
    var data = []
    for ( var uri in userStore._sharedUrisConfig) {
        var users = userStore._sharedUrisConfig[uri];
        data.push({uri:uri, users:users});
    }
    return data
}

function deleteKey (key) {
    url='/etc/ag/'+key
    $.ajax({
        url: url,
        dataType: 'json',
        type: 'DELETE',
    })
    .done(function (data) {
        requestMyAgentsConfig();
        PubSub.publish('barMessage',{message:{type:'success',message:'Key deleted'},messageTime:(new Date).getTime()});
    })
    .fail(function (data) {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error deleting key. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()})
    })
}

function suspendKey (key) {
    url='/etc/ag/'+key+'/suspend/'
    $.ajax({
        url: url,
        dataType: 'json',
        type: 'POST',
    })
    .done(function (data) {
        requestMyAgentsConfig();
        PubSub.publish('barMessage',{message:{type:'success',message:'Key suspended'},messageTime:(new Date).getTime()});
    })
    .fail(function (data) {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error suspending key. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()})
    })
}

function activateKey (key) {
    url='/etc/ag/'+key+'/activate/'
    $.ajax({
        url: url,
        dataType: 'json',
        type: 'POST',
    })
    .done(function (data) {
        requestMyAgentsConfig();
        PubSub.publish('barMessage',{message:{type:'success',message:'Key activated'},messageTime:(new Date).getTime()});
    })
    .fail(function (data) {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error activating key. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()})
    })
}

function newKey (title, pubkey) {
    requestData={agentname:title,pubkey:btoa(unescape(encodeURIComponent(pubkey))),version:'web'}
    url='/etc/ag/'
    $.ajax({
        url: url,
        dataType: 'json',
        type: 'POST',
        data: JSON.stringify(requestData),
    })
    .done(function (data) {
        requestMyAgentsConfig();
        PubSub.publish('barMessage',{message:{type:'success',message:'New key added'},messageTime:(new Date).getTime()});
    })
    .fail(function (data) {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error adding key. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()})
    })
}

function upgradePlan(data, callback) {
    if (data.needsCard === false) {
        requestData={s:data.newPlan}
        url='/etc/usr/upgrade'
        $.ajax({
            url: url,
            dataType: 'json',
            type: 'PUT',
            data: JSON.stringify(requestData),
        })
        .done(function (response) {
            requestMyPlansConfig();
            callback();
            PubSub.publish('barMessage',{message:{type:'success',message:'User plan modified successfully'},messageTime:(new Date).getTime()});
        })
        .fail(function (response) {
            PubSub.publish('barMessage',{message:{type:'danger',message:'Error modifying user plan. Code: '+response.responseJSON.error},messageTime:(new Date).getTime()})
        })
    } else {
        Stripe.card.createToken({
            number: data.cardNumber,
            cvc: data.cardVerifyCode,
            exp_month: data.cardMonth,
            exp_year: data.cardYear
        }, function (status, response) {
            if (response.error) {
                PubSub.publish('barMessage',{message:{type:'danger',message:'Error in credit card. Code: '+response.error.message},messageTime:(new Date).getTime()})
            } else {
                token = response.id
                requestData={s:data.newPlan,t:token}
                url='/etc/usr/upgrade'
                $.ajax({
                    url: url,
                    dataType: 'json',
                    type: 'PUT',
                    data: JSON.stringify(requestData),
                })
                .done(function (response) {
                    requestMyPlansConfig();
                    callback();
                    PubSub.publish('barMessage',{message:{type:'success',message:'User plan modified successfully'},messageTime:(new Date).getTime()});
                })
                .fail(function (response) {
                    PubSub.publish('barMessage',{message:{type:'danger',message:'Error modifying user plan. Code: '+response.responseJSON.error},messageTime:(new Date).getTime()})
                })
            }
        });
    }
}

function getMyPlanInfo() {
    var info = {}
    if (userStore._plansConfig.hasOwnProperty('current_plan')) {
        info.description = userStore._plansConfig.current_plan.description
        info.id = userStore._plansConfig.current_plan.id
        info.price = userStore._plansConfig.current_plan.price
    }
    if (userStore._plansConfig.hasOwnProperty('payment_info')) {
        info.payment_info = {
            'last4':userStore._plansConfig.payment_info.last4,
            'exp_month':userStore._plansConfig.payment_info.exp_month,
            'exp_year':userStore._plansConfig.payment_info.exp_year,
        }
    }
    return info
}

function getAllowedPlans() {
    var plans = []
    if (userStore._plansConfig.hasOwnProperty('allowed_plans')) {
        for (var i=0;i<userStore._plansConfig.allowed_plans.length;i++) {
            plans.push({
            'description':userStore._plansConfig.allowed_plans[i].description,
            'id':userStore._plansConfig.allowed_plans[i].id,
            'price':userStore._plansConfig.allowed_plans[i].price,
            });
        }
    }
    return plans
}

function deleteSharedUri(uri,user) {
    if (user == null) {
        var users=[]
    } else {
        var users=[user]
    }
    requestData={uri:uri,users:users}
    url='/var/uri/shared'
    $.ajax({
        url: url,
        dataType: 'json',
        type: 'DELETE',
        data: JSON.stringify(requestData),
    })
    .done(function (data) {
        requestSharedUrisConfig();
        if (users.length>0) {
            var message = 'Stop sharing '+uri+' to '+users.join()+' done.'
        } else {
            var message = 'Stop sharing '+uri+' done.'
        }
        PubSub.publish('barMessage',{message:{type:'success',message:message},messageTime:(new Date).getTime()});
    })
    .fail(function (data) {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error unsharing uri. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()})
    })
}

function shareNewUri(uri,users) {
    requestData={uri:uri,users:users}
    url='/var/uri/shared'
    $.ajax({
        url: url,
        dataType: 'json',
        type: 'POST',
        data: JSON.stringify(requestData),
    })
    .done(function (data) {
        requestSharedUrisConfig();
        var message = uri+' shared with '+users.join()+' successfully.'
        PubSub.publish('barMessage',{message:{type:'success',message:message},messageTime:(new Date).getTime()});
    })
    .fail(function (data) {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error sharing uri. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()})
    })
}

*/
