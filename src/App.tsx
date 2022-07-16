import React, {useEffect, useState} from 'react';
import {Provider} from "react-redux";
import {Link, Redirect, Route, Switch} from 'react-router-dom';
// import {useAuth0} from "@auth0/auth0-react";
import Navbar from './components/Navbar';
import Peers from './views/Peers';
import FooterComponent from './components/FooterComponent';
import Loading from "./components/Loading";
import SetupKeys from "./views/SetupKeys";
import AddPeer from "./views/AddPeer";
import Users from './views/Users';
import AccessControl from './views/AccessControl';
// import Activity from './views/Activity';
import Banner from "./components/Banner";
import {store} from "./store";

import {Button, Col, Layout, Result, Row} from 'antd';
import {Container} from "./components/Container";
import {useOidc, useOidcUser, OidcUserStatus, withOidcSecure} from '@axa-fr/react-oidc';
import { getConfig } from "./config";
const {Header, Content} = Layout;
// const [clickedLogOut, setClickedLogOut] = useState(false)
function App() {
    console.log("entered here at the start")
    const {
        isAuthenticated,
        logout,
        login
    } = useOidc();

    const { oidcUserLoadingState } = useOidcUser();

    const [isOpen, setIsOpen] = useState(false);

    const toggle = () => {
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        const hideMenu = () => {
            if (window.innerWidth > 768 && isOpen) {
                setIsOpen(false);
                console.log('i resized');
            }
        };

        window.addEventListener('resize', hideMenu);

        return () => {
            window.removeEventListener('resize', hideMenu);
        };
    });

    if (oidcUserLoadingState === OidcUserStatus.LoadingError) {
        return <Result
            status="warning"
            title="User loading error"
            extra={<>
                <a href={window.location.origin}>
                    <Button type="primary">
                        Try again
                    </Button>
                </a>
                <Button type="primary" onClick={function () {
                    logout(window.location.origin)
                }}>
                    Log out
                </Button>
            </>
            }
        />
    }

    if (oidcUserLoadingState === OidcUserStatus.Loading) {
        return <Loading padding="3em" width="50px" height="50px"/>;
    }
    console.log(window.location.pathname,"/logout")
    let isLogout = false
    if (window.location.pathname === "/logout") {
        isLogout = true
    }

    if (isLogout) {
        console.log("entered here")
        return <Result
            status="warning"
            title="User loading error"
            extra={<>
                <a href={window.location.origin + "/peers"}>
                    <Button type="primary">
                        Try again
                    </Button>
                </a>
                <Button type="primary" onClick={function () {
                    logout(window.location.origin)
                }}>
                    Log out
                </Button>
            </>
            }
        />
    }
    console.log(!isAuthenticated && !isLogout)
    if (!isAuthenticated && !isLogout) {
        login(window.location.pathname)
    }

    return (
        <Provider store={store}>
            {isAuthenticated &&
                <Layout>
                    <Banner/>
                    <Header className="header" style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-around",
                        alignContent: "center"
                    }}>
                        <Row justify="space-around" align="middle">
                            <Col span={24}>
                                <Container>
                                    <Navbar/>
                                </Container>
                            </Col>
                        </Row>
                    </Header>
                    <Content style={{ minHeight: "100vh"}}>
                        <Switch>
                            <Route
                                exact
                                path="/"
                                render={() => {
                                    return (
                                        <Redirect to="/peers"/>
                                    )
                                }}
                            />
                            <Route path='/peers' exact component={Peers}/>
                            <Route path="/add-peer" component={AddPeer}/>
                            <Route path="/setup-keys" component={SetupKeys}/>
                            <Route path="/acls" component={AccessControl}/>
                            <Route path="/users" component={Users}/>
                        </Switch>
                    </Content>
                    <FooterComponent/>
                </Layout>
            }
        </Provider>
    );
}

export default App;