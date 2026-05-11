// Kid view — three top-level tabs (Monthly, Occasion, Collection) with
// Collection's Sets/Minifigs sub-tabs. Black background, Fredoka type, big
// LEGO-color accents. Ported from the design handoff (lego-wishlist/project)
// with these production wirings:
//
//   - Data comes from useWishlist (filtered by tier) and useInventory hooks
//     instead of static window.WISHLIST_SETS arrays.
//   - All four lists mount unconditionally so tab counts stay accurate; only
//     the active list is rendered, but each hook prefetches its first page.
//   - Up/Down arrows swap adjacent items' Rank values via two optimistic
//     updateItem calls. items are sorted by rank in render so the swap is
//     reflected without re-fetching.
//   - Tweaks panel from the prototype is intentionally dropped — it was a
//     design-tool affordance, not a production feature. Accent color is
//     locked to LEGO blue per design v2.
//
// Caveat from the design chat (still open): the kid's name is hardcoded as
// "Leo" in the greeting. Per design handoff: "let me know the real name and
// I'll wire it up". Update KID_NAME below when known.

import { useEffect, useMemo, useState } from 'react';
import { useWishlist } from '../hooks/useWishlist.js';
import { useInventory } from '../hooks/useInventory.js';
import TierTab from '../kid/TierTab.jsx';
import DetailModal from '../kid/DetailModal.jsx';
import { shade } from '../kid/util.jsx';

const ACCENT = '#006cb7'; // LEGO blue — per design v2
const KID_NAME = 'Caylor';

export default function KidView() {
  const [tab, setTab] = useState('monthly');
  const [collectionSubTab, setCollectionSubTab] = useState('sets');
  const [openSet, setOpenSet] = useState(null);

  const monthly = useWishlist({ tier: 'Monthly', status: 'Wishlist' });
  const occasion = useWishlist({ tier: 'Occasion', status: 'Wishlist' });
  const sets = useInventory('sets');
  const minifigs = useInventory('minifigs');

  const isLandscape = useMediaQuery('(orientation: landscape)', true);
  const cols = isLandscape ? 3 : 2;
  const isCollection = tab === 'collection';

  // Sort by Rank asc on render so post-swap ordering matches the new ranks.
  const monthlySorted = useMemo(() => sortByRank(monthly.items), [monthly.items]);
  const occasionSorted = useMemo(() => sortByRank(occasion.items), [occasion.items]);

  const headerCopy = isCollection
    ? { title: 'My Collection', subtitle: 'Look at all the LEGO you already have!' }
    : { title: 'My Wishlist', subtitle: `Hi ${KID_NAME}! Pick what you want next.` };

  function moveItem(list, hook, idx, dir) {
    const target = idx + (dir === 'up' ? -1 : 1);
    if (target < 0 || target >= list.length) return;
    const a = list[idx];
    const b = list[target];
    const ra = a.rank;
    const rb = b.rank;
    // Two optimistic updates; the hook patches local state in place, our
    // sortByRank() in render flips the visual order.
    hook.updateItem(a.id, { rank: rb });
    hook.updateItem(b.id, { rank: ra });
  }

  return (
    <div
      className="kid-root"
      style={{
        minHeight: '100vh',
        background: '#000',
        backgroundImage: 'radial-gradient(circle at 20% 0%, #1a1a1a 0%, #000 50%)',
        color: '#fff',
        fontFamily: 'Fredoka, system-ui, sans-serif',
      }}
    >
      <div style={{
        maxWidth: isLandscape ? 1366 : 1024,
        margin: '0 auto',
        padding: '32px 36px 80px',
        boxSizing: 'border-box',
      }}>
        <Header accent={ACCENT} title={headerCopy.title} subtitle={headerCopy.subtitle} />
        <Tabs
          tab={tab}
          setTab={setTab}
          accent={ACCENT}
          counts={{
            monthly: monthlySorted.length,
            occasion: occasionSorted.length,
            collection: sets.items.length + minifigs.items.length,
          }}
        />

        {isCollection && (
          <SubTabs
            value={collectionSubTab}
            setValue={setCollectionSubTab}
            options={[
              { id: 'sets',     label: 'Sets',     icon: '🧱', count: sets.items.length },
              { id: 'minifigs', label: 'Minifigs', icon: '🦸', count: minifigs.items.length },
            ]}
          />
        )}

        {tab === 'monthly' && (
          <TierTab
            items={monthlySorted}
            cols={cols}
            loading={monthly.loading}
            hasMore={monthly.hasMore}
            loadMore={monthly.loadMore}
            onUp={(i) => moveItem(monthlySorted, monthly, i, 'up')}
            onDown={(i) => moveItem(monthlySorted, monthly, i, 'down')}
            onOpen={(s) => setOpenSet(s)}
            showRank
            mode="wishlist"
            emptyMessage="Nothing on your Monthly wishlist yet!"
          />
        )}
        {tab === 'occasion' && (
          <TierTab
            items={occasionSorted}
            cols={cols}
            loading={occasion.loading}
            hasMore={occasion.hasMore}
            loadMore={occasion.loadMore}
            onUp={(i) => moveItem(occasionSorted, occasion, i, 'up')}
            onDown={(i) => moveItem(occasionSorted, occasion, i, 'down')}
            onOpen={(s) => setOpenSet(s)}
            showRank
            mode="wishlist"
            emptyMessage="Nothing on your Occasion wishlist yet!"
          />
        )}
        {tab === 'collection' && collectionSubTab === 'sets' && (
          <TierTab
            items={sets.items}
            cols={cols}
            loading={sets.loading}
            hasMore={sets.hasMore}
            loadMore={sets.loadMore}
            onOpen={(s) => setOpenSet(s)}
            showRank={false}
            mode="collection"
            emptyMessage="No sets in your collection yet."
          />
        )}
        {tab === 'collection' && collectionSubTab === 'minifigs' && (
          <TierTab
            items={minifigs.items}
            cols={cols}
            loading={minifigs.loading}
            hasMore={minifigs.hasMore}
            loadMore={minifigs.loadMore}
            onOpen={(s) => setOpenSet(s)}
            showRank={false}
            mode="collection"
            emptyMessage="No minifigs in your collection yet."
          />
        )}
      </div>

      {openSet && <DetailModal set={openSet} onClose={() => setOpenSet(null)} />}
    </div>
  );
}

