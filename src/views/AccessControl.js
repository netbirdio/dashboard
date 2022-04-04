import React, {useState} from "react";
import {withAuthenticationRequired} from "@auth0/auth0-react";
import Loading from "../components/Loading";


export const AccessControlComponent = () => {

        const [error] = useState(null)

        return (
            <>
                <div className="py-10">
                    <header>
                        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                            <h1 className="text-xl font-semibold text-gray-900">Access Control</h1>
                        </div>
                    </header>
                    <main>
                        <div className="max-w-5xl mx-auto sm:px-6 lg:px-8">
                            <div className="px-4 py-8 sm:px-0">
                                {error != null && (
                                    <span>{error.toString()}</span>
                                )}

                                <h1 className="text-m leading-tight text-gray-900 font-bold">
                                    Create and control access groups
                                </h1>
                                <br/>

                                <p className="text-sm">
                                    Here you will be able to specify what peers or groups of peers are able to connect to
                                    each other.
                                    For example, you might have 3 departments in your organization - IT, HR, Finance.
                                    In most cases Finance and HR departments wouldn't need to access machines of the IT
                                    department.
                                    In such scenario you could create 3 separate tags (groups) and label peers accordingly
                                    so that only
                                    peers
                                    from the same group can access each other.
                                    You could also specify what groups can connect to each other and do fine grained control
                                    even on a
                                    peer level.
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

export default withAuthenticationRequired(AccessControlComponent,
    {
        onRedirecting: () => <Loading/>,
    }
);
