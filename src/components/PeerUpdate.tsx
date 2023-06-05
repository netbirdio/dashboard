import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "typesafe-actions";
import { actions as peerActions } from "../store/peer";
import {
  Button,
  Col,
  Collapse,
  Divider,
  Drawer,
  Form,
  Input,
  Radio,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  Card,
  Switch,
  Breadcrumb,
  Table,
  Modal,
} from "antd";
import { Container } from "./Container";
import { Header } from "antd/es/layout/layout";
import type { CustomTagProps } from "rc-select/lib/BaseSelect";
import { FormPeer, Peer, PeerGroupsToSave } from "../store/peer/types";
import { Group, GroupPeer } from "../store/group/types";
import {
  LockOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import { RuleObject } from "antd/lib/form";
import { useGetTokenSilently } from "../utils/token";
import { timeAgo } from "../utils/common";
import { actions as routeActions } from "../store/route";

const { Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;
const punycode = require("punycode/");
const { Text } = Typography;

const PeerUpdate = () => {
  const { getTokenSilently } = useGetTokenSilently();
  const { Column } = Table;
  const { confirm } = Modal;

  const dispatch = useDispatch();
  const groups = useSelector((state: RootState) => state.group.data);
  const users = useSelector((state: RootState) => state.user.data);
  const peer: Peer = useSelector((state: RootState) => state.peer.peer);
  const [formPeer, setFormPeer] = useState({} as FormPeer);
  const updateGroupsVisible = useSelector(
    (state: RootState) => state.peer.updateGroupsVisible
  );

  const savedGroups = useSelector((state: RootState) => state.peer.savedGroups);
  const updatedPeers = useSelector(
    (state: RootState) => state.peer.updatedPeer
  );

  const [tagGroups, setTagGroups] = useState([] as string[]);
  const [selectedTagGroups, setSelectedTagGroups] = useState([] as string[]);
  const [peerGroups, setPeerGroups] = useState([] as GroupPeer[]);
  const inputNameRef = useRef<any>(null);
  const [editName, setEditName] = useState(false);
  const [estimatedName, setEstimatedName] = useState("");
  const [callingPeerAPI, setCallingPeerAPI] = useState(false);
  const [callingGroupAPI, setCallingGroupAPI] = useState(false);
  const [isSubmitRunning, setSubmitRunning] = useState(false);
  const [peerRoutes, setPeerRoutes] = useState([]);
  const [peerGroupsToSave, setPeerGroupsToSave] = useState({
    ID: "",
    groupsNoId: [],
    groupsToSave: [],
    groupsToRemove: [],
    groupsToAdd: [],
  } as PeerGroupsToSave);
  const routes = useSelector((state: RootState) => state.route.data);
  const [form] = Form.useForm();

  useEffect(() => {
    //Unmounting component clean
    return () => {
      onCancel();
    };
  }, []);

  // wait peer update to succeed
  useEffect(() => {
    if (callingPeerAPI && updatedPeers.success) {
      setCallingPeerAPI(false);
    }
  }, [updatedPeers]);

  // wait save groups to succeed
  useEffect(() => {
    if (callingGroupAPI && savedGroups.success) {
      setCallingGroupAPI(false);
    }
  }, [savedGroups]);

  // clean temp state and close
  useEffect(() => {
    if (isSubmitRunning && !callingGroupAPI && !callingPeerAPI) {
      onCancel();
    }
  }, [callingGroupAPI, callingPeerAPI]);

  useEffect(() => {
    if (editName)
      inputNameRef.current!.focus({
        cursor: "end",
      });
  }, [editName]);

  useEffect(() => {
    dispatch(
      routeActions.getRoutes.request({
        getAccessTokenSilently: getTokenSilently,
        payload: null,
      })
    );
  }, []);

  useEffect(() => {
    setPeerRoutes([]);
    const filterPeerRoutes: any = routes.filter(
      (route) => route.peer === peer.id
    );
    setPeerRoutes(filterPeerRoutes);
  }, [routes]);

  useEffect(() => {
    if (!peer) return;
    const gs = peer?.groups?.map(
      (g) => ({ id: g?.id || "", name: g.name } as GroupPeer)
    ) as GroupPeer[];
    const gs_name = gs?.map((g) => g.name) as string[];
    setPeerGroups(gs);
    setSelectedTagGroups(gs_name);
    const fPeer = {
      ...peer,
      name: formPeer.name ? formPeer.name : peer.name,
      groupsNames: gs_name,
      userEmail: users?.find((u) => u.id === peer.user_id)?.email,
      last_seen: peer.connected ? "just now" : String(timeAgo(peer.last_seen)),
      ui_version: peer.ui_version
        ? peer.ui_version.replace("netbird-desktop-ui/", "")
        : "",
    } as FormPeer;
    setFormPeer(fPeer);
    form.setFieldsValue(fPeer);
  }, [peer]);

  useEffect(() => {
    setTagGroups(groups?.map((g) => g.name) || []);
  }, [groups]);

  useEffect(() => {}, [users]);

  const toggleEditName = (status: boolean, value?: string) => {
    setEditName(status);

    if (value) {
      let punyName = punycode.toASCII(value.toLowerCase());
      let domain = "";
      if (formPeer.dns_label) {
        let labelList = formPeer.dns_label.split(".");
        if (labelList.length > 1) {
          labelList.splice(0, 1);
          domain = "." + labelList.join(".");
        }
      }
      setEstimatedName(punyName + domain);
    }
  };

  useEffect(() => {
    const groupsToRemove = peerGroups
      .filter((pg) => !selectedTagGroups.includes(pg.name))
      .map((g) => g.id);
    const groupsToAdd = (groups as Group[])
      .filter(
        (g) =>
          selectedTagGroups.includes(g.name) &&
          !groupsToRemove.includes(g.id || "") &&
          !peerGroups.find((pg) => pg.id === g.id)
      )
      .map((g) => g.id) as string[];
    const groupsNoId = selectedTagGroups.filter(
      (stg) => !groups.find((g) => g.name === stg)
    );
    setPeerGroupsToSave({
      ...peerGroupsToSave,
      ID: peer?.id || "",
      groupsToRemove,
      groupsToAdd,
      groupsNoId,
    });
  }, [selectedTagGroups]);

  const tagRender = (props: CustomTagProps) => {
    const { label, value, closable, onClose } = props;
    const onPreventMouseDown = (event: React.MouseEvent<HTMLSpanElement>) => {
      event.preventDefault();
      event.stopPropagation();
    };

    let tagClosable = true;
    if (value === "All") {
      tagClosable = false;
    }

    return (
      <Tag
        color="blue"
        onMouseDown={onPreventMouseDown}
        closable={tagClosable}
        onClose={onClose}
        style={{ marginRight: 3 }}
      >
        <strong>{value}</strong>
      </Tag>
    );
  };

  const optionRender = (label: string) => {
    let peersCount = "";
    const g = groups.find((_g) => _g.name === label);
    if (g)
      peersCount = ` - ${g.peers_count || 0} ${
        !g.peers_count || parseInt(g.peers_count) !== 1 ? "peers" : "peer"
      } `;
    return (
      <>
        <Tag color="blue" style={{ marginRight: 3 }}>
          <strong>{label}</strong>
        </Tag>
        <span style={{ fontSize: ".85em" }}>{peersCount}</span>
      </>
    );
  };

  const dropDownRender = (menu: React.ReactElement) => (
    <>
      {menu}
      <Divider style={{ margin: "8px 0" }} />
      <Row style={{ padding: "0 8px 4px" }}>
        <Col flex="auto">
          <span style={{ color: "#9CA3AF" }}>
            Add new group by pressing "Enter"
          </span>
        </Col>
        <Col flex="none">
          <svg
            width="14"
            height="12"
            viewBox="0 0 14 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M1.70455 7.19176V5.89915H10.3949C10.7727 5.89915 11.1174 5.80634 11.429 5.62074C11.7405 5.43513 11.9875 5.18655 12.1697 4.875C12.3554 4.56345 12.4482 4.21875 12.4482 3.84091C12.4482 3.46307 12.3554 3.12003 12.1697 2.81179C11.9841 2.50024 11.7356 2.25166 11.424 2.06605C11.1158 1.88044 10.7727 1.78764 10.3949 1.78764H9.83807V0.5H10.3949C11.0114 0.5 11.5715 0.650805 12.0753 0.952414C12.5791 1.25402 12.9818 1.65672 13.2834 2.16051C13.585 2.6643 13.7358 3.22443 13.7358 3.84091C13.7358 4.30161 13.648 4.73414 13.4723 5.13849C13.3 5.54285 13.0613 5.89915 12.7564 6.20739C12.4515 6.51562 12.0968 6.75758 11.6925 6.93324C11.2881 7.10559 10.8556 7.19176 10.3949 7.19176H1.70455ZM4.90128 11.0646L0.382102 6.54545L4.90128 2.02628L5.79119 2.91619L2.15696 6.54545L5.79119 10.1747L4.90128 11.0646Z"
              fill="#9CA3AF"
            />
          </svg>
        </Col>
      </Row>
    </>
  );

  const setUpdateGroupsVisible = (status: boolean) => {
    dispatch(peerActions.setUpdateGroupsVisible(status));
  };

  const onCancel = () => {
    dispatch(peerActions.setPeer(null));
    setUpdateGroupsVisible(false);
    setEditName(false);
    // setSaveBtnDisabled(true)
    setFormPeer({} as FormPeer);
    setCallingPeerAPI(false);
    setCallingPeerAPI(false);
    setSubmitRunning(false);
    setEstimatedName("");
  };

  const noUpdateToGroups = (): Boolean => {
    return (
      !peerGroupsToSave.groupsToRemove.length &&
      !peerGroupsToSave.groupsToAdd.length &&
      !peerGroupsToSave.groupsNoId.length
    );
  };

  const noUpdateToName = (): Boolean => {
    return !formPeer.name || formPeer.name === peer.name;
  };

  const noUpdateToLoginExpiration = (): Boolean => {
    return formPeer.login_expiration_enabled === peer.login_expiration_enabled;
  };
  const onChange = (data: any) => {
    setFormPeer({ ...formPeer, ...data });
  };

  const handleChangeTags = (value: string[]) => {
    let validatedValues: string[] = [];
    value.forEach(function (v) {
      if (v.trim().length) {
        validatedValues.push(v);
      }
    });
    setSelectedTagGroups(validatedValues);
  };

  const nameValidator = (_: RuleObject, value: string) => {
    let punyName = punycode.toASCII(value.toLowerCase());
    let domain = "";
    if (formPeer.dns_label) {
      let labelList = formPeer.dns_label.split(".");
      if (labelList.length > 1) {
        labelList.splice(0, 1);
        domain = "." + labelList.join(".");
      }
    }
    setEstimatedName(punyName + domain);
    return Promise.resolve();
  };

  const createPeerToSave = (): Peer => {
    return {
      id: formPeer.id,
      ssh_enabled: formPeer.ssh_enabled,
      name: formPeer.name,
      login_expiration_enabled: formPeer.login_expiration_enabled,
    } as Peer;
  };

  const handleFormSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        setSubmitRunning(true);
        if (!noUpdateToName() || !noUpdateToLoginExpiration()) {
          const peerUpdate = createPeerToSave();
          setCallingPeerAPI(true);
          dispatch(
            peerActions.updatePeer.request({
              getAccessTokenSilently: getTokenSilently,
              payload: peerUpdate,
            })
          );
        }
        if (!noUpdateToGroups()) {
          setCallingGroupAPI(true);
          dispatch(
            peerActions.saveGroups.request({
              getAccessTokenSilently: getTokenSilently,
              payload: peerGroupsToSave,
            })
          );
        }
      })
      .catch((errorInfo) => {
        console.log("errorInfo", errorInfo);
      });
  };

  const selectValidator = (_: RuleObject, value: string[]) => {
    let hasSpaceNamed = [];
    let isAllPresent = false;

    if (!value.length) {
      return Promise.reject(new Error("Please enter ate least one group"));
    }

    value.forEach(function (v: string) {
      if (!v.trim().length) {
        hasSpaceNamed.push(v);
      }
      if (v === "All") {
        isAllPresent = true;
      }
    });

    if (!isAllPresent) {
      return Promise.reject(new Error("The All group can't be removed"));
    }

    if (hasSpaceNamed.length) {
      return Promise.reject(
        new Error("Group names with just spaces are not allowed")
      );
    }

    return Promise.resolve();
  };

  const onBreadcrumbUsersClick = () => {
    onCancel();
  };

  const showConfirmDelete = (routeId: string, name: string) => {
    confirm({
      icon: <ExclamationCircleOutlined />,
      title: 'Delete network route "' + name + '"',
      width: 600,
      content: (
        <Space direction="vertical" size="small">
          <Paragraph>
            Are you sure you want to delete this route from your account?
          </Paragraph>
        </Space>
      ),
      okType: "danger",
      onOk() {
        dispatch(
          routeActions.deleteRoute.request({
            getAccessTokenSilently: getTokenSilently,
            payload: routeId || "",
          })
        );
      },
      onCancel() {},
    });
  };

  const onRouteEnableChange = (checked: boolean, record: any) => {
    let updateRoutesRecord = { ...record, enabled: checked };

    dispatch(
      routeActions.saveRoute.request({
        getAccessTokenSilently: getTokenSilently,
        payload: updateRoutesRecord,
      })
    );
  };

  const onLoginExpirationChange = (checked: boolean) => {
    setFormPeer({ ...formPeer, login_expiration_enabled: checked });
  };

  return (
    <>
      {peer && (
        <Container style={{ paddingTop: "40px" }}>
          <Breadcrumb
            style={{ marginBottom: "30px" }}
            items={[
              {
                title: <a onClick={onBreadcrumbUsersClick}>Peers</a>,
              },
              {
                title: formPeer.ip,
              },
            ]}
          />
          <Card
            bordered={true}
            style={{ marginBottom: "7px" }}
            className="peers-form"
          >
            <Form
              layout="vertical"
              requiredMark={false}
              form={form}
              onValuesChange={onChange}
            >
              <Row gutter={16}>
                <Col span={24}>
                  <Header>
                    <Row align="top">
                      <Col flex="auto">
                        {!editName && peer.id && formPeer.name ? (
                          <div
                            style={{
                              color: "rgba(0, 0, 0, 0.88)",
                              fontWeight: "600",
                              fontSize: "16px",
                            }}
                            onClick={() => toggleEditName(true, peer.name)}
                          >
                            {formPeer.name ? formPeer.name : peer.name}
                            <EditOutlined style={{ marginLeft: "10px" }} />

                            <span
                              style={{
                                display: "block",
                                color: "#6C727F",
                                fontWeight: "400",
                                fontSize: "13px",
                              }}
                            >
                              {formPeer.userEmail}
                            </span>
                          </div>
                        ) : (
                          <Row>
                            <Space direction={"vertical"} size="small">
                              <Form.Item
                                name="name"
                                label="Name"
                                style={{ margin: "1px" }}
                                rules={[
                                  {
                                    required: true,
                                    message:
                                      "Please add a new name for this peer",
                                    whitespace: true,
                                  },
                                  { validator: nameValidator },
                                ]}
                              >
                                <Input
                                  placeholder={peer.name}
                                  ref={inputNameRef}
                                  onPressEnter={() => toggleEditName(false)}
                                  onBlur={() => toggleEditName(false)}
                                  autoComplete="off"
                                  max={59}
                                />
                              </Form.Item>
                              <Form.Item
                                label="Domain name preview"
                                tooltip="If the domain name already exists, we add an increment number suffix to it"
                                style={{ margin: "1px" }}
                              >
                                <Paragraph>
                                  <Tag>{estimatedName}</Tag>
                                </Paragraph>
                              </Form.Item>
                            </Space>
                          </Row>
                        )}
                      </Col>
                    </Row>
                  </Header>
                </Col>
              </Row>
              <Row gutter={30} style={{ marginTop: "25px" }}>
                <Col span={4}>
                  <Form.Item
                    name="ip"
                    label={
                      <>
                        <span
                          style={{
                            marginRight: "5px",
                            fontWeight: "bold",
                          }}
                        >
                          NetBird IP
                        </span>
                        <Tag color={formPeer.connected ? "green" : "red"}>
                          {formPeer.connected ? "online" : "offline"}
                        </Tag>
                      </>
                    }
                  >
                    <Input
                      disabled={true}
                      value={formPeer.ip}
                      style={{ color: "#5a5c5a" }}
                      autoComplete="off"
                      suffix={<LockOutlined style={{ color: "#BFBFBF" }} />}
                    />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item
                    name="last_seen"
                    label="Last seen"
                    style={{ fontWeight: "bold" }}
                  >
                    <Input
                      disabled={true}
                      value={formPeer.last_seen}
                      style={{ color: "#5a5c5a" }}
                      autoComplete="off"
                      suffix={<LockOutlined style={{ color: "#BFBFBF" }} />}
                    />
                  </Form.Item>
                </Col>
                {formPeer.user_id && (
                  <Col span={4}>
                    <Form.Item
                      name="userEmail"
                      label="User"
                      style={{ fontWeight: "bold" }}
                    >
                      <Input
                        disabled={true}
                        value={formPeer.userEmail}
                        style={{ color: "#5a5c5a" }}
                        autoComplete="off"
                      />
                    </Form.Item>
                  </Col>
                )}
              </Row>

              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="login_expiration_enabled"
                    style={{ fontWeight: "bold" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <Switch
                        checked={formPeer.login_expiration_enabled}
                        onChange={onLoginExpirationChange}
                        disabled={!formPeer.user_id}
                      />
                      <div style={{ margin: "30px 0" }}>
                        <strong>Login expiration</strong>
                        <Paragraph
                          type={"secondary"}
                          style={{
                            textAlign: "left",
                            whiteSpace: "pre-line",
                            fontWeight: "400",
                          }}
                        >
                          Login expiration SSO login peers require
                          re-authentication when their login expires
                        </Paragraph>
                      </div>
                    </div>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    name="groupsNames"
                    label="Select peer groups"
                    style={{ fontWeight: "bold" }}
                    rules={[{ validator: selectValidator }]}
                  >
                    <Select
                      mode="tags"
                      style={{ width: "100%" }}
                      placeholder="Select groups..."
                      tagRender={tagRender}
                      dropdownRender={dropDownRender}
                      onChange={handleChangeTags}
                    >
                      {tagGroups.map((m) => (
                        <Option key={m}>{optionRender(m)}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col
                  span={24}
                  style={{
                    display: "flex",
                    justifyContent: "start",
                    gap: "10px",
                  }}
                >
                  <Button onClick={onCancel} disabled={savedGroups.loading}>
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    disabled={
                      savedGroups.loading ||
                      updatedPeers.loading ||
                      (noUpdateToGroups() &&
                        noUpdateToName() &&
                        noUpdateToLoginExpiration())
                    }
                    onClick={handleFormSubmit}
                  >
                    Save
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card>

          {/* --- */}

          <Card
            bordered={true}
            // loading={loading}ƒ
            style={{ marginBottom: "7px" }}
          >
            <div style={{ maxWidth: "800px" }}>
              <Paragraph
                style={{
                  textAlign: "left",
                  whiteSpace: "pre-line",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                Network routes
              </Paragraph>
              <Row
                gutter={21}
                style={{ marginTop: "-16px", marginBottom: "10px" }}
              >
                <Col xs={24} sm={24} md={20} lg={20} xl={20} xxl={20} span={20}>
                  <Paragraph
                    type={"secondary"}
                    style={{ textAlign: "left", whiteSpace: "pre-line" }}
                  >
                    Access other networks without installing NetBird on every
                    resource.
                  </Paragraph>
                </Col>
                <Col
                  xs={24}
                  sm={24}
                  md={1}
                  lg={1}
                  xl={1}
                  xxl={1}
                  span={1}
                  style={{ marginTop: "-16px" }}
                >
                  {peerRoutes && peerRoutes.length > 0 && (
                    <Button type="primary">Add route</Button>
                  )}
                </Col>
              </Row>
              {peerRoutes && peerRoutes.length > 0 && (
                <Table
                  size={"small"}
                  style={{ marginTop: "-10px" }}
                  showHeader={false}
                  scroll={{ x: 800 }}
                  pagination={false}
                  //   loading={tableSpin(loading)}
                  dataSource={peerRoutes}
                >
                  <Column title="Name" dataIndex="network_id" />
                  <Column title="Name" dataIndex="network" />
                  <Column
                    title="enabled"
                    dataIndex="network"
                    render={(e, record: any, index) => {
                      return (
                        <>
                          <Switch
                            defaultChecked={record.enabled}
                            onChange={(checked) =>
                              onRouteEnableChange(checked, record)
                            }
                          />
                        </>
                      );
                    }}
                  />

                  <Column
                    align="right"
                    render={(text, record: any, index) => {
                      return (
                        <Button
                          danger={true}
                          type={"text"}
                          onClick={() => {
                            showConfirmDelete(record.id, record.network_id);
                          }}
                        >
                          Delete
                        </Button>
                      );
                    }}
                  />
                </Table>
              )}
              <Divider style={{ marginTop: "-12px" }}></Divider>
              {(peerRoutes === null || peerRoutes.length === 0) && (
                <Space
                  direction="vertical"
                  size="small"
                  align="start"
                  style={{
                    display: "flex",
                    padding: "35px 0px",
                    marginTop: "-40px",
                    justifyContent: "center",
                  }}
                >
                  <Paragraph
                    style={{ textAlign: "start", whiteSpace: "pre-line" }}
                  >
                    You don't have any routes yet
                  </Paragraph>
                  <Button type="primary">Create token</Button>
                </Space>
              )}
            </div>
          </Card>

          <Card bordered={true} style={{ marginBottom: "50px" }}>
            <Col span={24}>
              <Collapse
                onChange={onChange}
                bordered={false}
                ghost={true}
                style={{ padding: "0" }}
              >
                <Panel
                  key="0"
                  header="System Info"
                  className="system-info-panel"
                  style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    marginBottom: "0",
                  }}
                >
                  <Row gutter={16}>
                    <Col
                      span={24}
                      style={{
                        fontSize: "14px",
                        color: "#000000",
                        fontWeight: "400",
                        marginBottom: "2px",
                      }}
                    >
                      <Text
                        style={{
                          width: "100%",
                          maxWidth: "130px",
                          display: "inline-block",
                        }}
                      >
                        Hostname:
                      </Text>
                      <Text style={{ color: "#6C727F" }}>
                        {formPeer.hostname}
                      </Text>
                    </Col>
                    <Col
                      span={24}
                      style={{
                        fontSize: "14px",
                        color: "#000000",
                        fontWeight: "400",
                        marginBottom: "2px",
                      }}
                    >
                      <Text
                        style={{
                          width: "100%",
                          maxWidth: "130px",
                          display: "inline-block",
                        }}
                      >
                        Operating system:
                      </Text>
                      <Text style={{ color: "#6C727F" }}>{formPeer.os}</Text>
                    </Col>
                    <Col
                      span={24}
                      style={{
                        fontSize: "14px",
                        color: "#000000",
                        fontWeight: "400",
                        marginBottom: "2px",
                      }}
                    >
                      <Text
                        style={{
                          width: "100%",
                          maxWidth: "130px",
                          display: "inline-block",
                        }}
                      >
                        Agent version:
                      </Text>
                      <Text style={{ color: "#6C727F" }}>{formPeer.version}</Text>
                    </Col>
                    {formPeer.ui_version && (
                      <Col
                        span={24}
                        style={{
                          fontSize: "14px",
                          color: "#000000",
                          marginBottom: "2px",
                        }}
                      >
                        <Text
                          style={{
                            width: "100%",
                            maxWidth: "130px",
                            display: "inline-block",
                          }}
                        >
                          UI version:
                        </Text>
                        <Text style={{ color: "#6C727F" }}>
                          {" "}
                          {formPeer.ui_version}
                        </Text>
                      </Col>
                    )}
                  </Row>
                </Panel>
              </Collapse>
            </Col>
          </Card>
        </Container>
      )}
    </>
  );
};

export default PeerUpdate;
