import React from 'react';
import ReactDOM from 'react-dom';
import PubSub from 'pubsub-js';
import {Glyphicon, Collapse, ListGroup, ListGroupItem, Button, Well, Input, Modal} from 'react-bootstrap';
import {dashboardStore} from './dashboard-store.js';
import Slide from './slide.jsx';


class Dashboard extends React.Component {
    constructor (props) {
        super(props);
        this.subscriptionTokens = {};
        this.subscriptionTokens[props.bid]=[]
        this.subscriptionTokens[props.bid].push({token:PubSub.subscribe('loadSlide', this.subscriptionHandler),msg:'loadSlide'});
        this.subscriptionTokens[props.bid].push({token:PubSub.subscribe('closeSlide', this.subscriptionHandler),msg:'closeSlide'});
        if (props.bid != '0') {
            this.subscriptionTokens[props.bid].push({token:PubSub.subscribe('dashboardConfigUpdate.'+props.bid, this.subscriptionHandler),msg:'dashboardConfigUpdate.'+props.bid});
            this.state = {
                slides: [],
                dashboardname: '',
                wids: []
            };
        } else {
            this.state = {
                slides: [],
                dashboardname: 'Main Dashboard',
                wids: []
            };
        }
    }

    subscriptionHandler = (msg,data) => {
        switch(msg){
            case 'loadSlide':
                console.log('load slide recibido');
                this.loadSlide(data)
                break;
            case 'closeSlide':
                this.closeSlide(data.lid)
                break;
            case 'dashboardConfigUpdate.'+this.props.bid:
                this.dashboardConfigUpdate();
                break;
        }
    }

    componentDidMount () {
        if (this.props.bid != '0') {
            PubSub.publish('dashboardConfigReq',{bid:this.props.bid})
        }
    }

    componentWillUnmount () {
        this.subscriptionTokens[this.props.bid].map( d => {
            PubSub.unsubscribe(d.token)
        });
        delete this.subscriptionTokens[this.props.bid];
    }

    dashboardConfigUpdate () {
        if (dashboardStore._dashboardConfig.hasOwnProperty(this.props.bid)) {
            var dashboard = dashboardStore._dashboardConfig[this.props.bid];
            var state={};
            if (this.state.dashboardname != dashboard.dashboardname) {
                state.dashboardname=dashboard.dashboardname
            }
            if (dashboard.wids.length != this.state.wids.length) {
                state.wids=dashboard.wids
            } else {
                for (var i=0;i<dashboard.wids.length; i++) {
                    if (this.state.wids.indexOf(dashboard.wids[i])==-1) {
                        state.wids=wids
                        break;
                    }
                }
            }
            if (Object.keys(state).length > 0) {
                if (state.hasOwnProperty('wids')) {
                    var slides = this.state.slides;
                    for (var i=0;i<slides.length;i++) {
                        if (slides[i].isPinned == false && state.wids.indexOf(slides[i].lid)>-1 ) {
                            slides[i].isPinned=true;
                        } else if (slides[i].isPinned == true && state.wids.indexOf(slides[i].lid)==-1) {
                            slides[i].isPinned=false;
                        }
                    }
                    for (var i=0;i<state.wids.length;i++) {
                        var slide=slides.filter( el => {
                            return el.lid == state.wids[i]
                        });
                        if (slide.length == 0) {
                            slide={
                                lid:state.wids[i],
                                type:'wid',
                                isPinned:true
                            }
                            slides.push(slide)
                        }
                    }
                    state.slides=slides;
                }
                this.setState(state);
            }
        }
    }

    closeDashboard = () => {
        if (this.props.bid != '0') {
            this.props.closeCallback(this.props.bid)
        }
    }

