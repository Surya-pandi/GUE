export const universitySteps = [
  {
    path: "profile",
    label: "University profile",
    help: "Save your overview, address, and contact details.",
  },
  {
    path: "courses",
    label: "Courses",
    help: "Save a course to continue automatically to your gallery. You can return here to add more courses.",
  },
  {
    path: "gallery",
    label: "Gallery & tours",
    help: "Upload at least 3 photos in each gallery section: Campus, Hostel, Infrastructure, Labs, Library, Sports, and Other. Existing photos count. Setup finishes once every section, your profile, and your courses are complete. Virtual tours are optional.",
  },
] as const;

export const mediaCategories = [
  { value: "campus", label: "Campus" },
  { value: "hostel", label: "Hostel" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "lab", label: "Labs" },
  { value: "library", label: "Library" },
  { value: "sports", label: "Sports" },
  { value: "other", label: "Other" },
] as const;

export type UniversitySetup = {
  profile: boolean;
  courses: boolean;
  gallery: boolean;
  documents: boolean;
  complete: boolean;
};
export function availableSetupStep(status: UniversitySetup) {
  const firstMissing = universitySteps.findIndex((step) => !status[step.path]);
  return firstMissing < 0 ? universitySteps.length - 1 : firstMissing;
}
