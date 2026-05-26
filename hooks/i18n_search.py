import json
import os
import re
from copy import deepcopy
from pathlib import Path

from mkdocs.plugins import event_priority


CONFIG_RE = re.compile(
    r'(<script id="__config" type="application/json">)(.*?)(</script>)',
    re.DOTALL,
)


def _configured_languages(config):
    i18n = config.plugins.get("i18n")
    if not i18n:
        return [], None

    languages = [
        language
        for language in i18n.config.languages
        if language.build and language.locale != "null"
    ]
    default = next((language.locale for language in languages if language.default), None)
    return [language.locale for language in languages], default


def _strip_locale(location, locale):
    prefix = f"{locale}/"
    if location == locale:
        return ""
    if location.startswith(prefix):
        return location[len(prefix) :]
    return location


def _rewrite_locale_html(site_dir, locale):
    locale_dir = site_dir / locale
    if not locale_dir.exists():
        return

    for html_path in locale_dir.rglob("*.html"):
        html = html_path.read_text(encoding="utf-8")
        locale_base = os.path.relpath(locale_dir, html_path.parent).replace(os.sep, "/")

        def replace_config(match):
            data = json.loads(match.group(2))
            data["base"] = locale_base
            return f"{match.group(1)}{json.dumps(data, ensure_ascii=False)}{match.group(3)}"

        rewritten, count = CONFIG_RE.subn(replace_config, html, count=1)
        if count:
            html_path.write_text(rewritten, encoding="utf-8")


@event_priority(-200)
def on_post_build(config):
    languages, default_locale = _configured_languages(config)
    if not languages or not default_locale:
        return

    site_dir = Path(config.site_dir)
    index_path = site_dir / "search" / "search_index.json"
    if not index_path.exists():
        return

    index = json.loads(index_path.read_text(encoding="utf-8"))
    docs = index.get("docs", [])
    non_default_locales = [locale for locale in languages if locale != default_locale]
    non_default_prefixes = tuple(f"{locale}/" for locale in non_default_locales)

    default_docs = [
        doc for doc in docs if not doc.get("location", "").startswith(non_default_prefixes)
    ]
    default_index = deepcopy(index)
    default_index["docs"] = default_docs
    index_path.write_text(json.dumps(default_index, ensure_ascii=False), encoding="utf-8")

    for locale in non_default_locales:
        locale_docs = [
            {**doc, "location": _strip_locale(doc.get("location", ""), locale)}
            for doc in docs
            if doc.get("location", "").startswith(f"{locale}/")
        ]
        if not locale_docs:
            continue

        locale_index = deepcopy(index)
        locale_index["docs"] = locale_docs
        locale_search_dir = site_dir / locale / "search"
        locale_search_dir.mkdir(parents=True, exist_ok=True)
        (locale_search_dir / "search_index.json").write_text(
            json.dumps(locale_index, ensure_ascii=False),
            encoding="utf-8",
        )
        _rewrite_locale_html(site_dir, locale)
