import {Peer, PeerIPToID, PeerIPToName, PeerNameToIP} from "../store/peer/types";
import {Route} from "../store/route/types";

export const routePeerSeparator = " - "

export const masqueradeDisabledMSG = "Enabling this option hides other NetBird network IPs behind the routing peer local address when accessing the target Network CIDR. This option allows access to your private networks without configuring routes on your local routers or other devices."

export const masqueradeEnabledMSG = "Disabling this option stops hiding all traffic coming from other NetBird peers behind the routing peer local address when accessing the target Network CIDR. You will need to configure routes for your NetBird network pointing to your routing peer on your local routers or other devices."

export const peerToPeerIP = (name: string, ip: string): string => {
    return name + routePeerSeparator + ip
}

export const initPeerMaps = (peers: Peer[]): [PeerNameToIP, PeerIPToName, PeerIPToID] => {
    let peerNameToIP = {} as PeerNameToIP
    let peerIPToName = {} as PeerIPToName
    let peerIPToID = {} as PeerIPToID
    peers.forEach((p) => {
        peerNameToIP[p.name] = p.ip
        peerIPToName[p.ip] = p.name
        peerIPToID[p.ip] = p.id ? p.id : ""
    })
    return [peerNameToIP, peerIPToName, peerIPToID]
}

export interface RouteDataTable extends Route {
    key: string;
    peer_ip: string;
    peer_name: string;
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
    routesGroups: string[]
}

export const transformDataTable = (routes: Route[], peers: Peer[]): RouteDataTable[] => {

    let peerMap = Object.fromEntries(peers.map(p => [p.id, p]));
    return routes.map(route => {
        return {
            key: route.id,
            ...route,
            peer: route.peer,
            peer_ip: peerMap[route.peer] ? peerMap[route.peer].ip : route.peer,
            peer_name: peerMap[route.peer] ? peerMap[route.peer].name : route.peer,
        } as RouteDataTable
    })
}

export const transformGroupedDataTable = (routes: Route[], peers: Peer[]): GroupedDataTable[] => {
    let keySet = new Set(routes.map(r => {
        return r.network_id + r.network
    }))

    let groupedRoutes: GroupedDataTable[] = []

    keySet.forEach((p) => {
        let hasEnabled = false
        let lastRoute: Route
        let listedRoutes: Route[] = []
        let groupList: string[] = []
        routes.forEach((r) => {
            if (p === r.network_id + r.network) {
                lastRoute = r
                if (r.enabled) {
                    hasEnabled = true
                }
                listedRoutes.push(r)
                groupList = groupList.concat(r.groups)
            }
        })
        groupList = groupList.filter((value, index, arrary) => arrary.indexOf(value) === index)
        let groupDataTableRoutes = transformDataTable(listedRoutes, peers)
        groupedRoutes.push({
            key: p.toString(),
            network_id: lastRoute!.network_id,
            network: lastRoute!.network,
            masquerade: lastRoute!.masquerade,
            description: lastRoute!.description,
            enabled: hasEnabled,
            routesCount: groupDataTableRoutes.length,
            groupedRoutes: groupDataTableRoutes,
            routesGroups: groupList,
        })
    })
    return groupedRoutes
}