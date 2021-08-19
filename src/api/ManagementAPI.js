import {getConfig} from "../config";

const {apiOrigin} = getConfig();

export const callApi = async (getAccessTokenSilently, endpoint) => {
    const token = await getAccessTokenSilently();
    const response = await fetch(`${apiOrigin}${endpoint}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return await response.json();
};

export const getSetupKeys = async (getAccessTokenSilently) => {
    return callApi(getAccessTokenSilently, "/api/setup-keys")
}

export const getPeers = async (getAccessTokenSilently) => {
    return callApi(getAccessTokenSilently, "/api/peers")
}