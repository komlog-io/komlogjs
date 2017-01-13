import React from 'react';
import PubSub from 'pubsub-js';
import * as ReactBootstrap from 'react-bootstrap';
import {TreeItem} from './navtree.jsx';
import {getDashboardConfig} from './dashboard-store.js';
import {getSharedUrisWithMe} from './uri-store.js';
import {topics} from './types.js';

class DashboardList extends React.Component {
    state = {
        activeBid: '0',
        dashboards: []
    };

    subscriptionTokens = [];

    async initialization () {
        var dashboards = await getDashboardConfig();

        var info = dashboards.map ( db => {
            return {
                bid:db.bid,
                dashboardname:db.dashboardname
            }
        });

        info.sort( (a,b) => a.dashboardname.localeCompare(b.dashboardname));

        var subscribedTopics = [
            topics.DASHBOARD_CONFIG_UPDATE(),
        ];

        this.subscriptionTokens = subscribedTopics.map( topic => {
            return {
                token:PubSub.subscribe(topic,this.subscriptionHandler),
                msg:topic
            }
        });

        this.setState({dashboards:info});

    }

    componentDidMount () {
        this.initialization();
    }

    subscriptionHandler = (msg,data) => {
        var topic = topics.DASHBOARD_CONFIG_UPDATE();
        var re = new RegExp(topic);
        if (re.test(msg)) {
            this.refreshConfig(data.bid);
        }
    }

    switchDashboard = (bid, event) => {
        event.preventDefault();
        PubSub.publish(topics.SHOW_DASHBOARD,{bid:bid});
        this.setState({activeBid:bid});
    }

    async refreshConfig (bid) {
        var currentDashboards = this.state.dashboards;
        var dashboard = await getDashboardConfig(bid);
        var updated = currentDashboards.some( db => {
           if(db.bid == dashboard.bid && db.dashboardname == dashboard.dashboardname) {
               return true;
           }
        });
        if (!updated) {
            var newDashboards = currentDashboards.filter (db => db.bid != dashboard.bid);
            newDashboards.push({bid:dashboard.bid, dashboardname:dashboard.dashboardname});
            newDashboards.sort( (a,b) => a.dashboardname.localeCompare(b.dashboardname));
            this.setState({dashboards:newDashboards});
        }
    }

    getDashboardList () {
        var activeBid = this.state.activeBid;
        var listItems=this.state.dashboards.map( (e,i) =>
              <li key={i+1}
                  className={activeBid == e.bid ? "list-item-active" : "list-item"}
                  onClick={this.switchDashboard.bind(this, e.bid)}>
                {e.dashboardname}
              </li>
        );
        return (
          <ul className="menu-list">
            <li key={0}
                className={activeBid == 0 ? "list-item-active" : "list-item"}
                onClick={this.switchDashboard.bind(this,'0')}>
              Home
            </li>
            {listItems}
          </ul>
        );
    }

    render () {
        var dashboardList = this.getDashboardList();
        return dashboardList;
    }
}

class SharedWithMeList extends React.Component {
    state = {
        shared:{}
    };

    subscriptionTokens = [];

    constructor (props) {
        super(props);
        this.subscriptionTokens.push({token:PubSub.subscribe('sharedUrisWithMeUpdate', this.subscriptionHandler),msg:'sharedUrisWithMeUpdate'});
    }

    subscriptionHandler = (msg,data) => {
        if (/sharedUrisWithMeUpdate/.test(msg)) {
            this.updateSharedList();
        }
    }

    componentDidMount () {
        PubSub.publish('sharedUrisWithMeReq',{});
    }

    updateSharedList () {
        var shared = getSharedUrisWithMe();
        this.setState({shared:shared});
    }

    getSharedList () {
        var users = [];
        for(var key in this.state.shared){
           users.push(key);
        }
        users = users.sort( (a,b) => {
            return a>b ? 1: -1;
        });
        var items = users.map( user => {
            var uris = this.state.shared[user];
            uris = uris.sort( (a,b) => {
                return a>b ? 1 : -1;
            });
            var userUris = uris.map( uri => {
                return (
                  <div key={uri}>
                    <TreeItem key={uri} uri={uri} owner={user} level={1} />
                  </div>
                );
            });
            return (
              <li key={user} className='shared-list'>
                <span className="shared-list-user">
                  <span className="glyphicon glyphicon-user" />
                  <span className="shared-list-user-name">{user}</span>
                </span>
                {userUris}
              </li>
            );
        });
        return items;
    }

    render () {
        var list = this.getSharedList();
        return (
          <ul className="menu-list">
            {list}
          </ul>
        );
    }
}


