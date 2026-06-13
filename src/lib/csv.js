export function downloadCsv(rows, filename = 'bluedoor-customer-signal.csv') {
  if (!rows?.length) return;

  const headers = [
    'Company',
    'Website',
    'HQ',
    'Employee Range',
    'Stage',
    'Sector',
    'Signal Type',
    'Signal Date',
    'Total Score',
    'Priority',
    'Package Map',
    'Why It Matters',
    'Recommended First Outreach',
    'Next Action',
    'Confidence',
    'Evidence URLs'
  ];

  const body = rows.map((row) => [
    row.company,
    row.website,
    row.hq,
    row.employee_range,
    row.stage,
    row.sector,
    row.signal_type,
    row.signal_date,
    row.total_score,
    row.priority,
    row.package_map,
    row.why_it_matters,
    row.recommended_first_outreach,
    row.next_action,
    row.confidence,
    (row.evidence_links || []).map((link) => link.url).join(' | ')
  ]);

  const csv = [headers, ...body]
    .map((line) => line.map(escapeCsv).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}
