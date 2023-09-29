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
  Tooltip,
} from "antd";
import { Container } from "../components/Container";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "typesafe-actions";
import { Route, RouteToSave } from "../store/route/types";
import { actions as routeActions } from "../store/route";
import { actions as peerActions } from "../store/peer";
import { filter, sortBy, uniqBy } from "lodash";
import { EllipsisOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { storeFilterState, getFilterState } from "../utils/filterState";
import RouteAddNew from "../components/RouteAddNew";
import { Link } from "react-router-dom";
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
  const [isUpdating, setIsUpdating] = useState(false);

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
  const setupEditRouteVisible = useSelector(
    (state: RootState) => state.route.setupEditRouteVisible
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
    if (!loading && dataTable) {
      const quickFilter = getFilterState("routesFilter", "quickFilter");
      if (quickFilter) setOptionAllEnable(quickFilter);

      const searchText = getFilterState("routesFilter", "search");
      if (searchText) setTextToSearch(searchText);

      if (quickFilter || searchText) {
        setGroupedDataTable(
          filterGroupedDataTable(
            transformGroupedDataTable(routes, peers),
            searchText
          )
        );
      } else {
        setGroupedDataTable(
          filterGroupedDataTable(transformGroupedDataTable(routes, peers), "")
        );
      }
    }
  }, [loading, dataTable]);

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
    routes: GroupedDataTable[],
    searchText: string
  ): GroupedDataTable[] => {
    const t = searchText
      ? searchText.toLowerCase().trim()
      : textToSearch.toLowerCase().trim();
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

  // useEffect(() => {
  //   setGroupedDataTable(
  //     filterGroupedDataTable(transformGroupedDataTable(routes, peers))
  //   );
  // }, [dataTable]);

  useEffect(() => {
    setGroupedDataTable(
      filterGroupedDataTable(transformGroupedDataTable(routes, peers), "")
    );
  }, [textToSearch, optionAllEnable]);

  useEffect(() => {
    if (failed) {
      setShowTutorial(false);
    } else {
      setShowTutorial(isShowTutorial(routes));
      setDataTable(sortBy(transformDataTable(routes, peers), "network_id"));
    }
  }, [routes]);

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

  const styleNotification = { marginTop: 85 };

  const saveKey = isUpdating ? "Updating" : "Saving";
  useEffect(() => {
    if (savedRoute.loading) {
      message.loading({
        content: isUpdating ? "Updating..." : "Saving...",
        key: saveKey,
        duration: 0,
        style: styleNotification,
      });
    } else if (savedRoute.success) {
      message.success({
        content: `Route has been successfully ${
          isUpdating ? "updated" : "added"
        }`,
        key: saveKey,
        duration: 2,
        style: styleNotification,
      });
      dispatch(routeActions.setSetupNewRouteVisible(false));
      dispatch(routeActions.setSetupEditRouteVisible(false));
      dispatch(routeActions.setSetupEditRoutePeerVisible(false));
      dispatch(routeActions.setSavedRoute({ ...savedRoute, success: false }));
      dispatch(routeActions.resetSavedRoute(null));
      setIsUpdating(false);
    } else if (savedRoute.error) {
      let errorMsg = `Failed to ${
        isUpdating ? "update" : "added"
      } network route`;
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
      setIsUpdating(false);
    }
  }, [savedRoute]);

  const onChangeTextToSearch = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setTextToSearch(e.target.value);
    storeFilterState("routesFilter", "search", e.target.value);
  };

  // const searchDataTable = () => {
  //   setGroupedDataTable(
  //     filterGroupedDataTable(transformGroupedDataTable(routes, peers))
  //   );
  // };

  const onChangeAllEnabled = ({ target: { value } }: RadioChangeEvent) => {
    setOptionAllEnable(value);
    storeFilterState("routesFilter", "quickFilter", value);
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
        peer_groups: [],
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
        peer_groups: selectedRoute?.peer_groups,
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
        groups: route.peer_groups
          ? route && route?.groupedRoutes && route?.groupedRoutes[0].groups
          : route.groups,
        peer_groups: route.peer_groups,
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

  const renderGroupRouting = (rowGroups: string[] | null) => {
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

    return (
      displayGroups &&
      displayGroups.length > 0 &&
      displayGroups.map((group) => {
        return (
          <div className="g-r-wrapper">
            <span className="f-r-name">
              <Tag color={"blue"} style={{ marginRight: 3 }}>
                {group.name}
              </Tag>
            </span>{" "}
            <span className="f-r-count">
              <Tag color={""} style={{ marginRight: 3 }}>
                {group.peers_count} peers
              </Tag>
            </span>
          </div>
        );
      })
    );
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
    if (userToAction.peer_groups) {
      const groupedRoutes = [
        {
          groups: userToAction.groups,
        },
      ];
      userToAction = { ...userToAction, groupedRoutes: groupedRoutes };
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
  const availabilityTooltip = () => {
    return (
      <>
        <div className="availtooltip">
          <div className="avail-inner">
            <ExclamationCircleOutlined />
            <p style={{ color: "#000" }}>
              To achieve High Availability you need to add more peers into this
              group, you can do it in the Peers menu.
            </p>
          </div>

          <Link to="/peers">Go to Peers</Link>
        </div>
      </>
    );
  };

  const getAccordianHeader = (record: any) => {
    const selectedPeersOfGroups: any = [];
    if (record.peer_groups) {
      peers.forEach((peer) => {
        peer.groups?.forEach((pg) => {
          if (record.peer_groups.includes(pg.id)) {
            selectedPeersOfGroups.push(peer);
          }
        });
      });
    }
    const getUniquePeerGroups = uniqBy(selectedPeersOfGroups, "id");
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
          {record.peer_groups ? (
            getUniquePeerGroups.length > 1 ? (
              <>
                <Tag color="green">on</Tag>{" "}
                <Button
                  type="link"
                  style={{ padding: "0" }}
                  onClick={(event) => setRouteAndView(record, event)}
                >
                  Configure
                </Button>
              </>
            ) : (
              <Tooltip color="#fff" title={availabilityTooltip}>
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
              </Tooltip>
            )
          ) : record.routesCount > 1 ? (
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

          {}
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

    let groupsMap = new Map<string, Group>();
    groups.forEach((g) => {
      groupsMap.set(g.id!, g);
    });

    let displayGroups: Group[] = [];
    if (selectedGroup.peer_groups) {
      displayGroups = selectedGroup.peer_groups
        .filter((g: any) => groupsMap.get(g))
        .map((g: any) => groupsMap.get(g)!);
    }

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
              selectedGroup.peer_groups ? (
                <List
                  dataSource={displayGroups}
                  renderItem={(item: any) => (
                    <List.Item>
                      <Text strong>- {item.name}</Text>
                    </List.Item>
                  )}
                  bordered={false}
                  split={false}
                  itemLayout={"vertical"}
                />
              ) : (
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
              )
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
    setIsUpdating(true);
    if (record.peer_groups) {
      delete record.peer;
    }
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
                        // onPressEnter={searchDataTable}
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
                            <p>
                              {record.groupedRoutes[0].peer_groups &&
                              record.groupedRoutes[0].peer_groups.length > 0
                                ? "Routing Group"
                                : "Routing Peer"}
                            </p>
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
                                    {route.peer_groups &&
                                    route.peer_groups.length > 0 ? (
                                      <span
                                        className="cursor-pointer"
                                        onClick={() => {
                                          onClickViewRoute(route);
                                        }}
                                      >
                                        {renderGroupRouting(route.peer_groups)}
                                      </span>
                                    ) : (
                                      <>
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
                                      </>
                                    )}
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
          {setupNewRouteVisible && <RouteAddNew />}

          {setupEditRouteVisible && <RouteUpdate />}
        </>
      ) : (
        <RoutePeerUpdate />
      )}
    </>
  );
};

export default Routes;
