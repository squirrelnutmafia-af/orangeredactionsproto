import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RedactionType, RedactionTypeConfig } from '../../models/redaction.model';
import { RedactionService } from '../../services/redaction.service';

@Component({
  selector: 'app-redaction-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './redaction-panel.component.html',
  styleUrls: ['./redaction-panel.component.css']
})
export class RedactionPanelComponent {
  @Input() hasSelection: boolean = false;
  @Input() selectedRedactedRange: { start: number; end: number; types: RedactionType[] } | null = null;
  @Output() applyRedactions = new EventEmitter<RedactionType[]>();
  @Output() deleteRedactions = new EventEmitter<void>();

  selectedTypes: { [key: string]: boolean } = {};
  redactionTypes: RedactionTypeConfig[] = [];

  constructor(private redactionService: RedactionService) {
    this.redactionTypes = this.redactionService.redactionTypes;
  }

  onApply(): void {
    const selectedRedactionTypes = this.redactionTypes
      .filter(rt => this.selectedTypes[rt.type])
      .map(rt => rt.type);

    if (selectedRedactionTypes.length > 0) {
      this.applyRedactions.emit(selectedRedactionTypes);
      this.clearSelection();
    }
  }

  clearSelection(): void {
    this.selectedTypes = {};
  }

  isApplyDisabled(): boolean {
    const hasSelectedTypes = Object.values(this.selectedTypes).some(v => v === true);
    return !this.hasSelection || !hasSelectedTypes;
  }

  onDelete(): void {
    if (!this.isDeleteDisabled()) {
      this.deleteRedactions.emit();
    }
  }

  isDeleteDisabled(): boolean {
    return !this.selectedRedactedRange ||
           !this.selectedRedactedRange.types ||
           this.selectedRedactedRange.types.length === 0;
  }

  getCheckboxId(type: RedactionType): string {
    return `redaction-${type.toLowerCase().replace(/\s+/g, '-')}`;
  }

  getColorIndicatorStyle(config: RedactionTypeConfig): { [key: string]: string } {
    return {
      'background-color': config.color,
      'border': `2px solid ${config.borderColor || config.color}`
    };
  }
}
