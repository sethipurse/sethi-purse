'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import { toast } from 'sonner';
import {
  ShoppingBag, Grid, Tag, Users, MessageSquare, Phone, MessageCircle,
  Images, ImageIcon, Bot, TrendingUp, HelpCircle, Sparkles
} from 'lucide-react';
import { resolveImage, formatIST } from '@/lib/constants';

// ── Category keyword map for tagging AI chat content ──
const CATEGORY_KEYWORDS = {
  'Backpacks': ['backpack', 'bag pack', 'rucksack'],
  'Handbags': ['handbag', 'hand bag', 'ladies bag', 'purse'],
  'Luggage': ['luggage', 'trolley', 'suitcase', 'travel bag'],
  'Wallets': ['wallet', 'purse for cash'],
  'Slings': ['sling'],
  'School Bags': ['school bag'],
};

function detectCategory(text) {
  const lower = (text || '').toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return 'Other';
}

function extractUserQuestion(message) {
  const match = message.match(/User asked:\s*"([^"]+)"/i);
  return match ? match[1] : null;
}

function isWithinDays(dateStr, days) {
  try {
    const date = new Date(dateStr);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return date >= cutoff;
  } catch {
    return false;
  }
}

// ── AI Chat Insights Card ──
function AIChatInsights({ inquiries, loading }) {
  const insights = useMemo(() => {
    const aiChats = inquiries.filter((i) => String(i.message || '').startsWith('[AI CHAT]'));
    const last7Days = aiChats.filter((i) => isWithinDays(i.createdAt || i.created_at, 7));

    // Category tally
    const categoryCounts = {};
    const questions = [];
    last7Days.forEach((chat) => {
      const category = detectCategory(chat.message);
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      const question = extractUserQuestion(chat.message);
      if (question) questions.push(question);
    });

    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const maxCount = topCategories.length > 0 ? topCategories[0][1] : 1;

    return {
      totalThisWeek: last7Days.length,
      totalAllTime: aiChats.length,
      topCategories,
      maxCount,
      recentQuestions: questions.slice(0, 5),
    };
  }, [inquiries]);

  return (
    <div className="bg-white border border-sethi-gray200 rounded-sm">
      <div className="p-5 border-b border-sethi-gray200 flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-serif text-xl flex items-center gap-2">
          <Bot className="w-5 h-5 text-sethi-gold" /> AI Chat Insights
          <span className="text-xs font-normal text-sethi-gray500">(last 7 days)</span>
        </h2>
        <Link href="/admin/inquiries" className="text-sm text-sethi-gold hover:underline">View all chats</Link>
      </div>

      {loading ? (
        <p className="p-5 text-sethi-gray500 text-sm">Loading...</p>
      ) : insights.totalAllTime === 0 ? (
        <div className="p-8 text-center text-sethi-gray500">
          <Sparkles className="w-10 h-10 mx-auto mb-2 text-sethi-gold opacity-30" />
          <p className="text-sm">No AI chats yet. Once customers start using the AI assistant, insights will appear here.</p>
        </div>
      ) : (
        <div className="p-5 grid gap-5">
          {/* Left: stats + chart */}
          <div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-sethi-gold/10 rounded-sm p-4 text-center">
                <div className="font-serif text-3xl text-[#a07a28]">{insights.totalThisWeek}</div>
                <div className="text-xs text-sethi-gray500 mt-1">Chats this week</div>
              </div>
              <div className="bg-sethi-gray100 rounded-sm p-4 text-center">
                <div className="font-serif text-3xl text-[#2c1f14]">{insights.totalAllTime}</div>
                <div className="text-xs text-sethi-gray500 mt-1">Total all-time</div>
              </div>
            </div>

            {/* Category bar chart */}
            {insights.topCategories.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-sethi-gray500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> Most Asked About
                </p>
                <div className="space-y-2.5">
                  {insights.topCategories.map(([category, count]) => (
                    <div key={category} className="flex items-center gap-3">
                      <span className="text-sm text-sethi-gray800 w-24 truncate shrink-0">{category}</span>
                      <div className="flex-1 h-6 bg-sethi-gray100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sethi-gold to-[#a07a28] rounded-full flex items-center justify-end px-2 transition-all duration-500"
                          style={{ width: `${Math.max(15, (count / insights.maxCount) * 100)}%` }}
                        >
                          <span className="text-[11px] font-bold text-white">{count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: recent questions */}
          <div>
            <p className="text-xs font-semibold text-sethi-gray500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5" /> Recent Questions
            </p>
            {insights.recentQuestions.length === 0 ? (
              <p className="text-sm text-sethi-gray500">No questions logged this week.</p>
            ) : (
              <ul className="space-y-2">
                {insights.recentQuestions.map((q, idx) => (
                  <li key={idx} className="text-sm text-sethi-gray800 bg-sethi-gray100/60 rounded-sm px-3 py-2 line-clamp-2">
                    &ldquo;{q}&rdquo;
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Visual weight for an "Aaj Kya Karein?" action card — red/amber only for
// things that genuinely need attention right now; gold/neutral for steady
// opportunities (nothing urgent, just worth doing when there's time).
const TONE = {
  urgent: { border: 'border-red-300',   hover: 'hover:border-red-400',   title: 'text-red-700',   num: 'text-red-600' },
  warn:   { border: 'border-amber-300', hover: 'hover:border-amber-400', title: 'text-amber-700',  num: 'text-amber-600' },
  calm:   { border: 'border-sethi-gray200', hover: 'hover:border-sethi-gold/50', title: 'text-sethi-black', num: 'text-sethi-gold-dark' },
};

function ActionCard({ href, tone, title, children }) {
  const t = TONE[tone] || TONE.calm;
  return (
    <Link href={href} className={`text-left bg-white border ${t.border} rounded-sm p-4 ${t.hover} transition-colors block`}>
      <div className={`text-sm font-semibold ${t.title}`}>{title}</div>
      <p className="text-xs text-sethi-gray500 mt-1">{children}</p>
    </Link>
  );
}

export default function DashboardPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [offers, setOffers] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [slides, setSlides] = useState([]);
  const [customerStats, setCustomerStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetched separately from the main load — never lets a photo-cleanup
  // hiccup block or fail the rest of the dashboard (stays null on error,
  // which just renders a neutral "check it" prompt instead of a count).
  const [photoCleanupCount, setPhotoCleanupCount] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, c, o, i, s, customersRes] = await Promise.all([
          fetch('/api/products').then((r) => r.ok ? r.json() : []),
          fetch('/api/categories').then((r) => r.ok ? r.json() : []),
          fetch('/api/offers').then((r) => r.ok ? r.json() : []),
          fetch('/api/inquiries').then((r) => r.ok ? r.json() : []),
          fetch('/api/slider-images').then((r) => r.ok ? r.json() : []),
          // Same stats source app/admin/customers/page.js reads (`data.stats`)
          // — pageSize=1 keeps the row payload minimal since only the
          // stats block is needed here, not the customer list itself.
          fetch('/api/customers?page=1&pageSize=1').then((r) => r.ok ? r.json() : null).catch(() => null),
        ]);
        if (cancelled) return;
        setProducts(Array.isArray(p) ? p : []);
        setCategories(Array.isArray(c) ? c : []);
        setOffers(Array.isArray(o) ? o : []);
        setInquiries(Array.isArray(i) ? i : []);
        setSlides(Array.isArray(s) ? s : []);
        setCustomerStats(customersRes?.stats || null);
      } catch (err) {
        console.error('Dashboard load failed:', err);
        if (!cancelled) toast.error('Could not load dashboard data. Please refresh.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/products/stale-hidden?days=180')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (!cancelled) setPhotoCleanupCount(typeof data?.count === 'number' ? data.count : null); })
      .catch(() => { if (!cancelled) setPhotoCleanupCount(null); });
    return () => { cancelled = true; };
  }, []);

  const activeOffers = offers.filter((o) => o.is_active ?? o.isActive).length;
  const newInquiries = inquiries.filter((i) => i.status === 'new').length;
  const activeSlides = slides.filter((s) => s.is_active !== false).length;
  const recent = [...products].slice(0, 3);
  const recentInquiries = [...inquiries].filter((i) => !String(i.message || '').startsWith('[AI CHAT]')).slice(0, 3);
  const lowStock = products.filter((p) => typeof p.stock === 'number' && p.stock <= 5);

  // Hidden categories that now have at least one sellable product in them —
  // computed entirely from products/categories already fetched above (both
  // admin endpoints return every row, hidden or not), so this costs no
  // extra query. A quiet nudge for categories hidden while empty that have
  // since been restocked and forgotten about.
  const readyCategories = useMemo(() => {
    const activeCountByCategory = new Map();
    products.forEach((p) => {
      if (p.is_active === false) return;
      const key = p.category || p.category_id || '';
      if (!key) return;
      activeCountByCategory.set(key, (activeCountByCategory.get(key) || 0) + 1);
    });
    return categories.filter((c) => c.is_active === false && (activeCountByCategory.get(c.name) || 0) > 0);
  }, [products, categories]);

  const topStats = [
    { label: 'Total Products',   value: products.length,             icon: ShoppingBag, href: '/admin/products' },
    { label: 'Total Categories', value: categories.length,           icon: Grid,        href: '/admin/categories' },
    { label: 'Total Customers',  value: customerStats?.total ?? '—', icon: Users,       href: '/admin/customers' },
    { label: 'Active Offers',    value: activeOffers,                icon: Tag,         href: '/admin/offers' },
  ];

  // Recurring signals (inquiries, stock) sort first when they're actually
  // urgent; lower-stakes opportunities (photo cleanup, reveal-ready
  // categories) hold their base position at the end otherwise — not a
  // fixed order regardless of what needs attention today.
  const actionCards = [
    {
      key: 'inquiries',
      urgent: newInquiries > 0,
      el: (
        <ActionCard href="/admin/inquiries" tone={newInquiries > 0 ? 'urgent' : 'calm'} title="📩 Nayi Inquiries">
          {newInquiries > 0
            ? <><span className={`font-bold ${TONE.urgent.num}`}>{newInquiries}</span> naye customer ka jawab dena baaki hai — jitni jaldi reply utna behtar.</>
            : 'Koi nayi inquiry nahi — sab jawab de diya gaya hai ✓'}
        </ActionCard>
      ),
    },
    {
      key: 'lowstock',
      urgent: lowStock.length > 0,
      el: (
        <ActionCard href="/admin/products?lowStock=1" tone={lowStock.length > 0 ? 'warn' : 'calm'} title="📦 Low Stock">
          {lowStock.length > 0
            ? <><span className={`font-bold ${TONE.warn.num}`}>{lowStock.length}</span> product{lowStock.length > 1 ? 's' : ''} mein stock kam hai — restock ka time aa gaya.</>
            : 'Sab products well-stocked hain ✓'}
        </ActionCard>
      ),
    },
    {
      key: 'photocleanup',
      urgent: false,
      el: (
        <ActionCard href="/admin/photo-cleanup" tone="calm" title="🧹 Purani Photos">
          {photoCleanupCount === null
            ? 'Check karke dekho kitni purani hidden product photos hata sakte ho.'
            : photoCleanupCount === 0
              ? 'Sab saaf hai! 🎉'
              : <><span className={`font-bold ${TONE.calm.num}`}>{photoCleanupCount}</span> purani hidden product photo{photoCleanupCount > 1 ? 's' : ''} hata sakte ho, jagah bachega.</>}
        </ActionCard>
      ),
    },
  ];

  if (readyCategories.length > 0) {
    actionCards.push({
      key: 'readycats',
      urgent: false,
      el: (
        <ActionCard href="/admin/categories" tone="calm" title="👀 Reveal Ready">
          <span className={`font-bold ${TONE.calm.num}`}>{readyCategories.length}</span> hidden categor{readyCategories.length > 1 ? 'ies' : 'y'} mein ab products hain — dikhana chahoge?
        </ActionCard>
      ),
    });
  }

  const sortedActionCards = [...actionCards].sort((a, b) => (b.urgent ? 1 : 0) - (a.urgent ? 1 : 0));

  return (
    <AdminShell>
      {/* ── A. Top numbers — steady background counts, compact ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {topStats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white border border-sethi-gray200 rounded-sm p-4 flex items-center justify-between hover:border-sethi-gold/50 transition-colors"
          >
            <div>
              <div className="text-[11px] text-sethi-gray500 uppercase tracking-wider">{s.label}</div>
              <div className="font-serif text-2xl mt-1">{loading ? '—' : s.value}</div>
            </div>
            <s.icon className="w-5 h-5 text-sethi-gold shrink-0" />
          </Link>
        ))}
      </div>

      {/* ── D. Quick Actions ── */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link href="/admin/products/add" className="btn-primary">Add New Product</Link>
        <Link href="/admin/categories"   className="btn-secondary">Add New Category</Link>
        <Link href="/admin/slider"       className="btn-secondary">Manage Hero Slider</Link>
      </div>

      {/* ── B. Aaj Kya Karein? — the one question this page answers first ── */}
      <div className="mb-8">
        <h2 className="font-serif text-xl mb-3">Aaj Kya Karein?</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedActionCards.map((c) => <div key={c.key}>{c.el}</div>)}
        </div>
      </div>

      {/* ── C. Business Overview — supporting detail, lighter weight ── */}
      <div>
        <h2 className="font-serif text-lg text-sethi-gray500 mb-3">Business Overview</h2>
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Recent Products */}
          <div className="bg-white border border-sethi-gray200 rounded-sm">
            <div className="p-5 border-b border-sethi-gray200 flex items-center justify-between">
              <h2 className="font-serif text-xl">Recent Products</h2>
              <Link href="/admin/products" className="text-sm text-sethi-gold hover:underline">View all</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-sethi-gray100 text-left text-xs uppercase tracking-wider text-sethi-gray500">
                  <tr>
                    <th className="px-4 py-2">Image</th>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Category</th>
                    <th className="px-4 py-2">Price</th>
                    <th className="px-4 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 && !loading ? (
                    <tr><td colSpan="5" className="text-center p-6 text-sethi-gray500">No products yet.</td></tr>
                  ) : recent.map((p) => (
                    <tr key={p.id} className="border-t border-sethi-gray200">
                      <td className="px-4 py-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={resolveImage(p)} alt="" className="w-10 h-10 object-cover rounded-sm bg-sethi-gray100" />
                      </td>
                      <td className="px-4 py-2 font-medium">{p.name}</td>
                      <td className="px-4 py-2 text-sethi-gray500">{p.category}</td>
                      <td className="px-4 py-2 font-semibold">Rs.{p.salePrice ?? p.sale_price}</td>
                      <td className="px-4 py-2">
                        <Link href={`/admin/products/edit/${p.id}`} className="text-sethi-gold hover:underline">Edit</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer Snapshot — compact summary, not a rebuild of the Customers Command Center */}
          <div className="bg-white border border-sethi-gray200 rounded-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl flex items-center gap-2">
                <Users className="w-5 h-5 text-sethi-gold" /> Customer Snapshot
              </h2>
              <Link href="/admin/customers" className="text-sm text-sethi-gold hover:underline">View all</Link>
            </div>
            {loading || !customerStats ? (
              <p className="text-sethi-gray500 text-sm">Loading...</p>
            ) : (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="font-serif text-2xl text-sethi-black">{customerStats.total}</div>
                  <div className="text-xs text-sethi-gray500 mt-1">Total</div>
                </div>
                <div>
                  <div className="font-serif text-2xl text-green-600">{customerStats.newThisMonth}</div>
                  <div className="text-xs text-sethi-gray500 mt-1">New this month</div>
                </div>
                <div>
                  <div className="font-serif text-2xl text-blue-600">{customerStats.foreign}</div>
                  <div className="text-xs text-sethi-gray500 mt-1">Foreign / NRI</div>
                </div>
              </div>
            )}
          </div>

          {/* AI Chat Insights */}
          <AIChatInsights inquiries={inquiries} loading={loading} />

          {/* Hero Slider Preview */}
          <div className="bg-white border border-sethi-gray200 rounded-sm">
            <div className="p-5 border-b border-sethi-gray200 flex items-center justify-between">
              <h2 className="font-serif text-xl flex items-center gap-2">
                <Images className="w-5 h-5 text-sethi-gold" /> Hero Slider
              </h2>
              <Link href="/admin/slider" className="text-sm text-sethi-gold hover:underline">Manage slides</Link>
            </div>
            <div className="p-5">
              {loading ? (
                <p className="text-sethi-gray500 text-sm">Loading...</p>
              ) : slides.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-sethi-gray500 gap-3">
                  <ImageIcon className="w-10 h-10 text-sethi-gold opacity-40" />
                  <p className="text-sm font-medium">No slides added yet</p>
                  <Link href="/admin/slider" className="text-xs text-sethi-gold underline hover:text-[#a07a28]">
                    Add your first slide →
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {slides.slice(0, 4).map((slide) => (
                    <li key={slide.id} className="flex items-center gap-3">
                      <div className="w-16 h-12 rounded overflow-hidden bg-sethi-gray100 flex-shrink-0">
                        {slide.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={slide.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-sethi-gold opacity-40" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate text-[#2c1f14]">
                          {slide.headline || <span className="italic text-sethi-gray500 font-normal">No headline</span>}
                        </p>
                        <p className="text-xs text-sethi-gray500 truncate">
                          {slide.category ? `Category: ${slide.category}` : 'All products'}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        slide.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {slide.is_active !== false ? 'Active' : 'Hidden'}
                      </span>
                    </li>
                  ))}
                  {slides.length > 4 && (
                    <p className="text-xs text-sethi-gray500 text-center pt-1">
                      +{slides.length - 4} more — <Link href="/admin/slider" className="text-sethi-gold underline">view all</Link>
                    </p>
                  )}
                </ul>
              )}
            </div>
          </div>

          {/* Recent Inquiries (customer form submissions only, AI chats excluded) */}
          <div className="bg-white border border-sethi-gray200 rounded-sm lg:col-span-2">
            <div className="p-5 border-b border-sethi-gray200 flex items-center justify-between">
              <h2 className="font-serif text-xl flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-sethi-gold" /> Recent Inquiries
                {newInquiries > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold bg-red-600 text-white">
                    {newInquiries} new
                  </span>
                )}
              </h2>
              <Link href="/admin/inquiries" className="text-sm text-sethi-gold hover:underline">View all</Link>
            </div>
            <div>
              {loading ? (
                <p className="p-5 text-sethi-gray500 text-sm">Loading...</p>
              ) : recentInquiries.length === 0 ? (
                <p className="p-6 text-sethi-gray500 text-sm text-center">
                  No customer inquiries yet. When customers fill the contact form, they&apos;ll show up here.
                </p>
              ) : (
                <ul className="divide-y divide-sethi-gray200">
                  {recentInquiries.map((i) => (
                    <li key={i.id} className="p-4 flex flex-wrap items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{i.name}</span>
                          <span className="text-xs text-sethi-gray500">• {i.city}</span>
                          <span className={`inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                            i.status === 'new'       ? 'bg-red-100 text-red-700' :
                            i.status === 'contacted' ? 'bg-blue-100 text-blue-700' :
                            i.status === 'converted' ? 'bg-green-100 text-green-700' :
                                                       'bg-sethi-gray200 text-sethi-gray800'
                          }`}>
                            {(i.status || 'new').toUpperCase()}
                          </span>
                        </div>
                        <div className="text-xs text-sethi-gray500 mt-0.5">
                          {formatIST(i.created_at ?? i.createdAt)} • {i.product_interest ?? i.productInterest}
                        </div>
                        <p className="text-sm mt-1 line-clamp-1 text-sethi-gray800">{i.message}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                        <a href={`tel:+91${i.phone}`} className="inline-flex items-center gap-1 text-sethi-gold text-xs hover:underline">
                          <Phone className="w-3 h-3" /> Call
                        </a>
                        <a href={`https://wa.me/91${i.phone}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sethi-gold text-xs hover:underline">
                          <MessageCircle className="w-3 h-3" /> WhatsApp
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>
      </div>
    </AdminShell>
  );
}
