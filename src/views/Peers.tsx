import React, { useEffect, useState } from "react";
import { capitalize, formatOS, timeAgo } from "../utils/common";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "typesafe-actions";
import { actions as peerActions } from "../store/peer";
import { actions as groupActions } from "../store/group";
import { actions as routeActions } from "../store/route";
import { Container } from "../components/Container";
import {
  EllipsisOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Dropdown,
  Input,
  List,
  Menu,
  message,
  Modal,
  Popover,
  Radio,
  RadioChangeEvent,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { storeFilterState, getFilterState } from "../utils/filterState";
import { Peer, PeerDataTable } from "../store/peer/types";
import { filter } from "lodash";
import { Group, GroupPeer } from "../store/group/types";
import PeerUpdate from "../components/PeerUpdate";
import tableSpin from "../components/Spin";
import { TooltipPlacement } from "antd/es/tooltip";
import { useGetTokenSilently } from "../utils/token";
import { actions as userActions } from "../store/user";
import ButtonCopyMessage from "../components/ButtonCopyMessage";
import { usePageSizeHelpers } from "../utils/pageSize";
import AddPeerPopup from "../components/popups/addpeer/addpeer/AddPeerPopup";
import { getLocalItem, setLocalItem, StorageKey } from "../services/local";
import { useOidcUser } from "@axa-fr/react-oidc";
import { useGetGroupTagHelpers } from "../utils/groups";
import { UpdatePeerGroupModal } from "../components/UpdatePeerGroupModal";

const { Title, Paragraph, Text } = Typography;
const { Column } = Table;
const { confirm } = Modal;
const { Option } = Select;

export const Peers = () => {
  const { onChangePageSize, pageSizeOptions, pageSize } = usePageSizeHelpers();
  const { optionRender, blueTagRender, tagGroups, dropDownRender } =
    useGetGroupTagHelpers();

  const { getTokenSilently } = useGetTokenSilently();
  const dispatch = useDispatch();

  const peers = useSelector((state: RootState) => state.peer.data);
  const peer: Peer = useSelector((state: RootState) => state.peer.peer);
  const routes = useSelector((state: RootState) => state.route.data);
  const failed = useSelector((state: RootState) => state.peer.failed);
  const loading = useSelector((state: RootState) => state.peer.loading);
  const deletedPeer = useSelector((state: RootState) => state.peer.deletedPeer);
  const groups = useSelector((state: RootState) => state.group.data);
  const loadingGroups = useSelector((state: RootState) => state.group.loading);
  const savedGroups = useSelector((state: RootState) => state.peer.savedGroups);
  const updatedPeer = useSelector((state: RootState) => state.peer.updatedPeer);
  const updateGroupsVisible = useSelector(
    (state: RootState) => state.peer.updateGroupsVisible
  );
  const users = useSelector((state: RootState) => state.user.data);
  const [addPeerModalOpen, setAddPeerModalOpen] = useState(false);
  const { oidcUser } = useOidcUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  const [textToSearch, setTextToSearch] = useState("");
  const [groupsFilterArray, setGroupsFilterArray] = useState([]);
  const [optionOnOff, setOptionOnOff] = useState("all");
  const [dataTable, setDataTable] = useState([] as PeerDataTable[]);
  const [peerToAction, setPeerToAction] = useState(
    null as PeerDataTable | null
  );
  const [groupPopupVisible, setGroupPopupVisible] = useState("");
  const [showTutorial, setShowTutorial] = useState(false);
  const [hadFirstRun, setHadFirstRun] = useState(true);
  const [confirmModal, confirmModalContextHolder] = Modal.useModal();

  const optionsOnOff = [
    { label: "Online", value: "on" },
    { label: "All", value: "all" },
  ];

  const transformDataTable = (d: Peer[]): PeerDataTable[] => {
    return d.map((p) => {
      const gs = groups
        .filter((g) => g.peers?.find((_p: GroupPeer) => _p.id === p.id))
        .map((g) => ({
          id: g.id,
          name: g.name,
          peers_count: g.peers?.length,
          peers: g.peers || [],
        }));

      return {
        key: p.id,
        ...p,
        groups: gs,
        groupsCount: gs.length,
      } as PeerDataTable;
    });
  };

  useEffect(() => {
    if (users) {
      let currentUser = users.find((user) => user.is_current);
      if (currentUser) {
        setIsAdmin(currentUser.role === "admin");
      }
    }
  }, [users]);

  useEffect(() => {
    if (!loading && peers && groups) {
      const quickFilter = getFilterState("peerFilter", "quickFilter");
      if (quickFilter) setOptionOnOff(quickFilter);

      const searchText = getFilterState("peerFilter", "search");
      if (searchText) setTextToSearch(searchText);

      const pageSize = getFilterState("peerFilter", "pageSize");
      if (pageSize) onChangePageSize(pageSize, "peerFilter");

      const groupFilter = getFilterState("peerFilter", "groupFilter") || [];
      if (groupFilter) setGroupsFilterArray(groupFilter);

      if (quickFilter || searchText || pageSize || groupFilter) {
        setDataTable(
          transformDataTable(filterDataTable(searchText, groupFilter))
        );
      } else {
        setDataTable(transformDataTable(peers));
      }
    }
  }, [loading, peers, groups]);

  const refresh = () => {
    dispatch(
      userActions.getUsers.request({
        getAccessTokenSilently: getTokenSilently,
        payload: null,
      })
    );
    dispatch(
      peerActions.getPeers.request({
        getAccessTokenSilently: getTokenSilently,
        payload: null,
      })
    );
    dispatch(
      groupActions.getGroups.request({
        getAccessTokenSilently: getTokenSilently,
        payload: null,
      })
    );
    if (isAdmin)
      dispatch(
        routeActions.getRoutes.request({
          getAccessTokenSilently: getTokenSilently,
          payload: null,
        })
      );
  };

  useEffect(() => {
    getLocalItem<boolean>(StorageKey.hadFirstRun).then((f) =>
      setHadFirstRun(f === null ? false : f)
    );
    refresh();
  }, []);

  useEffect(() => {
    if (!hadFirstRun) {
      setLocalItem(StorageKey.hadFirstRun, true).then();
      setAddPeerModalOpen(true);
    } else {
      setAddPeerModalOpen(false);
    }
  }, [hadFirstRun]);

  useEffect(() => {
    if (peers.length) {
      setShowTutorial(false);
      if (!hadFirstRun) {
        setHadFirstRun(true);
      }
    } else {
      setShowTutorial(true);
    }
  }, [peers, groups]);

  useEffect(() => {
    setDataTable(transformDataTable(filterDataTable("", groupsFilterArray)));
  }, [textToSearch, optionOnOff]);

  const deleteKey = "deleting";
  useEffect(() => {
    const style = { marginTop: 85 };
    if (deletedPeer.loading) {
      message.loading({ content: "Deleting...", key: deleteKey, style });
    } else if (deletedPeer.success) {
      message.success({
        content: "Peer has been successfully removed.",
        key: deleteKey,
        duration: 2,
        style,
      });
      dispatch(peerActions.resetDeletedPeer(null));
    } else if (deletedPeer.error) {
      message.error({
        content:
          "Failed to delete peer. You might not have enough permissions.",
        key: deleteKey,
        duration: 2,
        style,
      });
      dispatch(peerActions.resetDeletedPeer(null));
    }
  }, [deletedPeer]);

  const handleGroupChange = (value: any) => {
    setGroupsFilterArray(value);
    storeFilterState("peerFilter", "groupFilter", value);
    setDataTable(transformDataTable(filterDataTable(textToSearch, value)));
  };

  const filterDataTable = (searchText: string, groupIDs: string[]): Peer[] => {
    const t = searchText
      ? searchText.toLowerCase().trim()
      : textToSearch.toLowerCase().trim();
    let f: Peer[] = filter(peers, (f: Peer) => {
      let userEmail: string | null;
      const u = users?.find((u) => u.id === f.user_id)?.email;
      userEmail = u ? u : "";
      return (
        f.name.toLowerCase().includes(t) ||
        f.ip.includes(t) ||
        f.os.includes(t) ||
        t === "" ||
        f.groups?.find((u) => u.name.toLowerCase().trim().includes(t)) ||
        (userEmail && userEmail.toLowerCase().includes(t))
      );
    }) as Peer[];
    if (optionOnOff === "on") {
      f = filter(peers, (f: Peer) => f.connected);
    }

    let filterByGroupArray: any = [];
    let tempFilterByGroupArray: any = [];
    if (groupIDs.length) {
      f.forEach((element) => {
        element.groups?.forEach((element2) => {
          if (element2.id && groupIDs.includes(element2.id)) {
            if (!tempFilterByGroupArray.includes(element.id)) {
              filterByGroupArray.push(element);
              tempFilterByGroupArray.push(element.id);
            }
          }
        });
      });
      f = filterByGroupArray;
    }

    return f;
  };

  const onChangeTextToSearch = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setTextToSearch(e.target.value);
    storeFilterState("peerFilter", "search", e.target.value);
  };

  // const searchDataTable = () => {
  //   const data = filterDataTable();
  //   setDataTable(transformDataTable(data));
  // };

  const onChangeOnOff = ({ target: { value } }: RadioChangeEvent) => {
    setOptionOnOff(value);
    storeFilterState("peerFilter", "quickFilter", value);
  };

  const showConfirmDelete = (record: PeerDataTable) => {
    setPeerToAction(record);
    let peerRoutes: string[] = [];
    routes.forEach((r) => {
      if (r.peer == record?.id) {
        peerRoutes.push(r.network_id);
      }
    });

    let content = (
      <Paragraph>
        Are you sure you want to delete peer from your account?
      </Paragraph>
    );
    let contentModule = <div>{content}</div>;
    if (peerRoutes.length) {
      let contentWithRoutes =
        "Removing this peer will disable the following routes: " + peerRoutes;
      let B = (
        <Alert
          message={contentWithRoutes}
          type="warning"
          showIcon
          closable={false}
        />
      );

      contentModule = (
        <div>
          {content}
          <Paragraph>
            <Alert
              message={
                <div>
                  <>
                    This peer is part of one or more network routes. Removing
                    this peer will disable the following routes:
                  </>
                  <List
                    dataSource={peerRoutes}
                    renderItem={(item) => (
                      <List.Item>
                        <Text strong>- {item}</Text>
                      </List.Item>
                    )}
                    bordered={false}
                    split={false}
                    itemLayout={"vertical"}
                  />
                </div>
              }
              type="warning"
              showIcon={false}
              closable={false}
            />
          </Paragraph>
        </div>
      );
    }
    let name = record ? record.name : "";
    confirmModal.confirm({
      icon: <ExclamationCircleOutlined />,
      title: <span className="font-500">Delete peer {name}</span>,
      width: 600,
      content: contentModule,
      onOk() {
        dispatch(
          peerActions.deletedPeer.request({
            getAccessTokenSilently: getTokenSilently,
            payload: record && record.id ? record.id! : "",
          })
        );
      },
      onCancel() {
        setPeerToAction(null);
      },
    });
  };

  const showConfirmEnableSSH = (record: PeerDataTable) => {
    confirmModal.confirm({
      icon: <ExclamationCircleOutlined />,
      title: (
        <span className="font-500">Enable SSH Server for {record.name} ?</span>
      ),
      width: 600,
      content:
        "Experimental feature. Enabling this option allows remote SSH access to this machine from other connected network participants.",
      onOk() {
        handleSwitchSSH(record, true);
      },
      onCancel() {},
    });
  };

  function handleSwitchSSH(record: PeerDataTable, checked: boolean) {
    const peer = {
      id: record.id,
      ssh_enabled: checked,
      name: record.name,
    } as Peer;
    dispatch(
      peerActions.updatePeer.request({
        getAccessTokenSilently: getTokenSilently,
        payload: peer,
      })
    );
  }

  const onClickViewPeer = () => {
    dispatch(peerActions.setUpdateGroupsVisible(true));
    dispatch(peerActions.setPeer(peerToAction as Peer));
  };

  useEffect(() => {
    if (updateGroupsVisible) {
      setGroupPopupVisible("");
    }
  }, [updateGroupsVisible]);

  const onPopoverVisibleChange = (b: boolean, key: string) => {
    if (updateGroupsVisible) {
      setGroupPopupVisible("");
    } else {
      if (b) {
        setGroupPopupVisible(key);
      } else {
        setGroupPopupVisible("");
      }
    }
  };

  const setUpdateGroupsVisible = (peerToAction: Peer, status: boolean) => {
    if (status) {
      dispatch(peerActions.setPeer({ ...peerToAction }));
      dispatch(peerActions.setUpdateGroupsVisible(true));
      return;
    }
    dispatch(peerActions.setPeer(null));
    dispatch(peerActions.setUpdateGroupsVisible(false));
  };

  const setGroupVisible = (peerToAction: Peer, status: boolean) => {
    if (status) {
      dispatch(peerActions.setPeer({ ...peerToAction }));
      setShowGroupModal(true);
      return;
    }
    dispatch(peerActions.setPeer(null));
    setShowGroupModal(true);
  };

  const renderPopoverGroups = (
    label: string,
    groups: Group[] | string[] | null,
    peerToAction: PeerDataTable
  ) => {
    const content = groups?.map((g, i) => {
      const _g = g as Group;
      const peersCount = ` - ${_g.peers_count || 0} ${
        !_g.peers_count || parseInt(_g.peers_count) !== 1 ? "peers" : "peer"
      } `;
      return (
        <div key={i}>
          <Tag color="blue" style={{ marginRight: 3 }}>
            {_g.name}
          </Tag>
          <span style={{ fontSize: ".85em" }}>{peersCount}</span>
        </div>
      );
    });

    let btn = (
      <Button
        type="link"
        onClick={() => setUpdateGroupsVisible(peerToAction, true)}
      >
        {label}
      </Button>
    );
    if (!content || content!.length < 1) {
      return btn;
    }

    const mainContent = <Space direction="vertical">{content}</Space>;
    let popoverPlacement = "top";
    if (content && content.length > 5) {
      popoverPlacement = "rightTop";
    }

    return (
      <Popover
        placement={popoverPlacement as TooltipPlacement}
        key={peerToAction.key}
        content={mainContent}
        onOpenChange={(b: boolean) =>
          onPopoverVisibleChange(b, peerToAction.key)
        }
        open={groupPopupVisible === peerToAction.key}
        title={null}
      >
        <Button
          type="link"
          onClick={() => setGroupVisible(peerToAction, true)}
        >
          {label}
        </Button>
      </Popover>
    );
  };

  const renderAddress = (peer: PeerDataTable) => {
    if (!peer.dns_label) {
      return (
        <ButtonCopyMessage
          keyMessage={peer.key}
          toCopy={peer.ip}
          body={peer.ip}
          messageText={"IP copied"}
          styleNotification={{}}
        />
      );
    }

    const body = (
      <span style={{ textAlign: "left" }}>
        <Row>
          <ButtonCopyMessage
            keyMessage={peer.dns_label}
            toCopy={peer.dns_label}
            body={peer.dns_label}
            messageText={"Peer domain copied"}
            styleNotification={{}}
          />
        </Row>

        <Row>
          <ButtonCopyMessage
            keyMessage={peer.ip}
            toCopy={peer.ip}
            body={<Text type="secondary">{peer.ip}</Text>}
            messageText={"Peer IP copied"}
            style={{ marginTop: "-10px" }}
            styleNotification={{}}
          />
        </Row>
      </span>
    );

    return body;
  };

  const renderName = (peer: PeerDataTable) => {
    let status = (
      <Badge
        size={"small"}
        color={peer.connected ? "green" : "rgb(211,211,211)"}
        text={peer.name}
      ></Badge>
    );

    let loginExpire = peer.login_expired ? (
      <Tooltip title="The peer is offline and needs to be re-authenticated because its login has expired ">
        <Tag color="red">
          <Text
            style={{ fontSize: "10px", color: "rgba(210, 64, 64, 0.85)" }}
            type={"secondary"}
          >
            needs login
          </Text>
        </Tag>
      </Tooltip>
    ) : (
      ""
    );

    const userEmail = users?.find((u) => u.id === peer.user_id)?.email;
    let expiry = !peer.login_expiration_enabled ? (
      <Tag>
        <Text type="secondary" style={{ fontSize: 10 }}>
          expiration disabled
        </Text>
      </Tag>
    ) : null;
    if (!userEmail) {
      return (
        <>
          <Button
            type="text"
            style={{ height: "auto", whiteSpace: "normal", textAlign: "left" }}
            onClick={() => setUpdateGroupsVisible(peer, true)}
          >
            <span style={{ textAlign: "left" }}>
              <Row>
                <Text className="font-500"> {status}</Text>
              </Row>
              <Row>{loginExpire}</Row>
            </span>
          </Button>
        </>
      );
    }
    return (
      <div>
        <Button
          type="text"
          style={{ height: "auto", textAlign: "left" }}
          onClick={() => setUpdateGroupsVisible(peer, true)}
        >
          <span style={{ textAlign: "left" }}>
            <Row>
              <Text className="font-500"> {status}</Text>
            </Row>
            <Row>
              <Text type="secondary">{userEmail}</Text>
            </Row>
            <Row style={{ minWidth: "195px" }}>
              {expiry} {loginExpire}
            </Row>
          </span>
        </Button>
      </div>
    );
  };

  return (
    <>
      {!peer && (
        <>
          <Container style={{ paddingTop: "40px" }}>
            <Row>
              <Col span={24}>
                <Title className="page-heading">Peers</Title>
                {peers.length ? (
                  <Paragraph style={{ marginTop: "5px" }}>
                    A list of all machines and devices connected to your private
                    network. Use this view to manage peers
                  </Paragraph>
                ) : (
                  <Paragraph style={{ marginTop: "5px" }} type={"secondary"}>
                    A list of all machines and devices connected to your private
                    network. Use this view to manage peers
                  </Paragraph>
                )}

                <Space
                  direction="vertical"
                  size="large"
                  style={{ display: "flex" }}
                >
                  <Row gutter={[16, 24]}>
                    <Col xs={24} sm={24} md={8} lg={8} xl={8} xxl={8} span={8}>
                      <Input
                        allowClear
                        value={textToSearch}
                        // onPressEnter={searchDataTable}
                        placeholder="Search by name, IP, owner, or group..."
                        onChange={onChangeTextToSearch}
                      />
                    </Col>
                    <Col
                      xs={24}
                      sm={24}
                      md={11}
                      lg={11}
                      xl={11}
                      xxl={11}
                      span={11}
                    >
                      <Space size="middle" style={{ marginRight: "15px" }}>
                        <Radio.Group
                          options={optionsOnOff}
                          onChange={onChangeOnOff}
                          value={optionOnOff}
                          optionType="button"
                          buttonStyle="solid"
                          disabled={showTutorial}
                        />
                        <Select
                          value={pageSize.toString()}
                          options={pageSizeOptions}
                          disabled={showTutorial}
                          onChange={(value) => {
                            onChangePageSize(value, "peerFilter");
                          }}
                          className="select-rows-per-page-en"
                        />
                      </Space>

                      <Select
                        mode="tags"
                        placeholder="Filter by groups"
                        tagRender={blueTagRender}
                        // dropdownRender={dropDownRender}
                        optionFilterProp="serchValue"
                        className="groupsSelect"
                        onChange={handleGroupChange}
                        value={groupsFilterArray}
                      >
                        {tagGroups.map((m, index) => (
                          <Option key={index} value={m.id} serchValue={m.name}>
                            {optionRender(m.name, m.id)}
                          </Option>
                        ))}
                      </Select>
                    </Col>
                    <Col xs={24} sm={24} md={5} lg={5} xl={5} xxl={5} span={5}>
                      <Row justify="end">
                        <Col>
                          {!showTutorial && (
                            <Button
                              type="primary"
                              onClick={() => setAddPeerModalOpen(true)}
                            >
                              Add peer
                            </Button>
                          )}
                        </Col>
                      </Row>
                    </Col>
                  </Row>
                  {failed && (
                    <Alert
                      message={failed.message}
                      description={failed.data ? failed.data.message : " "}
                      type="error"
                      showIcon
                      closable
                    />
                  )}
                  <Card bodyStyle={{ padding: 0 }}>
                    {showTutorial && !loading ? (
                      <Space
                        direction="vertical"
                        size="small"
                        align="center"
                        style={{
                          display: "flex",
                          padding: "45px 15px",
                          justifyContent: "center",
                        }}
                      >
                        <Title level={4} style={{ textAlign: "center" }}>
                          Get Started
                        </Title>
                        <Paragraph
                          style={{
                            textAlign: "center",
                            whiteSpace: "pre-line",
                          }}
                        >
                          It looks like you don't have any connected machines.{" "}
                          {"\n"}
                          Get started by adding one to your network.
                        </Paragraph>
                        <Button
                          size={"middle"}
                          type="primary"
                          onClick={() => setAddPeerModalOpen(true)}
                        >
                          Add new peer
                        </Button>
                      </Space>
                    ) : (
                      <Table
                        pagination={{
                          pageSize,
                          showSizeChanger: false,
                          showTotal: (total, range) =>
                            `Showing ${range[0]} to ${range[1]} of ${total} peers`,
                        }}
                        className={`access-control-table ${
                          showTutorial
                            ? "card-table card-table-no-placeholder"
                            : "card-table"
                        }`}
                        showSorterTooltip={false}
                        scroll={{ x: true }}
                        loading={tableSpin(loading)}
                        dataSource={dataTable}
                        style={{ minHeight: "300px" }}
                      >
                        <Column
                          title="Name"
                          dataIndex="name"
                          onFilter={(
                            value: string | number | boolean,
                            record
                          ) => (record as any).name.includes(value)}
                          defaultSortOrder="ascend"
                          align="left"
                          sorter={(a, b) =>
                            (a as any).name.localeCompare((b as any).name)
                          }
                          render={(text: string, record: PeerDataTable) => {
                            return renderName(record);
                          }}
                        />
                        <Column
                          title="Address"
                          dataIndex="ip"
                          sorter={(a, b) => {
                            const _a = (a as any).ip.split(".");
                            const _b = (b as any).ip.split(".");
                            const a_s = _a
                              .map((i: any) => i.padStart(3, "0"))
                              .join();
                            const b_s = _b
                              .map((i: any) => i.padStart(3, "0"))
                              .join();
                            return a_s.localeCompare(b_s);
                          }}
                          render={(
                            text: string,
                            record: PeerDataTable,
                            index: number
                          ) => {
                            return renderAddress(record);
                          }}
                        />
                        <Column
                          title="Groups"
                          dataIndex="groupsCount"
                          align="center"
                          render={(text, record: PeerDataTable, index) => {
                            return renderPopoverGroups(
                              text,
                              record.groups,
                              record
                            );
                          }}
                        />
                        <Column
                          title="SSH Server"
                          dataIndex="ssh_enabled"
                          align="center"
                          render={(e, record: PeerDataTable, index) => {
                            let isWindows = record.os
                              .toLocaleLowerCase()
                              .startsWith("windows");
                            let toggle = (
                              <Switch
                                size={"small"}
                                checked={e}
                                disabled={isWindows}
                                onClick={(checked: boolean) => {
                                  if (checked) {
                                    showConfirmEnableSSH(record);
                                  } else {
                                    handleSwitchSSH(record, checked);
                                  }
                                }}
                              />
                            );

                            if (isWindows) {
                              return (
                                <Tooltip title="SSH server feature is not yet supported on Windows">
                                  {toggle}
                                </Tooltip>
                              );
                            } else {
                              return toggle;
                            }
                          }}
                        />

                        <Column
                          title="LastSeen"
                          dataIndex="last_seen"
                          render={(text, record, index) => {
                            let dt = new Date(text);
                            return (
                              <Popover content={dt.toLocaleString()}>
                                {(record as PeerDataTable).connected
                                  ? "just now"
                                  : timeAgo(text)}
                              </Popover>
                            );
                          }}
                        />
                        <Column
                          title="OS"
                          dataIndex="os"
                          render={(text, record, index) => {
                            return formatOS(text);
                          }}
                        />
                        <Column
                          title="Version"
                          dataIndex="version"
                          render={(text, record, index) => {
                            if (text === "development") {
                              return "dev";
                            }
                            return text;
                          }}
                        />
                        <Column
                          title=""
                          align="center"
                          render={(text, record, index) => {
                            return (
                              <Button
                                type="text"
                                style={{
                                  color: "rgba(210, 64, 64, 0.85)",
                                }}
                                onClick={() =>
                                  showConfirmDelete(record as PeerDataTable)
                                }
                              >
                                Delete
                              </Button>
                            );
                          }}
                        />
                      </Table>
                    )}
                  </Card>
                </Space>
              </Col>
            </Row>
          </Container>
          <Modal
            open={addPeerModalOpen}
            onOk={() => setAddPeerModalOpen(false)}
            onCancel={() => {
              setAddPeerModalOpen(false);
              setHadFirstRun(true);
            }}
            footer={[]}
            width={780}
          >
            <AddPeerPopup
              greeting={!hadFirstRun ? "Hi there!" : ""}
              headline={
                !hadFirstRun
                  ? "It's time to add your first device."
                  : "Add new peer"
              }
            />
          </Modal>
          {confirmModalContextHolder}
        </>
      )}
      {peer && !showGroupModal && <PeerUpdate />}
      {showGroupModal && (
        <UpdatePeerGroupModal setShowGroupModal={setShowGroupModal} />
      )}
    </>
  );
};

export default Peers;
