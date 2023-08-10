import React, { useEffect, useState } from "react";
import { Modal } from "antd";
import SetupKeyNew from "./SetupKeyEdit";
export const UpdateKeyGroupModal = (props:any) => {
  return (
    <>
      <Modal
        closable={false}
        open={true}
        footer={[]}
        onCancel={() => props.setShowGroupModal(false)}
        width={450}
      >
        <SetupKeyNew
          isGroupUpdateView={true}
          setShowGroupModal={props.setShowGroupModal}
        />
      </Modal>
    </>
  );
};