function sortByRank(items) {
  return [...items].sort((a, b) => (a.rank ?? 9999) - (b.rank ?? 9999));
}

function useMediaQuery(query, defaultValue = false) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

function Header({ accent, title, subtitle }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 28,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 64, height: 64,
          borderRadius: 18,
          background: `linear-gradient(180deg, ${accent}, ${shade(accent, -0.25)})`,
          boxShadow: `0 6px 0 ${shade(accent, -0.45)}, 0 8px 24px ${accent}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Fredoka, system-ui', fontWeight: 700, fontSize: 38,
          color: '#fff',
          textShadow: '0 2px 0 #00000040',
        }}>★</div>
        <div>
          <h1 style={{
            margin: 0,
            fontFamily: 'Fredoka, system-ui',
            fontWeight: 700, fontSize: 44,
            lineHeight: 1,
            color: '#fff',
            letterSpacing: -1,
          }}>{title}</h1>
          <div style={{
            marginTop: 4,
            fontWeight: 500, fontSize: 18,
            color: '#888',
          }}>{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

function Tabs({ tab, setTab, accent, counts }) {
  const tabs = [
    { id: 'monthly',    label: 'Monthly',    icon: '🗓', count: counts.monthly },
    { id: 'occasion',   label: 'Occasion',   icon: '🎁', count: counts.occasion },
    { id: 'collection', label: 'Collection', icon: '🧱', count: counts.collection },
  ];
  return (
    <div style={{
      display: 'flex',
      gap: 10,
      padding: 8,
      background: '#161616',
      borderRadius: 22,
      marginBottom: 24,
      boxShadow: 'inset 0 1px 0 #ffffff08',
    }}>
      {tabs.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: '16px 14px',
              border: 'none',
              borderRadius: 16,
              background: active ? accent : 'transparent',
              color: active ? '#fff' : '#888',
              fontFamily: 'Fredoka, system-ui',
              fontWeight: 700, fontSize: 20,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10,
              boxShadow: active ? `0 4px 0 ${shade(accent, -0.4)}` : 'none',
              transition: 'all 0.15s',
              WebkitTapHighlightColor: 'transparent',
              letterSpacing: -0.3,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 22 }}>{t.icon}</span>
            <span>{t.label}</span>
            <span style={{
              background: active ? '#ffffff30' : '#2a2a2a',
              color: active ? '#fff' : '#aaa',
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              minWidth: 28,
            }}>{t.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function SubTabs({ value, setValue, options }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => setValue(o.id)}
            style={{
              padding: '12px 22px',
              border: active ? '2px solid #fff' : '2px solid #2a2a2a',
              borderRadius: 999,
              background: active ? '#fff' : 'transparent',
              color: active ? '#000' : '#aaa',
              fontFamily: 'Fredoka, system-ui',
              fontWeight: 700, fontSize: 17,
              cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center',
              gap: 10,
              WebkitTapHighlightColor: 'transparent',
              letterSpacing: -0.2,
            }}
          >
            <span style={{ fontSize: 20 }}>{o.icon}</span>
            <span>{o.label}</span>
            <span style={{
              background: active ? '#00000018' : '#2a2a2a',
              color: active ? '#000' : '#aaa',
              padding: '2px 9px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
            }}>{o.count}</span>
          </button>
        );
      })}
    </div>
  );
}
