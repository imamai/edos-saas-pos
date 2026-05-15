import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    // Verify caller is an admin
    const userClient = await createServerClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).single();
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { email, password, full_name, role, branch_id } = await req.json();

    if (!email || !password || !full_name || !role) {
      return NextResponse.json({ error: "email, password, full_name and role are required" }, { status: 400 });
    }

    const supabase = serviceClient();

    // Create auth user — email auto-confirmed, no verification email needed
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Update profile row (trigger creates it; we ensure role + branch are correct)
    await supabase
      .from("profiles")
      .update({ role, full_name, branch_id: branch_id || null })
      .eq("id", data.user.id);

    return NextResponse.json({ user: data.user });
  } catch (err) {
    console.error("Create user error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
