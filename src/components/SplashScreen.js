"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function SplashScreen({ finishLoading }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const timeout = setTimeout(() => finishLoading(), 2500);
    return () => clearTimeout(timeout);
  }, [finishLoading]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#0A0A0B',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ textAlign: 'center' }}
        >
          <Image 
            src="/logo.png" 
            alt="THC Group" 
            width={220} 
            height={60} 
            style={{ objectFit: 'contain', marginBottom: '20px' }} 
            priority
          />
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: 120 }}
            transition={{ delay: 0.5, duration: 1.5, ease: "easeInOut" }}
            style={{ 
                height: '2px', 
                background: 'var(--primary)', 
                margin: '0 auto',
                borderRadius: '1px'
            }} 
          />
          <p style={{ 
            marginTop: '24px', 
            color: 'var(--text-dim)', 
            fontSize: '11px', 
            textTransform: 'uppercase', 
            letterSpacing: '0.2em' 
          }}>
            Secure Asset Retrieval
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
