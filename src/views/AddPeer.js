import React, {useEffect, useState} from "react";
import {useAuth0, withAuthenticationRequired} from "@auth0/auth0-react";
import Loading from "../components/Loading";
import Highlight from "../components/Highlight";
import {Alert, Badge, Col, Form, Row, Tab, Tabs} from "react-bootstrap";
import {getSetupKeys} from "../api/ManagementAPI";

export const AddPeerComponent = () => {

        const [setupKeys, setSetupKeys] = useState("")
        const [loading, setLoading] = useState(true)
        const [error, setError] = useState(null)
        const [setupKey, setSetupKey] = useState("");

        const {
            getAccessTokenSilently,
        } = useAuth0();

        const handleError = error => {
            console.error('Error to fetch data:', error);
            setLoading(false)
            setError(error);
        };

        useEffect(() => {
            getSetupKeys(getAccessTokenSilently)
                .then(responseData => setSetupKeys(responseData))
                .then(() => setLoading(false))
                .catch(error => handleError(error))
        }, [getAccessTokenSilently])

        return (
            <>
                {loading && (
                    <Loading/>
                )}
                {error != null && (
                    <div className="result-block-container">
                        <span>{error.toString()}</span>
                    </div>
                )}
                {setupKeys && (
                    <div className="mb-5">
                        <h3>Add Peer</h3>
                        <br/>
                        <Form.Group as={Row} className="mb-3" controlId="formHorizontalEmail">

                            <Form.Label column sm={4}>
                                <p className="lead">
                                    <Badge bg="dark" text="light">1</Badge> &nbsp; Select setup key to register peer:
                                </p>
                            </Form.Label>
                            <Col sm={4}>
                                <Form.Control
                                    as="select"
                                    value={setupKey}
                                    onChange={e => {
                                        setSetupKey(e.target.value);
                                    }}
                                >
                                    <option>
                                    </option>
                                    {Array.from(setupKeys).map((key, index) =>
                                        <option
                                            key={index}
                                            value={key.Key}>
                                            {key.Name}
                                        </option>
                                    )}
                                </Form.Control>
                            </Col>
                        </Form.Group>
                        {setupKey && (<Alert variant="secondary">
                            {setupKey.toUpperCase()}
                        </Alert>)}
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
                                <Highlight className="bash">
                                    {"sudo wiretrustee login --setup-key xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \nsudo systemctl start wiretrustee"}
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
                )}
            </>
        );
    }
;

export default withAuthenticationRequired(AddPeerComponent,
    {
        onRedirecting: () => <Loading/>,
    }
);
