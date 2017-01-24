import React from 'react';
import ReactDOM from 'react-dom';
import PubSub from 'pubsub-js';
import $ from 'jquery';
import * as ReactBootstrap from 'react-bootstrap';
import * as d3 from 'd3';
import {d3SummaryLinegraph, d3SummaryDatasource} from './graphs.jsx';
import {getEvents, sendEventResponse} from './event-store.js';
import {topics, styles} from './types.js';


class EventSummary extends React.Component {

    componentDidMount () {
        var el = ReactDOM.findDOMNode(this);
        if (this.props.data.type == 'dp') {
            d3SummaryLinegraph.create(el, this.props.data.datapoints, this.props.data.its, this.props.data.ets);
        } else if (this.props.data.type == 'mp') {
            d3SummaryLinegraph.create(el, this.props.data.datapoints, this.props.data.its, this.props.data.ets);
        } else if (this.props.data.type == 'ds') {
            d3SummaryDatasource.create(el, this.props.data.datasource, this.props.data.ts);
        }
    }

    render () {
        return <div className='user-event-summary' />
    }
}

class EventTypeNotification extends React.Component {

    getDateStatement (timestamp) {
        if (typeof timestamp === 'number') {
            var date = new Date(timestamp*1000);
            var now = new Date();
            var diff = now.getTime()/1000 - timestamp;
            if (diff<0) {
                return <span title={date.toString()}>right now</span>
            } else {
                if (diff<60) {
                    var when=" right now";
                } else if (diff<3600) {
                    var when=" "+(diff/60 | 0)+" min"+(diff/60>=2 ? "s":"")+" ago";
                } else if (diff<86400) {
                    var when=" "+(diff/3600 | 0)+" hour"+(diff/3600>=2 ? "s":"")+" ago";
                } else if (diff<2678400) {
                    var when=" "+(diff/86400 | 0)+" day"+(diff/86400>=2 ? "s":"")+" ago";
                } else {
                    var when=" "+(diff/2678400 | 0)+" month"+(diff/2678400>=2 ? "s":"")+" ago";
                }
                return <span title={date.toString()}>{when}</span>
            }
        } else {
            return null;
        }
    }

    render () {
        var icon=<ReactBootstrap.Glyphicon glyph="info-sign" className="user-event-id-icon" />
        var event_title={__html:this.props.data.html.title}
        var event_body={__html:this.props.data.html.body}
        var title=<div dangerouslySetInnerHTML={event_title} />
        var body=<div dangerouslySetInnerHTML={event_body} />
        if ('summary' in this.props.data && this.props.data.summary!=null) {
            var summary=<EventSummary data={this.props.data.summary} />
        } else {
            var summary=null;
        }
        return (
          <li key={this.props.data.seq} className="user-event">
            {icon}
            <div className="user-event-title">
              {title}
            </div>
            <div className="user-event-subtitle">
              {this.getDateStatement(this.props.data.ts)}
            </div>
            <div className="user-event-body">{body}</div>
            {summary}
          </li>
        );
    }
}

class EventTypeDatapointIdentification extends React.Component {
    state = {
        showModal: false,
        index: 0,
        selectedVar: {},
        numSlides: this.props.data.summary.data.length
    };

    getDateStatement (timestamp) {
        if (typeof timestamp === 'number') {
            var date = new Date(timestamp*1000);
            var now = new Date();
            var diff = now.getTime()/1000 - timestamp;
            if (diff<0) {
                return <span title={date.toString()}> right now</span>
            } else {
                if (diff<60) {
                    var when=" right now";
                } else if (diff<3600) {
                    var when=" "+(diff/60 | 0)+" min"+(diff/60>=2 ? "s":"")+" ago";
                } else if (diff<86400) {
                    var when=" "+(diff/3600 | 0)+" hour"+(diff/3600>=2 ? "s":"")+" ago";
                } else if (diff<2678400) {
                    var when=" "+(diff/86400 | 0)+" day"+(diff/86400>=2 ? "s":"")+" ago";
                } else {
                    var when=" "+(diff/2678400 | 0)+" month"+(diff/2678400>=2 ? "s":"")+" ago";
                }
                return <span title={date.toString()}>{when}</span>
            }
        } else {
            return null;
        }
    }

