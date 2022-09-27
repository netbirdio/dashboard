export interface DNS {
    id?: string
    name: string
    description: string
    nameservers: NameServers[]
}

export interface NameServers {
    ip: string
    type: string
}