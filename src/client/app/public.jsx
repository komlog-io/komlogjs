import React from 'react';
import * as ReactBootstrap from 'react-bootstrap';


class Header extends React.Component {
    handleSelect = (e) => {
        e.preventDefault();
        console.log('me cago en todo reactBootstrap',e);
    }

    render () {
        var brand = "_< Komlog";
        return (
          <ReactBootstrap.Navbar inverse staticTop>
            <ReactBootstrap.Navbar.Header>
              <ReactBootstrap.Navbar.Brand>
                <a href="/">{brand}</a>
              </ReactBootstrap.Navbar.Brand>
              <ReactBootstrap.Navbar.Toggle />
            </ReactBootstrap.Navbar.Header>
            <ReactBootstrap.Navbar.Collapse>
              <ReactBootstrap.Nav pullRight>
                <ReactBootstrap.NavItem href="/login">Sign in</ReactBootstrap.NavItem>
                <ReactBootstrap.NavItem href="/signup">Create account</ReactBootstrap.NavItem>
              </ReactBootstrap.Nav>
            </ReactBootstrap.Navbar.Collapse>
          </ReactBootstrap.Navbar>
        );
    }
}

class Footer extends React.Component {
    render () {
        return (
          <div className="navbar navbar-default navbar-fixed-bottom">
            <div className="container">
              <ul className="nav navbar-nav">
                <li>
                  <a href="/terms"><small>Terms and conditions</small></a>
                </li>
                <li>
                  <a href="/privacy"><small>Privacy policy</small></a>
                </li>
              </ul>
              <ul className="nav navbar-nav navbar-right">
                <li>
                  <a href="mailto:hello@komlog.io"><strong>hello@komlog.io</strong></a>
                </li>
                <li className="navbar-text">
                    <small>Made with{' '}
                      <span className="glyphicon glyphicon-heart text-danger"></span>
                      {' '}by <strong>Komlog</strong>
                    </small>
                </li>
              </ul>
            </div>
          </div>
        );
    }
}

class Root extends React.Component {
    render () {
        return (
          <div className="container main-content">
            <div className="row">
              <div className="col-lg-12">
                <h4>
                  <p>
                    Komlog is a flexible and powerful event based processing platform, aimed at <strong>processing and visualizing time series</strong>.<br />
                  </p>
                  <p>
                    With Komlog you can model your time series and create distributed applications that react to updates on those models, making Komlog a useful platform for any <strong>data driven organization</strong> or <strong>data scientist</strong>.
                  </p>
                </h4>
                <p />
              </div>
            </div>
            <div className="row">
              <h1 className="page-header"> </h1>
              <div className="col-md-4 col-sm-6">
                <div className="panel panel-default">
                  <div className="panel-heading">
                    <h4><i className="glyphicon glyphicon-stats"></i> Visualize Data in Minutes</h4>
                  </div>
                  <div className="panel-body">
                    <h5>Identify variables directly on plain texts. Monitor and visualize data from any CLI or script output.</h5>
                  </div>
                </div>
              </div>
              <div className="col-md-4 col-sm-6">
                <div className="panel panel-default">
                  <div className="panel-heading">
                    <h4><i className="glyphicon glyphicon-cloud"></i> Cloud Agnostic</h4>
                  </div>
                  <div className="panel-body">
                    <h5> Run Komlog daemons on any cloud provider, on your own servers or both.</h5>
                  </div>
                </div>
              </div>
              <div className="col-md-4 col-sm-6">
                <div className="panel panel-default">
                  <div className="panel-heading">
                    <h4><i className="glyphicon glyphicon-transfer"></i> Be Data Driven</h4>
                  </div>
                  <div className="panel-body">
                    <h5>Build applications that react to changes in your models in real time.</h5>
                  </div>
                </div>
              </div>
              <div className="col-md-4 col-sm-6">
                <div className="panel panel-default">
                  <div className="panel-heading">
                    <h4><i className="glyphicon glyphicon-gift"></i> Free Plan</h4>
                  </div>
                  <div className="panel-body">
                    <h5> Start with a free plan and upgrade it according to your needs.</h5>
                  </div>
                </div>
              </div>
              <div className="col-md-4 col-sm-6">
                <div className="panel panel-default">
                  <div className="panel-heading">
                    <h4><i className="glyphicon glyphicon-globe"></i> Build the IoT </h4>
                  </div>
                  <div className="panel-body">
                    <h5>Share your data models and build applications that use them.</h5>
                  </div>
                </div>
              </div>
              <div className="col-md-4 col-sm-6">
                <div className="panel panel-default">
                  <div className="panel-heading">
                    <h4><i className="glyphicon glyphicon-comment"></i> Join the Community </h4>
                  </div>
                  <div className="panel-body">
                    <h5>Join the Komlog community through our different channels, get help and exchange your knowledge.</h5>
                  </div>
                </div>
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
        console.log(newState);
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
        console.log('handle',event.target.id);
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
          <div className="container">
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
        <div className="container">
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
            <ReactBootstrap.Collapse in={this.state.open}>
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
            </ReactBootstrap.Collapse>
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
        console.log('signin',codeEl,msgEl);
        if (codeEl && msgEl) {
            var code = codeEl.textContent;
            var msg = <div dangerouslySetInnerHTML={{__html:msgEl.innerHTML}} />;
            console.log('respuesta',code,msgEl.innerHTML);
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
          <div className="container">
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
