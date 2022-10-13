import {OidcUserStatus, useOidc, useOidcUser} from "@axa-fr/react-oidc";
import {Button, Result} from "antd";
import React from "react";
import {getConfig} from "../config";
import {ResultStatusType} from "antd/lib/result";

function LoginError() {
    const { logout } = useOidc();
    const config = getConfig();
    const { oidcUserLoadingState } = useOidcUser();
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    if (urlParams.get("error") === "access_denied") {

        let title = urlParams.get("error_description")
        let status :ResultStatusType = "warning"
        // this comes from the auth0 rule that links accounts
        if (title === "account linked successfully") {
            status = "success"
            title = "Your account has been linked successfully. Please log in again to complete the setup."
        }

        return <Result
            status={status}
            title={title}
            extra={<>
                <a href={window.location.origin}>
                    <Button type="primary">
                        Try again
                    </Button>
                </a>
                <Button type="primary" onClick={function () {
                    logout("",{client_id:config.clientId})
                }}>
                    Log out
                </Button>
            </>
            }
        />
    }
    return <div>{"Login Error: User state: "+oidcUserLoadingState}</div>
}

export default LoginError;