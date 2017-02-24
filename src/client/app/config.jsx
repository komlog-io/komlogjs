import React from 'react';
import {render} from 'react-dom';
import {UserHeader} from './user-header.jsx';
import {AlertArea} from './alert.jsx';
import {ConfigMenu} from './config-menu.jsx';
import 'bootstrap/dist/css/bootstrap.css';
import './css/style.css';
import './img/icons/favicon.png';


document.addEventListener("DOMContentLoaded", function(event) {
    render (<UserHeader />, document.getElementById('user-header'));
    render (<AlertArea className='alert-area' />, document.getElementById('alert-area'));
    render (<ConfigMenu />, document.getElementById('config-menu'));
});

