import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import history from "./utils/history";
import { getConfig } from "./config";
import {Auth0Provider} from "@auth0/auth0-react";
import {BrowserRouter} from "react-router-dom";

const onRedirectCallback = (appState:any) => {
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

/*
ReactDOM.render(
    <Auth0Provider {...providerConfig}>
        <React.StrictMode>
            <BrowserRouter>
                <App/>
            </BrowserRouter>
        </React.StrictMode>
    </Auth0Provider>,
    document.getElementById('root')
);
*/

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

root.render(
    <BrowserRouter>
        <React.StrictMode>
            <Auth0Provider {...providerConfig}>
                <React.StrictMode>
                    <App/>
                </React.StrictMode>
            </Auth0Provider>
            <App />
        </React.StrictMode>
    </BrowserRouter>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
