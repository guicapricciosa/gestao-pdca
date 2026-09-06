/**
 * Server-rendered SVG charts for the general dashboard. Deterministic, no
 * client code: bars <= 24px with a rounded data end, 2px lines with ringed
 * markers, legend whenever there are two series, native tooltips on every
 * mark and a table view under each chart. Colors validated for colour-vision
 * deficiency on the white card surface (blue #2a78d6, orange #eb6834).
 */

export interface BreakdownRow {
  readonly chart: string | null;
  readonly label: string | null;
  readonly series: string | null;
  readonly value: number | null;
  readonly sort: number | null;
}

const seriesColor: Record<string, string> = {
  Tarefas: "#2a78d6",
  PDCAs: "#eb6834",
};

const seriesOrder = ["Tarefas", "PDCAs"];

/** Fixed series order: colour and position follow the entity, never the data. */
function seriesOf(rows: readonly BreakdownRow[]) {
  return [...new Set(rows.map((row) => row.series ?? ""))].sort(
    (a, b) => seriesOrder.indexOf(a) - seriesOrder.indexOf(b),
  );
}

function labelsOf(rows: readonly BreakdownRow[]) {
  const seen = new Map<string, number>();
  for (const row of rows) {
    const key = row.label ?? "";
    if (!seen.has(key)) seen.set(key, row.sort ?? 0);
  }
  return [...seen.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([label]) => label);
}

function valueOf(rows: readonly BreakdownRow[], label: string, series: string) {
  return (
    rows.find((row) => row.label === label && row.series === series)?.value ?? 0
  );
}

function Legend({ series }: { readonly series: readonly string[] }) {
  if (series.length < 2) return null;
  return (
    <ul className="text-muted-foreground flex flex-wrap gap-4 text-xs">
      {series.map((name) => (
        <li className="flex items-center gap-1.5" key={name}>
          <span
            aria-hidden
            className="inline-block size-2.5 rounded-sm"
            style={{ background: seriesColor[name] ?? "#52514e" }}
          />
          {name}
        </li>
      ))}
    </ul>
  );
}

