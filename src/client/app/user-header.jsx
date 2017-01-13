import React from 'react';
import PubSub from 'pubsub-js';
import * as ReactBootstrap from 'react-bootstrap';
import {getMyUserConfig} from './user-store.js';
import {topics} from './types.js';

class UserHeader extends React.Component {
    state = {
        loading: true,
    };

    constructor (props) {
        super(props);
        this.subscriptionTokens=[];
    }

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
          <ReactBootstrap.Nav pullRight={true}>
            <ReactBootstrap.NavDropdown id="dropdown" noCaret={true} pullRight={true} title={this.state.username}>
              <ReactBootstrap.MenuItem key={1} href="/config">
                <span>
                  <ReactBootstrap.Glyphicon glyph="cog" />
                  {' '}Settings
                </span>
              </ReactBootstrap.MenuItem>
              <ReactBootstrap.MenuItem divider={true} />
              <ReactBootstrap.MenuItem key={2} href="/logout">
                <span>
                  <ReactBootstrap.Glyphicon glyph="log-out" />
                  {' '}Sign out
                </span>
              </ReactBootstrap.MenuItem>
            </ReactBootstrap.NavDropdown>
          </ReactBootstrap.Nav>
        );
    }

    render () {
        var userMenu = this.getUserMenu();

        return (
          <ReactBootstrap.Navbar staticTop={true} fluid={true}>
          {userMenu}
          </ReactBootstrap.Navbar>
        );
    }
}

export {
    UserHeader
}

/*
var UserHeader= React.createClass({
    getInitialState: function () {
        return {username:'',uid:null,email:''}
    },
    subscriptionHandler: function (msg,data) {
        switch (msg) {
            case 'myUserConfigUpdate':
                this.refreshConfig(data)
                break;
        }
    },
    componentWillMount: function () {
        this.subscriptionTokens=[];
        this.subscriptionTokens.push({token:PubSub.subscribe('myUserConfigUpdate', this.subscriptionHandler),msg:'myUserConfigUpdate'});
    },
    componentDidMount: function () {
        PubSub.publish('myUserConfigReq',{})
    },
    componentWillUnmount: function () {
        $.map(this.subscriptionTokens, function (d) {
            PubSub.unsubscribe(d.token)
            }.bind(this));
        this.subscriptionTokens=[];
    },
    refreshConfig: function(uid) {
        refresh=false;
        if (this.state.uid==null) {
            refresh=true;
        } else if (this.state.uid == uid) {
            refresh=true;
        }
        if (refresh==true) {
            if (userStore._userConfig.hasOwnProperty(uid)) {
                userConfig=userStore._userConfig[uid]
                this.setState({'username':userConfig.username,
                               'uid':userConfig.uid,
                               'email':userConfig.email,
                });
            }
        }
    },
    render: function () {
        return React.createElement(ReactBootstrap.Navbar, {staticTop:true, fluid:true},
                 React.createElement(ReactBootstrap.Nav, {pullRight:true},
                   React.createElement(ReactBootstrap.NavDropdown, {id:"dropdown",noCaret:true, pullRight:true, title:this.state.username},
                     React.createElement(ReactBootstrap.MenuItem, {key:1, href:"/config"},
                       React.createElement('span', null,
                         React.createElement(ReactBootstrap.Glyphicon, {glyph:"cog"}),
                         " Settings" 
                       )
                     ),
                     React.createElement(ReactBootstrap.MenuItem, {divider:true}),
                     React.createElement(ReactBootstrap.MenuItem, {key:2, href:"/logout"},
                       React.createElement('span', null,
                         React.createElement(ReactBootstrap.Glyphicon, {glyph:"log-out"}),
                         " Sign out"
                       )
                     )
                   )
                 )
               );
    },
});

ReactDOM.render(
    React.createElement(UserHeader, null)
    ,
    document.getElementById('user-header')
);

*/
