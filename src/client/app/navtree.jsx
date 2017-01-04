import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import PubSub from 'pubsub-js';
import * as ReactBootstrap from 'react-bootstrap';
import {uriStore} from './uri-store.js';

class TreeItem extends React.Component {

    subscriptionTokens = [];

    constructor (props) {
        super(props);
        if (props.owner == undefined) {
            this.subscriptionTokens.push({
                token:PubSub.subscribe('localUriUpdate', this.subscriptionHandler),
                msg:'uriUpdate'
            });
        } else {
            this.subscriptionTokens.push({
                token:PubSub.subscribe('remoteUriUpdate.'+props.owner, this.subscriptionHandler),
                msg:'uriUpdate'
            });
        }
        var path=props.uri.split('.');
        var paddingLeft=(props.level)*12;
        if (props.level == 1) {
            var label = props.uri;
        } else {
            var label = path[path.length-1]
        }

        this.state = {
            collapse:true,
            draggable:false,
            children:[],
            collapseGlyph:'menu-right',
            typeGlyph:'unchecked',
            deleteNode: false,
            label:label,
            style:{paddingLeft:paddingLeft.toString()+'px'}
        };

    }

    componentDidMount () {
        PubSub.publish('uriReq',{uri:this.props.uri, owner:this.props.owner});
    }

    componentWillUnmount () {
        this.subscriptionTokens.map( d => {
            PubSub.unsubscribe(d.token);
        });
    }

    subscriptionHandler = (msg,data) => {
        if (this.props.owner == undefined ) {
            switch (msg) {
                case 'localUriUpdate':
                    if (data.uri == this.props.uri) {
                        this.refreshTree();
                    }
                    break;
            }
        } else {
            switch (msg) {
                case 'remoteUriUpdate.'+this.props.owner:
                    if (data.uri == this.props.uri) {
                        this.refreshTree();
                    }
                    break;
            }
        }
    }

    onDragStart = (event) => {
        event.stopPropagation()
        if (this.state.draggable==true) {
            event.dataTransfer.setData('id',this.state.id);
        }
    }

    toggleCollapse = (event) => {
        event.stopPropagation();
        var collapseGlyph = this.state.collapse ? 'menu-down' : 'menu-right';
        if (this.state.collapse == true) {
            PubSub.publish('uriReq',{uri:this.props.uri,owner:this.props.owner});
        }
        this.setState({collapse:!this.state.collapse, collapseGlyph:collapseGlyph});
    }

    requestAction = (event) => {
        event.stopPropagation();
        PubSub.publish('uriActionReq',{id:this.state.id,owner:this.props.owner});
    }

    refreshTree () {
        var info=uriStore.getNodeInfoByUri(this.props.uri, this.props.owner);
        if (info == null) {
            this.setState({deleteNode: true});
            return
        }
        var refresh=false;
        if (this.state.children.length != info.children.length) {
            refresh=true;
        }
        if (!refresh && info.type != this.state.type) {
            refresh=true;
        }
        if (!refresh && info.id != this.state.id) {
            refresh=true;
        }
        if (refresh) {
            var orderedChildren=info.children.sort( (a,b) => a>b ? 1 : -1);
            var draggable=(info.type=='p'? true:false);
            if (info.type=='p'){
                var typeGlyph='stats';
                var hasActions=true;
            } else if (info.type =='d') {
                var typeGlyph='file';
                var hasActions=true;
            } else {
                var typeGlyph='unchecked';
                var hasActions=false;
            }
            this.setState({children:orderedChildren,type:info.type,id:info.id,draggable:draggable,typeGlyph:typeGlyph,hasActions:hasActions});
        }
    }

