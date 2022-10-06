export interface NameServerGroup {
    id?: string
    name: string
    description: string
    nameservers: NameServers[]
    groups: string[]
    enabled: boolean
}

export interface NameServers {
    ip: string
    ns_type: string
    port: number
}