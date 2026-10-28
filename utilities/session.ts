import { cookies } from "next/headers";
import { verifyJWT } from "@/utilities/jwt";

export interface SessionTokenData {
  user?: {
    id?: string;
    name?: string;
    email?: string;
  };
}

/**
 * Checks whether the current visitor has valid, active session cookies (`nv-session` and `nv-session-temp`).
 * Used for server-side route guards.
 */
export async function isUserLoggedIn(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const userToken = cookieStore.get("nv-session")?.value;
    const tempToken = cookieStore.get("nv-session-temp")?.value;

    if (!userToken || !tempToken) {
      return false;
    }

    const userData = verifyJWT(userToken) as SessionTokenData | null;
    const tempData = verifyJWT(tempToken) as SessionTokenData | null;

    if (!userData?.user?.email || !tempData?.user?.email) {
      return false;
    }

    if (userData.user.email !== tempData.user.email) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
