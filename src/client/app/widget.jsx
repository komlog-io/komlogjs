import React from 'react';
import ReactDOM from 'react-dom';
import PubSub from 'pubsub-js';
import * as ReactBootstrap from 'react-bootstrap';
import * as d3 from 'd3';
import * as utils from './utils.js';
import {getWidgetConfig} from './widget-store.js';
import {getDatasourceConfig, getDatasourceData, getDatasourceDataAt} from './datasource-store.js';
import {getDatapointConfig, getDatapointData, getDatapointTAxis} from './datapoint-store.js';
import {getNodeInfoByUri} from './uri-store.js';
import {d3TimeSlider, d3Linegraph, d3Histogram, d3Table} from './graphs.jsx';
import {topics, styles} from './types.js';

class Widget extends React.Component {
    state = {
        conf:{},
        shareCounter: 0,
        downloadCounter: 0,
        anomalyState: false,
        showConfig: false,
    };

    subscriptionTokens = [];

    async initialization () {
        var conf = await getWidgetConfig(this.props.wid);

        var subscribedTopics = [
            topics.WIDGET_CONFIG_UPDATE(this.props.wid),
        ];

        this.subscriptionTokens = subscribedTopics.map( topic => {
            return {
                token:PubSub.subscribe(topic,this.subscriptionHandler),
                msg:topic
            }
        });

        this.setState({conf:conf});
    }

    componentDidMount () {
        this.initialization();
    }

    componentWillUnmount () {
        this.subscriptionTokens.forEach( d => {
            PubSub.unsubscribe(d.token);
        });
    }

    shouldComponentUpdate (nextProps, nextState) {
        if (this.state.conf != nextState.conf) {
            return true;
        } else if (this.state.anomalyState != nextState.anomalyState) {
            return true;
        } else if (this.state.showConfig != nextState.showConfig) {
            return true;
        } else if (this.state.downloadCounter != nextState.downloadCounter) {
            return true;
        } else if (this.state.shareCounter != nextState.shareCounter) {
            return true;
        } else if (this.props.isPinned != nextProps.isPinned) {
            return true;
        }
        return false;
    }

    subscriptionHandler = (msg,data) => {
        switch (msg) {
            case topics.WIDGET_CONFIG_UPDATE(this.props.wid):
                this.refreshConfig();
                break;
        }
    }

    configCallback = () => {
        if (this.state.showConfig == false) {
            PubSub.publish(topics.WIDGET_CONFIG_REQUEST,{wid:this.props.wid});
        }
        this.setState({showConfig:!this.state.showConfig});
    }

    shareCallback = () => {
        this.setState({shareCounter:this.state.shareCounter+1});
    }

    closeCallback = () => {
        this.props.closeCallback();
    }

    downloadCallback = () => {
        this.setState({downloadCounter:this.state.downloadCounter+1});
    }

    setAnomalyState = (state) => {
        console.log('estado recibido',state);
        if (state != this.state.anomalyState) {
            console.log('estableciendo estado',state);
            this.setState({anomalyState:state});
        }
    }

    barMessage (data) {
        PubSub.publish(topics.BAR_MESSAGE(),{message:data.message,messageTime:data.messageTime});
    }

    async refreshConfig () {
        var newConfig = await getWidgetConfig(this.props.wid);
        var shouldUpdate = Object.keys(newConfig).some( key => {
            return !(this.state.conf.hasOwnProperty(key) && this.state.conf[key]==newConfig[key]);
        });
        if (shouldUpdate) {
            this.setState({conf:newConfig});
        }
    }

    getWidgetContentEl () {
        if (Object.keys(this.state.conf).length == 0) {
            return null;
        } else {
            switch (this.state.conf.type) {
                case 'ds':
                    return <WidgetDs wid={this.props.wid} shareCounter={this.state.shareCounter} downloadCounter={this.state.downloadCounter} anomalyStateCallback={this.setAnomalyState} />
                case 'dp':
                    return <WidgetDp wid={this.props.wid} shareCounter={this.state.shareCounter} downloadCounter={this.state.downloadCounter} barMessageCallback={this.barMessage} />
                case 'mp':
                    return <WidgetMp wid={this.props.wid} shareCounter={this.state.shareCounter} downloadCounter={this.state.downloadCounter} barMessageCallback={this.barMessage} />
                default:
                    return null;
            }
        }
    }

    getWidgetConfigEl () {
        if (Object.keys(this.state.conf).length == 0) {
            return null;
        } else {
            switch (this.state.conf.type) {
                case 'ds':
                    return <WidgetConfigDs showConfig={this.state.showConfig} closeCallback={this.closeCallback} configCallback={this.configCallback} wid={this.props.wid} />
                case 'dp':
                    return <WidgetConfigDp showConfig={this.state.showConfig} closeCallback={this.closeCallback} configCallback={this.configCallback} wid={this.props.wid} />
                case 'mp':
                    return <WidgetConfigMp showConfig={this.state.showConfig} closeCallback={this.closeCallback} configCallback={this.configCallback} wid={this.props.wid} />
                default:
                    return null;
            }
        }
    }

    render () {
        var widget_content=this.getWidgetContentEl();
        var widget_config=this.getWidgetConfigEl();
        var widgetClass = this.state.anomalyState ? "widget widget-anomaly" : "widget";
        if (Object.keys(this.state.conf).length === 0) {
            var widget=(
              <div className={widgetClass}>
                <WidgetBar bid={this.props.bid} wid={this.props.wid} conf={this.state.conf} closeCallback={this.closeCallback} />
              </div>
            );
        } else {
            var widget=(
              <div className={widgetClass}>
                <WidgetBar bid={this.props.bid} wid={this.props.wid} conf={this.state.conf} shareCallback={this.shareCallback} closeCallback={this.closeCallback} configCallback={this.configCallback} isPinned={this.props.isPinned} configOpen={this.state.showConfig} downloadCallback={this.downloadCallback} />
                {widget_config}
                {widget_content}
              </div>
            );
        }
        return widget;
    }
}

class WidgetBar extends React.Component {
    styles = {
        namestyle: {
            textAlign: 'left',
            width: '80%',
            fontWeight: 'bold',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            direction: 'rtl',
        },
        righticonstylePushed: {
            textShadow: '2px 2px 5px 2px #ccc',
            align: 'right',
            float: 'right',
            height: '20px',
            margin: '2px 0px 0px 10px',
            color: 'yellow',
            textShadow: '-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black',
        },
        righticonstyle: {
            textShadow: '1px 1px 5px 1px #ccc',
            align: 'right',
            float: 'right',
            height: '20px',
            margin: '3px 2px 0px 8px',
        },
        lefticonstyle: {
            textShadow: '1px 1px 5px 1px #ccc',
            align: 'left',
            float: 'left',
            height: '20px',
            margin: '2px 5px 0px 0px',
        },
    };

    constructor (props) {
        super(props);
        if (props.bid != '0') {
            var allowPin = true;
            var isPinned = props.isPinned;
        } else {
            var allowPin = false;
            var isPinned = false;
        }
        this.state = {
            allowPin: allowPin,
            isPinned: isPinned
        };
    }

    componentWillReceiveProps (nextProps) {
        if (this.props.bid != '0') {
            if (nextProps.isPinned!=this.state.isPinned) {
                this.setState({isPinned:nextProps.isPinned});
            }
        }
    }

    configClick = () => {
        this.props.configCallback();
    }

    shareClick = () => {
        this.props.shareCallback();
    }

    closeClick = () => {
        this.props.closeCallback();
    }

    downloadClick = () => {
        this.props.downloadCallback();
    }

    pinClick = () => {
        if (this.props.isPinned) {
            PubSub.publish(topics.MODIFY_DASHBOARD,{bid:this.props.bid,delete_widgets:[this.props.wid]});
            this.setState({isPinned:false});
        } else {
            PubSub.publish(topics.MODIFY_DASHBOARD,{bid:this.props.bid,new_widgets:[this.props.wid]});
            this.setState({isPinned:true});
        }
    }

    render () {
        if (this.state.allowPin) {
            if (this.state.isPinned == true) {
                var pinIcon=<span className="SlideBarIcon glyphicon glyphicon-pushpin" style={this.styles.righticonstylePushed} onClick={this.pinClick} />
            } else {
                var pinIcon=<span className="SlideBarIcon glyphicon glyphicon-pushpin" style={this.styles.righticonstyle} onClick={this.pinClick} />
            }
        } else {
            var pinIcon=null;
        }
        if (!this.props.conf.widgetname || this.props.conf.widgetname.split(':').length > 1){
            var configIcon= <span style={this.styles.lefticonstyle}>{' '}</span>
        } else {
            if (this.props.configOpen) {
                var configIcon=<span className="SlideBarIcon glyphicon glyphicon-chevron-down" style={this.styles.lefticonstyle} onClick={this.configClick} />
            } else {
                var configIcon=<span className="SlideBarIcon glyphicon glyphicon-chevron-right" style={this.styles.lefticonstyle} onClick={this.configClick} />
            }
        }
        return (
          <div className="SlideBar panel-heading">
            <span className="SlideBarIcon glyphicon glyphicon-remove" style={this.styles.righticonstyle} onClick={this.closeClick} />
            <span className="SlideBarIcon glyphicon glyphicon-send" style={this.styles.righticonstyle} onClick={this.shareClick} />
            <span className="SlideBarIcon glyphicon glyphicon-download" style={this.styles.righticonstyle} onClick={this.downloadClick} />
            {pinIcon}
            {configIcon}
            <div className="SlideBarName" style={this.styles.namestyle}>
              {this.props.conf.widgetname ? this.props.conf.widgetname : ''}
            </div>
          </div>
        );
    }
}

class WidgetConfigDs extends React.Component {
    state = {
        loading: true,
        did: null,
        datasourcename: '',
        deleteModal: false,
        feedbackModal: false,
        feedbackPos: [],
        feedbackNeg: [],
    };

    subscriptionTokens = [];
    popovers = {};

    async initialization () {
        var config = await getWidgetConfig(this.props.wid);
        var datasource = await getDatasourceConfig(config.did);

        var subscribedTopics = [
            topics.WIDGET_CONFIG_UPDATE(this.props.wid),
            topics.DATASOURCE_CONFIG_UPDATE(config.did)
        ];

        this.subscriptionTokens = subscribedTopics.map( topic => {
            return {
                token:PubSub.subscribe(topic,this.subscriptionHandler),
                msg:topic
            }
        });

        this.setState({did:config.did, datasourcename:datasource.datasourcename, loading:false});
    }

    componentDidMount () {
        this.initialization();
    }

    componentWillUnmount = () => {
        this.subscriptionTokens.forEach( d => {
            PubSub.unsubscribe(d.token);
        });
    }

    collapseUpdate = () => {
        PubSub.publish(topics.GRID_REFRESH_REQUEST,{});
    }

    subscriptionHandler = (msg,data) => {
        switch (msg) {
            case topics.DATASOURCE_CONFIG_UPDATE(this.state.did):
                this.refreshConfig();
                break;
            case topics.WIDGET_CONFIG_UPDATE(this.props.wid):
                this.refreshConfig();
                break;
        }
    }

    async refreshConfig () {
        var did = this.state.did;
        if (!did) {
            var config = await getWidgetConfig(this.props.wid);
            did = config.did;
        }
        var datasource = await getDatasourceConfig(did);
        var newState = {did:did, datasourcename:datasource.datasourcename};
        var refresh = Object.keys(newState).some( key => newState[key] != this.state[key]);
        if (refresh) {
            this.setState(newState);
        }
    }

    deleteWidget = () => {
        this.setState({deleteModal: true});
    }

    cancelDelete = () => {
        this.setState({deleteModal: false});
    }

    confirmDelete = () => {
        PubSub.publish(topics.DELETE_DATASOURCE,{did:this.state.did});
        this.setState({deleteModal: false});
        this.props.closeCallback();
    }

    getHtmlContent () {
        if (!this.state.dsData || !this.state.dsData.hasOwnProperty('content')) {
            return [];
        }
        if (utils.isJSON(this.state.dsData.content)) {
            return this.processJSONContent();
        } else {
            return this.processTextContent();
        }
    }

