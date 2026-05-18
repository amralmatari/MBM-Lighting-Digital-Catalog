import re
import sys
from pathlib import Path

import openpyxl


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
WORKBOOK = ROOT / "المواصفات الفنية.xlsx"
SHEET_NAME = "المواصفات الفنية"


def read_excel_item_numbers():
    workbook = openpyxl.load_workbook(WORKBOOK, data_only=True)
    sheet = workbook[SHEET_NAME]
    numbers = []
    for row in sheet.iter_rows(min_row=2, values_only=True):
        item_number = row[0]
        if item_number:
            numbers.append(str(item_number).strip())
    return numbers


def read_html_item_numbers():
    html = INDEX.read_text(encoding="utf-8")
    return re.findall(r'"?item_number"?\s*:\s*"([^"]+)"', html)


def assert_table_headers_unchanged():
    html = INDEX.read_text(encoding="utf-8")
    required_headers = [
        "الصنف والموديل",
        "الاستهلاك والإضاءة",
        "المواصفات الفنية",
        "ميزات إضافية",
    ]
    missing = [header for header in required_headers if header not in html]
    if missing:
        raise AssertionError(f"Missing table headers: {missing}")


def main():
    excel_numbers = read_excel_item_numbers()
    html_numbers = read_html_item_numbers()

    missing = sorted(set(excel_numbers) - set(html_numbers))
    extra = sorted(set(html_numbers) - set(excel_numbers))

    errors = []
    if len(html_numbers) != len(excel_numbers):
        errors.append(
            f"Expected {len(excel_numbers)} products from Excel, found {len(html_numbers)} in index.html."
        )
    if missing:
        errors.append(f"Missing Excel products: {', '.join(missing[:20])}")
    if extra:
        errors.append(f"Products not found in Excel: {', '.join(extra[:20])}")

    assert_table_headers_unchanged()

    if errors:
        print("\n".join(errors))
        return 1

    print(f"OK: index.html contains exactly {len(excel_numbers)} Excel products.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
