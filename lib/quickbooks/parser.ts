/**
 * Parse QuickBooks P&L report JSON: income total, COS total, COS by category.
 */

/** Parsed P&L: total income and Cost of Goods Sold line items (category name + amount). */
export type ProfitAndLossParsed = {
  incomeTotal?: number;
  cosTotal?: number;
  cosByCategory?: { categoryId: string; name: string; amount: number }[];
};

/** Raw QuickBooks P&L report response. */
export type QuickBooksProfitAndLossRaw = {
  Header?: { Time?: string; ReportName?: string; [k: string]: unknown };
  Columns?: { Column?: unknown[] };
  Rows?: { Row?: unknown[] };
};

/** Parsable P&L report structure from GET /api/quickbooks/pnl. */
export type PnlReportData = QuickBooksProfitAndLossRaw;

/** Controls which P&L data to parse and return. */
export type ProfitAndLossDataOption = 'income,cos' | 'cos';

function parseAmount(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const s = String(value).replace(/,/g, '');
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : Math.abs(n);
}

function findSection(
  rows: { Row?: unknown[] } | undefined,
  titleMatch: (title: string) => boolean,
): unknown | undefined {
  const rowList = Array.isArray(rows?.Row) ? rows.Row : [];
  for (const row of rowList) {
    const header = (row as { Header?: { ColData?: { value?: string }[] } })
      ?.Header?.ColData?.[0]?.value;
    if (header && titleMatch(header)) return row;
    const group = (row as { group?: string }).group;
    if (group && titleMatch(group)) return row;
  }
  return undefined;
}

function rowTotal(row: unknown): number {
  const r = row as {
    Summary?: { ColData?: { value?: unknown }[] };
    ColData?: { value?: unknown }[];
  };
  const summary = r?.Summary?.ColData;
  const colData = r?.ColData;
  if (Array.isArray(summary) && summary.length >= 2) {
    return parseAmount(summary[1]?.value);
  }
  if (Array.isArray(colData) && colData.length >= 2) {
    return parseAmount(colData[1]?.value);
  }
  return 0;
}

type PlRow = {
  ColData?: { value?: string }[];
  Rows?: { Row?: PlRow[] };
  Header?: { ColData?: { value?: string }[] };
  Summary?: { ColData?: { value?: unknown }[] };
};

function lineName(row: PlRow): string {
  const cols = row?.ColData;
  if (!Array.isArray(cols) || cols.length < 1) return '';
  return (cols[0]?.value ?? '').trim();
}

function categoryOrLineName(row: PlRow): string {
  const header = row?.Header?.ColData?.[0]?.value;
  if (header != null && String(header).trim()) return String(header).trim();
  return lineName(row);
}

function sectionCosLineItemsRecurse(
  row: PlRow,
  path: number[],
  out: { id: string; name: string; amount: number }[],
): void {
  const name = categoryOrLineName(row);
  if (!name) return;
  if (!row?.Header && /^cost of (goods )?sold$/i.test(name.trim())) return;
  const id = `qb-${path.join('-')}`;
  out.push({ id, name, amount: rowTotal(row) });
  const subRows = row?.Rows?.Row;
  if (!Array.isArray(subRows) || subRows.length === 0) return;
  subRows.forEach((sub, idx) => {
    sectionCosLineItemsRecurse(sub, [...path, idx], out);
  });
}

function sectionCosLineItems(
  row: unknown,
): { id: string; name: string; amount: number }[] {
  const r = row as { Rows?: { Row?: PlRow[] } };
  const out: { id: string; name: string; amount: number }[] = [];
  const rowList = Array.isArray(r?.Rows?.Row) ? r.Rows.Row : [];
  rowList.forEach((category, catIdx) => {
    sectionCosLineItemsRecurse(category, [catIdx], out);
  });
  return out;
}

export function parseIncomeFromReportRows(
  rows: { Row?: unknown[] } | undefined,
): number {
  const incomeSection = findSection(rows, (t) => /^income$/i.test(t.trim()));
  if (!incomeSection) return 0;
  return rowTotal(incomeSection);
}

export function parseCosTotalFromReportRows(
  rows: { Row?: unknown[] } | undefined,
): number {
  const cosSection = findSection(rows, (t) =>
    /cost of (goods )?sold|cost of sales/i.test(t.trim()),
  );
  if (!cosSection) return 0;
  return rowTotal(cosSection);
}

export function parseCosFromReportRows(
  rows: { Row?: unknown[] } | undefined,
): { categoryId: string; name: string; amount: number }[] {
  const cosSection = findSection(rows, (t) =>
    /cost of (goods )?sold|cost of sales/i.test(t.trim()),
  );
  if (!cosSection) return [];
  return sectionCosLineItems(cosSection).map((c) => ({
    categoryId: c.id,
    name: c.name,
    amount: c.amount,
  }));
}

export function getIncomeFromPnlReport(report: PnlReportData): number {
  return parseIncomeFromReportRows(report?.Rows);
}

export function getCosFromPnlReport(report: PnlReportData): {
  cosTotal: number;
  cosByCategory: { categoryId: string; name: string; amount: number }[];
} {
  const rows = report?.Rows;
  return {
    cosTotal: parseCosTotalFromReportRows(rows),
    cosByCategory: parseCosFromReportRows(rows),
  };
}

export function getBudgetDataFromPnlReport(report: PnlReportData): {
  incomeTotal: number;
  cosTotal: number;
  cosByCategory: { categoryId: string; name: string; amount: number }[];
} {
  const rows = report?.Rows;
  return {
    incomeTotal: parseIncomeFromReportRows(rows),
    cosTotal: parseCosTotalFromReportRows(rows),
    cosByCategory: parseCosFromReportRows(rows),
  };
}