class MenuToolBar extends React.Component {
    state = {
        inputName:'',
        inputStyle:null,
        inputPlaceholder:'Name',
        showModal: false,
        modalTitle: '',
        elementType: '',
    };

    handleChange = (event) => {
        var name=event.target.value;
        this.setState({inputName:name,inputStyle:'success'});
    }

    newGraph = () => {
        this.setState({
            showModal: true,
            modalTitle: 'New Graph',
            elementType: 'wg'
        });
    }

    newDashboard = () => {
        this.setState({
            showModal: true,
            modalTitle: 'New Dashboard',
            elementType: 'db'
        });
    }

    closeModal = () => {
        this.setState({
            inputName:'',
            inputStyle:'',
            showModal:false,
            modalTitle:'',
            elementType:''
        });
    }

    newElement = () => {
        var name=this.state.inputName;
        if (name.length==0) {
           this.setState({inputStyle:'error'});
        } else {
            if (this.state.elementType == 'db') {
                var data={dashboardname:name};
                PubSub.publish('newDashboard',data);
            } else if (this.state.elementType == 'wg' ) {
                var data={type:'mp',widgetname:name};
                PubSub.publish('newWidget',data);
            } else {
                var message = {type:'danger', message:'Unknown element type'};
                var now = (new Date).getTime();
                PubSub.publish('barMessage',{message:message,messageTime:now});
            }
            this.closeModal();
        }
    }

    render () {
        var inputOptions = (
          <ReactBootstrap.Dropdown id="menu">
            <ReactBootstrap.Dropdown.Toggle noCaret={true}>
              <ReactBootstrap.Glyphicon glyph="plus" />
            </ReactBootstrap.Dropdown.Toggle>
            <ReactBootstrap.Dropdown.Menu>
              <ReactBootstrap.MenuItem ref="newGraph" onSelect={this.newGraph}>
                <span>
                  <ReactBootstrap.Glyphicon glyph="equalizer" />
                  {" "}New graph
                </span>
              </ReactBootstrap.MenuItem>
              <ReactBootstrap.MenuItem ref="newDashboard" onSelect={this.newDashboard}>
                <span>
                  <ReactBootstrap.Glyphicon glyph="th-large" />
                  {" "}New dashboard
                </span>
              </ReactBootstrap.MenuItem>
            </ReactBootstrap.Dropdown.Menu>
          </ReactBootstrap.Dropdown>
        );
        var nameModal = (
          <ReactBootstrap.Modal show={this.state.showModal} onHide={this.closeModal} enforceFocus={true}>
            <ReactBootstrap.Modal.Header closeButton={true}>
              <ReactBootstrap.Modal.Title>{this.state.modalTitle}</ReactBootstrap.Modal.Title>
            </ReactBootstrap.Modal.Header>
            <ReactBootstrap.Modal.Body>
              <ReactBootstrap.FormControl onChange={this.handleChange} placeholder={this.state.inputPlaceholder} value={this.state.inputName} bsStyle={this.state.inputStyle} ref="inputName" type="text" autoFocus={true} />
            </ReactBootstrap.Modal.Body>
            <ReactBootstrap.Modal.Footer>
              <ReactBootstrap.Button bsStyle="default" onClick={this.closeModal}>Cancel</ReactBootstrap.Button>
              <ReactBootstrap.Button bsStyle="primary" onClick={this.newElement}>Create</ReactBootstrap.Button>
            </ReactBootstrap.Modal.Footer>
          </ReactBootstrap.Modal>
        );
        return (
          <div className='side-menu-toolbar'>
            {inputOptions}
            {nameModal}
          </div>
        );
    }
}

class SideMenu extends React.Component {
    state = {
        activeTab: 1
    };

    switchTab = (eventKey) => {
        if (eventKey != this.state.activeTab) {
            if (eventKey == 2) {
                PubSub.publish('uriReq',{uri:''});
            } else if (eventKey == 3) {
                PubSub.publish('sharedUrisWithMeReq',{});
            }
            this.setState({activeTab:eventKey});
        }
    }

    render () {
        var brand="_< Komlog";
        return (
          <div>
            <div className="brand">{brand}</div>
            <MenuToolBar />
            <ReactBootstrap.Tabs activeKey={this.state.activeTab} onSelect={this.switchTab} id="menu">
              <ReactBootstrap.Tab eventKey={1} title="Dashboards">
                <DashboardList />
              </ReactBootstrap.Tab>
              <ReactBootstrap.Tab eventKey={2} title="Data model">
                <TreeItem uri='' level={1} />
              </ReactBootstrap.Tab>
              <ReactBootstrap.Tab eventKey={3} title="Shared with me">
                <SharedWithMeList />
              </ReactBootstrap.Tab>
            </ReactBootstrap.Tabs>
            <div className="side-footer">
               Made with{" "}
              <span className='glyphicon glyphicon-heart' />
              {" "}by{" "}
              <span className='side-footer-brand'>Komlog</span>
            </div>
          </div>
        );
    }
}


