import type { Metadata } from "next";

import { UserList } from "@/components/superadmin/UserList";

export const metadata: Metadata = { title: "Users · Super admin" };

export default function SuperAdminUsersPage() {
  return (
    <>
      <header className="border-b border-hairline px-6 py-5 lg:px-8">
        <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Users</h1>
        <p className="mt-0.5 text-[13px] text-ink-muted">
          Every account on the platform, and what you can do to it.
        </p>
      </header>
      <UserList />
    </>
  );
}
