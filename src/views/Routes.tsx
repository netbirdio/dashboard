import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Menu,
  message,
  Modal,
  List,
  Spin,
  Popover,
  Radio,
  RadioChangeEvent,
  Row,
  Space,
  Switch,
  Table,
  Tag,
  Collapse,
  Typography,
  Badge,
} from "antd";
import { Container } from "../components/Container";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "typesafe-actions";
import { Route, RouteToSave } from "../store/route/types";
import { actions as routeActions } from "../store/route";
import { actions as peerActions } from "../store/peer";
import { filter, sortBy } from "lodash";
import { EllipsisOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import RouteAddNew from "../components/RouteAddNew";
import {
  GroupedDataTable,
  initPeerMaps,
  masqueradeDisabledMSG,
  masqueradeEnabledMSG,
  peerToPeerIP,
  RouteDataTable,
  transformDataTable,
  transformGroupedDataTable,
} from "../utils/routes";
import { useGetTokenSilently } from "../utils/token";
import { Group } from "../store/group/types";
import { TooltipPlacement } from "antd/es/tooltip";
import { actions as groupActions } from "../store/group";
import { useGetGroupTagHelpers } from "../utils/groups";
import RouteUpdate from "../components/RouteUpdate";
import RoutePeerUpdate from "../components/RoutePeerUpdate";

const { Title, Paragraph, Text } = Typography;
const { Column } = Table;
const { confirm } = Modal;
const { Panel } = Collapse;

export const Routes = () => {
  const { getTokenSilently } = useGetTokenSilently();
  const dispatch = useDispatch();
  const { getGroupNamesFromIDs } = useGetGroupTagHelpers();

  const groups = useSelector((state: RootState) => state.group.data);
  const routes = useSelector((state: RootState) => state.route.data);
  const failed = useSelector((state: RootState) => state.route.failed);
  const loading = useSelector((state: RootState) => state.route.loading);
  const deletedRoute = useSelector(
    (state: RootState) => state.route.deletedRoute
  );
  const setEditRoutePeerVisible = useSelector(
    (state: RootState) => state.route.setEditRoutePeerVisible
  );
  const savedRoute = useSelector((state: RootState) => state.route.savedRoute);
  const peers = useSelector((state: RootState) => state.peer.data);
  const loadingPeer = useSelector((state: RootState) => state.peer.loading);
  const setupNewRouteVisible = useSelector(
    (state: RootState) => state.route.setupNewRouteVisible
  );
  const [showTutorial, setShowTutorial] = useState(true);
  const [textToSearch, setTextToSearch] = useState("");
  const [optionAllEnable, setOptionAllEnable] = useState("enabled");
  const [dataTable, setDataTable] = useState([] as RouteDataTable[]);
  const [routeToAction, setRouteToAction] = useState(
    null as RouteDataTable | null
  );
  const [groupedDataTable, setGroupedDataTable] = useState(
    [] as GroupedDataTable[]
  );
  const [expandRowsOnClick, setExpandRowsOnClick] = useState(true);
  const [groupPopupVisible, setGroupPopupVisible] = useState("");

  const [peerNameToIP, peerIPToName] = initPeerMaps(peers);
  const optionsAllEnabled = [
    { label: "Enabled", value: "enabled" },
    { label: "All", value: "all" },
  ];

  const itemsMenuAction = [
    {
      key: "view",
      label: (
        <Button type="text" block onClick={() => onClickViewRoute("test")}>
          View
        </Button>
      ),
    },
    {
      key: "delete",
      label: (
        <Button type="text" block onClick={() => showConfirmDelete("test")}>
          Delete
        </Button>
      ),
    },
  ];
  const actionsMenu = <Menu items={itemsMenuAction}></Menu>;

  const isShowTutorial = (routes: Route[]): boolean => {
    return (
      !routes.length || (routes.length === 1 && routes[0].network === "Default")
    );
  };

  useEffect(() => {
    return () => {
      dispatch(routeActions.setSetupEditRoutePeerVisible(false));
    };
  }, []);

  useEffect(() => {
    dispatch(
      routeActions.getRoutes.request({
        getAccessTokenSilently: getTokenSilently,
        payload: null,
      })
    );
  }, [peers]);

  useEffect(() => {
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
  }, []);

  const filterGroupedDataTable = (
    routes: GroupedDataTable[]
  ): GroupedDataTable[] => {
    const t = textToSearch.toLowerCase().trim();
    let f: GroupedDataTable[] = filter(
      routes,
      (f) =>
        f.network_id.toLowerCase().includes(t) ||
        f.network.toLowerCase().includes(t) ||
        f.description.toLowerCase().includes(t) ||
        t === "" ||
        getGroupNamesFromIDs(f.routesGroups).find((u) =>
          u.toLowerCase().trim().includes(t)
        )
    ) as GroupedDataTable[];
    if (optionAllEnable !== "all") {
      f = filter(f, (f) => f.enabled);
    }

    f.sort(function (a, b) {
      if (a.network_id < b.network_id) {
        return -1;
      }
      if (a.network_id > b.network_id) {
        return 1;
      }
      return 0;
    });

    f.forEach((item) => {
      item.groupedRoutes.sort(function (a, b) {
        if (a.peer_name < b.peer_name) {
          return -1;
        }
        if (a.peer_name > b.peer_name) {
          return 1;
        }
        return 0;
      });
    });

    return f;
  };

  useEffect(() => {
    setGroupedDataTable(
      filterGroupedDataTable(transformGroupedDataTable(routes, peers))
    );
  }, [dataTable]);

  useEffect(() => {
    if (failed) {
      setShowTutorial(false);
    } else {
      setShowTutorial(isShowTutorial(routes));
      setDataTable(sortBy(transformDataTable(routes, peers), "network_id"));
    }
  }, [routes]);

  useEffect(() => {
    setGroupedDataTable(
      filterGroupedDataTable(transformGroupedDataTable(routes, peers))
    );
  }, [textToSearch, optionAllEnable]);

  const deleteKey = "deleting";
  useEffect(() => {
    const style = { marginTop: 85 };
    if (deletedRoute.loading) {
      message.loading({
        content: "Deleting...",
        duration: 0,
        key: deleteKey,
        style,
      });
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
          "Failed to delete route. You might not have enough permissions.",
        key: deleteKey,
        duration: 2,
        style,
      });
      dispatch(routeActions.resetDeletedRoute(null));
    }
  }, [deletedRoute]);

  const onChangeTextToSearch = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setTextToSearch(e.target.value);
  };

  const searchDataTable = () => {
    setGroupedDataTable(
      filterGroupedDataTable(transformGroupedDataTable(routes, peers))
    );
  };

  const onChangeAllEnabled = ({ target: { value } }: RadioChangeEvent) => {
    setOptionAllEnable(value);
  };

  const showConfirmDelete = (selectedRoute: any) => {
    setRouteToAction(selectedRoute as RouteDataTable);
    let name = selectedRoute ? selectedRoute.network_id : "";
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
            payload: selectedRoute?.id || "",
          })
        );
      },
      onCancel() {
        setRouteToAction(null);
      },
    });
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

  const onClickViewRoute = (selectedRoute: any) => {
    setRouteToAction(selectedRoute as RouteDataTable);
    dispatch(routeActions.setSetupNewRouteHA(false));
    dispatch(
      routeActions.setRoute({
        id: selectedRoute?.id || null,
        network: selectedRoute?.network,
        network_id: selectedRoute?.network_id,
        description: selectedRoute?.description,
        peer: peerToPeerIP(selectedRoute!.peer_name, selectedRoute!.peer_ip),
        metric: selectedRoute?.metric,
        masquerade: selectedRoute?.masquerade,
        enabled: selectedRoute?.enabled,
        groups: selectedRoute?.groups,
      } as Route)
    );
    dispatch(routeActions.setSetupEditRoutePeerVisible(true));
  };

  const setRouteAndView = (route: RouteDataTable, event: any) => {
    event.preventDefault();
    event.stopPropagation();
    if (!route.id) {
      dispatch(routeActions.setSetupNewRouteHA(true));
    }
    dispatch(
      routeActions.setRoute({
        id: route.id || null,
        network: route.network,
        network_id: route.network_id,
        description: route.description,
        peer: route.peer ? peerToPeerIP(route.peer_name, route.peer_ip) : "",
        metric: route.metric ? route.metric : 9999,
        masquerade: route.masquerade,
        enabled: route.enabled,
        groups: route.groups,
      } as Route)
    );
    dispatch(routeActions.setSetupEditRouteVisible(true));
  };

  const onPopoverVisibleChange = (b: boolean, key: string) => {
    if (setupNewRouteVisible) {
      setGroupPopupVisible("");
    } else {
      if (b) {
        setGroupPopupVisible(key);
      } else {
        setGroupPopupVisible("");
      }
    }
  };

  const renderPopoverGroups = (
    rowGroups: string[] | null,
    userToAction: RouteDataTable
  ) => {
    let groupsMap = new Map<string, Group>();
    groups.forEach((g) => {
      groupsMap.set(g.id!, g);
    });

    let displayGroups: Group[] = [];
    if (rowGroups) {
      displayGroups = rowGroups
        .filter((g) => groupsMap.get(g))
        .map((g) => groupsMap.get(g)!);
    }

    let btn = (
      <Button
        type="link"
        onClick={(event) => setRouteAndView(userToAction, event)}
        style={{ padding: "0 3px" }}
      >
        +{displayGroups.length - 1}
      </Button>
    );

    if (!displayGroups || displayGroups!.length < 1) {
      return btn;
    }

    const content = displayGroups?.map((g, i) => {
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
    const updateContent =
      displayGroups && displayGroups.length > 1
        ? content && content?.slice(1)
        : content;
    const mainContent = <Space direction="vertical">{updateContent}</Space>;
    let popoverPlacement = "top";
    if (content && content.length > 5) {
      popoverPlacement = "rightTop";
    }

    return (
      <>
        {displayGroups.length === 1 ? (
          <>{displayGroups[0].name}</>
        ) : (
          <Popover
            placement={popoverPlacement as TooltipPlacement}
            key={userToAction.id}
            onOpenChange={(b: boolean) =>
              onPopoverVisibleChange(b, userToAction.key)
            }
            open={groupPopupVisible === userToAction.key}
            content={mainContent}
            title={null}
          >
            {displayGroups[0].name} {btn}
          </Popover>
        )}
      </>
    );
  };

  const callback = (key: any) => {};

  const getAccordianHeader = (record: any) => {
    return (
      <div className="headerInner">
        <p className="font-500">
          {record.network_id}
          <Badge
            size={"small"}
            style={{ marginLeft: "5px" }}
            color={record.enabled ? "green" : "rgb(211,211,211)"}
          ></Badge>
        </p>
        <p>{record.network}</p>
        <p>
          {record.routesCount > 1 ? (
            <>
              <Tag color="green">on</Tag>
              <Button
                type="link"
                style={{ padding: "0" }}
                onClick={(event) => setRouteAndView(record, event)}
              >
                Add Routing Peer
              </Button>
            </>
          ) : (
            <>
              <Tag color="default">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  off
                </Text>
              </Tag>
              <Button
                type="link"
                style={{ padding: "0" }}
                onClick={(event) => setRouteAndView(record, event)}
              >
                Configure
              </Button>
            </>
          )}
        </p>
        <p className="text-right">
          <Button
            type="text"
            style={{
              color: "rgba(210, 64, 64, 0.85)",
            }}
            onClick={(event) => showConfirmationDeleteAllRoutes(record, event)}
          >
            Delete
          </Button>
        </p>
      </div>
    );
  };

  const showConfirmationDeleteAllRoutes = (selectedGroup: any, event: any) => {
    event.preventDefault();
    event.stopPropagation();
    let name = selectedGroup ? selectedGroup.network_id : "";
    confirm({
      icon: <ExclamationCircleOutlined />,
      title: <span className="font-500">Delete routes to network {name}</span>,
      width: 600,
      content: (
        <Space direction="vertical" size="small">
          <Paragraph>
            This operation will delete all routes to the network {name}. Are you
            sure?
          </Paragraph>
          <Alert
            message={
              <>
                <List
                  dataSource={selectedGroup.groupedRoutes}
                  renderItem={(item: any) => (
                    <List.Item>
                      <Text strong>- {item.peer_name}</Text>
                    </List.Item>
                  )}
                  bordered={false}
                  split={false}
                  itemLayout={"vertical"}
                />
              </>
            }
            type="warning"
            showIcon={false}
            closable={false}
          />
        </Space>
      ),
      okType: "danger",
      onOk() {
        dispatch(
          routeActions.deleteRoute.request({
            getAccessTokenSilently: getTokenSilently,
            payload:
              selectedGroup.groupedRoutes.map((element: any) => {
                return element?.id;
              }) || "",
          })
        );
      },
      onCancel() {},
    });
  };

  const changeRouteStatus = (record: any, checked: boolean) => {
    const updateReponse = { ...record, enabled: checked };
    dispatch(
      routeActions.saveRoute.request({
        getAccessTokenSilently: getTokenSilently,
        payload: updateReponse,
      })
    );
  };

  return (
    <>
      {!setEditRoutePeerVisible ? (
        <>
          <Container className="container-main">
            <Row>
              <Col span={24} style={{ marginBottom: "20px" }}>
                <Title className="page-heading">Network Routes</Title>

                {routes.length ? (
                  <Paragraph style={{ marginTop: "5px" }}>
                    Network routes allow you to access other networks like LANs
                    and VPCs without installing NetBird on every resource.
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href="https://docs.netbird.io/how-to/routing-traffic-to-private-networks"
                    >
                      {" "}
                      Learn more
                    </a>
                  </Paragraph>
                ) : (
                  <Paragraph style={{ marginTop: "5px" }} type={"secondary"}>
                    Network routes allow you to access other networks like LANs
                    and VPCs without installing NetBird on every resource.
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href="https://docs.netbird.io/how-to/routing-traffic-to-private-networks"
                    >
                      {" "}
                      Learn more
                    </a>
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
                        onPressEnter={searchDataTable}
                        placeholder="Search by network, range or name..."
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
                      <Space size="middle">
                        <Radio.Group
                          options={optionsAllEnabled}
                          onChange={onChangeAllEnabled}
                          value={optionAllEnable}
                          optionType="button"
                          buttonStyle="solid"
                          disabled={showTutorial}
                        />
                      </Space>
                    </Col>
                    {!showTutorial && (
                      <Col
                        xs={24}
                        sm={24}
                        md={5}
                        lg={5}
                        xl={5}
                        xxl={5}
                        span={5}
                      >
                        <Row justify="end">
                          <Col>
                            <Button
                              type="primary"
                              disabled={savedRoute.loading}
                              onClick={onClickAddNewRoute}
                            >
                              Add route
                            </Button>
                          </Col>
                        </Row>
                      </Col>
                    )}
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
                  {/* <Card bodyStyle={{ padding: 0 }}>
                {!showTutorial && (
                  <Table
                    pagination={{
                      current: currentPage,
                      hideOnSinglePage: showTutorial,
                      disabled: showTutorial,
                      pageSize,
                      responsive: true,
                      showSizeChanger: false,
                      showTotal: (total, range) =>
                        `Showing ${range[0]} to ${range[1]} of ${total} routes`,
                      onChange: (page) => {
                        setCurrentPage(page);
                      },
                    }}
                    className={`access-control-table ${
                      showTutorial
                        ? "card-table card-table-no-placeholder"
                        : "card-table"
                    }`}
                    showSorterTooltip={false}
                    scroll={{ x: true }}
                    loading={tableSpin(loading || loadingPeer)}
                    dataSource={groupedDataTable}
                    expandable={{
                      expandedRowRender,
                      expandRowByClick: expandRowsOnClick,
                      onExpandedRowsChange: (r) => {
                        setExpandRowsOnClick(!r.length);
                      },
                    }}
                  >
                    <Column
                      title={() => (
                        <span>
                          Network Identifier
                          <Tooltip title="You can enable high-availability by assigning the same network identifier and network CIDR to multiple routes">
                            <QuestionCircleOutlined
                              style={{ marginLeft: "0.25em", color: "gray" }}
                            />
                          </Tooltip>
                        </span>
                      )}
                      dataIndex="network_id"
                      onFilter={(value: string | number | boolean, record) =>
                        (record as any).name.includes(value)
                      }
                      defaultSortOrder="ascend"
                      align="center"
                      sorter={(a, b) =>
                        (a as any).network_id.localeCompare(
                          (b as any).network_id
                        )
                      }
                      render={(text, record) => {
                        const desc = (
                          record as RouteDataTable
                        ).description.trim();
                        return (
                          <Tooltip
                            title={desc !== "" ? desc : "no description"}
                            arrowPointAtCenter
                          >
                            <Text className="font-500">{text}</Text>
                          </Tooltip>
                        );
                      }}
                    />
                    <Column
                      title="Network Range"
                      dataIndex="network"
                      align="center"
                      onFilter={(value: string | number | boolean, record) =>
                        (record as any).network.includes(value)
                      }
                      sorter={(a, b) =>
                        (a as any).network.localeCompare((b as any).network)
                      }
                      // defaultSortOrder='ascend'
                    />
                    <Column
                      title="Route status"
                      dataIndex="enabled"
                      align="center"
                      render={(text: Boolean) => {
                        return text ? (
                          <Tag color="green">enabled</Tag>
                        ) : (
                          <Tag color="red">disabled</Tag>
                        );
                      }}
                    />
                    <Column
                      title="Masquerade Traffic"
                      dataIndex="masquerade"
                      align="center"
                      render={(e, record: GroupedDataTable) => {
                        let toggle = (
                          <Switch
                            size={"small"}
                            checked={e}
                            onClick={(checked: boolean) => {
                              showConfirmEnableMasquerade(record, checked);
                            }}
                          />
                        );
                        return (
                          <Tooltip title="Hides the traffic with the routing peer address">
                            {toggle}
                          </Tooltip>
                        );
                      }}
                    />
                    <Column
                      title="High Availability"
                      align="center"
                      dataIndex="routesCount"
                      render={(count, record: RouteDataTable) => {
                        let tag = <Tag color="red">off</Tag>;
                        if (count > 1) {
                          tag = <Tag color="green">on</Tag>;
                        }
                        return (
                          <div>
                            {tag}
                            <Divider type="vertical" />
                            <Button
                              type="link"
                              onClick={(event) =>
                                setRouteAndView(record, event)
                              }
                            >
                              Configure
                            </Button>
                          </div>
                        );
                      }}
                    />
                  </Table>
                )}
                
              </Card> */}
                </Space>
              </Col>
            </Row>

            {loading || loadingPeer ? (
              <div className="container-spinner">
                <Spin size={"large"} />
              </div>
            ) : showTutorial ? (
              <Card bodyStyle={{ padding: 0 }}>
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
                    Create New Route
                  </Title>
                  <Paragraph
                    style={{
                      textAlign: "center",
                      whiteSpace: "pre-line",
                    }}
                  >
                    It looks like you don't have any routes. {"\n"}
                    Access LANs and VPC by adding a network route.
                    <a
                      target="_blank"
                      rel="noreferrer"
                      href="https://docs.netbird.io/how-to/routing-traffic-to-private-networks"
                    >
                      {" "}
                      Learn more
                    </a>
                  </Paragraph>
                  <Button
                    size={"middle"}
                    type="primary"
                    onClick={() => onClickAddNewRoute()}
                  >
                    Add route
                  </Button>
                </Space>
              </Card>
            ) : (
              <div className="routes-accordian">
                <Collapse onChange={callback}>
                  <div className="accordian-header">
                    <p>Network Identifier</p>
                    <p>Network Range</p>
                    <p>High Availability</p>
                  </div>

                  {groupedDataTable &&
                    groupedDataTable.length &&
                    groupedDataTable.map((record, index) => {
                      return (
                        <Panel header={getAccordianHeader(record)} key={index}>
                          <div className="accordian-inner-header">
                            <p>Routing Peer</p>
                            <p>Metric</p>
                            <p>Enabled</p>
                            <p>Groups</p>
                          </div>
                          {record.groupedRoutes &&
                            record.groupedRoutes.length &&
                            record.groupedRoutes.map((route, index2) => {
                              return (
                                <div
                                  className="accordian-inner-listing"
                                  key={index2}
                                >
                                  <p>
                                    <span
                                      className="cursor-pointer"
                                      onClick={() => {
                                        onClickViewRoute(route);
                                      }}
                                    >
                                      {route.peer_name}
                                    </span>
                                    <Badge
                                      size={"small"}
                                      style={{ marginLeft: "5px" }}
                                      color={
                                        route.enabled
                                          ? "green"
                                          : "rgb(211,211,211)"
                                      }
                                    ></Badge>
                                  </p>
                                  <p>{route.metric}</p>
                                  <p>
                                    <Switch
                                      size={"small"}
                                      defaultChecked={route.enabled}
                                      onClick={(checked: boolean) => {
                                        changeRouteStatus(route, checked);
                                      }}
                                    />
                                  </p>
                                  <p>
                                    {renderPopoverGroups(route.groups, route)}
                                  </p>
                                  <p>
                                    <Button
                                      type="text"
                                      style={{
                                        color: "rgba(210, 64, 64, 0.85)",
                                      }}
                                      onClick={() =>
                                        showConfirmDelete(
                                          route as RouteDataTable
                                        )
                                      }
                                    >
                                      Delete
                                    </Button>
                                  </p>
                                </div>
                              );
                            })}
                        </Panel>
                      );
                    })}
                </Collapse>
              </div>
            )}
          </Container>
          <RouteAddNew />
          <RouteUpdate />
        </>
      ) : (
        <RoutePeerUpdate />
      )}
    </>
  );
};

export default Routes;
