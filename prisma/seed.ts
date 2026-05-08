import { PrismaClient } from "@prisma/client";
import { CHARACTERS } from "../src/lib/characters/characters";
import { toCharacterSeedData } from "../src/lib/characters/character-seed";

const prisma = new PrismaClient();

async function main() {
  for (const character of CHARACTERS) {
    const data = toCharacterSeedData(character);

    await prisma.character.upsert({
      where: {
        id: character.id
      },
      update: data,
      create: data
    });
  }

  console.log(`Seeded ${CHARACTERS.length} LinguaAI characters`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