    closeSlide (lid) {
        if (this.props.active == true ) {
            var new_slides=this.state.slides.filter( el => {
                return el.lid.toString()!==lid.toString();
            });
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
                PubSub.publish('loadDatapointSlide',{pid:data.pid})
                return;
            } else if (data.hasOwnProperty('did')) {
                PubSub.publish('loadDatasourceSlide',{did:data.did})
                return;
            } else if (data.hasOwnProperty('bid')) {
                PubSub.publish('showDashboard',{bid:data.bid})
                return;
            } else {
                return;
            }
            var tid=data.tid;
            for (var i=0; i<this.state.slides.length;i++) {
                if (this.state.slides[i].lid==lid) {
                    slideExists=true
                    break;
                }
            }
            if (slideExists==false && lid) {
                if (type=='wid' && this.state.wids.indexOf(lid)>-1) {
                    var isPinned=true;
                } else {
                    var isPinned=false;
                }
                var slide={lid:lid,tid:tid,type:type,isPinned:isPinned};
                var new_slides=this.state.slides;
                new_slides.push(slide);
                PubSub.publish('newSlideLoaded',{slide:slide});
                this.setState({slides:new_slides});
            }
        }
    }

    getSlideList () {
        var bid = this.props.bid;
        var slides = this.state.slides.map( slide => {
            return <Slide key={slide.shortcut} bid={bid} lid={slide.lid} tid={slide.tid} type={slide.type} isPinned={slide.isPinned} />;
        });
        return slides;
    }

    render () {
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
            PubSub.publish('modifyDashboard',{bid:this.props.bid, new_dashboardname:new_dashboardname});
            this.setState({showConfig:false})
        }
    }

    deleteDashboard () {
        this.setState({deleteModal:true})
    }

    confirmDelete () {
        PubSub.publish('deleteDashboard',{bid:this.props.bid});
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
    constructor (props) {
        super(props);
        this.state = {
            columns: 0,
            width: 0,
            cellWidth: 0,
            cells: {},
            colDim: {}
        }
    }

    componentDidMount () {
        var width=ReactDOM.findDOMNode(this).offsetWidth;
        var height=ReactDOM.findDOMNode(this).offsetHeight;
        var minCellWidth = 450;
        var columns = parseInt(width / minCellWidth);
        var cellWidth= parseInt(width / columns);
        var colDim={};
        for (var i = 0; i<columns; i++) {
            colDim[i]={x:i*cellWidth,y:0}
        }
        this.setState({cellWidth:cellWidth, columns: columns, colDim:colDim})
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
        var grid = this.getGrid();
        return (
          <div>
            {grid}
          </div>
        );
    }
}


export default Dashboard;

