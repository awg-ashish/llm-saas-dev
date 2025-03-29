"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function login(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);
  console.log("[Login Action] Auth result:", error ? error.message : "Success");

  if (error) {
    console.log("[Login Action]", error);
    redirect("/login");
  }
  console.log("[Login Action] Redirecting to /dashboard");
  revalidatePath("/dashboard");
  redirect("/dashboard");

  // return new Response(null, {
  //   status: 302,
  //   headers: { Location: "/dashboard" },
  // });
}
