import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BusinessSettings, Branch } from "@/types";

export function useBusinessSettings(branchId?: string) {
  const supabase = createClient();
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true);
        setError(null);

        // Get user's branch if not provided
        let targetBranchId = branchId;
        if (!targetBranchId) {
          const { data: { user } } = await supabase.auth.getUser();
          const { data: profile } = await supabase
            .from("profiles")
            .select("branch_id")
            .eq("id", user!.id)
            .single();
          targetBranchId = profile?.branch_id;
        }

        if (!targetBranchId) {
          const { data: mainBranch } = await supabase
            .from("branches")
            .select("*")
            .eq("is_main", true)
            .single();
          targetBranchId = mainBranch?.id;
        }

        // Fetch settings
        const { data: settingsData, error: settingsError } = await supabase
          .from("business_settings")
          .select("*")
          .eq("branch_id", targetBranchId)
          .single();

        if (settingsError) {
          console.warn("Business settings not found, using defaults");
          setSettings(null);
        } else {
          setSettings(settingsData as BusinessSettings);
        }

        // Fetch branch info
        const { data: branchData } = await supabase
          .from("branches")
          .select("*")
          .eq("id", targetBranchId)
          .single();

        setBranch(branchData as Branch || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [branchId, supabase]);

  return { settings, branch, loading, error };
}

export function useUpdateBusinessSettings() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSettings = async (branchId: string, updates: Partial<BusinessSettings>) => {
    try {
      setLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from("business_settings")
        .update(updates)
        .eq("branch_id", branchId);

      if (updateError) throw updateError;
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update settings";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { updateSettings, loading, error };
}
