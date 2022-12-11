import {getConfig} from "../../config";
const { grpcApiOrigin } = getConfig();


export const formatNetBirdUP = () => {
    let cmd = "sudo netbird up"
    if (grpcApiOrigin) {
        cmd = "sudo netbird up --management-url " + grpcApiOrigin
    }
    return [
        cmd
    ].join('\n')
}