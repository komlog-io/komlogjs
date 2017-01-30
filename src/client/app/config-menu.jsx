import React from 'react';
import PubSub from 'pubsub-js';
import * as ReactBootstrap from 'react-bootstrap';
import {
    getMyUserConfig,
    getMyAuthorizedKeysConfig,
    getMyPlanConfig,
    getMySharedUrisConfig,
    newKey,
    deleteKey,
    suspendKey,
    activateKey,
    updateUserPassword,
    deleteUser,
    upgradePlan,
    deleteSharedUri,
    shareNewUri } from './user-store.js';
import {topics} from './types.js';


class ConfigMenu extends React.Component {
    state = {
        activeSubMenu: 0
    };

    switchSubMenu = (event) => {
        event.preventDefault();
        var itemId = parseInt(event.target.id);
        if (this.state.activeSubMenu != itemId) {
            this.setState({activeSubMenu:itemId});
        }
    }

    getSubmenu = () => {
        if (this.state.activeSubMenu == 0) {
            return <AccountSubMenu />
        } else if (this.state.activeSubMenu == 1) {
            return <AgentSubMenu />
        } else if (this.state.activeSubMenu == 2) {
            return <BillingSubMenu />
        } else if (this.state.activeSubMenu == 3) {
            return <SharedUriSubMenu />
        }
    }

    getMenu = () => {
        var items = [
            {key: "0", label: "Account"},
            {key: "1", label: "Agents"},
            {key: "2", label: "Billing"},
            {key: "3", label: "Shared"},
        ]
        var menuItems = items.map( item => {
            var classname = this.state.activeSubMenu == parseInt(item.key) ? 'list-item-active' : 'list-item';
            return <li key={item.key} id={item.key} onClick={this.switchSubMenu} className={classname}>{item.label}</li>
        });
        return (
          <ul className="menu-list">
            {menuItems}
          </ul>
        );
    }

    render () {
        console.log('render menu principal');
        var submenu = this.getSubmenu();
        var menuIndex = this.getMenu();
        return (
          <div>
            <div className="side-config-menu">
              <a href="/home">
                <div className="brand"></div>
              </a>
              {menuIndex}
            </div>
            <div className="config-main">
              {submenu}
            </div>
          </div>
        );
    }
}

class AgentSubMenu extends React.Component {
    state = {
        newKeyMenuOpen: false,
        newKeyMenuTitleValue:"",
        newKeyMenuKeyValue:"",
        titleContent: "",
        textareaContent: "Paste content of your 'key.pub' file",
        showDeleteKeyModal: false,
        showSuspendKeyModal: false,
        showActivateKeyModal: false,
        deleteKeyModalItemId: "",
        suspendKeyModalItemId: "",
        activateKeyModalItemId: "",
        showKeyMenuOpen: {},
        keys: [],
    };

    subscriptionTokens = [];

    subscriptionHandler = (msg,data) => {
        switch (msg) {
            case topics.MY_AUTHORIZED_KEYS_CONFIG_UPDATE:
                this.refreshConfig();
                break;
        }
    }

    async initialization () {
        var keys = await getMyAuthorizedKeysConfig();

        var subscribedTopics = [
            topics.MY_AUTHORIZED_KEYS_CONFIG_UPDATE,
        ];

        this.subscriptionTokens = subscribedTopics.map( topic => {
            return {
                token:PubSub.subscribe(topic,this.subscriptionHandler),
                msg:topic
            }
        });

        console.log('init las keys',keys);
        this.setState({keys:keys});
    }

    componentDidMount () {
        this.initialization();
    }

    componentWillUnmount () {
        this.subscriptionTokens.forEach (d => {
            PubSub.unsubscribe(d.token);
        });
    }

    async refreshConfig () {
        var keys = await getMyAuthorizedKeysConfig();
        console.log('las keys',keys);
        this.setState({keys:keys});
    }

    toggleNewKeyMenu = () => {
        var keyMenuOpen = {};
        Object.keys(this.state.showKeyMenuOpen).forEach( key => {
            keyMenuOpen[key] = false;
        });
        this.setState({
            newKeyMenuOpen:!this.state.newKeyMenuOpen,
            newKeyMenuTitleValue: "",
            newKeyMenuKeyValue:"",
            showKeyMenuOpen:keyMenuOpen,
        });
    }

    toggleShowKeyMenu = (event) => {
        event.preventDefault();
        var buttonKey = event.target.id;
        var keyMenuOpen = {};
        Object.keys(this.state.showKeyMenuOpen).forEach( key => {
            if (key == buttonKey) {
                keyMenuOpen[key]=!this.state.showKeyMenuOpen[key];
            } else {
                keyMenuOpen[key] = false;
            }
        });
        if (!keyMenuOpen.hasOwnProperty(buttonKey)) {
            keyMenuOpen[buttonKey] = true;
        }
        this.setState({showKeyMenuOpen:keyMenuOpen, newKeyMenuOpen:false});
    }

    handleNewKeyMenuChange = (event) => {
        if (event.target.id == "title") {
            this.setState({newKeyMenuTitleValue:event.target.value});
        } else if (event.target.id == "key") {
            this.setState({newKeyMenuKeyValue:event.target.value});
        }
    }

    newKey = () => {
        newKey(this.state.newKeyMenuTitleValue, this.state.newKeyMenuKeyValue);
        this.toggleNewKeyMenu();
    }

