import { ActionForm } from "@/components/action-form";
import { manageAction } from "@/app/actions";
import { Course } from "@/lib/data";
import { Field, Select, Textarea } from "@/components/ui";
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
      <h3>{course.name}</h3>
      <p>
        {course.stream} · {course.duration} ·{" "}
        {course.is_published ? "Published" : "Pending review"}
      </p>
      <details>
        <summary>Edit course</summary>
        <ActionForm action={manageAction} submit="Save course for review">
          <input type="hidden" name="operation" value="course" />
          <input type="hidden" name="institution_id" value={institutionId} />
          <input type="hidden" name="id" value={course.id} />
          <div className="form-grid">
            <Field
              label="Course name"
              name="name"
              defaultValue={course.name}
              required
            />
            <Select
              label="Stream"
              name="stream"
              options={categories}
              defaultValue={course.stream}
            />
            <Field
              label="Degree type"
              name="degree_type"
              defaultValue={course.degree_type}
            />
            <Field
              label="Duration"
              name="duration"
              defaultValue={course.duration}
            />
            <Field
              label="Published fee (INR)"
              name="published_fee_amount"
              type="number"
              min={0}
              defaultValue={course.published_fee_amount ?? ""}
            />
          </div>
          <Textarea
            label="Eligibility"
            name="eligibility"
            defaultValue={course.eligibility}
          />
          <Textarea
            label="Description and fee period"
            name="description"
            defaultValue={course.description}
          />
        </ActionForm>
      </details>
      <details>
        <summary>Remove this course</summary>
        <p>
          This removes the published course and submits the institution for
          review.
        </p>
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
