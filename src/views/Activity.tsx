import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {actions as eventActions} from '../store/event';
import {Container} from "../components/Container";
import {Alert, Button, Card, Col, Input, Menu, Row, Select, Space, Table, Typography,} from "antd";
import {Event} from "../store/event/types";
import {filter} from "lodash";
import tableSpin from "../components/Spin";
import {useGetAccessTokenSilently} from "../utils/token";
import UserUpdate from "../components/UserUpdate";
import {useOidcUser} from "@axa-fr/react-oidc";
import {formatDateTime} from "../utils/common";

const {Title, Paragraph, Text} = Typography;
const {Column} = Table;

interface EventDataTable extends Event {
}

export const Activity = () => {
    const {getAccessTokenSilently} = useGetAccessTokenSilently()
    const {oidcUser} = useOidcUser();
    const dispatch = useDispatch()

    const events = useSelector((state: RootState) => state.event.data);
    const failed = useSelector((state: RootState) => state.event.failed);
    const loading = useSelector((state: RootState) => state.event.loading);
    const users = useSelector((state: RootState) => state.user.data);
    const peers = useSelector((state: RootState) => state.peer.data);

    const [textToSearch, setTextToSearch] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [dataTable, setDataTable] = useState([] as EventDataTable[]);
    const pageSizeOptions = [
        {label: "5", value: "5"},
        {label: "10", value: "10"},
        {label: "15", value: "15"}
    ]

    const transformDataTable = (d: Event[]): EventDataTable[] => {
        return d.map(p => ({key: p.id, ...p} as EventDataTable))
    }

    useEffect(() => {
        dispatch(eventActions.getEvents.request({getAccessTokenSilently: getAccessTokenSilently, payload: null}));
    }, [])
    useEffect(() => {
        setDataTable(transformDataTable(events))
    }, [events])

    useEffect(() => {
        setDataTable(transformDataTable(filterDataTable()))
    }, [textToSearch])

    const filterDataTable = (): Event[] => {
        const t = textToSearch.toLowerCase().trim()
        let f: Event[] = filter(events, (f: Event) =>
            ((f.activity || f.id).toLowerCase().includes(t) || t === "")
        ) as Event[]
        return f
    }

    const onChangeTextToSearch = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setTextToSearch(e.target.value)
    };

    const searchDataTable = () => {
        const data = filterDataTable()
        setDataTable(transformDataTable(data))
    }

    const onChangePageSize = (value: string) => {
        setPageSize(parseInt(value.toString()))
    }

    const itemsMenuAction = [
        {
            key: "edit",
            label: (<Button type="text">View</Button>)
        },

    ]
    const actionsMenu = (<Menu items={itemsMenuAction}></Menu>)

    const renderInitiator = (event: EventDataTable) => {
        const user = users?.find(u => u.id === event.initiator_id)
        if (user) {
            let body = <span style={{height: "auto", whiteSpace: "normal", textAlign: "left"}}>
                <Row> <Text>{user.name}</Text> </Row>
                <Row> <Text type="secondary">{user.email}</Text> </Row>
            </span>
            return body
        }

        return ""
    }

    const renderTarget = (event: EventDataTable) => {
        if (event.activity_code === "account.create" || event.activity_code === "user.join") {
            return "-"
        }

        switch (event.activity_code) {
            case "account.create":
            case "user.join":
                return "-"
            case "user.peer.add":
                const peer = peers?.find(p => p.ip === event.target_id)
                if (peer) {
                    let body =
                        <span style={{height: "auto", whiteSpace: "normal", textAlign: "left"}}>
                                <Row> <Text>{peer.dns_label}</Text> </Row>
                                <Row> <Text type="secondary">{peer.ip}</Text> </Row>
                            </span>
                    return body
                }
                return "-"
        }

        return event.target_id
    }

    return (
        <>
            <Container style={{paddingTop: "40px"}}>
                <Row>
                    <Col span={24}>
                        <Title level={4}>Activity</Title>
                        <Paragraph>Here you can see all the account and network activity events</Paragraph>
                        <Space direction="vertical" size="large" style={{display: 'flex'}}>
                            <Row gutter={[16, 24]}>
                                <Col xs={24} sm={24} md={8} lg={8} xl={8} xxl={8} span={8}>
                                    <Input allowClear value={textToSearch} onPressEnter={searchDataTable}
                                           placeholder="Search..." onChange={onChangeTextToSearch}/>
                                </Col>
                                <Col xs={24} sm={24} md={11} lg={11} xl={11} xxl={11} span={11}>
                                    <Space size="middle">
                                        <Select value={pageSize.toString()} options={pageSizeOptions}
                                                onChange={onChangePageSize} className="select-rows-per-page-en"/>
                                    </Space>
                                </Col>
                            </Row>
                            {failed &&
                                <Alert message={failed.message} description={failed.data ? failed.data.message : " "}
                                       type="error" showIcon
                                       closable/>
                            }
                            <Card bodyStyle={{padding: 0}}>
                                <Table
                                    pagination={{
                                        pageSize,
                                        showSizeChanger: false,
                                        showTotal: ((total, range) => `Showing ${range[0]} to ${range[1]} of ${total} users`)
                                    }}
                                    className="card-table"
                                    showSorterTooltip={false}
                                    scroll={{x: true}}
                                    loading={tableSpin(loading)}
                                    dataSource={dataTable}>
                                    <Column title="Timestamp" dataIndex="timestamp"
                                            render={(text, record, index) => {
                                                return formatDateTime(text)
                                            }}
                                    />
                                    <Column title="Activity" dataIndex="activity"/>
                                    <Column title="Initiated By" dataIndex="initiator_id"
                                            render={(text, record, index) => {
                                                return renderInitiator(record as EventDataTable)
                                            }}
                                    />
                                    <Column title="Target" dataIndex="target_id"
                                            render={(text, record, index) => {
                                                return renderTarget(record as EventDataTable)
                                            }}
                                    />
                                </Table>
                            </Card>
                        </Space>
                    </Col>
                </Row>
            </Container>
            <UserUpdate/>
        </>
    )
}

export default Activity;