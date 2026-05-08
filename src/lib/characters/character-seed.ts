import type { LinguaCharacter } from "./characters";

export function toCharacterSeedData(character: LinguaCharacter) {
  return {
    id: character.id,
    slug: character.id,
    name: character.name,
    locale: character.language,
    voice: character.voice,
    bio: character.bio,
    style: character.style,
    systemPrompt: character.systemPrompt,
    isActive: true
  };
}
