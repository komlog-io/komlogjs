import React from 'react';
import PubSub from 'pubsub-js';
import * as ReactBootstrap from 'react-bootstrap';
import {getMyUserConfig} from './user-store.js';
import {topics} from './types.js';

class UserHeader extends React.Component {
    state = {
        loading: true,
    };

    subscriptionTokens = [];

    async initialization () {
        var config = await getMyUserConfig();

        var subscribedTopics = [
            topics.MY_USER_CONFIG_UPDATE
        ];

        this.subscriptionTokens = subscribedTopics.map( topic => {
            return {
                token:PubSub.subscribe(topic,this.subscriptionHandler),
                msg:topic
            }
        });

        this.setState({
            loading:false,
            username:config.username,
            uid:config.uid,
            email:config.email,
        });
    }

    subscriptionHandler = (msg,data) => {
        switch (msg) {
            case topics.MY_USER_CONFIG_UPDATE:
                this.refreshConfig();
                break;
        }
    }

    componentDidMount () {
        this.initialization();
    }

    componentWillUnmount () {
        this.subscriptionTokens.forEach( d => {
            PubSub.unsubscribe(d.token);
        });
    }

    async refreshConfig () {
        var shouldUpdate = false;
        var config = await getMyUserConfig();

        if (config.username != this.state.username) {
            shouldUpdate = true;
            newState.username = config.username;
        }
        if (config.uid != this.state.uid){
            shouldUpdate = true;
            newState.uid = config.uid;
        }
        if (config.email != this.state.email) {
            shouldUpdate = true;
            newState.email = config.email;
        }
        if (shouldUpdate) {
            this.setState(newState);
        }
    }

    getUserMenu () {
        if (this.state.loading) {
            return null;
        }
        return (
          <ReactBootstrap.Nav pullRight>
            <ReactBootstrap.NavDropdown id="dropdown" pullRight title={this.state.username}>
              <ReactBootstrap.MenuItem key={1} href="/config">
                Settings
              </ReactBootstrap.MenuItem>
              <ReactBootstrap.MenuItem divider />
              <ReactBootstrap.MenuItem key={2} href="/logout">
                Sign out
              </ReactBootstrap.MenuItem>
            </ReactBootstrap.NavDropdown>
          </ReactBootstrap.Nav>
        );
    }

    render () {
        var userMenu = this.getUserMenu();

        return (
          <ReactBootstrap.Navbar staticTop fluid>
            <ReactBootstrap.Navbar.Header>
              <ReactBootstrap.Navbar.Brand>
                <div className="brand-black" />
              </ReactBootstrap.Navbar.Brand>
              <ReactBootstrap.Navbar.Toggle />
            </ReactBootstrap.Navbar.Header>
            <ReactBootstrap.Navbar.Collapse>
              {userMenu}
            </ReactBootstrap.Navbar.Collapse>
          </ReactBootstrap.Navbar>
        );
    }
}

export {
    UserHeader
}

