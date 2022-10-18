import {useOidcAccessToken, useOidcIdToken} from "@axa-fr/react-oidc";
import {useEffect} from "react";
import {getConfig} from "../config";

function sleep(ms : number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function b64DecodeUnicode(str: string): string {
    // See https://www.rfc-editor.org/rfc/rfc7515.txt, Appendix C
    str = str.replace('-', '+');
    str = str.replace('_', '/');
    switch (str.length % 4) {
        case 0: break;
        case 2: str += '=='; break;
        case 3: str += '='; break;
    }
    return decodeURIComponent(Array.prototype.map.call(atob(str), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
}

function parseJwt(token:string) {
    return JSON.parse(b64DecodeUnicode(token.split('.')[1].replace('-', '+').replace('_', '/')))
}

function isTokenValid(token:string) {
    let tokenPayload = parseJwt(token)
    return tokenPayload && (tokenPayload.exp * 1000) > (Date.now() - 5000)
}

// latestToken as global allows for use of the latest state value across calls
let latestToken:string


// hook that returns a getAccessTokenSilently function that returns an access token promise,
// waiting for renewal if it was expired
export const useGetAccessTokenSilently = () => {
    const {tokenType} = getConfig()
    const {idToken} = useOidcIdToken()
    const {accessToken} = useOidcAccessToken()

    latestToken = tokenType === 'id' ? idToken: accessToken
    const getAccessTokenSilently = async (): Promise<string> => {
        let attempt = 0
        while (!isTokenValid(latestToken) && attempt < 15){
            attempt++
            await sleep(500)
        }

        return latestToken
    };

    useEffect(() => {
        latestToken = tokenType === 'id' ? idToken: accessToken
    }, [accessToken, idToken])

    return {getAccessTokenSilently}
}
