import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  supervisor_id: string | null;
  account_manager_id: string | null;
  internship_type: string | null;
  department: string | null;
  phone: string | null;
  status: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Authenticate the caller via their JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // Verify caller is an admin
    const { data: callerProfile, error: profileErr } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileErr || !callerProfile || callerProfile.role !== "admin" || callerProfile.status !== "active") {
      return jsonResponse({ error: "Forbidden: admin access required" }, 403);
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (req.method === "POST" && action === "create") {
      return await createAccount(req, supabase);
    }

    if (req.method === "DELETE") {
      return await deleteAccount(req, supabase);
    }

    if (req.method === "PUT") {
      return await updateProfile(req, supabase);
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
});

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function createAccount(req: Request, supabase: ReturnType<typeof createClient>): Promise<Response> {
  const body = await req.json();
  const { email, password, full_name, role, supervisor_id, account_manager_id, internship_type, department, phone } = body;

  if (!email || !password || !full_name || !role) {
    return jsonResponse({ error: "Missing required fields: email, password, full_name, role" }, 400);
  }

  if (!["admin", "employee", "intern", "client"].includes(role)) {
    return jsonResponse({ error: "Invalid role" }, 400);
  }

  // Create the auth user with app_metadata containing the role + assignment info
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
    app_metadata: {
      role,
      supervisor_id: supervisor_id || null,
      account_manager_id: account_manager_id || null,
      internship_type: internship_type || null,
      department: department || null,
    },
  });

  if (authErr) {
    return jsonResponse({ error: authErr.message }, 400);
  }

  // Update the profile with phone and any extra fields
  if (phone) {
    await supabase.from("profiles").update({ phone }).eq("id", authData.user.id);
  }

  // Fetch the created profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .maybeSingle();

  return jsonResponse({ user: authData.user, profile }, 201);
}

async function deleteAccount(req: Request, supabase: ReturnType<typeof createClient>): Promise<Response> {
  const url = new URL(req.url);
  const userId = url.searchParams.get("id");

  if (!userId) {
    return jsonResponse({ error: "Missing user id" }, 400);
  }

  // Prevent self-deletion
  const authHeader = req.headers.get("Authorization")!;
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData } = await userClient.auth.getUser();
  if (userData.user?.id === userId) {
    return jsonResponse({ error: "Cannot delete your own account" }, 400);
  }

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  // Profile row is auto-deleted via ON DELETE CASCADE
  return jsonResponse({ success: true }, 200);
}

async function updateProfile(req: Request, supabase: ReturnType<typeof createClient>): Promise<Response> {
  const body = await req.json();
  const { id, full_name, role, supervisor_id, account_manager_id, internship_type, department, phone, status } = body;

  if (!id) {
    return jsonResponse({ error: "Missing profile id" }, 400);
  }

  const updates: Record<string, unknown> = {};
  if (full_name !== undefined) updates.full_name = full_name;
  if (role !== undefined) updates.role = role;
  if (supervisor_id !== undefined) updates.supervisor_id = supervisor_id || null;
  if (account_manager_id !== undefined) updates.account_manager_id = account_manager_id || null;
  if (internship_type !== undefined) updates.internship_type = internship_type || null;
  if (department !== undefined) updates.department = department || null;
  if (phone !== undefined) updates.phone = phone || null;
  if (status !== undefined) updates.status = status;

  if (Object.keys(updates).length === 0) {
    return jsonResponse({ error: "No fields to update" }, 400);
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return jsonResponse({ error: error.message }, 400);
  }

  return jsonResponse({ profile: data }, 200);
}
