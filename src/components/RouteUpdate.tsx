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
import {Route, RouteToSave} from "../store/route/types";
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
import {useGetGroupTagHelpers} from "../utils/groups";

const {Paragraph} = Typography;

interface FormRoute extends Route {
}

const RouteUpdate = () => {
    const {
        tagRender,
        handleChangeTags,
        dropDownRender,
        optionRender,
        tagGroups,
        getExistingAndToCreateGroupsLists,
        getGroupNamesFromIDs,
        selectValidator
    } = useGetGroupTagHelpers()
    const {Option} = Select;
    const {getAccessTokenSilently} = useGetAccessTokenSilently()
    const dispatch = useDispatch()
    const setupNewRouteVisible = useSelector((state: RootState) => state.route.setupNewRouteVisible)
    const setupNewRouteHA = useSelector((state: RootState) => state.route.setupNewRouteHA)
    const peers = useSelector((state: RootState) => state.peer.data)
    const route = useSelector((state: RootState) => state.route.route)
    const routes = useSelector((state: RootState) => state.route.data)
    const savedRoute = useSelector((state: RootState) => state.route.savedRoute)
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
    const [peerNameToIP, peerIPToName, peerIPToID] = initPeerMaps(peers);
    const [newRoute, setNewRoute] = useState(false)

    const optionsDisabledEnabled = [{label: 'Enabled', value: true}, {label: 'Disabled', value: false}]

    useEffect(() => {
        if (!newRoute ) {
            setRoutingPeerMSG(defaultRoutingPeerMSG)
            setMasqueradeMSG("Update Masquerade")
            setStatusMSG("Update Status")
        } else {
            setRoutingPeerMSG(defaultRoutingPeerMSG)
            setMasqueradeMSG(defaultMasqueradeMSG)
            setStatusMSG(defaultStatusMSG)
            setPreviousRouteKey("")
        }
    }, [newRoute])

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
            groups: getGroupNamesFromIDs(route.groups)
        } as FormRoute
        setFormRoute(fRoute)
        setPreviousRouteKey(fRoute.network_id + fRoute.network)
        if (!route.network_id) {
            setNewRoute(true)
        } else {
            setNewRoute(false)
        }
        form.setFieldsValue(fRoute)
    }, [route])

    peers.forEach((p) => {
        let os: string
        os = p.os
        if (!os.toLowerCase().startsWith("darwin") && !os.toLowerCase().startsWith("windows")) {
            options?.push({
                label: peerToPeerIP(p.name, p.ip),
                value: peerToPeerIP(p.name, p.ip),
                disabled: false
            })
        }
    })

    const createRouteToSave = (inputRoute: FormRoute): RouteToSave => {
        let peerIDList = inputRoute.peer.split(routePeerSeparator)
        let peerID: string
        if (peerIDList[1]) {
            peerID = peerIPToID[peerIDList[1]]
        } else {
            peerID = peerIPToID[peerNameToIP[inputRoute.peer]]
        }

        let [ existingGroups, groupsToCreate ] = getExistingAndToCreateGroupsLists(inputRoute.groups)

        return {
            id: inputRoute.id,
            network: inputRoute.network,
            network_id: inputRoute.network_id,
            description: inputRoute.description,
            peer: peerID,
            enabled: inputRoute.enabled,
            masquerade: inputRoute.masquerade,
            metric: inputRoute.metric,
            groups: existingGroups,
            groupsToCreate: groupsToCreate,
        } as RouteToSave
    }

    const handleFormSubmit = () => {
        form.validateFields()
            .then(() => {
                if (!setupNewRouteHA || formRoute.peer != '') {
                    const routeToSave = createRouteToSave(formRoute)
                    dispatch(routeActions.saveRoute.request({
                        getAccessTokenSilently: getAccessTokenSilently,
                        payload: routeToSave
                    }))
                } else {
                    let groupedDataTable = transformGroupedDataTable(routes, peers)
                    groupedDataTable.forEach((group) => {
                        if (group.key == previousRouteKey) {
                            group.groupedRoutes.forEach((route) => {
                                let updateRoute: FormRoute = {
                                    ...formRoute,
                                    id: route.id,
                                    peer: route.peer,
                                    metric: route.metric,
                                    enabled: (formRoute.enabled != group.enabled) ? formRoute.enabled : route.enabled
                                }
                                const routeToSave = createRouteToSave(updateRoute)
                                dispatch(routeActions.saveRoute.request({
                                    getAccessTokenSilently: getAccessTokenSilently,
                                    payload: routeToSave
                                }))
                            })
                        }
                    })
                }

            })
            .catch((errorInfo) => {
                console.log('errorInfo', errorInfo)
            });
    };

    const setVisibleNewRoute = (status: boolean) => {
        dispatch(routeActions.setSetupNewRouteVisible(status));
    }

    const setSetupNewRouteHA = (status: boolean) => {
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
        setNewRoute(false)
    }

    const onChange = (data: any) => {
        setFormRoute({...formRoute, ...data})
    }

    const peerDropDownRender = (menu: React.ReactElement) => (
        <>
            {menu}
        </>
    )

    const toggleEditName = (status: boolean) => {
        setEditName(status);
    }

    const toggleEditDescription = (status: boolean) => {
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

    const peerValidator = (_: RuleObject, value: string) => {

        if (value == "" && newRoute) {
            return Promise.reject(new Error("Please select routing one peer"))
        }

        return Promise.resolve()
    }

    const selectPreValidator = (obj: RuleObject, value: string[]) => {
       if (setupNewRouteHA && formRoute.peer == '') {
           let [, newGroups ] = getExistingAndToCreateGroupsLists(value)
           if (newGroups.length > 0) {
               return Promise.reject(new Error("You can't add new Groups from the group update view, please remove:\"" + newGroups +"\""))
           }
       }
       return selectValidator(obj, value)
    }

    return (
        <>
            {route &&
                <Drawer
                    headerStyle={{display: "none"}}
                    forceRender={true}
                    open={setupNewRouteVisible}
                    bodyStyle={{paddingBottom: 80}}
                    onClose={onCancel}
                    autoFocus={true}
                    footer={
                        <Space style={{display: 'flex', justifyContent: 'end'}}>
                            <Button onClick={onCancel} disabled={savedRoute.loading}>Cancel</Button>
                            <Button type="primary" disabled={savedRoute.loading}
                                    onClick={handleFormSubmit}>{`${newRoute ? 'Create' : 'Save'}`}</Button>
                        </Space>
                    }
                >
                    <Form layout="vertical" form={form} requiredMark={false} onValuesChange={onChange}>
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
                                                           disabled={!setupNewRouteHA && !newRoute}
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
                                                           disabled={!setupNewRouteHA && !newRoute}
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
                                    <Input placeholder="e.g. 172.16.0.0/16" disabled={!setupNewRouteHA && !newRoute}
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
                                    rules={[{validator:peerValidator}]}
                                >
                                    <Select
                                        showSearch
                                        style={{width: '100%'}}
                                        placeholder="Select Peer"
                                        dropdownRender={peerDropDownRender}
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
                                    <Switch size={"small"} disabled={!setupNewRouteHA && !newRoute} checked={formRoute.masquerade}/>
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
                                <Form.Item
                                    name="groups"
                                    label="Distribution groups"
                                    tooltip="NetBird will advertise this route to peers that belong to the following groups"
                                    rules={[{validator: selectPreValidator}]}
                                >
                                    <Select mode="tags"
                                            style={{width: '100%'}}
                                            placeholder="Associate groups with the network route"
                                            tagRender={tagRender}
                                            onChange={handleChangeTags}
                                            dropdownRender={dropDownRender}
                                    >
                                        {
                                            tagGroups.map(m =>
                                                <Option key={m}>{optionRender(m)}</Option>
                                            )
                                        }
                                    </Select>
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

export default RouteUpdate