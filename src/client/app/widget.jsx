import React from 'react';
import ReactDOM from 'react-dom';
import PubSub from 'pubsub-js';
import * as ReactBootstrap from 'react-bootstrap';
import * as d3 from 'd3';
import * as utils from './utils.js';
import {widgetStore} from './widget-store.js';
import {datasourceStore} from './datasource-store.js';
import {datapointStore,getDataSummary, getIntervalData} from './datapoint-store.js';
import {d3TimeSlider, d3Linegraph, d3Histogram} from './graphs.jsx';

class Widget extends React.Component {
    state = {
        conf:{},
        shareCounter: 0,
        downloadCounter: 0,
        showConfig: false,
    };

    subscriptionTokens = {};

    constructor (props) {
        super(props);
        this.subscriptionTokens[props.wid]=[]
        this.subscriptionTokens[props.wid].push({token:PubSub.subscribe('widgetConfigUpdate-'+props.wid, this.subscriptionHandler),msg:'widgetConfigUpdate-'+props.wid});
    }

    subscriptionHandler = (msg,data) => {
        switch (msg) {
            case 'widgetConfigUpdate-'+this.props.wid:
                this.refreshConfig()
                break;
        }
    }

    componentDidMount () {
        PubSub.publish('widgetConfigReq',{wid:this.props.wid});
    }

    componentWillUnmount () {
        this.subscriptionTokens[this.props.wid].map( d => {
            PubSub.unsubscribe(d.token);
        });
        delete this.subscriptionTokens[this.props.wid];
    }

