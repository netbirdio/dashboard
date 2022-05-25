import React, {useEffect, useState} from 'react';
import {Link, NavLink} from 'react-router-dom';
import {useDispatch, useSelector} from "react-redux";
import {useAuth0, withAuthenticationRequired} from "@auth0/auth0-react";
import { RootState } from "typesafe-actions";
import { actions as peerActions } from '../store/peer';
import Loading from "../components/Loading";
import {Container} from "../components/Container";
import {Col, Row, Typography, Table, Card, Tag} from "antd";
import {Peer} from "../store/peer/types";

const { Title, Paragraph } = Typography;
const { Column } = Table;

export const Peers = () => {
    const { getAccessTokenSilently } = useAuth0()
    const dispatch = useDispatch()

    const peers = useSelector((state: RootState) => state.peer.data);

    const [pageSize, setPageSize] = useState(5);
    const [dataTable, setDataTable] = useState([] as Peer[]);

    useEffect(() => {
        dispatch(peerActions.getPeers.request({getAccessTokenSilently, payload: null}));
    }, [])

    useEffect(() => {
        setDataTable(peers.map(p => ({ key: p.IP, ...p })))
    }, [peers])

    return (
        <Container style={{paddingTop: "40px"}}>
            <Row>
                <Col span={24}>
                    <Title level={4}>Peers</Title>
                    <Paragraph>A list of all the machines in your account including their name, IP and status.</Paragraph>
                    <Card bodyStyle={{padding: 0}}>
                        <Table
                            pagination={{pageSize, showTotal: ((total, range) => `Showing ${range[0]} to ${range[1]} of ${total} peers`)}}
                            className="card-table"
                            // footer={() => 'Footer'}
                            scroll={{x: true}}
                            dataSource={dataTable}>
                            <Column title="Name" dataIndex="Name" key="Name"
                                    onFilter={(value: string | number | boolean, record) => (record as any).Name.includes(value)}
                                    sorter={(a, b) => ((a as any).Name.localeCompare((b as any).Name))} />
                            <Column title="IP" dataIndex="IP"
                                    sorter={(a, b) => {
                                        const _a = (a as any).IP.split('.')
                                        const _b = (b as any).IP.split('.')
                                        const a_s = _a.map((i:any) => i.padStart(3, '0')).join()
                                        const b_s = _b.map((i:any) => i.padStart(3, '0')).join()
                                        return a_s.localeCompare(b_s)
                                    }} />
                            <Column title="Status" dataIndex="Connected"
                                    render={(text, record, index) => {
                                        return text ? <Tag color="green">online</Tag> : <Tag color="red">offline</Tag>
                                    }}
                            />
                            <Column title="LastSeen" dataIndex="LastSeen" />
                            <Column title="OS" dataIndex="OS" />
                        </Table>
                    </Card>
                </Col>
            </Row>
            <br/>
        </Container>
    )
}

export default withAuthenticationRequired(Peers,
   {
       onRedirecting: () => <Loading/>,
   }
);

//ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji