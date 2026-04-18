"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Search, Plus, Filter, Phone, 
  Target, Calendar, ChevronRight,
  LogOut, ClipboardList, Database, AlertCircle, Edit2, ShieldCheck, User as UserIcon, MessageSquare, Save, History,
  PhoneOff, Clock, XCircle, Handshake, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState([]);
  const [allCount, setAllCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const todayDate = new Date();
  const currentDayOfMonth = todayDate.getDate();
  const formattedDate = todayDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const [profile, setProfile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [remark, setRemark] = useState("");
  const [history, setHistory] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [filter, setFilter] = useState("All");
  const [selectedExec, setSelectedExec] = useState("ALL AGENTS");

  useEffect(() => {
    fetchData();

    // Handle home screen shortcut params
    const initialFilter = searchParams.get('filter');
    if (initialFilter) setFilter(initialFilter);

    // Android Back Button Intelligence (History Trap)
    const handlePopState = (e) => {
      if (isDetailOpen) {
        setIsDetailOpen(false);
        // We stay on the page, don't let it navigate back to login or previous
        window.history.pushState(null, "", window.location.pathname);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isDetailOpen, searchParams]);

  async function fetchData() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push("/login");
      return;
    }

    if (session) {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setProfile(prof);
      const { count } = await supabase.from('customers').select('*', { count: 'exact', head: true });
      setAllCount(count || 0);

      let query = supabase.from('customers').select('*');
      const isMasterAdmin = prof?.role === 'admin' || prof?.username === 'pranprakash' || prof?.username === 'adithprakash';

      if (!isMasterAdmin) {
         const myIdentity = prof?.full_name_excel || prof?.username || "SECURE_LOCK";
         if (myIdentity === "SECURE_LOCK") query = query.eq('id', '00000000-0000-0000-0000-000000000000');
         else query = query.ilike('assigned_executive', `%${myIdentity}%`);
      }
      
      const { data: custs } = await query.order('created_at', { ascending: false });
      setCustomers(custs || []);
    }
    setLoading(false);
  }

  const fetchHistory = async (custId) => {
    const { data } = await supabase.from('interactions').select('*').eq('customer_id', custId).order('created_at', { ascending: false }).limit(5);
    setHistory(data || []);
  };

  const handleSaveInteraction = async (manualRemark = null) => {
    const entryRemark = manualRemark || remark;
    if (!entryRemark.trim()) return;
    
    setIsSaving(true);
    const { error } = await supabase.from('interactions').insert({
      customer_id: selectedCustomer.id,
      agent_id: profile.id,
      remark: entryRemark,
      type: 'Call'
    });
    if (!error) {
      setRemark("");
      fetchHistory(selectedCustomer.id);
    }
    setIsSaving(false);
  };

  const updateInstallmentDay = async (newDay) => {
    const day = parseInt(newDay);
    if (isNaN(day) || day < 1 || day > 31) return;
    const { error } = await supabase.from('customers').update({ installment_day: day }).eq('id', selectedCustomer.id);
    if (!error) {
       setSelectedCustomer({...selectedCustomer, installment_day: day});
       fetchData();
    }
  };

  const filteredCustomers = customers.filter(c => {
    const isDueToday = c.installment_day === currentDayOfMonth;
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.loan_no?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesExec = selectedExec === 'ALL AGENTS' || c.assigned_executive === selectedExec;
    const matchesDailyFilter = filter === 'All' || isDueToday;
    
    return matchesSearch && matchesExec && matchesDailyFilter;
  });

  const uniqueExecs = Array.from(new Set(customers.map(c => c.assigned_executive).filter(Boolean))).sort();

  if (loading) return null;

  const isAdmin = profile?.role === 'admin' || profile?.username === 'pranprakash' || profile?.username === 'adithprakash';

  const displayCustomers = filteredCustomers;
  const totalMonthlyTBC = displayCustomers.reduce((acc, c) => acc + (parseFloat(c.month_tbc) || 0), 0);
  const totalPoolOS = displayCustomers.reduce((acc, c) => acc + (parseFloat(c.loan_amount) || 0), 0);

  return (
    <div className="container safe-bottom">
      <div style={{ padding: '32px 0 20px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '32px', right: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => fetchData()}
            className="btn-icon"
            style={{ background: 'rgba(197,160,89,0.1)', color: 'var(--primary)', padding: '8px', borderRadius: '10px' }}
          >
            <motion.div
              animate={{ rotate: loading ? 360 : 0 }}
              transition={{ repeat: loading ? Infinity : 0, duration: 1, ease: "linear" }}
              style={{ display: 'flex' }}
            >
              <RefreshCw size={16} />
            </motion.div>
          </button>

          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
            className="btn-icon"
            style={{ background: 'rgba(255,59,48,0.1)', color: '#FF3B30', padding: '8px', borderRadius: '10px' }}
          >
            <LogOut size={16} />
          </button>
          
          <div style={{ 
              background: isAdmin ? 'var(--primary)' : 'rgba(255,255,255,0.05)', 
              color: isAdmin ? '#000' : 'var(--text-dim)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '9px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: isAdmin ? 'none' : '1px solid var(--border)'
          }}>
             {isAdmin ? <ShieldCheck size={10} /> : <UserIcon size={10} />}
             {isAdmin ? 'MASTER ADMIN' : 'RESTRICTED AGENT'}
          </div>
        </div>
        
        <p style={{ color: 'var(--primary)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
          {formattedDate}
        </p>
        <p style={{ color: 'var(--text-dim)', fontSize: '10px', marginTop: '2px', opacity: 0.7 }}>
          Active Session: {profile?.username}
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '24px' }}>
          <div>
            <div className="gold-text" style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em' }}>
              ₹{totalMonthlyTBC.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-dim)', fontWeight: 700 }}>MONTHLY TARGET</div>
          </div>
          {isAdmin && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#FFF', letterSpacing: '-0.02em' }}>
                ₹{totalPoolOS.toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-dim)', fontWeight: 700 }}>TOTAL PORTFOLIO O/S</div>
            </div>
          )}
        </div>
      </div>

      {isAdmin && uniqueExecs.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-dim)', fontWeight: 800, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Filter by Executive Agent
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <button
              onClick={() => setSelectedExec('ALL AGENTS')}
              style={{
                whiteSpace: 'nowrap',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 700,
                background: selectedExec === 'ALL AGENTS' ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                color: selectedExec === 'ALL AGENTS' ? '#000' : 'var(--text-dim)',
                border: selectedExec === 'ALL AGENTS' ? 'none' : '1px solid var(--border)',
                transition: 'all 0.2s ease'
              }}
            >
              ALL AGENTS
            </button>
            {uniqueExecs.map(exec => (
              <button
                key={exec}
                onClick={() => setSelectedExec(exec)}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  background: selectedExec === exec ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                  color: selectedExec === exec ? '#000' : 'var(--text-dim)',
                  border: selectedExec === exec ? 'none' : '1px solid var(--border)',
                  transition: 'all 0.2s ease'
                }}
              >
                {exec}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
        <input type="text" placeholder="Search my workload..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ paddingLeft: '40px', background: '#141415' }} />
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button 
          onClick={() => setFilter('All')} 
          style={{ 
            flex: 1, 
            background: filter === 'All' ? 'var(--primary)' : 'rgba(255,255,255,0.03)', 
            color: filter === 'All' ? '#000' : 'var(--text-dim)',
            border: filter === 'All' ? 'none' : '1px solid var(--border)',
            padding: '10px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 800
          }}
        >
          ALL CASES
        </button>
        <button 
          onClick={() => setFilter('Due Today')} 
          style={{ 
            flex: 1, 
            background: filter === 'Due Today' ? 'var(--primary)' : 'rgba(197,160,89,0.05)', 
            color: filter === 'Due Today' ? '#000' : 'var(--text-dim)',
            border: filter === 'Due Today' ? 'none' : '1px solid var(--border)',
            padding: '10px',
            borderRadius: '10px',
            fontSize: '11px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Target size={12} /> DUE TODAY
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {displayCustomers.length > 0 ? (
          displayCustomers.map((customer) => {
            const isDueToday = customer.installment_day === currentDayOfMonth;
            
            return (
              <div key={customer.id} className="card" onClick={() => { 
                setSelectedCustomer(customer); 
                setIsDetailOpen(true); 
                fetchHistory(customer.id);
                // Push state for back-button handling
                window.history.pushState({ detailOpen: true }, "");
              }} 
                style={{ 
                  padding: '16px', 
                  borderLeft: isDueToday ? '3px solid var(--primary)' : '1px solid var(--border)',
                  background: isDueToday ? 'rgba(197,160,89,0.02)' : 'var(--card-bg)'
                }}
              >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{customer.name}</div>
                    {isDueToday && (
                      <span style={{ background: 'var(--primary)', color: '#000', fontSize: '8px', padding: '2px 6px', borderRadius: '4px', fontWeight: 900, textTransform: 'uppercase' }}>
                        DUE TODAY
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginTop: '4px' }}>
                     Day {customer.installment_day || '—'} • {customer.loan_no}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="gold-text" style={{ fontWeight: 800 }}>₹{(parseFloat(customer.month_tbc) || 0).toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '8px', opacity: 0.6 }}>{isAdmin ? customer.assigned_executive : 'MY TBC'}</div>
                </div>
              </div>
            </div>
            );
          })
        ) : (
          <div style={{ padding: '60px 20px', textAlign: 'center', opacity: 0.5 }}>
             <AlertCircle size={40} style={{ margin: '0 auto 16px' }} />
             <p style={{ fontSize: '14px' }}>No cases found matching this filter.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isDetailOpen && selectedCustomer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDetailOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', zIndex: 100 }}
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--card-bg)', borderTop: '1px solid var(--border)', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', zIndex: 101, maxHeight: '92vh', overflowY: 'auto', padding: '24px' }}
            >
              <div style={{ width: '40px', height: '4px', background: 'var(--border)', borderRadius: '2px', margin: '0 auto 24px' }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>{selectedCustomer.name}</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Database size={12} /> {selectedCustomer.loan_no}
                  </p>
                </div>
                <a href={`tel:${selectedCustomer.phone}`} className="btn-icon" style={{ background: 'var(--primary)', color: '#000', padding: '12px', borderRadius: '14px' }}>
                  <Phone size={20} />
                </a>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: 700 }}>COLLECTION DAY</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={14} className="gold-text" />
                    <select 
                      value={selectedCustomer.installment_day || ""} 
                      onChange={(e) => updateInstallmentDay(e.target.value)}
                      style={{ background: 'transparent', border: 'none', color: '#FFF', fontWeight: 800, fontSize: '16px', outline: 'none' }}
                    >
                      <option value="">Set Day</option>
                      {Array.from({length: 31}, (_, i) => (
                        <option key={i+1} value={i+1}>{i+1}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: 700 }}>MONTHLY TBC</div>
                  <div style={{ fontWeight: 800, fontSize: '18px' }} className="gold-text">
                    ₹{(parseFloat(selectedCustomer.month_tbc) || 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                 <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-dim)', marginBottom: '16px', textTransform: 'uppercase' }}>Log Call Interaction</div>
                 <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', scrollbarWidth: 'none' }}>
                    {['Promised', 'Busy', 'Switch Off', 'Wrong No'].map((quickRemark) => (
                      <button 
                        key={quickRemark}
                        onClick={() => handleSaveInteraction(quickRemark)}
                        style={{ whiteSpace: 'nowrap', padding: '10px 16px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.05)', color: '#FFF', border: '1px solid var(--border)' }}
                      >
                        {quickRemark}
                      </button>
                    ))}
                 </div>
                 <div style={{ position: 'relative', marginTop: '8px' }}>
                    <MessageSquare size={16} style={{ position: 'absolute', left: '12px', top: '14px', color: 'var(--text-dim)' }} />
                    <input 
                      placeholder="Add custom remark..." 
                      style={{ paddingLeft: '40px', background: '#141415' }}
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveInteraction()}
                    />
                 </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <History size={14} style={{ color: 'var(--primary)' }} />
                  <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Interaction History</div>
                </div>
                {history.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {history.map((h, i) => (
                      <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', borderLeft: '2px solid var(--border)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#FFF', marginBottom: '4px' }}>{h.remark}</div>
                        <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>
                          {new Date(h.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', opacity: 0.4, fontSize: '11px' }}>No previous logs</div>
                )}
              </div>

              <div style={{ height: '40px' }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>Loading Data Stream...</div>}>
       <DashboardContent />
    </Suspense>
  );
}