    configCallback = () => {
        if (this.state.showConfig == false) {
            PubSub.publish('widgetConfigReq',{wid:this.props.wid});
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

    barMessage (data) {
        PubSub.publish('barMessage',{message:data.message,messageTime:data.messageTime});
    }

    refreshConfig () {
        if (widgetStore._widgetConfig.hasOwnProperty(this.props.wid)) {
            var widgetConfig=widgetStore._widgetConfig[this.props.wid];
            var shouldUpdate=false;
            Object.keys(widgetConfig).forEach( key => {
                if (!(this.state.conf.hasOwnProperty(key) && this.state.conf[key]==widgetConfig[key])) {
                    shouldUpdate=true;
                }
            });
            if (shouldUpdate) {
                this.setState({conf:widgetConfig});
            }
        }
    }

    getWidgetContentEl () {
        if (Object.keys(this.state.conf).length === 0) {
            return null;
        } else {
            switch (this.state.conf.type) {
                case 'ds':
                    return <WidgetDs wid={this.props.wid} shareCounter={this.state.shareCounter} downloadCounter={this.state.downloadCounter} />
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
        if (Object.keys(this.state.conf).length === 0) {
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
        if (Object.keys(this.state.conf).length === 0) {
            var widget=(
              <div>
                <WidgetBar bid={this.props.bid} wid={this.props.wid} conf={this.state.conf} closeCallback={this.closeCallback} />
              </div>
            );
        } else {
            var widget=(
              <div>
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
            padding: '5px',
            color: 'yellow',
            textShadow: '-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black',
        },
        righticonstyle: {
            textShadow: '1px 1px 5px 1px #ccc',
            align: 'right',
            float: 'right',
            height: '20px',
            padding: '5px',
        },
        lefticonstyle: {
            textShadow: '1px 1px 5px 1px #ccc',
            align: 'left',
            float: 'left',
            height: '20px',
            padding: '5px',
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
            PubSub.publish('modifyDashboard',{bid:this.props.bid,delete_widgets:[this.props.wid]});
            this.setState({isPinned:false});
        } else {
            PubSub.publish('modifyDashboard',{bid:this.props.bid,new_widgets:[this.props.wid]});
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
        if (this.props.configOpen) {
            var configIcon=<span className="SlideBarIcon glyphicon glyphicon-chevron-down" style={this.styles.lefticonstyle} onClick={this.configClick} />
        } else {
            var configIcon=<span className="SlideBarIcon glyphicon glyphicon-chevron-right" style={this.styles.lefticonstyle} onClick={this.configClick} />
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
        did: null,
        datasourcename: '',
        deleteModal: false,
    };

    subscriptionTokens = {};

    constructor (props) {
        super(props);
        this.subscriptionTokens['cfg-'+props.wid]=[];
        this.subscriptionTokens['cfg-'+props.wid].push({token:PubSub.subscribe('widgetConfigUpdate-'+props.wid, this.subscriptionHandler),msg:'widgetConfigUpdate-'+props.wid});
    }

    subscriptionHandler = (msg,data) => {
        var msgType = msg.split('-')[0];
        switch (msgType) {
            case 'datasourceConfigUpdate':
                this.refreshConfig();
                break;
            case 'widgetConfigUpdate':
                this.refreshConfig();
                break;
        }
    }

    componentDidMount () {
        this.refreshConfig();
    }

    componentWillUnmount = () => {
        this.subscriptionTokens['cfg-'+this.props.wid].map( d => {
            PubSub.unsubscribe(d.token);
        });
        delete this.subscriptionTokens['cfg-'+this.props.wid];
    }

    refreshConfig () {
        if (!this.state.did) {
            if (widgetStore._widgetConfig.hasOwnProperty(this.props.wid)) {
                var widgetConfig = widgetStore._widgetConfig[this.props.wid];
                var did = widgetConfig.did;
                var tokens = this.subscriptionTokens['cfg-'+this.props.wid];
                var configTokenFound = false;
                for (var i=0; i<tokens.length;i++) {
                    if (tokens[i].msg == 'datasourceConfigUpdate-'+did) {
                        configTokenFound = true;
                        break;
                    }
                }
                if (!configTokenFound) {
                    tokens.push({token:PubSub.subscribe('datasourceConfigUpdate-'+did, this.subscriptionHandler),msg:'datasourceConfigUpdate-'+did});
                }
                if (!datasourceStore._datasourceConfig.hasOwnProperty(did)) {
                    PubSub.publish('datasourceConfigReq',{did:did});
                }
                this.setState({did:did});
            } else {
                PubSub.publish('widgetConfigReq',{wid:this.props.wid});
            }
        } else if (datasourceStore._datasourceConfig.hasOwnProperty(this.state.did)) {
            var datasourceConfig=datasourceStore._datasourceConfig[this.state.did];
            if (this.state.datasourcename != datasourceConfig.datasourcename) {
                this.setState({datasourcename:datasourceConfig.datasourcename});
            }
        } else {
            PubSub.publish('datasourceConfigReq',{did:this.state.did});
        }
    }

    deleteWidget = () => {
        this.setState({deleteModal: true});
    }

    cancelDelete = () => {
        this.setState({deleteModal: false});
    }

    confirmDelete = () => {
        PubSub.publish('deleteDatasource',{did:this.props.did});
        this.setState({deleteModal: false});
        this.props.closeCallback();
    }

    render () {
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
              <ReactBootstrap.Button bsStyle="primary" onClick={this.confirmDelete}>
                Delete
              </ReactBootstrap.Button>
            </ReactBootstrap.Modal.Footer>
          </ReactBootstrap.Modal>
        );
        return (
          <ReactBootstrap.Collapse in={this.props.showConfig}>
            <div>
              <ReactBootstrap.Well>
                <ReactBootstrap.ListGroup>
                  <ReactBootstrap.ListGroupItem bsSize="xsmall">
                    <strong>Delete Datasource</strong>
                    <div className="text-right">
                      <ReactBootstrap.Button bsSize="small" bsStyle="danger" onClick={this.deleteWidget}>
                        Delete
                      </ReactBootstrap.Button>
                    </div>
                  </ReactBootstrap.ListGroupItem>
                </ReactBootstrap.ListGroup>
              </ReactBootstrap.Well>
              {delete_modal}
            </div>
          </ReactBootstrap.Collapse>
        );
    }
}

class WidgetConfigDp extends React.Component {
    state = {
        pid: null,
        datapointname: null,
        color: null,
        boxColor: null,
        newColor: '',
        deleteModal: false,
        updateDisabled: true,
    };

    subscriptionTokens = {};

    constructor (props) {
        super(props);
        this.subscriptionTokens['cfg-'+props.wid]=[];
        this.subscriptionTokens['cfg-'+props.wid].push({token:PubSub.subscribe('widgetConfigUpdate-'+props.wid, this.subscriptionHandler),msg:'widgetConfigUpdate-'+props.wid});
    }

    subscriptionHandler = (msg,data) => {
        var msgType = msg.split('-')[0];
        switch (msgType) {
            case 'datapointConfigUpdate':
                this.refreshConfig();
                break;
            case 'widgetConfigUpdate':
                this.refreshConfig();
                break;
        }
    }

    componentDidMount () {
        this.refreshConfig();
    }

    componentWillUnmount () {
        this.subscriptionTokens['cfg-'+this.props.wid].map( d => {
            PubSub.unsubscribe(d.token);
        });
        delete this.subscriptionTokens['cfg-'+this.props.wid];
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

    refreshConfig () {
        if (!this.state.pid) {
            if (widgetStore._widgetConfig.hasOwnProperty(this.props.wid)) {
                var widgetConfig = widgetStore._widgetConfig[this.props.wid];
                var pid = widgetConfig.pid;
                var tokens = this.subscriptionTokens['cfg-'+this.props.wid];
                var configTokenFound = false;
                for (var i=0; i<tokens.length;i++) {
                    if (tokens[i].msg == 'datapointConfigUpdate-'+pid) {
                        configTokenFound = true;
                        break;
                    }
                }
                if (!configTokenFound) {
                    tokens.push({token:PubSub.subscribe('datapointConfigUpdate-'+pid, this.subscriptionHandler),msg:'datapointConfigUpdate-'+pid});
                }
                if (!this.state.datapointname) {
                    PubSub.publish('datapointConfigReq',{pid:pid});
                }
                this.setState({pid:pid});
            } else {
                PubSub.publish('widgetConfigReq',{wid:this.props.wid});
            }
        } else if (datapointStore._datapointConfig.hasOwnProperty(this.state.pid)) {
            var datapointConfig=datapointStore._datapointConfig[this.state.pid];
            var shouldUpdate = false;
            if (this.state.datapointname != datapointConfig.datapointname) {
                shouldUpdate = true;
            } else if (this.state.color != datapointConfig.color) {
                shouldUpdate = true;
            }
            if (shouldUpdate) {
                this.setState({datapointname:datapointConfig.datapointname,color:datapointConfig.color,boxColor:datapointConfig.color});
            }
        } else {
            PubSub.publish('datapointConfigReq',{pid:this.state.pid});
        }
    }

    updateConfig = () => {
        var color=this.state.newColor.toUpperCase();
        if (color != this.state.color && /^#[0-9A-F]{6}$/i.test(color)) {
            PubSub.publish('modifyDatapoint',{pid:this.state.pid,color:color});
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
        PubSub.publish('deleteDatapoint',{pid:this.state.pid});
        this.setState({deleteModal: false});
        this.props.closeCallback();
    }

    render () {
        if (!this.state.datapointname) {
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
              <ReactBootstrap.Button bsStyle="primary" onClick={this.confirmDelete}>
                Delete
              </ReactBootstrap.Button>
            </ReactBootstrap.Modal.Footer>
          </ReactBootstrap.Modal>
        );
        var boxColor=<ReactBootstrap.Glyphicon glyph="unchecked" style={{backgroundColor:this.state.boxColor, color:this.state.boxColor}} />
        return (
          <ReactBootstrap.Collapse in={this.props.showConfig}>
            <div>
              <ReactBootstrap.Well>
                <ReactBootstrap.ListGroup>
                  <ReactBootstrap.ListGroupItem bsSize="small">
                    <ReactBootstrap.Table condensed={true} responsive={true}>
                      <tbody>
                        <tr>
                          <td>
                            <strong>Color</strong>
                          </td>
                          <td className="text-right">
                            <ReactBootstrap.Form inline>
                              <ReactBootstrap.FormGroup>
                                <ReactBootstrap.InputGroup>
                                  <ReactBootstrap.FormControl placeholder={this.state.color} value={this.state.newColor} bsSize="xsmall" type="text" onChange={this.handleChange} />
                                  <ReactBootstrap.InputGroup.Addon>{boxColor}</ReactBootstrap.InputGroup.Addon>
                                </ReactBootstrap.InputGroup>
                              </ReactBootstrap.FormGroup>
                            </ReactBootstrap.Form>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan="2" className="text-right">
                            <ReactBootstrap.Button bsSize="small" bsStyle="primary" onClick={this.updateConfig} disabled={this.state.updateDisabled}>
                              Update
                            </ReactBootstrap.Button>
                          </td>
                        </tr>
                      </tbody>
                    </ReactBootstrap.Table>
                  </ReactBootstrap.ListGroupItem>
                  <ReactBootstrap.ListGroupItem bsSize="xsmall">
                    <strong>Delete Datapoint</strong>
                    <div className="text-right">
                      <ReactBootstrap.Button bsSize="small" bsStyle="danger" onClick={this.deleteWidget}>
                        Delete
                      </ReactBootstrap.Button>
                    </div>
                  </ReactBootstrap.ListGroupItem>
                </ReactBootstrap.ListGroup>
              </ReactBootstrap.Well>
              {delete_modal}
            </div>
          </ReactBootstrap.Collapse>
        );
    }
}

class WidgetConfigMp extends React.Component {
    state = {
        deleteModal: false,
        datapoints: [],
        widgetname: '',
        newWidgetname: '',
    };

    subscriptionTokens = {};

    constructor (props) {
        super(props);
        this.subscriptionTokens['cfg-'+props.wid]=[];
        this.subscriptionTokens['cfg-'+props.wid].push({token:PubSub.subscribe('widgetConfigUpdate-'+props.wid, this.subscriptionHandler),msg:'widgetConfigUpdate-'+props.wid});
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

    componentWillMount () {
        console.log('me voy a montar');
        this.refreshConfig();
    }

    componentWillUnmount () {
        this.subscriptionTokens['cfg-'+this.props.wid].map( d => {
            PubSub.unsubscribe(d.token);
        });
        delete this.subscriptionTokens['cfg-'+this.props.wid];
    }

    refreshConfig () {
        if (widgetStore._widgetConfig.hasOwnProperty(this.props.wid)) {
            var widgetConfig=widgetStore._widgetConfig[this.props.wid];
            var datapoints=[];
            var tokens = this.subscriptionTokens['cfg-'+this.props.wid];
            for (var i=0;i<widgetConfig.datapoints.length;i++) {
                var found = false;
                var pid = widgetConfig.datapoints[i];
                for (var j=0; j<tokens.length;j++) {
                    if (tokens[j].msg == 'datapointConfigUpdate-'+pid) {
                        found = true;
                    }
                }
                if (!found) {
                    tokens.push({token:PubSub.subscribe('datapointConfigUpdate-'+pid, this.subscriptionHandler),msg:'datapointConfigUpdate-'+pid});
                }
                if (datapointStore._datapointConfig.hasOwnProperty(pid)) {
                    var datapoint=datapointStore._datapointConfig[pid];
                    datapoints.push({pid:pid,color:datapoint.color,datapointname:datapoint.datapointname,lineThrough:false});
                } else {
                    PubSub.publish('datapointConfigReq',{pid:pid});
                }
            }
            var widgetname = widgetConfig.widgetname;
            this.setState({datapoints:datapoints, widgetname:widgetname});
        }
    }

    updateConfig = () => {
        var data={wid:this.props.wid};
        var new_widgetname=this.state.newWidgetname;
        if (new_widgetname.length>0 && new_widgetname!=this.state.widgetname) {
            data.new_widgetname=new_widgetname;
        }
        for (var i=0;i<this.state.datapoints.length;i++) {
            var deleteDatapoints=[];
            if (this.state.datapoints[i].lineThrough) {
                deleteDatapoints.push(this.state.datapoints[i].pid);
            }
            if (deleteDatapoints.length>0) {
                data.delete_datapoints=deleteDatapoints;
            }
        }
        if (Object.keys(data).length>1) {
            PubSub.publish('modifyWidget',data);
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
        PubSub.publish('deleteWidget',{wid:this.props.wid});
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
            var name = el.datapointname.slice(-60);
            if (name.length == 60) {
                name = "..."+name;
            }
            return (
              <tr key={el.pid} style={{cursor:"pointer"}} onClick={this.markDatapoint.bind(null, el.pid)}>
                <td>
                  <ReactBootstrap.Glyphicon glyph={glyph} />
                </td>
                <td style={style}>
                  <span style={{backgroundColor:el.color,borderRadius:"2px"}}>&nbsp;&nbsp;&nbsp;&nbsp;</span>
                  <span> {name}</span>
                </td>
              </tr>
            );
        });
        return (
          <ReactBootstrap.Table>
            <tbody>
              {list}
            </tbody>
          </ReactBootstrap.Table>
        );
    }

    render () {
        if (this.state.widgetname == '') {
            return null;
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
              <ReactBootstrap.Button bsStyle="primary" onClick={this.confirmDelete}>Delete</ReactBootstrap.Button>
            </ReactBootstrap.Modal.Footer>
          </ReactBootstrap.Modal>
        );
        var datapointList=this.renderDatapointList();
        return (
          <ReactBootstrap.Collapse in={this.props.showConfig}>
            <div>
              <ReactBootstrap.Well>
                <ReactBootstrap.ListGroup>
                  <ReactBootstrap.ListGroupItem bsSize="small">
                    <ReactBootstrap.Table condensed={true} responsive={true}>
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
                            <ReactBootstrap.Button bsSize="small" bsStyle="primary" onClick={this.updateConfig}>Update</ReactBootstrap.Button>
                          </td>
                        </tr>
                      </tbody>
                    </ReactBootstrap.Table>
                  </ReactBootstrap.ListGroupItem>
                  <ReactBootstrap.ListGroupItem bsSize="xsmall">
                    <strong>Delete Graph</strong>
                    <div className="text-right">
                      <ReactBootstrap.Button bsSize="small" bsStyle="danger" onClick={this.deleteWidget}>Delete</ReactBootstrap.Button>
                    </div>
                  </ReactBootstrap.ListGroupItem>
                </ReactBootstrap.ListGroup>
              </ReactBootstrap.Well>
              {delete_modal}
            </div>
          </ReactBootstrap.Collapse>
        );
    }
}

class WidgetDs extends React.Component {
    state = {
        did: null,
        contentWidth: null,
        dsData: null,
        datasourcename: '',
        timestamp:0,
        seq: null,
        snapshotTimestamp:0,
        snapshotSeq: null,
        shareModal:false,
        shareCounter:this.props.shareCounter,
        downloadCounter:this.props.downloadCounter,
    };

    subscriptionTokens = {};

    constructor (props) {
        super(props);
        this.subscriptionTokens[props.wid]=[];
        this.subscriptionTokens[props.wid].push({token:PubSub.subscribe('widgetConfigUpdate-'+this.props.wid, this.subscriptionHandler),msg:'widgetConfigUpdate-'+this.props.wid});
    }

    onClickDatapoint (pid,e) {
        e.preventDefault();
        PubSub.publish('loadSlide',{pid:pid});
    }

    onDragStartDatapoint (pid,e) {
        e.stopPropagation();
        e.dataTransfer.setData('id',pid);
    }

    subscriptionHandler = (msg,data) => {
        var msgType = msg.split('-')[0];
        switch (msgType) {
            case 'datasourceDataUpdate':
                this.refreshData();
                break;
            case 'datapointConfigUpdate':
                this.refreshData();
                break;
            case 'datasourceConfigUpdate':
                this.refreshConfig();
                break;
            case 'widgetConfigUpdate':
                this.refreshConfig();
                break;
        }
    }

    componentDidMount () {
        if (this.state.contentWidth == null) {
            var contentWidth = ReactDOM.findDOMNode(this).clientWidth;
            this.setState({contentWidth:contentWidth});
        }
        this.refreshConfig();
    }

    componentWillUnmount () {
        this.subscriptionTokens[this.props.wid].map( d => {
            PubSub.unsubscribe(d.token);
        });
        delete this.subscriptionTokens[this.props.wid];
    }

    componentWillReceiveProps (nextProps) {
        if (nextProps.shareCounter>this.state.shareCounter) {
            this.setState({shareModal:true,shareCounter:nextProps.shareCounter,snapshotTimestamp:this.state.timestamp,snapshotSeq:this.state.seq});
        } else if (nextProps.downloadCounter>this.state.downloadCounter) {
            this.downloadContent();
            this.setState({downloadCounter:nextProps.downloadCounter});
        }
    }

    downloadContent = () => {
        if (this.state.dsData.content && this.state.dsData.content.length>0) {
            utils.downloadFile(this.state.datasourcename+'.txt',this.state.dsData.content,'text/plain');
        }
    }

    refreshData () {
        if (this.state.did) {
            if (datasourceStore._datasourceData.hasOwnProperty(this.state.did)) {
                var datasourceData=datasourceStore._datasourceData[this.state.did];
                if (datasourceData.hasOwnProperty('datapoints')) {
                    var shouldUpdate = false;
                    for (var i=0;i<datasourceData.datapoints.length;i++) {
                        var pid=datasourceData.datapoints[i].pid;
                        var tokens = this.subscriptionTokens[this.props.wid];
                        var found = false;
                        for (var i=0;i<tokens.length;i++) {
                            if (tokens[i].msg == 'datapointConfigUpdate-'+pid) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            shouldUpdate = true;
                            tokens.push({token:PubSub.subscribe('datapointConfigUpdate-'+pid, this.subscriptionHandler),msg:'datapointConfigUpdate-'+pid});
                        }
                        if (!datapointStore._datapointConfig.hasOwnProperty(pid)) {
                            shouldUpdate = true;
                            PubSub.publish('datapointConfigReq',{pid:pid});
                        }
                    }
                }
                if (!this.state.dsData || (this.state.timestamp < datasourceData.ts)) {
                    this.setState({dsData:datasourceData, timestamp:datasourceData.ts,seq:datasourceData.seq});
                } else if (shouldUpdate && this.state.timestamp <= datasourceData.ts) {
                    this.setState({dsData:datasourceData, timestamp:datasourceData.ts,seq:datasourceData.seq});
                }
            }
        }
    }

    refreshConfig () {
        if (!this.state.did) {
            if (widgetStore._widgetConfig.hasOwnProperty(this.props.wid)) {
                var widgetConfig = widgetStore._widgetConfig[this.props.wid];
                var did = widgetConfig.did;
                var tokens = this.subscriptionTokens[this.props.wid];
                var configTokenFound = false;
                var dataTokenFound = false;
                for (var i=0; i<tokens.length;i++) {
                    if (tokens[i].msg == 'datasourceConfigUpdate-'+did) {
                        configTokenFound = true;
                    } else if (tokens[i].msg == 'datasourceDataUpdate-'+did) {
                        dataTokenFound = true;
                    }
                }
                if (!configTokenFound) {
                    tokens.push({token:PubSub.subscribe('datasourceConfigUpdate-'+did, this.subscriptionHandler),msg:'datasourceConfigUpdate-'+did});
                }
                if (!dataTokenFound) {
                    tokens.push({token:PubSub.subscribe('datasourceDataUpdate-'+did, this.subscriptionHandler),msg:'datasourceDataUpdate-'+did});
                }
                if (!datasourceStore._datasourceConfig.hasOwnProperty(did)) {
                    PubSub.publish('datasourceConfigReq',{did:did});
                }
                if (this.state.dsData == null) {
                    PubSub.publish('datasourceDataReq',{did:did});
                }
                this.setState({did:did});
            } else {
                PubSub.publish('widgetConfigReq',{wid:this.props.wid});
            }
        } else if (datasourceStore._datasourceConfig.hasOwnProperty(this.state.did)) {
            var shouldUpdate=false;
            var datasourceConfig=datasourceStore._datasourceConfig[this.state.did];
            if (this.state.datasourcename != datasourceConfig.datasourcename) {
                shouldUpdate = true;
            }
            if (shouldUpdate) {
                this.setState({datasourcename:datasourceConfig.datasourcename});
            }
        } else {
            PubSub.publish('datasourceConfigReq',{did:this.state.did});
        }
    }

    getDsInfo (timestamp) {
        if (typeof timestamp === 'number') {
            var dateFormat = d3.timeFormat("%Y/%m/%d - %H:%M:%S");
            var date = new Date(timestamp*1000);
            var dateText=dateFormat(date);
            return (
              <div style={{"textAlign":"center"}}>
                <div className="ds-info">
                  {dateText}
                </div>
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

    getFontClass (dsData) {
        if (!dsData || this.state.contentWidth == null) {
            return 'font-normal';
        }
        var newLineRegex=/(?:\r\n|\r|\n)/g;
        var contentWidth = this.state.contentWidth;
        var normalLength = contentWidth / 8;
        var lines = dsData.content.split(newLineRegex);
        var meanLineSize=d3.mean(lines, function (d) {return d.length > 0 ? d.length : normalLength});
        var fontClass = meanLineSize * 10 < contentWidth ? 'font-large' : meanLineSize * 6 > contentWidth ? 'font-small' : 'font-normal';
        return fontClass;
    }

    generateHtmlContent (dsData) {
        var elements=[];
        if (!dsData) {
            return elements;
        }
        var numElement = 0;
        var cursorPosition=0;
        var newLineRegex=/(?:\r\n|\r|\n)/g;
        var datasourcePids=[];
        if (this.state.did && datasourceStore._datasourceConfig.hasOwnProperty(this.state.did)) {
            var datasourceConfig=datasourceStore._datasourceConfig[this.state.did];
            if (datasourceConfig.hasOwnProperty('pids')) {
                for (var i=0;i<datasourceConfig.pids.length;i++) {
                    if (datapointStore._datapointConfig.hasOwnProperty(datasourceConfig.pids[i])) {
                        var datapointname=datapointStore._datapointConfig[datasourceConfig.pids[i]].datapointname;
                        datasourcePids.push({pid:datasourceConfig.pids[i],datapointname:datapointname});
                    }
                }
            }
        }
        datasourcePids.sort( (a,b) => {
            var nameA=a.datapointname.toLowerCase();
            var nameB=b.datapointname.toLowerCase();
            return ((nameA < nameB) ? -1 : ((nameA > nameB) ? 1 : 0));
        });
        for (var i=0;i<dsData.variables.length;i++) {
            var position=dsData.variables[i][0];
            var length=dsData.variables[i][1];
            var dsSubContent=dsData.content.substr(cursorPosition,position-cursorPosition);
            var start=0;
            var match = newLineRegex.exec(dsSubContent);
            while(match != null) {
                var text=dsSubContent.substr(start,match.index-start).replace(/ /g, '\u00a0');
                elements.push({ne:numElement++,type:'text',data:text});
                elements.push({ne:numElement++,type:'nl'});
                start=match.index+match.length-1;
                match = newLineRegex.exec(dsSubContent);
            }
            if (start<position) {
                var text=dsSubContent.substr(start,position-start).replace(/ /g, '\u00a0');
                elements.push({ne:numElement++,type:'text',data:text});
            }
            var datapointFound=false;
            for (var j=0;j<dsData.datapoints.length;j++) {
                if (dsData.datapoints[j].index == dsData.variables[i][0]) {
                    var text=dsData.content.substr(position,length);
                    if (datapointStore._datapointConfig.hasOwnProperty(dsData.datapoints[j].pid)) {
                        var datapointname=datapointStore._datapointConfig[dsData.datapoints[j].pid].datapointname.split(datasourceConfig.datasourcename);
                        if (datapointname.length == 2) {
                            datapointname = datapointname[1].slice(-20);
                            if (datapointname.length == 20) {
                                datapointname = "..."+datapointname;
                            }
                        }
                    } else {
                        var datapointname='...';
                    }
                    elements.push({ne:numElement++,type:'datapoint',pid:dsData.datapoints[j].pid,p:position,l:length,data:text,datapointname:datapointname});
                    datapointFound=true;
                    break;
                }
            }
            if (datapointFound == false) {
                var text=dsData.content.substr(position,length);
                elements.push({ne:numElement++, type:'variable',data:text,position:position,length:length,datapoints:datasourcePids});
            } else {
                datapointFound = false;
            }
            cursorPosition=position+length;
        }
        if (cursorPosition<dsData.content.length) {
            dsSubContent=dsData.content.substr(cursorPosition,dsData.content.length-cursorPosition);
            start=0;
            while((match=newLineRegex.exec(dsSubContent)) != null) {
                text=dsSubContent.substr(start,match.index-start).replace(/ /g, '\u00a0');
                elements.push({ne:numElement++,type:'text',data:text});
                elements.push({ne:numElement++,type:'nl'});
                start=match.index+match.length-1;
            }
            if (start<dsSubContent.length-1) {
                text=dsSubContent.substr(start,dsSubContent.length-1-start).replace(/ /g, '\u00a0');
                elements.push({ne:numElement++,type:'text',data:text});
            }
        }
        return elements;
    }

    cancelSnapshot = () => {
        this.setState({shareModal:false});
    }

    shareSnapshot = () => {
        var user_list=this.users.value.split(/[\s]+/);
        PubSub.publish('newWidgetDsSnapshot',{seq:this.state.snapshotSeq,user_list:user_list,wid:this.props.wid});
        this.setState({shareModal:false});
    }

    identifyVariable = (position, length, datapointname) => {
        var data={p:position,l:length,seq:this.state.seq,did:this.state.did,datapointname:datapointname};
        PubSub.publish('monitorDatapoint',data);
    }

    associateExistingDatapoint = (position, length, pid) => {
        var data={p:position,l:length,seq:this.state.seq,pid:pid};
        PubSub.publish('markPositiveVar',data);
    }

    render () {
        var elements=this.generateHtmlContent(this.state.dsData);
        var textClass=this.getFontClass(this.state.dsData);
        var element_nodes=elements.map( element => {
            if (element.type == 'text') {
                return <span key={element.ne}>{element.data}</span>;
            } else if (element.type == 'nl') {
                return <br key={element.ne} />;
            } else if (element.type == 'datapoint') {
                var tooltip=<ReactBootstrap.Tooltip id='datapoint'>{element.datapointname}</ReactBootstrap.Tooltip>;
                return (
                  <ReactBootstrap.OverlayTrigger key={element.ne} placement="top" overlay={tooltip}>
                    <span key={element.ne} className="datapoint" draggable="true" onClick={this.onClickDatapoint.bind(null,element.pid)} onDragStart={this.onDragStartDatapoint.bind(null,element.pid)}>
                      {element.data}
                    </span>
                  </ReactBootstrap.OverlayTrigger>
                );
            } else if (element.type == 'variable') {
                return (
                  <WidgetDsVariable key={element.ne} content={element.data} position={element.position} length={element.length} identifyVariableCallback={this.identifyVariable} datapoints={element.datapoints} associateExistingDatapointCallback={this.associateExistingDatapoint} />
                );
            }
        });
        var info_node=this.getDsInfo(this.state.timestamp);
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
        return (
          <div>
            {info_node}
            <div className={'ds-content '+textClass}>
              {element_nodes}
            </div>
            <div>
              {share_modal}
            </div>
          </div>
        );
    }
}

class WidgetDp extends React.Component {
    state = {
        interval: {its:null ,ets: null},
        pid: null,
        color: null,
        datapointname: null,
        data: [],
        summary: {},
        live: true,
        activeVis: 0,
        shareModal:false,
        shareCounter:this.props.shareCounter,
        downloadCounter:this.props.downloadCounter,
        snapshotInterval: undefined,
        livePrevious: true,
    };

    subscriptionTokens = {};

    constructor (props) {
        super(props);
        this.subscriptionTokens[props.wid]=[];
        this.subscriptionTokens[props.wid].push({token:PubSub.subscribe('intervalUpdate-'+props.wid, this.subscriptionHandler),msg:'intervalUpdate-'+props.wid});
        this.subscriptionTokens[props.wid].push({token:PubSub.subscribe('widgetConfigUpdate-'+props.wid, this.subscriptionHandler),msg:'widgetConfigUpdate-'+props.wid});
    }

    componentDidMount () {
        this.refreshConfig();
    }

    componentWillUnmount () {
        this.subscriptionTokens[this.props.wid].map( d => {
            PubSub.unsubscribe(d.token);
        });
        delete this.subscriptionTokens[this.props.wid];
    }

    componentWillReceiveProps (nextProps) {
        if (nextProps.shareCounter>this.state.shareCounter) {
            this.setState({shareModal:true,shareCounter:nextProps.shareCounter, snapshotInterval:this.state.interval, livePrevious:this.state.live, live: false});
        } else if (nextProps.downloadCounter>this.state.downloadCounter) {
            this.downloadContent();
            this.setState({downloadCounter:nextProps.downloadCounter});
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
        if (interval.hasOwnProperty('its') && interval.hasOwnProperty('ets')) {
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
            PubSub.publish('datapointDataReq',{pid:this.state.pid,interval:interval});
            this.setState({live:live,interval:interval});
        }
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

    subscriptionHandler = (msg,data) => {
        var msgType = msg.split('-')[0];
        switch (msgType) {
            case 'datapointDataUpdate':
                if (this.state.interval.its == null || this.state.interval.ets == null) {
                    this.refreshData(data.interval);
                } else if (this.state.live == true && data.interval.ets > this.state.interval.ets) {
                        var elapsedTs=data.interval.ets-this.state.interval.ets;
                        var newInterval={its:this.state.interval.its+elapsedTs, ets: data.interval.ets};
                        this.refreshData(newInterval);
                } else if ((this.state.interval.its <= data.interval.its && data.interval.its <= this.state.interval.ets) ||
                           (this.state.interval.its <= data.interval.ets && data.interval.ets <= this.state.interval.ets)) {
                    this.refreshData(this.state.interval);
                }
                break;
            case 'datapointConfigUpdate':
                this.refreshConfig();
                break;
            case 'widgetConfigUpdate':
                this.refreshConfig();
                break;
            case 'intervalUpdate':
                this.newIntervalCallback(data.interval);
                break;
        }
    }

    refreshConfig () {
        if (this.state.pid) {
            if (datapointStore._datapointConfig.hasOwnProperty(this.state.pid)) {
                var datapointConfig=datapointStore._datapointConfig[this.state.pid];
                var shouldUpdate=false;
                if (this.state.datapointname != datapointConfig.datapointname) {
                    shouldUpdate = true;
                }
                if (this.state.color != datapointConfig.color) {
                    shouldUpdate = true;
                }
                if (shouldUpdate) {
                    this.setState({datapointname:datapointConfig.datapointname,color:datapointConfig.color});
                }
            }
        } else {
            if (widgetStore._widgetConfig.hasOwnProperty(this.props.wid)) {
                var widgetConfig = widgetStore._widgetConfig[this.props.wid];
                var pid = widgetConfig.pid;
                var tokens = this.subscriptionTokens[this.props.wid];
                var configTokenFound = false;
                var dataTokenFound = false;
                for (var i=0; i<tokens.length;i++) {
                    if (tokens[i].msg == 'datapointConfigUpdate-'+pid) {
                        configTokenFound = true;
                    } else if (tokens[i].msg == 'datapointDataUpdate-'+pid) {
                        dataTokenFound = true;
                    }
                }
                if (!configTokenFound) {
                    tokens.push({token:PubSub.subscribe('datapointConfigUpdate-'+pid, this.subscriptionHandler),msg:'datapointConfigUpdate-'+pid});
                }
                if (!dataTokenFound) {
                    tokens.push({token:PubSub.subscribe('datapointDataUpdate-'+pid, this.subscriptionHandler),msg:'datapointDataUpdate-'+pid});
                }
                if (this.state.datapointname == null) {
                    PubSub.publish('datapointConfigReq',{pid:pid});
                }
                if (this.state.data.length == 0) {
                    PubSub.publish('datapointDataReq',{pid:pid});
                }
                this.setState({pid:pid});
            } else {
                PubSub.publish('widgetConfigReq',{wid:this.props.wid});
            }
        }
    }

    refreshData (interval) {
        console.log('refreshData',interval);
        if (this.state.pid) {
            var newData=getIntervalData(this.state.pid, interval);
            var newSummary=this.getDataSummary(newData);
            this.setState({interval: interval, data: newData, summary:newSummary});
        }
    }

    getDataSummary (data) {
        var totalSamples=data.length;
        if (totalSamples>0) {
            var maxValue=Math.max.apply(Math,data.map(function(o){return o.value;}));
            var minValue=Math.min.apply(Math,data.map(function(o){return o.value;}));
            var sumValues=0;
            var meanValue=0;
            for (var j=0;j<data.length;j++) {
                sumValues+=data[j].value;
            }
            if (totalSamples>0) {
                meanValue=sumValues/totalSamples;
            }
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
            var summary={max:d3.format(",")(maxValue),min:d3.format(",")(minValue),mean:d3.format(",")(meanValue)};
        } else {
            var summary={max:0,min:0,mean:0};
        }
        return summary;
    }

    cancelSnapshot = () => {
        this.setState({shareModal:false, live: this.state.livePrevious});
    }

    shareSnapshot = () => {
        var user_list=this.users.value.split(/[\s]+/);
        PubSub.publish('newWidgetDpSnapshot',{interval:this.state.snapshotInterval,user_list:user_list,wid:this.props.wid});
        this.setState({shareModal:false, live: this.state.livePrevious});
    }

    render () {
        if (this.state.pid == null || this.state.datapointname == null ) {
            return null;
        }
        var summary = (
          <tr>
            <td>{this.state.summary.max}</td>
            <td>{this.state.summary.min}</td>
            <td>{this.state.summary.mean}</td>
          </tr>
        );
        var data=[{pid:this.state.pid,color:this.state.color,datapointname:this.state.datapointname,data:this.state.data}];
        var share_modal=(
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
        var visContent=this.state.activeVis == 0 ?  <ContentLinegraph interval={this.state.interval} data={data} newIntervalCallback={this.newIntervalCallback} /> : 
            this.state.activeVis == 1 ? <ContentHistogram data={data} /> : null;
        return (
          <div>
            <div className="dp-stats">
              <table className="table-condensed">
                <tbody>
                  <tr>
                    <th>max</th>
                    <th>min</th>
                    <th>mean</th>
                  </tr>
                  {summary}
                </tbody>
              </table>
            </div>
            <div className="row visual-bar">
             <div className="col-md-5 text-center">
                <ReactBootstrap.ButtonGroup bsSize="xsmall">
                  <ReactBootstrap.Button id="0" active={this.state.activeVis == 0 ? true : false} onClick={this.selectVis}>chart</ReactBootstrap.Button>
                  <ReactBootstrap.Button id="1" active={this.state.activeVis == 1 ? true : false} onClick={this.selectVis}>histogram</ReactBootstrap.Button>
                </ReactBootstrap.ButtonGroup>
              </div>
              <div className="col-md-7">
                <TimeSlider interval={this.state.interval} newIntervalCallback={this.newIntervalCallback} />
              </div>
            </div>
            <div className="row">
              <div className="col-md-12">{visContent}</div>
            </div> 
            <div>{share_modal}</div>
          </div>
        );
    }
}

class WidgetMp extends React.Component {
    state = {
        interval: {its:null ,ets:null},
        pids: null,
        widgetname: "",
        data: {},
        config: {},
        live: true,
        activeVis: 0,
        shareModal:false,
        shareCounter:this.props.shareCounter,
        snapshotInterval: undefined,
        downloadCounter: this.props.downloadCounter,
        livePrevious: true,
    };

    subscriptionTokens = {};

    constructor (props) {
        super(props);
        this.subscriptionTokens[props.wid]=[];
        this.subscriptionTokens[props.wid].push({token:PubSub.subscribe('intervalUpdate-'+props.wid, this.subscriptionHandler),msg:'intervalUpdate-'+props.wid});
        this.subscriptionTokens[props.wid].push({token:PubSub.subscribe('widgetConfigUpdate-'+props.wid, this.subscriptionHandler),msg:'widgetConfigUpdate-'+props.wid});
    }

    componentWillUnmount () {
        this.subscriptionTokens[this.props.wid].forEach ( d => {
            PubSub.unsubscribe(d.token);
        });
        delete this.subscriptionTokens[this.props.wid];
    }

    componentWillMount () {
        this.refreshConfig();
    }

    componentWillReceiveProps (nextProps) {
        if (nextProps.shareCounter>this.state.shareCounter) {
            if (this.state.pids == null || this.state.pids.length == 0) {
                this.props.barMessageCallback({message:{type:'danger',message:'No datapoints in graph'},messageTime:(new Date).getTime()});
                this.setState({shareModal:false,shareCounter:nextProps.shareCounter});
            } else {
                this.setState({shareModal:true,shareCounter:nextProps.shareCounter, snapshotInterval:this.state.interval, livePrevious:this.state.live, live: false});
            }
        } else if (nextProps.downloadCounter>this.state.downloadCounter) {
            this.downloadContent();
            this.setState({downloadCounter:nextProps.downloadCounter});
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
        if (interval.hasOwnProperty('its') && interval.hasOwnProperty('ets')) {
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
            for (var i=0;i<this.state.pids.length;i++) {
                PubSub.publish('datapointDataReq',{pid:this.state.pids[i],interval:interval});
            }
            this.setState({interval:interval, live:live});
            this.refreshData(interval);
        }
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
        if (!(this.state.pids == null) && this.state.pids.length>0) {
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

    subscriptionHandler = (msg,data) => {
        var msgType=msg.split('-')[0];
        switch (msgType) {
            case 'datapointDataUpdate':
                var pid=msg.split('-')[1];
                if (this.state.interval.its == null || this.state.interval.ets == null) {
                    this.refreshData(data.interval, pid);
                } else if (this.state.live == true && data.interval.ets > this.state.interval.ets) {
                    var elapsedTs=data.interval.ets-this.state.interval.ets;
                    var newInterval={its:this.state.interval.its+elapsedTs, ets: data.interval.ets};
                    this.refreshData(newInterval, pid);
                } else if ((this.state.interval.its <= data.interval.its && data.interval.its <= this.state.interval.ets) ||
                           (this.state.interval.its <= data.interval.ets && data.interval.ets <= this.state.interval.ets)) {
                    this.refreshData(this.state.interval, pid);
                }
                break;
            case 'datapointConfigUpdate':
                this.refreshConfig();
                break;
            case 'intervalUpdate':
                this.newIntervalCallback(data.interval);
                break;
            case 'widgetConfigUpdate':
                this.refreshConfig();
                break;
        }
    }

    refreshConfig () {
        if (widgetStore._widgetConfig.hasOwnProperty(this.props.wid)) {
            var widgetConfig=widgetStore._widgetConfig[this.props.wid];
            var datapoints={};
            var tokens = this.subscriptionTokens[this.props.wid];
            var data = this.state.data;
            for (var i=0;i<widgetConfig.datapoints.length;i++) {
                var dataFound = false;
                var configFound = false;
                var pid = widgetConfig.datapoints[i];
                for (var j=0; j<tokens.length;j++) {
                    if (tokens[j].msg == 'datapointConfigUpdate-'+pid) {
                        configFound = true;
                    } else if (tokens[j].msg == 'datapointDataUpdate-'+pid) {
                        dataFound = true;
                    }
                }
                if (!configFound) {
                    tokens.push({token:PubSub.subscribe('datapointConfigUpdate-'+pid, this.subscriptionHandler),msg:'datapointConfigUpdate-'+pid});
                }
                if (!dataFound) {
                    tokens.push({token:PubSub.subscribe('datapointDataUpdate-'+pid, this.subscriptionHandler),msg:'datapointDataUpdate-'+pid});
                }
                if (datapointStore._datapointConfig.hasOwnProperty(pid)) {
                    var datapoint=datapointStore._datapointConfig[pid];
                    datapoints[pid]={pid:pid,color:datapoint.color,datapointname:datapoint.datapointname};
                } else {
                    PubSub.publish('datapointConfigReq',{pid:pid});
                }
                if (!this.state.data.hasOwnProperty(pid)) {
                    data[pid]=[];
                    PubSub.publish('datapointDataReq',{pid:pid});
                }
            }
            this.setState({config:datapoints, pids:widgetConfig.datapoints, widgetname:widgetConfig.widgetname, data:data});
        } else {
            PubSub.publish('widgetConfigReq',{wid:this.props.wid});
        }

    }

    refreshData (interval, pid) {
        if (pid) {
            var selectedPids=[pid];
        } else {
            var selectedPids=this.state.pids;
        }
        if (selectedPids != null) {
            var data=this.state.data;
            selectedPids.forEach( pid => {
                data[pid]=getIntervalData(pid, interval);
            });
            this.setState({interval:interval,data:data});
        }
    }

    onDrop = (e) => {
        var id=e.dataTransfer.getData('id');
        if (id.length==32){
            var data={wid:this.props.wid, 'new_datapoints':[id]};
            PubSub.publish('modifyWidget',data);
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
        PubSub.publish('newWidgetMpSnapshot',{interval:this.state.snapshotInterval,user_list:user_list,wid:this.props.wid});
        this.setState({shareModal:false, live: this.state.livePrevious});
    }

    render () {
        if (this.state.pids != null && this.state.pids.length == 0) {
            return (
              <div style={{ color:"#aaa", fontFamily:"sans-serif",fontSize:"18px", fontWeight:"800",lineHeight:"36px", padding:"72px 0 80px", textAlign:"center"}} onDrop={this.onDrop} onDragEnter={this.onDragEnter} onDragOver={this.onDragOver}>
                Add datapoints by dragging them from your data model
                <br/>
                <ReactBootstrap.Glyphicon style={{fontSize:"48px"}} glyph="hand-left" />
              </div>
            );
        }
        var datapoints = this.state.pids;
        var summary=datapoints.map( key => {
            if (this.state.config.hasOwnProperty(key)) {
                var dpSummary=getDataSummary(this.state.data[key]);
                var datapointStyle={backgroundColor: this.state.config[key].color, borderRadius: '5px'};
                var name = this.state.config[key].datapointname.slice(-30);
                if (name.length == 30) {
                    name="..."+name;
                }
                return (
                  <tr key={key}>
                    <td>
                      <span style={datapointStyle}>&nbsp;&nbsp;&nbsp;&nbsp;</span>
                      <span> {name}</span>
                    </td>
                    <td>{dpSummary.max}</td>
                    <td>{dpSummary.min}</td>
                    <td>{dpSummary.mean}</td>
                  </tr>
                );
            }
        });
        var data=datapoints.map( key => {
            if (this.state.config.hasOwnProperty(key)) {
                return {pid:key,color:this.state.config[key].color,datapointname:this.state.config[key].datapointname,data:this.state.data[key]};
            }
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
        var visContent=this.state.activeVis == 0 ?  <ContentLinegraph interval={this.state.interval} data={data} newIntervalCallback={this.newIntervalCallback} /> : 
            this.state.activeVis == 1 ? <ContentHistogram data={data} /> : null;
        return (
          <div onDrop={this.onDrop} onDragEnter={this.onDragEnter} onDragOver={this.onDragOver}>
            <div className="dp-stats">
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
            </div>
            <div className="row visual-bar">
              <div className="col-md-5 text-center">
                <ReactBootstrap.ButtonGroup bsSize="xsmall">
                  <ReactBootstrap.Button id="0" active={this.state.activeVis == 0 ? true : false} onClick={this.selectVis}>chart</ReactBootstrap.Button>
                  <ReactBootstrap.Button id="1" active={this.state.activeVis == 1 ? true : false} onClick={this.selectVis}>histogram</ReactBootstrap.Button>
                </ReactBootstrap.ButtonGroup>
              </div>
              <div className="col-md-7">
                <TimeSlider interval={this.state.interval} newIntervalCallback={this.newIntervalCallback} />
              </div>
            </div>
            <div className="row">
              <div className="col-md-12">{visContent}</div>
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
        zoomInterval: {its:0,ets:0}
    };

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
        d3Linegraph.create(el, this.props.data, this.props.interval, this.notifyNewInterval);
    }

    componentDidUpdate () {
        var el = ReactDOM.findDOMNode(this);
        d3Linegraph.update(el, this.props.data, this.props.interval, this.notifyNewInterval);
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
        return <div />;
    }
}

class WidgetDsVariable extends React.Component {
    state = {
        datapoints: this.props.datapoints,
    };

    associateExistingDatapoint = (pid) => {
        this.popover.hide();
        this.props.associateExistingDatapointCallback(this.props.position, this.props.length, pid);
    }

    identifyVariable = () => {
        var datapointname=this.datapointname.value;
        if (datapointname.length>1){
            this.popover.hide();
            this.props.identifyVariableCallback(this.props.position, this.props.length, datapointname);
        }
    }

    render () {
        var already_monitored=this.state.datapoints.map ( (element, index) => {
            return <ReactBootstrap.MenuItem key={index} eventKey={element.pid}>{element.datapointname}</ReactBootstrap.MenuItem>;
        });
        if (already_monitored.length>0) {
            var dropdown=(
              <ReactBootstrap.Nav onSelect={this.associateExistingDatapoint}>
                <ReactBootstrap.NavDropdown title="Already existing datapoint" id="nav-dropdown">
                  {already_monitored}
                </ReactBootstrap.NavDropdown>
              </ReactBootstrap.Nav>
            );
        } else {
            var dropdown=null;
        }
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
            {dropdown}
          </ReactBootstrap.Popover>
        );
        return (
          <ReactBootstrap.OverlayTrigger ref={ (popover) => {this.popover = popover; }} trigger="click" rootClose={true} placement="right" overlay={popover}>
            <span className="variable">{this.props.content}</span>
          </ReactBootstrap.OverlayTrigger>
        );
    }
}

export {
    Widget,
    TimeSlider,
    ContentLinegraph,
    ContentHistogram
}

/*
var Widget = React.createClass({
    getInitialState: function () {
        return {
                conf:{},
                shareCounter: 0,
                downloadCounter: 0,
                showConfig: false,
                }
    },
    subscriptionTokens: {},
    subscriptionHandler: function (msg,data) {
        switch (msg) {
            case 'widgetConfigUpdate-'+this.props.wid:
                this.refreshConfig()
                break;
        }
    },
    componentWillMount: function () {
        this.subscriptionTokens[this.props.wid]=[]
        this.subscriptionTokens[this.props.wid].push({token:PubSub.subscribe('widgetConfigUpdate-'+this.props.wid, this.subscriptionHandler),msg:'widgetConfigUpdate-'+this.props.wid});
    },
    componentDidMount: function () {
        PubSub.publish('widgetConfigReq',{wid:this.props.wid})
    },
    componentWillUnmount: function () {
        $.map(this.subscriptionTokens[this.props.wid], function (d) {
            PubSub.unsubscribe(d.token)
            }.bind(this));
        delete this.subscriptionTokens[this.props.wid];
    },
    configCallback: function() {
        if (this.state.showConfig == false) {
            PubSub.publish('widgetConfigReq',{wid:this.props.wid})
        }
        this.setState({showConfig:!this.state.showConfig})
    },
    shareCallback: function() {
        this.setState({shareCounter:this.state.shareCounter+1})
    },
    closeCallback: function() {
        this.props.closeCallback();
    },
    downloadCallback: function() {
        this.setState({downloadCounter:this.state.downloadCounter+1})
    },
    barMessage: function (data) {
        console.log('barMessage received',data)
        PubSub.publish('barMessage',{message:data.message,messageTime:data.messageTime})
    },
    refreshConfig: function () {
        if (widgetStore._widgetConfig.hasOwnProperty(this.props.wid)) {
            widgetConfig=widgetStore._widgetConfig[this.props.wid]
            shouldUpdate=false
            $.each(widgetConfig, function (key,value) {
                if (!(this.state.conf.hasOwnProperty(key) && this.state.conf[key]==value)) {
                    shouldUpdate=true
                }
            }.bind(this));
            if (shouldUpdate) {
                this.setState({conf:widgetConfig})
            }
        }
    },
    getWidgetContentEl: function () {
        if ($.isEmptyObject(this.state.conf)) {
            return null
        } else {
            switch (this.state.conf.type) {
                case 'ds':
                    return React.createElement(WidgetDs, {wid:this.props.wid, shareCounter:this.state.shareCounter, downloadCounter:this.state.downloadCounter});
                    break;
                case 'dp':
                    return React.createElement(WidgetDp, {wid:this.props.wid, shareCounter:this.state.shareCounter, downloadCounter:this.state.downloadCounter, barMessageCallback:this.barMessage});
                    break;
                case 'mp':
                    return React.createElement(WidgetMp, {wid:this.props.wid, shareCounter:this.state.shareCounter, downloadCounter:this.state.downloadCounter, barMessageCallback:this.barMessage});
                    break;
                default:
                    return null;
                    break;
            }
        }
    },
    getWidgetConfigEl: function () {
        if ($.isEmptyObject(this.state.conf)) {
            return null
        } else {
            switch (this.state.conf.type) {
                case 'ds':
                    return React.createElement(WidgetConfigDs, {showConfig:this.state.showConfig, closeCallback:this.closeCallback, configCallback:this.configCallback, wid:this.props.wid});
                    break;
                case 'dp':
                    return React.createElement(WidgetConfigDp, {showConfig:this.state.showConfig, closeCallback:this.closeCallback, configCallback:this.configCallback, wid:this.props.wid});
                    break;
                case 'mp':
                    return React.createElement(WidgetConfigMp, {showConfig:this.state.showConfig, closeCallback:this.closeCallback, configCallback:this.configCallback, wid:this.props.wid});
                    break;
                default:
                    return null;
                    break;
            }
        }
    },
    render: function() {
        widget_content=this.getWidgetContentEl();
        widget_config=this.getWidgetConfigEl();
        if ($.isEmptyObject(this.state.conf)) {
            widget=React.createElement('div', null,
                     React.createElement(WidgetBar, {bid:this.props.bid, wid:this.props.wid,conf:this.state.conf,closeCallback:this.closeCallback})
                   );
        } else {
            widget=React.createElement('div', null,
                     React.createElement(WidgetBar, {bid:this.props.bid, wid:this.props.wid, conf:this.state.conf, shareCallback:this.shareCallback, closeCallback:this.closeCallback, configCallback:this.configCallback, isPinned:this.props.isPinned, configOpen:this.state.showConfig, downloadCallback:this.downloadCallback}),
                     widget_config,
                     widget_content
                   );
        }
        return widget
    },
});

var WidgetBar = React.createClass({
    getInitialState: function () {
        return {
            allowPin: false,
            isPinned: false,
        }
    },
    componentWillMount: function () {
        if (this.props.bid != '0') {
            this.setState({allowPin:true, isPinned: this.props.isPinned})
        }
    },
    componentWillReceiveProps: function (nextProps) {
        if (this.props.bid != '0') {
            if (nextProps.isPinned!=this.state.isPinned) {
                this.setState({isPinned:nextProps.isPinned})
            }
        }
    },
    configClick: function() {
        this.props.configCallback()
    },
    shareClick: function () {
        this.props.shareCallback()
    },
    closeClick: function () {
        this.props.closeCallback()
    },
    downloadClick: function () {
        this.props.downloadCallback()
    },
    pinClick: function () {
        if (this.props.isPinned) {
            PubSub.publish('modifyDashboard',{bid:this.props.bid,delete_widgets:[this.props.wid]})
            this.setState({isPinned:false})
        } else {
            PubSub.publish('modifyDashboard',{bid:this.props.bid,new_widgets:[this.props.wid]})
            this.setState({isPinned:true})
        }
    },
    styles: {
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
            padding: '5px',
            color: 'yellow',
            textShadow: '-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black',
        },
        righticonstyle: {
            textShadow: '1px 1px 5px 1px #ccc',
            align: 'right',
            float: 'right',
            height: '20px',
            padding: '5px',
        },
        lefticonstyle: {
            textShadow: '1px 1px 5px 1px #ccc',
            align: 'left',
            float: 'left',
            height: '20px',
            padding: '5px',
        },
    },
    render: function() {
        if (this.state.allowPin) {
            if (this.state.isPinned == true) {
                pinIcon=React.createElement('span', {className:"SlideBarIcon glyphicon glyphicon-pushpin", style:this.styles.righticonstylePushed, onClick:this.pinClick});
            } else {
                pinIcon=React.createElement('span', {className:"SlideBarIcon glyphicon glyphicon-pushpin", style:this.styles.righticonstyle, onClick:this.pinClick});
            }
        } else {
            pinIcon=null
        }
        if (this.props.configOpen) {
            configIcon=React.createElement('span', {className:"SlideBarIcon glyphicon glyphicon-chevron-down", style:this.styles.lefticonstyle, onClick:this.configClick});
        } else {
            configIcon=React.createElement('span', {className:"SlideBarIcon glyphicon glyphicon-chevron-right", style:this.styles.lefticonstyle, onClick:this.configClick});
        }
        return React.createElement('div', {className:"SlideBar panel-heading"},
                 React.createElement('span', {className:"SlideBarIcon glyphicon glyphicon-remove", style:this.styles.righticonstyle, onClick:this.closeClick}),
                 React.createElement('span', {className:"SlideBarIcon glyphicon glyphicon-send", style:this.styles.righticonstyle, onClick:this.shareClick}),
                 React.createElement('span', {className:"SlideBarIcon glyphicon glyphicon-download", style:this.styles.righticonstyle, onClick:this.downloadClick}),
                 pinIcon,
                 configIcon,
                 React.createElement('div', {className:"SlideBarName", style:this.styles.namestyle},this.props.conf.widgetname ? this.props.conf.widgetname : '')
               );
    }
});

var WidgetConfigDs = React.createClass({
    getInitialState: function () {
        return {
                did: null,
                datasourcename: '',
                deleteModal: false,
                }
    },
    subscriptionTokens: {},
    subscriptionHandler: function (msg,data) {
        var msgType = msg.split('-')[0]
        switch (msgType) {
            case 'datasourceConfigUpdate':
                this.refreshConfig();
                break;
            case 'widgetConfigUpdate':
                this.refreshConfig();
                break;
        }
    },
    componentWillMount: function () {
        this.subscriptionTokens['cfg-'+this.props.wid]=[]
        this.subscriptionTokens['cfg-'+this.props.wid].push({token:PubSub.subscribe('widgetConfigUpdate-'+this.props.wid, this.subscriptionHandler),msg:'widgetConfigUpdate-'+this.props.wid});
        this.refreshConfig()
    },
    componentWillUnmount: function () {
        $.map(this.subscriptionTokens['cfg-'+this.props.wid], function (d) {
            PubSub.unsubscribe(d.token)
            }.bind(this));
        delete this.subscriptionTokens['cfg-'+this.props.wid];
    },
    refreshConfig: function () {
        if (!this.state.did) {
            if (widgetStore._widgetConfig.hasOwnProperty(this.props.wid)) {
                var widgetConfig = widgetStore._widgetConfig[this.props.wid];
                var did = widgetConfig.did;
                var tokens = this.subscriptionTokens['cfg-'+this.props.wid];
                var configTokenFound = false;
                for (var i=0; i<tokens.length;i++) {
                    if (tokens[i].msg == 'datasourceConfigUpdate-'+did) {
                        configTokenFound = true;
                        break;
                    }
                }
                if (!configTokenFound) {
                    tokens.push({token:PubSub.subscribe('datasourceConfigUpdate-'+did, this.subscriptionHandler),msg:'datasourceConfigUpdate-'+did});
                }
                if (!datasourceStore._datasourceConfig.hasOwnProperty(did)) {
                    PubSub.publish('datasourceConfigReq',{did:did})
                }
                this.setState({did:did})
            } else {
                PubSub.publish('widgetConfigReq',{wid:this.props.wid})
            }
        } else if (datasourceStore._datasourceConfig.hasOwnProperty(this.state.did)) {
            var datasourceConfig=datasourceStore._datasourceConfig[this.state.did]
            if (this.state.datasourcename != datasourceConfig.datasourcename) {
                this.setState({datasourcename:datasourceConfig.datasourcename})
            }
        } else {
            PubSub.publish('datasourceConfigReq',{did:this.state.did})
        }
    },
    deleteWidget: function () {
        this.setState({deleteModal: true})
    },
    cancelDelete: function () {
        this.setState({deleteModal: false})
    },
    confirmDelete: function () {
        PubSub.publish('deleteDatasource',{did:this.props.did})
        this.setState({deleteModal: false})
        this.props.closeCallback()
    },
    render: function () {
        delete_modal=React.createElement(ReactBootstrap.Modal, {show:this.state.deleteModal, onHide:this.cancelDelete},
                       React.createElement(ReactBootstrap.Modal.Header, {closeButton:true},
                         React.createElement(ReactBootstrap.Modal.Title, null,"Delete Datasource")
                       ),
                       React.createElement(ReactBootstrap.Modal.Body, null,
                         "Datasource ",
                         React.createElement('strong', null, this.state.datasourcename),
                         " will be deleted, with all its datapoints.",
                         React.createElement('p',null),
                         React.createElement('strong', null, "Are You sure?")
                       ),
                       React.createElement(ReactBootstrap.Modal.Footer, null,
                         React.createElement(ReactBootstrap.Button, {bsStyle:"default", onClick:this.cancelDelete}, "Cancel"),
                         React.createElement(ReactBootstrap.Button, {bsStyle:"primary", onClick:this.confirmDelete}, "Delete")
                       )
                     );
        return React.createElement(ReactBootstrap.Collapse, {in:this.props.showConfig},
                 React.createElement('div', null,
                   React.createElement(ReactBootstrap.Well, null,
                     React.createElement(ReactBootstrap.ListGroup, null,
                       React.createElement(ReactBootstrap.ListGroupItem, {bsSize:"xsmall"},
                         React.createElement('strong', null, "Delete Datasource"),
                         React.createElement('div', {className:"text-right"},
                           React.createElement(ReactBootstrap.Button, {bsSize:"small", bsStyle:"danger", onClick:this.deleteWidget}, "Delete")
                         )
                       )
                     )
                   ),
                   delete_modal
                 )
               )
    }
});

var WidgetConfigDp = React.createClass({
    getInitialState: function () {
        return {
            pid: null,
            datapointname: '',
            color: '',
            boxColor: '',
            deleteModal: false,
            updateDisabled: true,
        }
    },
    subscriptionTokens: {},
    subscriptionHandler: function (msg,data) {
        msgType = msg.split('-')[0]
        switch (msgType) {
            case 'datapointConfigUpdate':
                this.refreshConfig();
                break;
            case 'widgetConfigUpdate':
                this.refreshConfig();
                break;
        }
    },
    componentWillMount: function () {
        this.subscriptionTokens['cfg-'+this.props.wid]=[]
        this.subscriptionTokens['cfg-'+this.props.wid].push({token:PubSub.subscribe('widgetConfigUpdate-'+this.props.wid, this.subscriptionHandler),msg:'widgetConfigUpdate-'+this.props.wid});
        this.refreshConfig()
    },
    componentWillUnmount: function () {
        $.map(this.subscriptionTokens['cfg-'+this.props.wid], function (d) {
            PubSub.unsubscribe(d.token)
            }.bind(this));
        delete this.subscriptionTokens['cfg-'+this.props.wid];
    },
    handleChange: function () {
        color=this.refs.color.getValue()
        isOk  = /^#[0-9A-F]{6}$/i.test(color)
        newState={updateDisabled:!isOk}
        if (isOk) {
            newState.boxColor=color
        }
        this.setState(newState)
    },
    refreshConfig: function () {
        if (!this.state.pid) {
            if (widgetStore._widgetConfig.hasOwnProperty(this.props.wid)) {
                var widgetConfig = widgetStore._widgetConfig[this.props.wid];
                var pid = widgetConfig.pid;
                var tokens = this.subscriptionTokens['cfg-'+this.props.wid];
                var configTokenFound = false;
                for (var i=0; i<tokens.length;i++) {
                    if (tokens[i].msg == 'datapointConfigUpdate-'+pid) {
                        configTokenFound = true;
                        break;
                    }
                }
                if (!configTokenFound) {
                    tokens.push({token:PubSub.subscribe('datapointConfigUpdate-'+pid, this.subscriptionHandler),msg:'datapointConfigUpdate-'+pid});
                }
                if (!datapointStore._datapointConfig.hasOwnProperty(pid)) {
                    PubSub.publish('datapointConfigReq',{pid:pid})
                }
                this.setState({pid:pid})
            } else {
                PubSub.publish('widgetConfigReq',{wid:this.props.wid})
            }
        } else if (datapointStore._datapointConfig.hasOwnProperty(this.state.pid)) {
            var datapointConfig=datapointStore._datapointConfig[this.state.pid]
            var shouldUpdate = false;
            if (this.state.datapointname != datapointConfig.datapointname) {
                shouldUpdate = true;
            } else if (this.state.color != datapointConfig.color) {
                shouldUpdate = true;
            }
            if (shouldUpdate) {
                this.setState({datapointname:datapointConfig.datapointname,color:datapointConfig.color,boxColor:datapointConfig.color})
            }
        } else {
            PubSub.publish('datapointConfigReq',{pid:this.state.pid})
        }
    },
    updateConfig: function () {
        color=this.refs.color.getValue().toUpperCase();
        if (color != this.state.color && /^#[0-9A-F]{6}$/i.test(color)) {
            PubSub.publish('modifyDatapoint',{pid:this.state.pid,color:color})
        }
        this.props.configCallback()
    },
    deleteWidget: function () {
        this.setState({deleteModal: true})
    },
    cancelDelete: function () {
        this.setState({deleteModal: false})
    },
    confirmDelete: function () {
        PubSub.publish('deleteDatapoint',{pid:this.state.pid})
        this.setState({deleteModal: false})
        this.props.closeCallback()
    },
    render: function () {
        delete_modal=React.createElement(ReactBootstrap.Modal, {show:this.state.deleteModal, onHide:this.cancelDelete},
                       React.createElement(ReactBootstrap.Modal.Header, {closeButton:true},
                         React.createElement(ReactBootstrap.Modal.Title, null,"Delete Datapoint")
                       ),
                       React.createElement(ReactBootstrap.Modal.Body, null,
                         "Datapoint ",
                         React.createElement('strong', null, this.state.datapointname),
                         " will be deleted. ",
                         React.createElement('p',null),
                         React.createElement('strong', null, "Are You sure?")
                       ),
                       React.createElement(ReactBootstrap.Modal.Footer, null,
                         React.createElement(ReactBootstrap.Button, {bsStyle:"default", onClick:this.cancelDelete}, "Cancel"),
                         React.createElement(ReactBootstrap.Button, {bsStyle:"primary", onClick:this.confirmDelete}, "Delete")
                       )
                     );
        boxColor=React.createElement(ReactBootstrap.Glyphicon, {glyph:"unchecked", style:{backgroundColor:this.state.boxColor, color:this.state.boxColor}});
        return React.createElement(ReactBootstrap.Collapse, {in:this.props.showConfig},
                 React.createElement('div', null,
                   React.createElement(ReactBootstrap.Well, null,
                     React.createElement(ReactBootstrap.ListGroup, null,
                       React.createElement(ReactBootstrap.ListGroupItem, {bsSize:"small"},
                         React.createElement('form', {className:"form-horizontal"},
                           React.createElement(ReactBootstrap.Input, {ref:"color", placeholder:this.state.color, bsSize:"small", type:"text", label:"Datapoint Color", labelClassName:"col-xs-3", wrapperClassName:"col-xs-3", onChange:this.handleChange, addonAfter:boxColor}),
                           React.createElement('div', {className:"text-right"},
                             React.createElement(ReactBootstrap.Button, {bsSize:"small", bsStyle:"primary", onClick:this.updateConfig, disabled:this.state.updateDisabled}, "Update")
                           )
                         )
                       ),
                       React.createElement(ReactBootstrap.ListGroupItem, {bsSize:"xsmall"},
                         React.createElement('strong', null, "Delete Datapoint"),
                         React.createElement('div', {className:"text-right"},
                           React.createElement(ReactBootstrap.Button, {bsSize:"small", bsStyle:"danger", onClick:this.deleteWidget}, "Delete")
                         )
                       )
                     )
                   ),
                   delete_modal
                 )
               )
    }
});

var WidgetConfigMp = React.createClass({
    getInitialState: function () {
        return {
            deleteModal: false,
            datapoints: [],
            widgetname: "",
        }
    },
    subscriptionTokens: {},
    subscriptionHandler: function (msg,data) {
        msgType=msg.split('-')[0]
        switch (msgType) {
            case 'datapointConfigUpdate':
                this.refreshConfig();
                break;
            case 'widgetConfigUpdate':
                this.refreshConfig()
                break;
        }
    },
    componentWillMount: function () {
        this.subscriptionTokens['cfg-'+this.props.wid]=[]
        this.subscriptionTokens['cfg-'+this.props.wid].push({token:PubSub.subscribe('widgetConfigUpdate-'+this.props.wid, this.subscriptionHandler),msg:'widgetConfigUpdate-'+this.props.wid});
        this.refreshConfig();
    },
    componentWillUnmount: function () {
        $.map(this.subscriptionTokens['cfg-'+this.props.wid], function (d) {
            PubSub.unsubscribe(d.token)
            });
        delete this.subscriptionTokens['cfg-'+this.props.wid];
    },
    refreshConfig: function () {
        if (widgetStore._widgetConfig.hasOwnProperty(this.props.wid)) {
            var widgetConfig=widgetStore._widgetConfig[this.props.wid];
            var datapoints=[];
            var tokens = this.subscriptionTokens['cfg-'+this.props.wid];
            for (var i=0;i<widgetConfig.datapoints.length;i++) {
                var found = false;
                var pid = widgetConfig.datapoints[i];
                for (var j=0; j<tokens.length;j++) {
                    if (tokens[j].msg == 'datapointConfigUpdate-'+pid) {
                        found = true;
                    }
                }
                if (!found) {
                    tokens.push({token:PubSub.subscribe('datapointConfigUpdate-'+pid, this.subscriptionHandler),msg:'datapointConfigUpdate-'+pid});
                }
                if (datapointStore._datapointConfig.hasOwnProperty(pid)) {
                    var datapoint=datapointStore._datapointConfig[pid];
                    datapoints.push({pid:pid,color:datapoint.color,datapointname:datapoint.datapointname,lineThrough:false});
                } else {
                    PubSub.publish('datapointConfigReq',{pid:pid})
                }
            }
            var widgetname = widgetConfig.widgetname;
            console.log('voy a actualizar el número de dps', datapoints)
            this.setState({datapoints:datapoints, widgetname:widgetname})
        }
    },
    updateConfig: function () {
        data={wid:this.props.wid}
        new_widgetname=this.refs.widgetname.getValue();
        if (new_widgetname.length>0 && new_widgetname!=this.props.widgetname) {
            data.new_widgetname=new_widgetname
        }
        for (var i=0;i<this.state.datapoints.length;i++) {
            deleteDatapoints=[]
            if (this.state.datapoints[i].lineThrough) {
                deleteDatapoints.push(this.state.datapoints[i].pid)
            }
            if (deleteDatapoints.length>0) {
                data.delete_datapoints=deleteDatapoints
            }
        }
        if (Object.keys(data).length>1) {
            PubSub.publish('modifyWidget',data)
        }
        this.props.configCallback()
    },
    markDatapoint: function (pid) {
        var datapoints=this.state.datapoints;
        var render=false;
        for (var i=0;i<datapoints.length;i++) {
            if (datapoints[i].pid == pid) {
                datapoints[i].lineThrough=!datapoints[i].lineThrough
                render=true
                break;
            }
        }
        if (render) {
            this.setState({datapoints:datapoints})
        }
    },
    deleteWidget: function () {
        this.setState({deleteModal: true})
    },
    cancelDelete: function () {
        this.setState({deleteModal: false})
    },
    confirmDelete: function () {
        PubSub.publish('deleteWidget',{wid:this.props.wid})
        this.setState({deleteModal: false})
        this.props.closeCallback()
    },
    renderDatapointList: function () {
        list=$.map(this.state.datapoints, function (el) {
            if (el.lineThrough) {
                style={'textDecoration':'line-through'}
                glyph="remove"
            } else {
                style={}
                glyph="ok"
            }
            name = el.datapointname.slice(-60)
            if (name.length == 60) {
                name = "..."+name
            }
            return React.createElement('tr', {key:el.pid},
              React.createElement('td', null,
                React.createElement(ReactBootstrap.Glyphicon, {glyph:glyph, onClick:this.markDatapoint.bind(null, el.pid)})
              ),
              React.createElement('td', {style:style},
                React.createElement('span', {style:{backgroundColor:el.color}},"   "),
                React.createElement('span', null,name)
              )
            );
        }.bind(this));
        return React.createElement(ReactBootstrap.Table, null, list);
    },
    render: function () {
        delete_modal=React.createElement(ReactBootstrap.Modal, {show:this.state.deleteModal, onHide:this.cancelDelete},
          React.createElement(ReactBootstrap.Modal.Header, {closeButton:true},
            React.createElement(ReactBootstrap.Modal.Title, null,"Delete Graph")
          ),
          React.createElement(ReactBootstrap.Modal.Body, null,
            "Graph ",
            React.createElement('strong', null, this.state.widgetname),
            " will be deleted. ",
            React.createElement('p',null),
            React.createElement('strong', null, "Are You sure?")
          ),
          React.createElement(ReactBootstrap.Modal.Footer, null,
            React.createElement(ReactBootstrap.Button, {bsStyle:"default", onClick:this.cancelDelete}, "Cancel"),
            React.createElement(ReactBootstrap.Button, {bsStyle:"primary", onClick:this.confirmDelete}, "Delete")
          )
        );
        datapointList=this.renderDatapointList();
        return React.createElement(ReactBootstrap.Collapse, {in:this.props.showConfig},
          React.createElement('div', null,
            React.createElement(ReactBootstrap.Well, null,
              React.createElement(ReactBootstrap.ListGroup, null,
                React.createElement(ReactBootstrap.ListGroupItem, {bsSize:"small"},
                  React.createElement(ReactBootstrap.Table, {condensed:true,responsive:true},
                    React.createElement('tr', null,
                      React.createElement('td',null,
                        React.createElement('strong',null,"Graph Name")
                      ),
                      React.createElement('td',null,
                        React.createElement(ReactBootstrap.Input, {ref:"widgetname", placeholder:this.state.widgetname, bsSize:"small", type:"text"})
                      )
                    ),
                    React.createElement('tr',null,
                      React.createElement('td', null,
                        React.createElement('strong',null,"Datapoints")
                      ),
                      React.createElement('td', null, datapointList)
                    ),
                    React.createElement('tr',null,
                      React.createElement('td',{colSpan:"2", className:"text-right"},
                        React.createElement(ReactBootstrap.Button, {bsSize:"small", bsStyle:"primary", onClick:this.updateConfig}, "Update")
                      )
                    )
                  )
                ),
                React.createElement(ReactBootstrap.ListGroupItem, {bsSize:"xsmall"},
                  React.createElement('strong', null, "Delete Graph"),
                  React.createElement('div', {className:"text-right"},
                    React.createElement(ReactBootstrap.Button, {bsSize:"small", bsStyle:"danger", onClick:this.deleteWidget}, "Delete")
                  )
                )
              )
            ),
            delete_modal
          )
        )
    }
});

var WidgetDs = React.createClass({
    getInitialState: function () {
        return {
            did: null,
            contentWidth: null,
            dsData: null,
            datasourcename: '',
            timestamp:0,
            seq: null,
            snapshotTimestamp:0,
            snapshotSeq: null,
            shareModal:false,
            shareCounter:this.props.shareCounter,
            downloadCounter:this.props.downloadCounter,
        }
    },
    subscriptionTokens: {},
    onClickDatapoint: function(pid,e) {
        e.preventDefault();
        PubSub.publish('loadSlide',{pid:pid})
    },
    onDragStartDatapoint: function (pid,e) {
        console.log('dragstartdp')
        e.stopPropagation()
        e.dataTransfer.setData('id',pid)
    },
    subscriptionHandler: function (msg,data) {
        var msgType = msg.split('-')[0]
        switch (msgType) {
            case 'datasourceDataUpdate':
                this.refreshData()
                break;
            case 'datapointConfigUpdate':
                this.refreshData()
                break;
            case 'datasourceConfigUpdate':
                this.refreshConfig()
                break;
            case 'widgetConfigUpdate':
                this.refreshConfig()
                break;
        }
    },
    componentWillMount: function () {
        this.subscriptionTokens[this.props.wid]=[]
        this.subscriptionTokens[this.props.wid].push({token:PubSub.subscribe('widgetConfigUpdate-'+this.props.wid, this.subscriptionHandler),msg:'widgetConfigUpdate-'+this.props.wid});
        this.refreshConfig();
    },
    componentDidMount: function () {
        if (this.state.contentWidth == null) {
            var contentWidth = ReactDOM.findDOMNode(this).clientWidth
            this.setState({contentWidth:contentWidth})
        }
    },
    componentWillUnmount: function () {
        $.map(this.subscriptionTokens[this.props.wid], function (d) {
            PubSub.unsubscribe(d.token)
            }.bind(this));
        delete this.subscriptionTokens[this.props.wid];
    },
    componentWillReceiveProps: function (nextProps) {
        if (nextProps.shareCounter>this.state.shareCounter) {
            this.setState({shareModal:true,shareCounter:nextProps.shareCounter,snapshotTimestamp:this.state.timestamp,snapshotSeq:this.state.seq});
        } else if (nextProps.downloadCounter>this.state.downloadCounter) {
            this.downloadContent();
            this.setState({downloadCounter:nextProps.downloadCounter});
        }
    },
    downloadContent: function () {
        if (this.state.dsData.content && this.state.dsData.content.length>0) {
            downloadFile(this.state.datasourcename+'.txt',this.state.dsData.content,'text/plain')
        }
    },
    refreshData: function () {
        if (this.state.did) {
            if (datasourceStore._datasourceData.hasOwnProperty(this.state.did)) {
                datasourceData=datasourceStore._datasourceData[this.state.did]
                if (datasourceData.hasOwnProperty('datapoints')) {
                    var shouldUpdate = false;
                    for (var i=0;i<datasourceData.datapoints.length;i++) {
                        var pid=datasourceData.datapoints[i].pid
                        var tokens = this.subscriptionTokens[this.props.wid]
                        var found = false;
                        for (var i=0;i<tokens.length;i++) {
                            if (tokens[i].msg == 'datapointConfigUpdate-'+pid) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) {
                            shouldUpdate = true;
                            tokens.push({token:PubSub.subscribe('datapointConfigUpdate-'+pid, this.subscriptionHandler),msg:'datapointConfigUpdate-'+pid});
                        }
                        if (!datapointStore._datapointConfig.hasOwnProperty(pid)) {
                            shouldUpdate = true;
                            PubSub.publish('datapointConfigReq',{pid:pid})
                        }
                    }
                }
                if (!this.state.dsData || (this.state.timestamp < datasourceData.ts)) {
                    this.setState({dsData:datasourceData, timestamp:datasourceData.ts,seq:datasourceData.seq})
                } else if (shouldUpdate && this.state.timestamp <= datasourceData.ts) {
                    this.setState({dsData:datasourceData, timestamp:datasourceData.ts,seq:datasourceData.seq})
                }

            }
        }
    },
    refreshConfig: function () {
        if (!this.state.did) {
            if (widgetStore._widgetConfig.hasOwnProperty(this.props.wid)) {
                var widgetConfig = widgetStore._widgetConfig[this.props.wid];
                var did = widgetConfig.did;
                var tokens = this.subscriptionTokens[this.props.wid];
                var configTokenFound = false;
                var dataTokenFound = false;
                for (var i=0; i<tokens.length;i++) {
                    if (tokens[i].msg == 'datasourceConfigUpdate-'+did) {
                        configTokenFound = true;
                    } else if (tokens[i].msg == 'datasourceDataUpdate-'+did) {
                        dataTokenFound = true;
                    }
                }
                if (!configTokenFound) {
                    tokens.push({token:PubSub.subscribe('datasourceConfigUpdate-'+did, this.subscriptionHandler),msg:'datasourceConfigUpdate-'+did});
                }
                if (!dataTokenFound) {
                    tokens.push({token:PubSub.subscribe('datasourceDataUpdate-'+did, this.subscriptionHandler),msg:'datasourceDataUpdate-'+did});
                }
                if (!datasourceStore._datasourceConfig.hasOwnProperty(did)) {
                    PubSub.publish('datasourceConfigReq',{did:did})
                }
                if (!datasourceStore._datasourceData.hasOwnProperty(did)) {
                    PubSub.publish('datasourceDataReq',{did:did})
                }
                this.setState({did:did})
            } else {
                PubSub.publish('widgetConfigReq',{wid:this.props.wid})
            }
        } else if (datasourceStore._datasourceConfig.hasOwnProperty(this.state.did)) {
            var shouldUpdate=false;
            var datasourceConfig=datasourceStore._datasourceConfig[this.state.did]
            if (this.state.datasourcename != datasourceConfig.datasourcename) {
                shouldUpdate = true;
            }
            if (shouldUpdate) {
                this.setState({datasourcename:datasourceConfig.datasourcename})
            }
        } else {
            PubSub.publish('datasourceConfigReq',{did:this.state.did})
        }

    },
    getDsInfo: function (timestamp) {
        if (typeof timestamp === 'number') {
            var dateFormat = d3.time.format("%Y/%m/%d - %H:%M:%S")
            var date = new Date(timestamp*1000);
            dateText=dateFormat(date)
            return React.createElement('div', {style:{"textAlign":"center"}},
                     React.createElement('div',{className: "ds-info"}, dateText)
                   );
        } else {
            return null
        }
    },
    generateDateString: function (timestamp) {
        if (typeof timestamp === 'number') {
            var dateFormat = d3.time.format("%Y/%m/%d - %H:%M:%S")
            var date = new Date(timestamp*1000);
            dateText=dateFormat(date)
            return dateText
        } else {
            return ''
        }
    },
    getFontClass: function (dsData) {
        if (!dsData || this.state.contentWidth == null) {
            return 'font-normal'
        }
        var newLineRegex=/(?:\r\n|\r|\n)/g
        var contentWidth = this.state.contentWidth
        var normalLength = contentWidth / 8
        var lines = dsData.content.split(newLineRegex)
        var meanLineSize=d3.mean(lines, function (d) {return d.length > 0 ? d.length : normalLength})
        var fontClass = meanLineSize * 10 < contentWidth ? 'font-large' : meanLineSize * 6 > contentWidth ? 'font-small' : 'font-normal';
        return fontClass
    },
    generateHtmlContent: function (dsData) {
        var elements=[]
        if (!dsData) {
            return elements
        }
        var numElement = 0
        var cursorPosition=0
        var newLineRegex=/(?:\r\n|\r|\n)/g
        var datasourcePids=[]
        if (this.state.did && datasourceStore._datasourceConfig.hasOwnProperty(this.state.did)) {
            var datasourceConfig=datasourceStore._datasourceConfig[this.state.did]
            if (datasourceConfig.hasOwnProperty('pids')) {
                for (var i=0;i<datasourceConfig.pids.length;i++) {
                    if (datapointStore._datapointConfig.hasOwnProperty(datasourceConfig.pids[i])) {
                        var datapointname=datapointStore._datapointConfig[datasourceConfig.pids[i]].datapointname
                        datasourcePids.push({pid:datasourceConfig.pids[i],datapointname:datapointname})
                    }
                }
            }
        }
        datasourcePids.sort( function (a,b) {
            var nameA=a.datapointname.toLowerCase();
            var nameB=b.datapointname.toLowerCase();
            return ((nameA < nameB) ? -1 : ((nameA > nameB) ? 1 : 0));
        });
        for (var i=0;i<dsData.variables.length;i++) {
            var position=dsData.variables[i][0]
            var length=dsData.variables[i][1]
            var dsSubContent=dsData.content.substr(cursorPosition,position-cursorPosition)
            var start=0
            while((match=newLineRegex.exec(dsSubContent)) != null) {
                var text=dsSubContent.substr(start,match.index-start).replace(/ /g, '\u00a0');
                elements.push({ne:numElement++,type:'text',data:text});
                elements.push({ne:numElement++,type:'nl'});
                start=match.index+match.length-1
            }
            if (start<position) {
                var text=dsSubContent.substr(start,position-start).replace(/ /g, '\u00a0');
                elements.push({ne:numElement++,type:'text',data:text});
            }
            var datapointFound=false;
            for (var j=0;j<dsData.datapoints.length;j++) {
                if (dsData.datapoints[j].index == dsData.variables[i][0]) {
                    var text=dsData.content.substr(position,length)
                    if (datapointStore._datapointConfig.hasOwnProperty(dsData.datapoints[j].pid)) {
                        var datapointname=datapointStore._datapointConfig[dsData.datapoints[j].pid].datapointname.split(datasourceConfig.datasourcename)
                        if (datapointname.length == 2) {
                            datapointname = datapointname[1].slice(-20)
                            if (datapointname.length == 20) {
                                datapointname = "..."+datapointname
                            }
                        }
                    } else {
                        var datapointname='...'
                    }
                    elements.push({ne:numElement++,type:'datapoint',pid:dsData.datapoints[j].pid,p:position,l:length,data:text,datapointname:datapointname})
                    datapointFound=true
                    break;
                }
            }
            if (datapointFound == false) {
                var text=dsData.content.substr(position,length)
                elements.push({ne:numElement++, type:'variable',data:text,position:position,length:length,datapoints:datasourcePids})
            } else {
                datapointFound = false
            }
            cursorPosition=position+length
        }
        if (cursorPosition<dsData.content.length) {
            dsSubContent=dsData.content.substr(cursorPosition,dsData.content.length-cursorPosition)
            start=0
            while((match=newLineRegex.exec(dsSubContent)) != null) {
                text=dsSubContent.substr(start,match.index-start).replace(/ /g, '\u00a0');
                elements.push({ne:numElement++,type:'text',data:text});
                elements.push({ne:numElement++,type:'nl'});
                start=match.index+match.length-1
            }
            if (start<dsSubContent.length-1) {
                text=dsSubContent.substr(start,dsSubContent.length-1-start).replace(/ /g, '\u00a0');
                elements.push({ne:numElement++,type:'text',data:text});
            }
        }
        return elements
    },
    cancelSnapshot: function () {
        this.setState({shareModal:false})
    },
    shareSnapshot: function () {
        user_list=this.refs.users.getValue().split(/[\s,]+/);
        PubSub.publish('newWidgetDsSnapshot',{seq:this.state.snapshotSeq,user_list:user_list,wid:this.props.wid})
        this.setState({shareModal:false})
    },
    identifyVariable: function (position, length, datapointname) {
        data={p:position,l:length,seq:this.state.seq,did:this.state.did,datapointname:datapointname}
        PubSub.publish('monitorDatapoint',data)
    },
    associateExistingDatapoint: function (position, length, pid) {
        data={p:position,l:length,seq:this.state.seq,pid:pid}
        PubSub.publish('markPositiveVar',data)
    },
    render: function () {
        elements=this.generateHtmlContent(this.state.dsData)
        textClass=this.getFontClass(this.state.dsData)
        var element_nodes=$.map(elements, function (element) {
            if (element.type == 'text') {
                return React.createElement('span', {key:element.ne},element.data);
            } else if (element.type == 'nl') {
                return React.createElement('br',{key:element.ne});
            } else if (element.type == 'datapoint') {
                tooltip=React.createElement(ReactBootstrap.Tooltip, {id:'datapoint'}, element.datapointname);
                return React.createElement(ReactBootstrap.OverlayTrigger, {key:element.ne, placement:"top", overlay:tooltip},
                         React.createElement('span',{key:element.ne, className:"datapoint", draggable:"true", onClick:this.onClickDatapoint.bind(null,element.pid), onDragStart:this.onDragStartDatapoint.bind(null,element.pid)}, element.data)
                );
            } else if (element.type == 'variable') {
                return React.createElement(WidgetDsVariable, {key:element.ne, content:element.data, position:element.position, length:element.length, identifyVariableCallback:this.identifyVariable, datapoints:element.datapoints, associateExistingDatapointCallback:this.associateExistingDatapoint});
            }
        }.bind(this));
        info_node=this.getDsInfo(this.state.timestamp)
        share_modal=React.createElement(ReactBootstrap.Modal, {show:this.state.shareModal, onHide:this.cancelSnapshot},
                      React.createElement(ReactBootstrap.Modal.Header, {closeButton:true},
                        React.createElement(ReactBootstrap.Modal.Title, null, "Share snapshot at "+this.generateDateString(this.state.snapshotTimestamp))
                      ),
                      React.createElement(ReactBootstrap.Modal.Body, null,
                        React.createElement(ReactBootstrap.Input, {ref:"users", type:"textarea", label:"Select Users", placeholder:"type users separated by comma"})
                      ),
                      React.createElement(ReactBootstrap.Modal.Footer, null,
                        React.createElement(ReactBootstrap.Button, {bsStyle:"default", onClick:this.cancelSnapshot}, "Cancel"),
                        React.createElement(ReactBootstrap.Button, {bsStyle:"primary", onClick:this.shareSnapshot}, "Share")
                      )
                    );
        return React.createElement('div', null,
                 info_node,
                 React.createElement('div',{className: 'ds-content '+textClass}, element_nodes),
                 React.createElement('div',null, share_modal)
               );
    }
});

var WidgetDp = React.createClass({
    getInitialState: function () {
        return {
                interval: {its:undefined,ets:undefined},
                pid: null,
                color: '',
                datapointname: '',
                data: [],
                summary: {},
                live: true,
                activeVis: 0,
                shareModal:false,
                shareCounter:this.props.shareCounter,
                downloadCounter:this.props.downloadCounter,
                snapshotInterval: undefined,
                livePrevious: true,
        }
    },
    subscriptionTokens: {},
    componentWillMount: function () {
        this.subscriptionTokens[this.props.wid]=[]
        this.subscriptionTokens[this.props.wid].push({token:PubSub.subscribe('intervalUpdate-'+this.props.wid, this.subscriptionHandler),msg:'intervalUpdate-'+this.props.wid});
        this.subscriptionTokens[this.props.wid].push({token:PubSub.subscribe('widgetConfigUpdate-'+this.props.wid, this.subscriptionHandler),msg:'widgetConfigUpdate-'+this.props.wid});
        this.refreshConfig();
    },
    componentWillUnmount: function () {
        $.map(this.subscriptionTokens[this.props.wid], function (d) {
            PubSub.unsubscribe(d.token)
            }.bind(this));
        delete this.subscriptionTokens[this.props.wid];
    },
    componentWillReceiveProps: function (nextProps) {
        if (nextProps.shareCounter>this.state.shareCounter) {
            this.setState({shareModal:true,shareCounter:nextProps.shareCounter, snapshotInterval:this.state.interval, livePrevious:this.state.live, live: false});
        } else if (nextProps.downloadCounter>this.state.downloadCounter) {
            this.downloadContent();
            this.setState({downloadCounter:nextProps.downloadCounter});
        }
    },
    selectVis: function (event) {
        event.preventDefault();
        buttonId=parseInt(event.target.id)
        if (this.state.activeVis != buttonId) {
            this.setState({activeVis:buttonId})
        }
    },
    downloadContent: function () {
        if (this.state.data.length>0) {
            csv="date,"+this.state.datapointname+"\n"
            $.map(this.state.data, function (r,i) {
                csv+=new Date(r.ts*1000).toISOString()+','+r.value+"\n"
            });
            downloadFile(this.state.datapointname+'.csv',csv,'text/csv')
        } else {
            this.props.barMessageCallback({message:{type:'info',message:'No data in selected interval'},messageTime:(new Date).getTime()});
        }
    },
    newIntervalCallback: function (interval) {
        now=new Date().getTime()/1000;
        if (interval.hasOwnProperty('its') && interval.hasOwnProperty('ets')) {
            if (interval.its == interval.ets) {
                interval.its=interval.ets-3600
            }
            if (Math.abs(this.state.interval.ets-interval.ets)>1) {
                if (interval.ets < now-30) {
                    this.state.live = false;
                } else {
                    this.state.live = true;
                }
            }
            if (interval.ets > now) {
                interval.ets = now
            }
            PubSub.publish('datapointDataReq',{pid:this.state.pid,interval:interval})
            this.refreshData(interval);
        }
    },
    snapshotIntervalCallback: function (interval) {
        now=new Date().getTime()/1000;
        if (interval.hasOwnProperty('its') && interval.hasOwnProperty('ets')) {
            if (interval.its == interval.ets) {
                interval.its=interval.ets-3600
            }
            if (interval.ets > now) {
                interval.ets = now
            }
            this.setState({snapshotInterval:interval})
        }
    },
    subscriptionHandler: function (msg,data) {
        msgType = msg.split('-')[0]
        switch (msgType) {
            case 'datapointDataUpdate':
                if (this.state.interval.its == undefined || this.state.interval.ets == undefined) {
                    this.refreshData(data.interval);
                } else if (this.state.live == true && data.interval.ets > this.state.interval.ets) {
                        elapsedTs=data.interval.ets-this.state.interval.ets
                        newInterval={its:this.state.interval.its+elapsedTs, ets: data.interval.ets}
                        this.refreshData(newInterval)
                } else if ((this.state.interval.its <= data.interval.its && data.interval.its <= this.state.interval.ets) ||
                           (this.state.interval.its <= data.interval.ets && data.interval.ets <= this.state.interval.ets)) {
                    this.refreshData(this.state.interval)
                }
                break;
            case 'datapointConfigUpdate':
                this.refreshConfig()
                break;
            case 'widgetConfigUpdate':
                this.refreshConfig()
                break;
            case 'intervalUpdate':
                this.newIntervalCallback(data.interval)
                break;
        }
    },
    refreshConfig: function () {
        if (this.state.pid) {
            if (datapointStore._datapointConfig.hasOwnProperty(this.state.pid)) {
                var datapointConfig=datapointStore._datapointConfig[this.state.pid]
                var shouldUpdate=false
                if (this.state.datapointname != datapointConfig.datapointname) {
                    shouldUpdate = true
                }
                if (this.state.color != datapointConfig.color) {
                    shouldUpdate = true
                }
                if (shouldUpdate) {
                    this.setState({datapointname:datapointConfig.datapointname,color:datapointConfig.color})
                }
            }
        } else {
            if (widgetStore._widgetConfig.hasOwnProperty(this.props.wid)) {
                var widgetConfig = widgetStore._widgetConfig[this.props.wid];
                var pid = widgetConfig.pid;
                var tokens = this.subscriptionTokens[this.props.wid];
                var configTokenFound = false;
                var dataTokenFound = false;
                for (var i=0; i<tokens.length;i++) {
                    if (tokens[i].msg == 'datapointConfigUpdate-'+pid) {
                        configTokenFound = true;
                    } else if (tokens[i].msg == 'datapointDataUpdate-'+pid) {
                        dataTokenFound = true;
                    }
                }
                if (!configTokenFound) {
                    tokens.push({token:PubSub.subscribe('datapointConfigUpdate-'+pid, this.subscriptionHandler),msg:'datapointConfigUpdate-'+pid});
                }
                if (!dataTokenFound) {
                    tokens.push({token:PubSub.subscribe('datapointDataUpdate-'+pid, this.subscriptionHandler),msg:'datapointDataUpdate-'+pid});
                }
                if (!datapointStore._datapointConfig.hasOwnProperty(pid)) {
                    PubSub.publish('datapointConfigReq',{pid:pid})
                }
                if (!datapointStore._datapointData.hasOwnProperty(pid)) {
                    PubSub.publish('datapointDataReq',{pid:pid})
                }
                this.setState({pid:pid})
            } else {
                PubSub.publish('widgetConfigReq',{wid:this.props.wid})
            }
        }
    },
    refreshData: function (interval) {
        if (this.state.pid) {
            newData=getIntervalData(this.state.pid, interval)
            newSummary=this.getDataSummary(newData)
            this.setState({interval: interval, data: newData, summary:newSummary});
        }
    },
    getDataSummary: function(data) {
        totalSamples=data.length;
        if (totalSamples>0) {
            maxValue=Math.max.apply(Math,data.map(function(o){return o.value;}));
            minValue=Math.min.apply(Math,data.map(function(o){return o.value;}));
            sumValues=0;
            meanValue=0;
            for (var j=0;j<data.length;j++) {
                sumValues+=data[j].value;
            }
            if (totalSamples>0) {
                meanValue=sumValues/totalSamples;
            }
            if ((maxValue % 1) != 0 || (minValue % 1) != 0) {
                if (typeof maxValue % 1 == 'number' && maxValue % 1 != 0) {
                    numDecimalsMaxValue=maxValue.toString().split('.')[1].length
                } else {
                    numDecimalsMaxValue=2
                }
                if (typeof minValue % 1 == 'number' && minValue % 1 != 0) {
                    numDecimalsMinValue=minValue.toString().split('.')[1].length
                } else {
                    numDecimalsMinValue=2
                }
                numDecimals=Math.max(numDecimalsMaxValue,numDecimalsMinValue)
            } else {
                numDecimals=2
            }
            meanValue=meanValue.toFixed(numDecimals)
            summary={'max':d3.format(",")(maxValue),'min':d3.format(",")(minValue),'color':this.state.color,'datapointname':this.state.datapointname,'mean':d3.format(",")(meanValue)}
        } else {
            summary={'max':0,'min':0,'color':this.state.color,'datapointname':this.state.datapointname,'mean':0}
        }
        return summary
    },
    cancelSnapshot: function () {
        this.setState({shareModal:false, live: this.state.livePrevious})
    },
    shareSnapshot: function () {
        user_list=this.refs.users.getValue().split(/[\s,]+/);
        PubSub.publish('newWidgetDpSnapshot',{interval:this.state.snapshotInterval,user_list:user_list,wid:this.props.wid})
        this.setState({shareModal:false, live: this.state.livePrevious})
    },
    render: function () {
        console.log('estoy en el render del widget dp');
        if (this.state.summary.hasOwnProperty('datapointname')){
            var summary=React.createElement('tr', null,
                      React.createElement('td', null, this.state.summary.max),
                      React.createElement('td', null, this.state.summary.min),
                      React.createElement('td', null, this.state.summary.mean)
                    );
        } else {
            var summary=React.createElement('tr', null,
                      React.createElement('td', null),
                      React.createElement('td', null),
                      React.createElement('td', null)
                    );
        }
        var data=[{pid:this.state.pid,color:this.state.color,datapointname:this.state.datapointname,data:this.state.data}]
        share_modal=React.createElement(ReactBootstrap.Modal, {show:this.state.shareModal, onHide:this.cancelSnapshot},
                      React.createElement(ReactBootstrap.Modal.Header, {closeButton:true},
                        React.createElement(ReactBootstrap.Modal.Title, null, "Share snapshot")
                      ),
                      React.createElement(ReactBootstrap.Modal.Body, null,
                        React.createElement('div', null,
                          React.createElement(ReactBootstrap.Input, {ref:"users", type:"textarea", label:"Select Users", placeholder:"type users separated by comma"})
                        )
                      ),
                      React.createElement(ReactBootstrap.Modal.Footer, null,
                        React.createElement(ReactBootstrap.Button, {bsStyle:"default", onClick:this.cancelSnapshot}, "Cancel"),
                        React.createElement(ReactBootstrap.Button, {bsStyle:"primary", onClick:this.shareSnapshot}, "Share")
                      )
                    );
        var visContent=this.state.activeVis == 0 ?  React.createElement(ContentLinegraph, {interval:this.state.interval, data:data, newIntervalCallback:this.newIntervalCallback}) : 
            this.state.activeVis == 1 ? React.createElement(ContentHistogram, {data:data}) :
            null;
        return React.createElement('div', null,
                 React.createElement('div', {className:"dp-stats"},
                   React.createElement('table', {className:"table-condensed"},
                     React.createElement('tbody', null,
                       React.createElement('tr', null,
                         React.createElement('th',null,"max"),
                         React.createElement('th',null,"min"),
                         React.createElement('th',null,"mean")
                       ),
                       summary
                     )
                   )
                 ),
                 React.createElement('div', {className:"row visual-bar"},
                   React.createElement('div', {className:"col-md-5 text-center"},
                     React.createElement(ReactBootstrap.ButtonGroup, {bsSize:"xsmall"},
                       React.createElement(ReactBootstrap.Button, {id:"0", active:this.state.activeVis == 0 ? true : false, onClick: this.selectVis },"chart"),
                       React.createElement(ReactBootstrap.Button, {id:"1", active:this.state.activeVis == 1 ? true : false, onClick: this.selectVis },"histogram")
                     )
                   ),
                   React.createElement('div', {className:"col-md-7"},
                     React.createElement(TimeSlider, {interval:this.state.interval, newIntervalCallback:this.newIntervalCallback})
                   )
                 ),
                 React.createElement('div', {className:"row"},
                   React.createElement('div', {className:"col-md-12"}, visContent)
                 ),
                 React.createElement('div', null, share_modal)
               );
    }
});

var WidgetMp = React.createClass({
    getInitialState: function () {
        return {
            interval: {its:undefined,ets:undefined},
            pids: [],
            widgetname: "",
            data: {},
            config: {},
            live: true,
            activeVis: 0,
            shareModal:false,
            shareCounter:this.props.shareCounter,
            snapshotInterval: undefined,
            downloadCounter: this.props.downloadCounter,
            livePrevious: true,
        }
    },
    subscriptionTokens: {},
    componentWillMount: function () {
        this.subscriptionTokens[this.props.wid]=[]
        this.subscriptionTokens[this.props.wid].push({token:PubSub.subscribe('intervalUpdate-'+this.props.wid, this.subscriptionHandler),msg:'intervalUpdate-'+this.props.wid});
        this.subscriptionTokens[this.props.wid].push({token:PubSub.subscribe('widgetConfigUpdate-'+this.props.wid, this.subscriptionHandler),msg:'widgetConfigUpdate-'+this.props.wid});
        this.refreshConfig();
    },
    componentWillUnmount: function () {
        $.map(this.subscriptionTokens[this.props.wid], function (d) {
            PubSub.unsubscribe(d.token)
            }.bind(this));
        delete this.subscriptionTokens[this.props.wid];
    },
    componentDidMount: function () {
        for (var i=0;i<this.state.pids.length;i++) {
            PubSub.publish('datapointConfigReq',{pid:this.state.pids[i]})
            PubSub.publish('datapointDataReq',{pid:this.state.pids[i]})
        }
    },
    componentWillReceiveProps: function (nextProps) {
        if (nextProps.shareCounter>this.state.shareCounter) {
            this.setState({shareModal:true,shareCounter:nextProps.shareCounter, snapshotInterval:this.state.interval, livePrevious:this.state.live, live: false});
        } else if (nextProps.downloadCounter>this.state.downloadCounter) {
            this.downloadContent();
            this.setState({downloadCounter:nextProps.downloadCounter});
        }
    },
    selectVis: function (event) {
        event.preventDefault();
        buttonId=parseInt(event.target.id)
        if (this.state.activeVis != buttonId) {
            this.setState({activeVis:buttonId})
        }
    },
    newIntervalCallback: function (interval) {
        now=new Date().getTime()/1000;
        if (interval.hasOwnProperty('its') && interval.hasOwnProperty('ets')) {
            if (Math.abs(this.state.interval.ets-interval.ets)>1) {
                if (interval.ets < now-30) {
                    this.state.live = false;
                } else {
                    this.state.live = true;
                }
            }
            if (interval.ets > now) {
                interval.ets = now
            }
            for (var i=0;i<this.state.pids.length;i++) {
                PubSub.publish('datapointDataReq',{pid:this.state.pids[i],interval:interval})
            }
            this.refreshData(interval);
        }
    },
    snapshotIntervalCallback: function (interval) {
        now=new Date().getTime()/1000;
        if (interval.hasOwnProperty('its') && interval.hasOwnProperty('ets')) {
            if (interval.its == interval.ets) {
                interval.its=interval.ets-3600
            }
            if (interval.ets > now) {
                interval.ets = now
            }
            this.setState({snapshotInterval:interval})
        }
    },
    downloadContent: function () {
        if (Object.keys(this.state.data).length>0) {
            x={}
            x_final=[]
            y_final=[]
            for (var prop in this.state.config) {
                y={}
                if (prop in this.state.data) {
                    for (var i=0;i<this.state.data[prop].length;i++) {
                        x[this.state.data[prop][i].ts]=0
                        y[this.state.data[prop][i].ts]=this.state.data[prop][i].value
                    }
                    y_final.push(y)
                }
            }
            for (var prop in x) {
                x_final.push(prop)
            }
            x_final.sort(function (a,b) {return a-b})
            if (x_final.length>0) {
                csv="date"
                for (var prop in this.state.config) {
                    csv+=","+this.state.config[prop].datapointname
                }
                csv+="\n"
                for (var i=0;i<x_final.length;i++) {
                    line=new Date(x_final[i]*1000).toISOString();
                    for (var j=0;j<y_final.length;j++) {
                        value=( x_final[i] in y_final[j]) ? y_final[j][x_final[i]] : null
                        line+=value != null ? ","+value : ","
                    }
                    csv+=line+"\n"
                }
                downloadFile(this.state.widgetname+'.csv',csv,'text/csv')
            } else {
                this.props.barMessageCallback({message:{type:'info',message:'No data in selected interval'},messageTime:(new Date).getTime()});
            }
        } else {
            this.props.barMessageCallback({message:{type:'danger',message:'No datapoints in graph'},messageTime:(new Date).getTime()});
        }
    },
    subscriptionHandler: function (msg,data) {
        msgType=msg.split('-')[0]
        switch (msgType) {
            case 'datapointDataUpdate':
                pid=msg.split('-')[1]
                if (this.state.interval.its == undefined || this.state.interval.ets == undefined) {
                    this.refreshData(data.interval);
                } else if (this.state.live == true && data.interval.ets > this.state.interval.ets) {
                    elapsedTs=data.interval.ets-this.state.interval.ets
                    newInterval={its:this.state.interval.its+elapsedTs, ets: data.interval.ets}
                    this.refreshData(newInterval, pid)
                } else if ((this.state.interval.its <= data.interval.its && data.interval.its <= this.state.interval.ets) ||
                           (this.state.interval.its <= data.interval.ets && data.interval.ets <= this.state.interval.ets)) {
                    this.refreshData(this.state.interval, pid)
                }
                break;
            case 'datapointConfigUpdate':
                this.refreshConfig()
                break;
            case 'intervalUpdate':
                this.newIntervalCallback(data.interval)
                break;
            case 'widgetConfigUpdate':
                this.refreshConfig()
                break;
        }
    },
    refreshConfig: function () {
        if (widgetStore._widgetConfig.hasOwnProperty(this.props.wid)) {
            var widgetConfig=widgetStore._widgetConfig[this.props.wid];
            var datapoints={};
            var tokens = this.subscriptionTokens[this.props.wid];
            for (var i=0;i<widgetConfig.datapoints.length;i++) {
                var dataFound = false;
                var configFound = false;
                var pid = widgetConfig.datapoints[i];
                for (var j=0; j<tokens.length;j++) {
                    if (tokens[j].msg == 'datapointConfigUpdate-'+pid) {
                        configFound = true;
                    } else if (tokens[j].msg == 'datapointDataUpdate-'+pid) {
                        dataFound = true;
                    }
                }
                if (!configFound) {
                    tokens.push({token:PubSub.subscribe('datapointConfigUpdate-'+pid, this.subscriptionHandler),msg:'datapointConfigUpdate-'+pid});
                }
                if (!dataFound) {
                    tokens.push({token:PubSub.subscribe('datapointDataUpdate-'+pid, this.subscriptionHandler),msg:'datapointDataUpdate-'+pid});
                }
                if (datapointStore._datapointConfig.hasOwnProperty(pid)) {
                    var datapoint=datapointStore._datapointConfig[pid]
                    datapoints[pid]={pid:pid,color:datapoint.color,datapointname:datapoint.datapointname}
                } else {
                    PubSub.publish('datapointConfigReq',{pid:pid})
                    PubSub.publish('datapointDataReq',{pid:pid})
                }
            }
            this.setState({config:datapoints, pids:widgetConfig.datapoints, widgetname:widgetConfig.widgetname})
        }
    },
    refreshData: function (interval, pid) {
        if (pid) {
            selectedPids=[pid]
        } else {
            selectedPids=this.state.pids
        }
        data=this.state.data
        for (var i=0;i<selectedPids.length;i++) {
            data[selectedPids[i]]=[];
            data[selectedPids[i]]=getIntervalData(selectedPids[i], interval)
        }
        this.setState({interval:interval,data:data})
    },
    onDrop: function (e) {
        var id=e.dataTransfer.getData('id')
        if (id.length==32){
            var data={wid:this.props.wid, 'new_datapoints':[id]}
            PubSub.publish('modifyWidget',data)
        }
    },
    onDragEnter: function (e) {
        e.preventDefault();
    },
    onDragOver: function (e) {
        e.preventDefault();
        return false;
    },
    cancelSnapshot: function () {
        this.setState({shareModal:false, live: this.state.livePrevious})
    },
    shareSnapshot: function () {
        user_list=this.refs.users.getValue().split(/[\s,]+/);
        PubSub.publish('newWidgetMpSnapshot',{interval:this.state.snapshotInterval,user_list:user_list,wid:this.props.wid})
        this.setState({shareModal:false, live: this.state.livePrevious})
    },
    render: function () {
        var summary=$.map(this.state.data, function (element, key) {
            if (this.state.config.hasOwnProperty(key)) {
                var dpSummary=getDataSummary(element)
                var datapointStyle={backgroundColor: this.state.config[key].color, borderRadius: '5px'}
                var name = this.state.config[key].datapointname.slice(-30)
                if (name.length == 30) {
                    name="..."+name
                }
                return React.createElement('tr', {key:key},
                    React.createElement('td', null,
                      React.createElement('span',{style:datapointStyle},"\u00a0\u00a0\u00a0\u00a0"),
                      React.createElement('span',null,"\u00a0\u00a0"),
                      React.createElement('span', null,name)
                    ),
                    React.createElement('td', null, dpSummary.max),
                    React.createElement('td', null, dpSummary.min),
                    React.createElement('td', null, dpSummary.mean)
                );
            }
        }.bind(this));
        var data=$.map(this.state.data, function (element, key) {
            if (this.state.config.hasOwnProperty(key)) {
                return {pid:key,color:this.state.config[key].color,datapointname:this.state.config[key].datapointname,data:element}
            }
        }.bind(this));
        share_modal=React.createElement(ReactBootstrap.Modal, {show:this.state.shareModal, onHide:this.cancelSnapshot},
                      React.createElement(ReactBootstrap.Modal.Header, {closeButton:true},
                        React.createElement(ReactBootstrap.Modal.Title, null, "Share snapshot")
                      ),
                      React.createElement(ReactBootstrap.Modal.Body, null,
                        React.createElement(ReactBootstrap.Input, {ref:"users", type:"textarea", label:"Select Users", placeholder:"type users separated by comma"})
                      ),
                      React.createElement(ReactBootstrap.Modal.Footer, null,
                        React.createElement(ReactBootstrap.Button, {bsStyle:"default", onClick:this.cancelSnapshot}, "Cancel"),
                        React.createElement(ReactBootstrap.Button, {bsStyle:"primary", onClick:this.shareSnapshot}, "Share")
                      )
                    );
        var visContent=this.state.activeVis == 0 ?  React.createElement(ContentLinegraph, {interval:this.state.interval, data:data, newIntervalCallback:this.newIntervalCallback}) : 
            this.state.activeVis == 1 ? React.createElement(ContentHistogram, {data:data}) :
            null;
        return React.createElement('div', {onDrop:this.onDrop, onDragEnter:this.onDragEnter, onDragOver:this.onDragOver},
                 React.createElement('div', {className:"dp-stats"},
                   React.createElement('table', {className:"table-condensed"},
                     React.createElement('tbody', null,
                       React.createElement('tr', null,
                         React.createElement('th',null,""),
                         React.createElement('th',null,"max"),
                         React.createElement('th',null,"min"),
                         React.createElement('th',null,"mean")
                       ),
                       summary
                     )
                   )
                 ),
                 React.createElement('div', {className:"row visual-bar"},
                   React.createElement('div', {className:"col-md-5 text-center"},
                     React.createElement(ReactBootstrap.ButtonGroup, {bsSize:"xsmall"},
                       React.createElement(ReactBootstrap.Button, {id:"0", active:this.state.activeVis == 0 ? true : false, onClick: this.selectVis },"chart"),
                       React.createElement(ReactBootstrap.Button, {id:"1", active:this.state.activeVis == 1 ? true : false, onClick: this.selectVis },"histogram")
                     )
                   ),
                   React.createElement('div', {className:"col-md-7"},
                     React.createElement(TimeSlider, {interval:this.state.interval, newIntervalCallback:this.newIntervalCallback})
                   )
                 ),
                 React.createElement('div', {className:"row"},
                   React.createElement('div', {className:"col-md-12"}, visContent)
                 ),
                 React.createElement('div', null, share_modal)
               );
    }
});

var TimeSlider = React.createClass({
    notifyNewInterval: function(interval) {
        this.props.newIntervalCallback(interval);
    },
    componentDidMount: function () {
        var el = ReactDOM.findDOMNode(this)
        d3TimeSlider.create(el, this.props.interval, this.notifyNewInterval)
    },
    componentDidUpdate: function () {
        var el = ReactDOM.findDOMNode(this)
        d3TimeSlider.update(el, this.props.interval, this.notifyNewInterval)
    },
    render: function () {
        return React.createElement('div', null);
    }
});

var ContentLinegraph = React.createClass({
    getInitialState: function () {
        return {
                zoomInterval: {its:0,ets:0}
        }
    },
    notifyNewInterval: function(interval) {
        this.setState({zoomInterval:interval})
        this.props.newIntervalCallback(interval);
    },
    shouldComponentUpdate: function (nextProps, nextState) {
        if (nextState.zoomInterval.ets != this.state.zoomInterval.ets) {
            //no actualizo otra vez porque es por un nuevo zoom
            return false
        } else if (nextProps.interval.ets == this.state.zoomInterval.ets && nextProps.interval.its == this.state.zoomInterval.its ) {
            //no actualizo otra vez porque es el update provocado por el zoom
            return false
        } else {
            console.log('actualizo el estado del linegraph')
            return true
        }
    },
    componentDidMount: function () {
        var el = ReactDOM.findDOMNode(this)
        d3Linegraph.create(el, this.props.data, this.props.interval, this.notifyNewInterval)
    },
    componentDidUpdate: function () {
        var el = ReactDOM.findDOMNode(this)
        d3Linegraph.update(el, this.props.data, this.props.interval, this.notifyNewInterval)
    },
    render: function () {
        return React.createElement('div', null);
    }
});

var ContentHistogram = React.createClass({
    styles: {
    },
    componentDidMount: function () {
        var el = ReactDOM.findDOMNode(this)
        d3Histogram.create(el, this.props.data)
    },
    componentDidUpdate: function () {
        var el = ReactDOM.findDOMNode(this)
        d3Histogram.update(el, this.props.data)
    },
    render: function () {
        return React.createElement('div', null);
    }
});

var ContentTable = React.createClass({
    styles: {
    },
    componentDidMount: function () {
        var el = ReactDOM.findDOMNode(this)
        d3Table.create(el, this.props.data)
    },
    componentDidUpdate: function () {
        var el = ReactDOM.findDOMNode(this)
        d3Table.update(el, this.props.data)
    },
    render: function () {
        return React.createElement('div', null);
    }
});

var WidgetDsVariable = React.createClass({
    getInitialState: function () {
        return {
                datapoints: this.props.datapoints,
        }
    },
    associateExistingDatapoint: function (event, pid) {
        event.preventDefault();
        console.log('associateExistingDatapoint',pid)
        this.refs.popover.hide()
        this.props.associateExistingDatapointCallback(this.props.position, this.props.length, pid)
    },
    identifyVariable: function () {
        console.log('el click ha llegado')
        datapointname=this.refs.datapointname.getValue();
        if (datapointname.length>1){ 
            this.refs.popover.hide()
            this.props.identifyVariableCallback(this.props.position, this.props.length, datapointname)
        }
    },
    render: function () {
        var already_monitored=$.map(this.state.datapoints, function (element,index) {
                            return React.createElement(ReactBootstrap.MenuItem, {key:index, eventKey:element.pid}, element.datapointname);
        });
        if (already_monitored.length>0) {
            dropdown=React.createElement(ReactBootstrap.Nav, {onSelect:this.associateExistingDatapoint},
                       React.createElement(ReactBootstrap.NavDropdown, {bsSize:"xsmall", title:"Already existing datapoint", id:"nav-dropdown"},already_monitored)
                     );
        } else {
            dropdown=null
        }
        return React.createElement(ReactBootstrap.OverlayTrigger, {ref:"popover", trigger:"click", rootClose:true, placement:"right", overlay:
                 React.createElement(ReactBootstrap.Popover, {id:"datapoint", title:"Identify Datapoint"},
                   React.createElement('div', null,
                     React.createElement('div', {className:"input-group"},
                       React.createElement(ReactBootstrap.Input, {ref:"datapointname", type:"text", className:"form-control", placeholder:"Datapoint name"}),
                       React.createElement('span', {className:"input-group-btn"},
                         React.createElement('button', {type:"submit", className:"btn btn-default", onClick:this.identifyVariable}, "Ok")
                       )
                     )
                   ),
                   dropdown
                 )},
                 React.createElement('span', {className:"variable"}, this.props.content)
               );
    }
});

*/