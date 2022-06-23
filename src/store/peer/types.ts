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