import React from 'react';
import ReactDOM from 'react-dom';
import PubSub from 'pubsub-js';
import * as ReactBootstrap from 'react-bootstrap';
import {topics} from './types.js';

class Alert extends React.Component {

    static propTypes = {
        type: React.PropTypes.string,
        message: React.PropTypes.string,
        autoCloseable: React.PropTypes.bool,
        messageTime: React.PropTypes.number
    };

    static defaultProps = {
        closeLabel: "Close",
        autoCloseable: true
    };

    state = {
        type:this.props.type,
        message:this.props.message,
        messageTime:0
    };

    componentWillUnmount = () => {
        clearTimeout(this.dismissTimer);
    }

    componentDidMount = () => {
        if (this.props.autoCloseable) {
            this.dismissTimer = setTimeout(this.dismiss, 3000);
        }
    }

    componentWillReceiveProps = (nextProps) => {
        if (nextProps.messageTime>this.state.messageTime) {
            clearTimeout(this.dismissTimer);
            if (nextProps.autoCloseable == true) {
                this.dismissTimer = setTimeout(this.dismiss, 3000);
            }
            this.setState({message:nextProps.message, type:nextProps.type, messageTime:nextProps.messageTime});
        }
    }

    dismiss = () => {
        clearTimeout(this.dismissTimer);
        this.setState({message:null,type:null});
    }

    render () {
        if (this.state.message != null) {
            var alertInstance = (
              <ReactBootstrap.Alert className={this.props.className} style={this.props.style} bsStyle={this.state.type}>
                {this.state.message}
              </ReactBootstrap.Alert>
            );
        } else {
            var alertInstance = <div className={this.props.className} style={this.props.style} />
        }
        return alertInstance;
    }

}

class AlertArea extends React.Component {
    static propTypes = {
        address: React.PropTypes.string
    };

    static defaultProps = {
        address: null,
    };

    state = {
        topic:topics.BAR_MESSAGE(this.props.address),
        message: null,
        type: null,
        messageTime: 0
    };

    subscriptionTokens = [];

    constructor (props) {
        super(props);
        this.subscriptionTokens.push({
            token:PubSub.subscribe(this.state.topic, this.subscriptionHandler),
            msg:this.state.topic
        });
    }

    subscriptionHandler = (msg,data) => {
        switch (msg) {
            case this.state.topic:
                this.barMessage(data);
                break;
        }
    }

    componentWillUnmount = () => {
        this.subscriptionTokens.forEach( d => {
            PubSub.unsubscribe(d.token);
        });
    }

    barMessage = (data) => {
        if ('messageTime' in data) {
            this.setState({message:data.message.message, type:data.message.type, messageTime:data.messageTime});
        }
    }

    render () {
        var message = this.state.message !== null ? <Alert type={this.state.type} message={this.state.message} messageTime={this.state.messageTime} /> : null;
        return (
          <div className={this.props.className} style={this.props.style}>
            {message}
          </div>
        );
    }

}

export {
    AlertArea
}

