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
    Button, Drawer, Form, Divider, Select, Tag, Radio, RadioChangeEvent, Typography
} from "antd";
import {CloseOutlined, FlagFilled, QuestionCircleFilled} from "@ant-design/icons";
import {Route} from "../store/route/types";
import {Header} from "antd/es/layout/layout";
import {RuleObject} from "antd/lib/form";
import {useOidcAccessToken} from "@axa-fr/react-oidc";
import cidrRegex from 'cidr-regex';

const { Paragraph } = Typography;

interface FormRoute extends Route {
}

const RouteUpdate = () => {
    const {accessToken} = useOidcAccessToken()
    const dispatch = useDispatch()
    const setupNewRouteVisible = useSelector((state: RootState) => state.route.setupNewRouteVisible)
    const peers =  useSelector((state: RootState) => state.peer.data)
    const route =  useSelector((state: RootState) => state.route.route)
    const savedRoute = useSelector((state: RootState) => state.route.savedRoute)

    const [editName, setEditName] = useState(false)
    const [editDescription, setEditDescription] = useState(false)
    const options: SelectProps['options'] = [];
    const [formRoute, setFormRoute] = useState({} as FormRoute)
    const [form] = Form.useForm()
    const inputNameRef = useRef<any>(null)
    const inputDescriptionRef = useRef<any>(null)
    const peerSeparator = " - "

    const optionsDisabledEnabled = [{label: 'Enabled', value: true}, {label: 'Disabled', value: false}]

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
        let peerName = ''
        let p = peers.find(_p => _p.ip === route.peer)
        peerName = p ? p.name  + peerSeparator + p.ip : route.peer

        const fRoute = {
            ...route,
            peer: peerName
        } as FormRoute
        setFormRoute(fRoute)
        form.setFieldsValue(fRoute)
    }, [route])

    peers.forEach((p) => {
        let os:string
        os = p.os
        if (!os.toLowerCase().startsWith("darwin") && !os.toLowerCase().startsWith("windows")) {
            options?.push({
                label: p.name + peerSeparator + p.ip,
                value: p.name + peerSeparator + p.ip,
                disabled: false
            })
        }
    })



    const createRouteToSave = ():Route => {
        let peerID = ''
        if (formRoute.peer != '') {
            peerID = formRoute.peer.split(peerSeparator)[1]
        }
        console.log(formRoute)
        // let p = peers.find(_p => _p.name === formRoute.peer)
        // peerID = p ? p.ip : ''

        return {
            id: formRoute.id,
            network: formRoute.network,
            network_id: formRoute.network_id,
            description: formRoute.description,
            peer: peerID,
            enabled: formRoute.enabled,
            masquerade: formRoute.masquerade,
            metric: formRoute.metric
        } as Route
    }

    const handleFormSubmit = () => {
        form.validateFields()
            .then((values) => {
                const routeToSave = createRouteToSave()
                dispatch(routeActions.saveRoute.request({getAccessTokenSilently:accessToken, payload: routeToSave}))
            })
            .catch((errorInfo) => {
                console.log('errorInfo', errorInfo)
            });
    };

    const setVisibleNewRoute = (status:boolean) => {
        dispatch(routeActions.setSetupNewRouteVisible(status));
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
                                                    <Input placeholder="e.g. aws-eu-central-1-vpc" ref={inputNameRef} onPressEnter={() => toggleEditName(false)} onBlur={() => toggleEditName(false)} autoComplete="off" maxLength={40}/>
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
                                                    <Input placeholder="Add description..." ref={inputDescriptionRef} onPressEnter={() => toggleEditDescription(false)} onBlur={() => toggleEditDescription(false)} autoComplete="off" maxLength={200}/>
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
                                    label="Network CIDR"
                                    tooltip="Use CIDR notation. e.g. 192.168.10.0/24 or 172.16.0.0/16"
                                    rules={[{validator: networkRangeValidator}]}
                                >
                                    <Input placeholder="e.g. 172.16.0.0/16" autoComplete="off" minLength={9} maxLength={43}/>
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Form.Item
                                    name="enabled"
                                    label="Status"
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
                                    label="Routing peer"
                                    tooltip="Assign a peer as a routing peer for the Network CIDR"
                                >
                                    <Select
                                            showSearch
                                            style={{ width: '100%' }}
                                            placeholder="Select Peer"
                                            // onChange={handlePeerChange}
                                            dropdownRender={dropDownRender}
                                            options={options}
                                            allowClear={true}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Form.Item
                                    name="masquerade"
                                    label="Masquerade"
                                    tooltip="Enabling this option hides other NetBird network IPs behind the routing peer local address when accessing the target Network CIDR. This option allows access to your private networks without configuring routes on your local routers or other devices."
                                >
                                    <Switch size={"small"} checked={formRoute.masquerade}/>
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
                                        href="https://docs.netbird.io/docs/overview/routes" style={{color: 'rgb(07, 114, 128)'}}>Learn
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