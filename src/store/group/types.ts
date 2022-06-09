export interface Group {
    ID?: string;
    Name: string;
    Peers?: GroupPeer[] | string[];
    PeersCount?: string;
}

export interface GroupPeer {
    ID: string,
    Name: string
}