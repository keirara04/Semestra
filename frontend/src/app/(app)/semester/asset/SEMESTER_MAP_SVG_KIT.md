# Semestra Semester Map SVG kit

Editable, text-free/semantic SVG assets for the Field Notes Semester screen live in [`public/semestra/semester-map/`](../public/semestra/semester-map/).

| Asset | Job |
| --- | --- |
| `week-axis.svg` | 12-week and month/exam axis. |
| `course-lane.svg` | Confirmed plus projected portion of a course lane. Uses `currentColor`. |
| `assessment-marker.svg` | Assessment milestone dot. Uses `currentColor`. |
| `risk-window.svg` | Diagonal hatch for an at-risk planning window. Uses `currentColor`. |
| `workload-chart.svg` | Complete 12-week stacked-capacity chart with a highlighted high-load week. |
| `legend.svg` | Legend for the visual language. |

## Direct use

```tsx
<img src="/semestra/semester-map/week-axis.svg" alt="Semester weeks" />
<img src="/semestra/semester-map/workload-chart.svg" alt="Weekly workload by course" />
```

For dynamic course colour, inline `course-lane.svg`, `assessment-marker.svg`, or `risk-window.svg` as a React component and set `color` on its wrapper:

```tsx
<div style={{ color: "#2857A0" }}>
  <CourseLane />
</div>
```

Do not use the static workload chart as the only way to communicate capacity. Keep the same weekly totals and at-risk explanation available in accessible text.
