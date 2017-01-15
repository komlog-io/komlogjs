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

    generateHtmlContent () {
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
                elements.push({ne:numElement++,type:'text',data:text});
                elements.push({ne:numElement++,type:'nl'});
                start=match.index+match.length-1;
                match = newLineRegex.exec(dsSubContent);
            }
            if (start<position) {
                text=dsSubContent.substr(start,position-start).replace(/ /g, '\u00a0');
                elements.push({ne:numElement++,type:'text',data:text});
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
                    elements.push({ne:numElement++,type:'datapoint',pid:dsData.datapoints[j].pid,p:position,l:length,style:{color:color, fontWeight:'bold'},data:text,datapointname:datapointname});
                    break;
                }
            }
            if (datapointFound == false) {
                text=dsData.content.substr(position,length);
                elements.push({ne:numElement++,type:'text',data:text});
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

    render () {
        if (this.state.loading) {
            return (
              <div style={styles.banner}>
                Loading...
              </div>
            );
        }
        var elements=this.generateHtmlContent();
        var element_nodes=elements.map ( element => {
            if (element.type == 'text') {
                return (
                  <span key={element.ne}>
                    {element.data}
                  </span>
                );
            }else if (element.type == 'nl') {
                return < br key={element.ne} />
            }else if (element.type == 'datapoint') {
                var tooltip=(
                  <ReactBootstrap.Tooltip id='datapoint'>
                    {element.datapointname}
                  </ReactBootstrap.Tooltip>
                );
                return (
                  <ReactBootstrap.OverlayTrigger key={element.ne} placement="top" overlay={tooltip}>
                    <span key={element.ne} style={element.style}>
                      {element.data}
                    </span>
                  </ReactBootstrap.OverlayTrigger>
                );
            }
        });
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
        var dpData = await getDatapointData(this.props.datapoint.pid, this.state.interval, this.props.tid);

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
        var newData = getDatapointData(this.props.datapoint.pid, interval, this.props.tid);
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
            newData = await getDatapointData(this.props.datapoint.pid, newInt, this.props.tid);
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
              <div className="col-md-5 text-center">
                <ReactBootstrap.ButtonGroup bsSize="xsmall">
                  <ReactBootstrap.Button id="0" active={this.state.activeVis == 0 ? true : false} onClick={this.selectVis}>
                    chart
                  </ReactBootstrap.Button>
                  <ReactBootstrap.Button id="1" active={this.state.activeVis == 1 ? true : false} onClick={this.selectVis}>
                    histogram
                  </ReactBootstrap.Button>
                </ReactBootstrap.ButtonGroup>
              </div>
              <div className="col-md-7">
                <TimeSlider interval={this.state.interval} newIntervalCallback={this.newIntervalCallback} />
              </div>
            </div>
            <div className="row">
              <div className="col-md-12">
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
            dpPromises.push(getDatapointData(dp.pid, this.state.interval, this.props.tid));
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

            console.log('estado inicial',newState);
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
            return getDatapointData(dp.pid, interval, this.props.tid);
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
            newData = await getDatapointData(pid, newInt);
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
              <div className="col-md-5 text-center">
                <ReactBootstrap.ButtonGroup bsSize="xsmall">
                  <ReactBootstrap.Button id="0" active={this.state.activeVis == 0 ? true : false} onClick={this.selectVis}>
                    chart
                  </ReactBootstrap.Button>
                  <ReactBootstrap.Button id="1" active={this.state.activeVis == 1 ? true : false} onClick={this.selectVis}>
                    histogram
                  </ReactBootstrap.Button>
                </ReactBootstrap.ButtonGroup>
              </div>
              <div className="col-md-7">
                <TimeSlider interval={this.state.interval} newIntervalCallback={this.newIntervalCallback} />
              </div>
            </div>
            <div className="row">
              <div className="col-md-12">
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

