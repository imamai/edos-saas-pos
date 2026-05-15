"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2, User, Lock, Building, Tag } from "lucide-react";
import BusinessSettingsClient from "@/components/admin/business-settings-client";
import CategoryManager from "@/components/admin/category-manager";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [tab, setTab] = useState<"profile" | "security" | "business" | "categories">("profile");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({ full_name: "", phone: "" });
  const [passwords, setPasswords] = useState({ current: "", newPass: "", confirm: "" });

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").update({ ...profile }).eq("id", user!.id);
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Profile updated"); router.refresh(); }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) { toast.error("Passwords don't match"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: passwords.newPass });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Password changed"); setPasswords({ current: "", newPass: "", confirm: "" }); }
  }

  const ic = "w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="max-w-4xl space-y-5">
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Settings</h1>

      <div className="flex gap-1 bg-slate-100 dark:bg-slate-700/50 rounded-xl p-1 w-fit">
        {([
          { k: "profile", label: "Profile", icon: User },
          { k: "security", label: "Security", icon: Lock },
          { k: "business", label: "Business", icon: Building },
          { k: "categories", label: "Categories", icon: Tag },
        ] as const).map(({ k, label, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === k ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-5">Personal Information</h3>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Full Name</label>
              <input value={profile.full_name} onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))} className={ic} placeholder="Your full name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Phone</label>
              <input value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} className={ic} placeholder="+254..." />
            </div>
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </form>
        </div>
      )}

      {tab === "security" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-5">Change Password</h3>
          <form onSubmit={changePassword} className="space-y-4">
            {[
              { key: "newPass", label: "New Password" },
              { key: "confirm", label: "Confirm New Password" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
                <input
                  type="password"
                  minLength={8}
                  required
                  value={passwords[key as keyof typeof passwords]}
                  onChange={(e) => setPasswords((p) => ({ ...p, [key]: e.target.value }))}
                  className={ic}
                />
              </div>
            ))}
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Change Password
            </button>
          </form>
        </div>
      )}

      {tab === "business" && <BusinessSettingsClient />}

      {tab === "categories" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
          <CategoryManager />
        </div>
      )}
    </div>
  );
}
