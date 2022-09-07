import React, {useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import { actions as routeActions } from '../store/route';
import {
    Col,
    Row,
    Input,
    InputNumber,
    Space,
    Switch,
    SelectProps,
    Button, Drawer, Form, Divider, Select, Radio, Typography
} from "antd";
import {CloseOutlined, FlagFilled, QuestionCircleFilled} from "@ant-design/icons";
import {Route} from "../store/route/types";
import {Header} from "antd/es/layout/layout";
import {RuleObject} from "antd/lib/form";
import {useOidcAccessToken} from "@axa-fr/react-oidc";
import cidrRegex from 'cidr-regex';
import {
    masqueradeDisabledMSG,
    peerToPeerIP,
    initPeerMaps,
    routePeerSeparator,
    transformGroupedDataTable
} from '../utils/routes'

const { Paragraph } = Typography;

interface FormRoute extends Route {
}

const RouteUpdate = () => {
    const {accessToken} = useOidcAccessToken()
    const dispatch = useDispatch()
    const setupNewRouteVisible = useSelector((state: RootState) => state.route.setupNewRouteVisible)
    const setupNewRouteHA = useSelector((state: RootState) => state.route.setupNewRouteHA)
    const peers =  useSelector((state: RootState) => state.peer.data)
    const route =  useSelector((state: RootState) => state.route.route)
    const routes =  useSelector((state: RootState) => state.route.data)
    const savedRoute = useSelector((state: RootState) => state.route.savedRoute)
    // const [groupedDataTable, setGroupedDataTable] = useState([] as GroupedDataTable[]);
    const [previousRouteKey, setPreviousRouteKey] = useState("")
    const [editName, setEditName] = useState(false)
    const [editDescription, setEditDescription] = useState(false)
    const options: SelectProps['options'] = [];
    const [formRoute, setFormRoute] = useState({} as FormRoute)
    const [form] = Form.useForm()
    const inputNameRef = useRef<any>(null)
    const inputDescriptionRef = useRef<any>(null)

    const defaultRoutingPeerMSG = "Routing Peer"
    const [routingPeerMSG, setRoutingPeerMSG] = useState(defaultRoutingPeerMSG)
    const defaultMasqueradeMSG = "Masquerade"
    const [masqueradeMSG, setMasqueradeMSG] = useState(defaultMasqueradeMSG)
    const defaultStatusMSG = "Status"
    const [statusMSG, setStatusMSG] = useState(defaultStatusMSG)
    const [peerNameToIP, peerIPToName] = initPeerMaps(peers);

    const optionsDisabledEnabled = [{label: 'Enabled', value: true}, {label: 'Disabled', value: false}]

    useEffect(() => {
        if (setupNewRouteHA) {
            // setGroupedDataTable(transformGroupedDataTable(routes,peerIPToName))
            setRoutingPeerMSG("Add additional routing peer")
            setMasqueradeMSG("Update Masquerade")
            setStatusMSG("Update Status")
        } else {
            setRoutingPeerMSG(defaultRoutingPeerMSG)
            setMasqueradeMSG(defaultMasqueradeMSG)
            setStatusMSG(defaultStatusMSG)
            setPreviousRouteKey("")
        }
    }, [setupNewRouteHA])

    useEffect(() => {
        if (editName) inputNameRef.current!.focus({
            cursor: 'end',
        });
    }, [editName]);

    useEffect(() => {
        if (editDescription) inputDescriptionRef.current!.focus({
            cursor: 'end',
        });
    }, [editDescription]);

    useEffect(() => {
        if (!route) return

        const fRoute = {
            ...route,
        } as FormRoute
        setFormRoute(fRoute)
        setPreviousRouteKey(fRoute.network_id+fRoute.network)
        form.setFieldsValue(fRoute)
    }, [route])

    peers.forEach((p) => {
        let os:string
        os = p.os
        if (!os.toLowerCase().startsWith("darwin") && !os.toLowerCase().startsWith("windows")) {
            options?.push({
                label: peerToPeerIP(p.name,p.ip),
                value: peerToPeerIP(p.name,p.ip),
                disabled: false
            })
        }
    })

    const createRouteToSave = (inputRoute:FormRoute):Route => {
        let peerIDList = inputRoute.peer.split(routePeerSeparator)
        let peerID:string
        if (peerIDList[1]) {
            peerID = peerIDList[1]
        } else {
            peerID = peerNameToIP[inputRoute.peer]
        }

        return {
            id: inputRoute.id,
            network: inputRoute.network,
            network_id: inputRoute.network_id,
            description: inputRoute.description,
            peer: peerID,
            enabled: inputRoute.enabled,
            masquerade: inputRoute.masquerade,
            metric: inputRoute.metric
        } as Route
    }

    const handleFormSubmit = () => {
        form.validateFields()
            .then(() => {
                if (!setupNewRouteHA || formRoute.peer != '') {
                    const routeToSave = createRouteToSave(formRoute)
                    dispatch(routeActions.saveRoute.request({getAccessTokenSilently:accessToken, payload: routeToSave}))
                } else {
                    let groupedDataTable = transformGroupedDataTable(routes,peerIPToName)
                    groupedDataTable.forEach((group) => {
                        if (group.key == previousRouteKey) {
                            group.groupedRoutes.forEach((route) => {
                                let updateRoute:FormRoute = {
                                    ...formRoute,
                                    id: route.id,
                                    peer: route.peer,
                                    metric: route.metric,
                                    enabled: (formRoute.enabled != group.enabled) ? formRoute.enabled : route.enabled
                                }
                                const routeToSave = createRouteToSave(updateRoute)
                                dispatch(routeActions.saveRoute.request({getAccessTokenSilently:accessToken, payload: routeToSave}))
                            })
                        }
                    })
                }

            })
            .catch((errorInfo) => {
                console.log('errorInfo', errorInfo)
            });
    };

    const setVisibleNewRoute = (status:boolean) => {
        dispatch(routeActions.setSetupNewRouteVisible(status));
    }

    const setSetupNewRouteHA = (status:boolean) => {
        dispatch(routeActions.setSetupNewRouteHA(status));
    }

    const onCancel = () => {
        if (savedRoute.loading) return
        setEditName(false)
        dispatch(routeActions.setRoute({
            network: '',
            network_id: '',
            description: '',
            peer: "",
            metric: 9999,
            masquerade: false,
            enabled: true
        } as Route))
        setVisibleNewRoute(false)
        setSetupNewRouteHA(false)
        setPreviousRouteKey("")
    }

    const onChange = (data:any) => {
        setFormRoute({...formRoute, ...data})
    }

    const dropDownRender = (menu: React.ReactElement) => (
        <>
            {menu}
        </>
    )

    const toggleEditName = (status:boolean) => {
        setEditName(status);
    }

    const toggleEditDescription = (status:boolean) => {
        setEditDescription(status);
    }

    const networkRangeValidator = (_: RuleObject, value: string) => {
        if (!cidrRegex().test(value)) {
            return Promise.reject(new Error("Please enter a valid CIDR, e.g. 192.168.1.0/24"))
        }

        if (Number(value.split("/")[1]) < 7) {
            return Promise.reject(new Error("Please enter a network mask larger than /7"))
        }

        return Promise.resolve()
    }

    return (
        <>
            {route &&
                <Drawer
                    headerStyle={{display: "none"}}
                    forceRender={true}
                    visible={setupNewRouteVisible}
                    bodyStyle={{paddingBottom: 80}}
                    onClose={onCancel}
                    autoFocus={true}
                    footer={
                        <Space style={{display: 'flex', justifyContent: 'end'}}>
                            <Button onClick={onCancel} disabled={savedRoute.loading}>Cancel</Button>
                            <Button type="primary" disabled={savedRoute.loading} onClick={handleFormSubmit}>{`${formRoute.id ? 'Save' : 'Create'}`}</Button>
                        </Space>
                    }
                >
                    <Form layout="vertical" hideRequiredMark form={form} onValuesChange={onChange}>
                        <Row gutter={16}>
                            <Col span={24}>
                                <Header style={{margin: "-32px -24px 20px -24px", padding: "24px 24px 0 24px"}}>
                                    <Row align="top">
                                        <Col flex="none" style={{display: "flex"}}>
                                            {!editName && !editDescription && formRoute.id  &&
                                                <button type="button" aria-label="Close" className="ant-drawer-close"
                                                        style={{paddingTop: 3}}
                                                        onClick={onCancel}>
                                                    <span role="img" aria-label="close" className="anticon anticon-close">
                                                        <CloseOutlined size={16}/>
                                                    </span>
                                                </button>
                                            }
                                        </Col>
                                        <Col flex="auto">
                                            { !editName && formRoute.id ? (
                                                <div className={"access-control input-text ant-drawer-title"} onClick={() => toggleEditName(true)}>{formRoute.id ? formRoute.network_id : 'New Route'}</div>
                                            ) : (
                                                <Form.Item
                                                    name="network_id"
                                                    label="Network Identifier"
                                                    tooltip="You can enable high-availability by assigning the same network identifier and network CIDR to multiple routes"
                                                    rules={[{required: true, message: 'Please add an identifier for this access route', whitespace: true}]}
                                                >
                                                    <Input placeholder="e.g. aws-eu-central-1-vpc" ref={inputNameRef} disabled={!setupNewRouteHA} onPressEnter={() => toggleEditName(false)} onBlur={() => toggleEditName(false)} autoComplete="off" maxLength={40}/>
                                                </Form.Item>
                                            )}
                                            { !editDescription ? (
                                                <div className={"access-control input-text ant-drawer-subtitle"} onClick={() => toggleEditDescription(true)}>{formRoute.description && formRoute.description.trim() !== "" ? formRoute.description : 'Add description...'}</div>
                                            ) : (
                                                <Form.Item
                                                    name="description"
                                                    label="Description"
                                                    style={{marginTop: 24}}
                                                >
                                                    <Input placeholder="Add description..." ref={inputDescriptionRef} disabled={!setupNewRouteHA} onPressEnter={() => toggleEditDescription(false)} onBlur={() => toggleEditDescription(false)} autoComplete="off" maxLength={200}/>
                                                </Form.Item>
                                            )}

                                        </Col>
                                    </Row>
                                    <Row align="top">
                                        <Col flex="auto">

                                        </Col>
                                    </Row>

                                </Header>
                            </Col>
                            <Col span={24}>

                            </Col>
                            <Col span={24}>
                                <Form.Item
                                    name="network"
                                    label="Network Range"
                                    tooltip="Use CIDR notation. e.g. 192.168.10.0/24 or 172.16.0.0/16"
                                    rules={[{validator: networkRangeValidator}]}
                                >
                                    <Input placeholder="e.g. 172.16.0.0/16" disabled={!setupNewRouteHA} autoComplete="off" minLength={9} maxLength={43}/>
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Form.Item
                                    name="enabled"
                                    label={statusMSG}
                                >
                                    <Radio.Group
                                        options={optionsDisabledEnabled}
                                        optionType="button"
                                        buttonStyle="solid"
                                    />
                                </Form.Item>
                            </Col>

                            <Col span={24}>
                                <Form.Item
                                    name="peer"
                                    label={routingPeerMSG}
                                    tooltip="Assign a peer as a routing peer for the Network CIDR"
                                >
                                    <Select
                                            showSearch
                                            style={{ width: '100%' }}
                                            placeholder="Select Peer"
                                            dropdownRender={dropDownRender}
                                            options={options}
                                            allowClear={true}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Form.Item
                                    name="masquerade"
                                    label={masqueradeMSG}
                                    tooltip={masqueradeDisabledMSG}
                                >
                                    <Switch size={"small"} disabled={!setupNewRouteHA} checked={formRoute.masquerade}/>
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Form.Item
                                    name="metric"
                                    label="Metric"
                                    tooltip="Choose from 1 to 9999. Lower number has higher priority"
                                >
                                    <InputNumber min={1} max={9999} autoComplete="off"/>
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Row wrap={false} gutter={12}>
                                    <Col flex="none">
                                        <FlagFilled/>
                                    </Col>
                                    <Col flex="auto">
                                        <Paragraph>
                                            You can enable high-availability by assigning the same network identifier and network CIDR to multiple routes.
                                        </Paragraph>
                                    </Col>
                                </Row>
                            </Col>
                            <Col span={24}>
                                <Divider></Divider>
                                <Button icon={<QuestionCircleFilled/>} type="link" target="_blank"
                                        href="https://netbird.io/docs/how-to-guides/network-routes" style={{color: 'rgb(07, 114, 128)'}}>Learn
                                    more about network routes</Button>
                            </Col>
                        </Row>
                    </Form>

                </Drawer>
            }
        </>
    )
}

export default RouteUpdate