-- THC Group Finance Loan Collection Schema
-- Run this in your Supabase SQL Editor

-- 1. Customers Table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_no TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  assigned_executive TEXT,
  loan_amount DECIMAL(12, 2) NOT NULL,
  month_tbc DECIMAL(12, 2) DEFAULT 0,
  due_date DATE NOT NULL,
  installment_day INTEGER,
  status TEXT DEFAULT 'Due',
  is_paid BOOLEAN DEFAULT false,
  total_paid DECIMAL(12, 2) DEFAULT 0,
  paid_percentage DECIMAL(5, 2) DEFAULT 0,
  points DECIMAL(10, 2) DEFAULT 0,
  guarantor TEXT,
  guarantor_phone TEXT,
  area TEXT,
  principal DECIMAL(12, 2) DEFAULT 0,
  emi_due_count DECIMAL(10, 2) DEFAULT 0,
  last_received TEXT,
  month_collected DECIMAL(12, 2) DEFAULT 0,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Repayment Promises / Call Log
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  agent_id UUID, -- For tracking which agent made the call
  promised_date DATE,
  remark TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Real-time
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE interactions;

-- 4. Profiles Table (For Approval and Roles)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  role TEXT DEFAULT 'agent', -- 'admin' or 'agent'
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- 5. Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role, is_approved)
  VALUES (
    new.id, 
    split_part(new.email, '@', 1),
    CASE WHEN new.email = 'admin@thc.com' THEN 'admin' ELSE 'agent' END,
    CASE WHEN new.email = 'admin@thc.com' THEN true ELSE false END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Sample Index for searching
CREATE INDEX idx_customers_phone ON customers(phone);


-- THC Group Finance Loan Collection Schema
