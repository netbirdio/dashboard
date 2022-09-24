import {Peer, PeerNameToIP, PeerIPToName} from "../store/peer/types";
import {Route} from "../store/route/types";

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

export interface RouteDataTable extends Route {
    key: string;
}

export interface GroupedDataTable {
    key: string
    network_id: string
    network: string
    enabled: boolean
    masquerade: boolean
    description: string
    routesCount: number
    groupedRoutes: RouteDataTable[]
}

export const transformDataTable = (d:Route[],peerIPToName:PeerIPToName):RouteDataTable[] => {
    return d.map(p => {
        return {
            key: p.id,
            ...p,
            peer: peerIPToName[p.peer] ? peerIPToName[p.peer] : p.peer,
        } as RouteDataTable
    })
}

export const transformGroupedDataTable = (routes:Route[],peerIPToName:PeerIPToName):GroupedDataTable[] => {
    let keySet = new Set(routes.map(r => {
        return r.network_id + r.network
    }))

    let groupedRoutes:GroupedDataTable[] = []
    keySet.forEach((p) => {
        let hasEnabled = false
        let lastRoute:Route
        let listedRoutes:Route[] = []
        routes.forEach((r) => {
            if ( p === r.network_id + r.network ) {
                lastRoute = r
                if (r.enabled) {
                    hasEnabled = true
                }
                listedRoutes.push(r)
            }
        })
        let groupDataTableRoutes = transformDataTable(listedRoutes,peerIPToName)
        groupedRoutes.push({
            key: p.toString(),
            network_id: lastRoute!.network_id,
            network: lastRoute!.network,
            masquerade: lastRoute!.masquerade,
            description: lastRoute!.description,
            enabled: hasEnabled,
            routesCount: groupDataTableRoutes.length,
            groupedRoutes: groupDataTableRoutes,
        })
    })
    return groupedRoutes
}