"use client";
import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Search, Plus, Filter, Phone, 
  Target, Calendar, ChevronRight,
  LogOut, ClipboardList, Database, AlertCircle, Edit2, ShieldCheck, User as UserIcon, MessageSquare, Save, History,
  PhoneOff, Clock, XCircle, Handshake, RefreshCw, Check
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
  const [collections, setCollections] = useState([]);
  const [colFormData, setColFormData] = useState({ 
    amount: "", 
    mode: "Cash", 
    ref: "", 
    date: new Date().toISOString().split('T')[0] 
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedHistory, setVerifiedHistory] = useState([]);
  const [customerCollections, setCustomerCollections] = useState([]);

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
      const isMasterAdmin = prof?.role === 'admin' || prof?.username === 'pranprakash' || prof?.username === 'adithprakash';

      if (isMasterAdmin) {
        // Pending Queue
        const { data: cols } = await supabase
          .from('collections')
          .select('*, customers(name, loan_no), profiles!agent_id(username, full_name_excel)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });
        setCollections(cols || []);

        // Master Ledger (Approved)
        const { data: vh } = await supabase
          .from('collections')
          .select('*, customers(name, loan_no), profiles!agent_id(username, full_name_excel)')
          .eq('status', 'verified')
          .order('created_at', { ascending: false })
          .limit(20);
        setVerifiedHistory(vh || []);
      }

      const { count } = await supabase.from('customers').select('*', { count: 'exact', head: true });
      setAllCount(count || 0);

      let query = supabase.from('customers').select('*');

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
    const { data: interactions } = await supabase
      .from('interactions')
      .select('*, profiles(username, full_name_excel)')
      .eq('customer_id', custId)
      .order('created_at', { ascending: false })
      .limit(10);
    setHistory(interactions || []);

    const { data: pms } = await supabase
      .from('collections')
      .select('*, profiles!agent_id(username, full_name_excel)')
      .eq('customer_id', custId)
      .eq('status', 'verified')
      .order('created_at', { ascending: false });
    setCustomerCollections(pms || []);
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

  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to permanently delete all interaction history for this customer? (Payment history will NOT be deleted)")) return;
    const { error } = await supabase.from('interactions').delete().eq('customer_id', selectedCustomer.id);
    if (!error) fetchHistory(selectedCustomer.id);
  };

  const handleLogCollection = async () => {
    if (!colFormData.amount || parseFloat(colFormData.amount) <= 0) return;
    setIsVerifying(true);
    
    const { error } = await supabase.from('collections').insert({
      customer_id: selectedCustomer.id,
      agent_id: profile.id,
      amount: parseFloat(colFormData.amount),
      payment_mode: colFormData.mode,
      reference_no: colFormData.ref,
      created_at: new Date(colFormData.date).toISOString()
    });

    if (!error) {
      alert("Collection logged! Awaiting Admin verification.");
      setColFormData({ 
        amount: "", 
        mode: "Cash", 
        ref: "", 
        date: new Date().toISOString().split('T')[0] 
      });
      setIsDetailOpen(false);
    }
    setIsVerifying(false);
  };

  const acceptCollection = async (col) => {
    setIsVerifying(true);
    // 1. Mark as verified
    const { error: colErr } = await supabase.from('collections').update({
      status: 'verified',
      verified_by: profile.id
    }).eq('id', col.id);

    if (!colErr) {
      // 2. Reduce Customer balances
      const newTBC = (parseFloat(col.customers.month_tbc) || 0) - col.amount;
      const newTotal = (parseFloat(col.customers.loan_amount) || 0) - col.amount;
      
      await supabase.from('customers').update({
        month_tbc: newTBC,
        loan_amount: newTotal
      }).eq('id', col.customer_id);

      fetchData();
    }
    setIsVerifying(false);
  };

  const rejectCollection = async (colId) => {
    await supabase.from('collections').update({ status: 'rejected' }).eq('id', colId);
    fetchData();
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
      <div style={{ padding: '24px 0', borderBottom: '1px solid var(--border)', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
           <div>
              <h1 style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.02em', color: '#FFF' }}>
                THC <span className="gold-text">GROUP</span>
              </h1>
              <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>
                 {formattedDate} • {profile?.username}
              </p>
           </div>
           
           <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => fetchData()}
                className="btn-icon"
                style={{ background: 'rgba(197,160,89,0.1)', color: 'var(--primary)', padding: '10px', borderRadius: '12px' }}
              >
                <motion.div
                  animate={{ rotate: loading ? 360 : 0 }}
                  transition={{ repeat: loading ? Infinity : 0, duration: 1, ease: "linear" }}
                  style={{ display: 'flex' }}
                >
                  <RefreshCw size={18} />
                </motion.div>
              </button>
              <button 
                onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
                className="btn-icon"
                style={{ background: 'rgba(255,59,48,0.1)', color: '#FF3B30', padding: '10px', borderRadius: '12px' }}
              >
                <LogOut size={18} />
              </button>
           </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
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

        {isAdmin && (
          <button 
            onClick={() => setFilter('Verifications')} 
            style={{ 
              flex: 1, 
              background: filter === 'Verifications' ? 'var(--warning)' : 'rgba(255,159,10,0.05)', 
              color: filter === 'Verifications' ? '#000' : 'var(--warning)',
              border: filter === 'Verifications' ? 'none' : '1px solid rgba(255,159,10,0.2)',
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
            <ShieldCheck size={12} /> PENDING ({collections.length})
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filter === 'Verifications' ? (
           collections.length > 0 ? (
             collections.map((col) => (
               <div key={col.id} className="card" style={{ padding: '20px', borderLeft: '3px solid var(--warning)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                     <div>
                        <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--warning)' }}>₹{col.amount.toLocaleString('en-IN')}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>{col.payment_mode} • {col.reference_no || 'No Ref'}</div>
                     </div>
                     <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, fontSize: '12px' }}>{col.customers.name}</div>
                        <div style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Agent: {col.profiles.full_name_excel || col.profiles.username}</div>
                     </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                     <button 
                        disabled={isVerifying}
                        onClick={() => acceptCollection(col)}
                        style={{ flex: 2, background: 'var(--success)', color: '#000', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 800, fontSize: '11px' }}
                     >
                        ACCEPT RECEIPT
                     </button>
                     <button 
                        disabled={isVerifying}
                        onClick={() => rejectCollection(col.id)}
                        style={{ flex: 1, background: 'rgba(255,59,48,0.1)', color: '#FF3B30', border: '1px solid rgba(255,59,48,0.2)', padding: '10px', borderRadius: '8px', fontWeight: 700, fontSize: '11px' }}
                     >
                        REJECT
                     </button>
                  </div>
               </div>
             ))
           ) : (
             <div style={{ padding: '60px 20px', textAlign: 'center', opacity: 0.5 }}>
                <ShieldCheck size={40} style={{ margin: '0 auto 16px', color: 'var(--success)' }} />
                <p style={{ fontSize: '14px' }}>All collections are verified! <br/>Your books are clean.</p>
             </div>
           )
        ) : displayCustomers.length > 0 ? (
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
                 <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => {
                        const phone = selectedCustomer.phone?.replace(/[^0-9+]/g, '');
                        if (phone) window.location.href = `tel:${phone}`;
                        else alert("No valid phone number assigned to this customer.");
                      }}
                      className="btn-icon" 
                      style={{ background: 'var(--primary)', color: '#000', padding: '12px', borderRadius: '14px' }}
                    >
                      <Phone size={20} />
                    </button>
                    <button 
                      onClick={() => {
                        const phone = selectedCustomer.phone;
                        if (phone) {
                          navigator.clipboard.writeText(phone);
                          alert("Number copied! You can now paste it in your dialer.");
                        }
                      }}
                      className="btn-icon" 
                      style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)', padding: '12px', borderRadius: '14px', border: '1px solid var(--border)' }}
                    >
                      <ClipboardList size={18} />
                    </button>
                 </div>
              </div>

              <div style={{ marginBottom: '32px' }}>
                 <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-dim)', marginBottom: '16px', textTransform: 'uppercase' }}>Total Audit Timeline</div>
                 
                 {/* Payments First (Financial Criticality) */}
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                    {customerCollections.map((c, i) => (
                      <div key={`col-${i}`} style={{ padding: '12px', background: 'rgba(48, 209, 88, 0.05)', borderRadius: '12px', border: '1px solid rgba(48, 209, 88, 0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ background: 'var(--success)', color: '#000', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Check size={10} />
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 900, color: 'var(--success)' }}>₹{c.amount.toLocaleString('en-IN')}</div>
                           </div>
                           <div style={{ fontSize: '9px', color: 'var(--text-dim)', fontWeight: 700 }}>VERIFIED RECEIPT</div>
                        </div>
                        <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>
                          Received via {c.payment_mode} • {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    ))}
                 </div>

                 {/* Interaction status logs */}
                 <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-dim)', marginBottom: '12px', opacity: 0.6 }}>CALL STATUS & REMARKS</div>
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

               <div 
                 id="log-collection-form"
                 style={{ marginBottom: '32px', padding: '20px', background: 'rgba(197,160,89,0.03)', borderRadius: '20px', border: '1px solid rgba(197,160,89,0.2)' }}
               >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                     <Save size={14} style={{ color: 'var(--primary)' }} />
                     <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase' }}>Log Collection (Money Received)</div>
                  </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <input 
                      type="number" 
                      placeholder="Amount (₹)" 
                      value={colFormData.amount} 
                      onChange={e => setColFormData({...colFormData, amount: e.target.value})}
                      style={{ background: '#141415' }}
                    />
                    <select 
                      value={colFormData.mode} 
                      onChange={e => setColFormData({...colFormData, mode: e.target.value})}
                      style={{ background: '#141415', color: '#FFF' }}
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI</option>
                      <option value="Bank">Bank Transfer</option>
                    </select>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginBottom: '4px', textTransform: 'uppercase' }}>Payment Date</div>
                    <input 
                      type="date" 
                      value={colFormData.date} 
                      onChange={e => setColFormData({...colFormData, date: e.target.value})}
                      style={{ background: '#141415' }}
                    />
                 </div>
                 <input 
                    placeholder="Reference No. (Optional)" 
                    value={colFormData.ref} 
                    onChange={e => setColFormData({...colFormData, ref: e.target.value})}
                    style={{ background: '#141415', marginBottom: '12px' }}
                 />
                 <button 
                  disabled={isVerifying}
                  onClick={handleLogCollection}
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '12px', fontSize: '11px' }}
                 >
                   {isVerifying ? 'Logging...' : 'SUBMIT COLLECTION'}
                 </button>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <History size={14} style={{ color: 'var(--primary)' }} />
                  <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Interaction History</div>
                </div>
                {history.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {history.map((h, i) => (
                      <div key={i} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', borderLeft: h.remark.includes('Promised') ? '2px solid var(--primary)' : '2px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                           <div style={{ fontSize: '12px', fontWeight: 600, color: '#FFF' }}>{h.remark}</div>
                           <div style={{ fontSize: '9px', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase' }}>
                              {h.profiles?.full_name_excel || h.profiles?.username || 'AGENT'}
                           </div>
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-dim)', opacity: 0.8 }}>
                          {new Date(h.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '20px', textAlign: 'center', opacity: 0.4, fontSize: '11px' }}>No previous logs</div>
                )}
                {history.length > 0 && (
                   <button 
                    onClick={handleClearHistory}
                    style={{ marginTop: '16px', background: 'transparent', border: '1px solid rgba(255,59,48,0.2)', color: '#FF3B30', fontSize: '10px', fontWeight: 700, padding: '8px 12px', borderRadius: '8px', width: '100%', opacity: 0.6 }}
                   >
                     CLEAR ALL REMARKS
                   </button>
                 )}
              </div>

                 <div style={{ height: '160px' }} />

               {/* STICKY FIELD ACTION BAR */}
               <div style={{ 
                 position: 'fixed', 
                 bottom: 0, 
                 left: 0, 
                 right: 0, 
                 padding: '24px 20px calc(24px + env(safe-area-inset-bottom, 0px))', 
                 background: 'rgba(20, 20, 21, 0.85)', 
                 backdropFilter: 'blur(24px)', 
                 WebkitBackdropFilter: 'blur(24px)',
                 borderTop: '1px solid var(--border)',
                 zIndex: 110,
                 display: 'flex',
                 gap: '12px'
               }}>
                  <button 
                    onClick={() => {
                      const phone = selectedCustomer.phone?.replace(/[^0-9+]/g, '');
                      if (phone) window.location.href = `tel:${phone}`;
                      else alert("No valid phone number assigned.");
                    }}
                    style={{ flex: 1, background: 'rgba(197,160,89,0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', borderRadius: '16px', fontWeight: 800, fontSize: '13px' }}
                  >
                    <Phone size={18} /> CALL
                  </button>
                  <button 
                    onClick={() => {
                       const form = document.getElementById('log-collection-form');
                       if (form) form.scrollIntoView({ behavior: 'smooth' });
                       else alert("Collection form is loading...");
                    }}
                    style={{ flex: 2, background: 'var(--primary)', color: '#000', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px', borderRadius: '16px', fontWeight: 900, fontSize: '14px', boxShadow: '0 8px 30px rgba(197,160,89,0.3)' }}
                  >
                    <Save size={18} /> LOG COLLECTION
                  </button>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
       {isAdmin && verifiedHistory.length > 0 && filter !== 'Verifications' && (
          <div style={{ marginTop: '32px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
               <ShieldCheck size={14} style={{ color: 'var(--success)' }} />
               <h3 style={{ fontSize: '11px', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Confirmed Ledger (Last 20)</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {verifiedHistory.map((col, i) => (
                <div key={i} style={{ padding: '14px', background: 'rgba(48, 209, 88, 0.03)', border: '1px solid rgba(48, 209, 88, 0.1)', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{col.customers?.name}</div>
                      <div style={{ fontSize: '9px', opacity: 0.6, marginTop: '2px' }}>{col.payment_mode} • Approved by {col.profiles?.username}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 900, color: 'var(--success)' }}>+₹{col.amount.toLocaleString('en-IN')}</div>
                      <div style={{ fontSize: '8px', opacity: 0.5 }}>{new Date(col.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                    </div>
                </div>
              ))}
            </div>
          </div>
       )}
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
