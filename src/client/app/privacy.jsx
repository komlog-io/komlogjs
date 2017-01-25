import React from 'react';
import {render} from 'react-dom';
import $ from 'jquery';
import ReactMarkdown from 'react-markdown';
import {Header, Footer} from './public.jsx';

var privacy = require('./legal/privacy.md');

class Privacy extends React.Component {
    state = {
        md: null
    };

    componentWillMount () {
       $.get(privacy)
       .done(data => {
            this.setState({md:data});
       });
    }

    render () {
        if (this.state.md) {
            return (
              <div className="container">
                <ReactMarkdown source={this.state.md} />
              </div>
            );
        } else {
            return null;
        }
    }
}

document.addEventListener("DOMContentLoaded", function(event) {
    render (<Header />, document.getElementById('header'));
    render (<Footer />, document.getElementById('footer'));
    render (<Privacy />, document.getElementById('content'));
});