    showDeleteKeyModal = (event) => {
        var keyMenuOpen = {};
        Object.keys(this.state.showKeyMenuOpen).forEach( key => {
            keyMenuOpen[key] = false;
        });
        this.setState({
            deleteKeyModalItemId:event.target.id,
            showDeleteKeyModal:true,
            newKeyMenuOpen:false,
            showKeyMenuOpen:keyMenuOpen
        });
    }

    closeDeleteKeyModal = () => {
        this.setState({deleteKeyModalItemId:"", showDeleteKeyModal:false});
    }

    deleteKey = () => {
        deleteKey(this.state.deleteKeyModalItemId);
        this.closeDeleteKeyModal();
    }

    showSuspendKeyModal = (event) => {
        var keyMenuOpen = {};
        Object.keys(this.state.showKeyMenuOpen).forEach( key => {
            keyMenuOpen[key] = false
        });
        this.setState({
            suspendKeyModalItemId:event.target.id,
            showSuspendKeyModal:true,
            newKeyMenuOpen:false,
            showKeyMenuOpen:keyMenuOpen
        });
    }

    closeSuspendKeyModal = () => {
        this.setState({suspendKeyModalItemId:"", showSuspendKeyModal:false});
    }

    suspendKey = (event) => {
        suspendKey(this.state.suspendKeyModalItemId);
        this.closeSuspendKeyModal();
    }

    showActivateKeyModal = (event) => {
        var keyMenuOpen = {};
        Object.keys(this.state.showKeyMenuOpen).forEach( key => {
            keyMenuOpen[key] = false;
        });
        this.setState({
            activateKeyModalItemId:event.target.id,
            showActivateKeyModal:true,
            newKeyMenuOpen:false,
            showKeyMenuOpen:keyMenuOpen
        });
    }

    closeActivateKeyModal = () => {
        this.setState({activateKeyModalItemId:"", showActivateKeyModal:false});
    }

    activateKey = (event) => {
        activateKey(this.state.activateKeyModalItemId);
        this.closeActivateKeyModal();
    }

    getSSHKeys = () => {
        if (this.state.keys.length == 0) {
            return <div>No Authorized keys found</div>
        } else {
            var itemList = this.state.keys.map ( item => {
                if (item.state == 2) {
                    var keyState = <ReactBootstrap.Label bsStyle="success">active</ReactBootstrap.Label>
                    var keyAction = <ReactBootstrap.Button id={item.aid} bsStyle="warning" onClick={this.showSuspendKeyModal}>suspend</ReactBootstrap.Button>
                } else if (item.state == 3) {
                    var keyState = <ReactBootstrap.Label bsStyle="warning">suspended</ReactBootstrap.Label>
                    var keyAction = <ReactBootstrap.Button id={item.aid} bsStyle="success" onClick={this.showActivateKeyModal}>activate</ReactBootstrap.Button>
                } else {
                    var keyState = <ReactBootstrap.Label bsStyle="default">unknown</ReactBootstrap.Label>
                    var keyAction = <ReactBootstrap.Button id={item.aid} bsStyle="success" onClick={this.showActivateKeyModal}>activate</ReactBootstrap.Button>
                }
                return (
                  <div key={item.aid}>
                    <div className='row key-list-item'>
                      <div className='col-xs-3 col-sm-1'>
                        {keyState}
                      </div>
                      <div id={item.aid} onClick={this.toggleShowKeyMenu} className='col-xs-8 col-sm-8 clickable'>
                        <strong>{item.agentname}</strong>
                      </div> 
                      <div className='pull-right'>
                        <ReactBootstrap.ButtonToolbar className="key-list-item-buttons">
                          <ReactBootstrap.ButtonGroup bsSize="xsmall">
                            {keyAction}
                          </ReactBootstrap.ButtonGroup>
                          <ReactBootstrap.ButtonGroup bsSize="xsmall">
                            <ReactBootstrap.Button id={item.aid} bsStyle="danger" style={{marginRight:'5px'}} onClick={this.showDeleteKeyModal}>delete</ReactBootstrap.Button>
                          </ReactBootstrap.ButtonGroup>
                        </ReactBootstrap.ButtonToolbar>
                      </div>
                    </div>
                    <div className='row'>
                      <div className='col-xs-12 col-sm-7 col-sm-offset-1' style={{marginTop:'5px'}}>
                        <ReactBootstrap.Collapse in={this.state.showKeyMenuOpen[item.aid]}>
                          <div className="form-group">
                            <textarea className="form-control" type="textarea" id="key" style={{height:'350px'}} onChange={this.handleChange} value={item.pubkey} readOnly={true} />
                          </div>
                        </ReactBootstrap.Collapse>
                      </div>
                    </div>
                  </div>
                );
            });
            return (
              <div>
                {itemList}
                <ReactBootstrap.Modal show={this.state.showDeleteKeyModal} onHide={this.closeDeleteKeyModal}>
                  <ReactBootstrap.Modal.Header closeButton={true}>
                    <ReactBootstrap.Modal.Title>Delete key</ReactBootstrap.Modal.Title>
                  </ReactBootstrap.Modal.Header>
                  <ReactBootstrap.Modal.Body>
                    The key will be deleted.
                    <strong> Are you sure?</strong>
                  </ReactBootstrap.Modal.Body>
                  <ReactBootstrap.Modal.Footer>
                    <ReactBootstrap.Button bsStyle="default" onClick={this.closeDeleteKeyModal}>Cancel</ReactBootstrap.Button>
                    <ReactBootstrap.Button bsStyle="danger" onClick={this.deleteKey}>Delete key</ReactBootstrap.Button>
                  </ReactBootstrap.Modal.Footer>
                </ReactBootstrap.Modal>
                <ReactBootstrap.Modal show={this.state.showSuspendKeyModal} onHide={this.closeSuspendKeyModal}>
                  <ReactBootstrap.Modal.Header closeButton={true}>
                    <ReactBootstrap.Modal.Title>Suspend key</ReactBootstrap.Modal.Title>
                  </ReactBootstrap.Modal.Header>
                  <ReactBootstrap.Modal.Body>
                    The key will be suspended.
                    <strong> Are you sure?</strong>
                  </ReactBootstrap.Modal.Body>
                  <ReactBootstrap.Modal.Footer>
                    <ReactBootstrap.Button bsStyle="default" onClick={this.closeSuspendKeyModal}>Cancel</ReactBootstrap.Button>
                    <ReactBootstrap.Button bsStyle="warning" onClick={this.suspendKey}>Suspend key</ReactBootstrap.Button>
                  </ReactBootstrap.Modal.Footer>
                </ReactBootstrap.Modal>
                <ReactBootstrap.Modal show={this.state.showActivateKeyModal} onHide={this.closeActivateKeyModal}>
                  <ReactBootstrap.Modal.Header closeButton={true}>
                    <ReactBootstrap.Modal.Title>Activate key</ReactBootstrap.Modal.Title>
                  </ReactBootstrap.Modal.Header>
                  <ReactBootstrap.Modal.Body>
                    The key will be activated.
                    <strong> Are you sure?</strong>
                  </ReactBootstrap.Modal.Body>
                  <ReactBootstrap.Modal.Footer>
                    <ReactBootstrap.Button bsStyle="default" onClick={this.closeActivateKeyModal}>Cancel</ReactBootstrap.Button>
                    <ReactBootstrap.Button bsStyle="success" onClick={this.activateKey}>Activate key</ReactBootstrap.Button>
                  </ReactBootstrap.Modal.Footer>
                </ReactBootstrap.Modal>
              </div>
            );
        }
    }

