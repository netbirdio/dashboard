import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Dropdown,
  Input,
  Menu,
  message,
  Modal,
  Popover,
  Radio,
  Switch,
  RadioChangeEvent,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { Container } from "../components/Container";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "typesafe-actions";
import { Policy } from "../store/policy/types";
import { actions as policyActions } from "../store/policy";
import { actions as groupActions } from "../store/group";
import { filter, sortBy } from "lodash";
import { EllipsisOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import bidirect from "../assets/direct_bi.svg";
import outbound from "../assets/direct_out.svg";
import AccessControlNew from "../components/AccessControlNew";
import AccessControlEdit from "../components/AccessControlEdit";
import { Group } from "../store/group/types";
import AccessControlModalGroups from "../components/AccessControlModalGroups";
import tableSpin from "../components/Spin";
import { useGetTokenSilently } from "../utils/token";
import { usePageSizeHelpers } from "../utils/pageSize";

const { Title, Paragraph, Text } = Typography;
const { Column } = Table;
const { confirm } = Modal;

interface PolicyDataTable {
  id?: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  query: string;
  sources: string[];
  destinations: string[];
  bidirectional: boolean;
  protocol: string;
  ports: string[];
  sourceCount: number;
  sourceLabel: "";
  destinationCount: number;
  destinationLabel: "";
}

interface GroupsToShow {
  title: string;
  groups: Group[] | string[] | null;
  modalVisible: boolean;
}

export const AccessControl = () => {
  const { onChangePageSize, pageSizeOptions, pageSize } = usePageSizeHelpers();
  const { getTokenSilently } = useGetTokenSilently();
  const dispatch = useDispatch();

  const policies = useSelector((state: RootState) => state.policy.data);
  const failed = useSelector((state: RootState) => state.policy.failed);
  const loading = useSelector((state: RootState) => state.policy.loading);
  const deletedPolicy = useSelector(
    (state: RootState) => state.policy.deletedPolicy
  );
  const savedPolicy = useSelector(
    (state: RootState) => state.policy.savedPolicy
  );

  const [showTutorial, setShowTutorial] = useState(true);
  const [textToSearch, setTextToSearch] = useState("");
  const [optionAllEnable, setOptionAllEnable] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [dataTable, setDataTable] = useState([] as PolicyDataTable[]);
  const [policyToAction, setPolicyToAction] = useState(
    null as PolicyDataTable | null
  );
  const [groupsToShow, setGroupsToShow] = useState({} as GroupsToShow);
  const setupNewPolicyVisible = useSelector(
    (state: RootState) => state.policy.setupNewPolicyVisible
  );
  const setupEditPolicyVisible = useSelector(
    (state: RootState) => state.policy.setupEditPolicyVisible
  );
  const [groupPopupVisible, setGroupPopupVisible] = useState("");

  const optionsAllEnabled = [
    { label: "All", value: "all" },
    { label: "Enabled", value: "enabled" },
    { label: "Disabled", value: "disabled" },
  ];

  const getSourceDestinationLabel = (data: Group[]): string => {
    return !data ? "No group" : data[0].name;
  };

  const isShowTutorial = (policy: Policy[]): boolean => {
    return (
      !policy.length || (policy.length === 1 && policy[0].name === "Default")
    );
  };

  useEffect(() => {
    return () => {
      dispatch(policyActions.setSetupNewPolicyVisible(false));
    };
  }, []);

  const transformDataTable = (d: Policy[]): PolicyDataTable[] => {
    return d.map((policy) => {
      const sourceLabel = getSourceDestinationLabel(
        policy.rules[0].sources as Group[]
      );
      const destinationLabel = getSourceDestinationLabel(
        policy.rules[0].destinations as Group[]
      );
      return {
        id: policy.id,
        key: policy.id,
        name: policy.name,
        description: policy.description,
        enabled: policy.enabled,
        sources: policy.rules[0].sources,
        destinations: policy.rules[0].destinations,
        bidirectional: policy.rules[0].bidirectional,
        sourceCount: policy.rules[0].sources?.length,
        sourceLabel,
        destinationCount: policy.rules[0].destinations?.length,
        destinationLabel,
        protocol: policy.rules[0].protocol,
        ports: policy.rules[0].ports,
      } as PolicyDataTable;
    });
  };

  useEffect(() => {
    dispatch(
      policyActions.getPolicies.request({
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
    if (failed) {
      setShowTutorial(false);
    } else {
      setShowTutorial(isShowTutorial(policies));
      setDataTable(sortBy(transformDataTable(filterDataTable()), "name"));
    }
  }, [policies]);

  useEffect(() => {
    setDataTable(transformDataTable(filterDataTable()));
  }, [textToSearch, optionAllEnable]);

  const styleNotification = { marginTop: 85 };

  const saveKey = "saving";
  useEffect(() => {
    if (savedPolicy.loading) {
      message.loading({
        content: "Saving...",
        key: saveKey,
        duration: 0,
        style: styleNotification,
      });
    } else if (savedPolicy.success) {
      message.success({
        content: "Rule has been successfully saved.",
        key: saveKey,
        duration: 2,
        style: styleNotification,
      });
      dispatch(policyActions.setSetupEditPolicyVisible(false));
      dispatch(policyActions.setSetupNewPolicyVisible(false));
      dispatch(
        policyActions.setSavedPolicy({ ...savedPolicy, success: false })
      );
      dispatch(policyActions.resetSavedPolicy(null));
    } else if (savedPolicy.error) {
      message.error({
        content:
          "Failed to update rule. You might not have enough permissions.",
        key: saveKey,
        duration: 2,
        style: styleNotification,
      });
      dispatch(policyActions.setSavedPolicy({ ...savedPolicy, error: null }));
      dispatch(policyActions.resetSavedPolicy(null));
    }
  }, [savedPolicy]);

  const deleteKey = "deleting";
  useEffect(() => {
    const style = { marginTop: 85 };
    if (deletedPolicy.loading) {
      message.loading({ content: "Deleting...", key: deleteKey, style });
    } else if (deletedPolicy.success) {
      message.success({
        content: "Rule has been successfully disabled.",
        key: deleteKey,
        duration: 2,
        style,
      });
      dispatch(policyActions.resetDeletedPolicy(null));
    } else if (deletedPolicy.error) {
      message.error({
        content:
          "Failed to remove rule. You might not have enough permissions.",
        key: deleteKey,
        duration: 2,
        style,
      });
      dispatch(policyActions.resetDeletedPolicy(null));
    }
  }, [deletedPolicy]);

  const onChangeTextToSearch = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setTextToSearch(e.target.value);
  };

  const searchDataTable = () => {
    const data = filterDataTable();
    setDataTable(transformDataTable(data));
  };

  const onChangeAllEnabled = ({ target: { value } }: RadioChangeEvent) => {
    setOptionAllEnable(value);
  };

  const showConfirmDelete = (record: PolicyDataTable) => {
    setPolicyToAction(record as PolicyDataTable);
    confirm({
      icon: <ExclamationCircleOutlined />,
      title: <span className="font-500">Delete rule {record.name}</span>,
      width: 500,
      content: (
        <Space direction="vertical" size="small">
          <Paragraph>
            Are you sure you want to delete this rule from your account?
          </Paragraph>
        </Space>
      ),
      okType: "danger",
      onOk() {
        dispatch(
          policyActions.deletePolicy.request({
            getAccessTokenSilently: getTokenSilently,
            payload: record?.id || "",
          })
        );
      },
      onCancel() {
        setPolicyToAction(null);
      },
    });
  };

  const showConfirmDeactivate = () => {
    confirm({
      icon: <ExclamationCircleOutlined />,
      width: 600,
      content: (
        <Space direction="vertical" size="small">
          {policyToAction && (
            <>
              <Title level={5}>
                Deactivate rule "{policyToAction ? policyToAction.name : ""}"
              </Title>
              <Paragraph>
                Are you sure you want to deactivate peer from your account?
              </Paragraph>
            </>
          )}
        </Space>
      ),
      okType: "danger",
      onOk() {
        //dispatch(ruleActions.deleteRule.request({getAccessTokenSilently, payload: ruleToAction?.id || ''}));
      },
      onCancel() {
        setPolicyToAction(null);
      },
    });
  };

  const filterDataTable = (): Policy[] => {
    const t = textToSearch.toLowerCase().trim();
    let f: Policy[] = filter(
      policies,
      (f: Policy) =>
        f.name.toLowerCase().includes(t) ||
        f.description.toLowerCase().includes(t) ||
        t === ""
    ) as Policy[];
    if (optionAllEnable == "enabled") {
      f = filter(f, (f: Policy) => f.enabled);
    } else if (optionAllEnable == "disabled") {
      f = filter(f, (f: Policy) => !f.enabled);
    }
    return f;
  };

  const onClickAddNewPolicy = () => {
    dispatch(policyActions.setSetupNewPolicyVisible(true));
    dispatch(
      policyActions.setPolicy({
        name: "",
        description: "",
        enabled: true,
        rules: [
          {
            name: "",
            description: "",
            enabled: true,
            bidirectional: true,
            action: "accept",
            protocol: "all",
          },
        ],
      } as Policy)
    );
  };

  const onClickViewPolicy = () => {
    dispatch(policyActions.setSetupNewPolicyVisible(true));
    dispatch(
      policyActions.setPolicy({
        id: policyToAction?.id || null,
        name: policyToAction?.name,
        description: policyToAction?.description,
        enabled: policyToAction?.enabled,
        rules: [
          {
            name: policyToAction?.name,
            description: policyToAction?.description,
            enabled: policyToAction?.enabled,
            sources: policyToAction?.sources,
            destinations: policyToAction?.destinations,
            bidirectional: policyToAction?.bidirectional,
            protocol: policyToAction?.protocol,
            ports: policyToAction?.ports,
          },
        ],
      } as Policy)
    );
  };

  const setPolicyAndView = (p: PolicyDataTable) => {
    dispatch(policyActions.setSetupEditPolicyVisible(true));
    dispatch(
      policyActions.setPolicy({
        id: p.id || null,
        name: p.name,
        description: p.description,
        enabled: p.enabled,
        rules: [
          {
            id: p.id || null,
            name: p.name,
            description: p.description,
            enabled: p.enabled,
            sources: p.sources,
            destinations: p.destinations,
            bidirectional: p.bidirectional,
            protocol: p.protocol,
            ports: p.ports,
          },
        ],
      } as Policy)
    );
  };

  const toggleModalGroups = (
    title: string,
    groups: Group[] | string[] | null,
    modalVisible: boolean
  ) => {
    setGroupsToShow({
      title,
      groups,
      modalVisible,
    });
  };

  useEffect(() => {
    if (setupNewPolicyVisible) {
      setGroupPopupVisible("");
    }
  }, [setupNewPolicyVisible]);

  const onPopoverVisibleChange = (b: boolean, key: string) => {
    if (setupNewPolicyVisible) {
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
    label: string,
    groups: Group[] | string[] | null,
    rule: PolicyDataTable
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
    const updateContent =
      groups && groups.length > 1 ? content && content?.slice(1) : content;
    const mainContent = <Space direction="vertical">{updateContent}</Space>;
    return groups && groups.length === 1 ? (
      <> {label}</>
    ) : (
      <Popover
        onOpenChange={(b: boolean) => onPopoverVisibleChange(b, rule.key)}
        open={groupPopupVisible === rule.key}
        content={mainContent}
        title={null}
      >
        <>
          {label}
          <Button
            type="link"
            onClick={() => setPolicyAndView(rule)}
            style={{ padding: "0 5px" }}
          >
            +{groups && groups.length - 1}
          </Button>
        </>
      </Popover>
    );
  };

  const renderPorts = (ports: string[]) => {
    const content = ports?.map((p, i) => {
      return (
        <Tag key={i} style={{ marginRight: 3 }}>
          <span className="menlo-font">{p}</span>
        </Tag>
      );
    });
    const portsLength = content && content.length - 1;
    if (portsLength > 2) {
      const newContent = content.slice(2);
      return (
        <>
          {content[0]} {content[1]}
          <Popover
            content={newContent}
            title={null}
            overlayStyle={{
              maxWidth: "200px",
              textAlign: "center",
            }}
          >
            <Button size="small" type="link" style={{ marginLeft: -3 }}>
              +{content.length - 2}
            </Button>
          </Popover>
        </>
      );
    } else {
      return <span> {content}</span>;
    }
  };

  const onEnableChange = (check: boolean, selectedPolicy: PolicyDataTable) => {
    const filterPolicy = policies.find(
      (policy) => policy.id === selectedPolicy.id
    );

    const policyToSave = {
      id: filterPolicy?.id || "",
      name: filterPolicy?.name || "",
      description: filterPolicy?.description || "",
      enabled: check,
      query: filterPolicy?.query || "",
      rules: [
        {
          id: filterPolicy?.rules[0].id || "",
          name: filterPolicy?.rules[0].name || "",
          description: filterPolicy?.rules[0].description || "",
          enabled: check,
          action: filterPolicy?.rules[0].action || "",
          bidirectional: filterPolicy?.rules[0].bidirectional || false,
          protocol: filterPolicy?.rules[0].protocol || "",
          ports: filterPolicy?.rules[0].ports || [],
          sources: filterPolicy?.rules[0].sources
            ? filterPolicy?.rules[0].sources.map((item) => item.id || "")
            : [],
          destinations: filterPolicy?.rules[0].destinations
            ? filterPolicy?.rules[0].destinations.map((item) => item.id || "")
            : [],
        },
      ],
    };
    dispatch(
      policyActions.savePolicy.request({
        getAccessTokenSilently: getTokenSilently,
        payload: policyToSave,
      })
    );
  };
  return (
    <>
      {!setupEditPolicyVisible && (
        <>
          <Container className="container-main">
            <Row>
              <Col span={24}>
                <Title className="page-heading">Access Control</Title>
                {policies.length ? (
                  <Paragraph>
                    Access rules help you manage access permissions in your
                    organisation.
                  </Paragraph>
                ) : (
                  <Paragraph type={"secondary"}>
                    Access rules help you manage access permissions in your
                    organisation.
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
                        placeholder="Search by name and description..."
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
                        />
                        <Select
                          value={pageSize.toString()}
                          options={pageSizeOptions}
                          onChange={onChangePageSize}
                          className="select-rows-per-page-en"
                        />
                      </Space>
                    </Col>
                    <Col xs={24} sm={24} md={5} lg={5} xl={5} xxl={5} span={5}>
                      <Row justify="end">
                        <Col>
                          <Button
                            type="primary"
                            disabled={savedPolicy.loading}
                            onClick={onClickAddNewPolicy}
                          >
                            Add Rule
                          </Button>
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
                    <Table
                      pagination={{
                        current: currentPage,
                        hideOnSinglePage: showTutorial,
                        disabled: showTutorial,
                        pageSize,
                        responsive: true,
                        showSizeChanger: false,
                        showTotal: (total, range) =>
                          `Showing ${range[0]} to ${range[1]} of ${total} rules`,
                        onChange: (page, pageSize) => {
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
                      loading={tableSpin(loading)}
                      dataSource={dataTable}
                    >
                      <Column
                        title="Name"
                        dataIndex="name"
                        onFilter={(value: string | number | boolean, record) =>
                          (record as any).name.includes(value)
                        }
                        sorter={(a, b) =>
                          (a as any).name.localeCompare((b as any).name)
                        }
                        defaultSortOrder="ascend"
                        render={(text, record, index) => {
                          const desc = (
                            record as PolicyDataTable
                          ).description.trim();
                          return (
                            <Tooltip
                              title={desc !== "" ? desc : "no description"}
                              arrowPointAtCenter
                            >
                              <span
                                onClick={() =>
                                  setPolicyAndView(record as PolicyDataTable)
                                }
                                className="tooltip-label"
                              >
                                <Text className="font-500">{text}</Text>
                              </span>
                            </Tooltip>
                          );
                        }}
                      />
                      <Column
                        title="Enabled"
                        dataIndex="enabled"
                        render={(
                          text: Boolean,
                          record: PolicyDataTable,
                          index
                        ) => {
                          return (
                            <Switch
                              size={"small"}
                              checked={record.enabled}
                              onChange={(isOpen: boolean) => {
                                onEnableChange(isOpen, record);
                              }}
                            />
                          );
                        }}
                      />
                      <Column
                        title="Sources"
                        dataIndex="sourceLabel"
                        render={(text, record: PolicyDataTable, index) => {
                          return renderPopoverGroups(
                            text,
                            record.sources,
                            record as PolicyDataTable
                          );
                        }}
                      />
                      <Column
                        title="Direction"
                        dataIndex="bidirectional"
                        render={(text, record: PolicyDataTable, index) => {
                          const s = {
                            minWidth: 62,
                            textAlign: "center",
                          } as React.CSSProperties;
                          if (record.bidirectional) {
                            return (
                              <Tag color="green" style={s}>
                                <img src={bidirect} alt="bi icon" />
                              </Tag>
                            );
                          }
                          return (
                            <Tag color="processing" style={s}>
                              <img src={outbound} alt="out icon" />
                            </Tag>
                          );
                        }}
                      />
                      <Column
                        title="Destinations"
                        dataIndex="destinationLabel"
                        render={(text, record: PolicyDataTable, index) => {
                          return renderPopoverGroups(
                            text,
                            record.destinations,
                            record as PolicyDataTable
                          );
                        }}
                      />
                      <Column
                        title="Protocol"
                        dataIndex="protocol"
                        render={(text, record: PolicyDataTable, index) => {
                          return (
                            <Tag
                              className="menlo-font"
                              style={{
                                marginRight: "3",
                                textTransform: "uppercase",
                              }}
                            >
                              {record.protocol}
                            </Tag>
                          );
                        }}
                      />
                      <Column
                        title="Ports"
                        dataIndex="ports"
                        render={(text, record: PolicyDataTable, index) => {
                          return renderPorts(record.ports);
                        }}
                      />
                      <Column
                        title=""
                        align="center"
                        render={(text, record: PolicyDataTable, index) => {
                          return (
                            <Button
                              type="text"
                              danger={true}
                              disabled={
                                deletedPolicy.loading || savedPolicy.loading
                              }
                              onClick={() => showConfirmDelete(record)}
                            >
                              Delete
                            </Button>
                          );
                        }}
                      />
                    </Table>
                    {showTutorial && (
                      <Space
                        direction="vertical"
                        size="small"
                        align="center"
                        style={{ display: "flex", padding: "45px 15px" }}
                      >
                        <Button type="link" onClick={onClickAddNewPolicy}>
                          Add new access rule
                        </Button>
                      </Space>
                    )}
                  </Card>
                </Space>
              </Col>
            </Row>
          </Container>
          <AccessControlModalGroups
            data={groupsToShow.groups}
            title={groupsToShow.title}
            visible={groupsToShow.modalVisible}
            onCancel={() => toggleModalGroups("", [], false)}
          />
          {setupNewPolicyVisible && <AccessControlNew />}
        </>
      )}

      {setupEditPolicyVisible && <AccessControlEdit />}
    </>
  );
};

export default AccessControl;
