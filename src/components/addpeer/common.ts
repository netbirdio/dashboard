import {getConfig} from "../../config";
const { grpcApiOrigin } = getConfig();


export const formatNetBirdUP = () => {
    let cmd = "netbird up"
    if (grpcApiOrigin) {
        cmd = "netbird up --management-url " + grpcApiOrigin
    }
    return [
        cmd
    ].join('\n')
}