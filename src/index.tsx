import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import history from "./utils/history";
import { getConfig } from "./config";
import { OidcProvider, useOidc,withOidcSecure } from '@axa-fr/react-oidc';
import {BrowserRouter} from "react-router-dom";
import Loading from "./components/Loading";

const onRedirectCallback = (appState:any) => {
    history.push(
        appState && appState.returnTo ? appState.returnTo : window.location.pathname
    );
};

const config = getConfig();


const providerConfig = {
    authority: 'https://' + config.domain,
    client_id: config.clientId,
    redirect_uri: window.location.origin,
    refresh_time_before_tokens_expiration_in_second: 30,
    silent_redirect_uri: window.location.origin + '/add-peers',
    scope: 'openid profile email api offline_access',
    service_worker_relative_url:'/OidcServiceWorker.js',
    service_worker_only: false,
    ...(config.audience ? {extras:{ audience: config.audience }} : null)
};

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

const loadingComponent = () => <Loading padding="3em" width="50px" height="50px"/>

root.render(
    <BrowserRouter>
        <OidcProvider
            configuration={providerConfig}
            callbackSuccessComponent={loadingComponent}
            authenticatingComponent={loadingComponent}
            sessionLostComponent={loadingComponent}
            loadingComponent={loadingComponent}
        >
            <App/>
        </OidcProvider>
    </BrowserRouter>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
