import { CredentialsSignin } from "next-auth";
import { authService } from "@/lib/modules/auth/auth.service";
import { ServiceError } from "@/lib/shared/errors";

class LoginRateLimited extends CredentialsSignin { code = "rate_limited"; }
class LoginUnavailable extends CredentialsSignin { code = "login_unavailable"; }

export async function authorizeCredentials(raw: Partial<Record<string, unknown>>, request: Request) {
  try {
    return await authService.verifyCredentials({ email: raw.email, password: raw.password }, request.headers);
  } catch (error) {
    if (error instanceof ServiceError && error.code === "rate_limited") throw new LoginRateLimited();
    if (error instanceof ServiceError && error.code === "login_unavailable") throw new LoginUnavailable();
    throw error;
  }
}
