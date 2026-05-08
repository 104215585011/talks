import { CHARACTERS } from "./characters";
import { toCharacterSeedData } from "./character-seed";

describe("character seed mapping", () => {
  test("preserves voice, bio, and style when mapping to database fields", () => {
    const emma = CHARACTERS.find((character) => character.id === "emma");

    expect(emma).toBeDefined();

    const seedData = toCharacterSeedData(emma!);

    expect(seedData).toMatchObject({
      id: "emma",
      slug: "emma",
      name: "Emma Clarke",
      locale: "English (UK)",
      voice: emma!.voice,
      bio: emma!.bio,
      style: emma!.style,
      systemPrompt: emma!.systemPrompt,
      isActive: true
    });
  });
});
