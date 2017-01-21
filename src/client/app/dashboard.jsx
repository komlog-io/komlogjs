import React from 'react';
import ReactDOM from 'react-dom';
import PubSub from 'pubsub-js';
import {Glyphicon, Collapse, ListGroup, ListGroupItem, Button, Well, Input, Modal} from 'react-bootstrap';
import {getDashboardConfig} from './dashboard-store.js';
import {Slide} from './slide.jsx';
import {topics, styles} from './types.js';


class Dashboard extends React.Component {
    state = {
        loading: true,
    }

    subscriptionTokens = [];

    async initialization () {
        var newState = {};
        var subscribedTopics = [
            topics.LOAD_SLIDE,
            topics.CLOSE_SLIDE,
        ];

        if (this.props.bid != '0') {
            var config = await getDashboardConfig(this.props.bid);
            newState.wids = config.wids;
            newState.slides = config.wids.map( wid => {
                return {lid:wid, type:'wid', isPinned: true};
            });
            newState.dashboardname = config.dashboardname;
            subscribedTopics.push(topics.DASHBOARD_CONFIG_UPDATE(this.props.bid));
        } else {
            newState.slides = [];
            newState.wids = [];
            newState.dashboardname = 'Main Dashboard';
        }

        this.subscriptionTokens = subscribedTopics.map( topic => {
            return {
                token:PubSub.subscribe(topic,this.subscriptionHandler),
                msg:topic
            }
        });

        newState.loading = false;
        this.setState(newState);
    }

    subscriptionHandler = (msg,data) => {
        switch(msg){
            case topics.LOAD_SLIDE:
                this.loadSlide(data)
                break;
            case topics.CLOSE_SLIDE:
                this.closeSlide(data.lid)
                break;
            case topics.DASHBOARD_CONFIG_UPDATE(this.props.bid):
                this.dashboardConfigUpdate();
                break;
        }
    }

    componentDidMount () {
        this.initialization();
    }

    componentWillUnmount () {
        this.subscriptionTokens.forEach( d => {
            PubSub.unsubscribe(d.token)
        });
    }

    async dashboardConfigUpdate () {
        var shouldUpdate = false;
        var newState = {};
        var config = await getDashboardConfig(this.props.bid);
        if (this.state.dashboardname != config.dashboardname) {
            shouldUpdate = true;
            newState.dashboardname = config.dashboardname;
        }
        var newWids = config.wids;
        var oldWids = this.state.wids;
        var deletedWids = oldWids.filter( wid => newWids.indexOf(wid) < 0);
        var addedWids = newWids.filter( wid => oldWids.indexOf(wid) < 0);
        if (deletedWids.length > 0) {
            shouldUpdate = true;
            newState.wids = newWids;
            newState.slides = this.state.slides.map ( slide => {
                if (deletedWids.indexOf(slide.lid) >= 0) {
                    slide.isPinned = false;
                }
                return slide;
            });
        }
        if (addedWids.length > 0) {
            shouldUpdate = true;
            if (deletedWids.length == 0) {
                newState.wids = newWids;
                newState.slides = this.state.slides;
            }
            addedWids.forEach( newWid => {
                var exists = newState.slides.some( slide => slide.lid == newWid);
                if (exists) {
                    newState.slides.forEach( slide => {
                        if (slide.lid == newWid && slide.isPinned == false) {
                            slide.isPinned = true;
                        }
                    });
                } else {
                    var slide = {
                        lid: newWid,
                        type:'wid',
                        isPinned:true
                    }
                    newState.slides.push(slide);
                }
            });
        }
        if (shouldUpdate) {
            this.setState(newState);
        }
    }

    closeDashboard = () => {
        if (this.props.bid != '0') {
            this.props.closeCallback(this.props.bid)
        }
    }

    closeSlide (lid) {
        if (this.props.active == true ) {
            var new_slides=this.state.slides.filter( el => el.lid != lid);
            this.setState({slides:new_slides});
        }
    }

    loadSlide (data) {
        if (this.props.active == true) {
            var slideExists=false;
            if (data.hasOwnProperty('wid')) {
                var lid = data.wid;
                var type = 'wid';
            } else if (data.hasOwnProperty('nid')) {
                var lid = data.nid;
                var type = 'nid';
            } else if (data.hasOwnProperty('pid')) {
                PubSub.publish(topics.LOAD_DATAPOINT_SLIDE,{pid:data.pid});
                return;
            } else if (data.hasOwnProperty('did')) {
                PubSub.publish(topics.LOAD_DATASOURCE_SLIDE,{did:data.did});
                return;
            } else if (data.hasOwnProperty('bid')) {
                PubSub.publish(topics.SHOW_DASHBOARD,{bid:data.bid});
                return;
            } else {
                return;
            }
            var tid=data.tid;
            var slideExists = this.state.slides.some( slide => slide.lid == lid);
            if (!slideExists && lid) {
                if (type=='wid' && this.state.wids.indexOf(lid)>-1) {
                    var isPinned=true;
                } else {
                    var isPinned=false;
                }
                var slide={lid:lid,tid:tid,type:type,isPinned:isPinned};
                var new_slides=this.state.slides;
                new_slides.push(slide);
                PubSub.publish(topics.NEW_SLIDE_LOADED,{slide:slide});
                this.setState({slides:new_slides});
            }
        }
    }

