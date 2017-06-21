import React from 'react';
import ReactDOM from 'react-dom';
import PubSub from 'pubsub-js';
import $ from 'jquery';
import * as ReactBootstrap from 'react-bootstrap';
import * as d3 from 'd3';
import * as utils from './utils.js';
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

    getHtmlContent () {
        var data = this.props.data.summary.data[this.state.index];
        if (utils.isJSON(data.content)) {
            return this.processJSONContent(data);
        } else {
            return this.processTextContent(data);
        }
    }

    processTextContent (dsData) {
        var elements=[];
        if (!dsData) {
            return elements;
        }
        var dsVars = dsData.vars;
        var numElement = 0;
        var cursorPosition=0;
        var newLineRegex=/(?:\r\n|\r|\n)/g;
        var dsSubContent, start, text, match, datapointname, position, length;
        dsVars.forEach( v => {
            position=v[0];
            length=v[1];
            dsSubContent=dsData.content.substr(cursorPosition,position-cursorPosition);
            start=0;
            match = newLineRegex.exec(dsSubContent);
            while(match != null) {
                text=dsSubContent.substr(start,match.index-start).replace(/ /g, '\u00a0');
                elements.push(<span key={numElement++}>{text}</span>);
                elements.push(<br key={numElement++} />);
                start=match.index+match.length-1;
                match = newLineRegex.exec(dsSubContent);
            }
            if (start<position) {
                text=dsSubContent.substr(start,position-start).replace(/ /g, '\u00a0');
                elements.push(<span key={numElement++}>{text}</span>);
            }
            text=dsData.content.substr(position,length);
            if (this.state.index in this.state.selectedVar) {
                if (this.state.selectedVar[this.state.index] == null) {
                    elements.push(<span key={numElement++} id={position} className="modal-ds-var-negated clickable" onClick={this.selectVar}>{text}</span>);
                } else if (this.state.selectedVar[this.state.index] == position) {
                    elements.push(<span key={numElement++} id={position} className="modal-ds-var-selected clickable" onClick={this.selectVar}>{text}</span>);
                } else {
                    elements.push(<span key={numElement++} id={position} className="modal-ds-var clickable" onClick={this.selectVar}>{text}</span>);
                }
            } else {
                elements.push(<span key={numElement++} id={position} className="modal-ds-var clickable" onClick={this.selectVar}>{text}</span>);
            }
            cursorPosition=position+length;
        });
        if (cursorPosition<dsData.content.length) {
            dsSubContent=dsData.content.substr(cursorPosition,dsData.content.length-cursorPosition);
            start=0;
            while((match=newLineRegex.exec(dsSubContent)) != null) {
                text=dsSubContent.substr(start,match.index-start).replace(/ /g, '\u00a0');
                elements.push(<span key={numElement++}>{text}</span>);
                elements.push(<br key={numElement++} />);
                start=match.index+match.length-1;
            }
            if (start<dsSubContent.length-1) {
                text=dsSubContent.substr(start,dsSubContent.length-1-start).replace(/ /g, '\u00a0');
                elements.push(<span key={numElement++}>{text}</span>);
            }
        }
        return elements;
    }

    processJSONContent (dsData) {
        var elements=[];
        if (!dsData) {
            return elements;
        }
        var dsVars = dsData.vars;
        var numElement = 0;
        var cursorPosition=0;
        var newContent = ''
        var dsSubContent, start, text, match, datapointname, position, length;
        dsVars.forEach( v => {
            position=v[0];
            length=v[1];
            newContent+=dsData.content.substr(cursorPosition,position-cursorPosition);
            text=dsData.content.substr(position,length);
            var res = utils.inJSONString(dsData.content, position)
            if (res) {
                var newEl = "/*_k_type/var/"+text+"/"+position+"/"+length+"*/"
            } else {
                var newEl = JSON.stringify({_k_type:'var', text:text, position:position, length:length});
            }
            newContent+= newEl;
            cursorPosition=position+length;
        });
        if (cursorPosition<dsData.content.length) {
            newContent+=dsData.content.substr(cursorPosition,dsData.content.length-cursorPosition);
        }
        // ahora tenemos que crear la tabla con el json
        var content = JSON.parse(newContent);
        var json_elements = this.getJSONElements(content);
        return json_elements;
    }

    getJSONElements (obj) {
        var objType = Object.prototype.toString.apply(obj)
        if (objType == '[object Object]' && obj.hasOwnProperty('_k_type')) {
            if (obj._k_type == 'var') {
                if (this.state.index in this.state.selectedVar) {
                    if (this.state.selectedVar[this.state.index] == null) {
                        return <span id={obj.position} className="modal-ds-var-negated clickable" onClick={this.selectVar}>{obj.text}</span>;
                    } else if (this.state.selectedVar[this.state.index] == obj.position) {
                        return <span id={obj.position} className="modal-ds-var-selected clickable" onClick={this.selectVar}>{obj.text}</span>;
                    } else {
                        return <span id={obj.position} className="modal-ds-var clickable" onClick={this.selectVar}>{obj.text}</span>;
                    }
                } else {
                    return <span id={obj.position} className="modal-ds-var clickable" onClick={this.selectVar}>{obj.text}</span>;
                }
            }
        } else if (objType == '[object Object]') {
            var keys = Object.keys(obj);
            var rows = keys.map( (key,i) => {
                return <tr key={i}><th>{key}</th><td>{this.getJSONElements(obj[key])}</td></tr>;
            });
            return (
              <ReactBootstrap.Table responsive>
                <tbody>
                  {rows}
                </tbody>
              </ReactBootstrap.Table>
            );
        } else if (objType == '[object Array]') {
            var tabItems = [];
            var otherItems = [];
            obj.forEach( item => {
                var itemType = Object.prototype.toString.apply(item)
                if (itemType == '[object Object]' && !item.hasOwnProperty('_k_type')) {
                    tabItems.push(item);
                } else {
                    otherItems.push(item);
                }
            });
            if (otherItems.length > 0) {
                if (tabItems.length > 0) {
                    otherItems.push(tabItems);
                }
                var rows = otherItems.map( (item,i) => {
                    return <tr key={i}>{this.getJSONElements(item)}</tr>
                });
                return (
                  <ReactBootstrap.Table responsive>
                    <tbody>
                      {rows}
                    </tbody>
                  </ReactBootstrap.Table>
                );
            } else if (tabItems.length > 0) {
                var keys = []
                tabItems.forEach( item => {
                    var itemKeys = Object.keys(item);
                    itemKeys.forEach( itemKey => {
                        if (keys.indexOf(itemKey) == -1) {
                            keys.push(itemKey)
                        }
                    });
                });
                var theader = keys.map ( (key,i) => {
                    return <th key={i}>{key}</th>
                });
                var rows = tabItems.map ( (item,i) => {
                    var row = keys.map ( (key,j) => {
                        return <td key={j}>{this.getJSONElements(item[key])}</td>
                    });
                    return <tr key={i}>{row}</tr>
                });
                return (
                  <ReactBootstrap.Table responsive>
                    <thead>
                      <tr>
                        {theader}
                      </tr>
                    </thead>
                    <tbody>
                      {rows}
                    </tbody>
                  </ReactBootstrap.Table>
                );
            } else {
                return <div />;
            }
        } else if (objType == '[object String]') {
            var matches = obj.match(/\/\*_k_type.*?\*\//gm)
            if (matches) {
                var result = [];
                var text = obj;
                var child = 0;
                matches.forEach( match => {
                    var texts = text.split(match,2)
                    if (texts[0].length > 0) {
                        result.push(<span key={child++}>{texts[0]}</span>)
                    }
                    var params = match.split('/*_k_type')[1].split('*/')[0].split('/')
                    if (params[1] == "var") {
                        var position = parseInt(params[3]);
                        var length = parseInt(params[4]);
                        var value = params[2];
                        if (this.state.index in this.state.selectedVar) {
                            if (this.state.selectedVar[this.state.index] == null) {
                                result.push(<span key={child++} id={position} className="modal-ds-var-negated clickable" onClick={this.selectVar}>{value}</span>);
                            } else if (this.state.selectedVar[this.state.index] == position) {
                                result.push(<span key={child++} id={position} className="modal-ds-var-selected clickable" onClick={this.selectVar}>{value}</span>);
                            } else {
                                result.push(<span key={child++} id={position} className="modal-ds-var clickable" onClick={this.selectVar}>{value}</span>);
                            }
                        } else {
                            result.push(<span key={child++} id={position} className="modal-ds-var clickable" onClick={this.selectVar}>{value}</span>);
                        }
                    } else {
                        result.push(<span key={child++}>{match}</span>);
                    }
                    text = texts[1];
                });
                if (text.length > 0) {
                    result.push(<span key={child++}>{text}</span>);
                }
                return <div>{result}</div>;
            } else {
                return <div>{String(obj)}</div>
            }
        } else {
            return <div>{String(obj)}</div>
        }
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
            var dsData = this.getHtmlContent();
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

