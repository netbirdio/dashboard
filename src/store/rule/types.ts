import { Group } from "../group/types";

export interface Rule {
    id?: string
    name: string
    description: string
    sources: Group[] | string[] | null
    destinations: Group[] | string[] | null
    flow: string
    protocol: string
    ports: string[]
    disabled: boolean
}

export interface RuleToSave extends Rule {
    sourcesNoId: string[],
    destinationsNoId: string[],
    groupsToSave: string[]
}