    getSlideList () {
        return this.state.slides.map( slide =>
            <Slide key={slide.lid} bid={this.props.bid} lid={slide.lid} tid={slide.tid} type={slide.type} isPinned={slide.isPinned} />
        );
    }

    render () {
        if (this.state.loading) {
            return (
                <div style={styles.banner}>
                  Loading ...
                </div>
            );
        }
        var slides=this.getSlideList();
        if (this.props.active == true) {
            var display='block';
        } else {
            var display='none';
        }
        return (
          <div className="workspace modal-container" style={{display:display}}>
            <DashboardGrid children={slides} />
          </div>
        );
    }

}

class DashboardHeader extends React.Component {
    constructor (props) {
        super(props);
        this.state = {
            showConfig: false,
            deleteModal: false
        }
    }

    closeDashboard () {
        this.props.closeCallback();
    }

    showConfig () {
        this.setState({showConfig:!this.state.showConfig});
    }

    updateConfig () {
        var new_dashboardname=this.refs.dashboardname.getValue();
        if (new_dashboardname.length>0 && new_dashboardname!=this.props.dashboardname && this.props.bid != '0') {
            var payload = {bid:this.props.bid, new_dashboardname:new_dashboardname};
            PubSub.publish(topics.MODIFY_DASHBOARD, payload);
            this.setState({showConfig:false});
        }
    }

    deleteDashboard () {
        this.setState({deleteModal:true})
    }

    confirmDelete () {
        PubSub.publish(topics.DELETE_DASHBOARD,{bid:this.props.bid});
        this.props.closeCallback();
    }

    cancelDelete () {
        this.setState({deleteModal:false});
    }

    getDashboardHeader () {
        if (this.props.bid == '0') {
            return (
              <div>
                <h3 className="dashboard-header">
                  {this.props.dashboardname}
                </h3>
              </div>
            );
        } else {
            return (
              <div>
                <h3 className="dashboard-header">
                  {this.props.dashboardname}
                  <small>
                    <Glyphicon glyph="remove" className="pull-right" onClick={this.closeDashboard} />
                  </small>
                  <small>
                    <Glyphicon glyph="cog" className="pull-right" onClick={this.showConfig} />
                  </small>
                </h3>
                <Collapse in={this.state.showConfig}>
                  <div>
                    <Well>
                      <ListGroup>
                        <ListGroupItem bsSize="small">
                          <form className="form-horizontal">
                            <Input ref="dashboardname" placeholder={this.props.dashboardname} bsSize="small" type="text" label="Dashboard Name" labelClassName="col-xs-3" wrapperClassName="col-xs-6" />
                            <div className="text-right">
                              <Button bsSize="small" bsStyle="primary" onClick={this.updateConfig}>Update</Button>
                            </div>
                          </form>
                        </ListGroupItem>
                        <ListGroupItem bsSize="small">
                          <strong>Delete Dashboard</strong>
                          <div className="text-right">
                            <Button bsSize="small" bsStyle="danger" onClick={this.deleteDashboard}>Delete</Button>
                          </div>
                        </ListGroupItem>
                      </ListGroup>
                    </Well>
                    <Modal bsSize="small" show={this.state.deleteModal} onHide={this.cancelDelete} container={this} aria-labeledby="contained-modal-title">
                      <Modal.Header closeButton={true}>
                        <Modal.Title id="contained.modal-title">Delete Dashboard</Modal.Title>
                      </Modal.Header>
                      <Modal.Body>
                        Dashboard {this.props.dashboardname} will be deleted<br/>
                        <strong>Are You Sure?</strong>
                      </Modal.Body>
                      <Modal.Footer>
                        <Button bsStyle="default" onClick={this.cancelDelete}>Cancel</Button>
                        <Button bsStyle="primary" onClick={this.confirmDelete}>Delete</Button>
                      </Modal.Footer>
                    </Modal>
                  </div>
                </Collapse>
              </div>
            );
        }
    }

    render () {
        var header=this.getDashboardHeader();
        if (header) {
            return (
              <div>
                header
              </div>
            );
        } else {
            return null;
        }
    }
}

class DashboardGrid extends React.Component {
    state = {
        loading: true,
        columns: 0,
        width: 0,
        cellWidth: 0,
        cells: {},
        colDim: {}
    };

    componentDidMount () {
        var width=ReactDOM.findDOMNode(this).offsetWidth;
        var height=ReactDOM.findDOMNode(this).offsetHeight;
        var minCellWidth = 445;
        var columns = parseInt(width / minCellWidth);
        var cellWidth= parseInt(width / columns);
        var colDim={};
        for (var i = 0; i<columns; i++) {
            colDim[i]={x:i*cellWidth,y:0}
        }
        this.setState({loading:false, cellWidth:cellWidth, columns: columns, colDim:colDim})
    }

