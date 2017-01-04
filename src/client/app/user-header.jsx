import React from 'react';
import PubSub from 'pubsub-js';
import * as ReactBootstrap from 'react-bootstrap';
import {userStore} from './user-store.js';

class UserHeader extends React.Component {
    state = {
        username: '',
        uid: null,
        email: ''
    };

    constructor (props) {
        super(props);
        this.subscriptionTokens=[];
        this.subscriptionTokens.push({token:PubSub.subscribe('myUserConfigUpdate', this.subscriptionHandler),msg:'myUserConfigUpdate'});
    }

    subscriptionHandler = (msg,data) => {
        switch (msg) {
            case 'myUserConfigUpdate':
                this.refreshConfig(data);
                break;
        }
    }

    componentDidMount () {
        PubSub.publish('myUserConfigReq',{});
    }

    componentWillUnmount () {
        this.subscriptionTokens.map( d => {
            PubSub.unsubscribe(d.token);
        });
        this.subscriptionTokens=[];
    }

    refreshConfig (uid) {
        var refresh=false;
        if (this.state.uid==null) {
            refresh=true;
        } else if (this.state.uid == uid) {
            refresh=true;
        }
        if (refresh==true) {
            if (userStore._userConfig.hasOwnProperty(uid)) {
                var userConfig=userStore._userConfig[uid];
                this.setState({
                    'username':userConfig.username,
                    'uid':userConfig.uid,
                    'email':userConfig.email,
                });
            }
        }
    }

    render () {
        return (
          <ReactBootstrap.Navbar staticTop={true} fluid={true}>
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
