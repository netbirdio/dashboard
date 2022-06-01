import React, {useEffect, useState} from 'react';
import {Provider} from "react-redux";
import {Redirect, Route, Switch} from 'react-router-dom';
import {useAuth0} from "@auth0/auth0-react";
import Navbar from './components/Navbar';
import Peers from './views/Peers';
import FooterComponent from './components/FooterComponent';
import Loading from "./components/Loading";
import SetupKeys from "./views/SetupKeys";
import AddPeer from "./views/AddPeer";
import AccessControl from "./views/AccessControl";
import Activity from "./views/Activity";
import Users from './views/Users';
import Banner from "./components/Banner";
import {store} from "./store";

import {Col, Layout, Row} from 'antd';
import { Container } from "./components/Container";

const { Header, Content } = Layout;

function App() {

    const {
        isLoading,
        isAuthenticated,
        loginWithRedirect,
        error
    } = useAuth0();

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

    if (error) {
        return <div>Oops... {error.message}</div>;
    }

    if (isLoading) {
        return <Loading padding="3em" width="50px" height="50px"/>;
    }

    if (!isAuthenticated) {
        loginWithRedirect({})
    }

    return (
        <Provider store={store}>
            { isAuthenticated &&
                <Layout>
                    <Banner/>
                    <Header className="header" style={{display: "flex", flexDirection: "column", justifyContent: "space-around", alignContent: "center"}}>
                        <Row justify="space-around" align="middle">
                            <Col span={24}>
                                <Container>
                                    <Navbar/>
                                </Container>
                            </Col>
                        </Row>
                    </Header>
                    <Content>
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
                            <Route path="/activity" component={Activity}/>
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