    render () {
        var panelHeading = (
          <div className="panel-title">
            <div className="row">
              <div className="col-xs-3">
                <div style={{display:"inline-block", float:"none", vertialAlign:"middle"}}>Authorized keys</div>
              </div>
              <div className="pull-right">
                <ReactBootstrap.Button bsStyle="default" bsSize="small" style={{marginRight:'5px'}} onClick={this.toggleNewKeyMenu} value={this.state.newKeyMenuTitleValue}>New key</ReactBootstrap.Button>
              </div>
            </div>
          </div>
        );
        var sshKeys = this.getSSHKeys();
        return (
          <div>
            <ReactBootstrap.Panel header={panelHeading}>
              <ReactBootstrap.Collapse in={this.state.newKeyMenuOpen}>
                <div>
                  <ReactBootstrap.Well>
                    <div className='row'>
                      <div className='col-xs-12 col-sm-3'>
                        <div className="form-group">
                          <label>Title</label>
                          <input className="form-control" type="text" id="title" onChange={this.handleNewKeyMenuChange} placeholder={this.state.titleContent} value={this.state.newKeyMenuTitleValue} />
                        </div>
                      </div>
                    </div>
                    <div className='row'>
                      <div className='col-xs-12 col-sm-7'>
                        <div className="form-group">
                          <label>Key</label>
                          <textarea className="form-control" type="textarea" id="key" style={{height:'350px'}} onChange={this.handleNewKeyMenuChange} placeholder={this.state.textareaContent} value={this.state.newKeyMenuKeyValue} />
                        </div>
                        <div>
                          <ReactBootstrap.Button bsStyle="success" disabled={this.state.disabledUpdate} onClick={this.newKey}>Add key</ReactBootstrap.Button>
                        </div>
                      </div>
                    </div>
                  </ReactBootstrap.Well>
                </div>
              </ReactBootstrap.Collapse>
              {sshKeys}
            </ReactBootstrap.Panel>
          </div>
        );
    }
}

class AccountSubMenu extends React.Component {
    state = {
        oldInputClass: "form-group",
        oldIconClass: "",
        oldTextValue: "",
        newInputClass: "form-group",
        newIconClass: "",
        newTextValue: "",
        new2InputClass: "form-group",
        new2IconClass: "",
        new2TextValue: "",
        disabledUpdate: true,
        disabledDelete: true,
        disabledInputValue: "",
        showModal: false,
    };

    resetState = () => {
        var state = {
            oldInputClass: "form-group",
            oldIconClass: "",
            oldTextValue: "",
            newInputClass: "form-group",
            newIconClass: "",
            newTextValue: "",
            new2InputClass: "form-group",
            new2IconClass: "",
            new2TextValue: "",
            disabledUpdate: true,
            disabledDelete: true,
            disabledInputValue: "",
            showModal: false,
        };
        this.setState(state);
    }

    showModal = () => {
        this.setState({showModal:true});
    }

    closeModal = () => {
        this.setState({showModal:false, disabledDelete: true, disabledInputValue: ""});
    }

