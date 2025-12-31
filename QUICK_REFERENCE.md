# Quick Reference: New Features

## Database Migration Required

Before using the new features, run the database migration:

```bash
# Option 1: Using psql
psql -d your_database -f backend/database/migration_extensions.sql

# Option 2: Copy and paste the SQL from migration_extensions.sql into your database console
```

## New Features Overview

### 1. Teacher Salary Enhancements

**Department Filtering:**
- Filter salary records by department: Quraan, Primary/Middle/Secondary, Shareeca
- Located on the Pay Teacher Salary page

**Advance Payment Tracking:**
- Salary records now show:
  - Original Salary
  - Advance Used (deducted amount)
  - Total Due (after advance deduction)
  - Paid Amount
  - Remaining Balance
  - Status (including new "Advance Applied" status)

### 2. Collect Fee Page Enhancements

**Status Filters:**
- Added "Outstanding" filter option
- Filters: All, Paid, Unpaid, Partial, Outstanding, Advanced

**Live Totals:**
- Dynamic summary cards appear when a status filter is selected
- Shows totals for:
  - Paid: Total amount and count
  - Unpaid: Total outstanding and count
  - Partial: Paid amount, remaining balance, and count
  - Outstanding: Total outstanding and count
  - Advanced: Total advance amount and count

### 3. Student Status Management

**Suspend Students:**
1. Go to Parents page
2. Click Edit on any parent
3. Change "Student Status" to "Suspended"
4. Save

**Effects of Suspension:**
- ❌ Excluded from new month billing
- ❌ Cannot collect payments (system blocks it)
- ✅ Existing outstanding balances remain unchanged
- ✅ Historical data remains visible

**Reactivate Students:**
1. Go to Parents page
2. Click Edit on the suspended parent
3. Change "Student Status" back to "Active"
4. Save
5. Student will be included in next month setup

## Key Points

- **No data loss**: All existing data remains intact
- **Backward compatible**: Existing functionality continues to work
- **Validation**: Backend validates all operations to prevent errors
- **Real-time**: Totals update instantly based on filters

## Status Values Reference

### Student Status
- `active`: Student is active, included in billing
- `suspended`: Student is suspended, excluded from billing

### Teacher Salary Status
- `paid`: Fully paid
- `unpaid`: Not paid
- `partial`: Partially paid
- `advance_applied`: Advance payment applied, remaining balance due
- `advance_covered`: Fully covered by advance
- `outstanding`: Has outstanding balance from previous months

### Student Fee Status
- `paid`: Fully paid
- `unpaid`: Not paid
- `partial`: Partially paid
- `advanced`: Paid in advance
- `outstanding`: Has outstanding balance (filter option)



