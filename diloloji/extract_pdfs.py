#!/usr/bin/env python3
"""
İspanyolca ders kitaplarından kelime, fiil çekimi, gramer ve alıştırma çıkarır.
Groq Vision API (llama-4-scout) kullanır.
Kullanım: python3 extract_pdfs.py [all|merge|uso-gramatica|espanol-2000-parte1|espanol-2000-parte2|nuevo-ven-1]
"""

import pypdfium2 as pdfium
import base64, io, json, time, os, sys
from PIL import Image
import requests, urllib3

urllib3.disable_warnings()

GROQ_API_KEY = "***REMOVED-REVOKED-GROQ-KEY***"
GROQ_VISION_URL = "https://api.groq.com/openai/v1/chat/completions"
VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

OUTPUT_DIR = "/Users/aliaydin/Desktop/Conjume/diloloji/datos"
os.makedirs(OUTPUT_DIR, exist_ok=True)

PDFS = [
    {
        "name": "uso-gramatica",
        "path": "/Users/aliaydin/Desktop/Conjume/diloloji/kaynak-pdfler/uso-gramatica.pdf",
        "focus": "gramer",
        "pages": list(range(4, 88)),
    },
    {
        "name": "espanol-2000-parte1",
        "path": "/Users/aliaydin/Desktop/Conjume/diloloji/kaynak-pdfler/espanol-2000-parte1.pdf",
        "focus": "kelime+aliştırma",
        "pages": list(range(4, 139)),
    },
    {
        "name": "espanol-2000-parte2",
        "path": "/Users/aliaydin/Desktop/Conjume/diloloji/kaynak-pdfler/espanol-2000-parte2.pdf",
        "focus": "kelime+aliştırma",
        "pages": list(range(4, 139)),
    },
    {
        "name": "nuevo-ven-1",
        "path": "/Users/aliaydin/Desktop/Conjume/diloloji/kaynak-pdfler/nuevo-ven-1.pdf",
        "focus": "diyalog+kültür+kelime",
        "pages": list(range(4, 151)),
    },
]

EXTRACT_PROMPT = """Bu bir İspanyolca ders kitabı sayfasıdır. Sayfadaki TÜM içeriği analiz et ve aşağıdaki JSON formatında çıkar:

{
  "kelimeler": [
    {"kelime": "hablar", "anlam": "konuşmak", "tur": "fiil", "seviye": "A1", "ornek": "Yo hablo español.", "ornek_tr": "Ben İspanyolca konuşurum."}
  ],
  "fiil_cekimleri": [
    {"fiil": "hablar", "zaman": "presente", "yo": "hablo", "tu": "hablas", "el": "habla", "nosotros": "hablamos", "vosotros": "habláis", "ellos": "hablan"}
  ],
  "gramer_kurallari": [
    {"konu": "Presente de Indicativo", "aciklama": "Geniş zaman - şimdiki ve alışkanlık ifade eder", "kural": "-ar fiiller: -o, -as, -a, -amos, -áis, -an", "ornekler": ["Yo hablo español.", "Ella come mucho.", "¿Dónde vives?"]}
  ],
  "alistirmalar": [
    {"soru": "Yo ___ (hablar) español.", "cevap": "hablo", "aciklama": "Presente de indicativo, yo şahsı için -ar fiil eki -o alır."}
  ]
}

Kurallar:
- Sayfadaki TÜM kelimeleri, tablo/liste halindeki fiil çekimlerini, gramer açıklamalarını ve alıştırma sorularını çıkar
- "anlam" alanı Türkçe olmalı
- "seviye" A1, A2 veya B1 olmalı (içeriğe göre tahmin et)
- "tur" isim/fiil/sıfat/zarf/edat/zamir/bağlaç/ünlem olabilir
- Boş veya alakasız sayfa ise (kapak, içindekiler, resim sayfası) tüm array'leri boş bırak
- SADECE geçerli JSON döndür, başka açıklama yazma"""


def page_to_base64(pdf_path: str, page_idx: int, scale: float = 1.5) -> str:
    doc = pdfium.PdfDocument(pdf_path)
    page = doc[page_idx]
    bitmap = page.render(scale=scale)
    pil_img = bitmap.to_pil()
    buffer = io.BytesIO()
    pil_img.save(buffer, format="JPEG", quality=75)
    doc.close()
    return base64.b64encode(buffer.getvalue()).decode()


def call_groq_vision(image_b64: str, page_num: int) -> dict:
    empty = {"kelimeler": [], "fiil_cekimleri": [], "gramer_kurallari": [], "alistirmalar": []}

    try:
        resp = requests.post(
            GROQ_VISION_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": VISION_MODEL,
                "messages": [{"role": "user", "content": [
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}},
                    {"type": "text", "text": EXTRACT_PROMPT}
                ]}],
                "max_tokens": 4096,
                "temperature": 0.1,
            },
            timeout=90,
            verify=False,
        )

        if resp.status_code == 429:
            retry_after = int(resp.headers.get("Retry-After", 60))
            print(f"\n  [Rate limit] {retry_after}s bekleniyor...", end="", flush=True)
            time.sleep(retry_after + 2)
            # Tekrar dene
            return call_groq_vision(image_b64, page_num)

        if not resp.ok:
            print(f"\n  [HTTP {resp.status_code}] Sayfa {page_num}: {resp.text[:200]}")
            return empty

        content = resp.json()["choices"][0]["message"]["content"]

        # JSON bloğunu temizle
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()

        # JSON parse
        content = content.strip()
        if not content.startswith("{"):
            return empty

        parsed = json.loads(content)
        # Eksik anahtarları tamamla
        for key in ["kelimeler", "fiil_cekimleri", "gramer_kurallari", "alistirmalar"]:
            if key not in parsed or not isinstance(parsed[key], list):
                parsed[key] = []
        return parsed

    except json.JSONDecodeError as e:
        print(f"\n  [JSON parse hatası] Sayfa {page_num}: {e}")
        return empty
    except Exception as e:
        print(f"\n  [Hata] Sayfa {page_num}: {e}")
        return empty


