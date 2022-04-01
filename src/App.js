import React, {useEffect, useState} from 'react';
import Navbar from './components/Navbar';
import {Redirect, Route, Switch} from 'react-router-dom';
import {Peers} from './views/Peers';
import Footer from './components/Footer';
import {useAuth0} from "@auth0/auth0-react";
import Loading from "./components/Loading";
import SetupKeys from "./views/SetupKeys";
import AddPeer from "./views/AddPeer";
import AccessControl from "./views/AccessControl";
import Activity from "./views/Activity";
import Banner from "./components/Banner";

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
        return <Loading/>;
    }

    if (!isAuthenticated) {
        loginWithRedirect({})
    }

    return (
        isAuthenticated && (
            <>

                {/*<div className='h-screen flex justify-center items-center bg-green-400'>*/}
                <Banner/>
                <Navbar toggle={toggle}/>
                <div className="min-h-screen bg-gray-50">
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
                    </Switch>
                </div>
                <Footer/>
            </>

        )
    );
}

export default App;
