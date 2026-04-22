"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { usePathname, useRouter } from "next/navigation";

export default function AuthShield({ children }) {
  const [authorized, setAuthorized] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const checkInProgress = useRef(false);

  useEffect(() => {
    if (checkInProgress.current) return;
    checkUser();

    // Safety timeout for APKs/slow networks
    const timer = setTimeout(() => {
      if (!authorized) setShowRetry(true);
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push("/login");
        setAuthorized(false);
      } else if (event === 'SIGNED_IN') {
        checkUser();
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [pathname, authorized]);

  async function checkUser() {
    try {
      checkInProgress.current = true;
      const { data: { user } } = await supabase.auth.getUser();
      
      // Flexible path matching for Capacitor/Static builds
      const cleanPath = pathname.replace(/\/$/, ""); 
      const isLoginPage = cleanPath === "/login" || cleanPath === ""; 
      const isAdminPage = cleanPath.startsWith("/admin");
      const isPublicPath = cleanPath.includes(".") || cleanPath.startsWith("/_next");

      if (isPublicPath) {
        setAuthorized(true);
        return;
      }

      if (!user) {
        if (cleanPath !== "/login") {
          router.push("/login");
        } else {
          setAuthorized(true);
        }
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_approved, role')
        .eq('id', user.id)
        .single();

      if (!profile) {
        setAuthorized(true);
        return;
      }

      if (profile.role !== 'admin' && !profile.is_approved) {
        if (cleanPath !== "/login") {
          router.push("/login?status=pending");
        } else {
          setAuthorized(true);
        }
        return;
      }

      if (isAdminPage && profile.role !== 'admin') {
        router.push("/");
        return;
      }

      if (cleanPath === "/login") {
        router.push("/");
        return;
      }

      setAuthorized(true);
    } catch (err) {
      console.error("Auth check failed:", err);
      // On error, default to login page rather than hanging
      if (pathname !== "/login") router.push("/login");
      else setAuthorized(true);
    } finally {
      checkInProgress.current = false;
    }
  }

  const isLoginPageCurrent = pathname.includes("/login");

  if (!authorized && !isLoginPageCurrent) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#0A0A0B', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#FFF',
        padding: '24px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '14px', fontWeight: 800, marginBottom: '8px', letterSpacing: '0.1em' }}>THC GROUP</div>
        <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '32px' }}>VERIFYING PORTAL ACCESS...</div>
        
        {showRetry && (
          <button 
            onClick={() => router.push("/login")}
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: '1px solid var(--border)', 
              color: 'var(--primary)',
              padding: '12px 24px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 800
            }}
          >
            GO TO LOGIN MANUALLY
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
