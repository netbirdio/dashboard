import React from 'react';
import {withAuthenticationRequired} from "@auth0/auth0-react";
import {
    Col,
    Row,
    Typography
} from "antd";
import {Container} from "../components/Container";
import Loading from "../components/Loading";

const { Title, Paragraph } = Typography;

export const AccessControl = () => {
    return(
        <Container style={{paddingTop: "40px"}}>
            <Row>
                <Col span={24}>
                    <Title level={4}>Access Control</Title>
                    <Title level={5}>Create and control access groups</Title>
                    <Paragraph>
                        Here you will be able to specify what peers or groups of peers are able to connect to each other.
                        For example, you might have 3 departments in your organization - IT, HR, Finance.
                        In most cases Finance and HR departments wouldn't need to access machines of the IT department.
                        In such scenario you could create 3 separate tags (groups) and label peers accordingly so that only peers from the same group can access each other.
                        You could also specify what groups can connect to each other and do fine grained control even on a peer level.
                    </Paragraph>
                    <Paragraph>
                        Stay tuned.
                    </Paragraph>
                </Col>
            </Row>
        </Container>
    )
}

export default withAuthenticationRequired(AccessControl,
    {
        onRedirecting: () => <Loading/>,
    }
);