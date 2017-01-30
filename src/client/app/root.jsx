import React from 'react';
import {render} from 'react-dom';
import {Header, Footer, Root} from './public.jsx';

document.addEventListener("DOMContentLoaded", function(event) {
    render (<Header transparent={true}/>, document.getElementById('header'));
    render (<Footer />, document.getElementById('footer'));
    render (<Root />, document.getElementById('content'));
});
