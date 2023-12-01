import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "typesafe-actions";
import { actions as userActions } from "../store/user";
import { Container } from "../components/Container";
import {
  Alert,
  Button,
  Card,
  Col,
  Dropdown,
  Empty,
  Input,
  Menu,
  message,
  Modal,
  Popover,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { User, UserToSave } from "../store/user/types";
import { filter } from "lodash";
import tableSpin from "../components/Spin";
import { useGetTokenSilently } from "../utils/token";
import { actions as groupActions } from "../store/group";
import { Group } from "../store/group/types";
import { TooltipPlacement } from "antd/es/tooltip";
import {
  capitalize,
  isLocalDev,
  isNetBirdHosted,
  timeAgo,
} from "../utils/common";
import { usePageSizeHelpers } from "../utils/pageSize";
import AddServiceUserPopup from "../components/popups/AddServiceUserPopup";
import InviteUserPopup from "../components/popups/InviteUserPopup";
import { Peer, PeerDataTable } from "../store/peer/types";
import { ExclamationCircleOutlined, ReloadOutlined } from "@ant-design/icons";
import { actions as peerActions } from "../store/peer";
import { useOidcUser } from "@axa-fr/react-oidc";
import { storeFilterState, getFilterState } from "../utils/filterState";
import { UpdateUsersGroupModal } from "../components/UpdateUsersGroupModal";
const { Title, Paragraph, Text } = Typography;
const { Column } = Table;

interface UserDataTable extends User {
  key: string;
}

const styleNotification = { marginTop: 85 };

export const RegularUsers = () => {
  const { onChangePageSize, pageSizeOptions, pageSize } = usePageSizeHelpers();
  const { getTokenSilently } = useGetTokenSilently();
  const dispatch = useDispatch();

  const [isAdmin, setIsAdmin] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  const groups = useSelector((state: RootState) => state.group.data);
  const users = useSelector((state: RootState) => state.user.regularUsers);
  const failed = useSelector((state: RootState) => state.user.failed);
  const loading = useSelector((state: RootState) => state.user.loading);
  const deleteUser = useSelector((state: RootState) => state.user.deletedUser);

  const updateUserDrawerVisible = useSelector(
    (state: RootState) => state.user.updateUserDrawerVisible
  );
  const savedUser = useSelector((state: RootState) => state.user.savedUser);

  const [groupPopupVisible, setGroupPopupVisible] = useState("");
  const [userToAction, setUserToAction] = useState(
    null as UserDataTable | null
  );
  const [textToSearch, setTextToSearch] = useState("");
  const [isRefreshButtonDisabled, setIsRefreshButtonDisabled] = useState(false);
  const [dataTable, setDataTable] = useState([] as UserDataTable[]);
  const [confirmModal, confirmModalContextHolder] = Modal.useModal();

  const deleteKey = "deleting";
  useEffect(() => {
    const style = { marginTop: 85 };
    if (deleteUser.loading) {
      message.loading({ content: "Deleting...", key: deleteKey, style });
    } else if (deleteUser.success) {
      message.success({
        content: "User has been successfully deleted.",
        key: deleteKey,
        duration: 2,
        style,
      });
      dispatch(
        userActions.getRegularUsers.request({
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
      dispatch(userActions.resetDeletedUser(null));
    } else if (deleteUser.error) {
      message.error({
        content: "Failed to delete user.",
        key: deleteKey,
        duration: 2,
        style,
      });
      dispatch(userActions.resetDeletedUser(null));
    }
  }, [deleteUser]);

  // setUserAndView makes the UserUpdate drawer visible (right side) and sets the user object
  const setUserAndView = (user: User) => {
    dispatch(userActions.setUpdateUserDrawerVisible(true));
    dispatch(
      userActions.setUser({
        id: user.id,
        email: user.email,
        role: user.role,
        auto_groups: user.auto_groups ? user.auto_groups : [],
        name: user.name,
        is_current: user.is_current,
      } as User)
    );
  };

  const setUserAndViewGroups = (user: User) => {
    dispatch(
      userActions.setUser({
        id: user.id,
        email: user.email,
        role: user.role,
        auto_groups: user.auto_groups ? user.auto_groups : [],
        name: user.name,
        is_current: user.is_current,
      } as User)
    );
    setShowGroupModal(true);
  };

  const transformDataTable = (d: User[]): UserDataTable[] => {
    return d.map((p) => ({ key: p.id, ...p } as UserDataTable));
  };

  useEffect(() => {
    dispatch(
      userActions.getRegularUsers.request({
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
  }, [savedUser]);

  const fetchData = async () => {
    setIsRefreshButtonDisabled(true);
      dispatch(
        userActions.getUsers.request({
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
    dispatch(
      groupActions.getGroups.request({
        getAccessTokenSilently: getTokenSilently,
        payload: null,
      })
    );
    await new Promise((resolve) => setTimeout(resolve, 5000)).then(() =>
      setIsRefreshButtonDisabled(false)
    );
  };

  useEffect(() => {
    if (!loading && groups.length && users) {
      const searchText = getFilterState("userFilter", "search");
      if (searchText) setTextToSearch(searchText);

      const pageSize = getFilterState("userFilter", "pageSize");
      if (pageSize) onChangePageSize(pageSize, "userFilter");

      if (searchText || pageSize) {
        setDataTable(transformDataTable(filterDataTable(searchText)));
      } else {
        setDataTable(transformDataTable(users));
      }
    }
  }, [loading, groups, users]);

  useEffect(() => {
    setDataTable(transformDataTable(filterDataTable("")));
  }, [textToSearch]);

  const filterDataTable = (searchText: string): User[] => {
    const t = searchText
      ? searchText.toLowerCase().trim()
      : textToSearch.toLowerCase().trim();
    let f: User[] = filter(
      users,
      (f: User) =>
        (f.email || f.id).toLowerCase().includes(t) ||
        f.name.toLowerCase().includes(t) ||
        f.role.includes(t) ||
        t === ""
    ) as User[];
    return f;
  };

  const onChangeTextToSearch = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setTextToSearch(e.target.value);
    storeFilterState("userFilter", "search", e.target.value);
  };

  // const searchDataTable = () => {
  //   const data = filterDataTable();
  //   setDataTable(transformDataTable(data));
  // };

  const onClickEdit = () => {
    dispatch(userActions.setUpdateUserDrawerVisible(true));
    dispatch(
      userActions.setUser({
        id: userToAction?.id,
        email: userToAction?.email,
        auto_groups: userToAction?.auto_groups ? userToAction?.auto_groups : [],
        name: userToAction?.name,
        role: userToAction?.role,
        is_blocked: userToAction?.is_blocked,
      } as User)
    );
  };

  const onClickInviteUser = () => {
    dispatch(userActions.setInviteUserPopupVisible(true));
    dispatch(userActions.setUser(null as unknown as User));
  };

  useEffect(() => {
    if (users) {
      let currentUser = users.find((user) => user.is_current);
      if (currentUser) {
        setIsAdmin(currentUser.role === "admin" || currentUser.role === "owner");
      }
    }
  }, [users]);

  const renderPopoverGroups = (
    label: string,
    rowGroups: string[] | string[] | null,
    userToAction: UserDataTable
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
      <Button type="link" onClick={() => setUserAndViewGroups(userToAction)}>
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
            {_g.name}
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
        key={userToAction.id}
        onOpenChange={(b: boolean) =>
          onPopoverVisibleChange(b, userToAction.key)
        }
        open={groupPopupVisible === userToAction.key}
        content={mainContent}
        title={null}
      >
        {btn}
      </Popover>
    );
  };

  useEffect(() => {
    if (updateUserDrawerVisible) {
      setGroupPopupVisible("");
    }
  }, [updateUserDrawerVisible]);

  const createKey = "saving";
  useEffect(() => {
    if (savedUser.loading) {
      message.loading({
        content: "Saving...",
        key: createKey,
        duration: 0,
        style: styleNotification,
      });
    } else if (savedUser.success) {
      message.success({
        content: "User has been successfully saved.",
        key: createKey,
        duration: 2,
        style: styleNotification,
      });
      dispatch(userActions.setUpdateUserDrawerVisible(false));
      dispatch(userActions.setSavedUser({ ...savedUser, success: false }));
      dispatch(userActions.resetSavedUser(null));
      setShowGroupModal(false);
    } else if (savedUser.error) {
      let errorMsg = "Failed to update user";
      switch (savedUser.error.statusCode) {
        case 412:
        case 403:
          if (savedUser.error.data) {
            errorMsg = capitalize(savedUser.error.data.message);
          }
          break;
      }
      message.error({
        content: errorMsg,
        key: createKey,
        duration: 5,
        style: styleNotification,
      });
      dispatch(userActions.setSavedUser({ ...savedUser, error: null }));
      dispatch(userActions.resetSavedUser(null));
    }
  }, [savedUser]);

  const onPopoverVisibleChange = (b: boolean, key: string) => {
    if (updateUserDrawerVisible) {
      setGroupPopupVisible("");
    } else {
      if (b) {
        setGroupPopupVisible(key);
      } else {
        setGroupPopupVisible("");
      }
    }
  };

  const itemsMenuAction = [
    {
      key: "edit",
      label: (
        <Button type="text" onClick={() => onClickEdit()}>
          View
        </Button>
      ),
    },
  ];
  const actionsMenu = <Menu items={itemsMenuAction}></Menu>;

  const handleEditUser = (user: UserDataTable) => {
    dispatch(
      userActions.setUser({
        id: user.id,
        email: user.email,
        role: user.role,
        auto_groups: user.auto_groups ? user.auto_groups : [],
        name: user.name,
        is_current: user.is_current,
        is_service_user: user.is_service_user,
        is_blocked: user.is_blocked,
      } as User)
    );
    dispatch(userActions.setEditUserPopupVisible(true));
  };

  const handleBlockUser = (block: boolean, user: UserDataTable) => {
    if (block) {
      confirmModal.confirm({
        icon: <ExclamationCircleOutlined />,
        title: (
          <span className="font-500">
            Are you sure you want to block {user.name ? user.name : user.id}?
          </span>
        ),
        width: 600,
        content: (
          <Space direction="vertical" size="small">
            <Paragraph>
              Blocking this user will disconnect their devices and disable
              dashboard access.
            </Paragraph>
          </Space>
        ),
        onOk() {
          let userToSave = createUserToSave(user, block);
          dispatch(
            userActions.saveUser.request({
              getAccessTokenSilently: getTokenSilently,
              payload: userToSave,
            })
          );
        },
        onCancel() {
          // noop
        },
      });
    } else {
      let userToSave = createUserToSave(user, block);
      dispatch(
        userActions.saveUser.request({
          getAccessTokenSilently: getTokenSilently,
          payload: userToSave,
        })
      );
    }
  };

  const createUserToSave = (
    values: UserDataTable,
    block: boolean
  ): UserToSave => {
    return {
      id: values.id,
      role: values.role,
      name: values.name,
      groupsToCreate: Array.of(),
      auto_groups: values.auto_groups,
      is_service_user: values.is_service_user,
      is_blocked: block,
    } as UserToSave;
  };

  const handleDeleteUser = (user: UserDataTable) => {
    confirmModal.confirm({
      icon: <ExclamationCircleOutlined />,
      title: (
        <span className="font-500">
          Are you sure you want to delete {user.name ? user.name : user.id}?
        </span>
      ),
      width: 500,
      content: (
        <Space direction="vertical" size="small">
          <Paragraph>
            Deleting this user will remove their devices and remove dashboard
            access.
          </Paragraph>
        </Space>
      ),
      onOk() {
        dispatch(
          userActions.deleteUser.request({
            getAccessTokenSilently: getTokenSilently,
            payload: user.id,
          })
        );
      },
      onCancel() {
        // noop
      },
    });
  };

  return (
    <>
      <Container style={{ padding: "0px" }}>
        <Row>
          <Col span={24}>
            <Paragraph>
              Manage users and their permissions.
              {isNetBirdHosted()
                ? "Same-domain email users are added automatically on first sign-in."
                : ""}
              <a
                target="_blank"
                rel="noreferrer"
                href="https://docs.netbird.io/how-to/add-users-to-your-network"
              >
                {" "}
                Learn more
              </a>
            </Paragraph>
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
                    placeholder="Search by name, email, groups or role..."
                    onChange={onChangeTextToSearch}
                    className="input-search"
                  />
                </Col>
                <Col xs={24} sm={24} md={11} lg={11} xl={11} xxl={11} span={11}>
                  <Space size="middle">
                    <Select
                      style={{ marginRight: "10px" }}
                      value={pageSize.toString()}
                      options={pageSizeOptions}
                      onChange={(value) => {
                        onChangePageSize(value, "userFilter");
                      }}
                      className="select-rows-per-page-en"
                    />
                  </Space>
                  <Tooltip
                    title={
                      isRefreshButtonDisabled
                        ? "You can refresh it again in 5 seconds"
                        : "Refresh"
                    }
                  >
                    <Button
                      onClick={fetchData}
                      disabled={isRefreshButtonDisabled}
                      style={{ marginLeft: "5px", color: "#1890ff" }}
                    >
                      <ReloadOutlined />
                    </Button>
                  </Tooltip>
                </Col>
                <Col xs={24} sm={24} md={5} lg={5} xl={5} xxl={5} span={5}>
                  {(isNetBirdHosted() || isLocalDev()) && (
                    <Row justify="end">
                      <Col>
                        <Button type="primary" onClick={onClickInviteUser}>
                          Invite user
                        </Button>
                      </Col>
                    </Row>
                  )}
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
                    pageSize,
                    showSizeChanger: false,
                    showTotal: (total, range) =>
                      `Showing ${range[0]} to ${range[1]} of ${total} users`,
                  }}
                  className="card-table"
                  showSorterTooltip={false}
                  scroll={{ x: true }}
                  loading={tableSpin(loading)}
                  dataSource={dataTable}
                >
                  <Column
                    title="Email"
                    dataIndex="email"
                    onFilter={(value: string | number | boolean, record) =>
                      (record as any).email.includes(value)
                    }
                    sorter={(a, b) =>
                      (a as any).email.localeCompare((b as any).email)
                    }
                    defaultSortOrder="ascend"
                    render={(text, record, index) => {
                      const btn = (
                        <Button
                          type="text"
                          onClick={() =>
                            handleEditUser(record as UserDataTable)
                          }
                          className="tooltip-label"
                        >
                          <Text className="font-500">
                            {text && text.trim() !== ""
                              ? text
                              : (record as User).id}
                          </Text>
                        </Button>
                      );

                      if ((record as User).is_current) {
                        return (
                          <>
                            <div>
                              {btn}
                              <Tag color="blue">me</Tag>
                            </div>
                            {(isNetBirdHosted() || isLocalDev()) &&
                              (record as User).last_login && (
                                <Text
                                  type={"secondary"}
                                  style={{ paddingLeft: "15px" }}
                                >
                                  Last login:{" "}
                                  {String(timeAgo((record as User).last_login))}
                                </Text>
                              )}
                          </>
                        );
                      }

                      if ((record as User).status === "invited") {
                        return (
                          <>
                            <div>
                              {btn}
                              <Tag color="gold">invited</Tag>
                            </div>
                            {(isNetBirdHosted() || isLocalDev()) &&
                              (record as User).last_login && (
                                <Text
                                  type={"secondary"}
                                  style={{
                                    paddingLeft: "15px",
                                    paddingTop: "0px",
                                  }}
                                >
                                  Last login:{" "}
                                  {String(timeAgo((record as User).last_login))}
                                </Text>
                              )}
                          </>
                        );
                      }

                      if ((record as User).status === "blocked") {
                        return (
                          <>
                            <div>
                              {btn}
                              <Tag color="red">blocked</Tag>
                            </div>
                            {(isNetBirdHosted() || isLocalDev()) &&
                              (record as User).last_login && (
                                <Text
                                  type={"secondary"}
                                  style={{ paddingLeft: "15px" }}
                                >
                                  Last login:{" "}
                                  {String(timeAgo((record as User).last_login))}
                                </Text>
                              )}
                          </>
                        );
                      }

                      return (
                        <>
                          <div>{btn}</div>
                          {(isNetBirdHosted() || isLocalDev()) &&
                            (record as User).last_login && (
                              <Text
                                type={"secondary"}
                                style={{
                                  paddingLeft: "15px",
                                  paddingTop: "0px",
                                }}
                              >
                                Last login:{" "}
                                {String(timeAgo((record as User).last_login))}
                              </Text>
                            )}
                        </>
                      );
                    }}
                  />
                  <Column
                    title="Name"
                    dataIndex="name"
                    onFilter={(value: string | number | boolean, record) =>
                      (record as any).name.includes(value)
                    }
                    sorter={(a, b) =>
                      (a as any).name.localeCompare((b as any).name)
                    }
                  />
                  <Column
                    title="Groups"
                    dataIndex="groupsCount"
                    align="center"
                    render={(text, record: UserDataTable, index) => {
                      return renderPopoverGroups(
                        text,
                        record.auto_groups,
                        record
                      );
                    }}
                  />
                  <Column
                    title="Role"
                    dataIndex="role"
                    onFilter={(value: string | number | boolean, record) =>
                      (record as any).role.includes(value)
                    }
                    sorter={(a, b) =>
                      (a as any).role.localeCompare((b as any).role)
                    }
                  />
                  {isAdmin && (
                    <Column
                      title="Block user"
                      align="center"
                      width="150px"
                      dataIndex="is_blocked"
                      render={(e, record: UserDataTable, index) => {
                        let witch = (
                          <Switch
                            size={"small"}
                            checked={e}
                            disabled={record.is_current || record.role === "owner"}
                            onClick={(active: boolean) => {
                              handleBlockUser(active, record);
                            }}
                          />
                        );

                        if (record.is_current || record.role === "owner") {
                          let title = "You can't block or unblock yourself"
                            if(record.role === "owner") {
                              title = "You can't block or unblock owners"
                            }
                          return (
                            <Tooltip title={title}>
                              <Empty
                                image={""}
                                description={""}
                                style={{ height: "1px", width: "auto" }}
                              />
                            </Tooltip>
                          );
                        }

                        return witch;
                      }}
                    />
                  )}

                  {isAdmin && (
                    <Column
                      title="Delete user"
                      align="center"
                      width="150px"
                      // dataIndex="is_blocked"
                      render={(e, record: UserDataTable, index) => {
                        let witch = (
                          <Button
                            danger={true}
                            type={"text"}
                            style={{ marginLeft: "3px", marginRight: "3px" }}
                            onClick={() => {
                              let userRecord = record as UserDataTable;
                              handleDeleteUser(userRecord);
                            }}
                          >
                            Delete
                          </Button>
                        );

                        if (record.is_current || record.role === "owner") {
                          let title = "You can't delete yourself"
                          if(record.role === "owner") {
                            title = "You can't delete owners"
                          }
                          return (
                            <Tooltip title={title}>
                              <Empty
                                image={""}
                                description={""}
                                style={{ height: "1px", width: "auto" }}
                              />
                            </Tooltip>
                          );
                        }

                        return witch;
                      }}
                    />
                  )}
                </Table>
              </Card>
            </Space>
          </Col>
        </Row>
      </Container>
      <InviteUserPopup />
      {showGroupModal && (
        <UpdateUsersGroupModal
          showGroupModal={showGroupModal}
          setShowGroupModal={setShowGroupModal}
        />
      )}
      {confirmModalContextHolder}
    </>
  );
};

export default RegularUsers;
