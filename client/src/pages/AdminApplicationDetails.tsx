// SYSTEM ADMIN APPLICATION DETAILS - USES SAME INTERFACE AS USERS
// ==============================================================
// System admin should see exactly the same interface as users when viewing applications
// This provides complete visibility into user experience with all template data and responses

import ApplicationDetails from "./application-details";

export default function AdminApplicationDetails() {
  // System admin uses the exact same ApplicationDetails component as users
  // This ensures complete visibility into template responses and user experience
  return <ApplicationDetails />;
}