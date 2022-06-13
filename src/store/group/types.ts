export interface Group {
    id?: string;
    name: string;
    peers?: GroupPeer[] | string[];
    peers_count?: string;
}

export interface GroupPeer {
    id: string,
    name: string
}