import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "typesafe-actions";
import { actions as nsGroupActions } from "../store/nameservers";
import { Container } from "../components/Container";
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Switch,
  message,
  Modal,
  Popover,
  Radio,
  RadioChangeEvent,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { filter } from "lodash";
import tableSpin from "../components/Spin";
import { useGetTokenSilently } from "../utils/token";
import { actions as groupActions } from "../store/group";
import { Group } from "../store/group/types";
import { TooltipPlacement } from "antd/es/tooltip";
import { NameServer, NameServerGroup } from "../store/nameservers/types";
import NameServerGroupUpdate from "../components/NameServerGroupUpdate";
import { EllipsisOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { useGetGroupTagHelpers } from "../utils/groups";
import { usePageSizeHelpers } from "../utils/pageSize";

const { Title, Paragraph } = Typography;
const { Column } = Table;
const { confirm } = Modal;

interface NameserverGroupDataTable extends NameServerGroup {
  key: string;
}

const styleNotification = { marginTop: 85 };

export const Nameservers = () => {
  const { onChangePageSize, pageSizeOptions, pageSize } = usePageSizeHelpers();
  const { getTokenSilently } = useGetTokenSilently();
  const dispatch = useDispatch();

  const { getGroupNamesFromIDs } = useGetGroupTagHelpers();

  const groups = useSelector((state: RootState) => state.group.data);
  const nsGroup = useSelector((state: RootState) => state.nameserverGroup.data);
  const failed = useSelector(
    (state: RootState) => state.nameserverGroup.failed
  );
  const loading = useSelector(
    (state: RootState) => state.nameserverGroup.loading
  );
  const addNewNameServerGroupVisible = useSelector(
    (state: RootState) => state.nameserverGroup.setupNewNameServerGroupVisible
  );
  const savedNSGroup = useSelector(
    (state: RootState) => state.nameserverGroup.savedNameServerGroup
  );

  const deleteNSGroup = useSelector(
    (state: RootState) => state.nameserverGroup.deletedNameServerGroup
  );

  const [groupPopupVisible, setGroupPopupVisible] = useState("");
  const [nsGroupToAction, setNsGroupToAction] = useState(
    null as NameserverGroupDataTable | null
  );

  const [textToSearch, setTextToSearch] = useState("");
  const [optionAllEnable, setOptionAllEnable] = useState("all");
  const [dataTable, setDataTable] = useState([] as NameserverGroupDataTable[]);
  const [showTutorial, setShowTutorial] = useState(false);

  const optionsAllEnabled = [
    { label: "All", value: "all" },
    { label: "Enabled", value: "enabled" },
  ];

  // setUserAndView makes the UserUpdate drawer visible (right side) and sets the user object
  const setUserAndView = (nsGroup: NameServerGroup) => {
    dispatch(nsGroupActions.setSetupEditNameServerGroupVisible(true));
    dispatch(
      nsGroupActions.setNameServerGroup({
        id: nsGroup.id,
        name: nsGroup.name,
        primary: nsGroup.primary,
        domains: nsGroup.domains,
        description: nsGroup.description,
        nameservers: nsGroup.nameservers,
        groups: nsGroup.groups,
        enabled: nsGroup.enabled,
      } as NameServerGroup)
    );
  };

  const transformDataTable = (
    d: NameServerGroup[]
  ): NameserverGroupDataTable[] => {
    return d.map((p) => ({ key: p.id, ...p } as NameserverGroupDataTable));
  };

  useEffect(() => {
    dispatch(
      nsGroupActions.getNameServerGroups.request({
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

  useEffect(() => {
    if (nsGroup.length > 0) {
      setShowTutorial(false);
    } else {
      setShowTutorial(true);
    }
    setDataTable(transformDataTable(filterDataTable()));
  }, [nsGroup]);

  useEffect(() => {
    setDataTable(transformDataTable(filterDataTable()));
  }, [textToSearch, optionAllEnable]);

  const filterDataTable = (): NameServerGroup[] => {
    const t = textToSearch.toLowerCase().trim();
    let f = filter(
      nsGroup,
      (f: NameServerGroup) =>
        f.name.toLowerCase().includes(t) ||
        f.name.includes(t) ||
        t === "" ||
        getGroupNamesFromIDs(f.groups).find((u) =>
          u.toLowerCase().trim().includes(t)
        ) ||
        f.domains.find((d) => d.toLowerCase().trim().includes(t)) ||
        f.nameservers.find((n) => n.ip.includes(t))
    ) as NameServerGroup[];
    if (optionAllEnable !== "all") {
      f = filter(f, (f) => f.enabled);
    }
    return f;
  };

  const onChangeAllEnabled = ({ target: { value } }: RadioChangeEvent) => {
    setOptionAllEnable(value);
  };

  const onChangeTextToSearch = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setTextToSearch(e.target.value);
  };

  const searchDataTable = () => {
    setDataTable(transformDataTable(filterDataTable()));
  };

  const onClickEdit = () => {
    dispatch(nsGroupActions.setSetupEditNameServerGroupVisible(true));
    dispatch(
      nsGroupActions.setNameServerGroup({
        id: nsGroupToAction?.id,
        name: nsGroupToAction?.name,
        primary: nsGroupToAction?.primary,
        domains: nsGroupToAction?.domains,
        description: nsGroupToAction?.description,
        groups: nsGroupToAction?.groups,
        enabled: nsGroupToAction?.enabled,
        nameservers: nsGroupToAction?.nameservers,
      } as NameServerGroup)
    );
  };

  const showConfirmDelete = (record: NameserverGroupDataTable) => {
    setNsGroupToAction(record as NameserverGroupDataTable);
    let name = record ? record.name : "";
    confirm({
      icon: <ExclamationCircleOutlined />,
      title: 'Delete Nameserver group "' + name + '"',
      width: 600,
      content: (
        <Space direction="vertical" size="small">
          <Paragraph>
            Are you sure you want to delete this nameserver group from your
            account?
          </Paragraph>
        </Space>
      ),
      okType: "danger",
      onOk() {
        dispatch(
          nsGroupActions.deleteNameServerGroup.request({
            getAccessTokenSilently: getTokenSilently,
            payload: record?.id || "",
          })
        );
      },
      onCancel() {
        setNsGroupToAction(null);
      },
    });
  };

  const renderPopoverGroups = (
    label: string,
    rowGroups: string[] | null,
    userToAction: NameserverGroupDataTable
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
        onClick={() => setUserAndView(userToAction)}
        style={{ padding: "0" }}
      >
        +{displayGroups && displayGroups.length - 1}
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
    return displayGroups && displayGroups.length === 1 ? (
      <> {displayGroups && displayGroups.length && displayGroups[0].name}</>
    ) : (
      <Popover
        placement={popoverPlacement as TooltipPlacement}
        key={userToAction.id}
        onOpenChange={(b: boolean) =>
          onPopoverVisibleChange(b, userToAction.key + "group")
        }
        open={groupPopupVisible === userToAction.key + "group"}
        content={mainContent}
        title={null}
      >
        <span className="d-flex">
          {displayGroups && displayGroups.length && displayGroups[0].name} {btn}
        </span>
      </Popover>
    );
  };

  const renderPopoverDomains = (
    _: string,
    inputDomains: string[] | null,
    userToAction: NameserverGroupDataTable
  ) => {
    var domains = [] as string[];
    if (inputDomains?.length) {
      domains = inputDomains;
    }

    let btn = domains.length ? (
      <Button type="link" onClick={() => setUserAndView(userToAction)}>
        {domains.length}
      </Button>
    ) : (
      <Tag>ALL</Tag>
    );
    if (!domains || domains!.length < 1) {
      return btn;
    }

    const content = domains?.map((d, i) => {
      return (
        <div key={i}>
          <Tag color="blue" style={{ marginRight: 3 }}>
            {d}
          </Tag>
        </div>
      );
    });

    const mainContent = <Space direction="vertical">{content}</Space>;
    let popoverPlacement = "top";
    if (content && content.length > 5) {
      popoverPlacement = "rightTop";
    }

    return (
      <Popover
        placement={popoverPlacement as TooltipPlacement}
        key={userToAction.id}
        onOpenChange={(b: boolean) =>
          onPopoverVisibleChange(b, userToAction.key + "domain")
        }
        open={groupPopupVisible === userToAction.key + "domain"}
        content={mainContent}
        title={null}
      >
        {btn}
      </Popover>
    );
  };

  useEffect(() => {
    if (addNewNameServerGroupVisible) {
      setGroupPopupVisible("");
    }
  }, [addNewNameServerGroupVisible]);

  const createKey = "saving";
  useEffect(() => {
    if (savedNSGroup.loading) {
      message.loading({
        content: "Saving...",
        key: createKey,
        duration: 0,
        style: styleNotification,
      });
    } else if (savedNSGroup.success) {
      message.success({
        content: "Nameserver has been successfully saved.",
        key: createKey,
        duration: 2,
        style: styleNotification,
      });
      dispatch(nsGroupActions.setSetupNewNameServerGroupVisible(false));
      dispatch(
        nsGroupActions.setSavedNameServerGroup({
          ...savedNSGroup,
          success: false,
        })
      );
      dispatch(nsGroupActions.resetSavedNameServerGroup(null));
    } else if (savedNSGroup.error) {
      let errorMsg = "Failed to update nameserver group";
      switch (savedNSGroup.error.statusCode) {
        case 403:
          errorMsg =
            "Failed to update nameserver group. You might not have enough permissions.";
          break;
        default:
          errorMsg = savedNSGroup.error.data.message
            ? savedNSGroup.error.data.message
            : errorMsg;
          break;
      }
      message.error({
        content: errorMsg,
        key: createKey,
        duration: 5,
        style: styleNotification,
      });
      dispatch(
        nsGroupActions.setSavedNameServerGroup({ ...savedNSGroup, error: null })
      );
      dispatch(nsGroupActions.resetSavedNameServerGroup(null));
    }
  }, [savedNSGroup]);

    const createDeleteKey = "Delete";
    useEffect(() => {
      if (deleteNSGroup.loading) {
        message.loading({
          content: "Deleting...",
          key: createDeleteKey,
          duration: 0,
          style: styleNotification,
        });
      } else if (deleteNSGroup.success) {
        message.success({
          content: "Nameserver has been deleted successfully.",
          key: createDeleteKey,
          duration: 2,
          style: styleNotification,
        });
        dispatch(nsGroupActions.resetDeletedNameServerGroup(null));
      } else if (deleteNSGroup.error) {
        let errorMsg = "Failed to delete nameserver group";
        switch (deleteNSGroup.error.statusCode) {
          case 403:
            errorMsg =
              "Failed to delete nameserver group. You might not have enough permissions.";
            break;
          default:
            errorMsg = deleteNSGroup.error.data.message
              ? deleteNSGroup.error.data.message
              : errorMsg;
            break;
        }
        message.error({
          content: errorMsg,
          key: createDeleteKey,
          duration: 5,
          style: styleNotification,
        });
        dispatch(
          nsGroupActions.setSavedNameServerGroup({
            ...deleteNSGroup,
            error: null,
          })
        );
        dispatch(nsGroupActions.resetDeletedNameServerGroup(null));
      }
    }, [deleteNSGroup]);

  const onPopoverVisibleChange = (b: boolean, key: string) => {
    if (addNewNameServerGroupVisible) {
      setGroupPopupVisible("");
    } else {
      if (b) {
        setGroupPopupVisible(key);
      } else {
        setGroupPopupVisible("");
      }
    }
  };

  const onClickAddNewNSGroup = () => {
    dispatch(nsGroupActions.setSetupNewNameServerGroupVisible(true));
    dispatch(
      nsGroupActions.setNameServerGroup({
        enabled: true,
        primary: true,
      } as NameServerGroup)
    );
  };

  const handleChangeDisabled = (checked: boolean, record: any) => {
    dispatch(
      nsGroupActions.saveNameServerGroup.request({
        getAccessTokenSilently: getTokenSilently,
        payload: { ...record, enabled: checked },
      })
    );
  };

  return (
    <>
      {nsGroup.length ? (
        <Paragraph style={{ marginTop: "5px" }}>
          Add nameservers for domain name resolution in your NetBird network.
          <a
            target="_blank"
            rel="noreferrer"
            href="https://docs.netbird.io/how-to/manage-dns-in-your-network"
          >
            {" "}
            Learn more
          </a>
        </Paragraph>
      ) : (
        <Paragraph style={{ marginTop: "5px" }} type={"secondary"}>
          Add nameservers for domain name resolution in your NetBird network.
          <a
            target="_blank"
            rel="noreferrer"
            href="https://docs.netbird.io/how-to/manage-dns-in-your-network"
          >
            {" "}
            Learn more
          </a>
        </Paragraph>
      )}
      <Space direction="vertical" size="large" style={{ display: "flex" }}>
        <Row gutter={[16, 24]}>
          <Col xs={24} sm={24} md={8} lg={8} xl={8} xxl={8} span={8}>
            <Input
              allowClear
              value={textToSearch}
              onPressEnter={searchDataTable}
              placeholder="Search by name, domain or nameservers..."
              onChange={onChangeTextToSearch}
            />
          </Col>
          <Col xs={24} sm={24} md={11} lg={11} xl={11} xxl={11} span={11}>
            <Space size="middle">
              <Radio.Group
                options={optionsAllEnabled}
                onChange={onChangeAllEnabled}
                value={optionAllEnable}
                optionType="button"
                buttonStyle="solid"
                disabled={showTutorial}
              />
              <Select
                value={pageSize.toString()}
                options={pageSizeOptions}
                onChange={onChangePageSize}
                className="select-rows-per-page-en"
                disabled={showTutorial}
              />
            </Space>
          </Col>
          <Col xs={24} sm={24} md={5} lg={5} xl={5} xxl={5} span={5}>
            <Row justify="end">
              <Col>
                {!showTutorial && (
                  <Button type="primary" onClick={onClickAddNewNSGroup}>
                    Add Nameserver
                  </Button>
                )}
              </Col>
            </Row>
          </Col>
        </Row>
        {failed && (
          <Alert
            message={failed.code}
            description={failed.message}
            type="error"
            showIcon
            closable
          />
        )}
        <Card bodyStyle={{ padding: 0 }}>
          {!showTutorial && (
            <Table
              pagination={{
                pageSize,
                showSizeChanger: false,
                showTotal: (total, range) =>
                  `Showing ${range[0]} to ${range[1]} of ${total} nameservers`,
              }}
              // className="card-table"
              className={`access-control-table ${
                showTutorial
                  ? "card-table card-table-no-placeholder"
                  : "card-table"
              }`}
              showSorterTooltip={false}
              scroll={{ x: true }}
              loading={tableSpin(loading)}
              dataSource={dataTable}
            >
              <Column
                title="Name"
                dataIndex="name"
                align="center"
                onFilter={(value: string | number | boolean, record) =>
                  (record as any).name.includes(value)
                }
                sorter={(a, b) =>
                  (a as any).name.localeCompare((b as any).name)
                }
                defaultSortOrder="ascend"
                render={(text, record) => {
                  return (
                    <Button
                      type="text"
                      onClick={() =>
                        setUserAndView(record as NameserverGroupDataTable)
                      }
                      className="tooltip-label"
                    >
                      {text && text.trim() !== ""
                        ? text
                        : (record as NameServerGroup).id}
                    </Button>
                  );
                }}
              />
              <Column
                title="Status"
                dataIndex="enabled"
                align="center"
                render={(text: Boolean, record) => {
                  return (
                    <Switch
                      onChange={(isChecked) =>
                        handleChangeDisabled(isChecked, record)
                      }
                      disabled={savedNSGroup.loading}
                      defaultChecked={!!text}
                      size="small"
                    />
                  );
                }}
              />

              {/* <Column
                title="Status"
                dataIndex="enabled"
                align="center"
                render={(text: Boolean) => {
                  return text ? (
                    <Tag color="green">enabled</Tag>
                  ) : (
                    <Tag color="red">disabled</Tag>
                  );
                }}
              /> */}
              <Column
                title="Nameservers"
                dataIndex="nameservers"
                align="center"
                render={(nameservers: NameServer[]) => (
                  <>
                    {nameservers.map((nameserver) => (
                      <Tag key={nameserver.ip}>{nameserver.ip}</Tag>
                    ))}
                  </>
                )}
              />
              {/* <Column
                title="All domains"
                dataIndex="primary"
                align="center"
                render={(text: Boolean) => {
                  return text ? <Tag color="blue">yes</Tag> : <Tag>no</Tag>;
                }}
              /> */}
              <Column
                title="Match domains"
                dataIndex="domains"
                align="center"
                render={(text, record: NameserverGroupDataTable) => {
                  return renderPopoverDomains(text, record.domains, record);
                }}
              />
              <Column
                title="Distribution groups"
                dataIndex="groupsCount"
                align="center"
                render={(text, record: NameserverGroupDataTable) => {
                  return renderPopoverGroups(text, record.groups, record);
                }}
              />
              <Column
                title=""
                align="center"
                width="30px"
                render={(text, record) => {
                  return (
                    <Button
                      type="text"
                      onClick={() =>
                        showConfirmDelete(record as NameserverGroupDataTable)
                      }
                      danger={true}
                    >
                      Delete
                    </Button>
                  );
                }}
              />
            </Table>
          )}
          {showTutorial && (
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
                Create Nameserver
              </Title>
              <Paragraph
                style={{
                  textAlign: "center",
                  whiteSpace: "pre-line",
                }}
              >
                It looks like you don't have any nameservers. {"\n"}
                Get started by adding one to your network.
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="https://docs.netbird.io/how-to/manage-dns-in-your-network"
                >
                  {" "}
                  Learn more
                </a>
              </Paragraph>
              <Button
                size={"middle"}
                type="primary"
                onClick={() => onClickAddNewNSGroup()}
              >
                Add nameserver
              </Button>
            </Space>
          )}
        </Card>
      </Space>
    </>
  );
};

export default Nameservers;