    showModal = () => {
        this.setState({showModal:true});
    }

    closeModal = () => {
        this.setState({showModal:false, selectedVar:{},index:0});
    }

    nextClick = () => {
        if (this.state.index < this.state.numSlides-1) {
            this.setState({index:this.state.index+1})
        } else {
            var response = {identified:[]};
            for (var i in this.state.selectedVar) {
                var p = this.state.selectedVar[i];
                if (p == null) {
                    var l = null;
                } else {
                    for (var j=0; j<this.props.data.summary.data[i].vars.length; j++) {
                        if (this.props.data.summary.data[i].vars[j][0] == p) {
                            var l = this.props.data.summary.data[i].vars[j][1];
                        }
                    }
                }
                var s = this.props.data.summary.data[i].seq;
                response.identified.push({p:p,l:l,s:s});
            }
            sendEventResponse(this.props.data.seq, response);
            this.closeModal();
        }
    }

    datapointNotFoundClick = () => {
        var selectedVar = this.state.selectedVar;
        selectedVar[this.state.index]=null;
        this.setState({selectedVar:selectedVar});
    }

    selectVar = (event) => {
        var selectedVar= this.state.selectedVar;
        selectedVar[this.state.index]=parseInt(event.target.id);
        this.setState({selectedVar:selectedVar});
    }

    generateDsContent (content, vars, var_index) {
        var dsContent = [];
        if (var_index >= 0) {
            var var_pos = vars[var_index][0];
            var var_length = vars[var_index][1];
            if (content.length >= var_pos+var_length) {
                dsContent.push({
                    pos:var_pos,
                    type:'var',
                    content:content.substring(var_pos,var_pos+var_length)
                });
            }
            if (content.length > var_pos+var_length) {
                var lines = content.substring(var_pos+var_length,content.length).split('\n');
                var start = var_pos+var_length;
                for (var i=0;i<lines.length;i++) {
                    if (lines[i].length>0) {
                        dsContent.push({
                            pos:start,
                            type:'text',
                            content:lines[i].replace(/ /g,'\u00a0')
                        });
                        if (i<lines.length-1) {
                            start += 1;
                            dsContent.push({
                                pos:start,
                                type:'nl'
                            });
                        }
                        start += lines[i].length;
                    } else {
                        dsContent.push({
                            pos:start,
                            type:'nl'
                        });
                        start += 1;
                    }
                }
            }
            var newContent = content.substring(0,var_pos);
            var others = this.generateDsContent(newContent,vars, var_index-1);
            for (var i=0; i<others.length;i++) {
                dsContent.push(others[i]);
            }
        } else {
            var lines = content.split('\n');
            var start = 0;
            for (var i=0; i<lines.length;i++) {
                if (lines[i].length > 0) {
                    dsContent.push({
                        pos:start,
                        type:'text',
                        content:lines[i].replace(/ /g,'\u00a0')
                    });
                    if (i<lines.length-1) {
                        start += 1;
                        dsContent.push({
                            pos:start,
                            type:'nl'
                        });
                    }
                    start = start + lines[i].length;
                } else {
                    dsContent.push({
                        pos:start,
                        type:'nl'
                    });
                    start += 1;
                }
            }
        }
        return dsContent;
    }

