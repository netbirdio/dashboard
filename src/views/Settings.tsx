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
  Select,
  Radio,
  Input,
  RadioChangeEvent,
  Menu,
  MenuProps,
} from "antd";
import { filter } from "lodash";
import { isLocalDev, isNetBirdHosted } from "../utils/common";
import { storeFilterState, getFilterState } from "../utils/filterState";
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
  SettingOutlined,
} from "@ant-design/icons";
import { actions as groupActions } from "../store/group";
import { actions as setupKeyActions } from "../store/setup-key";
import { actions as policyActions } from "../store/policy";
import { actions as nsGroupActions } from "../store/nameservers";
import { actions as routeActions } from "../store/route";
import { actions as userActions } from "../store/user";
import {useOidc} from "@axa-fr/react-oidc";
import {getConfig} from "../config";

const { Title, Paragraph, Text } = Typography;

const styleNotification = { marginTop: 85 };

export const Settings = () => {
  const { logout } = useOidc();
  const { getTokenSilently } = useGetTokenSilently();
  const dispatch = useDispatch();
  const { pageSize, onChangePageSize, pageSizeOptions } = usePageSizeHelpers(
    getFilterState("groupsManagementPage", "pageSize")
      ? getFilterState("groupsManagementPage", "pageSize")
      : 10
  );
  const [optionOnOff, setOptionOnOff] = useState(
    getFilterState("groupsManagementPage", "usedFilter")
      ? getFilterState("groupsManagementPage", "usedFilter")
      : "used"
  );

  const optionsOnOff = [
    { label: "Used", value: "used" },
    { label: "Unused", value: "unused" },
  ];

  const [groupsClicked, setGroupsClicked] = useState(false);
  const [billingClicked, setBillingClicked] = useState(false);
  const [authClicked, setAuthClicked] = useState(true);
  const [dangerClicked, setDangerClicked] = useState(false);
  const [accountDeleting, setAccountDeleting] = useState(false);

  const [isOwner, setIsOwner] = useState(false);


  const [filterGroup, setFilterGroup] = useState([]);
  const [textToSearch, setTextToSearch] = useState(
    getFilterState("groupsManagementPage", "search")
      ? getFilterState("groupsManagementPage", "search")
      : ""
  );

  const {} = useGetGroupTagHelpers();

  const accounts = useSelector((state: RootState) => state.account.data);
  const accountDeleted = useSelector((state: RootState) => state.account.deleteAccount);
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
  const [formPeerApprovalEnabled, setFormPeerApprovalEnabled] =
    useState(false);
  const [jwtGroupsEnabled, setJwtGroupsEnabled] = useState(true);
  const [groupsPropagationEnabled, setGroupsPropagationEnabled] =
    useState(true);
  const [jwtGroupsClaimName, setJwtGroupsClaimName] = useState("");
  const [confirmModal, confirmModalContextHolder] = Modal.useModal();
  const { confirm } = Modal;

  const [form] = Form.useForm();

  useEffect(() => {
    if (users) {
      let currentUser = users.find((user) => user?.is_current);
      if (currentUser) {
        setIsOwner(currentUser.role === "owner");
      }
    }
  }, [users]);

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

  const onChangeTextToSearch = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    storeFilterState("groupsManagementPage", "search", e.target.value);
    setTextToSearch(e.target.value);
  };

  const onChangeOnOff = ({ target: { value } }: RadioChangeEvent) => {
    storeFilterState("groupsManagementPage", "usedFilter", value);
    setOptionOnOff(value);
    renderDataTable();
  };

  useEffect(() => {
    if (accountDeleted.success) {
      showDeleteAccountMSG()
      return
    }

    if (accountDeleted.failure) {
      setAccountDeleting(false)
      return
    }
  }, [accountDeleted]);

  useEffect(() => {
    if (accounts.length < 1 && accountDeleting) {
      return;
    }
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
      jwt_groups_enabled: account.settings.jwt_groups_enabled,
      jwt_groups_claim_name: account.settings.jwt_groups_claim_name,
      groups_propagation_enabled: account.settings.groups_propagation_enabled,
      peer_approval_enabled: account.settings.extra ? account.settings.extra.peer_approval_enabled : false,
    } as FormAccount;
    setFormAccount(fAccount);
    setFormPeerExpirationEnabled(fAccount.peer_login_expiration_enabled);
    setFormPeerApprovalEnabled(fAccount.peer_approval_enabled);
    setJwtGroupsEnabled(fAccount.jwt_groups_enabled);
    setGroupsPropagationEnabled(fAccount.groups_propagation_enabled);
    setJwtGroupsClaimName(fAccount.jwt_groups_claim_name);
    form.setFieldsValue(fAccount);
  }, [accounts]);

  useEffect(() => {
    if (groups && setupKeys && nsGroup && routes && users && policies) {
      renderDataTable();
    }
  }, [
    groups,
    setupKeys,
    nsGroup,
    routes,
    users,
    policies,
    optionOnOff,
    textToSearch,
  ]);

  const renderDataTable = () => {
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
      if (aControl.rules[0].destinations) {
        aControl.rules[0].destinations.forEach((destination: any) => {
          if (cSingleAccessArray.indexOf(destination.id) === -1) {
            cSingleAccessArray.push(destination.id);
          }
        });
      }
      if (aControl.rules[0].sources) {
        aControl.rules[0].sources.forEach((source: any) => {
          if (cSingleAccessArray.indexOf(source.id) === -1) {
            cSingleAccessArray.push(source.id);
          }
        });
      }

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

    const searchString = textToSearch.toLowerCase().trim();
    let f: any = filter(mapForAccesControl, (f: any) =>
      f.name.toLowerCase().includes(searchString)
    );

    if (optionOnOff === "used") {
      const filterUnused = f.filter((item: any) => {
        if (isDisabled(item)) {
          return item;
        }
      });
      setFilterGroup(filterUnused);
    } else {
      const filterUnused = f.filter((item: any) => {
        if (!isDisabled(item)) {
          return item;
        }
      });
      setFilterGroup(filterUnused);
    }
  };

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
        jwt_groups_enabled: updatedAccount.data.settings.jwt_groups_enabled,
        jwt_groups_claim_name:
          updatedAccount.data.settings.jwt_groups_claim_name,
        groups_propagation_enabled:
          updatedAccount.data.settings.groups_propagation_enabled,
        peer_approval_enabled: updatedAccount.data.settings.extra.peer_approval_enabled
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
          jwt_groups_enabled: jwtGroupsEnabled,
          jwt_groups_claim_name: jwtGroupsClaimName,
          groups_propagation_enabled: groupsPropagationEnabled,
          peer_approval_enabled: formPeerApprovalEnabled,
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
        jwt_groups_enabled: jwtGroupsEnabled,
        jwt_groups_claim_name: jwtGroupsClaimName,
        groups_propagation_enabled: groupsPropagationEnabled,
        extra: {
          peer_approval_enabled: values.peer_approval_enabled
        }
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

  const showConfirmDeleteGroup = (record: any) => {
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

  const showConfirmDeleteAccount = () => {
    confirm({
      icon: <ExclamationCircleOutlined />,
      title: <span className="font-500">Delete NetBird Account</span>,
      okText: "Delete",
      width: 600,
      content: (
          <Space direction="vertical" size="small">
            <Paragraph>Are you sure you want to delete your NetBird account?</Paragraph>
          </Space>
      ),
      okType: "danger",
      onOk() {
        setAccountDeleting(true)
        dispatch(
            accountActions.deleteAccount.request({
              getAccessTokenSilently: getTokenSilently,
              payload: accounts[0].id,
            })
        );
      },
      onCancel() {},
    });
  };
  const config = getConfig();
  const showDeleteAccountMSG = () => {
    setTimeout(
        () => {logout("",{client_id: config.clientId})}, 5000);
    confirm({
      icon: <ExclamationCircleOutlined />,
      title: <span className="font-500">NetBird Account deleted</span>,
      okText: "Logout now",
      width: 600,
      content: (
          <Space direction="vertical" size="small">
            <Paragraph>Your account has been deleted. Your session will log out from your session in 5 seconds.</Paragraph>
          </Space>
      ),
      okType: "primary",
      onOk() {
        logout("",{client_id: config.clientId})
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

  type MenuItem = Required<MenuProps>["items"][number];

  const onClick: MenuProps["onClick"] = (e) => {
    switch (e.key) {
      case "auth":
        setAuthClicked(true);
        setGroupsClicked(false);
        setBillingClicked(false);
        setDangerClicked(false);
        break;
      case "groups":
        setGroupsClicked(true);
        setBillingClicked(false);
        setAuthClicked(false);
        setDangerClicked(false);
        break;
      case "billing":
        setBillingClicked(true);
        setAuthClicked(false);
        setGroupsClicked(false);
        setDangerClicked(false);
        break;
      case "danger":
        setBillingClicked(false);
        setAuthClicked(false);
        setGroupsClicked(false);
        setDangerClicked(true);
        break;
    }
  };

  function getItem(
    label: React.ReactNode,
    key: React.Key,
    icon?: React.ReactNode,
    children?: MenuItem[],
    type?: "group",
    disabled?: boolean
  ): MenuItem {
    return {
      key,
      icon,
      children,
      label,
      type,
      disabled,
    } as MenuItem;
  }

  const items: MenuItem[] = [
    getItem(
      "System settings",
      "sub2",
      <SettingOutlined />,
      [getItem("Authentication", "auth"), getItem("Groups", "groups"), getItem("Danger zone", "danger", undefined, undefined, undefined, !isOwner)],
      "group"
    ),
  ];

  useEffect(() => {}, [groupsClicked, billingClicked, authClicked, dangerClicked]);
  const renderGroupsSettingForm = () => {
    return(
        <>
          <div
              style={{
                color: "rgba(0, 0, 0, 0.88)",
                fontWeight: "500",
                fontSize: "18px",
                marginBottom: "20px",
              }}
          >
            User groups
          </div>
          <div>
            <Row>
              <Col span={12}>
                <Form.Item name="groups_propagation_enabled" label="">
                  <div
                      style={{
                        display: "flex",
                        gap: "15px",
                      }}
                  >
                    <Switch
                        onChange={(checked) => {
                          setGroupsPropagationEnabled(checked);
                        }}
                        size="small"
                        checked={groupsPropagationEnabled}
                    />
                    <div>
                      <label
                          style={{
                            color: "rgba(0, 0, 0, 0.88)",
                            fontSize: "14px",
                            fontWeight: "500",
                          }}
                      >
                        Enable user group propagation
                        <Tooltip title="The user group propagation will take effect on the next auto-groups update for a user.">
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
                        Allow group propagation from user’s auto-groups to
                        peers, sharing membership information
                      </Paragraph>
                    </div>
                  </div>
                </Form.Item>
              </Col>
            </Row>
            {(!isNetBirdHosted() || isLocalDev()) && (
                <>
                  <Row>
                    <Col span={12}>
                      <Form.Item name="jwt_groups_enabled" label="">
                        <div
                            style={{
                              display: "flex",
                              gap: "15px",
                            }}
                        >
                          <Switch
                              onChange={(checked) => {
                                setJwtGroupsEnabled(checked);
                              }}
                              size="small"
                              checked={jwtGroupsEnabled}
                          />
                          <div>
                            <label
                                style={{
                                  color: "rgba(0, 0, 0, 0.88)",
                                  fontSize: "14px",
                                  fontWeight: "500",
                                }}
                            >
                              Enable JWT group sync
                            </label>
                            <Paragraph
                                type={"secondary"}
                                style={{
                                  marginTop: "-2",
                                  fontWeight: "400",
                                  marginBottom: "0",
                                }}
                            >
                              Extract & sync groups from JWT claims with user’s
                              auto-groups, auto-creating groups from tokens.
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
                        JWT claim
                      </label>
                      <Paragraph
                          type={"secondary"}
                          style={{
                            marginTop: "-2",
                            fontWeight: "400",
                            marginBottom: "5px",
                          }}
                      >
                        Specify the JWT claim for extracting group names, e.g.,
                        roles or groups, to add to account groups (this claim should contain a list of group names).
                      </Paragraph>
                    </Col>
                  </Row>
                  <Row>
                    <Col lg={6}>
                      <Form.Item name="jwt_groups_claim_name">
                        <Input
                            value={jwtGroupsClaimName}
                            autoComplete="off"
                            onKeyDown={(event) => {
                              if (event.code === "Space") event.preventDefault();
                            }}
                            onChange={(e) => {
                              let val = e.target.value;
                              var t = val.replace(/ /g, "");
                              setJwtGroupsClaimName(t);
                            }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </>
            )}
          </div>
        </>
    )
  }

  const renderAuthSettingsForm = () => {
    return (
        <>
          <div
              style={{
                color: "rgba(0, 0, 0, 0.88)",
                fontWeight: "500",
                fontSize: "18px",
                marginBottom: "20px",
              }}
          >
            Authentication
          </div>
          <div >
            <Row>
              <Col span={12}>
                {(isNetBirdHosted() || isLocalDev()) && <Form.Item name="peer_approval_enabled" label="">
                  <div
                      style={{
                        display: "flex",
                        gap: "15px",
                      }}
                  >
                    <Switch
                        onChange={(checked) => {
                          setFormPeerApprovalEnabled(checked);
                        }}
                        size="small"
                        checked={formPeerApprovalEnabled}
                    />
                    <div>
                      <label
                          style={{
                            color: "rgba(0, 0, 0, 0.88)",
                            fontSize: "14px",
                            fontWeight: "500",
                          }}
                      >
                        Peer approval{" "}
                        <Tooltip
                            title="Peer approval requires that every newly added peer
                          will require approval by an administrator before it can connect to other peers.
                          You can approve peers in the peers tab."
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
                        Require peers to be approved by an administrator
                      </Paragraph>
                    </div>
                  </div>
                </Form.Item>}
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
                        Request periodic re-authentication of peers registered
                        with SSO
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
                  Time after which every peer added with SSO login will require
                  re-authentication
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
          </div>
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
        </>
    )
  }

  const renderDangerSettingsForm = () => {
    return (
        <>
          <div
              style={{
                color: "rgba(0, 0, 0, 0.88)",
                fontWeight: "500",
                fontSize: "18px",
                marginBottom: "20px",
              }}
          >
            Danger zone
          </div>
          <div >
            <Row>
              <Col span={12}>
                <Form.Item label="">
                  <div
                      style={{
                        display: "flex",
                        gap: "15px",
                      }}
                  >
                    <div>
                      <label
                          style={{
                            // color: "rgba(0, 0, 0, 0.88)",
                            color: "red",
                            fontSize: "14px",
                            fontWeight: "500",
                          }}
                      >
                        Delete NetBird account
                      </label>
                      <Paragraph
                          type={"secondary"}
                          style={{
                            marginTop: "-2",
                            fontWeight: "500",
                            marginBottom: "0",
                          }}
                      >
                        Before proceeding to delete your Netbird account, please be aware that this action is irreversible.
                        Once your account is deleted, you will permanently lose access to all associated data,
                        including your peers, users, groups, policies, and routes.
                      </Paragraph>
                    </div>
                  </div>
                </Form.Item>
                <Form.Item style={{ marginBottom: "0" }}>
                  <Button
                      danger
                      onClick={showConfirmDeleteAccount}>
                    Delete account
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          </div>
        </>
    )
  }

  const renderSettingForm = () => {
    let loaded = renderAuthSettingsForm()
    if(groupsClicked) {
      loaded = renderGroupsSettingForm()
    }
    if (dangerClicked) {
        loaded = renderDangerSettingsForm()
    }

    return (
      <Form
        name="basic"
        autoComplete="off"
        form={form}
        onFinish={handleFormSubmit}
      >
        <Card loading={loading} defaultValue={"Enabled"}>
          {loaded}
          {!dangerClicked && (<Form.Item style={{ marginBottom: "0" }}>
            <Button type="primary" htmlType="submit">
              Save
            </Button>
          </Form.Item>)}
        </Card>
      </Form>
    );
  };
  return (
    <>
      <Container style={{ paddingTop: "40px" }}>
        {/*<Title className="page-heading">Settings</Title>
        <Paragraph type="secondary">
          Manage the settings of your account
        </Paragraph>*/}
        <Row style={{ gap: "10px", flexFlow: "row" }} className="setting-nav">
          <Col span={4}>
            <Menu
              items={items}
              onClick={onClick}
              defaultSelectedKeys={["auth"]}
              style={{ borderInlineEnd: "none" }}
            ></Menu>
          </Col>
          <Col span={20}>
            {authClicked && (
              <Row style={{ marginTop: "0", width: "100%" }}>
                <Col span={24}>{renderSettingForm()}</Col>
              </Row>
            )}
            {groupsClicked && (
              <>
                <Row
                  style={{
                    marginTop: "0",
                    marginBottom: "20px",
                    width: "100%",
                  }}
                >
                  <Col span={24}>{renderSettingForm()}</Col>
                </Row>
                <Row style={{ marginTop: "0", width: "100%" }}>
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
                              style={{
                                textAlign: "left",
                                whiteSpace: "pre-line",
                              }}
                            >
                              Here is the overview of the groups of your
                              account. You can delete the unused ones.
                            </Paragraph>
                          </Col>
                        </Row>

                        <Row gutter={[16, 24]} style={{ marginBottom: "20px" }}>
                          <Col
                            xs={24}
                            sm={24}
                            md={8}
                            lg={8}
                            xl={8}
                            xxl={8}
                            span={8}
                          >
                            <Input
                              allowClear
                              value={textToSearch}
                              // onPressEnter={searchDataTable}
                              placeholder="Search by group name"
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
                            <Space
                              size="middle"
                              style={{ marginRight: "15px" }}
                            >
                              <Radio.Group
                                options={optionsOnOff}
                                onChange={onChangeOnOff}
                                value={optionOnOff}
                                optionType="button"
                                buttonStyle="solid"
                              />
                              <Select
                                value={pageSize.toString()}
                                options={pageSizeOptions}
                                onChange={(value) => {
                                  onChangePageSize(
                                    value,
                                    "groupsManagementPage"
                                  );
                                }}
                                className="select-rows-per-page-en"
                              />
                            </Space>
                          </Col>
                        </Row>

                        <Table
                          size={"small"}
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
                                          fontWeight: 500,
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
                                        style={{
                                          textAlign: "left",
                                          fontSize: "12px",
                                        }}
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
                                        style={{
                                          textAlign: "left",
                                          fontSize: "12px",
                                        }}
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
                                        style={{
                                          textAlign: "left",
                                          fontSize: "12px",
                                        }}
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
                                        style={{
                                          textAlign: "left",
                                          fontSize: "12px",
                                        }}
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
                                        style={{
                                          textAlign: "left",
                                          fontSize: "12px",
                                        }}
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
                                        {record.setupKey &&
                                          record.setupKey.length}
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
                                        style={{
                                          textAlign: "left",
                                          fontSize: "12px",
                                        }}
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
                                  title={
                                    isButtonDisabled
                                      ? "Remove dependencies to this group to delete it."
                                      : ""
                                  }
                                >
                                  <Button
                                    danger={true}
                                    type={"text"}
                                    disabled={isButtonDisabled}
                                    onClick={() => {
                                      showConfirmDeleteGroup(record);
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
              </>
            )}
            {dangerClicked && (
                <Row style={{ marginTop: "0", width: "100%" }}>
                  <Col span={24}>{renderSettingForm()}</Col>
                </Row>
            )}
          </Col>
        </Row>
      </Container>
      {confirmModalContextHolder}
    </>
  );
};

export default Settings;
