import {useOidcAccessToken} from "@axa-fr/react-oidc";
import {useEffect, useRef} from "react";

function sleep(ms : number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isTokenValid(tokenPayload: any) {
    return tokenPayload && (tokenPayload.current.exp * 1000) > (Date.now() - 5000)
}

// hook that returns a getAccessTokenSilently function that returns an access token promise,
// waiting for renewal if it was expired
export const useGetAccessTokenSilently = () => {
    const {accessToken, accessTokenPayload} = useOidcAccessToken()
    const token = useRef(accessToken)
    const tokenPayload = useRef(accessTokenPayload)

    const getAccessTokenSilently = async (): Promise<string> => {
        isTokenValid(tokenPayload)
        let attempt = 0
        while (!isTokenValid(tokenPayload) && attempt < 30){
            attempt++
            await sleep(500)
        }
        return token.current
    };

    useEffect(() => {
        token.current = accessToken
        tokenPayload.current = accessTokenPayload
    }, [accessToken, accessTokenPayload])

    return {getAccessTokenSilently}
}