/*
var Dashboard=React.createClass({
    getInitialState: function () {
        return {
                slides: [],
                dashboardname: '',
                wids: [],
               }
    },
    shortcutCounter: 1,
    subscriptionTokens: {},
    subscriptionHandler: function(msg,data) {
        switch(msg){
            case 'loadSlide':
                this.loadSlide(data)
                break;
            case 'closeSlide':
                this.closeSlide(data.lid)
                break;
            case 'dashboardConfigUpdate.'+this.props.bid:
                this.dashboardConfigUpdate()
                break;
        }
    },
    componentWillMount: function () {
        this.subscriptionTokens[this.props.bid]=[]
        this.subscriptionTokens[this.props.bid].push({token:PubSub.subscribe('loadSlide', this.subscriptionHandler),msg:'loadSlide'});
        this.subscriptionTokens[this.props.bid].push({token:PubSub.subscribe('closeSlide', this.subscriptionHandler),msg:'closeSlide'});
        if (this.props.bid != '0') {
            this.subscriptionTokens[this.props.bid].push({token:PubSub.subscribe('dashboardConfigUpdate.'+this.props.bid, this.subscriptionHandler),msg:'dashboardConfigUpdate.'+this.props.bid});
        } else {
            this.setState({dashboardname:'Main Dashboard'})
        }
    },
    componentDidMount: function () {
        if (this.props.bid != '0') {
            PubSub.publish('dashboardConfigReq',{bid:this.props.bid})
        }
    },
    componentDidUpdate: function () {
    },
    componentWillUnmount: function () {
        $.map(this.subscriptionTokens[this.props.bid], function (d) {
            PubSub.unsubscribe(d.token)
            }.bind(this));
        delete this.subscriptionTokens[this.props.bid];
    },
    dashboardConfigUpdate: function () {
        dashboard=dashboardStore._dashboardConfig[this.props.bid];
        if (dashboard != undefined) {
            state={}
            if (this.state.dashboardname != dashboard.dashboardname) {
                state.dashboardname=dashboard.dashboardname
            }
            if (dashboard.wids.length != this.state.wids.length) {
                state.wids=dashboard.wids
            } else {
                for (var i=0;i<dashboard.wids.length; i++) {
                    if (this.state.wids.indexOf(dashboard.wids[i])==-1) {
                        state.wids=wids
                        break;
                    }
                }
            }
            if (Object.keys(state).length > 0) {
                if (state.hasOwnProperty('wids')) {
                    slides=this.state.slides
                    for (var i=0;i<slides.length;i++) {
                        if (slides[i].isPinned == false && state.wids.indexOf(slides[i].lid)>-1 ) {
                            slides[i].isPinned=true;
                        } else if (slides[i].isPinned == true && state.wids.indexOf(slides[i].lid)==-1) {
                            slides[i].isPinned=false;
                        }
                    }
                    for (var i=0;i<state.wids.length;i++) {
                        slide=slides.filter( function (el) {
                            return el.lid == state.wids[i]
                        });
                        if (slide.length == 0) {
                            slide={lid:state.wids[i],
                                   shortcut:this.shortcutCounter++,
                                   type:'wid',
                                   isPinned:true}
                            slides.push(slide)
                        }
                    }
                    state.slides=slides;
                }
                this.setState(state);
            }
        }
    },
    closeDashboard: function () {
        if (this.props.bid != '0') {
            this.props.closeCallback(this.props.bid)
        }
    },
    closeSlide: function (lid) {
        if (this.props.active == true ) {
            new_slides=this.state.slides.filter(function (el) {
                    return el.lid.toString()!==lid.toString();
                });
            this.setState({slides:new_slides});
        }
    },
    loadSlide: function (data) {
        if (this.props.active == true) {
            slideExists=false
            if (data.hasOwnProperty('wid')) {
                lid = data.wid
                type = 'wid'
            } else if (data.hasOwnProperty('nid')) {
                lid = data.nid
                type = 'nid'
            } else if (data.hasOwnProperty('pid')) {
                PubSub.publish('loadDatapointSlide',{pid:data.pid})
                return;
            } else if (data.hasOwnProperty('did')) {
                PubSub.publish('loadDatasourceSlide',{did:data.did})
                return;
            } else if (data.hasOwnProperty('bid')) {
                PubSub.publish('showDashboard',{bid:data.bid})
                return;
            } else {
                return;
            }
            tid=data.tid
            for (var i=0; i<this.state.slides.length;i++) {
                if (this.state.slides[i].lid==lid) {
                    slideExists=true
                    break;
                }
            }
            if (slideExists==false && lid) {
                if (type=='wid' && this.state.wids.indexOf(lid)>-1) {
                    isPinned=true
                } else {
                    isPinned=false
                }
                slide={lid:lid,tid:tid,shortcut:this.shortcutCounter++,type:type,isPinned:isPinned}
                new_slides=this.state.slides
                new_slides.push(slide)
                PubSub.publish('newSlideLoaded',{slide:slide})
                this.setState({slides:new_slides});
            }
        }
    },
    getSlideList: function () {
        bid = this.props.bid
        slides = this.state.slides.map( function (slide) {
            return React.createElement(Slide, {key:slide.shortcut, bid:bid, lid:slide.lid, tid:slide.tid, shortcut:slide.shortcut, type:slide.type, isPinned:slide.isPinned});
        });
        return slides
    },
    render: function () {
        slides=this.getSlideList()
        if (this.props.active == true) {
            display='block'
        } else {
            display='none'
        }
        return React.createElement('div', {className:"workspace modal-container", style:{display:display}},
                 //React.createElement(DashboardHeader, {bid:this.props.bid, dashboardname:this.state.dashboardname, closeCallback:this.closeDashboard}),
                 React.createElement(DashboardGrid, {children:slides})
                 );
    },
});

var DashboardHeader= React.createClass({
    getInitialState: function () {
        return {
                showConfig: false,
                deleteModal: false,
               }
    },
    closeDashboard: function () {
        this.props.closeCallback()
    },
    showConfig: function () {
        this.setState({showConfig:!this.state.showConfig})
    },
    updateConfig: function () {
        new_dashboardname=this.refs.dashboardname.getValue();
        if (new_dashboardname.length>0 && new_dashboardname!=this.props.dashboardname && this.props.bid != '0') {
            PubSub.publish('modifyDashboard',{bid:this.props.bid, new_dashboardname:new_dashboardname})
            this.setState({showConfig:false})
        }
    },
    deleteDashboard: function () {
        this.setState({deleteModal:true})
    },
    confirmDelete: function () {
        PubSub.publish('deleteDashboard',{bid:this.props.bid})
        this.props.closeCallback()
    },
    cancelDelete: function () {
        this.setState({deleteModal:false})
    },
    getDashboardHeader: function () {
        if (this.props.bid == '0') {
            return React.createElement('div', null, 
                     React.createElement('h3', {className:"dashboard-header"},
                       this.props.dashboardname
                       )
                     );
        } else {
            return React.createElement('div', null, 
                     React.createElement('h3', {className:"dashboard-header"},
                       this.props.dashboardname,
                       React.createElement('small', null,
                         React.createElement(ReactBootstrap.Glyphicon, {glyph:"remove", className:"pull-right", onClick:this.closeDashboard}," ")
                       ),
                       React.createElement('small', null,
                         React.createElement(ReactBootstrap.Glyphicon, {glyph:"cog", className:"pull-right", onClick:this.showConfig}," ")
                       )
                     ),
                     React.createElement(ReactBootstrap.Collapse, {in:this.state.showConfig}, 
                       React.createElement('div', null, 
                         React.createElement(ReactBootstrap.Well, null, 
                           React.createElement(ReactBootstrap.ListGroup, null,
                             React.createElement(ReactBootstrap.ListGroupItem, {bsSize:"small"},
                               React.createElement('form', {className:"form-horizontal"},
                                 React.createElement(ReactBootstrap.Input, {ref:"dashboardname", placeholder:this.props.dashboardname, bsSize:"small", type:"text", label:"Dashboard Name", labelClassName:"col-xs-3", wrapperClassName:"col-xs-6"}),
                                 React.createElement('div', {className:"text-right"}, 
                                   React.createElement(ReactBootstrap.Button, {bsSize:"small", bsStyle:"primary", onClick:this.updateConfig}, "Update")
                                 )
                               )
                             ),
                             React.createElement(ReactBootstrap.ListGroupItem, {bsSize:"small"},
                               React.createElement('strong', null, "Delete Dashboard"),
                               React.createElement('div', {className:"text-right"}, 
                                 React.createElement(ReactBootstrap.Button, {bsSize:"small", bsStyle:"danger", onClick:this.deleteDashboard}, "Delete")
                               )
                             )
                           )
                         ),
                         React.createElement(ReactBootstrap.Modal, {bsSize:"small", show:this.state.deleteModal, onHide:this.cancelDelete, container:this, "aria-labeledby":"contained-modal-title"},
                           React.createElement(ReactBootstrap.Modal.Header, {closeButton:true},
                             React.createElement(ReactBootstrap.Modal.Title, {id:"contained-modal-title"}, "Delete Dashboard")
                           ), 
                           React.createElement(ReactBootstrap.Modal.Body, null,
                             "Dashboard "+this.props.dashboardname+" will be deleted",
                             React.createElement('strong', null, "Are You Sure?")
                           ),
                           React.createElement(ReactBootstrap.Modal.Footer, null, 
                             React.createElement(ReactBootstrap.Button, {bsStyle:"default", onClick:this.cancelDelete}, "Cancel"),
                             React.createElement(ReactBootstrap.Button, {bsStyle:"primary", onClick:this.confirmDelete}, "Delete")
                           )
                         )
                       )
                     )
                   );
        }
    },
    render: function () {
        header=this.getDashboardHeader();
        if (header) {
            return React.createElement('div', null, header);
        } else {
            return null
        }
    },
});

var DashboardGrid=React.createClass({
    getInitialState: function () {
        return {
            columns: 0,
            width: 0,
            cellWidth: 0,
            cells: {},
            colDim:{},
       }
    },
    componentDidMount: function () {
        var width=ReactDOM.findDOMNode(this).offsetWidth
        var height=ReactDOM.findDOMNode(this).offsetHeight
        var minCellWidth = 450;
        var columns = parseInt(width / minCellWidth);
        var cellWidth= parseInt(width / columns);
        var colDim={}
        for (var i = 0; i< columns; i++) {
            colDim[i]={x:i*cellWidth,y:0}
        }
        this.setState({cellWidth:cellWidth, columns: columns, colDim:colDim})
    },
    componentDidUpdate: function () {
        var shouldUpdate = false;
        var cells = this.state.cells
        var colDim = this.state.colDim
        var cellsLayout = {}
        // update cells dims
        for (var lid in this.refs) {
            var curX = this.refs[lid].offsetLeft
            var curY = this.refs[lid].offsetTop
            var curWidth = this.refs[lid].offsetWidth
            var curHeight = this.refs[lid].offsetHeight
            if (cells.hasOwnProperty(lid)) {
                var curCell = cells[lid]
                if (curCell.x != curX || curCell.y != curY || curCell.width != curWidth || curCell.height != curHeight ) {
                    shouldUpdate = true;
                    curCell.x = curX
                    curCell.y = curY
                    curCell.width = curWidth
                    curCell.height = curHeight
                    if (curWidth == 0 && ReactDOM.findDOMNode(this).offsetWidth != 0) {
                        // si volvemos a cargar un dashboard las widths estaban a 0
                        curCell.width = this.state.cellWidth
                    }
                }
            } else {
                shouldUpdate = true;
                cells[lid]={x:curX, y:curY, width:curWidth, height:curHeight}
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
                delete cells[oldLid]
            } else {
                if (!cellsLayout.hasOwnProperty(cells[newLid].x)) {
                    cellsLayout[cells[newLid].x]=[]
                }
                cellsLayout[cells[newLid].x].push({y:cells[newLid].y, height:cells[newLid].height, ref:newLid})
            }
        }
        var colDimYOld={}
        // reseteamos la longitud de las columnas
        for (var colNum in colDim) {
            colDimYOld[colNum]=colDim[colNum].y
            colDim[colNum].y=0;
        }
        // ahora tenemos que agrupar las cells si hay huecos o separarlas si hay solapes
        var newY = 0
        var ref = null;
        for (var col in cellsLayout) {
            cellsLayout[col].sort(function (a,b) {return a.y - b.y})
            newY=0;
            for (var i=0;i<cellsLayout[col].length;i++) {
                ref = cellsLayout[col][i].ref
                cells[ref].y = newY
                cellsLayout[col][i].y = newY // lo necesitaremos en el siguiente paso
                newY += cells[ref].height
                if (i == cellsLayout[col].length-1) {
                    for (var colNum in colDim) {
                        if (col == colDim[colNum].x) {
                            colDim[colNum].y=cellsLayout[col][i].y+cellsLayout[col][i].height
                        }
                    }
                }
            }
        }
        // por ultimo, debemos ver si alguna columna tiene demasiadas cells y hay que moverlas a otras columnas
        var relocated = false
        for (var col in cellsLayout) {
            cellsLayout[col].sort(function (a,b) {return b.y - a.y}) //descendente
            for (var i=0;i<cellsLayout[col].length;i++) {
                ref = cellsLayout[col][i].ref
                for (var colNum in colDim) {
                    if (col != colDim[colNum].x && colDim[colNum].y < cellsLayout[col][i].y) {
                        relocated = true;
                        cells[ref].x = colDim[colNum].x
                        cells[ref].y = colDim[colNum].y
                        colDim[colNum].y= cells[ref].y+cells[ref].height
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
                shouldUpdate = true
            }
        }
        
        if (shouldUpdate) {
            console.log('voy a actualizar las celdas',cells)
            console.log('las dimensiones de las columnas quedan ',colDim)
            this.setState({cells:cells, colDim:colDim})
        }
    },
    getGrid: function () {
        var grid=[]
        if (this.state.columns == 0) {
            return grid
        } else {
            var cells = this.state.cells
            var colDim = this.state.colDim
            var cellWidth = this.state.cellWidth
            grid = React.Children.map( this.props.children, function (child, i) {
                if (child.props.lid in cells) {
                    var x = cells[child.props.lid].x
                    var y = cells[child.props.lid].y
                    var width = cells[child.props.lid].width
                } else {
                    var x = colDim[0].x;
                    var y = colDim[0].y;
                    var width = cellWidth
                    for (var col in colDim) {
                        if (colDim[col].y < y ) {
                            x = colDim[col].x;
                            y = colDim[col].y;
                        }
                    }
                }
                var cellStyle={left:x, top:y, width: width}
                return React.createElement('div',{className:'grid-element', key:child.props.lid, ref:child.props.lid, style:cellStyle},
                    child
                )
            });
            return grid
        }
    },
    render: function () {
        grid = this.getGrid();
        return React.createElement('div',null,
            grid
        );
    },
});

*/
