import { CourseFields } from "@/components/course-fields";
import { ActionForm } from "@/components/action-form";
import { manageAction } from "@/app/actions";
import { Course } from "@/lib/data";
import { Textarea } from "@/components/ui";
export function CourseEditor({
  course,
  institutionId,
  categories,
}: {
  course: Course;
  institutionId: string;
  categories: string[];
}) {
  return (
    <div className="record">
      <h3>
        {course.degree_type ? `${course.degree_type} - ` : ""}
        {course.name}
      </h3>
      <p>
        {course.stream} · {course.duration} ·{" "}
        {course.is_published ? "Available on published profile" : "Draft"}
      </p>
      <details>
        <summary>Edit course</summary>
        <ActionForm action={manageAction} submit="Save course">
          <input type="hidden" name="operation" value="course" />
          <input type="hidden" name="institution_id" value={institutionId} />
          <input type="hidden" name="id" value={course.id} />
          <CourseFields course={course} categories={categories} />
          <Textarea
            label="Eligibility"
            name="eligibility"
            defaultValue={course.eligibility}
          />
          <Textarea
            label="Additional course details"
            name="description"
            defaultValue={course.description}
          />
        </ActionForm>
      </details>
      <details>
        <summary>Remove this course</summary>
        <p>This removes the course from the university profile.</p>
        <ActionForm action={manageAction} submit="Remove course">
          <input type="hidden" name="operation" value="course" />
          <input type="hidden" name="institution_id" value={institutionId} />
          <input type="hidden" name="id" value={course.id} />
          <input type="hidden" name="name" value={course.name} />
          <input type="hidden" name="stream" value={course.stream} />
          <input type="hidden" name="remove" value="true" />
        </ActionForm>
      </details>
    </div>
  );
}
