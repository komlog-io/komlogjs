import React from 'react';
import ReactCSSTransitionGroup from 'react-addons-css-transition-group';
import PubSub from 'pubsub-js';
import * as ReactBootstrap from 'react-bootstrap';
import {getNodeInfoByUri} from './uri-store.js';
import {topics} from './types.js';

class TreeItem extends React.Component {

    constructor (props) {
        super(props);
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
            style:{paddingLeft:paddingLeft.toString()+'px'},
        };

    }

    componentDidMount () {
        this.refreshTree();
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
        this.setState({collapse:!this.state.collapse, collapseGlyph:collapseGlyph});
        if (this.state.collapse == true) {
            this.refreshTree();
        }
    }

    requestAction = (event) => {
        event.stopPropagation();
        PubSub.publish(topics.URI_ACTION_REQUEST,{id:this.state.id,owner:this.props.owner});
    }

    async refreshTree () {
        var info = await getNodeInfoByUri(this.props.uri, this.props.owner);
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
              <div className='tree'>
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
                    <span style={{paddingLeft:'5px'}} title={this.state.label}>{this.state.label}</span>
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

