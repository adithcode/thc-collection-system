"use client";
import { useState, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { motion } from "framer-motion";
import { User, Lock, AlertCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";

function LoginContent() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  
  const [formData, setFormData] = useState({
    name: "",
    password: "",
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const email = `${formData.name.toLowerCase().replace(/\s/g, '')}@thc.com`;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: formData.password,
    });
    
    if (error) {
      alert("Access Denied. Check your name and password.");
    } else {
      window.location.href = "/";
    }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card" style={{ maxWidth: '400px', width: '100%', padding: '40px 24px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <Image src="/logo.png" alt="THC Group" width={200} height={60} style={{ objectFit: 'contain' }} priority />
        <h2 style={{ fontSize: '14px', color: 'var(--text-dim)', marginTop: '12px', letterSpacing: '0.1em', fontWeight: 800 }}>COLLECTION PORTAL</h2>
      </div>

      {status === 'pending' && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'rgba(255,159,10,0.1)', color: 'var(--warning)', padding: '12px', borderRadius: '12px', marginBottom: '24px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid rgba(255,159,10,0.2)' }}>
          <AlertCircle size={16} />
          <div>
            <div style={{ fontWeight: 800 }}>PENDING APPROVAL</div>
            <div style={{ opacity: 0.8 }}>Contact Admin to activate your workplace.</div>
          </div>
        </motion.div>
      )}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Officer Name
              </label>
              <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input 
                      required 
                      placeholder="e.g. babutoday" 
                      style={{ paddingLeft: '40px' }} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                  />
              </div>
          </div>

          <div>
              <label style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>Password</label>
              <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                  <input 
                      type="password" 
                      required 
                      placeholder="••••••••" 
                      style={{ paddingLeft: '40px' }} 
                      onChange={e => setFormData({...formData, password: e.target.value})} 
                  />
              </div>
          </div>

          <button disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '16px', marginTop: '12px' }}>
              {loading ? "Authenticating..." : "SECURE LOGIN"}
          </button>
      </form>

      <p style={{ marginTop: '32px', fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center', opacity: 0.6 }}>
          Authorized Staff Only. <br/>Unauthorized access attempts are monitored and reported.
      </p>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Suspense fallback={<div style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Securing Portal...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}
