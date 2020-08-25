import { SNNote, SNTag } from 'snjs';

export enum NoteSortKey {
  CreatedAt = 'created_at',
  UserUpdatedAt = 'userModifiedDate',
  Title = 'title',

  /** @legacy Use UserUpdatedAt instead */
  UpdatedAt = 'updated_at',
  /** @legacy Use UserUpdatedAt instead */
  ClientUpdatedAt = 'client_updated_at',
}

export function notePassesFilter(
  note: SNNote,
  selectedTag: SNTag,
  showArchived: boolean,
  hidePinned: boolean,
  filterText: string
) {
  let canShowArchived = showArchived;
  const canShowPinned = !hidePinned;
  if (!selectedTag.isTrashTag && note.trashed) {
    return false;
  }
  const isSmartTag = selectedTag.isSmartTag();
  if (isSmartTag) {
    canShowArchived =
      canShowArchived || selectedTag.isArchiveTag || selectedTag.isTrashTag;
  }
  if ((note.archived && !canShowArchived) || (note.pinned && !canShowPinned)) {
    return false;
  }
  return noteMatchesQuery(note, filterText);
}

function noteMatchesQuery(note: SNNote, query: string) {
  if (query.length === 0) {
    return true;
  }
  const title = note.safeTitle().toLowerCase();
  const text = note.safeText().toLowerCase();
  const lowercaseText = query.toLowerCase();
  const quotedText = stringBetweenQuotes(lowercaseText);
  if (quotedText) {
    return title.includes(quotedText) || text.includes(quotedText);
  }
  if (stringIsUuid(lowercaseText)) {
    return note.uuid === lowercaseText;
  }
  const words = lowercaseText.split(' ');
  const matchesTitle = words.every(word => {
    return title.indexOf(word) >= 0;
  });
  const matchesBody = words.every(word => {
    return text.indexOf(word) >= 0;
  });
  return matchesTitle || matchesBody;
}

function stringBetweenQuotes(text: string) {
  const matches = text.match(/"(.*?)"/);
  return matches ? matches[1] : null;
}

function stringIsUuid(text: string) {
  const matches = text.match(
    /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/
  );
  return matches ? true : false;
}
