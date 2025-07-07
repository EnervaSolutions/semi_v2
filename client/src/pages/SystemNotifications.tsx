import SystemStatusManager from "@/components/SystemStatusManager";

export default function SystemNotifications() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Notifications</h1>
        <p className="text-gray-600">Manage platform-wide announcements and notifications</p>
      </div>
      
      <SystemStatusManager />
    </div>
  );
}