'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import { toast } from 'sonner';
import {
  ShoppingBag, Grid, Tag, MessageSquare, AlertCircle, CheckCircle2, Edit, Phone, MessageCircle,
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

export default function DashboardPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [offers, setOffers] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, c, o, i, s] = await Promise.all([
          fetch('/api/products').then((r) => r.ok ? r.json() : []),
          fetch('/api/categories').then((r) => r.ok ? r.json() : []),
          fetch('/api/offers').then((r) => r.ok ? r.json() : []),
          fetch('/api/inquiries').then((r) => r.ok ? r.json() : []),
          fetch('/api/slider-images').then((r) => r.ok ? r.json() : []),
        ]);
        if (cancelled) return;
        setProducts(Array.isArray(p) ? p : []);
        setCategories(Array.isArray(c) ? c : []);
        setOffers(Array.isArray(o) ? o : []);
        setInquiries(Array.isArray(i) ? i : []);
        setSlides(Array.isArray(s) ? s : []);
      } catch (err) {
        console.error('Dashboard load failed:', err);
        if (!cancelled) toast.error('Could not load dashboard data. Please refresh.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const activeOffers = offers.filter((o) => o.is_active ?? o.isActive).length;
  const newInquiries = inquiries.filter((i) => i.status === 'new').length;
  const activeSlides = slides.filter((s) => s.is_active !== false).length;
  const recent = [...products].slice(0, 3);
  const recentInquiries = [...inquiries].filter((i) => !String(i.message || '').startsWith('[AI CHAT]')).slice(0, 3);
  const lowStock = products.filter((p) => typeof p.stock === 'number' && p.stock <= 5);

  const stats = [
    { label: 'Total Products',  value: products.length,   icon: ShoppingBag, href: '/admin/products' },
    { label: 'Total Categories',value: categories.length, icon: Grid,        href: '/admin/categories' },
    { label: 'Active Offers',   value: activeOffers,      icon: Tag,         href: '/admin/offers' },
    { label: 'New Inquiries',   value: newInquiries,      icon: MessageSquare, href: '/admin/inquiries', badge: newInquiries > 0 },
    { label: 'Hero Slides',     value: activeSlides,      icon: Images,      href: '/admin/slider' },
  ];

  return (
    <AdminShell>
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-white border border-sethi-gray200 rounded-sm p-5 flex items-start justify-between hover:border-sethi-gold transition-colors"
          >
            <div>
              <div className="text-xs text-sethi-gray500 uppercase tracking-wider">{s.label}</div>
              <div className={`font-serif text-3xl md:text-4xl mt-2 ${s.badge ? 'text-red-600' : ''}`}>
                {loading ? '—' : s.value}
              </div>
            </div>
            <s.icon className={`w-7 h-7 ${s.badge ? 'text-red-600' : 'text-sethi-gold'}`} />
          </Link>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link href="/admin/products/add" className="btn-primary">Add New Product</Link>
        <Link href="/admin/categories"   className="btn-secondary">Add New Category</Link>
        <Link href="/admin/slider"       className="btn-secondary">Manage Hero Slider</Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* ── Low Stock Alert — most urgent, comes first ── */}
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

        <div className="bg-white border border-sethi-gray200 rounded-sm">
          <div className="p-5 border-b border-sethi-gray200 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h2 className="font-serif text-xl text-red-700">Low Stock Alert</h2>
          </div>
          <div className="p-5">
            {loading ? (
              <p className="text-sethi-gray500 text-sm">Loading...</p>
            ) : lowStock.length === 0 ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-sm p-3 text-sm">
                <CheckCircle2 className="w-5 h-5" /> All products well stocked ✓
              </div>
            ) : (
              <ul className="space-y-3">
                {lowStock.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex items-center gap-3 border border-red-100 rounded-sm p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveImage(p)} alt="" className="w-12 h-12 object-cover bg-sethi-gray100 rounded-sm" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-xs text-sethi-gray500">{p.category}</div>
                    </div>
                    <div className="text-red-600 font-bold text-sm">{p.stock} left</div>
                    <Link href={`/admin/products/edit/${p.id}`} className="inline-flex items-center gap-1 text-sethi-gold text-sm hover:underline">
                      <Edit className="w-4 h-4" /> Edit
                    </Link>
                  </li>
                ))}
                {lowStock.length > 4 && (
                  <p className="text-xs text-sethi-gray500 text-center pt-1">
                    +{lowStock.length - 4} more low stock items — <Link href="/admin/products" className="text-sethi-gold underline">view all</Link>
                  </p>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* ── AI Chat Insights ── */}
        <AIChatInsights inquiries={inquiries} loading={loading} />

        {/* ── Hero Slider Preview ── */}
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

        {/* ── Recent Inquiries (customer form submissions only, AI chats excluded) ── */}
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
                        {formatIST(i.createdAt)} • {i.productInterest}
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
    </AdminShell>
  );
}
