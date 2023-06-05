import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "typesafe-actions";
import { actions as setupKeyActions } from "../store/setup-key";
import { Container } from "../components/Container";
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
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
import { SetupKey, SetupKeyToSave } from "../store/setup-key/types";
import { filter } from "lodash";
import { formatDate, timeAgo } from "../utils/common";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import SetupKeyNew from "../components/SetupKeyNew";
import SetupKeyEdit from "../components/SetupKeyEdit";
import ButtonCopyMessage from "../components/ButtonCopyMessage";
import tableSpin from "../components/Spin";
import { actions as groupActions } from "../store/group";
import { Group } from "../store/group/types";
import { TooltipPlacement } from "antd/es/tooltip";
import { useGetTokenSilently } from "../utils/token";
import { usePageSizeHelpers } from "../utils/pageSize";

const { Title, Text, Paragraph } = Typography;
const { Column } = Table;

interface SetupKeyDataTable extends SetupKey {
  key: string;
  groupsCount: number;
}

export const SetupKeys = () => {
  const { onChangePageSize, pageSizeOptions, pageSize } = usePageSizeHelpers();
  const { getTokenSilently } = useGetTokenSilently();
  const dispatch = useDispatch();

  const setupKeys = useSelector((state: RootState) => state.setupKey.data);
  const failed = useSelector((state: RootState) => state.setupKey.failed);
  const loading = useSelector((state: RootState) => state.setupKey.loading);
  const deletedSetupKey = useSelector(
    (state: RootState) => state.setupKey.deletedSetupKey
  );
  const savedSetupKey = useSelector(
    (state: RootState) => state.setupKey.savedSetupKey
  );
  const groups = useSelector((state: RootState) => state.group.data);

  const [textToSearch, setTextToSearch] = useState("");
  const [optionValidAll, setOptionValidAll] = useState("valid");
  const [dataTable, setDataTable] = useState([] as SetupKeyDataTable[]);
  const setupNewKeyVisible = useSelector(
    (state: RootState) => state.setupKey.setupNewKeyVisible
  );
  const setupEditKeyVisible = useSelector(
    (state: RootState) => state.setupKey.setupEditKeyVisible
  );
  const [groupPopupVisible, setGroupPopupVisible] = useState("");

  const styleNotification = { marginTop: 85 };
  const showTutorial = !dataTable.length;

  const optionsValidAll = [
    { label: "Valid", value: "valid" },
    { label: "All", value: "all" },
  ];

  const [confirmModal, confirmModalContextHolder] = Modal.useModal();

  const transformDataTable = (d: SetupKey[]): SetupKeyDataTable[] => {
    return d.map(
      (p) =>
        ({
          ...p,
          groupsCount: p.auto_groups ? p.auto_groups.length : 0,
        } as SetupKeyDataTable)
    );
  };

  useEffect(() => {
    dispatch(
      setupKeyActions.getSetupKeys.request({
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
    setDataTable(transformDataTable(filterDataTable()));
  }, [setupKeys]);

  useEffect(() => {
    setDataTable(transformDataTable(filterDataTable()));
  }, [textToSearch, optionValidAll]);

  const deleteKey = "deleting";
  useEffect(() => {
    if (deletedSetupKey.loading) {
      message.loading({
        content: "Deleting...",
        key: deleteKey,
        style: styleNotification,
      });
    } else if (deletedSetupKey.success) {
      message.success({
        content: "Setup key has been successfully removed.",
        key: deleteKey,
        duration: 2,
        style: styleNotification,
      });
      dispatch(
        setupKeyActions.setDeleteSetupKey({
          ...deletedSetupKey,
          success: false,
        })
      );
      dispatch(setupKeyActions.resetDeletedSetupKey(null));
    } else if (deletedSetupKey.error) {
      message.error({
        content:
          "Failed to delete setup key. You might not have enough permissions.",
        key: deleteKey,
        duration: 2,
        style: styleNotification,
      });
      dispatch(
        setupKeyActions.setDeleteSetupKey({ ...deletedSetupKey, error: null })
      );
      dispatch(setupKeyActions.resetDeletedSetupKey(null));
    }
  }, [deletedSetupKey]);

  const createKey = "saving";
  useEffect(() => {
    if (savedSetupKey.loading) {
      message.loading({
        content: "Saving...",
        key: createKey,
        duration: 1,
        style: styleNotification,
      });
    } else if (savedSetupKey.success) {
      dispatch(
        setupKeyActions.setSavedSetupKey({ ...savedSetupKey, success: false })
      );
      dispatch(setupKeyActions.resetSavedSetupKey(null));
      dispatch(setupKeyActions.setSetupEditKeyVisible(false));
    } else if (savedSetupKey.error) {
      message.error({
        content:
          "Failed to update setup key. You might not have enough permissions.",
        key: createKey,
        duration: 2,
        style: styleNotification,
      });
      dispatch(
        setupKeyActions.setSavedSetupKey({ ...savedSetupKey, error: null })
      );
      dispatch(setupKeyActions.resetSavedSetupKey(null));
    }
  }, [savedSetupKey]);

  const filterDataTable = (): SetupKey[] => {
    const t = textToSearch.toLowerCase().trim();
    let f: SetupKey[] = [...setupKeys];
    if (optionValidAll === "valid") {
      f = filter(setupKeys, (_f: SetupKey) => _f.valid && !_f.revoked);
    }
    f = filter(
      f,
      (_f: SetupKey) =>
        _f.name.toLowerCase().includes(t) ||
        _f.state.includes(t) ||
        _f.type.toLowerCase().includes(t) ||
        _f.key.toLowerCase().includes(t) ||
        t === ""
    ) as SetupKey[];
    return f;
  };

  const onChangeTextToSearch = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setTextToSearch(e.target.value);
  };

  const searchDataTable = () => {
    const data = filterDataTable();
    setDataTable(transformDataTable(data));
  };

  const onChangeValidAll = ({ target: { value } }: RadioChangeEvent) => {
    setOptionValidAll(value);
  };

  const showConfirmRevoke = (setupKeyToAction: SetupKeyDataTable) => {
    let name = setupKeyToAction ? setupKeyToAction.name : "";
    confirmModal.confirm({
      icon: <ExclamationCircleOutlined />,
      title: 'Revoke setupKey "' + name + '"',
      width: 600,
      content: (
        <Space direction="vertical" size="small">
          <Paragraph>Are you sure you want to revoke key?</Paragraph>
        </Space>
      ),
      onOk() {
        dispatch(
          setupKeyActions.saveSetupKey.request({
            getAccessTokenSilently: getTokenSilently,
            payload: {
              id: setupKeyToAction ? setupKeyToAction.id : null,
              revoked: true,
              name: setupKeyToAction ? setupKeyToAction.name : null,
              auto_groups:
                setupKeyToAction && setupKeyToAction.auto_groups
                  ? setupKeyToAction.auto_groups
                  : [],
            } as SetupKeyToSave,
          })
        );
      },
    });
  };

  const onClickAddNewSetupKey = () => {
    const autoGroups: string[] = [];
    dispatch(setupKeyActions.setSetupNewKeyVisible(true));
    dispatch(
      setupKeyActions.setSetupKey({
        name: "",
        type: "one-off",
        auto_groups: autoGroups,
      } as SetupKey)
    );
  };

  const setKeyAndView = (key: SetupKeyDataTable) => {
    dispatch(setupKeyActions.setSetupEditKeyVisible(true));
    dispatch(
      setupKeyActions.setSetupKey({
        id: key?.id || null,
        key: key?.key,
        name: key?.name,
        revoked: key?.revoked,
        expires: key?.expires,
        state: key?.state,
        type: key?.type,
        used_times: key?.used_times,
        valid: key?.valid,
        auto_groups: key?.auto_groups,
        last_used: key?.last_used,
        usage_limit: key?.usage_limit,
      } as SetupKey)
    );
  };

  useEffect(() => {
    if (setupNewKeyVisible) {
      setGroupPopupVisible("");
    }
  }, [setupNewKeyVisible]);

  const onPopoverVisibleChange = (b: boolean, key: string) => {
    if (setupNewKeyVisible) {
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
    rowGroups: string[] | string[] | null,
    setupKeyToAction: SetupKeyDataTable
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
        onClick={() => setKeyAndView(setupKeyToAction as SetupKeyDataTable)}
      >
        {displayGroups.length}
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
            <strong>{_g.name}</strong>
          </Tag>
          <span style={{ fontSize: ".85em" }}>{peersCount}</span>
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
        key={setupKeyToAction.key}
        onOpenChange={(b: boolean) =>
          onPopoverVisibleChange(b, setupKeyToAction.key)
        }
        open={groupPopupVisible === setupKeyToAction.key}
        content={mainContent}
        title={null}
      >
        {btn}
      </Popover>
    );
  };

  const setUpdateGroupsVisible = (
    setupKeyToAction: SetupKey,
    status: boolean
  ) => {
    if (status) {
      dispatch(setupKeyActions.setSetupKey({ ...setupKeyToAction }));
      dispatch(setupKeyActions.setSetupNewKeyVisible(true));
      return;
    }
    const autoGroups: string[] = [];
    dispatch(
      setupKeyActions.setSetupKey({
        name: "",
        type: "one-off",
        auto_groups: autoGroups,
      } as SetupKey)
    );
    dispatch(setupKeyActions.setSetupNewKeyVisible(false));
  };

  return (
    <>
      <Container style={{ paddingTop: "40px" }}>
        {!setupEditKeyVisible && (
          <Row>
            <Col span={24}>
              <Title level={4}>Setup Keys</Title>
              <Paragraph
                style={{
                  color: dataTable.length ? "black" : "#818183",
                }}
              >
                A list of all the setup keys in your account including their
                name, state, type and expiration.
              </Paragraph>
              <Space
                direction="vertical"
                size="large"
                style={{ display: "flex" }}
              >
                <Row gutter={[16, 24]}>
                  <Col xs={24} sm={24} md={8} lg={8} xl={8} xxl={8} span={8}>
                    {/*<Input.Search allowClear value={textToSearch} onPressEnter={searchDataTable} onSearch={searchDataTable} placeholder="Search..." onChange={onChangeTextToSearch} />*/}
                    <Input
                      allowClear
                      value={textToSearch}
                      onPressEnter={searchDataTable}
                      placeholder="Search..."
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
                        options={optionsValidAll}
                        onChange={onChangeValidAll}
                        value={optionValidAll}
                        optionType="button"
                        buttonStyle="solid"
                        disabled={!dataTable?.length}
                      />
                      <Select
                        disabled={!dataTable?.length}
                        value={pageSize.toString()}
                        options={pageSizeOptions}
                        onChange={onChangePageSize}
                        className="select-rows-per-page-en"
                      />
                    </Space>
                  </Col>
                  {dataTable.length ? (
                    <Col xs={24} sm={24} md={5} lg={5} xl={5} xxl={5} span={5}>
                      <Row justify="end">
                        <Col>
                          <Button
                            type="primary"
                            onClick={onClickAddNewSetupKey}
                          >
                            Add key
                          </Button>
                        </Col>
                      </Row>
                    </Col>
                  ) : (
                    <></>
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
                {showTutorial ? (
                  <Space
                    style={{
                      width: "100%",
                      backgroundColor: "white",
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "center",
                      border: "1px solid #f0f0f0",
                      borderRadius: "4px",
                      gap: "8px",
                    }}
                  >
                    <Container
                      style={{
                        textAlign: "center",
                        width: "615px",
                      }}
                    >
                      <Col style={{ marginTop: "41px" }}>
                        <Text
                          style={{
                            fontWeight: "600",
                            fontSize: "22px",
                            lineHeight: "26px",
                            color: "#252526",
                          }}
                        >
                          Create setup key
                        </Text>
                      </Col>
                      <Col style={{ marginTop: "17px" }}>
                        <Text
                          style={{
                            fontWeight: "400",
                            fontSize: "14px",
                            lineHeight: "22px",
                          }}
                        >
                          Manage setup keys to register new machines in your
                          network. The key links machines to your account during
                          initial setup.
                          <a
                            target="_blank"
                            rel="noreferrer"
                            href="https://docs.netbird.io/how-to/register-machines-using-setup-keys"
                          >
                            {" "}
                            Learn more
                          </a>
                        </Text>
                      </Col>
                      <Col
                        style={{
                          marginTop: "16px",
                          marginBottom: "112px",
                        }}
                      >
                        <Button
                          type="primary"
                          style={{
                            fontSize: "14px",
                            padding: "6.4px, 15px",
                            gap: "10px",
                            textAlign: "center",
                          }}
                          onClick={onClickAddNewSetupKey}
                        >
                          Add key
                        </Button>
                      </Col>
                    </Container>
                  </Space>
                ) : (
                  <Card bodyStyle={{ padding: 0 }}>
                    <Table
                      pagination={{
                        pageSize,
                        showSizeChanger: false,
                        showTotal: (total, range) =>
                          `Showing ${range[0]} to ${range[1]} of ${total} setup keys`,
                      }}
                      className="card-table"
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
                        render={(text, record, index) => {
                          return (
                            <Button
                              type="text"
                              onClick={() =>
                                setKeyAndView(record as SetupKeyDataTable)
                              }
                              className="tooltip-label"
                            >
                              {" "}
                              <Text strong>{text}</Text>
                            </Button>
                          );
                        }}
                        defaultSortOrder="ascend"
                      />
                      <Column
                        title="Type"
                        dataIndex="type"
                        onFilter={(value: string | number | boolean, record) =>
                          (record as any).type.includes(value)
                        }
                        sorter={(a, b) =>
                          (a as any).type.localeCompare((b as any).type)
                        }
                      />
                      <Column
                        title="Key"
                        dataIndex="key"
                        onFilter={(value: string | number | boolean, record) =>
                          (record as any).key.includes(value)
                        }
                        sorter={(a, b) =>
                          (a as any).key.localeCompare((b as any).key)
                        }
                        render={(text, record, index) => {
                          return (
                            <Text>{text.substring(0, 4).concat("****")}</Text>
                          );
                        }}
                      />

                      <Column
                        title="Last Used"
                        dataIndex="last_used"
                        sorter={(a, b) =>
                          (a as any).last_used.localeCompare(
                            (b as any).last_used
                          )
                        }
                        render={(text, record, index) => {
                          return !(record as SetupKey).used_times
                            ? "never"
                            : timeAgo(text);
                        }}
                      />
                      <Column
                        title="Groups"
                        dataIndex="groupsCount"
                        align="center"
                        render={(text, record: SetupKeyDataTable, index) => {
                          return renderPopoverGroups(
                            text,
                            record.auto_groups,
                            record
                          );
                        }}
                      />
                      <Column
                        title="Expires"
                        dataIndex="expires"
                        render={(text, record, index) => {
                          return formatDate(text);
                        }}
                      />
                      <Column
                        title="State"
                        dataIndex="state"
                        render={(text, record, index) => {
                          return text === "valid" ? (
                            <Tag color="green">{text}</Tag>
                          ) : (
                            <Tag color="red">{text}</Tag>
                          );
                        }}
                        sorter={(a, b) =>
                          (a as any).state.localeCompare((b as any).state)
                        }
                      />
                      <Column
                        title=""
                        align="center"
                        render={(text, record, index) => {
                          return (
                            <Button
                              style={{
                                color: "rgba(210, 64, 64, 0.85)",
                              }}
                              type="text"
                              onClick={() =>
                                showConfirmRevoke(record as SetupKeyDataTable)
                              }
                            >
                              Revoke
                            </Button>
                          );
                        }}
                      />
                    </Table>
                  </Card>
                )}
              </Space>
            </Col>
          </Row>
        )}
        {setupEditKeyVisible && <SetupKeyEdit />}
      </Container>
      {setupNewKeyVisible && <SetupKeyNew />}
      {confirmModalContextHolder}
    </>
  );
};

export default SetupKeys;
