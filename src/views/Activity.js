import React, {useState} from "react";
import {withAuthenticationRequired} from "@auth0/auth0-react";
import Loading from "../components/Loading";


export const ActivityComponent = () => {

        const [error] = useState(null)

        return (
            <>
                <div className="py-10">
                    <header>
                        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                            <h1 className="text-xl font-semibold text-gray-900">Activity</h1>
                        </div>
                    </header>
                    <main>
                        <div className="max-w-5xl mx-auto sm:px-6 lg:px-8">
                            <div className="px-4 py-8 sm:px-0">
                                {error != null && (
                                    <span>{error.toString()}</span>
                                )}

                                <h1 className="text-m leading-tight text-gray-900 font-bold">
                                   Monitor system activity.
                                </h1>
                                <br/>
                                <p className="text-sm">
                                    Here you will be able to see activity of peers. E.g. events like Peer A has connected to Peer B
                                </p>
                                <br/>
                                <p className="text-sm">Stay tuned.</p>
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
