type LocalizedNameEntity = {
  nameFA?: string | null;
  nameEN?: string | null;
  nameRU?: string | null;
  name?: string | null;
};

function firstNonEmpty(values: Array<string | null | undefined>): string {
  return (
    values.find((value) => typeof value === "string" && value.trim()) ?? ""
  );
}

export function getLocalizedName(entity: LocalizedNameEntity): string {
  return firstNonEmpty([
    entity.nameFA,
    entity.nameEN,
    entity.nameRU,
    entity.name,
  ]);
}
