import React from "react";
import {withAuthenticationRequired} from "@auth0/auth0-react";
import Loading from "../components/Loading";
import Highlight from "../components/Highlight";
import {Badge, Col, Form, Row, Tab, Tabs} from "react-bootstrap";

export const AddPeerComponent = () => {

        return (
            <>
                <div className="mb-5">
                    <h3>Add Peer</h3>
                    <br/>
                    <Form.Group as={Row} className="mb-3" controlId="formHorizontalEmail">

                        <Form.Label column sm={4}>
                            <p className="lead">
                                <Badge bg="dark" text="light">1</Badge> &nbsp; Select Setup Key to register peer:
                            </p>
                        </Form.Label>
                        <Col sm={4}>
                            <Form.Select aria-label="Select a setup key to register peer">
                                <option>Setup Key</option>
                                <option value="1">One</option>
                                <option value="2">Two</option>
                                <option value="3">Three</option>
                            </Form.Select>
                        </Col>
                    </Form.Group>


                    <br/>

                    <Tabs defaultActiveKey="linux" id="uncontrolled-tab-example" className="mb-3">
                        <Tab eventKey="linux" title="Linux">
                            <br/>

                            <p className="lead">
                                <Badge bg="dark" text="light">2</Badge> &nbsp; Add Wiretrustee's repository: </p>
                            <Highlight language="bash">
                                {`curl -fsSL https://pkgs.wiretrustee.com/stable/ubuntu/focal.gpg | sudo apt-key add - \ncurl -fsSL https://pkgs.wiretrustee.com/stable/ubuntu/focal.list | sudo tee /etc/apt/sources.list.d/wiretrustee.list`}
                            </Highlight>

                            <br/>
                            <p className="lead">
                                <Badge bg="dark" text="light">3</Badge> &nbsp; Install Wiretrustee: </p>
                            <Highlight language="bash">
                                {`sudo apt-get update \nsudo apt-get install wiretrustee`}
                            </Highlight>

                            <br/>
                            <p className="lead">
                                <Badge bg="dark" text="light">4</Badge> &nbsp; Login and run Wiretrustee: </p>
                            <Highlight language="bash">
                                {`sudo wiretrustee login --setup-key XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX \nsudo systemctl start wiretrustee`}
                            </Highlight>

                            <br/>
                            <p className="lead">
                                <Badge bg="dark" text="light">5</Badge> Get your IP address: </p>
                            <Highlight language="bash">
                                {`ip addr show wt0`}
                            </Highlight>
                            <p className="lead">
                                <Badge bg="dark" text="light">6</Badge> Repeat on other machines</p>
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
