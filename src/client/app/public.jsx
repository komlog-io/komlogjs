import React from 'react';
import {Navbar, Nav, NavItem, Alert, Collapse} from 'react-bootstrap';


class Header extends React.Component {
    render () {
        var className = this.props.transparent ? "navbar-transparent" : null;
        return (
          <Navbar className={className} staticTop fluid>
            <Navbar.Header>
              <Navbar.Brand>
                <a href="/" className="brand" />
              </Navbar.Brand>
              <Navbar.Toggle />
            </Navbar.Header>
            <Navbar.Collapse>
              <Nav pullRight>
                <NavItem href="/login">Sign in</NavItem>
                <NavItem href="/signup">Create account</NavItem>
              </Nav>
            </Navbar.Collapse>
          </Navbar>
        );
    }
}

class Footer extends React.Component {
    cookie = '_cookieConsent';

    checkCookie (cname) {
        var name = cname+'=';
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for(var i = 0; i<ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return true;
            }
        }
        return false;
    }

    setCookie = (cname, cvalue, exdays) => {
        var d = new Date();
        d.setTime(d.getTime() + (exdays*24*60*60*1000));
        var expires = "expires="+ d.toUTCString();
        var cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
        document.cookie = cookie;
        this.setState({});
    }

    render () {
        var cookieAlert;
        if (!this.checkCookie(this.cookie)) {
            cookieAlert = (
              <div id="cookie-alert">
                <Alert bsStyle="info" onDismiss={this.setCookie.bind(null, this.cookie, 'yesh', 365)}>
                  We use cookies to offer you the best possible online experience. If you continue, we assume you are accepting our <a href="/cookies" className="alert-link">cookies policy</a>.
                </Alert>
              </div>
            );
        } else {
            cookieAlert=null;
        }
        return (
          <footer className="footer">
            <div className="container">
              <div className="row">
                <div className="col-lg-2  col-md-2 col-sm-4 col-xs-6">
                  <div className="title">Legal</div>
                  <ul className="list">
                    <li>
                      <a href="/terms">Terms</a>
                    </li>
                    <li>
                      <a href="/privacy">Privacy</a>
                    </li>
                    <li>
                      <a href="/cookies">Cookies</a>
                    </li>
                  </ul>
                </div>
                <div className="col-lg-2  col-md-2 col-sm-4 col-xs-6">
                  <div className="title">DEVELOPERS</div>
                  <ul className="list">
                    <li>
                      <a href="https://github.com/komlog-io">Github</a>
                    </li>
                    <li>
                      <a href="https://groups.google.com/d/forum/komlog">Mailing List</a>
                    </li>
                    <li>
                      <a href="https://gitter.im/komlog_">Gitter community</a>
                    </li>
                  </ul>
                </div>
                <div className="col-lg-2  col-md-2 col-sm-4 col-xs-6">
                  <div className="title">CONTACT</div>
                  <ul className="list">
                    <li>
                      <a href="mailto:hello@komlog.io"><span className="mail" />Mail</a>
                    </li>
                    <li>
                      <a href="https://www.twitter.com/komlog_"><span className="twitter"/>Twitter</a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div>
              <div style={{textAlign:'center',paddingTop:'20px'}}>
                <small>
                  © 2017 Made with{' '}
                  <span className="glyphicon glyphicon-heart text-danger"></span>
                  {' '}by <strong>Komlog</strong>
                </small>
              </div>
            </div>
            {cookieAlert}
          </footer>
        );
    }
}

class Root extends React.Component {
    home_bg = require('./img/home_bg.jpg');

