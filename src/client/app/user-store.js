import PubSub from 'pubsub-js';
import $ from 'jquery';
import {topics} from './types.js';

class UserStore {
    constructor () {
        this._userConfig = {};
        this._authorizedKeysConfig = {};
        this._plansConfig = {};
        this._sharedUrisConfig = {};

        var subscribedTopics = [
            topics.MY_USER_CONFIG_REQUEST,
            topics.SHARED_URIS_CONFIG_REQUEST,
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
            case topics.MY_USER_CONFIG_REQUEST:
                processMsgMyUserConfigReq(data);
                break;
            case topics.SHARED_URIS_CONFIG_REQUEST:
                processMsgSharedUrisConfigReq(data);
                break;
        }
    }

    storeUserConfig (data) {
        var result = {};
        var uid=data.uid;
        if (!this._userConfig.hasOwnProperty(uid)) {
            result.modified = true;
            this._userConfig[uid]={};
        }
        else {
            var newKeys = Object.keys(data);
            var oldKeys = Object.keys(this._userConfig[uid]);
            if (newKeys.length != oldKeys.length) {
                result.modified = true;
            } else {
                result.modified = newKeys.some( key => {
                    return !(oldKeys.indexOf(key) > -1 && this._userConfig[uid][key]==data[key]);
                });
            }
        }
        if (result.modified) {
            this._userConfig[uid]=data;
        }
        return result;
    }

    storeAuthorizedKeysConfig (data) {
        var result = {};
        if (data.length != this._authorizedKeysConfig.length) {
            result.modified = true;
        } else {
            result.modified = data.some ( newag => {
                var equal = this._authorizedKeysConfig.some ( oldag => {
                    console.log(newag,oldag);
                    return Object.keys(oldag).every( key => oldag[key] == newag[key]);
                });
                console.log(equal);
                return !equal
            });
        }
        if (result.modified) {
            this._authorizedKeysConfig = data;
        }
        return result;
    }

    storePlansConfig (data) {
        var result = {};
        this._plansConfig = data;
        result.modified = true;
        return result;
    }

    storeSharedUrisConfig (data) {
        var result = {};
        var newUris = Object.keys(data);
        var oldUris = Object.keys(this._sharedUrisConfig);
        if (newUris.length != oldUris.length) {
            result.modified = true;
        } else {
            result.modified = newUris.some( uri => {
                var newUriUsers = data[uri];
                var oldUriUsers = this._sharedUrisConfig[uri];
                var newUsers = newUriUsers.some( user => oldUriUsers.indexOf(user) < 0);
                var delUsers = oldUriUsers.some( user => newUriUsers.indexOf(user) < 0);
                console.log('comparativa',newUriUsers, oldUriUsers, newUsers, delUsers);
                return (newUsers || delUsers);
            });
        }
        if (result.modified) {
            this._sharedUrisConfig = data;
        }
        return result;
    }

    getMyUserConfig () {
        var config;
        var promise = new Promise ( (resolve, reject) => {
            var url='/etc/usr/';
            $.ajax({
                url: url,
                dataType: 'json',
            })
            .done( data => {
                var result=this.storeUserConfig(data);
                if (result.modified) {
                    var topic = topics.MY_USER_CONFIG_UPDATE;
                    PubSub.publish(topic,{});
                }
                config = this._userConfig[data.uid]
                resolve(config);
            });
        });
        return promise;
    }

    getMyAuthorizedKeysConfig () {
        var config;
        var promise = new Promise ( (resolve, reject) => {
            var url='/etc/ag/';
            $.ajax({
                url: url,
                dataType: 'json',
            })
            .done( data => {
                var result=this.storeAuthorizedKeysConfig(data);
                console.log('keys recibidas',data,result);
                if (result.modified) {
                    var topic = topics.MY_AUTHORIZED_KEYS_CONFIG_UPDATE;
                    PubSub.publish(topic,{});
                }
                config = this._authorizedKeysConfig;
                resolve(config);
            });
        });
        return promise;
    }

    getMyPlanConfig () {
        var config;
        var promise = new Promise ( (resolve, reject) => {
            var url='/etc/usr/upgrade';
            $.ajax({
                url: url,
                dataType: 'json',
            })
            .done( data => {
                var result=this.storePlansConfig(data);
                if (result.modified) {
                    var topic = topics.MY_PLAN_CONFIG_UPDATE;
                    PubSub.publish(topic,{});
                }
                config = this._plansConfig;
                resolve(config);
            });
        });
        return promise;
    }

    getMySharedUrisConfig () {
        var config;
        var promise = new Promise ( (resolve, reject) => {
            var url='/var/uri/shared';
            $.ajax({
                url: url,
                dataType: 'json',
            })
            .done( data => {
                var result=this.storeSharedUrisConfig(data);
                if (result.modified) {
                    var topic = topics.MY_SHARED_URIS_CONFIG_UPDATE;
                    PubSub.publish(topic,{});
                }
                config = this._sharedUrisConfig;
                resolve(config);
            });
        });
        return promise;
    }

}

let userStore = new UserStore();

function getMyUserConfig () {
    return userStore.getMyUserConfig();
}

function getMyAuthorizedKeysConfig () {
    return userStore.getMyAuthorizedKeysConfig();
}

function getMyPlanConfig () {
    return userStore.getMyPlanConfig();
}

