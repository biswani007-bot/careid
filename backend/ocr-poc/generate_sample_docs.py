"""
Synthetic Document Generator for CareID OCR Proof-of-Concept
Generates de-identified clinical and insurance test documents:
1. Medical Laboratory Report (PNG)
2. Doctor Prescription (JPEG)
3. Insurance Card (PNG)
4. Multi-Page Clinical Lab Report (PDF)
5. Rotated Scanned Document (PNG, 90 deg clockwise)
6. Low-Quality Degraded Scanned Document (JPEG with noise & blur)
"""

import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import fitz  # PyMuPDF

SAMPLE_DIR = os.path.join(os.getcwd(), 'ocr-poc', 'sample_docs')
os.makedirs(SAMPLE_DIR, exist_ok=True)

def get_font(size=18, bold=False):
    try:
        # Standard Windows fonts
        font_name = 'arialbd.ttf' if bold else 'arial.ttf'
        font_path = os.path.join(os.environ.get('WINDIR', 'C:\\Windows'), 'Fonts', font_name)
        if os.path.exists(font_path):
            return ImageFont.truetype(font_path, size)
    except Exception:
        pass
    return ImageFont.load_default()

def create_lab_report_image():
    width, height = 1000, 1300
    img = Image.new('RGB', (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    title_font = get_font(28, bold=True)
    header_font = get_font(18, bold=True)
    body_font = get_font(16, bold=False)

    # Header
    draw.rectangle([40, 40, width - 40, 120], fill=(240, 245, 250), outline=(200, 210, 220))
    draw.text((60, 50), "HEALTH VAULT 360 - DIAGNOSTIC LABORATORY", fill=(10, 40, 90), font=title_font)
    draw.text((60, 85), "Accredited Clinical Pathology & Molecular Genetics Laboratory", fill=(80, 90, 100), font=body_font)

    # Patient Demographic Box
    y = 140
    draw.rectangle([40, y, width - 40, y + 110], outline=(180, 190, 200), width=1)
    draw.text((50, y + 10), "Patient Name: Jane Doe", fill=(0, 0, 0), font=header_font)
    draw.text((450, y + 10), "MRN: MRN-784920", fill=(0, 0, 0), font=header_font)
    draw.text((750, y + 10), "Age/Gender: 42Y / Female", fill=(0, 0, 0), font=body_font)

    draw.text((50, y + 45), "Referring Doctor: Dr. Alan Grant, MD", fill=(0, 0, 0), font=body_font)
    draw.text((450, y + 45), "Sample Collected: 2026-11-04 08:30", fill=(0, 0, 0), font=body_font)
    draw.text((750, y + 45), "Report Status: FINAL", fill=(0, 120, 0), font=header_font)

    draw.text((50, y + 75), "Specimen: Whole Blood (EDTA)", fill=(0, 0, 0), font=body_font)
    draw.text((450, y + 75), "Report Date: 2026-11-05 14:15", fill=(0, 0, 0), font=body_font)

    # Test Table
    y = 280
    draw.rectangle([40, y, width - 40, y + 40], fill=(230, 235, 245))
    draw.text((50, y + 10), "TEST DESCRIPTION", fill=(0, 0, 0), font=header_font)
    draw.text((420, y + 10), "OBSERVED VALUE", fill=(0, 0, 0), font=header_font)
    draw.text((620, y + 10), "REFERENCE RANGE", fill=(0, 0, 0), font=header_font)
    draw.text((840, y + 10), "UNITS", fill=(0, 0, 0), font=header_font)

    tests = [
        ("Hemoglobin (Hb)", "13.8", "12.0 - 15.5", "g/dL"),
        ("Packed Cell Volume (PCV)", "41.2", "37.0 - 48.0", "%"),
        ("Total Leukocyte Count (WBC)", "7,400", "4,500 - 11,000", "/mcL"),
        ("Platelet Count", "265,000", "150,000 - 450,000", "/mcL"),
        ("Fasting Blood Sugar (Glucose)", "94", "70 - 99", "mg/dL"),
        ("Serum Creatinine", "0.85", "0.55 - 1.02", "mg/dL"),
        ("Blood Urea Nitrogen (BUN)", "14.2", "7.0 - 20.0", "mg/dL"),
        ("Total Cholesterol", "182", "< 200", "mg/dL"),
        ("Triglycerides", "135", "< 150", "mg/dL"),
        ("HDL Cholesterol", "56", "> 50", "mg/dL"),
        ("LDL Cholesterol", "99", "< 100", "mg/dL"),
    ]

    curr_y = y + 45
    for item in tests:
        draw.line([40, curr_y - 5, width - 40, curr_y - 5], fill=(230, 230, 230), width=1)
        draw.text((50, curr_y), item[0], fill=(20, 20, 20), font=body_font)
        draw.text((440, curr_y), item[1], fill=(0, 0, 0), font=header_font)
        draw.text((630, curr_y), item[2], fill=(80, 80, 80), font=body_font)
        draw.text((850, curr_y), item[3], fill=(80, 80, 80), font=body_font)
        curr_y += 38

    # Footer Notes
    curr_y += 40
    draw.text((50, curr_y), "Clinical Interpretation:", fill=(0, 0, 0), font=header_font)
    curr_y += 25
    draw.text((50, curr_y), "All complete blood count and biochemical indices are within normal physiological limits.", fill=(40, 40, 40), font=body_font)
    curr_y += 22
    draw.text((50, curr_y), "Routine follow-up recommended in 12 months.", fill=(40, 40, 40), font=body_font)

    curr_y += 80
    draw.text((50, curr_y), "Verified By: Dr. Evelyn Reed, MD (Pathologist)", fill=(0, 0, 0), font=header_font)
    draw.text((650, curr_y), "Electronic Signature Valid", fill=(0, 100, 0), font=header_font)

    path = os.path.join(SAMPLE_DIR, '01_lab_report.png')
    img.save(path)
    return path

def create_prescription_image():
    width, height = 900, 1200
    img = Image.new('RGB', (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    title_font = get_font(24, bold=True)
    header_font = get_font(18, bold=True)
    body_font = get_font(16, bold=False)

    draw.rectangle([40, 40, width - 40, 130], fill=(245, 250, 245), outline=(180, 220, 180))
    draw.text((60, 50), "METROPOLITAN CARDIOLOGY CLINIC", fill=(20, 80, 30), font=title_font)
    draw.text((60, 85), "Dr. Marcus Vance, MD, FACC | Cardiology Specialist", fill=(50, 60, 50), font=body_font)
    draw.text((60, 105), "Licence: DOC-LIC-99381 | Phone: +1-555-019-2834", fill=(80, 90, 80), font=body_font)

    y = 150
    draw.text((50, y), "Patient: Robert Chen", fill=(0, 0, 0), font=header_font)
    draw.text((450, y), "Date: 2026-11-03", fill=(0, 0, 0), font=body_font)
    draw.text((50, y + 30), "Age/Gender: 58Y / Male", fill=(0, 0, 0), font=body_font)
    draw.text((450, y + 30), "Rx Number: RX-2026-88192", fill=(0, 0, 0), font=header_font)

    draw.line([40, y + 65, width - 40, y + 65], fill=(150, 150, 150), width=2)

    draw.text((50, y + 80), "Rx (Prescribed Medications):", fill=(0, 0, 0), font=title_font)

    meds = [
        ("1. Atorvastatin 20mg Tablets", "Sig: 1 tablet orally once daily at bedtime", "Qty: 30 tablets (1 month)"),
        ("2. Metoprolol Tartrate 25mg", "Sig: 1 tablet orally twice daily with meals", "Qty: 60 tablets (1 month)"),
        ("3. Aspirin 81mg (Enteric Coated)", "Sig: 1 tablet orally once daily with breakfast", "Qty: 30 tablets (1 month)"),
    ]

    curr_y = y + 130
    for med in meds:
        draw.text((60, curr_y), med[0], fill=(10, 30, 80), font=header_font)
        draw.text((80, curr_y + 25), med[1], fill=(0, 0, 0), font=body_font)
        draw.text((80, curr_y + 48), med[2], fill=(70, 70, 70), font=body_font)
        curr_y += 85

    curr_y += 30
    draw.text((60, curr_y), "Instructions: Check blood pressure twice weekly. Refills: 2", fill=(0, 0, 0), font=body_font)
    curr_y += 100
    draw.text((550, curr_y), "Dr. Marcus Vance, MD", fill=(0, 0, 0), font=header_font)
    draw.text((550, curr_y + 25), "[Signature Verified Digitally]", fill=(80, 80, 80), font=body_font)

    path = os.path.join(SAMPLE_DIR, '02_prescription.jpg')
    img.save(path, format='JPEG', quality=95)
    return path

def create_insurance_card_image():
    # Standard ID card ratio (approx 3.375 x 2.125 inches)
    width, height = 850, 540
    img = Image.new('RGB', (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    title_font = get_font(26, bold=True)
    header_font = get_font(18, bold=True)
    body_font = get_font(16, bold=False)

    # Blue header band
    draw.rectangle([0, 0, width, 100], fill=(15, 75, 145))
    draw.text((40, 25), "BLUE SHIELD NATIONAL HEALTHCARE", fill=(255, 255, 255), font=title_font)
    draw.text((40, 65), "Preferred Platinum Comprehensive Network", fill=(200, 225, 255), font=body_font)

    # Body fields
    y = 120
    draw.text((40, y), "Member Name: Sarah Miller", fill=(0, 0, 0), font=header_font)
    draw.text((520, y), "Member ID: BSN-99887711", fill=(10, 30, 80), font=header_font)

    y += 45
    draw.text((40, y), "Policy Number: POL987654321", fill=(0, 0, 0), font=header_font)
    draw.text((520, y), "Group Number: GRP-44550", fill=(0, 0, 0), font=header_font)

    y += 45
    draw.text((40, y), "Issuer: (80840) 911-38294", fill=(60, 60, 60), font=body_font)
    draw.text((520, y), "Effective Date: 2026-01-01", fill=(60, 60, 60), font=body_font)

    # Copay Box
    y += 55
    draw.rectangle([40, y, width - 40, y + 110], fill=(245, 248, 252), outline=(190, 210, 230))
    draw.text((55, y + 10), "COPAY SCHEDULE:", fill=(15, 75, 145), font=header_font)
    draw.text((55, y + 40), "Primary Care Physician: $20.00", fill=(20, 20, 20), font=body_font)
    draw.text((55, y + 70), "Specialist Visit: $40.00", fill=(20, 20, 20), font=body_font)

    draw.text((460, y + 40), "Emergency Room: $150.00", fill=(20, 20, 20), font=body_font)
    draw.text((460, y + 70), "Urgent Care Clinic: $35.00", fill=(20, 20, 20), font=body_font)

    y += 130
    draw.text((40, y), "Pharmacy Benefit: RxBIN 610014 | RxPCN MEDD | RxGRP BLUE01", fill=(80, 80, 80), font=body_font)
    draw.text((40, y + 25), "Customer Service: 1-800-555-BLUE | Claims: PO Box 2048, Omaha, NE", fill=(100, 100, 100), font=body_font)

    path = os.path.join(SAMPLE_DIR, '03_insurance_card.png')
    img.save(path)
    return path

def create_multipage_pdf():
    # Use PyMuPDF to create a clean 2-page PDF
    doc = fitz.open()

    # Page 1: Clinical Lab Summary
    p1 = doc.new_page(width=595, height=842)  # A4
    text_p1 = """HEALTH VAULT 360 - COMPREHENSIVE METABOLIC PANEL
Patient: David Kim | MRN: MRN-554433 | DOB: 1980-05-12
Date of Specimen: 2026-11-04 | Facility: General Medical Center

PANEL 1: RENAL & ELECTROLYTES
Sodium (Na): 140 mmol/L [Normal: 135 - 145]
Potassium (K): 4.2 mmol/L [Normal: 3.5 - 5.1]
Chloride (Cl): 102 mmol/L [Normal: 96 - 106]
Carbon Dioxide (CO2): 25 mmol/L [Normal: 22 - 29]
Blood Urea Nitrogen (BUN): 15 mg/dL [Normal: 7 - 20]
Serum Creatinine: 0.90 mg/dL [Normal: 0.70 - 1.30]
eGFR: > 90 mL/min/1.73m2 [Normal: > 60]

PANEL 2: LIVER FUNCTION TESTS
Total Protein: 7.2 g/dL [Normal: 6.0 - 8.3]
Albumin: 4.4 g/dL [Normal: 3.5 - 5.0]
Total Bilirubin: 0.6 mg/dL [Normal: 0.2 - 1.2]
Alkaline Phosphatase (ALP): 68 U/L [Normal: 40 - 129]
Alanine Aminotransferase (ALT): 22 U/L [Normal: 7 - 56]
Aspartate Aminotransferase (AST): 24 U/L [Normal: 10 - 40]
"""
    p1.insert_text((50, 60), text_p1, fontsize=11, fontname="helv")

    # Page 2: Lipid Profile & Recommendations
    p2 = doc.new_page(width=595, height=842)  # A4
    text_p2 = """HEALTH VAULT 360 - LIPID PROFILE & SUMMARY
Patient: David Kim | MRN: MRN-554433 | Page 2 of 2

PANEL 3: FASTING LIPID PANEL
Total Cholesterol: 195 mg/dL [Desirable: < 200]
Triglycerides: 142 mg/dL [Desirable: < 150]
HDL Cholesterol: 52 mg/dL [Optimal: > 40]
LDL Cholesterol (Calculated): 115 mg/dL [Optimal: < 100 - Borderline]
Cholesterol / HDL Ratio: 3.75 [Optimal: < 5.0]

CLINICAL RECOMMENDATIONS:
1. Borderline calculated LDL cholesterol. Recommend dietary moderation.
2. Aerobic physical activity for 150 minutes weekly.
3. Repeat fasting lipid panel in 6 months.

Doctor Signature: Dr. Patricia Shaw, MD
License: DOC-LIC-55412 | Hospital Affiliation: City Health Vault
"""
    p2.insert_text((50, 60), text_p2, fontsize=11, fontname="helv")

    path = os.path.join(SAMPLE_DIR, '04_multipage_lab_report.pdf')
    doc.save(path)
    doc.close()
    return path

def create_rotated_image():
    # Rotate the insurance card 90 degrees clockwise
    card_path = os.path.join(SAMPLE_DIR, '03_insurance_card.png')
    if not os.path.exists(card_path):
        create_insurance_card_image()
    img = Image.open(card_path)
    rotated = img.rotate(270, expand=True)  # 270 deg counter-clockwise = 90 deg clockwise
    path = os.path.join(SAMPLE_DIR, '05_rotated_insurance_card.png')
    rotated.save(path)
    return path

def create_low_quality_image():
    # Downscale, add blur and noise to simulate mobile photo in poor lighting
    card_path = os.path.join(SAMPLE_DIR, '03_insurance_card.png')
    if not os.path.exists(card_path):
        create_insurance_card_image()
    img = Image.open(card_path)

    # Downscale and upscale to introduce pixelation
    small = img.resize((img.width // 2, img.height // 2), resample=Image.Resampling.BILINEAR)
    degraded = small.resize((img.width, img.height), resample=Image.Resampling.NEAREST)

    # Apply slight blur
    degraded = degraded.filter(ImageFilter.GaussianBlur(radius=1.2))

    path = os.path.join(SAMPLE_DIR, '06_low_quality_card.jpg')
    degraded.save(path, format='JPEG', quality=30)
    return path

if __name__ == '__main__':
    print('Generating synthetic clinical test documents...')
    f1 = create_lab_report_image()
    print('Created:', f1)
    f2 = create_prescription_image()
    print('Created:', f2)
    f3 = create_insurance_card_image()
    print('Created:', f3)
    f4 = create_multipage_pdf()
    print('Created:', f4)
    f5 = create_rotated_image()
    print('Created:', f5)
    f6 = create_low_quality_image()
    print('Created:', f6)
    print('All 6 synthetic test documents successfully generated.')

