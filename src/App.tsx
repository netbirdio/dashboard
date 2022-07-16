import React, {useEffect, useState} from 'react';
import {Provider} from "react-redux";
import {Redirect, Route, Switch} from 'react-router-dom';
import Navbar from './components/Navbar';
import Peers from './views/Peers';
import FooterComponent from './components/FooterComponent';
import Loading from "./components/Loading";
import SetupKeys from "./views/SetupKeys";
import AddPeer from "./views/AddPeer";
import Users from './views/Users';
import AccessControl from './views/AccessControl';
import Banner from "./components/Banner";
import {store} from "./store";
import {Button, Col, Layout, Result, Row} from 'antd';
import {Container} from "./components/Container";
import {useOidc, useOidcUser, OidcUserStatus, withOidcSecure} from '@axa-fr/react-oidc';

const {Header, Content} = Layout;

function App() {

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

    if (!isAuthenticated) {
        login(window.location.pathname)
    }

    return (
        <Provider store={store}>
            { isAuthenticated &&
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

export default withOidcSecure(App);