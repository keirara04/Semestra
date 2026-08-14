"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Folder, FolderOpen } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { Course, Material, Semester } from "@/lib/types";
import { MaterialThumbnail } from "@/components/notestra/MaterialThumbnail";
import { MaterialQuickLook } from "@/components/notestra/MaterialQuickLook";

// Notestra landing/picker — see mdfile/NOTESTRA_FUNCTIONAL_SPEC.md. Notestra
// itself opens a single material (/notestra/[materialId]); this page exists
// only so the sidebar entry has somewhere to land — PDFs are grouped by
// semester, then into a folder per course/subject. Every folder (semester
// and course alike) starts closed; nothing expands until clicked.
export default function NotestraLandingPage() {
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [semesters, setSemesters] = useState<Semester[] | null>(null);
  const [openSemesters, setOpenSemesters] = useState<Set<number>>(new Set());
  const [openCourses, setOpenCourses] = useState<Set<number>>(new Set());
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);

  useEffect(() => {
    apiFetch<Material[]>("/api/materials").then((list) => setMaterials(list.filter((m) => m.type === "pdf")));
    apiFetch<Course[]>("/api/courses").then(setCourses);
    apiFetch<Semester[]>("/api/semesters").then(setSemesters);
  }, []);

  function toggle(set: Set<number>, setSet: (next: Set<number>) => void, id: number) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSet(next);
  }

  const materialsByCourse = new Map<number, Material[]>();
  for (const material of materials ?? []) {
    const list = materialsByCourse.get(material.course_id) ?? [];
    list.push(material);
    materialsByCourse.set(material.course_id, list);
  }

  const coursesWithPdfs = (courses ?? []).filter((course) => (materialsByCourse.get(course.id)?.length ?? 0) > 0);
  const coursesBySemester = new Map<number, Course[]>();
  for (const course of coursesWithPdfs) {
    const list = coursesBySemester.get(course.semester_id) ?? [];
    list.push(course);
    coursesBySemester.set(course.semester_id, list);
  }

  const semestersWithPdfs = (semesters ?? [])
    .filter((semester) => (coursesBySemester.get(semester.id)?.length ?? 0) > 0)
    .sort((a, b) => b.start_date.localeCompare(a.start_date));

  return (
    <main className="bg-[var(--fn-paper)] min-h-dvh w-full px-8 py-10 md:px-12">
      <p className="fn-eyebrow">Notestra</p>
      <h1 className="mt-2 text-2xl font-medium">Your PDFs</h1>
      <p className="mt-1 text-sm text-[var(--fn-muted)]">
        Organized by semester and subject — pick a PDF to open, annotate, and take notes on it.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {semestersWithPdfs.map((semester) => {
          const semesterOpen = openSemesters.has(semester.id);
          const semesterCourses = coursesBySemester.get(semester.id) ?? [];
          const pdfCount = semesterCourses.reduce((sum, c) => sum + (materialsByCourse.get(c.id)?.length ?? 0), 0);

          return (
            <div key={semester.id} className="rounded-xl border" style={{ borderColor: "var(--fn-rule)" }}>
              <button
                type="button"
                onClick={() => toggle(openSemesters, setOpenSemesters, semester.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                {semesterOpen ? <FolderOpen size={20} /> : <Folder size={20} />}
                <span className="font-medium">{semester.name}</span>
                <span className="fn-mono ml-auto text-[11px] text-[var(--fn-muted)]">
                  {pdfCount} {pdfCount === 1 ? "PDF" : "PDFs"}
                </span>
              </button>

              {semesterOpen && (
                <div
                  className="flex flex-col gap-3 border-t px-4 py-3 pl-8"
                  style={{ borderColor: "var(--fn-rule)" }}
                >
                  {semesterCourses.map((course) => {
                    const courseMaterials = materialsByCourse.get(course.id) ?? [];
                    const courseOpen = openCourses.has(course.id);

                    return (
                      <div key={course.id} className="rounded-xl border" style={{ borderColor: "var(--fn-rule)" }}>
                        <button
                          type="button"
                          onClick={() => toggle(openCourses, setOpenCourses, course.id)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left"
                        >
                          {courseOpen ? (
                            <FolderOpen size={20} style={{ color: course.colour }} />
                          ) : (
                            <Folder size={20} style={{ color: course.colour }} />
                          )}
                          <span className="font-medium">{course.title}</span>
                          {course.code && (
                            <span className="fn-mono text-[11px] text-[var(--fn-muted)]">{course.code}</span>
                          )}
                          <span className="fn-mono ml-auto text-[11px] text-[var(--fn-muted)]">
                            {courseMaterials.length} {courseMaterials.length === 1 ? "PDF" : "PDFs"}
                          </span>
                        </button>

                        {courseOpen && (
                          <ul className="flex flex-col divide-y border-t" style={{ borderColor: "var(--fn-rule)" }}>
                            {courseMaterials.map((material) => (
                              <li
                                key={material.id}
                                className="flex items-center gap-3 py-2 pl-11 pr-4 text-sm"
                                style={{ borderColor: "var(--fn-rule)" }}
                              >
                                <button
                                  type="button"
                                  onClick={() => setPreviewMaterial(material)}
                                  aria-label={`Preview ${material.title}`}
                                  className="shrink-0"
                                >
                                  <MaterialThumbnail materialId={material.id} width={72} />
                                </button>
                                <Link
                                  href={`/notestra/${material.id}`}
                                  className="min-w-0 flex-1 truncate text-[var(--fn-cobalt)] underline underline-offset-2"
                                >
                                  {material.title}
                                </Link>
                                {material.week && (
                                  <span className="fn-mono shrink-0 text-[11px] text-[var(--fn-muted)]">
                                    Week {material.week}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {materials !== null && semestersWithPdfs.length === 0 && (
          <p className="py-3 text-sm text-[var(--fn-muted)]">
            No PDFs yet — add one under a course&apos;s Materials tab first.
          </p>
        )}
      </div>

      {previewMaterial && (
        <MaterialQuickLook
          materialId={previewMaterial.id}
          title={previewMaterial.title}
          onClose={() => setPreviewMaterial(null)}
        />
      )}
    </main>
  );
}
