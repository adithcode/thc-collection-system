"use client";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Home, ShieldCheck, User, Database } from "lucide-react";

export default function Navigation() {
  const pathname = usePathname();
  const [profile, setProfile] = useState(null);
  
  useEffect(() => {
    let isMounted = true;
    
    async function getProfile() {
      try {
        // Using getSession instead of getUser for internal profile checks 
        // to avoid the auth-token lock race condition in dev
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && isMounted) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (isMounted) setProfile(data);
        }
      } catch (err) {
        console.warn('Auth session check slowed down. Retrying...');
      }
    }

    getProfile();
    return () => { isMounted = false; };
  }, [pathname]);

  if (pathname === "/login") return null;

  const navItems = [
    { name: "Pool", path: "/", icon: Home },
    { name: "Bulk", path: "/import", icon: Database },
    ...(profile?.role === 'admin' ? [{ name: "Admin", path: "/admin", icon: ShieldCheck }] : []),
    { name: "Me", path: "/profile", icon: User },
  ];

  return (
    <>
      <nav className="glass" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        padding: `10px 16px calc(12px + env(safe-area-inset-bottom, 0px))`,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '40px',
        zIndex: 1000,
        borderTop: '1px solid var(--border)',
        borderRadius: '16px 16px 0 0'
      }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link key={item.path} href={item.path} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                color: isActive ? 'var(--primary)' : 'var(--text-dim)',
                transition: 'color 0.2s ease'
              }}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {item.name}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
