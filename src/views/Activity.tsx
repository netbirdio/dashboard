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

export const Activity = () => {
    return(
        <Container style={{paddingTop: "40px"}}>
            <Row>
                <Col span={24}>
                    <Title level={4}>Activity</Title>
                    <Title level={5}>Monitor system activity.</Title>
                    <Paragraph>
                        Here you will be able to see activity of peers. E.g. events like Peer A has connected to Peer B.
                    </Paragraph>
                    <Paragraph>
                        Stay tuned.
                    </Paragraph>
                </Col>
            </Row>
        </Container>
    )
}

export default withAuthenticationRequired(Activity,
    {
        onRedirecting: () => <Loading/>,
    }
);