    handleChange = (event) => {
        var newState = {};
        if (event.target.id == "old") {
            newState.oldTextValue=event.target.value;
        } else if (event.target.id == "new") {
            if (event.target.value.length < 6 || event.target.value == this.state.oldTextValue) {
                newState.newInputClass="form-group has-error has-feedback";
                newState.newIconClass="glyphicon glyphicon-remove form-control-feedback";
                newState.newTextValue=event.target.value;
                newState.disabledUpdate=true;
            } else {
                newState.newInputClass="form-group has-success has-feedback";
                newState.newIconClass="glyphicon glyphicon-ok form-control-feedback";
                newState.newTextValue=event.target.value;
            }
            if (this.state.new2TextValue.length>0 && event.target.value!=this.state.new2TextValue) {
                newState.new2InputClass="form-group has-error has-feedback";
                newState.new2IconClass="glyphicon glyphicon-remove form-control-feedback";
                newState.disabledUpdate=true;
            } else if (this.state.new2TextValue.length>0 && event.target.value == this.state.new2TextValue) {
                newState.new2InputClass="form-group has-success has-feedback";
                newState.new2IconClass="glyphicon glyphicon-ok form-control-feedback";
                newState.disabledUpdate=false;
            }
        } else if (event.target.id == "new2") {
            if (event.target.value.length < 6 || event.target.value == this.state.oldTextValue || event.target.value != this.state.newTextValue) {
                newState.new2InputClass="form-group has-error has-feedback";
                newState.new2IconClass="glyphicon glyphicon-remove form-control-feedback";
                newState.new2TextValue=event.target.value;
                newState.disabledUpdate=true;
            } else {
                newState.new2InputClass="form-group has-success has-feedback";
                newState.new2IconClass="glyphicon glyphicon-ok form-control-feedback";
                newState.new2TextValue=event.target.value;
                newState.disabledUpdate=false;
            }
        } else if (event.target.id == "delete") {
            newState.disabledInputValue=event.target.value;
            if (event.target.value == "DELETE") {
                newState.disabledDelete=false;
            } else {
                newState.disabledDelete=true;
            }
        }
        this.setState(newState);
    }

    updatePassword = () => {
        var old_password = this.state.oldTextValue;
        var new_password = this.state.newTextValue;
        var new_password2 = this.state.new2TextValue;
        updateUserPassword(old_password, new_password, new_password2, this.resetState);
    }

    deleteUser = () => {
        deleteUser();
    }

    render () {
        var passwordChange = <h3>Change password</h3>;
        var deleteAccount = <h3>Delete account</h3>;
        return (
          <div>
            <ReactBootstrap.Panel header={passwordChange}>
              <div className='row'>
                <div className='col-xs-12 col-sm-3'>
                  <div className={this.state.oldInputClass}>
                    <label className="control-label">Old password</label>
                    <input className="form-control" type="password" id="old" onChange={this.handleChange} value={this.state.oldTextValue} />
                    <span className={this.state.oldIconClass} />
                  </div>
                </div>
              </div>
              <div className='row'>
                <div className='col-xs-12 col-sm-3'>
                  <div className={this.state.newInputClass}>
                    <label className="control-label">New password</label>
                    <input className="form-control" type="password" id="new" onChange={this.handleChange} value={this.state.newTextValue} />
                    <span className={this.state.newIconClass} />
                  </div>
                </div>
              </div>
              <div className='row'>
                <div className='col-xs-12 col-sm-3'>
                  <div className={this.state.new2InputClass}>
                    <label className="control-label">Confirm new password</label>
                    <input className="form-control" type="password" id="new2" onChange={this.handleChange} value={this.state.new2TextValue} />
                    <span className={this.state.new2IconClass} />
                  </div>
                </div>
              </div>
              <div>
                <ReactBootstrap.Button bsStyle="primary" disabled={this.state.disabledUpdate} onClick={this.updatePassword}>Update password</ReactBootstrap.Button>
              </div>
            </ReactBootstrap.Panel>
            <ReactBootstrap.Panel header={deleteAccount} bsStyle="danger">
              This action cannot be undone. Please be certain.
              <div style={{marginTop:'10px'}}>
                <ReactBootstrap.Button bsStyle="danger" onClick={this.showModal}>Delete account</ReactBootstrap.Button>
              </div>
            </ReactBootstrap.Panel>
            <ReactBootstrap.Modal show={this.state.showModal} onHide={this.closeModal}>
              <ReactBootstrap.Modal.Header closeButton={true}>
                <ReactBootstrap.Modal.Title>Delete account</ReactBootstrap.Modal.Title>
              </ReactBootstrap.Modal.Header>
              <ReactBootstrap.Modal.Body>
                All your data will be deleted. This action cannot be undone so, after executing it, no recovery is possible.
                <p></p>
                <label className="control-label">To continue, please, write down the word 'DELETE'</label>
                <input className="form-control" type="text" id="delete" onChange={this.handleChange} value={this.state.disabledInputValue} placeholder="DELETE" />
              </ReactBootstrap.Modal.Body>
              <ReactBootstrap.Modal.Footer>
                <ReactBootstrap.Button bsStyle="default" onClick={this.closeModal}>Cancel</ReactBootstrap.Button>
                <ReactBootstrap.Button bsStyle="danger" onClick={this.deleteUser} disabled={this.state.disabledDelete}>Delete account</ReactBootstrap.Button>
              </ReactBootstrap.Modal.Footer>
            </ReactBootstrap.Modal>
          </div>
        );
    }
}

class BillingSubMenu extends React.Component {
    state = {
        planInfo: {},
        allowedPlans: [],
        upgradeMenuOpen: false,
        enterCardInfoMenuOpen: false,
        upgradeButtonVisibility: "visible",
        upgradeDisabled: true,
        needsCard: true,
        cardNumber: '',
        cardVerifyCode: '',
        cardMonth: '',
        cardYear: '',
        isUpgrading: false,
    };

    subscriptionTokens = [];