    render () {
        if (this.state.deleteNode) {
            return null;
        } else if (this.props.uri == '') {
            var children=this.state.children.map( (uri,i) => {
                return <TreeItem key={uri} uri={uri} owner={this.props.owner} level={this.props.level+1} />
            });
            return (
              <div>
                <ReactCSSTransitionGroup transitionName="tree-item" transitionEnterTimeout={500} transitionLeaveTimeout={300}>
                  {children}
                </ReactCSSTransitionGroup>
              </div>
            );
        } else {
            if (this.state.collapse == false) {
                if (this.state.children.length>0) {
                    var collapseIcon=<ReactBootstrap.Glyphicon style={{width:'10px',fontSize:"8px"}} glyph={this.state.collapseGlyph} />
                    var children=this.state.children.map ( (uri, i) => {
                        return <TreeItem key={uri} uri={uri} owner={this.props.owner} level={this.props.level+1} />
                    });
                } else {
                    var collapseIcon=<span style={{marginLeft:'10px'}} />
                    var children=null;
                }
            } else {
                var children=null;
                if (this.state.children.length>0) {
                    var collapseIcon=<ReactBootstrap.Glyphicon style={{width:'10px',fontSize:"8px"}} glyph={this.state.collapseGlyph} />
                } else {
                    var collapseIcon=<span style={{marginLeft:'10px'}} />
                }
            }
            if (this.state.hasActions) {
                var action=<ReactBootstrap.Glyphicon className="action-icon" glyph={this.state.typeGlyph} onClick={this.requestAction} />
            } else {
                action=null;
            }
            return (
              <div>
                <div className='tree-item' draggable={this.state.draggable} onDragStart={this.onDragStart}>
                  {action}
                  <div style={this.state.style} onClick={this.toggleCollapse}>
                    {collapseIcon}
                    <span style={{paddingLeft:'5px'}}>{this.state.label}</span>
                  </div>
                </div>
                <ReactCSSTransitionGroup transitionName='tree-item' transitionEnterTimeout={500} transitionLeaveTimeout={300}>
                  {children}
                </ReactCSSTransitionGroup>
              </div>
            );
        }
    }
}

export {
    TreeItem
}

