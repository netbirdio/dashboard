import { XIcon } from "@heroicons/react/outline";
import { useState } from "react";
import {Button, Col, Row, Space, Typography} from "antd";
import { CloseOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography

export default function Banner() {
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
					<Text level={5} className="ant-col-md-0" style={{color: "#ffffff"}}>
						Big news! Wiretrustee becomes <strong>netbird</strong>!
					</Text>
				</Col>
				<Col xs={24} sm={0} lg={0}>
					{linkLearnMore()}
				</Col>
			</Row>
			<Row>
				<Col xs={0} sm={24} align="center">
					<Space>
						<Text style={{color: "#ffffff"}}>
							Big news! Wiretrustee becomes <strong>netbird</strong>!
						</Text>
						<span>
							{linkLearnMore()}
						</span>
					</Space>
				</Col>
			</Row>
			<Button icon={<CloseOutlined />} onClick={dismiss} size="small" style={{position: "absolute", right: 5, top: 5}}/>

			{/*<button type="button" className="ant-alert-close-icon" tabIndex="0" onClick={dismiss} style={{position: "absolute", right: "0.3rem", top: "0.6rem"}}>*/}
			{/*	<span role="img" aria-label="close" className="anticon anticon-close">*/}
			{/*		<svg viewBox="64 64 896 896" focusable="false" data-icon="close" width="1em" height="1em" fill="currentColor"*/}
			{/*	aria-hidden="true">*/}
			{/*			<path d="M563.8 512l262.5-312.9c4.4-5.2.7-13.1-6.1-13.1h-79.8c-4.7 0-9.2 2.1-12.3 5.7L511.6 449.8 295.1 191.7c-3-3.6-7.5-5.7-12.3-5.7H203c-6.8 0-10.5 7.9-6.1 13.1L459.4 512 196.9 824.9A7.95 7.95 0 00203 838h79.8c4.7 0 9.2-2.1 12.3-5.7l216.5-258.1 216.5 258.1c3 3.6 7.5 5.7 12.3 5.7h79.8c6.8 0 10.5-7.9 6.1-13.1L563.8 512z"></path>*/}
			{/*		</svg>*/}
			{/*	</span>*/}
			{/*</button>*/}
		</div>
	) : null;
}
