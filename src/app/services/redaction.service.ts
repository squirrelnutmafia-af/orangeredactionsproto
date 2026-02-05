import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Redaction, RedactionType, RedactionTypeConfig, RenderedSegment } from '../models/redaction.model';

@Injectable({
  providedIn: 'root'
})
export class RedactionService {
  private redactionsSubject = new BehaviorSubject<Redaction[]>([]);
  public redactions$: Observable<Redaction[]> = this.redactionsSubject.asObservable();

  public redactionTypes: RedactionTypeConfig[] = [
    {
      type: 'Private',
      label: 'Private',
      description: 'Mark as private information',
      color: '#FFE5E5',
      borderColor: '#FF6B6B'
    },
    {
      type: 'Privileged',
      label: 'Privileged',
      description: 'Mark as privileged information',
      color: '#E5F3FF',
      borderColor: '#4A90E2'
    },
    {
      type: 'Highlight',
      label: 'Highlight',
      description: 'Highlight important information',
      color: '#FFF9E5',
      borderColor: '#FFD700'
    },
    {
      type: 'Privacy-Foreign',
      label: 'Privacy-Foreign',
      description: 'Mark as foreign privacy information',
      color: '#F0E5FF',
      borderColor: '#9B59B6'
    }
  ];

  getRedactions(): Redaction[] {
    return this.redactionsSubject.value;
  }

  getRedactionsByActivity(activityId: string): Redaction[] {
    return this.redactionsSubject.value.filter(r => r.activityId === activityId);
  }

  applyRedactions(
    activityId: string,
    selectedText: string,
    startPosition: number,
    endPosition: number,
    redactionTypes: RedactionType[]
  ): void {
    const currentRedactions = this.getRedactions();
    const activityRedactions = this.getRedactionsByActivity(activityId);

    redactionTypes.forEach(type => {
      const existingRedaction = activityRedactions.find(
        r => r.redactionType === type && this.rangesOverlap(
          r.startPosition,
          r.endPosition,
          startPosition,
          endPosition
        )
      );

      if (existingRedaction) {
        const mergedStart = Math.min(existingRedaction.startPosition, startPosition);
        const mergedEnd = Math.max(existingRedaction.endPosition, endPosition);

        existingRedaction.startPosition = mergedStart;
        existingRedaction.endPosition = mergedEnd;
        existingRedaction.redactionText = this.extractTextFromRange(
          activityId,
          mergedStart,
          mergedEnd
        );
      } else {
        const newRedaction: Redaction = {
          id: this.generateId(),
          activityId,
          redactionType: type,
          startPosition,
          endPosition,
          redactionText: selectedText
        };
        currentRedactions.push(newRedaction);
      }
    });

    this.redactionsSubject.next([...currentRedactions]);
  }

  buildRenderedSegments(text: string, activityId: string): RenderedSegment[] {
    const activityRedactions = this.getRedactionsByActivity(activityId);

    if (activityRedactions.length === 0) {
      return [{
        text,
        startPosition: 0,
        endPosition: text.length,
        redactionTypes: [],
        isRedacted: false
      }];
    }

    const breakpoints = new Set<number>([0, text.length]);

    activityRedactions.forEach(redaction => {
      breakpoints.add(redaction.startPosition);
      breakpoints.add(redaction.endPosition);
    });

    const sortedBreakpoints = Array.from(breakpoints).sort((a, b) => a - b);
    const segments: RenderedSegment[] = [];

    for (let i = 0; i < sortedBreakpoints.length - 1; i++) {
      const start = sortedBreakpoints[i];
      const end = sortedBreakpoints[i + 1];

      const applicableRedactions = activityRedactions.filter(r =>
        r.startPosition <= start && r.endPosition >= end
      );

      const redactionTypes = applicableRedactions.map(r => r.redactionType);
      const uniqueTypes = Array.from(new Set(redactionTypes));

      segments.push({
        text: text.substring(start, end),
        startPosition: start,
        endPosition: end,
        redactionTypes: uniqueTypes,
        isRedacted: uniqueTypes.length > 0
      });
    }

    return segments;
  }

  getRedactionConfig(type: RedactionType): RedactionTypeConfig | undefined {
    return this.redactionTypes.find(rt => rt.type === type);
  }

  private rangesOverlap(
    start1: number,
    end1: number,
    start2: number,
    end2: number
  ): boolean {
    return start1 <= end2 && start2 <= end1;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractTextFromRange(
    activityId: string,
    start: number,
    end: number
  ): string {
    return '';
  }
}