    async initialization () {
        var planConfig = await getMyPlanConfig();

        var subscribedTopics = [
            topics.MY_PLAN_CONFIG_UPDATE,
        ];

        this.subscriptionTokens = subscribedTopics.map( topic => {
            return {
                token:PubSub.subscribe(topic,this.subscriptionHandler),
                msg:topic
            }
        });

        this.setState({
            planInfo: planConfig.current_plan,
            allowedPlans: planConfig.allowed_plans,
            paymentInfo: planConfig.payment_info
        });
    }

    subscriptionHandler = (msg,data) => {
        switch (msg) {
            case topics.MY_PLAN_CONFIG_UPDATE:
                this.refreshConfig();
                break;
        }
    }

    async refreshConfig () {
        var planConfig = await getMyPlanConfig();
        this.setState({
            planInfo: planConfig.current_plan,
            allowedPlans: planConfig.allowed_plans,
            paymentInfo: planConfig.payment_info
        });
    }

    componentDidMount () {
        this.initialization();
    }

    componentWillUnmount () {
        this.subscriptionTokens.forEach (d => {
            PubSub.unsubscribe(d.token);
        });
    }

    closeUpgradeMenu = () => {
        this.setState({
            upgradeMenuOpen:false,
            upgradeButtonVisibility: 'visible',
            newPlan: '',
            upgradeDisabled: true,
            enterCardInfoMenuOpen: false,
            needsCard: true,
            cardNumber: '',
            cardVerifyCode: '',
            cardMonth: '',
            cardYear: '',
            isUpgrading: false,
        });
    }

    toggleUpgradeMenu = () => {
        if (this.state.upgradeMenuOpen) {
            var newUpgradeButtonVisibility = "visible";
        } else {
            var newUpgradeButtonVisibility = "hidden";
        }
        this.setState({
            upgradeMenuOpen:!this.state.upgradeMenuOpen,
            upgradeButtonVisibility: newUpgradeButtonVisibility,
            newPlan: '',
            upgradeDisabled: true,
            enterCardInfoMenuOpen: false,
            needsCard: true,
            cardNumber: '',
            cardVerifyCode: '',
            cardMonth: '',
            cardYear: '',
            isUpgrading: false,
        });
    }

    selectNewPlan = (event) => {
        var newPlan = event.target.id;
        var enterCardInfoMenuOpen = false;
        var upgradeDisabled = true;
        var needsCard = true;
        this.state.allowedPlans.map ( item => {
            if (item.id.toString() == newPlan) {
                if (item.price > 0) {
                    enterCardInfoMenuOpen = true;
                } else {
                    needsCard = false;
                }
            }
        });
        if (needsCard == true && (this.state.cardNumber == '' || this.state.cardVerifyCode == '' || this.state.cardMonth == '' || this.state.cardYear == '')) {
            var upgradeDisabled = true;
        } else {
            var upgradeDisabled = false;
        }
        this.setState({newPlan:newPlan, needsCard:needsCard, upgradeDisabled:upgradeDisabled, enterCardInfoMenuOpen:enterCardInfoMenuOpen});
    }

    enterCardInfo = (event) => {
        var target=event.target;
        var newState = {};
        if (target.id == "month") {
            if (target.value == '' || this.state.cardNumber == '' || this.state.cardVerifyCode == '' || this.state.cardYear == '' || this.state.newPlan == '') {
                newState.upgradeDisabled = true;
            } else {
                newState.upgradeDisabled = false;
            }
            newState.cardMonth=target.value;
        } else if (target.id == "year") {
            if (target.value == '' || this.state.cardNumber == '' || this.state.cardVerifyCode == '' || this.state.cardMonth == '' || this.state.newPlan == '') {
                newState.upgradeDisabled = true;
            } else {
                newState.upgradeDisabled = false;
            }
            newState.cardYear=target.value;
        } else if (target.id == "cvv") {
            if (target.value == '' || this.state.cardNumber == '' || this.state.cardYear == '' || this.state.cardMonth == '' || this.state.newPlan == '') {
                newState.upgradeDisabled = true;
            } else {
                newState.upgradeDisabled = false;
            }
            if (/^\d+$/.test(target.value) || target.value == '') {
                newState.cardVerifyCode=target.value;
            } else {
                newState.cardVerifyCode=this.state.cardVerifyCode;
            }
        } else if (target.id == "card") {
            if (target.value == '' || this.state.cardVerifyCode == '' || this.state.cardYear == '' || this.state.cardMonth == '' || this.state.newPlan == '') {
                newState.upgradeDisabled = true;
            } else {
                newState.upgradeDisabled = false;
            }
            if (/^\d+$/.test(target.value) || target.value == '') {
                newState.cardNumber=target.value;
            } else {
                newState.cardNumber=this.state.cardNumber;
            }
        }
        this.setState(newState);
    }

    upgradePlan = () => {
        if (this.state.needsCard == false) {
            data = {
                'newPlan':this.state.newPlan,
                'needsCard':this.state.needsCard
            }
        } else {
            var data = {
                'newPlan':this.state.newPlan,
                'needsCard':this.state.needsCard,
                'cardNumber':this.state.cardNumber,
                'cardVerifyCode':this.state.cardVerifyCode,
                'cardYear':this.state.cardYear,
                'cardMonth':this.state.cardMonth
            }
        }
        this.setState({isUpgrading:true,upgradeDisabled:true});
        upgradePlan(data, this.closeUpgradeMenu);
    }

