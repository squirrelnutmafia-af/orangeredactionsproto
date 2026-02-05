import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Activity, RenderedSegment, RedactionType } from '../../models/redaction.model';
import { RedactionService } from '../../services/redaction.service';
import { RedactionPanelComponent } from '../redaction-panel/redaction-panel.component';

@Component({
  selector: 'app-activity-description',
  standalone: true,
  imports: [CommonModule, RedactionPanelComponent],
  templateUrl: './activity-description.component.html',
  styleUrls: ['./activity-description.component.css']
})
export class ActivityDescriptionComponent implements OnChanges {
  @Input() activity!: Activity;
  @Input() hasSelection: boolean = false;
  @Output() textSelected = new EventEmitter<{ text: string; startPosition: number; endPosition: number }>();
  @Output() applyRedactions = new EventEmitter<RedactionType[]>();

  segments: RenderedSegment[] = [];
  isExpanded: boolean = true;
  showContextMenu: boolean = false;
  contextMenuX: number = 0;
  contextMenuY: number = 0;
  currentSelection: { text: string; startPosition: number; endPosition: number } | null = null;
  redactionTypes: RedactionType[] = ['Private', 'Privileged', 'Highlight', 'Privacy-Foreign'];

  constructor(private redactionService: RedactionService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['activity']) {
      this.updateSegments();
    }
  }

  ngOnInit(): void {
    this.redactionService.redactions$.subscribe(() => {
      this.updateSegments();
    });
  }

  updateSegments(): void {
    if (this.activity && this.activity.description) {
      this.segments = this.redactionService.buildRenderedSegments(
        this.activity.description,
        this.activity.id
      );
    }
  }

  onTextSelection(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    const descriptionElement = document.getElementById('activity-description');

    if (!descriptionElement || !descriptionElement.contains(range.commonAncestorContainer)) {
      return;
    }

    const startPosition = this.getAbsolutePosition(range.startContainer, range.startOffset);
    const endPosition = this.getAbsolutePosition(range.endContainer, range.endOffset);

    if (startPosition !== -1 && endPosition !== -1) {
      this.textSelected.emit({
        text: selectedText,
        startPosition,
        endPosition
      });
    }
  }

  private getAbsolutePosition(node: Node, offset: number): number {
    const descriptionElement = document.getElementById('activity-description');
    if (!descriptionElement) {
      return -1;
    }

    let position = 0;
    const walker = document.createTreeWalker(
      descriptionElement,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentNode: Node | null;
    while ((currentNode = walker.nextNode())) {
      if (currentNode === node) {
        return position + offset;
      }
      position += currentNode.textContent?.length || 0;
    }

    return -1;
  }

  getSegmentStyle(segment: RenderedSegment): { [key: string]: string } {
    if (!segment.isRedacted || segment.redactionTypes.length === 0) {
      return {};
    }

    if (segment.redactionTypes.length === 1) {
      const config = this.redactionService.getRedactionConfig(segment.redactionTypes[0]);
      return {
        'background-color': config?.color || 'transparent',
        'border-bottom': `2px solid ${config?.borderColor || 'transparent'}`
      };
    } else {
      return {
        'background-color': '#FFEB3B',
        'border': '2px solid #D32F2F',
        'border-radius': '2px'
      };
    }
  }

  getTooltipText(segment: RenderedSegment): string {
    if (!segment.isRedacted || segment.redactionTypes.length === 0) {
      return '';
    }

    const uniqueTypes = Array.from(new Set(segment.redactionTypes));
    return `Redaction Types: ${uniqueTypes.join(', ')}`;
  }

  getSegmentId(index: number): string {
    return `segment-${index}`;
  }

  getTooltipId(index: number): string {
    return `tooltip-${index}`;
  }

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }

  onApplyRedactionsInternal(types: RedactionType[]): void {
    this.applyRedactions.emit(types);
  }

  onRemoveRedaction(segment: RenderedSegment, redactionType: RedactionType, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    this.redactionService.removeRedaction(
      this.activity.id,
      segment.startPosition,
      segment.endPosition,
      redactionType
    );
  }

  onRemoveRedactionKeyboard(segment: RenderedSegment, redactionType: RedactionType, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.stopPropagation();
      event.preventDefault();

      this.redactionService.removeRedaction(
        this.activity.id,
        segment.startPosition,
        segment.endPosition,
        redactionType
      );
    }
  }

  onContextMenu(event: MouseEvent): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length === 0) {
      return;
    }

    const range = selection.getRangeAt(0);
    const descriptionElement = document.getElementById('activity-description');

    if (!descriptionElement || !descriptionElement.contains(range.commonAncestorContainer)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const startPosition = this.getAbsolutePosition(range.startContainer, range.startOffset);
    const endPosition = this.getAbsolutePosition(range.endContainer, range.endOffset);

    if (startPosition !== -1 && endPosition !== -1) {
      this.currentSelection = {
        text: selectedText,
        startPosition,
        endPosition
      };

      this.contextMenuX = event.clientX;
      this.contextMenuY = event.clientY;
      this.showContextMenu = true;

      setTimeout(() => {
        const menuElement = document.querySelector('.context-menu') as HTMLElement;
        if (menuElement) {
          const firstButton = menuElement.querySelector('button:not([disabled])') as HTMLElement;
          if (firstButton) {
            firstButton.focus();
          } else {
            menuElement.focus();
          }
        }
      }, 0);
    }
  }

  hideContextMenu(): void {
    this.showContextMenu = false;
    this.currentSelection = null;
  }

  onAddRedactionFromContext(redactionType: RedactionType, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    if (!this.currentSelection) {
      return;
    }

    this.applyRedactions.emit([redactionType]);
  }

  isRedactionDisabled(redactionType: RedactionType): boolean {
    if (!this.currentSelection) {
      return true;
    }

    const existingRedactions = this.redactionService.getRedactions();
    const hasFullCoverage = existingRedactions.some(
      r => r.activityId === this.activity.id &&
           r.redactionType === redactionType &&
           r.startPosition <= this.currentSelection!.startPosition &&
           r.endPosition >= this.currentSelection!.endPosition
    );

    return hasFullCoverage;
  }

  onContextMenuKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.hideContextMenu();
      return;
    }

    if (event.key === 'Tab') {
      const menuElement = document.querySelector('.context-menu') as HTMLElement;
      if (!menuElement) return;

      const focusableElements = menuElement.querySelectorAll(
        'button:not([disabled])'
      ) as NodeListOf<HTMLElement>;

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      if (event.shiftKey) {
        if (activeElement === firstElement || !menuElement.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (activeElement === lastElement || !menuElement.contains(activeElement)) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  }

  onAddRedactionKeyboard(redactionType: RedactionType, event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();

      if (!this.isRedactionDisabled(redactionType)) {
        this.applyRedactions.emit([redactionType]);
      }
    }
  }

  onDescriptionKeydown(event: KeyboardEvent): void {
    if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return;
      }

      const selectedText = selection.toString().trim();
      if (selectedText.length === 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const range = selection.getRangeAt(0);
      const descriptionElement = document.getElementById('activity-description');

      if (!descriptionElement || !descriptionElement.contains(range.commonAncestorContainer)) {
        return;
      }

      const startPosition = this.getAbsolutePosition(range.startContainer, range.startOffset);
      const endPosition = this.getAbsolutePosition(range.endContainer, range.endOffset);

      if (startPosition !== -1 && endPosition !== -1) {
        this.currentSelection = {
          text: selectedText,
          startPosition,
          endPosition
        };

        const rect = range.getBoundingClientRect();
        this.contextMenuX = rect.left + (rect.width / 2);
        this.contextMenuY = rect.top - 10;
        this.showContextMenu = true;

        setTimeout(() => {
          const menuElement = document.querySelector('.context-menu') as HTMLElement;
          if (menuElement) {
            const firstButton = menuElement.querySelector('button:not([disabled])') as HTMLElement;
            if (firstButton) {
              firstButton.focus();
            } else {
              menuElement.focus();
            }
          }
        }, 0);
      }
    }
  }
}
