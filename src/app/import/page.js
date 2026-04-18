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
  const [progress, setProgress] = useState(0);
  const [dbCount, setDbCount] = useState(null);
  const [preview, setPreview] = useState([]);
  const [step, setStep] = useState(1);
  const [isImporting, setIsImporting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    checkAdmin();
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    const { count } = await supabase.from('customers').select('*', { count: 'exact', head: true });
    setDbCount(count || 0);
  };

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

  const processRow = (row) => {
    const entry = {};
    if (!row[headers.indexOf(mapping.name)]) return null;

    FIELD_DEFINITIONS.forEach(f => {
      const headerIndex = headers.indexOf(mapping[f.key]);
      let val = row[headerIndex];
      
      if (['loan_amount', 'month_tbc'].includes(f.key)) {
        if (val !== null && val !== undefined) {
          const strVal = val.toString().replace(/[^0-9.]/g, '');
          val = strVal ? Number(strVal) : 0;
        } else {
          val = 0;
        }
        if (isNaN(val)) val = 0;
      }
      
      if (f.key === 'due_date' || f.key === 'installment_day') {
        if (typeof val === 'number') {
            const date = new Date((val - 25569) * 86400 * 1000);
            if (f.key === 'installment_day') val = date.getDate();
            else val = date.toISOString().split('T')[0];
        } else if (typeof val === 'string' && val.includes('-')) {
            const parts = val.split('-');
            if (parts.length === 3) {
                const [d, m, y] = parts;
                if (f.key === 'installment_day') val = parseInt(d);
                else val = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
        }
      }
      entry[f.key] = val ?? null;
    });

    if (entry.loan_no) entry.loan_no = entry.loan_no.toString().trim();
    if (entry.name) entry.name = entry.name.trim();

    if (entry.name && (entry.name.toLowerCase().includes('customer name') || entry.name.toLowerCase() === 'customer')) return null;
    if (entry.loan_no && entry.loan_no.toLowerCase().includes('loan no')) return null;

    if (!entry.month_tbc || entry.month_tbc === 0) {
        entry.month_tbc = entry.loan_amount || 0;
    }

    if (entry.month_tbc === 0 && entry.loan_amount === 0) return null;

    if (!entry.installment_day && entry.due_date) {
        entry.installment_day = new Date(entry.due_date).getDate();
    }

    entry.phone = entry.phone || 'NA';
    return entry;
  };

  const generatePreview = () => {
    const rawRows = file.slice(1);
    const validMapped = [];
    const loanNoCounts = {};
    const duplicates = [];

    rawRows.forEach(row => {
        const processed = processRow(row);
        if (processed && processed.loan_no) {
            loanNoCounts[processed.loan_no] = (loanNoCounts[processed.loan_no] || 0) + 1;
        }
    });

    Object.keys(loanNoCounts).forEach(id => {
        if (loanNoCounts[id] > 1) duplicates.push(id);
    });
    
    for (const row of rawRows) {
        const processed = processRow(row);
        if (processed) validMapped.push(processed);
        if (validMapped.length >= 5) break;
    }
    
    setPreview({
        rows: validMapped,
        total: rawRows.length,
        uniqueCount: Object.keys(loanNoCounts).length,
        duplicates: duplicates
    });
    setStep(3);
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    try {
      const dataRows = file.slice(1);
      const finalData = [];

      for (const row of dataRows) {
        const processed = processRow(row);
        if (processed) finalData.push(processed);
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
        alert("Security Violation: Only Administrators can clear the pool.");
        return;
    }
    if (!confirm("⚠️ EXTREME ACTION: This will delete ALL customers and interaction history. Are you sure?")) return;
    
    setIsImporting(true);
    try {
      const { error: err1 } = await supabase.from('interactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (err1) throw err1;

      const { count, error: err2 } = await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (err2) throw err2;

      alert(`Database Purity Restored. Executive Pool is now empty.`);
      fetchStatus();
    } catch (error) {
      alert("Purge Failed: " + error.message);
    } finally {
      setIsImporting(false);
    }
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
    <div className=\"container safe-bottom\">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.5px' }}>Executive Pool Importer</h1>
          <p style={{ opacity: 0.6 }}>Mapping assignments and monthly targets.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
           <div style={{ fontSize: '10px', fontWeight: 800, opacity: 0.5, textTransform: 'uppercase', marginBottom: '4px' }}>Executive Pool Status</div>
           <div style={{ fontSize: '14px', fontWeight: 900, color: dbCount === 0 ? 'var(--success)' : 'var(--primary)' }}>
             {dbCount === null ? 'SYNCING...' : `${dbCount} RECORDS`}
           </div>
           <button 
             className=\"btn\" 
             style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '10px', padding: '6px 12px', border: '1px solid rgba(239,68,68,0.2)', marginTop: '8px' }} 
             onClick={handleClearPool}
           >
             Clear All Data
           </button>
        </div>
      </div>

      <AnimatePresence mode=\"wait\">
        {step === 1 && (
          <div className=\"card\" style={{ padding: '60px 20px', textAlign: 'center', borderStyle: 'dashed' }}>
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
            <h3 style={{ marginBottom: '8px' }}>Previewing Assignments</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '20px' }}>
               Verify if the columns matched correctly.
            </p>

            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--border)' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                  <div>
                     <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Rows in File</div>
                     <div style={{ fontSize: '18px', fontWeight: 900, marginTop: '4px' }}>{preview.total}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                     <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Accounts</div>
                     <div style={{ fontSize: '18px', fontWeight: 900, marginTop: '4px', color: 'var(--primary)' }}>{preview.uniqueCount}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                     <div style={{ fontSize: '10px', fontWeight: 800, color: preview.total !== preview.uniqueCount ? 'var(--warning)' : 'var(--success)', textTransform: 'uppercase' }}>Integrity</div>
                     <div style={{ fontSize: '18px', fontWeight: 900, marginTop: '4px', color: preview.total !== preview.uniqueCount ? 'var(--warning)' : 'var(--success)' }}>
                        {preview.total === preview.uniqueCount ? 'PERFECT' : `${preview.total - preview.uniqueCount} MERGED`}
                     </div>
                  </div>
               </div>
               {preview.duplicates.length > 0 && (
                  <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(255,159,10,0.1)', borderRadius: '8px', color: 'var(--warning)', fontSize: '10px', fontWeight: 600 }}>
                    ⚠️ WARNING: {preview.duplicates.length} Duplicate **Loan Numbers** found. (Names can be the same, but each Loan Number must be unique). Merged rows will show the latest data.
                  </div>
               )}
            </div>

            <div style={{ overflowX: 'auto', marginBottom: '30px' }}>
              <table style={{ width: '100%', fontSize: '11px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Customer<br/><span style={{ fontSize: '8px', opacity: 0.5 }}>from {mapping.name}</span></th>
                    <th style={{ padding: '10px', textAlign: 'left' }}>Mobile<br/><span style={{ fontSize: '8px', opacity: 0.5 }}>from {mapping.phone}</span></th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Month TBC<br/><span style={{ fontSize: '8px', opacity: 0.5 }}>from {mapping.month_tbc}</span></th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Total Due<br/><span style={{ fontSize: '8px', opacity: 0.5 }}>from {mapping.loan_amount}</span></th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '10px' }}>{row.name}</td>
                      <td style={{ padding: '10px' }}>{row.phone}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: 'var(--primary)', fontWeight: 800 }}>₹{row.month_tbc}</td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>₹{row.loan_amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '20px', textAlign: 'center' }}>
               Double check the targets above. If you see ₹0, go back and re-map the columns.
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={isImporting} onClick={handleConfirmImport}>Sync to Executive Portals</button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
