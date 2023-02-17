import React, {useEffect, useRef, useState} from 'react';
import {Provider} from "react-redux";
import {apiClient, store} from "./store";
import {hotjar} from 'react-hotjar';
import {getConfig} from "./config";
import Banner from "./components/Banner";
import {Col, Layout, Row} from "antd";
import {Container} from "./components/Container";
import Navbar from "./components/Navbar";
import {Redirect, Route, Switch} from "react-router-dom";
import {withOidcSecure} from "@axa-fr/react-oidc";
import Peers from "./views/Peers";
import Routes from "./views/Routes";
import AddPeer from "./views/AddPeer";
import SetupKeys from "./views/SetupKeys";
import AccessControl from "./views/AccessControl";
import Users from "./views/Users";
import FooterComponent from "./components/FooterComponent";
import {useGetAccessTokenSilently} from "./utils/token";
import {User} from "./store/user/types";
import {SecureLoading} from "./components/Loading";
import DNS from "./views/DNS";
import Activity from "./views/Activity";
import Settings from "./views/Settings";



const {Header, Content} = Layout;

function App() {
    const run = useRef(false)
    const [show, setShow] = useState(false)
    const {getAccessTokenSilently} = useGetAccessTokenSilently();
    const {hotjarTrackID} = getConfig();
    // @ts-ignore
    if (hotjarTrackID && window._DATADOG_SYNTHETICS_BROWSER === undefined) {
        hotjar.initialize(hotjarTrackID, 6);
    }

    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const hideMenu = () => {
            if (window.innerWidth > 768 && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('resize', hideMenu);

        return () => {
            window.removeEventListener('resize', hideMenu);
        };
    }, []);

    useEffect(() => {
        if (!run.current) {
            run.current = true
            apiClient.request<User[]>('GET', `/api/users`, {getAccessTokenSilently: getAccessTokenSilently})
                .then(() => {
                  setShow(true)
                })
                .catch(e => {
                    setShow(true)
                    console.log(e)
                })
        }

    }, [getAccessTokenSilently])

    return (
        <>
            <Provider store={store}>
                {!show && <SecureLoading padding="3em" width={50} height={50}/>}
                {show &&
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
                    <Content style={{minHeight: "100vh"}}>
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
                            <Route path="/dns" component={withOidcSecure(DNS)}/>
                            <Route path="/activity" component={withOidcSecure(Activity)}/>
                            <Route path="/settings" component={withOidcSecure(Settings)}/>
                        </Switch>
                    </Content>
                    <FooterComponent/>
                </Layout>
                }
            </Provider>
        </>
    )
}

export default App;