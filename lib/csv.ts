/**
 * CSV parsing.
 *
 * Hand-rolled because the only real difficulty is quoted fields, and a
 * `split(",")` gets those wrong on the first row containing a company name.
 * Lives here rather than inside the import route so it can actually be tested
 * — a copy of the parser in a test file tests the copy.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        // A doubled quote inside a quoted field is a literal quote.
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim()));
}

/**
 * Finds a column by any of several likely headings.
 *
 * People export from Mailchimp, from a spreadsheet, from their CRM — the
 * heading is "Email", "email address", or "E-Mail" depending on where it came
 * from, and asking them to rename it first is a reason not to bother.
 */
export function columnIndex(header: string[], candidates: string[]) {
  const normalised = header.map((h) =>
    h.trim().toLowerCase().replace(/[^a-z]/g, "")
  );
  for (const candidate of candidates) {
    const index = normalised.indexOf(candidate);
    if (index !== -1) return index;
  }
  return -1;
}
