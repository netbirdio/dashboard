export interface Peer {
  Name: string,
  IP: string,
  Connected: boolean,
  LastSeen: string,
  OS: string,
  Version: string,
  Groups?: any[]
}