export {
    SideMenu
}



/*
var SideMenu = React.createClass({
    getInitialState: function () {
        return {
            activeTab: 1
        }
    },
    componentDidMount: function () {
    },
    switchTab: function (eventKey) {
        if (eventKey != this.state.activeTab) {
            if (eventKey == 2) {
                PubSub.publish('uriReq',{uri:''})
            } else if (eventKey == 3) {
                PubSub.publish('sharedUrisWithMeReq',{})
            }
            this.setState({activeTab:eventKey})
        }
    },
    render: function () {
        return React.createElement('div', null,
            React.createElement('div',{className:"brand"},"_< Komlog"),
            React.createElement(MenuToolBar,null),
            React.createElement(ReactBootstrap.Tabs, {activeKey:this.state.activeTab, onSelect: this.switchTab},
              React.createElement(ReactBootstrap.Tab, {eventKey:1, title:"Dashboards"}, React.createElement(DashboardList)),
              React.createElement(ReactBootstrap.Tab, {eventKey:2, title:"Data model"}, React.createElement(TreeItem, {uri:'', level:1})),
              React.createElement(ReactBootstrap.Tab, {eventKey:3, title:"Shared with me"}, React.createElement(SharedWithMeList))
            ),
            React.createElement('div',{className:"side-footer"},
              "Made with ",
              React.createElement('span',{className:'glyphicon glyphicon-heart'}),
              " by ",
              React.createElement('span',{className:'side-footer-brand'},"Komlog")
            )
        );
    }
});

var DashboardList = React.createClass ({
    getInitialState: function () {
        return {
            activeBid: '0'
        }
    },
    subscriptionTokens: [],
    componentWillMount: function () {
        this.subscriptionTokens.push({token:PubSub.subscribe('dashboardConfigUpdate', this.subscriptionHandler),msg:'dashboardConfigUpdate'});

    },
    subscriptionHandler: function (msg,data) {
        if (/dashboardConfigUpdate/.test(msg)) {
            this.updateDashboardList();
        }
    },
    componentDidMount: function () {
        PubSub.publish('dashboardsConfigReq',{})
    },
    switchDashboard: function (bid, event) {
        event.preventDefault();
        PubSub.publish('showDashboard',{bid:bid})
        this.setState({activeBid:bid})
    },
    updateDashboardList: function () {
        this.forceUpdate();
    },
    getDashboardList: function () {
        var dashboards=[]
        var activeBid = this.state.activeBid
        for (var bid in dashboardStore._dashboardConfig) {
            dashboards.push({bid:bid, dashboardname:dashboardStore._dashboardConfig[bid].dashboardname})
        }
        dashboards.sort(function (a,b) {
            return a.dashboardname.localeCompare(b.dashboardname);
        });
        var listItems=$.map(dashboards, function (e,i) {
            var className=activeBid == e.bid ? "list-item-active" : "list-item"
            return React.createElement('li', {key:i+1, className:className, onClick:this.switchDashboard.bind(this, e.bid)},e.dashboardname);
        }.bind(this))
        var className=activeBid == 0 ? "list-item-active" : "list-item"
        return React.createElement('ul', {className:"menu-list"},
                 React.createElement('li', {key:0, className:className, onClick:this.switchDashboard.bind(this,'0')},"Home"),
                 listItems
               );
    },
    render: function () {
        var dashboardList = this.getDashboardList()
        return dashboardList
    }
});

var SharedWithMeList = React.createClass ( {
    getInitialState: function () {
        return {
            shared:{},
        }
    },
    subscriptionTokens: [],
    componentWillMount: function () {
        this.subscriptionTokens.push({token:PubSub.subscribe('sharedUrisWithMeUpdate', this.subscriptionHandler),msg:'sharedUrisWithMeUpdate'});
    },
    subscriptionHandler: function (msg,data) {
        if (/sharedUrisWithMeUpdate/.test(msg)) {
            this.updateSharedList();
        }
    },
    componentDidMount: function () {
        PubSub.publish('sharedUrisWithMeReq',{})
    },
    updateSharedList: function () {
        shared = getSharedUrisWithMe()
        this.setState({shared:shared});
    },
    getSharedList: function () {
        var users = [];
        for(var key in this.state.shared){
           users.push(key);
        }
        users = users.sort(function (a,b) {
            return a>b ? 1: -1;
        });
        var items = users.map(function (user) {
            var uris = this.state.shared[user]
            uris = uris.sort(function (a,b) {
                return a>b ? 1 : -1;
            });
            var userUris = uris.map( function (uri) {
                return React.createElement('div',{key:uri},
                  React.createElement(TreeItem, {key:uri,uri:uri,owner:user,level:1})
                );
            });
            return React.createElement('li',{key:user,className:'shared-list'},
              React.createElement('span',{className:"shared-list-user"},
                React.createElement('span',{className:"glyphicon glyphicon-user"}),
                React.createElement('span',{className:"shared-list-user-name"},user)
              ),
              userUris
            );
        }.bind(this));
        return items;
    },
    render: function () {
        var list = this.getSharedList()
        return React.createElement('ul', {className:"menu-list"},
          list
      );
    }
});


var MenuToolBar= React.createClass({
    getInitialState: function () {
        return {
            inputName:'',
            inputStyle:null,
            inputPlaceholder:'Name',
            showModal: false,
            modalTitle: '',
            elementType: '',
        }
    },
    handleChange: function () {
        name=this.refs.inputName.getValue();
        this.setState({inputName:name,inputStyle:null})
    },
    newGraph: function () {
        this.setState({showModal: true, modalTitle: 'New Graph', elementType: 'wg'});
    },
    newDashboard: function () {
        this.setState({showModal: true, modalTitle: 'New Dashboard', elementType: 'db'});
    },
    closeModal: function () {
        this.setState({inputName:'', inputStyle:'', showModal:false, modalTitle: '', elementType: ''});
    },
    newElement: function () {
        name=this.refs.inputName.getValue();
        if (name.length==0) {
           this.setState({inputStyle:'error'})
        } else {
            if (this.state.elementType == 'db') {
                data={dashboardname:name}
                PubSub.publish('newDashboard',data)
            } else if (this.state.elementType == 'wg' ) {
                data={type:'mp',widgetname:name}
                PubSub.publish('newWidget',data)
            } else {
                message = {type:'danger', message:'Unknown element type'}
                now = (new Date).getTime()
                PubSub.publish('barMessage',{message:message,messageTime:now})
            }
            this.closeModal()
        }
    },
    render: function () {
        inputOptions=React.createElement(ReactBootstrap.Dropdown, {id:"menu"},
            React.createElement(ReactBootstrap.Dropdown.Toggle, {noCaret:true},
                React.createElement(ReactBootstrap.Glyphicon, {glyph:"plus"})
            ),
            React.createElement(ReactBootstrap.Dropdown.Menu, null,
                React.createElement(ReactBootstrap.MenuItem, {ref:"newGraph", onSelect:this.newGraph},
                    React.createElement('span', null,
                        React.createElement(ReactBootstrap.Glyphicon, {glyph:"equalizer"}), " New graph")
                ),
                React.createElement(ReactBootstrap.MenuItem, {ref:"newDashboard", onSelect:this.newDashboard},
                    React.createElement('span', null,
                        React.createElement(ReactBootstrap.Glyphicon, {glyph:"th-large"}), " New dashboard")
                )
            )
        );
        nameModal = React.createElement(ReactBootstrap.Modal, {show:this.state.showModal, onHide:this.closeModal, enforceFocus: true},
            React.createElement(ReactBootstrap.Modal.Header, {closeButton: true}, 
                React.createElement(ReactBootstrap.Modal.Title,null ,this.state.modalTitle)
            ),
            React.createElement(ReactBootstrap.Modal.Body, null,
                React.createElement(ReactBootstrap.Input, {onChange:this.handleChange, placeholder:this.state.inputPlaceholder, value:this.state.inputName, bsStyle:this.state.inputStyle, ref:"inputName", type:"text", autoFocus:true})
            ),
            React.createElement(ReactBootstrap.Modal.Footer, null,
                React.createElement(ReactBootstrap.Button, {bsStyle:"default", onClick:this.closeModal}, "Cancel"),
                React.createElement(ReactBootstrap.Button, {bsStyle:"primary", onClick:this.newElement}, "Create")
            )
        );
        return React.createElement('div',{className:'side-menu-toolbar'},
            inputOptions,
            nameModal
        );
    }
});

ReactDOM.render(
    React.createElement(SideMenu,null)
    ,
    document.getElementById('side-menu')
);

*/
