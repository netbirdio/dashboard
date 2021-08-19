import React from "react";

import './App.css';
import {useAuth0} from "@auth0/auth0-react";
import Loading from "./components/Loading";
import {Route, Router, Switch, Redirect} from "react-router-dom";
import history from "./utils/history";
import Footer from "./components/Footer";
import NavBar from "./components/NavBar";
import Peers from "./views/Peers";
import AccessControls from "./views/AccessControls";
import Activity from "./views/Activity";
import SetupKeys from "./views/SetupKeys";
import {Container} from "react-bootstrap";

// styles
import "./App.css";

// fontawesome
import initFontAwesome from "./utils/initFontAwesome";
import AddPeer from "./views/AddPeer";
initFontAwesome();

const App = () => {
    const {
        isLoading,
        isAuthenticated,
        loginWithRedirect,
        error
    } = useAuth0();

    if (error) {
        return <div>Oops... {error.message}</div>;
    }

    if (isLoading) {
        return <Loading/>;
    }

    if (!isAuthenticated) {
        loginWithRedirect({})
    }

    return (
        isAuthenticated && (
            <Router history={history}>
                <div id="app" className="d-flex flex-column h-100">
                    <NavBar />
                    <Container className="flex-grow-1 mt-5">
                        <Switch>
                            <Route
                                exact
                                path="/"
                                render={() => {
                                    return (
                                            <Redirect to="/peers" />
                                    )
                                }}
                            />
                            <Route path="/peers" exact component={Peers}/>
                            <Route path="/add-peer" exact component={AddPeer}/>
                            <Route path="/setup-keys" exact component={SetupKeys}/>
                            <Route path="/acls" exact component={AccessControls}/>
                            <Route path="/logs" exact component={Activity}/>
                        </Switch>
                    </Container>
                   <Footer/>
                </div>
            </Router>
        )
    );
};

export default App;
