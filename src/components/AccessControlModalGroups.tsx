import React, {useEffect, useState} from 'react';
import {Avatar, List, Modal} from "antd";
import {Group} from "../store/group/types";

type Props = {
    data?: Group[] | string[] | null;
    title?: string;
    visible: boolean;
    onCancel: () => void;
}

const AccessControlModalGroups:React.FC<Props> = ({data, title, visible, onCancel}) => {
    const [isModalVisible, setIsModalVisible] = useState(false);

    useEffect(() => setIsModalVisible(visible), [visible])

    return (
        <>
            <Modal title={title} open={isModalVisible} onCancel={() => onCancel()} footer={null}>
                <List
                    itemLayout="horizontal"
                    dataSource={data as Group[] | undefined}
                    renderItem={(item:Group) => (
                        <List.Item>
                            <List.Item.Meta
                                avatar={<Avatar>{item.name.slice(0,1).toUpperCase()}</Avatar>}
                                title={item.name}
                                description={`${item.peers_count} peers`}
                            />
                        </List.Item>
                    )}
                />
            </Modal>
        </>
    );
}

export default AccessControlModalGroups;