import { formatSheba } from "@/lib/sheba";

/** Row shape the CSV needs. A subset of the admin payout JSON. */
export interface PayoutCsvRow {
  id: string;
  amount: number;
  createdAt: string;
  bankSheba: string | null;
  bankAccountHolder: string | null;
  bankName: string | null;
  bankNote: string;
  user: {
    firstName: string;
    lastName: string;
    mobileNumber: string;
  } | null;
}

const HEADERS = [
  "شناسه درخواست",
  "تاریخ درخواست",
  "نام کاربر",
  "موبایل",
  "نام صاحب حساب",
  "شماره شبا",
  "بانک",
  "مبلغ (تومان)",
  "مبلغ (ریال)",
  "توضیحات",
];

/**
 * Quotes a cell and defuses spreadsheet formulas: a value that starts with
 * `= + - @` would otherwise run when the file is opened in Excel.
 */
export function csvCell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** UTF-8 with BOM and CRLF so Excel opens Persian text correctly. */
export function buildPayoutsCsv(rows: PayoutCsvRow[]): string {
  const lines = [HEADERS.map(csvCell).join(",")];
  for (const row of rows) {
    const userName = row.user
      ? `${row.user.firstName} ${row.user.lastName}`.trim()
      : "";
    lines.push(
      [
        row.id,
        row.createdAt,
        userName,
        row.user?.mobileNumber ?? "",
        row.bankAccountHolder ?? "",
        row.bankSheba ? formatSheba(row.bankSheba).replace(/ /g, "") : "",
        row.bankName ?? "",
        row.amount,
        row.amount * 10,
        row.bankNote,
      ]
        .map(csvCell)
        .join(",")
    );
  }
  return `﻿${lines.join("\r\n")}\r\n`;
}
