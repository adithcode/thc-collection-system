"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ totalCalls: 0, totalPromised: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileAndStats();
  }, []);

  const fetchProfileAndStats = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(profileData);

      // Fetch Stats
      const { data: interactions } = await supabase
        .from('interactions')
        .select('*, customers(loan_amount)')
        .eq('agent_id', user.id);
      
      if (interactions) {
        const totalPromised = interactions.reduce((acc, current) => {
          return current.promised_date ? acc + (parseFloat(current.customers?.loan_amount) || 0) : acc;
        }, 0);
        
        setStats({
          totalCalls: interactions.length,
          totalPromised: totalPromised
        });
      }
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  if (loading) return <div className="container"><p style={{ textAlign: 'center', padding: '100px', color: 'var(--text-dim)' }}>Loading profile...</p></div>;

  return (
    <div className="container safe-bottom">
      <div style={{ marginBottom: '32px' }}>
        <Link href="/" style={{ color: 'var(--primary)', fontSize: '14px', display: 'block', marginBottom: '12px' }}>← Back to Dashboard</Link>
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>My Profile</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Personal performance & settings</p>
      </div>

      {/* Profile Header Card */}
      <div className="card" style={{ padding: '32px', textAlign: 'center', marginBottom: '24px', position: 'relative' }}>
        <div style={{ 
          width: '80px', 
          height: '80px', 
          borderRadius: '40px', 
          background: 'var(--primary)', 
          margin: '0 auto 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          fontWeight: 700,
          color: '#050A18'
        }}>
          {profile?.username?.charAt(0).toUpperCase()}
        </div>
        <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>{profile?.username}</h2>
        <div style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {profile?.role}
        </div>
        <div style={{ 
          marginTop: '12px', 
          fontSize: '12px', 
          color: profile?.is_approved ? 'var(--success)' : 'var(--warning)' 
        }}>
          ● {profile?.is_approved ? 'Account Verified' : 'Awaiting Approval'}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>Calls Logged</div>
          <div style={{ fontSize: '24px', fontWeight: 700 }}>{stats.totalCalls}</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>Promised Flow</div>
          <div className="gold-text" style={{ fontSize: '24px', fontWeight: 700 }}>
            ₹{stats.totalPromised.toLocaleString()}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {profile?.role === 'admin' && (
          <Link href="/admin" className="btn btn-outline" style={{ textAlign: 'center', width: '100%', textDecoration: 'none' }}>
            Admin Console
          </Link>
        )}
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => alert("Password reset link (fake) sent to your THC internal console.")}>
          Change Password
        </button>
        <button className="btn btn-outline" style={{ width: '100%', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={handleLogout}>
          Sign Out of Pool
        </button>
      </div>

      <p style={{ marginTop: '48px', textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.1)' }}>
        Member since {new Date(profile?.created_at).toLocaleDateString()}
      </p>
    </div>
  );
}
