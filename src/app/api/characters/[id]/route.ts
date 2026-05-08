import { getCharacterById } from "@/lib/characters/characters";

type RouteContext = {
  params: {
    id: string;
  };
};

export function GET(_request: Request, context: RouteContext) {
  const character = getCharacterById(context.params.id);

  if (!character) {
    return Response.json(
      {
        error: {
          code: "CHARACTER_NOT_FOUND",
          message: "Character not found"
        }
      },
      { status: 404 }
    );
  }

  return Response.json({ character });
}
