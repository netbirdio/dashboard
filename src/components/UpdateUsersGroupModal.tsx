import React, { useEffect, useState } from "react";
import { Modal } from "antd";
import UserEdit from "./UserEdit";


export const UpdateUsersGroupModal = (props: any) => {
  return (
    <>
      <Modal
        closable={false}
        open={true}
        footer={[]}
        onCancel={() => props.setShowGroupModal(false)}
        width={450}
      >
        <UserEdit
          isGroupUpdateView={true}
          setShowGroupModal={props.setShowGroupModal}
        />
      </Modal>
    </>
  );
};
