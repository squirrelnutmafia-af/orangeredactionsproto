import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
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
  @Input() selectedText: string = '';
  @Input() nextButtonEnabled: boolean = false;
  @Output() applyRedactions = new EventEmitter<RedactionType[]>();
  @Output() applyToAllInstances = new EventEmitter<RedactionType[]>();
  @Output() deleteRedactions = new EventEmitter<void>();
  @Output() navigateToNext = new EventEmitter<void>();

  selectedTypes: { [key: string]: boolean } = {};
  redactionTypes: RedactionTypeConfig[] = [];
  showApplyDropdown: boolean = false;

  constructor(private redactionService: RedactionService) {
    this.redactionTypes = this.redactionService.redactionTypes;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.combo-button-group') || target.closest('.apply-dropdown-menu');

    if (!clickedInside && this.showApplyDropdown) {
      this.showApplyDropdown = false;
    }
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

  toggleApplyDropdown(): void {
    if (!this.isApplyDisabled()) {
      this.showApplyDropdown = !this.showApplyDropdown;

      if (this.showApplyDropdown) {
        setTimeout(() => {
          const firstItem = document.querySelector('.dropdown-item:not(:disabled)') as HTMLElement;
          if (firstItem) {
            firstItem.focus();
          }
        }, 0);
      }
    }
  }

  onApplyToSelected(): void {
    this.showApplyDropdown = false;
    this.onApply();
  }

  onApplyToAllInActivity(): void {
    this.showApplyDropdown = false;
    const selectedRedactionTypes = this.redactionTypes
      .filter(rt => this.selectedTypes[rt.type])
      .map(rt => rt.type);

    if (selectedRedactionTypes.length > 0) {
      this.applyToAllInstances.emit(selectedRedactionTypes);
      this.clearSelection();
    }
  }

  onDropdownKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.showApplyDropdown = false;
      const trigger = document.querySelector('.apply-dropdown-trigger') as HTMLElement;
      if (trigger) {
        trigger.focus();
      }
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const items = Array.from(document.querySelectorAll('.dropdown-item:not(:disabled)')) as HTMLElement[];
      const currentIndex = items.findIndex(item => item === document.activeElement);

      let nextIndex: number;
      if (event.key === 'ArrowDown') {
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      }

      items[nextIndex]?.focus();
    }
  }

  onNext(): void {
    if (!this.isNextDisabled()) {
      this.navigateToNext.emit();
    }
  }

  isNextDisabled(): boolean {
    return !this.nextButtonEnabled;
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
