import { Component, Input, Output, EventEmitter, HostListener, OnChanges, SimpleChanges } from '@angular/core';
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
export class RedactionPanelComponent implements OnChanges {
  @Input() hasSelection: boolean = false;
  @Input() selectedRedactedRange: { start: number; end: number; types: RedactionType[] } | null = null;
  @Input() selectedText: string = '';
  @Input() nextButtonEnabled: boolean = false;
  @Output() applyRedactions = new EventEmitter<RedactionType[]>();
  @Output() applyToAllInstances = new EventEmitter<RedactionType[]>();
  @Output() deleteRedactions = new EventEmitter<void>();
  @Output() deleteAllInstancesInActivity = new EventEmitter<void>();
  @Output() navigateToNext = new EventEmitter<void>();

  selectedTypes: { [key: string]: boolean } = {};
  redactionTypes: RedactionTypeConfig[] = [];
  showApplyDropdown: boolean = false;
  showDeleteDropdown: boolean = false;

  private previousApplyDisabled: boolean = true;
  private previousDeleteDisabled: boolean = true;
  private previousNextDisabled: boolean = true;

  constructor(private redactionService: RedactionService) {
    this.redactionTypes = this.redactionService.redactionTypes;
  }

  ngOnChanges(changes: SimpleChanges): void {
    const currentApplyDisabled = this.isApplyDisabled();
    const currentDeleteDisabled = this.isDeleteDisabled();
    const currentNextDisabled = this.isNextDisabled();

    if (changes['hasSelection'] || changes['selectedRedactedRange'] || changes['nextButtonEnabled']) {
      if (this.previousApplyDisabled !== currentApplyDisabled) {
        if (!currentApplyDisabled) {
          this.announceToScreenReader('Apply button available');
        }
        this.previousApplyDisabled = currentApplyDisabled;
      }

      if (this.previousDeleteDisabled !== currentDeleteDisabled) {
        if (!currentDeleteDisabled) {
          this.announceToScreenReader('Delete button available');
        }
        this.previousDeleteDisabled = currentDeleteDisabled;
      }

      if (this.previousNextDisabled !== currentNextDisabled) {
        this.previousNextDisabled = currentNextDisabled;
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const clickedInApply = target.closest('.apply-combo-group') || target.closest('.apply-dropdown-menu');
    const clickedInDelete = target.closest('.delete-combo-group') || target.closest('.delete-dropdown-menu');

    if (!clickedInApply && this.showApplyDropdown) {
      this.showApplyDropdown = false;
    }

    if (!clickedInDelete && this.showDeleteDropdown) {
      this.showDeleteDropdown = false;
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

  toggleDeleteDropdown(): void {
    if (!this.isDeleteDisabled()) {
      this.showDeleteDropdown = !this.showDeleteDropdown;

      if (this.showDeleteDropdown) {
        setTimeout(() => {
          const firstItem = document.querySelector('.delete-dropdown-menu .dropdown-item:not(:disabled)') as HTMLElement;
          if (firstItem) {
            firstItem.focus();
          }
        }, 0);
      }
    }
  }

  onDeleteSelected(): void {
    this.showDeleteDropdown = false;
    this.onDelete();
  }

  onDeleteAllInActivity(): void {
    this.showDeleteDropdown = false;
    if (!this.isDeleteDisabled()) {
      this.deleteAllInstancesInActivity.emit();
    }
  }

  onDeleteDropdownKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.showDeleteDropdown = false;
      const trigger = document.querySelector('.delete-dropdown-trigger') as HTMLElement;
      if (trigger) {
        trigger.focus();
      }
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const items = Array.from(document.querySelectorAll('.delete-dropdown-menu .dropdown-item:not(:disabled)')) as HTMLElement[];
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

  private announceToScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
}
