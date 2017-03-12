import React from 'react';
import PubSub from 'pubsub-js';
import * as ReactBootstrap from 'react-bootstrap';
import * as d3 from 'd3';
import * as utils from './utils.js';
import {getSnapshotConfig} from './snapshot-store.js';
import {getDatasourceConfig, getDatasourceData, getDatasourceSnapshotData} from './datasource-store.js';
import {getDataSummary, getDatapointData} from './datapoint-store.js';
import {TimeSlider, ContentLinegraph, ContentHistogram} from './widget.jsx';
import {topics, styles} from './types.js';


class Snapshot extends React.Component {
    state = {
        conf:{},
        shareCounter: 0,
        downloadCounter: 0,
    };

    subscriptionTokens = [];

    async initialization () {
        var conf = await getSnapshotConfig(this.props.nid, this.props.tid);

        var subscribedTopics = [
            topics.SNAPSHOT_CONFIG_UPDATE(this.props.nid),
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
        this.subscriptionTokens.forEach ( d => {
            PubSub.unsubscribe(d.token);
        });
    }

    shouldComponentUpdate (nextProps, nextState) {
        if (this.state.conf != nextState.conf) {
            return true;
        } else if (this.state.downloadCounter != nextState.downloadCounter) {
            return true;
        } else if (this.state.shareCounter != nextState.shareCounter) {
            return true;
        }
        return false;
    }

    subscriptionHandler = (msg,data) => {
        switch (msg) {
            case topics.SNAPSHOT_CONFIG_UPDATE(this.props.nid):
                this.refreshConfig();
                break;
        }
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
        PubSub.publish(topics.BAR_MESSAGE(),{message:data.message,messageTime:data.messageTime});
    }

    async refreshConfig () {
        var newConfig = await getSnapshotConfig(this.props.nid, this.props.tid);
        var shouldUpdate = Object.keys(newConfig).some( key => {
            return !(this.state.conf.hasOwnProperty(key) && this.state.conf[key] == newConfig[key]);
        });
        if (shouldUpdate) {
            this.setState({conf:newConfig});
        }
    }

    getSnapshotContentEl () {
        if (Object.keys(this.state.conf).length == 0) {
            return null;
        } else {
            switch (this.state.conf.type) {
                case 'ds':
                    return <SnapshotDs nid={this.props.nid} tid={this.props.tid} datasource={this.state.conf.datasource} datapoints={this.state.conf.datapoints} its={this.state.conf.its} seq={this.state.conf.seq} downloadCounter={this.state.downloadCounter} />;
                case 'dp':
                    return <SnapshotDp nid={this.props.nid} tid={this.props.tid} datapoint={this.state.conf.datapoint} its={this.state.conf.its} ets={this.state.conf.ets} downloadCounter={this.state.downloadCounter} barMessageCallback={this.barMessage} />;
                case 'mp':
                    return <SnapshotMp nid={this.props.nid} tid={this.props.tid} view={this.state.conf.view} datapoints={this.state.conf.datapoints} its={this.state.conf.its} ets={this.state.conf.ets} downloadCounter={this.state.downloadCounter} widgetname={this.state.conf.widgetname} barMessageCallback={this.barMessage} />;
                default:
                    return null;
            }
        }
    }

    render () {
        var snapshot_content=this.getSnapshotContentEl();
        if (Object.keys(this.state.conf).length == 0) {
            var snapshot=(
              <div>
                <SnapshotBar conf={this.state.conf} closeCallback={this.closeCallback} />
              </div>
            );
        } else {
            var snapshot=(
              <div>
                <SnapshotBar conf={this.state.conf} shareCallback={this.shareCallback} closeCallback={this.closeCallback} downloadCallback={this.downloadCallback} />
                {snapshot_content}
              </div>
            );
        }
        return snapshot;
    }
}

class SnapshotBar extends React.Component {
    styles = {
        barstyle: {
        },
        namestyle: {
            textAlign: 'left',
            width: '80%',
            fontWeight: 'bold',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            direction: 'rtl',
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

    closeClick = () => {
        this.props.closeCallback();
    }

    downloadClick = () => {
        this.props.downloadCallback();
    }

    render () {
        return (
          <div className="SlideBar panel-heading" style={this.styles.barstyle} >
            <ReactBootstrap.Glyphicon className="SlideBarIcon" glyph="remove" onClick={this.closeClick} style={this.styles.righticonstyle} />
            <ReactBootstrap.Glyphicon className="SlideBarIcon" glyph="download" onClick={this.downloadClick} style={this.styles.righticonstyle} />
            <ReactBootstrap.Glyphicon glyph="camera" style={this.styles.lefticonstyle} />
            <div className="SlideBarName" style={this.styles.namestyle}>
              {this.props.conf.widgetname ? this.props.conf.widgetname : ''}
            </div>
          </div>
        );
    }
}

class SnapshotDs extends React.Component {
    state = {
        loading: true,
        downloadCounter:this.props.downloadCounter
    };

    subscriptionTokens = [];

    async initialization () {
        var dsData = await getDatasourceSnapshotData (this.props.datasource.did, this.props.seq, this.props.tid);

        var subscribedTopics = [
            topics.SNAPSHOT_DS_DATA_UPDATE(this.props.datasource.did),
        ];

        this.subscriptionTokens = subscribedTopics.map( topic => {
            return {
                token:PubSub.subscribe(topic,this.subscriptionHandler),
                msg:topic
            }
        });

        this.setState({dsData:dsData,timestamp:dsData.ts,loading:false});
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
        if (nextProps.downloadCounter>this.state.downloadCounter) {
            this.downloadContent();
            this.setState({downloadCounter:nextProps.downloadCounter});
        }
    }

    subscriptionHandler = (msg,data) => {
        switch (msg) {
            case topics.SNAPSHOT_DS_DATA_UPDATE(this.props.datasource.did):
                if (data.hasOwnProperty('seq') && data.seq==this.props.seq) {
                    this.refreshData();
                }
                break;
        }
    }

    async refreshData () {
        var newData = await getDatasourceSnapshotData (this.props.datasource.did, this.props.seq, this.props.tid);
        var shouldUpdate = Object.keys(newData).some ( key => {
            return !(this.state.dsData.hasOwnProperty(key) && this.state.dsData[key] == newData[key]);
        });
        if (shouldUpdate) {
            this.setState({dsData:newData,timestamp:newData.ts});
        }
    }

    downloadContent () {
        if (this.state.dsData.content && this.state.dsData.content.length>0) {
            utils.downloadFile(this.props.datasource.datasourcename+'.txt',this.state.dsData.content,'text/plain');
        }
    }

    getDsInfo () {
        if (this.state.timestamp) {
            var dateFormat = d3.timeFormat("%Y/%m/%d - %H:%M:%S");
            var date = new Date(this.state.timestamp*1000);
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
        var elements=[];
        if (!dsData) {
            return elements;
        }
        var numElement = 0;
        var cursorPosition=0;
        var newLineRegex=/(?:\r\n|\r|\n)/g;
        for (var i=0;i<dsData.variables.length;i++) {
            var position=dsData.variables[i][0];
            var length=dsData.variables[i][1];
            var dsSubContent=dsData.content.substr(cursorPosition,position-cursorPosition);
            var start=0;
            var match = newLineRegex.exec(dsSubContent);
            while(match != null) {
                var text=dsSubContent.substr(start,match.index-start).replace(/ /g, '\u00a0');
                elements.push(<span key={numElement++}>{text}</span>);
                elements.push(<br key={numElement++} />);
                start=match.index+match.length-1;
                match = newLineRegex.exec(dsSubContent);
            }
            if (start<position) {
                text=dsSubContent.substr(start,position-start).replace(/ /g, '\u00a0');
                elements.push(<span key={numElement++}>{text}</span>);
            }
            var datapointFound=false;
            for (var j=0;j<dsData.datapoints.length;j++) {
                if (dsData.datapoints[j].index == dsData.variables[i][0]) {
                    datapointFound=true;
                    text=dsData.content.substr(position,length);
                    var datapointname='...';
                    for (var k=0;k<this.props.datapoints.length;k++) {
                        if (this.props.datapoints[k].pid == dsData.datapoints[j].pid) {
                            datapointname=this.props.datapoints[k].datapointname.split(this.props.datasource.datasourcename);
                            if (datapointname.length == 2) {
                                datapointname = datapointname[1].slice(-20);
                                if (datapointname.length == 20) {
                                    datapointname = "..."+datapointname;
                                }
                            }
                            var color=this.props.datapoints[k].color;
                            break;
                        }
                    }
                    var tooltip=<ReactBootstrap.Tooltip id='datapoint'>{datapointname}</ReactBootstrap.Tooltip>;
                    elements.push(
                      <ReactBootstrap.OverlayTrigger key={numElement++} placement="top" overlay={tooltip}>
                        <span style={{color:color, fontWeight:'bold'}}>
                          {text}
                        </span>
                      </ReactBootstrap.OverlayTrigger>
                    );
                    break;
                }
            }
            if (datapointFound == false) {
                text=dsData.content.substr(position,length);
                elements.push(<span key={numElement++}>{text}</span>);
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
        var dsDatapoints = this.props.datapoints;
        var dsVars = dsData.variables
        var numElement = 0;
        var cursorPosition=0;
        var newContent = ''
        var dsSubContent, start, text, match, datapointname, color, position, length;
        dsVars.forEach( v => {
            position=v[0];
            length=v[1];
            newContent+=dsData.content.substr(cursorPosition,position-cursorPosition);
            var datapointFound=dsData.datapoints.some( dp => {
                if (dp.index == position) {
                    text=dsData.content.substr(position,length);
                    datapointname = '...';
                    color = 'black';
                    dsDatapoints.forEach( state_dp => {
                        if (state_dp.pid == dp.pid) {
                            datapointname = state_dp.datapointname.split(this.props.datasource.datasourcename)[1];
                            color = state_dp.color;
                        }
                    });
                    if (datapointname.length > 20) {
                        datapointname = '...'+datapointname.slice(-20);
                    }
                    if (utils.inJSONString(dsData.content, position)) {
                        var newEl = "/*_k_type/dp/"+text+"/"+datapointname+"/"+dp.pid+"/"+color+"*/"
                    } else {
                        var newEl = JSON.stringify({_k_type:'dp',datapointname:datapointname, pid:dp.pid, text:text, color:color});
                    }
                    newContent+= newEl;
                    return true;
                }
            });
            if (datapointFound == false) {
                text=dsData.content.substr(position,length);
                newContent+= text;
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
            if (obj._k_type == 'dp') {
                var tooltip=<ReactBootstrap.Tooltip id='datapoint'>{obj.datapointname}</ReactBootstrap.Tooltip>;
                return(
                  <ReactBootstrap.OverlayTrigger placement="top" overlay={tooltip}>
                    <span style={{color:obj.color, fontWeight:'bold'}}>
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
                    if (params[1] == "dp") {
                        var tooltip=<ReactBootstrap.Tooltip id='datapoint'>{params[3]}</ReactBootstrap.Tooltip>;
                        result.push(
                          <ReactBootstrap.OverlayTrigger key={child++} placement="top" overlay={tooltip}>
                            <span style={{color:params[5], fontWeight:'bold'}}>
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

    render () {
        if (this.state.loading) {
            return (
              <div style={styles.banner}>
                Loading...
              </div>
            );
        }
        var element_nodes =this.getHtmlContent();
        var info_node=this.getDsInfo();
        return (
          <div>
            {info_node}
            <div className='ds-content'>
              {element_nodes}
            </div>
          </div>
        );
    }
}

class SnapshotDp extends React.Component {
    state = {
        loading: true,
        interval: {its:this.props.its,ets:this.props.ets},
        downloadCounter:this.props.downloadCounter,
        activeVis: 0,
    };

    subscriptionTokens = [];

    async initialization () {
        var dpData = await getDatapointData({pid:this.props.datapoint.pid, interval:this.state.interval, tid:this.props.tid});

        var subscribedTopics = [
            topics.DATAPOINT_DATA_UPDATE(this.props.datapoint.pid)
        ];

        subscribedTopics.forEach(topic => {
            this.subscriptionTokens.push({
                token:PubSub.subscribe(topic,this.subscriptionHandler),
                msg:topic
            });
        });

        var newState = {
            data: dpData.data,
            loading:false
        }
        this.setState(newState);

    }

    componentDidMount () {
        this.initialization();
    }

    componentWillUnmount () {
        this.subscriptionTokens.forEach ( d => {
            PubSub.unsubscribe(d.token);
        });
    }

    componentWillReceiveProps (nextProps) {
        if (nextProps.downloadCounter>this.state.downloadCounter) {
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

    downloadContent () {
        if (this.state.data.length>0) {
            var csv="date,"+this.props.datapoint.datapointname+"\n";
            this.state.data.map( (r,i) => {
                csv+=new Date(r.ts*1000).toISOString()+','+r.value+"\n"
            });
            utils.downloadFile(this.props.datapoint.datapointname+'.csv',csv,'text/csv');
        } else {
            this.props.barMessageCallback({message:{type:'info',message:'No data in selected interval'},messageTime:(new Date).getTime()});
        }
    }

    newIntervalCallback = (interval) => {
        if (interval.its == interval.ets) {
            interval.its=interval.ets-3600;
        }
        if (interval.its<this.props.its) {
            interval.its=this.props.its;
        }
        if (interval.ets>this.props.ets) {
            interval.ets=this.props.ets;
        }
        var newData = getDatapointData({pid:this.props.datapoint.pid, interval:interval, tid:this.props.tid});
        newData.then( dpData => this.setState({interval:interval, data:dpData.data}));
    }

    subscriptionHandler = (msg,data) => {
        switch (msg) {
            case topics.DATAPOINT_DATA_UPDATE(this.props.datapoint.pid):
                this.refreshData(data.interval);
                break;
        }
    }

    async refreshData (interval) {
        var shouldUpdate = false;
        if (interval.its >= this.props.its &&
            interval.its >= this.state.interval.its &&
            interval.ets <= this.props.ets &&
            interval.ets <= this.state.interval.ets) {
            var newData = await getIntervalData(this.props.datapoint.pid, interval, this.props.tid);
            //for new or different samples
            shouldUpdate = newData.data.some( d => {
                var haveIt = this.state.data.some ( e => e.ts == d.ts && e.value == d.value);
                return !haveIt;
            });
            //for deleted samples
            if (!shouldUpdate) {
                var intervalData = this.state.data.filter( d => d.ts >= interval.its && d.ts <= interval.ets);
                if (intervalData.length != newData.data.length) {
                    shouldUpdate = true;
                }
            }
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
            newData = await getDatapointData({pid:this.props.datapoint.pid, interval:newInt, tid:this.props.tid});
            this.setState({data: newData.data, interval:newInterval});
        }
    }

    getDataSummary () {
        var data = this.state.data;
        var totalSamples=data.length;
        if (totalSamples>0) {
            var allValues = data.map( d => d.value);
            var maxValue=Math.max.apply(null, allValues);
            var minValue=Math.min.apply(null, allValues);
            var sumValues = allValues.reduce((a, b) => a + b, 0);
            var meanValue=sumValues/totalSamples;
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
            pid:this.props.datapoint.pid,
            color:this.props.datapoint.color,
            datapointname:this.props.datapoint.datapointname,
            data:this.state.data
        }];
        var visContent=this.state.activeVis == 0 ?  <ContentLinegraph interval={this.state.interval} data={data} newIntervalCallback={this.newIntervalCallback} /> :
            this.state.activeVis == 1 ? <ContentHistogram data={data} /> : null;
        return (
          <div>
            <div className="dp-stats">
              {summary}
            </div>
            <div className="row visual-bar">
              <div className="col-sm-5 text-center">
                <ReactBootstrap.ButtonGroup bsSize="xsmall">
                  <ReactBootstrap.Button id="0" active={this.state.activeVis == 0 ? true : false} onClick={this.selectVis}>
                    chart
                  </ReactBootstrap.Button>
                  <ReactBootstrap.Button id="1" active={this.state.activeVis == 1 ? true : false} onClick={this.selectVis}>
                    histogram
                  </ReactBootstrap.Button>
                </ReactBootstrap.ButtonGroup>
              </div>
              <div className="col-sm-7">
                <TimeSlider interval={this.state.interval} newIntervalCallback={this.newIntervalCallback} />
              </div>
            </div>
            <div className="row">
              <div className="col-sm-12">
                {visContent}
              </div>
            </div>
          </div>
        );
    }
}

class SnapshotMp extends React.Component {
    state = {
        loading: true,
        interval: {its:this.props.its,ets:this.props.ets},
        activeVis: this.props.view,
        downloadCounter: this.props.downloadCounter,
    };

    subscriptionTokens = [];

    async initialization () {
        var subscribedTopics = [];
        var dpPromises = [];
        var newState = {};

        this.props.datapoints.forEach(dp => {
            dpPromises.push(getDatapointData({pid:dp.pid, interval:this.state.interval, tid:this.props.tid}));
            subscribedTopics.push(topics.DATAPOINT_DATA_UPDATE(dp.pid));
        });

        newState.data = {};

        Promise.all(dpPromises).then( values => {
            values.forEach( value => {
                newState.data[value.pid]=value.data;
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
    }

    componentDidMount () {
        this.initialization();
    }


    componentWillUnmount () {
        this.subscriptionTokens.forEach ( d => {
            PubSub.unsubscribe(d.token);
            });
    }

    componentWillReceiveProps (nextProps) {
        if (nextProps.downloadCounter>this.state.downloadCounter) {
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

    downloadContent () {
        if (Object.keys(this.state.data).length>0) {
            var x={};
            var x_final=[];
            var y_final=[];
            for (var i=0,j=this.props.datapoints.length;i<j;i++) {
                var pid=this.props.datapoints[i].pid;
                var y={};
                if (pid in this.state.data) {
                    for (var k=0,l=this.state.data[pid].length;k<l;k++) {
                        x[this.state.data[pid][k].ts]=0;
                        y[this.state.data[pid][k].ts]=this.state.data[pid][k].value;
                    }
                    y_final.push(y);
                }
            }
            for (var prop in x) {
                x_final.push(prop);
            }
            x_final.sort((a,b) => a-b);
            if (x_final.length>0) {
                var csv="date";
                for (var i=0;i<this.props.datapoints.length;i++) {
                    csv+=","+this.props.datapoints[i].datapointname;
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
                utils.downloadFile(this.props.widgetname+'.csv',csv,'text/csv');
            } else {
                this.props.barMessageCallback({message:{type:'info',message:'No data in selected interval'},messageTime:(new Date).getTime()});
            }
        } else {
            this.props.barMessageCallback({message:{type:'danger',message:'No datapoints in graph'},messageTime:(new Date).getTime()});
        }
    }

    newIntervalCallback = (interval) => {
        if (interval.its == interval.ets) {
            interval.its=interval.ets-3600;
        }
        if (interval.its<this.props.its) {
            interval.its=this.props.its;
        }
        if (interval.ets>this.props.ets) {
            interval.ets=this.props.ets;
        }
        var dpPromises = this.props.datapoints.map ( dp => {
            return getDatapointData({pid:dp.pid, interval:interval, tid:this.props.tid});
        });
        Promise.all(dpPromises).then( values => {
            var data = {};
            values.forEach( value => data[value.pid]=value.data);
            this.setState({interval:interval, data:data});
        });
    }

    subscriptionHandler = (msg,data) => {
        var msgType=msg.split('-')[0];
        switch (msgType) {
            case topics.DATAPOINT_DATA_UPDATE():
                var pid=msg.split('-')[1];
                this.refreshData(data.interval, pid);
                break;
        }
    }

    async refreshData (interval, pid) {
        var shouldUpdate = false;
        if (interval.its >= this.props.its &&
            interval.its >= this.state.interval.its &&
            interval.ets <= this.props.ets &&
            interval.ets <= this.state.interval.ets) {
            var newData = await getIntervalData(pid, interval, this.props.tid);
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
                this.props.datapoints.forEach( other_dp => {
                    if (other_dp.pid != pid) {
                        data[other_dp.pid] = this.state.data[other_dp.pid].filter( d => {
                            return d.ts <= interval.ets && d.ts >= interval.its;
                        });
                    }
                });
            } else {
                newInt = this.state.interval;
                this.props.datapoints.forEach ( other_dp => {
                    if (other_dp.pid != pid) {
                        data[other_dp.pid] = this.state.data[other_dp.pid];
                    }
                });
            }
            newData = await getDatapointData({pid:pid, interval:newInt});
            data[pid]=newData.data;
            this.setState({data: data, interval:newInt});
        }
    }

    getDataSummary () {
        var dps = this.props.datapoints;
        var summary = dps.map( (dp,i) => {
            var color = dp.color;
            var datapointname = dp.datapointname;
            datapointname = datapointname.slice(-20);
            if (datapointname.length == 20) {
                datapointname = "..."+datapointname;
            }
            var data = this.state.data[dp.pid];
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

    render () {
        if (this.state.loading) {
            return (
              <div style={styles.banner}>
                Loading...
              </div>
            );
        }
        var summary = this.getDataSummary();
        var data=this.props.datapoints.map( (dp,i) => {
            return {
                pid:dp.pid,
                color:dp.color,
                datapointname:dp.datapointname,
                data:this.state.data[dp.pid]
            };
        });
        var visContent=this.state.activeVis == 0 ? <ContentLinegraph interval={this.state.interval} data={data} newIntervalCallback={this.newIntervalCallback} /> :
            this.state.activeVis == 1 ? <ContentHistogram data={data} /> : null;
        return (
          <div>
            <div className="dp-stats">
              {summary}
            </div>
            <div className="row visual-bar">
              <div className="col-sm-5 text-center">
                <ReactBootstrap.ButtonGroup bsSize="xsmall">
                  <ReactBootstrap.Button id="0" active={this.state.activeVis == 0 ? true : false} onClick={this.selectVis}>
                    chart
                  </ReactBootstrap.Button>
                  <ReactBootstrap.Button id="1" active={this.state.activeVis == 1 ? true : false} onClick={this.selectVis}>
                    histogram
                  </ReactBootstrap.Button>
                </ReactBootstrap.ButtonGroup>
              </div>
              <div className="col-sm-7">
                <TimeSlider interval={this.state.interval} newIntervalCallback={this.newIntervalCallback} />
              </div>
            </div>
            <div className="row">
              <div className="col-sm-12">
                {visContent}
              </div>
            </div>
          </div>
        );
    }
}

export {
    Snapshot
}

