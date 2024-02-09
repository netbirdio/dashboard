export interface ActivityEvent {
  id: string;
  timestamp: string;
  activity: string;
  activity_code: string;
  initiator_id: string;
  initiator_email: string;
  initiator_name: string;
  target_id: string;
  meta: { [key: string]: string };
}
