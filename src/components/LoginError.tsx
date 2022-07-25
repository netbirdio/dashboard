import {OidcUserStatus, useOidc, useOidcUser} from "@axa-fr/react-oidc";
import {Button, Result} from "antd";
import React from "react";

function LoginError() {
    const { logout } = useOidc();
    const { oidcUserLoadingState } = useOidcUser();
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    if (urlParams.get("error") === "access_denied") {
        return <Result
            status="warning"
            title={urlParams.get("error_description")}
            extra={<>
                <a href={window.location.origin}>
                    <Button type="primary">
                        Try again
                    </Button>
                </a>
                <Button type="primary" onClick={function () {
                    logout(window.location.origin)
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