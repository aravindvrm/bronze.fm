import type { StubItem } from '@/content/types'

/**
 * Placeholder rows so the sections have real routes and real layout.
 *
 * `projectSlug` is set on the items that genuinely belong to a release — the
 * Bronze vinyl, the Bronze tour — and left off the Creator-wide ones. Both
 * cases are represented on purpose, so the release and Creator views are
 * visibly different rather than accidentally identical.
 */
export const stubs: StubItem[] = [
  // Videos only exist inside a release.
  { id: 'vid_1', kind: 'video', title: 'Bronze', subtitle: 'Official Video', seed: 'bronze-video', projectSlug: 'bronze' },
  { id: 'vid_2', kind: 'video', title: 'Summer Flame', subtitle: 'Visualizer', seed: 'summer-flame', projectSlug: 'bronze' },
  { id: 'vid_3', kind: 'video', title: 'In the Studio', subtitle: 'Behind the scenes', seed: 'studio', projectSlug: 'bronze' },

  // Release store items.
  { id: 'mch_1', kind: 'store', title: 'Bronze Tee', subtitle: '$35', seed: 'tee', projectSlug: 'bronze' },
  { id: 'mch_2', kind: 'store', title: 'Bronze Vinyl', subtitle: '$42', seed: 'vinyl', projectSlug: 'bronze' },
  { id: 'mch_3', kind: 'store', title: 'Tour Poster', subtitle: '$20', seed: 'poster', projectSlug: 'bronze' },
  // Creator-wide store items, not tied to any record.
  { id: 'mch_4', kind: 'store', title: 'Alloy Hoodie', subtitle: '$78', seed: 'hoodie' },
  { id: 'mch_5', kind: 'store', title: 'Logo Cap', subtitle: '$28', seed: 'cap' },

  // The Bronze tour.
  { id: 'evt_1', kind: 'event', title: 'Brooklyn, NY', subtitle: 'Elsewhere · Oct 14', seed: 'bk', projectSlug: 'bronze' },
  { id: 'evt_2', kind: 'event', title: 'Los Angeles, CA', subtitle: 'The Echo · Oct 22', seed: 'la', projectSlug: 'bronze' },
  { id: 'evt_3', kind: 'event', title: 'Chicago, IL', subtitle: 'Lincoln Hall · Nov 3', seed: 'chi', projectSlug: 'bronze' },
  // A one-off that is not part of the tour.
  { id: 'evt_4', kind: 'event', title: 'London, UK', subtitle: 'Village Underground · Dec 9', seed: 'ldn' },
]
