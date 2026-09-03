import { NextResponse } from "next/server";

import { signUpload, uploadType } from "@/lib/cloudinary";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { folder = "loopinglive/webinars" } = await request.json();

    /*
   * The type is part of what is signed, so it has to travel with the
   * signature — the browser cannot choose it. Public unless private delivery
   * is turned on, which is what keeps existing deployments working unchanged.
   */
  const type = uploadType();

  return NextResponse.json({ ...signUpload({ folder, type }), type });
}
