import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  List,
  Modal,
  Row,
  Select,
  Skeleton,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "typesafe-actions";
import { actions as userActions } from "../store/user";
import { FormUser, User, UserToSave } from "../store/user/types";
import { useGetTokenSilently } from "../utils/token";
import React, { useEffect, useState } from "react";
import { RuleObject } from "antd/lib/form";
import { CustomTagProps } from "rc-select/lib/BaseSelect";
import { actions as groupActions } from "../store/group";
import { actions as personalAccessTokenActions } from "../store/personal-access-token";
import {
  PersonalAccessToken,
  PersonalAccessTokenCreate,
  SpecificPAT,
} from "../store/personal-access-token/types";
import tableSpin from "./Spin";
import AddPATPopup from "./popups/AddPATPopup";
import { fullDate } from "../utils/common";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import Column from "antd/lib/table/Column";
import { useOidcUser } from "@axa-fr/react-oidc";
import { useGetGroupTagHelpers } from "../utils/groups";

const { Option } = Select;
const { Meta } = Card;
const { Title, Paragraph, Text } = Typography;

interface TokenDataTable extends PersonalAccessToken {
  key: string;
  status: string;
  created_by_email: string;
}

const UserEdit = (props: any) => {
  const { isGroupUpdateView, setShowGroupModal } = props;

  const { getTokenSilently } = useGetTokenSilently();
  const dispatch = useDispatch();
  const { optionRender, blueTagRender, tagGroups, handleChangeTags } =
    useGetGroupTagHelpers();

  const groups = useSelector((state: RootState) => state.group.data);
  const users = useSelector((state: RootState) => state.user.data);
  const user = useSelector((state: RootState) => state.user.user);
  const savedUser = useSelector((state: RootState) => state.user.savedUser);
  const personalAccessTokens = useSelector(
    (state: RootState) => state.personalAccessToken.data
  );
  const tab = useSelector((state: RootState) => state.user.userTabOpen);

  const loading = useSelector((state: RootState) => state.user.loading);

  const { oidcUser } = useOidcUser();
  const [tokenTable, setTokenTable] = useState([] as TokenDataTable[]);

  // const [tagGroups, setTagGroups] = useState([] as string[])
  const [currentGroups, setCurrentGroups] = useState([] as string[]);

  const [formUser, setFormUser] = useState({} as FormUser);
  const [form] = Form.useForm();
  const [isAdmin, setIsAdmin] = useState(false);

  const [confirmModal, confirmModalContextHolder] = Modal.useModal();

  const onCancel = () => {
    if (savedUser.loading) return;
    dispatch(userActions.setUser(null as unknown as User));
    dispatch(personalAccessTokenActions.resetPersonalAccessTokens(null));
    setFormUser({} as FormUser);
    dispatch(userActions.setEditUserPopupVisible(false));
    if (setShowGroupModal) {
      setShowGroupModal(false);
    }
  };

  const createUserToSave = (values: any): UserToSave => {
    const autoGroups =
      groups
        ?.filter((g) => values.autoGroupsNames.includes(g.id))
        .map((g) => g.id || "") || [];
    // find groups that do not yet exist (newly added by the user)
    const allGroupsNames: string[] = groups?.map((g) => g.id || "");
    const groupsToCreate = values.autoGroupsNames.filter(
      (s: string) => !allGroupsNames.includes(s)
    );
    let userID = user ? user.id : "";
    let isServiceUser = user ? user?.is_service_user : false;
    return {
      id: userID,
      role: values.role,
      name: values.name,
      groupsToCreate: groupsToCreate,
      auto_groups: autoGroups,
      is_service_user: isServiceUser,
      is_blocked: values.is_blocked,
    } as UserToSave;
  };

  useEffect(() => {
    if (users) {
      let currentUser = users.find((user) => user?.is_current);
      if (currentUser) {
        setIsAdmin(currentUser.role === "admin");
      }
    }
  }, [users]);

  const handleFormSubmit = () => {
    form
      .validateFields()
      .then((values) => {
        let userToSave = createUserToSave(values);
        dispatch(
          userActions.saveUser.request({
            getAccessTokenSilently: getTokenSilently,
            payload: userToSave,
          })
        );
        dispatch(userActions.setEditUserPopupVisible(false));
        dispatch(userActions.setUser(null as unknown as User));
        dispatch(personalAccessTokenActions.resetPersonalAccessTokens(null));
        if (setShowGroupModal) {
          setShowGroupModal(false);
        }
      })
      .catch((errorInfo) => {
        console.log("errorInfo", errorInfo);
      });
  };

  const onClickAddNewPersonalAccessToken = () => {
    dispatch(
      personalAccessTokenActions.setPersonalAccessToken({
        user_id: "",
        name: "",
        expires_in: 7,
      } as PersonalAccessTokenCreate)
    );
    dispatch(
      personalAccessTokenActions.setNewPersonalAccessTokenPopupVisible(true)
    );
  };

  const onBreadcrumbUsersClick = (key: string) => {
    if (savedUser.loading) return;
    dispatch(userActions.setUser(null as unknown as User));
    dispatch(personalAccessTokenActions.resetPersonalAccessTokens(null));
    dispatch(userActions.setUserTabOpen(key));
  };

  const selectValidator = (_: RuleObject, value: string[]) => {
    let hasSpaceNamed = [];

    value.forEach(function (v: string) {
      if (!v.trim().length) {
        hasSpaceNamed.push(v);
      }
    });

    if (hasSpaceNamed.length) {
      return Promise.reject(
        new Error("Group names with just spaces are not allowed")
      );
    }

    return Promise.resolve();
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

  const transformTokenTable = (d: PersonalAccessToken[]): TokenDataTable[] => {
    if (!d) {
      return [];
    }
    return d.map(
      (p) =>
        ({
          key: p.id,
          status:
            Date.parse(p.expiration_date) > Date.now() ? "valid" : "expired",
          created_by_email: getEmail(p),
          ...p,
        } as TokenDataTable)
    );
  };

  const getEmail = (token: PersonalAccessToken): string => {
    return users.find((u) => u.id === token.created_by)?.email || "";
  };

  const showConfirmDelete = (token: TokenDataTable) => {
    confirmModal.confirm({
      icon: <ExclamationCircleOutlined />,
      title: <span className="font-500">Delete token {token.name}</span>,
      width: 600,
      content: (
        <Space direction="vertical" size="small">
          <Paragraph>Are you sure you want to delete this token?</Paragraph>
        </Space>
      ),
      onOk() {
        dispatch(
          personalAccessTokenActions.deletePersonalAccessToken.request({
            getAccessTokenSilently: getTokenSilently,
            payload: {
              user_id: user.id,
              id: token.id,
              name: token.name,
            } as SpecificPAT,
          })
        );
      },
      onCancel() {
        // noop
      },
    });
  };

  useEffect(() => {
    setTokenTable(transformTokenTable(personalAccessTokens));
  }, [personalAccessTokens, users]);

  useEffect(() => {
    if (user) {
      // @ts-ignore
      setCurrentGroups(groups.filter((g) => g.name != "All" && user.auto_groups.includes(g.id)).map((g) => g.id) || []
      );
    }
  }, [groups, user]);

  useEffect(() => {
    dispatch(
      userActions.getUsers.request({
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
    if (user?.is_current || user?.is_service_user) {
      dispatch(
        personalAccessTokenActions.getPersonalAccessTokens.request({
          getAccessTokenSilently: getTokenSilently,
          payload: user.id,
        })
      );
    }
  }, [user]);

  useEffect(() => {
    if (user && currentGroups) {
      form.setFieldsValue({
        name: user.name,
        role: user.role,
        email: user.email,
        is_blocked: user.is_blocked,
        autoGroupsNames: currentGroups,
      });
    }
  }, [form, user, currentGroups]);

  return (
    <>
      <div style={{ paddingTop: "13px" }}>
        {!isGroupUpdateView && (
          <Breadcrumb
            style={{ marginBottom: "30px" }}
            items={[
              {
                title: (
                  <a onClick={() => onBreadcrumbUsersClick("Users")}>
                    All Users
                  </a>
                ),
              },
              {
                title: <a onClick={() => onBreadcrumbUsersClick(tab)}>{tab}</a>,
                // menu: { items: menuItems },
              },
              {
                title: user.name,
              },
            ]}
          />
        )}
        <Card
          className={isGroupUpdateView ? " noborderPadding" : ""}
          bordered={true}
          loading={loading}
          style={{ marginBottom: "7px" }}
        >
          <h3
            style={{
              fontSize: "22px",
              fontWeight: "500",
              marginBottom: "25px",
            }}
            className={isGroupUpdateView ? "d-none" : ""}
          >
            {user?.name}
          </h3>

          <div style={{ maxWidth: "800px" }}>
            <Form
              layout="vertical"
              hideRequiredMark
              form={form}
              initialValues={{
                name: formUser.name,
                role: formUser.role,
                email: formUser.email,
                is_blocked: formUser.is_blocked,
                autoGroupsNames: formUser.autoGroupsNames,
              }}
            >
              <Row
                style={{ paddingBottom: "15px" }}
                className={isGroupUpdateView ? "d-none" : ""}
              >
                {!user?.is_service_user && (
                  <Col
                    xs={24}
                    sm={24}
                    md={11}
                    lg={11}
                    xl={11}
                    xxl={11}
                    span={11}
                  >
                    <Form.Item
                      name="email"
                      label={<Text style={{}}>Email</Text>}
                      style={{ marginRight: "70px", fontWeight: "500" }}
                    >
                      <Input
                        disabled={user.id}
                        value={formUser.email}
                        style={{ color: "#8c8c8c" }}
                        autoComplete="off"
                      />
                    </Form.Item>
                  </Col>
                )}
                <Col xs={24} sm={24} md={5} lg={5} xl={5} xxl={5} span={5}>
                  <Form.Item
                    name="role"
                    label={<Text style={{ fontWeight: "500" }}>Role</Text>}
                    style={{ marginRight: "50px", fontWeight: "500" }}
                  >
                    <Select
                      style={{ width: "100%" }}
                      disabled={user?.is_current}
                    >
                      <Option value="admin">
                        <Text type={"secondary"}>admin</Text>
                      </Option>
                      <Option value="user">
                        <Text type={"secondary"}>user</Text>
                      </Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              {!user?.is_service_user && (
                <Row style={{ paddingBottom: "15px" }}>
                  <Col
                    xs={24}
                    sm={24}
                    md={isGroupUpdateView ? 24 : 11}
                    lg={isGroupUpdateView ? 24 : 11}
                    xl={isGroupUpdateView ? 24 : 11}
                    xxl={isGroupUpdateView ? 24 : 11}
                    span={isGroupUpdateView ? 24 : 11}
                  >
                    <Form.Item
                      name="autoGroupsNames"
                      label={
                        <Text style={{ fontWeight: "500" }}>
                          Auto-assigned groups
                        </Text>
                      }
                      tooltip="Every peer enrolled with this user will be automatically added to these groups"
                      rules={[{ validator: selectValidator }]}
                      style={{
                        marginRight: `${!isGroupUpdateView ? "70px" : "0"}`,
                      }}
                    >
                      <Select
                        mode="tags"
                        placeholder="Associate groups with the user"
                        tagRender={blueTagRender}
                        dropdownRender={dropDownRender}
                        disabled={!isAdmin}
                        optionFilterProp="serchValue"
                      >
                        {tagGroups.map((m, index) => (
                          <Option key={index} value={m.id} serchValue={m.name}>
                            {optionRender(m.name, m.id)}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>

                  {!user?.is_current && isAdmin && (
                    <Col
                      xs={24}
                      sm={24}
                      md={5}
                      lg={5}
                      xl={5}
                      xxl={5}
                      span={5}
                      className={isGroupUpdateView ? "d-none" : ""}
                    >
                      <Form.Item
                        valuePropName="checked"
                        name="is_blocked"
                        label="Block user"
                        style={{ marginRight: "50px", fontWeight: "500" }}
                      >
                        <Switch />
                      </Form.Item>
                    </Col>
                  )}
                </Row>
              )}
              <Space
                style={{
                  display: "flex",
                  justifyContent: `${!isGroupUpdateView ? "start" : "end"}`,
                }}
              >
                <Button disabled={loading} onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="primary" onClick={handleFormSubmit}>
                  Save
                </Button>
              </Space>
            </Form>
          </div>
        </Card>

        {user &&
          !isGroupUpdateView &&
          (user?.is_current || user?.is_service_user) && (
            <Card
              bordered={true}
              loading={loading}
              style={{ marginBottom: "7px" }}
            >
              <div style={{ maxWidth: "800px" }}>
                <Paragraph
                  style={{
                    textAlign: "left",
                    whiteSpace: "pre-line",
                    fontSize: "18px",
                    fontWeight: "500",
                  }}
                >
                  Access tokens
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
                      Access tokens give access to NetBird API
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
                    {personalAccessTokens &&
                      personalAccessTokens.length > 0 && (
                        <Button
                          type="primary"
                          onClick={onClickAddNewPersonalAccessToken}
                        >
                          Create token
                        </Button>
                      )}
                  </Col>
                </Row>
                {personalAccessTokens && personalAccessTokens.length > 0 && (
                  <Table
                    size={"small"}
                    style={{ marginTop: "-10px" }}
                    showHeader={false}
                    scroll={{ x: 800 }}
                    pagination={false}
                    loading={tableSpin(loading)}
                    dataSource={tokenTable}
                  >
                    <Column
                      className={"non-highlighted-table-column"}
                      sorter={(a, b) =>
                        (a as TokenDataTable).created_at.localeCompare(
                          (b as TokenDataTable).created_at
                        )
                      }
                      defaultSortOrder="descend"
                      render={(text, record, index) => {
                        return (
                          <>
                            <Row>
                              <Col>
                                <Badge
                                  status={
                                    (record as TokenDataTable).status ===
                                    "valid"
                                      ? "success"
                                      : "error"
                                  }
                                  style={{
                                    marginTop: "1px",
                                    marginRight: "5px",
                                    marginLeft: "0px",
                                  }}
                                />
                              </Col>
                              <Col>
                                <Paragraph
                                  style={{
                                    margin: "0px",
                                    padding: "0px",
                                  }}
                                >
                                  {(record as TokenDataTable).name}
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
                                  {"Created" +
                                    ((record as TokenDataTable)
                                      .created_by_email && user?.is_service_user
                                      ? " by " +
                                        (record as TokenDataTable)
                                          .created_by_email
                                      : "") +
                                    " on " +
                                    fullDate(
                                      (record as TokenDataTable).created_at
                                    )}
                                </Paragraph>
                              </Col>
                            </Row>
                          </>
                        );
                      }}
                    />
                    <Column
                      render={(text, record, index) => {
                        return (
                          <>
                            <Paragraph
                              type={"secondary"}
                              style={{ textAlign: "left", fontSize: "11px" }}
                            >
                              Expires on
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
                              {fullDate(
                                (record as TokenDataTable).expiration_date
                              )}
                            </Paragraph>
                          </>
                        );
                      }}
                    />
                    <Column
                      render={(text, record, index) => {
                        return (
                          <>
                            <Paragraph
                              type={"secondary"}
                              style={{ textAlign: "left", fontSize: "11px" }}
                            >
                              Last used
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
                              {(record as TokenDataTable).last_used
                                ? fullDate((record as TokenDataTable).last_used)
                                : "Never"}
                            </Paragraph>
                          </>
                        );
                      }}
                    />
                    <Column
                      align="right"
                      render={(text, record, index) => {
                        return (
                          <Button
                            danger={true}
                            type={"text"}
                            onClick={() => {
                              showConfirmDelete(record as TokenDataTable);
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
                {(personalAccessTokens === null ||
                  personalAccessTokens.length === 0) && (
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
                      You don’t have any access tokens yet
                    </Paragraph>
                    <Button
                      type="primary"
                      onClick={onClickAddNewPersonalAccessToken}
                    >
                      Create token
                    </Button>
                  </Space>
                )}
              </div>
            </Card>
          )}
      </div>
      <AddPATPopup />
      {confirmModalContextHolder}
    </>
  );
};

export default UserEdit;
