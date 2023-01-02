import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {actions as eventActions} from '../store/event';
import {Container} from "../components/Container";
import {Alert, Card, Col, Input, Row, Select, Space, Table, Typography,} from "antd";
import {Event} from "../store/event/types";
import {filter} from "lodash";
import tableSpin from "../components/Spin";
import {useGetAccessTokenSilently} from "../utils/token";
import UserUpdate from "../components/UserUpdate";
import {useOidcUser} from "@axa-fr/react-oidc";
import {capitalize, formatDateTime} from "../utils/common";
import {User} from "../store/user/types";

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
    const setupKeys = useSelector((state: RootState) => state.setupKey.data);

    const [textToSearch, setTextToSearch] = useState('');
    const [pageSize, setPageSize] = useState(20);
    const [dataTable, setDataTable] = useState([] as EventDataTable[]);
    const pageSizeOptions = [
        {label: "5", value: "5"},
        {label: "10", value: "10"},
        {label: "15", value: "15"},
        {label: "20", value: "20"}
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
        let usrsMatch: User[] = filter(users, (u: User) => (u.name)?.toLowerCase().includes(t) || (u.email)?.toLowerCase().includes(t)) as User[]
        let f: Event[] = filter(events, (f: Event) =>
            ((f.activity || f.id).toLowerCase().includes(t) || t === "" || usrsMatch.find(u => u.id === f.initiator_id))
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

    const renderActivity = (event: EventDataTable) => {
        let body = <Text>{event.activity}</Text>
        switch (event.activity_code) {
            case "peer.group.add":
                return <Row> <Text>Group <Text type="secondary">{event.meta.group}</Text> added to peer</Text> </Row>
            case "peer.group.delete":
                return <Row> <Text>Group <Text type="secondary">{event.meta.group}</Text> removed from peer</Text>
                </Row>
            case "user.group.add":
                return <Row> <Text>Group <Text type="secondary">{event.meta.group}</Text> added to user</Text> </Row>
            case "user.group.delete":
                return <Row> <Text>Group <Text type="secondary">{event.meta.group}</Text> removed from user</Text>
                </Row>
            case "setupkey.group.add":
                return <Row> <Text>Group <Text type="secondary">{event.meta.group}</Text> added to setup key</Text>
                </Row>
            case "setupkey.group.delete":
                return <Row> <Text>Group <Text type="secondary">{event.meta.group}</Text> removed setup key</Text>
                </Row>
        }
        return body
    }
    const renderInitiator = (event: EventDataTable) => {
        let body = <></>
        const user = users?.find(u => u.id === event.initiator_id)
        switch (event.activity_code) {
            case "setupkey.peer.add":
                const key = setupKeys?.find(k => k.id === event.initiator_id)
                if (key) {
                    body = <span style={{height: "auto", whiteSpace: "normal", textAlign: "left"}}>
                                <Row> <Text>{key.name}</Text> </Row>
                                <Row> <Text type="secondary">Setup Key</Text> </Row>
                            </span>
                }
                break
            default:
                if (user) {
                    body = <span style={{height: "auto", whiteSpace: "normal", textAlign: "left"}}>
                                    <Row> <Text>{user.name ? user.name : user.id}</Text> </Row>
                                    <Row> <Text type="secondary">{user.email ? user.email : "User"}</Text> </Row>
                            </span>
                    return body
                }
        }


        return body
    }

    const renderTarget = (event: EventDataTable) => {
        if (event.activity_code === "account.create" || event.activity_code === "user.join") {
            return "-"
        }
        const user = users?.find(u => u.id === event.target_id)
        switch (event.activity_code) {
            case "account.create":
            case "user.join":
                return "-"
            case "rule.add":
            case "rule.delete":
            case "rule.update":
                return <span style={{height: "auto", whiteSpace: "normal", textAlign: "left"}}>
                            <Row> <Text>{event.meta.name}</Text> </Row>
                            <Row> <Text type="secondary">Rule</Text> </Row>
                        </span>
            case "setupkey.add":
            case "setupkey.revoke":
            case "setupkey.update":
            case "setupkey.overuse":
                return <span style={{height: "auto", whiteSpace: "normal", textAlign: "left"}}>
                            <Row> <Text>{event.meta.name}</Text> </Row>
                            <Row> <Text
                                type="secondary">{capitalize(event.meta.type)} setup key ({event.meta.key})</Text> </Row>
                        </span>
            case "group.add":
            case "group.update":
                return <span style={{height: "auto", whiteSpace: "normal", textAlign: "left"}}>
                            <Row> <Text>{event.meta.name}</Text> </Row>
                            <Row> <Text type="secondary">Group</Text> </Row>
                        </span>
            case "setupkey.peer.add":
            case "user.peer.add":
            case "user.peer.delete":
                return <span style={{height: "auto", whiteSpace: "normal", textAlign: "left"}}>
                        <Row> <Text>{event.meta.fqdn}</Text> </Row>
                        <Row> <Text type="secondary">{event.meta.ip}</Text> </Row>
                    </span>
            case "user.group.add":
            case "user.group.delete":
                if (user) {
                    return <span style={{height: "auto", whiteSpace: "normal", textAlign: "left"}}>
                                    <Row> <Text>{user.name ? user.name : user.id}</Text> </Row>
                                    <Row> <Text type="secondary">{user.email ? user.email : "User"}</Text> </Row>
                               </span>
                }
                return "n/a"
            case "setupkey.group.add":
            case "setupkey.group.delete":
                return <span style={{height: "auto", whiteSpace: "normal", textAlign: "left"}}>
                                    <Row> <Text>{event.meta.setupkey}</Text> </Row>
                                    <Row> <Text type="secondary">Setup Key</Text> </Row>
                               </span>

            case "peer.group.add":
            case "peer.group.delete":
                return <span style={{height: "auto", whiteSpace: "normal", textAlign: "left"}}>
                        <Row> <Text>{event.meta.peer_fqdn}</Text> </Row>
                        <Row> <Text type="secondary">{event.meta.peer_ip}</Text> </Row>
                    </span>
            case "user.invite":
                if (user) {
                    return <span style={{height: "auto", whiteSpace: "normal", textAlign: "left"}}>
                                    <Row> <Text>{user.name ? user.name : user.id}</Text> </Row>
                                    <Row> <Text type="secondary">{user.email ? user.email : "User"}</Text> </Row>
                               </span>
                }

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
                                    dataSource={dataTable}
                                    size="small"
                                >
                                    <Column title="Timestamp" dataIndex="timestamp"
                                            render={(text, record, index) => {
                                                return formatDateTime(text)
                                            }}
                                    />
                                    <Column title="Activity" dataIndex="activity"
                                            render={(text, record, index) => {
                                                return renderActivity(record as EventDataTable)
                                            }}
                                    />
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