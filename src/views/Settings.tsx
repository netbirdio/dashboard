import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "typesafe-actions";
import {
  Button,
  Card,
  Col,
  Form,
  Switch,
  message,
  Modal,
  Tooltip,
  Row,
  Space,
  Typography,
  Table,
} from "antd";
import { usePageSizeHelpers } from "../utils/pageSize";
import { useGetTokenSilently } from "../utils/token";
import { useGetGroupTagHelpers } from "../utils/groups";
import { Container } from "../components/Container";
import ExpiresInInput, {
  expiresInToSeconds,
  secondsToExpiresIn,
} from "./ExpiresInInput";
import Column from "antd/lib/table/Column";
import TableSpin from "../components/Spin";
import { checkExpiresIn } from "../utils/common";
import { actions as accountActions } from "../store/account";
import { Account, FormAccount } from "../store/account/types";
import {
  ExclamationCircleOutlined,
  QuestionCircleFilled,
} from "@ant-design/icons";
import { actions as groupActions } from "../store/group";
import { actions as setupKeyActions } from "../store/setup-key";
import { actions as policyActions } from "../store/policy";
import { actions as nsGroupActions } from "../store/nameservers";
import { actions as routeActions } from "../store/route";
import { actions as userActions } from "../store/user";

const { Title, Paragraph, Text } = Typography;

const styleNotification = { marginTop: 85 };

