import type { StubItem } from '@/content/types'

/** Placeholder rows so Videos/Merch/Events have real routes and real layout. */
export const stubs: StubItem[] = [
  { id: 'vid_1', kind: 'video', title: 'Bronze', subtitle: 'Official Video', seed: 'bronze-video' },
  { id: 'vid_2', kind: 'video', title: 'Summer Flame', subtitle: 'Visualizer', seed: 'summer-flame' },
  { id: 'vid_3', kind: 'video', title: 'In the Studio', subtitle: 'Behind the scenes', seed: 'studio' },

  { id: 'mch_1', kind: 'merch', title: 'Bronze Tee', subtitle: '$35', seed: 'tee' },
  { id: 'mch_2', kind: 'merch', title: 'Bronze Vinyl', subtitle: '$42', seed: 'vinyl' },
  { id: 'mch_3', kind: 'merch', title: 'Alloy Hoodie', subtitle: '$78', seed: 'hoodie' },
  { id: 'mch_4', kind: 'merch', title: 'Tour Poster', subtitle: '$20', seed: 'poster' },

  { id: 'evt_1', kind: 'event', title: 'Brooklyn, NY', subtitle: 'Elsewhere · Oct 14', seed: 'bk' },
  { id: 'evt_2', kind: 'event', title: 'Los Angeles, CA', subtitle: 'The Echo · Oct 22', seed: 'la' },
  { id: 'evt_3', kind: 'event', title: 'Chicago, IL', subtitle: 'Lincoln Hall · Nov 3', seed: 'chi' },
]
