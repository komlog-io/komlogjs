import React from 'react';
import {render} from 'react-dom';
import {Header, Footer, Forget} from './public.jsx';

document.addEventListener("DOMContentLoaded", function(event) {
    render (<Header />, document.getElementById('header'));
    render (<Footer />, document.getElementById('footer'));
    render (<Forget />, document.getElementById('content'));
});
