"use client";
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, FileSpreadsheet, Lock } from "lucide-react";

export default function ImportPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [preview, setPreview] = useState([]);
  const [step, setStep] = useState(1);
  const [isImporting, setIsImporting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    setIsCheckingAuth(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    const adminStatus = prof?.role === 'admin' || prof?.username === 'pranprakash' || prof?.username === 'adithprakash';
    
    setProfile(prof);
    setIsAdmin(adminStatus);
    setIsCheckingAuth(false);
    
    if (!adminStatus) {
      setTimeout(() => {
        alert("ACCESS DENIED: You must be an administrator to access the Executive Pool Importer.");
        router.push("/");
      }, 500);
    }
  };

  const FIELD_DEFINITIONS = [
    { key: "loan_no", label: "Loan No", required: true },
    { key: "name", label: "Customer Name", required: true },
    { key: "assigned_executive", label: "Executive (Agent)", required: true },
    { key: "phone", label: "Mobile Number", required: true },
    { key: "month_tbc", label: "Month TBC (EMI)", required: true },
    { key: "due_date", label: "Last Due Date", required: true },
    { key: "loan_amount", label: "Total Due", required: true },
    { key: "installment_day", label: "Install Day (Date)", required: false },
    { key: "current_status", label: "Status", required: false },
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      if (data.length > 0) {
        const rawHeaders = data[0].map(h => h?.toString().trim() || "");
        setHeaders(rawHeaders);
        setFile(data);
        
        const autoMap = {};
        FIELD_DEFINITIONS.forEach(f => {
          const match = rawHeaders.find(h => {
            const lowH = h.toLowerCase();
            const lowL = f.label.toLowerCase();
            return lowH === lowL || 
                   lowH === f.key.toLowerCase() ||
                   (f.key === 'loan_no' && lowH.includes('agreement')) ||
                   (f.key === 'month_tbc' && lowH === 'month') ||
                   (f.key === 'assigned_executive' && lowH.includes('executive')) ||
                   (f.key === 'phone' && (lowH.includes('phone') || lowH.includes('mobile') || lowH.includes('contact'))) ||
                   (f.key === 'installment_day' && lowH.includes('inst. date'));
          });
          if (match) autoMap[f.key] = match;
        });
        setMapping(autoMap);
        setStep(2);
      }
    };
    reader.readAsBinaryString(file);
  };

  const generatePreview = () => {
    const dataRows = file.slice(1).filter(row => row[headers.indexOf(mapping.name)]);
    const mappedData = dataRows.slice(0, 5).map(row => {
      const entry = {};
      FIELD_DEFINITIONS.forEach(f => {
        const headerIndex = headers.indexOf(mapping[f.key]);
        entry[f.key] = row[headerIndex] || "—";
      });
      return entry;
    });
    setPreview(mappedData);
    setStep(3);
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    try {
      const dataRows = file.slice(1);
      const finalData = [];

      for (const row of dataRows) {
        const entry = {};
        if (!row[headers.indexOf(mapping.name)]) continue;

        FIELD_DEFINITIONS.forEach(f => {
          const headerIndex = headers.indexOf(mapping[f.key]);
          let val = row[headerIndex];
          
          if (['loan_amount', 'month_tbc'].includes(f.key)) {
            if (typeof val === 'string') val = parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
            if (!val) val = 0;
          }
          
          if (f.key === 'due_date' || f.key === 'installment_day') {
            if (typeof val === 'number') {
                // Handle Excel Serial Dates
                const date = new Date((val - 25569) * 86400 * 1000);
                if (f.key === 'installment_day') {
                    val = date.getDate();
                } else {
                    val = date.toISOString().split('T')[0];
                }
            } else if (typeof val === 'string' && val.includes('-')) {
                // Handle string dates like DD-MM-YYYY
                const parts = val.split('-');
                if (parts.length === 3) {
                    const [d, m, y] = parts;
                    if (f.key === 'installment_day') {
                        val = parseInt(d);
                    } else {
                        // Reformat as YYYY-MM-DD
                        val = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                    }
                }
            }
          }

          entry[f.key] = val ?? null;
        });

        // Sanitize identifiers
        if (entry.loan_no) entry.loan_no = entry.loan_no.toString().trim();
        if (entry.name) entry.name = entry.name.trim();

        // Zero-Value Safety Gate: Skip ghost rows from Excel
        if (entry.month_tbc === 0 && entry.loan_amount === 0) continue;

        // Smart Day Calculation Logic (User Requirement)
        if (!entry.installment_day && entry.due_date) {
            entry.installment_day = new Date(entry.due_date).getDate();
        }

        finalData.push(entry);
      }

      const { error } = await supabase.from('customers').upsert(finalData, { onConflict: 'loan_no' });
      if (error) throw error;

      alert(`Successfully imported ${finalData.length} records! Initializing assignments.`);
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      alert(`Import Failed: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearPool = async () => {
    if (!isAdmin) {
      alert("Security Restriction: Only Admins can clear the master data pool.");
      return;
    }
    
    if (!confirm("WARNING: This will delete ALL customer records. This is a high-risk action. Proceed?")) return;
    
    setIsImporting(true);
    // Delete all where ID is not null (effective clear)
    const { error } = await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (error) {
      alert(`Pool Clear Failed: ${error.message}`);
    } else {
      alert("Executive Pool cleared successfully. You can now do a fresh import.");
      window.location.reload();
    }
    setIsImporting(false);
  };

  if (isCheckingAuth) return <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-dim)' }}>Verifying Security Clearance...</div>;
  if (!isAdmin) return (
    <div style={{ padding: '80px 20px', textAlign: 'center' }}>
      <Lock size={48} style={{ color: '#ef4444', marginBottom: '20px', margin: '0 auto' }} />
      <h2 style={{ color: '#ef4444' }}>Restricted Access</h2>
      <p style={{ marginTop: '12px', opacity: 0.6 }}>Only authorized administrators can access the importer.</p>
    </div>
  );

  return (
    <div className="container safe-bottom">
      <div style={{ padding: '32px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <div>
            <h1 style={{ fontSize: '28px' }}>Executive Pool Importer</h1>
            <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Mapping assignments and monthly targets.</p>
         </div>
         <button className="btn btn-outline" onClick={handleClearPool} style={{ color: '#ef4444', borderColor: '#ef4444' }}>
            Clear All Data
         </button>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <div className="card" style={{ padding: '60px 20px', textAlign: 'center', borderStyle: 'dashed' }}>
            <FileSpreadsheet size={48} style={{ color: 'var(--primary)', marginBottom: '20px' }} />
            <input type="file" accept=".xlsx" onChange={handleFileUpload} id="file-upload" style={{ display: 'none' }} />
            <label htmlFor="file-upload" className="btn btn-primary">Select 123.xlsx</label>
          </div>
        )}

        {step === 2 && (
          <div className="card">
            <h3 style={{ marginBottom: '20px' }}>Assignment Mapping</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {FIELD_DEFINITIONS.map(field => (
                <div key={field.key} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>{field.label}</label>
                  <select value={mapping[field.key] || ""} onChange={(e) => setMapping({...mapping, [field.key]: e.target.value})}>
                    <option value="">-- Match Column --</option>
                    {headers.filter(h => h).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '30px' }} onClick={generatePreview}>Verify Map</button>
          </div>
        )}

        {step === 3 && (
          <div className="card">
            <h3 style={{ marginBottom: '20px' }}>Previewing Assignments</h3>
            <div style={{ overflowX: 'auto', marginBottom: '30px' }}>
              <table style={{ width: '100%', fontSize: '11px' }}>
                <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>{FIELD_DEFINITIONS.map(f => <th key={f.key} style={{ padding: '10px' }}>{f.label}</th>)}</tr></thead>
                <tbody>{preview.map((row, i) => <tr key={i}>{FIELD_DEFINITIONS.map(f => <td key={f.key} style={{ padding: '10px' }}>{row[f.key]}</td>)}</tr>)}</tbody>
              </table>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={isImporting} onClick={handleConfirmImport}>Sync to Executive Portals</button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
