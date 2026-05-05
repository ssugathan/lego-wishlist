import { useMemo, useState } from 'react';
import { useWishlist } from '../hooks/useWishlist.js';
import { useInventory } from '../hooks/useInventory.js';
import WishlistTable from '../admin/WishlistTable.jsx';
import InventoryTable from '../admin/InventoryTable.jsx';
import AddItemForm from '../admin/AddItemForm.jsx';

// AdminView — desktop functional UI. Two top-level tabs: Wishlist | Inventory.
// Inventory has Sets | Minifigs sub-tabs.
//
// Soft duplicate detection is computed per-tab here and passed into AddItemForm
// so the form doesn't need its own data hooks.

export default function AdminView() {
  const [tab, setTab] = useState('wishlist');

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b px-6 py-3">
        <h1 className="text-xl font-bold">LEGO Wishlist · Admin</h1>
        <nav className="mt-3 flex gap-2 text-sm">
          <TabBtn active={tab === 'wishlist'} onClick={() => setTab('wishlist')}>Wishlist</TabBtn>
          <TabBtn active={tab === 'inventory'} onClick={() => setTab('inventory')}>Inventory</TabBtn>
        </nav>
      </header>
      <main className="p-6 space-y-6 max-w-7xl mx-auto">
        {tab === 'wishlist' ? <WishlistTab /> : <InventoryTab />}
      </main>
    </div>
  );
}

function WishlistTab() {
  // Admin sees all statuses (status: null) so dad can see purchased history too.
  const wishlist = useWishlist({ status: null });
  const existingIds = useMemo(
    () => wishlist.items.map((i) => i.bricklinkId).filter(Boolean),
    [wishlist.items]
  );

  async function handleAdd(payload) {
    if (payload.rank == null) {
      // Default: last in tier. Compute from current items.
      const tierItems = wishlist.items.filter((i) => i.budgetTier === payload.budgetTier);
      const maxRank = tierItems.reduce((m, i) => Math.max(m, i.rank ?? 0), 0);
      payload.rank = maxRank + 1;
    }
    await wishlist.create(payload);
  }

  return (
    <>
      <Section title="Add to wishlist">
        <AddItemForm mode="wishlist" existingIds={existingIds} onSubmit={handleAdd} />
      </Section>
      <Section title="Wishlist" subtitle={`${wishlist.items.length} loaded`}>
        {wishlist.error && <ErrorBanner error={wishlist.error} />}
        <WishlistTable
          items={wishlist.items}
          loading={wishlist.loading}
          hasMore={wishlist.hasMore}
          loadMore={wishlist.loadMore}
          updateItem={wishlist.updateItem}
          markPurchased={wishlist.markPurchased}
          remove={wishlist.remove}
        />
      </Section>
    </>
  );
}

function InventoryTab() {
  const [sub, setSub] = useState('sets');
  const sets = useInventory('sets');
  const minifigs = useInventory('minifigs');

  const setIds = useMemo(() => sets.items.map((i) => i.setNumber).filter(Boolean), [sets.items]);
  const minifigIds = useMemo(() => minifigs.items.map((i) => i.bricklinkId).filter(Boolean), [minifigs.items]);

  return (
    <>
      <div className="flex gap-2 text-sm">
        <SubTab active={sub === 'sets'} onClick={() => setSub('sets')}>Sets</SubTab>
        <SubTab active={sub === 'minifigs'} onClick={() => setSub('minifigs')}>Minifigs</SubTab>
      </div>

      {sub === 'sets' ? (
        <>
          <Section title="Add set">
            <AddItemForm
              mode="inventory-sets"
              existingIds={setIds}
              onSubmit={async (payload) => { await sets.create(payload); }}
            />
          </Section>
          <Section title="Sets" subtitle={`${sets.items.length} loaded`}>
            {sets.error && <ErrorBanner error={sets.error} />}
            <InventoryTable
              kind="sets"
              items={sets.items}
              loading={sets.loading}
              hasMore={sets.hasMore}
              loadMore={sets.loadMore}
              remove={sets.remove}
            />
          </Section>
        </>
      ) : (
        <>
          <Section title="Add minifig">
            <AddItemForm
              mode="inventory-minifigs"
              existingIds={minifigIds}
              onSubmit={async (payload) => { await minifigs.create(payload); }}
            />
          </Section>
          <Section title="Minifigs" subtitle={`${minifigs.items.length} loaded`}>
            {minifigs.error && <ErrorBanner error={minifigs.error} />}
            <InventoryTable
              kind="minifigs"
              items={minifigs.items}
              loading={minifigs.loading}
              hasMore={minifigs.hasMore}
              loadMore={minifigs.loadMore}
              remove={minifigs.remove}
            />
          </Section>
        </>
      )}
    </>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded ${active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
    >
      {children}
    </button>
  );
}
function SubTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded border ${active ? 'bg-white border-blue-600 text-blue-600' : 'bg-gray-50 text-gray-600'}`}
    >
      {children}
    </button>
  );
}
function Section({ title, subtitle, children }) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}
function ErrorBanner({ error }) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-2">
      {error.message || String(error)}
    </div>
  );
}
