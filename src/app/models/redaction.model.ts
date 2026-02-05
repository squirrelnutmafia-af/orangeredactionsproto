export type RedactionType = 'Private' | 'Privileged' | 'Highlight' | 'Privacy-Foreign';

export interface Redaction {
  id: string;
  activityId: string;
  redactionType: RedactionType;
  startPosition: number;
  endPosition: number;
  redactionText: string;
}

export interface RedactionTypeConfig {
  type: RedactionType;
  label: string;
  description: string;
  color: string;
  borderColor?: string;
}

export interface Activity {
  id: string;
  uid: string;
  priority: string;
  workflowTags: string[];
  description: string;
  createdTime: string;
}

export interface RenderedSegment {
  text: string;
  startPosition: number;
  endPosition: number;
  redactionTypes: RedactionType[];
  isRedacted: boolean;
}
