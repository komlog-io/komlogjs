import React from 'react';
import {Navbar, Nav, NavItem, Alert, Collapse, Image, Grid, Row, Col, Thumbnail} from 'react-bootstrap';


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
                <NavItem href="https://medium.com/komlog"><strong>Blog</strong></NavItem>
                <NavItem href="/pricing"><strong>Pricing</strong></NavItem>
                <NavItem href="/login"><strong>Login</strong></NavItem>
                <NavItem href="/signup/?i=HelloKomlog"><strong>Sign up</strong></NavItem>
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
            (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o), m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m) })(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
            ga('create', 'UA-92277506-1', 'auto');
            ga('send', 'pageview');
        }
        return (
          <footer className="footer">
            <div className="container">
              <div className="row">
                <div className="col-lg-2  col-md-2 col-sm-4 col-xs-6 col-md-offset-2">
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
                  <div className="title">SUPPORT</div>
                  <ul className="list">
                    <li>
                      <a href="https://github.com/komlog-io">Github</a>
                    </li>
                    <li>
                      <a href="https://groups.google.com/d/forum/komlog">Mailing List</a>
                    </li>
                    <li>
                      <a href="https://gitter.im/komlog_/komlog">Gitter community</a>
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
    company_codeback = require('./img/company_codeback.png')
    company_hoppin = require('./img/company_hoppin.png')
    company_zumo = require('./img/company_zumo.png')
    dashboard = require('./img/dashboard_1.png')
    terminal_1 = require('./img/terminal_1.png')
    terminal_2 = require('./img/terminal_2.png')
    report_1 = require('./img/report_1.png')


    render () {
        return (
          <div>
            <div className="home-bg">
              <div className="home-slogan">
                <h1>A platform to <strong>help</strong> teams <strong>better understand</strong> their systems</h1>
                <br />
                <br />
                <a className="btn btn-join" href="/signup/?i=HelloKomlog">Create FULL FEATURED & FREE account</a>
              </div>
            </div>
            <div className="home-subtitle">
              <h3>Komlog is a flexible and powerful platform for <strong>visualizing and processing data</strong>. <br/>Our mission is to build a helpful tool for such a <strong>broad and heterogeneous</strong> field as systems analysis.</h3>
              <Image className="subtitle-image" src={this.dashboard} responsive />
            </div>
            <div className="home-subtitle">
              <h1>If you can see it, Komlog can <span className="text-strong">visualize</span> it.</h1>
              <h3>Operating system commands, database queries, config files... Komlog will extract metrics from any text you send.<br/><strong>Parsing is something from the past.</strong></h3>
              <Image className="subtitle-image" src={this.terminal_1} responsive />
              <h3>Leverages the full potential of the command line interface</h3>
              <Image className="subtitle-image" src={this.terminal_2} responsive />
            </div>
            <div className="home-subtitle">
              <h1>Process your data in <span className="text-strong">real-time</span></h1>
              <h3>Anomaly detection, forecasts, reports. Data based decisions are key.</h3>
              <Image className="subtitle-image" src={this.report_1} responsive />
            </div>
            <div className="home-subtitle">
              <h1>And <span className="text-strong">much</span> more</h1>
              <h3>Create and distribute your own plugins.</h3>
              <h3>Share data with other members within your team.</h3>
              <h3>Build applications using data from multiple sources.</h3>
            </div>
            <div className="home-subtitle-gradient">
              <Row>
              <h1 style={{'color':'white'}}>Get started in minutes. Discover <strong>Komlog</strong>.</h1>
              </Row>
              <Row>
              <Col xs={6} md={3} mdOffset={3}>
                <h3 style={{'color':'white'}}>Are you ready?</h3>
                <br/>
                <a className="btn btn-join" href="/signup/?i=HelloKomlog">SIGN UP</a>
              </Col>
              <Col xs={6} md={3}>
                <h3 style={{'color':'white'}}>Need Analysts?</h3>
                <br/>
                <a href="mailto:hello@komlog.io" className="btn btn-contact">CONTACT US</a>
              </Col>
              </Row>
            </div>
            <div className="home-subtitle">
              <h3>Great companies rely on <span className="text-strong">Komlog</span>.</h3>
            </div>
            <Grid>
              <Row>
                <Col xs={4} md={3} mdOffset={2}>
                  <a href="https://hoppin.es"><Image style={{'maxWidth':'100px'}} alt="Hoppin" src={this.company_hoppin} responsive rounded/></a>
                </Col>
                <Col xs={4} md={3}>
                  <a href="http://codeback.es"><Image style={{'maxWidth':'100px'}} alt="Codeback software" src={this.company_codeback} responsive rounded /></a>
                </Col>
                <Col xs={4} md={3}>
                  <a href="https://zumostudio.com"><Image style={{'maxWidth':'100px'}} alt="Zumo Studio" src={this.company_zumo} responsive rounded /></a>
                </Col>
              </Row>
            </Grid>
            <br/>
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
                <div className="login-brand" />
                <label htmlFor="username" className="sr-only">Username</label>
                <input type="text" id="username" name="u" className="form-control" placeholder="Username" required autoFocus />
                <label htmlFor="password" className="sr-only">Password</label>
                <input type="password" id="password" name="p" className="form-control" placeholder="Password" required />
                {banner}
                <button className="btn btn-lg btn-primary btn-block" type="submit">LOGIN</button>
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
