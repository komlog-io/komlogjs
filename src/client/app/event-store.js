import $ from 'jquery';
import PubSub from 'pubsub-js';
import {topics} from './types.js';

class EventStore {
    constructor () {
        this.minRequestIntervalms = 180000;
        this._lastIntervalUpdate = {};
        this._events = [];
        this.activeLoop = true;

        var subscribedTopics = [
            topics.DELETE_EVENT,
            topics.NEW_EVENTS_REQUEST,
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
            case topics.NEW_EVENTS_REQUEST:
                processMsgNewEventsRequest(data);
                break;
            case topics.DELETE_EVENT:
                processMsgDeleteEvent(data);
                break;
        }
    }

    updateLastIntervalUpdate (ts) {
        var now=new Date().getTime();
        if (!ts) {
            ts = 0;
        }
        this._lastIntervalUpdate[ts] = now;
    }

    getLastIntervalUpdate (ts) {
        if (!ts) {
            ts = 0;
        }
        if (this._lastIntervalUpdate.hasOwnProperty(ts)) {
            return this._lastIntervalUpdate[ts];
        } else {
            return 0;
        }
    }

    shouldRequest () {
        var last = this.getLastIntervalUpdate();
        if (last != 0) {
            var now = new Date().getTime();
            var elapsed = now - last;
            if (elapsed >= this.minRequestIntervalms) {
                return true;
            }
        }
        return false;
    }

    requestLoop () {
        if (this.shouldRequest()) {
            var eventsTs = this._events.map(ev => ev.ts);
            var ets = Math.max.apply(null,eventsTs);
            this.getEvents({its:ets});
        }
        if (this.activeLoop) {
            setTimeout(this.requestLoop.bind(this),60000);
        }
    }

    deleteEvent (seq) {
        var events=this._events.filter( el => el.seq != seq);
        this._events=events;
    }

    getEvents ({ets, its, force}={}) {
        var now=new Date().getTime();
        var elapsed = now - this.getLastIntervalUpdate(ets);
        if (force == true || elapsed >= this.minRequestIntervalms) {
            console.log('getEvents remote',ets,its,force);
            var events;
            var parameters = {}
            if (ets) {
                parameters.ets = ets;
            }
            if (its) {
                parameters.its = its;
            }
            var promise = new Promise( (resolve, reject) => {
                $.ajax({
                    url: '/var/usr/ev/',
                    dataType: 'json',
                    data: parameters,
                })
                .done( response => {
                    var result = this.storeEvents(response);
                    this.updateLastIntervalUpdate(ets);
                    if (result.modified) {
                        PubSub.publish(topics.NEW_EVENTS_UPDATE,{});
                    }
                    var events = this._events.filter ( ev => {
                        if (ets && ev.ets > ets) {
                            return false;
                        } else if (its && ev.its < its) {
                            return false;
                        }
                        return true;
                    });
                    resolve(events);
                });
            });
            return promise;
        } else {
            console.log('getEvents local',ets,its,force);
            var events = this._events.filter ( ev => {
                if (ets && ev.ets > ets) {
                    return false;
                } else if (its && ev.its < its) {
                    return false;
                }
                return true;
            });
            return Promise.resolve(events);
        }
    }

    storeEvents (events) {
        var result = {};
        var eventsTs = events.map(ev => ev.ts);
        var ets = Math.max.apply(null,eventsTs);
        var its = Math.min.apply(null,eventsTs);
        var oldEvents = this._events.filter ( ev => ev.ts <= ets && ev.ts >= its);
        var deletedEvents = oldEvents.filter( ev => !(events.some(ev2 => ev2.seq == ev.seq)));
        var newEvents = events.filter( ev => !(oldEvents.some(ev2 => ev2.seq == ev.seq)));
        if (deletedEvents.length > 0) {
            result.modified = true;
            deletedEvents.forEach ( ev => {
                this._events.push(ev);
            });
        }
        if (newEvents.length > 0) {
            result.modified = true;
            newEvents.forEach( ev => {
                this._events.push(ev);
            });
        }
        return result;
    }

}

var eventStore = new EventStore();
eventStore.requestLoop()


function getEvents(ets, its, force) {
    return eventStore.getEvents({ets:ets, its:its, force:force});
}

function processMsgNewEventsRequest(data) {
    eventStore.getEvents({ets:data.ets, its:data.its, force:data.force});
}

function processMsgDeleteEvent(msgData) {
    if (msgData.hasOwnProperty('seq')) {
        $.ajax({
                url: '/var/usr/ev/'+msgData.seq,
                dataType: 'json',
                type: 'DELETE',
            })
            .then( data => {
                eventStore.deleteEvent(msgData.seq);
            }, data => {
                console.log('server Delete Event error',data);
            });
    }
}

function sendEventResponse(seq, responseData) {
    var url='/var/usr/ev/'+seq;
    $.ajax({
        url: url,
        dataType: 'json',
        type: 'POST',
        data: JSON.stringify(responseData),
    })
    .done( data => {
        var payload = {
            message:{type:'success',message:'Thank you for your response.'},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE(), payload);
    })
    .fail( data => {
        var payload = {
            message:{type:'danger',message:'Error sending response. Code: '+data.responseJSON.error},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE(), payload);
    });
}

export {
    getEvents,
    sendEventResponse
}

