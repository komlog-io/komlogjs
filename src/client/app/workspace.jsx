import React from 'react';
import PubSub from 'pubsub-js';
import Dashboard from './dashboard.jsx';
import {getDashboardConfig} from './dashboard-store.js';
import {topics} from './types.js';

class Workspace extends React.Component {
    state = {
        dashboards: [{bid:'0'}],
        activeDashboard: '0',
    };

    initialization () {
        var subscribedTopics = [
            topics.SHOW_DASHBOARD
        ];

        this.subscriptionTokens = subscribedTopics.map( topic => {
            return {
                token:PubSub.subscribe(topic,this.subscriptionHandler),
                msg:topic
            }
        });

    }

    componentDidMount () {
        this.initialization();
    }

    componentWillUnmount () {
        this.subscriptionTokens.map ( d => {
            PubSub.unsubscribe(d.token);
        });
    }

    subscriptionHandler = (msg,data) => {
        switch(msg) {
            case topics.SHOW_DASHBOARD:
                this.switchActiveDashboard(data.bid)
                break;
        }
    }

    async switchActiveDashboard (bid) {
        if (this.state.activeDashboard == bid) {
            return;
        }
        var dashboards = this.state.dashboards;
        var alreadyExists = dashboards.some ( db => db.bid == bid);
        if (alreadyExists) {
            this.setState({activeDashboard:bid});
            return;
        }
        var dbConfig = await getDashboardConfig(bid);
        if (dbConfig) {
            dashboards.push({bid:bid});
            this.setState({activeDashboard:bid, dashboards:dashboards});
            return;
        }
    }

    closeDashboard (bid) {
        if (bid != '0') {
            var newState = {}
            var exists = this.state.dashboards.some ( db => db.bid == bid);
            if (exists) {
                newState.dashboards=this.state.dashboards.filter( el => el.bid !== bid);
                if (this.state.activeDashboard == bid) {
                    newState.activeDashboard = '0';
                }
                this.setState(newState);
            }
        }
    }

    getDashboards () {
        var dashboards=this.state.dashboards.map( db => {
            var active = this.state.activeDashboard == db.bid ? true : false;
            return <Dashboard key={db.bid} bid={db.bid} active={active} closeCallback={this.closeDashboard} />
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

