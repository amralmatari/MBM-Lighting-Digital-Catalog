import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
LOGO = ROOT / "MBM LIGHTING LOGO.png"
FOOTER_LOGO = ROOT / "شعار شركة المطري الرائدة للتجارة المحدودة.png"


def main():
    html = INDEX.read_text(encoding="utf-8")

    checks = {
        "logo image file exists": LOGO.exists(),
        "logo image is used": 'src="./MBM LIGHTING LOGO.png"' in html,
        "footer company logo exists": FOOTER_LOGO.exists(),
        "footer company logo is used": 'src="./شعار شركة المطري الرائدة للتجارة المحدودة.png"' in html,
        "footer logo has no white box": "bg-white/95" not in html,
        "footer content is constrained": 'data-role="site-footer"' in html and 'data-role="footer-shell"' in html and "max-w-7xl mx-auto" in html,
        "compact footer exists": 'data-role="site-footer"' in html and "p-4" in html,
        "footer phone numbers align right": 'data-role="footer-phone"' in html and "text-right" in html,
        "mobile footer stacks cleanly": "grid-cols-1" in html and "sm:grid-cols-2" in html,
        "company website appears": "www.almatari-mbm.com" in html,
        "customer service phone appears": "777525103" in html,
        "company email appears": "info@almatari-mbm.com" in html,
        "main office phone appears": "399306" in html,
        "products are grouped by category": "groupProductsByCategory" in html,
        "item number category prefix is used": "getItemCategoryCode" in html,
        "product name category title is used": "getCategoryTitle" in html,
        "cup bases category is explicit": "قواعد اضاءة كوب" in html,
        "panel bases category is explicit": "قواعد اضاءة بنل" in html,
        "groups can be expanded and collapsed": "expandedGroups" in html and "toggleGroup" in html,
        "categories are collapsed by default": "expandedGroups[groupKey] === true" in html,
        "expand all button exists": "expandAllGroups" in html and "توسيع كل الفئات" in html,
        "collapse all button exists": "collapseAllGroups" in html and "طي كل الفئات" in html,
        "terminology tab is default": "useState('terminology')" in html,
        "header slogan exists": "لكل مساحة نورها" in html,
        "header gold divider exists": 'data-role="header-gold-divider"' in html,
        "old header technical label is removed": "48V Smart Systems Available" not in html,
        "child products render under the model": "group.products.map" in html,
        "parent rows do not show first child specs": "group.mainProduct.technical_specs" not in html,
        "parent rows do not show first child power": "renderProductPower(group.mainProduct)" not in html,
        "group toggle indicator is rendered": 'data-role="group-toggle-indicator"' in html,
        "child product rows are indented": 'data-role="child-product-row"' in html and "border-r-2" in html,
        "mobile product cards exist": 'data-role="mobile-product-groups"' in html,
        "desktop product table is hidden on mobile": 'data-role="desktop-product-table"' in html and "hidden lg:block" in html,
        "scroll to top button exists": 'data-role="scroll-to-top"' in html and "scrollTo" in html,
    }

    failed = [name for name, ok in checks.items() if not ok]
    if failed:
        print("Failed UI grouping checks: " + ", ".join(failed))
        return 1

    if re.search(r"filteredProducts\.map\(\(product,\s*idx\)", html):
        print("Products still render as a flat table.")
        return 1

    if "الموديلات: {group.modelLabel}" in html:
        print("Model label is still rendered next to the parent product.")
        return 1

    indicator_pos = html.find('data-role="group-toggle-indicator"')
    title_pos = html.find("{group.title}", indicator_pos)
    if indicator_pos == -1 or title_pos == -1 or indicator_pos > title_pos:
        print("Group toggle indicator must appear to the right of the group title in RTL layout.")
        return 1

    print("OK: catalog uses the provided logo and grouped collapsible category UI.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
