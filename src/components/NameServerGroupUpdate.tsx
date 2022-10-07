import React, {useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {actions as routeActions} from '../store/route';
import {
    Button,
    Col,
    Divider,
    Drawer,
    Form,
    Input,
    InputNumber,
    Radio,
    Row,
    Select,
    SelectProps,
    Space,
    Switch,
    Typography
} from "antd";
import {CloseOutlined, FlagFilled, QuestionCircleFilled} from "@ant-design/icons";
import {Route} from "../store/route/types";
import {Header} from "antd/es/layout/layout";
import {RuleObject} from "antd/lib/form";
import cidrRegex from 'cidr-regex';
import {
    initPeerMaps,
    masqueradeDisabledMSG,
    peerToPeerIP,
    routePeerSeparator,
    transformGroupedDataTable
} from '../utils/routes'
import {useGetAccessTokenSilently} from "../utils/token";
import {NameServerGroup} from "../store/nameservers/types";

const {Paragraph} = Typography;

interface FormNSGroup extends NameServerGroup {
}

const NameServerGroupUpdate = () => {

    const groups = useSelector((state: RootState) => state.group.data)
    const nsGroup = useSelector((state: RootState) => state.nameserverGroup.nameserverGroup)
    const setupNewNameServerGroupVisible = useSelector((state: RootState) => state.nameserverGroup.setupNewNameServerGroupVisible)

    return (
        <>
            {nsGroup &&
                <Drawer
                    headerStyle={{display: "none"}}
                    forceRender={true}
                    visible={setupNewNameServerGroupVisible}
                    bodyStyle={{paddingBottom: 80}}
                    onClose={onCancel}
                    autoFocus={true}
                    footer={
                        <Space style={{display: 'flex', justifyContent: 'end'}}>
                            <Button onClick={onCancel} disabled={savedRoute.loading}>Cancel</Button>
                            <Button type="primary" disabled={savedRoute.loading}
                                    onClick={handleFormSubmit}>{`${formRoute.network_id ? 'Save' : 'Create'}`}</Button>
                        </Space>
                    }
                >
                    <Form layout="vertical" hideRequiredMark form={form} onValuesChange={onChange}>
                        <Row gutter={16}>
                            <Col span={24}>
                                <Header style={{margin: "-32px -24px 20px -24px", padding: "24px 24px 0 24px"}}>
                                    <Row align="top">
                                        <Col flex="none" style={{display: "flex"}}>
                                            {!editName && !editDescription && formRoute.id &&
                                                <button type="button" aria-label="Close" className="ant-drawer-close"
                                                        style={{paddingTop: 3}}
                                                        onClick={onCancel}>
                                                    <span role="img" aria-label="close"
                                                          className="anticon anticon-close">
                                                        <CloseOutlined size={16}/>
                                                    </span>
                                                </button>
                                            }
                                        </Col>
                                        <Col flex="auto">
                                            {!editName && formRoute.id ? (
                                                <div className={"access-control input-text ant-drawer-title"}
                                                     onClick={() => toggleEditName(true)}>{formRoute.id ? formRoute.network_id : 'New Route'}</div>
                                            ) : (
                                                <Form.Item
                                                    name="network_id"
                                                    label="Network Identifier"
                                                    tooltip="You can enable high-availability by assigning the same network identifier and network CIDR to multiple routes"
                                                    rules={[{
                                                        required: true,
                                                        message: 'Please add an identifier for this access route',
                                                        whitespace: true
                                                    }]}
                                                >
                                                    <Input placeholder="e.g. aws-eu-central-1-vpc" ref={inputNameRef}
                                                           disabled={!setupNewRouteHA}
                                                           onPressEnter={() => toggleEditName(false)}
                                                           onBlur={() => toggleEditName(false)} autoComplete="off"
                                                           maxLength={40}/>
                                                </Form.Item>
                                            )}
                                            {!editDescription ? (
                                                <div className={"access-control input-text ant-drawer-subtitle"}
                                                     onClick={() => toggleEditDescription(true)}>{formRoute.description && formRoute.description.trim() !== "" ? formRoute.description : 'Add description...'}</div>
                                            ) : (
                                                <Form.Item
                                                    name="description"
                                                    label="Description"
                                                    style={{marginTop: 24}}
                                                >
                                                    <Input placeholder="Add description..." ref={inputDescriptionRef}
                                                           disabled={!setupNewRouteHA}
                                                           onPressEnter={() => toggleEditDescription(false)}
                                                           onBlur={() => toggleEditDescription(false)}
                                                           autoComplete="off" maxLength={200}/>
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
                                    <Input placeholder="e.g. 172.16.0.0/16" disabled={!setupNewRouteHA}
                                           autoComplete="off" minLength={9} maxLength={43}/>
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
                                        style={{width: '100%'}}
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
                                            You can enable high-availability by assigning the same network identifier
                                            and network CIDR to multiple routes.
                                        </Paragraph>
                                    </Col>
                                </Row>
                            </Col>
                            <Col span={24}>
                                <Divider></Divider>
                                <Button icon={<QuestionCircleFilled/>} type="link" target="_blank"
                                        href="https://netbird.io/docs/how-to-guides/network-routes"
                                        style={{color: 'rgb(07, 114, 128)'}}>Learn
                                    more about network routes</Button>
                            </Col>
                        </Row>
                    </Form>

                </Drawer>
            }
        </>
    )
}

export default NameServerGroupUpdate