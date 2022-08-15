import React, {useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import { actions as routeActions } from '../store/route';
import {
    Col,
    Row,
    Typography,
    Input,
    InputNumber,
    Space,
    Switch,
    SelectProps,
    Button, Drawer, Form, Divider, Select, Tag, Radio, RadioChangeEvent
} from "antd";
import {ArrowRightOutlined, CheckOutlined, CloseOutlined, FlagFilled, QuestionCircleFilled} from "@ant-design/icons";
import {Route} from "../store/route/types";
import {Header} from "antd/es/layout/layout";
import {RuleObject} from "antd/lib/form";
import {useOidcAccessToken} from "@axa-fr/react-oidc";

const { Paragraph } = Typography;
const { Option } = Select;

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
        peerName = p ? p.name : route.peer

        const fRoute = {
            ...route,
            peer: peerName
        } as FormRoute
        setFormRoute(fRoute)
        form.setFieldsValue(fRoute)
    }, [route])

    peers.forEach((p) => {
        options?.push({
            label: p.name,
            value: p.name,
            disabled: false
        })
    })

    options?.push({
        label: "None",
        value: "",
        disabled: false
    })

    const createRouteToSave = ():Route => {
        let peerID = ''
        let p = peers.find(_p => _p.name === formRoute.peer)
        peerID = p ? p.ip : ''

        return {
            id: formRoute.id,
            prefix: formRoute.prefix,
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
            prefix: '',
            description: '',
            peer: '',
            metric: 9999,
            masquerade: false,
            enabled: false
        } as Route))
        setVisibleNewRoute(false)
    }

    const onChange = (data:any) => {
        setFormRoute({...formRoute, ...data})
    }

    const handleChangeSource = (value: string[]) => {
        if (value.length == 1) {
            setFormRoute({
                ...formRoute,
                peer: value[0]
            })
        }
    };


    const handleChangeEnabled = ({ target: { value } }: RadioChangeEvent) => {
        setFormRoute({
            ...formRoute,
            enabled: value
        })
    };

    const handleChangeMasquerade = ({ target: { value } }: RadioChangeEvent) => {
        setFormRoute({
            ...formRoute,
            masquerade: value
        })
    };


    const dropDownRender = (menu: React.ReactElement) => (
        <>
            {menu}
        </>
    )

    const toggleEditName = (status:boolean) => {
        setEditName(status);
    }


    const selectValidator = (_: RuleObject, value: string[]) => {
        if (!value.length) {
            return Promise.reject(new Error("Please enter one peer"))
        }

        if (typeof value !== 'string' && value.length > 1) {
            return Promise.reject(new Error("Please select only one peer"))
        }

        return Promise.resolve()
    }

    return (
        <>
            {route &&
                <Drawer
                    //title={`${formRoute.ID ? 'Edit Route' : 'New Route'}`}
                    headerStyle={{display: "none"}}
                    forceRender={true}
                    // width={512}
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
                                                <div className={"access-control input-text ant-drawer-title"} onClick={() => toggleEditName(true)}>{formRoute.id ? formRoute.prefix : 'New Route'}</div>
                                            ) : (
                                                <Form.Item
                                                    name="prefix"
                                                    label="Prefix"
                                                    rules={[{required: true, message: 'Please add a prefix for this route', whitespace: true}]}
                                                >
                                                    <Input placeholder="Add route prefix..." ref={inputNameRef} onPressEnter={() => toggleEditName(false)} onBlur={() => toggleEditName(false)} autoComplete="off"/>
                                                </Form.Item>
                                            )}

                                                <Form.Item
                                                    name="description"
                                                    label="Description"
                                                    style={{marginTop: 24}}
                                                >
                                                    <Input placeholder="Add description..." ref={inputDescriptionRef} autoComplete="off"/>
                                                </Form.Item>

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
                                    name="enabled"
                                    label="Status"
                                >
                                    <Radio.Group
                                        options={optionsDisabledEnabled}
                                        onChange={handleChangeEnabled}
                                        optionType="button"
                                        buttonStyle="solid"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Form.Item
                                    name="masquerade"
                                    label="Masquerade"
                                >
                                    <Radio.Group
                                        options={optionsDisabledEnabled}
                                        onChange={handleChangeMasquerade}
                                        optionType="button"
                                        buttonStyle="solid"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Form.Item
                                    name="peer"
                                    label="Peer"
                                    rules={[{ validator: selectValidator }]}
                                    style={{display: 'flex'}}
                                >
                                    <Select mode="multiple"
                                            style={{ width: '100%' }}
                                            placeholder="Select Peer"
                                            onChange={handleChangeSource}
                                            dropdownRender={dropDownRender}
                                            options={options}
                                            allowClear={true}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Form.Item
                                    name="metric"
                                    label="Metric"
                                    // rules={[{required: false, message: 'Please add a metric value between 1 and 9999 for this route', min: 1,max: 9999,type: "number",validateTrigger: ["onChange","onClick"]}]}
                                    style={{display: 'flex'}}
                                >
                                    <InputNumber min={1} max={9999} autoComplete="off" defaultValue={formRoute.metric}/>
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Row wrap={false} gutter={12}>
                                    <Col flex="none">
                                        <FlagFilled/>
                                    </Col>
                                    <Col flex="auto">
                                        <Paragraph>
                                            At the moment access routes are bi-directional by default, this means both source and destination can talk to each-other in both directions. However destination peers will not be able to communicate with each other, nor will the source peers.
                                        </Paragraph>
                                        <Paragraph>
                                            If you want to enable all peers of the same group to talk to each other - you can add that group both as a receiver and as a destination.
                                        </Paragraph>
                                    </Col>
                                </Row>
                            </Col>
                            <Col span={24}>
                                <Divider></Divider>
                                <Button icon={<QuestionCircleFilled/>} type="link" target="_blank"
                                        href="https://docs.netbird.io/docs/overview/acls" style={{color: 'rgb(07, 114, 128)'}}>Learn
                                    more about access controls</Button>
                            </Col>
                        </Row>
                    </Form>

                </Drawer>
            }
        </>
    )
}

export default RouteUpdate