import { hashPassword, comparePassword, signJWT, verifyJWT } from "@/lib/auth";
import { Role } from "@prisma/client";

describe("Auth Logic (Hashing & JWT)", () => {
  it("hashes password and verifies successfully with bcrypt", async () => {
    const rawPassword = "Password123!";
    const hash = await hashPassword(rawPassword);

    expect(hash).not.toBe(rawPassword);
    expect(hash).toMatch(/^\$2[aby]\$.+/);

    const isMatch = await comparePassword(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isMismatch = await comparePassword("WrongPassword!", hash);
    expect(isMismatch).toBe(false);
  });

  it("signs and verifies JWT payload using jose", async () => {
    const payload = {
      userId: "user-uuid-1234",
      email: "test@campusfix.edu",
      name: "Test User",
      role: Role.REPORTER,
    };

    const token = await signJWT(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);

    const verified = await verifyJWT(token);
    expect(verified).not.null;
    expect(verified?.userId).toBe(payload.userId);
    expect(verified?.email).toBe(payload.email);
    expect(verified?.role).toBe(Role.REPORTER);
  });

  it("returns null when verifying an invalid or tampered JWT token", async () => {
    const invalid = await verifyJWT("not.a.valid.jwt.token");
    expect(invalid).toBeNull();
  });
});
