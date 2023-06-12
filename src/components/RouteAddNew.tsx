import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "typesafe-actions";
import { actions as routeActions } from "../store/route";
import {
  Button,
  Col,
  Divider,
  Collapse,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  SelectProps,
  Space,
  Switch,
  Modal,
  Typography,
} from "antd";
import {
  CloseOutlined,
  FlagFilled,
  QuestionCircleFilled,
} from "@ant-design/icons";
import { Route, RouteToSave } from "../store/route/types";
import { Header } from "antd/es/layout/layout";
import { RuleObject } from "antd/lib/form";
import cidrRegex from "cidr-regex";
import {
  initPeerMaps,
  masqueradeDisabledMSG,
  peerToPeerIP,
  routePeerSeparator,
  transformGroupedDataTable,
} from "../utils/routes";
import { useGetTokenSilently } from "../utils/token";
import { useGetGroupTagHelpers } from "../utils/groups";

const { Paragraph, Text } = Typography;
const { Panel } = Collapse;

interface FormRoute extends Route {}

const RouteAddNew = (selectedPeer: any) => {
  console.log("selectedPeer", !!selectedPeer.peer);
  const {
    tagRender,
    handleChangeTags,
    dropDownRender,
    optionRender,
    tagGroups,
    getExistingAndToCreateGroupsLists,
    getGroupNamesFromIDs,
    selectValidator,
  } = useGetGroupTagHelpers();
  const { Option } = Select;
  const { getTokenSilently } = useGetTokenSilently();
  const dispatch = useDispatch();
  const setupNewRouteVisible = useSelector(
    (state: RootState) => state.route.setupNewRouteVisible
  );
  const setupNewRouteHA = useSelector(
    (state: RootState) => state.route.setupNewRouteHA
  );
  const peers = useSelector((state: RootState) => state.peer.data);
  const route = useSelector((state: RootState) => state.route.route);
  const routes = useSelector((state: RootState) => state.route.data);
  const savedRoute = useSelector((state: RootState) => state.route.savedRoute);
  const [previousRouteKey, setPreviousRouteKey] = useState("");
  const [editName, setEditName] = useState(false);
  const [editDescription, setEditDescription] = useState(false);
  const options: SelectProps["options"] = [];
  const [formRoute, setFormRoute] = useState({} as FormRoute);
  const [form] = Form.useForm();
  const inputNameRef = useRef<any>(null);
  const inputDescriptionRef = useRef<any>(null);
  const defaultRoutingPeerMSG = "Routing Peer";
  const [routingPeerMSG, setRoutingPeerMSG] = useState(defaultRoutingPeerMSG);
  const defaultMasqueradeMSG = "Masquerade";
  const [masqueradeMSG, setMasqueradeMSG] = useState(defaultMasqueradeMSG);
  const defaultStatusMSG = "Status";
  const [statusMSG, setStatusMSG] = useState(defaultStatusMSG);
  const [peerNameToIP, peerIPToName, peerIPToID] = initPeerMaps(peers);
  const [newRoute, setNewRoute] = useState(false);

  useEffect(() => {
    if (!newRoute) {
      setRoutingPeerMSG(defaultRoutingPeerMSG);
      setMasqueradeMSG("Update Masquerade");
      setStatusMSG("Update Status");
    } else {
      setRoutingPeerMSG(defaultRoutingPeerMSG);
      setMasqueradeMSG(defaultMasqueradeMSG);
      setStatusMSG(defaultStatusMSG);
      setPreviousRouteKey("");
    }
  }, [newRoute]);

  useEffect(() => {
    if (editName)
      inputNameRef.current!.focus({
        cursor: "end",
      });
  }, [editName]);

  useEffect(() => {
    if (editDescription)
      inputDescriptionRef.current!.focus({
        cursor: "end",
      });
  }, [editDescription]);

  useEffect(() => {
    if (!route) return;

    if (selectedPeer && selectedPeer.peer) {
      options?.push({
        label: peerToPeerIP(selectedPeer.peer.name, selectedPeer.peer.ip),
        value: peerToPeerIP(selectedPeer.peer.name, selectedPeer.peer.ip),
        disabled: false,
      });
      const udpateRoute = { ...route, peer: options[0].value } as FormRoute;
      setFormRoute(udpateRoute);
      form.setFieldsValue(udpateRoute);
      setPreviousRouteKey(udpateRoute.network_id + udpateRoute.network);
    } else {
      const fRoute = {
        ...route,
        groups: getGroupNamesFromIDs(route.groups),
      } as FormRoute;
      setFormRoute(fRoute);
      setPreviousRouteKey(fRoute.network_id + fRoute.network);
      form.setFieldsValue(fRoute);
    }

    if (!route.network_id) {
      setNewRoute(true);
    } else {
      setNewRoute(false);
    }
  }, [route]);

  if (!selectedPeer.peer) {
    peers.forEach((p) => {
      let os: string;
      os = p.os;
      if (
        !os.toLowerCase().startsWith("darwin") &&
        !os.toLowerCase().startsWith("windows") &&
        !os.toLowerCase().startsWith("android") &&
        route &&
        !routes
          .filter((r) => r.network_id === route.network_id)
          .find((r) => r.peer === p.id)
      ) {
        options?.push({
          label: peerToPeerIP(p.name, p.ip),
          value: peerToPeerIP(p.name, p.ip),
          disabled: false,
        });
      }
    });
  }

  const createRouteToSave = (inputRoute: FormRoute): RouteToSave => {
    let peerIDList = inputRoute.peer.split(routePeerSeparator);
    let peerID: string;
    if (peerIDList.length === 1) {
      peerID = inputRoute.peer;
    } else {
      if (peerIDList[1]) {
        peerID = peerIPToID[peerIDList[1]];
      } else {
        peerID = peerIPToID[peerNameToIP[inputRoute.peer]];
      }
    }

    let [existingGroups, groupsToCreate] = getExistingAndToCreateGroupsLists(
      inputRoute.groups
    );

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
    } as RouteToSave;
  };

  const handleFormSubmit = () => {
    form
      .validateFields()
      .then(() => {
        if (!setupNewRouteHA || formRoute.peer != "") {
          const routeToSave = createRouteToSave(formRoute);
          dispatch(
            routeActions.saveRoute.request({
              getAccessTokenSilently: getTokenSilently,
              payload: routeToSave,
            })
          );
        } else {
          let groupedDataTable = transformGroupedDataTable(routes, peers);
          groupedDataTable.forEach((group) => {
            if (group.key == previousRouteKey) {
              group.groupedRoutes.forEach((route) => {
                let updateRoute: FormRoute = {
                  ...formRoute,
                  id: route.id,
                  peer: route.peer,
                  metric: route.metric,
                  enabled:
                    formRoute.enabled != group.enabled
                      ? formRoute.enabled
                      : route.enabled,
                };
                const routeToSave = createRouteToSave(updateRoute);
                dispatch(
                  routeActions.saveRoute.request({
                    getAccessTokenSilently: getTokenSilently,
                    payload: routeToSave,
                  })
                );
              });
            }
          });
        }
      })
      .catch((errorInfo) => {
        console.log("errorInfo", errorInfo);
      });
  };

  const setVisibleNewRoute = (status: boolean) => {
    dispatch(routeActions.setSetupNewRouteVisible(status));
  };

  const setSetupNewRouteHA = (status: boolean) => {
    dispatch(routeActions.setSetupNewRouteHA(status));
  };

  const onCancel = () => {
    if (savedRoute.loading) return;
    setEditName(false);
    dispatch(
      routeActions.setRoute({
        network: "",
        network_id: "",
        description: "",
        peer: "",
        metric: 9999,
        masquerade: false,
        enabled: true,
        groups: [],
      } as Route)
    );
    setVisibleNewRoute(false);
    setSetupNewRouteHA(false);
    setPreviousRouteKey("");
    setNewRoute(false);
  };

  const onChange = (data: any) => {
    setFormRoute({ ...formRoute, ...data });
  };

  const peerDropDownRender = (menu: React.ReactElement) => <>{menu}</>;

  const toggleEditName = (status: boolean) => {
    setEditName(status);
  };

  const toggleEditDescription = (status: boolean) => {
    setEditDescription(status);
  };

  const networkRangeValidator = (_: RuleObject, value: string) => {
    if (!cidrRegex().test(value)) {
      return Promise.reject(
        new Error("Please enter a valid CIDR, e.g. 192.168.1.0/24")
      );
    }

    if (Number(value.split("/")[1]) < 7) {
      return Promise.reject(
        new Error("Please enter a network mask larger than /7")
      );
    }

    return Promise.resolve();
  };

  const peerValidator = (_: RuleObject, value: string) => {
    if (value == "" && newRoute) {
      return Promise.reject(new Error("Please select routing one peer"));
    }

    return Promise.resolve();
  };

  const selectPreValidator = (obj: RuleObject, value: string[]) => {
    if (setupNewRouteHA && formRoute.peer == "") {
      let [, newGroups] = getExistingAndToCreateGroupsLists(value);
      if (newGroups.length > 0) {
        return Promise.reject(
          new Error(
            "You can't add new Groups from the group update view, please remove:\"" +
              newGroups +
              '"'
          )
        );
      }
    }
    return selectValidator(obj, value);
  };

  console.log("formRoute", formRoute);

  const handleMasqueradeChange = (checked: boolean) => {
    setFormRoute({
      ...formRoute,
      masquerade: checked,
    });
  };

  const handleEnableChange = (checked: boolean) => {
    setFormRoute({
      ...formRoute,
      enabled: checked,
    });
  };

  return (
    <>
      {route && (
        <Modal
          open={setupNewRouteVisible}
          onCancel={onCancel}
          footer={
            <Space style={{ display: "flex", justifyContent: "end" }}>
              <Button onClick={onCancel} disabled={savedRoute.loading}>
                Cancel
              </Button>
              <Button
                type="primary"
                disabled={savedRoute.loading}
                onClick={handleFormSubmit}
              >{`${newRoute ? "Create" : "Save"}`}</Button>
            </Space>
          }
        >
          <Form
            layout="vertical"
            form={form}
            requiredMark={false}
            onValuesChange={onChange}
          >
            <Row gutter={16}>
              <Col span={24}>
                <Header
                  style={{
                    border: "none",
                  }}
                >
                  <Paragraph
                    style={{
                      textAlign: "start",
                      whiteSpace: "pre-line",
                      fontSize: "18px",
                      margin: "0px",
                      marginBottom: "15px",
                    }}
                  >
                    Add Route
                  </Paragraph>

                  {!!selectedPeer.peer && (
                    <div style={{ lineHeight: "20px" }}>
                      <label
                        style={{
                          color: "rgba(0, 0, 0, 0.88)",
                          fontSize: "14px",
                          fontWeight: "bold",
                        }}
                      >
                        Routing Peer
                      </label>
                      <Paragraph
                        type={"secondary"}
                        style={{
                          marginTop: "-2",
                          fontWeight: "500",
                          marginBottom: "5px",
                        }}
                      >
                        Assign a peer as a routing peer for the Network CIDR
                      </Paragraph>
                      <Form.Item
                        name="peer"
                        rules={[{ validator: peerValidator }]}
                      >
                        <Select
                          showSearch
                          style={{ width: "100%" }}
                          placeholder="Select Peer"
                          dropdownRender={peerDropDownRender}
                          options={options}
                          allowClear={true}
                          disabled={!!selectedPeer.peer}
                        />
                      </Form.Item>
                    </div>
                  )}

                  <Row align="top">
                    <Col span={24} style={{ lineHeight: "20px" }}>
                      {!editName && formRoute.id ? (
                        <div
                          className={
                            "access-control input-text ant-drawer-title"
                          }
                          onClick={() => toggleEditName(true)}
                        >
                          {formRoute.id ? formRoute.network_id : "New Route"}
                        </div>
                      ) : (
                        <>
                          <label
                            style={{
                              color: "rgba(0, 0, 0, 0.88)",
                              fontSize: "14px",
                              fontWeight: "bold",
                            }}
                          >
                            Network Identifier
                          </label>
                          <Paragraph
                            type={"secondary"}
                            style={{
                              marginTop: "-2",
                              fontWeight: "500",
                              marginBottom: "5px",
                            }}
                          >
                            Add a unique cryptographic key that is assigned to
                            each device
                          </Paragraph>
                          <Form.Item
                            name="network_id"
                            label=""
                            rules={[
                              {
                                required: true,
                                message:
                                  "Please add an identifier for this access route",
                                whitespace: true,
                              },
                            ]}
                          >
                            <Input
                              placeholder="for example “e.g. aws-eu-central-1-vpc”"
                              ref={inputNameRef}
                              disabled={!setupNewRouteHA && !newRoute}
                              onPressEnter={() => toggleEditName(false)}
                              onBlur={() => toggleEditName(false)}
                              autoComplete="off"
                              maxLength={40}
                            />
                          </Form.Item>
                        </>
                      )}
                      {!editDescription ? (
                        <div
                          onClick={() => toggleEditDescription(true)}
                          style={{
                            margin: "12px 0 30px",
                            lineHeight: "22px",
                            cursor: "pointer",
                          }}
                        >
                          {formRoute.description &&
                          formRoute.description.trim() !== "" ? (
                            formRoute.description
                          ) : (
                            <span style={{ textDecoration: "underline" }}>
                              Add description
                            </span>
                          )}
                        </div>
                      ) : (
                        <Form.Item
                          name="description"
                          label="Description"
                          style={{ marginTop: 24 }}
                        >
                          <Input
                            placeholder="Add description..."
                            ref={inputDescriptionRef}
                            disabled={!setupNewRouteHA && !newRoute}
                            onPressEnter={() => toggleEditDescription(false)}
                            onBlur={() => toggleEditDescription(false)}
                            autoComplete="off"
                            maxLength={200}
                          />
                        </Form.Item>
                      )}
                    </Col>
                  </Row>
                  <Row align="top">
                    <Col flex="auto"></Col>
                  </Row>
                </Header>
              </Col>
              {!!!selectedPeer.peer && (
                <Col span={24}>
                  <Form.Item name="enabled" label="">
                    <div
                      style={{
                        display: "flex",
                        gap: "15px",
                      }}
                    >
                      <Switch
                        size={"small"}
                        checked={formRoute.enabled}
                        onChange={handleEnableChange}
                      />
                      <div>
                        <label
                          style={{
                            color: "rgba(0, 0, 0, 0.88)",
                            fontSize: "14px",
                            fontWeight: "bold",
                          }}
                        >
                          Enabled
                        </label>
                        <Paragraph
                          type={"secondary"}
                          style={{
                            marginTop: "-2",
                            fontWeight: "500",
                            marginBottom: "0",
                          }}
                        >
                          You can enable or disable the route
                        </Paragraph>
                      </div>
                    </div>
                  </Form.Item>
                </Col>
              )}
              <Col span={24}>
                <label
                  style={{
                    color: "rgba(0, 0, 0, 0.88)",
                    fontSize: "14px",
                    fontWeight: "bold",
                  }}
                >
                  Network Range
                </label>
                <Paragraph
                  type={"secondary"}
                  style={{
                    marginTop: "-2",
                    fontWeight: "500",
                    marginBottom: "5px",
                  }}
                >
                  Add a private IP address range
                </Paragraph>
                <Form.Item
                  name="network"
                  label=""
                  rules={[{ validator: networkRangeValidator }]}
                >
                  <Input
                    placeholder="for example “172.16.0.0/16”"
                    disabled={!setupNewRouteHA && !newRoute}
                    autoComplete="off"
                    minLength={9}
                    maxLength={43}
                  />
                </Form.Item>
              </Col>

              <Col span={24}>
                <label
                  style={{
                    color: "rgba(0, 0, 0, 0.88)",
                    fontSize: "14px",
                    fontWeight: "bold",
                  }}
                >
                  Distribution groups
                </label>
                <Paragraph
                  type={"secondary"}
                  style={{
                    marginTop: "-2",
                    fontWeight: "500",
                    marginBottom: "5px",
                  }}
                >
                  Advertise this route to peers that belong to the following
                  groups
                </Paragraph>
                <Form.Item
                  name="groups"
                  label=""
                  rules={[{ validator: selectPreValidator }]}
                >
                  <Select
                    mode="tags"
                    style={{ width: "100%" }}
                    placeholder="Associate groups with the network route"
                    tagRender={tagRender}
                    onChange={handleChangeTags}
                    dropdownRender={dropDownRender}
                  >
                    {tagGroups.map((m) => (
                      <Option key={m}>{optionRender(m)}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              {!!selectedPeer.peer && (
                <Col span={24}>
                  <Form.Item name="enabled" label="">
                    <div
                      style={{
                        display: "flex",
                        gap: "15px",
                      }}
                    >
                      <Switch
                        size={"small"}
                        checked={formRoute.enabled}
                        onChange={handleEnableChange}
                      />
                      <div>
                        <label
                          style={{
                            color: "rgba(0, 0, 0, 0.88)",
                            fontSize: "14px",
                            fontWeight: "bold",
                          }}
                        >
                          Enabled
                        </label>
                        <Paragraph
                          type={"secondary"}
                          style={{
                            marginTop: "-2",
                            fontWeight: "500",
                            marginBottom: "0",
                          }}
                        >
                          You can enable or disable the route
                        </Paragraph>
                      </div>
                    </div>
                  </Form.Item>
                </Col>
              )}
              {!!!selectedPeer.peer && (
                <Col span={24}>
                  <label
                    style={{
                      color: "rgba(0, 0, 0, 0.88)",
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    Routing Peer
                  </label>
                  <Paragraph
                    type={"secondary"}
                    style={{
                      marginTop: "-2",
                      fontWeight: "500",
                      marginBottom: "5px",
                    }}
                  >
                    Assign a peer as a routing peer for the Network CIDR
                  </Paragraph>
                  <Form.Item name="peer" rules={[{ validator: peerValidator }]}>
                    <Select
                      showSearch
                      style={{ width: "100%" }}
                      placeholder="Select Peer"
                      dropdownRender={peerDropDownRender}
                      options={options}
                      allowClear={true}
                      disabled={!!selectedPeer.peer}
                    />
                  </Form.Item>
                </Col>
              )}

              <Col span={24}>
                <Collapse
                  onChange={onChange}
                  bordered={false}
                  ghost={true}
                  style={{ padding: "0" }}
                >
                  <Panel
                    key="0"
                    header={
                      <Paragraph
                        style={{
                          textAlign: "left",
                          whiteSpace: "pre-line",
                          fontSize: "14px",
                          fontWeight: "400",
                          margin: "0",
                          textDecoration: "underline",
                        }}
                      >
                        More settings
                      </Paragraph>
                    }
                    className="system-info-panel"
                  >
                    <Row gutter={16}>
                      <Col span={22}>
                        <Form.Item name="masquerade" label="">
                          <div
                            style={{
                              display: "flex",
                              gap: "15px",
                            }}
                          >
                            <Switch
                              size={"small"}
                              disabled={!setupNewRouteHA && !newRoute}
                              checked={formRoute.masquerade}
                              onChange={handleMasqueradeChange}
                            />
                            <div>
                              <label
                                style={{
                                  color: "rgba(0, 0, 0, 0.88)",
                                  fontSize: "14px",
                                  fontWeight: "bold",
                                }}
                              >
                                Masquerade
                              </label>
                              <Paragraph
                                type={"secondary"}
                                style={{
                                  marginTop: "-2",
                                  fontWeight: "500",
                                  marginBottom: "0",
                                }}
                              >
                                Allow access to your private networks without
                                configuring routes on your local routers or
                                other devices.
                              </Paragraph>
                            </div>
                          </div>
                        </Form.Item>
                      </Col>

                      <Col span={24}>
                        <label
                          style={{
                            color: "rgba(0, 0, 0, 0.88)",
                            fontSize: "14px",
                            fontWeight: "bold",
                          }}
                        >
                          Metric
                        </label>
                        <Paragraph
                          type={"secondary"}
                          style={{
                            marginTop: "-2",
                            fontWeight: "500",
                            marginBottom: "5px",
                          }}
                        >
                          Lower metrics indicating higher priority routes
                        </Paragraph>
                        <Row>
                          <Col span={12}>
                            <Form.Item name="metric" label="">
                              <InputNumber
                                min={1}
                                max={9999}
                                autoComplete="off"
                                className="w-100"
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                  </Panel>
                </Collapse>
              </Col>
              <Col
                span={24}
                style={{ marginTop: "20px", marginBottom: "25px" }}
              >
                <Text type={"secondary"}>
                  Learn more about
                  <a
                    target="_blank"
                    rel="noreferrer"
                    href="https://docs.netbird.io/how-to/routing-traffic-to-private-networks"
                  >
                    {" "}
                    Network Routes
                  </a>
                </Text>
              </Col>
            </Row>
          </Form>
        </Modal>
      )}
    </>
  );
};

export default RouteAddNew;
