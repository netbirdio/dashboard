import React, {useEffect, useState} from 'react';
import {
    Alert,
    Button, Card,
    Col, Dropdown, Input, Menu, message, Modal, Popover, Radio, RadioChangeEvent,
    Row, Select, Space, Table, Tag, Tooltip,
    Typography
} from "antd";
import {Container} from "../components/Container";
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {Route} from "../store/route/types";
import {actions as routeActions} from "../store/route";
import {actions as peerActions} from "../store/peer";
import {filter, sortBy} from "lodash";
import {CloseOutlined, ExclamationCircleOutlined} from "@ant-design/icons";
import RouteUpdate from "../components/RouteUpdate";
import {Group} from "../store/group/types";
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

interface GroupsToShow {
    title: string,
    groups: Group[] | string[] | null,
    modalVisible: boolean
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
    const [groupsToShow, setGroupsToShow] = useState({} as GroupsToShow)

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

    const getSourceDestinationLabel = (data:Group[]):string => {
        return (!data) ? "No group" : (data.length > 1) ? `${data.length} Groups` : (data.length === 1) ? data[0].name : "No group"
    }

    const isShowTutorial = (routes:Route[]):boolean => {
        return (!routes.length || (routes.length === 1 && routes[0].prefix === "Default"))
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
            message.error({ content: 'Failed to update route. You might not have enough permissions.', key: saveKey, duration: 2, style: styleNotification  });
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
                        <Title level={5}>Delete route "{routeToAction ? routeToAction.prefix : ''}"</Title>
                        <Paragraph>Are you sure you want to delete peer from your account?</Paragraph>
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

    const showConfirmDeactivate = () => {
        confirm({
            icon: <ExclamationCircleOutlined />,
            width: 600,
            content: <Space direction="vertical" size="small">
                {routeToAction &&
                    <>
                        <Title level={5}>Deactivate route "{routeToAction ? routeToAction.prefix : ''}"</Title>
                        <Paragraph>Are you sure you want to deactivate peer from your account?</Paragraph>
                    </>
                }
            </Space>,
            okType: 'danger',
            onOk() {
                //dispatch(routeActions.deleteRoute.request({getAccessTokenSilently, payload: routeToAction?.id || ''}));
            },
            onCancel() {
                setRouteToAction(null);
            },
        });
    }

    const filterDataTable = ():Route[] => {
        const t = textToSearch.toLowerCase().trim()
        let f:Route[] = filter(routes, (f:Route) =>
            (f.prefix.toLowerCase().includes(t) || f.description.toLowerCase().includes(t) || t === "")
        ) as Route[]
        if (optionAllEnable !== "all") {
             f = filter(f, (f:Route) => f.enabled)
        }
        return f
    }

    const onClickAddNewRoute = () => {
        dispatch(routeActions.setSetupNewRouteVisible(true));
        dispatch(routeActions.setRoute({
            prefix: '',
            description: '',
            peer: '',
            masquerade: false,
            metric: 9999,
            enabled: false
        } as Route))
    }

    const onClickViewRoute = () => {
        dispatch(routeActions.setSetupNewRouteVisible(true));
        dispatch(routeActions.setRoute({
            id: routeToAction?.id || null,
            prefix: routeToAction?.prefix,
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
            prefix: route.prefix,
            description: route.description,
            peer: route.peer,
            metric: route.metric,
            masquerade: route.masquerade,
            enabled: route.enabled
        } as Route))
    }

    const toggleModalGroups = (title:string, groups:Group[] | string[] | null, modalVisible:boolean) => {
        setGroupsToShow({
            title,
            groups,
            modalVisible
        })
    }

    const renderPopoverGroups = (label: string, groups:Group[] | string[] | null, route: RouteDataTable) => {
        const content = groups?.map((g, i) => {
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
        return (
            <Popover content={<Space direction="vertical">{content}</Space>} title={null}>
                <Button type="link" onClick={() => setRouteAndView(route)}>{label}</Button>
            </Popover>
        )
    }

    return(
        <>
            <Container className="container-main">
                <Row>
                    <Col span={24}>
                        <Title level={4}>Access Control</Title>
                        <Paragraph>Access routes help you manage access permissions in your organisation.</Paragraph>
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
                                    <Column title="Description" dataIndex="description"
                                            onFilter={(value: string | number | boolean, record) => (record as any).type.includes(value)}
                                            sorter={(a, b) => ((a as any).type.localeCompare((b as any).type))}
                                    />
                                    <Column title="Prefix" dataIndex="prefix"
                                            onFilter={(value: string | number | boolean, record) => (record as any).name.includes(value)}
                                            sorter={(a, b) => ((a as any).name.localeCompare((b as any).name))}
                                            defaultSortOrder='ascend'
                                    />
                                    <Column title="Enabled" dataIndex="enabled"
                                            render={(text:Boolean, record:RouteDataTable, index) => {
                                                return text ? <Tag color="green">enabled</Tag> : <Tag color="red">disabled</Tag>
                                            }}
                                    />
                                    <Column title="Peer" dataIndex="peer"
                                            onFilter={(value: string | number | boolean, record) => (record as any).type.includes(value)}
                                            sorter={(a, b) => ((a as any).type.localeCompare((b as any).type))}
                                            render={(peerIP:string, RouteDataTable,) => {
                                                let p = peers.find(_p => _p?.ip === peerIP)
                                                return <div>{p?.name}</div>
                                            }}
                                    />
                                    <Column title="Metric" dataIndex="metric"
                                            onFilter={(value: string | number | boolean, record) => (record as any).type.includes(value)}
                                            sorter={(a, b) => ((a as any).type.localeCompare((b as any).type))}
                                    />
                                    <Column title="Masquerade" dataIndex="masquerade"
                                            render={(text:Boolean, record:RouteDataTable, index) => {
                                                return text ? <Tag color="green">enabled</Tag> : <Tag color="red">disabled</Tag>
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
            {/*<AccessControlModalGroups data={groupsToShow.groups} title={groupsToShow.title} visible={groupsToShow.modalVisible} onCancel={() => toggleModalGroups("", [], false)}/>*/}
            <RouteUpdate/>
        </>
    )
}

export default Routes;