function TableView({
  rows,
  labelHeading,
}: {
  readonly rows: readonly BreakdownRow[];
  readonly labelHeading: string;
}) {
  const series = seriesOf(rows);
  const labels = labelsOf(rows);
  return (
    <details className="mt-3">
      <summary className="text-muted-foreground cursor-pointer text-xs">
        Ver como tabela
      </summary>
      <table className="mt-2 w-full text-xs">
        <thead className="text-muted-foreground">
          <tr>
            <th className="py-1 text-left font-medium">{labelHeading}</th>
            {series.map((name) => (
              <th className="py-1 text-right font-medium" key={name}>
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((label) => (
            <tr className="border-t" key={label}>
              <td className="py-1">{label}</td>
              {series.map((name) => (
                <td className="py-1 text-right tabular-nums" key={name}>
                  {valueOf(rows, label, name)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** Horizontal bars; one bar per label, grouped when there are two series. */
export function BarChart({
  title,
  rows,
  labelHeading,
  labelOf = (label) => label,
  testId,
}: {
  readonly title: string;
  readonly rows: readonly BreakdownRow[];
  readonly labelHeading: string;
  readonly labelOf?: (label: string) => string;
  readonly testId: string;
}) {
  const series = seriesOf(rows);
  const labels = labelsOf(rows);
  const max = Math.max(1, ...rows.map((row) => row.value ?? 0));
  const barHeight = series.length > 1 ? 12 : 18;
  const rowHeight = series.length * barHeight + 2 * (series.length - 1) + 14;
  const labelWidth = 150;
  const width = 520;
  const plotWidth = width - labelWidth - 44;
  const height = labels.length * rowHeight + 4;
  const empty = rows.every((row) => (row.value ?? 0) === 0);
  return (
    <figure className="rounded-2xl border bg-white p-5" data-testid={testId}>
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">{title}</span>
        <Legend series={series} />
      </figcaption>
      {empty ? (
        <p className="text-muted-foreground mt-3 text-sm">Sem dados.</p>
      ) : (
        <svg
          aria-label={title}
          className="mt-3 w-full"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {labels.map((label, index) => {
            const top = index * rowHeight + 2;
            return (
              <g key={label}>
                <text
                  className="fill-current text-[12px]"
                  dominantBaseline="middle"
                  x={labelWidth - 8}
                  y={top + (rowHeight - 14) / 2}
                  textAnchor="end"
                >
                  {labelOf(label)}
                </text>
                {series.map((name, sIndex) => {
                  const value = valueOf(rows, label, name);
                  const barWidth = Math.round((value / max) * plotWidth);
                  const y = top + sIndex * (barHeight + 2);
                  return (
                    <g key={name}>
                      <title>{`${labelOf(label)} · ${name}: ${value}`}</title>
                      {value > 0 && (
                        <path
                          d={`M${labelWidth},${y} h${Math.max(barWidth - 4, 0)} a4,4 0 0 1 4,4 v${barHeight - 8} a4,4 0 0 1 -4,4 h${-Math.max(barWidth - 4, 0)} z`}
                          fill={seriesColor[name] ?? "#52514e"}
                        />
                      )}
                      <text
                        className="fill-current text-[11px] tabular-nums"
                        dominantBaseline="middle"
                        x={labelWidth + barWidth + 6}
                        y={y + barHeight / 2}
                      >
                        {value}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      )}
      <TableView rows={rows} labelHeading={labelHeading} />
    </figure>
  );
}

/** Lines over ordered labels (weeks), one line per series. */
export function LineChart({
  title,
  rows,
  labelHeading,
  testId,
}: {
  readonly title: string;
  readonly rows: readonly BreakdownRow[];
  readonly labelHeading: string;
  readonly testId: string;
}) {
  const series = seriesOf(rows);
  const labels = labelsOf(rows);
  const max = Math.max(1, ...rows.map((row) => row.value ?? 0));
  const width = 520;
  const height = 200;
  const left = 32;
  const right = 40;
  const top = 12;
  const bottom = 28;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const x = (index: number) =>
    left +
    (labels.length === 1 ? 0 : (index / (labels.length - 1)) * plotWidth);
  const y = (value: number) => top + plotHeight - (value / max) * plotHeight;
  const ticks = [0, Math.ceil(max / 2), max];
  return (
    <figure className="rounded-2xl border bg-white p-5" data-testid={testId}>
      <figcaption className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold">{title}</span>
        <Legend series={series} />
      </figcaption>
      <svg
        aria-label={title}
        className="mt-3 w-full"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              stroke="#e6e5e1"
              strokeWidth={1}
              x1={left}
              x2={left + plotWidth}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text
              className="fill-current text-[10px] tabular-nums opacity-60"
              dominantBaseline="middle"
              textAnchor="end"
              x={left - 6}
              y={y(tick)}
            >
              {tick}
            </text>
          </g>
        ))}
        {labels.map((label, index) => (
          <text
            className="fill-current text-[10px] opacity-60"
            key={label}
            textAnchor="middle"
            x={x(index)}
            y={height - 8}
          >
            {label}
          </text>
        ))}
        {series.map((name) => {
          const points = labels.map((label, index) => ({
            x: x(index),
            y: y(valueOf(rows, label, name)),
            value: valueOf(rows, label, name),
            label,
          }));
          const color = seriesColor[name] ?? "#52514e";
          return (
            <g key={name}>
              <polyline
                fill="none"
                points={points
                  .map((point) => `${point.x},${point.y}`)
                  .join(" ")}
                stroke={color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
              {points.map((point) => (
                <g key={point.label}>
                  <title>{`${point.label} · ${name}: ${point.value}`}</title>
                  <circle cx={point.x} cy={point.y} fill="#ffffff" r={6} />
                  <circle cx={point.x} cy={point.y} fill={color} r={4} />
                </g>
              ))}
              <text
                className="fill-current text-[11px] tabular-nums"
                dominantBaseline="middle"
                x={points[points.length - 1]!.x + 10}
                y={points[points.length - 1]!.y}
              >
                {points[points.length - 1]!.value}
              </text>
            </g>
          );
        })}
      </svg>
      <TableView rows={rows} labelHeading={labelHeading} />
    </figure>
  );
}
