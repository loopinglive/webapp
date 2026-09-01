import { NextResponse } from "next/server";

import { signUpload } from "@/lib/cloudinary";
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

  return NextResponse.json(signUpload({ folder }));
}