    getCurrentPlanInfo = () => {
        if (this.state.planInfo.hasOwnProperty('description')) {
            var planNode = this.state.planInfo.description;
            var planPrice = this.state.planInfo.price+" $/month";
        } else {
            var planNode = null;
            var planPrice = null;
        }
        return (
          <div className='row'>
            <div className="col-xs-10">
              <div className='row'>
                <div className="col-xs-2">
                  <strong>Your plan</strong>
                </div>
                <div className="col-xs-8">
                  {planNode}
                  <br />
                  {planPrice}
                </div>
              </div>
            </div>
            <div className="col-xs-2">
              <div className="pull-right">
                <ReactBootstrap.Button bsStyle="success" bsSize="small" style={{marginRight:'5px'}} visibility={this.state.upgradeButtonVisibility} onClick={this.toggleUpgradeMenu}>Upgrade</ReactBootstrap.Button>
              </div>
            </div>
          </div>
        )
    }

    getUpgradePlans = () => {
        var planItems = this.state.allowedPlans.map ( item => {
            if (this.state.newPlan === item.id.toString()) {
                var planClass = "plan-allowed-selected";
            } else {
                var planClass = "plan-allowed";
            }
            var image_uri = require("./img/plans/"+item.id.toString()+".png");
            return (
              <div key={item.id} id={item.id} className='col-xs-12 col-sm-4 clickable' style={{textAlign:"center"}} onClick={this.selectNewPlan}>
                <ReactBootstrap.Thumbnail src={image_uri} alt={item.description} className={planClass}>
                  <h3>{item.description}</h3>
                  <h4>{item.price} $/month</h4>
                </ReactBootstrap.Thumbnail>
              </div>
            )
        });
        return (
          <ReactBootstrap.Collapse in={this.state.upgradeMenuOpen}>
            <div>
              <p></p>
              <div className='row'>
                {planItems}
              </div>
              <div className="row">
                <ReactBootstrap.Collapse in={this.state.enterCardInfoMenuOpen}>
                  <div className="container card-form">
                    <div className="row">
                      <h4 className="container">Enter credit card info</h4>
                    </div>
                    <div className="row">
                      <div className='col-xs-3'>
                        <div className={this.state.cardNumberClass}>
                          <label className="control-label">Card Number</label>
                          <input className="form-control" type="text" id="card" onChange={this.enterCardInfo} value={this.state.cardNumber} />
                        </div>
                      </div>
                      <div className='col-xs-3'>
                        <label className="control-label">Security code</label>
                        <input className="form-control" style={{maxWidth:'70px'}} type="text" id="cvv" onChange={this.enterCardInfo} value={this.state.cardVerifyCode} />
                      </div>
                    </div>
                    <div className="row">
                      <div className='col-xs-3'>
                        <label className="control-label">Expiration</label>
                        <div>
                          <select className="form-control pull-left" id="month" onChange={this.enterCardInfo} value={this.state.cardMonth} style={{maxWidth:'70px'}}>
                            <option value=''>MM</option>
                            <option value='01'>01</option>
                            <option value='02'>02</option>
                            <option value='03'>03</option>
                            <option value='04'>04</option>
                            <option value='05'>05</option>
                            <option value='06'>06</option>
                            <option value='07'>07</option>
                            <option value='08'>08</option>
                            <option value='09'>09</option>
                            <option value='10'>10</option>
                            <option value='11'>11</option>
                            <option value='12'>12</option>
                          </select>
                          <select className="form-control pull-left" id="year" onChange={this.enterCardInfo} value={this.state.cardYear} style={{maxWidth:'70px', marginLeft:'5px'}}>
                            <option value=''>YY</option>
                            <option value='17'>17</option>
                            <option value='18'>18</option>
                            <option value='19'>19</option>
                            <option value='20'>20</option>
                            <option value='21'>21</option>
                            <option value='22'>22</option>
                            <option value='23'>23</option>
                            <option value='24'>24</option>
                            <option value='25'>25</option>
                            <option value='26'>26</option>
                            <option value='27'>27</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <p></p>
                  </div>
                </ReactBootstrap.Collapse>
              </div>
              <p></p>
              <div className="row">
                <div className="pull-right">
                  <ReactBootstrap.ButtonToolbar>
                    <ReactBootstrap.ButtonGroup>
                      <ReactBootstrap.Button bsStyle="default" style={{marginRight:'5px'}} onClick={this.toggleUpgradeMenu}>Cancel</ReactBootstrap.Button>
                    </ReactBootstrap.ButtonGroup>
                    <ReactBootstrap.ButtonGroup>
                      <ReactBootstrap.Button bsStyle="success" style={{marginRight:'5px'}} onClick={!this.state.isUpgrading ? this.upgradePlan : null} disabled={this.state.upgradeDisabled}>{!this.state.isUpgrading ? "Upgrade your plan" : "Upgrading plan..."}</ReactBootstrap.Button>
                    </ReactBootstrap.ButtonGroup>
                  </ReactBootstrap.ButtonToolbar>
                </div>
              </div>
            </div>
          </ReactBootstrap.Collapse>
        );
    }

    render () {
        var planInfo = this.getCurrentPlanInfo();
        var upgradePlans = this.getUpgradePlans();
        var billingTitle = <h3>Billing overview</h3>;
        return (
          <div>
            <ReactBootstrap.Panel header={billingTitle}>
              {planInfo}
              {upgradePlans}
            </ReactBootstrap.Panel>
          </div>
        );
    }
}

