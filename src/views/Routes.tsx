import React, {useEffect, useState} from 'react';
import {
    Alert,
    Button,
    Card,
    Col,
    Divider,
    Dropdown,
    Input,
    Menu,
    message,
    Modal, Popover,
    Radio,
    RadioChangeEvent,
    Row,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    Tooltip,
    Typography
} from "antd";
import {Container} from "../components/Container";
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {Route, RouteToSave} from "../store/route/types";
import {actions as routeActions} from "../store/route";
import {actions as peerActions} from "../store/peer";
import {filter, sortBy} from "lodash";
import {ExclamationCircleOutlined, QuestionCircleOutlined} from "@ant-design/icons";
import RouteUpdate from "../components/RouteUpdate";
import tableSpin from "../components/Spin";
import {
    GroupedDataTable,
    initPeerMaps,
    masqueradeDisabledMSG,
    masqueradeEnabledMSG,
    peerToPeerIP,
    RouteDataTable,
    transformDataTable,
    transformGroupedDataTable
} from '../utils/routes'
import {useGetTokenSilently} from "../utils/token";
import {Group} from "../store/group/types";
import {TooltipPlacement} from "antd/es/tooltip";
import {actions as groupActions} from "../store/group";
import {useGetGroupTagHelpers} from "../utils/groups";
import {usePageSizeHelpers} from "../utils/pageSize";

const {Title, Paragraph, Text} = Typography;
const {Column} = Table;
const {confirm} = Modal;

