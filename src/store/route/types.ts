export interface Route {
    id?: string
    description: string
    enabled: boolean
    peer: string
    network:	string
    network_id: string
    network_type?: string
    metric?: number
    masquerade:	boolean
}