    render () {
        return (
          <div>
            <div className="home-bg">
              <img src={this.home_bg} width={2333}/>
              <div className="home-slogan">
                <span style={{marginLeft:'-5%',fontWeight:700}}>Built</span>{' '}for the<br />
                <span style={{fontWeight:700,color:'#011c39'}}>Data Driven</span>
              </div>
            </div>
            <div className="description">
              <div className="container">
                Komlog is a flexible and powerful event based processing platform, aimed at <strong>visualizing and sharing time series</strong>. It helps you structure your time series and create applications that use them in real time, making it a useful platform for <strong>data driven organizations</strong> and <strong>data enthusiasts</strong>.
              </div>
            </div>
            <div className="separator" />
            <div className="features">
              <div className="container">
                <div className="col-md-4 col-sm-6 feature-box">
                  <div className="glyphicon glyphicon-stats home-icon" />
                  <h3>Visualize Data in Minutes</h3>
                  Visualize data from any CLI or script output, directly from plain texts.
                </div>
                <div className="col-md-4 col-sm-6 feature-box">
                  <div className="glyphicon glyphicon-cloud home-icon" />
                  <h3>Cloud Agnostic</h3>
                  Run Komlog daemons on any cloud provider, on your own servers or both.
                </div>
                <div className="col-md-4 col-sm-6 feature-box">
                  <div className="glyphicon glyphicon-transfer home-icon" />
                  <h3>Be Data Driven</h3>
                  Build applications that react to changes in your models in real time.
                </div>
                <div className="col-md-4 col-sm-6 feature-box">
                  <div className="glyphicon glyphicon-gift home-icon" />
                  <h3>Free Plan</h3>
                  Start with a free plan and upgrade it according to your needs.
                </div>
                <div className="col-md-4 col-sm-6 feature-box">
                  <div className="glyphicon glyphicon-bullhorn home-icon" />
                  <h3>Build the IoT</h3>
                  Share your time series in real time and let others build applications over them.
                </div>
                <div className="col-md-4 col-sm-6 feature-box">
                  <div className="glyphicon glyphicon-comment home-icon"/>
                  <h3>Join the Conversation</h3>
                  Get in touch with us, get help and give us your feedback.
                </div>
              </div>
            </div>
            <div className="big-separator">
              <div style={{textAlign:'center'}}>
                <a className="btn btn-join" href="/signup">CREATE ACCOUNT</a>
              </div>
            </div>
          </div>
        );
    }
}

class Forget extends React.Component {
    componentWillMount () {
        var newState = {
            disabled: true,
            password1: '',
            password2: '',
        };
        var diagEl=document.getElementById("dialog");
        if (diagEl) {
            newState.dtype = diagEl.textContent;
        }
        var codeEl=document.getElementById("rescode");
        var msgEl = document.getElementById("resmsg");
        if (codeEl && msgEl) {
            newState.code = codeEl.textContent;
            newState.msg = msgEl.innerHTML
        }
        this.setState (newState);
    }

    getBanner () {
        var banner = null;
        if (this.state.code && this.state.msg) {
            var code = this.state.code
            var msg = <div dangerouslySetInnerHTML={{__html:this.state.msg}} />;
            if (code == '200') {
                banner = <div style={{maxWidth:'600px'}} className="alert alert-success center-block text-center" role="alert">{msg}</div>;
            } else {
                banner = <div style={{maxWidth:'600px'}} className="alert alert-danger center-block text-center" role="alert">{msg}</div>;
            }
        }
        return banner
    }

    getDialog () {
        var dialog =null;
        if (this.state.dtype == 'r') {
            dialog = (
              <div>
                <h2>Forgot your password?</h2>
                <h5>Enter your email or username and we will send you an email to reset your password.</h5>
                <br />
                <form className="form-inline" method="post" action="">
                  <div className="form-group">
                    <div className="input-group" style={{maxWidth:'400px'}}>
                      <label htmlFor="account" className="sr-only">Account</label>
                      <input type="text" id="account" name="account" className="form-control" placeholder="email or username" required autoFocus />
                      <span className="input-group-btn">
                        <button className="btn btn-primary" type="submit">Send</button>
                      </span>
                    </div>
                  </div>
                </form>
              </div>
            );
        } else if (this.state.dtype == 'u') {
            dialog = (
              <div>
                <h2 className="text-center">Set the new password</h2>
                <br />
                <form className="form-signin" method="post" action="">
                  <label htmlFor="password" className="sr-only">new password</label>
                  <input type="password" id="password" name="password" className="form-control" placeholder="new password" onChange={this.handlePassword} value={this.state.password1} required autoFocus />
                  <label htmlFor="repeat-password" className="sr-only">repeat password</label>
                  <input type="password" id="repeat-password" name="repeat-password" className="form-control" placeholder="repeat password" onChange={this.handlePassword} value={this.state.password2}  />
                  <button className="btn btn-success" disabled={this.state.disabled} type="submit">Set new password</button>
                </form>
              </div>
            );
        }
        return dialog;
    }

