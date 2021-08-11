import React from "react";
import {withAuthenticationRequired} from "@auth0/auth0-react";
import Loading from "../components/Loading";

export const AccessControlsComponent = () => {

        return (
            <>
                <div className="mb-5">
                    <h3>Access Control</h3>
                    <p className="lead">
                        Create and control access groups
                    </p>

                    <p>
                        Here you will be able to specify what peers or groups of peers are able to connect to each other.
                        For example, you might have 3 departments in your organization - IT, HR, Finance.
                        In most cases Finance and HR departments wouldn't need to access machines of the IT department.
                        In such scenario you could create 3 separate tags (groups) and label peers accordingly so that only
                        peers
                        from the same group can access each other.
                        You could also specify what groups can connect to each other and do fine grained control even on a
                        peer level.
                        <br/>
                        <br/>
                        Stay tuned.
                    </p>

                </div>
            </>
        );
    }
;

export default withAuthenticationRequired(AccessControlsComponent,
    {
        onRedirecting: () => <Loading/>,
    }
);
