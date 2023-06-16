
export interface Route {
    id?: string | null
    description: string
    enabled: boolean
    peer: string
    network:	string
    network_id: string
    network_type?: string
    metric?: number
    masquerade:	boolean
    groups: string[]
}

export interface RouteToSave extends Route
{
    groupsToCreate: string[]
}