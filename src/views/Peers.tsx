import React, {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {useDispatch, useSelector} from "react-redux";
import {useAuth0, withAuthenticationRequired} from "@auth0/auth0-react";
import { RootState } from "typesafe-actions";
import { actions as peerActions } from '../store/peer';
import Loading from "../components/Loading";
import {Container} from "../components/Container";
import {
    Col,
    Row,
    Typography,
    Table,
    Card,
    Tag,
    Input,
    Space,
    Radio,
    RadioChangeEvent,
    Dropdown,
    Menu,
    Alert, Select, Modal, Button, message
} from "antd";
import {Peer} from "../store/peer/types";
import {filter, transform} from "lodash"
import {formatOS, timeAgo} from "../utils/common";
import {ExclamationCircleOutlined} from "@ant-design/icons";
import loading from "../components/Loading";

const { Title, Paragraph } = Typography;
const { Column } = Table;
const { confirm } = Modal;

interface PeerDataTable extends Peer {
    key: string
}

export const Peers = () => {
    const { getAccessTokenSilently } = useAuth0()
    const dispatch = useDispatch()

    const peers = useSelector((state: RootState) => state.peer.data);
    const failed = useSelector((state: RootState) => state.peer.failed);
    const deletedPeer = useSelector((state: RootState) => state.peer.deletedPeer);

    const [textToSearch, setTextToSearch] = useState('');
    const [optionOnOff, setOptionOnOff] = useState('all');
    const [pageSize, setPageSize] = useState(5);
    const [dataTable, setDataTable] = useState([] as PeerDataTable[]);
    const [peerToAction, setPeerToAction] = useState(null as PeerDataTable | null);

    const pageSizeOptions = [
        {label: "5", value: "5"},
        {label: "10", value: "10"},
        {label: "15", value: "15"}
    ]

    const optionsOnOff = [{label: 'All', value: 'all'}, {label: 'Online', value: 'on'}]

    const itemsMenuAction = [
        {
            key: "delete",
            label: (<Button type="text" onClick={() => showConfirmDelete()}>Delete</Button>)
        }
    ]
    const actionsMenu = (<Menu items={itemsMenuAction} ></Menu>)

    const transformDataTable = (d:Peer[]):PeerDataTable[] => {
        return d.map(p => ({ key: p.IP, ...p } as PeerDataTable))
    }

    useEffect(() => {
        dispatch(peerActions.getPeers.request({getAccessTokenSilently, payload: null}));
    }, [])

    useEffect(() => {
        setDataTable(transformDataTable(peers))
    }, [peers])

    useEffect(() => {
        setDataTable(transformDataTable(filterDataTable()))
    }, [textToSearch, optionOnOff])

    const deleteKey = 'deleting';
    useEffect(() => {
        const style = { marginTop: 85 }
        if (deletedPeer.loading) {
            message.loading({ content: 'Deleting...', key: deleteKey, style });
        } else if (deletedPeer.success) {
            message.success({ content: 'Peer deleted with success!', key: deleteKey, duration: 2, style });
        } else if (deletedPeer.error) {
            message.error({ content: 'Error! Something wrong to delete peer.', key: deleteKey, duration: 2, style  });
        }
    }, [deletedPeer])

    const filterDataTable = ():Peer[] => {
        const t = textToSearch.toLowerCase().trim()
         let f:Peer[] = filter(peers, (f:Peer) =>
             (f.Name.toLowerCase().includes(t) || f.IP.includes(t) || f.OS.includes(t) || t === "")
         ) as Peer[]
        if (optionOnOff === "on") {
            f = filter(peers, (f:Peer) => f.Connected)
        }
        return f
    }

    const onChangeTextToSearch = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setTextToSearch(e.target.value)
    };

    const searchDataTable = () => {
        const data = filterDataTable()
        setDataTable(transformDataTable(data))
    }

    const onChangeOnOff = ({ target: { value } }: RadioChangeEvent) => {
        setOptionOnOff(value)
    }

    const onChangePageSize = (value: string) => {
        setPageSize(parseInt(value.toString()))
    }

    const showConfirmDelete = () => {
        confirm({
            icon: <ExclamationCircleOutlined />,
            width: 600,
            content: <Space direction="vertical" size="small">
                {peerToAction &&
                    <>
                        <Title level={5}>Delete peer "{peerToAction ? peerToAction.Name : ''}"</Title>
                        <Paragraph>Are you sure you want to delete peer from your account?</Paragraph>
                    </>
                }
            </Space>,
            okType: 'danger',
            onOk() {
                dispatch(peerActions.deletedPeer.request({getAccessTokenSilently, payload: peerToAction ? peerToAction.IP : ''}));
            },
            onCancel() {
                setPeerToAction(null);
            },
        });
    }

    return (
        <Container style={{paddingTop: "40px"}}>
            <Row>
                <Col span={24}>
                    <Title level={4}>Peers</Title>
                    <Paragraph>A list of all the machines in your account including their name, IP and status.</Paragraph>
                    <Space direction="vertical" size="large" style={{ display: 'flex' }}>
                        <Row gutter={[16, 24]}>
                            <Col xs={24} sm={24} md={8} lg={8} xl={8} xxl={8} span={8}>
                                {/*<Input.Search allowClear value={textToSearch} onPressEnter={searchDataTable} onSearch={searchDataTable} placeholder="Search..." onChange={onChangeTextToSearch} />*/}
                                <Input allowClear value={textToSearch} onPressEnter={searchDataTable} placeholder="Search..." onChange={onChangeTextToSearch} />
                            </Col>
                            <Col xs={24} sm={24} md={11} lg={11} xl={11} xxl={11} span={11}>
                                <Space size="middle">
                                    <Radio.Group
                                        options={optionsOnOff}
                                        onChange={onChangeOnOff}
                                        value={optionOnOff}
                                        optionType="button"
                                        buttonStyle="solid"
                                    />
                                    <Select value={pageSize.toString()} options={pageSizeOptions} onChange={onChangePageSize} className="select-rows-per-page-en"/>
                                </Space>
                            </Col>
                            <Col xs={24}
                                 sm={24}
                                 md={5}
                                 lg={5}
                                 xl={5}
                                 xxl={5} span={5}>
                                <Row justify="end">
                                    <Col>
                                        <Link to="/add-peer" className="ant-btn ant-btn-primary ant-btn-block">Add Peer</Link>
                                    </Col>
                                </Row>
                            </Col>
                        </Row>
                        {failed &&
                            <Alert message={failed.code} description={failed.message} type="error" showIcon closable/>
                        }
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
                                <Column title="LastSeen" dataIndex="LastSeen"
                                        render={(text, record, index) => {
                                            return (record as PeerDataTable).Connected ? 'just now' : timeAgo(text)
                                        }}
                                />
                                <Column title="OS" dataIndex="OS"
                                        render={(text, record, index) => {
                                            return formatOS(text)
                                        }}
                                />
                                <Column title="Version" dataIndex="Version" />
                                <Column title="" align="center"
                                        render={(text, record, index) => {
                                            return <Dropdown.Button type="text" overlay={actionsMenu} trigger={["click"]}
                                                                    onVisibleChange={visible => {
                                                                        if (visible) setPeerToAction(record as PeerDataTable)
                                                                    }}></Dropdown.Button>
                                        }}
                                />
                            </Table>
                        </Card>
                    </Space>
                </Col>
            </Row>
        </Container>
    )
}

export default withAuthenticationRequired(Peers,
   {
       onRedirecting: () => <Loading/>,
   }
);