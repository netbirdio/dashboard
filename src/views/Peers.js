import React, {useEffect, useState} from "react";
import {useAuth0, withAuthenticationRequired} from "@auth0/auth0-react";
import Loading from "../components/Loading";
import {getPeers} from "../api/ManagementAPI";
import Highlight from "../components/Highlight";


export const Peers = () => {

        const [peers, setPeers] = useState("")
        const [loading, setLoading] = useState(true)
        const [error, setError] = useState(null)

        const {
            getAccessTokenSilently,
        } = useAuth0();

        const handleError = error => {
            console.error('Error to fetch data:', error);
            setLoading(false)
            setError(error);
        };

        useEffect(() => {
            getPeers(getAccessTokenSilently)
                .then(responseData => setPeers(responseData))
                .then(() => setLoading(false))
                .catch(error => handleError(error))
        }, [getAccessTokenSilently])

        return (
            <>
                <div className="py-10">
                    <header>
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <h1 className="text-2xl leading-tight text-gray-900 font-mono">Peers</h1>
                        </div>
                    </header>

                    <main>
                        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                            <div className="px-4 py-8 sm:px-0">
                                {loading && (<Loading/>)}
                                {error != null && (
                                    <span>{error.toString()}</span>
                                )}
                                {peers && (
                                    <Highlight>
                                        <span>{JSON.stringify(peers, null, 2)}</span>
                                    </Highlight>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </>
        );
    }
;

export default withAuthenticationRequired(Peers,
    {
        onRedirecting: () => <Loading/>,
    }
);
