import React from "react";
import {withAuthenticationRequired} from "@auth0/auth0-react";
import Loading from "../components/Loading";
import Highlight from "../components/Highlight";
import {Tab, Tabs} from "react-bootstrap";

export const AddPeerComponent = () => {

        return (
            <>
                <div className="mb-5">
                    <h3>Add Peer</h3>
                    <br/>
                    <Tabs defaultActiveKey="linux" id="uncontrolled-tab-example" className="mb-3">
                        <Tab eventKey="linux" title="Linux">
                            <br/>
                            <p className="lead"> 1. Add Wiretrustee's repository </p>
                            <Highlight language="bash">
                                {`curl -fsSL https://pkgs.wiretrustee.com/stable/ubuntu/focal.gpg | sudo apt-key add - \ncurl -fsSL https://pkgs.wiretrustee.com/stable/ubuntu/focal.list | sudo tee /etc/apt/sources.list.d/wiretrustee.list`}
                            </Highlight>

                            <br/>
                            <p className="lead"> 2. Install Wiretrustee </p>
                            <Highlight language="bash">
                                {`sudo apt-get update \nsudo apt-get install wiretrustee`}
                            </Highlight>

                            <br/>
                            <p className="lead"> 3. Login and run Wiretrustee </p>
                            <Highlight language="bash">
                                {`sudo wiretrustee login --setup-key XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX \nsudo systemctl start wiretrustee`}
                            </Highlight>

                            <br/>
                            <p className="lead"> 4. Get your IP address </p>
                            <Highlight language="bash">
                                {`ip addr show wt0`}
                            </Highlight>
                            <p className="lead"> 5. Repeat on other machines </p>
                        </Tab>
                        <Tab eventKey="macos" title="MacOS">

                        </Tab>
                        <Tab eventKey="windows" title="Windows">

                        </Tab>
                    </Tabs>


                </div>
            </>
        );
    }
;

export default withAuthenticationRequired(AddPeerComponent,
    {
        onRedirecting: () => <Loading/>,
    }
);
