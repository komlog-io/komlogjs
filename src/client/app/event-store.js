import $ from 'jquery';
import jQuery from 'jquery';
import PubSub from 'pubsub-js';

class EventStore {
    constructor () {
        this._events = [];
        this.subscriptionTokens = [];
        this.activeLoop = true;
        this.lastRequest = null;

        this.subscriptionTokens.push({token:PubSub.subscribe('deleteEvent', this.subscriptionHandler.bind(this)),msg:'deleteEvent'});

    }

    subscriptionHandler (msg, data) {
        switch (msg) {
            case 'deleteEvent':
                processMsgDeleteEvent(data);
                break;
        }
    }

    shouldRequest () {
        var now = new Date();
        if (this.lastRequest == null){
            return true;
        } else {
            var nextRequest=new Date(this.lastRequest.getTime()+60);
            if (nextRequest < now ) {
                return true;
            } else {
                return false;
            }
        }
    }

    requestLoop () {
        var now=new Date().getTime()/1000;
        if (this.shouldRequest()) {
            requestEvents();
        }
        if (this.activeLoop === true ) {
            setTimeout(this.requestLoop.bind(this),60000);
        }
    }

    deleteEvent (seq) {
        var events=this._events.filter( el => el.seq !== seq);
        this._events=events;
    }
}

var eventStore = new EventStore();
eventStore.requestLoop()

function requestEvents () {
    var parameters={}
    if (eventStore._events.length>0) {
        parameters.its=eventStore._events[eventStore._events.length-1].ts;
    }
    $.ajax({
        url: '/var/usr/ev/',
        dataType: 'json',
        data: parameters,
    })
    .done( response => {
        storeEvents(response);
    });
}

function storeEvents (data) {
    var newEvents=false;
    for (var i=data.length;i>0;i--) {
        if (eventStore._events.length==0) {
            eventStore._events.push(data[i-1]);
            newEvents=true;
        } else {
            for (var j=eventStore._events.length;j>0;j--) {
                if (eventStore._events[j-1].ts<=data[i-1].ts && eventStore._events[j-1].seq!=data[i-1].seq && (j==eventStore._events.length || eventStore._events[j].ts>data[i-1].ts)) {
                    eventStore._events.splice(j,0,data[i-1]);
                    newEvents=true;
                }
            }
        }
    }
    if (newEvents == true) {
        sendNewEventsMessage();
    }
}

function sendNewEventsMessage () {
    PubSub.publish('newEvents',{});
}

function getEventList (numElem, lastSeq) {
    console.log('getEventList',numElem,lastSeq,eventStore._events);
    var events=[];
    if (eventStore._events.length == 0) {
        return events;
    }
    var lastIndex = 0;
    if ( lastSeq != null) {
        for (var i=eventStore._events.length;i>0;i--) {
            if (eventStore._events[i-1].seq == lastSeq) {
                lastIndex=i;
                break;
            }
        }
    }
    if (numElem == null) {
        var firstIndex = eventStore._events.length -1;
    } else {
        var firstIndex = lastIndex+numElem;
        if (firstIndex>eventStore._events.length-1) {
            firstIndex = eventStore._events.length-1;
        }
    }
    for (var j=firstIndex;j>=lastIndex;j--) {
        events.push(eventStore._events[j]);
    }
    return events;
}

function getNumEventsNewerThan (lastSeq) {
    if (eventStore._events.length == 0) {
        return 0;
    } else if (lastSeq == null) {
        return 0;
    } else {
        for (var i=eventStore._events.length;i>=0;i--) {
            if (eventStore._events[i-1].seq == lastSeq) {
                var numEvents=eventStore._events.length-i;
                break;
            }
        }
    }
    return numEvents;
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
        PubSub.publish('barMessage',{message:{type:'success',message:'Thank you for your response.'},messageTime:(new Date).getTime()});
    })
    .fail( data => {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error sending response. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()});
    });
}

export {
    getEventList,
    getNumEventsNewerThan,
    sendEventResponse
}


