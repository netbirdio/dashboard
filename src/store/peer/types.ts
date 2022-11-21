import {Group} from "../group/types";

export interface Peer {
  id?: string,
  name: string,
  ip: string,
  connected: boolean,
  last_seen: string,
  os: string,
  version: string,
  groups?: Group[]
  ssh_enabled: boolean,
  hostname: string,
  user_id?: string,
  ui_version?: string,
  dns_label: string,
}

export interface FormPeer extends Peer {
  groupsNames: string[],
  userEmail?: string
}

export interface PeerToSave extends Peer {
  groupsToSave: string[]
}

export interface PeerGroupsToSave {
  ID: string;
  groupsToRemove: string[];
  groupsToAdd: string[];
  groupsNoId: string[];
}

export interface PeerNameToIP {
  [key: string]: string;
}

export interface PeerIPToName {
  [key: string]: string;
}

export interface PeerDataTable extends Peer {
  key: string;
  groups: Group[];
  groupsCount: number;
}
