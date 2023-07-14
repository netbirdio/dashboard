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
} from "antd";
import { useGetTokenSilently } from "../utils/token";
import { useGetGroupTagHelpers } from "../utils/groups";
import { Container } from "../components/Container";
import ExpiresInInput, {
  expiresInToSeconds,
  secondsToExpiresIn,
} from "./ExpiresInInput";
import { checkExpiresIn } from "../utils/common";
import { actions as accountActions } from "../store/account";
import { Account, FormAccount } from "../store/account/types";
import {
  ExclamationCircleOutlined,
  QuestionCircleFilled,
} from "@ant-design/icons";

const { Title, Paragraph, Text } = Typography;

const styleNotification = { marginTop: 85 };

export const Settings = () => {
  const { getTokenSilently } = useGetTokenSilently();
  const dispatch = useDispatch();

  const {} = useGetGroupTagHelpers();

  const accounts = useSelector((state: RootState) => state.account.data);
  const failed = useSelector((state: RootState) => state.account.failed);
  const loading = useSelector((state: RootState) => state.account.loading);
  const updatedAccount = useSelector(
    (state: RootState) => state.account.updatedAccount
  );
  const users = useSelector((state: RootState) => state.user.data);
  const [formAccount, setFormAccount] = useState({} as FormAccount);
  const [accountToAction, setAccountToAction] = useState({} as FormAccount);
  const [formPeerExpirationEnabled, setFormPeerExpirationEnabled] =
    useState(true);
  const [confirmModal, confirmModalContextHolder] = Modal.useModal();

  const [form] = Form.useForm();
  useEffect(() => {
    dispatch(
      accountActions.getAccounts.request({
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
                        <Form.Item
                          name="peer_login_expiration_enabled"
                          label=""
                        >
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
                                      fontSize: "12px",
                                      color: "#1677ff",
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
      </Container>
      {confirmModalContextHolder}
    </>
  );
};

export default Settings;