    handlePassword = (event) => {
        var newState = {};
        if (event.target.id == "password") {
            newState.password1=event.target.value;
            if (newState.password1.length > 5 && newState.password1 == this.state.password2) {
                newState.disabled = false;
            } else {
                newState.disabled = true;
            }
        } else if (event.target.id == "repeat-password") {
            newState.password2=event.target.value;
            if (newState.password2.length > 5 && newState.password2 == this.state.password1) {
                newState.disabled = false;
            } else {
                newState.disabled = true;
            }
        }
        this.setState(newState);
    }

    render () {
        var banner = this.getBanner();
        var dialog = this.getDialog();
        return (
          <div className="container" style={{paddingBottom:'20px'}}>
            <div className="well">
              {banner}
              {dialog}
            </div>
          </div>
        );
    }
}

class Invite extends React.Component {
    state = {
        open: false,
    };

    switchCollapse = () => {
        this.setState({open:!this.state.open});
    }

    getBanner () {
        var banner = null;
        var codeEl=document.getElementById("rescode");
        var msgEl = document.getElementById("resmsg");
        if (codeEl && msgEl) {
            var code = codeEl.textContent;
            var msg = <div dangerouslySetInnerHTML={{__html:msgEl.innerHTML}} />;
            if (code == '200') {
                var banner = <div style={{maxWidth:'600px'}} className="alert alert-success center-block text-center" role="alert">{msg}</div>;
            } else {
                var banner = <div style={{maxWidth:'600px'}} className="alert alert-danger center-block text-center" role="alert">{msg}</div>;
            }
        }
        return banner;
    }

    render () {
        var banner = this.getBanner();
        return (
        <div className="container" style={{paddingBottom:'20px'}}>
          <div className="well">
            {banner}
            <h2>Request an Invitation</h2>
            <h5>Komlog is in private beta right now. Join our waiting list, and we will send you an invitation as soon as we can.</h5>
            <br />
            <form className="form-inline" method="post" action="">
              <div className="form-group">
                <div className="input-group" style={{maxWidth:'400px'}}>
                  <label htmlFor="email" className="sr-only">email</label>
                  <input type="text" id="email" name="email" className="form-control" placeholder="email" required autoFocus/>
                  <span className="input-group-btn">
                    <button className="btn btn-primary" type="submit">Request invitation</button>
                  </span>
                </div>
              </div>
            </form>
            <br />
            <h6><a href="#" onClick={this.switchCollapse}>Already got an invitation?</a></h6>
            <br />
            <Collapse in={this.state.open}>
              <div>
                <form className="form-inline" method="get" action="/signup/">
                  <div className="form-group">
                    <div className="input-group" style={{maxWidth:'400px'}}>
                      <label htmlFor="inv" className="sr-only">Invitation Code</label>
                      <input type="text" className="form-control" id="inv" placeholder ="Invitation code" name="i" />
                      <span className="input-group-btn">
                        <button className="btn btn-success" type="submit">Validate</button>
                      </span>
                    </div>
                  </div>
                </form>
              </div>
            </Collapse>
          </div>
        </div>
        );
    }
}

class SignIn extends React.Component {
    getBanner () {
        var banner = null;
        var codeEl=document.getElementById("rescode");
        var msgEl = document.getElementById("resmsg");
        if (codeEl && msgEl) {
            var code = codeEl.textContent;
            var msg = <div dangerouslySetInnerHTML={{__html:msgEl.innerHTML}} />;
            if (code == '200') {
                var banner = <div style={{maxWidth:'600px'}} className="alert alert-success center-block text-center" role="alert">{msg}</div>;
            } else {
                var banner = <div style={{maxWidth:'600px'}} className="alert alert-danger center-block text-center" role="alert">{msg}</div>;
            }
        }
        return banner;
    }

    render () {
        var banner = this.getBanner();
        return (
          <div className="container" style={{paddingBottom:'20px'}}>
            <div className="well well-signin">
              <form className="form-signin" method="post" action="">
                <h2 className="form-signin-heading text-center">Sign in</h2>
                <label htmlFor="username" className="sr-only">Username</label>
                <input type="text" id="username" name="u" className="form-control" placeholder="Username" required autoFocus />
                <label htmlFor="password" className="sr-only">Password</label>
                <input type="password" id="password" name="p" className="form-control" placeholder="Password" required />
                {banner}
                <button className="btn btn-lg btn-primary btn-block" type="submit">Sign in</button>
              </form>
              <h6 className="text-right">
                  <a href="/forget">Forgot your password?</a>
              </h6>
            </div>
          </div>
        );
    }
}

export {
    Header,
    Footer,
    Root,
    SignIn,
    Invite,
    Forget
}