/*
function EventStore () {
    this._events = [];
    this.subscriptionTokens = [];
    this.activeLoop = true;

    this.subscriptionTokens.push({token:PubSub.subscribe('deleteEvent', this.subscriptionHandler.bind(this)),msg:'deleteEvent'});

}

EventStore.prototype = {
    subscriptionHandler: function (msg, data) {
        switch (msg) {
            case 'deleteEvent':
                processMsgDeleteEvent(data)
                break;
        }
    },
    shouldRequest: function () {
        var now = new Date();
        if (typeof this.lastRequest === "undefined"){
            return true;
        } else {
            nextRequest=new Date(this.lastRequest.getTime()+60)
            if (nextRequest < now ) {
                return true;
            } else {
                return false;
            }
        }
    },
    requestLoop: function () {
        now=new Date().getTime()/1000;
        if (this.shouldRequest()) {
            requestEvents()
        }
        if (this.activeLoop === true ) {
            setTimeout(this.requestLoop.bind(this),60000)
        }
    },
    deleteEvent: function (seq) {
        events=this._events.filter( function (el) {
            return el.seq !== seq
        });
        this._events=events
    }
};

var eventStore = new EventStore();
eventStore.requestLoop()

function requestEvents () {
    parameters={}
    if (eventStore._events.length>0) {
        parameters.its=eventStore._events[eventStore._events.length-1].ts
    }
    $.ajax({
        url: '/var/usr/ev/',
        dataType: 'json',
        data: parameters,
    })
    .done(function (response) {
        storeEvents(response)
    })
}

function storeEvents (data) {
    newEvents=false;
    for (var i=data.length;i>0;i--) {
        if (eventStore._events.length==0) {
            eventStore._events.push(data[i-1])
            newEvents=true;
        } else {
            for (var j=eventStore._events.length;j>0;j--) {
                if (eventStore._events[j-1].ts<=data[i-1].ts && eventStore._events[j-1].seq!=data[i-1].seq && (j==eventStore._events.length || eventStore._events[j].ts>data[i-1].ts)) {
                    eventStore._events.splice(j,0,data[i-1])
                    newEvents=true
                }
            }
        }
    }
    if (newEvents == true) {
        sendNewEventsMessage()
    }
}

function sendNewEventsMessage () {
    PubSub.publish('newEvents',{})
}

function getEventList (numElem, lastSeq) {
    events=[]
    if (eventStore._events.length == 0) {
        return events
    } else if (typeof lastSeq === "undefined") {
        lastIndex=0
    } else {
        for (var i=eventStore._events.length;i>0;i--) {
            if (eventStore._events[i-1].seq == lastSeq) {
                lastIndex=i;
                break;
            }
        }
    }
    if (typeof lastIndex === "undefined" ) {
        lastIndex=0
    }
    firstIndex=lastIndex+numElem
    if (firstIndex>eventStore._events.length-1|| isNaN(firstIndex) ) {
        firstIndex=eventStore._events.length-1;
    }
    for (var j=firstIndex;j>=lastIndex;j--) {
        events.push(eventStore._events[j])
    }
    return events
}

function getNumEventsNewerThan (lastSeq) {
    if (eventStore._events.length == 0) {
        return 0
    } else if (typeof lastSeq === "undefined") {
        return 0
    } else {
        for (var i=eventStore._events.length;i>=0;i--) {
            if (eventStore._events[i-1].seq == lastSeq) {
                numEvents=eventStore._events.length-i
                break;
            }
        }
    }
    return numEvents
}

function processMsgDeleteEvent(msgData) {
    if (msgData.hasOwnProperty('seq')) {
        $.ajax({
                url: '/var/usr/ev/'+msgData.seq,
                dataType: 'json',
                type: 'DELETE',
            })
            .then(function(data){
                eventStore.deleteEvent(msgData.seq)
            }, function(data){
                console.log('server Delete Event error',data)
            });
    }
}

function sendEventResponse(seq, responseData) {
    url='/var/usr/ev/'+seq
    $.ajax({
        url: url,
        dataType: 'json',
        type: 'POST',
        data: JSON.stringify(responseData),
    })
    .done(function (data) {
        PubSub.publish('barMessage',{message:{type:'success',message:'Thank you for your response.'},messageTime:(new Date).getTime()});
    })
    .fail(function (data) {
        PubSub.publish('barMessage',{message:{type:'danger',message:'Error sending response. Code: '+data.responseJSON.error},messageTime:(new Date).getTime()})
    })
}
*/
