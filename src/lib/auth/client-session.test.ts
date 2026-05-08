/**
 * @jest-environment jsdom
 */
import { clearAuthSession, readAuthSession, saveAuthSession } from "./client-session";

describe("client auth session", () => {
  it("persists access and refresh tokens with public user metadata", () => {
    saveAuthSession({
      accessToken: "access.token",
      refreshToken: "refresh-token",
      user: {
        id: "user-1",
        email: "learner@example.com",
        name: "Learner"
      }
    });

    expect(readAuthSession()).toEqual({
      accessToken: "access.token",
      refreshToken: "refresh-token",
      user: {
        id: "user-1",
        email: "learner@example.com",
        name: "Learner"
      }
    });
  });

  it("clears malformed session data instead of throwing", () => {
    window.localStorage.setItem("linguaai.auth", "not-json");

    expect(readAuthSession()).toBeNull();
    expect(window.localStorage.getItem("linguaai.auth")).toBeNull();
  });

  it("removes saved session data", () => {
    saveAuthSession({
      accessToken: "access.token",
      refreshToken: "refresh-token",
      user: {
        id: "user-1",
        email: "learner@example.com",
        name: null
      }
    });

    clearAuthSession();

    expect(readAuthSession()).toBeNull();
  });
});
