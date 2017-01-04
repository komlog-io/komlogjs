import React from 'react';
import ReactDOM from 'react-dom';
import PubSub from 'pubsub-js';
import $ from 'jquery';
import * as ReactBootstrap from 'react-bootstrap';
import * as d3 from 'd3';
import {d3SummaryLinegraph, d3SummaryDatasource} from './graphs.jsx';
import {getEventList, getNumEventsNewerThan, sendEventResponse} from './event-store.js';


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
                            content:lines[i]
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
                        content:lines[i]
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
        events:[],
        newEvents: false,
        numNewEvents: null,
        lastSeq: null,
    };

    subscriptionTokens = [];

    constructor (props) {
        super(props);
        this.subscriptionTokens.push({token:PubSub.subscribe('newEvents', this.subscriptionHandler),msg:'newEvents'});
    }

    componentDidMount () {
        this.refreshEvents();
    }

    componentWillUnmount () {
        this.subscriptionTokens.map( d => {
            PubSub.unsubscribe(d.token);
        });
    }

    subscriptionHandler = (msg,data) => {
        switch (msg) {
            case 'newEvents':
                this.refreshEvents();
                break;
        }
    }

    disableEvent (seq,e) {
        PubSub.publish('deleteEvent',{seq:seq});
        var newEvents=this.state.events.filter( el => el.seq !== seq );
        this.setState({events:newEvents});
    }

    refreshEvents () {
        if (this.state.lastSeq == null || $('#events-sidebar').position().top==0) {
            this.showNewEvents();
        } else {
            var numNewEvents=getNumEventsNewerThan(this.state.lastSeq);
            if (numNewEvents>0) {
                this.setState({newEvents:true,numNewEvents:numNewEvents});
            } else {
                this.setState({newEvents:false,numNewEvents:0});
            }
        }
    }

    showNewEvents () {
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

/*

var EventSummary = React.createClass ({
    componentDidMount: function () {
        var el = ReactDOM.findDOMNode(this)
        if (this.props.data.type == 'dp') {
            d3SummaryLinegraph.create(el, this.props.data.datapoints, this.props.data.its, this.props.data.ets)
        } else if (this.props.data.type == 'mp') {
            d3SummaryLinegraph.create(el, this.props.data.datapoints, this.props.data.its, this.props.data.ets)
        } else if (this.props.data.type == 'ds') {
            d3SummaryDatasource.create(el, this.props.data.datasource, this.props.data.ts)
        }
    },
    render: function () {
        return React.createElement('div', {className: 'user-event-summary'});
    }
});

var EventTypeNotification = React.createClass ({
    getDateStatement: function (timestamp) {
        if (typeof timestamp === 'number') {
            var date = new Date(timestamp*1000);
            var now = new Date();
            diff = now.getTime()/1000 - timestamp;
            if (diff<0) {
                return React.createElement('span',{title:date.toString()}, ' right now');
            } else {
                if (diff<60) {
                    when=" right now"
                } else if (diff<3600) {
                    when=" "+(diff/60 | 0)+" min"+(diff/60>=2 ? "s":"")+" ago";
                } else if (diff<86400) {
                    when=" "+(diff/3600 | 0)+" hour"+(diff/3600>=2 ? "s":"")+" ago";
                } else if (diff<2678400) {
                    when=" "+(diff/86400 | 0)+" day"+(diff/86400>=2 ? "s":"")+" ago";
                } else {
                    when=" "+(diff/2678400 | 0)+" month"+(diff/2678400>=2 ? "s":"")+" ago";
                }
                return React.createElement('span',{title:date.toString()}, when);
            }
        } else {
            return null
        }
    },
    render: function () {
        icon=React.createElement(ReactBootstrap.Glyphicon, {glyph:"info-sign", className:"user-event-id-icon"});
        event_title={__html:this.props.data.html.title}
        event_body={__html:this.props.data.html.body}
        title=React.createElement('div', {dangerouslySetInnerHTML:event_title});
        body=React.createElement('div', {dangerouslySetInnerHTML:event_body});
        if ('summary' in this.props.data && this.props.data.summary!=null) {
            summary=React.createElement(EventSummary, {data:this.props.data.summary})
        } else {
            summary=null
        }
        return React.createElement('li', {key:this.props.data.seq, className:"user-event"},
          icon,
          React.createElement('div', {className:"user-event-title"},
            title
          ),
          React.createElement('div', {className:"user-event-subtitle"},
            this.getDateStatement(this.props.data.ts)
          ),
          React.createElement('div', {className:"user-event-body"}, body),
          summary
        );
    }
});

var EventTypeDatapointIdentification = React.createClass ({
    getInitialState: function () {
        return {
            showModal: false,
            index: 0,
            selectedVar: {}
        }
    },
    componentWillMount: function () {
        var numSlides = this.props.data.summary.data.length;
        this.setState({numSlides:numSlides});
    },
    getDateStatement: function (timestamp) {
        if (typeof timestamp === 'number') {
            var date = new Date(timestamp*1000);
            var now = new Date();
            diff = now.getTime()/1000 - timestamp;
            if (diff<0) {
                return React.createElement('span',{title:date.toString()}, ' right now');
            } else {
                if (diff<60) {
                    when=" right now"
                } else if (diff<3600) {
                    when=" "+(diff/60 | 0)+" min"+(diff/60>=2 ? "s":"")+" ago";
                } else if (diff<86400) {
                    when=" "+(diff/3600 | 0)+" hour"+(diff/3600>=2 ? "s":"")+" ago";
                } else if (diff<2678400) {
                    when=" "+(diff/86400 | 0)+" day"+(diff/86400>=2 ? "s":"")+" ago";
                } else {
                    when=" "+(diff/2678400 | 0)+" month"+(diff/2678400>=2 ? "s":"")+" ago";
                }
                return React.createElement('span',{title:date.toString()}, when);
            }
        } else {
            return null
        }
    },
    showModal: function () {
        this.setState({showModal:true});
    },
    closeModal: function () {
        this.setState({showModal:false, selectedVar:{},index:0});
    },
    nextClick: function () {
        if (this.state.index < this.state.numSlides-1) {
            this.setState({index:this.state.index+1})
        } else {
            var response = {identified:[]}
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
                var s = this.props.data.summary.data[i].seq
                response.identified.push({p:p,l:l,s:s});
            }
            sendEventResponse(this.props.data.seq, response);
            this.closeModal();
        }
    },
    datapointNotFoundClick: function () {
        var selectedVar = this.state.selectedVar;
        selectedVar[this.state.index]=null;
        this.setState({selectedVar:selectedVar})
    },
    selectVar: function (event) {
        var selectedVar= this.state.selectedVar;
        selectedVar[this.state.index]=parseInt(event.target.id);
        this.setState({selectedVar:selectedVar});
    },
    generateDsContent: function (content, vars, var_index) {
        var dsContent = []
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
                            content:lines[i]
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
            var others = this.generateDsContent(newContent,vars, var_index-1)
            for (var i=0; i<others.length;i++) {
                dsContent.push(others[i])
            }
        } else {
            var lines = content.split('\n');
            var start = 0;
            for (var i=0; i<lines.length;i++) {
                if (lines[i].length > 0) {
                    dsContent.push({
                        pos:start,
                        type:'text',
                        content:lines[i]
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
        return dsContent
    },
    getDSData: function (index) {
        var content = this.props.data.summary.data[index].content
        var vars = this.props.data.summary.data[index].vars
        var ts = this.props.data.summary.data[index].ts
        var dateFormat = d3.time.format("%Y/%m/%d - %H:%M:%S")
        var date = new Date(ts*1000);
        var dateText=dateFormat(date)
        var dsElements = this.generateDsContent(content,vars, vars.length-1);
        dsElements.sort(function (a,b) {
            var x = a.pos;
            var y = b.pos;
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        });
        var reactElements = []
        for (var i=0; i< dsElements.length; i++) {
            if (dsElements[i].type == 'text') {
                reactElements.push(React.createElement('span',{key:i},dsElements[i].content));
            } else if (dsElements[i].type == 'var') {
                if (this.state.index in this.state.selectedVar) {
                    if (this.state.selectedVar[this.state.index] == null) {
                        reactElements.push(React.createElement('span',{key:i, id:dsElements[i].pos, className:"modal-ds-var-negated clickable", onClick:this.selectVar},dsElements[i].content));
                    } else if (this.state.selectedVar[this.state.index] == dsElements[i].pos) {
                        reactElements.push(React.createElement('span',{key:i, id:dsElements[i].pos, className:"modal-ds-var-selected clickable", onClick:this.selectVar},dsElements[i].content));
                    } else {
                        reactElements.push(React.createElement('span',{key:i, id:dsElements[i].pos, className:"modal-ds-var clickable", onClick:this.selectVar},dsElements[i].content));
                    }
                } else {
                    reactElements.push(React.createElement('span',{key:i, id:dsElements[i].pos, className:"modal-ds-var clickable", onClick:this.selectVar},dsElements[i].content));
                }
            } else if (dsElements[i].type == 'nl') {
                reactElements.push(React.createElement('br',{key:i}));
            }
        }
        return React.createElement('div',{className:"modal-ds-body"},
          React.createElement('h4',null,"("+(this.state.index+1)+"/"+this.state.numSlides+") Sample at "+dateText),
          React.createElement('div',{className:"modal-ds-content"},
            reactElements
          )
        );
    },
    render: function () {
        if (this.state.showModal) {
            if (this.state.index in this.state.selectedVar) {
                var nextButtonDisabled = false;
            } else {
                var nextButtonDisabled = true;
            }
            if (this.state.index < this.state.numSlides -1) {
                var nextButtonText = "Next"
            } else {
                var nextButtonText = "Send response"
            }
            var dsData = this.getDSData(this.state.index);
            var infoModal = React.createElement(ReactBootstrap.Modal,{show:this.state.showModal, onHide:this.closeModal},
              React.createElement(ReactBootstrap.Modal.Header, {closeButton: true}, 
                React.createElement(ReactBootstrap.Modal.Title,null,
                  React.createElement('span',null,
                    "Identify ",
                    React.createElement('span',{className:"modal-dp-title"},this.props.data.params.datasourcename+'.'+this.props.data.params.datapointname),
                    " in these samples"
                  )
                )
              ),
              React.createElement(ReactBootstrap.Modal.Body, null,
                 dsData
              ),
              React.createElement(ReactBootstrap.Modal.Footer, null,
                React.createElement(ReactBootstrap.Button, {bsStyle:"default", bsSize:"xsmall", className:"pull-left", onClick:this.datapointNotFoundClick}, "Datapoint not present in this sample"),
                React.createElement(ReactBootstrap.Button, {bsStyle:"success", onClick:this.nextClick, disabled:nextButtonDisabled}, nextButtonText)
              )
            )
        } else {
            infoModal = null;
        }
        icon=React.createElement(ReactBootstrap.Glyphicon, {glyph:"info-sign", className:"user-event-id-icon"});
        event_title={__html:this.props.data.html.title}
        event_body={__html:this.props.data.html.body}
        title=React.createElement('div', {dangerouslySetInnerHTML:event_title});
        body=React.createElement('a', {onClick:this.showModal},
          "Please, identify datapoint ",
          React.createElement('strong',null,this.props.data.params.datasourcename+'.'+this.props.data.params.datapointname),
          " in these samples..."
        );
        return React.createElement('li', {key:this.props.data.seq, className:"user-event"},
          icon,
          React.createElement('div', {className:"user-event-title"},
            title
          ),
          React.createElement('div', {className:"user-event-subtitle"},
            this.getDateStatement(this.props.data.ts)
          ),
          React.createElement('div', {className:"user-event-body"}, body),
          infoModal
        );
    }
});

var EventsSideBar = React.createClass({
    getInitialState: function () {
        return {events:[],
                newEvents: false,
                numNewEvents: undefined,
                lastSeq: undefined,
               }
    },
    subscriptionTokens: [],
    componentWillMount: function () {
        this.subscriptionTokens.push({token:PubSub.subscribe('newEvents', this.subscriptionHandler),msg:'newEvents'});
    },
    componentDidMount: function () {
        this.refreshEvents()
    },
    componentWillUnmount: function () {
        $.map(this.subscriptionTokens, function (d) {
            PubSub.unsubscribe(d.token)
            }.bind(this));
    },
    subscriptionHandler: function (msg,data) {
        switch (msg) {
            case 'newEvents':
                this.refreshEvents()
                break;
        }
    },
    disableEvent: function (seq,e) {
        PubSub.publish('deleteEvent',{seq:seq})
        newEvents=this.state.events.filter( function (el) {
            return el.seq !== seq;
        });
        this.setState({events:newEvents})
    },
    refreshEvents: function () {
        if (this.state.lastSeq == undefined || $('#events-sidebar').position().top==0) {
            this.showNewEvents()
        } else {
            numNewEvents=getNumEventsNewerThan(this.state.lastSeq)
            if (numNewEvents>0) {
                this.setState({newEvents:true,numNewEvents:numNewEvents})
            } else {
                this.setState({newEvents:false,numNewEvents:0})
            }
        }
    },
    showNewEvents: function () {
        events=getEventList(this.state.numNewEvents,this.state.lastSeq)
        if (this.state.events.length > 0) {
            for (var i=0;i<this.state.events.length;i++) {
                events.push(this.state.events[i])
            }
        }
        if (events.length>0) {
            lastSeq=events[0].seq
            numNewEvents=0
        } else {
            lastSeq = undefined
            numNewEvents=undefined
        }
        this.setState({events:events,lastSeq:lastSeq,newEvents:false,numNewEvents:numNewEvents})
    },
    getEventList: function () {
        eventList = $.map(this.state.events, function (d,i) {
            if (d.type < 1000) {
                return React.createElement(EventTypeNotification,{key:i, data:d});
            } else if (d.type == 1000) {
                return React.createElement(EventTypeDatapointIdentification,{key:i, data:d});
            }
        });
        return eventList
    },
    render: function () {
        eventList = this.getEventList();
        return React.createElement('div', null,
          React.createElement('div', {className:"update-panel"},
            React.createElement(ReactBootstrap.Collapse, {in:this.state.newEvents},
              React.createElement('div', null,
                React.createElement(ReactBootstrap.Well, null,
                  React.createElement(ReactBootstrap.Badge, {pullRight:true}, this.state.numNewEvents),
                  React.createElement(ReactBootstrap.Glyphicon, {onClick:this.showNewEvents, glyph:"refresh"}),
                  " New Events"
                )
              )
            )
          ),
          React.createElement('ul', {className:"user-events"}, eventList)
        );
    }
});

ReactDOM.render(
    React.createElement(EventsSideBar, null)
    ,
    document.getElementById('events-sidebar')
);
*/