    getDSData (index) {
        var content = this.props.data.summary.data[index].content;
        var vars = this.props.data.summary.data[index].vars;
        var ts = this.props.data.summary.data[index].ts;
        var dateFormat = d3.timeFormat("%Y/%m/%d - %H:%M:%S");
        var date = new Date(ts*1000);
        var dateText=dateFormat(date);
        var dsElements = this.generateDsContent(content,vars, vars.length-1);
        dsElements.sort( (a,b) => {
            var x = a.pos;
            var y = b.pos;
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        });
        var reactElements = [];
        for (var i=0; i< dsElements.length; i++) {
            if (dsElements[i].type == 'text') {
                reactElements.push(React.createElement('span',{key:i},dsElements[i].content));
            } else if (dsElements[i].type == 'var') {
                if (this.state.index in this.state.selectedVar) {
                    if (this.state.selectedVar[this.state.index] == null) {
                        reactElements.push(<span key={i} id={dsElements[i].pos} className="modal-ds-var-negated clickable" onClick={this.selectVar}>{dsElements[i].content}</span>);
                    } else if (this.state.selectedVar[this.state.index] == dsElements[i].pos) {
                        reactElements.push(<span key={i} id={dsElements[i].pos} className="modal-ds-var-selected clickable" onClick={this.selectVar}>{dsElements[i].content}</span>);
                    } else {
                        reactElements.push(<span key={i} id={dsElements[i].pos} className="modal-ds-var clickable" onClick={this.selectVar}>{dsElements[i].content}</span>);
                    }
                } else {
                    reactElements.push(<span key={i} id={dsElements[i].pos} className="modal-ds-var clickable" onClick={this.selectVar}>{dsElements[i].content}</span>);
                }
            } else if (dsElements[i].type == 'nl') {
                reactElements.push(<br key={i} />);
            }
        }
        return (
          <div className="modal-ds-body">
            <h4>({this.state.index+1}/{this.state.numSlides}) Sample at {dateText}</h4>
            <div className="modal-ds-content">
              {reactElements}
            </div>
          </div>
        );
    }

    render () {
        if (this.state.showModal) {
            if (this.state.index in this.state.selectedVar) {
                var nextButtonDisabled = false;
            } else {
                var nextButtonDisabled = true;
            }
            if (this.state.index < this.state.numSlides -1) {
                var nextButtonText = "Next";
            } else {
                var nextButtonText = "Send response";
            }
            var dsData = this.getDSData(this.state.index);
            var infoModal = (
              <ReactBootstrap.Modal show={this.state.showModal} onHide={this.closeModal}>
                <ReactBootstrap.Modal.Header closeButton={true}>
                  <ReactBootstrap.Modal.Title>
                    <span>
                      Identify
                      <span className="modal-dp-title"> {this.props.data.params.datasourcename}.{this.props.data.params.datapointname} </span>
                      in these samples
                    </span>
                  </ReactBootstrap.Modal.Title>
                </ReactBootstrap.Modal.Header>
                <ReactBootstrap.Modal.Body>
                   {dsData}
                </ReactBootstrap.Modal.Body>
                <ReactBootstrap.Modal.Footer>
                  <ReactBootstrap.Button bsStyle="default" bsSize="xsmall" className="pull-left" onClick={this.datapointNotFoundClick}>Datapoint not present in this sample</ReactBootstrap.Button>
                  <ReactBootstrap.Button bsStyle="success" onClick={this.nextClick} disabled={nextButtonDisabled}>{nextButtonText}</ReactBootstrap.Button>
                </ReactBootstrap.Modal.Footer>
              </ReactBootstrap.Modal>
            );
        } else {
            var infoModal = null;
        }
        var icon=<ReactBootstrap.Glyphicon glyph="info-sign" className="user-event-id-icon" />;
        var event_title={__html:this.props.data.html.title};
        var event_body={__html:this.props.data.html.body};
        var title=<div dangerouslySetInnerHTML={event_title} />;
        var body= (
          <a onClick={this.showModal}>
            Please, identify datapoint
            <strong> {this.props.data.params.datasourcename}.{this.props.data.params.datapointname} </strong>
            in these samples...
          </a>
        );
        return (
          <li key={this.props.data.seq} className="user-event">
            {icon}
            <div className="user-event-title">
              {title}
            </div>
            <div className="user-event-subtitle">
              {this.getDateStatement(this.props.data.ts)}
            </div>
            <div className="user-event-body">{body}</div>
            {infoModal}
          </li>
        );
    }
}

class EventsSideBar extends React.Component {
    state = {
        loading: true,
        events:[],
        newEvents: false,
        numNewEvents: null,
    };