    processTextContent () {
        var dsData = this.state.dsData;
        var dsVars = dsData.variables;
        var dsDatapoints = this.state.dsDatapoints;
        var dpsInfo = this.state.dpsInfo;
        var elements=[];
        if (!dsData) {
            return elements;
        }
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
            var datapointFound=dsDatapoints.some( dp => {
                if (dp.index == position) {
                    text=dsData.content.substr(position,length);
                    var datapointname='...';
                    dpsInfo.forEach( state_dp => {
                        if (state_dp.pid == dp.pid) {
                            datapointname = state_dp.datapointname.split(this.state.datasourcename)[1];
                        }
                    });
                    var title=<div>Does this value belong to <strong>{datapointname}</strong>?</div>
                    var popover=(
                      <ReactBootstrap.Popover style={{zIndex:1260, wordWrap:"break-word"}} id='dpvalidation' title={title}>
                        <div className="row">
                          <div className="col-xs-4 col-xs-offset-2">
                            <ReactBootstrap.Button bsSize="xsmall" bsStyle="success" onClick={this.onClickDatapointYes.bind(null, dp.pid, position, length)}>Yes</ReactBootstrap.Button>
                          </div>
                          <div className="col-xs-4 col-xs-offset-1">
                            <ReactBootstrap.Button bsSize="xsmall" bsStyle="danger" onClick={this.onClickDatapointNo.bind(null, dp.pid, position, length)}>No</ReactBootstrap.Button>
                          </div>
                        </div>
                      </ReactBootstrap.Popover>
                    );
                    elements.push(
                      <ReactBootstrap.OverlayTrigger key={numElement++} ref={ popover => this.popovers[dp.index] = popover} placement="right" trigger="click" overlay={popover} rootClose>
                        <span className="datapoint" style={{borderBottom:'2px solid '+dp.c}}>{text}</span>
                      </ReactBootstrap.OverlayTrigger>
                    );
                    return true;
                }
            });
            if (datapointFound == false) {
                var variable_pos=position;
                text=dsData.content.substr(variable_pos,length);
                var title=<div>Does this value belong to <strong>any existing datapoint</strong>?</div>
                var list = this.state.dpsInfo.map( (dp,i) => {
                    return (
                      <ReactBootstrap.ListGroupItem key={i} onClick={this.onClickVariable.bind(null, dp.pid, position, length)}>
                        {dp.datapointname.split(this.state.datasourcename)[1]}
                      </ReactBootstrap.ListGroupItem>
                    );
                });
                var popover=(
                  <ReactBootstrap.Popover className="variable-feedback-popover" style={{zIndex:1260, wordWrap:"break-word"}} id='dpidentification' title={title}>
                    <ReactBootstrap.ListGroup fill>
                      {list}
                    </ReactBootstrap.ListGroup>
                  </ReactBootstrap.Popover>
                );
                elements.push(
                  <ReactBootstrap.OverlayTrigger key={numElement++} ref={ popover => this.popovers[variable_pos] = popover} placement="right" trigger="click" overlay={popover} rootClose>
                    <span className="variable" style={{borderBottom: '2px solid #eee'}}>{text}</span>
                  </ReactBootstrap.OverlayTrigger>
                );
            } else {
                datapointFound = false;
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

    processJSONContent () {
        var dsData = this.state.dsData;
        var elements=[];
        if (!dsData) {
            return elements;
        }
        var dsVars = dsData.variables;
        var dsDatapoints = this.state.dsDatapoints;
        var dpsInfo = this.state.dpsInfo;
        var numElement = 0;
        var cursorPosition=0;
        var newContent = ''
        var dsSubContent, start, text, match, datapointname, position, length;
        dsVars.forEach( v => {
            position=v[0];
            length=v[1];
            newContent+=dsData.content.substr(cursorPosition,position-cursorPosition);
            var datapointFound=dsDatapoints.some( dp => {
                if (dp.index == position) {
                    text=dsData.content.substr(position,length);
                    datapointname = '...';
                    dpsInfo.forEach( state_dp => {
                        if (state_dp.pid == dp.pid) {
                            datapointname = state_dp.datapointname.split(this.state.datasourcename)[1];
                        }
                    });
                    if (utils.inJSONString(dsData.content, position)) {
                        var newEl = "/*_k_type/dp/"+text+"/"+datapointname+"/"+dp.pid+"/"+position+"/"+length+"/"+dp.c+"*/"
                    } else {
                        var newEl = JSON.stringify({_k_type:'dp',datapointname:datapointname, pid:dp.pid, text:text, position:position, length:length, c:dp.c});
                    }
                    console.log('Nuevo elemento',newEl);
                    newContent+= newEl;
                    return true;
                }
            });
            if (datapointFound == false) {
                text=dsData.content.substr(position,length);
                var res = utils.inJSONString(dsData.content, position)
                if (res) {
                    var newEl = "/*_k_type/var/"+text+"/"+position+"/"+length+"*/"
                } else {
                    var newEl = JSON.stringify({_k_type:'var', text:text, position:position, length:length});
                }
                console.log('Nuevo elemento',newEl);
                newContent+= newEl;
            } else {
                datapointFound = false;
            }
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
                var title=<div>Does this value belong to <strong>any existing datapoint</strong>?</div>
                var list = this.state.dpsInfo.map( (dp,i) => {
                    return (
                      <ReactBootstrap.ListGroupItem key={i} onClick={this.onClickVariable.bind(null, dp.pid, parseInt(obj.position), parseInt(obj.length))}>
                        {dp.datapointname.split(this.state.datasourcename)[1]}
                      </ReactBootstrap.ListGroupItem>
                    );
                });
                var popover=(
                  <ReactBootstrap.Popover className="variable-feedback-popover" style={{zIndex:1260, wordWrap:"break-word"}} id='dpidentification' title={title}>
                    <ReactBootstrap.ListGroup fill>
                      {list}
                    </ReactBootstrap.ListGroup>
                  </ReactBootstrap.Popover>
                );
                return (
                  <ReactBootstrap.OverlayTrigger ref={ popover => this.popovers[parseInt(obj.position)] = popover} placement="right" trigger="click" overlay={popover} rootClose>
                    <span className="variable" style={{borderBottom: '2px solid #eee'}}>{obj.text}</span>
                  </ReactBootstrap.OverlayTrigger>
                );
            } else if (obj._k_type == 'dp') {
                var title=<div>Does this value belong to <strong>{obj.datapointname}</strong>?</div>
                var popover=(
                  <ReactBootstrap.Popover style={{zIndex:1260, wordWrap:"break-word"}} id='dpvalidation' title={title}>
                    <div className="row">
                      <div className="col-xs-4 col-xs-offset-2">
                        <ReactBootstrap.Button bsSize="xsmall" bsStyle="success" onClick={this.onClickDatapointYes.bind(null, obj.pid, parseInt(obj.position), parseInt(obj.length))}>Yes</ReactBootstrap.Button>
                      </div>
                      <div className="col-xs-4 col-xs-offset-1">
                        <ReactBootstrap.Button bsSize="xsmall" bsStyle="danger" onClick={this.onClickDatapointNo.bind(null, obj.pid, parseInt(obj.position), parseInt(obj.length))}>No</ReactBootstrap.Button>
                      </div>
                    </div>
                  </ReactBootstrap.Popover>
                );
                return (
                  <ReactBootstrap.OverlayTrigger ref={ popover => this.popovers[parseInt(obj.position)] = popover} placement="right" trigger="click" overlay={popover} rootClose>
                    <span className="datapoint" style={{borderBottom:'2px solid '+obj.c}}>{obj.text}</span>
                  </ReactBootstrap.OverlayTrigger>
                );
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
                        var title=<div>Does this value belong to <strong>any existing datapoint</strong>?</div>
                        var list = this.state.dpsInfo.map( (dp,i) => {
                            return (
                              <ReactBootstrap.ListGroupItem key={i} onClick={this.onClickVariable.bind(null, dp.pid, position, length)}>
                                {dp.datapointname.split(this.state.datasourcename)[1]}
                              </ReactBootstrap.ListGroupItem>
                            );
                        });
                        var popover=(
                          <ReactBootstrap.Popover className="variable-feedback-popover" style={{zIndex:1260, wordWrap:"break-word"}} id='dpidentification' title={title}>
                            <ReactBootstrap.ListGroup fill>
                              {list}
                            </ReactBootstrap.ListGroup>
                          </ReactBootstrap.Popover>
                        );
                        result.push(
                          <ReactBootstrap.OverlayTrigger key={child++} ref={ popover => this.popovers[position] = popover} placement="right" trigger="click" overlay={popover} rootClose>
                            <span className="variable" style={{borderBottom: '2px solid #eee'}}>{params[2]}</span>
                          </ReactBootstrap.OverlayTrigger>
                        );
                    } else if (params[1] == "dp") {
                        console.log(params);
                        var position = parseInt(params[5]);
                        var length = parseInt(params[6]);
                        var value = params[2];
                        var datapointname = params[3];
                        var pid = params[4];
                        var color = params[7];
                        var title=<div>Does this value belong to <strong>{datapointname}</strong>?</div>
                        var popover=(
                          <ReactBootstrap.Popover style={{zIndex:1260, wordWrap:"break-word"}} id='dpvalidation' title={title}>
                            <div className="row">
                              <div className="col-xs-4 col-xs-offset-2">
                                <ReactBootstrap.Button bsSize="xsmall" bsStyle="success" onClick={this.onClickDatapointYes.bind(null, pid, position, length)}>Yes</ReactBootstrap.Button>
                              </div>
                              <div className="col-xs-4 col-xs-offset-1">
                                <ReactBootstrap.Button bsSize="xsmall" bsStyle="danger" onClick={this.onClickDatapointNo.bind(null, pid, position, length)}>No</ReactBootstrap.Button>
                              </div>
                            </div>
                          </ReactBootstrap.Popover>
                        );
                        result.push(
                          <ReactBootstrap.OverlayTrigger key={child++} ref={ popover => this.popovers[position] = popover} placement="right" trigger="click" overlay={popover} rootClose>
                            <span className="datapoint" style={{borderBottom:'2px solid '+color}}>{value}</span>
                          </ReactBootstrap.OverlayTrigger>
                        );
                        console.log('asi estan los popovers',this.popovers);
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

    getFeedbackModalContent () {
        var element_nodes=this.getHtmlContent();
        return (
          <div className="modal-ds-content">
            {element_nodes}
          </div>
        );
    }

    showFeedbackModal = () => {
        var newState = {};
        var dsData = getDatasourceData({did:this.state.did});
        var dsConfig = getDatasourceConfig(this.state.did);
        this.setState({feedbackModal:true, loadingFeedbackModal:true});
        Promise.all([dsConfig, dsData]).then( values  => {
            var dpPromises = values[0].pids.map (pid => getDatapointConfig(pid));

            newState.datasourcename = values[0].datasourcename
            newState.dsData = values[1].data[0];
            newState.dsDatapoints = values[1].data[0].datapoints.map( dp => {
                return {pid:dp.pid,index:dp.index,c:'#eee'}
            });
            newState.seq = values[1].data[0].seq;
            newState.dpsInfo= [];

            Promise.all(dpPromises).then( dpConfigs => {

                dpConfigs.forEach ( dp => {
                    newState.dpsInfo.push({
                        pid:dp.pid,
                        datapointname:dp.datapointname,
                    });
                });

                newState.dpsInfo.sort( (a,b) => {
                    var nameA=a.datapointname.toLowerCase();
                    var nameB=b.datapointname.toLowerCase();
                    return ((nameA < nameB) ? -1 : ((nameA > nameB) ? 1 : 0));
                });

                newState.loadingFeedbackModal = false;
                this.setState(newState);
            });
        });
    }

    closeFeedbackModal = () => {
        this.popovers={};
        this.setState({feedbackModal:false, feedbackPos:[],feedbackNeg:[]});
    }

    sendFeedback = () => {
        var requests = this.state.feedbackPos.map( reg => {
            return {type:'p', pid:reg.pid, p:reg.pos, l:reg.len};
        });
        this.state.feedbackNeg.forEach ( reg => {
            var exists = requests.some( req => req.pid == reg.pid);
            if (!exists) {
                requests.push({type:'n', pid:reg.pid, p:reg.pos, l:reg.len});
            }
        });
        requests.forEach( req => {
            if (req.type == 'p') {
                var topic = topics.MARK_POSITIVE_VAR;
                var payload = {pid:req.pid, p:req.p, l:req.l, seq:this.state.seq};
                PubSub.publish(topic, payload);
            } else if (req.type == 'n') {
                var topic = topics.MARK_NEGATIVE_VAR;
                var payload = {pid:req.pid, p:req.p, l:req.l, seq:this.state.seq};
                PubSub.publish(topic, payload);
            }
        });
        this.closeFeedbackModal();
        var payload = {
            message:{type:'success',message:'Thanks for your feedback'},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE(),payload);
    }

    onClickDatapointYes = (pid, pos, len) => {
        console.log(this.popovers, pid, pos, len);
        if (this.popovers.hasOwnProperty(pos)) {
            console.log('cerrando popover');
            this.popovers[pos].hide();
        }
        var dsDatapoints = this.state.dsDatapoints;
        for (var i=0,j=dsDatapoints.length; i<j;i++) {
            if (dsDatapoints[i].pid == pid) {
                if (dsDatapoints[i].index == pos) {
                    dsDatapoints[i].c = 'green';
                } else {
                    dsDatapoints[i].c = 'red';
                }
            }
        }
        var positives = this.state.feedbackPos.filter(dp => dp.pid!=pid);
        positives.push({pid:pid, pos:pos, len:len});
        var negatives = this.state.feedbackNeg.filter(dp => !(dp.pid == pid && dp.pos == pos));
        this.setState({dsDatapoints:dsDatapoints, feedbackPos:positives, feedbackNeg:negatives});
    }

    onClickDatapointNo = (pid, pos, len) => {
        console.log(this.popovers, pid, pos, len);
        if (this.popovers.hasOwnProperty(pos)) {
            console.log('cerrando popover');
            this.popovers[pos].hide();
        }
        var dsDatapoints = this.state.dsDatapoints.filter( dp => !(dp.pid == pid && dp.index == pos));
        var positives = this.state.feedbackPos.filter(dp => !(dp.pid==pid && dp.pos==pos));
        var negatives = this.state.feedbackNeg.filter(dp => !(dp.pid == pid && dp.pos == pos));
        negatives.push({pid:pid, pos:pos, len:len});
        this.setState({dsDatapoints:dsDatapoints, feedbackPos:positives, feedbackNeg:negatives});
    }

    onClickVariable = (pid, pos, len) => {
        if (this.popovers.hasOwnProperty(pos)) {
            this.popovers[pos].hide();
        }
        var dsDatapoints = this.state.dsDatapoints;
        for (var i=0, j=dsDatapoints.length; i<j; i++) {
            if (dsDatapoints[i].pid == pid && dsDatapoints[i].index != pos) {
                dsDatapoints[i].c = 'red';
            }
        }
        dsDatapoints.push({pid:pid, index:pos, c:'green'});
        var positives = this.state.feedbackPos.filter(dp => dp.pid!=pid);
        positives.push({pid:pid, pos:pos, len:len});
        var negatives = this.state.feedbackNeg.filter(dp => !(dp.pid == pid && dp.pos == pos));
        this.setState({dsDatapoints:dsDatapoints, feedbackPos:positives, feedbackNeg:negatives});
    }

    render () {
        if (this.state.loading) {
            return (
              <ReactBootstrap.Collapse in={this.props.showConfig}>
                <div style={styles.banner}>
                  Loading ...
                </div>
              </ReactBootstrap.Collapse>
            );
        } else if (this.state.datasourcename.split(':').length > 1) {
            return null;
        }
        var feedbackModalContent;
        if (this.state.feedbackModal == true) {
            if (this.state.loadingFeedbackModal == true) {
                feedbackModalContent = null;
            } else {
                feedbackModalContent = this.getFeedbackModalContent();
            }
        } else {
            feedbackModalContent = null;
        }
        var feedback_modal =(
          <ReactBootstrap.Modal show={this.state.feedbackModal} onHide={this.closeFeedbackModal}>
            <ReactBootstrap.Modal.Header closeButton={true}>
              <ReactBootstrap.Modal.Title>
                Help us improve datapoint identification with your feedback.
              </ReactBootstrap.Modal.Title>
            </ReactBootstrap.Modal.Header>
            <ReactBootstrap.Modal.Body>
              {feedbackModalContent}
            </ReactBootstrap.Modal.Body>
            <ReactBootstrap.Modal.Footer>
              <ReactBootstrap.Button bsStyle="default" onClick={this.closeFeedbackModal}>
                Cancel
              </ReactBootstrap.Button>
              <ReactBootstrap.Button bsStyle="success" onClick={this.sendFeedback} disabled={this.state.feedbackPos.length + this.state.feedbackNeg.length == 0}>
                Ok
              </ReactBootstrap.Button>
            </ReactBootstrap.Modal.Footer>
          </ReactBootstrap.Modal>
        );
        var delete_modal=(
          <ReactBootstrap.Modal show={this.state.deleteModal} onHide={this.cancelDelete}>
            <ReactBootstrap.Modal.Header closeButton={true}>
              <ReactBootstrap.Modal.Title>
                Delete Datasource
              </ReactBootstrap.Modal.Title>
            </ReactBootstrap.Modal.Header>
            <ReactBootstrap.Modal.Body>
              Datasource
              <strong> {this.state.datasourcename} </strong>
              will be deleted, with all its datapoints.
              <p><strong>Are You sure?</strong></p>
            </ReactBootstrap.Modal.Body>
            <ReactBootstrap.Modal.Footer>
              <ReactBootstrap.Button bsStyle="default" onClick={this.cancelDelete}>
                Cancel
              </ReactBootstrap.Button>
              <ReactBootstrap.Button bsStyle="danger" onClick={this.confirmDelete}>
                Delete
              </ReactBootstrap.Button>
            </ReactBootstrap.Modal.Footer>
          </ReactBootstrap.Modal>
        );
        return (
          <ReactBootstrap.Collapse in={this.props.showConfig} onEntered={this.collapseUpdate} onExited={this.collapseUpdate}>
            <div>
              <ReactBootstrap.Well>
                <ReactBootstrap.Panel>
                  <ReactBootstrap.Table condensed responsive>
                    <tbody>
                      <tr>
                        <td>
                          <strong>Any datapoint misidentified?</strong>
                        </td>
                        <td colSpan="2" className="text-right">
                          <ReactBootstrap.Button bsSize="small" bsStyle="primary" onClick={this.showFeedbackModal}>
                            <strong>Send feedback</strong>
                          </ReactBootstrap.Button>
                        </td>
                      </tr>
                    </tbody>
                  </ReactBootstrap.Table>
                  <ReactBootstrap.Table condensed responsive>
                    <tbody>
                      <tr>
                        <td>
                          <strong>Delete Datasource</strong>
                        </td>
                        <td colSpan="2" className="text-right">
                          <ReactBootstrap.Button bsSize="small" bsStyle="danger" onClick={this.deleteWidget}><strong>Delete</strong></ReactBootstrap.Button>
                        </td>
                      </tr>
                    </tbody>
                  </ReactBootstrap.Table>
                </ReactBootstrap.Panel>
              </ReactBootstrap.Well>
              {delete_modal}
              {feedback_modal}
            </div>
          </ReactBootstrap.Collapse>
        );
    }
}

class WidgetConfigDp extends React.Component {
    state = {
        loading: true,
        newColor: '',
        deleteModal: false,
        updateDisabled: true,
    };

    subscriptionTokens = [];

    async initialization () {
        var config = await getWidgetConfig(this.props.wid);
        var datapoint = await getDatapointConfig(config.pid);

        var subscribedTopics = [
            topics.WIDGET_CONFIG_UPDATE(this.props.wid),
            topics.DATAPOINT_CONFIG_UPDATE(config.pid)
        ];

        this.subscriptionTokens = subscribedTopics.map( topic => {
            return {
                token:PubSub.subscribe(topic,this.subscriptionHandler),
                msg:topic
            }
        });

        this.setState({
            pid:config.pid,
            datapointname:datapoint.datapointname,
            color: datapoint.color,
            boxColor: datapoint.color,
            loading:false
        });
    }

    componentDidMount () {
        this.initialization();
    }

    componentWillUnmount () {
        this.subscriptionTokens.forEach( d => {
            PubSub.unsubscribe(d.token);
        });
    }

    subscriptionHandler = (msg,data) => {
        switch (msg) {
            case topics.DATAPOINT_CONFIG_UPDATE(this.state.pid):
                this.refreshConfig();
                break;
            case topics.WIDGET_CONFIG_UPDATE(this.props.wid):
                this.refreshConfig();
                break;
        }
    }

    collapseUpdate = () => {
        PubSub.publish(topics.GRID_REFRESH_REQUEST,{});
    }

    handleChange = (e) => {
        var color = e.target.value;
        var isOk = /^#[0-9A-F]{6}$/i.test(color);
        var newState={updateDisabled:!isOk,newColor:color};
        if (isOk) {
            newState.boxColor=color;
        }
        this.setState(newState);
    }

    async refreshConfig () {
        var pid = this.state.pid;
        if (!pid) {
            var config = await getWidgetConfig(this.props.wid);
            pid = config.pid;
        }
        var datapoint = await getDatapointConfig(pid);
        var newState = {
            pid:pid,
            datapointname:datapoint.datapointname,
            color:datapoint.color,
            boxColor:datapoint.color
        };
        var refresh = Object.keys(newState).some( key => newState[key] != this.state[key]);
        if (refresh) {
            this.setState(newState);
        }
    }

    updateConfig = () => {
        var color=this.state.newColor.toUpperCase();
        if (color != this.state.color && /^#[0-9A-F]{6}$/i.test(color)) {
            PubSub.publish(topics.MODIFY_DATAPOINT,{pid:this.state.pid,color:color});
        }
        this.props.configCallback();
    }

    deleteWidget = () => {
        this.setState({deleteModal: true});
    }

    cancelDelete = () => {
        this.setState({deleteModal: false});
    }

    confirmDelete = () => {
        PubSub.publish(topics.DELETE_DATAPOINT,{pid:this.state.pid});
        this.setState({deleteModal: false});
        this.props.closeCallback();
    }

    render () {
        if (this.state.loading) {
            return (
              <ReactBootstrap.Collapse in={this.props.showConfig}>
                <div style={styles.banner}>
                  Loading ...
                </div>
              </ReactBootstrap.Collapse>
            );
        } else if (this.state.datapointname.split(':').length > 1) {
            return null;
        }
        var delete_modal=(
          <ReactBootstrap.Modal show={this.state.deleteModal} onHide={this.cancelDelete}>
            <ReactBootstrap.Modal.Header closeButton={true}>
              <ReactBootstrap.Modal.Title>
                Delete Datapoint
              </ReactBootstrap.Modal.Title>
            </ReactBootstrap.Modal.Header>
            <ReactBootstrap.Modal.Body>
              Datapoint
              <strong> {this.state.datapointname} </strong>
              will be deleted.
              <p><strong> Are You sure? </strong></p>
            </ReactBootstrap.Modal.Body>
            <ReactBootstrap.Modal.Footer>
              <ReactBootstrap.Button bsStyle="default" onClick={this.cancelDelete}>
                Cancel
              </ReactBootstrap.Button>
              <ReactBootstrap.Button bsStyle="danger" onClick={this.confirmDelete}>
                Delete
              </ReactBootstrap.Button>
            </ReactBootstrap.Modal.Footer>
          </ReactBootstrap.Modal>
        );
        var boxColor=<ReactBootstrap.Glyphicon glyph="unchecked" style={{backgroundColor:this.state.boxColor, color:this.state.boxColor}} />
        return (
          <ReactBootstrap.Collapse in={this.props.showConfig} onEntered={this.collapseUpdate} onExited={this.collapseUpdate}>
            <div>
              <ReactBootstrap.Well>
                <ReactBootstrap.Panel>
                  <ReactBootstrap.Table condensed responsive>
                    <tbody>
                      <tr>
                        <td>
                          <strong>Color</strong>
                        </td>
                        <td className="text-right">
                          <ReactBootstrap.Form inline>
                            <ReactBootstrap.FormGroup>
                              <ReactBootstrap.InputGroup>
                                <ReactBootstrap.FormControl placeholder={this.state.color} value={this.state.newColor} bsSize="small" type="text" onChange={this.handleChange} />
                                <ReactBootstrap.InputGroup.Addon>{boxColor}</ReactBootstrap.InputGroup.Addon>
                              </ReactBootstrap.InputGroup>
                            </ReactBootstrap.FormGroup>
                          </ReactBootstrap.Form>
                        </td>
                      </tr>
                      <tr>
                        <td colSpan="2" className="text-right">
                          <ReactBootstrap.Button bsSize="small" bsStyle="primary" onClick={this.updateConfig} disabled={this.state.updateDisabled}>
                            <strong>Update</strong>
                          </ReactBootstrap.Button>
                        </td>
                      </tr>
                    </tbody>
                  </ReactBootstrap.Table>
                  <ReactBootstrap.Table condensed responsive>
                    <tbody>
                      <tr>
                        <td>
                          <strong>Delete Datapoint</strong>
                        </td>
                        <td colSpan="2" className="text-right">
                          <ReactBootstrap.Button bsSize="small" bsStyle="danger" onClick={this.deleteWidget}><strong>Delete</strong></ReactBootstrap.Button>
                        </td>
                      </tr>
                    </tbody>
                  </ReactBootstrap.Table>
                </ReactBootstrap.Panel>
              </ReactBootstrap.Well>
              {delete_modal}
            </div>
          </ReactBootstrap.Collapse>
        );
    }
}

class WidgetConfigMp extends React.Component {
    state = {
        loading: true,
        deleteModal: false,
        datapoints: [],
        widgetname: '',
        newWidgetname: '',
    };

    subscriptionTokens = [];

    async initialization () {
        var config = await getWidgetConfig(this.props.wid);
        var pids = config.datapoints;
        var promises = pids.map ( pid => getDatapointConfig(pid));

        var subscribedTopics = [
            topics.WIDGET_CONFIG_UPDATE(this.props.wid),
        ];

        Promise.all(promises).then (values => {
            var datapoints = [];

            values.forEach( value => {
                var dpInfo = {
                    pid:value.pid,
                    color:value.color,
                    datapointname:value.datapointname,
                    lineThrough: false,
                };
                datapoints.push(dpInfo);
                subscribedTopics.push(topics.DATAPOINT_CONFIG_UPDATE(value.pid));
            });

            this.subscriptionTokens = subscribedTopics.map( topic => {
                return {
                    token:PubSub.subscribe(topic,this.subscriptionHandler),
                    msg:topic
                }
            });

            this.setState({
                datapoints:datapoints,
                widgetname:config.widgetname,
                loading:false
            });
        });

    }

    componentDidMount () {
        this.initialization();
    }

    componentWillUnmount () {
        this.subscriptionTokens.forEach( d => {
            PubSub.unsubscribe(d.token);
        });
    }

    subscriptionHandler = (msg,data) => {
        var msgType=msg.split('-')[0];
        switch (msgType) {
            case 'datapointConfigUpdate':
                this.refreshConfig();
                break;
            case 'widgetConfigUpdate':
                this.refreshConfig();
                break;
        }
    }

    collapseUpdate = () => {
        PubSub.publish(topics.GRID_REFRESH_REQUEST,{});
    }

    async refreshConfig () {
        var shouldUpdate = false;
        var config = await getWidgetConfig(this.props.wid);
        var newPids = config.datapoints;
        var oldPids = this.state.datapoints.map( dp => dp.pid);
        var promises = newPids.map ( pid => getDatapointConfig(pid));
        var datapoints = [];
        Promise.all(promises).then (values => {
            values.forEach( value => {
                var dpInfo = {
                    pid:value.pid,
                    color:value.color,
                    datapointname:value.datapointname,
                    lineThrough: false,
                };
                datapoints.push(dpInfo);
            });

            var deletedPids = oldPids.filter( pid => newPids.indexOf(pid) < 0);
            var addedPids = newPids.filter( pid => oldPids.indexOf(pid) < 0);
            if (deletedPids.length > 0) {
                shouldUpdate = true;
                deletedPids.forEach( pid => {
                    this.subscriptionTokens.map( d => {
                        if (d.msg == topics.DATAPOINT_CONFIG_UPDATE(pid)) {
                            PubSub.unsubscribe(d.token);
                        }
                    });
                });
            }
            if (addedPids.length > 0) {
                shouldUpdate = true;
                addedPids.forEach( pid => {
                    var exists = this.subscriptionTokens.some( d => {
                        return d.msg == topics.DATAPOINT_CONFIG_UPDATE(pid);
                    });
                    if (!exists) {
                        this.subscriptionTokens.push({
                            token:PubSub.subscribe(
                                topics.DATAPOINT_CONFIG_UPDATE(pid),
                                this.subscriptionHandler),
                            msg:topics.DATAPOINT_CONFIG_UPDATE(pid)
                        });
                    }
                });
            }
            if (shouldUpdate == false && config.widgetname != this.state.widgetname) {
                shouldUpdate = true;
            } else if (shouldUpdate == false) {
                var shouldUpdate = datapoints.some( newDP => {
                    var stateDP = this.state.datapoints.filter( dp => dp.pid == newDP.pid);
                    if (stateDP.length != 1) {
                        return true;
                    } else if (stateDP[0].color != newDP.color) {
                        return true;
                    } else if (stateDP[0].datapointname != newDP.datapointname) {
                        return true;
                    } else {
                        return false;
                    }
                });
            }
            if (shouldUpdate) {
                this.setState({datapoints:datapoints, widgetname:config.widgetname});
            }
        });
    }

    updateConfig = () => {
        var shouldUpdate = false;
        var data={wid:this.props.wid};
        var new_widgetname=this.state.newWidgetname;
        if (new_widgetname.length>0 && new_widgetname!=this.state.widgetname) {
            shouldUpdate = true;
            data.new_widgetname=new_widgetname;
        }
        var deleteDatapoints=[];
        for (var i=0;i<this.state.datapoints.length;i++) {
            if (this.state.datapoints[i].lineThrough) {
                deleteDatapoints.push(this.state.datapoints[i].pid);
            }
        }
        if (deleteDatapoints.length>0) {
            shouldUpdate = true;
            data.delete_datapoints=deleteDatapoints;
        }
        if (shouldUpdate) {
            PubSub.publish(topics.MODIFY_WIDGET,data);
        }
        this.props.configCallback();
    }

    markDatapoint = (pid) => {
        var datapoints=this.state.datapoints;
        var render=false;
        for (var i=0;i<datapoints.length;i++) {
            if (datapoints[i].pid == pid) {
                datapoints[i].lineThrough=!datapoints[i].lineThrough;
                render=true;
                break;
            }
        }
        if (render) {
            this.setState({datapoints:datapoints});
        }
    }

    handleNameChange = (event) => {
        var newWidgetname = event.target.value;
        this.setState({newWidgetname:newWidgetname});
    }

    deleteWidget = () => {
        this.setState({deleteModal: true});
    }

    cancelDelete = () => {
        this.setState({deleteModal: false});
    }

    confirmDelete = () => {
        PubSub.publish(topics.DELETE_WIDGET,{wid:this.props.wid});
        this.setState({deleteModal: false});
        this.props.closeCallback();
    }

    renderDatapointList () {
        var list=this.state.datapoints.map( el => {
            if (el.lineThrough) {
                var style={'textDecoration':'line-through'};
                var glyph="remove";
            } else {
                var style={};
                var glyph="ok";
            }
            var name = el.datapointname.slice(-50);
            if (name.length == 50) {
                name = "..."+name;
            }
            return (
              <tr key={el.pid} style={{cursor:"pointer"}} onClick={this.markDatapoint.bind(null, el.pid)}>
                <td>
                  <ReactBootstrap.Glyphicon glyph={glyph} />
                </td>
                <td style={style}>
                  <span style={{backgroundColor:el.color,borderRadius:"2px"}}>&nbsp;&nbsp;&nbsp;&nbsp;</span>
                  <span title={el.datapointname}> {name}</span>
                </td>
              </tr>
            );
        });
        return (
          <ReactBootstrap.Table condensed responsive fill>
            <tbody>
              {list}
            </tbody>
          </ReactBootstrap.Table>
        );
    }

    render () {
        if (this.state.loading) {
            return (
              <ReactBootstrap.Collapse in={this.props.showConfig}>
                <div style={styles.banner}>
                  Loading ...
                </div>
              </ReactBootstrap.Collapse>
            );
        }
        var delete_modal=(
          <ReactBootstrap.Modal show={this.state.deleteModal} onHide={this.cancelDelete}>
            <ReactBootstrap.Modal.Header closeButton={true}>
              <ReactBootstrap.Modal.Title>
                Delete Graph
              </ReactBootstrap.Modal.Title>
            </ReactBootstrap.Modal.Header>
            <ReactBootstrap.Modal.Body>
              Graph
              <strong> {this.state.widgetname} </strong>
              will be deleted.
              <p><strong> Are You sure? </strong></p>
            </ReactBootstrap.Modal.Body>
            <ReactBootstrap.Modal.Footer>
              <ReactBootstrap.Button bsStyle="default" onClick={this.cancelDelete}>Cancel</ReactBootstrap.Button>
              <ReactBootstrap.Button bsStyle="danger" onClick={this.confirmDelete}>Delete</ReactBootstrap.Button>
            </ReactBootstrap.Modal.Footer>
          </ReactBootstrap.Modal>
        );
        var datapointList=this.renderDatapointList();
        return (
          <ReactBootstrap.Collapse in={this.props.showConfig} onEntered={this.collapseUpdate} onExited={this.collapseUpdate}>
            <div>
              <ReactBootstrap.Well>
                <ReactBootstrap.Panel>
                  <ReactBootstrap.Table condensed responsive>
                    <tbody>
                      <tr>
                        <td>
                          <strong>Graph Name</strong>
                        </td>
                        <td className="text-right">
                          <ReactBootstrap.FormControl placeholder={this.state.widgetname} value={this.state.newWidgetname} bsSize="small" type="text" onChange={this.handleNameChange} />
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Datapoints</strong>
                        </td>
                        <td>{datapointList}</td>
                      </tr>
                      <tr>
                        <td colSpan="2" className="text-right">
                          <ReactBootstrap.Button bsSize="small" bsStyle="primary" onClick={this.updateConfig}><strong>Update</strong></ReactBootstrap.Button>
                        </td>
                      </tr>
                    </tbody>
                  </ReactBootstrap.Table>
                  <ReactBootstrap.Table condensed responsive>
                    <tbody>
                      <tr>
                        <td>
                          <strong>Delete Graph</strong>
                        </td>
                        <td colSpan="2" className="text-right">
                          <ReactBootstrap.Button bsSize="small" bsStyle="danger" onClick={this.deleteWidget}><strong>Delete</strong></ReactBootstrap.Button>
                        </td>
                      </tr>
                    </tbody>
                  </ReactBootstrap.Table>
                </ReactBootstrap.Panel>
              </ReactBootstrap.Well>
              {delete_modal}
            </div>
          </ReactBootstrap.Collapse>
        );
    }
}

class WidgetDs extends React.Component {
    state = {
        loading: true,
        snapshotTimestamp:0,
        snapshotSeq: null,
        shareModal:false,
        shareCounter:this.props.shareCounter,
        downloadCounter:this.props.downloadCounter,
        activeVis:0,
        interval: null,
        hasTags: false,
        tagsAvailable: null,
        tagsApplied: [],
    };

    subscriptionTokens = [];
    boundingClientRect = null;

    async initialization () {
        var newState = {};
        var widget = await getWidgetConfig (this.props.wid);
        var dsConfig = getDatasourceConfig(widget.did);
        var dsData = getDatasourceData({did:widget.did});

        var subscribedTopics = [
            topics.WIDGET_CONFIG_UPDATE(this.props.wid),
            topics.WIDGET_INTERVAL_UPDATE(this.props.wid),
            topics.DATASOURCE_CONFIG_UPDATE(widget.did),
            topics.DATASOURCE_DATA_UPDATE(widget.did)
        ];

        newState.contentWidth = ReactDOM.findDOMNode(this).clientWidth;

        Promise.all([dsConfig, dsData]).then( values  => {

            var dpPromises = values[0].pids.map (pid => getDatapointConfig(pid));

            newState.did = values[0].did;
            newState.datasourcename = values[0].datasourcename;
            console.log('data received',values[1]);
            newState.seq = values[1].data[0].seq;
            newState.dsData = [values[1].data[0]];
            newState.datapoints = [];
            newState.interval = {its:values[1].data[0].ts, ets:values[1].data[0].ts};
            newState.intLength = 0;
            newState.activeVis = 0;

            Promise.all(dpPromises).then( dpConfigs => {

                dpConfigs.forEach ( dp => {
                    subscribedTopics.push(topics.DATAPOINT_CONFIG_UPDATE(dp.pid));
                    newState.datapoints.push({
                        pid:dp.pid,
                        datapointname:dp.datapointname
                    });
                });

                newState.datapoints.sort( (a,b) => {
                    var nameA=a.datapointname.toLowerCase();
                    var nameB=b.datapointname.toLowerCase();
                    return ((nameA < nameB) ? -1 : ((nameA > nameB) ? 1 : 0));
                });

                subscribedTopics.forEach(topic => {
                    this.subscriptionTokens.push({
                        token:PubSub.subscribe(topic,this.subscriptionHandler),
                        msg:topic
                    });
                });

                newState.loading = false;
                this.setState(newState);
            });

            var anomUri = values[0].datasourcename+'._anomaly';
            var anomDp = getNodeInfoByUri(anomUri);
            anomDp.then( (val) => {
                if (val && val.hasOwnProperty('id') && val.hasOwnProperty('type') && val.type == 'p') {
                    var topic = topics.DATAPOINT_DATA_UPDATE(val.id);
                    this.subscriptionTokens.push({
                        token:PubSub.subscribe(topic,this.subscriptionHandler),
                        msg:topic
                    });

                    getDatapointData({pid:val.id, onlyMissing:true});

                    this.setState({anomPid:val.id});
                } else {
                    console.log('No anomaly signal');
                }
            })
            .catch( () => {console.log('failed looking up anomaly signal',anomUri)});

            var tagsUri = values[0].datasourcename+'._tags';
            var tagsNode = getNodeInfoByUri(tagsUri);
            tagsNode.then( (val) => {
                if (val && val.hasOwnProperty('children') && val.children.length > 0) {
                    this.setState({hasTags:true});
                } else {
                    console.log('No tags signal');
                }
            })
            .catch( () => {console.log('failed looking up tags signal',tagsUri)});
        });
    }

    componentDidMount () {
        this.initialization();
    }

    componentWillUnmount () {
        this.subscriptionTokens.forEach( d => {
            PubSub.unsubscribe(d.token);
        });
    }

    componentWillReceiveProps (nextProps) {
        if (nextProps.shareCounter>this.state.shareCounter) {
            this.setState({shareModal:true,shareCounter:nextProps.shareCounter,snapshotTimestamp:this.state.timestamp,snapshotSeq:this.state.seq});
        } else if (nextProps.downloadCounter>this.state.downloadCounter) {
            this.downloadContent();
            this.setState({downloadCounter:nextProps.downloadCounter});
        }
    }

    componentDidUpdate () {
        const domNode = ReactDOM.findDOMNode(this);
        const boundingBox = domNode.getBoundingClientRect();
        if (!this.boundingClientRect) {
            this.boundingClientRect = boundingBox;
            PubSub.publish(topics.GRID_REFRESH_REQUEST,{});
        } else if (this.boundingClientRect.height != boundingBox.height ) {
            this.boundingClientRect = boundingBox;
            PubSub.publish(topics.GRID_REFRESH_REQUEST,{});
        } else {
            this.boundingClientRect = boundingBox;
        }
    }

    onClickDatapoint (pid,e) {
        e.preventDefault();
        PubSub.publish(topics.LOAD_SLIDE,{pid:pid});
    }

    onDragStartDatapoint (pid,e) {
        e.stopPropagation();
        e.dataTransfer.setData('id',pid);
    }

    subscriptionHandler = (msg,data) => {
        var msgType = msg.split('-')[0];
        switch (msgType) {
            case topics.DATASOURCE_DATA_UPDATE():
                this.refreshData();
                break;
            case topics.DATAPOINT_DATA_UPDATE():
                this.refreshDpData();
                break;
            case topics.DATAPOINT_CONFIG_UPDATE():
                this.refreshData();
                break;
            case topics.DATASOURCE_CONFIG_UPDATE():
                this.refreshConfig();
                break;
            case topics.WIDGET_CONFIG_UPDATE():
                this.refreshConfig();
                break;
        }
    }

    downloadContent = () => {
        if (this.state.dsData.length > 0) {
            if (utils.isJSON(this.state.dsData[0].content)) {
                var headerFields= [];
                this.state.dsData.forEach ( d => {
                    if (utils.isJSON(d.content)) {
                        var jsonContent = JSON.parse(d.content);
                        var objType = Object.prototype.toString.apply(jsonContent)
                        if (objType == '[object Object]') {
                            Object.keys(jsonContent).forEach( field => {
                                if (headerFields.indexOf(field) == -1) {
                                    headerFields.push(field);
                                }
                            });
                        }
                    }
                });
                var csv='date'
                headerFields.forEach( field => {
                    csv+=';'+field;
                });
                csv+='\n';
                this.state.dsData.forEach ( d => {
                    csv+=new Date(d.ts*1000).toISOString();
                    if (utils.isJSON(d.content)) {
                        var jsonContent = JSON.parse(d.content);
                        var objType = Object.prototype.toString.apply(jsonContent)
                        if (objType == '[object Object]') {
                            headerFields.forEach ( field => {
                                var value = jsonContent[field]
                                if (value) {
                                    csv+=";"+value.toString();
                                } else {
                                    csv+=";";
                                }
                            });
                        } else {
                            csv+=";"+d.content;
                        }
                    } else {
                        csv+=";"+d.content;
                    }
                    csv+="\n";
                });
                utils.downloadFile(this.state.datasourcename+'.csv',csv,'text/csv');
            } else {
                var content = [];
                this.state.dsData.forEach( d => {
                    content.push(new Date(d.ts*1000).toISOString());
                    content.push(d.content);
                });
                utils.downloadFile(this.state.datasourcename+'.txt',content.join('\n'),'text/plain');
            }
        }
    }

    async getTagsTAxis ({interval, tags}) {
        var totalAxis;
        var dpTAxis = {};
        var tagAxis = {}
        for (var i=0; i< tags.length; i++) {
            var f = tags[i];
            var pids = new Set();
            for (var j=0, k=f.length; j<k; j++) {
                var uri = f[j];
                var dp = this.state.tagsAvailable.find( el => el.uri == uri);
                if (dp) {
                    pids.add(dp.id)
                    if (!dpTAxis.hasOwnProperty(dp.id)) {
                        dpTAxis[dp.id] = await getDatapointTAxis({pid:dp.id, interval:interval});
                    }
                }
            }
            console.log('dpTAxis',dpTAxis);
            console.log('pids',pids.size, pids);
            pids.forEach ( pid => {
                if (!tagAxis.hasOwnProperty(i)) {
                    tagAxis[i] = new Set(dpTAxis[pid]);
                } else {
                    var tmpAxis = new Set();
                    tagAxis[i].forEach( x => {
                        if (dpTAxis[pid].indexOf(x)>-1) {
                            tmpAxis.add(x);
                        }
                    });
                    console.log('reemplazando tagAxis - tmpAxis',tagAxis[i]);
                    tagAxis[i] = tmpAxis;
                }
            });
        }
        console.log('tag Axis',tagAxis);
        Object.keys(tagAxis).forEach( (key,i) => {
            if (i == 0) {
                totalAxis = new Set(tagAxis[key]);
            } else {
                tagAxis[key].forEach( d => totalAxis.add(d));
            }
        });
        var axisData = [...totalAxis].sort( (a,b) => a-b);
        return axisData;
    }

    async getTaggedData ({axis, interval}) {
        var data = [];
        var last;
        if (interval.ets == null || interval.its == null) {
            last = true;
        }
        if (last) {
            if (axis) {
                for (var i=axis.length, j=0;i>j;i--) {
                    var dsData = await getDatasourceDataAt({did:this.state.did, ts:axis[i-1]});
                    if (dsData && dsData.data.length > 0) {
                        data.push(dsData.data[0]);
                        break;
                    }
                }
            } else {
                var dsData = await getDatasourceData({did:this.state.did, interval:interval});
                if (dsData && dsData.data.length > 0) {
                    data.push(dsData.data[0]);
                }
            }
        } else {
            var dsData = await getDatasourceData({did:this.state.did, interval:interval});
            if (dsData) {
                if (axis) {
                    dsData.data.forEach( d => {
                        if (axis.indexOf(d.ts)>-1) {
                            data.push(d);
                        }
                    });
                } else {
                    data = dsData.data;
                }
            }
        }
        return data;
    }

    async refreshData ({intLength, tagsApplied}={}) {
        var now = new Date().getTime()/1000;
        if (intLength == null) {
            intLength = this.state.intLength;
        }
        if (tagsApplied == null) {
            tagsApplied = this.state.tagsApplied;
        }
        if (intLength == 0) {
            var interval = {ets:null, its:null};
        } else {
            var interval = {ets:now, its:now-intLength};
        }
        if (tagsApplied.length > 0) {
            var tAxis = await this.getTagsTAxis({interval:interval, tags:tagsApplied});
        } else {
            var tAxis = null;
        }
        console.log('tAxis',tAxis);
        var data = await this.getTaggedData({axis:tAxis, interval:interval});
        console.log('filtered data',data);
        //Una vez que tengo el resultado, compruebo si cambia en algo los datos actuales.
        var shouldUpdate = false;
        if (data.length != this.state.dsData.length) {
            shouldUpdate = true;
        } else if (data.length > 0) {
            if (this.state.dsData[0].ts != data[0].ts) {
                shouldUpdate = true;
            } else if (this.state.dsData[0].datapoints.length != data[0].datapoints.length) {
                shouldUpdate = true;
            }
        }
        //Si los cambia, la sustituyo y actualizo el state.
        if (shouldUpdate) {
            this.refreshDpData();
            if (interval.its == null) {
                if (data.length == 0) {
                    interval = {ets:now, its:now-intLength};
                } else {
                    interval = {ets:data[0].ts, its:data[0].ts};
                }
            }
            if (data.length > 0) {
                interval = {ets:data[0].ts, its:data[0].ts-intLength};
                var seq = data[0].seq;
            } else {
                var seq = null;
            }
            this.setState({dsData:data, interval:interval, seq:seq});
        }
        //Si no, termino.
    }

    async refreshDpData () {
        if (this.state.anomPid) {
            console.log('dpdata update recibido');
            var now = new Date().getTime()/1000;
            var interval = {its:null, ets:now}
            var anomData = await getDatapointData({pid:this.state.anomPid, interval:interval, onlyMissing:true});
            console.log('datos obtenidos',anomData)
            if (anomData && anomData.hasOwnProperty('data') && anomData.data.length>0) {
                console.log('vamos a actualizar estado',anomData.data[anomData.data.length-1].value);
                this.props.anomalyStateCallback(anomData.data[anomData.data.length-1].value>0);
            } else {
                console.log('no tenemos datos del dp');
            }
        }
    }

    async refreshConfig () {
        var shouldUpdate = false;
        var dsConfig = await getDatasourceConfig(this.state.did);
        if (this.state.datasourcename != dsConfig.datasourcename) {
            shouldUpdate = true;
        }
        var deletedPids = this.state.datapoints.filter( dp => dsConfig.pids.indexOf(dp.pid) < 0);
        var newPids=dsConfig.pids.filter(pid => !this.state.datapoints.some(dp => dp.pid == pid));
        var newDatapoints = this.state.datapoints;
        if (deletedPids.length > 0) {
            shouldUpdate = true;
            deletedPids.forEach( pid => {
                this.subscriptionTokens.map( d => {
                    if (d.msg == topics.DATAPOINT_CONFIG_UPDATE(pid)) {
                        PubSub.unsubscribe(d.token);
                    }
                });
                newDatapoints = newDatapoints.filter( dp => dp.pid != pid);
            });
        }
        if (newPids.length > 0) {
            shouldUpdate = true;
            for (var i=0,j=newPids.length;i<j;i++) {
                var pid = newPids[i];
                var exists = this.subscriptiontokens.some ( d => {
                    return d.msg == topics.DATAPOINT_CONFIG_UPDATE(pid);
                });
                if (!exists) {
                    this.subscriptionTokens.push({
                        token:PubSub.subscribe(
                            topics.DATAPOINT_CONFIG_UPDATE(pid),
                            this.subscriptionHandler),
                        msg:topics.DATAPOINT_CONFIG_UPDATE(pid)
                    });
                }
                var dpConfig = await getDatapointConfig(pid);
                newDatapoints.push({pid:dpConfig.pid, datapointname:dpConfig.datapointname});
            }
        }
        if (shouldUpdate) {
            newDatapoints.sort( (a,b) => {
                var nameA=a.datapointname.toLowerCase();
                var nameB=b.datapointname.toLowerCase();
                return ((nameA < nameB) ? -1 : ((nameA > nameB) ? 1 : 0));
            });
            this.setState({
                datasourcename:datasourcename,
                datapoints: newDatapoints,
            });
        }
    }

    selectVis = (event) => {
        event.preventDefault();
        var buttonId=parseInt(event.target.id);
        if (this.state.activeVis != buttonId) {
            var now = new Date().getTime()/1000;
            if (buttonId == 4) {
                var intLength = 86400;
            } else if (buttonId == 3) {
                var intLength = 21600;
            } else if (buttonId == 2) {
                var intLength = 7200;
            } else if (buttonId == 1) {
                var intLength = 3600;
            } else if (buttonId == 0) {
                var intLength = 0;
            }
            this.setState({activeVis:buttonId, intLength:intLength});
            this.refreshData({intLength:intLength});
        }
    }

    getDsInfo () {
        if (this.state.interval.ets) {
            var dateFormat = d3.timeFormat("%Y/%m/%d - %H:%M:%S");
            var date = new Date(this.state.interval.ets*1000);
            var dateText=dateFormat(date);
            return (
                <div className="ds-info">
                  <ReactBootstrap.Glyphicon glyph="time" />
                  {' '}{dateText}
                </div>
            );
        } else {
            return null;
        }
    }

    generateDateString (timestamp) {
        if (typeof timestamp === 'number') {
            var dateFormat = d3.timeFormat("%Y/%m/%d - %H:%M:%S");
            var date = new Date(timestamp*1000);
            var dateText=dateFormat(date);
            return dateText;
        } else {
            return '';
        }
    }

    getFontClass () {
        var dsData = this.state.dsData;
        if (!dsData || dsData.length == 0 || this.state.contentWidth == null) {
            return 'font-normal';
        }
        var newLineRegex=/(?:\r\n|\r|\n)/g;
        var contentWidth = this.state.contentWidth;
        var normalLength = contentWidth / 8;
        var lines = dsData[0].content.split(newLineRegex);
        var meanLineSize=d3.mean(lines, d => d.length > 0 ? d.length : normalLength);
        var fontClass = meanLineSize * 10 < contentWidth ? 'font-large' : meanLineSize * 6 > contentWidth ? 'font-small' : 'font-normal';
        return fontClass;
    }

    getHtmlContent () {
        if (!this.state.dsData || this.state.dsData.length == 0) {
            return [];
        }
        var notAllJSON = this.state.dsData.some( data => {
            if (!utils.isJSON(data.content)) {
                return true;
            }
        });
        if (!notAllJSON) {
            var content = this.processJSONContent();
        } else {
            var counter = 0;
            var contents = [];
            this.state.dsData.forEach( (d) => {
                var row = this.processTextContent(d);
                contents.push(<tr key={counter++}><th className="font-small">{this.generateDateString(d.ts)}</th></tr>);
                contents.push(<tr key={counter++}><td>{row}</td></tr>);
            });
            var content = (
              <ReactBootstrap.Table condensed>
                <tbody>
                {contents}
                </tbody>
              </ReactBootstrap.Table>
            );
        }
        return content;
    }

    processTextContent (dsData) {
        var dsDatapoints = this.state.datapoints;
        var elements=[];
        if (!dsData) {
            return elements;
        }
        var can_edit = true;
        if (this.state.datasourcename.split(':').length > 1) {
            var dsVars = [];
            can_edit = false;
            dsData.datapoints.forEach( dp => {
                dsData.variables.forEach ( v => {
                    if (v[0] == dp.index) {
                        dsVars.push(v);
                    }
                });
            });
            dsVars.sort( (a,b) => a[0]-b[0]);
        } else {
            dsVars = dsData.variables;
        }
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
            var datapointFound=dsData.datapoints.some( dp => {
                if (dp.index == position) {
                    text=dsData.content.substr(position,length);
                    datapointname = null;
                    dsDatapoints.forEach( state_dp => {
                        if (state_dp.pid == dp.pid) {
                            datapointname = state_dp.datapointname.split(this.state.datasourcename);
                        }
                    });
                    if (datapointname) {
                        datapointname = datapointname[1].slice(-20);
                        if (datapointname.length == 20) {
                            datapointname = "..."+datapointname;
                        }
                    } else {
                        datapointname='...';
                    }
                    var tooltip=<ReactBootstrap.Tooltip id='datapoint'>{datapointname}</ReactBootstrap.Tooltip>;
                    elements.push(
                      <ReactBootstrap.OverlayTrigger key={numElement++} placement="top" overlay={tooltip}>
                        <span className="datapoint" draggable="true" onClick={this.onClickDatapoint.bind(null,dp.pid)} onDragStart={this.onDragStartDatapoint.bind(null,dp.pid)}>
                          {text}
                        </span>
                      </ReactBootstrap.OverlayTrigger>
                    );
                    return true;
                }
            });
            if (datapointFound == false && can_edit == true) {
                text=dsData.content.substr(position,length);
                elements.push(
                  <WidgetDsVariable key={numElement++} content={text} position={position} length={length} seq={dsData.seq} identifyVariableCallback={this.identifyVariable} datapoints={this.state.datapoints} />
                );
            } else {
                datapointFound = false;
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

    processJSONContent () {
        if (!this.state.dsData || this.state.dsData.length == 0) {
            return null;
        }
        var allObjects = true;
        var allArrayOfObjects = true;
        var headerFields = [];
        this.state.dsData.forEach ( d => {
            if (utils.isJSON(d.content)) {
                var jsonContent = JSON.parse(d.content);
                var objType = Object.prototype.toString.apply(jsonContent);
                if (objType == '[object Object]') {
                    allArrayOfObjects = false;
                    Object.keys(jsonContent).forEach( field => {
                        if (headerFields.indexOf(field) == -1) {
                            headerFields.push(field);
                        }
                    });
                } else if (objType == '[object Array]') {
                    allObjects = false;
                    jsonContent.forEach ( arrayEl => {
                        var elemType = Object.prototype.toString.apply(arrayEl);
                        if (elemType == '[object Object]') {
                            Object.keys(arrayEl).forEach( field => {
                                if (headerFields.indexOf(field) == -1) {
                                    headerFields.push(field);
                                }
                            });
                        } else {
                            allArrayOfObjects = false;
                        }
                    });
                } else {
                    allArrayOfObjects = false;
                    allObjects = false;
                }
            } else {
                allArrayOfObjects = false;
                allObjects = false;
            }
        });
        var dsDatapoints = this.state.datapoints;
        var canEdit = true;
        if (this.state.datasourcename.split(':').length > 1) {
            canEdit = false;
        }
        var dsContents=[];
        this.state.dsData.forEach( data => {
            if (canEdit) {
                var dsVars = data.variables;
            } else {
                var dsVars = [];
                data.datapoints.forEach( dp => {
                    data.variables.forEach ( v => {
                        if (v[0] == dp.index) {
                            dsVars.push(v);
                        }
                    });
                });
                dsVars.sort( (a,b) => a[0]-b[0]);
            }
            var numElement = 0;
            var cursorPosition=0;
            var newContent = ''
            var dsSubContent, start, text, match, datapointname, position, length;
            dsVars.forEach( v => {
                position=v[0];
                length=v[1];
                newContent+=data.content.substr(cursorPosition,position-cursorPosition);
                var datapointFound=data.datapoints.some( dp => {
                    if (dp.index == position) {
                        text=data.content.substr(position,length);
                        datapointname = null;
                        dsDatapoints.forEach( stateDp => {
                            if (stateDp.pid == dp.pid) {
                                datapointname = stateDp.datapointname.split(this.state.datasourcename);
                            }
                        });
                        if (datapointname) {
                            datapointname = datapointname[1].slice(-20);
                            if (datapointname.length == 20) {
                                datapointname = "..."+datapointname;
                            }
                        } else {
                            datapointname='...';
                        }
                        if (utils.inJSONString(data.content, position)) {
                            var newEl = "/*_k_type/dp/"+text+"/"+datapointname+"/"+dp.pid+"/"+data.seq+"*/"
                        } else {
                            var newEl = JSON.stringify({_k_type:'dp',datapointname:datapointname, pid:dp.pid, text:text, seq:data.seq});
                        }
                        newContent+= newEl;
                        return true;
                    }
                });
                if (datapointFound == false) {
                    text=data.content.substr(position,length);
                    if (canEdit) {
                        var res = utils.inJSONString(data.content, position)
                        if (res) {
                            var newEl = "/*_k_type/var/"+text+"/"+position+"/"+length+"/"+data.seq+"*/"
                        } else {
                            var newEl = JSON.stringify({_k_type:'var', text:text, position:position, length:length, seq:data.seq});
                        }
                        newContent+= newEl;
                    } else {
                        newContent+= text;
                    }
                } else {
                    datapointFound = false;
                }
                cursorPosition=position+length;
            });
            if (cursorPosition<data.content.length) {
                newContent+=data.content.substr(cursorPosition,data.content.length-cursorPosition);
            }
            dsContents.push({ts:data.ts, content:newContent});
        });
        // ahora tenemos que crear la tabla con el json
        if (allObjects) {
            headerFields.unshift('date');
            console.log('todo objetos',headerFields);
            if (this.state.intLength == 0) {
                var verticalHeading = true;
            } else {
                var verticalHeading = false;
            }
            if (verticalHeading) {
                var content = JSON.parse(dsContents[0].content);
                var rows = headerFields.map( (field,i) => {
                    if (i==0) {
                        return <tr key={i}><td><strong>{field}</strong></td><td>{this.generateDateString(dsContents[0].ts)}</td></tr>;
                    } else {
                        var jsonElements = this.getJSONElements(content[field]);
                        return <tr key={i}><td><strong>{field}</strong></td><td>{jsonElements}</td></tr>;
                    }
                });
                return (
                    <ReactBootstrap.Table condensed>
                      <tbody>
                        {rows}
                      </tbody>
                    </ReactBootstrap.Table>
                );
            } else {
                var cols = headerFields.map( (field, i) => {
                    return <th key={i}>{field}</th>;
                });
                var rows = dsContents.map( (dsContent,i) => {
                    var content = JSON.parse(dsContent.content);
                    var fields = headerFields.map( (field, j) => {
                        if (j==0) {
                            return <td key={j}>{this.generateDateString(dsContent.ts)}</td>;
                        } else {
                            return <td key={j}>{this.getJSONElements(content[field])}</td>;
                        }
                    });
                    return <tr key={i}>{fields}</tr>;
                });
                return (
                    <ReactBootstrap.Table condensed hover>
                      <thead>
                        <tr>
                          {cols}
                        </tr>
                      </thead>
                      <tbody>
                        {rows}
                      </tbody>
                    </ReactBootstrap.Table>
                );
            }
        } else if (allArrayOfObjects) {
            console.log('todo Array de objetos',headerFields);
            var cols = headerFields.map( (field, i) => {
                return <th key={i}>{field}</th>;
            });
            var rows = dsContents.map( (dsContent,i) => {
                var content = JSON.parse(dsContent.content);
                var contentRows = [];
                var rowCount = 0;
                contentRows.push(<tr key={++rowCount}><th colSpan={headerFields.length.toString()}>{this.generateDateString(dsContent.ts)}</th></tr>);
                content.forEach( (item,j) => {
                    var rowItems = []
                    headerFields.forEach ( (field,k) => {
                        rowItems.push(<td key={k}>{this.getJSONElements(item[field])}</td>);
                    });
                    contentRows.push(<tr key={++rowCount}>{rowItems}</tr>);
                });
                return contentRows;
            });
            return (
                <ReactBootstrap.Table condensed hover>
                  <thead>
                    <tr>
                      {cols}
                    </tr>
                  </thead>
                  <tbody>
                    {rows}
                  </tbody>
                </ReactBootstrap.Table>
            );
        } else {
            console.log('Generico',headerFields);
            var counter = 0;
            var rows = [];
            dsContents.forEach( dsContent => {
                var content = JSON.parse(dsContent.content);
                rows.push(<tr key={counter++}><td>{this.generateDateString(dsContent.ts)}</td></tr>);
                rows.push(<tr key={counter++}><td>{this.getJSONElements(content)}</td></tr>);
            });
            return (
                <ReactBootstrap.Table condensed>
                  <tbody>
                    {rows}
                  </tbody>
                </ReactBootstrap.Table>
            );
        }
    }

    getJSONElements (obj) {
        var objType = Object.prototype.toString.apply(obj)
        if (objType == '[object Object]' && obj.hasOwnProperty('_k_type')) {
            if (obj._k_type == 'var') {
                return <WidgetDsVariable content={obj.text} position={parseInt(obj.position)} length={parseInt(obj.length)} seq={obj.seq} identifyVariableCallback={this.identifyVariable} datapoints={this.state.datapoints}/>
            } else if (obj._k_type == 'dp') {
                var tooltip=<ReactBootstrap.Tooltip id='datapoint'>{obj.datapointname}</ReactBootstrap.Tooltip>;
                return (
                  <ReactBootstrap.OverlayTrigger placement="top" overlay={tooltip}>
                    <span className="datapoint" draggable="true" onClick={this.onClickDatapoint.bind(null,obj.pid)} onDragStart={this.onDragStartDatapoint.bind(null,obj.pid)}>
                      {obj.text}
                    </span>
                  </ReactBootstrap.OverlayTrigger>
                );
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
                        result.push(<WidgetDsVariable key={child++} content={params[2]} position={parseInt(params[3])} length={parseInt(params[4])} seq={params[5]} identifyVariableCallback={this.identifyVariable} datapoints={this.state.datapoints}/>);
                    } else if (params[1] == "dp") {
                        var tooltip=<ReactBootstrap.Tooltip id='datapoint'>{params[3]}</ReactBootstrap.Tooltip>;
                        result.push(
                            <ReactBootstrap.OverlayTrigger key={child++} placement="top" overlay={tooltip}>
                              <span className="datapoint" draggable="true" onClick={this.onClickDatapoint.bind(null,params[4])} onDragStart={this.onDragStartDatapoint.bind(null,params[4])}>
                                {params[2]}
                              </span>
                            </ReactBootstrap.OverlayTrigger>
                        );
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

    cancelSnapshot = () => {
        this.setState({shareModal:false});
    }

    shareSnapshot = () => {
        var user_list=this.users.value.split(/[\s]+/);
        var payload = {seq:this.state.snapshotSeq,user_list:user_list,wid:this.props.wid};
        PubSub.publish(topics.NEW_WIDGET_DS_SNAPSHOT,payload);
        this.setState({shareModal:false});
    }

    identifyVariable = ({position, length, seq, datapointname}) => {
        var payload ={
            p:position,
            l:length,
            seq:seq,
            did:this.state.did,
            datapointname:datapointname
        };
        PubSub.publish(topics.MONITOR_DATAPOINT,payload);
    }

    getTagsApplied = () => {
        var tags = this.state.tagsApplied.map( (d,i) => {
            console.log('map',d,i);
            var tagName = '';
            for (var j=0,k=d.length;j<k;j++) {
                var fields = d[j].split('.');
                var subc = fields.pop();
                var category = fields.pop();
                if (j>0) {
                    tagName += ' AND ';
                }
                tagName += ' '+category+':'+subc;
            }
            if (i>0) {
                var logic = <span className='label label-default key-row-item'>OR</span>;
            }
            return (
            <span key={i}>
              {logic}
              <span className='label label-success key-row-item'>
                <span id={i} className='glyphicon glyphicon-remove clickable' onClick={this.removeTagApplied}/>
                {tagName}
              </span>
            </span>
            );
        });
        return <div>{tags}</div>
    }

    async loadTagsAvailable () {
        var tagsAvailable = [];
        var tagsNode = await getNodeInfoByUri(this.state.datasourcename+'._tags');
        if (tagsNode && tagsNode.children && tagsNode.children.length > 0) {
            var hasTags = false;
            await Promise.all(tagsNode.children.map( async (childUri) => {
                console.log('add req ',childUri);
                var info = await getNodeInfoByUri(childUri);
                console.log('info obtenida ',info);
                if (info != null && info.hasOwnProperty('children')) {
                    await Promise.all(info.children.map( async (childUri) => {
                        var childInfo = await getNodeInfoByUri(childUri);
                        if (childInfo && childInfo.type == 'p') {
                            hasTags = true;
                            tagsAvailable.push(childInfo);
                        }
                    }));
                }
            }));
            if (hasTags == true) {
                tagsAvailable.sort( (a,b) => a.uri.localeCompare(b.uri));
                this.setState({tagsAvailable:tagsAvailable});
            }
        }
    }

    showTagsModal = () => {
        if (this.state.hasTags) {
            if (this.state.tagsAvailable == null) {
                this.loadTagsAvailable();
            }
            this.setState({tagsModal:true, currentTagSelection:[]});
        }
    }

    getTagsMenu () {
        console.log('getTagsMenu');
        if (this.state.tagsModal == false) {
            return null;
        } else if (this.state.tagsAvailable == null) {
            return (
              <div style={styles.banner}>
                Loading...
              </div>
            );
        } else {
            var counter = 0;
            var items = [];
            var categories = [];
            //tagsAvailable should be stored alphabetically sorted by uri
            this.state.tagsAvailable.forEach( dp => {
                var name = dp.uri.split('.');
                var sc = name.pop();
                var cat = name.pop();
                if (categories.indexOf(cat) == -1) {
                    categories.push(cat);
                    items.push(<tr key={counter++}><th>{cat}</th></tr>);
                    items.push(
                      <tr key={counter++}>
                        <td><ReactBootstrap.Checkbox id={dp.uri} onChange={this.tagCheckboxHandler} inline>{sc}</ReactBootstrap.Checkbox></td>
                      </tr>
                    );
                } else {
                    items.push(
                      <tr key={counter++}>
                        <td><ReactBootstrap.Checkbox id={dp.uri} onChange={this.tagCheckboxHandler} inline>{sc}</ReactBootstrap.Checkbox></td>
                      </tr>
                    );
                }
            });
            return (
              <div className="modal-tags">
                <ReactBootstrap.Table hover condensed>
                  <tbody>
                    {items}
                  </tbody>
                </ReactBootstrap.Table>
              </div>
            );
        }
    }

    tagCheckboxHandler = (event) => {
        var currentSelection = this.state.currentTagSelection;
        if (event.target.checked) {
            currentSelection.push(event.target.id);
            this.setState({currentTagSelection:currentSelection});
        } else {
            var index = currentSelection.indexOf(event.target.id);
            if (index > -1) {
                currentSelection.splice(index,1);
                this.setState({currentTagSelection:currentSelection});
            }
        }
    }

    cancelTagSelection = () => {
        this.setState({tagsModal:false});
    }

    applyTagSelection = () => {
        if (this.state.currentTagSelection.length > 0){
            var newTag = this.state.currentTagSelection.map( d => {
                return d;
            });
            var tagsApplied = this.state.tagsApplied;
            for (var i=0,j=tagsApplied.length;i<j;i++) {
                if (newTag.length == tagsApplied[i].length) {
                    var exists = newTag.every( e => {
                        return tagsApplied[i].indexOf(e) > -1;
                    });
                    if (exists) {
                        var payload = {
                            message:{type:'info',message:'Tag already applied'},
                            messageTime:(new Date).getTime()
                        };
                        PubSub.publish(topics.BAR_MESSAGE(),payload);
                        this.setState({tagsModal:false});
                        return;
                    }
                }
            }
            //Nos suscribimos a las actualizaciones de datos de los dp que no estén suscritos
            newTag.forEach( uri => {
                var dp = this.state.tagsAvailable.find( el => el.uri == uri);
                if (dp) {
                    var topic = topics.DATAPOINT_DATA_UPDATE(dp.id);
                    var tkIndex = this.subscriptionTokens.findIndex( tk => tk.msg == topic);
                    if (tkIndex == -1) {
                        this.subscriptionTokens.push({
                            token:PubSub.subscribe(
                                topics.DATAPOINT_DATA_UPDATE(dp.id),
                                this.subscriptionHandler),
                            msg:topic
                        });
                    }
                }
            });
            tagsApplied.push(newTag);
            this.refreshData ({tagsApplied:tagsApplied});
            this.setState({tagsModal:false, tagsApplied:tagsApplied});
        } else {
            this.setState({tagsModal:false});
        }
    }

    removeTagApplied = (event) => {
        var tagsApplied = this.state.tagsApplied;
        var index = event.target.id;
        if (index > -1) {
            var tagUris = tagsApplied[index].map(uri => uri);
            tagsApplied.splice(index,1);
            console.log('uris del filtro',tagUris);
            tagUris.forEach( uri => {
                var found = tagsApplied.some( tag => {
                    if (tag.some( fUri => fUri == uri )) {
                        return true;
                    }
                });
                //Nos desuscribimos de las actualizaciones de datos de los dp si ya no se necesitan
                if (found == false) {
                    var dp = this.state.tagsAvailable.find( el => el.uri == uri);
                    if (dp) {
                        var topic = topics.DATAPOINT_DATA_UPDATE(dp.id);
                        var tkIndex = -1
                        var tk = this.subscriptionTokens.find( (tk,i) => {
                            if (tk.msg == topic) {
                                tkIndex = i;
                                return true;
                            }
                        });
                        if (tk) {
                            PubSub.unsubscribe(tk.token);
                            this.subscriptionTokens.splice(tkIndex, 1);
                        }
                    }
                }
            });
            this.refreshData ({tagsApplied:tagsApplied});
            this.setState({tagsApplied:tagsApplied});
        }
    }

    render () {
        if (this.state.loading) {
            return (
              <div style={styles.banner}>
                Loading...
              </div>
            );
        }
        var element_nodes=this.getHtmlContent();
        var textClass=this.getFontClass();
        var dsClass = this.state.anomaly ? "ds-content ds-anomaly "+textClass : "ds-content "+textClass;
        var info_node=this.getDsInfo();
        if (this.state.hasTags == true) {
            var addTag = (
                <ReactBootstrap.Button bsStyle="primary" active={false} onClick={this.showTagsModal}>tags <span className='glyphicon glyphicon-plus-sign' /></ReactBootstrap.Button>
            );
            var tags = this.getTagsApplied();
        } else {
            var addTag = null;
            var tags = null;
        }
        var share_modal=(
          <ReactBootstrap.Modal show={this.state.shareModal} onHide={this.cancelSnapshot}>
            <ReactBootstrap.Modal.Header closeButton={true}>
              <ReactBootstrap.Modal.Title>
                Share snapshot at {this.generateDateString(this.state.snapshotTimestamp)}
              </ReactBootstrap.Modal.Title>
            </ReactBootstrap.Modal.Header>
            <ReactBootstrap.Modal.Body>
              <ReactBootstrap.FormControl inputRef={(input) => { this.users = input; }} type="textarea" label="Select Users" placeholder="type users separated by space" />
            </ReactBootstrap.Modal.Body>
            <ReactBootstrap.Modal.Footer>
              <ReactBootstrap.Button bsStyle="default" onClick={this.cancelSnapshot}>Cancel</ReactBootstrap.Button>
              <ReactBootstrap.Button bsStyle="primary" onClick={this.shareSnapshot}>Share</ReactBootstrap.Button>
            </ReactBootstrap.Modal.Footer>
          </ReactBootstrap.Modal>
        );
        var tags_modal=(
          <ReactBootstrap.Modal show={this.state.tagsModal} onHide={this.cancelTagSelection}>
            <ReactBootstrap.Modal.Header closeButton={true}>
              <ReactBootstrap.Modal.Title>
                Select tags
              </ReactBootstrap.Modal.Title>
            </ReactBootstrap.Modal.Header>
            <ReactBootstrap.Modal.Body>
              {this.getTagsMenu()}
            </ReactBootstrap.Modal.Body>
            <ReactBootstrap.Modal.Footer>
              <ReactBootstrap.Button bsStyle="default" onClick={this.cancelTagSelection}>Cancel</ReactBootstrap.Button>
              <ReactBootstrap.Button bsStyle="primary" onClick={this.applyTagSelection}>Apply</ReactBootstrap.Button>
            </ReactBootstrap.Modal.Footer>
          </ReactBootstrap.Modal>
        );
        return (
          <div>
            {info_node}
            <div className="row">
              <div className="col-sm-7">
                {tags}
              </div>
              <div className="col-sm-5 visual-bar text-right">
                <ReactBootstrap.ButtonToolbar bsSize="xsmall">
                <ReactBootstrap.ButtonGroup bsSize="xsmall">
                  {addTag}
                </ReactBootstrap.ButtonGroup>
                <ReactBootstrap.ButtonGroup bsSize="xsmall">
                  <ReactBootstrap.Button id="4" active={this.state.activeVis == 4 ? true : false} onClick={this.selectVis}>24h</ReactBootstrap.Button>
                  <ReactBootstrap.Button id="3" active={this.state.activeVis == 3 ? true : false} onClick={this.selectVis}>6h</ReactBootstrap.Button>
                  <ReactBootstrap.Button id="2" active={this.state.activeVis == 2 ? true : false} onClick={this.selectVis}>2h</ReactBootstrap.Button>
                  <ReactBootstrap.Button id="1" active={this.state.activeVis == 1 ? true : false} onClick={this.selectVis}>1h</ReactBootstrap.Button>
                  <ReactBootstrap.Button id="0" active={this.state.activeVis == 0 ? true : false} onClick={this.selectVis}>last</ReactBootstrap.Button>
                </ReactBootstrap.ButtonGroup>
                </ReactBootstrap.ButtonToolbar>
              </div>
            </div>
            <div className={dsClass}>
              {element_nodes}
            </div>
            <div>
              {share_modal}
            </div>
            <div>
              {tags_modal}
            </div>
          </div>
        );
    }
}

class WidgetDp extends React.Component {
    state = {
        loading: true,
        live: true,
        activeVis: 0,
        shareModal:false,
        shareCounter:this.props.shareCounter,
        downloadCounter:this.props.downloadCounter,
        snapshotInterval: undefined,
        livePrevious: true,
    };

    subscriptionTokens = [];
    boundingClientRect = null;

    async initialization () {
        var config = await getWidgetConfig(this.props.wid);
        var dpConfig = getDatapointConfig(config.pid);
        var dpData = getDatapointData({pid:config.pid});

        var subscribedTopics = [
            topics.WIDGET_CONFIG_UPDATE(this.props.wid),
            topics.WIDGET_INTERVAL_UPDATE(this.props.wid),
            topics.DATAPOINT_CONFIG_UPDATE(config.pid),
            topics.DATAPOINT_DATA_UPDATE(config.pid)
        ];

        Promise.all([dpConfig,dpData]).then( values => {

            this.subscriptionTokens = subscribedTopics.map( topic => {
                return {
                    token:PubSub.subscribe(topic,this.subscriptionHandler),
                    msg:topic
                }
            });

            var nextTs = values[1].data.map( d => d.ts);
            var ets = Math.max.apply(null,nextTs);
            var its = Math.min.apply(null,nextTs);
            if (ets == its) {
                var now = new Date().getTime()/1000;
                its -= 3600;
                ets += 3600;
                if (ets > now) {
                    ets = now;
                }
            }

            var newState = {
                interval:{its:its,ets:ets},
                pid:values[0].pid,
                datapointname: values[0].datapointname,
                color: values[0].color,
                data: values[1].data,
                loading:false
            }
            this.setState(newState);
        });
    }

    componentDidMount () {
        this.initialization();
    }

    componentWillUnmount () {
        this.subscriptionTokens.forEach( d => {
            PubSub.unsubscribe(d.token);
        });
    }

    componentWillReceiveProps (nextProps) {
        if (nextProps.shareCounter>this.state.shareCounter) {
            this.setState({shareModal:true,shareCounter:nextProps.shareCounter, snapshotInterval:this.state.interval, livePrevious:this.state.live, live: false});
        } else if (nextProps.downloadCounter>this.state.downloadCounter) {
            this.downloadContent();
            this.setState({downloadCounter:nextProps.downloadCounter});
        }
    }

    componentDidUpdate () {
        const domNode = ReactDOM.findDOMNode(this);
        const boundingBox = domNode.getBoundingClientRect();
        if (!this.boundingClientRect) {
            this.boundingClientRect = boundingBox;
            PubSub.publish(topics.GRID_REFRESH_REQUEST,{});
        } else if (this.boundingClientRect.height != boundingBox.height ) {
            this.boundingClientRect = boundingBox;
            PubSub.publish(topics.GRID_REFRESH_REQUEST,{});
        } else {
            this.boundingClientRect = boundingBox;
        }
    }

    subscriptionHandler = (msg,data) => {
        var msgType = msg.split('-')[0];
        switch (msgType) {
            case topics.DATAPOINT_DATA_UPDATE():
                this.refreshData(data.interval);
                break;
            case topics.DATAPOINT_CONFIG_UPDATE():
                this.refreshConfig();
                break;
            case topics.WIDGET_CONFIG_UPDATE():
                this.refreshConfig();
                break;
            case topics.WIDGET_INTERVAL_UPDATE():
                this.newIntervalCallback(data.interval);
                break;
        }
    }

    selectVis = (event) => {
        event.preventDefault();
        var buttonId=parseInt(event.target.id);
        if (this.state.activeVis != buttonId) {
            this.setState({activeVis:buttonId});
        }
    }

    downloadContent = () => {
        if (this.state.data.length>0 && this.state.datapointname != null) {
            var csv = "date,"+this.state.datapointname+"\n";
            this.state.data.map((r,i) => {
                csv+=new Date(r.ts*1000).toISOString()+','+r.value+"\n";
            });
            utils.downloadFile(this.state.datapointname+'.csv',csv,'text/csv');
        } else {
            this.props.barMessageCallback({message:{type:'info',message:'No data in selected interval'},messageTime:(new Date).getTime()});
        }
    }

    newIntervalCallback = (interval) => {
        var now=new Date().getTime()/1000;
        var live = this.state.live;
        if (interval.its == interval.ets) {
            interval.its=interval.ets-3600;
        }
        if (Math.abs(this.state.interval.ets-interval.ets)>1) {
            if (interval.ets < now-30) {
                live = false;
            } else {
                live = true;
            }
        }
        if (interval.ets > now) {
            interval.ets = now;
        }
        var newData = getDatapointData({pid:this.state.pid, interval:interval});
        newData.then( dpData => {
            console.log('paso el getDatapointData');
            this.setState({live:live,interval:interval, data:dpData.data});
        });
    }

    snapshotIntervalCallback = (interval) => {
        var now=new Date().getTime()/1000;
        if (interval.hasOwnProperty('its') && interval.hasOwnProperty('ets')) {
            if (interval.its == interval.ets) {
                interval.its=interval.ets-3600;
            }
            if (interval.ets > now) {
                interval.ets = now;
            }
            this.setState({snapshotInterval:interval});
        }
    }

    async refreshConfig () {
        var shouldUpdate = false;
        var dpConfig = await getDatapointConfig(this.state.pid);
        if (this.state.datapointname != dpConfig.datapointname) {
            shouldUpdate = true;
        } else if (this.state.color != dpConfig.color) {
            shouldUpdate = true;
        }
        if (shouldUpdate) {
            this.setState({datapointname:dpConfig.datapointname,color:dpConfig.color});
        }
    }

    async refreshData (interval) {
        console.log('refreshdata',interval);
        var shouldUpdate = false;
        if ((this.state.live && interval.ets > this.state.interval.ets) ||
            (this.state.interval.ets >= interval.ets && this.state.interval.its <= interval.ets) ||
            (this.state.interval.its <= interval.its && this.state.interval.ets >= interval.its)) {
            var newData = await getDatapointData({pid:this.state.pid, interval:interval});
            //for new or different samples
            shouldUpdate = newData.data.some( d => {
                var haveIt = this.state.data.some ( e => e.ts == d.ts && e.value == d.value);
                return !haveIt;
            });
            console.log('shouldUpdate new',shouldUpdate);
            //for deleted samples
            if (!shouldUpdate) {
                var intervalData = this.state.data.filter( d => d.ts >= interval.its && d.ts <= interval.ets);
                if (intervalData.length != newData.data.length) {
                    shouldUpdate = true;
                }
            }
            console.log('shouldUpdate deleted',shouldUpdate);
        }
        if (shouldUpdate) {
            var newInt;
            var intervalLength = this.state.interval.ets - this.state.interval.its;
            var newTs = newData.data.map(d => d.ts);
            var ets = Math.max.apply(null, newTs);
            if (ets > this.state.interval.ets) {
                newInt = {ets:ets,its:ets-intervalLength};
            } else {
                newInt = this.state.interval;
            }
            newData = await getDatapointData({pid:this.state.pid, interval:newInt, onlyMissing:true});
            this.setState({data: newData.data, interval:newInt});
        }
    }

    getDataSummary () {
        var data = this.state.data;
        var numSamples=data.length;
        if (numSamples>0) {
            var allValues = data.map( d => d.value);
            var maxValue=Math.max.apply(null, allValues);
            var minValue=Math.min.apply(null, allValues);
            var sumValues = allValues.reduce((a, b) => a + b, 0);
            var meanValue=sumValues/numSamples;
            if ((maxValue % 1) != 0 || (minValue % 1) != 0) {
                if (typeof maxValue % 1 == 'number' && maxValue % 1 != 0) {
                    var numDecimalsMaxValue=maxValue.toString().split('.')[1].length;
                } else {
                    var numDecimalsMaxValue=2;
                }
                if (typeof minValue % 1 == 'number' && minValue % 1 != 0) {
                    var numDecimalsMinValue=minValue.toString().split('.')[1].length;
                } else {
                    var numDecimalsMinValue=2;
                }
                var numDecimals=Math.max(numDecimalsMaxValue,numDecimalsMinValue);
            } else {
                var numDecimals=2;
            }
            meanValue=meanValue.toFixed(numDecimals);
            var summary={
                max:d3.format(",")(maxValue),
                min:d3.format(",")(minValue),
                mean:d3.format(",")(meanValue)
            };
        } else {
            var summary={
                max:'-',
                min:'-',
                mean:'-'
            };
        }
        return (
          <table className="table-condensed">
            <tbody>
              <tr>
                <th>max</th>
                <th>min</th>
                <th>mean</th>
              </tr>
              <tr>
                <td>{summary.max}</td>
                <td>{summary.min}</td>
                <td>{summary.mean}</td>
              </tr>
            </tbody>
          </table>
        );
    }

    cancelSnapshot = () => {
        this.setState({shareModal:false, live: this.state.livePrevious});
    }

    shareSnapshot = () => {
        var user_list=this.users.value.split(/[\s]+/);
        PubSub.publish(topics.NEW_WIDGET_DP_SNAPSHOT,{interval:this.state.snapshotInterval,user_list:user_list,wid:this.props.wid});
        this.setState({shareModal:false, live: this.state.livePrevious});
    }

    render () {
        if (this.state.loading) {
            return (
              <div style={styles.banner}>
                Loading...
              </div>
            );
        }
        var summary = this.getDataSummary();
        var data=[{
            pid:this.state.pid,
            color:this.state.color,
            datapointname:this.state.datapointname,
            data:this.state.data
        }];
        var share_modal=(
          <ReactBootstrap.Modal show={this.state.shareModal} onHide={this.cancelSnapshot}>
            <ReactBootstrap.Modal.Header closeButton={true}>
              <ReactBootstrap.Modal.Title>Share snapshot</ReactBootstrap.Modal.Title>
            </ReactBootstrap.Modal.Header>
            <ReactBootstrap.Modal.Body>
              <ReactBootstrap.FormControl inputRef={(input) => { this.users = input; }} type="textarea" label="Select Users" placeholder="type users separated by spaces" />
            </ReactBootstrap.Modal.Body>
            <ReactBootstrap.Modal.Footer>
              <ReactBootstrap.Button bsStyle="default" onClick={this.cancelSnapshot}>Cancel</ReactBootstrap.Button>
              <ReactBootstrap.Button bsStyle="primary" onClick={this.shareSnapshot}>Share</ReactBootstrap.Button>
            </ReactBootstrap.Modal.Footer>
          </ReactBootstrap.Modal>
        );
        if (this.state.activeVis == 0) {
            var visContent = <ContentLinegraph interval={this.state.interval} data={data} newIntervalCallback={this.newIntervalCallback} />;
        } else if (this.state.activeVis == 1) {
            var visContent = <ContentHistogram data={data} />;
        } else if (this.state.activeVis == 2) {
            var visContent = <ContentTable data={data} />;
        } else {
            var visContent = null;
        }
        return (
          <div>
            <div className="dp-stats">
              {summary}
            </div>
            <div className="row visual-bar">
              <div className="col-sm-5 text-center">
                <ReactBootstrap.ButtonGroup bsSize="xsmall">
                  <ReactBootstrap.Button id="0" active={this.state.activeVis == 0 ? true : false} onClick={this.selectVis}>chart</ReactBootstrap.Button>
                  <ReactBootstrap.Button id="1" active={this.state.activeVis == 1 ? true : false} onClick={this.selectVis}>histogram</ReactBootstrap.Button>
                  <ReactBootstrap.Button id="2" active={this.state.activeVis == 2 ? true : false} onClick={this.selectVis}>table</ReactBootstrap.Button>
                </ReactBootstrap.ButtonGroup>
              </div>
              <div className="col-sm-7">
                <TimeSlider interval={this.state.interval} newIntervalCallback={this.newIntervalCallback} />
              </div>
            </div>
            <div className="row">
              <div className="col-sm-12">{visContent}</div>
            </div>
            <div>{share_modal}</div>
          </div>
        );
    }
}

class WidgetMp extends React.Component {
    state = {
        loading: true,
        live: true,
        activeVis: 0,
        shareModal:false,
        shareCounter:this.props.shareCounter,
        snapshotInterval: undefined,
        downloadCounter: this.props.downloadCounter,
        livePrevious: true,
    };

    subscriptionTokens = [];
    boundingClientRect = null;

    async initialization () {
        var newState = {};
        var config = await getWidgetConfig(this.props.wid);
        var dpPromises = [];

        var subscribedTopics = [
            topics.WIDGET_CONFIG_UPDATE(this.props.wid),
            topics.WIDGET_INTERVAL_UPDATE(this.props.wid),
        ];

        newState.widgetname = config.widgetname;
        newState.config = {};
        newState.data = {};
        newState.interval = {its:null, ets:null};

        config.datapoints.forEach( pid => {
            dpPromises.push(getDatapointConfig(pid));
            dpPromises.push(getDatapointData({pid:pid}));
            subscribedTopics.push(topics.DATAPOINT_CONFIG_UPDATE(pid));
            subscribedTopics.push(topics.DATAPOINT_DATA_UPDATE(pid));
            newState.config[pid]={};
            newState.data[pid]={};
        });


        Promise.all(dpPromises).then( values => {
            var etss = [];
            var itss = [];
            values.forEach( value => {
                if (value.hasOwnProperty('data') ) {
                    newState.data[value.pid]=value.data;
                    var dpTs = value.data.map(d => d.ts);
                    etss.push(Math.max.apply(null, dpTs));
                    itss.push(Math.min.apply(null, dpTs));
                } else {
                    newState.config[value.pid].datapointname = value.datapointname;
                    newState.config[value.pid].color = value.color;
                }
            });
            if (etss.length > 0) {
                newState.interval.ets = Math.max.apply(null, etss);
                var sumItss = itss.reduce((a, b) => a + b, 0);
                newState.interval.its = sumItss/itss.length;
                if (newState.interval.ets == newState.interval.its) {
                    var now = new Date().getTime()/1000;
                    newState.interval.its -= 3600;
                    newState.interval.ets += 3600;
                    if (newState.interval.ets > now) {
                        newState.interval.ets = now;
                    }
                }
            }

            this.subscriptionTokens = subscribedTopics.map( topic => {
                return {
                    token:PubSub.subscribe(topic,this.subscriptionHandler),
                    msg:topic
                }
            });

            newState.loading = false;

            this.setState(newState);
        });
    }

    componentDidMount () {
        this.initialization();
    }

    componentWillUnmount () {
        this.subscriptionTokens.forEach( d => {
            PubSub.unsubscribe(d.token);
        });
    }

    componentWillReceiveProps (nextProps) {
        if (nextProps.shareCounter>this.state.shareCounter) {
            if (Object.keys(this.state.config).length == 0) {
                this.props.barMessageCallback({
                    message:{type:'danger',message:'No datapoints in graph'},
                    messageTime:(new Date).getTime()
                });
                this.setState({shareModal:false,shareCounter:nextProps.shareCounter});
            } else {
                this.setState({
                    shareModal:true,
                    shareCounter:nextProps.shareCounter,
                    snapshotInterval:this.state.interval,
                    livePrevious:this.state.live,
                    live: false
                });
            }
        } else if (nextProps.downloadCounter>this.state.downloadCounter) {
            this.downloadContent();
            this.setState({downloadCounter:nextProps.downloadCounter});
        }
    }

    componentDidUpdate () {
        const domNode = ReactDOM.findDOMNode(this);
        const boundingBox = domNode.getBoundingClientRect();
        if (!this.boundingClientRect) {
            this.boundingClientRect = boundingBox;
            PubSub.publish(topics.GRID_REFRESH_REQUEST,{});
        } else if (this.boundingClientRect.height != boundingBox.height ) {
            this.boundingClientRect = boundingBox;
            PubSub.publish(topics.GRID_REFRESH_REQUEST,{});
        } else {
            this.boundingClientRect = boundingBox;
        }
    }

    subscriptionHandler = (msg,data) => {
        var msgType=msg.split('-')[0];
        switch (msgType) {
            case topics.DATAPOINT_DATA_UPDATE():
                var pid=msg.split('-')[1];
                this.refreshData(data.interval, pid);
                break;
            case topics.DATAPOINT_CONFIG_UPDATE():
                this.refreshConfig();
                break;
            case topics.WIDGET_INTERVAL_UPDATE():
                this.newIntervalCallback(data.interval);
                break;
            case topics.WIDGET_CONFIG_UPDATE():
                this.refreshConfig();
                break;
        }
    }

    selectVis = (event) => {
        event.preventDefault();
        var buttonId=parseInt(event.target.id);
        if (this.state.activeVis != buttonId) {
            this.setState({activeVis:buttonId});
        }
    }

    newIntervalCallback = (interval) => {
        var now=new Date().getTime()/1000;
        var live = this.state.live;
        if (interval.its == interval.ets) {
            interval.its=interval.ets-3600;
        }
        if (Math.abs(this.state.interval.ets-interval.ets)>1) {
            if (interval.ets < now-30) {
                var live = false;
            } else {
                var live = true;
            }
        }
        if (interval.ets > now) {
            interval.ets = now;
        }
        var dpProm = Object.keys(this.state.config).map( pid => {
            console.log('El pid',pid);
            return getDatapointData({pid:pid, interval:interval});
        });
        Promise.all(dpProm).then( values => {
            var data = {};
            values.forEach(value => data[value.pid]=value.data);
            this.setState({interval:interval, data:data, live:live});
        });
    }

    snapshotIntervalCallback = (interval) => {
        var now=new Date().getTime()/1000;
        if (interval.hasOwnProperty('its') && interval.hasOwnProperty('ets')) {
            if (interval.its == interval.ets) {
                interval.its=interval.ets-3600;
            }
            if (interval.ets > now) {
                interval.ets = now;
            }
            this.setState({snapshotInterval:interval});
        }
    }

    downloadContent = () => {
        if (Object.keys(this.state.config).length != 0) {
            var x={};
            var x_final=[];
            var y_final=[];
            for (var prop in this.state.config) {
                var y={};
                if (prop in this.state.data) {
                    for (var i=0;i<this.state.data[prop].length;i++) {
                        x[this.state.data[prop][i].ts]=0;
                        y[this.state.data[prop][i].ts]=this.state.data[prop][i].value;
                    }
                    y_final.push(y);
                }
            }
            for (var prop in x) {
                x_final.push(prop);
            }
            x_final.sort( (a,b) => a-b);
            if (x_final.length>0) {
                var csv="date";
                for (var prop in this.state.config) {
                    csv+=","+this.state.config[prop].datapointname;
                }
                csv+="\n";
                for (var i=0;i<x_final.length;i++) {
                    var line=new Date(x_final[i]*1000).toISOString();
                    for (var j=0;j<y_final.length;j++) {
                        var value=( x_final[i] in y_final[j]) ? y_final[j][x_final[i]] : null;
                        line+=value != null ? ","+value : ",";
                    }
                    csv+=line+"\n";
                }
                utils.downloadFile(this.state.widgetname+'.csv',csv,'text/csv');
            } else {
                this.props.barMessageCallback({message:{type:'info',message:'No data in selected interval'},messageTime:(new Date).getTime()});
            }
        } else {
            this.props.barMessageCallback({message:{type:'danger',message:'No datapoints in graph'},messageTime:(new Date).getTime()});
        }
    }

    async refreshConfig () {
        var shouldUpdate = false;
        var data = this.state.data;
        var newConfig = {};
        var interval = this.state.interval;
        var newSubscriptions = [];
        var wgConfig = await getWidgetConfig(this.props.wid);

        var newPids = wgConfig.datapoints.sort((a,b) => a-b);
        var dpProm = newPids.map( pid => getDatapointConfig(pid));

        var oldPids = Object.keys(this.state.config).sort( (a,b) => a-b);
        var deletedPids = oldPids.filter( pid => newPids.indexOf(pid) < 0);
        var addedPids = newPids.filter( pid => oldPids.indexOf(pid) < 0);
        if (deletedPids.length > 0) {
            shouldUpdate = true;
            deletedPids.forEach( pid => {
                delete data[pid];
                var pidTopics = [topics.DATAPOINT_DATA_UPDATE(pid),topics.DATAPOINT_CONFIG_UPDATE(pid)];
                this.subscriptionTokens.map( d => {
                    if (pidTopics.includes(d.msg)) {
                        PubSub.unsubscribe(d.token);
                    }
                });
            });
        }
        if (addedPids.length > 0) {
            shouldUpdate = true;
            addedPids.forEach( pid => {
                if (interval.ets == null) {
                    dpProm.push(getDatapointData({pid:pid}));
                } else {
                    dpProm.push(getDatapointData({pid:pid, interval:this.state.interval}));
                }
                var confTopic = this.subscriptionTokens.some( d => {
                    return d.msg == topics.DATAPOINT_CONFIG_UPDATE(pid);
                });
                var dataTopic = this.subscriptionTokens.some( d => {
                    return d.msg == topics.DATAPOINT_CONFIG_UPDATE(pid);
                });
                if (!confTopic) {
                    newSubscriptions.push(topics.DATAPOINT_CONFIG_UPDATE(pid));
                }
                if (!dataTopic) {
                    newSubscriptions.push(topics.DATAPOINT_DATA_UPDATE(pid));
                }
            });
        }

        Promise.all(dpProm).then( values => {
            if (shouldUpdate) {
                var etss = [];
                var itss = [];
                values.forEach( value => {
                    if (value.hasOwnProperty('data')) {
                        data[value.pid]=value.data;
                        if (interval.ets == null) {
                            var dpTs = value.data.map(d => d.ts);
                            etss.push(Math.max.apply(null, dpTs));
                            itss.push(Math.min.apply(null, dpTs));
                        }
                    } else {
                        newConfig[value.pid]=value;
                    }
                });

                if (etss.length > 0) {
                    interval.ets = Math.max.apply(null, etss);
                    var sumItss = itss.reduce((a, b) => a + b, 0);
                    interval.its = sumItss/itss.length;
                } else if (newPids.length == 0) {
                    interval.ets = null;
                    interval.its = null;
                }

                newSubscriptions.forEach(topic => {
                    this.subscriptionTokens.push({
                        token:PubSub.subscribe(topic,this.subscriptionHandler),
                        msg:topic
                    });
                });

                this.setState({config:newConfig, data:data, interval:interval});
            } else {
                shouldUpdate = values.some( value => {
                    if (value.datapointname != this.state.config[value.pid].datapointname) {
                        return true;
                    } else if ( value.color != this.state.config[value.pid].color) {
                        return true;
                    }
                });
                if (shouldUpdate) {
                    values.map ( value => {
                        newConfig[value.pid]=value;
                    });
                    this.setState({config:newConfig});
                }
            }
        });
    }

    async refreshData (interval, pid) {
        var shouldUpdate = false;
        if ((this.state.live && interval.ets > this.state.interval.ets) ||
            (this.state.interval.ets >= interval.ets && this.state.interval.its <= interval.ets) ||
            (this.state.interval.its <= interval.its && this.state.interval.ets >= interval.its)) {
            var newData = await getDatapointData({pid:pid, interval:interval});
            //for new or different samples
            shouldUpdate = newData.data.some( d => {
                var haveIt = this.state.data[pid].some ( e => e.ts == d.ts && e.value == d.value);
                return !haveIt;
            });
            //for deleted samples
            if (!shouldUpdate) {
                var intervalData = this.state.data[pid].filter( d => d.ts >= interval.its && d.ts <= interval.ets);
                if (intervalData.length != newData.data.length) {
                    shouldUpdate = true;
                }
            }
        }
        if (shouldUpdate) {
            var data = {};
            var newInt;
            var intervalLength = this.state.interval.ets - this.state.interval.its;
            var newTs = newData.data.map(d => d.ts);
            var ets = Math.max.apply(null, newTs);
            if (ets > this.state.interval.ets) {
                newInt = {ets:ets,its:ets-intervalLength};
                Object.keys(this.state.data).forEach ( other_pid => {
                    if (other_pid != pid) {
                        data[other_pid] = this.state.data[other_pid].filter( d => {
                            return d.ts <= newInt.ets && d.ts >= newInt.its;
                        });
                    }
                });
            } else {
                newInt = this.state.interval;
                Object.keys(this.state.data).forEach ( other_pid => {
                    if (other_pid != pid) {
                        data[other_pid] = this.state.data[other_pid];
                    }
                });
            }
            newData = await getDatapointData({pid:pid, interval:newInt, onlyMissing:true});
            data[pid]=newData.data;
            this.setState({data: data, interval:newInt});
        }
    }

    getDataSummary () {
        var pids = Object.keys(this.state.config);
        var dpNames = pids.map(pid => this.state.config[pid].datapointname);
        var summaryNames = utils.literalShortener(dpNames);
        var summary = pids.map( (pid,i) => {
            var color = this.state.config[pid].color;
            var datapointname = summaryNames[this.state.config[pid].datapointname];
            datapointname = datapointname.slice(-20);
            if (datapointname.length == 20) {
                datapointname = "..."+datapointname;
            }
            var data = this.state.data[pid];
            var numSamples = data.length;
            var summary = {};
            if (numSamples>0) {
                var allValues = data.map( d => d.value);
                var maxValue=Math.max.apply(null, allValues);
                var minValue=Math.min.apply(null, allValues);
                var sumValues = allValues.reduce((a, b) => a + b, 0);
                var meanValue=sumValues/numSamples;
                if ((maxValue % 1) != 0 || (minValue % 1) != 0) {
                    if (typeof maxValue % 1 == 'number' && maxValue % 1 != 0) {
                        var numDecimalsMaxValue=maxValue.toString().split('.')[1].length;
                    } else {
                        var numDecimalsMaxValue=2;
                    }
                    if (typeof minValue % 1 == 'number' && minValue % 1 != 0) {
                        var numDecimalsMinValue=minValue.toString().split('.')[1].length;
                    } else {
                        var numDecimalsMinValue=2;
                    }
                    var numDecimals=Math.max(numDecimalsMaxValue,numDecimalsMinValue);
                } else {
                    var numDecimals=2;
                }
                meanValue = meanValue.toFixed(numDecimals);
                summary.max = d3.format(',')(maxValue);
                summary.min = d3.format(',')(minValue);
                summary.mean = d3.format(',')(meanValue);
            } else {
                summary.max = '-';
                summary.min = '-';
                summary.mean = '-';
            }
            return (
              <tr key={i}>
                <td>
                  <span style={{backgroundColor:color,borderRadius:"2px"}}>&nbsp;&nbsp;&nbsp;&nbsp;</span>
                  <span> {datapointname}</span>
                </td>
                <td>{summary.max}</td>
                <td>{summary.min}</td>
                <td>{summary.mean}</td>
              </tr>
            );
        });
        return (
          <table className="table-condensed">
            <tbody>
              <tr>
                <th></th>
                <th>max</th>
                <th>min</th>
                <th>mean</th>
              </tr>
              {summary}
            </tbody>
          </table>
        );
    }

    onDrop = (e) => {
        var id=e.dataTransfer.getData('id');
        if (id.length==32){
            var data={wid:this.props.wid, 'new_datapoints':[id]};
            PubSub.publish(topics.MODIFY_WIDGET,data);
        }
    }

    onDragEnter (e) {
        e.preventDefault();
    }

    onDragOver (e) {
        e.preventDefault();
        return false;
    }

    cancelSnapshot = () => {
        this.setState({shareModal:false, live: this.state.livePrevious});
    }

    shareSnapshot = () => {
        var user_list=this.users.value.split(/[\s]+/);
        PubSub.publish(topics.NEW_WIDGET_MP_SNAPSHOT,{interval:this.state.snapshotInterval,user_list:user_list,wid:this.props.wid});
        this.setState({shareModal:false, live: this.state.livePrevious});
    }

    render () {
        if (this.state.loading) {
            return (
              <div style={styles.banner}>
                Loading...
              </div>
            );
        }
        if (Object.keys(this.state.config).length == 0) {
            return (
              <div style={styles.banner} onDrop={this.onDrop} onDragEnter={this.onDragEnter} onDragOver={this.onDragOver}>
                Add datapoints by dragging them from your data model
                <br/>
                <ReactBootstrap.Glyphicon style={{fontSize:"48px"}} glyph="hand-left" />
              </div>
            );
        }
        var data=Object.keys(this.state.config).map( pid => {
            return {
                pid:pid,
                color:this.state.config[pid].color,
                datapointname:this.state.config[pid].datapointname,
                data:this.state.data[pid]
            };
        });
        var share_modal= (
          <ReactBootstrap.Modal show={this.state.shareModal} onHide={this.cancelSnapshot}>
            <ReactBootstrap.Modal.Header closeButton={true}>
              <ReactBootstrap.Modal.Title>Share snapshot</ReactBootstrap.Modal.Title>
            </ReactBootstrap.Modal.Header>
            <ReactBootstrap.Modal.Body>
              <ReactBootstrap.FormControl inputRef={(input) => { this.users = input; }} type="textarea" label="Select Users" placeholder="type users separated by space" />
            </ReactBootstrap.Modal.Body>
            <ReactBootstrap.Modal.Footer>
              <ReactBootstrap.Button bsStyle="default" onClick={this.cancelSnapshot}>Cancel</ReactBootstrap.Button>
              <ReactBootstrap.Button bsStyle="primary" onClick={this.shareSnapshot}>Share</ReactBootstrap.Button>
            </ReactBootstrap.Modal.Footer>
          </ReactBootstrap.Modal>
        );
        if (this.state.activeVis == 0) {
            var summary = this.getDataSummary();
            var visContent = <ContentLinegraph interval={this.state.interval} data={data} newIntervalCallback={this.newIntervalCallback} />;
        } else if (this.state.activeVis == 1) {
            var summary = this.getDataSummary();
            var visContent = <ContentHistogram data={data} />;
        } else if (this.state.activeVis == 2) {
            var summary = null;
            var visContent = <ContentTable data={data} />;
        } else {
            var summary = null;
            var visContent = null;
        }
        return (
          <div onDrop={this.onDrop} onDragEnter={this.onDragEnter} onDragOver={this.onDragOver}>
            <div className="dp-stats">
              {summary}
            </div>
            <div className="row visual-bar">
              <div className="col-sm-5 text-center">
                <ReactBootstrap.ButtonGroup bsSize="xsmall">
                  <ReactBootstrap.Button id="0" active={this.state.activeVis == 0 ? true : false} onClick={this.selectVis}>chart</ReactBootstrap.Button>
                  <ReactBootstrap.Button id="1" active={this.state.activeVis == 1 ? true : false} onClick={this.selectVis}>histogram</ReactBootstrap.Button>
                  <ReactBootstrap.Button id="2" active={this.state.activeVis == 2 ? true : false} onClick={this.selectVis}>table</ReactBootstrap.Button>
                </ReactBootstrap.ButtonGroup>
              </div>
              <div className="col-sm-7">
                <TimeSlider interval={this.state.interval} newIntervalCallback={this.newIntervalCallback} />
              </div>
            </div>
            <div className="row">
              <div className="col-sm-12">{visContent}</div>
            </div>
            <div>{share_modal}</div>
          </div>
        );
    }
}

class TimeSlider extends React.Component {
    notifyNewInterval = (interval) => {
        this.props.newIntervalCallback(interval);
    }

    componentDidMount () {
        var el = ReactDOM.findDOMNode(this);
        d3TimeSlider.create(el, this.props.interval, this.notifyNewInterval);
    }

    componentDidUpdate () {
        var el = ReactDOM.findDOMNode(this);
        d3TimeSlider.update(el, this.props.interval, this.notifyNewInterval);
    }

    render () {
        return <div />
    }
}

class ContentLinegraph extends React.Component {
    state = {
        zoomInterval: {its:0,ets:0},
        anomalies: [],
        anomPid: null,
    };

    subscriptionTokens = [];

    async initialization () {
        if (this.props.data.length == 1) {
            var anomUri = this.props.data[0].datapointname+'._anomaly';
            var anomDp = await getNodeInfoByUri(anomUri)
            if (anomDp && anomDp.hasOwnProperty('id') && anomDp.hasOwnProperty('type') && anomDp.type == 'p') {
                var subscribedTopics = [
                    topics.DATAPOINT_DATA_UPDATE(anomDp.id)
                ];
                this.subscriptionTokens = subscribedTopics.map( topic => {
                    return {
                        token:PubSub.subscribe(topic,this.subscriptionHandler),
                        msg:topic
                    }
                });
                var anomData = await getDatapointData({pid:anomDp.id, interval:this.props.interval, onlyMissing:true});
                var anomalies = this.getAnomalies(anomData.data);
                this.setState({anomPid:anomDp.id, anomalies:anomalies});
            }
        }
    }

    notifyNewInterval = (interval) => {
        this.setState({zoomInterval:interval});
        this.props.newIntervalCallback(interval);
    }

    shouldComponentUpdate (nextProps, nextState) {
        if (nextState.zoomInterval.ets != this.state.zoomInterval.ets) {
            //no actualizo otra vez porque es por un nuevo zoom
            return false;
        } else if (nextProps.interval.ets == this.state.zoomInterval.ets && nextProps.interval.its == this.state.zoomInterval.its ) {
            //no actualizo otra vez porque es el update provocado por el zoom
            return false;
        } else {
            return true;
        }
    }

    componentDidMount () {
        var el = ReactDOM.findDOMNode(this);
        d3Linegraph.create(el, this.props.data, this.props.interval, this.notifyNewInterval, {anomalies:this.state.anomalies});
        this.initialization();
    }

    componentWillUnmount () {
        this.subscriptionTokens.forEach( d => {
            PubSub.unsubscribe(d.token);
        });
    }

    componentDidUpdate () {
        var el = ReactDOM.findDOMNode(this);
        d3Linegraph.update(el, this.props.data, this.props.interval, this.notifyNewInterval, {anomalies:this.state.anomalies});
    }

    subscriptionHandler = (msg,data) => {
        var msgType = msg.split('-')[0];
        switch (msgType) {
            case topics.DATAPOINT_DATA_UPDATE():
                this.refreshAnomalies(data.interval);
                break;
        }
    }

    getAnomalies (data) {
        var active = false;
        var anomalies = [];
        var interval = [null,null];
        data.forEach( d => {
            if (active == false && d.value > 0) {
                active = true;
                interval[0]=d.ts;
            } else if (active == true && d.value == 0) {
                active = false;
                interval[1]=d.ts;
                anomalies.push(interval);
                interval = [null,null];
            }
        });
        if (active) {
            interval[1]=data[data.length-1].ts;
            anomalies.push(interval);
        }
        return anomalies;
    }

    async refreshAnomalies (interval) {
        if (interval.its >= this.props.interval.its && interval.ets <= this.props.interval.ets) {
            var newData = await getDatapointData({pid:this.state.anomPid, interval:this.props.interval, onlyMissing: true});
            var anomalies = this.getAnomalies(newData.data);
            var shouldUpdate = false;
            if (anomalies.length != this.state.anomalies.length ) {
                shouldUpdate = true;
            } else {
                for (var i=0,j=anomalies.length; i<j; i++) {
                    if (anomalies[i][0] != this.state.anomalies[i][0] || anomalies[i][1] != this.state.anomalies[i][1]) {
                        shouldUpdate = true;
                        break;
                    }
                }
            }
            if (shouldUpdate) {
                this.setState({anomalies:anomalies});
            }
        }
    }

    render () {
        return <div />;
    }
}

class ContentHistogram extends React.Component {
    componentDidMount () {
        var el = ReactDOM.findDOMNode(this);
        d3Histogram.create(el, this.props.data);
    }

    componentDidUpdate () {
        var el = ReactDOM.findDOMNode(this);
        d3Histogram.update(el, this.props.data);
    }

    render () {
        return <div />;
    }
}

class ContentTable extends React.Component {
    componentDidMount () {
        var el = ReactDOM.findDOMNode(this);
        d3Table.create(el, this.props.data);
    }

    componentDidUpdate () {
        var el = ReactDOM.findDOMNode(this);
        d3Table.update(el, this.props.data);
    }

    render () {
        return <div className="datapoint-table" />;
    }
}

class WidgetDsVariable extends React.Component {
    state = {
        datapoints: this.props.datapoints,
    };

    identifyVariable = () => {
        var datapointname=this.datapointname.value;
        if (datapointname.length>1){
            this.popover.hide();
            this.props.identifyVariableCallback({position:this.props.position, length:this.props.length, datapointname:datapointname, seq:this.props.seq});
        }
    }

    componentWillReceiveProps (nextProps) {
        if (this.popover.state.show == true && this.props.seq != nextProps.seq) {
            this.popover.hide();
        }
    }

    render () {
        var popover = (
          <ReactBootstrap.Popover id="datapoint" title="Identify Datapoint">
            <ReactBootstrap.FormGroup>
              <ReactBootstrap.InputGroup>
                <ReactBootstrap.FormControl inputRef={(datapointname) => {this.datapointname = datapointname; }} type="text" placeholder="Datapoint name" />
                <ReactBootstrap.InputGroup.Button>
                  <ReactBootstrap.Button onClick={this.identifyVariable}>Ok</ReactBootstrap.Button>
                </ReactBootstrap.InputGroup.Button>
              </ReactBootstrap.InputGroup>
            </ReactBootstrap.FormGroup>
          </ReactBootstrap.Popover>
        );
        return (
          <ReactBootstrap.OverlayTrigger ref={ (popover) => {this.popover = popover; }} trigger="click" rootClose={true} placement="right" overlay={popover}>
            <span className="variable">{this.props.content}</span>
          </ReactBootstrap.OverlayTrigger>
        );
    }
}

const CustomPopover = React.createClass({
  render() {
    return (
      <div
        style={{
          ...this.props.style,
          position: 'absolute',
          backgroundColor: '#EEE',
          boxShadow: '0 5px 10px rgba(0, 0, 0, 0.2)',
          border: '1px solid #CCC',
          borderRadius: 3,
          marginLeft: -5,
          marginTop: 5,
          padding: 10,
          zIndex: 1060,
        }}
      >
        <strong>Holy guacamole!</strong> Check this info.
      </div>
    );
  },
});

export {
    Widget,
    TimeSlider,
    ContentLinegraph,
    ContentHistogram,
    ContentTable
}