/*
var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

var TreeItem = React.createClass({
    getInitialState: function () {
        return {
            collapse:true,
            draggable:false,
            children:[],
            collapseGlyph:'menu-right',
            typeGlyph:'unchecked',
            deleteNode: false
        }
    },
    subscriptionTokens: [],
    componentWillMount: function () {
        this.subscriptionTokens = new Array();
        if (this.props.owner == undefined) {
            this.subscriptionTokens.push({
                token:PubSub.subscribe('localUriUpdate', this.subscriptionHandler),
                msg:'uriUpdate'
            });
        } else {
            this.subscriptionTokens.push({
                token:PubSub.subscribe('remoteUriUpdate.'+this.props.owner, this.subscriptionHandler),
                msg:'uriUpdate'
            });
        }
        path=this.props.uri.split('.')
        paddingLeft=(this.props.level)*12
        if (this.props.level == 1) {
            label = this.props.uri
        } else {
            label = path[path.length-1]
        }
        this.setState({label:label,style:{paddingLeft:paddingLeft.toString()+'px'}})
    },
    componentDidMount: function () {
        PubSub.publish('uriReq',{uri:this.props.uri, owner:this.props.owner})
    },
    componentWillUnmount: function () {
        $.map(this.subscriptionTokens, function (d) {
            PubSub.unsubscribe(d.token)
            }.bind(this));
    },
    subscriptionHandler: function (msg,data) {
        if (this.props.owner == undefined ) {
            switch (msg) {
                case 'localUriUpdate':
                    if (data.uri == this.props.uri) {
                        this.refreshTree()
                    }
                    break;
            }
        } else {
            switch (msg) {
                case 'remoteUriUpdate.'+this.props.owner:
                    if (data.uri == this.props.uri) {
                        this.refreshTree()
                    }
                    break;
            }
        }
    },
    onDragStart: function (event) {
        event.stopPropagation()
        if (this.state.draggable==true) {
            event.dataTransfer.setData('id',this.state.id)
        }
    },
    toggleCollapse: function (event) {
        event.stopPropagation();
        collapseGlyph= this.state.collapse ? 'menu-down' : 'menu-right'
        if (this.state.collapse == true) {
            PubSub.publish('uriReq',{uri:this.props.uri,owner:this.props.owner})
        }
        this.setState({collapse:!this.state.collapse, collapseGlyph:collapseGlyph})
    },
    requestAction: function (event) {
        event.stopPropagation();
        PubSub.publish('uriActionReq',{id:this.state.id,owner:this.props.owner});
    },
    refreshTree: function () {
        info=UriStore.getNodeInfoByUri(this.props.uri, this.props.owner)
        if (info == null) {
            this.setState({deleteNode: true});
            return
        }
        var refresh=false
        if (this.state.children.length != info.children.length) {
            refresh=true
        }
        if (!refresh && info.type != this.state.type) {
            refresh=true
        }
        if (!refresh && info.id != this.state.id) {
            refresh=true
        }
        if (refresh) {
            orderedChildren=info.children.sort(function (a,b) {
                return a>b ? 1 : -1;
            });
            draggable=(info.type=='p'? true:false)
            if (info.type=='p'){
                typeGlyph='stats'
                hasActions=true
            } else if (info.type =='d') {
                typeGlyph='file'
                hasActions=true
            } else {
                typeGlyph='unchecked'
                hasActions=false
            }
            this.setState({children:orderedChildren,type:info.type,id:info.id,draggable:draggable,typeGlyph:typeGlyph,hasActions:hasActions})
        }
    },
    render: function () {
        if (this.state.deleteNode) {
            return null;
        } else if (this.props.uri == '') {
            var children=$.map(this.state.children, function (uri,i) {
                return React.createElement(TreeItem, {key:uri, uri:uri, owner:this.props.owner, level:this.props.level+1})
            }.bind(this));

            return React.createElement('div', null,
                     React.createElement(ReactCSSTransitionGroup, {transitionName:"tree-item", transitionEnterTimeout:500, transitionLeaveTimeout:300}, children)
                     );
        } else {
            if (this.state.collapse == false) {
                if (this.state.children.length>0) {
                    var collapseIcon=React.createElement(ReactBootstrap.Glyphicon, {style:{width:'10px',fontSize:"8px"}, glyph:this.state.collapseGlyph});
                    var children=$.map(this.state.children, function (uri, i) {
                        return React.createElement(TreeItem, {key:uri, uri:uri, owner:this.props.owner, level:this.props.level+1});
                    }.bind(this));
                } else {
                    var collapseIcon=React.createElement('span', {style:{marginLeft:'10px'}});
                    var children=null
                }
            } else {
                var children=null
                if (this.state.children.length>0) {
                    var collapseIcon=React.createElement(ReactBootstrap.Glyphicon, {style:{width:'10px',fontSize:"8px"}, glyph:this.state.collapseGlyph});
                } else {
                    var collapseIcon=React.createElement('span', {style:{marginLeft:'10px'}});
                }
            }
            if (this.state.hasActions) {
                var action=React.createElement(ReactBootstrap.Glyphicon, {className:"action-icon", glyph:this.state.typeGlyph, onClick:this.requestAction})
            } else {
                action=null
            }
            return  React.createElement('div', null, 
            React.createElement('div', {className:'tree-item', draggable:this.state.draggable, onDragStart:this.onDragStart},
              action, 
              React.createElement('div', {style:this.state.style, onClick:this.toggleCollapse}, 
                collapseIcon,
                React.createElement('span', {style:{paddingLeft:'5px'}}, this.state.label)
              )
            ),
            React.createElement(ReactCSSTransitionGroup, {transitionName:'tree-item', transitionEnterTimeout:500, transitionLeaveTimeout:300}, children)
            );
        }
    },
});
*/

