import React from 'react';
import PubSub from 'pubsub-js';
import {Widget} from './widget.jsx';
import {Snapshot} from './snapshot.jsx';

window.loadSlide = (data) => {
    PubSub.publish('loadSlide',data);
}


class Slide extends React.Component {
    state = {
        conf: {},
        shareCounter: 0
    };

    closeCallback = () => {
        PubSub.publish('closeSlide',{lid:this.props.lid});
    }

    getSlideEl () {
        switch (this.props.type) {
            case 'wid':
                return <Widget bid={this.props.bid} closeCallback={this.closeCallback} wid={this.props.lid} isPinned={this.props.isPinned} />
                break;
            case 'nid':
                return <Snapshot closeCallback={this.closeCallback} nid={this.props.lid} tid={this.props.tid} />
                break;
            default:
                return null;
                break;
        }
    }

    render () {
        var slide = this.getSlideEl();
        return (
          <div className='Slide modal-container'>
            {slide}
          </div>
        );
    }

}

/*
var Slide = React.createClass({
    getInitialState: function () {
        return {
                conf:{},
                shareCounter: 0,
                }
    },
    closeCallback: function() {
        PubSub.publish('closeSlide',{lid:this.props.lid})
    },
    getSlideEl: function () {
        switch (this.props.type) {
            case 'wid':
                return React.createElement(Widget, {bid:this.props.bid, closeCallback:this.closeCallback, wid:this.props.lid, isPinned:this.props.isPinned})
                break;
            case 'nid':
                return React.createElement(Snapshot, {closeCallback:this.closeCallback, nid:this.props.lid, tid:this.props.tid})
                break;
            default:
                return null;
                break;
        }
    },
    render: function() {
        slide=this.getSlideEl();
        return React.createElement('div', {className:"Slide modal-container"}, slide)
    },
});

*/

export default Slide;
