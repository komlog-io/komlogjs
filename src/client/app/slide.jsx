import React from 'react';
import PubSub from 'pubsub-js';
import {Widget} from './widget.jsx';
import {Snapshot} from './snapshot.jsx';
import {topics} from './types.js';

window.loadSlide = (data) => {
    if (window.screen.availWidth > 767) {
        PubSub.publish(topics.LOAD_SLIDE,data);
    } else {
        var payload = {
            message:{type:'info', message:'To open graphs, access from a tablet or computer'},
            messageTime:(new Date).getTime()
        };
        PubSub.publish(topics.BAR_MESSAGE(),payload);
    }
}


class Slide extends React.Component {
    state = {
        conf: {},
        shareCounter: 0,
    };

    closeCallback = () => {
        PubSub.publish(topics.CLOSE_SLIDE,{lid:this.props.lid});
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
        var className = this.props.focus ? 'Slide blink modal-container':'Slide modal-container';
        return (
          <div className={className}>
            {slide}
          </div>
        );
    }

}

export {
    Slide
}
