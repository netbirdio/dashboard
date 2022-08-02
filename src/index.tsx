import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import history from "./utils/history";
import { getConfig } from "./config";
import {Auth0Provider} from "@auth0/auth0-react";
import {BrowserRouter} from "react-router-dom";
import Loading from "./components/Loading";

const onRedirectCallback = (appState:any) => {
        navigator.serviceWorker.getRegistrations().then(function (registrations) {
            for (let registration of registrations) {
                registration.unregister().then(function (b) {
                    console.log(b)
                    if (b){
                        window.location.reload()
                    }
                })}})

    history.push(
        appState && appState.returnTo ? appState.returnTo : window.location.pathname
    );
};

const config = getConfig();

const providerConfig = {
    domain: config.domain,
    clientId: config.clientId,
    ...(config.audience ? { audience: config.audience } : null),
    redirectUri: window.location.origin,
    useRefreshTokens: true,
    onRedirectCallback,
};

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

root.render(
    <BrowserRouter>
        <Auth0Provider {...providerConfig}>
            <App/>
        </Auth0Provider>
    </BrowserRouter>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
