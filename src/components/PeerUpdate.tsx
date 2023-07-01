import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "typesafe-actions";
import { capitalize } from "../utils/common";
import { actions as peerActions } from "../store/peer";
import {
  Button,
  Col,
  Collapse,
  Divider,
  message,
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
  Badge,
  SelectProps,
  Modal,
  Tooltip,
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
import RouteAddNew from "./RouteAddNew";
import { Route } from "../store/route/types";
import { useGetGroupTagHelpers } from "../utils/groups";

const { Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;
const punycode = require("punycode/");
const { Text } = Typography;

const PeerUpdate = () => {
  const { getTokenSilently } = useGetTokenSilently();
  const { Column } = Table;
  const { confirm } = Modal;
  const { optionRender } = useGetGroupTagHelpers();

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
  const savedRoute = useSelector((state: RootState) => state.route.savedRoute);
  const deletedRoute = useSelector(
    (state: RootState) => state.route.deletedRoute
  );
  const setupNewRouteVisible = useSelector(
    (state: RootState) => state.route.setupNewRouteVisible
  );
  const [tagGroups, setTagGroups] = useState([] as string[]);
  const [selectedTagGroups, setSelectedTagGroups] = useState([] as string[]);
  const [peerGroups, setPeerGroups] = useState([] as GroupPeer[]);
  const inputNameRef = useRef<any>(null);
  const [editName, setEditName] = useState(false);
  const options: SelectProps["options"] = [];
  const [estimatedName, setEstimatedName] = useState("");
  const [callingPeerAPI, setCallingPeerAPI] = useState(false);
  const [callingGroupAPI, setCallingGroupAPI] = useState(false);
  const [isSubmitRunning, setSubmitRunning] = useState(false);
  const [peerRoutes, setPeerRoutes] = useState([]);
  const [notPeerRoutes, setNotPeerRoutes] = useState([]);
  const [peerGroupsToSave, setPeerGroupsToSave] = useState({
    ID: "",
    groupsNoId: [],
    groupsToSave: [],
    groupsToRemove: [],
    groupsToAdd: [],
  } as PeerGroupsToSave);
  const routes = useSelector((state: RootState) => state.route.data);
  const [form] = Form.useForm();
  const styleNotification = { marginTop: 85 };

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
    const filterNotPeerRoutes: any = routes.filter(
      (route) => route.peer !== peer.id
    );
    setNotPeerRoutes(filterNotPeerRoutes);
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
        {value}
      </Tag>
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

    dispatch(routeActions.setSetupNewRouteVisible(false));
    dispatch(
      routeActions.setRoute({
        network: "",
        network_id: "",
        description: "",
        peer: "",
        masquerade: true,
        metric: 9999,
        enabled: true,
        groups: [],
      } as Route)
    );
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

  const saveGroupsKey = "saving_groups";
  useEffect(() => {
    if (
      !noUpdateToGroups() &&
      noUpdateToName() &&
      noUpdateToLoginExpiration()
    ) {
      console.log("no group update==<");
      const style = { marginTop: 85 };
      if (savedGroups.loading) {
        message.loading({
          content: "Updating peer groups...",
          key: saveGroupsKey,
          style,
        });
      } else if (savedGroups.success) {
        message.success({
          content: "Peer groups have been successfully updated.",
          key: saveGroupsKey,
          duration: 2,
          style,
        });
        // setUpdateGroupsVisible({} as Peer, false)
        dispatch(peerActions.resetSavedGroups(null));
      } else if (savedGroups.error) {
        message.error({
          content:
            "Failed to update peer groups. You might not have enough permissions.",
          key: saveGroupsKey,
          duration: 2,
          style,
        });
        dispatch(peerActions.resetSavedGroups(null));
      }
    }
  }, [savedGroups]);

  const updatePeerKey = "updating_peer";
  useEffect(() => {
    const style = { marginTop: 85 };
    if (updatedPeers.loading) {
      message.loading({
        content: "Updating peer...",
        key: updatePeerKey,
        duration: 0,
        style,
      });
    } else if (
      savedGroups.loading &&
      !noUpdateToGroups() &&
      (!noUpdateToName() || !noUpdateToLoginExpiration())
    ) {
      message.loading({
        content: "Updating peer...",
        key: updatePeerKey,
        duration: 0,
        style,
      });
    } else if (updatedPeers.success) {
      message.success({
        content: "Peer has been successfully updated.",
        key: updatePeerKey,
        duration: 2,
        style,
      });
      dispatch(peerActions.setUpdatedPeer({ ...updatedPeers, success: false }));
      dispatch(peerActions.resetUpdatedPeer(null));
    } else if (updatedPeers.error) {
      let msg = updatedPeers.error.data
        ? capitalize(updatedPeers.error.data.message)
        : updatedPeers.error.message;
      message.error({
        content: msg,
        key: updatePeerKey,
        duration: 3,
        style,
      });
      dispatch(peerActions.setUpdatedPeer({ ...updatedPeers, error: null }));
      dispatch(peerActions.resetUpdatedPeer(null));
    }
  }, [updatedPeers, savedGroups]);

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
      title: <span className="font-500">Delete network route {name}</span>,
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

  const onClickAddNewRoute = () => {
    dispatch(routeActions.setSetupNewRouteVisible(true));
    dispatch(
      routeActions.setRoute({
        network: "",
        network_id: "",
        description: "",
        peer: "",
        masquerade: true,
        metric: 9999,
        enabled: true,
        groups: [],
      } as Route)
    );
  };

  const saveKey = "saving";
  useEffect(() => {
    if (savedRoute.loading) {
      message.loading({
        content: "Saving...",
        key: saveKey,
        duration: 0,
        style: styleNotification,
      });
    } else if (savedRoute.success) {
      message.success({
        content: "Route has been successfully updated.",
        key: saveKey,
        duration: 2,
        style: styleNotification,
      });
      dispatch(routeActions.setSetupNewRouteVisible(false));
      dispatch(routeActions.setSavedRoute({ ...savedRoute, success: false }));
      dispatch(routeActions.resetSavedRoute(null));
    } else if (savedRoute.error) {
      let errorMsg = "Failed to update network route";
      switch (savedRoute.error.statusCode) {
        case 403:
          errorMsg =
            "Failed to update network route. You might not have enough permissions.";
          break;
        default:
          errorMsg = savedRoute.error.data.message
            ? savedRoute.error.data.message
            : errorMsg;
          break;
      }
      message.error({
        content: errorMsg,
        key: saveKey,
        duration: 5,
        style: styleNotification,
      });
      dispatch(routeActions.setSavedRoute({ ...savedRoute, error: null }));
      dispatch(routeActions.resetSavedRoute(null));
    }
  }, [savedRoute]);

  const deleteKey = "deleting";
  useEffect(() => {
    const style = { marginTop: 85 };
    if (deletedRoute.loading) {
      message.loading({ content: "Deleting...", key: deleteKey, style });
    } else if (deletedRoute.success) {
      message.success({
        content: "Route has been successfully deleted.",
        key: deleteKey,
        duration: 2,
        style,
      });
      dispatch(routeActions.resetDeletedRoute(null));
    } else if (deletedRoute.error) {
      message.error({
        content:
          "Failed to remove route. You might not have enough permissions.",
        key: deleteKey,
        duration: 2,
        style,
      });
      dispatch(routeActions.resetDeletedRoute(null));
    }
  }, [deletedRoute]);

  return (
    <>
      {peer && (
        <Container style={{ paddingTop: "40px" }}>
          <Breadcrumb
            style={{ marginBottom: "25px" }}
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
                  <Row align="top">
                    <Col flex="auto">
                      {!editName && peer.id && formPeer.name ? (
                        <div
                          style={{
                            color: "rgba(0, 0, 0, 0.88)",
                            fontWeight: "500",
                            fontSize: "22px",
                          }}
                          onClick={() => toggleEditName(true, peer.name)}
                        >
                          {formPeer.name ? formPeer.name : peer.name}
                          <EditOutlined style={{ marginLeft: "10px" }} />

                          <Paragraph
                            type={"secondary"}
                            style={{
                              textAlign: "left",
                              whiteSpace: "pre-line",
                              fontWeight: "400",
                            }}
                          >
                            <div style={{ marginBottom: "2px" }}>
                              {" "}
                              {formPeer.userEmail}{" "}
                            </div>
                            <div>
                              {!formPeer.connected && formPeer.login_expired ? (
                                <Tooltip title="The peer is offline and needs to be re-authenticated because its login has expired ">
                                  <Tag color="red">
                                    <Text
                                      style={{
                                        fontSize: "12px",
                                        color: "rgba(210, 64, 64, 0.85)",
                                      }}
                                      type={"secondary"}
                                    >
                                      needs login
                                    </Text>
                                  </Tag>
                                </Tooltip>
                              ) : (
                                <></>
                              )}
                            </div>
                          </Paragraph>
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
                            fontWeight: "500",
                          }}
                        >
                          NetBird IP
                        </span>

                        {formPeer.connected ? (
                          <Badge
                            color="green"
                            style={{
                              marginTop: "1px",
                              marginRight: "5px",
                              marginLeft: "0px",
                            }}
                          ></Badge>
                        ) : (
                          <Badge
                            color="rgb(211,211,211)"
                            style={{
                              marginTop: "1px",
                              marginRight: "5px",
                              marginLeft: "0px",
                            }}
                          ></Badge>
                        )}
                      </>
                    }
                  >
                    <Input
                      disabled={true}
                      value={formPeer.ip}
                      style={{ color: "#8c8c8c" }}
                      autoComplete="off"
                      suffix={<LockOutlined style={{ color: "#BFBFBF" }} />}
                    />
                  </Form.Item>
                </Col>
                <Col span={5}>
                  <Form.Item
                    name="dns_label"
                    label="Domain name"
                    style={{ fontWeight: "500" }}
                  >
                    <Input
                      disabled={true}
                      value={formPeer.userEmail}
                      style={{ color: "#8c8c8c" }}
                      autoComplete="off"
                      suffix={<LockOutlined style={{ color: "#BFBFBF" }} />}
                    />
                  </Form.Item>
                </Col>
                <Col span={4}>
                  <Form.Item
                    name="last_seen"
                    label="Last seen"
                    style={{ fontWeight: "500" }}
                  >
                    <Input
                      disabled={true}
                      value={formPeer.last_seen}
                      style={{ color: "#8c8c8c" }}
                      autoComplete="off"
                      suffix={<LockOutlined style={{ color: "#BFBFBF" }} />}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="login_expiration_enabled"
                    style={{ fontWeight: "500" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "15px",
                        margin: "25px 0",
                        lineHeight: "16px",
                      }}
                    >
                      <Switch
                        checked={formPeer.login_expiration_enabled}
                        onChange={onLoginExpirationChange}
                        disabled={!formPeer.user_id}
                        size="small"
                      />
                      <div>
                        <span className="font-500">Login expiration</span>
                        <Paragraph
                          type={"secondary"}
                          style={{
                            textAlign: "left",
                            whiteSpace: "pre-line",
                            fontWeight: "400",
                            margin: "0",
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
                  <Paragraph
                      style={{
                        whiteSpace: "pre-line",
                        margin: 0,
                        fontWeight: "500",
                      }}
                  >
                    Groups
                  </Paragraph>
                  <Text type={"secondary"}>
                    Use groups to control what this peer can access
                  </Text>
                  <Form.Item
                    name="groupsNames"
                    rules={[{ validator: selectValidator }]}
                    style={{ fontWeight: "500" }}
                  >
                    <Select
                      mode="tags"
                      style={{ width: "100%", marginTop: 5 }}
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
                    marginTop: "20px",
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
                  fontWeight: "500",
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
                    <Button type="primary" onClick={onClickAddNewRoute}>
                      Add route
                    </Button>
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
                            size="small"
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
                  <Button type="primary" onClick={onClickAddNewRoute}>
                    Add route
                  </Button>
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
                  header={
                    <Paragraph
                      style={{
                        textAlign: "left",
                        whiteSpace: "pre-line",
                        fontSize: "16px",
                        fontWeight: "500",
                        margin: "0",
                      }}
                    >
                      System info
                    </Paragraph>
                  }
                  className="system-info-panel"
                >
                  <Row gutter={16}>
                    <Col
                      span={24}
                      style={{
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
                      <Text type="secondary">{formPeer.hostname}</Text>
                    </Col>
                    <Col
                      span={24}
                      style={{
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
                      <Text type={"secondary"}>{formPeer.os}</Text>
                    </Col>
                    <Col
                      span={24}
                      style={{
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
                      <Text type="secondary">{formPeer.version}</Text>
                    </Col>
                    {formPeer.ui_version && (
                      <Col
                        span={24}
                        style={{
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
                        <Text type={"secondary"}>{formPeer.ui_version}</Text>
                      </Col>
                    )}
                  </Row>
                </Panel>
              </Collapse>
            </Col>
          </Card>
        </Container>
      )}
      {setupNewRouteVisible && (
        <RouteAddNew selectedPeer={peer} notPeerRoutes={notPeerRoutes} />
      )}
    </>
  );
};

export default PeerUpdate;
