import React, {useEffect, useState} from 'react';
import {
    Alert,
    Button, Card,
    Col, Dropdown, Input, Menu, message, Modal, Popover, Radio, RadioChangeEvent,
    Row, Select, Space, Switch, Table, Tag, Tooltip,
    Typography
} from "antd";
import {Container} from "../components/Container";
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {Route} from "../store/route/types";
import {actions as routeActions} from "../store/route";
import {actions as peerActions} from "../store/peer";
import {filter, sortBy} from "lodash";
import { ExclamationCircleOutlined,QuestionCircleOutlined} from "@ant-design/icons";
import RouteUpdate from "../components/RouteUpdate";
import tableSpin from "../components/Spin";
import {useOidcAccessToken} from '@axa-fr/react-oidc';
const { Title, Paragraph } = Typography;
const { Column } = Table;
const { confirm } = Modal;

interface RouteDataTable extends Route {
    key: string;
    sourceCount: number;
    sourceLabel: '';
    destinationCount: number;
    destinationLabel: '';
}

export const Routes = () => {
    const {accessToken} = useOidcAccessToken()
    const dispatch = useDispatch()

    const routes = useSelector((state: RootState) => state.route.data);
    const failed = useSelector((state: RootState) => state.route.failed);
    const loading = useSelector((state: RootState) => state.route.loading);
    const deletedRoute = useSelector((state: RootState) => state.route.deletedRoute);
    const savedRoute = useSelector((state: RootState) => state.route.savedRoute);
    const peers =  useSelector((state: RootState) => state.peer.data)
    const [showTutorial, setShowTutorial] = useState(true)
    const [textToSearch, setTextToSearch] = useState('');
    const [optionAllEnable, setOptionAllEnable] = useState('enabled');
    const [pageSize, setPageSize] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);
    const [dataTable, setDataTable] = useState([] as RouteDataTable[]);
    const [routeToAction, setRouteToAction] = useState(null as RouteDataTable | null);

    const pageSizeOptions = [
        {label: "5", value: "5"},
        {label: "10", value: "10"},
        {label: "15", value: "15"}
    ]

    const optionsAllEnabled = [{label: 'Enabled', value: 'enabled'},{label: 'All', value: 'all'}]

    const itemsMenuAction = [
        {
            key: "view",
            label: (<Button type="text" block onClick={() => onClickViewRoute()}>View</Button>)
        },
        // {
        //     key: "delete",
        //     label: (<Button type="text" block onClick={() => showConfirmDeactivate()}>Deactivate</Button>)
        // },
        {
            key: "delete",
            label: (<Button type="text" block onClick={() => showConfirmDelete()}>Delete</Button>)
        }
    ]
    const actionsMenu = (<Menu items={itemsMenuAction} ></Menu>)


    const isShowTutorial = (routes:Route[]):boolean => {
        return (!routes.length || (routes.length === 1 && routes[0].network === "Default"))
    }

    const transformDataTable = (d:Route[]):RouteDataTable[] => {
        return d.map(p => {
            return {
                key: p.id,
                ...p,
            } as RouteDataTable
        })
    }

    useEffect(() => {
        dispatch(routeActions.getRoutes.request({getAccessTokenSilently:accessToken, payload: null}));
        dispatch(peerActions.getPeers.request({getAccessTokenSilently:accessToken, payload: null}));
    }, [])

    useEffect(() => {
        setShowTutorial(isShowTutorial(routes))
        setDataTable(sortBy(transformDataTable(filterDataTable()), "name"))
    }, [routes])

    useEffect(() => {
        setDataTable(transformDataTable(filterDataTable()))
    }, [textToSearch, optionAllEnable])

    const styleNotification = { marginTop: 85 }

    const saveKey = 'saving';
    useEffect(() => {
        if (savedRoute.loading) {
            message.loading({ content: 'Saving...', key: saveKey, duration: 0, style: styleNotification })
        } else if (savedRoute.success) {
            message.success({ content: 'Route has been successfully updated.', key: saveKey, duration: 2, style: styleNotification });
            dispatch(routeActions.setSetupNewRouteVisible(false))
            dispatch(routeActions.setSavedRoute({ ...savedRoute, success: false }))
            dispatch(routeActions.resetSavedRoute(null))
        } else if (savedRoute.error) {
            message.error({ content: savedRoute.error.data? savedRoute.error.data : savedRoute.error.message, key: saveKey, duration: 2, style: styleNotification  });
            dispatch(routeActions.setSavedRoute({ ...savedRoute, error: null }))
            dispatch(routeActions.resetSavedRoute(null))
        }
    }, [savedRoute])

    const deleteKey = 'deleting';
    useEffect(() => {
        const style = { marginTop: 85 }
        if (deletedRoute.loading) {
            message.loading({ content: 'Deleting...', key: deleteKey, style })
        } else if (deletedRoute.success) {
            message.success({ content: 'Route has been successfully disabled.', key: deleteKey, duration: 2, style })
            dispatch(routeActions.resetDeletedRoute(null))
        } else if (deletedRoute.error) {
            message.error({ content: 'Failed to remove route. You might not have enough permissions.', key: deleteKey, duration: 2, style  })
            dispatch(routeActions.resetDeletedRoute(null))
        }
    }, [deletedRoute])

    const onChangeTextToSearch = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setTextToSearch(e.target.value)
    };

    const searchDataTable = () => {
        const data = filterDataTable()
        setDataTable(transformDataTable(data))
    }

    const onChangeAllEnabled = ({ target: { value } }: RadioChangeEvent) => {
        setOptionAllEnable(value)
    }

    const onChangePageSize = (value: string) => {
        setPageSize(parseInt(value.toString()))
    }

    const showConfirmDelete = () => {
        confirm({
            icon: <ExclamationCircleOutlined />,
            width: 600,
            content: <Space direction="vertical" size="small">
                {routeToAction &&
                    <>
                        <Title level={5}>Delete netowork route "{routeToAction ? routeToAction.network_id : ''}"</Title>
                        <Paragraph>Are you sure you want to delete this route from your account?</Paragraph>
                    </>
                }
            </Space>,
            okType: 'danger',
            onOk() {
                dispatch(routeActions.deleteRoute.request({getAccessTokenSilently:accessToken, payload: routeToAction?.id || ''}));
            },
            onCancel() {
                setRouteToAction(null);
            },
        });
    }

    const filterDataTable = ():Route[] => {
        const t = textToSearch.toLowerCase().trim()
        let f:Route[] = filter(routes, (f:Route) =>
            (f.network_id.toLowerCase().includes(t) ||f.network.toLowerCase().includes(t) || f.description.toLowerCase().includes(t) || t === "")
        ) as Route[]
        if (optionAllEnable !== "all") {
             f = filter(f, (f:Route) => f.enabled)
        }
        return f
    }

    const onClickAddNewRoute = () => {
        dispatch(routeActions.setSetupNewRouteVisible(true));
        dispatch(routeActions.setRoute({
            network: '',
            network_id: '',
            description: '',
            peer: '',
            masquerade: false,
            metric: 9999,
            enabled: true
        } as Route))
    }

    const onClickViewRoute = () => {
        dispatch(routeActions.setSetupNewRouteVisible(true));
        dispatch(routeActions.setRoute({
            id: routeToAction?.id || null,
            network: routeToAction?.network,
            network_id: routeToAction?.network_id,
            description: routeToAction?.description,
            peer: routeToAction?.peer,
            metric: routeToAction?.metric,
            masquerade: routeToAction?.masquerade,
            enabled: routeToAction?.enabled
        } as Route))
    }

    const setRouteAndView = (route: RouteDataTable) => {
        dispatch(routeActions.setSetupNewRouteVisible(true));
        dispatch(routeActions.setRoute({
            id: route.id || null,
            network: route.network,
            network_id: route.network_id,
            description: route.description,
            peer: route.peer,
            metric: route.metric,
            masquerade: route.masquerade,
            enabled: route.enabled
        } as Route))
    }

    const showConfirmEnableMasquerade = (record: RouteDataTable, checked: boolean) => {
        let label = record.network_id ? record.network_id : record.network
        let tittle = "Enable Masquerade for \"" + label + "\"?"
        let content = "Enabling this option hides all traffic from other NetBird peers through the routing peer address."

        if (!checked) {
            tittle = "Disable Masquerade for \"" + label + "\"?"
            content = "Disabling this option stops hiding all traffic coming from other NetBird peers through the routing peer address."
        }

        confirm({
            icon: <ExclamationCircleOutlined />,
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

    function handleSwitchMasquerade(record: RouteDataTable, checked: boolean) {
        const route = {
            ...record,
            masquerade: checked,
        } as Route
        dispatch(routeActions.saveRoute.request({getAccessTokenSilently:accessToken, payload: route}));
    }

    return(
        <>
            <Container className="container-main">
                <Row>
                    <Col span={24}>
                        <Title level={4}>Network Routes</Title>
                        <Paragraph>Network routes allow you to create routes to access other networks without installing NetBird on every resource.</Paragraph>
                        <Space direction="vertical" size="large" style={{ display: 'flex' }}>
                            <Row gutter={[16, 24]}>
                                <Col xs={24} sm={24} md={8} lg={8} xl={8} xxl={8} span={8}>
                                    <Input allowClear value={textToSearch} onPressEnter={searchDataTable} placeholder="Search..." onChange={onChangeTextToSearch} />
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
                                            <Button type="primary" disabled={savedRoute.loading} onClick={onClickAddNewRoute}>Add Route</Button>
                                        </Col>
                                    </Row>
                                </Col>
                            </Row>
                            {failed &&
                                <Alert message={failed.code} description={failed.message} type="error" showIcon closable/>
                            }
                            <Card bodyStyle={{padding: 0}}>
                                <Table
                                    pagination={{
                                        current: currentPage, hideOnSinglePage: showTutorial, disabled: showTutorial,
                                        pageSize, responsive: true, showSizeChanger: false,
                                        showTotal: ((total, range) => `Showing ${range[0]} to ${range[1]} of ${total} routes`),
                                        onChange: (page, pageSize) => {
                                            setCurrentPage(page)
                                        }
                                    }}
                                    className={`access-control-table ${showTutorial ? "card-table card-table-no-placeholder" : "card-table"}`}
                                    showSorterTooltip={false}
                                    scroll={{x: true}}
                                    loading={tableSpin(loading)}
                                    dataSource={dataTable}>
                                    <Column title={() =>
                                        <span>
                                            Network Identifier
                                            <Tooltip title="You can combine an identifier with a Network CIDR to form a high availability route">
                                                <QuestionCircleOutlined style={{ marginLeft: '0.25em', color: "gray" }}/>
                                            </Tooltip>
                                        </span>
                                    }
                                            dataIndex="network_id"
                                            onFilter={(value: string | number | boolean, record) => (record as any).name.includes(value)}
                                            defaultSortOrder='ascend'
                                            sorter={(a, b) => ((a as any).network_id.localeCompare((b as any).network_id))}
                                            render={(text, record, index) => {
                                                const desc = (record as RouteDataTable).description.trim()
                                                return <Tooltip title={desc !== "" ?  desc : "no description"} arrowPointAtCenter>
                                                    <span onClick={() => setRouteAndView(record as RouteDataTable)} className="tooltip-label">{text}</span>
                                                </Tooltip>
                                            }}
                                    />
                                    <Column title="Network CIDR" dataIndex="network"
                                            onFilter={(value: string | number | boolean, record) => (record as any).network.includes(value)}
                                            sorter={(a, b) => ((a as any).network.localeCompare((b as any).network))}
                                            defaultSortOrder='ascend'
                                    />
                                    <Column title="Enabled" dataIndex="enabled"
                                            render={(text:Boolean, record:RouteDataTable, index) => {
                                                return text ? <Tag color="green">enabled</Tag> : <Tag color="red">disabled</Tag>
                                            }}
                                    />
                                    <Column title="Routing Peer" dataIndex="peer"
                                            onFilter={(value: string | number | boolean, record) => (record as any).peer.includes(value)}
                                            sorter={(a, b) => ((a as any).peer.localeCompare((b as any).peer))}
                                            render={(peerIP:string, RouteDataTable,) => {
                                                let p = peers.find(_p => _p?.ip === peerIP)
                                                return <div>{p?.name}</div>
                                            }}
                                    />
                                    <Column title="Metric" dataIndex="metric"
                                            onFilter={(value: string | number | boolean, record) => (record as any).metric.includes(value)}
                                            sorter={(a, b) => ((a as any).metric - ((b as any).metric))}
                                    />
                                    <Column title="Masquerade traffic" dataIndex="masquerade"
                                            render={(e, record: RouteDataTable, index) => {
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
                                    <Column title="" align="center"
                                            render={(text, record, index) => {
                                                if (deletedRoute.loading || savedRoute.loading) return <></>
                                                return <Dropdown.Button type="text" overlay={actionsMenu} trigger={["click"]}
                                                                     onVisibleChange={visible => {
                                                                         if (visible) setRouteToAction(record as RouteDataTable)
                                                                     }}></Dropdown.Button>
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