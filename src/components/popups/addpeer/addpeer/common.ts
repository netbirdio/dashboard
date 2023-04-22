import {getConfig} from "../../../../config";
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

export const formatDockerCommand = () => {
    let cmd = ["docker run --rm -d",
        "   --cap-add=NET_ADMIN",
        "   -e NB_SETUP_KEY=SETUP_KEY",
        "   -v netbird-client:/etc/netbird"]
    if (grpcApiOrigin) {
        cmd.push("   -e NB_MANAGEMENT_URL="+grpcApiOrigin)
    }
    cmd.push("   netbirdio/netbird:latest")
    return cmd.join(' \\\n')
}