    componentDidUpdate () {
        var shouldUpdate = false;
        var cells = this.state.cells;
        var colDim = this.state.colDim;
        var cellsLayout = {};
        // update cells dims
        for (var lid in this.refs) {
            var curX = this.refs[lid].offsetLeft;
            var curY = this.refs[lid].offsetTop;
            var curWidth = this.refs[lid].offsetWidth;
            var curHeight = this.refs[lid].offsetHeight;
            if (cells.hasOwnProperty(lid)) {
                var curCell = cells[lid];
                if (curCell.x != curX || curCell.y != curY || curCell.width != curWidth || curCell.height != curHeight ) {
                    shouldUpdate = true;
                    curCell.x = curX;
                    curCell.y = curY;
                    curCell.width = curWidth;
                    curCell.height = curHeight;
                    if (curWidth == 0 && ReactDOM.findDOMNode(this).offsetWidth != 0) {
                        // si volvemos a cargar un dashboard las widths estaban a 0
                        curCell.width = this.state.cellWidth;
                    }
                }
            } else {
                shouldUpdate = true;
                cells[lid]={x:curX, y:curY, width:curWidth, height:curHeight};
            }
        }
        //nos quedamos con las cells que existen actualmente
        for (var oldLid in cells) {
            var hasIt = false;
            for (var newLid in this.refs) {
                if (oldLid == newLid) {
                    hasIt = true;
                    break;
                }
            }
            if (hasIt == false) {
                shouldUpdate = true;
                delete cells[oldLid];
            } else {
                if (!cellsLayout.hasOwnProperty(cells[newLid].x)) {
                    cellsLayout[cells[newLid].x]=[];
                }
                cellsLayout[cells[newLid].x].push({y:cells[newLid].y, height:cells[newLid].height, ref:newLid});
            }
        }
        var colDimYOld={}
        // reseteamos la longitud de las columnas
        for (var colNum in colDim) {
            colDimYOld[colNum]=colDim[colNum].y;
            colDim[colNum].y=0;
        }
        // ahora tenemos que agrupar las cells si hay huecos o separarlas si hay solapes
        var newY = 0;
        var ref = null;
        for (var col in cellsLayout) {
            cellsLayout[col].sort((a,b) => a.y - b.y);
            newY=0;
            for (var i=0;i<cellsLayout[col].length;i++) {
                ref = cellsLayout[col][i].ref;
                cells[ref].y = newY;
                cellsLayout[col][i].y = newY; // lo necesitaremos en el siguiente paso
                newY += cells[ref].height;
                if (i == cellsLayout[col].length-1) {
                    for (var colNum in colDim) {
                        if (col == colDim[colNum].x) {
                            colDim[colNum].y=cellsLayout[col][i].y+cellsLayout[col][i].height;
                        }
                    }
                }
            }
        }
        // por ultimo, debemos ver si alguna columna tiene demasiadas cells y hay que moverlas a otras columnas
        var relocated = false
        for (var col in cellsLayout) {
            cellsLayout[col].sort((a,b) => b.y - a.y) //descendente
            for (var i=0;i<cellsLayout[col].length;i++) {
                ref = cellsLayout[col][i].ref;
                for (var colNum in colDim) {
                    if (col != colDim[colNum].x && colDim[colNum].y < cellsLayout[col][i].y) {
                        relocated = true;
                        cells[ref].x = colDim[colNum].x;
                        cells[ref].y = colDim[colNum].y;
                        colDim[colNum].y= cells[ref].y+cells[ref].height;
                        break;
                    }
                    relocated = false;
                }
                if (!relocated) {
                    break;
                }
            }
        }
        for (var colNum in colDim) {
            if (colDimYOld[colNum] != colDim[colNum].y) {
                shouldUpdate = true;
            }
        }

        if (shouldUpdate) {
            this.setState({cells:cells, colDim:colDim});
        }
    }

    getGrid () {
        var grid=[];
        if (this.state.columns == 0) {
            return grid;
        } else {
            var cells = this.state.cells;
            var colDim = this.state.colDim;
            var cellWidth = this.state.cellWidth;
            grid = React.Children.map( this.props.children, (child, i) => {
                if (child.props.lid in cells) {
                    var x = cells[child.props.lid].x;
                    var y = cells[child.props.lid].y;
                    var width = cells[child.props.lid].width;
                } else {
                    var x = colDim[0].x;
                    var y = colDim[0].y;
                    var width = cellWidth;
                    for (var col in colDim) {
                        if (colDim[col].y < y ) {
                            x = colDim[col].x;
                            y = colDim[col].y;
                        }
                    }
                }
                var cellStyle={left:x, top:y, width: width};
                return (
                  <div className='grid-element' key={child.props.lid} ref={child.props.lid} style={cellStyle}>
                    {child}
                  </div>
                );
            });
            return grid;
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
        var grid = this.getGrid();
        return (
          <div>
            {grid}
          </div>
        );
    }
}


export default Dashboard;

