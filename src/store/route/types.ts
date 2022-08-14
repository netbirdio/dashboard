export interface Route {
    id?: string
    description: string
    enabled: boolean
    peer: string
    prefix:	string
    prefix_type?: string
    metric?: number
    masquerade:	boolean
}