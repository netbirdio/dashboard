import React, {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {useDispatch, useSelector} from "react-redux";
import {useAuth0, withAuthenticationRequired} from "@auth0/auth0-react";
import {RootState} from "typesafe-actions";
import {actions as peerActions} from '../store/peer';
import {actions as groupActions} from '../store/group';
import Loading from "../components/Loading";
import {Container} from "../components/Container";
import {
    Alert,
    Button,
    Card,
    Col,
    Dropdown,
    Input,
    Menu,
    message,
    Modal,
    Popover,
    Radio,
    RadioChangeEvent,
    Row,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    Typography,
    Tooltip
} from "antd";
import {Peer} from "../store/peer/types";
import {filter} from "lodash"
import {formatOS, timeAgo} from "../utils/common";
import Icon, {ExclamationCircleOutlined, QuestionCircleOutlined, WarningOutlined} from "@ant-design/icons";
import ButtonCopyMessage from "../components/ButtonCopyMessage";
import {Group, GroupPeer} from "../store/group/types";
import PeerGroupsUpdate from "../components/PeerGroupsUpdate";
import tableSpin from "../components/Spin";
import {TooltipPlacement} from "antd/es/tooltip";

const { Title, Paragraph } = Typography;
const { Column } = Table;
const { confirm } = Modal;

interface PeerDataTable extends Peer {
    key: string;
    groups: Group[];
    groupsCount: number;
}

export const Peers = () => {
    const { getAccessTokenSilently } = useAuth0()
    const dispatch = useDispatch()

    const peers = useSelector((state: RootState) => state.peer.data);
    const failed = useSelector((state: RootState) => state.peer.failed);
    const loading = useSelector((state: RootState) => state.peer.loading);
    const deletedPeer = useSelector((state: RootState) => state.peer.deletedPeer);
    const groups = useSelector((state: RootState) => state.group.data);
    const loadingGroups = useSelector((state: RootState) => state.group.loading);
    const savedGroups = useSelector((state: RootState) => state.peer.savedGroups);
    const updatedPeer = useSelector((state: RootState) => state.peer.updatedPeer);

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

    const optionsOnOff = [{label: 'Online', value: 'on'},{label: 'All', value: 'all'}]

    const itemsMenuAction = [
        {
            key: "delete",
            label: (<Button type="text" onClick={() => showConfirmDelete()}>Delete</Button>)
        }
    ]
    const actionsMenu = (<Menu items={itemsMenuAction} ></Menu>)

    const transformDataTable = (d:Peer[]):PeerDataTable[] => {
        const peer_ids = d.map(_p => _p.id)
        return d.map((p) => {
            const gs = groups
                .filter(g => g.peers?.find((_p:GroupPeer) => _p.id === p.id))
                .map(g => ({id: g.id, name: g.name, peers_count: g.peers?.length, peers: g.peers || []}))
            return {
                key: p.id,
                ...p,
                groups: gs,
                groupsCount: gs.length
            } as PeerDataTable
        })
    }

    useEffect(() => {
        dispatch(peerActions.getPeers.request({getAccessTokenSilently, payload: null}));
        dispatch(groupActions.getGroups.request({getAccessTokenSilently, payload: null}));
    }, [])

    useEffect(() => {
        setDataTable(transformDataTable(peers))
    }, [peers, groups])

    useEffect(() => {
        setDataTable(transformDataTable(filterDataTable()))
    }, [textToSearch, optionOnOff])

    const deleteKey = 'deleting';
    useEffect(() => {
        const style = { marginTop: 85 }
        if (deletedPeer.loading) {
            message.loading({ content: 'Deleting...', key: deleteKey, style });
        } else if (deletedPeer.success) {
            message.success({ content: 'Peer has been successfully removed.', key: deleteKey, duration: 2, style });
            dispatch(peerActions.resetDeletedPeer(null))
        } else if (deletedPeer.error) {
            message.error({ content: 'Failed to delete peer. You might not have enough permissions.', key: deleteKey, duration: 2, style  });
            dispatch(peerActions.resetDeletedPeer(null))
        }
    }, [deletedPeer])

    const saveGroupsKey = 'saving_groups';
    useEffect(() => {
        const style = { marginTop: 85 }
        if (savedGroups.loading) {
            message.loading({ content: 'Updating peer groups...', key: saveGroupsKey, style });
        } else if (savedGroups.success) {
            message.success({ content: 'Peer groups have been successfully updated.', key: saveGroupsKey, duration: 2, style });
            setUpdateGroupsVisible({} as Peer, false)
            dispatch(peerActions.resetSavedGroups(null))
        } else if (savedGroups.error) {
            message.error({ content: 'Failed to update peer groups. You might not have enough permissions.', key: saveGroupsKey, duration: 2, style  });
            dispatch(peerActions.resetSavedGroups(null))
        }
    }, [savedGroups])

    const updatePeerKey = 'updating_peer';
    useEffect(() => {
        const style = { marginTop: 85 }
        if (updatedPeer.loading) {
            message.loading({ content: 'Updating peer...', key: updatePeerKey, duration: 0, style })
        } else if (updatedPeer.success) {
            message.success({ content: 'Peer has been successfully updated.', key: updatePeerKey, duration: 2, style });
            dispatch(peerActions.setUpdatedPeer({ ...updatedPeer, success: false }))
            dispatch(peerActions.resetUpdatedPeer(null))
        } else if (updatedPeer.error) {
            message.error({ content: 'Failed to update peer. You might not have enough permissions.', key: updatePeerKey, duration: 2, style  });
            dispatch(peerActions.setUpdatedPeer({ ...updatedPeer, error: null }))
            dispatch(peerActions.resetUpdatedPeer(null))
        }
    }, [updatedPeer])

    const filterDataTable = ():Peer[] => {
        const t = textToSearch.toLowerCase().trim()
         let f:Peer[] = filter(peers, (f:Peer) =>
             (f.name.toLowerCase().includes(t) || f.ip.includes(t) || f.os.includes(t) || t === "")
         ) as Peer[]
        if (optionOnOff === "on") {
            f = filter(peers, (f:Peer) => f.connected)
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
        let name = peerToAction ? peerToAction.name : ''
        confirm({
            icon: <ExclamationCircleOutlined />,
            title: "Delete peer \"" + name + "\"",
            width: 600,
            content: "Are you sure you want to delete peer from your account?",
            okType: 'danger',
            onOk() {
                dispatch(peerActions.deletedPeer.request({getAccessTokenSilently, payload: peerToAction ? peerToAction.ip : ''}));
            },
            onCancel() {
                setPeerToAction(null);
            },
        });
    }

    const showConfirmEnableSSH = (record: PeerDataTable) => {
        confirm({
            icon: <ExclamationCircleOutlined />,
            title: "Enable SSH Service for \"" + record.name + "\"?",
            width: 600,
            content: "Experimental feature. Enabling this option allows remote SSH access to this machine from other connected network participants.",
            okType: 'danger',
            onOk() {

                handleSwitchSSH(record, true)
            },
            onCancel() {
            },
        });
    }
    function handleSwitchSSH(record: PeerDataTable, checked: boolean) {
        const peer = {
            id: record.id,
            ssh_enabled: checked,
            name: record.name
        } as Peer
        dispatch(peerActions.updatePeer.request({getAccessTokenSilently, payload: peer}));

    }
    const setUpdateGroupsVisible = (peerToAction:Peer, status:boolean) => {
        if (status) {
            dispatch(peerActions.setPeer({...peerToAction}))
            dispatch(peerActions.setUpdateGroupsVisible(true))
            return
        }
        dispatch(peerActions.setPeer(null))
        dispatch(peerActions.setUpdateGroupsVisible(false))
    }

    const renderPopoverGroups = (label: string, groups:Group[] | string[] | null, peerToAction:PeerDataTable) => {
        const content = groups?.map((g,i) => {
            const _g = g as Group
            const peersCount = ` - ${_g.peers_count || 0} ${(!_g.peers_count || parseInt(_g.peers_count) !== 1) ? 'peers' : 'peer'} `
            return (
                <div key={i}>
                    <Tag
                        color="blue"
                        style={{ marginRight: 3 }}
                    >
                        <strong>{_g.name}</strong>
                    </Tag>
                    <span style={{fontSize: ".85em"}}>{peersCount}</span>
                </div>
            )
        })
        const mainContent = (<Space direction="vertical">{content}</Space>)
        let popoverPlacement = "top"
        if (content && content.length > 5) {
            popoverPlacement = "rightTop"
        }

        return (
            <Popover placement={popoverPlacement as TooltipPlacement} key={peerToAction.key} content={mainContent} title={null}>
                <Button type="link" onClick={() => setUpdateGroupsVisible(peerToAction, true)}>{label}</Button>
            </Popover>
        )
    }

    return (
        <>
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
                            {/*{loading && <Loading/>}*/}
                            <Card bodyStyle={{padding: 0}}>
                                <Table
                                    pagination={{pageSize, showSizeChanger: false, showTotal: ((total, range) => `Showing ${range[0]} to ${range[1]} of ${total} peers`)}}
                                    className="card-table"
                                    showSorterTooltip={false}
                                    scroll={{x: true}}
                                    loading={tableSpin(loading)}
                                    dataSource={dataTable}>
                                    <Column title="Name" dataIndex="name"
                                            onFilter={(value: string | number | boolean, record) => (record as any).name.includes(value)}
                                            defaultSortOrder='ascend'
                                            sorter={(a, b) => ((a as any).name.localeCompare((b as any).name))} />
                                    <Column title="IP" dataIndex="ip"
                                            sorter={(a, b) => {
                                                const _a = (a as any).ip.split('.')
                                                const _b = (b as any).ip.split('.')
                                                const a_s = _a.map((i:any) => i.padStart(3, '0')).join()
                                                const b_s = _b.map((i:any) => i.padStart(3, '0')).join()
                                                return a_s.localeCompare(b_s)
                                            }}
                                            render={(text, record, index) => {
                                                return <ButtonCopyMessage keyMessage={(record as PeerDataTable).key} text={text} messageText={'IP copied!'} styleNotification={{}}/>
                                            }}
                                    />
                                    <Column title="Status" dataIndex="connected" align="center"
                                            render={(text, record, index) => {
                                                return text ? <Tag color="green">online</Tag> : <Tag color="red">offline</Tag>
                                            }}
                                    />
                                    <Column title="Groups" dataIndex="groupsCount" align="center"
                                            render={(text, record:PeerDataTable, index) => {
                                                return renderPopoverGroups(text, record.groups, record)
                                            }}
                                    />
                                    <Column
                                        title="SSH Server" dataIndex="ssh_enabled" align="center"
                                            render={(e, record:PeerDataTable, index) => (

                                                <Switch size={"small"} checked={e}
                                                        onClick={(checked: boolean) => {
                                                            if (checked) {
                                                                showConfirmEnableSSH(record)
                                                            } else {
                                                                handleSwitchSSH(record, checked)
                                                            }
                                                        }}
                                                />)
                                    }
                                    />

                                    <Column title="LastSeen" dataIndex="last_seen"
                                            render={(text, record, index) => {
                                                return (record as PeerDataTable).connected ? 'just now' : timeAgo(text)
                                            }}
                                    />
                                    <Column title="OS" dataIndex="os"
                                            render={(text, record, index) => {
                                                return formatOS(text)
                                            }}
                                    />
                                    <Column title="Version" dataIndex="version" />
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
            <PeerGroupsUpdate/>
        </>
    )
}

export default withAuthenticationRequired(Peers,
   {
       onRedirecting: () => <Loading padding="3em" width="50px" height="50px"/>,
   }
);