import {Group} from "../group/types";

export interface Rule {
  ID?: string
  Name: string
  Source: Group[] | string[] | null
  Destination: Group[] | string[] | null
  Flow: string
}

export interface RuleToSave extends Rule {
    sourcesNoId: string[],
    destinationsNoId: string[],
    groupsToSave: string[]
}