import { useState } from "react";
import {Button, Col, Row, Space, Typography} from "antd";
import { CloseOutlined } from '@ant-design/icons';

const { Text } = Typography

const Banner = () => {
	const [show, setShow] = useState(true);

	const dismiss = () => {
		setShow(false);
	};

	const linkLearnMore = () => {
		return (
			<a
				href="https://blog.netbird.io/wiretrustee-becomes-netbird"
				className="font-bold underline"
				target="_blank"
				rel="noreferrer"
			><Text strong style={{color: "#ffffff"}}>Learn more&nbsp;<span aria-hidden="true">&rarr;</span></Text></a>
		)
	}

	return show ? (
		<div className="relative bg-indigo-600 white" color="white" style={{position: "relative", padding: "0.3rem"}} >
			<Row>
				<Col xs={24} sm={0} lg={0}>
					<Text className="ant-col-md-0" style={{color: "#ffffff"}}>
						Big news! Wiretrustee becomes <strong>NetBird</strong>!
					</Text>
				</Col>
				<Col xs={24} sm={0} lg={0}>
					{linkLearnMore()}
				</Col>
			</Row>
			<Row>
				<Col xs={0} sm={24}>
					<Space align="center" style={{display: "flex", justifyContent: "center"}}>
						<Text style={{color: "#ffffff"}}>
							Big news! Wiretrustee becomes <strong>NetBird</strong>!
						</Text>
						<span>
							{linkLearnMore()}
						</span>
					</Space>
				</Col>
			</Row>
			<Button icon={<CloseOutlined />} onClick={dismiss} size="small" style={{position: "absolute", right: 5, top: 5}}/>
		</div>
	) : null;
}

export default Banner