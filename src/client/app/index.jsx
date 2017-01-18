import React from 'react';
import {render} from 'react-dom';
import {UserHeader} from './user-header.jsx';
import {AlertArea} from './alert.jsx';
import {SideMenu} from './menu.jsx';
import {EventsSideBar} from './event.jsx';
import {Workspace} from './workspace.jsx';
import 'bootstrap/dist/css/bootstrap.css';
import './css/style.css';


document.addEventListener("DOMContentLoaded", function(event) {
    render (<UserHeader />, document.getElementById('user-header'));
    render (<AlertArea className='alert-area' />, document.getElementById('alert-area'));
    render (<Workspace />, document.getElementById('workspace-content'));
    render (<EventsSideBar />, document.getElementById('events-sidebar'));
    render (<SideMenu />, document.getElementById('side-menu'));
});