def merge_results(acc: dict, new: dict):
    for key in ["kelimeler", "fiil_cekimleri", "gramer_kurallari", "alistirmalar"]:
        if key in new and isinstance(new[key], list):
            acc[key].extend(new[key])


def dedupe_kelimeler(kelimeler: list) -> list:
    seen = set()
    result = []
    for k in kelimeler:
        w = k.get("kelime", "").lower().strip()
        if w and w not in seen:
            seen.add(w)
            result.append(k)
    return result


def dedupe_fiiller(fiiller: list) -> list:
    seen = set()
    result = []
    for f in fiiller:
        key = f"{f.get('fiil','').lower().strip()}_{f.get('zaman','').lower().strip()}"
        if key and key not in seen:
            seen.add(key)
            result.append(f)
    return result


def save_results(path: str, data: dict):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def process_pdf(pdf_info: dict):
    name = pdf_info["name"]
    path = pdf_info["path"]
    pages = pdf_info["pages"]

    out_path = os.path.join(OUTPUT_DIR, f"{name}.json")

    # Kaldığımız yerden devam et
    if os.path.exists(out_path):
        with open(out_path) as f:
            accumulated = json.load(f)
        processed = set(accumulated.get("_processed_pages", []))
        print(f"\n[{name}] Devam ediliyor — {len(processed)} sayfa zaten işlendi.")
    else:
        accumulated = {
            "kelimeler": [], "fiil_cekimleri": [],
            "gramer_kurallari": [], "alistirmalar": [],
            "_processed_pages": []
        }
        processed = set()

    remaining = [p for p in pages if p not in processed]
    total = len(remaining)
    print(f"[{name}] {total} sayfa işlenecek...\n")

    for i, page_idx in enumerate(remaining):
        print(f"  [{name}] S.{page_idx+1} ({i+1}/{total}) ", end="", flush=True)

        try:
            b64 = page_to_base64(path, page_idx)
        except Exception as e:
            print(f"HATA(render): {e}")
            continue

        result = call_groq_vision(b64, page_idx + 1)
        merge_results(accumulated, result)
        accumulated["_processed_pages"].append(page_idx)

        k = len(result.get("kelimeler", []))
        f = len(result.get("fiil_cekimleri", []))
        g = len(result.get("gramer_kurallari", []))
        a = len(result.get("alistirmalar", []))
        print(f"K:{k} F:{f} G:{g} A:{a}")

        # Her 5 sayfada bir kaydet
        if (i + 1) % 5 == 0:
            save_results(out_path, accumulated)

        time.sleep(1.2)  # rate limit koruması

    # Tekrarları temizle ve kaydet
    accumulated["kelimeler"] = dedupe_kelimeler(accumulated["kelimeler"])
    accumulated["fiil_cekimleri"] = dedupe_fiiller(accumulated["fiil_cekimleri"])
    save_results(out_path, accumulated)

    print(f"\n[{name}] ✓ TAMAMLANDI:")
    print(f"  Kelime: {len(accumulated['kelimeler'])}")
    print(f"  Fiil çekimi: {len(accumulated['fiil_cekimleri'])}")
    print(f"  Gramer kuralı: {len(accumulated['gramer_kurallari'])}")
    print(f"  Alıştırma: {len(accumulated['alistirmalar'])}")


def merge_all():
    """Tüm PDF çıktılarını tek bir master dosyaya birleştirir."""
    master = {
        "kelimeler": [], "fiil_cekimleri": [],
        "gramer_kurallari": [], "alistirmalar": []
    }

    for pdf_info in PDFS:
        out_path = os.path.join(OUTPUT_DIR, f"{pdf_info['name']}.json")
        if not os.path.exists(out_path):
            print(f"[Atlandı] {pdf_info['name']}.json bulunamadı")
            continue
        with open(out_path) as f:
            data = json.load(f)
        merge_results(master, data)
        print(f"[{pdf_info['name']}] eklendi")

    master["kelimeler"] = dedupe_kelimeler(master["kelimeler"])
    master["fiil_cekimleri"] = dedupe_fiiller(master["fiil_cekimleri"])

    master_path = os.path.join(OUTPUT_DIR, "ispanyolca-master.json")
    save_results(master_path, master)

    print(f"\n✓ Master dosya: {master_path}")
    print(f"  Toplam kelime:       {len(master['kelimeler'])}")
    print(f"  Toplam fiil çekimi:  {len(master['fiil_cekimleri'])}")
    print(f"  Toplam gramer kuralı:{len(master['gramer_kurallari'])}")
    print(f"  Toplam alıştırma:    {len(master['alistirmalar'])}")


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "all"

    print("=" * 60)
    print("Diloloji — İspanyolca PDF İçerik Çıkarıcı")
    print("=" * 60)

    if target == "merge":
        merge_all()
    elif target == "all":
        for pdf_info in PDFS:
            process_pdf(pdf_info)
        print("\n" + "=" * 60)
        merge_all()
    else:
        matched = [p for p in PDFS if p["name"] == target]
        if matched:
            process_pdf(matched[0])
        else:
            print(f"Hata: '{target}' bulunamadı.")
            print("Seçenekler: all | merge | uso-gramatica | espanol-2000-parte1 | espanol-2000-parte2 | nuevo-ven-1")
            sys.exit(1)
