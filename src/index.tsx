import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import history from "./utils/history";
import { getConfig } from "./config";
import {OidcProvider, useOidc} from '@axa-fr/react-oidc';
import {BrowserRouter} from "react-router-dom";
import Loading from "./components/Loading";
import LoginError from "./components/LoginError";

const config = getConfig();

const providerConfig = {
    authority:  config.domain,
    client_id: config.clientId,
    redirect_uri: window.location.origin+'#callback',
    refresh_time_before_tokens_expiration_in_second: 30,
    silent_redirect_uri: window.location.origin + '#silent-callback',
    scope: config.scopesSupported,
    // disabling service worker
    // service_worker_relative_url:'/OidcServiceWorker.js',
    service_worker_only: false,
    authority_configuration: {
        authorization_endpoint: config.authorizationEndpoint,
        token_endpoint: config.tokenEndpoint,
        revocation_endpoint: config.revocationEndpoint,
        end_session_endpoint: config.endSessionEndpoint,
        userinfo_endpoint: config.userinfoEndpoint
    },
    ...(config.audience ? {extras:{ audience: config.audience}} : null)
};

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

const loadingComponent = () => <Loading padding="3em" width="50px" height="50px"/>

root.render(

        <OidcProvider
            configuration={providerConfig}
            callbackSuccessComponent={loadingComponent}
            authenticatingErrorComponent={LoginError}
            authenticatingComponent={loadingComponent}
            sessionLostComponent={loadingComponent}
            loadingComponent={loadingComponent}
            onSessionLost={()=>{
                history.push("/peers")
            }}
        >
            <BrowserRouter>
              <App/>
            </BrowserRouter>
        </OidcProvider>

);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();