export const Routes = () => {
    const {onChangePageSize,pageSizeOptions,pageSize} = usePageSizeHelpers()
    const {getTokenSilently} = useGetTokenSilently()
    const dispatch = useDispatch()
    const {
        getGroupNamesFromIDs,
    } = useGetGroupTagHelpers()

    const groups = useSelector((state: RootState) => state.group.data)
    const routes = useSelector((state: RootState) => state.route.data);
    const failed = useSelector((state: RootState) => state.route.failed);
    const loading = useSelector((state: RootState) => state.route.loading);
    const deletedRoute = useSelector((state: RootState) => state.route.deletedRoute);
    const savedRoute = useSelector((state: RootState) => state.route.savedRoute);
    const peers = useSelector((state: RootState) => state.peer.data)
    const loadingPeer = useSelector((state: RootState) => state.peer.loading);
    const setupNewRouteVisible = useSelector((state: RootState) => state.route.setupNewRouteVisible)
    const [showTutorial, setShowTutorial] = useState(true)
    const [textToSearch, setTextToSearch] = useState('');
    const [optionAllEnable, setOptionAllEnable] = useState('enabled');
    const [currentPage, setCurrentPage] = useState(1);
    const [dataTable, setDataTable] = useState([] as RouteDataTable[]);
    const [routeToAction, setRouteToAction] = useState(null as RouteDataTable | null);
    const [groupedDataTable, setGroupedDataTable] = useState([] as GroupedDataTable[]);
    const [expandRowsOnClick, setExpandRowsOnClick] = useState(true)
    const [groupPopupVisible, setGroupPopupVisible] = useState(false as boolean | undefined)

    const [peerNameToIP, peerIPToName] = initPeerMaps(peers);
    const optionsAllEnabled = [{label: 'Enabled', value: 'enabled'}, {label: 'All', value: 'all'}]

    const itemsMenuAction = [
        {
            key: "view",
            label: (<Button type="text" block onClick={() => onClickViewRoute()}>View</Button>)
        },
        {
            key: "delete",
            label: (<Button type="text" block onClick={() => showConfirmDelete()}>Delete</Button>)
        }
    ]
    const actionsMenu = (<Menu items={itemsMenuAction}></Menu>)

    const isShowTutorial = (routes: Route[]): boolean => {
        return (!routes.length || (routes.length === 1 && routes[0].network === "Default"))
    }

    useEffect(() => {
        dispatch(routeActions.getRoutes.request({getAccessTokenSilently: getTokenSilently, payload: null}));
    }, [peers])

    useEffect(() => {
        dispatch(peerActions.getPeers.request({getAccessTokenSilently: getTokenSilently, payload: null}));
        dispatch(groupActions.getGroups.request({getAccessTokenSilently: getTokenSilently, payload: null}));
    }, [])

    const filterGroupedDataTable = (routes: GroupedDataTable[]): GroupedDataTable[] => {
        const t = textToSearch.toLowerCase().trim()
        let f: GroupedDataTable[] = filter(routes, (f) =>
            (f.network_id.toLowerCase().includes(t) || f.network.toLowerCase().includes(t) ||
                f.description.toLowerCase().includes(t) || t === "" ||
                getGroupNamesFromIDs(f.routesGroups).find(u => u.toLowerCase().trim().includes(t)) )
        ) as GroupedDataTable[]
        if (optionAllEnable !== "all") {
            f = filter(f, (f) => f.enabled)
        }
        return f
    }

    useEffect(() => {
        setGroupedDataTable(filterGroupedDataTable(transformGroupedDataTable(routes, peers)))
    }, [dataTable])

    useEffect(() => {
        if (failed) {
            setShowTutorial(false)
        } else {
            setShowTutorial(isShowTutorial(routes))
            setDataTable(sortBy(transformDataTable(routes, peers), "network_id"))
        }
    }, [routes])

    useEffect(() => {
        setGroupedDataTable(filterGroupedDataTable(transformGroupedDataTable(routes, peers)))
    }, [textToSearch, optionAllEnable])

    const styleNotification = {marginTop: 85}

    const saveKey = 'saving';
    useEffect(() => {
        if (savedRoute.loading) {
            message.loading({content: 'Saving...', key: saveKey, duration: 0, style: styleNotification})
        } else if (savedRoute.success) {
            message.success({
                content: 'Route has been successfully updated.',
                key: saveKey,
                duration: 2,
                style: styleNotification
            });
            dispatch(routeActions.setSetupNewRouteVisible(false))
            dispatch(routeActions.setSavedRoute({...savedRoute, success: false}))
            dispatch(routeActions.resetSavedRoute(null))
        } else if (savedRoute.error) {
            let errorMsg = "Failed to update network route"
            switch (savedRoute.error.statusCode) {
                case 403:
                    errorMsg = "Failed to update network route. You might not have enough permissions."
                    break
                default:
                    errorMsg = savedRoute.error.data.message ? savedRoute.error.data.message : errorMsg
                    break
            }
            message.error({
                content: errorMsg,
                key: saveKey,
                duration: 5,
                style: styleNotification
            });
            dispatch(routeActions.setSavedRoute({...savedRoute, error: null}))
            dispatch(routeActions.resetSavedRoute(null))
        }
    }, [savedRoute])

    const deleteKey = 'deleting';
    useEffect(() => {
        const style = {marginTop: 85}
        if (deletedRoute.loading) {
            message.loading({content: 'Deleting...', key: deleteKey, style})
        } else if (deletedRoute.success) {
            message.success({content: 'Route has been successfully deleted.', key: deleteKey, duration: 2, style})
            dispatch(routeActions.resetDeletedRoute(null))
        } else if (deletedRoute.error) {
            message.error({
                content: 'Failed to remove route. You might not have enough permissions.',
                key: deleteKey,
                duration: 2,
                style
            })
            dispatch(routeActions.resetDeletedRoute(null))
        }
    }, [deletedRoute])

    const onChangeTextToSearch = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setTextToSearch(e.target.value)
    };

    const searchDataTable = () => {
        setGroupedDataTable(filterGroupedDataTable(transformGroupedDataTable(routes, peers)))
    }

    const onChangeAllEnabled = ({target: {value}}: RadioChangeEvent) => {
        setOptionAllEnable(value)
    }

    const showConfirmDelete = () => {
        let name = routeToAction ? routeToAction.network_id : '';
        confirm({
            icon: <ExclamationCircleOutlined/>,
            title: "Delete network route \"" + name + "\"",
            width: 600,
            content: <Space direction="vertical" size="small">
                <Paragraph>Are you sure you want to delete this route from your account?</Paragraph>
            </Space>,
            okType: 'danger',
            onOk() {
                dispatch(routeActions.deleteRoute.request({
                    getAccessTokenSilently: getTokenSilently,
                    payload: routeToAction?.id || ''
                }));
            },
            onCancel() {
                setRouteToAction(null);
            },
        });
    }


    const onClickAddNewRoute = () => {
        dispatch(routeActions.setSetupNewRouteVisible(true));
        dispatch(routeActions.setRoute({
            network: '',
            network_id: '',
            description: '',
            peer: '',
            masquerade: true,
            metric: 9999,
            enabled: true
        } as Route))
    }

    const onClickViewRoute = () => {
        dispatch(routeActions.setSetupNewRouteHA(false));
        dispatch(routeActions.setSetupNewRouteVisible(true));
        dispatch(routeActions.setRoute({
            id: routeToAction?.id || null,
            network: routeToAction?.network,
            network_id: routeToAction?.network_id,
            description: routeToAction?.description,
            peer: peerToPeerIP(routeToAction!.peer, peerNameToIP[routeToAction!.peer]),
            metric: routeToAction?.metric,
            masquerade: routeToAction?.masquerade,
            enabled: routeToAction?.enabled
        } as Route))
    }

    const setRouteAndView = (route: RouteDataTable) => {
        if (!route.id) {
            dispatch(routeActions.setSetupNewRouteHA(true));
        }
        dispatch(routeActions.setRoute({
            id: route.id || null,
            network: route.network,
            network_id: route.network_id,
            description: route.description,
            peer: route.peer ? peerToPeerIP(route.peer_name, route.peer_ip) : '',
            metric: route.metric ? route.metric : 9999,
            masquerade: route.masquerade,
            enabled: route.enabled,
            groups: route.groups
        } as Route))
        dispatch(routeActions.setSetupNewRouteVisible(true));
    }

    const showConfirmEnableMasquerade = (record: GroupedDataTable, checked: boolean) => {
        let label = record.network_id ? record.network_id : record.network
        let tittle = "Enable Masquerade for \"" + label + "\"?"
        let content = masqueradeDisabledMSG

        if (!checked) {
            tittle = "Disable Masquerade for \"" + label + "\"?"
            content = masqueradeEnabledMSG
        }

        console.log("Asking")
        confirm({
            icon: <ExclamationCircleOutlined/>,
            title: tittle,
            width: 600,
            content: content,
            okType: 'danger',
            onOk() {
                handleSwitchMasquerade(record, checked)
            },
            onCancel() {
            },
        });
    }

    const onPopoverVisibleChange = () => {
        if (setupNewRouteVisible) {
            setGroupPopupVisible(false)
        } else {
            setGroupPopupVisible(undefined)
        }
    }

    function handleSwitchMasquerade(routeGroup: GroupedDataTable, checked: boolean) {
        routeGroup.groupedRoutes.forEach((record) => {
            const route = {
                ...record,
                peer: record.peer,
                masquerade: checked,
                groupsToCreate: []
            } as RouteToSave
            dispatch(routeActions.saveRoute.request({getAccessTokenSilently: getTokenSilently, payload: route}));
        })
    }

    const renderPopoverGroups = (label: string, rowGroups: string[] | null, userToAction: RouteDataTable) => {

        let groupsMap = new Map<string, Group>();
        groups.forEach(g => {
            groupsMap.set(g.id!, g)
        })

        let displayGroups: Group[] = []
        if (rowGroups) {
            displayGroups = rowGroups.filter(g => groupsMap.get(g)).map(g => groupsMap.get(g)!)
        }

        let btn = <Button type="link" onClick={() => setRouteAndView(userToAction)}>{displayGroups.length}</Button>

        if (!displayGroups || displayGroups!.length < 1) {
            return btn
        }

        const content = displayGroups?.map((g, i) => {
            const _g = g as Group
            const peersCount = ` - ${_g.peers_count || 0} ${(!_g.peers_count || parseInt(_g.peers_count) !== 1) ? 'peers' : 'peer'} `
            return (
                <div key={i}>
                    <Tag
                        color="blue"
                        style={{marginRight: 3}}
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
            <Popover placement={popoverPlacement as TooltipPlacement}
                     key={userToAction.id}
                     onOpenChange={onPopoverVisibleChange}
                     open={groupPopupVisible}
                     content={mainContent}
                     title={null}>
                {btn}
            </Popover>
        )
    }

    const expandedRowRender = (record: GroupedDataTable) => {

        return <Table
            dataSource={record.groupedRoutes}
            rowKey="id"
            pagination={false}
            showHeader={true}
            tableLayout="fixed"
            size="small"
            bordered={true}
        >
            <Column title="Routing Peer" dataIndex="peer_name" align="center"
                    onFilter={(value: string | number | boolean, record) => (record as any).peer.includes(value)}
                    sorter={(a, b) => ((a as any).peer.localeCompare((b as any).peer))}
                    render={(text, record) => {
                        return <span onClick={() => setRouteAndView(record as RouteDataTable)}
                                     className="tooltip-label">{text}</span>
                    }}
            />
            <Column title="Metric" dataIndex="metric" align="center"
                    onFilter={(value: string | number | boolean, record) => (record as any).metric.includes(value)}
                    sorter={(a, b) => ((a as any).metric - ((b as any).metric))}
            />
            <Column title="Groups" dataIndex="groupsCount" align="center"
                    render={(text, record: RouteDataTable) => {
                        return renderPopoverGroups(text, record.groups, record)
                    }}
            />
            <Column title="Routing peer status" dataIndex="enabled" align="center"
                    render={(text: Boolean) => {
                        return text ? <Tag color="green">enabled</Tag> : <Tag color="red">disabled</Tag>
                    }}
            />
            <Column title="" align="center"
                    render={(text, record) => {
                        if (deletedRoute.loading || savedRoute.loading) return <></>
                        return <Dropdown.Button type="text" overlay={actionsMenu} trigger={["click"]}
                                                onOpenChange={visible => {
                                                    if (visible) setRouteToAction(record as RouteDataTable)
                                                }}></Dropdown.Button>
                    }}
            />
        </Table>
    };

    return (
        <>
            <Container className="container-main">
                <Row>
                    <Col span={24}>
                        <Title level={4}>Network Routes</Title>
                        <Paragraph>Network routes allow you to create routes to access other networks without installing
                            NetBird on every resource.</Paragraph>
                        <Space direction="vertical" size="large" style={{display: 'flex'}}>
                            <Row gutter={[16, 24]}>
                                <Col xs={24} sm={24} md={8} lg={8} xl={8} xxl={8} span={8}>
                                    <Input allowClear value={textToSearch} onPressEnter={searchDataTable}
                                           placeholder="Search..." onChange={onChangeTextToSearch}/>
                                </Col>
                                <Col xs={24} sm={24} md={11} lg={11} xl={11} xxl={11} span={11}>
                                    <Space size="middle">
                                        <Radio.Group
                                            options={optionsAllEnabled}
                                            onChange={onChangeAllEnabled}
                                            value={optionAllEnable}
                                            optionType="button"
                                            buttonStyle="solid"
                                        />
                                        <Select value={pageSize.toString()} options={pageSizeOptions}
                                                onChange={onChangePageSize} className="select-rows-per-page-en"/>
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
                                            <Button type="primary" disabled={savedRoute.loading}
                                                    onClick={onClickAddNewRoute}>Add Route</Button>
                                        </Col>
                                    </Row>
                                </Col>
                            </Row>
                            {failed &&
                                <Alert message={failed.message} description={failed.data ? failed.data.message : " "} type="error" showIcon
                                       closable/>
                            }
                            <Card bodyStyle={{padding: 0}}>
                                <Table
                                    pagination={{
                                        current: currentPage, hideOnSinglePage: showTutorial, disabled: showTutorial,
                                        pageSize, responsive: true, showSizeChanger: false,
                                        showTotal: ((total, range) => `Showing ${range[0]} to ${range[1]} of ${total} routes`),
                                        onChange: (page) => {
                                            setCurrentPage(page)
                                        }
                                    }}
                                    className={`access-control-table ${showTutorial ? "card-table card-table-no-placeholder" : "card-table"}`}
                                    showSorterTooltip={false}
                                    scroll={{x: true}}
                                    loading={tableSpin(loading || loadingPeer)}
                                    dataSource={groupedDataTable}
                                    expandable={{
                                        expandedRowRender,
                                        expandRowByClick: expandRowsOnClick,
                                        onExpandedRowsChange: (r) => {
                                            setExpandRowsOnClick((!r.length))
                                        },
                                    }}
                                >
                                    <Column title={() =>
                                        <span>
                                            Network Identifier
                                            <Tooltip
                                                title="You can enable high-availability by assigning the same network identifier and network CIDR to multiple routes">
                                                <QuestionCircleOutlined style={{marginLeft: '0.25em', color: "gray"}}/>
                                            </Tooltip>
                                        </span>
                                    }
                                            dataIndex="network_id"
                                            onFilter={(value: string | number | boolean, record) => (record as any).name.includes(value)}
                                            defaultSortOrder='ascend' align="center"
                                            sorter={(a, b) => ((a as any).network_id.localeCompare((b as any).network_id))}
                                            render={(text, record) => {
                                                const desc = (record as RouteDataTable).description.trim()
                                                return <Tooltip title={desc !== "" ? desc : "no description"}
                                                                arrowPointAtCenter>
                                                    <Text strong>{text}</Text>
                                                </Tooltip>
                                            }}
                                    />
                                    <Column title="Network Range" dataIndex="network" align="center"
                                            onFilter={(value: string | number | boolean, record) => (record as any).network.includes(value)}
                                            sorter={(a, b) => ((a as any).network.localeCompare((b as any).network))}
                                        // defaultSortOrder='ascend'
                                    />
                                    <Column title="Route status" dataIndex="enabled" align="center"
                                            render={(text: Boolean) => {
                                                return text ? <Tag color="green">enabled</Tag> :
                                                    <Tag color="red">disabled</Tag>
                                            }}
                                    />
                                    <Column title="Masquerade Traffic" dataIndex="masquerade" align="center"
                                            render={(e, record: GroupedDataTable) => {
                                                let toggle = <Switch size={"small"} checked={e}
                                                                     onClick={(checked: boolean) => {
                                                                         showConfirmEnableMasquerade(record, checked)
                                                                     }}
                                                />
                                                return <Tooltip
                                                    title="Hides the traffic with the routing peer address">
                                                    {toggle}
                                                </Tooltip>
                                            }}
                                    />
                                    <Column title="High Availability" align="center" dataIndex="routesCount"
                                            render={(count, record: RouteDataTable) => {
                                                let tag = <Tag color="red">off</Tag>
                                                if (count > 1) {
                                                    tag = <Tag color="green">on</Tag>
                                                }
                                                return <div>{tag}<Divider type="vertical"/>
                                                    <Button type="link" onClick={() => setRouteAndView(record)}>Configure</Button>
                                                </div>
                                            }}
                                    />
                                </Table>
                                {showTutorial &&
                                    <Space direction="vertical" size="small" align="center"
                                           style={{display: 'flex', padding: '45px 15px'}}>
                                        <Button type="link" onClick={onClickAddNewRoute}>Add new route</Button>
                                    </Space>
                                }
                            </Card>
                        </Space>
                    </Col>
                </Row>
            </Container>
            <RouteUpdate/>
        </>
    )
}

export default Routes;