/**
 * Determines if a notification concerns the currently logged-in user.
 * - Project Managers see all project-wide and staff notifications.
 * - Developers only see notifications that directly concern them (their assigned
 *   work orders, assigned issues, their own logged hours/actions, or direct mentions).
 *   Developers cannot see assignments or activities of other staff members.
 */
export function isNotificationForUser(n, currentUser, db = {}) {
  if (!currentUser) return true;
  if (currentUser.role === 'pm') return true;

  const myId = String(currentUser.id || '').toLowerCase();
  const myName = String(currentUser.name || '').toLowerCase();
  const myUser = String(currentUser.username || '').toLowerCase();

  // 1. Direct recipient check
  if (n.recipient) {
    const rec = String(n.recipient).toLowerCase();
    if (rec === myId || rec === myUser || rec === myName) return true;
    return false;
  }

  // 2. Work Order assignee check
  if (n.workOrderId) {
    const wo = (db.workOrders || []).find((w) => w.id === n.workOrderId);
    if (wo && wo.assignee) {
      const assignee = String(wo.assignee).toLowerCase();
      if (assignee === myId || assignee === myUser) return true;
      return false;
    }
  }

  // 3. Issue assignment check
  if (n.issueId) {
    const iss = (db.issues || []).find((i) => i.id === n.issueId);
    if (iss) {
      const assigned = String(iss.assignedTo || '').toLowerCase();
      const reported = String(iss.reportedById || '').toLowerCase();
      if (assigned === myId || assigned === myUser || reported === myId) return true;
      if (assigned && assigned !== myId && assigned !== myUser) return false;
    }
  }

  // 4. Actor check: actions initiated by the current developer
  if (n.actor) {
    const act = String(n.actor).toLowerCase();
    if (act === myName || act === myId || act === myUser) return true;
  }

  // 5. Title mentions check
  const title = String(n.title || '').toLowerCase();
  if (myName && title.includes(myName)) return true;

  // If title explicitly mentions another developer / staff name, exclude it
  const allStaff = [...(db.developers || []), ...(db.users || [])];
  for (const staff of allStaff) {
    const staffId = String(staff.id || '').toLowerCase();
    const staffName = String(staff.name || '').toLowerCase();
    if (staffId !== myId && staffName !== myName && staffName.length > 2) {
      if (title.includes(staffName)) {
        return false;
      }
    }
  }

  // 6. Generic or unlinked staff/assignment notifications do not concern this developer
  if (n.workOrderId || n.issueId) return false;
  if (['assignment', 'hours', 'review', 'changes', 'approval'].includes(n.type)) {
    return false;
  }

  return false;
}
