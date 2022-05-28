export interface SourceRule {
  ID: string;
  Name: string;
  PeersCount: string;
}

export interface DestinationRule {
    ID: string;
    Name: string;
    PeersCount: string;
}

export interface Rule {
  ID: string
  Name: string
  Source: SourceRule[]
  Destination: DestinationRule[]
  Flow: string
}