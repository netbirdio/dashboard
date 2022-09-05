import React, {useEffect, useState} from 'react';
import {Provider} from "react-redux";
import {Redirect, Route, Switch} from 'react-router-dom';
import Navbar from './components/Navbar';
import Peers from './views/Peers';
import FooterComponent from './components/FooterComponent';
import SetupKeys from "./views/SetupKeys";
import AddPeer from "./views/AddPeer";
import Users from './views/Users';
import AccessControl from './views/AccessControl';
import Routes from './views/Routes';
import Banner from "./components/Banner";
import {store} from "./store";
import { Col, Layout, Row} from 'antd';
import {Container} from "./components/Container";
import {withOidcSecure} from '@axa-fr/react-oidc';

const {Header, Content} = Layout;

function App() {

    const [isOpen, setIsOpen] = useState(false);

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

    return (
        <Provider store={store}>
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
                            <Route path='/peers' exact component={withOidcSecure(Peers)}/>
                            <Route path="/add-peer" component={withOidcSecure(AddPeer)}/>
                            <Route path="/setup-keys" component={withOidcSecure(SetupKeys)}/>
                            <Route path="/acls" component={withOidcSecure(AccessControl)}/>
                            <Route path="/routes" component={withOidcSecure(Routes)}/>
                            <Route path="/users" component={withOidcSecure(Users)}/>
                        </Switch>
                    </Content>
                    <FooterComponent/>
                </Layout>
        </Provider>
    );
}

export default App;