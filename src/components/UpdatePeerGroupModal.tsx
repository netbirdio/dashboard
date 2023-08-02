import React, { useEffect, useState } from "react";
import { Modal } from "antd";
import PeerUpdate from "./PeerUpdate";
export const UpdatePeerGroupModal = (props:any) => {
  return (
    <>
      <Modal closable={false} open={true} footer={[]} width={600}>
        <PeerUpdate
          isGroupUpdateView={true}
          setShowGroupModal={props.setShowGroupModal}
        />
      </Modal>
    </>
  );
};
