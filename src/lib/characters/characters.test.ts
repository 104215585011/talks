import { getCharacterById, listCharacters } from "./characters";

describe("character static data", () => {
  test("defines exactly five complete characters", () => {
    const characters = listCharacters();

    expect(characters).toHaveLength(5);
    expect(characters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "emma",
          name: "Emma Clarke",
          language: "English (UK)",
          voice: expect.any(String),
          bio: expect.any(String),
          style: expect.any(String),
          systemPrompt: expect.stringContaining("Professor of English Literature")
        }),
        expect.objectContaining({
          id: "jake",
          name: "Jake Wilson",
          language: "English (US)",
          voice: expect.any(String),
          bio: expect.any(String),
          style: expect.any(String),
          systemPrompt: expect.stringContaining("Product Manager")
        })
      ])
    );
  });

  test("finds a character by id", () => {
    expect(getCharacterById("emma")).toMatchObject({
      id: "emma",
      name: "Emma Clarke"
    });
  });

  test("returns null for an unknown character id", () => {
    expect(getCharacterById("unknown")).toBeNull();
  });
});
