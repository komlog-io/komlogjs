import React from 'react';
import PubSub from 'pubsub-js';
import Dashboard from './dashboard.jsx';
import {dashboardStore} from './dashboard-store.js';

class Workspace extends React.Component {
    state = {
        dashboards: [{bid:'0'}],
        activeDashboard: '0',
    };

    subscriptionTokens = [];

    constructor (props) {
        super (props);
        this.subscriptionTokens.push({token:PubSub.subscribe('showDashboard', this.subscriptionHandler),msg:'showDashboard'});
    }


    subscriptionHandler = (msg,data) => {
        switch(msg) {
            case 'showDashboard':
                this.switchActiveDashboard(data.bid)
                break;
        }
    }

    componentWillUnmount () {
        this.subscriptionTokens.map ( d => {
            PubSub.unsubscribe(d.token);
        });
    }

    switchActiveDashboard (bid) {
        if (this.state.activeDashboard.toString() == bid.toString()) {
            return;
        } else {
            for (var i=0; i<this.state.dashboards.length; i++) {
                if (this.state.dashboards[i].bid.toString() == bid.toString()) {
                    this.setState({activeDashboard:bid.toString()});
                    return;
                }
            }
            var dashboard=dashboardStore._dashboardConfig[bid.toString()];
            if (dashboard != undefined && dashboard.dashboardname != undefined) {
                var dashboards=this.state.dashboards
                dashboards.push({bid:bid.toString()})
                this.setState({dashboards:dashboards,activeDashboard:bid.toString()})
            }
        }
    }

    closeDashboard (bid) {
        if (bid.toString() != '0') {
            var dashboards=this.state.dashboards.filter( el => {
                return el.bid.toString() !== bid.toString();
            });
            this.setState({activeDashboard:'0',dashboards:dashboards})
        }
    }

    getDashboards () {
        var dashboards=this.state.dashboards.map( el => {
            var active = this.state.activeDashboard == el.bid ? true : false;
            return <Dashboard key={el.bid} bid={el.bid} active={active} closeCallback={this.closeDashboard} />
        });
        return dashboards;
    }

    render () {
        var dashboards = this.getDashboards();
        return (
          <div className="workspace">
            {dashboards}
          </div>
        )
    }
}

export {
    Workspace
}

/*
var Workspace= React.createClass({
    getInitialState: function () {
        return {
                dashboards: [{bid:'0'}],
                activeDashboard: '0',
               }
    },
    subscriptionTokens: [],
    subscriptionHandler: function(msg,data) {
        switch(msg){
            case 'showDashboard':
                this.switchActiveDashboard(data.bid)
                break;
        }
    },
    componentWillMount: function () {
        this.subscriptionTokens.push({token:PubSub.subscribe('showDashboard', this.subscriptionHandler),msg:'showDashboard'});
    },
    componentWillUnmount: function () {
        this.subscriptionTokens.map(function (d) {
            PubSub.unsubscribe(d.token)
            });
    },
    switchActiveDashboard: function (bid) {
        console.log('switchActiveDashboard');
        if (this.state.activeDashboard.toString() == bid.toString()) {
            console.log('same Dashboard');
            return;
        } else {
            for (var i=0; i<this.state.dashboards.length; i++) {
                if (this.state.dashboards[i].bid.toString() == bid.toString()) {
                    this.setState({activeDashboard:bid.toString()});
                    return;
                }
            }
            dashboard=dashboardStore._dashboardConfig[bid.toString()];
            if (dashboard != undefined && dashboard.dashboardname != undefined) {
                dashboards=this.state.dashboards
                dashboards.push({bid:bid.toString()})
                this.setState({dashboards:dashboards,activeDashboard:bid.toString()})
            }
        }
    },
    closeDashboard: function (bid) {
        if (bid.toString() != '0') {
            dashboards=this.state.dashboards.filter(function (el) {
                return el.bid.toString() !== bid.toString();
            });
            this.setState({activeDashboard:'0',dashboards:dashboards})
        }
    },
    getDashboards: function () {
        dashboards=this.state.dashboards.map(function (el) {
            active=this.state.activeDashboard == el.bid ? true : false;
            return React.createElement(Dashboard, {key:el.bid, bid:el.bid, active:active, closeCallback:this.closeDashboard})
        }.bind(this));
        return dashboards;
    },
    render: function () {
        dashboards = this.getDashboards()
        return React.createElement('div', {className:"workspace"}, dashboards)
    },
});
*/


