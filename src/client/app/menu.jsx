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

    async initialization () {
        var shared = await getSharedUrisWithMe();

        var subscribedTopics = [
            topics.SHARED_URIS_WITH_ME_UPDATE,
        ];

        this.subscriptionTokens = subscribedTopics.map( topic => {
            return {
                token:PubSub.subscribe(topic,this.subscriptionHandler),
                msg:topic
            }
        });

        this.setState({shared:shared});

    }

    subscriptionHandler = (msg,data) => {
        switch (msg) {
            case topics.SHARED_URIS_WITH_ME_UPDATE:
                this.updateSharedList();
                break;
        }
    }

    componentDidMount () {
        this.initialization();
    }

    async updateSharedList () {
        var shared = await getSharedUrisWithMe();
        this.setState({shared:shared});
    }

    getSharedList () {
        var users = Object.keys(this.state.shared);
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
                PubSub.publish(topics.NEW_DASHBOARD,data);
            } else if (this.state.elementType == 'wg' ) {
                var data={type:'mp',widgetname:name};
                PubSub.publish(topics.NEW_WIDGET,data);
            } else {
                var message = {type:'danger', message:'Unknown element type'};
                var now = (new Date).getTime();
                PubSub.publish(topics.BAR_MESSAGE(),{message:message,messageTime:now});
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
                PubSub.publish(topics.URI_REQUEST,{uri:''});
            } else if (eventKey == 3) {
                PubSub.publish(topics.SHARED_URIS_WITH_ME_REQUEST,{});
            }
            this.setState({activeTab:eventKey});
        }
    }

    getContent () {
        var menu;
        if (this.state.activeTab == 1) {
            menu = <DashboardList />;
        } else if (this.state.activeTab == 2) {
            menu = <TreeItem uri='' level={1} />;
        } else {
            menu = <SharedWithMeList />;
        }
        return (
          <div className="side-menu-content">
            {menu}
          </div>
        );
    }

    render () {
        var content = this.getContent();
        return (
          <div>
            <div className="brand" />
            <MenuToolBar />
            <div className="side-menu-tabs">
              <ReactBootstrap.Tabs activeKey={this.state.activeTab} onSelect={this.switchTab} id="menu">
                <ReactBootstrap.Tab eventKey={1} title="Dashboards">
                </ReactBootstrap.Tab>
                <ReactBootstrap.Tab eventKey={2} title="Data model">
                </ReactBootstrap.Tab>
                <ReactBootstrap.Tab eventKey={3} title="Shared with me">
                </ReactBootstrap.Tab>
              </ReactBootstrap.Tabs>
            </div>
            {content}
            <div className="side-menu-footer">
               Made with{" "}
              <span className='glyphicon glyphicon-heart' />
              {" "}by{" "}
              <span className='side-menu-footer-brand'>Komlog</span>
            </div>
          </div>
        );
    }
}


export {
    SideMenu
}