class SharedUriSubMenu extends React.Component {
    state = {
        showUnshareUserModal: false,
        showUnshareUriModal: false,
        shareUriMenuOpen: false,
        shareUriMenuUriPlaceholder:"Uri",
        shareUriMenuUsersPlaceholder:"Users (separated by spaces)",
        disableShareUri:true,
        shareUriMenuUriValue:"",
        shareUriMenuUsersValue:"",
        uris: [],
    };

    subscriptionTokens = [];

    async initialization () {
        var data = await getMySharedUrisConfig();
        var uris = Object.keys(data).map ( uri => {
            return {uri:uri, users:data[uri]};
        });

        var subscribedTopics = [
            topics.MY_SHARED_URIS_CONFIG_UPDATE,
        ];

        this.subscriptionTokens = subscribedTopics.map( topic => {
            return {
                token:PubSub.subscribe(topic,this.subscriptionHandler),
                msg:topic
            }
        });

        this.setState({uris:uris});
    }

    subscriptionHandler = (msg,data) => {
        switch (msg) {
            case topics.MY_SHARED_URIS_CONFIG_UPDATE:
                console.log('MY_SHARED received');
                this.refreshConfig();
                break;
        }
    }

    componentDidMount () {
        this.initialization();
    }

    componentWillUnmount () {
        this.subscriptionTokens.forEach ( d => {
            PubSub.unsubscribe(d.token);
        });
    }

    async refreshConfig () {
        var data = await getMySharedUrisConfig();
        var uris = Object.keys(data).map ( uri => {
            return {uri:uri, users:data[uri]};
        });
        console.log('refresh uri',uris);
        this.setState({uris:uris});
    }

    showUnshareUserModal = (event) => {
        var fields = event.target.id.split("|");
        if (fields.length === 2) {
            this.setState({
                unshareUri:fields[0],
                unshareUser:fields[1],
                showUnshareUserModal:true,
                showUnshareUriModal:false,
                shareUriMenuOpen:false,
            })
        }
    }

    closeUnshareUserModal = () => {
        this.setState({unshareUri:"", unshareUser:"", showUnshareUserModal:false});
    }

    unshareUser = () => {
        deleteSharedUri(this.state.unshareUri,this.state.unshareUser);
        this.closeUnshareUserModal();
    }

    showUnshareUriModal = (event) => {
        var uri = event.target.id;
        if (uri != undefined) {
            this.setState({
                unshareUri:uri,
                unshareUser:"",
                showUnshareUserModal:false,
                showUnshareUriModal:true,
                shareUriMenuOpen:false,
            })
        }
    }

    closeUnshareUriModal = () => {
        this.setState({unshareUri:"", unshareUser:"", showUnshareUriModal:false});
    }

    unshareUri = () => {
        deleteSharedUri(this.state.unshareUri);
        this.closeUnshareUriModal();
    }

    toggleShareUriMenu = () => {
        if (this.state.shareUriMenuOpen == true) {
            this.setState({
                shareUriMenuOpen:!this.state.shareUriMenuOpen,
                showUnshareUserModal:false,
                showUnshareUriModal:false,
            });
        } else {
            this.setState({
                shareUriMenuOpen:!this.state.shareUriMenuOpen,
                showUnshareUserModal:false,
                showUnshareUriModal:false,
                shareUriMenuUriValue:"",
                shareUriMenuUsersValue:"",
                disableShareUri:true,
            });
        }
    }

    handleShareUriMenuChange = (event) => {
        if (event.target.id == "uri") {
            if (/^[a-zA-Z0-9\-_.]+(?!\s)$/.test(event.target.value) || event.target.value == ""){
                var value = event.target.value;
            } else {
                var value = this.state.shareUriMenuUriValue;
            }
            if (value.length > 0 && this.state.shareUriMenuUsersValue.length>0) {
                var disabled = false;
            } else {
                var disabled = true;
            }
            this.setState({shareUriMenuUriValue:value, disableShareUri:disabled});
        } else if (event.target.id == "users") {
            if (/^[a-zA-Z0-9\-_\. ]+$/.test(event.target.value) || event.target.value == "") {
                var value = event.target.value;
            } else {
                var value = this.state.shareUriMenuUsersValue;
            }
            if (value.length > 0 && this.state.shareUriMenuUriValue.length>0) {
                var disabled = false;
            } else {
                var disabled = true;
            }
            this.setState({shareUriMenuUsersValue:value, disableShareUri:disabled});
        }
    }

    shareUri = () => {
        var input_uri = this.state.shareUriMenuUriValue.split(" ");
        var users = [];
        var uri = "";
        if (input_uri.length == 1) {
            uri = input_uri[0];
        } else {
            for (var i=0;i<input_uri.length;i++) {
                if (input_uri[i].length > 0) {
                    uri = input_uri[i];
                    break;
                }
            }
        }
        var input_users=this.state.shareUriMenuUsersValue.split(" ");
        for (var i = 0;i<input_users.length;i++) {
            if (input_users[i].length > 0) {
                users.push(input_users[i]);
            }
        }
        if (uri.length > 0 && users.length > 0) {
            shareNewUri(uri,users);
            this.toggleShareUriMenu();
        }
    }

