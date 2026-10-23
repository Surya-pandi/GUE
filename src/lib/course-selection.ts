export type ProgrammeSelection = {
  stream: string;
  name: string;
  degree_type: string;
};
export const programmeKey = (programme: ProgrammeSelection) =>
  JSON.stringify(
    [programme.stream, programme.name, programme.degree_type].map((value) =>
      value.trim().toLowerCase(),
    ),
  );

export function uniqueProgrammes(programmes: ProgrammeSelection[]) {
  return [
    ...new Map(
      programmes.map((programme) => [programmeKey(programme), programme]),
    ).values(),
  ];
}
