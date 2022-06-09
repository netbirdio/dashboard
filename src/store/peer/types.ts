import {Group} from "../group/types";

export interface Peer {
  ID?: string,
  Name: string,
  IP: string,
  Connected: boolean,
  LastSeen: string,
  OS: string,
  Version: string,
  Groups?: Group[]
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