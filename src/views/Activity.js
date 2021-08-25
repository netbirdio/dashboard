import React, {useState} from "react";
import {withAuthenticationRequired} from "@auth0/auth0-react";
import Loading from "../components/Loading";


export const ActivityComponent = () => {

        const [error, setError] = useState(null)

        return (
            <>
                <div className="py-10">
                    <header>
                        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                            <h1 className="text-2xl font-mono leading-tight text-gray-900 font-bold">Access Control</h1>
                        </div>
                    </header>
                    <main>
                        <div className="max-w-5xl mx-auto sm:px-6 lg:px-8">
                            <div className="px-4 py-8 sm:px-0">
                                {error != null && (
                                    <span>{error.toString()}</span>
                                )}

                                <h1 className="text-m font-mono leading-tight text-gray-900 font-bold">
                                   Monitor system activity.
                                </h1>
                                <br/>
                                <p className="text-sm font-mono">
                                    Here you will be able to see activity of peers. E.g. events like Peer A has connected to Peer B
                                </p>
                                <br/>
                                <p className="text-sm font-mono">Stay tuned.</p>
                            </div>
                        </div>
                    </main>
                </div>
            </>
        );
    }
;

export default withAuthenticationRequired(ActivityComponent,
    {
        onRedirecting: () => <Loading/>,
    }
);
