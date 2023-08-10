import React, { useEffect, useState } from "react";
import { Modal } from "antd";
import NameServerGroupUpdate from "./NameServerGroupUpdate";
export const UpdateNameServerGroupModal = (props:any) => {
  return (
    <>
      <Modal
        closable={false}
        open={true}
        footer={[]}
        onCancel={() => props.setShowGroupModal(false)}
        width={450}
      >
        <NameServerGroupUpdate
          isGroupUpdateView={true}
          setShowGroupModal={props.setShowGroupModal}
        />
      </Modal>
    </>
  );
};
