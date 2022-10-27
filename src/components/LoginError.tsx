import {useOidc, useOidcUser} from "@axa-fr/react-oidc";
import {Anchor, Button, Result} from "antd";
import React from "react";
import {getConfig} from "../config";
import {ResultStatusType} from "antd/lib/result";

const {Link} = Anchor;

function LoginError() {
    const {logout} = useOidc();
    const config = getConfig();
    const {oidcUserLoadingState} = useOidcUser();
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    if (urlParams.get("error") === "access_denied") {

        let title = urlParams.get("error_description")
        let status: ResultStatusType = "warning"
        // this comes from the auth0 rule that links accounts
        if (title === "account linked successfully") {
            status = "success"
            title = "Your account has been linked successfully. Please log in again to complete the setup."
        }

        return <Result
            status={status}
            title={title}
            extra={<>
                <h4>Already verified your email address?</h4>
                <a href={window.location.origin}>
                    <Button type="primary">
                        Continue
                    </Button>
                </a>
                <br/>
                <br/>

                <Button type="link" onClick={function () {
                    logout("", {client_id: config.clientId})
                }}>
                    Trouble logging in? Try again.
                </Button>

            </>
            }
        />
    }
    return <div>{"Login Error: User state: " + oidcUserLoadingState}</div>
}

export default LoginError;