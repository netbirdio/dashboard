import {Peer, PeerNameToIP, PeerIPToName} from "../store/peer/types";

export const routePeerSeparator = " - "

export const masqueradeDisabledMSG = "Enabling this option hides other NetBird network IPs behind the routing peer local address when accessing the target Network CIDR. This option allows access to your private networks without configuring routes on your local routers or other devices."

export const masqueradeEnabledMSG = "Disabling this option stops hiding all traffic coming from other NetBird peers behind the routing peer local address when accessing the target Network CIDR. You will need to configure routes for your NetBird network pointing to your routing peer on your local routers or other devices."

export const peerToPeerIP = (name:string,ip:string):string => {
    return name + routePeerSeparator + ip
}

export const initPeerMaps = (peers:Peer[]): [PeerNameToIP, PeerIPToName] => {
    let peerNameToIP = {} as PeerNameToIP
    let peerIPToName = {} as PeerIPToName
    peers.forEach((p) =>{
        peerNameToIP[p.name] = p.ip
        peerIPToName[p.ip] = p.name
    })
    return [ peerNameToIP, peerIPToName]
}