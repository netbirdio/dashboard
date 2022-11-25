import {useEffect, useState} from "react";
import {Button, Col, Row, Space, Typography} from "antd";
import { CloseOutlined } from '@ant-design/icons';
import {Md5} from "ts-md5";

const { Text } = Typography

const Banner = () => {
	const [show, setShow] = useState(false);
	const banner_md5_key = 'banner_md5'
	const banner_closed_key = 'banner_closed'

	const dismiss = () => {
		setShow(false);
		localStorage.setItem(banner_closed_key,'true');
	};

	const announcement = "New Release! Manage DNS with NetBird."

	const announcement_md5 = Md5.hashStr(announcement)

	const linkLearnMore = () => {
		return (
			<a
				href="https://netbird.io/docs/how-to-guides/nameservers"
				className="font-bold underline"
				target="_blank"
				rel="noreferrer"
			><Text strong style={{color: "#ffffff"}}>Learn more&nbsp;<span aria-hidden="true">&rarr;</span></Text></a>
		)
	}

	useEffect(()=>{
		let store_banner_md5 = localStorage.getItem(banner_md5_key);
		let stored_banner_closed = localStorage.getItem(banner_closed_key);

		if((!stored_banner_closed || stored_banner_closed !== 'true') ||
			(!store_banner_md5 || store_banner_md5 !== announcement_md5)) {
			setShow(true);
			localStorage.setItem(banner_md5_key,announcement_md5);
			localStorage.setItem(banner_closed_key,'false');
		}
	},[])

	return show ? (
		<div className="relative bg-indigo-600 white" color="white" style={{position: "relative", padding: "0.3rem"}} >
			<Row>
				<Col xs={24} sm={0} lg={0}>
					<Text className="ant-col-md-0" style={{color: "#ffffff"}}>
						{announcement}
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
							{announcement}
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