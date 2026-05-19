import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
LOGO = ROOT / "MBM LIGHTING LOGO.png"
FOOTER_LOGO = ROOT / "شعار شركة المطري الرائدة للتجارة المحدودة.png"
CATEGORY_IMAGES = [
    ROOT / "images" / "قواعد اضاءة بنل.jpeg",
    ROOT / "images" / "قواعد اضاءة تراك لايت.jpg",
    ROOT / "images" / "قواعد اضاءة سبوت لايت.png",
    ROOT / "images" / "قواعد اضاءة كوب.jpeg",
    ROOT / "images" / "قواعد اضاءة ماجناتك .png",
    ROOT / "images" / "قواعد اضاءة مانع توهج.png",
    ROOT / "images" / "ملحقات وتراكات ماجنتك.jpeg",
]


def main():
    html = INDEX.read_text(encoding="utf-8")

    checks = {
        "logo image file exists": LOGO.exists(),
        "logo image is used": 'src="./MBM LIGHTING LOGO.png"' in html,
        "footer company logo exists": FOOTER_LOGO.exists(),
        "footer company logo is used": 'src="./شعار شركة المطري الرائدة للتجارة المحدودة.png"' in html,
        "footer logo has no white box": "bg-white/95" not in html,
        "footer text company name is removed": "<div className=\"text-sm font-bold text-white\">شركة المطري الرائدة للتجارة المحدودة</div>" not in html,
        "footer logo is centered and larger": 'data-role="footer-brand"' in html and "justify-center" in html and "h-16" in html,
        "footer website is below logo": 'data-role="footer-website"' in html and "block text-center" in html,
        "footer contact badge exists": "تواصل معنا" in html and "rounded-full" in html,
        "footer content is constrained": 'data-role="site-footer"' in html and 'data-role="footer-shell"' in html and "max-w-7xl mx-auto" in html,
        "compact footer exists": 'data-role="site-footer"' in html and "p-4" in html,
        "footer phone numbers align right": 'data-role="footer-phone"' in html and "text-right" in html,
        "mobile footer cards split into two columns": 'data-role="footer-contact-card"' in html and "grid-cols-[auto_1fr]" in html,
        "mobile footer stacks cleanly": "grid-cols-1" in html and "sm:grid-cols-2" in html,
        "company website appears": "www.almatari-mbm.com" in html,
        "customer service phone appears": "777525103" in html,
        "company email appears": "info@almatari-mbm.com" in html,
        "main office phone appears": "399306" in html,
        "calculator tab exists": "حاسبة الإضاءة" in html and "calculator" in html,
        "calculator section exists": "function LightingCalculatorSection()" in html,
        "calculator lux table exists": "placeLuxLevels" in html and "غرفة نوم" in html and "معرض ديكور" in html,
        "calculator default factors exist": "DEFAULT_UF = 0.70" in html and "DEFAULT_MF = 0.80" in html,
        "calculator excludes missing lumen products": "extractProductLumen" in html and "calculatorProducts" in html and "mbmProducts.filter" in html,
        "calculator explains usage": "كيف تستخدم الحاسبة؟" in html and "اختر نوع المكان" in html,
        "calculator outputs key metrics": all(label in html for label in ["العدد المقترح", "مستوى الإضاءة المتوقع", "إجمالي اللومن الناتج", "إجمالي الواط"]),
        "calculator includes estimation disclaimer": "هذه النتيجة تقديرية لمساعدتك على اختيار الكمية المناسبة مبدئيًا" in html,
        "calculator includes smart warnings": all(text in html for text in ["جرّب منتجًا بلومن أعلى", "هذه الدرجة بيضاء باردة", "يفضل اختيار CRI أعلى", "تأكد من اختيار IP مناسب"]),
        "category image files exist": all(path.exists() for path in CATEGORY_IMAGES),
        "category image map exists": "categoryImagesByTitle" in html and "getCategoryImage" in html,
        "category images are used": 'data-role="category-image"' in html and all(f'./images/{path.name}' in html for path in CATEGORY_IMAGES),
        "category icon fallback is not used for group cards": "group.mainProduct.icon" not in html,
        "products are grouped by category": "groupProductsByCategory" in html,
        "item number category prefix is used": "getItemCategoryCode" in html,
        "product name category title is used": "getCategoryTitle" in html,
        "cup bases category is explicit": "قواعد اضاءة كوب" in html,
        "panel bases category is explicit": "قواعد اضاءة بنل" in html,
        "groups can be expanded and collapsed": "expandedGroups" in html and "toggleGroup" in html,
        "categories are collapsed by default": "expandedGroups[groupKey] === true" in html,
        "search clear button exists": 'data-role="clear-search"' in html and "setSearchTerm('')" in html and "×" in html,
        "filtered products total label exists": 'data-role="filtered-products-count"' in html and "mbmProducts.length" in html and "filteredProducts.length" in html,
        "product numbers use ltr direction": 'data-role="product-code"' in html and 'data-role="category-code"' in html and 'dir="ltr"' in html,
        "expand all button exists": "expandAllGroups" in html and "توسيع كل الفئات" in html,
        "collapse all button exists": "collapseAllGroups" in html and "طي كل الفئات" in html,
        "export filtered products button exists": "exportFilteredProductsToExcel" in html and "تصدير إلى الإكسل" in html,
        "export creates real xlsx workbook": "createXlsxWorkbook" in html and "createZipArchive" in html and "MBM-Lighting-products.xlsx" in html,
        "export does not use html xls": "application/vnd.ms-excel" not in html and "MBM-Lighting-products.xls'" not in html and 'MBM-Lighting-products.xls"' not in html,
        "export respects filtered products": "filteredProducts.map(product" in html and "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in html,
        "export columns are correct": all(label in html for label in ["كود المنتج", "اسم المنتج", "رقم الموديل", "الوات", "اللون", "اللومن"]),
        "mobile product actions use three columns": "grid-cols-3" in html and "sm:hidden" in html,
        "terminology tab is default": "useState('terminology')" in html,
        "header slogan exists": "لكل مساحة نورها" in html,
        "header slogan uses elegant Arabic font": "fonts.googleapis.com" in html and "font-['Cairo']" in html,
        "header gold divider exists": 'data-role="header-gold-divider"' in html,
        "old header technical label is removed": "48V Smart Systems Available" not in html,
        "child products render under the model": "group.products.map" in html,
        "parent rows do not show first child specs": "group.mainProduct.technical_specs" not in html,
        "parent rows do not show first child power": "renderProductPower(group.mainProduct)" not in html,
        "group toggle indicator is rendered": 'data-role="group-toggle-indicator"' in html,
        "child product rows are indented": 'data-role="child-product-row"' in html and "border-r-2" in html,
        "expanded groups have local collapse buttons": 'data-role="collapse-current-group"' in html and "طي هذه الفئة" in html and "collapseGroup" in html,
        "local collapse preserves scroll position": "preserveScroll" in html and "requestAnimationFrame" in html,
        "child cards can be copied or shared": 'data-role="copy-share-product"' in html and "copyOrShareProduct" in html and "navigator.share" in html,
        "mobile product cards exist": 'data-role="mobile-product-groups"' in html,
        "desktop product table is hidden on mobile": 'data-role="desktop-product-table"' in html and "hidden lg:block" in html,
        "global scroll to top button exists": "ScrollToTopButton" in html and 'data-role="scroll-to-top"' in html and "scrollTo" in html,
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

    products_section = html[html.find("function ProductsSpecSection()"):html.find("// --- 4. Smart Systems Section ---")]
    if 'data-role="scroll-to-top"' in products_section:
        print("Scroll-to-top button is still scoped to the products tab.")
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
