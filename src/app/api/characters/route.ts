import { listCharacters } from "@/lib/characters/characters";

export function GET() {
  return Response.json({
    characters: listCharacters()
  });
}
