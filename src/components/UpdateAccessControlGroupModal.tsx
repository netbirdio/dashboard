import React from "react";
import { Modal } from "antd";
import AccessControlEdit from "./AccessControlEdit";

export const UpdateAccessControlGroupModal = (props: any) => {
  return (
    <>
      <Modal
        closable={false}
        open={true}
        footer={[]}
        onCancel={() => props.setShowGroupModal(false)}
        width={600}
        className="noPadding"
      >
        <AccessControlEdit
          isGroupUpdateView={true}
          setShowGroupModal={props.setShowGroupModal}
        />
      </Modal>
    </>
  );
};
