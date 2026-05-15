"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth";
import { useBusinessSettings, useUpdateBusinessSettings } from "@/hooks/useBusinessSettings";
import { toast } from "sonner";
import { Save, Loader2, Upload, FileIcon } from "lucide-react";
import type { BusinessSettings } from "@/types";

export default function BusinessSettingsClient() {
  const supabase = createClient();
  const profile = useAuthStore((s) => s.profile);
  const { settings, branch, loading: settingsLoading } = useBusinessSettings(profile?.branch_id);
  const { updateSettings, loading: updateLoading } = useUpdateBusinessSettings();

  const [formData, setFormData] = useState<Partial<BusinessSettings>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.[0] || !profile?.branch_id) return;

    try {
      setUploadingLogo(true);
      const file = e.target.files[0];
      const fileName = `logo-${profile.branch_id}-${Date.now()}`;
      const filePath = `business-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("business-assets")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("business-assets")
        .getPublicUrl(filePath);

      setFormData((prev) => ({ ...prev, company_logo_url: data.publicUrl }));
      toast.success("Logo uploaded successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.branch_id) return;

    try {
      setIsSaving(true);
      const success = await updateSettings(profile.branch_id, formData);
      if (success) {
        toast.success("Business settings updated successfully");
      } else {
        toast.error("Failed to save settings");
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  const inputClass =
    "w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Business Settings</h2>
        <p className="text-sm text-slate-500">
          Configure your store/business branding and details used on receipts, invoices, and quotations
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Logo Section */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Company Logo</h3>
          <div className="flex items-center gap-6">
            {formData.company_logo_url && (
              <img
                src={formData.company_logo_url}
                alt="Logo"
                className="w-24 h-24 rounded-xl object-contain border border-slate-200 dark:border-slate-700"
              />
            )}
            <div className="flex-1">
              <label className="flex items-center justify-center px-6 py-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700/50 transition">
                <div className="text-center">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {uploadingLogo ? "Uploading..." : "Upload Logo (PNG, JPG)"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Max 5MB</p>
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Business Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                Company/Store Name *
              </label>
              <input
                type="text"
                required
                value={formData.company_name || ""}
                onChange={(e) => setFormData((p) => ({ ...p, company_name: e.target.value }))}
                placeholder="e.g., ABC Supermarket, XYZ Electronics"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                Website
              </label>
              <input
                type="url"
                value={formData.website || ""}
                onChange={(e) => setFormData((p) => ({ ...p, website: e.target.value }))}
                placeholder="https://example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                Address
              </label>
              <input
                type="text"
                value={formData.address || ""}
                onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                placeholder="123 Main Street, City"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone || ""}
                onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+254 712 000 000"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                placeholder="info@example.com"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                Tax PIN
              </label>
              <input
                type="text"
                value={formData.tax_pin || ""}
                onChange={(e) => setFormData((p) => ({ ...p, tax_pin: e.target.value }))}
                placeholder="P051234567X"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Tax & Currency */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Tax & Currency</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                VAT Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.vat_rate || 16}
                onChange={(e) => setFormData((p) => ({ ...p, vat_rate: parseFloat(e.target.value) }))}
                className={inputClass}
              />
              <p className="text-xs text-slate-500 mt-1">Applied to all sales by default</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                Currency Code
              </label>
              <select
                value={formData.currency_code || "KES"}
                onChange={(e) => setFormData((p) => ({ ...p, currency_code: e.target.value }))}
                className={inputClass}
              >
                <option value="KES">KES (Kenyan Shilling)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="GBP">GBP (British Pound)</option>
                <option value="UGX">UGX (Ugandan Shilling)</option>
                <option value="TZS">TZS (Tanzanian Shilling)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Custom Text */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Custom Text (Optional)</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                Receipt Header Text
              </label>
              <textarea
                value={formData.receipt_header_text || ""}
                onChange={(e) => setFormData((p) => ({ ...p, receipt_header_text: e.target.value }))}
                placeholder="e.g., Thank you for your business!"
                rows={2}
                className={`${inputClass} resize-none`}
              />
              <p className="text-xs text-slate-500 mt-1">Displayed at top of receipts</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                Receipt Footer Text
              </label>
              <textarea
                value={formData.receipt_footer_text || ""}
                onChange={(e) => setFormData((p) => ({ ...p, receipt_footer_text: e.target.value }))}
                placeholder="e.g., Goods once sold cannot be returned"
                rows={2}
                className={`${inputClass} resize-none`}
              />
              <p className="text-xs text-slate-500 mt-1">Displayed at bottom of receipts</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSaving || updateLoading}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving || updateLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving || updateLoading ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