export const Settings = () => {
  const { getTokenSilently } = useGetTokenSilently();
  const dispatch = useDispatch();
  const { pageSize } = usePageSizeHelpers();

  const [filterGroup, setFilterGroup] = useState([]);

  const {} = useGetGroupTagHelpers();

  const accounts = useSelector((state: RootState) => state.account.data);
  const failed = useSelector((state: RootState) => state.account.failed);
  const loading = useSelector((state: RootState) => state.account.loading);
  const updatedAccount = useSelector(
    (state: RootState) => state.account.updatedAccount
  );
  const [formAccount, setFormAccount] = useState({} as FormAccount);
  const [accountToAction, setAccountToAction] = useState({} as FormAccount);
  const groups = useSelector((state: RootState) => state.group.data);
  const groupsLoading = useSelector((state: RootState) => state.group.loading);

  const deleteGroup = useSelector(
    (state: RootState) => state.group.deletedGroup
  );

  // ==========
  const setupKeys = useSelector((state: RootState) => state.setupKey.data);
  const setupKeysLoading = useSelector(
    (state: RootState) => state.setupKey.loading
  );
  // ==========
  const policies = useSelector((state: RootState) => state.policy.data);
  const policiesLoading = useSelector(
    (state: RootState) => state.policy.loading
  );
  // ==========
  const routes = useSelector((state: RootState) => state.route.data);
  const routesLoading = useSelector((state: RootState) => state.route.loading);
  // ==========
  const nsGroup = useSelector((state: RootState) => state.nameserverGroup.data);
  const nsGrouploading = useSelector(
    (state: RootState) => state.nameserverGroup.loading
  );
  // ==========

  const users = useSelector((state: RootState) => state.user.data);
  // ==========

  const [formPeerExpirationEnabled, setFormPeerExpirationEnabled] =
    useState(true);
  const [confirmModal, confirmModalContextHolder] = Modal.useModal();
  const { confirm } = Modal;

  const [form] = Form.useForm();
  useEffect(() => {
    dispatch(
      accountActions.getAccounts.request({
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

    dispatch(
      setupKeyActions.getSetupKeys.request({
        getAccessTokenSilently: getTokenSilently,
        payload: null,
      })
    );

    dispatch(
      policyActions.getPolicies.request({
        getAccessTokenSilently: getTokenSilently,
        payload: null,
      })
    );

    dispatch(
      nsGroupActions.getNameServerGroups.request({
        getAccessTokenSilently: getTokenSilently,
        payload: null,
      })
    );

    dispatch(
      routeActions.getRoutes.request({
        getAccessTokenSilently: getTokenSilently,
        payload: null,
      })
    );

    dispatch(
      userActions.getRegularUsers.request({
        getAccessTokenSilently: getTokenSilently,
        payload: null,
      })
    );
  }, []);

  useEffect(() => {
    if (accounts.length < 1) {
      console.debug(
        "invalid account data returned from the Management API",
        accounts
      );
      return;
    }
    let account = accounts[0];

    let fAccount = {
      id: account.id,
      settings: account.settings,
      peer_login_expiration_formatted: secondsToExpiresIn(
        account.settings.peer_login_expiration,
        ["hour", "day"]
      ),
      peer_login_expiration_enabled:
        account.settings.peer_login_expiration_enabled,
    } as FormAccount;
    setFormAccount(fAccount);
    setFormPeerExpirationEnabled(fAccount.peer_login_expiration_enabled);
    form.setFieldsValue(fAccount);
  }, [accounts]);

  useEffect(() => {
    if (groups && setupKeys && nsGroup && routes && users && policies) {
      const mapForSetupKeys: any = [];
      groups.forEach((item: any) => {
        const cSetupKey = item.setupKey ? item.setupKey : [];
        setupKeys.forEach((item2: any) => {
          if (item2.auto_groups.includes(item.id)) {
            if (cSetupKey.indexOf(item2.id) === -1) {
              cSetupKey.push(item2.id);
            }
          }
          item["setupKey"] = cSetupKey;
        });
        mapForSetupKeys.push(item);
      });

      const mapForNameservers: any = [];
      mapForSetupKeys.forEach((item: any) => {
        const cNameservers = item.nameservers ? item.nameservers : [];
        nsGroup.forEach((item2: any) => {
          if (item2.groups.includes(item.id)) {
            if (cNameservers.indexOf(item2.id) === -1) {
              cNameservers.push(item2.id);
            }
          }
          item["nameservers"] = cNameservers;
        });
        mapForNameservers.push(item);
      });

      const mapForRoutes: any = [];
      mapForNameservers.forEach((item: any) => {
        const cRoutes = item.routes ? item.routes : [];
        routes.forEach((item2: any) => {
          if (item2.groups.includes(item.id)) {
            if (cRoutes.indexOf(item2.id) === -1) {
              cRoutes.push(item2.id);
            }
          }
          item["routes"] = cRoutes;
        });
        mapForRoutes.push(item);
      });

      const mapForUser: any = [];
      mapForRoutes.forEach((item: any) => {
        const cUser = item.user ? item.user : [];
        users.forEach((item2: any) => {
          if (item2.auto_groups.includes(item.id)) {
            if (cUser.indexOf(item2.id) === -1) {
              cUser.push(item2.id);
            }
          }
          item["user"] = cUser;
        });
        mapForUser.push(item);
      });

      const createSingleArrayForPolicy: any = [];
      policies.map((aControl: any) => {
        const cSingleAccessArray = aControl.allGroups ? aControl.allGroups : [];
        aControl.rules[0].destinations.forEach((destination: any) => {
          if (cSingleAccessArray.indexOf(destination.id) === -1) {
            cSingleAccessArray.push(destination.id);
          }
        });

        aControl.rules[0].sources.forEach((source: any) => {
          if (cSingleAccessArray.indexOf(source.id) === -1) {
            cSingleAccessArray.push(source.id);
          }
        });

        aControl["cSingleAccessArray"] = cSingleAccessArray;
        createSingleArrayForPolicy.push(aControl);
      });

      const mapForAccesControl: any = [];
      mapForUser.forEach((item: any) => {
        const cAccessControl = item.accessControl ? item.accessControl : [];
        createSingleArrayForPolicy.forEach((item2: any) => {
          if (item2.cSingleAccessArray.includes(item.id)) {
            if (cAccessControl.indexOf(item2.id) === -1) {
              cAccessControl.push(item2.id);
            }
          }
          item["accessControl"] = cAccessControl;
        });
        mapForAccesControl.push(item);
      });

      setFilterGroup(mapForAccesControl);
      // console.log("mapForAccesControl", mapForAccesControl);
    }
  }, [groups, setupKeys, nsGroup, routes, users, policies]);

  const updatingSettings = "updating_settings";
  useEffect(() => {
    if (updatedAccount.loading) {
      message.loading({
        content: "Saving...",
        key: updatingSettings,
        duration: 0,
        style: styleNotification,
      });
    } else if (updatedAccount.success) {
      message.success({
        content: "Account settings have been successfully saved.",
        key: updatingSettings,
        duration: 2,
        style: styleNotification,
      });
      dispatch(
        accountActions.setUpdateAccount({ ...updatedAccount, success: false })
      );
      dispatch(accountActions.resetUpdateAccount(null));
      let fAccount = {
        id: updatedAccount.data.id,
        settings: updatedAccount.data.settings,
        peer_login_expiration_formatted: secondsToExpiresIn(
          updatedAccount.data.settings.peer_login_expiration,
          ["hour", "day"]
        ),
        peer_login_expiration_enabled:
          updatedAccount.data.settings.peer_login_expiration_enabled,
      } as FormAccount;
      setFormAccount(fAccount);
    } else if (updatedAccount.error) {
      let errorMsg = "Failed to update account settings";
      switch (updatedAccount.error.statusCode) {
        case 403:
          errorMsg =
            "Failed to update account settings. You might not have enough permissions.";
          break;
        default:
          errorMsg = updatedAccount.error.data.message
            ? updatedAccount.error.data.message
            : errorMsg;
          break;
      }
      message.error({
        content: errorMsg,
        key: updatingSettings,
        duration: 5,
        style: styleNotification,
      });
    }
  }, [updatedAccount]);

  const handleFormSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        confirmSave({
          ...values,
          peer_login_expiration_enabled: formPeerExpirationEnabled,
        });
      })
      .catch((errorInfo) => {
        let msg = "please check the fields and try again";
        if (errorInfo.errorFields) {
          msg = errorInfo.errorFields[0].errors[0];
        }
        message.error({
          content: msg,
          duration: 1,
        });
      });
  };

  const createAccountToSave = (values: FormAccount): Account => {
    return {
      id: formAccount.id,
      settings: {
        peer_login_expiration: expiresInToSeconds(
          values.peer_login_expiration_formatted
        ),
        peer_login_expiration_enabled: values.peer_login_expiration_enabled,
      },
    } as Account;
  };

  const confirmSave = (newValues: FormAccount) => {
    if (
      newValues.peer_login_expiration_enabled !==
      formAccount.peer_login_expiration_enabled
    ) {
      let content = newValues.peer_login_expiration_enabled
        ? "Enabling peer expiration will cause some peers added with the SSO login to disconnect, and re-authentication will be required. Do you want to enable peer login expiration?"
        : "Disabling peer expiration will cause peers added with the SSO login never to expire. For security reasons, keeping peers expiring periodically is usually better. Do you want to disable peer login expiration?";
      confirmModal.confirm({
        icon: <ExclamationCircleOutlined />,
        title: "Before you update your account settings.",
        width: 600,
        okText: newValues.peer_login_expiration_enabled ? "Enable" : "Disable",
        content: content,
        onOk() {
          saveAccount(newValues);
        },
        onCancel() {},
      });
    } else {
      saveAccount(newValues);
    }
  };

  const saveAccount = (newValues: FormAccount) => {
    let accountToSave = createAccountToSave(newValues);
    dispatch(
      accountActions.updateAccount.request({
        getAccessTokenSilently: getTokenSilently,
        payload: accountToSave,
      })
    );
  };

  const isDisabled = (group: any) => {
    if (
      (group.accessControl && group.accessControl.length > 0) ||
      (group.nameservers && group.nameservers.length > 0) ||
      (group.peers_count && group.peers_count > 0) ||
      (group.routes && group.routes.length > 0) ||
      (group.setupKey && group.setupKey.length > 0) ||
      (group.user && group.user.length > 0)
    ) {
      return true;
    }
    return false;
  };

  const showConfirmDelete = (record: any) => {
    console.log("record", record);
    confirm({
      icon: <ExclamationCircleOutlined />,
      title: <span className="font-500">Delete group {record.name}</span>,
      okText: "Delete",
      width: 600,
      content: (
        <Space direction="vertical" size="small">
          <Paragraph>Are you sure you want to delete this group?</Paragraph>
        </Space>
      ),
      okType: "danger",
      onOk() {
        dispatch(
          groupActions.deleteGroup.request({
            getAccessTokenSilently: getTokenSilently,
            payload: record.id,
          })
        );
      },
      onCancel() {},
    });
  };
  const deleteKey = "deleting";
  useEffect(() => {
    const style = { marginTop: 85 };
    if (deleteGroup.loading) {
      message.loading({ content: "Deleting...", key: deleteKey, style });
    } else if (deleteGroup.success) {
      message.success({
        content: "Group has been successfully deleted.",
        key: deleteKey,
        duration: 2,
        style,
      });
      // dispatch(routeActions.resetDeletedRoute(null));
    } else if (deleteGroup.error) {
      message.error({
        content:
          "Failed to remove group. You might not have enough permissions.",
        key: deleteKey,
        duration: 2,
        style,
      });
      // dispatch(routeActions.resetDeletedRoute(null));
    }
  }, [deleteGroup]);

  return (
    <>
      <Container style={{ paddingTop: "40px" }}>
        <Row>
          <Col span={24}>
            <Title className="page-heading">Settings</Title>
            <Paragraph type="secondary">
              Manage your account's settings
            </Paragraph>
            <Space
              direction="vertical"
              size="large"
              style={{ display: "flex" }}
            >
              <Form
                name="basic"
                autoComplete="off"
                form={form}
                onFinish={handleFormSubmit}
              >
                <Card loading={loading} defaultValue={"Enabled"}>
                  <div
                    style={{
                      color: "rgba(0, 0, 0, 0.88)",
                      fontWeight: "500",
                      fontSize: "22px",
                      marginBottom: "20px",
                    }}
                  >
                    Authentication
                  </div>
                  <Row>
                    <Col span={12}>
                      <Form.Item name="peer_login_expiration_enabled" label="">
                        <div
                          style={{
                            display: "flex",
                            gap: "15px",
                          }}
                        >
                          <Switch
                            onChange={(checked) => {
                              setFormPeerExpirationEnabled(checked);
                            }}
                            size="small"
                            checked={formPeerExpirationEnabled}
                          />
                          <div>
                            <label
                              style={{
                                color: "rgba(0, 0, 0, 0.88)",
                                fontSize: "14px",
                                fontWeight: "500",
                              }}
                            >
                              Peer login expiration{" "}
                              <Tooltip
                                title="Peer login expiration allows to periodically
                                request re-authentication of peers that were
                                added with the SSO login. You can disable the
                                expiration per peer in the peers tab."
                              >
                                <Text
                                  style={{
                                    marginLeft: "5px",
                                    fontSize: "14px",
                                    color: "#bdbdbe",
                                  }}
                                  type={"secondary"}
                                >
                                  <QuestionCircleFilled />
                                </Text>
                              </Tooltip>
                            </label>
                            <Paragraph
                              type={"secondary"}
                              style={{
                                marginTop: "-2",
                                fontWeight: "400",
                                marginBottom: "0",
                              }}
                            >
                              Request periodic re-authentication of peers
                              registered with SSO
                            </Paragraph>
                          </div>
                        </div>
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row>
                    <Col span={12}>
                      <label
                        style={{
                          color: "rgba(0, 0, 0, 0.88)",
                          fontSize: "14px",
                          fontWeight: "500",
                        }}
                      >
                        Peer login expires in
                      </label>
                      <Paragraph
                        type={"secondary"}
                        style={{
                          marginTop: "-2",
                          fontWeight: "400",
                          marginBottom: "5px",
                        }}
                      >
                        Time after which every peer added with SSO login will
                        require re-authentication
                      </Paragraph>
                    </Col>
                  </Row>

                  <Form.Item
                    name="peer_login_expiration_formatted"
                    rules={[{ validator: checkExpiresIn }]}
                  >
                    <ExpiresInInput
                      disabled={!formPeerExpirationEnabled}
                      options={Array.of(
                        { key: "hour", title: "Hours" },
                        {
                          key: "day",
                          title: "Days",
                        }
                      )}
                    />
                  </Form.Item>

                  <Col
                    span={24}
                    style={{ marginTop: "10px", marginBottom: "24px" }}
                  >
                    <Text type={"secondary"}>
                      Learn more about
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href="https://docs.netbird.io/how-to/enforce-periodic-user-authentication"
                      >
                        {" "}
                        login expiration
                      </a>
                    </Text>
                  </Col>
                  <Form.Item style={{ marginBottom: "0" }}>
                    <Button type="primary" htmlType="submit">
                      Save
                    </Button>
                  </Form.Item>
                </Card>
              </Form>
            </Space>
          </Col>
        </Row>

        <Row style={{ marginTop: "20px", width: "100%" }}>
          <Col span={24}>
            <Card
              bordered={true}
              loading={loading}
              style={{ marginBottom: "7px", width: "100%" }}
            >
              <div>
                <Paragraph
                  style={{
                    textAlign: "left",
                    whiteSpace: "pre-line",
                    fontSize: "18px",
                    fontWeight: "500",
                  }}
                >
                  Groups
                </Paragraph>
                <Row
                  gutter={21}
                  style={{ marginTop: "-16px", marginBottom: "10px" }}
                >
                  <Col
                    xs={24}
                    sm={24}
                    md={20}
                    lg={20}
                    xl={20}
                    xxl={20}
                    span={20}
                  >
                    <Paragraph
                      type={"secondary"}
                      style={{ textAlign: "left", whiteSpace: "pre-line" }}
                    >
                      Groups heading here
                    </Paragraph>
                  </Col>
                </Row>
                <Table
                  size={"small"}
                  style={{ marginTop: "-10px" }}
                  showHeader={false}
                  scroll={{ x: 800 }}
                  pagination={{
                    pageSize,
                    showSizeChanger: false,
                    showTotal: (total, range) =>
                      `Showing ${range[0]} to ${range[1]} of ${total} groups`,
                  }}
                  loading={TableSpin(
                    groupsLoading ||
                      setupKeysLoading ||
                      policiesLoading ||
                      routesLoading ||
                      nsGrouploading
                  )}
                  dataSource={filterGroup}
                >
                  <Column
                    className={"non-highlighted-table-column"}
                    sorter={(a, b) =>
                      (a as any).name.localeCompare((b as any).name)
                    }
                    defaultSortOrder="ascend"
                    render={(text, record, index) => {
                      return (
                        <>
                          <Row>
                            <Col>
                              <Paragraph
                                style={{
                                  margin: "0px",
                                  padding: "0px",
                                }}
                              >
                                Group Name
                              </Paragraph>
                              <Paragraph
                                type={"secondary"}
                                style={{
                                  fontSize: "13px",
                                  fontWeight: "400",
                                  margin: "0px",
                                  marginTop: "-2px",
                                  padding: "0px",
                                }}
                              >
                                {(record as any).name}
                              </Paragraph>
                            </Col>
                          </Row>
                        </>
                      );
                    }}
                  />

                  <Column
                    className={"non-highlighted-table-column"}
                    render={(text, record, index) => {
                      return (
                        <>
                          <Row>
                            <Col>
                              <Paragraph
                                type={"secondary"}
                                style={{ textAlign: "left", fontSize: "11px" }}
                              >
                                Peers
                              </Paragraph>
                              <Paragraph
                                type={"secondary"}
                                style={{
                                  textAlign: "left",
                                  marginTop: "-10px",
                                  marginBottom: "0",
                                  fontSize: "15px",
                                }}
                              >
                                {(record as any).peers_count}
                              </Paragraph>
                            </Col>
                          </Row>
                        </>
                      );
                    }}
                  />

                  <Column
                    className={"non-highlighted-table-column"}
                    render={(text, record: any, index) => {
                      return (
                        <>
                          <Row>
                            <Col>
                              <Paragraph
                                type={"secondary"}
                                style={{ textAlign: "left", fontSize: "11px" }}
                              >
                                Access Controls
                              </Paragraph>
                              <Paragraph
                                type={"secondary"}
                                style={{
                                  textAlign: "left",
                                  marginTop: "-10px",
                                  marginBottom: "0",
                                  fontSize: "15px",
                                }}
                              >
                                {record.accessControl &&
                                  record.accessControl.length}
                              </Paragraph>
                            </Col>
                          </Row>
                        </>
                      );
                    }}
                  />

                  <Column
                    className={"non-highlighted-table-column"}
                    render={(text, record: any, index) => {
                      return (
                        <>
                          <Row>
                            <Col>
                              <Paragraph
                                type={"secondary"}
                                style={{ textAlign: "left", fontSize: "11px" }}
                              >
                                DNS
                              </Paragraph>
                              <Paragraph
                                type={"secondary"}
                                style={{
                                  textAlign: "left",
                                  marginTop: "-10px",
                                  marginBottom: "0",
                                  fontSize: "15px",
                                }}
                              >
                                {record.nameservers &&
                                  record.nameservers.length}
                              </Paragraph>
                            </Col>
                          </Row>
                        </>
                      );
                    }}
                  />

                  <Column
                    className={"non-highlighted-table-column"}
                    render={(text, record: any, index) => {
                      return (
                        <>
                          <Row>
                            <Col>
                              <Paragraph
                                type={"secondary"}
                                style={{ textAlign: "left", fontSize: "11px" }}
                              >
                                Routes
                              </Paragraph>
                              <Paragraph
                                type={"secondary"}
                                style={{
                                  textAlign: "left",
                                  marginTop: "-10px",
                                  marginBottom: "0",
                                  fontSize: "15px",
                                }}
                              >
                                {record.routes && record.routes.length}
                              </Paragraph>
                            </Col>
                          </Row>
                        </>
                      );
                    }}
                  />

                  <Column
                    className={"non-highlighted-table-column"}
                    render={(text, record: any, index) => {
                      return (
                        <>
                          <Row>
                            <Col>
                              <Paragraph
                                type={"secondary"}
                                style={{ textAlign: "left", fontSize: "11px" }}
                              >
                                Setup Keys
                              </Paragraph>
                              <Paragraph
                                type={"secondary"}
                                style={{
                                  textAlign: "left",
                                  marginTop: "-10px",
                                  marginBottom: "0",
                                  fontSize: "15px",
                                }}
                              >
                                {record.setupKey && record.setupKey.length}
                              </Paragraph>
                            </Col>
                          </Row>
                        </>
                      );
                    }}
                  />

                  <Column
                    className={"non-highlighted-table-column"}
                    render={(text, record: any, index) => {
                      return (
                        <>
                          <Row>
                            <Col>
                              <Paragraph
                                type={"secondary"}
                                style={{ textAlign: "left", fontSize: "11px" }}
                              >
                                Users
                              </Paragraph>
                              <Paragraph
                                type={"secondary"}
                                style={{
                                  textAlign: "left",
                                  marginTop: "-10px",
                                  marginBottom: "0",
                                  fontSize: "15px",
                                }}
                              >
                                {record.user && record.user.length}
                              </Paragraph>
                            </Col>
                          </Row>
                        </>
                      );
                    }}
                  />
                  <Column
                    align="right"
                    render={(text, record, index) => {
                      const isButtonDisabled = isDisabled(record);

                      return (
                        <Tooltip
                          className="delete-button"
                          title={isButtonDisabled ? "here is toopl tip" : ""}
                        >
                          <Button
                            danger={true}
                            type={"text"}
                            disabled={isButtonDisabled}
                            onClick={() => {
                              showConfirmDelete(record);
                            }}
                          >
                            Delete
                          </Button>
                        </Tooltip>
                      );
                    }}
                  />
                </Table>
              </div>
            </Card>
          </Col>
        </Row>
      </Container>
      {confirmModalContextHolder}
    </>
  );
};

export default Settings;
