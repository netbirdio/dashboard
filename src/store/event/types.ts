export interface Event {
    id: string;
    type: string;
    timestamp: string
    operation: string
    operation_code: number
    modifier_id: string
    target_id: string
}