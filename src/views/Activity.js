import React from "react";
import {withAuthenticationRequired} from "@auth0/auth0-react";
import Loading from "../components/Loading";

export const ActivityComponent = () => {

      return (
    <>
        <div className="mb-5">
            <h3>Activity</h3>
            <p className="lead">
                Monitor system activity.
            </p>

            <p>
                Here you will be able see the activity of the peers. E.g. events like Peer A has connected to Peer B
                <br/>
                <br/>
                Stay tuned.
            </p>

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
