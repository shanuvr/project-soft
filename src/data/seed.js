function isoDaysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function createSeed() {
  return {
    _seedVersion: 32,

    users: [
      { id: 'u1', username: 'admin', password: 'admin', name: 'Admin', role: 'pm', title: 'Project Manager' },
    ],

    projects: [],

    orders: [],

    ptds: [],

    workOrders: [],

    blockers: [],

    issues: [],

    files: [
      // ---------- Client reference documents captured during lead / order-taking ----------
      { id: 'f1', name: 'Nova Finance — Logo.png', type: 'Logo', size: '120 KB', client: 'Nova Finance', projectId: 'p1', ptdId: null, workOrderId: null, uploadedBy: 'Leads Desk', date: isoDaysFromNow(-52), source: 'leads', orderId: 'ord-nf' },
      { id: 'f2', name: 'Business Card — Nova Finance.pdf', type: 'Business Card', size: '84 KB', client: 'Nova Finance', projectId: 'p1', ptdId: null, workOrderId: null, uploadedBy: 'Leads Desk', date: isoDaysFromNow(-52), source: 'leads', orderId: 'ord-nf' },
      { id: 'f3', name: 'Order Confirmation — NF-2211.pdf', type: 'Order Document', size: '210 KB', client: 'Nova Finance', projectId: 'p1', ptdId: null, workOrderId: null, uploadedBy: 'Leads Desk', date: isoDaysFromNow(-50), source: 'leads', orderId: 'ord-nf' },
      { id: 'f12', name: 'Nova Finance — Sales Deck Photos.zip', type: 'Photo', size: '4.6 MB', client: 'Nova Finance', projectId: 'p1', ptdId: null, workOrderId: null, uploadedBy: 'Leads Desk', date: isoDaysFromNow(-51), source: 'leads', orderId: 'ord-nf' },
      { id: 'f4', name: 'Zenith Bank — Logo.svg', type: 'Logo', size: '45 KB', client: 'Zenith Bank', projectId: 'p2', ptdId: null, workOrderId: null, uploadedBy: 'Leads Desk', date: isoDaysFromNow(-72), source: 'leads', orderId: 'ord-zb' },
      { id: 'f5', name: 'Business Card — Zenith Bank.pdf', type: 'Business Card', size: '96 KB', client: 'Zenith Bank', projectId: 'p2', ptdId: null, workOrderId: null, uploadedBy: 'Leads Desk', date: isoDaysFromNow(-72), source: 'leads', orderId: 'ord-zb' },
      { id: 'f6', name: 'KYC Verification — Zenith.pdf', type: 'Verification', size: '540 KB', client: 'Zenith Bank', projectId: 'p2', ptdId: null, workOrderId: null, uploadedBy: 'Leads Desk', date: isoDaysFromNow(-70), source: 'leads', orderId: 'ord-zb' },
      { id: 'f13', name: 'Zenith Bank — Mobile App Walkthrough.mp4', type: 'Video', size: '18 MB', client: 'Zenith Bank', projectId: 'p2', ptdId: null, workOrderId: null, uploadedBy: 'Leads Desk', date: isoDaysFromNow(-68), source: 'leads', orderId: 'ord-zb' },
      { id: 'f7', name: 'MediCare Group — Logo.png', type: 'Logo', size: '110 KB', client: 'MediCare Group', projectId: 'p3', ptdId: null, workOrderId: null, uploadedBy: 'Leads Desk', date: isoDaysFromNow(-22), source: 'leads', orderId: 'ord-mx' },
      { id: 'f8', name: 'Order Reference — MX-2207.pdf', type: 'Order Document', size: '180 KB', client: 'MediCare Group', projectId: 'p3', ptdId: null, workOrderId: null, uploadedBy: 'Leads Desk', date: isoDaysFromNow(-20), source: 'leads', orderId: 'ord-mx' },
      { id: 'f14', name: 'RetailPlus — Warehouse Photos.zip', type: 'Photo', size: '5.1 MB', client: 'RetailPlus', projectId: 'p4', ptdId: null, workOrderId: null, uploadedBy: 'Leads Desk', date: isoDaysFromNow(-183), source: 'leads', orderId: 'ord-rp' },
      { id: 'f15', name: 'Order Confirmation — RP-3341.pdf', type: 'Order Document', size: '190 KB', client: 'RetailPlus', projectId: 'p4', ptdId: null, workOrderId: null, uploadedBy: 'Leads Desk', date: isoDaysFromNow(-185), source: 'leads', orderId: 'ord-rp' },
      { id: 'f16', name: 'Nova Finance — Payroll Ledger Sample.pdf', type: 'Documentation', size: '460 KB', client: 'Nova Finance', projectId: 'p5', ptdId: null, workOrderId: null, uploadedBy: 'Leads Desk', date: isoDaysFromNow(-4), source: 'leads', orderId: 'ord-nf2' },

      // ---------- Project / work order files (manual) ----------
      { id: 'f9', name: 'OAuth2 API Documentation.pdf', type: 'Documentation', size: '640 KB', client: 'Nova Finance', projectId: 'p1', ptdId: 'p1t1', workOrderId: 'WORK-1007', uploadedBy: 'Ajoy Kumar', date: isoDaysFromNow(-9), source: 'manual' },
      { id: 'f10', name: 'Core Banking API Spec.docx', type: 'Documentation', size: '1.2 MB', client: 'Zenith Bank', projectId: 'p2', ptdId: 'p2t1', workOrderId: null, uploadedBy: 'Ajoy Kumar', date: isoDaysFromNow(-15), source: 'manual' },
      { id: 'f11', name: 'Portal UX Wireframes.fig', type: 'Design', size: '4.8 MB', client: 'Nova Finance', projectId: 'p1', ptdId: 'p1t2', workOrderId: null, uploadedBy: 'Arun Dev', date: isoDaysFromNow(-4), source: 'manual' },
    ],

    milestones: [
      { id: 'm1', projectId: 'p1', name: 'Requirement', status: 'done' },
      { id: 'm2', projectId: 'p1', name: 'UI Design', status: 'done' },
      { id: 'm3', projectId: 'p1', name: 'Development', status: 'in-progress' },
      { id: 'm4', projectId: 'p1', name: 'Testing', status: 'pending' },
      { id: 'm5', projectId: 'p1', name: 'Deployment', status: 'pending' },
    ],

    activity: [
      { id: 'a1', date: isoDaysFromNow(0), time: '09:15', actor: 'Rahul Sharma', projectId: 'p1', text: 'logged 4h on "Revenue Trends Chart Component"' },
      { id: 'a2', date: isoDaysFromNow(0), time: '10:30', actor: 'Arun Dev', projectId: 'p2', text: 'logged 3h on "Transaction Reconciliation Engine"' },
      { id: 'a3', date: isoDaysFromNow(-1), time: '14:00', actor: 'Rohan Mehta', projectId: 'p1', text: 'logged 2h on "Password Reset Flow"' },
      { id: 'a4', date: isoDaysFromNow(-1), time: '16:45', actor: 'Rahul Sharma', projectId: 'p2', text: 'logged 6h on "Message Queue Ingestion Service"' },
      { id: 'a5', date: isoDaysFromNow(-2), time: '11:00', actor: 'Arun Dev', projectId: 'p1', text: 'completed checklist item on "Session & Token Management"' },
    ],

    notifications: [
      { id: 'n1', type: 'issue', title: 'New issue "Rate limiter blocks legitimate API calls" assigned to Rahul Sharma in Mobile Banking App', actor: 'Ajoy Kumar', date: isoDaysFromNow(0), time: '08:31', projectId: 'p2', workOrderId: null, issueId: 'iss4', read: false },
      { id: 'n2', type: 'hours', title: 'Rahul Sharma logged 6h on "Message Queue Ingestion Service"', actor: 'Rahul Sharma', date: isoDaysFromNow(-1), time: '16:45', projectId: 'p2', workOrderId: 'WORK-1004', issueId: null, read: false },
      { id: 'n3', type: 'issue', title: 'Issue "Password reset email lands in spam" marked as resolved by Rohan Mehta', actor: 'Rohan Mehta', date: isoDaysFromNow(-1), time: '10:05', projectId: 'p1', workOrderId: null, issueId: 'iss3', read: true },
      { id: 'n4', type: 'approval', title: 'Work order "OAuth2 Login Flow" was approved by PM!', actor: 'Ajoy Kumar', date: isoDaysFromNow(-3), time: '14:20', projectId: 'p1', workOrderId: 'WORK-1007', issueId: null, read: true },
      { id: 'n5', type: 'hours', title: 'Arun Dev logged 3h on "Transaction Reconciliation Engine"', actor: 'Arun Dev', date: isoDaysFromNow(-1), time: '10:30', projectId: 'p2', workOrderId: 'WORK-1005', issueId: null, read: true },
      { id: 'n6', type: 'assignment', title: 'New work order "Public API Rate Limiter" assigned to Rahul Sharma in Mobile Banking App', actor: 'Ajoy Kumar', date: isoDaysFromNow(-2), time: '12:10', projectId: 'p2', workOrderId: 'WORK-1006', issueId: null, read: false },
      { id: 'n7', type: 'review', title: 'Work order "Session & Token Management" submitted for review by Arun Dev', actor: 'Arun Dev', date: isoDaysFromNow(-2), time: '17:35', projectId: 'p1', workOrderId: 'WORK-1008', issueId: null, read: true },
      { id: 'n8', type: 'changes', title: 'Changes requested on "Message Queue Ingestion Service": add retry backoff handling', actor: 'Ajoy Kumar', date: isoDaysFromNow(-3), time: '11:05', projectId: 'p2', workOrderId: 'WORK-1004', issueId: null, read: false },
    ],

    messages: [],

    reportEntries: [],
    calendarEvents: [],
  };
}