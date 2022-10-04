import React from "react";
import loading from "../assets/bars.svg";
import {Space} from "antd";
import {OidcSecure} from "@axa-fr/react-oidc";

type LoadingProps = {
    padding?: string;
    width?: number;
    height?: number;
};

const Loading: React.FC<LoadingProps> = ({padding, width, height}) => (
    <Space direction="vertical" align="center" style={{
        marginTop: `-${height ? (height / 2) + "px" : '-25px'}`,
        marginLeft: `-${width ? (width / 2) + "px" : '-25px'}`,
        position: "absolute",
        top: "50%",
        left: "50%",
        display: 'flex'
    }}>
        <img src={loading} alt="Loading"
             style={{width: `${width ? width + "px" : '25px'}`, height: `${height ? height + "px" : '25px'}`}}/>
    </Space>
);

export default Loading;
// Wrapper of Loading to handle cases when it is shown within the authenticated layout and has to trigger authentication when token expires.
export const SecureLoading = (props: LoadingProps) => (
    <OidcSecure>
        <Loading {...props} />
    </OidcSecure>
);
