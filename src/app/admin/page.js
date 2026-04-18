"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function AdminPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfiles();
    
    // Subscribe to profile changes
    const channel = supabase
      .channel('admin-profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchProfiles();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) {
      setProfiles(data || []);
    }
    setLoading(false);
  };

  const toggleApproval = async (profileId, currentStatus) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: !currentStatus })
      .eq('id', profileId);
    
    if (error) alert(error.message);
  };

  return (
    <div className="container safe-bottom">
      <div style={{ marginBottom: '32px' }}>
        <Link href="/" style={{ color: 'var(--primary)', fontSize: '14px', display: 'block', marginBottom: '12px' }}>← Back to Dashboard</Link>
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Admin Controls</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Approve or de-authorize agents</p>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>Agent Directory</h3>
        
        {loading && <p style={{ color: 'var(--text-dim)' }}>Loading agents...</p>}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {profiles.map(profile => (
            <div key={profile.id} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--border)'
            }}>
              <div>
                <div style={{ fontWeight: 600 }}>{profile.username}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <span>Role: {profile.role}</span>
                  <span>•</span>
                  <span>Joined: {new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ 
                  fontSize: '11px', 
                  color: profile.is_approved ? 'var(--success)' : 'var(--warning)',
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}>
                  {profile.is_approved ? 'Approved' : 'Pending'}
                </span>
                
                {profile.role !== 'admin' && (
                  <button 
                    onClick={() => toggleApproval(profile.id, profile.is_approved)}
                    className={profile.is_approved ? 'btn-outline' : 'btn-primary'}
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    {profile.is_approved ? 'Revoke' : 'Approve'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '40px', padding: '20px', background: 'rgba(197, 160, 89, 0.05)', borderRadius: '16px', border: '1px solid rgba(197, 160, 89, 0.2)' }}>
        <h4 className="gold-text" style={{ marginBottom: '8px' }}>Admin Tip</h4>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.6' }}>
          By default, all new agents are "Pending." They can log in, but they will see an "Access Denied" message until you approve them here in real-time.
        </p>
      </div>
    </div>
  );
}
