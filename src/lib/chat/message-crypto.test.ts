import { decryptMessageContent, encryptMessageContent } from "./message-crypto";

describe("message encryption", () => {
  test("encrypts and decrypts message content", () => {
    const encrypted = encryptMessageContent("Hello LinguaAI", "secret-key");

    expect(encrypted.content).not.toBe("Hello LinguaAI");
    expect(decryptMessageContent(encrypted, "secret-key")).toBe("Hello LinguaAI");
  });
});