    getSharedUris = () => {
        var uris = this.state.uris;
        if (uris.length == 0) {
            return <div>No uris shared</div>
        }
        uris = uris.sort( (a,b) => a.uri > b.uri );
        var menuItems = uris.map( item => {
            var users = [];
            for (var i=0;i<item.users.length;i++){
                var user = (
                  <span key={i} className='label label-user key-row-item'>
                    {item.users[i]}
                    <span id={item.uri+'|'+item.users[i]} className="glyphicon glyphicon-remove key-row-item-buttons clickable" onClick={this.showUnshareUserModal} />
                  </span>
                );
                users.push(user);
            };
            return (
              <div key={item.uri} className="row key-list-item">
                <div className="col-xs-5">
                  <strong style={{display:"inline-block",wordBreak:"break-word"}}>{item.uri}</strong>
                </div>
                <div className="col-xs-6">{users}</div>
                <div className='pull-right'>
                  <ReactBootstrap.ButtonToolbar className="key-list-item-buttons">
                    <ReactBootstrap.ButtonGroup bsSize="xsmall">
                      <ReactBootstrap.Button id={item.uri} bsStyle="danger" style={{marginRight:'5px'}} onClick={this.showUnshareUriModal}>delete</ReactBootstrap.Button>
                    </ReactBootstrap.ButtonGroup>
                  </ReactBootstrap.ButtonToolbar>
                </div>
              </div>
            )
        });
        return (
          <div>
            <div className="row key-header">
              <div className="col-xs-5">Uri</div>
              <div className="col-xs-6">Shared with</div>
            </div>
            {menuItems}
            <ReactBootstrap.Modal show={this.state.showUnshareUserModal} onHide={this.closeUnshareUserModal}>
              <ReactBootstrap.Modal.Header closeButton={true}>
                <ReactBootstrap.Modal.Title>Unshare uri</ReactBootstrap.Modal.Title>
              </ReactBootstrap.Modal.Header>
              <ReactBootstrap.Modal.Body>
                Stop sharing
                <strong> {this.state.unshareUri} </strong>
                with
                <strong> {this.state.unshareUser}</strong>
                ?
              </ReactBootstrap.Modal.Body>
              <ReactBootstrap.Modal.Footer>
                <ReactBootstrap.Button bsStyle="default" onClick={this.closeUnshareUserModal}>Cancel</ReactBootstrap.Button>
                <ReactBootstrap.Button bsStyle="primary" onClick={this.unshareUser}>OK</ReactBootstrap.Button>
              </ReactBootstrap.Modal.Footer>
            </ReactBootstrap.Modal>
            <ReactBootstrap.Modal show={this.state.showUnshareUriModal} onHide={this.closeUnshareUriModal}>
              <ReactBootstrap.Modal.Header closeButton={true}>
                <ReactBootstrap.Modal.Title>Unshare uri</ReactBootstrap.Modal.Title>
              </ReactBootstrap.Modal.Header>
              <ReactBootstrap.Modal.Body>
                Stop sharing
                <strong> {this.state.unshareUri}</strong>
                ?
              </ReactBootstrap.Modal.Body>
              <ReactBootstrap.Modal.Footer>
                <ReactBootstrap.Button bsStyle="default" onClick={this.closeUnshareUriModal}>Cancel</ReactBootstrap.Button>
                <ReactBootstrap.Button bsStyle="primary" onClick={this.unshareUri}>OK</ReactBootstrap.Button>
              </ReactBootstrap.Modal.Footer>
            </ReactBootstrap.Modal>
          </div>
        );
    }

    render () {
        var panelHeading = (
          <div className="panel-title">
            <div className="row">
              <div className="col-xs-6 col-sm-3">
                <div style={{display:"inline-block", float:"none", vertialAlign:"middle"}}>Shared Uris</div>
              </div>
              <div className="pull-right">
                <ReactBootstrap.Button bsStyle="default" bsSize="small" style={{marginRight:'5px'}} onClick={this.toggleShareUriMenu}>Share uri</ReactBootstrap.Button>
              </div>
            </div>
          </div>
        );
        var sharedUris = this.getSharedUris();
        return (
          <div>
            <ReactBootstrap.Panel header={panelHeading}>
              <ReactBootstrap.Collapse in={this.state.shareUriMenuOpen}>
                <div>
                  <ReactBootstrap.Well>
                    <div className='row'>
                      <div className='col-xs-12 col-sm-5 col-sm-offset-3'>
                        <div className="alert alert-info" role="alert">
                          <strong>Important: </strong>
                          <span>uris are shared</span>
                          <strong> recursively </strong>
                          <span>and</span>
                          <strong> read-only.</strong>
                        </div>
                      </div>
                    </div>
                    <div className='row'>
                      <div className='col-xs-12 col-sm-6'>
                        <div className="input-group">
                          <span className="input-group-addon">Share{' '}</span>
                          <input className="form-control" type="text" id="uri" onChange={this.handleShareUriMenuChange} placeholder={this.state.shareUriMenuUriPlaceholder} value={this.state.shareUriMenuUriValue} />
                        </div>
                      </div>
                      <div className='col-xs-12 col-sm-4'>
                        <div className="input-group">
                          <span className="input-group-addon">With{' '}</span>
                          <input className="form-control" type="text" id="users" onChange={this.handleShareUriMenuChange} placeholder={this.state.shareUriMenuUsersPlaceholder} value={this.state.shareUriMenuUsersValue} />
                        </div>
                      </div>
                      <div className="pull-right">
                        <ReactBootstrap.Button bsStyle="success" style={{marginRight:'15px'}} disabled={this.state.disableShareUri} onClick={this.shareUri}>Share uri</ReactBootstrap.Button>
                      </div>
                    </div>
                  </ReactBootstrap.Well>
                </div>
              </ReactBootstrap.Collapse>
              {sharedUris}
            </ReactBootstrap.Panel>
          </div>
        );
    }
}

export {
    ConfigMenu
}

