import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, signUp } from "./helpers.js";

describe("auth", () => {
  it("registers, keeps the session in a cookie and logs out", async () => {
    const { agent, email } = await signUp("Priya");
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user).toMatchObject({ name: "Priya", email });
    expect(me.body.user.passwordHash).toBeUndefined();

    expect((await agent.post("/api/auth/logout")).status).toBe(204);
    expect((await agent.get("/api/auth/me")).body.user).toBeNull();
  });

  it("sets an httpOnly cookie", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Cookie", email: "cookie@example.com", password: "password123" });
    expect(res.headers["set-cookie"][0]).toMatch(/HttpOnly/i);
  });

  it("rejects duplicate emails, case-insensitively", async () => {
    const { email } = await signUp();
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Dupe", email: email.toUpperCase(), password: "password123" });
    expect(res.status).toBe(409);
  });

  it("validates sign-up fields", async () => {
    const res = await request(app).post("/api/auth/register").send({ name: "A", email: "nope", password: "short" });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.details)).toEqual(expect.arrayContaining(["name", "email", "password"]));
  });

  it("logs in with the right password only", async () => {
    const { email } = await signUp();
    const bad = await request(app).post("/api/auth/login").send({ email, password: "wrong-password" });
    expect(bad.status).toBe(401);
    const unknown = await request(app).post("/api/auth/login").send({ email: "ghost@example.com", password: "x" });
    expect(unknown.body.error).toBe(bad.body.error);

    const agent = request.agent(app);
    expect((await agent.post("/api/auth/login").send({ email, password: "password123" })).status).toBe(200);
    expect((await agent.get("/api/auth/me")).body.user.email).toBe(email);
  });

  it("ignores a tampered token", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", "nestly_token=not.a.real.token");
    expect(res.body.user).toBeNull();
  });
});
