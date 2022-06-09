import {Group} from "../group/types";

export interface Rule {
    ID?: string
    Name: string
    Description: string
    Source: Group[] | string[] | null
    Destination: Group[] | string[] | null
    Flow: string
    Disabled: boolean
}

export interface RuleToSave extends Rule {
    sourcesNoId: string[],
    destinationsNoId: string[],
    groupsToSave: string[]
}