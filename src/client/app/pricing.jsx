import React from 'react';
import {render} from 'react-dom';
import {Header, Footer} from './public.jsx';

class Pricing extends React.Component {

    render () {
        return (
          <div className="container">
            <div className="pricing-heading">
              <span>Start using</span>
              <span style={{fontWeight:'700'}}>{' '}Komlog for free.</span>
              <span>{' '}Upgrade if you need it.</span><br />
            </div>
            <div className="pricing-table">
              <div className="col-sm-3 col-md-offset-1">
                <div>
                  <div style={{color:'#011c39',fontFamily:"'Raleway',sans-serif",fontWeight:'700',fontSize:'40px',height:'120px',marginBottom:'15px',textAlign:'center'}}>
                    Free<br/>
                    <a href="/signup" className="btn btn-join">SIGN UP</a>
                    <div style={{fontSize:'14px',fontWeight:'400',color:'#ccc'}}>No credit card required</div>
                  </div>
                  <table className="table plan-content">
                    <tbody>
                      <tr>
                        <td>500 daily push requests</td>
                      </tr>
                      <tr>
                        <td>100 MB sliding window</td>
                      </tr>
                      <tr>
                        <td>Community support</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="col-sm-3">
                <div>
                  <div style={{color:'#011c39',fontFamily:"'Raleway',sans-serif",fontWeight:'700',fontSize:'40px',height:'120px',marginBottom:'15px',textAlign:'center'}}>
                    Startup<br />
                    <span style={{fontSize:'14px',fontWeight:'700'}}>$</span>
                    {' '}99{' '}
                    <span style={{fontSize:'14px',fontWeight:'700',color:'#ccc'}}>monthly</span>
                  </div>
                  <table className="table plan-content">
                    <tbody>
                      <tr>
                      </tr>
                      <tr>
                        <td>50000 daily push requests</td>
                      </tr>
                      <tr>
                        <td>1 GB sliding window</td>
                      </tr>
                      <tr>
                        <td>Email support</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="col-sm-3">
                <div>
                  <div style={{color:'#011c39',fontFamily:"'Raleway',sans-serif",fontWeight:'700',fontSize:'40px',height:'120px',marginBottom:'15px',textAlign:'center'}}>
                    Enterprise<br/>
                    <a href="mailto:hello@komlog.io" className="btn btn-contact">CONTACT US</a>
                  </div>
                  <table className="table plan-content">
                    <tbody>
                      <tr>
                        <td>Custom push requests</td>
                      </tr>
                      <tr>
                        <td>Custom data retention</td>
                      </tr>
                      <tr>
                        <td>SLA and enterprise support</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
    }
}

document.addEventListener("DOMContentLoaded", function(event) {
    render (<Header />, document.getElementById('header'));
    render (<Footer />, document.getElementById('footer'));
    render (<Pricing />, document.getElementById('content'));
});