    subscriptionTokens = [];

    async initialization () {
        console.log('initialization events');
        var events = await getEvents();
        events.sort( (a,b) => b.ts - a.ts);

        var eventsTs = events.map(ev => ev.ts);
        var newestTs = Math.max.apply(null, eventsTs);
        var oldestTs = Math.min.apply(null, eventsTs);

        var subscribedTopics = [
            topics.NEW_EVENTS_UPDATE
        ];

        this.subscriptionTokens = subscribedTopics.map( topic => {
            return {
                token:PubSub.subscribe(topic,this.subscriptionHandler),
                msg:topic
            }
        });

        this.setState({
            loading: false,
            newestTs: newestTs,
            oldestTs: oldestTs,
            events:events,
        });
    }

    componentDidMount () {
        this.initialization();
        var div = $("#sidebar-right")
        $(div).on('scroll', (ev) => {
            this.handleScroll(ev);
        });
    }

    componentWillUnmount () {
        this.subscriptionTokens.forEach( d => {
            PubSub.unsubscribe(d.token);
        });
    }

    subscriptionHandler = (msg,data) => {
        switch (msg) {
            case topics.NEW_EVENTS_UPDATE:
                this.refreshEvents();
                break;
        }
    }

    disableEvent = (seq,e) => {
        PubSub.publish(topics.DELETE_EVENT,{seq:seq});
    }

    async refreshEvents () {
        console.log('refresh events');
        var events = await getEvents();

        events.sort( (a,b) => b.ts - a.ts);

        var eventsTs = events.map(ev => ev.ts);
        var newestTs = Math.max.apply(null, eventsTs);
        var oldestTs = Math.min.apply(null, eventsTs);

        this.setState({
            loading: false,
            newestTs: newestTs,
            oldestTs: oldestTs,
            events:events,
        });
    }

    handleScroll (ev) {
        var node = ev.target;
        if (node.scrollTop + node.offsetHeight == node.scrollHeight && this.state.loading == false) {
            this.setState({loading:true});
            this.loadOlderEvents();
        }
    }

    loadOlderEvents () {
        console.log('loadolder events');
        var ets = this.state.oldestTs;
        var olderEvents = getEvents(ets);
        olderEvents.then( events => {
            this.setState({loading:false});
        });
    }

    showNewEvents = () => {
        var events=getEventList(this.state.numNewEvents,this.state.lastSeq);
        if (this.state.events.length > 0) {
            for (var i=0;i<this.state.events.length;i++) {
                events.push(this.state.events[i]);
            }
        }
        if (events.length>0) {
            var lastSeq=events[0].seq;
            var numNewEvents=0;
        } else {
            var lastSeq = null;
            var numNewEvents= null;
        }
        this.setState({events:events,lastSeq:lastSeq,newEvents:false,numNewEvents:numNewEvents});
    }

    getEventList () {
        var eventList = this.state.events.map( (d,i) => {
            if (d.type < 1000) {
                return <EventTypeNotification key={i} data={d} />;
            } else if (d.type == 1000) {
                return <EventTypeDatapointIdentification key={i} data={d} />;
            }
        });
        if (this.state.loading) {
            var loading_banner = (
              <div key="banner" style={styles.eventsBanner}>
                Loading ...
              </div>
            );
            eventList.push(loading_banner);
        }
        return eventList;
    }

    render () {
        var eventList = this.getEventList();
        return (
          <div>
            <div className="update-panel">
              <ReactBootstrap.Collapse in={this.state.newEvents}>
                <div>
                  <ReactBootstrap.Well onClick={this.showNewEvents}>
                    <ReactBootstrap.Badge pullRight={true}>{this.state.numNewEvents}</ReactBootstrap.Badge>
                    <ReactBootstrap.Glyphicon glyph="refresh" />
                    New Events
                  </ReactBootstrap.Well>
                </div>
              </ReactBootstrap.Collapse>
            </div>
            <ul className="user-events">{eventList}</ul>
          </div>
        );
    }
}

export {
    EventsSideBar
}

