import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityDescriptionComponent } from './components/activity-description/activity-description.component';
import { Activity, RedactionType } from './models/redaction.model';
import { RedactionService } from './services/redaction.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ActivityDescriptionComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  activity: Activity = {
    id: 'activity-001',
    uid: '100.1.4',
    priority: 'Low',
    workflowTags: ['Escalated'],
    description: 'Description for activity 4 for case with entity_id=1 - Class actions over airbag failures—whether non-deployment or overly aggressive deployment—have become increasingly common, especially when automakers are slow to issue recalls or fail to include all affected models.',
    createdTime: 'Jan 14, 2026, 11:14:37 AM'
  };

  currentSelection: {
    text: string;
    startPosition: number;
    endPosition: number;
  } | null = null;

  constructor(private redactionService: RedactionService) {}

  onTextSelected(selection: { text: string; startPosition: number; endPosition: number }): void {
    this.currentSelection = selection;
  }

  onApplyRedactions(redactionTypes: RedactionType[]): void {
    if (this.currentSelection) {
      this.redactionService.applyRedactions(
        this.activity.id,
        this.currentSelection.text,
        this.currentSelection.startPosition,
        this.currentSelection.endPosition,
        redactionTypes
      );

      this.currentSelection = null;

      if (window.getSelection) {
        window.getSelection()?.removeAllRanges();
      }
    }
  }

  hasSelection(): boolean {
    return this.currentSelection !== null;
  }
}
