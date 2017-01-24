
const topics = {
    BAR_MESSAGE: (id) => {
        if (id) {
            return ['barMessage',id].join('-');
        } else {
            return 'barMessage';
        }
    },
    CLOSE_SLIDE:'closeSlide',
    DASHBOARD_CONFIG_REQUEST:'dashboardConfigReq',
    DASHBOARD_CONFIG_UPDATE: (id) => {
        if (id) {
            return ['dashboardConfigUpdate',id].join('.'); //need PubSub anidation capabilities here
        } else {
            return 'dashboardConfigUpdate';
        }
    },
    DATAPOINT_CONFIG_UPDATE: (id) => {
        if (id) {
            return ['datapointConfigUpdate',id].join('-');
        } else {
            return 'datapointConfigUpdate';
        }
    },
    DATAPOINT_CONFIG_REQUEST:'datapointConfigReq',
    DATAPOINT_DATA_UPDATE: (id) => {
        if (id) {
            return ['datapointDataUpdate',id].join('-');
        } else {
            return 'datapointDataUpdate';
        }
    },
    DATAPOINT_DATA_REQUEST:'datapointDataReq',
    DATASOURCE_CONFIG_UPDATE: (id) => {
        if (id) {
            return ['datasourceConfigUpdate',id].join('-');
        } else {
            return 'datasourceConfigUpdate';
        }
    },
    DATASOURCE_CONFIG_REQUEST:'datasourceConfigReq',
    DATASOURCE_DATA_UPDATE: (id) => {
        if (id) {
            return ['datasourceDataUpdate',id].join('-');
        } else {
            return 'datasourceDataUpdate';
        }
    },
    DATASOURCE_DATA_REQUEST:'datasourceDataReq',
    DELETE_DASHBOARD:'deleteDashboard',
    DELETE_DATAPOINT:'deleteDatapoint',
    DELETE_DATASOURCE:'deleteDatasource',
    DELETE_EVENT:'deleteEvent',
    DELETE_SNAPSHOT:'deleteSnapshot',
    DELETE_WIDGET:'deleteWidget',
    LOAD_SLIDE:'loadSlide',
    LOAD_DATAPOINT_SLIDE:'loadDatapointSlide',
    LOAD_DATASOURCE_SLIDE:'loadDatasourceSlide',
    LOCAL_URI_UPDATE:'localUriUpdate',
    MARK_NEGATIVE_VAR:'markNegativeVar',
    MARK_POSITIVE_VAR:'markPositiveVar',
    MODIFY_DASHBOARD:'modifyDashboard',
    MODIFY_DATAPOINT:'modifyDatapoint',
    MODIFY_WIDGET:'modifyWidget',
    MONITOR_DATAPOINT:'monitorDatapoint',
    MY_USER_CONFIG_UPDATE:'myUserConfigUpdate',
    MY_AUTHORIZED_KEYS_CONFIG_UPDATE:'myAuthorizedKeysConfigUpdate',
    MY_PLAN_CONFIG_UPDATE:'myPlanConfigUpdate',
    MY_SHARED_URIS_CONFIG_UPDATE:'mySharedUrisConfigUpdate',
    NEW_DASHBOARD:'newDashboard',
    NEW_EVENTS_UPDATE:'newEventsUpdate',
    NEW_EVENTS_REQUEST:'newEventsReq',
    NEW_SLIDE_LOADED:'newSlideLoaded',
    NEW_WIDGET:'newWidget',
    NEW_WIDGET_DS_SNAPSHOT:'newWidgetDsSnapshot',
    NEW_WIDGET_DP_SNAPSHOT:'newWidgetDpSnapshot',
    NEW_WIDGET_MP_SNAPSHOT:'newWidgetMpSnapshot',
    REMOTE_URI_UPDATE: (owner) => {
        if (owner) {
            return ['remoteUriUpdate',owner].join('.');
        } else {
            return 'remoteUriUpdate';
        }
    },
    SHARED_URIS_WITH_ME_REQUEST:'sharedUrisWithMeReq',
    SHOW_DASHBOARD:'showDashboard',
    SNAPSHOT_CONFIG_REQUEST:'snapshotConfigReq',
    SNAPSHOT_CONFIG_UPDATE: (id) => {
        if (id) {
            return ['snapshotConfigUpdate',id].join('-');
        } else {
            return 'snapshotConfigUpdate';
        }
    },
    SNAPSHOT_DS_DATA_REQUEST:'snapshotDsDataReq',
    SNAPSHOT_DS_DATA_UPDATE: (id) => {
        if (id) {
            return ['snapshotDsDataUpdate',id].join('-');
        } else {
            return 'snapshotDsDataUpdate';
        }
    },
    URI_ACTION_REQUEST:'uriActionReq',
    URI_REQUEST:'uriReq',
    WIDGET_CONFIG_UPDATE: (id) => {
        if (id) {
            return ['widgetConfigUpdate',id].join('-');
        } else {
            return 'widgetConfigUpdate';
        }
    },
    WIDGET_INTERVAL_UPDATE: (id) => {
        if (id) {
            return ['intervalUpdate',id].join('-');
        } else {
            return 'intervalUpdate';
        }
    },
    WIDGET_CONFIG_REQUEST: 'widgetConfigReq',
};

const styles = {
    banner: { color:"#aaa", fontFamily:"sans-serif",fontSize:"18px", fontWeight:"800",lineHeight:"36px", padding:"72px 0 80px", textAlign:"center"},
    eventsBanner: { color:"#aaa", fontFamily:"sans-serif",fontSize:"18px", fontWeight:"800",lineHeight:"36px", padding:"12px 0 10px", textAlign:"center"},
};

const nodes = {
    DATAPOINT:'p',
    DATASOURCE:'d',
    WIDGET:'w',
    VOID:'v',
};

export {
    topics,
    styles,
    nodes
}