function getMySharedUrisConfig () {
    return userStore.getMySharedUrisConfig();
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
            var payload = {
                message:{type:'success',message:'Password updated successfully'},
                messageTime:(new Date).getTime()
            };
            PubSub.publish(topics.BAR_MESSAGE,payload);
            callback();
        })
        .fail( data => {
            var payload = {
                message:{type:'danger',message:'Error updating password. Code: '+data.responseJSON.error},
                messageTime:(new Date).getTime()
            };
            PubSub.publish(topics.BAR_MESSAGE, payload);
        });
    } else {
        var payload = {
            message:{type:'danger',message:'Error updating password. Invalid form data'},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE, payload);
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
        var payload = {
            message:{type:'success',message:'So long, and thanks for all the fish.'},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE, payload);
        setTimeout(() => {window.location.href = "/";}, 2000);
    })
    .fail( data => {
        var payload = {
            message:{type:'danger',message:'Error deleting user. Code: '+data.responseJSON.error},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE, payload);
    });
}

function deleteKey (key) {
    var url='/etc/ag/'+key;
    $.ajax({
        url: url,
        dataType: 'json',
        type: 'DELETE',
    })
    .done( data => {
        userStore.getMyAuthorizedKeysConfig();
        var payload = {
            message:{type:'success',message:'Key deleted'},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE, payload);
    })
    .fail( data => {
        var payload = {
            message:{type:'danger',message:'Error deleting key. Code: '+data.responseJSON.error},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE, payload);
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
        userStore.getMyAuthorizedKeysConfig();
        var payload = {
            message:{type:'success',message:'Key suspended'},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE, payload);
    })
    .fail( data => {
        var payload = {
            message:{type:'danger',message:'Error suspending key. Code: '+data.responseJSON.error},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE, payload);
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
        userStore.getMyAuthorizedKeysConfig();
        var payload = {
            message:{type:'success',message:'Key activated'},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE, payload);
    })
    .fail( data => {
        var payload = {
            message:{type:'danger',message:'Error activating key. Code: '+data.responseJSON.error},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE, payload);
    });
}

function newKey (title, pubkey) {
    console.log('new key',title,pubkey);
    var requestData={
        agentname:title,
        pubkey:btoa(unescape(encodeURIComponent(pubkey))),
        version:'web'
    };
    var url='/etc/ag/';
    $.ajax({
        url: url,
        dataType: 'json',
        type: 'POST',
        data: JSON.stringify(requestData),
    })
    .done( data => {
        userStore.getMyAuthorizedKeysConfig();
        var payload = {
            message:{type:'success',message:'New key added'},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE, payload);
    })
    .fail( data => {
        var payload = {
            message:{type:'danger',message:'Error adding key. Code: '+data.responseJSON.error},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE, payload);
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
            userStore.getMyPlanConfig();
            callback();
            var payload = {
                message:{type:'success',message:'User plan modified successfully'},
                messageTime:(new Date).getTime()
            };
            PubSub.publish(topics.BAR_MESSAGE, payload);
        })
        .fail( response => {
            var payload = {
                message:{type:'danger',message:'Error modifying user plan. Code: '+response.responseJSON.error},
                messageTime:(new Date).getTime()
            };
            PubSub.publish(topics.BAR_MESSAGE, payload);
        });
    } else {
        Stripe.card.createToken({
            number: data.cardNumber,
            cvc: data.cardVerifyCode,
            exp_month: data.cardMonth,
            exp_year: data.cardYear
        }, (status, response) => {
            if (response.error) {
                var payload = {
                    message:{type:'danger',message:'Error in credit card. Code: '+response.error.message},
                    messageTime:(new Date).getTime()
                };
                PubSub.publish(topics.BAR_MESSAGE, payload);
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
                    userStore.getMyPlanConfig();
                    callback();
                    var payload = {
                        message:{type:'success',message:'User plan modified successfully'},
                        messageTime:(new Date).getTime()
                    };
                    PubSub.publish(topics.BAR_MESSAGE, payload);
                })
                .fail( response => {
                    var payload = {
                        message:{type:'danger',message:'Error modifying user plan. Code: '+response.responseJSON.error},
                        messageTime:(new Date).getTime()
                    };
                    PubSub.publish(topics.BAR_MESSAGE, payload);
                });
            }
        });
    }
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
        userStore.getMySharedUrisConfig();
        if (users.length>0) {
            var message = 'Stop sharing '+uri+' to '+users.join()+' done.';
        } else {
            var message = 'Stop sharing '+uri+' done.';
        }
        var payload = {
            message:{type:'success',message:message},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE, payload);
    })
    .fail( data => {
        var payload = {
            message:{type:'danger',message:'Error unsharing uri. Code: '+data.responseJSON.error},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE, payload);
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
        userStore.getMySharedUrisConfig();
        var message = uri+' shared with '+users.join()+' successfully.';
        var payload = {
            message:{type:'success',message:message},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE, payload);
    })
    .fail( data => {
        var payload = {
            message:{type:'danger',message:'Error sharing uri. Code: '+data.responseJSON.error},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE, payload);
    });
}

export {
    getMyUserConfig,
    getMyAuthorizedKeysConfig,
    getMyPlanConfig,
    getMySharedUrisConfig,
    newKey,
    deleteKey,
    suspendKey,
    activateKey,
    updateUserPassword,
    deleteUser,
    upgradePlan,
    deleteSharedUri,
    shareNewUri
}

